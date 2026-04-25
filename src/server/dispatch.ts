import { spawn, ChildProcess } from 'node:child_process';
import { loadState, updateState } from './state.js';

// Track running processes by card_id
const runningProcesses = new Map<string, ChildProcess>();

export function dispatchCard(cardId: string): { ok: true; task_run_id: string } | { ok: false; error: string } {
  const state = loadState();
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return { ok: false, error: 'Card not found' };
  if (card.status === 'running') return { ok: false, error: 'Card already running' };
  if (!card.agent_id) return { ok: false, error: 'No agent assigned' };

  // Find agent
  const agent = state.agents.find(a => a.id === card.agent_id);
  const agentId = agent?.id ?? card.agent_id;

  // Update card to running
  const taskRunId = `dash-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  updateState(s => ({
    ...s,
    cards: s.cards.map(c =>
      c.id === cardId
        ? { ...c, status: 'running' as const, task_run_id: taskRunId, dispatched_at: Date.now() }
        : c
    ),
  }));

  // Spawn the openclaw CLI process
  const child = spawn('openclaw', ['agent', '--agent', agentId, '--message', card.prompt, '--json'], {
    stdio: ['pipe', 'pipe', 'pipe'],
    detached: false,
  });

  runningProcesses.set(cardId, child);

  let stdout = '';
  let stderr = '';

  child.stdout?.on('data', (data: Buffer) => {
    stdout += data.toString();
  });

  child.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();
  });

  child.on('close', (code) => {
    runningProcesses.delete(cardId);

    const outcome = code === 0 ? 'completed' : `failed: ${stderr || 'exit code ' + code}`;
    const finalStatus: 'done' = 'done';

    updateState(s => ({
      ...s,
      cards: s.cards.map(c =>
        c.id === cardId
          ? { ...c, status: finalStatus, outcome, ended_at: Date.now() }
          : c
      ),
    }));
  });

  child.on('error', (err) => {
    runningProcesses.delete(cardId);
    updateState(s => ({
      ...s,
      cards: s.cards.map(c =>
        c.id === cardId
          ? { ...c, status: 'done' as const, outcome: `error: ${err.message}`, ended_at: Date.now() }
          : c
      ),
    }));
  });

  return { ok: true, task_run_id: taskRunId };
}

export function killCard(cardId: string): { ok: true } | { ok: false; error: string } {
  const proc = runningProcesses.get(cardId);
  if (!proc) return { ok: false, error: 'No running process for this card' };

  try {
    proc.kill('SIGTERM');
    runningProcesses.delete(cardId);

    updateState(s => ({
      ...s,
      cards: s.cards.map(c =>
        c.id === cardId
          ? { ...c, status: 'done' as const, outcome: 'killed', ended_at: Date.now() }
          : c
      ),
    }));

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kill error';
    return { ok: false, error: msg };
  }
}

export function retryCard(cardId: string): { ok: true; task_run_id: string } | { ok: false; error: string } {
  const state = loadState();
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return { ok: false, error: 'Card not found' };
  if (card.status === 'running') return { ok: false, error: 'Card is still running' };

  // Reset card then dispatch
  updateState(s => ({
    ...s,
    cards: s.cards.map(c =>
      c.id === cardId
        ? { ...c, status: 'todo' as const, outcome: null, task_run_id: null, ended_at: null }
        : c
    ),
  }));

  return dispatchCard(cardId);
}

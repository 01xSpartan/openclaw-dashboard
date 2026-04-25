import { spawn, ChildProcess } from 'node:child_process';
import { loadState, updateState } from './state.js';

// Track running processes by card_id
const runningProcesses = new Map<string, ChildProcess>();

// Pull the agent's visible response text out of `openclaw agent --json` stdout.
// Falls back through known shapes; returns null on any parse miss so the caller
// can keep the plain "completed" outcome it had before.
function extractAssistantText(stdout: string): string | null {
  if (!stdout || !stdout.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(stdout);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const root = parsed as Record<string, unknown>;
    const result = root.result as Record<string, unknown> | undefined;
    if (!result || typeof result !== 'object') return null;
    const meta = result.meta as Record<string, unknown> | undefined;
    const fromMeta = meta?.finalAssistantVisibleText;
    if (typeof fromMeta === 'string' && fromMeta.trim()) return fromMeta.trim();
    const payloads = result.payloads as Array<Record<string, unknown>> | undefined;
    const firstText = payloads?.[0]?.text;
    if (typeof firstText === 'string' && firstText.trim()) return firstText.trim();
    return null;
  } catch {
    return null;
  }
}

export function dispatchCard(cardId: string): { ok: true; task_run_id: string } | { ok: false; error: string } {
  const state = loadState();
  const card = state.cards.find(c => c.id === cardId);
  if (!card) return { ok: false, error: 'Card not found' };
  // Allow re-dispatch of zombie cards (status=running but no task_run_id)
  if (card.status === 'running' && card.task_run_id) return { ok: false, error: 'Card already running' };
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

    let outcome: string;
    if (code === 0) {
      const text = extractAssistantText(stdout);
      outcome = text ? `completed: ${text}` : 'completed';
    } else {
      outcome = `failed: ${stderr || 'exit code ' + code}`;
    }
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

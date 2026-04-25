import { readFileSync, writeFileSync, mkdirSync, existsSync, renameSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { homedir } from 'node:os';
import { randomBytes } from 'node:crypto';

export interface Business {
  id: string;
  name: string;
  url: string;
  tagline: string;
  color: string;
  icon: string;
  root: string;
  agents: string[];
}

export interface Agent {
  id: string;
  name: string;
  role: string;
  business_id: string | null;
  path: string;
  model: string;
  memory_files: string[];
}

export type CardStatus = 'backlog' | 'todo' | 'running' | 'done';

export interface Card {
  id: string;
  business_id: string;
  title: string;
  prompt: string;
  agent_id: string | null;
  status: CardStatus;
  blocked: boolean;
  outcome: string | null;
  task_run_id: string | null;
  created_at: number;
  dispatched_at: number | null;
  ended_at: number | null;
}

export interface DashboardState {
  version: number;
  core: {
    workspace: string;
    shared_memory: string;
  };
  businesses: Business[];
  pool: string[];
  agents: Agent[];
  cards: Card[];
}

const STATE_PATH = join(homedir(), '.openclaw', 'dashboard', 'state.json');

function defaultState(): DashboardState {
  return {
    version: 1,
    core: {
      workspace: join(homedir(), '.openclaw', 'workspace'),
      shared_memory: join(homedir(), '.openclaw', 'workspace', 'MEMORY.md'),
    },
    businesses: [],
    pool: [],
    agents: [],
    cards: [],
  };
}

let cachedState: DashboardState | null = null;

export function getStatePath(): string {
  return STATE_PATH;
}

export function loadState(): DashboardState {
  if (cachedState) return cachedState;
  try {
    if (!existsSync(STATE_PATH)) {
      const state = defaultState();
      saveStateRaw(state);
      cachedState = state;
      return state;
    }
    const raw = readFileSync(STATE_PATH, 'utf-8');
    cachedState = JSON.parse(raw) as DashboardState;
    return cachedState;
  } catch {
    const state = defaultState();
    cachedState = state;
    return state;
  }
}

function saveStateRaw(state: DashboardState): void {
  const dir = dirname(STATE_PATH);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const tmpPath = STATE_PATH + '.tmp.' + randomBytes(4).toString('hex');
  writeFileSync(tmpPath, JSON.stringify(state, null, 2), 'utf-8');
  renameSync(tmpPath, STATE_PATH);
  cachedState = state;
}

export function patchState(
  patch: Partial<DashboardState>,
  expectedVersion: number
): { ok: true; state: DashboardState } | { ok: false; error: string; currentVersion: number } {
  // Re-read from disk to avoid stale cache
  cachedState = null;
  const current = loadState();

  if (current.version !== expectedVersion) {
    return { ok: false, error: 'Version mismatch', currentVersion: current.version };
  }

  const updated: DashboardState = {
    ...current,
    ...patch,
    version: current.version + 1,
    core: patch.core ?? current.core,
  };

  saveStateRaw(updated);
  return { ok: true, state: updated };
}

export function updateState(updater: (state: DashboardState) => DashboardState): DashboardState {
  cachedState = null;
  const current = loadState();
  const updated = updater({ ...current, version: current.version + 1 });
  saveStateRaw(updated);
  return updated;
}

export function invalidateCache(): void {
  cachedState = null;
}

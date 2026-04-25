import { readdirSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { execSync } from 'node:child_process';
import { loadState } from './state.js';
import { getRunningTasks } from './runs.js';

// CLI agent cache
let cliAgentCache: Array<{ id: string; model?: string; identityName?: string }> = [];
let cliCacheTime = 0;
const CLI_CACHE_TTL = 30000;

function getCachedCliAgents(): Array<{ id: string; model?: string; identityName?: string }> {
  if (Date.now() - cliCacheTime < CLI_CACHE_TTL) return cliAgentCache;
  try {
    const output = execSync('openclaw agents list --json', {
      encoding: 'utf-8',
      timeout: 3000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    cliAgentCache = JSON.parse(output);
    cliCacheTime = Date.now();
  } catch {
    // Keep stale cache on failure
  }
  return cliAgentCache;
}

export interface LiveAgent {
  id: string;
  name: string;
  role: string;
  business_id: string | null;
  path: string;
  model: string;
  memory_files: string[];
  status: 'running' | 'idle' | 'error' | 'offline';
  lastActivity: number | null;
}

function getAgentsFromFilesystem(): { id: string; path: string }[] {
  const agents: { id: string; path: string }[] = [];
  const agentsDir = join(homedir(), '.openclaw', 'agents');

  if (existsSync(agentsDir)) {
    try {
      const entries = readdirSync(agentsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          agents.push({
            id: entry.name,
            path: join(agentsDir, entry.name),
          });
        }
      }
    } catch { /* skip */ }
  }

  // Also check businesses directory
  const bizDir = join(homedir(), '.openclaw', 'businesses');
  if (existsSync(bizDir)) {
    try {
      const bizEntries = readdirSync(bizDir, { withFileTypes: true });
      for (const biz of bizEntries) {
        if (biz.isDirectory()) {
          const bizAgentsDir = join(bizDir, biz.name, 'agents');
          if (existsSync(bizAgentsDir)) {
            const agentEntries = readdirSync(bizAgentsDir, { withFileTypes: true });
            for (const a of agentEntries) {
              if (a.isDirectory()) {
                agents.push({
                  id: a.name,
                  path: join(bizAgentsDir, a.name),
                });
              }
            }
          }
        }
      }
    } catch { /* skip */ }
  }

  return agents;
}

function getLastSessionMtime(agentPath: string): number | null {
  const sessionsDir = join(agentPath, 'sessions');
  if (!existsSync(sessionsDir)) return null;
  try {
    const entries = readdirSync(sessionsDir, { withFileTypes: true });
    let latest = 0;
    for (const entry of entries) {
      const st = statSync(join(sessionsDir, entry.name));
      if (st.mtimeMs > latest) latest = st.mtimeMs;
    }
    return latest > 0 ? latest : null;
  } catch {
    return null;
  }
}

export function listAgents(): LiveAgent[] {
  const state = loadState();
  const fsAgents = getAgentsFromFilesystem();
  const runningTasks = getRunningTasks();
  const runningAgentIds = new Set(runningTasks.map(t => t.agent_id));

  // Try CLI listing (cached for 30s to avoid blocking)
  const cliAgents = getCachedCliAgents();

  const seen = new Set<string>();
  const result: LiveAgent[] = [];

  // Merge state agents with filesystem discovery
  for (const sa of state.agents) {
    seen.add(sa.id);
    const mtime = getLastSessionMtime(sa.path);
    const isRunning = runningAgentIds.has(sa.id);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    let status: LiveAgent['status'] = 'idle';
    if (isRunning) status = 'running';
    else if (mtime && mtime < dayAgo) status = 'offline';

    result.push({
      ...sa,
      status,
      lastActivity: mtime,
    });
  }

  // Add filesystem agents not in state
  for (const fsa of fsAgents) {
    if (seen.has(fsa.id)) continue;
    seen.add(fsa.id);

    const cliAgent = cliAgents.find(a => a.id === fsa.id);
    const mtime = getLastSessionMtime(fsa.path);
    const isRunning = runningAgentIds.has(fsa.id);
    const dayAgo = Date.now() - 24 * 60 * 60 * 1000;

    let status: LiveAgent['status'] = 'idle';
    if (isRunning) status = 'running';
    else if (mtime && mtime < dayAgo) status = 'offline';

    result.push({
      id: fsa.id,
      name: cliAgent?.identityName ?? fsa.id,
      role: '',
      business_id: null,
      path: fsa.path,
      model: cliAgent?.model ?? '',
      memory_files: [],
      status,
      lastActivity: mtime,
    });
  }

  return result;
}

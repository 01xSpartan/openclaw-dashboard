import type { Context } from 'hono';
import { loadState, invalidateCache } from './state.js';
import { getTodayActivity } from './runs.js';
import { listAgents } from './agents.js';

interface SSEClient {
  id: string;
  controller: ReadableStreamDefaultController;
}

const clients: SSEClient[] = [];
let pollInterval: ReturnType<typeof setInterval> | null = null;

let lastStateVersion = 0;
let lastUsageHash = '';
let lastAgentsHash = '';

function sendToAll(event: string, data: unknown): void {
  const msg = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (let i = clients.length - 1; i >= 0; i--) {
    try {
      clients[i].controller.enqueue(new TextEncoder().encode(msg));
    } catch {
      clients.splice(i, 1);
    }
  }
}

function pollForChanges(): void {
  try {
    // Check state changes
    invalidateCache();
    const state = loadState();
    if (state.version !== lastStateVersion) {
      lastStateVersion = state.version;
      sendToAll('state.changed', { version: state.version });
    }

    // Check usage changes
    const usage = getTodayActivity();
    const usageHash = JSON.stringify(usage);
    if (usageHash !== lastUsageHash) {
      lastUsageHash = usageHash;
      sendToAll('usage.changed', usage);
    }

    // Check agent changes (less frequently — every 10s)
    if (clients.length > 0 && Date.now() % 10000 < 2000) {
      try {
        const agents = listAgents();
        const agentsHash = agents.map(a => `${a.id}:${a.status}`).join(',');
        if (agentsHash !== lastAgentsHash) {
          lastAgentsHash = agentsHash;
          sendToAll('agents.changed', agents);
        }
      } catch { /* skip */ }
    }
  } catch { /* poll errors are non-fatal */ }
}

export function startPolling(): void {
  if (pollInterval) return;
  pollInterval = setInterval(pollForChanges, 2000);
}

export function stopPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

export function handleSSE(c: Context): Response {
  const clientId = Math.random().toString(36).slice(2);

  const stream = new ReadableStream({
    start(controller) {
      clients.push({ id: clientId, controller });

      // Send initial state
      const state = loadState();
      lastStateVersion = state.version;
      const msg = `event: connected\ndata: ${JSON.stringify({ clientId })}\n\n`;
      controller.enqueue(new TextEncoder().encode(msg));
    },
    cancel() {
      const idx = clients.findIndex(c => c.id === clientId);
      if (idx !== -1) clients.splice(idx, 1);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

export function broadcast(event: string, data: unknown): void {
  sendToAll(event, data);
}

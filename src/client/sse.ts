import { getToken } from './api';

type SSEHandler = (event: string, data: unknown) => void;

let eventSource: EventSource | null = null;
let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
const handlers: SSEHandler[] = [];

export function connectSSE(): void {
  if (eventSource) return;

  const token = getToken();
  const url = `/api/dashboard/stream${token ? `?token=${encodeURIComponent(token)}` : ''}`;

  eventSource = new EventSource(url);

  eventSource.addEventListener('connected', (e) => {
    console.log('[SSE] Connected', JSON.parse((e as MessageEvent).data));
  });

  const eventTypes = ['state.changed', 'card.updated', 'usage.changed', 'agents.changed', 'run.event'];

  for (const type of eventTypes) {
    eventSource.addEventListener(type, (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data);
        for (const handler of handlers) {
          handler(type, data);
        }
      } catch { /* ignore parse errors */ }
    });
  }

  eventSource.onerror = () => {
    eventSource?.close();
    eventSource = null;

    // Reconnect after delay
    if (!reconnectTimeout) {
      reconnectTimeout = setTimeout(() => {
        reconnectTimeout = null;
        connectSSE();
      }, 3000);
    }
  };
}

export function disconnectSSE(): void {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  if (eventSource) {
    eventSource.close();
    eventSource = null;
  }
}

export function onSSE(handler: SSEHandler): () => void {
  handlers.push(handler);
  return () => {
    const idx = handlers.indexOf(handler);
    if (idx !== -1) handlers.splice(idx, 1);
  };
}

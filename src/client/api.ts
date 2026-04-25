// API client with auth token injection

function getToken(): string {
  // In production, read from meta tag
  const meta = document.querySelector('meta[name="dashboard-token"]');
  if (meta) {
    const content = meta.getAttribute('content');
    if (content && content !== '__DASHBOARD_TOKEN__') return content;
  }
  // In dev mode, use a fixed dev token or empty
  return localStorage.getItem('dashboard-dev-token') || '';
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(path, { ...options, headers });
  return res;
}

export async function getState() {
  const res = await apiFetch('/api/dashboard/state');
  if (!res.ok) throw new Error(`Failed to load state: ${res.status}`);
  return res.json();
}

export async function patchState(patch: Record<string, unknown>, version: number) {
  const res = await apiFetch('/api/dashboard/state', {
    method: 'POST',
    headers: { 'If-Version': String(version) },
    body: JSON.stringify(patch),
  });
  if (res.status === 409) throw new Error('Version conflict — state was modified');
  if (!res.ok) throw new Error(`State patch failed: ${res.status}`);
  return res.json();
}

export async function getAgents() {
  const res = await apiFetch('/api/dashboard/agents');
  if (!res.ok) throw new Error(`Failed to load agents: ${res.status}`);
  return res.json();
}

export async function getUsage() {
  const res = await apiFetch('/api/dashboard/usage');
  if (!res.ok) throw new Error(`Failed to load usage: ${res.status}`);
  return res.json();
}

export async function createBusiness(data: { name: string; url?: string; tagline?: string; color?: string; icon?: string }) {
  const res = await apiFetch('/api/dashboard/businesses', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Failed: ${res.status}`);
  }
  return res.json();
}

export async function deleteBusiness(id: string) {
  const res = await apiFetch(`/api/dashboard/businesses/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete: ${res.status}`);
  return res.json();
}

export async function createCard(data: { business_id: string; title: string; prompt?: string; agent_id?: string; status?: string }) {
  const res = await apiFetch('/api/dashboard/cards', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create card: ${res.status}`);
  return res.json();
}

export async function updateCard(id: string, patch: Record<string, unknown>) {
  const res = await apiFetch(`/api/dashboard/cards/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new Error(`Failed to update card: ${res.status}`);
  return res.json();
}

export async function deleteCard(id: string) {
  const res = await apiFetch(`/api/dashboard/cards/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`Failed to delete card: ${res.status}`);
  return res.json();
}

export async function dispatchCard(cardId: string) {
  const res = await apiFetch('/api/dashboard/dispatch', {
    method: 'POST',
    body: JSON.stringify({ card_id: cardId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Dispatch failed: ${res.status}`);
  }
  return res.json();
}

export async function retryCard(id: string) {
  const res = await apiFetch(`/api/dashboard/cards/${id}/retry`, { method: 'POST' });
  if (!res.ok) throw new Error(`Retry failed: ${res.status}`);
  return res.json();
}

export async function killCard(id: string) {
  const res = await apiFetch(`/api/dashboard/cards/${id}/kill`, { method: 'POST' });
  if (!res.ok) throw new Error(`Kill failed: ${res.status}`);
  return res.json();
}

export async function assignAgent(data: { agent_id: string; business_id?: string; role?: string; name?: string }) {
  const res = await apiFetch('/api/dashboard/agents', {
    method: 'POST',
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to assign agent: ${res.status}`);
  return res.json();
}

export async function readFile(path: string) {
  const res = await apiFetch(`/api/dashboard/files?path=${encodeURIComponent(path)}`);
  if (!res.ok) throw new Error(`Failed to read file: ${res.status}`);
  return res.json();
}

export async function writeFile(path: string, content: string) {
  const res = await apiFetch('/api/dashboard/files', {
    method: 'POST',
    body: JSON.stringify({ path, content }),
  });
  if (!res.ok) throw new Error(`Failed to write file: ${res.status}`);
  return res.json();
}

export { getToken };

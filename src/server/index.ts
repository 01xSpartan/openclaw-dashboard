import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { validateToken } from './auth.js';
import { loadState, patchState, updateState } from './state.js';
import { listAgents } from './agents.js';
import { getTodayActivity } from './runs.js';
import { dispatchCard, killCard, retryCard } from './dispatch.js';
import { readSandboxedFile, writeSandboxedFile } from './files.js';
import { handleSSE, broadcast } from './sse.js';
import { materializeBusinessRoot } from './businesses.js';
import { ulid } from 'ulid';

const app = new Hono();

// Auth middleware for /api routes
app.use('/api/*', async (c, next) => {
  // Skip auth for SSE stream (token sent as query param)
  if (c.req.path === '/api/dashboard/stream') {
    const token = c.req.query('token');
    if (!validateToken(token ? `Bearer ${token}` : undefined)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    return next();
  }

  const auth = c.req.header('Authorization');
  if (!validateToken(auth)) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  return next();
});

// GET /api/dashboard/state
app.get('/api/dashboard/state', (c) => {
  const state = loadState();
  return c.json(state);
});

// POST /api/dashboard/state — atomic patch
app.post('/api/dashboard/state', async (c) => {
  const ifVersion = c.req.header('If-Version');
  if (!ifVersion) {
    return c.json({ error: 'If-Version header required' }, 400);
  }

  const expectedVersion = parseInt(ifVersion, 10);
  if (isNaN(expectedVersion)) {
    return c.json({ error: 'Invalid If-Version' }, 400);
  }

  const patch = await c.req.json();
  const result = patchState(patch, expectedVersion);

  if (!result.ok) {
    return c.json({ error: result.error, currentVersion: result.currentVersion }, 409);
  }

  broadcast('state.changed', { version: result.state.version });
  return c.json(result.state);
});

// GET /api/dashboard/agents
app.get('/api/dashboard/agents', (c) => {
  const agents = listAgents();
  return c.json(agents);
});

// GET /api/dashboard/usage
app.get('/api/dashboard/usage', (c) => {
  const activity = getTodayActivity();
  const state = loadState();

  // Group by business
  const byBusiness: Record<string, { running: number; completedToday: number; failedToday: number }> = {};
  for (const biz of state.businesses) {
    const bizCards = state.cards.filter(card => card.business_id === biz.id);
    byBusiness[biz.id] = {
      running: bizCards.filter(c => c.status === 'running').length,
      completedToday: bizCards.filter(c => c.status === 'done' && c.outcome === 'completed' &&
        c.ended_at && c.ended_at >= new Date().setHours(0, 0, 0, 0)).length,
      failedToday: bizCards.filter(c => c.status === 'done' && c.outcome?.startsWith('failed') &&
        c.ended_at && c.ended_at >= new Date().setHours(0, 0, 0, 0)).length,
    };
  }

  return c.json({
    activity: {
      total: activity,
      byBusiness,
    },
    lastSeen: Date.now(),
  });
});

// POST /api/dashboard/dispatch
app.post('/api/dashboard/dispatch', async (c) => {
  const body = await c.req.json();
  const { card_id } = body;
  if (!card_id) return c.json({ error: 'card_id required' }, 400);

  const result = dispatchCard(card_id);
  if (!result.ok) return c.json({ error: result.error }, 400);

  broadcast('card.updated', { card_id, status: 'running' });
  return c.json(result);
});

// POST /api/dashboard/cards/:id/retry
app.post('/api/dashboard/cards/:id/retry', (c) => {
  const cardId = c.req.param('id');
  const result = retryCard(cardId);
  if (!result.ok) return c.json({ error: result.error }, 400);

  broadcast('card.updated', { card_id: cardId, status: 'running' });
  return c.json(result);
});

// POST /api/dashboard/cards/:id/kill
app.post('/api/dashboard/cards/:id/kill', (c) => {
  const cardId = c.req.param('id');
  const result = killCard(cardId);
  if (!result.ok) return c.json({ error: result.error }, 400);

  broadcast('card.updated', { card_id: cardId, status: 'done' });
  return c.json(result);
});

// POST /api/dashboard/businesses — create business
app.post('/api/dashboard/businesses', async (c) => {
  const body = await c.req.json();
  const { name, url, tagline, color, icon } = body;
  if (!name) return c.json({ error: 'name required' }, 400);

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const state = loadState();
  if (state.businesses.some(b => b.id === slug)) {
    return c.json({ error: 'Business slug already exists' }, 409);
  }

  const business = {
    id: slug,
    name,
    url: url || '',
    tagline: tagline || '',
    color: color || '#6366f1',
    icon: icon || '▣',
    root: `~/.openclaw/businesses/${slug}`,
    agents: [],
  };

  const updated = updateState(s => ({
    ...s,
    businesses: [...s.businesses, business],
  }));

  const matResult = materializeBusinessRoot(business);
  if (!matResult.ok) {
    console.error(`[businesses] failed to materialize ${business.id}: ${matResult.error}`);
  }

  broadcast('state.changed', { version: updated.version });
  return c.json(business, 201);
});

// DELETE /api/dashboard/businesses/:id
app.delete('/api/dashboard/businesses/:id', (c) => {
  const bizId = c.req.param('id');
  const updated = updateState(s => ({
    ...s,
    businesses: s.businesses.filter(b => b.id !== bizId),
    agents: s.agents.map(a => a.business_id === bizId ? { ...a, business_id: null } : a),
    cards: s.cards.filter(card => card.business_id !== bizId),
  }));

  broadcast('state.changed', { version: updated.version });
  return c.json({ ok: true });
});

// POST /api/dashboard/cards — create card
app.post('/api/dashboard/cards', async (c) => {
  const body = await c.req.json();
  const { business_id, title, prompt, agent_id, status } = body;
  if (!business_id || !title) return c.json({ error: 'business_id and title required' }, 400);

  const card = {
    id: ulid(),
    business_id,
    title,
    prompt: prompt || '',
    agent_id: agent_id || null,
    status: status || 'backlog',
    blocked: false,
    outcome: null,
    task_run_id: null,
    created_at: Date.now(),
    dispatched_at: null,
    ended_at: null,
  };

  const updated = updateState(s => ({
    ...s,
    cards: [...s.cards, card],
  }));

  broadcast('state.changed', { version: updated.version });
  return c.json(card, 201);
});

// PATCH /api/dashboard/cards/:id — update card
app.patch('/api/dashboard/cards/:id', async (c) => {
  const cardId = c.req.param('id');
  const patch = await c.req.json();

  const state = loadState();
  const card = state.cards.find(card => card.id === cardId);
  if (!card) return c.json({ error: 'Card not found' }, 404);

  const updated = updateState(s => ({
    ...s,
    cards: s.cards.map(c => c.id === cardId ? { ...c, ...patch } : c),
  }));

  broadcast('card.updated', { card_id: cardId, ...patch });
  return c.json(updated.cards.find(c => c.id === cardId));
});

// DELETE /api/dashboard/cards/:id
app.delete('/api/dashboard/cards/:id', (c) => {
  const cardId = c.req.param('id');
  const updated = updateState(s => ({
    ...s,
    cards: s.cards.filter(c => c.id !== cardId),
  }));

  broadcast('state.changed', { version: updated.version });
  return c.json({ ok: true });
});

// POST /api/dashboard/agents — assign agent to business
app.post('/api/dashboard/agents', async (c) => {
  const body = await c.req.json();
  const { agent_id, business_id, role, name } = body;
  if (!agent_id) return c.json({ error: 'agent_id required' }, 400);

  const state = loadState();
  const existing = state.agents.find(a => a.id === agent_id);

  if (existing) {
    // Update assignment
    const updated = updateState(s => ({
      ...s,
      agents: s.agents.map(a => a.id === agent_id
        ? { ...a, business_id: business_id ?? a.business_id, role: role ?? a.role, name: name ?? a.name }
        : a
      ),
    }));
    broadcast('state.changed', { version: updated.version });
    return c.json(updated.agents.find(a => a.id === agent_id));
  }

  // New assignment
  const agent = {
    id: agent_id,
    name: name || agent_id,
    role: role || '',
    business_id: business_id || null,
    path: `~/.openclaw/agents/${agent_id}`,
    model: '',
    memory_files: ['AGENTS.md', 'MEMORY.md'],
  };

  const updated = updateState(s => ({
    ...s,
    agents: [...s.agents, agent],
  }));

  broadcast('state.changed', { version: updated.version });
  return c.json(agent, 201);
});

// GET /api/dashboard/files
app.get('/api/dashboard/files', (c) => {
  const path = c.req.query('path');
  if (!path) return c.json({ error: 'path query param required' }, 400);

  const result = readSandboxedFile(path);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ content: result.content });
});

// POST /api/dashboard/files
app.post('/api/dashboard/files', async (c) => {
  const body = await c.req.json();
  const { path, content } = body;
  if (!path || content === undefined) return c.json({ error: 'path and content required' }, 400);

  const result = writeSandboxedFile(path, content);
  if (!result.ok) return c.json({ error: result.error }, 400);
  return c.json({ ok: true });
});

// SSE stream
app.get('/api/dashboard/stream', (c) => {
  return handleSSE(c);
});

export default app;

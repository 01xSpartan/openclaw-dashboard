#!/usr/bin/env node

import { serve } from '@hono/node-server';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateToken } from './auth.js';
import { startPolling, stopPolling } from './sse.js';
import app from './index.js';
import { backfillBusinessRoots } from './businesses.js';
import { loadState } from './state.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const args = process.argv.slice(2);
const portArg = args.find(a => a.startsWith('--port='));
const port = portArg ? parseInt(portArg.split('=')[1], 10) : 5173;
const noOpen = args.includes('--no-open');
const isDev = args.includes('--dev');

// Generate session token
const token = generateToken();

// Serve static files from dist/client in production
const clientDir = join(__dirname, '..', 'client');
if (!isDev && existsSync(clientDir)) {
  // Read and prepare the index.html with token injected
  const indexPath = join(clientDir, 'index.html');
  const indexHtml = existsSync(indexPath)
    ? readFileSync(indexPath, 'utf-8').replace('__DASHBOARD_TOKEN__', token)
    : null;

  // Serve static assets (js, css, etc.)
  app.get('/assets/*', async (c) => {
    const filePath = join(clientDir, c.req.path);
    if (existsSync(filePath)) {
      const content = readFileSync(filePath);
      const ext = filePath.split('.').pop();
      const types: Record<string, string> = { js: 'application/javascript', css: 'text/css', svg: 'image/svg+xml', png: 'image/png', woff2: 'font/woff2' };
      return new Response(content, { headers: { 'Content-Type': types[ext ?? ''] ?? 'application/octet-stream', 'Cache-Control': 'public, max-age=31536000, immutable' } });
    }
    return c.text('Not found', 404);
  });

  // SPA fallback — serve index.html with token injected for all non-API routes
  app.get('*', (c) => {
    if (c.req.path.startsWith('/api/')) return c.text('Not found', 404);
    if (indexHtml) return c.html(indexHtml);
    return c.text('Not found', 404);
  });
}

// Start SSE polling
startPolling();

// Backfill any business roots that don't yet exist on disk.
const initialState = loadState();
const matResults = backfillBusinessRoots(initialState.businesses);
const matFailures = matResults.filter(r => !r.ok);
if (matFailures.length > 0) {
  console.error(`[startup] ${matFailures.length} business(es) failed to materialize:`);
  for (const r of matFailures) {
    if (!r.ok) console.error(`  - ${r.error}`);
  }
}

const server = serve({
  fetch: app.fetch,
  hostname: '127.0.0.1',
  port,
}, (info) => {
  const url = `http://127.0.0.1:${info.port}`;
  console.log(`\n  ⚡ OpenClaw Dashboard`);
  console.log(`  ────────────────────`);
  console.log(`  Local:  ${url}`);
  console.log(`  Token:  ${token.slice(0, 8)}...`);
  console.log(`  Mode:   ${isDev ? 'development' : 'production'}\n`);

  if (!noOpen && !isDev) {
    import('open').then(m => m.default(url)).catch(() => {});
  }
});

process.on('SIGINT', () => {
  console.log('\nShutting down...');
  stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  stopPolling();
  process.exit(0);
});

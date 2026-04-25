import { readFileSync, writeFileSync, existsSync, realpathSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { homedir } from 'node:os';

const SANDBOX_ROOT = join(homedir(), '.openclaw');

export function validatePath(requestedPath: string): { ok: true; resolved: string } | { ok: false; error: string } {
  try {
    // Resolve the path
    const resolved = resolve(requestedPath.replace(/^~/, homedir()));

    // If file exists, check realpath for symlink escapes
    if (existsSync(resolved)) {
      const real = realpathSync(resolved);
      if (!real.startsWith(SANDBOX_ROOT)) {
        return { ok: false, error: 'Path escapes sandbox' };
      }
      return { ok: true, resolved: real };
    }

    // If file doesn't exist, validate the intended path
    if (!resolved.startsWith(SANDBOX_ROOT)) {
      return { ok: false, error: 'Path escapes sandbox' };
    }
    return { ok: true, resolved };
  } catch {
    return { ok: false, error: 'Invalid path' };
  }
}

export function readSandboxedFile(requestedPath: string): { ok: true; content: string } | { ok: false; error: string } {
  const validation = validatePath(requestedPath);
  if (!validation.ok) return validation;

  try {
    const content = readFileSync(validation.resolved, 'utf-8');
    return { ok: true, content };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Read error';
    return { ok: false, error: msg };
  }
}

export function writeSandboxedFile(requestedPath: string, content: string): { ok: true } | { ok: false; error: string } {
  const validation = validatePath(requestedPath);
  if (!validation.ok) return validation;

  try {
    const dir = dirname(validation.resolved);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(validation.resolved, content, 'utf-8');
    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Write error';
    return { ok: false, error: msg };
  }
}

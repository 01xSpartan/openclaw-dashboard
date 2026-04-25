import { homedir } from 'node:os';
import { resolve, sep, join } from 'node:path';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';

export function expandHome(input: string): string {
  if (input === '~') return homedir();
  if (input.startsWith('~/')) return join(homedir(), input.slice(2));
  return input;
}

function businessesPrefix(): string {
  return join(homedir(), '.openclaw', 'businesses') + sep;
}

export function isInsideBusinessesDir(absolutePath: string): boolean {
  const resolved = resolve(absolutePath);
  return resolved.startsWith(businessesPrefix());
}

export interface BusinessLike {
  id: string;
  name: string;
  root: string;
}

export type MaterializeResult =
  | { ok: true; root: string; created: string[] }
  | { ok: false; error: string };

export function materializeBusinessRoot(business: BusinessLike): MaterializeResult {
  const expanded = expandHome(business.root);
  if (!isInsideBusinessesDir(expanded)) {
    return { ok: false, error: `sandbox violation: ${business.root} is not under ~/.openclaw/businesses/` };
  }

  try {
    const created: string[] = [];

    for (const sub of ['agents', 'workspace', 'knowledge']) {
      const dir = join(expanded, sub);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
        created.push(dir);
      }
    }

    const memPath = join(expanded, 'workspace', 'MEMORY.md');
    if (!existsSync(memPath)) {
      writeFileSync(memPath, `# ${business.name} — Memory\n\n`, 'utf-8');
      created.push(memPath);
    }

    return { ok: true, root: expanded, created };
  } catch (e) {
    return { ok: false, error: `filesystem error: ${(e as Error).message}` };
  }
}

export function backfillBusinessRoots(businesses: BusinessLike[]): MaterializeResult[] {
  return businesses.map(b => {
    try {
      return materializeBusinessRoot(b);
    } catch (e) {
      return { ok: false, error: `materialize threw: ${(e as Error).message}` };
    }
  });
}

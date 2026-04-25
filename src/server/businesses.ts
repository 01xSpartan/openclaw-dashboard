import { homedir } from 'node:os';
import { resolve, sep, join } from 'node:path';

export function expandHome(input: string): string {
  if (input === '~') return homedir();
  if (input.startsWith('~/')) return join(homedir(), input.slice(2));
  return input;
}

const BUSINESSES_PREFIX = join(homedir(), '.openclaw', 'businesses') + sep;

export function isInsideBusinessesDir(absolutePath: string): boolean {
  const resolved = resolve(absolutePath);
  return resolved.startsWith(BUSINESSES_PREFIX);
}

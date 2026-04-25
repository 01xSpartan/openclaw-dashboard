import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { mkdtempSync, rmSync, existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { expandHome, isInsideBusinessesDir, materializeBusinessRoot } from './businesses.js';

test('expandHome expands a leading tilde', () => {
  assert.equal(expandHome('~/.openclaw/businesses/foo'), join(homedir(), '.openclaw/businesses/foo'));
});

test('expandHome leaves absolute paths alone', () => {
  assert.equal(expandHome('/tmp/x'), '/tmp/x');
});

test('expandHome leaves a path that merely contains tilde alone', () => {
  assert.equal(expandHome('/tmp/~not-home'), '/tmp/~not-home');
});

test('isInsideBusinessesDir accepts a slug under businesses/', () => {
  assert.equal(isInsideBusinessesDir(join(homedir(), '.openclaw/businesses/scube-housing')), true);
});

test('isInsideBusinessesDir rejects an escape with ..', () => {
  assert.equal(isInsideBusinessesDir(join(homedir(), '.openclaw/businesses/../evil')), false);
});

test('isInsideBusinessesDir rejects an unrelated absolute path', () => {
  assert.equal(isInsideBusinessesDir('/etc/passwd'), false);
});

test('isInsideBusinessesDir rejects the businesses dir itself (no slug)', () => {
  assert.equal(isInsideBusinessesDir(join(homedir(), '.openclaw/businesses')), false);
});

function withTempBusinessesDir<T>(fn: (root: string) => T): T {
  // Make a tmp dir that LOOKS like ~/.openclaw/businesses by overriding HOME.
  const tmp = mkdtempSync(join(tmpdir(), 'oc-mat-'));
  const fakeHome = tmp;
  const businessesDir = join(fakeHome, '.openclaw', 'businesses');
  mkdirSync(businessesDir, { recursive: true });
  const prevHome = process.env.HOME;
  process.env.HOME = fakeHome;
  try {
    return fn(businessesDir);
  } finally {
    if (prevHome === undefined) delete process.env.HOME;
    else process.env.HOME = prevHome;
    rmSync(tmp, { recursive: true, force: true });
  }
}

test('materializeBusinessRoot creates agents/ workspace/ knowledge/ and starter MEMORY.md', () => {
  withTempBusinessesDir((businessesDir) => {
    const result = materializeBusinessRoot({
      id: 'foo',
      name: 'Foo Bar',
      root: '~/.openclaw/businesses/foo',
    });
    assert.equal(result.ok, true);
    assert.equal(existsSync(join(businessesDir, 'foo', 'agents')), true);
    assert.equal(existsSync(join(businessesDir, 'foo', 'workspace')), true);
    assert.equal(existsSync(join(businessesDir, 'foo', 'knowledge')), true);
    const mem = readFileSync(join(businessesDir, 'foo', 'workspace', 'MEMORY.md'), 'utf-8');
    assert.equal(mem, '# Foo Bar — Memory\n\n');
  });
});

test('materializeBusinessRoot is idempotent (runs twice, no error, no overwrite)', () => {
  withTempBusinessesDir((businessesDir) => {
    materializeBusinessRoot({ id: 'foo', name: 'Foo', root: '~/.openclaw/businesses/foo' });
    // User edits MEMORY.md after first materialize.
    const memPath = join(businessesDir, 'foo', 'workspace', 'MEMORY.md');
    writeFileSync(memPath, 'user-edited content', 'utf-8');
    const result = materializeBusinessRoot({ id: 'foo', name: 'Foo', root: '~/.openclaw/businesses/foo' });
    assert.equal(result.ok, true);
    // Second run did NOT overwrite the user's edits.
    assert.equal(readFileSync(memPath, 'utf-8'), 'user-edited content');
  });
});

test('materializeBusinessRoot rejects a root outside ~/.openclaw/businesses/', () => {
  withTempBusinessesDir(() => {
    const result = materializeBusinessRoot({
      id: 'evil',
      name: 'Evil',
      root: '/tmp/evil',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /sandbox/i);
  });
});

test('materializeBusinessRoot rejects a root that escapes via ..', () => {
  withTempBusinessesDir(() => {
    const result = materializeBusinessRoot({
      id: 'evil',
      name: 'Evil',
      root: '~/.openclaw/businesses/../../etc/evil',
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.match(result.error, /sandbox/i);
  });
});

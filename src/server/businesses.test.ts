import { test } from 'node:test';
import assert from 'node:assert/strict';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { expandHome, isInsideBusinessesDir } from './businesses.js';

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

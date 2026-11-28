import { test } from 'node:test';
import * as assert from 'node:assert';
import { applyAuth } from '../core/auth';

const base = { Accept: 'application/json' };

test('adds a Bearer header over https', () => {
  const out = applyAuth(base, 'abc', { baseUrl: 'https://api.example.com', scheme: 'Bearer' });
  assert.deepStrictEqual(out, { Accept: 'application/json', Authorization: 'Bearer abc' });
});

test('sends the raw token when the scheme is empty', () => {
  const out = applyAuth(base, 'abc', { baseUrl: 'https://api.example.com', scheme: '' });
  assert.strictEqual(out.Authorization, 'abc');
});

test('does nothing without a token, even over http', () => {
  const out = applyAuth(base, undefined, { baseUrl: 'http://legacy.example.com', scheme: 'Bearer' });
  assert.deepStrictEqual(out, base);
});

test('refuses a token over plain http', () => {
  assert.throws(
    () => applyAuth(base, 'abc', { baseUrl: 'http://legacy.example.com', scheme: 'Bearer' }),
    /non-HTTPS/
  );
});

test('allows http on localhost', () => {
  const out = applyAuth(base, 'abc', { baseUrl: 'http://localhost:3000', scheme: 'Bearer' });
  assert.strictEqual(out.Authorization, 'Bearer abc');
});

test('does not change the headers it was given', () => {
  const input = { Accept: 'application/json' };
  applyAuth(input, 'abc', { baseUrl: 'https://api.example.com', scheme: 'Bearer' });
  assert.deepStrictEqual(input, { Accept: 'application/json' });
});
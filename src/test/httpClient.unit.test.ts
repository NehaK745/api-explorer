import { test } from 'node:test';
import * as assert from 'node:assert';
import { sendRequest } from '../core/httpClient';

type Init = Parameters<typeof fetch>[1];
const get = { url: 'https://x.test', method: 'GET' as const, headers: {} };

test('returns status, text and lowercase headers', async () => {
  const fake = (async () =>
    new Response('{"ok":true}', {
      status: 200,
      statusText: 'OK',
      headers: { 'X-Test': '1' }
    })) as unknown as typeof fetch;
  const res = await sendRequest(get, { fetchImpl: fake });
  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.ok, true);
  assert.strictEqual(res.text, '{"ok":true}');
  assert.strictEqual(res.headers['x-test'], '1');
});

test('passes method, headers and body to fetch', async () => {
  let seen: { method?: string; body?: unknown; headers?: unknown } = {};
  const fake = (async (_url: unknown, init?: Init) => {
    seen = { method: init?.method, body: init?.body, headers: init?.headers };
    return new Response('', { status: 200 });
  }) as unknown as typeof fetch;
  await sendRequest(
    { url: 'https://x.test', method: 'POST', headers: { A: 'b' }, body: '<x/>' },
    { fetchImpl: fake }
  );
  assert.deepStrictEqual(seen, { method: 'POST', body: '<x/>', headers: { A: 'b' } });
});

test('reports a 404 without throwing', async () => {
  const fake = (async () =>
    new Response('nope', { status: 404, statusText: 'Not Found' })) as unknown as typeof fetch;
  const res = await sendRequest(get, { fetchImpl: fake });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.status, 404);
});

test('gives up after the timeout', async () => {
  const hang = ((_url: unknown, init?: Init) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(new Error('timed out')));
    })) as unknown as typeof fetch;

  // AbortSignal.timeout does not keep Node alive, so hold the process open ourselves.
  const keepAlive = setTimeout(() => undefined, 2000);
  try {
    await assert.rejects(
      () => sendRequest(get, { timeoutMs: 20, fetchImpl: hang }),
      /timed out/
    );
  } finally {
    clearTimeout(keepAlive);
  }
});
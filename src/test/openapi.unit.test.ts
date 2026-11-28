import { test } from 'node:test';
import * as assert from 'node:assert';
import { parseSpec, loadSpec } from '../openapi';

test('keeps simple GET endpoints and skips the rest', () => {
  const result = parseSpec({
    openapi: '3.0.0',
    info: { title: 'Demo' },
    servers: [{ url: 'https://api.example.com/v1/' }],
    paths: {
      '/pets': { get: { summary: 'List pets' } },
      '/pets/{id}': { get: { summary: 'One pet' } },
      '/search': { get: { parameters: [{ name: 'q', in: 'query', required: true }] } },
      '/admin': { post: {} }
    }
  });
  assert.deepStrictEqual(result.endpoints, [{ path: 'pets', summary: 'List pets' }]);
  assert.strictEqual(result.baseUrl, 'https://api.example.com/v1');
  assert.strictEqual(result.title, 'Demo');
});

test('reads a Swagger 2 spec', () => {
  const result = parseSpec({
    swagger: '2.0',
    info: { title: 'Old' },
    host: 'api.example.com',
    basePath: '/v2',
    schemes: ['https'],
    paths: { '/store/inventory': { get: { summary: 'Stock' } } }
  });
  assert.strictEqual(result.baseUrl, 'https://api.example.com/v2');
  assert.deepStrictEqual(result.endpoints, [{ path: 'store/inventory', summary: 'Stock' }]);
});

test('rejects documents that are not specs', () => {
  assert.throws(() => parseSpec({ hello: 'world' }), /OpenAPI or Swagger/);
});

test('loadSpec explains invalid JSON', async () => {
  const fake = (async () => new Response('openapi: 3.0.0', { status: 200 })) as typeof fetch;
  await assert.rejects(() => loadSpec('https://x.test/spec.yaml', fake), /not valid JSON/);
});
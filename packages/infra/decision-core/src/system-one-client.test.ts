import assert from 'node:assert/strict';
import test from 'node:test';
import type { ProviderEnv } from './contract.js';
import { localTestProvider } from './test-providers.js';
import { DecisionProviderRegistry } from './registry.js';
import { resolveDecisionProvider } from './resolve.js';
import { NO_RETRY } from './retry-policy.js';
import { SystemOneClient, SystemOneError } from './system-one-client.js';

const registry = new DecisionProviderRegistry([localTestProvider]);
const QUESTIONS = { is_timeout: { type: 'noul' as const, instructions: 'Is this a timeout?' } };
const ANSWER = {
  model: 'local-test',
  answers: { is_timeout: { type: 'noul', noul: 0.93 } },
  usage: { input_tokens: 64, output_tokens: 0 },
};

function provider(env: ProviderEnv = {}) {
  return resolveDecisionProvider({ env, registry, providerName: 'local' });
}

function recordingFetch(status = 200, body: unknown = ANSWER) {
  const calls: RequestInit[] = [];
  const fetchImpl = (async (_url: string, init: RequestInit) => {
    calls.push(init);
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
}

test('transport receives provider identity from composition', () => {
  const client = new SystemOneClient({ provider: provider(), fetchImpl: recordingFetch().fetchImpl });
  assert.equal(client.provider, 'local');
});

test('no authorization header is sent without a resolved credential', async () => {
  const { calls, fetchImpl } = recordingFetch();
  const client = new SystemOneClient({ provider: provider(), fetchImpl });
  await client.systemOne({ state: 'x', questions: QUESTIONS });
  assert.equal((calls[0]?.headers as Record<string, unknown>)?.Authorization, undefined);
});

test('a resolved credential becomes a bearer token', async () => {
  const env = { LOCAL_KEY: 'local-secret' };
  const { calls, fetchImpl } = recordingFetch();
  const client = new SystemOneClient({ provider: provider(env), env, fetchImpl });
  await client.systemOne({ state: 'x', questions: QUESTIONS });
  assert.equal((calls[0]?.headers as Record<string, unknown>)?.Authorization, 'Bearer local-secret');
});

test('the resolved model is sent unless the request overrides it', async () => {
  const { calls, fetchImpl } = recordingFetch();
  const client = new SystemOneClient({ provider: provider({ LOCAL_MODEL: 'typed-decisions' }), fetchImpl });
  await client.systemOne({ state: 'x', questions: QUESTIONS });
  assert.equal(JSON.parse(String(calls[0]?.body)).model, 'typed-decisions');
  await client.systemOne({ state: 'x', model: 'multilingual', questions: QUESTIONS });
  assert.equal(JSON.parse(String(calls[1]?.body)).model, 'multilingual');
});

test('retry policy remains injectable', async () => {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response(JSON.stringify({ detail: 'loading' }), { status: 503 });
  }) as unknown as typeof fetch;
  const client = new SystemOneClient({
    provider: provider(), fetchImpl,
    retryPolicy: { shouldRetry: (status, attempt) => status === 503 && attempt < 1, delayMs: () => 0 },
  });
  await assert.rejects(() => client.systemOne({ state: 'x', questions: QUESTIONS }), SystemOneError);
  assert.equal(calls, 2);
});

test('no-retry policy makes one attempt', async () => {
  let calls = 0;
  const fetchImpl = (async () => { calls += 1; return new Response('{}', { status: 429 }); }) as unknown as typeof fetch;
  const client = new SystemOneClient({ provider: provider(), fetchImpl, retryPolicy: NO_RETRY });
  await assert.rejects(() => client.systemOne({ state: 'x', questions: QUESTIONS }));
  assert.equal(calls, 1);
});

test('remote evidence is refused without consent', async () => {
  const env = { LOCAL_BASE_URL: 'https://api.impossibl.com', LOCAL_KEY: 'hosted-key' };
  const client = new SystemOneClient({ provider: provider(env), env, fetchImpl: recordingFetch().fetchImpl });
  await assert.rejects(() => client.systemOne({ state: 'x', questions: QUESTIONS }), /would leave this machine/);
});

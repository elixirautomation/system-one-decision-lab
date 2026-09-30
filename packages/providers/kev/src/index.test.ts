import assert from 'node:assert/strict';
import test from 'node:test';
import {
  choiceRoutingValue,
  DecisionProviderRegistry,
  EgressConsentError,
  NO_RETRY,
  recommendAction,
  resolveDecisionProvider,
  SystemOneClient,
  type ChoiceAnswer,
  type ProviderEnv,
} from '@sysone/decision-core';
import { kevProvider } from './index.js';

const registry = new DecisionProviderRegistry([kevProvider]);
const resolve = (env: ProviderEnv) => resolveDecisionProvider({ env, registry, providerName: 'kev' });

function recordingFetch(calls: { url: string; headers: Record<string, string>; body: unknown }[]): typeof fetch {
  return (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), headers: init?.headers as Record<string, string>, body: JSON.parse(String(init?.body)) });
    return new Response(JSON.stringify({ model: 'kev-latest', answers: {}, usage: { input_tokens: 1, output_tokens: 1 } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }) as typeof fetch;
}

test('resolves local Kev without a credential or egress consent', () => {
  const resolved = resolve({});
  assert.equal(resolved.endpoint, 'http://localhost:8009/v1/systemone');
  assert.equal(resolved.endpointScope, 'local');
  assert.equal(resolved.model, 'kev-latest');
  assert.equal(resolved.apiKey, null);
  assert.equal(resolved.requiresEgressConsent, false);
});

test('a Compose service name is still local scope', () => {
  const resolved = resolve({ KEV_BASE_URL: 'http://kev:8009' });
  assert.equal(resolved.endpoint, 'http://kev:8009/v1/systemone');
  assert.equal(resolved.endpointScope, 'local');
});

test('KEV_ENDPOINT overrides the base URL', () => {
  assert.equal(
    resolve({ KEV_BASE_URL: 'http://localhost:1', KEV_ENDPOINT: 'http://127.0.0.1:9/v1/systemone' }).endpoint,
    'http://127.0.0.1:9/v1/systemone',
  );
});

test('a remote deployment requires a credential', () => {
  assert.throws(() => resolve({ KEV_BASE_URL: 'https://example.invalid' }), /KEV_API_KEY/);
});

test('a remote deployment with a key is remote scope and needs egress consent', async () => {
  const provider = resolve({ KEV_BASE_URL: 'https://example.invalid', KEV_API_KEY: 'k' });
  assert.equal(provider.endpointScope, 'remote');
  assert.equal(provider.requiresEgressConsent, true);
  const calls: Parameters<typeof recordingFetch>[0] = [];
  const client = new SystemOneClient({ provider, env: {}, fetchImpl: recordingFetch(calls), retryPolicy: NO_RETRY });
  await assert.rejects(client.systemOne({ state: 'x', questions: {} }), EgressConsentError);
  assert.equal(calls.length, 0);
});

test('sends a bearer header only when a key is resolved', async () => {
  const calls: Parameters<typeof recordingFetch>[0] = [];
  const anonymous = new SystemOneClient({ provider: resolve({}), env: {}, fetchImpl: recordingFetch(calls), retryPolicy: NO_RETRY });
  await anonymous.systemOne({ state: 'x', questions: {} });
  const keyed = new SystemOneClient({ provider: resolve({ KEV_API_KEY: 'local-key' }), env: {}, fetchImpl: recordingFetch(calls), retryPolicy: NO_RETRY });
  await keyed.systemOne({ state: 'x', questions: {} });

  assert.equal(calls[0]?.url, 'http://localhost:8009/v1/systemone');
  assert.equal(calls[0]?.headers.Authorization, undefined);
  assert.deepEqual(calls[0]?.body, { state: 'x', model: 'kev-latest', questions: {} });
  assert.equal(calls[1]?.headers.Authorization, 'Bearer local-key');
});

test('gates on the winning probability, not the rescaled confidence', () => {
  const provider = resolve({});
  assert.equal(provider.choiceGate, 'top_probability');
  assert.equal(provider.capabilities.calibratedChoiceConfidence, false);

  // Four options, 0.80 on the winner: confidence is (0.80 - 0.25) / 0.75 = 0.733.
  const answer: ChoiceAnswer = {
    type: 'choice',
    choice: 'automation_bug',
    confidence: 0.733,
    probabilities: { automation_bug: 0.8, product_bug: 0.1, infrastructure_failure: 0.06, unknown: 0.04 },
  };
  const value = choiceRoutingValue(answer, provider.choiceGate);
  assert.equal(value, 0.8);
  assert.equal(recommendAction(value, provider), 'auto_file');
  assert.equal(recommendAction(answer.confidence, provider), 'flag_for_review');
  assert.equal(recommendAction(0.44, provider), 'escalate_to_human');
});

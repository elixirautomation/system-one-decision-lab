import assert from 'node:assert/strict';
import test from 'node:test';
import { DecisionProviderRegistry, resolveDecisionProvider } from '@sysone/decision-core';
import { layaProvider } from './index.js';

const registry = new DecisionProviderRegistry([layaProvider]);

test('resolves local Laya without a credential', () => {
  const resolved = resolveDecisionProvider({ env: {}, registry, providerName: 'laya' });
  assert.equal(resolved.endpoint, 'http://localhost:8000/v1/systemone');
  assert.equal(resolved.choiceGate, 'top_probability');
  assert.equal(resolved.requiresEgressConsent, false);
});

test('requires a credential when Laya is composed remotely', () => {
  assert.throws(
    () => resolveDecisionProvider({ env: { LAYA_BASE_URL: 'https://example.invalid' }, registry, providerName: 'laya' }),
    /LAYA_API_KEY/,
  );
});

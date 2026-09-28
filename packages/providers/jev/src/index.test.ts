import assert from 'node:assert/strict';
import test from 'node:test';
import { DecisionProviderRegistry, resolveDecisionProvider } from '@sysone/decision-core';
import { jevProvider } from './index.js';

const registry = new DecisionProviderRegistry([jevProvider]);

test('resolves the hosted Jev adapter and enforces its key', () => {
  const resolved = resolveDecisionProvider({ env: { JEV_API_KEY: 'key' }, registry, providerName: 'jev' });
  assert.equal(resolved.endpoint, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(resolved.choiceGate, 'confidence');
  assert.throws(() => resolveDecisionProvider({ env: {}, registry, providerName: 'jev' }), /JEV_API_KEY/);
});

test('supports the typesafe alias', () => {
  assert.equal(resolveDecisionProvider({ env: { JEV_API_KEY: 'key' }, registry, providerName: 'typesafe' }).id, 'jev');
});

import assert from 'node:assert/strict';
import test from 'node:test';
import type { DecisionProviderDefinition, ProviderEnv } from './contract.js';
import { classifyEndpointScope } from './endpoint-scope.js';
import { assertDataEgressAllowed, dataEgressAllowed } from './egress.js';
import { DecisionProviderRegistry, DuplicateProviderError } from './registry.js';
import { hostedTestProvider, localTestProvider } from './test-providers.js';
import { describeDecisionProvider, ProviderConfigurationError, resolveDecisionProvider } from './resolve.js';

const registry = new DecisionProviderRegistry([hostedTestProvider, localTestProvider]);
function resolve(env: ProviderEnv, providerName: string) {
  return resolveDecisionProvider({ env, registry, providerName });
}

test('a composition root must choose an installed provider explicitly', () => {
  assert.equal(resolve({ HOSTED_KEY: 'key' }, 'hosted').id, 'hosted');
  assert.throws(() => resolveDecisionProvider({ env: {}, registry, providerName: '' }), /received no provider/);
});

test('aliases are registry data', () => {
  assert.equal(resolve({ HOSTED_KEY: 'key' }, 'remote').id, 'hosted');
});

test('unknown providers list installed ids', () => {
  assert.throws(() => resolve({}, 'absent'), /hosted, local/);
});

test('local endpoint classification covers loopback, private and service hosts', () => {
  for (const endpoint of ['http://localhost:8000/x', 'http://127.0.0.1:1/x', 'http://engine:8000/x', 'http://192.168.1.2/x']) {
    assert.equal(classifyEndpointScope(endpoint), 'local');
  }
});

test('public and malformed endpoints fail closed', () => {
  assert.equal(classifyEndpointScope('https://example.invalid/x'), 'remote');
  assert.equal(classifyEndpointScope('not-a-url'), 'remote');
});

test('egress consent follows endpoint rather than provider id', () => {
  const local = resolve({}, 'local');
  assert.doesNotThrow(() => assertDataEgressAllowed(local, {}));
  const remote = resolve({ LOCAL_BASE_URL: 'https://example.invalid', LOCAL_KEY: 'key' }, 'local');
  assert.throws(() => assertDataEgressAllowed(remote, {}), /would leave this machine/);
  assert.equal(dataEgressAllowed({ ALLOW_DECISION_DATA_EGRESS: 'true' }), true);
});

test('provider-declared requirements are enforced generically', () => {
  assert.throws(
    () => resolve({}, 'hosted'),
    (error: unknown) => error instanceof ProviderConfigurationError && error.missing[0]?.key.name === 'HOSTED_KEY',
  );
  assert.doesNotThrow(() => resolve({}, 'local'));
  assert.throws(() => resolve({ LOCAL_BASE_URL: 'https://example.invalid' }, 'local'), /LOCAL_KEY/);
});

test('description works before credentials exist', () => {
  assert.equal(describeDecisionProvider({ env: {}, registry, providerName: 'hosted' }).apiKey, null);
});

test('a new contract implementation needs no resolver edit', () => {
  const stub: DecisionProviderDefinition = {
    id: 'stub', label: 'Stub', summary: 'Stub', homepage: 'https://example.invalid', envKeys: [],
    capabilities: { selfHostable: true, calibratedChoiceConfidence: true, reportsRouting: false, reportsTokenUsage: false },
    gateDefaults: { choiceGate: 'confidence', actThreshold: 0.8, reviewThreshold: 0.5 },
    resolveEndpoint: () => 'http://stub:9000/v1/systemone', resolveModel: () => 'stub', resolveApiKey: () => null,
  };
  const isolated = new DecisionProviderRegistry([stub]);
  assert.equal(resolveDecisionProvider({ env: {}, registry: isolated, providerName: 'stub' }).id, 'stub');
});

test('duplicate ids and aliases fail fast', () => {
  const isolated = new DecisionProviderRegistry([hostedTestProvider]);
  assert.throws(() => isolated.register({ ...localTestProvider, aliases: ['remote'] }), DuplicateProviderError);
});

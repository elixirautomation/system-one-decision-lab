import type { DecisionProviderDefinition } from './contract.js';

export const hostedTestProvider: DecisionProviderDefinition = {
  id: 'hosted', label: 'Hosted', aliases: ['remote'], summary: 'Hosted test adapter', homepage: 'https://example.invalid',
  envKeys: [{ name: 'HOSTED_KEY', requirement: 'required', purpose: 'Test credential', secret: true }],
  capabilities: { selfHostable: false, calibratedChoiceConfidence: true, reportsRouting: false, reportsTokenUsage: true },
  gateDefaults: { choiceGate: 'confidence', actThreshold: 0.75, reviewThreshold: 0.45 },
  resolveEndpoint: () => 'https://example.invalid/v1/systemone',
  resolveModel: () => 'hosted-test',
  resolveApiKey: (env) => env.HOSTED_KEY ?? null,
};

export const localTestProvider: DecisionProviderDefinition = {
  id: 'local', label: 'Local', summary: 'Local test adapter', homepage: 'https://example.invalid',
  envKeys: [
    { name: 'LOCAL_BASE_URL', requirement: 'optional', purpose: 'Test endpoint' },
    { name: 'LOCAL_MODEL', requirement: 'optional', purpose: 'Test model' },
    { name: 'LOCAL_KEY', requirement: 'required-when-remote', purpose: 'Remote credential', secret: true },
  ],
  capabilities: { selfHostable: true, calibratedChoiceConfidence: false, reportsRouting: true, reportsTokenUsage: true },
  gateDefaults: { choiceGate: 'top_probability', actThreshold: 0.6, reviewThreshold: 0.35 },
  resolveEndpoint: (env) => `${env.LOCAL_BASE_URL ?? 'http://localhost:8000'}/v1/systemone`,
  resolveModel: (env) => env.LOCAL_MODEL ?? 'local-test',
  resolveApiKey: (env) => env.LOCAL_KEY ?? null,
};

import {
  joinUrl,
  readEnv,
  type DecisionProviderDefinition,
  type ProviderEnv,
} from '@sysone/decision-core';

const DEFAULT_BASE_URL = 'http://localhost:8009';
const DEFAULT_MODEL = 'kev-latest';
const SYSTEM_ONE_PATH = '/v1/systemone';

export const kevProvider: DecisionProviderDefinition = {
  id: 'kev',
  label: 'Kev',
  summary: 'Self-hosted Kev. Local composition sends no evidence off-host.',
  homepage: 'https://github.com/jaredpalmer/kev',
  envKeys: [
    { name: 'KEV_BASE_URL', requirement: 'optional', purpose: `Origin the ${SYSTEM_ONE_PATH} path is appended to.` },
    { name: 'KEV_ENDPOINT', requirement: 'optional', purpose: 'Full System One URL.' },
    { name: 'KEV_MODEL', requirement: 'optional', purpose: `Model name sent in the request (default ${DEFAULT_MODEL}).` },
    { name: 'KEV_API_KEY', requirement: 'required-when-remote', purpose: 'Bearer token required for a remote deployment.', secret: true },
  ],
  // Kev's Choice `confidence` is (p_max - 1/K) / (1 - 1/K): a rescaling of the
  // winning option's mass, not an independent signal. Its probabilities carry a
  // fitted temperature, so the gate reads that mass directly.
  capabilities: { selfHostable: true, calibratedChoiceConfidence: false, reportsRouting: false, reportsTokenUsage: true },
  gateDefaults: { choiceGate: 'top_probability', actThreshold: 0.75, reviewThreshold: 0.45 },
  resolveEndpoint(env: ProviderEnv): string {
    return readEnv(env, 'KEV_ENDPOINT') ?? joinUrl(readEnv(env, 'KEV_BASE_URL') ?? DEFAULT_BASE_URL, SYSTEM_ONE_PATH);
  },
  resolveModel(env: ProviderEnv): string { return readEnv(env, 'KEV_MODEL') ?? DEFAULT_MODEL; },
  resolveApiKey(env: ProviderEnv): string | null { return readEnv(env, 'KEV_API_KEY') ?? null; },
};

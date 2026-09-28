import {
  joinUrl,
  readEnv,
  type DecisionProviderDefinition,
  type ProviderEnv,
} from '@sysone/decision-core';

const DEFAULT_BASE_URL = 'https://api.typesafe.ai';
const DEFAULT_MODEL = 'jev-latest';
const SYSTEM_ONE_PATH = '/v1/systemone';

export const jevProvider: DecisionProviderDefinition = {
  id: 'jev',
  label: 'Jev',
  aliases: ['typesafe'],
  summary: 'Hosted TypeSafe Jev API. Requires a key and sends evidence off-host.',
  homepage: 'https://console.typesafe.ai/keys',
  envKeys: [
    { name: 'JEV_API_KEY', requirement: 'required', purpose: 'Bearer token for the hosted API; the service has no anonymous access.', secret: true },
    { name: 'JEV_MODEL', requirement: 'optional', purpose: `Model name (default ${DEFAULT_MODEL}).` },
    { name: 'JEV_ENDPOINT', requirement: 'optional', purpose: 'Full System One URL.' },
    { name: 'JEV_BASE_URL', requirement: 'optional', purpose: `Origin the ${SYSTEM_ONE_PATH} path is appended to.` },
  ],
  capabilities: { selfHostable: false, calibratedChoiceConfidence: true, reportsRouting: false, reportsTokenUsage: true },
  gateDefaults: { choiceGate: 'confidence', actThreshold: 0.75, reviewThreshold: 0.45 },
  resolveEndpoint(env: ProviderEnv): string {
    return readEnv(env, 'JEV_ENDPOINT') ?? joinUrl(readEnv(env, 'JEV_BASE_URL') ?? DEFAULT_BASE_URL, SYSTEM_ONE_PATH);
  },
  resolveModel(env: ProviderEnv): string { return readEnv(env, 'JEV_MODEL') ?? DEFAULT_MODEL; },
  resolveApiKey(env: ProviderEnv): string | null { return readEnv(env, 'JEV_API_KEY') ?? null; },
};

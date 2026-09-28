import {
  joinUrl,
  readEnv,
  type DecisionProviderDefinition,
  type ProviderEnv,
} from '@sysone/decision-core';

const DEFAULT_BASE_URL = 'http://localhost:8000';
const DEFAULT_MODEL = 'english';
const SYSTEM_ONE_PATH = '/v1/systemone';

export const layaProvider: DecisionProviderDefinition = {
  id: 'laya',
  label: 'Laya',
  summary: 'Self-hosted Laya. Local composition sends no evidence off-host.',
  homepage: 'https://github.com/NandhaKishorM/laya',
  envKeys: [
    { name: 'LAYA_BASE_URL', requirement: 'optional', purpose: `Origin the ${SYSTEM_ONE_PATH} path is appended to.` },
    { name: 'LAYA_ENDPOINT', requirement: 'optional', purpose: 'Full System One URL.' },
    { name: 'LAYA_MODEL', requirement: 'optional', purpose: `Checkpoint (default ${DEFAULT_MODEL}).` },
    { name: 'LAYA_API_KEY', requirement: 'required-when-remote', purpose: 'Bearer token required for a remote deployment.', secret: true },
  ],
  capabilities: { selfHostable: true, calibratedChoiceConfidence: false, reportsRouting: true, reportsTokenUsage: true },
  gateDefaults: { choiceGate: 'top_probability', actThreshold: 0.6, reviewThreshold: 0.35 },
  resolveEndpoint(env: ProviderEnv): string {
    return readEnv(env, 'LAYA_ENDPOINT') ?? joinUrl(readEnv(env, 'LAYA_BASE_URL') ?? DEFAULT_BASE_URL, SYSTEM_ONE_PATH);
  },
  resolveModel(env: ProviderEnv): string { return readEnv(env, 'LAYA_MODEL') ?? DEFAULT_MODEL; },
  resolveApiKey(env: ProviderEnv): string | null { return readEnv(env, 'LAYA_API_KEY') ?? null; },
};

import {
  DecisionProviderRegistry,
  PROVIDER_SELECTION_KEY,
  SystemOneClient,
  resolveDecisionProvider,
  type ProviderEnv,
  type SystemOneClientOptions,
} from '@sysone/decision-core';
import { jevProvider } from '@sysone/provider-jev';
import { layaProvider } from '@sysone/provider-laya';

export const LAB_PROVIDER_DEFINITIONS = [jevProvider, layaProvider] as const;
export const LAB_PROVIDER_IDS = LAB_PROVIDER_DEFINITIONS.map((provider) => provider.id);
export const DEFAULT_LAB_PROVIDER_ID = jevProvider.id;
export const labProviderRegistry = new DecisionProviderRegistry(LAB_PROVIDER_DEFINITIONS);

/** Concrete provider choice belongs to this executable application. */
export function resolveLabProvider(env: ProviderEnv = process.env) {
  return resolveDecisionProvider({
    env,
    registry: labProviderRegistry,
    providerName: env[PROVIDER_SELECTION_KEY]?.trim() || DEFAULT_LAB_PROVIDER_ID,
  });
}

export type LabDecisionClientOptions = Omit<SystemOneClientOptions, 'provider'>;

export function createLabDecisionClient(options: LabDecisionClientOptions = {}): SystemOneClient {
  const env = options.env ?? process.env;
  return new SystemOneClient({ ...options, env, provider: resolveLabProvider(env) });
}

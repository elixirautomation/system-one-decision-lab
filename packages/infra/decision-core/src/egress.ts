/**
 * Data-egress consent.
 *
 * Consent is a property of the resolved endpoint, never of the engine's name. A
 * self-hosted engine on loopback sends nothing off the machine; the same engine
 * pointed at a hosted deployment is egress exactly like a SaaS API. Keeping this
 * derivation in one module prevents it from degrading into a per-provider
 * boolean somewhere downstream.
 */
import type { ProviderEnv, ResolvedDecisionProvider } from './contract.js';

export const EGRESS_CONSENT_KEY = 'ALLOW_DECISION_DATA_EGRESS';

export function dataEgressAllowed(env: ProviderEnv): boolean {
  return env[EGRESS_CONSENT_KEY] === 'true';
}

export class EgressConsentError extends Error {
  constructor(provider: Pick<ResolvedDecisionProvider, 'label' | 'endpoint' | 'capabilities'>) {
    const localAlternative = provider.capabilities.selfHostable
      ? ` ${provider.label} can also be served locally, which needs no consent.`
      : '';
    super(
      `${provider.label} is configured at a remote endpoint (${provider.endpoint}), so failure ` +
        `evidence would leave this machine. Set ${EGRESS_CONSENT_KEY}=true to consent, or select a ` +
        `self-hostable provider.${localAlternative}`,
    );
    this.name = 'EgressConsentError';
  }
}

export function assertDataEgressAllowed(
  provider: ResolvedDecisionProvider,
  env: ProviderEnv,
): void {
  if (!provider.requiresEgressConsent) return;
  if (dataEgressAllowed(env)) return;
  throw new EgressConsentError(provider);
}

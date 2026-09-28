/**
 * Generic provider resolution.
 *
 * This module contains no engine-specific knowledge. It looks the requested
 * provider up in the registry, asks the definition for its endpoint, model and
 * credential, derives the endpoint scope, enforces the requirements the
 * definition itself declared, and merges the gate defaults with any
 * environment overrides.
 *
 * Because requirement levels are data, a key that is mandatory for one engine
 * and optional for another is enforced correctly without this file knowing
 * which engine it is resolving.
 */
import {
  type DecisionProviderDefinition,
  type ProviderEnv,
  type ProviderEnvKey,
  type ResolvedDecisionProvider,
} from './contract.js';
import { classifyEndpointScope, type EndpointScope } from './endpoint-scope.js';
import { resolveGateThresholds } from './gate.js';
import { DecisionProviderRegistry } from './registry.js';

export const PROVIDER_SELECTION_KEY = 'DECISION_PROVIDER';

export interface MissingProviderRequirement {
  readonly provider: string;
  readonly key: ProviderEnvKey;
  readonly reason: string;
}

export class ProviderConfigurationError extends Error {
  constructor(readonly missing: readonly MissingProviderRequirement[]) {
    const lines = missing.map((item) => `  ${item.key.name} — ${item.key.purpose} (${item.reason})`);
    super(
      `Provider "${missing[0]?.provider}" is missing required configuration:\n${lines.join('\n')}`,
    );
    this.name = 'ProviderConfigurationError';
  }
}

/** Whether a declared key must be present given the resolved endpoint scope. */
function isMandatory(key: ProviderEnvKey, scope: EndpointScope): boolean {
  if (key.requirement === 'required') return true;
  return key.requirement === 'required-when-remote' && scope === 'remote';
}

function reasonFor(key: ProviderEnvKey): string {
  return key.requirement === 'required-when-remote'
    ? 'required because the resolved endpoint is remote'
    : 'required for this provider';
}

/**
 * Collects every unmet requirement instead of throwing on the first one, so an
 * operator sees the whole gap in a single message.
 */
export function findMissingRequirements(
  definition: DecisionProviderDefinition,
  env: ProviderEnv,
  scope: EndpointScope,
): MissingProviderRequirement[] {
  const resolvedApiKey = definition.resolveApiKey(env);
  return definition.envKeys
    .filter((key) => isMandatory(key, scope))
    .filter((key) => {
      // A credential may legitimately be satisfied by the definition's own
      // fallback chain rather than by this exact variable name.
      if (key.secret && resolvedApiKey) return false;
      return !env[key.name]?.trim();
    })
    .map((key) => ({ provider: definition.id, key, reason: reasonFor(key) }));
}

export interface ResolveOptions {
  readonly env?: ProviderEnv;
  readonly registry: DecisionProviderRegistry;
  readonly providerName: string;
}

/** Resolves a definition against an environment, without enforcing requirements. */
function resolveAgainst(
  definition: DecisionProviderDefinition,
  env: ProviderEnv,
): ResolvedDecisionProvider {
  const endpoint = definition.resolveEndpoint(env);
  const endpointScope = classifyEndpointScope(endpoint);

  return {
    id: definition.id,
    label: definition.label,
    endpoint,
    endpointScope,
    model: definition.resolveModel(env),
    apiKey: definition.resolveApiKey(env),
    requiresEgressConsent: endpointScope === 'remote',
    capabilities: definition.capabilities,
    ...resolveGateThresholds(definition.gateDefaults, env),
  };
}

/**
 * Resolves the selected provider without enforcing requirements, for callers
 * that only need to describe the configuration (help output, diagnostics).
 */
export function describeDecisionProvider(options: ResolveOptions): ResolvedDecisionProvider {
  const env = options.env ?? process.env;
  return resolveAgainst(options.registry.require(options.providerName), env);
}

/**
 * Resolves the selected provider and fails closed when the provider's own
 * declared requirements are unmet.
 */
export function resolveDecisionProvider(options: ResolveOptions): ResolvedDecisionProvider {
  const env = options.env ?? process.env;
  const definition = options.registry.require(options.providerName);
  const resolved = resolveAgainst(definition, env);
  const missing = findMissingRequirements(definition, env, resolved.endpointScope);
  if (missing.length > 0) throw new ProviderConfigurationError(missing);
  return resolved;
}

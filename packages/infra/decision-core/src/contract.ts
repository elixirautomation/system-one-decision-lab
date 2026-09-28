/**
 * The global contract every decision provider implements.
 *
 * Design intent: adding an engine must not require editing the resolver, the
 * transport, the confidence gate, the persistence layer, or the report. A
 * provider is exactly one `DecisionProviderDefinition` registered in
 * `registry.ts`, and every downstream module depends on this contract rather
 * than on any concrete engine.
 *
 * Requirements are declared, not hardcoded. A key that is mandatory for one
 * engine and meaningless for another is expressed through `requirement`, so the
 * generic resolver enforces each provider's own rules without knowing which
 * provider it is enforcing. The same applies to behavioural differences:
 * anything a consumer would otherwise branch on by provider id belongs in
 * `capabilities` or `gateDefaults` instead.
 */
import type { EndpointScope } from './endpoint-scope.js';

/** Environment read by a provider. Narrower than `NodeJS.ProcessEnv` by design. */
export type ProviderEnv = Readonly<Record<string, string | undefined>>;

/**
 * How strictly a declared key is enforced.
 *
 * `required`            Absent or blank is a configuration error.
 * `optional`            Absent is normal; the provider supplies a default.
 * `required-when-remote` Mandatory only once the resolved endpoint is off-host,
 *                       which is how a self-hostable engine can need no
 *                       credential locally and still refuse to talk to a hosted
 *                       deployment anonymously.
 */
export type EnvKeyRequirement = 'required' | 'optional' | 'required-when-remote';

export interface ProviderEnvKey {
  readonly name: string;
  readonly requirement: EnvKeyRequirement;
  /** One line explaining what the key controls, surfaced in error messages. */
  readonly purpose: string;
  /** Values that must never reach a log line, report, or committed artifact. */
  readonly secret?: boolean;
}

/**
 * Behavioural differences a consumer may legitimately need to know about,
 * declared once by the provider instead of being rediscovered through `id`
 * comparisons scattered across the codebase.
 */
export interface ProviderCapabilities {
  /** Can run on this host with no data egress at all. */
  readonly selfHostable: boolean;
  /**
   * Choice `confidence` is calibrated and independent of probability mass. When
   * false, gate on mass instead — the two are not interchangeable scales.
   */
  readonly calibratedChoiceConfidence: boolean;
  /** Reports which checkpoint answered via the optional `routing` block. */
  readonly reportsRouting: boolean;
  /** Emits a usage block with real token counts rather than zeros. */
  readonly reportsTokenUsage: boolean;
}

/** Which 0-1 field routes a Choice answer to act / review / escalate. */
export type ChoiceGate = 'confidence' | 'top_probability';

export interface GateThresholds {
  readonly choiceGate: ChoiceGate;
  /** At or above this, a category is acted on automatically. */
  readonly actThreshold: number;
  /** At or above this, a category is flagged for human review. */
  readonly reviewThreshold: number;
}

/**
 * One engine's declaration. Every member is either static metadata or a pure
 * function of the environment, so a definition is trivially testable and holds
 * no connection state.
 */
export interface DecisionProviderDefinition {
  /** Stable machine id. Persisted on every decision row. */
  readonly id: string;
  /** Display name used in reports and badges. */
  readonly label: string;
  /** Accepted alternative spellings for `DECISION_PROVIDER`. */
  readonly aliases?: readonly string[];
  readonly summary: string;
  readonly homepage: string;
  /** Every key this provider reads, with its own requirement level. */
  readonly envKeys: readonly ProviderEnvKey[];
  readonly capabilities: ProviderCapabilities;
  /**
   * Starting thresholds for this engine. They are documented defaults, not
   * values tuned against labelled triage data, and are overridable per
   * environment.
   */
  readonly gateDefaults: GateThresholds;
  resolveEndpoint(env: ProviderEnv): string;
  resolveModel(env: ProviderEnv): string;
  resolveApiKey(env: ProviderEnv): string | null;
}

/** A provider definition combined with the environment it was resolved against. */
export interface ResolvedDecisionProvider extends GateThresholds {
  readonly id: string;
  readonly label: string;
  readonly endpoint: string;
  readonly endpointScope: EndpointScope;
  readonly model: string;
  readonly apiKey: string | null;
  /** True when the endpoint is off this machine and needs explicit consent. */
  readonly requiresEgressConsent: boolean;
  readonly capabilities: ProviderCapabilities;
}

/** Joins a base URL and a path without duplicating the separator. */
export function joinUrl(base: string, path: string): string {
  return `${base.replace(/\/+$/, '')}${path}`;
}

/** Trimmed value, or undefined when unset or blank. */
export function readEnv(env: ProviderEnv, name: string): string | undefined {
  const value = env[name]?.trim();
  return value ? value : undefined;
}

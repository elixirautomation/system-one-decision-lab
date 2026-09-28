/**
 * Public surface of the decision module.
 *
 * Consumers import from here so they depend on the provider contract rather than
 * on any concrete engine module.
 */
export type {
  ChoiceGate,
  DecisionProviderDefinition,
  EnvKeyRequirement,
  GateThresholds,
  ProviderCapabilities,
  ProviderEnv,
  ProviderEnvKey,
  ResolvedDecisionProvider,
} from './contract.js';
export { joinUrl, readEnv } from './contract.js';
export { classifyEndpointScope, type EndpointScope } from './endpoint-scope.js';
export {
  assertDataEgressAllowed,
  dataEgressAllowed,
  EGRESS_CONSENT_KEY,
  EgressConsentError,
} from './egress.js';
export {
  choiceRoutingValue,
  GATE_ENV_KEYS,
  recommendAction,
  resolveGateThresholds,
  type RecommendedAction,
} from './gate.js';
export type {
  Answer,
  ChoiceAnswer,
  ChoiceQuestion,
  NoulAnswer,
  NoulQuestion,
  Question,
  QuestionType,
  ScoreAnswer,
  ScoreQuestion,
  SystemOneRequest,
  SystemOneResponse,
  TokenUsage,
} from './protocol.js';
export {
  DecisionProviderRegistry,
  DuplicateProviderError,
  UnknownProviderError,
  type DecisionProviderId,
} from './registry.js';
export {
  describeDecisionProvider,
  findMissingRequirements,
  PROVIDER_SELECTION_KEY,
  ProviderConfigurationError,
  resolveDecisionProvider,
  type MissingProviderRequirement,
} from './resolve.js';
export {
  ExponentialBackoffRetryPolicy,
  NO_RETRY,
  type RetryPolicy,
} from './retry-policy.js';
export {
  createDecisionClient,
  SystemOneClient,
  SystemOneError,
  type SystemOneClientOptions,
} from './system-one-client.js';

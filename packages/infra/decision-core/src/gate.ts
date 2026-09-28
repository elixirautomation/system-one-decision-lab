/**
 * Confidence-gate policy: turning a Choice answer into a recommended action.
 *
 * This is decision policy, not triage. It lives beside the provider contract so
 * that the gate reads the provider's declared capability instead of comparing
 * engine names, and so callers other than failure triage can reuse it.
 */
import type { ChoiceGate, GateThresholds, ProviderEnv } from './contract.js';
import type { ChoiceAnswer } from './protocol.js';

export type RecommendedAction = 'auto_file' | 'flag_for_review' | 'escalate_to_human';

export const GATE_ENV_KEYS = {
  choiceGate: 'DECISION_CHOICE_GATE',
  actThreshold: 'DECISION_ACT_THRESHOLD',
  reviewThreshold: 'DECISION_REVIEW_THRESHOLD',
} as const;

function readThreshold(raw: string | undefined, fallback: number, name: string): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error(`${name} must be a number between 0 and 1; received "${raw}".`);
  }
  return value;
}

function readGate(raw: string | undefined, fallback: ChoiceGate): ChoiceGate {
  const value = raw?.trim();
  if (!value) return fallback;
  if (value === 'confidence' || value === 'top_probability') return value;
  throw new Error(
    `${GATE_ENV_KEYS.choiceGate} must be "confidence" or "top_probability"; received "${raw}".`,
  );
}

/**
 * The provider's defaults, with per-environment overrides applied. Overrides are
 * shared across engines deliberately: once an operator has labelled ground truth
 * they tune one active configuration, not a table of vendors.
 */
export function resolveGateThresholds(
  defaults: GateThresholds,
  env: ProviderEnv,
): GateThresholds {
  return {
    choiceGate: readGate(env[GATE_ENV_KEYS.choiceGate], defaults.choiceGate),
    actThreshold: readThreshold(
      env[GATE_ENV_KEYS.actThreshold],
      defaults.actThreshold,
      GATE_ENV_KEYS.actThreshold,
    ),
    reviewThreshold: readThreshold(
      env[GATE_ENV_KEYS.reviewThreshold],
      defaults.reviewThreshold,
      GATE_ENV_KEYS.reviewThreshold,
    ),
  };
}

/** The 0-1 value the configured gate routes on. */
export function choiceRoutingValue(answer: ChoiceAnswer, gate: ChoiceGate): number {
  if (gate === 'confidence') return answer.confidence;
  const probabilities = Object.values(answer.probabilities ?? {});
  return probabilities.length === 0 ? 0 : Math.max(...probabilities);
}

/** Thresholds are inclusive at their boundaries. */
export function recommendAction(
  value: number,
  thresholds: Pick<GateThresholds, 'actThreshold' | 'reviewThreshold'>,
): RecommendedAction {
  if (value >= thresholds.actThreshold) return 'auto_file';
  if (value >= thresholds.reviewThreshold) return 'flag_for_review';
  return 'escalate_to_human';
}

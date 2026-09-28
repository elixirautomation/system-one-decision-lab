import assert from 'node:assert/strict';
import test from 'node:test';
import {
  recommendAction,
  type ProviderEnv,
  type SystemOneClient,
  type SystemOneResponse,
} from '@sysone/decision-core';
import { resolveLabProvider } from '../composition/providers.js';
import { triageFailure } from './classify-failure.js';

function resolveDecisionProvider(options: { env?: ProviderEnv }) {
  return resolveLabProvider(options.env ?? {});
}
import type { FailedTestCase } from './types.js';

const PROVIDER_ENVS: Record<string, Record<string, string>> = {
  jev: { JEV_API_KEY: 'key' },
  laya: { DECISION_PROVIDER: 'laya' },
};

function fakeClient(response: SystemOneResponse, provider = 'jev'): SystemOneClient {
  const config = resolveDecisionProvider({ env: PROVIDER_ENVS[provider] });
  return {
    systemOne: async () => response,
    provider,
    providerLabel: config.label,
    config,
  } as unknown as SystemOneClient;
}

const failedTest: FailedTestCase = {
  testId: 'test-1',
  title: 'product listing renders with priced items',
  file: 'tests/login-flow.spec.ts',
  status: 'failed',
  retryCount: 1,
  durationMs: 31_000,
  errorMessage: 'locator.waitFor: Timeout 30000ms exceeded.',
  stackTraceExcerpt: 'at InventoryPage.goto',
  recentLogLines: ['navigating to inventory'],
};

function response(confidence: number, model = 'jev-latest'): SystemOneResponse {
  return {
    model,
    answers: {
      category: {
        type: 'choice',
        choice: 'flaky_test',
        probabilities: { flaky_test: confidence, product_bug: 1 - confidence },
        confidence,
      },
      is_timeout: { type: 'noul', noul: 0.95 },
      is_network_error: { type: 'noul', noul: 0.12 },
    },
    usage: { input_tokens: 128, output_tokens: 0 },
  };
}

test('high confidence recommends filing automatically', async () => {
  const result = await triageFailure(fakeClient(response(0.91)), failedTest);
  assert.equal(result.verdict.category, 'flaky_test');
  assert.equal(result.verdict.recommendedAction, 'auto_file');
  assert.equal(result.verdict.looksLikeTimeout, true);
  assert.equal(result.verdict.looksLikeNetworkError, false);
  assert.equal(result.verdict.routingSignal, 'confidence');
  assert.equal(result.provider, 'jev');
});

test('mid confidence is flagged for review', async () => {
  const result = await triageFailure(fakeClient(response(0.6)), failedTest);
  assert.equal(result.verdict.recommendedAction, 'flag_for_review');
});

test('low confidence escalates to a human', async () => {
  const result = await triageFailure(fakeClient(response(0.2)), failedTest);
  assert.equal(result.verdict.recommendedAction, 'escalate_to_human');
});

test('the verdict records which provider decided', async () => {
  const result = await triageFailure(fakeClient(response(0.88, 'laya-rl-agent'), 'laya'), failedTest);
  assert.equal(result.provider, 'laya');
  assert.equal(result.model, 'laya-rl-agent');
});

test('a provider without calibrated confidence is gated on probability mass', async () => {
  // Observed from laya 0.3.7 english on a real triage payload: the winning option
  // held 0.665 of the mass while confidence reported 0.080. Gating on confidence
  // would escalate a decision the probability mass says is merely uncertain.
  const uncalibrated: SystemOneResponse = {
    model: 'laya-rl-agent',
    answers: {
      category: {
        type: 'choice',
        choice: 'automation_bug',
        probabilities: { automation_bug: 0.6651, product_bug: 0.3349 },
        confidence: 0.0802,
      },
      is_timeout: { type: 'noul', noul: 0.9514 },
      is_network_error: { type: 'noul', noul: 0.1412 },
    },
    usage: { input_tokens: 730, output_tokens: 0 },
  };
  const result = await triageFailure(fakeClient(uncalibrated, 'laya'), failedTest);
  assert.equal(result.verdict.routingSignal, 'top_probability');
  assert.equal(result.verdict.routingValue, 0.6651);
  assert.equal(result.verdict.recommendedAction, 'auto_file');
  // The engine's own confidence is still preserved verbatim.
  assert.equal(result.verdict.categoryConfidence, 0.0802);
});

test('the gate a provider declares matches its confidence capability', () => {
  const jev = resolveDecisionProvider({ env: PROVIDER_ENVS.jev });
  const laya = resolveDecisionProvider({ env: PROVIDER_ENVS.laya });
  assert.equal(jev.capabilities.calibratedChoiceConfidence, true);
  assert.equal(jev.choiceGate, 'confidence');
  assert.equal(laya.capabilities.calibratedChoiceConfidence, false);
  assert.equal(laya.choiceGate, 'top_probability');
});

test('thresholds are inclusive at their boundaries', () => {
  const jev = resolveDecisionProvider({ env: PROVIDER_ENVS.jev });
  assert.equal(recommendAction(0.75, jev), 'auto_file');
  assert.equal(recommendAction(0.45, jev), 'flag_for_review');
  assert.equal(recommendAction(0.449, jev), 'escalate_to_human');
});

test('gate thresholds and signal are overridable per environment', () => {
  const tuned = resolveDecisionProvider({
    env: {
      DECISION_PROVIDER: 'laya',
      DECISION_CHOICE_GATE: 'confidence',
      DECISION_ACT_THRESHOLD: '0.3',
      DECISION_REVIEW_THRESHOLD: '0.15',
    },
  });
  assert.equal(tuned.choiceGate, 'confidence');
  assert.equal(recommendAction(0.31, tuned), 'auto_file');
  assert.equal(recommendAction(0.2, tuned), 'flag_for_review');
  assert.equal(recommendAction(0.1, tuned), 'escalate_to_human');
});

test('an out-of-range threshold is rejected rather than clamped', () => {
  assert.throws(
    () =>
      resolveDecisionProvider({ env: { DECISION_PROVIDER: 'laya', DECISION_ACT_THRESHOLD: '1.4' } }),
    /between 0 and 1/,
  );
});

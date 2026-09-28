/**
 * Failure triage: turns Playwright failure evidence into one bounded verdict.
 *
 * The taxonomy and the questions live here; the act/review/escalate gate lives in
 * `src/decision/gate.ts`, so this module never inspects which engine answered.
 */
import {
  choiceRoutingValue,
  recommendAction,
  type ChoiceAnswer,
  type DecisionProviderId,
  type NoulAnswer,
  type SystemOneClient,
  type TokenUsage,
} from '@sysone/decision-core';
import { TRIAGE_CATEGORIES, type FailedTestCase, type TriageVerdict } from './types.js';

/** A Noul above this reads as a positive signal for the report and the verdict. */
const NOUL_POSITIVE_THRESHOLD = 0.7;

type TriageQuestionId = 'category' | 'is_timeout' | 'is_network_error';

export interface TriageOutcome {
  verdict: TriageVerdict;
  provider: DecisionProviderId;
  model: string;
  usage: TokenUsage;
}

export async function triageFailure(
  client: SystemOneClient,
  test: FailedTestCase,
): Promise<TriageOutcome> {
  const response = await client.systemOne<TriageQuestionId>({
    state: {
      test_title: test.title,
      test_file: test.file,
      status: test.status,
      retry_count: test.retryCount,
      duration_ms: test.durationMs,
      error_message: test.errorMessage,
      stack_trace_excerpt: test.stackTraceExcerpt,
      recent_log_lines: test.recentLogLines,
    },
    questions: {
      category: {
        type: 'choice',
        instructions:
          'A Playwright end-to-end test failed. Select the most likely root-cause category from the evidence. ' +
          'Do not call a consistently failing product defect flaky merely because it failed in automation.',
        criteria: TRIAGE_CATEGORIES,
      },
      is_timeout: {
        type: 'noul',
        instructions:
          'Does the error or stack indicate a Playwright wait, assertion, navigation, or action timeout?',
      },
      is_network_error: {
        type: 'noul',
        instructions:
          'Does the evidence indicate DNS, connection, TLS, HTTP 5xx, or another network-level failure?',
      },
    },
  });

  const categoryAnswer = response.answers.category as ChoiceAnswer;
  const timeoutAnswer = response.answers.is_timeout as NoulAnswer;
  const networkAnswer = response.answers.is_network_error as NoulAnswer;
  const routingValue = choiceRoutingValue(categoryAnswer, client.config.choiceGate);

  return {
    verdict: {
      category: categoryAnswer.choice as TriageVerdict['category'],
      categoryConfidence: categoryAnswer.confidence,
      probabilities: categoryAnswer.probabilities,
      timeoutProbability: timeoutAnswer.noul,
      networkErrorProbability: networkAnswer.noul,
      looksLikeTimeout: timeoutAnswer.noul > NOUL_POSITIVE_THRESHOLD,
      looksLikeNetworkError: networkAnswer.noul > NOUL_POSITIVE_THRESHOLD,
      routingSignal: client.config.choiceGate,
      routingValue,
      recommendedAction: recommendAction(routingValue, client.config),
    },
    provider: client.provider,
    model: response.model,
    usage: response.usage,
  };
}

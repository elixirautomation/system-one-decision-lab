import type { DecisionProviderId, RecommendedAction, TokenUsage } from '@sysone/decision-core';

export interface IngestMetadata {
  app: string;
  projectConfiguration: string;
  squadName: string;
  branch: string;
}

export interface FailedTestCase {
  testId: string;
  title: string;
  file: string;
  status: string;
  retryCount: number;
  durationMs: number;
  errorMessage: string;
  stackTraceExcerpt: string;
  recentLogLines: string[];
}

export const TRIAGE_CATEGORIES = {
  product_bug: 'A genuine defect in the application under test; the feature is behaving incorrectly.',
  automation_bug: 'A defect in test code, selectors, assertions, waits, fixtures, or test data setup.',
  environment_issue: 'A dependency, third-party service, or target test environment is unavailable or unhealthy.',
  flaky_test: 'The test is non-deterministic and the same code can produce different outcomes or need retries.',
  infrastructure_failure: 'CI runner, DNS, network, TLS, container, or platform infrastructure failed.',
  unknown: 'The available evidence is insufficient to assign a category safely.',
} as const;

export type TriageCategory = keyof typeof TRIAGE_CATEGORIES;

export interface TriageVerdict {
  category: TriageCategory;
  categoryConfidence: number;
  probabilities: Record<string, number>;
  timeoutProbability: number;
  networkErrorProbability: number;
  looksLikeTimeout: boolean;
  looksLikeNetworkError: boolean;
  /**
   * Which field gated the action, and its value. Providers do not share a
   * confidence scale, so this is recorded alongside the outcome rather than being
   * inferred later from the category confidence.
   */
  routingSignal: 'confidence' | 'top_probability';
  routingValue: number;
  recommendedAction: RecommendedAction;
}

export interface TriagedFailure {
  test: FailedTestCase;
  metadata: IngestMetadata;
  verdict: TriageVerdict;
  decisionProvider: DecisionProviderId;
  model: string;
  usage: TokenUsage;
}

export interface DecisionRunManifest {
  schemaVersion: 1;
  runId: string;
  startedAt: string;
  completedAt: string;
  /**
   * This run's private Playwright output directory. Per-run so that concurrent
   * runs cannot clear each other's traces mid-flight.
   */
  outputDirectory: string;
  triageOutputPath: string | null;
  /**
   * `failed` means no failure was answered (engine down, misconfigured, or
   * refused); `partial` means some were. Both fail the run.
   */
  triageStatus: 'completed' | 'disabled' | 'partial' | 'failed' | 'not_needed';
  triageMessage?: string;
  /** Which engine answered, or null when triage was disabled or unnecessary. */
  decisionProvider: DecisionProviderId | null;
  ingestedRuns: Array<{
    id: string;
    projectName: string;
    projectConfiguration: string;
    testCount: number;
  }>;
  ingestionError?: string;
  /**
   * Repo-relative path of the decision report refreshed at the end of the run,
   * or null when the refresh was disabled or failed.
   */
  reportPath?: string | null;
}

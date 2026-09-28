import type { DataOrigin, DecisionProvider } from '@sysone/decision-store';
import type { FlakinessEvidenceStrength, FlakinessMetrics, TestCaseStatus } from '../ground-truth/flakiness.js';

export interface SourceRun {
  id: string;
  pipelineId: string;
  projectConfiguration: string;
  projectId: string;
  branch: string;
  commitSha: string | null;
  app: string | null;
  squadName: string | null;
  origin: DataOrigin;
  triggeredAt: Date;
  completedAt: Date | null;
}

export interface SourceCase {
  id: string;
  runId: string;
  testName: string;
  suiteName: string;
  status: TestCaseStatus;
  durationMs: number | null;
  retryCount: number;
  errorMessage: string | null;
  errorSignature: string | null;
  failureCategory: string | null;
  failureCategoryConfidence: number | null;
  sourceFile: string | null;
  projectId: string;
  projectConfiguration: string;
  executedAt: Date;
}

export interface SourceDecision {
  id: string;
  testCaseId: string | null;
  origin: DataOrigin;
  decisionType: string;
  projectId: string;
  projectConfiguration: string;
  suiteName: string;
  testName: string;
  provider: DecisionProvider;
  model: string;
  category: string | null;
  score: number | null;
  noul: number | null;
  confidence: number | null;
  recommendedAction: string | null;
  /** Which field the gate routed on, and its value. Persisted per decision. */
  routingSignal: string | null;
  routingValue: number | null;
  result: Record<string, unknown>;
  inputTokens: number;
  outputTokens: number;
  createdAt: Date;
}

export interface ReportSource {
  runs: SourceRun[];
  cases: SourceCase[];
  decisions: SourceDecision[];
}

export interface CurrentTestView {
  id: string;
  title: string;
  suiteName: string;
  sourceFile: string | null;
  projectConfiguration: string;
  status: TestCaseStatus;
  durationMs: number;
  retryCount: number;
  errorMessage: string | null;
  errorSignature: string | null;
  category: string | null;
  confidence: number | null;
  recommendedAction: string | null;
  model: string | null;
  /** True when a persisted model decision backs this row, not a deterministic value. */
  hasModelDecision: boolean;
  decisionProvider: DecisionProvider | null;
  probabilities: Record<string, number>;
}

export interface FailureClusterView {
  signature: string;
  count: number;
  category: string | null;
  hasModelDecision: boolean;
  decisionProvider: DecisionProvider | null;
  tests: string[];
}

export interface CurrentRunView {
  pipelineId: string;
  triggeredAt: string;
  completedAt: string | null;
  branch: string;
  commitSha: string | null;
  app: string | null;
  squadName: string | null;
  projectConfigurations: string[];
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  retryRecovered: number;
  passRate: number;
  durationMs: number;
  triaged: number;
  tests: CurrentTestView[];
  failureClusters: FailureClusterView[];
}

export interface TrendPoint {
  pipelineId: string;
  triggeredAt: string;
  total: number;
  passed: number;
  failed: number;
  skipped: number;
  passRate: number;
  durationMs: number;
}

export interface HistoricalIdentityView {
  identity: string;
  testName: string;
  suiteName: string;
  projectConfiguration: string;
  projectId: string;
  metrics: FlakinessMetrics;
  evidenceStrength: FlakinessEvidenceStrength;
  averageDurationMs: number;
  p95DurationMs: number;
  lastStatus: TestCaseStatus;
  lastExecutedAt: string;
  recentStatuses: Array<{ status: TestCaseStatus; retryCount: number }>;
  latestCategory: string | null;
  latestCategoryConfidence: number | null;
  latestCategoryFromModel: boolean;
  latestDecisionProvider: DecisionProvider | null;
  latestNoul: number | null;
  latestEvidenceScore: number | null;
}

export interface DashboardReport {
  schemaVersion: 1;
  generatedAt: string;
  /**
   * Display name for persisted decisions: the single provider's name when every
   * decision came from one engine, otherwise the neutral "System One".
   */
  decisionLabel: string;
  current: CurrentRunView | null;
  trend: TrendPoint[];
  identities: HistoricalIdentityView[];
  summary: {
    runCount: number;
    executionCount: number;
    identityCount: number;
    passRate: number;
    failedExecutions: number;
    flakyIdentities: number;
    decisionCount: number;
    decisionCoverage: number;
    categoryCounts: Record<string, number>;
    actionCounts: Record<string, number>;
    decisionTypeCounts: Record<string, number>;
    providerCounts: Record<string, number>;
  };
}

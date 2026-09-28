import { labProviderRegistry as providerRegistry } from '../composition/providers.js';
import {
  computeFlakinessMetrics,
  getFlakinessEvidenceStrength,
  type TestCaseStatus,
} from '../ground-truth/flakiness.js';
import type {
  CurrentRunView,
  CurrentTestView,
  DashboardReport,
  FailureClusterView,
  HistoricalIdentityView,
  ReportSource,
  SourceCase,
  SourceDecision,
  SourceRun,
  TrendPoint,
} from './model.js';

interface PipelineGroup {
  key: string;
  pipelineId: string;
  runs: SourceRun[];
  cases: SourceCase[];
  triggeredAt: Date;
}

function round(value: number, digits = 2): number {
  const multiplier = 10 ** digits;
  return Math.round(value * multiplier) / multiplier;
}

function identityKey(value: {
  projectId: string;
  suiteName: string;
  projectConfiguration: string;
  testName: string;
}): string {
  return [value.projectId, value.suiteName, value.projectConfiguration, value.testName].join('::');
}

function percentile(values: number[], percentileValue: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.max(0, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index] ?? 0;
}

function countBy(values: Array<string | null>): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const value of values) {
    if (!value) continue;
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}

function groupPipelines(source: ReportSource): PipelineGroup[] {
  const casesByRun = new Map<string, SourceCase[]>();
  for (const testCase of source.cases) {
    const existing = casesByRun.get(testCase.runId) ?? [];
    casesByRun.set(testCase.runId, [...existing, testCase]);
  }

  const grouped = new Map<string, PipelineGroup>();
  for (const run of source.runs) {
    const key = `${run.origin}::${run.pipelineId}`;
    const group = grouped.get(key) ?? {
      key,
      pipelineId: run.pipelineId,
      runs: [],
      cases: [],
      triggeredAt: run.triggeredAt,
    };
    group.runs.push(run);
    group.cases.push(...(casesByRun.get(run.id) ?? []));
    if (run.triggeredAt < group.triggeredAt) group.triggeredAt = run.triggeredAt;
    grouped.set(key, group);
  }
  return [...grouped.values()].sort((a, b) => b.triggeredAt.getTime() - a.triggeredAt.getTime());
}

function pipelineStats(group: PipelineGroup): TrendPoint {
  const passed = group.cases.filter((test) => test.status === 'passed').length;
  const failed = group.cases.filter((test) => test.status === 'failed').length;
  const skipped = group.cases.filter((test) => test.status === 'skipped').length;
  const executed = passed + failed;
  const completedTimes = group.runs.flatMap((run) => (run.completedAt ? [run.completedAt.getTime()] : []));
  const completedAt = completedTimes.length > 0 ? Math.max(...completedTimes) : group.triggeredAt.getTime();
  return {
    pipelineId: group.pipelineId,
    triggeredAt: group.triggeredAt.toISOString(),
    total: group.cases.length,
    passed,
    failed,
    skipped,
    passRate: executed === 0 ? 0 : round((passed * 100) / executed),
    durationMs: Math.max(0, completedAt - group.triggeredAt.getTime()),
  };
}

function latestDecisionBy(
  decisions: SourceDecision[],
  predicate: (decision: SourceDecision) => boolean,
): SourceDecision | undefined {
  return decisions
    .filter(predicate)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
}

function numericRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value).filter((entry): entry is [string, number] => typeof entry[1] === 'number'),
  );
}

function decisionProbabilities(decision: SourceDecision | undefined): Record<string, number> {
  if (!decision) return {};
  const direct = numericRecord(decision.result.probabilities);
  if (Object.keys(direct).length > 0) return direct;
  const answer = decision.result.answer;
  if (!answer || typeof answer !== 'object' || Array.isArray(answer)) return {};
  return numericRecord((answer as Record<string, unknown>).probabilities);
}

const NEUTRAL_DECISION_LABEL = 'System One';

/**
 * Display names come from the provider registry, so a newly registered engine is
 * labelled correctly in the report without editing this module.
 */
const PROVIDER_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  providerRegistry.list().map((provider) => [provider.id, provider.label]),
);

/** Display name for a single provider id; falls back to the neutral engine name. */
export function providerDisplayName(provider: string | null | undefined): string {
  if (!provider) return NEUTRAL_DECISION_LABEL;
  return PROVIDER_DISPLAY_NAMES[provider] ?? provider;
}

/**
 * One label for the whole report: the provider's own name when every persisted
 * decision came from a single engine, otherwise the neutral engine name so a
 * mixed database is never mislabelled as one vendor's output.
 */
export function decisionLabelFor(providerCounts: Record<string, number>): string {
  const providers = Object.keys(providerCounts);
  return providers.length === 1 ? providerDisplayName(providers[0]) : NEUTRAL_DECISION_LABEL;
}

function buildFailureClusters(tests: CurrentTestView[]): FailureClusterView[] {
  const clusters = new Map<string, FailureClusterView>();
  for (const test of tests.filter((item) => item.status === 'failed')) {
    const signature = test.errorSignature || test.errorMessage?.split('\n')[0]?.trim() || 'Unclassified failure';
    const cluster = clusters.get(signature) ?? {
      signature,
      count: 0,
      category: test.category,
      hasModelDecision: test.hasModelDecision,
      decisionProvider: test.decisionProvider,
      tests: [],
    };
    cluster.count += 1;
    cluster.tests = [...cluster.tests, test.title];
    if (!cluster.category && test.category) cluster.category = test.category;
    if (test.hasModelDecision) cluster.hasModelDecision = true;
    if (!cluster.decisionProvider && test.decisionProvider) cluster.decisionProvider = test.decisionProvider;
    clusters.set(signature, cluster);
  }
  return [...clusters.values()].sort((a, b) => b.count - a.count || a.signature.localeCompare(b.signature));
}

function buildCurrent(group: PipelineGroup | undefined, decisions: SourceDecision[]): CurrentRunView | null {
  if (!group) return null;
  const stats = pipelineStats(group);
  const decisionsByCase = new Map<string, SourceDecision[]>();
  for (const decision of decisions) {
    if (!decision.testCaseId) continue;
    const existing = decisionsByCase.get(decision.testCaseId) ?? [];
    decisionsByCase.set(decision.testCaseId, [...existing, decision]);
  }

  const tests: CurrentTestView[] = group.cases
    .map((test) => {
      const caseDecisions = decisionsByCase.get(test.id) ?? [];
      const decision = latestDecisionBy(caseDecisions, (item) => item.decisionType === 'failure_triage');
      return {
        id: test.id,
        title: test.testName,
        suiteName: test.suiteName,
        sourceFile: test.sourceFile,
        projectConfiguration: test.projectConfiguration,
        status: test.status,
        durationMs: test.durationMs ?? 0,
        retryCount: test.retryCount,
        errorMessage: test.errorMessage,
        errorSignature: test.errorSignature,
        category: decision?.category ?? test.failureCategory,
        confidence: decision?.confidence ?? test.failureCategoryConfidence,
        recommendedAction: decision?.recommendedAction ?? null,
        model: decision?.model ?? null,
        hasModelDecision: Boolean(decision),
        decisionProvider: decision?.provider ?? null,
        probabilities: decisionProbabilities(decision),
      };
    })
    .sort((a, b) => {
      const priority: Record<TestCaseStatus, number> = { failed: 0, skipped: 1, passed: 2 };
      return priority[a.status] - priority[b.status] || b.durationMs - a.durationMs;
    });

  const firstRun = group.runs[0];
  const completed = group.runs.flatMap((run) => (run.completedAt ? [run.completedAt] : []));
  return {
    pipelineId: group.pipelineId,
    triggeredAt: group.triggeredAt.toISOString(),
    completedAt:
      completed.length > 0
        ? new Date(Math.max(...completed.map((date) => date.getTime()))).toISOString()
        : null,
    branch: firstRun?.branch ?? 'unknown',
    commitSha: firstRun?.commitSha ?? null,
    app: firstRun?.app ?? null,
    squadName: firstRun?.squadName ?? null,
    projectConfigurations: [...new Set(group.runs.map((run) => run.projectConfiguration))].sort(),
    total: stats.total,
    passed: stats.passed,
    failed: stats.failed,
    skipped: stats.skipped,
    retryRecovered: tests.filter((test) => test.status === 'passed' && test.retryCount > 0).length,
    passRate: stats.passRate,
    durationMs: stats.durationMs,
    triaged: tests.filter((test) => test.category).length,
    tests,
    failureClusters: buildFailureClusters(tests),
  };
}

function buildIdentities(source: ReportSource): HistoricalIdentityView[] {
  const casesByIdentity = new Map<string, SourceCase[]>();
  for (const testCase of source.cases) {
    const key = identityKey(testCase);
    const existing = casesByIdentity.get(key) ?? [];
    casesByIdentity.set(key, [...existing, testCase]);
  }
  const decisionsByIdentity = new Map<string, SourceDecision[]>();
  for (const decision of source.decisions) {
    const key = identityKey(decision);
    const existing = decisionsByIdentity.get(key) ?? [];
    decisionsByIdentity.set(key, [...existing, decision]);
  }

  return [...casesByIdentity.entries()]
    .map(([identity, unsortedCases]) => {
      const cases = [...unsortedCases].sort((a, b) => b.executedAt.getTime() - a.executedAt.getTime());
      const latest = cases[0];
      if (!latest) throw new Error(`Identity ${identity} has no executions`);
      const window = cases.slice(0, 50);
      const metrics = computeFlakinessMetrics({
        statuses: window.map((test) => test.status),
        retryCounts: window.map((test) => test.retryCount),
      });
      const identityDecisions = decisionsByIdentity.get(identity) ?? [];
      const categoryDecision = latestDecisionBy(
        identityDecisions,
        (decision) => decision.decisionType === 'failure_triage' || decision.decisionType === 'root_cause_choice',
      );
      const noulDecision = latestDecisionBy(
        identityDecisions,
        (decision) => decision.decisionType === 'flakiness_noul',
      );
      const scoreDecision = latestDecisionBy(
        identityDecisions,
        (decision) => decision.decisionType === 'evidence_score',
      );
      const durations = window.flatMap((test) => (test.durationMs === null ? [] : [test.durationMs]));
      const latestCategorizedCase = cases.find((test) => test.failureCategory);

      return {
        identity,
        testName: latest.testName,
        suiteName: latest.suiteName,
        projectConfiguration: latest.projectConfiguration,
        projectId: latest.projectId,
        metrics,
        evidenceStrength: getFlakinessEvidenceStrength(
          window.map((test) => {
            const run = source.runs.find((candidate) => candidate.id === test.runId);
            return { status: test.status, retryCount: test.retryCount, commitSha: run?.commitSha };
          }),
        ),
        averageDurationMs: durations.length === 0 ? 0 : round(durations.reduce((sum, value) => sum + value, 0) / durations.length),
        p95DurationMs: percentile(durations, 95),
        lastStatus: latest.status,
        lastExecutedAt: latest.executedAt.toISOString(),
        recentStatuses: window.slice(0, 10).map((test) => ({
          status: test.status,
          retryCount: test.retryCount,
        })),
        latestCategory: categoryDecision?.category ?? latestCategorizedCase?.failureCategory ?? null,
        latestCategoryConfidence:
          categoryDecision?.confidence ?? latestCategorizedCase?.failureCategoryConfidence ?? null,
        latestCategoryFromModel: Boolean(categoryDecision),
        latestDecisionProvider:
          categoryDecision?.provider ?? noulDecision?.provider ?? scoreDecision?.provider ?? null,
        latestNoul: noulDecision?.noul ?? null,
        latestEvidenceScore: scoreDecision?.score ?? null,
      };
    })
    .sort((a, b) => b.metrics.flakinessScore - a.metrics.flakinessScore || b.p95DurationMs - a.p95DurationMs);
}

export function buildDashboardReport(source: ReportSource, generatedAt = new Date()): DashboardReport {
  const pipelineGroups = groupPipelines(source);
  const trend = pipelineGroups
    .slice(0, 30)
    .map(pipelineStats)
    .reverse();
  const identities = buildIdentities(source);
  const executed = source.cases.filter((test) => test.status !== 'skipped');
  const passed = executed.filter((test) => test.status === 'passed').length;
  const decisionIdentities = new Set(source.decisions.map(identityKey));
  const providerCounts = countBy(source.decisions.map((decision) => decision.provider));

  return {
    schemaVersion: 1,
    generatedAt: generatedAt.toISOString(),
    decisionLabel: decisionLabelFor(providerCounts),
    current: buildCurrent(pipelineGroups[0], source.decisions),
    trend,
    identities,
    summary: {
      runCount: pipelineGroups.length,
      executionCount: source.cases.length,
      identityCount: identities.length,
      passRate: executed.length === 0 ? 0 : round((passed * 100) / executed.length),
      failedExecutions: executed.filter((test) => test.status === 'failed').length,
      flakyIdentities: identities.filter((identity) => identity.metrics.isFlaky).length,
      decisionCount: source.decisions.length,
      decisionCoverage:
        identities.length === 0 ? 0 : round((decisionIdentities.size * 100) / identities.length),
      categoryCounts: countBy(source.decisions.map((decision) => decision.category)),
      actionCounts: countBy(source.decisions.map((decision) => decision.recommendedAction)),
      decisionTypeCounts: countBy(source.decisions.map((decision) => decision.decisionType)),
      providerCounts,
    },
  };
}

/**
 * Ground-truth flakiness algorithm: the deterministic reference formula for this lab.
 *
 * Do not "improve" or re-derive this casually — the whole point of Experiment 1 is to
 * compare the engine's Noul probability against a fixed, code-owned formula. If the
 * formula changes, change it deliberately and update its tests alongside it.
 *
 * Flakiness Score = max(flipRate, retryFlakeRate).
 * isFlaky requires: sampleSize >= minRunsRequired AND score >= threshold AND
 *                    (flipCount >= 2 OR retryFlakeCount >= 1)
 * The flipCount >= 2 guard means a single monotonic regression (PPPP -> FFFF) is never flaky.
 */

export type TestCaseStatus = 'passed' | 'failed' | 'skipped';

export interface FlakinessInput {
  /** Newest-first (or consistently oldest-first) statuses. */
  statuses: TestCaseStatus[];
  /** Retry count per execution, index-aligned with statuses. */
  retryCounts?: number[];
}

export interface FlakinessMetrics {
  sampleSize: number;
  totalRuns: number;
  passCount: number;
  failCount: number;
  skippedCount: number;
  flipCount: number;
  flipRate: number;
  retryFlakeCount: number;
  retryFlakeRate: number;
  failureRate: number;
  flakinessScore: number;
  isFlaky: boolean;
  confidence: 'insufficient' | 'low' | 'moderate' | 'high';
}

export const DEFAULT_FLAKINESS_CONFIG = {
  flakinessThreshold: 25,
  minRunsRequired: 5,
  windowSize: 50,
};

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

export function countStatusFlips(statuses: TestCaseStatus[]): number {
  let flips = 0;
  let previous: TestCaseStatus | null = null;
  for (const status of statuses) {
    if (status === 'skipped') continue;
    if (previous !== null && status !== previous) flips++;
    previous = status;
  }
  return flips;
}

export function getFlakinessConfidence(
  sampleSize: number,
  minRunsRequired = DEFAULT_FLAKINESS_CONFIG.minRunsRequired,
): FlakinessMetrics['confidence'] {
  if (sampleSize < minRunsRequired) return 'insufficient';
  if (sampleSize < 10) return 'low';
  if (sampleSize < 30) return 'moderate';
  return 'high';
}

export function computeFlakinessMetrics(
  input: FlakinessInput,
  config: Partial<typeof DEFAULT_FLAKINESS_CONFIG> = {},
): FlakinessMetrics {
  const { flakinessThreshold, minRunsRequired } = { ...DEFAULT_FLAKINESS_CONFIG, ...config };
  const { statuses, retryCounts } = input;

  let passCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  let retryFlakeCount = 0;

  for (let index = 0; index < statuses.length; index++) {
    const status = statuses[index];
    if (status === 'passed') {
      passCount++;
      if ((retryCounts?.[index] ?? 0) > 0) retryFlakeCount++;
    } else if (status === 'failed') {
      failCount++;
    } else {
      skippedCount++;
    }
  }

  const totalRuns = statuses.length;
  const sampleSize = passCount + failCount;
  const flipCount = countStatusFlips(statuses);

  const flipRate = sampleSize > 1 ? (flipCount * 100) / (sampleSize - 1) : 0;
  const retryFlakeRate = sampleSize > 0 ? (retryFlakeCount * 100) / sampleSize : 0;
  const failureRate = sampleSize > 0 ? (failCount * 100) / sampleSize : 0;
  const flakinessScore = roundToTwo(Math.max(flipRate, retryFlakeRate));

  const isFlaky =
    sampleSize >= minRunsRequired && flakinessScore >= flakinessThreshold && (flipCount >= 2 || retryFlakeCount >= 1);

  return {
    sampleSize,
    totalRuns,
    passCount,
    failCount,
    skippedCount,
    flipCount,
    flipRate: roundToTwo(flipRate),
    retryFlakeCount,
    retryFlakeRate: roundToTwo(retryFlakeRate),
    failureRate: roundToTwo(failureRate),
    flakinessScore,
    isFlaky,
    confidence: getFlakinessConfidence(sampleSize, minRunsRequired),
  };
}

/** Ordered evidence-strength classification: how strongly the history supports a flakiness verdict. */
export type FlakinessEvidenceStrength =
  | 'retry_recovered'
  | 'same_commit_instability'
  | 'cross_commit_instability'
  | 'insufficient';

export interface FlakinessEvidenceExecution {
  status: TestCaseStatus;
  retryCount?: number | null;
  commitSha?: string | null;
}

export function getFlakinessEvidenceStrength(
  executions: FlakinessEvidenceExecution[],
): FlakinessEvidenceStrength {
  if (executions.some((e) => e.status === 'passed' && (e.retryCount ?? 0) > 0)) {
    return 'retry_recovered';
  }

  const outcomesByCommit = new Map<string, Set<TestCaseStatus>>();
  for (const e of executions) {
    if (!e.commitSha || e.status === 'skipped') continue;
    const outcomes = outcomesByCommit.get(e.commitSha) ?? new Set<TestCaseStatus>();
    outcomes.add(e.status);
    outcomesByCommit.set(e.commitSha, outcomes);
  }
  if ([...outcomesByCommit.values()].some((o) => o.has('passed') && o.has('failed'))) {
    return 'same_commit_instability';
  }

  if (countStatusFlips(executions.map((e) => e.status)) >= 2) {
    return 'cross_commit_instability';
  }

  return 'insufficient';
}

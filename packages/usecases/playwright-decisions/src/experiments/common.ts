import { and, desc, eq } from 'drizzle-orm';
import {
  recordDecision,
  type Database,
  type DataOrigin,
  type DecisionProvider,
} from '@sysone/decision-store';
import { testCaseSubject } from '../db/decision-subject.js';
import { testCases, testRuns } from '../db/schema.js';
import type { TestCaseStatus } from '../ground-truth/flakiness.js';

export interface HistoricalExecution {
  testCaseId: string;
  status: TestCaseStatus;
  retryCount: number;
  executedAt: Date;
  branch: string;
  commitSha: string | null;
  errorMessage: string | null;
  errorSignature: string | null;
}

export interface TestHistory {
  projectId: string;
  projectConfiguration: string;
  suiteName: string;
  testName: string;
  origin: DataOrigin;
  executions: HistoricalExecution[];
}

export function requestedOrigin(args = process.argv.slice(2)): DataOrigin {
  return args.includes('--seed') ? 'synthetic_seed' : 'actual_run';
}

export async function loadHistories(db: Database, origin: DataOrigin): Promise<TestHistory[]> {
  const rows = await db
    .select({
      testCaseId: testCases.id,
      projectId: testCases.projectId,
      projectConfiguration: testCases.effectiveProjectConfiguration,
      suiteName: testCases.suiteName,
      testName: testCases.testName,
      status: testCases.status,
      retryCount: testCases.retryCount,
      executedAt: testCases.executedAt,
      branch: testRuns.branch,
      commitSha: testRuns.commitSha,
      errorMessage: testCases.errorMessage,
      errorSignature: testCases.errorSignature,
    })
    .from(testCases)
    .innerJoin(testRuns, eq(testCases.testRunId, testRuns.id))
    .where(and(eq(testRuns.dataOrigin, origin), eq(testCases.projectId, testRuns.projectId)))
    .orderBy(desc(testCases.executedAt));

  const histories = new Map<string, TestHistory>();
  for (const row of rows) {
    const key = [row.projectId, row.suiteName, row.projectConfiguration, row.testName].join('::');
    const history = histories.get(key) ?? {
      projectId: row.projectId,
      projectConfiguration: row.projectConfiguration,
      suiteName: row.suiteName,
      testName: row.testName,
      origin,
      executions: [],
    };
    history.executions.push({
      testCaseId: row.testCaseId,
      status: row.status,
      retryCount: row.retryCount,
      executedAt: row.executedAt,
      branch: row.branch,
      commitSha: row.commitSha,
      errorMessage: row.errorMessage,
      errorSignature: row.errorSignature,
    });
    histories.set(key, history);
  }
  return [...histories.values()];
}

export function requireHistories(histories: TestHistory[], origin: DataOrigin): void {
  if (histories.length > 0) return;
  const command = origin === 'actual_run' ? 'yarn e2e' : 'yarn seed';
  throw new Error(`No ${origin} history found. Run ${command} first.`);
}

export async function persistHistoricalDecision(
  db: Database,
  history: TestHistory,
  input: {
    decisionType: 'flakiness_noul' | 'root_cause_choice' | 'evidence_score';
    provider: DecisionProvider;
    model: string;
    category?: string;
    score?: number;
    noul?: number;
    confidence?: number;
    result: Record<string, unknown>;
    usage: { input_tokens: number; output_tokens: number };
  },
): Promise<void> {
  await recordDecision(db, {
    subject: testCaseSubject(history, history.executions[0]?.testCaseId),
    dataOrigin: history.origin,
    decisionType: input.decisionType,
    provider: input.provider,
    model: input.model,
    category: input.category,
    score: input.score,
    noul: input.noul,
    confidence: input.confidence,
    result: input.result,
    usage: input.usage,
  });
}

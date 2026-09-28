import { desc } from 'drizzle-orm';
import { decisions, type Database } from '@sysone/decision-store';
import { readTestIdentity } from '../db/decision-subject.js';
import { testCases, testRuns } from '../db/schema.js';
import type { ReportSource } from './model.js';

export async function loadReportSource(db: Database): Promise<ReportSource> {
  const [runRows, caseRows, decisionRows] = await Promise.all([
    db.select().from(testRuns).orderBy(desc(testRuns.triggeredAt)),
    db.select().from(testCases).orderBy(desc(testCases.executedAt)),
    db.select().from(decisions).orderBy(desc(decisions.createdAt)),
  ]);

  return {
    runs: runRows.map((run) => ({
      id: run.id,
      pipelineId: run.pipelineId,
      projectConfiguration: run.projectConfiguration,
      projectId: run.projectId,
      branch: run.branch,
      commitSha: run.commitSha,
      app: run.app,
      squadName: run.squadName,
      origin: run.dataOrigin,
      triggeredAt: run.triggeredAt,
      completedAt: run.completedAt,
    })),
    cases: caseRows.map((test) => ({
      id: test.id,
      runId: test.testRunId,
      testName: test.testName,
      suiteName: test.suiteName,
      status: test.status,
      durationMs: test.durationMs,
      retryCount: test.retryCount,
      errorMessage: test.errorMessage,
      errorSignature: test.errorSignature,
      failureCategory: test.failureCategory,
      failureCategoryConfidence: test.failureCategoryConfidence,
      sourceFile: test.sourceFile,
      projectId: test.projectId,
      projectConfiguration: test.effectiveProjectConfiguration,
      executedAt: test.executedAt,
    })),
    decisions: decisionRows.map((decision) => {
      // The shared table stores logical identity as subject keys, so it is mapped
      // back here, at the single boundary between infra's row shape and this
      // use case's report model. Everything downstream is unchanged.
      const identity = readTestIdentity(decision.subjectKeys);
      return {
        id: decision.id,
        testCaseId: decision.subjectId,
        origin: decision.dataOrigin,
        decisionType: decision.decisionType,
        projectId: identity.projectId,
        projectConfiguration: identity.projectConfiguration,
        suiteName: identity.suiteName,
        testName: identity.testName,
        provider: decision.provider,
        model: decision.model,
        category: decision.category,
        score: decision.score,
        noul: decision.noul,
        confidence: decision.confidence,
        recommendedAction: decision.recommendedAction,
        routingSignal: decision.routingSignal,
        routingValue: decision.routingValue,
        result: decision.result,
        inputTokens: decision.inputTokens,
        outputTokens: decision.outputTokens,
        createdAt: decision.createdAt,
      };
    }),
  };
}

import { randomUUID } from 'node:crypto';
import { recordDecision, type Database } from '@sysone/decision-store';
import { testCaseSubject } from './decision-subject.js';
import type { CapturedTestResult, IngestRunInput, IngestedRun } from './ingestion-types.js';
import { testCases, testRuns } from './schema.js';

const MAX_METADATA_LENGTH = 100;

function cleanMetadata(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned ? cleaned.slice(0, MAX_METADATA_LENGTH) : undefined;
}

/**
 * One persisted run per Playwright project. Every project is persisted,
 * including `setup`: a failed login is evidence the lab should triage.
 */
export function groupIngestibleTests(tests: CapturedTestResult[]): Map<string, CapturedTestResult[]> {
  const grouped = new Map<string, CapturedTestResult[]>();
  for (const test of tests) {
    const existing = grouped.get(test.projectName) ?? [];
    grouped.set(test.projectName, [...existing, test]);
  }
  return grouped;
}

export async function ingestActualPlaywrightRun(db: Database, input: IngestRunInput): Promise<IngestedRun[]> {
  const groups = groupIngestibleTests(input.tests);
  const decisionByTestId = new Map(input.decisions.map((decision) => [decision.testId, decision]));

  return db.transaction(async (transaction) => {
    const ingestedRuns: IngestedRun[] = [];

    for (const [projectName, tests] of groups) {
      if (tests.length === 0) continue;

      const passedTests = tests.filter((test) => test.status === 'passed').length;
      const failedTests = tests.filter((test) => test.status === 'failed').length;
      const skippedTests = tests.filter((test) => test.status === 'skipped').length;
      const executedTests = passedTests + failedTests;
      const projectConfiguration = `${input.metadata.projectConfiguration}:${projectName}`;

      const [run] = await transaction
        .insert(testRuns)
        .values({
          pipelineId: input.metadata.pipelineId,
          jobId: input.metadata.jobId,
          branch: cleanMetadata(input.metadata.branch) ?? 'unknown',
          commitSha: cleanMetadata(input.metadata.commitSha),
          projectId: cleanMetadata(input.metadata.projectId) ?? 'unknown',
          projectConfiguration,
          reportFormat: 'playwright',
          app: cleanMetadata(input.metadata.app),
          squadName: cleanMetadata(input.metadata.squadName),
          dataOrigin: 'actual_run',
          triggeredAt: input.metadata.triggeredAt,
          completedAt: input.metadata.completedAt,
          totalTests: tests.length,
          passedTests,
          failedTests,
          skippedTests,
          passRate: executedTests === 0 ? 0 : (passedTests * 100) / executedTests,
        })
        .returning({ id: testRuns.id });

      if (!run) throw new Error(`Failed to create test run for Playwright project ${projectName}`);

      for (const test of tests) {
        const decision = decisionByTestId.get(test.testId);
        const category = decision?.verdict.category;
        const [testCase] = await transaction
          .insert(testCases)
          .values({
            id: randomUUID(),
            testRunId: run.id,
            testName: test.title,
            suiteName: test.suiteName,
            status: test.status,
            durationMs: test.durationMs,
            errorMessage: test.errorMessage,
            errorSignature: test.errorSignature,
            stackTrace: test.stackTrace,
            sourceFile: test.sourceFile,
            sourceLine: test.sourceLine,
            sourceColumn: test.sourceColumn,
            failureCategory: category && category !== 'unknown' ? category : undefined,
            failureCategorySource: decision?.provider,
            failureCategoryConfidence: decision?.verdict.categoryConfidence,
            failureAnalysis: decision
              ? {
                  verdict: decision.verdict,
                  provider: decision.provider,
                  model: decision.model,
                  usage: decision.usage,
                }
              : undefined,
            projectConfiguration,
            projectId: cleanMetadata(input.metadata.projectId) ?? 'unknown',
            effectiveProjectConfiguration: projectConfiguration,
            executedAt: input.metadata.completedAt,
            annotations: test.annotations,
            tags: test.tags,
            retryCount: test.retryCount,
          })
          .returning({ id: testCases.id });

        if (!testCase) throw new Error(`Failed to persist test case ${test.title}`);

        if (decision) {
          await recordDecision(transaction, {
            subject: testCaseSubject(
              {
                projectId: cleanMetadata(input.metadata.projectId) ?? 'unknown',
                projectConfiguration,
                suiteName: test.suiteName,
                testName: test.title,
              },
              testCase.id,
            ),
            dataOrigin: 'actual_run',
            decisionType: 'failure_triage',
            provider: decision.provider,
            model: decision.model,
            category: decision.verdict.category,
            confidence: decision.verdict.categoryConfidence,
            recommendedAction: decision.verdict.recommendedAction,
            routingSignal: decision.verdict.routingSignal,
            routingValue: decision.verdict.routingValue,
            result: { ...decision.verdict },
            usage: decision.usage,
          });
        }
      }

      ingestedRuns.push({
        id: run.id,
        projectName,
        projectConfiguration,
        testCount: tests.length,
      });
    }

    return ingestedRuns;
  });
}

import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { recommendAction } from '@sysone/decision-core';
import {
  DEFAULT_LAB_PROVIDER_ID,
  LAB_PROVIDER_IDS,
} from '../composition/providers.js';
import {
  decisions,
  recordDecisions,
  type DecisionInput,
  type DecisionProvider,
} from '@sysone/decision-store';
import { createLabDatabase as createDatabase } from '../composition/database.js';
import { testCaseSubject } from '../db/decision-subject.js';
import { testCases, testRuns } from '../db/schema.js';
import { SEED_TESTS } from './fixtures.js';

const RUN_COUNT = 40;
const PROJECT_ID = 'synthetic-setup-validation';
const PROJECT_CONFIGURATION = 'synthetic-seed:chromium';
/** Every registered engine, so each provider badge path is rendered by the seed. */
const SEED_PROVIDERS = LAB_PROVIDER_IDS;
/**
 * Fixed thresholds for the fixtures, routed through the real gate so the seeded
 * actions cannot drift from production behaviour.
 */
const SEED_GATE = { actThreshold: 0.75, reviewThreshold: 0.45 } as const;

/** The seed's subject, built through the same helper the real write paths use. */
function seedSubject(
  definition: { suiteName: string; testName: string },
  testCaseId: string,
): DecisionInput['subject'] {
  return testCaseSubject(
    {
      projectId: PROJECT_ID,
      projectConfiguration: PROJECT_CONFIGURATION,
      suiteName: definition.suiteName,
      testName: definition.testName,
    },
    testCaseId,
  );
}

const connection = createDatabase();

try {
  await connection.db.transaction(async (transaction) => {
    await transaction.delete(decisions).where(eq(decisions.dataOrigin, 'synthetic_seed'));
    await transaction.delete(testRuns).where(eq(testRuns.dataOrigin, 'synthetic_seed'));

    const now = Date.now();
    for (let runIndex = 0; runIndex < RUN_COUNT; runIndex += 1) {
      const triggeredAt = new Date(now - (RUN_COUNT - 1 - runIndex) * 60 * 60 * 1000);
      const executions = SEED_TESTS.map((test) => ({ test, ...test.execution(runIndex, RUN_COUNT) }));
      const passedTests = executions.filter((execution) => execution.status === 'passed').length;
      const failedTests = executions.filter((execution) => execution.status === 'failed').length;
      const skippedTests = executions.filter((execution) => execution.status === 'skipped').length;
      const executedTests = passedTests + failedTests;

      const [run] = await transaction
        .insert(testRuns)
        .values({
          pipelineId: `synthetic-seed-${runIndex}`,
          branch: 'synthetic',
          commitSha: `synthetic-commit-${Math.floor(runIndex / 2)}`,
          projectId: PROJECT_ID,
          projectConfiguration: PROJECT_CONFIGURATION,
          reportFormat: 'synthetic-seed',
          app: 'synthetic-decision-fixtures',
          squadName: 'local',
          dataOrigin: 'synthetic_seed',
          triggeredAt,
          completedAt: triggeredAt,
          totalTests: executions.length,
          passedTests,
          failedTests,
          skippedTests,
          passRate: executedTests === 0 ? 0 : (passedTests * 100) / executedTests,
        })
        .returning({ id: testRuns.id });

      if (!run) throw new Error(`Failed to create synthetic run ${runIndex}`);

      const persistedCases = await transaction
        .insert(testCases)
        .values(
          executions.map(({ test, status, retryCount }, testIndex) => ({
            id: randomUUID(),
            testRunId: run.id,
            testName: test.testName,
            suiteName: test.suiteName,
            status,
            durationMs: 100 + ((runIndex * 37 + testIndex * 53) % 2_900),
            errorMessage: status === 'failed' ? test.errorMessage : undefined,
            errorSignature: status === 'failed' ? test.errorSignature : undefined,
            failureCategory: status === 'failed' ? test.knownCategory : undefined,
            failureCategorySource: status === 'failed' ? 'seed_ground_truth' : undefined,
            projectConfiguration: PROJECT_CONFIGURATION,
            projectId: PROJECT_ID,
            effectiveProjectConfiguration: PROJECT_CONFIGURATION,
            executedAt: triggeredAt,
            annotations: [{ type: 'synthetic-seed' }],
            tags: ['synthetic', 'setup-validation'],
            retryCount,
          })),
        )
        .returning({ id: testCases.id, testName: testCases.testName, status: testCases.status });

      if (runIndex === RUN_COUNT - 1) {
        const definitions = new Map(SEED_TESTS.map((test) => [test.testName, test]));
        const decisionRows: DecisionInput[] = [];
        for (const [testIndex, persisted] of persistedCases.entries()) {
          const definition = definitions.get(persisted.testName);
          if (!definition) continue;
          const isFlaky = definition.knownCategory === 'flaky_test';
          // Cycle through every registered provider so a seeded report exercises
          // each badge path locally. The model name stays synthetic, so no row
          // claims a real engine answered.
          const seedProvider: DecisionProvider = SEED_PROVIDERS[testIndex % SEED_PROVIDERS.length] ?? DEFAULT_LAB_PROVIDER_ID;
          decisionRows.push({
            subject: seedSubject(definition, persisted.id),
            dataOrigin: 'synthetic_seed',
            decisionType: 'flakiness_noul',
            provider: seedProvider,
            model: 'synthetic-local-validator',
            noul: isFlaky ? 0.94 : 0.08,
            result: { noul: isFlaky ? 0.94 : 0.08, source: 'local-validation-seed' },
          });
          if (definition.knownCategory) {
            const confidence = [0.88, 0.64, 0.38][testIndex % 3] ?? 0.64;
            decisionRows.push({
              subject: seedSubject(definition, persisted.id),
              dataOrigin: 'synthetic_seed',
              decisionType: 'root_cause_choice',
              provider: seedProvider,
              model: 'synthetic-local-validator',
              category: definition.knownCategory,
              confidence,
              result: {
                choice: definition.knownCategory,
                confidence,
                source: 'local-validation-seed',
              },
            });
          }
          if (persisted.status === 'failed' && definition.knownCategory) {
            const confidence = [0.88, 0.64, 0.38][testIndex % 3] ?? 0.64;
            const recommendedAction = recommendAction(confidence, SEED_GATE);
            decisionRows.push({
              subject: seedSubject(definition, persisted.id),
              dataOrigin: 'synthetic_seed',
              decisionType: 'failure_triage',
              provider: seedProvider,
              model: 'synthetic-local-validator',
              category: definition.knownCategory,
              confidence,
              recommendedAction,
              result: {
                category: definition.knownCategory,
                categoryConfidence: confidence,
                probabilities: {
                  [definition.knownCategory]: confidence,
                  unknown: (1 - confidence) * 0.55,
                  other_category: (1 - confidence) * 0.45,
                },
                recommendedAction,
                source: 'local-validation-seed',
              },
            });
          }
          if (isFlaky) {
            decisionRows.push({
              subject: seedSubject(definition, persisted.id),
              dataOrigin: 'synthetic_seed',
              decisionType: 'evidence_score',
              provider: seedProvider,
              model: 'synthetic-local-validator',
              score: definition.testName.includes('cart') || definition.testName.includes('notification') ? 3 : 2,
              confidence: 0.86,
              result: {
                score: definition.testName.includes('cart') || definition.testName.includes('notification') ? 3 : 2,
                confidence: 0.86,
                source: 'local-validation-seed',
              },
            });
          }
        }
        await recordDecisions(transaction, decisionRows);
      }
    }
  });

  console.log(`Loaded ${RUN_COUNT} temporary local-validation runs (${RUN_COUNT * SEED_TESTS.length} cases).`);
  console.log('The seed includes deterministic decision fixtures so every report visualization can be inspected.');
  console.log('Run yarn clean before collecting real Playwright history.');
} finally {
  await connection.close();
}

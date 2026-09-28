import { createLabDatabase as createDatabase } from '../composition/database.js';
import { KNOWN_FLAKY } from '../data/fixtures.js';
import { computeFlakinessMetrics } from '../ground-truth/flakiness.js';
import { createLabDecisionClient as createDecisionClient } from '../composition/providers.js';
import { loadHistories, persistHistoricalDecision, requestedOrigin, requireHistories } from './common.js';

const FLAKY_PROBABILITY_THRESHOLD = 0.9;
const connection = createDatabase();

try {
  const origin = requestedOrigin();
  const histories = await loadHistories(connection.db, origin);
  requireHistories(histories, origin);
  const client = createDecisionClient();
  const rows: Array<Record<string, string | number | boolean>> = [];

  for (const history of histories) {
    const executions = history.executions.slice(0, 50);
    const baseline = computeFlakinessMetrics({
      statuses: executions.map((execution) => execution.status),
      retryCounts: executions.map((execution) => execution.retryCount),
    });
    const response = await client.systemOne<'is_flaky'>({
      state: {
        testName: history.testName,
        suiteName: history.suiteName,
        recentExecutions: executions.slice(0, 20).map((execution) => ({
          status: execution.status,
          retryCount: execution.retryCount,
          branch: execution.branch,
          commitSha: execution.commitSha,
        })),
      },
      questions: {
        is_flaky: {
          type: 'noul',
          instructions:
            'Does this execution history show non-determinism: outcome changes without a stable regression, ' +
            'or a pass that required retries? A consistently failing test is not flaky.',
        },
      },
    });
    const answer = response.answers.is_flaky;
    if (answer.type !== 'noul') {
      throw new Error(`${client.providerLabel} returned a non-Noul answer for is_flaky`);
    }
    const modelSaysFlaky = answer.noul >= FLAKY_PROBABILITY_THRESHOLD;

    await persistHistoricalDecision(connection.db, history, {
      decisionType: 'flakiness_noul',
      provider: client.provider,
      model: response.model,
      noul: answer.noul,
      result: { answer, deterministicBaseline: baseline, provider: client.provider },
      usage: response.usage,
    });

    rows.push({
      test: history.testName.slice(0, 42),
      samples: baseline.sampleSize,
      deterministicScore: baseline.flakinessScore,
      deterministicFlaky: baseline.isFlaky,
      modelProbability: answer.noul.toFixed(3),
      modelFlaky: modelSaysFlaky,
      agrees: modelSaysFlaky === baseline.isFlaky,
      ...(origin === 'synthetic_seed'
        ? { seedLabel: KNOWN_FLAKY.get(history.testName) ?? false }
        : {}),
    });
  }

  console.log(`\nNoul flakiness experiment · ${client.providerLabel} · ${origin}`);
  console.table(rows);
  const agreement = rows.filter((row) => row.agrees).length / rows.length;
  console.log(`Agreement with deterministic baseline: ${(agreement * 100).toFixed(1)}%`);
  console.log('Decisions persisted to the decisions table.');
} finally {
  await connection.close();
}

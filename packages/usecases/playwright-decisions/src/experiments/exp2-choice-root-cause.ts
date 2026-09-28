import { createLabDatabase as createDatabase } from '../composition/database.js';
import { KNOWN_CATEGORY } from '../data/fixtures.js';
import { TRIAGE_CATEGORIES } from '../triage/types.js';
import { createLabDecisionClient as createDecisionClient } from '../composition/providers.js';
import { loadHistories, persistHistoricalDecision, requestedOrigin, requireHistories } from './common.js';

const connection = createDatabase();

try {
  const origin = requestedOrigin();
  const histories = await loadHistories(connection.db, origin);
  requireHistories(histories, origin);
  const failures = histories.flatMap((history) => {
    const failure = history.executions.find((execution) => execution.status === 'failed');
    return failure ? [{ history, failure }] : [];
  });
  if (failures.length === 0) throw new Error(`No failed tests found in ${origin} history.`);

  const client = createDecisionClient();
  const rows: Array<Record<string, string | number | boolean>> = [];

  for (const { history, failure } of failures) {
    const response = await client.systemOne<'root_cause'>({
      state: {
        testName: history.testName,
        suiteName: history.suiteName,
        errorMessage: failure.errorMessage,
        errorSignature: failure.errorSignature,
        retryCount: failure.retryCount,
        recentOutcomes: history.executions.slice(0, 10).map((execution) => ({
          status: execution.status,
          retryCount: execution.retryCount,
          commitSha: execution.commitSha,
        })),
      },
      questions: {
        root_cause: {
          type: 'choice',
          instructions: 'Select the most likely failure category from the available evidence.',
          criteria: TRIAGE_CATEGORIES,
        },
      },
    });
    const answer = response.answers.root_cause;
    if (answer.type !== 'choice') {
      throw new Error(`${client.providerLabel} returned a non-Choice answer for root_cause`);
    }
    const seedLabel = origin === 'synthetic_seed' ? KNOWN_CATEGORY.get(history.testName) : undefined;

    await persistHistoricalDecision(connection.db, history, {
      decisionType: 'root_cause_choice',
      provider: client.provider,
      model: response.model,
      category: answer.choice,
      confidence: answer.confidence,
      result: { answer, provider: client.provider },
      usage: response.usage,
    });

    rows.push({
      test: history.testName.slice(0, 42),
      category: answer.choice,
      confidence: answer.confidence.toFixed(3),
      ...(seedLabel ? { seedLabel, correct: answer.choice === seedLabel } : {}),
    });
  }

  console.log(`\nChoice root-cause experiment · ${client.providerLabel} · ${origin}`);
  console.table(rows);
  if (origin === 'synthetic_seed') {
    const labelled = rows.filter((row) => 'correct' in row);
    const accuracy = labelled.filter((row) => row.correct).length / labelled.length;
    console.log(`Accuracy against synthetic labels: ${(accuracy * 100).toFixed(1)}%`);
  } else {
    console.log('Actual runs have no independent labels by default; decisions are persisted for human review.');
  }
  console.log('Decisions persisted to the decisions table.');
} finally {
  await connection.close();
}

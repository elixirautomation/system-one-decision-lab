import { createLabDatabase as createDatabase } from '../composition/database.js';
import {
  computeFlakinessMetrics,
  getFlakinessEvidenceStrength,
  type FlakinessEvidenceStrength,
} from '../ground-truth/flakiness.js';
import { createLabDecisionClient as createDecisionClient } from '../composition/providers.js';
import { loadHistories, persistHistoricalDecision, requestedOrigin, requireHistories } from './common.js';

const STRENGTH_RANK: Record<FlakinessEvidenceStrength, number> = {
  insufficient: 0,
  cross_commit_instability: 1,
  same_commit_instability: 2,
  retry_recovered: 3,
};

const connection = createDatabase();

try {
  const origin = requestedOrigin();
  const histories = await loadHistories(connection.db, origin);
  requireHistories(histories, origin);
  const flakyHistories = histories.filter((history) => {
    const executions = history.executions.slice(0, 50);
    return computeFlakinessMetrics({
      statuses: executions.map((execution) => execution.status),
      retryCounts: executions.map((execution) => execution.retryCount),
    }).isFlaky;
  });
  if (flakyHistories.length === 0) {
    throw new Error(`No deterministically flaky identities found in ${origin} history; at least five runs are required.`);
  }

  const client = createDecisionClient();
  const rows: Array<Record<string, string | number>> = [];

  for (const history of flakyHistories) {
    const executions = history.executions.slice(0, 50);
    const baselineStrength = getFlakinessEvidenceStrength(
      executions.map((execution) => ({
        status: execution.status,
        retryCount: execution.retryCount,
        commitSha: execution.commitSha,
      })),
    );
    const response = await client.systemOne<'evidence_strength'>({
      state: {
        testName: history.testName,
        recentExecutions: executions.slice(0, 20).map((execution) => ({
          status: execution.status,
          retryCount: execution.retryCount,
          commitSha: execution.commitSha,
        })),
      },
      questions: {
        evidence_strength: {
          type: 'score',
          instructions:
            'Score how strongly this history supports a flaky classification. Retry recovery is strongest, ' +
            'mixed outcomes on one commit are next, and cross-commit-only flips are weaker.',
          criteria: [
            'Insufficient evidence',
            'Cross-commit instability only',
            'Mixed outcomes on the same commit',
            'At least one retry-recovered pass',
          ],
        },
      },
    });
    const answer = response.answers.evidence_strength;
    if (answer.type !== 'score') {
      throw new Error(`${client.providerLabel} returned a non-Score answer for evidence_strength`);
    }

    await persistHistoricalDecision(connection.db, history, {
      decisionType: 'evidence_score',
      provider: client.provider,
      model: response.model,
      score: answer.score,
      confidence: answer.confidence,
      result: { answer, deterministicStrength: baselineStrength, provider: client.provider },
      usage: response.usage,
    });

    rows.push({
      test: history.testName.slice(0, 42),
      deterministicStrength: baselineStrength,
      deterministicRank: STRENGTH_RANK[baselineStrength],
      modelScore: answer.score.toFixed(2),
      confidence: answer.confidence.toFixed(3),
    });
  }

  console.log(`\nScore evidence-strength experiment · ${client.providerLabel} · ${origin}`);
  console.table(rows);
  console.log('Decisions persisted to the decisions table.');
} finally {
  await connection.close();
}

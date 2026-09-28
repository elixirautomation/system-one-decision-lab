import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { computeFlakinessMetrics, getFlakinessEvidenceStrength } from './flakiness.js';

describe('deterministic flakiness baseline', () => {
  it('does not misclassify one monotonic regression as flaky', () => {
    const metrics = computeFlakinessMetrics({
      statuses: ['passed', 'passed', 'passed', 'failed', 'failed', 'failed'],
    });

    assert.equal(metrics.flipCount, 1);
    assert.equal(metrics.isFlaky, false);
  });

  it('classifies repeated cross-run flips as flaky', () => {
    const metrics = computeFlakinessMetrics({
      statuses: ['passed', 'failed', 'passed', 'failed', 'passed'],
    });

    assert.equal(metrics.flipCount, 4);
    assert.equal(metrics.isFlaky, true);
  });

  it('treats a retry-recovered pass as direct flaky evidence', () => {
    const metrics = computeFlakinessMetrics({
      statuses: ['passed', 'passed', 'passed', 'passed', 'passed'],
      retryCounts: [1, 0, 0, 1, 0],
    });

    assert.equal(metrics.retryFlakeRate, 40);
    assert.equal(metrics.isFlaky, true);
    assert.equal(
      getFlakinessEvidenceStrength([
        { status: 'passed', retryCount: 1, commitSha: 'abc' },
        { status: 'passed', retryCount: 0, commitSha: 'abc' },
      ]),
      'retry_recovered',
    );
  });
});

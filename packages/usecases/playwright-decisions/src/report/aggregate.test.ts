import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildDashboardReport } from './aggregate.js';
import type { ReportSource, SourceCase, SourceRun } from './model.js';

const baseTime = new Date('2026-09-22T12:00:00Z');

function run(id: string, origin: SourceRun['origin'], hour: number): SourceRun {
  return {
    id,
    pipelineId: id,
    projectConfiguration: `${origin}:chromium`,
    projectId: origin,
    branch: 'main',
    commitSha: id,
    app: 'demo',
    squadName: 'quality',
    origin,
    triggeredAt: new Date(baseTime.getTime() + hour * 3_600_000),
    completedAt: new Date(baseTime.getTime() + hour * 3_600_000 + 10_000),
  };
}

function testCase(runId: string, origin: SourceRun['origin'], status: SourceCase['status']): SourceCase {
  return {
    id: `${runId}-${status}`,
    runId,
    testName: 'renders prices',
    suiteName: `tests/${origin}.spec.ts > prices`,
    status,
    durationMs: 500,
    retryCount: 0,
    errorMessage: status === 'failed' ? 'Timeout waiting for prices' : null,
    errorSignature: status === 'failed' ? 'TIMEOUT_PRICES' : null,
    failureCategory: null,
    failureCategoryConfidence: null,
    sourceFile: `tests/${origin}.spec.ts`,
    projectId: origin,
    projectConfiguration: `${origin}:chromium`,
    executedAt: baseTime,
  };
}

const source: ReportSource = {
  runs: [run('run-1', 'actual_run', 1), run('run-2', 'synthetic_seed', 2)],
  cases: [
    testCase('run-1', 'actual_run', 'passed'),
    testCase('run-2', 'synthetic_seed', 'failed'),
  ],
  decisions: [],
};

describe('dashboard report aggregation', () => {
  it('summarizes every persisted run without report-side dataset selection', () => {
    const report = buildDashboardReport(source, new Date('2026-09-22T15:00:00Z'));

    assert.equal(report.summary.runCount, 2);
    assert.equal(report.summary.executionCount, 2);
    assert.equal(report.summary.passRate, 50);
  });

  it('uses the latest persisted pipeline as the current tab', () => {
    const report = buildDashboardReport(source);

    assert.equal(report.current?.pipelineId, 'run-2');
    assert.equal(report.current?.failed, 1);
  });
});

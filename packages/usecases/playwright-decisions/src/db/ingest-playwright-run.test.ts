import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { groupIngestibleTests } from './ingest-playwright-run.js';
import type { CapturedTestResult } from './ingestion-types.js';

function captured(testId: string, projectName: string): CapturedTestResult {
  return {
    testId,
    projectName,
    title: `test ${testId}`,
    suiteName: `tests/example.spec.ts > suite`,
    status: 'passed',
    durationMs: 10,
    retryCount: 0,
    sourceFile: 'tests/example.spec.ts',
    annotations: [],
    tags: [],
  };
}

describe('groupIngestibleTests', () => {
  it('groups actual test results into one persisted run per Playwright project', () => {
    const grouped = groupIngestibleTests([
      captured('a', 'chromium-anonymous'),
      captured('b', 'chromium-anonymous'),
      captured('c', 'chromium-authenticated'),
    ]);

    assert.deepEqual([...grouped.keys()], ['chromium-anonymous', 'chromium-authenticated']);
    assert.equal(grouped.get('chromium-anonymous')?.length, 2);
  });

  it('persists the authentication setup project like any other', () => {
    const tests = [captured('setup', 'setup'), captured('actual', 'chromium-anonymous')];

    assert.deepEqual([...groupIngestibleTests(tests).keys()], ['setup', 'chromium-anonymous']);
  });
});

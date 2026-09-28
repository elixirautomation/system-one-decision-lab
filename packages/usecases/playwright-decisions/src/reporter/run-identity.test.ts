/**
 * Per-run output isolation is what keeps concurrent runs honest, so its contract
 * is pinned here.
 *
 * The bug it replaces: every run shared `test-results/`, Playwright clears
 * `outputDir` on start, so a second `playwright test` deleted the first one's
 * `.playwright-artifacts-*` and three `login-flow` tests that had already
 * passed failed at `browserContext.close` with a missing `.network` file. Those
 * fabricated failures were ingested and would have been triaged as real evidence.
 *
 * Two properties matter, and both are load-bearing:
 *   1. the id is stable within a process AND across the workers that inherit the
 *      environment -- otherwise a worker writes artifacts where the reporter is
 *      not looking;
 *   2. two runs never resolve the same directory.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  RUN_DIRECTORY_PREFIX,
  RUN_ID_ENV_KEY,
  resolveRunId,
  runOutputDirectory,
  TEST_RESULTS_ROOT,
} from './run-identity.js';

describe('per-run output isolation', () => {
  it('generates an id and publishes it for the workers to inherit', () => {
    const env: NodeJS.ProcessEnv = {};
    const runId = resolveRunId(env);

    assert.ok(runId.length > 0);
    assert.equal(env[RUN_ID_ENV_KEY], runId);
  });

  it('is stable across repeated resolution, as the workers re-evaluate the config', () => {
    const env: NodeJS.ProcessEnv = {};
    const first = resolveRunId(env);

    // A worker process: same environment, fresh config evaluation.
    assert.equal(resolveRunId(env), first);
    assert.equal(resolveRunId({ ...env }), first);
  });

  it('honours an id already set by the parent process', () => {
    const runId = 'fixed-run-id';
    assert.equal(resolveRunId({ [RUN_ID_ENV_KEY]: runId }), runId);
    assert.equal(resolveRunId({ [RUN_ID_ENV_KEY]: `  ${runId}  ` }), runId);
  });

  it('treats a blank id as absent rather than using an empty directory name', () => {
    const env: NodeJS.ProcessEnv = { [RUN_ID_ENV_KEY]: '   ' };
    const runId = resolveRunId(env);

    assert.notEqual(runId, '');
    assert.equal(env[RUN_ID_ENV_KEY], runId);
  });

  it('gives two runs different directories under test-results', () => {
    const first = runOutputDirectory(resolveRunId({}));
    const second = runOutputDirectory(resolveRunId({}));

    assert.notEqual(first, second);
    for (const directory of [first, second]) {
      assert.ok(directory.startsWith(`${TEST_RESULTS_ROOT}/${RUN_DIRECTORY_PREFIX}`), directory);
      // Never the shared root itself: that is the directory whose cleanup caused
      // one run to destroy another's traces.
      assert.notEqual(directory, TEST_RESULTS_ROOT);
    }
  });
});

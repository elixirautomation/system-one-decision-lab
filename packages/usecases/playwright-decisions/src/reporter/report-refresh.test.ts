/**
 * The automatic report refresh is part of finishing a run, so its contract is
 * unit-tested: never letting a render failure become
 * the run's verdict.
 *
 * The success path needs PostgreSQL and is covered by running `yarn e2e`; what
 * is asserted here is the behaviour that must hold with no database at all,
 * which is exactly the case that used to leave the operator with a stale report.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { refreshDecisionReport } from './report-refresh.js';

describe('decision report refresh', () => {
  it('reports an unreachable database instead of throwing at the reporter', async () => {
    const previous = process.env.DATABASE_URL;
    // Port 1 is never a PostgreSQL server, so this exercises the failure path
    // without depending on whether the lab's own database happens to be up.
    process.env.DATABASE_URL = 'postgres://nobody:nobody@127.0.0.1:1/decision_lab_absent';
    try {
      const result = await refreshDecisionReport();

      assert.equal(result.path, null);
      assert.ok(result.error, 'an unreachable database must be reported, not swallowed silently');
    } finally {
      if (previous === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = previous;
    }
  });
});

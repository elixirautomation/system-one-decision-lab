/**
 * The boolean knobs are configuration, so their parsing is part of the contract.
 *
 * `DECISION_TRIAGE_ENABLED=enabled` silently disabled triage for a whole run --
 * the manifest reported "is false" while `.env` plainly read `enabled`. Both
 * halves of the fix are pinned here: common spellings are honoured, and an
 * unrecognised value is reported instead of quietly turning a feature off.
 */
import assert from 'node:assert/strict';
import { describe, it, mock } from 'node:test';
import { envBoolean, ingestRequired, RUN_ENV_KEYS } from './run-environment.js';

const KEY = RUN_ENV_KEYS.triageEnabled;

describe('boolean environment knobs', () => {
  it('honours every reasonable spelling of on', () => {
    for (const value of ['true', 'TRUE', ' true ', '1', 'yes', 'on', 'enabled']) {
      assert.equal(envBoolean(KEY, false, { [KEY]: value }), true, `expected "${value}" to be on`);
    }
  });

  it('honours every reasonable spelling of off', () => {
    for (const value of ['false', 'FALSE', '0', 'no', 'off', 'disabled']) {
      assert.equal(envBoolean(KEY, true, { [KEY]: value }), false, `expected "${value}" to be off`);
    }
  });

  it('falls back when unset or blank', () => {
    assert.equal(envBoolean(KEY, true, {}), true);
    assert.equal(envBoolean(KEY, false, {}), false);
    assert.equal(envBoolean(KEY, true, { [KEY]: '   ' }), true);
  });

  it('warns on an unrecognised value rather than silently disabling a feature', () => {
    const warn = mock.method(console, 'warn', () => undefined);
    try {
      assert.equal(envBoolean(KEY, true, { [KEY]: 'yep-ish' }), true);
      assert.equal(warn.mock.callCount(), 1);
      assert.match(String(warn.mock.calls[0]?.arguments[0]), /not a recognised boolean/);
    } finally {
      warn.mock.restore();
    }
  });
});

describe('INGEST_REQUIRED', () => {
  it('is required by default', () => {
    assert.equal(ingestRequired({}), true);
    assert.equal(ingestRequired({ INGEST_REQUIRED: '' }), true);
  });

  it('can be relaxed explicitly', () => {
    assert.equal(ingestRequired({ INGEST_REQUIRED: 'false' }), false);
    assert.equal(ingestRequired({ INGEST_REQUIRED: 'true' }), true);
  });
});

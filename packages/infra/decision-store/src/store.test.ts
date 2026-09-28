import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { decisionValues } from './record.js';

describe('decision column mapping', () => {
  const base = {
    dataOrigin: 'actual_run',
    decisionType: 'failure_triage',
    provider: 'laya',
    model: 'laya-rl-agent',
    result: { category: 'automation_bug' },
  } as const;

  it('flattens a generic subject into persistence columns', () => {
    const values = decisionValues({
      ...base,
      subject: { type: 'example:item', id: 'item-1', label: 'group > item', keys: { group: 'lab' } },
    });
    assert.equal(values.subjectType, 'example:item');
    assert.equal(values.subjectId, 'item-1');
    assert.deepEqual(values.subjectKeys, { group: 'lab' });
  });

  it('requires provider identity from the caller', () => {
    const values = decisionValues({ ...base, subject: { type: 'x', label: 'y' } });
    assert.equal(values.provider, 'laya');
    assert.equal(values.inputTokens, 0);
    assert.equal(values.outputTokens, 0);
  });

  it('carries the gating signal as columns, so engines stay comparable', () => {
    const values = decisionValues({
      ...base,
      subject: { type: 'x', label: 'y' },
      routingSignal: 'top_probability',
      routingValue: 0.503,
      recommendedAction: 'flag_for_review',
      usage: { input_tokens: 1536, output_tokens: 0 },
    });
    assert.equal(values.routingSignal, 'top_probability');
    assert.equal(values.routingValue, 0.503);
    assert.equal(values.inputTokens, 1536);
  });
});

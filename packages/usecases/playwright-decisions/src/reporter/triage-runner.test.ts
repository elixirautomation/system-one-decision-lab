/**
 * `DECISION_TRIAGE_ENABLED` is the run's only behaviour switch, and when it is on
 * triage is required. These tests pin the statuses the reporter fails the run
 * on, and that the real cause of an unreachable engine reaches the operator.
 */
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SystemOneClient, SystemOneResponse } from '@sysone/decision-core';
import { resolveLabProvider } from '../composition/providers.js';
import type { FinalResult } from './result-capture.js';
import { describeError, TriageRunner } from './triage-runner.js';

const ENABLED = { DECISION_TRIAGE_ENABLED: 'true', DECISION_PROVIDER: 'laya' };
const METADATA = { app: 'demo-app', projectConfiguration: 'smoke', squadName: 'local', branch: 'local' };
const silent = (): void => undefined;

function failure(testId: string): FinalResult {
  return {
    test: {} as FinalResult['test'],
    result: { status: 'failed', stdout: [], stderr: [] } as unknown as FinalResult['result'],
    captured: {
      testId,
      projectName: 'chromium-anonymous',
      title: `test ${testId}`,
      suiteName: 'tests/login-flow.spec.ts > login flow',
      status: 'failed',
      durationMs: 10,
      retryCount: 0,
      sourceFile: 'tests/login-flow.spec.ts',
      errorMessage: 'expect(received).toBe(expected)',
      annotations: [],
      tags: [],
    },
  };
}

const ANSWER: SystemOneResponse = {
  model: 'english',
  answers: {
    category: { type: 'choice', choice: 'product_bug', probabilities: { product_bug: 0.9 }, confidence: 0.9 },
    is_timeout: { type: 'noul', noul: 0.1 },
    is_network_error: { type: 'noul', noul: 0.1 },
  },
  usage: { input_tokens: 1, output_tokens: 0 },
};

/** A client whose nth call runs `answer(n)`. */
function client(answer: (call: number) => Promise<SystemOneResponse>): () => SystemOneClient {
  const config = resolveLabProvider(ENABLED);
  let calls = 0;
  return () =>
    ({
      systemOne: () => answer(calls++),
      provider: config.id,
      providerLabel: config.label,
      config,
    }) as unknown as SystemOneClient;
}

/** What Node's fetch throws when nothing is listening. */
function connectionRefused(): Error {
  return new TypeError('fetch failed', { cause: Object.assign(new Error('connect'), { code: 'ECONNREFUSED' }) });
}

describe('triage runner', () => {
  it('does not ask an engine when triage is disabled', async () => {
    const runner = new TriageRunner({
      env: { DECISION_TRIAGE_ENABLED: 'false' },
      createClient: () => assert.fail('no client may be created while triage is disabled'),
      log: silent,
    });
    const result = await runner.run([failure('a')], METADATA);
    assert.equal(result.status, 'disabled');
  });

  it('does not ask an engine when nothing failed', async () => {
    const runner = new TriageRunner({ env: ENABLED, createClient: () => assert.fail('unused'), log: silent });
    assert.equal((await runner.run([], METADATA)).status, 'not_needed');
  });

  it('completes when every failure is answered', async () => {
    const runner = new TriageRunner({ env: ENABLED, createClient: client(async () => ANSWER), log: silent });
    const result = await runner.run([failure('a'), failure('b')], METADATA);
    assert.equal(result.status, 'completed');
    assert.equal(result.decisions.length, 2);
    assert.equal(result.message, undefined);
  });

  it('fails, naming the endpoint and the real cause, when the engine is down', async () => {
    const runner = new TriageRunner({
      env: ENABLED,
      createClient: client(async () => {
        throw connectionRefused();
      }),
      log: silent,
    });
    const result = await runner.run([failure('a'), failure('b')], METADATA);

    assert.equal(result.status, 'failed');
    assert.equal(result.decisions.length, 0);
    assert.match(result.message ?? '', /2 of 2 Laya request\(s\) to http:\/\/localhost:8000\/v1\/systemone failed/);
    assert.match(result.message ?? '', /fetch failed \(ECONNREFUSED\)/);
    // Identical causes are reported once, not once per failure.
    assert.equal(result.message?.match(/ECONNREFUSED/g)?.length, 1);
  });

  it('is partial when only some failures are answered', async () => {
    const runner = new TriageRunner({
      env: ENABLED,
      createClient: client(async (call) => {
        if (call === 0) return ANSWER;
        throw new Error('status 503');
      }),
      log: silent,
    });
    const result = await runner.run([failure('a'), failure('b')], METADATA);
    assert.equal(result.status, 'partial');
    assert.equal(result.decisions.length, 1);
  });

  it('fails rather than skipping when the engine cannot be configured', async () => {
    const runner = new TriageRunner({
      env: ENABLED,
      createClient: () => {
        throw new Error('JEV_API_KEY is required');
      },
      log: silent,
    });
    const result = await runner.run([failure('a')], METADATA);
    assert.equal(result.status, 'failed');
    assert.match(result.message ?? '', /could not be used: JEV_API_KEY is required/);
  });
});

describe('describeError', () => {
  it('surfaces a fetch cause code', () => {
    assert.equal(describeError(connectionRefused()), 'fetch failed (ECONNREFUSED)');
  });

  it('leaves an ordinary error alone', () => {
    assert.equal(describeError(new Error('status 503')), 'status 503');
    assert.equal(describeError('plain'), 'plain');
  });
});

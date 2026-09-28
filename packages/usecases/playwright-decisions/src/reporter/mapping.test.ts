import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import path from 'node:path';
import { buildSuiteName, mapPlaywrightStatus } from './mapping.js';

describe('Playwright history mapping', () => {
  it('normalizes timeouts and interruptions as failed outcomes', () => {
    assert.equal(mapPlaywrightStatus('passed'), 'passed');
    assert.equal(mapPlaywrightStatus('skipped'), 'skipped');
    assert.equal(mapPlaywrightStatus('timedOut'), 'failed');
    assert.equal(mapPlaywrightStatus('interrupted'), 'failed');
  });

  it('builds suite identity from source file and describe hierarchy', () => {
    const file = path.join(process.cwd(), 'tests/login-flow.spec.ts');
    assert.equal(
      buildSuiteName(file, ['chromium-anonymous', 'login-flow.spec.ts', 'login flow', 'renders'], 'chromium-anonymous'),
      'tests/login-flow.spec.ts > login flow',
    );
  });
});

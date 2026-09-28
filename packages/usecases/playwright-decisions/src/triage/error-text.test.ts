import assert from 'node:assert/strict';
import test from 'node:test';
import { deriveErrorSignature, stripAnsi } from './error-text.js';

// Verbatim shapes observed in this lab's own PostgreSQL rows before normalisation.
const COLOURED_EXPECT =
  'Error: \u001B[2mexpect(\u001B[22m\u001B[31mreceived\u001B[39m\u001B[2m).\u001B[22mtoBeGreaterThan\u001B[2m(\u001B[22m\u001B[32mexpected\u001B[39m\u001B[2m)\u001B[22m\n\nExpected: > \u001B[32m0\u001B[39m\nReceived:   \u001B[31m0\u001B[39m';
const COLOURED_VISIBLE =
  'Error: \u001B[2mexpect(\u001B[22m\u001B[31mlocator\u001B[39m\u001B[2m).\u001B[22mtoBeVisible\u001B[2m(\u001B[22m\u001B[2m)\u001B[22m failed';

test('ansi colour sequences are removed', () => {
  assert.equal(
    stripAnsi(COLOURED_VISIBLE),
    'Error: expect(locator).toBeVisible() failed',
  );
  assert.equal(stripAnsi('plain text'), 'plain text');
  assert.equal(stripAnsi(''), '');
});

test('a coloured assertion failure becomes a readable signature', () => {
  assert.equal(
    deriveErrorSignature(COLOURED_EXPECT),
    'expect(received).toBeGreaterThan(expected)',
  );
  assert.equal(
    deriveErrorSignature(COLOURED_VISIBLE),
    'expect(locator).toBeVisible() failed',
  );
});

test('no escape sequence survives into a signature', () => {
  for (const raw of [COLOURED_EXPECT, COLOURED_VISIBLE]) {
    // eslint-disable-next-line no-control-regex
    assert.doesNotMatch(String(deriveErrorSignature(raw)), /\u001B/);
  }
});

test('the call log after the first line is discarded', () => {
  const withCallLog = [
    'TimeoutError: locator.click: Timeout 15000ms exceeded.',
    'Call log:',
    "  - waiting for getByTestId('signin')",
    '    - <div class="cdk-overlay-backdrop"></div> intercepts pointer events',
  ].join('\n');
  assert.equal(
    deriveErrorSignature(withCallLog),
    'TimeoutError: locator.click: Timeout <n>ms exceeded.',
  );
});

test('the same fault with a different timeout clusters together', () => {
  const a = deriveErrorSignature('TimeoutError: locator.click: Timeout 15000ms exceeded.');
  const b = deriveErrorSignature('TimeoutError: locator.click: Timeout 30000ms exceeded.');
  assert.equal(a, b);
});

test('environment-specific urls, paths and ids are normalised away', () => {
  assert.equal(
    deriveErrorSignature('page.goto: net::ERR_CONNECTION_REFUSED at https://host-a.int.example/en/login'),
    'page.goto: net::ERR_CONNECTION_REFUSED at <url>',
  );
  const withUuid = deriveErrorSignature('Run 3f8a1c2e-4b5d-6e7f-8a9b-0c1d2e3f4a5b failed');
  assert.equal(withUuid, 'Run <uuid> failed');
});

test('two runs of the same fault on different hosts share one signature', () => {
  const a = deriveErrorSignature('page.goto: net::ERR_ABORTED at https://host-a.example/x');
  const b = deriveErrorSignature('page.goto: net::ERR_ABORTED at https://host-b.example/y');
  assert.equal(a, b);
});

test('a bare Error: prefix is dropped but a typed prefix is kept', () => {
  // "Error:" alone carries no information; the error class does.
  assert.equal(deriveErrorSignature('Error: something broke'), 'something broke');
  assert.equal(
    deriveErrorSignature('TimeoutError: something timed out'),
    'TimeoutError: something timed out',
  );
});

test('an Error: line followed by the real message uses the message', () => {
  // Playwright emits this shape for assertion failures.
  assert.equal(
    deriveErrorSignature('Error:\n  expect(locator).toBeVisible() failed'),
    'expect(locator).toBeVisible() failed',
  );
});

test('missing or empty input yields null rather than a placeholder', () => {
  assert.equal(deriveErrorSignature(undefined), null);
  assert.equal(deriveErrorSignature(null), null);
  assert.equal(deriveErrorSignature(''), null);
  assert.equal(deriveErrorSignature('   \n  \n'), null);
  assert.equal(deriveErrorSignature('Error:'), null);
});

test('an over-long signature is truncated with an ellipsis', () => {
  const signature = deriveErrorSignature(`Failure ${'x'.repeat(400)}`);
  assert.ok(signature);
  assert.ok(signature.length <= 120, `expected <= 120, got ${signature.length}`);
  assert.match(signature, /…$/);
});

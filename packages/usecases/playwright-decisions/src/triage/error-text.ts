/**
 * Normalisation of raw runner error text.
 *
 * Two distinct jobs, deliberately separated:
 *
 *   stripAnsi           makes text safe to store and display. Playwright colours
 *                       assertion output, so `result.error.message` arrives full
 *                       of escape sequences. Stored raw, they reach the database,
 *                       the report, and the decision engine's prompt.
 *
 *   deriveErrorSignature collapses one failure into a stable clustering key by
 *                       removing the parts that differ between two occurrences
 *                       of the same fault — timeout values, coordinates, ids,
 *                       URLs — so "the same failure" groups together.
 *
 * Both are pure functions of a string, so they are cheap to unit-test and can be
 * applied at capture time, at ingestion, and at render time without coupling.
 */

// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\u001B\[[0-9;]*[A-Za-z]/g;

/** Removes ANSI colour and cursor sequences. */
export function stripAnsi(value: string): string {
  return value.replace(ANSI_PATTERN, '');
}

const MAX_SIGNATURE_LENGTH = 120;

/**
 * Volatile fragments replaced with a placeholder so two occurrences of the same
 * fault produce the same key. Ordered: longer, more specific patterns first.
 */
const VOLATILE_PATTERNS: Array<[RegExp, string]> = [
  // Timeout 15000ms exceeded -> Timeout <n>ms exceeded
  [/\b\d+(\.\d+)?\s*ms\b/g, '<n>ms'],
  [/\b\d+(\.\d+)?\s*s\b/g, '<n>s'],
  // Absolute URLs and file paths carry environment-specific noise.
  [/\bhttps?:\/\/\S+/g, '<url>'],
  [/(?:\/[\w.-]+){2,}/g, '<path>'],
  // Hex ids, uuids, and long digit runs.
  [/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '<uuid>'],
  [/\b0x[0-9a-f]+\b/gi, '<hex>'],
  [/\b\d{3,}\b/g, '<n>'],
];

/**
 * Derives a stable, human-readable clustering key from a raw error message.
 *
 * Returns null when there is no usable text, so callers can persist NULL rather
 * than a meaningless placeholder and let the report fall back explicitly.
 */
export function deriveErrorSignature(rawMessage: string | undefined | null): string | null {
  if (!rawMessage) return null;

  const clean = stripAnsi(rawMessage);
  // Playwright puts the assertion or action failure on the first non-empty line;
  // everything after it is expected/received detail or a call log.
  const firstMeaningfulLine = clean
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line.length > 0 && line !== 'Error:');
  if (!firstMeaningfulLine) return null;

  let signature = firstMeaningfulLine
    // A bare "Error:" prefix adds nothing once the message follows it.
    .replace(/^(?:Error|TimeoutError|AssertionError):\s*/, (match) =>
      match.startsWith('Error:') ? '' : match,
    )
    .trim();

  for (const [pattern, replacement] of VOLATILE_PATTERNS) {
    signature = signature.replace(pattern, replacement);
  }

  signature = signature.replace(/\s+/g, ' ').trim();
  if (signature.length === 0) return null;
  return signature.length > MAX_SIGNATURE_LENGTH
    ? `${signature.slice(0, MAX_SIGNATURE_LENGTH - 1).trimEnd()}…`
    : signature;
}

/**
 * Retry policy for System One requests.
 *
 * Extracted behind an interface so the transport does not own a hardcoded
 * backoff rule: a caller can substitute a different policy (or a no-op one in a
 * test) without touching the client.
 */

export interface RetryPolicy {
  shouldRetry(status: number, attempt: number): boolean;
  delayMs(attempt: number): number;
}

/**
 * 429 and 529 are rate limiting. 503 additionally covers a self-hosted server
 * that is up but still building its checkpoint, which is normal on a first
 * start rather than a failure.
 */
const RETRYABLE_STATUSES = new Set([429, 503, 529]);

export class ExponentialBackoffRetryPolicy implements RetryPolicy {
  constructor(
    private readonly maxRetries = 3,
    private readonly baseDelayMs = 500,
  ) {}

  shouldRetry(status: number, attempt: number): boolean {
    return RETRYABLE_STATUSES.has(status) && attempt < this.maxRetries;
  }

  delayMs(attempt: number): number {
    return 2 ** attempt * this.baseDelayMs;
  }
}

export const NO_RETRY: RetryPolicy = {
  shouldRetry: () => false,
  delayMs: () => 0,
};

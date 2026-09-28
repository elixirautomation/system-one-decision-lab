/**
 * Transport for the System One protocol (`POST /v1/systemone`).
 *
 * One client serves every provider: the contract guarantees the same route,
 * request body, and answer payload, so which engine is reached is decided by the
 * resolved provider config rather than by a second implementation here.
 *
 * This class does transport only. Credential requirements are enforced by the
 * resolver against each provider's declared keys, egress consent by the egress
 * module, and backoff by the injected retry policy — so it holds no
 * engine-specific branches.
 */
import type { ProviderEnv, ResolvedDecisionProvider } from './contract.js';
import { assertDataEgressAllowed } from './egress.js';
import type { SystemOneRequest, SystemOneResponse } from './protocol.js';
import { ExponentialBackoffRetryPolicy, type RetryPolicy } from './retry-policy.js';

export class SystemOneError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body: unknown,
    readonly provider: string,
  ) {
    super(message);
    this.name = 'SystemOneError';
  }
}

export interface SystemOneClientOptions {
  provider: ResolvedDecisionProvider;
  retryPolicy?: RetryPolicy;
  /** Overridden in tests so retries do not spend real time. */
  sleep?: (milliseconds: number) => Promise<void>;
  fetchImpl?: typeof fetch;
  env?: ProviderEnv;
}

const defaultSleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class SystemOneClient {
  readonly config: ResolvedDecisionProvider;
  private readonly retryPolicy: RetryPolicy;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly fetchImpl: typeof fetch;
  private readonly env: ProviderEnv;

  constructor(options: SystemOneClientOptions) {
    this.env = options.env ?? process.env;
    this.config = options.provider;
    this.retryPolicy = options.retryPolicy ?? new ExponentialBackoffRetryPolicy();
    this.sleep = options.sleep ?? defaultSleep;
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  get provider(): string {
    return this.config.id;
  }

  get providerLabel(): string {
    return this.config.label;
  }

  private headers(): Record<string, string> {
    return {
      ...(this.config.apiKey ? { Authorization: `Bearer ${this.config.apiKey}` } : {}),
      'Content-Type': 'application/json',
    };
  }

  async systemOne<TQuestionIds extends string = string>(
    request: SystemOneRequest,
  ): Promise<SystemOneResponse<TQuestionIds>> {
    assertDataEgressAllowed(this.config, this.env);
    const body = JSON.stringify({
      state: request.state,
      model: request.model ?? this.config.model,
      questions: request.questions,
    } satisfies SystemOneRequest);

    for (let attempt = 0; ; attempt += 1) {
      const response = await this.fetchImpl(this.config.endpoint, {
        method: 'POST',
        headers: this.headers(),
        body,
      });

      if (response.ok) return (await response.json()) as SystemOneResponse<TQuestionIds>;

      const responseBody = await response.json().catch(() => undefined);
      if (this.retryPolicy.shouldRetry(response.status, attempt)) {
        await this.sleep(this.retryPolicy.delayMs(attempt));
        continue;
      }

      throw new SystemOneError(
        `${this.config.label} request to ${this.config.endpoint} failed with status ${response.status}`,
        response.status,
        responseBody,
        this.config.id,
      );
    }
  }
}

/** Builds a transport for a provider resolved by the caller's composition root. */
export function createDecisionClient(options: SystemOneClientOptions): SystemOneClient {
  return new SystemOneClient(options);
}

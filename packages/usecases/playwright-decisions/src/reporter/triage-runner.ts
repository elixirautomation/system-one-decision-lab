/**
 * Triage orchestration for one Playwright run.
 *
 * Separated from the Playwright reporter so the "ask the configured engine about
 * every failure, and report every engine problem without losing the run" policy is
 * testable on its own. It depends on the decision module's public contract, so
 * it has no knowledge of which engine is selected.
 */
import { type SystemOneClient } from '@sysone/decision-core';
import {
  createLabDecisionClient as createDecisionClient,
  type LabDecisionClientOptions,
} from '../composition/providers.js';
import type { CompletedTriageDecision } from '../db/ingestion-types.js';
import { triageFailure } from '../triage/classify-failure.js';
import type { DecisionRunManifest, IngestMetadata, TriagedFailure } from '../triage/types.js';
import { envBoolean, RUN_ENV_KEYS } from './run-environment.js';
import { toFailedTest, type FinalResult } from './result-capture.js';

export interface TriageRunResult {
  failures: TriagedFailure[];
  decisions: CompletedTriageDecision[];
  status: DecisionRunManifest['triageStatus'];
  provider: DecisionRunManifest['decisionProvider'];
  message?: string;
}

export interface TriageRunnerOptions {
  createClient?: (options?: LabDecisionClientOptions) => SystemOneClient;
  env?: NodeJS.ProcessEnv;
  log?: (message: string) => void;
}

function skipped(
  status: TriageRunResult['status'],
  message?: string,
): TriageRunResult {
  return {
    failures: [],
    decisions: [],
    status,
    provider: null,
    ...(message ? { message } : {}),
  };
}

/**
 * A readable cause for an engine error. `fetch` reports an unreachable host as a
 * bare "fetch failed" and keeps the useful part (`ECONNREFUSED`, `ENOTFOUND`) on
 * `cause`, so that is surfaced too.
 */
export function describeError(error: unknown): string {
  if (!(error instanceof Error)) return String(error);
  const cause = error.cause as { code?: unknown; message?: unknown } | undefined;
  const detail =
    typeof cause?.code === 'string' ? cause.code : typeof cause?.message === 'string' ? cause.message : null;
  return detail && !error.message.includes(detail) ? `${error.message} (${detail})` : error.message;
}

export class TriageRunner {
  private readonly createClient: (options?: LabDecisionClientOptions) => SystemOneClient;
  private readonly env: NodeJS.ProcessEnv;
  private readonly log: (message: string) => void;

  constructor(options: TriageRunnerOptions = {}) {
    this.createClient = options.createClient ?? createDecisionClient;
    this.env = options.env ?? process.env;
    this.log = options.log ?? ((message) => console.log(message));
  }

  async run(failures: FinalResult[], metadata: IngestMetadata): Promise<TriageRunResult> {
    if (failures.length === 0) return skipped('not_needed');
    if (!envBoolean(RUN_ENV_KEYS.triageEnabled, false, this.env)) {
      return skipped(
        'disabled',
        `${RUN_ENV_KEYS.triageEnabled} is false; failures were ingested without model-backed triage.`,
      );
    }

    let client: SystemOneClient;
    try {
      client = this.createClient({ env: this.env });
    } catch (error) {
      // Triage was asked for, so a misconfigured engine fails the run. It is
      // returned rather than thrown so the Playwright evidence is still persisted.
      return skipped('failed', `Decision engine could not be used: ${describeError(error)}`);
    }

    this.log(
      `[decision-lab] Triaging ${failures.length} failure(s) via ${client.providerLabel} ` +
        `at ${client.config.endpoint} (${client.config.endpointScope}).`,
    );

    const outcomes = await Promise.all(
      failures.map((failure) => this.triageOne(client, failure, metadata)),
    );

    const triaged = outcomes.flatMap((outcome) => ('failure' in outcome ? [outcome.failure] : []));
    const decisions = outcomes.flatMap((outcome) => ('decision' in outcome ? [outcome.decision] : []));
    const errors = outcomes.flatMap((outcome) => ('error' in outcome ? [outcome.error] : []));

    if (errors.length === 0) {
      return { failures: triaged, decisions, status: 'completed', provider: client.provider };
    }

    const causes = [...new Set(errors)];
    return {
      failures: triaged,
      decisions,
      status: decisions.length === 0 ? 'failed' : 'partial',
      provider: client.provider,
      message:
        `${errors.length} of ${failures.length} ${client.providerLabel} request(s) to ` +
        `${client.config.endpoint} failed: ${causes.join('; ')}`,
    };
  }

  private async triageOne(
    client: SystemOneClient,
    failure: FinalResult,
    metadata: IngestMetadata,
  ): Promise<
    | { failure: TriagedFailure; decision: CompletedTriageDecision }
    | { error: string }
  > {
    const test = toFailedTest(failure);
    try {
      const outcome = await triageFailure(client, test);
      return {
        failure: {
          test,
          metadata,
          verdict: outcome.verdict,
          decisionProvider: outcome.provider,
          model: outcome.model,
          usage: outcome.usage,
        },
        decision: {
          testId: test.testId,
          verdict: outcome.verdict,
          provider: outcome.provider,
          model: outcome.model,
          usage: outcome.usage,
        },
      };
    } catch (error) {
      return { error: describeError(error) };
    }
  }
}

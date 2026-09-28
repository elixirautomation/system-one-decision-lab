/**
 * The Playwright reporter entry point.
 *
 * Its single responsibility is orchestration: collect final results, delegate
 * triage, delegate persistence, delegate the report refresh, delegate artifact
 * writing, and decide the exit status. Each of those concerns lives in its own
 * module, so this class contains no capture logic, no engine knowledge, and no
 * path literals.
 */
import type { FullResult, Reporter, TestCase, TestResult } from '@playwright/test/reporter';
import { createLabDatabase as createDatabase } from '../composition/database.js';
import { ingestActualPlaywrightRun } from '../db/ingest-playwright-run.js';
import type { IngestedRun } from '../db/ingestion-types.js';
import { FinalResultCollector } from './result-capture.js';
import { refreshDecisionReport, type ReportRefreshResult } from './report-refresh.js';
import { writeRunManifest, writeTriageOutput } from './run-artifacts.js';
import { resolveRunId, runOutputDirectory } from './run-identity.js';
import { ingestMetadata, ingestRequired, runMetadata } from './run-environment.js';
import { TriageRunner, type TriageRunResult } from './triage-runner.js';

const LOG_PREFIX = '[decision-lab]';

const triageFailed = (triage: TriageRunResult): boolean =>
  triage.status === 'failed' || triage.status === 'partial';

export default class DecisionReporter implements Reporter {
  /**
   * Shared with `outputDir` and the persisted `test_runs` row, so this run's
   * artifacts on disk and its database row carry the same id.
   */
  private readonly runId = resolveRunId();
  private readonly startedAt = new Date();
  private readonly collector = new FinalResultCollector();
  private readonly triageRunner = new TriageRunner();

  onTestEnd(test: TestCase, result: TestResult): void {
    this.collector.record(test, result);
  }

  async onEnd(fullResult: FullResult): Promise<{ status?: FullResult['status'] } | void> {
    const completedAt = new Date();
    const triage = await this.triageRunner.run(this.collector.failures(), ingestMetadata());
    if (triageFailed(triage)) {
      console.error(`${LOG_PREFIX} Triage ${triage.status}: ${triage.message ?? 'no detail'}`);
      console.error(`${LOG_PREFIX} Is the engine up? Check with: ./start --status`);
    }
    const triageOutputPath = await writeTriageOutput(this.runId, triage.failures);
    const ingestion = await this.persist(completedAt, triage);
    const report = await this.refreshReport();

    await writeRunManifest(this.runId, {
      schemaVersion: 1,
      runId: this.runId,
      startedAt: this.startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      outputDirectory: runOutputDirectory(this.runId),
      triageOutputPath,
      triageStatus: triage.status,
      decisionProvider: triage.provider,
      ...(triage.message ? { triageMessage: triage.message } : {}),
      ingestedRuns: ingestion.runs,
      ...(ingestion.error ? { ingestionError: ingestion.error } : {}),
      reportPath: report.path,
    });

    // Triage (when enabled) and ingestion (unless INGEST_REQUIRED=false) are
    // required parts of a run: either failing fails it, after the manifest is written.
    if (triageFailed(triage)) return { status: 'failed' };
    if (ingestion.error && ingestRequired()) return { status: 'failed' };
    if (fullResult.status === 'failed') return undefined;
  }

  /**
   * Rebuilds the decision report and prints its clickable link.
   *
   * Done automatically because the report is the only dashboard: an operator who
   * has to remember `yarn report` after every `yarn e2e` is reading stale output
   * the one time they forget. `yarn report` remains for rebuilding on demand.
   *
   * A render failure is logged, never fatal — the tests' own verdict and the
   * ingestion gate decide the run status.
   */
  private async refreshReport(): Promise<ReportRefreshResult> {
    const result = await refreshDecisionReport();

    if (result.error) {
      console.error(`${LOG_PREFIX} Decision report refresh failed: ${result.error}`);
      console.error(`${LOG_PREFIX} Rebuild it once PostgreSQL is reachable with: yarn report`);
      return result;
    }
    if (result.snapshot) console.log(`${LOG_PREFIX} Report snapshot: ${result.snapshot}.`);
    if (result.fileUrl) console.log(`${LOG_PREFIX} Decision report ${result.fileUrl}`);
    return result;
  }

  /**
   * Ingestion failure is reported, not thrown, so the manifest is still written;
   * `onEnd` then fails the run unless `INGEST_REQUIRED=false`.
   */
  private async persist(
    completedAt: Date,
    triage: TriageRunResult,
  ): Promise<{ runs: IngestedRun[]; error?: string }> {
    try {
      const connection = createDatabase();
      try {
        const runs = await ingestActualPlaywrightRun(connection.db, {
          metadata: runMetadata(this.runId, this.startedAt, completedAt),
          tests: this.collector.all().map((entry) => entry.captured),
          decisions: triage.decisions,
        });
        console.log(
          `${LOG_PREFIX} Ingested ${runs.length} Playwright run(s), ` +
            `${runs.reduce((total, run) => total + run.testCount, 0)} test result(s).`,
        );
        return { runs };
      } finally {
        await connection.close();
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${LOG_PREFIX} PostgreSQL ingestion failed: ${message}`);
      return { runs: [], error: message };
    }
  }

  printsToStdio(): boolean {
    return false;
  }
}

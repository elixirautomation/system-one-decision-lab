/**
 * Refreshing the decision report at the end of a Playwright run.
 *
 * Exists so the reporter stays pure orchestration: this module owns the
 * connection, the failure tolerance, and the operator-facing link, and the
 * reporter just calls it. The rendering itself is not reimplemented here — it
 * delegates to `src/report/write-report.ts`, the same writer `yarn report` uses,
 * so the automatic refresh and the manual rebuild cannot drift apart.
 *
 * The report is the lab's only dashboard, so producing it is part of finishing a
 * run rather than a separate command the operator has to remember.
 */
import { createLabDatabase as createDatabase } from '../composition/database.js';
import { describeReportSnapshot, writeDashboardReport } from '../report/write-report.js';

export interface ReportRefreshResult {
  /** Repo-relative path, or null when the refresh failed. */
  readonly path: string | null;
  /** Clickable `file://` URL, or null when nothing was written. */
  readonly fileUrl: string | null;
  /** One-line snapshot description, when the report was written. */
  readonly snapshot: string | null;
  /** Why nothing was written, when that is the case. */
  readonly error?: string;
}

const NOTHING_WRITTEN: ReportRefreshResult = { path: null, fileUrl: null, snapshot: null };

/**
 * Rebuilds the report from whatever is now in PostgreSQL.
 *
 * A failure here is reported and swallowed on purpose: the report is a view over
 * persisted evidence, so failing to render it must not overwrite the verdict of
 * the tests themselves. Run status stays governed by the tests, triage, and
 * `INGEST_REQUIRED`.
 */
export async function refreshDecisionReport(): Promise<ReportRefreshResult> {
  try {
    const connection = createDatabase();
    try {
      const written = await writeDashboardReport(connection.db);
      return {
        path: written.relativePath,
        fileUrl: written.fileUrl,
        snapshot: describeReportSnapshot(written.report),
      };
    } finally {
      await connection.close();
    }
  } catch (error) {
    return {
      ...NOTHING_WRITTEN,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

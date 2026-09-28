/**
 * Writing the decision report to disk.
 *
 * Its single responsibility is "database rows in, `index.html` on disk, paths
 * out". It prints nothing and opens no connection, so both callers can reuse it:
 * the `yarn report` CLI (`build-report.ts`) and the Playwright reporter, which
 * refreshes the report at the end of every run.
 *
 * Having one implementation is the point. A second render path in the reporter
 * would be able to drift from the one `yarn report` produces, and the report is
 * the lab's only dashboard.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { Database } from '@sysone/decision-store';
import { buildDashboardReport } from './aggregate.js';
import { loadReportSource } from './load-report-source.js';
import type { DashboardReport } from './model.js';
import { renderDashboardHtml } from './render-html.js';

export const REPORT_OUTPUT_DIRECTORY = 'report-output';
export const REPORT_FILE = 'index.html';

export interface WrittenReport {
  /** Repo-relative path, e.g. `report-output/index.html`. */
  readonly relativePath: string;
  /** Absolute path on the machine that wrote it. */
  readonly absolutePath: string;
  /** Clickable `file://` URL for terminal output. */
  readonly fileUrl: string;
  /** The rendered snapshot, for summary lines. */
  readonly report: DashboardReport;
}

/** Loads every row, aggregates, renders, and writes the single-file report. */
export async function writeDashboardReport(db: Database): Promise<WrittenReport> {
  const source = await loadReportSource(db);
  const report = buildDashboardReport(source);

  const relativePath = path.join(REPORT_OUTPUT_DIRECTORY, REPORT_FILE);
  const absolutePath = path.resolve(relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, renderDashboardHtml(report), 'utf-8');

  return {
    relativePath,
    absolutePath,
    fileUrl: pathToFileURL(absolutePath).href,
    report,
  };
}

/** One-line snapshot description, e.g. "3 run(s), 24 execution(s), ...". */
export function describeReportSnapshot(report: DashboardReport): string {
  const providerBreakdown = Object.entries(report.summary.providerCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([provider, count]) => `${provider} ${count}`)
    .join(', ');

  return (
    `${report.summary.runCount} run(s), ${report.summary.executionCount} execution(s), ` +
    `${report.summary.identityCount} logical test(s), ${report.summary.decisionCount} decision(s)` +
    `${providerBreakdown ? ` (${providerBreakdown})` : ''}`
  );
}

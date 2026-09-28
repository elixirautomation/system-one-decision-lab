/**
 * `yarn report` — rebuild the decision report from PostgreSQL.
 *
 * A thin CLI over `write-report.ts`: it owns the connection and the console
 * output only. The Playwright reporter calls the same writer at the end of every
 * run, so `yarn report` is for rebuilding on demand rather than a step the
 * operator must remember after `yarn e2e`.
 */
import { createLabDatabase as createDatabase } from '../composition/database.js';
import { describeReportSnapshot, writeDashboardReport } from './write-report.js';

const connection = createDatabase();

try {
  const written = await writeDashboardReport(connection.db);
  console.log(`Report snapshot: ${describeReportSnapshot(written.report)}.`);
  console.log(`Decision report ${written.fileUrl}`);
} finally {
  await connection.close();
}

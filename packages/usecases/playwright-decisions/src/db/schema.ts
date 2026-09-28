/**
 * Playwright evidence: the tables this use case owns.
 *
 * The `decisions` table is NOT here — it belongs to `@sysone/decision-store` and
 * is shared with every other use case. What lives here is the evidence a decision
 * is made about: runs and their test results.
 *
 * A decision refers to a row in `test_cases` through the generic
 * `subject_type` / `subject_id` pair (`playwright:test_case`), so this package
 * depends on infra and infra never depends on this package.
 */
import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  real,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import type { DataOrigin } from '@sysone/decision-store';

/** The `subject_type` every decision in this use case carries. */
export const PLAYWRIGHT_TEST_CASE_SUBJECT = 'playwright:test_case';

export const testRuns = pgTable(
  'test_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    pipelineId: text('pipeline_id').notNull(),
    jobId: text('job_id'),
    branch: text('branch').notNull().default('unknown'),
    commitSha: text('commit_sha'),
    projectId: text('project_id').notNull(),
    projectConfiguration: text('project_configuration').notNull(),
    reportFormat: text('report_format').notNull().default('playwright'),
    app: text('app'),
    squadName: text('squad_name'),
    dataOrigin: text('data_origin').$type<DataOrigin>().notNull(),
    triggeredAt: timestamp('triggered_at', { withTimezone: true }).notNull(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    totalTests: integer('total_tests').notNull().default(0),
    passedTests: integer('passed_tests').notNull().default(0),
    failedTests: integer('failed_tests').notNull().default(0),
    skippedTests: integer('skipped_tests').notNull().default(0),
    passRate: real('pass_rate').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('test_runs_data_origin_check', sql`${table.dataOrigin} IN ('actual_run', 'synthetic_seed')`),
    uniqueIndex('uq_pipeline_config').on(table.pipelineId, table.projectConfiguration),
    index('idx_runs_origin_triggered').on(table.dataOrigin, table.triggeredAt),
    index('idx_runs_identity_history').on(
      table.dataOrigin,
      table.projectId,
      table.projectConfiguration,
      table.triggeredAt,
    ),
    index('idx_runs_squad_app').on(table.squadName, table.app, table.triggeredAt),
  ],
);

export const testCases = pgTable(
  'test_cases',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    testRunId: uuid('test_run_id')
      .notNull()
      .references(() => testRuns.id, { onDelete: 'cascade' }),
    testName: text('test_name').notNull(),
    suiteName: text('suite_name').notNull(),
    status: text('status').$type<'passed' | 'failed' | 'skipped'>().notNull(),
    durationMs: integer('duration_ms'),
    errorMessage: text('error_message'),
    stackTrace: text('stack_trace'),
    sourceFile: text('source_file'),
    sourceLine: integer('source_line'),
    sourceColumn: integer('source_column'),
    errorSignature: text('error_signature'),
    failureCategory: text('failure_category'),
    failureCategorySource: text('failure_category_source'),
    failureCategoryConfidence: real('failure_category_confidence'),
    failureAnalysis: jsonb('failure_analysis').$type<Record<string, unknown>>(),
    projectConfiguration: text('project_configuration').notNull(),
    projectId: text('project_id').notNull(),
    effectiveProjectConfiguration: text('effective_project_configuration').notNull(),
    executedAt: timestamp('executed_at', { withTimezone: true }).notNull(),
    annotations: jsonb('annotations').$type<Array<{ type: string; description?: string }>>(),
    tags: text('tags').array(),
    retryCount: integer('retry_count').notNull().default(0),
    timeout: integer('timeout'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('test_cases_status_check', sql`${table.status} IN ('passed', 'failed', 'skipped')`),
    uniqueIndex('uq_test_case_identity').on(table.testRunId, table.testName, table.suiteName),
    index('idx_cases_run').on(table.testRunId),
    index('idx_cases_status').on(table.status, table.executedAt),
    index('idx_cases_identity_history').on(
      table.projectId,
      table.suiteName,
      table.effectiveProjectConfiguration,
      table.testName,
      table.executedAt,
    ),
    index('idx_cases_failure_category').on(table.failureCategory),
  ],
);

export const playwrightSchema = { testRuns, testCases };

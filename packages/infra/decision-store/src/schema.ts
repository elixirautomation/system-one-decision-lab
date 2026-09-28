/**
 * The generic `decisions` table.
 *
 * This is the one table shared by every use case, and it deliberately knows
 * nothing about any of them. Previously `decisions.test_case_id` carried a
 * foreign key to `test_cases`, which pointed infra at a use case: a second use
 * case would have inherited Playwright's tables to store a decision about a
 * merge request or a log line. The reference is therefore polymorphic now —
 * `subject_type` plus an opaque `subject_id` — so the dependency only ever runs
 * use case → infra.
 *
 * What that costs: the database can no longer cascade-delete a decision when its
 * subject row is deleted, and cannot enforce that `subject_id` exists. That is
 * the accepted price of keeping infra reusable; a use case that wants referential
 * integrity can add its own link table, because it may depend on this package.
 *
 * What stays here is only what every decision has regardless of subject: which
 * engine answered, what it answered, how confident it was, which signal gated the
 * action, the raw answer, and token usage.
 */
import { sql } from 'drizzle-orm';
import { check, index, integer, jsonb, pgTable, real, text, timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * Whether a row is real evidence or local-validation fixtures. Generic on
 * purpose: every use case needs to tell a seeded row from a measured one.
 */
export type DataOrigin = 'actual_run' | 'synthetic_seed';

export const DATA_ORIGINS: readonly DataOrigin[] = ['actual_run', 'synthetic_seed'];

/** Explicit historical id of the engine that produced a decision. */
export type DecisionProvider = string;

const originList = DATA_ORIGINS.map((origin) => `'${origin}'`).join(', ');

export const decisions = pgTable(
  'decisions',
  {
    id: uuid('id').primaryKey().defaultRandom(),

    /**
     * What kind of thing the decision is about, namespaced by its use case —
     * e.g. `playwright:test_case`. The value is opaque to this package.
     */
    subjectType: text('subject_type').notNull(),
    /**
     * The subject's id in whichever table the use case owns. Intentionally
     * `text` and intentionally not a foreign key; see the file comment.
     */
    subjectId: text('subject_id'),
    /** Human-readable subject, for report tables and failure messages. */
    subjectLabel: text('subject_label').notNull(),
    /**
     * The identity dimensions the use case groups by — for Playwright, project,
     * configuration, suite and test. Kept as JSON because the dimensions differ
     * per use case, and because every consumer aggregates in memory rather than
     * with SQL `GROUP BY`.
     */
    subjectKeys: jsonb('subject_keys').$type<Record<string, string>>().notNull().default({}),

    dataOrigin: text('data_origin').$type<DataOrigin>().notNull(),
    /**
     * The question that was asked, e.g. `failure_triage`. Free text: the
     * vocabulary belongs to the use case, not to infra.
     */
    decisionType: text('decision_type').notNull(),

    provider: text('provider').$type<DecisionProvider>().notNull(),
    model: text('model').notNull(),

    category: text('category'),
    score: real('score'),
    noul: real('noul'),
    confidence: real('confidence'),
    recommendedAction: text('recommended_action'),

    /**
     * Which field the confidence gate routed on, and its value. Promoted to
     * columns because engines do not share a confidence scale, so a later
     * comparison across engines must not have to guess which scale produced an
     * action — nor dig it out of `result`.
     */
    routingSignal: text('routing_signal'),
    routingValue: real('routing_value'),

    /** The engine's full answer, exactly as returned. */
    result: jsonb('result').$type<Record<string, unknown>>().notNull(),

    inputTokens: integer('input_tokens').notNull().default(0),
    outputTokens: integer('output_tokens').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('decisions_data_origin_check', sql.raw(`"decisions"."data_origin" IN (${originList})`)),
    index('idx_decisions_subject').on(table.subjectType, table.subjectId, table.createdAt),
    index('idx_decisions_origin_created').on(table.dataOrigin, table.decisionType, table.createdAt),
    index('idx_decisions_provider').on(table.provider, table.decisionType, table.createdAt),
  ],
);

export const decisionStoreSchema = { decisions };

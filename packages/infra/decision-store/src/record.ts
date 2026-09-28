/**
 * Writing and reading decisions, without knowing what they are about.
 *
 * A use case describes its subject once, through {@link DecisionSubject}, and
 * never hand-writes the table's columns. That keeps the column set free to change
 * here without every use case being edited, and it is the only sanctioned write
 * path into the table.
 */
import { desc, eq } from 'drizzle-orm';
import type { TokenUsage } from '@sysone/decision-core';
import type { Database, DecisionWriter } from './client.js';
import { decisions, type DataOrigin, type DecisionProvider } from './schema.js';

/** What a decision is about. */
export interface DecisionSubject {
  /** Namespaced kind, e.g. `playwright:test_case`. */
  readonly type: string;
  /** The subject's id in the use case's own table, when it has one. */
  readonly id?: string | undefined;
  /** Human-readable label for reports and messages. */
  readonly label: string;
  /** Identity dimensions this use case aggregates by. */
  readonly keys?: Record<string, string>;
}

/** One decision, ready to persist. */
export interface DecisionInput {
  readonly subject: DecisionSubject;
  readonly dataOrigin: DataOrigin;
  readonly decisionType: string;
  readonly provider: DecisionProvider;
  readonly model: string;
  readonly category?: string | undefined;
  readonly score?: number | undefined;
  readonly noul?: number | undefined;
  readonly confidence?: number | undefined;
  readonly recommendedAction?: string | undefined;
  readonly routingSignal?: string | undefined;
  readonly routingValue?: number | undefined;
  readonly result: Record<string, unknown>;
  /** Absent means zero, which is what a fixture or a provider without usage reporting has. */
  readonly usage?: TokenUsage | undefined;
}

/** Column values for one decision. Exported for callers batching their own insert. */
export function decisionValues(input: DecisionInput): typeof decisions.$inferInsert {
  return {
    subjectType: input.subject.type,
    subjectId: input.subject.id,
    subjectLabel: input.subject.label,
    subjectKeys: input.subject.keys ?? {},
    dataOrigin: input.dataOrigin,
    decisionType: input.decisionType,
    provider: input.provider,
    model: input.model,
    category: input.category,
    score: input.score,
    noul: input.noul,
    confidence: input.confidence,
    recommendedAction: input.recommendedAction,
    routingSignal: input.routingSignal,
    routingValue: input.routingValue,
    result: input.result,
    inputTokens: input.usage?.input_tokens ?? 0,
    outputTokens: input.usage?.output_tokens ?? 0,
  };
}

/**
 * Persists one decision.
 *
 * Takes a {@link DecisionWriter} rather than a `Database`, so the caller can pass
 * a transaction: a use case that persists its own evidence and the decision about
 * it must be able to do both atomically.
 */
export async function recordDecision(writer: DecisionWriter, input: DecisionInput): Promise<void> {
  await writer.insert(decisions).values(decisionValues(input));
}

/** Persists many decisions in one statement. A no-op on an empty list. */
export async function recordDecisions(
  writer: DecisionWriter,
  inputs: readonly DecisionInput[],
): Promise<void> {
  if (inputs.length === 0) return;
  await writer.insert(decisions).values(inputs.map(decisionValues));
}

/** Every persisted decision, newest first, optionally narrowed to one origin. */
export async function loadDecisions(
  db: Database,
  origin?: DataOrigin,
): Promise<Array<typeof decisions.$inferSelect>> {
  const query = db.select().from(decisions);
  const rows = origin ? await query.where(eq(decisions.dataOrigin, origin)) : await query;
  return rows.sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());
}

/** Decisions about one subject, newest first. */
export async function loadDecisionsForSubject(
  db: Database,
  subjectId: string,
): Promise<Array<typeof decisions.$inferSelect>> {
  return db.select().from(decisions).where(eq(decisions.subjectId, subjectId)).orderBy(desc(decisions.createdAt));
}

/**
 * The System One wire protocol (`POST /v1/systemone`).
 *
 * These are the shapes every provider must speak. They are declared separately
 * from the transport and from provider selection so that policy modules (the
 * confidence gate, triage) can depend on the protocol without pulling in a
 * client or a registry.
 */

export type QuestionType = 'choice' | 'score' | 'noul';

export interface ChoiceQuestion {
  type: 'choice';
  instructions: string | Record<string, unknown>;
  criteria: Record<string, string | Record<string, unknown> | null>;
}

export interface ScoreQuestion {
  type: 'score';
  instructions: string | Record<string, unknown>;
  criteria: Array<string | Record<string, unknown>>;
}

export interface NoulQuestion {
  type: 'noul';
  instructions: string | Record<string, unknown>;
  criteria?: { true?: string | Record<string, unknown>; false?: string | Record<string, unknown> };
}

export type Question = ChoiceQuestion | ScoreQuestion | NoulQuestion;

export interface ChoiceAnswer {
  type: 'choice';
  choice: string;
  probabilities: Record<string, number>;
  confidence: number;
}

export interface ScoreAnswer {
  type: 'score';
  score: number;
  legend: Record<string, string>;
  probabilities: Record<string, number>;
  confidence: number;
}

/**
 * A Noul carries a bare probability and no independent confidence. Engines that
 * also return a `confidence` on this primitive only restate `max(p, 1 - p)`, so
 * it is deliberately absent here: a Noul must never be gated with a
 * Choice-style confidence threshold.
 */
export interface NoulAnswer {
  type: 'noul';
  noul: number;
}

export type Answer = ChoiceAnswer | ScoreAnswer | NoulAnswer;

export interface TokenUsage {
  input_tokens: number;
  output_tokens: number;
}

export interface SystemOneRequest {
  state: string | Record<string, unknown> | unknown[];
  model?: string;
  questions: Record<string, Question>;
}

export interface SystemOneResponse<TQuestionIds extends string = string> {
  model: string;
  answers: Record<TQuestionIds, Answer>;
  usage: TokenUsage;
  /**
   * Optional across providers: engines that route between checkpoints report
   * which one answered. Consumers must treat this as absent by default.
   */
  routing?: { model?: string; repo?: string; reason?: string };
}

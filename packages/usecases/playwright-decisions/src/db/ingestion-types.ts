import type { DecisionProviderId, TokenUsage } from '@sysone/decision-core';
import type { TriageVerdict } from '../triage/types.js';

export interface RunMetadata {
  runId: string;
  pipelineId: string;
  jobId?: string;
  branch: string;
  commitSha?: string;
  projectId: string;
  projectConfiguration: string;
  app?: string;
  squadName?: string;
  triggeredAt: Date;
  completedAt: Date;
}

export interface CapturedTestResult {
  testId: string;
  projectName: string;
  title: string;
  suiteName: string;
  status: 'passed' | 'failed' | 'skipped';
  durationMs: number;
  retryCount: number;
  errorMessage?: string;
  /** Normalised clustering key derived from the raw error text. */
  errorSignature?: string;
  stackTrace?: string;
  sourceFile: string;
  sourceLine?: number;
  sourceColumn?: number;
  annotations: Array<{ type: string; description?: string }>;
  tags: string[];
}

export interface CompletedTriageDecision {
  testId: string;
  verdict: TriageVerdict;
  provider: DecisionProviderId;
  model: string;
  usage: TokenUsage;
}

export interface IngestRunInput {
  metadata: RunMetadata;
  tests: CapturedTestResult[];
  decisions: CompletedTriageDecision[];
}

export interface IngestedRun {
  id: string;
  projectName: string;
  projectConfiguration: string;
  testCount: number;
}

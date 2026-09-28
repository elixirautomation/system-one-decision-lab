/**
 * Playwright-specific result capture.
 *
 * Isolated from the reporter so the reporter orchestrates and this module owns
 * the single job of translating Playwright's `TestCase`/`TestResult` pair into
 * the persistence and triage shapes.
 */
import path from 'node:path';
import type { TestCase, TestResult } from '@playwright/test/reporter';
import type { CapturedTestResult } from '../db/ingestion-types.js';
import { deriveErrorSignature, stripAnsi } from '../triage/error-text.js';
import type { FailedTestCase } from '../triage/types.js';
import { buildSuiteName, mapPlaywrightStatus } from './mapping.js';

const MAX_LOG_LINES = 10;
const MAX_STACK_LINES = 15;

export interface FinalResult {
  test: TestCase;
  result: TestResult;
  captured: CapturedTestResult;
}

function relativeSourceFile(file: string): string {
  return path.relative(process.cwd(), file) || file;
}

/**
 * Playwright colours assertion output, so the raw message carries ANSI escape
 * sequences. They are stripped here, at the single point where runner output
 * enters this codebase, so nothing downstream — database, report, or the
 * evidence sent to a decision engine — ever has to deal with them.
 */
function cleanErrorText(value: string | undefined): string | undefined {
  return value === undefined ? undefined : stripAnsi(value);
}

export function captureFinalResult(test: TestCase, result: TestResult): CapturedTestResult {
  const projectName = test.parent.project()?.name ?? 'default';
  return {
    testId: test.id,
    projectName,
    title: test.title,
    suiteName: buildSuiteName(test.location.file, test.titlePath(), projectName),
    status: mapPlaywrightStatus(result.status),
    durationMs: result.duration,
    retryCount: result.retry,
    errorMessage: cleanErrorText(result.error?.message),
    errorSignature: deriveErrorSignature(result.error?.message) ?? undefined,
    stackTrace: cleanErrorText(result.error?.stack),
    sourceFile: relativeSourceFile(test.location.file),
    sourceLine: test.location.line,
    sourceColumn: test.location.column,
    annotations: test.annotations.map((annotation) => ({
      type: annotation.type,
      ...(annotation.description ? { description: annotation.description } : {}),
    })),
    tags: test.tags,
  };
}

/** Narrows a captured failure to the bounded evidence a decision engine sees. */
export function toFailedTest(result: FinalResult): FailedTestCase {
  const logLines = [...result.result.stdout, ...result.result.stderr]
    .map((entry) => (typeof entry === 'string' ? entry : entry.toString('utf-8')))
    .filter(Boolean)
    .slice(-MAX_LOG_LINES);

  return {
    testId: result.captured.testId,
    title: result.captured.title,
    file: result.captured.sourceFile,
    status: result.result.status,
    retryCount: result.captured.retryCount,
    durationMs: result.captured.durationMs,
    errorMessage: result.captured.errorMessage ?? '(no error message captured)',
    stackTraceExcerpt: (result.captured.stackTrace ?? '').split('\n').slice(0, MAX_STACK_LINES).join('\n'),
    recentLogLines: logLines,
  };
}

/**
 * Keeps the highest-retry attempt per test, which is the outcome Playwright
 * itself reports as final.
 */
export class FinalResultCollector {
  private readonly byTestId = new Map<string, FinalResult>();

  record(test: TestCase, result: TestResult): void {
    const previous = this.byTestId.get(test.id);
    if (previous && result.retry < previous.result.retry) return;
    this.byTestId.set(test.id, { test, result, captured: captureFinalResult(test, result) });
  }

  all(): FinalResult[] {
    return [...this.byTestId.values()];
  }

  failures(): FinalResult[] {
    return this.all().filter((entry) => entry.captured.status === 'failed');
  }
}

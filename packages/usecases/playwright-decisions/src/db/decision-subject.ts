/**
 * How this use case describes what a decision is about.
 *
 * The shared `decisions` table stores a subject as a type, an opaque id, a label
 * and a bag of identity keys. Building that shape lives here, in one place, so the
 * three write paths — live triage, the historical experiments, and the seed —
 * cannot drift into describing the same subject three different ways.
 *
 * The keys are this lab's logical test identity, the same four dimensions the
 * flakiness baseline uses: project, effective configuration, suite and test.
 */
import type { DecisionSubject } from '@sysone/decision-store';
import { PLAYWRIGHT_TEST_CASE_SUBJECT } from './schema.js';

export interface TestIdentity {
  readonly projectId: string;
  readonly projectConfiguration: string;
  readonly suiteName: string;
  readonly testName: string;
}

/** A decision about one persisted `test_cases` row. */
export function testCaseSubject(identity: TestIdentity, testCaseId?: string): DecisionSubject {
  return {
    type: PLAYWRIGHT_TEST_CASE_SUBJECT,
    id: testCaseId,
    label: `${identity.suiteName} > ${identity.testName}`,
    keys: {
      projectId: identity.projectId,
      projectConfiguration: identity.projectConfiguration,
      suiteName: identity.suiteName,
      testName: identity.testName,
    },
  };
}

/**
 * Reads the identity back out of a persisted row.
 *
 * Tolerant of a missing key so that a decision written by another use case, or by
 * an older schema, renders as `unknown` rather than crashing the report.
 */
export function readTestIdentity(keys: Record<string, string>): TestIdentity {
  return {
    projectId: keys.projectId ?? 'unknown',
    projectConfiguration: keys.projectConfiguration ?? 'unknown',
    suiteName: keys.suiteName ?? 'unknown',
    testName: keys.testName ?? 'unknown',
  };
}

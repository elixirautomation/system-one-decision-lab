/**
 * Run artifacts written to disk: the triage payload and the run manifest.
 *
 * Kept apart from the reporter so filesystem layout is defined in one place and
 * the reporter stays free of path literals.
 *
 * Every path is per-run, keyed by the run id, so two concurrent runs cannot
 * overwrite each other's evidence. `test-results/decision-run.json` is kept as a
 * convenience pointer to the most recently finished run -- handy for a single
 * local run, and deliberately not the authoritative copy, since the last of two
 * overlapping runs to finish wins it. The copy inside the run's own directory is
 * the one that is always attributable.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { DecisionRunManifest, TriagedFailure } from '../triage/types.js';
import { runOutputDirectory, TEST_RESULTS_ROOT } from './run-identity.js';

export const TEST_RESULTS_DIR = TEST_RESULTS_ROOT;
export const TRIAGE_OUTPUT_DIR = 'triage-output';
export const RUN_MANIFEST_FILE = 'decision-run.json';

export interface WrittenManifest {
  /** The authoritative copy, inside this run's own output directory. */
  readonly runPath: string;
  /** Pointer to the latest finished run, at the documented stable location. */
  readonly latestPath: string;
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

/** Returns the written path, or null when there was nothing to triage. */
export async function writeTriageOutput(
  runId: string,
  failures: TriagedFailure[],
): Promise<string | null> {
  if (failures.length === 0) return null;
  const outputPath = path.join(TRIAGE_OUTPUT_DIR, `triage-${runId}.json`);
  await writeJson(outputPath, failures);
  return outputPath;
}

export async function writeRunManifest(
  runId: string,
  manifest: DecisionRunManifest,
): Promise<WrittenManifest> {
  const runPath = path.join(runOutputDirectory(runId), RUN_MANIFEST_FILE);
  const latestPath = path.join(TEST_RESULTS_DIR, RUN_MANIFEST_FILE);

  await writeJson(runPath, manifest);
  await writeJson(latestPath, manifest);

  return { runPath, latestPath };
}

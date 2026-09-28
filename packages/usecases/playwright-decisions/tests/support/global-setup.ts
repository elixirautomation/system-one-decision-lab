/**
 * Playwright `globalSetup`.
 *
 * Announces which directory this run owns, and creates it before any worker
 * needs it. Nothing here blocks: runs are isolated by directory, so a second run
 * started while this one is in flight is expected to proceed normally.
 *
 * The id is resolved (and published to the workers through the environment) by
 * `src/reporter/run-identity.ts`, which the config has already called to set
 * `outputDir`; this only reads it back.
 */
import { mkdir } from 'node:fs/promises';
import { resolveRunId, runOutputDirectory } from '../../src/reporter/run-identity.js';

export default async function globalSetup(): Promise<void> {
  const runId = resolveRunId();
  const outputDirectory = runOutputDirectory(runId);
  await mkdir(outputDirectory, { recursive: true });
  console.log(`[decision-lab] Run ${runId} · artifacts in ${outputDirectory}`);
}

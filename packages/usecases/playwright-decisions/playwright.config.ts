import { defineConfig, devices, type Project } from '@playwright/test';
import { loadLabEnv } from '@sysone/config';
import { resolveRunId, runOutputDirectory } from './src/reporter/run-identity.js';
import { AUTH_STATE_PATH, hasCredentials, SITE_ORIGIN } from './tests/support/site';

// Loaded explicitly because Yarn runs this package's scripts with the package
// directory as cwd, where a bare `dotenv/config` would find no file at all.
loadLabEnv();

const projects: Project[] = [
  {
    name: 'chromium-anonymous',
    testMatch: /login-flow\.spec\.ts$/,
    use: {
      ...devices['Desktop Chrome'],
      viewport: { width: 1920, height: 1080 },
      storageState: undefined,
    },
  },
];

if (hasCredentials()) {
  projects.push(
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts$/,
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
    {
      name: 'chromium-authenticated',
      testMatch: /authenticated-.*\.spec\.ts$/,
      dependencies: ['setup'],
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
        storageState: AUTH_STATE_PATH,
      },
    },
  );
}

export default defineConfig({
  testDir: './tests',
  /**
   * Per-run output directory, `test-results/run-<runId>/`.
   *
   * Playwright clears `outputDir` when a run starts, so a shared directory means
   * a second `playwright test` deletes the first one's `.playwright-artifacts-*`
   * mid-flight and every in-flight test fails at `browserContext.close` with a
   * missing `.network` file -- fabricated failures this lab would then ingest and
   * triage as real evidence. Isolating the directory lets concurrent runs
   * (`yarn e2e` beside `yarn e2e:headed`) proceed without waiting and without
   * touching each other's artifacts.
   */
  outputDir: runOutputDirectory(resolveRunId()),
  globalSetup: './tests/support/global-setup.ts',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  /**
   * Deliberately minimal. This is a decision lab, not a test-automation product:
   * the decision report is the only dashboard, so Playwright's own HTML report is
   * not generated — it produced a second, competing UI plus ~50 bundled files per
   * run. The JSON reporter is omitted too because the decision reporter writes its
   * own run manifest to test-results/decision-run.json.
   */
  reporter: [['list'], ['./src/reporter/decision-reporter.ts']],
  use: {
    baseURL: SITE_ORIGIN,
    /** The demo site exposes `data-test` hooks; `getByTestId` reads them. */
    testIdAttribute: 'data-test',
    /**
     * Failure evidence only. A trace is kept because it is what a human opens to
     * audit a decision (`npx playwright show-trace <path>`); video is not
     * captured, being the heaviest artifact and the least useful for triage.
     */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 45_000,
    viewport: { width: 1920, height: 1080 },
  },
  projects,
});

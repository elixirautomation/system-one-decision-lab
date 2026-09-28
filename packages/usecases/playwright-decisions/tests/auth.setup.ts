/**
 * Auth setup project: logs in once and persists the session to
 * `playwright/.auth/user.json`, so every test in the authenticated project
 * starts already signed in.
 *
 * This is Playwright's documented shared-account pattern:
 * https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 *
 * Credentials come from `.env` (SITE_USERNAME / SITE_PASSWORD) and are never
 * logged. The written state file contains live session cookies and is
 * gitignored.
 */
import { test as setup, expect } from '@playwright/test';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { AUTH_STATE_PATH, getCredentials } from './support/site';

setup('authenticate and persist storage state', async ({ page }) => {
  const credentials = getCredentials();
  expect(
    credentials,
    'SITE_USERNAME / SITE_PASSWORD must be set in .env to create an authenticated session',
  ).not.toBeNull();
  if (!credentials) return;

  const login = new LoginPage(page);
  const inventory = new InventoryPage(page);

  await login.goto();
  await login.login(credentials);

  const rejection = await login.readError();
  if (rejection) {
    throw new Error(
      `Login rejected: ${rejection}\n` +
        'Check that SITE_USERNAME / SITE_PASSWORD are valid for the site in BASE_URL.',
    );
  }

  await expect(inventory.title).toBeVisible();
  expect(await inventory.isLoggedIn()).toBe(true);

  await page.context().storageState({ path: AUTH_STATE_PATH });
});

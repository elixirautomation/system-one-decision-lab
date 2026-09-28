/**
 * Login-flow tests -- the cases that must exercise the login UI itself, so they
 * run in the anonymous project (no shared storageState) and start signed out.
 *
 * Kept separate from the authenticated suite by design: reusing the shared
 * storageState here would skip the very form under test.
 */
import { test, expect } from '@playwright/test';
import { InventoryPage } from './pages/InventoryPage';
import { LoginPage } from './pages/LoginPage';
import { getCredentials, INVENTORY_PATH } from './support/site';

test.describe('login flow', () => {
  let login: LoginPage;

  test.beforeEach(async ({ page }) => {
    login = new LoginPage(page);
    await login.goto();
  });

  test('login form renders its fields', async () => {
    await expect(login.usernameInput).toBeVisible();
    await expect(login.passwordInput).toBeVisible();
    await expect(login.submitButton).toBeEnabled();
    expect(await login.isLoggedIn()).toBe(false);
  });

  test('missing password is rejected before sign-in', async () => {
    await login.fillCredentials('any-user', '');
    await login.submit();
    await expect(login.errorBanner).toContainText(/password is required/i);
  });

  test('invalid credentials surface an error and stay signed out', async () => {
    await login.fillCredentials('not-a-real-user', 'definitely-wrong-000');
    await login.submit();
    await expect(login.errorBanner).toContainText(/do not match/i);
    expect(await login.isLoggedIn()).toBe(false);
  });

  test('a protected page redirects an anonymous visitor to login', async ({ page }) => {
    await page.goto(INVENTORY_PATH);
    await expect(login.usernameInput).toBeVisible();
    await expect(login.errorBanner).toContainText(/when you are logged in/i);
  });

  test('user can log in with valid credentials', async ({ page }) => {
    const credentials = getCredentials();
    test.skip(credentials === null, 'SITE_USERNAME / SITE_PASSWORD not set in .env');
    if (!credentials) return;

    await login.login(credentials);

    const inventory = new InventoryPage(page);
    await expect(
      inventory.title,
      `login did not reach the inventory; site said: ${(await login.readError()) ?? '(no banner)'}`,
    ).toBeVisible();
    expect(await inventory.isLoggedIn()).toBe(true);
  });
});

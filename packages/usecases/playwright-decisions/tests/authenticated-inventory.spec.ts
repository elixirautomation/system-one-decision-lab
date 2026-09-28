/**
 * Authenticated suite.
 *
 * Runs in the `chromium-authenticated` project, which depends on `setup` and
 * reuses the storageState written by `tests/auth.setup.ts`. Every test here
 * therefore starts already signed in, per Playwright's shared-account pattern:
 * https://playwright.dev/docs/auth#basic-shared-account-in-all-tests
 */
import { test, expect } from '@playwright/test';
import { InventoryPage } from './pages/InventoryPage';

test.describe('authenticated inventory', () => {
  let inventory: InventoryPage;

  test.beforeEach(async ({ page }) => {
    inventory = new InventoryPage(page);
    await inventory.goto();
  });

  test('session from storageState is already active', async () => {
    await expect(inventory.header).toBeVisible();
    expect(await inventory.isLoggedIn()).toBe(true);
  });

  test('product listing renders with priced items', async () => {
    await expect(inventory.items.first()).toBeVisible();
    await expect.poll(() => inventory.items.count()).toBeGreaterThan(0);
    await expect(inventory.itemPrices.first()).toHaveText(/^\$\d+\.\d{2}$/);
  });

  test('adding an item updates the cart badge', async () => {
    await inventory.addToCartButton(0).click();
    await expect(inventory.cartBadge).toHaveText('1');
  });

  test('sorting by price low to high orders the listing', async () => {
    await inventory.sortSelect.selectOption('lohi');
    const prices = await inventory.readPrices();
    expect(prices.length).toBeGreaterThan(1);
    expect(prices).toEqual([...prices].sort((a, b) => a - b));
  });
});

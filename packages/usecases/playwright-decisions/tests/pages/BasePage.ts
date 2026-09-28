/**
 * Shared base for the demo-site Page Objects.
 *
 * Holds the chrome every signed-in page shares (header, menu, cart link), so the
 * concrete pages describe only what is unique to them. Locators use the site's
 * own `data-test` hooks, which Playwright exposes through `getByTestId` once
 * `testIdAttribute` is set to `data-test` in `playwright.config.ts`.
 *
 * Replace these when you point the suite at your own application.
 */
import type { Locator, Page } from '@playwright/test';

export abstract class BasePage {
  constructor(protected readonly page: Page) { }

  /** Signed-in header. Absent on the login page. */
  get header(): Locator {
    return this.page.getByTestId('primary-header');
  }

  /** Burger menu trigger that reveals the sidebar (logout lives there). */
  get menuButton(): Locator {
    return this.page.getByRole('button', { name: 'Open Menu' });
  }

  get logoutLink(): Locator {
    return this.page.getByTestId('logout-sidebar-link');
  }

  get cartLink(): Locator {
    return this.page.getByTestId('shopping-cart-link');
  }

  /** Item count on the cart icon. Rendered only when the cart is non-empty. */
  get cartBadge(): Locator {
    return this.page.getByTestId('shopping-cart-badge');
  }

  /** True when a session is active: only signed-in pages render the header. */
  async isLoggedIn(): Promise<boolean> {
    return (await this.header.count()) > 0;
  }

  async logout(): Promise<void> {
    await this.menuButton.click();
    await this.logoutLink.click();
  }
}

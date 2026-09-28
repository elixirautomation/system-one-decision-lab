/**
 * Page Object for the demo site's login form.
 *
 * Sauce Demo validates credentials client-side and routes to the inventory on
 * success; a rejection renders a single banner at `data-test="error"`. There is
 * no login request to await, so success is defined by the inventory rendering.
 */
import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import type { SiteCredentials } from '../support/site';
import { LANDING_PATH } from '../support/site';

export class LoginPage extends BasePage {
  get usernameInput(): Locator {
    return this.page.getByTestId('username');
  }

  get passwordInput(): Locator {
    return this.page.getByTestId('password');
  }

  get submitButton(): Locator {
    return this.page.getByTestId('login-button');
  }

  /** Rejection banner (unknown account, locked-out user, missing field). */
  get errorBanner(): Locator {
    return this.page.getByTestId('error');
  }

  async goto(): Promise<void> {
    await this.page.goto(LANDING_PATH);
    await this.usernameInput.waitFor({ state: 'visible' });
  }

  async fillCredentials(username: string, password: string): Promise<void> {
    await this.usernameInput.fill(username);
    await this.passwordInput.fill(password);
  }

  async submit(): Promise<void> {
    await this.submitButton.click();
  }

  /** Fills and submits, without asserting the outcome. */
  async login(credentials: SiteCredentials): Promise<void> {
    await this.fillCredentials(credentials.username, credentials.password);
    await this.submit();
  }

  /** Best-effort read of the rejection text, for failure messages. */
  async readError(): Promise<string | null> {
    if ((await this.errorBanner.count()) === 0) return null;
    const text = await this.errorBanner.first().textContent();
    return text ? text.replace(/\s+/g, ' ').trim() : null;
  }
}

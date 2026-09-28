/**
 * Single source of truth for the site under test and its credentials.
 *
 * The default target is Sauce Demo (https://www.saucedemo.com), a public site
 * built for automation practice. Point `BASE_URL` at your own application to
 * collect real evidence; the Page Objects under `tests/pages/` are the only
 * other files that describe the target.
 *
 * `BASE_URL` may carry a path (e.g. `https://app.example.com/en/login`).
 * Playwright's `baseURL` must be the ORIGIN only -- an absolute path passed to
 * `page.goto()` replaces the whole path -- so origin and path are split here and
 * the Page Objects navigate to the path explicitly.
 *
 * `BASE_URL` and the credential vars may also be exported in the ambient shell.
 * To keep `.env` the single source of truth they are force-loaded from the file,
 * so a stale `export SITE_USERNAME=...` cannot silently shadow it.
 */
import { loadLabEnv } from '@sysone/config';

// Only these are forced to come from `.env`: a stale `export BASE_URL=...` must
// not silently shadow the file, but a one-off DECISION_PROVIDER or DATABASE_URL
// on the command line has to keep working.
loadLabEnv({ overrideKeys: ['BASE_URL', 'SITE_USERNAME', 'SITE_PASSWORD'] });

const DEFAULT_SITE_URL = 'https://www.saucedemo.com/';

const siteUrl = new URL(process.env.BASE_URL || DEFAULT_SITE_URL);

/** Origin only -- this is what Playwright's `use.baseURL` should be set to. */
export const SITE_ORIGIN = siteUrl.origin;

/** Path of the landing (login) page, e.g. `/`. */
export const LANDING_PATH = siteUrl.pathname;

/** Path of the page a signed-in user lands on. */
export const INVENTORY_PATH = '/inventory.html';

/**
 * Where the shared authenticated session is persisted.
 * Gitignored -- it contains live session cookies.
 */
export const AUTH_STATE_PATH = 'playwright/.auth/user.json';

export interface SiteCredentials {
  username: string;
  password: string;
}

/** Credentials, or `null` when they are not configured. Never logged. */
export function getCredentials(): SiteCredentials | null {
  const username = process.env.SITE_USERNAME;
  const password = process.env.SITE_PASSWORD;
  if (!username || !password) return null;
  return { username, password };
}

/** True when `.env` supplies both credential values. */
export const hasCredentials = (): boolean => getCredentials() !== null;

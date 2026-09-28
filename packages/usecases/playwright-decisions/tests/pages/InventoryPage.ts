/**
 * Page Object for the demo site's product inventory -- the page a signed-in
 * user lands on. Counts are asserted as "at least one" rather than exact, so the
 * suite keeps working if the catalogue changes.
 */
import type { Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { INVENTORY_PATH } from '../support/site';

export class InventoryPage extends BasePage {
  async goto(): Promise<void> {
    await this.page.goto(INVENTORY_PATH);
    await this.title.waitFor({ state: 'visible' });
  }

  get title(): Locator {
    return this.page.getByTestId('title');
  }

  get items(): Locator {
    return this.page.getByTestId('inventory-item');
  }

  get itemPrices(): Locator {
    return this.page.getByTestId('inventory-item-price');
  }

  get itemNames(): Locator {
    return this.page.getByTestId('inventory-item-name');
  }

  get sortSelect(): Locator {
    return this.page.getByTestId('product-sort-container');
  }

  /** "Add to cart" button of the nth item. */
  addToCartButton(index = 0): Locator {
    return this.items.nth(index).getByRole('button', { name: /add to cart/i });
  }

  /** Displayed prices as numbers, in DOM order. */
  async readPrices(): Promise<number[]> {
    const texts = await this.itemPrices.allTextContents();
    return texts.map((text) => Number.parseFloat(text.replace(/[^0-9.]/g, '')));
  }
}

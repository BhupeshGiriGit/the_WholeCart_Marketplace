import { Page, Locator, expect } from '@playwright/test';
import { lastMoney } from '../utils/helpers';

export class CartPage {
  readonly rows: Locator;
  readonly checkoutBtn: Locator;
  readonly emptyMsg: Locator;

  constructor(private page: Page) {
    this.rows = page.locator('table tbody tr');
    this.checkoutBtn = page.getByRole('button', { name: /checkout|place order/i })
      .or(page.getByRole('link', { name: /checkout/i }));
    this.emptyMsg = page.getByText(/cart is empty|no items/i);
  }

  async goto() {
    await this.page.goto('cart');
  }

  rowFor(productName: string): Locator {
    return this.rows.filter({ hasText: productName });
  }

  async setQty(productName: string, qty: number) {
    const row = this.rowFor(productName);
    await row.getByRole('spinbutton').fill(String(qty));
    const update = row.getByRole('button', { name: /update/i });
    if (await update.count()) await update.click();
    else await row.getByRole('spinbutton').press('Enter');
  }

  async remove(productName: string) {
    await this.rowFor(productName).getByRole('button', { name: /remove|delete/i }).click();
  }

  /** Reads an amount next to a label such as "Subtotal", "Tax", "Total" */
  async amount(label: RegExp): Promise<number> {
    const el = this.page.getByText(label).last().locator('xpath=..');
    return lastMoney(await el.innerText());
  }

  async checkout() {
    await this.checkoutBtn.click();
  }

  async expectEmpty() {
    await expect(this.emptyMsg.or(this.rows.first()).first()).toBeVisible();
    await expect(this.rows.filter({ hasText: /₹/ })).toHaveCount(0);
  }
}
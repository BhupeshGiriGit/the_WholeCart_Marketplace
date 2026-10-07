import { Page, Locator, expect } from '@playwright/test';

class ProductPage {
  readonly title: Locator;
  readonly qtyInput: Locator;
  readonly addToCartBtn: Locator;
  readonly toast: Locator;

  constructor(private page: Page) {
    this.title = page.getByRole('heading').first();
    this.qtyInput = page.getByRole('spinbutton').first();
    this.addToCartBtn = page.getByRole('button', { name: /add to cart/i });
    this.toast = page.getByRole('status').or(page.getByText(/added to cart/i));
  }

  /** unit: 'piece' | 'case' – only used if the page exposes a unit selector */
  async addToCart(qty: number, unit?: 'piece' | 'case') {
    if (unit) {
      const radio = this.page.getByRole('radio', { name: new RegExp(unit, 'i') });
      const select = this.page.getByRole('combobox').first();
      if (await radio.count()) await radio.check();
      else if (await select.count()) await select.selectOption({ label: unit }).catch(() => select.selectOption(unit));
    }
    await this.qtyInput.fill(String(qty));
    await this.addToCartBtn.click();
  }

  async expectAdded() {
    await expect(this.toast.first()).toBeVisible();
  }
}
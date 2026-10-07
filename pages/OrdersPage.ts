import { Page, Locator } from '@playwright/test';

export class OrdersPage {
  readonly rows: Locator;
  constructor(private page: Page) {
    this.rows = page.locator('table tbody tr');
  }
  async goto() { await this.page.goto('orders'); }
  async latestOrderText() { return (await this.rows.first().innerText()).trim(); }
  async openLatest() { await this.rows.first().getByRole('link').first().click(); }
}
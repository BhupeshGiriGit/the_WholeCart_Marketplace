import { Page, Locator } from '@playwright/test';

export class InvoicesPage {
  readonly rows: Locator;
  constructor(private page: Page) {
    this.rows = page.locator('table tbody tr');
  }
  async goto() { await this.page.goto('invoices'); }
  async latestInvoiceText() { return (await this.rows.first().innerText()).trim(); }
  async downloadLatest() {
    const [download] = await Promise.all([
      this.page.waitForEvent('download'),
      this.rows.first().getByRole('link', { name: /download|pdf|view/i }).first().click(),
    ]);
    return download;
  }
}
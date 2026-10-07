import { Page, Locator, expect } from '@playwright/test';
import { parseMoney, parseCase } from '../utils/helpers';

export interface CatalogueRow {
  sku: string; name: string; category: string;
  piecePrice: number; caseUnits: number; casePrice: number; taxPercent: number;
}

export class CataloguePage {
  readonly heading: Locator;
  readonly searchInput: Locator;
  readonly categorySelect: Locator;
  readonly searchButton: Locator;
  readonly summary: Locator;
  readonly headers: Locator;
  readonly rows: Locator;
  readonly pageIndicator: Locator;
  readonly nextLink: Locator;
  readonly prevLink: Locator;

  constructor(private page: Page) {
    this.heading = page.getByRole('heading', { name: 'Catalogue' });
    this.searchInput = page.getByPlaceholder('Search name or SKU');
    this.categorySelect = page.getByRole('combobox');
    this.searchButton = page.getByRole('button', { name: 'Search' });
    this.summary = page.getByText(/\d+ products?/i).first();
    this.headers = page.locator('table thead th');
    this.rows = page.locator('table tbody tr');
    this.pageIndicator = page.getByText(/Page \d+ of \d+/);
    this.nextLink = page.getByRole('link', { name: 'Next' });
    this.prevLink = page.getByRole('link', { name: /Prev(ious)?/i });
  }

  async goto() {
    await this.page.goto('catalogue');
    await expect(this.heading).toBeVisible();
  }

  async search(term: string) {
    await this.searchInput.fill(term);
    await this.searchButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async filterCategory(label: string) {
    await this.categorySelect.selectOption({ label });
    await this.searchButton.click();
    await this.page.waitForLoadState('domcontentloaded');
  }

  async totalProducts(): Promise<number> {
    const t = (await this.summary.innerText()).replace(/,/g, '');
    return Number(t.match(/(\d+)\s+products?/i)![1]);
  }

  async pageInfo() {
    const t = await this.pageIndicator.innerText();
    const m = t.match(/Page (\d+) of (\d+)/)!;
    return { current: Number(m[1]), total: Number(m[2]) };
  }

  async getRows(): Promise<CatalogueRow[]> {
    const raw: string[][] = await this.rows.evaluateAll(trs =>
      trs.map(tr => Array.from(tr.querySelectorAll('td')).map(td => (td as HTMLElement).innerText.trim())),
    );
    return raw.filter(c => c.length >= 6).map(c => {
      const cs = parseCase(c[4]);
      return {
        sku: c[0], name: c[1], category: c[2],
        piecePrice: parseMoney(c[3]), caseUnits: cs.units, casePrice: cs.price,
        taxPercent: Number(c[5].replace('%', '')),
      };
    });
  }

  async openProduct(name: string) {
    await this.page.getByRole('link', { name, exact: true }).click();
  }

  async openFirstProduct(): Promise<string> {
    const link = this.rows.first().getByRole('link');
    const name = (await link.innerText()).trim();
    await link.click();
    return name;
  }
}
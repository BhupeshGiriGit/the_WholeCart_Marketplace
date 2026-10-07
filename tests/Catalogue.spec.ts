
import { expect, test } from '../Fixtures/fixtures';
import { CASE_DISCOUNT, CATEGORIES, CATEGORY_TAX, round2 } from '../helpers/helpers';

test.describe('Catalogue – layout', () => {
  test('page loads with header, nav, search controls', async ({ page, catalogue }) => {
    await expect(page).toHaveURL(/\/catalogue/);
    await expect(page.getByText('WholeCart')).toBeVisible();
    for (const n of ['Catalogue', 'Cart', 'Orders', 'Invoices'])
      await expect(page.getByRole('link', { name: n })).toBeVisible();
    await expect(catalogue.searchInput).toBeVisible();
    await expect(catalogue.categorySelect).toHaveValue('');       // "All categories" default
    await expect(catalogue.searchButton).toBeEnabled();
    await expect(page.getByText(/prices exclude tax/i)).toBeVisible();
  });

  test('table has expected columns', async ({ catalogue }) => {
    await expect(catalogue.headers).toHaveText(['SKU', 'Product', 'Category', 'Piece', 'Case', 'Tax']);
  });

  test('shows 542 products over 23 pages, 24 rows on page 1', async ({ catalogue }) => {
    expect(await catalogue.totalProducts()).toBe(542);
    expect(await catalogue.pageInfo()).toEqual({ current: 1, total: 23 });
    await expect(catalogue.rows).toHaveCount(24);
  });

  test('all category options are present', async ({ catalogue }) => {
    const opts = await catalogue.categorySelect.locator('option').allInnerTexts();
    expect(opts[0]).toMatch(/all categories/i);
    for (const c of CATEGORIES) expect(opts).toContain(c);
  });
});

test.describe('Catalogue – data integrity', () => {
  test('row format: SKU, price, tax', async ({ catalogue }) => {
    for (const r of await catalogue.getRows()) {
      expect(r.sku).toMatch(/^SKU-\d{4}$/);
      expect(r.name.length).toBeGreaterThan(0);
      expect(r.piecePrice).toBeGreaterThan(0);
      expect([5, 18]).toContain(r.taxPercent);
    }
  });

  test('tax rate matches category', async ({ catalogue }) => {
    for (const r of await catalogue.getRows())
      expect.soft(r.taxPercent, `${r.sku} ${r.category}`).toBe(CATEGORY_TAX[r.category]);
  });

  test('case price = units × piece × (1 − 8% discount)', async ({ catalogue }) => {
    for (const r of await catalogue.getRows()) {
      const expected = round2(r.caseUnits * r.piecePrice * (1 - CASE_DISCOUNT));
      expect.soft(r.casePrice, r.sku).toBeCloseTo(expected, 1);
    }
  });

  test('case pack sizes are 6, 12 or 24', async ({ catalogue }) => {
    for (const r of await catalogue.getRows()) expect([6, 12, 24]).toContain(r.caseUnits);
  });

  test('rows are sorted alphabetically by product name', async ({ catalogue }) => {
    const names = (await catalogue.getRows()).map(r => r.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });
});

test.describe('Catalogue – search', () => {
  test('search by exact SKU returns that product only', async ({ catalogue }) => {
    const target = (await catalogue.getRows())[0];
    await catalogue.search(target.sku);
    const rows = await catalogue.getRows();
    expect(rows).toHaveLength(1);
    expect(rows[0].sku).toBe(target.sku);
  });

  test('search by name is case-insensitive and partial', async ({ catalogue }) => {
    for (const term of ['banana', 'BANANA', 'ban']) {
      await catalogue.goto();
      await catalogue.search(term);
      const rows = await catalogue.getRows();
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.some(r => /banana chips/i.test(r.name))).toBeTruthy();
    }
  });

  test('no match shows zero results', async ({ catalogue }) => {
    await catalogue.search('zzzxxqq-nothing');
    await expect(catalogue.rows.filter({ hasText: /SKU-/ })).toHaveCount(0);
    await expect(catalogue.summary).toContainText(/^0 products?/i);
  });

  test('whitespace and empty search keep full list', async ({ catalogue }) => {
    await catalogue.search('   ');
    expect(await catalogue.totalProducts()).toBe(542);
    await catalogue.search('');
    expect(await catalogue.totalProducts()).toBe(542);
  });

  test('special characters / XSS payload are handled safely', async ({ page, catalogue }) => {
    let dialog = false;
    page.on('dialog', d => { dialog = true; d.dismiss(); });
    for (const p of [`<script>alert(1)</script>`, `' OR 1=1 --`, `%`, `Chef's`]) {
      await catalogue.search(p);
      await expect(page.getByRole('heading', { name: 'Catalogue' })).toBeVisible();
    }
    expect(dialog).toBe(false);
  });

  test('search term is retained in input after submit', async ({ catalogue }) => {
    await catalogue.search('Paneer');
    await expect(catalogue.searchInput).toHaveValue('Paneer');
  });

  test('Enter key submits search', async ({ catalogue }) => {
    await catalogue.searchInput.fill('Butter');
    await catalogue.searchInput.press('Enter');
    const rows = await catalogue.getRows();
    expect(rows.every(r => /butter/i.test(r.name + r.sku))).toBeTruthy();
  });
});

test.describe('Catalogue – category filter', () => {
  for (const cat of CATEGORIES) {
    test(`filter by ${cat}`, async ({ catalogue }) => {
      await catalogue.filterCategory(cat);
      const rows = await catalogue.getRows();
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) {
        expect(r.category).toBe(cat);
        expect(r.taxPercent).toBe(CATEGORY_TAX[cat]);
      }
    });
  }

  test('search + category combined', async ({ catalogue }) => {
    await catalogue.categorySelect.selectOption({ label: 'Dairy' });
    await catalogue.search('Paneer');
    const rows = await catalogue.getRows();
    expect(rows.length).toBeGreaterThan(0);
    for (const r of rows) { expect(r.category).toBe('Dairy'); expect(r.name).toMatch(/paneer/i); }
  });

  test('category with non-matching search returns nothing', async ({ catalogue }) => {
    await catalogue.categorySelect.selectOption({ label: 'Dairy' });
    await catalogue.search('Cola');
    await expect(catalogue.rows.filter({ hasText: /SKU-/ })).toHaveCount(0);
  });

  test('reset to All categories restores full list', async ({ catalogue }) => {
    await catalogue.filterCategory('Oils');
    await catalogue.filterCategory('All categories');
    expect(await catalogue.totalProducts()).toBe(542);
  });
});

test.describe('Catalogue – pagination', () => {
  test('Next / Previous work', async ({ catalogue }) => {
    const first = (await catalogue.getRows()).map(r => r.sku);
    await expect(catalogue.prevLink).toHaveCount(0);             // no Prev on page 1
    await catalogue.nextLink.click();
    expect((await catalogue.pageInfo()).current).toBe(2);
    const second = (await catalogue.getRows()).map(r => r.sku);
    expect(second).not.toEqual(first);
    await catalogue.prevLink.click();
    expect((await catalogue.pageInfo()).current).toBe(1);
    expect((await catalogue.getRows()).map(r => r.sku)).toEqual(first);
  });

  test('walk all 23 pages: 542 unique SKUs, no Next on last page', async ({ catalogue }) => {
    test.setTimeout(180_000);
    const seen = new Set<string>();
    const { total } = await catalogue.pageInfo();
    for (let p = 1; p <= total; p++) {
      const rows = await catalogue.getRows();
      rows.forEach(r => { expect(seen.has(r.sku), `dup ${r.sku}`).toBe(false); seen.add(r.sku); });
      if (p < total) await catalogue.nextLink.click();
    }
    expect(seen.size).toBe(542);
    await expect(catalogue.nextLink).toHaveCount(0);
    expect((await catalogue.getRows()).length).toBe(542 - 24 * 22);   // last page remainder
  });

  test('pagination resets when searching', async ({ catalogue }) => {
    await catalogue.nextLink.click();
    await catalogue.search('Chef');
    expect((await catalogue.pageInfo()).current).toBe(1);
  });
});

test.describe('Catalogue – navigation', () => {
  test('product link opens detail page', async ({ page, catalogue }) => {
    const name = await catalogue.openFirstProduct();
    await expect(page).not.toHaveURL(/\/catalogue$/);
    await expect(page.getByText(name).first()).toBeVisible();
  });

  for (const [label, path] of [['Cart', /cart/], ['Orders', /orders/], ['Invoices', /invoices/]] as const) {
    test(`nav → ${label}`, async ({ page }) => {
      await page.getByRole('link', { name: label }).click();
      await expect(page).toHaveURL(path);
    });
  }

  test('browser back returns to filtered catalogue state', async ({ page, catalogue }) => {
    await catalogue.filterCategory('Spices');
    await catalogue.openFirstProduct();
    await page.goBack();
    expect((await catalogue.getRows()).every(r => r.category === 'Spices')).toBeTruthy();
  });
});

test.describe('Catalogue – security', () => {
  test('unauthenticated user is redirected away from catalogue', async ({ browser }: { browser: import('@playwright/test').Browser }) => {
    const ctx = await browser.newContext({ baseURL: 'http://13.200.185.1/c/bhupesh-182de4/' });
    const p = await ctx.newPage();
    await p.goto('catalogue');
    await expect(p.getByRole('heading', { name: 'Catalogue' })).toHaveCount(0);   // adjust if app allows guests
    await ctx.close();
  });
});
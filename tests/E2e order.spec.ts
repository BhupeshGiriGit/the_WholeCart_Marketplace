import { test, expect } from '../fixtures';
import { round2 } from '../utils/helpers';

test.describe('Cart', () => {
  test('empty cart state', async ({ cart }) => {
    await cart.goto();
    await cart.expectEmpty();
  });

  test('add from product page, update qty, remove', async ({ catalogue, product, cart }) => {
    const [row] = await catalogue.getRows();
    await catalogue.openProduct(row.name);
    await product.addToCart(2);
    await product.expectAdded();

    await cart.goto();
    await expect(cart.rowFor(row.name)).toBeVisible();
    await expect(cart.rowFor(row.name).getByRole('spinbutton')).toHaveValue('2');

    await cart.setQty(row.name, 5);
    await expect(cart.rowFor(row.name).getByRole('spinbutton')).toHaveValue('5');

    await cart.remove(row.name);
    await expect(cart.rowFor(row.name)).toHaveCount(0);
  });

  test('invalid quantities (0, negative) are rejected', async ({ catalogue, product, page, cart }) => {
    const [row] = await catalogue.getRows();
    await catalogue.openProduct(row.name);
    const productUrl = page.url();
    for (const bad of [0, -3]) {
      await page.goto(productUrl);
      await product.addToCart(bad);
      await cart.goto();
      await expect(cart.rowFor(row.name)).toHaveCount(0);
    }
  });

  test('cart persists after reload', async ({ catalogue, product, cart, page }) => {
    const [row] = await catalogue.getRows();
    await catalogue.openProduct(row.name);
    await product.addToCart(1);
    await cart.goto();
    await page.reload();
    await expect(cart.rowFor(row.name)).toBeVisible();
  });
});

test.describe('End-to-end purchase flow', () => {
  test('search → add piece + case items → verify totals → checkout → order → invoice', async ({
    catalogue, product, cart, orders, invoices, page,
  }) => {
    test.setTimeout(90_000);

    // 1. pick one 5% item (Dairy) and one 18% item (Snacks) from the catalogue
    await catalogue.filterCategory('Dairy');
    const dairy = (await catalogue.getRows())[0];
    await catalogue.filterCategory('Snacks');
    const snack = (await catalogue.getRows())[0];

    // 2. add to cart
    await test.step('add Dairy item ×2 pieces', async () => {
      await catalogue.search(dairy.sku);
      await catalogue.openProduct(dairy.name);
      await product.addToCart(2, 'piece');
      await product.expectAdded();
    });
    await test.step('add Snacks item ×1 case', async () => {
      await catalogue.goto();
      await catalogue.search(snack.sku);
      await catalogue.openProduct(snack.name);
      await product.addToCart(1, 'case');
      await product.expectAdded();
    });

    // 3. verify cart totals (catalogue prices exclude tax)
    const expSubtotal = round2(dairy.piecePrice * 2 + snack.casePrice);
    const expTax = round2(dairy.piecePrice * 2 * 0.05 + snack.casePrice * 0.18);
    const expTotal = round2(expSubtotal + expTax);

    await test.step('verify cart', async () => {
      await cart.goto();
      await expect(cart.rowFor(dairy.name)).toBeVisible();
      await expect(cart.rowFor(snack.name)).toBeVisible();
      expect(await cart.amount(/sub\s?total/i)).toBeCloseTo(expSubtotal, 1);
      expect(await cart.amount(/\btax|gst/i)).toBeCloseTo(expTax, 1);
      expect(await cart.amount(/grand total|^total/i)).toBeCloseTo(expTotal, 1);
    });

    // 4. checkout
    await test.step('checkout', async () => {
      await cart.checkout();
      // Fill address/payment here if the app asks for it, e.g.:
      // await page.getByLabel('Address').fill('Nagpur, MH');
      const place = page.getByRole('button', { name: /place order|confirm/i });
      if (await place.count()) await place.click();
      await expect(page.getByText(/order (placed|confirmed|#)|thank you/i).first()).toBeVisible();
    });

    // 5. cart cleared
    await test.step('cart is empty after order', async () => {
      await cart.goto();
      await cart.expectEmpty();
    });

    // 6. order history
    await test.step('order appears in Orders', async () => {
      await orders.goto();
      await expect(orders.rows.first()).toBeVisible();
      const text = await orders.latestOrderText();
      expect(text).toContain(expTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }));
    });

    // 7. invoice
    await test.step('invoice generated and downloadable', async () => {
      await invoices.goto();
      await expect(invoices.rows.first()).toBeVisible();
      expect(await invoices.latestInvoiceText()).toMatch(/₹|INV/i);
      const dl = await invoices.downloadLatest();
      expect(dl.suggestedFilename()).toMatch(/\.pdf$|\.html$/i);
    });
  });

  test('bulk order: add 5 items from different categories', async ({ catalogue, product, cart }) => {
    const picked: string[] = [];
    for (const cat of ['Dairy', 'Spices', 'Oils', 'Cleaning', 'Beverages']) {
      await catalogue.goto();
      await catalogue.filterCategory(cat);
      const name = (await catalogue.getRows())[0].name;
      picked.push(name);
      await catalogue.openProduct(name);
      await product.addToCart(1);
    }
    await cart.goto();
    for (const n of picked) await expect(cart.rowFor(n)).toBeVisible();
    await expect(cart.rows.filter({ hasText: /₹/ })).toHaveCount(5);
  });
});
export const parseMoney = (t: string): number => Number(t.replace(/[₹,\s]/g, ''));

/** "12 × ₹264.96" -> { units: 12, price: 264.96 } */
export const parseCase = (t: string) => {
  const m = t.match(/(\d+)\s*[×x]\s*₹?\s*([\d,]+\.\d{2})/i);
  if (!m) throw new Error(`Unexpected case format: "${t}"`);
  return { units: Number(m[1]), price: Number(m[2].replace(/,/g, '')) };
};

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/** Last ₹ amount found in a text blob */
export const lastMoney = (t: string): number => {
  const all = [...t.matchAll(/₹\s*([\d,]+(?:\.\d{1,2})?)/g)];
  if (!all.length) throw new Error(`No amount in "${t}"`);
  return Number(all[all.length - 1][1].replace(/,/g, ''));
};

// Business rules inferred from the catalogue screenshot
export const CASE_DISCOUNT = 0.08; // case price = units * piece * (1 - 8%)
export const CATEGORY_TAX: Record<string, number> = {
  Snacks: 18, Grains: 5, Spices: 5, Dairy: 5,
  Cleaning: 18, 'Aerated Drinks': 18, Oils: 5, Beverages: 18,
};
export const CATEGORIES = Object.keys(CATEGORY_TAX);
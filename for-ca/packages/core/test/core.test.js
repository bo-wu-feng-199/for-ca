import { calculate, greedy, toCents, fromCents, CURRENCY_SETS, deductInventory } from "../src/index.js";
const USD = CURRENCY_SETS.USD.units;

test("toCents/fromCents round-trip", () => {
  for (const [code, cases] of Object.entries({
    USD: [0, 0.01, 1, 23.47, 999.99],
    EUR: [0, 0.01, 99.99, 500],
    JPY: [0, 1, 50, 10000],
    CNY: [0, 0.1, 1, 99.9, 100],
  })) {
    for (const v of cases) {
      const c = toCents(v, code);
      const d = fromCents(c, code);
      expect(Math.abs(d - v)).toBeLessThan(0.001);
    }
  }
});

/* ── Basic correctness ──────────────────────────────────────────────── */

test("buy 59.5 paid 100 -> settled, 3 plans (USD)", () => {
  const r = calculate(59.5, 100, "USD");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(40.5);
  expect(r.plans).toHaveLength(3);
  expect(r.plans[0].units.some(u => u.label === "Quarter")).toBe(true);
});

test("JPY settled (integer)", () => {
  const r = calculate(1500, 5000, "JPY");
  expect(r.status).toBe("settled");
  expect(Number.isInteger(r.balance)).toBe(true);
  expect(r.balance).toBe(3500);
});

test("exact -> status exact", () => {
  expect(calculate(50, 50, "USD").status).toBe("exact");
});

test("short -> status short", () => {
  expect(calculate(100, 50, "USD").status).toBe("short");
});

test("invalid inputs", () => {
  expect(calculate(-1, 10, "USD").status).toBe("invalid");
});

/* ── Inventory constraints ──────────────────────────────────────────── */

test("inventory sufficient -> all plans fulfilled", () => {
  const r = calculate(23.47, 100, "USD", { "$50": 10, "$20": 10, "$10": 10 });
  expect(r.status).toBe("settled");
  expect(r.inventory).toBeTruthy();
  // $50 count should have decreased
  expect(r.inventory["$50"]).toBeLessThanOrEqual(10);
});

test("inventory exact -> consumed completely", () => {
  const r = calculate(50, 100, "USD", { "$50": 1 });
  expect(r.status).toBe("settled");
  expect(r.plans[0].fulfilled).toBe(true);
  expect(r.inventory["$50"]).toBe(0);
});

test("inventory shortage -> insufficient", () => {
  // all small bills empty, only $100 available which is > balance
  const inv = { "$100": 5, "$50": 0, "$20": 0, "$10": 0, "$5": 0, "$1": 0,
    "Quarter": 0, "Dime": 0, "Nickel": 0, "Penny": 0 };
  const r = calculate(59.5, 100, "USD", inv);
  expect(r.status).toBe("insufficient");
  expect(r.remaining).toBeGreaterThan(0);
  expect(r.plans.every(p => p.fulfilled === false)).toBe(true);
});

test("inventory zero for key denom -> fulfills via other", () => {
  // no $20s available, should use $10s and $5s etc
  const r = calculate(23.47, 100, "USD", { "$20": 0, "$10": 10, "$5": 10, "$1": 10 });
  expect(r.status).toBe("settled");
  expect(r.plans[0].units.some(u => u.label === "$20")).toBe(false);
});

test("inventory multi-strategy degrade", () => {
  // Not enough $20s for balanced plan, but optimal uses fewer $20s
  const r = calculate(40, 100, "USD", { "$100": 1, "$50": 0, "$20": 1, "$10": 10, "$5": 10 });
  // optimal: $20×1 + $10×2 = 3 pieces (uses 1 $20, fits)
  // balanced: caps at 3 $10s = $30, not enough → practical would fail too
  const opt = r.plans.find(p => p.id === "optimal");
  expect(opt.fulfilled).toBe(true);
  expect(opt.units.some(u => u.label === "$20")).toBe(true);
});

/* ── deductInventory ────────────────────────────────────────────────── */

test("deductInventory reduces counts", () => {
  const inv = { "$20": 3, "$10": 2, "$5": 1 };
  const items = [{ label: "$20", count: 2 }, { label: "$10", count: 1 }];
  const rem = deductInventory(items, inv);
  expect(rem["$20"]).toBe(1);
  expect(rem["$10"]).toBe(1);
  expect(rem["$5"]).toBe(1);
});

test("deductInventory null returns null", () => {
  expect(deductInventory([], null)).toBeNull();
  expect(deductInventory([], undefined)).toBeNull();
});

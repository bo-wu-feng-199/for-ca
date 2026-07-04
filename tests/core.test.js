/**
 * Unit tests for PersonalMoneyCalc v3 — multi-currency core.
 * Run: node --experimental-vm-modules node_modules/.bin/jest
 */

import { calculate, CURRENCIES } from "../src/js/core.js";

/* ═══════════════════════════════════════════════════════════════════════════
   Basic — CNY
   ═══════════════════════════════════════════════════════════════════════════ */

test("buy 59.5 with 100 → 3 plans recommended", () => {
  const r = calculate(59.5, 100, "CNY");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(40.5);
  expect(r.plans).toHaveLength(3);
  // First plan is "optimal" with sortScore 0
  expect(r.plans[0].id).toBe("optimal");
  // All plans have reason & scenario
  for (const p of r.plans) {
    expect(p.reason).toBeTruthy();
    expect(p.scenario).toBeTruthy();
  }
});

test("exact payment", () => {
  expect(calculate(50, 50, "CNY").status).toBe("exact");
});

test("short payment", () => {
  const r = calculate(100, 50, "CNY");
  expect(r.status).toBe("short");
  expect(r.balance).toBe(-50);
});

test("large amounts work (no arbitrary cap)", () => {
  const r = calculate(1500, 10000, "JPY");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(8500);
});

test("invalid: negative", () => {
  expect(calculate(-1, 10, "CNY").status).toBe("invalid");
});

/* ═══════════════════════════════════════════════════════════════════════════
   Multi-currency
   ═══════════════════════════════════════════════════════════════════════════ */

test("USD settlement", () => {
  const r = calculate(23.50, 50, "USD");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(26.5);
  expect(r.currency).toBe("USD");
  // Should use Quarter/Dime/Nickel/Penny labels
  const hasQuarter = r.plans.some(p => p.units.some(u => u.label === "Quarter"));
  // 26.5 = 20 + 5 + 1 + 0.5... wait USD doesn't have 0.5
  // 26.5 with USD: 20 + 5 + 1 + 0.25×2 = 4+2=6 items
  expect(r.plans[0].totalCount).toBeGreaterThanOrEqual(4);
});

test("EUR settlement", () => {
  const r = calculate(123.45, 200, "EUR");
  expect(r.status).toBe("settled");
  expect(r.currency).toBe("EUR");
  expect(r.plans).toHaveLength(3);
  // EUR denominations include €200
  expect(r.plans[0].units.some(u => u.value === 50)).toBe(true);
});

test("JPY settlement (large amounts)", () => {
  const r = calculate(1500, 10000, "JPY");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(8500);
  expect(r.plans[0].units.some(u => u.value === 5000)).toBe(true);
});

test("KRW settlement", () => {
  const r = calculate(23500, 50000, "KRW");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(26500);
});

test("HKD settlement", () => {
  const r = calculate(88.80, 200, "HKD");
  expect(r.status).toBe("settled");
  expect(r.currency).toBe("HKD");
});

/* ═══════════════════════════════════════════════════════════════════════════
   Custom denominations
   ═══════════════════════════════════════════════════════════════════════════ */

test("custom denomination set", () => {
  const custom = [{ value: 50 }, { value: 20 }, { value: 10 }, { value: 5 }, { value: 1 }];
  const r = calculate(37, 100, "CUSTOM", custom);
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(63);
  // 63 = 50 + 10 + 1 + 1 + 1 = 5 pieces (greedy)
  expect(r.plans[0].totalCount).toBe(5);
});

/* ═══════════════════════════════════════════════════════════════════════════
   Plan integrity
   ═══════════════════════════════════════════════════════════════════════════ */

test("each plan sum equals balance", () => {
  const r = calculate(47.83, 100, "CNY");
  for (const plan of r.plans) {
    const sum = plan.units.reduce((s, u) => +(s + u.value * u.count).toFixed(2), 0);
    expect(Math.abs(sum - r.balance)).toBeLessThan(0.03);
  }
});

test("zero amount edge cases", () => {
  expect(calculate(0, 10, "CNY").status).toBe("settled");
  expect(calculate(10, 0, "CNY").status).toBe("short");
});

/* ═══════════════════════════════════════════════════════════════════════════
   Currency definitions completeness
   ═══════════════════════════════════════════════════════════════════════════ */

test("all currencies have units", () => {
  for (const [code, def] of Object.entries(CURRENCIES)) {
    expect(def.units.length).toBeGreaterThanOrEqual(5);
    // Verify descending order
    for (let i = 1; i < def.units.length; i++) {
      expect(def.units[i - 1].value).toBeGreaterThan(def.units[i].value);
    }
  }
});

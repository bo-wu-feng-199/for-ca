/**
 * Unit tests for PersonalMoneyCalc core.
 * Run with: node --experimental-vm-modules node_modules/.bin/jest
 */

import { calculate, CURRENCY_UNITS } from "../src/js/core.js";

/* ── Basic settlement ──────────────────────────────────────────────────── */
test("buy 59.5 with 100 → balance 40.5", () => {
  const r = calculate(59.5, 100);
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(40.5);
  expect(r.totalCount).toBeGreaterThan(0);
  // 40.5 = 20 + 20 + 0.5 → 3 units
  expect(r.totalCount).toBe(3);
});

test("buy 23.6 with 50 → balance 26.4", () => {
  const r = calculate(23.6, 50);
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(26.4);
  // 26.4 = 20 + 5 + 1 + 0.2 + 0.1 + 0.05 + ... 
  // Actually: 20 + 5 + 1 + 0.2... hmm 0.2 doesn't exist as RMB.
  // Let me check: 26.4 - 20 = 6.4, -5 = 1.4, -1 = 0.4, -0.1×4 = 0
  // Actually 20+5+1+0.2... 0.2 doesn't exist. 
  // 26.4: 20+5+1+0.1+0.1+0.1+0.1 = ok, 0.4 = 0.1×4
  expect(r.units.some(u => u.value === 20 && u.count === 1)).toBe(true);
});

/* ── Edge cases ────────────────────────────────────────────────────────── */
test("exact payment → status exact", () => {
  const r = calculate(50, 50);
  expect(r.status).toBe("exact");
  expect(r.totalCount).toBe(0);
});

test("short payment → status short", () => {
  const r = calculate(100, 50);
  expect(r.status).toBe("short");
  expect(r.balance).toBe(-50);
});

test("zero price", () => {
  const r = calculate(0, 10);
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(10);
});

test("zero paid", () => {
  const r = calculate(10, 0);
  expect(r.status).toBe("short");
});

test("large amount", () => {
  const r = calculate(1234.56, 2000);
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(765.44);
  expect(r.totalCount).toBeGreaterThan(0);
  // Verify total balance matches
  const total = r.units.reduce((s, u) => s + u.value * u.count, 0);
  expect(Math.abs(total - r.balance)).toBeLessThan(0.01);
});

/* ── Small amounts (cent-level) ────────────────────────────────────────── */
test("0.07 with 0.1 → balance 0.03", () => {
  const r = calculate(0.07, 0.1);
  expect(r.status).toBe("settled");
  expect(r.balance).toBeCloseTo(0.03, 2);
  // 0.03 = 0.01 + 0.01 + 0.01 → 3 coins
  expect(r.totalCount).toBe(3);
});

/* ── CURRENCY_UNITS structure ──────────────────────────────────────────── */
test("currency units array has expected entries", () => {
  expect(CURRENCY_UNITS.length).toBe(10);
  expect(CURRENCY_UNITS[0].value).toBe(100);
  expect(CURRENCY_UNITS[CURRENCY_UNITS.length - 1].value).toBe(0.01);
});

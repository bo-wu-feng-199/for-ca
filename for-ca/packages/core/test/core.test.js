import { calculate, parseInput, greedy, toCents, fromCents, CURRENCY_SETS } from "../src/index.js";
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

test("buy 59.5 paid 100 -> settled, 3 plans (USD)", () => {
  const r = calculate(59.5, 100, "USD");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(40.5);
  expect(r.plans).toHaveLength(3);
  expect(r.plans[0].units.some(u => u.label === "Quarter")).toBe(true);
});

test("JPY settled (integer) - no float error", () => {
  const r = calculate(1500, 5000, "JPY");
  expect(r.status).toBe("settled");
  expect(Number.isInteger(r.balance)).toBe(true);
  expect(r.balance).toBe(3500);
});

test("large JPY amount - no float drift", () => {
  const r = calculate(9999, 100000, "JPY");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(90001);
  // optimal plan should exactly match balance
  const opt = r.plans.find(p => p.id === "optimal");
  expect(opt).toBeTruthy();
  const sum = opt.units.reduce((s, u) => s + u.value * u.count, 0);
  expect(sum).toBe(90001);
});

test("precise penny amounts no float error", () => {
  const r = calculate(0.03, 100, "USD");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(99.97);
  const pieces = r.plans[0].units.reduce((s, u) => s + u.count, 0);
  expect(pieces).toBeGreaterThan(0);
});

test("exact -> status exact", () => {
  expect(calculate(50, 50, "USD").status).toBe("exact");
});

test("short -> status short", () => {
  const r = calculate(100, 50, "USD");
  expect(r.status).toBe("short");
  expect(r.balance).toBe(-50);
});

test("invalid inputs", () => {
  expect(calculate(-1, 10, "USD").status).toBe("invalid");
});

test("each plan sum equals balance (USD)", () => {
  const r = calculate(23.47, 100, "USD");
  const opt = r.plans.find(p => p.id === "optimal");
  const sum = opt.units.reduce((s, u) => s + Math.round(u.value * 100) * u.count, 0) / 100;
  expect(Math.abs(sum - r.balance)).toBeLessThan(0.01);
});

test("each plan sum equals balance (CNY)", () => {
  const r = calculate(23.5, 100, "CNY");
  const opt = r.plans.find(p => p.id === "optimal");
  const sum = opt.units.reduce((s, u) => s + Math.round(u.value * 10) * u.count, 0) / 10;
  expect(Math.abs(sum - r.balance)).toBeLessThan(0.05);
});

test("greedy correct sum (USD)", () => {
  const r = greedy(4783, USD); // $47.83 in cents
  const sum = r.items.reduce((s, u) => s + u.value * u.count, 0);
  expect(sum).toBe(4783);
  expect(r.remaining).toBe(0);
});

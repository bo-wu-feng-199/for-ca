import { calculate, parseInput, greedy, CURRENCY_SETS } from "../src/js/core.js";
const CURRENCY_UNITS = CURRENCY_SETS.USD.units;

test("buy 59.5 paid 100 → settled, 3 plans (USD)", () => {
  const r = calculate(59.5, 100, "USD");
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(40.5);
  expect(r.plans).toHaveLength(3);
  expect(r.plans[0].totalCount).toBeGreaterThanOrEqual(3);
  expect(r.plans[0].units.some(u => u.label === "Quarter")).toBe(true);
});

test("EUR settled", () => {
  const r = calculate(59.5, 100, "EUR");
  expect(r.status).toBe("settled");
  expect(r.currency).toBe("EUR");
});

test("JPY settled (integer)", () => {
  const r = calculate(1500, 5000, "JPY");
  expect(r.status).toBe("settled");
  expect(Number.isInteger(r.balance)).toBe(true);
  expect(r.currency).toBe("JPY");
});

test("CNY settled", () => {
  const r = calculate(36.5, 100, "CNY");
  expect(r.status).toBe("settled");
  expect(r.currency).toBe("CNY");
});

test("exact → status exact", () => {
  expect(calculate(50, 50, "USD").status).toBe("exact");
});

test("short → status short", () => {
  const r = calculate(100, 50, "USD");
  expect(r.status).toBe("short");
  expect(r.balance).toBe(-50);
});

test("invalid inputs", () => {
  expect(calculate(-1, 10, "USD").status).toBe("invalid");
  expect(calculate("abc", 10, "USD").status).toBe("invalid");
});

test("optimal plan has fewest pieces", () => {
  const r = calculate(47.83, 100, "USD");
  expect(r.plans[0].id).toBe("optimal");
  expect(r.plans[0].totalCount).toBeLessThanOrEqual(r.plans[1].totalCount);
});

test("each plan sum equals balance (USD)", () => {
  const r = calculate(23.47, 100, "USD");
  for (const p of r.plans) {
    const sum = p.units.reduce((s, u) => +(s + u.value * u.count).toFixed(2), 0);
    expect(Math.abs(sum - r.balance)).toBeLessThan(0.03);
  }
});

test("zero edges", () => {
  expect(calculate(0, 10, "USD").status).toBe("settled");
  expect(calculate(10, 0, "USD").status).toBe("short");
});

test("parseInput space", () => {
  expect(parseInput("23.50 50")).toEqual({ price: 23.5, paid: 50 });
});
test("parseInput plus", () => {
  expect(parseInput("10.99+20")).toEqual({ price: 10.99, paid: 20 });
});
test("parseInput comma", () => {
  expect(parseInput("45.67,100")).toEqual({ price: 45.67, paid: 100 });
});
test("parseInput null for invalid", () => {
  expect(parseInput("")).toBeNull();
  expect(parseInput("abc")).toBeNull();
  expect(parseInput("12.34")).toBeNull();
});

test("greedy correct sum (USD)", () => {
  const r = greedy(47.83, CURRENCY_UNITS);
  const sum = r.items.reduce((s, u) => +(s + u.value * u.count).toFixed(2), 0);
  expect(Math.abs(sum - 47.83)).toBeLessThan(0.02);
});

test("greedy EUR sum", () => {
  const r = greedy(47.83, CURRENCY_SETS.EUR.units);
  const sum = r.items.reduce((s, u) => +(s + u.value * u.count).toFixed(2), 0);
  expect(Math.abs(sum - 47.83)).toBeLessThan(0.02);
});

test("greedy JPY sum (integer)", () => {
  const r = greedy(3500, CURRENCY_SETS.JPY.units);
  const sum = r.items.reduce((s, u) => s + u.value * u.count, 0);
  expect(sum).toBe(3500);
});

test("all plans have desc", () => {
  const r = calculate(36.27, 100, "USD");
  for (const p of r.plans) {
    expect(p.desc).toBeTruthy();
  }
});

test("CURRENCY_UNITS has USD denominations", () => {
  const values = CURRENCY_UNITS.map(u => u.value);
  expect(values).toContain(0.25);
  expect(values).toContain(0.10);
  expect(values).toContain(0.05);
  expect(values).toContain(0.01);
  expect(values).toContain(2);
  expect(values[0]).toBe(100);
});

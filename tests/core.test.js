import { calculate, parseInput, greedy, CURRENCY_UNITS } from "../src/js/core.js";

test("buy 59.5 paid 100 → settled, 3 plans (USD)", () => {
  const r = calculate(59.5, 100);
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(40.5);
  expect(r.plans).toHaveLength(3);
  // USD: optimal should use $20, $20, Quarter, Quarter = 4 pieces
  expect(r.plans[0].totalCount).toBeGreaterThanOrEqual(3);
  // Verify USD units are used
  expect(r.plans[0].units.some(u => u.label === "Quarter")).toBe(true);
});

test("exact → status exact", () => {
  expect(calculate(50, 50).status).toBe("exact");
});

test("short → status short", () => {
  const r = calculate(100, 50);
  expect(r.status).toBe("short");
  expect(r.balance).toBe(-50);
});

test("invalid inputs", () => {
  expect(calculate(-1, 10).status).toBe("invalid");
  expect(calculate("abc", 10).status).toBe("invalid");
});

test("optimal plan has fewest pieces", () => {
  const r = calculate(47.83, 100);
  expect(r.plans[0].id).toBe("optimal");
  expect(r.plans[0].totalCount).toBeLessThanOrEqual(r.plans[1].totalCount);
});

test("each plan sum equals balance (USD)", () => {
  const r = calculate(23.47, 100);
  for (const p of r.plans) {
    const sum = p.units.reduce((s, u) => +(s + u.value * u.count).toFixed(2), 0);
    expect(Math.abs(sum - r.balance)).toBeLessThan(0.03);
  }
});

test("zero edges", () => {
  expect(calculate(0, 10).status).toBe("settled");
  expect(calculate(10, 0).status).toBe("short");
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
  const r = greedy(47.83);
  const sum = r.items.reduce((s, u) => +(s + u.value * u.count).toFixed(2), 0);
  expect(Math.abs(sum - 47.83)).toBeLessThan(0.02);
});

test("all plans have desc", () => {
  const r = calculate(36.27, 100);
  for (const p of r.plans) {
    expect(p.desc).toBeTruthy();
  }
});

test("CURRENCY_UNITS has USD denominations", () => {
  const values = CURRENCY_UNITS.map(u => u.value);
  expect(values).toContain(0.25); // Quarter
  expect(values).toContain(0.10); // Dime
  expect(values).toContain(0.05); // Nickel
  expect(values).toContain(0.01); // Penny
  expect(values).toContain(2);    // $2 bill
  expect(values[0]).toBe(100);    // starts at $100
});

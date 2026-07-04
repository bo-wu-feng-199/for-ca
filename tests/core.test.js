import { calculate, parseInput, greedy } from "../src/js/core.js";

test("buy 59.5 paid 100 → settled, 3 plans", () => {
  const r = calculate(59.5, 100);
  expect(r.status).toBe("settled");
  expect(r.balance).toBe(40.5);
  expect(r.plans).toHaveLength(3);
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

test("each plan sum equals balance", () => {
  const r = calculate(36.27, 100);
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
  expect(parseInput("59.5 100")).toEqual({ price: 59.5, paid: 100 });
});
test("parseInput plus", () => {
  expect(parseInput("23.6+50")).toEqual({ price: 23.6, paid: 50 });
});
test("parseInput comma", () => {
  expect(parseInput("99.99,200")).toEqual({ price: 99.99, paid: 200 });
});
test("parseInput null for invalid", () => {
  expect(parseInput("")).toBeNull();
  expect(parseInput("abc")).toBeNull();
  expect(parseInput("59.5")).toBeNull();
});

test("greedy correct sum", () => {
  const r = greedy(765.44);
  const sum = r.items.reduce((s, u) => +(s + u.value * u.count).toFixed(2), 0);
  expect(Math.abs(sum - 765.44)).toBeLessThan(0.01);
});

test("all plans have desc", () => {
  const r = calculate(36.27, 100);
  for (const p of r.plans) {
    expect(p.desc).toBeTruthy();
  }
});

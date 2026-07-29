/* ── Currency config — all values in smallest unit (cents / yen / jiao) ── */

const $ = (v, l) => ({ value: v, label: l });

export const CURRENCY_SETS = Object.freeze({
  USD: Object.freeze({
    symbol: "$", name: "USD", places: 2,
    units: Object.freeze([
      $(10000, "$100"), $(5000, "$50"), $(2000, "$20"),
      $(1000, "$10"),   $(500, "$5"),   $(200, "$2"),
      $(100, "$1"),     $(25, "Quarter"), $(10, "Dime"),
      $(5, "Nickel"),   $(1, "Penny"),
    ]),
    minCoin: 10,
  }),
  EUR: Object.freeze({
    symbol: "\u20AC", name: "EUR", places: 2,
    units: Object.freeze([
      $(50000, "\u20AC500"), $(20000, "\u20AC200"), $(10000, "\u20AC100"),
      $(5000, "\u20AC50"),   $(2000, "\u20AC20"),   $(1000, "\u20AC10"),
      $(500, "\u20AC5"),     $(200, "\u20AC2"),     $(100, "\u20AC1"),
      $(50, "50c"), $(20, "20c"), $(10, "10c"), $(5, "5c"), $(2, "2c"), $(1, "1c"),
    ]),
    minCoin: 10,
  }),
  JPY: Object.freeze({
    symbol: "\u00A5", name: "JPY", places: 0,
    units: Object.freeze([
      $(10000, "\u00A510000"), $(5000, "\u00A55000"), $(2000, "\u00A52000"),
      $(1000, "\u00A51000"),   $(500, "\u00A5500"),   $(100, "\u00A5100"),
      $(50, "\u00A550"), $(10, "\u00A510"), $(5, "\u00A55"), $(1, "\u00A51"),
    ]),
    minCoin: 1,
  }),
  CNY: Object.freeze({
    symbol: "\u00A5", name: "CNY", places: 1,
    units: Object.freeze([
      $(1000, "\u00A5100"), $(500, "\u00A550"), $(200, "\u00A520"),
      $(100, "\u00A510"),   $(50, "\u00A55"),   $(10, "\u00A51"),
      $(5, "5jiao"), $(1, "1jiao"),
    ]),
    minCoin: 1,
  }),
});

export function getCurrency(code) {
  return CURRENCY_SETS[code] || CURRENCY_SETS.USD;
}

/* ── Integer conversion ──────────────────────────────────────────────── */

export function toCents(amount, code = "USD") {
  const p = getCurrency(code).places;
  return Math.round(amount * Math.pow(10, p));
}

export function fromCents(cents, code = "USD") {
  const p = getCurrency(code).places;
  return +(cents / Math.pow(10, p)).toFixed(p);
}

/* ── Input parser ────────────────────────────────────────────────────── */

export function parseInput(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  let parts;
  if (s.includes(" "))       parts = s.split(/\s+/);
  else if (s.includes("/"))  parts = s.split("/");
  else if (s.includes("+"))  parts = s.split("+");
  else if (s.includes(","))  parts = s.split(",");
  else return null;
  if (parts.length < 2) return null;
  const p = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  if (isNaN(p) || isNaN(m) || p < 0 || m < 0) return null;
  return { price: Math.round(p * 100) / 100, paid: Math.round(m * 100) / 100 };
}

/* ── Greedy solver (all integer arithmetic, optional inventory) ──────── */

/**
 * @param {number} amount - integer in smallest unit
 * @param {object[]} units - sorted descending
 * @param {number} cap - max per denomination (Infinity = unlimited)
 * @param {object} [inventory] - { [label]: availableCount }
 * @returns {{ items: object[], remaining: number }}
 */
export function greedy(amount, units = CURRENCY_SETS.USD.units, cap = Infinity, inventory = null) {
  let remaining = amount;
  const items = [];
  for (const u of units) {
    if (remaining < u.value) continue;
    const available = inventory ? (inventory[u.label] ?? Infinity) : Infinity;
    if (available <= 0) continue;
    const maxCount = Math.floor(remaining / u.value);
    const count = Math.min(maxCount, cap, available);
    if (count > 0) {
      items.push({ value: u.value, label: u.label, count });
      remaining -= u.value * count;
    }
    if (remaining === 0) break;
  }
  return { items, remaining };
}

/* ── Utility: deduct inventory for a plan ────────────────────────────── */

/**
 * @param {object[]} items - plan's items array [{value, label, count}]
 * @param {object} inventory - original inventory
 * @returns {object} updated inventory after deducting plan's items
 */
export function deductInventory(items, inventory) {
  if (!inventory) return null;
  const rem = { ...inventory };
  for (const i of items) {
    if (rem[i.label] !== undefined) rem[i.label] = Math.max(0, rem[i.label] - i.count);
  }
  return rem;
}

/* ── Strategies ──────────────────────────────────────────────────────── */

const DESCRIPTIONS = {
  optimal:   "Uses the fewest pieces possible. Best for fast cash transactions.",
  balanced:  "Spreads change across more denominations. Great for everyday wallet use.",
  practical: "Avoids tiny coins. Ideal when the receiver prefers fewer small coins.",
};

/**
 * @param {number} price - decimal
 * @param {number} paid - decimal
 * @param {string} [currencyCode="USD"]
 * @param {object} [inventory] - { [label]: availableCount }
 * @returns {{ status: string, balance: number, plans: object[], inventory?: object, currency: string }}
 */
export function calculate(price, paid, currencyCode = "USD", inventory = null) {
  const curr = getCurrency(currencyCode);

  const p = toCents(price, currencyCode);
  const m = toCents(paid, currencyCode);
  if (isNaN(p) || isNaN(m) || p < 0 || m < 0)
    return { status: "invalid", balance: 0, plans: [], currency: currencyCode };

  const balance = m - p;
  if (balance === 0)
    return { status: "exact", balance: 0, plans: [], currency: currencyCode };
  if (balance < 0)
    return { status: "short", balance: fromCents(balance, currencyCode), plans: [], currency: currencyCode };

  const stratDefs = [
    { id: "optimal",   name: "Optimal Plan",     cap: Infinity, filter: null },
    { id: "balanced",  name: "Balanced Plan",    cap: 3,        filter: null },
    { id: "practical", name: "Practical Plan",   cap: Infinity, filter: u => u.value >= curr.minCoin },
  ];

  let plans = [];
  let bestAttemptRemaining = balance;

  for (const sd of stratDefs) {
    const units = sd.filter ? curr.units.filter(sd.filter) : curr.units;
    let result = greedy(balance, units, sd.cap, inventory);

    if (sd.id === "practical" && result.remaining > 0) {
      result = greedy(balance, curr.units, sd.cap, inventory);
    }

    const unitsOut = result.items.map(i => ({
      value: fromCents(i.value, currencyCode),
      label: i.label,
      count: i.count,
    }));

    const fulfilled = result.remaining === 0;
    plans.push({
      id: sd.id,
      name: sd.name,
      totalCount: result.items.reduce((a, i) => a + i.count, 0),
      typeCount: result.items.length,
      units: unitsOut,
      remaining: result.remaining > 0 ? fromCents(result.remaining, currencyCode) : 0,
      fulfilled,
      desc: DESCRIPTIONS[sd.id],
    });

    if (result.remaining < bestAttemptRemaining) bestAttemptRemaining = result.remaining;
  }

  // Deduct inventory for the first fulfilled plan (or best attempt)
  const best = plans.find(p => p.fulfilled) || plans[0];
  const remainingInventory = best.fulfilled ? deductInventory(best.units, inventory) : inventory;

  // If any plan fulfilled, return settled
  if (plans.some(p => p.fulfilled)) {
    return {
      status: "settled",
      balance: fromCents(balance, currencyCode),
      plans,
      inventory: remainingInventory,
      currency: currencyCode,
    };
  }

  // All strategies insufficient with given inventory
  return {
    status: "insufficient",
    balance: fromCents(balance, currencyCode),
    remaining: fromCents(Math.min(balance, bestAttemptRemaining), currencyCode),
    plans,
    inventory: remainingInventory,
    currency: currencyCode,
  };
}

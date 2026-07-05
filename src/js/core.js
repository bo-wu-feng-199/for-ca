/**
 * CashCalc v3.2 — core engine.
 */

const EPS = 1e-9;

export const CURRENCY_UNITS = Object.freeze([
  { value: 100,   label: "¥100" },
  { value: 50,    label: "¥50"  },
  { value: 20,    label: "¥20"  },
  { value: 10,    label: "¥10"  },
  { value: 5,     label: "¥5"   },
  { value: 1,     label: "¥1"   },
  { value: 0.5,   label: "¥0.5" },
  { value: 0.1,   label: "¥0.1" },
  { value: 0.05,  label: "¥0.05"},
  { value: 0.01,  label: "¥0.01"},
]);

// ── Input parser ──────────────────────────────────────────────────────────

export function parseInput(raw) {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim();
  let parts;
  if (s.includes(" "))       parts = s.split(/\s+/);
  else if (s.includes("+"))  parts = s.split("+");
  else if (s.includes(","))  parts = s.split(",");
  else return null;
  if (parts.length < 2) return null;
  const p = parseFloat(parts[0]);
  const m = parseFloat(parts[1]);
  if (isNaN(p) || isNaN(m) || p < 0 || m < 0) return null;
  return { price: Math.round(p * 100) / 100, paid: Math.round(m * 100) / 100 };
}

// ── Greedy solver ─────────────────────────────────────────────────────────

export function greedy(amount, units = CURRENCY_UNITS, cap = Infinity) {
  let remaining = amount;
  const items = [];
  for (const u of units) {
    if (remaining < u.value - EPS) continue;
    const max = Math.floor(remaining / u.value + EPS);
    const count = Math.min(max, cap);
    if (count > 0) {
      items.push({ value: u.value, label: u.label, count });
      remaining = +(remaining - u.value * count).toFixed(2);
    }
    if (remaining < EPS) break;
  }
  return { items, remaining: remaining > EPS ? remaining : 0 };
}

// ── 3 strategies ─────────────────────────────────────────────────────────

const DESCRIPTIONS = {
  optimal:   "Takes the largest possible quantity per denomination from top to bottom, ensuring the minimum total pieces for fastest handover.",
  balanced:  "Limits each denomination to 3 units max; excess spills into smaller denominations for a well-distributed mix.",
  practical: "Skips the smallest coin denominations (¥0.05, ¥0.01) — fewer tiny coins, more convenient in real-world cash transactions.",
};

export function calculate(price, paid) {
  const p = +(+price).toFixed(2);
  const m = +(+paid).toFixed(2);
  if (isNaN(p) || isNaN(m) || p < 0 || m < 0)
    return { status: "invalid", balance: 0, plans: [] };

  const balance = +(m - p).toFixed(2);
  if (Math.abs(balance) < EPS)
    return { status: "exact", balance: 0, plans: [] };
  if (balance < 0)
    return { status: "short", balance, plans: [] };

  const strategies = [
    { id: "optimal",   name: "Optimal Plan",     cap: Infinity, filter: null },
    { id: "balanced",  name: "Balanced Plan",    cap: 3,        filter: null },
    { id: "practical", name: "Practical Plan",   cap: Infinity, filter: u => u.value >= 0.1 },
  ];

  const plans = strategies.map(s => {
    const units = s.filter ? CURRENCY_UNITS.filter(s.filter) : CURRENCY_UNITS;
    let result = greedy(balance, units, s.cap);

    // If practical leaves a remainder, fallback to full set
    if (s.id === "practical" && result.remaining > EPS) {
      const full = greedy(balance, CURRENCY_UNITS);
      result = full;
    }

    return {
      id: s.id,
      name: s.name,
      totalCount: result.items.reduce((a, i) => a + i.count, 0),
      typeCount: result.items.length,
      units: result.items.map(i => ({ value: i.value, label: i.label, count: i.count })),
      desc: DESCRIPTIONS[s.id],
    };
  });

  return { status: "settled", balance, plans };
}

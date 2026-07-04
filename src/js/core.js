/**
 * PersonalMoneyCalc — core calculation engine.
 *
 * Terminology (project convention):
 *   balance     = paid - price  (差额)
 *   settlement  = optimal currency-unit breakdown of the balance (结算方案)
 *   unit        = a single currency denomination (货币单元)
 */

// ── Supported currency units (RMB ¥) ─────────────────────────────────────
export const CURRENCY_UNITS = Object.freeze([
  { value: 100,    label: "¥100" },
  { value: 50,     label: "¥50" },
  { value: 20,     label: "¥20" },
  { value: 10,     label: "¥10" },
  { value: 5,      label: "¥5" },
  { value: 1,      label: "¥1" },
  { value: 0.5,    label: "¥0.5" },
  { value: 0.1,    label: "¥0.1" },
  { value: 0.05,   label: "¥0.05" },
  { value: 0.01,   label: "¥0.01" },
]);

const EPS = 1e-9;

// ── Core helpers ──────────────────────────────────────────────────────────

/** Build plan from a greedy run with optional per-type cap. */
function greedy(balance, units, cap = Infinity) {
  let remaining = balance;
  const items = [];
  for (const u of units) {
    if (remaining < u.value - EPS) continue;
    const maxPossible = Math.floor(remaining / u.value + EPS);
    const count = Math.min(maxPossible, cap);
    if (count > 0) {
      items.push({ value: u.value, label: u.label, count });
      remaining = +(remaining - u.value * count).toFixed(2);
    }
    if (remaining < EPS) break;
  }
  return { items, remaining: remaining > EPS ? remaining : 0 };
}

// ── Three generation strategies ───────────────────────────────────────────

const MAX_INPUT = 1000;

/**
 * Plan A — 最优方案 (最小张数)
 * Standard greedy. Minimum total pieces.
 */
function planA(balance) {
  return greedy(balance, CURRENCY_UNITS);
}

/**
 * Plan B — 均衡方案 (分散面额)
 * Cap each denomination to 3, forcing a broader mix.
 */
function planB(balance) {
  return greedy(balance, CURRENCY_UNITS, 3);
}

/**
 * Plan C — 简洁方案 (减少面额类型)
 * Greedy but skipping ¥1 denomination.
 * Forces use of ¥0.5 and smaller coins for the ¥1–¥4 range,
 * producing a meaningfully different mix from Plan A/B.
 */
function planC(balance) {
  const filtered = CURRENCY_UNITS.filter(u => u.value !== 1);
  return greedy(balance, filtered);
}

// ── Public API ────────────────────────────────────────────────────────────

/**
 * @typedef {Object} PlanResult
 * @prop {number}  balance     — paid - price
 * @prop {string}  planName    — display label
 * @prop {number}  totalCount  — total units used
 * @prop {Array}   units       — [{value, label, count}]
 * @prop {number}  typeCount   — unique denomination types used
 * @prop {string}  status      — "exact" | "short" | "settled"
 */

/**
 * Compute 3 optimal settlement plans.
 *
 * @param {number} price
 * @param {number} paid
 * @returns {{plans: PlanResult[], balance: number, status: string}}
 */
export function calculate(price, paid) {
  // ── Validation ────────────────────────────────────────────────────────
  const p = parseFloat(price);
  const m = parseFloat(paid);

  if (isNaN(p) || isNaN(m) || p < 0 || m < 0) {
    return { status: "invalid", balance: 0, plans: [] };
  }

  // Clamp to MAX_INPUT
  const clampedPrice = Math.min(p, MAX_INPUT);
  const clampedPaid = Math.min(m, MAX_INPUT);

  const balance = +(clampedPaid - clampedPrice).toFixed(2);

  if (Math.abs(balance) < EPS) {
    return { status: "exact", balance: 0, plans: [] };
  }
  if (balance < 0) {
    return { status: "short", balance, plans: [] };
  }

  // ── Generate 3 plans ──────────────────────────────────────────────────
  const rawPlans = [
    { fn: planA,   name: "最优方案" },
    { fn: planB,   name: "均衡方案" },
    { fn: planC,   name: "简洁方案" },
  ];

  const plans = rawPlans.map(({ fn, name }) => {
    const { items, remaining } = fn(balance);
    const units = items.map(i => ({ value: i.value, label: i.label, count: i.count }));
    const totalCount = units.reduce((s, u) => s + u.count, 0);
    const typeCount = units.length;
    return { planName: name, totalCount, typeCount, units, remaining };
  });

  return {
    status: "settled",
    balance,
    plans: rawPlans.map((p, i) => ({
      planName: p.name,
      totalCount: plans[i].totalCount,
      typeCount: plans[i].typeCount,
      units: plans[i].units,
    })),
  };
}

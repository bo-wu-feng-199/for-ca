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

// ── Types ─────────────────────────────────────────────────────────────────
/**
 * @typedef {Object} SettlementUnit
 * @prop {number}  value  — unit face value
 * @prop {string}  label  — display label
 * @prop {number}  count  — how many of this unit
 */

/**
 * @typedef {Object} SettlementResult
 * @prop {number}  balance     — paid - price (差额)
 * @prop {number}  totalCount  — total units used
 * @prop {SettlementUnit[]} units  — breakdown by unit
 * @prop {number|null} remainder   — leftover that cannot be settled (should be 0 for RMB)
 * @prop {string}  status       — "exact" | "short" | "settled" | "zero"
 */

// ── Core: compute settlement ──────────────────────────────────────────────

/**
 * Compute the optimal settlement for a payment.
 *
 * @param {number} price  — item price (商品价格)
 * @param {number} paid   — amount tendered (支付金额)
 * @returns {SettlementResult}
 */
export function calculate(price, paid) {
  const balance = +(paid - price).toFixed(2);

  // Edge cases
  if (Math.abs(balance) < 1e-9) {
    return { balance: 0, totalCount: 0, units: [], remainder: null, status: "exact" };
  }
  if (balance < 0) {
    return { balance, totalCount: 0, units: [], remainder: null, status: "short" };
  }

  // Greedy algorithm (RMB is a canonical system — optimal)
  let remaining = balance;
  const units = [];
  for (const unit of CURRENCY_UNITS) {
    if (remaining < unit.value - 1e-9) continue;
    const count = Math.floor(remaining / unit.value + 1e-9);
    // Clamp floating-point edge
    const maxUse = Math.min(count, Math.floor(remaining / unit.value + 1e-9));
    if (maxUse > 0) {
      units.push({ value: unit.value, label: unit.label, count: maxUse });
      remaining = +(remaining - unit.value * maxUse).toFixed(2);
    }
    if (remaining < 1e-9) break;
  }

  const remainder = remaining > 1e-9 ? remaining : null;
  const totalCount = units.reduce((s, u) => s + u.count, 0);

  return { balance, totalCount, units, remainder, status: "settled" };
}

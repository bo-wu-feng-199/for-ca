/**
 * PersonalMoneyCalc v3 — core engine.
 *
 * Multi-currency denomination definitions, 3 settlement strategies,
 * and the public calculate() entry point.
 */

// ═══════════════════════════════════════════════════════════════════════════
//  Currency system definitions
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @typedef {Object} CurrencyDef
 * @prop {string}      code       — ISO code, e.g. "CNY"
 * @prop {string}      name       — display name
 * @prop {string}      symbol     — currency symbol
 * @prop {Array<{value:number, label:string}>} units — denomination list (descending)
 */

/** @type {Object<string, CurrencyDef>} */
export const CURRENCIES = Object.freeze({

  CNY: {
    code: "CNY", name: "人民币", symbol: "¥",
    units: [
      { value: 100,   label: "¥100"   },
      { value: 50,    label: "¥50"    },
      { value: 20,    label: "¥20"    },
      { value: 10,    label: "¥10"    },
      { value: 5,     label: "¥5"     },
      { value: 1,     label: "¥1"     },
      { value: 0.5,   label: "¥0.5"   },
      { value: 0.1,   label: "¥0.1"   },
      { value: 0.05,  label: "¥0.05"  },
      { value: 0.01,  label: "¥0.01"  },
    ],
  },

  USD: {
    code: "USD", name: "US Dollar", symbol: "$",
    units: [
      { value: 100,   label: "$100"       },
      { value: 50,    label: "$50"        },
      { value: 20,    label: "$20"        },
      { value: 10,    label: "$10"        },
      { value: 5,     label: "$5"         },
      { value: 2,     label: "$2"         },
      { value: 1,     label: "$1"         },
      { value: 0.25,  label: "Quarter"    },
      { value: 0.10,  label: "Dime"       },
      { value: 0.05,  label: "Nickel"     },
      { value: 0.01,  label: "Penny"      },
    ],
  },

  EUR: {
    code: "EUR", name: "Euro", symbol: "€",
    units: [
      { value: 500,   label: "€500" },
      { value: 200,   label: "€200" },
      { value: 100,   label: "€100" },
      { value: 50,    label: "€50"  },
      { value: 20,    label: "€20"  },
      { value: 10,    label: "€10"  },
      { value: 5,     label: "€5"   },
      { value: 2,     label: "€2"   },
      { value: 1,     label: "€1"   },
      { value: 0.50,  label: "€0.50"},
      { value: 0.20,  label: "€0.20"},
      { value: 0.10,  label: "€0.10"},
      { value: 0.05,  label: "€0.05"},
      { value: 0.02,  label: "€0.02"},
      { value: 0.01,  label: "€0.01"},
    ],
  },

  GBP: {
    code: "GBP", name: "Pound Sterling", symbol: "£",
    units: [
      { value: 50,    label: "£50" },
      { value: 20,    label: "£20" },
      { value: 10,    label: "£10" },
      { value: 5,     label: "£5"  },
      { value: 2,     label: "£2"  },
      { value: 1,     label: "£1"  },
      { value: 0.50,  label: "£0.50"},
      { value: 0.20,  label: "£0.20"},
      { value: 0.10,  label: "£0.10"},
      { value: 0.05,  label: "£0.05"},
      { value: 0.02,  label: "£0.02"},
      { value: 0.01,  label: "£0.01"},
    ],
  },

  JPY: {
    code: "JPY", name: "Japanese Yen", symbol: "¥",
    units: [
      { value: 10000, label: "¥10000" },
      { value: 5000,  label: "¥5000"  },
      { value: 2000,  label: "¥2000"  },
      { value: 1000,  label: "¥1000"  },
      { value: 500,   label: "¥500"   },
      { value: 100,   label: "¥100"   },
      { value: 50,    label: "¥50"    },
      { value: 10,    label: "¥10"    },
      { value: 5,     label: "¥5"     },
      { value: 1,     label: "¥1"     },
    ],
  },

  KRW: {
    code: "KRW", name: "South Korean Won", symbol: "₩",
    units: [
      { value: 50000, label: "₩50000" },
      { value: 10000, label: "₩10000" },
      { value: 5000,  label: "₩5000"  },
      { value: 1000,  label: "₩1000"  },
      { value: 500,   label: "₩500"   },
      { value: 100,   label: "₩100"   },
      { value: 50,    label: "₩50"    },
      { value: 10,    label: "₩10"    },
    ],
  },

  HKD: {
    code: "HKD", name: "Hong Kong Dollar", symbol: "HK$",
    units: [
      { value: 1000,  label: "HK$1000" },
      { value: 500,   label: "HK$500"  },
      { value: 100,   label: "HK$100"  },
      { value: 50,    label: "HK$50"   },
      { value: 20,    label: "HK$20"   },
      { value: 10,    label: "HK$10"   },
      { value: 5,     label: "HK$5"    },
      { value: 2,     label: "HK$2"    },
      { value: 1,     label: "HK$1"    },
      { value: 0.50,  label: "HK$0.50" },
      { value: 0.20,  label: "HK$0.20" },
      { value: 0.10,  label: "HK$0.10" },
    ],
  },
});

export const DEFAULT_CURRENCY = "CNY";
export const MAX_INPUT = 1000;

// ═══════════════════════════════════════════════════════════════════════════
//  Greedy helper
// ═══════════════════════════════════════════════════════════════════════════

const EPS = 1e-9;

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

// ═══════════════════════════════════════════════════════════════════════════
//  Plan definitions
// ═══════════════════════════════════════════════════════════════════════════

const PLAN_STRATEGIES = [
  {
    id: "optimal",
    name: "最优方案",
    reason: "按从大到小顺序取各面额最大可用数量，保证总张数/枚数最少。",
    scenario: "适合店主希望快速清点、减少交接时间的场景。",
    sortScore: 0,  // lowest = highest recommendation
    // standard greedy
    fn: (balance, units) => greedy(balance, units),
  },
  {
    id: "balanced",
    name: "均衡方案",
    reason: "每种面额最多取 3 张/枚，超出部分递延至更小面额，使张数在各面额之间均匀分布。",
    scenario: "适合双方都有时间细数、希望各面额数量都不太多的场景。",
    sortScore: 1,
    fn: (balance, units) => greedy(balance, units, 3),
  },
  {
    id: "practical",
    name: "实操方案",
    reason: "优先使用大面额钞票，仅在必要时才使用最小面额硬币凑整，极大减少零散小币数量。",
    scenario: "适合街边快速交易、想尽量少给零碎硬币的场景。",
    sortScore: 2,
    fn: (balance, units) => {
      // Skip the smallest denomination; if remainder exists, use it
      const filtered = units.slice(0, -1);
      const result = greedy(balance, filtered);
      if (result.remaining > 1e-9) {
        // Add back the smallest denom for the leftover
        const lastUnit = units[units.length - 1];
        const extraCount = Math.round(result.remaining / lastUnit.value);
        if (extraCount > 0) {
          result.items.push({ value: lastUnit.value, label: lastUnit.label, count: extraCount });
          result.remaining = 0;
        }
      }
      return result;
    },
  },
];

// ═══════════════════════════════════════════════════════════════════════════
//  Public: calculate()
// ═══════════════════════════════════════════════════════════════════════════

/**
 * @param {number}  price        — item price
 * @param {number}  paid         — amount tendered
 * @param {string}  currencyCode — ISO code (default "CNY")
 * @param {Array}   [customUnits] — optional custom denomination list
 * @returns {{ status, balance, plans, currency }}
 */
export function calculate(price, paid, currencyCode = DEFAULT_CURRENCY, customUnits = null) {
  // ── Validation ──────────────────────────────────────────────────────
  const p = parseFloat(price);
  const m = parseFloat(paid);

  if (isNaN(p) || isNaN(m) || p < 0 || m < 0) {
    return { status: "invalid", balance: 0, plans: [], currency: currencyCode };
  }

  const balance = +(m - p).toFixed(2);

  if (Math.abs(balance) < EPS) {
    return { status: "exact", balance: 0, plans: [], currency: currencyCode };
  }
  if (balance < 0) {
    return { status: "short", balance, plans: [], currency: currencyCode };
  }

  // ── Resolve units ──────────────────────────────────────────────────
  const currency = CURRENCIES[currencyCode];
  if (!currency && !customUnits) {
    return { status: "invalid", balance: 0, plans: [], currency: currencyCode };
  }
  const units = customUnits || currency.units;

  // ── Generate plans ─────────────────────────────────────────────────
  const plans = PLAN_STRATEGIES.map((strategy) => {
    const result = strategy.fn(balance, units);
    const planUnits = result.items.map(i => ({ value: i.value, label: i.label, count: i.count }));
    const totalCount = planUnits.reduce((s, u) => s + u.count, 0);
    const typeCount = planUnits.length;
    return {
      id: strategy.id,
      name: strategy.name,
      reason: strategy.reason,
      scenario: strategy.scenario,
      sortScore: strategy.sortScore,
      totalCount,
      typeCount,
      units: planUnits,
    };
  });

  // Sort by sortScore (recommendation order)
  plans.sort((a, b) => a.sortScore - b.sortScore);

  return { status: "settled", balance, plans, currency: currencyCode };
}

const EPS = 1e-9;

export const CURRENCY_SETS = Object.freeze({
  USD: Object.freeze({
    symbol: "$", name: "USD", places: 2,
    units: Object.freeze([
      { value: 100,   label: "$100"     },
      { value: 50,    label: "$50"      },
      { value: 20,    label: "$20"      },
      { value: 10,    label: "$10"      },
      { value: 5,     label: "$5"       },
      { value: 2,     label: "$2"       },
      { value: 1,     label: "$1"       },
      { value: 0.25,  label: "Quarter"  },
      { value: 0.10,  label: "Dime"     },
      { value: 0.05,  label: "Nickel"   },
      { value: 0.01,  label: "Penny"    },
    ]),
    minCoin: 0.10,
  }),
  EUR: Object.freeze({
    symbol: "\u20AC", name: "EUR", places: 2,
    units: Object.freeze([
      { value: 500,   label: "\u20AC500"   },
      { value: 200,   label: "\u20AC200"   },
      { value: 100,   label: "\u20AC100"   },
      { value: 50,    label: "\u20AC50"    },
      { value: 20,    label: "\u20AC20"    },
      { value: 10,    label: "\u20AC10"    },
      { value: 5,     label: "\u20AC5"     },
      { value: 2,     label: "\u20AC2"     },
      { value: 1,     label: "\u20AC1"     },
      { value: 0.50,  label: "50c"  },
      { value: 0.20,  label: "20c"  },
      { value: 0.10,  label: "10c"  },
      { value: 0.05,  label: "5c"   },
      { value: 0.02,  label: "2c"   },
      { value: 0.01,  label: "1c"   },
    ]),
    minCoin: 0.10,
  }),
  JPY: Object.freeze({
    symbol: "\u00A5", name: "JPY", places: 0,
    units: Object.freeze([
      { value: 10000, label: "\u00A510000" },
      { value: 5000,  label: "\u00A55000"  },
      { value: 2000,  label: "\u00A52000"  },
      { value: 1000,  label: "\u00A51000"  },
      { value: 500,   label: "\u00A5500"   },
      { value: 100,   label: "\u00A5100"   },
      { value: 50,    label: "\u00A550"    },
      { value: 10,    label: "\u00A510"    },
      { value: 5,     label: "\u00A55"     },
      { value: 1,     label: "\u00A51"     },
    ]),
    minCoin: 1,
  }),
  CNY: Object.freeze({
    symbol: "\u00A5", name: "CNY", places: 1,
    units: Object.freeze([
      { value: 100,   label: "\u00A5100"   },
      { value: 50,    label: "\u00A550"    },
      { value: 20,    label: "\u00A520"    },
      { value: 10,    label: "\u00A510"    },
      { value: 5,     label: "\u00A55"     },
      { value: 1,     label: "\u00A51"     },
      { value: 0.5,   label: "5jiao" },
      { value: 0.1,   label: "1jiao" },
    ]),
    minCoin: 0.1,
  }),
});

export function getCurrency(code) {
  return CURRENCY_SETS[code] || CURRENCY_SETS.USD;
}

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

export function greedy(amount, units = CURRENCY_SETS.USD.units, cap = Infinity) {
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

const DESCRIPTIONS = {
  optimal:   "Uses the fewest pieces possible. Best for fast cash transactions — count and hand over quickly.",
  balanced:  "Spreads change across more denominations so you don't run out of small bills. Great for everyday wallet use.",
  practical: "Avoids tiny coins. Ideal when the receiver prefers fewer small coins in their pocket.",
};

export function calculate(price, paid, currencyCode = "USD") {
  const curr = getCurrency(currencyCode);
  const p = +(+price).toFixed(curr.places);
  const m = +(+paid).toFixed(curr.places);
  if (isNaN(p) || isNaN(m) || p < 0 || m < 0)
    return { status: "invalid", balance: 0, plans: [], currency: currencyCode };

  const balance = +(m - p).toFixed(curr.places);
  if (Math.abs(balance) < EPS)
    return { status: "exact", balance: 0, plans: [], currency: currencyCode };
  if (balance < 0)
    return { status: "short", balance, plans: [], currency: currencyCode };

  const strategies = [
    { id: "optimal",   name: "Optimal Plan",     cap: Infinity, filter: null },
    { id: "balanced",  name: "Balanced Plan",    cap: 3,        filter: null },
    { id: "practical", name: "Practical Plan",   cap: Infinity, filter: u => u.value >= curr.minCoin },
  ];

  const plans = strategies.map(s => {
    const units = s.filter ? curr.units.filter(s.filter) : curr.units;
    let result = greedy(balance, units, s.cap);

    if (s.id === "practical" && result.remaining > EPS) {
      const full = greedy(balance, curr.units);
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

  return { status: "settled", balance, plans, currency: currencyCode };
}

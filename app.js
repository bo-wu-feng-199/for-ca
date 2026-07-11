import { calculate, parseInput } from "./src/js/core.min.js";

const MAX_VAL = 1000;
const MAX_HIST = 500;
const PAGE_SIZE = 20;
const DB = 300;
const KEY_HIST = "cc_history";
const KEY_THEME = "cc_theme";
const KEY_FIRST = "cc_first_v2";
const LABELS = { optimal: "Optimal Plan", balanced: "Balanced Plan", practical: "Practical Plan" };
const TAG_LABELS = {
  shopping: "🛒 Shopping", dining: "🍜 Dining", travel: "🚗 Travel",
  cashier: "💰 Cashier", other: "📋 Other",
};
const QUICK_AMTS = [10, 20, 50, 100];
const SYM = "$";

const $ = id => document.getElementById(id);
const themeBtn   = $("theme-btn");
const priceInp   = $("price");
const paidInp    = $("paid");
const smartInp   = $("smart");
const errMsg     = $("error-msg");
const resultSec  = $("result-section");
const resultArea = $("result-area");
const histList   = $("history-list");
const histStats  = $("hist-stats");
const clearBtn   = $("clear-all");
const expJson    = $("export-json");
const expCsv     = $("export-csv");
const expMd      = $("export-md");
const expPrint   = $("export-print");
const demoBar    = $("demo-bar");
const demoClose  = $("demo-close");
const demoClick  = $("demo-click");
const searchInp  = $("hist-search");
const filterTag  = $("hist-filter");
const loadMore   = $("hist-load-more");
const quickBtns  = $("quick-btns");
const swapBtn    = $("swap-btn");
const modeRadios = document.querySelectorAll('input[name="imode"]');

let history = loadHist();
let dtimer, mode = "dual", searchQuery = "", filterValue = "", renderCount = PAGE_SIZE;

/* ══ Theme ═══════════════════════════════════════════════════════════════ */
function loadTheme() {
  try { return localStorage.getItem(KEY_THEME) || "light"; } catch { return "light"; }
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
  try { localStorage.setItem(KEY_THEME, t); } catch {}
}
themeBtn.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
setTheme(loadTheme());

/* ══ First-visit demo bar ═══════════════════════════════════════════════ */
(function initDemo() {
  try {
    if (localStorage.getItem(KEY_FIRST)) { demoBar.hidden = true; return; }
    localStorage.setItem(KEY_FIRST, "1");
    demoBar.hidden = false;
  } catch { demoBar.hidden = true; }
})();
demoClose.addEventListener("click", () => { demoBar.hidden = true; });
demoClick.addEventListener("click", () => {
  priceInp.value = "59.5"; paidInp.value = "100";
  if (mode === "smart") smartInp.value = "59.5 100";
  demoBar.hidden = true;
  debounceRun();
});

/* ══ Input mode ═════════════════════════════════════════════════════════ */
modeRadios.forEach(r => r.addEventListener("change", () => {
  mode = r.value;
  $("input-dual").hidden = mode !== "dual";
  $("input-smart").hidden = mode !== "smart";
  clearError();
  if (mode === "dual") {
    priceInp.value = smartInp.value.split(/[\s+/,]+/)[0] || "";
    paidInp.value = smartInp.value.split(/[\s+/,]+/)[1] || "";
    priceInp.focus();
  } else {
    const p = priceInp.value, m = paidInp.value;
    smartInp.value = p + (m ? (p.includes("/") ? "" : " ") + m : "");
    smartInp.focus();
  }
  debounceRun();
}));

/* ══ Input handling ═════════════════════════════════════════════════════ */
function sanitise(el) {
  el.value = el.value.replace(/[^0-9.,+/\s]/g, "");
  const d = el.value.indexOf(".");
  if (d !== -1) el.value = el.value.slice(0, d+1) + el.value.slice(d+1).replace(/\./g, "");
}
priceInp.addEventListener("input", () => { sanitise(priceInp); debounceRun(); });
paidInp.addEventListener("input", () => { sanitise(paidInp); debounceRun(); });
smartInp.addEventListener("input", () => debounceRun());

function getTag() {
  const r = document.querySelector('input[name="tag"]:checked');
  return r ? r.value : "other";
}
function clearError() { errMsg.hidden = true; }
function showError(msg) { errMsg.textContent = msg; errMsg.hidden = false; }

/* ══ Quick amount buttons ═══════════════════════════════════════════════ */
quickBtns.innerHTML = QUICK_AMTS.map(a =>
  `<button class="q-btn" data-val="${a}">+${SYM}${a}</button>`
).join("");
quickBtns.addEventListener("click", e => {
  const btn = e.target.closest(".q-btn");
  if (!btn) return;
  const val = parseFloat(btn.dataset.val);
  if (mode === "smart") {
    const parts = smartInp.value.split(/[\s+/,]+/) || ["", ""];
    smartInp.value = (parts[0] || "") + " " + ((parseFloat(parts[1]) || 0) + val);
  } else {
    paidInp.value = (parseFloat(paidInp.value) || 0) + val;
  }
  debounceRun();
});

/* ══ Swap price and paid ══════════════════════════════════════════════ */
swapBtn.addEventListener("click", () => {
  if (mode === "smart") {
    const parts = smartInp.value.split(/[\s+/,]+/);
    if (parts.length >= 2) {
      [parts[0], parts[1]] = [parts[1], parts[0]];
      smartInp.value = parts.join(" ");
    }
  } else {
    [priceInp.value, paidInp.value] = [paidInp.value, priceInp.value];
  }
  clearError();
  run();
});
function debounceRun() {
  clearTimeout(dtimer);
  dtimer = setTimeout(run, DB);
}

function run() {
  clearError();
  let price, paid;
  if (mode === "smart") {
    const p = parseInput(smartInp.value);
    if (!p) { hideResult(); return; }
    price = p.price; paid = p.paid;
  } else {
    const pv = priceInp.value, mv = paidInp.value;
    if (!pv || !mv) { hideResult(); return; }
    price = parseFloat(pv); paid = parseFloat(mv);
    if (isNaN(price) || isNaN(paid)) { hideResult(); return; }
  }
  if (price < 0 || paid < 0 || price > MAX_VAL || paid > MAX_VAL) {
    showError(`Amount range ${SYM}0.01 – ${SYM}${MAX_VAL.toLocaleString()}`);
    hideResult(); return;
  }
  const r = calculate(price, paid);
  showResult(r, price, paid);
}

function hideResult() { resultSec.hidden = true; }

/* ══ Result render — 2-tier ════════════════════════════════════════════ */
function showResult(r, price, paid) {
  resultSec.hidden = false;
  if (r.status === "short") {
    resultArea.innerHTML = `<div class="result-msg"><span class="s">Not enough</span> — short by ${SYM}${Math.abs(r.balance).toFixed(2)}</div>`;
    return;
  }
  if (r.status === "exact") {
    resultArea.innerHTML = `<div class="result-msg"><span class="s">Exact amount</span> — no change needed</div>`;
    return;
  }
  if (r.status === "invalid") {
    showError("Please enter valid amounts");
    hideResult(); return;
  }

  saveHist({ price, paid, balance: r.balance, planType: r.plans[0].id, tag: getTag() });

  const primary = r.plans[0];
  const others = r.plans.slice(1);

  const pu = primary.units.map(u =>
    `<span class="unit-chip"><span class="uc">${u.count}</span>${u.label}</span>`
  ).join("");

  const hero = `
    <div class="result-primary">
      <div class="rp-header">
        <span class="rp-badge">⭐ Recommended</span>
        <span class="rp-name">${primary.name}</span>
      </div>
      <div class="rp-balance">${SYM}${r.balance.toFixed(2)} <span class="rp-balance-lbl">change to give back</span></div>
      <div class="rp-units">${pu}</div>
      <div class="rp-meta">${primary.totalCount} piece${primary.totalCount !== 1 ? "s" : ""} · ${primary.typeCount} type${primary.typeCount !== 1 ? "s" : ""}</div>
      <div class="rp-desc">${primary.desc}</div>
    </div>`;

  const opts = others.map((p, i) => {
    const ou = p.units.map(u =>
      `<span class="unit-chip"><span class="uc">${u.count}</span>${u.label}</span>`
    ).join("");
    return `
      <details class="opt-card"${i === 0 ? " open" : ""}>
        <summary class="opt-summary">
          <span>${["⚖️","📦"][i]} ${p.name}</span>
          <span class="opt-meta">${p.totalCount} pcs · ${p.typeCount} types</span>
        </summary>
        <div class="opt-body">
          <div class="opt-units">${ou}</div>
          <div class="opt-desc">${p.desc}</div>
        </div>
      </details>`;
  }).join("");

  resultArea.innerHTML = hero + `<div class="result-others">${opts}</div>`;
}

/* ══ History — storage ═════════════════════════════════════════════════ */
function loadHist() {
  try {
    const arr = JSON.parse(localStorage.getItem(KEY_HIST));
    if (!Array.isArray(arr)) return [];
    return arr.filter(e => e && typeof e.price === "number" && typeof e.paid === "number" && typeof e.balance === "number");
  } catch { return []; }
}
function persist() {
  try { localStorage.setItem(KEY_HIST, JSON.stringify(history)); } catch {}
}

function saveHist(entry) {
  history.unshift({ ...entry, timestamp: Date.now() });
  if (history.length > MAX_HIST) history = history.slice(0, MAX_HIST);
  persist();
  renderHist();
  renderStats();
}

function getFiltered() {
  let list = history;
  if (filterValue) list = list.filter(e => e.tag === filterValue);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(e =>
      String(e.price).includes(q) || String(e.paid).includes(q) || (e.tag || "").includes(q)
    );
  }
  return list;
}

/* ══ History — stats ════════════════════════════════════════════════════ */
function renderStats() {
  if (history.length === 0) {
    histStats.innerHTML = "";
    return;
  }
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const todayEntries = history.filter(e => e.timestamp >= todayStart);
  const avg = todayEntries.length
    ? todayEntries.reduce((s, e) => s + e.balance, 0) / todayEntries.length
    : 0;
  const tagCount = {};
  todayEntries.forEach(e => { tagCount[e.tag] = (tagCount[e.tag] || 0) + 1; });
  const topTag = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0];
  histStats.innerHTML = `
    <div class="stats-row">
      <span class="stat">📊 Today: <strong>${todayEntries.length}</strong> calc${todayEntries.length !== 1 ? "s" : ""}</span>
      ${avg ? `<span class="stat">Avg change: <strong>${SYM}${avg.toFixed(2)}</strong></span>` : ""}
      ${topTag ? `<span class="stat">Top tag: <strong>${TAG_LABELS[topTag[0]] || topTag[0]}</strong> (${topTag[1]})</span>` : ""}
    </div>`;
}

/* ══ History — render ════════════════════════════════════════════════ */
function renderHist() {
  const filtered = getFiltered();
  const page = filtered.slice(0, renderCount);

  if (page.length === 0) {
    histList.innerHTML = `<div class="hist-empty">${filtered.length === 0 && history.length > 0 ? "No results match your search" : "No records yet"}</div>`;
    loadMore.hidden = true;
    return;
  }

  histList.innerHTML = page.map((e, i) => {
    const t = new Date(e.timestamp);
    const ts = `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
    const tag = TAG_LABELS[e.tag] || "";
    return `
      <div class="hist-entry" data-idx="${history.indexOf(e)}">
        <div class="hist-body">
          <div class="hist-r1">
            <span class="hist-am">${SYM}${e.price.toFixed(2)} → ${SYM}${e.paid.toFixed(2)}</span>
            <span class="hist-df">${SYM}${e.balance.toFixed(2)}</span>
            <span class="hist-plan">${LABELS[e.planType] || e.planType}</span>
            ${tag ? `<span class="hist-tag">${tag}</span>` : ""}
          </div>
          <div class="hist-meta">${ts}</div>
        </div>
      </div>`;
  }).join("");

  loadMore.hidden = filtered.length <= renderCount;

  document.querySelectorAll(".hist-entry").forEach(el => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.idx);
      const e = history[idx];
      if (!e) return;
      priceInp.value = String(e.price);
      paidInp.value = String(e.paid);
      if (mode === "smart") smartInp.value = `${e.price} ${e.paid}`;
      clearError();
      run();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

/* ══ History — search, filter, load more ═════════════════════════════ */
searchInp.addEventListener("input", () => {
  searchQuery = searchInp.value;
  renderCount = PAGE_SIZE;
  renderHist();
});
filterTag.addEventListener("change", () => {
  filterValue = filterTag.value;
  renderCount = PAGE_SIZE;
  renderHist();
});
loadMore.addEventListener("click", () => {
  renderCount += PAGE_SIZE;
  renderHist();
});
clearBtn.addEventListener("click", () => {
  history = []; renderCount = PAGE_SIZE;
  persist(); renderHist(); renderStats();
});

/* ══ Export ═════════════════════════════════════════════════════════════ */
function dl(content, name, mime = "text/plain") {
  const b = new Blob([content], { type: `${mime};charset=utf-8` });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = name; a.click();
  URL.revokeObjectURL(u);
}

expJson.addEventListener("click", () => {
  dl(JSON.stringify(history.map(e => ({
    price: e.price, paid: e.paid, diff: e.balance,
    planType: e.planType, tag: e.tag, timestamp: new Date(e.timestamp).toISOString()
  })), null, 2), "records.json", "application/json");
});

expCsv.addEventListener("click", () => {
  const h = "price,paid,diff,planType,tag,timestamp\n";
  dl("\uFEFF" + h + history.map(e =>
    `${e.price},${e.paid},${e.balance},${e.planType},${e.tag || ""},"${new Date(e.timestamp).toISOString()}"`
  ).join("\n"), "records.csv", "text/csv");
});

expMd.addEventListener("click", () => {
  const h = "| Price | Paid | Diff | Plan | Tag | Time |\n|------|------|------|------|------|------|\n";
  dl("# CashCalc Records\n\n" + h + history.map(e => {
    const t = new Date(e.timestamp);
    return `| ${SYM}${e.price.toFixed(2)} | ${SYM}${e.paid.toFixed(2)} | ${SYM}${e.balance.toFixed(2)} | ${LABELS[e.planType] || e.planType} | ${TAG_LABELS[e.tag] || ""} | ${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2,"0")} |`;
  }).join("\n") + "\n", "records.md", "text/markdown");
});

expPrint.addEventListener("click", () => window.print());

/* ══ Init ══════════════════════════════════════════════════════════════ */
renderHist();
renderStats();

/* ══ URL sharing — ?price=X&paid=Y ════════════════════════════════════ */
(function loadFromURL() {
  try {
    const p = new URLSearchParams(location.search);
    const pr = p.get("price"), pa = p.get("paid");
    if (pr && pa) {
      priceInp.value = pr;
      paidInp.value = pa;
      if (mode === "smart") smartInp.value = pr + " " + pa;
      setTimeout(run, 50);
    }
  } catch {}
})();

/* ══ Keyboard shortcuts ════════════════════════════════════════════════ */
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    priceInp.value = "";
    paidInp.value = "";
    smartInp.value = "";
    clearError();
    hideResult();
    priceInp.focus();
    return;
  }
  if (e.key === "Enter") {
    const t = e.target;
    if (t === priceInp || t === paidInp || t === smartInp) {
      e.preventDefault();
      run();
    }
  }
});

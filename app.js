import { calculate, parseInput, getCurrency, CURRENCY_SETS } from "./src/js/core.min.js";

const MAX_VAL = 1000;
const MAX_HIST = 500;
const PAGE_SIZE = 20;
const DB = 300;
const KEY_HIST = "cc_history";
const KEY_THEME = "cc_theme";
const KEY_FIRST = "cc_first_v2";
const KEY_LAST_TAG = "cc_last_tag";
const KEY_CURRENCY = "cc_currency";
const LABELS = { optimal: "Optimal Plan", balanced: "Balanced Plan", practical: "Practical Plan" };
const TAG_LABELS = {
  shopping: "\uD83D\uDED2 Shopping", dining: "\uD83C\uDF5C Dining", travel: "\uD83D\uDE97 Travel",
  cashier: "\uD83D\uDCB0 Cashier", other: "\uD83D\uDCCB Other",
};
const TAG_LIST = Object.keys(TAG_LABELS);
const QUICK_AMTS = [10, 20, 50, 100];

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
const importBtn  = $("import-btn");
const importFile = $("import-file");
const demoBar    = $("demo-bar");
const demoClose  = $("demo-close");
const demoClick  = $("demo-click");
const searchInp  = $("hist-search");
const filterTag  = $("hist-filter");
const loadMore   = $("hist-load-more");
const quickBtns  = $("quick-btns");
const swapBtn    = $("swap-btn");
const curSelect  = $("currency-select");
const calcNote   = $("calc-note");
const splitTotal = $("split-total");
const splitPeople= $("split-people");
const splitResult= $("split-result");
const splitSym   = $("split-sym");
const modeRadios = document.querySelectorAll('input[name="imode"]');

let history = loadHist();
let dtimer, mode = "dual", searchQuery = "", filterValue = "", renderCount = PAGE_SIZE;
let lastCurrency = loadCurrency();

function cur() { return getCurrency(lastCurrency); }
function sym() { return cur().symbol; }

/* ══ Currency ═══════════════════════════════════════════════════════════ */
function loadCurrency() {
  try { return localStorage.getItem(KEY_CURRENCY) || "USD"; } catch { return "USD"; }
}
function saveCurrency(c) {
  lastCurrency = c;
  try { localStorage.setItem(KEY_CURRENCY, c); } catch {}
}

curSelect.value = lastCurrency;
curSelect.addEventListener("change", () => {
  saveCurrency(curSelect.value);
  updateCurrencyUI();
  debounceRun();
});

function updateCurrencyUI() {
  const c = cur();
  document.querySelectorAll(".inp-prefix").forEach(el => { el.textContent = c.symbol; });
  splitSym.textContent = c.symbol;
  priceInp.placeholder = "0" + (c.places > 0 ? "." + "0".repeat(c.places) : "");
  paidInp.placeholder = priceInp.placeholder;
  smartInp.placeholder = c.places > 0 ? "e.g. 23.50 50" : "e.g. 1500 5000";
}
updateCurrencyUI();

/* ══ Theme ═══════════════════════════════════════════════════════════════ */
function loadTheme() {
  try { return localStorage.getItem(KEY_THEME) || "light"; } catch { return "light"; }
}
function setTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t === "dark" ? "\u2600\uFE0F" : "\uD83C\uDF19";
  try { localStorage.setItem(KEY_THEME, t); } catch {}
}
themeBtn.addEventListener("click", () => {
  setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
});
setTheme(loadTheme());

/* ══ First-visit ════════════════════════════════════════════════════════ */
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

const tagRadios = () => document.querySelectorAll('input[name="tag"]');
function getTag() {
  const r = document.querySelector('input[name="tag"]:checked');
  return r ? r.value : "other";
}
function setTag(val) {
  const r = document.querySelector(`input[name="tag"][value="${val}"]`);
  if (r) r.checked = true;
}
/* Last tag persistence */
(function loadLastTag() {
  try {
    const t = localStorage.getItem(KEY_LAST_TAG);
    if (t && TAG_LIST.includes(t)) setTag(t);
  } catch {}
})();
tagRadios().forEach(r => r.addEventListener("change", () => {
  try { localStorage.setItem(KEY_LAST_TAG, r.value); } catch {}
}));

function clearError() { errMsg.hidden = true; }
function showError(msg) { errMsg.textContent = msg; errMsg.hidden = false; }

/* ══ Quick amount buttons ═══════════════════════════════════════════════ */
quickBtns.innerHTML = QUICK_AMTS.map(a =>
  `<button class="q-btn" data-val="${a}">+${sym()}${a}</button>`
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

/* ══ Swap ═══════════════════════════════════════════════════════════════ */
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

/* ══ Bill split ═════════════════════════════════════════════════════════ */
function calcSplit() {
  const total = parseFloat(splitTotal.value);
  const people = parseInt(splitPeople.value) || 2;
  if (!total || total <= 0 || people < 2) { splitResult.innerHTML = ""; return; }
  const per = +(total / people).toFixed(cur().places);
  const remainder = +(total - per * (people - 1)).toFixed(cur().places);
  splitResult.innerHTML = `
    <div class="split-line">${sym()}${total.toFixed(cur().places)} ÷ ${people} = <strong>${sym()}${per.toFixed(cur().places)}</strong> each</div>
    <div class="split-line">Last person pays <strong>${sym()}${remainder.toFixed(cur().places)}</strong></div>`;
}
splitTotal.addEventListener("input", calcSplit);
splitPeople.addEventListener("input", calcSplit);
document.querySelectorAll("input[name='split-method']").forEach(r => r.addEventListener("change", calcSplit));

/* ══ Calculation ════════════════════════════════════════════════════════ */
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
    showError(`Amount range ${sym()}0.01 – ${sym()}${MAX_VAL.toLocaleString()}`);
    hideResult(); return;
  }
  const r = calculate(price, paid, lastCurrency);
  showResult(r, price, paid);
}

function hideResult() { resultSec.hidden = true; }

/* ══ Result render ══════════════════════════════════════════════════════ */
function showResult(r, price, paid) {
  resultSec.hidden = false;
  const s = cur().symbol, p = cur().places;
  if (r.status === "short") {
    resultArea.innerHTML = `<div class="result-msg"><span class="s">Not enough</span> — short by ${s}${Math.abs(r.balance).toFixed(p)}</div>`;
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

  saveHist({ price, paid, balance: r.balance, planType: r.plans[0].id, tag: getTag(), note: calcNote.value.trim(), currency: lastCurrency });

  const primary = r.plans[0], others = r.plans.slice(1);
  const pu = primary.units.map(u => `<span class="unit-chip"><span class="uc">${u.count}</span>${u.label}</span>`).join("");
  const hero = `
    <div class="result-primary">
      <div class="rp-header">
        <span class="rp-badge">⭐ Recommended</span>
        <span class="rp-name">${primary.name}</span>
      </div>
      <div class="rp-balance">${s}${r.balance.toFixed(p)} <span class="rp-balance-lbl">change to give back</span></div>
      <div class="rp-units">${pu}</div>
      <div class="rp-meta">${primary.totalCount} piece${primary.totalCount !== 1 ? "s" : ""} · ${primary.typeCount} type${primary.typeCount !== 1 ? "s" : ""}</div>
      <div class="rp-desc">${primary.desc}</div>
    </div>`;
  const opts = others.map((pl, i) => {
    const ou = pl.units.map(u => `<span class="unit-chip"><span class="uc">${u.count}</span>${u.label}</span>`).join("");
    return `<details class="opt-card"${i === 0 ? " open" : ""}>
      <summary class="opt-summary"><span>${["⚖️","📦"][i]} ${pl.name}</span><span class="opt-meta">${pl.totalCount} pcs · ${pl.typeCount} types</span></summary>
      <div class="opt-body"><div class="opt-units">${ou}</div><div class="opt-desc">${pl.desc}</div></div>
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
      String(e.price).includes(q) || String(e.paid).includes(q) || (e.tag || "").includes(q) || (e.note || "").toLowerCase().includes(q)
    );
  }
  return list;
}

/* ══ History — stats ════════════════════════════════════════════════════ */
function renderStats() {
  if (history.length === 0) { histStats.innerHTML = ""; return; }
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const td = history.filter(e => e.timestamp >= todayStart);
  const avg = td.length ? td.reduce((s, e) => s + e.balance, 0) / td.length : 0;
  const tagCount = {};
  td.forEach(e => { tagCount[e.tag] = (tagCount[e.tag] || 0) + 1; });
  const top = Object.entries(tagCount).sort((a, b) => b[1] - a[1])[0];
  histStats.innerHTML = `
    <div class="stats-row">
      <span class="stat">📊 Today: <strong>${td.length}</strong> calc${td.length !== 1 ? "s" : ""}</span>
      ${avg ? `<span class="stat">Avg change: <strong>${sym()}${avg.toFixed(cur().places)}</strong></span>` : ""}
      ${top ? `<span class="stat">Top tag: <strong>${TAG_LABELS[top[0]] || top[0]}</strong> (${top[1]})</span>` : ""}
    </div>`;
}

/* ══ History — render ══════════════════════════════════════════════════ */
function renderHist() {
  const filtered = getFiltered();
  const page = filtered.slice(0, renderCount);
  if (page.length === 0) {
    histList.innerHTML = `<div class="hist-empty">${filtered.length === 0 && history.length > 0 ? "No results match your search" : "No records yet"}</div>`;
    loadMore.hidden = true; return;
  }
  histList.innerHTML = page.map((e, i) => {
    const t = new Date(e.timestamp);
    const ts = `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
    const tag = TAG_LABELS[e.tag] || "";
    const c = getCurrency(e.currency || "USD");
    const noteHtml = e.note ? `<span class="hist-note">${e.note}</span>` : "";
    return `<div class="hist-entry" data-idx="${history.indexOf(e)}">
      <div class="hist-body">
        <div class="hist-r1">
          <span class="hist-am">${c.symbol}${e.price.toFixed(c.places)} → ${c.symbol}${e.paid.toFixed(c.places)}</span>
          <span class="hist-df">${c.symbol}${e.balance.toFixed(c.places)}</span>
          <span class="hist-plan">${LABELS[e.planType] || e.planType}</span>
          ${tag ? `<span class="hist-tag">${tag}</span>` : ""}
          ${noteHtml}
        </div>
        <div class="hist-meta">${ts}${e.currency ? " · " + e.currency : ""}</div>
      </div>
    </div>`;
  }).join("");
  loadMore.hidden = filtered.length <= renderCount;
  document.querySelectorAll(".hist-entry").forEach(el => {
    el.addEventListener("click", () => {
      const idx = parseInt(el.dataset.idx);
      const e = history[idx];
      if (!e) return;
      if (e.currency && e.currency !== lastCurrency) {
        curSelect.value = e.currency;
        saveCurrency(e.currency);
        updateCurrencyUI();
      }
      priceInp.value = String(e.price);
      paidInp.value = String(e.paid);
      if (mode === "smart") smartInp.value = `${e.price} ${e.paid}`;
      if (e.tag) setTag(e.tag);
      if (e.note) calcNote.value = e.note;
      clearError();
      run();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });
}

/* ══ History — search, filter, load more ═══════════════════════════════ */
searchInp.addEventListener("input", () => { searchQuery = searchInp.value; renderCount = PAGE_SIZE; renderHist(); });
filterTag.addEventListener("change", () => { filterValue = filterTag.value; renderCount = PAGE_SIZE; renderHist(); });
loadMore.addEventListener("click", () => { renderCount += PAGE_SIZE; renderHist(); });
clearBtn.addEventListener("click", () => { history = []; renderCount = PAGE_SIZE; persist(); renderHist(); renderStats(); });

/* ══ Import history ══════════════════════════════════════════════════════ */
importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(ev) {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error("Invalid format");
      const valid = data.filter(d => d && typeof d.price === "number" && typeof d.paid === "number");
      if (valid.length === 0) { showError("No valid records found in file"); return; }
      history = valid.concat(history).slice(0, MAX_HIST);
      persist(); renderHist(); renderStats();
      clearError();
    } catch (err) { showError("Import failed: " + err.message); }
  };
  reader.readAsText(file);
  importFile.value = "";
});

/* ══ Export ═════════════════════════════════════════════════════════════ */
function dl(content, name, mime = "text/plain") {
  const b = new Blob([content], { type: `${mime};charset=utf-8` });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = name; a.click();
  URL.revokeObjectURL(u);
}

function fmt(e) {
  const c = getCurrency(e.currency || "USD");
  return { s: c.symbol, p: c.places };
}

expJson.addEventListener("click", () => {
  dl(JSON.stringify(history.map(e => ({
    price: e.price, paid: e.paid, diff: e.balance,
    planType: e.planType, tag: e.tag, note: e.note || "", currency: e.currency || "USD",
    timestamp: new Date(e.timestamp).toISOString()
  })), null, 2), "records.json", "application/json");
});

expCsv.addEventListener("click", () => {
  const h = "price,paid,diff,planType,tag,note,currency,timestamp\n";
  dl("\uFEFF" + h + history.map(e =>
    `${e.price},${e.paid},${e.balance},${e.planType},${e.tag || ""},${(e.note || "").replace(/,/g,";")},${e.currency || "USD"},"${new Date(e.timestamp).toISOString()}"`
  ).join("\n"), "records.csv", "text/csv");
});

expMd.addEventListener("click", () => {
  const h = "| Price | Paid | Diff | Plan | Tag | Note | Currency | Time |\n|------|------|------|------|------|------|----------|------|\n";
  dl("# CashCalc Records\n\n" + h + history.map(e => {
    const t = new Date(e.timestamp);
    const c = getCurrency(e.currency || "USD");
    return `| ${c.symbol}${e.price.toFixed(c.places)} | ${c.symbol}${e.paid.toFixed(c.places)} | ${c.symbol}${e.balance.toFixed(c.places)} | ${LABELS[e.planType] || e.planType} | ${TAG_LABELS[e.tag] || ""} | ${e.note || ""} | ${e.currency || "USD"} | ${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2,"0")} |`;
  }).join("\n") + "\n", "records.md", "text/markdown");
});

expPrint.addEventListener("click", () => window.print());

/* ══ Keyboard shortcuts ════════════════════════════════════════════════ */
let histFocusIdx = -1;
document.addEventListener("keydown", e => {
  if (e.key === "Escape") {
    priceInp.value = ""; paidInp.value = ""; smartInp.value = "";
    clearError(); hideResult(); priceInp.focus(); return;
  }
  if (e.key === "Enter" && (e.target === priceInp || e.target === paidInp || e.target === smartInp)) {
    e.preventDefault(); run(); return;
  }
  if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    const entries = document.querySelectorAll(".hist-entry");
    if (entries.length === 0) return;
    if (e.key === "ArrowDown") histFocusIdx = Math.min(histFocusIdx + 1, entries.length - 1);
    else histFocusIdx = Math.max(histFocusIdx - 1, 0);
    entries.forEach((el, i) => el.classList.toggle("hist-focused", i === histFocusIdx));
    entries[histFocusIdx].scrollIntoView({ block: "nearest" });
  }
});

/* ══ Init ══════════════════════════════════════════════════════════════ */
renderHist();
renderStats();

/* ══ URL sharing ════════════════════════════════════════════════════════ */
(function loadFromURL() {
  try {
    const p = new URLSearchParams(location.search);
    const pr = p.get("price"), pa = p.get("paid"), cu = p.get("currency");
    if (cu && CURRENCY_SETS[cu]) {
      curSelect.value = cu;
      saveCurrency(cu);
      updateCurrencyUI();
    }
    if (pr && pa) {
      priceInp.value = pr; paidInp.value = pa;
      if (mode === "smart") smartInp.value = pr + " " + pa;
      setTimeout(run, 50);
    }
  } catch {}
})();

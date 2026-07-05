/**
 * CashCalc v3.2 — UI controller (USD).
 */

import { calculate, parseInput } from "./src/js/core.js";

const MAX_VAL = 1000;
const MAX_HIST = 10;
const DB = 300;
const KEY_HIST = "cc32_history";
const KEY_THEME = "cc32_theme";
const LABELS = { optimal: "Optimal", balanced: "Balanced", practical: "Practical" };
const TAG_LABELS = {
  shopping: "🛒 Shopping", dining: "🍜 Dining", travel: "🚗 Travel",
  cashier: "💰 Cashier", other: "📋 Other",
};

const themeBtn   = document.getElementById("theme-btn");
const priceInp   = document.getElementById("price");
const paidInp    = document.getElementById("paid");
const smartInp   = document.getElementById("smart");
const errMsg     = document.getElementById("error-msg");
const resultArea = document.getElementById("result-area");
const balanceBar = document.getElementById("balance-bar");
const plansCtn   = document.getElementById("plans-container");
const histList   = document.getElementById("history-list");
const clearBtn   = document.getElementById("clear-all");
const expJson    = document.getElementById("export-json");
const expCsv     = document.getElementById("export-csv");
const expMd      = document.getElementById("export-md");
const tabs       = document.querySelectorAll(".tab");

const SYM = "$";
let history = loadHist();
let dtimer;
let mode = "dual";

/* ═══════════════════════════════════════════════════════════════════════════
   Theme
   ═══════════════════════════════════════════════════════════════════════════ */
function loadTheme() {
  try { return localStorage.getItem(KEY_THEME) || "light"; } catch { return "light"; }
}

function setTheme(t) {
  document.documentElement.dataset.theme = t;
  themeBtn.textContent = t === "dark" ? "☀️" : "🌙";
  try { localStorage.setItem(KEY_THEME, t); } catch {}
}

themeBtn.addEventListener("click", () => {
  const cur = document.documentElement.dataset.theme;
  setTheme(cur === "dark" ? "light" : "dark");
});

setTheme(loadTheme());

/* ═══════════════════════════════════════════════════════════════════════════
   Input mode
   ═══════════════════════════════════════════════════════════════════════════ */
tabs.forEach(t => t.addEventListener("click", () => {
  tabs.forEach(x => x.classList.toggle("tab-active", x === t));
  mode = t.dataset.mode;
  document.getElementById("input-dual").hidden = mode !== "dual";
  document.getElementById("input-smart").hidden = mode !== "smart";
  clearError();
  if (mode === "dual") {
    priceInp.value = smartInp.value.split(/[\s+,]/)[0] || "";
    paidInp.value = smartInp.value.split(/[\s+,]/)[1] || "";
    priceInp.focus();
  } else {
    smartInp.value = priceInp.value + (paidInp.value ? " " + paidInp.value : "");
    smartInp.focus();
  }
  debounceRun();
}));

/* ═══════════════════════════════════════════════════════════════════════════
   Input handling
   ═══════════════════════════════════════════════════════════════════════════ */
function sanitise(el) {
  el.value = el.value.replace(/[^0-9.,+\s]/g, "");
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

/* ═══════════════════════════════════════════════════════════════════════════
   Calculation
   ═══════════════════════════════════════════════════════════════════════════ */
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
    showError(`Amount range ${SYM}0.01 ~ ${SYM}${MAX_VAL.toLocaleString()}`);
    hideResult();
    return;
  }

  const r = calculate(price, paid);
  showResult(r, price, paid);
}

function hideResult() { resultArea.hidden = true; }

/* ═══════════════════════════════════════════════════════════════════════════
   Render results
   ═══════════════════════════════════════════════════════════════════════════ */
function showResult(r, price, paid) {
  resultArea.hidden = false;

  if (r.status === "short") {
    balanceBar.innerHTML = "";
    plansCtn.innerHTML = `<div class="result-msg"><span class="s">Insufficient payment</span> — short by ${SYM}${Math.abs(r.balance).toFixed(2)}</div>`;
    return;
  }
  if (r.status === "exact") {
    balanceBar.innerHTML = "";
    plansCtn.innerHTML = `<div class="result-msg"><span class="s">Exact amount</span> — no change needed</div>`;
    return;
  }
  if (r.status === "invalid") {
    showError("Enter valid amounts");
    hideResult();
    return;
  }

  saveHist({ price, paid, balance: r.balance, planType: r.plans[0].id, tag: getTag() });

  balanceBar.innerHTML = `
    <div><div class="lbl">Balance</div><div class="val">${SYM}${r.balance.toFixed(2)}</div></div>
    <div><span class="tag">${r.plans[0].name} ★</span></div>`;

  const icons = ["⭐", "⚖️", "📦"];
  const ranks = ["★ Recommended", "Alternative", "Alternative"];

  plansCtn.innerHTML = r.plans.map((p, i) => {
    const uhtml = p.units.map(u =>
      `<span class="unit"><span class="c">${u.count}</span>${u.label}</span>`
    ).join("");
    return `
      <div class="plan">
        <div class="plan-head">
          <span>${icons[i]}</span>
          <span class="nm">${p.name}</span>
          <span class="rk">${ranks[i]}</span>
          <span class="mt">
            <span>${p.totalCount} piece${p.totalCount !== 1 ? "s" : ""}</span>
            <span>${p.typeCount} type${p.typeCount !== 1 ? "s" : ""}</span>
          </span>
        </div>
        <div class="plan-body">
          <div class="units">${uhtml}</div>
          <div class="plan-desc">${p.desc}</div>
        </div>
      </div>`;
  }).join("");
}

/* ═══════════════════════════════════════════════════════════════════════════
   History
   ═══════════════════════════════════════════════════════════════════════════ */
function loadHist() {
  try { return JSON.parse(localStorage.getItem(KEY_HIST)) || []; } catch { return []; }
}
function persist() {
  try { localStorage.setItem(KEY_HIST, JSON.stringify(history)); } catch {}
}

function saveHist(entry) {
  history.unshift({ ...entry, timestamp: Date.now() });
  if (history.length > MAX_HIST) history = history.slice(0, MAX_HIST);
  persist();
  renderHist();
}

function renderHist() {
  if (history.length === 0) {
    histList.innerHTML = `<div class="hist-empty">No records yet</div>`;
    return;
  }

  histList.innerHTML = history.map((e, i) => {
    const t = new Date(e.timestamp);
    const ts = `${t.getMonth()+1}/${t.getDate()} ${String(t.getHours()).padStart(2,"0")}:${String(t.getMinutes()).padStart(2,"0")}`;
    const tag = TAG_LABELS[e.tag] || "";
    return `
      <div class="hist-entry" data-idx="${i}">
        <div class="hist-body">
          <div class="hist-row1">
            <span class="hist-amounts">${SYM}${e.price.toFixed(2)} → ${SYM}${e.paid.toFixed(2)}</span>
            <span class="hist-diff">${SYM}${e.balance.toFixed(2)}</span>
            <span class="hist-plan">${LABELS[e.planType] || e.planType}</span>
            ${tag ? `<span class="hist-tag">${tag}</span>` : ""}
          </div>
          <div class="hist-meta">${ts}</div>
        </div>
      </div>`;
  }).join("");

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

clearBtn.addEventListener("click", () => {
  history = []; persist(); renderHist();
});

/* ═══════════════════════════════════════════════════════════════════════════
   Export
   ═══════════════════════════════════════════════════════════════════════════ */
function dl(content, name, mime = "text/plain") {
  const b = new Blob([content], { type: `${mime};charset=utf-8` });
  const u = URL.createObjectURL(b);
  const a = document.createElement("a");
  a.href = u; a.download = name; a.click();
  URL.revokeObjectURL(u);
}

expJson.addEventListener("click", () => {
  const d = history.map(e => ({
    price: e.price, paid: e.paid, diff: e.balance,
    planType: e.planType, tag: e.tag,
    timestamp: new Date(e.timestamp).toISOString()
  }));
  dl(JSON.stringify(d, null, 2), "records.json", "application/json");
});

expCsv.addEventListener("click", () => {
  const h = "price,paid,diff,planType,tag,timestamp\n";
  const r = history.map(e =>
    `${e.price},${e.paid},${e.balance},${e.planType},${e.tag || ""},"${new Date(e.timestamp).toISOString()}"`
  ).join("\n");
  dl("\uFEFF" + h + r, "records.csv", "text/csv");
});

expMd.addEventListener("click", () => {
  const h = "| Price | Paid | Diff | Plan | Tag | Time |\n|------|------|------|------|------|------|\n";
  const r = history.map(e => {
    const t = new Date(e.timestamp);
    const ts = `${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2,"0")}`;
    const tag = TAG_LABELS[e.tag] || "";
    return `| ${SYM}${e.price.toFixed(2)} | ${SYM}${e.paid.toFixed(2)} | ${SYM}${e.balance.toFixed(2)} | ${LABELS[e.planType] || e.planType} | ${tag} | ${ts} |`;
  }).join("\n");
  dl(`# CashCalc Records\n\n${h}${r}\n`, "records.md", "text/markdown");
});

/* ═══════════════════════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════════════════════ */
renderHist();

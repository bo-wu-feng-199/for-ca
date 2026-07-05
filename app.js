/**
 * CashCalc — UI controller (mass-market edition).
 */

import { calculate, parseInput } from "./src/js/core.js";

const MAX_VAL = 1000;
const MAX_HIST = 10;
const DB = 300;
const KEY_HIST = "cc_history";
const KEY_THEME = "cc_theme";
const LABELS = { optimal: "Best Plan", balanced: "Balanced", practical: "Easy Change" };
const TAG_LABELS = {
  shopping: "🛒 Shopping", dining: "🍜 Dining", travel: "🚗 Travel",
  cashier: "💰 Cashier", other: "📋 Other",
};
const SYM = "$";

/* ── DOM ───────────────────────────────────────────────────────────────── */
const themeBtn   = document.getElementById("theme-btn");
const priceInp   = document.getElementById("price");
const paidInp    = document.getElementById("paid");
const smartInp   = document.getElementById("smart");
const errMsg     = document.getElementById("error-msg");
const resultSec  = document.getElementById("result-section");
const resultArea = document.getElementById("result-area");
const histList   = document.getElementById("history-list");
const clearBtn   = document.getElementById("clear-all");
const expJson    = document.getElementById("export-json");
const expCsv     = document.getElementById("export-csv");
const expMd      = document.getElementById("export-md");

const modeRadios = document.querySelectorAll('input[name="imode"]');

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
   Input mode switching
   ═══════════════════════════════════════════════════════════════════════════ */
modeRadios.forEach(r => r.addEventListener("change", () => {
  mode = r.value;
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
    showError(`Amount range ${SYM}0.01 – ${SYM}${MAX_VAL.toLocaleString()}`);
    hideResult();
    return;
  }

  const r = calculate(price, paid);
  showResult(r, price, paid);
}

function hideResult() { resultSec.hidden = true; }

/* ═══════════════════════════════════════════════════════════════════════════
   Render — big cards, big numbers
   ═══════════════════════════════════════════════════════════════════════════ */
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
    hideResult();
    return;
  }

  saveHist({ price, paid, balance: r.balance, planType: r.plans[0].id, tag: getTag() });

  const ranks = ["🥇 Best pick", "🥈 Also good", "🥉 Third option"];

  const hero = `
    <div class="balance-hero">
      <div class="lbl">Change to give back</div>
      <div class="val">${SYM}${r.balance.toFixed(2)}</div>
      <div class="rec">${r.plans[0].name} — ${r.plans[0].totalCount} piece${r.plans[0].totalCount !== 1 ? "s" : ""}</div>
    </div>`;

  const cards = r.plans.map((p, i) => {
    const uhtml = p.units.map(u =>
      `<span class="unit-chip"><span class="uc">${u.count}</span>${u.label}</span>`
    ).join("");
    const featured = i === 0 ? " pc-featured" : "";
    return `
      <div class="plan-card${featured}">
        <div class="plan-header">
          <span>${["⭐","⚖️","📦"][i]}</span>
          <span class="pn">${p.name}</span>
          <span class="pr">${ranks[i]}</span>
          <span class="pm">
            <span>${p.totalCount} piece${p.totalCount !== 1 ? "s" : ""}</span>
            <span>${p.typeCount} type${p.typeCount !== 1 ? "s" : ""}</span>
          </span>
        </div>
        <div class="plan-body">
          <div class="unit-row">${uhtml}</div>
          <div class="plan-desc">${p.desc}</div>
        </div>
      </div>`;
  }).join("");

  resultArea.innerHTML = hero + `<div class="plans-stack">${cards}</div>`;
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

clearBtn.addEventListener("click", () => { history = []; persist(); renderHist(); });

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

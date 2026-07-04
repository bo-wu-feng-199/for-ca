/**
 * CashCalc v3.2 — UI controller.
 * 全展开 · 实时计算 · 历史记录 · 三格式导出 · 主题切换
 */

import { calculate, parseInput } from "./src/js/core.js";

/* ── Constants ─────────────────────────────────────────────────────────── */
const MAX_VAL = 1000;
const MAX_HIST = 10;
const DB = 300; // debounce ms
const KEY_HIST = "cc32_history";
const KEY_THEME = "cc32_theme";
const LABELS = { optimal: "最优", balanced: "均衡", practical: "实操" };
const TAG_LABELS = { shopping: "🛒 购物", dining: "🍜 餐饮", travel: "🚗 出行", cashier: "💰 收银", other: "📋 其他" };

/* ── DOM ───────────────────────────────────────────────────────────────── */
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
    showError(`金额范围 ¥0.01 ~ ¥${MAX_VAL.toLocaleString()}`);
    hideResult();
    return;
  }

  const r = calculate(price, paid);
  showResult(r, price, paid);
}

function hideResult() {
  resultArea.hidden = true;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Render results — all 3 plans expanded
   ═══════════════════════════════════════════════════════════════════════════ */
function showResult(r, price, paid) {
  resultArea.hidden = false;

  if (r.status === "short") {
    balanceBar.innerHTML = "";
    plansCtn.innerHTML = `<div class="result-msg"><span class="s">金额不足</span>，还差 ¥${Math.abs(r.balance).toFixed(2)}</div>`;
    return;
  }
  if (r.status === "exact") {
    balanceBar.innerHTML = "";
    plansCtn.innerHTML = `<div class="result-msg"><span class="s">支付金额正好</span>，无需结算</div>`;
    return;
  }
  if (r.status === "invalid") {
    showError("请输入有效金额");
    hideResult();
    return;
  }

  // Save history
  saveHist({ price, paid, balance: r.balance, planType: r.plans[0].id, tag: getTag() });

  // Balance bar
  balanceBar.innerHTML = `
    <div><div class="lbl">差额</div><div class="val">¥${r.balance.toFixed(2)}</div></div>
    <div><span class="tag">推荐：${r.plans[0].name}</span></div>`;

  // 3 plans — all expanded
  const icons = ["⭐", "⚖️", "📦"];
  const ranks = ["🥇 推荐", "🥈 备选", "🥉 备选"];

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
            <span>${p.totalCount} 张/枚</span>
            <span>${p.typeCount} 种面额</span>
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
    histList.innerHTML = `<div class="hist-empty">暂无记录</div>`;
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
            <span class="hist-amounts">¥${e.price.toFixed(2)} → ¥${e.paid.toFixed(2)}</span>
            <span class="hist-diff">¥${e.balance.toFixed(2)}</span>
            <span class="hist-plan">${LABELS[e.planType] || e.planType}</span>
            ${tag ? `<span class="hist-tag">${tag}</span>` : ""}
          </div>
          <div class="hist-meta">${ts}</div>
        </div>
      </div>`;
  }).join("");

  // Click to reuse
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
  const h = "| 价格 | 支付 | 差额 | 方案 | 标签 | 时间 |\n|------|------|------|------|------|------|\n";
  const r = history.map(e => {
    const t = new Date(e.timestamp);
    const ts = `${t.getFullYear()}-${t.getMonth()+1}-${t.getDate()} ${t.getHours()}:${String(t.getMinutes()).padStart(2,"0")}`;
    const tag = TAG_LABELS[e.tag] || "";
    return `| ¥${e.price.toFixed(2)} | ¥${e.paid.toFixed(2)} | ¥${e.balance.toFixed(2)} | ${LABELS[e.planType] || e.planType} | ${tag} | ${ts} |`;
  }).join("\n");
  dl(`# 结算记录\n\n${h}${r}\n`, "records.md", "text/markdown");
});

/* ═══════════════════════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════════════════════ */
renderHist();

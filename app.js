/**
 * PersonalMoneyCalc v3.1 — UI controller.
 *
 * Features:
 * - Real‑time calculation (debounced)
 * - Multi‑currency + custom units
 * - 3 settlement plans with explanations
 * - History (localStorage, max 10)
 * - Avatar system
 * - Tag categories
 */

import { calculate, CURRENCIES, DEFAULT_CURRENCY, MAX_INPUT } from "./src/js/core.js";

/* ═══════════════════════════════════════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════════════════════════════════════ */
const AVATARS = ["🧑", "👨", "👩", "👦", "👧", "👴", "👵", "🧔", "👨‍💼", "👩‍💼", "🕵️", "🎅"];
const TAG_LABELS = {
  shopping: "🛒 购物", dining: "🍜 餐饮", travel: "🚗 出行",
  cashier: "💰 收银", other: "📋 其他",
};
const STORAGE_KEYS = { history: "pmc_history", avatar: "pmc_avatar" };
const MAX_HISTORY = 10;

/* ═══════════════════════════════════════════════════════════════════════════
   DOM refs
   ═══════════════════════════════════════════════════════════════════════════ */
const avatarBtn    = document.getElementById("avatar-btn");
const priceInp     = document.getElementById("price");
const paidInp      = document.getElementById("paid");
const resultArea   = document.getElementById("result-area");
const guidePrompt  = document.getElementById("guide-prompt");
const currencySel  = document.getElementById("currency-select");
const customEditor = document.getElementById("custom-editor");
const customUnits  = document.getElementById("custom-units");
const pricePrefix  = document.getElementById("price-prefix");
const paidPrefix   = document.getElementById("paid-prefix");
const formHint     = document.getElementById("form-hint");
const historySec   = document.getElementById("history-section");
const historyList  = document.getElementById("history-list");
const historyFilter= document.getElementById("history-filter");
const historyClear = document.getElementById("history-clear");

/* ═══════════════════════════════════════════════════════════════════════════
   State
   ═══════════════════════════════════════════════════════════════════════════ */
let currencyCode = DEFAULT_CURRENCY;
let avatar = loadAvatar();
let history = loadHistory();
let debounceTimer = null;

/* ═══════════════════════════════════════════════════════════════════════════
   localStorage helpers
   ═══════════════════════════════════════════════════════════════════════════ */
function loadAvatar() {
  try { return localStorage.getItem(STORAGE_KEYS.avatar) || AVATARS[0]; }
  catch { return AVATARS[0]; }
}
function saveAvatar(val) {
  try { localStorage.setItem(STORAGE_KEYS.avatar, val); } catch {}
}

function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function saveHistory() {
  try { localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history)); } catch {}
}

function addHistoryEntry(entry) {
  history.unshift(entry);
  if (history.length > MAX_HISTORY) history = history.slice(0, MAX_HISTORY);
  saveHistory();
  renderHistory();
}

function clearHistory() {
  history = [];
  saveHistory();
  renderHistory();
}

/* ═══════════════════════════════════════════════════════════════════════════
   Avatar
   ═══════════════════════════════════════════════════════════════════════════ */
function updateAvatarUI() {
  avatarBtn.textContent = avatar;
}

avatarBtn.addEventListener("click", () => {
  const idx = AVATARS.indexOf(avatar);
  avatar = AVATARS[(idx + 1) % AVATARS.length];
  saveAvatar(avatar);
  updateAvatarUI();
  renderHistory();          // update avatars in history
});

/* ═══════════════════════════════════════════════════════════════════════════
   Currency switch
   ═══════════════════════════════════════════════════════════════════════════ */
function getSymbol() {
  if (currencyCode === "CUSTOM") return "¤";
  const c = CURRENCIES[currencyCode];
  return c ? c.symbol : "¥";
}

function updateCurrencyUI() {
  const sym = getSymbol();
  pricePrefix.textContent = sym;
  paidPrefix.textContent  = sym;

  if (currencyCode === "CUSTOM") {
    customEditor.hidden = false;
    formHint.textContent = "ⓘ 输入自定义面额（从大到小，逗号分隔）";
  } else {
    customEditor.hidden = true;
    const c = CURRENCIES[currencyCode];
    formHint.textContent = `ⓘ 金额范围 ${sym}0.01 ~ ${sym}${MAX_INPUT.toLocaleString()} · ${c ? c.name : ""}`;
  }
  debounceRecalc();
}

currencySel.addEventListener("change", () => {
  currencyCode = currencySel.value;
  updateCurrencyUI();
});
customUnits.addEventListener("input", () => debounceRecalc());

/* ═══════════════════════════════════════════════════════════════════════════
   Input sanitisation
   ═══════════════════════════════════════════════════════════════════════════ */
function sanitise(el) {
  el.value = el.value.replace(/[^0-9.]/g, "");
  const dot = el.value.indexOf(".");
  if (dot !== -1) {
    el.value = el.value.slice(0, dot + 1) + el.value.slice(dot + 1).replace(/\./g, "");
  }
}
priceInp.addEventListener("input", () => { sanitise(priceInp); debounceRecalc(); });
paidInp.addEventListener("input", () => { sanitise(paidInp); debounceRecalc(); });

function validateField(el) {
  const v = parseFloat(el.value);
  if (el.value.trim() === "" || isNaN(v) || v < 0 || v > MAX_INPUT) {
    el.classList.toggle("error", el.value.trim() !== "");
    return null;
  }
  el.classList.remove("error");
  return v;
}

function getSelectedTag() {
  const sel = document.querySelector('input[name="tag"]:checked');
  return sel ? sel.value : "other";
}

function parseCustomUnits() {
  if (currencyCode !== "CUSTOM") return null;
  const raw = customUnits.value.trim();
  if (!raw) return null;
  const vals = raw.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n) && n > 0);
  if (vals.length < 2) return null;
  return vals.sort((a, b) => b - a).map(v => ({ value: v, label: String(v) }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   Debounced calculation → history
   ═══════════════════════════════════════════════════════════════════════════ */
function debounceRecalc() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(recalcAndSave, 200);
}

function recalcAndSave() {
  const p = validateField(priceInp);
  const m = validateField(paidInp);

  if (priceInp.value.trim() === "" && paidInp.value.trim() === "") {
    guidePrompt.hidden = false;
    resultArea.hidden  = true;
    return;
  }
  guidePrompt.hidden = true;

  if (p === null || m === null) {
    renderError("请输入有效的价格和支付金额");
    return;
  }

  const customUnitsArr = parseCustomUnits();
  if (currencyCode === "CUSTOM" && !customUnitsArr) {
    renderError("请输入至少 2 个有效的自定义面额");
    return;
  }

  const result = calculate(p, m, currencyCode, customUnitsArr);
  render(result);

  // Only save settled results to history
  if (result.status === "settled" && result.plans.length > 0) {
    const tag = getSelectedTag();
    addHistoryEntry({
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      timestamp: Date.now(),
      price: p,
      paid: m,
      balance: result.balance,
      currency: currencyCode,
      tag,
      avatar,
    });
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   Render — result area
   ═══════════════════════════════════════════════════════════════════════════ */

function renderError(msg) {
  resultArea.hidden = false;
  resultArea.innerHTML = `<div class="result-msg"><span class="icon">⚠️</span>${msg}</div>`;
}

function render(result) {
  resultArea.hidden = false;

  if (result.status === "short") {
    resultArea.innerHTML = `<div class="result-msg"><span class="icon">⛔</span><span class="strong">支付金额不足</span>，还差 <strong>${getSymbol()}${Math.abs(result.balance).toFixed(2)}</strong></div>`;
    return;
  }
  if (result.status === "exact") {
    resultArea.innerHTML = `<div class="result-msg"><span class="icon">✅</span><span class="strong">支付金额正好</span>，无需结算</div>`;
    return;
  }
  if (result.status === "invalid") {
    renderError("请输入有效的价格和支付金额");
    return;
  }

  const planIcons  = { optimal: "⭐", balanced: "⚖️", practical: "📦" };
  const rankLabels = ["🥇 推荐", "🥈 备选", "🥉 备选"];

  const balanceBar = `
    <div class="balance-bar">
      <div>
        <div class="label">支付差额</div>
        <div class="value">${getSymbol()}${result.balance.toFixed(2)}</div>
      </div>
      <div style="text-align:right">
        <div class="label">货币</div>
        <span class="currency-tag">${result.currency}</span>
      </div>
    </div>`;

  const cards = result.plans.map((plan, i) => {
    const icon = planIcons[plan.id] || "📋";
    const unitsHtml = plan.units
      .map(u => `<span class="plan-unit-item"><span class="count">${u.count}</span><span class="label">${u.label}</span></span>`)
      .join("");
    return `
      <div class="plan-card" style="animation-delay:${i * 0.08}s">
        <div class="plan-header">
          <span>${icon}</span>
          <span class="plan-name">${plan.name}</span>
          <span class="plan-rank">${rankLabels[i]}</span>
          <span class="plan-meta">
            <span>🧾 ${plan.totalCount} 张/枚</span>
            <span>🏷️ ${plan.typeCount} 种</span>
          </span>
        </div>
        <div class="plan-body">
          <div class="plan-unit-list">${unitsHtml}</div>
          <details class="plan-detail">
            <summary>💡 为什么这样算？</summary>
            <p class="plan-reason">${plan.reason}</p>
            <p class="plan-scenario"><strong>适用场景：</strong>${plan.scenario}</p>
          </details>
        </div>
      </div>`;
  }).join("");

  resultArea.innerHTML = balanceBar + cards;
}

/* ═══════════════════════════════════════════════════════════════════════════
   Render — history
   ═══════════════════════════════════════════════════════════════════════════ */

function renderHistory() {
  const filter = historyFilter.value;
  let entries = filter === "all" ? history : history.filter(e => e.tag === filter);

  historySec.hidden = entries.length === 0;

  if (entries.length === 0) {
    historyList.innerHTML = `<div class="history-empty">暂无记录</div>`;
    return;
  }

  historyList.innerHTML = entries.map(e => {
    const tagLabel = TAG_LABELS[e.tag] || e.tag;
    const time = new Date(e.timestamp);
    const timeStr = `${time.getMonth()+1}/${time.getDate()} ${String(time.getHours()).padStart(2,"0")}:${String(time.getMinutes()).padStart(2,"0")}`;
    const sym = CURRENCIES[e.currency]?.symbol || "¥";
    return `
      <div class="history-entry">
        <div class="history-avatar">${e.avatar || "🧑"}</div>
        <div class="history-body">
          <div class="h-row">
            <span class="h-amounts">${sym}${e.price.toFixed(2)} → ${sym}${e.paid.toFixed(2)}</span>
            <span class="h-balance">差额 ${sym}${e.balance.toFixed(2)}</span>
            <span class="history-tag">${tagLabel}</span>
          </div>
          <div class="h-meta">${e.currency} · ${timeStr}</div>
        </div>
      </div>`;
  }).join("");
}

historyFilter.addEventListener("change", renderHistory);
historyClear.addEventListener("click", () => {
  if (confirm("确定清空所有计算记录？")) clearHistory();
});

/* ═══════════════════════════════════════════════════════════════════════════
   Init
   ═══════════════════════════════════════════════════════════════════════════ */
updateAvatarUI();
updateCurrencyUI();
renderHistory();
// redeploy trigger

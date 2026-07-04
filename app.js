import { calculate, CURRENCIES, DEFAULT_CURRENCY, MAX_INPUT } from "./src/js/core.js";

/* ═══════════════════════════════════════════════════════════════════════════
   DOM refs
   ═══════════════════════════════════════════════════════════════════════════ */
const priceInp  = document.getElementById("price");
const paidInp   = document.getElementById("paid");
const resultArea = document.getElementById("result-area");
const guidePrompt = document.getElementById("guide-prompt");
const currencySelect = document.getElementById("currency-select");
const customEditor = document.getElementById("custom-editor");
const customUnitsInp = document.getElementById("custom-units");
const pricePrefix = document.getElementById("price-prefix");
const paidPrefix  = document.getElementById("paid-prefix");
const formHint = document.getElementById("form-hint");

/* ═══════════════════════════════════════════════════════════════════════════
   State
   ═══════════════════════════════════════════════════════════════════════════ */
let currencyCode = DEFAULT_CURRENCY;
let debounceTimer = null;

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
  paidPrefix.textContent = sym;

  if (currencyCode === "CUSTOM") {
    customEditor.hidden = false;
    formHint.textContent = "ⓘ 输入自定义面额（从大到小，逗号分隔）";
  } else {
    customEditor.hidden = true;
    const c = CURRENCIES[currencyCode];
    formHint.textContent = `ⓘ 金额范围 ${sym}0.01 ~ ${sym}${MAX_INPUT.toLocaleString()} · ${c ? c.name : ""}`;
  }
  recalc();
}

currencySelect.addEventListener("change", () => {
  currencyCode = currencySelect.value;
  updateCurrencyUI();
});

/* ── Custom units change handler ───────────────────────────────────────── */
customUnitsInp.addEventListener("input", () => recalc());

/* ═══════════════════════════════════════════════════════════════════════════
   Input sanitisation & validation
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

function parseCustomUnits() {
  if (currencyCode !== "CUSTOM") return null;
  const raw = customUnitsInp.value.trim();
  if (!raw) return null;
  const vals = raw.split(/[,，\s]+/).map(Number).filter(n => !isNaN(n) && n > 0);
  if (vals.length < 2) return null;
  return vals.sort((a, b) => b - a).map(v => ({ value: v, label: String(v) }));
}

/* ═══════════════════════════════════════════════════════════════════════════
   Debounced calculation
   ═══════════════════════════════════════════════════════════════════════════ */
function debounceRecalc() {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(recalc, 180);
}

function recalc() {
  const p = validateField(priceInp);
  const m = validateField(paidInp);

  // Both empty → show guide prompt
  if (priceInp.value.trim() === "" && paidInp.value.trim() === "") {
    guidePrompt.hidden = false;
    resultArea.hidden = true;
    return;
  }

  guidePrompt.hidden = true;

  if (p === null || m === null) {
    renderError("请输入有效的价格和支付金额（最大 ¥1,000）");
    return;
  }

  const customUnits = parseCustomUnits();
  if (currencyCode === "CUSTOM" && !customUnits) {
    renderError("请输入至少 2 个有效的自定义面额");
    return;
  }

  const result = calculate(p, m, currencyCode, customUnits);
  render(result);
}

/* ═══════════════════════════════════════════════════════════════════════════
   Render
   ═══════════════════════════════════════════════════════════════════════════ */

function renderError(msg) {
  resultArea.hidden = false;
  resultArea.innerHTML = `<div class="result-msg"><span class="icon">⚠️</span>${msg}</div>`;
}

function render(result) {
  resultArea.hidden = false;

  switch (result.status) {
    case "short": {
      resultArea.innerHTML = `
        <div class="result-msg"><span class="icon">⛔</span>
          <span class="strong">支付金额不足</span>，还差 <strong>${getSymbol()}${Math.abs(result.balance).toFixed(2)}</strong>
        </div>`;
      return;
    }
    case "exact": {
      resultArea.innerHTML = `
        <div class="result-msg"><span class="icon">✅</span>
          <span class="strong">支付金额正好</span>，无需结算
        </div>`;
      return;
    }
    case "invalid": {
      renderError("请输入有效的价格和支付金额");
      return;
    }
  }

  // ── Build plan cards ──────────────────────────────────────────────
  const planIcons  = { optimal: "⭐", balanced: "⚖️", practical: "📦" };
  const rankLabels = ["🥇 推荐", "🥈 备选", "🥉 备选"];

  const balanceBar = `
    <div class="balance-bar">
      <div>
        <div class="label">支付差额</div>
        <div class="value">${getSymbol()}${result.balance.toFixed(2)}</div>
      </div>
      <div style="text-align:right">
        <div class="label">货币体系</div>
        <div class="currency-tag">${result.currency}</div>
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
          <span class="plan-rank">${rankLabels[i] || ""}</span>
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
   Init
   ═══════════════════════════════════════════════════════════════════════════ */
updateCurrencyUI();

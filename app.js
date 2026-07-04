import { calculate } from "./src/js/core.js";

/* ── DOM refs ──────────────────────────────────────────────────────────── */
const form = document.getElementById("calc-form");
const priceInp = document.getElementById("price");
const paidInp = document.getElementById("paid");
const btn = document.getElementById("calc-btn");
const resultArea = document.getElementById("result-area");

const MAX_VAL = 1000;

/* ── Input sanitisation — only numbers & decimal ───────────────────────── */
function sanitise(el) {
  el.value = el.value.replace(/[^0-9.]/g, "");
  // Keep only first dot
  const dot = el.value.indexOf(".");
  if (dot !== -1) {
    el.value = el.value.slice(0, dot + 1) + el.value.slice(dot + 1).replace(/\./g, "");
  }
}

priceInp.addEventListener("input", () => sanitise(priceInp));
paidInp.addEventListener("input", () => sanitise(paidInp));

/* ── Render helpers ────────────────────────────────────────────────────── */

function buildPlanCard(plan, idx) {
  const labels = ["最优方案", "均衡方案", "简洁方案"];
  const icons  = ["⭐", "⚖️", "📦"];
  const descs  = [
    "张数最少，效率最高",
    "面额分散，易于整理",
    "类型精简，减少小额硬币",
  ];

  const unitHtml = plan.units
    .map(u => `<span class="plan-unit-item"><span class="count">${u.count}</span><span class="label">${u.label}</span></span>`)
    .join("");

  return `
    <div class="plan-card">
      <div class="plan-header">
        <span>${icons[idx]}</span>
        <span class="plan-name">${plan.planName || labels[idx]}</span>
        <span class="plan-meta">
          <span>🧾 ${plan.totalCount} 张/枚</span>
          <span>🏷️ ${plan.typeCount} 种面额</span>
        </span>
      </div>
      <div class="plan-body">
        <div class="plan-unit-list">${unitHtml}</div>
        <div style="font-size:.78rem;color:var(--text-muted);margin-top:8px">${descs[idx]}</div>
      </div>
    </div>`;
}

function renderShort(balance) {
  resultArea.hidden = false;
  resultArea.innerHTML = `
    <div class="result-msg">
      <span class="icon">⛔</span>
      <span class="strong">支付金额不足</span>，还差 <strong>¥${Math.abs(balance).toFixed(2)}</strong>
    </div>`;
}

function renderExact() {
  resultArea.hidden = false;
  resultArea.innerHTML = `
    <div class="result-msg">
      <span class="icon">✅</span>
      <span class="strong">支付金额正好</span>，无需结算
    </div>`;
}

function renderInvalid() {
  resultArea.hidden = false;
  resultArea.innerHTML = `
    <div class="result-msg">
      <span class="icon">⚠️</span>
      <span class="strong">请输入有效的价格和支付金额</span>
    </div>`;
}

function renderPlans(balance, plans) {
  resultArea.hidden = false;

  const bar = `
    <div class="balance-bar">
      <div>
        <div class="label">支付差额</div>
        <div class="value">¥${balance.toFixed(2)}</div>
      </div>
      <div style="text-align:right">
        <div class="label">可选方案</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--text)">${plans.length} 套</div>
      </div>
    </div>`;

  const cards = plans.map((p, i) => buildPlanCard(p, i)).join("");
  resultArea.innerHTML = bar + cards;
}

/* ── Validation ────────────────────────────────────────────────────────── */

function validateField(el) {
  const v = parseFloat(el.value);
  if (el.value.trim() === "" || isNaN(v) || v < 0 || v > MAX_VAL) {
    el.classList.add("error");
    return null;
  }
  el.classList.remove("error");
  return v;
}

function clearErrors() {
  priceInp.classList.remove("error");
  paidInp.classList.remove("error");
}

/* ── Submit ────────────────────────────────────────────────────────────── */

form.addEventListener("submit", (e) => {
  e.preventDefault();
  clearErrors();

  const price = validateField(priceInp);
  const paid  = validateField(paidInp);

  if (price === null || paid === null) {
    renderInvalid();
    return;
  }

  const result = calculate(price, paid);

  switch (result.status) {
    case "short":
      renderShort(result.balance);
      break;
    case "exact":
      renderExact();
      break;
    case "invalid":
      renderInvalid();
      break;
    default:
      renderPlans(result.balance, result.plans);
      break;
  }

  resultArea.scrollIntoView({ behavior: "smooth", block: "start" });
});

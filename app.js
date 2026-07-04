import { calculate, CURRENCY_UNITS } from "./src/js/core.js";

/* ── DOM refs ──────────────────────────────────────────────────────────── */
const form = document.getElementById("calc-form");
const priceInput = document.getElementById("price");
const paidInput = document.getElementById("paid");
const btn = document.getElementById("calc-btn");

const resultPanel = document.getElementById("result");
const balanceDisplay = document.getElementById("balance-display");
const countDisplay = document.getElementById("count-display");
const unitTbody = document.getElementById("unit-tbody");
const remainderWarn = document.getElementById("remainder-warn");
const remainderAmount = document.getElementById("remainder-amount");

/* ── Handle calculation ────────────────────────────────────────────────── */
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const price = parseFloat(priceInput.value);
  const paid = parseFloat(paidInput.value);

  if (isNaN(price) || isNaN(paid) || price < 0 || paid < 0) {
    alert("请输入有效的价格和支付金额");
    return;
  }

  const result = calculate(price, paid);

  // Handle edge cases
  if (result.status === "short") {
    alert(`支付金额不足，还差 ¥${Math.abs(result.balance).toFixed(2)}`);
    return;
  }
  if (result.status === "exact") {
    balanceDisplay.textContent = "¥0.00";
    countDisplay.textContent = "无需结算";
    unitTbody.innerHTML = "";
    remainderWarn.hidden = true;
    resultPanel.hidden = false;
    return;
  }

  // Render settlement
  balanceDisplay.textContent = `¥${result.balance.toFixed(2)}`;
  countDisplay.textContent = `共 ${result.totalCount} 张/枚`;

  unitTbody.innerHTML = result.units
    .map(u => `<tr><td>${u.label}</td><td>${u.count}</td></tr>`)
    .join("");

  if (result.remainder !== null) {
    remainderAmount.textContent = result.remainder.toFixed(2);
    remainderWarn.hidden = false;
  } else {
    remainderWarn.hidden = true;
  }

  resultPanel.hidden = false;
  resultPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

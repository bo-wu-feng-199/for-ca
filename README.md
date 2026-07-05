# CashCalc — Personal Cash Calculator

**Lightweight personal cash calculation & record tool.**  
Enter item price and amount paid — automatically computes the balance and suggests the optimal currency breakdown.

---

## Features

- **Balance settlement** — Enter price & paid; instantly get 3 optimized breakdown plans
- **RMB denomination support** — ¥100 / 50 / 20 / 10 / 5 / 1 / 0.5 / 0.1 / 0.05 / 0.01
- **Real-time calculation** — Pure frontend, no network requests, 300ms debounce
- **History & export** — Auto-saves last 10 records (localStorage), export to JSON / CSV / Markdown
- **Theme switcher** — Light & dark mode with CSS variables
- **Lightweight** — Single HTML page, vanilla JS, no build tools

---

## Usage

### Web

Open `index.html` in a browser, or run:

```bash
npx serve .
```

### Browser extension

1. Open Chrome/Edge → `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked** → select this project directory
4. Use the extension icon in the toolbar

---

## Project Structure

```
cashcalc/
├── index.html          # Main page
├── app.js              # UI controller
├── style.css           # Styles
├── manifest.json       # Browser extension manifest
├── src/js/
│   └── core.js         # Core calculation engine
├── tests/
│   └── core.test.js    # Unit tests
├── .github/workflows/
│   └── ci.yml          # CI config
└── package.json        # Test dependencies
```

---

## Core Algorithm

Greedy algorithm: iterates denominations from largest to smallest, taking the maximum possible quantity each time.

The RMB denomination set is canonical — greedy guarantees the globally optimal (minimum piece) solution.

- Time complexity: **O(n)**, n = number of denominations (fixed at 10)
- Space complexity: **O(1)**

---

## Development

```bash
npm install
npm test
```

---

## License

MIT

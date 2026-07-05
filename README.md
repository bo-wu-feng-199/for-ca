# CashCalc — Personal Cash Calculator (USD)

**Lightweight personal cash calculation & record tool.**  
Enter item price and amount paid — automatically computes the balance and suggests the optimal USD currency breakdown.

[![CI](https://github.com/bo-wu-feng-199/for-ca/actions/workflows/ci.yml/badge.svg)](https://github.com/bo-wu-feng-199/for-ca/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- **Balance settlement** — Enter price & paid; instantly get 3 optimal USD breakdown plans
- **USD denomination support** — $100 / $50 / $20 / $10 / $5 / $2 / $1 / Quarter / Dime / Nickel / Penny
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
├── index.html          # Main page (SEO optimized)
├── app.js              # UI controller
├── style.css           # Styles (light / dark)
├── manifest.json       # Browser extension manifest
├── src/js/
│   └── core.js         # Core calculation engine (USD)
├── tests/
│   └── core.test.js    # Unit tests (17 tests)
├── .github/workflows/
│   └── ci.yml          # CI config
└── package.json        # Test dependencies
```

---

## Core Algorithm

Greedy algorithm: iterates denominations from largest to smallest ($100 → Penny), taking the maximum possible quantity each time.

The USD denomination set is canonical — greedy guarantees the globally optimal (minimum piece) solution.

- Time complexity: **O(n)**, n = number of denominations (fixed at 11)
- Space complexity: **O(1)**

---

## SEO & GEO

- Semantic HTML5 with `role` attributes
- Open Graph & Twitter Card meta tags
- JSON‑LD structured data (WebApplication schema)
- `canonical` URL, `description` & `keywords` meta
- Accessible form labels and `aria` attributes

---

## Development

```bash
npm install
npm test
```

---

## License

MIT

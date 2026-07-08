# CashCalc Launch Kit

## P0: Product Hunt Submission

**URL to submit:** https://www.producthunt.com/posts/new

**Name:** CashCalc
**Tagline:** Instant cash change breakdown — 3 strategies, zero buttons, works offline
**Description:**

CashCalc is a lightweight personal cash calculator that gives you the best way to make change.

Type how much an item costs and how much cash you gave. CashCalc instantly shows 3 strategies:
- **Optimal Plan** — Fewest pieces. Fastest handover.
- **Balanced Plan** — Spread across denominations. Wallet-friendly.
- **Practical Plan** — Avoids tiny coins. Real-world ready.

No buttons to push. Results appear as you type.

Features:
- PWA installable, works offline
- 3 export formats (JSON, CSV, Markdown) + Print
- Dark/light theme
- Keyboard shortcuts (Enter to calculate, Escape to clear)
- Share results via URL (?price=X&paid=Y)
- Privacy-first: all data stays in localStorage

**URL:** https://for-ca.vercel.app

**Topics:** Productivity, Developer Tools

**First comment (post after publishing):**
> Built this because I got tired of counting change at the register. 3 strategies give you options depending on whether you want speed, balance, or fewer coins. Pure vanilla JS, zero frameworks, fits in ~30KB. Feedback welcome!

---

## P3: Google Search Console

1. Go to https://search.google.com/search-console
2. Add property → URL prefix → `https://for-ca.vercel.app`
3. Verification: download HTML file → commit to repo → push (Vercel auto-deploys)
4. Submit sitemap: `https://for-ca.vercel.app/sitemap.xml`
5. Check Index coverage after 24-48h

---

## P4a: Reddit — r/SideProject

**Title:** I built a cash calculator that gives you 3 ways to make change

**Body:**

Type price. Type paid. Get 3 strategies instantly — optimal (fewest pieces), balanced (spread across denominations), practical (avoid tiny coins).

https://for-ca.vercel.app

Zero frameworks. Zero dependencies. 14KB total JS. PWA installable, works offline, keyboard shortcuts, URL sharing.

Built because I kept doing mental math at the register and wanted a tool that just works. No account, no tracking, everything in your browser.

---

## P4b: Hacker News — Show HN

**Title:** Show HN: CashCalc – Instant cash change breakdown, 3 strategies, 14KB

**Body:**

https://for-ca.vercel.app

Enter price and amount paid. Get 3 optimal currency denomination breakdowns:
- Greedy (minimum pieces)
- Balanced (cap per denomination)
- Practical (no pennies/nickels)

Pure vanilla JS, no frameworks, zero external deps. PWA with offline cache. Dark mode. Keyboard shortcuts. URL sharing (?price=X&paid=Y). All data in localStorage.

https://github.com/bo-wu-feng-199/for-ca

---

## P5: Custom Domain

Option A — Free (Freenom/nic.ua):
- `cashcalc.pp.ua` → free Ukraine domain, point CNAME to `cname.vercel-dns.com`
- Or `cashcalc.tk` / `cashcalc.ml` from Freenom

Option B — Paid ($10-15/yr):
- `cashcalc.dev` from Namecheap, Cloudflare, or Porkbun
- Add domain in Vercel Dashboard → Project → Domains
- Set CNAME record

Guide: https://vercel.com/docs/projects/domains/add-a-domain

---

## Pre-launch Checklist

- [ ] GitHub README has GIF demo (screenshot tool → loom/quicktime → GIF)
- [ ] Test all features on live site
- [ ] Product Hunt account ready (X/Twitter login fastest)
- [ ] Prepare to reply to PH comments within 1h of posting

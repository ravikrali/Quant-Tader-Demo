# Meridian Quant Desk — UI mockup

A clickable mockup of a hedge-fund grade, **human-approved** systematic long/short trading desk running on Interactive Brokers.

**Live demo:** https://ravikrali.github.io/Quant-Tader-Demo/ (GitHub Pages, enable in repo Settings → Pages → branch `main`, folder `/`)

> All data in this mockup is fictional. Nothing connects to a broker.

## What it shows

| Page | Purpose |
|---|---|
| Overview | NAV, exposure, regime, attribution, tonight's pipeline status |
| Signals | The approval queue. Every proposed trade is a Signal Packet you approve, modify, reject or defer |
| Portfolio | Positions, sleeve and sector exposure, reconciliation |
| Risk | Limit utilisation, VaR, drawdown, stress tests, factor exposures |
| Execution | Orders, fills, transaction-cost analysis, execution policy |
| Strategies | The six live sleeves, the disabled futures sleeve, live-vs-backtest health, correlation |
| Research | Strategy pipeline from hypothesis to live, anti-overfitting controls |
| AI & Regime | Regime detector, meta-labeler, allocator, model-change approval queue, daily post-mortem |
| Settings | Instrument-class toggles (futures on/off), brokers, approval policy, hard limits |
| Info | Full system design: principles, universe, strategy book, portfolio construction, daily workflow, AI layer, risk, engineering standard, stack, roadmap and cost |
| FAQ | Short answers on control, strategies, AI, brokers, infrastructure |

Keyboard: `1`–`9` switch desk pages, `I` Info, `F` FAQ.

## Run locally

No build step. Open `index.html` in a browser, or serve the folder:

```bash
python -m http.server 8080
```

## Structure

```
index.html        entry point
css/styles.css    design system (dark, editorial serif + mono numerals)
js/data.js        fictional mock data
js/info.js        Info page content (system design narrative)
js/app.js         hash router, chart helpers, page renderers
docs/             the same design narrative as Markdown
```

## Design notes

- Amber is reserved for anything awaiting a human decision.
- Status colours (good / warning / critical) are never reused for data series.
- Charts are inline SVG with hover tooltips; no chart library.
- Fonts: Newsreader (display), Instrument Sans (body), JetBrains Mono (numbers).

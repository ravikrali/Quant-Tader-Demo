# Meridian — System Design (v1, IBKR, equities + ETFs)

This is the Markdown twin of the Info page in the mockup.

## 1. Operating principles

1. **Human approval on every order.** Strategies emit target weights; the optimizer produces a trade list; each trade becomes a Signal Packet you approve, modify or reject. Nothing else can create an order.
2. **Rules outrank models.** Hard limits are enforced by a deterministic rules engine. AI may tighten or scale down, never loosen.
3. **Diversify by return source.** The book is a set of low-correlation sleeves; balance comes from risk allocation across sleeves.
4. **What was tested is what trades.** Research and live share one signal library and one cost model. Walk-forward, paper and probation gate every strategy.
5. **Everything is auditable.** Immutable log of signals, decisions, orders, fills, config and model versions.

## 2. Universe (v1)

| Class | Status | Rule |
|---|---|---|
| US equities | Enabled | NYSE/Nasdaq primary, price > $5, ADV > $20M, cap > $1B; ~1,500 names, survivorship-free |
| ETFs | Enabled | ~60 liquid ETFs across equity, sectors, rates, credit, commodities, FX |
| Short universe | Enabled | IBKR borrow available, fee ≤ 3%, short interest ≤ 15%, days-to-cover ≤ 5 |
| Micro futures | Built, disabled | MES, MNQ, MGC, MCL, ZN, 6E; toggle in Settings |
| Options | Planned | VRP sleeve; needs permissions + second broker |
| Swaps | Not possible | OTC / ISDA only; reproduced with ETFs, futures, options |

## 3. Strategy book

| Sleeve | Budget | Signal | Hold | Failure mode → mitigation |
|---|---|---|---|---|
| CSM Cross-Sectional Momentum | 22% | 12-1 momentum blended with residual momentum, sector-neutral quintile L/S | 1–3 mo | Momentum crash → crash filter + regime scaling |
| QV Quality-Value L/S | 18% | ROIC, margin stability, accruals, FCF yield, EV/EBITDA, point-in-time | 3–6 mo | Value drought, junk squeezes → quality tilt, squeeze screen |
| STMR Short-Term Reversal | 10% | 1–5d residual z ≤ −2 / ≥ +2, no catalyst | 1–5 d | Falling knives → catalyst filter, time stop |
| STAT Stat-Arb Pairs | 15% | Cointegrated intra-sector pairs, z ±2 in, 0 out, ±3.5 stop | 5–30 d | Structural breaks → stop, event flags, monthly re-validation |
| PEAD Post-Earnings Drift | 12% | SUE + revenue surprise + guidance + day-0 reaction | 20–40 d | Crowding/decay → mid-cap tilt, drift monitor |
| MACRO ETF Cross-Asset Trend | 23% | 3/6/12-month TSMOM, vol-scaled | 1–4 mo | Whipsaw → multi-horizon blend, regime down-weight |
| FUT Futures Trend | 0% (off) | MACRO model on micro futures | 2–8 wk | Enabled via feature flag |
| VRP Volatility Risk Premium | planned | Delta-hedged short premium | 20–45 d | Needs options + TastyTrade adapter |

## 4. Portfolio construction

1. **Sleeve budgets** by risk parity on trailing sleeve vol; allocator tilt ±25%; probation halves budget.
2. **Optimizer**: constrained mean-variance, Ledoit-Wolf covariance, cost penalty. Gross ≤ 200%, |net| ≤ 20%, |beta| ≤ 0.20, name ≤ 8%, sector net ≤ 15%, position ≤ 2% ADV, borrow ≤ 3%, factor residuals ±0.25.
3. **Vol target** 10% (cap 12%); residual beta hedged with SPY/IWM; regime scale 1.0/0.75/0.5/0.25×.

## 5. Daily workflow (ET)

| Time | Step | Fails safe |
|---|---|---|
| 16:30 | Ingest bars, actions, fundamentals, earnings, borrow, positions | Halt + alert |
| 17:00 | Data-quality gate + reconciliation | No signals tonight |
| 17:30 | Regime engine | Last state, 0.75× |
| 18:00 | Sleeve signals → target weights | Sleeve holds |
| 18:30 | Meta-labeling → sizing, 0.55 floor | Base sizing 0.75× |
| 19:00 | Optimizer + risk → trade list | Risk-reducing only |
| 19:30 | Approval queue published + notification | — |
| Evening | You approve / modify / reject / defer | Expire at open |
| 09:20 | Execution window (Adaptive < $25k, VWAP above; skip first 5 min) | Orders held |
| Intraday | Reconcile every 5 min, stop rules, urgent exits to queue | Kill switch |
| 16:15 | TCA, attribution, live-vs-backtest update | — |
| 20:00 | LLM post-mortem → model-change proposals | Never self-apply |
| Weekly/monthly | Allocator proposal; retrain; sleeve health; universe rebuild | — |

## 6. Signal Packet

Identity · Thesis (plain language with the actual numbers) · Sizing · Economics (expected return, horizon, exit, cost, confidence) · Risk (marginal contribution, limit effects, checks) · Event flags · Decision (approve / modify / reject / defer), all logged.

## 7. AI layer

| Component | Method | Changes | Kept honest by |
|---|---|---|---|
| Regime detector | HMM on vol, correlation, dispersion, breadth, VIX term, credit | Exposure scale, sleeve tilts | OOS evaluation; 2-day confirmation |
| Meta-labeler | Gradient boosting on signal features + regime | Trade sizing, 0.55 floor | Monthly walk-forward retrain; AUC fallback |
| Sleeve allocator | Risk parity + Thompson sampling | Budgets ±25% | Weekly proposal to approval queue |
| Post-mortem agent (LLM) | Reads fills, P&L, news, filings | Daily note, proposals, event flags | Cannot trade or edit config |

**Drift → probation → retirement:** divergence z < −2.0 halves budget; recovery restores; z < −3.0 retires and requests a replacement.

## 8. Risk framework

Pre-trade limits; ex-ante vol, VaR/ES, factor exposures, stress scenarios; drawdown ladder −5% / −10% / −15%; kill switch, flatten-all, heartbeat, reconciliation, staleness, model fallbacks.

## 9. Engineering standard

Point-in-time data · deterministic versioned runs · one code path for backtest/paper/live · immutable audit log · 5-minute reconciliation · unit, integration and replay tests · secrets in a vault, never in synced folders · metrics, alerts, runbooks.

## 10. Stack

Python 3.12, FastAPI, APScheduler · PostgreSQL/TimescaleDB, Parquet, Redis · IBKR Gateway + ib_async · Polygon + fundamentals vendor + IBKR borrow/quotes · Polars, scikit-learn, LightGBM, hmmlearn, statsmodels · Claude API (read-only tools) · React/Next.js UI · Docker Compose on VPS, Grafana/Prometheus, Telegram.

## 11. Roadmap and cost

| Phase | Weeks | Deliverable |
|---|---|---|
| 0 Foundations | 1–2 | Repo, data pipeline, IBKR paper adapter, universe, audit log, UI shell |
| 1 Research lab | 3–6 | Backtester, walk-forward, CSM + MACRO + STMR, portfolio/risk engine |
| 2 Paper desk | 7–10 | Nightly pipeline, packets, approval queue, execution, TCA; QV, STAT, PEAD |
| 3 Live, small | 11–14 | Live at reduced budget; monitoring; regime + meta-labeler live |
| 4 Self-correction | 15–18 | Allocator, probation logic, post-mortem agent, change queue |
| 5 Expansion | 19+ | Futures toggle, TastyTrade, options VRP, discretionary sleeve |

Software running cost ≈ $110–410 / month (VPS, data, LLM, monitoring). Trading costs (commissions, borrow, margin) dominate. Futures add ≈ $40–90 / month.

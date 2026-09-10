/* ------------------------------------------------------------
   MOCK DATA — entirely fictional. No real account values.
   ------------------------------------------------------------ */
window.MOCK = (() => {
  // deterministic pseudo-random so the demo looks the same every load
  let seed = 7;
  const rnd = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280; };

  // ---- equity curve (252 days) ----
  const nav = [];
  let v = 1_000_000, b = 1_000_000;
  const start = new Date(2025, 8, 10);
  for (let i = 0; i < 252; i++) {
    const d = new Date(start); d.setDate(start.getDate() + Math.floor(i * 365 / 252));
    v *= 1 + (rnd() - 0.47) * 0.011 + 0.00045;
    b *= 1 + (rnd() - 0.48) * 0.013 + 0.00035;
    nav.push({ d, v: Math.round(v), b: Math.round(b) });
  }
  const NAV = nav[nav.length - 1].v;
  const drawdown = nav.map((p, i) => { const peak = Math.max(...nav.slice(0, i + 1).map(x => x.v)); return (p.v / peak - 1) * 100; });

  const account = {
    id: "U19*****3", broker: "IBKR", mode: "PAPER", nav: NAV,
    cash: Math.round(NAV * 0.41), gross: 1.42, net: 0.06, beta: 0.04,
    dayPnl: 6_842, dayPnlPct: 0.61, mtd: 1.9, ytd: 11.4,
    sharpe: 1.74, sortino: 2.31, maxDD: -6.8, vol: 9.2, targetVol: 10,
    marginUsed: 0.38, buyingPower: Math.round(NAV * 2.9),
  };

  const regime = {
    label: "Risk-On · Low Dispersion", code: "RISK_ON",
    probs: { "Risk-On Trend": 0.62, "Choppy / Range": 0.27, "Risk-Off": 0.09, "Crisis": 0.02 },
    since: "2026-08-19", vix: 14.8, corr: 0.31, breadth: 0.64,
    exposureScale: 1.0, note: "Trend sleeves at full budget; mean-reversion sleeve at 0.8× due to compressed intraday ranges."
  };

  const sleeves = [
    { id: "CSM",   name: "Cross-Sectional Momentum", cls: "Equities", state: "LIVE",  alloc: 22, gross: 0.34, ytd: 4.8,  sharpeLive: 1.6, sharpeBT: 1.9, hold: "1–3 mo",  turnover: "45%/mo", positions: 38, color: "var(--s1)", desc: "Sector-neutral 12-1 momentum, long top quintile / short bottom quintile, with a momentum-crash filter." },
    { id: "QV",    name: "Quality-Value L/S",       cls: "Equities", state: "LIVE",  alloc: 18, gross: 0.28, ytd: 2.1,  sharpeLive: 1.1, sharpeBT: 1.3, hold: "3–6 mo",  turnover: "18%/mo", positions: 30, color: "var(--s3)", desc: "Composite of ROIC, margin stability, accruals and FCF yield. Long cheap quality, short expensive low-quality." },
    { id: "STMR",  name: "Short-Term Reversal",     cls: "Equities", state: "LIVE",  alloc: 10, gross: 0.16, ytd: 1.4,  sharpeLive: 1.9, sharpeBT: 2.4, hold: "1–5 d",   turnover: "400%/mo", positions: 14, color: "var(--s2)", desc: "1–5 day residual reversal after removing market and sector return. Time-stopped at 5 sessions." },
    { id: "STAT",  name: "Statistical Arb Pairs",   cls: "Equities", state: "LIVE",  alloc: 15, gross: 0.30, ytd: 1.6,  sharpeLive: 1.4, sharpeBT: 1.5, hold: "5–30 d",  turnover: "120%/mo", positions: 22, color: "var(--s7)", desc: "Cointegrated intra-sector pairs, z-score entry ±2.0, exit 0, stop ±3.5, re-validated monthly." },
    { id: "PEAD",  name: "Post-Earnings Drift",     cls: "Equities", state: "LIVE",  alloc: 12, gross: 0.18, ytd: 0.9,  sharpeLive: 0.8, sharpeBT: 1.2, hold: "20–40 d", turnover: "90%/mo", positions: 9,  color: "var(--s5)", desc: "Standardized earnings + revenue surprise, guidance tone and day-0 reaction. Long top decile, short bottom." },
    { id: "MACRO", name: "ETF Cross-Asset Trend",   cls: "ETFs",     state: "LIVE",  alloc: 23, gross: 0.16, ytd: 1.7,  sharpeLive: 1.0, sharpeBT: 1.1, hold: "1–4 mo",  turnover: "25%/mo", positions: 11, color: "var(--s4)", desc: "3/6/12-month time-series momentum across equity, rate, commodity and currency ETFs with vol scaling. Migrates to micro futures when the futures sleeve is enabled." },
    { id: "FUT",   name: "Futures Trend (Micro)",   cls: "Futures",  state: "DISABLED", alloc: 0, gross: 0, ytd: 0, sharpeLive: null, sharpeBT: 1.3, hold: "2–8 wk", turnover: "60%/mo", positions: 0, color: "var(--s6)", desc: "Same trend model on MES / MNQ / MGC / MCL / ZN micros. Built and backtested; enable from Settings when fee budget allows." },
    { id: "VRP",   name: "Volatility Risk Premium", cls: "Options",  state: "PLANNED", alloc: 0, gross: 0, ytd: 0, sharpeLive: null, sharpeBT: null, hold: "20–45 d", turnover: "—", positions: 0, color: "var(--s8)", desc: "Delta-hedged short premium structures. Requires options approval and a second broker integration (TastyTrade)." },
  ];

  const signals = [
    { id: "S-2609-014", sym: "AVGO", name: "Broadcom Inc.", side: "BUY", action: "OPEN LONG", sleeve: "CSM", qty: 120, px: 312.40, notional: 37_488, weight: 3.4, conf: 0.78, expRet: "+6.2% / 60d", stop: "−8% or rank exit", riskContrib: "0.42% NAV", cost: "$4.10 (1.1 bp)", adv: "0.02% ADV", horizon: "60 d",
      thesis: "Ranks <b>4th of 87</b> in Semiconductors on 12-1 momentum with positive residual momentum. Meta-labeler probability <b>0.78</b> in Risk-On regime. Earnings not inside the holding window.", checks: ["Single-name cap", "Sector net", "Liquidity", "Borrow n/a (long)", "Earnings window"], state: "PENDING" },
    { id: "S-2609-015", sym: "PARA", name: "Paramount Global", side: "SELL SHORT", action: "OPEN SHORT", sleeve: "QV", qty: 2400, px: 11.62, notional: 27_888, weight: 2.5, conf: 0.66, expRet: "−5.0% / 90d", stop: "+10% or factor exit", riskContrib: "0.31% NAV", cost: "$12.00 + borrow 0.9%", adv: "0.06% ADV", horizon: "90 d",
      thesis: "Bottom-decile composite: negative FCF yield, rising accruals, gross-margin erosion 3 quarters running. Borrow available at <b>0.9%</b>; short-interest 4.1% (no squeeze flag).", checks: ["Single-name cap", "Sector net", "Borrow available", "Squeeze screen", "Liquidity"], state: "PENDING" },
    { id: "S-2609-016", sym: "XOM", name: "Exxon Mobil", side: "SELL", action: "REDUCE LONG", sleeve: "CSM", qty: 90, px: 118.05, notional: 10_625, weight: -1.0, conf: 0.71, expRet: "Rebalance", stop: "—", riskContrib: "−0.12% NAV", cost: "$1.00", adv: "0.01% ADV", horizon: "—",
      thesis: "Energy sector net exposure is <b>+14.2%</b> against a 15% limit after this week's rally. Trimming the largest energy long keeps the sleeve sector-neutral without a full exit.", checks: ["Sector net → 12.8%", "Turnover budget"], state: "PENDING" },
    { id: "S-2609-017", sym: "ADBE / CRM", name: "Pair: long ADBE, short CRM", side: "PAIR", action: "OPEN PAIR", sleeve: "STAT", qty: 60, px: 0, notional: 33_100, weight: 1.6, conf: 0.69, expRet: "z 2.3 → 0", stop: "z ±3.5", riskContrib: "0.18% NAV", cost: "$6.40 + borrow 0.3%", adv: "0.01% ADV", horizon: "~12 d",
      thesis: "Spread z-score <b>+2.31</b>, half-life 9 days, cointegration p = 0.008 on 250-day window. Long 60 ADBE / short 118 CRM, dollar-neutral.", checks: ["Cointegration valid", "Half-life in band", "Borrow available", "Liquidity"], state: "PENDING" },
    { id: "S-2609-018", sym: "TLT", name: "iShares 20+ Yr Treasury", side: "BUY", action: "INCREASE LONG", sleeve: "MACRO", qty: 310, px: 92.15, notional: 28_566, weight: 2.6, conf: 0.62, expRet: "+3.5% / 90d", stop: "Trend flip", riskContrib: "0.22% NAV", cost: "$1.55", adv: "0.00% ADV", horizon: "90 d",
      thesis: "3/6/12-month trend blend flipped positive on rates. Vol-scaled target weight <b>5.2%</b> vs current 2.6%. Diversifies equity beta in the book.", checks: ["Asset-class cap", "Liquidity"], state: "PENDING" },
    { id: "S-2609-019", sym: "NVDA", name: "NVIDIA Corp.", side: "SELL", action: "CLOSE LONG", sleeve: "STMR", qty: 45, px: 178.90, notional: 8_050, weight: -0.7, conf: 0.90, expRet: "Time stop", stop: "—", riskContrib: "−0.09% NAV", cost: "$1.00", adv: "0.00% ADV", horizon: "—",
      thesis: "5-session time stop reached on the reversal trade (+2.1%). Rule-based exit; no discretionary input.", checks: ["Time stop rule"], state: "PENDING", urgent: true },
  ];

  const positions = [
    { sym: "MSFT", side: "L", sleeve: "CSM",  qty: 180,  avg: 402.10, last: 421.65, w: 6.9,  pnl: 3519, sector: "Technology", beta: 0.95 },
    { sym: "LLY",  side: "L", sleeve: "QV",   qty: 55,   avg: 745.00, last: 792.30, w: 4.0,  pnl: 2601, sector: "Health Care", beta: 0.55 },
    { sym: "XOM",  side: "L", sleeve: "CSM",  qty: 330,  avg: 109.80, last: 118.05, w: 3.6,  pnl: 2722, sector: "Energy", beta: 0.70 },
    { sym: "COST", side: "L", sleeve: "QV",   qty: 40,   avg: 880.40, last: 902.10, w: 3.3,  pnl: 868,  sector: "Cons. Staples", beta: 0.75 },
    { sym: "TLT",  side: "L", sleeve: "MACRO",qty: 310,  avg: 91.20,  last: 92.15,  w: 2.6,  pnl: 294,  sector: "Rates ETF", beta: -0.20 },
    { sym: "GLD",  side: "L", sleeve: "MACRO",qty: 150,  avg: 238.40, last: 251.10, w: 3.5,  pnl: 1905, sector: "Commodity ETF", beta: 0.05 },
    { sym: "ADBE", side: "L", sleeve: "STAT", qty: 60,   avg: 512.00, last: 508.20, w: 2.8,  pnl: -228, sector: "Technology", beta: 1.15 },
    { sym: "CRM",  side: "S", sleeve: "STAT", qty: -118, avg: 262.30, last: 259.80, w: -2.8, pnl: 295,  sector: "Technology", beta: 1.10 },
    { sym: "F",    side: "S", sleeve: "QV",   qty: -2600,avg: 11.85,  last: 11.40,  w: -2.7, pnl: 1170, sector: "Cons. Disc.", beta: 1.25 },
    { sym: "INTC", side: "S", sleeve: "CSM",  qty: -1200,avg: 22.10,  last: 23.05,  w: -2.5, pnl: -1140,sector: "Technology", beta: 1.20 },
    { sym: "WBA",  side: "S", sleeve: "QV",   qty: -2100,avg: 10.90,  last: 10.15,  w: -2.0, pnl: 1575, sector: "Cons. Staples", beta: 0.85 },
    { sym: "IWM",  side: "S", sleeve: "HEDGE",qty: -400, avg: 221.00, last: 224.30, w: -8.2, pnl: -1320,sector: "Beta Hedge", beta: 1.00 },
  ];

  const sectors = [
    { s: "Technology", l: 18.4, sh: -11.2 }, { s: "Health Care", l: 9.1, sh: -4.3 }, { s: "Energy", l: 8.6, sh: -2.1 },
    { s: "Financials", l: 7.2, sh: -6.8 }, { s: "Cons. Disc.", l: 5.5, sh: -7.9 }, { s: "Cons. Staples", l: 6.4, sh: -3.9 },
    { s: "Industrials", l: 6.8, sh: -5.1 }, { s: "Comm. Services", l: 3.1, sh: -4.6 }, { s: "Rates / Cmdty ETF", l: 8.9, sh: 0 }, { s: "Index Hedge", l: 0, sh: -8.2 },
  ];

  const limits = [
    { l: "Gross exposure", v: 142, max: 200, unit: "%" }, { l: "Net exposure", v: 6, max: 20, unit: "%", abs: true },
    { l: "Portfolio beta", v: 0.04, max: 0.20, unit: "", abs: true }, { l: "Single name", v: 6.9, max: 8, unit: "%" },
    { l: "Sector net (max)", v: 14.2, max: 15, unit: "%" }, { l: "Ex-ante vol", v: 9.2, max: 12, unit: "%" },
    { l: "Drawdown (from peak)", v: 2.1, max: 10, unit: "%" }, { l: "Margin utilisation", v: 38, max: 60, unit: "%" },
    { l: "Borrow cost (wtd)", v: 0.7, max: 3, unit: "%" }, { l: "Daily turnover", v: 4.1, max: 15, unit: "% NAV" },
  ];

  const stress = [
    { s: "2008-style credit shock (−40% eq, +30 vol)", p: -4.1 }, { s: "Mar-2020 liquidity crash (−34% in 23d)", p: -3.6 },
    { s: "Momentum crash (Apr-2009 style reversal)", p: -5.8 }, { s: "Rates +100 bp parallel", p: -1.2 },
    { s: "USD +5%", p: -0.4 }, { s: "Sector rotation: Tech −15% / Energy +10%", p: -1.9 },
  ];

  const orders = [
    { t: "09:31:04", id: "O-88213", sym: "MSFT", side: "BUY",  qty: 40,   algo: "Adaptive", lim: 420.10, fill: 420.04, status: "FILLED", slip: -1.4 },
    { t: "09:31:05", id: "O-88214", sym: "F",    side: "SELL", qty: 600,  algo: "Adaptive", lim: 11.44,  fill: 11.45,  status: "FILLED", slip: 0.9 },
    { t: "09:33:12", id: "O-88215", sym: "GLD",  side: "BUY",  qty: 30,   algo: "MOC→Limit", lim: 251.30, fill: 251.08, status: "FILLED", slip: -0.9 },
    { t: "09:35:40", id: "O-88216", sym: "INTC", side: "SELL", qty: 300,  algo: "VWAP 30m", lim: 23.00,  fill: 23.02,  status: "PARTIAL 210/300", slip: 0.9 },
    { t: "10:02:18", id: "O-88217", sym: "WBA",  side: "BUY",  qty: 400,  algo: "Adaptive", lim: 10.20,  fill: null,   status: "WORKING", slip: null },
  ];

  const changes = [
    { id: "M-041", type: "Parameter", target: "STMR · entry z-threshold", from: "−1.8", to: "−2.0", reason: "Hit-rate on |z|<2.0 entries fell to 48% over 60 trades (BT: 57%). Tightening restores expectancy without cutting volume by more than 20%.", state: "PENDING", src: "Post-mortem agent" },
    { id: "M-042", type: "Allocation", target: "PEAD sleeve budget", from: "12%", to: "9%", reason: "Live Sharpe 0.8 vs backtest 1.2 for 4 months; z-score of divergence −1.7. Move to probation sizing until divergence resolves.", state: "PENDING", src: "Allocator (Thompson)" },
    { id: "M-040", type: "Universe", target: "Add 14 names to shortable set", from: "1,482", to: "1,496", reason: "IBKR borrow now available below 2% for 14 names previously excluded.", state: "APPROVED 09-08", src: "Universe builder" },
  ];

  const research = [
    { id: "R-117", name: "Residual momentum (Blitz) variant of CSM", stage: "Walk-forward", sharpe: 1.62, dd: -9.1, trades: 1840, verdict: "Promote to paper", pct: 80 },
    { id: "R-118", name: "Earnings-call tone (LLM) as PEAD feature", stage: "Feature test", sharpe: 1.38, dd: -7.4, trades: 610, verdict: "Needs 2 more quarters", pct: 55 },
    { id: "R-119", name: "Low-vol anomaly long/short", stage: "Backtest", sharpe: 0.91, dd: -12.8, trades: 2200, verdict: "Rejected: overlaps QV", pct: 30 },
    { id: "R-120", name: "Sector-relative reversal at 3-day horizon", stage: "Hypothesis", sharpe: null, dd: null, trades: null, verdict: "Queued", pct: 10 },
  ];

  const faq = [
    { c: "Approval & control", q: "Does the system ever trade without my approval?", a: "<p>No. Every order originates from a Signal Packet that you approve, reject, or modify in the Signals queue. The only exceptions are <b>pre-approved protective rules</b> that you enable explicitly in Settings (for example a hard stop or a flatten-all kill switch). Those rules are shown on every signal card that they could affect, so you always know what can fire without a click.</p>" },
    { c: "Approval & control", q: "What happens to signals I don't act on?", a: "<p>Signals expire at the next market open by default (configurable). Expired signals are logged with the reason <i>unapproved</i> and are regenerated the next evening if the edge is still present. Nothing is carried forward silently.</p>" },
    { c: "Approval & control", q: "Can I change the size before approving?", a: "<p>Yes. Edit the quantity on the card. The pre-trade risk checks re-run instantly on the new size, and the approval is recorded with both the proposed and the approved quantity in the audit log.</p>" },
    { c: "Approval & control", q: "How do I stop everything immediately?", a: "<p>The <b>Kill switch</b> in the top bar cancels all working orders at the broker and blocks new submissions. <b>Flatten all</b> is a separate, confirmed action that closes every position at market. Both are logged and both send a notification.</p>" },
    { c: "Strategies", q: "Why these strategies and not my existing indicators?", a: "<p>The v1 book is built from documented, peer-reviewed return premia (momentum, quality/value, short-term reversal, pairs, post-earnings drift, cross-asset trend). They have long out-of-sample histories, low correlation to each other, and known failure modes we can hedge. Discretionary indicators can be added later as a separate sleeve with its own capital cap so they never contaminate the core book.</p>" },
    { c: "Strategies", q: "Why is the futures sleeve disabled?", a: "<p>Per the v1 brief. The sleeve is fully built and backtested but consumes no capital until toggled on in Settings. Until then the ETF cross-asset trend sleeve provides the same macro exposures with lower fee drag.</p>" },
    { c: "Strategies", q: "What does 'confidence' on a signal mean?", a: "<p>It is the meta-labeler's estimated probability that the trade will be profitable over its horizon, given the current regime and the trade's features. It is calibrated on walk-forward data, and it is used for sizing, not for filtering alone.</p>" },
    { c: "Strategies", q: "How does the system keep the account 'balanced'?", a: "<p>Three layers: (1) each sleeve has a capital budget set by risk parity across sleeves, (2) the optimizer enforces gross, net, beta, sector, single-name and liquidity limits, (3) a portfolio-level vol target scales the whole book. A residual beta hedge (index ETF) removes what is left.</p>" },
    { c: "AI & self-correction", q: "What exactly does the AI do?", a: "<p>Four jobs, all advisory: regime detection, meta-labeling of signals, sleeve allocation, and a daily post-mortem that proposes parameter or allocation changes. The LLM agent reads news, filings and transcripts to annotate signals with event risk. <b>No AI component can place an order or override a hard risk limit.</b></p>" },
    { c: "AI & self-correction", q: "How does it self-correct?", a: "<p>Every sleeve's live results are compared to its backtest continuously. Drift beyond a threshold moves the sleeve to probation (half size); persistent drift retires it. Parameter changes proposed by the post-mortem agent go through the same approval queue as trades. Models are retrained on a schedule with walk-forward validation, never on in-sample data.</p>" },
    { c: "Brokers & instruments", q: "Which broker is supported?", a: "<p>Interactive Brokers only in v1 (TWS API / Web API). TastyTrade and Schwab adapters are planned behind the same broker interface. Robinhood has no official equities API and is not planned.</p>" },
    { c: "Brokers & instruments", q: "Can it trade swaps?", a: "<p>No retail broker offers swaps; they are OTC contracts under an ISDA agreement. The system reproduces the same exposures with ETFs, futures and options.</p>" },
    { c: "Brokers & instruments", q: "Does short selling work automatically?", a: "<p>Borrow availability and fee are pulled from IBKR each evening. Names with no borrow or fees above the configured cap are excluded before signals are generated, so you never approve an unfillable short.</p>" },
    { c: "Data & infrastructure", q: "Where does it run?", a: "<p>On your VPS in Docker containers: Postgres/TimescaleDB, Redis, the Python services, and the web UI. IBKR Gateway runs alongside. Paper and live environments share identical code and differ only by configuration.</p>" },
    { c: "Data & infrastructure", q: "What data does it need?", a: "<p>Daily bars and corporate actions (Polygon), point-in-time fundamentals (a fundamentals vendor), earnings calendar, IBKR borrow data, and live quotes from IBKR during execution. Total data cost is well under $200 per month.</p>" },
    { c: "Data & infrastructure", q: "Is this a backtest or live?", a: "<p>This page is a UI mockup with fictional data. The production system runs paper trading first, then live at reduced size, with the same screens.</p>" },
  ];

  return { nav, drawdown, account, regime, sleeves, signals, positions, sectors, limits, stress, orders, changes, research, faq };
})();

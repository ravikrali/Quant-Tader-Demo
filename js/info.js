/* Info page content — the system design narrative shown at #/info */
window.INFO_HTML = `
<div class="toc">
  <a href="#/info#principles">Principles</a><a href="#/info#universe">Universe</a><a href="#/info#book">Strategy book</a><a href="#/info#construction">Portfolio construction</a>
  <a href="#/info#workflow">Daily workflow</a><a href="#/info#packet">Signal packet</a><a href="#/info#ai">AI layer</a><a href="#/info#risk">Risk framework</a>
  <a href="#/info#engineering">Engineering standard</a><a href="#/info#stack">Stack &amp; infrastructure</a><a href="#/info#roadmap">Roadmap &amp; cost</a>
</div>

<h3 id="principles">1. Operating principles</h3>
<p>Meridian is a systematic long/short desk run as a single-manager hedge fund would run it, scaled to one account. Five principles govern every design decision:</p>
<ol>
  <li><b>Human approval on every order.</b> The system proposes, you dispose. Strategies emit <i>target weights</i>; the optimizer turns them into a trade list; each trade becomes a Signal Packet that you approve, modify or reject. Nothing else can create an order.</li>
  <li><b>Rules outrank models.</b> Hard limits (gross, net, beta, sector, name, liquidity, drawdown) are enforced by a deterministic rules engine. AI components may tighten limits or scale exposure down; they can never loosen or override.</li>
  <li><b>Diversify by return source, not by ticker.</b> The book is a set of sleeves with low mutual correlation. Balance comes from allocating risk across sleeves, not from picking a balanced set of stocks.</li>
  <li><b>What was tested is what trades.</b> Research and live share one signal library and one cost model. A strategy cannot reach capital without walk-forward validation, paper trading and probation.</li>
  <li><b>Everything is auditable.</b> Every signal, decision, order, fill, parameter and model version is written to an immutable log with a timestamp and the responsible actor (you, a rule, or a model version).</li>
</ol>

<h3 id="universe">2. Investment universe (v1)</h3>
<p>Broker: <b>Interactive Brokers</b> only. Instrument classes are feature-flagged so the same code runs with more brokers and classes later.</p>
<table><thead><tr><th>Class</th><th>v1 status</th><th>Universe rule</th></tr></thead><tbody>
<tr><td>US equities</td><td>Enabled</td><td>Primary listing on NYSE/Nasdaq, price &gt; $5, 20-day ADV &gt; $20M, market cap &gt; $1B, not within 2 days of a corporate action. ≈1,500 names, rebuilt nightly, survivorship-free history.</td></tr>
<tr><td>ETFs</td><td>Enabled</td><td>≈60 liquid ETFs across US/intl equity, sectors, rates, credit, commodities, currencies. Used by the cross-asset trend sleeve and for the beta hedge.</td></tr>
<tr><td>Short universe</td><td>Enabled</td><td>Equities with IBKR borrow available, fee ≤ 3% annualized, short-interest ≤ 15% of float and days-to-cover ≤ 5 (squeeze screen). Re-checked at submission.</td></tr>
<tr><td>Futures (micro)</td><td>Built, disabled</td><td>MES, MNQ, MGC, MCL, ZN, 6E. Toggle in Settings. When on, the MACRO sleeve migrates its rates/commodity/index exposures from ETFs to futures.</td></tr>
<tr><td>Options</td><td>Planned</td><td>Volatility risk premium sleeve; needs options permissions and a second broker adapter.</td></tr>
<tr><td>Swaps</td><td>Not possible</td><td>OTC contracts under an ISDA; unavailable to retail accounts. Exposures reproduced via ETFs/futures/options.</td></tr>
</tbody></table>

<h3 id="book">3. The strategy book</h3>
<p>Six sleeves are live in v1. Each has a written economic rationale, a documented academic lineage, a known failure mode, and a hedge for that failure mode. Signal frequency, holding period and turnover are deliberately spread out so the sleeves do not crowd into the same trades.</p>

<h4>3.1 Cross-Sectional Momentum (CSM) · 22% budget</h4>
<ul>
<li><b>Signal.</b> 12-month return skipping the most recent month (12-1), z-scored within sector, blended 70/30 with <i>residual</i> momentum (return unexplained by market and sector factors, which is more stable).</li>
<li><b>Portfolio.</b> Long top quintile, short bottom quintile, sector-neutral, rank-weighted with a 4% single-name cap. Monthly rebalance; weekly drift check exits names that fall out of the top/bottom 30%.</li>
<li><b>Why it works.</b> Under-reaction to news and investor herding. One of the most robust documented premia across markets and decades.</li>
<li><b>Failure mode.</b> Momentum crashes at sharp market reversals (2009, 2020). Mitigation: a crash filter halves gross when trailing 3-month market return is negative and 1-month realized vol is above its 80th percentile; the regime engine can also scale it down.</li>
</ul>

<h4>3.2 Quality-Value Long/Short (QV) · 18% budget</h4>
<ul>
<li><b>Signal.</b> Composite of return on invested capital, gross-margin stability, accruals (lower is better), free-cash-flow yield and EV/EBITDA, each rank-normalized within sector using <i>point-in-time</i> fundamentals.</li>
<li><b>Portfolio.</b> Long cheap, high-quality names; short expensive, low-quality names. Quarterly rebalance after earnings season; 3–6 month holds.</li>
<li><b>Why it works.</b> Mispricing of durable profitability and the market's overpayment for glamour. Low correlation to momentum; tends to earn when momentum crashes.</li>
<li><b>Failure mode.</b> Long value droughts (2017–2020) and short squeezes on junk. Mitigation: quality tilt on both sides, squeeze screen, capped short-book concentration.</li>
</ul>

<h4>3.3 Short-Term Reversal (STMR) · 10% budget</h4>
<ul>
<li><b>Signal.</b> 1–5 day residual return after removing market and sector moves. Entry when residual z-score ≤ −2.0 (long) or ≥ +2.0 (short) with no earnings or news catalyst that day (news flagged by the LLM agent).</li>
<li><b>Portfolio.</b> Equal-risk positions, max 15 open, exit at z = 0 or after 5 sessions, hard stop at 1.5× entry deviation.</li>
<li><b>Why it works.</b> Liquidity provision: compensating market makers and forced sellers. Highest Sharpe of the book but capacity-limited and commission-sensitive, hence the small budget.</li>
<li><b>Failure mode.</b> Catching falling knives on real news. Mitigation: catalyst filter, sector-relative construction, time stop.</li>
</ul>

<h4>3.4 Statistical Arbitrage Pairs (STAT) · 15% budget</h4>
<ul>
<li><b>Signal.</b> Intra-sector pairs that pass Engle-Granger and Johansen cointegration tests on a rolling 250-day window with an estimated half-life between 5 and 30 days. Spread z-score entry ±2.0, exit 0, stop ±3.5.</li>
<li><b>Portfolio.</b> Dollar-neutral pairs, beta-matched, max 25 pairs, no name in more than two pairs. Pairs re-validated monthly; a pair that fails the test is closed at the next signal.</li>
<li><b>Why it works.</b> Relative mispricing between economically linked companies reverts. Market-neutral by construction, which makes it a stabilizer in the book.</li>
<li><b>Failure mode.</b> Structural breaks (M&amp;A, guidance shock) that turn a pair into a divergent trade. Mitigation: stop at ±3.5, event flags from the LLM agent, monthly re-validation.</li>
</ul>

<h4>3.5 Post-Earnings Announcement Drift (PEAD) · 12% budget</h4>
<ul>
<li><b>Signal.</b> Standardized unexpected earnings and revenue surprise, guidance change, and day-0 abnormal return, combined into a surprise score. LLM-derived call tone is under research as an additional feature.</li>
<li><b>Portfolio.</b> Long top-decile surprises, short bottom-decile, entered on day +1, held 20–40 sessions, exited on the score's decay schedule.</li>
<li><b>Why it works.</b> Analysts and investors under-react to earnings information; the drift is one of the oldest documented anomalies.</li>
<li><b>Failure mode.</b> Crowding around large caps and decay of the effect in the most liquid names. Mitigation: mid-cap tilt, capacity cap, live/backtest drift monitor (currently on watch).</li>
</ul>

<h4>3.6 ETF Cross-Asset Trend (MACRO) · 23% budget</h4>
<ul>
<li><b>Signal.</b> Time-series momentum blended across 3, 6 and 12-month horizons for each ETF, scaled by its realized volatility so each position carries similar risk.</li>
<li><b>Portfolio.</b> Long positive-trend, short negative-trend assets across equities, rates, credit, commodities, currencies; capped per asset class; rebalanced weekly with a 25% turnover band.</li>
<li><b>Why it works.</b> Persistent trends from slow macro adjustment and investor flows; historically positive in equity crises, which makes this sleeve the book's crisis hedge.</li>
<li><b>Failure mode.</b> Whipsaw in range-bound markets. Mitigation: multi-horizon blend, vol scaling, and regime-based down-weighting in choppy states.</li>
</ul>

<h4>3.7 Later sleeves</h4>
<ul>
<li><b>Futures Trend (FUT).</b> The MACRO model on micro futures: lower financing cost, cleaner short exposure, 24-hour risk management. Built and backtested; toggled off in v1 to avoid exchange and data fees.</li>
<li><b>Volatility Risk Premium (VRP).</b> Delta-hedged short premium on index and liquid single names, sized by implied-minus-realized spread; needs options permissions.</li>
<li><b>Discretionary sleeve.</b> Your own indicator-based ideas can be added as a separate sleeve with its own capital cap, so they never contaminate the systematic core.</li>
</ul>

<h3 id="construction">4. Portfolio construction: how the account stays balanced</h3>
<p>Balance is produced by three layers, applied in order every evening.</p>
<ol>
<li><b>Sleeve budgets (risk parity).</b> Each sleeve's budget is inversely proportional to its trailing 6-month realized volatility of sleeve returns, so no sleeve dominates risk. The allocator (see AI layer) tilts budgets within ±25%. Probation halves a sleeve's budget.</li>
<li><b>Optimizer.</b> Sleeve target weights are combined and passed through a constrained mean-variance optimizer with a Ledoit-Wolf shrinkage covariance matrix and a transaction-cost penalty. Constraints: gross ≤ 200%, |net| ≤ 20%, |beta| ≤ 0.20, single name ≤ 8%, sector net ≤ 15%, position ≤ 2% of ADV, borrow fee ≤ 3%, factor residuals within ±0.25 z. Trades below a minimum size are suppressed to save commissions.</li>
<li><b>Vol targeting and hedge.</b> The whole book is scaled so ex-ante annualized volatility equals the 10% target (cap 12%). Remaining beta is hedged with SPY/IWM. The regime engine can scale exposure to 0.5× or 0.25× in risk-off and crisis states.</li>
</ol>
<p>The output is a <b>trade list</b>: the minimal set of orders that moves the current book to the target book within turnover and cost budgets.</p>

<h3 id="workflow">5. The daily workflow</h3>
<table><thead><tr><th>Time (ET)</th><th>Step</th><th>What happens</th><th>Fails safe</th></tr></thead><tbody>
<tr><td>16:30</td><td>Ingest</td><td>EOD bars, corporate actions, fundamentals updates, earnings calendar, IBKR borrow list and fees, positions and cash from IBKR.</td><td>Missing feed → pipeline halts, alert sent.</td></tr>
<tr><td>17:00</td><td>Data quality gate</td><td>Missing bars, split/dividend adjustment, outlier and stale-price checks, reconciliation of internal positions with IBKR.</td><td>Any break → no signals tonight.</td></tr>
<tr><td>17:30</td><td>Regime engine</td><td>HMM classifies the market state and publishes probabilities and an exposure scale.</td><td>Unavailable → last known state, scale 0.75×.</td></tr>
<tr><td>18:00</td><td>Sleeve signals</td><td>Each enabled sleeve computes raw signals and target weights from the point-in-time snapshot.</td><td>Sleeve error → that sleeve holds current positions.</td></tr>
<tr><td>18:30</td><td>Meta-labeling</td><td>Each candidate trade is scored for probability of profit and sized accordingly; low-confidence trades dropped.</td><td>Model unavailable → base sizing at 0.75×.</td></tr>
<tr><td>19:00</td><td>Optimizer and risk</td><td>Targets combined, constraints enforced, vol target applied, hedge computed, trade list produced, every limit checked.</td><td>Any hard-limit breach → trade list rejected, only risk-reducing trades proposed.</td></tr>
<tr><td>19:30</td><td>Approval queue published</td><td>Signal Packets appear in the Signals page; Telegram/email notification.</td><td>—</td></tr>
<tr><td>Evening</td><td>Your review</td><td>Approve, modify quantity, reject or defer each packet, or approve all passing. Modifications re-run risk checks instantly.</td><td>Unapproved packets expire at the open.</td></tr>
<tr><td>09:20</td><td>Execution window</td><td>Approved orders released to the execution scheduler; IBKR Adaptive for small, VWAP for large; no orders in the first 5 minutes.</td><td>Broker link down → orders held, alert sent.</td></tr>
<tr><td>Intraday</td><td>Monitoring</td><td>Positions reconciled every 5 minutes; stop and time-stop rules watched; urgent exit signals raised to the queue (or fired if pre-approved).</td><td>Kill switch available at all times.</td></tr>
<tr><td>16:15</td><td>Post-trade</td><td>TCA (slippage vs arrival), P&amp;L attribution by sleeve, live-vs-backtest tracking update.</td><td>—</td></tr>
<tr><td>20:00</td><td>Post-mortem</td><td>LLM agent writes the daily note and files parameter or allocation proposals into the model-change queue.</td><td>Proposals never self-apply.</td></tr>
<tr><td>Weekly / monthly</td><td>Governance</td><td>Weekly allocator rebalance proposal. Monthly model retrain (walk-forward), sleeve health review, universe rebuild, probation/retirement decisions.</td><td>—</td></tr>
</tbody></table>

<h3 id="packet">6. Anatomy of a Signal Packet</h3>
<p>A packet is the unit of decision. It must be complete enough that you can judge it in under a minute.</p>
<ul>
<li><b>Identity.</b> Instrument, side, action (open/increase/reduce/close/pair), originating sleeve, packet id.</li>
<li><b>Thesis.</b> Two sentences, generated from the signal's actual features, in plain language, with the numbers that matter (rank, z-score, surprise, trend state).</li>
<li><b>Sizing.</b> Quantity, reference price, notional, target weight, change from current weight, position vs ADV.</li>
<li><b>Economics.</b> Expected return and horizon, exit rule, estimated cost (commission, spread, impact, borrow), confidence from the meta-labeler.</li>
<li><b>Risk.</b> Marginal contribution to portfolio risk, effect on gross/net/beta/sector, and the list of pre-trade checks with pass/warn status.</li>
<li><b>Event flags.</b> Earnings, ex-dividend, index events, pending news, borrow changes, from the LLM agent and calendars.</li>
<li><b>Decision.</b> Approve, modify quantity, reject, defer. Every decision is logged with the packet snapshot.</li>
</ul>

<h3 id="ai">7. The AI layer and self-correction</h3>
<p>Four components, all advisory. They change <i>how much</i> and <i>which</i> trades reach you; they never bypass rules or approvals.</p>
<table><thead><tr><th>Component</th><th>Method</th><th>What it changes</th><th>How it is kept honest</th></tr></thead><tbody>
<tr><td>Regime detector</td><td>Hidden Markov model on vol, correlation, dispersion, breadth, VIX term structure, credit spreads</td><td>Exposure scale (1.0 / 0.75 / 0.5 / 0.25×) and sleeve tilts per state</td><td>Fitted on 20+ years, evaluated out-of-sample; state changes require two consecutive days above 0.6 probability</td></tr>
<tr><td>Meta-labeler</td><td>Gradient-boosted classifier on signal features and regime state</td><td>Probability of profit per trade → sizing and a 0.55 floor</td><td>Walk-forward retrain monthly; calibration tracked; falls back to base sizing if AUC drops below 0.55</td></tr>
<tr><td>Sleeve allocator</td><td>Risk-parity base with Thompson-sampling tilt on recent sleeve performance</td><td>Sleeve budgets within ±25% of base</td><td>Weekly proposal to the approval queue; caps and probation rules are hard-coded</td></tr>
<tr><td>Post-mortem and research agent (LLM)</td><td>Reads fills, P&amp;L, news, filings, transcripts; runs structured analyses</td><td>Daily note; proposals for parameter, allocation and universe changes; event flags on packets</td><td>Cannot trade or edit config; every proposal is a versioned diff needing approval; backtested before promotion</td></tr>
</tbody></table>
<h4>Drift, probation and retirement</h4>
<p>Every sleeve carries a live-vs-backtest tracking statistic (rolling Sharpe difference, hit-rate difference, slippage difference). When the divergence z-score passes −2.0 the sleeve enters <b>probation</b> at half budget. If it recovers within 3 months it is restored; if it deteriorates past −3.0 it is <b>retired</b> and the research pipeline is asked for a replacement. This is how the book self-corrects without anyone hand-tuning parameters on live results.</p>

<h3 id="risk">8. Risk framework</h3>
<ul>
<li><b>Pre-trade.</b> All hard limits, liquidity, borrow, event windows, and turnover budget checked on every packet and re-checked on modification.</li>
<li><b>Portfolio.</b> Ex-ante vol, 1-day VaR and expected shortfall (historical, 500 days), factor exposures (market, size, value, momentum, quality, volatility, growth, leverage), stress scenarios (2008, March 2020, momentum crash, rate shock, USD shock, sector rotation).</li>
<li><b>Drawdown control.</b> −5% from peak: exposure scale 0.75×. −10%: 0.5× and new-position freeze except risk-reducing trades. −15%: full halt pending manual review.</li>
<li><b>Operational.</b> Kill switch (cancel all, block new), flatten-all (confirmed), broker heartbeat, reconciliation breaks, data staleness, model-availability fallbacks.</li>
</ul>

<h3 id="engineering">9. Engineering standard ("hedge-fund grade")</h3>
<ul>
<li><b>Point-in-time everything.</b> Prices, fundamentals, universe membership and borrow data are stored as-of their availability date; backtests cannot see the future.</li>
<li><b>Deterministic, versioned runs.</b> Each nightly run records data snapshot id, code commit, config version and model versions; any run can be reproduced.</li>
<li><b>One code path.</b> Backtest, paper and live use the same signal, cost and risk libraries; environments differ only by configuration.</li>
<li><b>Immutable audit log.</b> Append-only table of signals, decisions, orders, fills, config changes and model promotions.</li>
<li><b>Reconciliation.</b> Internal positions and cash reconciled with the broker every 5 minutes during the session and at end of day; breaks halt new submissions.</li>
<li><b>Testing.</b> Unit tests for every signal and risk rule, integration tests against the IBKR paper gateway, replay tests of historical days through the full pipeline.</li>
<li><b>Secrets and access.</b> Credentials in a vault or local .env never in synced folders; UI behind authentication; broker keys scoped to trading only.</li>
<li><b>Observability.</b> Metrics and alerts for every stage (latency, error rate, staleness), daily health report, runbooks for each failure mode.</li>
</ul>

<h3 id="stack">10. Stack and infrastructure</h3>
<table><thead><tr><th>Layer</th><th>Choice</th></tr></thead><tbody>
<tr><td>Language / services</td><td>Python 3.12, FastAPI, APScheduler; one container per service (data, research, signals, portfolio, execution, ai, api)</td></tr>
<tr><td>Storage</td><td>PostgreSQL + TimescaleDB for bars and tables; Parquet lake for research; Redis for live state and queues</td></tr>
<tr><td>Broker</td><td>IBKR Gateway with ib_async; adapter interface for TastyTrade / Schwab later</td></tr>
<tr><td>Data</td><td>Polygon (bars, corporate actions), point-in-time fundamentals vendor, earnings calendar, IBKR borrow and live quotes</td></tr>
<tr><td>Research</td><td>Polars / pandas, scikit-learn, LightGBM, hmmlearn, statsmodels, custom vectorized backtester with cost model</td></tr>
<tr><td>AI</td><td>Claude API for the post-mortem and research agent with tool access limited to read-only data and proposal creation</td></tr>
<tr><td>UI</td><td>React / Next.js, WebSocket live updates, TradingView lightweight charts; this mockup defines the screens</td></tr>
<tr><td>Ops</td><td>Docker Compose on the existing VPS, Grafana + Prometheus, Telegram alerts, nightly encrypted backups</td></tr>
</tbody></table>

<h3 id="roadmap">11. Roadmap and running cost</h3>
<table><thead><tr><th>Phase</th><th>Weeks</th><th>Deliverable</th></tr></thead><tbody>
<tr><td>0 · Foundations</td><td>1–2</td><td>Repo, data pipeline, IBKR paper adapter, universe builder, audit log, this UI shell connected to real data</td></tr>
<tr><td>1 · Research lab</td><td>3–6</td><td>Backtester with cost model, walk-forward harness, CSM + MACRO + STMR validated, portfolio and risk engine</td></tr>
<tr><td>2 · Paper desk</td><td>7–10</td><td>Full nightly pipeline, Signal Packets, approval queue, execution scheduler, TCA; QV, STAT, PEAD added</td></tr>
<tr><td>3 · Live, small</td><td>11–14</td><td>Live at reduced budget on IBKR, monitoring, kill switch drills, regime engine and meta-labeler live</td></tr>
<tr><td>4 · Self-correction</td><td>15–18</td><td>Allocator, drift/probation logic, post-mortem agent, model-change queue; scale-up rules</td></tr>
<tr><td>5 · Expansion</td><td>19+</td><td>Futures sleeve toggle, TastyTrade adapter, options VRP sleeve, discretionary sleeve</td></tr>
</tbody></table>
<table><thead><tr><th>Running cost (v1, IBKR only)</th><th>Per month</th></tr></thead><tbody>
<tr><td>VPS (existing)</td><td>$30–100</td></tr>
<tr><td>Market data (Polygon starter tier + fundamentals + IBKR US bundle)</td><td>$60–180</td></tr>
<tr><td>LLM API</td><td>$20–100</td></tr>
<tr><td>Monitoring, alerts, backups</td><td>$0–30</td></tr>
<tr><td><b>Total software</b></td><td><b>≈ $110–410</b></td></tr>
</tbody></table>
<p>Trading costs dominate: IBKR Pro commissions, borrow fees on shorts, and margin interest. Portfolio margin (available at $110k+) materially improves capital efficiency for a long/short book. Enabling futures adds roughly $40–90 per month in exchange and data fees.</p>
`;

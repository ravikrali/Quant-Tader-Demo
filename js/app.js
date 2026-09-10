/* ============================================================
   MERIDIAN desk — mockup app (vanilla JS, hash router)
   ============================================================ */
(() => {
  const M = window.MOCK;
  const $ = (s, el = document) => el.querySelector(s);
  const h = (s) => { const t = document.createElement("template"); t.innerHTML = s.trim(); return t.content.firstElementChild; };
  const fmt = {
    usd: (n, d = 0) => (n < 0 ? "−" : "") + "$" + Math.abs(n).toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }),
    pct: (n, d = 1, sign = true) => (sign && n > 0 ? "+" : n < 0 ? "−" : "") + Math.abs(n).toFixed(d) + "%",
    n: (n, d = 0) => n.toLocaleString(undefined, { minimumFractionDigits: d, maximumFractionDigits: d }),
    date: (d) => d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
  };
  const cls = (n) => (n > 0 ? "pos" : n < 0 ? "neg" : "");

  // ---------- app state (in-memory only) ----------
  const state = {
    settings: { futures: false, options: false, equities: true, etfs: true, autoStops: false, killArmed: false, mode: "PAPER", expiry: "Next open", broker2: false },
    signals: M.signals.map(s => ({ ...s })),
    changes: M.changes.map(c => ({ ...c })),
  };

  // ---------- tooltip / toast ----------
  const tip = h(`<div class="tip"></div>`); document.body.appendChild(tip);
  const showTip = (e, html) => { tip.innerHTML = html; tip.style.display = "block"; moveTip(e); };
  const moveTip = (e) => { const x = e.clientX + 14, y = e.clientY + 14; tip.style.left = Math.min(x, window.innerWidth - tip.offsetWidth - 12) + "px"; tip.style.top = Math.min(y, window.innerHeight - tip.offsetHeight - 12) + "px"; };
  const hideTip = () => (tip.style.display = "none");
  const toastBox = h(`<div class="toast"></div>`); document.body.appendChild(toastBox);
  const toast = (msg, kind = "") => { const t = h(`<div class="${kind}">${msg}</div>`); toastBox.appendChild(t); setTimeout(() => t.remove(), 3200); };

  // ---------- chart helpers (inline SVG) ----------
  const NS = "http://www.w3.org/2000/svg";
  function lineChart(series, opts = {}) {
    const W = opts.w || 720, H = opts.h || 220, pl = 46, pr = 12, pt = 12, pb = 24;
    const all = series.flatMap(s => s.data);
    const min = opts.min ?? Math.min(...all), max = opts.max ?? Math.max(...all);
    const n = series[0].data.length;
    const x = (i) => pl + (i / (n - 1)) * (W - pl - pr);
    const y = (v) => pt + (1 - (v - min) / ((max - min) || 1)) * (H - pt - pb);
    const wrap = h(`<div style="position:relative"></div>`);
    const svg = document.createElementNS(NS, "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("class", "chart");
    // grid + y labels
    for (let k = 0; k <= 4; k++) {
      const v = min + (k / 4) * (max - min), yy = y(v);
      svg.insertAdjacentHTML("beforeend", `<line class="grid-l" x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}"/><text x="${pl - 6}" y="${yy + 3}" text-anchor="end">${opts.fmtY ? opts.fmtY(v) : v.toFixed(0)}</text>`);
    }
    if (opts.zero !== undefined) { const yy = y(opts.zero); svg.insertAdjacentHTML("beforeend", `<line x1="${pl}" x2="${W - pr}" y1="${yy}" y2="${yy}" stroke="var(--ink-4)" stroke-dasharray="3 3"/>`); }
    // x labels
    const lab = opts.labels || [];
    for (let k = 0; k <= 4; k++) { const i = Math.round((k / 4) * (n - 1)); svg.insertAdjacentHTML("beforeend", `<text x="${x(i)}" y="${H - 6}" text-anchor="${k === 0 ? "start" : k === 4 ? "end" : "middle"}">${lab[i] || i}</text>`); }
    series.forEach(s => {
      const d = s.data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
      if (s.area) svg.insertAdjacentHTML("beforeend", `<path d="${d} L${x(n - 1)},${y(opts.zero ?? min)} L${x(0)},${y(opts.zero ?? min)} Z" fill="${s.color}" opacity=".12"/>`);
      svg.insertAdjacentHTML("beforeend", `<path d="${d}" fill="none" stroke="${s.color}" stroke-width="${s.width || 2}" ${s.dash ? 'stroke-dasharray="4 3"' : ""} stroke-linejoin="round"/>`);
    });
    // crosshair + hover
    const cross = document.createElementNS(NS, "line"); cross.setAttribute("stroke", "var(--ink-3)"); cross.setAttribute("y1", pt); cross.setAttribute("y2", H - pb); cross.style.display = "none"; svg.appendChild(cross);
    const dots = series.map(s => { const c = document.createElementNS(NS, "circle"); c.setAttribute("r", 4); c.setAttribute("fill", s.color); c.setAttribute("stroke", "var(--panel)"); c.setAttribute("stroke-width", 2); c.style.display = "none"; svg.appendChild(c); return c; });
    const hit = document.createElementNS(NS, "rect"); hit.setAttribute("x", pl); hit.setAttribute("y", pt); hit.setAttribute("width", W - pl - pr); hit.setAttribute("height", H - pt - pb); hit.setAttribute("fill", "transparent"); svg.appendChild(hit);
    hit.addEventListener("mousemove", (e) => {
      const r = svg.getBoundingClientRect(); const sx = (e.clientX - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(n - 1, Math.round(((sx - pl) / (W - pl - pr)) * (n - 1))));
      cross.setAttribute("x1", x(i)); cross.setAttribute("x2", x(i)); cross.style.display = "";
      dots.forEach((c, k) => { c.setAttribute("cx", x(i)); c.setAttribute("cy", y(series[k].data[i])); c.style.display = ""; });
      showTip(e, `<div class="t">${lab[i] || i}</div>` + series.map(s => `<div><span class="sw" style="background:${s.color}"></span>${s.name}: ${opts.fmtV ? opts.fmtV(s.data[i]) : s.data[i]}</div>`).join(""));
    });
    hit.addEventListener("mouseleave", () => { cross.style.display = "none"; dots.forEach(c => (c.style.display = "none")); hideTip(); });
    wrap.appendChild(svg);
    if (series.length > 1) wrap.appendChild(h(`<div class="legend">${series.map(s => `<span><span class="sw" style="background:${s.color}"></span>${s.name}</span>`).join("")}</div>`));
    return wrap;
  }
  function spark(data, color, w = 120, hh = 28) {
    const min = Math.min(...data), max = Math.max(...data);
    const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${hh - 2 - ((v - min) / ((max - min) || 1)) * (hh - 4)}`).join(" ");
    return `<svg class="spark" width="${w}" height="${hh}" viewBox="0 0 ${w} ${hh}"><polyline points="${pts}" fill="none" stroke="${color}" stroke-width="1.5"/></svg>`;
  }
  function hbars(rows, opts = {}) {
    // rows: {label, value, color, text}
    const max = opts.max ?? Math.max(...rows.map(r => Math.abs(r.value)));
    const el = h(`<div></div>`);
    rows.forEach(r => {
      const pct = Math.min(100, (Math.abs(r.value) / max) * 100);
      const row = h(`<div class="limit" style="grid-template-columns:${opts.lw || 150}px 1fr ${opts.vw || 90}px"><div class="l">${r.label}</div><div class="bar" style="height:${opts.bh || 7}px"><i style="width:${pct}%;background:${r.color}"></i></div><div class="v">${r.text ?? r.value}</div></div>`);
      row.addEventListener("mousemove", (e) => showTip(e, `<div class="t">${r.label}</div>${r.tip || r.text || r.value}`)); row.addEventListener("mouseleave", hideTip);
      el.appendChild(row);
    });
    return el;
  }
  function divBars(rows) {
    // rows: {label, l, sh}  — long positive right, short negative left
    const max = Math.max(...rows.flatMap(r => [r.l, -r.sh]));
    const el = h(`<div></div>`);
    rows.forEach(r => {
      const row = h(`<div class="limit" style="grid-template-columns:130px 1fr 96px">
        <div class="l">${r.label}</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:2px;align-items:center">
          <div style="display:flex;justify-content:flex-end"><div style="height:8px;border-radius:3px 0 0 3px;background:var(--critical-2);width:${(-r.sh / max) * 100}%"></div></div>
          <div><div style="height:8px;border-radius:0 3px 3px 0;background:var(--good);width:${(r.l / max) * 100}%"></div></div>
        </div>
        <div class="v"><span class="${cls(r.l + r.sh)}">${fmt.pct(r.l + r.sh)}</span></div></div>`);
      row.addEventListener("mousemove", (e) => showTip(e, `<div class="t">${r.label}</div>Long ${r.l.toFixed(1)}% · Short ${r.sh.toFixed(1)}%<br>Net ${fmt.pct(r.l + r.sh)}`)); row.addEventListener("mouseleave", hideTip);
      el.appendChild(row);
    });
    return el;
  }
  const seqColor = (t) => { // blue ramp, t in 0..1
    const stops = ["#184f95", "#1c5cab", "#256abf", "#2a78d6", "#3987e5", "#5598e7", "#6da7ec"];
    return stops[Math.round(Math.max(0, Math.min(1, t)) * (stops.length - 1))];
  };

  // ---------- layout ----------
  const NAV = [
    { g: "Desk", items: [["dashboard", "Overview", "1"], ["signals", "Signals", "2"], ["portfolio", "Portfolio", "3"], ["risk", "Risk", "4"], ["execution", "Execution", "5"]] },
    { g: "Engine", items: [["strategies", "Strategies", "6"], ["research", "Research", "7"], ["ai", "AI & Regime", "8"], ["settings", "Settings", "9"]] },
    { g: "Reference", items: [["info", "Info", "I"], ["faq", "FAQ", "F"]] },
  ];
  const pending = () => state.signals.filter(s => s.state === "PENDING").length;
  const pendingChanges = () => state.changes.filter(c => c.state === "PENDING").length;

  function renderShell() {
    document.body.innerHTML = "";
    document.body.appendChild(tip); document.body.appendChild(toastBox);
    const shell = h(`<div class="shell">
      <aside class="sidebar">
        <div class="brand"><div class="mark"></div><div><h1>Meridian</h1><span>Quant Desk · v1 mockup</span></div></div>
        <nav class="nav" id="nav"></nav>
        <div class="foot"><b>IBKR</b> · ${M.account.id}<br>Gateway 10.30 · latency 41 ms<br>Data as of 2026-09-10 19:32 ET</div>
      </aside>
      <div class="main">
        <div class="topbar">
          <span class="chip ${state.settings.mode === "LIVE" ? "live" : "paper"}"><span class="dot ${state.settings.mode === "LIVE" ? "" : "amber"}"></span>${state.settings.mode} · IBKR</span>
          <span class="chip"><span class="dot"></span>${M.regime.label}</span>
          <span class="chip"><span class="dot ${state.settings.futures ? "" : "off"}"></span>Futures ${state.settings.futures ? "on" : "off"}</span>
          <span class="spacer"></span>
          <a class="chip amber" href="#/signals" id="pendChip"></a>
          <span class="clock" id="clock"></span>
          <button class="btn sm danger" id="kill">Kill switch</button>
        </div>
        <div id="view"></div>
      </div>
    </div>`);
    document.body.appendChild(shell);
    document.body.appendChild(h(`<div class="demo-badge">MOCKUP · FICTIONAL DATA</div>`));
    const nav = $("#nav");
    NAV.forEach(g => {
      const grp = h(`<div class="nav-group"><span class="caps">${g.g}</span></div>`);
      g.items.forEach(([r, l, k]) => grp.appendChild(h(`<a href="#/${r}" data-r="${r}"><span>${l}</span><span class="k">${k}</span></a>`)));
      nav.appendChild(grp);
    });
    $("#kill").addEventListener("click", () => {
      if (confirm("KILL SWITCH\n\nCancel all working orders at IBKR and block new submissions?\n\n(This is a mockup — nothing is sent.)")) toast("Kill switch engaged. 1 working order cancelled. Submissions blocked.", "bad");
    });
    const tick = () => { const d = new Date(); $("#clock").textContent = d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + " local"; };
    tick(); setInterval(tick, 1000);
    updateBadges();
  }
  function updateBadges() {
    const p = pending();
    $("#pendChip").innerHTML = `<span class="dot amber"></span>${p} signal${p === 1 ? "" : "s"} awaiting approval`;
    const a = $('#nav a[data-r="signals"]'); if (a) a.innerHTML = `<span>Signals</span>${p ? `<span class="pill">${p}</span>` : `<span class="k">2</span>`}`;
    const b = $('#nav a[data-r="ai"]'); const pc = pendingChanges(); if (b) b.innerHTML = `<span>AI &amp; Regime</span>${pc ? `<span class="pill">${pc}</span>` : `<span class="k">8</span>`}`;
  }

  const head = (title, sub, actions = "") => `<div class="page-head"><div><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ""}</div><div class="actions">${actions}</div></div>`;
  const kpi = (l, v, d = "", extra = "") => `<div class="panel kpi"><div class="kpi-l">${l}</div><div class="kpi-v">${v}</div><div class="kpi-d">${d}</div>${extra}</div>`;
  const labels = M.nav.map(p => fmt.date(p.d));

  // ---------- pages ----------
  const pages = {};

  pages.dashboard = () => {
    const a = M.account; const el = h(`<div class="page"></div>`);
    el.innerHTML = head(`Good evening. <em>${pending()} decisions</em> are waiting.`, `Tonight's run finished at 19:32 ET. Regime unchanged (${M.regime.label}). All pre-trade checks passed; one sector limit is near its cap.`,
      `<a class="btn primary" href="#/signals">Review signals</a><a class="btn" href="#/ai">Daily post-mortem</a>`);
    const g = h(`<div class="grid g12"></div>`);
    g.innerHTML = `
      <div class="c3">${kpi("Net asset value", fmt.usd(a.nav), `<span class="${cls(a.dayPnl)}">${fmt.usd(a.dayPnl)} · ${fmt.pct(a.dayPnlPct, 2)}</span> today`, spark(M.nav.slice(-40).map(p => p.v), "var(--s1)"))}</div>
      <div class="c3">${kpi("YTD return", fmt.pct(a.ytd), `MTD <span class="${cls(a.mtd)}">${fmt.pct(a.mtd)}</span> · vs SPY ${fmt.pct(a.ytd - 8.9)}`, spark(M.nav.slice(-40).map((p, i) => p.v - M.nav[M.nav.length - 40 + i].b + 40000), "var(--s3)"))}</div>
      <div class="c3">${kpi("Sharpe (live, 12m)", a.sharpe.toFixed(2), `Sortino ${a.sortino.toFixed(2)} · Max DD ${fmt.pct(a.maxDD)}`)}</div>
      <div class="c3">${kpi("Exposure", `${(a.gross * 100).toFixed(0)}% <span class="dim" style="font-size:14px">gross</span>`, `Net ${fmt.pct(a.net * 100, 0)} · Beta ${a.beta.toFixed(2)} · Vol ${a.vol}% (target ${a.targetVol}%)`)}</div>`;
    el.appendChild(g);

    const g2 = h(`<div class="grid g12" style="margin-top:14px"></div>`);
    const eq = h(`<div class="panel c8"><div class="panel-head"><h3>Equity curve, 12 months</h3><span class="sub">Fund NAV vs 60/40 benchmark · hover for values</span></div></div>`);
    eq.appendChild(lineChart([{ name: "Fund NAV", data: M.nav.map(p => p.v), color: "var(--s1)", area: true }, { name: "60/40 benchmark", data: M.nav.map(p => p.b), color: "var(--ink-3)", width: 1.5, dash: true }], { labels, fmtY: v => "$" + (v / 1000).toFixed(0) + "k", fmtV: v => fmt.usd(v) }));
    g2.appendChild(eq);
    const rg = h(`<div class="panel c4"><div class="panel-head"><h3>Market regime</h3><span class="sub">HMM · 4 states</span></div>
      <div class="hero-n" style="font-size:28px;margin-bottom:6px">${M.regime.label.split(" · ")[0]}</div>
      <div class="small dim" style="margin-bottom:12px">Since ${M.regime.since} · VIX ${M.regime.vix} · avg pair corr ${M.regime.corr} · breadth ${(M.regime.breadth * 100).toFixed(0)}%</div></div>`);
    rg.appendChild(hbars(Object.entries(M.regime.probs).map(([k, v], i) => ({ label: k, value: v, color: i === 0 ? "var(--s1)" : "var(--ink-4)", text: (v * 100).toFixed(0) + "%" })), { lw: 120, vw: 50, max: 1 }));
    rg.appendChild(h(`<div class="note amber" style="margin-top:12px">${M.regime.note}</div>`));
    g2.appendChild(rg);

    const att = h(`<div class="panel c4"><div class="panel-head"><h3>YTD attribution by sleeve</h3><span class="sub">% of NAV</span></div></div>`);
    att.appendChild(hbars(M.sleeves.filter(s => s.state === "LIVE").map(s => ({ label: s.name, value: s.ytd, color: s.color, text: fmt.pct(s.ytd) })), { lw: 170, vw: 60 }));
    g2.appendChild(att);
    const sec = h(`<div class="panel c4"><div class="panel-head"><h3>Sector exposure</h3><span class="sub">short ◂ ▸ long · net at right</span></div></div>`);
    sec.appendChild(divBars(M.sectors.map(s => ({ label: s.s, l: s.l, sh: s.sh }))));
    g2.appendChild(sec);
    const tl = h(`<div class="panel c4"><div class="panel-head"><h3>Tonight's pipeline</h3><span class="sub">T-1 evening run</span></div><div class="timeline">
      ${[["16:30", "Data ingest", "EOD bars, corporate actions, borrow rates", "done"], ["17:00", "Data quality gate", "0 missing bars · 2 splits applied", "done"], ["17:30", "Regime engine", "Risk-On p=0.62 (unchanged)", "done"], ["18:00", "Sleeve signals", "6 sleeves · 214 raw targets", "done"], ["18:30", "Meta-labeling", "61 candidates scored", "done"], ["19:00", "Optimizer + risk", "6 trades · all limits pass", "done"], ["19:32", "Approval queue published", `${pending()} awaiting your decision`, "on"], ["09:20", "Execution window opens", "Approved trades only", ""]].map(([t, hh, d, s]) => `<div class="tl ${s}"><div class="t">${t}</div><div class="h">${hh}</div><div class="d">${d}</div></div>`).join("")}
    </div></div>`);
    g2.appendChild(tl);
    el.appendChild(g2);
    return el;
  };

  pages.signals = () => {
    const el = h(`<div class="page"></div>`);
    const p = pending();
    el.innerHTML = head(`Signals <em>· ${p} pending</em>`, `Each card is a complete Signal Packet: thesis, sizing, cost, risk contribution and the pre-trade checks it passed. Nothing executes until you approve. Unapproved signals expire at ${state.settings.expiry.toLowerCase()}.`,
      `<button class="btn" id="rejectAll">Reject all</button><button class="btn primary" id="approveAll">Approve all passing (${p})</button>`);
    el.appendChild(h(`<div class="note" style="margin-bottom:14px">Execution plan for approved trades: IBKR <b>Adaptive</b> algo for notional under $25k, <b>VWAP 30 min</b> above; no submissions in the first 5 minutes after the open; limit collar ±0.4% from arrival price. ${state.settings.autoStops ? "<b>Pre-approved protective stops are ON.</b>" : "Protective stops require approval (default)."}</div>`));
    const list = h(`<div class="sig-list"></div>`);
    state.signals.forEach(s => list.appendChild(sigCard(s)));
    el.appendChild(list);
    $("#approveAll", el).addEventListener("click", () => { state.signals.forEach(s => { if (s.state === "PENDING") s.state = "APPROVED"; }); toast("All pending signals approved and queued for the 09:20 execution window.", "good"); route(); });
    $("#rejectAll", el).addEventListener("click", () => { state.signals.forEach(s => { if (s.state === "PENDING") s.state = "REJECTED"; }); toast("All pending signals rejected. Logged as user-rejected."); route(); });
    return el;
  };
  function sigCard(s) {
    const sleeve = M.sleeves.find(x => x.id === s.sleeve);
    const sideTag = s.side === "PAIR" ? `<span class="tag blue">PAIR</span>` : s.side.startsWith("BUY") ? `<span class="tag long">${s.side}</span>` : `<span class="tag short">${s.side}</span>`;
    const c = h(`<div class="sig ${s.state.toLowerCase()} ${s.urgent ? "urgent" : ""}">
      <div><div class="sym">${s.sym}</div><div class="side">${sideTag}<span class="tag">${s.action}</span></div><div class="name">${s.name}</div><div class="name" style="margin-top:4px"><span class="sw" style="background:${sleeve.color}"></span>${sleeve.name}</div>${s.urgent ? `<div class="name" style="color:var(--critical-2);margin-top:6px">RULE EXIT · time-critical</div>` : ""}</div>
      <div><div class="thesis">${s.thesis}</div>
        <div class="facts">
          <div>Quantity<b>${s.side === "PAIR" ? "60 / −118" : fmt.n(s.qty)}</b></div><div>Ref. price<b>${s.px ? "$" + s.px.toFixed(2) : "spread"}</b></div><div>Notional<b>${fmt.usd(s.notional)}</b></div><div>Target weight<b>${fmt.pct(s.weight)} NAV</b></div>
          <div>Expected<b>${s.expRet}</b></div><div>Exit rule<b>${s.stop}</b></div><div>Risk contrib.<b>${s.riskContrib}</b></div><div>Est. cost<b>${s.cost}</b></div>
        </div>
        <div class="checks">${s.checks.map(x => `<span class="${x.includes("→") ? "warn" : ""}">${x}</span>`).join("")}<span style="color:var(--ink-4)">${s.adv} · horizon ${s.horizon} · id ${s.id}</span></div>
      </div>
      <div class="act">
        <div class="conf">Confidence <div class="bar"><i style="width:${s.conf * 100}%"></i></div><span class="mono">${(s.conf * 100).toFixed(0)}%</span></div>
        <div class="qty">Qty <input type="text" value="${s.side === "PAIR" ? "60" : s.qty}" ${s.state !== "PENDING" ? "disabled" : ""}/> <span class="muted">edit to modify</span></div>
        <div class="row"><button class="btn good" ${s.state !== "PENDING" ? "disabled" : ""} data-a="APPROVED">Approve</button><button class="btn bad" ${s.state !== "PENDING" ? "disabled" : ""} data-a="REJECTED">Reject</button><button class="btn ghost" data-a="DEFER">Defer</button></div>
        <div class="status">${s.state === "PENDING" ? "Awaiting decision · expires at next open" : s.state === "APPROVED" ? "Approved · queued for 09:20 ET window" : "Rejected · logged"}</div>
      </div></div>`);
    c.querySelectorAll("button[data-a]").forEach(b => b.addEventListener("click", () => {
      const a = b.dataset.a; if (a === "DEFER") { toast(`${s.sym} deferred to tomorrow's run.`); return; }
      const q = $("input", c).value; s.state = a; if (a === "APPROVED" && String(q) !== String(s.qty) && s.side !== "PAIR") { s.qty = Number(q); toast(`${s.sym} approved at modified quantity ${q}. Risk checks re-run: pass.`, "good"); }
      else toast(`${s.sym} ${a === "APPROVED" ? "approved and queued." : "rejected."}`, a === "APPROVED" ? "good" : ""); route();
    }));
    return c;
  }

  pages.portfolio = () => {
    const el = h(`<div class="page"></div>`); const a = M.account;
    el.innerHTML = head("Portfolio", "Positions reconciled with IBKR every 5 minutes during the session. Book is sector-aware and beta-hedged with an index ETF.", `<button class="btn">Export CSV</button><button class="btn">Reconcile now</button>`);
    const g = h(`<div class="grid g12"></div>`);
    g.innerHTML = `<div class="c3">${kpi("Long", "$" + fmt.n(Math.round(a.nav * 0.74 / 1000)) + "k", "74% of NAV · 47 names")}</div><div class="c3">${kpi("Short", "−$" + fmt.n(Math.round(a.nav * 0.68 / 1000)) + "k", "68% of NAV · 41 names + hedge")}</div><div class="c3">${kpi("Cash & margin", fmt.usd(a.cash), `Buying power ${fmt.usd(a.buyingPower)} · util ${(a.marginUsed * 100).toFixed(0)}%`)}</div><div class="c3">${kpi("Unrealised P&L", `<span class="pos">${fmt.usd(12_261)}</span>`, "Realised MTD +$18,940")}</div>`;
    el.appendChild(g);
    const g2 = h(`<div class="grid g12" style="margin-top:14px"></div>`);
    const tbl = h(`<div class="panel flush c8"><div class="panel-head"><h3>Positions (largest 12 shown)</h3><span class="sub">click a row for the trade history · demo</span></div><div class="scroll-x"><table><thead><tr><th>Symbol</th><th>Side</th><th>Sleeve</th><th class="num">Qty</th><th class="num">Avg</th><th class="num">Last</th><th class="num">Weight</th><th class="num">P&L</th><th>Sector</th><th class="num">β</th></tr></thead><tbody>
      ${M.positions.map(p => `<tr><td><b>${p.sym}</b></td><td><span class="tag ${p.side === "L" ? "long" : "short"}">${p.side === "L" ? "LONG" : "SHORT"}</span></td><td class="small dim">${p.sleeve}</td><td class="num">${fmt.n(p.qty)}</td><td class="num">${p.avg.toFixed(2)}</td><td class="num">${p.last.toFixed(2)}</td><td class="num">${fmt.pct(p.w)}</td><td class="num ${cls(p.pnl)}">${fmt.usd(p.pnl)}</td><td class="small dim">${p.sector}</td><td class="num">${p.beta.toFixed(2)}</td></tr>`).join("")}
    </tbody></table></div></div>`);
    g2.appendChild(tbl);
    const right = h(`<div class="c4 grid" style="gap:14px"></div>`);
    const bySleeve = h(`<div class="panel"><div class="panel-head"><h3>Gross by sleeve</h3><span class="sub">% NAV</span></div></div>`);
    bySleeve.appendChild(hbars(M.sleeves.filter(s => s.gross > 0).map(s => ({ label: s.id, value: s.gross * 100, color: s.color, text: (s.gross * 100).toFixed(0) + "%" })), { lw: 70, vw: 50 }));
    right.appendChild(bySleeve);
    const sec = h(`<div class="panel"><div class="panel-head"><h3>Sector long / short</h3><span class="sub">net at right</span></div></div>`);
    sec.appendChild(divBars(M.sectors.map(s => ({ label: s.s, l: s.l, sh: s.sh }))));
    right.appendChild(sec);
    g2.appendChild(right); el.appendChild(g2);
    return el;
  };

  pages.risk = () => {
    const el = h(`<div class="page"></div>`);
    el.innerHTML = head("Risk", "Hard limits are enforced by the rules engine before any signal reaches you. AI components can tighten limits but never loosen them.", `<button class="btn">Run stress now</button><button class="btn danger">Flatten all…</button>`);
    const g = h(`<div class="grid g12"></div>`);
    g.innerHTML = `<div class="c3">${kpi("1-day VaR (99%)", "−$19,400", "1.7% NAV · historical, 500d")}</div><div class="c3">${kpi("Expected shortfall", "−$27,900", "2.5% NAV")}</div><div class="c3">${kpi("Ex-ante vol", "9.2%", "target 10% · scale 1.00×")}</div><div class="c3">${kpi("Drawdown from peak", `<span class="neg">−2.1%</span>`, "circuit breaker at −10% · halt at −15%")}</div>`;
    el.appendChild(g);
    const g2 = h(`<div class="grid g12" style="margin-top:14px"></div>`);
    const lim = h(`<div class="panel c5"><div class="panel-head"><h3>Limit utilisation</h3><span class="sub">current vs hard limit</span></div></div>`);
    lim.appendChild(hbars(M.limits.map(l => { const u = Math.abs(l.v) / l.max; return { label: l.l, value: u, color: u > 0.9 ? "var(--critical)" : u > 0.75 ? "var(--warn)" : "var(--s1)", text: `${l.v}${l.unit} / ${l.max}${l.unit}`, tip: `${(u * 100).toFixed(0)}% of limit` }; }), { lw: 150, vw: 110, max: 1 }));
    g2.appendChild(lim);
    const dd = h(`<div class="panel c7"><div class="panel-head"><h3>Drawdown, 12 months</h3><span class="sub">% from running peak</span></div></div>`);
    dd.appendChild(lineChart([{ name: "Drawdown", data: M.drawdown, color: "var(--critical-2)", area: true }], { labels, fmtY: v => v.toFixed(0) + "%", fmtV: v => v.toFixed(2) + "%", max: 0, zero: 0 }));
    g2.appendChild(dd);
    const st = h(`<div class="panel c5"><div class="panel-head"><h3>Stress scenarios</h3><span class="sub">P&L impact, % NAV</span></div></div>`);
    st.appendChild(hbars(M.stress.map(s => ({ label: s.s, value: s.p, color: "var(--critical-2)", text: fmt.pct(s.p) })), { lw: 250, vw: 60 }));
    g2.appendChild(st);
    const fac = h(`<div class="panel c7"><div class="panel-head"><h3>Factor exposure (Barra-style, ex-ante)</h3><span class="sub">z-score units · target neutral except Momentum, Quality, Value</span></div></div>`);
    fac.appendChild(hbars([["Market beta", 0.04], ["Size", -0.12], ["Value", 0.31], ["Momentum", 0.58], ["Quality", 0.42], ["Volatility", -0.19], ["Growth", 0.05], ["Leverage", -0.08]].map(([l, v]) => ({ label: l, value: v, color: ["Momentum", "Quality", "Value"].includes(l) ? "var(--s1)" : "var(--ink-3)", text: (v > 0 ? "+" : "") + v.toFixed(2) })), { lw: 120, vw: 60, max: 1 }));
    fac.appendChild(h(`<div class="note" style="margin-top:12px">Intended tilts are Momentum, Quality and Value. Everything else is a residual and is hedged when it exceeds ±0.25.</div>`));
    g2.appendChild(fac);
    el.appendChild(g2);
    return el;
  };

  pages.execution = () => {
    const el = h(`<div class="page"></div>`);
    el.innerHTML = head("Execution", "Order management, fills and transaction-cost analysis. Only approved signals reach this stage.", `<button class="btn">Cancel working</button>`);
    const g = h(`<div class="grid g12"></div>`);
    g.innerHTML = `<div class="c3">${kpi("Broker link", `<span class="pos" style="font-size:20px">Connected</span>`, "IBKR Gateway · 41 ms · heartbeat 3s ago")}</div><div class="c3">${kpi("Today", "5 orders", "3 filled · 1 partial · 1 working")}</div><div class="c3">${kpi("Slippage vs arrival", "+0.1 bp", "30-day avg −0.6 bp (favourable)")}</div><div class="c3">${kpi("Commissions MTD", "$212.40", "0.02% NAV · budget 0.10%")}</div>`;
    el.appendChild(g);
    const tbl = h(`<div class="panel flush" style="margin-top:14px"><div class="panel-head"><h3>Orders · 2026-09-10</h3><span class="sub">demo</span></div><div class="scroll-x"><table><thead><tr><th>Time</th><th>Order</th><th>Symbol</th><th>Side</th><th class="num">Qty</th><th>Algo</th><th class="num">Limit</th><th class="num">Fill</th><th>Status</th><th class="num">Slip (bp)</th></tr></thead><tbody>
      ${M.orders.map(o => `<tr><td class="mono small">${o.t}</td><td class="mono small dim">${o.id}</td><td><b>${o.sym}</b></td><td><span class="tag ${o.side === "BUY" ? "long" : "short"}">${o.side}</span></td><td class="num">${o.qty}</td><td class="small dim">${o.algo}</td><td class="num">${o.lim.toFixed(2)}</td><td class="num">${o.fill ? o.fill.toFixed(2) : "—"}</td><td><span class="tag ${o.status === "FILLED" ? "" : "amber"}">${o.status}</span></td><td class="num ${o.slip === null ? "" : o.slip < 0 ? "pos" : "neg"}">${o.slip === null ? "—" : (o.slip > 0 ? "+" : "") + o.slip.toFixed(1)}</td></tr>`).join("")}
    </tbody></table></div></div>`);
    el.appendChild(tbl);
    const g2 = h(`<div class="grid g12" style="margin-top:14px"></div>`);
    const tca = h(`<div class="panel c6"><div class="panel-head"><h3>Fill quality by algo, 30 days</h3><span class="sub">bp vs arrival · negative = better than arrival</span></div></div>`);
    tca.appendChild(hbars([["Adaptive (< $25k)", -0.8, 214], ["VWAP 30m", 0.4, 38], ["MOC → Limit", -1.1, 22], ["Market (rule exits)", 2.3, 9]].map(([l, v, n]) => ({ label: l, value: v, color: v < 0 ? "var(--good)" : "var(--serious)", text: (v > 0 ? "+" : "") + v.toFixed(1) + " bp", tip: `${n} orders` })), { lw: 160, vw: 70, max: 3 }));
    g2.appendChild(tca);
    g2.appendChild(h(`<div class="panel c6"><div class="panel-head"><h3>Execution policy (v1)</h3></div><ul class="small dim" style="margin:0;padding-left:18px;line-height:1.8">
      <li>Approved signals are released at 09:20 ET; no orders in the first 5 minutes after the open.</li><li>Notional under $25k: IBKR Adaptive, urgency <i>patient</i>. Above: VWAP over 30 minutes.</li><li>Limit collar ±0.4% from arrival; unfilled remainder is re-priced twice, then cancelled and reported.</li><li>Short sales check locate again at submission time.</li><li>Every order, amendment, fill and cancel is written to the immutable audit log with the approving user and timestamp.</li></ul></div>`));
    el.appendChild(g2);
    return el;
  };

  pages.strategies = () => {
    const el = h(`<div class="page"></div>`);
    el.innerHTML = head("Strategies", "Each sleeve emits target weights, never orders. Capital budgets are set by risk parity across sleeves and tilted by the allocator within ±25%.", `<a class="btn" href="#/research">Research pipeline</a><a class="btn" href="#/settings">Enable instruments</a>`);
    const g = h(`<div class="grid g12"></div>`);
    M.sleeves.forEach(s => {
      const on = s.state === "LIVE" || (s.id === "FUT" && state.settings.futures);
      const st = s.id === "FUT" && state.settings.futures ? "ENABLED · awaiting first run" : s.state;
      const card = h(`<div class="panel c6" style="${on ? "" : "opacity:.6"}"><div class="panel-head"><h3><span class="sw" style="background:${s.color}"></span>${s.name} <span class="muted xs">· ${s.id}</span></h3><span class="tag ${on ? (s.state === "LIVE" ? "long" : "amber") : "off"}">${st}</span></div>
        <div class="small dim" style="margin-bottom:12px">${s.desc}</div>
        <div class="grid" style="grid-template-columns:repeat(5,1fr);gap:8px">
          ${[["Budget", s.alloc + "%"], ["Gross", (s.gross * 100).toFixed(0) + "%"], ["YTD", fmt.pct(s.ytd)], ["Sharpe live / BT", `${s.sharpeLive ?? "—"} / ${s.sharpeBT ?? "—"}`], ["Hold · turnover", `${s.hold}<br><span class="muted">${s.turnover}</span>`]].map(([l, v]) => `<div><div class="caps">${l}</div><div class="mono" style="font-size:13px;margin-top:3px">${v}</div></div>`).join("")}
        </div>
        ${s.sharpeLive ? `<div class="conf small" style="display:flex;align-items:center;gap:8px;margin-top:12px;color:var(--ink-3)">Live vs backtest health <div class="bar"><i class="${s.sharpeLive / s.sharpeBT > 0.8 ? "good" : "bad"}" style="width:${Math.min(100, (s.sharpeLive / s.sharpeBT) * 100)}%"></i></div><span class="mono">${((s.sharpeLive / s.sharpeBT) * 100).toFixed(0)}%</span></div>` : ""}
      </div>`);
      g.appendChild(card);
    });
    el.appendChild(g);
    const hm = h(`<div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Sleeve return correlation, 12 months</h3><span class="sub">daily returns · lower is better for the book</span></div></div>`);
    const ids = M.sleeves.filter(s => s.state === "LIVE").map(s => s.id);
    const corr = [[1, .21, -.08, .05, .18, .12], [.21, 1, .02, .09, .14, .06], [-.08, .02, 1, .11, -.04, -.02], [.05, .09, .11, 1, .07, .03], [.18, .14, -.04, .07, 1, .08], [.12, .06, -.02, .03, .08, 1]];
    const grid = h(`<div class="hm" style="grid-template-columns:70px repeat(${ids.length},1fr)"></div>`);
    grid.appendChild(h(`<div class="lbl"></div>`)); ids.forEach(i => grid.appendChild(h(`<div class="lbl" style="justify-content:center">${i}</div>`)));
    ids.forEach((r, i) => { grid.appendChild(h(`<div class="lbl">${r}</div>`)); ids.forEach((c, j) => { const v = corr[i][j]; const cell = h(`<div style="background:${i === j ? "var(--line)" : seqColor((v + 0.3) / 1.3)}">${v.toFixed(2)}</div>`); cell.addEventListener("mousemove", e => showTip(e, `${r} × ${c}: ${v.toFixed(2)}`)); cell.addEventListener("mouseleave", hideTip); grid.appendChild(cell); }); });
    hm.appendChild(grid); el.appendChild(hm);
    return el;
  };

  pages.research = () => {
    const el = h(`<div class="page"></div>`);
    el.innerHTML = head("Research", "Every strategy passes the same gate before it can touch capital: hypothesis → backtest → walk-forward → paper → probation → live.", `<button class="btn primary">New hypothesis</button>`);
    el.appendChild(h(`<div class="steps" style="margin-bottom:14px">
      <div class="step"><b>Hypothesis</b><span>Economic rationale written first. Why does the edge exist, who is on the other side?</span></div>
      <div class="step"><b>Backtest</b><span>Point-in-time data, survivorship-free universe, realistic costs and borrow. No parameter search on the full sample.</span></div>
      <div class="step"><b>Walk-forward</b><span>Rolling 3y train / 1y test. Deflated Sharpe and PBO to correct for multiple testing.</span></div>
      <div class="step"><b>Paper</b><span>≥ 60 trading days shadow trading through the real pipeline and broker sandbox.</span></div>
      <div class="step"><b>Probation</b><span>Live at half budget. Promoted when live results track backtest within tolerance.</span></div>
      <div class="step"><b>Live / retire</b><span>Full budget. Persistent drift moves a sleeve back to probation, then retirement.</span></div></div>`));
    const tbl = h(`<div class="panel flush"><div class="panel-head"><h3>Pipeline</h3><span class="sub">demo</span></div><div class="scroll-x"><table><thead><tr><th>ID</th><th>Candidate</th><th>Stage</th><th class="num">WF Sharpe</th><th class="num">Max DD</th><th class="num">Trades</th><th>Verdict</th><th style="width:160px">Progress</th></tr></thead><tbody>
      ${M.research.map(r => `<tr><td class="mono small dim">${r.id}</td><td>${r.name}</td><td><span class="tag">${r.stage}</span></td><td class="num">${r.sharpe ?? "—"}</td><td class="num ${r.dd ? "neg" : ""}">${r.dd ? fmt.pct(r.dd) : "—"}</td><td class="num">${r.trades ? fmt.n(r.trades) : "—"}</td><td class="small">${r.verdict}</td><td><div class="bar"><i class="blue" style="width:${r.pct}%"></i></div></td></tr>`).join("")}
    </tbody></table></div></div>`);
    el.appendChild(tbl);
    const g2 = h(`<div class="grid g12" style="margin-top:14px"></div>`);
    const wf = h(`<div class="panel c7"><div class="panel-head"><h3>R-117 · walk-forward equity (out-of-sample only)</h3><span class="sub">stitched test windows</span></div></div>`);
    let acc = 100; const wfd = M.nav.map((p, i) => { acc *= 1 + ((p.v / (M.nav[i - 1]?.v || p.v)) - 1) * 0.9 + 0.0002; return acc; });
    wf.appendChild(lineChart([{ name: "OOS equity", data: wfd, color: "var(--s7)", area: true }], { labels, fmtY: v => v.toFixed(0), fmtV: v => v.toFixed(1) }));
    g2.appendChild(wf);
    g2.appendChild(h(`<div class="panel c5"><div class="panel-head"><h3>Anti-overfitting controls</h3></div><ul class="small dim" style="margin:0;padding-left:18px;line-height:1.8">
      <li><b>Deflated Sharpe ratio</b> accounts for the number of trials run.</li><li><b>Probability of backtest overfitting</b> (CSCV) must be below 0.2.</li><li><b>Parameter plateaus</b>, not peaks: neighbours within ±20% must also work.</li><li><b>Costs modelled</b>: commission, half-spread, impact by ADV, borrow fee, and financing.</li><li><b>Point-in-time fundamentals</b> and delisted names retained.</li><li>Research code and live code share the same signal library, so what was tested is what trades.</li></ul></div>`));
    el.appendChild(g2);
    return el;
  };

  pages.ai = () => {
    const el = h(`<div class="page"></div>`);
    el.innerHTML = head(`AI &amp; regime <em>· ${pendingChanges()} proposals</em>`, "Four advisory components. Each proposes; the rules engine and you dispose. No AI output can place an order or loosen a hard limit.", `<button class="btn">Retrain schedule</button>`);
    const g = h(`<div class="grid g12"></div>`);
    const rg = h(`<div class="panel c4"><div class="panel-head"><h3>Regime detector</h3><span class="sub">Hidden Markov model · 4 states</span></div><div class="hero-n" style="font-size:26px;margin-bottom:8px">${M.regime.label}</div></div>`);
    rg.appendChild(hbars(Object.entries(M.regime.probs).map(([k, v], i) => ({ label: k, value: v, color: i === 0 ? "var(--s1)" : "var(--ink-4)", text: (v * 100).toFixed(0) + "%" })), { lw: 120, vw: 50, max: 1 }));
    rg.appendChild(h(`<div class="small dim" style="margin-top:10px">Inputs: SPY 20/60d vol, VIX term slope, cross-sectional dispersion, average pairwise correlation, breadth, credit spread change. Output feeds exposure scaling (${M.regime.exposureScale.toFixed(2)}×) and sleeve tilts.</div>`));
    g.appendChild(rg);
    g.appendChild(h(`<div class="panel c4"><div class="panel-head"><h3>Meta-labeler</h3><span class="sub">Gradient boosting · retrained monthly, walk-forward</span></div>
      <div class="grid" style="grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">${[["AUC (OOS)", "0.64"], ["Calibration error", "2.1%"], ["Signals scored tonight", "61"], ["Filtered out", "38"]].map(([l, v]) => `<div><div class="caps">${l}</div><div class="mono" style="font-size:18px;margin-top:3px">${v}</div></div>`).join("")}</div>
      <div class="small dim">Predicts P(profit | signal features, regime). Used for sizing (confidence × base weight) and to drop signals below 0.55. Features: signal strength, rank stability, sleeve recent hit-rate, regime state, liquidity, earnings proximity, borrow fee.</div></div>`));
    const al = h(`<div class="panel c4"><div class="panel-head"><h3>Sleeve allocator</h3><span class="sub">Risk parity base · Thompson-sampling tilt, capped ±25%</span></div></div>`);
    al.appendChild(hbars(M.sleeves.filter(s => s.state === "LIVE").map(s => ({ label: s.id, value: s.alloc, color: s.color, text: s.alloc + "%", tip: `Base ${(s.alloc / 1.05).toFixed(0)}% · tilt ${s.id === "PEAD" ? "−3" : s.id === "STMR" ? "+2" : "+1"}%` })), { lw: 70, vw: 50, max: 30 }));
    al.appendChild(h(`<div class="small dim" style="margin-top:10px">Weekly rebalance proposal goes to the approval queue. Sleeves under probation are capped at half base.</div>`));
    g.appendChild(al);
    el.appendChild(g);
    const q = h(`<div class="panel flush" style="margin-top:14px"><div class="panel-head"><h3>Model change queue</h3><span class="sub">parameter and allocation changes require the same approval as trades</span></div><div class="scroll-x"><table><thead><tr><th>ID</th><th>Type</th><th>Target</th><th class="num">From</th><th class="num">To</th><th>Reason</th><th>Source</th><th>Decision</th></tr></thead><tbody id="chg"></tbody></table></div></div>`);
    const tb = $("#chg", q);
    state.changes.forEach(c => {
      const tr = h(`<tr><td class="mono small dim">${c.id}</td><td><span class="tag">${c.type}</span></td><td>${c.target}</td><td class="num">${c.from}</td><td class="num">${c.to}</td><td class="small dim" style="max-width:360px">${c.reason}</td><td class="small dim">${c.src}</td><td>${c.state === "PENDING" ? `<button class="btn sm good" data-a="APPROVED">Approve</button> <button class="btn sm bad" data-a="REJECTED">Reject</button>` : `<span class="tag ${c.state.startsWith("APPROVED") ? "long" : "off"}">${c.state}</span>`}</td></tr>`);
      tr.querySelectorAll("button").forEach(b => b.addEventListener("click", () => { c.state = b.dataset.a + " 09-10"; toast(`${c.id} ${b.dataset.a.toLowerCase()}. ${b.dataset.a === "APPROVED" ? "Applies from tomorrow's run; versioned as config v128." : "Logged."}`, b.dataset.a === "APPROVED" ? "good" : ""); route(); }));
      tb.appendChild(tr);
    });
    el.appendChild(q);
    el.appendChild(h(`<div class="panel" style="margin-top:14px"><div class="panel-head"><h3>Daily post-mortem · 2026-09-10</h3><span class="sub">LLM agent (Claude) · reads fills, P&L, news, filings · cannot trade</span></div>
      <div class="doc"><p><b>What worked.</b> Momentum longs in semis and energy contributed +$4.1k; the IWM hedge cost −$1.3k as small caps rallied, which is the intended behaviour of the hedge in an up-tape.</p>
      <p><b>What did not.</b> INTC short lost −$1.1k on a rumour-driven squeeze. Short-interest was 2.3%, below the squeeze screen; no rule was breached. Flagging that the squeeze screen does not use options-implied borrow demand — proposal M-043 will test adding it.</p>
      <p><b>Event risk on open positions.</b> COST reports in 14 sessions, inside the QV holding window; the sleeve's earnings-hold policy allows it (quality names are held through prints). LLY: FDA advisory panel on 09-24, no action required but exposure noted.</p>
      <p><b>Drift monitor.</b> PEAD live/backtest divergence z = −1.7 (threshold −2.0). Allocation reduction proposed (M-042). STMR entry-threshold tightening proposed (M-041).</p></div></div>`));
    return el;
  };

  pages.settings = () => {
    const el = h(`<div class="page"></div>`); const S = state.settings;
    el.innerHTML = head("Settings", "Feature flags, instrument classes, approval policy and limits. Every change is versioned and shown in the audit log.");
    const g = h(`<div class="grid g12"></div>`);
    const tg = (key, l, d, opts = {}) => { const t = h(`<div class="setting"><div><div class="l">${l}</div><div class="d">${d}</div></div><label class="toggle ${S[key] ? "on" : ""}"><span class="sw2"></span><span class="mono xs">${S[key] ? "ON" : "OFF"}</span></label></div>`); if (opts.locked) { $(".toggle", t).style.opacity = .4; $(".toggle", t).style.cursor = "not-allowed"; } else $(".toggle", t).addEventListener("click", () => { S[key] = !S[key]; toast(`${l}: ${S[key] ? "enabled" : "disabled"}. Config v${129 + Math.floor(Math.random() * 9)} saved.`, S[key] ? "good" : ""); renderShell(); route(); }); return t; };
    const inst = h(`<div class="panel c6"><div class="panel-head"><h3>Instrument classes</h3><span class="sub">toggle sleeves by asset class</span></div></div>`);
    inst.appendChild(tg("equities", "US equities", "Core long/short universe · ~1,500 names · IBKR"));
    inst.appendChild(tg("etfs", "ETFs", "Cross-asset trend sleeve and beta hedge"));
    inst.appendChild(tg("futures", "Futures (micro)", "Enables the FUT sleeve on MES/MNQ/MGC/MCL/ZN. Migrates MACRO exposures to futures. Adds exchange + data fees (~$40–90/mo)."));
    inst.appendChild(tg("options", "Options", "Volatility risk premium sleeve · requires options approval level 3 and a TastyTrade adapter (planned)", { locked: true }));
    g.appendChild(inst);
    const br = h(`<div class="panel c6"><div class="panel-head"><h3>Brokers</h3><span class="sub">one adapter interface, many brokers</span></div>
      <div class="setting"><div><div class="l">Interactive Brokers <span class="tag long" style="margin-left:6px">CONNECTED</span></div><div class="d">Account ${M.account.id} · Gateway 10.30 · paper trading</div></div><select><option>Paper</option><option>Live</option></select></div>
      <div class="setting"><div><div class="l">TastyTrade <span class="tag off" style="margin-left:6px">PLANNED</span></div><div class="d">Options and futures · open API + DXLink</div></div><button class="btn sm" disabled>Connect</button></div>
      <div class="setting"><div><div class="l">Schwab / thinkorswim <span class="tag off" style="margin-left:6px">PLANNED</span></div><div class="d">Equities and options · Trader API</div></div><button class="btn sm" disabled>Connect</button></div>
      <div class="setting"><div><div class="l">Robinhood <span class="tag off" style="margin-left:6px">NOT SUPPORTED</span></div><div class="d">No official equities trading API</div></div><span class="muted xs">—</span></div></div>`);
    g.appendChild(br);
    const ap = h(`<div class="panel c6"><div class="panel-head"><h3>Approval policy</h3></div></div>`);
    ap.appendChild(h(`<div class="setting"><div><div class="l">Signal expiry</div><div class="d">Unapproved signals are discarded and logged</div></div><select><option>Next open</option><option>End of next day</option><option>48 hours</option></select></div>`));
    ap.appendChild(tg("autoStops", "Pre-approved protective stops", "Allow rule-based stop-loss exits to fire without a click. Shown on every affected signal card."));
    ap.appendChild(h(`<div class="setting"><div><div class="l">Notifications</div><div class="d">When the queue is published and when fills complete</div></div><select><option>Telegram + email</option><option>Email</option><option>None</option></select></div>`));
    g.appendChild(ap);
    const lm = h(`<div class="panel c6"><div class="panel-head"><h3>Hard limits</h3><span class="sub">enforced by the rules engine · AI cannot loosen</span></div></div>`);
    [["Gross exposure", "200%"], ["Net exposure", "±20%"], ["Portfolio beta", "±0.20"], ["Single name", "8% NAV"], ["Sector net", "15% NAV"], ["Vol target / cap", "10% / 12%"], ["Drawdown breaker / halt", "−10% / −15%"], ["Max borrow fee", "3.0%"], ["Max position vs ADV", "2%"]].forEach(([l, v]) => lm.appendChild(h(`<div class="setting" style="padding:8px 0"><div class="l">${l}</div><input type="text" value="${v}" style="width:110px;text-align:right"/></div>`)));
    g.appendChild(lm);
    el.appendChild(g);
    return el;
  };

  pages.info = () => {
    const el = h(`<div class="page"><div class="doc" id="doc"></div></div>`);
    $("#doc", el).innerHTML = head("System information", "How Meridian works end to end: the investment process, the strategy book, the daily workflow, the AI layer and the engineering standard.") + window.INFO_HTML;
    return el;
  };

  pages.faq = () => {
    const el = h(`<div class="page"><div class="doc faq" id="faq"></div></div>`);
    const cats = [...new Set(M.faq.map(f => f.c))];
    $("#faq", el).innerHTML = head("Frequently asked questions", "Short answers on control, strategies, AI, brokers and infrastructure.") +
      cats.map(c => `<div class="cat">${c}</div>` + M.faq.filter(f => f.c === c).map(f => `<details><summary>${f.q}</summary><div class="a">${f.a}</div></details>`).join("")).join("");
    return el;
  };

  // ---------- router ----------
  function route() {
    const raw = location.hash.replace(/^#\/?/, "") || "dashboard";
    const [r, anchor] = raw.split("?")[0].split("#");
    const page = pages[r] || pages.dashboard;
    const view = $("#view"); view.innerHTML = ""; view.appendChild(page());
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.dataset.r === r));
    updateBadges(); hideTip();
    const target = anchor && document.getElementById(anchor);
    if (target) target.scrollIntoView({ block: "start" }); else window.scrollTo(0, 0);
  }
  window.addEventListener("hashchange", route);
  document.addEventListener("keydown", (e) => { if (e.target.tagName === "INPUT" || e.target.tagName === "SELECT") return; const m = { 1: "dashboard", 2: "signals", 3: "portfolio", 4: "risk", 5: "execution", 6: "strategies", 7: "research", 8: "ai", 9: "settings", i: "info", f: "faq" }[e.key.toLowerCase()]; if (m) location.hash = "#/" + m; });
  renderShell(); route();
})();

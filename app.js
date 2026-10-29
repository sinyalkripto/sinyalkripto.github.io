import {
  CONFIG, INTERVAL_MS, analyze, attempts, baseAsset, dataSource, ema, candleLimit, fetchKlines, fetchTickers, rsi, sides, topSymbols, tradeUrl, usesFilter,
} from "./engine.js?v=4";
import { startGlobe } from "./globe.js?v=3";

const $ = (s) => document.querySelector(s);
const TFS = CONFIG.TIMEFRAMES;
// 1s hanya dimuat untuk koin yang sedang dibuka (diperbarui tiap 2 detik), bukan untuk semua koin.
const SOLO_TF = "1s";
const TF_LABEL = { "1s": "1dt", "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1j", "4h": "4j" };
const S = {
  symbols: [], info: {}, data: {}, res: {}, prices: {}, prevPrices: {},
  sel: "BTCUSDT", tf: "1h", ind: { ema: true, bb: false, vol: true, rsi: true, macd: true },
  sigTf: "all", sigSide: "all", showAllPos: false, loadErr: {},
};

// ---------- Format ----------
const nf = (d) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
function decimals(p) {
  if (p >= 100) return 2;
  if (p >= 1) return 4;
  return Math.min(8, Math.max(4, 3 - Math.floor(Math.log10(p)) + 1));
}
const fmtPrice = (p) => (p == null || Number.isNaN(p) ? "–" : nf(decimals(Math.abs(p) || 1)).format(p));
const fmtPct = (x, d = 2) => (x > 0 ? "+" : x < 0 ? "−" : "") + nf(d).format(Math.abs(x)) + "%";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
function wib(ms) {
  const d = new Date(ms + 7 * 3600e3);
  return { day: d.getUTCDate(), mon: MONTHS[d.getUTCMonth()], hh: String(d.getUTCHours()).padStart(2, "0"), mm: String(d.getUTCMinutes()).padStart(2, "0") };
}
const fmtTime = (ms) => { const w = wib(ms); return `${w.day} ${w.mon}, ${w.hh}:${w.mm}`; };
const fmtClock = (ms) => { const w = wib(ms); return `${w.hh}:${w.mm}`; };
function fmtDur(ms) {
  if (ms < 6e4) return `${Math.round(ms / 1000)} detik`;
  const m = ms / 6e4;
  if (m < 90) return `${Math.round(m)} menit`;
  const h = m / 60;
  if (h < 36) return `${nf(h < 10 ? 1 : 0).format(h)} jam`.replace(",0 ", " ");
  return `${nf(1).format(h / 24)} hari`.replace(",0 ", " ");
}
function fmtCountdown(ms) {
  const s = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return (h ? `${h}:` + String(m).padStart(2, "0") : m) + ":" + String(x).padStart(2, "0");
}
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

function logo(symbol, cls = "") {
  const b = baseAsset(symbol);
  return `<img class="logo ${cls}" alt="" loading="lazy" src="https://s3-symbol-logo.tradingview.com/crypto/XTVC${b}.svg" data-fb="${esc(b.slice(0, 3))}">`;
}
document.addEventListener("error", (e) => {
  const img = e.target;
  if (img.tagName !== "IMG" || !img.dataset.fb) return;
  const span = document.createElement("span");
  span.className = img.className + " logo-fb";
  span.textContent = img.dataset.fb;
  img.replaceWith(span);
}, true);

// ---------- Tema ----------
let mode = "auto";
try { mode = localStorage.getItem("theme") || "auto"; } catch (e) {}
const currentTheme = () => document.documentElement.getAttribute("data-theme");
function applyTheme() {
  const h = new Date().getHours();
  const t = mode === "auto" ? (h >= 6 && h < 18 ? "light" : "dark") : mode;
  if (t !== currentTheme()) {
    document.documentElement.setAttribute("data-theme", t);
    document.querySelector('meta[name="theme-color"]').content = t === "dark" ? "#000000" : "#FFFFFF";
    styleCharts();
    renderAnalysis();
  }
  document.querySelectorAll(".theme-switch button").forEach((b) => b.classList.toggle("on", b.dataset.mode === mode));
}
document.querySelectorAll(".theme-switch button").forEach((b) => b.addEventListener("click", () => {
  mode = b.dataset.mode;
  try { localStorage.setItem("theme", mode); } catch (e) {}
  applyTheme();
}));
setInterval(applyTheme, 60e3);

// ---------- Splash, nav, reveal ----------
const splashStart = performance.now();
let splashDone = false;
function splashProgress(pct, text) {
  $("#splash-bar").style.width = pct + "%";
  if (text) $("#splash-status").textContent = text;
}
function hideSplash() {
  if (splashDone) return;
  splashDone = true;
  $("#splash").classList.add("hide");
  setTimeout(() => $("#splash").remove(), 1000);
}
function maybeHideSplash(ready) {
  const t = performance.now() - splashStart;
  const min = matchMedia("(prefers-reduced-motion: reduce)").matches ? 800 : 3200;
  if (ready && t >= min) hideSplash();
  else if (ready) setTimeout(hideSplash, min - t);
}
setTimeout(hideSplash, 5000);
$("#skip").addEventListener("click", hideSplash);
addEventListener("keydown", (e) => { if (!splashDone && (e.key === "Enter" || e.key === "Escape")) hideSplash(); });

addEventListener("scroll", () => $("#nav").classList.toggle("solid", scrollY > 40), { passive: true });
const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("shown"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
const observeReveals = (root = document) => root.querySelectorAll(".reveal:not(.shown)").forEach((el) => io.observe(el));
observeReveals();

startGlobe($("#globe"), currentTheme);
applyTheme();
setInterval(() => { $("#clock").textContent = `Live · ${fmtClock(Date.now())}:${String(new Date().getSeconds()).padStart(2, "0")} WIB`; renderTimebar(); }, 1000);

// ---------- Data ----------
async function pool(tasks, n) {
  let i = 0;
  const run = async () => { while (i < tasks.length) { const t = tasks[i++]; try { await t(); } catch (e) { console.warn(e); } } };
  await Promise.all(Array.from({ length: n }, run));
}

function compute(sym, tf) {
  const d = S.data[sym]?.[tf];
  if (!d) return;
  const trend = usesFilter(tf) ? S.data[sym]?.[CONFIG.TREND_FILTER]?.closed : null;
  if (usesFilter(tf) && !trend) return;
  S.res[sym] ??= {};
  S.res[sym][tf] = analyze(sym, tf, d.closed, trend);
}

async function load(sym, tf) {
  const k = await fetchKlines(sym, tf, candleLimit(tf));
  S.data[sym] ??= {};
  S.data[sym][tf] = k;
  if (tf === CONFIG.TREND_FILTER) TFS.forEach((t) => compute(sym, t));
  else compute(sym, tf);
}

let renderQueued = false;
function scheduleRender() {
  if (renderQueued) return;
  renderQueued = true;
  setTimeout(() => { renderQueued = false; renderAll(); }, 400);
}
function renderAll() {
  renderKpis(); renderPositions(); renderSignals(); renderBacktest();
  if (S.res[S.sel]?.[S.tf]) { renderChart(); renderAnalysis(); }
}

async function init() {
  try {
    splashProgress(12, "Menghubungkan ke Binance…");
    S.symbols = await topSymbols(CONFIG.TOP_COINS);
    S.symbols.forEach((s) => { S.info[s.symbol] = s; S.prices[s.symbol] = s.price; });
    if (!S.info[S.sel]) S.sel = S.symbols[0].symbol;
    renderCoins();
    if (dataSource() === "spot") {
      $("#pasar .section-sub").textContent = "Binance Futures tidak bisa diakses dari jaringan Anda, jadi harga diambil dari Binance Spot (selisihnya biasanya sangat kecil). Klik koin untuk membuka grafiknya.";
    }
    splashProgress(30, `Membaca harga ${S.symbols.length} koin…`);
    let done = 0;
    const first = [];
    for (const { symbol } of S.symbols) {
      first.push(async () => { await load(symbol, "4h"); await load(symbol, "1h"); done++; splashProgress(30 + done / S.symbols.length * 60, "Menghitung sinyal…"); scheduleRender(); });
    }
    await pool(first, 5);
    splashProgress(100, "Siap");
    maybeHideSplash(true);
    renderAll();
    const rest = [];
    for (const tf of ["30m", "15m", "5m", "3m", "1m"]) for (const { symbol } of S.symbols) rest.push(async () => { await load(symbol, tf); scheduleRender(); });
    await pool(rest, 4);
    renderAll();
    startLive();
  } catch (e) {
    console.error(e);
    hideSplash();
    const msg = `Data Binance tidak bisa diambil (${esc(e.message)}). Kemungkinan jaringan atau ekstensi browser Anda (misalnya pemblokir iklan) memblokir Binance. Coba nonaktifkan ekstensi itu untuk situs ini, pakai jaringan lain, lalu muat ulang halaman.`;
    $("#coins").innerHTML = `<p class="disclaimer">${msg}</p>`;
    $("#chart-title").innerHTML = `<p class="disclaimer" style="margin:0">${msg}</p>`;
    $("#hs-btc").textContent = "tidak tersedia";
  }
}

// ---------- Live ----------
const lastClose = {};
function startLive() {
  TFS.forEach((tf) => { lastClose[tf] = Math.floor(Date.now() / INTERVAL_MS[tf]); });
  // Candle 1 detik: hanya koin yang sedang dibuka di grafik.
  let soloBusy = false;
  setInterval(async () => {
    if (S.tf !== SOLO_TF || soloBusy || document.hidden) return;
    soloBusy = true;
    try { await load(S.sel, SOLO_TF); renderAll(); } catch (e) { console.warn(e); } finally { soloBusy = false; }
  }, 2000);
  setInterval(async () => {
    try {
      const t = await fetchTickers();
      S.prevPrices = { ...S.prices };
      for (const x of t) if (S.info[x.symbol]) S.prices[x.symbol] = +x.price;
      updateLive();
    } catch (e) { console.warn(e); }
  }, 2000);
  setInterval(async () => {
    try {
      const fresh = await topSymbols(60);
      for (const f of fresh) if (S.info[f.symbol]) S.info[f.symbol].change = f.change;
    } catch (e) { console.warn(e); }
  }, 60e3);
  // Ambil ulang candle saat sebuah timeframe tutup (sinyal baru hanya muncul di saat itu).
  setInterval(async () => {
    const changed = TFS.filter((tf) => tf !== SOLO_TF && Math.floor((Date.now() - 4000) / INTERVAL_MS[tf]) !== lastClose[tf]);
    if (!changed.length) return;
    changed.forEach((tf) => { lastClose[tf] = Math.floor((Date.now() - 4000) / INTERVAL_MS[tf]); });
    const order = changed.includes("4h") ? ["4h", ...changed.filter((t) => t !== "4h")] : changed;
    const tasks = [];
    for (const tf of order) for (const { symbol } of S.symbols) tasks.push(() => load(symbol, tf));
    await pool(tasks, 4);
    renderAll();
  }, 5000);
}

function updateLive() {
  for (const { symbol } of S.symbols) {
    const el = document.querySelector(`[data-coin="${symbol}"]`);
    if (!el) continue;
    const p = S.prices[symbol], prev = S.prevPrices[symbol];
    const pe = el.querySelector(".price");
    pe.textContent = fmtPrice(p);
    if (prev && p !== prev) {
      pe.classList.remove("flash-up", "flash-down"); void pe.offsetWidth;
      pe.classList.add(p > prev ? "flash-up" : "flash-down");
      setTimeout(() => pe.classList.remove("flash-up", "flash-down"), 700);
    }
    const ch = S.info[symbol].change;
    const pill = el.querySelector(".pill");
    pill.className = "pill " + (ch >= 0 ? "up" : "down");
    pill.textContent = (ch >= 0 ? "▲ " : "▼ ") + nf(2).format(Math.abs(ch)) + "%";
  }
  if (S.prices.BTCUSDT) $("#hs-btc").textContent = "$" + fmtPrice(S.prices.BTCUSDT);
  updateChartLive();
  renderPositions();
}

// ---------- Kartu koin ----------
function renderCoins() {
  $("#coins").innerHTML = S.symbols.map(({ symbol }) => {
    const ch = S.info[symbol].change;
    return `<button type="button" class="coin reveal" data-coin="${symbol}">
      <span class="coin-head">${logo(symbol)}<span style="display:flex;flex-direction:column"><b>${esc(baseAsset(symbol))}</b><span class="muted" style="font-size:12px">${esc(symbol)}</span></span></span>
      <span class="coin-row"><span class="price">${fmtPrice(S.prices[symbol])}</span><span class="pill ${ch >= 0 ? "up" : "down"}">${ch >= 0 ? "▲" : "▼"} ${nf(2).format(Math.abs(ch))}%</span></span>
    </button>`;
  }).join("");
  $("#coins").querySelectorAll(".coin").forEach((b, i) => {
    b.style.transitionDelay = (i % 6) * 60 + "ms";
    b.addEventListener("click", () => { selectCoin(b.dataset.coin); $("#grafik").scrollIntoView({ behavior: "smooth" }); });
  });
  markSelected();
  observeReveals($("#coins"));
  if (S.prices.BTCUSDT) $("#hs-btc").textContent = "$" + fmtPrice(S.prices.BTCUSDT);
}
const markSelected = () => document.querySelectorAll(".coin").forEach((b) => b.classList.toggle("sel", b.dataset.coin === S.sel));

async function selectCoin(sym, tf = S.tf) {
  S.sel = sym; S.tf = tf;
  markSelected();
  delete S.loadErr[sym + tf];
  if (!S.res[sym]?.[tf] || tf === SOLO_TF) {
    try {
      if (!S.data[sym]?.["4h"]) await load(sym, "4h");
      if (!S.data[sym]?.[tf] || tf === SOLO_TF) await load(sym, tf);
    } catch (e) { console.warn(e); S.loadErr[sym + tf] = e.message; }
  }
  renderChart(true); renderAnalysis();
}

// ---------- Posisi & sinyal ----------
const timingCache = {};
function timingFor(sym, tf, side) {
  const own = S.res[sym]?.[tf]?.sides[side]?.timing;
  if (own && own.samples >= 5) return { ...own, scope: "koin" };
  const key = tf + side;
  if (!timingCache[key] || timingCache[key].at < Date.now() - 60e3) {
    const all = [];
    let tp = 0, total = 0;
    for (const s of Object.keys(S.res)) {
      const r = S.res[s][tf]?.sides[side];
      if (!r) continue;
      for (const t of r.closed) if (t.result === "TP") all.push((t.hitFrom + t.hitTo) / 2 - t.entryTime);
      tp += r.timing.samples; total += r.timing.total;
    }
    all.sort((a, b) => a - b);
    const q = (p) => (all.length ? all[Math.floor((all.length - 1) * p)] : NaN);
    timingCache[key] = { at: Date.now(), v: { samples: all.length, total, tpRate: total ? tp / total * 100 : NaN, median: q(.5), p25: q(.25), p75: q(.75), p90: q(.9), scope: "semua koin" } };
  }
  return timingCache[key].v;
}

function entryStatus(pos, tf, atrAtEntry, price) {
  const until = pos.entryTime + INTERVAL_MS[tf];
  const now = Date.now();
  if (now < until) return { cls: "ok", text: `Berlaku s/d ${fmtClock(until)} WIB · ${fmtCountdown(until - now)} lagi` };
  if (Math.abs(price - pos.entry) <= atrAtEntry * 0.5) return { cls: "warn", text: "Lewat jam masuk · harga masih dekat harga masuk" };
  return { cls: "bad", text: "Kedaluwarsa · harga sudah jauh, jangan dikejar" };
}

function allTrades() {
  const out = [];
  for (const sym of Object.keys(S.res)) for (const tf of TFS) {
    const r = S.res[sym][tf];
    if (!r) continue;
    const atrAt = new Map(r.rows.map((x) => [x.time + INTERVAL_MS[tf], x.atr]));
    for (const side of sides()) {
      const sd = r.sides[side];
      for (const t of sd.closed) out.push({ ...t, sym, tf, atr: atrAt.get(t.entryTime) });
      if (sd.open) out.push({ ...sd.open, sym, tf, open: true, atr: atrAt.get(sd.open.entryTime) });
    }
  }
  return out.sort((a, b) => b.entryTime - a.entryTime);
}

function liveHit(t) {
  const live = S.data[t.sym]?.[t.tf]?.live;
  const p = S.prices[t.sym] ?? live?.close;
  if (!live) return null;
  const hi = Math.max(live.high, p), lo = Math.min(live.low, p);
  const long = t.side === "LONG";
  if (long ? lo <= t.sl : hi >= t.sl) return "SL";
  if (long ? hi >= t.tp : lo <= t.tp) return "TP";
  return null;
}

function renderKpis() {
  const trades = allTrades(), now = Date.now();
  const sig24 = trades.filter((t) => now - t.entryTime < 864e5);
  const open = trades.filter((t) => t.open);
  const wk = trades.filter((t) => !t.open && now - t.hitFrom < 7 * 864e5);
  $("#k-sig").textContent = sig24.length;
  $("#k-sig-l").textContent = `Sinyal 24 jam · ${sig24.filter((t) => t.side === "LONG").length} long, ${sig24.filter((t) => t.side === "SHORT").length} short`;
  $("#k-pos").textContent = open.length;
  $("#k-tp").textContent = wk.filter((t) => t.result === "TP").length;
  $("#k-sl").textContent = wk.filter((t) => t.result === "SL").length;
  $("#hs-pos").textContent = open.length;
  $("#hs-sig").textContent = sig24.length;
}

function tpEstimate(t) {
  const tm = timingFor(t.sym, t.tf, t.side === "LONG" ? "long" : "short");
  if (!tm.samples) return null;
  const now = Date.now();
  return {
    at: t.entryTime + tm.median, lo: t.entryTime + tm.p25, hi: t.entryTime + tm.p75,
    overdue: now > t.entryTime + tm.p90, tm,
  };
}

let lastPosHtml = "";
function renderPositions() {
  const open = allTrades().filter((t) => t.open);
  if (!open.length) { $("#positions").innerHTML = `<p class="empty">${Object.keys(S.res).length ? "Belum ada posisi terbuka." : "Memuat…"}</p>`; return; }
  const list = S.showAllPos ? open : open.slice(0, 10);
  const html = list.map((t) => {
    const p = S.prices[t.sym] ?? t.entry;
    const long = t.side === "LONG";
    const pnl = (long ? p / t.entry - 1 : 1 - p / t.entry) * 100;
    const toTp = Math.max(0, Math.min(1, (p - t.entry) / (t.tp - t.entry)));
    const toSl = Math.max(0, Math.min(1, (p - t.entry) / (t.sl - t.entry)));
    const prog = pnl >= 0 ? { w: toTp, c: "var(--up)", n: `${Math.round(toTp * 100)}% menuju take profit` } : { w: toSl, c: "var(--down)", n: `${Math.round(toSl * 100)}% menuju stop loss` };
    const hit = liveHit(t);
    const st = hit ? { cls: hit === "TP" ? "ok" : "bad", text: hit === "TP" ? `Kena TP sekitar ${fmtClock(Date.now())} WIB` : `Kena SL sekitar ${fmtClock(Date.now())} WIB` } : entryStatus(t, t.tf, t.atr ?? 0, p);
    const est = tpEstimate(t);
    const estTxt = est ? `Perkiraan kena TP ± ${fmtTime(est.at)} WIB (biasanya ${fmtClock(est.lo)}–${fmtClock(est.hi)}) · ${fmtDur(est.tm.median)} setelah masuk${est.overdue ? ' · <span class="tag warn">lewat perkiraan waktu</span>' : ""}` : "Perkiraan TP belum tersedia";
    return `<div class="pos">
      <div class="pos-top">
        <div class="pos-id">${logo(t.sym)}<b style="font-size:17px">${esc(baseAsset(t.sym))}</b><span class="side ${t.side}">${t.side}</span><span class="muted" style="font-size:13px">${TF_LABEL[t.tf]}</span></div>
        <div class="pos-right"><span style="font-size:17px">${fmtPrice(p)}</span><span class="pnl ${pnl >= 0 ? "up" : "down"}">${fmtPct(pnl)}</span><a class="trade" href="${tradeUrl(t.sym)}" target="_blank" rel="noopener">Buka di Binance ↗</a></div>
      </div>
      <div class="bar"><i style="width:${prog.w * 100}%;background:${prog.c}"></i></div>
      <div class="pos-meta"><span>Masuk ${fmtTime(t.entryTime)} WIB di ${fmtPrice(t.entry)} · SL ${fmtPrice(t.sl)} · TP ${fmtPrice(t.tp)}</span><span class="tag ${st.cls}">${st.text}</span></div>
      <div class="pos-meta"><span>${estTxt}</span><span>${prog.n}</span></div>
    </div>`;
  }).join("") + (open.length > 10 ? `<p><button class="btn ghost" style="color:var(--accent);background:var(--bg2);min-height:40px;font-size:14px" id="more-pos" type="button">${S.showAllPos ? "Tampilkan lebih sedikit" : `Lihat semua ${open.length} posisi`}</button></p>` : "");
  if (html === lastPosHtml) return;
  lastPosHtml = html;
  $("#positions").innerHTML = html;
  $("#more-pos")?.addEventListener("click", () => { S.showAllPos = !S.showAllPos; renderPositions(); });
}

function segButtons(el, items, current, onPick) {
  el.innerHTML = items.map(([v, l]) => `<button type="button" class="${v === current ? "on" : ""}" data-v="${v}">${l}</button>`).join("");
  el.querySelectorAll("button").forEach((b) => b.addEventListener("click", () => onPick(b.dataset.v)));
}

function renderSignals() {
  segButtons($("#sig-tf"), [["all", "Semua"], ...TFS.map((t) => [t, TF_LABEL[t]])], S.sigTf, (v) => { S.sigTf = v; renderSignals(); });
  segButtons($("#sig-side"), [["all", "Long & short"], ["LONG", "Long"], ["SHORT", "Short"]], S.sigSide, (v) => { S.sigSide = v; renderSignals(); });
  const now = Date.now();
  const rows = allTrades().filter((t) => now - t.entryTime < 7 * 864e5 && (S.sigTf === "all" || t.tf === S.sigTf) && (S.sigSide === "all" || t.side === S.sigSide)).slice(0, 40);
  if (!rows.length) { $("#signals").innerHTML = `<tr><td colspan="9" class="empty">Belum ada sinyal dalam 7 hari terakhir untuk pilihan ini.</td></tr>`; return; }
  $("#signals").innerHTML = rows.map((t) => {
    let status, est = "–";
    if (t.open) {
      const s = entryStatus(t, t.tf, t.atr ?? 0, S.prices[t.sym] ?? t.entry);
      status = `<span class="tag ${s.cls}">${s.cls === "ok" ? "Masih berlaku" : s.cls === "warn" ? "Lewat jam masuk" : "Kedaluwarsa"}</span>`;
      const e = tpEstimate(t);
      if (e) est = `± ${fmtTime(e.at)}`;
    } else if (t.result === "TP") status = `<span class="up">▲ Kena TP ${fmtTime(t.hitFrom)}–${fmtClock(t.hitTo)} · ${fmtPct(t.ret * 100, 1)}</span>`;
    else if (t.result === "SL") status = `<span class="down">▼ Kena SL ${fmtTime(t.hitFrom)}–${fmtClock(t.hitTo)} · ${fmtPct(t.ret * 100, 1)}</span>`;
    else status = "Ditutup";
    return `<tr>
      <td>${fmtTime(t.entryTime)}</td>
      <td><span style="display:inline-flex;align-items:center;gap:8px;font-weight:500">${logo(t.sym, "sm")}${esc(baseAsset(t.sym))}<span class="muted" style="font-size:12px">${TF_LABEL[t.tf]}</span></span></td>
      <td><span class="side ${t.side}">${t.side}</span></td>
      <td class="r">${fmtPrice(t.entry)}</td><td class="r muted">${fmtPrice(t.sl)}</td><td class="r muted">${fmtPrice(t.tp)}</td>
      <td>${status}</td><td class="muted">${est}</td>
      <td class="r"><a class="trade" style="min-height:30px;font-size:12px;padding:0 12px" href="${tradeUrl(t.sym)}" target="_blank" rel="noopener">Pasang posisi ↗</a></td>
    </tr>`;
  }).join("");
}

function renderBacktest() {
  const html = [];
  for (const tf of TFS) for (const side of sides()) {
    const rs = Object.values(S.res).map((r) => r[tf]?.sides[side]).filter((x) => x && x.trades);
    if (!rs.length) continue;
    const avg = rs.reduce((a, x) => a + x.return, 0) / rs.length;
    const win = rs.reduce((a, x) => a + x.winRate, 0) / rs.length;
    const tm = timingFor("", tf, side);
    html.push(`<div style="display:flex;flex-direction:column;gap:4px"><span class="muted" style="font-size:13px">${TF_LABEL[tf]} · ${side === "long" ? "Long" : "Short"}</span><b class="${avg >= 0 ? "up" : "down"}">${fmtPct(avg, 1)}</b><span class="muted" style="font-size:13px">${rs.filter((x) => x.return > 0).length}/${rs.length} koin untung · win ${nf(0).format(win)}%${tm.samples ? ` · TP ± ${fmtDur(tm.median)}` : ""}</span></div>`);
  }
  $("#bt").innerHTML = html.join("") || `<p class="empty">Memuat…</p>`;
  $("#bt-sub").textContent = "Rata-rata semua koin dari candle terakhir per timeframe (1m ≈ 17 jam, 5m ≈ 3,5 hari, 15m ≈ 15 hari, 1j ≈ 2 bulan, 4j ≈ 8 bulan; 1 detik hanya koin yang pernah dibuka, ≈ 17 menit), tanpa leverage, sudah termasuk biaya 0,05% per transaksi.";
}

// ---------- Indikator tambahan ----------
function sma(v, n) {
  const out = new Array(v.length).fill(NaN);
  let s = 0;
  for (let i = 0; i < v.length; i++) { s += v[i]; if (i >= n) s -= v[i - n]; if (i >= n - 1) out[i] = s / n; }
  return out;
}
function stdev(v, n) {
  const m = sma(v, n);
  return v.map((_, i) => { if (i < n - 1) return NaN; let s = 0; for (let j = i - n + 1; j <= i; j++) s += (v[j] - m[i]) ** 2; return Math.sqrt(s / n); });
}
function macd(close) {
  const f = ema(close, 12), s = ema(close, 26);
  const line = f.map((x, i) => x - s[i]);
  const sig = ema(line, 9);
  return { line, sig, hist: line.map((x, i) => x - sig[i]) };
}
const wilder = (v, n) => { const a = 1 / n; let p = NaN; return v.map((x) => (p = Number.isNaN(p) ? x : a * x + (1 - a) * p)); };

function rating(rows) {
  const c = rows.map((r) => r.close), h = rows.map((r) => r.high), l = rows.map((r) => r.low);
  const n = c.length - 1, price = c[n];
  const act = (b, s) => (b ? "Beli" : s ? "Jual" : "Netral");
  const mas = [];
  for (const p of [10, 20, 30, 50, 100, 200]) {
    for (const [name, arr] of [["EMA", ema(c, p)], ["SMA", sma(c, p)]]) {
      const v = arr[n];
      mas.push({ name: `${name} ${p}`, value: v, action: Number.isNaN(v) ? "Netral" : act(v < price, v > price) });
    }
  }
  const osc = [];
  const r = rsi(c, 14);
  osc.push({ name: "RSI 14", value: r[n], action: act(r[n] < 30 && r[n] > r[n - 1], r[n] > 70 && r[n] < r[n - 1]) });
  const raw = c.map((x, i) => { if (i < 13) return NaN; const hh = Math.max(...h.slice(i - 13, i + 1)), ll = Math.min(...l.slice(i - 13, i + 1)); return hh === ll ? 50 : 100 * (x - ll) / (hh - ll); });
  const k = sma(raw.map((x) => (Number.isNaN(x) ? 0 : x)), 3), d = sma(k, 3);
  osc.push({ name: "Stochastic %K 14 3 3", value: k[n], action: act(k[n] < 20 && d[n] < 20 && k[n] > d[n], k[n] > 80 && d[n] > 80 && k[n] < d[n]) });
  const tp = c.map((x, i) => (x + h[i] + l[i]) / 3), tpm = sma(tp, 20);
  const cci = tp.map((x, i) => { if (i < 19) return NaN; let md = 0; for (let j = i - 19; j <= i; j++) md += Math.abs(tp[j] - tpm[i]); md /= 20; return (x - tpm[i]) / (0.015 * md); });
  osc.push({ name: "CCI 20", value: cci[n], action: act(cci[n] < -100 && cci[n] > cci[n - 1], cci[n] > 100 && cci[n] < cci[n - 1]) });
  const pdm = [0], mdm = [0], tr = [h[0] - l[0]];
  for (let i = 1; i <= n; i++) {
    const up = h[i] - h[i - 1], dn = l[i - 1] - l[i];
    pdm.push(up > dn && up > 0 ? up : 0); mdm.push(dn > up && dn > 0 ? dn : 0);
    tr.push(Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
  }
  const atr14 = wilder(tr, 14), pdi = wilder(pdm, 14).map((x, i) => 100 * x / atr14[i]), mdi = wilder(mdm, 14).map((x, i) => 100 * x / atr14[i]);
  const adx = wilder(pdi.map((x, i) => (x + mdi[i] ? 100 * Math.abs(x - mdi[i]) / (x + mdi[i]) : 0)), 14);
  osc.push({ name: "ADX 14", value: adx[n], action: act(adx[n] > 20 && adx[n] > adx[n - 1] && pdi[n] > mdi[n], adx[n] > 20 && adx[n] > adx[n - 1] && mdi[n] > pdi[n]) });
  const hl2 = h.map((x, i) => (x + l[i]) / 2), s34 = sma(hl2, 34), ao = sma(hl2, 5).map((x, i) => x - s34[i]);
  osc.push({ name: "Awesome Oscillator", value: ao[n], action: act(ao[n] > 0 && ao[n] > ao[n - 1], ao[n] < 0 && ao[n] < ao[n - 1]) });
  const mom = c.map((x, i) => (i >= 10 ? x - c[i - 10] : NaN));
  osc.push({ name: "Momentum 10", value: mom[n], action: act(mom[n] > mom[n - 1], mom[n] < mom[n - 1]) });
  const m = macd(c);
  osc.push({ name: "MACD 12 26", value: m.line[n], action: act(m.line[n] > m.sig[n], m.line[n] < m.sig[n]) });
  const wr = c.map((x, i) => { if (i < 13) return NaN; const hh = Math.max(...h.slice(i - 13, i + 1)), ll = Math.min(...l.slice(i - 13, i + 1)); return hh === ll ? -50 : -100 * (hh - x) / (hh - ll); });
  osc.push({ name: "Williams %R 14", value: wr[n], action: act(wr[n] < -80 && wr[n] > wr[n - 1], wr[n] > -20 && wr[n] < wr[n - 1]) });
  const score = (list) => (list.filter((x) => x.action === "Beli").length - list.filter((x) => x.action === "Jual").length) / list.length;
  const sMa = score(mas), sOsc = score(osc);
  return { mas, osc, sMa, sOsc, sAll: (sMa + sOsc) / 2 };
}
const verdict = (s) => (s >= 0.5 ? "Beli kuat" : s >= 0.1 ? "Beli" : s > -0.1 ? "Netral" : s > -0.5 ? "Jual" : "Jual kuat");
const verdictColor = (s) => (s >= 0.1 ? "var(--up)" : s <= -0.1 ? "var(--down)" : "var(--muted)");

function gauge(title, s, list) {
  const ang = Math.PI * (1 - (s + 1) / 2);
  const x = 100 + 72 * Math.cos(ang), y = 100 - 72 * Math.sin(ang);
  const seg = (a0, a1, col) => {
    const p = (a) => [100 + 84 * Math.cos(Math.PI * (1 - a)), 100 - 84 * Math.sin(Math.PI * (1 - a))];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A84 84 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${col}" stroke-width="10" fill="none" stroke-linecap="butt"></path>`;
  };
  const cnt = (a) => list.filter((x) => x.action === a).length;
  return `<div class="gauge-card"><h3>${title}</h3>
    <svg viewBox="0 0 200 116" width="100%" style="max-width:240px" role="img" aria-label="${title}: ${verdict(s)}">
      ${seg(0.005, 0.195, "var(--down)")}${seg(0.205, 0.395, "color-mix(in srgb,var(--down) 45%,transparent)")}${seg(0.405, 0.595, "var(--line)")}${seg(0.605, 0.795, "color-mix(in srgb,var(--up) 45%,transparent)")}${seg(0.805, 0.995, "var(--up)")}
      <line x1="100" y1="100" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--text)" stroke-width="3" stroke-linecap="round" style="transition:all .6s"></line>
      <circle cx="100" cy="100" r="6" fill="var(--text)"></circle>
      <text x="14" y="114" font-size="10" fill="var(--muted)">Jual kuat</text><text x="186" y="114" font-size="10" fill="var(--muted)" text-anchor="end">Beli kuat</text>
    </svg>
    <div class="verdict" style="color:${verdictColor(s)}">${verdict(s)}</div>
    <div class="counts"><span>Jual <b class="down">${cnt("Jual")}</b></span><span>Netral <b>${cnt("Netral")}</b></span><span>Beli <b class="up">${cnt("Beli")}</b></span></div></div>`;
}

function renderAnalysis() {
  const r = S.res[S.sel]?.[S.tf];
  if (!r || r.rows.length < 210) return;
  const rt = rating(r.rows);
  $("#analysis-sub").textContent = `${baseAsset(S.sel)} · ${TF_LABEL[S.tf]} · candle tutup ${fmtTime(r.last.time + INTERVAL_MS[S.tf])} WIB. Gabungan 12 moving average dan 8 osilator, metode seperti rating teknikal TradingView. Alat bantu baca grafik, bukan jaminan.`;
  $("#gauges").innerHTML = gauge("Osilator", rt.sOsc, rt.osc) + gauge("Ringkasan", rt.sAll, [...rt.osc, ...rt.mas]) + gauge("Moving average", rt.sMa, rt.mas);
  const tbl = (list) => `<table class="ind-table">${list.map((x) => `<tr><td>${x.name}</td><td>${Number.isNaN(x.value) ? "–" : nf(Math.abs(x.value) >= 100 ? 2 : 4).format(x.value)}</td><td style="color:${x.action === "Beli" ? "var(--up)" : x.action === "Jual" ? "var(--down)" : "var(--muted)"}">${x.action}</td></tr>`).join("")}</table>`;
  $("#ind-detail").innerHTML = `<div>${tbl(rt.osc)}</div><div>${tbl(rt.mas)}</div>`;
}

// ---------- Grafik ----------
let charts = null;
const W7 = 7 * 3600;
const ts = (ms) => ms / 1000 + W7; // sumbu waktu tampil dalam WIB
function chartColors() {
  const cs = getComputedStyle(document.documentElement);
  const v = (n) => cs.getPropertyValue(n).trim();
  return { bg: v("--card"), text: v("--muted"), grid: v("--line2"), line: v("--line"), up: v("--up"), down: v("--down"), accent: v("--accent"), violet: v("--violet"), pink: v("--pink"), faint: v("--faint") };
}
function makeChart(el, height) {
  const c = chartColors();
  return LightweightCharts.createChart(el, {
    autoSize: true, height,
    layout: { background: { type: "solid", color: c.bg }, textColor: c.text, fontFamily: "-apple-system, Inter, sans-serif" },
    grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } },
    rightPriceScale: { borderColor: c.line, minimumWidth: 80 },
    timeScale: { borderColor: c.line, timeVisible: true, secondsVisible: false, rightOffset: 6 },
    crosshair: { mode: 0 },
    localization: { locale: "id-ID" },
    handleScroll: true, handleScale: true,
  });
}
function initCharts() {
  if (charts || !window.LightweightCharts) return;
  const c = chartColors();
  const main = makeChart($("#chart-main"));
  const rsiC = makeChart($("#chart-rsi"));
  const macdC = makeChart($("#chart-macd"));
  [rsiC, macdC].forEach((x) => x.applyOptions({ timeScale: { visible: false } }));
  const candle = main.addCandlestickSeries({ upColor: c.up, downColor: c.down, borderVisible: false, wickUpColor: c.up, wickDownColor: c.down });
  const vol = main.addHistogramSeries({ priceFormat: { type: "volume" }, priceScaleId: "vol", lastValueVisible: false, priceLineVisible: false });
  main.priceScale("vol").applyOptions({ scaleMargins: { top: 0.82, bottom: 0 } });
  const line = (ch, color, w = 1.5, extra = {}) => ch.addLineSeries({ color, lineWidth: w, lastValueVisible: false, priceLineVisible: false, crosshairMarkerVisible: false, ...extra });
  charts = {
    main, rsiC, macdC, candle, vol,
    emaF: line(main, c.accent), emaS: line(main, c.faint),
    bbU: line(main, c.violet, 1, { lineStyle: 2 }), bbM: line(main, c.violet, 1), bbL: line(main, c.violet, 1, { lineStyle: 2 }),
    rsi: line(rsiC, c.violet, 1.5, { lastValueVisible: true }),
    macdH: macdC.addHistogramSeries({ lastValueVisible: false, priceLineVisible: false }),
    macdL: line(macdC, c.accent), macdS: line(macdC, c.pink),
    lines: [],
  };
  charts.rsi.createPriceLine({ price: 70, color: c.faint, lineStyle: 2, lineWidth: 1, axisLabelVisible: false });
  charts.rsi.createPriceLine({ price: 30, color: c.faint, lineStyle: 2, lineWidth: 1, axisLabelVisible: false });
  let syncing = false;
  const all = [main, rsiC, macdC];
  all.forEach((ch) => ch.timeScale().subscribeVisibleLogicalRangeChange((r) => {
    if (syncing || !r) return;
    syncing = true;
    all.forEach((o) => o !== ch && o.timeScale().setVisibleLogicalRange(r));
    syncing = false;
  }));
}
function styleCharts() {
  if (!charts) return;
  const c = chartColors();
  for (const ch of [charts.main, charts.rsiC, charts.macdC]) {
    ch.applyOptions({ layout: { background: { type: "solid", color: c.bg }, textColor: c.text }, grid: { vertLines: { color: c.grid }, horzLines: { color: c.grid } }, rightPriceScale: { borderColor: c.line }, timeScale: { borderColor: c.line } });
  }
  charts.candle.applyOptions({ upColor: c.up, downColor: c.down, wickUpColor: c.up, wickDownColor: c.down });
  charts.emaF.applyOptions({ color: c.accent }); charts.emaS.applyOptions({ color: c.faint });
  [charts.bbU, charts.bbM, charts.bbL].forEach((s) => s.applyOptions({ color: c.violet }));
  charts.rsi.applyOptions({ color: c.violet }); charts.macdL.applyOptions({ color: c.accent }); charts.macdS.applyOptions({ color: c.pink });
  renderChart();
}

const pts = (rows, vals) => rows.map((r, i) => (Number.isNaN(vals[i]) || vals[i] == null ? { time: ts(r.time) } : { time: ts(r.time), value: vals[i] }));

function renderChartControls() {
  segButtons($("#tf-seg"), TFS.map((t) => [t, TF_LABEL[t]]), S.tf, (v) => selectCoin(S.sel, v));
  const inds = [["ema", "EMA"], ["bb", "Bollinger"], ["vol", "Volume"], ["rsi", "RSI"], ["macd", "MACD"]];
  $("#ind-seg").innerHTML = inds.map(([k, l]) => `<button type="button" class="${S.ind[k] ? "on" : ""}" data-k="${k}" aria-pressed="${S.ind[k]}">${l}</button>`).join("");
  $("#ind-seg").querySelectorAll("button").forEach((b) => b.addEventListener("click", () => { S.ind[b.dataset.k] = !S.ind[b.dataset.k]; renderChart(); }));
}

let chartKey = "";
function renderChart(fit = false) {
  renderChartControls();
  initCharts();
  const r = S.res[S.sel]?.[S.tf];
  const live = S.data[S.sel]?.[S.tf]?.live;
  $("#chart-title").innerHTML = `${logo(S.sel)}<b style="font-size:17px">${esc(baseAsset(S.sel))}</b><span class="muted">${esc(S.sel)} · ${S.tf === SOLO_TF ? "data Spot" : "Perpetual"} · ${TF_LABEL[S.tf]}</span><a class="trade" style="min-height:30px;font-size:12px;padding:0 12px" href="${tradeUrl(S.sel)}" target="_blank" rel="noopener">Pasang posisi ↗</a>`;
  const err = S.loadErr[S.sel + S.tf];
  if (err && !r) {
    $("#chart-title").innerHTML += `<p class="disclaimer" style="margin:0;flex-basis:100%">${esc(err)}. Pilih timeframe lain.</p>`;
    if (charts) [charts.candle, charts.vol, charts.emaF, charts.emaS].forEach((x) => x.setData([]));
  }
  if (!r || !charts) return;
  charts.main.timeScale().applyOptions({ secondsVisible: S.tf === SOLO_TF });
  const rows = r.rows, close = rows.map((x) => x.close), c = chartColors();
  const prec = decimals(close[close.length - 1]);
  charts.candle.applyOptions({ priceFormat: { type: "price", precision: prec, minMove: 10 ** -prec } });
  const bars = rows.map((x) => ({ time: ts(x.time), open: x.open, high: x.high, low: x.low, close: x.close }));
  if (live) bars.push({ time: ts(live.time), open: live.open, high: live.high, low: live.low, close: S.prices[S.sel] ?? live.close });
  charts.candle.setData(bars);
  charts.vol.setData(S.ind.vol ? rows.map((x) => ({ time: ts(x.time), value: x.volume, color: x.close >= x.open ? c.up + "55" : c.down + "55" })) : []);
  charts.emaF.setData(S.ind.ema ? pts(rows, rows.map((x) => x.emaFast)) : []);
  charts.emaS.setData(S.ind.ema ? pts(rows, rows.map((x) => x.emaSlow)) : []);
  if (S.ind.bb) {
    const m = sma(close, 20), sd = stdev(close, 20);
    charts.bbU.setData(pts(rows, m.map((x, i) => x + 2 * sd[i]))); charts.bbM.setData(pts(rows, m)); charts.bbL.setData(pts(rows, m.map((x, i) => x - 2 * sd[i])));
  } else [charts.bbU, charts.bbM, charts.bbL].forEach((s) => s.setData([]));
  charts.rsi.setData(pts(rows, rows.map((x) => x.rsi)));
  const m = macd(close);
  charts.macdH.setData(rows.map((x, i) => ({ time: ts(x.time), value: m.hist[i], color: m.hist[i] >= 0 ? c.up + "99" : c.down + "99" })));
  charts.macdL.setData(pts(rows, m.line)); charts.macdS.setData(pts(rows, m.sig));
  $("#pane-rsi").style.display = S.ind.rsi ? "" : "none";
  $("#pane-macd").style.display = S.ind.macd ? "" : "none";

  // Panah sinyal bot + garis posisi yang masih terbuka
  const markers = [];
  for (const side of sides()) {
    const sd = r.sides[side];
    for (const t of [...sd.closed, ...(sd.open ? [sd.open] : [])]) {
      const long = t.side === "LONG";
      markers.push({ time: ts(t.entryTime - INTERVAL_MS[S.tf]), position: long ? "belowBar" : "aboveBar", color: long ? c.up : c.down, shape: long ? "arrowUp" : "arrowDown", text: long ? "LONG" : "SHORT" });
      if (t.result === "TP" || t.result === "SL") markers.push({ time: ts(t.hitFrom), position: "inBar", color: t.result === "TP" ? c.up : c.down, shape: "circle", text: t.result });
    }
  }
  markers.sort((a, b) => a.time - b.time);
  charts.candle.setMarkers(markers);
  charts.lines.forEach((l) => charts.candle.removePriceLine(l));
  charts.lines = [];
  const legend = [];
  for (const side of sides()) {
    const o = r.sides[side].open;
    if (!o) continue;
    charts.lines.push(charts.candle.createPriceLine({ price: o.entry, color: c.text, lineStyle: 2, lineWidth: 1, title: `${o.side} masuk` }));
    charts.lines.push(charts.candle.createPriceLine({ price: o.tp, color: c.up, lineStyle: 2, lineWidth: 1, title: "TP" }));
    charts.lines.push(charts.candle.createPriceLine({ price: o.sl, color: c.down, lineStyle: 2, lineWidth: 1, title: "SL" }));
    const est = tpEstimate({ ...o, sym: S.sel, tf: S.tf });
    legend.push(`<span><span class="side ${o.side}">${o.side}</span> masuk ${fmtTime(o.entryTime)} WIB di ${fmtPrice(o.entry)} · SL ${fmtPrice(o.sl)} · TP ${fmtPrice(o.tp)}</span>`);
    if (est) legend.push(`<span>Perkiraan kena TP ± <b>${fmtTime(est.at)} WIB</b> (biasanya ${fmtClock(est.lo)}–${fmtClock(est.hi)}) · kena TP ${nf(0).format(est.tm.tpRate)}% dari ${est.tm.total} trade (${est.tm.scope})</span>`);
  }
  if (!legend.length) {
    const sig = [...rows].reverse().find((x) => x.signal === "BELI" || x.signal === "SHORT");
    legend.push(sig ? `<span>Sinyal terakhir: ${sig.signal === "BELI" ? "LONG" : "SHORT"} ${fmtTime(sig.time + INTERVAL_MS[S.tf])} WIB di ${fmtPrice(sig.close)} (sudah selesai)</span>` : "<span>Belum ada sinyal di rentang ini.</span>");
  }
  legend.push(`<span>Tren 4j: <b>${r.last.trend === "naik" ? "naik" : r.last.trend === "turun" ? "turun" : "–"}</b> · RSI ${nf(1).format(r.last.rsi)} · EMA 20 <span style="color:${c.accent}">━</span> EMA 50 <span style="color:${c.faint}">━</span></span>`);
  $("#legend").innerHTML = legend.join("");
  const key = S.sel + S.tf;
  if (fit || key !== chartKey) {
    chartKey = key;
    charts.main.timeScale().setVisibleLogicalRange({ from: bars.length - 150, to: bars.length + 5 });
  }
  updateChartLive();
}

function updateChartLive() {
  const p = S.prices[S.sel];
  const info = S.info[S.sel];
  if (p) {
    $("#chart-price").textContent = fmtPrice(p);
    if (info) $("#chart-change").innerHTML = `<span class="pill ${info.change >= 0 ? "up" : "down"}">${info.change >= 0 ? "▲" : "▼"} ${nf(2).format(Math.abs(info.change))}% 24j</span>`;
  }
  const live = S.data[S.sel]?.[S.tf]?.live;
  // Candle 1 detik sudah diganti tiap 2 detik; jangan tempel harga Futures ke candle Spot yang sudah lewat.
  if (!charts || !live || !p || S.tf === SOLO_TF) return;
  live.high = Math.max(live.high, p); live.low = Math.min(live.low, p); live.close = p;
  charts.candle.update({ time: ts(live.time), open: live.open, high: live.high, low: live.low, close: p });
}

function renderTimebar() {
  const now = Date.now();
  $("#timebar").innerHTML = TFS.filter((tf) => tf !== SOLO_TF).map((tf) => {
    const next = (Math.floor(now / INTERVAL_MS[tf]) + 1) * INTERVAL_MS[tf];
    return `<span>Candle ${TF_LABEL[tf]} tutup <b>${fmtClock(next)} WIB</b> · ${fmtCountdown(next - now)}</span>`;
  }).join("") + `<span>Sinyal baru hanya muncul saat candle tutup</span>`;
}

// Panel diagnosis: buka situs dengan ?debug
if (/[?&]debug/.test(location.search)) {
  const box = document.createElement("pre");
  box.style.cssText = "position:fixed;left:12px;bottom:12px;z-index:200;max-width:min(92vw,720px);max-height:45vh;overflow:auto;margin:0;padding:12px;border-radius:12px;background:rgba(0,0,0,.85);color:#fff;font:12px/1.5 ui-monospace,monospace;white-space:pre-wrap";
  document.body.appendChild(box);
  setInterval(() => {
    box.textContent = `Sumber: ${dataSource() || "belum ada"} · koin: ${S.symbols.length} · dianalisis: ${Object.keys(S.res).length}\n` + attempts.slice(-14).map((a) => `${a.ok ? "OK " : "GAGAL"} ${a.ms}ms ${a.url.split("?")[0]}${a.error ? " → " + a.error : ""}`).join("\n");
  }, 1000);
}

$("#coins").innerHTML = `<p class="empty">Memuat data dari Binance…</p>`;
$("#hs-btc").textContent = "memuat…";
renderChartControls();
renderTimebar();
init();

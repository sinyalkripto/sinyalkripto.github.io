import {
  CONFIG, INTERVAL_MS, addTrade, analyze, attempts, baseAsset, candleLimit, candlesFromMap, dataSource, fetchKlines, fetchTradeMap, fetchTickers, sides, topSymbols, tradeUrl, usesFilter,
} from "./engine.js?v=8";
import { startGlobe } from "./globe.js?v=3";
import { directionAccuracy, macd, rating, sma, stdev } from "./ta.js?v=5";

const $ = (s) => document.querySelector(s);
const TFS = CONFIG.TIMEFRAMES;
// 1s dirakit dari transaksi Futures, hanya untuk koin yang sedang dibuka (dihitung ulang tiap 2 detik).
const SOLO_TF = "1s";
const TF_LABEL = { "1s": "1dt", "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1j", "4h": "4j" };
// Timeframe utama: satu-satunya yang untung bersih di uji historis (lihat README).
const MAIN_TF = "1h";
// Di bawah 1 jam biaya terlalu besar dibanding target; hasil uji belum untung bersih.
const EXPERIMENTAL = new Set(["1s", "1m", "3m", "5m", "15m", "30m"]);
const tfNote = (tf) => (tf === MAIN_TF ? "utama" : EXPERIMENTAL.has(tf) ? "eksperimen" : "");
const tfTag = (tf) => (tf === MAIN_TF ? ' <span class="tag ok" style="font-size:11px;padding:1px 6px">utama</span>' : EXPERIMENTAL.has(tf) ? ' <span class="tag warn" style="font-size:11px;padding:1px 6px">eksperimen</span>' : "");
const S = {
  symbols: [], info: {}, data: {}, res: {}, prices: {}, prevPrices: {},
  sel: "BTCUSDT", tf: "1h", ind: { ema: true, bb: false, vol: true, rsi: true, macd: true },
  sigTf: MAIN_TF, sigSide: "all", showAllPos: false, loadErr: {},
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
  if (tf === SOLO_TF) { await ensureSolo(sym); return soloTick(); }
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
// ---------- Hasil live (forward test) ----------
// Sinyal yang muncul SETELAH pelacakan dimulai dicatat di browser ini (localStorage), supaya hasilnya
// bisa dibandingkan dengan angka backtest. Disimpan per trade, jadi tetap ada walau candle lamanya
// sudah tidak dimuat lagi.
const LIVE_KEY = "liveTrades.v1";
const LIVE = (() => {
  let v = null;
  try { v = JSON.parse(localStorage.getItem(LIVE_KEY) || "null"); } catch (e) {}
  if (!v || !v.start) v = { start: Date.now(), trades: {} };
  return v;
})();
function saveLive() { try { localStorage.setItem(LIVE_KEY, JSON.stringify(LIVE)); } catch (e) {} }
saveLive();
function recordLive() {
  let changed = false;
  for (const t of allTrades()) {
    if (t.open || t.entryTime < LIVE.start) continue;
    const key = `${t.sym}|${t.tf}|${t.side}|${t.entryTime}`;
    if (LIVE.trades[key]) continue;
    LIVE.trades[key] = { sym: t.sym, tf: t.tf, side: t.side, entryTime: t.entryTime, result: t.result, ret: t.ret };
    changed = true;
  }
  if (changed) saveLive();
}
function renderLive() {
  recordLive();
  const list = Object.values(LIVE.trades);
  const cards = [];
  for (const tf of TFS) {
    const ts = list.filter((t) => t.tf === tf);
    const bt = Object.values(S.res).flatMap((r) => (r[tf] ? sides().flatMap((sd) => r[tf].sides[sd].closed) : []));
    if (!ts.length && tf !== MAIN_TF) continue;
    const st = (arr) => {
      const n = arr.length, w = arr.filter((t) => t.ret > 0).length;
      const g = arr.filter((t) => t.ret > 0).reduce((a, t) => a + t.ret, 0), l = -arr.filter((t) => t.ret <= 0).reduce((a, t) => a + t.ret, 0);
      return { n, win: n ? w / n * 100 : NaN, pf: l ? g / l : g ? Infinity : NaN };
    };
    const lv = st(ts), b = st(bt);
    const f = (x) => (x.n ? `win ${nf(0).format(x.win)}% · PF ${x.pf === Infinity ? "∞" : Number.isFinite(x.pf) ? nf(2).format(x.pf) : "–"}` : "–");
    cards.push(`<div style="display:flex;flex-direction:column;gap:4px"><span class="muted" style="font-size:13px">${TF_LABEL[tf]}${tfTag(tf)}</span><b>${lv.n ? f(lv) : "Belum ada"}</b><span class="muted" style="font-size:13px">${lv.n} trade live · backtest: ${f(b)}</span></div>`);
  }
  $("#live").innerHTML = cards.join("") || `<p class="empty">Belum ada sinyal yang selesai sejak pelacakan dimulai.</p>`;
  $("#live-sub").textContent = `Sinyal yang muncul sejak ${fmtTime(LIVE.start)} WIB dan sudah selesai (kena TP, SL, atau batas waktu), dicatat di browser ini saja. Biarkan situs terbuka atau buka lagi tiap hari selama 1–2 minggu, lalu bandingkan dengan angka backtest. Kalau jauh di bawah backtest, strategi perlu dicek ulang.`;
}
$("#live-reset")?.addEventListener("click", () => { LIVE.start = Date.now(); LIVE.trades = {}; saveLive(); renderLive(); });

function renderAll() {
  renderKpis(); renderPositions(); renderSignals(); renderBacktest(); renderLive();
  if (S.res[S.sel]?.[S.tf]) { renderChart(); renderAnalysis(); } else renderTfDirections();
}

async function init() {
  try {
    splashProgress(12, "Menghubungkan ke Binance…");
    S.symbols = await topSymbols(CONFIG.TOP_COINS);
    showSource();
    S.symbols.forEach((s) => { S.info[s.symbol] = s; S.prices[s.symbol] = s.price; });
    if (!S.info[S.sel]) S.sel = S.symbols[0].symbol;
    renderCoins();
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
    const msg = `Data harga tidak bisa diambil dari Binance Futures, Bybit, maupun Binance Spot (${esc(e.message)}). Kemungkinan jaringan (ISP) atau ekstensi browser (misalnya pemblokir iklan) memblokir situs-situs itu. Coba nonaktifkan ekstensi itu untuk situs ini, ganti DNS ke 1.1.1.1 atau 8.8.8.8, atau pakai jaringan lain, lalu muat ulang halaman. Detail: buka situs dengan ?debug di akhir alamat.`;
    $("#coins").innerHTML = `<p class="disclaimer">${msg}</p>`;
    $("#chart-title").innerHTML = `<p class="disclaimer" style="margin:0">${msg}</p>`;
    $("#hs-btc").textContent = "tidak tersedia";
  }
}

// ---------- Candle 1 detik (transaksi Futures: riwayat REST + WebSocket aggTrade) ----------
const solo = { sym: null, map: null, ws: null, starting: null };
function stopSolo() {
  if (solo.ws) { solo.ws.onclose = solo.ws.onmessage = null; solo.ws.close(); }
  Object.assign(solo, { sym: null, map: null, ws: null, starting: null });
}
/** Tampilkan sumber data yang dipakai kalau bukan Binance Futures. */
function showSource() {
  const src = dataSource();
  const el = $("#src-note");
  if (!el || !src) return;
  if (src.name === "Binance Futures") { el.hidden = true; return; }
  el.hidden = false;
  el.textContent = src.kind === "futures"
    ? `Binance Futures tidak bisa dihubungi dari jaringan Anda, jadi data diambil dari ${src.name} (kontrak perpetual USDT). Harganya bisa sedikit beda dari Binance. Timeframe 1 detik tidak tersedia.`
    : `Binance Futures dan Bybit tidak bisa dihubungi dari jaringan Anda, jadi data diambil dari ${src.name}. Harga Spot bisa sedikit beda dari harga Futures. Timeframe 1 detik tidak tersedia.`;
}

function ensureSolo(sym) {
  if (!dataSource()?.aggTrades) return Promise.reject(new Error(`Candle 1 detik hanya tersedia dari Binance Futures (sekarang memakai ${dataSource()?.name ?? "sumber lain"})`));
  if (solo.sym === sym && (solo.ws || solo.starting)) return solo.starting;
  // WebSocket putus/diblokir: ambil ulang riwayat paling sering tiap 15 detik (batas API).
  if (solo.sym === sym && solo.map && Date.now() - solo.at < 15e3) return null;
  stopSolo();
  solo.sym = sym; solo.at = Date.now();
  const buffer = [];
  const ws = typeof WebSocket !== "undefined" ? new WebSocket(`wss://fstream.binance.com/ws/${sym.toLowerCase()}@aggTrade`) : null;
  if (ws) {
    ws.onmessage = (e) => { const t = JSON.parse(e.data); if (solo.map) { if (t.a > solo.lastId) addTrade(solo.map, t); } else buffer.push(t); };
    ws.onclose = () => { if (solo.ws === ws) solo.ws = null; }; // tersambung ulang di tick berikutnya
    solo.ws = ws;
  }
  solo.starting = fetchTradeMap(sym).then((map) => {
    if (solo.sym !== sym) return;
    // Transaksi yang sudah ada di riwayat REST jangan dihitung dua kali.
    solo.lastId = [...map.values()].reduce((m, k) => Math.max(m, k.maxA), -1);
    for (const t of buffer) if (t.a > solo.lastId) addTrade(map, t);
    solo.map = map;
    solo.starting = null;
  }, (e) => { if (solo.sym === sym) stopSolo(); throw e; });
  return solo.starting;
}
function soloTick() {
  const sym = solo.sym;
  if (!sym || !solo.map) return;
  const all = candlesFromMap(solo.map, 1000, CONFIG.FAST_LIMIT, Date.now());
  if (all.length < 2) return;
  S.data[sym] ??= {};
  S.data[sym][SOLO_TF] = { closed: all.slice(0, -1), live: all[all.length - 1] };
  compute(sym, SOLO_TF);
}

// ---------- Live ----------
const lastClose = {};
function startLive() {
  TFS.forEach((tf) => { lastClose[tf] = Math.floor(Date.now() / INTERVAL_MS[tf]); });
  // Candle 1 detik: hanya koin yang sedang dibuka di grafik.
  setInterval(async () => {
    if (S.tf !== SOLO_TF || document.hidden) return;
    try { await load(S.sel, SOLO_TF); renderAll(); } catch (e) { console.warn(e); }
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
  if (tf !== SOLO_TF) stopSolo();
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
  segButtons($("#sig-tf"), [["all", "Semua"], ...TFS.map((t) => [t, TF_LABEL[t] + (EXPERIMENTAL.has(t) ? "*" : t === MAIN_TF ? " ★" : "")])], S.sigTf, (v) => { S.sigTf = v; renderSignals(); });
  segButtons($("#sig-side"), [["all", "Long & short"], ["LONG", "Long"], ["SHORT", "Short"]], S.sigSide, (v) => { S.sigSide = v; renderSignals(); });
  const now = Date.now();
  const pick = (t) => (S.sigTf === "all" || t.tf === S.sigTf) && (S.sigSide === "all" || t.side === S.sigSide);
  const coin = (t) => `<span style="display:inline-flex;align-items:center;gap:8px;font-weight:500">${logo(t.sym, "sm")}${esc(baseAsset(t.sym))}<span class="muted" style="font-size:12px">${TF_LABEL[t.tf]}</span></span>`;
  const trades = allTrades().filter(pick);

  // Sinyal aktif: posisi yang belum kena TP/SL (juga belum kena di candle yang sedang berjalan).
  const active = trades.filter((t) => t.open && !liveHit(t));
  $("#signals").innerHTML = active.length ? active.map((t) => {
    const s = entryStatus(t, t.tf, t.atr ?? 0, S.prices[t.sym] ?? t.entry);
    const e = tpEstimate(t);
    // Tombol pasang posisi hanya selama sinyal masih layak dimasuki.
    const btn = s.cls === "bad"
      ? `<span class="muted" style="font-size:12px">Jangan dikejar</span>`
      : `<a class="trade" style="min-height:30px;font-size:12px;padding:0 12px" href="${tradeUrl(t.sym)}" target="_blank" rel="noopener">Pasang posisi ↗</a>`;
    return `<tr>
      <td>${fmtTime(t.entryTime)}</td><td>${coin(t)}</td>
      <td><span class="side ${t.side}">${t.side}</span></td>
      <td class="r">${fmtPrice(t.entry)}</td><td class="r muted">${fmtPrice(t.sl)}</td><td class="r muted">${fmtPrice(t.tp)}</td>
      <td><span class="tag ${s.cls}">${s.cls === "ok" ? "Masih berlaku" : s.cls === "warn" ? "Lewat jam masuk" : "Kedaluwarsa"}</span></td>
      <td class="muted">${e ? `± ${fmtTime(e.at)}` : "–"}</td>
      <td class="r">${btn}</td>
    </tr>`;
  }).join("") : `<tr><td colspan="9" class="empty">Belum ada sinyal baru untuk pilihan ini. Sinyal muncul saat candle tutup, halaman ini memperbarui sendiri.</td></tr>`;

  renderWhy(trades, active.length);

  // Riwayat: sinyal 7 hari terakhir yang sudah selesai, tanpa tombol pasang posisi.
  const done = trades.filter((t) => !t.open && now - t.entryTime < 7 * 864e5).slice(0, 60);
  const wins = done.filter((t) => t.ret > 0).length;
  $("#hist-sum").textContent = done.length ? `Riwayat 7 hari: ${done.length} sinyal selesai · ${wins} untung, ${done.length - wins} rugi` : "Riwayat 7 hari: belum ada sinyal yang selesai";
  $("#history").innerHTML = done.length ? done.map((t) => {
    const status = t.result === "TP" ? `<span class="up">▲ Kena TP ${fmtTime(t.hitFrom)} · ${fmtPct(t.ret * 100, 1)}</span>`
      : t.result === "SL" ? `<span class="down">▼ Kena SL ${fmtTime(t.hitFrom)} · ${fmtPct(t.ret * 100, 1)}</span>`
      : `<span class="${t.ret >= 0 ? "up" : "down"}">Ditutup batas waktu ${fmtTime(t.hitFrom)} · ${fmtPct(t.ret * 100, 1)}</span>`;
    return `<tr><td>${fmtTime(t.entryTime)}</td><td>${coin(t)}</td><td><span class="side ${t.side}">${t.side}</span></td>
      <td class="r">${fmtPrice(t.entry)}</td><td class="r muted">${fmtPrice(t.sl)}</td><td class="r muted">${fmtPrice(t.tp)}</td><td>${status}</td></tr>`;
  }).join("") : `<tr><td colspan="7" class="empty">Belum ada.</td></tr>`;
}

// Kondisi tiap koin di candle terakhir yang sudah tutup: syarat mana yang belum terpenuhi.
function renderWhy(trades, nActive) {
  const tf = S.sigTf === "all" ? MAIN_TF : S.sigTf;
  const lastSig = new Map();
  for (const t of allTrades()) if (t.tf === tf && !lastSig.has(t.sym)) lastSig.set(t.sym, t);
  const rows = Object.keys(S.res).map((sym) => ({ sym, r: S.res[sym][tf] })).filter((x) => x.r?.last);
  // Dibuka otomatis sekali saat data pertama siap dan tidak ada sinyal aktif; setelah itu ikut pilihan pengguna.
  if (!S.whyInit && rows.length) { S.whyInit = true; $("#why-box").open = !nActive; }
  $("#why-sub").textContent = `Timeframe ${TF_LABEL[tf]}, dari candle terakhir yang sudah tutup. Sinyal butuh semua syarat ini sekaligus: tren 4 jam dan tren di timeframe ini searah, ADX minimal ${CONFIG.ADX_MIN} (pasar bertren, bukan sideways), lalu RSI balik arah lewat ${CONFIG.RSI_PULLBACK_LONG} (long) atau ${CONFIG.RSI_PULLBACK_SHORT} (short). Syarat ini sengaja ketat, jadi wajar kalau berjam-jam atau 1–3 hari tidak ada sinyal.`;
  const label = (v) => v === "naik" ? `<span class="up">Naik</span>` : v === "turun" ? `<span class="down">Turun</span>` : `<span class="muted">Campur</span>`;
  const list = rows.map(({ sym, r }) => {
    const l = r.last, usesT = l.trend != null;
    const tfTrend = l.emaFast > l.emaSlow && l.close > l.emaTrend ? "naik" : l.emaFast < l.emaSlow && l.close < l.emaTrend ? "turun" : "campur";
    const t4 = usesT ? l.trend : tfTrend;
    const same = tfTrend !== "campur" && tfTrend === t4;
    const strong = l.adx >= CONFIG.ADX_MIN;
    const big = CONFIG.TAKE_PROFIT_ATR * l.atr / l.close * 100 >= CONFIG.MIN_TAKE_PROFIT_PERCENT;
    let wait, score;
    if (!same) { wait = "Tren belum searah, tunggu"; score = 3; }
    else if (!strong) { wait = "Pasar sideways (ADX rendah), tunggu tren menguat"; score = 2; }
    else if (!big) { wait = "Gerak harga terlalu kecil, tunggu volatilitas naik"; score = 2; }
    else if (tfTrend === "naik") {
      wait = l.rsi < CONFIG.RSI_PULLBACK_LONG ? `<b class="up">Dekat sinyal LONG</b>: RSI naik lewat ${CONFIG.RSI_PULLBACK_LONG}` : `Tunggu harga turun sebentar (RSI ke bawah ${CONFIG.RSI_PULLBACK_LONG}), lalu LONG saat RSI naik lagi`;
      score = l.rsi < CONFIG.RSI_PULLBACK_LONG ? 0 : 1;
    } else {
      wait = l.rsi > CONFIG.RSI_PULLBACK_SHORT ? `<b class="down">Dekat sinyal SHORT</b>: RSI turun lewat ${CONFIG.RSI_PULLBACK_SHORT}` : `Tunggu harga naik sebentar (RSI ke atas ${CONFIG.RSI_PULLBACK_SHORT}), lalu SHORT saat RSI turun lagi`;
      score = l.rsi > CONFIG.RSI_PULLBACK_SHORT ? 0 : 1;
    }
    const ls = lastSig.get(sym);
    return { score, html: `<tr><td>${logo(sym, "sm")} ${esc(baseAsset(sym))}</td><td>${usesT ? label(t4) : "–"}</td><td>${label(tfTrend)}</td>
      <td class="r ${strong ? "" : "muted"}">${l.adx.toFixed(0)}</td><td class="r">${l.rsi.toFixed(0)}</td><td>${wait}</td>
      <td class="muted">${ls ? `${fmtTime(ls.entryTime)} ${ls.side}` : "–"}</td></tr>` };
  }).sort((a, b) => a.score - b.score);
  $("#why").innerHTML = list.length ? list.map((x) => x.html).join("") : `<tr><td colspan="7" class="empty">Memuat…</td></tr>`;
}

function renderBacktest() {
  const html = [];
  for (const tf of TFS) for (const side of sides()) {
    const rs = Object.values(S.res).map((r) => r[tf]?.sides[side]).filter((x) => x && x.trades);
    if (!rs.length) continue;
    const avg = rs.reduce((a, x) => a + x.return, 0) / rs.length;
    // Win rate dan profit factor dihitung dari gabungan semua trade (bukan rata-rata per koin).
    const n = rs.reduce((a, x) => a + x.closed.length, 0);
    const wins = rs.reduce((a, x) => a + x.closed.filter((t) => t.ret > 0).length, 0);
    const gain = rs.reduce((a, x) => a + x.gain, 0), loss = rs.reduce((a, x) => a + x.loss, 0);
    const win = n ? wins / n * 100 : NaN, pf = loss ? gain / loss : gain ? Infinity : NaN;
    const tm = timingFor("", tf, side);
    html.push(`<div style="display:flex;flex-direction:column;gap:4px"><span class="muted" style="font-size:13px">${TF_LABEL[tf]} · ${side === "long" ? "Long" : "Short"}${tfTag(tf)}</span><b class="${avg >= 0 ? "up" : "down"}">${fmtPct(avg, 1)}</b><span class="muted" style="font-size:13px">Win ${Number.isNaN(win) ? "–" : nf(0).format(win) + "%"} dari ${n} trade · PF ${pf === Infinity ? "∞ (belum ada rugi)" : Number.isFinite(pf) ? nf(2).format(pf) : "–"}</span><span class="muted" style="font-size:13px">${rs.filter((x) => x.return > 0).length}/${rs.length} koin untung${tm.samples ? ` · TP ± ${fmtDur(tm.median)}` : ""}</span></div>`);
  }
  $("#bt").innerHTML = html.join("") || `<p class="empty">Memuat…</p>`;
  $("#bt-sub").textContent = "Rata-rata semua koin dari candle terakhir per timeframe (1m ≈ 17 jam, 5m ≈ 3,5 hari, 15m ≈ 15 hari, 1j ≈ 2 bulan, 4j ≈ 8 bulan; 1 detik dirakit dari transaksi Futures, hanya koin yang pernah dibuka), tanpa leverage, sudah termasuk biaya 0,05% per transaksi. PF (profit factor) = total untung dibagi total rugi; di atas 1 berarti untung bersih. Win rate tinggi belum tentu untung, karena TP sengaja lebih dekat dari SL. ★ 1j = timeframe utama (satu-satunya yang untung bersih di uji 6 bulan); * eksperimen = di uji historis belum untung bersih setelah biaya.";
}

// ---------- Analisis teknikal: arah LONG/SHORT per timeframe ----------
const AHEAD = 5; // akurasi: arah dibandingkan dengan harga 5 candle sesudahnya
const voteWord = (v) => (v > 0 ? "Long" : v < 0 ? "Short" : "Netral");
const voteColor = (v) => (v > 0 ? "var(--up)" : v < 0 ? "var(--down)" : "var(--muted)");
/** Arah selalu LONG/SHORT; tie diputus di rating(). Kata "kuat" saat mayoritas jelas. */
const dirWord = (s, dir) => (dir > 0 ? "LONG" : "SHORT") + (Math.abs(s) >= 0.5 ? " kuat" : "");
const subWord = (s) => (s >= 0.5 ? "Long kuat" : s >= 0.1 ? "Long" : s > -0.1 ? "Netral" : s > -0.5 ? "Short" : "Short kuat");

function gauge(title, s, list, label) {
  const ang = Math.PI * (1 - (s + 1) / 2);
  const x = 100 + 72 * Math.cos(ang), y = 100 - 72 * Math.sin(ang);
  const seg = (a0, a1, col) => {
    const p = (a) => [100 + 84 * Math.cos(Math.PI * (1 - a)), 100 - 84 * Math.sin(Math.PI * (1 - a))];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `<path d="M${x0.toFixed(1)} ${y0.toFixed(1)} A84 84 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${col}" stroke-width="10" fill="none" stroke-linecap="butt"></path>`;
  };
  const cnt = (v) => list.filter((x) => x.vote === v).length;
  const color = label.startsWith("LONG") || label.startsWith("Long") ? "var(--up)" : label.startsWith("SHORT") || label.startsWith("Short") ? "var(--down)" : "var(--muted)";
  return `<div class="gauge-card"><h3>${title}</h3>
    <svg viewBox="0 0 200 116" width="100%" style="max-width:240px" role="img" aria-label="${title}: ${label}">
      ${seg(0.005, 0.195, "var(--down)")}${seg(0.205, 0.395, "color-mix(in srgb,var(--down) 45%,transparent)")}${seg(0.405, 0.595, "var(--line)")}${seg(0.605, 0.795, "color-mix(in srgb,var(--up) 45%,transparent)")}${seg(0.805, 0.995, "var(--up)")}
      <line x1="100" y1="100" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="var(--text)" stroke-width="3" stroke-linecap="round" style="transition:all .6s"></line>
      <circle cx="100" cy="100" r="6" fill="var(--text)"></circle>
      <text x="14" y="114" font-size="10" fill="var(--muted)">Short kuat</text><text x="186" y="114" font-size="10" fill="var(--muted)" text-anchor="end">Long kuat</text>
    </svg>
    <div class="verdict" style="color:${color}">${label}</div>
    <div class="counts"><span>Short <b class="down">${cnt(-1)}</b></span><span>Netral <b>${cnt(0)}</b></span><span>Long <b class="up">${cnt(1)}</b></span></div></div>`;
}

/** Rating + akurasi historis per (koin, timeframe), dihitung ulang hanya saat candle berubah. */
const dirCache = new WeakMap();
function tfDirection(sym, tf) {
  const r = S.res[sym]?.[tf];
  if (!r || r.rows.length < 210) return null;
  let d = dirCache.get(r.rows);
  if (!d) dirCache.set(r.rows, (d = { rt: rating(r.rows), acc: directionAccuracy(r.rows, AHEAD) }));
  return d;
}

/** Win rate sinyal bot (TP/SL) di koin + timeframe ini, dari backtest candle yang dimuat. */
function botWin(sym, tf) {
  const r = S.res[sym]?.[tf];
  if (!r) return "";
  const closed = sides().flatMap((side) => r.sides[side].closed);
  if (!closed.length) return `<span class="muted" style="font-size:12px">Sinyal bot: belum ada trade</span>`;
  const w = closed.filter((t) => t.ret > 0).length / closed.length * 100;
  return `<span class="muted" style="font-size:12px" title="Trade sinyal bot (TP/SL) yang ditutup untung di candle yang dimuat">Win bot ${nf(0).format(w)}% (${closed.length})</span>`;
}

function renderTfDirections() {
  const cards = TFS.map((tf) => {
    const d = tfDirection(S.sel, tf);
    const cur = tf === S.tf ? " sel" : "";
    if (!d) {
      const why = tf === SOLO_TF && S.tf !== SOLO_TF ? "Klik untuk memuat" : tf === SOLO_TF ? "Mengumpulkan transaksi…" : "Memuat…";
      return `<button type="button" class="tf-dir${cur}" data-tf="${tf}"><span class="tf-name">${TF_LABEL[tf]}${tfTag(tf)}</span><span class="muted" style="font-size:13px">${why}</span></button>`;
    }
    const { rt, acc } = d, all = [...rt.mas, ...rt.osc];
    const nL = all.filter((x) => x.vote > 0).length, nS = all.filter((x) => x.vote < 0).length;
    const side = rt.dir > 0 ? "LONG" : "SHORT";
    return `<button type="button" class="tf-dir${cur}" data-tf="${tf}">
      <span class="tf-name">${TF_LABEL[tf]}${tfTag(tf)}</span>
      <span class="side ${side}" style="font-size:14px">${dirWord(rt.sAll, rt.dir)}</span>
      <span class="muted" style="font-size:12px">${nL} long · ${nS} short · ${all.length - nL - nS} netral</span>
      <span class="muted" style="font-size:12px">${Number.isNaN(acc.acc) ? "Akurasi –" : `Akurasi ${nf(0).format(acc.acc)}% <span title="Dari ${acc.total} candle terakhir: arah rating dibanding harga ${AHEAD} candle sesudahnya">(${acc.total})</span>`}</span>
      ${botWin(S.sel, tf)}
    </button>`;
  });
  $("#tf-dirs").innerHTML = cards.join("");
  $("#tf-dirs").querySelectorAll(".tf-dir").forEach((b) => b.addEventListener("click", () => selectCoin(S.sel, b.dataset.tf)));
  const ds = TFS.map((tf) => tfDirection(S.sel, tf)).filter(Boolean);
  const long = ds.filter((d) => d.rt.dir > 0).length;
  $("#tf-sum").innerHTML = ds.length
    ? `${esc(baseAsset(S.sel))}: <b class="${long * 2 >= ds.length ? "up" : "down"}">${long} dari ${ds.length} timeframe LONG</b>, ${ds.length - long} SHORT. Timeframe yang searah dengan timeframe besar biasanya lebih bisa dipercaya.`
    : "";
}

function renderAnalysis() {
  renderTfDirections();
  const d = tfDirection(S.sel, S.tf);
  if (!d) return;
  const { rt, acc } = d, r = S.res[S.sel][S.tf];
  $("#analysis-sub").textContent = `${baseAsset(S.sel)} · ${TF_LABEL[S.tf]} · candle tutup ${fmtTime(r.last.time + INTERVAL_MS[S.tf])} WIB. ${rt.total} indikator: ${rt.mas.length} indikator tren dan ${rt.osc.length} osilator. Akurasi = seberapa sering arah rating di ${acc.total} candle terakhir sesuai dengan harga ${AHEAD} candle sesudahnya. Alat bantu baca grafik, bukan jaminan.`;
  $("#gauges").innerHTML = gauge("Osilator", rt.sOsc, rt.osc, subWord(rt.sOsc)) + gauge(`Arah ${TF_LABEL[S.tf]}`, rt.sAll, [...rt.osc, ...rt.mas], dirWord(rt.sAll, rt.dir)) + gauge("Tren (moving average dll.)", rt.sMa, rt.mas, subWord(rt.sMa));
  const tbl = (list) => `<table class="ind-table">${list.map((x) => `<tr><td>${x.name}</td><td>${x.value == null || Number.isNaN(x.value) ? "–" : nf(Math.abs(x.value) >= 100 ? 2 : 4).format(x.value)}</td><td style="color:${voteColor(x.vote)}">${voteWord(x.vote)}</td></tr>`).join("")}</table>`;
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
  segButtons($("#tf-seg"), TFS.map((t) => [t, TF_LABEL[t] + (EXPERIMENTAL.has(t) ? "*" : t === MAIN_TF ? " ★" : "")]), S.tf, (v) => selectCoin(S.sel, v));
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
  $("#chart-title").innerHTML = `${logo(S.sel)}<b style="font-size:17px">${esc(baseAsset(S.sel))}</b><span class="muted">${esc(S.sel)} · Perpetual · ${TF_LABEL[S.tf]}</span><a class="trade" style="min-height:30px;font-size:12px;padding:0 12px" href="${tradeUrl(S.sel)}" target="_blank" rel="noopener">Pasang posisi ↗</a>`;
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
  if (live) bars.push({ time: ts(live.time), open: live.open, high: live.high, low: live.low, close: (S.tf !== SOLO_TF && S.prices[S.sel]) || live.close });
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
  // Candle 1 detik dihitung ulang tiap 2 detik dari transaksi; jangan tempel harga ke candle yang sudah lewat.
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
    box.textContent = `Sumber: ${dataSource()?.name ?? "belum tersambung"} (${dataSource() ? new URL(dataSource().base).host : "-"}) · koin: ${S.symbols.length} · dianalisis: ${Object.keys(S.res).length}\n` + attempts.slice(-14).map((a) => `${a.ok ? "OK " : "GAGAL"} ${a.ms}ms ${a.url.split("?")[0]}${a.error ? " → " + a.error : ""}`).join("\n");
  }, 1000);
}

$("#coins").innerHTML = `<p class="empty">Memuat data dari Binance…</p>`;
$("#hs-btc").textContent = "memuat…";
renderChartControls();
renderTimebar();
init();

// Mesin sinyal versi JavaScript: port 1:1 dari signals.py dan backtest.py.
// Jalan di browser (GitHub Pages) dan di Node (untuk tes). Semua data diambil langsung
// dari API publik Binance Futures oleh browser pengunjung, tanpa server dan tanpa API key.

export const CONFIG = {
  TOP_COINS: 20,
  EXCLUDE: ["USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "USDPUSDT", "DAIUSDT", "EURUSDT",
    "AEURUSDT", "USD1USDT", "XUSDUSDT", "BFUSDUSDT", "RLUSDUSDT", "USDEUSDT",
    "PAXGUSDT", "XAUTUSDT", "WBTCUSDT", "SPCXBUSDT", "SNDKBUSDT", "UUSDT"],
  TIMEFRAMES: ["15m", "30m", "1h", "4h"],
  CANDLE_LIMIT: 1500,
  EMA_FAST: 20,
  EMA_SLOW: 50,
  RSI_PERIOD: 14,
  RSI_BUY_MAX: 70,
  RSI_SELL_MIN: 30,
  TREND_FILTER: "4h",
  ENABLE_SHORT: true,
  ATR_PERIOD: 14,
  STOP_LOSS_ATR: 1.5,
  TAKE_PROFIT_ATR: 3.0,
  MIN_STOP_LOSS_PERCENT: 0.5,
  EXIT_ON_SELL_SIGNAL: false,
  FEE_PERCENT: 0.05,
};

const C = CONFIG;
export const BASE_URL = "https://fapi.binance.com";
export const INTERVAL_MS = { "1m": 6e4, "5m": 3e5, "15m": 9e5, "30m": 18e5, "1h": 36e5, "4h": 144e5, "1d": 864e5 };

// ---------- Indikator (sama dengan pandas ewm(adjust=False)) ----------

function ewm(values, alpha) {
  const out = new Array(values.length).fill(NaN);
  let prev = NaN;
  for (let i = 0; i < values.length; i++) {
    const v = values[i];
    if (Number.isNaN(v)) { out[i] = prev; continue; }
    prev = Number.isNaN(prev) ? v : alpha * v + (1 - alpha) * prev;
    out[i] = prev;
  }
  return out;
}

export const ema = (values, period) => ewm(values, 2 / (period + 1));

export function rsi(close, period = 14) {
  const gain = close.map((c, i) => (i === 0 ? NaN : Math.max(c - close[i - 1], 0)));
  const loss = close.map((c, i) => (i === 0 ? NaN : Math.max(close[i - 1] - c, 0)));
  const g = ewm(gain, 1 / period), l = ewm(loss, 1 / period);
  return g.map((gv, i) => (Number.isNaN(gv) ? NaN : 100 - 100 / (1 + gv / l[i])));
}

export function atr(candles, period = 14) {
  const tr = candles.map((k, i) => {
    if (i === 0) return k.high - k.low;
    const pc = candles[i - 1].close;
    return Math.max(k.high - k.low, Math.abs(k.high - pc), Math.abs(k.low - pc));
  });
  return ewm(tr, 1 / period);
}

// ---------- Sinyal ----------

/** Tren per candle dari timeframe besar, hanya memakai candle tren yang sudah close. */
export function alignTrend(candles, trendCandles) {
  const tc = trendCandles.map((k) => k.close);
  const fast = ema(tc, C.EMA_FAST), slow = ema(tc, C.EMA_SLOW);
  const diffs = trendCandles.slice(1).map((k, i) => k.time - trendCandles[i].time).sort((a, b) => a - b);
  const step = diffs.length ? diffs[Math.floor((diffs.length - 1) / 2)] : 0;
  const out = new Array(candles.length).fill(null);
  let j = -1;
  for (let i = 0; i < candles.length; i++) {
    while (j + 1 < trendCandles.length && trendCandles[j + 1].time + step <= candles[i].time) j++;
    if (j >= 0) out[i] = fast[j] > slow[j] ? "naik" : "turun";
  }
  return out;
}

/** candles: [{time(ms, open time), open, high, low, close, volume}] candle yang sudah close. */
export function addIndicators(candles, trendCandles = null) {
  const close = candles.map((k) => k.close);
  const emaFast = ema(close, C.EMA_FAST), emaSlow = ema(close, C.EMA_SLOW);
  const r = rsi(close, C.RSI_PERIOD), a = atr(candles, C.ATR_PERIOD);
  const trend = trendCandles ? alignTrend(candles, trendCandles) : null;
  const shortOn = C.ENABLE_SHORT;
  let prevAbove = null;
  return candles.map((k, i) => {
    const slDist = Math.max(C.STOP_LOSS_ATR * a[i], k.close * C.MIN_STOP_LOSS_PERCENT / 100);
    const tpDist = slDist * C.TAKE_PROFIT_ATR / C.STOP_LOSS_ATR;
    const above = emaFast[i] > emaSlow[i];
    const crossUp = above && !(prevAbove ?? false);
    const crossDown = !above && (prevAbove ?? true);
    prevAbove = above;
    const warm = i >= C.EMA_SLOW;
    let buy = warm && crossUp && r[i] < C.RSI_BUY_MAX;
    const sell = warm && crossDown && r[i] > C.RSI_SELL_MIN;
    let short = sell && shortOn;
    if (trend) {
      buy = buy && trend[i] === "naik";
      short = short && trend[i] === "turun";
    }
    let signal = "TAHAN";
    if (buy) signal = "BELI";
    if (sell) signal = "JUAL";
    if (short) signal = "SHORT";
    return {
      ...k, emaFast: emaFast[i], emaSlow: emaSlow[i], rsi: r[i], atr: a[i],
      stopLoss: k.close - slDist, takeProfit: k.close + tpDist,
      shortStopLoss: k.close + slDist, shortTakeProfit: k.close - tpDist,
      crossUp: warm && crossUp, crossDown: warm && crossDown,
      trend: trend ? trend[i] : null, signal,
    };
  });
}

export const usesFilter = (interval) => C.TREND_FILTER !== null && interval !== C.TREND_FILTER;

// ---------- Backtest + posisi ----------

/**
 * Simulasi satu arah ("long"/"short"), aturan sama dengan backtest.py.
 * Mengembalikan ringkasan + daftar trade (dengan waktu masuk/keluar) + posisi yang masih terbuka.
 */
export function simulate(rows, side, interval) {
  const fee = C.FEE_PERCENT / 100;
  const long = side === "long";
  const entrySignal = long ? "BELI" : "SHORT";
  const step = INTERVAL_MS[interval] || 0;
  const trades = [];
  let pos = null;
  const pnl = (entry, price) => {
    const change = long ? price / entry - 1 : 1 - price / entry;
    return (1 + change) * (1 - fee) ** 2 - 1;
  };
  for (const row of rows) {
    if (pos) {
      const hitSl = long ? row.low <= pos.sl : row.high >= pos.sl;
      const hitTp = long ? row.high >= pos.tp : row.low <= pos.tp;
      let exit = null, result = null;
      if (hitSl) { exit = pos.sl; result = "SL"; }
      else if (hitTp) { exit = pos.tp; result = "TP"; }
      else if (C.EXIT_ON_SELL_SIGNAL && (long ? row.crossDown : row.crossUp)) { exit = row.close; result = "REVERSE"; }
      if (exit !== null) {
        // Harga menyentuh level di antara buka dan tutup candle ini.
        trades.push({ ...pos, exit, result, ret: pnl(pos.entry, exit), hitFrom: row.time, hitTo: row.time + step });
        pos = null;
        continue;
      }
    }
    if (!pos && row.signal === entrySignal) {
      pos = {
        side: long ? "LONG" : "SHORT", entry: row.close, entryTime: row.time + step,
        sl: long ? row.stopLoss : row.shortStopLoss, tp: long ? row.takeProfit : row.shortTakeProfit,
      };
    }
  }
  const returns = trades.map((t) => t.ret);
  if (pos) returns.push(pnl(pos.entry, rows[rows.length - 1].close));
  let equity = 1, peak = 1, maxDd = 0;
  for (const x of returns) {
    equity *= 1 + x;
    peak = Math.max(peak, equity);
    maxDd = Math.max(maxDd, 1 - equity / peak);
  }
  return {
    trades: returns.length,
    winRate: returns.length ? returns.filter((x) => x > 0).length / returns.length * 100 : 0,
    return: (equity - 1) * 100,
    maxDd: maxDd * 100,
    tp: trades.filter((t) => t.result === "TP").length,
    sl: trades.filter((t) => t.result === "SL").length,
    closed: trades,
    open: pos,
  };
}

export const sides = () => (C.ENABLE_SHORT ? ["long", "short"] : ["long"]);

function quantile(sorted, q) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q, lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

/** Lama trade sampai kena TP (ms): median, p25, p75, p90, plus persentase kena TP. */
export function tpTiming(closedTrades) {
  const done = closedTrades.filter((t) => t.result === "TP" || t.result === "SL");
  const d = closedTrades.filter((t) => t.result === "TP")
    .map((t) => (t.hitFrom + t.hitTo) / 2 - t.entryTime).sort((a, b) => a - b);
  return {
    samples: d.length,
    total: done.length,
    tpRate: done.length ? d.length / done.length * 100 : NaN,
    median: quantile(d, 0.5), p25: quantile(d, 0.25), p75: quantile(d, 0.75), p90: quantile(d, 0.9),
  };
}

// ---------- Data Binance ----------

const toCandles = (raw) => raw.map((k) => ({
  time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
}));

async function getJson(path, params = {}, fetchImpl = globalThis.fetch) {
  const url = `${BASE_URL}${path}?${new URLSearchParams(params)}`;
  const resp = await fetchImpl(url);
  if (!resp.ok) throw new Error(`Binance ${resp.status} untuk ${path}`);
  return resp.json();
}

/** Candle yang sudah close + candle yang sedang berjalan (terpisah). */
export async function fetchKlines(symbol, interval, limit = C.CANDLE_LIMIT, fetchImpl) {
  const all = toCandles(await getJson("/fapi/v1/klines", { symbol, interval, limit }, fetchImpl));
  return { closed: all.slice(0, -1), live: all[all.length - 1] };
}

/** Kontrak perpetual USDT yang sedang aktif: Set nama simbol. */
export async function fetchPerpetuals(fetchImpl) {
  const info = await getJson("/fapi/v1/exchangeInfo", {}, fetchImpl);
  return new Set(info.symbols
    .filter((s) => s.status === "TRADING" && s.contractType === "PERPETUAL" && s.quoteAsset === "USDT")
    .map((s) => s.symbol));
}

/** N koin dengan volume 24 jam terbesar yang punya kontrak perpetual, tanpa stablecoin. */
export async function topSymbols(n = C.TOP_COINS, fetchImpl) {
  const [tickers, perps] = await Promise.all([getJson("/fapi/v1/ticker/24hr", {}, fetchImpl), fetchPerpetuals(fetchImpl)]);
  return tickers
    .filter((t) => perps.has(t.symbol) && !C.EXCLUDE.includes(t.symbol) && +t.quoteVolume > 0)
    .sort((a, b) => +b.quoteVolume - +a.quoteVolume)
    .slice(0, n)
    .map((t) => ({ symbol: t.symbol, price: +t.lastPrice, change: +t.priceChangePercent, volume: +t.quoteVolume }));
}

export async function fetchTickers(fetchImpl) {
  return getJson("/fapi/v1/ticker/price", {}, fetchImpl);
}

export const tradeUrl = (symbol) => `https://www.binance.bh/en/futures/${symbol}`;

/** Nama koin untuk logo/tampilan: 1000PEPEUSDT -> PEPE. */
export const baseAsset = (symbol) => symbol.replace(/USDT$/, "").replace(/^1000+/, "");

/**
 * Analisis lengkap satu koin di satu timeframe: indikator, sinyal terakhir, posisi bot,
 * hasil backtest, dan perkiraan waktu TP. trendCandles wajib jika usesFilter(interval).
 */
export function analyze(symbol, interval, candles, trendCandles = null) {
  const rows = addIndicators(candles, usesFilter(interval) ? trendCandles : null);
  const result = { symbol, interval, rows, last: rows[rows.length - 1], sides: {} };
  for (const side of sides()) {
    const sim = simulate(rows, side, interval);
    result.sides[side] = { ...sim, timing: tpTiming(sim.closed) };
  }
  return result;
}

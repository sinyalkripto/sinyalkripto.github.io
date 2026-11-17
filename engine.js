// Mesin sinyal versi JavaScript (strategi pullback searah tren, lihat CONFIG).
// Jalan di browser (GitHub Pages) dan di Node (untuk tes). Semua data diambil langsung
// dari API publik Binance Futures (USDT-M) oleh browser pengunjung, tanpa server dan tanpa API key.

import { detectPatterns } from "./pola.js?v=1";

export const CONFIG = {
  // Riset Nov 2026 (README, data Binance Futures Des 2025–Nov 2026): 60 koin ≈ 22 sinyal 1 jam per hari
  // dengan exit dan filter di bawah; 40 koin ≈ 17 sinyal/hari dengan aturan lama.
  TOP_COINS: 60,
  // Selalu ikut dianalisis di luar top koin (emas).
  EXTRA_SYMBOLS: ["XAUUSDT"],
  EXCLUDE: ["USDCUSDT", "FDUSDUSDT", "TUSDUSDT", "USDPUSDT", "DAIUSDT", "EURUSDT",
    "AEURUSDT", "USD1USDT", "XUSDUSDT", "BFUSDUSDT", "RLUSDUSDT", "USDEUSDT",
    "PAXGUSDT", "XAUTUSDT", "WBTCUSDT", "SPCXBUSDT", "SNDKBUSDT", "UUSDT"],
  // Kontrak saham, ETF, dan komoditas di Binance Futures yang namanya tidak berakhiran B (jadi lolos filter
  // token saham). Banyak yang masuk 60 besar volume (Nov 2026). Tidak ikut dipantau.
  TRADFI: ["SOXLUSDT", "SNDKUSDT", "SKHYNIXUSDT", "SPCXUSDT", "CLUSDT", "KORUUSDT", "XAGUSDT", "MUUSDT",
    "BZUSDT", "SKHYUSDT", "SNXXUSDT", "MSTRUSDT", "INTCUSDT", "CRCLUSDT", "GOOGLUSDT", "TSLAUSDT",
    "SAMSUNGUSDT", "QQQUSDT", "DRAMUSDT", "EWYUSDT", "SPYUSDT", "MUUUSDT", "MRVLUSDT", "NBISUSDT", "AMDUSDT",
    "METAUSDT", "TQQQUSDT", "NATGASUSDT", "AAPLUSDT", "AAOIUSDT", "CBRSUSDT", "CRWVUSDT", "WDCUSDT",
    "AXTIUSDT", "INTWUSDT", "ZHIPUUSDT", "UNITREEUSDT", "MVLLUSDT", "COINUSDT", "HOODUSDT", "AMZNUSDT",
    "MSFTUSDT", "PLTRUSDT", "ORCLUSDT", "AVGOUSDT", "TSMUSDT", "NFLXUSDT", "BABAUSDT", "SMCIUSDT", "ARMUSDT"],
  // Daftar blokir: koin yang secara konsisten kena stop loss di sinyal live (catatan pengguna, Nov 2026).
  // Tidak dianalisis dan tidak muncul di situs. Tambah atau hapus nama simbol di sini (format XXXUSDT).
  // NVDAUSDT dan SOXSUSDT adalah token saham/ETF, bukan kripto, dan sebelumnya lolos dari filter token saham.
  BLOCKLIST: ["JCTUSDT", "AKEUSDT", "SOXSUSDT", "AAVEUSDT", "LITUSDT", "NVDAUSDT", "ARIAUSDT", "NEARUSDT"],
  TIMEFRAMES: ["1s", "1m", "3m", "5m", "15m", "30m", "1h", "4h"],
  CANDLE_LIMIT: 1500,
  // Timeframe kecil cukup 1000 candle (lebih ringan untuk batas API).
  FAST_LIMIT: 1000,
  // Strategi "pullback searah tren" (diuji di data 6 bulan, 19 koin; lihat README):
  // masuk saat RSI memantul dari koreksi kecil di dalam tren yang jelas, TP dekat, SL lebih lebar.
  EMA_FAST: 20,
  EMA_SLOW: 50,
  EMA_TREND: 200,
  RSI_PERIOD: 14,
  RSI_PULLBACK_LONG: 40, // long: RSI naik kembali menembus 40
  RSI_PULLBACK_SHORT: 60, // short: RSI turun kembali menembus 60
  ADX_PERIOD: 14,
  ADX_MIN: 20, // hanya saat pasar sedang bertren (bukan sideways)
  TREND_FILTER: "4h",
  ENABLE_SHORT: true,
  ATR_PERIOD: 14,
  STOP_LOSS_ATR: 2.0,
  TAKE_PROFIT_ATR: 1.0,
  // Lewati sinyal yang target TP-nya terlalu kecil dibanding biaya (TP minimal 0,6% dari harga).
  MIN_TAKE_PROFIT_PERCENT: 0.6,
  // Pengaman di bawah 4 jam: lewati sinyal kalau stop loss lebih dari 8% dari harga masuk
  // (koin yang sedang pump/dump liar). Di backtest hampir tidak mengubah hasil, tapi mencegah risiko ekstrem.
  MAX_STOP_LOSS_PERCENT: 8,
  // Posisi yang belum kena TP/SL ditutup setelah sekian candle.
  MAX_HOLD_CANDLES: 48,
  // Setup yang dipakai per timeframe (urutan = prioritas kalau dua setup muncul di candle yang sama).
  // Riset Nov 2026 (README): breakout-retest menambah ±3x sinyal 1 jam dengan win rate dan PF yang sama
  // atau lebih baik; range (mean reversion) menambah sinyal 4 jam. Timeframe lain tetap pullback saja.
  // Range 4 jam dimatikan (riset Nov 2026 tahap 3): di data 12 bulan PF 1,01 dan 0,62 di 3,5 bulan terakhir
  // (sampel lama hanya 48 trade). Kodenya tetap ada kalau ingin diuji lagi.
  SETUPS: { "1h": ["pullback", "retest"], "4h": ["pullback"] },
  // Exit per timeframe untuk pullback dan retest (default: TAKE_PROFIT_ATR / STOP_LOSS_ATR, tanpa breakeven).
  // 1 jam (riset Nov 2026): TP 1,5 ATR, SL 2 ATR, dan SL digeser ke harga masuk (+ biaya) begitu harga sudah
  // jalan setengah jarak ke TP. PF naik dari 1,21 ke 1,26 dengan sinyal sedikit lebih banyak; win rate ±76%.
  // Riset Nov 2026 tahap 3 (data 46 + 71 koin, Des 2025–Nov 2026): TP 1,25 ATR dan breakeven di 40% menaikkan
  // win rate 1 jam dari ±76% ke ±83% di periode uji dengan profit factor sedikit lebih baik.
  // Stop loss 1 jam (tahap 4): di balik swing low/high 20 candle terakhir (support/resistance terdekat)
  // + 0,5 ATR, minimal 2 ATR (sl) dan maksimal 4 ATR (slMax). Jadi SL tidak mepet ke harga masuk
  // kalau support/resistance-nya lebih jauh. Kena SL penuh turun dari ±18% ke ±11% trade.
  EXITS: { "1h": { tp: 1.25, sl: 2, breakevenAt: 0.4, slSwing: 20, slBuffer: 0.5, slMax: 4 } },
  // Filter tambahan per timeframe: tren 4 jam juga harus searah EMA 200 4 jam (harga 4 jam di atas EMA 200
  // untuk long, di bawah untuk short). Membuang ±12% sinyal 1 jam yang paling lemah.
  TREND_EMA200_4H: { "1h": true },
  // Jarak SL baru dari harga masuk setelah breakeven (menutup biaya buka + tutup).
  BREAKEVEN_BUFFER_PERCENT: 0.12,
  DEFAULT_SETUPS: ["pullback"],
  // Breakout-retest: harga tutup menembus high/low 20 candle sebelumnya, lalu dalam 12 candle balik
  // menyentuh level yang ditembus (toleransi 0,25 ATR) dan tutup lagi di sisi breakout dengan candle searah.
  // Syarat tren sama dengan pullback (EMA 20/50, tren 4 jam, ADX), TP 1 ATR, SL 2 ATR.
  RETEST_LOOKBACK: 20,
  RETEST_WINDOW: 12,
  RETEST_TOLERANCE_ATR: 0.25,
  // Range: pasar sideways (ADX < 25), candle sebelumnya tutup di luar Bollinger Band (20, 2) dengan
  // RSI ekstrem (< 30 / > 70), lalu candle ini tutup kembali di dalam band. TP di garis tengah band
  // (maksimal 1 ATR), SL 1,5 ATR, ditutup paksa setelah 12 candle.
  RANGE_ADX_MAX: 25,
  BB_PERIOD: 20,
  BB_STD: 2,
  RANGE_RSI_LONG: 30,
  RANGE_RSI_SHORT: 70,
  RANGE_STOP_LOSS_ATR: 1.5,
  RANGE_TAKE_PROFIT_ATR: 1.0,
  RANGE_MAX_HOLD: 12,
  // Filter pola chart per timeframe (pola.js). Kosong = tidak ada filter. Pilihan:
  // avoidReversal: lewati LONG kalau pola reversal bearish (double/triple top, head & shoulders, rising wedge)
  //   baru saja menembus neckline, dan sebaliknya untuk SHORT.
  // minRoom: lewati sinyal kalau level swing terdekat di arah TP lebih dekat dari minRoom x jarak TP.
  // confirm: "candle" (wajib pola candlestick searah di candle sinyal), "level" (wajib memantul dari
  //   support/resistance), "rejection" (keduanya), "any" (salah satu pola searah).
  // candles: pola candlestick yang dihitung (default semua). setups: setup yang wajib konfirmasi (default semua).
  // avoidOpposite: lewati sinyal kalau candle sinyalnya membentuk pola candlestick berlawanan arah.
  // Riset Nov 2026 tahap 5 (README): sinyal breakout-retest 1 jam hanya diambil kalau candle sinyalnya
  // engulfing, pin bar, atau tweezer searah (penolakan yang jelas di level retest). PF naik di periode latih
  // dan uji, di 60 koin utama dan di 70 koin lain, dan 10 dari 12 bulan; sinyal 1 jam turun ±50%.
  // Filter lain (hindari pola reversal, ruang ke resistance, wajib di support, pullback + candle, 4 jam)
  // tidak konsisten di kedua kelompok koin, jadi tidak dipakai.
  PATTERNS: { "1h": { confirm: "candle", candles: ["engulfing", "pinbar", "tweezer"], setups: ["retest"] } },
  EXIT_ON_SELL_SIGNAL: false,
  FEE_PERCENT: 0.05,
};

const C = CONFIG;
export const INTERVAL_MS = { "1s": 1e3, "1m": 6e4, "3m": 18e4, "5m": 3e5, "15m": 9e5, "30m": 18e5, "1h": 36e5, "4h": 144e5, "1d": 864e5 };

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

/** ADX (Wilder) + arah DI: { adx[], plus[], minus[] }. */
export function adx(candles, period = 14) {
  const n = candles.length, tr = new Array(n), pdm = new Array(n), mdm = new Array(n);
  for (let i = 0; i < n; i++) {
    const k = candles[i];
    if (!i) { tr[i] = k.high - k.low; pdm[i] = 0; mdm[i] = 0; continue; }
    const p = candles[i - 1], up = k.high - p.high, dn = p.low - k.low;
    tr[i] = Math.max(k.high - k.low, Math.abs(k.high - p.close), Math.abs(k.low - p.close));
    pdm[i] = up > dn && up > 0 ? up : 0;
    mdm[i] = dn > up && dn > 0 ? dn : 0;
  }
  const a = ewm(tr, 1 / period), plus = ewm(pdm, 1 / period).map((x, i) => 100 * x / a[i]);
  const minus = ewm(mdm, 1 / period).map((x, i) => 100 * x / a[i]);
  const dx = plus.map((x, i) => (x + minus[i] ? 100 * Math.abs(x - minus[i]) / (x + minus[i]) : 0));
  return { adx: ewm(dx, 1 / period), plus, minus };
}

// ---------- Sinyal ----------

/** Tren per candle dari timeframe besar, hanya memakai candle tren yang sudah close. */
export function alignTrend(candles, trendCandles, ema200 = false) {
  const tc = trendCandles.map((k) => k.close);
  const fast = ema(tc, C.EMA_FAST), slow = ema(tc, C.EMA_SLOW), long = ema200 ? ema(tc, C.EMA_TREND) : null;
  const diffs = trendCandles.slice(1).map((k, i) => k.time - trendCandles[i].time).sort((a, b) => a - b);
  const step = diffs.length ? diffs[Math.floor((diffs.length - 1) / 2)] : 0;
  const out = new Array(candles.length).fill(null);
  let j = -1;
  for (let i = 0; i < candles.length; i++) {
    while (j + 1 < trendCandles.length && trendCandles[j + 1].time + step <= candles[i].time) j++;
    if (j >= 0) out[i] = fast[j] > slow[j] ? (!long || tc[j] > long[j] ? "naik" : "netral") : (!long || tc[j] < long[j] ? "turun" : "netral");
  }
  return out;
}

/** Nama setup untuk tampilan. */
export const SETUP_LABEL = { pullback: "Pullback", retest: "Breakout-retest", range: "Range" };
export const setupsFor = (interval) => C.SETUPS[interval] || C.DEFAULT_SETUPS;
/** Aturan exit pullback/retest per timeframe: {tp, sl (kelipatan ATR), breakevenAt (bagian jarak TP) atau null}. */
export const exitFor = (interval) => ({ tp: C.TAKE_PROFIT_ATR, sl: C.STOP_LOSS_ATR, breakevenAt: null, ...(C.EXITS[interval] || {}), trend200: !!C.TREND_EMA200_4H?.[interval], patterns: C.PATTERNS?.[interval] || null });

/** Rata-rata dan simpangan baku bergulir (populasi), NaN sebelum cukup data. */
function rolling(values, period) {
  const mean = new Array(values.length).fill(NaN), sd = new Array(values.length).fill(NaN);
  for (let i = period - 1; i < values.length; i++) {
    let s = 0, q = 0;
    for (let j = i - period + 1; j <= i; j++) { s += values[j]; q += values[j] * values[j]; }
    const m = s / period;
    mean[i] = m; sd[i] = Math.sqrt(Math.max(0, q / period - m * m));
  }
  return { mean, sd };
}

/**
 * candles: [{time(ms, open time), open, high, low, close, volume}] candle yang sudah close.
 * Setup (CONFIG.SETUPS, per timeframe):
 * - pullback: tren naik (EMA 20 > EMA 50, harga di atas EMA 200, tren 4 jam naik, ADX >= 20), lalu RSI
 *   naik kembali menembus 40 (koreksi selesai). SHORT kebalikannya (RSI turun menembus 60).
 * - retest: breakout high 20 candle, lalu retest level itu (lihat CONFIG.RETEST_*), searah tren.
 * - range: pantulan dari luar Bollinger Band saat pasar sideways (lihat CONFIG.RANGE_*).
 * Tiap baris membawa SL/TP dan batas lama posisi milik setup yang memicu sinyal di baris itu.
 */
export function addIndicators(candles, trendCandles = null, maxSlPercent = trendCandles ? C.MAX_STOP_LOSS_PERCENT : Infinity, setups = C.DEFAULT_SETUPS, exit = exitFor(null)) {
  const close = candles.map((k) => k.close);
  const emaFast = ema(close, C.EMA_FAST), emaSlow = ema(close, C.EMA_SLOW), emaTrend = ema(close, C.EMA_TREND);
  const r = rsi(close, C.RSI_PERIOD), a = atr(candles, C.ATR_PERIOD), x = adx(candles, C.ADX_PERIOD).adx;
  const trend = trendCandles ? alignTrend(candles, trendCandles, exit.trend200) : null;
  const shortOn = C.ENABLE_SHORT;
  const useRetest = setups.includes("retest"), useRange = setups.includes("range");
  const bb = useRange ? rolling(close, C.BB_PERIOD) : null;
  const bbUp = (i) => bb.mean[i] + C.BB_STD * bb.sd[i], bbLo = (i) => bb.mean[i] - C.BB_STD * bb.sd[i];
  // Status breakout untuk setup retest: level yang ditembus dan candle tempat breakout terjadi.
  let upLevel = NaN, upAt = -Infinity, dnLevel = NaN, dnAt = -Infinity;
  const N = C.RETEST_LOOKBACK;
  // Pola chart per candle (pola.js): dipakai filter CONFIG.PATTERNS dan ditampilkan di situs.
  const pola = detectPatterns(candles, a);
  const pf = exit.patterns;
  /** Lolos filter pola untuk arah ini? tpAtr: jarak TP dalam ATR. */
  const polaOk = (i, long, tpAtr, setup) => {
    if (!pf) return true;
    const f = pola[i], s = long ? "bull" : "bear", o = long ? "bear" : "bull";
    const okCandle = (name) => !!name && (!pf.candles || pf.candles.includes(name));
    if (pf.avoidReversal && f.reversal[o]) return false;
    if (pf.avoidOpposite && okCandle(f.candle[o])) return false;
    if (pf.minRoom && (long ? f.roomUp : f.roomDown) < pf.minRoom * tpAtr) return false;
    if (pf.setups && !pf.setups.includes(setup)) return true;
    const cdl = okCandle(f.candle[s]), lvl = long ? f.supportNear : f.resistNear;
    if (pf.confirm === "candle" && !cdl) return false;
    if (pf.confirm === "level" && !lvl) return false;
    if (pf.confirm === "rejection" && !(cdl && lvl)) return false;
    if (pf.confirm === "any" && !(cdl || lvl || f.reversal[s] || f.flag[s])) return false;
    return true;
  };
  return candles.map((k, i) => {
    const warm = i >= C.EMA_TREND && i > 0;
    const strong = x[i] >= C.ADX_MIN;
    const trendUp = emaFast[i] > emaSlow[i] && (!trend || trend[i] === "naik");
    const trendDn = emaFast[i] < emaSlow[i] && (!trend || trend[i] === "turun");
    const sane = (d) => d / k.close * 100 <= maxSlPercent;
    const big = (d) => d / k.close * 100 >= C.MIN_TAKE_PROFIT_PERCENT;
    const found = [];

    // 1) Pullback searah tren.
    const slDist = exit.sl * a[i], tpDist = exit.tp * a[i];
    // Jarak SL per arah: default kelipatan ATR; dengan exit.slSwing di balik swing low (long) / swing high
    // (short) N candle terakhir + buffer, dibatasi antara sl dan slMax ATR.
    const slFor = (long) => {
      if (!exit.slSwing) return slDist;
      let ext = long ? Infinity : -Infinity;
      for (let j = Math.max(0, i - exit.slSwing + 1); j <= i; j++) ext = long ? Math.min(ext, candles[j].low) : Math.max(ext, candles[j].high);
      const d = (long ? k.close - ext : ext - k.close) + (exit.slBuffer || 0) * a[i];
      // Tidak lebih jauh dari batas SL maksimal (MAX_STOP_LOSS_PERCENT) kecuali jarak ATR dasarnya sendiri.
      return Math.max(slDist, Math.min(d, (exit.slMax || exit.sl) * a[i], maxSlPercent / 100 * k.close));
    };
    const slL = slFor(true), slS = slFor(false);
    if (setups.includes("pullback") && warm && strong && big(tpDist)) {
      if (sane(slDist) && trendUp && k.close > emaTrend[i] && r[i - 1] < C.RSI_PULLBACK_LONG && r[i] >= C.RSI_PULLBACK_LONG) found.push(["BELI", "pullback", slL, tpDist, C.MAX_HOLD_CANDLES, exit.breakevenAt]);
      if (sane(slDist) && shortOn && trendDn && k.close < emaTrend[i] && r[i - 1] > C.RSI_PULLBACK_SHORT && r[i] <= C.RSI_PULLBACK_SHORT) found.push(["SHORT", "pullback", slS, tpDist, C.MAX_HOLD_CANDLES, exit.breakevenAt]);
    }

    // 2) Breakout-retest.
    if (useRetest && i >= N) {
      let hh = -Infinity, ll = Infinity;
      for (let j = i - N; j < i; j++) { hh = Math.max(hh, candles[j].high); ll = Math.min(ll, candles[j].low); }
      const brkUp = k.close > hh, brkDn = k.close < ll;
      let rtUp = false, rtDn = false;
      const tol = C.RETEST_TOLERANCE_ATR * a[i];
      if (!brkUp && i - upAt >= 1 && i - upAt <= C.RETEST_WINDOW && k.low <= upLevel + tol && k.close > upLevel && k.close > k.open) { rtUp = true; upAt = -Infinity; }
      if (!brkDn && i - dnAt >= 1 && i - dnAt <= C.RETEST_WINDOW && k.high >= dnLevel - tol && k.close < dnLevel && k.close < k.open) { rtDn = true; dnAt = -Infinity; }
      if (brkUp) { upLevel = hh; upAt = i; }
      if (brkDn) { dnLevel = ll; dnAt = i; }
      if (warm && strong && big(tpDist)) {
        if (sane(slDist) && rtUp && trendUp) found.push(["BELI", "retest", slL, tpDist, C.MAX_HOLD_CANDLES, exit.breakevenAt]);
        if (sane(slDist) && rtDn && shortOn && trendDn) found.push(["SHORT", "retest", slS, tpDist, C.MAX_HOLD_CANDLES, exit.breakevenAt]);
      }
    }

    // 3) Range (mean reversion) saat sideways.
    if (useRange && warm && i >= C.BB_PERIOD && x[i] < C.RANGE_ADX_MAX) {
      const mid = bb.mean[i], prev = candles[i - 1].close;
      const sl = C.RANGE_STOP_LOSS_ATR * a[i];
      const tp = Math.min(Math.abs(mid - k.close), C.RANGE_TAKE_PROFIT_ATR * a[i]);
      if (big(tp) && sane(sl)) {
        if (prev < bbLo(i - 1) && k.close > bbLo(i) && r[i - 1] < C.RANGE_RSI_LONG && mid > k.close) found.push(["BELI", "range", sl, tp, C.RANGE_MAX_HOLD]);
        if (shortOn && prev > bbUp(i - 1) && k.close < bbUp(i) && r[i - 1] > C.RANGE_RSI_SHORT && mid < k.close) found.push(["SHORT", "range", sl, tp, C.RANGE_MAX_HOLD]);
      }
    }

    // Satu sinyal per candle: setup pertama (urutan CONFIG.SETUPS) yang terpenuhi dan lolos filter pola.
    const pick = found.filter((f) => polaOk(i, f[0] === "BELI", f[3] / a[i], f[1])).sort((p, q) => setups.indexOf(p[1]) - setups.indexOf(q[1]))[0];
    const [signal, setup, sl, tp, maxHold, breakevenAt] = pick || ["TAHAN", null, slDist, tpDist, C.MAX_HOLD_CANDLES, null];
    return {
      ...k, emaFast: emaFast[i], emaSlow: emaSlow[i], emaTrend: emaTrend[i], rsi: r[i], atr: a[i], adx: x[i],
      bbMid: bb ? bb.mean[i] : NaN, bbUpper: bb ? bbUp(i) : NaN, bbLower: bb ? bbLo(i) : NaN,
      stopLoss: k.close - sl, takeProfit: k.close + tp,
      shortStopLoss: k.close + sl, shortTakeProfit: k.close - tp,
      // Dipakai EXIT_ON_SELL_SIGNAL: tren kecil berbalik.
      crossUp: warm && emaFast[i] > emaSlow[i] && i > 0 && emaFast[i - 1] <= emaSlow[i - 1],
      crossDown: warm && emaFast[i] < emaSlow[i] && i > 0 && emaFast[i - 1] >= emaSlow[i - 1],
      trend: trend ? trend[i] : null, signal, setup, maxHold, breakevenAt: breakevenAt ?? null, pola: pola[i],
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
  let pos = null, held = 0;
  const pnl = (entry, price) => {
    const change = long ? price / entry - 1 : 1 - price / entry;
    return (1 + change) * (1 - fee) ** 2 - 1;
  };
  for (const row of rows) {
    if (pos) {
      held++;
      const hitSl = long ? row.low <= pos.sl : row.high >= pos.sl;
      const hitTp = long ? row.high >= pos.tp : row.low <= pos.tp;
      let exit = null, result = null;
      if (hitSl) { exit = pos.sl; result = "SL"; }
      else if (hitTp) { exit = pos.tp; result = "TP"; }
      else if (C.EXIT_ON_SELL_SIGNAL && (long ? row.crossDown : row.crossUp)) { exit = row.close; result = "REVERSE"; }
      else if (held >= pos.maxHold) { exit = row.close; result = "WAKTU"; }
      if (exit === null && pos.breakevenAt && !pos.breakeven) {
        // Harga sudah jalan sekian bagian ke TP: SL digeser ke harga masuk + biaya (berlaku mulai candle berikutnya).
        const fav = long ? row.high - pos.entry : pos.entry - row.low;
        if (fav >= pos.breakevenAt * Math.abs(pos.tp - pos.entry)) {
          const buf = C.BREAKEVEN_BUFFER_PERCENT / 100;
          pos.sl = long ? pos.entry * (1 + buf) : pos.entry * (1 - buf);
          pos.breakeven = true;
        }
      }
      if (exit !== null) {
        if (result === "SL" && pos.breakeven) result = "BE";
        // Harga menyentuh level di antara buka dan tutup candle ini.
        trades.push({ ...pos, exit, result, ret: pnl(pos.entry, exit), hitFrom: row.time, hitTo: row.time + step });
        pos = null;
        continue;
      }
    }
    if (!pos && row.signal === entrySignal) {
      held = 0;
      pos = {
        side: long ? "LONG" : "SHORT", entry: row.close, entryTime: row.time + step,
        sl: long ? row.stopLoss : row.shortStopLoss, tp: long ? row.takeProfit : row.shortTakeProfit,
        setup: row.setup, maxHold: row.maxHold ?? C.MAX_HOLD_CANDLES,
        breakevenAt: row.breakevenAt ?? null, breakeven: false, sl0: long ? row.stopLoss : row.shortStopLoss,
        // Pola candlestick searah di candle sinyal (pola.js), untuk tampilan.
        pattern: row.pola?.candle[long ? "bull" : "bear"] ?? null,
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
  const gain = returns.filter((x) => x > 0).reduce((a, x) => a + x, 0);
  const loss = -returns.filter((x) => x <= 0).reduce((a, x) => a + x, 0);
  return {
    trades: returns.length,
    winRate: returns.length ? returns.filter((x) => x > 0).length / returns.length * 100 : 0,
    // Profit factor: total untung / total rugi. Di atas 1 berarti untung bersih setelah biaya.
    profitFactor: loss ? gain / loss : gain ? Infinity : NaN,
    gain, loss,
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

// ---------- Data pasar ----------

const toCandles = (raw) => raw.map((k) => ({
  time: k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
}));

/** Catatan percobaan koneksi (untuk diagnosis: buka situs dengan ?debug). */
export const attempts = [];

async function fetchWithTimeout(fetchImpl, url, ms) {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctl && setTimeout(() => ctl.abort(), ms);
  try { return await fetchImpl(url, ctl ? { signal: ctl.signal } : undefined); } finally { if (timer) clearTimeout(timer); }
}

async function fetchJson(url, fetchImpl = globalThis.fetch, ms = 15000) {
  const t0 = Date.now();
  try {
    const resp = await fetchWithTimeout(fetchImpl, url, ms);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (attempts.length < 60) attempts.push({ url, ok: true, ms: Date.now() - t0 });
    return json;
  } catch (e) {
    const msg = e.name === "AbortError" ? "timeout (tidak ada jawaban)" : String(e.message || e);
    attempts.push({ url, ok: false, ms: Date.now() - t0, error: msg });
    throw new Error(msg);
  }
}

// ---------- Sumber data ----------
// Dicoba berurutan; yang pertama menjawab dipakai terus. Di beberapa jaringan (misalnya ISP di
// Indonesia) domain binance.com diblokir, jadi ada cadangan: Bybit (kontrak perpetual USDT, harga
// futures juga) dan terakhir Binance Spot lewat domain binance.vision.

const BYBIT_TF = { "1m": "1", "3m": "3", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D" };

function binanceSource(name, base, kind, prefix) {
  const get = (path, params, f) => fetchJson(`${base}${prefix}${path}?${new URLSearchParams(params)}`, f);
  return {
    name, kind, base,
    probe: (f) => fetchJson(`${base}${prefix}/ping`, f, 7000),
    klines: async (symbol, interval, limit, f) =>
      toCandles(await get("/klines", { symbol, interval, limit: kind === "spot" ? Math.min(limit, 1000) : limit }, f)),
    // [{symbol, price, change(%), volume(USDT)}]
    tickers24: async (f) => (await get("/ticker/24hr", {}, f))
      .map((t) => ({ symbol: t.symbol, price: +t.lastPrice, change: +t.priceChangePercent, volume: +t.quoteVolume })),
    prices: async (f) => (await get("/ticker/price", {}, f)).map((t) => ({ symbol: t.symbol, price: +t.price })),
    // Futures: kontrak perpetual USDT aktif. Spot: pasangan USDT aktif.
    symbols: async (f) => new Set((await get("/exchangeInfo", {}, f)).symbols
      .filter((x) => x.status === "TRADING" && x.quoteAsset === "USDT" && (kind === "spot" || x.contractType === "PERPETUAL"))
      .map((x) => x.symbol)),
    aggTrades: kind === "futures" ? (params, f) => get("/aggTrades", params, f) : null,
  };
}

function bybitSource(name, base) {
  const get = async (path, params, f) => {
    const j = await fetchJson(`${base}/v5/market${path}?${new URLSearchParams({ category: "linear", ...params })}`, f);
    if (j.retCode !== 0) throw new Error(`Bybit: ${j.retMsg}`);
    return j.result;
  };
  return {
    name, kind: "futures", base,
    probe: (f) => fetchJson(`${base}/v5/market/time`, f, 7000),
    klines: async (symbol, interval, limit, f) => {
      // Bybit: maks 1000 per permintaan, urutan terbaru dulu.
      const r = await get("/kline", { symbol, interval: BYBIT_TF[interval], limit: Math.min(limit, 1000) }, f);
      return toCandles(r.list.map((k) => [+k[0], k[1], k[2], k[3], k[4], k[5]]).reverse());
    },
    tickers24: async (f) => (await get("/tickers", {}, f)).list
      .map((t) => ({ symbol: t.symbol, price: +t.lastPrice, change: +t.price24hPcnt * 100, volume: +t.turnover24h })),
    prices: async (f) => (await get("/tickers", {}, f)).list.map((t) => ({ symbol: t.symbol, price: +t.lastPrice })),
    symbols: async (f) => new Set((await get("/instruments-info", { limit: 1000 }, f)).list
      .filter((x) => x.status === "Trading" && x.contractType === "LinearPerpetual" && x.quoteCoin === "USDT")
      .map((x) => x.symbol)),
    aggTrades: null,
  };
}

export const SOURCES = [
  binanceSource("Binance Futures", "https://fapi.binance.com", "futures", "/fapi/v1"),
  bybitSource("Bybit Futures", "https://api.bybit.com"),
  bybitSource("Bybit Futures", "https://api.bytick.com"),
  binanceSource("Binance Spot", "https://data-api.binance.vision", "spot", "/api/v3"),
];
let source = null;
/** Sumber yang sedang dipakai: {name, kind} atau null kalau belum tersambung. */
export const dataSource = () => source;

/** Pilih sumber pertama yang menjawab. Dipanggil otomatis oleh semua fungsi data. */
export async function connect(fetchImpl, sources = SOURCES) {
  if (source) return source;
  const errors = [];
  for (const src of sources) {
    try { await src.probe(fetchImpl); source = src; return src; } catch (e) { errors.push(`${src.name} (${new URL(src.base).host}): ${e.message}`); }
  }
  throw new Error(`Semua sumber data gagal dihubungi: ${errors.join("; ")}`);
}
/** Untuk tes: lupakan sumber yang terpilih. */
export const resetSource = () => { source = null; };

/** Jumlah candle per timeframe. */
export const candleLimit = (interval) => (INTERVAL_MS[interval] < INTERVAL_MS["15m"] ? C.FAST_LIMIT : C.CANDLE_LIMIT);

/** Candle yang sudah close + candle yang sedang berjalan (terpisah). */
export async function fetchKlines(symbol, interval, limit = candleLimit(interval), fetchImpl) {
  if (interval === "1s") return splitLive(await fetchTradeCandles(symbol, fetchImpl));
  const src = await connect(fetchImpl);
  return splitLive(await src.klines(symbol, interval, limit, fetchImpl));
}
const splitLive = (all) => ({ closed: all.slice(0, -1), live: all[all.length - 1] });

// ---------- Candle 1 detik ----------
// Binance Futures tidak punya kline 1 detik, jadi candle 1 detik dirakit sendiri dari
// transaksi (aggTrades) Futures: riwayat lewat REST, lalu disambung live lewat WebSocket.

/** Rakit candle per `step` ms dari transaksi [{p, q, T}]; detik tanpa transaksi diisi candle datar. */
export function tradesToCandles(trades, step = 1000, maxCandles = C.FAST_LIMIT) {
  const map = new Map();
  for (const t of trades) addTrade(map, t, step);
  return candlesFromMap(map, step, maxCandles);
}
export function addTrade(map, t, step = 1000) {
  const time = Math.floor(t.T / step) * step, p = +t.p, q = +t.q;
  const k = map.get(time);
  if (!k) map.set(time, { time, open: p, high: p, low: p, close: p, volume: q, lastT: t.T, maxA: t.a ?? -1 });
  else {
    k.high = Math.max(k.high, p); k.low = Math.min(k.low, p); k.volume += q; k.maxA = Math.max(k.maxA, t.a ?? -1);
    if (t.T >= k.lastT) { k.close = p; k.lastT = t.T; }
  }
}
export function candlesFromMap(map, step = 1000, maxCandles = C.FAST_LIMIT, now = null) {
  const times = [...map.keys()].sort((a, b) => a - b);
  if (!times.length) return [];
  const last = now == null ? times[times.length - 1] : Math.max(times[times.length - 1], Math.floor(now / step) * step);
  const first = Math.max(times[0], last - (maxCandles - 1) * step);
  for (const t of times) if (t < first) map.delete(t);
  const out = [];
  let prev = null;
  for (let t = first; t <= last; t += step) {
    const k = map.get(t);
    if (k) { prev = k; out.push({ time: t, open: k.open, high: k.high, low: k.low, close: k.close, volume: k.volume }); }
    else if (prev) out.push({ time: t, open: prev.close, high: prev.close, low: prev.close, close: prev.close, volume: 0 });
  }
  return out;
}

/** Riwayat transaksi terbaru (maks `pages` x 1000 transaksi) -> Map candle 1 detik. */
export async function fetchTradeMap(symbol, fetchImpl, pages = 10) {
  const src = await connect(fetchImpl);
  if (!src.aggTrades) throw new Error(`Candle 1 detik hanya tersedia dari Binance Futures (sekarang memakai ${src.name})`);
  const getJson = (_path, params, f) => src.aggTrades(params, f);
  const map = new Map();
  let batch = await getJson("/aggTrades", { symbol, limit: 1000 }, fetchImpl);
  for (let i = 0; batch.length; i++) {
    batch.forEach((t) => addTrade(map, t));
    if (i + 1 >= pages || map.size >= C.FAST_LIMIT) break;
    const fromId = Math.max(0, batch[0].a - 1000);
    if (fromId === batch[0].a) break;
    batch = (await getJson("/aggTrades", { symbol, fromId, limit: 1000 }, fetchImpl)).filter((t) => t.a < batch[0].a);
  }
  return map;
}
async function fetchTradeCandles(symbol, fetchImpl) {
  return candlesFromMap(await fetchTradeMap(symbol, fetchImpl), 1000, C.FAST_LIMIT, Date.now());
}

/** Kontrak perpetual USDT yang sedang aktif (pasangan USDT kalau sumbernya Spot): Set nama simbol. */
export async function fetchPerpetuals(fetchImpl) {
  return (await connect(fetchImpl)).symbols(fetchImpl);
}

/** Koin kripto biasa: bukan token saham (NVDAB, TSLAB, …) dan nama simbol ASCII. */
export function isCryptoSymbol(symbol) {
  if (!/^[A-Z0-9]+USDT$/.test(symbol) || C.EXCLUDE.includes(symbol) || C.BLOCKLIST.includes(symbol) || C.TRADFI.includes(symbol)) return false;
  const base = symbol.replace(/USDT$/, "");
  return !(/^[A-Z]{2,5}B$/.test(base) && !["BNB", "ARB", "SHIB", "BEB"].includes(base));
}

/** N kontrak perpetual USDT dengan volume 24 jam terbesar, tanpa stablecoin (CONFIG.EXCLUDE), koin yang diblokir (CONFIG.BLOCKLIST) dan token saham. */
export async function topSymbols(n = C.TOP_COINS, fetchImpl) {
  const src = await connect(fetchImpl);
  const tickers = await src.tickers24(fetchImpl);
  const perps = await src.symbols(fetchImpl);
  const top = tickers
    .filter((t) => isCryptoSymbol(t.symbol) && perps.has(t.symbol) && t.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, n);
  const extras = tickers.filter((t) => C.EXTRA_SYMBOLS.includes(t.symbol) && perps.has(t.symbol) && !top.includes(t));
  return [...top, ...extras];
}

/** Harga terakhir semua simbol: [{symbol, price}]. */
export async function fetchTickers(fetchImpl) {
  return (await connect(fetchImpl)).prices(fetchImpl);
}

export const tradeUrl = (symbol) => `https://www.binance.bh/en/futures/${symbol}`;

/** Nama koin untuk logo/tampilan: 1000PEPEUSDT -> PEPE. */
export const baseAsset = (symbol) => symbol.replace(/USDT$/, "").replace(/^1000+/, "");

/**
 * Analisis lengkap satu koin di satu timeframe: indikator, sinyal terakhir, posisi bot,
 * hasil backtest, dan perkiraan waktu TP. trendCandles wajib jika usesFilter(interval).
 */
export function analyze(symbol, interval, candles, trendCandles = null) {
  const filter = usesFilter(interval) ? trendCandles : null;
  const rows = addIndicators(candles, filter, filter ? C.MAX_STOP_LOSS_PERCENT : Infinity, setupsFor(interval), exitFor(interval));
  const result = { symbol, interval, rows, last: rows[rows.length - 1], sides: {} };
  for (const side of sides()) {
    const sim = simulate(rows, side, interval);
    result.sides[side] = { ...sim, timing: tpTiming(sim.closed) };
  }
  return result;
}

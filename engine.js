// Mesin sinyal versi JavaScript (strategi pullback searah tren, lihat CONFIG).
// Jalan di browser (GitHub Pages) dan di Node (untuk tes). Semua data diambil langsung
// dari API publik Binance Futures (USDT-M) oleh browser pengunjung, tanpa server dan tanpa API key.

import { detectPatterns } from "./pola.js?v=1";

export const CONFIG = {
  // Riset Nov 2026 (README, data Binance Futures Des 2025–Nov 2026): 60 koin ≈ 22 sinyal 1 jam per hari
  // dengan exit dan filter di bawah; 40 koin ≈ 17 sinyal/hari dengan aturan lama.
  // Tahap 11 (20 Nov 2026): 60 -> 100 koin supaya sinyal 1 jam lebih banyak (±3 -> ±6 per hari di uji Agu–Nov 2026).
  // Koin peringkat 61–100 sendiri: PF 1,88 latih / 2,27 uji, jadi tambahan sinyalnya tetap untung di uji historis.
  TOP_COINS: 100,
  // Timeframe kecil (eksperimen) memindai lebih banyak koin: TOP_COINS_FAST koin teratas. Koin di luar TOP_COINS hanya
  // dianalisis di FAST_TIMEFRAMES (plus 4 jam untuk filter tren), tidak muncul di daftar koin, tapi sinyalnya tampil.
  // Tahap 10: 5m/15m/30m dimatikan (FAST_TIMEFRAMES kosong). Tahap 11: sama dengan TOP_COINS (100).
  TOP_COINS_FAST: 100,
  FAST_TIMEFRAMES: [],
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
    "MSFTUSDT", "PLTRUSDT", "ORCLUSDT", "AVGOUSDT", "TSMUSDT", "NFLXUSDT", "BABAUSDT", "SMCIUSDT", "ARMUSDT",
    // Tahap 10 (20 Nov 2026): saham, ETF, dan komoditas yang lolos ke 130 besar volume. Ciri: candle akhir pekan
    // ±0,25–0,5x candle hari kerja (koin kripto ±0,6–0,75x). COHR sendiri kena SL 4 kali di 19–20 Nov.
    "COHRUSDT", "IRENUSDT", "TTWOUSDT", "LITEUSDT", "CRDOUSDT", "MRNAUSDT", "BEUSDT", "QCOMUSDT", "GLWUSDT",
    "DELLUSDT", "MINIMAXUSDT", "ZHONGJIUSDT", "CXMTUSDT", "BMNRUSDT", "STRCUSDT", "SQQQUSDT", "UVXYUSDT",
    "NVDLUSDT", "MSTUUSDT", "BITOUSDT", "SKDDUSDT", "SKUUUSDT", "RAMUSDT", "CSOPSKHYNIX2LUSDT", "XPTUSDT", "COPPERUSDT"],
  // Daftar blokir: koin yang secara konsisten kena stop loss di sinyal live (catatan pengguna, Nov 2026).
  // Tidak dianalisis dan tidak muncul di situs. Tambah atau hapus nama simbol di sini (format XXXUSDT).
  // NVDAUSDT dan SOXSUSDT adalah token saham/ETF, bukan kripto, dan sebelumnya lolos dari filter token saham.
  BLOCKLIST: ["JCTUSDT", "AKEUSDT", "SOXSUSDT", "AAVEUSDT", "LITUSDT", "NVDAUSDT", "ARIAUSDT", "NEARUSDT"],
  // 1m dan 3m dimatikan (evaluasi live 14–19 Nov 2026: PF 0,81 dan 0,59, sama dengan uji historis).
  // Tahap 10 (20 Nov 2026): 5m, 15m, 30m juga dimatikan. Uji Agu–19 Nov 2026 (100 koin, aturan situs): PF 0,84–0,86 (5m),
  // 0,82–0,92 (15m), 0,78–1,13 (30m) di periode uji, ±31–33% trade kena SL penuh sejak Okt (1 jam: ±4%).
  // 4 jam juga dimatikan (hasil live 14–20 Nov: 16 trade, PF 0,38, −59%, termasuk short HUMA −17,6%; uji historis PF ±1,05).
  // Candle 4 jam tetap dimuat dan diperbarui untuk filter tren 1 jam (TREND_FILTER), hanya sinyalnya yang tidak ditampilkan.
  // Tahap 13 (24 Nov 2026, permintaan pengguna): 5m, 15m, 30m, dan 4 jam ditampilkan lagi sebagai "eksperimen" walau di uji
  // historis PF-nya di bawah atau sekitar 1 (lihat tahap 10 di atas). 1m/3m tetap mati. 1 jam tetap timeframe utama.
  // Hapus timeframe dari daftar ini untuk mematikannya lagi.
  TIMEFRAMES: ["1s", "5m", "15m", "30m", "1h", "4h"],
  // Tahap 12 (23 Nov 2026): 1500 -> 1000 candle. Di Binance Futures 1000 candle berbobot 5 (1500: 10), jadi memuat 100 koin
  // tidak lagi mendekati batas 2400 bobot/menit (penyebab situs "down" saat dimuat ulang). Sinyal terakhir tidak berubah
  // (EMA 200 sudah stabil jauh sebelum 1000 candle); angka backtest di situs memakai riwayat yang lebih pendek.
  CANDLE_LIMIT: 1000,
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
  // Tahap 8: TP 1 jam 1,25 -> 0,75 ATR (bersama filter konsensus, lihat CONSENSUS).
  EXITS: { "1h": { tp: 0.75, sl: 2, breakevenAt: 0.4, slSwing: 20, slBuffer: 0.5, slMax: 4 } },
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
  // Koin besar (Nov 2026, tahap 6): BTC, ETH, BNB geraknya pelan dan dengan filter di atas hanya dapat ±1 sinyal
  // per minggu per koin. Untuk koin ini wajib-pola diganti jadi "tolak pola lawan": sinyal tetap diambil, kecuali
  // candle sinyalnya engulfing/pin bar/tweezer berlawanan arah. Uji Des 2025–Nov 2026 (3 koin): sinyal 0,5 → 1,05
  // per hari, PF latih 0,61 → 0,90, PF uji 2,68 → 2,40, total untung uji +6% → +17%. Kosongkan untuk mematikan.
  MAJORS: ["BTCUSDT", "ETHUSDT", "BNBUSDT"],
  PATTERNS_MAJORS: { "1h": { avoidOpposite: true, candles: ["engulfing", "pinbar", "tweezer"] } },
  // Tahap 8: koin besar tetap memakai TP 1,25 ATR dan tidak ikut filter konsensus. Di BTC/ETH/BNB konsensus 2 koin + TP 1 ATR
  // sudah menurunkan PF 1 jam dari 1,08 ke 0,70 (313 → 161 trade, Des 2025–18 Nov 2026).
  EXITS_MAJORS: { "1h": { tp: 1.25 } },
  // Filter koin liar (evaluasi live 14–19 Nov 2026): lewati sinyal kalau harga sudah bergerak lebih dari
  // move24h % dalam 24 jam terakhir, atau ATR sekarang lebih dari atrRatio x rata-rata ATR 200 candle.
  // Tahap 7 (README): tidak membantu secara konsisten di 5m–4h, jadi tidak dipakai (null = mati).
  VOL_FILTER: { move24h: null, atrRatio: null },
  // Filter pantulan per timeframe (tahap 9, kasus short HUMA 19 Nov 2026). Opsi (n = jumlah candle, default 10):
  // volX: lewati sinyal kalau ada candle dengan volume > volX x rata-rata volume (EMA 100) dalam n candle terakhir
  //   (lonjakan volume = koin baru dipompa/didump, arah gampang berbalik). Berlaku untuk long dan short.
  // rsiExt: SHORT dilewati kalau RSI terendah n candle < rsiExt (LONG: tertinggi > 100 - rsiExt); emaAtr: harga
  //   lebih dari emaAtr ATR dari EMA 200; bounceAtr: harga sudah lebih dari bounceAtr ATR dari low/high n candle;
  //   sides: ["short"] untuk satu arah saja. Ketiganya diuji, tidak konsisten, jadi tidak dipakai.
  // Tahap 9 (README, riset/uji-tahap9.mjs, 153 koin, Des 2025–19 Nov 2026): volume > 8x di 4 jam menaikkan PF di
  // kedua kelompok koin, latih dan uji, dan 9 dari 12 bulan; sinyal 4 jam turun ±8%. Di 1 jam tidak membantu.
  BOUNCE_FILTER: { "4h": { volX: 8 } },
  // Filter arah BTC untuk timeframe di tfs: long hanya kalau BTC 1 jam naik (EMA 20 > EMA 50), short hanya
  // kalau BTC 1 jam turun. BTC sendiri tidak difilter. Tahap 7 (README, 108 koin, Des 2025–18 Nov 2026):
  // 1 jam PF naik di kedua kelompok koin, latih dan uji, dan 11 dari 12 bulan; sinyal turun ±26%.
  // Di 5m/15m/30m/4h tidak membantu, jadi hanya 1 jam.
  BTC_FILTER: { tfs: ["1h"], symbol: "BTCUSDT", interval: "1h" },
  // Konsensus per timeframe (tahap 8): sinyal hanya diambil kalau di candle yang sama minimal sekian koin yang
  // dipantau memberi sinyal searah (dihitung dari semua koin, lihat signalCounts/applyConsensus). Kosong = mati.
  // Tahap 8 (README, 60 koin teratas + 48 koin lain, Des 2025–18 Nov 2026): minimal 3 koin + TP 0,75 ATR menaikkan
  // win rate 1 jam (impas tidak dihitung) dari 74%/82% ke 85%/90% (latih/uji) dan PF dari 1,21/1,73 ke 1,74/2,25;
  // sinyal turun dari ±9,5 ke ±4 per hari.
  // Tahap 12 (23 Nov 2026): 3 -> 2 koin supaya sinyal lebih banyak. Di uji tahap 11 (100 koin, latih Des 2025–Jul 2026, uji Agu–19 Nov
  // 2026): ±6 -> ±8,5 sinyal/hari, PF latih 1,56 -> 1,38, PF uji 2,33 -> 1,89, trade rugi > 0,5% 5% -> 6%. Kembalikan ke 3 kalau
  // ingin lebih sedikit sinyal dengan PF lebih tinggi.
  CONSENSUS: { "1h": 2 },
  EXIT_ON_SELL_SIGNAL: false,
  FEE_PERCENT: 0.05,
};

const C = CONFIG;
// Versi aturan sinyal; dicatat di tiap trade "Hasil live" supaya evaluasi bisa dipisah per versi.
export const ENGINE_VERSION = "tahap13";
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
export const exitFor = (interval, symbol = null) => ({ tp: C.TAKE_PROFIT_ATR, sl: C.STOP_LOSS_ATR, breakevenAt: null, ...(C.EXITS[interval] || {}), ...(isMajor(symbol) ? C.EXITS_MAJORS?.[interval] || {} : {}), trend200: !!C.TREND_EMA200_4H?.[interval], patterns: patternsFor(interval, symbol), interval });
const isMajor = (symbol) => !!symbol && !!C.MAJORS?.includes(symbol);
/** Filter pola per timeframe; koin di CONFIG.MAJORS memakai CONFIG.PATTERNS_MAJORS kalau ada untuk timeframe itu. */
export const patternsFor = (interval, symbol = null) => (symbol && C.MAJORS?.includes(symbol) && C.PATTERNS_MAJORS?.[interval]) || C.PATTERNS?.[interval] || null;

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
export function addIndicators(candles, trendCandles = null, maxSlPercent = trendCandles ? C.MAX_STOP_LOSS_PERCENT : Infinity, setups = C.DEFAULT_SETUPS, exit = exitFor(null), btcCandles = null) {
  const close = candles.map((k) => k.close);
  const emaFast = ema(close, C.EMA_FAST), emaSlow = ema(close, C.EMA_SLOW), emaTrend = ema(close, C.EMA_TREND);
  const r = rsi(close, C.RSI_PERIOD), a = atr(candles, C.ATR_PERIOD), x = adx(candles, C.ADX_PERIOD).adx;
  const trend = trendCandles ? alignTrend(candles, trendCandles, exit.trend200) : null;
  // Arah BTC (CONFIG.BTC_FILTER) per candle, hanya candle BTC yang sudah close.
  const btc = btcCandles?.length ? alignTrend(candles, btcCandles) : null;
  // Filter koin liar (CONFIG.VOL_FILTER).
  const vf = C.VOL_FILTER || {};
  const n24 = exit.interval && INTERVAL_MS[exit.interval] ? Math.round(864e5 / INTERVAL_MS[exit.interval]) : 0;
  const atrAvg = vf.atrRatio ? ema(a, 200) : null;
  const wild = (i) => (vf.move24h && n24 && i >= n24 && Math.abs(close[i] / close[i - n24] - 1) * 100 > vf.move24h)
    || (vf.atrRatio && i >= 200 && a[i] > vf.atrRatio * atrAvg[i - 1]);
  const bf = C.BOUNCE_FILTER?.[exit.interval] || C.BOUNCE_FILTER?.all || {};
  const bN = bf.n || 10;
  const vAvg = bf.volX ? ema(candles.map((k) => k.volume), 100) : null;
  /** Sinyal arah long/short ini melawan pantulan tajam (CONFIG.BOUNCE_FILTER)? */
  const bounced = (i, long) => {
    if (bf.sides && !bf.sides.includes(long ? "long" : "short")) return false;
    const from = Math.max(0, i - bN + 1);
    if (bf.rsiExt) { let e = long ? -Infinity : Infinity; for (let j = from; j <= i; j++) e = long ? Math.max(e, r[j]) : Math.min(e, r[j]); if (long ? e > 100 - bf.rsiExt : e < bf.rsiExt) return true; }
    if (bf.emaAtr && (long ? close[i] - emaTrend[i] : emaTrend[i] - close[i]) > bf.emaAtr * a[i]) return true;
    if (bf.volX && i > 100) { let m = 0; for (let j = from; j <= i; j++) m = Math.max(m, candles[j].volume); if (m > bf.volX * vAvg[from - 1]) return true; }
    if (bf.bounceAtr) { let e = long ? -Infinity : Infinity; for (let j = from; j <= i; j++) e = long ? Math.max(e, candles[j].high) : Math.min(e, candles[j].low); if ((long ? e - close[i] : close[i] - e) > bf.bounceAtr * a[i]) return true; }
    return false;
  };
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
    const calm = !wild(i);
    const btcOk = (long) => !btc || btc[i] === (long ? "naik" : "turun");
    const pick = found.filter((f) => calm && btcOk(f[0] === "BELI") && !bounced(i, f[0] === "BELI") && polaOk(i, f[0] === "BELI", f[3] / a[i], f[1])).sort((p, q) => setups.indexOf(p[1]) - setups.indexOf(q[1]))[0];
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
  time: +k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5],
}));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Catatan percobaan koneksi (untuk diagnosis: buka situs dengan ?debug). */
export const attempts = [];
const note = (a) => { attempts.push(a); if (attempts.length > 80) attempts.splice(0, attempts.length - 80); };

async function fetchWithTimeout(fetchImpl, url, ms, init) {
  const ctl = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = ctl && setTimeout(() => ctl.abort(), ms);
  try { return await fetchImpl(url, ctl ? { ...init, signal: ctl.signal } : init); } finally { if (timer) clearTimeout(timer); }
}

/** GET (atau POST kalau `body` diisi) JSON. Error membawa `status` (HTTP) supaya bisa dibedakan: diblokir, kena batas, atau simbol salah. */
async function fetchJson(url, fetchImpl = globalThis.fetch, ms = 15000, body) {
  const t0 = Date.now();
  const init = body ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) } : undefined;
  try {
    const resp = await fetchWithTimeout(fetchImpl, url, ms, init);
    if (!resp.ok) {
      const e = new Error(`HTTP ${resp.status}`);
      e.status = resp.status;
      const ra = +resp.headers?.get?.("retry-after");
      if (ra > 0) e.retryAfter = ra * 1000;
      throw e;
    }
    const json = await resp.json();
    note({ url, ok: true, ms: Date.now() - t0 });
    return json;
  } catch (e) {
    const msg = e.name === "AbortError" ? "timeout (tidak ada jawaban)" : String(e.message || e);
    note({ url, ok: false, ms: Date.now() - t0, error: msg });
    const err = new Error(msg);
    err.status = e.status; err.retryAfter = e.retryAfter;
    throw err;
  }
}

/**
 * Pembatas kecepatan per sumber: total "bobot" permintaan dalam `windowMs` tidak lebih dari `capacity`.
 * Dulu 100 koin x 2 timeframe x 1500 candle dimuat sekaligus (±2000 bobot/menit di Binance, batasnya 2400), jadi
 * memuat ulang halaman langsung kena HTTP 429/418 (IP diblokir sementara) dan sinyal tidak pernah muncul.
 */
export function rateLimiter(capacity, windowMs) {
  const log = [];
  let chain = Promise.resolve();
  const take = (cost) => async () => {
    for (;;) {
      const now = Date.now();
      while (log.length && log[0][0] <= now - windowMs) log.shift();
      const used = log.reduce((a, x) => a + x[1], 0);
      if (!log.length || used + cost <= capacity) { log.push([now, cost]); return; }
      await sleep(log[0][0] + windowMs - now + 25);
    }
  };
  return (cost = 1) => (chain = chain.then(take(cost), take(cost)));
}

// ---------- Sumber data ----------
// Semua sumber dicoba bersamaan; dipakai yang paling atas di daftar yang menjawab. Kalau sumber yang dipakai berulang kali
// gagal (diblokir, kena batas, putus), situs otomatis pindah ke sumber berikutnya tanpa perlu dimuat ulang.
// Di beberapa jaringan (misalnya ISP di Indonesia) domain binance.com diblokir, dan Bybit global bisa menolak IP
// Indonesia (sejak ada Bybit Indonesia), jadi cadangannya banyak: OKX, Bitget, Gate (semua kontrak perpetual USDT),
// Binance Spot (binance.vision), dan terakhir Hyperliquid.

const BYBIT_TF = { "1m": "1", "3m": "3", "5m": "5", "15m": "15", "30m": "30", "1h": "60", "4h": "240", "1d": "D" };
const UPPER_TF = { "1m": "1m", "3m": "3m", "5m": "5m", "15m": "15m", "30m": "30m", "1h": "1H", "4h": "4H", "1d": "1D" };

/** Bobot permintaan klines Binance Futures menurut jumlah candle. */
const binanceKlineWeight = (limit) => (limit < 100 ? 1 : limit < 500 ? 2 : limit <= 1000 ? 5 : 10);

function binanceSource(name, base, kind, prefix) {
  // Futures: batas 2400 bobot/menit per IP; dipakai paling banyak 1100 supaya ada sisa untuk tab lain / muat ulang.
  // Spot (binance.vision): batas 6000/menit, klines bobot 2.
  const limit = rateLimiter(kind === "spot" ? 3000 : 1100, 60e3);
  const get = async (path, params, f, cost = 1) => {
    await limit(cost);
    return fetchJson(`${base}${prefix}${path}?${new URLSearchParams(params)}`, f);
  };
  return {
    name, kind, base,
    probe: (f) => fetchJson(`${base}${prefix}/ping`, f, 7000),
    klines: async (symbol, interval, n, f) => {
      const lim = kind === "spot" ? Math.min(n, 1000) : Math.min(n, 1500);
      return toCandles(await get("/klines", { symbol, interval, limit: lim }, f, kind === "spot" ? 2 : binanceKlineWeight(lim)));
    },
    // [{symbol, price, change(%), volume(USDT)}]
    tickers24: async (f) => (await get("/ticker/24hr", {}, f, kind === "spot" ? 80 : 40))
      .map((t) => ({ symbol: t.symbol, price: +t.lastPrice, change: +t.priceChangePercent, volume: +t.quoteVolume })),
    prices: async (f) => (await get("/ticker/price", {}, f, kind === "spot" ? 4 : 2)).map((t) => ({ symbol: t.symbol, price: +t.price })),
    // Futures: kontrak perpetual USDT aktif. Spot: pasangan USDT aktif.
    symbols: async (f) => new Set((await get("/exchangeInfo", {}, f, kind === "spot" ? 20 : 1)).symbols
      .filter((x) => x.status === "TRADING" && x.quoteAsset === "USDT" && (kind === "spot" || x.contractType === "PERPETUAL"))
      .map((x) => x.symbol)),
    aggTrades: kind === "futures" ? (params, f) => get("/aggTrades", params, f, 20) : null,
  };
}

function bybitSource(name, base) {
  const limit = rateLimiter(100, 5e3); // batas 600 permintaan / 5 detik per IP
  const get = async (path, params, f) => {
    await limit(1);
    const j = await fetchJson(`${base}/v5/market${path}?${new URLSearchParams({ category: "linear", ...params })}`, f);
    if (j.retCode !== 0) {
      const e = new Error(`Bybit: ${j.retMsg}`);
      if (j.retCode === 10006 || j.retCode === 10018) e.status = 429; else if (j.retCode === 10001) e.status = 400;
      throw e;
    }
    return j.result;
  };
  return {
    name, kind: "futures", base,
    probe: (f) => get("/time", {}, f).then(() => true),
    klines: async (symbol, interval, n, f) => {
      // Bybit: maks 1000 per permintaan, urutan terbaru dulu.
      const r = await get("/kline", { symbol, interval: BYBIT_TF[interval], limit: Math.min(n, 1000) }, f);
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

// OKX: kontrak BTC-USDT-SWAP <-> BTCUSDT. Candle maks 300 per permintaan (diambil per halaman, terbaru dulu).
function okxSource(name, base) {
  const limit = rateLimiter(30, 2e3); // batas 40 permintaan / 2 detik untuk candle
  const get = async (path, params, f) => {
    await limit(1);
    const j = await fetchJson(`${base}/api/v5${path}?${new URLSearchParams(params)}`, f);
    if (j.code !== "0") { const e = new Error(`OKX: ${j.msg || j.code}`); e.status = j.code === "50011" ? 429 : 400; throw e; }
    return j.data;
  };
  const inst = (symbol) => `${symbol.replace(/USDT$/, "")}-USDT-SWAP`;
  const sym = (instId) => instId.replace(/-USDT-SWAP$/, "USDT");
  const isUsdtSwap = (id) => /-USDT-SWAP$/.test(id);
  return {
    name, kind: "futures", base,
    probe: (f) => get("/public/time", {}, f).then(() => true),
    klines: async (symbol, interval, n, f) => {
      let out = [], after = null;
      while (out.length < n) {
        const p = await get("/market/candles", { instId: inst(symbol), bar: UPPER_TF[interval], limit: 300, ...(after ? { after } : {}) }, f);
        if (!p.length) break;
        out = [...p.map((k) => [+k[0], k[1], k[2], k[3], k[4], k[6]]).reverse(), ...out];
        after = p[p.length - 1][0];
        if (p.length < 300) break;
      }
      return toCandles(out.slice(-n));
    },
    tickers24: async (f) => (await get("/market/tickers", { instType: "SWAP" }, f)).filter((t) => isUsdtSwap(t.instId))
      .map((t) => ({ symbol: sym(t.instId), price: +t.last, change: (+t.last / +t.open24h - 1) * 100, volume: +t.volCcy24h * +t.last })),
    prices: async (f) => (await get("/market/tickers", { instType: "SWAP" }, f)).filter((t) => isUsdtSwap(t.instId))
      .map((t) => ({ symbol: sym(t.instId), price: +t.last })),
    symbols: async (f) => new Set((await get("/public/instruments", { instType: "SWAP" }, f))
      .filter((x) => x.state === "live" && isUsdtSwap(x.instId)).map((x) => sym(x.instId))),
    aggTrades: null,
  };
}

// Bitget: kontrak USDT-M, nama simbol sama dengan Binance (BTCUSDT). Maks 1000 candle per permintaan.
function bitgetSource(name, base) {
  const limit = rateLimiter(10, 1e3); // batas 20 permintaan / detik
  const get = async (path, params, f) => {
    await limit(1);
    const j = await fetchJson(`${base}/api/v2${path}?${new URLSearchParams(params)}`, f);
    if (j.code !== "00000") { const e = new Error(`Bitget: ${j.msg || j.code}`); e.status = j.code === "429" ? 429 : 400; throw e; }
    return j.data;
  };
  const pt = { productType: "usdt-futures" };
  return {
    name, kind: "futures", base,
    probe: (f) => get("/public/time", {}, f).then(() => true),
    klines: async (symbol, interval, n, f) => {
      const r = await get("/mix/market/candles", { ...pt, symbol, granularity: UPPER_TF[interval], limit: Math.min(n, 1000) }, f);
      return toCandles(r.map((k) => [+k[0], k[1], k[2], k[3], k[4], k[5]]).sort((a, b) => a[0] - b[0]));
    },
    tickers24: async (f) => (await get("/mix/market/tickers", pt, f))
      .map((t) => ({ symbol: t.symbol, price: +t.lastPr, change: +t.change24h * 100, volume: +(t.usdtVolume ?? t.quoteVolume) })),
    prices: async (f) => (await get("/mix/market/tickers", pt, f)).map((t) => ({ symbol: t.symbol, price: +t.lastPr })),
    symbols: async (f) => new Set((await get("/mix/market/contracts", pt, f))
      .filter((x) => x.symbolStatus === "normal" && x.quoteCoin === "USDT").map((x) => x.symbol)),
    aggTrades: null,
  };
}

// Gate: kontrak BTC_USDT <-> BTCUSDT. Maks 2000 candle per permintaan, waktu dalam detik.
function gateSource(name, base) {
  const limit = rateLimiter(100, 10e3); // batas 200 permintaan / 10 detik
  const get = async (path, params, f) => { await limit(1); return fetchJson(`${base}/api/v4${path}?${new URLSearchParams(params)}`, f); };
  const contract = (symbol) => `${symbol.replace(/USDT$/, "")}_USDT`;
  const sym = (c) => c.replace(/_USDT$/, "USDT");
  return {
    name, kind: "futures", base,
    probe: (f) => get("/spot/time", {}, f).then(() => true),
    klines: async (symbol, interval, n, f) => {
      const r = await get("/futures/usdt/candlesticks", { contract: contract(symbol), interval, limit: Math.min(n, 1999) }, f);
      // v = jumlah kontrak, sum = volume USDT; volume dalam koin ≈ sum / harga.
      return r.map((k) => ({ time: k.t * 1000, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.c > 0 ? +k.sum / +k.c : +k.v }));
    },
    tickers24: async (f) => (await get("/futures/usdt/tickers", {}, f)).filter((t) => /_USDT$/.test(t.contract))
      .map((t) => ({ symbol: sym(t.contract), price: +t.last, change: +t.change_percentage, volume: +t.volume_24h_quote })),
    prices: async (f) => (await get("/futures/usdt/tickers", {}, f)).filter((t) => /_USDT$/.test(t.contract))
      .map((t) => ({ symbol: sym(t.contract), price: +t.last })),
    symbols: async (f) => new Set((await get("/futures/usdt/contracts", {}, f))
      .filter((x) => !x.in_delisting && /_USDT$/.test(x.name)).map((x) => sym(x.name))),
    aggTrades: null,
  };
}

// Hyperliquid (bursa terdesentralisasi, kontrak perpetual dalam USDC). Koin "kPEPE" = 1000PEPE. Cadangan terakhir:
// batasnya 1200 bobot/menit (candle ±20–40 bobot), jadi memuat 100 koin butuh beberapa menit.
function hyperliquidSource(name, base) {
  const limit = rateLimiter(1000, 60e3);
  const post = async (body, f, cost = 20) => { await limit(cost); return fetchJson(`${base}/info`, f, 15000, body); };
  const coin = (symbol) => { const b = symbol.replace(/USDT$/, ""); return b.startsWith("1000") ? `k${b.slice(4)}` : b; };
  const sym = (c) => `${c.startsWith("k") ? `1000${c.slice(1)}` : c}USDT`;
  const meta = async (f) => {
    const [m, ctx] = await post({ type: "metaAndAssetCtxs" }, f);
    return m.universe.map((u, i) => ({ u, c: ctx[i] })).filter((x) => !x.u.isDelisted && /^k?[A-Z0-9]+$/.test(x.u.name));
  };
  return {
    name, kind: "futures", base,
    probe: (f) => post({ type: "allMids" }, f, 2).then(() => true),
    klines: async (symbol, interval, n, f) => {
      const n2 = Math.min(n, 5000), endTime = Date.now();
      const r = await post({ type: "candleSnapshot", req: { coin: coin(symbol), interval, startTime: endTime - n2 * INTERVAL_MS[interval], endTime } }, f, 20 + Math.ceil(n2 / 60));
      return r.map((k) => ({ time: +k.t, open: +k.o, high: +k.h, low: +k.l, close: +k.c, volume: +k.v }));
    },
    tickers24: async (f) => (await meta(f)).map(({ u, c }) => ({
      symbol: sym(u.name), price: +(c.midPx ?? c.markPx), change: (+c.markPx / +c.prevDayPx - 1) * 100, volume: +c.dayNtlVlm,
    })),
    prices: async (f) => Object.entries(await post({ type: "allMids" }, f, 2)).filter(([c]) => !c.startsWith("@"))
      .map(([c, p]) => ({ symbol: sym(c), price: +p })),
    symbols: async (f) => new Set((await meta(f)).map(({ u }) => sym(u.name))),
    aggTrades: null,
  };
}

export const SOURCES = [
  binanceSource("Binance Futures", "https://fapi.binance.com", "futures", "/fapi/v1"),
  bybitSource("Bybit Futures", "https://api.bybit.com"),
  bybitSource("Bybit Futures", "https://api.bytick.com"),
  okxSource("OKX Futures", "https://www.okx.com"),
  bitgetSource("Bitget Futures", "https://api.bitget.com"),
  gateSource("Gate Futures", "https://api.gateio.ws"),
  binanceSource("Binance Spot", "https://data-api.binance.vision", "spot", "/api/v3"),
  hyperliquidSource("Hyperliquid", "https://api.hyperliquid.xyz"),
];
let source = null;
let sourceList = SOURCES;
/** Sumber yang sedang dipakai: {name, kind, base} atau null kalau belum tersambung. */
export const dataSource = () => source;
const listeners = [];
/** Dipanggil (dengan sumber baru) setiap kali situs pindah sumber data. */
export const onSourceChange = (fn) => listeners.push(fn);

/** Pilih sumber paling atas yang menjawab (semua dicoba bersamaan, jadi sumber yang diblokir tidak membuat lama). */
let connecting = null, lastFail = null;
export function connect(fetchImpl, sources = sourceList) {
  if (source) return Promise.resolve(source);
  // Baru saja semua sumber gagal: jangan langsung coba lagi untuk tiap permintaan (tunggu 15 detik).
  if (lastFail && Date.now() - lastFail.at < 15e3) return Promise.reject(lastFail.err);
  // Banyak permintaan bisa menunggu sambungan bersamaan: cukup satu putaran percobaan.
  connecting ??= pickSource(fetchImpl, sources).finally(() => { connecting = null; });
  return connecting;
}
async function pickSource(fetchImpl, sources) {
  sourceList = sources;
  const now = Date.now();
  const usable = sources.filter((s) => !(s.coolUntil > now));
  const list = usable.length ? usable : [...sources].sort((a, b) => a.coolUntil - b.coolUntil).slice(0, 1);
  const probes = list.map((s) => s.probe(fetchImpl).then(() => null, (e) => e));
  const errors = [];
  for (let i = 0; i < list.length; i++) {
    const err = await probes[i];
    if (source) return source; // permintaan lain sudah memilih sumber
    if (!err) {
      source = list[i];
      source.fails = 0;
      lastFail = null;
      listeners.forEach((fn) => { try { fn(source); } catch (e) {} });
      return source;
    }
    errors.push(`${list[i].name} (${new URL(list[i].base).host}): ${err.message}`);
  }
  const err = new Error(`Semua sumber data gagal dihubungi: ${errors.join("; ")}`);
  lastFail = { at: Date.now(), err };
  throw err;
}
/** Untuk tes: lupakan sumber yang terpilih. */
export const resetSource = () => { source = null; connecting = null; lastFail = null; sourceList = SOURCES; SOURCES.forEach((s) => { s.coolUntil = 0; s.fails = 0; }); };

// Kesalahan "permanen" (simbol tidak ada di bursa ini, parameter salah): tidak perlu diulang dan bukan alasan pindah sumber.
const isPermanent = (e) => e.status === 400 || e.status === 404;

/**
 * Jalankan `op(sumber)` dengan pengaman: diulang sekali kalau gagal sementara; kalau sumber kena batas (429/418),
 * diblokir (403/451), atau gagal beberapa kali berturut-turut, sumber itu diistirahatkan dan situs pindah ke sumber berikutnya.
 */
export async function withSource(op, fetchImpl, tries = 4) {
  let last;
  for (let i = 0; i < tries; i++) {
    const src = await connect(fetchImpl);
    try {
      const r = await op(src);
      src.fails = 0;
      return r;
    } catch (e) {
      last = e;
      if (isPermanent(e)) throw e;
      src.fails = (src.fails || 0) + 1;
      const hard = e.status === 429 || e.status === 418 || e.status === 403 || e.status === 451;
      if (hard || src.fails >= 3) {
        src.coolUntil = Date.now() + (e.retryAfter || (e.status === 418 ? 5 * 60e3 : e.status === 403 || e.status === 451 ? 30 * 60e3 : 60e3));
        if (source === src) source = null;
      } else await sleep(400 * (i + 1));
    }
  }
  throw last;
}

/** Jumlah candle per timeframe. */
export const candleLimit = (interval) => (INTERVAL_MS[interval] < INTERVAL_MS["15m"] ? C.FAST_LIMIT : C.CANDLE_LIMIT);

/** Candle yang sudah close + candle yang sedang berjalan (terpisah). */
export async function fetchKlines(symbol, interval, limit = candleLimit(interval), fetchImpl) {
  if (interval === "1s") return splitLive(await fetchTradeCandles(symbol, fetchImpl));
  return splitLive(await withSource((src) => src.klines(symbol, interval, limit, fetchImpl), fetchImpl));
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

/** Riwayat transaksi terbaru (maks `pages` x 1000 transaksi) -> Map candle 1 detik. */
export async function fetchTradeMap(symbol, fetchImpl, pages = 10) {
  const src = await connect(fetchImpl);
  if (!src.aggTrades) throw new Error(`Candle 1 detik hanya tersedia dari Binance Futures (sekarang memakai ${src.name})`);
  const map = new Map();
  let batch = await src.aggTrades({ symbol, limit: 1000 }, fetchImpl);
  for (let i = 0; batch.length; i++) {
    batch.forEach((t) => addTrade(map, t));
    if (i + 1 >= pages || map.size >= C.FAST_LIMIT) break;
    const fromId = Math.max(0, batch[0].a - 1000);
    if (fromId === batch[0].a) break;
    batch = (await src.aggTrades({ symbol, fromId, limit: 1000 }, fetchImpl)).filter((t) => t.a < batch[0].a);
  }
  return map;
}
async function fetchTradeCandles(symbol, fetchImpl) {
  return candlesFromMap(await fetchTradeMap(symbol, fetchImpl), 1000, C.FAST_LIMIT, Date.now());
}

/** Kontrak perpetual USDT yang sedang aktif (pasangan USDT kalau sumbernya Spot): Set nama simbol. */
export async function fetchPerpetuals(fetchImpl) {
  return withSource((src) => src.symbols(fetchImpl), fetchImpl);
}

/** Koin kripto biasa: bukan token saham (NVDAB, TSLAB, …) dan nama simbol ASCII. */
export function isCryptoSymbol(symbol) {
  if (!/^[A-Z0-9]+USDT$/.test(symbol) || C.EXCLUDE.includes(symbol) || C.BLOCKLIST.includes(symbol) || C.TRADFI.includes(symbol)) return false;
  const base = symbol.replace(/USDT$/, "");
  return !(/^[A-Z]{2,5}B$/.test(base) && !["BNB", "ARB", "SHIB", "BEB"].includes(base));
}

/** N kontrak perpetual USDT dengan volume 24 jam terbesar, tanpa stablecoin (CONFIG.EXCLUDE), koin yang diblokir (CONFIG.BLOCKLIST) dan token saham. */
export async function topSymbols(n = C.TOP_COINS, fetchImpl) {
  // Ticker dan daftar kontrak harus dari sumber yang sama (nama simbol tiap bursa bisa beda).
  const [tickers, perps] = await withSource((src) => Promise.all([src.tickers24(fetchImpl), src.symbols(fetchImpl)]), fetchImpl);
  const top = tickers
    .filter((t) => isCryptoSymbol(t.symbol) && perps.has(t.symbol) && t.volume > 0)
    .sort((a, b) => b.volume - a.volume)
    .slice(0, n);
  const extras = tickers.filter((t) => C.EXTRA_SYMBOLS.includes(t.symbol) && perps.has(t.symbol) && !top.includes(t));
  return [...top, ...extras];
}

/** Harga terakhir semua simbol: [{symbol, price}]. */
export async function fetchTickers(fetchImpl) {
  return withSource((src) => src.prices(fetchImpl), fetchImpl);
}


export const tradeUrl = (symbol) => `https://www.binance.bh/en/futures/${symbol}`;

/** Nama koin untuk logo/tampilan: 1000PEPEUSDT -> PEPE. */
export const baseAsset = (symbol) => symbol.replace(/USDT$/, "").replace(/^1000+/, "");

/**
 * Analisis lengkap satu koin di satu timeframe: indikator, sinyal terakhir, posisi bot,
 * hasil backtest, dan perkiraan waktu TP. trendCandles wajib jika usesFilter(interval).
 */
/** Jumlah koin yang memberi sinyal per candle dan arah: Map "waktu|BELI" / "waktu|SHORT" -> jumlah. */
export function signalCounts(results) {
  const m = new Map();
  for (const r of results) for (const row of r?.rows || []) {
    if (row.signal !== "BELI" && row.signal !== "SHORT") continue;
    const k = `${row.time}|${row.signal}`;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

/** Hasil analyze() dengan filter konsensus (CONFIG.CONSENSUS): sinyal yang didukung kurang dari `min` koin dibuang,
 * lalu posisi dan backtest disimulasikan ulang. Tanpa CONSENSUS untuk timeframe ini, hasil dikembalikan apa adanya. */
export function applyConsensus(result, counts, min = C.CONSENSUS?.[result.interval]) {
  if (!min || !result || isMajor(result.symbol)) return result;
  const rows = result.rows.map((row) => ((row.signal === "BELI" || row.signal === "SHORT") && (counts.get(`${row.time}|${row.signal}`) || 0) < min
    ? { ...row, signal: "TAHAN", setup: null, consensus: counts.get(`${row.time}|${row.signal}`) || 0 } : row));
  const out = { ...result, rows, last: rows[rows.length - 1], sides: {} };
  for (const side of sides()) {
    const sim = simulate(rows, side, result.interval);
    out.sides[side] = { ...sim, timing: tpTiming(sim.closed) };
  }
  return out;
}

export const usesBtcFilter = (symbol, interval) => !!C.BTC_FILTER?.tfs?.includes(interval) && symbol !== C.BTC_FILTER.symbol;

export function analyze(symbol, interval, candles, trendCandles = null, btcCandles = null) {
  const filter = usesFilter(interval) ? trendCandles : null;
  const btc = usesBtcFilter(symbol, interval) ? btcCandles : null;
  const rows = addIndicators(candles, filter, filter ? C.MAX_STOP_LOSS_PERCENT : Infinity, setupsFor(interval), exitFor(interval, symbol), btc);
  const result = { symbol, interval, rows, last: rows[rows.length - 1], sides: {} };
  for (const side of sides()) {
    const sim = simulate(rows, side, interval);
    result.sides[side] = { ...sim, timing: tpTiming(sim.closed) };
  }
  return result;
}

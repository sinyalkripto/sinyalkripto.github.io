// Deteksi pola chart (candlestick, support/resistance, pola reversal dan continuation).
// Semua dihitung per candle hanya dari candle yang sudah close sampai candle itu (tanpa melihat masa depan):
// swing high/low baru dianggap ada setelah PIVOT candle sesudahnya terbentuk.
// Dipakai engine.js (filter sinyal, lihat CONFIG.PATTERNS) dan app.js (daftar pola di halaman Pasar).

export const POLA = {
  PIVOT: 3, // swing high/low: tertinggi/terendah di antara 3 candle kiri dan 3 candle kanan
  LEVEL_LOOKBACK: 120, // level support/resistance dari swing selama 120 candle terakhir
  LEVEL_TOL_ATR: 0.5, // "menyentuh level" kalau jaraknya <= 0,5 ATR
  EQUAL_TOL_ATR: 0.6, // dua puncak/lembah dianggap sama tinggi kalau selisihnya <= 0,6 ATR
  MIN_DEPTH_ATR: 1.0, // jarak puncak ke neckline minimal 1 ATR
  ACTIVE_BARS: 24, // pola reversal dianggap masih berlaku 24 candle setelah neckline ditembus
  FLAG_POLE_ATR: 3, // tiang bendera minimal 3 ATR
  FLAG_MIN: 4, FLAG_MAX: 15, // panjang konsolidasi bendera/pennant/segitiga
};

// Nama pola untuk tampilan: [nama bullish (mendukung LONG), nama bearish (mendukung SHORT)].
const NAMES = {
  engulfing: ["Bullish engulfing", "Bearish engulfing"], pinbar: ["Hammer (pin bar)", "Shooting star (pin bar)"],
  star: ["Morning star", "Evening star"], tweezer: ["Tweezer bottom", "Tweezer top"],
  soldiers: ["Three white soldiers", "Three black crows"], double: ["Double bottom", "Double top"],
  triple: ["Triple bottom", "Triple top"], hs: ["Inverse head & shoulders", "Head & shoulders"],
  wedge: ["Falling wedge", "Rising wedge"], flag: ["Bull flag / pennant / segitiga", "Bear flag / pennant / segitiga"],
};
export const polaName = (name, side) => (NAMES[name] ? NAMES[name][side === "bull" ? 0 : 1] : name);

/** Pola candlestick di candle i. Mengembalikan {bull: nama|null, bear: nama|null}. */
export function candlePattern(c, i, atr) {
  const k = c[i], p = c[i - 1], q = c[i - 2], a = atr[i];
  if (!p || !q || !(a > 0)) return { bull: null, bear: null };
  const body = (x) => Math.abs(x.close - x.open), up = (x) => x.close > x.open, dn = (x) => x.close < x.open;
  const range = k.high - k.low, lower = Math.min(k.open, k.close) - k.low, upper = k.high - Math.max(k.open, k.close);
  let bull = null, bear = null;
  // Tiga candle searah dengan badan berarti dan close makin tinggi/rendah.
  if (up(q) && up(p) && up(k) && p.close > q.close && k.close > p.close && Math.min(body(q), body(p), body(k)) >= 0.4 * a) bull = "soldiers";
  if (dn(q) && dn(p) && dn(k) && p.close < q.close && k.close < p.close && Math.min(body(q), body(p), body(k)) >= 0.4 * a) bear = "soldiers";
  // Tweezer: dua low/high sama, candle pertama berlawanan arah, candle kedua berbalik.
  if (dn(p) && up(k) && Math.abs(k.low - p.low) <= 0.1 * a && body(k) >= 0.3 * a) bull = "tweezer";
  if (up(p) && dn(k) && Math.abs(k.high - p.high) <= 0.1 * a && body(k) >= 0.3 * a) bear = "tweezer";
  // Morning/evening star: candle besar, candle kecil, lalu candle balik yang tutup melewati tengah candle pertama.
  if (dn(q) && body(q) >= 0.6 * a && body(p) <= 0.35 * body(q) && up(k) && k.close > (q.open + q.close) / 2) bull = "star";
  if (up(q) && body(q) >= 0.6 * a && body(p) <= 0.35 * body(q) && dn(k) && k.close < (q.open + q.close) / 2) bear = "star";
  // Pin bar / hammer / shooting star: ekor panjang menolak harga.
  if (range >= 0.6 * a && lower >= 2 * body(k) && lower >= 0.55 * range && upper <= 0.25 * range) bull = "pinbar";
  if (range >= 0.6 * a && upper >= 2 * body(k) && upper >= 0.55 * range && lower <= 0.25 * range) bear = "pinbar";
  // Engulfing: badan candle ini menelan badan candle sebelumnya yang berlawanan arah.
  if (dn(p) && up(k) && k.close >= p.open && k.open <= p.close && body(k) > body(p) && body(k) >= 0.3 * a) bull = "engulfing";
  if (up(p) && dn(k) && k.close <= p.open && k.open >= p.close && body(k) > body(p) && body(k) >= 0.3 * a) bear = "engulfing";
  return { bull, bear };
}

/**
 * Hitung semua fitur pola untuk tiap candle. atr: array ATR yang sama dengan engine.
 * Hasil per candle i:
 * - candle {bull, bear}: pola candlestick di candle i.
 * - supportNear / resistNear: low/high 3 candle terakhir menyentuh level swing (atau level yang sudah
 *   berganti peran, misalnya resistance yang ditembus jadi support) dan close masih di sisi yang benar.
 * - roomUp / roomDown: jarak (dalam ATR) dari close ke level swing terdekat di atas / di bawah.
 * - reversal {bull, bear}: pola reversal yang neckline-nya sudah ditembus dalam ACTIVE_BARS candle terakhir
 *   (double/triple top-bottom, head & shoulders, wedge).
 * - flag {bull, bear}: breakout dari bendera/pennant/segitiga setelah tiang yang kuat.
 */
export function detectPatterns(c, atr, P = POLA) {
  const n = c.length, K = P.PIVOT;
  const highs = [], lows = []; // swing yang sudah terkonfirmasi: {i, price}
  const out = new Array(n);
  let bullRev = null, bearRev = null; // {name, until, invalid}
  for (let i = 0; i < n; i++) {
    const a = atr[i], k = c[i];
    // Konfirmasi swing di candle j = i - K.
    const j = i - K;
    if (j >= K) {
      let isH = true, isL = true;
      for (let t = j - K; t <= j + K; t++) {
        if (t === j) continue;
        if (c[t].high >= c[j].high && (t > j || c[t].high > c[j].high)) isH = false;
        if (c[t].low <= c[j].low && (t > j || c[t].low < c[j].low)) isL = false;
      }
      if (isH) { highs.push({ i: j, price: c[j].high }); bearRev = armTop(c, highs, lows, i, atr, P) || bearRev; }
      if (isL) { lows.push({ i: j, price: c[j].low }); bullRev = armBottom(c, highs, lows, i, atr, P) || bullRev; }
    }
    // Pola yang sudah "dipersenjatai" aktif setelah neckline ditembus close, lalu kedaluwarsa.
    const step = (rev, broke, invalid) => {
      if (!rev) return null;
      if (!rev.active) {
        if (i - rev.armedAt > 3 * P.ACTIVE_BARS || invalid(rev)) return null;
        if (broke(rev)) { rev.active = true; rev.until = i + P.ACTIVE_BARS; }
        return rev;
      }
      return i > rev.until || invalid(rev) ? null : rev;
    };
    bearRev = step(bearRev, (r) => k.close < r.neck(i), (r) => k.close > r.top);
    bullRev = step(bullRev, (r) => k.close > r.neck(i), (r) => k.close < r.bottom);

    // Level support/resistance dari swing terakhir.
    const from = i - P.LEVEL_LOOKBACK;
    let roomUp = Infinity, roomDown = Infinity, supportNear = false, resistNear = false;
    if (a > 0) {
      const lo3 = Math.min(k.low, c[i - 1]?.low ?? k.low, c[i - 2]?.low ?? k.low);
      const hi3 = Math.max(k.high, c[i - 1]?.high ?? k.high, c[i - 2]?.high ?? k.high);
      const tol = P.LEVEL_TOL_ATR * a;
      for (const list of [highs, lows]) {
        for (let t = list.length - 1; t >= 0 && list[t].i >= from; t--) {
          const L = list[t].price;
          if (L > k.close) roomUp = Math.min(roomUp, (L - k.close) / a);
          if (L < k.close) roomDown = Math.min(roomDown, (k.close - L) / a);
          if (k.close > L && Math.abs(lo3 - L) <= tol) supportNear = true;
          if (k.close < L && Math.abs(hi3 - L) <= tol) resistNear = true;
        }
      }
    }
    out[i] = {
      candle: candlePattern(c, i, atr), supportNear, resistNear, roomUp, roomDown,
      reversal: { bull: bullRev?.active ? bullRev.name : null, bear: bearRev?.active ? bearRev.name : null },
      flag: flagBreak(c, i, atr, P),
    };
  }
  return out;
}

const line = (p1, p2) => (x) => p1.price + (p2.price - p1.price) * (x - p1.i) / (p2.i - p1.i);
const minLow = (c, from, to) => { let m = Infinity; for (let t = from; t <= to; t++) m = Math.min(m, c[t].low); return m; };
const maxHigh = (c, from, to) => { let m = -Infinity; for (let t = from; t <= to; t++) m = Math.max(m, c[t].high); return m; };

/** Pola puncak (bearish) yang terbentuk saat swing high baru terkonfirmasi. */
function armTop(c, highs, lows, i, atr, P) {
  const a = atr[i], eq = P.EQUAL_TOL_ATR * a, h = highs.slice(-3);
  if (!(a > 0) || h.length < 2) return null;
  const [h2, h3] = h.slice(-2), h1 = h.length === 3 ? h[0] : null;
  // Head & shoulders: kepala lebih tinggi dari dua bahu, bahu kira-kira sama, neckline lewat dua lembah.
  if (h1 && h2.price > h1.price + 0.5 * a && h2.price > h3.price + 0.5 * a && Math.abs(h1.price - h3.price) <= 2 * eq) {
    const t1 = lowPoint(c, h1.i, h2.i), t2 = lowPoint(c, h2.i, h3.i), neck = line(t1, t2);
    if (h3.price - neck(h3.i) >= P.MIN_DEPTH_ATR * a) return { name: "hs", armedAt: i, neck, top: h2.price };
  }
  // Triple / double top: puncak sama tinggi, lembah di antaranya cukup dalam.
  if (h1 && Math.max(h1.price, h2.price, h3.price) - Math.min(h1.price, h2.price, h3.price) <= eq) {
    const nk = minLow(c, h1.i, h3.i);
    if (Math.min(h1.price, h2.price, h3.price) - nk >= P.MIN_DEPTH_ATR * a) return { name: "triple", armedAt: i, neck: () => nk, top: Math.max(h1.price, h2.price, h3.price) + eq };
  }
  if (Math.abs(h2.price - h3.price) <= eq && h3.i - h2.i >= 5) {
    const nk = minLow(c, h2.i, h3.i);
    if (Math.min(h2.price, h3.price) - nk >= P.MIN_DEPTH_ATR * a) return { name: "double", armedAt: i, neck: () => nk, top: Math.max(h2.price, h3.price) + eq };
  }
  // Rising wedge: high dan low sama-sama naik tapi menyempit (low naik lebih cepat). Neckline = garis low.
  const l = lows.slice(-2);
  if (h1 && l.length === 2 && l[0].i > h1.i - 20 && h3.price > h2.price && h2.price > h1.price && l[1].price > l[0].price) {
    const sh = (h3.price - h1.price) / (h3.i - h1.i), sl = (l[1].price - l[0].price) / (l[1].i - l[0].i);
    if (sl > sh * 1.2) return { name: "wedge", armedAt: i, neck: line(l[0], l[1]), top: h3.price + eq };
  }
  return null;
}

/** Pola lembah (bullish), kebalikan armTop. */
function armBottom(c, highs, lows, i, atr, P) {
  const a = atr[i], eq = P.EQUAL_TOL_ATR * a, l = lows.slice(-3);
  if (!(a > 0) || l.length < 2) return null;
  const [l2, l3] = l.slice(-2), l1 = l.length === 3 ? l[0] : null;
  if (l1 && l2.price < l1.price - 0.5 * a && l2.price < l3.price - 0.5 * a && Math.abs(l1.price - l3.price) <= 2 * eq) {
    const t1 = highPoint(c, l1.i, l2.i), t2 = highPoint(c, l2.i, l3.i), neck = line(t1, t2);
    if (neck(l3.i) - l3.price >= P.MIN_DEPTH_ATR * a) return { name: "hs", armedAt: i, neck, bottom: l2.price };
  }
  if (l1 && Math.max(l1.price, l2.price, l3.price) - Math.min(l1.price, l2.price, l3.price) <= eq) {
    const nk = maxHigh(c, l1.i, l3.i);
    if (nk - Math.max(l1.price, l2.price, l3.price) >= P.MIN_DEPTH_ATR * a) return { name: "triple", armedAt: i, neck: () => nk, bottom: Math.min(l1.price, l2.price, l3.price) - eq };
  }
  if (Math.abs(l2.price - l3.price) <= eq && l3.i - l2.i >= 5) {
    const nk = maxHigh(c, l2.i, l3.i);
    if (nk - Math.max(l2.price, l3.price) >= P.MIN_DEPTH_ATR * a) return { name: "double", armedAt: i, neck: () => nk, bottom: Math.min(l2.price, l3.price) - eq };
  }
  const h = highs.slice(-2);
  if (l1 && h.length === 2 && h[0].i > l1.i - 20 && l3.price < l2.price && l2.price < l1.price && h[1].price < h[0].price) {
    const sl = (l1.price - l3.price) / (l3.i - l1.i), sh = (h[0].price - h[1].price) / (h[1].i - h[0].i);
    if (sh > sl * 1.2) return { name: "wedge", armedAt: i, neck: line(h[0], h[1]), bottom: l3.price - eq };
  }
  return null;
}

function lowPoint(c, from, to) { let b = from; for (let t = from; t <= to; t++) if (c[t].low < c[b].low) b = t; return { i: b, price: c[b].low }; }
function highPoint(c, from, to) { let b = from; for (let t = from; t <= to; t++) if (c[t].high > c[b].high) b = t; return { i: b, price: c[b].high }; }

/**
 * Breakout continuation: tiang (naik/turun >= FLAG_POLE_ATR ATR dalam <= 10 candle), lalu konsolidasi
 * FLAG_MIN–FLAG_MAX candle yang rentangnya <= setengah tiang (bendera, pennant, segitiga, kotak kecil),
 * lalu candle i tutup menembus batas konsolidasi searah tiang.
 */
function flagBreak(c, i, atr, P) {
  const a = atr[i], k = c[i];
  if (!(a > 0) || i < P.FLAG_MAX + 12) return { bull: null, bear: null };
  let bull = null, bear = null;
  for (let m = P.FLAG_MIN; m <= P.FLAG_MAX && !bull && !bear; m++) {
    const s = i - m; // konsolidasi: candle s..i-1
    const hi = maxHigh(c, s, i - 1), lo = minLow(c, s, i - 1);
    const poleLo = minLow(c, s - 10, s), poleHi = maxHigh(c, s - 10, s);
    const pole = poleHi - poleLo;
    if (pole < P.FLAG_POLE_ATR * a || hi - lo > 0.5 * pole) continue;
    if (k.close > hi && c[i - 1].close <= hi && c[s].high >= poleHi - 0.25 * pole && lo > poleLo + 0.4 * pole) bull = "flag";
    if (k.close < lo && c[i - 1].close >= lo && c[s].low <= poleLo + 0.25 * pole && hi < poleHi - 0.4 * pole) bear = "flag";
  }
  return { bull, bear };
}

/** Ringkasan pola di candle terakhir (untuk tampilan): [{name, side: "bull"|"bear", kind}]. */
export function patternsAt(f) {
  if (!f) return [];
  const out = [];
  for (const side of ["bull", "bear"]) {
    if (f.candle[side]) out.push({ name: f.candle[side], side, kind: "candle" });
    if (f.reversal[side]) out.push({ name: f.reversal[side], side, kind: "reversal" });
    if (f.flag[side]) out.push({ name: f.flag[side], side, kind: "continuation" });
  }
  return out;
}

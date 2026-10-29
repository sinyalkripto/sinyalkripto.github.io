// Rating teknikal multi-indikator. Tiap indikator memberi suara per candle:
// +1 (condong long), -1 (condong short), 0 (netral). Kelompok "ma" mengikuti tren,
// kelompok "osc" membaca momentum, aturan mirip rating teknikal TradingView.

const nan = (n) => new Array(n).fill(NaN);
const sign = (x) => (x > 0 ? 1 : x < 0 ? -1 : 0);

function ewm(v, alpha) {
  let p = NaN;
  return v.map((x) => (Number.isNaN(x) ? p : (p = Number.isNaN(p) ? x : alpha * x + (1 - alpha) * p)));
}
export const ema = (v, n) => ewm(v, 2 / (n + 1));
export const wilder = (v, n) => ewm(v, 1 / n);

export function sma(v, n) {
  // NaN di dalam jendela menghasilkan NaN, tanpa merusak nilai sesudahnya.
  const out = nan(v.length);
  let s = 0, bad = 0;
  for (let i = 0; i < v.length; i++) {
    if (Number.isNaN(v[i])) bad++; else s += v[i];
    if (i >= n) { if (Number.isNaN(v[i - n])) bad--; else s -= v[i - n]; }
    if (i >= n - 1 && !bad) out[i] = s / n;
  }
  return out;
}
export function stdev(v, n) {
  const m = sma(v, n);
  return v.map((_, i) => { if (i < n - 1) return NaN; let s = 0; for (let j = i - n + 1; j <= i; j++) s += (v[j] - m[i]) ** 2; return Math.sqrt(s / n); });
}
function wma(v, n) {
  const out = nan(v.length), den = n * (n + 1) / 2;
  for (let i = n - 1; i < v.length; i++) {
    let s = 0;
    for (let j = 0; j < n; j++) s += v[i - j] * (n - j);
    out[i] = s / den;
  }
  return out;
}
const rollMax = (v, n) => v.map((_, i) => (i < n - 1 ? NaN : Math.max(...v.slice(i - n + 1, i + 1))));
const rollMin = (v, n) => v.map((_, i) => (i < n - 1 ? NaN : Math.min(...v.slice(i - n + 1, i + 1))));
const rising = (v, i) => v[i] > v[i - 1];
const falling = (v, i) => v[i] < v[i - 1];

export function rsi(c, n = 14) {
  const g = wilder(c.map((x, i) => (i ? Math.max(x - c[i - 1], 0) : NaN)), n);
  const l = wilder(c.map((x, i) => (i ? Math.max(c[i - 1] - x, 0) : NaN)), n);
  return g.map((x, i) => (Number.isNaN(x) ? NaN : l[i] === 0 ? 100 : 100 - 100 / (1 + x / l[i])));
}
export function macd(c) {
  const f = ema(c, 12), s = ema(c, 26);
  const line = f.map((x, i) => x - s[i]);
  const sig = ema(line, 9);
  return { line, sig, hist: line.map((x, i) => x - sig[i]) };
}
function stoch(src, h, l, n) {
  const hh = rollMax(h, n), ll = rollMin(l, n);
  return src.map((x, i) => (Number.isNaN(hh[i]) ? NaN : hh[i] === ll[i] ? 50 : 100 * (x - ll[i]) / (hh[i] - ll[i])));
}
const fill0 = (v) => v.map((x) => (Number.isNaN(x) ? 0 : x));

function superTrend(h, l, c, tr, n = 10, mult = 3) {
  const a = wilder(tr, n), dir = new Array(c.length).fill(0);
  let up = NaN, dn = NaN, d = 1;
  for (let i = 0; i < c.length; i++) {
    const mid = (h[i] + l[i]) / 2, bu = mid - mult * a[i], bd = mid + mult * a[i];
    up = i && c[i - 1] > up ? Math.max(bu, up) : bu;
    dn = i && c[i - 1] < dn ? Math.min(bd, dn) : bd;
    if (i >= n) {
      if (d === -1 && c[i] > dn) d = 1;
      else if (d === 1 && c[i] < up) d = -1;
      dir[i] = d;
    }
  }
  return dir;
}
function psar(h, l, step = 0.02, max = 0.2) {
  const out = nan(h.length);
  if (h.length < 2) return out;
  let long = h[1] >= h[0], af = step, ep = long ? h[1] : l[1], sar = long ? l[0] : h[0];
  for (let i = 1; i < h.length; i++) {
    sar = sar + af * (ep - sar);
    if (long) {
      sar = Math.min(sar, l[i - 1], l[Math.max(0, i - 2)]);
      if (l[i] < sar) { long = false; sar = ep; ep = l[i]; af = step; }
      else if (h[i] > ep) { ep = h[i]; af = Math.min(af + step, max); }
    } else {
      sar = Math.max(sar, h[i - 1], h[Math.max(0, i - 2)]);
      if (h[i] > sar) { long = true; sar = ep; ep = h[i]; af = step; }
      else if (l[i] < ep) { ep = l[i]; af = Math.min(af + step, max); }
    }
    out[i] = sar;
  }
  return out;
}

/** Semua indikator sebagai deret: [{name, group, value[], vote[]}]. */
export function indicatorSeries(rows) {
  const c = rows.map((r) => r.close), h = rows.map((r) => r.high), l = rows.map((r) => r.low), v = rows.map((r) => r.volume);
  const N = c.length, list = [];
  const add = (name, group, value, voteAt) => {
    const vote = new Array(N).fill(0);
    for (let i = 1; i < N; i++) vote[i] = Number.isNaN(value[i]) ? 0 : voteAt(i);
    list.push({ name, group, value, vote });
  };
  const above = (ma) => (i) => sign(c[i] - ma[i]);

  // --- Mengikuti tren ---
  for (const p of [10, 20, 30, 50, 100, 200]) {
    const e = ema(c, p), s = sma(c, p);
    add(`EMA ${p}`, "ma", e.map((x, i) => (i < p - 1 ? NaN : x)), above(e));
    add(`SMA ${p}`, "ma", s, above(s));
  }
  const ll26 = rollMin(l, 26), base = rollMax(h, 26).map((x, i) => (x + ll26[i]) / 2);
  add("Ichimoku base line 26", "ma", base, above(base));
  const cv = sma(c.map((x, i) => x * v[i]), 20), vs = sma(v, 20);
  const vwma = cv.map((x, i) => (vs[i] ? x / vs[i] : NaN));
  add("VWMA 20", "ma", vwma, above(vwma));
  const w4 = wma(c, 4), w9 = wma(c, 9);
  const hma = wma(w4.map((x, i) => (Number.isNaN(x) || Number.isNaN(w9[i]) ? 0 : 2 * x - w9[i])), 3).map((x, i) => (i < 11 ? NaN : x));
  add("Hull MA 9", "ma", hma, above(hma));
  const tr = c.map((x, i) => (i ? Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])) : h[i] - l[i]));
  const st = superTrend(h, l, c, tr);
  add("SuperTrend 10 3", "ma", st.map((d) => (d ? d : NaN)), (i) => st[i]);
  const sar = psar(h, l);
  add("Parabolic SAR", "ma", sar, above(sar));

  // --- Osilator ---
  const r = rsi(c, 14);
  add("RSI 14", "osc", r, (i) => (r[i] < 30 && rising(r, i) ? 1 : r[i] > 70 && falling(r, i) ? -1 : 0));
  const k = sma(fill0(stoch(c, h, l, 14)), 3), d = sma(k, 3);
  add("Stochastic %K 14 3 3", "osc", k, (i) => (k[i] < 20 && d[i] < 20 && k[i] > d[i] ? 1 : k[i] > 80 && d[i] > 80 && k[i] < d[i] ? -1 : 0));
  const sr = sma(fill0(stoch(r, r, r, 14)), 3), srd = sma(sr, 3);
  add("Stochastic RSI 3 3 14 14", "osc", sr, (i) => (sr[i] < 20 && sr[i] > srd[i] ? 1 : sr[i] > 80 && sr[i] < srd[i] ? -1 : 0));
  const tp = c.map((x, i) => (x + h[i] + l[i]) / 3), tpm = sma(tp, 20);
  const cci = tp.map((x, i) => { if (i < 19) return NaN; let md = 0; for (let j = i - 19; j <= i; j++) md += Math.abs(tp[j] - tpm[i]); md /= 20; return md ? (x - tpm[i]) / (0.015 * md) : 0; });
  add("CCI 20", "osc", cci, (i) => (cci[i] < -100 && rising(cci, i) ? 1 : cci[i] > 100 && falling(cci, i) ? -1 : 0));
  const pdm = h.map((x, i) => { if (!i) return 0; const up = x - h[i - 1], dn = l[i - 1] - l[i]; return up > dn && up > 0 ? up : 0; });
  const mdm = l.map((x, i) => { if (!i) return 0; const up = h[i] - h[i - 1], dn = l[i - 1] - x; return dn > up && dn > 0 ? dn : 0; });
  const atr14 = wilder(tr, 14), pdi = wilder(pdm, 14).map((x, i) => 100 * x / atr14[i]), mdi = wilder(mdm, 14).map((x, i) => 100 * x / atr14[i]);
  const adx = wilder(pdi.map((x, i) => (x + mdi[i] ? 100 * Math.abs(x - mdi[i]) / (x + mdi[i]) : 0)), 14).map((x, i) => (i < 27 ? NaN : x));
  add("ADX 14 (+DI/−DI)", "osc", adx, (i) => (adx[i] > 20 && rising(adx, i) ? sign(pdi[i] - mdi[i]) : 0));
  const hl2 = h.map((x, i) => (x + l[i]) / 2), s34 = sma(hl2, 34), ao = sma(hl2, 5).map((x, i) => x - s34[i]);
  add("Awesome Oscillator", "osc", ao, (i) => (ao[i] > 0 && rising(ao, i) ? 1 : ao[i] < 0 && falling(ao, i) ? -1 : 0));
  const mom = c.map((x, i) => (i >= 10 ? x - c[i - 10] : NaN));
  add("Momentum 10", "osc", mom, (i) => sign(mom[i] - mom[i - 1]));
  const m = macd(c);
  add("MACD 12 26 9", "osc", m.line.map((x, i) => (i < 33 ? NaN : x)), (i) => sign(m.line[i] - m.sig[i]));
  const wr = stoch(c, h, l, 14).map((x) => x - 100);
  add("Williams %R 14", "osc", wr, (i) => (wr[i] < -80 && rising(wr, i) ? 1 : wr[i] > -20 && falling(wr, i) ? -1 : 0));
  const e13 = ema(c, 13), bbp = h.map((x, i) => (i < 12 ? NaN : x - e13[i] + (l[i] - e13[i])));
  add("Bull Bear Power 13", "osc", bbp, (i) => (bbp[i] > 0 && rising(bbp, i) ? 1 : bbp[i] < 0 && falling(bbp, i) ? -1 : 0));
  const bp = c.map((x, i) => (i ? x - Math.min(l[i], c[i - 1]) : 0));
  const avg = (n) => { const b = sma(bp, n), t = sma(tr, n); return b.map((x, i) => (t[i] ? x / t[i] : NaN)); };
  const a7 = avg(7), a14 = avg(14), a28 = avg(28);
  const uo = a7.map((x, i) => 100 * (4 * x + 2 * a14[i] + a28[i]) / 7);
  add("Ultimate Oscillator 7 14 28", "osc", uo, (i) => (uo[i] > 70 ? 1 : uo[i] < 30 ? -1 : 0));
  const mf = tp.map((x, i) => x * v[i]);
  const pos = sma(mf.map((x, i) => (i && tp[i] > tp[i - 1] ? x : 0)), 14), neg = sma(mf.map((x, i) => (i && tp[i] < tp[i - 1] ? x : 0)), 14);
  const mfi = pos.map((x, i) => (Number.isNaN(x) ? NaN : neg[i] === 0 ? 100 : 100 - 100 / (1 + x / neg[i])));
  add("MFI 14", "osc", mfi, (i) => (mfi[i] < 20 && rising(mfi, i) ? 1 : mfi[i] > 80 && falling(mfi, i) ? -1 : 0));
  let o = 0;
  const obv = c.map((x, i) => (o += i ? sign(x - c[i - 1]) * v[i] : 0));
  const obvE = ema(obv, 20);
  add("OBV vs EMA 20", "osc", obv.map((x, i) => (i < 19 ? NaN : x)), (i) => sign(obv[i] - obvE[i]));
  const bm = sma(c, 20), bsd = stdev(c, 20);
  const pb = c.map((x, i) => (bsd[i] ? (x - (bm[i] - 2 * bsd[i])) / (4 * bsd[i]) : NaN));
  add("Bollinger %B 20 2", "osc", pb, (i) => (pb[i] < 0 && rising(pb, i) ? 1 : pb[i] > 1 && falling(pb, i) ? -1 : 0));
  return { list, macdHist: m.hist };
}

const cache = new WeakMap();
const seriesOf = (rows) => { let s = cache.get(rows); if (!s) cache.set(rows, (s = indicatorSeries(rows))); return s; };

/** Skor gabungan di candle i: rata-rata suara kelompok tren dan osilator, -1 (short) s/d +1 (long). */
function scoreAt(s, i) {
  let ma = 0, nm = 0, os = 0, no = 0;
  for (const x of s.list) {
    if (x.group === "ma") { ma += x.vote[i]; nm++; } else { os += x.vote[i]; no++; }
  }
  const sMa = ma / nm, sOsc = os / no;
  return { sMa, sOsc, sAll: (sMa + sOsc) / 2 };
}
/** Selalu LONG atau SHORT; kalau suara seimbang, diputus oleh histogram MACD. */
const dirOf = (s, i, sAll) => (sAll > 0 ? 1 : sAll < 0 ? -1 : s.macdHist[i] >= 0 ? 1 : -1);

/** Rating di candle terakhir (atau candle i). */
export function rating(rows, i = rows.length - 1) {
  const s = seriesOf(rows);
  const items = s.list.map((x) => ({ name: x.name, group: x.group, value: x.value[i], vote: x.vote[i] }));
  const sc = scoreAt(s, i);
  return { ...sc, mas: items.filter((x) => x.group === "ma"), osc: items.filter((x) => x.group === "osc"), dir: dirOf(s, i, sc.sAll), total: items.length };
}

/**
 * Seberapa sering arah rating benar di masa lalu: untuk tiap candle dalam `window` candle terakhir,
 * arah dibandingkan dengan pergerakan harga `ahead` candle setelahnya.
 */
export function directionAccuracy(rows, ahead = 5, window = 500, warm = 200) {
  const s = seriesOf(rows), n = rows.length;
  let ok = 0, total = 0;
  for (let i = Math.max(warm, n - 1 - ahead - window); i < n - ahead; i++) {
    const move = rows[i + ahead].close - rows[i].close;
    if (!move) continue;
    const d = dirOf(s, i, scoreAt(s, i).sAll);
    total++;
    if (sign(move) === d) ok++;
  }
  return { acc: total ? ok / total * 100 : NaN, total, ahead };
}

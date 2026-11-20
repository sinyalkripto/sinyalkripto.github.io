// Tahap 10 (evaluasi live 19–20 Nov 2026, banyak kena SL): uji aturan tambahan per timeframe.
// Pakai: node --max-old-space-size=12000 riset/uji-tahap10.mjs <folder-data> <tf> [CAP=n]   (data: riset/unduh-data.py, plus
//   premiumIndexKlines 1h sebagai <SIMBOL>_1h_prem.csv untuk perkiraan funding)
// Varian: tanpa token saham/ETF, skip short kalau funding (rata-rata premium 8 jam) sangat negatif, skip short kalau koin
// naik >X% dalam 24 jam, batas jarak SL, dan (CAP) maksimal n posisi searah yang terbuka bersamaan per kelompok koin.
// Koin diurutkan menurut volume 1 jam 17–19 Nov 2026. 1j/4j: kelompok 1 = 60 teratas, 2 = 61–130; latih Des 2025–Jul 2026,
// uji Agu–19 Nov 2026. 5m–30m: kelompok 1 = 50 teratas, 2 = 51–100; latih 15 Agu–Sep, uji Okt–19 Nov 2026.
import fs from "fs";
import { CONFIG, analyze, simulate, isCryptoSymbol } from "../engine.js";
const dir = process.argv[2];
const load = (sym, tf) => { const p = `${dir}/${sym}_${tf}.csv`; if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").trim().split("\n").slice(1).map((l) => { const a = l.split(","); return { time: Date.parse(a[0].replace(" ", "T") + "Z"), open: +a[1], high: +a[2], low: +a[3], close: +a[4], volume: +a[5] }; }); };
const tf = process.argv[3];
const fast = ["5m", "15m", "30m"].includes(tf);
const STOCK = new Set(["COHRUSDT", "IRENUSDT", "TTWOUSDT", "LITEUSDT", "CRDOUSDT", "MRNAUSDT", "BEUSDT", "QCOMUSDT", "GLWUSDT",
  "DELLUSDT", "MINIMAXUSDT", "ZHONGJIUSDT", "CXMTUSDT", "BMNRUSDT", "STRCUSDT", "SQQQUSDT", "UVXYUSDT", "NVDLUSDT", "MSTUUSDT",
  "BITOUSDT", "SKDDUSDT", "SKUUUSDT", "RAMUSDT", "CSOPSKHYNIX2LUSDT", "XPTUSDT", "COPPERUSDT"]);
const T0 = Date.parse("2026-11-17T00:00:00Z");
const all = fs.readdirSync(dir).filter((f) => f.endsWith("_1h.csv")).map((f) => f.split("_")[0])
  .filter((s) => isCryptoSymbol(s) || STOCK.has(s))
  .map((s) => [s, load(s, "1h").filter((k) => k.time >= T0).reduce((a, k) => a + k.close * k.volume, 0)])
  .sort((a, b) => b[1] - a[1]).map((x) => x[0]);
const coins = all.slice(0, fast ? 100 : 130);
const groups = fast ? [coins.slice(0, 50), coins.slice(50)] : [coins.slice(0, 60), coins.slice(60)];
const D = (s) => Date.parse(s + "T00:00:00Z");
const [A, B, E] = fast ? [D("2026-08-15"), D("2026-10-01"), D("2026-11-20")] : [D("2025-12-01"), D("2026-08-01"), D("2026-11-20")];
const step = { "5m": 3e5, "15m": 9e5, "30m": 18e5, "1h": 36e5, "4h": 144e5 }[tf];
const btc = load("BTCUSDT", "1h");
// funding proxy: rata-rata premium index 8 jam terakhir (candle 1h yang sudah close)
function premMap(sym) {
  const p = load(sym, "1h_prem"); if (!p) return null;
  const m = new Map(); let s = 0; const q = [];
  for (const k of p) { q.push(k.close); s += k.close; if (q.length > 8) s -= q.shift(); m.set(k.time + 36e5, s / q.length); }
  return m;
}
const premAt = (m, t) => { if (!m) return NaN; const h = Math.floor(t / 36e5) * 36e5; return m.get(h) ?? NaN; };
const KEEP = ["time", "open", "high", "low", "close", "signal", "setup", "stopLoss", "takeProfit", "shortStopLoss", "shortTakeProfit", "maxHold", "breakevenAt", "crossUp", "crossDown"];
const base = groups.map((g) => g.map((s) => {
  const c = load(s, tf); if (!c || c.length < 600) return null;
  const r = analyze(s, tf, c, tf === "4h" ? null : load(s, "4h"), btc);
  const pm = premMap(s);
  const n24 = Math.round(864e5 / step);
  const rows = r.rows.map((x, i) => {
    const o = {}; for (const k of KEEP) o[k] = x[k];
    o.ch24 = i >= n24 ? x.close / r.rows[i - n24].close - 1 : 0;
    o.fund = premAt(pm, x.time + step); // nilai yang diketahui saat candle close
    o.slPct = x.signal === "BELI" ? 1 - x.stopLoss / x.close : x.signal === "SHORT" ? x.shortStopLoss / x.close - 1 : 0;
    return o;
  });
  return { symbol: s, rows };
}).filter(Boolean));
const majors = new Set(CONFIG.MAJORS);
const VAR = {
  dasar: () => true,
  "tanpa saham/ETF": (x, s) => !STOCK.has(s),
  "short: fund<-0.05%": (x) => !(x.signal === "SHORT" && x.fund < -0.0005),
  "short: fund<-0.1%": (x) => !(x.signal === "SHORT" && x.fund < -0.001),
  "short: fund<-0.2%": (x) => !(x.signal === "SHORT" && x.fund < -0.002),
  "2arah: fund ekstrem 0.05%": (x) => !(x.signal === "SHORT" && x.fund < -0.0005) && !(x.signal === "BELI" && x.fund > 0.0005),
  "2arah: fund ekstrem 0.1%": (x) => !(x.signal === "SHORT" && x.fund < -0.001) && !(x.signal === "BELI" && x.fund > 0.001),
  "short: naik24h>10%": (x) => !(x.signal === "SHORT" && x.ch24 > 0.10),
  "short: naik24h>20%": (x) => !(x.signal === "SHORT" && x.ch24 > 0.20),
  "short: naik24h>30%": (x) => !(x.signal === "SHORT" && x.ch24 > 0.30),
  "2arah: 24h>15% lawan": (x) => !(x.signal === "SHORT" && x.ch24 > 0.15) && !(x.signal === "BELI" && x.ch24 < -0.15),
  "SL>8%": (x) => x.slPct <= 0.08,
  "SL>10%": (x) => x.slPct <= 0.10,
  "SL>12%": (x) => x.slPct <= 0.12,
  "SL>6%": (x) => x.slPct <= 0.06,
};
const CAP = process.env.CAP ? +process.env.CAP : 0;
const only = process.env.VARIAN ? process.env.VARIAN.split("|") : null;
const st = (r) => { if (!r.length) return "   –"; const g = r.filter((x) => x > 0).reduce((a, x) => a + x, 0), b = -r.filter((x) => x <= 0).reduce((a, x) => a + x, 0);
  return `${String(r.length).padStart(5)} PF ${(g / b).toFixed(2)} Σ${(r.reduce((a, x) => a + x, 0) * 100).toFixed(0).padStart(5)}%`; };
for (const [name, f] of Object.entries(VAR)) {
  if (only && !only.includes(name)) continue;
  const line = [];
  base.forEach((g, gi) => {
    let res = g.map((c) => ({ ...c, rows: c.rows.map((x) => ((x.signal === "BELI" || x.signal === "SHORT") && !f(x, c.symbol) ? { ...x, signal: "TAHAN" } : x)) }));
    const min = CONFIG.CONSENSUS?.[tf];
    if (min) {
      const m = new Map();
      for (const c of res) for (const x of c.rows) if (x.signal === "BELI" || x.signal === "SHORT") m.set(x.time + x.signal, (m.get(x.time + x.signal) || 0) + 1);
      res = res.map((c) => majors.has(c.symbol) ? c : { ...c, rows: c.rows.map((x) => ((x.signal === "BELI" || x.signal === "SHORT") && m.get(x.time + x.signal) < min ? { ...x, signal: "TAHAN" } : x)) });
    }
    let tr = [];
    for (const c of res) for (const side of ["long", "short"]) for (const t of simulate(c.rows, side, tf).closed) tr.push({ ...t, sym: c.symbol, g: gi });
    if (CAP) {
      // Trader manual: lewati sinyal kalau sudah ada CAP posisi searah yang masih terbuka.
      tr.sort((p, q) => p.entryTime - q.entryTime || (p.sym < q.sym ? -1 : 1));
      const kept = [];
      for (const t of tr) if (kept.filter((k) => k.side === t.side && k.entryTime <= t.entryTime && t.entryTime < k.hitFrom).length < CAP) kept.push(t);
      tr = kept;
    }
    const r = { a: [], b: [] };
    for (const t of tr) { const k = t.entryTime >= A && t.entryTime < B ? "a" : t.entryTime >= B && t.entryTime < E ? "b" : null; if (k) r[k].push(t.ret); }
    line.push(`K${gi + 1} latih ${st(r.a)} uji ${st(r.b)}`);
  });
  console.log(`${tf} ${name.padEnd(26)} ${line.join(" || ")}`);
}

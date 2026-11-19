// Tahap 9 (kasus short HUMA 19 Nov 2026): uji filter pantulan (CONFIG.BOUNCE_FILTER), yaitu lewati sinyal yang melawan
// pantulan tajam (baru oversold ekstrem, terlalu jauh dari EMA 200, lonjakan volume, atau sudah memantul jauh dari low).
// Pakai: node riset/uji-tahap9.mjs <folder-data> <tf,...>   (data: riset/unduh-data.py)
// Kelompok 1: peringkat volume Okt 2026 1–60 (seperti koin di situs), kelompok 2: 61+. Konsensus 1 jam dihitung per kelompok.
// Latih Des 2025–Jul 2026, uji Agu–19 Nov 2026.
import fs from "fs";
import { CONFIG, analyze, isCryptoSymbol, signalCounts, applyConsensus } from "../engine.js";

const dir = process.argv[2], tfs = (process.argv[3] || "1h,4h").split(",");
const load = (sym, tf) => {
  const p = `${dir}/${sym}_${tf}.csv`;
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").trim().split("\n").slice(1).map((l) => {
    const a = l.split(",");
    return { time: Date.parse(a[0].replace(" ", "T") + "Z"), open: +a[1], high: +a[2], low: +a[3], close: +a[4], volume: +a[5] };
  });
};
const vol = (c) => c.filter((k) => new Date(k.time).toISOString().startsWith("2026-10")).reduce((a, k) => a + k.close * k.volume, 0);
const coins = fs.readdirSync(dir).filter((f) => f.endsWith("_1h.csv")).map((f) => f.split("_")[0]).filter(isCryptoSymbol)
  .map((s) => [s, vol(load(s, "1h"))]).filter((x) => x[1] > 0).sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, +(process.env.KOIN || 200));
const D = (s) => Date.parse(s + "T00:00:00Z");
const [A, B, E] = [D("2025-12-01"), D("2026-08-01"), D("2026-11-20")];
const st = (r) => {
  if (!r.length) return "    –";
  const g = r.filter((x) => x > 0).reduce((a, x) => a + x, 0), b = -r.filter((x) => x <= 0).reduce((a, x) => a + x, 0);
  return `${String(r.length).padStart(5)} PF ${(g / b).toFixed(2)} Σ${(r.reduce((a, x) => a + x, 0) * 100).toFixed(0).padStart(5)}%`;
};
const V = (o) => ({ all: o });
const VARIANTS = {
  dasar: {},
  "RSI<20 (10c)": V({ rsiExt: 20 }), "RSI<25 (10c)": V({ rsiExt: 25 }), "RSI<30 (10c)": V({ rsiExt: 30 }), "RSI<25 (20c)": V({ rsiExt: 25, n: 20 }),
  "EMA200>8ATR": V({ emaAtr: 8 }), "EMA200>12ATR": V({ emaAtr: 12 }), "EMA200>16ATR": V({ emaAtr: 16 }),
  "vol>3x (10c)": V({ volX: 3 }), "vol>5x (10c)": V({ volX: 5 }), "vol>8x (10c)": V({ volX: 8 }),
  "pantul>3ATR (10c)": V({ bounceAtr: 3 }), "pantul>4ATR (10c)": V({ bounceAtr: 4 }), "pantul>5ATR (20c)": V({ bounceAtr: 5, n: 20 }),
  "vol>6x (10c)": V({ volX: 6 }), "vol>10x (10c)": V({ volX: 10 }), "vol>12x (10c)": V({ volX: 12 }),
  "vol>8x (5c)": V({ volX: 8, n: 5 }), "vol>8x (20c)": V({ volX: 8, n: 20 }), "vol>8x short saja": V({ volX: 8, sides: ["short"] }),
  "RSI<25 short saja": V({ rsiExt: 25, sides: ["short"] }), "pantul>4ATR short saja": V({ bounceAtr: 4, sides: ["short"] }),
};
const only = process.env.VARIAN ? process.env.VARIAN.split("|") : null;
const cache = {};
const get = (s, tf) => (cache[s + tf] ??= load(s, tf));
const btc1h = get("BTCUSDT", "1h");
for (const tf of tfs) {
  const list = coins.filter((s) => get(s, tf)?.length > 600);
  const groups = [list.slice(0, 60), list.slice(60)];
  console.log(`\n== ${tf}: ${groups[0].length} + ${groups[1].length} koin   (kolom: trade, PF, jumlah %; S = short saja)`);
  for (const [name, v] of Object.entries(VARIANTS)) {
    if (only && !only.includes(name)) continue;
    CONFIG.BOUNCE_FILTER = v;
    const out = [];
    groups.forEach((g, gi) => {
      let res = g.map((s) => analyze(s, tf, get(s, tf), tf === "4h" ? null : get(s, "4h"), btc1h));
      const counts = signalCounts(res);
      res = res.map((r) => applyConsensus(r, counts));
      const r = { a: [], b: [], aS: [], bS: [] };
      for (const x of res) for (const side in x.sides) for (const t of x.sides[side].closed) {
        const k = t.entryTime >= A && t.entryTime < B ? "a" : t.entryTime >= B && t.entryTime < E ? "b" : null;
        if (!k) continue;
        r[k].push(t.ret);
        if (side === "short") r[k + "S"].push(t.ret);
      }
      out.push(`K${gi + 1} latih ${st(r.a)} uji ${st(r.b)} | S latih ${st(r.aS)} uji ${st(r.bS)}`);
    });
    console.log(`${tf} ${name.padEnd(22)} ${out.join("  ||  ")}`);
  }
}

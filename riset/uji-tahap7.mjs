// Tahap 7 (evaluasi live 14–19 Nov 2026): uji filter koin liar (CONFIG.VOL_FILTER) dan filter arah BTC
// (CONFIG.BTC_FILTER) dengan pembagian latih/uji, di dua kelompok koin (peringkat volume 1–50 dan 51+).
// Pakai: node riset/uji-tahap7.mjs <folder-data> <tf,...>   (data: riset/unduh-data.py, file <SIMBOL>_<tf>.csv)
// Jumlah koin: KOIN=<n> (default 60 untuk 1h/4h, 100 untuk 5m–30m).
// 1h/4h: latih Des 2025–Jul 2026, uji Agu–18 Nov 2026. 5m–30m: latih Agu–Sep 2026, uji Okt–18 Nov 2026.
import fs from "fs";
import { CONFIG, analyze, isCryptoSymbol } from "../engine.js";

const dir = process.argv[2], tfs = (process.argv[3] || "1h").split(",");
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
  .map((s) => [s, vol(load(s, "1h"))]).sort((a, b) => b[1] - a[1]).map((x) => x[0]);
const D = (s) => Date.parse(s + "T00:00:00Z");
const PER = {
  slow: [D("2025-12-01"), D("2026-08-01"), D("2026-11-19")],
  fast: [D("2026-08-01"), D("2026-10-01"), D("2026-11-19")],
};
const LIVE = [D("2026-11-14"), D("2026-11-19")];
const st = (r) => {
  if (!r.length) return "      –";
  const g = r.filter((x) => x > 0).reduce((a, x) => a + x, 0), b = -r.filter((x) => x <= 0).reduce((a, x) => a + x, 0);
  const w = r.filter((x) => x > 0.0005).length / r.length * 100;
  return `${String(r.length).padStart(5)} w${w.toFixed(0)}% PF ${(g / b).toFixed(2)} Σ${(r.reduce((a, x) => a + x, 0) * 100).toFixed(0).padStart(4)}%`;
};
const VARIANTS = {
  dasar: {},
  "gerak24j>10%": { vol: { move24h: 10 } },
  "gerak24j>15%": { vol: { move24h: 15 } },
  "gerak24j>20%": { vol: { move24h: 20 } },
  "gerak24j>30%": { vol: { move24h: 30 } },
  "ATR>2x": { vol: { atrRatio: 2 } },
  "ATR>2,5x": { vol: { atrRatio: 2.5 } },
  "ATR>3x": { vol: { atrRatio: 3 } },
  "BTC searah": { btc: true },
  "BTC + gerak24j>15%": { btc: true, vol: { move24h: 15 } },
  "BTC + ATR>2,5x": { btc: true, vol: { atrRatio: 2.5 } },
};
const only = process.env.VARIAN ? process.env.VARIAN.split("|") : null;
const cache = {};
const get = (s, tf) => (cache[s + tf] ??= load(s, tf));
for (const tf of tfs) {
  const fast = tf !== "1h" && tf !== "4h";
  const [A, B, E] = fast ? PER.fast : PER.slow;
  const list = coins.slice(0, +(process.env.KOIN || (fast ? 100 : 60))).filter((s) => get(s, tf)?.length > 600);
  const btc1h = get("BTCUSDT", "1h");
  console.log(`\n== ${tf}: ${list.length} koin (kelompok 1: peringkat 1–50, 2: 51+)`);
  for (const [name, v] of Object.entries(VARIANTS)) {
    if (only && !only.includes(name)) continue;
    CONFIG.VOL_FILTER = { move24h: null, atrRatio: null, ...(v.vol || {}) };
    CONFIG.BTC_FILTER = { ...CONFIG.BTC_FILTER, tfs: v.btc ? [tf] : [] };
    const r = { a1: [], b1: [], a2: [], b2: [], live: [] };
    list.forEach((s, idx) => {
      const g = idx < 50 ? 1 : 2;
      const res = analyze(s, tf, get(s, tf), tf === "4h" ? null : get(s, "4h"), btc1h);
      for (const side in res.sides) for (const x of res.sides[side].closed) {
        if (x.entryTime >= A && x.entryTime < B) r["a" + g].push(x.ret);
        else if (x.entryTime >= B && x.entryTime < E) r["b" + g].push(x.ret);
        if (x.entryTime >= LIVE[0] && x.entryTime < LIVE[1]) r.live.push(x.ret);
      }
    });
    console.log(`${tf} ${name.padEnd(20)} latih1 ${st(r.a1)} | uji1 ${st(r.b1)} | latih2 ${st(r.a2)} | uji2 ${st(r.b2)} | 14–18 Nov ${st(r.live)}`);
  }
}

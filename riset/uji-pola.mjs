// Uji filter pola chart (pola.js, CONFIG.PATTERNS) dengan pembagian latih/uji, sama seperti uji-tahap3.mjs.
// Pakai: node riset/uji-pola.mjs <folder-data> [jumlah-koin] [tf]
// Tiap varian dijalankan ulang penuh (filter mengubah trade sesudahnya karena satu posisi per arah).
import fs from "fs";
import { CONFIG, analyze, isCryptoSymbol } from "../engine.js";

const dir = process.argv[2], n = +(process.argv[3] || CONFIG.TOP_COINS), tfs = (process.argv[4] || "1h,4h").split(",");
const START = Date.parse("2025-12-01T00:00:00Z"), SPLIT = Date.parse("2026-08-01T00:00:00Z"), END = Date.parse("2026-11-17T00:00:00Z");
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
  .map((s) => [s, vol(load(s, "1h"))]).sort((a, b) => b[1] - a[1]).slice(0, n).map((x) => x[0]);
const data = Object.fromEntries(coins.map((s) => [s, { "1h": load(s, "1h"), "4h": load(s, "4h") }]));
const st = (r, days) => {
  const g = r.filter((x) => x > 0).reduce((a, x) => a + x, 0), b = -r.filter((x) => x <= 0).reduce((a, x) => a + x, 0);
  const sum = r.reduce((a, x) => a + x, 0) * 100;
  return `${String(r.length).padStart(5)} · ${(r.length / days).toFixed(1).padStart(4)}/hr · win ${(r.filter((x) => x > 0).length / r.length * 100).toFixed(1)}% · PF ${(g / b).toFixed(2)} · Σ ${sum.toFixed(0).padStart(4)}%`;
};
const CDL = ["engulfing", "pinbar", "tweezer", "soldiers"];
const VARIANTS = {
  dasar: null,
  "hindari reversal": { avoidReversal: true },
  "ruang ≥0,75×TP": { minRoom: 0.75 },
  "konfirmasi level": { confirm: "level" },
  "rejection (candle+level)": { confirm: "rejection" },
  "candle (semua pola)": { confirm: "candle" },
  "candle tanpa star": { confirm: "candle", candles: CDL },
  "candle tanpa star/soldiers": { confirm: "candle", candles: CDL.slice(0, 3) },
  "retest+candle": { confirm: "candle", candles: CDL, setups: ["retest"] },
  "retest+candle, 3 pola": { confirm: "candle", candles: CDL.slice(0, 3), setups: ["retest"] },
  "tolak candle berlawanan": { avoidOpposite: true, candles: CDL },
  "retest+candle & tolak lawan": { confirm: "candle", candles: CDL, setups: ["retest"], avoidOpposite: true },
};
const only = process.env.VARIAN ? process.env.VARIAN.split("|") : null;
console.log(`${coins.length} koin`);
for (const tf of tfs) {
  for (const [name, pf] of Object.entries(VARIANTS)) {
    if (only && !only.includes(name)) continue;
    CONFIG.PATTERNS = pf ? { [tf]: pf } : {};
    const a = [], b = [];
    for (const s of coins) {
      const c = data[s][tf], t = data[s]["4h"];
      if (!c || c.length < 600) continue;
      const res = analyze(s, tf, c, tf === "4h" ? null : t);
      for (const side in res.sides) for (const x of res.sides[side].closed) {
        if (x.entryTime >= START && x.entryTime < SPLIT) a.push(x.ret); else if (x.entryTime >= SPLIT && x.entryTime < END) b.push(x.ret);
      }
    }
    console.log(`${tf} ${name.padEnd(26)} latih ${st(a, (SPLIT - START) / 864e5)} | uji ${st(b, (END - SPLIT) / 864e5)}`);
  }
}

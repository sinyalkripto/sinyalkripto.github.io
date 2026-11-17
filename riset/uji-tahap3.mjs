// Uji setelan situs dengan pembagian latih/uji (riset tahap 3, README).
// Pakai: node riset/uji-tahap3.mjs <folder-data> [jumlah-koin]
// Koin diurutkan menurut volume di data (bulan Oktober 2026), lalu disaring isCryptoSymbol (blokir, saham).
import fs from "fs";
import { CONFIG, analyze, isCryptoSymbol } from "../engine.js";

const dir = process.argv[2], n = +(process.argv[3] || CONFIG.TOP_COINS);
if (!dir) { console.error("Pakai: node riset/uji-tahap3.mjs <folder-data> [jumlah-koin]"); process.exit(1); }
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
const st = (r, days) => {
  const g = r.filter((x) => x > 0).reduce((a, x) => a + x, 0), b = -r.filter((x) => x <= 0).reduce((a, x) => a + x, 0);
  return `${String(r.length).padStart(5)} trade · ${(r.length / days).toFixed(1)}/hari · win ${(r.filter((x) => x > 0).length / r.length * 100).toFixed(1)}% · PF ${(g / b).toFixed(2)}`;
};
console.log(`${coins.length} koin`);
for (const tf of ["1h", "4h"]) {
  const a = [], b = [];
  for (const s of coins) {
    const c = load(s, tf), t = load(s, "4h");
    if (!c || c.length < 600) continue;
    const res = analyze(s, tf, c, tf === "4h" ? null : t);
    for (const side in res.sides) for (const x of res.sides[side].closed) {
      if (x.entryTime >= START && x.entryTime < SPLIT) a.push(x.ret); else if (x.entryTime >= SPLIT && x.entryTime < END) b.push(x.ret);
    }
  }
  console.log(`${tf} latih: ${st(a, (SPLIT - START) / 864e5)}\n${tf} uji:   ${st(b, (END - SPLIT) / 864e5)}`);
}

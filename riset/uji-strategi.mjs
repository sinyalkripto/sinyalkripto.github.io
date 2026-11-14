// Uji ulang strategi di data historis (CSV dari crypto-signal-bot/data: time,open,high,low,close,volume).
// Pakai: node riset/uji-strategi.mjs <folder-data>
// Hasil dibagi tiga periode waktu yang berurutan supaya kelihatan apakah hasilnya konsisten
// (bukan cuma bagus di satu periode).
import fs from "fs";
import { analyze } from "../engine.js";

const dir = process.argv[2];
if (!dir) { console.error("Pakai: node riset/uji-strategi.mjs <folder-data>"); process.exit(1); }
const load = (sym, tf) => {
  const p = `${dir}/${sym}_${tf}.csv`;
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").trim().split("\n").slice(1).map((l) => {
    const a = l.split(",");
    return { time: Date.parse(a[0].replace(" ", "T")), open: +a[1], high: +a[2], low: +a[3], close: +a[4], volume: +a[5] };
  });
};
const SKIP = ["RLUSDUSDT", "SPCXBUSDT"];
const coins = [...new Set(fs.readdirSync(dir).filter((f) => f.endsWith("_1h.csv")).map((f) => f.split("_")[0]))].filter((s) => !SKIP.includes(s));
const pf = (r) => { const g = r.filter((x) => x > 0).reduce((a, x) => a + x, 0), b = -r.filter((x) => x <= 0).reduce((a, x) => a + x, 0); return b ? g / b : NaN; };
const fmt = (r) => (r.length ? `${String(r.length).padStart(4)} trade · win ${(r.filter((x) => x > 0).length / r.length * 100).toFixed(1)}% · PF ${pf(r).toFixed(2)} · rata2 ${(r.reduce((a, x) => a + x, 0) / r.length * 100).toFixed(3)}%` : "0 trade");

console.log(`${coins.length} koin: ${coins.join(", ")}\n`);
for (const tf of ["5m", "15m", "30m", "1h", "4h"]) {
  const all = [], folds = [[], [], []];
  for (const s of coins) {
    const c = load(s, tf), t = load(s, "4h");
    if (!c || c.length < 600) continue;
    const a = analyze(s, tf, c, tf === "4h" ? null : t);
    const t0 = c[0].time, t1 = c[c.length - 1].time;
    for (const side of Object.keys(a.sides)) for (const x of a.sides[side].closed) {
      all.push(x.ret);
      folds[Math.min(2, Math.floor((x.entryTime - t0) / (t1 - t0 + 1) * 3))].push(x.ret);
    }
  }
  console.log(`${tf.padEnd(4)} semua: ${fmt(all)}`);
  folds.forEach((f, i) => console.log(`     periode ${i + 1}: ${fmt(f)}`));
}

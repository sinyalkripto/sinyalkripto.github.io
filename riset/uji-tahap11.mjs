// Tahap 11: tambah sinyal 1 jam lewat jumlah koin, konsensus, dan TP.
// Pakai: node --max-old-space-size=12000 riset/uji-tahap11.mjs <folder-data> '[{"n":100,"k":3}]'   (n = koin, k = konsensus, tp opsional)
// Koin diurutkan menurut volume 1 jam 17–19 Nov 2026. Latih Des 2025–Jul 2026, uji Agu–19 Nov 2026. "koin 61+" = hasil koin peringkat 61 ke atas saja.
import fs from "fs";
import { CONFIG, analyze, simulate, isCryptoSymbol } from "../engine.js";
const dir = process.argv[2];
const load = (sym, tf) => { const p = `${dir}/${sym}_${tf}.csv`; if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8").trim().split("\n").slice(1).map((l) => { const a = l.split(","); return { time: Date.parse(a[0].replace(" ", "T") + "Z"), open: +a[1], high: +a[2], low: +a[3], close: +a[4], volume: +a[5] }; }); };
const T0 = Date.parse("2026-11-17T00:00:00Z");
const coins = fs.readdirSync(dir).filter((f) => f.endsWith("_1h.csv")).map((f) => f.split("_")[0]).filter(isCryptoSymbol)
  .map((s) => [s, load(s, "1h").filter((k) => k.time >= T0).reduce((a, k) => a + k.close * k.volume, 0)])
  .sort((a, b) => b[1] - a[1]).map((x) => x[0]).slice(0, 125);
const D = (s) => Date.parse(s + "T00:00:00Z");
const [A, B, E] = [D("2025-12-01"), D("2026-08-01"), D("2026-11-20")];
const btc = load("BTCUSDT", "1h");
const days = { a: (B - A) / 864e5, b: (E - B) / 864e5 };
const cfgs = JSON.parse(process.argv[3]);
const st = (r, d) => { if (!r.length) return "–"; const g = r.filter((x) => x > 0).reduce((a, x) => a + x, 0), b = -r.filter((x) => x <= 0).reduce((a, x) => a + x, 0); const sl = r.filter(x=>x< -0.005).length;
  return `${(r.length / d).toFixed(1).padStart(5)}/hr win ${(r.filter(x=>x>0.001).length/r.length*100).toFixed(0)}% PF ${(g / b).toFixed(2)} Σ${(r.reduce((a, x) => a + x, 0) * 100).toFixed(0).padStart(4)}% rugi ${(sl/r.length*100).toFixed(0)}%`; };
const cache = {};
for (const c of cfgs) {
  if (c.tp) CONFIG.EXITS["1h"].tp = c.tp; else CONFIG.EXITS["1h"].tp = 0.75;
  const key = CONFIG.EXITS["1h"].tp;
  cache[key] ??= coins.map((s) => { const k = load(s, "1h"); return k?.length > 600 ? { s, rows: analyze(s, "1h", k, load(s, "4h"), btc).rows.map(({ pola, ...x }) => x) } : null; }).filter(Boolean);
  const all = cache[key].slice(0, c.n);
  const m = new Map();
  for (const x of all) for (const r of x.rows) if (r.signal === "BELI" || r.signal === "SHORT") m.set(r.time + r.signal, (m.get(r.time + r.signal) || 0) + 1);
  const out = { a: [], b: [], a2: [], b2: [] };
  all.forEach((x, i) => {
    const rows = CONFIG.MAJORS.includes(x.s) ? x.rows : x.rows.map((r) => ((r.signal === "BELI" || r.signal === "SHORT") && m.get(r.time + r.signal) < c.k ? { ...r, signal: "TAHAN" } : r));
    for (const side of ["long", "short"]) for (const t of simulate(rows, side, "1h").closed) {
      const p = t.entryTime >= A && t.entryTime < B ? "a" : t.entryTime >= B && t.entryTime < E ? "b" : null; if (!p) continue;
      out[p].push(t.ret); if (i >= 60) out[p + "2"].push(t.ret);
    }
  });
  console.log(`${c.n} koin, konsensus ${c.k}, TP ${key}`.padEnd(30), `latih ${st(out.a, days.a)} | uji ${st(out.b, days.b)} || koin 61+: latih ${st(out.a2, days.a)} | uji ${st(out.b2, days.b)}`);
}

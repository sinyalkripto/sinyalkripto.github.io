// Uji setup per timeframe di data CSV: node riset/uji-setup.mjs [old] <folder-data>
// "old" = hanya pullback (sebelum riset Nov 2026). Juga menghitung berapa persen jam ada posisi terbuka.
import fs from "fs";
import { analyze, CONFIG } from "../engine.js";
const dir = process.argv[3] || "data";
const load = (sym, tf) => fs.readFileSync(`${dir}/${sym}_${tf}.csv`, "utf8").trim().split("\n").slice(1).map((l) => { const a = l.split(","); return { time: Date.parse(a[0].replace(" ", "T")), open: +a[1], high: +a[2], low: +a[3], close: +a[4], volume: +a[5] }; });
const coins = [...new Set(fs.readdirSync(dir).map((f) => f.split("_")[0]))];
const H=36e5,D=864e5;
const st = (t) => { const r=t.map(x=>x.ret); const g = r.filter((x) => x > 0).reduce((a, x) => a + x, 0), b = -r.filter((x) => x <= 0).reduce((a, x) => a + x, 0); return `n=${r.length} WR=${(r.filter((x) => x > 0).length / r.length * 100).toFixed(1)} PF=${(g / b).toFixed(2)}`; };
const mode=process.argv[2];
if (mode==="old") { CONFIG.SETUPS={}; }
for (const tf of ["1h", "4h"]) {
  const all = [];
  for (const s of coins) {
    const a = analyze(s, tf, load(s, tf), tf === "4h" ? null : load(s, "4h"));
    for (const side of Object.keys(a.sides)) all.push(...a.sides[side].closed);
  }
  const t0=Math.min(...all.map(x=>x.entryTime)), t1=Math.max(...all.map(x=>x.entryTime));
  const f=[0,1,2].map(k=>all.filter(x=>x.entryTime>=t0+(t1-t0)*k/3 && x.entryTime<t0+(t1-t0)*(k+1)/3+1));
  // open concurrency per hour
  let hrs=0, withOpen=0, sum=0;
  for (let h=t0; h<t1; h+=H){ hrs++; const n=all.filter(x=>x.entryTime<=h && x.hitTo>h).length; sum+=n; if(n) withOpen++; }
  const days=new Set(all.map(x=>Math.floor(x.entryTime/D))).size;
  console.log(tf, mode||"new", st(all), `/day=${(all.length/((t1-t0)/D)).toFixed(2)} days=${(days/((t1-t0)/D)*100).toFixed(0)}% folds: ${f.map(st).join(" | ")}`);
  console.log(`   jam dgn >=1 posisi terbuka: ${(withOpen/hrs*100).toFixed(0)}%  rata2 posisi terbuka: ${(sum/hrs).toFixed(2)}`);
}

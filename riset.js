// Riset jumlah koin: ambil riwayat panjang untuk koin bervolume terbesar, jalankan strategi
// yang sama (engine.js), lalu ringkas sinyal per hari, win rate, dan profit factor per kelompok koin.
import { CONFIG, SETUP_LABEL, analyze, connect, isCryptoSymbol } from "./engine.js?v=15";

const DAYS = 180;              // jendela evaluasi
const N_COINS = 100;           // kandidat koin teratas menurut volume
const GROUPS = [20, 30, 40, 60, 80, 100];
const H = 36e5, D = 864e5;
const BYBIT_TF = { "1h": "60", "4h": "240" };
const $ = (s) => document.querySelector(s);
const status = (t) => { $("#status").textContent = t; };
const pct = (x) => `${(x * 100).toFixed(1)}%`;
const f2 = (x) => (Number.isFinite(x) ? x.toFixed(2) : x === Infinity ? "∞" : "–");

async function getJson(url) {
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url);
      if (r.status === 429 || r.status === 418) { await new Promise((ok) => setTimeout(ok, 5000)); continue; }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return await r.json();
    } catch (e) { if (i === 2) throw e; await new Promise((ok) => setTimeout(ok, 1000)); }
  }
}

/** Satu halaman candle yang berakhir di endTime (urut lama -> baru). */
async function page(src, symbol, interval, endTime) {
  if (src.base.includes("bybit") || src.base.includes("bytick")) {
    const q = new URLSearchParams({ category: "linear", symbol, interval: BYBIT_TF[interval], limit: 1000, end: endTime });
    const j = await getJson(`${src.base}/v5/market/kline?${q}`);
    return j.result.list.map((k) => [+k[0], k[1], k[2], k[3], k[4], k[5]]).reverse();
  }
  const spot = src.kind === "spot";
  const q = new URLSearchParams({ symbol, interval, limit: spot ? 1000 : 1500, endTime });
  return getJson(`${src.base}${spot ? "/api/v3" : "/fapi/v1"}/klines?${q}`);
}

/** `count` candle terakhir yang sudah tutup. */
async function history(src, symbol, interval, count) {
  const step = interval === "1h" ? H : 4 * H;
  const now = Date.now();
  let end = now, out = [];
  while (out.length < count) {
    const p = await page(src, symbol, interval, end);
    if (!p.length) break;
    out = [...p.filter((k) => !out.length || +k[0] < out[0].time).map((k) => ({ time: +k[0], open: +k[1], high: +k[2], low: +k[3], close: +k[4], volume: +k[5] })), ...out];
    end = out[0].time - 1;
    if (p.length < 500) break;
  }
  return out.filter((k) => k.time + step <= now).slice(-count);
}

function stats(trades, from, to) {
  const t = trades.filter((x) => x.t >= from && x.t < to);
  const gain = t.filter((x) => x.r > 0).reduce((a, x) => a + x.r, 0);
  const loss = -t.filter((x) => x.r <= 0).reduce((a, x) => a + x.r, 0);
  return { n: t.length, win: t.length ? t.filter((x) => x.r > 0).length / t.length : NaN, pf: loss ? gain / loss : gain ? Infinity : NaN, perDay: t.length / ((to - from) / D) };
}

function coverage(trades, from, to) {
  const days = new Set(trades.filter((x) => x.t >= from && x.t < to).map((x) => Math.floor(x.t / D)));
  const total = Math.round((to - from) / D);
  const times = trades.filter((x) => x.t >= from && x.t < to).map((x) => x.t).sort((a, b) => a - b);
  let gap = 0;
  for (let i = 1; i < times.length; i++) gap = Math.max(gap, times[i] - times[i - 1]);
  return { daysWith: days.size / total, maxGapH: gap / H };
}

let RESULT = null;

async function run() {
  $("#go").disabled = true;
  status("Menghubungkan ke sumber data…");
  const src = await connect();
  const tickers = await src.tickers24();
  const ok = await src.symbols();
  const coins = tickers
    .filter((t) => isCryptoSymbol(t.symbol) && ok.has(t.symbol)
      && !/USD/.test(t.symbol.replace(/USDT$/, "")) && !["PAXGUSDT", "WBTCUSDT", "WBETHUSDT", "XAUUSDT"].includes(t.symbol) && t.volume > 0)
    .sort((a, b) => b.volume - a.volume).slice(0, N_COINS).map((t) => t.symbol);
  const to = Date.now(), from = to - DAYS * D;
  const per = [];
  let done = 0;
  const queue = coins.map((s, i) => ({ s, i }));
  async function worker() {
    for (let job = queue.shift(); job; job = queue.shift()) {
      try {
        const c1 = await history(src, job.s, "1h", DAYS * 24 + 300);
        const c4 = await history(src, job.s, "4h", DAYS * 6 + 300);
        if (c1.length < 600 || c4.length < 120) throw new Error("data terlalu pendek");
        const r = analyze(job.s, "1h", c1, c4);
        const trades = ["long", "short"].flatMap((side) => r.sides[side].closed.map((x) => ({ t: x.entryTime, r: x.ret, s: side[0], k: x.setup })));
        // 4 jam: dianalisis tanpa filter tren di atasnya (sama seperti di situs).
        const r4 = analyze(job.s, "4h", c4, null);
        const trades4 = ["long", "short"].flatMap((side) => r4.sides[side].closed.map((x) => ({ t: x.entryTime, r: x.ret, s: side[0], k: x.setup })));
        per[job.i] = { sym: job.s, rank: job.i + 1, start: c1[Math.min(c1.length - 1, 200)].time, trades, trades4 };
      } catch (e) { per[job.i] = { sym: job.s, rank: job.i + 1, error: String(e.message || e), trades: [], trades4: [] }; }
      done++;
      $("#bar i").style.width = `${done / coins.length * 100}%`;
      status(`Mengambil data dan menguji ${done}/${coins.length} koin (${src.name})…`);
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()]);

  // Ringkasan per jumlah koin (urut volume, tanpa memilih koin berdasarkan hasil).
  const thirds = [0, 1, 2].map((k) => [from + (to - from) * k / 3, from + (to - from) * (k + 1) / 3]);
  const sizes = [...new Set([...GROUPS.filter((n) => n < per.length), per.length])];
  const groups = sizes.map((n) => {
    const tr = per.slice(0, n).flatMap((p) => p.trades);
    return { n, all: stats(tr, from, to), last30: stats(tr, to - 30 * D, to), thirds: thirds.map(([a, b]) => stats(tr, a, b)), cov: coverage(tr, from, to) };
  });

  // Uji maju: pilih koin yang PF-nya >= 1 di paruh pertama, lalu nilai di paruh kedua.
  const mid = from + (to - from) / 2;
  const chosen = per.filter((p) => { const s = stats(p.trades, from, mid); return s.n >= 3 && s.pf >= 1; });
  const wf = {
    chosen: chosen.map((p) => p.sym),
    chosenSecond: stats(chosen.flatMap((p) => p.trades), mid, to),
    allSecond: stats(per.flatMap((p) => p.trades), mid, to),
  };

  // Per setup dan timeframe, untuk 40 koin teratas (sama dengan yang dipantau situs).
  const top = per.slice(0, CONFIG.TOP_COINS);
  const bySetup = [];
  for (const [tf, key] of [["1h", "trades"], ["4h", "trades4"]]) {
    const all = top.flatMap((p) => p[key]);
    const kinds = [...new Set(all.map((x) => x.k))];
    bySetup.push({ tf, k: "semua", all: stats(all, from, to), last30: stats(all, to - 30 * D, to), thirds: thirds.map(([a, b]) => stats(all, a, b)), cov: coverage(all, from, to) });
    for (const k of kinds) { const tr = all.filter((x) => x.k === k); bySetup.push({ tf, k, all: stats(tr, from, to), last30: stats(tr, to - 30 * D, to), thirds: thirds.map(([a, b]) => stats(tr, a, b)), cov: coverage(tr, from, to) }); }
  }

  RESULT = { at: new Date().toISOString(), source: src.name, days: DAYS, config: { TP: CONFIG.TAKE_PROFIT_ATR, SL: CONFIG.STOP_LOSS_ATR, ADX: CONFIG.ADX_MIN }, groups, wf, bySetup,
    coins: per.map((p) => ({ sym: p.sym, rank: p.rank, error: p.error, ...stats(p.trades, from, to), recent30: stats(p.trades, to - 30 * D, to).n })) };
  render();
  $("#dl").disabled = false;
  status(`Selesai: ${per.filter((p) => !p.error).length} koin diuji dari ${src.name}, ${DAYS} hari terakhir, timeframe 1 jam.`);
}

function render() {
  const R = RESULT;
  const cls = (x, lim) => (x >= lim ? "up" : "down");
  let h = "";
  if (R.bySetup) {
    h += `<h2>Per setup (${CONFIG.TOP_COINS} koin teratas)</h2><p>Semua setup aktif di situs, timeframe 1 jam dan 4 jam. "Semua" = gabungan setup di timeframe itu.</p>
    <div class="wrap"><table><tr><th>TF</th><th>Setup</th><th>Sinyal/hari</th><th>30 hari terakhir/hari</th><th>Hari ada sinyal</th><th>Win rate</th><th>PF</th><th>PF per 1/3 periode</th></tr>`;
    for (const g of R.bySetup) h += `<tr><td>${g.tf === "1h" ? "1j" : "4j"}</td><td>${g.k === "semua" ? "<b>Semua</b>" : SETUP_LABEL[g.k] || g.k}</td><td>${g.all.perDay.toFixed(1)}</td><td>${g.last30.perDay.toFixed(1)}</td><td>${pct(g.cov.daysWith)}</td>
      <td class="${cls(g.all.win, .6)}">${pct(g.all.win)}</td><td class="${cls(g.all.pf, 1)}">${f2(g.all.pf)}</td><td>${g.thirds.map((s) => f2(s.pf)).join(" / ")}</td></tr>`;
    h += "</table></div>";
  }
  h += `<h2>Per jumlah koin (urut volume, 1 jam)</h2><p>Sinyal per hari dihitung untuk semua koin di kelompok itu. PF di atas 1 berarti untung bersih setelah biaya. "Hari ada sinyal" = persentase hari dengan minimal 1 sinyal.</p>
  <div class="wrap"><table><tr><th>Koin teratas</th><th>Sinyal</th><th>Sinyal/hari</th><th>30 hari terakhir/hari</th><th>Hari ada sinyal</th><th>Jeda terlama</th><th>Win rate</th><th>PF</th><th>PF per 1/3 periode</th></tr>`;
  for (const g of R.groups) h += `<tr><td>${g.n}</td><td>${g.all.n}</td><td>${g.all.perDay.toFixed(1)}</td><td>${g.last30.perDay.toFixed(1)}</td><td>${pct(g.cov.daysWith)}</td><td>${g.cov.maxGapH.toFixed(0)} jam</td>
    <td class="${cls(g.all.win, .6)}">${pct(g.all.win)}</td><td class="${cls(g.all.pf, 1)}">${f2(g.all.pf)}</td><td>${g.thirds.map((s) => f2(s.pf)).join(" / ")}</td></tr>`;
  h += `</table></div><h2>Uji maju</h2><p>Koin dipilih dari paruh pertama (PF ≥ 1, minimal 3 trade), lalu dinilai di paruh kedua yang belum dilihat.</p>
  <div class="wrap"><table><tr><th>Kelompok</th><th>Trade paruh 2</th><th>Sinyal/hari</th><th>Win rate</th><th>PF</th></tr>
  <tr><td>Semua ${R.coins.length} koin</td><td>${R.wf.allSecond.n}</td><td>${R.wf.allSecond.perDay.toFixed(1)}</td><td>${pct(R.wf.allSecond.win)}</td><td>${f2(R.wf.allSecond.pf)}</td></tr>
  <tr><td>${R.wf.chosen.length} koin terpilih</td><td>${R.wf.chosenSecond.n}</td><td>${R.wf.chosenSecond.perDay.toFixed(1)}</td><td>${pct(R.wf.chosenSecond.win)}</td><td>${f2(R.wf.chosenSecond.pf)}</td></tr></table></div>
  <h2>Per koin</h2><div class="wrap"><table><tr><th>#</th><th>Koin</th><th>Trade</th><th>Win rate</th><th>PF</th><th>Sinyal 30 hari</th></tr>`;
  for (const c of R.coins) h += `<tr><td>${c.rank}</td><td>${c.sym}${c.error ? ` <span class="down">(${c.error})</span>` : ""}</td><td>${c.n}</td><td>${c.n ? pct(c.win) : "–"}</td><td>${f2(c.pf)}</td><td>${c.recent30}</td></tr>`;
  $("#out").innerHTML = h + "</table></div>";
  try { localStorage.setItem("riset.v2", JSON.stringify(RESULT)); } catch {}
}

$("#go").addEventListener("click", () => run().catch((e) => { status(`Gagal: ${e.message || e}`); $("#go").disabled = false; }));
$("#dl").addEventListener("click", () => {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(RESULT)], { type: "application/json" }));
  a.download = "riset-koin.json"; a.click();
});
try { const old = JSON.parse(localStorage.getItem("riset.v2")); if (old) { RESULT = old; render(); $("#dl").disabled = false; status(`Hasil terakhir (${old.at}). Tekan Mulai untuk mengulang.`); } } catch {}

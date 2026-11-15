// Tes logika notifikasi tanpa jaringan: node notify/tes.mjs
import assert from "assert/strict";
import { buildEmail, diff } from "./inti.mjs";

const H = 36e5, T0 = Date.UTC(2026, 10, 15, 8);
const pos = (o = {}) => ({ sym: "BTCUSDT", tf: "1h", side: "LONG", setup: "retest", entry: 100, entryTime: T0, tp: 103, sl: 96, sl0: 96, breakeven: false, price: 100.5, ...o });
const k = (p) => `${p.sym}|${p.tf}|${p.side}|${p.entryTime}`;
const cur = (open = [], closed = [], seen = ["BTCUSDT|1h", "ETHUSDT|1h", "ETHUSDT|4h", "BTCUSDT|4h"]) => ({
  open: Object.fromEntries(open.map((p) => [k(p), p])),
  closed: Object.fromEntries(closed.map((c) => [k(c), c])),
  seen: new Set(seen), price: { BTCUSDT: 101, ETHUSDT: 50 },
});

// Run pertama: ringkasan posisi terbuka.
let r = diff(null, cur([pos()]), T0 + 5 * 6e4);
assert.deepEqual(r.events.map((e) => e.type), ["AKTIF"]);
let s = r.state;

// Run berikutnya tanpa perubahan: tidak ada email.
r = diff(s, cur([pos()]), T0 + H);
assert.equal(r.events.length, 0);
s = r.state;

// Sinyal baru (segar) dikirim, posisi lama yang baru terlihat tidak.
const eth = pos({ sym: "ETHUSDT", side: "SHORT", entryTime: T0 + H, entry: 50, tp: 48, sl: 52 });
const stale = pos({ sym: "ETHUSDT", tf: "4h", entryTime: T0 - 20 * H });
r = diff(s, cur([pos(), eth, stale]), T0 + H + 3 * 6e4);
assert.deepEqual(r.events.map((e) => `${e.type} ${e.sym}`), ["BARU ETHUSDT"]);
s = r.state;

// SL digeser ke harga masuk.
r = diff(s, cur([pos({ breakeven: true, sl: 100.12 }), eth, stale]), T0 + 2 * H);
assert.deepEqual(r.events.map((e) => e.type), ["BE"]);
s = r.state;

// Posisi selesai: dikirim sekali saja.
const doneBtc = { ...pos(), result: "TP", exit: 103, ret: 0.029, hitFrom: T0 + 2 * H };
r = diff(s, cur([eth, stale], [doneBtc]), T0 + 3 * H);
assert.deepEqual(r.events.map((e) => `${e.type} ${e.result}`), ["SELESAI TP"]);
s = r.state;
r = diff(s, cur([eth, stale], [doneBtc]), T0 + 4 * H);
assert.equal(r.events.length, 0);
s = r.state;

// Data koin gagal diambil: posisi diingat, tidak dianggap selesai.
r = diff(s, cur([], [], ["BTCUSDT|1h"]), T0 + 5 * H);
assert.equal(r.events.length, 0);
assert.ok(r.state.open[k(eth)]);
s = r.state;

// Masuk dan selesai di antara dua pengecekan: hasilnya tetap dikirim.
const quick = { ...pos({ sym: "BTCUSDT", entryTime: T0 + 5 * H }), result: "SL", exit: 96, ret: -0.041, hitFrom: T0 + 5 * H };
r = diff(s, cur([eth, stale], [quick]), T0 + 6 * H + 6e4);
assert.deepEqual(r.events.map((e) => `${e.type} ${e.result} ${!!e.quick}`), ["SELESAI SL true"]);

// Email.
const m = buildEmail([{ type: "BARU", ...eth }, { type: "SELESAI", ...doneBtc }], { source: "Binance Spot", now: T0 + 3 * H });
assert.match(m.subject, /1 sinyal baru, 1 selesai \(ETH short 1j\)/);
assert.match(m.text, /Sinyal baru: ETH Short · 1 jam/);
assert.match(m.text, /Kena TP: BTC Long · 1 jam/);
assert.match(m.html, /Buka Titik Masuk/);
assert.match(buildEmail([]).subject, /notifikasi email aktif/);
console.log(m.subject + "\n\n" + m.text);
console.log("\nSemua tes lulus");

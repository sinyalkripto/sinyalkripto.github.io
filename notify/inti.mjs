// Logika notifikasi (tanpa jaringan, supaya bisa dites): bandingkan posisi bot sekarang dengan
// catatan run sebelumnya, lalu susun email untuk sinyal baru, SL digeser ke harga masuk, dan posisi selesai.
import { INTERVAL_MS, SETUP_LABEL, baseAsset, sides } from "../engine.js";

export const SITE = "https://sinyalkripto.github.io/";
// Sinyal baru hanya dikirim kalau masuknya belum lewat 2 candle (misalnya koin baru masuk top 40
// dengan posisi lama: dicatat saja, tidak dikirim karena sudah basi untuk diikuti).
export const FRESH_CANDLES = 2;
// Posisi yang datanya gagal diambil tetap diingat paling lama 7 hari.
const KEEP_MS = 7 * 864e5;

const key = (sym, tf, side, entryTime) => `${sym}|${tf}|${side}|${entryTime}`;

/**
 * Ringkas hasil analyze() semua koin: posisi terbuka dan trade yang baru selesai, per kunci.
 * results: [{ sym, tf, r }] (r = hasil analyze).
 */
export function collect(results) {
  const open = {}, closed = {}, seen = new Set(), price = {};
  for (const { sym, tf, r } of results) {
    seen.add(`${sym}|${tf}`);
    price[sym] = r.last?.close ?? price[sym];
    for (const side of sides()) {
      const sd = r.sides[side];
      if (sd.open) {
        const o = sd.open;
        open[key(sym, tf, o.side, o.entryTime)] = {
          sym, tf, side: o.side, setup: o.setup, entry: o.entry, entryTime: o.entryTime,
          tp: o.tp, sl: o.sl, sl0: o.sl0, breakeven: !!o.breakeven, price: r.last?.close,
        };
      }
      for (const t of sd.closed.slice(-20)) {
        closed[key(sym, tf, t.side, t.entryTime)] = {
          sym, tf, side: t.side, setup: t.setup, entry: t.entry, entryTime: t.entryTime, tp: t.tp, sl: t.sl,
          result: t.result, exit: t.exit, ret: t.ret, hitFrom: t.hitFrom,
        };
      }
    }
  }
  return { open, closed, seen, price };
}

/**
 * Bandingkan dengan state run sebelumnya. Mengembalikan { events, state }.
 * Run pertama (state kosong): satu email ringkasan posisi yang sedang terbuka.
 */
export function diff(prev, cur, now = Date.now()) {
  const first = !prev || !prev.open;
  const old = first ? {} : prev.open;
  const next = {};
  const events = [];
  // Posisi selesai yang sudah dikirim (2 hari terakhir), supaya tidak dobel.
  const done = Object.fromEntries(Object.entries(prev?.done || {}).filter(([, t]) => now - t < 2 * 864e5));
  for (const [k, p] of Object.entries(cur.open)) {
    const o = old[k];
    if (!o) {
      const fresh = now - p.entryTime <= FRESH_CANDLES * INTERVAL_MS[p.tf];
      if (first) events.push({ type: "AKTIF", ...p });
      else if (fresh) events.push({ type: "BARU", ...p });
    } else if (p.breakeven && !o.breakeven) {
      events.push({ type: "BE", ...p });
    }
    next[k] = { ...p, seenAt: now };
  }
  for (const [k, o] of Object.entries(old)) {
    if (next[k]) continue;
    const c = cur.closed[k];
    if (c) {
      if (!done[k]) events.push({ type: "SELESAI", ...o, ...c, price: cur.price[o.sym] });
      done[k] = now;
    } else if (!cur.seen.has(`${o.sym}|${o.tf}`) && now - (o.seenAt ?? now) < KEEP_MS) {
      // Data koin ini gagal diambil (atau koin keluar dari top 40): ingat dulu, cek lagi nanti.
      next[k] = o;
    }
  }
  // Posisi yang masuk dan sudah selesai di antara dua pengecekan (misalnya run terlambat): kirim hasilnya.
  if (!first) {
    for (const [k, c] of Object.entries(cur.closed)) {
      if (old[k] || done[k] || c.entryTime <= (prev.updatedAt ?? now) - INTERVAL_MS[c.tf]) continue;
      events.push({ type: "SELESAI", ...c, quick: true, price: cur.price[c.sym] });
      done[k] = now;
    }
  }
  return { events, state: { open: next, done, updatedAt: now } };
}

// ---------- Format ----------
const nf = (d) => new Intl.NumberFormat("id-ID", { minimumFractionDigits: d, maximumFractionDigits: d });
function decimals(p) {
  if (p >= 100) return 2;
  if (p >= 1) return 4;
  return Math.min(8, Math.max(4, 3 - Math.floor(Math.log10(p)) + 1));
}
export const fmtPrice = (p) => (p == null || Number.isNaN(p) ? "–" : nf(decimals(Math.abs(p) || 1)).format(p));
const fmtPct = (x, d = 2) => (x > 0 ? "+" : x < 0 ? "−" : "") + nf(d).format(Math.abs(x)) + "%";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
export function fmtTime(ms) {
  const d = new Date(ms + 7 * 3600e3);
  const hh = String(d.getUTCHours()).padStart(2, "0"), mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}, ${hh}:${mm} WIB`;
}
const TF = { "1h": "1 jam", "4h": "4 jam" };
const tfLabel = (tf) => TF[tf] || tf;
const RESULT = { TP: "Kena TP", SL: "Kena SL", BE: "Impas (SL di harga masuk)", WAKTU: "Ditutup waktu habis", REVERSE: "Ditutup sinyal balik" };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function lines(e) {
  const coin = `${baseAsset(e.sym)} ${e.side === "LONG" ? "Long" : "Short"} · ${tfLabel(e.tf)}`;
  const pct = (x) => fmtPct((x / e.entry - 1) * 100, 1);
  const levels = [
    ["Harga masuk", fmtPrice(e.entry)],
    ["Take profit", `${fmtPrice(e.tp)} (${pct(e.tp)})`],
    ["Stop loss", `${fmtPrice(e.sl)} (${pct(e.sl)})`],
  ];
  if (e.type === "SELESAI") {
    return {
      title: `${RESULT[e.result] || e.result}: ${coin}`,
      color: e.ret > 0 ? "#16a34a" : "#dc2626",
      rows: [["Hasil", `${fmtPct(e.ret * 100)} (setelah biaya, tanpa leverage)`], ["Harga keluar", fmtPrice(e.exit)],
        ["Harga masuk", fmtPrice(e.entry)], ["Masuk", fmtTime(e.entryTime)], ["Selesai", fmtTime(e.hitFrom)],
        ...(e.quick ? [["Catatan", "Sinyal ini masuk dan selesai di antara dua pengecekan, jadi email sinyal barunya tidak sempat terkirim."]] : [])],
    };
  }
  if (e.type === "BE") {
    return {
      title: `SL digeser ke harga masuk: ${coin}`,
      color: "#2563eb",
      rows: [["Stop loss baru", `${fmtPrice(e.sl)} (posisi sekarang minimal impas)`], ...levels.slice(0, 2),
        ["Harga sekarang", fmtPrice(e.price)], ["Masuk", fmtTime(e.entryTime)]],
    };
  }
  const until = e.entryTime + INTERVAL_MS[e.tf];
  return {
    title: `${e.type === "BARU" ? "Sinyal baru" : "Posisi terbuka"}: ${coin}`,
    color: e.side === "LONG" ? "#16a34a" : "#dc2626",
    rows: [...levels, ["Setup", SETUP_LABEL[e.setup] || e.setup || "–"], ["Harga sekarang", fmtPrice(e.price)],
      ["Masuk", fmtTime(e.entryTime)],
      ...(e.type === "BARU" ? [["Berlaku s/d", `${fmtTime(until)} (lewat itu jangan dikejar kalau harga sudah jauh)`]] : [])],
  };
}

const ORDER = { BARU: 0, AKTIF: 1, BE: 2, SELESAI: 3 };

/** Susun email: { subject, text, html }. */
export function buildEmail(events, { source = "", now = Date.now() } = {}) {
  const ev = [...events].sort((a, b) => ORDER[a.type] - ORDER[b.type] || b.entryTime - a.entryTime);
  const items = ev.map(lines);
  const count = (t) => ev.filter((e) => e.type === t).length;
  const short = (e) => `${baseAsset(e.sym)} ${e.side === "LONG" ? "long" : "short"} ${e.tf === "1h" ? "1j" : e.tf === "4h" ? "4j" : e.tf}`;
  const parts = [];
  if (count("BARU")) parts.push(`${count("BARU")} sinyal baru`);
  if (count("AKTIF")) parts.push(`${count("AKTIF")} posisi terbuka`);
  if (count("BE")) parts.push(`${count("BE")} SL ke harga masuk`);
  if (count("SELESAI")) parts.push(`${count("SELESAI")} selesai`);
  const first = ev[0];
  let subject = `Titik Masuk: ${parts.join(", ")}`;
  if (ev.length === 1) subject = `Titik Masuk: ${items[0].title}`;
  else if (first && first.type === "BARU") subject += ` (${ev.filter((e) => e.type === "BARU").slice(0, 3).map(short).join(", ")})`;
  if (!ev.length) subject = "Titik Masuk: notifikasi email aktif (belum ada posisi terbuka)";

  const welcome = "Notifikasi email sudah aktif. Mulai sekarang email dikirim tiap ada sinyal baru, SL digeser ke harga masuk, atau posisi selesai (TP/SL).";
  const intro = !ev.length ? welcome : ev.some((e) => e.type === "AKTIF") ? `${welcome} Ini posisi bot yang sedang terbuka:` : "";
  const foot = `Dicek ${fmtTime(now)}${source ? ` · data ${source}` : ""}. Angka bisa sedikit beda dengan situs kalau situs memakai data futures. Bukan nasihat keuangan.`;

  const text = [intro, ...items.map((it) => [it.title, ...it.rows.map(([k, v]) => `  ${k}: ${v}`)].join("\n")),
    !ev.length ? "Belum ada posisi terbuka." : "", `Buka situs: ${SITE}`, foot].filter(Boolean).join("\n\n");

  const card = (it) => `<div style="border:1px solid #e5e7eb;border-left:4px solid ${it.color};border-radius:8px;padding:12px 14px;margin:0 0 12px">
<div style="font-weight:700;font-size:16px;margin:0 0 8px">${esc(it.title)}</div>
<table style="border-collapse:collapse;font-size:14px">${it.rows.map(([k, v]) => `<tr><td style="color:#6b7280;padding:2px 12px 2px 0;white-space:nowrap">${esc(k)}</td><td style="padding:2px 0">${esc(v)}</td></tr>`).join("")}</table></div>`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif;color:#111827;max-width:560px">
${intro ? `<p>${esc(intro)}</p>` : ""}${items.map(card).join("\n")}${!ev.length ? "<p>Belum ada posisi terbuka.</p>" : ""}
<p><a href="${SITE}" style="display:inline-block;background:#111827;color:#fff;padding:8px 14px;border-radius:6px;text-decoration:none">Buka Titik Masuk</a></p>
<p style="color:#6b7280;font-size:12px">${esc(foot)}</p></div>`;
  return { subject, text, html };
}

// Dijalankan GitHub Actions tiap jam (lihat .github/workflows/notifikasi-email.yml):
// ambil data top koin, jalankan mesin sinyal yang sama dengan situs (engine.js) di 1 jam dan 4 jam,
// lalu kirim email kalau ada sinyal baru, SL digeser ke harga masuk, atau posisi selesai.
//
// Rahasia (repo Settings > Secrets and variables > Actions), tidak pernah ditulis ke log:
//   EMAIL_USER          alamat Gmail pengirim
//   EMAIL_APP_PASSWORD  App Password Gmail (16 huruf), bukan password biasa
//   EMAIL_TO            (opsional) alamat penerima, default sama dengan EMAIL_USER
// Variabel lain: STATE_FILE (default notify/state.json), DRY_RUN=1 (tidak kirim email),
// TEST_EMAIL=1 (selalu kirim email berisi posisi yang sedang terbuka).
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { CONFIG, analyze, connect, dataSource, fetchKlines, topSymbols } from "../engine.js";
import { buildEmail, collect, diff } from "./inti.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = process.env.STATE_FILE || path.join(here, "state.json");
const DRY = process.env.DRY_RUN === "1";
const TEST = process.env.TEST_EMAIL === "1";
const TFS = ["1h", "4h"];

async function pool(tasks, n) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < tasks.length) await tasks[i++](); }));
}

async function analyzeAll() {
  const src = await connect();
  console.log(`Sumber data: ${src.name}`);
  const symbols = (await topSymbols(CONFIG.TOP_COINS)).map((t) => t.symbol);
  console.log(`${symbols.length} koin`);
  const results = [], failed = [];
  await pool(symbols.map((sym) => async () => {
    try {
      const k4 = await fetchKlines(sym, "4h");
      const k1 = await fetchKlines(sym, "1h");
      results.push({ sym, tf: "4h", r: analyze(sym, "4h", k4.closed) });
      results.push({ sym, tf: "1h", r: analyze(sym, "1h", k1.closed, k4.closed) });
    } catch (e) {
      failed.push(`${sym}: ${e.message}`);
    }
  }), 6);
  if (failed.length) console.log(`Gagal ${failed.length} koin: ${failed.join("; ")}`);
  if (!results.length) throw new Error("Tidak ada data koin yang berhasil diambil");
  return results;
}

async function send(mail) {
  const user = process.env.EMAIL_USER, pass = process.env.EMAIL_APP_PASSWORD;
  const to = process.env.EMAIL_TO || user;
  if (!user || !pass) throw new Error("Secret EMAIL_USER dan EMAIL_APP_PASSWORD belum diisi (lihat notify/README.md)");
  const { default: nodemailer } = await import("nodemailer");
  const t = nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass: pass.replace(/\s+/g, "") } });
  await t.sendMail({ from: `Titik Masuk <${user}>`, to, subject: mail.subject, text: mail.text, html: mail.html });
}

async function main() {
  if (!DRY && !TEST && !(process.env.EMAIL_USER && process.env.EMAIL_APP_PASSWORD)) {
    console.log("Secret email belum diisi, notifikasi dilewati (lihat notify/README.md).");
    return;
  }
  let prev = null;
  try { prev = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")); } catch (e) { /* run pertama */ }
  const now = Date.now();
  const cur = collect(await analyzeAll());
  const { events, state } = diff(prev, cur, now);
  const first = !prev;
  const open = Object.values(cur.open);
  console.log(`Posisi terbuka: ${open.length} · kejadian baru: ${events.length}${first ? " (run pertama)" : ""}`);
  for (const e of events) console.log(`  ${e.type} ${e.sym} ${e.tf} ${e.side}${e.result ? " " + e.result : ""}`);

  let list = events;
  if (TEST) list = [...open.map((p) => ({ type: "AKTIF", ...p })), ...events.filter((e) => e.type === "SELESAI")];
  if (list.length || first || TEST) {
    const mail = buildEmail(list, { source: dataSource()?.name, now });
    console.log(`Email: ${mail.subject}`);
    if (DRY) console.log("DRY_RUN: email tidak dikirim\n" + mail.text);
    else { await send(mail); console.log("Email terkirim"); }
  }
  // State disimpan setelah email terkirim: kalau pengiriman gagal, run berikutnya mencoba lagi.
  if (!DRY) fs.writeFileSync(STATE_FILE, JSON.stringify(state));
}

main().catch((e) => { console.error(`Gagal: ${e.message}`); process.exit(1); });

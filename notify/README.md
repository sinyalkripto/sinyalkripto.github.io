# Notifikasi email

GitHub Actions menjalankan `cek-sinyal.mjs` tiap jam (menit ke-2, sesaat setelah candle 1 jam tutup).
Script memakai mesin sinyal yang sama dengan situs (`engine.js`) untuk top 40 koin di timeframe 1 jam
dan 4 jam, lalu mengirim email ke alamat kamu kalau:

- ada **sinyal baru** (posisi bot baru terbuka), lengkap dengan harga masuk, TP, SL, dan batas waktu masuk;
- **SL digeser ke harga masuk** (posisi 1 jam sudah jalan setengah ke TP, minimal impas);
- posisi **selesai**: kena TP, kena SL, impas, atau ditutup karena waktu habis.

Kalau tidak ada kejadian, tidak ada email. Beberapa kejadian di jam yang sama digabung jadi satu email.
Email pertama setelah setup berisi daftar posisi yang sedang terbuka.

## Setup (sekali saja, ±5 menit)

1. **Bikin App Password Gmail.** Akun Google harus sudah pakai verifikasi 2 langkah. Buka
   <https://myaccount.google.com/apppasswords>, isi nama (misalnya `Titik Masuk`), klik **Create**, lalu
   salin 16 huruf yang muncul. Ini bukan password Gmail biasa, dan bisa dicabut kapan saja di halaman yang sama.
2. **Simpan sebagai secret di repo.** Buka repo di GitHub, **Settings > Secrets and variables > Actions >
   New repository secret**, lalu buat:
   - `EMAIL_USER`: alamat Gmail kamu
   - `EMAIL_APP_PASSWORD`: 16 huruf App Password tadi
   - `EMAIL_TO` (opsional): alamat penerima kalau beda dengan `EMAIL_USER`

   Secret tidak kelihatan oleh siapa pun (repo ini publik, tapi secret tetap rahasia dan disensor di log).
3. **Tes.** Buka tab **Actions > Notifikasi email > Run workflow > Run workflow**. Dalam 1–2 menit harus
   ada email masuk berisi posisi yang sedang terbuka. Cek folder Spam kalau belum ada, lalu tandai
   "Bukan spam".

Setelah itu jalan sendiri tiap jam. Untuk berhenti: **Actions > Notifikasi email > … > Disable workflow**.

## Catatan

- Data diambil dari Binance Futures kalau bisa, dan biasanya jatuh ke **Binance Spot** karena server
  GitHub (di AS) diblokir Binance Futures. Harga spot dan futures sedikit beda, jadi sesekali sinyal di
  email bisa beda dengan situs (yang memakai futures).
- Jadwal GitHub Actions bisa telat 5–15 menit di jam sibuk. Batas masuk di email ("Berlaku s/d") tetap
  dihitung dari jam candle, jadi cek harga sebelum masuk.
- GitHub mematikan jadwal otomatis kalau repo tidak ada commit selama 60 hari. Kalau email berhenti,
  buka tab Actions dan klik **Enable workflow**.
- Catatan posisi yang sudah dikirim disimpan di cache Actions (bukan di repo), supaya tidak ada email dobel.
- Tes logika tanpa jaringan: `node notify/tes.mjs`. Coba tanpa kirim email: `DRY_RUN=1 node notify/cek-sinyal.mjs`.

# Sinyal Kripto

Situs statis (GitHub Pages) yang menampilkan sinyal long/short otomatis untuk 30 koin teratas
Binance Futures.

## Strategi: pullback searah tren

- **Tren harus jelas:** tren 4 jam naik (EMA 20 > EMA 50 di 4 jam), di timeframe itu EMA 20 > EMA 50
  dan harga di atas EMA 200, dan ADX 14 minimal 20 (bukan pasar sideways). Short kebalikannya.
- **Masuk saat koreksi selesai:** RSI 14 naik kembali menembus 40 (long) atau turun kembali menembus 60 (short).
- **Keluar:** take profit 1 ATR, stop loss 2 ATR, atau ditutup paksa setelah 48 candle.
- Sinyal dilewati kalau jarak take profit di bawah 0,6% harga (terlalu kecil dibanding biaya).

## Hasil uji historis (Apr–Okt 2026, 17 koin, biaya 0,05% per transaksi, tanpa leverage)

| Timeframe | Trade | Win rate | Profit factor | Sebelumnya (EMA cross) |
|---|---|---|---|---|
| 5m | 267 | 68,5% | 1,01 | win 32,8%, PF 0,76 |
| 15m | 341 | 64,2% | 0,82 | win 33,0%, PF 0,81 |
| 30m | 332 | 70,2% | 0,98 | win 33,2%, PF 0,85 |
| 1j | 283 | 71,7% | 1,12 | win 37,1%, PF 1,15 |
| 4j | 61 | 65,6% | 1,04 | win 32,8%, PF 0,85 |

Di 1 jam, win rate 70–74% dan profit factor ≥ 1,0 di ketiga periode waktu yang diuji terpisah.
Win rate tinggi terutama karena TP (1 ATR) lebih dekat dari SL (2 ATR): satu kali kena SL menghapus
kira-kira dua kali TP, jadi lihat juga profit factor. Timeframe di bawah 1 jam belum untung bersih
setelah biaya. Hasil masa lalu bukan jaminan hasil berikutnya.

Catatan: reward:risk 0,5 ini sengaja di bawah aturan minimal 1 di skill trader (trader-risk). Dengan
reward:risk 1, win rate terbaik di data yang sama sekitar 57% (PF 1,10), jadi dipilih TP lebih dekat
supaya win rate di atas 60%.

### Riset jumlah koin (180 hari sampai 14 Nov 2026, 1 jam, data Binance Spot, `riset.html`)

| Koin teratas | Sinyal/hari | Hari ada sinyal | Win rate | Profit factor | PF per 1/3 periode |
|---|---|---|---|---|---|
| 20 | 1,9 | 71% | 70,3% | 1,04 | 1,04 / 1,25 / 0,93 |
| 30 | 2,9 | 82% | 69,7% | 0,96 | 1,17 / 0,99 / 0,80 |
| 40 | 4,0 | 88% | 69,9% | 0,97 | 1,06 / 1,06 / 0,83 |
| 100 | 10,3 | 100% | 69,5% | 1,00 | 1,21 / 0,97 / 0,88 |

Menambah koin menambah sinyal dengan win rate tetap sekitar 70%, tapi profit factor di sekitar 1
(impas setelah biaya) dan sepertiga terakhir di bawah 1 untuk semua kelompok. Memilih koin dari hasil
paruh pertama tidak membantu di paruh kedua (PF 0,98 vs 0,98), jadi koin dipilih menurut volume saja.
Situs memantau 30 koin kripto teratas (token saham seperti NVDAB/TSLAB tidak ikut).

## Di situs

- Timeframe 1 jam ditandai **utama** dan jadi default (grafik dan daftar sinyal). Timeframe di bawah 1 jam
  ditandai **eksperimen** karena di uji historis belum untung bersih setelah biaya.
- Bagian **Hasil live** mencatat sinyal yang muncul sejak pelacakan dimulai (di browser pengunjung,
  localStorage), lalu menampilkan win rate dan profit factor-nya di samping angka backtest. Tombol
  "Mulai ulang pelacakan" mengosongkan catatan.

Uji ulang sendiri: `node riset/uji-strategi.mjs <folder-data-csv>` (format CSV dari crypto-signal-bot/data).

## File

- `engine.js`: logika sinyal, backtest, dan perkiraan waktu take profit.
- `app.js`: tampilan, grafik (TradingView Lightweight Charts), analisis teknikal.
- `globe.js`: animasi bumi di halaman pembuka.
- `riset/uji-strategi.mjs`: uji strategi di data historis.

Semua data diambil langsung dari API publik oleh browser pengunjung. Urutan sumber: Binance Futures,
lalu Bybit (kontrak perpetual USDT, api.bybit.com lalu api.bytick.com) kalau Binance diblokir di
jaringan pengunjung, dan terakhir Binance Spot (data-api.binance.vision). Situs memberi tahu kalau
memakai sumber cadangan. Buka dengan `?debug` untuk melihat sumber mana yang berhasil.
Tidak ada server, akun, atau API key. Bukan nasihat keuangan. Trading futures berisiko tinggi.

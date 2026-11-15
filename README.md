# Titik Masuk

Situs statis (GitHub Pages) yang menampilkan sinyal long/short otomatis untuk 40 koin teratas
Binance Futures.

## Strategi: pullback searah tren (+ breakout-retest di 1 jam, range di 4 jam)

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
Situs memantau 40 koin kripto teratas (token saham seperti NVDAB/TSLAB tidak ikut).

## Riset Nov 2026: lebih banyak sinyal di 1 jam dan 4 jam

Kenapa jarang: setup pullback butuh 5 syarat sekaligus (tren 4 jam, EMA 20/50, EMA 200, ADX >= 20, RSI
menyeberang 40/60 tepat di satu candle). Di 4 jam hanya ada 6 candle per hari per koin, jadi kejadiannya
langka. Posisi juga cepat selesai (TP 1 ATR), jadi "sinyal aktif" cuma terlihat beberapa jam.

Diuji 6 setup + filter di data 18 koin, 25 Apr–22 Okt 2026 (biaya 0,05% per transaksi, kalau TP dan SL
kena di candle yang sama dihitung SL). Penilaian: 120 hari pertama untuk memilih, 60 hari terakhir
untuk menguji (out-of-sample).

| Setup | TF | Sinyal/hari (18 koin) | Win rate | PF | PF 60 hari terakhir | Dipakai |
|---|---|---|---|---|---|---|
| Pullback (lama) | 1j | 1,6 | 71,7% | 1,11 | 1,19 | ya |
| Breakout-retest (high/low 20 candle) | 1j | 4,6 | 72,6% | 1,24 | 1,32 | **ya, baru** |
| Pantulan EMA 20 | 1j | 4,4 | 64,1% | 0,79 | – | tidak |
| RSI 2 (Connors) | 1j | 11,2 | 69,2% | 1,03 | <1 | tidak |
| Range / Bollinger | 1j | 1,5 | 48,3% | 0,78 | <1 | tidak |
| Pullback (lama) | 4j | 0,3 | 65,6% | 1,04 | – | ya |
| Range / Bollinger (ADX < 25) | 4j | 0,3 | 75,0% | 1,94 | >1 | **ya, baru** |
| Breakout-retest | 4j | 1,5 | 66–68% | ±1,0 | 0,6–0,9 | tidak (rugi di 60 hari terakhir) |

Breakout-retest di 1 jam stabil: 80% dari 270 kombinasi parameter tetap PF > 1 di 60 hari terakhir,
long dan short sama-sama untung, 4 dari 6 bulan PF > 1. Filter tren 4 jam penting (tanpa itu PF turun
ke ±1). Filter volume breakout tidak konsisten, jadi tidak dipakai.

Hasil gabungan (mesin di situs, 18 koin):

| TF | Sinyal/hari | Hari ada sinyal | Jam dengan posisi terbuka | Win rate | PF per 1/3 periode |
|---|---|---|---|---|---|
| 1j lama | 1,6 | 63% | 34% | 71,7% | 1,09 / 1,16 / 1,09 |
| 1j baru | 6,5 | 98% | 71% | 72,3% | 1,08 / 1,36 / 1,24 |
| 4j lama | 0,4 | 26% | 31% | 65,6% | 0,78 / 1,11 / 1,23 |
| 4j baru | 0,75 | 40% | 41% | 69,7% | 1,20 / 1,25 / 1,39 |

Dengan 40 koin angkanya kira-kira 2,2 kali (1j ±14 sinyal/hari, 4j ±1,7 sinyal/hari). 1 jam praktis
selalu ada sinyal tiap hari. 4 jam belum bisa dijamin tiap hari tanpa merusak edge: setup yang
menambah banyak sinyal 4 jam (breakout-retest, RSI 2, pantulan EMA) rugi di 60 hari terakhir.
Sampel range 4 jam masih kecil (48 trade), jadi pantau di `riset.html` (sekarang juga menguji 4 jam
dan memecah hasil per setup).

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

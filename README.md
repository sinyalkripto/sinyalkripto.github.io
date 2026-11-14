# Sinyal Kripto

Situs statis (GitHub Pages) yang menampilkan sinyal long/short otomatis untuk 20 koin teratas
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

Uji ulang sendiri: `node riset/uji-strategi.mjs <folder-data-csv>` (format CSV dari crypto-signal-bot/data).

## File

- `engine.js`: logika sinyal, backtest, dan perkiraan waktu take profit.
- `app.js`: tampilan, grafik (TradingView Lightweight Charts), analisis teknikal.
- `globe.js`: animasi bumi di halaman pembuka.
- `riset/uji-strategi.mjs`: uji strategi di data historis.

Semua data diambil langsung dari API publik Binance Futures oleh browser pengunjung.
Tidak ada server, akun, atau API key. Bukan nasihat keuangan. Trading futures berisiko tinggi.

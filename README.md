# Sinyal Kripto

Situs statis (GitHub Pages) yang menampilkan sinyal long/short otomatis untuk 20 koin teratas
Binance Futures: EMA 20/50 + RSI 14 + filter tren 4 jam, stop loss 1,5 ATR, take profit 3 ATR.

Semua data diambil langsung dari API publik Binance Futures oleh browser pengunjung.
Tidak ada server, akun, atau API key.

- `engine.js`: logika sinyal, backtest, dan perkiraan waktu take profit.
- `app.js`: tampilan, grafik (TradingView Lightweight Charts), analisis teknikal.
- `globe.js`: animasi bumi di halaman pembuka.

Bukan nasihat keuangan. Trading futures berisiko tinggi.

# Titik Masuk

Situs statis (GitHub Pages) yang menampilkan sinyal long/short otomatis untuk 60 koin kripto teratas
Binance Futures (token saham/komoditas dan `CONFIG.BLOCKLIST` tidak ikut).

Setelan terbaru (tahap 3, lihat di bawah): 1 jam memakai TP 1,25 ATR, SL 2 ATR, breakeven di 40% jalan ke TP,
dan tren 4 jam harus searah EMA 200 4 jam. 4 jam hanya setup pullback.

## Strategi: pullback searah tren (+ breakout-retest di 1 jam)

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
Situs waktu itu memantau 40 koin kripto teratas (sejak tahap 3: 60 koin; token saham tidak ikut).

**Daftar blokir** (`CONFIG.BLOCKLIST` di `engine.js`): koin yang secara konsisten kena stop loss di sinyal
live dilewati dan tidak muncul di situs maupun `riset.html`. Isi saat ini (Nov 2026): JCT, AKE, SOXS, AAVE,
LIT, NVDA, ARIA, NEAR. NVDA dan SOXS adalah token saham/ETF yang lolos filter token saham. Di data lokal
(1 jam, Apr–Okt 2026, 17 koin) NEAR punya profit factor terendah (0,68, 30% trade kena SL); koin lain di daftar
belum ada datanya. Tambah atau hapus simbol langsung di daftar itu.

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

### Tahap 2: exit 1 jam (TP 1,5 ATR + breakeven)

Riset 40 koin di `riset.html` (180 hari sampai 15 Nov 2026): sinyal 1 jam 16/hari (100% hari), win 70,7%,
tapi PF hanya 1,08 dan 30 hari terakhir 0,87. Dicoba di 18 koin (120 hari pilih, 60 hari uji):

| Varian 1 jam | Sinyal/hari | Win rate | PF 120 hari | PF 60 hari terakhir |
|---|---|---|---|---|
| TP 1 / SL 2 (tahap 1) | 6,5 | 72,3% | 1,16 | 1,28 |
| TP 1,5 / SL 2 + breakeven di 50% | 7,1 | 76,3% | 1,25 | 1,29 |
| Filter BTC di atas EMA 200 | 5,3 | 72,9% | 1,29 | 1,23 |
| TP 1,5 / SL 1,5 | 6,9 | 55% | 1,19 | 1,14 |

Dipakai: TP 1,5 ATR, SL 2 ATR, SL digeser ke harga masuk + 0,12% (biaya) setelah harga jalan 50% ke TP.
Sekitarnya stabil (TP 1,25–1,75, breakeven 40–60% semua PF 1,06–1,38). Filter BTC tidak dipakai: memotong
20% sinyal tanpa perbaikan di periode uji, dan merusak 4 jam. Breakeven di 4 jam juga merusak, jadi 4 jam
tidak berubah. Catatan: Oktober tetap lemah di semua varian (PF 0,8–0,9); "Impas" dihitung sebagai trade
untung kecil, jadi sebagian kenaikan win rate berasal dari situ.

### Tahap 3: win rate lebih tinggi dan sinyal lebih banyak (17 Nov 2026)

**Data.** API bursa diblokir dari lingkungan uji, jadi dipakai arsip resmi Binance (`data.binance.vision`,
diambil lewat S3, lihat `riset/unduh-data.py`): candle Futures USDT-M 1 jam dan 4 jam, 1 Nov 2025 sampai
16 Nov 2026, 117 koin kripto (46 koin besar + 71 koin peringkat 47–160 menurut volume Oktober 2026).
Bulan pertama hanya pemanasan indikator. **Latih:** 1 Des 2025–31 Jul 2026 (8 bulan, untuk memilih).
**Uji:** 1 Agu–16 Nov 2026 (3,5 bulan, tidak dipakai saat memilih). Biaya 0,05% per transaksi, tanpa leverage.

**Yang dicoba** (ide dari repo Vibe-Trading `technical-basic`/`smc`/`candlestick`, ai-trading-claude
`trade-technical`, dan freqtrade): 22 filter (volume di atas rata-rata, OBV searah, DI searah, kekuatan
candle, ADX naik, jarak dari EMA 20, ATR%, RSI tidak ekstrem, jam UTC, long/short saja, EMA 200 4 jam),
parameter ADX/RSI/retest/TP/SL/breakeven, setup tambahan (range 1 jam, retest 4 jam), timeframe 15 menit,
dan jumlah koin 20/40/60/80. Filter dianggap lolos hanya kalau membantu di kelompok 46 koin **dan** di
kelompok 71 koin lain (yang tidak dipakai saat menyusun ide).

**Hasil yang tidak dipakai:** hampir semua filter yang bagus di 46 koin (misalnya candle kuat + ADX 25:
PF 1,23 latih / 1,40 uji) hilang efeknya di 71 koin lain (PF 1,00 / 0,97), jadi kemungkinan kebetulan.
15 menit tetap rugi (PF 0,74–0,89). Retest di 4 jam rugi (PF 0,89–0,94). Range 4 jam yang dipakai sejak
tahap 1 ternyata rugi di data 12 bulan (60 koin: PF 1,01 latih, 0,62 uji; sampel lama hanya 48 trade).

**Yang dipakai** (tetap membantu di kedua kelompok koin): filter EMA 200 4 jam, TP 1,25 ATR + breakeven
40% (win rate naik), 60 koin (sinyal naik), range 4 jam dimatikan.

1 jam, mesin di situs (`engine.js`), koin teratas menurut volume tanpa daftar blokir:

| Setelan | Sinyal/hari (uji) | Win rate latih | PF latih | Win rate uji | PF uji |
|---|---|---|---|---|---|
| Situs sebelumnya (40 koin) | 16,6 | 73,6% | 0,97 | 75,8% | 1,09 |
| **Baru (60 koin)** | **22,8** | **80,7%** | **1,00** | **83,0%** | **1,20** |
| Baru, 80 koin | 30,1 | 80,2% | 0,99 | 82,6% | 1,19 |
| Baru + ADX 25 (60 koin) | 17,0 | 81,4% | 1,06 | 82,7% | 1,18 |

4 jam, 60 koin: pullback saja 1,7 sinyal/hari, win 72%/69%, PF 1,12/1,02 (sebelumnya dengan range:
2,7 sinyal/hari, win 68%/63%, PF 1,08/0,89).

PF per bulan (1 jam, baru): Des 0,68 · Jan 1,12 · Feb 1,49 · Mar 0,86 · Apr 0,65 · Mei 1,24 · Jun 1,12 ·
Jul 0,84 · Agu 1,46 · Sep 1,20 · Okt 0,96 · Nov 1,24. Ada 4 bulan rugi dari 12.

**Cek silang dengan freqtrade** (strategi diport ke `riset/freqtrade/TitikMasuk.py`, 20 koin besar, futures,
data yang sama): setelan baru 1.913 trade, win 79,9%, PF ±1,11, total +1,1%; setelan lama 2.919 trade,
win 73,6%, PF ±1,09, total +1,8%. Di periode uji: baru win 82,7% (+1,3%), lama win 76,3% (+2,8%).
Jadi freqtrade setuju win rate naik ±6 poin, tapi di 20 koin itu profit total tidak lebih baik.

**Catatan jujur.**
- Win rate tinggi sebagian besar dari breakeven: ±48% trade 1 jam ditutup di harga masuk + 0,12% (untung
  tipis ±0,02% setelah biaya). Yang benar-benar kena TP hanya ±33%. Satu kali kena SL (2 ATR) menghapus
  kira-kira 1,6 kali TP penuh.
- Dalam 12 bulan PF 1 jam sekitar 1,05: hampir impas. Strategi ini belum terbukti menghasilkan untung
  besar; win rate tinggi bukan berarti profit tinggi.
- Repo AI (TradingAgents, AI-Trader, Vibe-Trading, ai-trading-claude) butuh API key LLM dan data
  saham/berita, jadi hanya ide indikator/filternya yang diuji di sini. freqtrade hanya dipakai untuk
  backtest (tidak ada trading live atau dry-run ke bursa).

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
- `riset/unduh-data.py`: unduh candle Futures dari arsip resmi Binance (data.binance.vision lewat S3).
- `riset/uji-tahap3.mjs`: uji setelan situs dengan pembagian latih/uji.
- `riset/freqtrade/`: strategi yang sama untuk freqtrade (cek silang backtest, bisa jalan tanpa akses API bursa).

Semua data diambil langsung dari API publik oleh browser pengunjung. Urutan sumber: Binance Futures,
lalu Bybit (kontrak perpetual USDT, api.bybit.com lalu api.bytick.com) kalau Binance diblokir di
jaringan pengunjung, dan terakhir Binance Spot (data-api.binance.vision). Situs memberi tahu kalau
memakai sumber cadangan. Buka dengan `?debug` untuk melihat sumber mana yang berhasil.
Tidak ada server, akun, atau API key. Bukan nasihat keuangan. Trading futures berisiko tinggi.

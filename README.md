# Titik Masuk

Situs statis (GitHub Pages) yang menampilkan sinyal long/short otomatis untuk 60 koin kripto teratas
Binance Futures (token saham/komoditas dan `CONFIG.BLOCKLIST` tidak ikut).

Setelan terbaru (tahap 3 dan 4, lihat di bawah): 1 jam memakai TP 1,25 ATR, SL di balik swing low/high 20 candle
(+0,5 ATR, antara 2 dan 4 ATR), breakeven di 40% jalan ke TP,
dan tren 4 jam harus searah EMA 200 4 jam. Sinyal breakout-retest 1 jam wajib dikonfirmasi pola candlestick
searah (engulfing, pin bar, atau tweezer; tahap 5). 4 jam hanya setup pullback. Sejak tahap 7, sinyal 1 jam juga wajib searah
BTC 1 jam (EMA 20 vs EMA 50), dan timeframe 1m/3m dimatikan. Sejak tahap 8, sinyal 1 jam wajib didukung minimal 3 koin
searah di candle yang sama, dan TP 1 jam 0,75 ATR (BTC/ETH/BNB tetap 1,25 ATR, tanpa konsensus). Sejak tahap 9, sinyal
4 jam dilewati kalau dalam 10 candle terakhir ada lonjakan volume lebih dari 8x rata-rata (koin baru dipompa atau didump). Sejak
tahap 10, 5m/15m/30m dimatikan (rugi di uji historis, sumber hampir semua SL 14–20 Nov) dan token saham yang lolos diblokir.

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

### Tahap 4: SL di balik support/resistance (17 Nov 2026)

Permintaan: SL jangan mepet ke harga masuk, baca support/resistance dulu. SL 1 jam sekarang ditaruh di balik
swing low (long) atau swing high (short) 20 candle terakhir, ditambah 0,5 ATR. Jaraknya minimal 2 ATR (seperti
sebelumnya), maksimal 4 ATR, dan tidak lebih dari 8% harga.

| 60 koin, 1 jam | Sinyal/hari (uji) | Win latih | PF latih | Win uji | PF uji | Kena SL penuh | Jarak SL median |
|---|---|---|---|---|---|---|---|
| Tahap 3 (SL 2 ATR) | 22,8 | 80,7% | 1,00 | 83,0% | 1,20 | 18% | 2,3% |
| Tahap 4 (SL swing) | 22,5 | 86,8% | 1,02 | 88,1% | 1,20 | 11% | 3,9% |

Di 57 koin lain (peringkat 61+), SL swing juga lebih baik: PF 1,03 → 1,08 (latih) dan 1,20 → 1,26 (uji).
Breakeven tetap di 40%: menundanya ke 60% atau menghapusnya menurunkan win rate (84% / 75%) dengan PF mirip.
Jarak SL median (10 koin besar) naik dari 2,3% ke 3,9%, jadi ukuran posisi perlu disesuaikan supaya risiko
per trade tetap sama. 4 jam tidak berubah. `riset/freqtrade/TitikMasuk.py` masih memakai SL 2 ATR.

### Tahap 5: pola chart (17 Nov 2026)

Permintaan: perhatikan pola chart yang umum dipakai trader dan pakai untuk mempertajam sinyal. `pola.js`
mendeteksi, per candle dan tanpa melihat candle sesudahnya:

- **Candlestick** (penolakan di support/resistance): bullish/bearish engulfing, hammer/shooting star (pin bar),
  morning/evening star, tweezer bottom/top, three white soldiers/three black crows.
- **Support/resistance**: swing high/low (3 candle kiri-kanan) 120 candle terakhir, termasuk level yang berganti
  peran (resistance yang ditembus jadi support). Dipakai untuk "memantul dari level" dan jarak ke level terdekat.
- **Reversal**: double/triple top-bottom, head & shoulders (dan inverse), rising/falling wedge. Dianggap aktif
  24 candle setelah close menembus neckline.
- **Continuation**: breakout bendera/pennant/segitiga/kotak kecil setelah tiang minimal 3 ATR.

Diuji seperti tahap 3 (latih Des 2025–Jul 2026, uji Agu–16 Nov 2026), di 60 koin teratas dan di 70 koin lain
(peringkat 61–130 volume Oktober 2026). Tiap varian disimulasikan ulang penuh (`riset/uji-pola.mjs`).

| 1 jam | 60 koin: sinyal/hari uji | PF latih | PF uji | 70 koin lain: PF latih | PF uji |
|---|---|---|---|---|---|
| Tahap 4 (tanpa pola) | 21,9 | 1,02 | 1,18 | 1,03 | 1,21 |
| Hindari pola reversal berlawanan | 18,2 | 1,04 | 1,15 | 1,04 | 1,28 |
| Ruang ke resistance ≥ 0,75 × TP | 11,3 | 0,99 | 1,01 | 1,10 | 1,19 |
| Wajib memantul dari support/resistance | 16,5 | 1,02 | 1,18 | 1,01 | 1,17 |
| Wajib candle + level (rejection) | 6,5 | 1,02 | 1,35 | 1,04 | 1,23 |
| Semua setup wajib engulfing/pin bar/tweezer | 7,5 | 1,15 | 1,34 | 1,14 | 1,33 |
| **Retest wajib engulfing/pin bar/tweezer (dipakai)** | **10,5** | **1,11** | **1,26** | **1,12** | **1,41** |

Win rate hampir tidak berubah (±86–88%); yang naik adalah rata-rata untung per trade (60 koin, uji: 0,11% →
0,14%; latih: 0,01% → 0,07%). PF per bulan (130 koin) lebih baik di 10 dari 12 bulan; bulan rugi turun dari 5
ke 3 (Mar, Apr, Jul). Morning/evening star dan three soldiers/crows justru menurunkan hasil, jadi tidak dihitung
sebagai konfirmasi. Pullback + candle tidak membantu, dan di 4 jam semua filter pola tidak konsisten (sampel
kecil), jadi 4 jam tidak berubah.

**Catatan jujur.** Sinyal 1 jam turun kira-kira separuh (60 koin: ±22 → ±10,5 per hari). Karena trade lebih
sedikit, total untung (jumlah % semua trade, tanpa leverage) di periode uji lebih kecil: 60 koin +259% → +158%,
70 koin +396% → +330%; di periode latih justru naik (+73% → +165%, +126% → +224%). Jadi filter ini membuat tiap
sinyal lebih berkualitas dan modal lebih jarang terpakai, bukan menjamin untung total lebih besar. Pola lain
tetap ditampilkan di halaman Pasar (bagian "Pola chart") sebagai bahan baca grafik.

### Tahap 6: lebih banyak sinyal BTC, ETH, BNB (17 Nov 2026)

Masalah: dengan filter tahap 5, BTC/ETH/BNB hanya dapat ±1 sinyal 1 jam per minggu per koin. Penyebab: filter pola
memotong ±50% sinyal, dan di ±30% candle BTC/BNB target TP (1,25 ATR) di bawah batas 0,6%.

Untuk koin di `CONFIG.MAJORS` (BTC, ETH, BNB), wajib-pola retest diganti `CONFIG.PATTERNS_MAJORS`: sinyal tetap diambil
kecuali candle sinyalnya engulfing/pin bar/tweezer **berlawanan** arah. Koin lain tidak berubah.

| 1 jam, 3 koin besar | Sinyal/hari latih | PF latih | Σ latih | Sinyal/hari uji | PF uji | Σ uji |
|---|---|---|---|---|---|---|
| Tahap 5 | 0,51 | 0,61 | −28% | 0,39 | 2,68 | +6% |
| Filter pola dimatikan | 1,12 | 0,89 | −14% | 0,74 | 1,79 | +13% |
| **Tolak pola lawan (dipakai)** | **1,05** | **0,90** | **−12%** | **0,70** | **2,40** | **+17%** |

Yang dicoba dan tidak dipakai: 15m/30m dengan aturan 1 jam + tren 1 jam atau 4 jam (PF 0,65–0,86 di 3 koin besar,
rugi juga di 12 koin besar lain), timeframe 2 jam (PF 1,14/1,54 di 3 koin besar tapi 0,98 latih di 55 koin lain),
batas TP 0,4%, retest wajib level atau "candle atau level". **Catatan jujur:** di 3 koin besar strategi ini tetap rugi
di periode latih (Des–Jul) dengan setelan apa pun yang diuji; perubahan ini mengurangi ruginya dan menggandakan
sinyal, tapi sampelnya kecil (3 koin). Pantau hasil live-nya.

### Koin tambahan di timeframe kecil (17 Nov 2026)

Timeframe 1m, 3m, 5m, 15m, dan 30m sekarang memindai **100 koin teratas** (`CONFIG.TOP_COINS_FAST`), bukan 60. Koin
peringkat 61–100 hanya dianalisis di timeframe itu (plus 4 jam untuk filter tren), tidak tampil di daftar koin, tapi
sinyalnya muncul di daftar sinyal. 1 jam dan 4 jam tetap 60 koin. Supaya tidak kena batas API Binance, candle diambil
penuh sekali saat situs dibuka, lalu tiap candle tutup cukup 20 candle terakhir yang disambung ke data lama.
Ingat: timeframe di bawah 1 jam masih **eksperimen**; di uji historis belum untung bersih setelah biaya (15m/30m PF
0,65–0,86 di 15 koin besar), jadi tambahan sinyal ini belum tentu menambah untung.

### Tahap 7: evaluasi hasil live dan filter arah BTC (19 Nov 2026)

**Hasil live** (catatan "Hasil live" di browser pengguna, 606 trade selesai, 14–19 Nov 2026, campuran beberapa versi mesin):

| Timeframe | Trade | Win (impas tidak dihitung menang) | PF | Σ |
|---|---|---|---|---|
| 1m | 36 | 64% | 0,81 | −6% |
| 3m | 71 | 65% | 0,59 | −27% |
| 5m | 119 | 84% | 2,20 | +50% |
| 15m | 178 | 77% | 1,51 | +48% |
| 30m | 98 | 72% | 1,30 | +21% |
| 1j | 98 | 39% TP, 56% impas | 2,46 | +49% |
| 4j | 6 | 50% | 0,62 | −11% |

- Untung numpuk di 14–16 Nov (pasar dump, 90% sinyal short); 17–19 Nov rugi (PF 0,47–0,80) waktu pasar mantul.
- Win rate 1 jam "95%" di situs lama sebagian besar trade impas (breakeven). Rata-rata SL 1 jam −6,7% vs TP +2,1%.
- Satu koin (MMT, naik ±120% pada 18 Nov) menyumbang −44% di 17–19 Nov.
- Sinyal yang muncul sendirian (1 koin di candle itu) impas (PF 0,99); sinyal yang muncul bareng ≥4 koin PF 2–3,5,
  tapi kebanyakan dari hari dump 15 Nov, jadi belum dipakai.

**Uji historis** (`riset/uji-tahap7.mjs`, data Binance Futures dari arsip resmi, 108 koin; 1j/4j latih Des 2025–Jul 2026
dan uji Agu–18 Nov 2026; 5m–30m latih Agu–Sep, uji Okt–18 Nov 2026; kelompok 1 = peringkat volume 1–50, kelompok 2 = 51+):

| 1 jam | Trade latih (1+2) | PF latih 1 | PF uji 1 | PF latih 2 | PF uji 2 |
|---|---|---|---|---|---|
| Tahap 6 | 5.055 | 1,14 | 1,39 | 1,01 | 1,39 |
| **+ BTC 1 jam searah (dipakai)** | **3.720** | **1,23** | **1,64** | **1,25** | **1,53** |

Filter BTC: long hanya kalau BTC 1 jam naik (EMA 20 > EMA 50), short hanya kalau BTC 1 jam turun. Sinyal 1 jam turun ±26%.
PF per bulan lebih baik di 11 dari 12 bulan; bulan rugi turun dari 5 (Des, Mar, Apr, Jul, Okt) ke 2 (Des, Jul). Long dan short
sama-sama naik (PF 1,15 → 1,35 dan 1,16 → 1,33). Ini beda dengan filter BTC tahap 2 (BTC di atas EMA 200, long saja) yang
tidak dipakai.

Yang diuji dan **tidak** dipakai:
- Filter BTC di 5m, 15m, 30m, 4j: tidak konsisten (contoh 30m kelompok 1 latih PF 0,72 → 0,59, 4j latih 0,94 → 0,62).
- Filter koin liar (`CONFIG.VOL_FILTER`): lewati sinyal kalau harga bergerak >10/15/20/30% dalam 24 jam, atau ATR >2/2,5/3×
  rata-rata 200 candle. Tidak ada yang membantu di kedua kelompok koin, latih dan uji, di 5m–4j. Kode tetap ada (mati).

**Perubahan lain:**
- 1m dan 3m dimatikan (rugi di live dan di uji historis).
- "Hasil live" sekarang memisah TP, impas, dan rugi; win rate tidak menghitung impas.
- Tombol **Unduh CSV** di "Hasil live" (semua trade, waktu WIB, versi mesin). Tiap trade baru menyimpan versi mesin
  (`ENGINE_VERSION`) dan kapan dicatat, supaya evaluasi berikutnya bisa dipisah per versi.
- Catatan: "Hasil live" menghitung ulang sinyal dengan mesin yang sedang dipakai waktu situs dibuka, jadi trade yang terjadi
  saat situs tertutup tetap tercatat, tapi dengan aturan versi saat dibuka.

### Tahap 8: konsensus antar koin + TP lebih dekat (19 Nov 2026)

Permintaan: win rate 1 jam dinaikkan lagi (dipilih versi ketat). Dari evaluasi live (tahap 7), sinyal yang muncul sendirian
di satu koin hasilnya impas, sedangkan sinyal yang muncul bareng di beberapa koin jauh lebih bagus. Sekarang sinyal 1 jam
hanya diambil kalau **minimal 3 koin** yang dipantau memberi sinyal searah di candle yang sama (`CONFIG.CONSENSUS`), dan
TP 1 jam diturunkan dari 1,25 ke **0,75 ATR**. BTC, ETH, BNB tidak berubah (tidak ikut konsensus, TP tetap 1,25 ATR),
karena di 3 koin itu konsensus 2 koin + TP 1 ATR saja sudah menurunkan PF dari 1,08 ke 0,70.

Uji (mesin di situs, konsensus dihitung di dalam kelompok koin itu sendiri, latih Des 2025–Jul 2026, uji Agu–18 Nov
2026; win rate tidak menghitung impas):

| 1 jam | Sinyal/hari latih | Win latih | PF latih | Σ latih | Sinyal/hari uji | Win uji | PF uji | Σ uji |
|---|---|---|---|---|---|---|---|---|
| 60 koin, tahap 7 | 9,4 | 74% | 1,21 | +257% | 9,5 | 82% | 1,73 | +305% |
| 60 koin, ≥2 koin + TP 1 ATR | 6,8 | 81% | 1,53 | +309% | 6,3 | 87% | 2,02 | +212% |
| **60 koin, ≥3 koin + TP 0,75 ATR (dipakai)** | **5,3** | **85%** | **1,74** | **+272%** | **4,1** | **90%** | **2,25** | **+130%** |
| 48 koin lain, tahap 7 | 5,9 | 74% | 1,28 | +233% | 6,3 | 76% | 1,40 | +145% |
| 48 koin lain, ≥3 koin + TP 0,75 ATR | 1,6 | 92% | 3,44 | +177% | 1,8 | 88% | 2,33 | +63% |

Win rate per bulan (60 koin) lebih tinggi di 12 dari 12 bulan; PF lebih baik di 9 dari 12 (Okt 1,06 → 0,82, Apr dan Jul
hampir sama, tetap di bawah 1). ADX 25/30, breakeven 30%, dan BTC 4 jam juga dicoba, tidak dipakai.

**Catatan jujur.** Sinyal 1 jam turun lebih dari separuh (60 koin: ±9,5 → ±4 per hari), dan TP lebih dekat berarti untung
per trade lebih kecil. Total untung (jumlah % semua trade) di periode uji jauh lebih kecil (+305% → +130%), di periode latih
sedikit naik (+257% → +272%). Jadi ini memilih win rate dan profit factor yang lebih tinggi dengan total untung yang bisa
lebih kecil. Sinyal yang didukung banyak koin berarti banyak posisi searah sekaligus: kalau pasar berbalik, semuanya bisa
kena SL bareng. Di situs, jumlah koin dihitung dari 60 koin utama, jadi sinyal 1 jam bisa muncul sedikit telat waktu situs
baru dibuka (menunggu semua koin termuat). Versi ≥2 koin + TP 1 ATR bisa dipakai lagi dengan mengubah `CONSENSUS` dan `EXITS`.


### Tahap 9: filter lonjakan volume di 4 jam (19 Nov 2026)

Kasus: sinyal short 4 jam di HUMA tepat setelah koin itu dipompa dari 0,0063 ke 0,0098 (+55%) dengan volume sampai 17x
rata-rata. Setup pullback short melihatnya sebagai "koreksi di tren turun", padahal tren turunnya baru saja patah.
Filter gerak 24 jam dan ATR (tahap 7) tidak konsisten, jadi dicoba empat pendekatan lain lewat `CONFIG.BOUNCE_FILTER`:
RSI baru oversold ekstrem, harga terlalu jauh dari EMA 200, harga sudah memantul jauh dari low, dan lonjakan volume.

Uji (`riset/uji-tahap9.mjs`, data Binance Futures, 153 koin di 4 jam: kelompok 1 = peringkat volume Okt 2026 1–60,
kelompok 2 = 61+; latih Des 2025–Jul 2026, uji Agu–19 Nov 2026; long dan short, biaya 0,05%):

| 4 jam | Latih 1 | Uji 1 | Latih 2 | Uji 2 |
|---|---|---|---|---|
| Tahap 8 | 414 trade, PF 1,11, Σ +90% | 184, PF 1,02, +13% | 609, PF 0,99, −15% | 306, PF 1,25, +164% |
| **Volume > 8x dalam 10 candle (dipakai)** | **386, PF 1,18, +123%** | **176, PF 1,17, +70%** | **537, PF 1,01, +14%** | **281, PF 1,40, +214%** |
| RSI oversold < 25 | PF 1,15 | 1,13 | 0,99 | 1,33 |
| Jauh dari EMA 200 > 8 ATR | 1,09 | 0,99 | 1,03 | 1,25 |
| Sudah memantul > 3 ATR | 1,10 | 0,79 | 0,95 | 1,39 |

- Batas volume 6x–12x dan jendela 5–20 candle hampir semuanya lebih baik dari tahap 8 di keempat kolom,
  jadi hasilnya tidak bergantung pada satu angka (pengecualian: 6x di latih 2 dan 12x di latih 1). Per bulan (semua koin), PF sama atau lebih baik di 9 dari 12 bulan.
- Di 1 jam filter ini tidak membantu (PF latih turun di kedua kelompok), jadi hanya 4 jam.
- **Catatan jujur.** Sinyal short HUMA 17 Nov (volume 17x) yang ikut terbuang justru kena TP; filter ini memperbaiki rata-rata,
  bukan setiap kasus. Kenaikannya di kelompok 2 (latih) kecil (PF 0,99 → 1,01), dan 4 jam tetap timeframe dengan PF paling tipis.

### Tahap 10: evaluasi SL 19–20 Nov, matikan 5m/15m/30m (20 Nov 2026)

Keluhan: makin banyak sinyal kena SL (PnL harian pengguna 20 Nov −13,99 USDT). Sinyal 14–20 Nov (sampai 07.00 WIB, data terakhir di
arsip Binance) dihitung ulang dengan mesin tahap 9 dari data Binance Futures:

| TF | Trade 14–20 Nov | Kena SL | PF | Σ | Sejak 16 Nov: PF, Σ |
|---|---|---|---|---|---|
| 5m | 187 | 38 (20%) | 1,21 | +24% | 0,87, −13% |
| 15m | 183 | 38 (21%) | 1,56 | +56% | 1,16, +13% |
| 30m | 97 | 23 (24%) | 1,34 | +27% | 0,92, −6% |
| 1j | 19 | 0 | – (tanpa rugi) | +17% | – (tanpa rugi), +7% |
| 4j | 3 | 2 | 0,15 | −22% | sama |

99 dari 101 SL datang dari 5m/15m/30m; 2 sisanya short 4 jam (termasuk HUMA 19 Nov, SL 16% dari harga masuk). Untung 5m–30m di
minggu ini hampir semua dari hari dump 15 Nov. Token saham ikut lolos ke daftar koin: COHR (Coherent) sendiri kena SL 4 kali di 19–20 Nov.

**Uji historis** (`riset/uji-tahap10.mjs`, 130 koin teratas menurut volume 17–19 Nov; 1j/4j latih Des 2025–Jul 2026, uji Agu–19 Nov
2026; 5m–30m latih 15 Agu–Sep, uji Okt–19 Nov 2026; kolom: PF kelompok 1 latih / uji · kelompok 2 latih / uji):

| Aturan | 1 jam | 4 jam | 15 menit |
|---|---|---|---|
| Tahap 9 | 1,54 / 3,24 · 1,93 / 3,01 | 1,07 / 1,05 · 1,08 / 1,02 | 0,91 / 0,90 · 0,74 / 0,84 |
| Short dilewati kalau funding < −0,05% | 1,27 / 3,44 · 1,54 / 2,73 | 1,03 / 1,08 · 1,04 / 1,00 | 0,90 / 0,99 · 0,74 / 0,81 |
| Short dilewati kalau funding < −0,1% | 1,48 / 3,24 · 1,93 / 2,73 | 1,07 / 1,09 · 1,08 / 1,03 | 0,91 / 0,92 · 0,75 / 0,80 |
| Short dilewati kalau naik > 10% dalam 24 jam | 1,48 / 3,24 · 1,87 / 3,57 | 1,07 / 0,98 · 1,10 / 1,11 | sama |
| Lawan gerak 24 jam > 15% dilewati (dua arah) | 1,53 / 3,24 · 1,92 / 3,01 | 1,04 / 1,12 · 1,12 / 1,18 | sama |
| SL maksimal 8% dari harga | 1,32 / 3,32 · 1,44 / 3,74 | 1,17 / 1,00 · 0,95 / 1,42 | sama |
| Maks 2 posisi searah terbuka | 2,14 / 2,92 · 2,54 / 4,46 | 1,09 / 1,20 · 1,16 / 0,86 | – |
| Tanpa token saham/ETF | 1,51 / 3,11 · 1,93 / 3,68 | 1,06 / 1,06 · 1,09 / 1,04 | 0,89 / 0,95 · 0,74 / 0,98 |

Funding dihitung dari rata-rata premium index 8 jam terakhir (arsip Binance tidak punya funding harian untuk Nov). Tidak ada aturan
yang lebih baik di keempat kolom, jadi **tidak ada filter baru**. 5m (PF uji 0,81 / 0,89), 15m (0,90 / 0,84), dan 30m (1,16 / 0,77) tetap
rugi apa pun filternya; sejak Okt ±31–33% trade 5m–30m kena SL penuh, 4 jam ±29%, 1 jam ±4%.

**Perubahan:**
- 5m, 15m, 30m dimatikan (seperti 1m/3m di tahap 7). Koin tambahan untuk timeframe kecil (peringkat 61–100) ikut hilang.
- 26 token saham, ETF, dan komoditas ditambahkan ke `CONFIG.TRADFI` (COHR, IREN, TTWO, LITE, BE, QCOM, DELL, SQQQ, XPT, dan lain-lain).
  Cirinya: candle akhir pekan cuma ±0,25–0,5x candle hari kerja (koin kripto ±0,6–0,75x). Efeknya ke hasil uji kecil (lihat tabel);
  ini merapikan daftar, bukan menaikkan untung.

**Catatan jujur.** Sinyal jauh berkurang: tinggal 1 jam (±3–4 sinyal/hari di 60 koin) dan 4 jam (±1–2/hari). 4 jam juga tipis (PF ±1,05,
Nov 2026 PF 0,84) dan SL-nya bisa jauh karena tidak ada batas SL di 4 jam; batas 6–12% sudah diuji dan tidak konsisten. Buat trading
manual, membatasi diri ke 2 posisi searah menaikkan PF di 3 dari 4 kolom 1 jam tapi total untung turun ±40%, jadi tidak dipasang di situs.

## Di situs

- Timeframe 1 jam ditandai **utama** dan jadi default (grafik dan daftar sinyal). Timeframe di bawah 1 jam
  ditandai **eksperimen** karena di uji historis belum untung bersih setelah biaya.
- Bagian **Hasil live** mencatat sinyal yang muncul sejak pelacakan dimulai (di browser pengunjung,
  localStorage), lalu menampilkan TP, impas, rugi, win rate, dan profit factor-nya di samping angka backtest.
  "Unduh CSV" mengekspor semua trade; "Mulai ulang pelacakan" mengosongkan catatan.

Uji ulang sendiri: `node riset/uji-strategi.mjs <folder-data-csv>` (format CSV dari crypto-signal-bot/data).

## File

- `engine.js`: logika sinyal, backtest, dan perkiraan waktu take profit.
- `app.js`: tampilan, grafik (TradingView Lightweight Charts), analisis teknikal.
- `globe.js`: animasi bumi di halaman pembuka.
- `riset/uji-strategi.mjs`: uji strategi di data historis.
- `riset/unduh-data.py`: unduh candle Futures dari arsip resmi Binance (data.binance.vision lewat S3).
- `riset/uji-tahap3.mjs`: uji setelan situs dengan pembagian latih/uji.
- `riset/uji-pola.mjs`: uji filter pola chart (CONFIG.PATTERNS) dengan pembagian latih/uji.
- `riset/uji-tahap7.mjs`: uji filter arah BTC dan filter koin liar per timeframe, dua kelompok koin.
- `riset/uji-tahap10.mjs`: uji filter funding, gerak 24 jam, batas SL, batas posisi searah, dan token saham.
- `pola.js`: deteksi pola candlestick, support/resistance, reversal, dan continuation.
- `riset/freqtrade/`: strategi yang sama untuk freqtrade (cek silang backtest, bisa jalan tanpa akses API bursa).

Semua data diambil langsung dari API publik oleh browser pengunjung. Urutan sumber: Binance Futures,
lalu Bybit (kontrak perpetual USDT, api.bybit.com lalu api.bytick.com) kalau Binance diblokir di
jaringan pengunjung, dan terakhir Binance Spot (data-api.binance.vision). Situs memberi tahu kalau
memakai sumber cadangan. Buka dengan `?debug` untuk melihat sumber mana yang berhasil.
Tidak ada server, akun, atau API key. Bukan nasihat keuangan. Trading futures berisiko tinggi.

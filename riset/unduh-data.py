"""Unduh candle Binance Futures USDT-M dari arsip resmi data.binance.vision (lewat S3, tanpa API key).

Pakai: python3 riset/unduh-data.py <folder-keluaran> BTCUSDT,ETHUSDT,... [1h,4h]
Hasil: <folder>/<SIMBOL>_<tf>.csv (time,open,high,low,close,volume; UTC), format yang sama dengan
riset/uji-strategi.mjs dan riset/uji-tahap3.mjs. Rentang: 1 Nov 2025 sampai 16 Nov 2026 (ubah MONTHS/DAYS).
"""
import io, sys, zipfile, urllib.request, datetime as dt
from concurrent.futures import ThreadPoolExecutor

B = "https://s3-ap-northeast-1.amazonaws.com/data.binance.vision/data/futures/um"
MONTHS = [f"2025-{m:02d}" for m in (11, 12)] + [f"2026-{m:02d}" for m in range(1, 11)]
DAYS = [f"2026-11-{d:02d}" for d in range(1, 19)]

def get(url):
    try:
        with urllib.request.urlopen(url, timeout=60) as r:
            z = zipfile.ZipFile(io.BytesIO(r.read()))
    except Exception:
        return []
    out = []
    for line in z.read(z.namelist()[0]).decode().splitlines():
        a = line.split(",")
        if a[0].isdigit():
            out.append((int(a[0]), *a[1:6]))
    return out

def job(out, sym, tf):
    urls = [f"{B}/monthly/klines/{sym}/{tf}/{sym}-{tf}-{m}.zip" for m in MONTHS]
    urls += [f"{B}/daily/klines/{sym}/{tf}/{sym}-{tf}-{d}.zip" for d in DAYS]
    rows = sorted({r for u in urls for r in get(u)})
    if rows:
        with open(f"{out}/{sym}_{tf}.csv", "w") as f:
            f.write("time,open,high,low,close,volume\n")
            for t, *v in rows:
                f.write(dt.datetime.fromtimestamp(t / 1000, dt.timezone.utc).strftime("%Y-%m-%d %H:%M:%S") + "," + ",".join(v) + "\n")
    return sym, tf, len(rows)

if __name__ == "__main__":
    out, syms = sys.argv[1], sys.argv[2].split(",")
    tfs = sys.argv[3].split(",") if len(sys.argv) > 3 else ["1h", "4h"]
    with ThreadPoolExecutor(16) as ex:
        for r in ex.map(lambda st: job(out, *st), [(s, t) for s in syms for t in tfs]):
            print(*r)

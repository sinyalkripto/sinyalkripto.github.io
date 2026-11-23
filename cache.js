// Simpanan candle di browser (IndexedDB). Dipakai supaya:
// 1. Memuat ulang halaman cukup mengambil candle yang belum ada (jauh lebih ringan untuk batas API bursa).
// 2. Kalau semua sumber data sedang tidak bisa dihubungi, situs tetap menampilkan sinyal dari data terakhir.
// Kalau IndexedDB tidak tersedia (mode privat, diblokir), semua fungsi diam-diam tidak melakukan apa-apa.

const DB = "sinyal-cache", STORE = "candles";
let dbp = null;
function db() {
  if (dbp) return dbp;
  dbp = new Promise((res, rej) => {
    if (typeof indexedDB === "undefined") return rej(new Error("IndexedDB tidak tersedia"));
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
  dbp.catch(() => {});
  return dbp;
}

/** Candle tersimpan: { src, savedAt, closed: [{time, open, high, low, close, volume}] } atau null. */
export async function cacheGet(sym, tf) {
  try {
    const d = await db();
    const v = await new Promise((res) => {
      const q = d.transaction(STORE).objectStore(STORE).get(`${sym}|${tf}`);
      q.onsuccess = () => res(q.result ?? null);
      q.onerror = () => res(null);
    });
    if (!v?.c?.length) return null;
    return { src: v.src, savedAt: v.savedAt, closed: v.c.map((k) => ({ time: k[0], open: k[1], high: k[2], low: k[3], close: k[4], volume: k[5] })) };
  } catch (e) { return null; }
}

export async function cachePut(sym, tf, src, closed) {
  try {
    const d = await db();
    const c = closed.map((k) => [k.time, k.open, k.high, k.low, k.close, k.volume]);
    d.transaction(STORE, "readwrite").objectStore(STORE).put({ src, savedAt: Date.now(), c }, `${sym}|${tf}`);
  } catch (e) {}
}

// Daftar koin terakhir (kecil, cukup localStorage).
const SYM_KEY = "symbols.v1";
export function symbolsGet() {
  try { return JSON.parse(localStorage.getItem(SYM_KEY) || "null"); } catch (e) { return null; }
}
export function symbolsPut(src, list) {
  try { localStorage.setItem(SYM_KEY, JSON.stringify({ src, savedAt: Date.now(), list })); } catch (e) {}
}

// Cakrawala bumi di hero: bola titik yang berputar pelan, digambar di <canvas>.
// Malam (tema gelap): lampu kota di atas daratan gelap + cahaya atmosfer biru.
// Siang (tema terang): laut biru, daratan hijau, langit cerah.

const BLOBS = [ // [lon, lat, rx, ry] dalam derajat: perkiraan kasar bentuk daratan
  [-100, 45, 28, 16], [-112, 62, 26, 9], [-88, 31, 10, 8], [-76, 43, 10, 8], [-102, 22, 8, 7], [-90, 15, 6, 5],
  [-42, 72, 12, 7], [-60, -8, 15, 16], [-66, -32, 8, 14], [-72, -45, 3, 8],
  [10, 50, 14, 8], [25, 58, 12, 7], [-4, 40, 5, 4], [12, 43, 4, 5], [-2, 53, 3, 4], [38, 52, 14, 9],
  [18, 8, 19, 18], [26, -20, 12, 14], [46, -19, 3, 6], [32, 26, 10, 7],
  [90, 55, 45, 13], [105, 33, 18, 11], [116, 40, 10, 6], [78, 21, 8, 11], [69, 30, 6, 5],
  [101, 15, 5, 7], [106, 14, 3, 6], [45, 25, 10, 8], [53, 33, 7, 5],
  [101, 0, 3.5, 5], [102, -2, 5, 3], [110, -7.3, 6, 1.4], [114, 1, 4.5, 4], [121, -2, 2, 3], [138, -5, 7, 3],
  [122, 13, 2, 5], [138, 37, 3, 6], [128, 37, 1.5, 2], [134, -25, 16, 10], [146, -38, 3, 2], [172, -42, 3, 5],
];
const CITIES = [ // [lon, lat, ukuran]
  [106.8, -6.2, 1.6], [112.7, -7.3, 1], [110.4, -7, .8], [107.6, -6.9, .9], [98.7, 3.6, .8], [103.8, 1.35, 1.2],
  [101.7, 3.1, 1], [100.5, 13.7, 1.2], [121, 14.6, 1.1], [106.7, 10.8, 1], [105.8, 21, .9], [114.2, 22.3, 1.3],
  [113.3, 23.1, 1.2], [121.5, 31.2, 1.5], [116.4, 39.9, 1.4], [104, 30.6, .9], [139.7, 35.7, 1.7], [135.5, 34.7, 1.1],
  [127, 37.6, 1.3], [72.9, 19.1, 1.3], [77.2, 28.6, 1.4], [88.4, 22.6, 1.1], [80.3, 13.1, .9], [77.6, 13, .9],
  [55.3, 25.2, 1.1], [46.7, 24.7, .8], [51.4, 35.7, .9], [31.2, 30, 1.1], [29, 41, 1.1], [37.6, 55.8, 1.2],
  [-0.1, 51.5, 1.3], [2.3, 48.9, 1.2], [13.4, 52.5, 1], [3.4, 6.5, .9], [-74, 40.7, 1.5], [-87.6, 41.9, 1.1],
  [-118.2, 34, 1.3], [-99.1, 19.4, 1.2], [-46.6, -23.5, 1.3], [-43.2, -22.9, 1], [151.2, -33.9, 1], [144.9, -37.8, .9],
];
const PINGS = [[106.8, -6.2], [103.8, 1.35], [139.7, 35.7], [55.3, 25.2], [72.9, 19.1], [121.5, 31.2]];

const rad = Math.PI / 180;
function isLand(lon, lat) {
  for (const [bx, by, rx, ry] of BLOBS) {
    let dx = lon - bx;
    if (dx > 180) dx -= 360; else if (dx < -180) dx += 360;
    if ((dx / rx) ** 2 + ((lat - by) / ry) ** 2 < 1) return true;
  }
  return false;
}

function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

function buildPoints() {
  const rand = rng(42);
  const pts = [];
  for (let lat = -58; lat <= 80; lat += 1.2) {
    const step = 1.2 / Math.max(Math.cos(lat * rad), 0.2);
    for (let lon = -180; lon < 180; lon += step) {
      if (!isLand(lon, lat)) continue;
      const jl = lon + (rand() - .5) * step * .6, jt = lat + (rand() - .5) * .9;
      pts.push({ lon: jl, lat: jt, light: rand() ** 4 * .7, size: .6 + rand() * .7 });
    }
  }
  for (const [lon, lat, s] of CITIES) {
    const n = Math.round(40 * s);
    for (let i = 0; i < n; i++) {
      const r = Math.abs(rand() + rand() - 1) * 2.2 * s, a = rand() * Math.PI * 2;
      pts.push({ lon: lon + Math.cos(a) * r, lat: lat + Math.sin(a) * r * .8, light: .55 + rand() * .45, size: .7 + rand() * 1.1, city: true });
    }
  }
  for (const p of pts) { p.cl = Math.cos(p.lat * rad); p.sl = Math.sin(p.lat * rad); }
  return pts;
}

export function startGlobe(canvas, getTheme) {
  const ctx = canvas.getContext("2d");
  const pts = buildPoints();
  const starsRand = rng(7);
  const stars = Array.from({ length: 220 }, () => ({ x: starsRand(), y: starsRand() * .75, r: starsRand() * 1.1 + .2, t: starsRand() * 6 }));
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TILT = -50 * rad, ct = Math.cos(TILT), st = Math.sin(TILT);
  let W = 0, H = 0, dpr = 1, running = true, spin = -105 * rad, last = performance.now();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = canvas.clientWidth; H = canvas.clientHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(lon, cl, sl, R, cx, cy) {
    const l = lon * rad + spin;
    const x = cl * Math.sin(l), y = sl, z = cl * Math.cos(l);
    const y2 = y * ct - z * st, z2 = y * st + z * ct;
    return { x: cx + R * x, y: cy - R * y2, z: z2 };
  }

  function frame(now) {
    const dt = Math.min(now - last, 64); last = now;
    if (!reduce) spin += dt * (2 * Math.PI / 240000);
    const dark = getTheme() === "dark";
    const R = Math.max(W * 1.05, H * 1.1);
    const top = H * (W < 640 ? .6 : .56);
    const cx = W / 2, cy = top + R;
    ctx.globalCompositeOperation = "source-over";

    // Langit
    const sky = ctx.createLinearGradient(0, 0, 0, top);
    if (dark) { sky.addColorStop(0, "#000"); sky.addColorStop(1, "#050a16"); }
    else { sky.addColorStop(0, "#9CC8FF"); sky.addColorStop(1, "#E6F1FF"); }
    ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    if (dark) {
      for (const s of stars) {
        const a = .35 + .35 * Math.sin(now / 900 + s.t);
        ctx.fillStyle = `rgba(255,255,255,${a})`;
        ctx.beginPath(); ctx.arc(s.x * W, s.y * top, s.r, 0, 7); ctx.fill();
      }
    }

    // Atmosfer
    const atm = ctx.createRadialGradient(cx, cy, R * .98, cx, cy, R * 1.09);
    if (dark) { atm.addColorStop(0, "rgba(70,150,255,.85)"); atm.addColorStop(.25, "rgba(40,110,255,.35)"); atm.addColorStop(1, "rgba(20,60,200,0)"); }
    else { atm.addColorStop(0, "rgba(255,255,255,.95)"); atm.addColorStop(.3, "rgba(255,255,255,.5)"); atm.addColorStop(1, "rgba(255,255,255,0)"); }
    ctx.fillStyle = atm; ctx.beginPath(); ctx.arc(cx, cy, R * 1.09, 0, 7); ctx.fill();

    // Bola bumi
    const body = ctx.createRadialGradient(cx, cy - R * .2, R * .5, cx, cy, R);
    if (dark) { body.addColorStop(0, "#02040a"); body.addColorStop(.86, "#050c1c"); body.addColorStop(1, "#16305e"); }
    else { body.addColorStop(0, "#0F4CA8"); body.addColorStop(.85, "#2F7BE0"); body.addColorStop(1, "#9FD0FF"); }
    ctx.fillStyle = body; ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fill();

    // Titik daratan + lampu kota
    if (dark) ctx.globalCompositeOperation = "lighter";
    for (const p of pts) {
      const q = project(p.lon, p.cl, p.sl, R, cx, cy);
      if (q.z <= 0 || q.y > H + 4 || q.x < -4 || q.x > W + 4) continue;
      const edge = Math.min(1, q.z * 3.2);
      const unit = R * 0.0024 * (.35 + q.z * .75);
      if (dark) {
        if (!p.city) {
          ctx.fillStyle = `rgba(70,115,200,${.32 * edge})`;
          ctx.beginPath(); ctx.arc(q.x, q.y, unit, 0, 7); ctx.fill();
        }
        if (p.light > .06) {
          ctx.fillStyle = `rgba(255,${190 + (p.city ? 30 : 0)},${p.city ? 140 : 110},${Math.min(1, p.light * 1.3) * edge})`;
          ctx.beginPath(); ctx.arc(q.x, q.y, unit * p.size * (p.city ? .9 : .7), 0, 7); ctx.fill();
        }
      } else {
        const g = p.city ? "rgba(245,240,225," : (p.lat > 50 || p.lat < -50 ? "rgba(235,242,245," : (Math.abs(p.lat - 22) < 9 && p.lon > -20 && p.lon < 60 ? "rgba(222,198,140," : "rgba(70,170,95,"));
        ctx.fillStyle = g + (.92 * edge) + ")";
        ctx.beginPath(); ctx.arc(q.x, q.y, unit * (p.city ? .9 : 1.6), 0, 7); ctx.fill();
      }
    }

    // Denyut sinyal di beberapa kota
    ctx.globalCompositeOperation = "source-over";
    PINGS.forEach(([lon, lat], i) => {
      const q = project(lon, Math.cos(lat * rad), Math.sin(lat * rad), R, cx, cy);
      if (q.z <= .05 || q.y > H) return;
      const ph = ((now / 2400) + i / PINGS.length) % 1;
      const col = i % 3 === 2 ? "255,69,58" : "48,209,88";
      ctx.strokeStyle = `rgba(${col},${(1 - ph) * .9})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(q.x, q.y, 3 + ph * 18 * q.z, 0, 7); ctx.stroke();
      ctx.fillStyle = `rgb(${col})`; ctx.beginPath(); ctx.arc(q.x, q.y, 3, 0, 7); ctx.fill();
    });

    // Kilau matahari terbit di garis cakrawala
    const flare = ctx.createRadialGradient(cx, top, 0, cx, top, Math.min(W, 1200) * .42);
    if (dark) { flare.addColorStop(0, "rgba(255,240,220,.95)"); flare.addColorStop(.08, "rgba(255,200,150,.55)"); flare.addColorStop(.35, "rgba(120,140,255,.14)"); flare.addColorStop(1, "rgba(0,0,0,0)"); }
    else { flare.addColorStop(0, "rgba(255,255,255,1)"); flare.addColorStop(.15, "rgba(255,255,255,.6)"); flare.addColorStop(1, "rgba(255,255,255,0)"); }
    ctx.globalCompositeOperation = dark ? "lighter" : "source-over";
    ctx.fillStyle = flare;
    ctx.save(); ctx.translate(cx, top); ctx.scale(1.9, .55); ctx.translate(-cx, -top);
    ctx.beginPath(); ctx.arc(cx, top, Math.min(W, 1200) * .42, 0, 7); ctx.fill(); ctx.restore();
    ctx.globalCompositeOperation = "source-over";

    // Pudar ke bawah supaya menyatu dengan halaman
    const fade = ctx.createLinearGradient(0, H * .82, 0, H);
    fade.addColorStop(0, dark ? "rgba(0,0,0,0)" : "rgba(255,255,255,0)");
    fade.addColorStop(1, dark ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)");
    ctx.fillStyle = fade; ctx.fillRect(0, H * .82, W, H * .18);

    if (running && !reduce) requestAnimationFrame(frame);
  }

  resize();
  addEventListener("resize", () => { resize(); if (reduce) frame(performance.now()); });
  new IntersectionObserver(([e]) => {
    const was = running; running = e.isIntersecting && !document.hidden;
    if (running && !was && !reduce) { last = performance.now(); requestAnimationFrame(frame); }
  }).observe(canvas);
  document.addEventListener("visibilitychange", () => {
    const was = running; running = !document.hidden;
    if (running && !was && !reduce) { last = performance.now(); requestAnimationFrame(frame); }
  });
  requestAnimationFrame(frame);
  return { redraw: () => reduce && frame(performance.now()) };
}

/* ==========================================================================
   آیرانا Airana — web preview of the Iran weather app.
   Port of the Flutter app's logic; all data comes from free key-less APIs.
   ========================================================================== */
'use strict';

/* ---------------- config ---------------- */
const API = {
  forecast: 'https://api.open-meteo.com/v1/forecast',
  air: 'https://air-quality-api.open-meteo.com/v1/air-quality',
  usgs: 'https://earthquake.usgs.gov/fdsnws/event/1/query',
  emsc: 'https://www.seismicportal.eu/fdsnws/event/1/query',
};
const TZ = 'Asia/Tehran';

/* ---------------- WMO codes ---------------- */
const WMO = {
  0: 'clear', 1: 'mainlyClear', 2: 'partlyCloudy', 3: 'overcast',
  45: 'fog', 48: 'fog',
  51: 'drizzle', 53: 'drizzle', 55: 'drizzle',
  56: 'freezingRain', 57: 'freezingRain',
  61: 'rain', 63: 'rain', 65: 'rain',
  66: 'freezingRain', 67: 'freezingRain',
  71: 'snow', 73: 'snow', 75: 'snow', 77: 'snowGrains',
  80: 'rainShowers', 81: 'rainShowers', 82: 'rainShowers',
  85: 'snowShowers', 86: 'snowShowers',
  95: 'thunderstorm', 96: 'thunderstormHail', 99: 'thunderstormHail',
};
const condFa = {
  clear: 'آسمان صاف', mainlyClear: 'عموماً صاف', partlyCloudy: 'پاره‌ابری',
  overcast: 'ابری', fog: 'تنبله', drizzle: 'جوهره', rain: 'باران',
  freezingRain: 'باران یخی', snow: 'برف', snowGrains: 'برف‌دانه',
  rainShowers: 'باران‌سالی', snowShowers: 'برف‌سالی',
  thunderstorm: 'رعدوبرق', thunderstormHail: 'رعدوبرق و تگرگ',
};
const condEn = {
  clear: 'Clear sky', mainlyClear: 'Mainly clear', partlyCloudy: 'Partly cloudy',
  overcast: 'Overcast', fog: 'Fog', drizzle: 'Drizzle', rain: 'Rain',
  freezingRain: 'Freezing rain', snow: 'Snow', snowGrains: 'Snow grains',
  rainShowers: 'Rain showers', snowShowers: 'Snow showers',
  thunderstorm: 'Thunderstorm', thunderstormHail: 'Thunderstorm with hail',
};
const ICON = {
  clear: ['☀️', '🌙'], mainlyClear: ['🌤', '🌙'], partlyCloudy: ['⛅', '☁️'],
  overcast: ['☁️', '☁️'], fog: ['🌫', '🌫'], drizzle: ['🌦', '🌧'],
  rain: ['🌧', '🌧'], freezingRain: ['🌧', '🌧'], snow: ['🌨', '🌨'],
  snowGrains: ['🌨', '🌨'], rainShowers: ['🌦', '🌧'], snowShowers: ['🌨', '🌨'],
  thunderstorm: ['⛈', '⛈'], thunderstormHail: ['🌩', '🌩'],
};
const SEVERITY = {
  thunderstormHail: 5, thunderstorm: 4, rain: 3, rainShowers: 3,
  freezingRain: 3, snow: 3, snowGrains: 3, snowShowers: 3, drizzle: 2, fog: 2,
};

/* ---------------- palettes ---------------- */
const DAY = {
  clear: ['#1a6bc0', '#5aa3e8', '#bfdffa'],
  mainlyClear: ['#2272c6', '#66a6e5', '#c8e3fa'],
  partlyCloudy: ['#2c70be', '#649cd3', '#cbdff4'],
  overcast: ['#404e67', '#66748f', '#a6b1c5'],
  fog: ['#5c6672', '#8b949f', '#c5ccd3'],
  drizzle: ['#335269', '#55708a', '#9cb0c2'],
  rain: ['#24405a', '#446583', '#86a2b9'],
  freezingRain: ['#274660', '#486f8b', '#8fb0c3'],
  snow: ['#577090', '#8ca4c0', '#dce7f5'],
  snowGrains: ['#56708e', '#8ba5c1', '#dbe6f4'],
  rainShowers: ['#2b5272', '#547c9c', '#9cb6d1'],
  snowShowers: ['#536f8d', '#89a2be', '#d8e5f5'],
  thunderstorm: ['#131830', '#2c375c', '#4a577e'],
  thunderstormHail: ['#161a37', '#31375e', '#545b85'],
};
const NIGHT = {
  clear: ['#050a1c', '#0e1c42', '#243c6c'],
  mainlyClear: ['#070c20', '#102249', '#27406f'],
  partlyCloudy: ['#080c24', '#13244e', '#2b4474'],
  overcast: ['#0d1020', '#1d2240', '#333a5c'],
  fog: ['#12161e', '#262c38', '#454d5a'],
  drizzle: ['#0a0f1e', '#192338', '#314257'],
  rain: ['#080c1a', '#162033', '#2a3b52'],
  freezingRain: ['#0a0f1d', '#1a2638', '#2e4054'],
  snow: ['#0d1424', '#1e2c44', '#3d5273'],
  snowGrains: ['#0c1322', '#1c2a42', '#3a4f70'],
  rainShowers: ['#090d1c', '#182236', '#2c3d53'],
  snowShowers: ['#0b1120', '#1b2840', '#374b6c'],
  thunderstorm: ['#05060f', '#111630', '#252c4e'],
  thunderstormHail: ['#06070e', '#12162f', '#262c4c'],
};
const SUNSET = ['#1a4e9e', '#4e9fe0', '#ffc987'];

/* ---------------- utils ---------------- */
const FA = '۰۱۲۳۴۵۶۷۸۹';
const digitMap = {};
'0123456789'.split('').forEach((d, i) => digitMap[d] = FA[i]);
const toFa = (s) => String(s).replace(/[0-9]/g, (d) => digitMap[d]);
const num = (v, d = 0) => toFa(Number(v).toFixed(d));
const MONTH = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
const WEEK = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];

function jalaali(date) {
  const div = (a, b) => Math.floor(a / b);
  const mod = (a, b) => a - div(a, b) * b;
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
    1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];

  function calc(jy) {
    const gy = jy + 621;
    let leapJ = -14, jp = breaks[0], jump = 0;
    for (let i = 1; i < breaks.length; i++) {
      const jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ = leapJ + div(jump, 33) * 8 + div(mod(jump, 33), 4);
      jp = jm;
    }
    let n = jy - jp;
    leapJ = leapJ + div(n, 33) * 8 + div(mod(n, 33) + 3, 4);
    if (mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;
    const leapG = div(gy, 4) - div((div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;
    if (jump - n < 6) n = n - jump + div(jump + 4, 33) * 33;
    let leap = ((mod(n + 1, 33) - 1) % 4);
    if (leap === -1) leap = 4;
    return { leap, gy, march };
  }

  const a = (14 - date.getMonth()) >> 1;
  const yy = date.getFullYear() + 4800 - a;
  const mm = date.getMonth() + 12 * a - 3;
  let jdn = date.getDate() + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;

  const b = Math.floor((4 * (jdn + 32044) + 3) / 146097);
  const c = (jdn + 32044) - Math.floor(146097 * b / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor(1461 * d / 4);
  const mo = Math.floor((5 * e + 2) / 153);
  const gy = 100 * b + d - 4800 + Math.floor(mo / 10);

  let jy = gy - 621;
  const r = calc(jy);
  const marchDate = new Date(gy, 2, r.march);
  const jdn1f = toJDN(marchDate);
  let k = jdn - jdn1f;

  if (k >= 0) {
    if (k <= 185) return { y: jy, m: 1 + Math.floor(k / 31), d: (k % 31) + 1 };
    k -= 186;
  } else {
    jy -= 1; k += 179;
    if (r.leap === 1) k += 1;
  }
  return { y: jy, m: 7 + Math.floor(k / 30), d: (k % 30) + 1 };
}
function toJDN(date) {
  const a = (14 - (date.getMonth() + 1)) >> 1;
  const yy = date.getFullYear() + 4800 - a;
  const mm = (date.getMonth() + 1) + 12 * a - 3;
  return date.getDate() + Math.floor((153 * mm + 2) / 5) + 365 * yy +
    Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}
const jalStr = (date) => { const j = jalaali(date); return `${j.d} ${MONTH[j.m - 1]}، ${j.y}`; };
const jalShort = (date) => { const j = jalaali(date); return `${j.d} ${MONTH[j.m - 1]}`; };
const jalYear = (date) => jalaali(date).y;

/* ---------------- state ---------------- */
const state = {
  cities: [],
  city: null,
  report: null,
  aqi: null,
  contours: [],
  mapReady: false,
};

/* ---------------- sky painter ---------------- */
const sky = {
  cv: null, ctx: null, cfg: null,
  clouds: [],
  init() {
    this.cv = document.getElementById('sky');
    this.ctx = this.cv.getContext('2d');
    this.resize();
    window.addEventListener('resize', () => this.resize());
  },
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cv.width = Math.floor(window.innerWidth * dpr);
    this.cv.height = Math.floor(window.innerHeight * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
  },
  setConfig(c) {
    this.cfg = c;
    if (!this.clouds.length) this.buildClouds();
  },
  buildClouds() {
    for (let i = 0; i < 14; i++) {
      this.clouds.push({
        x: Math.random(), y: 0.05 + Math.random() * 0.4,
        s: 0.07 + Math.random() * 0.11, sp: 0.00001 + Math.random() * 0.00002,
        a: 0.5 + Math.random() * 0.35, l: Math.random() < 0.4,
      });
    }
  },
  palette() {
    const c = this.cfg || { condition: 'clear', isDay: true, sunElevation: 60 };
    let stops;
    if (c.sunElevation > -8 && c.sunElevation < 14) {
      const k = (c.sunElevation + 8) / 22;
      stops = SUNSET.map((x, i) => mix3(x, ['#3b1e5c', '#7a3a7a', '#d86a5a'][i], k));
    } else {
      stops = (c.isDay ? DAY : NIGHT)[c.condition] || DAY.clear;
    }
    return stops;
  },
  draw() {
    const ctx = this.ctx, W = this.w, H = this.h;
    const p = this.palette();
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, p[0]); g.addColorStop(0.55, p[1]); g.addColorStop(1, p[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const glow = ctx.createRadialGradient(W * 0.5, H * 1.1, 0, W * 0.5, H * 1.1, W * 0.9);
    glow.addColorStop(0, 'rgba(255,255,255,.18)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    this.drawCelestial(ctx, W, H);
    if (this.cfg && !this.cfg.isDay) this.drawStars(ctx, W, H);
    this.drawClouds(ctx, W, H);
    this.drawPrecip(ctx, W, H);
    this.vignette(ctx, W, H);
  },
  drawCelestial(ctx, W, H) {
    const c = this.cfg;
    if (!c) return;
    const horizon = H * 0.94;
    const elev = Math.max(0, c.sunElevation);
    const screenY = horizon - Math.tan(elev * Math.PI / 180) * H * 0.34;
    const cx = W * 0.66, r = W * 0.085;
    const alpha = 0.35 + 0.65 * Math.min(1, elev / 24);
    if (alpha <= 0.02 || screenY > H) return;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = 'rgba(255,226,150,.16)';
    ctx.beginPath(); ctx.arc(cx, screenY, r * 3.2, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,226,150,.20)';
    ctx.beginPath(); ctx.arc(cx, screenY, r * 2.1, 0, 7); ctx.fill();

    ctx.strokeStyle = 'rgba(255,226,150,.30)';
    ctx.lineWidth = r * 0.09; ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = t * 0.00035 + i * Math.PI * 2 / 12;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * r * 1.25, screenY + Math.sin(a) * r * 1.25);
      ctx.lineTo(cx + Math.cos(a) * r * 2.1, screenY + Math.sin(a) * r * 2.1);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,243,214,1)';
    ctx.beginPath(); ctx.arc(cx, screenY, r, 0, 7); ctx.fill();
    ctx.fillStyle = 'rgba(255,243,214,.35)';
    ctx.beginPath(); ctx.arc(cx, screenY, r * 1.6, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;

    if (!c.isDay && (c.condition === 'clear' || c.condition === 'mainlyClear')) {
      const mx = W * 1.06, my = H * 0.24, mr = W * 0.075;
      ctx.fillStyle = 'rgba(217,230,250,.14)';
      ctx.beginPath(); ctx.arc(mx, my, mr * 2.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2f6fd';
      ctx.beginPath(); ctx.arc(mx, my, mr, 0, 7); ctx.fill();
      ctx.fillStyle = '#0b1836';
      ctx.beginPath(); ctx.arc(mx + mr * 0.32, my - mr * 0.1, mr * 0.88, 0, 7); ctx.fill();
    }
  },
  drawStars(ctx, W, H) {
    ctx.fillStyle = 'rgba(255,255,255,1)';
    for (let i = 0; i < 90; i++) {
      const seed = i * 4831;
      const x = (Math.sin(seed) * 0.5 + 0.5) * W;
      const y = (Math.cos(seed * 1.7) * 0.5 + 0.5) * H * 0.62;
      const tw = 0.5 + 0.5 * Math.sin(t * 0.0019 + seed);
      ctx.globalAlpha = 0.25 + tw * 0.75;
      ctx.beginPath(); ctx.arc(x, y, 0.9 + tw * 1.3, 0, 7); ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  drawClouds(ctx, W, H) {
    const c = this.cfg || {};
    const dark = ['rain', 'rainShowers', 'drizzle', 'freezingRain', 'snow',
      'snowGrains', 'snowShowers', 'thunderstorm', 'thunderstormHail'].includes(c.condition);
    const density = dark ? 1.6 : (c.condition === 'overcast' ? 1.6 : c.condition === 'partlyCloudy' ? 1.0 : 0.5);
    const base = dark ? 'rgba(180,196,220,1)' : 'rgba(255,255,255,1)';

    for (const cl of this.clouds) {
      if (Math.random() < 0.02) cl.x = Math.random();
      const speed = cl.sp * density;
      cl.x += speed;
      if (cl.x > 1.25) cl.x = -0.25;
      const bob = Math.sin(t * 0.0004 + cl.y * 90) * 2.5;
      this.puff(ctx, cl.x * W, cl.y * H + bob, cl.s * W, base, cl.a * density);
    }
    if (c.condition === 'fog') this.drawFog(ctx, W, H);
  },
  puff(ctx, cx, cy, w, color, alpha) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    const puffs = [[-.42, 0, .30], [-.10, -.20, .34], [.14, -.30, .36],
      [.40, -.06, .27], [.02, .16, .33]];
    for (const [ox, oy, r] of puffs) {
      ctx.beginPath();
      ctx.arc(cx + ox * w, cy + oy * w, r * w, 0, 7);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  },
  drawFog(ctx, W, H) {
    ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.lineWidth = 26; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const seed = i * 2.4;
      const y = H * (0.28 + 0.16 * i) + Math.sin(t * 0.0003 + seed) * 10;
      const w = W * (0.55 + 0.35 * (seed % 1));
      const shift = (t * 0.00009 * (i + 1) * (i % 2 === 0 ? 1 : -1)) % 1 * W * 0.3;
      ctx.beginPath();
      ctx.moveTo(shift, y); ctx.lineTo(shift + w, y);
      ctx.stroke();
    }
  },
  drawPrecip(ctx, W, H) {
    const c = this.cfg;
    if (!c) return;
    if (['rain', 'rainShowers', 'drizzle', 'freezingRain'].includes(c.condition)) {
      const intensity = c.condition === 'rain' ? 1.0 : 0.7;
      const drops = Math.round(140 * intensity);
      ctx.strokeStyle = 'rgba(191,226,255,.7)';
      ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      const step = (W * 1.05) / drops;
      for (let i = 0; i < drops; i++) {
        const x = i * step;
        const seed = i * 0.37;
        const phase = (t * 0.00105 * (0.8 + (seed % 1) * 0.5) + seed * 0.13) % 1;
        const y = -20 + phase * H * 1.05;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 16);
        ctx.stroke();
      }
    }
    if (['snow', 'snowGrains', 'snowShowers'].includes(c.condition)) {
      const n = c.condition === 'snow' ? 130 : 80;
      ctx.fillStyle = 'rgba(255,255,255,.85)';
      for (let i = 0; i < n; i++) {
        const x = i * (W * 1.1 / n);
        const seed = i * 0.618;
        const phase = (t * 0.00042 * (0.7 + (seed % 1) * 0.6) + seed * 0.21) % 1;
        const y = -20 + phase * H * 1.05;
        const drift = Math.sin(t * 0.0009 + seed * 3) * W * 0.02;
        ctx.beginPath();
        ctx.arc(x + drift, y, 1.6 + 2.4 * (seed % 1), 0, 7);
        ctx.fill();
      }
    }
    if (c.condition === 'thunderstorm' || c.condition === 'thunderstormHail') {
      // lightning flashes
      for (let i = 0; i < 5; i++) {
        const seed = i * 7.3 + 3.1;
        const period = 5.5 + (seed % 5);
        const phase = (t * 0.0007 + seed * 0.15) % period;
        if (phase > period * 0.88) {
          const x = (Math.sin(seed * 1.7) * 0.5 + 0.5) * W;
          const y = H * 0.3;
          ctx.fillStyle = 'rgba(255,243,192,.35)';
          ctx.fillRect(0, 0, W, H);
          ctx.fillStyle = 'rgba(255,243,192,.9)';
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - 12, y + 26); ctx.lineTo(x + 2, y + 26);
          ctx.lineTo(x - 6, y + 54); ctx.lineTo(x + 20, y + 14);
          ctx.lineTo(x + 5, y + 14); ctx.lineTo(x + 15, y);
          ctx.closePath(); ctx.fill();
        }
      }
      // heavy rain under storm
      ctx.strokeStyle = 'rgba(191,226,255,.85)';
      ctx.lineWidth = 1.6;
      for (let i = 0; i < 220; i++) {
        const x = (i * (W * 1.05) / 220);
        const seed = i * 0.29;
        const phase = (t * 0.0013 * (0.7 + (seed % 1) * 0.5) + seed * 0.1) % 1;
        const y = -20 + phase * H * 1.05;
        ctx.beginPath();
        ctx.moveTo(x, y); ctx.lineTo(x - 8, y + 22);
        ctx.stroke();
      }
    }
  },
  vignette(ctx, W, H) {
    const g = ctx.createRadialGradient(W / 2, H * 0.62, 0, W / 2, H * 0.62, H * 0.85);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  },
};
let t = 0;

/* ---------------- colour helpers ---------------- */
function hexToRgb(h) {
  h = h.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function mix3(a, b, k) {
  const A = hexToRgb(a), B = hexToRgb(b);
  const r = Math.round(A[0] + (B[0] - A[0]) * k);
  const g = Math.round(A[1] + (B[1] - A[1]) * k);
  const bl = Math.round(A[2] + (B[2] - A[2]) * k);
  return `rgb(${r},${g},${bl})`;
}

/* ---------------- icon drawing ---------------- */
function drawIcon(ctx, cx, cy, scale, condition, isDay, phase) {
  const w = 58 * scale;
  const bob = Math.sin(phase * Math.PI * 2) * scale * 3;
  const cloud = (col) => {
    ctx.fillStyle = col;
    for (const [ox, oy, r] of [[-.42, 0, .30], [-.10, -.20, .34], [.14, -.30, .36],
      [.40, -.06, .27], [.02, .16, .33]]) {
      ctx.beginPath();
      ctx.arc(cx + ox * w, cy + oy * w + bob, r * w, 0, 7);
      ctx.fill();
    }
    ctx.fillRect(cx - w * .49, cy + bob + w * .12, w * .98, w * .26);
  };
  const darkCloud = (col) => cloud(col);

  if (condition === 'clear') {
    if (isDay) sun(ctx, cx, cy, w * .5, phase);
    else moon(ctx, cx, cy, w * .5);
  } else if (condition === 'mainlyClear') {
    if (isDay) sun(ctx, cx - w * .45, cy - w * .55, w * .34, phase);
    else moon(ctx, cx - w * .45, cy - w * .55, w * .34);
    cloud(ctx, 'rgba(255,255,255,.95)');
  } else if (condition === 'partlyCloudy') {
    if (isDay) sun(ctx, cx - w * .7, cy - w * .7, w * .38, phase);
    else moon(ctx, cx - w * .7, cy - w * .7, w * .38);
    cloud(ctx, 'rgba(255,255,255,.95)');
  } else if (condition === 'overcast') {
    darkCloud(ctx, 'rgba(136,149,170,.96)');
  } else if (condition === 'fog') {
    darkCloud(ctx, 'rgba(154,165,180,.96)');
    fogLines(ctx, cx, cy + w * .6, w);
  } else if (condition === 'drizzle') {
    darkCloud(ctx, 'rgba(255,255,255,.95)');
    rain(ctx, cx, cy + w * .55, w, phase, 3, .6);
  } else if (condition === 'rain') {
    darkCloud(ctx, 'rgba(107,124,147,.96)');
    rain(ctx, cx, cy + w * .6, w, phase, 4, 1);
  } else if (condition === 'rainShowers') {
    darkCloud(ctx, 'rgba(255,255,255,.95)');
    sun(ctx, cx + w * .85, cy - w * .85, w * .24, phase);
    rain(ctx, cx - w * .3, cy + w * .6, w, phase, 3, .8);
  } else if (condition === 'freezingRain') {
    darkCloud(ctx, 'rgba(143,166,188,.96)');
    rain(ctx, cx, cy + w * .6, w, phase, 3, .7);
  } else if (condition === 'snow') {
    darkCloud(ctx, 'rgba(159,178,200,.96)');
    snow(ctx, cx, cy + w * .6, w, phase, 4);
  } else if (condition === 'snowGrains') {
    darkCloud(ctx, 'rgba(159,178,200,.96)');
    snow(ctx, cx, cy + w * .6, w, phase, 3);
  } else if (condition === 'snowShowers') {
    darkCloud(ctx, 'rgba(255,255,255,.95)');
    snow(ctx, cx - w * .3, cy + w * .6, w, phase, 3);
  } else if (condition === 'thunderstorm' || condition === 'thunderstormHail') {
    darkCloud(ctx, 'rgba(59,67,88,.96)');
    bolt(ctx, cx, cy + w * .55, phase);
  }
}
function sun(ctx, cx, cy, r, phase) {
  ctx.fillStyle = 'rgba(255,209,102,.3)';
  ctx.beginPath(); ctx.arc(cx, cy, r * 1.5, 0, 7); ctx.fill();
  ctx.fillStyle = '#ffd166';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ffd166';
  ctx.lineWidth = r * .22; ctx.lineCap = 'round';
  const rot = phase * Math.PI * 2;
  for (let i = 0; i < 8; i++) {
    const a = rot + i * Math.PI / 4;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r * 1.1, cy + Math.sin(a) * r * 1.1);
    ctx.lineTo(cx + Math.cos(a) * r * 1.75, cy + Math.sin(a) * r * 1.75);
    ctx.stroke();
  }
}
function moon(ctx, cx, cy, r) {
  ctx.fillStyle = '#f2f5fb';
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
  ctx.fillStyle = '#0b1836';
  ctx.beginPath(); ctx.arc(cx + r * .34, cy - r * .1, r * .88, 0, 7); ctx.fill();
}
function rain(ctx, cx, cy, w, phase, drops, k) {
  ctx.strokeStyle = 'rgba(168,212,255,.9)';
  ctx.lineWidth = k > .8 ? 2.4 : 1.8;
  ctx.lineCap = 'round';
  const span = w * .9;
  for (let i = 0; i < drops; i++) {
    const ph = (phase + i / drops) % 1;
    const x = cx - span / 2 + (i + .5) * (span / drops);
    const y = cy + ph * 26 * k;
    ctx.beginPath();
    ctx.moveTo(x, y); ctx.lineTo(x - 4, y + 15);
    ctx.stroke();
  }
}
function snow(ctx, cx, cy, w, phase, n) {
  ctx.fillStyle = '#fff';
  const span = w * .95;
  for (let i = 0; i < n; i++) {
    const ph = (phase + i / n) % 1;
    const x = cx - span / 2 + (i + .5) * (span / n) + Math.sin(ph * Math.PI * 4 + i) * 3;
    ctx.beginPath(); ctx.arc(x, cy + ph * 26, 4, 0, 7); ctx.fill();
  }
}
function bolt(ctx, cx, cy, phase) {
  ctx.fillStyle = '#ffe066';
  ctx.beginPath();
  ctx.moveTo(cx + 5, cy); ctx.lineTo(cx - 7, cy + 14);
  ctx.lineTo(cx + 1, cy + 14); ctx.lineTo(cx - 4, cy + 28);
  ctx.lineTo(cx + 13, cy + 8); ctx.lineTo(cx + 4, cy + 8);
  ctx.lineTo(cx + 10, cy); ctx.closePath();
  ctx.fill();
  const f = Math.sin(phase * Math.PI * 4) * .5 + .5;
  if (f > .85) {
    ctx.fillStyle = 'rgba(255,255,255,.5)';
    ctx.beginPath();
    ctx.moveTo(cx + 5, cy); ctx.lineTo(cx - 7, cy + 14);
    ctx.lineTo(cx + 1, cy + 14); ctx.lineTo(cx - 4, cy + 28);
    ctx.lineTo(cx + 13, cy + 8); ctx.lineTo(cx + 4, cy + 8);
    ctx.lineTo(cx + 10, cy); ctx.closePath();
    ctx.fill();
  }
}
function fogLines(ctx, cx, cy, w) {
  ctx.strokeStyle = 'rgba(198,208,220,.8)';
  ctx.lineWidth = 3; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const s = i === 0 ? w * .62 : i === 1 ? w * .78 : w * .5;
    ctx.beginPath();
    ctx.moveTo(cx - s / 2, cy + i * 8);
    ctx.lineTo(cx + s / 2, cy + i * 8);
    ctx.stroke();
  }
}

/* ---------------- icon element helper ---------------- */
function iconEl(condition, isDay, size, phase) {
  const cv = document.createElement('canvas');
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  cv.width = size * dpr; cv.height = size * dpr;
  cv.style.width = size + 'px'; cv.style.height = size + 'px';
  const ctx = cv.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawIcon(ctx, size / 2, size / 2, size / 100, condition, isDay, phase || 0);
  return cv;
}

/* ---------------- Iran map (SVG) ---------------- */
function buildMap() {
  return fetch('data/iran_provinces.geojson')
    .then((r) => r.json())
    .then((gj) => {
      const feats = gj.features;
      let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
      for (const f of feats) {
        const rings = f.geometry.type === 'Polygon'
          ? f.geometry.coordinates :
          f.geometry.coordinates.flatMap((p) => p);
        for (const ring of rings) for (const [lon, lat] of ring) {
          if (lon < minX) minX = lon; if (lon > maxX) maxX = lon;
          if (lat < minY) minY = lat; if (lat > maxY) maxY = lat;
        }
      }
      const V = 100;
      const sx = V / (maxX - minX), sy = V / (maxY - minY);
      const ox = -minX * sx, oy = -minY * sy;

      const paths = [];
      for (const f of feats) {
        const rings = f.geometry.type === 'Polygon'
          ? f.geometry.coordinates :
          f.geometry.coordinates.flatMap((p) => p);
        for (const ring of rings) {
          const d = ring.map((c, i) =>
            (i ? 'L' : 'M') + (c[0] * sx + ox).toFixed(2) + ' ' +
            (c[1] * sy + oy).toFixed(2)).join(' ') + 'Z';
          paths.push({ d, name: f.properties.name, nameEn: f.properties.name_en });
        }
      }
      state.contours = paths;
      state.mapReady = true;
      return paths;
    });
}
function mapToXY(lon, lat, bbox) {
  const V = 100;
  const sx = V / (bbox.maxX - bbox.minX);
  const sy = V / (bbox.maxY - bbox.minY);
  return [lon * sx - bbox.minX * sx, lat * sy - bbox.minY * sy];
}
const BBOX = { minX: 44, maxX: 63.5, minY: 25, maxY: 40 };

function svgLayer(svgEl, attr, value) {
  const el = document.createElementNS('http://www.w3.org/2000/svg', attr);
  el.setAttribute('d', value);
  return el;
}
function renderMap(svgEl, overlays, palette) {
  while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  const NS = 'http://www.w3.org/2000/svg';

  // background grid
  for (let x = 46; x <= 54; x += 2) {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', x); l.setAttribute('y1', 0);
    l.setAttribute('x2', x); l.setAttribute('y2', 100);
    l.setAttribute('stroke', 'rgba(255,255,255,.07)');
    svgEl.appendChild(l);
  }
  for (let y = 28; y <= 40; y += 3) {
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', 0); l.setAttribute('y1', y);
    l.setAttribute('x2', 100); l.setAttribute('y2', y);
    l.setAttribute('stroke', 'rgba(255,255,255,.07)');
    svgEl.appendChild(l);
  }

  for (const p of state.contours) {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('d', p.d);
    path.setAttribute('fill', 'rgba(255,255,255,.10)');
    path.setAttribute('stroke', 'rgba(255,255,255,.30)');
    path.setAttribute('stroke-width', '0.4');
    svgEl.appendChild(path);
  }

  for (const o of overlays) {
    const [x, y] = mapToXY(o.lon, o.lat, BBOX);
    if (o.ring) {
      const r = document.createElementNS(NS, 'circle');
      r.setAttribute('cx', x); r.setAttribute('cy', y);
      r.setAttribute('r', o.ring);
      r.setAttribute('fill', o.color);
      svgEl.appendChild(r);
    }
    if (o.dot) {
      const r = document.createElementNS(NS, 'circle');
      r.setAttribute('cx', x); r.setAttribute('cy', y);
      r.setAttribute('r', o.dot);
      r.setAttribute('fill', o.dotColor || '#fff');
      svgEl.appendChild(r);
    }
  }
}

/* ---------------- API ---------------- */
async function getJSON(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status);
  return r.json();
}

async function loadWeather(city) {
  const url = `${API.forecast}?latitude=${city.lat}&longitude=${city.lon}` +
    `&timezone=${TZ}&forecast_days=7` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,dew_point_2m,` +
    `pressure_msl,is_day,precipitation,weather_code,cloud_cover,wind_speed_10m,` +
    `wind_direction_10m,wind_gusts_10m,uv_index,visibility` +
    `&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,` +
    `weather_code,wind_speed_10m,visibility,uv_index,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,` +
    `precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunshine_duration`;
  return getJSON(url);
}

async function loadAQI(city) {
  const url = `${API.air}?latitude=${city.lat}&longitude=${city.lon}&timezone=${TZ}` +
    `&current=pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,european_aqi,us_aqi`;
  return getJSON(url);
}

async function loadQuakes() {
  const since = new Date(Date.now() - 14 * 864e5).toISOString().slice(0, 10);
  const until = new Date().toISOString().slice(0, 10);
  let url = `${API.usgs}/query?format=geojson&starttime=${since}&endtime=${until}` +
    `&minmagnitude=3.0&limit=200&orderby=time-asc`;
  let list = [];
  try {
    const j = await getJSON(url);
    list = (j.features || []).map((f) => ({
      id: f.id,
      mag: f.properties.mag,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2],
      time: f.properties.time,
      place: f.properties.place,
      source: f.properties.source || 'us',
    })).filter((q) => q.lat > 24 && q.lat < 42 && q.lon > 42 && q.lon < 65);
  } catch (e) {
    url = `${API.emsc}/query?format=geojson&starttime=${since}&endtime=${until}` +
      `&minmagnitude=3.0&limit=200&orderby=time-asc`;
    const j = await getJSON(url);
    list = (j.features || []).map((f) => ({
      id: f.id,
      mag: f.properties.mag,
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      depth: f.geometry.coordinates[2] || 0,
      time: f.properties.time,
      place: f.properties.place || '',
      source: 'emsc',
    })).filter((q) => q.lat > 24 && q.lat < 42 && q.lon > 42 && q.lon < 65);
  }
  return list.sort((a, b) => b.time - a.time);
}

async function loadLightning(city) {
  const now = Date.now();
  let url = `${API.forecast}?latitude=${city.lat}&longitude=${city.lon}&timezone=${TZ}` +
    `&hourly=precipitation,cloud_cover,weather_code,is_day&past_hours=1&forecast_hours=1`;
  const p = 0.4;
  let sim = [];
  try {
    const j = await getJSON(url);
    const h = j.hourly || {};
    const precip = (h.precipitation || [])[0] || 0;
    const cloud = (h.cloud_cover || [])[0] || 0;
    const intensity = Math.min(1, precip * 6 + cloud / 100 * 25);
    if (intensity >= p) {
      const seeds = [[32, 53], [33, 58], [35.5, 52], [36, 51], [34.5, 49], [31, 51.5],
        [30, 50.5], [37, 46], [38.5, 48], [27, 53]];
      const n = Math.round(intensity * 32);
      for (let i = 0; i < n; i++) {
        const s = seeds[i % seeds.length];
        sim.push({
          lat: Math.min(40, Math.max(24, s[0] + (i % 7) * 0.35 - 1.0)),
          lon: Math.min(63, Math.max(45, s[1] + (i % 5) * 0.7 - 1.5)),
          time: now - (i % 90) * 60000,
          energy: Math.min(100, 40 + (i * 7) % 60),
          source: 'storm-sim',
        });
      }
    }
  } catch (e) { /* offline */ }

  sim.sort((a, b) => b.time - a.time);
  const last24 = sim.filter((s) => s.time > now - 24 * 3600e3);
  const active = sim.filter((s) => s.time > now - 90 * 60e3);
  let maxD = 0;
  for (const s of sim) maxD = Math.max(maxD, distKm(s.lat, s.lon, city.lat, city.lon));
  return {
    strikes: sim.slice(0, 120),
    last24: last24.length,
    active: active.length,
    maxD,
    level: active.length >= 40 ? 3 : active.length >= 18 ? 2 : active.length >= 6 ? 1 : 0,
    live: false,
  };
}

function distKm(lat1, lon1, lat2, lon2) {
  const R = 6371, dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
}

/* ---------------- render: weather ---------------- */
function el(id) { return document.getElementById(id); }
function toast(msg) {
  const t = el('toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(t._h);
  t._h = setTimeout(() => { t.hidden = true; }, 2600);
}

function renderWeather() {
  const r = state.report, city = state.city;
  if (!r) return;
  const cur = r.current;
  const cond = WMO[cur.weather_code] || 'clear';
  const isDay = cur.is_day === 1;
  const day = r.daily[0];

  el('cityName').textContent = `${city.name} · ${city.province}`;
  el('bigTemp').textContent = num(cur.temperature) + '°';
  el('condText').textContent = condFa[cond];
  el('feelsText').textContent = `${num(cur.apparent_temperature)}° احساس واقعی`;
  el('hiText').textContent = num(day.temperature_2m_max) + '°';
  el('loText').textContent = num(day.temperature_2m_min) + '°';
  el('fetchTime').textContent = jalShort(new Date());

  // hero icon
  const heroHost = el('heroIcon');
  heroHost.innerHTML = '';
  const ic = iconEl(cond, isDay, 108, t / 1000 % 1);
  ic.style.animation = 'fade .6s ease both';
  heroHost.appendChild(ic);

  // metrics
  const metrics = [
    ['💧', 'رطوبت', num(cur.relative_humidity_2m) + '٪', cur.relative_humidity_2m / 100, '#7fc8ff'],
    ['🌬', 'باد', num(cur.wind_speed_10m) + ' km/h', Math.min(1, cur.wind_speed_10m / 60), '#7fc8ff'],
    ['⏫', 'فشار', num(cur.pressure_msl) + ' hPa', Math.min(1, Math.max(0, (cur.pressure_msl - 980) / 80)), '#9fc4ff'],
    ['☀️', 'UV', num(cur.uv_index, 1), Math.min(1, cur.uv_index / 12), '#ffe066'],
    ['👁', 'دید', cur.visibility >= 1000 ? num(cur.visibility / 1000, 1) + ' km' : num(cur.visibility) + ' m', Math.min(1, cur.visibility / 20000), '#7fc8ff'],
    ['💧', 'شبنم', num(cur.dew_point_2m) + '°', Math.min(1, Math.max(0, (cur.dew_point_2m + 10) / 45)), '#a8d4ff'],
    ['🌧', 'بارش', num(cur.precipitation, 1) + ' mm', Math.min(1, cur.precipitation / 8), '#7fc8ff'],
    ['☁️', 'ابری', num(cur.cloud_cover) + '٪', cur.cloud_cover / 100, '#b9c3d4'],
  ];
  el('metrics').innerHTML = metrics.map((m) => `
    <div class="metric">
      <div class="metric-ico">${m[0]}</div>
      <div class="metric-bar"><i style="width:${Math.round(m[3] * 100)}%;background:${m[4]}"></i></div>
      <div class="metric-val">${m[2]}</div>
      <div class="metric-lbl">${m[1]}</div>
    </div>`).join('');

  // alert
  const score = SEVERITY[cond] || 0;
  const banner = el('alertBanner');
  if (score >= 2) {
    const titles = {
      thunderstorm: 'رعدوبرق پیش رو', thunderstormHail: 'رعدوبرق و تگرگ',
      rain: 'بارش شدید', rainShowers: 'باران‌های رگباری', snow: 'بارش برف',
      snowShowers: 'برف‌سالی', freezingRain: 'باران یخی', drizzle: 'جوهره', fog: 'تنبله',
    };
    const texts = {
      thunderstorm: 'از مناطق باز دور شوید و زیرِ سایه‌انداز بمانید.',
      thunderstormHail: 'تگرگ پیش رو — خودرو را در پوشش قرار دهید.',
      rain: 'بارش شدید می‌تواند باعث لغزش زمین شود.',
      snow: 'مسیرهای کوهستانی لغزنده است.',
    };
    banner.hidden = false;
    banner.innerHTML = `
      <div class="alert-ico">⚠️</div>
      <div class="alert-body">
        <div class="alert-title">${titles[cond] || condFa[cond]}</div>
        <div class="alert-text">${texts[cond] || 'از فعالیت‌های بیرونی خودداری کنید.'}</div>
      </div>`;
  } else banner.hidden = true;

  // AQI
  renderAQI();

  // hourly
  const hours = r.hourly;
  const nowIdx = hours.findIndex((h) => Math.abs(new Date(h.time) - new Date()) < 3 * 3600e3);
  const list = [];
  for (let i = Math.max(0, nowIdx); i < Math.min(hours.length, Math.max(0, nowIdx) + 24); i++) {
    const h = hours[i];
    const c = WMO[h.weather_code] || 'clear';
    const isNow = i === nowIdx;
    list.push(`
      <div class="hour ${isNow ? 'now' : ''}">
        <div class="h-lbl">${isNow ? 'اکنون' : WEEK[new Date(h.time).getDay()]}</div>
        <div class="h-ico">${ICON[c] ? ICON[c][h.is_day === 1 ? 0 : 1] : '☁️'}</div>
        <div class="h-temp">${num(h.temperature_2m)}°</div>
        <div class="h-pop">${h.precipitation_probability > 0 ? '💧' + num(h.precipitation_probability) + '٪' : '۰٪'}</div>
      </div>`);
  }
  el('hourly').innerHTML = list.join('');

  // daily
  const min = Math.min(...r.daily.map((d) => d.temperature_2m_min));
  const max = Math.max(...r.daily.map((d) => d.temperature_2m_max));
  const span = Math.max(1, max - min);
  el('daily').innerHTML = r.daily.map((d, i) => {
    const c = WMO[d.weather_code] || 'clear';
    const left = ((d.temperature_2m_min - min) / span) * 100;
    const width = Math.max(6, ((d.temperature_2m_max - d.temperature_2m_min) / span) * 100);
    return `
      <div class="day">
        <div class="d-name">${i === 0 ? 'امروز' : jalShort(new Date(d.time))}</div>
        <div class="d-ico">${ICON[c] ? ICON[c][0] : '☁️'}</div>
        <div class="d-lo">${num(d.temperature_2m_min)}°</div>
        <div class="d-track"><div class="d-fill" style="left:${left}%;width:${width}%"></div></div>
        <div class="d-hi">${num(d.temperature_2m_max)}°</div>
        <div class="d-pop">${d.precipitation_sum > 0 ? num(d.precipitation_sum, 1) + ' mm' : ''}</div>
      </div>`;
  }).join('');

  // sun
  const now = new Date();
  if (!day || !day.sunrise) {
    el('sunriseT').textContent = '--';
    el('sunsetT').textContent = '--';
    el('sunshineT').textContent = '--';
    el('sunDot').style.left = '50%';
    el('sunDot').style.top = '1px';
    return;
  }
  const sr = new Date(day.sunrise), ss = new Date(day.sunset);
  el('sunriseT').textContent = jalShort(sr);
  el('sunsetT').textContent = jalShort(ss);
  el('sunshineT').textContent = num(day.sunshine_duration / 3600, 1) + ' h';
  const k = Math.min(1, Math.max(0, (now - sr) / (ss - sr)));
  const dot = el('sunDot');
  dot.style.left = (k * 100) + '%';
  dot.style.top = (Math.sin(k * Math.PI) * 46) + 'px';
}

function renderAQI() {
  const a = state.aqi;
  if (!a) { el('aqiCard').hidden = true; return; }
  el('aqiCard').hidden = false;
  const v = Math.round(a.european_aqi || 0);
  const color = v <= 20 ? '#5be38b' : v <= 40 ? '#ffe066' : v <= 60 ? '#ffb020' :
    v <= 80 ? '#ff7a2e' : '#ff4d4d';
  const label = v <= 20 ? 'عادی' : v <= 40 ? 'مناسب' : v <= 60 ? 'متوسط' :
    v <= 80 ? 'نامناسب' : 'خطرناک';
  el('aqiNum').textContent = num(v);
  el('aqiLabel').textContent = label;
  el('aqiDot').style.background = color;
  el('aqiDot').textContent = '🌫';
  el('pm25').textContent = num(a.pm2_5);
  el('pm10').textContent = num(a.pm10);
}

/* ---------------- render: earthquakes ---------------- */
function magColor(m) {
  if (m >= 8) return '#ff3b3b';
  if (m >= 7) return '#ff6b00';
  if (m >= 6) return '#ff9500';
  if (m >= 5) return '#ffc400';
  if (m >= 4) return '#ffe557';
  return '#6ec5ff';
}

function renderQuakes(list) {
  const city = state.city;
  const last24 = list.filter((q) => q.time > Date.now() - 24 * 3600e3);
  el('qCount').textContent = num(last24.length);
  el('qMax').textContent = num(Math.max(0, ...last24.map((q) => q.mag)), 1);
  el('qTotal').textContent = num(list.length);

  const svg = el('quakeMap');
  const overlays = [];
  for (const q of list.slice(0, 200)) {
    overlays.push({
      lon: q.lon, lat: q.lat, ring: 3 + q.mag * 2.6,
      color: hexA(magColor(q.mag), .35), dot: 2, dotColor: magColor(q.mag),
    });
  }
  overlays.push({ lon: city.lon, lat: city.lat, ring: 1.6, color: '#7fc8ff', dot: 1.4, dotColor: '#0b1836' });
  renderMap(svg, overlays);

  el('quakeLegend').innerHTML = [
    ['#6ec5ff', 'M < 4'], ['#ffe557', '4 – 5'], ['#ffc400', '5 – 6'],
    ['#ff9500', '6 – 7'], ['#ff6b00', '7 – 8'], ['#ff3b3b', '≥ 8'],
  ].map(([c, l]) => `<div class="lg"><i style="background:${c}"></i>${l}</div>`).join('');

  el('quakeList').innerHTML = list.slice(0, 40).map((q) => {
    const d = distKm(q.lat, q.lon, city.lat, city.lon);
    const col = magColor(q.mag);
    return `
      <div class="q-item">
        <div class="q-mag" style="background:${hexA(col, .22)};color:${col};border:1px solid ${hexA(col, .4)}">
          ${num(q.mag, 1)}
        </div>
        <div class="q-body">
          <div class="q-place">${q.place || 'ناشناس'}</div>
          <div class="q-meta">${jalShort(new Date(q.time))} · ${q.source}</div>
          <div class="q-dist">عمق ${num(q.depth)} km · ${num(d)} کیلومتر</div>
        </div>
      </div>`;
  }).join('') || '<div class="muted" style="padding:16px">هیچ لرزه‌یے در این دوره ثبت نشده.</div>';
}

/* ---------------- render: lightning ---------------- */
function renderLightning(s) {
  const city = state.city;
  const lv = s.level;
  const col = lv === 3 ? '#ff4d4d' : lv === 2 ? '#ffb020' : lv === 1 ? '#ffe066' : '#5be38b';
  el('lightLevel').textContent = ['هیچ رعدوبرقی در حال ثبت نیست', 'کم', 'متوسط', 'پرخطور'][lv];
  el('lightSource').textContent = s.live ? 'منبع: feed زنده' : 'منبع: شبیه‌ساز storm';
  el('lightAlert').style.borderColor = hexA(col, .45);
  el('lightAlert').style.background = `linear-gradient(135deg, ${hexA(col, .3)}, ${hexA(col, .1)})`;
  el('lCount').textContent = num(s.last24);
  el('lActive').textContent = num(s.active);
  el('lDist').textContent = num(s.maxD);
  el('liveText').textContent = s.live ? 'live' : 'simulated';
  el('liveBadge').style.background = hexA(col, .22);
  el('liveBadge').style.borderColor = hexA(col, .45);
  el('liveBadge').querySelector('.pulse').className = 'pulse' + (s.live ? '' : ' sim');

  const svg = el('lightMap');
  const overlays = [];
  for (const st of s.strikes) {
    overlays.push({
      lon: st.lon, lat: st.lat, ring: 3 + st.energy / 22,
      color: 'rgba(255,224,102,.30)', dot: st.energy / 40, dotColor: '#fff3c0',
    });
  }
  overlays.push({ lon: city.lon, lat: city.lat, ring: 1.6, color: '#7fc8ff', dot: 1.4, dotColor: '#0b1836' });
  renderMap(svg, overlays);

  el('lightList').innerHTML = s.strikes.slice(0, 40).map((st) => {
    const d = distKm(st.lat, st.lon, city.lat, city.lon);
    return `
      <div class="l-item">
        <div class="l-bolt">⚡</div>
        <div class="l-body">
          <div class="l-coord">${num(st.lat, 2)}، ${num(st.lon, 2)}</div>
          <div class="l-meta">${jalShort(new Date(st.time))} · شدت ${num(st.energy)}</div>
          <div class="l-meta">${num(d)} کیلومتر</div>
        </div>
      </div>`;
  }).join('') || '<div class="muted" style="padding:16px">هیچ strike‌یے در این دوره ثبت نشده.</div>';
}

/* ---------------- render: weather map ---------------- */
async function renderWeatherMap() {
  if (!state.contours.length) return;
  const capitals = state.cities.filter((c) => c.capital).slice(0, 31);
  const tiles = await Promise.all(capitals.map((c) =>
    loadWeather(c).then((r) => ({ city: c, temp: r.current.temperature, cond: WMO[r.current.weather_code] }))
      .catch(() => null)));
  const ok = tiles.filter(Boolean);
  el('mapCount').textContent = num(ok.length) + ' شهر';

  const overlays = [];
  for (const t of ok) {
    const r = 8 + Math.min(8, t.temp / 45 * 8);
    overlays.push({ lon: t.city.lon, lat: t.city.lat, ring: r, color: hexA(tempColor(t.temp), .55), dot: r * .45, dotColor: '#0b1836' });
  }
  overlays.push({ lon: state.city.lon, lat: state.city.lat, ring: 2, color: '#ffffff', dot: 1.6, dotColor: '#1e5aa8' });
  renderMap(el('weatherMap'), overlays);

  el('tempGrid').innerHTML = ok.map((t) => `
    <div class="temp-tile">
      <b style="color:${tempColor(t.temp)}">${num(t.temp)}°</b>
      <span class="muted">${t.city.name}</span>
      <span class="muted">${condFa[t.cond]}</span>
    </div>`).join('');
}
function tempColor(t) {
  if (t <= 0) return '#7fc8ff';
  if (t <= 10) return '#a8d4ff';
  if (t <= 20) return '#ffe066';
  if (t <= 30) return '#ffc07a';
  if (t <= 40) return '#ff7a2e';
  return '#ff4d4d';
}

/* ---------------- render: cities ---------------- */
function renderCities(filter) {
  const host = el('cityResults');
  const q = (filter || '').trim().toLowerCase();
  if (q) {
    const res = state.cities.filter((c) =>
      c.name.toLowerCase().includes(q) || c.en.toLowerCase().includes(q) ||
      c.province.toLowerCase().includes(q) || c.county.toLowerCase().includes(q)
    ).slice(0, 60);
    host.innerHTML = res.map(cityRow).join('') ||
      '<div class="muted" style="padding:18px">هیچ شهری پیدا نشد.</div>';
    return;
  }
  const byProv = {};
  for (const c of state.cities) {
    (byProv[c.province] = byProv[c.province] || []).push(c);
  }
  const groups = Object.keys(byProv).sort();
  host.innerHTML = groups.map((p) => `
    <div class="province">
      <h3><span>${p}</span><span>${num(byProv[p].length)} شهر</span></h3>
      ${byProv[p].map(cityRow).join('')}
    </div>`).join('');
}
function cityRow(c) {
  const cur = state.city && state.city.id === c.id;
  return `
    <div class="city-item ${cur ? 'current' : ''}" data-id="${c.id}">
      <div class="c-name">${c.name} ${c.capital ? '<span class="c-capital">★</span>' : ''}</div>
      <div class="c-prov">${c.province}</div>
      ${cur ? '<div class="c-check">✓</div>' : ''}
    </div>`;
}

/* ---------------- helpers ---------------- */
function hexA(hex, a) {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

/* ---------------- tabs ---------------- */
const TAB_LOADERS = {
  quake: () => { if (!state.quakes) loadQuakes().then((q) => { state.quakes = q; renderQuakes(q); }); },
  light: () => { if (!state.light) loadLightning(state.city).then((s) => { state.light = s; renderLightning(s); }); },
  map: () => { if (!state.weatherMapLoaded) { state.weatherMapLoaded = true; renderWeatherMap(); } },
};

function goTab(name) {
  document.querySelectorAll('.tab').forEach((t) => {
    t.hidden = t.dataset.tab !== name;
    t.classList.toggle('active', t.dataset.tab === name);
  });
  document.querySelectorAll('.nav-item').forEach((n) =>
    n.classList.toggle('active', n.dataset.go === name));
  if (TAB_LOADERS[name]) TAB_LOADERS[name]();
}

/* ---------------- boot ---------------- */
async function boot() {
  sky.init();

  // tabs + nav
  document.querySelectorAll('.nav-item').forEach((n) =>
    n.addEventListener('click', () => goTab(n.dataset.go)));

  el('btnRefresh').addEventListener('click', () => { loadCity(state.city, true); });
  el('btnQuakeRefresh').addEventListener('click', () => {
    state.quakes = null;
    loadQuakes().then((q) => { state.quakes = q; renderQuakes(q); });
  });

  // cities
  try {
    const r = await fetch('data/cities.json');
    state.cities = await r.json();
  } catch (e) {
    toast('دیتابیس شهرها بارگذاری نشد');
    return;
  }
  state.city = state.cities.find((c) => c.name === 'تهران') || state.cities[0];

  // geolocation
  el('btnLocate').addEventListener('click', () => {
    if (!navigator.geolocation) { toast('تبلیغاتِ موقعیت غیرفعال است'); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const best = state.cities.reduce((a, b) =>
          distKm(pos.coords.latitude, pos.coords.longitude, a.lat, a.lon) <
          distKm(pos.coords.latitude, pos.coords.longitude, b.lat, b.lon) ? a : b);
        state.city = best;
        loadCity(best, true);
        toast('موقعیت: ' + best.name);
      },
      () => toast('اجازهٔ موقعیت لازم است'),
      { enableHighAccuracy: true, timeout: 12000 });
  });

  el('citySearch').addEventListener('input', (e) => renderCities(e.target.value));
  el('cityResults').addEventListener('click', (e) => {
    const row = e.target.closest('.city-item');
    if (!row) return;
    const c = state.cities.find((x) => String(x.id) === row.dataset.id);
    if (!c) return;
    state.city = c;
    renderCities(el('citySearch').value);
    goTab('weather');
    loadCity(c, true);
  });

  // map data
  try { await buildMap(); } catch (e) { /* map unavailable */ }

  renderCities('');
  await loadCity(state.city, false);
  goTab('weather');

  // sky loop
  const loop = () => {
    t = performance.now();
    sky.draw();
    if (sky.cfg) {
      const ic = el('heroIcon').firstChild;
      if (ic && ic.getContext) {
        const c2 = ic.getContext('2d');
        c2.clearRect(0, 0, ic.width, ic.height);
        c2.setTransform(1, 0, 0, 1, 0, 0);
        drawIcon(c2, ic.width / 2, ic.height / 2, ic.width / 100, sky.cfg.condition, sky.cfg.isDay, t / 1000 % 1);
      }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

async function loadCity(city, showToast) {
  if (!city) return;
  try {
    const [w, a] = await Promise.all([loadWeather(city), loadAQI(city).catch(() => null)]);
    state.report = w;
    state.aqi = a;
    renderWeather();
    applySky(w);
    if (showToast) toast('آماده — ' + city.name);
  } catch (e) {
    toast('خطا در دریافت هوا: ' + e.message);
    applySky({ current: { weather_code: 0, is_day: 1 }, daily: [{ sunrise: null, sunset: null }] });
  }
}

function applySky(report) {
  const cur = report.current;
  const d = report.daily && report.daily[0];
  const cond = WMO[cur.weather_code] || 'clear';
  const isDay = cur.is_day === 1;
  let sr = d && d.sunrise ? new Date(d.sunrise) : new Date(Date.now() - 7 * 3600e3);
  let ss = d && d.sunset ? new Date(d.sunset) : new Date(Date.now() + 7 * 3600e3);
  const now = new Date();
  const k = Math.min(1, Math.max(0, (now - sr) / (ss - sr)));
  const elevation = Math.sin(k * Math.PI) * 80 - 6;
  sky.setConfig({ condition: cond, isDay, sunElevation: elevation, sunrise: sr, sunset: ss, now });
}

document.addEventListener('DOMContentLoaded', boot);

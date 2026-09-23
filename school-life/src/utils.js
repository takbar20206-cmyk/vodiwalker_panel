/* ============================================================
   School Life: Open Campus — utils.js
   توابع کمکی بدون وابستگی (ریاضی، فارسی‌سازی، برخورد AABB)
   ============================================================ */

export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

/** درون‌یابی زاویه (رادیان) با کوتاه‌ترین مسیر */
export function lerpAngle(a, b, t) {
  let d = (b - a) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * clamp(t, 0, 1);
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* ---------- فارسی‌سازی اعداد ---------- */
const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export function faNum(n) {
  return String(n).replace(/[0-9]/g, (d) => FA_DIGITS[Number(d)]);
}
export function faTime(h) {
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h % 1) * 60);
  const p = (v) => (v < 10 ? '0' : '') + v;
  return faNum(p(hh) + ':' + p(mm));
}
export function faDur(sec) {
  sec = Math.max(0, Math.ceil(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return faNum(m + ':' + (s < 10 ? '0' : '') + s);
}

/* ---------- هندسه ---------- */
export function dist2D(ax, az, bx, bz) {
  const dx = ax - bx, dz = az - bz;
  return Math.sqrt(dx * dx + dz * dz);
}

/**
 * برخورد دایره (بازیکن/توپ) با یک AABB دوبعدی {x1,z1,x2,z2}
 * اگر برخورد بود، p را به بیرون هل می‌دهد و true برمی‌گرداند.
 */
export function circleHitCollider(p, r, c) {
  const nx = clamp(p.x, c.x1, c.x2);
  const nz = clamp(p.z, c.z1, c.z2);
  let dx = p.x - nx, dz = p.z - nz;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  if (d2 > 1e-9) {
    const d = Math.sqrt(d2);
    const push = r - d;
    p.x += (dx / d) * push;
    p.z += (dz / d) * push;
  } else {
    // مرکز داخل باکس است: از کم‌عمق‌ترین ضلع بیرون بینداز
    const l = p.x - c.x1, rr = c.x2 - p.x, t = p.z - c.z1, bb = c.z2 - p.z;
    const m = Math.min(l, rr, t, bb);
    if (m === l) p.x = c.x1 - r;
    else if (m === rr) p.x = c.x2 + r;
    else if (m === t) p.z = c.z1 - r;
    else p.z = c.z2 + r;
  }
  return true;
}

/** حل برخورد دایره با لیست کالایدرها. خروجی: برخوردی رخ داد؟ */
export function resolveCollisions(p, r, colliders) {
  let hit = false;
  for (let i = 0; i < colliders.length; i++) {
    if (circleHitCollider(p, r, colliders[i])) hit = true;
  }
  return hit;
}

export function pointBlocked(x, z, margin, colliders) {
  for (let i = 0; i < colliders.length; i++) {
    const c = colliders[i];
    if (x > c.x1 - margin && x < c.x2 + margin && z > c.z1 - margin && z < c.z2 + margin) return true;
  }
  return false;
}

/** آیا نقطه داخل مستطیل است؟ */
export function inRect(x, z, r) {
  return x >= r.x1 && x <= r.x2 && z >= r.z1 && z <= r.z2;
}

/* ============================================================
   School Life: Open Campus — gfx.js
   کمک‌های گرافیکی: تکسچر procedural، لیبل سه‌بعدی، ذرات (Pool)
   ============================================================ */
import * as THREE from 'three';

/**
 * ساخت تکسچر از روی Canvas (بدون نیاز به فایل خارجی).
 * fn(ctx, w, h) عملیات نقاشی را انجام می‌دهد.
 */
export function canvasTexture(w, h, fn, opts = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  fn(ctx, w, h);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = opts.anisotropy || 1;
  if (opts.repeat) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(opts.repeat[0], opts.repeat[1]);
  }
  return tex;
}

/**
 * ساخت Sprite متنی (برای نام NPCها، تابلوها، علامت‌ها).
 * متن فارسی روی Canvas به‌درستی shape می‌شود.
 */
const _measCanvas = (typeof document !== 'undefined') ? document.createElement('canvas') : null;
const _labelTex = new Map();   // کش تکسچر برچسب‌ها (canvas گران است)

export function textSprite(text, opts = {}) {
  const fontSize = opts.size || 44;
  const font = (opts.weight || 'bold') + ' ' + fontSize + 'px ' + (opts.font || 'Vazirmatn, Tahoma, sans-serif');
  const pad = opts.pad != null ? opts.pad : 16;
  const key = [text, font, pad, opts.bg, opts.fg, opts.border, opts.radius].join('|');
  let cached = _labelTex.get(key);
  let tex;
  if (!cached) {
    // اندازه‌گیری با یک canvas مشترک (به‌جای ساخت canvas تازه برای هر برچسب)
    const meas = _measCanvas ? _measCanvas.getContext('2d') : null;
    let tw = text.length * fontSize * 0.6;
    if (meas) { meas.font = font; tw = Math.ceil(meas.measureText(text).width); }
    const c = document.createElement('canvas');
    c.width = Math.max(2, tw + pad * 2);
    c.height = fontSize + pad * 2;
    const ctx = c.getContext('2d');
    if (opts.bg !== null) {
      ctx.fillStyle = opts.bg || 'rgba(10, 16, 30, 0.62)';
      const r = opts.radius != null ? opts.radius : 18;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(0, 0, c.width, c.height, r);
      else ctx.rect(0, 0, c.width, c.height);
      ctx.fill();
      if (opts.border) {
        ctx.strokeStyle = opts.border;
        ctx.lineWidth = 3;
        ctx.stroke();
      }
    }
    ctx.font = font;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = opts.fg || '#ffffff';
    ctx.fillText(text, c.width / 2, c.height / 2 + 2);
    tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    // برچسب‌ها به mipmap نیاز ندارند (حافظه و زمان آپلود کم‌تر)
    tex.generateMipmaps = false;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    _labelTex.set(key, { tex, aspect: c.width / c.height, height: fontSize + pad * 2 });
    cached = _labelTex.get(key);
  } else {
    tex = cached.tex;
  }
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: opts.depthTest !== false,
  });
  const sp = new THREE.Sprite(mat);
  const worldH = opts.height || 0.55;
  sp.scale.set(worldH * cached.aspect, worldH, 1);
  sp.userData.opts = opts;
  return sp;
}

/* ============================================================
   SparkPool — سیستم ذرات با Object Pooling واقعی.
   یک THREE.Points واحد برای همه ذرات (فقط ۱ Draw Call).
   ============================================================ */
export class SparkPool {
  constructor(scene, max = 220) {
    this.max = max;
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.vel = new Float32Array(max * 3);
    this.life = new Float32Array(max);      // باقیمانده عمر
    this.life0 = new Float32Array(max);     // عمر اولیه
    this.grav = new Float32Array(max);
    this.cursor = 0;
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -999;

    const geo = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(this.pos, 3);
    this.colAttr = new THREE.BufferAttribute(this.col, 3);
    this.posAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.posAttr);
    geo.setAttribute('color', this.colAttr);
    const mat = new THREE.PointsMaterial({
      size: 0.32,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
    this._c = new THREE.Color();
  }

  spawn(x, y, z, color, n = 10, opts = {}) {
    const spread = opts.spread != null ? opts.spread : 2.2;
    const up = opts.up != null ? opts.up : 3.2;
    const life = opts.life != null ? opts.life : 0.9;
    const grav = opts.grav != null ? opts.grav : 5;
    this._c.set(color);
    for (let k = 0; k < n; k++) {
      const i = this.cursor;
      this.cursor = (this.cursor + 1) % this.max;
      this.pos[i * 3] = x + (Math.random() - 0.5) * 0.4;
      this.pos[i * 3 + 1] = y + (Math.random() - 0.5) * 0.4;
      this.pos[i * 3 + 2] = z + (Math.random() - 0.5) * 0.4;
      this.vel[i * 3] = (Math.random() - 0.5) * spread * 2;
      this.vel[i * 3 + 1] = Math.random() * up + 0.5;
      this.vel[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;
      const shade = 0.75 + Math.random() * 0.35;
      this.col[i * 3] = Math.min(1, this._c.r * shade + 0.12);
      this.col[i * 3 + 1] = Math.min(1, this._c.g * shade + 0.12);
      this.col[i * 3 + 2] = Math.min(1, this._c.b * shade + 0.12);
      this.life[i] = this.life0[i] = life * (0.6 + Math.random() * 0.7);
      this.grav[i] = grav;
    }
  }

  update(dt) {
    let any = false;
    for (let i = 0; i < this.max; i++) {
      if (this.life[i] <= 0) continue;
      any = true;
      this.life[i] -= dt;
      if (this.life[i] <= 0) {
        this.pos[i * 3 + 1] = -999;
        continue;
      }
      this.vel[i * 3 + 1] -= this.grav[i] * dt;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      if (this.pos[i * 3 + 1] < 0.03) {
        this.pos[i * 3 + 1] = 0.03;
        this.vel[i * 3 + 1] *= -0.4;
      }
      const f = this.life[i] / this.life0[i];
      if (f < 0.35) {
        const s = f / 0.35;
        this.col[i * 3] *= (0.9 + 0.1 * s);
        this.col[i * 3 + 1] *= (0.9 + 0.1 * s);
        this.col[i * 3 + 2] *= (0.9 + 0.1 * s);
      }
    }
    if (any) {
      this.posAttr.needsUpdate = true;
      this.colAttr.needsUpdate = true;
    }
  }
}

/* ============================================================
   کش متریال و هندسه — «باگ‌گیری کارایی»
   ساخت ۲۵۰۰ مِش با هندسه/متریال جداگانه، ۲۴۰۰ هندسه و ۱۴۰۰
   متریال یکتا می‌ساخت؛ در مرورگر یعنی هزاران buffer و shader
   که صفحهٔ لودینگ را قفل می‌کند. این کش‌ها آن‌ها را به چند صد
   مورد کاهش می‌دهند (رندر سریع‌تر، لود سبک‌تر).
   نکته: هندسه/متریال کش‌شده هرگز نباید پس از ساخت تغییر کند
   (رنگ، شفافیت، map یا translate) — برای آن موارد، هندسهٔ
   اختصاصی بساز.
   ============================================================ */
const MAT_CACHE = new Map();
const GEO_CACHE = new Map();

function optKey(opts) {
  if (!opts) return '';
  const keys = Object.keys(opts).sort();
  let out = '';
  for (const k of keys) {
    const v = opts[k];
    out += '|' + k + '=' + (v && v.isTexture ? 'tex' + (v.uuid || '?') : String(v));
  }
  return out;
}

/** متریال Lambert مشترک بر اساس رنگ/تنظیمات */
export function matLambert(color, opts) {
  const key = 'L' + color + optKey(opts);
  let m = MAT_CACHE.get(key);
  if (!m) { m = new THREE.MeshLambertMaterial({ color, ...(opts || {}) }); MAT_CACHE.set(key, m); }
  return m;
}

/** متریال Basic مشترک (بدون نور) */
export function matBasic(color, opts) {
  const key = 'B' + color + optKey(opts);
  let m = MAT_CACHE.get(key);
  if (!m) { m = new THREE.MeshBasicMaterial({ color, ...(opts || {}) }); MAT_CACHE.set(key, m); }
  return m;
}

function cached(kind, args, make) {
  const key = kind + ':' + args.join(',');
  let g = GEO_CACHE.get(key);
  if (!g) { g = make(); GEO_CACHE.set(key, g); }
  return g;
}

export function geoBox(w, h, d) { return cached('box', [w, h, d], () => new THREE.BoxGeometry(w, h, d)); }
export function geoPlane(w, d) { return cached('plane', [w, d], () => new THREE.PlaneGeometry(w, d)); }
export function geoCyl(rt, rb, h, seg) { return cached('cyl', [rt, rb, h, seg], () => new THREE.CylinderGeometry(rt, rb, h, seg)); }
export function geoSph(r, ws, hs) { return cached('sph', [r, ws, hs], () => new THREE.SphereGeometry(r, ws, hs)); }
export function geoTorus(r, tube, rs, ts) { return cached('tor', [r, tube, rs, ts], () => new THREE.TorusGeometry(r, tube, rs, ts)); }
export function geoRing(ri, ro, seg) { return cached('ring', [ri, ro, seg], () => new THREE.RingGeometry(ri, ro, seg)); }
export function geoCone(r, h, seg) { return cached('cone', [r, h, seg], () => new THREE.ConeGeometry(r, h, seg)); }

/** هندسهٔ جابه‌جاشده (مثل بازو/پا که حول شانه/لگن می‌چرخد) */
export function geoBoxShifted(w, h, d, tx, ty, tz) {
  return cached('boxs', [w, h, d, tx, ty, tz], () => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(tx, ty, tz);
    return g;
  });
}
export function geoBoxRotZ(w, h, d, rz) {
  return cached('boxz', [w, h, d, rz], () => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.rotateZ(rz);
    return g;
  });
}
export function geoCylRotZ(rt, rb, h, seg) {
  return cached('cylz', [rt, rb, h, seg], () => {
    const g = new THREE.CylinderGeometry(rt, rb, h, seg);
    g.rotateZ(Math.PI / 2);
    return g;
  });
}
export function geoWingShifted(w, h, d, tx) {
  return cached('wing', [w, h, d, tx], () => {
    const g = new THREE.BoxGeometry(w, h, d);
    g.translate(tx, 0, 0);
    return g;
  });
}

export function cacheStats() { return { materials: MAT_CACHE.size, geometries: GEO_CACHE.size }; }

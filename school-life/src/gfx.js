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
export function textSprite(text, opts = {}) {
  const fontSize = opts.size || 44;
  const font = (opts.weight || 'bold') + ' ' + fontSize + 'px ' + (opts.font || 'Vazirmatn, Tahoma, sans-serif');
  const pad = opts.pad != null ? opts.pad : 16;
  const meas = document.createElement('canvas').getContext('2d');
  meas.font = font;
  const tw = Math.ceil(meas.measureText(text).width);
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
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthTest: opts.depthTest !== false,
  });
  const sp = new THREE.Sprite(mat);
  const worldH = opts.height || 0.55;
  sp.scale.set(worldH * (c.width / c.height), worldH, 1);
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

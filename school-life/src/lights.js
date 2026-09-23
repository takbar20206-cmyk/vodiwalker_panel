/* ============================================================
   School Life: Open Campus — lights.js
   مدیریت چراغ‌ها: به‌جای ۷۰+ PointLight در صحنه (که هر کدام در
   shader هر پیکسل حساب می‌شوند و مرورگر را در صفحهٔ لودینگ قفل
   می‌کند)، همهٔ نورها به «منبع» تبدیل می‌شوند و فقط یک استخر
   ثابت (۶ چراغ) روشن می‌ماند که هر لحظه به نزدیک‌ترین منابع
   جابه‌جا می‌شود. تعداد چراغ‌های فعال همیشه ثابت است تا shaderها
   دوباره کامپایل نشوند.
   ============================================================ */
import * as THREE from 'three';
import { clamp } from './utils.js';

export class LightPool {
  /**
   * @param {THREE.Scene} scene
   * @param {object} world  برای دانستن چراغ‌های بیرونی (فقط شب روشن‌اند)
   * @param {number} max    تعداد چراغ‌های فعال (ثابت!)
   */
  constructor(scene, world, max = 6) {
    this.scene = scene;
    this.world = world;
    this.max = max;
    this.sources = [];
    this.pool = [];
    this.enabled = true;
    this._t = 0;
    this._tmpNear = [];
    const colors = [0xffffff, 0xffe9bf, 0xfff0cc, 0xffe2a8, 0xeaf4ff, 0xdbf2ff];
    for (let i = 0; i < max; i++) {
      const pl = new THREE.PointLight(colors[i % colors.length], 0, 30, 1.8);
      pl.position.set(0, -60, 0);      // دور از دید تا وقتی استفاده نشود
      pl.visible = true;               // همیشه «فعال» تا شمارش نور ثابت بماند
      scene.add(pl);
      this.pool.push(pl);
    }
  }

  /** همهٔ PointLightهای ساخته‌شده در صحنه را به منبع تبدیل و از صحنه حذف می‌کند */
  collect() {
    const found = [];
    this.scene.traverse((o) => {
      if (o.isPointLight && this.pool.indexOf(o) === -1 && !o.__pooled) found.push(o);
    });
    for (const light of found) this._toSource(light, {});
    return this.sources.length;
  }

  /** افزودن یک چراغ تازه (مثلاً نورهای جشن) */
  add(light, opts = {}) {
    return this._toSource(light, opts);
  }

  _toSource(light, opts) {
    if (light.__pooled) return light.__poolSrc;
    light.__pooled = true;
    const outdoor = !!(this.world && this.world.outdoorLights && this.world.outdoorLights.indexOf(light) !== -1);
    const src = {
      x: light.position.x, y: light.position.y, z: light.position.z,
      color: light.color && light.color.getHex ? light.color.getHex() : (light.colorHex || 0xffffff),
      base: light.intensity,
      distance: light.distance || 26,
      decay: light.decay != null ? light.decay : 1.8,
      nightOnly: outdoor || !!opts.nightOnly,
      dynamic: !!opts.dynamic,
      light,                       // برای نورهای پویا (جشن) که شدتشان زنده تغییر می‌کند
      removed: false,
    };
    light.__poolSrc = src;
    if (light.parent) { light.parent.remove(light); src.removed = true; }
    this.sources.push(src);
    return src;
  }

  removeSource(src) {
    const i = this.sources.indexOf(src);
    if (i >= 0) this.sources.splice(i, 1);
  }

  /** شدت مؤثر یک منبع در این ساعت/وضعیت */
  intensityOf(src, night01) {
    if (src.dynamic && src.light) return src.light.intensity;
    if (src.nightOnly) return src.base * clamp(night01 * 1.15, 0, 1);
    return src.base;
  }

  /**
   * به‌روزرسانی استخر: نزدیک‌ترین منابع روشن به بازیکن
   * @param {number} px @param {number} pz موقعیت بازیکن
   * @param {number} dt
   * @param {number} night01 ۰..۱ شب بودن
   */
  update(px, pz, dt, night01) {
    this._t -= dt;
    if (this._t > 0) return;
    this._t = 0.3;
    const cand = this._tmpNear;
    cand.length = 0;
    for (const s of this.sources) {
      const inten = this.intensityOf(s, night01);
      if (inten <= 0.4) continue;
      const dx = s.x - px, dz = s.z - pz;
      const d2 = dx * dx + dz * dz;
      if (d2 > 2500) continue;               // دورتر از ۵۰ متر مهم نیست
      cand.push({ s, d2, inten });
    }
    cand.sort((a, b) => a.d2 - b.d2);
    for (let i = 0; i < this.pool.length; i++) {
      const pl = this.pool[i];
      const c = cand[i];
      if (!c) {
        pl.intensity = 0;
        pl.position.set(0, -60, 0);
        continue;
      }
      pl.position.set(c.s.x, c.s.y, c.s.z);
      if (pl.color) pl.color.setHex(c.s.color);
      pl.distance = c.s.distance;
      pl.decay = c.s.decay;
      // نزدیک‌تر = کمی پرنورتر (حس طبیعی‌تر بدون تغییر تعداد نور)
      const fade = clamp(1 - Math.sqrt(c.d2) / 50, 0.25, 1);
      pl.intensity = c.inten * fade;
    }
  }

  /** خاموش/روشن کردن کل سیستم (کیفیت پایین) */
  setEnabled(on) {
    this.enabled = on;
    for (const pl of this.pool) pl.intensity = 0;
  }

  stats() {
    return { sources: this.sources.length, active: this.pool.length };
  }
}

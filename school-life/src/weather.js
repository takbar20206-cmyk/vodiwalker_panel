/* ============================================================
   School Life: Open Campus — weather.js
   سیستم آب‌وهوا: آفتابی، ابری، بارانی، طوفانی، برفی، مه‌آلود
   شامل باران/برف ذره‌ای (فقط ۱ Draw Call برای هر نوع)، برق و رعد،
   آب‌نماها، آدم‌برفی و تأثیر روی NPCها و موسیقی.
   ============================================================ */
import * as THREE from 'three';
import { clamp, rand, dist2D } from './utils.js';

export const WEATHER_MODES = ['auto', 'clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
export const WEATHER_LABEL = {
  auto: 'خودکار (متغیر)',
  clear: 'آفتابی',
  cloudy: 'ابری',
  rain: 'بارانی',
  storm: 'طوفانی',
  snow: 'برفی',
  fog: 'مه‌آلود',
};
const WEATHER_ICON = { auto: '🔄', clear: '☀️', cloudy: '☁️', rain: '🌧️', storm: '⛈️', snow: '❄️', fog: '🌫️' };
export function weatherIcon(m) { return WEATHER_ICON[m] || '☀️'; }

/* ============================================================
   استخر ذرات بارش — Object Pooling با یک THREE.Points
   ============================================================ */
class PrecipPool {
  constructor(scene, max, kind) {
    this.max = max;
    this.kind = kind; // 'rain' | 'snow'
    this.pos = new Float32Array(max * 3);
    this.phase = new Float32Array(max);
    this.active = new Uint8Array(max);
    for (let i = 0; i < max; i++) this.pos[i * 3 + 1] = -999;
    const geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.pos, 3);
    if (this.attr.setUsage) this.attr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', this.attr);
    const mat = new THREE.PointsMaterial({
      size: kind === 'rain' ? 0.14 : 0.26,
      color: kind === 'rain' ? 0xbcd8ea : 0xffffff,
      transparent: true,
      opacity: kind === 'rain' ? 0.75 : 0.95,
      depthWrite: false,
      sizeAttenuation: true,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 6;
    scene.add(this.points);
    this.activeCount = 0;
  }

  respawn(i, px, pz, height) {
    const R = this.kind === 'rain' ? 34 : 40;
    this.pos[i * 3] = px + (Math.random() - 0.5) * R * 2;
    this.pos[i * 3 + 2] = pz + (Math.random() - 0.5) * R * 2;
    this.pos[i * 3 + 1] = height * (0.5 + Math.random() * 0.6);
    this.phase[i] = Math.random() * 6.28;
  }

  spawn(i, px, pz) {
    this.active[i] = 1;
    this.respawn(i, px, pz, 22);
    this.pos[i * 3 + 1] = Math.random() * 22;
  }

  kill(i) {
    this.active[i] = 0;
    this.pos[i * 3 + 1] = -999;
  }

  /** count01: چند درصد از ذرات فعال باشند */
  update(dt, px, pz, count01, wind) {
    const want = Math.floor(this.max * clamp(count01, 0, 1));
    this.activeCount = want;
    const fall = this.kind === 'rain' ? 26 : 2.6;
    const driftX = this.kind === 'rain' ? wind * 6 : wind * 1.1;
    let dirty = false;
    for (let i = 0; i < this.max; i++) {
      const shouldBe = i < want;
      if (!shouldBe) {
        if (this.active[i]) { this.kill(i); dirty = true; }
        continue;
      }
      if (!this.active[i]) { this.spawn(i, px, pz); dirty = true; }
      const iy = i * 3 + 1;
      this.pos[iy] -= fall * dt;
      this.pos[i * 3] += driftX * dt;
      if (this.kind === 'snow') {
        this.phase[i] += dt * 1.6;
        this.pos[i * 3] += Math.sin(this.phase[i]) * 0.35 * dt;
      }
      // دور از بازیکن → بازیافت
      const dx = this.pos[i * 3] - px, dz = this.pos[i * 3 + 2] - pz;
      if (this.pos[iy] <= 0.05 || dx * dx + dz * dz > 2200) {
        this.respawn(i, px, pz, 22);
        dirty = true;
      }
    }
    this.attr.needsUpdate = true;
    this.points.visible = want > 0;
    return dirty;
  }

  clear() {
    for (let i = 0; i < this.max; i++) this.kill(i);
    this.attr.needsUpdate = true;
    this.points.visible = false;
  }
}

/* ============================================================
   Weather
   ============================================================ */
export class Weather {
  constructor(scene, world, audio, settings) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.settings = settings;
    this.mode = 'auto';       // انتخاب کاربر
    this.current = 'clear';   // آب‌وهوای جاری
    this.prev = 'clear';
    this.blend = 1;           // ۱ = کامل در وضعیت جاری
    this.timer = rand(70, 150);
    this.wet = 0;             // ۰..۱ خیسی زمین
    this.snow01 = 0;          // ۰..۱ انباشت برف
    this.gloom = 0;           // ۰..۱ تاریکی ابری
    this.wind = 0.2;          // شدت باد
    this.flash = 0;           // فلاش برق
    this._boltT = rand(4, 12);
    this._thunderT = 0;
    this._splashT = 0;
    this._fogLerp = 0;
    this.time = 0;
    this.pools = {
      rain: new PrecipPool(scene, 900, 'rain'),
      snow: new PrecipPool(scene, 700, 'snow'),
    };
    this._buildGroundFx();
  }

  /* ---------- آب‌نماها و آدم‌برفی ---------- */
  _buildGroundFx() {
    const puddleMat = new THREE.MeshLambertMaterial({ color: 0x86b9d6, transparent: true, opacity: 0, emissive: 0x22495e, emissiveIntensity: 0.4 });
    this.puddleMat = puddleMat;
    const spots = [
      [0, 26], [-14, 12], [16, 18], [30, 30], [-40, 44], [0, 50], [44, 14],
      [-20, -12], [12, -14], [-52, 20], [24, 4], [-30, 6], [8, 40], [-8, 46],
    ];
    this.puddles = [];
    for (const [x, z] of spots) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(rand(1.1, 2.4), rand(1.1, 2.4), 0.03, 12), puddleMat);
      m.position.set(x, 0.035, z);
      m.receiveShadow = true;
      m.visible = false;
      this.scene.add(m);
      this.puddles.push(m);
    }
    // آدم‌برفی (فقط وقتی برف می‌بارد)
    const g = new THREE.Group();
    const snowMat = new THREE.MeshLambertMaterial({ color: 0xf5f9ff });
    const b1 = new THREE.Mesh(new THREE.SphereGeometry(0.75, 10, 8), snowMat);
    b1.position.y = 0.72; b1.castShadow = true; g.add(b1);
    const b2 = new THREE.Mesh(new THREE.SphereGeometry(0.55, 10, 8), snowMat);
    b2.position.y = 1.65; b2.castShadow = true; g.add(b2);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.38, 10, 8), snowMat);
    head.position.y = 2.35; head.castShadow = true; g.add(head);
    const hat = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.6, 8), new THREE.MeshLambertMaterial({ color: 0x2f3a4a }));
    hat.position.y = 2.85; g.add(hat);
    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.16, 0.6), new THREE.MeshLambertMaterial({ color: 0xe0563f }));
    scarf.position.y = 2.02; g.add(scarf);
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 6), new THREE.MeshLambertMaterial({ color: 0xf08c2e }));
    nose.position.set(0, 2.35, 0.34); nose.rotation.x = Math.PI / 2; g.add(nose);
    for (const sx of [-0.16, 0.16]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshLambertMaterial({ color: 0x20242a }));
      eye.position.set(sx, 2.47, 0.3); g.add(eye);
    }
    g.position.set(-8, 0, 30);
    g.visible = false;
    this.scene.add(g);
    this.snowman = g;
  }

  /* ---------- انتخاب آب‌وهوا ---------- */
  set(mode, instant) {
    if (!WEATHER_MODES.includes(mode)) return;
    this.mode = mode;
    if (mode === 'auto') {
      this.timer = rand(70, 150);
      return;
    }
    if (mode !== this.current) this._switch(mode, instant);
    else if (instant) this.blend = 1;
  }

  _switch(mode, instant) {
    this.prev = this.current;
    this.current = mode;
    this.blend = instant ? 1 : 0;
  }

  _pickAuto(timeH) {
    const night = timeH >= 19.5 || timeH < 6;
    const r = Math.random();
    if (night) {
      if (r < 0.34) return 'clear';
      if (r < 0.56) return 'cloudy';
      if (r < 0.74) return 'rain';
      if (r < 0.84) return 'storm';
      if (r < 0.94) return 'fog';
      return 'snow';
    }
    if (r < 0.44) return 'clear';
    if (r < 0.66) return 'cloudy';
    if (r < 0.82) return 'rain';
    if (r < 0.88) return 'storm';
    if (r < 0.95) return 'fog';
    return 'snow';
  }

  get label() { return WEATHER_LABEL[this.current] || ''; }
  get icon() { return weatherIcon(this.current); }
  get isWet() { return this.current === 'rain' || this.current === 'storm' || this.wet > 0.25; }
  get isSnow() { return this.current === 'snow' || this.snow01 > 0.2; }

  /* ---------- به‌روزرسانی ---------- */
  update(dt, env) {
    this.time += dt;
    const timeH = env.timeH != null ? env.timeH : 12;
    // زمان‌بندی خودکار
    if (this.mode === 'auto') {
      this.timer -= dt;
      if (this.timer <= 0) {
        const next = this._pickAuto(timeH);
        this.timer = rand(80, 190);
        if (next !== this.current) this._switch(next, false);
      }
    } else if (this.current !== this.mode) {
      this._switch(this.mode, false);
    }
    if (this.blend < 1) this.blend = Math.min(1, this.blend + dt * (1 / 6));
    // پارامترهای هدف
    const c = this.current;
    const targets = {
      clear:  { wet: 0,    snow: 0,    gloom: 0,    wind: 0.18, rain: 0, snowP: 0, fog: 0 },
      cloudy: { wet: 0,    snow: 0,    gloom: 0.35, wind: 0.4,  rain: 0, snowP: 0, fog: 0.15 },
      rain:   { wet: 0.85, snow: 0,    gloom: 0.6,  wind: 0.6,  rain: 0.55, snowP: 0, fog: 0.4 },
      storm:  { wet: 1,    snow: 0,    gloom: 0.9,  wind: 1,    rain: 1, snowP: 0, fog: 0.55 },
      snow:   { wet: 0,    snow: 1,    gloom: 0.55, wind: 0.5,  rain: 0, snowP: 0.85, fog: 0.45 },
      fog:    { wet: 0.3,  snow: 0,    gloom: 0.5,  wind: 0.1,  rain: 0, snowP: 0, fog: 1 },
    };
    const T = targets[c] || targets.clear;
    const k = Math.min(1, dt * (this.blend >= 1 ? 0.4 : 1.6));
    this.wet += (T.wet - this.wet) * k;
    this.gloom += (T.gloom - this.gloom) * k;
    this.wind += (T.wind - this.wind) * k;
    this._fogLerp += (T.fog - this._fogLerp) * k;
    // برف: انباشت آهسته
    if (T.snow > 0) this.snow01 = clamp(this.snow01 + dt * 0.02, 0, 1);
    else this.snow01 = clamp(this.snow01 - dt * 0.02, 0, 1);

    // ذرات
    const px = env.px != null ? env.px : 0, pz = env.pz != null ? env.pz : 0;
    const rainOn = c === 'rain' || c === 'storm';
    const pm = this.particleMul != null ? this.particleMul : 1;
    this.pools.rain.update(dt, px, pz, (rainOn ? T.rain : 0) * pm, this.wind);
    this.pools.snow.update(dt, px, pz, (c === 'snow' ? T.snowP : 0) * pm, this.wind);

    // پاشش قطره روی زمین
    if (rainOn && this.world.sparkles) {
      this._splashT -= dt;
      if (this._splashT <= 0) {
        this._splashT = 0.05;
        const n = c === 'storm' ? 3 : 2;
        this.world.sparkles.spawn(px + rand(-9, 9), 0.2, pz + rand(-9, 9), 0x9fd2ee, n, { spread: 1.4, up: 1.4, life: 0.35, grav: 9 });
      }
    }

    // برق و رعد
    if (c === 'storm') {
      this._boltT -= dt;
      if (this._boltT <= 0) {
        this._boltT = rand(5, 14);
        this.flash = 1;
        this._thunderT = rand(0.3, 1.4);
      }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.6);
    if (this._thunderT > 0) {
      this._thunderT -= dt;
      if (this._thunderT <= 0 && this.audio) this.audio.play('thunder');
    }

    // آب‌نماها
    const wetVis = this.wet > 0.14;
    if (this.puddleMat) this.puddleMat.opacity = clamp((this.wet - 0.14) * 0.85, 0, 0.72);
    for (let i = 0; i < this.puddles.length; i++) {
      const p = this.puddles[i];
      p.visible = wetVis;
      if (wetVis) p.scale.y = 1 + Math.sin(this.time * 2 + i) * 0.25;
    }
    // آدم‌برفی
    if (this.snowman) {
      const show = this.snow01 > 0.55;
      if (show !== this.snowman.visible) {
        this.snowman.visible = show;
        if (show && this.world.sparkles) {
          this.world.sparkles.spawn(this.snowman.position.x, 2, this.snowman.position.z, 0xffffff, 22, { spread: 2.4, up: 3, life: 1 });
        }
      }
    }
  }

  /** رنگ آسمان/مه را بر اساس آب‌وهوا تغییر می‌دهد */
  modulateSky(skyColor, night01, day01) {
    if (!skyColor || !skyColor.lerp) return skyColor;
    const grey = new THREE.Color(0.36 + day01 * 0.3, 0.4 + day01 * 0.32, 0.46 + day01 * 0.34);
    const stormGrey = new THREE.Color(0.2, 0.22, 0.27);
    const t = Math.max(this.gloom, this._fogLerp * 0.8) * (1 - night01 * 0.5);
    if (this.current === 'storm') skyColor.lerp(stormGrey, t * 0.85);
    else skyColor.lerp(grey, t * 0.7);
    if (this.current === 'snow') skyColor.lerp(new THREE.Color(0.82, 0.86, 0.92), 0.45 * (1 - night01 * 0.6));
    if (this.flash > 0.05) skyColor.lerp(new THREE.Color(1, 1, 1), this.flash * 0.7);
    return skyColor;
  }

  /** میزان کاهش برد دید (برای fog) */
  fogMod() {
    return {
      nearMul: 1 - this._fogLerp * 0.55,
      farMul: 1 - this._fogLerp * 0.62 - (this.current === 'storm' ? 0.12 : 0),
    };
  }

  /** سرعت بازیکن تحت تأثیر آب‌وهوا */
  speedMul() {
    let m = 1;
    if (this.current === 'storm') m -= 0.08;
    if (this.current === 'rain') m -= 0.03;
    if (this.snow01 > 0.4) m -= 0.06;
    return m;
  }

  /** صدا/موسیقی: نام ترک پیشنهادی */
  musicHint() {
    if (this.current === 'rain' || this.current === 'storm') return 'rain';
    if (this.current === 'snow') return 'snow';
    if (this.current === 'fog') return 'fog';
    return null;
  }

  stateForSave() {
    return { mode: this.mode, current: this.current, timer: this.timer, wet: this.wet, snow01: this.snow01 };
  }

  loadState(s) {
    if (!s) return;
    if (WEATHER_MODES.includes(s.mode)) this.mode = s.mode;
    if (WEATHER_MODES.includes(s.current)) { this.current = s.current; this.blend = 1; this.prev = s.current; }
    if (typeof s.timer === 'number') this.timer = s.timer;
    if (typeof s.wet === 'number') this.wet = s.wet;
    if (typeof s.snow01 === 'number') this.snow01 = s.snow01;
  }

  setQuality(q) {
    this.quality = q;
    this.particleMul = q === 'low' ? 0.35 : q === 'medium' ? 0.7 : 1;
  }
}

/* ============================================================
   School Life: Open Campus — animals.js
   حیوانات مدرسه: گربه (پیشی)، سگ، کبوترها، پرنده‌های آسمان،
   پروانه‌ها، ماهی‌های استخر، خرگوش‌های باغ + بادبادک
   ============================================================ */
import * as THREE from 'three';
import { rand, randInt, choice, clamp, dist2D, inRect, lerpAngle } from './utils.js';
import { geoBox, geoCone, geoCyl, geoSph, geoWingShifted, matLambert, textSprite } from './gfx.js';

/* ---------- ساخت مدل‌های Low-Poly ---------- */
function parts(mat) {
  return matLambert;
}

function buildCat() {
  const g = new THREE.Group();
  const M = parts();
  const fur = M(0xe8933f), furDark = M(0xc46f26), white = M(0xf7f1e6);
  const body = new THREE.Mesh(geoCyl(0.19, 0.22, 0.62, 10), fur);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.26; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(geoSph(0.19, 10, 8), fur);
  head.position.set(0.38, 0.36, 0); head.castShadow = true; g.add(head);
  for (const sz of [-0.09, 0.09]) {
    const ear = new THREE.Mesh(geoCone(0.08, 0.16, 4), furDark);
    ear.position.set(0.4, 0.52, sz); g.add(ear);
  }
  const tail = new THREE.Mesh(geoCyl(0.045, 0.035, 0.55, 6), furDark);
  tail.position.set(-0.36, 0.42, 0);
  tail.rotation.z = -0.9;
  g.add(tail);
  const belly = new THREE.Mesh(geoBox(0.34, 0.1, 0.2), white);
  belly.position.y = 0.14; g.add(belly);
  const legGeo = geoCyl(0.05, 0.05, 0.22, 6);
  for (const [lx, lz] of [[0.24, 0.11], [0.24, -0.11], [-0.24, 0.11], [-0.24, -0.11]]) {
    const leg = new THREE.Mesh(legGeo, fur);
    leg.position.set(lx, 0.12, lz); g.add(leg);
  }
  const eyeGeo = geoSph(0.028, 6, 5);
  const eyeMat = M(0x2b2b2b);
  for (const sz of [-0.07, 0.07]) {
    const eye = new THREE.Mesh(eyeGeo, eyeMat);
    eye.position.set(0.53, 0.4, sz); g.add(eye);
  }
  const whisk = M(0xf0e6d8);
  for (const sz of [-1, 1]) {
    const w = new THREE.Mesh(geoBox(0.2, 0.01, 0.01), whisk);
    w.position.set(0.52, 0.34, sz * 0.06); g.add(w);
  }
  g.userData.parts = { head, tail, body };
  return g;
}

function buildDog() {
  const g = new THREE.Group();
  const M = parts();
  const fur = M(0xb98a52), dark = M(0x8b6236);
  const body = new THREE.Mesh(geoBox(0.78, 0.4, 0.42), fur);
  body.position.y = 0.5; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(geoBox(0.34, 0.32, 0.32), fur);
  head.position.set(0.5, 0.62, 0); head.castShadow = true; g.add(head);
  const snout = new THREE.Mesh(geoBox(0.2, 0.16, 0.18), dark);
  snout.position.set(0.68, 0.56, 0); g.add(snout);
  const tail = new THREE.Mesh(geoBox(0.1, 0.3, 0.1), dark);
  tail.position.set(-0.44, 0.72, 0);
  tail.rotation.z = 0.5;
  g.add(tail);
  for (const [lx, lz] of [[0.3, 0.14], [0.3, -0.14], [-0.3, 0.14], [-0.3, -0.14]]) {
    const leg = new THREE.Mesh(geoBox(0.12, 0.34, 0.12), dark);
    leg.position.set(lx, 0.17, lz); g.add(leg);
  }
  for (const sz of [-0.1, 0.1]) {
    const ear = new THREE.Mesh(geoBox(0.08, 0.18, 0.1), dark);
    ear.position.set(0.44, 0.82, sz); g.add(ear);
  }
  g.userData.parts = { head, tail };
  return g;
}

function buildPigeon() {
  const g = new THREE.Group();
  const M = parts();
  const grey = M(0x9aa3ad), light = M(0xc7cdd4), beak = M(0xe9a13b);
  const body = new THREE.Mesh(geoSph(0.17, 8, 7), grey);
  body.scale.set(1.2, 1, 0.9);
  body.position.y = 0.2; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(geoSph(0.1, 8, 6), light);
  head.position.set(0.16, 0.33, 0); g.add(head);
  const bk = new THREE.Mesh(geoCone(0.045, 0.12, 5), beak);
  bk.rotation.z = -Math.PI / 2;
  bk.position.set(0.27, 0.32, 0); g.add(bk);
  const tail = new THREE.Mesh(geoBox(0.2, 0.04, 0.14), light);
  tail.position.set(-0.22, 0.22, 0); g.add(tail);
  for (const sz of [-0.07, 0.07]) {
    const leg = new THREE.Mesh(geoCyl(0.02, 0.02, 0.12, 5), beak);
    leg.position.set(0.02, 0.06, sz); g.add(leg);
  }
  return g;
}

function buildBird(color) {
  const g = new THREE.Group();
  const M = parts();
  const body = new THREE.Mesh(geoSph(0.16, 8, 6), M(color));
  body.scale.set(1.3, 0.9, 0.7);
  g.add(body);
  const wingGeo = geoWingShifted(0.42, 0.03, 0.2, 0.2);
  const wingL = new THREE.Mesh(wingGeo, M(color));
  wingL.position.set(0.02, 0.04, 0.1);
  const wingR = new THREE.Mesh(wingGeo, M(color));
  wingR.position.set(0.02, 0.04, -0.1);
  wingR.rotation.y = Math.PI;
  g.add(wingL); g.add(wingR);
  const tail = new THREE.Mesh(geoBox(0.2, 0.02, 0.12), M(color));
  tail.position.set(-0.24, 0, 0); g.add(tail);
  const head = new THREE.Mesh(geoSph(0.09, 7, 6), M(color));
  head.position.set(0.2, 0.06, 0); g.add(head);
  g.userData.parts = { wingL, wingR };
  return g;
}

function buildButterfly(color) {
  const g = new THREE.Group();
  const M = parts();
  const wingGeo = geoBox(0.18, 0.01, 0.26);
  wingGeo.translate(0.09, 0, 0);
  const wl = new THREE.Mesh(wingGeo, M(color));
  const wr = new THREE.Mesh(wingGeo, M(color));
  wr.rotation.y = Math.PI;
  g.add(wl); g.add(wr);
  const body = new THREE.Mesh(geoCyl(0.02, 0.02, 0.16, 5), M(0x30302e));
  body.rotation.z = Math.PI / 2;
  g.add(body);
  g.userData.parts = { wl, wr };
  g.userData.phase = rand(0, 6);
  return g;
}

function buildFish(color) {
  const g = new THREE.Group();
  const M = parts();
  const body = new THREE.Mesh(geoSph(0.14, 7, 6), M(color));
  body.scale.set(1.6, 0.9, 0.6);
  g.add(body);
  const tail = new THREE.Mesh(geoCone(0.1, 0.16, 5), M(color));
  tail.rotation.z = Math.PI / 2;
  tail.position.set(-0.24, 0, 0);
  g.add(tail);
  const eye = new THREE.Mesh(geoSph(0.025, 5, 4), M(0x1a1a1a));
  eye.position.set(0.14, 0.05, 0.06); g.add(eye);
  return g;
}

function buildRabbit() {
  const g = new THREE.Group();
  const M = parts();
  const fur = M(0xd8d2c6), dark = M(0xb0a898);
  const body = new THREE.Mesh(geoSph(0.2, 8, 6), fur);
  body.scale.set(1.2, 0.9, 0.9);
  body.position.y = 0.2; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(geoSph(0.13, 8, 6), fur);
  head.position.set(0.22, 0.34, 0); g.add(head);
  for (const sz of [-0.06, 0.06]) {
    const ear = new THREE.Mesh(geoBox(0.05, 0.26, 0.08), dark);
    ear.position.set(0.2, 0.52, sz);
    ear.rotation.x = sz > 0 ? 0.2 : -0.2;
    g.add(ear);
  }
  const tail = new THREE.Mesh(geoSph(0.07, 6, 5), M(0xf5f2ec));
  tail.position.set(-0.22, 0.24, 0); g.add(tail);
  g.userData.parts = { head };
  return g;
}

function buildKite() {
  const g = new THREE.Group();
  const M = parts();
  const face = new THREE.Mesh(geoBox(0.9, 0.01, 0.9), M(0xe0563f));
  face.rotation.y = Math.PI / 4;
  face.castShadow = true;
  g.add(face);
  const rib = new THREE.Mesh(geoBox(1.25, 0.02, 0.05), M(0xf7f1e6));
  rib.rotation.y = Math.PI / 4;
  g.add(rib);
  const rib2 = new THREE.Mesh(geoBox(1.25, 0.02, 0.05), M(0xf7f1e6));
  rib2.rotation.y = -Math.PI / 4;
  g.add(rib2);
  const tail = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const seg = new THREE.Mesh(geoBox(0.12, 0.01, 0.12), M(i % 2 ? 0xffd23f : 0x4dd4ff));
    seg.position.set(0, 0, i * 0.3);
    seg.rotation.y = i * 0.4;
    tail.add(seg);
  }
  tail.position.set(0, 0, 0.6);
  g.add(tail);
  g.userData.tail = tail;
  g.visible = false;
  return g;
}

/* ============================================================
   AnimalManager
   ============================================================ */
export class AnimalManager {
  constructor(scene, world, audio, npcs) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.npcs = npcs;
    this.list = [];
    this.butterflies = [];
    this.birds = [];
    this.fish = [];
    this.pigeons = [];
    this.time = 0;
    this.soundT = rand(2, 6);
    this.quality = 'medium';
    this.kite = null;
    this.kiteOn = false;
    this.kiteWind = 0;
    this.catAffection = 0;
    this.fedCount = 0;
    this.stats = { fed: 0, pet: 0, pigeons: 0, kiteTime: 0, butterflies: 0 };
  }

  _add(kind, mesh, x, z, opts = {}) {
    mesh.position.set(x, opts.y || 0, z);
    this.scene.add(mesh);
    const a = {
      kind, mesh,
      home: { x, z },
      x, z, y: opts.y || 0,
      zone: opts.zone || { x1: x - 12, z1: z - 12, x2: x + 12, z2: z + 12 },
      speed: opts.speed || rand(1.1, 1.7),
      faceYaw: rand(0, Math.PI * 2),
      idleT: rand(0, 4),
      target: null,
      hop: 0,
      state: 'wander',
      petT: 0,
      name: opts.name || '',
      soundT: rand(3, 12),
      lowHide: !!opts.lowHide,
    };
    this.list.push(a);
    return a;
  }

  build() {
    const world = this.world;
    const poolRect = world.ext && world.ext.pool ? world.ext.pool.waterRect : null;
    // گربه مدرسه
    this.cat = this._add('cat', buildCat(), 6, 22, { zone: { x1: -24, z1: -12, x2: 24, z2: 34 }, speed: 1.5, name: 'پیشی' });
    // سگ در پارک شهر
    this.dog = this._add('dog', buildDog(), -34, 74, { zone: { x1: -52, z1: 62, x2: -16, z2: 88 }, speed: 2, name: 'هاپو' });
    // کبوترها در حیاط
    const pSpots = [[-4, 30], [2, 33], [-8, 26], [6, 28]];
    pSpots.forEach(([x, z], i) => {
      const p = this._add('pigeon', buildPigeon(), x, z, { zone: { x1: -22, z1: 18, x2: 22, z2: 40 }, speed: 1.2, lowHide: i > 1, name: 'کبوتر' });
      this.pigeons.push(p);
    });
    // پرنده‌های آسمان (حلقه پروازی بالای مدرسه)
    const birdCols = [0x4a4f57, 0x6b5a45, 0x2f5d7c];
    for (let i = 0; i < 8; i++) {
      const b = buildBird(choice(birdCols));
      b.position.set(0, 0, 0);
      this.scene.add(b);
      this.birds.push({ mesh: b, a: (i / 8) * Math.PI * 2, r: 26 + rand(0, 12), y: 13 + rand(0, 7), speed: 0.16 + rand(0, 0.08), flap: rand(0, 6) });
    }
    // پروانه‌ها (روز)
    const bfCols = [0xffd23f, 0xff8fb1, 0x9ad0ff, 0xffb347, 0xd6a2ff];
    for (let i = 0; i < 12; i++) {
      const bf = buildButterfly(choice(bfCols));
      const zone = i < 6
        ? { x1: -26, z1: -4, x2: 26, z2: 34 }        // حیاط
        : { x1: -58, z1: 58, x2: -30, z2: 88 };      // پارک شهر
      bf.position.set(rand(zone.x1, zone.x2), rand(0.6, 1.9), rand(zone.z1, zone.z2));
      this.scene.add(bf);
      this.butterflies.push({ mesh: bf, zone, t: rand(0, 10), speed: rand(0.6, 1.4) });
    }
    // ماهی‌های استخر
    if (poolRect) {
      for (let i = 0; i < 6; i++) {
        const f = buildFish(choice([0xf08c2e, 0xe8e2d6, 0xf0d24a, 0xd46a6a]));
        const lane = poolRect.z1 + 2 + (i % 3) * ((poolRect.z2 - poolRect.z1) / 3);
        f.position.set(rand(poolRect.x1 + 3, poolRect.x2 - 3), 0.45, lane);
        this.scene.add(f);
        this.fish.push({ mesh: f, x0: poolRect.x1 + 3, x1: poolRect.x2 - 3, z: lane, t: rand(0, 6), speed: rand(0.5, 1.1), dir: i % 2 ? 1 : -1 });
      }
    }
    // خرگوش‌های باغ مخفی
    this.rabbits = [
      this._add('rabbit', buildRabbit(), -56, -42, { zone: { x1: -61, z1: -45, x2: -47, z2: -35 }, speed: 1.6, name: 'خرگوش' }),
      this._add('rabbit', buildRabbit(), -51, -38, { zone: { x1: -61, z1: -45, x2: -47, z2: -35 }, speed: 1.4, lowHide: true, name: 'خرگوش' }),
    ];
    // بادبادک
    this.kite = buildKite();
    this.scene.add(this.kite);
    // برچسب نام گربه (برای پیدا کردنش)
    this.catLabel = textSprite('پیشی 🐈', { height: 0.46, bg: 'rgba(120,60,10,0.7)' });
    this.catLabel.position.y = 0.9;
    this.cat.mesh.add(this.catLabel);
  }

  /* ---------- گشت‌وگذار ---------- */
  _wander(a, dt) {
    a.idleT -= dt;
    if (!a.target || a.idleT <= 0) {
      a.idleT = rand(2.5, 7);
      const z = a.zone;
      a.target = { x: rand(z.x1, z.x2), z: rand(z.z1, z.z2) };
    }
    const d = dist2D(a.x, a.z, a.target.x, a.target.z);
    if (d < 0.4) { a.target = null; return false; }
    const sp = a.speed * dt;
    const dx = (a.target.x - a.x) / d, dz = (a.target.z - a.z) / d;
    a.x += dx * sp;
    a.z += dz * sp;
    a.faceYaw = Math.atan2(dx, dz);
    return true;
  }

  update(dt, env) {
    this.time += dt;
    const px = env.px, pz = env.pz;
    const timeH = env.timeH != null ? env.timeH : 12;
    const isDay = timeH > 6 && timeH < 19.5;
    const rain = !!env.rain, snow = !!env.snow;
    const q = this.quality;
    const far = 60;

    for (const a of this.list) {
      const isCat = a === this.cat;
      // گربه: اگر از شدت باران بگذریم، زیر سقف می‌رود
      const hide = (rain && (a.kind === 'cat' || a.kind === 'dog' || a.kind === 'rabbit'));
      if (hide) {
        a.mesh.visible = false;
        continue;
      }
      if (a.lowHide && q === 'low') { a.mesh.visible = false; continue; }
      a.mesh.visible = true;
      const pd = dist2D(px, pz, a.x, a.z);
      if (pd > far) {
        // دور از بازیکن: به‌روزرسانی سبک
        a.mesh.position.set(a.x, a.y, a.z);
        continue;
      }
      let moving;
      // گربه با ماهی دنبال بازیکن می‌آید
      if (isCat && this.catAffection > 0) {
        this.catAffection -= dt;
        const tx = px - Math.cos(env.camYaw || 0) * 1.6, tz = pz - Math.sin(env.camYaw || 0) * 1.6;
        const d = dist2D(a.x, a.z, tx, tz);
        if (d > 1.6) {
          const sp = 2.6 * dt;
          a.x += ((tx - a.x) / d) * sp;
          a.z += ((tz - a.z) / d) * sp;
          a.faceYaw = Math.atan2(tx - a.x, tz - a.z);
          moving = true;
        } else { a.faceYaw = Math.atan2(px - a.x, pz - a.z); moving = false; a.mesh.position.set(a.x, a.y, a.z); this._animate(a, dt, false); continue; }
      } else {
        moving = this._wander(a, dt);
      }
      a.mesh.position.set(a.x, a.y, a.z);
      a.mesh.rotation.y = lerpAngle(a.mesh.rotation.y, a.faceYaw, dt * 6);
      // صداهای تصادفی
      a.soundT -= dt;
      if (a.soundT <= 0) {
        a.soundT = rand(8, 20);
        if (pd < 16) this.audio.play(a.kind === 'cat' ? 'meow' : a.kind === 'dog' ? 'bark' : 'chirp');
      }
      this._animate(a, dt, moving);
      // کبوترها با نزدیک شدن پر می‌زنند
      if (a.kind === 'pigeon' && pd < 3.2) {
        a.target = { x: a.x + (a.x - px) * 2.4, z: a.z + (a.z - pz) * 2.4 };
        a.target.x = clamp(a.target.x, a.zone.x1, a.zone.x2);
        a.target.z = clamp(a.target.z, a.zone.z1, a.zone.z2);
        a.speed = 3.4;
        if (this.stats.pigeons < 9999) this.stats.pigeons++;
        this.audio.play('flap');
      } else if (a.kind === 'pigeon') {
        a.speed = 1.2;
      }
    }

    // پروانه‌ها
    const bfMax = q === 'low' ? 0 : q === 'medium' ? 7 : 12;
    for (let i = 0; i < this.butterflies.length; i++) {
      const b = this.butterflies[i];
      const show = i < bfMax && isDay && !rain;
      b.mesh.visible = show;
      if (!show) continue;
      b.t += dt * b.speed;
      const z = b.zone;
      const cx = (z.x1 + z.x2) / 2, cz = (z.z1 + z.z2) / 2;
      const rx = (z.x2 - z.x1) / 2, rz = (z.z2 - z.z1) / 2;
      b.mesh.position.set(
        cx + Math.sin(b.t * 0.55) * rx * 0.85,
        0.9 + Math.sin(b.t * 2.1) * 0.45 + 0.5,
        cz + Math.cos(b.t * 0.42 + i) * rz * 0.85
      );
      b.mesh.rotation.y = -b.t * 0.55;
      const P = b.mesh.userData.parts;
      const flap = Math.sin(b.t * 12) * 0.9;
      P.wl.rotation.z = flap; P.wr.rotation.z = -flap;
    }

    // پرنده‌های آسمان
    const birdMax = q === 'low' ? 4 : 8;
    for (let i = 0; i < this.birds.length; i++) {
      const b = this.birds[i];
      const show = i < birdMax && !rain;
      b.mesh.visible = show;
      if (!show) continue;
      b.a += dt * b.speed;
      const x = Math.cos(b.a) * b.r, z = -20 + Math.sin(b.a) * b.r * 0.8;
      b.mesh.position.set(x, b.y + Math.sin(b.a * 3) * 0.8, z);
      b.mesh.rotation.y = -b.a + Math.PI / 2;
      b.flap += dt * 9;
      const P = b.mesh.userData.parts;
      P.wingL.rotation.z = Math.sin(b.flap) * 0.8;
      P.wingR.rotation.z = -Math.sin(b.flap) * 0.8;
    }

    // ماهی‌ها
    for (const f of this.fish) {
      f.t += dt * f.speed;
      const span = Math.abs(f.x1 - f.x0);
      const x = f.dir > 0 ? f.x0 + ((f.t * 1.4) % span) : f.x1 - ((f.t * 1.4) % span);
      f.mesh.position.set(x, 0.42 + Math.sin(f.t * 2) * 0.08, f.z + Math.sin(f.t * 1.2) * 0.35);
      f.mesh.rotation.y = f.dir > 0 ? 0 : Math.PI;
    }

    // بادبادک
    if (this.kiteOn && this.kite) {
      this.kite.visible = true;
      this.kiteWind = clamp(this.kiteWind + dt * 0.4, 0, 1);
      const t = this.time;
      const kx = px + Math.sin(t * 0.7) * 3.2 + Math.sin(t * 2.3) * 0.5;
      const kz = pz - 5.5 + Math.cos(t * 0.55) * 1.8;
      const ky = 6.5 + this.kiteWind * 4 + Math.sin(t * 1.6) * 0.8;
      this.kite.position.set(kx, ky, kz);
      this.kite.rotation.z = Math.sin(t * 1.9) * 0.28;
      this.kite.rotation.y = Math.sin(t * 0.9) * 0.5;
      const tail = this.kite.userData.tail;
      if (tail) tail.rotation.z = Math.sin(t * 3) * 0.5;
      this.stats.kiteTime += dt;
    } else if (this.kite) {
      this.kite.visible = false;
      this.kiteWind = 0;
    }
  }

  _animate(a, dt, moving) {
    const P = a.mesh.userData.parts;
    if (!P) return;
    const t = this.time;
    if (a.kind === 'cat' && P.tail) P.tail.rotation.x = Math.sin(t * 3) * 0.35;
    if (a.kind === 'dog' && P.tail) P.tail.rotation.z = 0.5 + Math.sin(t * 12) * 0.4;
    if (a.kind === 'rabbit' && moving) {
      a.hop += dt * 7;
      a.mesh.position.y = Math.abs(Math.sin(a.hop)) * 0.22;
    } else if (a.kind === 'rabbit') {
      a.mesh.position.y = 0;
    }
    if (a.kind === 'pigeon' || a.kind === 'cat' || a.kind === 'dog') {
      const bob = moving ? Math.abs(Math.sin(t * 8 + a.home.x)) * 0.05 : Math.sin(t * 2) * 0.012;
      a.mesh.position.y = a.y + bob;
    }
  }

  /* ---------- تعامل ---------- */
  nearest(x, z, maxR = 3.0) {
    let best = null, bd = maxR;
    for (const a of this.list) {
      if (!a.mesh.visible) continue;
      const d = dist2D(x, z, a.x, a.z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  pet(a) {
    if (!a) return;
    this.stats.pet++;
    this.audio.play(a.kind === 'cat' ? 'meow' : a.kind === 'dog' ? 'bark' : 'chirp');
    if (this.world.sparkles) this.world.sparkles.spawn(a.x, 1, a.z, 0xff7ba8, 14, { spread: 1.6, up: 2.4, life: 0.8 });
    return true;
  }

  feed(a, item) {
    if (!a) return false;
    this.stats.fed++;
    this.fedCount++;
    if (this.world.sparkles) this.world.sparkles.spawn(a.x, 1, a.z, 0xffd34d, 18, { spread: 1.8, up: 2.6, life: 0.9 });
    this.audio.play('eat');
    if (a.kind === 'cat') this.catAffection = 45;
    return true;
  }

  toggleKite() {
    this.kiteOn = !this.kiteOn;
    if (this.kiteOn) this.audio.play('wind');
    else this.audio.play('close');
    return this.kiteOn;
  }

  mapPoints() {
    const pts = [];
    for (const a of this.list) {
      if (!a.mesh.visible) continue;
      pts.push({ x: a.x, z: a.z, kind: a.kind, name: a.name });
    }
    return pts;
  }

  setQuality(q) {
    this.quality = q;
    if (q === 'low') {
      for (const a of this.list) if (a.lowHide) a.mesh.visible = false;
      for (const b of this.butterflies) b.mesh.visible = false;
      for (let i = 4; i < this.birds.length; i++) this.birds[i].mesh.visible = false;
    }
  }

  stateForSave() {
    return {
      catAffection: this.catAffection,
      kiteOn: this.kiteOn,
      stats: { ...this.stats },
    };
  }

  loadState(s) {
    if (!s) return;
    if (typeof s.catAffection === 'number') this.catAffection = s.catAffection;
    if (s.kiteOn) this.kiteOn = true;
    if (s.stats) this.stats = { ...this.stats, ...s.stats };
  }
}

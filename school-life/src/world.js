/* ============================================================
   School Life: Open Campus — world.js
   ساخت محیط: مدرسه، حیاط، زمین فوتبال، سالن، پارکینگ،
   کتابخانه، بوفه، خیابان‌ها، ساختمان‌های اطراف + فیزیک توپ
   ============================================================ */
import * as THREE from 'three';
import { clamp, lerp, rand, randInt, choice, resolveCollisions, pointBlocked, inRect, dist2D } from './utils.js';
import { SparkPool, canvasTexture, geoBox, geoCone, geoCyl, geoPlane, geoRing, geoSph, geoTorus, matLambert, textSprite } from './gfx.js';

/* ---------- نقاط کلیدی مشترک با ماژول‌های دیگر ---------- */
export const AREAS = {
  roomA:     { x1: -28, z1: -33, x2: -10, z2: -23 },
  roomB:     { x1: -8,  z1: -33, x2: 8,   z2: -23 },
  office:    { x1: 10,  z1: -33, x2: 28,  z2: -23 },
  corridor:  { x1: -28, z1: -23, x2: 28,  z2: -20 },
};
export const DOORS = {
  roomA:   { x: -19, z: -23 },
  roomB:   { x: 0,   z: -23 },
  office:  { x: 19,  z: -23 },
  mainIn:  { x: 0,   z: -21.5 },
  mainOut: { x: 0,   z: -16.5 },
};
export const LOC = {
  spawn: { x: 0, z: 42, yaw: Math.PI },
  fieldCenter: { x: 44, z: 22 },
  eastGoal: { x: 65.5, z: 22 },
  westGoal: { x: 22.5, z: 22 },
  garden: { x: -54, z: -40 },
  kiosk: { x: -16, z: 12.5 },
  gate: { x: 0, z: 56 },
  fountain: { x: 0, z: 4 },
};
export const PARKING_SPOTS = {
  cart1:   { x: -54, z: 44, heading: 0 },
  cart2:   { x: -50, z: 44, heading: 0 },
  scooter: { x: -46, z: 44, heading: 0 },
  teacher: { x: -42, z: 44, heading: 0 },
};
export const BOUNDS = 128;

export function areaOf(x, z) {
  if (inRect(x, z, AREAS.roomA)) return 'roomA';
  if (inRect(x, z, AREAS.roomB)) return 'roomB';
  if (inRect(x, z, AREAS.office)) return 'office';
  if (inRect(x, z, AREAS.corridor)) return 'corridor';
  return 'out';
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.interactables = [];
    this.pickups = {};          // id -> {kind, mesh, x,y,z, taken, phase}
    this.coins = [];            // {mesh, x,z, taken}
    this.lamps = [];
    this.clouds = [];
    this.mapRects = [];
    this.mapLabels = [];
    this.mapPaths = [];
    this.time = 0;
    this.night01 = 0;
    this.day01 = 1;
    // کال‌بک‌ها (توسط missions مقداردهی می‌شوند)
    this.pickupHandler = null;  // (kind, id) => void
    this.onCoin = null;         // (index) => void
    this.onGoal = null;         // ('east'|'west') => void
    this.onSecret = null;       // () => void
    this._secretInside = false;
    this._goalFreeze = 0;
    this._fountainT = 0;
  }

  addCollider(x1, z1, x2, z2) {
    this.colliders.push({ x1: Math.min(x1, x2), z1: Math.min(z1, z2), x2: Math.max(x1, x2), z2: Math.max(z1, z2) });
  }

  addInteractable(it) {
    // {id, x, z, r, prompt, action, enabled}
    it.r = it.r || 2.2;
    this.interactables.push(it);
    return it;
  }

  /* ============================================================
     ساخت مرحله‌ای (برای نمایش Progress بار)
     ============================================================ */
  async build(onStep) {
    const step = async (pct, msg, fn) => { fn.call(this); onStep(pct, msg); await new Promise((r) => setTimeout(r, 10)); };
    this._makeMaterials();
    await step(6,  'آماده‌سازی زمین و خیابان‌ها...', this._buildGround);
    await step(18, 'ساخت حصار و دروازه مدرسه...', this._buildFence);
    await step(34, 'ساخت ساختمان اصلی مدرسه...', this._buildMainBuilding);
    await step(48, 'ساخت سالن ورزشی و کتابخانه...', this._buildGymLibrary);
    await step(58, 'ساخت بوفه و زمین فوتبال...', this._buildKioskField);
    await step(68, 'ساخت پارکینگ و محوطه...', this._buildParkingProps);
    await step(80, 'کاشت درخت‌ها و فضای سبز...', this._buildNature);
    await step(89, 'ساخت ساختمان‌های اطراف...', this._buildOutside);
    await step(95, 'قرار دادن آیتم‌ها و آسمان...', this._buildPickupsSky);
    await step(100, 'تکمیل!', function () {
      this.sparkles = new SparkPool(this.scene, 240);
    });
  }

  /* ---------------- متریال‌ها و تکسچرها ---------------- */
  _makeMaterials() {
    const speckle = (base, dots, n = 900) => (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < n; i++) {
        ctx.fillStyle = dots[i % dots.length];
        ctx.globalAlpha = 0.25 + Math.random() * 0.4;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      ctx.globalAlpha = 1;
    };
    const tiles = (base, line, n = 4) => (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = line; ctx.lineWidth = 3;
      const s = w / n;
      for (let i = 0; i <= n; i++) {
        ctx.beginPath(); ctx.moveTo(i * s, 0); ctx.lineTo(i * s, h); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * s); ctx.lineTo(w, i * s); ctx.stroke();
      }
    };
    this.texGrass = canvasTexture(256, 256, speckle('#6fae4e', ['#5d9840', '#7fc25c', '#679e48']), { repeat: [74, 74] });
    this.texPave = canvasTexture(256, 256, tiles('#b3aa9c', '#9a9184', 4), { repeat: [13, 11] });
    this.texAsphalt = canvasTexture(256, 256, speckle('#40444c', ['#353941', '#4c515a']), { repeat: [20, 2] });
    this.texPark = canvasTexture(256, 256, speckle('#454a52', ['#3a3e45', '#51565f']), { repeat: [6, 4] });
    this.texField = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = '#5da244'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) {
        if (i % 2) continue;
        ctx.fillStyle = '#559950';
        ctx.fillRect((i * w) / 8, 0, w / 8, h);
      }
      for (let i = 0; i < 500; i++) {
        ctx.fillStyle = i % 2 ? '#4e8c3e' : '#6ab04f';
        ctx.globalAlpha = 0.35;
        ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
      }
      ctx.globalAlpha = 1;
    }, { repeat: [4, 3] });
    this.texFloor = canvasTexture(256, 256, tiles('#d3cdbf', '#b7b0a1', 6), { repeat: [15, 4] });

    const winWall = (base, trim, rows, cols) => (ctx, w, h) => {
      ctx.fillStyle = base; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = trim; ctx.fillRect(0, 0, w, 10); ctx.fillRect(0, h - 10, w, 10);
      const cw = w / cols, ch = h / rows;
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const x = c * cw + cw * 0.22, y = r * ch + ch * 0.2, ww = cw * 0.56, hh = ch * 0.55;
          ctx.fillStyle = '#f4f1e8'; ctx.fillRect(x - 3, y - 3, ww + 6, hh + 6);
          ctx.fillStyle = '#9fc3d8'; ctx.fillRect(x, y, ww, hh);
          ctx.fillStyle = 'rgba(255,255,255,0.45)'; ctx.fillRect(x, y, ww, hh * 0.35);
          ctx.strokeStyle = '#f4f1e8'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + ww / 2, y); ctx.lineTo(x + ww / 2, y + hh); ctx.stroke();
        }
      }
    };
    this.texSchoolLow = canvasTexture(512, 128, winWall('#e8b04b', '#b97f26', 1, 24));
    this.texSchoolUp = canvasTexture(512, 128, winWall('#e0983f', '#b97f26', 1, 28));
    this.texGym = canvasTexture(512, 128, winWall('#7fb6d9', '#4f7fa3', 1, 14));
    this.texLib = canvasTexture(512, 128, winWall('#a8d5a2', '#5f9159', 1, 12));
    this.houseTexs = ['#d9a066', '#c97b7b', '#8fa8c8', '#a3b18a', '#d4c29a'].map((c) =>
      canvasTexture(256, 128, winWall(c, '#00000022', 1, 8))
    );
    this.texBooks = canvasTexture(256, 128, (ctx, w, h) => {
      ctx.fillStyle = '#7a5230'; ctx.fillRect(0, 0, w, h);
      for (let row = 0; row < 3; row++) {
        const y = 8 + row * 40;
        let x = 6;
        while (x < w - 8) {
          const bw = 8 + Math.random() * 10;
          ctx.fillStyle = choice(['#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#16a085', '#d35400']);
          ctx.fillRect(x, y, bw, 30);
          x += bw + 2;
        }
        ctx.fillStyle = '#5d3d22'; ctx.fillRect(0, y + 30, w, 5);
      }
    });
    this.texBall = canvasTexture(128, 128, (ctx, w, h) => {
      ctx.fillStyle = '#f5f5f5'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#222';
      for (let i = 0; i < 9; i++) {
        ctx.beginPath();
        ctx.arc(14 + (i % 3) * 50, 18 + Math.floor(i / 3) * 46, 11, 0, 7);
        ctx.fill();
      }
    });

    const L = matLambert;
    this.M = {
      white: L(0xf5f2ea), trim: L(0x8a6a45), roof: L(0x9c4f3c),
      schoolLow: new THREE.MeshLambertMaterial({ map: this.texSchoolLow }),
      schoolUp: new THREE.MeshLambertMaterial({ map: this.texSchoolUp }),
      gym: new THREE.MeshLambertMaterial({ map: this.texGym }),
      lib: new THREE.MeshLambertMaterial({ map: this.texLib }),
      inWall: L(0xe9e2d2), inWallB: L(0xdfe8dd), officeWall: L(0xe4d9c8),
      floor: new THREE.MeshLambertMaterial({ map: this.texFloor }),
      ceil: L(0xf7f4ec),
      wood: L(0x8a5a33), woodDark: L(0x5d3d22), desk: L(0xb08a5a), deskTop: L(0xd8b988),
      board: L(0x2e5d43), metal: L(0x8b93a0), darkMetal: L(0x3c4046),
      grass: new THREE.MeshLambertMaterial({ map: this.texGrass }),
      pave: new THREE.MeshLambertMaterial({ map: this.texPave }),
      asphalt: new THREE.MeshLambertMaterial({ map: this.texAsphalt }),
      park: new THREE.MeshLambertMaterial({ map: this.texPark }),
      field: new THREE.MeshLambertMaterial({ map: this.texField }),
      lineWhite: L(0xf8f8f8),
      trunk: L(0x7a5230), leaf: L(0xffffff), bush: L(0x4e8c3e),
      stone: L(0x9a958c), water: new THREE.MeshLambertMaterial({ color: 0x4fb3e8, transparent: true, opacity: 0.85, emissive: 0x1a5a80, emissiveIntensity: 0.35 }),
      glass: new THREE.MeshLambertMaterial({ color: 0xbfe3f2, transparent: true, opacity: 0.6 }),
      bench: L(0x6e4a2f), benchIron: L(0x2f3338),
      lampPost: L(0x2e3238),
      lampBulb: new THREE.MeshLambertMaterial({ color: 0xfff6d8, emissive: 0xffdf80, emissiveIntensity: 0.15 }),
      ceilLamp: new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0xfff2cc, emissiveIntensity: 0.9 }),
      shelf: new THREE.MeshLambertMaterial({ map: this.texBooks }),
      can: L(0xd23c3c, { emissive: 0x550000, emissiveIntensity: 0.4 }),
      bookR: L(0xc0392b), bookB: L(0x2471a3), bookG: L(0x1e8449),
      bag: L(0x8e44ad), coin: L(0xf5c518, { emissive: 0xa67c00, emissiveIntensity: 0.7 }),
      ball: new THREE.MeshLambertMaterial({ map: this.texBall }),
      marker: new THREE.MeshBasicMaterial({ color: 0xffd34d, transparent: true, opacity: 0.85 }),
      beam: new THREE.MeshBasicMaterial({ color: 0xffe27a, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
      net: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, side: THREE.DoubleSide }),
      cloud: new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: 0.92 }),
      hill: L(0x5d8a48), road: L(0x3a3e45),
      door: L(0x6e4426), rugB: L(0x7a2e2e), rugG: L(0x2e6b52),
      mat1: L(0x3b82f6), mat2: L(0xef4444), mat3: L(0x22c55e), mat4: L(0xf59e0b),
    };
  }

  /* ---------------- ابزارهای ساخت ---------------- */
  box(w, h, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(geoBox(w, h, d), mat);
    m.position.set(x, y, z);
    if (opts.ry) m.rotation.y = opts.ry;
    // فقط اشیای بزرگ سایه می‌اندازند (سایه‌اندازی هر مِش کوچک، FPS را می‌خورد)
    const big = Math.max(w, h, d) >= 0.45;
    m.castShadow = opts.cast === true || (opts.cast !== false && big);
    m.receiveShadow = opts.recv !== false;
    (opts.parent || this.scene).add(m);
    if (opts.collider) {
      const hw = w / 2, hd = d / 2;
      this.addCollider(x - hw, z - hd, x + hw, z + hd);
    }
    return m;
  }

  plane(w, d, mat, x, y, z, opts = {}) {
    const m = new THREE.Mesh(geoPlane(w, d), mat);
    m.rotation.x = -Math.PI / 2;
    if (opts.ry) m.rotation.z = opts.ry;
    m.position.set(x, y, z);
    m.receiveShadow = opts.recv !== false;
    (opts.parent || this.scene).add(m);
    return m;
  }

  /** دیوار افقی (در راستای X) با شکاف در/پنجره. gaps: [{a,b}] بازه روی محور X */
  wallZ(z, x1, x2, h, mat, opts = {}) {
    const th = opts.th || 0.4;
    const gaps = (opts.gaps || []).slice().sort((p, q) => p.a - q.a);
    let cur = x1;
    const segs = [];
    for (const g of gaps) {
      if (g.a > cur) segs.push([cur, Math.min(g.a, x2)]);
      cur = Math.max(cur, g.b);
    }
    if (cur < x2) segs.push([cur, x2]);
    for (const [a, b] of segs) {
      const len = b - a;
      if (len <= 0.01) continue;
      this.box(len, h, th, mat, (a + b) / 2, h / 2, z, { collider: opts.collider !== false });
    }
    // سردر بالای درها
    const dh = opts.doorH || 3;
    if (dh < h) {
      for (const g of gaps) {
        const len = g.b - g.a;
        if (len <= 0) continue;
        this.box(len, h - dh, th, mat, (g.a + g.b) / 2, dh + (h - dh) / 2, z);
      }
    }
    if (opts.mapColor) this.mapRects.push({ x1, z1: z - th / 2, x2, z2: z + th / 2, c: opts.mapColor });
  }

  /** دیوار عمودی (در راستای Z). gaps: [{a,b}] بازه روی محور Z */
  wallX(x, z1, z2, h, mat, opts = {}) {
    const th = opts.th || 0.4;
    const gaps = (opts.gaps || []).slice().sort((p, q) => p.a - q.a);
    let cur = z1;
    const segs = [];
    for (const g of gaps) {
      if (g.a > cur) segs.push([cur, Math.min(g.a, z2)]);
      cur = Math.max(cur, g.b);
    }
    if (cur < z2) segs.push([cur, z2]);
    for (const [a, b] of segs) {
      const len = b - a;
      if (len <= 0.01) continue;
      this.box(th, h, len, mat, x, h / 2, (a + b) / 2, { collider: opts.collider !== false });
    }
    const dh = opts.doorH || 3;
    if (dh < h) {
      for (const g of gaps) {
        const len = g.b - g.a;
        if (len <= 0) continue;
        this.box(th, h - dh, len, mat, x, dh + (h - dh) / 2, (g.a + g.b) / 2);
      }
    }
    if (opts.mapColor) this.mapRects.push({ x1: x - th / 2, z1, x2: x + th / 2, z2, c: opts.mapColor });
  }

  /* ---------------- مرحله ۱: زمین و خیابان ---------------- */
  _buildGround() {
    const g = new THREE.Mesh(geoPlane(400, 400), this.M.grass);
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.scene.add(g);

    // حیاط سنگفرش
    this.plane(54, 48, this.M.pave, 0, 0.02, 6);
    this.mapRects.push({ x1: -27, z1: -18, x2: 27, z2: 30, c: '#b9b1a3' });

    // خیابان جنوبی + غربی + شمالی
    this.plane(200, 8, this.M.asphalt, 0, 0.015, 62);
    this.plane(8, 132, this.M.asphalt, -74, 0.015, 4);
    this.plane(150, 8, this.M.asphalt, 0, 0.015, -54);
    this.mapRects.push({ x1: -100, z1: 58, x2: 100, z2: 66, c: '#3a3e45' });
    this.mapRects.push({ x1: -78, z1: -62, x2: -70, z2: 70, c: '#3a3e45' });
    this.mapRects.push({ x1: -75, z1: -58, x2: 75, z2: -50, c: '#3a3e45' });

    // خط‌کشی وسط خیابان (Instanced)
    const dashGeo = geoBox(2.2, 0.02, 0.35);
    const dashes = [];
    for (let x = -96; x <= 96; x += 6) { if (Math.abs(x) < 6) continue; dashes.push([x, 62, 0]); }
    for (let z = -56; z <= 66; z += 6) dashes.push([-74, z, Math.PI / 2]);
    for (let x = -70; x <= 70; x += 6) dashes.push([x, -54, 0]);
    const inst = new THREE.InstancedMesh(dashGeo, this.M.lineWhite, dashes.length);
    const m4 = new THREE.Matrix4(), e = new THREE.Euler(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), pv = new THREE.Vector3();
    dashes.forEach((d, i) => {
      e.set(0, d[2], 0); q.setFromEuler(e); pv.set(d[0], 0.03, d[1]);
      m4.compose(pv, q, s); inst.setMatrixAt(i, m4);
    });
    inst.instanceMatrix.needsUpdate = true;
    this.scene.add(inst);
  }

  /* ---------------- مرحله ۲: حصار ---------------- */
  _buildFence() {
    const H = 1.3, th = 0.25;
    const mat = this.M.stone;
    // جنوب (با دروازه وسط)
    this.wallZ(56, -66, -4, H, mat, { th, doorH: H });
    this.wallZ(56, 4, 66, H, mat, { th, doorH: H });
    // شمال / شرق / غرب
    this.wallZ(-46, -66, 66, H, mat, { th, doorH: H });
    this.wallX(66, -46, 56, H, mat, { th, doorH: H });
    this.wallX(-66, -46, 56, H, mat, { th, doorH: H });
    // ستون‌های دروازه + تابلو
    this.box(0.8, 2.6, 0.8, this.M.trim, -4.4, 1.3, 56, { collider: true });
    this.box(0.8, 2.6, 0.8, this.M.trim, 4.4, 1.3, 56, { collider: true });
    this.box(9.6, 0.7, 0.9, this.M.trim, 0, 2.9, 56);
    const sign = textSprite('دبیرستان نمونه آفتاب', { height: 0.8, bg: '#1f4e5f', fg: '#ffe9a3' });
    sign.position.set(0, 2.2, 55.4);
    this.scene.add(sign);
    const sign2 = sign.clone();
    sign2.position.set(0, 2.2, 56.6);
    sign2.rotation.y = Math.PI;
    this.scene.add(sign2);
  }

  /* ---------------- مرحله ۳: ساختمان اصلی ---------------- */
  _buildMainBuilding() {
    const H = 4.2, x1 = -30, x2 = 30, zN = -34, zS = -20;
    // دیوارهای بیرونی (با پنجره)
    this.wallZ(zS, x1, x2, H, this.M.schoolLow, { gaps: [{ a: -3, b: 3 }], mapColor: '#e8b04b' });
    this.wallZ(zN, x1, x2, H, this.M.schoolLow, { mapColor: '#e8b04b' });
    this.wallX(x1, zN, zS, H, this.M.schoolLow, { mapColor: '#e8b04b' });
    this.wallX(x2, zN, zS, H, this.M.schoolLow, { mapColor: '#e8b04b' });
    this.mapRects.push({ x1, z1: zN, x2, z2: zS, c: '#e8b04b' });
    this.mapLabels.push({ x: 0, z: -27, t: 'مدرسه' });

    // درهای باز ورودی
    this.box(0.15, 2.9, 1.4, this.M.door, -3.1, 1.45, -19.2);
    this.box(0.15, 2.9, 1.4, this.M.door, 3.1, 1.45, -19.2);
    // پله ورودی
    this.box(7.5, 0.24, 2.4, this.M.stone, 0, 0.12, -18.6);

    // طبقه بالا (نما) + سقف
    this.box(60.6, 3.8, 14.6, this.M.schoolUp, 0, H + 1.9, -27);
    this.box(62, 0.5, 16, this.M.roof, 0, H + 3.95, -27);
    this.box(62.6, 0.35, 16.6, this.M.trim, 0, H + 3.75, -27);

    // کف و سقف داخلی
    this.plane(59.4, 13.4, this.M.floor, 0, 0.03, -27, {});
    const ceil = new THREE.Mesh(geoPlane(59.4, 13.4), this.M.ceil);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(0, H - 0.05, -27);
    this.scene.add(ceil);

    // دیوار داخلی راهرو/کلاس‌ها
    this.wallZ(-23, -29.8, 29.8, H, this.M.inWall, { th: 0.3, gaps: [{ a: -20.1, b: -17.9 }, { a: -1.1, b: 1.1 }, { a: 17.9, b: 20.1 }] });
    // دیوارهای جداکننده کلاس‌ها
    this.wallX(-10, -33.8, -23, H, this.M.inWall, { th: 0.3, doorH: H });
    this.wallX(8, -33.8, -23, H, this.M.inWall, { th: 0.3, doorH: H });
    this.wallX(10, -33.8, -23, H, this.M.officeWall, { th: 0.3, doorH: H });

    // چراغ‌های سقفی راهرو
    for (const x of [-20, -8, 8, 20]) {
      this.box(2.2, 0.12, 0.7, this.M.ceilLamp, x, H - 0.15, -21.5, { cast: false });
    }
    this.box(2.2, 0.12, 0.7, this.M.ceilLamp, -19, H - 0.15, -28, { cast: false });
    this.box(2.2, 0.12, 0.7, this.M.ceilLamp, 0, H - 0.15, -28, { cast: false });
    this.box(2.2, 0.12, 0.7, this.M.ceilLamp, 19, H - 0.15, -28, { cast: false });

    // نور داخلی راهرو
    this.corridorLight = new THREE.PointLight(0xffe9bf, 22, 46, 1.8);
    this.corridorLight.position.set(0, 3.4, -22);
    this.scene.add(this.corridorLight);

    // کلاس‌ها
    this._classroom(-19, 'A');
    this._classroom(0, 'B');
    // دفتر مدیر
    this._office();
    // تابلوی راهرو
    const t1 = textSprite('کلاس A', { height: 0.5, bg: '#274e13' });
    t1.position.set(-19, 3.4, -22.7); this.scene.add(t1);
    const t2 = textSprite('کلاس B', { height: 0.5, bg: '#274e13' });
    t2.position.set(0, 3.4, -22.7); this.scene.add(t2);
    const t3 = textSprite('دفتر مدیر', { height: 0.5, bg: '#5b1f1f' });
    t3.position.set(19, 3.4, -22.7); this.scene.add(t3);
  }

  _desk(x, z, parent) {
    this.box(1.1, 0.08, 0.7, this.M.deskTop, x, 0.78, z, { parent: parent || this.scene });
    this.box(1.0, 0.72, 0.6, this.M.desk, x, 0.38, z, { parent: parent || this.scene, collider: true });
    this.box(0.45, 0.45, 0.45, this.M.woodDark, x, 0.24, z + 0.75, { parent: parent || this.scene });
  }

  _classroom(cx, label) {
    // میزهای دانش‌آموزی: ۲ ردیف × ۳ ستون
    for (const dz of [-30, -28]) {
      for (const dx of [-3.2, 0, 3.2]) this._desk(cx + dx, dz);
    }
    // میز معلم + تخته
    this.box(1.8, 0.1, 0.9, this.M.deskTop, cx, 0.8, -31.8);
    this.box(1.7, 0.75, 0.8, this.M.wood, cx, 0.38, -31.8, { collider: true });
    const board = new THREE.Mesh(geoBox(4.4, 1.5, 0.12), this.M.board);
    board.position.set(cx, 2.1, -33.65);
    this.scene.add(board);
    this.box(4.4, 0.08, 0.3, this.M.woodDark, cx, 1.3, -33.5);
    // قفسه کتاب کلاس A (محل کتاب‌های مأموریت)
    if (label === 'A') {
      this.box(0.6, 2.0, 4.2, this.M.shelf, -29.2, 1.0, -28, { collider: true });
    } else {
      // کره جغرافیا روی میز کلاس B
      const gl = new THREE.Mesh(geoSph(0.3, 10, 8), new THREE.MeshLambertMaterial({ color: 0x3b82f6 }));
      gl.position.set(cx + 1.2, 1.1, -31.8);
      this.scene.add(gl);
    }
  }

  _office() {
    // دفتر مدیر: x[10,28] z[-33,-23]
    this.plane(6, 4, this.M.rugB, 19, 0.045, -28);
    this.box(2.4, 0.12, 1.2, this.M.deskTop, 19, 0.82, -30);
    this.box(2.2, 0.76, 1.0, this.M.wood, 19, 0.4, -30, { collider: true });
    this.box(0.6, 1.0, 0.6, this.M.woodDark, 19, 0.5, -31.2);
    this.box(0.7, 2.2, 3.4, this.M.shelf, 27.3, 1.1, -28, { collider: true });
    // گلدان
    const pot = new THREE.Mesh(geoCyl(0.3, 0.24, 0.5, 8), this.M.roof);
    pot.position.set(11, 0.25, -32.2); pot.castShadow = true; this.scene.add(pot);
    const pl = new THREE.Mesh(geoSph(0.45, 8, 6), this.M.bush);
    pl.position.set(11, 0.85, -32.2); pl.castShadow = true; this.scene.add(pl);
    const t = textSprite('خانم رضایی — مدیر مدرسه', { height: 0.45, bg: '#5b1f1f' });
    t.position.set(19, 2.6, -32.8); this.scene.add(t);
  }

  /* ---------------- مرحله ۴: سالن ورزشی + کتابخانه ---------------- */
  _buildGymLibrary() {
    // --- سالن ورزشی: x[-60,-38] z[8,26] ---
    const H = 6;
    this.wallX(-38, 8, 26, H, this.M.gym, { gaps: [{ a: 15, b: 19 }], mapColor: '#7fb6d9' });
    this.wallX(-60, 8, 26, H, this.M.gym, { mapColor: '#7fb6d9' });
    this.wallZ(8, -60, -38, H, this.M.gym, { mapColor: '#7fb6d9' });
    this.wallZ(26, -60, -38, H, this.M.gym, { mapColor: '#7fb6d9' });
    this.mapRects.push({ x1: -60, z1: 8, x2: -38, z2: 26, c: '#7fb6d9' });
    this.mapLabels.push({ x: -49, z: 17, t: 'سالن ورزشی' });
    this.box(23, 0.6, 19, this.M.metal, -49, H + 0.3, 17);
    this.plane(21.4, 17.4, this.M.wood, -49, 0.03, 17);
    // تشک‌ها
    const mats = [this.M.mat1, this.M.mat2, this.M.mat3, this.M.mat4];
    mats.forEach((m, i) => {
      this.box(2.2, 0.15, 3.2, m, -54 + (i % 2) * 3, 0.1, 12 + Math.floor(i / 2) * 4);
    });
    // حلقه بسکتبال
    this.box(0.25, 4.5, 0.25, this.M.darkMetal, -58.5, 2.25, 17);
    this.box(0.1, 1.1, 1.7, this.M.white, -58.2, 3.8, 17);
    const rim = new THREE.Mesh(geoTorus(0.35, 0.05, 6, 14), this.M.mat2);
    rim.rotation.x = Math.PI / 2;
    rim.position.set(-57.7, 3.4, 17);
    this.scene.add(rim);
    this.box(2.4, 0.12, 0.7, this.M.ceilLamp, -49, H - 0.2, 17, { cast: false });
    this.gymLight = new THREE.PointLight(0xeaf4ff, 20, 34, 1.8);
    this.gymLight.position.set(-49, 5, 17);
    this.scene.add(this.gymLight);
    const tg = textSprite('سالن ورزشی', { height: 0.7, bg: '#1f4e5f' });
    tg.position.set(-37.4, 4.6, 17); tg.rotation.y = Math.PI / 2; this.scene.add(tg);

    // --- کتابخانه: x[34,52] z[-36,-24] ---
    const H2 = 4.5;
    this.wallX(34, -36, -24, H2, this.M.lib, { gaps: [{ a: -32, b: -29 }] });
    this.wallX(52, -36, -24, H2, this.M.lib);
    this.wallZ(-36, 34, 52, H2, this.M.lib);
    this.wallZ(-24, 34, 52, H2, this.M.lib);
    this.mapRects.push({ x1: 34, z1: -36, x2: 52, z2: -24, c: '#a8d5a2' });
    this.mapLabels.push({ x: 43, z: -30, t: 'کتابخانه' });
    this.box(19, 0.5, 13, this.M.roof, 43, H2 + 0.25, -30);
    this.plane(17.4, 11.4, this.M.floor, 43, 0.03, -30);
    const ceil = new THREE.Mesh(geoPlane(17.4, 11.4), this.M.ceil);
    ceil.rotation.x = Math.PI / 2; ceil.position.set(43, H2 - 0.05, -30);
    this.scene.add(ceil);
    // قفسه‌ها
    for (const z of [-34, -31, -28]) {
      this.box(5.5, 2.1, 0.8, this.M.shelf, 39.5, 1.05, z, { collider: true });
    }
    // میز کتابدار
    this.box(2.2, 0.1, 1.0, this.M.deskTop, 48.5, 0.8, -30.5);
    this.box(2.0, 0.75, 0.9, this.M.wood, 48.5, 0.38, -30.5, { collider: true });
    this.box(2.2, 0.12, 0.7, this.M.ceilLamp, 43, H2 - 0.15, -30, { cast: false });
    this.libLight = new THREE.PointLight(0xffe9bf, 16, 26, 1.8);
    this.libLight.position.set(43, 3.6, -30);
    this.scene.add(this.libLight);
    const tl = textSprite('کتابخانه', { height: 0.7, bg: '#274e13' });
    tl.position.set(33.4, 3.6, -30.5); tl.rotation.y = -Math.PI / 2; this.scene.add(tl);
  }

  /* ---------------- مرحله ۵: بوفه + زمین فوتبال ---------------- */
  _buildKioskField() {
    // --- بوفه: (-16, 11.5) ---
    const kx = -16, kz = 11.5;
    this.box(5.5, 1.05, 1.0, this.M.wood, kx, 0.55, kz + 0.6, { collider: true });
    this.box(5.7, 0.12, 1.2, this.M.deskTop, kx, 1.14, kz + 0.6);
    for (const [px, pz] of [[-2.5, -1.6], [2.5, -1.6], [-2.5, 1.6], [2.5, 1.6]]) {
      this.box(0.18, 2.9, 0.18, this.M.woodDark, kx + px, 1.45, kz + pz);
    }
    this.box(6.4, 0.25, 4.4, this.M.roof, kx, 3.0, kz);
    this.box(1.0, 0.7, 1.0, this.M.desk, kx - 3.2, 0.35, kz + 0.5);
    this.box(0.8, 0.55, 0.8, this.M.desk, kx - 3.1, 0.95, kz + 0.5);
    const menu = textSprite('بوفه مدرسه — ساندویچ و آبمیوه', { height: 0.55, bg: '#7a2e2e' });
    menu.position.set(kx, 2.5, kz + 1.62);
    this.scene.add(menu);
    this.mapRects.push({ x1: kx - 3, z1: kz - 2, x2: kx + 3, z2: kz + 2, c: '#c96f4a' });
    this.mapLabels.push({ x: kx, z: kz, t: 'بوفه' });

    // --- زمین فوتبال: x[22,66] z[9,35] ---
    this.plane(44, 26, this.M.field, 44, 0.02, 22);
    this.mapRects.push({ x1: 22, z1: 9, x2: 66, z2: 35, c: '#4e8c3e' });
    this.mapLabels.push({ x: 44, z: 22, t: 'زمین فوتبال' });
    const lw = 0.3, ly = 0.035;
    const line = (w, d, x, z) => {
      const m = new THREE.Mesh(geoBox(w, 0.02, d), this.M.lineWhite);
      m.position.set(x, ly, z); m.receiveShadow = true; this.scene.add(m);
    };
    line(43, lw, 44, 9.5); line(43, lw, 44, 34.5);
    line(lw, 25, 22.5, 22); line(lw, 25, 65.5, 22);
    line(lw, 25, 44, 22);
    const ring = new THREE.Mesh(geoRing(2.8, 3.1, 28), this.M.lineWhite);
    ring.rotation.x = -Math.PI / 2; ring.position.set(44, ly, 22);
    this.scene.add(ring);

    // دروازه‌ها
    this._goal(22.5, 22, 1);
    this._goal(65.5, 22, -1);

    // توپ
    const ball = new THREE.Mesh(geoSph(0.35, 14, 10), this.M.ball);
    ball.castShadow = true;
    ball.position.set(44, 0.35, 22);
    this.scene.add(ball);
    this.ballMesh = ball;
    this.ballVel = new THREE.Vector3();
    this.ballHome = { x: 44, z: 22 };
    this.posts = [
      { x: 22.5, z: 19.5 }, { x: 22.5, z: 24.5 },
      { x: 65.5, z: 19.5 }, { x: 65.5, z: 24.5 },
    ];
  }

  _goal(x, z, dir) {
    const postMat = this.M.white;
    const mkPost = (px, pz) => {
      const p = new THREE.Mesh(geoCyl(0.09, 0.09, 2.6, 8), postMat);
      p.position.set(px, 1.3, pz); p.castShadow = true; this.scene.add(p);
    };
    mkPost(x, z - 2.5); mkPost(x, z + 2.5);
    const bar = new THREE.Mesh(geoCyl(0.09, 0.09, 5.2, 8), postMat);
    bar.rotation.x = Math.PI / 2;
    bar.position.set(x, 2.6, z); bar.castShadow = true;
    this.scene.add(bar);
    const net = new THREE.Mesh(geoPlane(5.2, 2.6), this.M.net);
    net.position.set(x - dir * 1.1, 1.3, z);
    net.rotation.y = Math.PI / 2;
    this.scene.add(net);
    const top = new THREE.Mesh(geoPlane(1.2, 5.2), this.M.net);
    top.rotation.x = -Math.PI / 2; top.rotation.z = Math.PI / 2;
    top.position.set(x - dir * 0.55, 2.6, z);
    this.scene.add(top);
    this.addCollider(x - 0.3, z - 2.8, x + 0.3, z - 2.2);
    this.addCollider(x - 0.3, z + 2.2, x + 0.3, z + 2.8);
  }

  /* ---------------- مرحله ۶: پارکینگ + مبلمان محوطه ---------------- */
  _buildParkingProps() {
    // پارکینگ: x[-58,-34] z[38,52]
    this.plane(24, 14, this.M.park, -46, 0.015, 45);
    this.mapRects.push({ x1: -58, z1: 38, x2: -34, z2: 52, c: '#454a52' });
    this.mapLabels.push({ x: -46, z: 45, t: 'پارکینگ' });
    for (let i = 0; i < 6; i++) {
      const x = -55 + i * 4;
      const m = new THREE.Mesh(geoBox(0.25, 0.02, 6), this.M.lineWhite);
      m.position.set(x, 0.03, 44); this.scene.add(m);
    }
    const ps = textSprite('پارکینگ', { height: 0.7, bg: '#333a45' });
    ps.position.set(-46, 2.4, 51.4); this.scene.add(ps);
    this.box(0.15, 2.4, 0.15, this.M.darkMetal, -46, 1.2, 51.4);

    // فواره وسط حیاط
    const fx = LOC.fountain.x, fz = LOC.fountain.z;
    const base = new THREE.Mesh(geoCyl(3, 3.2, 0.75, 18), this.M.stone);
    base.position.set(fx, 0.37, fz); base.castShadow = base.receiveShadow = true;
    this.scene.add(base);
    this.fountainWater = new THREE.Mesh(geoCyl(2.7, 2.7, 0.15, 18), this.M.water);
    this.fountainWater.position.set(fx, 0.72, fz);
    this.scene.add(this.fountainWater);
    const col = new THREE.Mesh(geoCyl(0.35, 0.5, 1.8, 10), this.M.stone);
    col.position.set(fx, 1.4, fz); col.castShadow = true; this.scene.add(col);
    const top = new THREE.Mesh(geoCyl(1.0, 0.8, 0.25, 12), this.M.stone);
    top.position.set(fx, 2.4, fz); top.castShadow = true; this.scene.add(top);
    this.addCollider(fx - 3.2, fz - 3.2, fx + 3.2, fz + 3.2);
    this.mapRects.push({ x1: fx - 3, z1: fz - 3, x2: fx + 3, z2: fz + 3, c: '#4fb3e8' });

    // نیمکت‌ها
    const benches = [
      [-9, -6, 0], [9, -6, 0], [-9, 14, Math.PI], [9, 14, Math.PI],
      [-20, 2, Math.PI / 2], [20, 2, -Math.PI / 2], [-20, 20, Math.PI / 2], [20, 20, -Math.PI / 2],
      [18, 12, 0], [44, 38.5, Math.PI], [-52, -36, 0.6], [-38, 50, Math.PI],
    ];
    for (const [x, z, ry] of benches) this._bench(x, z, ry);

    // سطل‌های زباله
    this.bins = [[10, 14], [-10, -2], [20, 24], [-52, 40], [-40, 15], [32, -27]];
    for (const [x, z] of this.bins) {
      const b = new THREE.Mesh(geoCyl(0.4, 0.34, 0.9, 10), new THREE.MeshLambertMaterial({ color: 0x2e7d4f }));
      b.position.set(x, 0.45, z); b.castShadow = true; this.scene.add(b);
      this.addCollider(x - 0.4, z - 0.4, x + 0.4, z + 0.4);
    }

    // چراغ‌ها
    const lampPos = [
      [-12, -6], [12, -6], [-12, 20], [12, 20],
      [-46, 48], [6, 52], [18, 22], [-40, -33], [32, -27], [-36, 44],
    ];
    for (const [x, z] of lampPos) this._lamp(x, z);

    // نورهای محوطه (شب)
    this.yardLight = new THREE.PointLight(0xffe2a8, 26, 34, 1.8);
    this.yardLight.position.set(0, 5.5, 4);
    this.scene.add(this.yardLight);
    this.parkLight = new THREE.PointLight(0xd8e8ff, 22, 30, 1.8);
    this.parkLight.position.set(-46, 5.5, 45);
    this.scene.add(this.parkLight);
    this.fieldLight = new THREE.PointLight(0xeaf4ff, 24, 36, 1.8);
    this.fieldLight.position.set(44, 6.5, 22);
    this.scene.add(this.fieldLight);
    this.outdoorLights = [this.yardLight, this.parkLight, this.fieldLight];
  }

  _bench(x, z, ry) {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    const seat = new THREE.Mesh(geoBox(2.2, 0.12, 0.6), this.M.bench);
    seat.position.y = 0.55; seat.castShadow = true; g.add(seat);
    const back = new THREE.Mesh(geoBox(2.2, 0.55, 0.1), this.M.bench);
    back.position.set(0, 0.9, -0.3); back.castShadow = true; g.add(back);
    for (const sx of [-0.9, 0.9]) {
      const leg = new THREE.Mesh(geoBox(0.12, 0.55, 0.55), this.M.benchIron);
      leg.position.set(sx, 0.27, 0); g.add(leg);
    }
    this.scene.add(g);
    const alongX = Math.abs(Math.sin(ry)) < 0.5;
    if (alongX) this.addCollider(x - 1.2, z - 0.45, x + 1.2, z + 0.45);
    else this.addCollider(x - 0.45, z - 1.2, x + 0.45, z + 1.2);
  }

  _lamp(x, z) {
    const pole = new THREE.Mesh(geoCyl(0.09, 0.13, 4.6, 8), this.M.lampPost);
    pole.position.set(x, 2.3, z); pole.castShadow = true; this.scene.add(pole);
    const bulb = new THREE.Mesh(geoSph(0.28, 10, 8), this.M.lampBulb);
    bulb.position.set(x, 4.75, z); this.scene.add(bulb);
    const cap = new THREE.Mesh(geoCone(0.45, 0.35, 8), this.M.lampPost);
    cap.position.set(x, 5.05, z); this.scene.add(cap);
    this.addCollider(x - 0.2, z - 0.2, x + 0.2, z + 0.2);
    this.lamps.push({ x, z });
  }

  /* ---------------- مرحله ۷: طبیعت ---------------- */
  _buildNature() {
    // باغ مخفی: حلقه درخت + محوطه
    this.mapRects.push({ x1: -62, z1: -44, x2: -46, z2: -36, c: '#2e6b34' });
    this.mapLabels.push({ x: -54, z: -40, t: '؟؟؟' });
    // سنگ‌چین باغ
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const sx = -54 + Math.cos(a) * 3.4, sz = -40 + Math.sin(a) * 3.4;
      const st = new THREE.Mesh(geoCyl(0.35, 0.45, 0.5, 7), this.M.stone);
      st.position.set(sx, 0.25, sz); st.castShadow = true; this.scene.add(st);
    }
    // نشان‌گر درخشان باغ مخفی
    const ringM = new THREE.Mesh(geoTorus(1.1, 0.12, 8, 24), this.M.marker);
    ringM.rotation.x = Math.PI / 2;
    ringM.position.set(-54, 0.15, -40);
    this.scene.add(ringM);
    this.secretRing = ringM;
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 7, 12, 1, true), this.M.beam);
    beam.position.set(-54, 3.5, -40);
    this.scene.add(beam);
    this.secretBeam = beam;
    this.secretZone = { x1: -59, z1: -43.5, x2: -49, z2: -36.5 };

    // ---- درخت‌ها (Instanced: تنه + تاج) ----
    const spots = [];
    const blocked = [
      { x1: -32, z1: -36, x2: 32, z2: -18 },     // مدرسه
      { x1: -62, z1: 6, x2: -36, z2: 28 },       // سالن
      { x1: 32, z1: -38, x2: 54, z2: -22 },      // کتابخانه
      { x1: 20, z1: 7, x2: 68, z2: 37 },         // زمین فوتبال
      { x1: -60, z1: 36, x2: -32, z2: 54 },      // پارکینگ
      { x1: -28, z1: -19, x2: 28, z2: 31 },      // سنگفرش حیاط
      { x1: -22, z1: 6, x2: -10, z2: 17 },       // بوفه
      { x1: -102, z1: 56, x2: 102, z2: 68 },     // خیابان جنوب
      { x1: -80, z1: -64, x2: -68, z2: 72 },     // خیابان غرب
      { x1: -77, z1: -60, x2: 77, z2: -48 },     // خیابان شمال
      { x1: -63, z1: -45, x2: -45, z2: -35 },    // داخل باغ مخفی
      { x1: -110, z1: -118, x2: 110, z2: -56 },  // پیست مسابقه
      { x1: -110, z1: 58, x2: 116, z2: 106 },    // شهر و پارک شهر
      { x1: 70, z1: -38, x2: 108, z2: -2 },      // استخر
      { x1: 30, z1: -22, x2: 58, z2: 2 },        // آزمایشگاه
      { x1: 76, z1: 56, x2: 114, z2: 94 },       // پارک اسکیت
      { x1: -108, z1: -34, x2: -74, z2: 34 },    // خوابگاه و غذاخوری
      { x1: -6, z1: 57, x2: 6, z2: 82 },         // مسیر ورودی شهر
      { x1: -74, z1: -36, x2: -62, z2: 26 },     // مسیر خوابگاه
      { x1: 62, z1: -36, x2: 76, z2: 0 },        // مسیر استخر
    ];
    const isBlocked = (x, z, m = 1.5) => blocked.some((r) => x > r.x1 - m && x < r.x2 + m && z > r.z1 - m && z < r.z2 + m);

    // ردیف خیابان جنوب
    for (let x = -84; x <= 84; x += 12) {
      if (Math.abs(x) < 9) continue;
      spots.push([x + rand(-1, 1), 71]);
    }
    // ردیف خیابان غرب
    for (let z = -44; z <= 60; z += 13) spots.push([-82, z + rand(-1, 1)]);
    // حلقه باغ مخفی
    for (let i = 0; i < 15; i++) {
      const a = (i / 15) * Math.PI * 2 + rand(-0.1, 0.1);
      const r = 9 + rand(0, 3);
      spots.push([-54 + Math.cos(a) * r, -40 + Math.sin(a) * r * 0.8]);
    }
    // پشت سالن (مسیر کوله‌پشتی)
    spots.push([-63.5, 9], [-62.5, 13], [-63.5, 22], [-62, 25.5]);
    // گوشه‌های حیاط
    spots.push([-25, -13], [25, -13], [-25.5, 28], [25.5, 28], [-31, 6], [31, -8], [-31, 34], [18, 33.5]);
    // دور زمین فوتبال
    spots.push([18, 4], [70, 5], [70, 39], [18, 40], [44, 3.5]);
    // پراکنده بیرون محوطه
    let tries = 0;
    while (spots.length < 110 && tries++ < 600) {
      const x = rand(-124, 124), z = rand(-124, 124);
      if (Math.abs(x) < 68 && z > -48 && z < 58) continue; // داخل محوطه نه
      if (isBlocked(x, z, 4)) continue;
      let nearHouse = false;
      for (const h of this._houseSpots || []) {
        if (dist2D(x, z, h[0], h[1]) < 8) { nearHouse = true; break; }
      }
      if (nearHouse) continue;
      spots.push([x, z]);
    }

    const n = spots.length;
    const trunkGeo = geoCyl(0.16, 0.3, 2.4, 6);
    const crownGeo = geoSph(1.7, 8, 6);
    this.treeTrunks = new THREE.InstancedMesh(trunkGeo, this.M.trunk, n);
    this.treeCrowns = new THREE.InstancedMesh(crownGeo, this.M.leaf, n);
    this.treeTrunks.castShadow = this.treeCrowns.castShadow = true;
    this.treeCrowns.receiveShadow = true;
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pv = new THREE.Vector3();
    const col = new THREE.Color();
    spots.forEach((sp, i) => {
      const sc = rand(0.8, 1.35);
      const sway = rand(0, Math.PI * 2);
      q.setFromEuler(new THREE.Euler(0, sway, 0));
      s.set(sc, sc, sc);
      pv.set(sp[0], 1.2 * sc, sp[1]);
      m4.compose(pv, q, s); this.treeTrunks.setMatrixAt(i, m4);
      pv.set(sp[0], (2.4 + 1.1) * sc, sp[1]);
      m4.compose(pv, q, s); this.treeCrowns.setMatrixAt(i, m4);
      col.setHSL(0.29 + Math.random() * 0.06, 0.55, 0.32 + Math.random() * 0.12);
      this.treeCrowns.setColorAt(i, col);
      if (Math.abs(sp[0]) < BOUNDS && Math.abs(sp[1]) < BOUNDS) {
        this.addCollider(sp[0] - 0.35, sp[1] - 0.35, sp[0] + 0.35, sp[1] + 0.35);
      }
    });
    this.treeTrunks.instanceMatrix.needsUpdate = true;
    this.treeCrowns.instanceMatrix.needsUpdate = true;
    if (this.treeCrowns.instanceColor) this.treeCrowns.instanceColor.needsUpdate = true;
    this.treeTrunks.computeBoundingSphere();
    this.treeCrowns.computeBoundingSphere();
    this.scene.add(this.treeTrunks);
    this.scene.add(this.treeCrowns);
    this.treeFullCount = n;

    // ---- علف‌ها (Instanced، کیفیت‌پذیر) ----
    const gCount = 450;
    const tuft = geoCone(0.14, 0.42, 4);
    this.grassMesh = new THREE.InstancedMesh(tuft, new THREE.MeshLambertMaterial({ color: 0x5d9840 }), gCount);
    let gi = 0; tries = 0;
    const noGrass = blocked.concat([
      { x1: -100, z1: 56, x2: 100, z2: 68 }, { x1: -80, z1: -64, x2: -68, z2: 72 },
    ]);
    while (gi < gCount && tries++ < 3000) {
      const x = rand(-95, 95), z = rand(-90, 90);
      if (noGrass.some((r) => x > r.x1 && x < r.x2 && z > r.z1 && z < r.z2)) continue;
      q.setFromEuler(new THREE.Euler(0, rand(0, 6), 0));
      const sc = rand(0.7, 1.4);
      s.set(sc, sc, sc); pv.set(x, 0.2, z);
      m4.compose(pv, q, s); this.grassMesh.setMatrixAt(gi, m4);
      gi++;
    }
    this.grassMesh.count = gi;
    this.grassFullCount = gi;
    this.grassMesh.instanceMatrix.needsUpdate = true;
    this.grassMesh.computeBoundingSphere();
    this.scene.add(this.grassMesh);

    // بوته‌ها
    for (let i = 0; i < 16; i++) {
      const x = rand(-60, 60), z = rand(-40, 52);
      if (isBlocked(x, z, 1)) continue;
      const b = new THREE.Mesh(geoSph(rand(0.5, 0.9), 7, 5), this.M.bush);
      b.position.set(x, 0.4, z); b.scale.y = 0.7; b.castShadow = true;
      this.scene.add(b);
    }
  }

  /* ---------------- مرحله ۸: بیرون مدرسه ---------------- */
  _buildOutside() {
    this._houseSpots = [
      [-118, 10], [-118, 52], [-118, 96], [118, -10], [118, 40], [118, 96],
      [-70, 116], [0, 118], [70, 116],
    ];
    this._houseSpots.forEach(([x, z], i) => {
      const w = rand(9, 13), d = rand(7, 10), h = rand(3.5, 6);
      const tex = this.houseTexs[i % this.houseTexs.length];
      const wall = new THREE.MeshLambertMaterial({ map: tex });
      this.box(w, h, d, wall, x, h / 2, z, { collider: true });
      const roof = new THREE.Mesh(geoCone(Math.max(w, d) * 0.72, 2.4, 4), this.M.roof);
      roof.position.set(x, h + 1.2, z);
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      this.scene.add(roof);
      this.box(1.4, 2.2, 0.2, this.M.door, x, 1.1, z + d / 2 + 0.05);
      this.mapRects.push({ x1: x - w / 2, z1: z - d / 2, x2: x + w / 2, z2: z + d / 2, c: '#9a938a' });
    });
    this.mapLabels.push({ x: -24, z: 112, t: 'شهر آفتاب' });

    // تپه‌های دوردست (افق)
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const r = 178 + rand(0, 30);
      const hill = new THREE.Mesh(geoSph(rand(30, 48), 10, 7), this.M.hill);
      hill.position.set(Math.cos(a) * r, -6, Math.sin(a) * r);
      hill.scale.y = 0.35;
      this.scene.add(hill);
    }
  }

  /* ---------------- مرحله ۹: آیتم‌ها + آسمان ---------------- */
  _mkPickup(id, kind, mesh, x, y, z, prompt) {
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    this.scene.add(mesh);
    this.pickups[id] = { kind, mesh, x, y, z, taken: false, phase: rand(0, 6) };
    this.addInteractable({
      id, x, z, r: 2.0,
      prompt,
      action: () => this._takePickup(id),
      enabled: () => !this.pickups[id].taken,
    });
  }

  _takePickup(id) {
    const p = this.pickups[id];
    if (!p || p.taken) return;
    p.taken = true;
    p.mesh.visible = false;
    if (this.pickupHandler) this.pickupHandler(p.kind, id);
  }

  _buildPickupsSky() {
    // قوطی‌های بازیافت (۸ عدد)
    const canPos = [
      [10.8, 14.5], [-9, -1], [31, 23], [-51, 41],
      [-39, 16], [33, -27], [-20, 30], [60, 30],
    ];
    canPos.forEach(([x, z], i) => {
      const m = new THREE.Mesh(geoCyl(0.09, 0.09, 0.26, 8), this.M.can);
      this._mkPickup('can' + i, 'can', m, x, 0.35, z, 'برداشتن قوطی');
    });
    // کتاب‌های کلاس A (۳ عدد روی قفسه)
    const bookMats = [this.M.bookR, this.M.bookB, this.M.bookG];
    [[-28.8, -29.2], [-28.8, -28], [-28.8, -26.8]].forEach(([x, z], i) => {
      const m = new THREE.Mesh(geoBox(0.35, 0.5, 0.14), bookMats[i]);
      this._mkPickup('book' + i, 'book', m, x, 1.45, z, 'برداشتن کتاب');
    });
    // کوله‌پشتی گمشده پشت سالن
    const bag = new THREE.Group();
    const bb = new THREE.Mesh(geoBox(0.55, 0.7, 0.35), this.M.bag);
    bb.castShadow = true; bag.add(bb);
    const pocket = new THREE.Mesh(geoBox(0.4, 0.35, 0.12), this.M.woodDark);
    pocket.position.set(0, -0.1, 0.22); bag.add(pocket);
    this._mkPickup('bag0', 'bag', bag, -62, 0.5, 17, 'برداشتن کوله‌پشتی');

    // سکه‌ها (۱۰ عدد، با راه رفتن روی آن جمع می‌شوند)
    const coinPos = [
      [3, 30], [-8, 20], [16, -8], [26, 10], [40, 30],
      [52, 16], [-30, 34], [-20, -30.5], [12, -40], [60, 50],
    ];
    const coinGeo = geoTorus(0.24, 0.1, 8, 14);
    coinPos.forEach(([x, z], i) => {
      const m = new THREE.Mesh(coinGeo, this.M.coin);
      m.position.set(x, 0.7, z);
      m.castShadow = true;
      this.scene.add(m);
      this.coins.push({ mesh: m, x, z, taken: false, phase: rand(0, 6) });
    });

    // گنبد آسمان + خورشید + ماه
    this.skyDome = new THREE.Mesh(
      geoSph(380, 20, 12),
      new THREE.MeshBasicMaterial({ color: 0x8ec9ee, side: THREE.BackSide, fog: false, depthWrite: false })
    );
    this.skyDome.renderOrder = -10;
    this.scene.add(this.skyDome);
    const glowTex = canvasTexture(128, 128, (ctx, w, h) => {
      const g = ctx.createRadialGradient(64, 64, 4, 64, 64, 62);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.35, 'rgba(255,244,200,1)');
      g.addColorStop(1, 'rgba(255,244,200,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    });
    this.sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, fog: false, depthWrite: false }));
    this.sunSprite.scale.set(60, 60, 1);
    this.scene.add(this.sunSprite);
    const moonTex = canvasTexture(128, 128, (ctx) => {
      ctx.fillStyle = '#e8ecf5';
      ctx.beginPath(); ctx.arc(64, 64, 30, 0, 7); ctx.fill();
      ctx.fillStyle = '#c6ccdb';
      ctx.beginPath(); ctx.arc(54, 56, 7, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(72, 72, 5, 0, 7); ctx.fill();
    });
    this.moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false }));
    this.moonSprite.scale.set(26, 26, 1);
    this.scene.add(this.moonSprite);

    // ابرها
    for (let i = 0; i < 8; i++) {
      const g = new THREE.Group();
      const puffs = randInt(2, 3);
      for (let k = 0; k < puffs; k++) {
        const s = new THREE.Mesh(geoSph(rand(2.5, 4.5), 8, 6), this.M.cloud);
        s.position.set(k * rand(3, 4.5), rand(-0.5, 0.8), rand(-1.5, 1.5));
        s.scale.y = 0.55;
        g.add(s);
      }
      g.position.set(rand(-110, 110), rand(42, 58), rand(-100, 100));
      g.userData.speed = rand(0.6, 1.4);
      this.scene.add(g);
      this.clouds.push(g);
    }
  }

  /* ============================================================
     به‌روزرسانی هر فریم
     env: {px, pz, kicker:{x,z,dx,dz,power}|null}
     ============================================================ */
  update(dt, env) {
    this.time += dt;

    // ابرها
    for (const c of this.clouds) {
      if (!c.visible) continue;
      c.position.x += c.userData.speed * dt;
      if (c.position.x > 125) c.position.x = -125;
    }
    // فواره
    this._fountainT -= dt;
    if (this._fountainT <= 0 && this.sparkles) {
      this._fountainT = 0.28;
      const dx = dist2D(env.px, env.pz, LOC.fountain.x, LOC.fountain.z);
      if (dx < 60) this.sparkles.spawn(LOC.fountain.x, 2.5, LOC.fountain.z, 0x9fdcff, 2, { spread: 1.4, up: 1.2, life: 0.7, grav: 6 });
    }
    // آب فواره
    if (this.fountainWater) {
      this.fountainWater.rotation.y += dt * 0.4;
    }
    // نشان باغ مخفی
    if (this.secretRing) {
      const s = 1 + Math.sin(this.time * 3) * 0.12;
      this.secretRing.scale.set(s, s, 1);
      this.secretBeam.rotation.y += dt * 0.6;
    }
    // آیتم‌ها: چرخش و شناور شدن
    for (const id in this.pickups) {
      const p = this.pickups[id];
      if (p.taken) continue;
      const d = dist2D(env.px, env.pz, p.x, p.z);
      if (d > 55) continue;
      p.mesh.rotation.y += dt * 1.6;
      p.mesh.position.y = p.y + Math.sin(this.time * 2.2 + p.phase) * 0.12;
    }
    // سکه‌ها
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (c.taken) continue;
      c.mesh.rotation.y += dt * 2.4;
      c.mesh.position.y = 0.7 + Math.sin(this.time * 2.5 + c.phase) * 0.1;
      if (dist2D(env.px, env.pz, c.x, c.z) < 1.4) {
        c.taken = true;
        c.mesh.visible = false;
        if (this.sparkles) this.sparkles.spawn(c.x, 1, c.z, 0xffd34d, 10, { spread: 1.6, up: 3, life: 0.7 });
        if (this.onCoin) this.onCoin(i);
      }
    }
    // منطقه باغ مخفی
    if (this.secretZone && this.onSecret) {
      const inside = inRect(env.px, env.pz, this.secretZone);
      if (inside && !this._secretInside) {
        this._secretInside = true;
        this.onSecret();
      } else if (!inside) {
        this._secretInside = false;
      }
    }
    // فیزیک توپ
    this._updateBall(dt, env.kicker);
    // ذرات
    if (this.sparkles) this.sparkles.update(dt);
  }

  kickBall(dx, dz, power) {
    if (this._goalFreeze > 0) return;
    const len = Math.hypot(dx, dz) || 1;
    const p = Math.min(19, power);
    this.ballVel.x = (dx / len) * p;
    this.ballVel.z = (dz / len) * p;
  }

  resetBall() {
    this.ballMesh.position.set(this.ballHome.x, 0.35, this.ballHome.z);
    this.ballVel.set(0, 0, 0);
    this._goalFreeze = 0;
  }

  ballPos() { return this.ballMesh.position; }

  _updateBall(dt, kicker) {
    if (this._goalFreeze > 0) {
      this._goalFreeze -= dt;
      if (this._goalFreeze <= 0) this.resetBall();
      return;
    }
    const b = this.ballMesh.position;
    // شوت توسط بازیکن
    if (kicker) {
      const d = dist2D(kicker.x, kicker.z, b.x, b.z);
      if (d < 1.05) {
        this.kickBall(kicker.dx, kicker.dz, kicker.power);
        if (this.onKick) this.onKick();
      }
    }
    // اصطکاک
    const sp = Math.hypot(this.ballVel.x, this.ballVel.z);
    if (sp > 0.01) {
      const ns = Math.max(0, sp - (3.2 + sp * 0.9) * dt);
      this.ballVel.x *= ns / sp;
      this.ballVel.z *= ns / sp;
      b.x += this.ballVel.x * dt;
      b.z += this.ballVel.z * dt;
      // غلتش
      this.ballMesh.rotation.x += (this.ballVel.z * dt) / 0.35;
      this.ballMesh.rotation.z -= (this.ballVel.x * dt) / 0.35;
    }
    // برخورد با تیرها
    for (const p of this.posts) {
      const dx = b.x - p.x, dz = b.z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < 0.45 && d > 1e-4) {
        const nx = dx / d, nz = dz / d;
        const dot = this.ballVel.x * nx + this.ballVel.z * nz;
        if (dot < 0) {
          this.ballVel.x -= 2 * dot * nx;
          this.ballVel.z -= 2 * dot * nz;
          b.x = p.x + nx * 0.45;
          b.z = p.z + nz * 0.45;
        }
      }
    }
    // مرزهای زمین (دهانه دروازه باز است)
    const inMouth = b.z > 19.4 && b.z < 24.6;
    if (!inMouth) {
      if (b.x < 23.1) { b.x = 23.1; this.ballVel.x = Math.abs(this.ballVel.x) * 0.5; }
      if (b.x > 64.9) { b.x = 64.9; this.ballVel.x = -Math.abs(this.ballVel.x) * 0.5; }
    }
    if (b.z < 9.8) { b.z = 9.8; this.ballVel.z = Math.abs(this.ballVel.z) * 0.5; }
    if (b.z > 34.2) { b.z = 34.2; this.ballVel.z = -Math.abs(this.ballVel.z) * 0.5; }
    // گل؟
    if (inMouth && b.x < 22.1) this._goalScored('west');
    else if (inMouth && b.x > 65.9) this._goalScored('east');
    // ایمنی: توپ گم نشود
    if (Math.abs(b.x - 44) > 40 || Math.abs(b.z - 22) > 30) this.resetBall();
  }

  _goalScored(side) {
    this.ballVel.set(0, 0, 0);
    this._goalFreeze = 2.2;
    const gx = side === 'east' ? 65.5 : 22.5;
    if (this.sparkles) this.sparkles.spawn(gx, 2, 22, 0xffffff, 40, { spread: 3, up: 5, life: 1.2 });
    if (this.onGoal) this.onGoal(side);
  }

  /* ---------------- آسمان و نورپردازی محیطی ---------------- */
  setSky(skyColor, sunDir, night01, day01, sunUp) {
    this.night01 = night01;
    this.day01 = day01;
    if (this.skyDome) this.skyDome.material.color.copy(skyColor);
    if (this.sunSprite) {
      this.sunSprite.position.copy(sunDir).multiplyScalar(330);
      this.sunSprite.material.opacity = sunUp ? 1 : 0;
      this.sunSprite.visible = sunUp;
    }
    if (this.moonSprite) {
      this.moonSprite.position.set(-sunDir.x * 330, Math.max(60, -sunDir.y * 330 + 120), -sunDir.z * 330);
      this.moonSprite.visible = night01 > 0.25;
      this.moonSprite.material.opacity = clamp((night01 - 0.2) * 2, 0, 1);
    }
    if (this.M) {
      this.M.lampBulb.emissiveIntensity = 0.15 + night01 * 2.2;
      this.M.cloud.opacity = 0.15 + day01 * 0.8;
    }
  }

  setOutdoorLights(on, night01) {
    if (!this.outdoorLights) return;
    for (const l of this.outdoorLights) {
      l.intensity = on ? night01 * 26 : 0;
    }
  }

  /* ---------------- کیفیت گرافیک ---------------- */
  setQuality(q) {
    if (this.treeTrunks) {
      const f = q === 'low' ? 0.55 : 1;
      const n = Math.floor(this.treeFullCount * f);
      this.treeTrunks.count = n;
      this.treeCrowns.count = n;
    }
    if (this.grassMesh) {
      if (q === 'low') { this.grassMesh.visible = false; }
      else {
        this.grassMesh.visible = true;
        this.grassMesh.count = q === 'medium' ? Math.floor(this.grassFullCount * 0.55) : this.grassFullCount;
      }
    }
    if (this.clouds) {
      this.clouds.forEach((c, i) => { c.visible = q === 'low' ? i < 3 : q === 'medium' ? i < 6 : true; });
    }
    this.quality = q;
  }

  /* ---------------- داده نقشه ---------------- */
  getMapData() {
    return { rects: this.mapRects, labels: this.mapLabels, paths: this.mapPaths || [], bounds: BOUNDS };
  }

  /** بازگردانی آیتم‌ها برای ذخیره */
  setTaken(kind, ids) {
    if (kind === 'coin') {
      ids.forEach((i) => { if (this.coins[i]) { this.coins[i].taken = true; this.coins[i].mesh.visible = false; } });
      return;
    }
    ids.forEach((id) => {
      const p = this.pickups[id];
      if (p) { p.taken = true; p.mesh.visible = false; }
    });
  }
}

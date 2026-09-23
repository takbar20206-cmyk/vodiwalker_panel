/* ============================================================
   School Life: Open Campus — world_ext.js
   بسته گسترش دنیا: شهر کوچک، استخر، آزمایشگاه، خوابگاه و
   سالن غذاخوری، پارک اسکیت و پیست مسابقه — همه procedural
   ============================================================ */
import * as THREE from 'three';
import { canvasTexture, geoBox, geoCone, geoCyl, geoPlane, geoSph, geoTorus, matLambert, textSprite } from './gfx.js';
import { makeTextureSet } from './textures.js';
import { rand, randInt, choice, clamp, dist2D, inRect, lerp, lerpAngle } from './utils.js';

/* ---------- نقاط کلیدی که بقیه ماژول‌ها لازم دارند ---------- */
export const EXT = {
  city: { streetZ: 84, x1: -110, x2: 110 },
  shops: [
    { id: 'super',  name: 'سوپرمارکت آفتاب', x: -70, z: 96, kind: 'super' },
    { id: 'pizza',  name: 'پیتزافروشی آفتاب', x: -46, z: 96, kind: 'pizza' },
    { id: 'ice',    name: 'بستنی‌فروشی',      x: -22, z: 96, kind: 'ice' },
    { id: 'book',   name: 'کتاب‌فروشی شهر',   x: 2,   z: 96, kind: 'book' },
    { id: 'toy',    name: 'اسباب‌بازی‌فروشی', x: 26,  z: 96, kind: 'toy' },
    { id: 'clinic', name: 'درمانگاه شهر',     x: 50,  z: 96, kind: 'clinic' },
    { id: 'cafe',   name: 'کافه آفتاب',       x: -88, z: 96, kind: 'cafe' },
  ],
  cafe:      { x: -88, z: 96 },
  bikeShop:  { x: 96,  z: 72 },
  cinema:    { x: 96,  z: 100 },
  park:      { x1: -104, z1: 60, x2: -84, z2: 78 },
  skate:     { x1: 80,  z1: 60, x2: 110, z2: 90,  c: { x: 95, z: 75 } },
  pool:      { x1: 74,  z1: -34, x2: 104, z2: -6, water: { x1: 80, z1: -30, x2: 100, z2: -10 } },
  lab:       { x1: 34,  z1: -18, x2: 54,  z2: -2 },
  dorm:      { x1: -104, z1: 6,   x2: -78, z2: 30 },
  cafeteria: { x1: -104, z1: -30, x2: -80, z2: -6 },
  track:     { cx: 0, cz: -86, width: 11 },
  fastTravel: [
    { id: 'school', name: 'دروازهٔ مدرسه', x: 0, z: 61 },
    { id: 'city',   name: 'ایستگاه شهر',   x: 6, z: 78 },
    { id: 'pool',   name: 'ورودی استخر',   x: 72, z: -20 },
    { id: 'pit',    name: 'پیت پیست',      x: 6, z: -70 },
    { id: 'dorm',   name: 'خوابگاه',       x: -76, z: 18 },
  ],
};

/* ============================================================
   ابزارهای مسیر (بدون THREE.Curve — مستقیم و سریع)
   ============================================================ */
function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t, t3 = t2 * t;
  return {
    x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3),
    z: 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * t + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * t2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * t3),
  };
}

function resampleClosed(ctrl, perSeg = 7) {
  const n = ctrl.length;
  const out = [];
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n], p1 = ctrl[i], p2 = ctrl[(i + 1) % n], p3 = ctrl[(i + 2) % n];
    for (let k = 0; k < perSeg; k++) out.push(catmull(p0, p1, p2, p3, k / perSeg));
  }
  return out;
}

/* ============================================================
   ساخت‌کننده اصلی
   ============================================================ */
export async function buildExtension(world, onStep, hooks) {
  const T = makeTextureSet();
  const scene = world.scene;
  const step = async (pct, msg, fn) => { fn(); onStep(pct, msg); await new Promise((r) => setTimeout(r, 8)); };
  const ext = {
    hooks: hooks || {},
    T,
    shops: [],
    fastTravel: EXT.fastTravel,
    ramps: [],
    rails: [],
    hoops: [],
    track: null,
    pool: null,
    beds: [],
    interactPoints: [],
    lights: [],
  };
  world.ext = ext;
  world.mapPaths = world.mapPaths || [];

  /* ---------- متریال‌های مشترک این بسته ---------- */
  const L = matLambert;
  const M = {
    sidewalk: new THREE.MeshLambertMaterial({ map: T.sidewalk }),
    gravel: new THREE.MeshLambertMaterial({ map: T.gravel }),
    brickCream: new THREE.MeshLambertMaterial({ map: T.brickCream }),
    brick: new THREE.MeshLambertMaterial({ map: T.brick }),
    plaster: new THREE.MeshLambertMaterial({ map: T.plaster }),
    plasterBlue: new THREE.MeshLambertMaterial({ map: T.plasterBlue }),
    concrete: new THREE.MeshLambertMaterial({ map: T.concrete }),
    cityWall: new THREE.MeshLambertMaterial({ map: T.cityWall }),
    cityWall2: new THREE.MeshLambertMaterial({ map: T.cityWall2 }),
    glass: new THREE.MeshLambertMaterial({ map: T.mallGlass }),
    roof: new THREE.MeshLambertMaterial({ map: T.roofTile }),
    woodFloor: new THREE.MeshLambertMaterial({ map: T.woodFloor }),
    woodWall: new THREE.MeshLambertMaterial({ map: T.woodWall }),
    marble: new THREE.MeshLambertMaterial({ map: T.marble }),
    labTile: new THREE.MeshLambertMaterial({ map: T.labTile }),
    poolTile: new THREE.MeshLambertMaterial({ map: T.poolTile }),
    poolDeck: new THREE.MeshLambertMaterial({ map: T.poolDeck }),
    dormWall: new THREE.MeshLambertMaterial({ map: T.dormWall }),
    carpetR: new THREE.MeshLambertMaterial({ map: T.carpetRed }),
    carpetB: new THREE.MeshLambertMaterial({ map: T.carpetBlue }),
    graffiti: new THREE.MeshLambertMaterial({ map: T.graffiti }),
    courtB: new THREE.MeshLambertMaterial({ map: T.courtBlue }),
    chalk: new THREE.MeshLambertMaterial({ map: T.chalkboard }),
    notice: new THREE.MeshLambertMaterial({ map: T.notice }),
    poster: new THREE.MeshLambertMaterial({ map: T.poster }),
    water: new THREE.MeshLambertMaterial({ map: T.waterPool, transparent: true, opacity: 0.82, emissive: 0x1a5a80, emissiveIntensity: 0.3 }),
    waterDeep: new THREE.MeshLambertMaterial({ color: 0x2a86b8, transparent: true, opacity: 0.55 }),
    metal: L(0x8b93a0), dark: L(0x33383f), white: L(0xf5f2ea), red: L(0xd9433a),
    yellow: L(0xf2c94c), green: L(0x4aa96c), blue: L(0x3b82f6), orange: L(0xef8a3c),
    neon: new THREE.MeshLambertMaterial({ color: 0xfff2c0, emissive: 0xffd76a, emissiveIntensity: 0.8 }),
    neonPink: new THREE.MeshLambertMaterial({ color: 0xffd9ec, emissive: 0xff5fa2, emissiveIntensity: 0.8 }),
    neonBlue: new THREE.MeshLambertMaterial({ color: 0xd9ecff, emissive: 0x4da3ff, emissiveIntensity: 0.8 }),
  };
  const floorOf = { super: M.marble, pizza: M.courtB, ice: M.poolDeck, book: M.woodFloor, toy: M.carpetR, clinic: M.labTile, cafe: M.woodFloor, bike: M.concrete, cinema: M.carpetB, dorm: M.woodFloor, cafe2: M.woodFloor };
  const signTexture = (text, bg, fg) => textSprite(text, { height: 0.85, bg, fg, size: 46, border: '#fff6d8' });

  /* ---------- کمکی‌ها ---------- */
  function sign(text, x, y, z, opts = {}) {
    const s = textSprite(text, { height: opts.h || 0.8, bg: opts.bg || '#1f4e5f', fg: opts.fg || '#ffffff', size: opts.size || 46 });
    s.position.set(x, y, z);
    if (opts.ry) s.rotation.y = opts.ry;
    scene.add(s);
    return s;
  }

  function shell(o) {
    const { x1, z1, x2, z2, h } = o;
    const mat = o.mat || M.plaster;
    const front = o.front || mat;
    const roofM = o.roof || M.roof;
    const d = o.door || null;
    const gapsFor = (side) => (d && d.side === side ? [{ a: d.a, b: d.b }] : []);
    const dh = d ? (d.h || 3) : 3;
    const mo = o.mapColor ? { mapColor: o.mapColor } : {};
    world.wallZ(z1, x1, x2, h, d && d.side === 'north' ? front : mat, { gaps: gapsFor('north'), doorH: dh, ...mo });
    world.wallZ(z2, x1, x2, h, d && d.side === 'south' ? front : mat, { gaps: gapsFor('south'), doorH: dh, ...mo });
    world.wallX(x1, z1, z2, h, d && d.side === 'west' ? front : mat, { gaps: gapsFor('west'), doorH: dh, ...mo });
    world.wallX(x2, z1, z2, h, d && d.side === 'east' ? front : mat, { gaps: gapsFor('east'), doorH: dh, ...mo });
    const w = x2 - x1, dp = z2 - z1, cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    world.plane(w - 0.4, dp - 0.4, o.floor || M.marble, cx, 0.04, cz);
    world.box(w + 0.8, 0.45, dp + 0.8, roofM, cx, h + 0.22, cz);
    if (o.mapRect !== false) world.mapRects.push({ x1, z1, x2, z2, c: o.mapColor || '#b7b0a3' });
    if (o.label) world.mapLabels.push({ x: cx, z: cz, t: o.label });
    return { cx, cz, w, dp };
  }

  function awning(x, z, w, mat) {
    world.box(w, 0.16, 1.6, mat, x, 3.1, z, { cast: true });
    for (const sx of [-w / 2 + 0.4, w / 2 - 0.4]) world.box(0.12, 0.12, 1.6, M.metal, x + sx, 3.1, z);
  }

  function table(x, z, ry = 0) {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    const top = new THREE.Mesh(geoCyl(0.62, 0.62, 0.08, 12), M.woodFloor ? M.white : M.white);
    top.position.y = 0.76; top.castShadow = true; g.add(top);
    const leg = new THREE.Mesh(geoCyl(0.09, 0.13, 0.74, 8), M.metal);
    leg.position.y = 0.38; g.add(leg);
    scene.add(g);
    world.addCollider(x - 0.55, z - 0.55, x + 0.55, z + 0.55);
    return g;
  }

  function chair(x, z, ry = 0, color = 0x3b82f6) {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    const seat = new THREE.Mesh(geoBox(0.42, 0.07, 0.42), L(color));
    seat.position.y = 0.46; seat.castShadow = true; g.add(seat);
    const back = new THREE.Mesh(geoBox(0.42, 0.45, 0.07), L(color));
    back.position.set(0, 0.7, -0.2); g.add(back);
    for (const [sx, sz] of [[-0.16, -0.16], [0.16, -0.16], [-0.16, 0.16], [0.16, 0.16]]) {
      const leg = new THREE.Mesh(geoBox(0.05, 0.45, 0.05), M.dark);
      leg.position.set(sx, 0.22, sz); g.add(leg);
    }
    scene.add(g);
    return g;
  }

  function lampPost(x, z, opts = {}) {
    world.box(0.16, opts.h || 4.6, 0.16, M.dark, x, (opts.h || 4.6) / 2, z);
    const bulb = new THREE.Mesh(geoSph(0.24, 8, 6), M.neon);
    bulb.position.set(x, opts.h || 4.6, z);
    scene.add(bulb);
    world.addCollider(x - 0.2, z - 0.2, x + 0.2, z + 0.2);
    if (opts.light) {
      const pl = new THREE.PointLight(0xffe2a8, opts.light, opts.range || 26, 1.8);
      pl.position.set(x, (opts.h || 4.6) - 0.2, z);
      scene.add(pl);
      world.outdoorLights = world.outdoorLights || [];
      world.outdoorLights.push(pl);
      ext.lights.push(pl);
    }
    return bulb;
  }

  function tree(x, z, s = 1) {
    const trunk = new THREE.Mesh(geoCyl(0.16 * s, 0.28 * s, 2.4 * s, 6), M.woodFloor ? new THREE.MeshLambertMaterial({ color: 0x7a5230 }) : M.dark);
    trunk.position.set(x, 1.2 * s, z); trunk.castShadow = true;
    scene.add(trunk);
    const crown = new THREE.Mesh(geoSph(1.8 * s, 8, 6), new THREE.MeshLambertMaterial({ color: choice([0x4e8c3e, 0x5fa843, 0x468031]) }));
    crown.position.set(x, 3.1 * s, z); crown.castShadow = true;
    scene.add(crown);
    world.addCollider(x - 0.3 * s, z - 0.3 * s, x + 0.3 * s, z + 0.3 * s);
  }

  function bench(x, z, ry = 0) { world._bench(x, z, ry); }

  function bin(x, z) {
    const b = new THREE.Mesh(geoCyl(0.38, 0.32, 0.9, 10), M.green);
    b.position.set(x, 0.45, z); b.castShadow = true; scene.add(b);
    world.addCollider(x - 0.35, z - 0.35, x + 0.35, z + 0.35);
  }

  function interact(id, x, z, prompt, action, r = 2.4) {
    const it = world.addInteractable({ id, x, z, r, prompt, action });
    ext.interactPoints.push(it);
    return it;
  }

  function shelf(x, z, ry = 0, cols = 0x7a5230) {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    for (let i = 0; i < 3; i++) {
      const board = new THREE.Mesh(geoBox(1.8, 0.06, 0.5), M.dark);
      board.position.y = 0.55 + i * 0.5; g.add(board);
      for (let k = 0; k < 5; k++) {
        const box = new THREE.Mesh(geoBox(0.2, 0.3, 0.3), L(choice([0xe0563f, 0x4aa96c, 0x3b82f6, 0xf2c94c, 0xff8fb1, 0x8b5cf6, cols])));
        box.position.set(-0.7 + k * 0.35, 0.72 + i * 0.5, 0);
        g.add(box);
      }
    }
    scene.add(g);
    world.addCollider(x - 0.95, z - 0.35, x + 0.95, z + 0.35);
  }

  function counter(x, z, ry = 0, w = 3.2) {
    const g = new THREE.Group();
    g.position.set(x, 0, z); g.rotation.y = ry;
    const top = new THREE.Mesh(geoBox(w, 0.12, 0.8), M.white);
    top.position.y = 1.05; top.castShadow = true; g.add(top);
    const body = new THREE.Mesh(geoBox(w - 0.1, 1.0, 0.7), M.woodFloor ? M.dark : M.dark);
    body.position.y = 0.5; g.add(body);
    scene.add(g);
    const alongX = Math.abs(Math.sin(ry)) < 0.5;
    if (alongX) world.addCollider(x - w / 2, z - 0.45, x + w / 2, z + 0.45);
    else world.addCollider(x - 0.45, z - w / 2, x + 0.45, z + w / 2);
    return g;
  }

  /* ============================================================
     ۱) شهر کوچک آفتاب — خیابان، پیاده‌رو، مغازه‌ها، پارک شهر
     ============================================================ */
  await step(20, 'ساخت خیابان و مغازه‌های شهر...', () => {
    const C = EXT.city;
    const midZ = C.streetZ;
    // خیابان اصلی شهر
    world.plane(228, 11, world.M.asphalt, 0, 0.02, midZ);
    world.mapRects.push({ x1: -114, z1: midZ - 5.5, x2: 114, z2: midZ + 5.5, c: '#3a3e45' });
    // پیاده‌روها
    world.plane(228, 4.5, M.sidewalk, 0, 0.025, midZ - 7.7);
    world.plane(228, 4.5, M.sidewalk, 0, 0.025, midZ + 7.7);
    // خط‌کشی وسط
    for (let x = -110; x <= 110; x += 8) {
      if (Math.abs(x) < 8) continue;
      world.box(3.2, 0.02, 0.4, world.M.lineWhite, x, 0.04, midZ, { cast: false });
    }
    // خط‌عابر پیاده + چراغ راهنما
    world.plane(9, 6, new THREE.MeshLambertMaterial({ map: T.crosswalk }), -3, 0.035, midZ);
    world.box(0.2, 4.4, 0.2, M.dark, -8.5, 2.2, midZ + 6.4);
    for (const [dy, col] of [[3.4, 0xd9433a], [2.9, 0xf2c94c], [2.4, 0x4aa96c]]) {
      const lamp = new THREE.Mesh(geoSph(0.16, 8, 6), new THREE.MeshLambertMaterial({ color: col, emissive: col, emissiveIntensity: 0.7 }));
      lamp.position.set(-8.5, dy, midZ + 6.4);
      scene.add(lamp);
    }
    // ایستگاه اتوبوس
    const bs = { x: 8, z: midZ - 6.6 };
    world.box(6, 0.14, 3.4, M.dark, bs.x, 3.1, bs.z);
    for (const sx of [-2.7, 2.7]) world.box(0.16, 3.1, 0.16, M.metal, bs.x + sx, 1.55, bs.z);
    world.box(4.6, 0.5, 0.5, M.blue, bs.x, 0.5, bs.z + 1.1);
    sign('🚌 ایستگاه اتوبوس', bs.x, 2.4, bs.z + 1.6, { bg: '#1f4e5f' });
    ext.busStop = { x: bs.x, z: bs.z };
    interact('bus_stop', bs.x, bs.z, 'سفر سریع با اتوبوس شهر', () => ext.hooks.fastTravel && ext.hooks.fastTravel('city'), 3.2);
    interact('bus_ride', bs.x + 2, bs.z + 1.6, 'گردش با اتوبوس شهر', () => ext.hooks.bus && ext.hooks.bus(), 2.6);

    // مغازه‌ها (ردیف جنوبی، رو به شمال)
    for (const sh of EXT.shops) {
      const w = 20, d = 14, x1 = sh.x - w / 2, x2 = sh.x + w / 2, z1 = sh.z - d / 2, z2 = sh.z + d / 2;
      const frontMat = choice([T.shopFront, T.shopFront2, T.shopFront3]);
      const mat = new THREE.MeshLambertMaterial({ map: frontMat });
      const floor = floorOf[sh.kind] || M.marble;
      shell({ x1, z1, x2, z2, h: 4.4, mat: M.plaster, front: mat, roof: M.roof, floor, door: { side: 'north', a: sh.x - 1.5, b: sh.x + 1.5 }, label: sh.name.slice(0, 12), mapColor: '#c9b9a4' });
      awning(sh.x, z1 - 0.9, w - 3, M.red);
      sign(sh.name, sh.x, 3.6, z1 - 0.3, { bg: '#7a2e2e', size: 42 });
      // ویترین
      world.box(w - 3, 1.6, 0.12, M.glass, sh.x, 2.2, z1 + 0.02, { cast: false });
      // پیشخوان و قفسه‌ها
      const cz = z2 - 3.5;
      counter(sh.x, cz, 0, 4.2);
      for (const sx of [-6.5, 6.5]) shelf(sh.x + sx, z2 - 1.4, 0);
      bin(sh.x - 8.6, z1 + 2.2);
      // چراغ سقفی
      world.box(3, 0.12, 0.8, M.neon, sh.x, 4.1, sh.z, { cast: false });
      const pl = new THREE.PointLight(0xfff0cc, 16, 22, 1.8);
      pl.position.set(sh.x, 3.6, sh.z);
      scene.add(pl);
      ext.lights.push(pl);
      // یخچال/ویترین مخصوص هر فروشگاه
      if (sh.kind === 'super') {
        for (const [px, pz] of [[-4, z2 - 1.5], [0, z2 - 1.5], [4, z2 - 1.5]]) {
          world.box(5.4, 1.9, 1.0, M.white, sh.x + px, 0.95, pz, { collider: true });
        }
      } else if (sh.kind === 'pizza') {
        const oven = new THREE.Mesh(geoCyl(1.1, 1.1, 1.6, 12), M.dark);
        oven.rotation.z = Math.PI / 2;
        oven.position.set(sh.x - 6, 1.0, z2 - 1.6);
        scene.add(oven);
        world.addCollider(sh.x - 7, z2 - 2.4, sh.x - 5, z2 - 0.8);
        for (const [px, pz] of [[2, z1 + 3], [6, z1 + 3]]) { table(sh.x + px, pz); chair(sh.x + px - 0.9, pz, Math.PI / 2); chair(sh.x + px + 0.9, pz, -Math.PI / 2); }
      } else if (sh.kind === 'ice') {
        for (const sx of [-5, 0, 5]) world.box(1.4, 2.0, 1.0, M.neonBlue, sh.x + sx, 1.0, z2 - 1.5, { collider: true });
      } else if (sh.kind === 'book') {
        for (const sx of [-6, -2, 2, 6]) shelf(sh.x + sx, z2 - 1.4, 0, 0x8a5a33);
        table(sh.x - 4, z1 + 3.5); chair(sh.x - 5, z1 + 3.5, Math.PI / 2); chair(sh.x - 3, z1 + 3.5, -Math.PI / 2);
      } else if (sh.kind === 'toy') {
        for (let i = 0; i < 6; i++) {
          const ball = new THREE.Mesh(geoSph(0.35, 8, 6), L(choice([0xe0563f, 0x4aa96c, 0x3b82f6, 0xf2c94c])));
          ball.position.set(sh.x - 6 + (i % 3) * 1.4, 0.9 + Math.floor(i / 3) * 0.8, z2 - 1.5);
          ball.castShadow = true;
          scene.add(ball);
        }
        const kiteProp = new THREE.Mesh(geoBox(1.1, 0.02, 1.1), M.yellow);
        kiteProp.rotation.y = Math.PI / 4;
        kiteProp.position.set(sh.x + 4, 2.2, z2 - 1.6);
        scene.add(kiteProp);
      } else if (sh.kind === 'cafe') {
        for (const [px, pz] of [[-5, z1 + 3.5], [4, z1 + 3.5]]) { table(sh.x + px, pz); chair(sh.x + px - 0.95, pz, Math.PI / 2); chair(sh.x + px + 0.95, pz, -Math.PI / 2); }
        world.box(2.2, 0.7, 0.9, M.brick, sh.x - 6.5, 0.35, z1 + 6.5, { collider: true });
        sign('☕', sh.x + 7.5, 2.4, z2 - 1.6, { h: 0.7, bg: '#5b3a1f' });
      } else if (sh.kind === 'clinic') {
        world.box(2.0, 0.2, 3.0, M.white, sh.x + 5, 0.75, z2 - 2.2, { collider: true });
        world.box(0.16, 2.2, 0.16, M.metal, sh.x + 5, 1.9, z2 - 3.4);
        sign('💊 درمانگاه', sh.x + 5, 3.2, z2 - 3.5, { bg: '#1f4e5f', h: 0.6 });
        for (const sx of [-5, -2]) world.box(1.0, 2.2, 0.9, M.white, sh.x + sx, 1.1, z2 - 1.5, { collider: true });
      }
      ext.shops.push({ ...sh, counter: { x: sh.x, z: cz - 1.2 }, door: { x: sh.x, z: z1 } });
    }

    // تعمیرگاه دوچرخه و سینما (شرق شهر)
    shell({ x1: EXT.bikeShop.x - 9, z1: EXT.bikeShop.z - 7, x2: EXT.bikeShop.x + 9, z2: EXT.bikeShop.z + 7, h: 4.2, mat: M.brick, roof: M.roof, floor: M.concrete, door: { side: 'south', a: EXT.bikeShop.x - 1.6, b: EXT.bikeShop.x + 1.6 }, label: 'تعمیرگاه دوچرخه', mapColor: '#c9b9a4' });
    sign('🚲 تعمیرگاه دوچرخه', EXT.bikeShop.x, 3.5, EXT.bikeShop.z + 7.4, { bg: '#1f4e5f' });
    for (let i = 0; i < 3; i++) {
      const wheel = new THREE.Mesh(geoTorus(0.42, 0.07, 6, 12), M.dark);
      wheel.position.set(EXT.bikeShop.x - 5 + i * 1.1, 0.5, EXT.bikeShop.z + 4);
      wheel.rotation.y = Math.PI / 2;
      scene.add(wheel);
    }
    shell({ x1: EXT.cinema.x - 11, z1: EXT.cinema.z - 8, x2: EXT.cinema.x + 11, z2: EXT.cinema.z + 8, h: 6, mat: M.cityWall2, roof: M.roof, floor: M.carpetB, label: 'سینما', mapColor: '#8e8e9c' });
    sign('🎬 سینما آفتاب', EXT.cinema.x, 5.4, EXT.cinema.z - 8.4, { bg: '#3b2a5b' });
    world.box(6, 2.6, 0.2, M.poster, EXT.cinema.x, 2.0, EXT.cinema.z - 8.2, { cast: false });
    interact('cinema', EXT.cinema.x, EXT.cinema.z - 9.4, 'تماشای فیلم (به‌زودی!)', () => ext.hooks.notice && ext.hooks.notice('سینما امروز تعطیل است — ولی پوستر جدیدش را ببین! 🎬'), 3);

    // پارک شهر (غرب) با وسایل بازی و زمین چمن
    const P = EXT.park;
    world.plane(P.x2 - P.x1, P.z2 - P.z1, new THREE.MeshLambertMaterial({ map: T.grassCourt }), (P.x1 + P.x2) / 2, 0.03, (P.z1 + P.z2) / 2);
    world.mapRects.push({ x1: P.x1, z1: P.z1, x2: P.x2, z2: P.z2, c: '#3f7a34' });
    world.mapLabels.push({ x: (P.x1 + P.x2) / 2, z: P.z1 + 4, t: 'پارک شهر' });
    for (let i = 0; i < 10; i++) tree(rand(P.x1 + 2, P.x2 - 2), rand(P.z1 + 4, P.z2 - 2), rand(0.8, 1.2));
    for (let i = 0; i < 4; i++) bench(P.x1 + 4 + i * 7, P.z2 - 3, Math.PI);
    // الاکلنگ، سرسره، تاب
    const slide = new THREE.Group();
    slide.position.set((P.x1 + P.x2) / 2, 0, P.z1 + 12);
    const slideBoard = new THREE.Mesh(geoBox(1.2, 0.12, 4.6), M.yellow);
    slideBoard.position.set(0, 1.5, 0);
    slideBoard.rotation.x = -0.42;
    slide.add(slideBoard);
    const ladder = new THREE.Mesh(geoBox(0.1, 1.9, 0.1), M.metal);
    ladder.position.set(-0.6, 0.95, -2.1); slide.add(ladder);
    const ladder2 = ladder.clone(); ladder2.position.x = 0.6; slide.add(ladder2);
    scene.add(slide);
    world.addCollider((P.x1 + P.x2) / 2 - 1, P.z1 + 12 - 2.5, (P.x1 + P.x2) / 2 + 1, P.z1 + 12 + 2.5);
    const swing = new THREE.Group();
    swing.position.set((P.x1 + P.x2) / 2, 0, P.z2 - 8);
    for (const sx of [-1.6, 1.6]) {
      const post = new THREE.Mesh(geoBox(0.14, 3.0, 0.14), M.metal);
      post.position.set(sx, 1.5, 0); swing.add(post);
    }
    const bar = new THREE.Mesh(geoBox(3.6, 0.12, 0.12), M.metal);
    bar.position.y = 3.0; swing.add(bar);
    for (const sx of [-0.9, 0.9]) {
      const rope = new THREE.Mesh(geoBox(0.04, 1.8, 0.04), M.dark);
      rope.position.set(sx, 2.0, 0); swing.add(rope);
      const seat = new THREE.Mesh(geoBox(0.5, 0.06, 0.24), M.dark);
      seat.position.set(sx, 1.1, 0); swing.add(seat);
    }
    scene.add(swing);
    // بادبادک‌بازی در پارک
    interact('kite_spot', (P.x1 + P.x2) / 2, P.z1 + 6, 'پرواز دادن بادبادک 🪁', () => ext.hooks.kite && ext.hooks.kite(), 3);

    // چراغ‌های خیابان + درخت‌های شهر
    for (let x = -104; x <= 104; x += 26) {
      lampPost(x, midZ - 7.7, { light: 20, h: 5 });
      lampPost(x + 13, midZ + 7.7, { light: 18, h: 5 });
    }
    for (let x = -100; x <= 100; x += 17) {
      if (Math.abs(x - 8) < 12) continue;
      tree(x, midZ + 11.5, rand(0.8, 1.15));
    }
    for (let x = -100; x <= 100; x += 21) {
      if (Math.abs(x + 3) < 10) continue;
      tree(x, midZ - 11.5, rand(0.75, 1.05));
    }
    // نوشیدنی‌فروش خودکار + خودپرداز
    world.box(1.2, 2.0, 0.9, M.red, 20, 1.0, midZ - 6.8, { collider: true });
    sign('نوشیدنی', 20, 2.2, midZ - 7.3, { h: 0.5, bg: '#7a2e2e' });
    interact('vending', 20, midZ - 6.8, 'خرید نوشیدنی (۵ سکه)', () => ext.hooks.vending && ext.hooks.vending(), 2.4);
    world.box(1.0, 2.2, 1.0, M.blue, 34, 1.1, midZ - 6.8, { collider: true });
    sign('🏧 خودپرداز', 34, 2.5, midZ - 7.3, { h: 0.5, bg: '#1f4e5f' });
    interact('atm', 34, midZ - 6.8, 'برداشت روزانهٔ ۲۰ سکه', () => ext.hooks.atm && ext.hooks.atm(), 2.4);
    // سطل بازیافت با مینی‌مأموریت
    for (const [x, z] of [[-14, midZ - 6.6], [46, midZ + 7], [-30, midZ + 7]]) {
      const b = new THREE.Mesh(geoCyl(0.42, 0.36, 1.0, 10), M.blue);
      b.position.set(x, 0.5, z); b.castShadow = true; scene.add(b);
      world.addCollider(x - 0.4, z - 0.4, x + 0.4, z + 0.4);
      interact('recycle_' + x, x, z, 'جدا کردن زباله‌های بازیافتی', () => ext.hooks.recycle && ext.hooks.recycle(), 2.2);
    }
    // تابلوی اعلانات شهر
    world.box(3.4, 2.2, 0.2, M.notice, 60, 1.6, midZ - 6.9, { collider: true });
    world.box(0.16, 1.4, 0.16, M.metal, 58.4, 0.7, midZ - 6.9);
    world.box(0.16, 1.4, 0.16, M.metal, 61.6, 0.7, midZ - 6.9);
    interact('city_board', 60, midZ - 6.9, 'خواندن اعلانات شهر', () => ext.hooks.board && ext.hooks.board('city'), 2.6);
  });

  /* ============================================================
     ۲) پارک اسکیت آفتاب
     ============================================================ */
  await step(32, 'ساخت پارک اسکیت...', () => {
    const S = EXT.skate;
    const cx = S.c.x, cz = S.c.z;
    world.plane(S.x2 - S.x1 + 4, S.z2 - S.z1 + 4, M.concrete, cx, 0.03, cz);
    world.mapRects.push({ x1: S.x1, z1: S.z1, x2: S.x2, z2: S.z2, c: '#a9a9a4' });
    world.mapLabels.push({ x: cx, z: S.z1 + 3, t: 'پارک اسکیت' });
    // دیوارهای گرافیتی دور محوطه
    world.wallZ(S.z2 + 2, S.x1 - 2, S.x2 + 2, 2.4, M.graffiti, { mapColor: '#5c5f66' });
    world.wallX(S.x2 + 2, S.z1 - 2, S.z2 + 2, 2.4, M.graffiti, { mapColor: '#5c5f66' });
    // رمپ‌ها (گوه‌ای) با ثبت شیب برای فیزیک
    const ramp = (x1, z1, x2, z2, h, dir, color) => {
      const w = x2 - x1, d = z2 - z1;
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        const t = (i + 1) / steps;
        const hh = h * t;
        if (dir === 'z-') world.box(w, hh, d / steps, L(color), x1 + w / 2, hh / 2, z2 - (i + 0.5) * (d / steps));
        else if (dir === 'z+') world.box(w, hh, d / steps, L(color), x1 + w / 2, hh / 2, z1 + (i + 0.5) * (d / steps));
        else if (dir === 'x-') world.box(w / steps, hh, d, L(color), x2 - (i + 0.5) * (w / steps), hh / 2, z1 + d / 2);
        else world.box(w / steps, hh, d, L(color), x1 + (i + 0.5) * (w / steps), hh / 2, z1 + d / 2);
      }
      // لبه فلزی
      if (dir === 'z-') world.box(w + 0.2, 0.1, 0.3, M.metal, x1 + w / 2, h, z1);
      if (dir === 'z+') world.box(w + 0.2, 0.1, 0.3, M.metal, x1 + w / 2, h, z2);
      if (dir === 'x-') world.box(0.3, 0.1, d + 0.2, M.metal, x1, h, z1 + d / 2);
      if (dir === 'x+') world.box(0.3, 0.1, d + 0.2, M.metal, x2, h, z1 + d / 2);
      ext.ramps.push({ x1, z1, x2, z2, dir, h });
      return { x1, z1, x2, z2, dir, h };
    };
    ext.ramps.length = 0;
    ramp(82, 64, 90, 72, 1.9, 'z-', 0x9aa3ad);
    ramp(100, 76, 108, 84, 2.1, 'x-', 0x9aa3ad);
    ramp(90, 74, 98, 80, 1.5, 'z-', 0x8f98a2);
    // فان‌باکس وسط با لبه
    world.box(5, 1.0, 5, M.concrete, cx, 0.5, cz, { collider: true });
    world.box(5.4, 0.14, 5.4, M.metal, cx, 1.06, cz);
    for (const [dx, dz] of [[-3.4, 0], [3.4, 0], [0, -3.4], [0, 3.4]]) {
      world.box(dx === 0 ? 5.4 : 0.2, 0.2, dz === 0 ? 5.4 : 0.2, M.red, cx + dx, 1.1, cz + dz);
    }
    // ریل‌ها (برای گرایند)
    const rail = (x1, x2, z, y = 0.85) => {
      const len = x1 < x2 ? x2 - x1 : x1 - x2;
      const mx = (x1 + x2) / 2;
      world.box(len, 0.1, 0.1, M.metal, mx, y, z);
      for (let i = 0; i <= 4; i++) {
        const px = Math.min(x1, x2) + (i * len) / 4;
        world.box(0.08, y, 0.08, M.dark, px, y / 2, z);
      }
      ext.rails.push({ x1: Math.min(x1, x2), z1: z - 0.35, x2: Math.max(x1, x2), z2: z + 0.35, y });
    };
    rail(83, 91, 71.5);
    rail(99, 106, 68.5, 1.0);
    // پله‌ها + هندریل
    for (let i = 0; i < 3; i++) world.box(6, 0.34, 1.0, M.concrete, 104, 0.17 + i * 0.34, 79 + i * 1.0);
    world.box(6.6, 1.2, 0.14, M.metal, 104, 1.6, 78.4);
    // صحنهٔ کوچک و نیمکت و سطل
    for (let i = 0; i < 3; i++) bench(S.x1 + 3 + i * 6, S.z2 - 1.5, Math.PI);
    bin(cx + 8, cz + 6);
    bin(cx - 8, cz - 6);
    lampPost(S.x1 + 2, S.z1 + 2, { light: 22, h: 6 });
    lampPost(S.x2 - 2, S.z1 + 2, { light: 22, h: 6 });
    lampPost(S.x2 - 2, S.z2 - 2, { light: 22, h: 6 });
    sign('🛹 پارک اسکیت آفتاب', cx, 3.4, S.z2 - 2.6, { bg: '#2b2b3a' });
    // حلقه‌های پرواز برای مأموریت
    const hoopSpots = [[86, 63, 2.6], [98, 80.5, 2.9], [94, 72, 2.4]];
    hoopSpots.forEach(([x, y, z], i) => {
      const h = new THREE.Mesh(geoTorus(1.5, 0.14, 8, 20), M.neonPink);
      h.position.set(x, y, z);
      scene.add(h);
      const glow = new THREE.Mesh(geoTorus(1.5, 0.28, 8, 20), new THREE.MeshBasicMaterial({ color: 0xff5fa2, transparent: true, opacity: 0.22 }));
      glow.position.copy(h.position);
      scene.add(glow);
      ext.hoops.push({ i, x, y, z, mesh: h, taken: false });
    });
    // تخته‌اسکیت‌های رایگان + استند
    world.box(2.4, 0.5, 1.0, M.woodFloor, cx + 6, 0.25, S.z1 + 2.5, { collider: true });
    sign('اسکیت رایگان — کلید C', cx + 6, 1.6, S.z1 + 2.5, { h: 0.5, bg: '#2b2b3a' });
    interact('skate_rent', cx + 6, S.z1 + 2.5, 'برداشتن تخته‌اسکیت', () => ext.hooks.skate && ext.hooks.skate(), 2.6);
  });

  /* ============================================================
     ۳) استخر آفتاب
     ============================================================ */
  await step(46, 'ساخت استخر سرپوشیده...', () => {
    const P = EXT.pool;
    world.plane(P.x2 - P.x1, P.z2 - P.z1, M.poolDeck, (P.x1 + P.x2) / 2, 0.04, (P.z1 + P.z2) / 2);
    world.mapRects.push({ x1: P.x1, z1: P.z1, x2: P.x2, z2: P.z2, c: '#4fb3e8' });
    world.mapLabels.push({ x: (P.x1 + P.x2) / 2, z: P.z1 + 4, t: 'استخر' });
    const h = 7;
    const W = P.water;
    // دیوارها (شیشه‌ای در سمت مدرسه) با در ورودی
    world.wallX(P.x1, P.z1, P.z2, h, new THREE.MeshLambertMaterial({ map: T.mallGlass }), { gaps: [{ a: -22, b: -19 }], mapColor: '#7fb6d9' });
    world.wallX(P.x2, P.z1, P.z2, h, M.plasterBlue, { mapColor: '#7fb6d9' });
    world.wallZ(P.z1, P.x1, P.x2, h, M.plasterBlue, { mapColor: '#7fb6d9' });
    world.wallZ(P.z2, P.x1, P.x2, h, M.plasterBlue, { mapColor: '#7fb6d9' });
    world.box(P.x2 - P.x1 + 1, 0.6, P.z2 - P.z1 + 1, M.roof, (P.x1 + P.x2) / 2, h + 0.3, (P.z1 + P.z2) / 2);
    // حوضچه: لبه، دیواره داخلی، کف و آب
    world.box(W.x2 - W.x1 + 2.0, 0.34, W.z2 - W.z1 + 2.0, M.poolDeck, (W.x1 + W.x2) / 2, 0.17, (W.z1 + W.z2) / 2);
    world.box(W.x2 - W.x1, 0.3, W.z2 - W.z1, new THREE.MeshLambertMaterial({ map: T.poolTile }), (W.x1 + W.x2) / 2, 0.36, (W.z1 + W.z2) / 2, { cast: false });
    const waterMesh = new THREE.Mesh(geoPlane(W.x2 - W.x1, W.z2 - W.z1), M.water);
    waterMesh.rotation.x = -Math.PI / 2;
    waterMesh.position.set((W.x1 + W.x2) / 2, 0.46, (W.z1 + W.z2) / 2);
    scene.add(waterMesh);
    const underwater = new THREE.Mesh(geoPlane(W.x2 - W.x1, W.z2 - W.z1), M.waterDeep);
    underwater.rotation.x = -Math.PI / 2;
    underwater.position.set((W.x1 + W.x2) / 2, 0.06, (W.z1 + W.z2) / 2);
    scene.add(underwater);
    // طناب مسیرها (شناورهای رنگی)
    for (let lane = 1; lane <= 2; lane++) {
      const z = W.z1 + (lane * (W.z2 - W.z1)) / 3;
      for (let x = W.x1 + 1; x < W.x2 - 1; x += 1.2) {
        const f = new THREE.Mesh(geoSph(0.12, 7, 6), lane === 1 ? M.red : M.yellow);
        f.position.set(x, 0.52, z);
        scene.add(f);
      }
    }
    // سکوهای شروع + تخته شیرجه
    for (const z of [W.z1 + 4, W.z1 + 12]) {
      world.box(1.4, 0.55, 1.0, M.white, W.x2 - 2, 0.72, z);
      world.box(1.4, 0.1, 1.0, M.red, W.x2 - 2, 1.03, z, { cast: false });
    }
    const board = new THREE.Mesh(geoBox(3.0, 0.16, 1.1), M.yellow);
    board.position.set(W.x1 + 2.4, 3.2, W.z1 + 8);
    scene.add(board);
    world.box(0.3, 3.2, 0.3, M.metal, W.x1 + 2.4, 1.6, W.z1 + 8, { collider: true });
    // نردبان، حلقه نجات، تیرک‌ها
    for (const z of [W.z1 + 3, W.z1 + 13]) {
      const rung = [];
      for (let i = 0; i < 3; i++) {
        const r = new THREE.Mesh(geoBox(0.6, 0.07, 0.07), M.metal);
        r.position.set(W.x2 - 0.6, 0.5 - i * 0.25, z);
        scene.add(r);
        rung.push(r);
      }
    }
    const buoy = new THREE.Mesh(geoTorus(0.5, 0.13, 8, 16), M.red);
    buoy.position.set(W.x2 + 2, 1.6, W.z1 + 2);
    scene.add(buoy);
    // رختکن، کمدها، دوش، نیمکت‌ها
    for (let i = 0; i < 8; i++) {
      world.box(0.9, 1.9, 0.7, i % 2 ? M.blue : M.green, P.x1 + 3 + (i % 4) * 1.0, 0.95, P.z2 - 4 - Math.floor(i / 4) * 1.0, { collider: true });
    }
    for (let i = 0; i < 3; i++) bench(P.x1 + 4 + i * 4, P.z2 - 1.6, Math.PI);
    for (const [x, z] of [[P.x2 - 4, P.z2 - 3], [P.x2 - 4, P.z2 - 6]]) {
      world.box(0.12, 2.2, 0.12, M.metal, x, 1.1, z);
      const head = new THREE.Mesh(geoSph(0.16, 8, 6), M.metal);
      head.position.set(x, 2.2, z); scene.add(head);
    }
    // جایگاه تماشاگران
    for (let i = 0; i < 3; i++) {
      world.box(P.x2 - P.x1 - 6, 0.4, 1.2, M.concrete, (P.x1 + P.x2) / 2, 0.2 + i * 0.4, P.z1 + 3 + i * 1.2);
    }
    // چراغ‌ها
    for (const x of [P.x1 + 6, (P.x1 + P.x2) / 2, P.x2 - 6]) {
      world.box(4, 0.14, 0.9, M.neonBlue, x, h - 0.3, (P.z1 + P.z2) / 2, { cast: false });
      const pl = new THREE.PointLight(0xdbf2ff, 20, 34, 1.8);
      pl.position.set(x, h - 0.7, (P.z1 + P.z2) / 2);
      scene.add(pl);
      ext.lights.push(pl);
    }
    sign('🏊 استخر آفتاب', P.x1 - 0.6, 4.4, -20.5, { bg: '#1f4e5f', ry: -Math.PI / 2 });
    sign('🌊 عمق ۱ تا ۱٫۸ متر', W.x1 + 6, 1.9, W.z2 + 1.4, { h: 0.5, bg: '#1f4e5f' });
    // حلقه‌های شنا برای مأموریت
    const ringPos = [[W.x1 + 4, W.z1 + 3], [W.x1 + 10, W.z1 + 13], [W.x2 - 6, W.z1 + 4], [W.x2 - 10, W.z2 - 3], [(W.x1 + W.x2) / 2, W.z1 + 8]];
    ext.pool = { rect: { x1: P.x1, z1: P.z1, x2: P.x2, z2: P.z2 }, waterRect: W, waterY: 0.46, rings: [], board: { x: W.x1 + 2.4, z: W.z1 + 8, y: 3.2 } };
    ringPos.forEach(([x, z], i) => {
      const r = new THREE.Mesh(geoTorus(0.55, 0.1, 8, 18), M.yellow);
      r.rotation.x = Math.PI / 2;
      r.position.set(x, 0.55, z);
      scene.add(r);
      ext.pool.rings.push({ i, x, z, mesh: r, taken: false, phase: rand(0, 6) });
    });
    interact('pool_enter', P.x1 + 1.6, -20.5, 'ورود به استخر', () => ext.hooks.notice && ext.hooks.notice('به استخر خوش آمدی! داخل آب برو تا شنا کنی 🏊'), 3);
  });

  /* ============================================================
     ۴) آزمایشگاه علوم
     ============================================================ */
  await step(58, 'ساخت آزمایشگاه علوم...', () => {
    const Lb = EXT.lab;
    const r = shell({
      x1: Lb.x1, z1: Lb.z1, x2: Lb.x2, z2: Lb.z2, h: 4.6,
      mat: new THREE.MeshLambertMaterial({ map: T.cityWall }), roof: M.roof, floor: M.labTile,
      door: { side: 'south', a: 44.4, b: 47.6 },
      label: 'آزمایشگاه', mapColor: '#dfe6e9',
    });
    sign('🔬 آزمایشگاه علوم', 44, 3.9, Lb.z2 + 0.4, { bg: '#1f4e5f' });
    // میزهای آزمایش با سینک و شیشه‌آلات
    for (const [px, pz] of [[37.5, -14.5], [46.5, -14.5], [37.5, -8.5], [46.5, -8.5]]) {
      world.box(3.4, 0.9, 1.3, M.white, px, 0.45, pz, { collider: true });
      world.box(3.6, 0.08, 1.5, M.marble, px, 0.94, pz);
      const sink = new THREE.Mesh(geoBox(0.6, 0.1, 0.5), M.metal);
      sink.position.set(px + 1.2, 0.96, pz);
      scene.add(sink);
      const tap = new THREE.Mesh(geoCyl(0.05, 0.05, 0.4, 6), M.metal);
      tap.position.set(px + 1.2, 1.16, pz); scene.add(tap);
      for (let i = 0; i < 3; i++) {
        const flask = new THREE.Mesh(geoCyl(0.11, 0.14, 0.3, 8), new THREE.MeshLambertMaterial({ color: 0xcfe8f5, transparent: true, opacity: 0.7 }));
        flask.position.set(px - 1 + i * 0.5, 1.13, pz + 0.2);
        scene.add(flask);
        const liq = new THREE.Mesh(geoCyl(0.1, 0.13, 0.14, 8), L([0x4dd4ff, 0xffd23f, 0xff6b9d][i]));
        liq.position.set(px - 1 + i * 0.5, 1.06, pz + 0.2);
        scene.add(liq);
      }
      // شعلهٔ بنزن
      const flame = new THREE.Mesh(geoCone(0.09, 0.25, 6), new THREE.MeshBasicMaterial({ color: 0x63d2ff, transparent: true, opacity: 0.8 }));
      flame.position.set(px + 0.1, 1.15, pz - 0.3);
      scene.add(flame);
    }
    // هود و قفسه مواد
    world.box(2.4, 2.2, 1.2, M.concrete, 51.5, 1.1, -10, { collider: true });
    world.box(0.3, 3.0, 3.4, M.woodFloor ? M.dark : M.dark, 35.2, 1.5, -10, { collider: true });
    for (let i = 0; i < 12; i++) {
      const b = new THREE.Mesh(geoCyl(0.09, 0.09, 0.26, 8), L(choice([0x4dd4ff, 0xffd23f, 0xff6b9d, 0x7cff6b, 0xc77dff])));
      b.position.set(35.5, 0.7 + Math.floor(i / 4) * 0.6, -11.6 + (i % 4) * 0.9);
      scene.add(b);
    }
    // جدول تناوبی + تخته
    const periodic = canvasTexture(512, 256, (ctx, w, h) => {
      ctx.fillStyle = '#0f2430'; ctx.fillRect(0, 0, w, h);
      const cols = 18, rows = 7, cw = w / cols, ch = h / rows;
      for (let i = 0; i < cols; i++) {
        for (let k = 0; k < rows; k++) {
          if (k === 0 && i > 1) continue;
          ctx.fillStyle = ['#2f6fed', '#e0563f', '#4aa96c', '#f2c94c', '#8b5cf6', '#14b8a6', '#ec4899'][(i + k) % 7];
          ctx.globalAlpha = 0.85;
          ctx.fillRect(i * cw + 1.5, k * ch + 1.5, cw - 3, ch - 3);
        }
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 20px Vazirmatn, Tahoma, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('جدول تناوبی عناصر', w / 2, h - 12);
    });
    const board = new THREE.Mesh(geoBox(6.4, 3.0, 0.14), new THREE.MeshLambertMaterial({ map: periodic }));
    board.position.set(44, 2.1, Lb.z1 + 0.2);
    scene.add(board);
    const desk = new THREE.Mesh(geoBox(2.2, 0.1, 1.0), M.marble);
    desk.position.set(44, 0.85, -4.2);
    scene.add(desk);
    world.box(2.1, 0.8, 0.9, M.dark, 44, 0.4, -4.2, { collider: true });
    world.box(1.6, 0.5, 1.0, M.dark, 44, 0.25, -4.2);
    // میکروسکوپ
    const scope = new THREE.Group();
    scope.position.set(44, 0.9, -4.2);
    const base = new THREE.Mesh(geoBox(0.5, 0.08, 0.36), M.dark);
    const arm = new THREE.Mesh(geoBox(0.1, 0.5, 0.1), M.metal);
    arm.position.set(-0.14, 0.28, 0);
    const tube = new THREE.Mesh(geoCyl(0.06, 0.06, 0.35, 8), M.metal);
    tube.position.set(-0.14, 0.52, 0.06);
    scope.add(base); scope.add(arm); scope.add(tube);
    scene.add(scope);
    sign('پوستر ایمنی: عینک بزن!', 48.5, 2.6, Lb.z1 + 0.2, { h: 0.55, bg: '#7a2e2e' });
    const pl = new THREE.PointLight(0xeaf4ff, 18, 26, 1.8);
    pl.position.set(44, 4.0, -10);
    scene.add(pl);
    ext.lights.push(pl);
    for (const x of [38, 44, 50]) world.box(2.4, 0.12, 0.7, M.neonBlue, x, 4.3, -10, { cast: false });
    interact('microscope', 44, -3.4, 'نگاه به میکروسکوپ', () => ext.hooks.microscope && ext.hooks.microscope(), 2.6);
    interact('lab_bench', 46.5, -12.8, 'انجام آزمایش علمی', () => ext.hooks.lab && ext.hooks.lab(), 2.8);
    interact('periodic', 44, Lb.z1 + 1.2, 'خواندن جدول تناوبی', () => ext.hooks.notice && ext.hooks.notice('جدول تناوبی: ۱۱۸ عنصر شناخته‌شده! 🧪'), 2.4);
  });

  /* ============================================================
     ۵) خوابگاه + سالن غذاخوری
     ============================================================ */
  await step(70, 'ساخت خوابگاه و سالن غذاخوری...', () => {
    const D = EXT.dorm;
    shell({
      x1: D.x1, z1: D.z1, x2: D.x2, z2: D.z2, h: 5.2,
      mat: new THREE.MeshLambertMaterial({ map: T.dormWall }), roof: M.roof, floor: M.woodFloor,
      door: { side: 'east', a: 16, b: 19 }, label: 'خوابگاه', mapColor: '#e2d5c4',
    });
    sign('🛏 خوابگاه آفتاب', D.x2 + 0.6, 4.0, 17.5, { bg: '#5b3a1f', ry: Math.PI / 2 });
    // راهروی وسط + اتاق‌های دو طرف (دیوار داخلی با درها)
    const dormWallMat = new THREE.MeshLambertMaterial({ map: T.dormWall });
    world.wallZ(18, D.x1 + 2, D.x2 - 2, 5.2, dormWallMat, { th: 0.2, gaps: [{ a: -96, b: -94 }, { a: -89, b: -87 }, { a: -82, b: -80 }] });
    for (const rx of [D.x1 + 6, D.x1 + 13, D.x1 + 20]) {
      world.wallX(rx, D.z1 + 1, D.z2 - 1, 5.2, dormWallMat, { th: 0.2, gaps: [{ a: 11, b: 13 }, { a: 23, b: 25 }] });
    }
    // تخت‌ها، کمدها، میزها
    const bed = (x, z, ry) => {
      const g = new THREE.Group();
      g.position.set(x, 0, z); g.rotation.y = ry;
      const frame = new THREE.Mesh(geoBox(1.1, 0.35, 2.2), M.woodFloor ? M.dark : M.dark);
      frame.position.y = 0.3; frame.castShadow = true; g.add(frame);
      const matt = new THREE.Mesh(geoBox(1.0, 0.22, 2.05), M.white);
      matt.position.y = 0.55; g.add(matt);
      const pillow = new THREE.Mesh(geoBox(0.7, 0.16, 0.45), M.blue);
      pillow.position.set(0, 0.72, -0.75); g.add(pillow);
      const quilt = new THREE.Mesh(geoBox(1.02, 0.12, 1.2), L(choice([0x3b82f6, 0x4aa96c, 0xe0563f, 0x8b5cf6])));
      quilt.position.set(0, 0.7, 0.4); g.add(quilt);
      scene.add(g);
      world.addCollider(x - 0.6, z - 1.2, x + 0.6, z + 1.2);
      ext.beds.push({ x, z, bed: g });
      return g;
    };
    let bi = 0;
    for (const rz of [D.z1 + 3.5, D.z2 - 3.5]) {
      for (const rx of [D.x1 + 3, D.x1 + 10, D.x1 + 17, D.x1 + 22.5]) {
        bed(rx, rz, rz < 18 ? 0 : Math.PI);
        world.box(0.8, 1.8, 0.6, bi % 2 ? M.blue : M.green, rx + 2.2, 0.9, rz, { collider: true });
        world.box(1.2, 0.08, 0.7, M.white, rx - 2.0, 0.75, rz);
        world.box(0.12, 0.72, 0.12, M.dark, rx - 2.6, 0.36, rz);
        world.box(0.12, 0.72, 0.12, M.dark, rx - 1.4, 0.36, rz);
        bi++;
      }
    }
    // سالن مشترک: تلویزیون، مبل، فرش، تابلوی اعلانات
    world.plane(8, 6, M.carpetR, D.x1 + 24, 0.06, 18);
    world.box(2.6, 1.6, 0.2, M.dark, D.x1 + 24, 2.2, D.z1 + 1.6, { cast: false });
    world.box(2.4, 1.4, 0.1, new THREE.MeshBasicMaterial({ color: 0x2a4a6a }), D.x1 + 24, 2.2, D.z1 + 1.72, { cast: false });
    for (const [sx, sz, ry] of [[D.x1 + 21, 16, 0.5], [D.x1 + 27, 16, -0.5], [D.x1 + 24, 20, Math.PI]]) {
      world.box(2.2, 0.7, 0.9, M.blue, sx, 0.35, sz, { ry, collider: true });
      world.box(2.2, 0.7, 0.25, M.blue, sx, 0.9, sz + (ry < 0 ? 0.32 : -0.32), { ry: 0, cast: false });
    }
    world.box(3.0, 2.0, 0.2, M.notice, D.x1 + 12, 1.7, D.z1 + 0.6, { collider: true });
    interact('dorm_board', D.x1 + 12, D.z1 + 1.4, 'خواندن تابلوی خوابگاه', () => ext.hooks.board && ext.hooks.board('dorm'), 2.6);
    // خواب در تخت
    bed(D.x1 + 3, D.z1 + 3.5, 0);
    interact('dorm_sleep', D.x1 + 4.4, D.z1 + 3.5, 'خوابیدن تا صبح (۷:۰۰)', () => ext.hooks.sleep && ext.hooks.sleep(), 2.6);
    // آشپزخانه کوچک خوابگاه
    world.box(3.0, 0.9, 1.0, M.white, D.x1 + 24, 0.45, D.z2 - 2.2, { collider: true });
    world.box(3.2, 0.08, 1.1, M.marble, D.x1 + 24, 0.94, D.z2 - 2.2);
    const kettle = new THREE.Mesh(geoCyl(0.14, 0.16, 0.3, 8), M.metal);
    kettle.position.set(D.x1 + 24.6, 1.13, D.z2 - 2.2);
    scene.add(kettle);
    const pl = new THREE.PointLight(0xffe9bf, 22, 30, 1.8);
    pl.position.set(D.x1 + 12, 4.2, 18);
    scene.add(pl);
    ext.lights.push(pl);
    for (const x of [D.x1 + 6, D.x1 + 14, D.x1 + 22]) world.box(2.4, 0.12, 0.8, M.neon, x, 4.9, 18, { cast: false });
    interact('fast_dorm', D.x2 + 2.5, 18, 'سفر سریع به دروازهٔ مدرسه', () => ext.hooks.fastTravel && ext.hooks.fastTravel('school'), 3);

    // --- سالن غذاخوری ---
    const F = EXT.cafeteria;
    shell({
      x1: F.x1, z1: F.z1, x2: F.x2, z2: F.z2, h: 4.6,
      mat: M.brickCream, roof: M.roof, floor: M.marble,
      door: { side: 'east', a: -19, b: -16 }, label: 'سالن غذاخوری', mapColor: '#e8dff2',
    });
    sign('🍽 سالن غذاخوری', F.x2 + 0.6, 3.6, -17.5, { bg: '#5b3a1f', ry: Math.PI / 2 });
    // آشپزخانه
    world.box(14, 1.0, 1.2, M.white, F.x1 + 8, 0.5, F.z1 + 2, { collider: true });
    world.box(14.4, 0.1, 1.3, M.marble, F.x1 + 8, 1.05, F.z1 + 2);
    for (const [px, pc] of [[F.x1 + 3, 0x9aa3ad], [F.x1 + 6, 0x8b93a0], [F.x1 + 9, 0x9aa3ad]]) {
      const pot = new THREE.Mesh(geoCyl(0.3, 0.26, 0.3, 10), L(pc));
      pot.position.set(px, 1.25, F.z1 + 2);
      scene.add(pot);
    }
    const fridge = new THREE.Mesh(geoBox(1.6, 2.2, 1.0), M.white);
    fridge.position.set(F.x1 + 2, 1.1, F.z1 + 4.4);
    scene.add(fridge);
    world.addCollider(F.x1 + 1.2, F.z1 + 3.9, F.x1 + 2.8, F.z1 + 4.9);
    // میزهای غذاخوری
    for (let i = 0; i < 6; i++) {
      const tx = F.x1 + 6 + (i % 3) * 5.5;
      const tz = F.z1 + 8 + Math.floor(i / 3) * 5;
      table(tx, tz);
      chair(tx - 0.95, tz, Math.PI / 2);
      chair(tx + 0.95, tz, -Math.PI / 2);
      chair(tx, tz - 0.95, 0);
      chair(tx, tz + 0.95, Math.PI);
    }
    bin(F.x1 + 20, F.z1 + 3);
    const pl2 = new THREE.PointLight(0xfff0cc, 20, 28, 1.8);
    pl2.position.set(F.x1 + 12, 3.8, F.z1 + 10);
    scene.add(pl2);
    ext.lights.push(pl2);
    interact('cafeteria', F.x1 + 10, F.z1 + 3.6, 'گرفتن غذا از آشپز', () => ext.hooks.cafeteria && ext.hooks.cafeteria(), 3);
  });

  /* ============================================================
     ۶) پیست مسابقه آفتاب
     ============================================================ */
  await step(84, 'ساخت پیست مسابقه...', () => {
    const ctrl = [
      { x: -10, z: -62 }, { x: 26, z: -62 }, { x: 48, z: -68 }, { x: 58, z: -80 },
      { x: 58, z: -94 }, { x: 46, z: -104 }, { x: 20, z: -108 }, { x: -4, z: -108 },
      { x: -22, z: -100 }, { x: -30, z: -88 }, { x: -44, z: -78 }, { x: -52, z: -70 },
      { x: -42, z: -62 },
    ];
    const pts = resampleClosed(ctrl, 7);
    const N = pts.length;
    const halfW = EXT.track.width / 2;
    // بردارهای نرمال
    const normals = [];
    for (let i = 0; i < N; i++) {
      const a = pts[(i - 1 + N) % N], b = pts[(i + 1) % N];
      const dx = b.x - a.x, dz = b.z - a.z;
      const len = Math.hypot(dx, dz) || 1;
      normals.push({ x: -dz / len, z: dx / len });
    }
    // جاده پیست (یک BufferGeometry → یک Draw Call)
    const roadTex = canvasTexture(256, 512, (ctx, w, h) => {
      ctx.fillStyle = '#3d4149'; ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 2600; i++) {
        ctx.fillStyle = ['#353941', '#474c55', '#525862', '#2f333a'][i % 4];
        ctx.globalAlpha = 0.5;
        ctx.fillRect(Math.random() * w, Math.random() * h, 3, 3);
      }
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#efe9d8';
      for (let y = 0; y < h; y += 64) ctx.fillRect(w / 2 - 3, y, 6, 34);
      ctx.globalAlpha = 1;
    }, { repeat: [2, 26] });
    const roadMat = new THREE.MeshLambertMaterial({ map: roadTex });
    const buildStrip = (offA, offB, mat, y) => {
      const pos = new Float32Array((N + 1) * 2 * 3);
      const nor = new Float32Array((N + 1) * 2 * 3);
      const uv = new Float32Array((N + 1) * 2 * 2);
      let dist = 0;
      for (let i = 0; i <= N; i++) {
        const k = i % N;
        const p = pts[k], n = normals[k];
        if (i > 0) dist += dist2D(pts[(i - 1) % N].x, pts[(i - 1) % N].z, p.x, p.z);
        const ax = p.x + n.x * offA, az = p.z + n.z * offA;
        const bx = p.x + n.x * offB, bz = p.z + n.z * offB;
        pos.set([ax, y, az, bx, y, bz], i * 6);
        nor.set([0, 1, 0, 0, 1, 0], i * 6);
        uv.set([0, dist / 8, 1, dist / 8], i * 4);
      }
      const idx = [];
      for (let i = 0; i < N; i++) {
        const a = i * 2, b = i * 2 + 1, c = (i + 1) * 2, d = (i + 1) * 2 + 1;
        idx.push(a, b, c, b, d, c);
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
      if (geo.setIndex) geo.setIndex(idx);
      if (geo.computeBoundingSphere) geo.computeBoundingSphere();
      const mesh = new THREE.Mesh(geo, mat);
      mesh.receiveShadow = true;
      scene.add(mesh);
      return mesh;
    };
    const road = buildStrip(-halfW, halfW, roadMat, 0.03);
    ext.trackRoad = road;
    // جدول‌های کناری رنگی
    const curbTex = canvasTexture(64, 64, (ctx, w, h) => {
      ctx.fillStyle = '#e8e2d4'; ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#d9433a'; ctx.fillRect(0, 0, w, h / 2);
    }, { repeat: [1, 40] });
    const curbMat = new THREE.MeshLambertMaterial({ map: curbTex });
    buildStrip(halfW, halfW + 0.9, curbMat, 0.045);
    buildStrip(-halfW - 0.9, -halfW, curbMat, 0.045);
    // خط شروع/پایان
    const checker = canvasTexture(128, 64, (ctx, w, h) => {
      for (let i = 0; i < 8; i++) {
        for (let k = 0; k < 4; k++) {
          ctx.fillStyle = (i + k) % 2 ? '#f5f5f2' : '#22242a';
          ctx.fillRect((i * w) / 8, (k * h) / 4, w / 8, h / 4);
        }
      }
    }, { repeat: [1, 1] });
    const startIdx = 3;  // نزدیک مستقیم شمالی
    const sp = pts[startIdx];
    const lineMesh = new THREE.Mesh(geoPlane(EXT.track.width, 2.4), new THREE.MeshLambertMaterial({ map: checker }));
    lineMesh.rotation.x = -Math.PI / 2;
    lineMesh.position.set(sp.x, 0.06, sp.z);
    scene.add(lineMesh);
    // دروازهٔ شروع
    const n0 = normals[startIdx];
    for (const s of [-1, 1]) {
      const px = sp.x + n0.x * (halfW + 0.8) * s, pz = sp.z + n0.z * (halfW + 0.8) * s;
      world.box(0.5, 6.4, 0.5, M.red, px, 3.2, pz, { collider: true });
      world.box(0.6, 0.6, 0.6, M.white, px, 6.5, pz, { cast: false });
    }
    const gantry = textSprite('🏁 پیست آفتاب 🏁', { height: 1.5, bg: '#7a2e2e', fg: '#ffe9a3', size: 56 });
    gantry.position.set(sp.x, 6.8, sp.z);
    gantry.rotation.y = Math.atan2(n0.x, n0.z);
    scene.add(gantry);
    // نقاط کنترل مسابقه (۸ دروازه)
    const checkpoints = [];
    for (let k = 0; k < 8; k++) {
      const idx = Math.floor((k / 8) * N + startIdx) % N;
      const p = pts[idx], n = normals[idx];
      const dir = { x: Math.sin(Math.atan2(n.x, n.z)), z: Math.cos(Math.atan2(n.x, n.z)) };
      for (const s of [-1, 1]) {
        const px = p.x + n.x * (halfW + 1.2) * s, pz = p.z + n.z * (halfW + 1.2) * s;
        const pole = new THREE.Mesh(geoCyl(0.14, 0.14, 4.4, 8), M.yellow);
        pole.position.set(px, 2.2, pz);
        scene.add(pole);
        const flag = new THREE.Mesh(geoPlane(1.2, 0.7), M.red);
        flag.position.set(px, 4.1, pz);
        flag.rotation.y = dir.x;
        scene.add(flag);
      }
      checkpoints.push({ x: p.x, z: p.z, nx: n.x, nz: n.z });
    }
    ext.track = {
      pts, normals, halfW, checkpoints, startIdx,
      start: { x: sp.x, z: sp.z }, pit: { x: 6, z: -70 },
      title: 'پیست آفتاب',
    };
    world.mapPaths.push({ pts, w: EXT.track.width, c: '#3d4149' });
    world.mapLabels.push({ x: sp.x, z: sp.z - 6, t: 'پیست مسابقه' });
    // لاستیک‌های محافظ دور پیست (هر ۱۴ نمونه)
    for (let i = 0; i < N; i += 14) {
      const p = pts[i], n = normals[i];
      const px = p.x + n.x * (halfW + 2.2), pz = p.z + n.z * (halfW + 2.2);
      const st = new THREE.Mesh(geoCyl(0.7, 0.7, 0.5, 10), new THREE.MeshLambertMaterial({ map: T.tire }));
      st.rotation.z = Math.PI / 2;
      st.position.set(px, 0.35, pz);
      st.castShadow = true;
      scene.add(st);
      world.addCollider(px - 0.6, pz - 0.6, px + 0.6, pz + 0.6);
      const st2 = st.clone();
      st2.position.set(px + n.x * 0.3, 0.9, pz + n.z * 0.3);
      scene.add(st2);
    }
    // چراغ‌های پیست
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const x = Math.cos(a) * 74, z = -86 + Math.sin(a) * 34;
      world.box(0.24, 9, 0.24, M.dark, x, 4.5, z);
      const head = new THREE.Mesh(geoBox(2.2, 0.5, 1.2), M.neon);
      head.position.set(x, 9.1, z);
      scene.add(head);
      const pl = new THREE.PointLight(0xf0f6ff, 30, 44, 1.6);
      pl.position.set(x, 8.6, z);
      scene.add(pl);
      ext.lights.push(pl);
      world.addCollider(x - 0.3, z - 0.3, x + 0.3, z + 0.3);
    }
    // جایگاه تماشاگران (دو طرف)
    const stand = (x, z, ry, rows) => {
      for (let i = 0; i < rows; i++) {
        world.box(16, 0.5, 1.4, M.concrete, x, 0.25 + i * 0.5, z + i * 1.4 * (ry ? -1 : 1));
        for (let k = 0; k < 8; k++) {
          const seat = new THREE.Mesh(geoBox(1.4, 0.2, 1.1), L([0x3b82f6, 0xe0563f, 0xf2c94c, 0x4aa96c][(k + i) % 4]));
          seat.position.set(x - 7 + k * 2, 0.6 + i * 0.5, z + i * 1.4 * (ry ? -1 : 1));
          scene.add(seat);
        }
      }
      world.box(17, 5.4, 0.4, M.roof, x, 2.7 + rows * 0.5, z + (rows * 1.4 + 1) * (ry ? -1 : 1), { cast: false });
    };
    stand(0, -116, 0, 4);
    stand(68, -86, 1, 3);
    sign('🏟 جایگاه تماشاگران', 0, 8.5, -113, { bg: '#1f4e5f' });
    // ساختمان پیت + کارت‌های پارک
    shell({ x1: 4, z1: -74, x2: 16, z2: -66, h: 4, mat: M.concrete, roof: M.roof, floor: M.concrete, door: { side: 'north', a: 8.5, b: 11.5 }, label: 'پیت', mapColor: '#8e8e9c' });
    sign('🔧 پیت‌استاپ', 10, 3.6, -66.4, { bg: '#333a45' });
    for (let i = 0; i < 5; i++) {
      const cone = new THREE.Mesh(geoCone(0.28, 0.8, 8), M.orange);
      cone.position.set(18 + i * 2.4, 0.4, -72);
      cone.castShadow = true;
      scene.add(cone);
    }
    // پارکینگ کات‌ها
    world.plane(18, 10, world.M.park, 10, 0.05, -70);
    for (let i = 0; i < 4; i++) {
      world.box(0.2, 0.02, 7, world.M.lineWhite, 3 + i * 4.5, 0.06, -70, { cast: false });
    }
    // اعلان و سفر سریع پیست
    interact('pit_race', 10, -70, 'شروع مسابقه 🏁', () => ext.hooks.race && ext.hooks.race(), 3.4);
    interact('fast_pit', 14.5, -70, 'سفر سریع به مدرسه', () => ext.hooks.fastTravel && ext.hooks.fastTravel('school'), 3);
    // تابلو مسابقه با رکورد
    ext.trackBoard = sign('🏁 مسابقه: کلید R', 10, 5.2, -70, { bg: '#7a2e2e' });
  });

  /* ============================================================
     ۷) مسیرها و تزئینات نهایی
     ============================================================ */
  await step(94, 'اتصال مسیرها و تزئینات...', () => {
    // مسیر پیاده از دروازهٔ مدرسه به شهر
    world.plane(9, 26, M.sidewalk, 0, 0.025, 70);
    world.mapRects.push({ x1: -4.5, z1: 57, x2: 4.5, z2: 82, c: '#bdb6a8' });
    // مسیرهای دسترسی به پیست و استخر و خوابگاه
    world.plane(8, 46, M.gravel, 0, 0.02, -40);          // مدرسه → پیست
    world.plane(46, 7, M.gravel, 46, 0.02, -10);         // محوطه → آزمایشگاه/استخر
    world.plane(7, 40, M.gravel, -70, 0.02, 4);          // محوطه → خوابگاه
    world.plane(7, 32, M.gravel, 70, 0.02, -18);         // محوطه → استخر
    world.plane(7, 40, M.gravel, -70, 0.02, -30);        // خوابگاه → غذاخوری
    world.mapRects.push({ x1: -4, z1: -62, x2: 4, z2: -18, c: '#b0a898' });
    world.mapRects.push({ x1: 24, z1: -13, x2: 68, z2: -6, c: '#b0a898' });
    world.mapRects.push({ x1: -74, z1: -15, x2: -66, z2: 24, c: '#b0a898' });
    // درخت‌ها و چراغ‌های مسیر
    for (let z = -58; z <= -22; z += 9) {
      lampPost(5, z, { light: 16, h: 4.6 });
      lampPost(-5, z, { light: 16, h: 4.6 });
    }
    for (let x = 30; x <= 66; x += 9) {
      lampPost(x, -5, { light: 14, h: 4.6 });
      lampPost(x, -18.5, { light: 14, h: 4.6 });
    }
    for (let z = 0; z <= 24; z += 8) lampPost(-64, z, { light: 16, h: 4.6 });
    for (let z = -24; z <= -8; z += 8) lampPost(-64, z, { light: 16, h: 4.6 });
    for (let x = 32; x <= 66; x += 12) tree(x, -3.5, rand(0.7, 0.95));
    // پرچم‌های تزئینی جلوی مدرسه و پیت
    const flags = [];
    for (let i = 0; i < 8; i++) {
      const f = new THREE.Mesh(geoPlane(1.4, 0.9), new THREE.MeshLambertMaterial({ map: T.flag, side: THREE.DoubleSide }));
      const px = -21 + i * 6;
      world.box(0.12, 5.4, 0.12, M.metal, px, 2.7, 58.5);
      f.position.set(px + 0.7, 5.0, 58.5);
      scene.add(f);
      flags.push(f);
    }
    ext.flags = flags;
    ext.flagT = 0;
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(geoPlane(1.6, 1.0), new THREE.MeshLambertMaterial({ map: T.flag, side: THREE.DoubleSide }));
      world.box(0.14, 7, 0.14, M.metal, 18 + i * 5, 3.5, -62);
      f.position.set(18 + i * 5 + 0.8, 6.4, -62);
      scene.add(f);
      flags.push(f);
    }
    // نیمکت و سطل در نقاط پرتردد
    bench(8, 70, Math.PI);
    bench(-8, 70, Math.PI);
    bin(6.5, 72);
    bin(-6.5, 72);
    bench(-74, -20, Math.PI / 2);
    bench(-74, 24, Math.PI / 2);
  });

  /* ---------- توابع عمومی ---------- */
  ext.rampHeightAt = (x, z) => {
    let h = 0;
    for (const r of ext.ramps) {
      if (x < r.x1 - 0.4 || x > r.x2 + 0.4 || z < r.z1 - 0.4 || z > r.z2 + 0.4) continue;
      let t = 0;
      if (r.dir === 'z-') t = (r.z2 - z) / (r.z2 - r.z1);
      else if (r.dir === 'z+') t = (z - r.z1) / (r.z2 - r.z1);
      else if (r.dir === 'x-') t = (r.x2 - x) / (r.x2 - r.x1);
      else t = (x - r.x1) / (r.x2 - r.x1);
      h = Math.max(h, r.h * clamp(t, 0, 1));
    }
    return h;
  };
  ext.railAt = (x, z) => {
    for (const r of ext.rails) {
      if (x > r.x1 - 0.3 && x < r.x2 + 0.3 && z > r.z1 && z < r.z2) return r;
    }
    return null;
  };
  ext.inPoolWater = (x, z) => {
    const w = ext.pool && ext.pool.waterRect;
    return !!w && x > w.x1 && x < w.x2 && z > w.z1 && z < w.z2;
  };
  ext.nearestFastTravel = (x, z) => {
    let best = null, bd = 6;
    for (const f of EXT.fastTravel) {
      const d = dist2D(x, z, f.x, f.z);
      if (d < bd) { bd = d; best = f; }
    }
    return best;
  };
  ext.shopById = (id) => ext.shops.find((s) => s.id === id) || null;
  ext.shopCounterAt = (x, z) => {
    for (const s of ext.shops) if (dist2D(x, z, s.counter.x, s.counter.z) < 3.4) return s;
    return null;
  };
  ext.updateVisuals = (dt, timeH) => {
    // پرچم‌ها در باد
    ext.flagT += dt;
    for (let i = 0; i < ext.flags.length; i++) {
      const f = ext.flags[i];
      f.rotation.y = Math.sin(ext.flagT * 2 + i) * 0.35;
      f.rotation.z = Math.sin(ext.flagT * 3.2 + i) * 0.12;
    }
    // آب استخر
    if (ext.pool) {
      const wm = waterMeshRef;
      if (wm) wm.position.y = 0.46 + Math.sin(ext.flagT * 1.6) * 0.03;
      for (const r of ext.pool.rings) {
        if (r.taken) continue;
        r.mesh.position.y = 0.55 + Math.sin(ext.flagT * 2 + r.phase) * 0.08;
        r.mesh.rotation.z += dt * 0.8;
      }
    }
    // حلقه‌های اسکیت
    for (const h of ext.hoops) {
      if (h.taken) continue;
      h.mesh.rotation.z += dt * 1.2;
    }
    // درخشش چراغ‌های نئون شب
    const night = timeH >= 19 || timeH < 6;
    for (const m of [M.neon, M.neonPink, M.neonBlue]) {
      m.emissiveIntensity = night ? 1.5 : 0.55;
    }
  };
  // مرجع آب استخر برای انیمیشن
  let waterMeshRef = null;
  for (const child of scene.children) {
    if (child.material === M.water) { waterMeshRef = child; break; }
  }
  return ext;
}

/* ---------- کمک برای مینی‌مپ: مسیرهای پیست ---------- */
export function trackPathPoints(ext) {
  return ext && ext.track ? ext.track.pts : [];
}

/* ============================================================
   Smoke test هدلس: اجرای واقعی کل بازی با Three.js و DOM جعلی.
   سناریوها: بوت، حرکت، هر ۸ مأموریت، رانندگی، فروشگاه،
   کوله‌پشتی، نقشه، توقف، کیفیت، ذخیره، شب/روز، توپ.
   اجرا: node test/smoke.mjs
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

/* ---------- استاب Three.js (بدون بک‌تیک!) ---------- */
const STUB = `
export class Vector3 {
  constructor(x, y, z) { this.x = x || 0; this.y = y || 0; this.z = z || 0; }
  set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; }
  copy(v) { this.x = v.x; this.y = v.y; this.z = v.z; return this; }
  clone() { return new Vector3(this.x, this.y, this.z); }
  multiplyScalar(s) { this.x *= s; this.y *= s; this.z *= s; return this; }
  normalize() { const l = Math.hypot(this.x, this.y, this.z) || 1; this.x /= l; this.y /= l; this.z /= l; return this; }
  lerp(v, t) { this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t; return this; }
}
export class Color {
  constructor(c) { this.c = c; this.r = 1; this.g = 1; this.b = 1; }
  set(v) { this.c = v; return this; }
  setHSL(h, s, l) { this.c = [h, s, l]; return this; }
  setHex(v) { this.c = v; return this; }
  copy(v) { this.c = v.c; return this; }
  clone() { return new Color(this.c); }
  lerp(v, t) { return this; }
}
export class Euler { constructor() { this.x = 0; this.y = 0; this.z = 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
export class Quaternion { setFromEuler(e) { return this; } }
export class Matrix4 { compose(p, q, s) { return this; } set() { return this; } }
class Obj {
  constructor() {
    this.position = new Vector3(); this.rotation = new Euler(); this.scale = new Vector3(1, 1, 1);
    this.children = []; this.userData = {}; this.visible = true;
  }
  add(c) { this.children.push(c); return this; }
  remove(c) { const i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); return this; }
  clone() { const o = new Obj(); o.position.copy(this.position); return o; }
  lookAt() { return this; }
}
export class Scene extends Obj { constructor() { super(); this.background = new Color(0); this.fog = null; } }
export class Group extends Obj {}
export class Mesh extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
export class Sprite extends Obj { constructor(m) { super(); this.material = m; } }
export class Points extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Geo { translate() { return this; } rotateX() { return this; } rotateZ() { return this; } computeBoundingSphere() { return this; } }
export class BoxGeometry extends Geo { constructor() { super(); } }
export class SphereGeometry extends Geo { constructor() { super(); } }
export class CylinderGeometry extends Geo { constructor() { super(); } }
export class ConeGeometry extends Geo { constructor() { super(); } }
export class PlaneGeometry extends Geo { constructor() { super(); } }
export class RingGeometry extends Geo { constructor() { super(); } }
export class TorusGeometry extends Geo { constructor() { super(); } }
export class BufferGeometry extends Geo { setAttribute() { return this; } }
export class BufferAttribute { constructor(a, n) { this.array = a; } setUsage() { return this; } }
class Mat { constructor(p) { Object.assign(this, p || {}); if (typeof this.color === 'number') this.color = new Color(this.color); } }
export class MeshLambertMaterial extends Mat {}
export class MeshBasicMaterial extends Mat {}
export class SpriteMaterial extends Mat {}
export class PointsMaterial extends Mat {}
export class CanvasTexture { constructor(c) { this.image = c; this.repeat = { set() {} }; } }
export class InstancedMesh extends Mesh {
  constructor(g, m, n) { super(g, m); this.instanceMatrix = {}; this.instanceColor = null; this.count = n; }
  setMatrixAt() {} setColorAt() { this.instanceColor = this.instanceColor || {}; }
  computeBoundingSphere() {}
}
class Light extends Obj { constructor(c, i, d, de) { super(); this.color = new Color(c); this.intensity = i; } }
export class DirectionalLight extends Light {
  constructor(c, i) { super(c, i); this.target = new Obj(); this.shadow = { mapSize: { set() {}, x: 0 }, camera: {}, map: null, bias: 0 }; }
}
export class HemisphereLight extends Light { constructor(s, g, i) { super(s, i); this.color = new Color(s); this.groundColor = new Color(g); } }
export class AmbientLight extends Light {}
export class PointLight extends Light {}
export class Fog { constructor(c, n, f) { this.color = new Color(c); this.near = n; this.far = f; } }
export class PerspectiveCamera extends Obj {
  constructor(f, a, n, fa) { super(); this.aspect = a; }
  updateProjectionMatrix() {}
}
export class Clock { getDelta() { return 0.016; } }
export class WebGLRenderer {
  constructor() { this.domElement = globalThis.document.createElement('canvas'); this.shadowMap = {}; }
  setSize() {} setPixelRatio() {} render() {}
  setAnimationLoop(fn) { globalThis.__loop = fn; }
}
export const SRGBColorSpace = 'srgb';
export const RepeatWrapping = 1;
export const AdditiveBlending = 2;
export const DoubleSide = 3;
export const BackSide = 4;
export const PCFShadowMap = 5;
export const DynamicDrawUsage = 6;
`;

/* ---------- استاب DOM ---------- */
const GLOBALS = `
function fakeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return function () { return { width: 42 }; };
      if (p === 'createRadialGradient') return function () { return { addColorStop() {} }; };
      if (p === 'getChannelData') return function () { return []; };
      return function () {};
    },
    set(t, p, v) { t[p] = v; return true; }
  });
}
function fakeEl(tag) {
  const el = {
    tagName: tag || 'div', style: {}, children: [],
    textContent: '', innerHTML: '', value: '', disabled: false,
    width: 300, height: 150, offsetWidth: 10,
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    appendChild(c) { el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); },
    remove() {},
    addEventListener() {}, removeEventListener() {},
    querySelector() { return fakeEl('button'); },
    querySelectorAll() { return []; },
    getContext() { return fakeCtx(); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 10, height: 10 }; },
    requestPointerLock() { globalThis.document.pointerLockElement = el; },
    click() {}, focus() {}, blur() {},
  };
  Object.defineProperty(el, 'firstChild', { get() { return el.children[0]; } });
  return el;
}
const registry = {};
globalThis.window = {
  innerWidth: 1280, innerHeight: 800, devicePixelRatio: 1,
  AudioContext: undefined, webkitAudioContext: undefined,
  addEventListener() {},
};
globalThis.document = {
  createElement(t) { return fakeEl(t); },
  getElementById(id) { if (!registry[id]) registry[id] = fakeEl('div'); return registry[id]; },
  addEventListener() {},
  pointerLockElement: null,
  exitPointerLock() { globalThis.document.pointerLockElement = null; },
  body: fakeEl('body'), head: fakeEl('head'),
};
const mem = {};
globalThis.localStorage = {
  getItem(k) { return k in mem ? mem[k] : null; },
  setItem(k, v) { mem[k] = String(v); },
  removeItem(k) { delete mem[k]; },
};
globalThis.location = { hash: '', pathname: '/', search: '', reload() {} };
globalThis.history = { replaceState() {} };
`;

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // ۱) کپی منابع به tmp با بازنویسی ایمپورت three
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sloc-smoke-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module' }));
  fs.writeFileSync(path.join(tmp, 'stub-three.mjs'), STUB);
  fs.writeFileSync(path.join(tmp, 'globals.mjs'), GLOBALS);
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    fs.writeFileSync(path.join(tmp, f), src.replaceAll("from 'three'", "from './stub-three.mjs'"));
  }
  console.log('== boot ==');
  await import(pathToFileURL(path.join(tmp, 'globals.mjs')).href);
  await import(pathToFileURL(path.join(tmp, 'main.js')).href);
  const game = globalThis.window.__game;
  ok('game object created', !!game);
  let tries = 0;
  while (game.state !== 'menu' && tries++ < 200) await sleep(50);
  ok('reached menu state (full world build)', game.state === 'menu');

  console.log('== world contents ==');
  ok('colliders > 150', game.world.colliders.length > 150);
  ok('21 NPCs', game.npcs.npcs.length === 21);
  ok('10 coins', game.world.coins.length === 10);
  ok('12 pickups', Object.keys(game.world.pickups).length === 12);
  ok('4 vehicles', game.vehicles.list.length === 4);
  ok('8 missions', Object.keys(game.missions.st).length === 8);

  console.log('== gameplay: start + walk ==');
  game.startPlaying(true);
  ok('playing', game.state === 'playing');
  for (let i = 0; i < 60; i++) game._frame();
  ok('60 frames run', true);
  // راه رفتن به جلو
  const z0 = game.player.z;
  game.keys.add('KeyW');
  for (let i = 0; i < 30; i++) game._frame();
  game.keys.delete('KeyW');
  ok('player moves with W', Math.abs(game.player.z - z0) > 0.5);

  console.log('== mission 1: lost bag ==');
  game.player.pos.set(8, 0, 3.5);
  for (let i = 0; i < 5; i++) game._frame();
  ok('sara interact found', game._interact && game._interact.type === 'npc');
  game.doInteract();
  ok('dialogue opened', game.ui.isOpen('dialogue'));
  game.ui.chooseOption(0);
  ok('quest accepted', game.missions.st.lost_bag.st === 'active');
  game.player.pos.set(-62, 0, 17);
  for (let i = 0; i < 5; i++) game._frame();
  ok('bag interact found', game._interact && game._interact.type === 'pickup');
  game.doInteract();
  ok('bag picked', game.inv.bag === 1 && game.missions.st.lost_bag.prog === 1);
  game.player.pos.set(8, 0, 3.5);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract();
  game.ui.chooseOption(0);
  ok('mission 1 done', game.missions.st.lost_bag.st === 'done');
  ok('coins rewarded', game.coins >= 90);

  console.log('== mission 3: football ==');
  game.player.pos.set(28, 0, 13);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract(); game.ui.chooseOption(0);
  ok('football active', game.missions.st.football.st === 'active');
  game.world._goalScored('east'); game.world.resetBall();
  game.world._goalScored('east'); game.world.resetBall();
  game.world._goalScored('west'); game.world.resetBall();
  ok('wrong goal ignored', game.missions.st.football.prog === 2);
  game.world._goalScored('east'); game.world.resetBall();
  ok('3 goals counted', game.missions.st.football.prog === 3);
  game.doInteract(); game.ui.chooseOption(0);
  ok('mission 3 done', game.missions.st.football.st === 'done');

  console.log('== mission 4: timed note (fail + success) ==');
  game.player.pos.set(8, 0, -20.5);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract(); game.ui.chooseOption(0);
  ok('timed active', game.missions.st.timed_note.st === 'active');
  ok('timer running', game.missions.getTimer() > 100);
  game.missions.update(200);
  ok('timeout fails quest', game.missions.st.timed_note.st === 'available' && game.inv.note === 0);
  game.doInteract(); game.ui.chooseOption(0);
  game.player.pos.set(19, 0, -29);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract(); game.ui.chooseOption(0);
  ok('mission 4 done', game.missions.st.timed_note.st === 'done');

  console.log('== mission 5: secret path ==');
  game.player.pos.set(-42, 0, -35);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract(); game.ui.chooseOption(0);
  ok('secret active', game.missions.st.secret_path.st === 'active');
  game.player.pos.set(-54, 0, -40);
  for (let i = 0; i < 5; i++) game._frame();
  ok('mission 5 done', game.missions.st.secret_path.st === 'done');

  console.log('== shop + mission 6 ==');
  game.addCoins(100);
  game.player.pos.set(-16, 0, 13.0);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract();
  ok('shop opened', game.ui.isOpen('shop'));
  const coinsBefore = game.coins;
  game.missions._buy({ id: 'sandwich', name: 'x', price: 15 });
  game.missions._buy({ id: 'juice', name: 'x', price: 10 });
  ok('bought food', game.inv.sandwich === 1 && game.inv.juice === 1 && game.coins === coinsBefore - 25);
  game.ui.closeShop();
  game.player.pos.set(-6, 0, 11);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract(); game.ui.chooseOption(0);
  game.doInteract(); game.ui.chooseOption(0);
  ok('mission 6 done', game.missions.st.help_student.st === 'done');

  console.log('== mission 7: cans ==');
  game.player.pos.set(-38, 0, 46);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract(); game.ui.chooseOption(0);
  for (let i = 0; i < 8; i++) game.world._takePickup('can' + i);
  ok('8 cans', game.missions.st.collect_cans.prog === 8);
  game.doInteract(); game.ui.chooseOption(0);
  ok('mission 7 done', game.missions.st.collect_cans.st === 'done');

  console.log('== mission 2: books ==');
  game.player.pos.set(-17.5, 0, -30);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract(); game.ui.chooseOption(0);
  for (let i = 0; i < 3; i++) game.world._takePickup('book' + i);
  game.player.pos.set(47.2, 0, -30.5);
  for (let i = 0; i < 5; i++) game._frame();
  ok('librarian reachable', game._interact && game._interact.type === 'npc');
  game.doInteract();
  // گزینه تحویل کتاب (اولین گزینه)
  game.ui.chooseOption(0);
  ok('mission 2 done', game.missions.st.library_books.st === 'done');

  console.log('== mission 8: riddle ==');
  game.doInteract(); // احمدی: شنیدن معما
  game.ui.chooseOption(0);
  game.ui.chooseOption(1); // جواب غلط
  ok('wrong answer retry', game.missions.st.riddle.st !== 'done');
  game.ui.chooseOption(0); // فردا
  ok('mission 8 done', game.missions.st.riddle.st === 'done');
  ok('100% complete', game.missions.completionPct() === 100);

  console.log('== vehicles ==');
  game.player.pos.set(-54, 0, 46);
  for (let i = 0; i < 5; i++) game._frame();
  ok('vehicle prompt', game._interact && game._interact.type === 'vehicle');
  game.doInteract();
  ok('driving', !!game.vehicles.active);
  const vx0 = game.vehicles.active.x, vz0 = game.vehicles.active.z;
  game.keys.add('KeyW');
  for (let i = 0; i < 60; i++) game._frame();
  game.keys.delete('KeyW');
  const moved = Math.hypot(game.vehicles.active.x - vx0, game.vehicles.active.z - vz0);
  ok('vehicle drives', moved > 2);
  game.doInteract();
  ok('exited vehicle', !game.vehicles.active && game.player.group.visible);
  // خودروی قفل
  game.player.pos.set(-42, 0, 46);
  for (let i = 0; i < 5; i++) game._frame();
  game.doInteract();
  ok('locked car stays locked', !game.vehicles.active);

  console.log('== systems ==');
  game.toggleInventory();
  ok('inventory opens', game.ui.isOpen('inventory'));
  game.toggleInventory();
  ok('inventory closes', !game.ui.isOpen('inventory'));
  game.inv.juice = 1; game.en = 10;
  game.useItem('juice');
  ok('juice restores energy', game.en > 30 && game.inv.juice === 0);
  game.toggleBigmap();
  ok('bigmap opens', game.ui.isOpen('bigmap'));
  for (let i = 0; i < 5; i++) game._frame();
  game.toggleBigmap();
  game.togglePause();
  ok('paused', game.paused);
  game.togglePause();
  ok('resumed', !game.paused);
  for (const q of ['low', 'medium', 'high']) {
    game.settings.quality = q;
    game.applyQuality();
  }
  ok('quality switch ok', true);
  game.world.kickBall(1, 0, 12);
  for (let i = 0; i < 30; i++) game._frame();
  ok('ball physics', Math.hypot(game.world.ballMesh.position.x - 44, game.world.ballMesh.position.z - 22) > 1);
  for (const h of [0, 6.5, 12, 18.5, 23]) { game.timeH = h; game._dayNight(); }
  ok('day/night sweep', true);
  game.timeH = 22;
  for (let i = 0; i < 40; i++) game._frame();
  ok('npcs sleep at night', game.npcs.npcs.some((n) => !n.group.visible));
  game.timeH = 9;
  for (let i = 0; i < 40; i++) game._frame();
  game.hp = 0;
  game._frame();
  ok('faint + respawn', game.hp === 60);
  // سکه
  const c0 = game.coins;
  game.player.pos.set(3, 0, 30);
  for (let i = 0; i < 5; i++) game._frame();
  ok('coin collected', game.coins === c0 + 5);

  console.log('== save/load ==');
  game.saveGame(true);
  const { hasSave, loadSave } = await import(pathToFileURL(path.join(tmp, 'save.js')).href);
  ok('hasSave', hasSave());
  const d = loadSave();
  ok('save has player+missions', !!(d && d.player && d.missions && d.taken && d.vehicles));
  game.missions.loadState(game.missions.stateForSave());
  ok('mission state roundtrip', true);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('SMOKE CRASH:', e); process.exit(2); });

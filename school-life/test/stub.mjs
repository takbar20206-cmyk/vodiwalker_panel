/* ============================================================
   test/stub.mjs — استاب مشترک Three.js و DOM برای تست‌های هدلس
   (استفاده در smoke.mjs و perf.test.mjs)
   ============================================================ */

export const STUB = `
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
  getHex() { return typeof this.c === 'number' ? this.c : 0xffffff; }
}
export class Euler { constructor() { this.x = 0; this.y = 0; this.z = 0; } set(x, y, z) { this.x = x; this.y = y; this.z = z; return this; } }
export class Quaternion { setFromEuler(e) { return this; } }
export class Matrix4 { compose(p, q, s) { return this; } set() { return this; } }
class Obj {
  constructor() {
    this.position = new Vector3(); this.rotation = new Euler(); this.scale = new Vector3(1, 1, 1);
    this.children = []; this.userData = {}; this.visible = true;
  }
  add(c) { if (c) { if (c.parent) c.parent.remove(c); c.parent = this; this.children.push(c); } return this; }
  remove(c) { const i = this.children.indexOf(c); if (i >= 0) { this.children.splice(i, 1); c.parent = null; } return this; }
  traverse(fn) { fn(this); for (const c of this.children) { if (c && c.traverse) c.traverse(fn); } }
  traverseVisible(fn) { if (!this.visible) return; this.traverse(fn); }
  clone() { const o = new Obj(); o.position.copy(this.position); return o; }
  lookAt() { return this; }
}
export class Scene extends Obj { constructor() { super(); this.background = new Color(0); this.fog = null; } }
export class Group extends Obj {}
export class Mesh extends Obj { constructor(g, m) { super(); this.isMesh = true; this.geometry = g; this.material = m; } }
export class Sprite extends Obj { constructor(m) { super(); this.isSprite = true; this.material = m; } }
export class Points extends Obj { constructor(g, m) { super(); this.geometry = g; this.material = m; } }
class Geo { translate() { return this; } rotateX() { return this; } rotateZ() { return this; } computeBoundingSphere() { return this; } computeVertexNormals() { return this; } dispose() { return this; } setDrawRange() { return this; } }
/* پارامترها مثل Three.js واقعی ذخیره می‌شوند (بعضی کدها از geometry.parameters استفاده می‌کنند) */
export class BoxGeometry extends Geo {
  constructor(w, h, d, ws, hs, ds) { super(); this.parameters = { width: w, height: h, depth: d, widthSegments: ws, heightSegments: hs, depthSegments: ds }; }
}
export class PlaneGeometry extends Geo {
  constructor(w, h, ws, hs) { super(); this.parameters = { width: w, height: h, widthSegments: ws, heightSegments: hs }; }
}
export class SphereGeometry extends Geo {
  constructor(r, ws, hs, ps, pl, ts, tl) { super(); this.parameters = { radius: r, widthSegments: ws, heightSegments: hs, phiStart: ps, phiLength: pl, thetaStart: ts, thetaLength: tl }; }
}
export class CylinderGeometry extends Geo {
  constructor(rt, rb, h, rs, hs, oe, ts, tl) { super(); this.parameters = { radiusTop: rt, radiusBottom: rb, height: h, radialSegments: rs, heightSegments: hs, openEnded: oe, thetaStart: ts, thetaLength: tl }; }
}
export class ConeGeometry extends Geo {
  constructor(r, h, rs, hs, oe, ts, tl) { super(); this.parameters = { radius: r, height: h, radialSegments: rs, heightSegments: hs, openEnded: oe, thetaStart: ts, thetaLength: tl }; }
}
export class RingGeometry extends Geo {
  constructor(ir, or_, ts, ps, pl) { super(); this.parameters = { innerRadius: ir, outerRadius: or_, thetaSegments: ts, phiSegments: ps, thetaLength: pl }; }
}
export class TorusGeometry extends Geo {
  constructor(r, t, rs, tts, arc) { super(); this.parameters = { radius: r, tube: t, radialSegments: rs, tubularSegments: tts, arc }; }
}
export class BufferGeometry extends Geo { setAttribute() { return this; } setIndex(i) { this.index = i; return this; } }
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
class Light extends Obj { constructor(c, i) { super(); this.isLight = true; this.color = new Color(c); this.intensity = i; } }
export class DirectionalLight extends Light {
  constructor(c, i) { super(c, i); this.target = new Obj(); this.shadow = { mapSize: { set() {}, x: 0 }, camera: {}, map: null, bias: 0 }; }
}
export class HemisphereLight extends Light { constructor(s, g, i) { super(s, i); this.color = new Color(s); this.groundColor = new Color(g); } }
export class AmbientLight extends Light {}
export class PointLight extends Light {
  constructor(c, i, d, de) { super(c, i); this.isPointLight = true; this.distance = d || 0; this.decay = de != null ? de : 1; }
}
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

export const GLOBALS = `
function fakeCtx() {
  const store = {};
  return new Proxy(store, {
    get(t, p) {
      if (p in t) return t[p];
      if (p === 'measureText') return function () { return { width: 42 }; };
      if (p === 'createRadialGradient' || p === 'createLinearGradient') return function () { return { addColorStop() {} }; };
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

/* ============================================================
   test/boot.test.mjs — تست بوت‌لودر Three.js در index.html
   سناریوها:
     ۱) کپی محلی src/lib/three.module.js موجود باشد → همان انتخاب شود
     ۲) کپی محلی نباشد → خودکار به منبع بعدی (jsDelivr) برود
     ۳) شکست یک CDN → منبع بعدی (reload با stage جدید)
     ۴) شکست همهٔ منابع اول → پنل خطا با دکمه‌های انتخاب دستی
   اجرا: node test/boot.test.mjs
   ============================================================ */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let pass = 0, fail = 0;
function ok(name, cond) {
  if (cond) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name); }
}

/* استخراج اسکریپت بوت (آخرین بلوک <script> بدون src) */
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
const bootSrc = blocks[blocks.length - 1];
ok('boot script found in index.html', !!bootSrc && bootSrc.includes('importmap'));

/* ---------- DOM جعلی ---------- */
function fakeEl(tag = 'div') {
  const el = {
    tagName: (tag || 'div').toUpperCase(), style: {}, children: [], dataset: {},
    textContent: '', innerHTML: '', value: '', className: '',
    classList: {
      _s: new Set(),
      add(c) { this._s.add(c); }, remove(c) { this._s.delete(c); },
      toggle(c, v) { if (v === undefined) { this._s.has(c) ? this._s.delete(c) : this._s.add(c); } else if (v) this._s.add(c); else this._s.delete(c); },
      contains(c) { return this._s.has(c); },
    },
    appendChild(c) { el.children.push(c); return c; },
    removeChild(c) { const i = el.children.indexOf(c); if (i >= 0) el.children.splice(i, 1); },
    addEventListener() {}, removeEventListener() {}, remove() {},
    querySelector() { return fakeEl('div'); }, querySelectorAll() { return []; },
    onclick: null, onerror: null, onload: null,
  };
  return el;
}

function makeWorld(opts = {}) {
  const registry = {};
  const head = fakeEl('head');
  const body = fakeEl('body');
  const store = {};
  const world = {
    reloads: 0, lastSearch: '', hash: '',
    document: {
      getElementById(id) { if (!registry[id]) registry[id] = fakeEl('div'); return registry[id]; },
      createElement(t) { return fakeEl(t); },
      addEventListener() {},
      head, body,
    },
    location: {
      search: opts.search || '', pathname: '/', hash: '',
      reload() { world.reloads++; },
    },
    history: { replaceState(a, b, url) { world.lastSearch = String(url || ''); } },
    sessionStorage: {
      getItem(k) { return k in store ? store[k] : null; },
      setItem(k, v) { store[k] = String(v); },
    },
    fetchResult: opts.localExists === false ? { ok: false } : { ok: true },
    fetchThrows: !!opts.fetchThrows,
    fetchCalls: [],
    _store: store,
    registry, head, body,
  };
  world.fetch = (url) => {
    world.fetchCalls.push(url);
    if (world.fetchThrows) return Promise.reject(new Error('blocked'));
    if (String(url).includes('three.module.js')) return Promise.resolve(world.fetchResult);
    return Promise.resolve({ ok: true });
  };
  return world;
}

function runBoot(world) {
  const win = { __game: null, addEventListener() {}, removeEventListener() {} };
  world.window = win;
  const fn = new Function('window', 'document', 'location', 'history', 'sessionStorage', 'fetch',
    'URLSearchParams', 'setInterval', 'clearInterval', 'setTimeout', bootSrc);
  fn(win, world.document, world.location, world.history, world.sessionStorage, world.fetch, URLSearchParams,
    () => 0, () => {}, () => 0);
  return world;
}

const importMapOf = (w) => {
  const s = w.head.children.find((c) => c.type === 'importmap');
  if (!s) return null;
  try { return JSON.parse(s.textContent); } catch (e) { return null; }
};
const moduleScriptOf = (w) => w.body.children.find((c) => c.type === 'module' && c.src);

console.log('== سناریو ۱: کپی محلی موجود است ==');
{
  const w = runBoot(makeWorld({ localExists: true }));
  await new Promise((r) => setTimeout(r, 10));
  const map = importMapOf(w);
  ok('importmap injected', !!map);
  ok('uses local three copy', map && map.imports.three === 'src/lib/three.module.js');
  const s = moduleScriptOf(w);
  ok('main.js module script added', !!s && s.src.startsWith('src/main.js'));
  ok('main.js url has build stamp', !!s && s.src.includes('?v='));
  ok('local availability checked with fetch', w.fetchCalls.some((u) => u.includes('src/lib/three.module.js')));
  ok('no reload needed', w.reloads === 0);
}

console.log('== سناریو ۲: کپی محلی نیست → منبع بعدی ==');
{
  const w = runBoot(makeWorld({ localExists: false }));
  await new Promise((r) => setTimeout(r, 10));
  ok('stage advanced in sessionStorage', w._store['sloc-three'] === '1');
  ok('page reloaded to try next source', w.reloads === 1);
  ok('no importmap yet (next page load decides)', !importMapOf(w));
}

console.log('== سناریو ۳: fetch برای بررسی کپی محلی خطا می‌دهد ==');
{
  const w = runBoot(makeWorld({ fetchThrows: true }));
  await new Promise((r) => setTimeout(r, 10));
  ok('fetch failure still advances to CDN', w._store['sloc-three'] === '1' && w.reloads === 1);
}

console.log('== سناریو ۴: منبع CDN انتخاب شده و main.js لود می‌شود ==');
{
  const w = runBoot(makeWorld({ search: '?three=1' }));
  const map = importMapOf(w);
  ok('CDN importmap injected', !!map && map.imports.three.includes('cdn.jsdelivr.net'));
  ok('CDN importmap is a module url', !!map && map.imports.three.includes('three.module'));
  const s = moduleScriptOf(w);
  ok('main.js loaded from local server', !!s && s.src.startsWith('src/main.js'));
}

console.log('== سناریو ۵: شکست یک CDN → منبع بعدی ==');
{
  const w = runBoot(makeWorld({ search: '?three=2' }));
  const s = moduleScriptOf(w);
  ok('module script present', !!s);
  if (s && s.onerror) s.onerror();
  ok('failed CDN advances stage', w._store['sloc-three'] === '3');
  ok('page reloaded for next CDN', w.reloads === 1);
}

console.log('== سناریو ۶: شکست همهٔ منابع خودکار → پنل خطا با دکمه‌ها ==');
{
  const w = runBoot(makeWorld({ search: '?three=3' }));
  const s = moduleScriptOf(w);
  if (s && s.onerror) s.onerror();
  const err = w.registry['boot-error'];
  ok('error panel shown', err && !err.classList.contains('hidden'));
  const list = w.registry['boot-sources'];
  ok('all sources offered as buttons', list && list.children.length >= 8);
  ok('each button can retry that source', list && typeof list.children[0].onclick === 'function');
  ok('loading overlay hidden on failure', w.registry['loading'].classList.contains('hidden'));
  if (list && list.children[0].onclick) {
    list.children[0].onclick();
    ok('manual pick resets stage + reloads', w._store['sloc-three'] === '0' && w.reloads >= 1);
  }
}

console.log('== بررسی‌های ایستا (HTML/CSS) ==');
{
  ok('no-cache meta present', html.includes('http-equiv="Cache-Control"') && html.includes('no-store'));
  ok('style.css is versioned', /href="style\.css\?v=\d+"/.test(html));
  ok('error panel offers local-copy hint', html.includes('src/lib/'));
  ok('at least 6 CDN candidates', (bootSrc.match(/https:\/\/[^']*three[^']*/g) || []).length >= 6);
  ok('no fetch() probe on cross-origin CDN', !/fetch\(\s*SOURCES\[[12]\]/.test(bootSrc));
}

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);

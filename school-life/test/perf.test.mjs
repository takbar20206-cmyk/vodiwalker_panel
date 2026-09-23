/* ============================================================
   test/perf.test.mjs — اندازه‌گیری وزن بارگذاری بازی
   چه چیزی را می‌سنجد؟
     • تعداد اشیای سه‌بعدی، مِش‌ها، چراغ‌ها، برخوردکننده‌ها
     • هزینهٔ تکسچرهای procedural (تعداد عملیات رسم روی canvas)
     • زمان هر مرحله از ساخت دنیا (world → extension → systems)
   اگر هر کدام از این‌ها از حد معقول بگذرد، مرورگر در صفحهٔ
   لودینگ کند/گیر می‌کند؛ این تست سقف می‌گذارد.
   اجرا: node test/perf.test.mjs
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { STUB, GLOBALS } from './stub.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let pass = 0, fail = 0;
const notes = [];
function ok(name, cond, info) {
  if (cond) { pass++; console.log('  ok  ' + name + (info ? '  (' + info + ')' : '')); }
  else { fail++; console.log('  FAIL ' + name + (info ? '  (' + info + ')' : '')); }
}
function note(text) { notes.push(text); console.log('  ·   ' + text); }

/* ---------- ابزار شمارش ---------- */
function countCanvasOps() {
  let calls = 0, canvases = 0, pixels = 0, texBytes = 0;
  const origCreate = globalThis.document.createElement.bind(globalThis.document);
  globalThis.document.createElement = function (tag) {
    const el = origCreate(tag);
    if (String(tag).toLowerCase() === 'canvas') {
      canvases++;
      const _og = el.getContext.bind(el);
      el.getContext = function (kind) {
        const ctx = _og(kind);
        if (ctx && !el.__counted) { el.__counted = true; texBytes += el.width * el.height * 4 * 1.34; }
        return ctx;
      };
      const origGet = el.getContext.bind(el);
      el.getContext = function (kind) {
        const ctx = origGet(kind);
        return new Proxy(ctx, {
          get(t, p) {
            const v = t[p];
            if (typeof v === 'function') {
              return function (...args) {
                calls++;
                const r = v.apply(t, args);
                return r;
              };
            }
            return v;
          },
        });
      };
    }
    return el;
  };
  return () => ({ calls, canvases, pixels, texBytes });
}

function countObjects(root) {
  let total = 0, meshes = 0, lights = 0, sprites = 0, instanced = 0, points = 0, shadows = 0, nearShadows = 0;
  const seen = new Set();
  const walk = (o) => {
    if (!o || seen.has(o)) return;
    seen.add(o);
    total++;
    const t = o.constructor && o.constructor.name;
    if (t === 'Mesh') meshes++;
    if (t === 'InstancedMesh') { meshes++; instanced++; }
    if (o.castShadow) { shadows++; if (o.position && Math.abs(o.position.x) <= 60 && Math.abs(o.position.z) <= 60) nearShadows++; }
    if (t === 'Sprite') sprites++;
    if (t === 'Points') points++;
    if (t && t.endsWith('Light')) lights++;
    const kids = o.children || [];
    for (const c of kids) walk(c);
  };
  walk(root);
  return { total, meshes, lights, sprites, instanced, points, shadows, nearShadows };
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sloc-perf-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module' }));
  fs.writeFileSync(path.join(tmp, 'stub-three.mjs'), STUB);
  fs.writeFileSync(path.join(tmp, 'globals.mjs'), GLOBALS);
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    fs.writeFileSync(path.join(tmp, f), src.replaceAll("from 'three'", "from './stub-three.mjs'"));
  }

  await import(pathToFileURL(path.join(tmp, 'globals.mjs')).href);
  const ops = countCanvasOps();

  console.log('== ساخت دنیا ==');
  const t0 = Date.now();
  await import(pathToFileURL(path.join(tmp, 'main.js')).href);
  const game = globalThis.window.__game;
  let tries = 0;
  while (game.state !== 'menu' && tries++ < 400) await new Promise((r) => setTimeout(r, 25));
  const bootMs = Date.now() - t0;
  ok('game reached menu', game.state === 'menu', bootMs + ' ms در Node (بدون WebGL)');

  const stats = countObjects(game.scene);
  let pointLights = 0;
  const countPt = (o) => { if (o.isPointLight) pointLights++; for (const c of o.children || []) countPt(c); };
  countPt(game.scene);
  note('اشیای صحنه: ' + stats.total + ' — مِش: ' + stats.meshes + ' (از این تعداد InstancedMesh: ' + stats.instanced + ')، Sprite: ' + stats.sprites + '، Points: ' + stats.points + '، چراغ: ' + stats.lights);
  note('برخوردکننده‌ها: ' + game.world.colliders.length + ' — NPC: ' + game.npcs.npcs.length + ' — حیوان: ' + game.animals.list.length);
  const opsReport = ops();
  note('canvas ساخته‌شده: ' + opsReport.canvases + ' — کل عملیات رسم: ' + opsReport.calls.toLocaleString('en-US'));

  console.log('== سقف‌های کارایی (مرورگر) ==');
  ok('مِش‌ها زیر ۶۵۰۰ (بارگذاری و سایه‌اندازی سریع)', stats.meshes < 6500, stats.meshes + ' mesh');
  ok('اشیای صحنه زیر ۹۰۰۰', stats.total < 9000, stats.total + ' object');
  ok('نورهای صحنه زیر ۲۵ و نور نقطه‌ای زیر ۱۰ (هزینهٔ shader/رندر)', stats.lights < 25 && pointLights < 10,
    stats.lights + ' light (' + pointLights + ' point)');
  ok('برخوردکننده‌ها زیر ۳۰۰۰', game.world.colliders.length < 3000, game.world.colliders.length + ' collider');
  ok('canvas تکسچر زیر ۲۵۰ عدد', opsReport.canvases < 250, opsReport.canvases + ' canvas');
  ok('حافظهٔ تکسچر زیر ۴۰ مگابایت', opsReport.texBytes / 1048576 < 40, (opsReport.texBytes / 1048576).toFixed(1) + ' MiB');
  ok('عملیات رسم تکسچر زیر ۴۰۰ هزار', opsReport.calls < 400000, opsReport.calls.toLocaleString('en-US') + ' op');
  ok('مِش سایه‌انداز زیر ۱۵۰۰ (هزینهٔ پاس سایه)', stats.shadows < 1500, stats.shadows + ' shadow caster');
  ok('سایه‌اندازهای داخل جعبهٔ سایهٔ ۹۶متری زیر ۸۵۰ (پاس سایه سبک)',
    stats.nearShadows < 850, stats.nearShadows + ' caster در محدودهٔ سایه');

  console.log('== سنگین‌ترین‌ها ==');
  const byType = {};
  const walk = (o) => {
    const t = (o.constructor && o.constructor.name) || '?';
    byType[t] = (byType[t] || 0) + 1;
    for (const c of o.children || []) walk(c);
  };
  walk(game.scene);
  const top = Object.entries(byType).sort((a, b) => b[1] - a[1]).slice(0, 8);
  for (const [k, v] of top) note(k + ': ' + v);
  const materials = new Set();
  const geoms = new Set();
  const collect = (o) => {
    if (o.material) materials.add(o.material);
    if (o.geometry) geoms.add(o.geometry);
    for (const c of o.children || []) collect(c);
  };
  collect(game.scene);
  note('متریال یکتا: ' + materials.size + ' — هندسهٔ یکتا: ' + geoms.size);
  ok('متریال یکتا زیر ۶۰۰ (بارگذاری سریع)', materials.size < 600, materials.size + ' material');
  ok('هندسهٔ یکتا زیر ۹۰۰ (تعداد buffer)', geoms.size < 900, geoms.size + ' geometry');

  console.log('== حلقهٔ بازی (CPU، بدون رندر) ==');
  game.startPlaying(true);
  const frameTimes = [];
  for (let i = 0; i < 90; i++) {
    const f0 = performance.now();
    game._frame();
    frameTimes.push(performance.now() - f0);
  }
  frameTimes.sort((a, b) => a - b);
  const avg = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
  const p95 = frameTimes[Math.floor(frameTimes.length * 0.95)];
  note('زمان فریم: میانگین ' + avg.toFixed(2) + ' ms — میانه ' + frameTimes[45].toFixed(2) + ' ms — p95 ' + p95.toFixed(2) + ' ms');
  ok('منطق هر فریم زیر ۸ میلی‌ثانیه (جا برای رندر ۳۰-۶۰ FPS)', avg < 8, avg.toFixed(2) + ' ms');
  ok('بدترین فریم زیر ۴۰ میلی‌ثانیه (بدون پرش)', p95 < 40, p95.toFixed(2) + ' ms');
  ok('مُش‌های صحنه در بودجهٔ draw call', stats.meshes + stats.sprites < 4000, (stats.meshes + stats.sprites) + ' draw call تقریبی');

  console.log('== مدل موجودیت‌های سنگین ==');
  ok('NPCها گشت‌زنی محدود دارند', game.npcs.npcs.every((n) => (n.queue || []).length < 12));
  ok('ذرات آب‌وهوا سقف دارند', (game.weather.pools.rain.count || 0) <= 1200 && (game.weather.pools.snow.count || 0) <= 1200,
    'rain ' + game.weather.pools.rain.count + ' / snow ' + game.weather.pools.snow.count);
  ok('استخر ذرات جشن سقف دارد', game.party.confetti.length <= 200);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('PERF CRASH:', e); process.exit(2); });

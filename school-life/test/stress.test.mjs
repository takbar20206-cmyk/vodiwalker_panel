/* ============================================================
   School Life: Open Campus — تست فشار و باگ‌گیری کامل (بدون مرورگر)
   ------------------------------------------------------------
   کارهایی که انجام می‌دهد:
     ۱) بوت کامل بازی با Three.js و DOM جعلی
     ۲) گفت‌وگو با همهٔ NPCها و زدن همهٔ گزینه‌های هر گفت‌وگو
     ۳) امتحان کردن همهٔ نقاط تعامل دنیا (کلاس، استخر، آزمایشگاه، …)
     ۴) باز کردن همهٔ فروشگاه‌ها و خرید همهٔ آیتم‌ها
     ۵) همهٔ حالت‌های آب‌وهوا، سفر سریع، دستاوردها، پنل‌ها
     ۶) تست مونکی (ورودی تصادفی) برای ۴۰۰۰ فریم + بررسی نشت حافظه
     ۷) بررسی NaN، وضعیت‌های نامعتبر و شکست‌های ذخیره/بازیابی
   اجرا: node test/stress.test.mjs
   ============================================================ */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { STUB, GLOBALS } from './stub.mjs';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');

let pass = 0, fail = 0;
const failures = [];
function ok(name, cond, info) {
  if (cond) { pass++; console.log('  ok  ' + name + (info ? '  (' + info + ')' : '')); }
  else { fail++; failures.push(name + (info ? '  -> ' + info : '')); console.log('  FAIL ' + name + (info ? '  (' + info + ')' : '')); }
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ---------- اجرای ایمن یک بلوک کد و جمع‌کردن خطاها ---------- */
const errors = [];
function guard(label, fn) {
  try { fn(); } catch (e) { errors.push(label + ': ' + (e && e.message)); return false; }
  return true;
}

/* ---------- شمارندهٔ canvas برای تشخیص نشت ---------- */
let canvasesCreated = 0;
function hookCanvasCounter() {
  const orig = globalThis.document.createElement.bind(globalThis.document);
  globalThis.document.createElement = function (tag, ...rest) {
    const el = orig(tag, ...rest);
    if (String(tag).toLowerCase() === 'canvas') canvasesCreated++;
    return el;
  };
}

function sceneCounts(game) {
  let objects = 0, meshes = 0, sprites = 0;
  const seen = new Set();
  const walk = (o) => {
    if (!o || seen.has(o)) return;
    seen.add(o);
    objects++;
    const t = o.constructor && o.constructor.name;
    if (t === 'Mesh' || t === 'InstancedMesh') meshes++;
    if (t === 'Sprite') sprites++;
    for (const c of o.children || []) walk(c);
  };
  walk(game.scene);
  const mats = new Set(), geos = new Set();
  const collect = (o) => { if (o.material) mats.add(o.material); if (o.geometry) geos.add(o.geometry); for (const c of o.children || []) collect(c); };
  collect(game.scene);
  return { objects, meshes, sprites, materials: mats.size, geometries: geos.size };
}

/* پاک‌سازی وضعیت قبل از هر بخش: بستن پنل‌ها و خارج شدن از توقف */
function settle(game) {
  for (const id of ['dialogue', 'shop', 'inventory', 'bigmap', 'settings', 'journal', 'grades',
    'achievements', 'race-menu', 'race-results', 'exam', 'exam-result', 'help', 'pause']) {
    if (game.ui.isOpen(id)) game.ui.closePanel(id);
  }
  if (game.paused) game.togglePause();
  game.keys.clear();
}

function finiteVec(p) {
  return p && Number.isFinite(p.x) && Number.isFinite(p.z) && (p.y == null || Number.isFinite(p.y));
}

async function main() {
  /* ---------- ۱) آماده‌سازی محیط ---------- */
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sloc-stress-'));
  fs.writeFileSync(path.join(tmp, 'package.json'), JSON.stringify({ type: 'module' }));
  fs.writeFileSync(path.join(tmp, 'stub-three.mjs'), STUB);
  fs.writeFileSync(path.join(tmp, 'globals.mjs'), GLOBALS);
  for (const f of fs.readdirSync(path.join(ROOT, 'src'))) {
    if (!f.endsWith('.js')) continue;
    const src = fs.readFileSync(path.join(ROOT, 'src', f), 'utf8');
    fs.writeFileSync(path.join(tmp, f), src.replaceAll("from 'three'", "from './stub-three.mjs'"));
  }

  await import(pathToFileURL(path.join(tmp, 'globals.mjs')).href);
  hookCanvasCounter();
  await import(pathToFileURL(path.join(tmp, 'main.js')).href);
  const game = globalThis.window.__game;
  ok('بازی ساخته شد', !!game);
  let tries = 0;
  while (game.state !== 'menu' && tries++ < 400) await sleep(25);
  ok('به منوی اصلی رسید (دنیا کامل ساخته شد)', game.state === 'menu', 'در ' + (tries * 25) + ' ms');
  if (game.state !== 'menu') { console.log('\n' + pass + ' passed, ' + fail + ' failed'); process.exit(1); }

  game.startPlaying(true);
  ok('ورود به بازی', game.state === 'playing');

  /* ---------- ۲) همهٔ NPCها: همهٔ گزینه‌های گفت‌وگو ---------- */
  console.log('== همهٔ NPCها و گزینه‌های گفت‌وگو ==');
  const npcs = game.npcs.npcs.slice();
  let npcTalkFail = 0, npcOptFail = 0, npcCount = 0;
  for (const n of npcs) {
    if (typeof n.onTalk !== 'function') { npcTalkFail++; errors.push('NPC بدون onTalk: ' + n.id); continue; }
    // جلوگیری از تکرار نامحدود گفت‌وگو در NPCهای داستانی
    for (let round = 0; round < 2; round++) {
      if (!guard('گفت‌وگو با ' + n.id, () => n.onTalk(n))) { npcTalkFail++; break; }
      npcCount++;
      const opts = game.ui._options || [];
      for (let i = 0; i < opts.length + 1; i++) {
        if (!guard('گزینهٔ ' + i + ' از ' + n.id, () => game.ui.chooseOption(i))) npcOptFail++;
      }
      if (game.ui.isOpen('dialogue')) game.ui.closeDialogue();
      if (game.ui.isOpen('shop')) game.ui.closeShop();
    }
    // پاک‌سازی پنل‌های باز
    for (const id of ['dialogue', 'shop', 'grades', 'journal', 'achievements', 'race-menu', 'race-results', 'exam', 'exam-result']) {
      if (game.ui.isOpen(id)) game.ui.closePanel(id);
    }
  }
  ok('همهٔ ' + npcs.length + ' NPC گفت‌وگو را بدون خطا اجرا کردند', npcTalkFail === 0, npcTalkFail ? npcTalkFail + ' خطا' : '');
  ok('همهٔ گزینه‌های گفت‌وگو بدون خطا اجرا شدند', npcOptFail === 0, npcOptFail ? npcOptFail + ' خطا' : '');

  /* ---------- ۳) همهٔ نقاط تعامل ---------- */
  console.log('== همهٔ نقاط تعامل دنیا ==');
  const points = []
    .concat(game.world.interactPoints || [])
    .concat((game.world.ext && game.world.ext.interactPoints) || []);
  let pFail = 0, pDone = 0;
  for (const it of points) {
    if (!it || it.x == null) continue;
    game.player.pos.set(it.x, 0, it.z);
    for (let i = 0; i < 3; i++) game._frame();
    if (!game._interact) continue;
    pDone++;
    if (!guard('تعامل با ' + (it.id || it.kind || it.type || '?'), () => game.doInteract())) pFail++;
    if (game.ui.isOpen('dialogue')) game.ui.chooseOption(0);
    for (const id of ['dialogue', 'shop', 'exam', 'grades']) if (game.ui.isOpen(id)) game.ui.closePanel(id);
    if (game.vehicles.active) game.doInteract();       // پیاده شو
  }
  ok('همهٔ نقاط تعامل بازی بدون خطا اجرا شدند', pFail === 0, points.length + ' نقطه، ' + pDone + ' قابل تعامل، ' + pFail + ' خطا');

  /* ---------- ۴) فروشگاه‌ها و آیتم‌ها ---------- */
  console.log('== فروشگاه‌های شهر ==');
  const shopList = (game.world.ext.shops || []);
  const shopIds = shopList.map((s) => s.id);
  let shopFail = 0, itemCount = 0;
  game.markNoSave = true;
  for (const sid of shopIds) {
    game.addCoins(5000);
    if (!guard('باز کردن فروشگاه ' + sid, () => game.openShop(sid))) { shopFail++; continue; }
    const items = game._shopItems(sid) || [];
    for (const item of items) {
      itemCount++;
      // خرید مستقیم (بدون وابستگی به DOM)
      if (!guard('خرید ' + item.id + ' از ' + sid, () => game.buyShopItem(item))) shopFail++;
    }
    if (game.ui.isOpen('shop')) game.ui.closeShop();
  }
  ok('همهٔ فروشگاه‌ها باز شدند', shopFail === 0, shopIds.length + ' فروشگاه، ' + itemCount + ' آیتم، ' + shopFail + ' خطا');

  /* ---------- ۵) آب‌وهوا، پنل‌ها، سفر سریع، دستاوردها ---------- */
  console.log('== سیستم‌های گسترش ==');
  let sysFail = 0;
  for (const mode of ['clear', 'cloudy', 'rain', 'storm', 'snow', 'fog', 'auto']) {
    if (!guard('آب‌وهوا ' + mode, () => { game.weather.set(mode, true); for (let i = 0; i < 12; i++) game._frame(); })) sysFail++;
  }
  const stations = (game.world.ext.fastTravel || []);
  for (const st of stations) {
    if (!guard('سفر سریع ' + (st.id || st.name), () => game.fastTravel(st.id))) sysFail++;
  }
  for (const a of (typeof game.achievements.list === 'function' ? game.achievements.list() : [])) {
    const id = a.id || a.key;
    if (!id) continue;
    if (!guard('دستاورد ' + id, () => game.achievements.unlock(id))) sysFail++;
  }
  const panels = [
    ['کوله‌پشتی', () => game.toggleInventory()],
    ['نقشه', () => game.toggleBigmap()],
    ['توقف', () => game.togglePause()],
    ['دفترچه', () => game.story.openJournal()],
    ['کارنامه', () => game.grades.openPanel()],
    ['دستاوردها', () => game.achievements.open()],
    ['منوی مسابقه', () => game.openRaceMenu()],
    ['راهنما', () => game.ui.openHelp()],
  ];
  for (const [name, fn] of panels) {
    if (!guard('پنل ' + name, fn)) { sysFail++; continue; }
    for (const id of ['inventory', 'bigmap', 'settings', 'journal', 'grades', 'achievements', 'race-menu', 'help', 'pause']) {
      if (game.ui.isOpen(id)) game.ui.closePanel(id);
    }
    if (game.paused) game.togglePause();
  }
  ok('سیستم‌های گسترش بدون خطا کار کردند', sysFail === 0, sysFail + ' خطا');

  /* ---------- ۶) مونکی: ۴۰۰۰ فریم ورودی تصادفی ---------- */
  console.log('== تست مونکی (۴۰۰۰ فریم) ==');
  const rnd = (n) => Math.floor(Math.random() * n);
  const keys = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'Space'];
  const before = sceneCounts(game);
  const canvasBefore = canvasesCreated;
  let monkeyErrors = 0;
  for (let f = 0; f < 4000; f++) {
    try {
      // ورودی تصادفی
      if (rnd(10) === 0) game.keys.clear();
      if (rnd(3) === 0) game.keys.add(keys[rnd(keys.length)]);
      if (rnd(400) === 0) game.jumpQueued = true;
      if (rnd(500) === 0) game.camDX = (Math.random() - 0.5) * 0.2;
      if (rnd(500) === 0) game.camDY = (Math.random() - 0.5) * 0.2;
      if (rnd(600) === 0) game.doInteract();
      if (rnd(700) === 0) {
        const opts = game.ui._options || [];
        if (game.ui.isOpen('dialogue') && opts.length) game.ui.chooseOption(rnd(opts.length));
        else if (game.ui.isOpen('dialogue')) game.ui.closeDialogue();
      }
      if (rnd(900) === 0) game.cycleWeather();
      if (rnd(1200) === 0) game.toggleRide('skate');
      if (rnd(1200) === 0) game.toggleRide('bike');
      if (rnd(1500) === 0) game.useItem('juice');
      if (rnd(2000) === 0) game.sleepInDorm();
      if (rnd(2000) === 0) game.eatCafeteria();
      if (rnd(2500) === 0) game.buyVending();
      if (rnd(2500) === 0) game.withdrawATM();
      if (rnd(2500) === 0) game.sortTrash();
      if (rnd(3000) === 0) game.toggleKite();
      if (rnd(3000) === 0) game.petAnimal();
      if (rnd(3000) === 0) game.useMicroscope();
      if (rnd(3000) === 0) game.doLabExperiment();
      if (rnd(3500) === 0) game.fastTravel((stations[rnd(Math.max(1, stations.length))] || {}).id);
      if (rnd(4000) === 0) { if (game.paused) game.togglePause(); else game.togglePause(); }
      if (rnd(80) === 0) {
        // تلپورت تصادفی در دنیا (تست بارگذاری ناحیه‌های مختلف)
        const b = 120;
        game.player.pos.set((Math.random() - 0.5) * 2 * b, 0, (Math.random() - 0.5) * 2 * b);
      }
      game._frame();
    } catch (e) {
      monkeyErrors++;
      if (monkeyErrors <= 5) errors.push('مونکی فریم ' + f + ': ' + (e && e.message));
    }
    // پنل‌های باز ممکن است حرکت را ببندند؛ گاهی ببند
    if (f % 250 === 0 && game.ui.modalOpen) {
      for (const id of ['dialogue', 'shop', 'inventory', 'bigmap', 'grades', 'journal', 'achievements', 'race-menu', 'help', 'exam', 'exam-result']) {
        if (game.ui.isOpen(id)) game.ui.closePanel(id);
      }
      if (game.paused) game.togglePause();
    }
  }
  settle(game);
  ok('۴۰۰۰ فریم تصادفی بدون خطای اجرا', monkeyErrors === 0, monkeyErrors ? monkeyErrors + ' خطا' : 'پاک');

  const after = sceneCounts(game);
  const canvasDelta = canvasesCreated - canvasBefore;

  ok('موقعیت بازیکن معتبر است (NaN ندارد)', finiteVec(game.player.pos));
  ok('شیءهای صحنه نشت نمی‌کنند', after.objects <= before.objects * 1.35 + 60,
    before.objects + ' → ' + after.objects);
  ok('مِش‌ها نشت نمی‌کنند', after.meshes <= before.meshes * 1.35 + 60, before.meshes + ' → ' + after.meshes);
  ok('متریال/هندسه پشت سر هم ساخته نمی‌شود', after.materials <= before.materials + 120 && after.geometries <= before.geometries + 120,
    'متریال ' + before.materials + '→' + after.materials + '، هندسه ' + before.geometries + '→' + after.geometries);
  ok('در حین بازی canvas تازه ساخته نمی‌شود (بدون hitch)', canvasDelta === 0, canvasDelta + ' canvas');
  ok('کلیدها و ورودی‌ها پاک می‌شوند', game.keys.size === 0);
  ok('زمان بازی جلو رفته است', game.timeH >= 0 && game.timeH < 24, 'ساعت ' + game.timeH.toFixed(2));
  ok('انرژی و سلامت در محدوده هستند', game.hp > 0 && game.hp <= 100 && game.en >= 0 && game.en <= 100, 'hp ' + Math.round(game.hp) + ' / en ' + Math.round(game.en));
  ok('سکه منفی نیست', game.coins >= 0, String(game.coins));

  /* ---------- ۷) یک مسابقهٔ کامل تا خط پایان ---------- */
  console.log('== مسابقهٔ کامل (تایم‌تریل، ۳ دور) ==');
  settle(game);
  const t = game.world.ext.track;
  const kart = game.vehicles.byId('kart1');
  game.player.pos.set(t.pts[t.startIdx].x, 0, t.pts[t.startIdx].z);
  for (let i = 0; i < 4; i++) game._frame();
  const coinsBeforeRace = game.coins;
  game.racing.start('timeTrial');
  ok('مسابقه شروع شد (شمارش معکوس)', game.racing.state === 'countdown');
  let cdGuard = 0;
  while (game.racing.state === 'countdown' && cdGuard++ < 400) game._frame();
  ok('شمارش معکوس تمام شد', game.racing.state === 'racing', 'state=' + game.racing.state);
  let raceGuard = 0;
  while (game.racing.state === 'racing' && raceGuard++ < 6000) {
    const cp = t.checkpoints[game.racing.nextCp];
    const drive = game.vehicles.byId('kart1') || game.vehicles.active;
    if (cp && drive) { drive.x = cp.x; drive.z = cp.z; }
    game._frame();
  }
  ok('مسابقه بدون گیر کردن تمام شد', game.racing.state === 'finished', raceGuard + ' فریم');
  ok('سه دور کامل شمرده شد', (game.racing.lapTimes || []).length >= 3, 'دورها: ' + JSON.stringify(game.racing.lapTimes));
  ok('رکورد پیست ثبت شد', typeof game.racing.bestLaps.timeTrial === 'number', 'بهترین دور: ' + game.racing.bestLaps.timeTrial);
  ok('جایزهٔ مسابقه داده شد', game.coins > coinsBeforeRace, '+' + (game.coins - coinsBeforeRace) + ' سکه');
  ok('پنل نتیجهٔ مسابقه باز شد', game.ui.isOpen('race-results'));
  if (game.ui.isOpen('race-results')) game.ui.closePanel('race-results');
  // خروج از پیست: همان کاری که دکمهٔ «خروج از پیست» انجام می‌دهد
  game.racing.abort();
  ok('خروج از پیست وضعیت مسابقه را آزاد می‌کند', game.racing.state === 'idle');
  // بعد از مسابقه راننده هنوز داخل کات است (عمدی) — با E پیاده می‌شود
  for (let i = 0; i < 4; i++) game._frame();
  game.doInteract();
  ok('بعد از مسابقه با E پیاده می‌شوی', !game.vehicles.active);
  // مسابقهٔ دوم بلافاصله بعد از مسابقهٔ اول
  settle(game);
  game.player.pos.set(t.pts[t.startIdx].x, 0, t.pts[t.startIdx].z);
  for (let i = 0; i < 4; i++) game._frame();
  let secondRace = false;
  guard('شروع مسابقهٔ دوم', () => { game.racing.start('sprint'); });
  secondRace = game.racing.state === 'countdown';
  ok('مسابقهٔ دوم بعد از مسابقهٔ کامل شروع می‌شود', secondRace);
  game.racing.abort();
  for (let i = 0; i < 30; i++) game._frame();
  ok('بازی بعد از دو مسابقه سالم است', Number.isFinite(game.player.pos.x) && game.racing.state === 'idle');

  /* ---------- ۸) مأموریت‌ها: وضعیت‌های نامعتبر ---------- */
  console.log('== سلامت وضعیت مأموریت‌ها ==');
  const allMissions = Object.keys(game.missions.st).concat(Object.keys(game.missions.dyn || {}));
  let badState = 0, badBudget = 0;
  for (const id of allMissions) {
    const m = game.missions.st[id] || game.missions.dyn[id];
    if (!m) { badState++; continue; }
    if (m.st != null && !['available', 'active', 'done', 'locked'].includes(m.st)) { badState++; errors.push('وضعیت نامعتبر ' + id + ': ' + m.st); }
    if (m.prog != null && !Number.isFinite(m.prog)) { badBudget++; errors.push('prog نامعتبر ' + id); }
    if (m.need != null && m.prog > m.need) { badBudget++; errors.push('prog > need در ' + id); }
  }
  ok('وضعیت همهٔ ' + allMissions.length + ' مأموریت معتبر است', badState === 0, badState + ' ایراد');
  ok('پیشرفت مأموریت‌ها منطقی است', badBudget === 0, badBudget + ' ایراد');

  /* ---------- ۸) ذخیره/بازیابی کامل ---------- */
  console.log('== ذخیره و بازیابی ==');
  game.saveGame(true);
  const { hasSave, loadSave } = await import(pathToFileURL(path.join(tmp, 'save.js')).href);
  ok('فایل ذخیره ساخته شد', hasSave());
  const data = loadSave();
  ok('ذخیره شامل همهٔ بخش‌ها است', !!(data && data.player && data.missions && data.weather && data.grades && data.story && data.racing && data.achievements && data.animals && data.flags));
  let loadFail = 0;
  if (!guard('بازیابی ذخیره', () => {
    game.grades.loadState(game.grades.stateForSave());
    game.story.loadState(game.story.stateForSave());
    game.weather.loadState(game.weather.stateForSave());
    game.missions.loadState(game.missions.stateForSave());
    game.animals.loadState(game.animals.stateForSave());
    game.achievements.loadState(game.achievements.stateForSave());
  })) loadFail++;
  ok('بازیابی وضعیت‌ها بدون خطا', loadFail === 0);
  ok('بعد از بازیابی هم فریم‌ها سالم است', (() => { try { for (let i = 0; i < 60; i++) game._frame(); return true; } catch (e) { errors.push('فریم بعد از بازیابی: ' + e.message); return false; } })());

  /* ---------- ۹) گزارش خطاهای جمع‌شده ---------- */
  console.log('\n== خطاهای جمع‌شده (' + errors.length + ') ==');
  if (errors.length) for (const e of errors.slice(0, 12)) console.log('  ·  ' + e);
  ok('هیچ خطای اجرایی در کل تست نبود', errors.length === 0);

  console.log('\n' + pass + ' passed, ' + fail + ' failed');
  if (failures.length) { console.log('— ایرادها —'); for (const f of failures) console.log('  ·  ' + f); }
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error('STRESS CRASH:', e); process.exit(2); });

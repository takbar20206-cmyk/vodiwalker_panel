/* ============================================================
   School Life: Open Campus — npc.js
   دانش‌آموزان و معلم‌ها: مدل Low-Poly، برنامه روزانه، گشت‌وگذار
   ============================================================ */
import * as THREE from 'three';
import { rand, choice, clamp, lerpAngle, resolveCollisions, dist2D, inRect } from './utils.js';
import { geoBox, geoBoxShifted, geoSph, matLambert, textSprite } from './gfx.js';
import { areaOf, AREAS, DOORS, BOUNDS } from './world.js';

const SHIRTS = [0x3b82f6, 0xef4444, 0x22c55e, 0xf59e0b, 0x8b5cf6, 0xec4899, 0x14b8a6, 0xeab308, 0x6366f1];
const PANTS = [0x2f3a4a, 0x4a3b2f, 0x334155, 0x1f2937, 0x5b5b5b];
const SKINS = [0xf2c99b, 0xe0ac69, 0xc68642, 0xa06a3b];
const HAIRS = [0x1f1a16, 0x3b2a1e, 0x6b4a2a, 0x111111, 0x7a7a7a];

export function phaseOf(h) {
  if (h >= 19.5 || h < 6.5) return 'night';
  if ((h >= 8 && h < 10) || (h >= 11 && h < 13)) return 'class';
  return 'free';
}

/* ---------- ساخت آدمک Low-Poly ---------- */
function buildHuman(o = {}) {
  const g = new THREE.Group();
  const shirt = o.shirt != null ? o.shirt : choice(SHIRTS);
  const pants = o.pants != null ? o.pants : choice(PANTS);
  const skin = o.skin != null ? o.skin : choice(SKINS);
  const hair = o.hair != null ? o.hair : choice(HAIRS);
  const H = o.height || 1.7;
  const s = H / 1.7;
  const mat = matLambert;

  const body = new THREE.Mesh(geoBox(0.56 * s, 0.72 * s, 0.34 * s), mat(shirt));
  body.position.y = 1.02 * s; body.castShadow = true; g.add(body);

  const head = new THREE.Mesh(geoSph(0.24 * s, 10, 8), mat(skin));
  head.position.y = 1.56 * s; head.castShadow = true; g.add(head);

  const hairM = new THREE.Mesh(geoBox(0.4 * s, 0.16 * s, 0.4 * s), mat(hair));
  hairM.position.y = 1.74 * s; g.add(hairM);
  if (o.longHair) {
    const back = new THREE.Mesh(geoBox(0.36 * s, 0.4 * s, 0.12 * s), mat(hair));
    back.position.set(0, 1.5 * s, -0.2 * s); g.add(back);
  }

  const legGeo = geoBoxShifted(0.2 * s, 0.66 * s, 0.24 * s, 0, -0.33 * s, 0); // چرخش از لگن
  const legL = new THREE.Mesh(legGeo, mat(pants));
  legL.position.set(-0.14 * s, 0.66 * s, 0); legL.castShadow = true; g.add(legL);
  const legR = new THREE.Mesh(legGeo, mat(pants));
  legR.position.set(0.14 * s, 0.66 * s, 0); legR.castShadow = true; g.add(legR);

  const armGeo = geoBoxShifted(0.16 * s, 0.6 * s, 0.2 * s, 0, -0.3 * s, 0); // چرخش از شانه
  const armL = new THREE.Mesh(armGeo, mat(shirt));
  armL.position.set(-0.37 * s, 1.32 * s, 0); g.add(armL);
  const armR = new THREE.Mesh(armGeo, mat(shirt));
  armR.position.set(0.37 * s, 1.32 * s, 0); g.add(armR);

  g.userData.parts = { body, head, legL, legR, armL, armR };
  return g;
}

/* ---------- مسیریابی بین محوطه و داخل ساختمان ---------- */
function routeTo(npc, tx, tz) {
  const from = areaOf(npc.group.position.x, npc.group.position.z);
  const to = areaOf(tx, tz);
  const roomDoor = { roomA: DOORS.roomA, roomB: DOORS.roomB, office: DOORS.office };
  const isRoom = (a) => a === 'roomA' || a === 'roomB' || a === 'office';
  const q = [];
  if (from === to) {
    q.push({ x: tx, z: tz });
  } else if (isRoom(from) && to === 'corridor') {
    q.push(roomDoor[from], { x: tx, z: tz });
  } else if (from === 'corridor' && isRoom(to)) {
    q.push(roomDoor[to], { x: tx, z: tz });
  } else if (isRoom(from) && to === 'out') {
    q.push(roomDoor[from], DOORS.mainIn, DOORS.mainOut, { x: tx, z: tz });
  } else if (from === 'out' && isRoom(to)) {
    q.push(DOORS.mainOut, DOORS.mainIn, roomDoor[to], { x: tx, z: tz });
  } else if (from === 'corridor' && to === 'out') {
    q.push(DOORS.mainIn, DOORS.mainOut, { x: tx, z: tz });
  } else if (from === 'out' && to === 'corridor') {
    q.push(DOORS.mainOut, DOORS.mainIn, { x: tx, z: tz });
  } else if (isRoom(from) && isRoom(to)) {
    q.push(roomDoor[from], { x: (roomDoor[from].x + roomDoor[to].x) / 2, z: -21.5 }, roomDoor[to], { x: tx, z: tz });
  } else {
    q.push({ x: tx, z: tz });
  }
  return q;
}

/* ============================================================ */
export class NPCManager {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.npcs = [];
    this.lastPhase = null;
    this.quality = 'medium';
  }

  add(def) {
    const group = buildHuman(def.look || {});
    group.position.set(def.post.x, 0, def.post.z);
    this.scene.add(group);

    const label = textSprite(def.name, {
      height: 0.5,
      bg: def.role === 'teacher' ? 'rgba(90,30,30,0.72)' : 'rgba(15,40,70,0.68)',
      border: def.quest ? '#ffd34d' : undefined,
    });
    label.position.y = 2.25;
    group.add(label);

    const npc = {
      id: def.id, name: def.name, title: def.title || '',
      role: def.role || 'student',
      group, label, marker: null,
      post: { ...def.post },
      homePost: { ...def.post },
      classPost: def.classPost ? { ...def.classPost } : null,
      yardPost: def.yardPost ? { ...def.yardPost } : null,
      zone: def.zone || null,
      patrol: def.patrol || null,
      patrolI: 0,
      static: !!def.static,
      nightHide: !!def.nightHide,
      lowHide: !!def.lowHide,
      quest: def.quest || null,
      lines: def.lines || [],
      onTalk: null,
      queue: [],
      speed: def.speed || rand(1.5, 1.9),
      walkPhase: rand(0, 6),
      moving: false,
      idleT: rand(0, 4),
      stuckT: 0,
      detours: 0,
      lastX: def.post.x, lastZ: def.post.z,
      faceYaw: rand(0, Math.PI * 2),
    };
    this.npcs.push(npc);
    return npc;
  }

  build() {
    const S = (id, name, title, post, lines, extra = {}) =>
      this.add({ id, name, title, role: 'student', post, lines, static: true, ...extra });

    S('sara', 'سارا', 'دانش‌آموز', { x: 8, z: 2 }, ['سلام! کوله‌پشتی‌ام را گم کرده‌ام...', 'آخرین بار پشت سالن ورزشی بودم.'], { quest: 'lost_bag' });
    S('kian', 'کیان', 'دانش‌آموز', { x: -6, z: 10 }, ['خیلی گرسنه‌ام...', 'کاش یک ساندویچ داشتم!'], { quest: 'help_student' });
    S('donya', 'دنیا', 'دوست محیط‌زیست', { x: -38, z: 47.5 }, ['زمین را تمیز نگه داریم!', 'قوطی‌های خالی را جمع می‌کنم.'], { quest: 'collect_cans', look: { shirt: 0x22c55e } });
    S('nima', 'نیما', 'دانش‌آموز', { x: 8, z: -21.5 }, ['عجله دارم! باید نامه‌ای به دفتر مدیر برسد.', 'می‌توانی کمکم کنی؟'], { quest: 'timed_note' });
    S('nasrin', 'نسرین', 'فروشنده بوفه', { x: -16, z: 10.4 }, ['به بوفه خوش آمدی!', 'ساندویچ تازه و آبمیوه خنک داریم.'], { look: { shirt: 0xf59e0b, longHair: true } });
    S('karimi', 'آقای کریمی', 'باغبان', { x: -42, z: -36 }, ['این باغ سال‌هاست اینجاست...', 'می‌گویند پشت ساختمان، باغ مخفی هست!'], { role: 'staff', quest: 'secret_path', look: { shirt: 0x4e8c3e, height: 1.78 } });

    // معلم‌ها و کارکنان
    this.add({ id: 'farhadi', name: 'آقای فرهادی', title: 'معلم', role: 'teacher', post: { x: -17.5, z: -31.5 }, static: true, quest: 'library_books',
      lines: ['این کتاب‌ها باید به کتابخانه برگردند.', 'کمکم می‌کنی؟'], look: { shirt: 0x334155, height: 1.8 } });
    this.add({ id: 'ahmadi', name: 'آقای احمدی', title: 'کتابدار', role: 'teacher', post: { x: 50.3, z: -30.5 }, static: true, quest: 'riddle',
      lines: ['سکوت لطفاً! اینجا کتابخانه است.', 'معمایی دارم که کسی حلش نکرده...'], look: { shirt: 0x6b4a2a, height: 1.76 } });
    this.add({ id: 'rostami', name: 'مربی رستمی', title: 'مربی فوتبال', role: 'teacher', post: { x: 28, z: 12 }, static: true, quest: 'football',
      lines: ['می‌خواهی در آزمون فوتبال شرکت کنی؟', 'سه گل به دروازه شرقی بزن!'], look: { shirt: 0xef4444, height: 1.82 } });
    this.add({ id: 'rezaei', name: 'خانم رضایی', title: 'مدیر مدرسه', role: 'teacher', post: { x: 19, z: -31.6 }, static: true,
      lines: ['در مدرسه ما نظم حرف اول را می‌زند.', 'کاری داشتی عزیزم؟'], look: { shirt: 0x7c3aed, longHair: true, height: 1.74 } });
    // گشت راهرو
    this.add({ id: 'sadeghi', name: 'خانم صادقی', title: 'معلم', role: 'teacher', post: { x: -24, z: -21.5 }, nightHide: true,
      patrol: [{ x: -24, z: -21.5 }, { x: 24, z: -21.5 }],
      lines: ['به کلاس برگرد عزیزم.', 'زنگ تفریح کی می‌خورد؟'],
      look: { shirt: 0x0ea5e9, longHair: true, height: 1.72 } });

    // دانش‌آموزان با برنامه روزانه (کلاس ↔ حیاط)
    const students = [
      { id: 'st1', name: 'امیر', classPost: { x: -22.2, z: -29.2 }, yardPost: { x: -12, z: 8 } },
      { id: 'st2', name: 'نگار', classPost: { x: -15.8, z: -29.2 }, yardPost: { x: 12, z: 16 }, look: { longHair: true } },
      { id: 'st3', name: 'پارسا', classPost: { x: -3.2, z: -29.2 }, yardPost: { x: 14, z: 4 } },
      { id: 'st4', name: 'ترانه', classPost: { x: 3.2, z: -29.2 }, yardPost: { x: -14, z: 20 }, look: { longHair: true }, lowHide: true },
    ];
    for (const s of students) {
      this.add({
        id: s.id, name: s.name, title: 'دانش‌آموز', role: 'student',
        post: { ...s.classPost }, classPost: s.classPost, yardPost: s.yardPost,
        nightHide: true, lowHide: !!s.lowHide, lines: ['زنگ تفریح کی می‌خورد؟', 'امتحان ریاضی سخته!'], look: s.look || {},
      });
    }

    // ولگردهای محوطه
    const roamZones = {
      yard: { x1: -24, z1: -14, x2: 24, z2: 28 },
      field: { x1: 24, z1: 10, x2: 62, z2: 34 },
      park: { x1: -56, z1: 36, x2: -36, z2: 50 },
    };
    const roamers = [
      { id: 'rm1', name: 'بردیا', zone: 'yard' },
      { id: 'rm2', name: 'یسنا', zone: 'yard', look: { longHair: true }, lowHide: true },
      { id: 'rm3', name: 'آرش', zone: 'field' },
      { id: 'rm4', name: 'مهرسا', zone: 'field', look: { longHair: true }, lowHide: true },
      { id: 'rm5', name: 'کیارش', zone: 'park', lowHide: true },
      { id: 'rm6', name: 'هستی', zone: 'park', look: { longHair: true }, lowHide: true },
    ];
    for (const r of roamers) {
      const z = roamZones[r.zone];
      this.add({
        id: r.id, name: r.name, title: 'دانش‌آموز', role: 'student',
        post: { x: (z.x1 + z.x2) / 2 + rand(-4, 4), z: (z.z1 + z.z2) / 2 + rand(-4, 4) },
        zone: r.zone, nightHide: true, lowHide: !!r.lowHide,
        lines: ['هوا امروز عالیه!', 'بعد از مدرسه فوتبال؟', 'ناهار چی داریم؟'], look: r.look || {},
      });
    }
    this.roamZones = roamZones;
    this.buildExtended();
  }

  /* ---------- اهالی محله‌های جدید: شهر، خوابگاه، استخر، پیست ---------- */
  buildExtended() {
    const Z = this.roamZones;
    Z.city     = { x1: -62, z1: 76, x2: 62, z2: 88 };
    Z.cityWest = { x1: -104, z1: 80, x2: -78, z2: 88 };
    Z.parkCity = { x1: -100, z1: 62, x2: -88, z2: 76 };
    Z.skate    = { x1: 82,  z1: 62, x2: 106, z2: 86 };
    Z.dormYard = { x1: -100, z1: 32, x2: -80, z2: 46 };
    Z.poolYard = { x1: 76,  z1: -4,  x2: 100, z2: 6 };
    Z.pitYard  = { x1: -4,  z1: -68, x2: 20,  z2: -58 };

    // --- فروشنده‌های شهر (پشت پیشخوان هر مغازه) ---
    const sellers = [
      { id: 'javadi', name: 'آقای جوادی',  x: -70, shirt: 0x3b82f6, kind: 'super' },
      { id: 'parisa', name: 'خانم پریسا',  x: -46, shirt: 0xef4444, kind: 'pizza', longHair: true },
      { id: 'kamran', name: 'کامران',      x: -22, shirt: 0x22c55e, kind: 'ice' },
      { id: 'leila',  name: 'خانم لیلا',   x: 2,   shirt: 0x8b5cf6, kind: 'book', longHair: true },
      { id: 'saeed',  name: 'آقای سعید',   x: 26,  shirt: 0xf59e0b, kind: 'toy' },
      { id: 'shirin', name: 'خانم شیرین',  x: 50,  shirt: 0x14b8a6, kind: 'clinic', longHair: true },
      { id: 'babak',  name: 'بابک',        x: -88, shirt: 0x6b4a2a, kind: 'cafe' },
    ];
    for (const s of sellers) {
      this.add({
        id: s.id, name: s.name, title: 'فروشنده', role: 'staff', static: true,
        post: { x: s.x, z: 100.4 },
        lines: ['به مغازهٔ ما خوش آمدی!', 'امروز تخفیف داریم!'],
        look: { shirt: s.shirt, longHair: !!s.longHair },
      });
    }

    // --- اهالی خوابگاه و سالن غذاخوری ---
    this.add({ id: 'naderi', name: 'آقای نادری', title: 'مسئول خوابگاه', role: 'staff', static: true,
      post: { x: -80, z: 14.6 }, lines: ['خوابگاه آفتاب اینجاست.', 'اتاق خالی برایت داریم!'],
      look: { shirt: 0x334155, height: 1.78 } });
    this.add({ id: 'rahimi', name: 'آقای رحیمی', title: 'آشپز', role: 'staff', static: true,
      post: { x: -97, z: -25.4 }, lines: ['غذای امروز: کوکو سبزی!', 'دست‌پخت خودم است 🍲'],
      look: { shirt: 0xf2c94c, height: 1.76 } });

    // --- استخر، آزمایشگاه، پیست اسکیت و پیست مسابقه ---
    this.add({ id: 'bahrami', name: 'مربی بهرامی', title: 'مربی شنا', role: 'teacher', static: true,
      post: { x: 102.5, z: -20 }, lines: ['قبل از شنا گرم کن!', 'حلقه‌ها را از آب بگیر!'],
      look: { shirt: 0x0ea5e9, height: 1.8 } });
    this.add({ id: 'mousavi', name: 'خانم موسوی', title: 'معلم علوم', role: 'teacher', static: true,
      post: { x: 50.5, z: -5 }, lines: ['به آزمایشگاه خوش آمدی!', 'میکروسکوپ آماده است 🔬'],
      look: { shirt: 0xffffff, longHair: true, height: 1.72 } });
    this.add({ id: 'arash', name: 'آرش', title: 'اسکیت‌باز', role: 'student', static: true,
      post: { x: 95, z: 70 }, lines: ['پارک اسکیت شهر عالیه!', 'از رمپ‌ها بپر و ترفند بزن 🛹'],
      look: { shirt: 0xe0563f } });
    this.add({ id: 'kaveh', name: 'کاوه', title: 'مسئول پیست', role: 'staff', static: true,
      post: { x: 12, z: -66 }, lines: ['پیست آفتاب باز است!', 'کلید R برای مسابقه 🏁'],
      look: { shirt: 0x2f3a4a, height: 1.8 } });

    // --- مدرسه: معاون، معلم هنر، نگهبان، تعمیرکار دوچرخه ---
    this.add({ id: 'nazanin', name: 'خانم نازنین', title: 'معاون', role: 'teacher', static: true,
      post: { x: 0, z: 12 }, lines: ['جشن پایان سال نزدیک است!', 'بادکنک و کیک لازم داریم 🎈'],
      look: { shirt: 0xec4899, longHair: true, height: 1.72 } });
    this.add({ id: 'nikpour', name: 'خانم نیک‌پور', title: 'معلم هنر', role: 'teacher', static: true,
      post: { x: 2.6, z: -26.2 }, lines: ['رنگ‌ها را قاطی کن!', 'نقاشی‌ات را روی دیوار بزن 🎨'],
      look: { shirt: 0x8b5cf6, longHair: true, height: 1.7 } });
    this.add({ id: 'naser', name: 'نگهبان ناصر', title: 'نگهبان', role: 'staff', static: true,
      post: { x: 6, z: 53 }, lines: ['مواظب دروازه‌ام.', 'شب‌ها دروازه بسته است 🌙'],
      look: { shirt: 0x1f2937, height: 1.82 } });
    this.add({ id: 'farid', name: 'آقای فرید', title: 'تعمیرکار دوچرخه', role: 'staff', static: true,
      post: { x: 94, z: 74 }, lines: ['دوچرخه‌ات را برایت آماده کردم!', 'کلید B برای رکاب زدن 🚲'],
      look: { shirt: 0x9aa3ad, height: 1.78 } });

    // --- عابرهای شهر ---
    const peds = [
      { id: 'ped1', name: 'میلاد', zone: 'city', shirt: 0x6366f1 },
      { id: 'ped2', name: 'شادی', zone: 'city', shirt: 0xff8fb1, longHair: true },
      { id: 'ped3', name: 'بهنام', zone: 'cityWest', shirt: 0x4aa96c },
      { id: 'ped4', name: 'رؤیا', zone: 'city', shirt: 0xeab308, longHair: true, lowHide: true },
      { id: 'ped5', name: 'سینا', zone: 'parkCity', shirt: 0x0ea5e9 },
      { id: 'ped6', name: 'لیلا', zone: 'parkCity', shirt: 0xef4444, longHair: true, lowHide: true },
      { id: 'ped7', name: 'امید', zone: 'skate', shirt: 0xe0563f },
      { id: 'ped8', name: 'غزل', zone: 'skate', shirt: 0x8b5cf6, longHair: true, lowHide: true },
      { id: 'ped9', name: 'حسام', zone: 'dormYard', shirt: 0x14b8a6 },
      { id: 'ped10', name: 'نیلوفر', zone: 'dormYard', shirt: 0xf59e0b, longHair: true, lowHide: true },
      { id: 'ped11', name: 'آرمین', zone: 'poolYard', shirt: 0x3b82f6 },
      { id: 'ped12', name: 'سارینا', zone: 'poolYard', shirt: 0x22c55e, longHair: true, lowHide: true },
      { id: 'ped13', name: 'فرزاد', zone: 'pitYard', shirt: 0x8b5cf6 },
    ];
    const lines = ['شهر آفتاب جای قشنگیه!', 'بعد از مدرسه کجا بریم؟', 'استخر امشب شلوغه!', 'پیست ماشین‌سواری داری؟', 'بستنی اینجا خیلی خوشمزه‌ست!'];
    for (const pd of peds) {
      const z = this.roamZones[pd.zone];
      this.add({
        id: pd.id, name: pd.name, title: 'شهروند', role: 'student',
        post: { x: rand(z.x1, z.x2), z: rand(z.z1, z.z2) },
        zone: pd.zone, zonePool: [pd.zone], nightHide: true, lowHide: !!pd.lowHide,
        lines, look: { shirt: pd.shirt, longHair: !!pd.longHair },
      });
    }
  }

  npcById(id) { return this.npcs.find((n) => n.id === id); }

  setMarker(id, mark) {
    const npc = this.npcById(id);
    if (!npc) return;
    if (npc.marker) { npc.group.remove(npc.marker); npc.marker = null; }
    if (!mark) return;
    const conf = mark === 'star'
      ? { text: '★', bg: '#1d7a34', fg: '#fff' }
      : { text: '!', bg: '#c9a100', fg: '#1a1a1a' };
    const m = textSprite(conf.text, { height: 0.55, bg: conf.bg, fg: conf.fg, size: 52 });
    m.position.y = 2.85;
    npc.group.add(m);
    npc.marker = m;
  }

  nearestTalkable(x, z, maxR = 3.2) {
    let best = null, bd = maxR;
    for (const n of this.npcs) {
      if (!n.group.visible) continue;
      const d = dist2D(x, z, n.group.position.x, n.group.position.z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  setQuality(q) {
    this.quality = q;
    const hide = q === 'low';
    for (const n of this.npcs) {
      if (n.lowHide) n.group.visible = !hide && !(n.nightHide && this.lastPhase === 'night');
    }
  }

  /* ---------- حلقه اصلی ---------- */
  update(dt, timeH, playerPos) {
    const phase = phaseOf(timeH);
    if (phase !== this.lastPhase) {
      this._onPhaseChange(phase);
      this.lastPhase = phase;
    }
    const colliders = this.world.colliders;
    for (const n of this.npcs) {
      if (!n.group.visible) continue;
      if (n.lowHide && this.quality === 'low') continue;
      const gp = n.group.position;
      const pd = dist2D(playerPos.x, playerPos.z, gp.x, gp.z);
      const far = pd > 45;

      // حرکت در صف مسیر
      n.moving = false;
      if (n.queue.length > 0) {
        const t = n.queue[0];
        const d = dist2D(gp.x, gp.z, t.x, t.z);
        if (d < 0.6) {
          n.queue.shift();
          n.stuckT = 0; n.detours = 0;
        } else {
          const dx = (t.x - gp.x) / d, dz = (t.z - gp.z) / d;
          const step = n.speed * dt;
          const p = { x: gp.x + dx * step, z: gp.z + dz * step };
          resolveCollisions(p, 0.35, colliders);
          const moved = dist2D(gp.x, gp.z, p.x, p.z);
          const lim = BOUNDS - 6;
          gp.x = clamp(p.x, -lim, lim);
          gp.z = clamp(p.z, -lim, lim);
          n.faceYaw = Math.atan2(dx, dz);
          n.moving = moved > step * 0.25;
          // تشخیص گیر کردن
          if (!n.moving) {
            n.stuckT += dt;
            if (n.stuckT > 1.1 && n.detours < 3) {
              n.stuckT = 0; n.detours++;
              const px = -dz, pz = dx;
              const s = n.detours % 2 === 0 ? 3 : -3;
              n.queue.unshift({ x: gp.x + px * s + dx * 2, z: gp.z + pz * s + dz * 2 });
            } else if (n.stuckT > 2.5) {
              n.queue.shift(); n.stuckT = 0; // بی‌خیال این نقطه
            }
          } else {
            n.stuckT = 0;
          }
        }
      } else {
        this._idle(n, dt, phase);
      }

      // چرخش بدن
      if (n.moving) {
        n.group.rotation.y = lerpAngle(n.group.rotation.y, n.faceYaw, dt * 8);
        if (!far) {
          n.walkPhase += dt * n.speed * 4.4;
          this._animate(n, Math.sin(n.walkPhase) * 0.55);
        }
      } else {
        // نزدیک بازیکن: رو به بازیکن
        if (pd < 4.5) {
          const yaw = Math.atan2(playerPos.x - gp.x, playerPos.z - gp.z);
          n.group.rotation.y = lerpAngle(n.group.rotation.y, yaw, dt * 5);
        } else if (!n.static) {
          n.group.rotation.y = lerpAngle(n.group.rotation.y, n.faceYaw, dt * 2);
        }
        if (!far) this._animate(n, 0);
      }
      // لیبل و مارکر
      n.label.visible = pd < 30;
      if (n.marker) {
        n.marker.visible = pd < 45;
        n.marker.position.y = 2.85 + Math.sin(performance.now() * 0.004 + gp.x) * 0.12;
      }
    }
  }

  _animate(n, swing) {
    const P = n.group.userData.parts;
    P.legL.rotation.x = swing;
    P.legR.rotation.x = -swing;
    P.armL.rotation.x = -swing * 0.8;
    P.armR.rotation.x = swing * 0.8;
    P.body.position.y = 1.02 + (swing !== 0 ? Math.abs(Math.sin(n.walkPhase)) * 0.035 : Math.sin(performance.now() * 0.002) * 0.008);
  }

  _idle(n, dt, phase) {
    if (n.static) return;
    n.idleT -= dt;
    if (n.idleT > 0) return;
    n.idleT = rand(2, 6);
    if (n.patrol) {
      n.patrolI = (n.patrolI + 1) % n.patrol.length;
      const t = n.patrol[n.patrolI];
      n.queue = routeTo(n, t.x, t.z);
    } else if (n.zone && this.roamZones[n.zone]) {
      const z = this.roamZones[n.zone];
      n.queue = [{ x: rand(z.x1, z.x2), z: rand(z.z1, z.z2) }];
    } else if (n.classPost && n.yardPost) {
      // جابه‌جایی کوچک اطراف پست فعلی
      const c = phase === 'class' ? n.classPost : n.yardPost;
      n.queue = [{ x: c.x + rand(-2.5, 2.5), z: c.z + rand(-2, 2) }];
    }
  }

  _onPhaseChange(phase) {
    for (const n of this.npcs) {
      if (n.static) continue;
      if (phase === 'night') {
        if (n.nightHide) {
          n.group.visible = false;
          if (n.classPost) n.group.position.set(n.classPost.x, 0, n.classPost.z);
          n.queue = [];
        }
        continue;
      }
      // صبح: برگرداندن
      if (n.nightHide) {
        if (n.lowHide && this.quality === 'low') continue;
        n.group.visible = true;
      }
      if (n.classPost && n.yardPost) {
        const t = phase === 'class' ? n.classPost : n.yardPost;
        n.queue = routeTo(n, t.x + rand(-1, 1), t.z + rand(-1, 1));
      } else if (n.id === 'sadeghi') {
        if (phase === 'class') {
          n.queue = routeTo(n, -24, -21.5);
          n.patrol = [{ x: -24, z: -21.5 }, { x: 24, z: -21.5 }];
        } else {
          n.queue = routeTo(n, 10, 14);
          n.patrol = [{ x: 10, z: 14 }, { x: -12, z: 6 }, { x: 4, z: 24 }];
        }
        n.patrolI = 0;
      } else if (n.zone) {
        // تعویض محوطه گشت در فاز جدید
        const keys = n.zonePool || Object.keys(this.roamZones);
        const zi = (keys.indexOf(n.zone) + 1) % keys.length;
        n.zone = keys[zi];
        const z = this.roamZones[n.zone];
        n.queue = [{ x: rand(z.x1, z.x2), z: rand(z.z1, z.z2) }];
      }
    }
  }

  /** اطلاعات برای مینی‌مپ */
  mapPoints() {
    const pts = [];
    for (const n of this.npcs) {
      if (!n.group.visible) continue;
      pts.push({ x: n.group.position.x, z: n.group.position.z, quest: !!n.marker, teacher: n.role === 'teacher' });
    }
    return pts;
  }
}

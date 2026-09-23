/* ============================================================
   School Life: Open Campus — achievements.js
   ۳۰ دستاورد + آمار زندهٔ بازیکن
   ============================================================ */
import { clamp, faNum } from './utils.js';

export const ACHIEVEMENTS = [
  { id: 'first_step',  name: 'اولین قدم',        icon: '👟', desc: '۱۰ متر در محوطه راه برو',            kind: 'num', key: 'walk',    goal: 10 },
  { id: 'walker',      name: 'پیادهٔ حرفه‌ای',   icon: '🚶', desc: '۲ کیلومتر پیاده‌روی کن',             kind: 'num', key: 'walk',    goal: 2000 },
  { id: 'sprinter',    name: 'دونده',            icon: '🏃', desc: '۵۰۰ متر بدو',                        kind: 'num', key: 'run',     goal: 500 },
  { id: 'driver',      name: 'رانندهٔ تازه‌کار', icon: '🚗', desc: '۱ کیلومتر رانندگی کن',               kind: 'num', key: 'drive',   goal: 1000 },
  { id: 'racer',       name: 'مسابقه‌دهنده',      icon: '🏁', desc: 'یک مسابقه را تمام کن',               kind: 'num', key: 'races',   goal: 1 },
  { id: 'champion',    name: 'قهرمان پیست',      icon: '🏆', desc: 'یک مسابقه را ببر',                   kind: 'num', key: 'wins',    goal: 1 },
  { id: 'legend',      name: 'افسانهٔ پیست',     icon: '🥇', desc: 'سه مسابقه را ببر',                   kind: 'num', key: 'wins',    goal: 3 },
  { id: 'skater',      name: 'اسکیت‌سوار',       icon: '🛹', desc: '۵ حرکت روی تخته‌اسکیت بزن',           kind: 'num', key: 'tricks',  goal: 5 },
  { id: 'grinder',     name: 'ریل‌سوار',         icon: '⚡', desc: '۳ بار روی ریل سر بخور',              kind: 'num', key: 'rails',   goal: 3 },
  { id: 'hooper',      name: 'حلقه‌باز',         icon: '🎯', desc: 'از ۳ حلقهٔ اسکیت بگذر',               kind: 'num', key: 'hoops',   goal: 3 },
  { id: 'swimmer',     name: 'شناگر',            icon: '🏊', desc: '۳۰ ثانیه شنا کن',                    kind: 'num', key: 'swim',    goal: 30 },
  { id: 'diver',       name: 'شیرجه‌زن',         icon: '🤿', desc: 'از تختهٔ شیرجه بپر',                 kind: 'num', key: 'dives',   goal: 1 },
  { id: 'rings',       name: 'جمع‌کنندهٔ حلقه‌ها', icon: '💍', desc: '۵ حلقهٔ استخر را بگیر',               kind: 'num', key: 'rings',   goal: 5 },
  { id: 'collector',   name: 'گردآورندهٔ سکه',   icon: '🪙', desc: '۱۰۰ سکه جمع کن',                     kind: 'num', key: 'coins',   goal: 100 },
  { id: 'rich',        name: 'پولدار محله',      icon: '💰', desc: '۳۰۰ سکه داشته باش',                  kind: 'num', key: 'maxCoins', goal: 300 },
  { id: 'recycler',    name: 'بازیافت‌کار',      icon: '♻️', desc: '۵ بار زباله جدا کن',                  kind: 'num', key: 'recycle', goal: 5 },
  { id: 'bookworm',    name: 'کتاب‌خوان',         icon: '📚', desc: '۳ بار مطالعه کن',                    kind: 'num', key: 'study',   goal: 3 },
  { id: 'top_student', name: 'شاگرد اول',        icon: '🎓', desc: 'معدل ۱۸ به بالا بگیر',               kind: 'num', key: 'gpa18',   goal: 1 },
  { id: 'exam_master', name: 'استاد امتحان',     icon: '🧠', desc: '۳ امتحان با نمرهٔ ۱۶+ بده',          kind: 'num', key: 'goodExams', goal: 3 },
  { id: 'scientist',   name: 'دانشمند کوچک',     icon: '🔬', desc: 'یک آزمایش علمی انجام بده',           kind: 'num', key: 'labs',    goal: 1 },
  { id: 'animal_friend', name: 'دوست حیوانات',   icon: '🐈', desc: '۳ بار به حیوان غذا بده',             kind: 'num', key: 'fed',     goal: 3 },
  { id: 'cat_person',  name: 'رفیق پیشی',        icon: '🐾', desc: 'پیشی را ۳ بار نوازش کن',              kind: 'num', key: 'pets',    goal: 3 },
  { id: 'pigeon_man',  name: 'کبوترپرون',        icon: '🕊️', desc: '۵ بار کبوترها را پر بده',             kind: 'num', key: 'pigeons', goal: 5 },
  { id: 'kite_flyer',  name: 'بادبادک‌باز',      icon: '🪁', desc: '۳۰ ثانیه بادبادک پرواز بده',          kind: 'num', key: 'kite',    goal: 30 },
  { id: 'rain_walker', name: 'زیر باران',        icon: '🌧️', desc: '۳۰ ثانیه زیر باران راه برو',          kind: 'num', key: 'rainTime', goal: 30 },
  { id: 'snow_man',    name: 'برف‌باز',          icon: '⛄', desc: 'آدم‌برفی را پیدا کن',                 kind: 'num', key: 'snowman', goal: 1 },
  { id: 'night_owl',   name: 'شب‌زنده‌دار',      icon: '🌙', desc: 'بعد از نیمه‌شب بیدار باش',             kind: 'num', key: 'midnight', goal: 1 },
  { id: 'bus_rider',   name: 'مسافر اتوبوس',     icon: '🚌', desc: 'با اتوبوس شهر سفر کن',               kind: 'num', key: 'bus',     goal: 1 },
  { id: 'shopper',     name: 'خریدار',           icon: '🛒', desc: '۵ بار خرید کن',                      kind: 'num', key: 'shops',   goal: 5 },
  { id: 'explorer',    name: 'کاشف شهر',         icon: '🗺️', desc: 'همهٔ نقاط سفر سریع را ببین',          kind: 'num', key: 'travel',  goal: 5 },
  { id: 'storyteller', name: 'داستان‌گو',        icon: '📖', desc: '۵ مأموریت داستانی را کامل کن',        kind: 'num', key: 'story',   goal: 5 },
  { id: 'party_animal', name: 'رقصندهٔ جشن',     icon: '💃', desc: 'در رقص جشن شرکت کن',                 kind: 'num', key: 'dance',   goal: 1 },
  { id: 'hero',        name: 'قهرمان مدرسه',     icon: '🏅', desc: 'همهٔ مأموریت‌ها را کامل کن',           kind: 'num', key: 'missions', goal: 24 },
];

const KIND_LABEL = { num: 'شمارشی' };

export class Achievements {
  constructor(ctx) {
    this.ctx = ctx;      // {ui, audio, game}
    this.unlocked = new Set();
    this.c = {};
    for (const a of ACHIEVEMENTS) this.c[a.key] = 0;
    this.t = 0;
    this.stats = { playtime: 0, distance: 0, missions: 0, bestLap: null, exams: 0 };
    this.recent = [];
  }

  get game() { return this.ctx.game; }
  get ui() { return this.ctx.ui; }
  get audio() { return this.ctx.audio; }

  bump(key, n = 1) {
    this.c[key] = (this.c[key] || 0) + n;
    this._check();
  }

  setMax(key, v) {
    this.c[key] = Math.max(this.c[key] || 0, v);
    this._check();
  }

  unlock(id, quiet) {
    if (this.unlocked.has(id)) return false;
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return false;
    this.unlocked.add(id);
    this.recent.push({ id: a.id, name: a.name, t: performance.now() });
    if (!quiet) {
      this.audio.play('secret');
      this.ui.banner('دستاورد جدید! ' + a.icon, a.name + ' — ' + a.desc);
    }
    return true;
  }

  _check() {
    for (const a of ACHIEVEMENTS) {
      if (this.unlocked.has(a.id)) continue;
      if (a.kind === 'num' && (this.c[a.key] || 0) >= a.goal) this.unlock(a.id);
    }
  }

  /** ctx: {dist, run, drive, swim, rain, timeH, coins, racing, night} */
  update(dt, x) {
    this.stats.playtime += dt;
    if (x.dist > 0) {
      if (x.driving) { this.c.drive += x.dist; this.stats.distance += x.dist; }
      else {
        this.c.walk += x.dist;
        if (x.sprinting) this.c.run += x.dist;
      }
    }
    if (x.swim) this.c.swim += dt;
    if (x.rain) this.c.rainTime += dt;
    if (x.kite) this.c.kite += dt;
    if (x.coins != null) this.setMax('maxCoins', x.coins);
    if (x.timeH != null && x.timeH >= 0 && x.timeH < 4.5) this.c.midnight += dt;
    if (this.c.midnight >= 2) this.unlock('night_owl');
    if (x.gpa != null && x.gpa >= 18) this.unlock('top_student');
    this.t += dt;
    if (this.t >= 1.2) { this.t = 0; this._check(); }
  }

  count() { return this.unlocked.size; }
  total() { return ACHIEVEMENTS.length; }
  pct() { return Math.round((this.count() / ACHIEVEMENTS.length) * 100); }

  list() {
    return ACHIEVEMENTS.map((a) => ({
      ...a,
      done: this.unlocked.has(a.id),
      progress: a.kind === 'num' ? clamp((this.c[a.key] || 0) / a.goal, 0, 1) : 0,
      have: a.kind === 'num' ? Math.floor(this.c[a.key] || 0) : 0,
      goalText: a.kind === 'num' ? faNum(a.goal) : '',
      haveText: a.kind === 'num' ? faNum(Math.floor(this.c[a.key] || 0)) : '',
    }));
  }

  open() {
    if (this.ui.achievements) this.ui.achievements(this.list(), {
      unlocked: this.count(), total: this.total(), pct: this.pct(),
      playtime: Math.round(this.stats.playtime),
      distance: Math.round(this.stats.distance),
    });
  }

  stateForSave() {
    return {
      unlocked: [...this.unlocked],
      counters: { ...this.c },
      stats: { playtime: Math.round(this.stats.playtime), distance: Math.round(this.stats.distance) },
    };
  }

  loadState(s) {
    if (!s) return;
    if (Array.isArray(s.unlocked)) this.unlocked = new Set(s.unlocked);
    if (s.counters) for (const k in s.counters) this.c[k] = s.counters[k];
    if (s.stats) { this.stats.playtime = s.stats.playtime || 0; this.stats.distance = s.stats.distance || 0; }
  }
}

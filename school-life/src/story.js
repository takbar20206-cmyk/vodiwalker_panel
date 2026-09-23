/* ============================================================
   School Life: Open Campus — story.js
   کمپین داستانی: ۴ فصل × ۳ مأموریت + ۴ مأموریت جانبی (کل: ۱۶)
   دفترچهٔ داستان، گفت‌وگوها و زنجیرهٔ رویدادها
   ============================================================ */
import * as THREE from 'three';
import { clamp, rand, dist2D, faNum, inRect } from './utils.js';

export const CHAPTERS = [
  { id: 'ch1', title: 'فصل اول: روز اول',      icon: '🌅', quests: ['welcome_tour', 'math_homework', 'lost_key'] },
  { id: 'ch2', title: 'فصل دوم: شهر کوچک',     icon: '🏙️', quests: ['grocery_run', 'pizza_delivery', 'library_card'] },
  { id: 'ch3', title: 'فصل سوم: آب و ورزش',    icon: '🏊', quests: ['swim_test', 'skate_trick', 'race_rookie'] },
  { id: 'ch4', title: 'فصل چهارم: پایان سال',  icon: '🎉', quests: ['exam_week', 'party_prep', 'graduation'] },
];
export const SIDE_QUESTS = ['cat_friend', 'kite_flying', 'bird_watch', 'weather_class'];

const TOUR_SPOTS = [
  { id: 'yard', name: 'حیاط و فواره', x: 0, z: 8, r: 9 },
  { id: 'classA', name: 'کلاس A', x: -19, z: -28, r: 7 },
  { id: 'library', name: 'کتابخانه', x: 43, z: -30, r: 8 },
  { id: 'kiosk', name: 'بوفه', x: -16, z: 12.5, r: 6 },
];

export class StoryManager {
  constructor(ctx) {
    this.ctx = ctx;
    this.q = {};         // id -> {state, prog}
    this.chapter = 0;
    this.seenWeather = new Set();
    this.tour = {};
    this.timedLeft = 0;
    this.delivered = 0;
    this._toastT = 0;
    this._liveProps = {};
    this.buildQuests();
  }

  get ui() { return this.ctx.ui; }
  get audio() { return this.ctx.audio; }
  get game() { return this.ctx.game; }
  get npcs() { return this.ctx.npcs; }
  get world() { return this.ctx.world; }
  get inv() { return this.ctx.game.inv; }

  /* ============================================================
     تعریف مأموریت‌ها
     ============================================================ */
  buildQuests() {
    const Q = (id, o) => {
      this.quests[id] = { id, ...o };
      this._q[id] = { state: 'available', prog: {} };
    };
    this.quests = {};

    /* ---------- فصل ۱ ---------- */
    Q('welcome_tour', {
      chapter: 0, title: 'گشت مدرسه', giver: 'sara', coins: 60, score: 120,
      desc: 'سارا می‌خواهد مدرسه را نشانت بدهد: حیاط و فواره، کلاس A، کتابخانه و بوفه.',
      objective: () => {
        const n = Object.keys(this.tour).length;
        return n >= 4 ? 'پیش سارا برگرد و بگو دیدی!' : 'بازدید از ' + faNum(n) + ' از ۴ مکان';
      },
      target: () => {
        if (this.q.welcome_tour.state === 'active' && Object.keys(this.tour).length >= 4) return this.npcPos('sara');
        for (const s of TOUR_SPOTS) if (!this.tour[s.id]) return { x: s.x, z: s.z };
        return this.npcPos('sara');
      },
      marker: () => ['sara', this.q.welcome_tour.state === 'available' ? '!' : (this.q.welcome_tour.state === 'active' && Object.keys(this.tour).length >= 4 ? 'star' : null)],
      onStart: () => { this.tour = {}; this.ui.toast('۴ مکان را ببین: حیاط، کلاس A، کتابخانه، بوفه'); },
      onUpdate: () => {
        const p = this.ctx.game.player;
        for (const s of TOUR_SPOTS) {
          if (!this.tour[s.id] && dist2D(p.x, p.z, s.x, s.z) < s.r) {
            this.tour[s.id] = true;
            this.audio.play('pickup');
            const n = Object.keys(this.tour).length;
            if (n < 4) this.ui.toast('دیدم: ' + s.name + ' (' + faNum(n) + '/۴)');
            else this.ui.toast('هر ۴ مکان را دیدی! برگرد پیش سارا 🎒');
          }
        }
      },
    });

    Q('math_homework', {
      chapter: 0, title: 'دفتر ریاضی', giver: 'farhadi', coins: 70, score: 130,
      desc: 'آقای فرهادی دفتر مشق می‌خواهد. یکی از کتاب‌فروشی شهر بخر و بیاور.',
      objective: () => (this.inv.notebook || 0) > 0 ? 'دفتر را به آقای فرهادی بده' : 'خرید دفتر مشق از کتاب‌فروشی شهر (۱۰ سکه)',
      target: () => (this.inv.notebook ? this.npcPos('farhadi') : { x: 2, z: 89 }),
      marker: () => ['farhadi', this.q.math_homework.state === 'available' ? '!' : (this.inv.notebook ? 'star' : null)],
      onStart: () => this.ui.toast('کتاب‌فروشی شهر، سمت جنوب محوطه 🌆'),
    });

    Q('lost_key', {
      chapter: 0, title: 'کلید گم‌شدهٔ آزمایشگاه', giver: 'naderi', coins: 80, score: 150,
      desc: 'کلید آزمایشگاه در پارک شهر گم شده. پیدایش کن و به خانم موسوی بده.',
      objective: () => (this.inv.key || 0) > 0 ? 'کلید را به خانم موسوی بده' : 'جست‌وجوی کلید در پارک شهر (غرب)',
      target: () => (this.inv.key ? this.npcPos('mousavi') : { x: -93, z: 68 }),
      marker: () => ['naderi', this.q.lost_key.state === 'available' ? '!' : null],
      onStart: () => {
        this._spawnKey();
        this.ui.toast('کلید در پارک شهر افتاده — بین درخت‌ها بگرد 🔑');
      },
      onUpdate: () => {
        const p = this.ctx.game.player;
        const kp = this._keyPos;
        if (!this.inv.key && kp && dist2D(p.x, p.z, kp.x, kp.z) < 2.2) {
          this.inv.key = 1;
          this.audio.play('pickup');
          this.ui.toast('کلید آزمایشگاه را پیدا کردی! 🔑 پیش خانم موسوی برو.');
          if (this._keyMesh) this._keyMesh.visible = false;
          this.ctx.missions.refreshMarkers();
        }
      },
    });

    /* ---------- فصل ۲ ---------- */
    Q('grocery_run', {
      chapter: 1, title: 'خرید برای درمانگاه', giver: 'shirin', coins: 80, score: 140,
      desc: 'خانم شیرین پرستار، نان و شیر لازم دارد. از سوپرمارکت بخر.',
      objective: () => {
        const n = (this.inv.bread ? 1 : 0) + (this.inv.milk ? 1 : 0);
        return n >= 2 ? 'به درمانگاه شهر برگرد' : 'خرید نان و شیر از سوپرمارکت (' + faNum(n) + '/۲)';
      },
      target: () => (((this.inv.bread && this.inv.milk)) ? this.npcPos('shirin') : { x: -70, z: 89 }),
      marker: () => ['shirin', this.q.grocery_run.state === 'available' ? '!' : (((this.inv.bread && this.inv.milk)) ? 'star' : null)],
      onStart: () => this.ui.toast('سوپرمارکت آفتاب، ردیف مغازه‌های شهر 🛒'),
    });

    Q('pizza_delivery', {
      chapter: 1, title: 'پیتزای داغ', giver: 'parisa', coins: 90, score: 160, timed: 130,
      desc: 'پیتزا را در ۱۳۰ ثانیه به خوابگاه برسان!',
      objective: () => this.q.pizza_delivery.state === 'active' ? 'رساندن پیتزا به خوابگاه — ' + faNum(Math.ceil(this.timedLeft)) + ' ثانیه' : 'گرفتن پیتزا از پیتزافروشی',
      target: () => (this.inv.pizzaBox ? { x: -78, z: 18 } : { x: -46, z: 89 }),
      marker: () => ['parisa', this.q.pizza_delivery.state === 'available' ? '!' : null],
      onStart: () => { this.timedLeft = 130; this.inv.pizzaBox = 1; },
      onUpdate: (dt) => {
        if (this.q.pizza_delivery.state !== 'active') return;
        this.timedLeft -= dt;
        if (this.timedLeft <= 0) {
          this.q.pizza_delivery.state = 'available';
          this.inv.pizzaBox = 0;
          this.audio.play('fail');
          this.ui.toast('پیتزا سرد شد! دوباره از پیتزافروشی بگیر.');
          this.ctx.missions.refreshMarkers();
        }
      },
      deliverTo: { x: -78, z: 18, r: 5, onDone: 'naderi' },
    });

    Q('library_card', {
      chapter: 1, title: 'کارت کتابخانه', giver: 'leila', coins: 70, score: 140,
      desc: 'کتاب گمشدهٔ کتابخانهٔ شهر در کتابخانهٔ مدرسه است. پیدایش کن و برگردان.',
      objective: () => (this.inv.lostBook ? 'کتاب را به خانم لیلا برگردان' : 'پیدا کردن کتاب گمشده در کتابخانهٔ مدرسه'),
      target: () => (this.inv.lostBook ? this.npcPos('leila') : { x: 40, z: -30 }),
      marker: () => ['leila', this.q.library_card.state === 'available' ? '!' : (this.inv.lostBook ? 'star' : null)],
      onStart: () => { this._spawnLostBook(); this.ui.toast('قفسهٔ کتابخانهٔ مدرسه را بگرد 📕'); },
      onUpdate: () => {
        const p = this.ctx.game.player;
        if (!this.inv.lostBook && this._bookPos && dist2D(p.x, p.z, this._bookPos.x, this._bookPos.z) < 2.2) {
          this.inv.lostBook = 1;
          this.audio.play('pickup');
          this.ui.toast('کتاب گمشده را پیدا کردی! 📕');
          if (this._bookMesh) this._bookMesh.visible = false;
          this.ctx.missions.refreshMarkers();
        }
      },
    });

    /* ---------- فصل ۳ ---------- */
    Q('swim_test', {
      chapter: 2, title: 'آزمون شنا', giver: 'bahrami', coins: 100, score: 180,
      desc: 'مربی بهرامی ۵ حلقه در استخر انداخته. همه را بگیر!',
      objective: () => 'جمع‌آوری حلقه‌های استخر: ' + faNum(this.ringCount()) + ' از ۵',
      target: () => this.nearestRing() || this.npcPos('bahrami'),
      marker: () => ['bahrami', this.q.swim_test.state === 'available' ? '!' : (this.ringCount() >= 5 ? 'star' : null)],
      onStart: () => { this._resetRings(); this.ui.toast('داخل آب برو و حلقه‌ها را بگیر 🏊'); },
      onUpdate: () => {
        const pool = this.world.ext && this.world.ext.pool;
        if (!pool) return;
        const p = this.ctx.game.player;
        let n = 0;
        for (const r of pool.rings) {
          if (r.taken) { n++; continue; }
          if (dist2D(p.x, p.z, r.x, r.z) < 1.4 && p.y < 1.4) {
            r.taken = true;
            r.mesh.visible = false;
            this.audio.play('pickup');
            n++;
            this.ui.toast('حلقه ' + faNum(n) + ' از ۵ 🏊');
            if (this.ctx.achievements) this.ctx.achievements.bump('rings', 1);
          } else if (r.mesh.visible === false) {
            r.taken = false; r.mesh.visible = true;
          }
        }
        if (n >= 5 && this.q.swim_test.state === 'active' && !this._swimDone) {
          this._swimDone = true;
          this.ui.toast('همهٔ حلقه‌ها! پیش مربی بهرامی برگرد 🥇');
          this.ctx.missions.refreshMarkers();
        }
      },
    });

    Q('skate_trick', {
      chapter: 2, title: 'مهارت اسکیت', giver: 'arash', coins: 110, score: 190,
      desc: 'از ۳ حلقهٔ پارک اسکیت با تخته‌اسکیت بگذر (کلید C برای سوار شدن، Space برای پرش).',
      objective: () => 'عبور از حلقه‌ها: ' + faNum(this.hoopCount()) + ' از ۳',
      target: () => this.nearestHoop() || this.npcPos('arash'),
      marker: () => ['arash', this.q.skate_trick.state === 'available' ? '!' : (this.hoopCount() >= 3 ? 'star' : null)],
      onStart: () => {
        if (this.world.ext) for (const h of this.world.ext.hoops) { h.taken = false; h.mesh.visible = true; }
        this.game.hasSkateboard = true;
        this.ui.toast('تخته‌اسکیت گرفتی! با C سوار شو و از رمپ‌ها بپر 🛹');
      },
    });

    Q('race_rookie', {
      chapter: 2, title: 'تازه‌کار پیست', giver: 'kaveh', coins: 130, score: 220,
      desc: 'یک مسابقه در پیست آفتاب را کامل کن (کلید R یا پیشکار پیست).',
      objective: () => this.raceDone ? 'مسابقه تمام شد! پیش کاوه برگرد' : 'تمام کردن یک مسابقه در پیست',
      target: () => (this.raceDone ? this.npcPos('kaveh') : { x: 6, z: -70 }),
      marker: () => ['kaveh', this.q.race_rookie.state === 'available' ? '!' : (this.raceDone ? 'star' : null)],
      onStart: () => this.ui.toast('پیست آفتاب، شمال محوطه — کلید R 🏁'),
    });

    /* ---------- فصل ۴ ---------- */
    Q('exam_week', {
      chapter: 3, title: 'هفتهٔ امتحان', giver: 'rezaei', coins: 120, score: 200,
      desc: 'در ۳ امتحان نمرهٔ ۱۴ به بالا بگیر (کلید K برای کارنامه و امتحان).',
      objective: () => 'امتحان‌های قبول‌شده: ' + faNum(this.passedExams()) + ' از ۳',
      target: () => this.npcPos('rezaei'),
      marker: () => ['rezaei', this.q.exam_week.state === 'available' ? '!' : (this.passedExams() >= 3 ? 'star' : null)],
    });

    Q('party_prep', {
      chapter: 3, title: 'آماده‌سازی جشن', giver: 'nazanin', coins: 100, score: 180,
      desc: 'برای جشن پایان سال بادکنک، کیک و بلندگو جمع کن.',
      objective: () => {
        const n = (this.inv.balloon ? 1 : 0) + (this.inv.cake ? 1 : 0) + (this.inv.speaker ? 1 : 0);
        return 'وسایل جشن: ' + faNum(n) + ' از ۳ (بادکنک، کیک، بلندگو)';
      },
      target: () => {
        if (!this.inv.balloon) return { x: 26, z: 89 };
        if (!this.inv.cake) return { x: -88, z: 89 };
        if (!this.inv.speaker) return { x: 43, z: -30 };
        return this.npcPos('nazanin');
      },
      marker: () => ['nazanin', this.q.party_prep.state === 'available' ? '!' : (this.inv.balloon && this.inv.cake && this.inv.speaker ? 'star' : null)],
      onStart: () => this.ui.toast('بادکنک از اسباب‌بازی، کیک از کافه، بلندگو از کتابخانه 📢'),
      onUpdate: () => {
        // بلندگو در کتابخانه پیدا می‌شود
        if (!this.inv.speaker && this.q.party_prep.state === 'active') {
          const p = this.ctx.game.player;
          if (dist2D(p.x, p.z, 47, -30.5) < 2.4) {
            this.inv.speaker = 1;
            this.audio.play('pickup');
            this.ui.toast('بلندگوی جشن را برداشتی! 📢');
            this.ctx.missions.refreshMarkers();
          }
        }
      },
    });

    Q('graduation', {
      chapter: 3, title: 'جشن پایان سال', giver: 'nazanin', coins: 200, score: 400,
      desc: 'در جشن پایان سال شرکت کن، برقص و سال را جشن بگیر!',
      objective: () => (this.game.partyOn ? 'برقص! (کلید U برای رقص)' : 'شروع جشن (پیش خانم نازنین در حیاط)'),
      target: () => ({ x: 0, z: 14 }),
      marker: () => ['nazanin', this.q.graduation.state === 'available' ? '!' : (this.game.partyOn ? 'star' : null)],
    });

    /* ---------- مأموریت‌های جانبی ---------- */
    Q('cat_friend', {
      side: true, chapter: 0, title: 'رفیق گربه', giver: 'cat', coins: 40, score: 80,
      desc: 'به پیشی ۳ بار ماهی بده (ماهی از سوپرمارکت) و نوازشش کن.',
      objective: () => 'غذا دادن به پیشی: ' + faNum(Math.min(3, this.fed())) + ' از ۳',
      target: () => this.ctx.animals ? this.npcPos('cat') : null,
      marker: () => null,
      onStart: () => this.ui.toast('پیشی گربهٔ مدرسه است — با ماهی دوستت می‌شود 🐟'),
    });

    Q('kite_flying', {
      side: true, chapter: 0, title: 'بادبادک‌باز', giver: 'saeed', coins: 50, score: 90,
      desc: 'بادبادک را از اسباب‌بازی‌فروشی بگیر و ۳۰ ثانیه در پارک شهر پرواز بده.',
      objective: () => 'پرواز بادبادک: ' + faNum(Math.min(30, Math.floor(this.kiteTime()))) + ' از ۳۰ ثانیه',
      target: () => this.npcPos('saeed'),
      marker: () => null,
    });

    Q('bird_watch', {
      side: true, chapter: 0, title: 'کبوترشناس', giver: 'saeed', coins: 40, score: 70,
      desc: '۵ بار کبوترهای حیاط را پر بده (نزدیکشان شو و بدو!).',
      objective: () => 'پرواز دادن کبوترها: ' + faNum(Math.min(5, this.pigeons())) + ' از ۵',
      target: () => ({ x: 0, z: 30 }),
      marker: () => null,
    });

    Q('weather_class', {
      side: true, chapter: 0, title: 'هواشناس کوچک', giver: 'mousavi', coins: 60, score: 110,
      desc: 'سه آب‌وهوای مختلف را در محوطه تجربه کن (آفتابی، بارانی، برفی/مه).',
      objective: () => 'آب‌وهواهای دیده‌شده: ' + faNum(this.seenWeather.size) + ' از ۳',
      target: () => this.npcPos('mousavi'),
      marker: () => null,
    });
  }

  /* ============================================================
     راه‌اندازی: ثبت در MissionManager + گفت‌وگوها
     ============================================================ */
  init() {
    for (const id in this.quests) {
      const q = this.quests[id];
      this.ctx.missions.registerDynamic({
        id,
        title: q.title,
        coins: q.coins,
        score: q.score,
        chapter: q.side ? null : (CHAPTERS[q.chapter] ? CHAPTERS[q.chapter].title : ''),
        side: !!q.side,
        objective: () => (q.state === 'active' ? this._objectiveOf(q) : null),
        target: () => (q.state === 'active' ? (typeof q.target === 'function' ? q.target() : null) : null),
        marker: () => (typeof q.marker === 'function' ? q.marker() : null),
      });
    }
    this._assignDialogues();
    this.ctx.missions.refreshMarkers();
  }

  _objectiveOf(q) {
    try { return typeof q.objective === 'function' ? q.objective() : ''; } catch (e) { return ''; }
  }

  ringCount() {
    const pool = this.world.ext && this.world.ext.pool;
    if (!pool) return 0;
    return pool.rings.filter((r) => r.taken).length;
  }
  hoopCount() {
    const hoops = this.world.ext ? this.world.ext.hoops : [];
    return hoops.filter((h) => h.taken).length;
  }
  passedExams() {
    const g = this.ctx.grades;
    if (!g) return 0;
    return Object.values(g.grades).filter((x) => x != null && x >= 14).length;
  }
  fed() { return this.ctx.animals ? this.ctx.animals.stats.fed : 0; }
  kiteTime() { return this.ctx.animals ? this.ctx.animals.stats.kiteTime : 0; }
  pigeons() { return this.ctx.animals ? Math.floor(this.ctx.animals.stats.pigeons / 3) : 0; }

  npcPos(id) {
    if (id === 'cat' && this.ctx.animals && this.ctx.animals.cat) return { x: this.ctx.animals.cat.x, z: this.ctx.animals.cat.z };
    const n = this.npcs.npcById(id);
    return n ? { x: n.group.position.x, z: n.group.position.z } : null;
  }
  nearestRing() {
    const pool = this.world.ext && this.world.ext.pool;
    if (!pool) return null;
    const left = pool.rings.filter((r) => !r.taken);
    return left.length ? { x: left[0].x, z: left[0].z } : null;
  }
  nearestHoop() {
    const hoops = this.world.ext ? this.world.ext.hoops.filter((h) => !h.taken) : [];
    return hoops.length ? { x: hoops[0].x, z: hoops[0].z } : null;
  }

  _spawnKey() {
    this._keyPos = { x: -93, z: 68 };
    if (this._keyMesh) { this._keyMesh.visible = true; return; }
    const g = new THREE.Group();
    const M = (c) => new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.35 });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.05, 8, 14), M(0xf2c94c));
    g.add(ring);
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 0.5), M(0xf2c94c));
    shaft.position.z = 0.3;
    g.add(shaft);
    const bit = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.12), M(0xf2c94c));
    bit.position.set(0, -0.06, 0.5);
    g.add(bit);
    g.position.set(this._keyPos.x, 0.9, this._keyPos.z);
    g.castShadow = true;
    this.ctx.world.scene.add(g);
    this._keyMesh = g;
  }

  _spawnLostBook() {
    this._bookPos = { x: 39.6, z: -33.4 };
    if (this._bookMesh) { this._bookMesh.visible = true; return; }
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.55, 0.16), new THREE.MeshLambertMaterial({ color: 0xd9433a, emissive: 0x551111, emissiveIntensity: 0.35 }));
    bk.position.set(this._bookPos.x, 1.6, this._bookPos.z);
    bk.castShadow = true;
    this.ctx.world.scene.add(bk);
    this._bookMesh = bk;
  }

  /* ============================================================
     گفت‌وگوها
     ============================================================ */
  _dlg(name, text, options) {
    this.audio.play('talk');
    this.ui.dialogue({ name, text, options });
  }
  _close() { this.ui.closeDialogue(); }

  /** مأموریت‌های نسخهٔ اول که روی همین NPC بودند: تا تمام نشده، گفت‌وگوی اصلی حفظ می‌شود */
  _legacy(npc, oldTalk) {
    if (!oldTalk) return false;
    const chains = {
      sara: ['lost_bag'],
      farhadi: ['library_books'],
      ahmadi: ['riddle', 'library_books'],
      rezaei: ['timed_note'],
      rostami: ['football'],
    };
    const ids = chains[npc.id];
    if (!ids) return false;
    const st = this.ctx.missions.st;
    return ids.some((id) => st[id] && st[id].st !== 'done');
  }

  _assignDialogues() {
    const N = (id) => this.npcs.npcById(id);
    // سارا: گشت مدرسه
    const sara = N('sara');
    if (sara) {
      const oldTalk = sara.onTalk;
      sara.onTalk = () => {
        if (this._legacy(sara, oldTalk)) { oldTalk(sara); return; }
        const q = this.q.welcome_tour;
        if (q.state === 'active') {
          if (Object.keys(this.tour).length >= 4) {
            this._dlg('سارا', 'واو! همه‌جا را دیدی! حالا مدرسه را می‌شناسی 🎉', [{ label: 'ممنون سارا!', fn: () => { this._close(); this.complete('welcome_tour'); } }]);
          } else {
            this._dlg('سارا', 'هنوز ' + faNum(4 - Object.keys(this.tour).length) + ' مکان مانده: فواره، کلاس A، کتابخانه و بوفه.', [{ label: 'می‌روم!', fn: () => this._close() }]);
          }
          return;
        }
        if (q.state === 'available') {
          this._dlg('سارا', 'به دبیرستان آفتاب خوش آمدی! می‌خواهی مدرسه را نشانت بدهم؟', [
            { label: 'حتماً! بگردیم', fn: () => { this._close(); this.start('welcome_tour'); } },
            { label: 'بعداً', fn: () => { this._close(); if (oldTalk) oldTalk(sara); } },
          ]);
          return;
        }
        oldTalk && oldTalk(sara);
      };
    }
    // آقای فرهادی: دفتر ریاضی + امتحان ریاضی
    const farhadi = N('farhadi');
    if (farhadi) {
      const oldTalk = farhadi.onTalk;
      farhadi.onTalk = () => {
        if (this._legacy(farhadi, oldTalk)) { oldTalk(farhadi); return; }
        const q = this.q.math_homework;
        const opts = [];
        if (q.state === 'active' && (this.inv.notebook || 0) > 0) {
          opts.push({ label: 'تحویل دفتر مشق', fn: () => { this.inv.notebook = 0; this._close(); this.complete('math_homework'); } });
        }
        opts.push({ label: 'امتحان ریاضی', fn: () => { this._close(); this.ctx.grades && this.ctx.grades.startExam('math'); } });
        opts.push({ label: 'خداحافظ', fn: () => this._close() });
        if (q.state === 'available') {
          this._dlg('آقای فرهادی', 'سلام! برای تمرین ریاضی به یک دفتر مشق نیاز داریم. یکی می‌آوری؟', [
            { label: 'قبول می‌کنم', fn: () => { this._close(); this.start('math_homework'); } },
            { label: 'بعداً', fn: () => { this._close(); oldTalk && oldTalk(farhadi); } },
          ]);
        } else if (q.state === 'active') {
          this._dlg('آقای فرهادی', (this.inv.notebook || 0) > 0 ? 'دفتر آوردی؟ بده ببینم!' : 'دفتر مشق را از کتاب‌فروشی شهر بخر.', opts);
        } else {
          this._dlg('آقای فرهادی', 'دفترت عالی بود. ریاضی‌ات قوی می‌شود!', opts);
        }
      };
    }
    // خانم موسوی: آزمایشگاه، کلید، آب‌وهوا، امتحان علوم
    const mousavi = N('mousavi');
    if (mousavi) {
      mousavi.onTalk = () => {
        const q = this.q.lost_key;
        const w = this.q.weather_class;
        const opts = [];
        if (q.state === 'active' && (this.inv.key || 0) > 0) {
          opts.push({ label: 'تحویل کلید آزمایشگاه', fn: () => { this.inv.key = 0; this._close(); this.complete('lost_key'); } });
        }
        if (w.state === 'available') opts.push({ label: 'مأموریت هواشناسی', fn: () => { this._close(); this.start('weather_class'); } });
        opts.push({ label: 'امتحان علوم', fn: () => { this._close(); this.ctx.grades && this.ctx.grades.startExam('science'); } });
        opts.push({ label: 'خداحافظ', fn: () => this._close() });
        if (w.state === 'active') {
          this._dlg('خانم موسوی', 'سه آب‌وهوا را ببین: امروز چه خبر است؟ ' + this.weatherDesc(), opts);
        } else {
          this._dlg('خانم موسوی', q.state === 'active' ? 'کلید آزمایشگاه را پیدا کردی؟ پارک شهر را بگرد.' : 'به آزمایشگاه علوم خوش آمدی! 🔬', opts);
        }
      };
    }
    // پرستار، آشپز، مسئول خوابگاه، فروشنده‌ها و بقیه
    N('shirin') && (N('shirin').onTalk = () => {
      const q = this.q.grocery_run;
      const opts = [];
      if (q.state === 'active' && this.inv.bread && this.inv.milk) opts.push({ label: 'تحویل خرید', fn: () => { this.inv.bread = 0; this.inv.milk = 0; this._close(); this.complete('grocery_run'); } });
      opts.push({ label: 'خداحافظ', fn: () => this._close() });
      if (q.state === 'available') {
        this._dlg('خانم شیرین', 'سلام! درمانگاه نان و شیر نداشت. می‌توانی از سوپرمارکت بگیری؟', [
          { label: 'قبول', fn: () => { this._close(); this.start('grocery_run'); } },
          { label: 'بعداً', fn: () => this._close() },
        ]);
      } else {
        this._dlg('خانم شیرین', q.state === 'active' ? 'نان و شیر را بیاور؛ برای بچه‌های مریض لازم است.' : 'مراقب سلامتی‌ات باش! 🩺', opts);
      }
    });
    N('rahimi') && (N('rahimi').onTalk = () => {
      this._dlg('آقای رحیمی', 'غذای امروز: کوکو سبزی و ماست! 🍽', [
        { label: 'گرفتن غذا (۱۴ سکه)', fn: () => { this._close(); this.game.eatCafeteria(); } },
        { label: 'خداحافظ', fn: () => this._close() },
      ]);
    });
    N('naderi') && (N('naderi').onTalk = () => {
      const q = this.q.lost_key;
      const pz = this.q.pizza_delivery;
      const opts = [];
      if (pz.state === 'active' && this.inv.pizzaBox) {
        opts.push({ label: 'تحویل پیتزا (اگر وقت مانده!)', fn: () => { this.inv.pizzaBox = 0; this._close(); this.complete('pizza_delivery'); } });
      }
      opts.push({ label: 'خوابیدن در خوابگاه', fn: () => { this._close(); this.game.sleepInDorm(); } });
      opts.push({ label: 'خداحافظ', fn: () => this._close() });
      if (q.state === 'available') {
        this._dlg('آقای نادری', 'مسئول خوابگاهم. راستی کلید آزمایشگاه گم شده... تو پیدا می‌کنی؟', [
          { label: 'قبول', fn: () => { this._close(); this.start('lost_key'); } },
          { label: 'بعداً', fn: () => this._dlg('آقای نادری', 'هر وقت خواستی بیا. 🛏', opts) },
        ]);
      } else {
        this._dlg('آقای نادری', 'خوابگاه آماده است. تخت خالی داری!', opts);
      }
    });
    N('bahrami') && (N('bahrami').onTalk = () => {
      const q = this.q.swim_test;
      const opts = [{ label: 'خداحافظ', fn: () => this._close() }];
      if (q.state === 'active' && this.ringCount() >= 5) {
        opts.unshift({ label: 'گرفتم همه را!', fn: () => { this._close(); this.complete('swim_test'); } });
      }
      if (q.state === 'available') {
        this._dlg('مربی بهرامی', '۵ حلقه در استخر انداختم. می‌توانی همه را بگیری؟ 🏊', [
          { label: 'شروع!', fn: () => { this._close(); this.start('swim_test'); } },
          { label: 'بعداً', fn: () => this._close() },
        ]);
      } else {
        this._dlg('مربی بهرامی', q.state === 'active' ? 'حلقه‌ها را بگیر: ' + faNum(this.ringCount()) + ' از ۵' : 'شنا خوب برای بدنت است! 🏊', opts);
      }
    });
    N('arash') && (N('arash').onTalk = () => {
      const q = this.q.skate_trick;
      const opts = [{ label: 'خداحافظ', fn: () => this._close() }];
      if (q.state === 'active' && this.hoopCount() >= 3) opts.unshift({ label: 'هر ۳ حلقه!', fn: () => { this._close(); this.complete('skate_trick'); } });
      if (q.state === 'available') {
        this._dlg('آرش', 'به پارک اسکیت خوش آمدی! می‌خواهی از حلقه‌ها بپری؟ 🛹', [
          { label: 'بله!', fn: () => { this._close(); this.start('skate_trick'); } },
          { label: 'بعداً', fn: () => this._close() },
        ]);
      } else {
        this._dlg('آرش', q.state === 'active' ? 'حلقه‌ها: ' + faNum(this.hoopCount()) + ' از ۳ — با Space بپر!' : 'ترفندهایت خیلی خوب بود! 🛹', opts);
      }
    });
    N('kaveh') && (N('kaveh').onTalk = () => {
      const q = this.q.race_rookie;
      const opts = [
        { label: 'شروع مسابقه', fn: () => { this._close(); this.ctx.racing && this.ctx.racing.openMenu(); } },
        { label: 'خداحافظ', fn: () => this._close() },
      ];
      if (q.state === 'active' && this.raceDone) {
        this._dlg('کاوه', 'مسابقه را تمام کردی! آفرین راننده! 🏁', [{ label: 'دریافت جایزه', fn: () => { this._close(); this.complete('race_rookie'); } }, ...opts]);
      } else if (q.state === 'available') {
        this._dlg('کاوه', 'من مسئول پیستم. می‌خواهی اولین مسابقه‌ات را تجربه کنی؟ 🏎', [
          { label: 'قبول!', fn: () => { this._close(); this.start('race_rookie'); } },
          { label: 'بعداً', fn: () => this._close() },
        ]);
      } else {
        this._dlg('کاوه', 'پیست همیشه باز است. کلید R!', opts);
      }
    });
    N('rezaei') && (() => {
      const old = N('rezaei').onTalk;
      N('rezaei').onTalk = () => {
        if (this._legacy(N('rezaei'), old)) { old(N('rezaei')); return; }
        const q = this.q.exam_week;
        const opts = [];
        if (q.state === 'active' && this.passedExams() >= 3) opts.push({ label: 'کارنامه‌ام را بگیرید!', fn: () => { this._close(); this.complete('exam_week'); } });
        opts.push({ label: 'کارنامه (K)', fn: () => { this._close(); this.ctx.grades && this.ctx.grades.openPanel(); } });
        opts.push({ label: 'خداحافظ', fn: () => this._close() });
        if (q.state === 'available') {
          this._dlg('خانم رضایی', 'هفتهٔ امتحان‌ها نزدیک است! در ۳ امتحان نمرهٔ ۱۴ به بالا بگیر.', [
            { label: 'قبول', fn: () => { this._close(); this.start('exam_week'); } },
            { label: 'بعداً', fn: () => { this._close(); old && old(N('rezaei')); } },
          ]);
        } else {
          this._dlg('خانم رضایی', q.state === 'active' ? 'امتحان‌های قبول‌شده: ' + faNum(this.passedExams()) + ' از ۳' : 'نظم مدرسه را حفظ کن عزیزم.', opts);
        }
      };
    })();
    N('nazanin') && (N('nazanin').onTalk = () => {
      const q = this.q.party_prep;
      const g = this.q.graduation;
      const opts = [];
      if (q.state === 'active' && this.inv.balloon && this.inv.cake && this.inv.speaker) {
        opts.push({ label: 'تحویل وسایل جشن', fn: () => { this.inv.balloon = 0; this.inv.cake = 0; this.inv.speaker = 0; this._close(); this.complete('party_prep'); } });
      }
      if (g.state === 'available' && this.q.party_prep.state === 'done') {
        opts.push({ label: 'شروع جشن! 🎉', fn: () => {
          this._close();
          this.start('graduation');
          if (this.ctx.party) this.ctx.party.start();
        } });
      }
      opts.push({ label: 'خداحافظ', fn: () => this._close() });
      if (q.state === 'available') {
        this._dlg('خانم نازنین', 'جشن پایان سال داریم! بادکنک، کیک و بلندگو کمک می‌کنی جمع کنم؟', [
          { label: 'قبول!', fn: () => { this._close(); this.start('party_prep'); } },
          { label: 'بعداً', fn: () => this._close() },
        ]);
      } else {
        this._dlg('خانم نازنین', q.state === 'active' ? 'وسایل جشن را بیاور: بادکنک (اسباب‌بازی)، کیک (کافه)، بلندگو (کتابخانه).' : 'جشن عالی بود! 🎉', opts);
      }
    });
    // سعید (اسباب‌بازی) برای بادبادک و پرنده‌ها
    N('saeed') && (() => {
      const old = N('saeed').onTalk;
      N('saeed').onTalk = () => {
        const k = this.q.kite_flying;
        const b = this.q.bird_watch;
        const opts = [
          { label: 'خرید از اسباب‌بازی‌فروشی', fn: () => { this._close(); this.game.openShop('toy'); } },
          { label: 'خداحافظ', fn: () => this._close() },
        ];
        if (k.state === 'available') {
          this._dlg('آقای سعید', 'بادبادک خوب داریم! پرواز با بادبادک در پارک شهر کیف دارد.', [
            { label: 'مأموریت بادبادک', fn: () => { this._close(); this.start('kite_flying'); } },
            { label: 'مأموریت کبوترها', fn: () => { this._close(); this.start('bird_watch'); } },
            { label: 'خرید', fn: () => { this._close(); this.game.openShop('toy'); } },
          ]);
        } else {
          this._dlg('آقای سعید', 'اسباب‌بازی‌فروشی آفتاب — همه‌چیز داری!', opts);
        }
      };
    });
    // بقیه فروشندگان
    const shopTalks = {
      javadi: 'super', parisa: 'pizza', kamran: 'ice', babak: 'cafe', shirin: 'clinic', rahimi: 'cafeteria',
    };
    for (const id in shopTalks) {
      const n = N(id);
      if (n) n.onTalk = () => this.game.openShop(shopTalks[id]);
    }
    // خانم لیلا (کتاب‌فروشی) هم مأموریت کارت کتابخانه دارد
    const leila = N('leila');
    if (leila && !this._legacy(leila, null)) {
      leila.onTalk = () => {
        const q = this.q.library_card;
        const opts = [
          { label: 'خرید دفتر', fn: () => { this._close(); this.game.openShop('book'); } },
          { label: 'خداحافظ', fn: () => this._close() },
        ];
        if (q.state === 'active' && this.inv.lostBook) {
          this._dlg('خانم لیلا', 'کتاب گمشده! پیدایش کردی! ممنون 📕', [{ label: 'خواهش می‌کنم', fn: () => { this.inv.lostBook = 0; this._close(); this.complete('library_card'); } }]);
        } else if (q.state === 'available') {
          this._dlg('خانم لیلا', 'یک کتاب از کتابخانهٔ شهر در مدرسه جا مانده. پیدایش می‌کنی؟', [
            { label: 'قبول', fn: () => { this._close(); this.start('library_card'); } },
            { label: 'بعداً', fn: () => this._close() },
          ]);
        } else {
          this._dlg('خانم لیلا', q.state === 'active' ? 'کتاب در کتابخانهٔ مدرسه است — قفسه‌ها را بگرد.' : 'کتاب‌های جدید رسیده! 📚', opts);
        }
      };
    }
    // خانم صادقی: امتحان فارسی + گشت راهرو
    const sadeghi = N('sadeghi');
    if (sadeghi) {
      const old = sadeghi.onTalk;
      sadeghi.onTalk = () => {
        this._dlg('خانم صادقی', 'زنگ تفریح وقت دویدن است، ولی درس هم یادت نرود!', [
          { label: 'امتحان فارسی', fn: () => { this._close(); this.ctx.grades && this.ctx.grades.startExam('literature'); } },
          { label: 'خداحافظ', fn: () => this._close() },
        ]);
        void old;
      };
    }
    const rostami = N('rostami');
    if (rostami) {
      const old = rostami.onTalk;
      rostami.onTalk = () => {
        const q = this.q.football;
        if (this.ctx.missions.st.football.st !== 'done') { old && old(rostami); return; }
        this._dlg('مربی رستمی', 'آماده‌ای برای امتحان ورزش؟', [
          { label: 'امتحان ورزش', fn: () => { this._close(); this.ctx.grades && this.ctx.grades.startExam('sport'); } },
          { label: 'خداحافظ', fn: () => this._close() },
        ]);
      };
    }
    const nikpour = N('nikpour');
    if (nikpour) {
      nikpour.onTalk = () => this._dlg('خانم نیک‌پور', 'هنر زبان دل است! 🎨', [
        { label: 'امتحان هنر', fn: () => { this._close(); this.ctx.grades && this.ctx.grades.startExam('art'); } },
        { label: 'خداحافظ', fn: () => this._close() },
      ]);
    }
    const ahmad = N('ahmadi');
    if (ahmad) {
      const old = ahmad.onTalk;
      ahmad.onTalk = () => {
        if (this._legacy(ahmad, old)) { old(ahmad); return; }
        this._dlg('آقای احمدی', 'می‌خواهی امتحان انگلیسی بدهی؟', [
          { label: 'امتحان انگلیسی', fn: () => { this._close(); this.ctx.grades && this.ctx.grades.startExam('english'); } },
          { label: 'مطالعه در کتابخانه', fn: () => { this._close(); this.ctx.grades && this.ctx.grades.study(); } },
          { label: 'خداحافظ', fn: () => this._close() },
        ]);
      };
    }
    const naser = N('naser');
    if (naser) {
      naser.onTalk = () => this._dlg('نگهبان ناصر', 'سلام! مواظب دروازه‌ام. سفر سریع یادت نرود! 🚪', [
        { label: 'سفر سریع', fn: () => { this._close(); this.game.ui.toast('روی تابلوی سفر سریع در دروازه بایست.'); } },
        { label: 'خداحافظ', fn: () => this._close() },
      ]);
    }
    const farid = N('farid');
    if (farid) {
      farid.onTalk = () => this._dlg('آقای فرید', 'دوچرخه‌ات را برایت تعمیر کردم! کلید B برای سوار شدن 🚲', [
        { label: 'ممنون!', fn: () => { this._close(); this.game.giveBicycle(); } },
      ]);
    }
  }

  weatherDesc() {
    const w = this.ctx.weather;
    return w ? w.icon + ' ' + w.label : '☀️';
  }

  /* ============================================================
     مدیریت مأموریت‌ها
     ============================================================ */
  get q() { return this._q; }
  set q(v) { this._q = v; }

  isUnlocked(id) {
    const quest = this.quests[id];
    if (!quest) return false;
    if (quest.side) return true;
    const ch = CHAPTERS[quest.chapter];
    const idx = ch.quests.indexOf(id);
    if (idx > 0) {
      const prev = ch.quests[idx - 1];
      if (this.stateOf(prev) !== 'done') return false;
    } else if (quest.chapter > 0) {
      const prevCh = CHAPTERS[quest.chapter - 1];
      if (!prevCh.quests.every((x) => this.stateOf(x) === 'done')) return false;
    }
    return true;
  }

  stateOf(id) {
    const s = this._q[id];
    return s ? s.state : 'available';
  }

  start(id) {
    const st = this._q[id];
    if (!st || st.state === 'done') return;
    if (!this.isUnlocked(id)) {
      this.ui.toast('اول مأموریت‌های قبلی را کامل کن!');
      return;
    }
    st.state = 'active';
    st.prog = {};
    const quest = this.quests[id];
    if (quest.onStart) quest.onStart();
    this.audio.play('quest');
    this.ui.banner('مأموریت داستانی: ' + quest.title, quest.desc);
    this.ctx.missions.refreshMarkers();
    this.game.autosave();
  }

  complete(id) {
    const st = this._q[id];
    const quest = this.quests[id];
    if (!st || st.state === 'done' || !quest) return;
    st.state = 'done';
    this.audio.play('complete');
    const p = this.game.player;
    if (this.world.sparkles) this.world.sparkles.spawn(p.x, 1.6, p.z, 0xffd34d, 40, { spread: 3, up: 5, life: 1.3 });
    this.ui.banner('مأموریت کامل شد! ' + quest.title, 'جایزه: ' + faNum(quest.coins) + ' سکه و ' + faNum(quest.score) + ' امتیاز');
    this.ctx.missions.completeDynamic(id);
    this.ctx.missions.refreshMarkers();
    if (this.ctx.achievements) { this.ctx.achievements.bump('story', 1); this.ctx.achievements.bump('missions', 1); }
    this.checkChapter();
    this.game.autosave();
  }

  checkChapter() {
    for (let c = 0; c < CHAPTERS.length; c++) {
      const ch = CHAPTERS[c];
      if (ch.quests.every((x) => this.stateOf(x) === 'done') && this.chapter <= c) {
        this.chapter = c + 1;
        if (c + 1 < CHAPTERS.length) {
          setTimeout(() => {
            this.audio.play('secret');
            this.ui.banner('فصل جدید باز شد! ' + CHAPTERS[c + 1].icon, CHAPTERS[c + 1].title);
          }, 3200);
        } else {
          setTimeout(() => {
            this.audio.play('secret');
            this.ui.banner('پایان داستان! 🎓', 'همهٔ فصل‌ها را کامل کردی — قهرمان آفتاب شدی!');
            if (this.ctx.achievements) this.ctx.achievements.unlock('hero');
          }, 3200);
        }
      }
    }
  }

  /** مأموریت زمان‌دار پیتزا */
  updateTimed(dt) {
    const q = this.quests.pizza_delivery;
    if (this._q.pizza_delivery.state === 'active' && q.onUpdate) q.onUpdate(dt);
  }

  update(dt) {
    for (const id in this.quests) {
      const quest = this.quests[id];
      const st = this._q[id];
      if (!st || st.state !== 'active') continue;
      if (id === 'pizza_delivery') continue;   // جداگانه (زمان‌دار)
      if (quest.onUpdate) quest.onUpdate(dt);
      // تحویل به منطقه
      if (quest.deliverTo) {
        const p = this.game.player;
        const d = quest.deliverTo;
        if (dist2D(p.x, p.z, d.x, d.z) < d.r) {
          this._deliver(id);
        }
      }
    }
    this.updateTimed(dt);
    // آب‌وهوا برای مأموریت هواشناسی
    const w = this.ctx.weather;
    const ws = this._q.weather_class;
    if (ws && ws.state === 'active' && w) {
      const key = (w.current === 'clear' || w.current === 'cloudy') ? 'آفتابی' : (w.current === 'rain' || w.current === 'storm') ? 'بارانی' : 'برفی/مه';
      if (!this.seenWeather.has(key)) {
        this.seenWeather.add(key);
        this.ui.toast('آب‌وهوا ثبت شد: ' + key + ' (' + faNum(this.seenWeather.size) + '/۳)');
        if (this.seenWeather.size >= 3) this.complete('weather_class');
      }
    }
    // مأموریت‌های جانبی خودکار
    if (this._q.cat_friend.state === 'active' && this.fed() >= 3) this.complete('cat_friend');
    if (this._q.kite_flying.state === 'active' && this.kiteTime() >= 30) this.complete('kite_flying');
    if (this._q.bird_watch.state === 'active' && this.pigeons() >= 5) this.complete('bird_watch');
    // پیشنهاد خودکار فصل ۱ (یک بار)
    if (!this._hinted && this._started) {
      this._hinted = true;
      setTimeout(() => this.ui.toast('دفترچهٔ داستان با کلید J 📖'), 12000);
    }
    this._started = true;
  }

  _deliver(id) {
    const quest = this.quests[id];
    if (id === 'pizza_delivery') {
      if (!this.inv.pizzaBox) return;
      this.inv.pizzaBox = 0;
      this.complete('pizza_delivery');
    } else if (quest.deliverTo) {
      this.complete(id);
    }
  }

  /* ---------- دفترچه داستان ---------- */
  journal() {
    const chapters = CHAPTERS.map((ch, ci) => ({
      ...ch,
      unlocked: ci === 0 || CHAPTERS[ci - 1].quests.every((x) => this.stateOf(x) === 'done'),
      quests: ch.quests.map((id) => {
        const q = this.quests[id];
        const st = this._q[id];
        return {
          id, title: q.title, desc: q.desc, giver: q.giver,
          state: st.state,
          stateText: st.state === 'done' ? 'کامل شد' : st.state === 'active' ? 'در حال انجام' : this.isUnlocked(id) ? 'قابل شروع' : 'قفل',
          objective: st.state === 'active' ? this._objectiveOf(q) : null,
          coins: q.coins, score: q.score,
        };
      }),
    }));
    return {
      chapters,
      side: SIDE_QUESTS.map((id) => {
        const q = this.quests[id];
        const st = this._q[id];
        return { id, title: q.title, desc: q.desc, state: st.state, objective: st.state === 'active' ? this._objectiveOf(q) : null, coins: q.coins };
      }),
      current: this.chapter,
      progress: this.progress(),
    };
  }

  progress() {
    const ids = Object.keys(this.quests);
    const done = ids.filter((id) => this._q[id].state === 'done').length;
    return { done, total: ids.length, pct: Math.round((done / ids.length) * 100) };
  }

  openJournal() {
    if (this.ui.journal) this.ui.journal(this.journal());
  }

  onRaceFinish(x) {
    if (x && x.laps > 0) {
      this.raceDone = true;
      if (this._q.race_rookie.state === 'active') this.ctx.missions.refreshMarkers();
    }
  }

  stateForSave() {
    const out = {};
    for (const id in this._q) out[id] = { state: this._q[id].state, prog: this._q[id].prog };
    return {
      quests: out, chapter: this.chapter, seenWeather: [...this.seenWeather],
      tour: { ...this.tour }, timedLeft: this.timedLeft, raceDone: !!this.raceDone,
    };
  }

  loadState(s) {
    if (!s) return;
    if (s.quests) {
      for (const id in this._q) {
        if (s.quests[id]) this._q[id] = { state: s.quests[id].state, prog: s.quests[id].prog || {} };
      }
    }
    if (typeof s.chapter === 'number') this.chapter = s.chapter;
    if (Array.isArray(s.seenWeather)) this.seenWeather = new Set(s.seenWeather);
    if (s.tour) this.tour = { ...s.tour };
    if (typeof s.timedLeft === 'number') this.timedLeft = s.timedLeft;
    this.raceDone = !!s.raceDone;
    this.ctx.missions.refreshMarkers();
  }
}

/* ============================================================
   School Life: Open Campus — missions.js
   ۸ مأموریت مدرسه‌ای غیرخشونت‌آمیز + گفت‌وگوها + فروشگاه بوفه
   ============================================================ */
import { faNum } from './utils.js';

const REWARDS = {
  lost_bag:     { coins: 50, score: 100, title: 'کوله‌پشتی گمشده' },
  library_books:{ coins: 60, score: 120, title: 'کتاب‌های کتابخانه' },
  football:     { coins: 80, score: 150, title: 'آزمون فوتبال' },
  timed_note:   { coins: 70, score: 140, title: 'نامه فوری' },
  secret_path:  { coins: 60, score: 150, title: 'مسیر مخفی' },
  help_student: { coins: 60, score: 120, title: 'ناهار کیان' },
  collect_cans: { coins: 90, score: 160, title: 'قهرمان بازیافت' },
  riddle:       { coins: 50, score: 100, title: 'معمای کتابدار' },
};
export const MISSION_TITLES = Object.fromEntries(Object.entries(REWARDS).map(([k, v]) => [k, v.title]));

export class MissionManager {
  constructor(ctx) {
    this.ctx = ctx; // {world, npcs, player, vehicles, ui, audio, game}
    this.st = {};
    for (const id of Object.keys(REWARDS)) this.st[id] = { st: 'available', prog: 0 };
    this.secretFound = false;
    this.timedLeft = 0;
    this.dyn = {};          // مأموریت‌های داستانی ثبت‌شده از story.js
  }

  /* ============================================================
     مأموریت‌های پویا (زنجیرهٔ داستانی) — ثبت از StoryManager
     ============================================================ */
  registerDynamic(q) {
    this.dyn[q.id] = q;
    if (!this.st[q.id]) this.st[q.id] = { st: 'available', prog: 0 };
    return q;
  }

  dynamicList() {
    const out = [];
    for (const id in this.dyn) {
      const q = this.dyn[id];
      const st = this.st[id] ? this.st[id].st : 'available';
      out.push({ ...q, state: st });
    }
    return out;
  }

  completeDynamic(id) {
    if (!this.st[id]) return;
    this.st[id].st = 'done';
    if (this.ctx.game.achievements) this.ctx.game.achievements.bump('missions', 1);
    const q = this.dyn[id];
    if (q) {
      this.game.addCoins(q.coins || 0);
      this.game.addScore(q.score || 0);
      this.ui.toast('جایزه: ' + faNum(q.coins || 0) + ' سکه و ' + faNum(q.score || 0) + ' امتیاز');
    }
  }

  get game() { return this.ctx.game; }
  get ui() { return this.ctx.ui; }
  get audio() { return this.ctx.audio; }
  get world() { return this.ctx.world; }
  get npcs() { return this.ctx.npcs; }

  /* ---------------- راه‌اندازی ---------------- */
  init() {
    const N = (id) => this.npcs.npcById(id);

    // گفت‌وگوی پیش‌فرض NPCهای ساده
    for (const n of this.npcs.npcs) {
      if (!n.onTalk) {
        n.onTalk = (npc) => {
          this.audio.play('talk');
          const line = npc.lines.length ? npc.lines[Math.floor(Math.random() * npc.lines.length)] : 'سلام!';
          this.ui.dialogue({ name: npc.name + (npc.title ? ' — ' + npc.title : ''), text: line, options: [{ label: 'خداحافظ', fn: () => this.ui.closeDialogue() }] });
        };
      }
    }

    N('sara').onTalk = () => this._talkSara();
    N('farhadi').onTalk = () => this._talkFarhadi();
    N('ahmadi').onTalk = () => this._talkAhmadi();
    N('rostami').onTalk = () => this._talkRostami();
    N('nima').onTalk = () => this._talkNima();
    N('rezaei').onTalk = () => this._talkRezaei();
    N('karimi').onTalk = () => this._talkKarimi();
    N('kian').onTalk = () => this._talkKian();
    N('donya').onTalk = () => this._talkDonya();
    N('nasrin').onTalk = () => this._openShop();

    this.world.pickupHandler = (kind, id) => this._onPickup(kind, id);
    this.world.onCoin = () => {
      this.game.addCoins(5);
      this.game.addScore(5);
      this.audio.play('coin');
      this.ui.toast('۵ سکه پیدا کردی! ( ' + faNum(this.game.coins) + ' سکه)');
    };
    this.world.onKick = () => this.audio.play('kick');
    this.world.onGoal = (side) => this._onGoal(side);
    this.world.onSecret = () => this._onSecret();

    this.refreshMarkers();
  }

  /* ---------------- ابزار ---------------- */
  _dlg(name, text, options) {
    this.audio.play('talk');
    this.ui.dialogue({ name, text, options });
  }
  _close() { this.ui.closeDialogue(); }

  _accept(id) {
    this.st[id].st = 'active';
    this.audio.play('quest');
    this.ui.toast('مأموریت جدید: ' + REWARDS[id].title);
    this.refreshMarkers();
    this.game.autosave();
  }

  _complete(id) {
    const r = REWARDS[id];
    this.st[id].st = 'done';
    this.game.addCoins(r.coins);
    this.game.addScore(r.score);
    this.audio.play('complete');
    const p = this.ctx.player;
    if (this.world.sparkles) this.world.sparkles.spawn(p.x, 1.5, p.z, 0xffd34d, 45, { spread: 3, up: 5, life: 1.3 });
    this.ui.banner('مأموریت کامل شد!', r.title + ' — جایزه: ' + faNum(r.coins) + ' سکه و ' + faNum(r.score) + ' امتیاز');
    if (this.ctx.game.achievements) this.ctx.game.achievements.bump('missions', 1);
    this.refreshMarkers();
    this.game.autosave();
    if (this.completionPct() >= 100) {
      setTimeout(() => {
        this.game.addScore(200);
        this.audio.play('secret');
        this.ui.banner('قهرمان مدرسه!', 'هر ۸ مأموریت را کامل کردی! جایزه ویژه: ۲۰۰ امتیاز');
      }, 2800);
    }
  }

  refreshMarkers() {
    const S = (id) => this.st[id].st;
    const P = (id) => this.st[id].prog;
    // سارا
    this.npcs.setMarker('sara', S('lost_bag') === 'available' ? '!' : (S('lost_bag') === 'active' && P('lost_bag') >= 1 ? 'star' : null));
    // فرهادی
    this.npcs.setMarker('farhadi', S('library_books') === 'available' ? '!' : null);
    // احمدی (تحویل کتاب + معما)
    const booksReady = S('library_books') === 'active' && (this.game.inv.books || 0) >= 3;
    this.npcs.setMarker('ahmadi', booksReady || S('riddle') === 'available' ? (booksReady ? 'star' : '!') : null);
    // مربی
    this.npcs.setMarker('rostami', S('football') === 'available' ? '!' : (S('football') === 'active' && P('football') >= 3 ? 'star' : null));
    // نیما
    this.npcs.setMarker('nima', S('timed_note') === 'available' ? '!' : null);
    // مدیر
    this.npcs.setMarker('rezaei', S('timed_note') === 'active' ? 'star' : null);
    // باغبان
    this.npcs.setMarker('karimi', (S('secret_path') === 'available' || (this.secretFound && S('secret_path') !== 'done')) ? '!' : null);
    // کیان
    const hasSand = (this.game.inv.sandwich || 0) > 0;
    this.npcs.setMarker('kian', S('help_student') === 'available' ? '!' : (S('help_student') === 'active' && hasSand ? 'star' : null));
    // دنیا
    this.npcs.setMarker('donya', S('collect_cans') === 'available' ? '!' : (S('collect_cans') === 'active' && P('collect_cans') >= 8 ? 'star' : null));

    // مارکرهای مأموریت‌های داستانی
    for (const id in this.dyn) {
      const q = this.dyn[id];
      if (!q.marker) continue;
      let m = null;
      try { m = q.marker(); } catch (e) { m = null; }
      if (!m || !m[0]) continue;
      // اگر مأموریت اصلی روی همان NPC مارکر دارد، فقط وقتی فعال نیست بازنویسی کن
      const already = ['sara', 'farhadi', 'ahmadi', 'rostami'].includes(m[0]) &&
        (this.st.lost_bag.st === 'available' || this.st.library_books.st === 'available' || this.st.riddle.st === 'available' || this.st.football.st === 'available');
      if (already && m[1] === '!') continue;
      this.npcs.setMarker(m[0], m[1]);
    }
  }

  /* ---------------- ۱. کوله‌پشتی گمشده ---------------- */
  _talkSara() {
    const m = this.st.lost_bag;
    if (m.st === 'done') {
      this._dlg('سارا', 'باز هم ممنون! کوله‌پشتی‌ام نجات پیدا کرد.', [{ label: 'قربانت!', fn: () => this._close() }]);
    } else if (m.st === 'active' && m.prog >= 1) {
      this._dlg('سارا', 'آفرین! پیداش کردی! خیلی ممنونم!', [{ label: 'تحویل کوله‌پشتی', fn: () => { this.game.inv.bag = 0; this._close(); this._complete('lost_bag'); } }]);
    } else if (m.st === 'active') {
      this._dlg('سارا', 'کوله‌پشتی بنفشم هنوز پیدا نشده... پشت سالن ورزشی (سمت غرب مدرسه) دنبالش بگرد!', [{ label: 'باشه، می‌گردم', fn: () => this._close() }]);
    } else {
      this._dlg('سارا', 'سلام! کوله‌پشتی بنفشم را گم کردم. آخرین بار پشت سالن ورزشی بودم. کمکم می‌کنی پیدایش کنم؟',
        [{ label: 'حتماً! قبول می‌کنم', fn: () => { this._close(); this._accept('lost_bag'); if ((this.game.inv.bag || 0) > 0) { this.st.lost_bag.prog = 1; this.refreshMarkers(); } } },
         { label: 'بعداً', fn: () => this._close() }]);
    }
  }

  /* ---------------- ۲. کتاب‌های کتابخانه ---------------- */
  _talkFarhadi() {
    const m = this.st.library_books;
    if (m.st === 'done') {
      this._dlg('آقای فرهادی', 'کتاب‌ها سر جایشان هستند. ممنون!', [{ label: 'خواهش می‌کنم', fn: () => this._close() }]);
    } else if (m.st === 'active') {
      const n = this.game.inv.books || 0;
      this._dlg('آقای فرهادی', n >= 3 ? 'هر سه کتاب را داری! ببرشان پیش آقای احمدی در کتابخانه.' : 'از قفسه همین کلاس ' + faNum(3 - n) + ' کتاب دیگر بردار و به کتابخانه ببر.',
        [{ label: 'باشه', fn: () => this._close() }]);
    } else {
      this._dlg('آقای فرهادی', 'سلام! این ۳ کتاب باید به کتابخانه برگردند. از قفسه همین کلاس برشان دار و به آقای احمدی تحویل بده.',
        [{ label: 'قبول می‌کنم', fn: () => { this._close(); this._accept('library_books'); this._syncBooks(); } },
         { label: 'بعداً', fn: () => this._close() }]);
    }
  }

  _syncBooks() {
    this.st.library_books.prog = this.game.inv.books || 0;
    this.refreshMarkers();
  }

  /* ---------------- ۳. فوتبال ---------------- */
  _talkRostami() {
    const m = this.st.football;
    if (m.st === 'done') {
      this._dlg('مربی رستمی', 'تو ستاره آینده تیم مدرسه‌ای!', [{ label: 'ممنون مربی!', fn: () => this._close() }]);
    } else if (m.st === 'active' && m.prog >= 3) {
      this._dlg('مربی رستمی', 'فوق‌العاده! هر سه گل را زدی! جایزه‌ات را بگیر.', [{ label: 'دریافت جایزه', fn: () => { this._close(); this._complete('football'); } }]);
    } else if (m.st === 'active') {
      this._dlg('مربی رستمی', 'هنوز ' + faNum(3 - m.prog) + ' گل دیگر به دروازه شرقی (سمت راست زمین) بزن! با دویدن به توپ ضربه بزن.',
        [{ label: 'باشه', fn: () => this._close() }]);
    } else {
      this._dlg('مربی رستمی', 'به آزمون فوتبال خوش آمدی! ۳ گل به دروازه شرقی بزن تا قبول شوی. کافی است به توپ نزدیک شوی و بدوی!',
        [{ label: 'شروع آزمون', fn: () => { this._close(); this._accept('football'); this.world.resetBall(); } },
         { label: 'بعداً', fn: () => this._close() }]);
    }
  }

  _onGoal(side) {
    const m = this.st.football;
    this.audio.play('whistle');
    if (m.st !== 'active') {
      this.audio.play('goal');
      this.ui.toast(side === 'east' ? 'گل به دروازه شرقی!' : 'گل به دروازه غربی!');
      return;
    }
    if (side === 'east') {
      m.prog++;
      this.audio.play('goal');
      if (m.prog >= 3) {
        this.ui.toast('گل سوم! برگرد پیش مربی رستمی.');
      } else {
        this.ui.toast('گل ' + faNum(m.prog) + ' از ۳! ادامه بده!');
      }
      this.refreshMarkers();
      this.game.autosave();
    } else {
      this.ui.toast('این دروازه غربی بود! به دروازه شرقی گل بزن.');
    }
  }

  /* ---------------- ۴. نامه فوری (زمان‌دار) ---------------- */
  _talkNima() {
    const m = this.st.timed_note;
    if (m.st === 'done') {
      this._dlg('نیما', 'نامه به‌موقع رسید. دمت گرم!', [{ label: 'قربانت', fn: () => this._close() }]);
    } else if (m.st === 'active') {
      this._dlg('نیما', 'بدو! نامه را به دفتر مدیر (خانم رضایی) برسان!', [{ label: 'می‌روم!', fn: () => this._close() }]);
    } else {
      this._dlg('نیما', 'فوری! این نامه باید خیلی سریع به دفتر مدیر برسه. فقط ۱۵۰ ثانیه وقت داری! قبول می‌کنی؟',
        [{ label: 'قبول! می‌دوم', fn: () => { this._close(); this._accept('timed_note'); this.game.inv.note = 1; this.timedLeft = 150; } },
         { label: 'بعداً', fn: () => this._close() }]);
    }
  }

  _talkRezaei() {
    const m = this.st.timed_note;
    const opts = [];
    if (m.st === 'active') {
      opts.push({ label: 'تحویل نامه فوری', fn: () => { this.game.inv.note = 0; this._close(); this._complete('timed_note'); } });
      this._dlg('خانم رضایی', 'نامه را آوردی؟ عالی! به‌موقع رسید.', opts);
    } else {
      this._dlg('خانم رضایی', 'در مدرسه ما نظم حرف اول را می‌زند. کاری داشتی عزیزم؟',
        [{ label: 'نه، ممنون', fn: () => this._close() }]);
    }
  }

  /* ---------------- ۵. مسیر مخفی ---------------- */
  _talkKarimi() {
    const m = this.st.secret_path;
    if (m.st === 'done') {
      this._dlg('آقای کریمی', 'باغ مخفی با تو زیباتر شد!', [{ label: 'ممنون', fn: () => this._close() }]);
    } else if (this.secretFound) {
      this._dlg('آقای کریمی', 'واقعاً باغ مخفی را پیدا کردی؟ آفرین! تو یک کاشف واقعی هستی.',
        [{ label: 'باغ را پیدا کردم!', fn: () => { this._close(); this._complete('secret_path'); } }]);
    } else if (m.st === 'active') {
      this._dlg('آقای کریمی', 'پشت ساختمان اصلی، بین درخت‌های انبوه شمال‌غرب مدرسه دنبال باغ بگرد...', [{ label: 'باشه', fn: () => this._close() }]);
    } else {
      this._dlg('آقای کریمی', 'می‌گویند پشت ساختمان مدرسه، بین درخت‌ها یک باغ مخفی قدیمی هست. حاضری پیدایش کنی؟',
        [{ label: 'قبول می‌کنم', fn: () => { this._close(); this._accept('secret_path'); } },
         { label: 'بعداً', fn: () => this._close() }]);
    }
  }

  _onSecret() {
    const m = this.st.secret_path;
    if (m.st === 'active') {
      this.audio.play('secret');
      this.secretFound = true;
      this._complete('secret_path');
    } else if (m.st !== 'done' && !this.secretFound) {
      this.secretFound = true;
      this.game.addScore(20);
      this.audio.play('secret');
      this.ui.toast('باغ مخفی را کشف کردی! به آقای کریمی (باغبان) خبر بده.');
      this.refreshMarkers();
    }
  }

  /* ---------------- ۶. ناهار کیان ---------------- */
  _talkKian() {
    const m = this.st.help_student;
    const has = (this.game.inv.sandwich || 0) > 0;
    if (m.st === 'done') {
      this._dlg('کیان', 'آن ساندویچ نجاتم داد! ممنون!', [{ label: 'نوش جان!', fn: () => this._close() }]);
    } else if (m.st === 'active' && has) {
      this._dlg('کیان', 'ساندویچ آوردی؟! تو بهترینی!', [{ label: 'دادن ساندویچ', fn: () => { this.game.inv.sandwich--; this._close(); this._complete('help_student'); } }]);
    } else if (m.st === 'active') {
      this._dlg('کیان', 'شکم‌ام قار و قور می‌کند... از بوفه (نسرین، سمت غرب حیاط) یک ساندویچ بخر!', [{ label: 'باشه', fn: () => this._close() }]);
    } else {
      this._dlg('کیان', 'سلام... خیلی گرسنه‌ام و پولم ته کشیده. می‌توانی از بوفه یک ساندویچ برایم بخری؟',
        [{ label: 'حتماً! قبول', fn: () => { this._close(); this._accept('help_student'); } },
         { label: 'بعداً', fn: () => this._close() }]);
    }
  }

  /* ---------------- ۷. قهرمان بازیافت ---------------- */
  _talkDonya() {
    const m = this.st.collect_cans;
    if (m.st === 'done') {
      this._dlg('دنیا', 'محوطه مدرسه برق می‌زند! ممنون قهرمان!', [{ label: 'وظیفه بود!', fn: () => this._close() }]);
    } else if (m.st === 'active' && m.prog >= 8) {
      this._dlg('دنیا', 'هر ۸ قوطی جمع شد! مدرسه به تو افتخار می‌کند.', [{ label: 'تحویل قوطی‌ها', fn: () => { this.game.inv.cans = 0; this._close(); this._complete('collect_cans'); } }]);
    } else if (m.st === 'active') {
      this._dlg('دنیا', 'تا حالا ' + faNum(m.prog) + ' قوطی از ۸ قوطی جمع کردی. کنار سطل‌ها و محوطه را بگرد!', [{ label: 'باشه', fn: () => this._close() }]);
    } else {
      this._dlg('دنیا', 'من قوطی‌های خالی محوطه را برای بازیافت جمع می‌کنم. ۸ قوطی هست. کمکم می‌کنی؟',
        [{ label: 'قبول می‌کنم', fn: () => { this._close(); this._accept('collect_cans'); this.st.collect_cans.prog = this.game.inv.cans || 0; this.refreshMarkers(); } },
         { label: 'بعداً', fn: () => this._close() }]);
    }
  }

  /* ---------------- ۸. معما + تحویل کتاب (کتابدار) ---------------- */
  _talkAhmadi() {
    const books = this.st.library_books;
    const rid = this.st.riddle;
    const ready = books.st === 'active' && (this.game.inv.books || 0) >= 3;
    const opts = [];
    if (ready) {
      opts.push({ label: 'تحویل ۳ کتاب', fn: () => { this.game.inv.books = 0; this._close(); this._complete('library_books'); } });
    }
    if (rid.st === 'available') {
      opts.push({ label: 'شنیدن معمای کتابدار', fn: () => this._riddle() });
    } else if (rid.st === 'active') {
      opts.push({ label: 'تلاش دوباره برای معما', fn: () => this._riddle() });
    }
    if (books.st === 'active' && !ready) {
      opts.push({ label: 'هنوز کتاب‌ها کامل نشده', fn: () => this._close() });
    }
    opts.push({ label: 'خداحافظ', fn: () => this._close() });

    let text = 'به کتابخانه خوش آمدی! سکوت را رعایت کن.';
    if (ready) text = 'کتاب‌ها را آوردی؟ عالی! تحویلشان بده.';
    else if (rid.st === 'done' && books.st === 'done') text = 'تو هم کتاب‌خوانی هم معماحل‌کن! آفرین.';
    this._dlg('آقای احمدی', text, opts);
  }

  _riddle() {
    if (this.st.riddle.st === 'available') {
      this.st.riddle.st = 'active';
      this.refreshMarkers();
    }
    this._dlg('معمای کتابدار', '«من همیشه می‌آیم، اما هیچ‌وقت نمی‌رسم. من چیست؟»',
      [{ label: 'فردا', fn: () => { this._close(); this._complete('riddle'); } },
       { label: 'دیروز', fn: () => { this.audio.play('error'); this.ui.toast('اشتباه! دوباره فکر کن.'); this._riddle(); } },
       { label: 'امروز', fn: () => { this.audio.play('error'); this.ui.toast('اشتباه! دوباره فکر کن.'); this._riddle(); } }]);
  }

  /* ---------------- فروشگاه بوفه ---------------- */
  _openShop() {
    this.audio.play('open');
    this.ui.shop(
      [
        { id: 'sandwich', name: 'ساندویچ', desc: 'سیرکننده! (+۳۰ جان، +۲۰ انرژی)', price: 15 },
        { id: 'juice', name: 'آبمیوه', desc: 'خنک و مقوی! (+۴۰ انرژی)', price: 10 },
      ],
      this.game.coins,
      (item) => this._buy(item)
    );
  }

  _buy(item) {
    if (this.game.coins < item.price) {
      this.audio.play('error');
      this.ui.toast('پول کافی نداری! (' + faNum(item.price) + ' سکه لازم است)');
      return;
    }
    this.game.addCoins(-item.price);
    this.game.inv[item.id] = (this.game.inv[item.id] || 0) + 1;
    this.audio.play('coin');
    this.ui.toast(item.name + ' خریدی! (' + faNum(this.game.coins) + ' سکه مانده)');
    this.ui.shopCoins(this.game.coins);
    this.refreshMarkers();
    if (item.id === 'sandwich' && this.st.help_student.st === 'active') {
      this.ui.toast('ساندویچ را به کیان برسان!');
    }
  }

  /* ---------------- جمع‌آوری آیتم‌ها ---------------- */
  _onPickup(kind, id) {
    const g = this.game;
    if (kind === 'can') {
      g.inv.cans = (g.inv.cans || 0) + 1;
      g.addScore(5);
      this.audio.play('pickup');
      if (this.st.collect_cans.st === 'active') {
        this.st.collect_cans.prog = g.inv.cans;
        if (g.inv.cans >= 8) this.ui.toast('هر ۸ قوطی جمع شد! برگرد پیش دنیا.');
        else this.ui.toast('قوطی ' + faNum(g.inv.cans) + ' از ۸');
        this.refreshMarkers();
        g.autosave();
      } else {
        this.ui.toast('یک قوطی خالی برداشتی. (دنیا دنبال قوطی می‌گردد!)');
      }
    } else if (kind === 'book') {
      g.inv.books = (g.inv.books || 0) + 1;
      g.addScore(5);
      this.audio.play('pickup');
      if (this.st.library_books.st === 'active') {
        this._syncBooks();
        if (g.inv.books >= 3) this.ui.toast('هر ۳ کتاب جمع شد! ببر پیش آقای احمدی در کتابخانه.');
        else this.ui.toast('کتاب ' + faNum(g.inv.books) + ' از ۳');
        g.autosave();
      } else {
        this.ui.toast('یک کتاب برداشتی. (آقای فرهادی دنبال کتاب می‌گردد!)');
      }
    } else if (kind === 'bag') {
      g.inv.bag = 1;
      this.audio.play('pickup');
      if (this.st.lost_bag.st === 'active') {
        this.st.lost_bag.prog = 1;
        this.ui.toast('کوله‌پشتی پیدا شد! برگرد پیش سارا.');
        this.refreshMarkers();
        g.autosave();
      } else {
        this.ui.toast('کوله‌پشتی بنفش... شبیه مال ساراست!');
      }
    }
  }

  /* ---------------- به‌روزرسانی ---------------- */
  update(dt) {
    // مأموریت زمان‌دار
    if (this.st.timed_note.st === 'active') {
      this.timedLeft -= dt;
      if (this.timedLeft <= 0) {
        this.timedLeft = 0;
        this.st.timed_note.st = 'available';
        this.game.inv.note = 0;
        this.audio.play('fail');
        this.ui.toast('وقت تمام شد! نامه نرسید... دوباره با نیما صحبت کن.');
        this.refreshMarkers();
      }
    }
  }

  getTimer() {
    return this.st.timed_note.st === 'active' ? this.timedLeft : null;
  }

  /* ---------------- Quest Tracker ---------------- */
  tracker() {
    const out = this._dynamicTracker();
    const T = MISSION_TITLES;
    const g = this.game;
    if (this.st.lost_bag.st === 'active') {
      out.push({ id: 'lost_bag', title: T.lost_bag, obj: this.st.lost_bag.prog >= 1 ? 'کوله‌پشتی را به سارا برگردان' : 'کوله‌پشتی را پشت سالن ورزشی پیدا کن' });
    }
    if (this.st.library_books.st === 'active') {
      const n = g.inv.books || 0;
      out.push({ id: 'library_books', title: T.library_books, obj: n >= 3 ? 'کتاب‌ها را به کتابدار تحویل بده' : 'کتاب‌ها از قفسه کلاس A: ' + faNum(Math.min(n, 3)) + ' از ۳' });
    }
    if (this.st.football.st === 'active') {
      const p = this.st.football.prog;
      out.push({ id: 'football', title: T.football, obj: p >= 3 ? 'برگرد پیش مربی رستمی' : 'گل به دروازه شرقی: ' + faNum(p) + ' از ۳' });
    }
    if (this.st.timed_note.st === 'active') {
      out.push({ id: 'timed_note', title: T.timed_note, obj: 'نامه را به دفتر مدیر برسان!' });
    }
    if (this.st.secret_path.st === 'active' && !this.secretFound) {
      out.push({ id: 'secret_path', title: T.secret_path, obj: 'باغ مخفی را پیدا کن' });
    }
    if (this.st.help_student.st === 'active') {
      const has = (g.inv.sandwich || 0) > 0;
      out.push({ id: 'help_student', title: T.help_student, obj: has ? 'ساندویچ را به کیان بده' : 'از بوفه ساندویچ بخر (' + faNum(15) + ' سکه)' });
    }
    if (this.st.collect_cans.st === 'active') {
      const p = this.st.collect_cans.prog;
      out.push({ id: 'collect_cans', title: T.collect_cans, obj: p >= 8 ? 'قوطی‌ها را به دنیا تحویل بده' : 'قوطی‌های بازیافت: ' + faNum(p) + ' از ۸' });
    }
    if (this.st.riddle.st === 'active') {
      out.push({ id: 'riddle', title: T.riddle, obj: 'معمای کتابدار را حل کن' });
    }
    return out;
  }

  /** اهداف طلایی روی نقشه */
  targets() {
    const t = this._dynamicTargets();
    const npcPos = (id) => {
      const n = this.npcs.npcById(id);
      return n ? { x: n.group.position.x, z: n.group.position.z } : null;
    };
    if (this.st.lost_bag.st === 'active') {
      t.push(this.st.lost_bag.prog >= 1 ? npcPos('sara') : { x: -62, z: 17 });
    }
    if (this.st.library_books.st === 'active') {
      t.push((this.game.inv.books || 0) >= 3 ? npcPos('ahmadi') : { x: -27, z: -28 });
    }
    if (this.st.football.st === 'active') {
      t.push(this.st.football.prog >= 3 ? npcPos('rostami') : { x: 44, z: 22 });
    }
    if (this.st.timed_note.st === 'active') t.push({ x: 19, z: -30 });
    if (this.st.secret_path.st === 'active' && !this.secretFound) t.push({ x: -54, z: -40 });
    if (this.st.help_student.st === 'active') {
      t.push((this.game.inv.sandwich || 0) > 0 ? npcPos('kian') : { x: -16, z: 12.5 });
    }
    if (this.st.collect_cans.st === 'active') {
      if (this.st.collect_cans.prog >= 8) {
        t.push(npcPos('donya'));
      } else {
        // نزدیک‌ترین قوطی باقی‌مانده
        let best = null, bd = 1e9;
        const p = this.ctx.player;
        for (const id in this.world.pickups) {
          const pk = this.world.pickups[id];
          if (pk.kind !== 'can' || pk.taken) continue;
          const d = (pk.x - p.x) ** 2 + (pk.z - p.z) ** 2;
          if (d < bd) { bd = d; best = pk; }
        }
        t.push(best ? { x: best.x, z: best.z } : npcPos('donya'));
      }
    }
    if (this.st.riddle.st === 'active') t.push(npcPos('ahmadi'));
    return t.filter(Boolean);
  }

  /** مأموریت‌های داستانی فعال برای نوار کنار صفحه */
  _dynamicTracker() {
    const out = [];
    for (const id in this.dyn) {
      const q = this.dyn[id];
      const st = this.st[id] ? this.st[id].st : 'available';
      if (st !== 'active') continue;
      let obj = '';
      try { obj = typeof q.objective === 'function' ? q.objective() : (q.objective || ''); } catch (e) { obj = ''; }
      out.push({ id, title: q.title, obj: obj || 'در حال انجام…', chapter: q.chapter || '', side: !!q.side });
    }
    return out;
  }

  completionPct() {
    const ids = Object.keys(this.st);
    const done = ids.filter((id) => this.st[id].st === 'done').length;
    return Math.round((done / ids.length) * 100);
  }

  /** اهداف مینی‌مپ برای مأموریت‌های داستانی فعال */
  _dynamicTargets() {
    const t = [];
    for (const id in this.dyn) {
      const q = this.dyn[id];
      const st = this.st[id] ? this.st[id].st : 'available';
      if (st !== 'active' || !q.target) continue;
      let p = null;
      try { p = q.target(); } catch (e) { p = null; }
      if (p && p.x != null) t.push({ x: p.x, z: p.z, id });
    }
    return t;
  }

  stateForSave() {
    const st = {};
    for (const id of Object.keys(this.st)) st[id] = { ...this.st[id] };
    return { st, secretFound: this.secretFound, timedLeft: this.timedLeft };
  }

  loadState(s) {
    if (!s) return;
    // آیتم‌های مصرف‌شده در مأموریت‌های تمام‌شده را پاک کن
    if (s.st) {
      for (const id of Object.keys(this.st)) {
        if (s.st[id]) this.st[id] = { st: s.st[id].st, prog: s.st[id].prog || 0 };
      }
      if (this.st.library_books.st === 'done') this.game.inv.books = 0;
      if (this.st.collect_cans.st === 'done') this.game.inv.cans = 0;
      if (this.st.lost_bag.st === 'done') this.game.inv.bag = 0;
      if (this.st.timed_note.st !== 'active') this.game.inv.note = 0;
    }
    this.secretFound = !!s.secretFound;
    if (this.st.timed_note.st === 'active') {
      this.timedLeft = Math.max(30, s.timedLeft || 60);
    }
    this.refreshMarkers();
  }
}

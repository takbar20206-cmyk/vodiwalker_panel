/* ============================================================
   School Life: Open Campus — grades.js
   سیستم درس و امتحان: دانش، کارنامه، معدل، آزمون‌های چندگزینه‌ای
   ============================================================ */
import { clamp, rand, randInt, choice, faNum } from './utils.js';

export const SUBJECTS = [
  { id: 'math',       name: 'ریاضی',   icon: '📐', teacher: 'آقای فرهادی',  room: 'roomA',   color: '#3b82f6' },
  { id: 'science',    name: 'علوم',    icon: '🧪', teacher: 'خانم موسوی',   room: 'lab',     color: '#22c55e' },
  { id: 'literature', name: 'فارسی',   icon: '📖', teacher: 'خانم صادقی',   room: 'roomB',   color: '#f59e0b' },
  { id: 'english',    name: 'انگلیسی', icon: '🔤', teacher: 'آقای احمدی',   room: 'library', color: '#8b5cf6' },
  { id: 'art',        name: 'هنر',     icon: '🎨', teacher: 'خانم نیک‌پور', room: 'roomB',   color: '#ec4899' },
  { id: 'sport',      name: 'ورزش',    icon: '⚽', teacher: 'مربی رستمی',   room: 'gym',     color: '#14b8a6' },
];

/* ---------- بانک سؤال (۶ سؤال برای هر درس) ---------- */
export const QUESTIONS = {
  math: [
    { q: 'حاصل ۷ × ۸ چند است؟', opts: ['۵۴', '۵۶', '۶۴', '۴۸'], a: 1 },
    { q: 'مساحت مربعی با ضلع ۵ سانتی‌متر؟', opts: ['۲۰', '۲۵', '۳۰', '۱۵'], a: 1 },
    { q: 'نصف ۹۰ چند است؟', opts: ['۳۵', '۴۰', '۴۵', '۵۰'], a: 2 },
    { q: 'کدام عدد اول است؟', opts: ['۹', '۱۵', '۱۷', '۲۱'], a: 2 },
    { q: 'محیط مثلثی با ضلع‌های ۳، ۴ و ۵؟', opts: ['۱۰', '۱۲', '۱۴', '۱۵'], a: 1 },
    { q: '۱۵٪ از ۲۰۰ چند است؟', opts: ['۲۰', '۲۵', '۳۰', '۳۵'], a: 2 },
  ],
  science: [
    { q: 'کدام‌یک منبع نور طبیعی است؟', opts: ['لامپ', 'خورشید', 'فانوس', 'شمع'], a: 1 },
    { q: 'آب در چند درجه می‌جوشد؟', opts: ['۵۰', '۸۰', '۱۰۰', '۱۲۰'], a: 2 },
    { q: 'کدام‌یک گیاه‌خوار است؟', opts: ['شیر', 'گاو', 'گرگ', 'عقاب'], a: 1 },
    { q: 'اکسیژن را کدام‌ها تولید می‌کنند؟', opts: ['گیاهان', 'سنگ‌ها', 'ابرها', 'خاک'], a: 0 },
    { q: 'کدام‌یک فلز است؟', opts: ['چوب', 'آهن', 'شیشه', 'کاغذ'], a: 1 },
    { q: 'سیارهٔ ما چه نام دارد؟', opts: ['مریخ', 'زمین', 'زهره', 'مشتری'], a: 1 },
  ],
  literature: [
    { q: '«سعدی» شاعر کدام شهر است؟', opts: ['شیراز', 'تبریز', 'اصفهان', 'یزد'], a: 0 },
    { q: 'کدام‌یک ضرب‌المثل است؟', opts: ['کار نیکو کردن از پر کردن است', 'شب بخیر', 'سلام', 'خداحافظ'], a: 0 },
    { q: '«آسمان» چه نوع کلمه‌ای است؟', opts: ['اسم', 'فعل', 'حرف', 'صفت'], a: 0 },
    { q: 'شاهنامه اثر کیست؟', opts: ['حافظ', 'فردوسی', 'مولوی', 'نظامی'], a: 1 },
    { q: 'جمع «کتاب» چه می‌شود؟', opts: ['کتاب‌ها', 'کاتبان', 'کتبه', 'مکتب'], a: 0 },
    { q: '«گلستان» نوشتهٔ کیست؟', opts: ['سعدی', 'خیام', 'رودکی', 'عطار'], a: 0 },
  ],
  english: [
    { q: 'معنی «Library» چیست؟', opts: ['کتابخانه', 'آزمایشگاه', 'ورزشگاه', 'دفتر'], a: 0 },
    { q: 'کدام‌یک درست است؟', opts: ['I am a student', 'I is student', 'I are student', 'I be student'], a: 0 },
    { q: '«Seven» یعنی چه؟', opts: ['شش', 'هفت', 'هشت', 'نه'], a: 1 },
    { q: 'جمع «book» چیست؟', opts: ['bookes', 'books', 'book', 'bookies'], a: 1 },
    { q: '«Good morning» یعنی چه؟', opts: ['شب بخیر', 'صبح بخیر', 'روز بخیر', 'خدا حافظ'], a: 1 },
    { q: 'رنگ «Blue» چیست؟', opts: ['آبی', 'سبز', 'زرد', 'سرخ'], a: 0 },
  ],
  art: [
    { q: 'رنگ‌های اصلی کدام‌اند؟', opts: ['قرمز، آبی، زرد', 'سبز، نارنجی، بنفش', 'سفید، سیاه، خاکستری', 'صورتی، قهوه‌ای، طلایی'], a: 0 },
    { q: 'اگر آبی و زرد را مخلوط کنیم؟', opts: ['بنفش', 'سبز', 'نارنجی', 'قهوه‌ای'], a: 1 },
    { q: 'خمیر مجسمه‌سازی معمولاً از چیست؟', opts: ['گِل', 'آهن', 'شیشه', 'سنگ'], a: 0 },
    { q: 'کدام‌یک رنگ گرم است؟', opts: ['آبی', 'نارنجی', 'سبز', 'بنفش'], a: 1 },
    { q: 'نقاشی روی دیوار چه نام دارد؟', opts: ['دیوارنگاره', 'پوستر', 'قاب', 'طرح'], a: 0 },
    { q: 'برای نقاشی با آبرنگ به چه چیزی نیاز داریم؟', opts: ['آب', 'روغن', 'بنزین', 'شکر'], a: 0 },
  ],
  sport: [
    { q: 'در فوتبال هر تیم چند بازیکن دارد؟', opts: ['۹', '۱۰', '۱۱', '۱۲'], a: 2 },
    { q: 'قبل از ورزش چه باید کرد؟', opts: ['گرم کردن', 'خوابیدن', 'شیرینی خوردن', 'دویدن سریع'], a: 0 },
    { q: 'طول استخر المپیک چند متر است؟', opts: ['۲۵', '۵۰', '۷۵', '۱۰۰'], a: 1 },
    { q: 'در بسکتبال هر سبد چند امتیاز دارد؟', opts: ['۱', '۲', '۳', '۴'], a: 1 },
    { q: 'کدام‌یک ورزش انفرادی است؟', opts: ['والیبال', 'شنا', 'فوتبال', 'بسکتبال'], a: 1 },
    { q: 'آب بدن را بعد از ورزش چگونه جبران کنیم؟', opts: ['نوشیدن آب', 'نوشابه', 'چای پررنگ', 'هیچ‌کدام'], a: 0 },
  ],
};

export class GradeBook {
  constructor(ctx) {
    this.ctx = ctx;   // {ui, audio, game, world}
    this.knowledge = {};
    this.grades = {};
    this.examsTaken = {};
    this.studyCount = 0;
    this.classT = 0;
    this._lastClassToast = 0;
    this.exam = null;      // آزمون فعال
    this.studySessions = 0;
    this.perfect = 0;
    for (const s of SUBJECTS) { this.knowledge[s.id] = 8; this.grades[s.id] = null; this.examsTaken[s.id] = 0; }
  }

  get ui() { return this.ctx.ui; }
  get audio() { return this.ctx.audio; }
  get game() { return this.ctx.game; }

  subject(id) { return SUBJECTS.find((s) => s.id === id); }

  addKnowledge(n, subjectId) {
    if (subjectId) {
      this.knowledge[subjectId] = clamp((this.knowledge[subjectId] || 0) + n, 0, 100);
      return;
    }
    // پخش روی درس‌های ضعیف‌تر
    const sorted = [...SUBJECTS].sort((a, b) => this.knowledge[a.id] - this.knowledge[b.id]);
    sorted[0].id && (this.knowledge[sorted[0].id] = clamp(this.knowledge[sorted[0].id] + n, 0, 100));
    if (sorted[1]) this.knowledge[sorted[1].id] = clamp(this.knowledge[sorted[1].id] + n * 0.5, 0, 100);
  }

  /** مطالعه در کتابخانه یا خوابگاه */
  study() {
    this.studyCount++;
    this.studySessions++;
    this.addKnowledge(7);
    this.audio.play('page');
    const s = [...SUBJECTS].sort((a, b) => this.knowledge[a.id] - this.knowledge[b.id])[0];
    this.ui.toast('مطالعه کردی! 📚 دانش ' + s.name + ' بالا رفت.');
    if (this.ctx.achievements) this.ctx.achievements.bump('study', 1);
    return true;
  }

  /** حضور در کلاس: در ساعت کلاس و داخل کلاس/سالن باش */
  update(dt, x) {
    // تایمر آزمون
    if (this.exam) {
      this.exam.time -= dt;
      this.ui.examUpdate(Math.max(0, this.exam.time));
      if (this.exam.time <= 0) this._finishExam();
      return;
    }
    if (!x || !x.area) return;
    const during = (x.timeH >= 8 && x.timeH < 10) || (x.timeH >= 11 && x.timeH < 13);
    if (!during) return;
    const map = { roomA: 'math', roomB: 'literature', lab: 'science', library: 'english', gym: 'sport' };
    const sub = map[x.area];
    if (!sub) return;
    this.classT += dt;
    this.knowledge[sub] = clamp(this.knowledge[sub] + dt * 0.55, 0, 100);
    if (this.classT > 4 && performance.now() - this._lastClassToast > 45000) {
      this._lastClassToast = performance.now();
      this.classT = 0;
      const sj = this.subject(sub);
      this.ui.toast('سر کلاس ' + sj.name + ' هستی — دانش زیاد می‌شود! ' + sj.icon);
      this.audio.play('page');
    }
  }

  /** شروع آزمون یک درس */
  startExam(subjectId) {
    const sj = this.subject(subjectId);
    if (!sj) return false;
    if (this.exam) { this.ui.toast('الان در آزمون دیگری هستی!'); return false; }
    if ((this.knowledge[subjectId] || 0) < 12) {
      this.ui.toast('برای امتحان ' + sj.name + ' باید بیشتر مطالعه کنی! (کلاس یا کتابخانه)');
      this.audio.play('error');
      return false;
    }
    const pool = (QUESTIONS[subjectId] || []).slice();
    const picked = [];
    while (picked.length < 5 && pool.length) {
      const i = randInt(0, pool.length - 1);
      picked.push(pool.splice(i, 1)[0]);
    }
    this.exam = {
      subject: subjectId, list: picked, i: 0, correct: 0,
      time: 30, perQuestion: 30,
    };
    this.audio.play('open');
    this._askCurrent();
    return true;
  }

  _askCurrent() {
    const e = this.exam;
    const q = e.list[e.i];
    this.ui.examStart({
      subject: this.subject(e.subject).name,
      icon: this.subject(e.subject).icon,
      question: q.q,
      options: q.opts,
      index: e.i + 1,
      total: e.list.length,
      time: e.time,
      perQuestion: e.perQuestion,
    }, (ansIdx) => this._answer(ansIdx));
  }

  _answer(idx) {
    const e = this.exam;
    if (!e) return;
    const q = e.list[e.i];
    if (idx === q.a) {
      e.correct++;
      this.audio.play('coin');
    } else {
      this.audio.play('error');
    }
    e.i++;
    e.time = e.perQuestion;
    if (e.i >= e.list.length) this._finishExam();
    else this._askCurrent();
  }

  _finishExam() {
    const e = this.exam;
    if (!e) return;
    this.exam = null;
    const kn = this.knowledge[e.subject] || 0;
    let grade = (e.correct / e.list.length) * 15 + (kn / 100) * 5;
    grade = clamp(Math.round(grade * 4) / 4, 0, 20);
    this.grades[e.subject] = grade;
    this.examsTaken[e.subject] = (this.examsTaken[e.subject] || 0) + 1;
    const sj = this.subject(e.subject);
    if (grade >= 16) {
      this.perfect++;
      this.game.addScore(120);
      this.game.addCoins(30);
    } else {
      this.game.addScore(40);
    }
    this.ui.examResult({
      subject: sj.name, icon: sj.icon, grade, correct: e.correct, total: e.list.length,
      knowledge: Math.round(kn),
      passed: grade >= 10,
      gpa: this.gpa(),
    });
    this.audio.play(grade >= 16 ? 'complete' : grade >= 10 ? 'quest' : 'fail');
    if (this.ctx.achievements) {
      if (grade >= 16) this.ctx.achievements.bump('goodExams', 1);
      if (this.gpa() >= 18) this.ctx.achievements.bump('gpa18', 1);
    }
    this.game.autosave();
  }

  gpa() {
    const list = SUBJECTS.map((s) => this.grades[s.id]).filter((g) => g != null);
    if (!list.length) return 0;
    return Math.round((list.reduce((a, b) => a + b, 0) / list.length) * 100) / 100;
  }

  progressPct() {
    const list = SUBJECTS.map((s) => this.knowledge[s.id] || 0);
    return Math.round(list.reduce((a, b) => a + b, 0) / list.length);
  }

  report() {
    return {
      subjects: SUBJECTS.map((s) => ({
        ...s,
        grade: this.grades[s.id],
        knowledge: Math.round(this.knowledge[s.id] || 0),
        exams: this.examsTaken[s.id] || 0,
        gradeText: this.grades[s.id] == null ? '—' : faNum(this.grades[s.id].toFixed(2)),
      })),
      gpa: this.gpa(),
      gpaText: faNum(this.gpa().toFixed(2)),
      progress: this.progressPct(),
      examsTotal: Object.values(this.examsTaken).reduce((a, b) => a + b, 0),
      study: this.studySessions,
      ready: (id) => (this.knowledge[id] || 0) >= 12,
    };
  }

  openPanel() {
    if (this.ui.grades) this.ui.grades(this.report(), (id) => this.startExam(id));
  }

  stateForSave() {
    return {
      knowledge: { ...this.knowledge },
      grades: { ...this.grades },
      examsTaken: { ...this.examsTaken },
      studySessions: this.studySessions,
      perfect: this.perfect,
    };
  }

  loadState(s) {
    if (!s) return;
    if (s.knowledge) for (const k in s.knowledge) this.knowledge[k] = s.knowledge[k];
    if (s.grades) for (const k in s.grades) this.grades[k] = s.grades[k];
    if (s.examsTaken) for (const k in s.examsTaken) this.examsTaken[k] = s.examsTaken[k];
    if (typeof s.studySessions === 'number') this.studySessions = s.studySessions;
    if (typeof s.perfect === 'number') this.perfect = s.perfect;
  }
}

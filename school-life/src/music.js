/* ============================================================
   School Life: Open Campus — music.js
   موسیقی پس‌زمینه procedural با WebAudio (بدون فایل صوتی)
   ترک‌ها: منو، روز، غروب، شب، باران، برف، مه، مسابقه، امتحان،
   جشن، پایان بازی — همه ساخته‌شده از نُت‌های زنده!
   ============================================================ */
import { clamp, rand, choice } from './utils.js';

const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- تعریف ترک‌ها ---------- */
/* هر ترک: تمپو، آکوردها (میدی)، الگوی باس، آرپژ، درامز */
function defTrack(o) {
  return {
    bpm: o.bpm,
    chords: o.chords,          // آرایه‌ای از آرایه‌های میدی
    pad: o.pad !== false,      // پد کشیده
    bass: o.bass || null,      // الگوی باس (0=بدون، 1=ریش، 2=هشتم، 3=چهارم)
    arp: o.arp || 0,           // شدت آرپژ ۰..۳
    lead: o.lead || 0,         // نُت ملودی ۰..۲
    kick: o.kick || null,      // الگوی کیک ۱۶ قدمی (رشته 'x..x')
    snare: o.snare || null,
    hat: o.hat || null,
    padType: o.padType || 'triangle',
    leadType: o.leadType || 'triangle',
    cutoff: o.cutoff || 900,
    swing: o.swing || 0,
  };
}

export const TRACKS = {
  menu: defTrack({
    bpm: 84, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]],
    bass: 2, arp: 1, lead: 1, kick: 'x.......x.......', hat: '..x...x...x...x.', cutoff: 700,
  }),
  day: defTrack({
    bpm: 110, chords: [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]],
    bass: 2, arp: 2, lead: 1, kick: 'x.....x...x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', padType: 'triangle', cutoff: 1500, leadType: 'square',
  }),
  dusk: defTrack({
    bpm: 90, chords: [[53, 57, 60], [55, 59, 62], [57, 60, 64], [52, 55, 59]],
    bass: 1, arp: 1, lead: 2, kick: 'x.......x.......', hat: '....x.......x...', padType: 'sine', cutoff: 900,
  }),
  night: defTrack({
    bpm: 74, chords: [[57, 60, 64], [52, 55, 59], [53, 57, 60], [52, 56, 59]],
    bass: 1, arp: 1, lead: 2, hat: '......x.........', padType: 'sine', leadType: 'sine', cutoff: 620,
  }),
  rain: defTrack({
    bpm: 70, chords: [[50, 53, 57], [45, 48, 52], [46, 50, 53], [53, 57, 60]],
    bass: 1, arp: 1, lead: 1, padType: 'sine', cutoff: 560,
  }),
  snow: defTrack({
    bpm: 78, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]],
    bass: 1, arp: 2, lead: 2, padType: 'sine', leadType: 'sine', cutoff: 1000,
  }),
  fog: defTrack({
    bpm: 62, chords: [[45, 52, 57], [43, 50, 55], [41, 48, 53], [43, 50, 55]],
    bass: 1, padType: 'sine', cutoff: 420,
  }),
  race: defTrack({
    bpm: 142, chords: [[52, 55, 59], [48, 52, 55], [55, 59, 62], [50, 54, 57]],
    bass: 3, arp: 3, lead: 2, kick: 'x..x..x...x..x..', snare: '....x.......x...', hat: 'xxxxxxxxxxxxxxxx', leadType: 'square', cutoff: 2200,
  }),
  exam: defTrack({
    bpm: 96, chords: [[57, 60, 63], [56, 59, 62], [55, 58, 61], [55, 59, 62]],
    bass: 2, arp: 2, kick: 'x...............', hat: '..x...x...x...x.', padType: 'sine', cutoff: 800,
  }),
  party: defTrack({
    bpm: 126, chords: [[57, 60, 64], [53, 57, 60], [60, 64, 67], [55, 59, 62]],
    bass: 3, arp: 3, lead: 2, kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.', leadType: 'square', cutoff: 2600,
  }),
  ending: defTrack({
    bpm: 76, chords: [[53, 57, 60], [60, 64, 67], [55, 59, 62], [57, 60, 64]],
    bass: 1, arp: 1, lead: 2, hat: '....x.......x...', padType: 'triangle', cutoff: 1100,
  }),
};

export class Music {
  constructor(audio, settings) {
    this.audio = audio;
    this.settings = settings;
    this.track = 'menu';
    this.next = 'menu';
    this.step = 0;
    this.nextTime = 0;
    this.bar = 0;
    this.gain = null;
    this.enabled = true;
    this._paused = false;
    this._lastBeat = 0;
    this._lock = false;
  }

  get ctx() { return this.audio ? this.audio.ctx : null; }
  get ok() { return !!this.ctx && !!this.gain; }

  _ensure() {
    const ctx = this.ctx;
    if (!ctx) return false;
    if (!this.gain) {
      try {
        this.gain = ctx.createGain();
        this.gain.gain.value = this.volume();
        this.gain.connect(this.audio.master || ctx.destination);
      } catch (e) { return false; }
    }
    return true;
  }

  volume() {
    const s = this.settings;
    if (!s) return 0.4;
    if (s.muted || s.music === false) return 0;
    return clamp((s.musicVolume != null ? s.musicVolume : 0.45), 0, 1);
  }

  applySettings() {
    if (!this.gain) return;
    try { this.gain.gain.value = this.volume(); } catch (e) { /* ignore */ }
  }

  setTrack(name, force) {
    if (!TRACKS[name]) return;
    if (this.track === name && !force) return;
    this.track = name;
    this.step = 0;
    this.bar = 0;
    this.nextTime = 0;
    this._lock = false;
    if (this.gain) {
      try {
        const t = this.ctx.currentTime;
        this.gain.gain.cancelScheduledValues(t);
        this.gain.gain.setTargetAtTime(this.volume(), t, 0.35);
      } catch (e) { /* ignore */ }
    }
  }

  /** انتخاب خودکار ترک بر اساس وضعیت بازی */
  autoSelect(ctx) {
    if (this._lock) return;   // ترک دستی (مثلاً مسابقه) فعال است
    let want = 'day';
    if (ctx.state === 'menu') want = 'menu';
    else if (ctx.racing) want = 'race';
    else if (ctx.party) want = 'party';
    else if (ctx.exam) want = 'exam';
    else if (ctx.ending) want = 'ending';
    else if (ctx.weatherTrack) want = ctx.weatherTrack;
    else if (ctx.timeH >= 19.5 || ctx.timeH < 6) want = this._nearNight(ctx) ? 'night' : 'dusk';
    else if (ctx.timeH >= 17) want = 'dusk';
    if (want !== this.track) this.setTrack(want);
  }

  _nearNight(ctx) {
    return ctx.timeH >= 20.5 || ctx.timeH < 5;
  }

  /** پخش ترک دستی؛ وقتی null بدهیم به حالت خودکار برمی‌گردد */
  lockTrack(name) {
    if (name) { this._lock = true; this.setTrack(name, true); }
    else this._lock = false;
  }

  update(dt) {
    const ctx = this.ctx;
    if (!ctx) return;
    if (!this._ensure()) return;
    if (this.volume() <= 0.0001) return;
    const T = TRACKS[this.track];
    const stepDur = 60 / T.bpm / 4;
    const now = ctx.currentTime;
    if (this.nextTime === 0) this.nextTime = now + 0.08;
    if (this.nextTime < now - 0.5) this.nextTime = now + 0.05;  // بازیابی بعد از توقف
    let guard = 0;
    while (this.nextTime < now + 0.3 && guard++ < 32) {
      const swing = (this.step % 2) ? stepDur * (T.swing || 0) : 0;
      this._schedule(this.nextTime + swing, this.step, T);
      this.nextTime += stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar++;
    }
  }

  _schedule(t, s, T) {
    const chord = T.chords[this.bar % T.chords.length];
    // پد: ابتدای هر دو میزان
    if (T.pad && s === 0 && this.bar % 2 === 0) {
      for (const n of chord) this._note(mtof(n - 12), t, (60 / T.bpm) * 4 * 1.9, T.padType, 0.075, T.cutoff);
    }
    // باس
    if (T.bass) {
      const root = chord[0] - 24;
      if (T.bass === 1 && (s === 0 || s === 8)) this._note(mtof(root), t, 0.75, 'sine', 0.16, 420);
      if (T.bass === 2 && s % 2 === 0) this._note(mtof(root), t, 0.24, 'sine', 0.15, 520);
      if (T.bass === 3 && s % 4 === 0) this._note(mtof(root), t, 0.2, 'sawtooth', 0.11, 700);
      if (T.bass === 3 && s % 4 === 2) this._note(mtof(root + 7), t, 0.16, 'sawtooth', 0.09, 700);
    }
    // آرپژ
    if (T.arp && s % (T.arp === 3 ? 1 : 2) === 0) {
      const pick = chord[(this.step + this.bar) % chord.length] + (s % 4 === 3 ? 12 : 0);
      this._note(mtof(pick + 12), t, 0.16, 'triangle', 0.055, 2600);
    }
    // ملودی
    if (T.lead && s % 8 === 3) {
      const pick = chord[(this.bar + 2) % chord.length] + 12;
      this._note(mtof(pick), t, 0.5, T.leadType, 0.05, 2200);
    }
    if (T.lead === 2 && s === 11) {
      this._note(mtof(chord[1] + 12), t, 0.35, T.leadType, 0.045, 2200);
    }
    // درامز
    if (T.kick && T.kick[s] === 'x') this._kick(t);
    if (T.snare && T.snare[s] === 'x') this._snare(t);
    if (T.hat && T.hat[s] === 'x') this._hat(t, s % 4 === 0 ? 0.05 : 0.028);
  }

  _note(freq, t, dur, type, vol, cutoff) {
    if (!this.ok || vol <= 0) return;
    try {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t);
      let out = o;
      if (cutoff && ctx.createBiquadFilter) {
        const f = ctx.createBiquadFilter();
        f.type = 'lowpass';
        f.frequency.setValueAtTime(cutoff, t);
        o.connect(f); out = f;
      }
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol, t + 0.06);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      out.connect(g);
      g.connect(this.gain);
      o.start(t);
      o.stop(t + dur + 0.05);
    } catch (e) { /* ignore */ }
  }

  _kick(t) {
    if (!this.ok) return;
    try {
      const ctx = this.ctx;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(120, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
      g.gain.setValueAtTime(0.24, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
      o.connect(g); g.connect(this.gain);
      o.start(t); o.stop(t + 0.24);
    } catch (e) { /* ignore */ }
  }

  _noiseHit(t, dur, vol, freq, type) {
    if (!this.ok) return;
    try {
      const ctx = this.ctx;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.gain);
      src.start(t);
    } catch (e) { /* ignore */ }
  }

  _snare(t) {
    this._noiseHit(t, 0.14, 0.09, 1600, 'bandpass');
    if (this.ok) {
      try {
        const ctx = this.ctx;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(220, t);
        g.gain.setValueAtTime(0.07, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
        o.connect(g); g.connect(this.gain);
        o.start(t); o.stop(t + 0.12);
      } catch (e) { /* ignore */ }
    }
  }

  _hat(t, vol) { this._noiseHit(t, 0.05, vol, 7000, 'highpass'); }

  /** فاز ضرب برای مینی‌گیم رقص: ۰ تا ۱ */
  beatPhase() {
    const T = TRACKS[this.track];
    const stepDur = 60 / T.bpm / 4;
    const now = this.ctx ? this.ctx.currentTime : performance.now() / 1000;
    const beat = 60 / T.bpm;
    return ((now / beat) % 1 + 1) % 1;
  }

  /** فاصله زمانی تا ضرب بعدی (ثانیه) */
  timeToBeat() {
    const T = TRACKS[this.track];
    const beat = 60 / T.bpm;
    return (1 - this.beatPhase()) * beat;
  }

  get bpm() { return TRACKS[this.track].bpm; }

  stateForSave() {
    return { track: this.track };
  }
  loadState() { /* موسیقی چیزی برای ذخیره ندارد جز ترک جاری */ }
}

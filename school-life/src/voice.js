/* ============================================================
   School Life: Open Campus — voice.js
   دوبلهٔ فارسی: گفتار واقعی مرورگر (SpeechSynthesis) + صدای
   جانشین «بابل» procedural وقتی صدای فارسی در دسترس نیست.
   ============================================================ */
import { clamp, rand, randInt } from './utils.js';

/* پروفایل صوتی بر اساس نقش */
export const VOICE_PROFILES = {
  student: { pitch: 1.15, rate: 1.05 },
  teacher: { pitch: 0.95, rate: 0.95 },
  kid:     { pitch: 1.4,  rate: 1.12 },
  old:     { pitch: 0.82, rate: 0.86 },
  seller:  { pitch: 1.08, rate: 1.1 },
  coach:   { pitch: 0.9,  rate: 1.0 },
  narrator:{ pitch: 1.0,  rate: 0.95 },
};

export class Voice {
  constructor(settings, audio) {
    this.settings = settings;
    this.audio = audio;
    this.enabled = settings ? settings.voice !== false : true;
    this.faVoice = null;
    this._voices = [];
    this._lastSpoke = 0;
    this._babbleT = 0;
    this._babble = null;
    this.mode = 'off';       // tts | babble | off
    this._loadVoices();
    if (typeof window !== 'undefined' && window.speechSynthesis && window.speechSynthesis.addEventListener) {
      try { window.speechSynthesis.addEventListener('voiceschanged', () => this._loadVoices()); } catch (e) { /* ignore */ }
    }
  }

  get supported() {
    return typeof window !== 'undefined' && !!window.speechSynthesis && typeof window.SpeechSynthesisUtterance !== 'undefined';
  }

  get volume() {
    const s = this.settings;
    if (!s) return 0.9;
    if (s.muted || s.voice === false) return 0;
    return clamp(s.voiceVolume != null ? s.voiceVolume : 0.9, 0, 1);
  }

  _loadVoices() {
    if (!this.supported) { this.mode = this.audio && this.audio.ctx ? 'babble' : 'off'; return; }
    try {
      this._voices = window.speechSynthesis.getVoices() || [];
    } catch (e) { this._voices = []; }
    const fa = this._voices.filter((v) => (v.lang || '').toLowerCase().startsWith('fa'));
    this.faVoice = fa[0] || null;
    this.mode = 'tts';
  }

  applySettings() {
    if (this.volume <= 0) this.stop();
  }

  /** تغییر دستی حالت دوبله: tts | babble | off */
  setMode(mode) {
    this.stop();
    if (mode === 'off') { this.mode = 'off'; return this.mode; }
    if (mode === 'tts' && !this.supported) mode = 'babble';
    if (mode === 'babble' && !(this.audio && this.audio.ctx)) mode = 'off';
    this.mode = mode;
    return this.mode;
  }

  /** صحبت کردن با متن فارسی */
  speak(text, profileName) {
    if (!text) return;
    if (this.volume <= 0) return;
    const prof = VOICE_PROFILES[profileName] || VOICE_PROFILES.student;
    const now = performance.now();
    if (now - this._lastSpoke < 120) return;   // ضد اسپم
    this._lastSpoke = now;
    if (this.mode === 'tts' || (this.supported && this.mode !== 'babble')) {
      if (this._speakTts(text, prof)) return;
    }
    this._startBabble(text, prof);
  }

  _speakTts(text, prof) {
    try {
      const synth = window.speechSynthesis;
      const u = new window.SpeechSynthesisUtterance(text);
      u.lang = this.faVoice ? this.faVoice.lang : 'fa-IR';
      if (this.faVoice) u.voice = this.faVoice;
      u.pitch = clamp(prof.pitch, 0, 2);
      u.rate = clamp(prof.rate, 0.1, 2);
      u.volume = this.volume;
      synth.cancel();
      synth.speak(u);
      this.mode = 'tts';
      return true;
    } catch (e) {
      this.mode = 'babble';
      return false;
    }
  }

  /* ---------- صدای جانشین: هجاهای کوتاه procedural ---------- */
  _startBabble(text, prof) {
    const ctx = this.audio ? this.audio.ctx : null;
    if (!ctx) { this.mode = 'off'; return; }
    const syllables = clamp(Math.round(text.length / 6), 3, 16);
    this._babble = { left: syllables, prof, t: 0, gap: 0.115 };
    this._babbleT = 0;
    this.mode = 'babble';
  }

  _babbleStep() {
    const b = this._babble;
    const ctx = this.audio ? this.audio.ctx : null;
    if (!b || !ctx || !this.audio.master) { this._babble = null; return; }
    try {
      const t = ctx.currentTime;
      const base = 165 * clamp(b.prof.pitch, 0.5, 1.6);
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = 1500 * clamp(b.prof.pitch, 0.6, 1.4);
      o.type = 'triangle';
      const jitter = 1 + (Math.random() - 0.5) * 0.18;
      o.frequency.setValueAtTime(base * jitter, t);
      o.frequency.linearRampToValueAtTime(base * jitter * (0.86 + Math.random() * 0.3), t + 0.09);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.05 * this.volume, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
      o.connect(f); f.connect(g); g.connect(this.audio.master);
      o.start(t); o.stop(t + 0.14);
    } catch (e) { /* ignore */ }
    b.left--;
    if (b.left <= 0) this._babble = null;
  }

  update(dt) {
    if (!this._babble) return;
    this._babbleT -= dt;
    if (this._babbleT <= 0) {
      this._babbleT = this._babble.gap;
      this._babbleStep();
    }
  }

  stop() {
    this._babble = null;
    if (this.supported) {
      try { window.speechSynthesis.cancel(); } catch (e) { /* ignore */ }
    }
  }

  /** پیام‌های کوتاه سیستم را هم می‌توان خواند */
  announce(text) {
    if (!this.enabled) return;
    this.speak(text, 'narrator');
  }

  stateForSave() {
    return { mode: this.mode };
  }
}

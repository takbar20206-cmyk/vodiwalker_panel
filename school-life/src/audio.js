/* ============================================================
   School Life: Open Campus — audio.js
   صداهای procedural با WebAudio (بدون هیچ فایل صوتی)
   ============================================================ */

export class AudioSys {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.master = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.engineFilter = null;
    this._birdTimer = 3;
  }

  /** باید از داخل یک user gesture صدا شود */
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
      this.master.connect(this.ctx.destination);
    } catch (e) { /* صدا در دسترس نیست */ }
  }

  applySettings() {
    if (!this.master) return;
    this.master.gain.value = this.settings.muted ? 0 : this.settings.volume;
  }

  get ready() { return !!this.ctx; }

  _tone(freq, dur, type = 'sine', vol = 0.25, slideTo = null, delay = 0) {
    if (!this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(1, slideTo), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0 + dur + 0.05);
    } catch (e) { /* ignore */ }
  }

  _noise(dur, vol = 0.2, freq = 1200, delay = 0, type = 'bandpass') {
    if (!this.ctx) return;
    try {
      const t0 = this.ctx.currentTime + delay;
      const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = type; f.frequency.value = freq;
      const g = this.ctx.createGain();
      g.gain.value = vol;
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t0);
    } catch (e) { /* ignore */ }
  }

  play(name) {
    if (!this.ctx) return;
    switch (name) {
      case 'click': this._tone(660, 0.07, 'square', 0.12); break;
      case 'open': this._tone(440, 0.09, 'sine', 0.18); this._tone(660, 0.1, 'sine', 0.15, null, 0.07); break;
      case 'close': this._tone(520, 0.09, 'sine', 0.15); this._tone(340, 0.1, 'sine', 0.13, null, 0.07); break;
      case 'pickup': this._tone(740, 0.09, 'triangle', 0.22); this._tone(1108, 0.12, 'triangle', 0.2, null, 0.08); break;
      case 'coin': this._tone(988, 0.08, 'square', 0.12); this._tone(1319, 0.16, 'square', 0.1, null, 0.07); break;
      case 'talk': this._tone(392, 0.07, 'sine', 0.16); this._tone(523, 0.08, 'sine', 0.14, null, 0.08); break;
      case 'eat': this._noise(0.09, 0.25, 700); this._noise(0.09, 0.22, 500, 0.12); break;
      case 'kick': this._noise(0.12, 0.4, 220, 0, 'lowpass'); this._tone(120, 0.12, 'sine', 0.3, 60); break;
      case 'thud': this._noise(0.15, 0.35, 160, 0, 'lowpass'); break;
      case 'whistle': this._tone(2200, 0.16, 'sine', 0.2); this._tone(2200, 0.28, 'sine', 0.2, null, 0.2); break;
      case 'goal': [523, 659, 784, 1046].forEach((f, i) => this._tone(f, 0.16, 'triangle', 0.24, null, i * 0.1)); break;
      case 'quest': this._tone(523, 0.12, 'triangle', 0.22); this._tone(784, 0.18, 'triangle', 0.22, null, 0.11); break;
      case 'complete':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this._tone(f, 0.18, 'triangle', 0.24, null, i * 0.11));
        break;
      case 'fail': this._tone(330, 0.2, 'sawtooth', 0.14, 220); this._tone(220, 0.3, 'sawtooth', 0.13, 150, 0.18); break;
      case 'locked': this._tone(180, 0.1, 'square', 0.16); this._tone(140, 0.14, 'square', 0.16, null, 0.1); break;
      case 'step': this._noise(0.05, 0.05, 900); break;
      case 'jump': this._tone(300, 0.12, 'sine', 0.12, 520); break;
      case 'splash': this._noise(0.25, 0.12, 2400, 0, 'highpass'); break;
      case 'error': this._tone(220, 0.15, 'square', 0.14); break;
      case 'secret':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this._tone(f, 0.2, 'sine', 0.18, null, i * 0.09));
        break;
      default: break;
    }
  }

  /* ---------- صدای موتور خودرو ---------- */
  setEngine(on, speed01 = 0) {
    if (!this.ctx) return;
    try {
      if (on && !this.engineOsc) {
        this.engineOsc = this.ctx.createOscillator();
        this.engineOsc.type = 'sawtooth';
        this.engineOsc.frequency.value = 55;
        this.engineFilter = this.ctx.createBiquadFilter();
        this.engineFilter.type = 'lowpass';
        this.engineFilter.frequency.value = 320;
        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.value = 0.0;
        this.engineOsc.connect(this.engineFilter);
        this.engineFilter.connect(this.engineGain);
        this.engineGain.connect(this.master);
        this.engineOsc.start();
      }
      if (this.engineOsc) {
        const t = this.ctx.currentTime;
        this.engineGain.gain.setTargetAtTime(on ? 0.05 + speed01 * 0.05 : 0.0, t, 0.1);
        this.engineOsc.frequency.setTargetAtTime(50 + speed01 * 90, t, 0.1);
        if (!on) {
          const osc = this.engineOsc;
          setTimeout(() => { try { osc.stop(); } catch (e) {} }, 400);
          this.engineOsc = null; this.engineGain = null; this.engineFilter = null;
        }
      }
    } catch (e) { /* ignore */ }
  }

  _bird() {
    const base = 2400 + Math.random() * 1200;
    const n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      this._tone(base + Math.random() * 600, 0.09, 'sine', 0.045, base * 0.8, i * 0.13);
    }
  }

  /** فراخوانی هر فریم از حلقه اصلی */
  update(dt, daytime) {
    if (!this.ctx || this.settings.muted) return;
    if (daytime) {
      this._birdTimer -= dt;
      if (this._birdTimer <= 0) {
        this._birdTimer = 4 + Math.random() * 7;
        this._bird();
      }
    }
  }
}

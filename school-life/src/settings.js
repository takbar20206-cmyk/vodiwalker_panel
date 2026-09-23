/* ============================================================
   School Life: Open Campus — settings.js
   تنظیمات بازی + ذخیره‌سازی آن در LocalStorage
   ============================================================ */

const KEY = 'sloc_settings_v1';

export const settings = {
  quality: 'medium',   // low | medium | high
  volume: 0.7,         // 0..1
  muted: false,
  sensitivity: 1.0,    // 0.3..2.5
  showFps: true,
  showMinimap: true,

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return this;
      const s = JSON.parse(raw);
      if (s && typeof s === 'object') {
        if (['low', 'medium', 'high'].includes(s.quality)) this.quality = s.quality;
        if (typeof s.volume === 'number') this.volume = Math.min(1, Math.max(0, s.volume));
        if (typeof s.muted === 'boolean') this.muted = s.muted;
        if (typeof s.sensitivity === 'number') this.sensitivity = Math.min(2.5, Math.max(0.3, s.sensitivity));
        if (typeof s.showFps === 'boolean') this.showFps = s.showFps;
        if (typeof s.showMinimap === 'boolean') this.showMinimap = s.showMinimap;
      }
    } catch (e) { /* ignore */ }
    return this;
  },

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        quality: this.quality,
        volume: this.volume,
        muted: this.muted,
        sensitivity: this.sensitivity,
        showFps: this.showFps,
        showMinimap: this.showMinimap,
      }));
    } catch (e) { /* ignore */ }
  },
};

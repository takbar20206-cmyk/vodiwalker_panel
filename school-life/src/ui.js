/* ============================================================
   School Life: Open Campus — ui.js
   همه رابط کاربری: HUD، مینی‌مپ، دیالوگ، فروشگاه، منوها
   ============================================================ */
import { faNum, faTime, faDur, clamp } from './utils.js';

function $(id) { return document.getElementById(id); }

function phaseName(h) {
  if (h >= 19.5 || h < 5) return 'شب';
  if (h < 8) return 'صبح زود';
  if (h < 11.5) return 'صبح';
  if (h < 14) return 'ظهر';
  if (h < 17) return 'بعدازظهر';
  if (h < 19.5) return 'عصر';
  return 'شب';
}

const INV_NAMES = {
  books: 'کتاب', cans: 'قوطی', sandwich: 'ساندویچ', juice: 'آبمیوه',
  note: 'نامه فوری', bag: 'کوله‌پشتی سارا',
  water: 'بطری آب', pizza: 'پیتزا', ice: 'بستنی', notebook: 'دفتر مشق',
  book: 'کتاب داستان', coffee: 'قهوه', cake: 'کیک', medkit: 'جعبهٔ کمک‌های اولیه',
  bread: 'نان', milk: 'شیر', balloon: 'بادکنک', speaker: 'بلندگو',
  key: 'کلید آزمایشگاه', lostBook: 'کتاب گمشده', kite: 'بادبادک', ball: 'توپ',
};
const USABLE = new Set(['sandwich', 'juice', 'water', 'pizza', 'ice', 'coffee', 'cake']);
const USE_VERB = { sandwich: 'خوردن', juice: 'نوشیدن', water: 'نوشیدن', pizza: 'خوردن', ice: 'خوردن', coffee: 'نوشیدن', cake: 'خوردن' };

export class UI {
  constructor() {
    this.game = null;
    this._modals = new Set();
    this._bannerT = null;
    this._mapStatic = null;
    this._bigStatic = null;
    this._mapData = null;
    this._shopBuy = null;
    this._invUse = null;
    this.cache();
  }

  cache() {
    const ids = ['loading', 'load-bar-fill', 'load-msg', 'load-tip', 'boot-error', 'boot-retry',
      'main-menu', 'btn-new', 'btn-continue', 'btn-settings', 'btn-help', 'menu-saveinfo',
      'hud', 'hp-fill', 'en-fill', 'hp-text', 'en-text', 'coins-val', 'score-val', 'clock-val', 'phase-val', 'phase-dot',
      'tracker', 'minimap', 'minimap-wrap', 'fps', 'btn-map', 'btn-inv', 'btn-pause2', 'btn-mute', 'driving-hint',
      'prompt', 'prompt-text', 'toasts', 'banner', 'banner-title', 'banner-sub',
      'dialogue', 'dlg-name', 'dlg-text', 'dlg-options',
      'shop', 'shop-items', 'shop-coins', 'shop-close',
      'inventory', 'inv-items', 'inv-close', 'inv-coins',
      'bigmap', 'bigmap-canvas', 'bigmap-close',
      'pause', 'btn-resume', 'btn-save', 'btn-settings2', 'btn-help2', 'btn-quit', 'pause-saveinfo',
      'settings', 'set-quality', 'set-volume', 'set-muted', 'set-sens', 'set-fps', 'set-minimap', 'set-back', 'set-vol-val', 'set-sens-val',
      'help', 'help-close', 'help-quests',
      'mission-timer', 'timer-val', 'webgl-error', 'lock-hint', 'hud-quest-count'];
    this.el = {};
    for (const id of ids) this.el[id] = $(id);
  }

  get modalOpen() { return this._modals.size > 0; }
  isOpen(name) { return this._modals.has(name); }

  /* ---------------- اتصال دکمه‌ها ---------------- */
  bind(game) {
    this.game = game;
    const click = (el, fn) => { if (el) el.addEventListener('click', (e) => { e.stopPropagation(); game.audio.unlock(); game.audio.play('click'); fn(); }); };
    click(this.el['btn-new'], () => game.newGame());
    click(this.el['btn-continue'], () => game.continueGame());
    click(this.el['btn-settings'], () => this.openSettings());
    click(this.el['btn-help'], () => this.openHelp());
    click(this.el['btn-pause2'], () => game.togglePause());
    click(this.el['btn-map'], () => game.toggleBigmap());
    click(this.el['btn-inv'], () => game.toggleInventory());
    click(this.el['btn-mute'], () => game.toggleMute());
    click(this.el['shop-close'], () => this.closeShop());
    click(this.el['inv-close'], () => this.closeInventory());
    click(this.el['bigmap-close'], () => game.toggleBigmap());
    click(this.el['btn-resume'], () => game.togglePause());
    click(this.el['btn-save'], () => game.saveGame(false));
    click(this.el['btn-settings2'], () => this.openSettings());
    click(this.el['btn-help2'], () => this.openHelp());
    click(this.el['btn-quit'], () => game.quitToMenu());
    click(this.el['set-back'], () => this.closeSettings());
    click(this.el['help-close'], () => this.closeHelp());
    const retry = this.el['boot-retry'];
    if (retry) retry.addEventListener('click', () => location.reload());

    // تنظیمات
    const s = game.settings;
    if (this.el['set-quality']) this.el['set-quality'].addEventListener('change', (e) => { s.quality = e.target.value; s.save(); game.applyQuality(); });
    if (this.el['set-volume']) this.el['set-volume'].addEventListener('input', (e) => { s.volume = e.target.value / 100; s.save(); game.audio.applySettings(); this.el['set-vol-val'].textContent = faNum(e.target.value) + '٪'; });
    if (this.el['set-muted']) this.el['set-muted'].addEventListener('change', (e) => { s.muted = e.target.checked; s.save(); game.audio.applySettings(); this.updateMuteBtn(); });
    if (this.el['set-sens']) this.el['set-sens'].addEventListener('input', (e) => { s.sensitivity = e.target.value / 50; s.save(); this.el['set-sens-val'].textContent = faNum(e.target.value) + '٪'; });
    if (this.el['set-fps']) this.el['set-fps'].addEventListener('change', (e) => { s.showFps = e.target.checked; s.save(); this.applyToggles(); });
    if (this.el['set-minimap']) this.el['set-minimap'].addEventListener('change', (e) => { s.showMinimap = e.target.checked; s.save(); this.applyToggles(); });
  }

  /* ---------------- لودینگ و منو ---------------- */
  setLoad(pct, msg) {
    if (this.el['load-bar-fill']) this.el['load-bar-fill'].style.width = pct + '%';
    if (this.el['load-msg'] && msg) this.el['load-msg'].textContent = msg;
  }
  hideLoading() { if (this.el.loading) this.el.loading.classList.add('hidden'); }
  showMenu(hasSave, saveInfo) {
    this.el['main-menu'].classList.remove('hidden');
    const bc = this.el['btn-continue'];
    if (bc) bc.disabled = !hasSave;
    if (this.el['menu-saveinfo']) this.el['menu-saveinfo'].textContent = hasSave && saveInfo ? saveInfo : '';
  }
  hideMenu() { this.el['main-menu'].classList.add('hidden'); }
  showHUD() { this.el.hud.classList.remove('hidden'); }
  hideHUD() { this.el.hud.classList.add('hidden'); }

  /* ---------------- HUD ---------------- */
  setBars(hp, en) {
    if (this.el['hp-fill']) this.el['hp-fill'].style.width = clamp(hp, 0, 100) + '%';
    if (this.el['en-fill']) this.el['en-fill'].style.width = clamp(en, 0, 100) + '%';
    if (this.el['hp-text']) this.el['hp-text'].textContent = faNum(Math.ceil(clamp(hp, 0, 100)));
    if (this.el['en-text']) this.el['en-text'].textContent = faNum(Math.ceil(clamp(en, 0, 100)));
    if (this.el['hp-fill']) this.el['hp-fill'].classList.toggle('low', hp < 25);
  }
  setCoins(c) { if (this.el['coins-val']) this.el['coins-val'].textContent = faNum(c); }
  setScore(s) { if (this.el['score-val']) this.el['score-val'].textContent = faNum(s); }
  setClock(h) {
    if (this.el['clock-val']) this.el['clock-val'].textContent = faTime(h);
    if (this.el['phase-val']) this.el['phase-val'].textContent = phaseName(h);
    if (this.el['phase-dot']) this.el['phase-dot'].classList.toggle('night', h >= 19 || h < 6);
  }
  setTracker(list, pct) {
    const t = this.el.tracker;
    if (!t) return;
    if (!list.length) {
      t.innerHTML = '<div class="tracker-empty">مأموریت فعالی نیست — با دانش‌آموزان صحبت کن! (' + faNum(pct) + '٪ کامل شده)</div>';
    } else {
      t.innerHTML = list.slice(0, 3).map((m) =>
        '<div class="tracker-item"><div class="tracker-title">' + m.title + '</div><div class="tracker-obj">' + m.obj + '</div></div>'
      ).join('') + (list.length > 3 ? '<div class="tracker-more">+' + faNum(list.length - 3) + ' مأموریت دیگر</div>' : '');
    }
    if (this.el['hud-quest-count']) this.el['hud-quest-count'].textContent = faNum(pct) + '٪';
  }
  setTimer(sec) {
    const box = this.el['mission-timer'];
    if (!box) return;
    if (sec == null) { box.classList.add('hidden'); return; }
    box.classList.remove('hidden');
    if (this.el['timer-val']) this.el['timer-val'].textContent = faDur(sec);
    box.classList.toggle('urgent', sec < 30);
  }
  setFps(f) { if (this.el.fps) this.el.fps.textContent = faNum(f) + ' FPS'; }
  applyToggles() {
    const s = this.game.settings;
    if (this.el.fps) this.el.fps.style.display = s.showFps ? '' : 'none';
    if (this.el['minimap-wrap']) this.el['minimap-wrap'].style.display = s.showMinimap ? '' : 'none';
  }
  updateMuteBtn() {
    const b = this.el['btn-mute'];
    if (b) b.textContent = this.game.settings.muted ? '🔇' : '🔊';
  }
  showDriving(show, name) {
    const d = this.el['driving-hint'];
    if (!d) return;
    d.classList.toggle('hidden', !show);
    if (show) d.innerHTML = 'در حال رانندگی: <b>' + name + '</b> — خروج: <span class="key">E</span>';
  }

  /** نمایش وضعیت آب‌وهوا در HUD */
  setWeather(text, timeH) {
    let el = document.getElementById('weather-chip');
    if (!el) {
      el = document.createElement('div');
      el.id = 'weather-chip';
      document.body.appendChild(el);
    }
    el.textContent = text || '';
    el.classList.toggle('night', timeH != null && (timeH >= 19 || timeH < 6));
  }

  prompt(text) {
    const p = this.el.prompt;
    if (!p) return;
    if (!text) { p.classList.add('hidden'); return; }
    p.classList.remove('hidden');
    if (this.el['prompt-text']) this.el['prompt-text'].innerHTML = text;
  }

  toast(msg) {
    const box = this.el.toasts;
    if (!box) return;
    while (box.children.length >= 4) box.removeChild(box.firstChild);
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = msg;
    box.appendChild(d);
    setTimeout(() => { d.classList.add('out'); setTimeout(() => d.remove(), 400); }, 3600);
  }

  banner(title, sub) {
    const b = this.el.banner;
    if (!b) return;
    this.el['banner-title'].textContent = title;
    this.el['banner-sub'].textContent = sub || '';
    b.classList.remove('hidden');
    b.classList.remove('anim');
    void b.offsetWidth;
    b.classList.add('anim');
    clearTimeout(this._bannerT);
    this._bannerT = setTimeout(() => b.classList.add('hidden'), 2700);
  }

  /* ---------------- دیالوگ ---------------- */
  dialogue({ name, text, options }) {
    this._modals.add('dialogue');
    this.el.dialogue.classList.remove('hidden');
    this.el['dlg-name'].textContent = name;
    this.el['dlg-text'].textContent = text;
    const box = this.el['dlg-options'];
    box.innerHTML = '';
    this._options = options || [];
    this._options.forEach((o, i) => {
      const btn = document.createElement('button');
      btn.className = 'dlg-btn';
      btn.innerHTML = '<span class="dlg-num">' + faNum(i + 1) + '</span> ' + o.label;
      btn.addEventListener('click', (e) => { e.stopPropagation(); this.game.audio.play('click'); o.fn(); });
      box.appendChild(btn);
    });
    // دوبلهٔ فارسی متن گفت‌وگو
    if (this.game && this.game.voice) {
      let prof = 'student';
      if (/آقای|خانم|مربی|مدیر|معاون|نگهبان|مسئول|آشپز|فروشنده|معلم|کتابدار/.test(name)) prof = 'teacher';
      else if (/سارا|کیان|دنیا|نیما|دانش‌آموز|عابر|میلاد|شادی|بهنام|رؤیا|سینا|لیلا|امید|غزل|حسام|نیلوفر|آرمین|سارینا|فرزاد|آرش|کاوه|اهالی|شهروند/.test(name)) prof = 'student';
      else if (/پیشی|گربه|بچه/.test(name)) prof = 'kid';
      if (/سعید|بابک|پریسا|جوادی|کامران|لیلا/.test(name)) prof = 'seller';
      if (/مربی/.test(name)) prof = 'coach';
      this.game.voice.speak(text, prof);
    }
    this.game.onModalOpen('dialogue');
  }
  chooseOption(i) {
    if (!this.isOpen('dialogue') || !this._options) return false;
    const o = this._options[i];
    if (o) { this.game.audio.play('click'); o.fn(); return true; }
    return false;
  }
  closeDialogue() {
    if (!this.isOpen('dialogue')) return;
    this._modals.delete('dialogue');
    this.el.dialogue.classList.add('hidden');
    if (this.game.voice) this.game.voice.stop();
    this.game.audio.play('close');
    this.game.onModalClose('dialogue');
  }

  /* ---------------- فروشگاه ---------------- */
  shop(items, coins, onBuy) {
    this._modals.add('shop');
    this._shopBuy = onBuy;
    this.el.shop.classList.remove('hidden');
    this.shopCoins(coins);
    const box = this.el['shop-items'];
    box.innerHTML = '';
    items.forEach((it) => {
      const d = document.createElement('div');
      d.className = 'shop-item';
      d.innerHTML = '<div class="shop-name">' + it.name + '</div><div class="shop-desc">' + it.desc + '</div>' +
        '<button class="btn small">خرید — ' + faNum(it.price) + ' سکه</button>';
      d.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); onBuy(it); });
      box.appendChild(d);
    });
    this.game.onModalOpen('shop');
  }
  shopCoins(c) { if (this.el['shop-coins']) this.el['shop-coins'].textContent = faNum(c); }
  closeShop() {
    if (!this.isOpen('shop')) return;
    this._modals.delete('shop');
    this.el.shop.classList.add('hidden');
    this.game.audio.play('close');
    this.game.onModalClose('shop');
  }

  /* ---------------- کوله‌پشتی (Inventory) ---------------- */
  inventory(inv, coins, onUse) {
    this._modals.add('inventory');
    this._invUse = onUse;
    this.el.inventory.classList.remove('hidden');
    if (this.el['inv-coins']) this.el['inv-coins'].textContent = faNum(coins);
    const box = this.el['inv-items'];
    box.innerHTML = '';
    const keys = Object.keys(INV_NAMES).filter((k) => (inv[k] || 0) > 0);
    if (!keys.length) {
      box.innerHTML = '<div class="inv-empty">کیف‌ات خالی است! در محوطه بگرد و آیتم جمع کن.</div>';
    }
    for (const k of keys) {
      const d = document.createElement('div');
      d.className = 'inv-item';
      const usable = USABLE.has(k);
      d.innerHTML = '<div class="inv-name">' + INV_NAMES[k] + ' <span class="inv-count">×' + faNum(inv[k]) + '</span></div>' +
        (usable ? '<button class="btn small">' + USE_VERB[k] + '</button>' : '<div class="inv-tag">مأموریت</div>');
      if (usable) d.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); onUse(k); });
      box.appendChild(d);
    }
    this.game.onModalOpen('inventory');
  }
  closeInventory() {
    if (!this.isOpen('inventory')) return;
    this._modals.delete('inventory');
    this.el.inventory.classList.add('hidden');
    this.game.audio.play('close');
    this.game.onModalClose('inventory');
  }

  /* ---------------- نقشه بزرگ ---------------- */
  openBigmap() {
    this._modals.add('bigmap');
    this.el.bigmap.classList.remove('hidden');
    this.drawBigmap();
    this.game.onModalOpen('bigmap');
  }
  closeBigmap() {
    if (!this.isOpen('bigmap')) return;
    this._modals.delete('bigmap');
    this.el.bigmap.classList.add('hidden');
    this.game.audio.play('close');
    this.game.onModalClose('bigmap');
  }

  /* ---------------- توقف / تنظیمات / راهنما ---------------- */
  openPause(saveInfo) {
    this.el.pause.classList.remove('hidden');
    if (this.el['pause-saveinfo']) this.el['pause-saveinfo'].textContent = saveInfo || '';
  }
  closePause() { this.el.pause.classList.add('hidden'); }

  openSettings() {
    const s = this.game.settings;
    if (this.el['set-quality']) this.el['set-quality'].value = s.quality;
    if (this.el['set-volume']) { this.el['set-volume'].value = Math.round(s.volume * 100); this.el['set-vol-val'].textContent = faNum(Math.round(s.volume * 100)) + '٪'; }
    if (this.el['set-muted']) this.el['set-muted'].checked = s.muted;
    if (this.el['set-sens']) { this.el['set-sens'].value = Math.round(s.sensitivity * 50); this.el['set-sens-val'].textContent = faNum(Math.round(s.sensitivity * 50)) + '٪'; }
    if (this.el['set-fps']) this.el['set-fps'].checked = s.showFps;
    if (this.el['set-minimap']) this.el['set-minimap'].checked = s.showMinimap;
    this._modals.add('settings');
    this.el.settings.classList.remove('hidden');
    this.game.onModalOpen('settings');
  }
  closeSettings() {
    if (!this.isOpen('settings')) return;
    this._modals.delete('settings');
    this.el.settings.classList.add('hidden');
    this.game.audio.play('close');
    this.game.onModalClose('settings');
  }

  openHelp() {
    this._modals.add('help');
    this.el.help.classList.remove('hidden');
    // وضعیت مأموریت‌ها
    if (this.el['help-quests'] && this.game.missions) {
      // پیشرفت داستان
      let head = '';
      if (this.game.story) {
        const p = this.game.story.progress();
        const j = this.game.story.journal();
        const cur = j.chapters[Math.min(j.current, j.chapters.length - 1)];
        head = '<div class="q-row"><span>📖 داستان: ' + faNum(p.pct) + '٪ (' + faNum(p.done) + '/' + faNum(p.total) + ')</span>' +
          '<span class="q-active">' + (cur ? cur.title : '') + '</span></div>';
      }
      const rows = head + Object.keys(this.game.missions.st).filter((id) => !this.game.missions.dyn[id]).map((id) => {
        const m = this.game.missions.st[id];
        const st = m.st === 'done' ? '<span class="q-done">کامل شد</span>' : m.st === 'active' ? '<span class="q-active">فعال</span>' : '<span class="q-avail">قابل قبول</span>';
        return '<div class="q-row"><span>' + this.game.missionsTitle(id) + '</span>' + st + '</div>';
      }).join('');
      this.el['help-quests'].innerHTML = rows;
    }
    this.game.onModalOpen('help');
  }
  closeHelp() {
    if (!this.isOpen('help')) return;
    this._modals.delete('help');
    this.el.help.classList.add('hidden');
    this.game.audio.play('close');
    this.game.onModalClose('help');
  }

  closeAllModals() {
    this.closeDialogue(); this.closeShop(); this.closeInventory(); this.closeBigmap(); this.closeSettings(); this.closeHelp();
  }

  showLockHint(show) {
    if (this.el['lock-hint']) this.el['lock-hint'].classList.toggle('hidden', !show);
  }

  /* ============================================================
     مینی‌مپ و نقشه بزرگ (Canvas دوبعدی)
     ============================================================ */
  initMinimap(mapData) {
    this._mapData = mapData;
    this._span = (mapData.bounds || 128) * 2;    // world span (±BOUNDS)
    const W = this._span;
    // لایه ثابت مینی‌مپ
    const S = 220;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#5e9843';
    g.fillRect(0, 0, S, S);
    const X = (x) => ((x + W / 2) / W) * S;
    const Z = (z) => ((z + W / 2) / W) * S;
    for (const r of mapData.rects) {
      g.fillStyle = r.c;
      g.fillRect(X(r.x1), Z(r.z1), X(r.x2) - X(r.x1), Z(r.z2) - Z(r.z1));
    }
    this._drawPaths(g, S, X, Z, 1);
    this._mapStatic = c;
    // لایه ثابت نقشه بزرگ
    const B = 640;
    const bc = document.createElement('canvas');
    bc.width = B; bc.height = B;
    const bg = bc.getContext('2d');
    bg.fillStyle = '#5e9843';
    bg.fillRect(0, 0, B, B);
    const BX = (x) => ((x + W / 2) / W) * B;
    const BZ = (z) => ((z + W / 2) / W) * B;
    // توری مختصات
    bg.strokeStyle = 'rgba(255,255,255,0.12)';
    bg.lineWidth = 1;
    for (let i = 0; i <= 10; i++) {
      bg.beginPath(); bg.moveTo((i * B) / 10, 0); bg.lineTo((i * B) / 10, B); bg.stroke();
      bg.beginPath(); bg.moveTo(0, (i * B) / 10); bg.lineTo(B, (i * B) / 10); bg.stroke();
    }
    for (const r of mapData.rects) {
      bg.fillStyle = r.c;
      bg.fillRect(BX(r.x1), BZ(r.z1), BX(r.x2) - BX(r.x1), BZ(r.z2) - BZ(r.z1));
    }
    this._drawPaths(bg, B, BX, BZ, 2.6);
    bg.font = 'bold 17px Vazirmatn, Tahoma, sans-serif';
    bg.textAlign = 'center';
    for (const l of mapData.labels) {
      const x = BX(l.x), y = BZ(l.z);
      bg.fillStyle = 'rgba(0,0,0,0.55)';
      const w = bg.measureText(l.t).width + 14;
      bg.fillRect(x - w / 2, y - 14, w, 24);
      bg.fillStyle = '#fff';
      bg.fillText(l.t, x, y + 4);
    }
    this._bigStatic = bc;
  }

  /** مسیرهای پیست و جاده‌ها روی نقشه */
  _drawPaths(g, S, X, Z, w) {
    const paths = (this._mapData && this._mapData.paths) || [];
    for (const p of paths) {
      if (!p.pts || p.pts.length < 2) continue;
      g.beginPath();
      g.moveTo(X(p.pts[0].x), Z(p.pts[0].z));
      for (let i = 1; i < p.pts.length; i++) g.lineTo(X(p.pts[i].x), Z(p.pts[i].z));
      if (p.closed) g.closePath();
      g.strokeStyle = p.c || '#4a4a52';
      g.lineWidth = (p.w || 2) * w;
      g.lineJoin = 'round';
      g.stroke();
      if (p.dash) {
        g.setLineDash([6 * w, 6 * w]);
        g.strokeStyle = 'rgba(255,255,255,0.6)';
        g.lineWidth = Math.max(1, 0.7 * w);
        g.stroke();
        g.setLineDash([]);
      }
    }
  }

  _drawDynamics(g, S, dyn) {
    const W = this._span || 256;
    const X = (x) => ((x + W / 2) / W) * S;
    const Z = (z) => ((z + W / 2) / W) * S;
    const sc = S / 220;
    const t = performance.now() / 1000;
    // اهداف مأموریت (پالس طلایی)
    for (const q of dyn.targets) {
      const r = (6 + Math.sin(t * 5) * 2) * sc;
      g.beginPath(); g.arc(X(q.x), Z(q.z), r + 3 * sc, 0, 7);
      g.fillStyle = 'rgba(255,211,77,0.35)'; g.fill();
      g.beginPath(); g.arc(X(q.x), Z(q.z), r, 0, 7);
      g.fillStyle = '#ffd34d'; g.fill();
      g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
    }
    // NPCها
    for (const n of dyn.npcs) {
      g.beginPath(); g.arc(X(n.x), Z(n.z), (n.quest ? 4.5 : 3) * sc, 0, 7);
      g.fillStyle = n.quest ? '#ffdf3d' : n.teacher ? '#ff9a3d' : '#ffffff';
      g.fill();
      if (n.quest) { g.lineWidth = 1.5; g.strokeStyle = '#7a5b00'; g.stroke(); }
    }
    // وسایل نقلیه
    for (const v of dyn.vehicles) {
      const s = 7 * sc;
      g.fillStyle = v.active ? '#39d353' : v.locked ? '#8a8f98' : '#3b9eff';
      g.fillRect(X(v.x) - s / 2, Z(v.z) - s / 2, s, s);
      g.lineWidth = 1.5; g.strokeStyle = '#fff'; g.strokeRect(X(v.x) - s / 2, Z(v.z) - s / 2, s, s);
    }
    // حیوانات و پرنده‌ها
    if (dyn.animals) {
      for (const an of dyn.animals) {
        g.beginPath(); g.arc(X(an.x), Z(an.z), 2.4 * sc, 0, 7);
        g.fillStyle = an.kind === 'cat' ? '#ffb26b' : an.kind === 'dog' ? '#c99b6b' : an.kind === 'fish' ? '#8ee6ff' : '#ffe9a3';
        g.fill();
      }
    }
    // توپ
    if (dyn.ball) {
      g.beginPath(); g.arc(X(dyn.ball.x), Z(dyn.ball.z), 3 * sc, 0, 7);
      g.fillStyle = '#fff'; g.fill();
      g.lineWidth = 1; g.strokeStyle = '#333'; g.stroke();
    }
    // بازیکن (پیکان چرخان)
    const px = X(dyn.px), pz = Z(dyn.pz);
    g.save();
    g.translate(px, pz);
    g.rotate(Math.PI - dyn.yaw);
    g.beginPath();
    g.moveTo(0, -9 * sc); g.lineTo(6 * sc, 6 * sc); g.lineTo(0, 2.5 * sc); g.lineTo(-6 * sc, 6 * sc);
    g.closePath();
    g.fillStyle = '#ff4d4d'; g.fill();
    g.lineWidth = 2; g.strokeStyle = '#fff'; g.stroke();
    g.restore();
  }

  drawMinimap(dyn) {
    const cv = this.el.minimap;
    if (!cv || !this._mapStatic || !this.game.settings.showMinimap) return;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(this._mapStatic, 0, 0);
    this._drawDynamics(g, cv.width, dyn);
  }

  drawBigmap() {
    const cv = this.el['bigmap-canvas'];
    if (!cv || !this._bigStatic || !this.game) return;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.drawImage(this._bigStatic, 0, 0);
    this._drawDynamics(g, cv.width, this.game.mapDynamics());
  }

  /* ============================================================
     پنل‌های داینامیک گسترش: پیست، کارنامه، دفترچه داستان، دستاوردها
     ============================================================ */
  _panel(id, opts = {}) {
    let el = document.getElementById(id);
    if (!el) {
      el = document.createElement('div');
      el.id = id;
      el.className = 'sl-overlay hidden';
      el.innerHTML = '<div class="sl-panel"><div class="sl-head"><h2></h2><div class="sl-head-sub"></div></div>' +
        '<div class="sl-body"></div><div class="sl-foot"></div></div>';
      document.body.appendChild(el);
      el.addEventListener('mousedown', (e) => e.stopPropagation());
    }
    const q = (c) => el.querySelector(c);
    if (opts.title != null) q('h2').textContent = opts.title;
    if (opts.sub != null) q('.sl-head-sub').innerHTML = opts.sub;
    if (opts.body != null) q('.sl-body').innerHTML = opts.body;
    if (opts.foot != null) q('.sl-foot').innerHTML = opts.foot;
    q('.sl-body').classList.toggle('wide', !!opts.wide);
    return el;
  }
  openPanel(id) {
    const el = document.getElementById(id);
    if (!el) return;
    this._modals.add(id);
    el.classList.remove('hidden');
    if (this.game) this.game.onModalOpen(id);
  }
  closePanel(id) {
    const el = document.getElementById(id);
    if (!el || !this.isOpen(id)) return;
    this._modals.delete(id);
    el.classList.add('hidden');
    if (this.game) { this.game.audio.play('close'); this.game.onModalClose(id); }
  }
  togglePanel(id) { if (this.isOpen(id)) this.closePanel(id); else this.openPanel(id); }

  /* ---------------- پیست مسابقه ---------------- */
  raceMenu(modes, onPick) {
    const body = '<div class="race-modes">' + modes.map((m, i) =>
      '<button class="race-mode" data-i="' + i + '">' +
      '<div class="rm-icon">' + m.icon + '</div>' +
      '<div class="rm-name">' + m.name + '</div>' +
      '<div class="rm-desc">' + m.desc + '</div>' +
      '<div class="rm-best">رکورد: ' + m.best + '</div></button>').join('') + '</div>';
    const el = this._panel('race-menu', {
      title: '🏁 پیست مسابقه آفتاب',
      sub: 'یک حالت را انتخاب کن — با کات مسابقه رانندگی می‌کنی. کلیدهای: W/S گاز و ترمز، A/D فرمان، Space ترمز',
      body,
    });
    el.querySelectorAll('.race-mode').forEach((b) => {
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        const m = modes[Number(b.dataset.i)];
        this.game.audio.play('click');
        this.closePanel('race-menu');
        onPick(m.id);
      });
    });
    const foot = el.querySelector('.sl-foot');
    foot.innerHTML = '<button class="btn" id="race-menu-close">بستن</button>';
    foot.querySelector('#race-menu-close').addEventListener('click', (e) => { e.stopPropagation(); this.closePanel('race-menu'); });
    this.openPanel('race-menu');
  }

  raceHUD(info) {
    let el = document.getElementById('race-hud');
    if (!el) {
      el = document.createElement('div');
      el.id = 'race-hud';
      el.className = 'hidden';
      document.body.appendChild(el);
    }
    if (!info || !info.show) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    const best = info.best != null ? faNum(info.best.toFixed(2)) : '—';
    el.innerHTML =
      '<div class="rh-row"><span class="rh-mode">' + info.mode + '</span>' +
      '<span class="rh-pos">جایگاه ' + faNum(info.pos) + ' از ' + faNum(info.rivals) + '</span></div>' +
      '<div class="rh-row big"><span>دور ' + (info.laps ? faNum(info.lap) + '/' + faNum(info.laps) : 'آزاد') + '</span>' +
      '<span class="rh-time">' + faNum(info.time.toFixed(2)) + '″</span></div>' +
      '<div class="rh-row small"><span>بهترین دور: ' + best + '</span>' +
      '<span>دروازهٔ ' + faNum((info.cp || 0) + 1) + '/' + faNum(info.cps || 0) + '</span>' +
      '<span>کل: ' + faNum((info.total || 0).toFixed(1)) + '″</span></div>' +
      (info.offTrack ? '<div class="rh-warn">از پیست بیرون رفتی!</div>' : '');
  }

  showCountdown(txt) {
    let el = document.getElementById('countdown');
    if (!el) {
      el = document.createElement('div');
      el.id = 'countdown';
      el.className = 'hidden';
      document.body.appendChild(el);
    }
    if (txt == null) { el.classList.add('hidden'); return; }
    el.classList.remove('hidden');
    el.textContent = txt;
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  }

  raceResults(data, onRetry, onClose) {
    const rows = data.laps.map((t, i) => '<div class="sl-row"><span>دور ' + faNum(i + 1) + '</span><span>' + faNum(t.toFixed(2)) + '″</span></div>').join('');
    const el = this._panel('race-results', {
      title: (data.win ? '🏆 برنده شدی!' : '🏁 پایان مسابقه') + ' — ' + data.mode,
      sub: 'جایگاه ' + faNum(data.pos) + ' از ' + faNum(data.total) + ' — زمان کل ' + faNum(data.time.toFixed(2)) + ' ثانیه',
      body: '<div class="sl-cols"><div class="sl-card"><h3>دورها</h3>' + (rows || '<div class="sl-mut">تمرین آزاد</div>') + '</div>' +
        '<div class="sl-card"><h3>جایزه</h3><div class="sl-row"><span>سکه</span><span>' + faNum(data.rewards.coins) + '</span></div>' +
        '<div class="sl-row"><span>امتیاز</span><span>' + faNum(data.rewards.score) + '</span></div>' +
        '<div class="sl-row"><span>بهترین دور</span><span>' + (data.best != null ? faNum(data.best.toFixed(2)) + '″' : '—') + '</span></div></div></div>',
      foot: '<button class="btn primary" id="rr-again">مسابقهٔ دوباره</button><button class="btn" id="rr-close">خروج از پیست</button>',
    });
    el.querySelector('#rr-again').addEventListener('click', (e) => { e.stopPropagation(); this.closePanel('race-results'); onRetry(); });
    el.querySelector('#rr-close').addEventListener('click', (e) => { e.stopPropagation(); this.closePanel('race-results'); onClose(); });
    this.openPanel('race-results');
  }

  /* ---------------- دستاوردها ---------------- */
  achievements(list, meta) {
    const unlocked = list.filter((a) => a.done || a.unlocked).length;
    const body = '<div class="ach-grid">' + list.map((a) => {
      const on = !!(a.done || a.unlocked);
      const pct = a.pct != null ? a.pct : Math.round((a.progress || 0) * 100);
      const prog = a.haveText != null && a.goalText ? '<div class="ach-date">' + a.haveText + ' / ' + a.goalText + '</div>' : '';
      return '<div class="ach-card ' + (on ? 'on' : '') + '">' +
        '<div class="ach-icon">' + (on ? (a.icon || '⭐') : '🔒') + '</div>' +
        '<div class="ach-txt"><div class="ach-name">' + a.name + '</div>' +
        '<div class="ach-desc">' + (a.desc || '') + '</div>' +
        (on ? '<div class="ach-date">باز شد! 🎉</div>' : prog + '<div class="ach-bar"><i style="width:' + pct + '%"></i></div>') +
        '</div></div>';
    }).join('') + '</div>';
    const extra = meta && meta.distance != null
      ? ' • مسافت پیموده‌شده: ' + faNum(meta.distance) + ' متر • زمان بازی: ' + faNum(Math.round((meta.playtime || 0) / 60)) + ' دقیقه'
      : '';
    const el = this._panel('achievements', {
      title: '🏅 دستاوردها',
      sub: faNum(unlocked) + ' از ' + faNum(list.length) + ' دستاورد باز شده' + extra,
      body,
      wide: true,
      foot: '<button class="btn" id="ach-close">بستن (G)</button>',
    });
    el.querySelector('#ach-close').addEventListener('click', (e) => { e.stopPropagation(); this.closePanel('achievements'); });
    this.openPanel('achievements');
  }

  /* ---------------- دفترچهٔ داستان ---------------- */
  journal(data) {
    const chap = data.chapters.map((ch) => {
      const rows = ch.quests.map((q) => {
        const cls = q.state === 'done' ? 'qdone' : q.state === 'active' ? 'qactive' : 'qavail';
        return '<div class="j-quest ' + cls + '">' +
          '<div class="jq-title">' + (q.state === 'done' ? '✅' : q.state === 'active' ? '▶️' : '🔹') + ' ' + q.title + '</div>' +
          '<div class="jq-desc">' + q.desc + '</div>' +
          (q.objective ? '<div class="jq-obj">هدف: ' + q.objective + '</div>' : '') +
          '<div class="jq-meta">' + q.stateText + ' • جایزه: ' + faNum(q.coins) + ' سکه</div></div>';
      }).join('');
      return '<div class="j-chapter ' + (ch.unlocked ? '' : 'locked') + '"><h3>' + ch.icon + ' ' + ch.title + '</h3>' + rows + '</div>';
    }).join('');
    const side = data.side.map((q) =>
      '<div class="j-quest ' + (q.state === 'done' ? 'qdone' : q.state === 'active' ? 'qactive' : 'qavail') + '">' +
      '<div class="jq-title">⭐ ' + q.title + '</div><div class="jq-desc">' + q.desc + '</div>' +
      (q.objective ? '<div class="jq-obj">هدف: ' + q.objective + '</div>' : '') + '</div>').join('');
    const el = this._panel('journal', {
      title: '📖 دفترچهٔ داستان',
      sub: 'پیشرفت: ' + faNum(data.progress.done) + ' از ' + faNum(data.progress.total) + ' مأموریت (' + faNum(data.progress.pct) + '٪)',
      body: '<div class="j-wrap">' + chap + '<div class="j-chapter"><h3>⭐ مأموریت‌های جانبی</h3>' + side + '</div></div>',
      wide: true,
      foot: '<button class="btn" id="j-close">بستن (J)</button>',
    });
    el.querySelector('#j-close').addEventListener('click', (e) => { e.stopPropagation(); this.closePanel('journal'); });
    this.openPanel('journal');
  }

  /* ---------------- کارنامه و امتحان ---------------- */
  grades(report, onExam) {
    const rows = report.subjects.map((sj) =>
      '<div class="gr-row"><span class="gr-name">' + sj.icon + ' ' + sj.name + '</span>' +
      '<span class="gr-know"><i style="width:' + sj.knowledge + '%"></i><b>' + faNum(sj.knowledge) + '٪</b></span>' +
      '<span class="gr-grade ' + (sj.grade == null ? '' : sj.grade >= 14 ? 'good' : sj.grade >= 10 ? 'ok' : 'bad') + '">' + sj.gradeText + '</span>' +
      '<button class="btn small gr-btn" data-id="' + sj.id + '"' + (report.ready(sj.id) ? '' : ' disabled') + '>امتحان</button></div>').join('');
    const el = this._panel('grades', {
      title: '🎒 کارنامهٔ من',
      sub: 'معدل: <b>' + report.gpaText + '</b> • دانش کلی: ' + faNum(report.progress) + '٪ • امتحان‌ها: ' + faNum(report.examsTotal) +
        ' • جلسه‌های مطالعه: ' + faNum(report.study),
      body: '<div class="gr-list">' + rows + '</div>' +
        '<p class="sl-mut">برای امتحان هر درس باید دانش آن درس حداقل ۱۲٪ باشد: در کلاس آن درس حاضر شو (زنگ‌های ۸–۱۰ و ۱۱–۱۳)، در کتابخانه مطالعه کن یا از میز مطالعه استفاده کن.</p>',
      foot: '<button class="btn" id="gr-close">بستن (K)</button>',
    });
    el.querySelectorAll('.gr-btn').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (b.disabled) return;
      this.closePanel('grades');
      onExam(b.dataset.id);
    }));
    el.querySelector('#gr-close').addEventListener('click', (e) => { e.stopPropagation(); this.closePanel('grades'); });
    this.openPanel('grades');
  }

  examStart(data, onAnswer) {
    this._examAnswer = onAnswer;
    const body = '<div class="ex-head">' + data.icon + ' امتحان ' + data.subject + ' — سؤال ' + faNum(data.index) + ' از ' + faNum(data.total) + '</div>' +
      '<div class="ex-q">' + data.question + '</div>' +
      '<div class="ex-opts">' + data.options.map((o, i) =>
        '<button class="ex-opt" data-i="' + i + '"><span class="dlg-num">' + faNum(i + 1) + '</span> ' + o + '</button>').join('') + '</div>' +
      '<div class="ex-time"><i id="ex-time-bar"' + '></i></div>';
    const el = this._panel('exam', {
      title: '📝 امتحان',
      sub: 'زمان هر سؤال ۳۰ ثانیه است — با کلیدهای ۱ تا ۴ هم می‌توانی پاسخ دهی',
      body,
    });
    el.querySelectorAll('.ex-opt').forEach((b) => b.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this._examLock) return;
      this._examLock = true;
      setTimeout(() => { this._examLock = false; }, 180);
      this.game.audio.play('click');
      onAnswer(Number(b.dataset.i));
    }));
    this.examUpdate(data.time);
    this.openPanel('exam');
  }
  examUpdate(time) {
    const bar = document.getElementById('ex-time-bar');
    if (bar) bar.style.width = clamp((time / 30) * 100, 0, 100) + '%';
  }
  examResult(data) {
    this.closePanel('exam');
    const body = '<div class="ex-res">' + data.icon + '</div>' +
      '<div class="ex-score">' + faNum(data.grade.toFixed(2)) + '<span>از ۲۰</span></div>' +
      '<div class="sl-row"><span>پاسخ درست</span><span>' + faNum(data.correct) + ' از ' + faNum(data.total) + '</span></div>' +
      '<div class="sl-row"><span>دانش ' + data.subject + '</span><span>' + faNum(data.knowledge) + '٪</span></div>' +
      '<div class="sl-row"><span>معدل کل</span><span>' + faNum(data.gpa.toFixed(2)) + '</span></div>' +
      (data.passed ? '<p class="ex-pass">قبول شدی! 🎉</p>' : '<p class="ex-fail">این بار نشد — بیشتر مطالعه کن و دوباره بیا.</p>');
    const el = this._panel('exam-result', {
      title: data.passed ? '✅ امتحان ' + data.subject : '📋 نتیجهٔ امتحان ' + data.subject,
      body,
      foot: '<button class="btn primary" id="exr-close">ادامه</button>',
    });
    el.querySelector('#exr-close').addEventListener('click', (e) => { e.stopPropagation(); this.closePanel('exam-result'); });
    this.openPanel('exam-result');
  }
}

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
};

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
      const usable = k === 'sandwich' || k === 'juice';
      d.innerHTML = '<div class="inv-name">' + INV_NAMES[k] + ' <span class="inv-count">×' + faNum(inv[k]) + '</span></div>' +
        (usable ? '<button class="btn small">' + (k === 'sandwich' ? 'خوردن' : 'نوشیدن') + '</button>' : '<div class="inv-tag">مأموریت</div>');
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
      const rows = Object.keys(this.game.missions.st).map((id) => {
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
    // لایه ثابت مینی‌مپ
    const S = 220, W = 200;
    const c = document.createElement('canvas');
    c.width = S; c.height = S;
    const g = c.getContext('2d');
    g.fillStyle = '#5e9843';
    g.fillRect(0, 0, S, S);
    const X = (x) => ((x + 100) / W) * S;
    const Z = (z) => ((z + 100) / W) * S;
    for (const r of mapData.rects) {
      g.fillStyle = r.c;
      g.fillRect(X(r.x1), Z(r.z1), X(r.x2) - X(r.x1), Z(r.z2) - Z(r.z1));
    }
    this._mapStatic = c;
    // لایه ثابت نقشه بزرگ
    const B = 560;
    const bc = document.createElement('canvas');
    bc.width = B; bc.height = B;
    const bg = bc.getContext('2d');
    bg.fillStyle = '#5e9843';
    bg.fillRect(0, 0, B, B);
    const BX = (x) => ((x + 100) / W) * B;
    const BZ = (z) => ((z + 100) / W) * B;
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

  _drawDynamics(g, S, dyn) {
    const W = 200;
    const X = (x) => ((x + 100) / W) * S;
    const Z = (z) => ((z + 100) / W) * S;
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
}

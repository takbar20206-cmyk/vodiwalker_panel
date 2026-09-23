/* ============================================================
   School Life: Open Campus — main.js
   نقطه ورود: حلقه بازی، چرخه روز/شب، ورودی، کیفیت، ذخیره
   ============================================================ */
import * as THREE from 'three';
import { settings } from './settings.js';
import { hasSave, loadSave, storeSave, clearSave } from './save.js';
import { clamp, faNum, dist2D } from './utils.js';
import { World, LOC } from './world.js';
import { NPCManager } from './npc.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { MissionManager, MISSION_TITLES } from './missions.js';
import { UI } from './ui.js';
import { AudioSys } from './audio.js';

const DAY_LENGTH = 720; // ثانیه برای یک شبانه‌روز کامل

class Game {
  constructor() {
    settings.load();
    this.settings = settings;
    this.audio = new AudioSys(settings);
    this.ui = new UI();
    this.state = 'boot';
    this.paused = false;
    this.timeH = 9.2;
    this.coins = 40;
    this.score = 0;
    this.hp = 100;
    this.en = 100;
    this.inv = { books: 0, cans: 0, sandwich: 0, juice: 0, note: 0, bag: 0 };
    this.keys = new Set();
    this.camDX = 0; this.camDY = 0;
    this.jumpQueued = false;
    this.pointerLocked = false;
    this.expectUnlock = false;
    this.dragging = false;
    this.lastMX = 0; this.lastMY = 0;
    this._hudT = 0; this._mapT = 0; this._autoT = 0; this._bigT = 0;
    this._fpsN = 0; this._fpsT = 0; this._fps = 60;
    this._menuA = 0;
    this._interact = null;
    this._kicker = null;
    this._startedAt = 0;
    this.outdoorLightsOn = true;
  }

  /* ================= راه‌اندازی ================= */
  async init() {
    this.ui.bind(this);
    window.__slocSetLoad = (p, m) => this.ui.setLoad(p, m);
    this.ui.setLoad(3, 'راه‌اندازی موتور سه‌بعدی...');

    // رندرر
    try {
      this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch (e) {
      document.getElementById('webgl-error').classList.remove('hidden');
      document.getElementById('loading').classList.add('hidden');
      return;
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    document.getElementById('scene').appendChild(this.renderer.domElement);
    this.canvas = this.renderer.domElement;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ec9ee);
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1200);
    this.camera.position.set(0, 8, 55);

    // نورها
    this.sun = new THREE.DirectionalLight(0xfff4e0, 1.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -90; this.sun.shadow.camera.right = 90;
    this.sun.shadow.camera.top = 90; this.sun.shadow.camera.bottom = -90;
    this.sun.shadow.camera.near = 10; this.sun.shadow.camera.far = 450;
    this.sun.shadow.bias = -0.0008;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xbfe3f5, 0x6a7a52, 0.7);
    this.scene.add(this.hemi);
    this.amb = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.amb);
    this.scene.fog = new THREE.Fog(0x8ec9ee, 60, 200);

    // دنیا (بارگذاری مرحله‌ای)
    this.world = new World(this.scene);
    await this.world.build((p, m) => this.ui.setLoad(3 + p * 0.72, m));

    this.ui.setLoad(78, 'آوردن دانش‌آموزان و معلم‌ها...');
    await this._tick();
    this.npcs = new NPCManager(this.scene, this.world);
    this.npcs.build();

    this.ui.setLoad(85, 'آماده‌سازی بازیکن و وسایل نقلیه...');
    await this._tick();
    this.player = new Player(this.scene);
    this.player.spawn(LOC.spawn.x, LOC.spawn.z, LOC.spawn.yaw);
    this.player.onStep = () => this.audio.play('step');
    this.player.onJump = () => this.audio.play('jump');
    this.vehicles = new VehicleManager(this.scene, this.world, this.audio);
    this.vehicles.build();

    this.ui.setLoad(92, 'نهایی‌سازی مأموریت‌ها...');
    await this._tick();
    this.missions = new MissionManager({
      world: this.world, npcs: this.npcs, player: this.player,
      vehicles: this.vehicles, ui: this.ui, audio: this.audio, game: this,
    });
    this.missions.init();
    this.ui.initMinimap(this.world.getMapData());
    this.ui.updateMuteBtn();

    this.applyQuality();
    this._wireEvents();
    this._dayNight(); // نور اولیه
    this.ui.setLoad(100, 'آماده!');
    this.clock = new THREE.Clock();
    this.state = 'menu';

    await this._tick();
    this.ui.hideLoading();
    const save = hasSave();
    let info = '';
    if (save) {
      const d = loadSave();
      if (d && d.player) info = 'امتیاز: ' + faNum(d.player.score || 0) + ' — سکه: ' + faNum(d.player.coins || 0);
    }
    this.ui.showMenu(save, info);
    this.renderer.setAnimationLoop(() => this._frame());

    // شروع تازه بعد از رفرش (دکمه شروع جدید)
    if (location.hash === '#new') {
      history.replaceState(null, '', location.pathname + location.search);
      clearSave();
      this.startPlaying(true);
    }
  }

  _tick() { return new Promise((r) => setTimeout(r, 15)); }

  /* ================= رویدادها ================= */
  _wireEvents() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
    document.addEventListener('keydown', (e) => this._onKeyDown(e));
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));
    document.addEventListener('mousemove', (e) => {
      if (this.state !== 'playing' || this.paused || this.ui.modalOpen) return;
      const k = 0.0023 * this.settings.sensitivity;
      if (this.pointerLocked) {
        this.camDX += e.movementX * k;
        this.camDY += e.movementY * k;
      } else if (this.dragging) {
        this.camDX += (e.clientX - this.lastMX) * k * 1.4;
        this.camDY += (e.clientY - this.lastMY) * k * 1.4;
        this.lastMX = e.clientX; this.lastMY = e.clientY;
      }
    });
    this.canvas.addEventListener('mousedown', (e) => {
      this.audio.unlock();
      if (this.state === 'playing' && !this.paused && !this.ui.modalOpen && !this.pointerLocked) {
        this.requestLock();
        this.dragging = true;
        this.lastMX = e.clientX; this.lastMY = e.clientY;
      }
    });
    window.addEventListener('mouseup', () => { this.dragging = false; });
    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === this.canvas;
      if (!this.pointerLocked && this.state === 'playing' && !this.paused && !this.expectUnlock && !this.ui.modalOpen) {
        this.togglePause(); // Esc حین بازی
      }
      this.expectUnlock = false;
      if (!this.pointerLocked && (this.ui.modalOpen || this.paused)) {
        // عادی است
      }
    });
    document.addEventListener('pointerlockerror', () => { /* حالت درگ جایگزین فعال است */ });
    document.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('beforeunload', () => { if (this.state === 'playing') this.saveGame(true); });
  }

  _onKeyDown(e) {
    if (this.state !== 'playing') return;
    if (['Tab', 'Space'].includes(e.code)) e.preventDefault();
    if (e.code === 'Escape') {
      if (this.paused) { this.togglePause(); return; }
      // بستن مودال‌ها (به‌جز دیالوگ که باید انتخاب شود)
      if (this.ui.isOpen('inventory')) this.ui.closeInventory();
      else if (this.ui.isOpen('bigmap')) this.ui.closeBigmap();
      else if (this.ui.isOpen('shop')) this.ui.closeShop();
      else if (this.ui.isOpen('settings')) this.ui.closeSettings();
      else if (this.ui.isOpen('help')) this.ui.closeHelp();
      return;
    }
    if (e.code === 'Tab' || e.code === 'KeyM') { if (!e.repeat) this.toggleBigmap(); return; }
    if (e.code === 'KeyI') { if (!e.repeat) this.toggleInventory(); return; }
    if (e.code === 'KeyP') { if (!e.repeat) this.togglePause(); return; }
    if (/^Digit[1-9]$/.test(e.code) && this.ui.isOpen('dialogue')) {
      this.ui.chooseOption(Number(e.code.slice(5)) - 1);
      return;
    }
    if (e.code === 'KeyE' && !e.repeat) { this.doInteract(); return; }
    if (e.code === 'Space' && !e.repeat) { this.jumpQueued = true; return; }
    this.keys.add(e.code);
  }

  requestLock() {
    if (this.pointerLocked || !this.canvas) return;
    try {
      const p = this.canvas.requestPointerLock();
      if (p && p.catch) p.catch(() => {});
    } catch (e) { /* حالت درگ */ }
  }

  onModalOpen() {
    this.expectUnlock = true;
    if (this.pointerLocked) {
      try { document.exitPointerLock(); } catch (e) {}
    }
  }
  onModalClose() {
    if (this.state === 'playing' && !this.paused && !this.ui.modalOpen) {
      this.requestLock();
    }
  }

  /* ================= شروع / توقف ================= */
  startPlaying(fresh) {
    this.ui.hideMenu();
    this.ui.showHUD();
    this.ui.applyToggles();
    this.state = 'playing';
    this.paused = false;
    this._startedAt = performance.now();
    this.audio.unlock();
    this.audio.play('open');
    this.requestLock();
    if (fresh) {
      setTimeout(() => {
        this.ui.toast('به دبیرستان آفتاب خوش آمدی!');
        setTimeout(() => this.ui.toast('با سارا (علامت !) در حیاط صحبت کن.'), 2500);
      }, 600);
    }
  }

  newGame() {
    location.hash = '#new';
    location.reload();
  }

  continueGame() {
    const d = loadSave();
    if (!d) return;
    try {
      this.timeH = d.timeH != null ? d.timeH : 9.2;
      if (d.player) {
        this.player.spawn(d.player.x || 0, d.player.z || 42, d.player.yaw != null ? d.player.yaw : Math.PI);
        this.hp = d.player.hp != null ? d.player.hp : 100;
        this.en = d.player.en != null ? d.player.en : 100;
        this.coins = d.player.coins || 0;
        this.score = d.player.score || 0;
      }
      if (d.inv) this.inv = { ...this.inv, ...d.inv };
      if (d.missions) this.missions.loadState(d.missions);
      if (d.taken) {
        this.world.setTaken('pickup', d.taken.pickups || []);
        this.world.setTaken('coin', d.taken.coins || []);
      }
      if (d.vehicles) this.vehicles.loadState(d.vehicles);
      // فاز NPCها با ساعت ذخیره همگام شود
      this.npcs.lastPhase = null;
    } catch (e) { console.warn('load failed', e); }
    this.startPlaying(false);
    setTimeout(() => this.ui.toast('بازیابی شد! خوش برگشتی.'), 600);
  }

  togglePause() {
    if (this.state !== 'playing') return;
    this.paused = !this.paused;
    if (this.paused) {
      this.expectUnlock = true;
      try { if (this.pointerLocked) document.exitPointerLock(); } catch (e) {}
      this.audio.setEngine(false);
      this.ui.openPause('امتیاز ' + faNum(this.score) + ' — ' + faNum(this.missions.completionPct()) + '٪ مأموریت‌ها');
      this.audio.play('close');
    } else {
      this.ui.closePause();
      this.ui.closeAllModals();
      this.clock.getDelta();
      this.requestLock();
      this.audio.play('open');
    }
  }

  toggleBigmap() {
    if (this.state !== 'playing' || this.paused) return;
    if (this.ui.isOpen('bigmap')) this.ui.closeBigmap();
    else { this.audio.play('open'); this.ui.openBigmap(); }
  }

  toggleInventory() {
    if (this.state !== 'playing' || this.paused) return;
    if (this.ui.isOpen('inventory')) this.ui.closeInventory();
    else { this.audio.play('open'); this.ui.inventory(this.inv, this.coins, (k) => this.useItem(k)); }
  }

  toggleMute() {
    this.settings.muted = !this.settings.muted;
    this.settings.save();
    this.audio.applySettings();
    this.ui.updateMuteBtn();
  }

  useItem(k) {
    if ((this.inv[k] || 0) <= 0) return;
    if (k === 'sandwich') {
      if (this.hp >= 100 && this.en >= 100) { this.ui.toast('الان کاملاً سالمی!'); return; }
      this.inv.sandwich--;
      this.hp = clamp(this.hp + 30, 0, 100);
      this.en = clamp(this.en + 20, 0, 100);
      this.audio.play('eat');
      this.ui.toast('ساندویچ خوردی! جان و انرژی برگشت.');
    } else if (k === 'juice') {
      if (this.en >= 100) { this.ui.toast('انرژی‌ات کامل است!'); return; }
      this.inv.juice--;
      this.en = clamp(this.en + 40, 0, 100);
      this.audio.play('eat');
      this.ui.toast('آبمیوه خنک! انرژی برگشت.');
    }
    this.missions.refreshMarkers();
    this.ui.inventory(this.inv, this.coins, (kk) => this.useItem(kk)); // رفرش
  }

  quitToMenu() {
    this.saveGame(true);
    location.hash = '';
    location.reload();
  }

  /* ================= تعامل ================= */
  doInteract() {
    if (this.state !== 'playing' || this.paused || this.ui.modalOpen) return;
    // خروج از خودرو
    if (this.vehicles.active) {
      const s = this.vehicles.exit();
      this.player.driving = null;
      this.player.group.visible = true;
      this.player.pos.set(s.x, 0, s.z);
      this.ui.showDriving(false);
      this.audio.play('close');
      // دوربین پشت بازیکن
      this.player._camPos.set(s.x - Math.sin(this.player.yaw) * 5, 4, s.z - Math.cos(this.player.yaw) * 5);
      return;
    }
    const t = this._interact;
    if (!t) return;
    if (t.type === 'pickup') {
      t.ref.action();
    } else if (t.type === 'npc') {
      t.ref.onTalk(t.ref);
    } else if (t.type === 'vehicle') {
      const v = t.ref;
      if (v.locked) {
        this.audio.play('locked');
        this.ui.toast(v.desc);
      } else {
        this.vehicles.enter(v);
        this.player.driving = v;
        this.player.group.visible = false;
        this.vehicles.onEnterCamera();
        this.ui.showDriving(true, v.name);
        this.audio.play('quest');
        this.ui.toast('سوار شدی! حرکت: W A S D — ترمز: Space — خروج: E');
      }
    }
  }

  _scanInteract() {
    this._interact = null;
    if (this.vehicles.active || this.ui.modalOpen) {
      this.ui.prompt(null);
      return;
    }
    const px = this.player.x, pz = this.player.z;
    let best = null, bd = 1e9;
    // آیتم‌ها
    for (const it of this.world.interactables) {
      if (it.enabled && !it.enabled()) continue;
      const d = dist2D(px, pz, it.x, it.z);
      if (d < it.r && d < bd) { bd = d; best = { type: 'pickup', ref: it }; }
    }
    // NPC
    const npc = this.npcs.nearestTalkable(px, pz, 3.2);
    if (npc) {
      const d = dist2D(px, pz, npc.group.position.x, npc.group.position.z);
      if (d < bd) { bd = d; best = { type: 'npc', ref: npc }; }
    }
    // خودرو
    const v = this.vehicles.nearest(px, pz, 3.4);
    if (v) {
      const d = dist2D(px, pz, v.x, v.z) - v.radius * 0.5;
      if (d < bd) { bd = d; best = { type: 'vehicle', ref: v }; }
    }
    this._interact = best;
    if (!best) { this.ui.prompt(null); return; }
    let txt = '';
    if (best.type === 'pickup') txt = best.ref.prompt;
    else if (best.type === 'npc') txt = 'صحبت با ' + best.ref.name;
    else txt = best.ref.locked ? best.ref.name + ' (قفل است)' : 'سوار شدن: ' + best.ref.name;
    this.ui.prompt('<span class="key">E</span> — ' + txt);
  }

  /* ================= امتیاز و کیف ================= */
  addCoins(n) { this.coins = Math.max(0, this.coins + n); }
  addScore(n) { this.score = Math.max(0, this.score + n); }
  missionsTitle(id) { return MISSION_TITLES[id] || id; }

  mapDynamics() {
    const driving = !!this.vehicles.active;
    const yaw = driving ? this.vehicles.active.heading : this.player.yaw;
    const b = this.world.ballPos();
    return {
      px: driving ? this.vehicles.active.x : this.player.x,
      pz: driving ? this.vehicles.active.z : this.player.z,
      yaw,
      npcs: this.npcs.mapPoints(),
      vehicles: this.vehicles.mapPoints(),
      targets: this.missions.targets(),
      ball: { x: b.x, z: b.z },
    };
  }

  /* ================= ذخیره ================= */
  saveGame(silent) {
    if (this.state !== 'playing') return;
    const takenP = [], takenC = [];
    for (const id in this.world.pickups) if (this.world.pickups[id].taken) takenP.push(id);
    this.world.coins.forEach((c, i) => { if (c.taken) takenC.push(i); });
    const ok = storeSave({
      timeH: this.timeH,
      player: { x: +this.player.x.toFixed(2), z: +this.player.z.toFixed(2), yaw: +this.player.yaw.toFixed(3), hp: Math.round(this.hp), en: Math.round(this.en), coins: this.coins, score: this.score },
      inv: { ...this.inv },
      missions: this.missions.stateForSave(),
      taken: { pickups: takenP, coins: takenC },
      vehicles: this.vehicles.stateForSave(),
    });
    if (!silent) {
      if (ok) { this.ui.toast('بازی ذخیره شد!'); this.audio.play('quest'); }
      else { this.ui.toast('خطا در ذخیره‌سازی!'); this.audio.play('error'); }
    }
  }

  autosave() {
    if (this.state !== 'playing') return;
    if (performance.now() - this._startedAt < 4000) return;
    this.saveGame(true);
  }

  /* ================= کیفیت ================= */
  applyQuality() {
    const q = this.settings.quality;
    const dpr = window.devicePixelRatio || 1;
    this.renderer.setPixelRatio(q === 'low' ? Math.min(dpr, 0.75) : q === 'medium' ? Math.min(dpr, 1.2) : Math.min(dpr, 2));
    if (q === 'low') {
      this.sun.castShadow = false;
    } else {
      this.sun.castShadow = true;
      const size = q === 'medium' ? 1024 : 2048;
      if (this.sun.shadow.mapSize.x !== size) {
        this.sun.shadow.mapSize.set(size, size);
        if (this.sun.shadow.map) { this.sun.shadow.map.dispose(); this.sun.shadow.map = null; }
      }
    }
    const fog = this.scene.fog;
    if (q === 'low') { fog.near = 35; fog.far = 130; }
    else if (q === 'medium') { fog.near = 60; fog.far = 200; }
    else { fog.near = 80; fog.far = 300; }
    this.outdoorLightsOn = q !== 'low';
    if (this.world) this.world.setQuality(q);
    if (this.npcs) this.npcs.setQuality(q);
  }

  /* ================= چرخه روز و شب ================= */
  _dayNight() {
    const ang = ((this.timeH - 6) / 12) * Math.PI;
    const elev = Math.sin(ang);
    const day01 = clamp((elev + 0.06) / 0.28, 0, 1);
    const night01 = 1 - day01;
    const dusk = clamp(1 - Math.abs(elev) * 3.2, 0, 1);

    const dir = new THREE.Vector3(Math.cos(ang), Math.max(elev, -0.4), 0.38).normalize();
    if (elev > -0.05) {
      this.sun.position.copy(dir).multiplyScalar(170);
      this.sun.intensity = 0.25 + day01 * 1.1;
      this.sun.color.setHex(0xfff4e0).lerp(new THREE.Color(0xff9a4d), dusk * 0.7);
    } else {
      // ماه
      this.sun.position.set(-60, 110, 50);
      this.sun.intensity = 0.22;
      this.sun.color.setHex(0x8fa8d8);
    }
    this.hemi.intensity = 0.28 + day01 * 0.5;
    this.hemi.color.setHex(0xbfe3f5).lerp(new THREE.Color(0x27325e), night01 * 0.9);
    this.hemi.groundColor.setHex(0x6a7a52).lerp(new THREE.Color(0x11131a), night01 * 0.85);
    this.amb.intensity = 0.2 + day01 * 0.08;

    const sky = new THREE.Color(0x0b1026).lerp(new THREE.Color(0x8ec9ee), day01);
    if (dusk > 0) sky.lerp(new THREE.Color(0xf7a35c), dusk * 0.5);
    this.scene.fog.color.copy(sky);
    this.scene.background.copy(sky);
    this.world.setSky(sky, dir, night01, day01, elev > -0.05);
    this.world.setOutdoorLights(this.outdoorLightsOn, night01);
    this._isDay = day01 > 0.4;
  }

  /* ================= حلقه اصلی ================= */
  _frame() {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    // FPS
    this._fpsN++; this._fpsT += dt;
    if (this._fpsT >= 0.5) { this._fps = Math.round(this._fpsN / this._fpsT); this._fpsN = 0; this._fpsT = 0; }

    if (this.state === 'menu') {
      this._menuA += dt * 0.07;
      this.camera.position.set(Math.sin(this._menuA) * 78, 40, Math.cos(this._menuA) * 78);
      this.camera.lookAt(0, 1, -5);
      this.world.update(dt, { px: this.player.x, pz: this.player.z, kicker: null });
      this.npcs.update(dt, this.timeH, { x: this.player.x, z: this.player.z });
    } else if (this.state === 'playing' && !this.paused) {
      this._step(dt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  _step(dt) {
    // زمان
    this.timeH = (this.timeH + (dt * 24) / DAY_LENGTH) % 24;
    this._dayNight();

    const blocked = this.ui.modalOpen;
    const k = this.keys;
    const driving = !!this.vehicles.active;

    // ورودی حرکت
    const input = {
      f: !blocked && (k.has('KeyW') || k.has('ArrowUp')),
      b: !blocked && (k.has('KeyS') || k.has('ArrowDown')),
      l: !blocked && (k.has('KeyA') || k.has('ArrowLeft')),
      r: !blocked && (k.has('KeyD') || k.has('ArrowRight')),
      sprint: !blocked && (k.has('ShiftLeft') || k.has('ShiftRight')) && this.en > 1,
      jump: !blocked && this.jumpQueued,
      camDX: blocked ? 0 : this.camDX,
      camDY: blocked ? 0 : this.camDY,
    };
    this.camDX = 0; this.camDY = 0;
    this.jumpQueued = false;

    let moving = false, sprinting = false;
    if (driving) {
      this.vehicles.update(dt, { f: input.f, b: input.b, l: input.l, r: input.r, brake: k.has('Space') && !blocked });
      this.vehicles.updateCamera(dt, this.camera);
    } else {
      const st = this.player.update(dt, input, this.world.colliders);
      this.player.updateCamera(dt, this.camera, this.world.colliders);
      moving = st.moving; sprinting = st.sprinting;
      // برخورد نرم با خودروها
      for (const v of this.vehicles.list) {
        const d = dist2D(this.player.x, this.player.z, v.x, v.z);
        const min = v.radius * 0.85 + 0.4;
        if (d < min && d > 1e-4) {
          const push = min - d;
          this.player.pos.x += ((this.player.x - v.x) / d) * push;
          this.player.pos.z += ((this.player.z - v.z) / d) * push;
        }
      }
      // شوت توپ
      this._kicker = null;
      const b = this.world.ballPos();
      const bd = dist2D(this.player.x, this.player.z, b.x, b.z);
      if (bd < 1.15) {
        const dx = st.moving ? st.dirX : Math.sin(this.player.faceYaw);
        const dz = st.moving ? st.dirZ : Math.cos(this.player.faceYaw);
        this._kicker = { x: this.player.x, z: this.player.z, dx, dz, power: st.moving ? 7 + st.speed * 1.15 : 3 };
      }
      if (bd < 0.72 && bd > 1e-4) {
        // توپ را از داخل بدن بیرون بده
        const over = 0.72 - bd;
        this.player.pos.x += ((this.player.x - b.x) / bd) * over * 0.5;
        this.player.pos.z += ((this.player.z - b.z) / bd) * over * 0.5;
      }
    }

    // انرژی و جان
    if (!driving) {
      if (sprinting && moving) {
        this.en = Math.max(0, this.en - 9 * dt);
        if (this.en <= 0) this.hp = Math.max(0, this.hp - 3 * dt);
      } else {
        this.en = clamp(this.en + (moving ? 4 : 9) * dt, 0, 100);
      }
      if (this.hp <= 0) {
        // از حال رفتن (بدون خشونت!)
        this.hp = 60; this.en = 60;
        this.player.spawn(LOC.spawn.x, LOC.spawn.z, LOC.spawn.yaw);
        this.audio.play('fail');
        this.ui.toast('از خستگی از حال رفتی! جلوی مدرسه به هوش آمدی. ساندویچ بخور!');
      }
    } else {
      this.en = clamp(this.en + 6 * dt, 0, 100);
    }

    // دنیا و NPC و مأموریت
    this.world.update(dt, { px: driving ? this.vehicles.active.x : this.player.x, pz: driving ? this.vehicles.active.z : this.player.z, kicker: driving ? null : this._kicker });
    this.npcs.update(dt, this.timeH, { x: this.player.x, z: this.player.z });
    this.missions.update(dt);
    this.audio.update(dt, this._isDay);
    this._scanInteract();

    // HUD (throttle)
    this._hudT -= dt;
    if (this._hudT <= 0) {
      this._hudT = 0.15;
      this.ui.setBars(this.hp, this.en);
      this.ui.setCoins(this.coins);
      this.ui.setScore(this.score);
      this.ui.setClock(this.timeH);
      this.ui.setTracker(this.missions.tracker(), this.missions.completionPct());
      this.ui.setTimer(this.missions.getTimer());
      this.ui.setFps(this._fps);
      this.ui.showLockHint(!this.pointerLocked && !this.ui.modalOpen && !this.paused);
    }
    this._mapT -= dt;
    if (this._mapT <= 0) {
      this._mapT = 0.12;
      this.ui.drawMinimap(this.mapDynamics());
    }
    if (this.ui.isOpen('bigmap')) {
      this._bigT -= dt;
      if (this._bigT <= 0) { this._bigT = 0.35; this.ui.drawBigmap(); }
    }
    // ذخیره خودکار
    this._autoT += dt;
    if (this._autoT > 60) { this._autoT = 0; this.saveGame(true); }
  }
}

/* ================= بوت ================= */
try {
  const game = new Game();
  window.__game = game;
  game.init().catch((e) => {
    console.error(e);
    const m = document.getElementById('load-msg');
    if (m) m.textContent = 'خطا در بارگذاری بازی: ' + e.message;
  });
} catch (e) {
  console.error(e);
}

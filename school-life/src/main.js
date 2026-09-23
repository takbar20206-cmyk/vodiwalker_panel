/* ============================================================
   School Life: Open Campus — main.js
   نقطه ورود: حلقه بازی، چرخه روز/شب، ورودی، کیفیت، ذخیره
   ============================================================ */
import * as THREE from 'three';
import { settings } from './settings.js';
import { hasSave, loadSave, storeSave, clearSave } from './save.js';
import { clamp, faNum, dist2D, choice, rand } from './utils.js';
import { World, LOC, areaOf } from './world.js';
import { buildExtension, EXT } from './world_ext.js';
import { NPCManager } from './npc.js';
import { Player } from './player.js';
import { VehicleManager } from './vehicles.js';
import { MissionManager, MISSION_TITLES } from './missions.js';
import { UI } from './ui.js';
import { AudioSys } from './audio.js';
import { Weather, WEATHER_LABEL, weatherIcon } from './weather.js';
import { AnimalManager } from './animals.js';
import { Music } from './music.js';
import { Voice } from './voice.js';
import { Achievements } from './achievements.js';
import { RaceManager, RACE_MODES } from './racing.js';
import { GradeBook } from './grades.js';
import { StoryManager } from './story.js';
import { PartySystem } from './party.js';

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
    this.hasBicycle = true;      // دوچرخه در تعمیرگاه
    this.hasSkateboard = false;
    this.rideKind = null;
    this.partyOn = false;
    this._dayIndex = 0;
    this._distAcc = 0;
    this._lastPX = 0; this._lastPZ = 0;
    this.weatherMode = 'auto';
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
    await this.world.build((p, m) => this.ui.setLoad(3 + p * 0.4, m));

    this.ui.setLoad(44, 'گسترش دنیا: شهر، استخر، آزمایشگاه، خوابگاه...');
    await buildExtension(this.world, (p, m) => this.ui.setLoad(44 + p * 0.38, m), this._extHooks());

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
    this._buildSystems();
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
      else if (this.ui.isOpen('race-menu')) this.ui.closePanel('race-menu');
      else if (this.ui.isOpen('achievements')) this.ui.closePanel('achievements');
      else if (this.ui.isOpen('journal')) this.ui.closePanel('journal');
      else if (this.ui.isOpen('grades')) this.ui.closePanel('grades');
      else if (this.ui.isOpen('race-results')) this.ui.closePanel('race-results');
      else if (this.ui.isOpen('exam-result')) this.ui.closePanel('exam-result');
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
    // کلیدهای گسترش
    if (e.code === 'KeyR' && !e.repeat) {
      if (this.racing && (this.racing.state === 'racing' || this.racing.state === 'countdown')) this.racing.abort();
      else this.openRaceMenu();
      return;
    }
    if (e.code === 'KeyK' && !e.repeat) { if (this.grades) this.grades.openPanel(); return; }
    if (e.code === 'KeyJ' && !e.repeat) { if (this.story) this.story.openJournal(); return; }
    if (e.code === 'KeyG' && !e.repeat) { if (this.achievements) this.achievements.open(); return; }
    if (e.code === 'KeyU' && !e.repeat) { if (this.party) this.party.dance(); return; }
    if (e.code === 'KeyC' && !e.repeat) { this.toggleRide('skate'); return; }
    if (e.code === 'KeyB' && !e.repeat) { this.toggleRide('bike'); return; }
    if (e.code === 'KeyN' && !e.repeat) { this.cycleWeather(); return; }
    if (e.code === 'KeyV' && !e.repeat) { this.cycleVoice(); return; }
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
      if (d.weather) this.weather.loadState(d.weather);
      if (d.weatherMode) { this.weatherMode = d.weatherMode; this.weather.set(d.weatherMode, true); }
      if (d.animals) this.animals.loadState(d.animals);
      if (d.achievements) this.achievements.loadState(d.achievements);
      if (d.racing) this.racing.loadState(d.racing);
      if (d.grades) this.grades.loadState(d.grades);
      if (d.story) this.story.loadState(d.story);
      if (d.party) this.party.loadState(d.party);
      if (d.flags) {
        this.hasSkateboard = !!d.flags.hasSkateboard;
        this.hasBicycle = d.flags.hasBicycle !== false;
        this._dayIndex = d.flags.dayIndex || 0;
        this.rideKind = null;
        this._updateRide();
      }
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

  /* ================= تعامل با دنیای گسترش‌یافته ================= */
  _extHooks() {
    return {
      openShop: (id) => this.openShop(id),
      enter: (id) => this.ui.toast('وارد شدی: ' + id),
      fastTravel: (id) => this.fastTravel(id),
      bus: () => this.busTour(),
      notice: (t) => this.ui.toast(t),
      board: (id) => this.readBoard(id),
      vending: () => this.buyVending(),
      atm: () => this.withdrawATM(),
      recycle: () => this.sortTrash(),
      sleep: () => this.sleepInDorm(),
      kite: () => this.toggleKite(),
      skate: () => this.giveSkateboard(),
      microscope: () => this.useMicroscope(),
      lab: () => this.doLabExperiment(),
      cafeteria: () => this.eatCafeteria(),
      race: () => this.openRaceMenu(),
    };
  }

  _shopItems(kind) {
    const S = {
      super: [
        { id: 'juice', name: 'آبمیوه', desc: '+۴۰ انرژی', price: 8 },
        { id: 'sandwich', name: 'ساندویچ', desc: '+۳۰ جان و +۲۰ انرژی', price: 12 },
        { id: 'water', name: 'بطری آب', desc: '+۲۰ انرژی', price: 5 },
      ],
      pizza: [
        { id: 'pizza', name: 'پیتزا', desc: 'شام خوشمزه! (+۴۰ جان)', price: 18 },
        { id: 'juice', name: 'نوشابه', desc: '+۴۰ انرژی', price: 8 },
      ],
      ice: [
        { id: 'ice', name: 'بستنی', desc: 'خنک و شاد! (+۱۵ انرژی)', price: 9 },
      ],
      book: [
        { id: 'notebook', name: 'دفتر مشق', desc: 'برای امتحان‌ها (+۵ دانش)', price: 10 },
        { id: 'book', name: 'کتاب داستان', desc: 'سرگرمی سالم', price: 12 },
      ],
      toy: [
        { id: 'kite', name: 'بادبادک', desc: 'پرواز در پارک شهر!', price: 15 },
        { id: 'ball', name: 'توپ پلاستیکی', desc: 'بازی در حیاط', price: 10 },
      ],
      clinic: [
        { id: 'medkit', name: 'جَعبهٔ کمک‌های اولیه', desc: 'جان کامل', price: 20 },
      ],
      cafe: [
        { id: 'coffee', name: 'قهوه', desc: '+۵۰ انرژی', price: 12 },
        { id: 'cake', name: 'کیک', desc: 'برای جشن (+۲۰ جان)', price: 14 },
      ],
    };
    return S[kind] || S.super;
  }

  openShop(id) {
    const items = this._shopItems(id);
    this.audio.play('open');
    this.ui.shop(items, this.coins, (item) => this.buyShopItem(item), EXT.shops.find((s) => s.id === id) ? EXT.shops.find((s) => s.id === id).name : 'فروشگاه');
  }

  buyShopItem(item) {
    if (this.coins < item.price) {
      this.audio.play('error');
      this.ui.toast('سکهٔ کافی نداری! (' + faNum(item.price) + ' سکه لازم است)');
      return;
    }
    this.addCoins(-item.price);
    if (item.id === 'medkit') { this.hp = 100; this.en = 100; }
    else if (item.id === 'kite') { this.animals && this.animals.toggleKite(); }
    else if (item.id === 'notebook') { this.grades && this.grades.addKnowledge(5); }
    else if (item.id === 'ball') { this.world.resetBall(); }
    else this.inv[item.id] = (this.inv[item.id] || 0) + 1;
    this.audio.play('coin');
    this.ui.toast(item.name + ' خریدی! (' + faNum(this.coins) + ' سکه مانده)');
    this.ui.shopCoins(this.coins);
    if (this.achievements) { this.achievements.bump('shops', 1); this.achievements.bump('travel', 0); }
  }

  fastTravel(id) {
    const spot = EXT.fastTravel.find((f) => f.id === id);
    if (!spot) return;
    if (this.vehicles.active) { this.ui.toast('اول از خودرو پیاده شو!'); return; }
    this.player.pos.set(spot.x, 0, spot.z);
    this.player.yaw = 0;
    this.audio.play('open');
    this.ui.toast('سفر سریع: ' + spot.name + ' 🚌');
  }

  busTour() {
    this.addScore(10);
    this.ui.banner('اتوبوس شهر', 'گشتی در شهر آفتاب زدی! مسیرها را یاد گرفتی.');
    this.fastTravel('city');
    this.audio.play('open');
    if (this.achievements) this.achievements.bump('bus', 1);
  }

  readBoard(id) {
    const msgs = {
      city: ['📣 جشنوارهٔ پاییزی شهر، جمعه در پارک شهر!', '📣 فروشگاه‌ها امروز تخفیف دارند.', '📣 کلاس زبان انگلیسی شهر هنوز جا دارد.'],
      dorm: ['🛏 ساعت خواب خوابگاه: ۲۲:۳۰', '🧺 روز رخت‌شویی: دوشنبه‌ها', '🍳 صبحانه ساعت ۷ تا ۸'],
    };
    const list = msgs[id] || msgs.city;
    this.ui.banner('تابلوی اعلانات', choice(list));
    this.audio.play('talk');
  }

  buyVending() {
    if (this.coins < 5) { this.audio.play('error'); this.ui.toast('۵ سکه لازم است!'); return; }
    this.addCoins(-5);
    this.inv.juice = (this.inv.juice || 0) + 1;
    this.audio.play('coin');
    this.ui.toast('یک نوشیدنی خنک خریدی! 🥤');
  }

  withdrawATM() {
    const day = Math.floor(this.timeH);
    if (this._atmDay === this._dayIndex) { this.audio.play('error'); this.ui.toast('امروز پول برداشت کردی — فردا بیا!'); return; }
    this._atmDay = this._dayIndex;
    this.addCoins(20);
    this.audio.play('coin');
    this.ui.toast('۲۰ سکه برداشت شد! 🏧');
    void day;
  }

  sortTrash() {
    this.addCoins(3);
    this.addScore(5);
    this.audio.play('pickup');
    this.ui.toast('زباله‌ها را جدا کردی! +۳ سکه ♻️');
    if (this.achievements) this.achievements.bump('recycle', 1);
  }

  sleepInDorm() {
    this.timeH = 7;
    this.hp = 100;
    this.en = 100;
    this._dayIndex = (this._dayIndex || 0) + 1;
    this.npcs.lastPhase = null;
    this.audio.play('complete');
    this.ui.banner('صبح بخیر!', 'شب را در خوابگاه خوابیدی — جان و انرژی کامل شد.');
    this.saveGame(true);
  }

  toggleKite() {
    if (!this.animals) return;
    const on = this.animals.toggleKite();
    this.ui.toast(on ? 'بادبادک در آسمان است! 🪁' : 'بادبادک را جمع کردی.');
  }

  giveSkateboard() {
    this.hasSkateboard = true;
    this.ui.toast('تخته‌اسکیت گرفتی! کلید C برای سوار شدن 🛹');
    this.audio.play('quest');
  }

  useMicroscope() {
    if (this.world.sparkles) this.world.sparkles.spawn(44, 1.2, -4.2, 0x9fd2ee, 14, { spread: 1.4, up: 2, life: 0.7 });
    this.audio.play('click');
    this.ui.toast('زیر میکروسکوپ: سلول‌های برگ! 🔬 +۵ دانش');
    if (this.grades) this.grades.addKnowledge(5);
  }

  doLabExperiment() {
    const colors = [0x4dd4ff, 0xffd23f, 0xff6b9d, 0x7cff6b];
    for (let i = 0; i < 4; i++) {
      if (this.world.sparkles) this.world.sparkles.spawn(46.5 + rand(-1, 1), 1.3, -14.5 + rand(-1, 1), colors[i], 10, { spread: 2, up: 3.4, life: 1.1 });
    }
    this.audio.play('secret');
    this.ui.toast('آزمایش موفق بود! 🧪 +۸ دانش');
    if (this.grades) this.grades.addKnowledge(8);
    if (this.achievements) this.achievements.bump('labs', 1);
  }

  eatCafeteria() {
    this.audio.play('open');
    this.ui.shop([
      { id: 'meal', name: 'غذای روز', desc: 'جان و انرژی کامل', price: 14 },
      { id: 'cake', name: 'دسر', desc: '+۲۰ جان', price: 9 },
      { id: 'juice', name: 'نوشیدنی', desc: '+۴۰ انرژی', price: 6 },
    ], this.coins, (item) => {
      if (this.coins < item.price) { this.audio.play('error'); this.ui.toast('سکهٔ کافی نداری!'); return; }
      this.addCoins(-item.price);
      if (item.id === 'meal') { this.hp = 100; this.en = 100; }
      else if (item.id === 'cake') this.hp = clamp(this.hp + 20, 0, 100);
      else this.en = clamp(this.en + 40, 0, 100);
      this.audio.play('eat');
      this.ui.toast(item.name + ' خوردی! 😋');
    }, 'سالن غذاخوری');
  }

  openRaceMenu() {
    if (this.racing && this.racing.track) { this.racing.openMenu(); return; }
    if (this.ui.raceMenu) {
      this.ui.raceMenu(RACE_MODES.map((m) => ({ ...m, best: '—' })), (id) => this.ui.toast('پیست آماده نیست (' + id + ')'));
      return;
    }
    this.ui.toast('پیست به‌زودی باز می‌شود! 🏁');
  }

  /* ================= آب‌وهوا و صدا ================= */
  cycleWeather() {
    const order = ['auto', 'clear', 'cloudy', 'rain', 'storm', 'snow', 'fog'];
    const i = order.indexOf(this.weather.mode);
    const next = order[(i + 1) % order.length];
    this.weather.set(next, false);
    this.weatherMode = next;
    this.ui.toast('آب‌وهوا: ' + weatherIcon(next) + ' ' + (WEATHER_LABEL[next] || next));
    this.audio.play('click');
  }

  cycleVoice() {
    const order = ['tts', 'babble', 'off'];
    const i = order.indexOf(this.voice.mode);
    const next = order[(i + 1) % order.length];
    this.voice.setMode(next);
    this.ui.toast('حالت دوبله: ' + (next === 'tts' ? 'صداپیشگی مرورگر 🔊' : next === 'babble' ? 'نجواگرا 🗣' : 'خاموش 🔇'));
    this.audio.play('click');
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
    } else if (t.type === 'animal') {
      this.petAnimal();
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
    // حیوان نزدیک
    if (this.animals) {
      const a = this.animals.nearest(px, pz, 2.6);
      if (a) {
        const d = dist2D(px, pz, a.x, a.z);
        if (d < bd) { bd = d; best = { type: 'animal', ref: a }; }
      }
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
    else if (best.type === 'animal') txt = 'غذا دادن / نوازش ' + (best.ref.name || 'حیوان');
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
      animals: this.animals ? this.animals.mapPoints() : [],
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
      weather: this.weather.stateForSave(),
      weatherMode: this.weatherMode,
      animals: this.animals.stateForSave(),
      achievements: this.achievements.stateForSave(),
      racing: this.racing.stateForSave(),
      grades: this.grades.stateForSave(),
      story: this.story.stateForSave(),
      party: this.party.stateForSave(),
      flags: { hasSkateboard: this.hasSkateboard, hasBicycle: this.hasBicycle, dayIndex: this._dayIndex, ride: this.rideKind },
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
    if (this.weather) this.weather.setQuality(q);
    if (this.animals) this.animals.setQuality(q);
    if (this.music) this.music.applySettings();
    if (this.voice) this.voice.applySettings();
  }

  /* ================= ساخت سیستم‌های گسترش ================= */
  _buildSystems() {
    const ctx = { ui: this.ui, audio: this.audio, game: this, world: this.world, npcs: this.npcs, player: this.player, missions: this.missions, vehicles: this.vehicles, settings: this.settings, scene: this.scene };
    this.weather = new Weather(this.scene, this.world, this.audio, this.settings);
    this.animals = new AnimalManager(this.scene, this.world, this.audio, this.npcs);
    this.animals.build();
    this.music = new Music(this.audio, this.settings);
    this.voice = new Voice(this.settings, this.audio);
    this.achievements = new Achievements({ ui: this.ui, audio: this.audio, game: this });
    this.grades = new GradeBook({ ui: this.ui, audio: this.audio, game: this, world: this.world, achievements: this.achievements });
    this.racing = new RaceManager({ ...ctx, music: this.music, achievements: this.achievements, onRaceFinish: (x) => this.onRaceFinish(x) });
    this.party = new PartySystem({ ...ctx, animals: this.animals, music: this.music });
    this.story = new StoryManager({ ...ctx, grades: this.grades, racing: this.racing, party: this.party, animals: this.animals, weather: this.weather, achievements: this.achievements });
    this.story.init();
    this.racing.build();
    // دوچرخه و تخته‌اسکیت در انبار بازیکن
    this._updateRide();
  }

  /* ================= دوچرخه و تخته‌اسکیت ================= */
  giveBicycle() {
    this.hasBicycle = true;
    this.ui.toast('دوچرخه داری! کلید B برای سوار شدن 🚲');
    this.audio.play('quest');
    if (this.achievements) this.achievements.bump('travel', 0);
  }

  toggleRide(kind) {
    if (this.rideKind === kind) { this.rideKind = null; }
    else {
      if (kind === 'bike' && !this.hasBicycle) { this.ui.toast('اول دوچرخه را از تعمیرگاه بگیر! (آقای فرید)'); this.audio.play('error'); return; }
      if (kind === 'skate' && !this.hasSkateboard) { this.ui.toast('اول تخته‌اسکیت بگیر! (پارک اسکیت)'); this.audio.play('error'); return; }
      this.rideKind = kind;
    }
    if (this.vehicles.active) { this.ui.toast('اول از خودرو پیاده شو!'); this.rideKind = null; return; }
    this._updateRide();
    this.audio.play('open');
    const names = { bike: 'دوچرخه 🚲', skate: 'تخته‌اسکیت 🛹' };
    this.ui.toast(this.rideKind ? 'سوار ' + names[this.rideKind] + ' شدی! (برای پیاده شدن دوباره همان کلید)' : 'پیاده شدی.');
  }

  _updateRide() {
    if (this.player && this.player.setRide) this.player.setRide(this.rideKind);
  }

  /* ================= تماس با حیوانات ================= */
  petAnimal() {
    const a = this.animals && this.animals.nearest(this.player.x, this.player.z, 3);
    if (!a) { this.ui.toast('حیوانی نزدیک نیست.'); return; }
    if (a.kind === 'cat' || a.kind === 'dog' || a.kind === 'rabbit') {
      if (this.animals.feed) this.animals.feed(a, 'fish');
      if (this.animals.pet) this.animals.pet(a);
      this.ui.toast(a.name ? ('به ' + a.name + ' غذا دادی! 🐟') : 'حیوان را نوازش کردی!');
    } else {
      this.ui.toast('این حیوان را نمی‌شود نوازش کرد — تماشایش کن! 🐦');
    }
    if (this.achievements) { this.achievements.bump('fed', 1); this.achievements.bump('pets', 1); }
  }

  /* ================= ریزفعالیت‌های جهان: حلقه‌ها، ریل، شیرجه، آدم‌برفی ================= */
  _updateExtras(dt, px, pz) {
    const ext = this.world.ext;
    if (!ext || !this.player) return;
    const p = this.player;
    const riding = !!this.rideKind;

    // ۱) حلقه‌های پارک اسکیت
    for (const h of ext.hoops) {
      if (h.taken) continue;
      if (dist2D(px, pz, h.x, h.z) < 1.7 && p.pos.y < 2.6) {
        h.taken = true;
        h.mesh.visible = false;
        this.audio.play('goal');
        if (this.world.sparkles) this.world.sparkles.spawn(h.x, 1.4, h.z, 0xffd34d, 18, { spread: 2, up: 4, life: 0.9 });
        if (this.achievements) this.achievements.bump('hoops', 1);
        this.ui.toast('از حلقه گذشتی! 🎯' + (this.rideKind === 'skate' ? ' (ترفند اسکیت)' : ''));
        this.story && this.story.ctx.missions.refreshMarkers();
      }
    }

    // ۲) سُر خوردن روی ریل‌های پارک
    const rail = ext.railAt && ext.railAt(px, pz);
    if (rail && riding && p.pos.y > 0.2) {
      this._railT = (this._railT || 0) + dt;
      if (this._railT > 0.7 && !this._railDone) {
        this._railDone = true;
        if (this.achievements) this.achievements.bump('rails', 1);
        this.audio.play('kick');
        this.ui.toast('روی ریل سر خوردی! ⚡');
      }
    } else { this._railT = 0; this._railDone = false; }

    // ۳) پرش از تختهٔ شیرجه استخر
    const board = ext.pool && ext.pool.board;
    if (board && !p.grounded && dist2D(px, pz, board.x, board.z) < 2.4 && p.pos.y > 2.2) {
      if (!this._diveT) {
        this._diveT = 1;
        this.audio.play('splash');
        if (this.achievements) this.achievements.bump('dives', 1);
        this.ui.toast('شیرجه زدی! 🤿');
      }
    } else if (p.grounded) this._diveT = 0;

    // ۴) آدم‌برفی
    if (this.weather.snow01 > 0.5 && dist2D(px, pz, -8, 30) < 3) {
      if (this.achievements) this.achievements.bump('snowman', 1);
    }

    // ۵) سفر سریع: شمارش نقاط دیده‌شده
    const near = ext.nearestFastTravel && ext.nearestFastTravel(px, pz);
    if (near) {
      this._travelSeen = this._travelSeen || new Set();
      if (!this._travelSeen.has(near.id)) {
        this._travelSeen.add(near.id);
        if (this.achievements) this.achievements.bump('travel', 1);
        this.ui.toast('نقطهٔ سفر سریع کشف شد: ' + near.name + ' (' + faNum(this._travelSeen.size) + '/۵)');
      }
    }

    // ۶) ترفند اسکیت هنگام پرش
    if (this.rideKind === 'skate' && this._sawJump) {
      this._sawJump = false;
      if (this.achievements) this.achievements.bump('tricks', 1);
    }
  }

  /* ================= پایان مسابقه ================= */
  onRaceFinish(x) {
    if (this.story && this.story.onRaceFinish) this.story.onRaceFinish(x);
    if (this.achievements && x && x.win && x.laps >= 3) this.achievements.unlock('racer');
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
      if (this.music) { this.music.update(dt); this.music.autoSelect({ state: 'menu', timeH: this.timeH }); }
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
      // رمپ‌ها و سطح آب استخر
      const ext = this.world.ext;
      if (ext) {
        const rh = ext.rampHeightAt ? ext.rampHeightAt(this.player.x, this.player.z) : 0;
        if (rh > 0 && this.player.pos.y < rh) { this.player.pos.y = rh; this.player.vy = Math.max(0, this.player.vy); this.player.grounded = true; }
        if (ext.inPoolWater && ext.inPoolWater(this.player.x, this.player.z) && this.player.pos.y < 0.5) {
          this.player.pos.y = 0.24;
          if (!this._swimT && this.achievements) { /* شنا */ }
        }
      }
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
    const ppx = driving ? this.vehicles.active.x : this.player.x;
    const ppz = driving ? this.vehicles.active.z : this.player.z;
    this.world.update(dt, { px: ppx, pz: ppz, kicker: driving ? null : this._kicker });
    this.npcs.update(dt, this.timeH, { x: this.player.x, z: this.player.z });
    this.missions.update(dt);
    this.audio.update(dt, this._isDay);

    /* ---------- گسترش: آب‌وهوا، حیوانات، موسیقی، صدا، دستاورد، پیست ---------- */
    this.weather.update(dt, { timeH: this.timeH, px: ppx, pz: ppz });
    if (this.world.ext && this.world.ext.updateVisuals) this.world.ext.updateVisuals(dt, this.timeH);
    const wet = this.weather.isWet, snowy = this.weather.isSnow;
    this.animals.update(dt, { px: ppx, pz: ppz, timeH: this.timeH, rain: wet, snow: snowy, camYaw: this.player.yaw });
    this.grades.update(dt, { area: areaOf(ppx, ppz), timeH: this.timeH, x: ppx, z: ppz });
    this.story.update(dt);
    this.party.update(dt);
    this.racing.update(dt);
    this.music.update(dt);
    this.music.autoSelect({
      state: this.state,
      racing: this.racing.state === 'racing' || this.racing.state === 'countdown',
      party: this.party.active,
      exam: !!this.grades.exam,
      weatherTrack: this.weather.musicHint(),
      timeH: this.timeH,
    });
    this.voice.update(dt);
    this._sawJump = this._sawJump || (this.jumpQueued && this.player.grounded);
    this._updateExtras(dt, ppx, ppz);
    const moved = dist2D(this._lastPX, this._lastPZ, ppx, ppz);
    this._distAcc += moved > 3 ? 0 : moved;
    this._lastPX = ppx; this._lastPZ = ppz;
    void this._distAcc;
    this.achievements.update(dt, {
      dist: moved > 3 ? 0 : moved,
      driving,
      sprinting,
      swim: !driving && this.world.ext && this.world.ext.inPoolWater && this.world.ext.inPoolWater(ppx, ppz) && this.player.pos.y < 1.3,
      rain: wet,
      kite: !!this.animals.kiteOn,
      coins: this.coins,
      timeH: this.timeH,
      gpa: this.grades.gpa(),
    });
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
      this.ui.setWeather(this.weather.icon + ' ' + this.weather.label, this.timeH);
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

/* ============================================================
   School Life: Open Campus — party.js
   جشن پایان سال: رقص، کاغذرنگی، بادکنک، دی‌جی و نورپردازی
   ============================================================ */
import * as THREE from 'three';
import { rand, randInt, choice, clamp, dist2D, faNum } from './utils.js';

const DANCE_MOVES = ['چرخش', 'دست‌موج', 'پرش', 'قدم‌رو', 'کف‌زدن', 'چرخ‌کامل', 'حرکت ربات'];
const CHEERS = ['وای چه جشنی!', 'موسیقی عالیه! 🎵', 'سال خوبی بود!', 'همه با هم!', 'نورها را ببین!'];

export class PartySystem {
  constructor(ctx) {
    this.ctx = ctx;                // {ui, audio, game, world, npcs, animals, music}
    this.active = false;
    this.time = 0;
    this.danceCombo = 0;
    this.lastMove = 0;
    this.move = 0;
    this.cheerT = 0;
    this.balloons = [];
    this.confetti = [];
    this.scoreGiven = false;
    this.guests = [];
    this.stageLight = null;
    this.discolights = [];
    this._built = false;
  }

  get ui() { return this.ctx.ui; }
  get audio() { return this.ctx.audio; }
  get game() { return this.ctx.game; }
  get world() { return this.ctx.world; }

  /* ---------- ساخت اجزای جشن در حیاط ---------- */
  build() {
    if (this._built) return;
    this._built = true;
    const scene = this.world.scene;
    const M = this.world.M;
    const L = (c, o = {}) => new THREE.MeshLambertMaterial({ color: c, ...o });

    // صحنه و بلندگوها
    this.world.box(8, 0.6, 4, L(0x3b2a5b), 0, 0.3, 20, { collider: true });
    this.world.box(8.4, 0.5, 4.4, L(0x8b5cf6), 0, 0.62, 20);
    for (const [sx, sz] of [[-5.5, 20], [5.5, 20]]) {
      this.world.box(0.9, 2.2, 0.9, L(0x1f2937), sx, 1.1, sz, { collider: true });
      const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.12, 10), L(0x4a4a52));
      cone.rotation.x = Math.PI / 2;
      cone.position.set(sx, 1.7, sz + 0.5);
      scene.add(cone);
    }
    // نورهای رنگی
    const cols = [0xff3b6b, 0x3b82f6, 0xf2c94c, 0x22c55e, 0x8b5cf6];
    for (let i = 0; i < cols.length; i++) {
      const pl = new THREE.PointLight(cols[i], 18, 30, 1.8);
      pl.position.set(-8 + i * 4, 5.2, 18);
      scene.add(pl);
      this.discolights.push({ light: pl, col: cols[i], phase: i * 1.3 });
    }
    // ریسه‌های تزئینی
    for (let i = 0; i < 16; i++) {
      const x = -12 + i * 1.6;
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 6, 5), L(choice(cols), { emissive: choice(cols), emissiveIntensity: 0.9 }));
      bulb.position.set(x, 3.6 + Math.sin(i * 0.6) * 0.35, 14);
      scene.add(bulb);
    }
    this.world.mapLabels.push({ x: 0, z: 20, t: 'جشن 🎉' });
    this.spawnBalloons(28);
  }

  spawnBalloons(n) {
    const scene = this.world.scene;
    const cols = [0xff3b6b, 0x3b82f6, 0xf2c94c, 0x22c55e, 0x8b5cf6, 0xff8fb1];
    for (let i = 0; i < n; i++) {
      const c = choice(cols);
      const g = new THREE.Group();
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 7), new THREE.MeshLambertMaterial({ color: c, emissive: c, emissiveIntensity: 0.15 }));
      b.scale.y = 1.2;
      g.add(b);
      const str = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4), new THREE.MeshLambertMaterial({ color: 0xdddddd }));
      str.position.y = -0.55;
      g.add(str);
      g.position.set(rand(-14, 14), rand(1.5, 5.2), rand(12, 26));
      scene.add(g);
      this.balloons.push({ g, phase: rand(0, 6.28), base: g.position.y, drift: rand(0.2, 0.6) });
    }
  }

  /* ---------- شروع و پایان جشن ---------- */
  start(opt = {}) {
    if (this.active) return false;
    this.build();
    this.active = true;
    this.time = 0;
    this.danceCombo = 0;
    this.scoreGiven = false;
    this.game.partyOn = true;
    this.audio.play('party');
    if (this.ctx.music) this.ctx.music.lockTrack('party', 90);
    if (this.ctx.npcs) {
      // چند مهمان به حیاط بیایند
      const picks = ['st1', 'st2', 'st3', 'st4', 'rm1', 'rm2', 'rm3', 'rm4'];
      this.guests = [];
      for (const id of picks) {
        const n = this.ctx.npcs.npcById(id);
        if (!n) continue;
        n.group.visible = true;
        n.group.position.set(rand(-12, 12), 0, rand(12, 26));
        n.queue = [];
        n.partyDance = true;
        this.guests.push(n);
      }
    }
    this.ui.banner('جشن پایان سال شروع شد! 🎉', 'با کلید U برقص — هرچه ترکیب رقص بیشتر، امتیاز بیشتر!');
    this.ui.toast('مهمان‌ها دارند می‌آیند... کلید U برای رقص 💃');
    return true;
  }

  stop(reason = '') {
    if (!this.active) return;
    this.active = false;
    this.game.partyOn = false;
    for (const n of this.guests) n.partyDance = false;
    this.guests = [];
    if (this.ctx.music) this.ctx.music.lockTrack(null);
    const total = this.danceCombo;
    if (total >= 5) {
      const bonus = clamp(Math.floor(total * 6), 40, 400);
      this.game.addCoins(Math.floor(bonus / 4));
      this.game.addScore(bonus);
      this.ui.banner('جشن تمام شد 🎊', 'ترکیب رقص: ' + faNum(total) + ' — جایزه ' + faNum(bonus) + ' امتیاز');
      if (this.ctx.achievements) this.ctx.achievements.bump('dance', 1);
    } else {
      this.ui.toast('جشن تمام شد' + (reason ? ' — ' + reason : ''));
    }
  }

  /* ---------- رقصیدن (کلید U) ---------- */
  dance() {
    if (!this.active) { this.ui.toast('الان جشنی برگزار نمی‌شود! پیش خانم نازنین برو.'); return false; }
    const p = this.game.player;
    if (dist2D(p.x, p.z, 0, 20) > 18) { this.ui.toast('برای رقص به صحنهٔ جشن در حیاط برو!'); return false; }
    const now = performance.now();
    if (now - this.lastMove < 260) {           // ریتم سریع = سوختن ترکیب
      this.danceCombo = Math.max(0, this.danceCombo - 1);
      this.audio.play('error');
      this.ui.toast('ریتم را نگه دار! 💃');
      return false;
    }
    this.lastMove = now;
    this.move = (this.move + 1) % DANCE_MOVES.length;
    this.danceCombo++;
    this.audio.play('coin');
    if (this.danceCombo % 5 === 0) {
      this.audio.play('quest');
      this.ui.toast('ترکیب ' + faNum(this.danceCombo) + '! حرکت: ' + DANCE_MOVES[this.move]);
    }
    if (this.danceCombo >= 30 && !this.scoreGiven) {
      this.scoreGiven = true;
      this.game.addCoins(150);
      this.game.addScore(500);
      this.ui.banner('رقصندهٔ حرفه‌ای شدی! 🕺', 'جایزهٔ ویژه: ۱۵۰ سکه و ۵۰۰ امتیاز');
      if (this.ctx.achievements) this.ctx.achievements.bump('dance', 1);
    }
    this._animatePlayer();
    return true;
  }

  _animatePlayer() {
    const pl = this.game.player;
    if (!pl.group) return;
    const parts = pl.group.userData && pl.group.userData.parts;
    if (!parts) return;
    const t = performance.now() * 0.006;
    const m = this.move;
    parts.armL.rotation.x = Math.sin(t) * (m % 2 ? -0.9 : 0.9);
    parts.armR.rotation.x = Math.sin(t + 1.6) * (m % 2 ? 0.9 : -0.9);
    parts.legL.rotation.x = Math.sin(t + 0.8) * 0.4;
    parts.legR.rotation.x = -Math.sin(t + 0.8) * 0.4;
    pl.group.rotation.y += 0.04;
  }

  /* ---------- به‌روزرسانی هر فریم ---------- */
  update(dt) {
    // بادکنک‌ها همیشه کمی شناور باشند
    for (const b of this.balloons) {
      b.g.position.y = b.base + Math.sin(performance.now() * 0.001 + b.phase) * 0.12;
      b.g.position.x += Math.sin(performance.now() * 0.0006 + b.phase) * b.drift * dt;
    }
    if (!this.active) return;
    this.time += dt;
    // دی‌جی: رنگ نورها
    for (const d of this.discolights) {
      d.phase += dt * 2.2;
      d.light.intensity = 12 + Math.sin(d.phase) * 8 + Math.random() * 3;
      d.light.color.setHex(d.col);
    }
    // کاغذرنگی
    if (Math.random() < dt * 26) {
      this._confetti(Math.random() < 0.5 ? 0 : 1);
    }
    for (let i = this.confetti.length - 1; i >= 0; i--) {
      const c = this.confetti[i];
      c.mesh.position.y -= c.vy * dt;
      c.mesh.position.x += Math.sin(performance.now() * 0.002 + c.phase) * 0.6 * dt;
      c.mesh.rotation.x += dt * 4;
      c.mesh.rotation.z += dt * 3;
      c.life -= dt;
      if (c.life <= 0 || c.mesh.position.y < 0.05) {
        this.world.scene.remove(c.mesh);
        this.confetti.splice(i, 1);
      }
    }
    // مهمان‌ها می‌رقصند
    for (const n of this.guests) {
      const P = n.group.userData.parts;
      const t = performance.now() * 0.007 + n.walkPhase;
      if (P) {
        P.armL.rotation.x = Math.sin(t) * 1.2;
        P.armR.rotation.x = Math.sin(t + 1.5) * 1.2;
        P.legL.rotation.x = Math.sin(t * 1.2) * 0.35;
        P.legR.rotation.x = -Math.sin(t * 1.2) * 0.35;
      }
      n.group.rotation.y += dt * 1.4;
    }
    // هلهله
    this.cheerT -= dt;
    if (this.cheerT <= 0) {
      this.cheerT = rand(5, 11);
      const p = this.game.player;
      if (dist2D(p.x, p.z, 0, 20) < 26) {
        this.ui.toast(choice(CHEERS));
        this.audio.play('talk');
      }
    }
    // پایان خودکار جشن پس از ۴ دقیقه
    if (this.time > 240) this.stop('وقت تمام شد');
  }

  _confetti(seed) {
    const scene = this.world.scene;
    const geo = new THREE.PlaneGeometry(0.22, 0.34);
    const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({
      color: choice([0xff3b6b, 0x3b82f6, 0xf2c94c, 0x22c55e, 0x8b5cf6, 0xffffff]),
      side: THREE.DoubleSide,
    }));
    mesh.position.set(rand(-16, 16), rand(7, 11), rand(10, 28) + seed);
    mesh.rotation.set(rand(0, 3), rand(0, 3), rand(0, 3));
    scene.add(mesh);
    this.confetti.push({ mesh, vy: rand(1.4, 2.6), life: rand(2.5, 4.5), phase: rand(0, 6) });
    if (this.confetti.length > 160) {
      const old = this.confetti.shift();
      scene.remove(old.mesh);
    }
  }

  /** اطلاعات برای ذخیره‌سازی */
  stateForSave() {
    return {
      active: this.active,
      time: this.time,
      combo: this.danceCombo,
      scoreGiven: this.scoreGiven,
      best: Math.max(this.danceCombo, this.best || 0),
    };
  }

  loadState(s) {
    if (!s) return;
    this.best = s.best || 0;
    if (s.active) {
      this.start();
      this.time = s.time || 0;
      this.danceCombo = s.combo || 0;
      this.scoreGiven = !!s.scoreGiven;
    }
  }
}

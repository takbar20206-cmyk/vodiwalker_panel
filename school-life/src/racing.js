/* ============================================================
   School Life: Open Campus — racing.js
   پیست مسابقه: تایم‌تریل، مسابقهٔ مدار با ۳ رقیب، اسپرینت، تمرین
   ============================================================ */
import * as THREE from 'three';
import { clamp, rand, dist2D, lerpAngle, faNum } from './utils.js';
import { geoBox, geoCyl, geoSph, matLambert, textSprite } from './gfx.js';

export const RACE_MODES = [
  { id: 'timeTrial', name: 'تایم‌تریل',      icon: '⏱', desc: '۳ دور، فقط تو و ساعت!',        laps: 3, rivals: 0 },
  { id: 'circuit',   name: 'مسابقهٔ مدار',   icon: '🏁', desc: '۳ دور با ۳ رقیب',              laps: 3, rivals: 3 },
  { id: 'sprint',    name: 'اسپرینت',        icon: '⚡', desc: 'یک دور سریع با ۳ رقیب',        laps: 1, rivals: 3 },
  { id: 'practice',  name: 'تمرین آزاد',     icon: '🛠', desc: 'بی‌رقابت؛ دور بزن و رکورد بزن', laps: 0, rivals: 0 },
];

const RIVALS = [
  { id: 'r1', name: 'آرش',   color: 0x3b82f6, num: 7 },
  { id: 'r2', name: 'مهرسا', color: 0xec4899, num: 3 },
  { id: 'r3', name: 'بردیا', color: 0x22c55e, num: 9 },
];

function buildKart(color, num) {
  const g = new THREE.Group();
  const M = matLambert;
  const body = new THREE.Mesh(geoBox(1.1, 0.35, 2.0), M(color));
  body.position.y = 0.45; body.castShadow = true; g.add(body);
  const nose = new THREE.Mesh(geoBox(0.7, 0.2, 0.6), M(0xf2f2ea));
  nose.position.set(0, 0.42, 1.2); g.add(nose);
  const seat = new THREE.Mesh(geoBox(0.6, 0.5, 0.5), M(0x2c313a));
  seat.position.set(0, 0.72, -0.35); g.add(seat);
  const driver = new THREE.Mesh(geoSph(0.19, 8, 6), M(0xe8b98a));
  driver.position.set(0, 1.0, -0.3); g.add(driver);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.21, 8, 6, 0, 6.28, 0, 1.2), M(color));
  helmet.position.set(0, 1.04, -0.3); g.add(helmet);
  const spoiler = new THREE.Mesh(geoBox(0.9, 0.08, 0.3), M(0x22242a));
  spoiler.position.set(0, 0.85, -1.0); g.add(spoiler);
  for (const sx of [-0.35, 0.35]) {
    const post = new THREE.Mesh(geoBox(0.07, 0.25, 0.07), M(0x22242a));
    post.position.set(sx, 0.7, -1.0); g.add(post);
  }
  const wheels = [];
  for (const [px, pz, steer] of [[-0.62, 0.75, true], [0.62, 0.75, true], [-0.66, -0.7, false], [0.66, -0.7, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(px, 0.26, pz);
    const w = new THREE.Mesh(geoCyl(0.26, 0.26, 0.2, 10), M(0x1d1f24));
    w.rotation.z = Math.PI / 2;
    w.castShadow = true;
    pivot.add(w);
    g.add(pivot);
    wheels.push({ pivot, mesh: w, steer });
  }
  const label = textSprite(String(num), { height: 0.5, bg: 'rgba(20,24,32,0.7)', fg: '#ffe9a3', size: 40 });
  label.position.set(0, 1.5, 0);
  g.add(label);
  g.userData.wheels = wheels;
  return g;
}

export class RaceManager {
  constructor(ctx) {
    this.ctx = ctx; // {scene, world, vehicles, ui, audio, music, game, achievements}
    this.state = 'idle';   // idle | countdown | racing | finished
    this.mode = null;
    this.laps = 0;
    this.lap = 0;
    this.nextCp = 0;
    this.totalTime = 0;
    this.lapTime = 0;
    this.lapTimes = [];
    this.bestLaps = {};   // modeId -> ثانیه
    this.races = 0;
    this.wins = 0;
    this.countdownT = 0;
    this.rivals = [];
    this.offTrack = false;
    this.position = 1;
    this.playerKart = null;
    this._finishToast = false;
    this._built = false;
  }

  get ui() { return this.ctx.ui; }
  get audio() { return this.ctx.audio; }
  get game() { return this.ctx.game; }
  get world() { return this.ctx.world; }
  get vehicles() { return this.ctx.vehicles; }
  get track() { return this.ctx.world.ext ? this.ctx.world.ext.track : null; }

  build() {
    if (this._built) return;
    const t = this.track;
    if (!t) return;
    this._built = true;
    // کات رقبا
    for (const r of RIVALS) {
      const g = buildKart(r.color, r.num);
      g.visible = false;
      this.ctx.scene.add(g);
      this.rivals.push({
        ...r, mesh: g, x: 0, z: 0, heading: 0, speed: 0,
        idx: 0, lap: 0, nextCp: 0, finished: false, finishTime: 0,
        progress: 0, lane: rand(-1.6, 1.6), skill: rand(0.92, 1.02), stuckT: 0,
      });
    }
    // جایگاه کات بازیکن در پیست (فیزیک با VehicleManager)
    this.game.vehicles.ensureKarts && this.game.vehicles.ensureKarts();
  }

  /* ---------------- منو ---------------- */
  openMenu() {
    if (this.state === 'countdown' || this.state === 'racing') {
      this.ui.toast('در میانهٔ مسابقه‌ای! برای انصراف کلید R را بزن.');
      return;
    }
    this.ui.raceMenu(RACE_MODES.map((m) => ({
      ...m,
      best: this.bestLaps[m.id] != null ? faNum(this.bestLaps[m.id].toFixed(2)) + ' ثانیه' : '—',
    })), (id) => this.start(id));
  }

  /* ---------------- شروع مسابقه ---------------- */
  start(modeId) {
    const mode = RACE_MODES.find((m) => m.id === modeId);
    const t = this.track;
    if (!mode || !t) { this.ui.toast('پیست آماده نیست!'); return; }
    this.build();
    this.mode = mode;
    this.laps = mode.laps;
    this.lap = 1;
    this.nextCp = 0;
    this.totalTime = 0;
    this.lapTime = 0;
    this.lapTimes = [];
    this.races++;
    this.state = 'countdown';
    this.countdownT = 3.4;
    this.position = 1;
    this._finishToast = false;
    const drive = this.vehicles.active;
    const v = drive && drive.type === 'kart' ? drive : (this.vehicles.byId('kart1') || null);
    if (!v) { this.ui.toast('کات در دسترس نیست!'); return; }
    if (!this.vehicles.active || this.vehicles.active !== v) {
      if (this.vehicles.active) this.vehicles.exit();
      this.game.player.driving = v;
      this.game.player.group.visible = false;
      this.vehicles.enter(v);
      this.vehicles.onEnterCamera();
    }
    // قرار دادن بازیکن پشت خط شروع
    const i = t.startIdx;
    const p = t.pts[i], n = t.normals[i];
    const behind = { x: p.x - (t.pts[(i + 1) % t.pts.length].x - p.x) * 0.6, z: p.z - (t.pts[(i + 1) % t.pts.length].z - p.z) * 0.6 };
    const heading = Math.atan2(t.pts[(i + 1) % t.pts.length].x - p.x, t.pts[(i + 1) % t.pts.length].z - p.z);
    v.x = behind.x + n.x * 2.0; v.z = behind.z + n.z * 2.0; v.heading = heading; v.speed = 0;
    v.group.position.set(v.x, 0, v.z);
    v.group.rotation.y = v.heading;
    // رقبا
    const rivals = mode.rivals;
    this.rivals.forEach((r, k) => {
      const active = k < rivals;
      r.mesh.visible = active;
      r.finished = false; r.lap = 0; r.nextCp = 0; r.finishTime = 0; r.speed = 0; r.stuckT = 0;
      if (!active) return;
      r.x = behind.x - n.x * (2.6 + k * 1.6) + n.x * 3.4;
      r.z = behind.z - n.z * (2.6 + k * 1.6) + n.z * 3.4;
      r.heading = heading;
      r.mesh.position.set(r.x, 0, r.z);
      r.mesh.rotation.y = heading;
    });
    this.ui.raceHUD({ show: true, mode: mode.name, lap: this.lap, laps: this.laps, time: 0, best: null, pos: 1, total: rivals + 1, offTrack: false });
    this.ui.showCountdown('۳');
    this.audio.play('whistle');
    if (this.ctx.music) this.ctx.music.lockTrack('race');
    this.ui.toast('🏁 ' + mode.name + ' — آماده باش!');
  }

  abort(silent) {
    if (this.state === 'idle') return;
    this.state = 'idle';
    this.mode = null;
    for (const r of this.rivals) r.mesh.visible = false;
    this.ui.raceHUD({ show: false });
    this.ui.showCountdown(null);
    if (this.ctx.music) this.ctx.music.lockTrack(null);
    if (!silent) this.ui.toast('مسابقه لغو شد.');
  }

  findNearestIdx(x, z, from) {
    const pts = this.track.pts;
    let best = from, bd = 1e9;
    const N = pts.length;
    for (let k = 0; k < 26; k++) {
      const i = (from + k * 3) % N;
      const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  distToTrack(x, z) {
    const t = this.track;
    let bd = 1e9;
    for (let i = 0; i < t.pts.length; i += 2) {
      const d = (t.pts[i].x - x) ** 2 + (t.pts[i].z - z) ** 2;
      if (d < bd) bd = d;
    }
    return Math.sqrt(bd);
  }

  /* ---------------- آپدیت ---------------- */
  update(dt) {
    if (this.state === 'idle') return;
    const t = this.track;
    if (!t) return;
    const v = this.vehicles.active;
    // شمارش معکوس
    if (this.state === 'countdown') {
      this.countdownT -= dt;
      const n = Math.ceil(this.countdownT - 0.4);
      if (this.countdownT > 0.35) {
        const txt = n <= 0 ? 'برو!' : faNum(n);
        if (this._lastCount !== txt) { this._lastCount = txt; this.ui.showCountdown(txt); this.audio.play('click'); }
      } else {
        this.state = 'racing';
        this.ui.showCountdown(null);
        this.audio.play('whistle');
      }
      if (v) { v.speed = 0; }
      return;
    }
    if (this.state === 'racing') {
      this.totalTime += dt;
      this.lapTime += dt;
      // بازیکن
      if (v) {
        const d = this.distToTrack(v.x, v.z);
        this.offTrack = d > t.halfW + 1.8;
        if (this.offTrack) v.speed *= (1 - dt * 1.4);
        // ایست‌های کنترلی
        const cp = t.checkpoints[this.nextCp];
        if (cp && dist2D(v.x, v.z, cp.x, cp.z) < t.halfW + 3.4) {
          this.nextCp++;
          this.audio.play('click');
          if (this.nextCp >= t.checkpoints.length) {
            this.nextCp = 0;
            this._onLap();
          }
        }
      }
      this._updateRivals(dt);
      // رتبهٔ بازیکن
      this._computePosition();
      const info = {
        show: true, mode: this.mode.name, lap: this.lap, laps: this.laps,
        time: this.lapTime, total: this.totalTime,
        best: this.lapTimes.length ? Math.min(...this.lapTimes) : null,
        pos: this.position, rivals: this.mode.rivals + 1, offTrack: this.offTrack,
        cp: this.nextCp, cps: t.checkpoints.length,
      };
      this.ui.raceHUD(info);
      if (this.laps === 0 && this.offTrack) { /* تمرین آزاد */ }
      if (this.ctx.music && this.ctx.music.track !== 'race') this.ctx.music.lockTrack('race');
    }
  }

  _onLap() {
    this.lapTimes.push(+this.lapTime.toFixed(2));
    const modeId = this.mode.id;
    const prevBest = this.bestLaps[modeId];
    if (prevBest == null || this.lapTime < prevBest) {
      this.bestLaps[modeId] = +this.lapTime.toFixed(2);
      this.ui.toast('⏱ رکورد جدید پیست: ' + faNum(this.lapTime.toFixed(2)) + ' ثانیه!');
      this.audio.play('complete');
    } else {
      this.ui.toast('دور ' + faNum(this.lap) + ' تمام شد — ' + faNum(this.lapTime.toFixed(2)) + ' ثانیه');
    }
    this.lapTime = 0;
    this.lap++;
    if (this.laps > 0 && this.lap > this.laps) this._finish();
  }

  _finish() {
    this.state = 'finished';
    this.audio.play('complete');
    this._computePosition();
    const win = this.position === 1;
    const rewards = { coins: win ? 120 : 60, score: win ? 300 : 150 };
    this.game.addCoins(rewards.coins);
    this.game.addScore(rewards.score);
    if (this.ctx.achievements) {
      this.ctx.achievements.bump('races', 1);
      if (win) this.ctx.achievements.bump('wins', 1);
    }
    if (win) this.wins++;
    const best = this.lapTimes.length ? Math.min(...this.lapTimes) : null;
    this.ui.raceResults({
      mode: this.mode.name,
      pos: this.position,
      total: this.mode.rivals + 1,
      time: this.totalTime,
      best,
      laps: this.lapTimes.slice(),
      rewards,
      win,
    }, () => this.start(this.mode.id), () => this.abort());
    if (this.ctx.onRaceFinish) this.ctx.onRaceFinish({ pos: this.position, mode: this.mode.id, laps: this.lapTimes.length, win });
    if (this.ctx.music) this.ctx.music.lockTrack(null);
    this.game.autosave();
  }

  _updateRivals(dt) {
    const t = this.track;
    const N = t.pts.length;
    const player = this.vehicles.active;
    for (const r of this.rivals) {
      if (!r.mesh.visible || r.finished) continue;
      r.idx = this.findNearestIdx(r.x, r.z, r.idx);
      // نقطهٔ نگاه به جلو
      const look = (r.idx + 5) % N;
      const tp = t.pts[look], tn = t.normals[look];
      const tx = tp.x + tn.x * r.lane, tz = tp.z + tn.z * r.lane;
      const want = Math.atan2(tx - r.x, tz - r.z);
      r.heading = lerpAngle(r.heading, want, Math.min(1, dt * 2.6));
      // سرعت با توجه به پیچ پیش‌رو
      const ahead = t.pts[(r.idx + 11) % N];
      const curve = Math.abs(Math.atan2(ahead.x - tp.x, ahead.z - tp.z) - Math.atan2(tp.x - t.pts[(r.idx + 1) % N].x, tp.z - t.pts[(r.idx + 1) % N].z));
      const target = clamp(20 - curve * 12, 9, 20) * r.skill;
      // کمی انتقام‌گیری رقابتی (کشش)
      let rubber = 1;
      if (player && this.mode && this.mode.rivals > 0) {
        const pd = this.distAlong(player.x, player.z);
        const rd = this.distAlong(r.x, r.z);
        rubber = clamp(1 + (pd - rd) / 900, 0.94, 1.1);
      }
      r.speed += clamp(target * rubber - r.speed, -14 * dt, 11 * dt);
      const fx = Math.sin(r.heading), fz = Math.cos(r.heading);
      r.x += fx * r.speed * dt;
      r.z += fz * r.speed * dt;
      r.mesh.position.set(r.x, 0, r.z);
      r.mesh.rotation.y = r.heading;
      // چرخ‌ها و بدنه
      const wheels = r.mesh.userData.wheels;
      for (const w of wheels) {
        w.mesh.rotation.x += r.speed * dt * 2.4;
        if (w.steer) w.pivot.rotation.y = clamp(Math.atan2(Math.sin(want - r.heading), Math.cos(want - r.heading)), -0.5, 0.5);
      }
      // دور و ایست
      const cp = t.checkpoints[r.nextCp];
      if (cp && dist2D(r.x, r.z, cp.x, cp.z) < t.halfW + 3.4) {
        r.nextCp++;
        if (r.nextCp >= t.checkpoints.length) {
          r.nextCp = 0;
          r.lap++;
          if (this.laps > 0 && r.lap >= this.laps) {
            r.finished = true;
            r.finishTime = this.totalTime;
          }
        }
      }
      // برخورد ساده با بازیکن
      if (player) {
        const d = dist2D(r.x, r.z, player.x, player.z);
        if (d < 2.0 && d > 1e-3) {
          const push = (2.0 - d) / 2;
          r.x += ((r.x - player.x) / d) * push;
          r.z += ((r.z - player.z) / d) * push;
          player.x -= ((r.x - player.x) / d) * push * 0.5;
          player.z -= ((r.z - player.z) / d) * push * 0.5;
        }
      }
    }
  }

  /** فاصلهٔ تقریبی یک نقطه از خط شروع (برای رتبه‌بندی) */
  distAlong(x, z) {
    const t = this.track;
    const i = this.findNearestIdx(x, z, 0);
    return i;
  }

  _computePosition() {
    const v = this.vehicles.active;
    if (!v) return;
    const myCp = (this.lap - 1) * this.track.checkpoints.length + this.nextCp;
    let pos = 1;
    for (const r of this.rivals) {
      if (!r.mesh.visible) continue;
      const his = r.lap * this.track.checkpoints.length + r.nextCp;
      if (his > myCp) pos++;
      else if (his === myCp) {
        const md = dist2D(v.x, v.z, this.track.checkpoints[this.nextCp].x, this.track.checkpoints[this.nextCp].z);
        const rd = dist2D(r.x, r.z, this.track.checkpoints[r.nextCp].x, this.track.checkpoints[r.nextCp].z);
        if (rd < md) pos++;
      }
    }
    this.position = pos;
  }

  info() {
    return {
      state: this.state,
      mode: this.mode ? this.mode.id : null,
      lap: this.lap,
      laps: this.laps,
      time: this.lapTime,
      position: this.position,
    };
  }

  mapPoints() {
    if (this.state === 'idle' || !this.track) return [];
    const cp = this.track.checkpoints[this.nextCp];
    return cp ? [{ x: cp.x, z: cp.z, type: 'cp' }] : [];
  }

  stateForSave() {
    return { bestLaps: { ...this.bestLaps }, races: this.races, wins: this.wins };
  }

  loadState(s) {
    if (!s) return;
    if (s.bestLaps) this.bestLaps = { ...s.bestLaps };
    if (typeof s.races === 'number') this.races = s.races;
    if (typeof s.wins === 'number') this.wins = s.wins;
  }
}

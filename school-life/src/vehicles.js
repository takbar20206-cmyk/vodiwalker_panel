/* ============================================================
   School Life: Open Campus — vehicles.js
   وسایل نقلیه اورجینال: خودروی محوطه، اسکوتر + فیزیک آرکید سبک
   ============================================================ */
import * as THREE from 'three';
import { clamp, resolveCollisions, pointBlocked, dist2D } from './utils.js';
import { BOUNDS, PARKING_SPOTS } from './world.js';

function wheelMesh(r, w, mat) {
  const geo = new THREE.CylinderGeometry(r, r, w, 12);
  geo.rotateZ(Math.PI / 2);
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

function buildCart(color) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const tire = mat(0x22242a);
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.28, 2.9), mat(color));
  body.position.y = 0.6; body.castShadow = true; g.add(body);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.18, 0.7), mat(0x3a3f47));
  seat.position.set(0, 0.85, -0.5); g.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.6, 0.15), mat(0x3a3f47));
  back.position.set(0, 1.15, -0.85); g.add(back);
  const dash = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.4, 0.3), mat(0x2c313a));
  dash.position.set(0, 0.95, 1.1); g.add(dash);
  for (const [px, pz] of [[-0.8, -1.3], [0.8, -1.3], [-0.8, 1.3], [0.8, 1.3]]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.4, 0.09), mat(0x2c313a));
    post.position.set(px, 1.45, pz); g.add(post);
  }
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 3.1), mat(0xf2ede0));
  roof.position.y = 2.2; roof.castShadow = true; g.add(roof);
  for (const sx of [-0.55, 0.55]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.1),
      new THREE.MeshLambertMaterial({ color: 0xfff6d8, emissive: 0xffdf80, emissiveIntensity: 0.6 }));
    lamp.position.set(sx, 0.72, 1.47); g.add(lamp);
  }
  const wheels = [];
  const steers = [];
  for (const [px, pz, front] of [[-0.85, 1.0, true], [0.85, 1.0, true], [-0.85, -1.0, false], [0.85, -1.0, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(px, 0.36, pz);
    const w = wheelMesh(0.36, 0.24, tire);
    pivot.add(w); g.add(pivot);
    wheels.push({ pivot, mesh: w, r: 0.36 });
    if (front) steers.push(pivot);
  }
  return { group: g, wheels, steers };
}

function buildScooter(color) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 1.5), mat(color));
  deck.position.y = 0.35; deck.castShadow = true; g.add(deck);
  const col = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.12), mat(0x2c313a));
  col.position.set(0, 0.8, 0.65); col.rotation.x = 0.25; g.add(col);
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.09), mat(0x2c313a));
  bar.position.set(0, 1.25, 0.55); g.add(bar);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.14, 0.5), mat(0x22242a));
  seat.position.set(0, 0.72, -0.35); g.add(seat);
  const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.35), mat(0xf2ede0));
  box.position.set(0, 0.6, -0.75); g.add(box);
  const wheels = [];
  const front = new THREE.Group(); front.position.set(0, 0.28, 0.72);
  const wf = wheelMesh(0.28, 0.14, mat(0x22242a)); front.add(wf); g.add(front);
  const back = new THREE.Group(); back.position.set(0, 0.28, -0.62);
  const wb = wheelMesh(0.28, 0.16, mat(0x22242a)); back.add(wb); g.add(back);
  wheels.push({ pivot: front, mesh: wf, r: 0.28 }, { pivot: back, mesh: wb, r: 0.28 });
  return { group: g, wheels, steers: [front] };
}

function buildCar(color) {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.62, 4.1), mat(color));
  body.position.y = 0.68; body.castShadow = true; g.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, 2.0), mat(0x22303e));
  cabin.position.set(0, 1.25, -0.2); cabin.castShadow = true; g.add(cabin);
  for (const sx of [-0.6, 0.6]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.12),
      new THREE.MeshLambertMaterial({ color: 0xfff6d8, emissive: 0xffdf80, emissiveIntensity: 0.6 }));
    lamp.position.set(sx, 0.72, 2.07); g.add(lamp);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.1), mat(0xa02323));
    tail.position.set(sx, 0.75, -2.07); g.add(tail);
  }
  const wheels = [];
  const steers = [];
  for (const [px, pz, front] of [[-0.9, 1.35, true], [0.9, 1.35, true], [-0.9, -1.35, false], [0.9, -1.35, false]]) {
    const pivot = new THREE.Group();
    pivot.position.set(px, 0.38, pz);
    const w = wheelMesh(0.38, 0.26, mat(0x22242a));
    pivot.add(w); g.add(pivot);
    wheels.push({ pivot, mesh: w, r: 0.38 });
    if (front) steers.push(pivot);
  }
  return { group: g, wheels, steers };
}

export class VehicleManager {
  constructor(scene, world, audio) {
    this.scene = scene;
    this.world = world;
    this.audio = audio;
    this.list = [];
    this.active = null;
    this._thudCool = 0;
    this._camPos = new THREE.Vector3();
    this._camInit = false;
  }

  _addVehicle(id, name, desc, built, x, z, heading, opts = {}) {
    const v = {
      id, name, desc,
      group: built.group, wheels: built.wheels, steers: built.steers,
      x, z, heading, speed: 0,
      maxSpeed: opts.maxSpeed || 13,
      maxRev: opts.maxRev || 5,
      accel: opts.accel || 9,
      radius: opts.radius || 1.7,
      locked: !!opts.locked,
      steerVis: 0,
    };
    v.group.position.set(x, 0, z);
    v.group.rotation.y = heading;
    this.scene.add(v.group);
    this.list.push(v);
    return v;
  }

  build() {
    this._addVehicle('cart1', 'خودروی محوطه ۱', 'وسیله نقلیه مجاز محوطه', buildCart(0x1f9e8e),
      PARKING_SPOTS.cart1.x, PARKING_SPOTS.cart1.z, 0, { maxSpeed: 13, radius: 1.8 });
    this._addVehicle('cart2', 'خودروی محوطه ۲', 'وسیله نقلیه مجاز محوطه', buildCart(0xe07b39),
      PARKING_SPOTS.cart2.x, PARKING_SPOTS.cart2.z, 0, { maxSpeed: 13, radius: 1.8 });
    this._addVehicle('scooter', 'اسکوتر', 'سریع و چابک', buildScooter(0xd63c3c),
      PARKING_SPOTS.scooter.x, PARKING_SPOTS.scooter.z, 0, { maxSpeed: 16, accel: 12, radius: 1.1 });
    this._addVehicle('teacher', 'خودروی معلم', 'قفل است — مال خانم صادقی!', buildCar(0x27436b),
      PARKING_SPOTS.teacher.x, PARKING_SPOTS.teacher.z, 0, { locked: true, radius: 2.1 });
  }

  byId(id) { return this.list.find((v) => v.id === id); }

  nearest(x, z, maxR = 3.2) {
    let best = null, bd = maxR;
    for (const v of this.list) {
      if (v === this.active) continue;
      const d = dist2D(x, z, v.x, v.z) - v.radius * 0.5;
      if (d < bd) { bd = d; best = v; }
    }
    return best;
  }

  enter(v) {
    this.active = v;
    v.speed = 0;
  }

  exitSpot() {
    const v = this.active;
    if (!v) return null;
    const rx = Math.cos(v.heading), rz = -Math.sin(v.heading);
    const spots = [
      { x: v.x + rx * (v.radius + 0.9), z: v.z + rz * (v.radius + 0.9) },
      { x: v.x - rx * (v.radius + 0.9), z: v.z - rz * (v.radius + 0.9) },
    ];
    for (const s of spots) {
      if (!pointBlocked(s.x, s.z, 0.5, this.world.colliders)) return s;
    }
    return spots[0];
  }

  exit() {
    const s = this.exitSpot();
    this.active = null;
    this.audio.setEngine(false);
    return s;
  }

  /** input رانندگی: {f,b,l,r,brake} */
  update(dt, input) {
    const v = this.active;
    this._thudCool = Math.max(0, this._thudCool - dt);
    if (!v) return;
    const steerIn = (input.l ? 1 : 0) - (input.r ? 1 : 0);

    if (input.f) v.speed += v.accel * dt;
    else if (input.b) v.speed -= (v.speed > 0.6 ? 16 : 7) * dt;
    else {
      // مقاومت هوا + ترمز موتور
      v.speed -= v.speed * 1.1 * dt;
      if (Math.abs(v.speed) < 0.12) v.speed = 0;
    }
    if (input.brake) v.speed -= v.speed * 4.5 * dt;
    v.speed = clamp(v.speed, -v.maxRev, v.maxSpeed);

    const dirSign = v.speed >= 0 ? 1 : -1;
    const spdF = clamp(Math.abs(v.speed) / 4, 0, 1);
    v.heading += steerIn * 2.1 * spdF * dirSign * dt;
    v.steerVis += (steerIn - v.steerVis) * Math.min(1, dt * 8);

    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    // حرکت محوربه‌محور برای سر خوردن کنار دیوار
    let nx = v.x + fx * v.speed * dt;
    let p = { x: nx, z: v.z };
    if (resolveCollisions(p, v.radius * 0.75, this.world.colliders)) {
      this._hit(v);
      nx = p.x;
    }
    let nz = v.z + fz * v.speed * dt;
    p = { x: nx, z: nz };
    if (resolveCollisions(p, v.radius * 0.75, this.world.colliders)) {
      this._hit(v);
      nz = p.z;
    }
    v.x = clamp(nx, -BOUNDS, BOUNDS);
    v.z = clamp(nz, -BOUNDS, BOUNDS);
    v.group.position.set(v.x, 0, v.z);
    v.group.rotation.y = v.heading;

    // چرخ‌ها
    for (const w of v.wheels) w.mesh.rotation.x += (v.speed * dt) / w.r;
    for (const s of v.steers) s.rotation.y = v.steerVis * 0.45;

    this.audio.setEngine(true, clamp(Math.abs(v.speed) / v.maxSpeed, 0, 1));
  }

  _hit(v) {
    if (Math.abs(v.speed) > 5 && this._thudCool <= 0) {
      this._thudCool = 0.4;
      this.audio.play('thud');
      if (this.world.sparkles) this.world.sparkles.spawn(v.x, 0.8, v.z, 0xffcc66, 6, { spread: 2, up: 2, life: 0.5 });
    }
    v.speed *= -0.22;
  }

  updateCamera(dt, camera) {
    const v = this.active;
    if (!v) return;
    const fx = Math.sin(v.heading), fz = Math.cos(v.heading);
    const want = new THREE.Vector3(v.x - fx * 8, 3.6, v.z - fz * 8);
    if (!this._camInit) { this._camPos.copy(want); this._camInit = true; }
    this._camPos.lerp(want, Math.min(1, dt * 5));
    if (this._camPos.y < 0.6) this._camPos.y = 0.6;
    camera.position.copy(this._camPos);
    camera.lookAt(v.x + fx * 4, 1.4, v.z + fz * 4);
  }

  onEnterCamera() { this._camInit = false; }

  mapPoints() {
    return this.list.map((v) => ({ x: v.x, z: v.z, locked: v.locked, active: v === this.active }));
  }

  stateForSave() {
    return this.list.map((v) => ({ id: v.id, x: +v.x.toFixed(2), z: +v.z.toFixed(2), h: +v.heading.toFixed(3) }));
  }

  loadState(arr) {
    if (!Array.isArray(arr)) return;
    for (const s of arr) {
      const v = this.byId(s.id);
      if (v) {
        v.x = s.x; v.z = s.z; v.heading = s.h; v.speed = 0;
        v.group.position.set(v.x, 0, v.z);
        v.group.rotation.y = v.heading;
      }
    }
  }
}

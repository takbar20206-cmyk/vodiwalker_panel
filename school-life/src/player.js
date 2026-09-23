/* ============================================================
   School Life: Open Campus — player.js
   کنترل دانش‌آموز: حرکت سوم‌شخص، دوربین، پرش، انیمیشن
   ============================================================ */
import * as THREE from 'three';
import { clamp, lerpAngle, resolveCollisions } from './utils.js';
import { BOUNDS } from './world.js';

const WALK = 4.2, RUN = 7.2, JUMP_V = 5.4, GRAV = 16;

function buildPlayer() {
  const g = new THREE.Group();
  const mat = (c) => new THREE.MeshLambertMaterial({ color: c });
  const shirt = 0x2f6fed, pants = 0x2b3442, skin = 0xe8b98a;

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.72, 0.34), mat(shirt));
  body.position.y = 1.02; body.castShadow = true; g.add(body);
  // کوله‌پشتی
  const pack = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.55, 0.24), mat(0xe67e22));
  pack.position.set(0, 1.05, -0.28); pack.castShadow = true; g.add(pack);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), mat(skin));
  head.position.y = 1.56; head.castShadow = true; g.add(head);
  // کلاه
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.26, 0.14, 10), mat(0xd63c3c));
  cap.position.y = 1.74; g.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.05, 0.25), mat(0xd63c3c));
  brim.position.set(0, 1.68, 0.3); g.add(brim);

  const legGeo = new THREE.BoxGeometry(0.2, 0.66, 0.24);
  legGeo.translate(0, -0.33, 0);
  const legL = new THREE.Mesh(legGeo, mat(pants));
  legL.position.set(-0.14, 0.66, 0); legL.castShadow = true; g.add(legL);
  const legR = new THREE.Mesh(legGeo, mat(pants));
  legR.position.set(0.14, 0.66, 0); legR.castShadow = true; g.add(legR);

  const armGeo = new THREE.BoxGeometry(0.16, 0.6, 0.2);
  armGeo.translate(0, -0.3, 0);
  const armL = new THREE.Mesh(armGeo, mat(shirt));
  armL.position.set(-0.37, 1.32, 0); g.add(armL);
  const armR = new THREE.Mesh(armGeo, mat(shirt));
  armR.position.set(0.37, 1.32, 0); g.add(armR);

  g.userData.parts = { body, head, legL, legR, armL, armR };
  return g;
}

export class Player {
  constructor(scene) {
    this.scene = scene;
    this.group = buildPlayer();
    scene.add(this.group);
    this.pos = this.group.position;
    this.yaw = Math.PI;
    this.pitch = -0.18;
    this.vy = 0;
    this.grounded = true;
    this.walkPhase = 0;
    this.driving = null;
    this.faceYaw = Math.PI;
    this.speedSm = 0;
    this._camPos = new THREE.Vector3(0, 6, 50);
    this._stepT = 0;
    this.onStep = null;   // صدای قدم
    this.onJump = null;
  }

  spawn(x, z, yaw) {
    this.pos.set(x, 0, z);
    this.yaw = yaw;
    this.faceYaw = yaw;
    this.group.rotation.y = yaw;
    this.vy = 0;
  }

  get x() { return this.pos.x; }
  get z() { return this.pos.z; }

  /** ورودی: {f,b,l,r,sprint,jump,camDX,camDY} */
  update(dt, input, colliders) {
    // چرخش دوربین با موس
    this.yaw -= input.camDX;
    this.pitch = clamp(this.pitch - input.camDY, -1.15, 0.55);

    let dirX = 0, dirZ = 0, moving = false, sprinting = false;
    if (!this.driving) {
      const s = Math.sin(this.yaw), c = Math.cos(this.yaw);
      let ix = 0, iz = 0;
      if (input.f) iz += 1;
      if (input.b) iz -= 1;
      if (input.l) ix -= 1;
      if (input.r) ix += 1;
      if (ix !== 0 || iz !== 0) {
        const len = Math.hypot(ix, iz);
        ix /= len; iz /= len;
        // جلو = جهت نگاه دوربین
        dirX = s * iz + c * ix;
        dirZ = c * iz - s * ix;
        moving = true;
      }
      sprinting = moving && input.sprint;
      const speed = sprinting ? RUN : WALK;
      this.speedSm += ((moving ? speed : 0) - this.speedSm) * Math.min(1, dt * 10);

      if (moving) {
        const step = this.speedSm * dt;
        const p = { x: this.pos.x + dirX * step, z: this.pos.z + dirZ * step };
        resolveCollisions(p, 0.38, colliders);
        this.pos.x = clamp(p.x, -BOUNDS, BOUNDS);
        this.pos.z = clamp(p.z, -BOUNDS, BOUNDS);
        this.faceYaw = Math.atan2(dirX, dirZ);
        // صدای قدم
        this._stepT -= dt * (sprinting ? 1.7 : 1);
        if (this._stepT <= 0 && this.grounded) {
          this._stepT = 0.38;
          if (this.onStep) this.onStep();
        }
      }
      // پرش و گرانش
      if (input.jump && this.grounded) {
        this.vy = JUMP_V;
        this.grounded = false;
        if (this.onJump) this.onJump();
      }
      this.vy -= GRAV * dt;
      this.pos.y += this.vy * dt;
      if (this.pos.y <= 0) {
        this.pos.y = 0; this.vy = 0; this.grounded = true;
      }
      // انیمیشن
      this.group.rotation.y = lerpAngle(this.group.rotation.y, this.faceYaw, dt * 12);
      const P = this.group.userData.parts;
      if (moving && this.grounded) {
        this.walkPhase += dt * (4 + this.speedSm * 1.35);
        const sw = Math.sin(this.walkPhase) * clamp(this.speedSm / WALK, 0.4, 1.3) * 0.6;
        P.legL.rotation.x = sw; P.legR.rotation.x = -sw;
        P.armL.rotation.x = -sw * 0.8; P.armR.rotation.x = sw * 0.8;
        P.body.position.y = 1.02 + Math.abs(Math.cos(this.walkPhase)) * 0.04;
      } else if (!this.grounded) {
        P.legL.rotation.x = 0.35; P.legR.rotation.x = -0.25;
        P.armL.rotation.x = -0.7; P.armR.rotation.x = -0.7;
      } else {
        P.legL.rotation.x *= 0.8; P.legR.rotation.x *= 0.8;
        P.armL.rotation.x *= 0.8; P.armR.rotation.x *= 0.8;
        P.body.position.y = 1.02 + Math.sin(performance.now() * 0.0022) * 0.012;
      }
    }
    return { moving, sprinting, dirX, dirZ, speed: this.speedSm };
  }

  updateCamera(dt, camera, colliders) {
    const dist = 5.4;
    const cp = Math.cos(this.pitch), sp = Math.sin(this.pitch);
    const tx = this.pos.x, ty = this.pos.y + 1.55, tz = this.pos.z;
    const ox = Math.sin(this.yaw) * cp, oz = Math.cos(this.yaw) * cp;
    // نزدیک شدن دوربین در صورت برخورد (چند نمونه‌برداری)
    let d = dist;
    for (let t = 1; t <= 6; t++) {
      const dd = (dist * t) / 6;
      const px = tx + ox * dd, py = ty - sp * dd, pz = tz + oz * dd;
      if (py < 0.35) { d = Math.max(1.2, dd - 0.8); break; }
      let blocked = false;
      for (let i = 0; i < colliders.length; i++) {
        const c = colliders[i];
        if (px > c.x1 - 0.3 && px < c.x2 + 0.3 && pz > c.z1 - 0.3 && pz < c.z2 + 0.3) { blocked = true; break; }
      }
      if (blocked) { d = Math.max(1.2, dd - 0.9); break; }
    }
    const want = new THREE.Vector3(tx + ox * d, Math.max(0.4, ty - sp * d), tz + oz * d);
    this._camPos.lerp(want, Math.min(1, dt * 14));
    camera.position.copy(this._camPos);
    camera.lookAt(tx, ty, tz);
  }
}

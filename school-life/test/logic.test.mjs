/* تست منطق خالص بازی (بدون نیاز به مرورگر/Three.js)
   اجرا: node test/logic.test.mjs */
import {
  clamp, lerp, lerpAngle, faNum, faTime, faDur,
  dist2D, circleHitCollider, resolveCollisions, pointBlocked, inRect,
} from '../src/utils.js';

let pass = 0, fail = 0;
function eq(name, got, want) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (ok) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log('  FAIL ' + name + ' | got=' + JSON.stringify(got) + ' want=' + JSON.stringify(want)); }
}
function approx(name, got, want, eps = 1e-6) {
  const ok = Math.abs(got - want) < eps;
  if (ok) { pass++; console.log('  ok  ' + name); }
  else { fail++; console.log(`  FAIL ${name} | got=${got} want=${want}`); }
}

console.log('== utils ==');
eq('clamp', [clamp(5, 0, 3), clamp(-1, 0, 3), clamp(2, 0, 3)], [3, 0, 2]);
eq('lerp', lerp(0, 10, 0.3), 3);
approx('lerpAngle', lerpAngle(0, Math.PI, 0.5), Math.PI / 2);
eq('faNum', faNum(12345), '۱۲۳۴۵');
eq('faTime', faTime(9.5), '۰۹:۳۰');
eq('faTime midnight', faTime(25.25), '۰۱:۱۵');
eq('faDur', faDur(150), '۲:۳۰');
eq('dist2D', dist2D(0, 0, 3, 4), 5);

console.log('== collision ==');
const box = { x1: 0, z1: 0, x2: 4, z2: 4 };
// بیرون، بدون برخورد
let p = { x: 10, z: 10 };
eq('no hit', circleHitCollider(p, 0.5, box), false);
// برخورد از راست
p = { x: 4.3, z: 2 };
eq('hit right', circleHitCollider(p, 0.5, box), true);
approx('push right x', p.x, 4.5);
// مرکز داخل باکس
p = { x: 1, z: 1 };
eq('hit inside', circleHitCollider(p, 0.5, box), true);
eq('inside pushed out', p.x === 0 - 0.5 || p.z === 0 - 0.5, true); // از نزدیک‌ترین ضلع (x1=0)
// resolveCollisions روی لیست
p = { x: 4.2, z: 4.2 };
eq('resolve list', resolveCollisions(p, 0.5, [box, { x1: 50, z1: 50, x2: 60, z2: 60 }]), true);
// pointBlocked
eq('blocked true', pointBlocked(2, 2, 0, [box]), true);
eq('blocked margin', pointBlocked(4.2, 2, 0.5, [box]), true);
eq('blocked false', pointBlocked(10, 10, 1, [box]), false);
// inRect
eq('inRect', inRect(2, 2, box), true);
eq('inRect out', inRect(5, 5, box), false);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

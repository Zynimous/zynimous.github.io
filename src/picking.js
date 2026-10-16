/* ================= PICKING: terrain ray-march + building / landmark AABBs ================= */
import * as THREE from 'three';
import {ST} from './state.js';
import {BUILDINGS, REGIONS} from './world.js';
import {hAt} from './terrain.js';
import {camera} from './scene.js';

export const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
export function pick(cx, cy){
  ndc.set(cx/ST.Wd*2-1, -(cy/ST.Hd)*2+1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let prev = 0, step = 2.5;
  for (let t = 0; t < 2600; t += step){
    const x = o.x + d.x*t, y = o.y + d.y*t, z = o.z + d.z*t;
    if (y <= hAt(x, z)){
      let lo = prev, hi = t;
      for (let k=0;k<7;k++){ const m = (lo+hi)/2; if (o.y + d.y*m <= hAt(o.x + d.x*m, o.z + d.z*m)) hi = m; else lo = m; }
      const px = o.x + d.x*hi, pz = o.z + d.z*hi;
      return {x:px, z:pz, h:hAt(px, pz)};
    }
    prev = t; if (t > 500) step = 8;
  }
  return null;
}
/** slab test; returns entry distance or -1 */
function aabb(o, d, cx, cy, cz, hx, hy, hz){
  let tmin = 0, tmax = 1e9;
  for (const [oo, dd, c, h] of [[o.x, d.x, cx, hx], [o.y, d.y, cy, hy], [o.z, d.z, cz, hz]]){
    if (Math.abs(dd) < 1e-9){ if (oo < c-h || oo > c+h) return -1; continue; }
    let t1 = (c-h-oo)/dd, t2 = (c+h-oo)/dd; if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) return -1;
  }
  return tmin;
}
/** Returns {b, region, t}: nearest building (or region landmark) under the pointer. */
export function pickObject(cx, cy){
  ndc.set(cx/ST.Wd*2-1, -(cy/ST.Hd)*2+1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let best = null, bt = 1e9;
  for (const b of BUILDINGS){
    if (b === ST.focusB && ST.focusAmt > .5) continue;
    const h = Math.max(b.params.w, b.params.d)*.6, t = aabb(o, d, b.x, (b.base + b.top)/2, b.z, h, b.height/2 + .3, h);
    if (t >= 0 && t < bt){ bt = t; best = {b, t}; }
  }
  for (const r of REGIONS){
    const t = aabb(o, d, r.x, (r.h + r.landmarkTop)/2, r.z, 11, (r.landmarkTop - r.h)/2 + .3, 11);
    if (t >= 0 && t < bt){ bt = t; best = {region:r, t}; }
  }
  return best;
}

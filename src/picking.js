import * as THREE from 'three';
import {ST} from './state.js';
import {ZONES} from './data.js';
import {HALF, hAt} from './terrain.js';
import {camera} from './scene.js';
/* ================= PICKING ================= */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
function pick(cx, cy){
  ndc.set(cx/ST.Wd*2-1, -(cy/ST.Hd)*2+1);
  ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let prev = 0;
  for (let t = 0; t < 1600; t += 2.5){
    const x = o.x + d.x*t, y = o.y + d.y*t, z = o.z + d.z*t;
    if (Math.abs(x) > HALF || Math.abs(z) > HALF){ if (t > 0 && d.y > 0) return null; }
    if (y <= hAt(x, z)){
      let lo = prev, hi = t;
      for (let k=0;k<7;k++){ const m = (lo+hi)/2; if (o.y + d.y*m <= hAt(o.x + d.x*m, o.z + d.z*m)) hi = m; else lo = m; }
      const px = o.x + d.x*hi, pz = o.z + d.z*hi;
      if (Math.abs(px) > HALF || Math.abs(pz) > HALF) return null;
      return {x:px, z:pz, h:hAt(px, pz)};
    }
    prev = t;
  }
  return null;
}
function zoneAt(x, z){ return ZONES.find(zn => Math.hypot(x-zn.x, z-zn.z) < zn.R*1.25) || null; }

export {ray, ndc, pick, zoneAt};

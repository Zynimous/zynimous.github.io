import {ST} from './state.js';
import {reduce} from './core.js';
import {HALF, hAt} from './terrain.js';
import {renderer, camera} from './scene.js';
/* ================= CAMERA STATE ================= */
const smooth = (a, b, x) => { let t = (x-a)/(b-a); t = t<0?0:t>1?1:t; return t*t*(3-2*t); };
const clamp = (v, a, b) => v<a?a:v>b?b:v;
const cam = {x:0, z:12, deff:330, dist:330, elev:.9};
const D_MIN = 55, D_MAX = 440, LIM = HALF - 70;
ST.camTy = hAt(cam.x, cam.z); // focus height: eased only during fly-to, held during free movement
function flyTo(x, z, deff, ms = 850){
  ST.tween = {fx:cam.x, fz:cam.z, fd:cam.deff, tx:x, tz:z, td:clamp(deff, D_MIN, D_MAX), fy:ST.camTy, ty:hAt(x, z), t0:performance.now(), dur: reduce ? 1 : ms};
}
function flyToZone(z){ flyTo(z.x, z.z + z.R*.12, 86); }
function flyWorld(){ flyTo(0, 12, 330); }
const ease = t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

function resize(){
  ST.Wd = innerWidth; ST.Hd = innerHeight;
  renderer.setSize(ST.Wd, ST.Hd, false);
  camera.aspect = ST.Wd/ST.Hd; camera.updateProjectionMatrix();
  ST.narrow = Math.min(1, camera.aspect/1.4);
}
addEventListener('resize', resize); resize();

function updateCamera(){
  cam.dist = cam.deff / ST.narrow;
  cam.elev = 45 * Math.PI/180;
  const ty = ST.camTy;
  camera.position.set(cam.x, ty + cam.dist*Math.sin(cam.elev), cam.z + cam.dist*Math.cos(cam.elev));
  camera.lookAt(cam.x, ty, cam.z);
}

export {smooth, clamp, cam, D_MIN, D_MAX, LIM, flyTo, flyToZone, flyWorld, ease, resize, updateCamera};

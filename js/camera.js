/* ================= CAMERA STATE ================= */
const smooth = (a, b, x) => { let t = (x-a)/(b-a); t = t<0?0:t>1?1:t; return t*t*(3-2*t); };
const clamp = (v, a, b) => v<a?a:v>b?b:v;
const cam = {x:0, z:12, deff:330, dist:330, elev:.9};
const D_MIN = 55, D_MAX = 440, LIM = HALF - 70;
let camTy = hAt(cam.x, cam.z); // focus height: eased only during fly-to, held during free movement
let tween = null, Wd = 1, Hd = 1, narrow = 1;
function flyTo(x, z, deff, ms = 850){
  tween = {fx:cam.x, fz:cam.z, fd:cam.deff, tx:x, tz:z, td:clamp(deff, D_MIN, D_MAX), fy:camTy, ty:hAt(x, z), t0:performance.now(), dur: reduce ? 1 : ms};
}
function flyToZone(z){ flyTo(z.x, z.z + z.R*.12, 86); }
function flyWorld(){ flyTo(0, 12, 330); }
const ease = t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;

function resize(){
  Wd = innerWidth; Hd = innerHeight;
  renderer.setSize(Wd, Hd, false);
  camera.aspect = Wd/Hd; camera.updateProjectionMatrix();
  narrow = Math.min(1, camera.aspect/1.4);
}
addEventListener('resize', resize); resize();

function updateCamera(){
  cam.dist = cam.deff / narrow;
  cam.elev = 45 * Math.PI/180;
  const ty = camTy;
  camera.position.set(cam.x, ty + cam.dist*Math.sin(cam.elev), cam.z + cam.dist*Math.cos(cam.elev));
  camera.lookAt(cam.x, ty, cam.z);
}

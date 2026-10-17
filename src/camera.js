/* ================= CAMERA STATE =================
   Explore pose: orbit-less target + effective distance, elevation tied to distance (camera.elevFar..elevNear in settings).
   Focus pose: low (≈20°) look at one building, composition shifted so it sits in the left ~40% of the screen. */
import {ST} from './state.js';
import {reduce} from './core.js';
import {hAt} from './terrain.js';
import {renderer, camera} from './scene.js';
import {M} from './world.js';
import {S} from './settings.js';

const SC = S.camera, SF = S.focus;

export const smooth = (a, b, x) => { let t = (x-a)/(b-a); t = t<0?0:t>1?1:t; return t*t*(3-2*t); };
export const clamp = (v, a, b) => v<a?a:v>b?b:v;
export const lerp = (a, b, t) => a + (b-a)*t;
export const ease = t => t<.5 ? 4*t*t*t : 1 - Math.pow(-2*t+2, 3)/2;
const WORLD = {x: (M.extent.minX + M.extent.maxX)/2, z: (M.extent.minZ + M.extent.maxZ)/2};
export const WORLD_VIEW = {x: WORLD.x, z: WORLD.z + 10, deff: SC.worldZoom};
export const cam = {x:0, z:0, deff:WORLD_VIEW.deff, dist:WORLD_VIEW.deff, elev:.9};
export const D_MIN = SC.zoomMin, D_MAX = SC.zoomMax, FOCUS_EL = SF.elev*Math.PI/180;
cam.rx = cam.x; cam.rz = cam.z;
ST.camTy = hAt(cam.x, cam.z); // focus height: eased only during fly-to, held during free movement

export function flyTo(x, z, deff, ms = SC.flyMs, y = hAt(x, z)){
  ST.tween = {fx:cam.x, fz:cam.z, fd:cam.deff, tx:x, tz:z, td:clamp(deff, D_MIN, D_MAX), fy:ST.camTy, ty:y, t0:performance.now(), dur: reduce ? 1 : ms};
}
export const REGION_VIEW = SC.regionZoom;
// aim dead-centre at the region's landmark (mid-height), not the ground in front of it
export const flyToRegion = (r, deff = REGION_VIEW) => flyTo(r.x, r.z, deff, SC.flyMs, r.landmarkTop != null ? r.h + (r.landmarkTop - r.h)*.45 : hAt(r.x, r.z));
export const flyWorld = () => flyTo(WORLD_VIEW.x, WORLD_VIEW.z, WORLD_VIEW.deff);
export const flyToBuilding = (b, deff = SC.buildingZoom) => flyTo(b.x, b.z + 4, deff);

export function resize(){
  ST.Wd = innerWidth; ST.Hd = innerHeight;
  renderer.setSize(ST.Wd, ST.Hd, false);
  camera.aspect = ST.Wd/ST.Hd; camera.updateProjectionMatrix();
  ST.narrow = Math.min(1, camera.aspect/1.4);
}
addEventListener('resize', resize); resize();

const exPos = {x:0, y:0, z:0}, exLook = {x:0, y:0, z:0};
export function explorePose(){
  cam.dist = cam.deff / ST.narrow;
  cam.elev = (SC.elevNear - (SC.elevNear - SC.elevFar)*smooth(D_MIN, D_MAX, cam.deff)) * Math.PI/180;
  exLook.x = cam.x; exLook.y = ST.camTy; exLook.z = cam.z;
  exPos.x = cam.x; exPos.y = ST.camTy + cam.dist*Math.sin(cam.elev); exPos.z = cam.z + cam.dist*Math.cos(cam.elev);
  return [exPos, exLook];
}
/** Desired focus target for a building: look point + camera distance that frames it. */
export function focusTargetFor(b){
  const size = Math.max(b.height, b.params.w*1.7, 12);
  return {x:b.x, y:b.base + b.height*SF.lookHeight, z:b.z, dist: (size*SF.frameScale + SF.framePad) / Math.max(.8, ST.narrow)};
}
const fPos = {x:0, y:0, z:0}, fLook = {x:0, y:0, z:0};
export function updateCamera(){
  const [p, l] = explorePose();
  const a = ease(clamp(ST.focusAmt, 0, 1));
  if (a > 0 && ST.focusCur){
    const f = ST.focusCur, az = ST.orbit.az, el = FOCUS_EL + ST.orbit.el;
    fLook.x = f.x; fLook.y = f.y; fLook.z = f.z;
    fPos.x = f.x + f.dist*Math.sin(az)*Math.cos(el); fPos.y = f.y + f.dist*Math.sin(el); fPos.z = f.z + f.dist*Math.cos(az)*Math.cos(el);
    camera.position.set(lerp(p.x, fPos.x, a), lerp(p.y, fPos.y, a), lerp(p.z, fPos.z, a));
    camera.lookAt(lerp(l.x, fLook.x, a), lerp(l.y, fLook.y, a), lerp(l.z, fLook.z, a));
    // building to the left ~40% of the screen (or upper part on phones, panel is a bottom sheet)
    const mobile = ST.Wd < 760;
    camera.setViewOffset(ST.Wd, ST.Hd, mobile ? 0 : a*ST.Wd*SF.offsetX, mobile ? a*ST.Hd*SF.offsetYMobile : 0, ST.Wd, ST.Hd);
  } else {
    camera.position.set(p.x, p.y, p.z); camera.lookAt(l.x, l.y, l.z);
    if (camera.view && camera.view.enabled) camera.clearViewOffset();
  }
  camera.updateMatrixWorld();
}

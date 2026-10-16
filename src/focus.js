/* ================= FOCUS MODE (state only; URL handling lives in router.js) ================= */
import {ST} from './state.js';
import {reduce} from './core.js';
import {cam, focusTargetFor} from './camera.js';
import {gatePoint} from './buildings.js';
import {setHover} from './buildings.js';
import {openPanel, closePanel} from './panel.js';
import {stopTour} from './tour.js';

ST.focusWant = 0; ST.exiting = null;
export function enterFocus(b, instant = false){
  stopTour(); setHover(-9); ST.hoverB = null;
  if (!ST.focusWant && ST.focusAmt < .01) ST.saved = {x: cam.rx ?? cam.x, z: cam.rz ?? cam.z, deff: cam.deff, camTy: ST.camTy};
  if (!ST.focusB || ST.focusAmt < .01){ ST.focusCur = {...focusTargetFor(b)}; ST.orbit.az = 0; ST.orbit.el = 0; }
  ST.focusB = b; ST.focusWant = 1; ST.tween = null; ST.exiting = null;
  openPanel(b);
  if (instant || reduce){ ST.focusAmt = 1; ST.focusCur = {...focusTargetFor(b)}; }
}
export function exitFocus(){
  if (!ST.focusWant) return;
  ST.focusWant = 0; ST.exiting = null; closePanel();
}

/** Camera goal while focused: the building, or (during 出境) the gate of a flagship. */
export function focusGoal(){
  if (ST.exiting){ const g = gatePoint(ST.exiting.b); return {x:g.x, y:g.y, z:g.z, dist:5}; }
  return focusTargetFor(ST.focusB);
}
/** 出境: fly through the gate, fade to black, then leave for the product site. */
export function startExit(b){
  if (!b.site) return;
  if (reduce){ location.assign(b.site); return; }
  ST.exiting = {b, t0: performance.now()};
  setTimeout(() => document.getElementById('fade').classList.add('on'), 900);
  setTimeout(() => location.assign(b.site), 1700);
  setTimeout(() => { ST.exiting = null; document.getElementById('fade').classList.remove('on'); }, 4000); // bfcache / back button
}

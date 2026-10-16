/* ================= INPUT ================= */
import {ST} from './state.js';
import {$} from './core.js';
import {REGIONS} from './world.js';
import {canvas, FOV} from './scene.js';
import {cam, clamp, D_MIN, D_MAX, flyToRegion, flyWorld} from './camera.js';
import {pick, pickObject} from './picking.js';
import {stopTour, toggleTour} from './tour.js';
import {openPalette, closePalette, palEl} from './palette.js';
import {navigate, stepFocus, leaveFocus} from './router.js';

export const keys = new Set();
export function userInput(){ ST.tween = null; stopTour(); }
const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.isContentEditable);
const reading = () => document.body.classList.contains('reading');

addEventListener('keydown', e => {
  if (typing(e)) return;
  const k = e.key;
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'k'){ e.preventDefault(); openPalette(); return; }
  if (k === '/'){ e.preventDefault(); openPalette(); return; }
  if (k === 'Escape'){
    if (!palEl.hidden) return closePalette();
    if (reading()) return leaveFocus();
    stopTour(); navigate('/', 'push'); flyWorld(); return;
  }
  if (reading()){
    if (k === 'ArrowRight' || k === 'ArrowLeft'){ e.preventDefault(); stepFocus(k === 'ArrowRight' ? 1 : -1); }
    return;
  }
  if (/^[1-9]$/.test(k)){ const r = REGIONS[+k - 1]; if (r){ stopTour(); navigate(r.path, 'push'); } return; }
  if (k === '0'){ stopTour(); navigate('/', 'push'); flyWorld(); return; }
  if (k === 't' || k === 'T'){ toggleTour(); return; }
  if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Equal','Minus'].includes(e.code)){
    e.preventDefault(); keys.add(e.code); userInput();
  }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const ptrs = new Map(); let pinch = null;
const ptrDist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x-b.x, a.y-b.y); };
function pan(dx, dy){
  const upp = 2*cam.dist*Math.tan(FOV*Math.PI/360)/ST.Hd;
  cam.rx -= dx*upp; cam.rz -= dy*upp/Math.sin(cam.elev);
}
function orbit(dx, dy){
  ST.orbit.az = clamp(ST.orbit.az - dx*.005, -.9, .9);
  ST.orbit.el = clamp(ST.orbit.el + dy*.002, -.08, .22);
}
canvas.addEventListener('pointerdown', e => {
  canvas.focus({preventScroll:true});
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (ptrs.size === 1){ ST.drag = {moved:0, t:performance.now()}; canvas.classList.add('dragging'); }
  else if (ptrs.size === 2){ pinch = {d:ptrDist(), deff:cam.deff}; ST.drag = null; }
  if (!ST.focusWant) userInput();
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse'){ ST.mouse = {x:e.clientX, y:e.clientY}; ST.mouseDirty = true; }
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1 && ST.drag){ ST.drag.moved += Math.abs(dx) + Math.abs(dy); if (ST.focusWant) orbit(dx, dy); else pan(dx, dy); }
  else if (ptrs.size === 2 && pinch && !ST.focusWant){ cam.deff = clamp(pinch.deff * pinch.d / Math.max(ptrDist(), 1), D_MIN, D_MAX); }
});
function endPtr(e){
  if (ST.drag && ptrs.size === 1 && ST.drag.moved < 6 && performance.now() - ST.drag.t < 500){
    if (ST.focusWant){ leaveFocus(); }
    else {
      const hit = pickObject(e.clientX, e.clientY);
      if (hit?.b) navigate(hit.b.path, 'push');
      else if (hit?.region) navigate(hit.region.path, 'push');
    }
  }
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (ptrs.size === 0){ ST.drag = null; canvas.classList.remove('dragging'); }
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse'){ ST.mouse = null; ST.cursorPt = null; } });
canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (ST.focusWant){ ST.orbit.az = clamp(ST.orbit.az + e.deltaY*.0006, -.9, .9); return; }
  userInput();
  const f = Math.exp(clamp(e.deltaY, -120, 120) * 0.0016);
  const nd = clamp(cam.deff * f, D_MIN, D_MAX);
  const p = pick(e.clientX, e.clientY);
  if (p){ const k = 1 - nd/cam.deff; cam.rx += (p.x - cam.x)*k; cam.rz += (p.z - cam.z)*k; }
  cam.deff = nd;
}, {passive:false});

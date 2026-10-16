/* ================= INPUT ================= */
const keys = new Set();
let mouse = null, mouseDirty = false, cursorPt = null, hoverZone = null, cursorZone = null;
function userInput(){ tween = null; stopTour(); }
const typing = e => e.target && (e.target.tagName === 'INPUT' || e.target.isContentEditable);

addEventListener('keydown', e => {
  if (typing(e)) return;
  const k = e.key;
  if ((e.ctrlKey || e.metaKey) && k.toLowerCase() === 'k'){ e.preventDefault(); openPalette(); return; }
  if (k === '/'){ e.preventDefault(); openPalette(); return; }
  if (k === 'Escape'){
    if (!palEl.hidden) return closePalette();
    if (document.body.classList.contains('reading')) return closeIntel();
    stopTour(); flyWorld(); return;
  }
  if (document.body.classList.contains('reading')){
    if (k === 'ArrowRight' || k === 'ArrowLeft'){ e.preventDefault(); stepIntel(k === 'ArrowRight' ? 1 : -1); }
    return;
  }
  if (/^[1-4]$/.test(k)){ const z = ZONES.find(zz => zz.key === k); stopTour(); flyToZone(z); return; }
  if (k === '0'){ stopTour(); flyWorld(); return; }
  if (k === 't' || k === 'T'){ toggleTour(); return; }
  if (['KeyW','KeyA','KeyS','KeyD','KeyQ','KeyE','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Equal','Minus'].includes(e.code)){
    e.preventDefault(); keys.add(e.code); userInput();
  }
});
addEventListener('keyup', e => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

const ptrs = new Map(); let drag = null, pinch = null;
const ptrDist = () => { const [a, b] = [...ptrs.values()]; return Math.hypot(a.x-b.x, a.y-b.y); };
function pan(dx, dy){
  const upp = 2*cam.dist*Math.tan(FOV*Math.PI/360)/Hd;
  cam.x -= dx*upp; cam.z -= dy*upp/Math.sin(cam.elev);
}
canvas.addEventListener('pointerdown', e => {
  canvas.focus({preventScroll:true});
  canvas.setPointerCapture(e.pointerId);
  ptrs.set(e.pointerId, {x:e.clientX, y:e.clientY});
  if (ptrs.size === 1){ drag = {moved:0, t:performance.now()}; canvas.classList.add('dragging'); }
  else if (ptrs.size === 2){ pinch = {d:ptrDist(), deff:cam.deff}; drag = null; }
  userInput();
});
canvas.addEventListener('pointermove', e => {
  if (e.pointerType === 'mouse'){ mouse = {x:e.clientX, y:e.clientY}; mouseDirty = true; }
  const p = ptrs.get(e.pointerId); if (!p) return;
  const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
  if (ptrs.size === 1 && drag){ drag.moved += Math.abs(dx) + Math.abs(dy); pan(dx, dy); }
  else if (ptrs.size === 2 && pinch){ cam.deff = clamp(pinch.deff * pinch.d / Math.max(ptrDist(), 1), D_MIN, D_MAX); }
});
function endPtr(e){
  if (drag && ptrs.size === 1 && drag.moved < 6 && performance.now() - drag.t < 500){
    const p = pick(e.clientX, e.clientY);
    if (p){ const z = zoneAt(p.x, p.z); if (z) flyToZone(z); }
  }
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (ptrs.size === 0){ drag = null; canvas.classList.remove('dragging'); }
}
canvas.addEventListener('pointerup', endPtr);
canvas.addEventListener('pointercancel', endPtr);
canvas.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse'){ mouse = null; cursorPt = null; } });
canvas.addEventListener('wheel', e => {
  e.preventDefault(); userInput();
  const f = Math.exp(clamp(e.deltaY, -120, 120) * 0.0016);
  const nd = clamp(cam.deff * f, D_MIN, D_MAX);
  const p = pick(e.clientX, e.clientY);
  if (p){ const k = 1 - nd/cam.deff; cam.x += (p.x - cam.x)*k; cam.z += (p.z - cam.z)*k; }
  cam.deff = nd;
}, {passive:false});

import * as THREE from 'three';
import {ST} from './state.js';
import {$} from './core.js';
import {ZONES, ZMAP} from './data.js';
import {N, hAt, meters, gridRef} from './terrain.js';
import {canvas, renderer, scene, FOV, camera, terrainUniforms, dashMats} from './scene.js';
import {labels} from './labels.js';
import {smooth, clamp, cam, D_MIN, D_MAX, LIM, flyToZone, flyWorld, ease, updateCamera} from './camera.js';
import {pick, zoneAt} from './picking.js';
import {keys} from './input.js';
import {renderCrumbs, drawMini} from './hud.js';
import {TOUR, stopTour, updTour} from './tour.js';
/* ================= LOOP ================= */
ST.last = performance.now();
const tmp = new THREE.Vector3();
function frame(now){
  const dt = Math.min((now - ST.last)/1000, .05); ST.last = now; ST.time += dt;

  // keyboard
  if (keys.size){
    const sp = cam.deff * 1.0 * dt;
    if (keys.has('KeyW') || keys.has('ArrowUp')) cam.z -= sp;
    if (keys.has('KeyS') || keys.has('ArrowDown')) cam.z += sp;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) cam.x -= sp;
    if (keys.has('KeyD') || keys.has('ArrowRight')) cam.x += sp;
    if (keys.has('KeyQ') || keys.has('Minus')) cam.deff = clamp(cam.deff * Math.exp(dt*1.3), D_MIN, D_MAX);
    if (keys.has('KeyE') || keys.has('Equal')) cam.deff = clamp(cam.deff * Math.exp(-dt*1.3), D_MIN, D_MAX);
  }
  // ST.tween
  if (ST.tween){
    const t = clamp((now - ST.tween.t0)/ST.tween.dur, 0, 1), e = ease(t);
    cam.x = ST.tween.fx + (ST.tween.tx - ST.tween.fx)*e; cam.z = ST.tween.fz + (ST.tween.tz - ST.tween.fz)*e;
    ST.camTy = ST.tween.fy + (ST.tween.ty - ST.tween.fy)*e;
    cam.deff = Math.exp(Math.log(ST.tween.fd) + (Math.log(ST.tween.td) - Math.log(ST.tween.fd))*e);
    if (t >= 1) ST.tween = null;
  }
  // soft bounds
  if (!ST.drag){
    if (Math.abs(cam.x) > LIM) cam.x += (Math.sign(cam.x)*LIM - cam.x) * Math.min(1, dt*6);
    if (Math.abs(cam.z) > LIM) cam.z += (Math.sign(cam.z)*LIM - cam.z) * Math.min(1, dt*6);
  }
  cam.x = clamp(cam.x, -LIM-60, LIM+60); cam.z = clamp(cam.z, -LIM-60, LIM+60);
  updateCamera();

  // ST.tour
  if (ST.tour && !ST.tween){
    ST.tour.wait += dt;
    if (ST.tour.wait > 2.8){
      ST.tour.wait = 0; ST.tour.i++;
      if (ST.tour.i >= TOUR.length){ stopTour(); flyWorld(); }
      else { flyToZone(ZMAP[TOUR[ST.tour.i]]); updTour(); }
    }
  }

  // semantic zoom detail
  let best = null, bestD = .5;
  ZONES.forEach(z => {
    const d = Math.hypot(cam.x - z.x, cam.z - z.z);
    z.detail = smooth(175, 118, cam.deff) * (1 - smooth(z.R*1.1, z.R*2.6, d));
    z.detailMat.opacity = z.detail * .75;
    z.spokeMat.uniforms.uOpacity.value = z.detail * .55;
    z.wallMat.opacity = .7 + z.detail*.3;
    if (z.detail > bestD){ bestD = z.detail; best = z; }
  });
  if (best !== ST.activeZone){
    ST.activeZone = best;
    ZONES.forEach(z => z.secBtn.classList.toggle('on', z === ST.activeZone));
    if (!ST.curItem){ try { history.replaceState(null, '', '#' + (ST.activeZone ? ST.activeZone.id : '')); } catch(_){} }
  }
  renderCrumbs(ST.activeZone || (ST.curItem && ZMAP[ST.curItem.zone]), ST.curItem);

  // cursor
  if (ST.mouse && ST.mouseDirty){ ST.cursorPt = pick(ST.mouse.x, ST.mouse.y); ST.mouseDirty = false; ST.cursorZone = ST.cursorPt ? zoneAt(ST.cursorPt.x, ST.cursorPt.z) : null; canvas.style.cursor = ST.drag ? '' : (ST.cursorZone ? 'pointer' : ''); }
  if (!ST.mouse){ ST.cursorZone = null; }
  const u = terrainUniforms;
  u.uZoom.value = cam.deff;
  if (ST.cursorPt){ u.uCursor.value.set(ST.cursorPt.x, ST.cursorPt.z); u.uCursorOn.value += (1 - u.uCursorOn.value)*Math.min(1, dt*6); }
  else u.uCursorOn.value += (0 - u.uCursorOn.value)*Math.min(1, dt*4);
  const fz = ST.hoverZone || ST.cursorZone || ST.activeZone;
  if (fz){ u.uFocus.value.set(fz.x, fz.z); }
  const fTarget = (ST.hoverZone || ST.cursorZone) ? 1 : (ST.activeZone ? .45 : 0);
  u.uFocusAmt.value += (fTarget - u.uFocusAmt.value)*Math.min(1, dt*5);
  if (u.uIntro.value < 1.2) u.uIntro.value = Math.min(1.2, u.uIntro.value + dt*.75);

  dashMats.forEach(m => m.uniforms.uTime.value = ST.time);
  renderer.render(scene, camera);

  // labels
  for (const L of labels){
    const a = L.alpha();
    if (a < .02){ if (L.vis){ L.el.style.visibility = 'hidden'; L.vis = false; } continue; }
    tmp.copy(L.pos).project(camera);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.25 || Math.abs(tmp.y) > 1.25){ if (L.vis){ L.el.style.visibility = 'hidden'; L.vis = false; } continue; }
    if (!L.vis){ L.el.style.visibility = 'visible'; L.vis = true; }
    const x = (tmp.x*.5 + .5)*ST.Wd, y = (-tmp.y*.5 + .5)*ST.Hd;
    L.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    L.el.style.opacity = a.toFixed(3);
    L.el.style.zIndex = String(5000 - Math.round(camera.position.distanceTo(L.pos)));
    if (L.card) L.card.style.pointerEvents = a > .5 ? 'auto' : 'none';
  }

  // readouts
  $('r-tgt').textContent = `E ${gridRef(cam.x)} · N ${gridRef(-cam.z)}`;
  if (ST.cursorPt){ $('r-cur').textContent = `E ${gridRef(ST.cursorPt.x)} · N ${gridRef(-ST.cursorPt.z)}`; $('r-elev').textContent = meters(ST.ST.cursorPt.h) + ' m'; }
  else { $('r-cur').textContent = '—'; $('r-elev').textContent = meters(hAt(cam.x, cam.z)) + ' m'; }
  $('r-alt').textContent = (Math.round(camera.position.y*10 + 120)).toLocaleString('en-US') + ' m';
  const upp = 2*cam.dist*Math.tan(FOV*Math.PI/360)/ST.Hd * 10; // meters per px
  const want = upp*90, p10 = Math.pow(10, Math.floor(Math.log10(want)));
  const nice = [1,2,5,10].map(m => m*p10).find(v => v >= want*.6) || p10*10;
  $('scale-bar').style.width = (nice/upp).toFixed(0) + 'px';
  $('scale-txt').textContent = nice >= 1000 ? (nice/1000) + ' km' : nice + ' m';

  drawMini();
  requestAnimationFrame(frame);
}

export {tmp, frame};

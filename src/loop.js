/* ================= LOOP ================= */
import {ST} from './state.js';
import {$, reduce} from './core.js';
import {REGIONS, RMAP, regionAt, nearestRegion, limitToReach} from './world.js';
import {hAt, meters, gridRef} from './terrain.js';
import {camera, FOV, terrainUniforms, dashMats, updateTerrain} from './scene.js';
import {clamp, cam, D_MIN, D_MAX, flyToRegion, flyWorld, updateCamera, lerp, ease} from './camera.js';
import {pick, pickObject} from './picking.js';
import {keys} from './input.js';
import {renderCrumbs, drawMini} from './hud.js';
import {TOUR, stopTour, updTour} from './tour.js';
import {setHover, buildingMats} from './buildings.js';
import {focusGoal} from './focus.js';
import {render} from './render.js';
import {updateSignage} from './signage.js';
import {updateTrain} from './trainlabel.js';
import {syncRegionUrl} from './router.js';

ST.last = performance.now();
export function frame(now){
  const dt = Math.min((now - ST.last)/1000, .05); ST.last = now; ST.time += dt;
  const focusing = !!ST.focusWant;

  // keyboard
  if (keys.size && !focusing){
    const sp = cam.deff * 1.0 * dt;
    if (keys.has('KeyW') || keys.has('ArrowUp')) cam.rz -= sp;
    if (keys.has('KeyS') || keys.has('ArrowDown')) cam.rz += sp;
    if (keys.has('KeyA') || keys.has('ArrowLeft')) cam.rx -= sp;
    if (keys.has('KeyD') || keys.has('ArrowRight')) cam.rx += sp;
    if (keys.has('KeyQ') || keys.has('Minus')) cam.deff = clamp(cam.deff * Math.exp(dt*1.3), D_MIN, D_MAX);
    if (keys.has('KeyE') || keys.has('Equal')) cam.deff = clamp(cam.deff * Math.exp(-dt*1.3), D_MIN, D_MAX);
  }
  // tween
  if (ST.tween){
    const tw = ST.tween, t = clamp((now - tw.t0)/tw.dur, 0, 1), e = ease(t);
    cam.rx = tw.fx + (tw.tx - tw.fx)*e; cam.rz = tw.fz + (tw.tz - tw.fz)*e;
    ST.camTy = tw.fy + (tw.ty - tw.fy)*e;
    cam.deff = Math.exp(Math.log(tw.fd) + (Math.log(tw.td) - Math.log(tw.fd))*e);
    if (t >= 1) ST.tween = null;
  }
  // reach limit: rubber band past the outermost borders, spring back on release
  if (!focusing){
    let L = limitToReach(cam.rx, cam.rz);
    if (L.over > 260){ const k = 260/L.over; cam.rx = L.lx + (cam.rx - L.lx)*k; cam.rz = L.lz + (cam.rz - L.lz)*k; L = limitToReach(cam.rx, cam.rz); }
    if (!ST.drag && !keys.size && !ST.tween && L.over > .01){
      const k = reduce ? 1 : Math.min(1, dt*5);
      cam.rx += (L.lx - cam.rx)*k; cam.rz += (L.lz - cam.rz)*k; L = limitToReach(cam.rx, cam.rz);
    }
    cam.x = L.x; cam.z = L.z;
  }
  // focus blend + glide between buildings
  const rate = reduce ? 99 : 1/.95;
  if (focusing){ ST.focusAmt = Math.min(1, ST.focusAmt + dt*rate); }
  else if (ST.focusAmt > 0){
    ST.focusAmt = Math.max(0, ST.focusAmt - dt*rate);
    if (ST.focusAmt === 0){ ST.focusB = null; ST.focusCur = null; }
  }
  if (ST.focusB && ST.focusCur){
    const g = focusGoal(), k = reduce ? 1 : 1 - Math.exp(-dt*(ST.exiting ? 2.6 : 4.5));
    ST.focusCur.x = lerp(ST.focusCur.x, g.x, k); ST.focusCur.y = lerp(ST.focusCur.y, g.y, k);
    ST.focusCur.z = lerp(ST.focusCur.z, g.z, k); ST.focusCur.dist = lerp(ST.focusCur.dist, g.dist, k);
  }
  updateCamera();
  updateTerrain(cam.x, cam.z);

  // tour
  if (ST.tour && !ST.tween){
    ST.tour.wait += dt;
    if (ST.tour.wait > 2.8){
      ST.tour.wait = 0; ST.tour.i++;
      if (ST.tour.i >= TOUR.length){ stopTour(); flyWorld(); }
      else { flyToRegion(TOUR[ST.tour.i]); updTour(); }
    }
  }

  // active region (nearest centre to the look target)
  const active = focusing && ST.focusB ? RMAP[ST.focusB.region] : nearestRegion(cam.x, cam.z);
  if (active !== ST.activeRegion){
    ST.activeRegion = active;
    REGIONS.forEach(r => r.secBtn.classList.toggle('on', r === active));
    syncRegionUrl(active);
  }
  renderCrumbs(ST.focusB ? RMAP[ST.focusB.region] : ST.activeRegion, ST.focusB);

  // cursor: terrain point + building/landmark under the pointer
  if (ST.mouse && ST.mouseDirty && !focusing){
    ST.cursorPt = pick(ST.mouse.x, ST.mouse.y); ST.mouseDirty = false;
    const hit = pickObject(ST.mouse.x, ST.mouse.y);
    ST.hoverB = hit?.b || (ST.hoverB && ST.hoverB.tag?.card.matches(':hover') ? ST.hoverB : null);
    ST.cursorRegion = hit?.region || (ST.cursorPt ? regionAt(ST.cursorPt.x, ST.cursorPt.z) : null);
    setHover(hit?.b ? hit.b.index : hit?.region ? -2 - hit.region.index : -9);
    $('scene').style.cursor = ST.drag ? '' : (hit ? 'pointer' : '');
  }
  if (!ST.mouse){ ST.cursorRegion = null; if (!ST.hoverB) setHover(-9); }
  if (focusing) setHover(-9);
  const u = terrainUniforms;
  u.uZoom.value = cam.deff;
  if (ST.cursorPt && !focusing){ u.uCursor.value.set(ST.cursorPt.x, ST.cursorPt.z); u.uCursorOn.value += (1 - u.uCursorOn.value)*Math.min(1, dt*6); }
  else u.uCursorOn.value += (0 - u.uCursorOn.value)*Math.min(1, dt*4);
  const fz = ST.hoverRegion || ST.cursorRegion || ST.activeRegion;
  if (fz) u.uFocus.value.set(fz.x, fz.z);
  const fTarget = (ST.hoverRegion || (ST.cursorRegion && ST.mouse)) ? 1 : (ST.activeRegion ? .45 : 0);
  u.uFocusAmt.value += (fTarget - u.uFocusAmt.value)*Math.min(1, dt*5);
  if (u.uIntro.value < 1.6) u.uIntro.value = Math.min(1.6, u.uIntro.value + dt*.75);

  dashMats.forEach(m => m.uniforms.uTime.value = ST.time);
  buildingMats.edgeMat.uniforms.uTime.value = ST.time;
  render();

  updateSignage();
  updateTrain(dt);

  // readouts
  $('r-tgt').textContent = `E ${gridRef(cam.x)} · N ${gridRef(-cam.z)}`;
  if (ST.cursorPt){ $('r-cur').textContent = `E ${gridRef(ST.cursorPt.x)} · N ${gridRef(-ST.cursorPt.z)}`; $('r-elev').textContent = meters(ST.cursorPt.h) + ' m'; }
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

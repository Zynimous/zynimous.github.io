/* ================= LOOP ================= */
let last = performance.now(), activeZone = null, time = 0;
const tmp = new THREE.Vector3();
function frame(now){
  const dt = Math.min((now - last)/1000, .05); last = now; time += dt;

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
  // tween
  if (tween){
    const t = clamp((now - tween.t0)/tween.dur, 0, 1), e = ease(t);
    cam.x = tween.fx + (tween.tx - tween.fx)*e; cam.z = tween.fz + (tween.tz - tween.fz)*e;
    camTy = tween.fy + (tween.ty - tween.fy)*e;
    cam.deff = Math.exp(Math.log(tween.fd) + (Math.log(tween.td) - Math.log(tween.fd))*e);
    if (t >= 1) tween = null;
  }
  // soft bounds
  if (!drag){
    if (Math.abs(cam.x) > LIM) cam.x += (Math.sign(cam.x)*LIM - cam.x) * Math.min(1, dt*6);
    if (Math.abs(cam.z) > LIM) cam.z += (Math.sign(cam.z)*LIM - cam.z) * Math.min(1, dt*6);
  }
  cam.x = clamp(cam.x, -LIM-60, LIM+60); cam.z = clamp(cam.z, -LIM-60, LIM+60);
  updateCamera();

  // tour
  if (tour && !tween){
    tour.wait += dt;
    if (tour.wait > 2.8){
      tour.wait = 0; tour.i++;
      if (tour.i >= TOUR.length){ stopTour(); flyWorld(); }
      else { flyToZone(ZMAP[TOUR[tour.i]]); updTour(); }
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
  if (best !== activeZone){
    activeZone = best;
    ZONES.forEach(z => z.secBtn.classList.toggle('on', z === activeZone));
    if (!curItem){ try { history.replaceState(null, '', '#' + (activeZone ? activeZone.id : '')); } catch(_){} }
  }
  renderCrumbs(activeZone || (curItem && ZMAP[curItem.zone]), curItem);

  // cursor
  if (mouse && mouseDirty){ cursorPt = pick(mouse.x, mouse.y); mouseDirty = false; cursorZone = cursorPt ? zoneAt(cursorPt.x, cursorPt.z) : null; canvas.style.cursor = drag ? '' : (cursorZone ? 'pointer' : ''); }
  if (!mouse){ cursorZone = null; }
  const u = terrainUniforms;
  u.uZoom.value = cam.deff;
  if (cursorPt){ u.uCursor.value.set(cursorPt.x, cursorPt.z); u.uCursorOn.value += (1 - u.uCursorOn.value)*Math.min(1, dt*6); }
  else u.uCursorOn.value += (0 - u.uCursorOn.value)*Math.min(1, dt*4);
  const fz = hoverZone || cursorZone || activeZone;
  if (fz){ u.uFocus.value.set(fz.x, fz.z); }
  const fTarget = (hoverZone || cursorZone) ? 1 : (activeZone ? .45 : 0);
  u.uFocusAmt.value += (fTarget - u.uFocusAmt.value)*Math.min(1, dt*5);
  if (u.uIntro.value < 1.2) u.uIntro.value = Math.min(1.2, u.uIntro.value + dt*.75);

  dashMats.forEach(m => m.uniforms.uTime.value = time);
  renderer.render(scene, camera);

  // labels
  for (const L of labels){
    const a = L.alpha();
    if (a < .02){ if (L.vis){ L.el.style.visibility = 'hidden'; L.vis = false; } continue; }
    tmp.copy(L.pos).project(camera);
    if (tmp.z > 1 || Math.abs(tmp.x) > 1.25 || Math.abs(tmp.y) > 1.25){ if (L.vis){ L.el.style.visibility = 'hidden'; L.vis = false; } continue; }
    if (!L.vis){ L.el.style.visibility = 'visible'; L.vis = true; }
    const x = (tmp.x*.5 + .5)*Wd, y = (-tmp.y*.5 + .5)*Hd;
    L.el.style.transform = `translate3d(${x.toFixed(1)}px,${y.toFixed(1)}px,0)`;
    L.el.style.opacity = a.toFixed(3);
    L.el.style.zIndex = String(5000 - Math.round(camera.position.distanceTo(L.pos)));
    if (L.card) L.card.style.pointerEvents = a > .5 ? 'auto' : 'none';
  }

  // readouts
  $('r-tgt').textContent = `E ${gridRef(cam.x)} · N ${gridRef(-cam.z)}`;
  if (cursorPt){ $('r-cur').textContent = `E ${gridRef(cursorPt.x)} · N ${gridRef(-cursorPt.z)}`; $('r-elev').textContent = meters(cursorPt.h) + ' m'; }
  else { $('r-cur').textContent = '—'; $('r-elev').textContent = meters(hAt(cam.x, cam.z)) + ' m'; }
  $('r-alt').textContent = (Math.round(camera.position.y*10 + 120)).toLocaleString('en-US') + ' m';
  const upp = 2*cam.dist*Math.tan(FOV*Math.PI/360)/Hd * 10; // meters per px
  const want = upp*90, p10 = Math.pow(10, Math.floor(Math.log10(want)));
  const nice = [1,2,5,10].map(m => m*p10).find(v => v >= want*.6) || p10*10;
  $('scale-bar').style.width = (nice/upp).toFixed(0) + 'px';
  $('scale-txt').textContent = nice >= 1000 ? (nice/1000) + ' km' : nice + ' m';

  drawMini();
  requestAnimationFrame(frame);
}

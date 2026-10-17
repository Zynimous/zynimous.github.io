/* ================= TRAIN LABEL: rides along the region border nearest the screen centre ================= */
import * as THREE from 'three';
import {ST} from './state.js';
import {$, reduce, esc} from './core.js';
import {RMAP} from './world.js';
import {hAt} from './terrain.js';
import {camera} from './scene.js';
import {cam, smooth, labelScale} from './camera.js';
import {borderLines} from './borders.js';
import {nearestRegion} from './world.js';

const el = $('train'), rowTop = el.querySelector('.t-top'), rowBot = el.querySelector('.t-bot');
// the flash class must not outlive its animation: otherwise any later move of `.me` to another row/border replays it
el.addEventListener('animationend', () => el.classList.remove('flash'));
const v = new THREE.Vector3();
let cur = -1, s = 0, curRegion = null, shownKey = '', flashT = 0, lastFlipLayout = '';
const MARGIN = 26; // world units kept clear of the visible segment ends

function proj(x, z, out){
  v.set(x, hAt(x, z) + .6, z).project(camera);
  out.x = (v.x*.5 + .5)*ST.Wd; out.y = (-v.y*.5 + .5)*ST.Hd; out.ok = v.z < 1 && v.z > -1; return out;
}
const P0 = {}, P1 = {};
function pointAt(B, sArc){
  let i = 1; while (i < B.cum.length - 1 && B.cum[i] < sArc) i++;
  const k = (sArc - B.cum[i-1]) / (B.cum[i] - B.cum[i-1] || 1);
  return [B.pts[i-1][0] + (B.pts[i][0] - B.pts[i-1][0])*k, B.pts[i-1][1] + (B.pts[i][1] - B.pts[i-1][1])*k];
}

export function updateTrain(dt){
  if (ST.focusAmt > .02){ el.classList.remove('on'); return; }
  const W = ST.Wd, H = ST.Hd, cx = W/2, cy = H/2;
  const region = nearestRegion(cam.x, cam.z);
  if (curRegion && region !== curRegion){ el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); flashT = 0; }
  curRegion = region;

  // closest border to screen centre among those with a visible stretch
  let best = -1, bestD = 1e9, bestS = 0, sLo = 0, sHi = 0, curInfo = null;
  borderLines.forEach((B, bi) => {
    let minS = 1e9, maxS = -1e9, near = 1e9, nearS = 0;
    for (let i = 0; i < B.pts.length; i++){
      const p = proj(B.pts[i][0], B.pts[i][1], P0);
      if (!p.ok || p.x < 24 || p.x > W - 24 || p.y < 70 || p.y > H - 70) continue;
      minS = Math.min(minS, B.cum[i]); maxS = Math.max(maxS, B.cum[i]);
      const d = Math.hypot(p.x - cx, p.y - cy); if (d < near){ near = d; nearS = B.cum[i]; }
    }
    if (maxS < 0) return;
    const info = {bi, near, nearS, minS, maxS};
    if (bi === cur) curInfo = info;
    if (near < bestD){ bestD = near; best = info; }
  });
  if (!best || bestD > Math.min(W, H)*.62){ el.classList.remove('on'); return; }
  if (curInfo && curInfo.near < bestD + 70) best = curInfo; // hysteresis
  if (best.bi !== cur){ cur = best.bi; s = best.nearS; }
  const B = borderLines[cur];
  const lo = Math.min(best.minS + MARGIN, best.nearS), hi = Math.max(best.maxS - MARGIN, best.nearS);
  const target = Math.min(hi, Math.max(lo, best.nearS));
  s += (target - s) * (reduce ? 1 : Math.min(1, dt*5));
  s = Math.min(B.len, Math.max(0, s));
  const [wx, wz] = pointAt(B, s), [ax, az] = pointAt(B, Math.max(0, s - 3)), [bx, bz] = pointAt(B, Math.min(B.len, s + 3));
  const p = proj(wx, wz, P0), a = proj(ax, az, P1), tb = {}; proj(bx, bz, tb);
  let ang = Math.atan2(tb.y - a.y, tb.x - a.x);
  if (Math.cos(ang) < 0) ang += Math.PI; // keep text upright
  // which side (in the rotated frame) holds the current region
  const rc = RMAP[B.a === region.id ? B.a : B.b === region.id ? B.b : B.a];
  const c = {}; proj(cam.x, cam.z, c);
  const side = Math.sin(ang) * (c.x - p.x) * -1 + Math.cos(ang) * (c.y - p.y); // + => below the line in local frame
  const curId = B.a === region.id ? B.a : B.b === region.id ? B.b : null;
  const mine = curId ? RMAP[curId] : (side > 0 ? rc : rc);
  const otherId = curId === B.a ? B.b : B.a;
  const other = otherId ? RMAP[otherId] : null;
  const myName = (curId ? RMAP[curId] : region).name, otherName = other ? other.name : 'OUTER LIMIT';
  const below = side > 0;
  const key = `${myName}|${otherName}|${below}`;
  if (key !== shownKey){
    shownKey = key;
    const out = `<span class="t-n">${esc(otherName)}</span><span class="t-a">${below ? '▲' : '▼'}</span>`, me = `<span class="t-n">${esc(myName)}</span>`;
    rowTop.innerHTML = below ? out : me; rowBot.innerHTML = below ? me : out;
    rowTop.classList.toggle('me', !below); rowBot.classList.toggle('me', below);
  }
  const d = camera.position.distanceTo(new THREE.Vector3(wx, 0, wz));
  const fade = 1 - smooth(650, 950, d);
  el.style.opacity = fade.toFixed(2);
  el.style.transform = `translate3d(${p.x.toFixed(1)}px,${p.y.toFixed(1)}px,0) rotate(${ang.toFixed(4)}rad) scale(${labelScale().toFixed(3)})`;
  el.classList.add('on');
}

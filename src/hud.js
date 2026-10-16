/* ================= HUD ================= */
import * as THREE from 'three';
import {ST} from './state.js';
import {$, reduce, esc} from './core.js';
import {REGIONS, BUILDINGS, RMAP, M, regionAt, limitToReach} from './world.js';
import {hAt} from './terrain.js';
import {camera} from './scene.js';
import {cam, clamp, flyTo, flyWorld} from './camera.js';
import {ray, ndc} from './picking.js';
import {stopTour, toggleTour} from './tour.js';
import {openPalette} from './palette.js';
import {navigate, leaveFocus} from './router.js';

const secNav = $('hud-left');
REGIONS.forEach(r => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'sec';
  b.innerHTML = `<span class="k">${r.key}</span><span class="n"><b>${esc(r.name)}</b><span>${r.code} · ${esc(r.zh)} · ${r.items.length}</span></span>`;
  b.addEventListener('click', () => { stopTour(); navigate(r.path); });
  secNav.appendChild(b); r.secBtn = b;
});
const pinned = BUILDINGS.filter(b => b.pinned);
if (pinned.length){
  const h = document.createElement('div'); h.className = 'sec-h pin-h'; h.textContent = 'PINNED'; secNav.appendChild(h);
  pinned.forEach(b => {
    const el = document.createElement('button'); el.type = 'button'; el.className = 'pin';
    el.innerHTML = `<span class="k">★</span><span class="n"><b>${esc(b.title)}</b></span>`;
    el.addEventListener('click', () => navigate(b.path)); secNav.appendChild(el);
  });
}
$('b-world').addEventListener('click', () => { stopTour(); if (ST.focusWant) leaveFocus(); else { navigate('/'); flyWorld(); } });
$('b-pal').addEventListener('click', () => openPalette());
$('b-tour').addEventListener('click', () => toggleTour());

const crumbs = $('crumbs');
let crumbKey = '';
export function renderCrumbs(region, item){
  const key = (region?region.id:'') + '|' + (item?item.id:'');
  if (key === crumbKey) return; crumbKey = key;
  const parts = [`<button type="button" data-c="world" class="${region?'':'cur'}">WORLD</button>`];
  if (region) parts.push('<span class="sep">/</span>', `<button type="button" data-c="${region.id}" class="${item?'':'cur'}">${esc(region.name)}</button>`);
  if (item) parts.push('<span class="sep">/</span>', `<span class="cur">${item.code}</span>`);
  crumbs.innerHTML = parts.join('');
}
crumbs.addEventListener('click', e => {
  const c = e.target.closest('button')?.dataset.c; if (!c) return;
  stopTour();
  if (c === 'world'){ navigate('/'); flyWorld(); } else navigate(RMAP[c].path);
});

const tf = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Taipei', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false});
function tick(){ $('r-time').textContent = tf.format(new Date()) + ' UTC+8'; }
tick(); setInterval(tick, 1000);

/* decode effect on logo */
(function decode(){
  const el = $('logo'), target = 'ZYNIMOUS', glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/<>';
  if (reduce) return;
  let f = 0;
  const id = setInterval(() => {
    f++;
    el.textContent = target.split('').map((c, i) => f > 6 + i*2 ? c : glyphs[Math.floor(Math.random()*glyphs.length)]).join('');
    if (f > 6 + target.length*2){ clearInterval(id); el.textContent = target; }
  }, 45);
})();

/* minimap: covers the whole reachable world (read from the manifest, so it grows with the map) */
const mini = $('mini'), mctx = mini.getContext('2d');
const MRES = 176, PADM = 40;
const ext = M.extent, MW = Math.max(ext.maxX - ext.minX, ext.maxZ - ext.minZ) + PADM*2;
const MX0 = (ext.minX + ext.maxX)/2 - MW/2, MZ0 = (ext.minZ + ext.maxZ)/2 - MW/2;
const miniBase = document.createElement('canvas'); miniBase.width = miniBase.height = MRES;
{
  const ctx = miniBase.getContext('2d'), img = ctx.createImageData(MRES, MRES);
  const w2m = MW/MRES, hm = new Float32Array(MRES*MRES), inside = new Uint8Array(MRES*MRES);
  for (let y=0;y<MRES;y++) for (let x=0;x<MRES;x++){
    const wx = MX0 + (x+.5)*w2m, wz = MZ0 + (y+.5)*w2m;
    hm[y*MRES+x] = hAt(wx, wz); inside[y*MRES+x] = regionAt(wx, wz) ? 1 : 0;
  }
  for (let y=0;y<MRES;y++) for (let x=0;x<MRES;x++){
    const h = hm[y*MRES+x], c = Math.floor(h/4);
    const r = x<MRES-1 ? Math.floor(hm[y*MRES+x+1]/4) : c, d = y<MRES-1 ? Math.floor(hm[(y+1)*MRES+x]/4) : c;
    const line = (r !== c || d !== c);
    const major = line && (Math.floor(h/20) !== Math.floor((x<MRES-1?hm[y*MRES+x+1]:h)/20) || Math.floor(h/20) !== Math.floor((y<MRES-1?hm[(y+1)*MRES+x]:h)/20));
    const k = (y*MRES+x)*4, base = 6 + Math.max(0,h)*.12, dim = inside[y*MRES+x] ? 1 : .35;
    if (line){ const a = (major ? .85 : .42)*dim; img.data[k] = img.data[k+1] = img.data[k+2] = 207*a + base*(1-a); }
    else { img.data[k] = img.data[k+1] = img.data[k+2] = base*dim; }
    img.data[k+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
function sizeMini(){
  const r = mini.getBoundingClientRect(), dpr = Math.min(devicePixelRatio||1, 2);
  mini.width = Math.max(1, Math.round(r.width*dpr)); mini.height = Math.max(1, Math.round(r.height*dpr));
}
addEventListener('resize', sizeMini); sizeMini();
export function groundAt(nx, ny){
  ndc.set(nx, ny); ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let t = d.y < -0.02 ? (hAt(o.x + d.x*400, o.z + d.z*400) - o.y)/d.y : 900; t = clamp(t, 0, 900);
  return [o.x + d.x*t, o.z + d.z*t];
}
export function drawMini(){
  const w = mini.width, h = mini.height, s = w/MW;
  mctx.imageSmoothingEnabled = true;
  mctx.drawImage(miniBase, 0, 0, w, h);
  const toM = (x, z) => [(x-MX0)*s, (z-MZ0)*s];
  mctx.lineWidth = Math.max(1, w/176);
  REGIONS.forEach(r => {
    const on = r === ST.activeRegion;
    mctx.strokeStyle = on ? '#f2f2f2' : '#6a6a6a'; mctx.beginPath();
    r.poly.forEach(([x, z], i) => { const [mx, my] = toM(x, z); i ? mctx.lineTo(mx, my) : mctx.moveTo(mx, my); });
    mctx.closePath(); mctx.stroke();
    const [mx, my] = toM(r.x, r.z), q = 3*mctx.lineWidth;
    mctx.fillStyle = on ? '#f2f2f2' : '#cfcfcf'; mctx.strokeRect(mx-q, my-q, q*2, q*2);
    mctx.font = `500 ${Math.round(8*w/176)}px "JetBrains Mono", monospace`; mctx.fillText(r.key, mx + q*1.4, my - q*1.2);
  });
  mctx.fillStyle = '#9a9a9a';
  BUILDINGS.forEach(b => { const [mx, my] = toM(b.x, b.z), q = mctx.lineWidth; mctx.fillStyle = b === ST.focusB ? '#f2f2f2' : '#8a8a8a'; mctx.fillRect(mx-q*.6, my-q*.6, q*1.2, q*1.2); });
  const corners = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b]) => toM(...groundAt(a,b)));
  mctx.strokeStyle = 'rgba(242,242,242,.9)'; mctx.beginPath();
  corners.forEach(([x,y], i) => i ? mctx.lineTo(x,y) : mctx.moveTo(x,y)); mctx.closePath(); mctx.stroke();
  const [cx, cy] = toM(cam.x, cam.z);
  mctx.fillStyle = '#f2f2f2'; mctx.fillRect(cx-1.5*mctx.lineWidth, cy-1.5*mctx.lineWidth, 3*mctx.lineWidth, 3*mctx.lineWidth);
}
mini.addEventListener('click', e => {
  const r = mini.getBoundingClientRect();
  const x = MX0 + (e.clientX - r.left)/r.width*MW, z = MZ0 + (e.clientY - r.top)/r.height*MW;
  stopTour(); if (ST.focusWant) return;
  const L = limitToReach(x, z);
  flyTo(L.x, L.z, Math.min(cam.deff, 220));
});

/* ================= SIGNAGE (information layer) =================
   Screen-space name labels pinned to world points: one fixed-size chip per region and per building, name only.
   A label sits exactly on its anchor (no sliding, no resizing, no hover expansion). Off-screen anchors get nothing.
   Overlaps are resolved by hiding the lower-priority label: regions > pinned/new/featured buildings > nearest. */
import * as THREE from 'three';
import {ST} from './state.js';
import {$, esc} from './core.js';
import {REGIONS, BUILDINGS} from './world.js';
import {camera} from './scene.js';
import {cam} from './camera.js';

const labelsEl = $('labels');
const ents = [];
function mk(kind, name, path, anchor, extra){
  const el = document.createElement('div'); el.className = 'tag ' + kind;
  el.innerHTML = `<div class="stem"></div><div class="dot"></div><button type="button" class="card" data-go="${path}">${esc(name)}</button>`;
  labelsEl.appendChild(el);
  const E = {kind, el, card: el.querySelector('.card'), anchor: new THREE.Vector3(...anchor), w: 0, h: 0, sx: 0, sy: 0, shown: false, ...extra};
  ents.push(E); return E;
}

REGIONS.forEach(r => {
  r.board = mk('region', r.name, r.path, [r.x, r.landmarkTop + 2, r.z], {region: r});
  r.board.card.addEventListener('mouseenter', () => ST.hoverRegion = r);
  r.board.card.addEventListener('mouseleave', () => { if (ST.hoverRegion === r) ST.hoverRegion = null; });
});
BUILDINGS.forEach(b => {
  b.tag = mk('item', b.title, b.path, [b.x, b.top + .6, b.z], {b});
  b.tag.card.addEventListener('mouseenter', () => ST.hoverB = b);
  b.tag.card.addEventListener('mouseleave', () => { if (ST.hoverB === b) ST.hoverB = null; });
});

let navigate = null; // set by router to avoid an import cycle
export const setNavigator = f => { navigate = f; };
labelsEl.addEventListener('click', e => {
  const t = e.target.closest('[data-go]'); if (!t) return;
  e.stopPropagation(); navigate?.(t.dataset.go);
});

const v = new THREE.Vector3();
const overlaps = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
const GAP = 8;               // breathing room between two labels
const STEM = 18;             // px between anchor and label (fixed, set in CSS too)
const ITEMS_HIDE = 260;      // camera deff above which building labels are hidden (world view = regions only)
const HUD_IDS = ['hud-tl', 'hud-tr', 'hud-left', 'hud-br', 'hud-bl', 'tourchip'];
let hudRects = [];
function measureHud(){
  hudRects = [];
  for (const id of HUD_IDS){
    const el = $(id); if (!el || el.hidden) continue;
    const r = el.getBoundingClientRect(); if (r.width < 2) continue;
    hudRects.push({l: r.left - GAP, r: r.right + GAP, t: r.top - GAP, b: r.bottom + GAP});
  }
}
let frameN = 0, bootT = performance.now();
export function updateSignage(){
  frameN++;
  const W = ST.Wd, H = ST.Hd;
  const focused = ST.focusAmt > .02;
  document.body.classList.toggle('focus', focused);
  if (focused) return;
  if (frameN % 30 === 1) measureHud();
  const tx = cam.x, tz = cam.z, showItems = cam.deff <= ITEMS_HIDE;
  const cands = [];
  for (const E of ents){
    E.want = false;
    if (E.kind === 'item' && !showItems) continue;
    v.copy(E.anchor).project(camera);
    if (v.z > 1) continue;
    E.sx = (v.x*.5 + .5)*W; E.sy = (-v.y*.5 + .5)*H;
    if (!E.w || frameN % 60 === 0){ E.w = E.card.offsetWidth; E.h = E.card.offsetHeight; }
    const w = E.w || 120, h = E.h || 26;
    E.rect = {l: E.sx - w/2 - GAP/2, r: E.sx + w/2 + GAP/2, t: E.sy - STEM - h - GAP/2, b: E.sy + GAP/2};
    // fully on screen or nothing
    if (E.rect.l < 0 || E.rect.r > W || E.rect.t < 0 || E.rect.b > H) continue;
    if (E.kind === 'region') E.score = 1e6 - E.sy;
    else { const b = E.b; E.score = (b.pinned ? 400 : 0) + b.prio*50 + (b.isNew ? 30 : 0) - Math.hypot(b.x - tx, b.z - tz); }
    cands.push(E);
  }
  cands.sort((a, b) => b.score - a.score);
  const placed = [...hudRects];
  for (const E of cands){
    if (placed.some(p => overlaps(p, E.rect))) continue;
    placed.push(E.rect); E.want = true;
  }
  const stagger = performance.now() - bootT < 3000;
  ents.forEach((E, i) => {
    if (!E.want){ if (E.shown){ E.el.classList.remove('on'); E.shown = false; E.card.style.pointerEvents = 'none'; } return; }
    if (!E.shown){
      E.shown = true;
      E.el.style.transitionDelay = stagger ? (i*60) + 'ms' : '0ms';
      requestAnimationFrame(() => E.el.classList.add('on'));
    }
    E.el.style.transform = `translate3d(${E.sx.toFixed(1)}px,${E.sy.toFixed(1)}px,0)`;
    E.card.style.pointerEvents = 'auto';
  });
}

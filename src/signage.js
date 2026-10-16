/* ================= SIGNAGE (information layer) =================
   Screen-space HTML cards anchored to world points. Three sizes: board / label / dot.
   Hard rule: at least one board (or an edge arrow to the nearest one) is always on screen.
   Priority: pinned > new > featured > rest; max ~10 cards (5 on phones); overlapping lower-priority cards are demoted. */
import * as THREE from 'three';
import {ST} from './state.js';
import {$, esc} from './core.js';
import {REGIONS, BUILDINGS, RMAP, M} from './world.js';
import {camera} from './scene.js';
import {cam, flyToRegion, smooth} from './camera.js';

const labelsEl = $('labels'), arrowEl = $('edge-arrow');
export const ICONS = {
  hub:'<svg viewBox="0 0 24 24"><path d="M12 2l3 5h6l-3 5 3 5h-6l-3 5-3-5H3l3-5-3-5h6z"/><path d="M12 9v6M9 12h6"/></svg>',
  projects:'<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
  blogs:'<svg viewBox="0 0 24 24"><path d="M5 2h10l4 4v16H5z"/><path d="M15 2v4h4M8 11h8M8 15h8M8 19h5"/></svg>'
};
const ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗'];
const dirArrow = (dx, dz) => ARROWS[(Math.round(Math.atan2(dz, dx) / (Math.PI/4)) + 8) % 8];
const meters = u => Math.round(u * 10);
const latestFirst = (a, b) => b.date.localeCompare(a.date);

const ents = [];
function mk(kind, html, anchor, extra){
  const el = document.createElement('div'); el.className = 'tag ' + kind; el.dataset.lv = 'off';
  el.innerHTML = `<div class="stem"></div><div class="dot"></div><div class="card">${html}</div>`;
  labelsEl.appendChild(el);
  const E = {kind, el, card: el.querySelector('.card'), anchor: new THREE.Vector3(...anchor), lv: 'off', w: 200, h: 48, sx: 0, sy: 0, shown: false, ...extra};
  ents.push(E); return E;
}
const statusTxt = b => ({active:'ACTIVE', stable:'STABLE', archived:'ARCHIVED', classified:'CLASSIFIED'}[b.status] || b.status.toUpperCase());
const itemRow = b => `<button type="button" class="row" data-go="${b.path}"><span class="rt">${esc(b.title)}</span><span class="rd">${b.date.slice(5)}</span></button>`;

function boardHtml(r){
  const items = r.items.filter(b => b.status !== 'classified');
  const feat = items.filter(b => b.featured).sort(latestFirst), rest = items.filter(b => !b.featured).sort(latestFirst);
  const list = [...feat, ...rest].slice(0, r.id === 'hub' ? 0 : 4);
  const head = `<div class="b-head"><span class="ic">${ICONS[r.id] || ICONS.hub}</span><span class="tx"><span class="code">${r.code} · 0${r.key}</span><span class="ttl">${esc(r.name)}</span></span></div>`;
  if (r.id === 'hub'){
    const projs = BUILDINGS.filter(b => b.type === 'project' && b.featured && b.status !== 'classified').sort(latestFirst).slice(0, 3);
    const latest = BUILDINGS.filter(b => b.type === 'article').sort(latestFirst).slice(0, 3);
    return `<div class="board hub">${head}
      <p class="b-intro">匿名的軟體工程身分。系統、工具與實驗，作品本身就是履歷。</p>
      <div class="b-sec">FEATURED</div><div class="b-grid">${projs.map(b => `<button type="button" class="proj" data-go="${b.path}"><span class="pt">${esc(b.title)}</span><span class="ps">${esc(b.stack.join(' · ') || b.category || '')}</span></button>`).join('')}</div>
      <div class="b-sec">LATEST</div><div class="b-list">${latest.map(itemRow).join('')}</div>
      <div class="b-links"><a href="https://github.com/zynimous" target="_blank" rel="noopener">GITHUB ↗</a><button type="button" data-go="/about">ABOUT / CONTACT</button></div>
      <div class="b-sec">ROUTES</div><div class="b-signs" data-signs></div></div>`;
  }
  return `<div class="board">${head}
    <div class="b-meta"><span>${r.items.length} 份內容</span><span>${esc(r.zh)}</span><span>更新 ${r.updated || '—'}</span></div>
    <div class="b-list">${list.map(itemRow).join('')}</div></div>`;
}

REGIONS.forEach(r => {
  r.board = mk('board', boardHtml(r), [r.x, r.landmarkTop + 2, r.z], {region: r, big: r.id === 'hub'});
  r.board.w = r.id === 'hub' ? 360 : 290; r.board.h = r.id === 'hub' ? 330 : 190;
  r.board.card.addEventListener('mouseenter', () => ST.hoverRegion = r);
  r.board.card.addEventListener('mouseleave', () => { if (ST.hoverRegion === r) ST.hoverRegion = null; });
  r.board.signs = r.board.el.querySelector('[data-signs]');
});
BUILDINGS.forEach(b => {
  const html = `<span class="lv-label"><span class="tx"><span class="code">${b.code}${b.isNew ? ' · NEW' : ''}</span><span class="ttl">${esc(b.title)}</span><span class="sum">${esc(b.summary)}</span></span><span class="st${b.status === 'classified' ? ' cls' : ''}">${statusTxt(b)}</span></span><span class="lv-dot">${esc(b.title.length > 10 ? b.title.slice(0, 9) + '…' : b.title)}</span>`;
  b.tag = mk('item', `<button type="button" class="chip" data-go="${b.path}">${html}</button>`, [b.x, b.top + .6, b.z], {b});
  b.tag.card.addEventListener('mouseenter', () => ST.hoverB = b);
  b.tag.card.addEventListener('mouseleave', () => { if (ST.hoverB === b) ST.hoverB = null; });
});

let navigate = null; // set by router to avoid an import cycle
export const setNavigator = f => { navigate = f; };
labelsEl.addEventListener('click', e => {
  const t = e.target.closest('[data-go]'); if (!t) return;
  e.stopPropagation(); navigate?.(t.dataset.go);
});
arrowEl.addEventListener('click', () => { const r = arrowEl._r; if (r) navigate?.(r.path); });

const v = new THREE.Vector3();
const overlaps = (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t;
let frameN = 0, bootT = performance.now();
export function updateSignage(){
  frameN++;
  const W = ST.Wd, H = ST.Hd, mobile = W < 760, cap = mobile ? 5 : 10;
  const focused = ST.focusAmt > .02;
  document.body.classList.toggle('focus', focused);
  if (focused){ arrowEl.hidden = true; return; }
  const deff = cam.deff, tx = cam.x, tz = cam.z;
  const placed = [], cands = [];
  for (const E of ents){
    v.copy(E.anchor).project(camera);
    E.behind = v.z > 1;
    E.sx = (v.x*.5 + .5)*W; E.sy = (-v.y*.5 + .5)*H;
    E.dist = camera.position.distanceTo(E.anchor);
    E.lvWant = 'off';
    if (E.behind) continue;
    if (E.kind === 'board'){
      const W2 = E.w, H2 = E.h;
      const vis = E.sx > -W2*.6 && E.sx < W + W2*.6 && E.sy > 20 && E.sy < H + 120 && E.dist < 760;
      if (!vis) continue;
      E.score = 1000 - E.dist*.2 + (E.region === ST.activeRegion ? 300 : 0) + (E.big ? 40 : 0);
      cands.push(E); continue;
    }
    const b = E.b, dxz = Math.hypot(b.x - tx, b.z - tz);
    if (E.sx < -120 || E.sx > W + 120 || E.sy < -40 || E.sy > H + 140) continue;
    const star = b.prio > 0 || b.isNew;
    let want = 'off';
    if (deff > 260){ if (star && dxz < 520) want = 'dot'; }
    else if (deff > 105){ want = star ? 'label' : (dxz < 130 ? 'dot' : 'off'); }
    else want = dxz < 70 ? 'label' : (dxz < 130 ? 'dot' : 'off');
    if (b === ST.hoverB) want = 'label';
    if (want === 'off') continue;
    E.lvWant = want;
    E.score = b.prio*50 + (b.isNew ? 30 : 0) - dxz*.4 + (b === ST.hoverB ? 500 : 0);
    cands.push(E);
  }
  cands.sort((a, b) => b.score - a.score);
  let nLabels = 0, nDots = 0, nBoards = 0;
  const shownNow = new Set();
  for (const E of cands){
    let lv = E.kind === 'board' ? 'board' : E.lvWant;
    if (lv === 'label' && nLabels >= cap) lv = 'dot';
    if (lv === 'dot' && nDots >= 14) continue;
    const dims = lv === 'board' ? [E.w, E.h] : lv === 'label' ? [E === ST.hoverB?.tag ? 220 : 190, 44] : [86, 22];
    const stem = lv === 'board' ? 34 : lv === 'label' ? 22 : 12;
    const rect = {l: E.sx - dims[0]/2, r: E.sx + dims[0]/2, t: E.sy - stem - dims[1], b: E.sy};
    const clash = placed.some(p => overlaps(p, rect));
    if (clash){
      if (lv === 'board') { /* boards win by sorting; a clash means two boards on screen — keep both only if far apart */ lv = 'dot'; }
      else if (lv === 'label'){ lv = 'dot'; rect.l = E.sx - 43; rect.r = E.sx + 43; rect.t = E.sy - 34; if (placed.some(p => overlaps(p, rect)) || nDots >= 14) continue; }
      else continue;
    }
    if (E.kind === 'board' && lv === 'dot') continue;
    placed.push(rect); shownNow.add(E);
    E.lv = lv;
    if (lv === 'board') nBoards++; else if (lv === 'label') nLabels++; else nDots++;
  }
  const stagger = performance.now() - bootT < 3000;
  ents.forEach((E, i) => {
    if (!shownNow.has(E)){ if (E.shown){ E.el.classList.remove('on'); E.shown = false; E.card.style.pointerEvents = 'none'; } return; }
    if (!E.shown){
      E.shown = true; E.el.dataset.lv = E.lv;
      E.el.style.transitionDelay = stagger ? (i*80) + 'ms' : '0ms';
      requestAnimationFrame(() => E.el.classList.add('on'));
    } else if (E.el.dataset.lv !== E.lv) E.el.dataset.lv = E.lv;
    E.el.classList.toggle('exp', E.kind === 'item' && (E.b === ST.hoverB));
    // boards that would poke out of the top of the screen slide down (stem shrinks) so they stay readable
    let ty = E.sy, stem = E.lv === 'board' ? 34 : null;
    if (E.lv === 'board'){
      const room = E.sy - E.h - 64;
      if (room < 34){ stem = Math.max(8, room); ty = E.sy + Math.min(140, Math.max(0, 8 - room)); }
      E.el.style.setProperty('--stem', stem + 'px');
    }
    E.el.style.transform = `translate3d(${E.sx.toFixed(1)}px,${ty.toFixed(1)}px,0)`;
    E.el.style.zIndex = String(5000 - Math.round(E.dist));
    E.card.style.pointerEvents = 'auto';
    if (frameN % 20 === 0 && (E.w < 0 || true)){ const bw = E.card.offsetWidth; if (bw > 20 && E.lv === 'board') { E.w = bw; E.h = E.card.offsetHeight; } }
  });
  // direction signs on the hub board (cheap, throttled)
  if (frameN % 15 === 0){
    const hub = RMAP.hub;
    if (hub?.board?.signs){
      hub.board.signs.innerHTML = REGIONS.filter(r => r !== hub).map(r => {
        const dx = r.x - hub.x, dz = r.z - hub.z;
        return `<button type="button" class="sign" data-go="${r.path}"><span>${esc(r.code)}</span><b>${meters(Math.hypot(dx, dz))} m ${dirArrow(dx, dz)}</b></button>`;
      }).join('');
    }
  }
  // guarantee: always something readable. No board on screen -> arrow to the nearest one.
  if (nBoards === 0){
    let best = null, bd = 1e9;
    for (const r of REGIONS){ const d = Math.hypot(r.x - tx, r.z - tz); if (d < bd){ bd = d; best = r; } }
    v.set(best.x, (best.h || 0) + 6, best.z).project(camera);
    let ax = v.x, ay = v.y; if (v.z > 1){ ax = -ax; ay = -ay; }
    const m = Math.max(Math.abs(ax), Math.abs(ay), 1e-3); ax /= m; ay /= m;
    const px = (ax*.5 + .5)*(W - 190) + 20, py = (-ay*.5 + .5)*(H - 140) + 40;
    arrowEl.hidden = false; arrowEl._r = best;
    arrowEl.style.transform = `translate3d(${px.toFixed(0)}px,${py.toFixed(0)}px,0)`;
    arrowEl.innerHTML = `<span class="ar" style="transform:rotate(${Math.atan2(-ay, ax)}rad)">▶</span><b>${esc(best.name)}</b><i>${meters(bd)} m</i>`;
  } else arrowEl.hidden = true;
}

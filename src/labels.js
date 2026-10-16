import * as THREE from 'three';
import {ST} from './state.js';
import {ICONS, ZONES, ZONE_SUB} from './data.js';
import {meters} from './terrain.js';
import {peaks} from './scene.js';
import {smooth, cam, flyToZone} from './camera.js';
import {openIntel} from './intel.js';
/* ================= LABELS ================= */
const labelsEl = document.getElementById('labels');
const labels = [];
function addTag(kind, html, pos, alpha, onClick, extra){
  const el = document.createElement('div'); el.className = 'tag ' + kind;
  el.innerHTML = `<div class="stem"></div><div class="dot"></div>${html}`;
  el.style.visibility = 'hidden';
  labelsEl.appendChild(el);
  const card = el.querySelector('.card');
  if (card && onClick) card.addEventListener('click', e => { e.stopPropagation(); onClick(); });
  const L = {el, card, pos:new THREE.Vector3(...pos), alpha, vis:false, ...extra};
  labels.push(L); return L;
}
ZONES.forEach(z => {
  z.tag = addTag('zone',
    `<button class="card zone-card" type="button" aria-label="${z.name} ${z.zh}"><span class="ic">${ICONS[z.icon]}</span><span class="tx"><span class="code">${z.code} · 0${z.key}</span><span class="ttl">${z.name}</span><span class="sub">${z.zh} · ${ZONE_SUB[z.id]}</span></span></button>`,
    [z.x, z.h + .3, z.z - z.R], () => 1 - z.detail*.3, () => flyToZone(z));
  z.tag.card.addEventListener('mouseenter', () => ST.hoverZone = z);
  z.tag.card.addEventListener('mouseleave', () => { if (ST.hoverZone === z) ST.hoverZone = null; });
  z.items.forEach(it => {
    it.tag = addTag('item',
      `<button class="card item-card" type="button"><span class="tx"><span class="code">${it.code}</span><span class="ttl">${it.title}</span></span><span class="st${it.cls?' cls':''}">${it.st}</span></button>`,
      [it.x, it.h + .3, it.z], () => z.detail, () => openIntel(it));
  });
});
peaks.forEach((p, i) => {
  const code = i < 2 ? `<b>OBS-0${i+1}</b>` : '';
  addTag('spot', `<span class="lbl">${code}▲ ${meters(p.h)}</span>`, [p.x, p.h + .5, p.z], () => (1 - smooth(150, 95, cam.deff)) * .9);
});

export {labelsEl, labels, addTag};

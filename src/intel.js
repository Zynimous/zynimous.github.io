import {ST} from './state.js';
import {$} from './core.js';
import {ZMAP} from './data.js';
import {canvas} from './scene.js';
import {flyToZone} from './camera.js';
import {stopTour} from './tour.js';
/* ================= INTEL ================= */
const intel = $('intel');
function openIntel(it){
  ST.curItem = it;
  const z = ZMAP[it.zone];
  $('i-file').textContent = it.code;
  $('i-kicker').textContent = `${z.code} · ${z.name} · ${it.code}`;
  $('i-title').textContent = it.title;
  $('i-meta').innerHTML = it.meta.map(([k,v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
  $('i-body').innerHTML = it.body;
  $('i-path').textContent = it.path;
  $('i-scroll').scrollTop = 0;
  document.body.classList.add('reading');
  intel.setAttribute('aria-hidden', 'false');
  stopTour();
  if (!z.detail || z.detail < .5) flyToZone(z);
  try { history.replaceState(null, '', '#' + it.id); } catch(_){}
  setTimeout(() => $('i-close').focus({preventScroll:true}), 60);
}
function closeIntel(){
  document.body.classList.remove('reading'); intel.setAttribute('aria-hidden', 'true');
  const it = ST.curItem; ST.curItem = null;
  try { history.replaceState(null, '', '#' + (it ? it.zone : '')); } catch(_){}
  canvas.focus({preventScroll:true});
}
function stepIntel(dir){
  if (!ST.curItem) return;
  const list = ZMAP[ST.curItem.zone].items, i = list.indexOf(ST.curItem);
  openIntel(list[(i + dir + list.length) % list.length]);
}
$('i-close').addEventListener('click', closeIntel);
$('scrim').addEventListener('click', closeIntel);
$('i-body').addEventListener('click', e => {
  const b = e.target.closest('[data-copy]'); if (!b) return;
  const text = b.dataset.copy;
  const done = ok => { b.textContent = ok ? 'COPIED' : 'SELECTED'; setTimeout(() => b.textContent = 'COPY', 1400); };
  try {
    navigator.clipboard.writeText(text).then(() => done(true), () => { selectCode(b); done(false); });
  } catch(_){ selectCode(b); done(false); }
});
function selectCode(b){ const c = b.parentElement.querySelector('code'); const r = document.createRange(); r.selectNodeContents(c); const s = getSelection(); s.removeAllRanges(); s.addRange(r); }

export {intel, openIntel, closeIntel, stepIntel, selectCode};

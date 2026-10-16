/* ================= BOOT ================= */
import {ST} from './state.js';
import {$, reduce} from './core.js';
import {RMAP, BPATH, REGIONS, BUILDINGS} from './world.js';
import {canvas, terrainUniforms} from './scene.js';
import {cam} from './camera.js';
import {frame} from './loop.js';
import {navigate, initialPath, stepFocus, leaveFocus} from './router.js';
import {startExit} from './focus.js';
import {BMAP} from './world.js';

// panel controls (kept here: they need router + focus + world, which would form import cycles elsewhere)
$('panel').addEventListener('click', e => {
  const go = e.target.closest('[data-go]'); if (go){ navigate(go.dataset.go, 'replace'); return; }
  const ex = e.target.closest('[data-exit]'); if (ex){ startExit(BMAP[ex.dataset.exit]); return; }
});
$('p-close').addEventListener('click', leaveFocus);
$('p-prev').addEventListener('click', () => stepFocus(-1));
$('p-next').addEventListener('click', () => stepFocus(1));
$('scrim').addEventListener('click', leaveFocus);

// initial state from the URL: direct links restore the matching map state (no animation)
const path = initialPath();
const startB = BPATH[path], startR = REGIONS.find(r => r.path === path && r.id !== 'hub');
const home = startB ? RMAP[startB.region] : (startR || RMAP.hub);
cam.rx = cam.x = home.x; cam.rz = cam.z = home.z - 26; cam.deff = startR ? 125 : 150;
if (startB) navigate(path, 'none', true);
requestAnimationFrame(t => { ST.last = t; frame(t); });

const bootLines = [...document.querySelectorAll('#boot-box div')];
$('boot-sectors').textContent = REGIONS.length + ' ONLINE'; $('boot-verts').textContent = BUILDINGS.length + ' MAPPED';
if (reduce){ $('boot').classList.add('gone'); }
else {
  terrainUniforms.uIntro.value = -0.6;
  bootLines.forEach((l, i) => setTimeout(() => l.classList.add('on'), 120 + i*170));
  setTimeout(() => { $('boot').classList.add('gone'); terrainUniforms.uIntro.value = 0; }, 1050);
}
canvas.focus({preventScroll:true});

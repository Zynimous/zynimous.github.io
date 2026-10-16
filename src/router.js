/* ================= ROUTER: History API, one big page. Paths map to map states. ================= */
import {ST} from './state.js';
import {reduce} from './core.js';
import {REGIONS, RMAP, BPATH} from './world.js';
import {cam, flyToRegion, REGION_VIEW} from './camera.js';
import {enterFocus, exitFocus} from './focus.js';
import {neighbours} from './panel.js';
import {stopTour} from './tour.js';
import {setNavigator} from './signage.js';

const regionByPath = Object.fromEntries(REGIONS.map(r => [r.path, r]));
const norm = p => { p = (p || '/').split(/[?#]/)[0].replace(/\/+$/, ''); return p || '/'; };
let current = norm(location.pathname);

function setUrl(path, mode){
  if (norm(location.pathname) === path){ return; }
  try { history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', path); } catch (_){}
}
/** Move the map to `path`. mode: 'push' | 'replace' | 'none' (popstate / initial load). */
export function navigate(path, mode = 'push', instant = false){
  path = norm(path);
  stopTour();
  const b = BPATH[path], r = regionByPath[path];
  if (b){
    setUrl(path, mode); current = path;
    if (!ST.focusWant) ST.focusEntryPushed = (mode === 'push');
    enterFocus(b, instant);
    return;
  }
  const wasFocus = !!ST.focusWant;
  if (wasFocus) exitFocus();
  const target = r || RMAP.hub;
  setUrl(r ? path : '/', mode); current = r ? path : '/';
  if (instant){ cam.x = cam.rx = target.x; cam.z = cam.rz = target.z - 24; cam.deff = r && r.id !== 'hub' ? REGION_VIEW : 150; return; }
  if (wasFocus){ if (ST.activeRegion !== target) flyToRegion(target); return; } // otherwise exitFocus restores the pre-entry camera
  flyToRegion(target);
}
export function stepFocus(dir){
  if (!ST.focusB) return;
  const nb = neighbours(ST.focusB), t = dir > 0 ? nb.next : nb.prev;
  if (t && t !== ST.focusB) navigate(t.path, 'replace');
}
export function leaveFocus(){
  if (!ST.focusWant) return;
  if (ST.focusEntryPushed){ ST.focusEntryPushed = false; history.back(); }
  else navigate(ST.focusB ? RMAP[ST.focusB.region].path : '/', 'replace');
}
/** Keep the URL in step with the region being explored (no history spam). */
export function syncRegionUrl(region){
  if (ST.focusWant || !region) return;
  const p = region.path; if (norm(location.pathname) !== p){ try { history.replaceState(null, '', p); } catch (_){} current = p; }
}
addEventListener('popstate', () => navigate(location.pathname, 'none'));
setNavigator(p => navigate(p, 'push'));
export const initialPath = () => norm(location.pathname);

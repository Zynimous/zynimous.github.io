import {ST} from './state.js';
import {$} from './core.js';
import {ZMAP} from './data.js';
import {flyToZone} from './camera.js';
/* ================= TOUR ================= */
const TOUR = ['hq','projects','about','blogs'];
function toggleTour(force){ if (ST.tour && !force) stopTour(); else startTour(); }
function startTour(){ ST.tour = {i:0, wait:0}; flyToZone(ZMAP[TOUR[0]]); $('tourchip').hidden = false; $('b-tour').classList.add('on'); updTour(); }
function stopTour(){ if (!ST.tour) return; ST.tour = null; $('tourchip').hidden = true; $('b-tour').classList.remove('on'); }
function updTour(){ if (ST.tour) $('tour-txt').textContent = `AUTO TOUR ${Math.min(ST.tour.i+1, TOUR.length)}/${TOUR.length} · ${ZMAP[TOUR[Math.min(ST.tour.i, TOUR.length-1)]].name}`; }
$('tour-stop').addEventListener('click', stopTour);

export {TOUR, toggleTour, startTour, stopTour, updTour};

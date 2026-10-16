/* ================= TOUR ================= */
import {ST} from './state.js';
import {$} from './core.js';
import {REGIONS} from './world.js';
import {flyToRegion} from './camera.js';

export const TOUR = REGIONS;
export function toggleTour(force){ if (ST.tour && !force) stopTour(); else startTour(); }
export function startTour(){ ST.tour = {i:0, wait:0}; flyToRegion(TOUR[0]); $('tourchip').hidden = false; $('b-tour').classList.add('on'); updTour(); }
export function stopTour(){ if (!ST.tour) return; ST.tour = null; $('tourchip').hidden = true; $('b-tour').classList.remove('on'); }
export function updTour(){ if (ST.tour) $('tour-txt').textContent = `AUTO TOUR ${Math.min(ST.tour.i+1, TOUR.length)}/${TOUR.length} · ${TOUR[Math.min(ST.tour.i, TOUR.length-1)].name}`; }
$('tour-stop').addEventListener('click', stopTour);

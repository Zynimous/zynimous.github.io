/* ================= TOUR ================= */
const TOUR = ['hq','projects','about','blogs'];
let tour = null;
function toggleTour(force){ if (tour && !force) stopTour(); else startTour(); }
function startTour(){ tour = {i:0, wait:0}; flyToZone(ZMAP[TOUR[0]]); $('tourchip').hidden = false; $('b-tour').classList.add('on'); updTour(); }
function stopTour(){ if (!tour) return; tour = null; $('tourchip').hidden = true; $('b-tour').classList.remove('on'); }
function updTour(){ if (tour) $('tour-txt').textContent = `AUTO TOUR ${Math.min(tour.i+1, TOUR.length)}/${TOUR.length} · ${ZMAP[TOUR[Math.min(tour.i, TOUR.length-1)]].name}`; }
$('tour-stop').addEventListener('click', stopTour);

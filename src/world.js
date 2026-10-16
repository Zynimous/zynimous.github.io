/* ================= WORLD (manifest-derived data + spatial helpers) ================= */
import manifest from 'virtual:manifest';

export const M = manifest;
export const REGIONS = manifest.regions;
export const BUILDINGS = manifest.buildings;
export const BORDERS = manifest.borders;
export const RMAP = Object.fromEntries(REGIONS.map(r => [r.id, r]));
export const BMAP = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
export const BPATH = Object.fromEntries(BUILDINGS.map(b => [b.path, b]));
const SPACING = manifest.spacing;
const CELLS = new Map(REGIONS.map(r => [r.q + ',' + r.r, r]));

REGIONS.forEach((r, i) => {
  r.index = i; r.key = String(i + 1);
  r.path = r.id === 'hub' ? '/' : '/' + r.id;
  r.items = BUILDINGS.filter(b => b.region === r.id);
});
const perRegion = {};
BUILDINGS.forEach((b, i) => {
  b.index = i;
  b.code = `${RMAP[b.region].code}-${String((perRegion[b.region] = (perRegion[b.region] || 0) + 1)).padStart(2, '0')}`;
  b.prio = (b.pinned ? 4 : 0) + (b.featured ? 2 : 0);
});
// newest first; "new" = within 21 days of the newest entry
const newest = BUILDINGS.reduce((m, b) => b.date > m ? b.date : m, '');
BUILDINGS.forEach(b => { b.isNew = (Date.parse(newest) - Date.parse(b.date)) / 864e5 <= 21; });

/** Hex-lattice cell lookup: region owning (x,z), or null outside every region. */
export function regionAt(x, z){
  const r = z / (SPACING * Math.sqrt(3) / 2), q = x / SPACING - r / 2;
  let rq = Math.round(q), rr = Math.round(r), rs = Math.round(-q - r);
  const dq = Math.abs(rq - q), dr = Math.abs(rr - r), ds = Math.abs(rs + q + r);
  if (dq > dr && dq > ds) rq = -rr - rs; else if (dr > ds) rr = -rq - rs;
  return CELLS.get(rq + ',' + rr) || null;
}
/** Nearest region by centre distance (always defined) — used for "current region" labels. */
export function nearestRegion(x, z){
  let best = null, bd = Infinity;
  for (const r of REGIONS){ const d = Math.hypot(x - r.x, z - r.z); if (d < bd){ bd = d; best = r; } }
  return best;
}

const OUTER = BORDERS.filter(b => b.b === null);
function nearestOnOuter(x, z){
  let bx = 0, bz = 0, bd = Infinity;
  for (const e of OUTER){
    for (let i = 0; i < e.pts.length - 1; i++){
      const [ax, az] = e.pts[i], [cx, cz] = e.pts[i + 1], dx = cx - ax, dz = cz - az;
      const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / (dx * dx + dz * dz)));
      const px = ax + dx * t, pz = az + dz * t, d = Math.hypot(x - px, z - pz);
      if (d < bd){ bd = d; bx = px; bz = pz; }
    }
  }
  return {x: bx, z: bz, d: bd};
}
/** Rubber-band reach limit. Returns the damped position and how far past the limit the raw target is. */
const K_BAND = 38;
export function limitToReach(x, z){
  if (regionAt(x, z)) return {x, z, over: 0};
  const L = nearestOnOuter(x, z);
  if (L.d < 1e-3) return {x, z, over: 0};
  const k = K_BAND * (1 - Math.exp(-L.d / K_BAND)) / L.d;
  return {x: L.x + (x - L.x) * k, z: L.z + (z - L.z) * k, over: L.d, lx: L.x, lz: L.z};
}
export const nearestOuter = nearestOnOuter;

/** Footprint circumradius used for picking / spacing. */
export const footR = b => Math.max(b.params.w, b.params.d) * .75;

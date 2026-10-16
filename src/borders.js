/* ================= BORDERS (ribbon meshes draped on terrain) + ROADS ================= */
import * as THREE from 'three';
import {BORDERS, REGIONS, RMAP} from './world.js';
import {hAt, PAD_IN} from './terrain.js';
import {scene, terrainUniforms, dashMat, addLine} from './scene.js';

const HALF_W = .4, LIFT = .55, TIE_EVERY = 7, TIE_LEN = 2.6, TIE_W = .3;

function resample(pts, step){
  const out = [pts[0]];
  for (let i = 0; i < pts.length - 1; i++){
    const [ax, az] = pts[i], [bx, bz] = pts[i+1], n = Math.max(1, Math.ceil(Math.hypot(bx-ax, bz-az)/step));
    for (let k = 1; k <= n; k++) out.push([ax + (bx-ax)*k/n, az + (bz-az)*k/n]);
  }
  return out;
}
const pos = [], idx = [];
function quad(a, b, c, d){ const o = pos.length/3; pos.push(...a, ...b, ...c, ...d); idx.push(o, o+1, o+2, o+2, o+1, o+3); }
const P = (x, z, side, nx, nz, w) => { const px = x + nx*side*w, pz = z + nz*side*w; return [px, hAt(px, pz) + LIFT, pz]; };

export const borderLines = []; // polylines in world space with cumulative arc length, for the train label
for (const e of BORDERS){
  const s = resample(e.pts, 2), cum = [0];
  for (let i = 1; i < s.length; i++) cum.push(cum[i-1] + Math.hypot(s[i][0]-s[i-1][0], s[i][1]-s[i-1][1]));
  borderLines.push({a: e.a, b: e.b, pts: s, cum, len: cum[cum.length-1]});
  const nrm = [];
  for (let i = 0; i < s.length; i++){
    const p = s[Math.max(0, i-1)], q = s[Math.min(s.length-1, i+1)], dx = q[0]-p[0], dz = q[1]-p[1], l = Math.hypot(dx, dz) || 1;
    nrm.push([-dz/l, dx/l]);
  }
  for (let i = 0; i < s.length - 1; i++){
    const [x0, z0] = s[i], [x1, z1] = s[i+1], [n0x, n0z] = nrm[i], [n1x, n1z] = nrm[i+1];
    quad(P(x0, z0, -1, n0x, n0z, HALF_W), P(x0, z0, 1, n0x, n0z, HALF_W), P(x1, z1, -1, n1x, n1z, HALF_W), P(x1, z1, 1, n1x, n1z, HALF_W));
  }
  // sleepers: short cross-bars like railway ties
  for (let t = TIE_EVERY/2; t < cum[cum.length-1]; t += TIE_EVERY){
    let i = 1; while (i < cum.length - 1 && cum[i] < t) i++;
    const k = (t - cum[i-1]) / (cum[i] - cum[i-1] || 1), x = s[i-1][0] + (s[i][0]-s[i-1][0])*k, z = s[i-1][1] + (s[i][1]-s[i-1][1])*k;
    const dx = s[i][0]-s[i-1][0], dz = s[i][1]-s[i-1][1], l = Math.hypot(dx, dz) || 1, tx = dx/l, tz = dz/l, nx = -tz, nz = tx;
    const c = (u, v) => { const px = x + tx*u + nx*v, pz = z + tz*u + nz*v; return [px, hAt(px, pz) + LIFT, pz]; };
    quad(c(-TIE_W, -TIE_LEN), c(TIE_W, -TIE_LEN), c(-TIE_W, TIE_LEN), c(TIE_W, TIE_LEN));
  }
}
const g = new THREE.BufferGeometry();
g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
const mat = new THREE.ShaderMaterial({
  uniforms: {uFog: terrainUniforms.uFog, uIntro: terrainUniforms.uIntro, uColor:{value:new THREE.Color(0xf2f2f2)}},
  vertexShader: `varying float vCd; varying vec3 vW; void main(){ vW = position; vCd = distance(cameraPosition, position); gl_Position = projectionMatrix*viewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform vec2 uFog; uniform float uIntro; uniform vec3 uColor; varying float vCd; varying vec3 vW;
    void main(){ float rev = 1.0 - smoothstep(uIntro*560.0 - 50.0, uIntro*560.0, length(vW.xz));
      gl_FragColor = vec4(uColor * (1.0 - smoothstep(uFog.x, uFog.y, vCd)) * rev, 1.0); }`,
  polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2
});
const ribbon = new THREE.Mesh(g, mat); ribbon.frustumCulled = false; ribbon.renderOrder = 3; scene.add(ribbon);

/* ---- roads: dashed grey routes between adjacent regions, also the auto-tour path ---- */
export const tourMat = dashMat(0xe8e8e8, .85, 3.2, 2.6, 5);
export function route(A, B, bend){
  const dx = B.x-A.x, dz = B.z-A.z, L = Math.hypot(dx, dz), ux = dx/L, uz = dz/L;
  const s = [A.x + ux*(PAD_IN+8), A.z + uz*(PAD_IN+8)], e = [B.x - ux*(PAD_IN+8), B.z - uz*(PAD_IN+8)];
  const mx = (s[0]+e[0])/2 - uz*bend, mz = (s[1]+e[1])/2 + ux*bend;
  const q1 = [(s[0]*2+mx)/3, (s[1]*2+mz)/3];
  const curve = new THREE.CatmullRomCurve3([s, q1, [mx,mz], e].map(p => new THREE.Vector3(p[0],0,p[1])), false, 'centripetal');
  return curve.getPoints(160).map(p => [p.x, p.z]);
}
borderLines.filter(b => b.b).forEach((b, i) => {
  addLine(route(RMAP[b.a], RMAP[b.b], (i % 2 ? 1 : -1) * 14), tourMat, {lift:1, dashed:true});
});
/* region pad rings: faint dashed circle around each landmark pad */
const ringMat = dashMat(0x8a8a8a, .55, 1.4, 1.8, 0);
REGIONS.forEach(r => {
  const ring = []; for (let i = 0; i <= 96; i++){ const a = i/96*Math.PI*2; ring.push([r.x + Math.cos(a)*(PAD_IN-6), r.z + Math.sin(a)*(PAD_IN-6)]); }
  addLine(ring, ringMat, {y:r.h, lift:.3, dashed:true});
});

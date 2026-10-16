/* ================= THREE: renderer, terrain clipmap, line helpers ================= */
import * as THREE from 'three';
import {reduce} from './core.js';
import {HEIGHT_GLSL, PADS, MAX_PADS, hAt} from './terrain.js';

THREE.ColorManagement.enabled = false; // keep r128-era colour behaviour (ShaderMaterial colours are raw)
export const canvas = document.getElementById('scene');
export const renderer = new THREE.WebGLRenderer({canvas, antialias:true, powerPreference:'high-performance'});
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.LinearSRGBColorSpace;
renderer.setClearColor(0x000000, 1);
renderer.autoClear = false;
export const scene = new THREE.Scene();
export const FOV = 42;
export const camera = new THREE.PerspectiveCamera(FOV, 1, 1, 3200);
export const FOG_NEAR = 260, FOG_FAR = 980;

/* ---- terrain: nested square rings (clipmap), height computed in the vertex shader from world coords ---- */
const LEVELS = 5, CELLS = 128, HOLE = 30;
export const terrainUniforms = {
  uLine:{value:new THREE.Color(0xff6a1a)}, uCursor:{value:new THREE.Vector2(9999,9999)}, uCursorOn:{value:0},
  uFocus:{value:new THREE.Vector2(9999,9999)}, uFocusAmt:{value:0}, uIntro:{value: reduce ? 2 : 0}, uZoom:{value: 200},
  uPads:{value: Array.from({length:MAX_PADS}, (_, i) => new THREE.Vector3(...(PADS[i] || [0,0,0])))}, uPadN:{value: PADS.length},
  uFog:{value:new THREE.Vector2(FOG_NEAR, FOG_FAR)}
};
function ringGeometry(cell){
  const n = CELLS, pos = [], idx = [], stride = n + 1, half = n/2;
  for (let j=0;j<=n;j++) for (let i=0;i<=n;i++) pos.push((i-half)*cell, 0, (j-half)*cell);
  for (let j=0;j<n;j++) for (let i=0;i<n;i++){
    const ci = i - half, cj = j - half;
    if (cell > 1 && ci >= -HOLE && ci < HOLE && cj >= -HOLE && cj < HOLE) continue;
    const a = j*stride+i, b = a+1, c = a+stride, d = c+1;
    idx.push(a, c, b, b, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
  return g;
}
const VERT = `
  uniform vec2 uCenter; uniform float uHalf;
  varying vec3 vW; varying float vH0;
  ${HEIGHT_GLSL}
  void main(){
    vec2 w = uCenter + position.xz;
    float h = heightAt(w);
    vW = vec3(w.x, h, w.y); vH0 = h;
    gl_Position = projectionMatrix*viewMatrix*vec4(vW, 1.0);
  }`;
const FRAG = `
  uniform vec3 uLine; uniform vec2 uCursor; uniform float uCursorOn; uniform vec2 uFocus; uniform float uFocusAmt; uniform float uIntro; uniform float uZoom; uniform vec2 uFog;
  uniform vec3 uInner; // cx, cz, half-extent of the finer ring inside this one (half<0: none)
  varying vec3 vW; varying float vH0;
  float iso(float v, float w){ float d = max(fwidth(v), 1e-4); float f = abs(fract(v - 0.5) - 0.5) / d; return 1.0 - clamp(f / w, 0.0, 1.0); }
  void main(){
    if (uInner.z > 0.0 && abs(vW.x-uInner.x) < uInner.z && abs(vW.z-uInner.y) < uInner.z) discard;
    float vH = vH0 * 0.8667;
    float cd = distance(cameraPosition, vW);
    // zoom LOD: fine lines only when close, coarse ones persist when far; everything thins out with distance
    float zFine = (1.0 - smoothstep(80.0, 160.0, uZoom)) * (1.0 - smoothstep(160.0, 380.0, cd));
    float zMid  = (1.0 - 0.8*smoothstep(200.0, 340.0, uZoom)) * (1.0 - 0.7*smoothstep(300.0, 800.0, cd));
    float zFar  = smoothstep(220.0, 380.0, uZoom);
    float minor = max(iso(vH, 0.9)*0.5*zFine, iso(vH/2.0, 1.0)*zMid);
    float major = max(iso(vH/10.0, 1.35), iso(vH/20.0, 1.7)*max(zFar, smoothstep(300.0, 700.0, cd)));
    float halo  = max(iso(vH/2.0, 4.5)*zMid, iso(vH, 4.0)*zFine*0.5);
    float dc = distance(vW.xz, uCursor);
    float cur = exp(-dc*dc/2000.0) * uCursorOn;
    float df = distance(vW.xz, uFocus);
    float foc = exp(-df*df/4200.0) * uFocusAmt;
    float energy = 0.42 + cur*1.0 + foc*0.75;
    vec3 lc = mix(vec3(0.78,0.78,0.76), uLine, clamp(cur*1.3, 0.0, 1.0));
    vec3 col = lc * (minor*0.55 + major*1.0 + halo*0.12) * energy;
    float gx = iso(vW.x/40.0, 0.7), gz = iso(vW.z/40.0, 0.7);
    col += vec3(0.055) * max(gx, gz) * (1.0 - smoothstep(300.0, 700.0, cd));
    col += vec3(0.012 + max(vH0,0.0)*0.0005);
    float fog = 1.0 - smoothstep(uFog.x, uFog.y, cd);
    float r = length(vW.xz);
    float rev = 1.0 - smoothstep(uIntro*560.0 - 50.0, uIntro*560.0, r);
    float front = exp(-pow((r - uIntro*560.0)/14.0, 2.0)) * step(uIntro, 1.0);
    col *= fog * rev;
    col += vec3(0.8) * front * 0.5 * minor;
    gl_FragColor = vec4(col, 1.0);
  }`;
export const terrainLevels = [];
for (let L=0; L<LEVELS; L++){
  const cell = 1 * 2**L;
  const mat = new THREE.ShaderMaterial({
    uniforms: {...terrainUniforms, uCenter:{value:new THREE.Vector2()}, uHalf:{value:CELLS/2*cell}, uInner:{value:new THREE.Vector3(0,0,-1)}},
    vertexShader: VERT, fragmentShader: FRAG
  });
  const mesh = new THREE.Mesh(ringGeometry(cell), mat); mesh.frustumCulled = false;
  scene.add(mesh); terrainLevels.push({mesh, cell, mat});
}
/** Re-centre every ring on (x,z), snapped to its own lattice so vertices never swim. */
export function updateTerrain(x, z){
  terrainLevels.forEach((lv, L) => {
    const s = lv.cell * 2;
    const cx = Math.round(x/s)*s, cz = Math.round(z/s)*s;
    lv.mat.uniforms.uCenter.value.set(cx, cz);
    if (L > 0){
      const inner = terrainLevels[L-1], u = inner.mat.uniforms;
      lv.mat.uniforms.uInner.value.set(u.uCenter.value.x, u.uCenter.value.y, u.uHalf.value);
    }
  });
}

/* ---- line helpers ---- */
export const dashMats = [];
export function dashMat(color, opacity, dash, gap, speed){
  const m = new THREE.ShaderMaterial({
    uniforms:{uTime:{value:0}, uColor:{value:new THREE.Color(color)}, uOpacity:{value:opacity}, uDash:{value:dash}, uGap:{value:gap}, uSpeed:{value: reduce ? 0 : speed}, uFog:terrainUniforms.uFog},
    vertexShader:`attribute float lineDistance; varying float vD; varying float vCd; void main(){ vD = lineDistance; vec4 w = modelMatrix*vec4(position,1.0); vCd = distance(cameraPosition, w.xyz); gl_Position = projectionMatrix*viewMatrix*w; }`,
    fragmentShader:`uniform float uTime, uOpacity, uDash, uGap, uSpeed; uniform vec3 uColor; uniform vec2 uFog; varying float vD; varying float vCd;
      void main(){ float m = mod(vD - uTime*uSpeed, uDash + uGap); if (m > uDash) discard; gl_FragColor = vec4(uColor, uOpacity * (1.0 - smoothstep(uFog.x, uFog.y, vCd))); }`,
    transparent:true, depthWrite:false
  });
  dashMats.push(m); return m;
}
export function addLine(pts, mat, {closed=false, lift=.35, y=null, dashed=false, target=scene}={}){
  const arr = [];
  const push = p => arr.push(p[0], (y ?? hAt(p[0], p[1])) + lift, p[1]);
  pts.forEach(push); if (closed) push(pts[0]);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
  const l = new THREE.Line(g, mat); if (dashed) l.computeLineDistances(); l.frustumCulled = false; target.add(l); return l;
}
export const polar = (cx, cz, a, r) => [cx + Math.cos(a)*r, cz + Math.sin(a)*r];

/* ================= BUILDINGS: one content file = one building =================
   All buildings are merged into one fill mesh + one edge mesh (two draw calls). Per-building state
   (hover, hidden-for-focus) is driven by uniforms matched against the per-vertex aBid attribute. */
import * as THREE from 'three';
import {BUILDINGS, REGIONS} from './world.js';
import {S, IR, glf} from './settings.js';
import {hAt} from './terrain.js';
import {scene, terrainUniforms} from './scene.js';

const SB = S.buildings;
const part = (g, x, y, z, ry = 0) => ({g, x, y, z, ry});
const box = (w, h, d, x = 0, y = 0, z = 0) => part(new THREE.BoxGeometry(w, h, d), x, y + h/2, z);
const cyl = (rt, rb, h, seg, x = 0, y = 0, z = 0, ry = 0) => part(new THREE.CylinderGeometry(rt, rb, h, seg), x, y + h/2, z, ry);

const FAMILIES = {
  block: ({w, d, h}) => [box(w, h, d), box(w*.7, h*.16, d*.7, 0, h)],
  bunker: ({w, d, h}) => [box(w*1.25, h*.5, d*1.25), box(w*.7, h*.3, d*.7, 0, h*.5), box(w*.5, h*.12, 1.4, 0, h*.18, d*.68)],
  tower: ({w, h}) => [cyl(w*.3, w*.45, h*1.3, 6), cyl(w*.48, w*.3, h*.2, 6, 0, h*1.3), cyl(.15, .15, 3, 4, 0, h*1.5)],
  lattice: ({w, d, h}) => {
    const p = [box(w, h*.07, d, 0, h), box(w*.95, .5, d*.95, 0, h*.5)];
    for (const i of [-1, 0, 1]) for (const j of [-1, 0, 1]) p.push(box(w*.13, h, d*.13, i*w*.4, 0, j*d*.4));
    return p;
  },
  facility: ({w, d, h}) => [box(w*1.1, h*.55, d), box(w*.5, h*.85, d*.5, w*.4, 0, -d*.2), cyl(.4, .4, h*1.15, 8, -w*.4, 0, -d*.3), box(w*.4, h*.2, 1.2, -w*.2, 0, d*.55)],
  citadel: ({w, h}) => {
    const p = [cyl(w*.95, w*1.02, h*.42, 5), box(w*.75, h, w*.75, 0, h*.42), box(w*.5, h*.28, 1.6, 0, 0, w*.92)];
    for (let i = 0; i < 5; i++){ const a = i*Math.PI*2/5 - Math.PI/2 + Math.PI/5; p.push(cyl(.9, 1.05, h*.7, 6, Math.cos(a)*w*1.0, 0, Math.sin(a)*w*1.0)); }
    p.push(box(.5, h*.22, .5, -w*.3, 0, w*.92 + 1.2), box(.5, h*.22, .5, w*.3, 0, w*.92 + 1.2));
    return p;
  },
  hut: ({w, d, h}) => [box(w*.8, h*.7, d*.8), cyl(0, w*.62, h*.45, 4, 0, h*.7, 0, Math.PI/4), box(.15, h*.9, .15, w*.25, h*.7, 0)]
};
const LANDMARKS = {
  spire: () => [cyl(4.5, 7, 6, 8), cyl(.25, 3, 26, 4, 0, 6, 0, Math.PI/4), cyl(8, 8, .5, 16, 0, 12), cyl(5.5, 5.5, .5, 12, 0, 19)],
  archive: () => [box(20, 3, 15), box(16.5, 3, 12.5, 0, 3), box(13, 3, 10, 0, 6), box(5, 15, 5, 0, 9), box(1, 8, 1, 0, 24)],
  foundry: () => [box(23, 8, 14), box(9, 4, 6, 6, 8, 3), cyl(1.5, 1.9, 24, 8, -8, 0, -3), cyl(1.5, 1.9, 20, 8, -3, 0, -3), cyl(1.5, 1.9, 16, 8, 2, 0, -3)]
};

const _m = new THREE.Matrix4(), _r = new THREE.Matrix4(), _v = new THREE.Vector3();
function collect(parts, ox, oy, oz, rot, bid, info, out){
  _r.makeRotationY(rot);
  for (const p of parts){
    const g = p.g.index ? p.g.toNonIndexed() : p.g.clone();
    _m.makeRotationY(p.ry).setPosition(p.x, p.y, p.z);
    g.applyMatrix4(_m); g.applyMatrix4(_r); g.translate(ox, oy, oz);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++){ out.fill.push(pos.getX(i), pos.getY(i), pos.getZ(i)); out.fillId.push(bid); }
    const e = new THREE.EdgesGeometry(g, SB.edgeAngle), ep = e.attributes.position;
    for (let i = 0; i < ep.count; i += 2){
      const ax = ep.getX(i), ay = ep.getY(i), az = ep.getZ(i), bx = ep.getX(i+1), by = ep.getY(i+1), bz = ep.getZ(i+1);
      const len = Math.hypot(bx-ax, by-ay, bz-az);
      out.edge.push(ax, ay, az, bx, by, bz); out.edgeId.push(bid, bid); out.edgeLD.push(0, len); out.edgeInfo.push(...info, ...info);
      out.top = Math.max(out.top, ay, by);
    }
    g.dispose(); e.dispose(); p.g.dispose();
  }
}
const newOut = () => ({fill:[], fillId:[], edge:[], edgeId:[], edgeLD:[], edgeInfo:[], top:-1e9});
function lineInfo(b){
  const age = b.params.age, bright = Math.max(SB.ageMinBrightness, 1 - age*SB.ageDim);
  if (b.status === 'archived') return [bright*.55, 1.3, 0];
  if (b.status === 'classified') return [.55, 0, 1];
  return [bright * (b.status === 'stable' ? 1.1 : 1), 0, 0];
}
/** Footprint-aware base height: lowest sampled ground under the building. */
export function baseHeight(x, z, r){
  let m = hAt(x, z);
  for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r]]) m = Math.min(m, hAt(x + dx, z + dz));
  return m - .5;
}

const VERT_COMMON = `uniform float uHide; attribute float aBid; varying float vBid; varying float vCd;`;
const fillMat = new THREE.ShaderMaterial({
  uniforms: {uHide:{value:-9}, uHover:{value:-9}, uFog:terrainUniforms.uFog, uIntro:terrainUniforms.uIntro},
  vertexShader: `${VERT_COMMON} varying vec3 vW;
    void main(){ vBid = aBid; vW = position; vec4 w = modelMatrix*vec4(position,1.0); vCd = distance(cameraPosition, w.xyz);
      gl_Position = abs(aBid-uHide) < .5 ? vec4(2.0,2.0,2.0,1.0) : projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform float uHover; uniform vec2 uFog; uniform float uIntro; varying float vBid; varying float vCd; varying vec3 vW;
    void main(){
      float hov = abs(vBid-uHover) < .5 ? 1.0 : 0.0;
      vec3 c = vec3(${glf(SB.fillBrightness)}) + vec3(0.05,0.022,0.008)*hov*0.6;
      float rev = 1.0 - smoothstep(uIntro*${IR} - 50.0, uIntro*${IR}, length(vW.xz));
      gl_FragColor = vec4(c * (1.0 - smoothstep(uFog.x, uFog.y, vCd)) * rev, 1.0);
    }`,
  polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1
});
const edgeMat = new THREE.ShaderMaterial({
  uniforms: {uHide:{value:-9}, uHover:{value:-9}, uTime:{value:0}, uSignal:{value:new THREE.Color(0xff6a1a)}, uFog:terrainUniforms.uFog, uIntro:terrainUniforms.uIntro},
  vertexShader: `${VERT_COMMON} attribute float aLD; attribute vec3 aInfo; varying float vLD; varying vec3 vInfo; varying vec3 vW;
    void main(){ vBid = aBid; vLD = aLD; vInfo = aInfo; vW = position; vec4 w = modelMatrix*vec4(position,1.0); vCd = distance(cameraPosition, w.xyz);
      gl_Position = abs(aBid-uHide) < .5 ? vec4(2.0,2.0,2.0,1.0) : projectionMatrix*viewMatrix*w; }`,
  fragmentShader: `uniform float uHover, uTime; uniform vec3 uSignal; uniform vec2 uFog; uniform float uIntro; varying float vBid, vLD, vCd; varying vec3 vInfo; varying vec3 vW;
    void main(){
      if (vInfo.y > 0.0 && mod(vLD, vInfo.y*2.0) > vInfo.y) discard;
      float hov = abs(vBid-uHover) < .5 ? 1.0 : 0.0;
      float a = vInfo.x;
      if (vInfo.z > 0.5) a *= 0.55 + 0.45*step(0.5, fract(sin(vBid*12.9898 + floor(uTime*${glf(SB.flickerRate)})*3.1)*43758.5453));
      vec3 c = mix(vec3(${glf(SB.edgeBrightness)})*a, uSignal, hov);
      c += hov*vec3(0.25,0.08,0.0);
      float rev = 1.0 - smoothstep(uIntro*${IR} - 50.0, uIntro*${IR}, length(vW.xz));
      gl_FragColor = vec4(c * (1.0 - smoothstep(uFog.x, uFog.y, vCd)) * rev, 1.0);
    }`
});
export const buildingMats = {fillMat, edgeMat};

function toMeshes(out, parent){
  const fg = new THREE.BufferGeometry();
  fg.setAttribute('position', new THREE.Float32BufferAttribute(out.fill, 3));
  fg.setAttribute('aBid', new THREE.Float32BufferAttribute(out.fillId, 1));
  const eg = new THREE.BufferGeometry();
  eg.setAttribute('position', new THREE.Float32BufferAttribute(out.edge, 3));
  eg.setAttribute('aBid', new THREE.Float32BufferAttribute(out.edgeId, 1));
  eg.setAttribute('aLD', new THREE.Float32BufferAttribute(out.edgeLD, 1));
  eg.setAttribute('aInfo', new THREE.Float32BufferAttribute(out.edgeInfo, 3));
  const fill = new THREE.Mesh(fg, fillMat), edges = new THREE.LineSegments(eg, edgeMat);
  fill.frustumCulled = edges.frustumCulled = false; fill.renderOrder = 1; edges.renderOrder = 2;
  parent.add(fill, edges); return [fill, edges];
}

function place(b, out, bid){
  const parts = FAMILIES[b.family]?.(b.params) || FAMILIES.block(b.params);
  const r = Math.max(b.params.w, b.params.d) * .6;
  b.base = baseHeight(b.x, b.z, r);
  const rot = b.flagship ? 0 : b.params.rot;
  out.top = -1e9;
  collect(parts, b.x, b.base, b.z, rot, bid, lineInfo(b), out);
  b.top = out.top;
  b.rot = rot;
  b.height = b.top - b.base;
}

export const buildingGroup = new THREE.Group(); scene.add(buildingGroup);
export function buildWorld(){
  const out = newOut();
  for (const b of BUILDINGS) place(b, out, b.index);
  for (const r of REGIONS){
    const parts = (LANDMARKS[r.landmark] || LANDMARKS.spire)();
    out.top = -1e9;
    collect(parts, r.x, r.h - .4, r.z, 0, -2 - r.index, [SB.landmarkBrightness, 0, 0], out);
    r.landmarkTop = out.top;
  }
  toMeshes(out, buildingGroup);
}
/** Sharp copy of one building for the focus pass. */
export function buildFocusMeshes(b){
  const out = newOut(), g = new THREE.Group();
  place(b, out, b.index);
  toMeshes(out, g);
  return g;
}
buildWorld();

export function setHover(id){ fillMat.uniforms.uHover.value = id; edgeMat.uniforms.uHover.value = id; }
export function setHidden(id){ fillMat.uniforms.uHide.value = id; edgeMat.uniforms.uHide.value = id; }
/** World position of a flagship's gate (local +z of the citadel). */
export const gatePoint = b => new THREE.Vector3(b.x, b.base + b.height*.15, b.z + b.params.w*.92 + 1);

/* ================= DECALS: static text / image objects in the world (config/decals.yml) =================
   Not UI and not clickable. face "ground" drapes a grid over the terrain like map lettering;
   face "upright" stands a flat panel on the ground. Colours and fonts come from the :root CSS vars. */
import * as THREE from 'three';
import {DECALS} from './world.js';
import {IR} from './settings.js';
import {hAt} from './terrain.js';
import {scene, renderer, terrainUniforms} from './scene.js';
import {baseHeight} from './buildings.js';

const LIFT = .4, STEP = 1.5, PX = 128, MAX_TEX = 4096;
const css = getComputedStyle(document.documentElement);
const cssVar = name => css.getPropertyValue('--' + name).trim();
const ANISO = renderer.capabilities.getMaxAnisotropy();

const mat = (tex, d) => new THREE.ShaderMaterial({
  uniforms: {tMap:{value:tex}, uColor:{value:new THREE.Color(cssVar(d.color) || '#f2f2f2')}, uTint:{value: d.kind === 'text' ? 1 : 0},
    uOpacity:{value:d.opacity}, uFog:terrainUniforms.uFog, uIntro:terrainUniforms.uIntro},
  vertexShader: `varying vec2 vUv; varying float vCd; varying vec3 vW;
    void main(){ vUv = uv; vW = position; vCd = distance(cameraPosition, position); gl_Position = projectionMatrix*viewMatrix*vec4(position,1.0); }`,
  fragmentShader: `uniform sampler2D tMap; uniform vec3 uColor; uniform float uTint, uOpacity, uIntro; uniform vec2 uFog; varying vec2 vUv; varying float vCd; varying vec3 vW;
    void main(){
      vec4 t = texture2D(tMap, vUv);
      float rev = 1.0 - smoothstep(uIntro*${IR} - 50.0, uIntro*${IR}, length(vW.xz));
      float a = t.a * uOpacity * (1.0 - smoothstep(uFog.x, uFog.y, vCd)) * rev;
      if (a < 0.004) discard;
      gl_FragColor = vec4(mix(t.rgb, uColor, uTint), a);
    }`,
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1
});

/** Grid of W×H world units centred on (x,z), rotated by rot. Ground: draped on hAt. Upright: standing on the lowest ground. */
function geometry(d, W, H){
  const a = d.rot * Math.PI / 180, c = Math.cos(a), s = Math.sin(a), up = d.face === 'upright';
  const nu = up ? 1 : Math.max(1, Math.ceil(W / STEP)), nv = up ? 1 : Math.max(1, Math.ceil(H / STEP));
  const base = up ? baseHeight(d.x, d.z, W / 2) + .5 : 0;
  const pos = [], uv = [], idx = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++){
    const u = (i / nu - .5) * W, v = (j / nv - .5) * H;
    // text right = local +x, text top = local -z (north, away from the default camera) or +y when upright
    const lz = up ? 0 : -v, x = d.x + u * c + lz * s, z = d.z - u * s + lz * c;
    pos.push(x, up ? base + v + H / 2 : hAt(x, z) + LIFT, z); uv.push(i / nu, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++){
    const p = j * (nu + 1) + i, q = p + nu + 1;
    idx.push(p, p + 1, q, q, p + 1, q + 1);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  return g;
}

function add(d, tex, W, H){
  tex.anisotropy = ANISO; tex.needsUpdate = true;
  const m = new THREE.Mesh(geometry(d, W, H), mat(tex, d));
  m.frustumCulled = false; m.renderOrder = 4; scene.add(m);
}

/** White text on a transparent canvas (tinted in the shader); font size scales down to fit the texture limit. */
function textCanvas(d, family){
  const lines = d.text.split('\n'), cv = document.createElement('canvas'), g = cv.getContext('2d');
  let px = PX;
  g.font = `${d.weight} ${px}px ${family}`;
  const w0 = Math.max(...lines.map(l => g.measureText(l).width));
  if (w0 + px * .5 > MAX_TEX) px = Math.floor(px * MAX_TEX / (w0 + px * .5));
  const font = `${d.weight} ${px}px ${family}`, lh = px * 1.2, pad = px * .25;
  g.font = font;
  cv.width = Math.ceil(Math.max(...lines.map(l => g.measureText(l).width)) + pad * 2);
  cv.height = Math.min(MAX_TEX, Math.ceil(lh * lines.length + pad * 2));
  g.font = font; g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  lines.forEach((l, i) => g.fillText(l, cv.width / 2, pad + lh * (i + .5)));
  return {cv, px};
}

const loader = new THREE.TextureLoader();
const imageUrl = src => /^(https?:)?\/|^data:/.test(src) ? src : import.meta.env.BASE_URL + src;

for (const d of DECALS){
  if (d.kind === 'image'){
    loader.load(imageUrl(d.image), tex => add(d, tex, d.size, d.size * tex.image.height / tex.image.width),
      undefined, () => console.warn(`decal ${d.id}: cannot load ${d.image}`));
    continue;
  }
  const family = cssVar('f-' + d.font) || 'sans-serif';
  // draw only after the web font is in, otherwise the canvas bakes the fallback face
  document.fonts.load(`${d.weight} ${PX}px ${family}`, d.text).catch(() => {}).then(() => {
    const {cv, px} = textCanvas(d, family), k = d.size / px;
    add(d, new THREE.CanvasTexture(cv), cv.width * k, cv.height * k);
  });
}

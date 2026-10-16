/* ================= TERRAIN (analytic, world-coordinate heightfield) =================
   The same function exists on the CPU (hAt, for picking/anchors/minimap) and in GLSL (vertex shader).
   Hash uses 32-bit integer math on both sides so heights match. */
import {REGIONS} from './world.js';

export const PAD_IN = 30, PAD_OUT = 58, MAX_PADS = 16;

function hash(ix, iy){ let h = (Math.imul(ix,374761393) + Math.imul(iy,668265263))|0; h = Math.imul(h ^ (h>>>13), 1274126177); h ^= h>>>16; return (h>>>0)/4294967296; }
function vnoise(x, y){
  const xi = Math.floor(x), yi = Math.floor(y), xf = x-xi, yf = y-yi;
  const u = xf*xf*(3-2*xf), v = yf*yf*(3-2*yf);
  const a = hash(xi,yi), b = hash(xi+1,yi), c = hash(xi,yi+1), d = hash(xi+1,yi+1);
  return a + (b-a)*u + (c-a)*v + (a-b-c+d)*u*v;
}
function fbm(x, y){ let s=0, a=.5, f=1; for (let o=0;o<5;o++){ s += a*vnoise(x*f, y*f); f *= 2.03; a *= .5; } return s; }
function raw(x, z){
  const n = fbm(x*0.0065+3.1, z*0.0065-1.7);
  const r = fbm(x*0.003+11.3, z*0.003+5.9);
  const ridge = 1 - Math.abs(r*2-1);
  return n*66 + ridge*ridge*36 - 9;
}
// Landmark pads: flat, terraced plateaus at every region centre, blended smoothly into the surrounding ground.
export const PADS = REGIONS.slice(0, MAX_PADS).map(r => { r.h = 2*Math.round(raw(r.x, r.z)/2) + 1; return [r.x, r.z, r.h]; });

export function hAt(x, z){
  let h = raw(x, z);
  for (const [px, pz, ph] of PADS){
    const d = Math.hypot(x-px, z-pz);
    if (d < PAD_OUT){ let t = (PAD_OUT-d)/(PAD_OUT-PAD_IN); t = t<0?0:t>1?1:t; t = t*t*(3-2*t); h += (ph-h)*t; }
  }
  return h;
}
export const meters = h => Math.round(h*10 + 120);
export const gridRef = v => String(Math.max(0, Math.round((v+1500)*10))).padStart(5,'0');

export const HEIGHT_GLSL = `
  uniform vec3 uPads[${MAX_PADS}];
  uniform int uPadN;
  float hashU(ivec2 p){
    uint h = uint(p.x)*374761393u + uint(p.y)*668265263u;
    h = (h ^ (h>>13u))*1274126177u; h ^= h>>16u;
    return float(h)/4294967296.0;
  }
  float vnoiseU(vec2 p){
    ivec2 i = ivec2(floor(p)); vec2 f = p - floor(p);
    vec2 u = f*f*(3.0-2.0*f);
    float a = hashU(i), b = hashU(i+ivec2(1,0)), c = hashU(i+ivec2(0,1)), d = hashU(i+ivec2(1,1));
    return a + (b-a)*u.x + (c-a)*u.y + (a-b-c+d)*u.x*u.y;
  }
  float fbmU(vec2 p){ float s=0.0, a=0.5, f=1.0; for(int o=0;o<5;o++){ s += a*vnoiseU(p*f); f*=2.03; a*=0.5; } return s; }
  float heightAt(vec2 p){
    float n = fbmU(p*0.0065+vec2(3.1,-1.7));
    float r = fbmU(p*0.003+vec2(11.3,5.9));
    float ridge = 1.0 - abs(r*2.0-1.0);
    float h = n*66.0 + ridge*ridge*36.0 - 9.0;
    for(int k=0;k<${MAX_PADS};k++){
      if(k>=uPadN) break;
      float d = distance(p, uPads[k].xy);
      float t = clamp((${PAD_OUT.toFixed(1)}-d)/(${(PAD_OUT-PAD_IN).toFixed(1)}), 0.0, 1.0);
      t = t*t*(3.0-2.0*t);
      h += (uPads[k].z - h)*t;
    }
    return h;
  }`;

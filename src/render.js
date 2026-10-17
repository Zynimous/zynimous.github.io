/* ================= RENDER: direct in explore mode; in focus mode the world goes to a half-res target,
   gets blurred + fogged to black, and the focused building is drawn sharp on top ================= */
import * as THREE from 'three';
import {ST} from './state.js';
import {renderer, scene, camera} from './scene.js';
import {S, glf} from './settings.js';
import {setHidden, buildFocusMeshes} from './buildings.js';
import {ease, clamp} from './camera.js';

const rt = new THREE.WebGLRenderTarget(2, 2, {samples: 4, depthBuffer: true});
const quadScene = new THREE.Scene(), quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const quadMat = new THREE.ShaderMaterial({
  uniforms: {tMap:{value:rt.texture}, uAmt:{value:0}, uTex:{value:new THREE.Vector2(1, 1)}, uAnchor:{value:new THREE.Vector2(.4, .45)}},
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
  fragmentShader: `uniform sampler2D tMap; uniform float uAmt; uniform vec2 uTex; uniform vec2 uAnchor; varying vec2 vUv;
    void main(){
      float far = smoothstep(0.12, 0.95, vUv.y);
      float rad = uAmt * (${glf(S.focus.blurNear)} + ${glf(S.focus.blurFar - S.focus.blurNear)}*far);
      vec3 base = texture2D(tMap, vUv).rgb, c = base*2.0; float tw = 2.0;
      for (int i = 0; i < 14; i++){
        float a = float(i)*2.399963, r = sqrt((float(i)+0.5)/14.0);
        c += texture2D(tMap, vUv + vec2(cos(a), sin(a))*r*rad*uTex).rgb; tw += 1.0;
      }
      c /= tw;
      float edge = smoothstep(0.35, 0.95, distance(vUv*vec2(1.0, 0.8), uAnchor*vec2(1.0, 0.8)));
      float fog = uAmt * clamp(0.3 + 0.7*far + 0.6*edge, 0.0, 1.0);
      c *= (1.0 - ${glf(S.focus.fog)}*fog) * (1.0 - 0.3*uAmt);
      gl_FragColor = vec4(c, 1.0);
    }`,
  depthTest: false, depthWrite: false
});
quadScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), quadMat));
const focusScene = new THREE.Scene();
let focusMeshes = null, focusId = null;

export function resizeRender(){
  const w = Math.max(2, Math.floor(ST.Wd*renderer.getPixelRatio()/2)), h = Math.max(2, Math.floor(ST.Hd*renderer.getPixelRatio()/2));
  rt.setSize(w, h); quadMat.uniforms.uTex.value.set(1/w, 1/h);
}
addEventListener('resize', resizeRender); resizeRender();

export function render(){
  const amt = ease(clamp(ST.focusAmt, 0, 1));
  if (amt < .002 || !ST.focusB){
    setHidden(-9); renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera); return;
  }
  if (focusId !== ST.focusB.id){
    if (focusMeshes){ focusScene.remove(focusMeshes); focusMeshes.traverse(o => o.geometry?.dispose()); }
    focusMeshes = buildFocusMeshes(ST.focusB); focusScene.add(focusMeshes); focusId = ST.focusB.id;
  }
  setHidden(ST.focusB.index);
  renderer.setRenderTarget(rt); renderer.clear(); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.clear();
  quadMat.uniforms.uAmt.value = amt;
  quadMat.uniforms.uAnchor.value.set(.4 + (ST.Wd < 760 ? .1 : 0), ST.Wd < 760 ? .7 : .45);
  renderer.render(quadScene, quadCam);
  setHidden(-9);
  renderer.clearDepth(); renderer.render(focusScene, camera);
}

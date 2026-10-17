/* ================= BOARDS: markdown notes on a backing plate, placed in the world (content/boards/*.md) =================
   Real DOM (crisp text at any zoom, selectable links, indexable) positioned with CSS3D so a board lies on the map
   (face "ground") or stands on it (face "upright") and moves with the camera like any other world object.
   The layer sits above the canvas, so place boards on open ground: buildings can't occlude them. */
import {CSS3DRenderer, CSS3DObject} from 'three/addons/renderers/CSS3DRenderer.js';
import * as THREE from 'three';
import {ST} from './state.js';
import {$, esc} from './core.js';
import {BOARDS} from './world.js';
import {S} from './settings.js';
import {hAt} from './terrain.js';
import {camera, terrainUniforms, FOG_NEAR, FOG_FAR} from './scene.js';
import {baseHeight} from './buildings.js';
import {smooth} from './camera.js';
import {navigate} from './router.js';

const css = new CSS3DRenderer();
css.domElement.id = 'boards';
document.body.insertBefore(css.domElement, $('labels'));
const cssScene = new THREE.Scene();
const resize = () => css.setSize(innerWidth, innerHeight);
addEventListener('resize', resize); resize();

const items = BOARDS.map(d => {
  const el = document.createElement('article');
  el.className = 'board';
  el.style.width = d.px + 'px';
  const head = d.title || d.kicker ? `<header>${d.kicker ? `<div class="bd-k">${esc(d.kicker)}</div>` : ''}${d.title ? `<h3>${esc(d.title)}</h3>` : ''}</header>` : '';
  el.innerHTML = `${head}<div class="p-body bd-body">${d.html}</div>`;
  const o = new CSS3DObject(el), s = d.width / d.px * S.labels.boardScale, a = d.rot * Math.PI / 180;
  o.scale.setScalar(s);
  o.rotation.order = 'YXZ'; o.rotation.y = a;
  if (d.face === 'upright'){
    // bottom edge on the lowest ground under the board; height follows the rendered content
    const base = baseHeight(d.x, d.z, d.width * S.labels.boardScale / 2) + .5;
    o.position.set(d.x, base, d.z);
    new ResizeObserver(() => { o.position.y = base + el.offsetHeight * s / 2; }).observe(el);
  } else {
    // lie flat (text top = north), just above the highest ground under it
    o.rotation.x = -Math.PI / 2;
    const r = d.width * S.labels.boardScale / 2;
    const top = Math.max(...[[0, 0], [r, 0], [-r, 0], [0, r], [0, -r]].map(([dx, dz]) => hAt(d.x + dx, d.z + dz)));
    o.position.set(d.x, top + .6, d.z);
  }
  cssScene.add(o);
  return {d, el, o, op: -1};
});

// internal links travel on the map instead of reloading the page
css.domElement.addEventListener('click', e => {
  const a = e.target.closest('a[href^="/"]'); if (!a) return;
  e.preventDefault(); navigate(a.getAttribute('href'), 'push');
});

/** Per frame: distance fog + intro reveal as opacity, then the CSS3D pass. */
export function updateBoards(){
  if (!items.length || ST.focusAmt > .98) return;
  const R = terrainUniforms.uIntro.value * S.map.introRadius;
  for (const it of items){
    const {x, y, z} = it.o.position;
    const fog = 1 - smooth(FOG_NEAR, FOG_FAR, camera.position.distanceTo(it.o.position));
    const op = Math.round(fog * (1 - smooth(R - 50, R, Math.hypot(x, z))) * 100) / 100;
    it.o.visible = op > .01;
    if (op !== it.op){ it.el.style.opacity = op; it.op = op; }
  }
  // the focus pose shifts the frame with setViewOffset, which CSS3DRenderer doesn't know about
  const v = camera.view?.enabled ? camera.view : null;
  css.domElement.style.transform = v ? `translate(${-v.offsetX}px,${-v.offsetY}px)` : '';
  css.render(cssScene, camera);
}

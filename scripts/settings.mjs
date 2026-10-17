// Tunables (config/settings.yml) merged over these defaults. Every key in the YAML must exist here,
// so a typo fails the build instead of being silently ignored.
import fs from 'node:fs';
import path from 'node:path';
import YAML from 'yaml';

export const DEFAULTS = {
  camera: {
    fov: 42, far: 3200, pixelRatioMax: 2,
    zoomMin: 55, zoomMax: 520,
    elevNear: 66, elevFar: 50,
    worldZoom: 400, regionZoom: 125, buildingZoom: 70,
    bootZoom: 150, bootRegionZoom: 125,
    flyMs: 850
  },
  controls: {
    keyPanSpeed: 1, keyZoomSpeed: 1.3, dragPanSpeed: 1, wheelZoomSpeed: .0016,
    clickMaxMove: 6, clickMaxMs: 500,
    reachBand: 38, reachMaxOver: 260, reachSpring: 5
  },
  focus: {
    elev: 20, frameScale: 2.5, framePad: 16, lookHeight: .42,
    blendSec: .95, glide: 4.5, offsetX: .1, offsetYMobile: .2,
    orbitAz: .9, orbitElMin: -.08, orbitElMax: .22, orbitDragSpeed: .005, orbitTiltSpeed: .002, orbitWheelSpeed: .0006,
    blurNear: 1.2, blurFar: 7.2, fog: .9
  },
  tour: {waitSec: 2.8},
  terrain: {
    scale: .0065, amplitude: 66, ridgeScale: .003, ridgeAmplitude: 36, baseOffset: -9,
    octaves: 5, lacunarity: 2.03, gain: .5,
    noiseOffset: [3.1, -1.7], ridgeOffset: [11.3, 5.9],
    padIn: 30, padOut: 58,
    clipLevels: 5, clipCells: 128
  },
  map: {
    fogNear: 260, fogFar: 980,
    contourScale: .8667, lineColor: '#c7c7c2', lineEnergy: .42, minorStrength: .55, majorStrength: 1, haloStrength: .12,
    cursorRadius: 45, cursorGlow: 1, focusRadius: 65, focusGlow: .75,
    gridSize: 40, gridStrength: .055,
    introSpeed: .75, introRadius: 560
  },
  borders: {
    width: .8, lift: .55, tieEvery: 7, tieLength: 5.2, tieWidth: .6, color: '#f2f2f2',
    roadDash: 3.2, roadGap: 2.6, roadSpeed: 5, roadOpacity: .85, roadBend: 14,
    padRingOpacity: .55
  },
  buildings: {
    scale: 1, widthMin: 5.5, widthMax: 11.5, wordsPerWidth: 8, depthJitter: [.8, 1.2],
    articleHeight: 5, heightPerMinute: 1.1, projectHeight: 9, flagshipBonus: 5, noteHeight: 4,
    heightJitter: [.8, 1.3], heightMax: 22,
    readCjkPerMin: 450, readLatinPerMin: 220,
    edgeBrightness: .81, fillBrightness: .024, landmarkBrightness: 1.15, edgeAngle: 20,
    ageDim: .5, ageMinBrightness: .35, ageDays: 365, flickerRate: 3
  },
  labels: {itemsHideZoom: 260, gap: 8, newDays: 21}
};

export function readSettings(root){
  const p = path.join(root, 'config/settings.yml');
  const user = fs.existsSync(p) ? YAML.parse(fs.readFileSync(p, 'utf8')) || {} : {};
  const errors = [];
  const merge = (def, val, at) => {
    if (val == null) return structuredClone(def);
    if (Array.isArray(def)){
      if (!Array.isArray(val) || val.length !== def.length || val.some(v => typeof v !== 'number')) errors.push(`${at}: expected ${def.length} numbers`);
      return val;
    }
    if (typeof def === 'object'){
      if (typeof val !== 'object' || Array.isArray(val)){ errors.push(`${at}: expected a section`); return structuredClone(def); }
      for (const k of Object.keys(val)) if (!(k in def)) errors.push(`${at ? at + '.' : ''}${k}: unknown setting`);
      return Object.fromEntries(Object.keys(def).map(k => [k, merge(def[k], val[k], at ? at + '.' + k : k)]));
    }
    if (typeof val !== typeof def){ errors.push(`${at}: expected a ${typeof def}`); return def; }
    return val;
  };
  const s = merge(DEFAULTS, user, '');
  if (s.terrain.clipCells % 4) errors.push('terrain.clipCells: must be a multiple of 4');
  if (errors.length) throw new Error('Settings errors (config/settings.yml):\n  ' + errors.join('\n  '));
  return s;
}

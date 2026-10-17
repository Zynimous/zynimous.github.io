/* Tunables from config/settings.yml (merged over the defaults in scripts/settings.mjs at build time). */
import {M} from './world.js';

export const S = M.settings;
/** Number → GLSL float literal (shader constants are baked in from settings). */
export const glf = n => { const s = String(n); return /[.e]/.test(s) ? s : s + '.0'; };
/** Intro reveal radius as a GLSL literal (shared by every world shader). */
export const IR = glf(S.map.introRadius);
/** '#rrggbb' → 'vec3(r,g,b)' with raw (non colour-managed) channels. */
export const glc = hex => { const n = parseInt(hex.slice(1), 16); return `vec3(${[16, 8, 0].map(s => glf(((n >> s) & 255)/255)).join(',')})`; };

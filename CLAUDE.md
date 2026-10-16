# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Zynimous Sandbox": a single-page, interactive 3D topographic-map homepage for zynimous.dev. Every content file (article, project, note) is one **building** on a procedurally generated, endless terrain; buildings live in **regions** (Hub, Blog District, Project District, …) separated by white borders. Clicking a building enters **focus mode**: low camera, background blurred/fogged, content panel on the right. The whole site is one page (History API routing); the only real navigation is a flagship project's "出境" to its product site. UI copy is Traditional Chinese (`lang="zh-Hant"`) mixed with military/HUD-style English labels. Current content is placeholder (marked 示範內容).

## Project decisions (agreed with the owner)

- **Identity:** Zynimous is an anonymous software-engineering persona (never "Zynixmous"; never a real name). The site is the persona's "face" and should build reputation in the dev community. It must look striking and stay clear first. SEO should bring in as much organic traffic as possible, but it must never constrain the design.
- **Hosting:** everything is static: no backend, free hosting. The domain is on Cloudflare, repos are on GitHub, and product sites go on GitHub Pages.
- **v1 URL map:** `/` (this map homepage), `/about` (contact included), `/blogs`, `/blogs/<slug>`, `/projects` (showcase index), `/projects/<slug>` (a shared template page, only for projects *without* their own site), and `<name>.zynimous.dev` (optional, the most detailed and stylized product site for a project). Projects that have a product site link straight out to it from `/projects`. Blog and projects use paths, not subdomains. Zone `path`s and item `path`s in `js/data.js` should follow this map.
- **Homepage concept:** a free-canvas "war-game sandbox": a slightly tilted 2.5D contour battle map instead of a scrolling page. Sections are map zones, content appears as war-game label notes with small icons, and dashed guide paths connect the zones. Navigation is WASD or mouse drag, plus fixed HUD controls for jumping around. The main purpose is to show off.
- **Visual system:** restrained, oppressive black/grey/white with minimal color blocks and angular lines (no rounded corners). The palette lives in `:root` CSS vars: `--void #000` background, `--plate #070707` cards, `--rule #1c1c1c`/`--rule-hi #2a2a2a` lines, `--mute #8a8a8a` secondary text, `--ash #cfcfcf` light grey, `--ink #f2f2f2` text. The single exception is the glowing high-saturation orange contour lines (`--signal #ff6a1a`, the `uLine` shader uniform). Don't introduce other accent colors.
- **Fonts:** Orbitron for the logo, headings and card labels (`--f-display`); Prompt for body and long text, with Noto Sans TC as the Chinese fallback (`--f-body`); JetBrains Mono for code and small labels (`--f-mono`).
- **Still open:** homepage card copy, tagline, About content, and a possible "business card" feature later.

## Files and running

- `npm run dev` / `build` / `preview` (Vite 8, ES modules, `three` pinned to an exact version; `ColorManagement` is off and output is linear in `scene.js` to keep the old r128 colour look). No tests or linter. The dev server polls files because the repo lives on `/mnt/c` under WSL.
- **Content:** `content/{blogs,projects,notes}/*.md` (frontmatter: id, slug, type, title, summary, date required; see `scripts/manifest.mjs` for all fields). `config/regions.yml` (regions on a hex lattice, `slot` = spiral index) and `config/model-families.yml` (category → building family). `scripts/manifest.mjs` builds the manifest (via the `virtual:manifest` module in `vite.config.js`): parses/validates markdown, lays out borders + buildings, writes `layout.lock.json` (**commit it**: first-time coordinates are frozen so existing buildings never move; deleted content keeps its reserved spot). Editing content hot-reloads the page.
- `index.html` — shell + HUD markup. `src/style.css` — all styles (palette in `:root`).
- Static hosting: `vite build` also emits `404.html` and `_redirects` as SPA fallbacks (GitHub Pages / Cloudflare Pages).

## Architecture (`src/`)

`main.js` imports modules in dependency order; modules import each other explicitly (watch for import cycles: avoid touching another module's export at top level before it has evaluated). Cross-file mutable state lives in the `ST` object (`state.js`), because module bindings can't be reassigned from other files.

- **world.js** — manifest wrapper: `REGIONS`, `BUILDINGS`, `BORDERS`, lookups (`regionAt` = hex cell, `nearestRegion`), `limitToReach` (rubber-band limit at the outermost borders).
- **terrain.js** — analytic heightfield: CPU `hAt(x,z)` and the identical GLSL `HEIGHT_GLSL` (integer hash on both sides). Flat landmark pads at region centres. `hAt` is the single source of truth for ground height.
- **scene.js** — renderer, clipmap terrain (5 nested rings re-centred on the camera, height in the vertex shader, contour lines via `fwidth` in the fragment shader, black distance fog so no edge is ever visible), `dashMat`/`addLine` helpers.
- **buildings.js** — parametric families (block/bunker/tower/lattice/facility/citadel/hut + region landmarks), all merged into one fill mesh + one edge mesh; hover/hide driven by uniforms matched to the `aBid` vertex attribute. Edges grey-white, hover → `--signal` orange.
- **borders.js** — border ribbons + sleepers draped on terrain, roads (dashed, also the tour path). **trainlabel.js** — label that slides along the border nearest the screen centre.
- **signage.js** — screen-space HTML cards (board / label / dot) with priority, overlap avoidance, caps, and the "always something readable" edge arrow. **hud.js**, **palette.js**, **tour.js** — HUD, command palette, auto tour.
- **camera.js** — explore pose (`cam` target + `deff`, elevation 50°–66° by distance, raw position `rx/rz` vs rubber-banded `x/z`) and focus pose (≈20°, building at left 40% via `setViewOffset`). **focus.js** / **panel.js** / **router.js** / **render.js** — focus-mode state, content panel templates, History API routing (`/`, `/blogs`, `/blogs/<slug>`, `/projects/<slug>`, `/about`, …), and the half-res blur/fog compositing pass.
- **loop.js** — per-frame orchestration. **boot.js** — initial URL → camera/focus state, panel button wiring.

Conventions: `$` is a `getElementById` helper; reading/focus mode is `body.reading` (panel open) and `body.focus` (labels hidden); `prefers-reduced-motion` (`reduce`) skips boot animation and makes tweens/blends instant — preserve that when adding animation.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

"Zynimous Sandbox": a single-page, interactive 3D topographic-map homepage for zynimous.dev. The site's sections (HQ, Projects, About, Blogs) are "sectors" on a procedurally generated terrain; their entries are "intel files" that open in a side panel. UI copy is Traditional Chinese (`lang="zh-Hant"`) mixed with military/HUD-style English labels. Current content is placeholder (marked 示範內容).

## Project decisions (agreed with the owner)

- **Identity:** Zynimous is an anonymous software-engineering persona (never "Zynixmous"; never a real name). The site is the persona's "face" and should build reputation in the dev community. It must look striking and stay clear first. SEO should bring in as much organic traffic as possible, but it must never constrain the design.
- **Hosting:** everything is static: no backend, free hosting. The domain is on Cloudflare, repos are on GitHub, and product sites go on GitHub Pages.
- **v1 URL map:** `/` (this map homepage), `/about` (contact included), `/blogs`, `/blogs/<slug>`, `/projects` (showcase index), `/projects/<slug>` (a shared template page, only for projects *without* their own site), and `<name>.zynimous.dev` (optional, the most detailed and stylized product site for a project). Projects that have a product site link straight out to it from `/projects`. Blog and projects use paths, not subdomains. Zone `path`s and item `path`s in `js/data.js` should follow this map.
- **Homepage concept:** a free-canvas "war-game sandbox": a slightly tilted 2.5D contour battle map instead of a scrolling page. Sections are map zones, content appears as war-game label notes with small icons, and dashed guide paths connect the zones. Navigation is WASD or mouse drag, plus fixed HUD controls for jumping around. The main purpose is to show off.
- **Visual system:** restrained, oppressive black/grey/white with minimal color blocks and angular lines (no rounded corners). The palette lives in `:root` CSS vars: `--void #000` background, `--plate #070707` cards, `--rule #1c1c1c`/`--rule-hi #2a2a2a` lines, `--mute #8a8a8a` secondary text, `--ash #cfcfcf` light grey, `--ink #f2f2f2` text. The single exception is the glowing high-saturation orange contour lines (`--signal #ff6a1a`, the `uLine` shader uniform). Don't introduce other accent colors.
- **Fonts:** Orbitron for the logo, headings and card labels (`--f-display`); Prompt for body and long text, with Noto Sans TC as the Chinese fallback (`--f-body`); JetBrains Mono for code and small labels (`--f-mono`).
- **Still open:** homepage card copy, tagline, About content, and a possible "business card" feature later.

## Files and running

- `index.html` — page shell only: `<head>`, HUD markup, one `<script type="module" src="/src/main.js">`.
- `src/style.css` — all styles (palette in `:root`).
- `src/*.js` — ES modules, one per section: `core`, `state` (shared mutable `ST` object: module bindings can't be reassigned across files, so cross-file mutable state like `ST.tween`, `ST.activeZone`, `ST.curItem` lives there), `data`, `terrain`, `scene`, `labels`, `camera`, `picking`, `input`, `hud`, `intel`, `palette`, `tour`, `loop`, `boot`; `main.js` imports them in dependency order. Mind import cycles: a module that touches another's exports at top level must come after it.
- Vite (`npm run dev` / `build` / `preview`); three.js is an npm dependency pinned to an exact version (`ColorManagement` is disabled and output is linear in `scene.js` to keep the old r128 colour look). `file://` no longer works. The dev server uses polling because the repo lives on `/mnt/c` under WSL.
- The v2 redesign (buildings, districts, focus mode, content from Markdown) is specified in the owner's v2 spec and being implemented in phases P0–P7; P0 (this module split) is done.

## Architecture (the `js/` files)

Each section below is its own file (banner comment kept at top), in this order:

- **DATA** — `ZONES` (sector id, hotkey `key` 1–4, world `x`/`z`, radius `R`, fort polygon side count `n`, icon) and `ITEMS` (intel files; `zone` links to a zone id, `body` is raw HTML injected via `innerHTML`). `ZONE_SUB` holds per-zone subtitle text and must be kept in sync manually when items change. Item world positions are *not* in the data — they are assigned radially around their zone in the forts code (`it.x/it.z/it.h`).
- **TERRAIN** — deterministic value-noise fbm heightfield (`raw`), flattened into plateaus around each zone (`Hgt`), sampled into a `Float32Array` grid; `hAt(x,z)` bilinearly samples it and is the single source of truth for ground height (mesh vertices, minimap, readouts, picking). World is `S=640` units square; display meters = `h*10+120`.
- **THREE** — terrain is one `PlaneGeometry` with a custom `ShaderMaterial` that draws contour lines via `fwidth`, plus cursor/focus glow, fog, edge fade and the radial intro reveal (`uIntro`). Forts, routes and rings are line geometry draped on terrain via `addLine`; `dashMat` creates animated dashed-line shaders, all collected in `dashMats` and ticked each frame.
- **LABELS** — HTML overlay tags (zone cards, item cards, spot heights) projected from 3D to screen each frame. Each label has an `alpha()` function driving visibility; this is how semantic zoom works.
- **CAMERA STATE** — camera is orbit-less: `cam {x, z, deff}` (target point + effective distance, clamped `D_MIN..D_MAX`). `flyTo`/`flyToZone`/`flyWorld` create a `tween`; any user input cancels the tween and the auto tour (`userInput`).
- **INPUT / PALETTE / TOUR** — keyboard (WASD/arrows pan, Q/E zoom, 1–4 zones, 0/Esc world, T tour, Ctrl+K or `/` command palette, ←/→ step intel files while reading), pointer drag/pinch, wheel. Palette `ENTRIES` are derived from `ZONES` + `ITEMS`.
- **LOOP** — `frame()` does everything per frame: input → tween → bounds → tour → per-zone `detail` (semantic zoom factor from camera distance & proximity; drives detail-line opacity and item-label alpha) → shader uniforms → render → label projection → HUD readouts/scale bar → minimap.
- **BOOT** — deep links: `location.hash` may be a zone id or item id (item opens its intel panel). The loop keeps the hash updated via `history.replaceState`.

Conventions: `$` is a `getElementById` helper; reading mode is the `body.reading` class; `prefers-reduced-motion` (`reduce`) skips the boot animation and makes tweens instant — preserve that when adding animation.

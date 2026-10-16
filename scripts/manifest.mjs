// Build-time content pipeline: content/*.md + config/*.yml -> manifest (buildings, regions, borders).
// Deterministic; placement is frozen in layout.lock.json so existing buildings never move.
import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import MarkdownIt from 'markdown-it';
import YAML from 'yaml';

const TYPE_DIR = {article: 'blogs', project: 'projects', note: 'notes'};
const TYPE_REGION = {article: 'blogs', project: 'projects', note: 'hub'};
const STATUSES = ['active', 'stable', 'archived', 'classified'];
const md = new MarkdownIt({html: false, linkify: true, typographer: false});

// ---- deterministic hash / rng (mulberry32 over string seed)
function hashStr(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rng(seed){ let a = hashStr(String(seed)); return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const r1 = n => Math.round(n * 10) / 10;

// ---- hex lattice (axial coords, spiral order)
const AX_DIRS = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
function spiralAxial(slot){
  if (slot === 0) return [0, 0];
  let ring = 1, left = slot - 1;
  while (left >= 6 * ring){ left -= 6 * ring; ring++; }
  let q = AX_DIRS[4][0] * ring, r = AX_DIRS[4][1] * ring; // start corner
  // walk ring: 6 sides
  const side = Math.floor(left / ring), step = left % ring;
  const walk = [2, 3, 4, 5, 0, 1];
  for (let s = 0; s < side; s++){ q += AX_DIRS[walk[s]][0] * ring; r += AX_DIRS[walk[s]][1] * ring; }
  q += AX_DIRS[walk[side]][0] * step; r += AX_DIRS[walk[side]][1] * step;
  return [q, r];
}
const axialToWorld = (q, r, D) => [D * (q + r / 2), D * (Math.sqrt(3) / 2) * r];
const axialKey = (q, r) => q + ',' + r;

function loadYaml(p){ return YAML.parse(fs.readFileSync(p, 'utf8')); }

function countWords(text){
  const cjk = (text.match(/[㐀-鿿豈-﫿]/g) || []).length;
  const latin = (text.replace(/[㐀-鿿豈-﫿]/g, ' ').match(/[A-Za-z0-9_]+/g) || []).length;
  return {cjk, latin, words: cjk + latin};
}

function readContent(root){
  const items = [], seenIds = new Set(), seenSlugs = new Set(), errors = [];
  for (const [type, dir] of Object.entries(TYPE_DIR)){
    const d = path.join(root, 'content', dir);
    if (!fs.existsSync(d)) continue;
    for (const f of fs.readdirSync(d).filter(n => n.endsWith('.md')).sort()){
      const rel = `content/${dir}/${f}`;
      const {data, content} = matter(fs.readFileSync(path.join(d, f), 'utf8'));
      const need = ['id', 'slug', 'type', 'title', 'summary', 'date'];
      const miss = need.filter(k => data[k] == null || data[k] === '');
      if (miss.length){ errors.push(`${rel}: missing ${miss.join(', ')}`); continue; }
      if (data.type !== type) errors.push(`${rel}: type "${data.type}" does not match folder (${type})`);
      if (seenIds.has(data.id)) errors.push(`${rel}: duplicate id ${data.id}`);
      if (seenSlugs.has(type + '/' + data.slug)) errors.push(`${rel}: duplicate slug ${data.slug}`);
      if (data.status && !STATUSES.includes(data.status)) errors.push(`${rel}: bad status ${data.status}`);
      seenIds.add(data.id); seenSlugs.add(type + '/' + data.slug);
      items.push({data, content, rel});
    }
  }
  if (errors.length) throw new Error('Content errors:\n  ' + errors.join('\n  '));
  return items;
}

// ---- decals: static text / image objects placed in the world (config/decals.yml, optional)
const DECAL_FACES = ['ground', 'upright'], DECAL_COLORS = ['ink', 'ash', 'mute', 'signal'], DECAL_FONTS = ['display', 'body', 'mono'];
function readDecals(root, byId){
  const p = path.join(root, 'config/decals.yml');
  if (!fs.existsSync(p)) return [];
  const list = loadYaml(p)?.decals || [], errors = [], seen = new Set();
  const out = list.map((d, i) => {
    const tag = `config/decals.yml: ${d.id || '#' + i}`;
    if (!d.id) errors.push(`${tag}: missing id`);
    else if (seen.has(d.id)) errors.push(`${tag}: duplicate id`);
    seen.add(d.id);
    if ((d.text == null) === (d.image == null)) errors.push(`${tag}: needs exactly one of text / image`);
    const reg = d.region ? byId[d.region] : null;
    if (d.region && !reg) errors.push(`${tag}: unknown region "${d.region}"`);
    const face = d.face || 'ground', color = d.color || 'ink', font = d.font || 'display';
    if (!DECAL_FACES.includes(face)) errors.push(`${tag}: bad face ${face}`);
    if (!DECAL_COLORS.includes(color)) errors.push(`${tag}: bad color ${color}`);
    if (!DECAL_FONTS.includes(font)) errors.push(`${tag}: bad font ${font}`);
    const text = d.text != null ? String(d.text) : null;
    return {
      id: String(d.id), kind: text != null ? 'text' : 'image', text, image: d.image || null,
      x: r1((reg ? reg.x : 0) + (+d.x || 0)), z: r1((reg ? reg.z : 0) + (+d.z || 0)),
      size: +d.size || (text != null ? 6 : 24), rot: +d.rot || 0, face, color, font,
      weight: d.weight || (font === 'display' ? 700 : 500), opacity: d.opacity ?? 1
    };
  });
  if (errors.length) throw new Error('Decal errors:\n  ' + errors.join('\n  '));
  return out;
}

// ---- boards: markdown notes on a backing plate, placed in the world (content/boards/*.md, optional)
function readBoards(root, byId){
  const d = path.join(root, 'content/boards');
  if (!fs.existsSync(d)) return [];
  const errors = [], seen = new Set(), out = [];
  for (const f of fs.readdirSync(d).filter(n => n.endsWith('.md')).sort()){
    const tag = `content/boards/${f}`;
    const {data, content} = matter(fs.readFileSync(path.join(d, f), 'utf8'));
    if (!data.id){ errors.push(`${tag}: missing id`); continue; }
    if (seen.has(data.id)) errors.push(`${tag}: duplicate id ${data.id}`);
    seen.add(data.id);
    const reg = data.region ? byId[data.region] : null;
    if (data.region && !reg) errors.push(`${tag}: unknown region "${data.region}"`);
    const face = data.face || 'ground';
    if (!DECAL_FACES.includes(face)) errors.push(`${tag}: bad face ${face}`);
    out.push({
      id: String(data.id), title: data.title || null, kicker: data.kicker || null,
      x: r1((reg ? reg.x : 0) + (+data.x || 0)), z: r1((reg ? reg.z : 0) + (+data.z || 0)),
      width: +data.width || 60, px: +data.px || 440, rot: +data.rot || 0, face, html: renderBody(content).html
    });
  }
  if (errors.length) throw new Error('Board errors:\n  ' + errors.join('\n  '));
  return out;
}

function toDate(v){ return v instanceof Date ? v.toISOString().slice(0, 10) : String(v); }

function renderBody(content){
  const toc = [];
  const env = {};
  const tokens = md.parse(content, env);
  tokens.forEach((t, i) => {
    if (t.type === 'heading_open' && (t.tag === 'h2' || t.tag === 'h3')){
      const text = tokens[i + 1].content, id = 'h-' + toc.length;
      t.attrSet('id', id); toc.push({id, text, level: +t.tag[1]});
    }
  });
  return {html: md.renderer.render(tokens, md.options, env), toc};
}

function itemPath(type, slug){
  if (type === 'article') return '/blogs/' + slug;
  if (type === 'project') return '/projects/' + slug;
  return slug === 'about' ? '/about' : '/notes/' + slug;
}

export function buildManifest(root){
  const regionCfg = loadYaml(path.join(root, 'config/regions.yml'));
  const fam = loadYaml(path.join(root, 'config/model-families.yml'));
  const D = regionCfg.spacing || 210;
  const lockPath = path.join(root, 'layout.lock.json');
  const lock = fs.existsSync(lockPath) ? JSON.parse(fs.readFileSync(lockPath, 'utf8')) : {version: 1, buildings: {}};
  let lockChanged = false;

  // ---- regions
  const cell = {}; // axial key -> region
  const regions = regionCfg.regions.map(rc => {
    const [q, r] = spiralAxial(rc.slot), [x, z] = axialToWorld(q, r, D);
    const reg = {...rc, q, r, x: r1(x), z: r1(z), count: 0, updated: null};
    cell[axialKey(q, r)] = reg; return reg;
  });
  const byId = Object.fromEntries(regions.map(r => [r.id, r]));

  // ---- borders: shared jittered hex edges. Corner k of a pointy hex sits at angle 30+60k.
  const RC = D / Math.sqrt(3);
  const cornerWorld = (reg, k) => { const a = (Math.PI / 180) * (60 * k + 30); return [reg.x + Math.cos(a) * RC, reg.z + Math.sin(a) * RC]; };
  const ckey = ([x, z]) => Math.round(x) + ':' + Math.round(z);
  const cornerJit = p => { const g = rng('c' + ckey(p)); return [p[0] + (g() - .5) * 16, p[1] + (g() - .5) * 16]; };
  // edge k connects corner k and k+1, and faces neighbour direction (angle 60k)
  const NB = [[1, 0], [0, 1], [-1, 1], [-1, 0], [0, -1], [1, -1]];
  const EDGE_DIR = [0, 5, 4, 3, 2, 1]; // corner edge k -> neighbour direction index (angle 60k+60 faces)
  const borders = [], polys = {};
  const edgeSeen = new Set();
  for (const reg of regions){
    const poly = [];
    for (let k = 0; k < 6; k++){
      const A = cornerJit(cornerWorld(reg, k)), B = cornerJit(cornerWorld(reg, (k + 1) % 6));
      // edge between corner k (30+60k) and k+1 faces angle 60k+60 => neighbour dir index (k+1)%6 in angle order
      const dirAngle = (60 * k + 60) % 360;
      const nd = NB.findIndex((_, i) => {
        const [nq, nr] = NB[i], [wx, wz] = axialToWorld(nq, nr, 1); let a = Math.atan2(wz, wx) * 180 / Math.PI; if (a < 0) a += 360;
        return Math.abs(a - dirAngle) < 1 || Math.abs(a - dirAngle - 360) < 1 || Math.abs(a - dirAngle + 360) < 1;
      });
      const nb = cell[axialKey(reg.q + NB[nd][0], reg.r + NB[nd][1])] || null;
      const key = [ckey(A), ckey(B)].sort().join('|');
      // subdivided, deterministically wobbled polyline (canonical direction so both sides match)
      const [P, Q] = ckey(A) < ckey(B) ? [A, B] : [B, A];
      const g = rng('e' + key), n = 8, line = [];
      const len = Math.hypot(Q[0] - P[0], Q[1] - P[1]), nx = -(Q[1] - P[1]) / len, nz = (Q[0] - P[0]) / len;
      let off = 0;
      for (let i = 0; i <= n; i++){
        const t = i / n; off += (g() - .5) * 7; off *= .8;
        const w = (i === 0 || i === n) ? 0 : off;
        line.push([r1(P[0] + (Q[0] - P[0]) * t + nx * w), r1(P[1] + (Q[1] - P[1]) * t + nz * w)]);
      }
      const pts = ckey(A) < ckey(B) ? line : line.slice().reverse();
      poly.push(...pts.slice(0, -1));
      if (!edgeSeen.has(key)){
        edgeSeen.add(key);
        borders.push({a: reg.id, b: nb ? nb.id : null, pts: line});
      }
    }
    polys[reg.id] = poly;
  }
  regions.forEach(r => { r.poly = polys[r.id]; });

  // ---- buildings
  const items = readContent(root);
  const fams = fam;
  const famOf = d => d.flagship && d.type === 'project' ? fams.flagship : (fams.categories?.[d.category] || fams.types?.[d.type] || fams.default);
  const raw = items.map(({data, content}) => {
    const {html, toc} = renderBody(content);
    const wc = countWords(content);
    const readMins = Math.max(1, Math.round(wc.cjk / 450 + wc.latin / 220));
    const region = data.region || TYPE_REGION[data.type];
    return {
      id: data.id, slug: String(data.slug), type: data.type, title: data.title, summary: data.summary,
      date: toDate(data.date), updated: data.updated ? toDate(data.updated) : null,
      region, quarter: data.quarter || null, category: data.category || null, tags: data.tags || [],
      series: data.series || null, status: data.status || 'active',
      featured: !!data.featured, pinned: !!data.pinned, flagship: !!data.flagship, site: data.site || null,
      cover: data.cover || null, model: data.model || null, stack: data.stack || [],
      position: data.position || null, words: wc.words, readMins, path: itemPath(data.type, String(data.slug)),
      family: famOf(data), html, toc
    };
  });
  for (const b of raw) if (!byId[b.region]) throw new Error(`${b.id}: unknown region "${b.region}"`);

  // creation order within a region: date asc, id asc (stable)
  const perRegion = {};
  raw.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  for (const b of raw) (perRegion[b.region] ||= []).push(b);

  const PAD = 26, C = 9, K0 = Math.ceil((PAD / C) ** 2);
  const usedByRegion = {};
  for (const reg of regions){
    const list = perRegion[reg.id] || [];
    const used = usedByRegion[reg.id] = [];
    for (const b of list){ const L = lock.buildings[b.id]; if (L && L.region === reg.id) used.push(L.k); else if (L && L.region !== reg.id){ /* moved region: re-place */ } }
    let nextK = 0; const taken = new Set(used.filter(k => k != null));
    for (const b of list){
      let L = lock.buildings[b.id];
      if (b.position){ b.x = b.position.x; b.z = b.position.z; continue; }
      if (!L || L.region !== reg.id){
        while (taken.has(nextK)) nextK++;
        const k = nextK++, kk = k + K0, rr = C * Math.sqrt(kk), th = kk * 2.399963229728653;
        const jr = rng('p' + b.id);
        L = lock.buildings[b.id] = {region: reg.id, k, x: r1(reg.x + Math.cos(th) * rr + (jr() - .5) * 3), z: r1(reg.z + Math.sin(th) * rr + (jr() - .5) * 3)};
        taken.add(k); lockChanged = true;
      }
      b.x = L.x; b.z = L.z;
    }
    reg.count = list.length;
    reg.updated = list.reduce((m, b) => (b.updated || b.date) > (m || '') ? (b.updated || b.date) : m, null);
  }
  // drop lock entries for deleted content? keep them: coordinates stay reserved so re-adding never shifts others.

  // ---- model params
  const now = raw.reduce((m, b) => b.date > m ? b.date : m, '1970-01-01');
  const days = (a, b) => (Date.parse(a) - Date.parse(b)) / 864e5;
  for (const b of raw){
    const g = rng('m' + b.id);
    const w = Math.max(5.5, Math.min(11.5, 5.5 + Math.sqrt(b.words) / 8));
    let h = b.type === 'article' ? 5 + b.readMins * 1.1 : b.type === 'project' ? 9 + (b.flagship ? 5 : 0) : 4;
    h = Math.min(h * (.8 + g() * .5), 22);
    b.params = {w: r1(w), d: r1(w * (.8 + g() * .4)), h: r1(h), rot: r1(g() * Math.PI * 2),
      age: r1(Math.min(1, Math.max(0, days(now, b.date) / 365))), seed: Math.floor(g() * 1e9)};
  }

  // ---- lock file
  if (lockChanged) fs.writeFileSync(lockPath, JSON.stringify(lock, null, 1) + '\n');

  const buildings = raw;
  const latest = buildings.filter(b => b.type !== 'note').slice().sort((a, b) => b.date.localeCompare(a.date)).map(b => b.id);
  const extent = regions.flatMap(r => r.poly).reduce((e, [x, z]) => ({minX: Math.min(e.minX, x), maxX: Math.max(e.maxX, x), minZ: Math.min(e.minZ, z), maxZ: Math.max(e.maxZ, z)}), {minX: 1e9, maxX: -1e9, minZ: 1e9, maxZ: -1e9});
  const decals = readDecals(root, byId), boards = readBoards(root, byId);
  return {version: 1, generated: now, spacing: D, regions, borders, buildings, decals, boards, latest, extent};
}

export function contentFiles(root){
  return [path.join(root, 'content'), path.join(root, 'config')];
}

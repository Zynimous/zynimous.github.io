/* ================= HUD ================= */
const secNav = $('hud-left');
ZONES.forEach(z => {
  const b = document.createElement('button'); b.type = 'button'; b.className = 'sec';
  b.innerHTML = `<span class="k">${z.key}</span><span class="n"><b>${z.name}</b><span>${z.code} · ${z.zh}</span></span>`;
  b.addEventListener('click', () => { stopTour(); flyToZone(z); });
  secNav.appendChild(b); z.secBtn = b;
});
$('b-world').addEventListener('click', () => { stopTour(); flyWorld(); });
$('b-pal').addEventListener('click', openPaletteFn);
$('b-tour').addEventListener('click', () => toggleTour());
function openPaletteFn(){ openPalette(); }

const crumbs = $('crumbs');
let crumbKey = '';
function renderCrumbs(zone, item){
  const key = (zone?zone.id:'') + '|' + (item?item.id:'');
  if (key === crumbKey) return; crumbKey = key;
  const parts = [`<button type="button" data-c="world" class="${zone?'':'cur'}">WORLD</button>`];
  if (zone) parts.push('<span class="sep">/</span>', `<button type="button" data-c="${zone.id}" class="${item?'':'cur'}">${zone.name}</button>`);
  if (item) parts.push('<span class="sep">/</span>', `<span class="cur">${item.code}</span>`);
  crumbs.innerHTML = parts.join('');
}
crumbs.addEventListener('click', e => {
  const c = e.target.closest('button')?.dataset.c; if (!c) return;
  if (document.body.classList.contains('reading')) closeIntel();
  stopTour();
  if (c === 'world') flyWorld(); else flyToZone(ZMAP[c]);
});

const tf = new Intl.DateTimeFormat('en-GB', {timeZone:'Asia/Taipei', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false});
function tick(){ $('r-time').textContent = tf.format(new Date()) + ' UTC+8'; }
tick(); setInterval(tick, 1000);

/* decode effect on logo */
(function decode(){
  const el = $('logo'), target = 'ZYNIMOUS', glyphs = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789#/<>';
  if (reduce) return;
  let f = 0;
  const id = setInterval(() => {
    f++;
    el.textContent = target.split('').map((c, i) => f > 6 + i*2 ? c : glyphs[Math.floor(Math.random()*glyphs.length)]).join('');
    if (f > 6 + target.length*2){ clearInterval(id); el.textContent = target; }
  }, 45);
})();

/* minimap */
const mini = $('mini'), mctx = mini.getContext('2d');
const MRES = 176;
const miniBase = document.createElement('canvas'); miniBase.width = miniBase.height = MRES;
{
  const ctx = miniBase.getContext('2d'), img = ctx.createImageData(MRES, MRES);
  const w2m = S/MRES, hm = new Float32Array(MRES*MRES);
  for (let y=0;y<MRES;y++) for (let x=0;x<MRES;x++) hm[y*MRES+x] = hAt(-HALF + (x+.5)*w2m, -HALF + (y+.5)*w2m);
  for (let y=0;y<MRES;y++) for (let x=0;x<MRES;x++){
    const h = hm[y*MRES+x], c = Math.floor(h/4);
    const r = x<MRES-1 ? Math.floor(hm[y*MRES+x+1]/4) : c, d = y<MRES-1 ? Math.floor(hm[(y+1)*MRES+x]/4) : c;
    const line = (r !== c || d !== c);
    const major = line && (Math.floor(h/20) !== Math.floor((x<MRES-1?hm[y*MRES+x+1]:h)/20) || Math.floor(h/20) !== Math.floor((y<MRES-1?hm[(y+1)*MRES+x]:h)/20));
    const k = (y*MRES+x)*4, base = 6 + Math.max(0,h)*.12;
    if (line){ const a = major ? .85 : .42; img.data[k] = img.data[k+1] = img.data[k+2] = 207*a + base*(1-a); }
    else { img.data[k] = img.data[k+1] = img.data[k+2] = base; }
    img.data[k+3] = 255;
  }
  ctx.putImageData(img, 0, 0);
}
function sizeMini(){
  const r = mini.getBoundingClientRect(), dpr = Math.min(devicePixelRatio||1, 2);
  mini.width = Math.max(1, Math.round(r.width*dpr)); mini.height = Math.max(1, Math.round(r.height*dpr));
}
addEventListener('resize', sizeMini); sizeMini();
const v3 = new THREE.Vector3();
function groundAt(nx, ny){
  ndc.set(nx, ny); ray.setFromCamera(ndc, camera);
  const o = ray.ray.origin, d = ray.ray.direction;
  let t = d.y < -0.02 ? (12 - o.y)/d.y : 1400; t = Math.min(t, 1400);
  return [o.x + d.x*t, o.z + d.z*t];
}
function drawMini(){
  const w = mini.width, h = mini.height, s = w/S;
  mctx.imageSmoothingEnabled = true;
  mctx.drawImage(miniBase, 0, 0, w, h);
  const toM = (x, z) => [(x+HALF)*s, (z+HALF)*s];
  mctx.lineWidth = Math.max(1, w/176);
  ZONES.forEach(z => {
    const [mx, my] = toM(z.x, z.z), r = z.R*s;
    mctx.strokeStyle = z === activeZone ? '#f2f2f2' : '#8a8a8a';
    mctx.strokeRect(mx - r*.7, my - r*.7, r*1.4, r*1.4);
    mctx.fillStyle = z === activeZone ? '#f2f2f2' : '#cfcfcf';
    mctx.font = `500 ${Math.round(8*w/176)}px "JetBrains Mono", monospace`;
    mctx.fillText(z.key, mx + r*.8, my - r*.8);
  });
  const corners = [[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b]) => toM(...groundAt(a,b)));
  mctx.strokeStyle = 'rgba(242,242,242,.9)'; mctx.beginPath();
  corners.forEach(([x,y], i) => i ? mctx.lineTo(x,y) : mctx.moveTo(x,y)); mctx.closePath(); mctx.stroke();
  const [cx, cy] = toM(cam.x, cam.z);
  mctx.fillStyle = '#f2f2f2'; mctx.fillRect(cx-1.5*mctx.lineWidth, cy-1.5*mctx.lineWidth, 3*mctx.lineWidth, 3*mctx.lineWidth);
}
mini.addEventListener('click', e => {
  const r = mini.getBoundingClientRect();
  const x = (e.clientX - r.left)/r.width*S - HALF, z = (e.clientY - r.top)/r.height*S - HALF;
  stopTour();
  const zn = zoneAt(x, z);
  if (zn) flyToZone(zn); else flyTo(clamp(x,-LIM,LIM), clamp(z,-LIM,LIM), Math.min(cam.deff, 220));
});

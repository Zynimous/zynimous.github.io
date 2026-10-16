/* ================= BOOT ================= */
const startHash = (location.hash || '').slice(1);
const startItem = ITEMS.find(i => i.id === startHash), startZone = ZMAP[startHash];
if (startItem){ const z = ZMAP[startItem.zone]; cam.x = z.x; cam.z = z.z + z.R*.12; cam.deff = 86; }
else if (startZone){ cam.x = startZone.x; cam.z = startZone.z + startZone.R*.12; cam.deff = 86; }
updateCamera();
requestAnimationFrame(t => { last = t; frame(t); });

const bootLines = [...document.querySelectorAll('#boot-box div')];
if (reduce){ $('boot').classList.add('gone'); }
else {
  terrainUniforms.uIntro.value = -0.6;
  bootLines.forEach((l, i) => setTimeout(() => l.classList.add('on'), 120 + i*170));
  setTimeout(() => { $('boot').classList.add('gone'); terrainUniforms.uIntro.value = 0; }, 1050);
}
if (startItem) setTimeout(() => openIntel(startItem), reduce ? 50 : 1200);
canvas.focus({preventScroll:true});

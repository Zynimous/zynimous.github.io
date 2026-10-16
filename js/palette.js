/* ================= PALETTE ================= */
const palEl = $('palette'), palQ = $('pal-q'), palList = $('pal-list');
const ENTRIES = [
  ...ZONES.map(z => ({code:z.code, t:`${z.name} ${z.zh}`, s:'區塊', go:() => flyToZone(z)})),
  ...ITEMS.map(it => ({code:it.code, t:it.title, s:ZMAP[it.zone].name, go:() => openIntel(it)})),
  {code:'CMD', t:'自動巡航', s:'動作', go:() => toggleTour(true)},
  {code:'CMD', t:'回到全圖', s:'動作', go:() => flyWorld()},
];
let palSel = 0, palRows = [];
function renderPal(){
  const q = palQ.value.trim().toLowerCase();
  palRows = ENTRIES.filter(e => !q || (e.code + ' ' + e.t + ' ' + e.s).toLowerCase().includes(q));
  palSel = Math.min(palSel, Math.max(0, palRows.length-1));
  palList.innerHTML = palRows.length ? palRows.map((e, i) =>
    `<button type="button" role="option" class="pr${i===palSel?' sel':''}" data-i="${i}"><span class="c">${e.code}</span><span class="t">${e.t}</span><span class="s">${e.s}</span></button>`).join('')
    : '<div class="pal-empty">找不到符合的區塊或檔案</div>';
  palList.querySelector('.sel')?.scrollIntoView({block:'nearest'});
}
function openPalette(){ if (document.body.classList.contains('reading')) closeIntel(); stopTour(); palEl.hidden = false; palQ.value = ''; palSel = 0; renderPal(); palQ.focus(); }
function closePalette(){ palEl.hidden = true; canvas.focus({preventScroll:true}); }
function runPal(i){ const e = palRows[i]; if (!e) return; closePalette(); e.go(); }
palQ.addEventListener('input', () => { palSel = 0; renderPal(); });
palQ.addEventListener('keydown', e => {
  if (e.key === 'ArrowDown'){ e.preventDefault(); palSel = Math.min(palSel+1, palRows.length-1); renderPal(); }
  else if (e.key === 'ArrowUp'){ e.preventDefault(); palSel = Math.max(palSel-1, 0); renderPal(); }
  else if (e.key === 'Enter'){ e.preventDefault(); runPal(palSel); }
  else if (e.key === 'Escape'){ e.preventDefault(); closePalette(); }
});
palList.addEventListener('click', e => { const b = e.target.closest('.pr'); if (b) runPal(+b.dataset.i); });
palEl.addEventListener('click', e => { if (e.target === palEl) closePalette(); });

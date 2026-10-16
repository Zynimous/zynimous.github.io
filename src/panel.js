/* ================= PANEL: right-hand content panel shown in focus mode (DOM, selectable, scrollable) ================= */
import {$, esc} from './core.js';
import {RMAP, BUILDINGS} from './world.js';

const panel = $('panel'), scroller = $('p-scroll');
const STATUS = {active:'ACTIVE', stable:'STABLE', archived:'ARCHIVED', classified:'CLASSIFIED'};
const meta = pairs => `<dl class="p-meta">${pairs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

export function siblingsOf(b){
  const list = b.series ? BUILDINGS.filter(x => x.series === b.series).sort((a, c) => a.date.localeCompare(c.date))
                        : BUILDINGS.filter(x => x.region === b.region).sort((a, c) => c.date.localeCompare(a.date));
  return list;
}
export function neighbours(b){
  const l = siblingsOf(b), i = l.indexOf(b);
  return {prev: l[(i - 1 + l.length) % l.length], next: l[(i + 1) % l.length], list: l, i};
}
const navBtn = (b, dir) => b ? `<button type="button" class="p-nb ${dir}" data-go="${b.path}"><span class="k">${dir === 'prev' ? '← PREV' : 'NEXT →'}</span><span class="t">${esc(b.title)}</span></button>` : '';

function template(b){
  const st = STATUS[b.status] || b.status;
  const chips = b.stack.length ? `<div class="p-chips">${b.stack.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : '';
  const tags = b.tags.length ? `<div class="p-tags">${b.tags.map(t => `<span>#${esc(t)}</span>`).join('')}</div>` : '';
  let head, extra = '';
  if (b.type === 'project'){
    head = meta([['狀態', st], ['技術棧', esc(b.stack.join(' · ') || '—')], ['開始', b.date], ['分類', esc(b.category || '—')]]);
    const tl = [[b.date, '專案開始'], ...(b.updated ? [[b.updated, '最近更新']] : []), ['NOW', st]];
    extra = `<h3 class="p-h">TIMELINE</h3><ol class="p-time">${tl.map(([d, t]) => `<li><b>${d}</b><span>${t}</span></li>`).join('')}</ol>`;
    if (b.flagship && b.site) extra += `<h3 class="p-h">LINKS</h3><button type="button" class="p-exit" data-exit="${b.id}"><span>出境 EXIT</span><b>${esc(b.site.replace(/^https?:\/\//, ''))} ↗</b></button>`;
    else if (b.site) extra += `<h3 class="p-h">LINKS</h3><a class="p-link" href="${esc(b.site)}" target="_blank" rel="noopener">${esc(b.site)} ↗</a>`;
  } else if (b.type === 'article'){
    head = meta([['日期', b.date], ['分類', esc(b.category || '—')], ['閱讀', b.readMins + ' 分鐘'], ['字數', b.words.toLocaleString('en-US')]]);
    if (b.toc.length) extra = `<nav class="p-toc" aria-label="目錄"><div class="p-h">CONTENTS</div>${b.toc.map(t => `<a href="#${t.id}" data-toc="${t.id}" class="l${t.level}">${esc(t.text)}</a>`).join('')}</nav>`;
  } else {
    head = meta([['日期', b.date], ['分類', esc(b.category || '—')], ['狀態', st]]);
  }
  const nb = neighbours(b);
  const series = b.series ? `<div class="p-series"><span>SERIES · ${esc(b.series)} · ${nb.i + 1}/${nb.list.length}</span></div>` : '';
  return `<div class="p-kicker">${RMAP[b.region].name} · ${b.code}</div>
    <h2 id="p-title">${esc(b.title)}</h2>${chips}${series}${head}${extra && b.type === 'article' ? extra : ''}
    <div class="p-body">${b.html}</div>${b.type === 'project' ? extra : ''}${tags}
    <div class="p-nav">${navBtn(nb.prev, 'prev')}${navBtn(nb.next, 'next')}</div>`;
}

export function openPanel(b){
  scroller.innerHTML = template(b);
  scroller.querySelectorAll('pre').forEach(pre => {
    const btn = document.createElement('button'); btn.type = 'button'; btn.className = 'copy'; btn.textContent = 'COPY';
    pre.appendChild(btn);
  });
  scroller.scrollTop = 0; scroller.style.setProperty('--sy', 0);
  $('p-code').textContent = b.code;
  document.body.classList.add('reading');
  panel.setAttribute('aria-hidden', 'false');
  document.title = `${b.title} · Zynimous`;
}
export function closePanel(){
  document.body.classList.remove('reading'); panel.setAttribute('aria-hidden', 'true');
  document.title = 'Zynimous Sandbox';
}
scroller.addEventListener('scroll', () => scroller.style.setProperty('--sy', scroller.scrollTop), {passive: true});
scroller.addEventListener('click', e => {
  const c = e.target.closest('.copy');
  if (c){
    const code = c.parentElement.querySelector('code')?.textContent || '';
    const done = ok => { c.textContent = ok ? 'COPIED' : 'FAILED'; setTimeout(() => c.textContent = 'COPY', 1400); };
    try { navigator.clipboard.writeText(code).then(() => done(true), () => done(false)); } catch (_){ done(false); }
    return;
  }
  const t = e.target.closest('[data-toc]');
  if (t){ e.preventDefault(); scroller.querySelector('#' + t.dataset.toc)?.scrollIntoView({behavior: 'smooth', block: 'start'}); }
});

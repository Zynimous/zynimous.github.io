'use strict';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
if (!window.THREE) { document.body.insertAdjacentHTML('beforeend','<div id="fallback">3D 引擎載入失敗，請重新整理頁面。</div>'); throw new Error('THREE missing'); }
const $ = id => document.getElementById(id);

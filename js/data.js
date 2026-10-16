/* ================= DATA (示範內容) ================= */
const ICONS = {
  hq:'<svg viewBox="0 0 24 24"><path d="M12 2l3 5h6l-3 5 3 5h-6l-3 5-3-5H3l3-5-3-5h6z"/><path d="M12 9v6M9 12h6"/></svg>',
  proj:'<svg viewBox="0 0 24 24"><path d="M3 7l9-4 9 4v10l-9 4-9-4z"/><path d="M3 7l9 4 9-4M12 11v10"/></svg>',
  blog:'<svg viewBox="0 0 24 24"><path d="M5 2h10l4 4v16H5z"/><path d="M15 2v4h4M8 11h8M8 15h8M8 19h5"/></svg>',
  about:'<svg viewBox="0 0 24 24"><path d="M12 11v11M8 22l4-11 4 11"/><path d="M8.5 7.5a5 5 0 0 1 7 0M5.5 4.5a9 9 0 0 1 13 0"/><path d="M11 10h2v2h-2z"/></svg>'
};
const ZONES = [
  {id:'hq', key:'1', code:'SEC-0', name:'ZYNIMOUS', zh:'指揮中心', x:0, z:0, R:30, n:6, icon:'hq', path:'/'},
  {id:'projects', key:'2', code:'SEC-P', name:'PROJECTS', zh:'專案', x:158, z:-64, R:28, n:5, icon:'proj', path:'/projects'},
  {id:'about', key:'3', code:'SEC-A', name:'ABOUT', zh:'聯絡', x:-14, z:150, R:24, n:5, icon:'about', path:'/about'},
  {id:'blogs', key:'4', code:'SEC-B', name:'BLOGS', zh:'文章', x:-160, z:-52, R:28, n:5, icon:'blog', path:'/blogs'},
];
const ZMAP = Object.fromEntries(ZONES.map(z => [z.id, z]));

const ITEMS = [
  {id:'hq-id', zone:'hq', code:'ID-01', title:'Zynimous 是誰', st:'ACTIVE', path:'/about',
   meta:[['類別','識別'],['更新','2026-10-16'],['層級','公開'],['狀態','ACTIVE']],
   body:`<p>Zynimous 是一個匿名的軟體工程身分。這裡記錄我做的系統、工具和實驗，作品本身就是履歷。</p>
<p>關注方向是系統程式、runtime 設計與自動化流程，也在意介面本身：一個網站可以是值得停留的地方，而不只是一頁清單。</p>
<p class="note">示範內容，正式文案待定。</p>`},
  {id:'hq-stack', zone:'hq', code:'ID-02', title:'裝備清單', st:'LOADOUT', path:'/about',
   meta:[['類別','技術棧'],['更新','2026-10-16'],['項目','5'],['狀態','READY']],
   body:`<h3>PRIMARY</h3><ul>
<li><span><b>Rust</b>：系統程式、常駐服務、CLI 與 TUI</span></li>
<li><span><b>C++</b>：效能關鍵模組</span></li></ul>
<h3>SUPPORT</h3><ul>
<li><span><b>Python</b>：自動化與後端</span></li>
<li><span><b>C# / Unity</b>：互動原型</span></li>
<li><span><b>Three.js / GLSL</b>：這張地圖</span></li></ul>
<p class="note">示範內容。</p>`},
  {id:'hq-now', zone:'hq', code:'ID-03', title:'目前任務', st:'IN PROGRESS', path:'/about',
   meta:[['類別','任務'],['更新','2026-10-16'],['任務數','3'],['狀態','ACTIVE']],
   body:`<ul>
<li><span><b>OP-ZYNX</b>：建造 Linux 個人 runtime 的常駐服務。</span></li>
<li><span><b>OP-SANDBOX</b>：完成 zynimous.dev 第一版首頁，也就是你正在看的地圖。</span></li>
<li><span><b>OP-BBS</b>：整理 BBS Core 的文件與基準測試。</span></li></ul>
<p class="note">示範內容。</p>`},

  {id:'prj-zynx', zone:'projects', code:'PRJ-01', title:'Zynx', st:'ACTIVE', path:'zynx.zynimous.dev',
   meta:[['語言','Rust'],['平台','Linux'],['開始','2026-08'],['狀態','ACTIVE']],
   body:`<p>Zynx 是 Linux 上的個人 runtime。核心是常駐程式 <code>zynxd</code>，負責管理工作流程、排程任務和個人資料，讓整台機器像一個為我調校過的作業環境。</p>
<h3>架構</h3><ul>
<li><span><b>zynxd</b>：常駐 daemon，處理排程、事件與狀態</span></li>
<li><span><b>zynx</b>：CLI，用來下指令與查詢狀態</span></li>
<li><span><b>模組</b>：以外掛形式擴充功能</span></li></ul>
<pre>$ zynx status
zynxd   running   uptime 3d 04:12
tasks   12 scheduled · 0 failed</pre>
<p>這個專案有獨立產品站，地圖上點擊會直接前往 <code>zynx.zynimous.dev</code>。</p>
<p class="note">示範內容。</p>`},
  {id:'prj-bbs', zone:'projects', code:'PRJ-02', title:'BBS Core', st:'STABLE', path:'/projects/bbs-core',
   meta:[['語言','Rust · Py'],['介面','CLI · TUI'],['開始','2026-07'],['狀態','STABLE']],
   body:`<p>Block Blast 求解器。Rust 核心負責盤面搜尋與評分，CLI 與 TUI 用來除錯和觀察決策過程，Python 層負責 iPhone 畫面辨識與自動操作。</p>
<pre>$ bbs solve --board board.txt --pieces L3,I4,O2 --depth 3
best   score 1840   clears 2
place  L3 @ (2,5)  I4 @ (0,1)  O2 @ (6,6)</pre>
<h3>重點</h3><ul>
<li><span>位元盤面表示，單步評估在微秒等級</span></li>
<li><span>評分函式考慮空洞、邊緣與連鎖消除潛力</span></li></ul>
<p class="note">示範內容。</p>`},
  {id:'prj-map', zone:'projects', code:'PRJ-03', title:'Sandbox Map', st:'PROTOTYPE', path:'/projects/sandbox-map',
   meta:[['語言','JS · GLSL'],['引擎','Three.js'],['開始','2026-10'],['狀態','PROTO']],
   body:`<p>zynimous.dev 的首頁本身。整個首頁是一張可以拖曳、縮放的作戰地圖，區塊取代分頁，資訊以兵推字條呈現。</p>
<ul>
<li><span><b>地形</b>：程序產生的高度場，等高線在 fragment shader 中計算</span></li>
<li><span><b>語意縮放</b>：遠看是戰略圖，靠近要塞才展開內部檔案</span></li>
<li><span><b>字條</b>：HTML 疊在 canvas 上，每幀投影到地形錨點</span></li></ul>
<p class="note">示範內容。</p>`},
  {id:'prj-x', zone:'projects', code:'PRJ-04', title:'未公開專案', st:'CLASSIFIED', cls:true, path:'/projects/—',
   meta:[['語言','<span class="redact">████</span>'],['平台','<span class="redact">█████</span>'],['開始','2026-1█'],['狀態','SEALED']],
   body:`<p>此檔案尚未解密。</p>
<p>代號 <span class="redact">██████</span> 的專案目前處於 <span class="redact">████████</span> 階段，預計在 <span class="redact">███████</span> 公開。</p>
<p class="note">刻意保留的空位，讓地圖上永遠有一個未知據點。</p>`},

  {id:'blg-1', zone:'blogs', code:'BLG-07', title:'用 fwidth 畫出等寬的等高線', st:'GRAPHICS', path:'/blogs/fwidth-contours',
   meta:[['日期','2026-10-12'],['分類','Graphics'],['閱讀','6 分鐘'],['字數','2,400']],
   body:`<p>這張地圖的等高線不是幾何線段，而是在 fragment shader 裡逐像素算出來的。做法是把高度除以間距，看它離最近的整數有多遠。</p>
<pre>float iso(float v, float w) {
  float d = fwidth(v);
  float f = abs(fract(v - 0.5) - 0.5) / d;
  return 1.0 - clamp(f / w, 0.0, 1.0);
}</pre>
<p>關鍵在 <code>fwidth</code>：它回傳相鄰像素間數值的變化量。用它來除，線寬就固定在螢幕像素，而不是世界單位，所以不管地形多陡、鏡頭多遠，線條都一樣細。</p>
<p>主曲線每五條一次，用同一個函式、不同的間距與寬度。螢光感來自第二次較寬、較暗的取樣，疊在主線外面當作假光暈，比全畫面 bloom 便宜很多。</p>
<p class="note">示範內容。</p>`},
  {id:'blg-2', zone:'blogs', code:'BLG-06', title:'Rust 常駐程式的第一週', st:'SYSTEMS', path:'/blogs/rust-daemon-week-one',
   meta:[['日期','2026-09-28'],['分類','Systems'],['閱讀','9 分鐘'],['字數','3,600']],
   body:`<p>寫 zynxd 的第一週，大部分時間沒有花在功能上，而是花在「怎麼優雅地活著和死掉」：啟動順序、訊號處理、狀態落地。</p>
<h3>學到的事</h3><ul>
<li><span>SIGTERM 與 SIGHUP 要分開處理，後者用來重新載入設定</span></li>
<li><span>狀態寫入先寫暫存檔再 rename，避免寫到一半斷電</span></li>
<li><span>日誌一開始就要結構化，事後補很痛苦</span></li></ul>
<p class="note">示範內容。</p>`},
  {id:'blg-3', zone:'blogs', code:'BLG-05', title:'為什麼我的網站沒有捲軸', st:'NOTES', path:'/blogs/no-scrollbar',
   meta:[['日期','2026-10-15'],['分類','Notes'],['閱讀','4 分鐘'],['字數','1,500']],
   body:`<p>多數個人網站是一條由上往下的長頁面。我想要的是一個空間：訪客自己決定往哪裡走，資訊在靠近時才展開。</p>
<p>代價是可發現性。所以地圖之外必須有固定的 HUD：小地圖、區塊清單、指令面板，任何時候都能一鍵抵達。</p>
<p class="note">示範內容。</p>`},
  {id:'blg-4', zone:'blogs', code:'BLG-04', title:'Block Blast 的搜尋空間有多大', st:'ALGO', path:'/blogs/block-blast-search-space',
   meta:[['日期','2026-09-14'],['分類','Algorithms'],['閱讀','7 分鐘'],['字數','2,900']],
   body:`<p>8×8 盤面、每回合三個方塊、順序可交換。單回合的合法放置組合，在空盤面時可以上萬種。</p>
<p>剪枝靠兩件事：等價順序去重，以及先放「最難放」的方塊。實測可以把搜尋量壓到原本的一成左右。</p>
<p class="note">示範內容。</p>`},

  {id:'abt-contact', zone:'about', code:'COM-01', title:'聯絡頻道', st:'OPEN', path:'/about',
   meta:[['頻道','2'],['回覆','~48 小時'],['語言','中 · EN'],['狀態','OPEN']],
   body:`<p>合作、問題或只是想聊聊，都可以透過以下頻道聯絡。</p>
<h3>EMAIL</h3><div class="copyrow"><code id="mail">contact@zynimous.dev</code><button type="button" data-copy="contact@zynimous.dev">COPY</button></div>
<h3>GITHUB</h3><div class="copyrow"><code>github.com/zynimous</code></div>
<p class="note">示範內容，地址為佔位用。</p>`},
  {id:'abt-rules', zone:'about', code:'COM-02', title:'交戰守則', st:'RULES', path:'/about',
   meta:[['類別','原則'],['條目','3'],['版本','v1'],['狀態','IN FORCE']],
   body:`<ul>
<li><span><b>作品優先</b>：先做出來，再談想法。</span></li>
<li><span><b>保持匿名</b>：這裡只有 Zynimous，沒有本名。</span></li>
<li><span><b>公開過程</b>：失敗的實驗也會寫成文章。</span></li></ul>
<p class="note">示範內容。</p>`},
];
ZONES.forEach(z => { z.items = ITEMS.filter(i => i.zone === z.id); });
const ZONE_SUB = {hq:'識別 · 裝備 · 任務', projects:'4 份檔案 · 1 機密', about:'2 個頻道', blogs:'4 篇 · 最近 10/15'};

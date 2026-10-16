# Zynimous Sandbox 使用手冊：模組、設定與內容

日常只需要改兩個資料夾：`content/`（寫什麼）和 `config/`（放在哪、長什麼樣）。存檔後開發伺服器會自動重建 manifest 並整頁重載，不需要碰 `src/`。

- [快速開始](#快速開始)
- [內容檔（文章 / 專案 / 筆記）](#內容檔文章--專案--筆記)
- [區域：config/regions.yml](#區域configregionsyml)
- [建築造型：config/model-families.yml](#建築造型configmodel-familiesyml)
- [世界物件：decal 與看板](#世界物件decal-與看板)
- [座標鎖：layout.lock.json](#座標鎖layoutlockjson)
- [路由與部署](#路由與部署)
- [src/ 模組總覽](#src-模組總覽)
- [常見工作流程](#常見工作流程)

## 快速開始

| 指令 | 用途 |
| --- | --- |
| `npm run dev` | 開發伺服器；監看 `content/`、`config/`（WSL 下用輪詢，約 200 ms） |
| `npm run build` | 輸出到 `dist/`，另外產生 `404.html` 與 `_redirects` |
| `npm run preview` | 本機預覽 `dist/` |

| 路徑 | 放什麼 |
| --- | --- |
| `content/blogs/*.md` | 文章（`type: article`），一篇一棟建築 |
| `content/projects/*.md` | 專案（`type: project`） |
| `content/notes/*.md` | 筆記（`type: note`），`about.md` 就是 `/about` |
| `content/boards/*.md` | 地圖上的 Markdown 看板（選用） |
| `config/regions.yml` | 區域：位置、名稱、地標 |
| `config/model-families.yml` | 分類 → 建築造型 |
| `config/decals.yml` | 地面文字 / 圖片（選用） |
| `layout.lock.json` | 自動產生的建築座標鎖，要 commit |
| `public/` | 靜態資源（decal 圖片等） |

資料流：`scripts/manifest.mjs` 的 `buildManifest()` 讀取上面所有檔案，驗證、排版、算出建築參數，再經由 Vite 的虛擬模組 `virtual:manifest` 交給 `src/world.js`。驗證失敗會直接丟錯（例如 `Content errors: content/blogs/x.md: missing summary`），開發伺服器畫面上會看到這段訊息。

## 內容檔（文章 / 專案 / 筆記）

一個 `.md` 檔 = 一棟建築。檔案放在對應類型的資料夾，frontmatter 的 `type` 必須和資料夾一致。正文是一般 Markdown（不允許 raw HTML，網址自動轉連結）。

```markdown
---
id: blg-fwidth            # 全站唯一，永久不要改（座標鎖靠它）
slug: fwidth-contours     # 網址片段 → /blogs/fwidth-contours
type: article             # article | project | note
title: 用 fwidth 畫出等寬的等高線
summary: 一句話摘要。
date: 2026-10-12
category: graphics        # 決定建築造型
tags: [glsl, three.js]
status: stable
featured: true
---
正文……

## 小節標題   ← h2/h3 自動進入文章目錄
```

| 欄位 | 必填 | 作用 |
| --- | --- | --- |
| `id` | 是 | 唯一鍵；改掉等於刪除舊建築、蓋新建築，位置會換 |
| `slug` | 是 | 網址；同類型內不可重複 |
| `type` | 是 | `article` / `project` / `note`，須與資料夾相符 |
| `title`、`summary` | 是 | 標題、摘要（摘要也進搜尋） |
| `date` | 是 | `YYYY-MM-DD`；決定區內編號順序、建築新舊（越舊邊線越暗）、NEW 標記（最新一篇的 21 天內） |
| `updated` | | 專案時間軸的「最近更新」；也影響區域的最後更新日 |
| `region` | | 放進哪個區域；預設 article→`blogs`、project→`projects`、note→`hub` |
| `category` | | 對應 `model-families.yml` 的造型；也顯示在面板、可搜尋 |
| `tags` | | 面板底部 `#tag`；可搜尋 |
| `status` | | `active`（預設）/ `stable`（線條稍亮）/ `archived`（線變暗、虛線）/ `classified`（線條閃爍） |
| `featured` | | 提高標籤優先度（+2） |
| `pinned` | | 標籤優先度最高（+4，幾乎總是顯示） |
| `flagship` | | 僅專案：改用 citadel 造型、加高；配合 `site` 變成「出境 EXIT」按鈕 |
| `site` | | 專案外部網址；非 flagship 時顯示為普通連結 |
| `stack` | | 專案技術棧，顯示為標籤與「技術棧」欄 |
| `series` | | 同名系列會串成 PREV/NEXT，並顯示 `SERIES · 名 · 2/5` |
| `position` | | `{x, z}` 世界座標，手動指定位置，略過自動排版與鎖檔 |
| `cover`、`model`、`quarter` | | 會被讀進 manifest，但前端目前沒有用到 |

建築大小由內容自動決定：寬度隨字數，文章高度隨閱讀時間（中文 450 字/分、英文 220 字/分），專案固定較高，最高 22。建築編號如 `BLG-03` 是「區域 code + 依日期排序的序號」，不寫在檔案裡。

筆記的網址是 `/notes/<slug>`，唯一例外是 `slug: about` 會變成 `/about`。

## 區域：`config/regions.yml`

區域是六角格上的格子，`slot` 是螺旋編號：0 是原點，1–6 是第一圈，7–18 是第二圈。新增區域只拿下一個空 slot，舊區域不會移動。

```yaml
spacing: 364          # 相鄰區域中心距離（世界單位），預設 210
regions:
  - {id: hub,      slot: 0, name: HUB,              zh: 樞紐,   code: HUB, types: [note],    landmark: spire}
  - {id: blogs,    slot: 1, name: BLOG DISTRICT,    zh: 文章區, code: BLG, types: [article], landmark: archive}
  - {id: projects, slot: 2, name: PROJECT DISTRICT, zh: 專案區, code: PRJ, types: [project], landmark: foundry}
```

| 欄位 | 作用 |
| --- | --- |
| `id` | 內容、decal、看板的 `region` 用它對應；同時決定網址：`hub` → `/`，其他 → `/<id>` |
| `slot` | 六角格螺旋位置，不可重複；決定世界座標 |
| `name` | 英文名：HUD、區域看板、面板 kicker、搜尋 |
| `zh` | 中文名：HUD 與搜尋 |
| `code` | 三碼代號；建築編號前綴（`BLG-01`） |
| `landmark` | 中心地標造型：`spire` / `archive` / `foundry`；沒填或寫錯時用 `spire` |
| `types` | 只是說明用，程式目前不讀 |

區域在檔案中的順序就是 HUD 快捷鍵 `1`–`9` 的順序。可移動範圍是所有區域的聯集，走出最外層邊界會被橡皮筋拉回。區域中心會自動壓出一塊平地放地標。

注意：改 `spacing` 會移動所有區域中心，但已鎖定的建築座標不會跟著動。上線後不要再改。

## 建築造型：`config/model-families.yml`

造型依此優先順序決定：`flagship` 專案 → `categories[category]` → `types[type]` → `default`。所以一篇 `category: graphics` 的專案會是 tower，不是 facility。

```yaml
default: block
categories:
  systems: bunker
  graphics: tower
  algorithms: lattice
  meta: block
  identity: block
types:
  project: facility
  note: hut
flagship: citadel
```

| 造型 | 外觀 |
| --- | --- |
| `block` | 方塊 + 頂部小方塊（預設） |
| `bunker` | 低矮寬重的兩層碉堡 |
| `tower` | 六角柱塔，頂端天線 |
| `lattice` | 骨架式結構 |
| `facility` | 廠房 + 副樓 + 煙囪 |
| `citadel` | 旗艦專案用，最醒目 |
| `hut` | 小屋 + 尖頂 |

寫錯的造型名不會報錯，會退回 `block`。要新增造型，在 `src/buildings.js` 的 `FAMILIES` 物件加一個函式：接收 `{w, d, h}`，回傳用 `box()` / `cyl()` 拼出的零件陣列，再在這個 YAML 裡指定。區域地標同理，在 `LANDMARKS` 裡加。

## 世界物件：decal 與看板

兩者都是放在地圖上、但不算建築的東西。怎麼選：**只要一個字串或一張圖、不需要點擊 → decal**；**要段落、清單、可點的連結 → 看板**。

### Decal：`config/decals.yml`

畫在 WebGL 裡的文字或圖片，會被建築遮住、受霧影響，不可點擊。

```yaml
decals:
  - {id: hub-callsign, region: hub, x: 0, z: 62, text: ZYNIMOUS, size: 9, color: ash, opacity: .85}
  - {id: blogs-stamp, region: blogs, x: 58, z: 40, text: "FIELD\nNOTES", size: 6, rot: 14, color: mute}
  - {id: prj-poster, region: projects, x: 0, z: 60, image: decals/poster.png, size: 30, face: upright}
```

| 欄位 | 預設 | 說明 |
| --- | --- | --- |
| `id` | 必填 | 唯一 |
| `text` / `image` | 二擇一 | 文字（`\n` 換行）；或 `public/` 下的路徑 / 完整網址 |
| `region` | 無 | 有填時 `x`/`z` 是相對該區中心的偏移，否則是世界座標 |
| `x`, `z` | 0 | 位置；北方是 `-z` |
| `size` | 文字 6 / 圖片 24 | 文字 = 字高；圖片 = 寬度（高度依比例） |
| `rot` | 0 | 角度；0 = 從預設鏡頭看是正的 |
| `face` | `ground` | `ground` 貼地形畫 / `upright` 直立面板 |
| `color` | `ink` | `ink` / `ash` / `mute` / `signal`（取自 `:root` 色票） |
| `font` | `display` | `display` / `body` / `mono`；`weight` 選填 |
| `opacity` | 1 | 0–1 |

### 看板：`content/boards/*.md`

真正的 DOM（CSS3D），任何縮放都清晰。站內連結（`/` 開頭）會在地圖上飛過去，不重載頁面。看板圖層在畫布之上，建築擋不住它，所以要放在空地上；進入閱讀模式時會隱藏。

```markdown
---
id: bd-hub-briefing
region: hub
x: 82
z: -4
width: 60
kicker: BRIEFING · HUB
title: 這張地圖怎麼讀
---
這是 Zynimous 的個人網站。…

- **文章區**：技術筆記 → [/blogs](/blogs)
```

| 欄位 | 預設 | 說明 |
| --- | --- | --- |
| `id` | 必填 | 唯一 |
| `region`、`x`、`z`、`rot`、`face` | 同 decal | 同 decal |
| `width` | 60 | 在世界中的寬度 |
| `px` | 440 | 排版寬度（CSS px）；越大字越小、一行越多字 |
| `kicker` | 無 | 標題上方的小字標籤 |
| `title` | 無 | 標題 |

兩者若 `region` 寫錯、`id` 重複、`face` 或 `color` 不在清單內，都會在建置時報錯。

## 座標鎖：`layout.lock.json`

建築第一次出現時取得的座標會寫進這個檔，之後永遠不動。每次 `dev` 或 `build` 發現新建築時會自動更新。**要跟內容一起 commit**，否則部署環境會算出不同位置。

```json
{"version": 1, "buildings": {
 "blg-fwidth": {"region": "blogs", "k": 5, "x": -201.8, "z": -288.4}
}}
```

新建築的位置：同一區內依 `date`（再依 `id`）排序，取下一個未用的編號 `k`，以向日葵螺旋從區域中心往外放（中心留給地標），再加上一點由 `id` 決定的抖動。

| 你做了… | 結果 |
| --- | --- |
| 新增一篇 | 取下一個空位，寫入鎖檔 |
| 修改標題、內文、日期 | 位置不變（大小、新舊可能變） |
| 刪除一篇 | 鎖檔保留它的位置，之後的建築不會填進來 |
| 改 `id` | 視為新建築，另取位置；舊位置保留為空地 |
| 改 `region` | 在新區域重新取位並覆寫鎖檔 |
| 設定 `position: {x, z}` | 直接用這個座標，不讀也不寫鎖檔 |

想讓某棟建築重新排位，手動刪掉它在鎖檔裡的那一筆即可。不要整個刪掉鎖檔，那會讓所有建築重新排列。

## 路由與部署

整個網站只有一頁，網址只是地圖狀態：區域路徑會把鏡頭飛到該區，建築路徑會進入閱讀模式。路徑全部由資料推導，不需要另外註冊。

| 網址 | 來源 | 行為 |
| --- | --- | --- |
| `/` | 區域 `hub` | 回到樞紐 |
| `/blogs`、`/projects` | 區域 `id` | 飛到該區 |
| `/blogs/<slug>` | article | 進入閱讀模式 |
| `/projects/<slug>` | project | 進入閱讀模式 |
| `/about` | note，`slug: about` | 進入閱讀模式 |
| `/notes/<slug>` | 其他 note | 進入閱讀模式 |
| 其他未知路徑 | — | 導回 `/` |

在地圖上自由移動時，網址會用 `replaceState` 跟著目前所在區域更新，不會塞滿瀏覽紀錄。

部署：`npm run build` 後上傳 `dist/`。GitHub Pages 靠 `404.html`（`index.html` 的複本）、Cloudflare Pages 靠 `_redirects`（`/*  /index.html  200`），讓任何深層網址都能直接開啟。

## `src/` 模組總覽

所有資料只從一個入口進來：`world.js` 包裝 manifest，其他模組都從它取得 `REGIONS`、`BUILDINGS` 等。模組之間共用的可變狀態放在 `state.js` 的 `ST`。`main.js` 的 import 順序就是依賴順序，新模組要插在它用到的模組之後。

```text
 content/*.md     config/*.yml     layout.lock.json
      │                │                 ▲ │ 讀 / 寫座標
      └───────► scripts/manifest.mjs ◄───┘
                (驗證 · 排版 · 算建築參數)
                       │ virtual:manifest
                       ▼
                    world.js
         (REGIONS · BUILDINGS · regionAt …)
        ┌──────────────┼──────────────────┐
        ▼              ▼                  ▼
   世界繪製        互動與狀態          資訊層與合成
   terrain.js      input.js            signage.js
   scene.js        camera.js           hud.js
   buildings.js    picking.js          render.js
   borders.js      router.js
   decals.js       focus.js · panel.js
   boards.js       palette.js · tour.js
        ▲              ▲                  ▲
        └──────────── loop.js ────────────┘
                (每幀依序更新三組模組)
```

| 模組 | 職責 | 主要匯出 |
| --- | --- | --- |
| `core.js` | 小工具 | `$`（getElementById）、`esc`（HTML 跳脫）、`reduce`（減少動態） |
| `state.js` | 共用可變狀態 | `ST` |
| `world.js` | manifest 資料 + 空間查詢 | `REGIONS` `BUILDINGS` `BORDERS` `DECALS` `BOARDS`、`RMAP` `BMAP` `BPATH`、`regionAt` `nearestRegion` `limitToReach` |
| `terrain.js` | 解析式高度場 | `hAt(x, z)`（地面高度的唯一來源）、`HEIGHT_GLSL` |
| `scene.js` | 渲染器、clipmap 地形、等高線、霧 | `scene` `camera` `renderer`、`dashMat` `addLine` |
| `buildings.js` | 建築與地標幾何（合併成一個 mesh） | `buildWorld` `setHover` `setHidden` `baseHeight`；`FAMILIES` / `LANDMARKS` 在檔內 |
| `borders.js` | 區域邊界緞帶、道路（也是導覽路線） | `borderLines` `route` |
| `decals.js` | 繪製 decal | 無（import 後即生效） |
| `boards.js` | CSS3D 看板 | `updateBoards` |
| `camera.js` | 探索 / 閱讀鏡頭、飛行動畫 | `cam` `flyTo` `flyToRegion` `flyToBuilding` `updateCamera` |
| `picking.js` | 滑鼠下的地形點 / 建築 | `pick` `pickObject` |
| `signage.js` | 螢幕空間標籤（優先度、避開重疊、邊緣箭頭） | `updateSignage` |
| `tour.js` | 自動導覽 | `startTour` `stopTour` `toggleTour` |
| `panel.js` | 右側內容面板（文章 / 專案 / 筆記三種模板） | `openPanel` `closePanel` `neighbours` |
| `focus.js` | 閱讀模式狀態、「出境」轉場 | `enterFocus` `exitFocus` `startExit` |
| `router.js` | History API 路由 | `navigate(path)` `stepFocus` `leaveFocus` |
| `palette.js` | `Ctrl K` 指令面板（搜尋區域與建築） | `openPalette` `closePalette` |
| `input.js` | 鍵盤、滑鼠、觸控 | `keys` `userInput` |
| `hud.js` | HUD、麵包屑、小地圖 | `renderCrumbs` `drawMini` |
| `render.js` | 閱讀模式的半解析度模糊 / 霧合成 | `render` |
| `loop.js` | 每幀更新順序 | `frame` |
| `boot.js` | 初始網址 → 鏡頭狀態、開場動畫 | 無 |

擴充時的規則：

- 要在地圖上移動，一律呼叫 `navigate(path)`，不要直接改鏡頭或 `history`。
- 要讓物件貼地，用 `hAt(x, z)`（單點）或 `baseHeight(x, z, r)`（一個範圍內的最低點）。
- 新動畫要尊重 `reduce`：值為 true 時直接跳到終點。
- 顏色只用 `:root` 色票，唯一的彩色是 `--signal` 橘。
- 不要在模組頂層使用另一個尚未載入模組的匯出（循環 import 風險），要延後到函式裡執行。

## 常見工作流程

**發一篇文章**

1. 新增 `content/blogs/<slug>.md`，填好 `id`（建議用 `blg-` 前綴）、`slug`、`type: article`、`title`、`summary`、`date`。
2. 選一個 `category` 決定造型；想讓它的標籤常駐，就加 `featured` 或 `pinned`。
3. 用 `npm run dev` 確認位置與面板，再把 `.md` 和更新過的 `layout.lock.json` 一起 commit。

**新增專案**

1. 新增 `content/projects/<slug>.md`（`type: project`），加上 `stack`、`status`。
2. 有獨立產品站：加 `site: https://<name>.zynimous.dev`；是招牌作品再加 `flagship: true`（citadel 造型 + 「出境」按鈕）。
3. 沒有產品站：正文就是 `/projects/<slug>` 頁。

**新增一個區域**

1. 在 `regions.yml` 加一行，`slot` 取下一個未用的數字（目前是 3）。
2. `id` 就是網址（`/<id>`），要符合 v1 URL 規劃。
3. 內容用 `region: <id>` 放進去；可以再加一塊看板或 decal 介紹這一區。

**在地圖上加說明文字**

- 只是一個字串、當地形標記用 → 在 `decals.yml` 加一行。
- 一段導覽、有連結 → 在 `content/boards/` 加一個 `.md`，放在沒有建築的空地上。

**調整外觀**

- 色彩、字型：`src/style.css` 的 `:root` 變數。decal 的顏色與字型也從這裡讀。
- 等高線的橘色：`--signal` 要和 shader 的 `uLine` / `uSignal` 一起改。
- 建築形狀：`buildings.js` 的 `FAMILIES`。地形起伏：`terrain.js` 的 `hAt` 與 `HEIGHT_GLSL` 要同步修改。

**建置報錯時**：錯誤訊息會列出檔名與原因（缺欄位、`type` 與資料夾不符、`id`/`slug` 重複、`status` 不合法、未知 `region`），改正後存檔就會自動重載。

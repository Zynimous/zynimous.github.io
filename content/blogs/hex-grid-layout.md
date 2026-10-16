---
id: blg-hex
slug: hex-grid-layout
type: article
title: 六角格與永不位移的地圖配置
summary: 用鎖定檔讓新內容只會往外長，舊建築永遠不動。
date: 2026-10-10
category: graphics
tags: [layout, algorithm]
status: active
---
地圖會隨內容成長，但已經存在的建築不能移動。做法是首次分配後把座標寫進鎖定檔，之後演算法即使調整，舊座標也不變。

> 示範內容。

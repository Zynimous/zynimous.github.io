---
id: prj-map
slug: sandbox-map
type: project
title: Sandbox Map
summary: zynimous.dev 首頁本身：可拖曳縮放的作戰沙盤。
date: 2026-10-01
category: graphics
tags: [three.js, glsl]
status: active
featured: true
stack: [JavaScript, Three.js, GLSL]
---
zynimous.dev 的首頁本身。整個首頁是一張可以拖曳、縮放的作戰地圖，區域取代分頁，每個內容是地圖上的一棟建築。

- **地形**：程序產生的高度場，等高線在 fragment shader 中計算
- **建築**：一個內容檔等於一棟建築
- **看板**：HTML 疊在 canvas 上，每幀投影到地形錨點

> 示範內容。

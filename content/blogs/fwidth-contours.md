---
id: blg-fwidth
slug: fwidth-contours
type: article
title: 用 fwidth 畫出等寬的等高線
summary: 等高線不是幾何線段，而是 fragment shader 逐像素算出的等寬線。
date: 2026-10-12
category: graphics
tags: [glsl, three.js, shader]
status: stable
featured: true
---
這張地圖的等高線不是幾何線段，而是在 fragment shader 裡逐像素算出來的。做法是把高度除以間距，看它離最近的整數有多遠。

## 核心函式

```glsl
float iso(float v, float w) {
  float d = fwidth(v);
  float f = abs(fract(v - 0.5) - 0.5) / d;
  return 1.0 - clamp(f / w, 0.0, 1.0);
}
```

關鍵在 `fwidth`：它回傳相鄰像素間數值的變化量。用它來除，線寬就固定在螢幕像素，而不是世界單位，所以斜坡再陡、視角再低，線看起來都一樣粗。

## 主曲線與光暈

主曲線每五條一次，用同一個函式、不同的間距與寬度。螢光感來自第二次較寬、較暗的取樣，疊在主線外面當作假光暈。

> 示範內容，正式文章待寫。

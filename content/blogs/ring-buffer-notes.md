---
id: blg-ring
slug: ring-buffer-notes
type: article
title: 無鎖環形緩衝區的三個陷阱
summary: 記憶體順序、偽共享與容量取冪次，一次講完。
date: 2026-08-30
category: systems
tags: [rust, concurrency]
status: stable
---
單生產者單消費者的環形緩衝區看似簡單，真正出錯的往往是記憶體順序與快取行。

- **記憶體順序**：寫入資料用 Release，讀取索引用 Acquire
- **偽共享**：讀寫索引各佔一條快取行
- **容量取 2 的冪**：用位元遮罩取代取餘數

> 示範內容。

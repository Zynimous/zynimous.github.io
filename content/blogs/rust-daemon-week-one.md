---
id: blg-rustd
slug: rust-daemon-week-one
type: article
title: Rust 常駐程式的第一週
summary: 第一週大部分時間花在「怎麼優雅地活著和死掉」。
date: 2026-09-28
category: systems
tags: [rust, linux, daemon]
status: stable
series: zynx-notes
---
寫 zynxd 的第一週，大部分時間沒有花在功能上，而是花在「怎麼優雅地活著和死掉」：啟動順序、訊號處理、狀態保存。

## 學到的事

- SIGTERM 與 SIGHUP 要分開處理，後者用來重新載入設定
- 狀態寫入先寫暫存檔再 rename，避免寫到一半斷電
- 日誌一開始就要結構化，事後補很痛苦

> 示範內容。

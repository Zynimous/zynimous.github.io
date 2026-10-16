---
id: prj-bbs
slug: bbs-core
type: project
title: BBS Core
summary: Block Blast 求解器：Rust 核心加 CLI／TUI。
date: 2026-07-10
category: algorithms
tags: [rust, python, tui]
status: stable
featured: true
stack: [Rust, Python]
---
Block Blast 求解器。Rust 核心負責盤面搜尋與評分，CLI 與 TUI 用來除錯和觀察決策過程，Python 層負責 iPhone 畫面辨識。

```text
$ bbs solve --board board.txt --pieces L3,I4,O2 --depth 3
best   score 1840   clears 2
place  L3 @ (2,5)  I4 @ (0,1)  O2 @ (6,6)
```

## 重點

- 位元盤面表示，單步評估在微秒等級
- 評分函式考慮空洞、邊緣與連鎖消除潛力

> 示範內容。

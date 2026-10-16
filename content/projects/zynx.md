---
id: prj-zynx
slug: zynx
type: project
title: Zynx
summary: Linux 上的個人 runtime，以 Rust 撰寫的常駐服務 zynxd。
date: 2026-08-01
category: systems
tags: [rust, linux, daemon]
status: active
featured: true
pinned: true
flagship: true
site: https://zynx.zynimous.dev
stack: [Rust, Linux]
---
Zynx 是 Linux 上的個人 runtime。核心是常駐程式 `zynxd`，負責管理工作流程、排程任務和個人資料，讓整台機器像一個可程式化的個人助理。

## 架構

- **zynxd**：常駐 daemon，處理排程、事件與狀態
- **zynx**：CLI，用來下指令與查詢狀態
- **模組**：以外掛形式擴充功能

```text
$ zynx status
zynxd   running   uptime 3d 04:12
tasks   12 scheduled · 0 failed
```

這個專案有獨立產品站，點擊「出境」會前往 `zynx.zynimous.dev`。

> 示範內容。

---
id: blg-bbs-space
slug: block-blast-search-space
type: article
title: Block Blast 的搜尋空間有多大
summary: 8×8 盤面、每回合三個方塊，剪枝如何把搜尋量壓到一成。
date: 2026-09-14
category: algorithms
tags: [algorithm, rust, search]
status: stable
series: zynx-notes
---
8×8 盤面、每回合三個方塊、順序可交換。單回合的合法放置組合，在空盤面時可以上萬種。

剪枝靠兩件事：等價順序去重，以及先放「最難放」的方塊。實測可以把搜尋量壓到原本的一成左右。

> 示範內容。

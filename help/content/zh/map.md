---
title: 在电脑上使用地图
description: 搜索、定位、图层、消防栓详情、分享、状态与键盘操作。
eyebrow: 地图
lead: 工具位于左上角，数据日期位于右下角。
order: 1
---

## 概览 {#ueberblick}
:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
电脑上的 OpenFireMap：纽伦堡老城区，缩放17。
:::
1. 搜索地点；2. 定位；3. 更换图层；4. 导出地图或数据；5. 分享当前视图；6. 悬停查看消防栓详情，点击显示100米半径；7. 查看缩放和数据日期；8. 打开信息与法律。
## 查找地点 {#suche}
输入地点、街道或地址，按<kbd>Enter</kbd>或点击放大镜。地图跳到第一个结果并缩放至16。搜索使用 OSM 的 Nominatim，不搜索单个消防栓。
## 定位 {#standort}
定位按钮跳转到当前位置并缩放至17。首次使用时需在浏览器授权。位置只在浏览器中使用。
:::tip 无法定位？
允许 openfiremap.org 使用定位。没有 GPS 的电脑可能不够精确。
:::
## 消防栓和其他对象 {#objekte}
| 缩放 | 内容 |
|---|---|
| 12以下 | 暂无对象 |
| 12起 | 消防站 |
| 14起 | 消防站符号、市镇边界 |
| 15起 | 消防栓、水源、AED |
| 17起 | 带字母的符号 |
| 18起 | 悬停查看详情 |
:::figure marker frame=plain
点击消防栓显示100米半径。
:::
缩放18起悬停可查看详情。键盘用户在缩放17起按<kbd>Tab</kbd>选中、<kbd>Enter</kbd>打开。当前位置也可显示到消防栓的距离。详情来自 OSM；缺失信息尚未录入。[添加方法](../contribute/)。
## 地图图层 {#ebenen}
可选择标准、打印、夜间、卫星、地形、OSM；巴伐利亚还提供 BayernAtlas。[图层与符号](../layers/)。
## 分享与链接 {#teilen}
分享按钮复制包含地点、缩放和背景的链接。移动地图时地址栏同步更新。
## 状态与日期 {#status}
右下显示缩放和数据日期。“+Sync”表示已加载更新。“数据状态详情”显示来源。[数据与更新](../data/)。
## 信息与设置 {#info}
左下可打开帮助、地图片符号、叠加图层、法律、隐私和许可证。缓存可关闭或设为1小时、1天、3天、7天（默认）或30天。
## 键盘操作 {#tastatur}
- 首次按<kbd>Tab</kbd>跳至地图。
- 方向键移动，<kbd>+</kbd>/<kbd>−</kbd>缩放。
- 缩放17起用<kbd>Tab</kbd>选符号，<kbd>Enter</kbd>/<kbd>Space</kbd>打开，<kbd>Escape</kbd>关闭。
- 对话框内焦点不会离开；按<kbd>Escape</kbd>关闭。
- 导出可使用“可见范围”，无需拖动矩形。

---
title: 无障碍
description: 使用键盘、屏幕阅读器、放大和减少动态效果设置操作地图。
eyebrow: 无障碍
lead: OpenFireMap 致力于支持键盘、屏幕阅读器和高倍放大。
order: 9
---

## 目标 {#ziel}
地图以 WCAG 2.2 AA 为目标，自动检查键盘操作、标签、对比度、400%放大和控件尺寸。
:::note 当前状态
自动测试不能发现所有问题，真实设备的屏幕阅读器测试仍待完成。欢迎反馈。
:::
## 键盘 {#tastatur}
| 按键 | 功能 |
|---|---|
| <kbd>Tab</kbd> | 下一个控件 |
| 方向键 | 移动地图 |
| <kbd>+</kbd>/<kbd>−</kbd> | 缩放 |
| 缩放17起按<kbd>Tab</kbd> | 选择地图符号 |
| <kbd>Enter</kbd>/<kbd>Space</kbd> | 打开详情和半径 |
| <kbd>Escape</kbd> | 关闭详情、菜单和对话框 |
焦点始终可见。导出可使用当前范围，城区地图也能用键盘排版。
## 屏幕阅读器 {#screenreader}
地图会朗读区域名称和操作方式；对象符号包含类型和编号。通知和错误会播报，状态框避免频繁重复。此帮助目前提供中文、德语和英语。
:::tip 对象太多
缩放17以下的圆点不能逐个访问。按<kbd>+</kbd>放大。
:::
## 视觉与放大 {#sehen}
- 面板文本对比度至少达到一般标准。
- 浏览器可放大至400%，界面会转为窄屏布局。
- 消防栓除颜色外还使用 U、O、Ø 字母区分。
- 可选择“打印（Light）”或“夜间（Dark）”背景。[图层](../layers/)。
## 减少动态效果 {#bewegung}
启用系统减少动态效果后，搜索和定位会直接跳转。
## 手机 {#smartphone}
控件至少24×24像素。缩放17起可轻触符号。VoiceOver/TalkBack用户可通过菜单操作。[手机指南](../phone/)。
## 尚未测试 {#offen}
- VoiceOver、TalkBack、NVDA 实机测试
- 卫星图上的符号对比度
- 屏幕阅读器使用城区地图工具
## 发现障碍？ {#melden}
请将设备、浏览器、屏幕阅读器及问题发送到[info@openfiremap.org](mailto:info@openfiremap.org)，也可[在 GitHub 报告](https://github.com/FrnkMrz/OpenFireMapV2/issues)。

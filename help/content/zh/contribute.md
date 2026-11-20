---
title: 添加消防栓
description: 使用 Hydrantenjäger、StreetComplete、Every Door、iD 或 JOSM 添加 OSM 消防对象。
eyebrow: 参与贡献
lead: 缺少消防栓时，可用免费的 OpenStreetMap 账户添加。
order: 7
---

## 开始之前 {#vorher}
OpenFireMap 展示[OpenStreetMap](https://www.openstreetmap.org/)（OSM）数据。请在 OSM 中编辑，注册并确认邮箱后登录工具。
:::warn 三条规则
- 只添加现场亲自确认的对象和位置。
- 未经许可不要复制供水公司或市政府图纸。
- 保存时简短说明更改。
:::
德国消防队可阅读[德语巡查指南](/help/fire-brigades/)。
## 选择工具 {#werkzeug}
| 场景 | 工具 | 用途 |
|---|---|---|
| 现场用手机 | Hydrantenjäger | GPS辅助添加消防栓 |
| 步行调查 | StreetComplete / Every Door | 补充附近对象 |
| 电脑编辑 | iD | 浏览器编辑器 |
| 批量编辑 | JOSM / Vespucci | 直接编辑标签 |
## Hydrantenjäger {#hydrantenjaeger}
登录[Hydrantenjäger](https://hydrantenjaeger.de/)，在消防栓附近定位，选类型和位置，确认后填写口径或编号并上传。[帮助](https://hydrantenjaeger.de/help/)。
## StreetComplete / Every Door {#apps}
[StreetComplete](https://streetcomplete.app/)回答附近对象的问题。[Every Door](https://every-door.app/)可新增点：放置地点、选“Fire Hydrant”并填写信息。
## iD 编辑器 {#id}
登录 openstreetmap.org 并点击编辑。放置点，搜索并选“Fire Hydrant”，填写类型、位置、口径、编号，保存并上传。
:::tip 修改已有对象
可编辑字段或移动位置。只有现场确认对象不存在时才删除。
:::
## JOSM / Vespucci {#josm}
[JOSM](https://josm.openstreetmap.de/)用于电脑，[Vespucci](https://vespucci.io/)用于 Android，适合批量工作。
## 重要标签 {#tags}
| 对象 | 标签 | 说明 |
|---|---|---|
| 消防栓 | emergency=fire_hydrant | 必需 |
| | fire_hydrant:type=underground | 地下式，也可 pillar、wall、pipe |
| | fire_hydrant:diameter=80 | 公称口径 |
| | fire_hydrant:position=sidewalk | 位置 |
| | ref=123 | 编号 |
| | fire_hydrant:pressure=4 | 压力（bar） |
| 吸水点 | emergency=suction_point | 从水域取水 |
| 蓄水池 | emergency=water_tank | 消防蓄水 |
| 消防池 | emergency=fire_water_pond | 消防水源 |
| AED | emergency=defibrillator | 除颤器 |
| 消防站 | amenity=fire_station | 建筑或场地 |
详见[地图符号](/symbols/)和[OSM Wiki](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant)。
## 何时显示？ {#anzeige}
相关服务处理上传后，OpenFireMap 才会显示更改，时间不固定。[数据更新说明](../data/#verzoegerung)。

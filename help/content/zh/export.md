---
title: 导出
description: 将消防栓地图导出为 PNG/PDF，将对象导出为 GPX/CSV。
eyebrow: 导出
lead: 创建打印地图，或生成导航和表格所需的对象清单。
order: 5
---

## 格式 {#formate}
| 格式 | 内容 | 用途 |
|---|---|---|
| PNG | 地图、标题、比例尺、日期、署名 | 公告、邮件 |
| PDF | 同一地图的 PDF | 打印、存档 |
| GPX | 对象航点 | 导航、现场应用 |
| CSV | 对象详情表 | 表格、分析 |
导出仅限电脑。网格和街道索引请用[城区地图](../town-plan/)。
## 步骤 {#ablauf}
:::figure export frame=plain spots=format,select,view,zoom,png,gpx
导出菜单。
:::
:::steps
1. 点击左上角向下箭头。
2. 选择自由、A4横向或A4纵向。
3. 拖动选择范围，或选择“使用可见范围”。
4. 选择缩放15至18；数值越高细节越多、文件越大。
5. 选择 PNG/PDF 地图或 GPX/CSV 数据。
6. 检查标题并点击创建。
:::
:::figure title frame=plain
创建前可修改标题。
:::
进度窗口显示处理状态，也可取消。
## 地图内容 {#plan}
PNG/PDF含背景、消防对象、市镇边界、标题、比例尺、日期、缩放级别和 OSM 署名。
:::tip 清晰打印
使用“打印（Light）”背景可突出符号并节省墨水。地形图最高缩放17。
:::
## GPX 与 CSV {#gpx-csv}
GPX保存带名称和详情的航点。CSV以分号分隔，含类型、坐标、口径、地址、OSM ID、来源和许可证等；列名为德语。
## 限制 {#grenzen}
最大范围10×10公里；超出会被限制。缩放15以下导出需加载数据。手机不可导出。没有对象时会提示。
:::note 署名
分享地图时必须保留“© OpenStreetMap contributors”，不要裁掉署名。
:::

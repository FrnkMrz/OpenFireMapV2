---
title: 新增消防栓
description: 使用 Hydrantenjäger、StreetComplete、Every Door、iD 編輯器或 JOSM，將消防栓、供水點和去顫器新增至 OpenStreetMap。
eyebrow: 參與貢獻
lead: 地圖上的每個消防栓都是由使用者新增。若有遺漏，可使用免費 OpenStreetMap 帳號自行新增。
order: 7
---

## 開始之前 {#vorher}

OpenFireMap 顯示 [OpenStreetMap](https://www.openstreetmap.org/)（OSM）資料。編輯應在 OpenStreetMap 進行，而非 OpenFireMap。您需要一個帳號：

:::steps
1. 前往 [openstreetmap.org](https://www.openstreetmap.org/user/new)，選擇 **Sign Up**。
2. 設定使用者名稱、電子郵件和密碼，並完成電子郵件驗證。
3. 使用此帳號登入下列工具。
:::

:::warn 三項原則
- **只新增您親自在現場確認的資料。**核對消防栓的位置與類型。
- **不要抄錄他人的計畫圖。**供水單位或地方政府的消防栓計畫圖受到著作權保護，除非取得明確許可，否則不可使用。
- **儲存時簡短描述修改內容**，例如「新增主街消防栓」。
:::

德國消防隊可參考在訓練或城市巡查時檢查責任區消防栓的指南，但目前僅有德文版：[Für Feuerwehren](/help/fire-brigades/)。

## 選擇工具 {#werkzeug}

| 情況 | 工具 | 原因 |
|---|---|---|
| 帶手機在現場快速新增消防栓 | **Hydrantenjäger** | 專為消防栓設計，以指南針定位，欄位少 |
| 外出時順便新增資料 | **StreetComplete** 或 **Every Door** | 回答附近物件問題，包含消防栓 |
| 在電腦上編輯特定地點 | **iD 編輯器** | 在 openstreetmap.org 瀏覽器中執行，不必安裝 |
| 有經驗且要編輯多個消防栓 | **JOSM**（電腦）或 **Vespucci**（Android） | 可完整控制所有標籤 |

## 使用 Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) 是專為此用途設計的手機網頁應用程式：

:::steps
1. 使用 OpenStreetMap 帳號登入。
2. 站在消防栓前方約三公尺處，將手機對準消防栓。應用程式會透過 GPS 和指南針放置點位。
3. 選擇類型和位置；只有在確定時才填寫口徑和編號。
4. 上傳完成。
:::

所有消防栓類型的詳細說明請見 [Hydrantenjäger 說明頁](https://hydrantenjaeger.de/help/)。

## 使用 StreetComplete 或 Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)**（Android、iOS）會詢問附近物件的資料，例如「這是哪種類型的消防栓？」輕觸即可回答。它主要用於補充既有物件的缺漏資訊。
- **[Every Door](https://every-door.app/)**（Android、iOS）適合新增點位。按加號新增點，選擇「Fire Hydrant」並填寫欄位。

## 使用瀏覽器中的 iD 編輯器 {#id}

iD 是 openstreetmap.org 的標準編輯器。

:::steps
1. 開啟 [openstreetmap.org](https://www.openstreetmap.org/)，登入並放大至消防栓所在位置。
2. 點擊上方 **Edit**。首次使用可先完成簡短導覽。
3. 點擊上方 **Point**，將點放在消防栓的正確位置。航照圖可協助定位。
4. 在左側搜尋欄輸入「hydrant」，選擇 **Fire Hydrant** 預設項目。
5. 填寫 **Type**（地下式、柱式、牆式、管式）、**Position**（例如人行道或車道）、**Diameter** 和已知的 **Reference**。
6. 點擊右上方 **Save**，寫下簡短說明，再按 **Upload**。
:::

:::tip 修正現有消防栓
點擊現有消防栓，修改左側欄位並以相同方式儲存。位置錯誤時可拖曳至正確位置。只有在現場確認物件已不存在時才刪除。
:::

## 使用 JOSM 或 Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) 是以 Java 執行的電腦編輯器，[Vespucci](https://vespucci.io/) 則適用 Android。兩者都能直接檢視所有標籤，適合大型任務，例如消防隊巡查後更新整個轄區的消防栓。常用標籤如下。

## 重要標籤 {#tags}

OpenStreetMap 使用 `key=value` 格式的標籤描述物件。應用程式的預設項目會自動設定標籤；手動輸入時請使用：

| 物件 | 標籤 | 意義 |
|---|---|---|
| 消防栓 | `emergency=fire_hydrant` | 每個消防栓必填 |
| | `fire_hydrant:type=underground` | 地下式（也可為 `pillar`、`wall`、`pipe`） |
| | `fire_hydrant:diameter=80` | 公稱口徑 DN，如標示牌所示 |
| | `fire_hydrant:position=sidewalk` | 位置（也可為 `lane`、`parking_lot`、`green`） |
| | `ref=123` | 消防栓編號（若有） |
| | `fire_hydrant:pressure=4` | 壓力（bar），僅填已知值 |
| 抽水點 | `emergency=suction_point` | 從水體取水的位置 |
| 水槽 | `emergency=water_tank` | 蓄水池或消防水槽 |
| 消防池 | `emergency=fire_water_pond` | 消防用水池 |
| 去顫器 | `emergency=defibrillator` | 另加 `indoor=yes/no`、`defibrillator:location=…`、`opening_hours=…` |
| 消防隊駐地 | `amenity=fire_station` | 消防隊建築或場地 |

[地圖標記](/symbols/)頁面說明標籤在 OpenFireMap 中的呈現方式。[OpenStreetMap wiki](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant)有詳細資料。

## 變更何時會顯示？ {#anzeige}

上傳後，消防栓會立即儲存到 OpenStreetMap。待地圖所用服務處理變更後，它才會出現在 OpenFireMap。通常很快，但沒有固定時間。可能延遲的原因請見[資料與時效](../data/#verzoegerung)。

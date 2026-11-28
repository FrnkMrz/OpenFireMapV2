---
title: 常見問題
description: 關於 OpenFireMap 地圖、資料時效、匯出與城鎮圖、參與貢獻、專案和法律的解答。
eyebrow: FAQ
lead: 以下回答最常見的問題。找不到答案？請寄信至 info@openfiremap.org。
order: 10
---

## 地圖與操作 {#karte}

### 為什麼看不到消防栓？ {#keine-hydranten}

消防栓從縮放層級 15 開始顯示。請繼續放大。若仍未顯示，表示 OpenStreetMap 尚未有人新增該區資料。您可以[自行新增](../contribute/)。

### 如何開啟消防栓詳細資料？ {#details}

電腦版在縮放 18 起將滑鼠移到標記上即可顯示。手機版在縮放 17 起輕觸標記。使用鍵盤時，縮放 17 起按 <kbd>Tab</kbd> 選取並按 <kbd>Enter</kbd>。

### 消防栓周圍的圓圈代表什麼？ {#kreis}

半徑為 100 公尺，縮放 16 起點擊或輕觸消防栓時顯示。它可快速指出水帶可及範圍內的消防栓。若先使用「我的位置」，藍線也會顯示您與消防栓的距離。

### 標記上的字母代表什麼？ {#buchstaben}

字母表示類型：**U** 地下式，**O** 地上柱式，**Ø** 乾式消防栓。所有標記請見[地圖標記](/symbols/)頁面。

### 如何分享地圖畫面？ {#teilen}

使用分享按鈕（手機版選單中的「Share Map View」）。連結會包含目前畫面、縮放層級和底圖。也可以將瀏覽器網址加入書籤。

### 可以像應用程式一樣安裝 OpenFireMap 嗎？ {#app}

可以。iPhone 的 Safari 使用 **Share → Add to Home Screen**；Android 的 Chrome 使用 **⋮ → Install app**。不必透過應用程式商店。詳見[手機版地圖](../phone/#app)。

### 地圖能離線使用嗎？ {#offline}

只能部分離線。載入過的區域會依快取設定暫存一段時間。新區域和搜尋需要網路。外出時列印好的[城鎮圖](../town-plan/)更可靠。

## 資料與時效 {#daten}

### 資料來自哪裡？ {#herkunft}

來自 [OpenStreetMap](https://www.openstreetmap.org/)。志工（常有當地消防人員）新增消防栓、供水點、駐地和去顫器。OpenFireMap 顯示資料但不修改。

### 為什麼地圖在德國載入較快？ {#schneller}

德國、奧地利、瑞士、列支敦斯登、盧森堡、另外 40 個歐洲國家以及日本、台灣、馬來西亞、新加坡和汶萊的資料會預先製作成圖磚。其他地區直接透過 Overpass API 取得，速度取決於公開伺服器的負載。詳見[資料與時效](../data/#ladeweg)。

### 新增的消防栓何時會顯示？ {#neu}

時間無法精確預測。Overpass 伺服器處理變更後才會顯示，快取可能造成短暫延遲。若 Overpass 過載或無法連線，就要稍後才會出現。已刪除物件要等下次資料更新才消失。詳見[資料與時效](../data/#verzoegerung)。

### 資料有多新？ {#aktuell}

狀態框顯示資料日期，「Data status & origin」視窗提供詳情。[狀態頁](/status/)列出各國資料時效。

### 地圖載入失敗或顯示過載，該怎麼辦？ {#laedt-nicht}

稍微放大地圖以縮小查詢，再稍後重試。若所有伺服器都過載，問題在公開 Overpass 伺服器，只能稍後重新載入。

### 資料可作為勤務依據嗎？ {#verbindlich}

不可以。OpenFireMap 不是勤務工具。資料可能不完整、過時或錯誤，不能取代派遣中心、地方政府或供水單位的資訊。緊急狀況請先撥打緊急電話（歐洲為 112）。

## 匯出與城鎮圖 {#export}

### 為什麼手機版沒有匯出？ {#export-handy}

列印版計畫圖需要大量記憶體，也需要大螢幕選取範圍，因此匯出與城鎮圖僅限電腦使用。

### 匯出範圍可以多大？ {#export-groesse}

最多 10 × 10 公里。若拖曳較大的矩形，OpenFireMap 會限制範圍。大型城鎮需要網格與街道索引時，請用[城鎮圖](../town-plan/)。

### 匯出與城鎮圖有什麼不同？ {#unterschied}

[匯出](../export/)能快速建立區域圖片、PDF 或點位清單（GPX、CSV）。[城鎮圖](../town-plan/)則是 A4 至 A1 的設計版圖紙，包含固定比例尺、網格、圖例和街道索引，目前適用於德國地區。

### 列印的比例尺不正確。 {#massstab}

列印 PDF 時選 **Actual size** 或 **100%**，不要選「Fit to page」，並使用精靈中選擇的紙張大小。再以尺檢查比例尺。

### 可以列印並轉交給消防隊嗎？ {#drucken}

可以。資料採用 Open Database License。每張圖都必須保留「© OpenStreetMap contributors」署名。匯出與城鎮圖會加入署名，請勿裁切。

## 參與貢獻 {#mitmachen}

### 消防栓遺漏或位置錯誤，誰能修正？ {#korrigieren}

您可以在 OpenStreetMap 修正，只需建立免費帳號。Hydrantenjäger、StreetComplete、iD 和 JOSM 指南見[新增消防栓](../contribute/)。

### 消防隊想盤點轄區消防栓，怎麼開始？ {#feuerwehr}

可在訓練晚間或分組巡查城市。德國消防隊有一份德文指南：[Für Feuerwehren](/help/fire-brigades/)。其他地區可參考[新增消防栓](../contribute/)中的工具。

### 可以複製地方政府或供水單位的消防栓計畫圖嗎？ {#plaene}

只有取得明確許可才可以。這類計畫圖受著作權保護。最好只新增親自在現場看到的資料。

### 可以在自己的地圖中使用消防圖層嗎？ {#overlay}

可以，請使用疊加圖層。詳情見[疊加圖層頁面](/overlay/)。

## 專案與法律 {#projekt}

### 這是官方消防地圖嗎？ {#offiziell}

不是。OpenFireMap 是以 OpenStreetMap 為基礎的私人非商業專案，並未與任何機關或消防隊正式合作。

### OpenFireMap 要收費嗎？ {#kosten}

免費，不需帳號、沒有廣告或訂閱。原始碼以 MIT 授權公開於 [GitHub](https://github.com/FrnkMrz/OpenFireMapV2)。

### OpenFireMap 儲存哪些個人資料？ {#datenschutz}

地圖在瀏覽器中執行，只在本機儲存語言與快取設定、最後的地圖畫面、城鎮圖設定及已載入的地圖資料。搜尋、地圖圖磚與資料會由瀏覽器向外部服務請求。詳見[隱私權政策](/?legal=1)。

### 如何聯絡你們？ {#kontakt}

寄信至 [info@openfiremap.org](mailto:info@openfiremap.org)，或在 [GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues) 回報問題或提出建議。

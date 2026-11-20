---
title: 消火栓を登録する
description: Hydrantenjäger、StreetComplete、Every Door、iD、JOSMでOSMに消防関連地物を追加。
eyebrow: 参加する
lead: 消火栓が見つからないときは、無料のOpenStreetMapアカウントで追加できます。
order: 7
---

## 始める前に {#vorher}
OpenFireMapは[OpenStreetMap](https://www.openstreetmap.org/)（OSM）の情報を表示します。編集はOSM上で行います。アカウントを作成し、メールを確認して各ツールにログインしてください。
:::warn 3つのルール
- 現地で位置と種類を確認した地物だけを登録します。
- 水道局や自治体の資料は許可なくコピーしません。
- 保存時に変更を短く説明します。
:::
ドイツの消防団には[ドイツ語の点検ガイド](/help/fire-brigades/)があります。

## ツール選び {#werkzeug}
| 状況 | ツール | 用途 |
|---|---|---|
| 現地でスマートフォンから追加 | Hydrantenjäger | 消火栓向け、GPSと方位を利用 |
| 周辺を歩いて調査 | StreetComplete / Every Door | 近くの地物を補完・追加 |
| パソコンで編集 | iD | ブラウザー上で簡単に編集 |
| 多数を詳細編集 | JOSM / Vespucci | タグを直接編集 |

## Hydrantenjäger {#hydrantenjaeger}
[Hydrantenjäger](https://hydrantenjaeger.de/)にOSMアカウントでログインし、消火栓の前から位置を設定します。種類と位置を選び、確実なら口径や番号も入力してアップロードします。[詳しい説明](https://hydrantenjaeger.de/help/)。

## StreetComplete / Every Door {#apps}
[StreetComplete](https://streetcomplete.app/)は近くの地物への質問に回答し、既存情報を補うのに便利です。[Every Door](https://every-door.app/)は新しい地点の追加に向きます。プラスボタンで点を置き、「Fire Hydrant」を選びます。

## ブラウザーのiDエディター {#id}
openstreetmap.orgにログインして「編集」を押します。「ポイント」で消火栓の場所を指定し、「Fire Hydrant」プリセットを選びます。種類、位置、口径、番号を入力し、保存、コメント、アップロードを行います。
:::tip 既存地点を修正
地点を選び項目を編集します。位置が違えば移動します。現地で存在しないと確認できた場合のみ削除します。
:::

## JOSM / Vespucci {#josm}
[JOSM](https://josm.openstreetmap.de/)はPC用、[Vespucci](https://vespucci.io/)はAndroid用です。多数の消火栓や地域全体の編集に適しています。

## 主なタグ {#tags}
| 地物 | タグ | 意味 |
|---|---|---|
| 消火栓 | emergency=fire_hydrant | 必須 |
| | fire_hydrant:type=underground | 地下式。pillar、wall、pipeも可 |
| | fire_hydrant:diameter=80 | 公称口径 |
| | fire_hydrant:position=sidewalk | 設置場所 |
| | ref=123 | 番号 |
| | fire_hydrant:pressure=4 | 圧力（bar） |
| 吸水地点 | emergency=suction_point | 水域から取水 |
| 貯水槽 | emergency=water_tank | 防火用水 |
| 消防用池 | emergency=fire_water_pond | 消防水源 |
| AED | emergency=defibrillator | 除細動器 |
| 消防署 | amenity=fire_station | 建物・敷地 |
[地図記号](/symbols/)と[OSM Wiki](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant)をご覧ください。

## 表示されるまで {#anzeige}
変更はOSMに保存され、関連サービスに反映された後OpenFireMapに表示されます。時間は一定ではありません。[データと更新](../data/#verzoegerung)をご覧ください。

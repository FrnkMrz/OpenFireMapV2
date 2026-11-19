---
title: Hidrant ekleme
description: OpenStreetMap’e hidrant, su noktası ve defibrilatör ekleyin.
eyebrow: Katkıda bulun
lead: Haritadaki her hidrant birisi tarafından eklendi. Ücretsiz OpenStreetMap hesabıyla eksikleri siz de ekleyebilirsiniz.
order: 7
---

## Başlamadan önce {#vorher}

OpenFireMap, [OpenStreetMap](https://www.openstreetmap.org/) (OSM) verilerini gösterir. Düzenleme OpenFireMap’te değil OSM’de yapılır.

:::steps
1. openstreetmap.org’da hesap açın.
2. E-posta adresinizi doğrulayın.
3. Aşağıdaki araçlardan birinde oturum açın.
:::

:::warn Üç kural
- Yalnızca sahada kontrol ettiğiniz bilgileri ekleyin.
- İzin olmadan korunan planlardan kopya almayın.
- Kaydederken değişikliği kısaca açıklayın.
:::

## Bir araç seçin {#werkzeug}

| Durum | Araç |
|---|---|
| Sahada telefonla | **Hydrantenjäger** |
| Yürüyüş sırasında ayrıntı eklemek | **StreetComplete** veya **Every Door** |
| Bilgisayarda düzenleme | **iD** düzenleyicisi |
| Çok sayıda nesne veya ileri düzey çalışma | **JOSM** veya **Vespucci** |

## Hydrantenjäger ile {#hydrantenjaeger}

OSM hesabınızla giriş yapın, hidranta birkaç metre mesafede durun, türü ve konumu seçip yükleyin. Çap ve numarayı yalnızca biliyorsanız girin. [Rehber](https://hydrantenjaeger.de/help/).

## StreetComplete veya Every Door {#apps}

StreetComplete mevcut nesnelerin bilgilerini tamamlamaya, Every Door yeni nokta eklemeye yardımcı olur. **Fire Hydrant** seçip alanları doldurun.

## iD düzenleyicisi {#id}

:::steps
1. openstreetmap.org’da oturum açıp alana yakınlaşın.
2. **Edit**’i seçin ve noktayı hidrantın tam yerine koyun.
3. “hydrant” arayın ve **Fire Hydrant**’ı seçin.
4. Türü, konumu ve bilinen ayrıntıları girin.
5. **Save**’e basın, kısa yorum yazın ve değişikliği yükleyin.
:::

Mevcut nesneleri de bu şekilde düzeltebilirsiniz. Var olmadığını doğrulamadan hidrant silmeyin.

## JOSM veya Vespucci {#josm}

Bilgisayar için [JOSM](https://josm.openstreetmap.de/), Android için [Vespucci](https://vespucci.io/) tüm etiketleri gösterir ve büyük düzenlemelere uygundur.

## Önemli etiketler {#tags}

| Nesne | Etiket |
|---|---|
| Hidrant | `emergency=fire_hydrant` |
| Tür | `fire_hydrant:type=underground` (pillar, wall, pipe de olabilir) |
| Çap | `fire_hydrant:diameter=80` |
| Numara | `ref=123` |
| Su alma noktası | `emergency=suction_point` |
| Su deposu | `emergency=water_tank` |
| Defibrilatör | `emergency=defibrillator` |
| İtfaiye istasyonu | `amenity=fire_station` |

[Harita simgeleri](/symbols/) ve [OpenStreetMap wiki](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Değişiklik ne zaman görünür? {#anzeige}

Overpass değişikliği işledikten sonra hidrant görünür. Süre değişebilir. Ayrıntılar: [Veri ve güncellik](../data/#verzoegerung).

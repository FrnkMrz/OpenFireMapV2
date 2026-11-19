---
title: Veri ve güncellik
description: Verilerin kaynağı ve güncelliği, durum penceresi ve yerel önbellek.
eyebrow: Veri
lead: İtfaiye nesneleri OpenStreetMap’ten gelir. OpenFireMap hızlı yükleme için verileri hazırlar ve yeni değişiklikleri alır.
order: 4
---

## Verilerin kaynağı {#quelle}

[OpenStreetMap](https://www.openstreetmap.org/) topluluğu hidrantları, su noktalarını, istasyonları ve defibrilatörleri ekler. OpenFireMap bu verileri değişiklik yapmadan gösterir.

## Hidrant verisi nasıl yüklenir? {#ladeweg}

- **Hazırlanmış döşemeler:** Almanya, Avusturya, İsviçre, Lihtenştayn, Lüksemburg ve 40 Avrupa ülkesi önceden hazırlanmış veri döşemelerini kullanır.
- **Overpass API:** diğer yerlerde harita görünür alanı ve çevresini doğrudan sorgular.

Kapsanan ülkelerde Overpass yalnızca temel veri tarihinden sonraki değişiklikleri sorgular.

### Overpass API nedir? {#overpass}

[Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API), belirli bir alandaki OpenStreetMap nesnelerini arayan herkese açık bir hizmettir. Hız, sunucu yüküne ve sorgu boyutuna bağlıdır. OpenFireMap birkaç sunucuyu dener ve yüklenen alanları tarayıcı önbelleğinde tutar.

## Veriler ne kadar güncel? {#aktualitaet}

| Alan | Temel veri | Yeni ve değişen nesneler |
|---|---|---|
| DACHLiLu | döşemeler genellikle her gün yenilenir | Overpass’tan istenir |
| diğer 40 Avrupa ülkesi | genellikle haftalık | temel veri 10 günden eski değilse Overpass |
| dünyanın geri kalanı | Overpass sunucusunun durumu | her sorguda |

### Yeni nesne neden hemen görünmüyor? {#verzoegerung}

Overpass değişikliği önce işlemelidir. Alan önbelleği, yerel önbellek veya kesintiler görünümü geciktirebilir; kesin süre verilemez. Silinen nesneler sonraki temel veri güncellemesinde kaybolur.

## “Data status & origin” penceresi {#popover}

:::figure data frame=plain
Pencere kaynağı ve canlı güncelleme durumunu gösterir.
:::

Bilgisayarda “Data status details” ile, telefonda durum kutusuna dokunarak açın. Kaynağı, temel veri tarihini ve canlı güncellemeyi gösterir.

## Durum sayfası {#statusseite}

[Durum sayfası](/status/) her ülke için veri yaşını ve nesne sayısını gösterir.

## Yerel önbellek {#cache}

“Info & Legal” içindeki **Local Cache** ayarından kapalı, 1 saat, 1 gün, 3 gün, 7 gün (varsayılan) veya 30 gün seçin. Veriler cihazınızda kalır ve alan yeniden açıldığında kontrol edilir.

## İnternet olmadan {#offline}

OpenFireMap çevrimdışı bir harita değildir. Önbellekteki alanlar bir süre görünür, ancak yeni alanlar ve arama internet ister. Bağlantı yokken basılı [şehir planı](../town-plan/) veya [dışa aktarma](../export/) kullanın.

## Yavaş yükleme {#laden}

Sorguyu küçültmek için yakınlaştırıp daha sonra yeniden deneyin. Tüm Overpass sunucuları yoğun ise beklemek gerekir.

:::warn Operasyonel araç değildir
Veriler eksik, eski veya yanlış olabilir; acil çağrı ya da su idaresi bilgilerinin yerini tutmaz. Acil durumda yerel acil numarayı arayın.
:::

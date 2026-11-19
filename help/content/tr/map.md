---
title: Bilgisayarda harita
description: Arama, konum, katmanlar, hidrant ayrıntıları, paylaşım ve klavye kullanımı.
eyebrow: Harita
lead: Araçlar sol üstte, veri tarihi sağ altta bulunur. Düğmelerin ne işe yaradığını öğrenin.
order: 1
---

## Genel görünüm {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
Bilgisayarda OpenFireMap.
:::

1. **Ara:** yer veya adres bul.
2. **Konumum:** bulunduğun yeri göster.
3. **Harita katmanları:** arka planı değiştir.
4. **Dışa aktar:** planı veya noktaları kaydet.
5. **Paylaş:** bu görünümün bağlantısını kopyala.
6. **Hidrant:** ayrıntılar için üzerine gel, 100 m yarıçap için tıkla.
7. **Durum:** yakınlaştırma düzeyi ve veri tarihi.
8. **Bilgi ve yasal:** yardım, simgeler ve hukuki bilgiler.

## Bir yer bul {#suche}

Arama alanına yer, sokak veya adres yazıp <kbd>Enter</kbd> tuşuna ya da büyütece basın. Harita ilk sonucu 16. düzeyde gösterir. Nominatim yer ve adres bulur, tek tek hidrantları değil.

## Konumum {#standort}

Konum düğmesi yerinizi gösterir ve haritayı 17. düzeye getirir. Tarayıcı ilk kullanımda izin ister. Konum kaydedilmez.

:::tip Konum bulunamadı mı?
Tarayıcının openfiremap.org için konuma izin verdiğini kontrol edin. GPS’siz bilgisayarlar yaklaşık konum gösterebilir.
:::

## Hidrantlar ve diğer nesneler {#objekte}

| Yakınlaştırma | Görünüm |
|---|---|
| 12’den düşük | nesne yok |
| 12’den itibaren | itfaiye istasyonları |
| 14’ten itibaren | istasyon simgeleri ve belediye sınırları |
| 15’ten itibaren | hidrant, su noktası ve defibrilatör |
| 17’den itibaren | harfli simgeler |
| 18’den itibaren | üzerine gelince ayrıntılar |

:::figure marker frame=plain
Bir hidranta tıklamak 100 metre yarıçap çizer.
:::

Ayrıntılar 18. düzeyden itibaren simge üzerine gelince açılır. Klavyeyle 17. düzeyden itibaren <kbd>Tab</kbd> ile simgeyi seçip <kbd>Enter</kbd>’a basın. Yarıçap 16. düzeyden itibaren görünür; **Konumum** kullanıldıysa mesafe çizgisi de gösterilir. Veriler OpenStreetMap’ten gelir. Eksikleri eklemek için [Katkıda bulunun](../contribute/).

Renk ve simgeler için [Katmanlar ve simgeler](../layers/) sayfasına bakın.

## Harita katmanları {#ebenen}

Harita düğmesinde standart, yazdırma, gece, uydu, topoğrafik, OSM ve BayernAtlas arka planları bulunur. İtfaiye nesneleri her zaman üstte gösterilir.

## Paylaşım ve bağlantılar {#teilen}

Paylaş düğmesi yer, yakınlaştırma ve arka planı içeren tam görünüm bağlantısını kopyalar. Haritayı hareket ettirdikçe tarayıcı adresi güncellenir; adresi yer imi olarak da kaydedebilirsiniz.

## Durum ve veri tarihi {#status}

Sağ altta yakınlaştırma ve veri tarihi yer alır. “+Sync” yeni değişikliklerin yüklendiğini belirtir. “Data status details” kaynak ve veri yaşını gösterir. [Veri ve güncellik](../data/).

## Bilgi, yasal ve ayarlar {#info}

“Info & Legal” yardım, simgeler, katman, gizlilik ve lisanslara bağlantı verir. Yerel önbellek süresi de buradan seçilir: kapalı, 1 saat, 1 gün, 3 gün, 7 gün (varsayılan) veya 30 gün.

## Klavyeyle kullanım {#tastatur}

- İlk <kbd>Tab</kbd> “Haritaya geç” bağlantısına gider.
- Ok tuşları haritayı kaydırır; <kbd>+</kbd> ve <kbd>−</kbd> yakınlaştırır.
- 17. düzeyden itibaren simgeler <kbd>Tab</kbd> ile seçilir. <kbd>Enter</kbd> veya <kbd>Boşluk</kbd> ayrıntıları açar; <kbd>Escape</kbd> kapatır.
- Menü ve pencerelerde odak, kapatılana kadar içeride kalır.
- Dışa aktarmada **Use visible area** geçerli görünümü seçer; dikdörtgen çizmek gerekmez.

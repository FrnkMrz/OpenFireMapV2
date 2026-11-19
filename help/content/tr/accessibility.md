---
title: Erişilebilirlik
description: OpenFireMap’i klavye, ekran okuyucu, büyütme ve azaltılmış hareketle kullanma.
eyebrow: Erişilebilirlik
lead: OpenFireMap fare olmadan, ekran okuyucuyla ve yüksek büyütmede çalışmalıdır. Özellikler ve bilinen eksikler burada açıklanır.
order: 9
---

## Hedefimiz {#ziel}

Harita WCAG 2.2 AA düzeyini izler. Otomatik kontroller klavye kullanımını, etiketleri, kontrastı, %400 büyütmeyi ve kontrol boyutlarını inceler.

:::note Durum hakkında açık bilgi
Otomatik kontroller her şeyi bulamaz. Gerçek cihazlarda ekran okuyucuyla kapsamlı testler hâlâ yapılmalıdır. Sorun görürseniz bize bildirin.
:::

## Klavyeyle {#tastatur}

| Tuş | İşlev |
|---|---|
| <kbd>Tab</kbd> | sonraki kontrol; ilk durak “Haritaya geç” |
| Oklar | odaktayken haritayı kaydır |
| <kbd>+</kbd>/<kbd>−</kbd> | yakınlaştır ve uzaklaştır |
| 17. düzeyden itibaren <kbd>Tab</kbd> | simgeler arasında geç |
| <kbd>Enter</kbd>/<kbd>Boşluk</kbd> | ayrıntıları aç |
| <kbd>Escape</kbd> | ayrıntı, menü ve pencereleri kapat |

Odak her zaman görünürdür. Dışa aktarmada **Use visible area** geçerli görünümü seçer. Şehir planında öğeleri ok tuşlarıyla taşıyabilirsiniz.

## Ekran okuyucuyla {#screenreader}

Harita adlandırılmış bir bölgedir; simgelerin adları vardır ve bildirimler okunur. Durum kutusu harita hareketlerinde sessiz kalır. Etiketler haritanın tüm dillerinde bulunur. Bu yardım Türkçe, Almanca ve İngilizce sunulur.

:::tip Çok sayıda simge
17. düzeyin altında yüzlerce odak durağı oluşmaması için noktalar tek tek seçilemez. Simgeler görünene kadar <kbd>+</kbd> ile yakınlaştırın.
:::

## Görme ve büyütme {#sehen}

- Kontrast açık ve koyu arka planlarda kontrol edilir.
- Tarayıcı %400 yakınlaştırıldığında dar menü görünümüne geçer.
- Hidrantlar yalnızca renkle değil, harflerle de ayrılır.
- **Print (Light)** ve **Night (Dark)** parlamayı azaltabilir.

## Hareket {#bewegung}

İşletim sisteminde “Reduce motion” açıksa harita arama sonucuna animasyonsuz geçer.

## Telefon {#smartphone}

Kontroller en az 24 × 24 pikseldir. Simgelere dokunarak ayrıntıları açabilirsiniz. VoiceOver ve TalkBack menü düğmelerinde kullanılabilir. [Telefonda harita](../phone/).

## Henüz test edilmedi {#offen}

- VoiceOver, TalkBack ve NVDA ile tam cihaz testleri
- tüm arka planlarda, özellikle uyduda simge kontrastı
- şehir planı asistanının ekran okuyucuyla kullanımı

## Engel bildirin {#melden}

Cihazı, tarayıcıyı ve ekran okuyucuyu belirterek **[info@openfiremap.org](mailto:info@openfiremap.org)** adresine yazın veya [GitHub’da sorun bildirin](https://github.com/FrnkMrz/OpenFireMapV2/issues).

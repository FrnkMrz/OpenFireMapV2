---
title: İtfaiye ekipleri için
description: Tatbikat veya şehir turunda bölgenizdeki hidrantları, su noktalarını ve defibrilatörleri kontrol edip OpenStreetMap’i güncelleyin.
eyebrow: İtfaiye ekipleri için
lead: Bir tatbikat akşamı, bölgenizdeki hidrantları kontrol edip eksikleri eklemek için yeterlidir. OpenStreetMap bilgisi gerekmeden hazırlık, uygulama ve takip adımları burada.
order: 8
---

## Neden faydalı? {#warum}

OpenFireMap, [OpenStreetMap](https://www.openstreetmap.org/)’te kayıtlı hidrantları, su noktalarını ve defibrilatörleri gösterir. OSM’de olmayan bir nesne haritada ve basılı [şehir planında](../town-plan/) da görünmez. Ekipçe yapılan bir tur alan bilgisini artırır, genç itfaiyeciler için somut etkinlik sağlar, planları günceller ve arızaların belediye ya da su idaresine iletilmesine yardımcı olur.

:::note Operasyonel belge değildir
OpenFireMap ücretsiz bir projedir ve resmî operasyon belgelerinin yerini tutmaz. Acil durumda **112**’yi arayın.
:::

## Hazırlık {#vorbereitung}

Etkinliği yöneten kişi bir iki hafta önceden plan yapar:

:::steps
1. **Koordinasyon.** Tarihi komutanlıkla kararlaştırın. Belediye veya su idaresine bilgi verin; hidrantları açmayacağınızı ve arıza listesini paylaşabileceğinizi belirtin.
2. **Alanı bölün.** [Şehir planını](../town-plan/) yazdırıp ızgara karelerini ekiplere dağıtın. Bir ekip saatte yaklaşık 15–25 hidrantı kontrol edebilir.
3. **Mevcut duruma bakın.** OpenFireMap’i 17. düzeyde açın. [CSV dışa aktarımı](../export/#gpx-csv) kontrol listesi olabilir.
4. **Hesap açın.** Düzenleme yapacak herkes kendi ücretsiz [OpenStreetMap](../contribute/#vorher) hesabını açar.
5. **Etkinliği tanımlayın.** Düzenli haritalama için [OSM kurallarına](https://osmfoundation.org/wiki/Organised_Editing_Guidelines) uygun olarak kim, nerede, ne zaman ve ne yapılacağını açıklayın. Değişiklik yorumlarına `#OpenFireMap` ekleyin.
6. **Ekipmanı hazırlayın.** [Hydrantenjäger](https://hydrantenjaeger.de/) açık ve şarjlı telefonlar, powerbank, reflektör yelek, fener ve not kâğıdı hazırlayın. Konum ve pusula iznini önceden verin.
:::

:::tip Genç itfaiyeciler
OSM kuralları ve ebeveyn izni geçerlidir. Gençler arayıp kontrol ederek not alabilir; yetişkin verileri kendi hesabından ekler.
:::

## Yazdırılabilir belgeler {#ausdrucken}

| Belge | Kimler için | Dosya |
|---|---|---|
| **Ekip kartı**: altı adım, güvenlik, hidrant tabelasını okuma ve hidrant türleri | her ekip, çift taraflı A4 | [PDF’yi indir](/downloads/OpenFireMap-Feuerwehr-Truppkarte.pdf) (Almanca) |
| **Kayıt formu, arıza listesi** ve belediye veya su idaresine mektup şablonu | ekipler ve takip çalışması, yatay A4 | [PDF’yi indir](/downloads/OpenFireMap-Feuerwehr-Erfassungsbogen.pdf) (Almanca) |

Bunlar itfaiyeyle saha testi öncesi ilk sürüm belgelerdir ve şimdilik yalnızca Almanca mevcuttur. Görüş ve önerilerinizi info@openfiremap.org adresine iletebilirsiniz.

## Tatbikatın akışı {#ablauf}

90 dakika için: 15 dakika bilgilendirme ve gösterim, 60 dakika ekiplerle saha turu, 15 dakika değerlendirme. İki veya üç kişilik ekipte biri telefonu kullanır, biri trafiğe dikkat eder, gerekirse biri not alır.

## Hidrant başında: altı adım {#am-hydranten}

:::steps
1. **Hidrantı bulun.** Tabelada tür ve çoğu zaman nominal çap yazar; sayılar tabeladan uzaklığı ve yönü gösterir.
2. **Kayıtlı olup olmadığını kontrol edin.** Hydrantenjäger veya OpenFireMap’te yakındaki işaretlere bakın.
3. **Yeni kayıt ekleyin.** Birkaç metre önünde durup tür ve konumu seçin. Çap ve numarayı yalnızca eminseniz yazın.
4. **Mevcut kaydı kontrol edin.** Tür, çap, numara ve konumu gerekirse düzeltin.
5. **Yükleyin.** İnternet yoksa sokak, yakındaki kapı numarası, tür ve tabelayı kâğıda not edip sonra ekleyin.
6. **Arızaları ayrı yazın.** Eksik tabela, kapalı kapak, üstü asfaltla kapanmış veya hasarlı hidrant OSM’ye değil, su idaresi için arıza listesine yazılır.
:::

[Hydrantenjäger yardım sayfası](https://hydrantenjaeger.de/help/) uygulamayı anlatır. Diğer araçlar [Hidrant ekleme](../contribute/#werkzeug) sayfasında.

## Diğer nesneler {#weitere-objekte}

Zaman kalırsa su alma noktalarını, yangın suyu havuz ve depolarını ve halka açık defibrilatörleri çalışma saatleriyle kaydedin. Etiketler [tabloda](../contribute/#tags).

## Güvenlik ve kurallar {#sicherheit}

:::warn Her ekip için
- Reflektör yelek giyin, taşıt yolunda durmayın; gençler gözetim altında olsun.
- Hidrantları açmayın veya çalıştırmayın, kapakları kaldırmayın. Test su idaresinin işidir.
- Özel mülke yalnızca izinle girin.
- İnsanları ve araç plakalarını fotoğraflamayın.
- Yalnızca gördüğünüzü ekleyin; korumalı planları kopyalamayın.
:::

Komutanlık etkinlikten önce sigorta kapsamını netleştirmelidir.

## Sonrasında {#nachbereitung}

Bilgisayarda bir veya iki kişi yaklaşık bir saat ayırır:

:::steps
1. Değişikliklerin ulaştığını kontrol edin. Görünme süresi değişir; [Veri ve güncellik](../data/#verzoegerung).
2. Kâğıt notlarını [iD düzenleyicisiyle](../contribute/#id) ekleyin.
3. Yinelenen noktaları, türü olmayan veya çatıda görünen hidrantları kontrol edin. OSM profilinden veya `#OpenFireMap` etiketiyle değişiklikleri bulun.
4. Arıza listesini belediyeye veya su idaresine gönderin.
5. [Şehir planını](../town-plan/) yeniden yazdırıp istasyona asın.
:::

:::tip Bize anlatın
Deneyim ve önerilerinizi info@openfiremap.org adresine gönderebilirsiniz.
:::

## Düzenli olarak tekrarlayın {#wiederholen}

Hidrantlar eklenir, taşınır veya kaldırılır. Yılda bir kontrol, örneğin kış hizmetinden sonra, ve yeni yerleşimlerin takibi planları güncel tutar.

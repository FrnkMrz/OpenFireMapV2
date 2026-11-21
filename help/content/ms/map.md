---
title: Peta pada komputer
description: Carian, lokasi, lapisan peta, butiran pili bomba, perkongsian, kotak status dan penggunaan papan kekunci OpenFireMap pada komputer.
eyebrow: Peta
lead: Semua alat berada di kiri atas dan tarikh data di kanan bawah. Panduan ini menerangkan setiap butang dan perkara yang ditunjukkan pada peta.
order: 1
---

## Gambaran keseluruhan {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap pada komputer: bandar lama Nuremberg pada tahap zum 17.
:::

1. **Carian:** cari tempat atau alamat.
2. **Lokasi saya:** beralih ke tempat anda.
3. **Lapisan peta:** tukar peta latar.
4. **Eksport:** pelan pili bomba sebagai PNG atau PDF, titik sebagai GPX atau CSV.
5. **Kongsi:** salin pautan ke paparan ini.
6. **Pili bomba:** halakan tetikus untuk melihat butiran; klik untuk bulatan 100 meter.
7. **Kotak status:** tahap zum dan tarikh data.
8. **Maklumat & Undang-undang:** bantuan, simbol peta, notis undang-undang, privasi dan tetapan.

## Cari tempat {#suche}

Taip tempat, jalan atau alamat ke dalam medan carian di kiri atas dan tekan <kbd>Enter</kbd> atau klik kaca pembesar. Peta beralih ke hasil pertama dan zum ke tahap 16 supaya pili bomba kelihatan.

Carian menggunakan Nominatim, perkhidmatan carian OpenStreetMap. Ia mencari tempat dan alamat, bukan pili bomba individu.

## Lokasi saya {#standort}

Butang lokasi menunjukkan tempat anda dan zum ke tahap 17. Kali pertama, pelayar bertanya sama ada OpenFireMap boleh menggunakan lokasi anda. Lokasi hanya digunakan dalam pelayar dan tidak disimpan.

:::tip Lokasi tidak ditemui?
Pastikan pelayar membenarkan akses lokasi untuk openfiremap.org. Pada komputer tanpa GPS, kedudukan mungkin hanya tepat dalam beberapa ratus meter.
:::

## Pili bomba dan objek lain {#objekte}

Paparan bergantung pada tahap zum:

| Tahap zum | Perkara yang muncul |
|---|---|
| bawah 12 | belum ada objek |
| dari 12 | balai bomba |
| dari 14 | simbol balai dan sempadan perbandaran |
| dari 15 | pili bomba, titik air dan defibrilator sebagai titik berwarna |
| dari 17 | semua objek sebagai simbol berhuruf |
| dari 18 | butiran apabila tetikus diarahkan |

:::figure marker frame=plain
Klik pili bomba untuk melukis bulatan berjari-jari 100 meter.
:::

**Melihat butiran:** dari tahap 18, halakan tetikus pada simbol. Dengan papan kekunci, ini berfungsi dari tahap 17: pilih simbol dengan <kbd>Tab</kbd> dan tekan <kbd>Enter</kbd>.

**Jejari dan jarak:** dari tahap 16, klik pili bomba untuk melihat bulatan putus-putus berjari-jari 100 meter. Bulatan ini membantu menilai pili yang berada dalam jangkauan hos. Dari tahap 17, label “100 m” muncul. Jika anda menggunakan **Lokasi saya** dahulu, garis biru dari tempat anda ke pili bomba turut menunjukkan jarak dari tahap 17.

Butiran menunjukkan maklumat dalam OpenStreetMap seperti jenis, diameter, nombor, tekanan, lokasi atau pengendali. Jika ada yang tiada, belum ada sesiapa menambahkannya. [Sumbang](../contribute/) menerangkan caranya.

Halaman [Lapisan & simbol](../layers/) menerangkan simbol dan warna.

## Lapisan peta {#ebenen}

Butang ikon peta membuka pilihan latar: standard, cetak, malam, satelit, topografi, dua gaya OSM, serta BayernAtlas dan imej udara di Bavaria. Objek bomba sentiasa berada di atas. [Lapisan & simbol](../layers/) menerangkan latar yang sesuai untuk setiap tugasan.

## Perkongsian dan pautan {#teilen}

Butang kongsi menyalin pautan tepat ke paparan ini. Sesiapa yang membukanya akan melihat tempat, tahap zum dan latar yang sama.

Alamat pelayar berubah apabila peta bergerak. Bentuknya `#zoom/latitude/longitude/background`, contohnya `openfiremap.org/#17/49.45280/11.07700/voyager`. Anda juga boleh menandainya.

## Kotak status dan tarikh data {#status}

Bahagian kanan bawah menunjukkan tahap zum semasa dan tarikh data, contohnya “Setakat: 1 hari lalu”. “+Sync” bermaksud perubahan OpenStreetMap yang lebih baharu sudah dimuatkan. “Butiran status data” menunjukkan sumber, tarikh asas dan keadaan kemas kini langsung. Lihat [Data & kesegaran](../data/).

## Maklumat, undang-undang dan tetapan {#info}

“Maklumat & Undang-undang” di kiri bawah membuka pautan ke bantuan ini, simbol peta dan lapisan tindanan, serta notis undang-undang, privasi dan lesen. Di sini juga anda menetapkan **cache setempat**: mati, 1 jam, 1 hari, 3 hari, 7 hari (lalai) atau 30 hari. Kawasan yang pernah dimuatkan akan dipaparkan lebih pantas.

## Dengan papan kekunci {#tastatur}

OpenFireMap boleh digunakan sepenuhnya tanpa tetikus:

- <kbd>Tab</kbd> pertama membawa anda ke “Langkau ke peta”.
- Pada peta, kekunci anak panah mengalihkan paparan; <kbd>+</kbd> dan <kbd>−</kbd> menzum.
- Dari tahap 17, simbol dicapai dengan <kbd>Tab</kbd>. <kbd>Enter</kbd> atau <kbd>Space</kbd> membuka butiran; <kbd>Escape</kbd> menutupnya.
- Dalam menu dan dialog, fokus kekal di dalam dialog; <kbd>Escape</kbd> menutupnya.
- Dalam eksport, “Gunakan kawasan yang kelihatan” memilih paparan semasa tanpa menyeret segi empat.

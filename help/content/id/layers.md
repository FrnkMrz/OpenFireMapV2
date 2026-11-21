---
title: Lapisan & simbol
description: Peta latar untuk setiap kebutuhan, objek pada tiap tingkat zoom, serta arti warna dan huruf pada simbol.
eyebrow: Lapisan & simbol
lead: Di bawah objek pemadam terdapat peta latar pilihan Anda. Simbol di atasnya menggunakan warna dan huruf yang konsisten.
order: 3
---

## Peta latar {#hintergrund}

:::figure layers frame=plain
Menu “Map layers” di komputer.
:::

| Peta latar | Cocok untuk |
|---|---|
| **Standard (Voyager)** | penggunaan sehari-hari: jalan jelas, nomor rumah mulai zoom 17 |
| **Print (Light)** | cetak dan ekspor: latar sangat terang, simbol menonjol |
| **Night (Dark)** | malam hari dan di kendaraan, mengurangi silau |
| **Satellite (Esri)** | orientasi di lokasi: bangunan, jalan masuk, vegetasi |
| **Topographic (OSM)** | kontur, jalur, dan perairan di luar kota |
| **OSM (Intl)** | gaya OpenStreetMap yang umum |
| **OSM (DE Style)** | OpenStreetMap dengan gaya Jerman |
| **Bavaria Base** | peta resmi badan survei Bavaria, hanya untuk Bavaria |
| **Bavaria Aerial** | citra udara resmi, hanya untuk Bavaria |

Peta latar yang dipilih ikut tersimpan saat Anda membagikan tautan dan digunakan untuk [ekspor](../export/).

:::tip Menemukan nomor rumah
Pada zoom 17 dan 18, Standard dan OSM menampilkan nomor rumah. Ini memudahkan pencocokan hidran dengan alamat.
:::

## Tingkat zoom {#zoom}

OpenFireMap hanya memuat data yang sesuai dengan tampilan. Tingkat zoom terlihat di kotak status.

| Tingkat zoom | Yang terlihat |
|---|---|
| di bawah 12 | belum ada objek (status “Standby”) |
| 12–13 | pos pemadam sebagai titik |
| mulai 14 | pos sebagai simbol dan batas wilayah |
| 15–16 | hidran, titik air, dan defibrilator sebagai titik berwarna |
| mulai 16 | lingkaran 100 meter saat hidran diketuk |
| mulai 17 | simbol berhuruf, dapat dipilih dengan keyboard |
| 18 | detail saat diarahkan |

## Warna dan simbol {#symbole}

Warna menunjukkan kategori objek; huruf menunjukkan jenisnya:

- **Merah:** hidran. **U** berarti hidran bawah tanah, **O** hidran tegak, **Ø** hidran kering. Hidran dinding dan jenis lain memiliki tanda masing-masing.
- **Biru:** titik air, misalnya kolam pemadam, tangki, sumur air pemadam, atau titik penyedotan.
- **Hijau:** defibrilator (AED).
- **Pos pemadam** memiliki simbol bangunan khusus.

Mulai zoom 17, beberapa objek yang berjarak kurang dari 5 meter dikelompokkan dan jumlahnya ditampilkan.

Halaman **[simbol peta](/symbols/)** mencantumkan setiap simbol beserta tag OpenStreetMap-nya. Ini juga berguna bagi pemeta yang ingin mengetahui asal suatu simbol.

:::note Asal detail
Jenis, diameter, nomor, dan informasi lainnya berasal dari OpenStreetMap. Jika jenis hidran belum dicatat, peta menampilkan titik merah tanpa huruf. [Berkontribusi](../contribute/) menjelaskan cara menambahkannya.
:::

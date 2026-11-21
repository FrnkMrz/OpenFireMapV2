---
title: Ekspor
description: Ekspor peta hidran sebagai PNG atau PDF dan hidran sebagai GPX atau CSV; pilih area, format, tingkat detail, dan batas ukuran.
eyebrow: Ekspor
lead: Beberapa klik mengubah tampilan peta menjadi peta hidran untuk dicetak atau daftar titik untuk perangkat navigasi dan spreadsheet.
order: 5
---

## Format yang sesuai {#formate}

| Format | Hasil | Cocok untuk |
|---|---|---|
| **PNG** | gambar area dengan judul, skala, tanggal, dan atribusi | papan informasi, surel, presentasi |
| **PDF** | peta yang sama dalam PDF | cetak dan arsip |
| **GPX** | hidran dan objek lain sebagai titik arah | perangkat navigasi, operasi, aplikasi luar ruang |
| **CSV** | tabel dengan detail setiap objek | spreadsheet, analisis, perbandingan daftar |

Ekspor hanya tersedia di komputer. Untuk peta berdesain dengan kisi, indeks jalan, dan skala tetap, gunakan [peta kota](../town-plan/).

## Langkah demi langkah {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Menu ekspor.
:::

:::steps
1. **Buka menu ekspor:** tombol panah ke bawah di kiri atas, di sebelah lapisan peta.
2. **Pilih rasio (1):** **Free** untuk area apa pun, **A4 landscape** atau **A4 portrait** untuk proporsi kertas A4.
3. **Atur area:** **Select Area on Map (2)** memungkinkan Anda menarik persegi di peta. **Use visible area (3)** memakai tampilan saat ini (dengan proporsi A4 jika dipilih). Jika tidak memilih area, tampilan yang terlihat akan diekspor.
4. **Pilih tingkat detail (4):** zoom 15 sampai 18. Tingkat lebih tinggi menampilkan detail lebih banyak dan menghasilkan berkas lebih besar. Untuk satu jalan, gunakan 18; untuk seluruh kota, 16 lebih sesuai.
5. **Pilih format:** peta hidran sebagai **PNG (5)** atau **PDF**, objek sebagai **GPX (6)** atau **CSV**.
6. **Periksa judul:** OpenFireMap menyarankan judul berdasarkan nama tempat. Ubah bila perlu lalu klik **Create**.
:::

:::figure title frame=plain
Judul disarankan otomatis dan dapat diubah sebelum peta dibuat.
:::

Saat peta dibuat, jendela progres menunjukkan prosesnya. **Cancel Process** membatalkan ekspor kapan saja.

## Isi peta {#plan}

PNG dan PDF berisi area pilihan dengan [peta latar](../layers/) saat ini, semua objek pemadam, batas wilayah, judul, skala, tanggal, tingkat detail, dan atribusi “© OpenStreetMap contributors”.

Nama berkas mencantumkan tanggal, waktu, tingkat detail, dan judul, misalnya `2026-11-19_14-30_Z18_Nuremberg.png`.

:::tip Peta yang mudah dibaca
Pilih latar **Print (Light)** sebelum ekspor. Simbol lebih mudah terlihat pada latar yang terang.
:::

## GPX dan CSV {#gpx-csv}

Berkas GPX berisi objek sebagai titik arah dengan koordinat dan informasi yang tersedia. Berkas CSV menyediakan tabel untuk spreadsheet, dengan kolom seperti jenis, nomor, diameter, dan koordinat.

## Batas area {#grenzen}

Area ekspor maksimum adalah 10 × 10 kilometer. Jika persegi yang ditarik lebih besar, OpenFireMap membatasi ukurannya. Ini menghindari berkas terlalu besar dan penggunaan memori berlebihan. Untuk wilayah kota yang lebih luas, gunakan [peta kota](../town-plan/).

:::warn Periksa sebelum digunakan
Pastikan data dan peta hasil ekspor cukup mutakhir dan benar untuk tujuan Anda. OpenFireMap bukan sumber operasional resmi.
:::

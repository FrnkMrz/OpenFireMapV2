---
title: Eksport
description: Eksport pelan pili bomba sebagai PNG atau PDF dan pili bomba sebagai GPX atau CSV; pilih kawasan, format, tahap butiran dan fahami hadnya.
eyebrow: Eksport
lead: Beberapa klik menukar paparan peta menjadi pelan pili bomba untuk dicetak atau senarai titik bagi peranti navigasi dan hamparan elektronik.
order: 5
---

## Format untuk kegunaan apa? {#formate}

| Format | Hasil | Sesuai untuk |
|---|---|---|
| **PNG** | imej kawasan dengan tajuk, skala, tarikh dan kredit | papan notis, e-mel, pembentangan |
| **PDF** | pelan yang sama sebagai PDF | cetakan dan arkib |
| **GPX** | pili dan objek lain sebagai titik laluan | peranti navigasi, operasi dan aplikasi luar |
| **CSV** | jadual dengan butiran setiap objek | hamparan, analisis, perbandingan senarai |

Eksport hanya tersedia pada komputer. Untuk pelan tersusun dengan grid, indeks jalan dan skala tetap, gunakan [pelan bandar](../town-plan/).

## Langkah demi langkah {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Menu eksport.
:::

:::steps
1. **Buka menu eksport:** butang anak panah ke bawah di kiri atas, bersebelahan lapisan peta.
2. **Pilih nisbah aspek (1):** **Bebas** untuk sebarang kawasan, **A4 landskap** atau **A4 potret** untuk nisbah kertas A4.
3. **Tetapkan kawasan:** **Pilih kawasan pada peta (2)** membolehkan anda menyeret segi empat. **Gunakan kawasan yang kelihatan (3)** mengambil paparan semasa (dalam nisbah A4 jika dipilih). Jika tiada pilihan, paparan semasa dieksport.
4. **Pilih tahap butiran (4):** zum 15 hingga 18. Tahap lebih tinggi memberi lebih butiran dan fail lebih besar. Untuk jalan, 18 sesuai; untuk seluruh bandar, 16 lebih baik.
5. **Klik format:** peta pili bomba sebagai **PNG (5)** atau **PDF**, data pili sebagai **GPX (6)** atau **CSV**.
6. **Semak tajuk:** OpenFireMap mencadangkan tajuk berdasarkan nama tempat. Ubah jika perlu dan klik **Cipta**.
:::

:::figure title frame=plain
Tajuk dicadangkan dan boleh diubah sebelum pelan dicipta.
:::

Semasa pelan dibuat, tetingkap kemajuan menunjukkan prosesnya. **Batalkan proses** menghentikan eksport pada bila-bila masa.

## Kandungan pelan {#plan}

PNG dan PDF mengandungi kawasan dipilih dengan [peta latar](../layers/) semasa, semua objek bomba, sempadan perbandaran, tajuk, skala, tarikh, tahap butiran dan kredit “© OpenStreetMap contributors”.

Nama fail mengandungi tarikh, masa, tahap butiran dan tajuk, contohnya `2026-11-19_14-30_Z18_Nuremberg.png`.

:::tip Pelan mudah dibaca
Pilih latar **Cetak (Light)** sebelum mengeksport. Simbol paling menonjol dan penggunaan dakwat berkurang. **Topografi** mencapai tahap butiran 17.
:::

## GPX dan CSV {#gpx-csv}

**GPX** mengandungi setiap objek sebagai titik laluan dengan nama dan huraian butiran penting. Muatkan fail ke peranti navigasi, aplikasi operasi atau program seperti OsmAnd dan Garmin BaseCamp.

**CSV** ialah jadual yang menggunakan koma bertitik sebagai pemisah. Setiap baris ialah satu objek dengan jenis, subjenis, nama, rujukan, koordinat, diameter, tekanan, kadar aliran, alamat, pengendali, ID OSM, pautan OpenStreetMap, sumber data dan lesen. Tajuk lajur dalam bahasa Jerman. Excel, LibreOffice dan Numbers membukanya terus.

## Had {#grenzen}

- **Maksimum 10 × 10 kilometer.** Kawasan lebih besar boleh membebankan pelayar. Jika anda menyeret segi empat lebih besar, OpenFireMap mengehadkannya dan memaklumkan anda.
- **Di bawah tahap zum 15**, peta belum menunjukkan pili bomba. Eksport memuatkan data sendiri dan mengambil sedikit masa lebih lama.
- **Komputer sahaja.** Menu eksport tidak tersedia pada telefon pintar.
- Jika kawasan tiada objek, mesej “Tiada objek di kawasan dipilih!” dipaparkan.

:::note Kredit
Data dilesenkan di bawah Open Database License. Jika anda berkongsi atau memaparkan pelan, “© OpenStreetMap contributors” mesti kekal kelihatan. Jangan potong kredit itu.
:::

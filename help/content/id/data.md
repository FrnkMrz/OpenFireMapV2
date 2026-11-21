---
title: Data & kemutakhiran
description: Sumber data OpenFireMap, kemutakhirannya, isi jendela status data, dan fungsi cache lokal.
eyebrow: Data
lead: Semua objek pemadam berasal dari OpenStreetMap. OpenFireMap menyiapkannya agar cepat dimuat dan mengambil perubahan baru secara langsung.
order: 4
---

## Sumber data {#quelle}

Hidran, titik air, pos pemadam, dan defibrilator ditambahkan oleh komunitas [OpenStreetMap](https://www.openstreetmap.org/), sering kali oleh petugas pemadam setempat. OpenFireMap menampilkan data ini, tetapi tidak mengubahnya.

## Cara OpenFireMap memuat hidran {#ladeweg}

Bergantung pada wilayah, peta memakai salah satu dari dua cara:

- **Ubin yang telah disiapkan:** untuk Jerman, Austria, Swiss, Liechtenstein, Luksemburg, serta 40 negara Eropa lainnya, OpenFireMap membuat ubin data terlebih dahulu dari ekstrak negara OpenStreetMap (Geofabrik). Ubin dihosting di Cloudflare dan dikirim melalui cache-nya. Browser hanya mengambil beberapa ubin yang diperlukan untuk tampilan.
- **Overpass API:** di wilayah lain, OpenFireMap meminta data area yang terlihat beserta margin langsung dari server Overpass publik.

:::note Mengapa lebih cepat di Jerman dan Eropa
Bukan karena Overpass menjawab lebih cepat. Di negara-negara tersebut, hidran dibaca dari ubin yang sudah disiapkan; Overpass hanya diminta untuk perubahan sejak tanggal data dasar, sehingga permintaannya jauh lebih kecil.
:::

### Apa itu Overpass API {#overpass}

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) adalah layanan publik untuk mencari data OpenStreetMap berdasarkan objek dan area, misalnya “semua hidran dalam persegi panjang ini”. Server dikelola relawan dan organisasi, serta dipakai bersama oleh banyak aplikasi.

Kecepatan jawaban bergantung pada:
- **beban** pada server yang digunakan OpenFireMap;
- **luas area**, yang menentukan lamanya permintaan;
- **waktu tunggu dan penolakan** saat server sibuk atau membatasi permintaan.

OpenFireMap mengenal empat server Overpass dan mencobanya dalam urutan acak. Jika server tidak menjawab atau melaporkan beban berlebih, peta menundanya sebentar lalu mencoba server berikutnya. Area yang pernah dimuat disimpan di cache lokal browser.

## Kemutakhiran data {#aktualitaet}

| Wilayah | Data dasar | Entri baru dan berubah |
|---|---|---|
| Jerman, Austria, Swiss, Liechtenstein, Luksemburg | ubin yang biasanya dibuat ulang setiap hari | diminta dari Overpass |
| 40 negara Eropa lainnya | ubin yang biasanya dibuat ulang setiap minggu | diminta dari Overpass selama data dasar berumur paling lama 10 hari |
| wilayah dunia lainnya | kondisi server Overpass | pada setiap permintaan |

Setelah memuat ubin siap pakai, OpenFireMap meminta perubahan di area tampilan sejak tanggal data dasar di latar belakang, lalu menambahkannya ke peta.

### Mengapa entri baru tidak langsung terlihat {#verzoegerung}

Perubahan di OpenStreetMap tidak langsung muncul di OpenFireMap:

- **Pemrosesan:** server Overpass harus menerima perubahan tersebut. Jika datanya terlalu lama, OpenFireMap membuang jawaban itu dan menampilkan data dasar.
- **Cache:** hasil permintaan disimpan beberapa menit per area; area yang dimuat juga dapat tersimpan di cache lokal.
- **Gangguan:** jika Overpass sibuk atau tidak dapat diakses, data dasar tetap terlihat sampai permintaan berikutnya berhasil. OpenFireMap tidak dapat mengendalikan hal ini.

Karena itu, waktu kemunculan tidak dapat dijanjikan. Jika entri belum terlihat, muat ulang peta setelah beberapa saat.

:::note Objek yang dihapus
Pembaruan hanya mendeteksi objek baru dan yang berubah. Hidran yang dihapus dari OpenStreetMap baru hilang setelah ubin siap pakai diperbarui.
:::

## Jendela “Data status & origin” {#popover}

:::figure data frame=plain
Status data dan sumber: contoh dengan data dasar dari kemarin; saat itu pembaruan langsung tidak dapat diakses.
:::

Di komputer, buka lewat “Data status details” di kotak status; di ponsel, ketuk kotak status.

- **Sumber:** ubin siap pakai (DACHLiLu atau Eropa), permintaan langsung, atau cache lokal.
- **Status data dasar:** waktu ekstrak negara dibuat. Jika tampilan mencakup beberapa negara, tanggal yang paling lama berlaku.
- **Pembaruan langsung:** apakah perubahan baru telah dimuat. “Not available” berarti layanan langsung tidak dapat diakses dan yang terlihat adalah data dasar. Tombol panah mencoba lagi.

Kotak status menampilkan ringkasan, misalnya “As of: 1d ago +Sync”.

## Halaman status {#statusseite}

[Halaman status](/status/) menunjukkan umur data OpenStreetMap per negara, waktu pembaruan peta terakhir, serta jumlah hidran, pos pemadam, dan defibrilator per penduduk. Halaman ini tersedia dalam bahasa Jerman dan Inggris.

## Cache lokal {#cache}

OpenFireMap menyimpan data yang telah dimuat di browser agar area yang pernah dikunjungi tampil lebih cepat. Atur durasinya melalui **Local Cache** di “Info & Legal” (di menu ponsel): nonaktif, 1 jam, 1 hari, 3 hari, 7 hari (default), atau 30 hari.

Data tetap berada di perangkat Anda. Cache tidak menggantikan pembaruan: saat area dari cache dibuka, data tetap diperiksa terhadap data terbaru.

## Tanpa internet {#offline}

OpenFireMap bukan peta offline. Area dari cache bertahan sementara, tetapi area baru dan pencarian memerlukan koneksi. Untuk operasi tanpa jaringan, [peta kota](../town-plan/) atau [ekspor](../export/) yang dicetak lebih sesuai.

## Jika pemuatan lama {#laden}

Di luar negara dengan ubin siap pakai, semua data berasal dari Overpass. Jika satu server sibuk, OpenFireMap otomatis mencoba server berikutnya; pesan di bawah peta menunjukkan prosesnya. Jika belum berhasil, perbesar sedikit agar permintaan lebih kecil dan coba lagi nanti. Jika semua server sibuk, kendalanya ada pada Overpass. Muat ulang setelah beberapa waktu.

:::warn Bukan sumber operasional
Kualitas data bergantung pada entri di OpenStreetMap. Data mungkin tidak lengkap, usang, atau keliru dan tidak menggantikan informasi dari pusat panggilan darurat atau perusahaan air. Dalam keadaan darurat, selalu hubungi nomor darurat setempat (112 di Eropa).
:::

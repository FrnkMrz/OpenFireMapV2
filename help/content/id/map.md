---
title: Peta di komputer
description: Pencarian, lokasi, lapisan peta, detail hidran, berbagi, kotak status, dan penggunaan OpenFireMap dengan keyboard di komputer.
eyebrow: Peta
lead: Semua alat ada di kiri atas, tanggal data di kanan bawah. Berikut fungsi setiap tombol dan informasi yang terlihat di peta.
order: 1
---

## Ringkasan {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap di komputer: kota tua Nürnberg pada tingkat zoom 17.
:::

1. **Pencarian:** temukan tempat atau alamat.
2. **Lokasi saya:** lompat ke posisi Anda.
3. **Lapisan peta:** ganti peta latar.
4. **Ekspor:** peta hidran sebagai PNG atau PDF, titik sebagai GPX atau CSV.
5. **Bagikan:** salin tautan ke tampilan ini.
6. **Hidran:** arahkan kursor untuk melihat detail; klik untuk lingkaran radius 100 meter.
7. **Kotak status:** tingkat zoom dan tanggal data.
8. **Info & Hukum:** bantuan, simbol peta, informasi hukum, privasi, dan pengaturan.

## Cari tempat {#suche}

Ketik nama tempat, jalan, atau alamat pada kolom pencarian di kiri atas, lalu tekan <kbd>Enter</kbd> atau ikon kaca pembesar. Peta berpindah ke hasil pertama dan memperbesar ke tingkat 16 agar hidran langsung terlihat.

Pencarian menggunakan Nominatim, layanan pencarian OpenStreetMap. Layanan ini mencari tempat dan alamat, bukan hidran tertentu.

## Lokasi saya {#standort}

Tombol lokasi menunjukkan posisi Anda dan memperbesar peta ke tingkat 17. Saat pertama kali digunakan, browser akan meminta izin untuk mengakses lokasi. Posisi hanya digunakan di browser dan tidak disimpan.

:::tip Lokasi tidak muncul?
Pastikan browser mengizinkan akses lokasi untuk openfiremap.org. Komputer tanpa GPS sering hanya menunjukkan posisi dengan ketelitian beberapa ratus meter.
:::

## Hidran dan objek lainnya {#objekte}

Objek yang terlihat bergantung pada tingkat zoom:

| Tingkat zoom | Yang terlihat |
|---|---|
| di bawah 12 | belum ada objek |
| mulai 12 | pos pemadam kebakaran |
| mulai 14 | pos sebagai simbol dan batas wilayah |
| mulai 15 | hidran, titik air, dan defibrilator sebagai titik berwarna |
| mulai 17 | semua objek sebagai simbol berhuruf |
| mulai 18 | detail saat diarahkan |

:::figure marker frame=plain
Klik hidran untuk menggambar lingkaran radius 100 meter.
:::

**Melihat detail:** mulai zoom 18, arahkan kursor ke simbol. Dengan keyboard, mulai zoom 17 pilih simbol memakai <kbd>Tab</kbd> lalu tekan <kbd>Enter</kbd>.

**Radius dan jarak:** mulai zoom 16, klik hidran untuk menampilkan lingkaran putus-putus berjari-jari 100 meter. Ini membantu memperkirakan hidran dalam jangkauan selang. Mulai zoom 17, lingkaran diberi label “100 m”. Jika Anda lebih dulu memakai **Lokasi saya**, mulai zoom 17 OpenFireMap juga menggambar garis biru dari posisi Anda ke hidran beserta jaraknya.

Detail menampilkan informasi yang tercatat di OpenStreetMap, misalnya jenis, diameter, nomor, tekanan, posisi, atau operator. Jika informasi tidak ada, berarti belum ada yang menambahkannya. [Berkontribusi](../contribute/) menjelaskan cara menambahkan data.

Halaman [Lapisan & simbol](../layers/) menjelaskan simbol dan warna.

## Lapisan peta {#ebenen}

Tombol ikon peta membuka pilihan peta latar: standar, cetak, malam, satelit, topografi, dua gaya OSM, serta BayernAtlas dan citra udara untuk Bavaria. Objek pemadam selalu berada di atas peta latar. [Lapisan & simbol](../layers/) menjelaskan latar yang sesuai untuk setiap kebutuhan.

## Berbagi dan tautan {#teilen}

Tombol bagikan menyalin tautan tampilan ini ke papan klip. Siapa pun yang membukanya akan melihat tempat, tingkat zoom, dan latar yang sama.

Alamat browser berubah saat peta digeser. Formatnya `#zoom/latitude/longitude/background`, misalnya `openfiremap.org/#17/49.45280/11.07700/voyager`. Anda juga dapat menyimpannya sebagai penanda.

## Kotak status dan tanggal data {#status}

Di kanan bawah terlihat tingkat zoom dan tanggal data, misalnya “As of: 1d ago”. “+Sync” berarti perubahan terbaru dari OpenStreetMap sudah dimuat. Klik “Data status details” untuk melihat sumber, tanggal data dasar, dan status pembaruan langsung. Baca juga [Data & kemutakhiran](../data/).

## Info & Hukum dan pengaturan {#info}

“Info & Legal” di kiri bawah membuka dialog berisi tautan ke bantuan ini, simbol peta dan overlay, informasi hukum, privasi, serta lisensi. Di sana Anda juga mengatur **cache lokal**: nonaktif, 1 jam, 1 hari, 3 hari, 7 hari (default), atau 30 hari. Area yang sudah dimuat akan tampil lebih cepat.

## Menggunakan keyboard {#tastatur}

OpenFireMap dapat digunakan tanpa mouse:

- Tekan <kbd>Tab</kbd> pertama kali untuk menuju “Skip to map”.
- Pada peta, tombol panah menggeser tampilan; <kbd>+</kbd> dan <kbd>−</kbd> mengatur zoom.
- Mulai zoom 17, simbol dapat dipilih dengan <kbd>Tab</kbd>. <kbd>Enter</kbd> atau <kbd>Space</kbd> membuka detail, sedangkan <kbd>Escape</kbd> menutupnya.
- Di menu dan dialog, fokus tetap di dalam dialog; <kbd>Escape</kbd> menutupnya.
- Saat ekspor, “Use visible area” memakai tampilan saat ini tanpa perlu menarik kotak.

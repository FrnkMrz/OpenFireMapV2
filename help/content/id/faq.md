---
title: Pertanyaan yang sering diajukan
description: Jawaban tentang peta OpenFireMap, data dan kemutakhiran, ekspor dan peta kota, kontribusi, proyek, dan hukum.
eyebrow: FAQ
lead: Jawaban atas pertanyaan yang paling sering diajukan. Pertanyaan Anda belum tercantum? Hubungi info@openfiremap.org.
order: 10
---

## Peta dan kontrol {#karte}

### Mengapa saya tidak melihat hidran? {#keine-hydranten}

Hidran muncul mulai zoom 15. Perbesar peta. Jika tetap tidak terlihat, belum ada hidran yang ditambahkan di area tersebut ke OpenStreetMap. Anda dapat [menambahkannya sendiri](../contribute/).

### Bagaimana membuka detail hidran? {#details}

Di komputer, mulai zoom 18 arahkan kursor ke simbol. Di ponsel, ketuk simbol mulai zoom 17. Dengan keyboard, pilih simbol memakai <kbd>Tab</kbd> mulai zoom 17, lalu tekan <kbd>Enter</kbd>.

### Apa arti lingkaran di sekitar hidran? {#kreis}

Lingkaran memiliki radius 100 meter dan muncul mulai zoom 16 saat hidran diklik atau diketuk. Ini menunjukkan hidran yang berada dalam jangkauan selang. Jika sebelumnya Anda menggunakan “Lokasi saya”, garis biru juga menunjukkan jarak dari posisi Anda.

### Apa arti huruf pada simbol? {#buchstaben}

Huruf menunjukkan jenis: **U** hidran bawah tanah, **O** hidran tegak, **Ø** hidran kering. Halaman [simbol peta](/symbols/) menjelaskan semuanya.

### Bagaimana membagikan tampilan peta? {#teilen}

Gunakan tombol bagikan (di ponsel, “Share Map View” di menu). Tombol itu menyalin tautan yang mencakup tampilan, tingkat zoom, dan latar. Anda juga dapat menyimpan alamat browser sebagai penanda.

### Dapatkah OpenFireMap dipasang seperti aplikasi? {#app}

Ya. Di iPhone melalui **Share → Add to Home Screen** pada Safari; di Android melalui **⋮ → Install app** di Chrome. Tidak perlu toko aplikasi. Baca [Peta di ponsel](../phone/#app).

### Apakah peta berfungsi tanpa internet? {#offline}

Sebagian. Area yang pernah dimuat tersimpan sementara sesuai pengaturan cache. Area baru dan pencarian memerlukan koneksi. Saat bepergian, [peta kota](../town-plan/) cetak lebih dapat diandalkan.

## Data dan kemutakhiran {#daten}

### Dari mana data berasal? {#herkunft}

Dari [OpenStreetMap](https://www.openstreetmap.org/). Relawan, sering kali petugas pemadam setempat, menambahkan hidran, titik air, pos, dan defibrilator. OpenFireMap menampilkan data, bukan mengubahnya.

### Mengapa peta lebih cepat dimuat di Jerman? {#schneller}

Untuk Jerman, Austria, Swiss, Liechtenstein, Luksemburg, dan 40 negara Eropa lainnya, data disiapkan sebagai ubin. Di tempat lain, data diambil langsung lewat Overpass API dan kecepatannya bergantung pada beban server publik. Selengkapnya di [Data & kemutakhiran](../data/#ladeweg).

### Kapan hidran baru saya akan muncul? {#neu}

Waktunya tidak dapat dipastikan. Hidran muncul setelah server Overpass memproses perubahan; cache dapat menunda sedikit. Jika Overpass sibuk atau tidak dapat diakses, hidran muncul belakangan. Objek yang dihapus hilang setelah pembaruan data berikutnya. [Data & kemutakhiran](../data/#verzoegerung) menjelaskan alasannya.

### Seberapa mutakhir datanya? {#aktuell}

Kotak status menampilkan tanggal data; jendela “Data status & origin” memberikan detailnya. [Halaman status](/status/) menunjukkan umur data tiap negara.

### Peta tidak dimuat atau server sibuk. Apa yang bisa saya lakukan? {#laedt-nicht}

Perbesar sedikit agar permintaan lebih kecil, lalu coba lagi setelah beberapa saat. Jika semua server sibuk, kendalanya ada pada server Overpass publik. Coba muat ulang nanti.

### Apakah data dapat dijadikan acuan operasi? {#verbindlich}

Tidak. OpenFireMap bukan sumber operasional. Data dapat tidak lengkap, usang, atau salah dan tidak menggantikan informasi pusat panggilan darurat, pemerintah daerah, atau perusahaan air. Dalam keadaan darurat, hubungi nomor darurat terlebih dahulu (112 di Eropa).

## Ekspor dan peta kota {#export}

### Mengapa tidak ada ekspor di ponsel? {#export-handy}

Peta siap cetak memerlukan banyak memori dan layar besar untuk memilih area. Karena itu, ekspor dan peta kota hanya tersedia di komputer.

### Seberapa besar area ekspor? {#export-groesse}

Maksimal 10 × 10 kilometer. Jika Anda menarik persegi lebih besar, OpenFireMap membatasinya. Untuk kota besar dengan kisi dan indeks jalan, gunakan [peta kota](../town-plan/).

### Apa perbedaan ekspor dan peta kota? {#unterschied}

[Ekspor](../export/) dengan cepat membuat gambar, PDF, atau daftar titik (GPX, CSV). [Peta kota](../town-plan/) adalah lembar berdesain ukuran A4 sampai A1 dengan skala tetap, kisi, legenda, dan indeks jalan; saat ini untuk lokasi di Jerman.

### Skala cetak tidak benar. {#massstab}

Cetak PDF pada **Actual size** atau **100%**, bukan “Fit to page”, dengan ukuran kertas yang dipilih di asisten. Lalu periksa skala memakai penggaris.

### Bolehkah saya mencetak dan membagikan peta untuk pemadam? {#drucken}

Boleh. Data dilisensikan dengan Open Database License. Setiap peta harus mempertahankan atribusi “© OpenStreetMap contributors”. Ekspor dan peta kota mencetak atribusi; jangan memotongnya.

## Berkontribusi {#mitmachen}

### Hidran hilang atau salah. Siapa yang memperbaikinya? {#korrigieren}

Anda dapat memperbaikinya di OpenStreetMap dengan akun gratis. Panduan Hydrantenjäger, StreetComplete, iD, dan JOSM tersedia di [Menambahkan hidran](../contribute/).

### Kami pemadam kebakaran dan ingin mendata hidran. Bagaimana caranya? {#feuerwehr}

Sebaiknya lakukan sebagai latihan atau tur kota dalam beberapa tim. Ada panduan untuk pemadam kebakaran di Jerman, hanya dalam bahasa Jerman: [Für Feuerwehren](/help/fire-brigades/). Untuk wilayah lain, [Menambahkan hidran](../contribute/) menjelaskan alat yang tersedia.

### Bolehkah menyalin peta hidran dari pemerintah atau perusahaan air? {#plaene}

Hanya dengan izin jelas. Peta tersebut dilindungi hak cipta. Sebaiknya tambahkan hanya objek yang Anda lihat sendiri di lokasi.

### Dapatkah lapisan pemadam digunakan di peta saya? {#overlay}

Bisa, dengan overlay. Informasi tersedia di [halaman overlay](/overlay/).

## Proyek dan hukum {#projekt}

### Apakah ini peta resmi pemadam kebakaran? {#offiziell}

Bukan. OpenFireMap adalah proyek pribadi nonkomersial berbasis OpenStreetMap dan tidak bekerja resmi dengan instansi atau layanan pemadam.

### Berapa biaya OpenFireMap? {#kosten}

Gratis. Tidak perlu akun, tidak ada iklan atau langganan. Kode sumber berlisensi MIT di [GitHub](https://github.com/FrnkMrz/OpenFireMapV2).

### Data apa yang disimpan OpenFireMap tentang saya? {#datenschutz}

Peta berjalan di browser. Hanya pengaturan seperti bahasa dan cache, tampilan peta terakhir, pengaturan peta kota, dan data peta yang pernah dimuat yang disimpan di sana. Browser menghubungi layanan eksternal untuk pencarian, ubin peta, dan data. Detailnya ada di [kebijakan privasi](/datenschutz/#en).

### Bagaimana menghubungi Anda? {#kontakt}

Kirim surel ke [info@openfiremap.org](mailto:info@openfiremap.org), atau laporkan bug dan ide sebagai [issue di GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).

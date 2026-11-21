---
title: Menambahkan hidran
description: Cara menambahkan hidran, titik air, dan defibrilator ke OpenStreetMap dengan Hydrantenjäger, StreetComplete, Every Door, editor iD, atau JOSM.
eyebrow: Berkontribusi
lead: Setiap hidran di peta ditambahkan oleh seseorang. Jika ada yang belum tercatat, Anda dapat menambahkannya sendiri dengan akun OpenStreetMap gratis.
order: 7
---

## Sebelum mulai {#vorher}

OpenFireMap menampilkan data dari [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Anda mengedit data di OpenStreetMap, bukan di OpenFireMap. Anda perlu akun:

:::steps
1. Buka [openstreetmap.org](https://www.openstreetmap.org/user/new) dan pilih **Sign Up**.
2. Pilih nama pengguna, alamat surel, dan kata sandi, lalu konfirmasi surel.
3. Gunakan akun tersebut untuk masuk ke alat-alat di bawah.
:::

:::warn Tiga aturan
- **Tambahkan hanya yang Anda lihat langsung.** Periksa posisi dan jenis di hidran.
- **Jangan menyalin data dari peta milik orang lain.** Peta hidran perusahaan air atau pemerintah dilindungi hak cipta. Gunakan hanya dengan izin jelas.
- **Saat menyimpan, jelaskan singkat perubahan Anda**, misalnya “Menambahkan hidran di Jalan Utama”.
:::

Pemadam kebakaran di Jerman dapat menggunakan panduan untuk memeriksa hidran wilayah tugas saat latihan atau berjalan keliling kota; panduan ini hanya dalam bahasa Jerman: [Für Feuerwehren](/help/fire-brigades/).

## Memilih alat {#werkzeug}

| Situasi | Alat | Alasan |
|---|---|---|
| di lokasi dengan ponsel dan ingin menambah hidran dengan cepat | **Hydrantenjäger** | dibuat untuk hidran, menempatkan titik dengan kompas, sedikit kolom |
| bepergian dan ingin menambah data sepanjang jalan | **StreetComplete** atau **Every Door** | menjawab pertanyaan tentang objek sekitar, termasuk hidran |
| di komputer dan mengedit lokasi tertentu | **editor iD** | berjalan di browser pada openstreetmap.org tanpa pemasangan |
| berpengalaman dan mengedit banyak hidran | **JOSM** (komputer) atau **Vespucci** (Android) | kendali penuh atas semua tag |

## Dengan Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) adalah aplikasi web ponsel yang dibuat untuk tugas ini:

:::steps
1. Masuk dengan akun OpenStreetMap.
2. Berdiri sekitar tiga meter di depan hidran dan arahkan ponsel ke sana. Aplikasi menempatkan titik memakai GPS dan kompas.
3. Pilih jenis dan posisi; isi diameter dan nomor hanya jika Anda yakin.
4. Unggah. Selesai.
:::

Panduan rinci tentang jenis hidran tersedia di [halaman bantuan Hydrantenjäger](https://hydrantenjaeger.de/help/).

## Dengan StreetComplete atau Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) menampilkan pertanyaan tentang objek di sekitar, misalnya “Apa jenis hidran ini?”. Jawab dengan mengetuk. Aplikasi ini terutama untuk melengkapi data objek yang sudah ada.
- **[Every Door](https://every-door.app/)** (Android, iOS) dibuat untuk menambahkan titik. Ketuk tombol plus, tempatkan titik baru, pilih “Fire Hydrant”, lalu isi kolomnya.

## Dengan editor iD di browser {#id}

Editor iD adalah editor standar di openstreetmap.org.

:::steps
1. Buka [openstreetmap.org](https://www.openstreetmap.org/), masuk, lalu perbesar ke lokasi hidran.
2. Klik **Edit** di bagian atas. Saat pertama kali, ikuti pengenalan singkatnya.
3. Klik **Point** di bagian atas dan letakkan titik tepat di lokasi hidran. Citra udara membantu orientasi.
4. Ketik “hydrant” di kolom pencarian kiri dan pilih preset **Fire Hydrant**.
5. Isi kolom **Type** (bawah tanah, tegak, dinding, pipa), **Position** (misalnya trotoar atau jalur), **Diameter**, dan **Reference** jika diketahui.
6. Klik **Save** di kanan atas, tulis komentar singkat, lalu klik **Upload**.
:::

:::tip Memperbaiki hidran yang sudah ada
Klik hidran, ubah kolom di kiri, lalu simpan. Jika posisinya salah, tarik ke tempat yang benar. Hapus hanya jika Anda yakin hidran itu sudah tidak ada saat diperiksa langsung.
:::

## Dengan JOSM atau Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) adalah editor komputer berbasis Java; [Vespucci](https://vespucci.io/) adalah padanannya untuk Android. Keduanya menampilkan semua tag dan cocok untuk pekerjaan besar, misalnya memperbarui semua hidran setelah pemeriksaan lapangan. Tag tercantum di bawah.

## Tag penting {#tags}

OpenStreetMap menjelaskan objek dengan tag berbentuk `key=value`. Preset aplikasi mengisinya otomatis. Jika memasukkan sendiri, gunakan:

| Objek | Tag | Arti |
|---|---|---|
| Hidran | `emergency=fire_hydrant` | wajib untuk setiap hidran |
| | `fire_hydrant:type=underground` | hidran bawah tanah (juga `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | ukuran nominal (DN), sesuai tanda |
| | `fire_hydrant:position=sidewalk` | posisi (juga `lane`, `parking_lot`, `green`) |
| | `ref=123` | nomor hidran, jika ada |
| | `fire_hydrant:pressure=4` | tekanan dalam bar, jika diketahui |
| Titik penyedotan | `emergency=suction_point` | tempat mengambil air dari badan air |
| Tangki air | `emergency=water_tank` | tangki atau reservoir air pemadam |
| Kolam pemadam | `emergency=fire_water_pond` | kolam sebagai sumber air pemadam |
| Defibrilator | `emergency=defibrillator` | ditambah `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Pos pemadam | `amenity=fire_station` | bangunan atau lokasi layanan pemadam |

Halaman [simbol peta](/symbols/) menunjukkan tampilan tag di OpenFireMap. [Wiki OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant) menjelaskan lebih rinci.

## Kapan perubahan terlihat? {#anzeige}

Setelah diunggah, hidran langsung tersimpan di OpenStreetMap. Hidran muncul di OpenFireMap setelah layanan sumber data memproses perubahan. Biasanya cepat, tetapi tidak ada waktu pasti. [Data & kemutakhiran](../data/#verzoegerung) menjelaskan kemungkinan penundaan.

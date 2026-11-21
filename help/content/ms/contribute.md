---
title: Tambah pili bomba
description: Cara menambah pili bomba, titik air dan defibrilator ke OpenStreetMap menggunakan Hydrantenjäger, StreetComplete, Every Door, penyunting iD atau JOSM.
eyebrow: Sumbang
lead: Setiap pili bomba pada peta ditambah oleh seseorang. Jika ada yang tiada, anda boleh menambahkannya sendiri dengan akaun OpenStreetMap percuma.
order: 7
---

## Sebelum bermula {#vorher}

OpenFireMap menunjukkan data daripada [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Jadi anda mengedit OpenStreetMap, bukan OpenFireMap. Anda perlukan akaun:

:::steps
1. Pada [openstreetmap.org](https://www.openstreetmap.org/user/new), pilih **Sign Up**.
2. Pilih nama pengguna, e-mel dan kata laluan, kemudian sahkan e-mel.
3. Log masuk ke semua alat di bawah menggunakan akaun ini.
:::

:::warn Tiga peraturan
- **Tambah hanya perkara yang anda sendiri lihat di lokasi.** Periksa kedudukan dan jenis di pili.
- **Jangan salin data daripada pelan orang lain.** Pelan pili utiliti air atau perbandaran dilindungi hak cipta. Gunakannya hanya dengan kebenaran nyata.
- **Semasa menyimpan, terangkan secara ringkas perubahan anda**, contohnya “Menambah pili bomba di Main Street”.
:::

Pasukan bomba di Jerman boleh mendapatkan panduan berbahasa Jerman untuk menyemak pili di kawasan respons semasa latihan atau berjalan di bandar: [Für Feuerwehren](/help/fire-brigades/).

## Alat yang sesuai untuk anda {#werkzeug}

| Situasi | Gunakan | Sebab |
|---|---|---|
| di lokasi dengan telefon dan mahu menambah pili dengan cepat | **Hydrantenjäger** | khusus untuk pili, meletakkan titik dengan kompas, medan sedikit |
| bergerak dan mahu menambah objek sepanjang perjalanan | **StreetComplete** atau **Every Door** | menjawab soalan tentang objek berdekatan |
| menggunakan komputer untuk tempat tertentu | **Penyunting iD** | berjalan dalam pelayar di openstreetmap.org, tiada pemasangan |
| pemeta berpengalaman yang mengedit banyak pili | **JOSM** (komputer) atau **Vespucci** (Android) | kawalan penuh terhadap semua tag |

## Dengan Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) ialah aplikasi web telefon untuk tugas ini:

:::steps
1. Log masuk dengan akaun OpenStreetMap.
2. Berdiri kira-kira tiga meter di hadapan pili dan halakan telefon kepadanya. Aplikasi meletakkan titik menggunakan GPS dan kompas.
3. Pilih jenis dan kedudukan; tambah diameter dan nombor hanya jika pasti.
4. Muat naik. Selesai.
:::

Panduan terperinci dengan semua jenis pili terdapat pada [halaman bantuan Hydrantenjäger](https://hydrantenjaeger.de/help/).

## Dengan StreetComplete atau Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) menunjukkan soalan tentang objek berdekatan, contohnya “Apakah jenis pili bomba ini?” Jawab dengan satu ketikan. Aplikasi ini terutama untuk melengkapkan butiran objek sedia ada.
- **[Every Door](https://every-door.app/)** (Android, iOS) dibuat untuk menambah titik. Gunakan butang tambah untuk meletakkan titik, pilih “Fire Hydrant” dan isi medan.

## Dengan penyunting iD dalam pelayar {#id}

Penyunting iD ialah penyunting standard di openstreetmap.org.

:::steps
1. Buka [openstreetmap.org](https://www.openstreetmap.org/), log masuk dan zum ke pili.
2. Klik **Edit** di atas. Kali pertama, panduan ringkas memperkenalkan penyunting.
3. Klik **Point** di atas dan letakkan titik tepat di lokasi pili. Imej udara membantu orientasi.
4. Taip “hydrant” dalam medan carian kiri dan pilih pratetap **Fire Hydrant**.
5. Isi medan: **Type** (bawah tanah, tiang, dinding, paip), **Position** (contohnya kaki lima atau lorong), **Diameter** dan **Reference** jika diketahui.
6. Klik **Save** di kanan atas, tulis komen ringkas dan klik **Upload**.
:::

:::tip Membetulkan pili sedia ada
Klik pili, ubah medan di kiri dan simpan dengan cara yang sama. Jika lokasinya salah, seret ke tempat betul. Padamkannya hanya jika anda pasti di lokasi bahawa ia sudah tiada.
:::

## Dengan JOSM atau Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) ialah penyunting Java untuk komputer; [Vespucci](https://vespucci.io/) ialah padanannya untuk Android. Kedua-duanya menunjukkan semua tag dan sesuai untuk kerja besar, seperti mengemas kini semua pili di kawasan selepas lawatan lapangan. Tag disenaraikan di bawah.

## Tag paling penting {#tags}

OpenStreetMap menerangkan objek dengan tag berbentuk `key=value`. Pratetap aplikasi menetapkannya untuk anda. Jika memasukkannya sendiri, gunakan:

| Objek | Tag | Maksud |
|---|---|---|
| Pili bomba | `emergency=fire_hydrant` | diperlukan untuk setiap pili |
| | `fire_hydrant:type=underground` | pili bawah tanah (juga `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | saiz nominal (DN), seperti pada tanda |
| | `fire_hydrant:position=sidewalk` | kedudukan (juga `lane`, `parking_lot`, `green`) |
| | `ref=123` | nombor pili jika ada |
| | `fire_hydrant:pressure=4` | tekanan dalam bar, jika diketahui |
| Titik sedutan | `emergency=suction_point` | tempat mengambil air daripada badan air |
| Tangki air | `emergency=water_tank` | tangki atau simpanan air bomba |
| Kolam air bomba | `emergency=fire_water_pond` | kolam sumber air bomba |
| Defibrilator | `emergency=defibrillator` | tambah `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Balai bomba | `amenity=fire_station` | bangunan atau tapak bomba |

Halaman [Simbol peta](/symbols/) menunjukkan rupa tag dalam OpenFireMap. [Wiki OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant) menerangkannya dengan lebih lanjut.

## Bilakah perubahan muncul? {#anzeige}

Selepas dimuat naik, pili disimpan serta-merta dalam OpenStreetMap. Ia muncul dalam OpenFireMap apabila perkhidmatan yang digunakan peta telah memproses perubahan. Biasanya pantas, tetapi tiada tempoh tetap. [Data & kesegaran](../data/#verzoegerung) menerangkan kemungkinan kelewatan.

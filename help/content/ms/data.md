---
title: Data & kesegaran
description: Sumber dan kesegaran data OpenFireMap, kandungan tetingkap status data dan fungsi cache setempat.
eyebrow: Data
lead: Semua objek bomba datang daripada OpenStreetMap. OpenFireMap menyediakannya untuk pemuatan pantas dan mengambil entri baharu secara langsung.
order: 4
---

## Sumber data {#quelle}

Pili bomba, titik air, balai bomba dan defibrilator ditambah oleh komuniti [OpenStreetMap](https://www.openstreetmap.org/), selalunya oleh anggota bomba tempatan. OpenFireMap memaparkan data ini tetapi tidak mengubahnya.

## Cara OpenFireMap memuatkan pili bomba {#ladeweg}

Bergantung pada kawasan, peta menggunakan salah satu daripada dua cara:

- **Jubin sedia:** Untuk Jerman, Austria, Switzerland, Liechtenstein, Luxembourg dan 40 negara Eropah lain, OpenFireMap membina jubin daripada ekstrak negara OpenStreetMap (Geofabrik) terlebih dahulu. Jubin dihoskan pada Cloudflare dan dihantar melalui cachenya. Pelayar hanya mengambil beberapa jubin yang diperlukan oleh paparan.
- **Overpass API:** Di tempat lain, OpenFireMap meminta pelayan Overpass awam secara terus untuk kawasan kelihatan dan margin di sekelilingnya.

:::note Mengapa lebih pantas di Jerman dan Eropah?
Bukan kerana Overpass menjawab lebih pantas. Di negara ini, peta membaca jubin sedia dan tidak perlu meminta data pili bomba daripada Overpass. Overpass hanya diminta untuk perubahan sejak tarikh data asas, iaitu pertanyaan jauh lebih kecil.
:::

### Apakah Overpass API? {#overpass}

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) ialah perkhidmatan awam yang mencari data OpenStreetMap mengikut ciri dan kawasan, contohnya “semua pili bomba dalam segi empat ini”. Sukarelawan dan organisasi mengendalikan pelayan yang dikongsi banyak aplikasi.

Kelajuan jawapan bergantung pada:

- **beban** pelayan yang digunakan OpenFireMap,
- **saiz** kawasan dan tempoh pertanyaan,
- **masa menunggu dan penolakan** apabila pelayan sesak atau mengehadkan permintaan.

OpenFireMap mengetahui empat pelayan Overpass dan mencubanya dalam susunan rawak. Jika satu tidak menjawab atau melaporkan kesesakan, peta berehat sebentar lalu meminta pelayan seterusnya. Kawasan yang dimuatkan disimpan dalam cache setempat pelayar.

## Sejauh mana data terkini? {#aktualitaet}

| Kawasan | Data asas | Entri baharu dan berubah |
|---|---|---|
| Jerman, Austria, Switzerland, Liechtenstein, Luxembourg | jubin sedia, biasanya dibina semula setiap hari | diminta daripada Overpass |
| 40 negara Eropah lain | jubin sedia, biasanya dibina semula setiap minggu | diminta daripada Overpass selagi data asas tidak lebih 10 hari |
| seluruh dunia yang lain | keadaan pelayan Overpass | pada setiap pertanyaan |

Selepas memuatkan jubin sedia, OpenFireMap meminta di latar belakang semua perubahan pada paparan sejak tarikh data asas lalu menambahkannya pada peta.

### Mengapa entri baharu tidak muncul serta-merta? {#verzoegerung}

Perubahan OpenStreetMap tidak muncul dalam OpenFireMap pada masa yang sama:

- **Pemprosesan:** pelayan Overpass perlu menerima perubahan dahulu. Jika datanya terlalu lama, OpenFireMap membuang jawapan itu dan memaparkan data asas.
- **Cache:** hasil pertanyaan bagi setiap kawasan disimpan selama beberapa minit; kawasan yang dimuatkan juga berada dalam cache setempat.
- **Gangguan:** jika Overpass sesak atau tidak dapat dicapai, data asas kekal sehingga permintaan kemudian berjaya. OpenFireMap tidak dapat mengawalnya.

Oleh itu, masa tetap tidak dapat dijanjikan. Jika entri belum kelihatan, muat semula peta kemudian.

:::note Objek yang dipadam
Kemas kini hanya mengesan objek baharu dan berubah. Pili yang dipadam di OpenStreetMap hanya hilang selepas kemas kini data asas jubin sedia yang seterusnya.
:::

## Tetingkap “Status & sumber data” {#popover}

:::figure data frame=plain
Status & sumber data: di sini data asas dari semalam digunakan; kemas kini langsung tidak dapat dicapai pada waktu itu.
:::

Pada komputer, pilih “Butiran status data” dalam kotak status; pada telefon pintar, ketik kotak status.

- **Sumber:** jubin sedia (DACHLiLu atau Eropah), pertanyaan langsung atau cache setempat.
- **Status data asas:** masa ekstrak negara dibuat. Jika beberapa negara kelihatan, tarikh yang paling lama terpakai.
- **Kemas kini langsung:** sama ada perubahan baharu telah dimuatkan. “Tidak tersedia” bermakna perkhidmatan langsung tidak dapat dicapai dan data asas dipaparkan. Butang anak panah mencuba semula.

Kotak status memaparkan ringkasan seperti “Setakat: 1 hari lalu +Sync”.

## Halaman status {#statusseite}

[Halaman status](/status/) menunjukkan umur data OpenStreetMap bagi setiap negara, masa kemas kini terakhir peta serta bilangan pili bomba, balai bomba dan defibrilator bagi setiap penduduk. Halaman ini tersedia dalam bahasa Jerman dan Inggeris.

## Cache setempat {#cache}

OpenFireMap menyimpan data yang dimuatkan dalam pelayar supaya kawasan yang pernah dilawati dipaparkan lebih pantas. Pilih tempoh di **Cache setempat** dalam “Maklumat & Undang-undang”: mati, 1 jam, 1 hari, 3 hari, 7 hari (lalai) atau 30 hari.

Data kekal pada peranti anda. Cache tidak menggantikan kemas kini: kawasan dalam cache tetap disemak terhadap data semasa apabila dibuka.

## Tanpa internet {#offline}

OpenFireMap bukan peta luar talian. Kawasan cache kekal kelihatan untuk seketika tetapi kawasan baharu dan carian memerlukan sambungan. Untuk operasi tanpa rangkaian, [pelan bandar](../town-plan/) atau [eksport](../export/) bercetak lebih sesuai.

## Apabila pemuatan mengambil masa {#laden}

Di luar negara yang mempunyai jubin sedia, semua data datang melalui Overpass. Jika pelayan sibuk, OpenFireMap mencuba pelayan seterusnya secara automatik; mesej di bawah menunjukkan prosesnya. Jika tidak membantu, zum masuk untuk mengecilkan pertanyaan dan cuba lagi sebentar lagi. Jika semua pelayan sesak, masalahnya pada Overpass sendiri; muat semula kemudian.

:::warn Bukan sumber operasi
Data hanya setepat entri OpenStreetMap. Data mungkin tidak lengkap, lapuk atau salah dan tidak menggantikan maklumat pusat kawalan atau utiliti air. Dalam kecemasan, sentiasa hubungi nombor kecemasan anda (112 di Eropah).
:::

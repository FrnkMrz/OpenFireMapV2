---
title: Aksesibilitas
description: Menggunakan OpenFireMap dengan keyboard, pembaca layar, pembesaran, dan pengurangan gerakan; fitur yang tersedia dan yang belum diuji.
eyebrow: Aksesibilitas
lead: OpenFireMap dirancang agar dapat digunakan semua orang, termasuk tanpa mouse, dengan pembaca layar atau pembesaran tinggi. Berikut cara menggunakannya dan hal yang masih perlu diperbaiki.
order: 9
---

## Tujuan kami {#ziel}

Peta mengikuti panduan **WCAG 2.2 tingkat AA**. Setiap perubahan diperiksa otomatis untuk penggunaan keyboard, label pembaca layar, kontras warna, tampilan pada pembesaran 400%, dan ukuran minimum kontrol. Halaman bantuan ini dan halaman simbol peta juga diperiksa.

:::note Status dengan jujur
Pemeriksaan otomatis tidak menemukan semuanya. Pengujian langsung dengan pembaca layar di perangkat masih perlu dilakukan. Jika Anda menemukan kendala, silakan hubungi kami. Setiap masukan membantu.
:::

## Dengan keyboard {#tastatur}

Semua yang dapat dilakukan dengan mouse juga dapat dilakukan dengan keyboard:

| Tombol | Fungsi |
|---|---|
| <kbd>Tab</kbd> | menuju kontrol berikutnya. Tujuan pertama adalah “Skip to map”. |
| Tombol panah | menggeser peta saat peta memiliki fokus |
| <kbd>+</kbd> dan <kbd>−</kbd> | memperbesar dan memperkecil |
| <kbd>Tab</kbd> mulai zoom 17 | berpindah dari satu simbol ke simbol lain |
| <kbd>Enter</kbd> atau <kbd>Space</kbd> pada simbol | membuka detail; pada hidran juga menggambar lingkaran 100 meter |
| <kbd>Escape</kbd> | menutup detail, lingkaran, menu, dan dialog; membatalkan pemilihan area ekspor |

Fokus selalu terlihat jelas. Saat menu atau dialog dibuka, fokus berpindah ke dalamnya dan tetap di sana hingga ditutup, lalu kembali ke tombol pembuka.

**Ekspor tanpa mouse:** di menu ekspor, pilih **Use visible area** untuk memakai tampilan peta saat ini. Anda tidak perlu menarik persegi. Panduan [Ekspor](../export/) menjelaskan sisanya.

**Peta kota tanpa mouse:** pada langkah 3 asisten, pilih judul, legenda, dan elemen lain dengan <kbd>Tab</kbd>, lalu pindahkan dengan tombol panah. Tahan <kbd>Shift</kbd> untuk langkah lebih besar. <kbd>Alt</kbd> + tombol panah mengubah ukuran peta. Baca [Peta kota](../town-plan/#schritt-3).

## Dengan pembaca layar {#screenreader}

- **Peta:** ditandai sebagai area bernama dan menjelaskan penggunaan keyboard.
- **Simbol:** mulai zoom 17, tiap simbol memiliki nama, misalnya “Hidran” beserta jenis dan nomor. Tekan <kbd>Enter</kbd> untuk membuka detail yang dibacakan.
- **Pesan:** pemberitahuan seperti “Tautan disalin” atau kesalahan pemuatan dibacakan; kesalahan diberi prioritas. Kotak status sengaja tidak membacakan setiap perubahan saat peta digeser.
- **Bahasa:** semua label pembaca layar tersedia dalam seluruh bahasa peta. Bantuan ini tersedia dalam bahasa Jerman dan Inggris.

:::tip Banyak simbol sekaligus
Di bawah zoom 17, titik tidak dapat dipilih satu per satu karena akan menghasilkan ratusan titik fokus. Perbesar dengan <kbd>+</kbd> hingga simbol muncul.
:::

## Penglihatan dan pembesaran {#sehen}

- **Kontras:** teks panel memiliki rasio kontras minimal 4,5:1; teks besar dan simbol 3:1. Karena panel semi transparan berada di atas peta, kontras diperiksa pada latar terang maupun gelap.
- **Pembesaran:** halaman dapat diperbesar di browser hingga 400%. Tampilan lalu beralih ke mode sempit dengan menu; semua menu tetap dapat dijangkau dan digulir.
- **Tidak hanya warna:** hidran dibedakan dengan warna dan huruf pada simbol (U, O, Ø, dan lainnya).
- **Latar:** jika kontras kurang atau silau, gunakan **Print (Light)** atau **Night (Dark)**. Lihat [Lapisan & simbol](../layers/).

## Gerakan {#bewegung}

Jika **Reduce motion** diaktifkan pada sistem operasi, OpenFireMap tidak menggunakan animasi: pencarian dan lokasi langsung berpindah. Bantuan ini juga menghindari gerakan.

## Di ponsel {#smartphone}

Kontrol berukuran minimal 24 × 24 piksel. Ketuk simbol mulai zoom 17 untuk membuka detail. Dengan VoiceOver atau TalkBack, tombol dapat dijangkau lewat menu kiri atas. Baca [Peta di ponsel](../phone/).

## Belum diuji {#offen}

- pengujian menyeluruh dengan pembaca layar di perangkat (VoiceOver, TalkBack, NVDA);
- kontras simbol pada semua peta latar, terutama citra satelit;
- penggunaan asisten peta kota dengan pembaca layar.

## Menemukan kendala? {#melden}

Ceritakan apa yang tidak berfungsi, termasuk perangkat, browser, dan pembaca layar yang digunakan: **[info@openfiremap.org](mailto:info@openfiremap.org)**. Anda juga dapat membuat [issue di GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).

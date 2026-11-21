---
title: Kebolehcapaian
description: Menggunakan OpenFireMap dengan papan kekunci, pembaca skrin, pembesaran dan gerakan dikurangkan; perkara yang berfungsi dan belum diuji.
eyebrow: Kebolehcapaian
lead: OpenFireMap sepatutnya boleh digunakan semua orang, termasuk tanpa tetikus, dengan pembaca skrin atau pembesaran tinggi. Berikut caranya dan perkara yang masih belum diuji.
order: 9
---

## Matlamat kami {#ziel}

Peta mengikuti panduan **WCAG 2.2 tahap AA**. Setiap perubahan OpenFireMap melalui semakan automatik untuk penggunaan papan kekunci, label pembaca skrin, kontras warna, paparan zum 400% dan saiz minimum kawalan. Bantuan ini dan halaman simbol peta diuji dengan cara yang sama.

:::note Status dengan jujur
Semakan automatik tidak menemui semuanya. Ujian pembaca skrin sebenar pada peranti masih perlu dilakukan. Jika anda nampak masalah, hubungi kami (butiran di bawah). Setiap maklum balas membantu.
:::

## Dengan papan kekunci {#tastatur}

Semua yang boleh dibuat dengan tetikus juga boleh dibuat dengan papan kekunci:

| Kekunci | Kesan |
|---|---|
| <kbd>Tab</kbd> | ke kawalan seterusnya; hentian pertama ialah “Langkau ke peta” |
| Kekunci anak panah | gerakkan peta apabila fokus padanya |
| <kbd>+</kbd> dan <kbd>−</kbd> | zum masuk dan keluar |
| <kbd>Tab</kbd> dari tahap 17 | bergerak antara simbol pada peta |
| <kbd>Enter</kbd> atau <kbd>Space</kbd> pada simbol | buka butiran; untuk pili, lukis juga bulatan 100 meter |
| <kbd>Escape</kbd> | tutup butiran, bulatan, menu dan dialog; batalkan pemilihan kawasan eksport |

Fokus sentiasa kelihatan jelas. Apabila menu atau dialog dibuka, fokus masuk dan kekal di dalamnya sehingga ditutup. Kemudian fokus kembali ke butang pembuka.

**Eksport tanpa tetikus:** pilih **Gunakan kawasan yang kelihatan** dalam menu eksport. Paparan semasa dipilih tanpa menyeret segi empat. Lihat [Eksport](../export/).

**Pelan bandar tanpa tetikus:** pada langkah 3 pembantu, pilih tajuk, petunjuk dan kotak lain dengan <kbd>Tab</kbd> dan gerakkannya dengan anak panah; tambah <kbd>Shift</kbd> untuk langkah lebih besar. <kbd>Alt</kbd> + anak panah mengubah saiz peta. Lihat [Pelan bandar](../town-plan/#schritt-3).

## Dengan pembaca skrin {#screenreader}

- **Peta:** ditandakan sebagai rantau bernama dan menerangkan penggunaan papan kekunci.
- **Simbol:** dari tahap zum 17 setiap simbol mempunyai nama, contohnya “Pili bomba” bersama jenis dan nombor. Pembaca skrin membacanya apabila butiran dibuka dengan <kbd>Enter</kbd>.
- **Mesej:** notis seperti “Pautan disalin” dan ralat pemuatan diumumkan; ralat diberi keutamaan. Kotak status zum dan tarikh data sengaja senyap supaya tidak bercakap setiap kali peta digerakkan.
- **Bahasa:** semua label pembaca skrin tersedia dalam semua bahasa peta. Bantuan ini tersedia dalam bahasa Jerman dan Inggeris.

:::tip Banyak simbol
Di bawah tahap 17, titik tidak boleh dicapai satu demi satu kerana akan ada ratusan hentian Tab. Zum masuk dengan <kbd>+</kbd> sehingga simbol muncul.
:::

## Penglihatan dan pembesaran {#sehen}

- **Kontras:** teks panel mempunyai nisbah sekurang-kurangnya 4.5:1; teks besar dan simbol 3:1. Oleh sebab panel separa telus di atas peta, kontras diukur terhadap latar cerah dan gelap.
- **Pembesaran:** zum halaman pelayar sehingga 400%. Paparan sempit dengan menu akan muncul; semua menu kekal boleh dicapai dan ditatal.
- **Bukan warna sahaja:** pili berbeza bukan hanya melalui warna tetapi juga huruf pada simbol (U, O, Ø…).
- **Latar:** untuk kontras rendah atau silau, cuba latar **Cetak (Light)** atau **Malam (Dark)**. Lihat [Lapisan & simbol](../layers/).

## Gerakan {#bewegung}

Jika **Kurangkan gerakan** dihidupkan dalam sistem operasi, OpenFireMap tidak menggunakan animasi: peta melompat ke hasil carian atau lokasi dan bukannya bergerak terbang. Bantuan ini juga tidak menunjukkan gerakan.

## Pada telefon pintar {#smartphone}

Kawalan berukuran sekurang-kurangnya 24 × 24 piksel. Ketik simbol dari tahap 17 untuk membuka butiran. Dengan VoiceOver atau TalkBack, capai butang melalui menu kiri atas. Lihat [Peta pada telefon pintar](../phone/).

## Belum diuji {#offen}

- ujian pembaca skrin penuh pada peranti (VoiceOver, TalkBack, NVDA)
- kontras simbol terhadap semua latar peta, khususnya satelit
- penggunaan pembantu pelan bandar dengan pembaca skrin

## Menemui halangan? {#melden}

Beritahu kami perkara yang tidak berfungsi serta peranti, pelayar dan pembaca skrin jika ada: **[info@openfiremap.org](mailto:info@openfiremap.org)**. Jika anda mahir teknikal, buka [isu GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).

---
title: Accessibilità
description: Usa OpenFireMap con tastiera, lettore di schermo, ingrandimento e movimento ridotto.
eyebrow: Accessibilità
lead: OpenFireMap deve funzionare senza mouse, con lettore di schermo e con ingrandimenti elevati. Ecco funzioni e limiti noti.
order: 8
---

## Il nostro obiettivo {#ziel}

La mappa segue le linee guida WCAG 2.2 livello AA. I controlli automatici verificano tastiera, etichette, contrasto, zoom al 400% e dimensione dei comandi.

:::note Stato trasparente
I controlli automatici non trovano tutto. Restano da fare prove complete con lettori di schermo sui dispositivi. Segnalaci eventuali problemi.
:::

## Con la tastiera {#tastatur}

| Tasto | Azione |
|---|---|
| <kbd>Tab</kbd> | controllo successivo; il primo è “Vai alla mappa” |
| Frecce | sposta la mappa quando è attiva |
| <kbd>+</kbd>/<kbd>−</kbd> | ingrandisci o riduci |
| <kbd>Tab</kbd> dal livello 17 | passa tra i simboli |
| <kbd>Invio</kbd>/<kbd>Spazio</kbd> | apre i dettagli |
| <kbd>Esc</kbd> | chiude dettagli, menu e finestre |

Il focus è sempre visibile. Nell’esportazione **Use visible area** seleziona la vista senza trascinare. Nel layout del piano gli elementi si spostano con le frecce.

## Con lettore di schermo {#screenreader}

La mappa è una regione nominata; i simboli hanno un’etichetta e gli avvisi vengono annunciati. Il riquadro di stato resta silenzioso durante gli spostamenti. Le etichette sono disponibili in tutte le lingue della mappa. Questa guida è disponibile in italiano, tedesco e inglese.

:::tip Molti simboli
Sotto il livello 17 i punti non sono selezionabili uno a uno, per evitare centinaia di passaggi. Ingrandisci con <kbd>+</kbd>.
:::

## Vista e ingrandimento {#sehen}

- Contrasto verificato su sfondi chiari e scuri.
- Al 400% di zoom del browser l’interfaccia passa alla vista stretta con menu.
- Gli idranti si distinguono anche per le lettere, non solo per il colore.
- **Print (Light)** e **Night (Dark)** possono aiutare con il bagliore.

## Movimento {#bewegung}

Con “Reduce motion” attivo nel sistema, la mappa salta ai risultati senza animazioni.

## Smartphone {#smartphone}

I comandi sono almeno 24 × 24 px. Tocca un simbolo per aprire i dettagli. VoiceOver e TalkBack consentono di usare il menu. Vedi [Mappa sullo smartphone](../phone/).

## Non ancora testato {#offen}

- test completi con VoiceOver, TalkBack e NVDA
- contrasto dei simboli su tutti gli sfondi, in particolare satellite
- assistente del piano con lettore di schermo

## Segnala un ostacolo {#melden}

Scrivi a **[info@openfiremap.org](mailto:info@openfiremap.org)** indicando dispositivo, browser e lettore di schermo. Puoi anche aprire una [segnalazione su GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).

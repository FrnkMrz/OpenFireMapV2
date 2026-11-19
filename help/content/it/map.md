---
title: La mappa sul computer
description: Ricerca, posizione, livelli, dettagli degli idranti, condivisione e tastiera.
eyebrow: Mappa
lead: Gli strumenti sono in alto a sinistra e la data dei dati in basso a destra. Ecco cosa fanno i pulsanti.
order: 1
---

## Panoramica {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap su un computer.
:::

1. **Ricerca:** trova un luogo o un indirizzo.
2. **La mia posizione:** mostra dove ti trovi.
3. **Livelli della mappa:** cambia sfondo.
4. **Esporta:** salva un piano o punti.
5. **Condividi:** copia il link alla vista.
6. **Idrante:** passa sul simbolo per i dettagli o fai clic per il raggio di 100 metri.
7. **Stato:** livello di zoom e data dei dati.
8. **Info e legale:** guida, simboli e informazioni giuridiche.

## Trova un luogo {#suche}

Inserisci un luogo, una via o un indirizzo nella ricerca e premi <kbd>Invio</kbd> o la lente. La mappa mostra il primo risultato al livello 16. La ricerca usa Nominatim e trova luoghi e indirizzi, non singoli idranti.

## La mia posizione {#standort}

Il pulsante mostra la tua posizione e porta lo zoom al livello 17. Il browser chiede il permesso la prima volta. La posizione non viene salvata.

:::tip Nessuna posizione?
Verifica che il browser consenta la posizione per openfiremap.org. Senza GPS, la posizione del computer può essere approssimativa.
:::

## Idranti e altri oggetti {#objekte}

| Zoom | Visualizzazione |
|---|---|
| sotto 12 | nessun oggetto |
| dal 12 | caserme |
| dal 14 | simboli delle caserme e confini comunali |
| dal 15 | idranti, punti d’acqua e defibrillatori |
| dal 17 | simboli con lettere |
| dal 18 | dettagli al passaggio del mouse |

:::figure marker frame=plain
Facendo clic su un idrante appare un raggio di 100 metri.
:::

Dal livello 18 passa sul simbolo per vedere i dettagli. Con la tastiera selezionalo con <kbd>Tab</kbd> dal livello 17 e premi <kbd>Invio</kbd>. Il raggio appare dal livello 16; dopo **La mia posizione** viene mostrata anche la distanza. I dati provengono da OpenStreetMap. Consulta [Contribuisci](../contribute/) per completarli.

Vedi [Livelli e simboli](../layers/) per colori e simboli.

## Livelli della mappa {#ebenen}

Il pulsante della mappa offre sfondi standard, stampa, notte, satellite, topografico, OSM e BayernAtlas. Gli oggetti dei vigili del fuoco restano in primo piano.

## Condivisione e link {#teilen}

Il pulsante copia un link alla vista esatta, compresi luogo, zoom e sfondo. L’indirizzo del browser si aggiorna mentre sposti la mappa e può essere salvato come preferito.

## Stato e data dei dati {#status}

In basso a destra trovi il livello di zoom e la data dei dati. “+Sync” indica che sono state caricate modifiche recenti. “Data status details” mostra fonte e anzianità. Vedi [Dati e aggiornamento](../data/).

## Informazioni, legale e impostazioni {#info}

“Info & Legal” contiene link a questa guida, simboli, overlay, privacy e licenze. Qui puoi impostare la cache locale: disattivata, 1 ora, 1 giorno, 3 giorni, 7 giorni (predefinito) o 30 giorni.

## Con la tastiera {#tastatur}

- Il primo <kbd>Tab</kbd> porta a “Vai alla mappa”.
- Le frecce spostano la mappa; <kbd>+</kbd> e <kbd>−</kbd> cambiano lo zoom.
- Dal livello 17 i simboli sono raggiungibili con <kbd>Tab</kbd>; <kbd>Invio</kbd> o <kbd>Spazio</kbd> apre i dettagli, <kbd>Esc</kbd> li chiude.
- Nei menu il focus resta all’interno finché non li chiudi.
- Nell’esportazione **Use visible area** seleziona la vista senza disegnare un rettangolo.

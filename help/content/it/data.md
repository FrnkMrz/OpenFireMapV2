---
title: Dati e aggiornamento
description: Origine e aggiornamento dei dati, finestra di stato e cache locale.
eyebrow: Dati
lead: Gli oggetti antincendio provengono da OpenStreetMap. OpenFireMap li prepara per caricarli rapidamente e recupera le modifiche recenti.
order: 4
---

## Origine dei dati {#quelle}

La comunità [OpenStreetMap](https://www.openstreetmap.org/) aggiunge idranti, punti d’acqua, caserme e defibrillatori. OpenFireMap mostra i dati senza modificarli.

## Come vengono caricati gli idranti {#ladeweg}

- **Tessere preparate:** Germania, Austria, Svizzera, Liechtenstein, Lussemburgo e altri 40 paesi europei utilizzano dati preparati in anticipo.
- **Overpass API:** altrove la mappa interroga direttamente l’area visibile e il suo margine.

Nei paesi coperti Overpass serve soltanto a recuperare le modifiche dalla data dei dati base.

### Cos’è l’API Overpass {#overpass}

[Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) è un servizio pubblico per cercare oggetti OpenStreetMap in un’area. Velocità e tempi dipendono dal carico del server e dalle dimensioni della richiesta. OpenFireMap prova più server e conserva le aree caricate nella cache del browser.

## Aggiornamento dei dati {#aktualitaet}

| Area | Dati base | Nuove modifiche |
|---|---|---|
| DACHLiLu | tessere di norma aggiornate ogni giorno | richieste tramite Overpass |
| altri 40 paesi europei | di norma ogni settimana | Overpass se i dati base hanno meno di 10 giorni |
| resto del mondo | stato del server Overpass | a ogni richiesta |

### Perché una nuova voce non appare subito? {#verzoegerung}

Overpass deve elaborare la modifica. Cache dell’area, cache locale o interruzioni possono ritardarne la visualizzazione. Non è possibile garantire un tempo preciso. Gli oggetti eliminati spariscono al successivo aggiornamento dei dati base.

## Finestra “Data status & origin” {#popover}

:::figure data frame=plain
La finestra mostra fonte e stato dell’aggiornamento in tempo reale.
:::

Su computer aprila da “Data status details”; sullo smartphone tocca il riquadro di stato. Mostra fonte, data base e stato dell’aggiornamento.

## Pagina di stato {#statusseite}

La [pagina di stato](/status/) mostra l’età dei dati e il numero di oggetti per ogni paese.

## Cache locale {#cache}

In **Local Cache**, dentro “Info & Legal”, scegli: disattivata, 1 ora, 1 giorno, 3 giorni, 7 giorni (predefinito) o 30 giorni. I dati restano sul dispositivo e vengono ricontrollati quando riapri un’area.

## Senza internet {#offline}

OpenFireMap non è una mappa offline. Le aree in cache possono restare visibili, ma nuove aree e ricerca richiedono internet. Usa un [piano della città](../town-plan/) o un’[esportazione](../export/) stampati.

## Caricamento lento {#laden}

Aumenta lo zoom per ridurre la richiesta e riprova più tardi. Se tutti i server Overpass sono sovraccarichi, occorre attendere.

:::warn Non è uno strumento operativo
I dati possono essere incompleti, obsoleti o errati e non sostituiscono le informazioni dei servizi di emergenza o degli acquedotti. In emergenza chiama il numero locale.
:::

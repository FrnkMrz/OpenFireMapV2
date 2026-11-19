---
title: Aggiungere idranti
description: Aggiungi idranti, punti d’acqua e defibrillatori a OpenStreetMap.
eyebrow: Contribuisci
lead: Ogni idrante sulla mappa è stato aggiunto da qualcuno. Puoi aggiungere quelli mancanti con un account OpenStreetMap gratuito.
order: 7
---

## Prima di iniziare {#vorher}

OpenFireMap mostra dati da [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Le modifiche si fanno in OSM, non in OpenFireMap.

:::steps
1. Crea un account su openstreetmap.org.
2. Conferma l’indirizzo e-mail.
3. Accedi a uno degli strumenti qui sotto.
:::

:::warn Tre regole
- Aggiungi solo ciò che hai verificato sul posto.
- Non copiare piani protetti senza autorizzazione.
- Quando salvi, descrivi brevemente la modifica.
:::

## Scegliere uno strumento {#werkzeug}

| Situazione | Strumento |
|---|---|
| Sul posto con telefono | **Hydrantenjäger** |
| Aggiungere dettagli durante una passeggiata | **StreetComplete** o **Every Door** |
| Modificare sul computer | editor **iD** |
| Lavoro avanzato o molti idranti | **JOSM** o **Vespucci** |

## Con Hydrantenjäger {#hydrantenjaeger}

Accedi con l’account OSM, mettiti a pochi metri dall’idrante, scegli tipo e posizione, poi invia. Inserisci diametro e numero solo se li conosci. Consulta la [guida](https://hydrantenjaeger.de/help/).

## StreetComplete o Every Door {#apps}

StreetComplete aiuta a completare i dati degli oggetti esistenti. Every Door consente di aggiungere nuovi punti: scegli **Fire Hydrant** e compila i campi.

## Con l’editor iD {#id}

:::steps
1. Accedi a openstreetmap.org e ingrandisci il luogo.
2. Seleziona **Edit** e posiziona il punto esattamente sull’idrante.
3. Cerca “hydrant” e scegli **Fire Hydrant**.
4. Inserisci tipo, posizione e dettagli conosciuti.
5. Seleziona **Save**, aggiungi un breve commento e carica le modifiche.
:::

Puoi correggere allo stesso modo un oggetto esistente. Elimina un idrante solo se hai verificato che non esista più.

## JOSM o Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) per computer e [Vespucci](https://vespucci.io/) per Android mostrano tutti i tag e sono adatti a modifiche estese.

## Tag principali {#tags}

| Oggetto | Tag |
|---|---|
| Idrante | `emergency=fire_hydrant` |
| Tipo | `fire_hydrant:type=underground` (anche pillar, wall, pipe) |
| Diametro | `fire_hydrant:diameter=80` |
| Numero | `ref=123` |
| Punto di aspirazione | `emergency=suction_point` |
| Serbatoio | `emergency=water_tank` |
| Defibrillatore | `emergency=defibrillator` |
| Caserma | `amenity=fire_station` |

Vedi i [simboli](/symbols/) e la [wiki OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Quando appare la modifica? {#anzeige}

L’idrante appare dopo che Overpass ha elaborato la modifica. I tempi variano. Vedi [Dati e aggiornamento](../data/#verzoegerung).

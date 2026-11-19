---
title: Brandkranen toevoegen
description: Voeg brandkranen, waterpunten en defibrillatoren toe aan OpenStreetMap.
eyebrow: Bijdragen
lead: Elke brandkraan op de kaart is door iemand toegevoegd. Met een gratis OpenStreetMap-account kun je ontbrekende objecten toevoegen.
order: 7
---

## Voordat je begint {#vorher}

OpenFireMap toont gegevens uit [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Bewerken doe je in OSM, niet in OpenFireMap.

:::steps
1. Maak een account aan op openstreetmap.org.
2. Bevestig je e-mailadres.
3. Meld je aan bij een van de hulpmiddelen hieronder.
:::

:::warn Drie regels
- Voeg alleen toe wat je ter plaatse zelf hebt gezien.
- Kopieer geen beschermde plannen zonder toestemming.
- Beschrijf kort wat je hebt gewijzigd bij het opslaan.
:::

## Kies een hulpmiddel {#werkzeug}

| Situatie | Hulpmiddel |
|---|---|
| Ter plaatse met telefoon | **Hydrantenjäger** |
| Gegevens aanvullen tijdens wandelen | **StreetComplete** of **Every Door** |
| Bewerken op computer | **iD-editor** |
| Veel objecten of geavanceerd werk | **JOSM** of **Vespucci** |

## Met Hydrantenjäger {#hydrantenjaeger}

Meld je aan met je OSM-account, ga op enkele meters van de brandkraan staan, kies type en positie en upload. Vul diameter en nummer alleen in als je ze weet. Zie de [gids](https://hydrantenjaeger.de/help/).

## StreetComplete of Every Door {#apps}

StreetComplete helpt gegevens van bestaande objecten aan te vullen. Every Door kan nieuwe punten toevoegen: kies **Fire Hydrant** en vul de velden in.

## Met de iD-editor {#id}

:::steps
1. Meld je aan op openstreetmap.org en zoom naar de locatie.
2. Kies **Edit** en plaats het punt precies bij de brandkraan.
3. Zoek naar “hydrant” en kies **Fire Hydrant**.
4. Vul type, positie en bekende details in.
5. Klik op **Save**, schrijf een korte opmerking en upload.
:::

Bestaande objecten kun je op dezelfde manier corrigeren. Verwijder een brandkraan alleen als je zeker weet dat die er niet meer is.

## Met JOSM of Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) voor computer en [Vespucci](https://vespucci.io/) voor Android tonen alle tags en zijn geschikt voor grotere taken.

## Belangrijkste tags {#tags}

| Object | Tag |
|---|---|
| Brandkraan | `emergency=fire_hydrant` |
| Type | `fire_hydrant:type=underground` (ook pillar, wall, pipe) |
| Diameter | `fire_hydrant:diameter=80` |
| Nummer | `ref=123` |
| Zuigpunt | `emergency=suction_point` |
| Watertank | `emergency=water_tank` |
| Defibrillator | `emergency=defibrillator` |
| Brandweerkazerne | `amenity=fire_station` |

Bekijk [kaartsymbolen](/symbols/) en de [OpenStreetMap-wiki](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Wanneer verschijnt de wijziging? {#anzeige}

De brandkraan verschijnt nadat Overpass de wijziging heeft verwerkt. Dat kan variëren. Meer in [Gegevens en actualiteit](../data/#verzoegerung).

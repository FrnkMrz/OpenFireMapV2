---
title: Tilføj brandhaner
description: Tilføj brandhaner, vandforsyning og hjertestartere til OpenStreetMap.
eyebrow: Bidrag
lead: Alle brandhaner på kortet er tilføjet af nogen. Hvis en mangler, kan du selv lægge den ind med en gratis OpenStreetMap-konto.
order: 7
---

## Før du begynder {#vorher}

OpenFireMap viser [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Redigering foregår i OSM, ikke i OpenFireMap.

:::steps
1. Opret en konto på openstreetmap.org.
2. Bekræft din e-mailadresse.
3. Log ind i et af værktøjerne nedenfor.
:::

:::warn Tre regler
- Tilføj kun det, du selv har set på stedet.
- Kopiér ikke oplysninger fra beskyttede planer uden tilladelse.
- Beskriv kort ændringen, når du gemmer.
:::

## Vælg værktøj {#werkzeug}

| Situation | Værktøj |
|---|---|
| På stedet med telefon | **Hydrantenjäger** |
| Gåtur og små rettelser | **StreetComplete** eller **Every Door** |
| Computer og enkelte objekter | **iD-editor** |
| Mange objekter eller avanceret redigering | **JOSM** eller **Vespucci** |

## Hydrantenjäger {#hydrantenjaeger}

Log ind med OSM-kontoen, stil dig få meter fra brandhanen, vælg type og position, og upload. Indtast kun diameter og nummer, hvis du kender dem. Se [vejledningen](https://hydrantenjaeger.de/help/).

## StreetComplete og Every Door {#apps}

StreetComplete hjælper med at udfylde manglende oplysninger. Every Door kan tilføje nye punkter: vælg **Fire Hydrant**, og udfyld felterne.

## iD-editor {#id}

:::steps
1. Log ind på openstreetmap.org, og zoom ind på stedet.
2. Vælg **Edit** og placér et punkt præcist ved brandhanen.
3. Søg efter “hydrant”, og vælg **Fire Hydrant**.
4. Udfyld type, placering og kendte detaljer.
5. Vælg **Save**, skriv en kort kommentar, og upload.
:::

Eksisterende objekter kan rettes samme sted. Slet kun en brandhane, hvis du har bekræftet, at den ikke findes længere.

## JOSM eller Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) til computer og [Vespucci](https://vespucci.io/) til Android viser alle tags og passer til større redigeringsopgaver.

## Vigtige tags {#tags}

| Objekt | Tag |
|---|---|
| Brandhane | `emergency=fire_hydrant` |
| Type | `fire_hydrant:type=underground` (også pillar, wall, pipe) |
| Diameter | `fire_hydrant:diameter=80` |
| Nummer | `ref=123` |
| Sugepunkt | `emergency=suction_point` |
| Vandtank | `emergency=water_tank` |
| Hjertestarter | `emergency=defibrillator` |
| Brandstation | `amenity=fire_station` |

Se [kortsymboler](/symbols/) og [OpenStreetMap-wikien](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Hvornår vises ændringen? {#anzeige}

Når Overpass har behandlet ændringen, vises den i OpenFireMap. Det kan ikke loves, hvor hurtigt. Se [Data og aktualitet](../data/#verzoegerung).

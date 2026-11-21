---
title: Gegevens en actualiteit
description: Herkomst en actualiteit van gegevens, het statusvenster en lokale cache.
eyebrow: Gegevens
lead: Brandweerobjecten komen uit OpenStreetMap. OpenFireMap bereidt ze voor om snel te laden en haalt recente wijzigingen op.
order: 4
---

## Waar de gegevens vandaan komen {#quelle}

De [OpenStreetMap](https://www.openstreetmap.org/)-gemeenschap voegt brandkranen, waterpunten, kazernes en defibrillatoren toe. OpenFireMap toont deze gegevens maar wijzigt ze niet.

## Hoe brandkraangegevens worden geladen {#ladeweg}

- **Voorbereide tegels:** Duitsland, Oostenrijk, Zwitserland, Liechtenstein, Luxemburg en 40 andere Europese landen gebruiken vooraf voorbereide gegevens.
- **Overpass API:** elders vraagt de kaart de zichtbare zone en een marge rechtstreeks op.

In gedekte landen wordt Overpass alleen gebruikt voor wijzigingen sinds de datum van de basisgegevens.

### Wat is de Overpass API? {#overpass}

[Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) is een openbare dienst om OpenStreetMap-objecten in een gebied te zoeken. De snelheid hangt af van serverbelasting en de grootte van de query. OpenFireMap probeert meerdere servers en bewaart geladen gebieden in de browsercache.

## Hoe actueel zijn de gegevens? {#aktualitaet}

| Gebied | Basisgegevens | Nieuwe en gewijzigde objecten |
|---|---|---|
| DACHLiLu | tegels meestal dagelijks vernieuwd | opgevraagd via Overpass |
| 40 andere Europese landen | meestal wekelijks | Overpass zolang basisgegevens maximaal 10 dagen oud zijn |
| rest van de wereld | status Overpass-server | bij elke query |

### Waarom verschijnt een nieuwe brandkraan niet meteen? {#verzoegerung}

Overpass moet de wijziging eerst verwerken. De gebieds- en lokale cache of een storing kan dit vertragen; een vaste termijn is niet te beloven. Verwijderde objecten verdwijnen bij de volgende update van de basisgegevens.

## Venster “Data status & origin” {#popover}

:::figure data frame=plain
Het venster toont bron en status van de live-update.
:::

Open het op een computer via “Data status details”; tik op een smartphone op het statusvak. Je ziet de bron, basisdatum en status van de live-update.

## Statuspagina {#statusseite}

De [statuspagina](/status/) toont per land de ouderdom van gegevens en het aantal objecten.

## Lokale cache {#cache}

Kies onder **Local Cache** in “Info & Legal”: uit, 1 uur, 1 dag, 3 dagen, 7 dagen (standaard) of 30 dagen. Gegevens blijven op je apparaat en worden opnieuw gecontroleerd wanneer je een gebied opent.

## Zonder internet {#offline}

OpenFireMap is geen offlinekaart. Gebieden uit de cache kunnen zichtbaar blijven, maar nieuwe gebieden en zoeken vereisen internet. Gebruik een gedrukt [stadsplan](../town-plan/) of een [export](../export/).

## Laden duurt lang {#laden}

Zoom in om de query kleiner te maken en probeer het later opnieuw. Zijn alle Overpass-servers overbelast, dan moet je wachten.

:::warn Geen operationeel hulpmiddel
Gegevens kunnen onvolledig, verouderd of onjuist zijn en vervangen geen informatie van meldkamers of waterbedrijven. Bel in noodgevallen het lokale alarmnummer.
:::

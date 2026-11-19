---
title: Data og aktualitet
description: Datakilder, aktualitet, statusvinduet og lokal cache.
eyebrow: Data
lead: Brandvæsenets objekter kommer fra OpenStreetMap. OpenFireMap forbereder data til hurtig indlæsning og henter nye ændringer løbende.
order: 4
---

## Datakilde {#quelle}

Frivillige i [OpenStreetMap](https://www.openstreetmap.org/) tilføjer brandhaner, vandforsyning, brandstationer og hjertestartere. OpenFireMap viser dataene uden at ændre dem.

## Sådan indlæses data {#ladeweg}

- **Forberedte kortfliser:** Tyskland, Østrig, Schweiz, Liechtenstein, Luxembourg og 40 andre europæiske lande bruger datafliser, der bygges på forhånd.
- **Overpass API:** andre områder spørges direkte for den synlige visning og en margin.

I de dækkede lande spørger OpenFireMap kun Overpass om ændringer siden grunddataenes dato.

### Overpass API {#overpass}

Overpass er en offentlig tjeneste, der søger i OpenStreetMap efter objekter i et område. Serverens belastning, områdets størrelse og ventetid påvirker hastigheden. OpenFireMap prøver flere servere og holder indlæste områder i browserens cache.

## Hvor aktuelle er data? {#aktualitaet}

| Område | Grunddata | Nye og ændrede objekter |
|---|---|---|
| DACHLiLu | fliser opdateres normalt dagligt | hentes via Overpass |
| 40 yderligere europæiske lande | normalt ugentligt | Overpass, når grunddata er højst 10 dage gamle |
| resten af verden | Overpass-serverens data | ved hver forespørgsel |

### Hvorfor vises et nyt objekt ikke straks? {#verzoegerung}

Overpass skal først have behandlet ændringen. Områdecache, lokal cache eller en overbelastet tjeneste kan forsinke visningen. Der kan derfor ikke loves et fast tidspunkt. Slettede objekter forsvinder først ved næste opdatering af grunddata.

## “Data status & origin” {#popover}

Vinduet viser datakilde, dato for grunddata og om liveopdatering lykkedes. På computer åbnes det via statusfeltet; på telefon trykkes på feltet.

## Statusside {#statusseite}

:::figure data frame=plain
Vinduet viser datakilden og status for liveopdateringen.
:::

[Statussiden](/status/) viser dataalder og objekttal for hvert land.

## Lokal cache {#cache}

Under **Local Cache** i “Info & Legal” vælges fra, 1 time, 1 dag, 3 dage, 7 dage (standard) eller 30 dage. Dataene gemmes på din enhed og kontrolleres mod nye data, når området åbnes igen.

## Uden internet {#offline}

OpenFireMap er ikke et offlinekort. Cachede områder kan blive vist, men nye områder og søgning kræver internet. Brug en udskrevet [byplan](../town-plan/) eller [eksport](../export/) uden forbindelse.

## Når indlæsningen tager tid {#laden}

Zoom ind for at gøre forespørgslen mindre, og prøv igen senere. Hvis alle Overpass-servere er belastede, må du vente.

:::warn Ikke til indsats
Data kan være ufuldstændige, forældede eller forkerte og erstatter ikke oplysninger fra alarmcentraler eller vandværker. Ring altid til alarmnummeret ved en nødsituation.
:::

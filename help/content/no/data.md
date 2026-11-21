---
title: Data og aktualitet
description: Hvor OpenFireMaps data kommer fra, hvor oppdatert det er, hva statusvinduet viser og hvordan lokal hurtigbuffer fungerer.
eyebrow: Data
lead: Alle brannobjekter kommer fra OpenStreetMap. OpenFireMap klargjør dem for rask innlasting og henter nye oppføringer direkte.
order: 4
---

## Hvor dataene kommer fra {#quelle}

Hydranter, vannpunkter, brannstasjoner og hjertestartere legges inn av [OpenStreetMap](https://www.openstreetmap.org/)-fellesskapet, ofte av lokale brannfolk. OpenFireMap viser dataene, men endrer dem ikke.

## Slik laster OpenFireMap inn hydranter {#ladeweg}

Avhengig av område bruker kartet én av to metoder:

- **Forhåndsbygde fliser:** For Tyskland, Østerrike, Sveits, Liechtenstein, Luxembourg og 40 andre europeiske land bygger OpenFireMap datafliser på forhånd fra OpenStreetMaps landeuttrekk (Geofabrik). De ligger hos Cloudflare og leveres gjennom hurtigbufferen. Nettleseren henter bare flisene visningen trenger.
- **Overpass API:** Andre steder spør OpenFireMap en offentlig Overpass-server direkte etter det synlige området og en margin rundt det.

:::note Hvorfor går det raskere i Tyskland og Europa?
Det er ikke fordi Overpass svarer raskere der. I disse landene leser kartet forhåndsbygde fliser og trenger ikke Overpass-spørringer for hydrantene. Overpass spørres bare om endringer siden grunndatoen, som er en mye mindre spørring.
:::

### Hva er Overpass API? {#overpass}

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) er en offentlig tjeneste som henter OpenStreetMap-data etter objekt og område, for eksempel «alle hydranter i dette rektangelet». Serverne drives av frivillige og organisasjoner og deles av mange apper.

Hvor raskt svaret kommer, avhenger av:

- **belastningen** på serveren OpenFireMap bruker,
- **størrelsen** på området og dermed spørringstiden,
- **ventetid og avvisninger** når serveren er overbelastet eller begrenser forespørsler.

OpenFireMap kjenner fire Overpass-servere og prøver dem i tilfeldig rekkefølge. Hvis én ikke svarer eller melder om overbelastning, tar kartet en kort pause og prøver neste. Innlastede områder lagres i nettleserens lokale hurtigbuffer.

## Hvor oppdaterte er dataene? {#aktualitaet}

| Område | Grunndata | Nye og endrede oppføringer |
|---|---|---|
| Tyskland, Østerrike, Sveits, Liechtenstein, Luxembourg | forhåndsbygde fliser, vanligvis bygd daglig | hentes fra Overpass |
| 40 andre europeiske land | forhåndsbygde fliser, vanligvis bygd ukentlig | hentes fra Overpass når grunndataene er høyst 10 dager gamle |
| resten av verden | Overpass-serverens data | ved hver spørring |

Etter at flisene er lastet inn, spør OpenFireMap i bakgrunnen etter alt i visningen som er endret siden grunndatoen, og legger det til på kartet.

### Hvorfor vises ikke en ny oppføring med én gang? {#verzoegerung}

En endring i OpenStreetMap vises ikke i OpenFireMap samtidig:

- **Behandling:** Overpass-serveren må ha mottatt endringen. Hvis dataene er for gamle, forkaster OpenFireMap svaret og viser grunndataene.
- **Hurtigbuffer:** kartet beholder resultatet for et område i noen minutter; innlastede områder lagres også lokalt.
- **Avbrudd:** Hvis Overpass er overbelastet eller utilgjengelig, blir grunndataene stående til en senere forespørsel lykkes. OpenFireMap kan ikke påvirke dette.

Derfor kan ingen fast tid loves. Hvis oppføringen ikke vises ennå, last kartet inn på nytt senere.

:::note Slettede objekter
Oppdateringen oppdager bare nye og endrede objekter. En hydrant som slettes i OpenStreetMap, forsvinner først ved neste grunndataoppdatering av flisene.
:::

## Vinduet «Datastatus og kilde» {#popover}

:::figure data frame=plain
Datastatus og kilde: her er grunndata fra i går; direkte oppdatering var utilgjengelig da.
:::

På datamaskin åpner du det med «Detaljer om datastatus» i statusboksen; på smarttelefon trykker du på statusboksen.

- **Kilde:** forhåndsbygde fliser (DACHLiLu eller Europa), direkte spørring eller lokal hurtigbuffer.
- **Grunndato:** når landeuttrekket ble opprettet. Hvis flere land vises, gjelder den eldste datoen.
- **Direkte oppdatering:** om nyere endringer er lastet inn. «Ikke tilgjengelig» betyr at tjenesten ikke kunne nås, og at grunndataene vises. Pilknappen prøver på nytt.

Statusboksen viser det samme kort, for eksempel «Per: 1 dag siden +Sync».

## Statussiden {#statusseite}

[Statussiden](/status/) viser alderen på OpenStreetMap-dataene for hvert land, når kartet sist ble oppdatert, og antall hydranter, brannstasjoner og hjertestartere per innbygger. Den er tilgjengelig på tysk og engelsk.

## Lokal hurtigbuffer {#cache}

OpenFireMap lagrer innlastede data i nettleseren, slik at områder du har besøkt åpnes raskere. Velg varighet under **Lokal hurtigbuffer** i «Info og juridisk»: av, 1 time, 1 dag, 3 dager, 7 dager (standard) eller 30 dager.

Dataene blir på enheten din. Hurtigbufferen erstatter ikke oppdateringer: områdene sjekkes mot gjeldende data når du åpner dem.

## Uten internett {#offline}

OpenFireMap er ikke et frakoblet kart. Hurtigbufrede områder vises en stund, men nye områder og søk krever nett. For arbeid uten nett er et utskrevet [bykart](../town-plan/) eller en [eksport](../export/) bedre.

## Når innlastingen tar tid {#laden}

Utenfor land med forhåndsbygde fliser kommer alt via Overpass. Hvis en server er opptatt, prøver OpenFireMap automatisk den neste; meldingen nederst viser hva som skjer. Hvis det ikke hjelper, zoom litt inn for å gjøre spørringen mindre og prøv igjen snart. Hvis alle serverne er overbelastet, ligger flaskehalsen hos Overpass. Da må du laste inn senere.

:::warn Ikke et operativt verktøy
Dataene er bare så gode som oppføringene i OpenStreetMap. De kan være ufullstendige, utdaterte eller feil og erstatter ikke informasjon fra nødsentraler eller vannverk. I en nødsituasjon ringer du alltid nødnummeret (112 i Europa).
:::

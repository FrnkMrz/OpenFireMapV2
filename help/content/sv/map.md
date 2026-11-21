---
title: Kartan på en dator
description: Sökning, position, kartlager, brandpostdetaljer, delning, statusruta och tangentbordsanvändning i OpenFireMap på dator.
eyebrow: Karta
lead: Alla verktyg finns uppe till vänster och datadatumet nere till höger. Här förklaras knapparna och vad kartan visar.
order: 1
---

## Översikt {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap på en dator: Nürnbergs gamla stad på zoomnivå 17.
:::

1. **Sök:** hitta en plats eller adress.
2. **Min plats:** gå till där du är.
3. **Kartlager:** byt bakgrundskarta.
4. **Export:** brandpostplan som PNG eller PDF, punkter som GPX eller CSV.
5. **Dela:** kopiera en länk till den här vyn.
6. **Brandpost:** håll pekaren över för detaljer, klicka för cirkeln på 100 meter.
7. **Statusruta:** zoomnivå och datadatum.
8. **Info och juridik:** hjälp, kartsymboler, juridisk information, integritet och inställningar.

## Hitta en plats {#suche}

Skriv en plats, gata eller adress i sökfältet uppe till vänster och tryck <kbd>Enter</kbd> eller klicka på förstoringsglaset. Kartan går till det första resultatet och zoomar till nivå 16, så att brandposterna syns.

Sökningen använder Nominatim, OpenStreetMaps söktjänst. Den hittar platser och adresser, inte enskilda brandposter.

## Min plats {#standort}

Platsknappen visar var du är och zoomar till nivå 17. Första gången frågar webbläsaren om OpenFireMap får använda din position. Den används bara i webbläsaren och sparas inte.

:::tip Hittas inte platsen?
Kontrollera att webbläsaren tillåter platsåtkomst för openfiremap.org. På en dator utan GPS kan positionen vara fel med några hundra meter.
:::

## Brandposter och andra objekt {#objekte}

Vad som visas beror på zoomnivån:

| Zoomnivå | Vad visas |
|---|---|
| under 12 | inga objekt ännu |
| från 12 | brandstationer |
| från 14 | stationssymboler och kommungränser |
| från 15 | brandposter, vattenpunkter och hjärtstartare som färgade punkter |
| från 17 | alla objekt som symboler med bokstav |
| från 18 | detaljer när pekaren hålls över |

:::figure marker frame=plain
Ett klick på en brandpost ritar en cirkel med 100 meters radie.
:::

**Visa detaljer:** från nivå 18 visas detaljer när du håller pekaren över en symbol. Med tangentbord fungerar det från nivå 17: välj symbolen med <kbd>Tab</kbd> och tryck <kbd>Enter</kbd>.

**Radie och avstånd:** från nivå 16 visar ett klick på en brandpost en streckad cirkel med 100 meters radie. Den hjälper dig att bedöma vilka brandposter som nås med slangen. Från nivå 17 står «100 m» i cirkeln. Om du först har använt **Min plats**, ritar OpenFireMap även en blå linje till brandposten med avståndet från nivå 17.

Detaljerna visar uppgifter från OpenStreetMap, till exempel typ, diameter, nummer, tryck, plats och operatör. Om något saknas har ingen lagt till det ännu. [Bidra](../contribute/) förklarar hur du gör.

Sidan [Lager och symboler](../layers/) förklarar symbolerna och färgerna.

## Kartlager {#ebenen}

Knappen med kartikonen öppnar bakgrundskartorna: standard, utskrift, natt, satellit, topografisk, två OSM-stilar och i Bayern BayernAtlas och flygbilder. Räddningstjänstobjekten ligger alltid överst. [Lager och symboler](../layers/) förklarar vilken bakgrund som passar till vad.

## Delning och länkar {#teilen}

Delningsknappen kopierar en länk till exakt den här vyn. Alla som öppnar den ser samma plats, zoomnivå och bakgrund.

Adressen i webbläsaren ändras när kartan flyttas. Formatet är `#zoom/latitude/longitude/background`, till exempel `openfiremap.org/#17/49.45280/11.07700/voyager`. Du kan också bokmärka den.

## Statusruta och datadatum {#status}

Nere till höger visas aktuell zoomnivå och datadatum, till exempel «Per: 1 dag sedan». «+Sync» betyder att nyare ändringar från OpenStreetMap har lästs in. «Detaljer om datastatus» visar källa, grunddatum och status för liveuppdateringen. Läs mer under [Data och aktualitet](../data/).

## Info, juridik och inställningar {#info}

«Info och juridik» nere till vänster öppnar länkar till den här hjälpen, kartsymbolerna och överlägget, samt juridisk information, integritet och licenser. Här ställer du också in **lokal cache**: av, 1 timme, 1 dag, 3 dagar, 7 dagar (standard) eller 30 dagar. Områden du redan läst in visas snabbare.

## Med tangentbord {#tastatur}

OpenFireMap fungerar helt utan mus:

- Första <kbd>Tab</kbd> går till «Hoppa till karta».
- På kartan flyttar piltangenterna vyn; <kbd>+</kbd> och <kbd>−</kbd> zoomar.
- Från nivå 17 nås symbolerna med <kbd>Tab</kbd>. <kbd>Enter</kbd> eller <kbd>Space</kbd> öppnar detaljerna, <kbd>Escape</kbd> stänger dem.
- I menyer och dialoger stannar fokus i dialogen; <kbd>Escape</kbd> stänger den.
- I exporten väljer «Använd synligt område» den aktuella vyn utan att du drar en rektangel.

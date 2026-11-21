---
title: Data och aktualitet
description: Var OpenFireMaps data kommer från, hur aktuell den är, vad statusfönstret visar och hur den lokala cachen fungerar.
eyebrow: Data
lead: Alla räddningstjänstobjekt kommer från OpenStreetMap. OpenFireMap förbereder dem för snabb inläsning och hämtar nya poster direkt.
order: 4
---

## Varifrån kommer data? {#quelle}

Brandposter, vattenpunkter, brandstationer och hjärtstartare läggs till av [OpenStreetMap](https://www.openstreetmap.org/)-gemenskapen, ofta av lokala brandmän. OpenFireMap visar dessa data men ändrar dem inte.

## Så läser OpenFireMap in brandposter {#ladeweg}

Beroende på område används ett av två sätt:

- **Förberedda kartplattor:** För Tyskland, Österrike, Schweiz, Liechtenstein, Luxemburg och 40 andra europeiska länder bygger OpenFireMap kartplattor i förväg från OpenStreetMaps landsutdrag (Geofabrik). De finns hos Cloudflare och levereras via dess cache. Webbläsaren hämtar bara de få plattor som behövs för vyn.
- **Overpass API:** På andra platser frågar kartan en offentlig Overpass-server direkt efter det synliga området och en marginal runt det.

:::note Varför går det snabbare i Tyskland och Europa?
Det beror inte på att Overpass svarar snabbare där. I dessa länder läser kartan förberedda plattor och behöver inte fråga Overpass efter brandposterna. Overpass används bara för ändringar efter grunddatadatumet, vilket är en mycket mindre förfrågan.
:::

### Vad är Overpass API? {#overpass}

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) är en offentlig tjänst som hämtar OpenStreetMap-data efter objekt och område, till exempel «alla brandposter i den här rektangeln». Servrarna drivs av frivilliga och organisationer och delas av många appar.

Hur snabbt svaret kommer beror på:

- **belastningen** på servern som OpenFireMap använder,
- områdets **storlek** och hur länge frågan körs,
- **väntetider och avslag** när servern är överbelastad eller begränsar förfrågningar.

OpenFireMap känner till fyra Overpass-servrar och provar dem i slumpmässig ordning. Om en inte svarar eller rapporterar överbelastning pausas den en kort stund och nästa server provas. Områden som du har läst in sparas i webbläsarens lokala cache.

## Hur aktuell är datan? {#aktualitaet}

| Område | Grunddata | Nya och ändrade poster |
|---|---|---|
| Tyskland, Österrike, Schweiz, Liechtenstein, Luxemburg | förberedda plattor, vanligtvis byggda dagligen | hämtas från Overpass |
| 40 andra europeiska länder | förberedda plattor, vanligtvis byggda varje vecka | hämtas från Overpass så länge grunddatan är högst 10 dagar gammal |
| resten av världen | Overpass-serverns data | vid varje fråga |

När plattorna har lästs in frågar OpenFireMap i bakgrunden efter allt i vyn som ändrats sedan grunddatadatumet och lägger till det på kartan.

### Varför syns inte en ny post direkt? {#verzoegerung}

En ändring i OpenStreetMap visas inte i OpenFireMap samtidigt:

- **Bearbetning:** Overpass-servern måste först ha tagit emot ändringen. Om den rapporterar för gammal data kastar OpenFireMap bort svaret och visar grunddatan.
- **Cache:** kartan sparar resultatet för ett område i några minuter; inlästa områden sparas också lokalt.
- **Avbrott:** om Overpass är överbelastad eller inte kan nås ligger grunddatan kvar tills en senare förfrågan lyckas. OpenFireMap kan inte påverka detta.

Därför kan ingen fast tid utlovas. Om posten inte syns än kan du läsa in kartan igen senare.

:::note Borttagna objekt
Uppdateringen hittar bara nya och ändrade objekt. En brandpost som tas bort i OpenStreetMap försvinner först vid nästa grunddatauppdatering av plattorna.
:::

## Fönstret «Datastatus och källa» {#popover}

:::figure data frame=plain
Datastatus och källa: här är grunddatan från i går och liveuppdateringen gick inte att nå då.
:::

På dator öppnar du det via «Detaljer om datastatus» i statusrutan; på mobil trycker du på statusrutan.

- **Källa:** förberedda plattor (DACHLiLu eller Europa), direkt fråga eller lokal cache.
- **Grunddatum:** när landsutdraget skapades. Om flera länder visas gäller det äldsta datumet.
- **Liveuppdatering:** om nyare ändringar har lästs in. «Inte tillgänglig» betyder att tjänsten inte kunde nås och att grunddatan visas. Pilknappen försöker igen.

Statusrutan visar samma sak kort, till exempel «Per: 1 dag sedan +Sync».

## Statussidan {#statusseite}

[Statussidan](/status/) visar per land åldern på OpenStreetMap-data, när kartan senast uppdaterades och antal brandposter, brandstationer och hjärtstartare per invånare. Den finns på tyska och engelska.

## Lokal cache {#cache}

OpenFireMap sparar inlästa data i webbläsaren så att områden du besökt öppnas snabbare. Välj varaktighet under **Lokal cache** i «Info och juridik»: av, 1 timme, 1 dag, 3 dagar, 7 dagar (standard) eller 30 dagar.

Data stannar på din enhet. Cachen ersätter inte uppdateringar: områden kontrolleras mot aktuella data när du öppnar dem.

## Utan internet {#offline}

OpenFireMap är ingen offlinekarta. Cachade områden syns en stund, men nya områden och sökningar kräver anslutning. För arbete utan nät är en utskriven [stadsplan](../town-plan/) eller en [export](../export/) bättre.

## När inläsningen tar tid {#laden}

Utanför länder med förberedda plattor hämtas allt via Overpass. Om en server är upptagen provar OpenFireMap automatiskt nästa; meddelandet längst ner visar vad som händer. Om det inte hjälper, zooma in lite så frågan blir mindre och försök igen senare. Om alla servrar är överbelastade ligger flaskhalsen hos Overpass. Då får du läsa in senare.

:::warn Inte ett operativt hjälpmedel
Data är bara så bra som uppgifterna i OpenStreetMap. Den kan vara ofullständig, föråldrad eller felaktig och ersätter inte information från larmcentraler eller vattenverk. I en nödsituation ringer du alltid nödnumret (112 i Europa).
:::

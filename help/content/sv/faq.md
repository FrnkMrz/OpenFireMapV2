---
title: Vanliga frågor
description: Svar på frågor om OpenFireMap: karta, data och aktualitet, export och stadsplan, bidrag, projekt och juridik.
eyebrow: FAQ
lead: Svar på de vanligaste frågorna. Hittade du inte svaret? Skriv till info@openfiremap.org.
order: 10
---

## Karta och kontroller {#karte}

### Varför ser jag inga brandposter? {#keine-hydranten}

Brandposter visas från zoomnivå 15. Zooma in mer. Om du fortfarande inte ser några har ingen lagt till dem i det här OpenStreetMap-området än. Du kan [ändra det själv](../contribute/).

### Hur öppnar jag detaljerna för en brandpost? {#details}

På dator visas detaljer när du håller muspekaren över symbolen från zoomnivå 18. På mobil trycker du på symbolen från nivå 17. Med tangentbord väljer du den med <kbd>Tab</kbd> från nivå 17 och trycker <kbd>Enter</kbd>.

### Vad betyder cirkeln runt en brandpost? {#kreis}

Den har 100 meters radie och visas från nivå 16 när du klickar eller trycker på en brandpost. Den visar vilka brandposter som nås med slangen. Om du först har använt «Min plats» visar en blå linje också avståndet från dig.

### Vad betyder bokstäverna i symbolerna? {#buchstaben}

De visar typen: **U** underjordisk brandpost, **O** pelarbrandpost, **Ø** torrbrandpost. Sidan [Kartsymboler](/symbols/) förklarar alla symboler.

### Hur delar jag en kartvy? {#teilen}

Använd delningsknappen (på mobil «Dela kartvy» i menyn). Den kopierar en länk till exakt den här vyn med zoomnivå och bakgrund. Du kan också bokmärka adressen i webbläsaren.

### Kan jag installera OpenFireMap som en app? {#app}

Ja. På iPhone i Safari via **Dela → Lägg till på hemskärmen**, på Android i Chrome via **⋮ → Installera app**. Ingen appbutik behövs. Mer under [Kartan på mobil](../phone/#app).

### Fungerar kartan offline? {#offline}

Delvis. Områden du har läst in sparas ett tag beroende på cacheinställningen. Nya områden och sökningar kräver anslutning. Ute i fält är en utskriven [stadsplan](../town-plan/) mer tillförlitlig.

## Data och aktualitet {#daten}

### Varifrån kommer data? {#herkunft}

Från [OpenStreetMap](https://www.openstreetmap.org/). Frivilliga, ofta lokala brandmän, lägger till brandposter, vattenpunkter, brandstationer och hjärtstartare. OpenFireMap visar data men ändrar den inte.

### Varför laddas kartan snabbare i Tyskland än på andra platser? {#schneller}

För Tyskland, Österrike, Schweiz, Liechtenstein, Luxemburg och ytterligare 40 europeiska länder förbereder OpenFireMap data som kartplattor i förväg. På andra håll hämtas den direkt via Overpass API, vars hastighet beror på belastningen på de offentliga servrarna. Mer under [Data och aktualitet](../data/#ladeweg).

### När visas min nya brandpost? {#neu}

Det går inte att förutsäga exakt. Den visas när Overpass-servern har behandlat ändringen; cache kan fördröja den lite. Om Overpass är överbelastad eller inte kan nås visas den senare. Borttagna objekt försvinner vid nästa datauppdatering. [Data och aktualitet](../data/#verzoegerung) förklarar varför.

### Hur aktuell är datan? {#aktuell}

Statusrutan visar datadatumet. Fönstret «Datastatus och källa» visar detaljerna. [Statussidan](/status/) visar dataåldern för varje land.

### Kartan laddas inte eller visar överbelastning. Vad kan jag göra? {#laedt-nicht}

Zooma in lite så att frågan blir mindre och försök igen snart. Om alla servrar rapporterar överbelastning är de offentliga Overpass-servrarna flaskhalsen. Då får du försöka igen senare.

### Är datan bindande för insatser? {#verbindlich}

Nej. OpenFireMap är inget operativt hjälpmedel. Data kan vara ofullständig, inaktuell eller felaktig och ersätter inte information från larmcentraler, kommuner eller vattenverk. I en nödsituation ringer du alltid nödnumret först (112 i Europa).

## Export och stadsplan {#export}

### Varför finns ingen export på mobil? {#export-handy}

Utskriftsklara planer kräver mycket minne och stor skärm för att välja område. Export och stadsplan finns därför bara på dator.

### Hur stort får exportområdet vara? {#export-groesse}

Högst 10 × 10 kilometer. Om du drar en större rektangel begränsar OpenFireMap den. För en stor stad med rutnät och gateregister är [stadsplanen](../town-plan/) bättre.

### Vad är skillnaden mellan export och stadsplan? {#unterschied}

[Exporten](../export/) skapar snabbt en bild eller PDF av området eller en lista med punkter (GPX, CSV). [Stadsplanen](../town-plan/) är ett formgivet ark från A4 till A1 med fast skala, rutor, teckenförklaring och gateregister, för närvarande för platser i Tyskland.

### Den utskrivna planen har fel skala. {#massstab}

Skriv ut PDF-filen i **Faktisk storlek** eller **100 %**, inte «Anpassa till sida», på pappersstorleken som valdes i assistenten. Kontrollera skalstocken med en linjal.

### Får jag skriva ut och dela planer för min brandkår? {#drucken}

Ja. Data licensieras under Open Database License. «© OpenStreetMap contributors» måste synas på varje plan. Exporten och stadsplanen skriver ut krediteringen; beskär inte bort den.

## Bidra {#mitmachen}

### En brandpost saknas eller är fel. Vem rättar det? {#korrigieren}

Du kan själv göra det i OpenStreetMap med ett gratis konto. [Lägg till brandposter](../contribute/) beskriver Hydrantenjäger, StreetComplete, iD och JOSM.

### Vi är en brandkår och vill registrera brandposterna i vårt område. Hur gör vi? {#feuerwehr}

Gärna som en övning eller stadsvandring i lag. En steg-för-steg-guide för brandkårer i Tyskland finns bara på tyska: [Für Feuerwehren](/help/fire-brigades/). På andra håll visar [Lägg till brandposter](../contribute/) verktygen.

### Får jag kopiera planer från kommunen eller vattenverket? {#plaene}

Bara med uttryckligt tillstånd. Planerna är upphovsrättsskyddade. Lägg helst bara till sådant du själv har sett på plats.

### Kan jag använda räddningstjänstlagren i min egen karta? {#overlay}

Ja, med överlägget. Information finns på [överläggssidan](/overlay/).

## Projekt och juridik {#projekt}

### Är det här en officiell brandkarta? {#offiziell}

Nej. OpenFireMap är ett privat, icke-kommersiellt projekt baserat på OpenStreetMap. Det samarbetar inte officiellt med någon myndighet eller brandkår.

### Vad kostar OpenFireMap? {#kosten}

Ingenting. Inget konto, inga annonser och ingen prenumeration. Källkoden finns på [GitHub](https://github.com/FrnkMrz/OpenFireMapV2) under MIT-licensen.

### Vilka data om mig sparar OpenFireMap? {#datenschutz}

Kartan körs i webbläsaren. Där sparas bara inställningar som språk och cache, den senaste kartvyn, stadsplaninställningar och kartdata du har läst in. Sökning, kartplattor och data kontaktar externa tjänster. Se [integritetspolicyn](/datenschutz/#en).

### Hur kontaktar jag er? {#kontakt}

Mejla [info@openfiremap.org](mailto:info@openfiremap.org). Du kan också rapportera buggar och önskemål som ett [GitHub-ärende](https://github.com/FrnkMrz/OpenFireMapV2/issues).

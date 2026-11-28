---
title: Vanlige spørsmål
description: Svar på vanlige spørsmål om OpenFireMap: kart, data og aktualitet, eksport og bykart, bidrag, prosjekt og juridiske forhold.
eyebrow: FAQ
lead: Svar på spørsmålene folk stiller oftest. Fant du ikke spørsmålet ditt? Skriv til info@openfiremap.org.
order: 10
---

## Kart og betjening {#karte}

### Hvorfor ser jeg ingen hydranter? {#keine-hydranten}

Hydranter vises fra zoomnivå 15. Zoom lenger inn. Hvis du fortsatt ikke ser noen, har ingen lagt dem inn for dette området i OpenStreetMap ennå. Du kan [endre det selv](../contribute/).

### Hvordan åpner jeg detaljene for en hydrant? {#details}

På datamaskin vises detaljene når du holder musepekeren over symbolet fra nivå 18. På smarttelefon trykker du på symbolet fra nivå 17. Med tastatur velger du det med <kbd>Tab</kbd> fra nivå 17 og trykker <kbd>Enter</kbd>.

### Hva betyr sirkelen rundt en hydrant? {#kreis}

Den har radius på 100 meter og vises fra nivå 16 når du klikker eller trykker på en hydrant. Den viser hvilke hydranter som er innenfor slangelengde. Hvis du først brukte «Min posisjon», viser en blå linje også avstanden fra deg.

### Hva betyr bokstavene i symbolene? {#buchstaben}

De viser typen: **U** underjordisk hydrant, **O** søylehydrant, **Ø** tørrhydrant. Siden [Kartsymboler](/symbols/) forklarer alle.

### Hvordan deler jeg en kartvisning? {#teilen}

Bruk delingsknappen (på smarttelefon «Del kartvisning» i menyen). Den kopierer en lenke til akkurat denne visningen med zoomnivå og bakgrunn. Du kan også bokmerke adressen i nettleseren.

### Kan jeg installere OpenFireMap som en app? {#app}

Ja. På iPhone i Safari via **Del → Legg til på startskjermen**, på Android i Chrome via **⋮ → Installer app**. Ingen appbutikk trengs. Mer under [Kart på smarttelefon](../phone/#app).

### Fungerer kartet uten nett? {#offline}

Bare delvis. Innlastede områder lagres en stund avhengig av hurtigbufferen. Nye områder og søk krever nett. Uten nett på farten er et utskrevet [bykart](../town-plan/) mer pålitelig.

## Data og aktualitet {#daten}

### Hvor kommer dataene fra? {#herkunft}

Fra [OpenStreetMap](https://www.openstreetmap.org/). Frivillige, ofte lokale brannfolk, legger inn hydranter, vannpunkter, stasjoner og hjertestartere. OpenFireMap viser dataene, men endrer dem ikke.

### Hvorfor lastes kartet raskere i Tyskland enn andre steder? {#schneller}

For Tyskland, Østerrike, Sveits, Liechtenstein, Luxembourg og 40 andre europeiske land klargjør OpenFireMap dataene som fliser på forhånd. Andre steder hentes de direkte via Overpass API, som avhenger av belastningen på de offentlige serverne. Mer under [Data og aktualitet](../data/#ladeweg).

### Når vises den nye hydranten min? {#neu}

Det er ikke mulig å forutsi nøyaktig. Den vises når Overpass-serveren har behandlet endringen; hurtigbuffere kan forsinke den litt. Hvis Overpass er overbelastet eller utilgjengelig, vises den senere. Slettede objekter forsvinner ved neste dataoppdatering. [Data og aktualitet](../data/#verzoegerung) forklarer hvorfor.

### Hvor oppdaterte er dataene? {#aktuell}

Statusboksen viser datadatoen. Vinduet «Datastatus og kilde» viser detaljene. [Statussiden](/status/) viser alderen på dataene for hvert land.

### Kartet lastes ikke inn eller sier at det er overbelastet. Hva gjør jeg? {#laedt-nicht}

Zoom litt inn for å gjøre spørringen mindre, og prøv igjen snart. Hvis alle serverne melder om overbelastning, er flaskehalsen de offentlige Overpass-serverne. Da må du prøve igjen senere.

### Er dataene bindende i en operasjon? {#verbindlich}

Nei. OpenFireMap er ikke et operativt verktøy. Dataene kan være ufullstendige, utdaterte eller feil og erstatter ikke informasjon fra nødsentraler, kommuner eller vannverk. I en nødsituasjon ringer du alltid nødnummeret først (112 i Europa).

## Eksport og bykart {#export}

### Hvorfor finnes det ingen eksport på smarttelefon? {#export-handy}

Utskriftsklare planer trenger mye minne og stor skjerm for områdevalg. Eksport og bykart er derfor bare tilgjengelig på datamaskin.

### Hvor stort kan et eksportområde være? {#export-groesse}

Maksimalt 10 × 10 kilometer. Hvis du drar et større rektangel, begrenser OpenFireMap det. For en stor by med rutenett og gateindeks er [bykartet](../town-plan/) bedre.

### Hva er forskjellen mellom eksport og bykart? {#unterschied}

[Eksporten](../export/) lager raskt et bilde eller en PDF av området, eller en punktliste (GPX, CSV). [Bykartet](../town-plan/) er et utformet ark fra A4 til A1 med fast målestokk, ruter, tegnforklaring og gateindeks, foreløpig for steder i Tyskland.

### Utskriften har feil målestokk. {#massstab}

Skriv ut PDF-en i **Faktisk størrelse** eller **100 %**, ikke «Tilpass til side», på papirformatet du valgte i veiviseren. Kontroller deretter målestokklinjal med en linjal.

### Kan jeg skrive ut og dele planer for brannvesenet? {#drucken}

Ja. Dataene er lisensiert under Open Database License. «© OpenStreetMap contributors» må være synlig på alle planer. Eksport og bykart skriver ut krediteringen; ikke beskjær den.

## Bidra {#mitmachen}

### En hydrant mangler eller er feil. Hvem retter det? {#korrigieren}

Du kan gjøre det selv i OpenStreetMap med en gratis konto. [Legg til hydranter](../contribute/) viser Hydrantenjäger, StreetComplete, iD og JOSM.

### Vi er et brannvesen og vil registrere hydranter i området vårt. Hvordan gjør vi det? {#feuerwehr}

Gjerne som en øvelse eller byvandring i lag. Det finnes en tyskspråklig trinnvis veiledning for brannvesen i Tyskland: [Für Feuerwehren](/help/fire-brigades/). Andre steder viser [Legg til hydranter](../contribute/) verktøyene.

### Kan jeg kopiere hydrantplaner fra kommunen eller vannverket? {#plaene}

Bare med uttrykkelig tillatelse. Slike planer er opphavsrettslig beskyttet. Legg helst bare inn det du selv har sett på stedet.

### Kan jeg bruke brannvesenlag i mitt eget kart? {#overlay}

Ja, med overlay. Informasjon finnes på [overlay-siden](/overlay/).

## Prosjekt og juridisk {#projekt}

### Er dette et offisielt brannkart? {#offiziell}

Nei. OpenFireMap er et privat, ikke-kommersielt prosjekt basert på OpenStreetMap. Det samarbeider ikke offisielt med noen myndighet eller brannvesen.

### Hva koster OpenFireMap? {#kosten}

Ingenting. Ingen konto, annonser eller abonnement. Kildekoden ligger på [GitHub](https://github.com/FrnkMrz/OpenFireMapV2) under MIT-lisensen.

### Hvilke data om meg lagrer OpenFireMap? {#datenschutz}

Kartet kjører i nettleseren. Bare innstillinger som språk og hurtigbuffer, siste kartvisning, bykartinnstillinger og kartdata du har lastet inn, lagres der. Søk, kartfliser og data kontakter eksterne tjenester. Detaljer står i [personvernerklæringen](/datenschutz/#en).

### Hvordan får jeg kontakt med dere? {#kontakt}

Send e-post til [info@openfiremap.org](mailto:info@openfiremap.org). Du kan også melde feil og ønsker som en [GitHub-issue](https://github.com/FrnkMrz/OpenFireMapV2/issues).

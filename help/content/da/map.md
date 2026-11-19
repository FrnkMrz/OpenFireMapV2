---
title: Kortet på en computer
description: Søgning, placering, kortlag, brandhanedetaljer, deling og tastaturbetjening på en computer.
eyebrow: Kort
lead: Værktøjerne ligger øverst til venstre, og datadatoen står nederst til højre. Her kan du læse, hvad knapperne gør.
order: 1
---

## Overblik {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap på en computer.
:::

1. **Søgning:** find et sted eller en adresse.
2. **Min placering:** gå til din position.
3. **Kortlag:** skift baggrundskort.
4. **Eksport:** gem en brandhaneplan som PNG eller PDF eller punkter som GPX/CSV.
5. **Del:** kopiér et link til visningen.
6. **Brandhane:** peg på symbolet for detaljer, eller klik for en cirkel på 100 meter.
7. **Statusfelt:** zoomniveau og datadato.
8. **Info og jura:** hjælp, symboler og juridiske oplysninger.

## Find et sted {#suche}

Skriv et sted, en gade eller en adresse i søgefeltet, og tryk på <kbd>Enter</kbd> eller lupen. Kortet går til det første resultat og zoomer til niveau 16. Søgningen bruger Nominatim og finder steder og adresser, ikke enkelte brandhaner.

## Min placering {#standort}

Placeringsknappen viser, hvor du er, og zoomer til niveau 17. Første gang spørger browseren om tilladelse. Positionen bruges kun i browseren og gemmes ikke.

:::tip Ingen placering?
Kontrollér, at browseren tillader placering for openfiremap.org. En computer uden GPS kan kun vise en omtrentlig position.
:::

## Brandhaner og andre objekter {#objekte}

| Zoomniveau | Det vises |
|---|---|
| under 12 | ingen objekter |
| fra 12 | brandstationer |
| fra 14 | stationssymboler og kommunegrænser |
| fra 15 | brandhaner, vandforsyning og hjertestartere |
| fra 17 | symboler med bogstaver |
| fra 18 | detaljer ved pegebevægelse |

:::figure marker frame=plain
Et klik på en brandhane tegner en cirkel med 100 meters radius.
:::

Fra niveau 18 vises detaljer, når du peger på et symbol. Med tastatur kan du vælge symbolet med <kbd>Tab</kbd> fra niveau 17 og trykke <kbd>Enter</kbd>. Cirklen på 100 meter vises fra niveau 16; efter brug af **Min placering** vises også afstandslinjen. Detaljerne kommer fra OpenStreetMap, f.eks. type, diameter, nummer og ejer. [Bidrag](../contribute/) forklarer, hvordan du tilføjer manglende oplysninger.

Se [Lag og symboler](../layers/) for farver og symboler.

## Kortlag {#ebenen}

Kortknappen åbner baggrundskortene: standard, print, nat, satellit, topografisk, OSM og BayernAtlas. Brandvæsenets objekter vises ovenpå. Se [Lag og symboler](../layers/) for valg af baggrund.

## Deling og links {#teilen}

Delingsknappen kopierer et link til præcis den aktuelle visning. Linket gemmer sted, zoomniveau og baggrundskort. Adressen i browseren opdateres, mens du flytter kortet, og kan gemmes som bogmærke.

## Statusfelt og datadato {#status}

Nederst til højre vises zoomniveau og datadato. “+Sync” betyder, at nyere ændringer fra OpenStreetMap er indlæst. “Data status details” viser kilde og alder. Se [Data og aktualitet](../data/).

## Info, jura og indstillinger {#info}

“Info & Legal” åbner links til hjælp, kortsymboler, overlay, privatliv og licenser. Her indstilles også lokal cache: fra, 1 time, 1 dag, 3 dage, 7 dage (standard) eller 30 dage.

## Med tastatur {#tastatur}

- Første <kbd>Tab</kbd> fører til “Gå til kort”.
- Piletasterne flytter kortet; <kbd>+</kbd> og <kbd>−</kbd> ændrer zoom.
- Fra niveau 17 kan symboler vælges med <kbd>Tab</kbd>. <kbd>Enter</kbd> eller <kbd>Space</kbd> åbner detaljer; <kbd>Escape</kbd> lukker dem.
- Fokus bliver i åbne menuer og dialoger, indtil de lukkes.
- I eksporten vælger “Use visible area” den aktuelle visning uden at tegne et rektangel.

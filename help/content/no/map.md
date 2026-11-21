---
title: Kartet på en datamaskin
description: Søk, posisjon, kartlag, hydrantdetaljer, deling, statusboks og tastaturbruk i OpenFireMap på datamaskin.
eyebrow: Kart
lead: Alle verktøyene ligger øverst til venstre, datadatoen nederst til høyre. Her ser du hva knappene gjør og hva kartet viser.
order: 1
---

## Oversikt {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap på datamaskin: Nürnbergs gamleby på zoomnivå 17.
:::

1. **Søk:** finn et sted eller en adresse.
2. **Min posisjon:** gå til der du er.
3. **Kartlag:** bytt bakgrunnskart.
4. **Eksport:** hydrantplan som PNG eller PDF, punkter som GPX eller CSV.
5. **Del:** kopier en lenke til denne visningen.
6. **Hydrant:** hold pekeren over for detaljer, klikk for sirkelen på 100 meter.
7. **Statusboks:** zoomnivå og datadato.
8. **Info og juridisk:** hjelp, kartsymboler, juridisk merknad, personvern og innstillinger.

## Finn et sted {#suche}

Skriv et sted, en gate eller en adresse i søkefeltet øverst til venstre og trykk <kbd>Enter</kbd>, eller klikk på forstørrelsesglasset. Kartet går til det første treffet og zoomer til nivå 16, slik at hydrantene vises.

Søket bruker Nominatim, OpenStreetMaps søketjeneste. Den finner steder og adresser, ikke enkeltstående hydranter.

## Min posisjon {#standort}

Posisjonsknappen viser hvor du er og zoomer til nivå 17. Første gang spør nettleseren om OpenFireMap kan bruke posisjonen din. Den brukes bare i nettleseren og lagres ikke.

:::tip Finner du ikke posisjonen?
Sjekk at nettleseren tillater posisjon for openfiremap.org. På en datamaskin uten GPS kan plasseringen være flere hundre meter unøyaktig.
:::

## Hydranter og andre objekter {#objekte}

Hva som vises, avhenger av zoomnivået:

| Zoomnivå | Dette vises |
|---|---|
| under 12 | ingen objekter ennå |
| fra 12 | brannstasjoner |
| fra 14 | stasjonssymboler og kommunegrenser |
| fra 15 | hydranter, vannpunkter og hjertestartere som fargede prikker |
| fra 17 | alle objekter som symboler med bokstav |
| fra 18 | detaljer ved pekerføring |

:::figure marker frame=plain
Når du klikker på en hydrant, tegnes en sirkel med radius på 100 meter.
:::

**Se detaljer:** fra zoomnivå 18 vises detaljer når du holder musepekeren over et symbol. Med tastatur fungerer dette fra nivå 17: velg symbolet med <kbd>Tab</kbd> og trykk <kbd>Enter</kbd>.

**Radius og avstand:** fra nivå 16 viser et klikk på en hydrant en stiplet sirkel med radius på 100 meter. Den hjelper deg å vurdere hvilke hydranter som er innenfor slangelengde. Fra nivå 17 står det «100 m» i sirkelen. Hvis du først har brukt **Min posisjon**, tegner OpenFireMap også en blå linje til hydranten med avstanden fra nivå 17.

Detaljene viser informasjonen som er registrert i OpenStreetMap, for eksempel type, diameter, nummer, trykk, plassering eller operatør. Mangler noe, er det ikke lagt inn ennå. [Bidra](../contribute/) forklarer hvordan du legger det til.

Siden [Lag og symboler](../layers/) forklarer symbolene og fargene.

## Kartlag {#ebenen}

Knappen med kartikon åpner bakgrunnskartene: standard, utskrift, natt, satellitt, topografisk, to OSM-stiler og, i Bayern, BayernAtlas og flyfoto. Brannobjektene vises alltid øverst. [Lag og symboler](../layers/) forklarer hvilket bakgrunnskart som passer til hva.

## Deling og lenker {#teilen}

Delingsknappen kopierer en lenke til nøyaktig denne visningen. Alle som åpner lenken, ser samme sted, zoomnivå og bakgrunn.

Adressen i nettleseren endres når kartet flyttes. Formatet er `#zoom/latitude/longitude/background`, for eksempel `openfiremap.org/#17/49.45280/11.07700/voyager`. Du kan også bokmerke den.

## Statusboks og datadato {#status}

Nederst til høyre vises zoomnivået og datadatoen, for eksempel «Per: 1 dag siden». «+Sync» betyr at nyere endringer fra OpenStreetMap er lastet inn. «Detaljer om datastatus» viser kilden, datoen for grunndataene og status for direkte oppdatering. Mer under [Data og aktualitet](../data/).

## Info, juridisk og innstillinger {#info}

«Info og juridisk» nederst til venstre åpner lenker til denne hjelpen, kartsymbolene og overlay, samt juridisk merknad, personvern og lisenser. Her stiller du også inn **lokal hurtigbuffer**: av, 1 time, 1 dag, 3 dager, 7 dager (standard) eller 30 dager. Tidligere innlastede områder vises raskere.

## Med tastatur {#tastatur}

OpenFireMap kan brukes helt uten mus:

- Første <kbd>Tab</kbd> går til «Hopp til kart».
- På kartet flytter piltastene visningen; <kbd>+</kbd> og <kbd>−</kbd> zoomer.
- Fra nivå 17 kan du nå symbolene med <kbd>Tab</kbd>. <kbd>Enter</kbd> eller <kbd>Space</kbd> åpner detaljene, <kbd>Escape</kbd> lukker dem.
- I menyer og dialoger blir fokuset i dialogen; <kbd>Escape</kbd> lukker den.
- I eksporten velger «Bruk synlig område» gjeldende visning uten at du må dra et rektangel.

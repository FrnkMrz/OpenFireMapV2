---
title: Lag og symboler
description: Hvilket bakgrunnskart som passer til hva, hva som vises på hvert zoomnivå og hva fargene og bokstavene i symbolene betyr.
eyebrow: Lag og symboler
lead: Under brannobjektene ligger et bakgrunnskart du velger. Symbolene oppå følger faste farger og bokstaver.
order: 3
---

## Bakgrunnskart {#hintergrund}

:::figure layers frame=plain
Menyen «Kartlag» på en datamaskin.
:::

| Bakgrunn | Passer til |
|---|---|
| **Standard (Voyager)** | daglig bruk: tydelige gater, husnumre fra zoomnivå 17 |
| **Utskrift (Light)** | utskrift og eksport: lys bakgrunn, tydelige symboler |
| **Natt (Dark)** | om natten og i kjøretøy, mindre blending |
| **Satellitt (Esri)** | orientering på stedet: bygninger, innkjørsler, vegetasjon |
| **Topografisk (OSM)** | terreng med høydekurver, stier og vann utenfor byer |
| **OSM (Intl)** | den kjente OpenStreetMap-stilen |
| **OSM (DE Style)** | OpenStreetMap i tysk stil |
| **Bavaria Base** | offisielt kart fra Bayerns oppmålingsmyndighet, bare Bayern |
| **Bavaria Aerial** | offisielle flyfoto, bare Bayern |

Valgt bakgrunn beholdes i delingslenker og brukes også for [eksporten](../export/).

:::tip Finn husnumre
På zoomnivå 17 og 18 viser Standard og OSM husnumre. Da er det enkelt å knytte en hydrant til en adresse.
:::

## Zoomnivåer {#zoom}

OpenFireMap laster bare inn det som er relevant for visningen. Zoomnivået vises i statusboksen.

| Zoomnivå | Dette vises |
|---|---|
| under 12 | ingen objekter ennå (status «Standby») |
| 12–13 | brannstasjoner som prikker |
| fra 14 | stasjonssymboler og kommunegrenser |
| 15–16 | hydranter, vannpunkter og hjertestartere som fargede prikker |
| fra 16 | sirkel på 100 meter når du trykker på en hydrant |
| fra 17 | symboler med bokstaver, tilgjengelige med tastatur |
| 18 | detaljer ved pekerføring |

## Farger og symboler {#symbole}

Fargen viser hva slags objekt det er, bokstaven i symbolet viser typen:

- **Rød:** hydranter. **U** står for underjordisk hydrant, **O** for søylehydrant, **Ø** for tørrhydrant. Vegghydranter og andre typer har egne tegn.
- **Blå:** vannpunkter, som brannvannsdammer, sisterner, brannvannsbrønner eller sugepunkter.
- **Grønn:** hjertestartere (AED).
- **Brannstasjoner** har eget bygningssymbol.

Fra nivå 17 grupperes objekter som ligger innenfor 5 meter, og antallet vises.

Siden **[Kartsymboler](/symbols/)** viser alle symboler med OpenStreetMap-taggene. Den er også nyttig for kartleggere som vil vite hvordan et symbol oppstår.

:::note Hvor kommer detaljene fra?
Type, diameter, nummer og alt annet kommer fra OpenStreetMap. Hvis type mangler for en hydrant, vises en rød prikk uten bokstav. [Bidra](../contribute/) forklarer hvordan du legger det til.
:::

---
title: Tasot ja symbolit
description: Mikä taustakartta sopii mihinkin käyttöön, mitä eri zoomaustasoilla näkyy ja mitä symbolien värit ja kirjaimet tarkoittavat.
eyebrow: Tasot ja symbolit
lead: Pelastustoimen kohteiden alla on valitsemasi taustakartta. Päällä olevat symbolit noudattavat vakioituja värejä ja kirjaimia.
order: 3
---

## Taustakartat {#hintergrund}

:::figure layers frame=plain
Tietokoneen ”Karttatasot”-valikko.
:::

| Tausta | Käyttö |
|---|---|
| **Vakio (Voyager)** | päivittäiseen käyttöön: selkeät kadut, talonumerot zoomaustasolta 17 |
| **Tulostus (Light)** | tulostukseen ja vientiin: vaalea tausta korostaa symboleja |
| **Yö (Dark)** | yöllä ja ajoneuvossa, vähemmän häikäisyä |
| **Satelliitti (Esri)** | maastossa suunnistamiseen: rakennukset, ajotiet ja kasvillisuus |
| **Topografinen (OSM)** | korkeuskäyrät, polut ja vesistöt taajamien ulkopuolella |
| **OSM (Intl)** | tuttu OpenStreetMap-tyyli |
| **OSM (DE Style)** | OpenStreetMap saksalaistyylisellä kartalla |
| **Bayern Base** | Baijerin maanmittausviranomaisen virallinen kartta, vain Baijerissa |
| **Bayern Aerial** | viralliset ilmakuvat, vain Baijerissa |

Valittu tausta säilyy linkkiä jaettaessa, ja sitä käytetään myös [viennissä](../export/).

:::tip Talonumeroiden löytäminen
Zoomaustasoilla 17 ja 18 Vakio- ja OSM-kartat näyttävät talonumerot. Näin voit yhdistää palopostin osoitteeseen.
:::

## Zoomaustasot {#zoom}

OpenFireMap lataa vain nykyisen näkymän kannalta tarpeelliset kohteet. Zoomaustaso näkyy tilaruudussa.

| Zoomaustaso | Näkyvät kohteet |
|---|---|
| alle 12 | ei kohteita vielä (tila ”Valmiustila”) |
| 12–13 | paloasemat pisteinä |
| tasolta 14 | asemien symbolit ja kuntarajat |
| 15–16 | palopostit, vedenottopaikat ja defibrillaattorit värillisinä pisteinä |
| tasolta 16 | 100 metrin ympyrä palopostia napautettaessa |
| tasolta 17 | kirjainsymbolit, joihin pääsee näppäimistöllä |
| 18 | tiedot osoitettaessa |

## Värit ja symbolit {#symbole}

Väri kertoo kohteen ryhmän, symbolin kirjain sen tyypin:

- **Punainen:** palopostit. **U** tarkoittaa maanalaista, **O** pylväsmallista ja **Ø** kuivapalopostia. Seinäpaloposteilla ja muilla tyypeillä on omat merkkinsä.
- **Sininen:** vedenottopaikat, kuten palolammet, vesisäiliöt, palovesikaivot tai imupaikat.
- **Vihreä:** defibrillaattorit (AED).
- **Paloasemilla** on oma rakennussymboli.

Zoomaustasolta 17 kartta ryhmittelee alle viiden metrin etäisyydellä toisistaan olevat kohteet ja näyttää niiden lukumäärän.

Sivulla **[Karttasymbolit](/symbols/)** luetellaan kaikki symbolit ja niiden OpenStreetMap-tunnisteet. Siitä on hyötyä myös kartoittajille, jotka haluavat ymmärtää symbolin muodostumisen.

:::note Mistä tiedot tulevat?
Tyyppi, halkaisija, numero ja muut tiedot ovat OpenStreetMapista. Jos palopostin tyyppiä ei ole merkitty, kartalla näkyy punainen piste ilman kirjainta. [Osallistu](../contribute/) kertoo, miten tiedon voi lisätä.
:::

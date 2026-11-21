---
title: Vienti
description: Vie palopostikartta PNG- tai PDF-muodossa ja palopostit GPX- tai CSV-muodossa. Valitse alue, muoto ja tarkkuus sekä huomioi rajat.
eyebrow: Vienti
lead: Muutamalla napsautuksella karttanäkymästä syntyy tulostettava palopostikartta tai pisteiden luettelo navigaattoreihin ja taulukkolaskentaan.
order: 5
---

## Mihin eri muodot sopivat? {#formate}

| Muoto | Tulos | Käyttö |
|---|---|---|
| **PNG** | kuva alueesta, otsikko, mittakaavajana, päiväys ja lähdemerkintä | ilmoitustaulut, sähköposti ja esitykset |
| **PDF** | sama kartta PDF-tiedostona | tulostus ja arkistointi |
| **GPX** | palopostit ja muut kohteet reittipisteinä | navigaattorit, pelastustoimen ja ulkoilusovellukset |
| **CSV** | taulukko, jossa kunkin kohteen tiedot | taulukkolaskenta, analyysi ja vertailu omiin luetteloihin |

Vienti on käytettävissä vain tietokoneella. Suunniteltua karttaa, jossa on ruudukko, katuosoitehakemisto ja vakioitu mittakaava, varten käytä [kaupunkikarttaa](../town-plan/).

## Vaihe vaiheelta {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Vientivalikko.
:::

:::steps
1. **Avaa vientivalikko:** napsauta alanuolipainiketta vasemmassa yläkulmassa karttatasojen vieressä.
2. **Valitse kuvasuhde (1):** **Vapaa** sopii mille tahansa alueelle, **A4 vaaka** tai **A4 pysty** A4-arkin mittasuhteille.
3. **Valitse alue:** **Valitse alue kartalta (2)** antaa vetää suorakulmion. **Käytä näkyvää aluetta (3)** ottaa nykyisen näkymän (valitussa A4-muodossa A4:n mittasuhteilla). Jos et valitse aluetta, vientiin tulee näkyvä näkymä.
4. **Valitse tarkkuus (4):** zoomaustasot 15–18. Suurempi taso näyttää enemmän yksityiskohtia ja tekee suuremman tiedoston. Kadulle sopii 18, koko kaupungille 16.
5. **Valitse muoto:** palopostikartta **PNG (5)**- tai **PDF**-muodossa, palopostit **GPX (6)**- tai **CSV**-muodossa.
6. **Tarkista otsikko:** OpenFireMap ehdottaa paikannimeen perustuvaa otsikkoa. Muuta sitä tarvittaessa ja napsauta **Luo**.
:::

:::figure title frame=plain
Otsikkoa ehdotetaan automaattisesti, ja sitä voi muuttaa ennen kartan luomista.
:::

Luonnin aikana edistymisikkuna näyttää käsittelyn vaiheet. **Peruuta** pysäyttää viennin milloin tahansa.

## Kartan sisältö {#plan}

PNG- ja PDF-tiedostoissa ovat valittu alue, nykyinen [taustakartta](../layers/), pelastustoimen kohteet, kuntarajat, otsikko, mittakaavajana, päiväys, tarkkuustaso sekä ”© OpenStreetMap contributors” -lähdemerkintä.

Tiedostonimi sisältää päiväyksen, kellonajan, tarkkuustason ja otsikon, esimerkiksi `2026-11-19_14-30_Z18_Nuremberg.png`.

:::tip Selkeä kartta
Valitse **Tulostus (Light)** -tausta ennen vientiä. Symbolit erottuvat silloin parhaiten ja tulostamiseen kuluu vähemmän mustetta. **Topografinen** yltää tarkkuustasolle 17.
:::

## GPX ja CSV {#gpx-csv}

**GPX** sisältää jokaisen kohteen reittipisteenä nimineen ja tärkeine tietoineen. Tiedoston voi avata navigaattorissa, pelastustoimen tai ulkoilusovelluksessa sekä esimerkiksi OsmAndissa ja Garmin BaseCampissa.

**CSV** on puolipisteillä erotettu taulukko. Jokainen rivi on kohde ja sisältää tyypin, alatyypin, nimen, viitteen, koordinaatit, halkaisijan, paineen, virtaaman, osoitteen, ylläpitäjän, OSM-tunnuksen, OpenStreetMap-linkin, tietolähteen ja lisenssin. Sarakeotsikot ovat saksaksi. Excel, LibreOffice ja Numbers avaavat tiedoston suoraan.

## Rajat {#grenzen}

- **Enintään 10 × 10 kilometriä.** Suurempi alue kuormittaisi selainta. Jos piirrät liian suuren rajauksen, OpenFireMap pienentää sen ja ilmoittaa siitä.
- **Alle zoomaustason 15** kartta ei vielä näytä paloposteja. Vienti lataa tiedot silloin erikseen, mikä kestää hieman kauemmin.
- **Vain tietokoneella.** Vientivalikko ei ole käytettävissä puhelimessa.
- Jos alueella ei ole kohteita, näet viestin ”Valitulla alueella ei ole kohteita!”.

:::note Lähdemerkintä
Tietoihin sovelletaan Open Database License -lisenssiä. Jos jaat tai näytät kartan, ”© OpenStreetMap contributors” -merkinnän on jäätävä näkyviin. Älä siis rajaa sitä pois.
:::

---
title: Kartta tietokoneella
description: Haku, sijainti, karttatasot, palopostien tiedot, jakaminen, tilaruutu ja näppäimistön käyttö tietokoneella.
eyebrow: Kartta
lead: Työkalut ovat vasemmassa yläkulmassa ja tietojen päiväys oikeassa alakulmassa. Tässä kerrotaan painikkeista ja kartan sisällöstä.
order: 1
---

## Yleiskuva {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap tietokoneella: Nürnbergin vanhakaupunki zoomaustasolla 17.
:::

1. **Haku:** etsi paikka tai osoite.
2. **Oma sijainti:** siirry sijaintiisi.
3. **Karttatasot:** vaihda taustakarttaa.
4. **Vienti:** palopostikartta PNG- tai PDF-muodossa, pisteet GPX- tai CSV-muodossa.
5. **Jaa:** kopioi linkki tähän näkymään.
6. **Paloposti:** osoita hiirellä nähdäksesi tiedot tai napsauta näyttääksesi 100 metrin ympyrän.
7. **Tilaruutu:** zoomaustaso ja tietojen päiväys.
8. **Tiedot ja oikeudelliset tiedot:** ohje, karttasymbolit, oikeudellinen ilmoitus, tietosuoja ja asetukset.

## Paikan etsiminen {#suche}

Kirjoita paikka, katu tai osoite vasemman yläkulman hakukenttään ja paina <kbd>Enter</kbd> tai napsauta suurennuslasia. Kartta siirtyy ensimmäiseen tulokseen ja zoomaustasolle 16, jolla palopostit näkyvät.

Haku käyttää Nominatim-palvelua, OpenStreetMapin hakupalvelua. Se löytää paikkoja ja osoitteita, ei yksittäisiä paloposteja.

## Oma sijainti {#standort}

Sijaintipainike näyttää sijaintisi ja siirtyy zoomaustasolle 17. Ensimmäisellä kerralla selain kysyy, saako OpenFireMap käyttää sijaintiasi. Sijaintia käytetään vain selaimessasi eikä sitä tallenneta.

:::tip Sijainti ei löydy?
Tarkista, että selaimella on lupa käyttää openfiremap.org-sivuston sijaintia. GPS:ää vailla olevalla tietokoneella sijainti voi olla vain muutaman sadan metrin tarkkuudella.
:::

## Palopostit ja muut kohteet {#objekte}

Näkyvät kohteet riippuvat zoomaustasosta:

| Zoomaustaso | Näkyvät kohteet |
|---|---|
| alle 12 | ei kohteita vielä |
| tasolta 12 | paloasemat |
| tasolta 14 | asemien symbolit ja kuntarajat |
| tasolta 15 | palopostit, vedenottopaikat ja defibrillaattorit värillisinä pisteinä |
| tasolta 17 | kaikkien kohteiden kirjainsymbolit |
| tasolta 18 | tiedot osoitettaessa |

:::figure marker frame=plain
Palopostin napsautus piirtää 100 metrin säteisen ympyrän.
:::

**Tietojen katsominen:** zoomaustasolta 18 näet tiedot viemällä hiiren symbolin päälle. Näppäimistöllä tämä toimii jo tasolta 17: siirry symboliin <kbd>Tab</kbd>-näppäimellä ja avaa tiedot painamalla <kbd>Enter</kbd>.

**Säde ja etäisyys:** zoomaustasolta 16 palopostin napsautus näyttää katkoviivaympyrän, jonka säde on 100 metriä. Se auttaa arvioimaan, mitkä palopostit ovat letkun ulottuvilla. Tasolla 17 ympyrässä lukee ”100 m”. Jos olet ensin käyttänyt toimintoa **Oma sijainti**, OpenFireMap näyttää tasolta 17 myös sinisen etäisyysviivan palopostille.

Tiedoissa näkyvät OpenStreetMapiin tallennetut tiedot, kuten tyyppi, halkaisija, numero, paine, sijainti tai ylläpitäjä. Jos jokin tieto puuttuu, sitä ei ole vielä lisätty. [Osallistu](../contribute/) kertoo, miten voit lisätä sen.

Sivulla [Tasot ja symbolit](../layers/) selitetään symbolit ja värit.

## Karttatasot {#ebenen}

Karttakuvakkeella avaat taustakarttojen valinnan: vakio, tulostus, yö, satelliitti, topografinen, kaksi OSM-tyyliä sekä Baijerissa BayernAtlas ja ilmakuvat. Pelastustoimen kohteet näkyvät aina päällimmäisinä. [Tasot ja symbolit](../layers/) kertoo, mikä tausta sopii mihinkin käyttöön.

## Jakaminen ja linkit {#teilen}

Jakamispainike kopioi leikepöydälle linkin juuri tähän näkymään. Linkin avaaja näkee saman paikan, zoomaustason ja taustakartan.

Selaimen osoite muuttuu karttaa siirtäessä. Sen muoto on `#zoom/latitude/longitude/background`, esimerkiksi `openfiremap.org/#17/49.45280/11.07700/voyager`. Voit myös lisätä osoitteen kirjanmerkkeihin.

## Tilaruutu ja tietojen päiväys {#status}

Oikeassa alakulmassa näkyvät zoomaustaso ja tietojen päiväys, esimerkiksi ”Tiedot: 1 pv sitten”. ”+Sync” tarkoittaa, että OpenStreetMapin uudempia muutoksia on jo ladattu. ”Tietojen tilan lisätiedot” näyttää lähteen, perustietojen päiväyksen ja reaaliaikaisen päivityksen tilan. Lue lisää kohdasta [Tiedot ja ajantasaisuus](../data/).

## Tiedot, oikeudelliset tiedot ja asetukset {#info}

Vasemman alakulman ”Tiedot ja oikeudelliset tiedot” avaa ikkunan, jossa on linkit tähän ohjeeseen, karttasymboleihin ja peittotasoon sekä oikeudellinen ilmoitus, tietosuoja ja lisenssit. Siellä voit myös säätää **paikallisen välimuistin** kestoa: pois, 1 tunti, 1 päivä, 3 päivää, 7 päivää (oletus) tai 30 päivää. Aiemmin ladatut alueet avautuvat nopeammin.

## Näppäimistöllä {#tastatur}

OpenFireMapia voi käyttää kokonaan ilman hiirtä:

- Ensimmäinen <kbd>Tab</kbd> siirtyy kohtaan ”Siirry karttaan”.
- Kartalla nuolinäppäimet siirtävät näkymää, <kbd>+</kbd> ja <kbd>−</kbd> muuttavat zoomausta.
- Zoomaustasolta 17 symboleihin pääsee <kbd>Tab</kbd>-näppäimellä. <kbd>Enter</kbd> tai <kbd>Space</kbd> avaa tiedot, <kbd>Escape</kbd> sulkee ne.
- Valikoissa ja ikkunoissa kohdistus pysyy ikkunan sisällä; <kbd>Escape</kbd> sulkee sen.
- Viennissä ”Käytä näkyvää aluetta” valitsee nykyisen näkymän ilman rajauksen vetämistä.

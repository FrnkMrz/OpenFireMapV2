---
title: Tiedot ja ajantasaisuus
description: Mistä OpenFireMapin tiedot tulevat, kuinka ajantasaisia ne ovat, mitä tietojen tilan ikkuna näyttää ja miten paikallinen välimuisti toimii.
eyebrow: Tiedot
lead: Kaikki pelastustoimen kohteet tulevat OpenStreetMapista. OpenFireMap valmistelee ne nopeaa latausta varten ja hakee uusia kohteita reaaliaikaisesti.
order: 4
---

## Tietojen lähde {#quelle}

Palopostit, vedenottopaikat, paloasemat ja defibrillaattorit lisää OpenStreetMap-yhteisö, usein paikalliset pelastajat. OpenFireMap näyttää tiedot mutta ei muuta niitä.

## Näin OpenFireMap lataa palopostit {#ladeweg}

Alueesta riippuen kartta käyttää yhtä kahdesta tavasta:

- **Valmiit karttatiilet:** Saksasta, Itävallasta, Sveitsistä, Liechtensteinista, Luxemburgista ja 40 muusta Euroopan maasta OpenFireMap muodostaa valmiiksi tietotiilet OpenStreetMapin maapoiminnoista (Geofabrik). Ne sijaitsevat Cloudflaressa ja toimitetaan sen välimuistin kautta. Selain hakee vain näkymän tarvitsemat tiilet.
- **Overpass-rajapinta:** muualla OpenFireMap kysyy tiedot suoraan julkiselta Overpass-palvelimelta näkyvälle alueelle ja sen ympäristölle.

:::note Miksi kartta on nopeampi Saksassa ja Euroopassa?
Overpass ei vastaa siellä nopeammin. Näissä maissa palopostit luetaan valmiista tiilistä, joten Overpassilta kysytään vain muutokset perustietojen päiväyksen jälkeen. Se on paljon pienempi kysely.
:::

### Mikä Overpass-rajapinta on? {#overpass}

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) on julkinen palvelu, joka hakee OpenStreetMapin kohteita tyypin ja alueen perusteella, esimerkiksi ”kaikki palopostit tässä suorakulmiossa”. Palvelimia ylläpitävät vapaaehtoiset ja organisaatiot, ja niitä käyttää moni sovellus.

Vastausnopeuteen vaikuttavat:

- OpenFireMapin käyttämän palvelimen **kuormitus**,
- alueen **koko** ja kyselyn kesto,
- **jonotus ja hylkäykset**, jos palvelin on ylikuormittunut tai rajoittaa pyyntöjä.

OpenFireMap tuntee neljä Overpass-palvelinta ja kokeilee niitä satunnaisessa järjestyksessä. Jos palvelin ei vastaa tai ilmoittaa ylikuormituksesta, kartta pitää siinä hetken tauon ja siirtyy seuraavaan. Ladatut alueet säilyvät selaimen paikallisessa välimuistissa.

## Tietojen ajantasaisuus {#aktualitaet}

| Alue | Perustiedot | Uudet ja muuttuneet kohteet |
|---|---|---|
| Saksa, Itävalta, Sveitsi, Liechtenstein, Luxemburg | valmiit tiilet, tavallisesti päivittäin | haetaan Overpassista |
| 40 muuta Euroopan maata | valmiit tiilet, tavallisesti viikoittain | haetaan Overpassista, kun perustiedot ovat enintään 10 päivää vanhoja |
| muu maailma | Overpass-palvelimen tiedot | jokaisen kyselyn yhteydessä |

Kun tiilet on ladattu, OpenFireMap hakee taustalla kaikki näkymän kohteet, jotka ovat muuttuneet perustietojen päiväyksen jälkeen, ja lisää ne kartalle.

### Miksi uusi kohde ei näy heti? {#verzoegerung}

OpenStreetMap-muutos ei näy OpenFireMapissa välittömästi:

- **Käsittely:** Overpass-palvelimen täytyy ensin vastaanottaa muutos. Jos palvelin ilmoittaa liian vanhoja tietoja, OpenFireMap hylkää vastauksen ja näyttää perustiedot.
- **Välimuistit:** kartta säilyttää kyselyn tulosta muutaman minuutin alueittain; ladatut alueet tallentuvat myös paikalliseen välimuistiin.
- **Katkokset:** jos Overpass on ylikuormittunut tai tavoittamattomissa, perustiedot säilyvät, kunnes myöhempi kysely onnistuu. OpenFireMap ei voi vaikuttaa tähän.

Siksi tarkkaa aikaa ei voi luvata. Jos kohde ei vielä näy, lataa kartta myöhemmin uudelleen.

:::note Poistetut kohteet
Päivitys löytää vain uudet ja muuttuneet kohteet. OpenStreetMapista poistettu paloposti katoaa vasta valmiiden tiilien seuraavan perustietopäivityksen yhteydessä.
:::

## ”Tietojen tila ja lähde” -ikkuna {#popover}

:::figure data frame=plain
Tietojen tila ja lähde: tässä perustiedot ovat eiliseltä, eikä reaaliaikaiseen päivitykseen saatu yhteyttä.
:::

Avaa ikkuna tietokoneella tilaruudun kohdasta ”Tietojen tilan lisätiedot” tai puhelimella napauttamalla tilaruutua.

- **Lähde:** valmiit tiilet (DACHLiLu tai Eurooppa), reaaliaikainen kysely tai paikallinen välimuisti.
- **Perustietojen päiväys:** milloin maapoiminta luotiin. Jos näkymässä on useita maita, näytetään vanhin päiväys.
- **Reaaliaikainen päivitys:** onko uudempia muutoksia ladattu. ”Ei käytettävissä” tarkoittaa, ettei palveluun saatu yhteyttä ja näytössä ovat perustiedot. Nuolipainikkeella voit yrittää uudelleen.

Tilaruudussa sama tieto näkyy lyhyesti, esimerkiksi ”Tiedot: 1 pv sitten +Sync”.

## Tilasivu {#statusseite}

[Tilasivulla](/status/) näet maittain OpenStreetMap-tietojen iän, kartan viimeisimmän päivityksen sekä palopostien, paloasemien ja defibrillaattorien määrän asukasta kohti. Sivu on saatavilla saksaksi ja englanniksi.

## Paikallinen välimuisti {#cache}

OpenFireMap tallentaa ladatut tiedot selaimeesi, jotta aiemmin katsomasi alueet avautuvat nopeammin. Valitse ”Tiedot ja oikeudelliset tiedot” -kohdan **Paikallinen välimuisti**: pois, 1 tunti, 1 päivä, 3 päivää, 7 päivää (oletus) tai 30 päivää.

Tiedot pysyvät laitteellasi. Välimuisti ei korvaa päivityksiä: alueen tiedot tarkistetaan ajantasaisista tiedoista, kun avaat sen.

## Ilman verkkoyhteyttä {#offline}

OpenFireMap ei ole offline-kartta. Välimuistissa olevat alueet näkyvät jonkin aikaa, mutta uudet alueet ja haku vaativat verkkoyhteyden. Verkon ulkopuolella tulostettu [kaupunkikartta](../town-plan/) tai [vienti](../export/) on parempi vaihtoehto.

## Kun lataus kestää {#laden}

Valmiiden maiden ulkopuolella tiedot haetaan Overpassista. Jos palvelin on varattu, OpenFireMap kokeilee automaattisesti seuraavaa; alareunan viesti kertoo, mitä tapahtuu. Jos tämä ei auta, lähennä karttaa kyselyn pienentämiseksi ja yritä hetken kuluttua uudelleen. Jos kaikki palvelimet ovat ylikuormittuneita, pullonkaula on Overpass. Silloin voit vain ladata myöhemmin uudelleen.

:::warn Ei operatiiviseen käyttöön
Tietojen laatu riippuu OpenStreetMapiin tehdyistä merkinnöistä. Tiedot voivat olla puutteellisia, vanhentuneita tai vääriä, eivätkä ne korvaa hätäkeskuksen tai vesihuoltolaitoksen tietoja. Hätätilanteessa soita aina hätänumeroon (Euroopassa 112).
:::

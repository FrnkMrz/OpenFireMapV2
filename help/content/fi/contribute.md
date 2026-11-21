---
title: Lisää paloposteja
description: Näin lisäät paloposteja, vedenottopaikkoja ja defibrillaattoreita OpenStreetMapiin Hydrantenjägerillä, StreetCompletella, Every Doorilla, iD-editorilla tai JOSMillä.
eyebrow: Osallistu
lead: Jokaisen kartan palopostin on lisännyt joku. Jos yksi puuttuu, voit lisätä sen itse. Tarvitset vain maksuttoman OpenStreetMap-tilin.
order: 7
---

## Ennen aloittamista {#vorher}

OpenFireMap näyttää [OpenStreetMapin](https://www.openstreetmap.org/) (OSM) tietoja. Et siis muokkaa OpenFireMapia vaan OpenStreetMapia. Tarvitset tilin:

:::steps
1. Valitse [openstreetmap.org](https://www.openstreetmap.org/user/new)-sivulla **Sign Up**.
2. Valitse käyttäjänimi, sähköpostiosoite ja salasana ja vahvista sähköposti.
3. Kirjaudu samalla tilillä alla oleviin työkaluihin.
:::

:::warn Kolme sääntöä
- **Lisää vain paikan päällä itse näkemäsi tiedot.** Tarkista sijainti ja tyyppi palopostin luona.
- **Älä kopioi muiden karttojen tietoja.** Vesihuoltolaitosten ja kuntien palopostikartat ovat tekijänoikeuden suojaamia. Käytä niitä vain nimenomaisella luvalla.
- **Kuvaile tallennuksen yhteydessä lyhyesti muutoksesi**, esimerkiksi ”Lisäsin palopostit Main Streetille”.
:::

Saksalaiset pelastuslaitokset voivat käyttää ohjetta oman toiminta-alueensa palopostien tarkistamiseen harjoitusillassa tai kaupunkikävelyllä. Ohje on vain saksaksi: [Für Feuerwehren](/help/fire-brigades/).

## Mikä työkalu sopii sinulle? {#werkzeug}

| Tilanne | Työkalu | Miksi |
|---|---|---|
| olet puhelimella paikan päällä ja haluat lisätä palopostin nopeasti | **Hydrantenjäger** | suunniteltu paloposteille, kohdistaa pisteen kompassilla, vähän kenttiä |
| liikut ja haluat lisätä kohteita matkalla | **StreetComplete** tai **Every Door** | vastaa lähellä olevia kohteita koskeviin kysymyksiin |
| käytät tietokonetta ja muokkaat yksittäisiä paikkoja | **iD-editori** | toimii selaimessa openstreetmap.orgissa, ei asennusta |
| olet kokenut ja muokkaat useita paloposteja | **JOSM** (tietokone) tai **Vespucci** (Android) | kaikkien tunnisteiden kattava hallinta |

## Hydrantenjägerillä {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) on puhelimen verkkosovellus, joka on tehty juuri tähän:

:::steps
1. Kirjaudu OpenStreetMap-tililläsi.
2. Asetu noin kolmen metrin päähän palopostista ja osoita sitä puhelimellasi. Sovellus sijoittaa pisteen GPS:n ja kompassin avulla.
3. Valitse tyyppi ja sijainti. Lisää halkaisija ja numero vain, jos olet niistä varma.
4. Lataa tiedot. Valmista.
:::

Yksityiskohtainen opas palopostityyppeineen on [Hydrantenjägerin ohjesivulla](https://hydrantenjaeger.de/help/).

## StreetComplete tai Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) kysyy lähistön kohteista, esimerkiksi ”Millainen paloposti tämä on?”. Vastaa napauttamalla. Sovellus sopii etenkin olemassa olevien kohteiden puuttuvien tietojen täydentämiseen.
- **[Every Door](https://every-door.app/)** (Android, iOS) on tehty pisteiden lisäämiseen. Napauta pluspainiketta, sijoita uusi piste, valitse ”Fire Hydrant” ja täytä kentät.

## iD-editorilla selaimessa {#id}

iD-editori on openstreetmap.org-sivuston oletuseditori.

:::steps
1. Avaa [openstreetmap.org](https://www.openstreetmap.org/), kirjaudu sisään ja zoomaa palopostin kohdalle.
2. Napsauta yläreunan **Edit**-painiketta. Ensimmäisellä kerralla lyhyt opastus esittelee editorin.
3. Napsauta ylhäällä **Point** ja aseta piste tarkasti palopostin kohdalle. Ilmakuva auttaa paikantamaan sen.
4. Kirjoita vasemman reunan hakukenttään ”hydrant” ja valitse **Fire Hydrant** -esimääritys.
5. Täytä kentät: **Type** (maanalainen, pylväs, seinä, putki), **Position** (esimerkiksi jalkakäytävä tai ajorata), **Diameter** ja **Reference**, jos tiedät ne.
6. Napsauta oikean yläkulman **Save**, kirjoita lyhyt kommentti ja valitse **Upload**.
:::

:::tip Olemassa olevan palopostin korjaaminen
Napsauta palopostia, muuta vasemman reunan tietoja ja tallenna samalla tavalla. Väärässä paikassa olevan kohteen voi vetää oikeaan kohtaan. Poista kohde vain, jos tiedät paikan päällä varmasti, ettei sitä enää ole.
:::

## JOSM tai Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) on tietokoneen Java-editori ja [Vespucci](https://vespucci.io/) sen vastine Androidille. Molemmat näyttävät kaikki tunnisteet ja sopivat laajempiin töihin, esimerkiksi kun pelastuslaitos päivittää alueensa palopostit maastokäynnin jälkeen. Tunnisteet luetellaan alla.

## Tärkeimmät tunnisteet {#tags}

OpenStreetMap kuvaa kohteet tunnisteilla muodossa `avain=arvo`. Sovellusten esiasetukset lisäävät ne puolestasi. Jos syötät ne itse, käytä näitä:

| Kohde | Tunniste | Merkitys |
|---|---|---|
| Paloposti | `emergency=fire_hydrant` | pakollinen kaikille paloposteille |
| | `fire_hydrant:type=underground` | maanalainen (myös `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | nimelliskoko (DN), kuten kilvessä |
| | `fire_hydrant:position=sidewalk` | sijainti (myös `lane`, `parking_lot`, `green`) |
| | `ref=123` | palopostin numero, jos sellainen on |
| | `fire_hydrant:pressure=4` | paine baareina, vain jos tiedossa |
| Imupaikka | `emergency=suction_point` | paikka veden ottamiseen vesistöstä |
| Vesisäiliö | `emergency=water_tank` | vesisäiliö tai sammutusvesisäiliö |
| Palolampi | `emergency=fire_water_pond` | sammutusveden lähteenä käytettävä lampi |
| Defibrillaattori | `emergency=defibrillator` | lisäksi `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Paloasema | `amenity=fire_station` | pelastuslaitoksen rakennus tai alue |

[Karttasymbolit](/symbols/) näyttää, miten tunnisteet näkyvät OpenFireMapissa. [OpenStreetMap-wiki](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant) kuvaa niitä tarkemmin.

## Milloin muutos näkyy? {#anzeige}

Latauksen jälkeen paloposti tallentuu heti OpenStreetMapiin. Se näkyy OpenFireMapissa, kun kartan käyttämät palvelut ovat käsitelleet muutoksen. Tämä tapahtuu usein nopeasti, mutta tarkkaa aikaa ei voi luvata. [Tiedot ja ajantasaisuus](../data/#verzoegerung) kertoo viiveen syistä.

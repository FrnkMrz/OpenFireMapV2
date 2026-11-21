---
title: Esteettömyys
description: OpenFireMapin käyttö näppäimistöllä, ruudunlukuohjelmalla, suurennettuna ja vähennetyllä liikkeellä: mikä toimii ja mitä ei ole vielä testattu.
eyebrow: Esteettömyys
lead: OpenFireMapin tulisi toimia kaikille, myös ilman hiirtä, ruudunlukuohjelmalla tai voimakkaasti suurennettuna. Tässä kerrotaan käyttökeinoista ja jäljellä olevista puutteista.
order: 9
---

## Tavoitteemme {#ziel}

Kartta noudattaa **WCAG 2.2 AA -tason** ohjeita. Jokainen OpenFireMap-muutos käy läpi automaattiset tarkistukset: näppäimistökäyttö, ruudunlukuohjelmien nimet, värikontrasti, näyttö 400 %:n suurennuksella ja ohjainten vähimmäiskoko. Myös tämä ohje ja karttasymbolit tarkistetaan samalla tavalla.

:::note Rehellinen tilanne
Automaattiset tarkistukset eivät löydä kaikkea. Oikealla laitteella tehtävä ruudunlukuohjelmatesti on vielä tekemättä. Kerro meille, jos huomaat ongelman (yhteystiedot alla). Kaikki palaute auttaa.
:::

## Näppäimistöllä {#tastatur}

Kaikki hiirellä tehtävät toiminnot onnistuvat myös näppäimistöllä:

| Näppäin | Toiminto |
|---|---|
| <kbd>Tab</kbd> | siirtyy seuraavaan ohjaimeen; ensimmäisenä kohtaan ”Siirry karttaan” |
| Nuolinäppäimet | siirtävät karttaa, kun kartta on kohdistettuna |
| <kbd>+</kbd> ja <kbd>−</kbd> | lähentävät ja loitontavat |
| <kbd>Tab</kbd> zoomaustasolta 17 | siirtyy kartan symbolista toiseen |
| <kbd>Enter</kbd> tai <kbd>Space</kbd> symbolissa | avaa tiedot; palopostista myös 100 metrin ympyrän |
| <kbd>Escape</kbd> | sulkee tiedot, ympyrän, valikot ja ikkunat; peruuttaa viennin rajauksen |

Kohdistus näkyy aina selvästi. Kun valikko tai ikkuna avautuu, kohdistus siirtyy siihen ja pysyy siellä sulkemiseen saakka. Sen jälkeen kohdistus palaa avauspainikkeeseen.

**Vienti ilman hiirtä:** valitse vientivalikosta **Käytä näkyvää aluetta**. Se ottaa nykyisen karttanäkymän ilman rajauksen vetämistä. Lisätietoja: [Vienti](../export/).

**Kaupunkikartta ilman hiirtä:** avustajan vaiheessa 3 siirry otsikon, selitteen ja muiden laatikoiden välillä <kbd>Tab</kbd>-näppäimellä. Siirrä laatikkoa nuolinäppäimillä ja suuremmin askelin <kbd>Shift</kbd>-näppäimen kanssa. <kbd>Alt</kbd> + nuolinäppäimet muuttavat kartan kokoa. Lisätietoja: [Kaupunkikartta](../town-plan/#schritt-3).

## Ruudunlukuohjelmalla {#screenreader}

- **Kartta:** kartta on nimetty alue, ja sen näppäimistökäyttö selitetään.
- **Symbolit:** zoomaustasolta 17 jokaisella symbolilla on nimi, esimerkiksi palopostin tyyppi ja numero. Kun avaat tiedot <kbd>Enter</kbd>-näppäimellä, ruudunlukuohjelma lukee ne.
- **Viestit:** ilmoitukset, kuten ”Linkki kopioitu” ja latausvirheet, luetaan ääneen; virheillä on etusija. Zoomaustason ja tietojen päiväyksen sisältävä tilaruutu on tarkoituksella hiljainen, jotta se ei puhu joka karttasiirrolla.
- **Kielet:** kaikkien kartan kielten ruudunlukuohjelmien nimet ovat käytettävissä. Tämä ohje on saksaksi ja englanniksi.

:::tip Monta symbolia
Alle zoomaustasolla 17 kartan pisteisiin ei voi siirtyä yksitellen, sillä Tab-pysähdyksiä tulisi satoja. Lähennä <kbd>+</kbd>-näppäimellä, kunnes symbolit näkyvät.
:::

## Näkeminen ja suurentaminen {#sehen}

- **Kontrasti:** paneelien tekstin kontrastisuhde on vähintään 4,5:1 ja suuren tekstin sekä symbolien 3:1. Koska paneelit ovat osittain läpinäkyviä, kontrasti mitataan vaaleaa ja tummaa taustakarttaa vasten.
- **Suurennus:** voit suurentaa selaimen näkymän 400 %:iin. Silloin käyttöliittymä vaihtuu kapeaan valikkonäkymään ja kaikki valikot pysyvät käytettävissä ja vieritettävissä.
- **Ei vain väriä:** palopostit eroavat värin lisäksi symbolin kirjaimella (U, O, Ø…).
- **Tausta:** heikkoon kontrastiin tai häikäisyyn voi auttaa **Tulostus (Light)**- tai **Yö (Dark)**-tausta. Katso [Tasot ja symbolit](../layers/).

## Liike {#bewegung}

Jos käyttöjärjestelmän **Vähennä liikettä** -asetus on päällä, OpenFireMap ei käytä animaatioita: haku ja paikannus siirtyvät kohteeseen lennon sijasta. Myös tämän ohjeen animaatiot jäävät pois.

## Puhelimella {#smartphone}

Ohjainten koko on vähintään 24 × 24 pikseliä. Avaa symbolin tiedot napauttamalla zoomaustasolta 17. VoiceOverilla tai TalkBackilla painikkeisiin pääsee vasemman yläkulman valikon kautta. Lisätietoja: [Kartta puhelimella](../phone/).

## Ei vielä testattu {#offen}

- kattava ruudunlukuohjelmatesti laitteilla (VoiceOver, TalkBack, NVDA)
- symbolien kontrasti kaikilla taustakartoilla, erityisesti satelliittikuvissa
- kaupunkikartta-avustajan käyttö ruudunlukuohjelmalla

## Löysitkö esteen? {#melden}

Kerro, mikä ei toiminut ja millä laitteella, selaimella sekä mahdollisella ruudunlukuohjelmalla: **[info@openfiremap.org](mailto:info@openfiremap.org)**. Voit myös tehdä [GitHub-issuen](https://github.com/FrnkMrz/OpenFireMapV2/issues).

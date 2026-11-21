---
title: Kartta puhelimella
description: OpenFireMap puhelimessa: valikko, sijainti, karttatasot, tilaruutu ja kartan lisääminen aloitusnäyttöön sovelluksen tavoin.
eyebrow: Puhelin
lead: Puhelimessa käyttöliittymä on yksinkertainen. Työkalut löytyvät vasemman yläkulman valikosta ja sijaintipainike on alhaalla peukalon ulottuvilla.
order: 2
---

## Yleiskuva {#ueberblick}

:::figure mobile-menu frame=phone set=mobile spots=menu,status,layers,share,search,legal,locate
OpenFireMap puhelimessa valikko avattuna.
:::

1. **Valikko:** avaa työkalut.
2. **Tilaruutu:** zoomaustaso ja tietojen päiväys.
3. **Karttatasot:** vaihda taustaa.
4. **Jaa karttanäkymä:** linkki tähän näkymään.
5. **Haku:** etsi paikka tai osoite.
6. **Tiedot ja oikeudelliset tiedot:** ohje, oikeudellinen ilmoitus, tietosuoja ja lisenssit.
7. **Oma sijainti:** siirry sijaintiisi.

Valikossa ovat myös **Karttasymbolit** (symbolien selitykset) ja **paikallinen välimuisti** (ladattujen alueiden säilytysaika).

OpenFireMap käyttää tätä näkymää kosketusnäytöllisillä laitteilla tai kun selainikkuna on alle 1370 pikseliä leveä. Siksi myös tabletit näyttävät yleensä valikon.

## Kosketusliikkeet {#gesten}

- **Siirrä karttaa:** vedä yhdellä sormella.
- **Zoomaa:** nipistä kahdella sormella tai kaksoisnapauta.
- **Napauta palopostia:** zoomaustasolta 16 näkyy 100 metrin sädeympyrä; ”Oma sijainti” -toiminnon jälkeen tasolta 17 myös etäisyysviiva.
- **Sulje valikko:** napauta valikon vierestä.

## Haku ja sijainti {#standort}

Valikon **Haku** avaa kartan yläpuolelle hakukentän. Napauta ”Siirry”, niin kartta siirtyy paikkaan.

Alhaalla keskellä oleva pyöreä painike näyttää sijaintisi ja zoomaa tasolle 17. Puhelin kysyy luvan ensimmäisellä kerralla. Ulkona GPS-sijainti on tavallisesti muutaman metrin tarkkuudella.

## Karttatasot {#ebenen}

:::figure mobile-layers frame=phone
Taustakartan valinta puhelimella.
:::

Maastossa **Satelliitti** auttaa usein suunnistamaan, ja pimeällä **Yö**-kartta rasittaa silmiä vähemmän. [Tasot ja symbolit](../layers/) esittelee taustakartat.

## Tilaruutu {#status}

Oikeassa yläkulmassa näkyvät zoomaustaso ja tietojen päiväys. Napauta ruutua avataksesi ”Tietojen tila ja lähde” -ikkunan, jossa näet tietojen lähteen ja iän sekä reaaliaikaisen päivityksen. Sieltä pääset myös tilasivulle ja kohtaan ”Tiedot ja oikeudelliset tiedot”.

## Käynnistä sovelluksen tavoin {#app}

OpenFireMapia ei tarvitse asentaa. Voit kuitenkin lisätä kartan aloitusnäyttöön ja avata sen sovelluksen tavoin ilman selaimen osoitepalkkia.

:::steps
1. **iPhone ja iPad (Safari):** avaa openfiremap.org, napauta alareunan **Jaa**-painiketta ja valitse **Lisää aloitusnäyttöön**.
2. **Android (Chrome):** avaa openfiremap.org, napauta oikean yläkulman **⋮**-painiketta ja valitse **Asenna sovellus** tai **Lisää aloitusnäyttöön**.
:::

:::note Sovelluksenakin tarvitset internetyhteyden
Uudet alueet, haku ja ajantasaiset tiedot haetaan verkosta. Ladatut alueet säilyvät muistissa jonkin aikaa välimuistiasetuksen mukaan. Ilman yhteyttä tulostettu [kaupunkikartta](../town-plan/) on luotettavampi.
:::

## Vain tietokoneella {#nur-computer}

**Vienti** (PNG, PDF, GPX, CSV) ja **kaupunkikartta** tarvitsevat alueen valintaan suuren näytön ja paljon muistia. Siksi ne ovat käytettävissä vain tietokoneella. Avaa openfiremap.org pöytätietokoneella tai kannettavalla. Jakolinkillä voit ottaa puhelimessa käyttämäsi näkymän mukaan.

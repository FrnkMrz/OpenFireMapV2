---
title: Usein kysytyt kysymykset
description: Vastauksia tavallisiin OpenFireMap-kysymyksiin: kartta, tiedot ja ajantasaisuus, vienti ja kaupunkikartta, osallistuminen sekä projektin oikeudelliset tiedot.
eyebrow: UKK
lead: Vastauksia yleisimpiin kysymyksiin. Eikö vastausta löydy? Kirjoita osoitteeseen info@openfiremap.org.
order: 10
---

## Kartta ja käyttö {#karte}

### Miksi en näe paloposteja? {#keine-hydranten}

Palopostit näkyvät zoomaustasolta 15. Lähennä karttaa. Jos niitä ei vieläkään näy, kukaan ei ole lisännyt niitä tälle OpenStreetMapin alueelle. Voit [lisätä ne itse](../contribute/).

### Miten avaan palopostin tiedot? {#details}

Tietokoneella symbolin tiedot näkyvät osoitettaessa sitä hiirellä zoomaustasolta 18. Puhelimella napauta symbolia tasolta 17. Näppäimistöllä siirry symboliin <kbd>Tab</kbd>-näppäimellä tasolta 17 ja paina <kbd>Enter</kbd>.

### Mitä palopostin ympärillä oleva ympyrä tarkoittaa? {#kreis}

Ympyrän säde on 100 metriä. Se ilmestyy zoomaustasolta 16, kun napsautat tai napautat palopostia, ja näyttää helposti, mitkä palopostit ovat letkun ulottuvilla. Jos olet ensin käyttänyt ”Oma sijainti” -toimintoa, sinisestä viivasta näet myös etäisyyden itseesi.

### Mitä symbolien kirjaimet tarkoittavat? {#buchstaben}

Ne kertovat tyypin: **U** maanalainen paloposti, **O** pylväsmalli, **Ø** kuivapaloposti. [Karttasymbolit](/symbols/) selittää kaikki symbolit.

### Miten jaan karttanäkymän? {#teilen}

Käytä jakamispainiketta (puhelimella valikon ”Jaa karttanäkymä”). Se kopioi linkin juuri tähän näkymään, zoomaustasoon ja taustaan. Voit myös lisätä selaimen osoitteen kirjanmerkkeihin.

### Voinko asentaa OpenFireMapin sovelluksena? {#app}

Kyllä. iPhonella Safarin **Jaa → Lisää aloitusnäyttöön** -toiminnolla, Androidilla Chromen **⋮ → Asenna sovellus** -valinnalla. Sovelluskauppaa ei tarvita. Lisätietoja: [Kartta puhelimella](../phone/#app).

### Toimiiko kartta ilman verkkoyhteyttä? {#offline}

Osittain. Ladatut alueet säilyvät välimuistiasetuksen mukaan jonkin aikaa. Uudet alueet ja haku vaativat yhteyden. Ilman verkkoa tulostettu [kaupunkikartta](../town-plan/) on luotettavampi.

## Tiedot ja ajantasaisuus {#daten}

### Mistä tiedot tulevat? {#herkunft}

[OpenStreetMapista](https://www.openstreetmap.org/). Vapaaehtoiset, usein paikalliset pelastajat, lisäävät palopostit, vedenottopaikat, paloasemat ja defibrillaattorit. OpenFireMap näyttää tiedot mutta ei muuta niitä.

### Miksi kartta latautuu Saksassa nopeammin kuin muualla? {#schneller}

Saksassa, Itävallassa, Sveitsissä, Liechtensteinissa, Luxemburgissa ja 40 muussa Euroopan maassa tiedot valmistellaan etukäteen karttatiiliksi. Muualla tiedot haetaan suoraan Overpass APIsta, jonka nopeus riippuu julkisten palvelimien kuormituksesta. Lisätietoja: [Tiedot ja ajantasaisuus](../data/#ladeweg).

### Milloin uusi paloposti näkyy? {#neu}

Tarkkaa aikaa ei voi ennustaa. Paloposti näkyy, kun Overpass-palvelin on käsitellyt muutoksen; välimuistit voivat aiheuttaa pienen viiveen. Ylikuormituksessa tai katkoksessa muutos näkyy myöhemmin. Poistetut kohteet katoavat vasta seuraavassa tietopäivityksessä. [Tiedot ja ajantasaisuus](../data/#verzoegerung) kertoo syistä.

### Kuinka ajantasaisia tiedot ovat? {#aktuell}

Tilaruutu näyttää tietojen päiväyksen. ”Tietojen tila ja lähde” -ikkunassa näet lisätiedot. [Tilasivu](/status/) näyttää tietojen iän maittain.

### Kartta ei lataudu tai ilmoittaa ylikuormituksesta. Mitä voin tehdä? {#laedt-nicht}

Lähennä hieman, jotta kysely pienenee, ja yritä hetken kuluttua uudelleen. Jos kaikki palvelimet ovat ylikuormittuneita, ongelma on julkisissa Overpass-palvelimissa. Silloin voit vain ladata myöhemmin uudelleen.

### Ovatko tiedot luotettavia operatiiviseen käyttöön? {#verbindlich}

Eivät. OpenFireMap ei ole operatiivinen tietolähde. Tiedot voivat olla puutteellisia, vanhentuneita tai vääriä eivätkä korvaa hätäkeskuksen, kunnan tai vesihuoltolaitoksen tietoja. Hätätilanteessa soita ensin hätänumeroon (Euroopassa 112).

## Vienti ja kaupunkikartta {#export}

### Miksi vienti ei ole käytettävissä puhelimessa? {#export-handy}

Tulostusvalmiit kartat tarvitsevat paljon muistia ja suuren näytön alueen valintaan. Siksi vienti ja kaupunkikartta ovat käytettävissä vain tietokoneella.

### Kuinka suuri vientialue voi olla? {#export-groesse}

Enintään 10 × 10 kilometriä. Jos piirrät suuremman suorakulmion, OpenFireMap rajaa sen. Suuren kaupungin ruudukolliseen karttaan ja katuosoitehakemistoon sopii paremmin [kaupunkikartta](../town-plan/).

### Mikä ero on viennillä ja kaupunkikartalla? {#unterschied}

[Vienti](../export/) luo nopeasti alueen kuvan tai PDF:n tai pisteiden luettelon (GPX, CSV). [Kaupunkikartta](../town-plan/) on suunniteltu A4–A1-arkki, jossa on vakioitu mittakaava, ruudukko, selite ja katuosoitehakemisto. Se toimii tällä hetkellä Saksan alueilla.

### Tulostetun kartan mittakaava on väärä. {#massstab}

Tulosta PDF **todellisessa koossa** tai **100 %:n koossa**, älä ”Sovita sivulle” -asetuksella. Käytä avustajassa valitsemaasi paperikokoa ja tarkista mittakaavajana viivaimella.

### Saanko tulostaa ja jakaa karttoja pelastuslaitokselleni? {#drucken}

Kyllä. Tietoihin sovelletaan Open Database License -lisenssiä. Jokaisessa kartassa on oltava ”© OpenStreetMap contributors” -merkintä näkyvissä. Vienti ja kaupunkikartta lisäävät sen; älä rajaa sitä pois.

## Osallistuminen {#mitmachen}

### Paloposti puuttuu tai on väärässä paikassa. Kuka korjaa sen? {#korrigieren}

Voit korjata sen itse OpenStreetMapissa maksuttomalla tilillä. Ohje [palopostien lisäämiseen](../contribute/) esittelee Hydrantenjägerin, StreetCompleten, iD:n ja JOSMin.

### Haluamme pelastuslaitoksena kartoittaa alueemme palopostit. Miten toimimme? {#feuerwehr}

Hyvä tapa on järjestää harjoitusilta tai kaupunkikävely pienryhmissä. Saksalaisille pelastuslaitoksille on saksankielinen vaiheittainen ohje: [Für Feuerwehren](/help/fire-brigades/). Muualla käytettävät työkalut esitellään ohjeessa [Lisää paloposteja](../contribute/).

### Saanko kopioida kunnan tai vesihuoltolaitoksen palopostikartan? {#plaene}

Vain nimenomaisella luvalla. Kartat ovat tekijänoikeuden suojaamia. Lisää mieluiten vain se, minkä olet itse nähnyt paikan päällä.

### Voinko käyttää pelastustoimen tasoja omassa kartassani? {#overlay}

Kyllä, peittotason avulla. Tiedot löytyvät [peittotasosivulta](/overlay/).

## Projekti ja oikeudelliset tiedot {#projekt}

### Onko tämä virallinen pelastustoimen kartta? {#offiziell}

Ei. OpenFireMap on yksityinen, voittoa tavoittelematon OpenStreetMapiin perustuva projekti. Se ei ole virallisesti yhteydessä viranomaisiin tai pelastuslaitoksiin.

### Mitä OpenFireMap maksaa? {#kosten}

Ei mitään. Tiliä, mainoksia tai tilausta ei tarvita. Lähdekoodi on MIT-lisenssillä [GitHubissa](https://github.com/FrnkMrz/OpenFireMapV2).

### Mitä tietoja OpenFireMap tallentaa minusta? {#datenschutz}

Kartta toimii selaimessasi. Sinne tallentuvat vain asetukset, kuten kieli ja välimuisti, viimeisin karttanäkymä, kaupunkikartan asetukset ja ladatut karttatiedot. Haku, karttatiilet ja kohdetiedot vaativat yhteyden ulkoisiin palveluihin. Lisätiedot ovat [tietosuojaselosteessa](/datenschutz/#en).

### Miten saan yhteyden teihin? {#kontakt}

Lähetä sähköpostia osoitteeseen [info@openfiremap.org](mailto:info@openfiremap.org). Voit myös ilmoittaa virheistä ja toiveista [GitHub-issuessa](https://github.com/FrnkMrz/OpenFireMapV2/issues).

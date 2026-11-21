---
title: Skapa en stadsplan
description: Steg för steg till en utskriftsklar stads- och brandpostplan med rutnät, teckenförklaring, skala och gateregister, som PDF eller PNG.
eyebrow: Stadsplan
lead: Stadsplanen gör OpenFireMap till ett utskriftsklart ark från A4 till A1, med rutnät, teckenförklaring, nordpil, skalstock och gateregister.
order: 6
---

## Vad stadsplanen används till {#wofuer}

En utskriven plan fungerar utan nät, batteri och även med handskar på. Vanliga användningar:

- **Väggplan** på brandstationen med alla brandposter i insatsområdet
- **Fordonsmapp** med planer över olika distrikt
- **Övning** och introduktion av nya medlemmar
- **Förplanering** av platser med stort behov av brandvatten

Till skillnad från [exporten](../export/) har stadsplanen fast skala, rutnät med rutor (A1, B2 …) och ett gateregister som visar rutorna för varje gata.

## Vad du behöver {#voraussetzungen}

- **En dator** med aktuell webbläsare. Stadsplanen är blockerad på mobil eftersom ramen och förhandsvisningen behöver stor skärm.
- **Ett område i Tyskland.** Stadsplanens baskarta täcker för närvarande Tyskland. Utanför området meddelar assistenten att ramen ligger utanför datatäckningen.

Starta stadsplanen på **[openfiremap.org/ortsplan](/ortsplan/)**. Assistenten har ännu ingen ortssökning: flytta och zooma kartan till din stad och rita sedan ramen.

:::note Gränssnittet är på tyska
Assistenten finns för närvarande bara på tyska. Etiketterna nedan visas på tyska med en översättning. Webbläsaren kommer ihåg dina inställningar till nästa gång.
:::

## Steg 1: Område och format {#schritt-1}

:::figure plan-1 frame=browser
Steg 1: ramen på kartan; till höger papper, riktning, layout och skala.
:::

Den ljusa ramen på kartan visar vad som kommer med på arket.

- **Flytta ramen:** dra handtaget högst upp i mitten. Dra i kanter och hörn för att ändra storlek. Flytta och zooma kartan under som vanligt.
- **Form des Rahmens (ramform):** **Frei** tillåter valfri form, **Wie das Blatt** behåller papprets proportioner.
- **Papier (papper):** A4, A3, A2 eller A1 samt **Quer** (liggande) eller **Hoch** (stående).
- **Anordnung (layout):** plats för teckenförklaring, skala och register: **Auf der Karte** (på kartan) eller ovanför, under, till vänster eller höger om kartan.
- **Maßstab (skala):** beräknas från ram och papper och kan låsas i listan. **Maßstab auf Standardwert runden** avrundar till exempel 1:3 870 till 1:4 000.
- **Rahmen einpassen** anpassar ramen till det valda pappret.

Under inställningarna visas arkstorlek, kartfönster och täckt område i kilometer. Raden under anger om hela ramen ligger inom datatäckningen.

:::tip Vilken skala?
För en stadskärna med många brandposter är 1:2 000 till 1:4 000 lättläst. För en hel by med omgivning räcker ofta 1:7 500 till 1:10 000. Om det blir trångt, välj större papper i stället för mindre skala.
:::

## Steg 2: Innehåll {#schritt-2}

:::figure plan-2 frame=browser
Steg 2: texter på arket och vad planen innehåller.
:::

- **Ortsname (ortens namn):** trycks stort i titeln. Assistenten föreslår orten mitt i ramen.
- **Überschrift (rubrik):** trycks ovanför ortsnamnet, till exempel «Orts- und Hydrantenplan» (stads- och brandpostplan).
- **Was steht darin? (innehåll):** symboler (räddningstjänst och brandposter), vägtyper, kommungräns och gateregister. Varje del kan stängas av.
- **Mehr Optionen (fler alternativ):** upplösning (96–300 dpi), antal kolumner och teckenstorlek i registret.

:::tip Upplösning
150 dpi räcker för skärm och vanlig utskrift. För stora format eller tryckeri väljer du 300 dpi. Filen blir betydligt större.
:::

## Steg 3: Placering {#schritt-3}

:::figure plan-3 frame=browser
Steg 3: förhandsvisning av arket med titel, karta, teckenförklaring, skala, nordpil, källor och register.
:::

Förhandsvisningen visar var allt hamnar. Som standard placerar assistenten allt automatiskt. Med **Blöcke selbst anordnen** ordnar du själv:

- **Flytta:** dra rutorna till lediga ytor eller välj med <kbd>Tab</kbd> och flytta med piltangenterna (<kbd>Shift</kbd> ger större steg).
- **Titel och karta** kan också flyttas. Kartan fäster nära kanten och stannar helt på arket.
- **Kartstorlek:** dra i kartans nedre högra hörn (tangentbord: <kbd>Alt</kbd> + piltangenter). Skalan ändras inte, men kartan visar mer eller mindre område.
- **Blöcke dürfen auf der Karte liegen:** teckenförklaring och skala får ligga över tomma kartområden med vit eller genomskinlig bakgrund.
- **Anordnung zurücksetzen** återställer assistentens förslag.

Klicka till sist på **Ortsplan erstellen** (skapa stadsplan).

## Det färdiga arket {#blatt}

:::figure plan-sheet frame=browser
Det färdiga arket med rutor, teckenförklaring, skalstock, nordpil och gateregister.
:::

Arket öppnas i full storlek. I raden längst upp kan du fortfarande ändra skala, papper, upplösning och texter och använda ändringarna med **Neu laden** (läs in igen). Om gat registret inte får plats fortsätter det på en andra sida; en notis visas ovanför arket.

- **PDF speichern:** spara arket i pappersstorlek, klart för utskrift.
- **PNG speichern:** spara arket som bild, till exempel för en presentation.

## Skriv ut korrekt {#drucken}

:::steps
1. Öppna PDF-filen och välj **Skriv ut**.
2. Ställ in skalning på **Faktisk storlek** eller **100 %**, inte «Anpassa till sida». Då blir skalan korrekt.
3. Välj pappersstorleken du ställde in i assistenten (A2 och A1 skrivs oftast ut på tryckeri).
4. Kontrollera skalstocken med en linjal efter utskrift.
:::

## Bra att veta {#wissen}

- Data är lika aktuell som OpenStreetMap; datumet trycks på arket. Skriv ut nya planer efter större förändringar i staden.
- Stadsplanen skriver ut «© OpenStreetMap contributors» automatiskt. Krediteringen måste vara kvar.
- Om en brandpost saknas i planen saknas den i OpenStreetMap. [Lägg till den](../contribute/) så kommer den med i nästa plan.

:::warn Inte ett officiellt dokument
Stadsplanen ersätter inte planer från vattenverk eller kommun. Kontrollera viktiga detaljer på plats.
:::

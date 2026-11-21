---
title: Lag et bykart
description: Trinnvis veiledning til et utskriftsklart by- og hydrantkart med rutenett, tegnforklaring, målestokk og gateindeks, som PDF eller PNG.
eyebrow: Bykart
lead: Bykartet gjør OpenFireMap om til et utskriftsklart ark fra A4 til A1, med ruter, tegnforklaring, nordpil, målestokklinjal og gateindeks.
order: 6
---

## Hva bykartet brukes til {#wofuer}

Et utskrevet kart fungerer uten nett, batteri og selv med hansker. Typiske bruksområder:

- **Veggåkart** på brannstasjonen med alle hydranter i innsatsområdet
- **Kjøretøymappe** med kart over enkelte bydeler
- **Øvelser** og opplæring av nye medlemmer
- **Forhåndsplanlegging** for steder med stort behov for brannvann

I motsetning til [eksporten](../export/) har bykartet fast målestokk, rutenett med ruter (A1, B2 …) og gateindeks som viser rutene for hver gate.

## Dette trenger du {#voraussetzungen}

- **En datamaskin** med oppdatert nettleser. Bykartet er sperret på smarttelefon fordi ramme og forhåndsvisning trenger stor skjerm.
- **Et område i Tyskland.** Grunnkartet for bykartet dekker foreløpig Tyskland. Utenfor dette området sier veiviseren fra at rammen ligger utenfor datadekningen.

Start bykartet på **[openfiremap.org/ortsplan](/ortsplan/)**. Veiviseren har ikke stedsøk ennå: flytt og zoom kartet til byen din, og tegn deretter rammen.

:::note Grensesnittet er på tysk
Veiviseren er foreløpig bare tilgjengelig på tysk. Etikettene nedenfor står på tysk med oversettelse. Nettleseren husker innstillingene til neste gang.
:::

## Trinn 1: Område og format {#schritt-1}

:::figure plan-1 frame=browser
Trinn 1: rammen på kartet; papir, retning, layout og målestokk til høyre.
:::

Den lyse rammen på kartet viser hva som kommer med på arket.

- **Flytt rammen:** dra håndtaket øverst i midten. Dra i kantene og hjørnene for å endre størrelse. Flytt og zoom kartet under som vanlig.
- **Form des Rahmens (rammeform):** **Frei** tillater vilkårlig form, **Wie das Blatt** beholder papirets proporsjoner.
- **Papier (papir):** A4, A3, A2 eller A1, samt **Quer** (liggende) eller **Hoch** (stående).
- **Anordnung (layout):** plassering av tegnforklaring, målestokk og indeks: **Auf der Karte** (på kartet) eller over, under, til venstre eller til høyre for kartet.
- **Maßstab (målestokk):** beregnes fra ramme og papir og kan låses i listen. **Maßstab auf Standardwert runden** runder for eksempel 1:3 870 til 1:4 000.
- **Rahmen einpassen** tilpasser rammen til valgt papir.

Under innstillingene vises arkstørrelse, kartvindu og området i kilometer. Linjen under sier om hele rammen er innenfor datadekningen.

:::tip Hvilken målestokk?
For et sentrum med mange hydranter er 1:2 000 til 1:4 000 lett å lese. For en hel landsby med omgivelser passer ofte 1:7 500 til 1:10 000. Hvis det blir trangt, velg større papir i stedet for mindre målestokk.
:::

## Trinn 2: Innhold {#schritt-2}

:::figure plan-2 frame=browser
Trinn 2: tekster på arket og hva planen inneholder.
:::

- **Ortsname (stedsnavn):** trykkes stort i tittelen. Veiviseren foreslår stedet midt i rammen.
- **Überschrift (overskrift):** trykkes over stedsnavnet, for eksempel «Orts- und Hydrantenplan» (by- og hydrantkart).
- **Was steht darin? (innhold):** symboler (brannvesen og hydranter), veityper, kommunegrense og gateindeks. Hver del kan slås av.
- **Mehr Optionen (flere valg):** oppløsning (96–300 dpi), antall kolonner og skriftstørrelse i indeksen.

:::tip Oppløsning
150 dpi holder for skjerm og vanlig utskrift. For store formater eller trykkeri velger du 300 dpi. Filen blir betydelig større.
:::

## Trinn 3: Plasser elementene {#schritt-3}

:::figure plan-3 frame=browser
Trinn 3: forhåndsvisning med tittel, kart, tegnforklaring, målestokk, nordpil, kilder og indeks.
:::

Forhåndsvisningen viser hvor alt ligger. Som standard ordner veiviseren alt automatisk. Med **Blöcke selbst anordnen** tar du over:

- **Flytt:** dra bokser til ledige områder, eller velg med <kbd>Tab</kbd> og flytt med piltastene (<kbd>Shift</kbd> gir større steg).
- **Tittel og kart** kan også flyttes. Kartet festes nær kanten og holder seg på arket.
- **Kartstørrelse:** dra i kartets nedre høyre hjørne (tastatur: <kbd>Alt</kbd> + piltast). Målestokken står fast; kartet viser mer eller mindre område.
- **Blöcke dürfen auf der Karte liegen:** tegnforklaring og målestokk kan ligge over tomme kartområder, med hvit eller gjennomsiktig bakgrunn.
- **Anordnung zurücksetzen** gjenoppretter veiviserens forslag.

Klikk til slutt **Ortsplan erstellen** (opprett bykart).

## Det ferdige arket {#blatt}

:::figure plan-sheet frame=browser
Ferdig ark med ruter, tegnforklaring, målestokklinjal, nordpil og gateindeks.
:::

Arket åpnes i full størrelse. I linjen øverst kan du fortsatt endre målestokk, papir, oppløsning og tekster og bruke dem med **Neu laden** (last inn på nytt). Hvis gateindeksen ikke får plass, fortsetter den på side to; en merknad vises over arket.

- **PDF speichern:** lagre arket i papirformat, klart til utskrift.
- **PNG speichern:** lagre arket som bilde, for eksempel til en presentasjon.

## Skriv ut riktig {#drucken}

:::steps
1. Åpne PDF-en og velg **Skriv ut**.
2. Sett skaleringen til **Faktisk størrelse** eller **100 %**, ikke «Tilpass til side». Da blir målestokken riktig.
3. Velg papirformatet du satte i veiviseren (A2 og A1 skrives vanligvis ut på trykkeri).
4. Kontroller målestokklinjal med en linjal etter utskrift.
:::

## Greit å vite {#wissen}

- Dataene er like oppdaterte som OpenStreetMap; datoen trykkes på arket. Lag nye planer etter større endringer i byen.
- Bykartet skriver automatisk ut «© OpenStreetMap contributors». Krediteringen må bli stående.
- Mangler en hydrant på kartet, mangler den i OpenStreetMap. [Legg den til](../contribute/), så kommer den med på neste plan.

:::warn Ikke et offisielt dokument
Bykartet erstatter ikke planer fra vannverk eller kommune. Kontroller viktige detaljer på stedet.
:::

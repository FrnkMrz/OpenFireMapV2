---
title: Tilgjengelighet
description: Bruk OpenFireMap med tastatur, skjermleser, forstørrelse og redusert bevegelse – hva som fungerer og hva som ennå ikke er testet.
eyebrow: Tilgjengelighet
lead: OpenFireMap skal fungere for alle, også uten mus, med skjermleser eller kraftig forstørrelse. Her får du vite hvordan og hvor det fortsatt finnes mangler.
order: 9
---

## Målet vårt {#ziel}

Kartet følger retningslinjene **WCAG 2.2 nivå AA**. Endringer i OpenFireMap går gjennom automatiske kontroller av tastaturbruk, skjermleseretiketter, fargekontrast, visning ved 400 % zoom og minste størrelse på kontroller. Denne hjelpen og siden med kartsymboler kontrolleres på samme måte.

:::note Ærlig status
Automatiske kontroller finner ikke alt. En test med en ekte skjermleser på en enhet gjenstår. Si fra hvis du oppdager noe (kontaktinformasjon nedenfor). Alle tips hjelper.
:::

## Med tastatur {#tastatur}

Alt du kan gjøre med mus, kan også gjøres med tastatur:

| Tast | Virkning |
|---|---|
| <kbd>Tab</kbd> | til neste kontroll; første stopp er «Hopp til kart» |
| Piltaster | flytt kartet når det har fokus |
| <kbd>+</kbd> og <kbd>−</kbd> | zoom inn og ut |
| <kbd>Tab</kbd> fra nivå 17 | gå fra symbol til symbol på kartet |
| <kbd>Enter</kbd> eller <kbd>Space</kbd> på symbol | åpne detaljer; for hydranter også sirkelen på 100 meter |
| <kbd>Escape</kbd> | lukk detaljer, sirkel, menyer og dialoger; avbryt områdevalg i eksporten |

Fokus er alltid tydelig synlig. Når en meny eller dialog åpnes, flyttes fokuset inn og blir der til du lukker den. Deretter går det tilbake til knappen som åpnet den.

**Eksport uten mus:** I eksportmenyen velger du **Bruk synlig område** for å ta med gjeldende kartvisning. Du trenger ikke dra et rektangel. Se [Eksport](../export/).

**Bykart uten mus:** I trinn 3 i veiviseren velger du tittel, tegnforklaring og andre bokser med <kbd>Tab</kbd> og flytter dem med piltastene; bruk <kbd>Shift</kbd> for større steg. <kbd>Alt</kbd> + piltastene endrer størrelsen på kartet. Se [Bykart](../town-plan/#schritt-3).

## Med skjermleser {#screenreader}

- **Kart:** merket som et navngitt område og forklarer tastaturbruk.
- **Symboler:** fra zoomnivå 17 har hvert symbol et navn, for eksempel «Hydrant» med type og nummer. Skjermleseren leser detaljene når du åpner dem med <kbd>Enter</kbd>.
- **Meldinger:** beskjeder som «Lenke kopiert» og lastefeil annonseres; feil prioriteres. Statusboksen med zoom og datadato er bevisst stille, slik at den ikke leses opp hver gang kartet flyttes.
- **Språk:** skjermleseretiketter finnes på alle kartspråk. Denne hjelpen finnes på tysk og engelsk.

:::tip Mange symboler
Under zoomnivå 17 kan ikke prikkene nås én for én, ellers ville det blitt hundrevis av Tab-stopp. Zoom inn med <kbd>+</kbd> til symbolene vises.
:::

## Syn og forstørrelse {#sehen}

- **Kontrast:** tekst i panelene har kontrastforhold på minst 4,5:1, stor tekst og symboler 3:1. Siden panelene er delvis gjennomsiktige over kartet, måles kontrasten mot både lyse og mørke bakgrunner.
- **Forstørrelse:** zoom nettlesersiden opptil 400 %. Da går den over til smal visning med meny, og alle menyer kan nås og rulles.
- **Ikke bare farger:** hydranter skilles også med bokstaven i symbolet (U, O, Ø …).
- **Bakgrunn:** Hvis kontrasten er svak eller det blender, prøv **Utskrift (Light)** eller **Natt (Dark)**. Se [Lag og symboler](../layers/).

## Bevegelse {#bewegung}

Hvis **Reduser bevegelse** er slått på i operativsystemet, bruker OpenFireMap ingen animasjoner: kartet hopper til søkeresultatet eller posisjonen i stedet for å fly dit. Hjelpen viser heller ikke bevegelse.

## På smarttelefon {#smartphone}

Kontroller er minst 24 × 24 piksler. Trykk på et symbol fra zoomnivå 17 for å åpne detaljene. Med VoiceOver eller TalkBack finner du knappene via menyen øverst til venstre. Mer under [Kart på smarttelefon](../phone/).

## Ikke testet ennå {#offen}

- full test med skjermlesere på enheter (VoiceOver, TalkBack, NVDA)
- kontrast for symboler mot alle bakgrunnskart, særlig satellitt
- bruk av bykartveiviseren med skjermleser

## Fant du en hindring? {#melden}

Fortell oss hva som ikke fungerte, og hvilken enhet, nettleser og eventuell skjermleser du brukte: **[info@openfiremap.org](mailto:info@openfiremap.org)**. Hvis du er teknisk interessert, kan du også opprette en [GitHub-issue](https://github.com/FrnkMrz/OpenFireMapV2/issues).

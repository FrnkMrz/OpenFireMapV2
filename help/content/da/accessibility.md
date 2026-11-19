---
title: Tilgængelighed
description: Brug OpenFireMap med tastatur, skærmlæser, forstørrelse og reduceret bevægelse.
eyebrow: Tilgængelighed
lead: OpenFireMap skal kunne bruges uden mus, med skærmlæser og ved stor forstørrelse. Her beskrives funktionerne og de kendte huller.
order: 9
---

## Vores mål {#ziel}

Kortet følger retningslinjerne WCAG 2.2 niveau AA. Automatiske kontroller undersøger tastaturbetjening, labels, kontrast, 400 % zoom og kontrolstørrelser.

:::note Ærlig status
Automatiske kontroller finder ikke alt. En fuld test med skærmlæser på enheder mangler stadig. Skriv gerne, hvis du opdager et problem.
:::

## Med tastatur {#tastatur}

| Tast | Funktion |
|---|---|
| <kbd>Tab</kbd> | næste kontrol; første stop er “Skip to map” |
| Piletaster | flyt kortet, når det har fokus |
| <kbd>+</kbd>/<kbd>−</kbd> | zoom |
| <kbd>Tab</kbd> fra zoom 17 | gå mellem kortsymboler |
| <kbd>Enter</kbd>/<kbd>Space</kbd> | åbn detaljer |
| <kbd>Escape</kbd> | luk detaljer, menuer og dialoger |

Fokus er synligt. Dialoger holder fokus, indtil de lukkes. I eksporten vælger **Use visible area** den aktuelle visning uden musebevægelse. I byplanens layout flyttes elementer med piletasterne.

## Med skærmlæser {#screenreader}

Kortet har et navngivet område; symboler har beskrivelser, og statusmeddelelser annonceres. Statusfeltet er stille, så det ikke læses op ved hver bevægelse. Skærmlæserlabels findes på alle kortets sprog. Denne hjælp findes på dansk, tysk og engelsk.

:::tip Mange symboler
Under zoomniveau 17 kan prikker ikke vælges enkeltvis. Zoom ind med <kbd>+</kbd>, indtil symbolerne vises.
:::

## Syn og forstørrelse {#sehen}

- Tekst og symboler er kontrolleret for kontrast mod lyse og mørke kort.
- Browserzoom op til 400 % skifter til den smalle visning med menu.
- Brandhaner skelnes også med bogstaver, ikke kun farver.
- **Print (Light)** og **Night (Dark)** kan hjælpe ved blænding.

## Bevægelse {#bewegung}

Med “Reduce motion” i operativsystemet springer kortet til søgeresultater i stedet for at animere.

## Smartphone {#smartphone}

Knapper er mindst 24 × 24 px. Symboler åbnes med tryk. VoiceOver og TalkBack kan bruges via menuen. Se [Kort på smartphone](../phone/).

## Endnu ikke testet {#offen}

- komplet enhedstest med VoiceOver, TalkBack og NVDA
- symbolkontrast på alle baggrundskort
- byplanværktøjet med skærmlæser

## Meld et problem {#melden}

Skriv til **[info@openfiremap.org](mailto:info@openfiremap.org)** med enhed, browser og skærmlæser. Fejl kan også rapporteres på [GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).

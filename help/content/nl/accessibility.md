---
title: Toegankelijkheid
description: OpenFireMap gebruiken met toetsenbord, schermlezer, vergroting en minder beweging.
eyebrow: Toegankelijkheid
lead: OpenFireMap moet werken zonder muis, met een schermlezer en bij sterke vergroting. Hier lees je de functies en bekende beperkingen.
order: 8
---

## Ons doel {#ziel}

De kaart volgt WCAG 2.2 niveau AA. Automatische controles beoordelen toetsenbordbediening, labels, contrast, 400% zoom en afmetingen van bedieningselementen.

:::note Eerlijke status
Automatische controles vinden niet alles. Een volledige test met schermlezers op apparaten moet nog worden uitgevoerd. Meld problemen gerust.
:::

## Met toetsenbord {#tastatur}

| Toets | Actie |
|---|---|
| <kbd>Tab</kbd> | volgende bediening; eerste stop is “Naar kaart” |
| Pijltjestoetsen | kaart verschuiven wanneer die focus heeft |
| <kbd>+</kbd>/<kbd>−</kbd> | in- en uitzoomen |
| <kbd>Tab</kbd> vanaf niveau 17 | tussen symbolen navigeren |
| <kbd>Enter</kbd>/<kbd>Spatie</kbd> | details openen |
| <kbd>Escape</kbd> | details, menu’s en vensters sluiten |

De focus blijft zichtbaar. **Use visible area** kiest in de export de huidige weergave zonder slepen. Onderdelen in het stadsplan kun je met pijltjestoetsen verplaatsen.

## Met schermlezer {#screenreader}

De kaart is een benoemde regio; symbolen hebben namen en meldingen worden uitgesproken. Het statusvak blijft stil tijdens kaartbewegingen. Labels bestaan in alle kaarttalen. Deze help is beschikbaar in het Nederlands, Duits en Engels.

:::tip Veel symbolen
Onder zoomniveau 17 zijn punten niet afzonderlijk bereikbaar, anders zouden er honderden tabstops zijn. Zoom in met <kbd>+</kbd> tot de symbolen verschijnen.
:::

## Zien en vergroten {#sehen}

- Contrast is gecontroleerd op lichte en donkere achtergronden.
- Bij 400% browserzoom schakelt de interface naar een smalle weergave met menu.
- Brandkranen zijn ook met letters te onderscheiden, niet alleen met kleur.
- **Print (Light)** en **Night (Dark)** kunnen helpen bij schittering.

## Beweging {#bewegung}

Met “Reduce motion” in je besturingssysteem springt de kaart naar resultaten zonder animatie.

## Smartphone {#smartphone}

Knoppen zijn minimaal 24 × 24 pixels. Tik op een symbool voor details. VoiceOver en TalkBack werken via het menu. Zie [Kaart op smartphone](../phone/).

## Nog niet getest {#offen}

- volledige tests met VoiceOver, TalkBack en NVDA
- contrast van symbolen op alle achtergronden, vooral satelliet
- stadsplanassistent met schermlezer

## Een toegankelijkheidsprobleem melden {#melden}

Mail **[info@openfiremap.org](mailto:info@openfiremap.org)** met apparaat, browser en eventuele schermlezer. Je kunt ook een [GitHub-issue](https://github.com/FrnkMrz/OpenFireMapV2/issues) openen.

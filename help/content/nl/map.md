---
title: De kaart op een computer
description: Zoeken, locatie, kaartlagen, details van brandkranen, delen en toetsenbord.
eyebrow: Kaart
lead: De hulpmiddelen staan linksboven en de datum van de gegevens rechtsonder. Dit doen de knoppen.
order: 1
---

## Overzicht {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap op een computer.
:::

1. **Zoeken:** vind een plaats of adres.
2. **Mijn locatie:** toon je positie.
3. **Kaartlagen:** verander de achtergrondkaart.
4. **Exporteren:** sla een plan of punten op.
5. **Delen:** kopieer een link naar dit kaartbeeld.
6. **Brandkraan:** wijs aan voor details of klik voor een straal van 100 meter.
7. **Statusvak:** zoomniveau en datum.
8. **Info en juridisch:** help, symbolen en juridische informatie.

## Een plaats zoeken {#suche}

Typ een plaats, straat of adres in het zoekveld en druk op <kbd>Enter</kbd> of het vergrootglas. De kaart gaat naar het eerste resultaat op niveau 16. Nominatim zoekt plaatsen en adressen, geen afzonderlijke brandkranen.

## Mijn locatie {#standort}

De locatieknop toont je positie en zoomt naar niveau 17. Je browser vraagt de eerste keer om toestemming. Je positie wordt niet opgeslagen.

:::tip Geen locatie?
Controleer of de browser locatie toestaat voor openfiremap.org. Zonder GPS kan de positie van een computer onnauwkeurig zijn.
:::

## Brandkranen en andere objecten {#objekte}

| Zoomniveau | Wat verschijnt |
|---|---|
| lager dan 12 | nog geen objecten |
| vanaf 12 | brandweerkazernes |
| vanaf 14 | kazerne-symbolen en gemeentegrenzen |
| vanaf 15 | brandkranen, waterpunten en defibrillatoren |
| vanaf 17 | symbolen met letters |
| vanaf 18 | details bij aanwijzen |

:::figure marker frame=plain
Een klik op een brandkraan tekent een straal van 100 meter.
:::

Vanaf niveau 18 verschijnen details wanneer je een symbool aanwijst. Met het toetsenbord selecteer je het vanaf niveau 17 met <kbd>Tab</kbd> en druk je op <kbd>Enter</kbd>. De straal verschijnt vanaf niveau 16; na **Mijn locatie** toont een lijn ook de afstand. De gegevens komen uit OpenStreetMap. Zie [Bijdragen](../contribute/) om ontbrekende gegevens toe te voegen.

Bekijk [Lagen en symbolen](../layers/) voor kleuren en symbolen.

## Kaartlagen {#ebenen}

De kaartknop biedt standaard, print, nacht, satelliet, topografisch, OSM en BayernAtlas. De brandweerobjecten blijven altijd bovenop liggen.

## Delen en links {#teilen}

De deelknop kopieert een link naar precies dit beeld, inclusief plaats, zoom en achtergrond. Het adres in je browser verandert mee met de kaart en kan als bladwijzer worden opgeslagen.

## Statusvak en datum {#status}

Rechtsonder staan zoomniveau en datum. “+Sync” betekent dat recente wijzigingen zijn geladen. “Data status details” toont bron en ouderdom. Zie [Gegevens en actualiteit](../data/).

## Info, juridisch en instellingen {#info}

“Info & Legal” bevat links naar deze help, symbolen, overlay, privacy en licenties. Hier stel je ook de lokale cache in: uit, 1 uur, 1 dag, 3 dagen, 7 dagen (standaard) of 30 dagen.

## Met toetsenbord {#tastatur}

- De eerste <kbd>Tab</kbd> gaat naar “Naar kaart”.
- De pijltjestoetsen verschuiven de kaart; <kbd>+</kbd> en <kbd>−</kbd> zoomen.
- Vanaf niveau 17 kun je symbolen met <kbd>Tab</kbd> bereiken. <kbd>Enter</kbd> of <kbd>Spatie</kbd> opent de details; <kbd>Escape</kbd> sluit ze.
- In menu’s en vensters blijft de focus erin tot je ze sluit.
- In de export kiest **Use visible area** het huidige beeld zonder een rechthoek te tekenen.

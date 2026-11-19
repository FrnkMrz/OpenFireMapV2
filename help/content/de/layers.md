---
title: Ebenen & Kartenzeichen
description: Welche Hintergrundkarte wofür taugt, was bei welcher Zoomstufe erscheint und was die Farben und Buchstaben der Symbole bedeuten.
eyebrow: Ebenen & Zeichen
lead: Unter den Feuerwehr-Objekten liegt eine Hintergrundkarte, die du frei wählst. Die Symbole darüber folgen festen Farben und Buchstaben.
order: 3
---

## Hintergrundkarten {#hintergrund}

:::figure layers frame=plain
Das Menü „Kartenebenen“ am Computer.
:::

| Hintergrund | Gut für |
|---|---|
| **Standard (Voyager)** | den Alltag: klare Straßen, Hausnummern ab Zoomstufe 17 |
| **Druck (Hell)** | Ausdrucke und Export: sehr hell, Symbole stechen hervor |
| **Nacht (Dunkel)** | nachts und im Fahrzeug, blendet weniger |
| **Satellit (Esri)** | Orientierung vor Ort: Gebäude, Einfahrten, Bewuchs |
| **Topographisch (OSM)** | Gelände mit Höhenlinien, Wege und Gewässer außerhalb von Orten |
| **OSM (Intl)** | die bekannte OpenStreetMap-Darstellung |
| **OSM (DE Style)** | OpenStreetMap im deutschen Stil |
| **BayernAtlas** | amtliche Karte der Bayerischen Vermessungsverwaltung, nur in Bayern |
| **Bayern Luftbild** | amtliche Luftbilder, nur in Bayern |

Die gewählte Hintergrundkarte bleibt beim Teilen erhalten und wird auch für den [Export](../export/) verwendet.

:::tip Hausnummern finden
Bei Zoomstufe 17 und 18 zeigen Standard und OSM die Hausnummern. So lässt sich ein Hydrant schnell einer Adresse zuordnen.
:::

## Zoomstufen {#zoom}

OpenFireMap lädt nur so viel, wie im Ausschnitt sinnvoll ist. Die aktuelle Zoomstufe steht in der Status-Box.

| Zoomstufe | Was erscheint |
|---|---|
| unter 12 | noch keine Objekte (Status „Standby“) |
| 12 bis 13 | Feuerwachen als Punkte |
| ab 14 | Wachen als Symbol, Gemeindegrenzen |
| 15 bis 16 | Hydranten, Löschwasserstellen und Defibrillatoren als farbige Punkte |
| ab 16 | 100-Meter-Kreis beim Antippen eines Hydranten |
| ab 17 | Symbole mit Buchstaben, mit der Tastatur erreichbar |
| 18 | Details schon beim Darüberfahren |

## Farben und Symbole {#symbole}

Die Farbe sagt, worum es geht, der Buchstabe im Symbol sagt, welcher Typ es ist:

- **Rot:** Hydranten. **U** steht für Unterflurhydrant, **O** für Oberflurhydrant, **Ø** für Trockenhydrant. Wandhydranten und weitere Bauarten haben eigene Zeichen.
- **Blau:** Löschwasserstellen, zum Beispiel Löschwasserteich, Zisterne, Löschwasserbrunnen oder Saugstelle.
- **Grün:** Defibrillatoren (AED).
- **Feuerwachen** haben ein eigenes Gebäudesymbol.

Liegen ab Zoomstufe 17 mehrere Objekte innerhalb von 5 Metern, fasst die Karte sie zusammen und zeigt ihre Anzahl.

Alle Symbole mit den passenden OpenStreetMap-Tags zeigt die Seite **[Kartenzeichen](/symbols/)**. Sie ist auch für Mapper nützlich, die wissen wollen, wie ein Symbol entsteht.

:::note Woher die Angaben kommen
Typ, Durchmesser, Nummer und alles andere stammen aus OpenStreetMap. Ist ein Hydrant ohne Typ eingetragen, zeigt die Karte einen roten Punkt ohne Buchstaben. Wie du das ergänzt, steht unter [Mitmachen](../#mitmachen).
:::

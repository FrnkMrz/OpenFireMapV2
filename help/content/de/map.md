---
title: Die Karte am Computer
description: Suche, Standort, Kartenebenen, Hydranten-Details, Teilen, Status-Box und Tastaturbedienung von OpenFireMap am Computer.
eyebrow: Karte
lead: Alle Werkzeuge liegen oben links, der Datenstand unten rechts. Hier steht, was jeder Knopf macht und was du auf der Karte siehst.
order: 1
---

## Überblick {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap am Computer: Nürnberger Altstadt bei Zoomstufe 17.
:::

1. **Suche:** Ort oder Adresse finden.
2. **Mein Standort:** zu deiner Position springen.
3. **Kartenebenen:** Hintergrundkarte wechseln.
4. **Export:** Hydrantenplan als PNG oder PDF, Punkte als GPX oder CSV.
5. **Teilen:** Link auf diesen Ausschnitt kopieren.
6. **Hydrant:** mit der Maus darauf zeigen für Details, anklicken für den 100-Meter-Kreis.
7. **Status-Box:** Zoomstufe und Datenstand.
8. **Info & Recht:** Hilfe, Kartenzeichen, Impressum, Datenschutz, Einstellungen.

## Ort suchen {#suche}

Tippe einen Ort, eine Straße oder eine Adresse in das Suchfeld oben links und drücke <kbd>Enter</kbd> oder die Lupe. Die Karte springt zum ersten Treffer und zoomt auf Stufe 16, sodass Hydranten gleich sichtbar sind.

Die Suche nutzt Nominatim, den Suchdienst von OpenStreetMap. Er findet Orte und Adressen, aber keine einzelnen Hydranten.

## Mein Standort {#standort}

Der Standort-Knopf zeigt, wo du gerade bist, und zoomt auf Stufe 17. Beim ersten Mal fragt der Browser, ob OpenFireMap deinen Standort verwenden darf. Die Position wird nur im Browser verwendet und nicht gespeichert.

:::tip Kein Standort?
Prüfe, ob der Browser die Standortfreigabe für openfiremap.org erlaubt. Am Computer ohne GPS ist die Position oft nur auf einige hundert Meter genau.
:::

## Hydranten und andere Objekte {#objekte}

Was du siehst, hängt von der Zoomstufe ab:

| Zoomstufe | Was erscheint |
|---|---|
| unter 12 | noch keine Objekte |
| ab 12 | Feuerwachen |
| ab 14 | Wachen als Symbol, Gemeindegrenzen |
| ab 15 | Hydranten, Löschwasserstellen und Defibrillatoren als farbige Punkte |
| ab 17 | alle Objekte als Symbol mit Buchstabe |
| ab 18 | Details schon beim Darüberfahren |

:::figure marker frame=plain
Ein Klick auf einen Hydranten zeichnet den Umkreis von 100 Metern ein.
:::

**Details ansehen:** Ab Zoomstufe 18 öffnen sich die Details, sobald du mit der Maus auf ein Symbol zeigst. Mit der Tastatur geht das schon ab Zoomstufe 17: Symbol mit <kbd>Tab</kbd> wählen, <kbd>Enter</kbd> drücken.

**Umkreis und Entfernung:** Ein Klick auf einen Hydranten zeigt ab Zoomstufe 16 einen gestrichelten Kreis mit 100 Metern Radius. So schätzt du schnell ab, welche Hydranten in Schlauchlänge liegen. Ab Zoomstufe 17 steht „100 m“ an der Kreislinie. Hast du vorher **Mein Standort** genutzt, zeichnet OpenFireMap ab Zoomstufe 17 außerdem eine blaue Linie von dir zum Hydranten mit der Entfernung.

Die Details zeigen, was in OpenStreetMap eingetragen ist, zum Beispiel Typ, Durchmesser, Nummer, Druck, Lage oder Betreiber. Fehlt etwas, ist es noch nicht erfasst. Wie du es ergänzt, steht unter [Mitmachen](../#mitmachen).

Was die Symbole und Farben bedeuten, erklärt die Seite [Ebenen & Kartenzeichen](../layers/).

## Kartenebenen {#ebenen}

Der Knopf mit dem Kartensymbol öffnet die Auswahl der Hintergrundkarten: Standard, Druck, Nacht, Satellit, Topographisch, zwei OSM-Stile und für Bayern BayernAtlas und Luftbild. Die Feuerwehr-Objekte liegen immer darüber. Wofür sich welcher Hintergrund eignet, steht auf der Seite [Ebenen & Kartenzeichen](../layers/).

## Teilen und Links {#teilen}

Der Teilen-Knopf kopiert einen Link auf genau diesen Ausschnitt in die Zwischenablage. Wer den Link öffnet, sieht dieselbe Stelle, dieselbe Zoomstufe und denselben Hintergrund.

Die Adresse in der Browserzeile ändert sich beim Verschieben mit. Sie hat die Form `#Zoom/Breite/Länge/Hintergrund`, zum Beispiel `openfiremap.org/#17/49.45280/11.07700/voyager`. Du kannst sie auch als Lesezeichen speichern.

## Status-Box und Datenstand {#status}

Unten rechts stehen die aktuelle Zoomstufe und der Datenstand, zum Beispiel „Stand: vor 1 T.“. „+Sync“ heißt, dass neuere Änderungen aus OpenStreetMap schon nachgeladen sind. Ein Klick auf „Datenstand-Details“ zeigt Quelle, Basis-Datenstand und den Stand der Live-Aktualisierung. Mehr dazu auf der Seite [Daten & Aktualität](../data/).

## Info & Recht und Einstellungen {#info}

„Info & Recht“ unten links öffnet einen Dialog mit dem Weg zu dieser Hilfe, zu den Kartenzeichen und zum Overlay, mit Impressum, Datenschutz und Lizenzen. Dort stellst du auch den **lokalen Cache** ein: Aus, 1 Stunde, 1 Tag, 3 Tage, 7 Tage (Standard) oder 30 Tage. Bereits geladene Gebiete erscheinen dann schneller.

## Mit der Tastatur {#tastatur}

OpenFireMap lässt sich ganz ohne Maus bedienen:

- Der erste <kbd>Tab</kbd> führt zu „Zur Karte springen“.
- Auf der Karte verschieben die Pfeiltasten den Ausschnitt, <kbd>+</kbd> und <kbd>−</kbd> zoomen.
- Ab Zoomstufe 17 sind die Symbole mit <kbd>Tab</kbd> erreichbar. <kbd>Enter</kbd> oder <kbd>Leertaste</kbd> öffnet die Details, <kbd>Escape</kbd> schließt sie.
- In Menüs und Dialogen bleibt der Fokus im Dialog, <kbd>Escape</kbd> schließt ihn.
- Im Export übernimmt „Sichtbaren Ausschnitt übernehmen“ den Ausschnitt ohne Rechteck-Ziehen.

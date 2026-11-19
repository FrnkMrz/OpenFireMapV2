---
title: Daten & Aktualität
description: Woher die Daten von OpenFireMap kommen, wie aktuell sie sind, was das Datenstand-Fenster zeigt und was der lokale Cache macht.
eyebrow: Daten
lead: Alle Feuerwehr-Objekte stammen aus OpenStreetMap. OpenFireMap bereitet sie für schnelles Laden vor und holt neue Einträge live nach.
order: 4
---

## Woher die Daten kommen {#quelle}

Hydranten, Löschwasserstellen, Feuerwachen und Defibrillatoren trägt die Gemeinschaft von [OpenStreetMap](https://www.openstreetmap.org/) ein, oft Feuerwehrleute aus dem Ort. OpenFireMap zeigt diese Daten an, ändert sie aber nicht.

Je nach Gebiet lädt die Karte auf zwei Wegen:

- **Vorbereitete Kacheln:** Für Deutschland, Österreich, die Schweiz, Liechtenstein und Luxemburg sowie 40 weitere Länder Europas liegen die Daten fertig aufbereitet bereit. Das geht schnell, auch bei großen Ausschnitten.
- **Live-Abfrage (Overpass):** Überall sonst fragt OpenFireMap die Daten direkt bei einem öffentlichen OpenStreetMap-Dienst ab. Das funktioniert weltweit, dauert aber länger und hängt von der Auslastung dieser Dienste ab.

## Wie aktuell die Daten sind {#aktualitaet}

| Gebiet | Basis-Datenstand | Neue Einträge |
|---|---|---|
| Deutschland, Österreich, Schweiz, Liechtenstein, Luxemburg | täglich | live nachgeladen |
| 40 weitere Länder Europas | wöchentlich | live nachgeladen, solange der Stand höchstens 10 Tage alt ist |
| übrige Welt | immer aktuell (Live-Abfrage) | sofort |

Nach dem Laden der vorbereiteten Kacheln fragt OpenFireMap im Hintergrund nach allem, was sich seit dem Basis-Datenstand im Ausschnitt geändert hat. Neu eingetragene oder geänderte Objekte erscheinen so meist nach wenigen Sekunden.

:::note Gelöschte Objekte
Das Nachladen erkennt nur neue und geänderte Objekte. Ein in OpenStreetMap gelöschter Hydrant verschwindet erst mit dem nächsten Basis-Datenstand, also nach spätestens einem Tag bzw. einer Woche.
:::

## Das Fenster „Datenstand & Herkunft“ {#popover}

:::figure data frame=plain
Datenstand & Herkunft: hier mit Basis-Stand von gestern, die Live-Aktualisierung war gerade nicht erreichbar.
:::

Du öffnest es am Computer über „Datenstand-Details“ in der Status-Box, am Smartphone mit einem Tipp auf die Status-Box.

- **Quelle:** vorbereitete Kacheln (DACHLiLu oder Europa), Live-Abfrage oder lokaler Cache.
- **Basis-Datenstand:** wann der Länderauszug erstellt wurde. Bei mehreren Ländern im Ausschnitt gilt der älteste Stand.
- **Live-Aktualisierung:** ob neuere Änderungen nachgeladen sind. Steht dort „Nicht verfügbar“, war der Live-Dienst nicht erreichbar und du siehst den Basis-Stand. Der Knopf mit dem Pfeil versucht es erneut.

In der Status-Box steht dasselbe in Kurzform, zum Beispiel „Stand: vor 1 T. +Sync“.

## Die Statusseite {#statusseite}

Die [Statusseite](/status/) zeigt für jedes Land, wie alt der OpenStreetMap-Stand ist, wann die Karte zuletzt aktualisiert wurde und wie viele Hydranten, Feuerwachen und Defibrillatoren es je Einwohner gibt. Sie gibt es auf Deutsch und Englisch.

## Lokaler Cache {#cache}

Damit bereits besuchte Gebiete schneller erscheinen, speichert OpenFireMap geladene Daten im Browser. Wie lange, stellst du in „Info & Recht“ (am Smartphone im Menü) unter **Lokaler Cache** ein: Aus, 1 Stunde, 1 Tag, 3 Tage, 7 Tage (Standard) oder 30 Tage.

Die Daten bleiben auf deinem Gerät. Der Cache ersetzt keine Aktualisierung: Auch Gebiete aus dem Cache werden beim Öffnen gegen den aktuellen Stand geprüft.

## Ohne Internet {#offline}

OpenFireMap ist keine Offline-Karte. Gebiete aus dem Cache bleiben eine Zeit lang sichtbar, neue Ausschnitte und die Suche brauchen aber eine Verbindung. Für Einsätze ohne Netz eignet sich ein gedruckter [Ortsplan](../town-plan/) oder ein [Export](../export/).

## Wenn das Laden dauert {#laden}

Bei der Live-Abfrage teilen sich viele Nutzer öffentliche Server. Ist einer überlastet, versucht OpenFireMap von selbst den nächsten. Hilft das nicht, zoome etwas weiter hinein, damit weniger Daten nötig sind, und versuche es nach kurzer Zeit erneut. Die Meldung unten zeigt, was gerade passiert.

:::warn Keine Einsatzgrundlage
Die Daten sind so gut wie die Einträge in OpenStreetMap. Sie können unvollständig, veraltet oder falsch sein und ersetzen keine Unterlagen der Leitstelle oder des Wasserversorgers. Im Notfall immer den Notruf 112 wählen.
:::

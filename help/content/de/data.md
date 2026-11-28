---
title: Daten & Aktualität
description: Woher die Daten von OpenFireMap kommen, wie aktuell sie sind, was das Datenstand-Fenster zeigt und was der lokale Cache macht.
eyebrow: Daten
lead: Alle Feuerwehr-Objekte stammen aus OpenStreetMap. OpenFireMap bereitet sie für schnelles Laden vor und holt neue Einträge live nach.
order: 4
---

## Woher die Daten kommen {#quelle}

Hydranten, Löschwasserstellen, Feuerwachen und Defibrillatoren trägt die Gemeinschaft von [OpenStreetMap](https://www.openstreetmap.org/) ein, oft Feuerwehrleute aus dem Ort. OpenFireMap zeigt diese Daten an, ändert sie aber nicht.

## So lädt OpenFireMap die Hydranten {#ladeweg}

Je nach Gebiet nutzt die Karte einen von zwei Wegen:

- **Vorbereitete Kacheln:** Für Deutschland, Österreich, die Schweiz, Liechtenstein und Luxemburg sowie 40 weitere Länder Europas, für Japan, Taiwan, Malaysia, Singapur und Brunei baut OpenFireMap aus den Länderauszügen von OpenStreetMap (Geofabrik) vorab Datenkacheln. Sie liegen bei Cloudflare und werden über dessen Zwischenspeicher ausgeliefert. Der Browser holt nur die wenigen Kacheln, die der Ausschnitt braucht.
- **Overpass API:** Überall sonst fragt OpenFireMap die Daten direkt bei einem öffentlichen Overpass-Server ab, für den sichtbaren Ausschnitt und einen Rand drumherum.

:::note Warum es in Deutschland und Europa schneller geht
Der Unterschied liegt nicht daran, dass Overpass dort schneller antwortet. In diesen Ländern braucht die Karte für die Hydranten gar keine Overpass-Abfrage: Sie liest die vorbereiteten Kacheln. Overpass fragt sie dort nur noch nach den Änderungen seit dem Basis-Datenstand, und das ist eine deutlich kleinere Abfrage.
:::

### Was die Overpass API ist {#overpass}

Die [Overpass API](https://wiki.openstreetmap.org/wiki/DE:Overpass_API) ist ein öffentlicher Dienst, der OpenStreetMap-Daten nach Merkmalen und Gebiet abfragt, zum Beispiel „alle Hydranten in diesem Rechteck“. Die Server betreiben Freiwillige und Vereine, viele Anwendungen teilen sie sich.

Wie schnell eine Antwort kommt, hängt ab von:

- der **Auslastung** des Servers, den OpenFireMap gerade nutzt,
- der **Größe** des Ausschnitts und damit der Laufzeit der Abfrage,
- **Wartezeiten und Ablehnungen**, wenn ein Server überlastet ist oder Anfragen begrenzt.

OpenFireMap kennt vier Overpass-Server und probiert sie in zufälliger Reihenfolge. Antwortet einer nicht oder meldet Überlastung, setzt die Karte ihn kurz aus und fragt den nächsten. Bereits geladene Gebiete hält der Browser im lokalen Cache vor.

## Wie aktuell die Daten sind {#aktualitaet}

| Gebiet | Basis-Datenstand | Neue und geänderte Einträge |
|---|---|---|
| Deutschland, Österreich, Schweiz, Liechtenstein, Luxemburg | vorbereitete Kacheln, in der Regel täglich neu | über Overpass nachgefragt |
| 40 weitere Länder Europas | vorbereitete Kacheln, in der Regel wöchentlich neu, einzelne Länder täglich | über Overpass nachgefragt, solange der Stand höchstens 10 Tage alt ist |
| Japan, Taiwan, Malaysia, Singapur, Brunei | vorbereitete Kacheln, in der Regel täglich neu | über Overpass nachgefragt, solange der Stand höchstens 10 Tage alt ist |
| übrige Welt | Stand des Overpass-Servers | mit jeder Abfrage |

Nach dem Laden der vorbereiteten Kacheln fragt OpenFireMap im Hintergrund nach allem, was sich seit dem Basis-Datenstand im Ausschnitt geändert hat, und ergänzt die Karte damit.

### Warum ein neuer Eintrag nicht sofort erscheint {#verzoegerung}

Eine Änderung in OpenStreetMap ist nicht im selben Moment in OpenFireMap zu sehen:

- **Verarbeitung:** Der Overpass-Server muss die Änderung erst übernommen haben. Meldet er einen zu alten Stand, verwirft OpenFireMap die Antwort und zeigt den Basis-Stand.
- **Zwischenspeicher:** Das Ergebnis der Nachfrage merkt sich die Karte für einige Minuten je Ausschnitt, geladene Gebiete außerdem im lokalen Cache.
- **Ausfälle:** Ist Overpass überlastet oder nicht erreichbar, bleibt es beim Basis-Stand, bis eine spätere Abfrage gelingt. Darauf hat OpenFireMap keinen Einfluss.

Eine feste Zeit lässt sich deshalb nicht versprechen. Siehst du deinen Eintrag noch nicht, lade die Karte nach einiger Zeit neu.

:::note Gelöschte Objekte
Das Nachfragen erkennt nur neue und geänderte Objekte. Ein in OpenStreetMap gelöschter Hydrant verschwindet erst mit dem nächsten Basis-Datenstand der vorbereiteten Kacheln.
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

Außerhalb der vorbereiteten Länder kommt alles über Overpass. Ist ein Server überlastet, versucht OpenFireMap von selbst den nächsten; die Meldung unten zeigt, was gerade passiert. Hilft das nicht, zoome etwas weiter hinein, damit die Abfrage kleiner wird, und versuche es nach kurzer Zeit erneut. Melden alle Server Überlastung, ist das ein Engpass bei Overpass selbst. Dann hilft nur, später erneut zu laden.

:::warn Keine Einsatzgrundlage
Die Daten sind so gut wie die Einträge in OpenStreetMap. Sie können unvollständig, veraltet oder falsch sein und ersetzen keine Unterlagen der Leitstelle oder des Wasserversorgers.
:::

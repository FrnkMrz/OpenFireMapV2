---
title: Hydranten eintragen
description: So trägst du Hydranten, Löschwasserstellen und Defibrillatoren in OpenStreetMap ein – mit Hydrantenjäger, StreetComplete, Every Door, dem iD-Editor oder JOSM.
eyebrow: Mitmachen
lead: Jeder Hydrant auf der Karte hat jemand eingetragen. Fehlt einer, kannst du ihn selbst ergänzen. Du brauchst dafür nur ein kostenloses OpenStreetMap-Konto.
order: 7
---

## Bevor du loslegst {#vorher}

OpenFireMap zeigt die Daten von [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Eingetragen wird deshalb nicht in OpenFireMap, sondern in OpenStreetMap. Dafür brauchst du ein Konto:

:::steps
1. Auf [openstreetmap.org](https://www.openstreetmap.org/user/new) **Registrieren** wählen.
2. Benutzernamen, E-Mail-Adresse und Passwort festlegen und die E-Mail bestätigen.
3. Mit diesem Konto meldest du dich in allen Werkzeugen unten an.
:::

:::warn Drei Regeln
- **Nur eintragen, was du vor Ort gesehen hast.** Position und Typ prüfst du am besten direkt am Hydranten.
- **Keine Daten aus fremden Plänen abschreiben.** Hydrantenpläne der Wasserversorger oder Gemeinden sind urheberrechtlich geschützt. Übernimm sie nur mit ausdrücklicher Erlaubnis.
- **Beim Speichern kurz beschreiben, was du geändert hast**, zum Beispiel „Hydranten Hauptstraße ergänzt“.
:::

Ihr wollt als Feuerwehr gemeinsam die Hydranten eures Ausrückebereichs prüfen? Wie ihr einen Übungsabend oder Ortsrundgang dafür organisiert, steht unter [Für Feuerwehren](../fire-brigades/).

## Welches Werkzeug passt zu dir? {#werkzeug}

| Du bist … | Nimm | Warum |
|---|---|---|
| vor Ort, mit dem Handy, und willst schnell einen Hydranten erfassen | **Hydrantenjäger** | speziell für Hydranten, setzt den Punkt per Kompass, wenige Felder |
| unterwegs und ergänzt gern nebenbei | **StreetComplete** oder **Every Door** | beantworten Fragen zu Objekten in der Nähe, auch Hydranten |
| am Computer und willst gezielt nacharbeiten | **iD-Editor** | läuft im Browser auf openstreetmap.org, keine Installation |
| erfahren und willst viele Hydranten auf einmal bearbeiten | **JOSM** (Computer) oder **Vespucci** (Android) | volle Kontrolle über alle Merkmale |

## Mit Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) ist eine Web-App für das Handy, gemacht für genau diese Aufgabe:

:::steps
1. Mit dem OpenStreetMap-Konto anmelden.
2. Etwa drei Meter vor den Hydranten stellen und das Handy auf ihn richten. Die App setzt den Punkt per GPS und Kompass dorthin.
3. Typ und Lage wählen, Durchmesser und Nummer nur, wenn du sie sicher weißt.
4. Hochladen. Fertig.
:::

Die ausführliche Anleitung mit allen Hydrantentypen steht auf der [Hilfeseite von Hydrantenjäger](https://hydrantenjaeger.de/help/).

## Mit StreetComplete oder Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) zeigt Fragen zu Objekten in deiner Nähe, zum Beispiel „Welche Art Hydrant ist das?“. Du beantwortest sie mit einem Tipp. Die App ist vor allem dafür gedacht, fehlende Angaben an vorhandenen Objekten zu ergänzen.
- **[Every Door](https://every-door.app/)** (Android, iOS) ist für das Erfassen von Punkten gemacht. Über das Plus setzt du einen neuen Punkt, wählst „Hydrant“ und füllst die Felder aus.

## Mit dem iD-Editor im Browser {#id}

Der iD-Editor ist der Standard-Editor auf openstreetmap.org.

:::steps
1. [openstreetmap.org](https://www.openstreetmap.org/) öffnen, anmelden und zu der Stelle zoomen, an der der Hydrant steht.
2. Oben auf **Bearbeiten** klicken. Beim ersten Mal führt dich ein kurzer Rundgang durch den Editor; er lohnt sich.
3. Oben auf **Punkt** klicken und den Punkt genau an die Stelle des Hydranten setzen. Das Luftbild hilft bei der Orientierung.
4. Links im Suchfeld „Hydrant“ eingeben und die Vorlage **Hydrant** wählen.
5. Die Felder ausfüllen: **Typ** (Unterflur, Überflur, Wand, Rohr), **Lage** (zum Beispiel Gehweg oder Fahrbahn), **Durchmesser** und **Nummer**, wenn bekannt.
6. Oben rechts auf **Speichern** klicken, einen kurzen Kommentar schreiben und **Hochladen**.
:::

:::tip Vorhandenen Hydranten korrigieren
Einen bestehenden Hydranten anklicken, die Felder links ändern und genauso speichern. Liegt er falsch, ziehst du ihn an die richtige Stelle. Löschen solltest du ihn nur, wenn du vor Ort sicher bist, dass es ihn nicht mehr gibt.
:::

## Mit JOSM oder Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) ist ein Editor für den Computer (Java), [Vespucci](https://vespucci.io/) die Entsprechung für Android. Beide zeigen alle Merkmale (Tags) direkt und eignen sich für größere Aufgaben, etwa wenn eine Feuerwehr alle Hydranten ihres Gebiets nach einem Ortsrundgang nachpflegt. Die Merkmale stehen unten.

## Die wichtigsten Merkmale (Tags) {#tags}

OpenStreetMap beschreibt jedes Objekt mit Merkmalen in der Form `Schlüssel=Wert`. Die Vorlagen der Apps setzen sie für dich. Wer sie direkt eingibt, nimmt diese:

| Objekt | Merkmal | Bedeutung |
|---|---|---|
| Hydrant | `emergency=fire_hydrant` | Pflicht für jeden Hydranten |
| | `fire_hydrant:type=underground` | Unterflurhydrant (auch `pillar` Überflur, `wall` Wand, `pipe` Rohr) |
| | `fire_hydrant:diameter=80` | Nennweite (DN), wie auf dem Schild |
| | `fire_hydrant:position=sidewalk` | Lage (auch `lane`, `parking_lot`, `green`) |
| | `ref=123` | Nummer des Hydranten, wenn vorhanden |
| | `fire_hydrant:pressure=4` | Druck in bar, nur wenn bekannt |
| Saugstelle | `emergency=suction_point` | Stelle zum Ansaugen an einem Gewässer |
| Löschwasserbehälter | `emergency=water_tank` | Zisterne oder Löschwassertank |
| Löschwasserteich | `emergency=fire_water_pond` | Teich, der als Löschwasserentnahme dient |
| Defibrillator | `emergency=defibrillator` | dazu `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Feuerwache | `amenity=fire_station` | Gebäude oder Gelände der Feuerwehr |

Wie die Merkmale in OpenFireMap aussehen, zeigt die Seite [Kartenzeichen](/symbols/). Ausführlich beschreibt sie das [OpenStreetMap-Wiki](https://wiki.openstreetmap.org/wiki/DE:Tag:emergency%3Dfire_hydrant).

## Wann erscheint die Änderung? {#anzeige}

Nach dem Hochladen ist der Hydrant sofort in OpenStreetMap gespeichert. In OpenFireMap erscheint er, sobald die Dienste, über die die Karte nachlädt, die Änderung verarbeitet haben. Das geht oft schnell, eine feste Zeit gibt es aber nicht. Was die Anzeige verzögern kann, steht unter [Daten & Aktualität](../data/#verzoegerung).

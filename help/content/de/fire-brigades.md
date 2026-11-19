---
title: Für Feuerwehren
description: Für Feuerwehren in Deutschland: So prüft und ergänzt eine Feuerwehr bei einer Übung oder einem Ortsrundgang die Hydranten, Löschwasserstellen und Defibrillatoren ihres Ausrückebereichs in OpenStreetMap.
eyebrow: Für Feuerwehren
lead: Ein Übungsabend reicht, um die Hydranten im eigenen Ausrückebereich zu prüfen und fehlende einzutragen. Diese Seite zeigt, wie ihr das vorbereitet, durchführt und nachbereitet – ohne Vorwissen zu OpenStreetMap.
order: 8
languages: de
---

:::note Gilt nur für Deutschland
Diese Anleitung richtet sich an Feuerwehren in Deutschland. Hinweisschilder, Abläufe und Ansprechpartner wie Gemeinde und Wasserversorger beziehen sich auf deutsche Verhältnisse. Deshalb gibt es sie nur auf Deutsch.
:::

## Warum sich das lohnt {#warum}

Wer im Einsatz Wasser sucht, verliert Zeit. OpenFireMap zeigt die Hydranten, Löschwasserstellen und Defibrillatoren, die in [OpenStreetMap](https://www.openstreetmap.org/) eingetragen sind. Fehlt dort ein Hydrant, fehlt er auch auf der Karte und im gedruckten [Ortsplan](../town-plan/).

Ein gemeinsamer Rundgang bringt mehr als das:

- **Ortskenntnis** für neue Kameradinnen und Kameraden: Wer einen Hydranten selbst gesucht hat, findet ihn wieder.
- **Ein Projekt für die Jugendfeuerwehr**, das draußen stattfindet und ein sichtbares Ergebnis hat.
- **Ein aktueller Ortsplan** zum Aushängen im Gerätehaus und für die Fahrzeugmappen.
- **Eine Mängelliste** für Gemeinde oder Wasserversorger: fehlende Schilder, zugeparkte oder überwachsene Hydranten.

:::note Keine Einsatzunterlage
OpenFireMap ist ein freies Projekt und ersetzt keine amtlichen Einsatzunterlagen. Im Notfall: **112**.
:::

## Vorbereitung {#vorbereitung}

Die Übungsleitung plant am besten ein bis zwei Wochen vorher:

:::steps
1. **Absprechen.** Mit der Wehrführung klären, dass der Rundgang als Übungsdienst stattfindet. Gemeinde oder Wasserversorger kurz informieren, dass ihr eine Bestandsaufnahme macht und keine Hydranten öffnet, und anbieten, ihnen danach die Mängelliste zu schicken.
2. **Gebiet aufteilen.** Den [Ortsplan](../town-plan/) des Ausrückebereichs drucken und die Planquadrate auf die Trupps verteilen, zum Beispiel „Trupp 1: A1 bis C4“. Als grober Richtwert schafft ein Trupp in einer Stunde 15 bis 25 Hydranten, im Neubaugebiet mehr, im Altort mit Suchen weniger.
3. **Ist-Stand ansehen.** OpenFireMap ab Zoomstufe 17 öffnen und schauen, wo schon Hydranten stehen. Als Prüfliste je Trupp eignet sich ein [CSV-Export](../export/#gpx-csv) des Gebiets.
4. **Konten anlegen.** Wer eintragen will, legt vorher ein eigenes, kostenloses OpenStreetMap-Konto an ([so geht's](../contribute/#vorher)). Bitte keine gemeinsamen Konten für die ganze Wehr: OpenStreetMap möchte nachvollziehen können, wer was geändert hat.
5. **Die Aktion beschreiben.** Für gemeinsame, organisierte Kartierungen bittet OpenStreetMap um eine kurze Beschreibung im OSM-Wiki: wer, wo, wann, was ([Richtlinie für organisiertes Bearbeiten](https://osmfoundation.org/wiki/Organised_Editing_Guidelines), englisch). In jeden Änderungskommentar kommt dazu der Hashtag `#OpenFireMap`, dann lassen sich eure Änderungen später leicht finden.
6. **Material bereitlegen.** Geladene Handys mit [Hydrantenjäger](https://hydrantenjaeger.de/) im Browser (Standort und Kompass einmal vorab erlauben), Powerbank, Warnwesten, Taschenlampen, Klemmbrett mit [Trupp-Karte und Bögen](#ausdrucken).
:::

:::tip Jugendfeuerwehr
Für Kinder und Jugendliche gelten die Regeln von OpenStreetMap und das Einverständnis der Eltern. Einfacher ist oft: Die Jugendlichen suchen, prüfen und notieren, und eine Betreuerin oder ein Betreuer trägt mit dem eigenen Konto ein.
:::

## Zum Ausdrucken {#ausdrucken}

| Was | Für wen | Datei |
|---|---|---|
| **Trupp-Karte**: sechs Schritte, Sicherheit, Hinweisschild lesen, Hydrantentypen | jeder Trupp, A4 beidseitig | [PDF herunterladen](/downloads/OpenFireMap-Feuerwehr-Truppkarte.pdf) |
| **Erfassungsbogen, Mängelliste** und Vorlage für das Anschreiben an Gemeinde oder Wasserversorger | jeder Trupp und die Nachbereitung, A4 quer | [PDF herunterladen](/downloads/OpenFireMap-Feuerwehr-Erfassungsbogen.pdf) |

Beide Dateien sind ein erster Stand vor dem Praxistest mit einer Feuerwehr. Hinweise, was fehlt oder unklar ist, nehmen wir gern unter info@openfiremap.org entgegen.

## Ablauf des Übungsabends {#ablauf}

Für einen Übungsdienst von 90 Minuten bietet sich diese Einteilung an:

| Zeit | Was passiert |
|---|---|
| 0–15 min | Einweisung: Ziel, Sicherheit, Hydrantentypen und Schilder, Hydrantenjäger einmal vorführen |
| 15–75 min | Die Trupps gehen ihr Planquadrat ab: jeden Hydranten finden, prüfen, eintragen oder korrigieren, Mängel notieren |
| 75–90 min | Zurück am Gerätehaus: kurze Auswertung, offene Punkte und Notizen einsammeln |

Ein Trupp besteht aus zwei bis drei Personen: eine Person bedient das Handy, eine achtet auf den Verkehr und schreibt mit.

## Am Hydranten: sechs Schritte {#am-hydranten}

:::steps
1. **Hydranten finden.** Nach dem Hinweisschild suchen. „H“ steht für Hydrant, die Zahl daneben für die Nennweite (DN) der Leitung, z. B. DN 100. Die beiden Zahlen an den Linien des Schilds geben in Metern an, wie weit der Hydrant vom Schild entfernt liegt: seitlich und nach vorn.
2. **Nachsehen, ob er schon eingetragen ist.** In Hydrantenjäger oder OpenFireMap auf Marker in der Nähe achten.
3. **Neu eintragen.** Etwa drei Meter vor den Hydranten stellen, das Handy auf ihn richten, Typ (Unterflur, Überflur, Wand, Saugstelle …) und Lage wählen. Nennweite und Nummer nur angeben, wenn sie sicher sind, etwa vom Schild.
4. **Vorhandenen prüfen.** Stimmen Typ, Nennweite und Nummer? Liegt der Punkt mehr als ein paar Meter daneben, verschieben.
5. **Hochladen.** Ohne Netz den Hydranten auf dem [Erfassungsbogen](#ausdrucken) notieren (Straße, Hausnummer gegenüber, Typ, Schild) und später nachtragen.
6. **Mängel getrennt notieren.** Schild fehlt oder ist unleserlich, Deckel zugeparkt, überteert oder zugewachsen, Hydrant beschädigt: Das gehört **nicht** in OpenStreetMap, sondern auf eure Mängelliste.
:::

Wie Hydrantenjäger im Einzelnen funktioniert, steht auf der [Hilfeseite von Hydrantenjäger](https://hydrantenjaeger.de/help/). Andere Werkzeuge stellt die Seite [Hydranten eintragen](../contribute/#werkzeug) vor.

## Weitere Objekte {#weitere-objekte}

Bleibt Zeit, lohnen sich auch:

- **Saugstellen** an Bächen und Teichen,
- **Löschwasserteiche und Löschwasserbehälter** (Zisternen),
- **öffentlich zugängliche Defibrillatoren**, mit Angaben zu Zugang und Öffnungszeiten, wenn sie dranstehen.

Die passenden Merkmale stehen in der [Tabelle auf der Seite „Hydranten eintragen“](../contribute/#tags).

## Sicherheit und Regeln {#sicherheit}

:::warn Für jeden Trupp
- **Warnweste tragen** und nicht auf der Fahrbahn stehen bleiben. Kinder und Jugendliche nur mit Betreuung.
- **Hydranten nicht öffnen, nicht betätigen, Deckel nicht anheben.** Die Prüfung der Hydranten ist Sache des Wasserversorgers.
- **Private Grundstücke nur mit Erlaubnis betreten**, Wandhydranten in Gebäuden nur mit Zustimmung.
- **Fotos ohne Personen und Kennzeichen.** Hydrantenjäger lädt Fotos nicht hoch, sie bleiben auf dem Handy.
- **Nur eintragen, was ihr selbst gesehen habt.** Hydrantenpläne der Gemeinde oder des Wasserversorgers nicht abschreiben, sie sind urheberrechtlich geschützt.
:::

Den Versicherungsschutz klärt die Wehrführung am besten vorab, wie bei jedem anderen Übungsdienst.

## Nachbereitung {#nachbereitung}

Ein bis zwei Personen am Computer brauchen dafür meist eine halbe bis eine Stunde:

:::steps
1. **Prüfen, ob alles angekommen ist.** Neue Einträge erscheinen in OpenFireMap nicht immer sofort. Wie lange es dauert, hängt von den Diensten ab, über die die Karte lädt, eine feste Zeit gibt es nicht. Die Gründe stehen unter [Daten & Aktualität](../data/#verzoegerung).
2. **Papiernotizen nachtragen**, am einfachsten mit dem [iD-Editor](../contribute/#id).
3. **Kurzer Qualitätsblick:** doppelte Punkte, Hydranten ohne Typ, Punkte mitten auf einem Dach. Eure eigenen Änderungen findet ihr über euer Profil auf openstreetmap.org oder über den Hashtag `#OpenFireMap`.
4. **Mängelliste abschicken** an Gemeinde oder Wasserversorger. Eine Vorlage für das Anschreiben steht in den [Bögen](#ausdrucken).
5. **Ortsplan neu drucken** und im Gerätehaus aushängen, gern auch für die Fahrzeugmappen. Wie das geht, zeigt die Anleitung [Ortsplan erstellen](../town-plan/).
:::

:::tip Erzählt uns davon
Wie ist euer Rundgang gelaufen? Erfahrungen und Verbesserungsvorschläge für diese Anleitung nehmen wir gern unter info@openfiremap.org entgegen.
:::

## Regelmäßig wiederholen {#wiederholen}

Hydranten kommen dazu, werden versetzt oder verschwinden. Empfehlenswert ist ein Rundgang im Jahr, etwa im Frühjahr nach dem Winterdienst, dazu Neubaugebiete, sobald die Straßen fertig sind. Für die Jugendfeuerwehr kann das eine Daueraufgabe werden.

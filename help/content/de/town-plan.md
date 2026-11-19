---
title: Ortsplan erstellen
description: Schritt für Schritt zum druckfertigen Orts- und Hydrantenplan mit Gitter, Legende, Maßstab und Straßenverzeichnis, als PDF oder PNG.
eyebrow: Ortsplan
lead: Der Ortsplan macht aus OpenFireMap ein druckfertiges Blatt in A4 bis A1, mit Planquadraten, Legende, Nordpfeil, Maßstab und Straßenverzeichnis.
order: 6
---

## Wofür der Ortsplan da ist {#wofuer}

Ein gedruckter Plan funktioniert ohne Netz, ohne Akku und auch mit Handschuhen. Typische Einsätze:

- **Aushang** im Gerätehaus mit allen Hydranten im Ausrückebereich
- **Fahrzeugmappe** mit Plänen der einzelnen Ortsteile
- **Übungen** und Einweisung neuer Kameradinnen und Kameraden
- **Vorplanung** für Objekte mit erhöhtem Löschwasserbedarf

Anders als der [Export](../export/) hat der Ortsplan einen festen Maßstab, ein Gitter mit Planquadraten (A1, B2 …) und ein Straßenverzeichnis, das jeder Straße ihre Planquadrate zuordnet.

## Was du brauchst {#voraussetzungen}

- **Einen Computer** mit aktuellem Browser. Am Smartphone ist der Ortsplan gesperrt, weil Rahmen und Vorschau einen großen Bildschirm brauchen.
- **Ein Gebiet in Deutschland.** Die Grundkarte des Ortsplans gibt es zurzeit für Deutschland. Außerhalb meldet der Assistent, dass der Rahmen nicht im Datengebiet liegt.

Du startest den Ortsplan unter **[openfiremap.org/ortsplan](/ortsplan/)**. Eine Ortssuche hat der Assistent noch nicht: Verschiebe und zoome die Karte zu deinem Ort, dann ziehst du den Rahmen auf.

:::note Bedienoberfläche auf Deutsch
Der Assistent ist zurzeit nur auf Deutsch. Deine Einstellungen merkt sich der Browser für das nächste Mal.
:::

## Schritt 1: Ausschnitt und Format {#schritt-1}

:::figure plan-1 frame=browser
Schritt 1: Rahmen auf der Karte, rechts Papier, Ausrichtung, Anordnung und Maßstab.
:::

Der helle Rahmen auf der Karte zeigt, was auf das Blatt kommt.

- **Rahmen bewegen:** am Griff oben in der Mitte ziehen. An den Kanten und Ecken ziehst du ihn größer oder kleiner. Die Karte darunter verschiebst und zoomst du wie gewohnt.
- **Form des Rahmens:** **Frei** erlaubt jede Form, **Wie das Blatt** hält das Seitenverhältnis des Papiers.
- **Papier:** A4, A3, A2 oder A1, dazu **Quer** oder **Hoch**.
- **Anordnung:** wo Legende, Maßstab und Verzeichnis stehen: **Auf der Karte** oder oben, unten, links oder rechts neben der Karte.
- **Maßstab:** ergibt sich aus Rahmen und Papier und lässt sich in der Liste fest einstellen. Mit **Maßstab auf Standardwert runden** wird zum Beispiel aus 1:3.870 ein glatter Wert wie 1:4.000.
- **Rahmen einpassen** setzt den Rahmen passend zum gewählten Papier.

Unter den Einstellungen stehen Blattgröße, Kartenfenster und die abgedeckte Fläche in Kilometern. Die Zeile darunter meldet, ob der Rahmen komplett im Datengebiet liegt.

:::tip Welcher Maßstab?
Für einen Ortskern mit vielen Hydranten ist 1:2.000 bis 1:4.000 gut lesbar. Für ein ganzes Dorf mit Umgebung reicht oft 1:7.500 bis 1:10.000. Wird es zu eng, nimm ein größeres Papier statt eines kleineren Maßstabs.
:::

## Schritt 2: Inhalt {#schritt-2}

:::figure plan-2 frame=browser
Schritt 2: Texte auf dem Blatt und was der Plan enthält.
:::

- **Ortsname:** steht groß im Titel. Der Assistent schlägt den Namen des Orts in der Mitte des Rahmens vor.
- **Überschrift:** steht über dem Ortsnamen, zum Beispiel „Orts- und Hydrantenplan“ oder „Löschwasserplan“.
- **Was steht darin?** Symbole (Feuerwehr und Hydranten), Straßenarten und Gemeindegrenze, Straßenverzeichnis. Jedes lässt sich abwählen.
- **Mehr Optionen:** Auflösung (96 bis 300 dpi), Spaltenzahl und Schriftgröße des Verzeichnisses.

:::tip Auflösung
150 dpi reichen für den Bildschirm und normale Ausdrucke. Für große Formate oder den Druck in einer Druckerei wähle 300 dpi. Die Datei wird dann deutlich größer.
:::

## Schritt 3: Anordnen {#schritt-3}

:::figure plan-3 frame=browser
Schritt 3: Vorschau des Blatts mit Titel, Karte, Legende, Maßstab, Nordpfeil, Quellen und Verzeichnis.
:::

Die Vorschau zeigt, wo was auf dem Blatt liegt. Standardmäßig ordnet der Assistent alles selbst an. Mit **Blöcke selbst anordnen** übernimmst du:

- **Verschieben:** Kästen mit der Maus in freie Flächen ziehen, oder mit <kbd>Tab</kbd> auswählen und mit den Pfeiltasten bewegen (mit <kbd>Umschalt</kbd> in größeren Schritten).
- **Titel und Karte** lassen sich ebenfalls verschieben. Die Karte rastet nahe am Rand ein und bleibt immer ganz auf dem Blatt.
- **Kartengröße:** an der Ecke unten rechts der Karte ziehen (Tastatur: <kbd>Alt</kbd> + Pfeiltasten). Der Maßstab bleibt gleich, die Karte zeigt dann mehr oder weniger Gebiet.
- **Blöcke dürfen auf der Karte liegen:** Legende und Maßstab dürfen auf freie Kartenflächen, wahlweise mit weißem oder durchsichtigem Untergrund.
- **Anordnung zurücksetzen** stellt den Vorschlag des Assistenten wieder her.

Zum Schluss klickst du auf **Ortsplan erstellen**.

## Das fertige Blatt {#blatt}

:::figure plan-sheet frame=browser
Das fertige Blatt mit Planquadraten, Legende, Maßstab, Nordpfeil und Straßenverzeichnis.
:::

Das Blatt öffnet sich in voller Größe. Oben in der Leiste kannst du Maßstab, Papier, Auflösung und Texte noch ändern und mit **Neu laden** übernehmen. Passt das Straßenverzeichnis nicht auf das Blatt, geht es auf einer zweiten Seite weiter; ein Hinweis über dem Blatt sagt dir das.

- **PDF speichern:** das Blatt in Papiergröße, bereit zum Drucken.
- **PNG speichern:** das Blatt als Bild, zum Beispiel für eine Präsentation.

## Richtig drucken {#drucken}

:::steps
1. Das PDF öffnen und **Drucken** wählen.
2. Bei der Skalierung **Tatsächliche Größe** oder **100 %** einstellen, nicht „An Seite anpassen“. Nur so stimmt der Maßstab.
3. Das Papierformat wählen, das du im Assistenten eingestellt hast (A2 und A1 meist im Copyshop).
4. Nach dem Druck die Maßstabsleiste mit einem Lineal prüfen.
:::

## Gut zu wissen {#wissen}

- Die Daten sind so aktuell wie OpenStreetMap; das Datum steht auf dem Blatt. Drucke Pläne nach größeren Änderungen im Ort neu.
- Die Quellenangabe „© OpenStreetMap-Mitwirkende“ druckt der Ortsplan von selbst mit. Sie muss auf dem Plan bleiben.
- Fehlt ein Hydrant auf dem Plan, fehlt er in OpenStreetMap. [Trag ihn ein](../contribute/), dann ist er beim nächsten Plan dabei.

:::warn Keine amtliche Unterlage
Der Ortsplan ersetzt keine Pläne des Wasserversorgers oder der Gemeinde. Prüfe wichtige Angaben vor Ort.
:::

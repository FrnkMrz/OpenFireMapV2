---
title: Häufige Fragen
description: Antworten auf häufige Fragen zu OpenFireMap – Karte, Daten und Aktualität, Export und Ortsplan, Mitmachen, Projekt und Recht.
eyebrow: FAQ
lead: Die Antworten auf das, was am häufigsten gefragt wird. Deine Frage ist nicht dabei? Schreib uns an info@openfiremap.org.
order: 10
---

## Karte und Bedienung {#karte}

### Warum sehe ich keine Hydranten? {#keine-hydranten}

Hydranten erscheinen erst ab Zoomstufe 15. Zoome weiter hinein. Siehst du dann immer noch keine, sind in diesem Gebiet noch keine in OpenStreetMap eingetragen. Das kannst du [selbst ändern](../contribute/).

### Wie öffne ich die Details eines Hydranten? {#details}

Am Computer zeigt ab Zoomstufe 18 ein Symbol seine Details, sobald du mit der Maus darauf zeigst. Am Smartphone tippst du ab Zoomstufe 17 auf das Symbol. Mit der Tastatur wählst du es ab Zoomstufe 17 mit <kbd>Tab</kbd> und drückst <kbd>Enter</kbd>.

### Was bedeutet der Kreis um einen Hydranten? {#kreis}

Er hat einen Radius von 100 Metern und erscheint ab Zoomstufe 16, wenn du einen Hydranten anklickst oder antippst. So siehst du schnell, welche Hydranten in Schlauchlänge liegen. Hast du vorher „Mein Standort“ genutzt, zeigt eine blaue Linie zusätzlich die Entfernung von dir.

### Was bedeuten die Buchstaben in den Symbolen? {#buchstaben}

Sie zeigen die Bauart: **U** Unterflurhydrant, **O** Oberflurhydrant, **Ø** Trockenhydrant. Alle Symbole erklärt die Seite [Kartenzeichen](/symbols/).

### Wie teile ich einen Kartenausschnitt? {#teilen}

Mit dem Teilen-Knopf (am Smartphone „Kartenansicht teilen“ im Menü). Er kopiert einen Link auf genau diesen Ausschnitt mit Zoomstufe und Hintergrund. Die Adresse in der Browserzeile kannst du auch als Lesezeichen speichern.

### Kann ich OpenFireMap wie eine App installieren? {#app}

Ja. Am iPhone in Safari über **Teilen → Zum Home-Bildschirm**, unter Android in Chrome über **⋮ → App installieren**. Eine Installation aus dem App Store ist nicht nötig. Mehr unter [Karte am Smartphone](../phone/#app).

### Funktioniert die Karte ohne Internet? {#offline}

Nur eingeschränkt. Bereits geladene Gebiete bleiben je nach Cache-Einstellung eine Zeit lang gespeichert. Neue Ausschnitte und die Suche brauchen eine Verbindung. Für unterwegs ohne Netz ist ein gedruckter [Ortsplan](../town-plan/) zuverlässiger.

## Daten und Aktualität {#daten}

### Woher kommen die Daten? {#herkunft}

Aus [OpenStreetMap](https://www.openstreetmap.org/). Freiwillige, oft Feuerwehrleute aus dem Ort, tragen Hydranten, Löschwasserstellen, Wachen und Defibrillatoren ein. OpenFireMap zeigt diese Daten an, ändert sie aber nicht.

### Warum lädt die Karte in Deutschland schneller als anderswo? {#schneller}

Für Deutschland, Österreich, die Schweiz, Liechtenstein, Luxemburg und 40 weitere Länder Europas bereitet OpenFireMap die Daten vorab als Kacheln auf. Überall sonst kommen sie direkt über die Overpass API. Das hängt von der Auslastung dieser öffentlichen Server ab. Mehr unter [Daten & Aktualität](../data/#ladeweg).

### Wann erscheint mein neu eingetragener Hydrant? {#neu}

Das lässt sich nicht genau vorhersagen. Er erscheint, sobald der Overpass-Server die Änderung verarbeitet hat. Zwischenspeicher können das etwas verzögern. Ist Overpass überlastet oder nicht erreichbar, erscheint er erst später. Gelöschte Objekte verschwinden erst mit dem nächsten Datenstand. Die Gründe stehen unter [Daten & Aktualität](../data/#verzoegerung).

### Wie aktuell sind die Daten? {#aktuell}

Den Stand zeigt die Status-Box, die Details das Fenster „Datenstand & Herkunft“. Für jedes Land listet die [Statusseite](/status/), wie alt die Daten sind.

### Die Karte lädt nicht oder meldet Überlastung. Was tun? {#laedt-nicht}

Zoome etwas weiter hinein, damit die Abfrage kleiner wird, und versuche es nach kurzer Zeit erneut. Melden alle Server Überlastung, liegt der Engpass bei den öffentlichen Overpass-Servern. Dann hilft nur, später neu zu laden.

### Sind die Daten für den Einsatz verbindlich? {#verbindlich}

Nein. OpenFireMap ist keine Einsatzgrundlage. Die Daten können unvollständig, veraltet oder falsch sein und ersetzen keine Unterlagen der Leitstelle, der Gemeinde oder des Wasserversorgers. Im Notfall immer zuerst den Notruf 112.

## Export und Ortsplan {#export}

### Warum gibt es am Smartphone keinen Export? {#export-handy}

Druckfertige Pläne brauchen viel Arbeitsspeicher und einen großen Bildschirm zum Auswählen. Export und Ortsplan gibt es deshalb nur am Computer.

### Wie groß darf ein Export sein? {#export-groesse}

Höchstens 10 × 10 Kilometer. Ziehst du ein größeres Rechteck, begrenzt OpenFireMap es. Für einen großen Ort mit Gitter und Straßenverzeichnis ist der [Ortsplan](../town-plan/) besser.

### Was ist der Unterschied zwischen Export und Ortsplan? {#unterschied}

Der [Export](../export/) macht schnell ein Bild oder PDF des Ausschnitts oder eine Punktliste (GPX, CSV). Der [Ortsplan](../town-plan/) ist ein gestaltetes Blatt in A4 bis A1 mit festem Maßstab, Planquadraten, Legende und Straßenverzeichnis, zurzeit für Orte in Deutschland.

### Der gedruckte Plan hat nicht den richtigen Maßstab. {#massstab}

Drucke das PDF mit **Tatsächliche Größe** oder **100 %**, nicht mit „An Seite anpassen“, und auf dem Papierformat, das du im Assistenten gewählt hast. Prüfe danach die Maßstabsleiste mit einem Lineal.

### Darf ich Pläne für meine Feuerwehr drucken und weitergeben? {#drucken}

Ja. Die Daten stehen unter der Open Database License. Auf jedem Plan muss „© OpenStreetMap-Mitwirkende“ sichtbar bleiben. Export und Ortsplan drucken die Quellenangabe mit; schneide sie nicht ab.

## Mitmachen {#mitmachen}

### Ein Hydrant fehlt oder ist falsch. Wer korrigiert das? {#korrigieren}

Du selbst, in OpenStreetMap. Du brauchst nur ein kostenloses Konto. Die Anleitung mit Hydrantenjäger, StreetComplete, iD und JOSM steht unter [Hydranten eintragen](../contribute/).

### Wir möchten als Feuerwehr die Hydranten in unserem Ort erfassen. Wie gehen wir vor? {#feuerwehr}

Am besten als Übungsabend oder Ortsrundgang in Trupps. Vorbereitung, Ablauf, Sicherheitsregeln und Nachbereitung beschreibt die Anleitung [Für Feuerwehren](../fire-brigades/).

### Darf ich Hydrantenpläne der Gemeinde oder des Wasserversorgers übernehmen? {#plaene}

Nur mit ausdrücklicher Erlaubnis. Solche Pläne sind urheberrechtlich geschützt. Trag am besten nur ein, was du selbst vor Ort gesehen hast.

### Kann ich die Feuerwehr-Ebenen in meiner eigenen Karte nutzen? {#overlay}

Ja, über das Overlay. Informationen dazu findest du auf der [Overlay-Seite](/overlay/).

## Projekt und Recht {#projekt}

### Ist das eine offizielle Feuerwehr-Karte? {#offiziell}

Nein. OpenFireMap ist ein privates, nicht-kommerzielles Projekt auf Basis von OpenStreetMap. Es arbeitet mit keiner Behörde oder Feuerwehr offiziell zusammen.

### Was kostet OpenFireMap? {#kosten}

Nichts. Es gibt kein Konto, keine Werbung und kein Abo. Der Quellcode steht unter der MIT-Lizenz auf [GitHub](https://github.com/FrnkMrz/OpenFireMapV2).

### Welche Daten speichert OpenFireMap über mich? {#datenschutz}

Die Karte läuft in deinem Browser. Gespeichert werden dort nur Einstellungen wie Sprache und Cache, der zuletzt angesehene Ausschnitt, die Einstellungen des Ortsplans und bereits geladene Kartendaten. Für Suche, Kartenkacheln und Daten fragt der Browser externe Dienste an. Die Einzelheiten stehen in der [Datenschutzerklärung](/?legal=1).

### Wie erreiche ich euch? {#kontakt}

Per E-Mail an [info@openfiremap.org](mailto:info@openfiremap.org). Fehler und Wünsche kannst du auch als [Issue auf GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues) melden.

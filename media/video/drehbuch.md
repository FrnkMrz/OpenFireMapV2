# Erklärvideo „Hydranten-Rundgang“ – Drehbuch und Sprechertext

Version 0.9 (vor dem Pilot) · Stand 20. November 2026 · nur Deutsch, für Feuerwehren in Deutschland · Lizenz des fertigen Videos: CC BY 4.0, Quelle OpenFireMap.org

Dieses Drehbuch ist der erste Schritt von Etappe E6 (`planning/feuerwehr-anleitung-plan.md`, Abschnitt 5.1). Es ist die Grundlage für Storyboard, Dreh, Sprecheraufnahme, Untertitel und das Transkript auf der Hilfeseite. Die Videodatei selbst kommt nicht ins Repo.

## Grundregeln

- **Inhalt wie im übrigen Material:** Was gesagt wird, steht so auch auf der Hilfeseite, in der Trupp-Karte und im Leitfaden. Ändert sich dort etwas, wird das Drehbuch angepasst, bevor gedreht wird.
- **Ansprache:** „ihr“, wie im übrigen Feuerwehr-Material. Kein „wir“.
- **Keine festen Zeiten:** Nie sagen, wann neue Einträge auf der Karte erscheinen.
- **Kein Hashtag im Video:** Gezeigt wird Hydrantenjäger, und der setzt den Änderungskommentar selbst. `#OpenFireMap` gilt nur für den iD-Editor.
- **Barrierefreiheit:** Alles, was wichtig ist, steht auch im Sprechertext (keine reine Bild-Information). Keine schnellen Blitze, auch nicht beim Blaulicht. Untertitel als WebVTT, Transkript als Text auf der Hilfeseite.
- **Sprechtempo:** ruhig, etwa 80 bis 110 Wörter je Minute, damit Zeit für die Bilder bleibt; höchstens 150. Der Test `test/video-drehbuch.test.js` prüft das für jede Szene.
- **Datenschutz beim Dreh:** Gesichter und Kennzeichen nur mit Einverständnis, sonst unscharf oder nicht im Bild. Keine echten Einsätze filmen; die Nachtszene ist gestellt.
- **Bedienoberflächen kurz zeigen:** Hydrantenjäger und OpenFireMap ändern sich. Bildschirmszenen höchstens wenige Sekunden je Einstellung, mit Datum der Aufnahme in der Drehliste.

## Hauptfassung

### 1 · Einsatz bei Nacht (0:00–0:15)

- **Bild:** Nacht, Wohnstraße, Löschfahrzeug mit Blaulicht (ruhig, ohne Blitzen im Bild). Der Maschinist leuchtet mit der Taschenlampe zwischen parkende Autos, ein verblasstes Hinweisschild am Zaun.
- **Quelle:** Außenaufnahme, gestellt, mit Feuerwehr
- **Sprecher:** „Nachts, ein Einsatz. Der Maschinist sucht den Hydranten. Irgendwo hier muss er sein, vielleicht unter einem parkenden Auto. Das Schild ist kaum zu lesen. Und jede Minute zählt.“

### 2 · Die Karte zeigt, was eingetragen ist (0:15–0:40)

- **Bild:** Bildschirmaufnahme openfiremap.org, Zoom 17, Hydranten-Symbole U und O, Defibrillator. Dann eine Straße, in der ein Symbol fehlt: der Hydrant aus Szene 1 ist auf der Karte nicht da.
- **Quelle:** Bildschirmaufnahme (Playwright, wie `npm run help:shots`)
- **Einblendung:** openfiremap.org
- **Sprecher:** „OpenFireMap zeigt Hydranten, Löschwasserstellen und Defibrillatoren aus OpenStreetMap, der freien Weltkarte. Die Karte zeigt aber nur, was dort jemand eingetragen hat. Fehlt ein Hydrant in OpenStreetMap, fehlt er auch auf der Karte und im gedruckten Ortsplan.“

### 3 · Ein Übungsabend reicht (0:40–1:00)

- **Bild:** Gerätehaus, Übungsabend, Trupps in Warnwesten bekommen Klemmbretter mit Trupp-Karte und Bögen.
- **Quelle:** Außenaufnahme mit Feuerwehr
- **Sprecher:** „Das lässt sich an einem Übungsabend ändern. Eure Feuerwehr geht ihr Gebiet ab, prüft jeden Hydranten und trägt die fehlenden ein. Vorwissen zu OpenStreetMap braucht ihr dafür nicht.“

### 4 · Vorbereitung (1:00–1:30)

- **Bild:** Gedruckter Ortsplan auf dem Tisch, eine Hand markiert Planquadrate je Trupp. Kurz: Anmeldeseite von OpenStreetMap auf dem Handy (ohne Zugangsdaten im Bild).
- **Quelle:** Nahaufnahme am Tisch, Bildschirmaufnahme
- **Einblendung:** Trupp 1: A1 bis C4
- **Sprecher:** „Die Übungsleitung druckt vorher den Ortsplan und verteilt die Planquadrate auf die Trupps. Wer eintragen will, legt sich ein eigenes, kostenloses Konto bei OpenStreetMap an, bitte kein gemeinsames Konto für die ganze Wehr. Ein Trupp besteht aus zwei bis drei Personen: eine bedient das Handy, eine achtet auf den Verkehr.“

### 5 · Das Hinweisschild lesen (1:30–1:55)

- **Bild:** Echtes Hinweisschild in Nahaufnahme, dann die Grafik aus der Trupp-Karte mit Pfeilen für seitlich und nach vorn.
- **Quelle:** Außenaufnahme, Grafik `handouts/feuerwehr-truppkarte/img/`
- **Sprecher:** „Am Hinweisschild steht H für Hydrant und die Nennweite der Leitung, hier 100. Die Zahl neben dem senkrechten Strich sagt, wie viele Meter der Hydrant seitlich liegt, die Zahl darunter, wie viele Meter nach vorn.“

### 6 · Eintragen mit Hydrantenjäger (1:55–2:40)

- **Bild:** Hände mit Handy vor einem Unterflurhydranten, etwa drei Meter Abstand. Bildschirm: Hydrantenjäger, Kamera, Formular mit Typ und Lage. Dann ein vorhandener Punkt, der verschoben wird. Zum Schluss ein Trupp ohne Netz, der auf den Erfassungsbogen schreibt.
- **Quelle:** Außenaufnahme (Hände und Handy), Bildschirmaufnahme vom Handy
- **Einblendung:** hydrantenjaeger.de
- **Sprecher:** „Eingetragen wird mit Hydrantenjäger im Browser des Handys. Stellt euch etwa drei Meter vor den Hydranten, richtet das Handy auf ihn und wählt Typ und Lage. Die Nennweite nur, wenn sie sicher ist, etwa vom Schild. Steht schon ein Punkt da, prüft ihn und verschiebt ihn, wenn er daneben liegt. Ohne Netz kommt der Hydrant auf den Erfassungsbogen und wird später nachgetragen.“

### 7 · Mängel und Sicherheit (2:40–3:05)

- **Bild:** Zugeparkter Deckel, fehlendes Schild, eine Hand notiert auf der Mängelliste. Dann der Trupp am Gehwegrand, eine Person schaut auf den Verkehr.
- **Quelle:** Außenaufnahme
- **Einblendung:** Mängelliste, nicht OpenStreetMap
- **Sprecher:** „Fehlt ein Schild, ist der Deckel zugeparkt oder der Hydrant beschädigt, kommt das auf die Mängelliste, nicht in OpenStreetMap. Hydranten öffnet ihr nicht, und auf der Fahrbahn bleibt niemand stehen. Kinder und Jugendliche sind nur mit Betreuung unterwegs.“

### 8 · Das Ergebnis (3:05–3:30)

- **Bild:** Bildschirmaufnahme: dieselbe Straße wie in Szene 2, jetzt mit Hydrant. Dann der gedruckte Ortsplan an der Wand im Gerätehaus.
- **Quelle:** Bildschirmaufnahme, Außenaufnahme im Gerätehaus
- **Sprecher:** „Danach geht die Mängelliste an Gemeinde oder Wasserversorger. Die neuen Hydranten erscheinen auf der Karte, nicht immer sofort, und im neuen Ortsplan, der danach im Gerätehaus hängt.“

### 9 · Beim nächsten Einsatz (3:30–3:45)

- **Bild:** Wieder Nacht, dieselbe Straße. Der Maschinist geht ohne Suchen zum Hydranten, das Schild ist neu.
- **Quelle:** Außenaufnahme, gestellt, mit Feuerwehr
- **Einblendung:** openfiremap.org/help/fire-brigades/
- **Sprecher:** „Beim nächsten Einsatz weiß der Maschinist, wohin. Anleitung, Trupp-Karte und Bögen zum Ausdrucken findet ihr auf openfiremap.org unter Hilfe, für Feuerwehren.“

### Abspann (3:45–3:55)

- **Bild:** Texttafeln auf hellem Grund, ohne Sprecher, mit ruhiger Musik oder ohne Ton:
- Ein Video von OpenFireMap.org · Lizenz CC BY 4.0
- Kartendaten © OpenStreetMap-Mitwirkende
- Mitwirkende: Freiwillige Feuerwehr … (nur mit Einverständnis)
- Musik: Titel, Urheber, Lizenz (nur lizenzfreie Musik mit Nachweis)
- OpenFireMap ersetzt keine amtlichen Einsatzunterlagen. Im Notfall: 112.

## Kurzfassung (60 Sekunden)

Für den Einstieg in einen Unterrichtsabend und zum Teilen. Bilder aus der Hauptfassung, keine eigenen Aufnahmen.

### 1 · Einsatz bei Nacht (0:00–0:10)

- **Bild:** wie Hauptfassung Szene 1, gekürzt
- **Sprecher:** „Nachts, ein Einsatz. Der Hydrant liegt unter einem parkenden Auto, das Schild ist kaum zu lesen.“

### 2 · Ein Übungsabend reicht (0:10–0:35)

- **Bild:** Szenen 2, 3 und 6 im Wechsel, je wenige Sekunden
- **Sprecher:** „OpenFireMap zeigt nur Hydranten, die in OpenStreetMap eingetragen sind. Das ändert ihr an einem Übungsabend: Gebiet aufteilen, Hinweisschilder lesen, mit Hydrantenjäger auf dem Handy eintragen. Mängel kommen auf eine eigene Liste.“

### 3 · Das Ergebnis (0:35–0:50)

- **Bild:** Szenen 8 und 9
- **Sprecher:** „Am Ende stimmt die Karte, und im Gerätehaus hängt ein neuer Ortsplan.“

### 4 · Hinweis auf die Anleitung (0:50–1:00)

- **Bild:** Einblendung der Adresse vor dem Logo
- **Einblendung:** openfiremap.org/help/fire-brigades/
- **Sprecher:** „Die Anleitung und alles zum Ausdrucken: openfiremap.org, Hilfe, für Feuerwehren.“

## Drehliste

| Nr. | Einstellung | Szene | Wer im Bild | Einverständnis nötig |
|---|---|---|---|---|
| A1 | Nacht: Fahrzeug, Maschinist mit Taschenlampe | 1, 9 | eine Person, Fahrzeug | ja, Kennzeichen unkenntlich |
| A2 | Gerätehaus: Trupps mit Klemmbrett | 3, 8 | mehrere Personen | ja, alle Erkennbaren |
| A3 | Tisch: Ortsplan, Planquadrate markieren | 4 | nur Hände | nein |
| A4 | Hinweisschild in Nahaufnahme | 5 | niemand | nein |
| A5 | Hände mit Handy vor Unterflurhydrant | 6 | nur Hände | nein |
| A6 | Erfassungsbogen und Mängelliste ausfüllen | 6, 7 | nur Hände | nein |
| A7 | Zugeparkter Deckel, fehlendes Schild | 7 | niemand, Kennzeichen unkenntlich | nein |
| A8 | Trupp am Gehwegrand, Sicherungsposten | 7 | zwei bis drei Personen | ja |
| B1 | OpenFireMap Zoom 17, Straße ohne und mit Hydrant | 2, 8 | – | – |
| B2 | Hydrantenjäger: Start, Kamera, Formular, Verschieben | 6 | – | Aufnahme ohne Upload, simulierter Standort |
| B3 | Anmeldeseite OpenStreetMap ohne Zugangsdaten | 4 | – | – |

Bildschirmaufnahmen (B) entstehen ohne echte Uploads, so wie die Bildschirmfotos im Leitfaden (`handouts/feuerwehr-leitfaden/screenshots.mjs`). Das Datum jeder Aufnahme wird hier nachgetragen.

## Offen vor dem Dreh

- **Pilot-Feuerwehr:** Die Außenaufnahmen (A1, A2, A8) brauchen eine echte Feuerwehr. Am einfachsten beim Pilot-Rundgang (E7) mitdrehen.
- **Einverständniserklärungen:** Vorlage für alle Erkennbaren im Bild, bei Minderjährigen die Eltern. Ohne Unterschrift kein Gesicht im Bild.
- **Schild-Lesart:** Die Erklärung in Szene 5 vor dem Dreh mit DIN 4066 abgleichen (offener Punkt aus dem Plan).
- **Sprecherin oder Sprecher:** wer spricht, und wo wird aufgenommen.
- **Musik:** lizenzfrei mit Nachweis oder ganz ohne.
- **Untertitel:** Deutsch als WebVTT. Englische Untertitel stehen im Plan, das übrige Feuerwehr-Material ist aber nur Deutsch. Entscheidung offen.
- **Hosting:** selbst gehostet (`<video>` mit MP4/WebM und VTT), kleiner als 30 MB, die CSP der Hilfe braucht dann `media-src`.

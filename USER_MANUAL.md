# 📖 OpenFireMapV2 - Benutzerhandbuch

Willkommen bei **OpenFireMapV2**! Dieses Handbuch erklärt dir alle Funktionen der Software, sowohl für den Einsatz am Desktop-PC als auch mobil auf dem Smartphone oder Tablet.

---

## 🖥 Oberfläche & Navigation

Die Benutzeroberfläche ist bewusst minimalistisch gehalten, um den Fokus auf die Karte zu legen.

### Grundsteuerung
- **Verschieben:** 
  - *Desktop:* Linke Maustaste gedrückt halten und ziehen.
  - *Mobil:* Mit einem Finger wischen.
- **Zoomen:**
  - *Desktop:* Mausrad drehen oder die `+` / `-` Tasten oben rechts nutzen.
  - *Mobil:* Zwei Finger auseinanderziehen (hinein) oder zusammenziehen (heraus).

### Zoom-Level & Details
Die Karte lädt Daten intelligent nach Zoomstufe, um die Übersichtlichkeit zu wahren:
- **Weit weg (Zoom < 12):** Nur grobe Übersicht, keine Symbole.
- **Mittel (Zoom 12-14):** 🚒 **Feuerwachen** erscheinen als rote Quadrate oder Icons.
- **Nah (Zoom >= 15):** Alle Details werden sichtbar:
  - 💧 **Hydranten** (Rot = Überflur, Blau = Unterflur/Spezial)
  - ⚡ **Defibrillatoren** (Grünes Herz-Symbol)
  - 🌊 **Löschwasserstellen** (Saugstellen, Teiche)

### ⚡ High-Speed Vektorkacheln (DACHLiLu)
In den 5 Ländern **Deutschland, Österreich, Schweiz, Luxemburg und Liechtenstein** werden über **1,25 Millionen Objekte** über unsere Vektorkachel-Pipeline (Cloudflare R2 Edge) in Sekundenbruchteilen (20–30 ms) geladen. Außerhalb dieses Bereichs schaltet die Karte automatisch und nahtlos auf die weltweite OpenStreetMap Overpass API um.

### 📊 Statusanzeigen & Benachrichtigungen
Die Anwendung informiert dich übersichtlich und ohne störende Popups über den aktuellen Systemzustand:
- **Status-Box (Desktop unten rechts / Smartphone oben rechts):**
  - `ZOOM`: Aktuelle Zoomstufe (z. B. `15.0`).
  - `DATEN`: Aktueller Stand der Kartendaten (`AKTUELL`, `AKTUELL (Lokal)` für High-Speed-Pipeline, `LÄDT...` oder `STANDBY`).
- **Hydranten-Ladeanzeige (über der Status-Box):**
  - Informiert bei asynchronen Datenabrufen über den Fortschritt (Objektanzahl, Spinner).
  - Sollte eine Abfrage einmal fehlschlagen, bietet sie direkt einen Wiederholen-Knopf (`↻`).
- **Benachrichtigungen (Toasts, oben mittig):**
  - Erscheinen nur bei gezielten Nutzeraktionen (z. B. *„Standort gefunden!“*, *„Link kopiert!“*, Dateidownload) oder Systemhinweisen.
  - Farbkodiert für schnelle Erfassung: **Grün** (Erfolg), **Blau** (Info), **Gelb** (Warnung) und **Rot** (Fehler).

---

## 🔍 Suche & Standort

### Ortssuche
Oben links befindet sich das Suchfeld.
1. Tippe einen Ortsnamen ein (z.B. "Berlin Feuerwehrstraße").
2. Drücke `Enter` oder klicke auf die **Lupe**.
3. Die Karte springt automatisch zum gefundenen Ort.

### "Locate Me" (GPS)
Klicke auf den **Fadenkreuz-Button** 🎯 (unter den Zoom-Tasten), um deinen eigenen Standort zu finden.
- Beim ersten Mal fragt der Browser um Erlaubnis ("Darf OpenFireMap deinen Standort verwenden?").
- Ein blauer Punkt zeigt deine aktuelle Position.
- Die Karte zentriert sich automatisch.

---

## 🗺 Karten-Ebenen (Layer)

Du kannst das Aussehen der Basiskarte ändern.
1. Klicke oben rechts auf das **Ebenen-Symbol** (Stapel).
2. Wähle einen Stil aus:
   - **Voyager:** Helle, übersichtliche Karte (Standard).
   - **Satellite:** Luftbilder (gut zum Erkennen von Vegetation/Bebauung).
   - **Dark:** Dunkler Modus (gut bei Nacht).
   - **OSM:** Die klassische OpenStreetMap-Ansicht.

---

## ℹ️ Symbole & Interaktion

### Legende (Was bedeuten die Symbole?)
- **Rotes Icon [F]:** Feuerwehrhaus (Berufsfeuerwehr/Freiwillige).
- **Runder roter Kreis:** Hydrant.
  - **U:** Unterflurhydrant.
  - **O:** Überflurhydrant.
- **Blauer Kreis:** Wasserentnahmestelle (Zisterne, Saugstelle).
- **Grünes Kreuz/Herz:** Defibrillator (AED).

### Smart Tooltips
Fahre mit der Maus über ein Symbol (Desktop) oder tippe es kurz an (Mobil), um Details zu sehen:
- Genaue Adresse
- Fördermenge (l/min)
- Leitungsdurchmesser
- Zusatzinfos (z.B. "Defekt" oder "Hinter dem Gebäude")

### 100-Meter-Radius
Klicke auf einen Hydranten oder eine Wasserstelle. Es erscheint ein gestrichelter Kreis, der den **100-Meter-Radius** anzeigt. Das hilft beim Einschätzen von Schlauchlängen.

---

## 📤 Export & Drucken

Du kannst Kartenausschnitte als Bild oder PDF speichern (z.B. für Einsatzpläne).

1. Öffne das **Export-Menü** (Button mit Pfeil nach oben).
2. **Format wählen:**
   - *A4 (Hoch/Quer):* Perfekt zum Ausdrucken. Ein roter Rahmen zeigt den Druckbereich.
   - *Frei:* Der aktuell sichtbare Ausschnitt.
3. **Download:**
   - **PNG:** Speichert ein hochauflösendes Bild.
   - **PDF:** Erzeugt eine druckfertige PDF-Datei.
   - **GPX:** Exportiert die sichtbaren Hydranten als GPS-Datei (für Navis).
   - **CSV:** Exportiert alle sichtbaren Objekte mit Attributen als Tabelle (direkt in Microsoft Excel per Doppelklick öffenbar).

---

## 📱 Mobile Besonderheiten

Die App ist als **Progressive Web App (PWA)** optimiert.

**Installation (optional):**
- **Android (Chrome):** Tippe auf "Drei Punkte" -> "Zum Startbildschirm hinzufügen".
- **iOS (Safari):** Tippe auf "Teilen" (Kästchen mit Pfeil) -> "Zum Home-Bildschirm".
- Damit hast du ein echtes App-Icon und die Karte läuft im Vollbildmodus ohne Adressleiste.

### Offline & Cache
Einmal geladene Kartendaten (in deinem Ort) bleiben **24 Stunden gespeichert**. Beim nächsten Start ist die Karte sofort da, auch bei schlechtem Netz.

**Tipp:** Auf dem Handy ist das Menü für Layer und Export einklappbar, um mehr Platz für die Karte zu haben.

# Erste Schritte

## Karte öffnen

Öffne [openfiremap.org](https://openfiremap.org). Die Karte kann ohne Konto genutzt werden und funktioniert weltweit, sofern eine Internetverbindung besteht.

Zoome in einen Bereich hinein, um feuerwehrrelevante Objekte zu laden. Bei ausreichender Zoomstufe werden unter anderem Feuerwachen, Hydranten, Löschwasserstellen und Defibrillatoren angezeigt. Die Darstellung und die verfügbaren Tags hängen von den Daten in OpenStreetMap ab.

## Suche verwenden

1. Gib einen Ortsnamen, eine Adresse oder einen bekannten Ort in das Suchfeld ein.
2. Starte die Suche mit Enter oder dem Suchsymbol.
3. Wähle das passende Ergebnis aus; die Karte springt zum gefundenen Bereich.

Die Suche verwendet Nominatim. Bitte vermeide viele automatisierte Suchanfragen und beachte die [Nutzungsregeln von Nominatim](https://operations.osmfoundation.org/policies/nominatim/).

## Hydranten und Wasserstellen anzeigen

Zoome in einen Bereich hinein und aktiviere die gewünschten Objektarten über die Kartensteuerung. Ein Klick auf ein Objekt öffnet die verfügbaren Details aus OSM. Je nach Eintrag können beispielsweise Typ, Durchmesser, Fördermenge, Adresse oder Hinweise angezeigt werden.

Die Karte lädt nur für den aktuellen Ausschnitt relevante Daten. In DACHLiLu und in 40 weiteren europäischen Ländern werden bevorzugt PMTiles-Kacheln verwendet (die Länder-Dateien werden wöchentlich neu gebaut, der Datenstand steht im Datenstand-Popover). Außerhalb dieser Gebiete und bei Pipeline-Problemen kommt Overpass zum Einsatz.

## Export verwenden

Über das Export-Menü können sichtbare Kartendaten oder Kartenausschnitte exportiert werden:

- **PNG** für ein Bild des Kartenausschnitts
- **PDF** für einen druckbaren Plan
- **GPX** für sichtbare Punkte in GPS-Anwendungen
- **CSV** für weitere Auswertung, zum Beispiel in Tabellenprogrammen

Vor einem großen Export sollte der Ausschnitt sinnvoll eingegrenzt werden. Die Anwendung begrenzt große Bereiche, um Browser-Abstürze und unnötig große Dateien zu vermeiden.

## Mobile Nutzung

Die Oberfläche ist für Smartphones und Tablets angepasst. Verschiebe die Karte mit einem Finger und zoome mit zwei Fingern. Suche, Layer, Standortbestimmung und Export sind auch mobil verfügbar.

Die Anwendung kann als PWA zum Startbildschirm hinzugefügt werden. Das bedeutet nicht, dass Live-Kartendaten vollständig offline verfügbar sind: Für neue Ausschnitte, Suche und aktuelle Daten ist weiterhin eine Internetverbindung nötig. Bereits geladene Daten können abhängig von der Cache-Einstellung lokal vorgehalten werden.

## Bedienung per Tastatur und Screenreader

OpenFireMap ist für die Bedienung ohne Maus ausgelegt und wird gegen WCAG 2.2 (A/AA) geprüft. Ein Test mit einem echten Screenreader am Gerät steht noch aus; Rückmeldungen dazu sind willkommen.

- **Zur Karte springen**: Der erste Tab-Stopp ist der Link „Zur Karte springen“. Er setzt den Fokus auf die Karte, ohne den Link zur aktuellen Ansicht (Permalink) zu ändern.
- **Karte**: Mit Fokus auf der Karte verschieben die Pfeiltasten den Ausschnitt, <kbd>+</kbd> und <kbd>−</kbd> zoomen. Die Seite selbst lässt sich im Browser vergrößern.
- **Marker**: Ab Zoomstufe 17 sind Symbole per <kbd>Tab</kbd> erreichbar und haben einen Namen (Typ und Name bzw. Nummer). <kbd>Enter</kbd> oder <kbd>Leertaste</kbd> öffnet die Details, <kbd>Escape</kbd> schließt sie.
- **Menüs und Dialoge**: Beim Öffnen springt der Fokus hinein, <kbd>Tab</kbd> bleibt im Dialog, <kbd>Escape</kbd> schließt ihn und der Fokus kehrt zum Auslöser zurück.
- **Export ohne Maus**: Im Export-Menü übernimmt „Sichtbaren Ausschnitt übernehmen“ den aktuellen Kartenausschnitt als Auswahl. <kbd>Escape</kbd> bricht den Auswahlmodus ab. Das Ziehen eines Rechtecks mit der Maus bleibt möglich.
- **Bewegung**: Ist im Betriebssystem „Bewegung reduzieren“ eingestellt, gibt es keine Animationen und die Karte springt statt zu fliegen.
- **Sprachen**: Beschriftungen für Screenreader sind in allen unterstützten Sprachen vorhanden. Die Rechtstexte stehen bewusst auf Deutsch verbindlich.

## Pipeline-Statusseite

Unter [openfiremap.org/status](https://openfiremap.org/status/) (Deutsch und Englisch) zeigt eine Statusseite je Land, wann der OSM-Datenstand war, wann die Karte hochgeladen wurde und wie viele Hydranten, Feuerwachen und Defibrillatoren es je Einwohner gibt. Der Link steht auch im Dialog „Info & Recht“ und im Popover „Datenstand & Herkunft“ der Karte.

## Cache

Der lokale IndexedDB-Cache kann in der Anwendung deaktiviert oder mit einer Dauer von 1 Stunde, 1 Tag, 3 Tagen, 7 Tagen oder 30 Tagen konfiguriert werden. Ein Cache verbessert die Wiederholung bereits geladener Ausschnitte, ersetzt aber keine Aktualisierung aus OpenStreetMap.

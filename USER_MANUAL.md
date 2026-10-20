# OpenFireMapV2 – Benutzerhandbuch

Die ausführliche, gepflegte Kurzanleitung steht in [docs/ERSTE_SCHRITTE.md](docs/ERSTE_SCHRITTE.md). Dort werden Karte, Suche, Objektdetails, Export, mobile Nutzung, Bedienung per Tastatur und Screenreader, die Pipeline-Statusseite und der lokale Cache erklärt.

## Datenversorgung

OpenFireMap ist weltweit nutzbar:
- Im Abdeckungsgebiet **DACHLiLu** (Deutschland, Österreich, die Schweiz, Luxemburg und Liechtenstein) sowie in 40 weiteren europäischen Ländern (ohne Russland, Ukraine, Belarus, Türkei) nutzt die Karte automatisch eine vorberechnete, hochperformante Daten-Pipeline mit über 2 Millionen feuerwehrrelevanten Objekten.
- Außerhalb dieses Bereichs sowie bei vorübergehend nicht verfügbaren Pipeline-Daten schaltet die Anwendung vollautomatisch und nahtlos auf den weltweiten Abruf über die OpenStreetMap-Overpass-Schnittstelle um.
- Für Anwenderinnen und Anwender geschieht dieser Wechsel völlig transparent: Die Karte lädt überall zuverlässig die passenden Daten.

## Bedienung per Tastatur

- <kbd>Tab</kbd>: zum nächsten Element; der erste Stopp ist „Zur Karte springen“
- Pfeiltasten und <kbd>+</kbd>/<kbd>−</kbd> bei fokussierter Karte: verschieben und zoomen
- <kbd>Enter</kbd> oder <kbd>Leertaste</kbd> auf einem Marker (ab Zoomstufe 17): Details öffnen
- <kbd>Escape</kbd>: Details, Menü, Dialog oder Auswahlmodus schließen
- Button „Objekte im Ausschnitt“: Liste der sichtbaren Objekte als Alternative zu den Markern

Mehr dazu in [docs/ERSTE_SCHRITTE.md](docs/ERSTE_SCHRITTE.md#bedienung-per-tastatur-und-screenreader).

## Wichtig für die Nutzung

Die Anwendung benötigt für neue Kartenausschnitte, Suche und aktuelle Daten eine Internetverbindung. Lokaler IndexedDB-Cache kann bereits geladene Daten je nach Einstellung wiederverwenden, ist aber keine verlässliche Offline-Karte für Feuerwehreinsätze.

OpenFireMap stellt offene OSM-Daten dar und ist keine amtliche Einsatzkarte. Bitte prüfe die Angaben vor einer operativen Nutzung mit lokalen, verlässlichen Quellen.

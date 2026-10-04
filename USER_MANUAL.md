# OpenFireMapV2 – Benutzerhandbuch

Die ausführliche, gepflegte Kurzanleitung steht in [docs/ERSTE_SCHRITTE.md](docs/ERSTE_SCHRITTE.md). Dort werden Karte, Suche, Objektdetails, Export, mobile Nutzung und der lokale Cache erklärt.

## Datenversorgung

OpenFireMap ist weltweit nutzbar:
- Im Abdeckungsgebiet **DACHLiLu** (Deutschland, Österreich, die Schweiz, Luxemburg und Liechtenstein) nutzt die Karte automatisch eine vorberechnete, hochperformante Daten-Pipeline mit rund 1,2 Millionen feuerwehrrelevanten Objekten.
- Außerhalb dieses Bereichs sowie bei vorübergehend nicht verfügbaren Pipeline-Daten schaltet die Anwendung vollautomatisch und nahtlos auf den weltweiten Abruf über die OpenStreetMap-Overpass-Schnittstelle um.
- Für Anwenderinnen und Anwender geschieht dieser Wechsel völlig transparent: Die Karte lädt überall zuverlässig die passenden Daten.

## Wichtig für die Nutzung

Die Anwendung benötigt für neue Kartenausschnitte, Suche und aktuelle Daten eine Internetverbindung. Lokaler IndexedDB-Cache kann bereits geladene Daten je nach Einstellung wiederverwenden, ist aber keine verlässliche Offline-Karte für Feuerwehreinsätze.

OpenFireMap stellt offene OSM-Daten dar und ist keine amtliche Einsatzkarte. Bitte prüfe die Angaben vor einer operativen Nutzung mit lokalen, verlässlichen Quellen.

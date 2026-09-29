# OpenFireMapV2 – Benutzerhandbuch

Die ausführliche, gepflegte Kurzanleitung steht in [docs/ERSTE_SCHRITTE.md](docs/ERSTE_SCHRITTE.md). Dort werden Karte, Suche, Objektdetails, Export, mobile Nutzung und der lokale Cache erklärt.

## Datenversorgung

OpenFireMap ist weltweit nutzbar. In Deutschland, Österreich, der Schweiz, Luxemburg und Liechtenstein werden rund 1,25 Millionen vorberechnete Objekte bevorzugt aus PMTiles über Cloudflare R2 geladen. Der auf MaxZoom 14 optimierte Build ist aktuell etwa 192,5 MiB groß und bleibt damit unter dem Cloudflare-Free-Cache-Limit von 512 MiB. Der Browser verwendet HTTP-Range-Requests und lädt nur benötigte Kachelbereiche. Außerhalb dieser Gebiete sowie bei veralteten oder nicht erreichbaren Pipeline-Daten wird automatisch Overpass verwendet.

## Wichtig für die Nutzung

Die Anwendung benötigt für neue Kartenausschnitte, Suche und aktuelle Daten eine Internetverbindung. Lokaler IndexedDB-Cache kann bereits geladene Daten je nach Einstellung wiederverwenden, ist aber keine verlässliche Offline-Karte für Feuerwehreinsätze.

OpenFireMap stellt offene OSM-Daten dar und ist keine amtliche Einsatzkarte. Bitte prüfe die Angaben vor einer operativen Nutzung mit lokalen, verlässlichen Quellen.

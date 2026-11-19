---
title: Mapa na komputerze
description: Wyszukiwanie, lokalizacja, warstwy, szczegóły hydrantów, udostępnianie i obsługa klawiaturą.
eyebrow: Mapa
lead: Narzędzia znajdują się w lewym górnym rogu, a data danych w prawym dolnym. Oto objaśnienie przycisków.
order: 1
---

## Przegląd {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap na komputerze.
:::

1. **Szukaj:** znajdź miejsce lub adres.
2. **Moja lokalizacja:** pokaż swoje położenie.
3. **Warstwy mapy:** zmień podkład.
4. **Eksport:** zapisz plan lub punkty.
5. **Udostępnij:** skopiuj link do widoku.
6. **Hydrant:** wskaż symbol, aby zobaczyć szczegóły, lub kliknij, aby narysować promień 100 m.
7. **Stan:** poziom przybliżenia i data danych.
8. **Informacje i prawo:** pomoc, symbole i informacje prawne.

## Znajdź miejsce {#suche}

Wpisz miejsce, ulicę lub adres i naciśnij <kbd>Enter</kbd> albo ikonę lupy. Mapa pokaże pierwszy wynik na poziomie 16. Wyszukiwanie korzysta z Nominatim i znajduje miejsca oraz adresy, a nie pojedyncze hydranty.

## Moja lokalizacja {#standort}

Przycisk pokazuje Twoje położenie i przybliża mapę do poziomu 17. Przeglądarka poprosi o zgodę przy pierwszym użyciu. Pozycja nie jest zapisywana.

:::tip Brak lokalizacji?
Sprawdź, czy przeglądarka zezwala witrynie openfiremap.org na lokalizację. Komputer bez GPS może wskazywać przybliżone położenie.
:::

## Hydranty i inne obiekty {#objekte}

| Poziom | Widok |
|---|---|
| poniżej 12 | brak obiektów |
| od 12 | remizy |
| od 14 | symbole remiz i granice gmin |
| od 15 | hydranty, punkty poboru wody i defibrylatory |
| od 17 | symbole z literami |
| od 18 | szczegóły po wskazaniu |

:::figure marker frame=plain
Kliknięcie hydrantu pokazuje promień 100 metrów.
:::

Szczegóły są widoczne po wskazaniu symbolu od poziomu 18. Klawiaturą wybierz symbol przez <kbd>Tab</kbd> od poziomu 17 i naciśnij <kbd>Enter</kbd>. Promień pojawia się od poziomu 16. Po użyciu **Moja lokalizacja** mapa pokazuje także odległość. Dane pochodzą z OpenStreetMap. Zobacz [Współtworzenie](../contribute/), aby uzupełnić brakujące wpisy.

Więcej o kolorach i znakach: [Warstwy i symbole](../layers/).

## Warstwy mapy {#ebenen}

Przycisk mapy oferuje podkłady: standardowy, do druku, nocny, satelitarny, topograficzny, OSM i BayernAtlas. Obiekty strażackie są zawsze na wierzchu.

## Udostępnianie i linki {#teilen}

Przycisk udostępniania kopiuje link do dokładnie tego widoku, z miejscem, przybliżeniem i podkładem. Adres w przeglądarce aktualizuje się podczas przesuwania mapy i można go zapisać jako zakładkę.

## Pole stanu i data danych {#status}

W prawym dolnym rogu są poziom przybliżenia i data danych. „+Sync” oznacza pobrane nowsze zmiany. „Data status details” pokazuje źródło i wiek danych. Zobacz [Dane i aktualność](../data/).

## Informacje, prawo i ustawienia {#info}

„Info & Legal” zawiera odnośniki do pomocy, symboli, nakładki, prywatności i licencji. Tutaj ustawisz pamięć lokalną: wyłączona, 1 godz., 1 dzień, 3, 7 (domyślnie) lub 30 dni.

## Obsługa klawiaturą {#tastatur}

- Pierwszy <kbd>Tab</kbd> prowadzi do „Przejdź do mapy”.
- Strzałki przesuwają mapę; <kbd>+</kbd> i <kbd>−</kbd> zmieniają przybliżenie.
- Od poziomu 17 można wybierać symbole klawiszem <kbd>Tab</kbd>; <kbd>Enter</kbd> lub <kbd>Spacja</kbd> otwiera szczegóły, <kbd>Escape</kbd> je zamyka.
- Fokus pozostaje w menu i oknach dialogowych do ich zamknięcia.
- W eksporcie **Use visible area** wybiera widoczny obszar bez rysowania prostokąta.

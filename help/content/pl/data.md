---
title: Dane i aktualność
description: Źródła i aktualność danych, okno stanu oraz pamięć lokalna.
eyebrow: Dane
lead: Obiekty strażackie pochodzą z OpenStreetMap. OpenFireMap przygotowuje je do szybkiego ładowania i pobiera nowe zmiany.
order: 4
---

## Źródła danych {#quelle}

Społeczność [OpenStreetMap](https://www.openstreetmap.org/) dodaje hydranty, punkty wody, remizy i defibrylatory. OpenFireMap wyświetla te dane, ale ich nie zmienia.

## Jak mapa ładuje hydranty {#ladeweg}

- **Przygotowane kafelki:** Niemcy, Austria, Szwajcaria, Liechtenstein, Luksemburg i 40 kolejnych krajów europejskich korzystają z danych przygotowanych z wyprzedzeniem.
- **Overpass API:** w pozostałych miejscach mapa pyta bezpośrednio o widoczny obszar i jego margines.

W krajach objętych kafelkami Overpass służy tylko do pobierania zmian od daty danych bazowych.

### Czym jest Overpass API {#overpass}

[Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) to publiczna usługa wyszukująca obiekty OpenStreetMap w wybranym obszarze. Szybkość zależy od obciążenia serwera i rozmiaru zapytania. OpenFireMap próbuje kilku serwerów i przechowuje załadowane obszary w pamięci przeglądarki.

## Aktualność danych {#aktualitaet}

| Obszar | Dane bazowe | Nowe i zmienione obiekty |
|---|---|---|
| DACHLiLu | kafelki zwykle codzienne | pobierane przez Overpass |
| 40 kolejnych krajów Europy | zwykle cotygodniowe | Overpass, jeśli dane bazowe mają najwyżej 10 dni |
| reszta świata | stan serwera Overpass | przy każdym zapytaniu |

### Dlaczego nowy obiekt nie pojawia się od razu? {#verzoegerung}

Serwer Overpass musi najpierw przetworzyć zmianę. Pamięć podręczna obszaru i przeglądarki oraz przerwy w działaniu mogą opóźnić widoczność. Nie da się obiecać konkretnego czasu. Usunięte obiekty znikają po następnej aktualizacji danych bazowych.

## Okno „Data status & origin” {#popover}

:::figure data frame=plain
Okno pokazuje źródło danych i stan aktualizacji na żywo.
:::

Na komputerze otwórz je przez „Data status details”; na telefonie dotknij pola stanu. Zobaczysz źródło, datę danych bazowych i stan aktualizacji.

## Strona stanu {#statusseite}

[Strona stanu](/status/) pokazuje wiek danych i liczbę obiektów dla każdego kraju.

## Pamięć lokalna {#cache}

W **Local Cache** w „Info & Legal” wybierz: wyłączona, 1 godz., 1 dzień, 3 dni, 7 dni (domyślnie) lub 30 dni. Dane pozostają na urządzeniu i są sprawdzane przy ponownym otwarciu obszaru.

## Bez internetu {#offline}

OpenFireMap nie działa w pełni offline. Obszary z pamięci mogą pozostać widoczne, ale nowe miejsca i wyszukiwanie wymagają internetu. Bez sieci użyj wydrukowanego [planu miasta](../town-plan/) lub [eksportu](../export/).

## Długie ładowanie {#laden}

Przybliż mapę, aby zmniejszyć zapytanie, i spróbuj ponownie później. Jeśli wszystkie serwery Overpass są przeciążone, trzeba poczekać.

:::warn Nie jest narzędziem operacyjnym
Dane mogą być niepełne, nieaktualne lub błędne. Nie zastępują informacji dyspozytorni ani wodociągów. W nagłym wypadku zadzwoń pod lokalny numer alarmowy.
:::

---
title: Dodaj hydranty
description: Dodawaj hydranty, punkty poboru wody i defibrylatory do OpenStreetMap.
eyebrow: Współtworzenie
lead: Każdy hydrant został dodany przez użytkownika. Brakujące obiekty możesz uzupełnić bezpłatnym kontem OpenStreetMap.
order: 7
---

## Zanim zaczniesz {#vorher}

OpenFireMap pokazuje dane z [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Edycja odbywa się w OSM, a nie w OpenFireMap.

:::steps
1. Załóż konto na openstreetmap.org.
2. Potwierdź adres e-mail.
3. Zaloguj się do jednego z narzędzi poniżej.
:::

:::warn Trzy zasady
- Dodawaj tylko to, co sprawdziłeś w terenie.
- Nie kopiuj chronionych planów bez zgody.
- Przy zapisie krótko opisz zmianę.
:::

## Wybierz narzędzie {#werkzeug}

| Sytuacja | Narzędzie |
|---|---|
| W terenie z telefonem | **Hydrantenjäger** |
| Uzupełnianie danych podczas spaceru | **StreetComplete** lub **Every Door** |
| Edycja na komputerze | edytor **iD** |
| Zaawansowana praca lub wiele hydrantów | **JOSM** lub **Vespucci** |

## Hydrantenjäger {#hydrantenjaeger}

Zaloguj się kontem OSM, stań kilka metrów od hydrantu, wybierz typ i położenie, a następnie prześlij dane. Średnicę i numer podaj tylko, jeśli je znasz. Zobacz [przewodnik](https://hydrantenjaeger.de/help/).

## StreetComplete lub Every Door {#apps}

StreetComplete pomaga uzupełniać dane istniejących obiektów. Every Door umożliwia dodawanie punktów: wybierz **Fire Hydrant** i wypełnij pola.

## Edytor iD {#id}

:::steps
1. Zaloguj się na openstreetmap.org i przybliż mapę do miejsca.
2. Wybierz **Edit** i postaw punkt dokładnie przy hydrancie.
3. Wyszukaj „hydrant” i wybierz **Fire Hydrant**.
4. Podaj typ, położenie i znane szczegóły.
5. Kliknij **Save**, dodaj krótki komentarz i prześlij zmiany.
:::

Istniejące obiekty można poprawiać w ten sam sposób. Nie usuwaj hydrantu, jeśli nie masz pewności, że już go nie ma.

## JOSM lub Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) na komputer i [Vespucci](https://vespucci.io/) na Androida pokazują wszystkie znaczniki i są przydatne przy większych zadaniach.

## Najważniejsze znaczniki {#tags}

| Obiekt | Znacznik |
|---|---|
| Hydrant | `emergency=fire_hydrant` |
| Typ | `fire_hydrant:type=underground` (także pillar, wall, pipe) |
| Średnica | `fire_hydrant:diameter=80` |
| Numer | `ref=123` |
| Punkt ssawny | `emergency=suction_point` |
| Zbiornik | `emergency=water_tank` |
| Defibrylator | `emergency=defibrillator` |
| Remiza | `amenity=fire_station` |

Zobacz [symbole](/symbols/) i [wiki OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Kiedy zmiana będzie widoczna? {#anzeige}

Hydrant pojawi się, gdy Overpass przetworzy zmianę. Czas może się różnić. Więcej w [Dane i aktualność](../data/#verzoegerung).

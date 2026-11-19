---
title: Dostępność
description: Obsługa OpenFireMap klawiaturą, czytnikiem ekranu, powiększeniem i ograniczeniem ruchu.
eyebrow: Dostępność
lead: OpenFireMap ma działać bez myszy, z czytnikiem ekranu i przy dużym powiększeniu. Oto możliwości i znane ograniczenia.
order: 9
---

## Nasz cel {#ziel}

Mapa kieruje się wytycznymi WCAG 2.2 na poziomie AA. Automatyczne kontrole sprawdzają klawiaturę, etykiety, kontrast, powiększenie 400% i rozmiar elementów sterujących.

:::note Rzeczywisty stan
Testy automatyczne nie wykrywają wszystkiego. Pełne testy czytników ekranu na urządzeniach są jeszcze potrzebne. Zgłoś nam zauważone problemy.
:::

## Klawiatura {#tastatur}

| Klawisz | Działanie |
|---|---|
| <kbd>Tab</kbd> | następny element; pierwszy to „Przejdź do mapy” |
| Strzałki | przesuwają mapę, gdy ma fokus |
| <kbd>+</kbd>/<kbd>−</kbd> | przybliżanie i oddalanie |
| <kbd>Tab</kbd> od poziomu 17 | przechodzenie między symbolami |
| <kbd>Enter</kbd>/<kbd>Spacja</kbd> | otwarcie szczegółów |
| <kbd>Escape</kbd> | zamknięcie szczegółów, menu i okien |

Fokus jest widoczny. W eksporcie **Use visible area** wybiera widok bez rysowania myszą. Elementy planu miasta można przesuwać klawiszami strzałek.

## Czytnik ekranu {#screenreader}

Mapa jest opisana jako region, symbole mają nazwy, a komunikaty są odczytywane. Pole stanu jest celowo ciche podczas przesuwania. Etykiety są dostępne we wszystkich językach mapy. Ta pomoc jest dostępna po polsku, niemiecku i angielsku.

:::tip Wiele symboli
Poniżej poziomu 17 punkty nie są dostępne pojedynczo, aby uniknąć setek przystanków Tab. Przybliż mapę klawiszem <kbd>+</kbd>.
:::

## Widzenie i powiększenie {#sehen}

- Kontrast sprawdzono na jasnych i ciemnych podkładach.
- Przy powiększeniu przeglądarki do 400% interfejs przechodzi do wąskiego widoku z menu.
- Hydranty różnią się także literami, nie tylko kolorem.
- **Print (Light)** i **Night (Dark)** mogą pomóc przy odblaskach.

## Ruch {#bewegung}

Po włączeniu „Reduce motion” w systemie mapa przechodzi do wyniku bez animacji.

## Telefon {#smartphone}

Przyciski mają co najmniej 24 × 24 px. Szczegóły symbolu otwiera dotknięcie. VoiceOver i TalkBack umożliwiają obsługę menu. Zobacz [Mapa na telefonie](../phone/).

## Nieprzetestowane {#offen}

- pełne testy z VoiceOver, TalkBack i NVDA
- kontrast symboli na wszystkich podkładach, szczególnie satelitarnym
- asystent planu miasta z czytnikiem ekranu

## Zgłoś barierę {#melden}

Napisz na **[info@openfiremap.org](mailto:info@openfiremap.org)**, podając urządzenie, przeglądarkę i czytnik ekranu. Możesz też utworzyć [zgłoszenie na GitHubie](https://github.com/FrnkMrz/OpenFireMapV2/issues).

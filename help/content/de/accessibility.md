---
title: Barrierefreiheit
description: OpenFireMap mit Tastatur, Screenreader, Vergrößerung und reduzierter Bewegung nutzen – was geht, wie es geht und was noch nicht geprüft ist.
eyebrow: Barrierefreiheit
lead: OpenFireMap soll für alle nutzbar sein, auch ohne Maus, mit Screenreader oder mit starker Vergrößerung. Hier steht, wie das geht und wo es noch Lücken gibt.
order: 9
---

## Unser Ziel {#ziel}

Die Karte richtet sich nach den Web-Richtlinien **WCAG 2.2, Stufe AA**. Jede Änderung an OpenFireMap durchläuft automatische Prüfungen: Bedienbarkeit per Tastatur, Beschriftungen für Screenreader, Farbkontraste, Darstellung bei 400 % Vergrößerung und Mindestgröße der Bedienelemente. Diese Hilfe und die Seite Kartenzeichen werden genauso geprüft.

:::note Ehrlicher Stand
Automatische Prüfungen finden nicht alles. Ein Test mit einem echten Screenreader am Gerät steht noch aus. Wenn dir etwas auffällt, schreib uns bitte (Kontakt unten). Jeder Hinweis hilft.
:::

## Mit der Tastatur {#tastatur}

Alles, was mit der Maus geht, geht auch mit der Tastatur:

| Taste | Wirkung |
|---|---|
| <kbd>Tab</kbd> | zum nächsten Bedienelement. Der erste Tab-Stopp ist „Zur Karte springen“. |
| Pfeiltasten | Kartenausschnitt verschieben, wenn die Karte den Fokus hat |
| <kbd>+</kbd> und <kbd>−</kbd> | hinein- und herauszoomen |
| <kbd>Tab</kbd> ab Zoomstufe 17 | von Symbol zu Symbol auf der Karte |
| <kbd>Enter</kbd> oder <kbd>Leertaste</kbd> auf einem Symbol | Details öffnen; bei Hydranten zusätzlich den 100-Meter-Kreis zeichnen |
| <kbd>Escape</kbd> | Details, Kreis, Menüs und Dialoge schließen; den Auswahlmodus beim Export abbrechen |

Der Fokus ist immer deutlich sichtbar. Öffnet sich ein Menü oder Dialog, springt der Fokus hinein und bleibt dort, bis du ihn schließt. Danach kehrt er zu dem Knopf zurück, mit dem du ihn geöffnet hast.

**Export ohne Maus:** Im Export-Menü übernimmt **Sichtbaren Ausschnitt übernehmen** den aktuellen Kartenausschnitt als Auswahl. Ein Rechteck musst du nicht ziehen. Wie es weitergeht, steht unter [Export](../export/).

**Ortsplan ohne Maus:** Im dritten Schritt des Assistenten wählst du Titel, Legende und die anderen Kästen mit <kbd>Tab</kbd> und verschiebst sie mit den Pfeiltasten, mit <kbd>Umschalt</kbd> in größeren Schritten. <kbd>Alt</kbd> + Pfeiltasten ändert die Größe der Karte. Mehr unter [Ortsplan](../town-plan/#schritt-3).

## Mit dem Screenreader {#screenreader}

- **Karte:** Die Karte ist als Bereich mit Namen ausgezeichnet und erklärt, wie sie sich mit der Tastatur bedienen lässt.
- **Symbole:** Ab Zoomstufe 17 hat jedes Symbol einen Namen, zum Beispiel „Hydrant“ mit Typ und Nummer. Öffnest du die Details mit <kbd>Enter</kbd>, liest der Screenreader sie vor.
- **Meldungen:** Hinweise wie „Link kopiert“ oder Ladefehler werden angesagt, Fehler mit Vorrang. Die Status-Box mit Zoom und Datenstand ist bewusst still, damit sie nicht bei jedem Verschieben spricht.
- **Sprachen:** Alle Beschriftungen für Screenreader gibt es in allen Sprachen der Karte. Diese Hilfe gibt es auf Deutsch und Englisch.

:::tip Viele Symbole auf einmal
Unter Zoomstufe 17 sind die Punkte auf der Karte nicht einzeln erreichbar, sonst wären es Hunderte Tab-Stopps. Zoome mit <kbd>+</kbd> hinein, bis die Symbole erscheinen.
:::

## Sehen und Vergrößern {#sehen}

- **Kontraste:** Texte auf den Bedienfeldern erreichen mindestens das Kontrastverhältnis 4,5:1, große Schrift und Symbole 3:1. Weil die Felder halbtransparent über der Karte liegen, misst OpenFireMap die Kontraste gegen hellen und dunklen Kartenhintergrund.
- **Vergrößern:** Die Seite lässt sich im Browser bis 400 % vergrößern. Dann schaltet sie auf die schmale Ansicht mit Menü um, und alle Menüs bleiben erreichbar und scrollbar.
- **Farbe nicht allein:** Hydranten unterscheiden sich nicht nur durch Farbe, sondern auch durch den Buchstaben im Symbol (U, O, Ø …).
- **Hintergrund:** Für schwache Kontraste oder Blendung helfen die Hintergründe **Druck (Hell)** oder **Nacht (Dunkel)**. Siehe [Ebenen & Kartenzeichen](../layers/).

## Bewegung {#bewegung}

Ist in deinem Betriebssystem **Bewegung reduzieren** eingeschaltet, verzichtet OpenFireMap auf Animationen: Die Karte springt beim Suchen und Orten, statt zu fliegen. Auch diese Hilfe zeigt dann keine Bewegungen.

## Am Smartphone {#smartphone}

Die Bedienelemente sind mindestens 24 × 24 Pixel groß. Die Details eines Symbols öffnest du mit einem Tipp, ab Zoomstufe 17. Mit VoiceOver oder TalkBack erreichst du die Knöpfe über das Menü oben links. Mehr unter [Karte am Smartphone](../phone/).

## Was noch nicht geprüft ist {#offen}

- ein vollständiger Test mit Screenreadern am Gerät (VoiceOver, TalkBack, NVDA)
- Kontraste der Symbole gegen alle Hintergrundkarten, vor allem Satellit
- die Bedienung des Ortsplan-Assistenten mit Screenreader

## Barriere gefunden? {#melden}

Schreib uns, was nicht funktioniert hat, mit welchem Gerät, Browser und gegebenenfalls Screenreader: **[info@openfiremap.org](mailto:info@openfiremap.org)**. Technisch Interessierte können auch ein [Issue auf GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues) anlegen.

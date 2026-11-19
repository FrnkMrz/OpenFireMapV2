---
title: Accessibilité
description: Utiliser OpenFireMap au clavier, avec un lecteur d’écran, un fort agrandissement et la réduction des animations.
eyebrow: Accessibilité
lead: OpenFireMap doit fonctionner sans souris, avec un lecteur d’écran et à fort agrandissement. Voici les fonctions et les limites connues.
order: 8
---

## Notre objectif {#ziel}

La carte suit les recommandations WCAG 2.2 niveau AA. Les contrôles automatisés vérifient le clavier, les libellés, le contraste, le zoom à 400 % et la taille des commandes.

:::note État honnête
Les contrôles automatisés ne détectent pas tout. Des essais complets avec lecteurs d’écran sur appareils restent à faire. Signalez-nous tout problème.
:::

## Au clavier {#tastatur}

| Touche | Action |
|---|---|
| <kbd>Tab</kbd> | commande suivante ; le premier arrêt est « Aller à la carte » |
| Flèches | déplacer la carte lorsqu’elle a le focus |
| <kbd>+</kbd>/<kbd>−</kbd> | zoomer |
| <kbd>Tab</kbd> dès le niveau 17 | parcourir les symboles |
| <kbd>Entrée</kbd>/<kbd>Espace</kbd> | ouvrir les détails |
| <kbd>Échap</kbd> | fermer détails, menus et fenêtres |

Le focus reste visible. Dans l’export, **Use visible area** sélectionne la vue sans tracer de cadre. Dans le plan de ville, les éléments se déplacent avec les flèches.

## Avec un lecteur d’écran {#screenreader}

La carte est une région nommée, les symboles ont un libellé et les notifications sont annoncées. La zone d’état reste silencieuse lors des déplacements. Les libellés sont disponibles dans toutes les langues de la carte. Cette aide est disponible en français, allemand et anglais.

:::tip Beaucoup de symboles
Sous le niveau 17, les points ne peuvent pas être parcourus un par un. Zoomez avec <kbd>+</kbd> jusqu’à voir les symboles.
:::

## Vision et agrandissement {#sehen}

- Le contraste est vérifié sur les fonds clairs et foncés.
- À 400 % de zoom du navigateur, l’interface adopte une vue étroite avec menu.
- Les bornes se distinguent aussi par des lettres, pas seulement par leur couleur.
- **Print (Light)** et **Night (Dark)** peuvent réduire l’éblouissement.

## Animations {#bewegung}

Si l’option « Reduce motion » est activée sur votre système, la carte rejoint directement le résultat au lieu d’animer le déplacement.

## Smartphone {#smartphone}

Les commandes mesurent au moins 24 × 24 px. Touchez un symbole pour l’ouvrir. VoiceOver et TalkBack permettent de parcourir les boutons du menu. Voir [Carte sur smartphone](../phone/).

## Tests restant à faire {#offen}

- test complet avec VoiceOver, TalkBack et NVDA
- contraste des symboles sur chaque fond, surtout satellite
- assistant de plan de ville avec lecteur d’écran

## Signaler un obstacle {#melden}

Écrivez à **[info@openfiremap.org](mailto:info@openfiremap.org)** en précisant l’appareil, le navigateur et le lecteur d’écran utilisé. Vous pouvez aussi ouvrir un [ticket GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).

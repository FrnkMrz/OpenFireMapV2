---
title: Export
description: Exporter un plan de bornes en PNG ou PDF et des objets en GPX ou CSV.
eyebrow: Export
lead: Transformez une vue de carte en plan imprimable ou en liste de points pour la navigation et les tableurs.
order: 5
---

## Quel format choisir ? {#formate}

| Format | Résultat |
|---|---|
| **PNG** | image avec titre, échelle, date et attribution |
| **PDF** | même plan prêt à imprimer |
| **GPX** | objets sous forme de points de cheminement |
| **CSV** | tableau des informations de chaque objet |

L’export est réservé aux ordinateurs. Pour un plan avec quadrillage et index des rues, utilisez le [plan de ville](../town-plan/).

## Étapes {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Menu d’export.
:::

:::steps
1. Ouvrez le menu avec le bouton représentant une flèche vers le bas.
2. Choisissez le format libre ou A4 paysage/portrait.
3. Tracez un rectangle ou choisissez **Use visible area**.
4. Sélectionnez le niveau de détail de 15 à 18.
5. Choisissez PNG, PDF, GPX ou CSV.
6. Vérifiez le titre et sélectionnez **Create**.
:::

Une fenêtre indique la progression ; **Cancel Process** interrompt l’export.

## Contenu du plan {#plan}

Le PNG et le PDF contiennent la zone, le fond de carte, les objets, le titre, l’échelle, la date et l’attribution OpenStreetMap.

## GPX et CSV {#gpx-csv}

**GPX** contient les objets sous forme de points avec leur nom et leurs détails. **CSV** est un tableau avec le type, la référence, les coordonnées et les autres informations disponibles.

:::figure title frame=plain
Le titre suggéré peut être modifié avant la création du plan.
:::

## Limites {#grenzen}

La zone maximale est de 10 × 10 km. Pour une grande zone, choisissez moins de détails ou sélectionnez un cadre plus petit. Conservez toujours la mention « © OpenStreetMap contributors ».

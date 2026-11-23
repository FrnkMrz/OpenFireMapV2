---
title: Données et actualité
description: Origine et fraîcheur des données, fenêtre d’état et cache local.
eyebrow: Données
lead: Les objets de secours viennent d’OpenStreetMap. OpenFireMap les prépare pour accélérer l’affichage et récupère les changements récents.
order: 4
---

## Origine des données {#quelle}

La communauté [OpenStreetMap](https://www.openstreetmap.org/) ajoute les bornes, points d’eau, casernes et défibrillateurs. OpenFireMap affiche ces données sans les modifier.

## Chargement des bornes {#ladeweg}

- **Tuiles préparées :** Allemagne, Autriche, Suisse, Liechtenstein, Luxembourg et 40 autres pays européens utilisent des données préparées à l’avance.
- **API Overpass :** ailleurs, la carte interroge directement la zone visible et une marge autour.

Dans les pays couverts, Overpass ne sert qu’à récupérer les changements depuis la date des données de base.

### L’API Overpass {#overpass}

[Overpass](https://wiki.openstreetmap.org/wiki/Overpass_API) est un service public qui recherche des objets OpenStreetMap dans une zone. La charge du serveur et la taille de la requête influencent le délai. OpenFireMap essaie plusieurs serveurs et conserve les zones chargées dans le cache du navigateur.

## Fraîcheur des données {#aktualitaet}

| Zone | Données de base | Nouveaux changements |
|---|---|---|
| DACHLiLu | tuiles généralement renouvelées chaque jour | demandés à Overpass |
| 40 autres pays européens | tuiles généralement renouvelées chaque semaine | Overpass si les données de base ont moins de 10 jours |
| reste du monde | état du serveur Overpass | à chaque requête |

### Pourquoi un nouvel objet n’apparaît-il pas tout de suite ? {#verzoegerung}

Le serveur Overpass doit d’abord traiter le changement. Le cache de la zone, le cache local ou une interruption peuvent retarder son affichage. Aucun délai fixe ne peut être garanti. Les objets supprimés disparaissent à la prochaine mise à jour des données préparées.

## Fenêtre « Data status & origin » {#popover}

:::figure data frame=plain
La fenêtre indique la source et l’état de la mise à jour en direct.
:::

Sur ordinateur, ouvrez-la avec « Data status details » ; sur smartphone, touchez la zone d’état. Elle indique la source, la date de base et la disponibilité des changements récents.

## Page d’état {#statusseite}

La [page d’état](/status/) indique l’ancienneté des données et le nombre d’objets par pays.

## Cache local {#cache}

Dans **Local Cache**, sous « Info & Legal », choisissez : désactivé, 1 h, 1 j, 3 j, 7 j (par défaut) ou 30 j. Les données restent sur votre appareil et sont vérifiées lors d’une nouvelle visite.

## Sans Internet {#offline}

OpenFireMap n’est pas une carte hors ligne. Les zones en cache peuvent rester visibles, mais les nouvelles zones et la recherche nécessitent une connexion. Utilisez un [plan imprimé](../town-plan/) ou un [export](../export/).

## Chargement lent {#laden}

Zoomez pour réduire la requête et réessayez un peu plus tard. Si tous les serveurs Overpass sont surchargés, il faut patienter.

:::warn Pas un outil opérationnel
Les données peuvent être incomplètes, anciennes ou erronées. Elles ne remplacent pas les informations des services de secours ou des distributeurs d’eau.
:::

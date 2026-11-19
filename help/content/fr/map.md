---
title: La carte sur ordinateur
description: Recherche, localisation, fonds de carte, détails des bornes, partage et utilisation au clavier.
eyebrow: Carte
lead: Les outils sont en haut à gauche et la date des données en bas à droite. Voici le rôle de chaque bouton.
order: 1
---

## Vue d’ensemble {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap sur ordinateur.
:::

1. **Recherche :** trouver un lieu ou une adresse.
2. **Ma position :** afficher votre emplacement.
3. **Fonds de carte :** changer le fond.
4. **Export :** enregistrer un plan ou des points.
5. **Partager :** copier un lien vers la vue actuelle.
6. **Borne :** survoler pour les détails, cliquer pour afficher un rayon de 100 mètres.
7. **État :** niveau de zoom et date des données.
8. **Infos et mentions légales :** aide, symboles et informations juridiques.

## Trouver un lieu {#suche}

Saisissez un lieu, une rue ou une adresse dans la recherche, puis appuyez sur <kbd>Entrée</kbd> ou sur la loupe. La carte affiche le premier résultat au niveau 16. La recherche utilise Nominatim et trouve des lieux et adresses, pas les bornes individuelles.

## Ma position {#standort}

Le bouton de localisation affiche votre position et zoome au niveau 17. Le navigateur demande l’autorisation la première fois. Votre position reste dans le navigateur et n’est pas enregistrée.

:::tip Pas de position ?
Vérifiez que le navigateur autorise la localisation pour openfiremap.org. Sans GPS, la position d’un ordinateur peut être approximative.
:::

## Bornes et autres objets {#objekte}

| Zoom | Affichage |
|---|---|
| inférieur à 12 | aucun objet |
| à partir de 12 | casernes |
| à partir de 14 | symboles des casernes et limites communales |
| à partir de 15 | bornes, points d’eau et défibrillateurs |
| à partir de 17 | symboles avec lettres |
| à partir de 18 | détails au survol |

:::figure marker frame=plain
Cliquer sur une borne affiche un rayon de 100 mètres.
:::

À partir du niveau 18, survolez un symbole pour voir ses détails. Au clavier, sélectionnez-le avec <kbd>Tab</kbd> dès le niveau 17 et appuyez sur <kbd>Entrée</kbd>. Le rayon apparaît dès le niveau 16. Après **Ma position**, une ligne indique aussi la distance. Les informations viennent d’OpenStreetMap : type, diamètre, numéro, exploitant, etc. [Contribuer](../contribute/) explique comment compléter les données.

Consultez [Fonds et symboles](../layers/) pour les couleurs et symboles.

## Fonds de carte {#ebenen}

Le bouton de carte propose les fonds standard, impression, nuit, satellite, topographique, OSM et BayernAtlas. Les objets de secours restent au premier plan. Plus d’explications dans [Fonds et symboles](../layers/).

## Partager et liens {#teilen}

Le bouton de partage copie un lien vers cette vue exacte, y compris le lieu, le zoom et le fond. L’adresse du navigateur évolue avec la carte et peut aussi être enregistrée comme favori.

## État et date des données {#status}

En bas à droite figurent le zoom et la date des données. « +Sync » indique que des changements récents ont été chargés. « Data status details » affiche la source et l’ancienneté. Voir [Données et actualité](../data/).

## Informations, mentions et réglages {#info}

« Info & Legal » donne accès à cette aide, aux symboles, à la superposition, à la confidentialité et aux licences. Le cache local se règle ici : désactivé, 1 h, 1 j, 3 j, 7 j (par défaut) ou 30 j.

## Au clavier {#tastatur}

- Le premier <kbd>Tab</kbd> mène à « Aller à la carte ».
- Les flèches déplacent la carte ; <kbd>+</kbd> et <kbd>−</kbd> modifient le zoom.
- Dès le niveau 17, <kbd>Tab</kbd> parcourt les symboles. <kbd>Entrée</kbd> ou <kbd>Espace</kbd> ouvre les détails ; <kbd>Échap</kbd> les ferme.
- Le focus reste dans les menus et fenêtres jusqu’à leur fermeture.
- Dans l’export, **Use visible area** sélectionne la vue sans tracer de rectangle.

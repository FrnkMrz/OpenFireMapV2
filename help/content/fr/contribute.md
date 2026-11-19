---
title: Ajouter des bornes
description: Ajouter des bornes d’incendie, des points d’eau et des défibrillateurs à OpenStreetMap.
eyebrow: Contribuer
lead: Chaque borne de la carte a été ajoutée par quelqu’un. Vous pouvez compléter la carte avec un compte OpenStreetMap gratuit.
order: 7
---

## Avant de commencer {#vorher}

OpenFireMap affiche les données d’[OpenStreetMap](https://www.openstreetmap.org/) (OSM). Les modifications se font dans OSM, pas dans OpenFireMap.

:::steps
1. Créez un compte sur openstreetmap.org.
2. Confirmez votre adresse e-mail.
3. Connectez-vous à l’un des outils ci-dessous.
:::

:::warn Trois règles
- Ajoutez uniquement ce que vous avez vérifié sur place.
- Ne copiez pas de plans protégés sans autorisation.
- Décrivez brièvement vos changements lors de l’enregistrement.
:::

## Choisir un outil {#werkzeug}

| Situation | Outil |
|---|---|
| Sur place avec un téléphone | **Hydrantenjäger** |
| Compléter des détails en promenade | **StreetComplete** ou **Every Door** |
| Modifier sur ordinateur | éditeur **iD** |
| Travail avancé ou nombreuses bornes | **JOSM** ou **Vespucci** |

## Avec Hydrantenjäger {#hydrantenjaeger}

Connectez-vous avec votre compte OSM, placez-vous à quelques mètres de la borne, choisissez le type et la position, puis envoyez les données. N’indiquez le diamètre et le numéro que si vous les connaissez. Consultez le [guide](https://hydrantenjaeger.de/help/).

## StreetComplete ou Every Door {#apps}

StreetComplete aide à compléter les informations d’objets existants. Every Door permet d’ajouter de nouveaux points : choisissez **Fire Hydrant** et renseignez les champs.

## Éditeur iD {#id}

:::steps
1. Connectez-vous sur openstreetmap.org et zoomez sur le lieu.
2. Choisissez **Edit** et placez un point à l’emplacement exact.
3. Recherchez « hydrant » et choisissez **Fire Hydrant**.
4. Renseignez le type, la position et les informations connues.
5. Choisissez **Save**, ajoutez un commentaire puis envoyez les modifications.
:::

Vous pouvez corriger un objet existant de la même façon. Ne supprimez une borne que si vous avez vérifié qu’elle n’existe plus.

## JOSM ou Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) sur ordinateur et [Vespucci](https://vespucci.io/) sur Android montrent toutes les balises et conviennent aux modifications importantes.

## Balises principales {#tags}

| Objet | Balise |
|---|---|
| Borne | `emergency=fire_hydrant` |
| Type | `fire_hydrant:type=underground` (aussi pillar, wall, pipe) |
| Diamètre | `fire_hydrant:diameter=80` |
| Numéro | `ref=123` |
| Point d’aspiration | `emergency=suction_point` |
| Réservoir | `emergency=water_tank` |
| Défibrillateur | `emergency=defibrillator` |
| Caserne | `amenity=fire_station` |

Voir les [symboles](/symbols/) et le [wiki OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Quand le changement apparaît-il ? {#anzeige}

La borne apparaît après le traitement par Overpass. Le délai varie. Plus d’informations dans [Données et actualité](../data/#verzoegerung).

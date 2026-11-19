---
title: Añadir hidrantes
description: Añade hidrantes, puntos de agua y desfibriladores a OpenStreetMap.
eyebrow: Contribuir
lead: Cada hidrante del mapa lo añadió alguien. Si falta uno, puedes añadirlo con una cuenta gratuita de OpenStreetMap.
order: 7
---

## Antes de empezar {#vorher}

OpenFireMap muestra datos de [OpenStreetMap](https://www.openstreetmap.org/) (OSM). La edición se hace en OSM, no en OpenFireMap.

:::steps
1. Crea una cuenta en openstreetmap.org.
2. Confirma tu correo electrónico.
3. Inicia sesión en una de las herramientas siguientes.
:::

:::warn Tres reglas
- Añade solo lo que hayas comprobado en el lugar.
- No copies planos protegidos sin permiso.
- Al guardar, describe brevemente el cambio.
:::

## Qué herramienta usar {#werkzeug}

| Situación | Herramienta |
|---|---|
| En el lugar con móvil | **Hydrantenjäger** |
| Añadir detalles durante un paseo | **StreetComplete** o **Every Door** |
| Editar puntos en ordenador | editor **iD** |
| Edición avanzada o muchos hidrantes | **JOSM** o **Vespucci** |

## Hydrantenjäger {#hydrantenjaeger}

Inicia sesión con tu cuenta OSM, sitúate a unos metros del hidrante, elige tipo y posición y súbelo. Añade diámetro y número solo si los conoces. Consulta la [guía](https://hydrantenjaeger.de/help/).

## StreetComplete o Every Door {#apps}

StreetComplete ayuda a completar información de objetos existentes. Every Door permite añadir puntos nuevos: elige **Fire Hydrant** y rellena los campos.

## Editor iD {#id}

:::steps
1. Inicia sesión en openstreetmap.org y acércate al lugar.
2. Pulsa **Edit** y coloca el punto exactamente donde está el hidrante.
3. Busca “hydrant” y elige la plantilla **Fire Hydrant**.
4. Completa tipo, posición y detalles conocidos.
5. Pulsa **Save**, escribe un comentario breve y sube el cambio.
:::

Puedes corregir objetos existentes del mismo modo. No borres un hidrante salvo que hayas confirmado que ya no existe.

## JOSM o Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) para ordenador y [Vespucci](https://vespucci.io/) para Android muestran todas las etiquetas y son útiles para tareas grandes.

## Etiquetas principales {#tags}

| Objeto | Etiqueta |
|---|---|
| Hidrante | `emergency=fire_hydrant` |
| Tipo | `fire_hydrant:type=underground` (también pillar, wall, pipe) |
| Diámetro | `fire_hydrant:diameter=80` |
| Número | `ref=123` |
| Punto de aspiración | `emergency=suction_point` |
| Depósito de agua | `emergency=water_tank` |
| Desfibrilador | `emergency=defibrillator` |
| Parque de bomberos | `amenity=fire_station` |

Consulta [símbolos del mapa](/symbols/) y la [wiki de OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Cuándo aparece el cambio {#anzeige}

El hidrante aparece cuando Overpass procesa el cambio. No hay un plazo fijo. Más detalles en [Datos y actualidad](../data/#verzoegerung).

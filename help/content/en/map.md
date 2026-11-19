---
title: The map on a computer
description: Search, location, map layers, hydrant details, sharing, status box and keyboard use of OpenFireMap on a computer.
eyebrow: Map
lead: All tools sit at the top left, the data date at the bottom right. Here is what every button does and what you see on the map.
order: 1
---

## Overview {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap on a computer: Nuremberg's old town at zoom level 17.
:::

1. **Search:** find a place or address.
2. **My location:** jump to where you are.
3. **Map layers:** change the background map.
4. **Export:** hydrant plan as PNG or PDF, points as GPX or CSV.
5. **Share:** copy a link to this view.
6. **Hydrant:** point at it with the mouse for details, click for the 100 metre circle.
7. **Status box:** zoom level and data date.
8. **Info & Legal:** help, map symbols, legal notice, privacy, settings.

## Find a place {#suche}

Type a place, street or address into the search field at the top left and press <kbd>Enter</kbd> or the magnifier. The map jumps to the first result and zooms to level 16, so hydrants are visible right away.

Search uses Nominatim, the OpenStreetMap search service. It finds places and addresses, not individual hydrants.

## My location {#standort}

The location button shows where you are and zooms to level 17. The first time, your browser asks whether OpenFireMap may use your location. The position is only used in your browser and is not stored.

:::tip No location?
Check that your browser allows location access for openfiremap.org. On a computer without GPS the position is often only accurate to a few hundred metres.
:::

## Hydrants and other objects {#objekte}

What you see depends on the zoom level:

| Zoom level | What appears |
|---|---|
| below 12 | no objects yet |
| from 12 | fire stations |
| from 14 | stations as symbols, municipal borders |
| from 15 | hydrants, water points and defibrillators as coloured dots |
| from 17 | all objects as symbols with a letter |
| from 18 | details on hover |

:::figure marker frame=plain
Clicking a hydrant draws a 100 metre radius.
:::

**Viewing details:** from zoom level 18, details open as soon as you point at a symbol with the mouse. With a keyboard this works from zoom level 17: select the symbol with <kbd>Tab</kbd> and press <kbd>Enter</kbd>.

**Radius and distance:** from zoom level 16, clicking a hydrant shows a dashed circle with a 100 metre radius. This helps you judge which hydrants are within hose length. From zoom level 17 the circle is labelled “100 m”. If you have used **My location** first, OpenFireMap also draws a blue line from you to the hydrant with the distance, from zoom level 17.

The details show what is recorded in OpenStreetMap, for example type, diameter, number, pressure, position or operator. If something is missing, nobody has added it yet. [Contribute](../contribute/) explains how to add it.

The page [Layers & symbols](../layers/) explains the symbols and colours.

## Map layers {#ebenen}

The button with the map icon opens the choice of background maps: standard, print, night, satellite, topographic, two OSM styles and, for Bavaria, BayernAtlas and aerial imagery. The fire service objects always sit on top. [Layers & symbols](../layers/) explains which background suits which task.

## Sharing and links {#teilen}

The share button copies a link to exactly this view to your clipboard. Anyone opening the link sees the same place, zoom level and background.

The address in your browser bar changes as you move the map. It has the form `#zoom/latitude/longitude/background`, for example `openfiremap.org/#17/49.45280/11.07700/voyager`. You can bookmark it too.

## Status box and data date {#status}

The bottom right shows the current zoom level and the data date, for example “As of: 1d ago”. “+Sync” means newer changes from OpenStreetMap have already been loaded. Clicking “Data status details” shows the source, the base data date and the state of the live update. More on [Data & freshness](../data/).

## Info & Legal and settings {#info}

“Info & Legal” at the bottom left opens a dialog with links to this help, the map symbols and the overlay, plus legal notice, privacy and licences. This is also where you set the **local cache**: off, 1 hour, 1 day, 3 days, 7 days (default) or 30 days. Areas you have loaded before then appear faster.

## With a keyboard {#tastatur}

OpenFireMap works entirely without a mouse:

- The first <kbd>Tab</kbd> leads to “Skip to map”.
- On the map, the arrow keys pan the view, <kbd>+</kbd> and <kbd>−</kbd> zoom.
- From zoom level 17, symbols can be reached with <kbd>Tab</kbd>. <kbd>Enter</kbd> or <kbd>Space</kbd> opens the details, <kbd>Escape</kbd> closes them.
- In menus and dialogs, focus stays inside the dialog, and <kbd>Escape</kbd> closes it.
- In the export, “Use visible area” takes the current view without dragging a rectangle.

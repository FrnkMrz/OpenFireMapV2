---
title: Layers & symbols
description: Which background map suits which task, what appears at each zoom level and what the colours and letters of the symbols mean.
eyebrow: Layers & symbols
lead: Beneath the fire service objects lies a background map of your choice. The symbols on top follow fixed colours and letters.
order: 3
---

## Background maps {#hintergrund}

:::figure layers frame=plain
The “Map layers” menu on a computer.
:::

| Background | Good for |
|---|---|
| **Standard (Voyager)** | everyday use: clear streets, house numbers from zoom level 17 |
| **Print (Light)** | printing and export: very light, symbols stand out |
| **Night (Dark)** | at night and in the vehicle, less glare |
| **Satellite (Esri)** | orientation on site: buildings, driveways, vegetation |
| **Topographic (OSM)** | terrain with contour lines, paths and water outside towns |
| **OSM (Intl)** | the familiar OpenStreetMap style |
| **OSM (DE Style)** | OpenStreetMap in the German style |
| **Bavaria Base** | official map of the Bavarian surveying administration, Bavaria only |
| **Bavaria Aerial** | official aerial imagery, Bavaria only |

The chosen background is kept when you share a link and is also used for the [export](../export/).

:::tip Finding house numbers
At zoom levels 17 and 18, Standard and OSM show house numbers. That makes it easy to match a hydrant to an address.
:::

## Zoom levels {#zoom}

OpenFireMap only loads what makes sense for the current view. The zoom level is shown in the status box.

| Zoom level | What appears |
|---|---|
| below 12 | no objects yet (status “Standby”) |
| 12 to 13 | fire stations as dots |
| from 14 | stations as symbols, municipal borders |
| 15 to 16 | hydrants, water points and defibrillators as coloured dots |
| from 16 | 100 metre circle when you tap a hydrant |
| from 17 | symbols with letters, reachable by keyboard |
| 18 | details on hover |

## Colours and symbols {#symbole}

The colour tells you what it is, the letter in the symbol tells you the type:

- **Red:** hydrants. **U** stands for underground hydrant, **O** for pillar hydrant, **Ø** for dry hydrant. Wall hydrants and other types have their own signs.
- **Blue:** water points, for example fire ponds, cisterns, fire water wells or suction points.
- **Green:** defibrillators (AED).
- **Fire stations** have their own building symbol.

From zoom level 17, if several objects lie within 5 metres, the map groups them and shows their number.

The **[map symbols](/symbols/)** page lists every symbol with its OpenStreetMap tags. It is also useful for mappers who want to know how a symbol comes about.

:::note Where the details come from
Type, diameter, number and everything else come from OpenStreetMap. If a hydrant has no type recorded, the map shows a red dot without a letter. [Contribute](../#mitmachen) explains how to add it.
:::

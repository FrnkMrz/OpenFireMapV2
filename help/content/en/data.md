---
title: Data & freshness
description: Where OpenFireMap's data comes from, how current it is, what the data status window shows and what the local cache does.
eyebrow: Data
lead: All fire service objects come from OpenStreetMap. OpenFireMap prepares them for fast loading and fetches new entries live.
order: 4
---

## Where the data comes from {#quelle}

Hydrants, water points, fire stations and defibrillators are added by the [OpenStreetMap](https://www.openstreetmap.org/) community, often by local firefighters. OpenFireMap displays this data but does not change it.

Depending on the area, the map loads in one of two ways:

- **Prepared tiles:** for Germany, Austria, Switzerland, Liechtenstein and Luxembourg plus 40 more European countries, the data is ready-made. This is fast, even for large areas.
- **Live query (Overpass):** everywhere else, OpenFireMap asks a public OpenStreetMap service directly. This works worldwide but takes longer and depends on how busy those services are.

## How current the data is {#aktualitaet}

| Area | Base data | New entries |
|---|---|---|
| Germany, Austria, Switzerland, Liechtenstein, Luxembourg | daily | fetched live |
| 40 more European countries | weekly | fetched live as long as the base data is at most 10 days old |
| rest of the world | always current (live query) | immediately |

After loading the prepared tiles, OpenFireMap asks in the background for everything that has changed in the view since the base data date. New or changed objects usually appear within seconds.

:::note Deleted objects
The live update only detects new and changed objects. A hydrant deleted in OpenStreetMap only disappears with the next base data update, so after at most a day or a week.
:::

## The “Data status & origin” window {#popover}

:::figure data frame=plain
Data status & origin: here with base data from yesterday; the live update was not reachable at that moment.
:::

On a computer, open it with “Data status details” in the status box; on a smartphone, tap the status box.

- **Source:** prepared tiles (DACHLiLu or Europe), live query or local cache.
- **Base data status:** when the country extract was created. With several countries in view, the oldest date applies.
- **Live update:** whether newer changes have been loaded. “Not available” means the live service could not be reached and you see the base data. The button with the arrow tries again.

The status box shows the same in short form, for example “As of: 1d ago +Sync”.

## The status page {#statusseite}

The [status page](/status/) shows for every country how old the OpenStreetMap data is, when the map was last updated and how many hydrants, fire stations and defibrillators there are per inhabitant. It is available in German and English.

## Local cache {#cache}

To show areas you have visited faster, OpenFireMap stores loaded data in your browser. Set how long under **Local Cache** in “Info & Legal” (in the menu on a smartphone): off, 1 hour, 1 day, 3 days, 7 days (default) or 30 days.

The data stays on your device. The cache does not replace updates: areas from the cache are still checked against the current data when you open them.

## Without internet {#offline}

OpenFireMap is not an offline map. Areas from the cache stay visible for a while, but new areas and search need a connection. For operations without a network, a printed [town plan](../town-plan/) or an [export](../export/) is the better choice.

## When loading takes a while {#laden}

With the live query, many users share public servers. If one is busy, OpenFireMap automatically tries the next. If that does not help, zoom in a little so less data is needed, and try again shortly. The message at the bottom shows what is happening.

:::warn Not an operational resource
The data is only as good as the entries in OpenStreetMap. It may be incomplete, outdated or wrong and does not replace information from dispatch centres or water utilities. In an emergency, always call your emergency number (112 in Europe).
:::

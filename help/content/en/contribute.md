---
title: Add hydrants
description: How to add fire hydrants, water points and defibrillators to OpenStreetMap – with Hydrantenjäger, StreetComplete, Every Door, the iD editor or JOSM.
eyebrow: Contribute
lead: Every hydrant on the map was added by someone. If one is missing, you can add it yourself. All you need is a free OpenStreetMap account.
order: 7
---

## Before you start {#vorher}

OpenFireMap shows data from [OpenStreetMap](https://www.openstreetmap.org/) (OSM). So you do not edit in OpenFireMap but in OpenStreetMap. You need an account:

:::steps
1. On [openstreetmap.org](https://www.openstreetmap.org/user/new), choose **Sign Up**.
2. Choose a user name, e-mail address and password, and confirm the e-mail.
3. Use this account to log in to all the tools below.
:::

:::warn Three rules
- **Only add what you have seen on site.** Check position and type right at the hydrant.
- **Do not copy data from other people's plans.** Hydrant plans from water utilities or municipalities are protected by copyright. Only use them with explicit permission.
- **When saving, briefly describe what you changed**, for example “Added hydrants on Main Street”.
:::

Fire brigades in Germany will find a guide for checking the hydrants of their response area on a drill evening or a walk through town, in German only: [Für Feuerwehren](/help/fire-brigades/).

## Which tool suits you? {#werkzeug}

| You are … | Use | Why |
|---|---|---|
| on site with your phone and want to add a hydrant quickly | **Hydrantenjäger** | made for hydrants, places the point by compass, few fields |
| out and about and like to add things along the way | **StreetComplete** or **Every Door** | answer questions about objects nearby, including hydrants |
| at a computer and want to work on specific places | **iD editor** | runs in the browser on openstreetmap.org, no installation |
| experienced and want to edit many hydrants at once | **JOSM** (computer) or **Vespucci** (Android) | full control over all tags |

## With Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) is a web app for your phone, made for exactly this task:

:::steps
1. Log in with your OpenStreetMap account.
2. Stand about three metres in front of the hydrant and point your phone at it. The app places the point there using GPS and compass.
3. Choose type and position; add diameter and number only if you are sure.
4. Upload. Done.
:::

The detailed guide with all hydrant types is on the [Hydrantenjäger help page](https://hydrantenjaeger.de/help/).

## With StreetComplete or Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) shows questions about objects near you, for example “What type of fire hydrant is this?”. You answer with a tap. The app is mainly meant for filling in missing details on existing objects.
- **[Every Door](https://every-door.app/)** (Android, iOS) is made for adding points. Use the plus button to place a new point, choose “Fire Hydrant” and fill in the fields.

## With the iD editor in your browser {#id}

The iD editor is the standard editor on openstreetmap.org.

:::steps
1. Open [openstreetmap.org](https://www.openstreetmap.org/), log in and zoom to where the hydrant is.
2. Click **Edit** at the top. The first time, a short walkthrough introduces the editor; it is worth it.
3. Click **Point** at the top and place the point exactly where the hydrant is. The aerial imagery helps with orientation.
4. Type “hydrant” into the search field on the left and choose the **Fire Hydrant** preset.
5. Fill in the fields: **Type** (underground, pillar, wall, pipe), **Position** (for example sidewalk or lane), **Diameter** and **Reference** if known.
6. Click **Save** at the top right, write a short comment and click **Upload**.
:::

:::tip Correcting an existing hydrant
Click an existing hydrant, change the fields on the left and save the same way. If it is in the wrong place, drag it to the right spot. Only delete it if you are sure on site that it no longer exists.
:::

## With JOSM or Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) is an editor for the computer (Java), [Vespucci](https://vespucci.io/) its counterpart for Android. Both show all tags directly and suit larger tasks, for example when a fire brigade updates all hydrants in its area after a walk-through. The tags are listed below.

## The most important tags {#tags}

OpenStreetMap describes every object with tags in the form `key=value`. The presets in the apps set them for you. If you enter them directly, use these:

| Object | Tag | Meaning |
|---|---|---|
| Hydrant | `emergency=fire_hydrant` | required for every hydrant |
| | `fire_hydrant:type=underground` | underground hydrant (also `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | nominal diameter in mm, as on the sign |
| | `fire_hydrant:position=sidewalk` | position (also `lane`, `parking_lot`, `green`) |
| | `ref=123` | hydrant number, if there is one |
| | `fire_hydrant:pressure=4` | pressure in bar, only if known |
| Suction point | `emergency=suction_point` | place to draw water from a water body |
| Water tank | `emergency=water_tank` | cistern or fire water tank |
| Fire water pond | `emergency=fire_water_pond` | pond used as a fire water source |
| Defibrillator | `emergency=defibrillator` | plus `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Fire station | `amenity=fire_station` | building or site of the fire service |

The [map symbols](/symbols/) page shows how the tags appear in OpenFireMap. The [OpenStreetMap wiki](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant) describes them in detail.

## When does the change appear? {#anzeige}

After uploading, the hydrant is stored in OpenStreetMap right away. It appears in OpenFireMap once the services the map loads from have processed the change. This is often quick, but there is no fixed time. [Data & freshness](../data/#verzoegerung) explains what can delay it.

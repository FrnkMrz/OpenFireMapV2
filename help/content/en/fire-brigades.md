---
title: For fire brigades
description: How a fire brigade can check and add the hydrants, water points and defibrillators in its response area to OpenStreetMap during a drill or a walk through town.
eyebrow: For fire brigades
lead: One drill evening is enough to check the hydrants in your own response area and add the missing ones. This page shows how to prepare, run and follow up – no prior OpenStreetMap knowledge needed.
order: 8
---

## Why it is worth it {#warum}

Searching for water during an operation costs time. OpenFireMap shows the hydrants, water points and defibrillators that are recorded in [OpenStreetMap](https://www.openstreetmap.org/). If a hydrant is missing there, it is also missing from the map and from the printed [town plan](../town-plan/).

A joint walk gives you more than that:

- **Local knowledge** for new members: whoever has searched for a hydrant once will find it again.
- **A project for the youth fire brigade** that happens outdoors and has a visible result.
- **An up-to-date town plan** to put up in the fire station and for the vehicle folders.
- **A list of defects** for the municipality or water utility: missing signs, hydrants blocked by parked cars or overgrown.

:::note Not an operational document
OpenFireMap is a free project and does not replace official operational documents. In an emergency, call **112**.
:::

## Preparation {#vorbereitung}

The person leading the drill should plan one to two weeks ahead:

:::steps
1. **Coordinate.** Agree with the brigade command that the walk takes place as a regular drill. Let the municipality or water utility know that you are taking stock and will not open any hydrants, and offer to send them the list of defects afterwards.
2. **Divide the area.** Print the [town plan](../town-plan/) of your response area and assign the grid squares to the teams, for example “Team 1: A1 to C4”. As a rough guide, one team covers 15 to 25 hydrants per hour, more in new housing areas, fewer in an old town centre where you have to search.
3. **Look at the current state.** Open OpenFireMap at zoom level 17 or above and see where hydrants are already shown. A [CSV export](../export/#gpx-csv) of the area makes a good checklist for each team.
4. **Create accounts.** Everyone who wants to add data creates their own free OpenStreetMap account beforehand ([here is how](../contribute/#vorher)). Please do not use one shared account for the whole brigade: OpenStreetMap wants to be able to see who changed what.
5. **Describe the activity.** For joint, organised mapping, OpenStreetMap asks for a short description in the OSM wiki: who, where, when, what ([Organised Editing Guidelines](https://osmfoundation.org/wiki/Organised_Editing_Guidelines)). Add the hashtag `#OpenFireMap` to every changeset comment, so your changes are easy to find later.
6. **Get the equipment ready.** Charged phones with [Hydrantenjäger](https://hydrantenjaeger.de/) open in the browser (allow location and compass once in advance), power banks, high-visibility vests, torches, a clipboard with paper for notes and the list of defects.
:::

:::tip Youth fire brigade
For children and teenagers, OpenStreetMap’s rules and parental consent apply. Often it is simpler if the young people search, check and take notes, and a supervisor adds the data with their own account.
:::

## Running the drill {#ablauf}

For a 90-minute drill, this schedule is a good starting point:

| Time | What happens |
|---|---|
| 0–15 min | Briefing: goal, safety, hydrant types and signs, a quick demo of Hydrantenjäger |
| 15–75 min | Teams walk their grid squares: find, check, add or correct every hydrant, note defects |
| 75–90 min | Back at the fire station: short debrief, collect open points and notes |

A team has two or three people: one uses the phone, one watches the traffic and takes notes.

## At the hydrant: six steps {#am-hydranten}

:::steps
1. **Find the hydrant.** Look for the sign. In Germany, “H” stands for hydrant and the number next to it is the nominal size in millimetres. The two numbers on the lines of the sign give the distance from the sign to the hydrant in metres: sideways and forwards.
2. **Check whether it is already recorded.** Look for markers nearby in Hydrantenjäger or OpenFireMap.
3. **Add a new one.** Stand about three metres in front of the hydrant, point the phone at it, choose the type (underground, pillar, wall, suction point …) and the position. Only enter the size and number if you are sure, for example from the sign.
4. **Check an existing one.** Are the type, size and number correct? If the point is more than a few metres off, move it.
5. **Upload.** Without a network connection, note the hydrant on paper (street, house number opposite, type, sign) and add it later.
6. **Note defects separately.** Missing or illegible sign, cover blocked by a parked car, tarred over or overgrown, damaged hydrant: this does **not** belong in OpenStreetMap, but on your list of defects.
:::

How Hydrantenjäger works in detail is explained on the [Hydrantenjäger help page](https://hydrantenjaeger.de/help/) (German). Other tools are presented on the page [Add hydrants](../contribute/#werkzeug).

## Other objects {#weitere-objekte}

If there is time left, these are worth recording too:

- **suction points** at streams and ponds,
- **fire water ponds and tanks** (cisterns),
- **publicly accessible defibrillators**, with access and opening hours if they are posted.

The matching tags are listed in the [table on the page “Add hydrants”](../contribute/#tags).

## Safety and rules {#sicherheit}

:::warn For every team
- **Wear a high-visibility vest** and do not stand on the road. Children and teenagers only with supervision.
- **Do not open or operate hydrants, do not lift covers.** Testing hydrants is the water utility’s job.
- **Only enter private property with permission**, wall hydrants inside buildings only with consent.
- **Photos without people or licence plates.** Hydrantenjäger does not upload photos, they stay on the phone.
- **Only add what you have seen yourselves.** Do not copy hydrant plans from the municipality or water utility, they are protected by copyright.
:::

The brigade command should clarify insurance cover in advance, as for any other drill.

## Follow-up {#nachbereitung}

One or two people at a computer usually need half an hour to an hour:

:::steps
1. **Check that everything has arrived.** New entries do not always appear in OpenFireMap right away. How long it takes depends on the services the map loads from; there is no fixed time. The reasons are explained under [Data & freshness](../data/#verzoegerung).
2. **Add your paper notes**, most easily with the [iD editor](../contribute/#id).
3. **A quick quality check:** duplicate points, hydrants without a type, points in the middle of a roof. You can find your own changes via your profile on openstreetmap.org or via the hashtag `#OpenFireMap`.
4. **Send the list of defects** to the municipality or water utility.
5. **Print the town plan again** and put it up in the fire station, and in the vehicle folders too. The guide [Create a town plan](../town-plan/) shows how.
:::

:::tip Tell us about it
How did your walk go? We are happy to receive experiences and suggestions for this guide at info@openfiremap.org.
:::

## Repeat it regularly {#wiederholen}

Hydrants are added, moved or removed. We recommend one walk a year, for example in spring after the winter road service, plus new housing areas once the streets are finished. For the youth fire brigade, it can become an ongoing task.

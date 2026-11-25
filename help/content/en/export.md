---
title: Export
description: Export a hydrant plan as PNG or PDF and hydrants as GPX or CSV – choosing the area, format, detail level and limits.
eyebrow: Export
lead: A few clicks turn any map view into a hydrant plan for printing or a list of points for navigation devices and spreadsheets.
order: 5
---

## Which format for what? {#formate}

| Format | Result | Good for |
|---|---|---|
| **PNG** | image of the area with title, scale bar, date and credit | notice boards, e-mail, presentations |
| **PDF** | the same plan as PDF | printing, filing |
| **GPX** | hydrants and other objects as waypoints | navigation devices, operations and outdoor apps |
| **CSV** | table with all details per object | spreadsheets, analysis, comparing with your own lists |

Export is only available on a computer. For a designed plan with grid, street index and fixed scale, use the [town plan](../town-plan/).

## Step by step {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
The export menu.
:::

:::steps
1. **Open the export menu:** the button with the down arrow, at the top left next to map layers.
2. **Choose the aspect ratio (1):** **Free** for any area, **A4 landscape** or **A4 portrait** for the proportions of an A4 sheet.
3. **Set the area:** **Select Area on Map (2)** lets you drag a rectangle on the map. **Use visible area (3)** takes the current view (in A4 proportions if chosen). If you select nothing, OpenFireMap exports the visible view.
4. **Choose the detail level (4):** zoom 15 to 18. Higher means more detail and a larger file. For a street, 18 is right; for a whole town, 16 is better.
5. **Click a format:** hydrant map as **PNG (5)** or **PDF**, hydrants as **GPX (6)** or **CSV**.
6. **Check the title:** OpenFireMap suggests a title with the place name. Change it if needed and click **Create**.
:::

:::figure title frame=plain
The title is suggested and can be changed before creating the plan.
:::

While the plan is being created, a progress window shows what is happening. **Cancel Process** stops the export at any time.

## What the plan contains {#plan}

PNG and PDF contain the selected area with the current [background map](../layers/), all fire service objects, municipal borders, the title, a scale bar, date and detail level, and the credit “© OpenStreetMap contributors”.

The file name contains date, time, detail level and title, for example `2026-11-19_14-30_Z18_Nuremberg.png`.

:::tip Readable plans
Switch to the **Print (Light)** background before exporting. The symbols then stand out best and printing uses less ink. **Topographic** goes up to detail level 17.

If you print in black and white, for example on a laser printer, set **Base map** to **B/W**. The map then comes out in strong greys, buildings and road edges stay visible, and the symbols stay in colour. Aerial imagery is only converted to greyscale.
:::

## GPX and CSV {#gpx-csv}

**GPX** contains every object as a waypoint with a name and a description of the key details. You can load the file into navigation devices, operations apps or programs such as OsmAnd and Garmin BaseCamp.

**CSV** is a table with semicolons as separators. Each row is one object with type, subtype, name, reference, coordinates, diameter, pressure, flow rate, address, operator, OSM ID, link to OpenStreetMap, data source and licence. The column headings are in German. Excel, LibreOffice and Numbers open it directly.

## Limits {#grenzen}

- **At most 10 × 10 kilometres.** Larger areas would overload the browser. If you drag a larger rectangle, OpenFireMap limits it and tells you.
- **Below zoom level 15** the map does not show hydrants yet. The export then loads the data itself, which takes a little longer.
- **Computer only.** The export menu is not available on smartphones.
- If the area contains no objects, you see the message “No objects in selected area!”.

:::note Credit
The data is licensed under the Open Database License. If you pass on or display a plan, “© OpenStreetMap contributors” must remain visible. So do not crop the credit.
:::

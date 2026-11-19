---
title: Create a town plan
description: Step by step to a print-ready town and hydrant plan with grid, legend, scale and street index, as PDF or PNG.
eyebrow: Town plan
lead: The town plan turns OpenFireMap into a print-ready sheet from A4 to A1, with grid squares, legend, north arrow, scale bar and street index.
order: 6
---

## What the town plan is for {#wofuer}

A printed plan works without network, without battery and with gloves on. Typical uses:

- **Wall plan** at the fire station with all hydrants in your response area
- **Vehicle folder** with plans of individual districts
- **Training** and briefing new members
- **Pre-planning** for sites with high fire water demand

Unlike the [export](../export/), the town plan has a fixed scale, a grid with squares (A1, B2 …) and a street index that lists the squares for every street.

## What you need {#voraussetzungen}

- **A computer** with a current browser. The town plan is blocked on smartphones because the frame and preview need a large screen.
- **An area in Germany.** The base map of the town plan currently covers Germany. Outside it, the assistant reports that the frame is not within the data area.

Start the town plan at **[openfiremap.org/ortsplan](/ortsplan/)**. The assistant has no place search yet: pan and zoom the map to your town, then draw the frame.

:::note Interface in German
The assistant is currently available in German only. The labels below are given in German with a translation. Your browser remembers your settings for next time.
:::

## Step 1: Area and format {#schritt-1}

:::figure plan-1 frame=browser
Step 1: the frame on the map; on the right paper, orientation, layout and scale.
:::

The light frame on the map shows what goes on the sheet.

- **Moving the frame:** drag the handle at the top centre. Drag the edges and corners to resize it. Pan and zoom the map underneath as usual.
- **Form des Rahmens (frame shape):** **Frei** (free) allows any shape, **Wie das Blatt** (like the sheet) keeps the paper's proportions.
- **Papier (paper):** A4, A3, A2 or A1, plus **Quer** (landscape) or **Hoch** (portrait).
- **Anordnung (layout):** where legend, scale and index go: **Auf der Karte** (on the map) or above, below, left or right of the map.
- **Maßstab (scale):** follows from frame and paper and can be fixed in the list. **Maßstab auf Standardwert runden** rounds, for example, 1:3,870 to 1:4,000.
- **Rahmen einpassen** (fit frame) sets the frame to match the chosen paper.

Below the settings you see the sheet size, map window and the area covered in kilometres. The line below reports whether the frame lies entirely within the data area.

:::tip Which scale?
For a town centre with many hydrants, 1:2,000 to 1:4,000 is easy to read. For a whole village with its surroundings, 1:7,500 to 1:10,000 is often enough. If it gets crowded, choose larger paper rather than a smaller scale.
:::

## Step 2: Content {#schritt-2}

:::figure plan-2 frame=browser
Step 2: texts on the sheet and what the plan contains.
:::

- **Ortsname (place name):** printed large in the title. The assistant suggests the name of the place at the centre of the frame.
- **Überschrift (heading):** printed above the place name, for example “Orts- und Hydrantenplan” (town and hydrant plan).
- **Was steht darin? (contents):** symbols (fire service and hydrants), road types and municipal border, street index. Each can be switched off.
- **Mehr Optionen (more options):** resolution (96 to 300 dpi), number of columns and font size of the index.

:::tip Resolution
150 dpi is enough for screens and normal prints. For large formats or a print shop, choose 300 dpi. The file gets considerably larger.
:::

## Step 3: Arrange {#schritt-3}

:::figure plan-3 frame=browser
Step 3: preview of the sheet with title, map, legend, scale, north arrow, sources and index.
:::

The preview shows where everything sits on the sheet. By default the assistant arranges everything itself. With **Blöcke selbst anordnen** (arrange blocks yourself) you take over:

- **Move:** drag boxes into free areas, or select one with <kbd>Tab</kbd> and move it with the arrow keys (with <kbd>Shift</kbd> in larger steps).
- **Title and map** can be moved too. The map snaps near the edge and always stays fully on the sheet.
- **Map size:** drag the bottom right corner of the map (keyboard: <kbd>Alt</kbd> + arrow keys). The scale stays the same; the map then shows more or less area.
- **Blöcke dürfen auf der Karte liegen** (blocks may sit on the map): legend and scale may cover free map areas, with a white or transparent background.
- **Anordnung zurücksetzen** (reset layout) restores the assistant's suggestion.

Finally, click **Ortsplan erstellen** (create town plan).

## The finished sheet {#blatt}

:::figure plan-sheet frame=browser
The finished sheet with grid squares, legend, scale bar, north arrow and street index.
:::

The sheet opens at full size. In the bar at the top you can still change scale, paper, resolution and texts and apply them with **Neu laden** (reload). If the street index does not fit on the sheet, it continues on a second page; a note above the sheet tells you.

- **PDF speichern** (save PDF): the sheet at paper size, ready to print.
- **PNG speichern** (save PNG): the sheet as an image, for example for a presentation.

## Printing correctly {#drucken}

:::steps
1. Open the PDF and choose **Print**.
2. Set scaling to **Actual size** or **100%**, not “Fit to page”. Only then is the scale correct.
3. Choose the paper size you set in the assistant (A2 and A1 usually at a print shop).
4. After printing, check the scale bar with a ruler.
:::

## Good to know {#wissen}

- The data is as current as OpenStreetMap; the date is printed on the sheet. Print new plans after larger changes in your town.
- The town plan prints the credit “© OpenStreetMap contributors” automatically. It must stay on the plan.
- If a hydrant is missing from the plan, it is missing from OpenStreetMap. [Add it](../#mitmachen) and it will be on your next plan.

:::warn Not an official document
The town plan does not replace plans from the water utility or the municipality. Check important details on site.
:::

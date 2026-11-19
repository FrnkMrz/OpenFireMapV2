---
title: Frequently asked questions
description: Answers to common questions about OpenFireMap – map, data and freshness, export and town plan, contributing, project and legal.
eyebrow: FAQ
lead: Answers to the questions people ask most. Your question is not here? Write to us at info@openfiremap.org.
order: 10
---

## Map and controls {#karte}

### Why don't I see any hydrants? {#keine-hydranten}

Hydrants appear from zoom level 15. Zoom in further. If you still see none, nobody has added any in this area in OpenStreetMap yet. You can [change that yourself](../contribute/).

### How do I open a hydrant's details? {#details}

On a computer, from zoom level 18 a symbol shows its details as soon as you point at it with the mouse. On a smartphone, tap the symbol from zoom level 17. With a keyboard, select it with <kbd>Tab</kbd> from zoom level 17 and press <kbd>Enter</kbd>.

### What does the circle around a hydrant mean? {#kreis}

It has a radius of 100 metres and appears from zoom level 16 when you click or tap a hydrant. It shows at a glance which hydrants are within hose length. If you have used “My location” first, a blue line also shows the distance from you.

### What do the letters in the symbols mean? {#buchstaben}

They show the type: **U** underground hydrant, **O** pillar hydrant, **Ø** dry hydrant. The [map symbols](/symbols/) page explains every symbol.

### How do I share a map view? {#teilen}

With the share button (on a smartphone “Share Map View” in the menu). It copies a link to exactly this view with zoom level and background. You can also bookmark the address in your browser bar.

### Can I install OpenFireMap like an app? {#app}

Yes. On an iPhone in Safari via **Share → Add to Home Screen**, on Android in Chrome via **⋮ → Install app**. No app store is needed. More under [Map on a smartphone](../phone/#app).

### Does the map work offline? {#offline}

Only partly. Areas you have loaded stay stored for a while, depending on the cache setting. New areas and search need a connection. On the road without a network, a printed [town plan](../town-plan/) is more reliable.

## Data and freshness {#daten}

### Where does the data come from? {#herkunft}

From [OpenStreetMap](https://www.openstreetmap.org/). Volunteers, often local firefighters, add hydrants, water points, stations and defibrillators. OpenFireMap displays this data but does not change it.

### Why does the map load faster in Germany than elsewhere? {#schneller}

For Germany, Austria, Switzerland, Liechtenstein, Luxembourg and 40 more European countries, OpenFireMap prepares the data in advance as tiles. Everywhere else it comes directly through the Overpass API, which depends on how busy these public servers are. More under [Data & freshness](../data/#ladeweg).

### When will my new hydrant appear? {#neu}

This cannot be predicted exactly. It appears once the Overpass server has processed the change; caches can delay this a little. If Overpass is overloaded or unreachable, it appears later. Deleted objects only disappear with the next data update. [Data & freshness](../data/#verzoegerung) explains why.

### How current is the data? {#aktuell}

The status box shows the data date, the “Data status & origin” window shows the details. The [status page](/status/) lists how old the data is for every country.

### The map does not load or reports overload. What can I do? {#laedt-nicht}

Zoom in a little so the query gets smaller, and try again shortly. If all servers report overload, the bottleneck is the public Overpass servers. Then the only option is to reload later.

### Is the data binding for operations? {#verbindlich}

No. OpenFireMap is not an operational resource. The data may be incomplete, outdated or wrong and does not replace information from dispatch centres, municipalities or water utilities. In an emergency, always call your emergency number first (112 in Europe).

## Export and town plan {#export}

### Why is there no export on a smartphone? {#export-handy}

Print-ready plans need a lot of memory and a large screen for selecting the area. Export and town plan are therefore only available on a computer.

### How large can an export be? {#export-groesse}

At most 10 × 10 kilometres. If you drag a larger rectangle, OpenFireMap limits it. For a large town with grid and street index, the [town plan](../town-plan/) is the better choice.

### What is the difference between export and town plan? {#unterschied}

The [export](../export/) quickly creates an image or PDF of the area or a list of points (GPX, CSV). The [town plan](../town-plan/) is a designed sheet from A4 to A1 with a fixed scale, grid squares, legend and street index, currently for places in Germany.

### The printed plan does not have the right scale. {#massstab}

Print the PDF at **Actual size** or **100%**, not “Fit to page”, on the paper size you chose in the assistant. Then check the scale bar with a ruler.

### May I print and pass on plans for my fire brigade? {#drucken}

Yes. The data is licensed under the Open Database License. Every plan must keep “© OpenStreetMap contributors” visible. Export and town plan print the credit; do not crop it.

## Contributing {#mitmachen}

### A hydrant is missing or wrong. Who fixes it? {#korrigieren}

You can, in OpenStreetMap. All you need is a free account. The guide with Hydrantenjäger, StreetComplete, iD and JOSM is under [Add hydrants](../contribute/).

### We are a fire brigade and want to record the hydrants in our area. How do we go about it? {#feuerwehr}

Ideally as a drill evening or a walk through town in teams. A step-by-step guide exists for fire brigades in Germany, in German only: [Für Feuerwehren](/help/fire-brigades/). Elsewhere, the guide [Add hydrants](../contribute/) shows the tools.

### May I copy hydrant plans from the municipality or water utility? {#plaene}

Only with explicit permission. Such plans are protected by copyright. It is best to add only what you have seen on site yourself.

### Can I use the fire service layers in my own map? {#overlay}

Yes, with the overlay. You will find information on the [overlay page](/overlay/).

## Project and legal {#projekt}

### Is this an official fire service map? {#offiziell}

No. OpenFireMap is a private, non-commercial project based on OpenStreetMap. It does not officially work with any authority or fire service.

### What does OpenFireMap cost? {#kosten}

Nothing. There is no account, no advertising and no subscription. The source code is available under the MIT licence on [GitHub](https://github.com/FrnkMrz/OpenFireMapV2).

### What data does OpenFireMap store about me? {#datenschutz}

The map runs in your browser. Only settings such as language and cache, the last map view, the town plan settings and map data you have loaded are stored there. For search, map tiles and data your browser contacts external services. The details are in the [privacy policy](/?legal=1).

### How can I reach you? {#kontakt}

By e-mail at [info@openfiremap.org](mailto:info@openfiremap.org). You can also report bugs and wishes as an [issue on GitHub](https://github.com/FrnkMrz/OpenFireMapV2/issues).

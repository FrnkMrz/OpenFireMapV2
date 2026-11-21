---
title: Export
description: Exportera en brandpostplan som PNG eller PDF och brandposter som GPX eller CSV – välj område, format, detaljnivå och känn till begränsningarna.
eyebrow: Export
lead: Med några klick blir en kartvy en brandpostplan för utskrift eller en punktlista för navigationsenheter och kalkylblad.
order: 5
---

## Vilket format passar till vad? {#formate}

| Format | Resultat | Passar för |
|---|---|---|
| **PNG** | bild av området med titel, skalstock, datum och kreditering | anslagstavlor, e-post, presentationer |
| **PDF** | samma plan som PDF | utskrift, arkivering |
| **GPX** | brandposter och andra objekt som vägpunkter | navigation, insatser, friluftsappar |
| **CSV** | tabell med detaljer för varje objekt | kalkylblad, analys, jämförelse med egna listor |

Export finns bara på dator. För en formgiven plan med rutnät, gateregister och fast skala använder du [stadsplanen](../town-plan/).

## Steg för steg {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Exportmenyn.
:::

:::steps
1. **Öppna exportmenyn:** knappen med nedåtpil uppe till vänster bredvid kartlagren.
2. **Välj bildförhållande (1):** **Fritt** för valfritt område, **A4 liggande** eller **A4 stående** för A4-arkets proportioner.
3. **Välj område:** **Välj område på kartan (2)** låter dig dra en rektangel. **Använd synligt område (3)** tar den aktuella vyn (i A4-proportioner om det är valt). Om du inte väljer något exporteras den synliga vyn.
4. **Välj detaljnivå (4):** zoom 15 till 18. Högre nivå ger mer detaljer och en större fil. För en gata passar 18; för en hel stad är 16 bättre.
5. **Välj format:** brandpostkarta som **PNG (5)** eller **PDF**, brandposter som **GPX (6)** eller **CSV**.
6. **Kontrollera titeln:** OpenFireMap föreslår en titel med ortsnamnet. Ändra vid behov och klicka på **Skapa**.
:::

:::figure title frame=plain
Titeln föreslås och kan ändras innan planen skapas.
:::

Ett förloppsfönster visar vad som händer medan planen skapas. **Avbryt processen** stoppar exporten när som helst.

## Det här innehåller planen {#plan}

PNG och PDF innehåller det valda området med den aktuella [bakgrundskartan](../layers/), alla räddningstjänstobjekt, kommungränser, titel, skalstock, datum, detaljnivå och krediteringen «© OpenStreetMap contributors».

Filnamnet innehåller datum, tid, detaljnivå och titel, till exempel `2026-11-19_14-30_Z18_Nuremberg.png`.

:::tip Läsbara planer
Byt till bakgrunden **Utskrift (Light)** före export. Symbolerna syns bäst och utskriften använder mindre bläck. **Topografisk** går upp till detaljnivå 17.
:::

## GPX och CSV {#gpx-csv}

**GPX** innehåller varje objekt som en waypoint med namn och en beskrivning av viktiga detaljer. Filen kan läsas in i navigationsenheter, insatsappar eller program som OsmAnd och Garmin BaseCamp.

**CSV** är en tabell med semikolon som avgränsare. Varje rad är ett objekt med typ, undertyp, namn, referens, koordinater, diameter, tryck, flöde, adress, operatör, OSM-ID, OpenStreetMap-länk, datakälla och licens. Kolumnrubrikerna är på tyska. Excel, LibreOffice och Numbers öppnar filen direkt.

## Begränsningar {#grenzen}

- **Högst 10 × 10 kilometer.** Större områden kan överbelasta webbläsaren. Om du drar en större rektangel begränsar OpenFireMap den och meddelar dig.
- **Under zoomnivå 15** visar kartan inga brandposter ännu. Exporten hämtar då data själv och det tar lite längre tid.
- **Endast dator.** Exportmenyn finns inte på mobil.
- Om området saknar objekt visas meddelandet «Inga objekt i valt område!».

:::note Kreditering
Data är licensierad under Open Database License. Om du delar eller visar en plan måste «© OpenStreetMap contributors» synas. Beskär inte bort krediteringen.
:::

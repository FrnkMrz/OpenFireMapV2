---
title: Lager och symboler
description: Vilken bakgrundskarta som passar till vad, vad som visas på varje zoomnivå och vad symbolernas färger och bokstäver betyder.
eyebrow: Lager och symboler
lead: Under räddningstjänstobjekten ligger en bakgrundskarta som du väljer. Symbolerna ovanpå följer fasta färger och bokstäver.
order: 3
---

## Bakgrundskartor {#hintergrund}

:::figure layers frame=plain
Menyn «Kartlager» på en dator.
:::

| Bakgrund | Passar för |
|---|---|
| **Standard (Voyager)** | vardagsbruk: tydliga gator, husnummer från zoomnivå 17 |
| **Utskrift (Light)** | utskrift och export: ljus bakgrund framhäver symbolerna |
| **Natt (Dark)** | på natten och i fordon, mindre bländning |
| **Satellit (Esri)** | orientering på plats: byggnader, infarter och växtlighet |
| **Topografisk (OSM)** | höjdkurvor, leder och vatten utanför tätorter |
| **OSM (Intl)** | den välkända OpenStreetMap-stilen |
| **OSM (DE Style)** | OpenStreetMap i tysk stil |
| **Bavaria Base** | officiell karta från Bayerns lantmäteri, bara i Bayern |
| **Bavaria Aerial** | officiella flygbilder, bara i Bayern |

Vald bakgrund sparas när du delar en länk och används även för [exporten](../export/).

:::tip Hitta husnummer
På zoomnivå 17 och 18 visar Standard och OSM husnummer. Då är det enkelt att koppla en brandpost till en adress.
:::

## Zoomnivåer {#zoom}

OpenFireMap läser bara in sådant som behövs för den aktuella vyn. Zoomnivån visas i statusrutan.

| Zoomnivå | Vad visas |
|---|---|
| under 12 | inga objekt ännu (status «Standby») |
| 12–13 | brandstationer som punkter |
| från 14 | stationssymboler och kommungränser |
| 15–16 | brandposter, vattenpunkter och hjärtstartare som färgade punkter |
| från 16 | cirkel på 100 meter när du trycker på en brandpost |
| från 17 | symboler med bokstäver, nåbara med tangentbord |
| 18 | detaljer vid pekning |

## Färger och symboler {#symbole}

Färgen visar objektgruppen, bokstaven i symbolen visar typen:

- **Röd:** brandposter. **U** betyder underjordisk, **O** pelarbrandpost och **Ø** torrbrandpost. Väggbrandposter och andra typer har egna tecken.
- **Blå:** vattenpunkter, till exempel branddammar, cisterner, brandvattenbrunnar eller sugpunkter.
- **Grön:** hjärtstartare (AED).
- **Brandstationer** har en egen byggnadssymbol.

Från zoomnivå 17 grupperas objekt som ligger inom 5 meter från varandra, och antalet visas.

Sidan **[Kartsymboler](/symbols/)** listar alla symboler och deras OpenStreetMap-taggar. Den är också användbar för kartläggare som vill förstå hur symbolerna skapas.

:::note Varifrån kommer detaljerna?
Typ, diameter, nummer och övriga uppgifter kommer från OpenStreetMap. Om en brandpost saknar registrerad typ visas en röd punkt utan bokstav. [Bidra](../contribute/) förklarar hur du lägger till den.
:::

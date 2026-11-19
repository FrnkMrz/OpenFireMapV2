---
title: Export
description: Export plánu hydrantů jako PNG nebo PDF a hydrantů jako GPX nebo CSV – výběr oblasti, formátu, úrovně detailů a omezení.
eyebrow: Export
lead: Několika kliknutími vytvoříte z libovolného zobrazení mapy plán hydrantů k tisku nebo seznam bodů pro navigaci a tabulky.
order: 5
---

## Který formát k čemu? {#formate}

| Formát | Výsledek | Vhodné pro |
|---|---|---|
| **PNG** | obrázek oblasti s nadpisem, měřítkem, datem a uvedením zdroje | nástěnky, e-mail, prezentace |
| **PDF** | stejný plán ve formátu PDF | tisk a archivaci |
| **GPX** | hydranty a další objekty jako trasové body | navigace, zásahy a outdoorové aplikace |
| **CSV** | tabulka se všemi podrobnostmi objektů | tabulky, analýzy, porovnání s vlastními seznamy |

Export je dostupný pouze na počítači. Pro navržený plán s mřížkou, rejstříkem ulic a pevným měřítkem použijte [plán města](../town-plan/).

## Krok za krokem {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Nabídka exportu.
:::

:::steps
1. **Otevřete nabídku exportu:** tlačítko se šipkou dolů vlevo nahoře vedle vrstev mapy.
2. **Zvolte poměr stran (1):** **Free** pro libovolnou oblast, **A4 landscape** nebo **A4 portrait** pro poměr stran papíru A4.
3. **Nastavte oblast:** **Select Area on Map (2)** umožňuje tažením vybrat obdélník na mapě. **Use visible area (3)** použije aktuální zobrazení (při výběru formátu A4 v poměru A4). Pokud nic nevyberete, OpenFireMap exportuje viditelné zobrazení.
4. **Zvolte úroveň detailů (4):** přiblížení 15 až 18. Vyšší úroveň znamená více detailů a větší soubor. Pro ulici je vhodná 18, pro celé město spíše 16.
5. **Klikněte na formát:** mapa hydrantů jako **PNG (5)** nebo **PDF**, hydranty jako **GPX (6)** nebo **CSV**.
6. **Zkontrolujte nadpis:** OpenFireMap navrhne nadpis s názvem místa. V případě potřeby ho upravte a klikněte na **Create**.
:::

:::figure title frame=plain
Nadpis se navrhne a před vytvořením plánu ho lze upravit.
:::

Během vytváření plánu okno průběhu ukazuje, co se právě děje. **Cancel Process** export kdykoli zastaví.

## Co plán obsahuje {#plan}

PNG a PDF obsahují vybranou oblast s aktuální [podkladovou mapou](../layers/), všechny objekty hasičských služeb, hranice obcí, nadpis, měřítko, datum, úroveň detailů a uvedení „© OpenStreetMap contributors“.

Název souboru obsahuje datum, čas, úroveň detailů a nadpis, například `2026-11-19_14-30_Z18_Nuremberg.png`.

:::tip Čitelné plány
Před exportem přepněte na podklad **Print (Light)**. Symboly pak lépe vyniknou a tisk spotřebuje méně inkoustu. **Topographic** dosahuje úrovně detailů 17.
:::

## GPX a CSV {#gpx-csv}

**GPX** obsahuje každý objekt jako trasový bod s názvem a popisem důležitých údajů. Soubor můžete načíst do navigace, zásahových aplikací nebo programů jako OsmAnd a Garmin BaseCamp.

**CSV** je tabulka s hodnotami oddělenými středníky. Každý řádek představuje jeden objekt a obsahuje typ, podtyp, název, referenci, souřadnice, průměr, tlak, průtok, adresu, provozovatele, OSM ID, odkaz na OpenStreetMap, zdroj dat a licenci. Záhlaví sloupců jsou v němčině. Excel, LibreOffice a Numbers soubor otevřou přímo.

## Omezení {#grenzen}

- **Maximálně 10 × 10 kilometrů.** Větší oblasti by přetížily prohlížeč. Pokud vytáhnete větší obdélník, OpenFireMap ho omezí a upozorní vás.
- **Pod úrovní přiblížení 15** mapa ještě hydranty nezobrazuje. Export si data načte sám, což chvíli trvá.
- **Pouze počítač.** Nabídka exportu není na smartphonu dostupná.
- Pokud oblast neobsahuje žádné objekty, zobrazí se zpráva „No objects in selected area!“.

:::note Uvedení zdroje
Data jsou licencována pod Open Database License. Při předání nebo zobrazení plánu musí zůstat viditelné „© OpenStreetMap contributors“. Uvedení zdroje proto neořezávejte.
:::

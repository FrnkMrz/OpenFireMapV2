---
title: Vrstvy a symboly
description: Která podkladová mapa se hodí pro jaký úkol, co se zobrazuje na jednotlivých úrovních přiblížení a co znamenají barvy a písmena symbolů.
eyebrow: Vrstvy a symboly
lead: Pod objekty hasičských služeb je podkladová mapa podle vašeho výběru. Symboly nad ní používají pevně dané barvy a písmena.
order: 3
---

## Podkladové mapy {#hintergrund}

:::figure layers frame=plain
Nabídka „Map layers“ na počítači.
:::

| Podkladová mapa | Vhodné použití |
|---|---|
| **Standardní (Voyager)** | každodenní použití: přehledné ulice, čísla domů od úrovně přiblížení 17 |
| **Tisková (Light)** | tisk a export: velmi světlá, symboly dobře vyniknou |
| **Noční (Dark)** | v noci a ve vozidle, méně oslňuje |
| **Satelitní (Esri)** | orientace v terénu: budovy, příjezdy, vegetace |
| **Topografická (OSM)** | terén s vrstevnicemi, cestami a vodními plochami mimo města |
| **OSM (Intl)** | známý styl OpenStreetMap |
| **OSM (DE Style)** | OpenStreetMap v německém stylu |
| **Bavorský podklad** | oficiální mapa bavorského zeměměřického úřadu, pouze Bavorsko |
| **Bavorská letecká mapa** | oficiální letecké snímky, pouze Bavorsko |

Vybraný podklad zůstane zachován při sdílení odkazu a používá se také pro [export](../export/).

:::tip Hledání čísel domů
Na úrovních přiblížení 17 a 18 zobrazují standardní mapa a OSM čísla domů. Snadno tak přiřadíte hydrant k adrese.
:::

## Úrovně přiblížení {#zoom}

OpenFireMap načítá pouze data odpovídající aktuálnímu zobrazení. Úroveň přiblížení vidíte ve stavovém poli.

| Úroveň přiblížení | Co se zobrazuje |
|---|---|
| pod 12 | zatím žádné objekty (stav „Standby“) |
| 12 až 13 | hasičské stanice jako body |
| od 14 | stanice jako symboly, hranice obcí |
| 15 až 16 | hydranty, vodní zdroje a defibrilátory jako barevné body |
| od 16 | kruh o poloměru 100 metrů po klepnutí na hydrant |
| od 17 | symboly s písmeny, dostupné klávesnicí |
| 18 | podrobnosti po najetí myší |

## Barvy a symboly {#symbole}

Barva označuje kategorii objektu, písmeno v symbolu jeho typ:

- **Červená:** hydranty. **U** znamená podzemní, **O** stojanový a **Ø** suchý hydrant. Nástěnné hydranty a další typy mají vlastní značky.
- **Modrá:** vodní zdroje, například požární nádrže, cisterny, požární studny nebo odběrná místa.
- **Zelená:** defibrilátory (AED).
- **Hasičské stanice** mají vlastní symbol budovy.

Od úrovně přiblížení 17 mapa sdružuje objekty vzdálené do 5 metrů a zobrazuje jejich počet.

Na stránce [Symboly mapy](/symbols/) najdete všechny symboly a jejich štítky OpenStreetMap. Hodí se také mapérům, kteří chtějí vědět, jak symbol vzniká.

:::note Odkud pocházejí podrobnosti
Typ, průměr, číslo a všechny další údaje pocházejí z OpenStreetMap. Pokud u hydrantu není typ uveden, mapa zobrazí červený bod bez písmene. Jak ho doplnit, vysvětluje [Přispět](../contribute/).
:::

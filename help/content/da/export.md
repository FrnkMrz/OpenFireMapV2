---
title: Eksport
description: Eksportér en brandhaneplan som PNG eller PDF og objekter som GPX eller CSV.
eyebrow: Eksport
lead: Lav et kort til udskrift eller en liste med punkter til navigation og regneark.
order: 5
---

## Vælg format {#formate}

| Format | Resultat |
|---|---|
| **PNG** | billede med titel, målestok, dato og kildeangivelse |
| **PDF** | samme plan som PDF til udskrift |
| **GPX** | objekter som waypoints |
| **CSV** | tabel med oplysninger om objekterne |

Eksport er kun tilgængelig på computer. Til en plan med gitter og gadeindeks bruges [byplan](../town-plan/).

## Trin for trin {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Eksportmenuen.
:::

:::steps
1. Åbn eksportmenuen via knappen med pil ned.
2. Vælg frit format eller A4 liggende/stående.
3. Tegn et område på kortet, eller vælg **Use visible area**.
4. Vælg detaljeniveau fra zoom 15 til 18.
5. Vælg PNG, PDF, GPX eller CSV.
6. Kontrollér titlen, og vælg **Create**.
:::

Under eksporten vises fremdrift; **Cancel Process** afbryder.

## Område og indhold {#plan}

PNG og PDF indeholder kort, titel, målestok, dato og OpenStreetMap-kreditering. GPX og CSV indeholder objekterne i det valgte område og deres registrerede data.

## GPX og CSV {#gpx-csv}

GPX indeholder waypoints med navn og detaljer. CSV er en tabel med type, reference, koordinater og andre registrerede data.

:::figure title frame=plain
Den foreslåede titel kan ændres før planen oprettes.
:::

## Begrænsninger {#grænser}

Det valgte område må højst være 10 × 10 km. Vælg lavere detaljeniveau for store områder. Hvis området overskrider grænsen, skal du vælge et mindre udsnit.

**Kreditering:** 

Krediteringen “© OpenStreetMap contributors” skal bevares på alle planer.

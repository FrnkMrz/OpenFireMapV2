---
title: Eksport
description: Eksporter en hydrantplan som PNG eller PDF og hydranter som GPX eller CSV. Velg område, format, detaljnivå og kjenn grensene.
eyebrow: Eksport
lead: Noen få klikk gjør kartvisningen om til en hydrantplan for utskrift eller en punktliste for navigasjonsenheter og regneark.
order: 5
---

## Hvilket format passer til hva? {#formate}

| Format | Resultat | Passer til |
|---|---|---|
| **PNG** | bilde av området med tittel, målestokklinjal, dato og kreditering | oppslagstavler, e-post, presentasjoner |
| **PDF** | samme plan som PDF | utskrift, arkivering |
| **GPX** | hydranter og andre objekter som veipunkter | navigasjon, operasjoner og friluftsapper |
| **CSV** | tabell med detaljer for hvert objekt | regneark, analyse, sammenligning med egne lister |

Eksport er bare tilgjengelig på datamaskin. For en utformet plan med rutenett, gateindeks og fast målestokk bruker du [bykartet](../town-plan/).

## Trinn for trinn {#ablauf}

:::figure export frame=plain spots=format,select,view,zoom,png,gpx
Eksportmenyen.
:::

:::steps
1. **Åpne eksportmenyen:** knappen med nedoverpil øverst til venstre ved siden av kartlagene.
2. **Velg sideforhold (1):** **Fritt** for ethvert område, **A4 liggende** eller **A4 stående** for A4-format.
3. **Velg område:** **Velg område på kartet (2)** lar deg dra et rektangel. **Bruk synlig område (3)** tar gjeldende visning (i A4-forhold hvis valgt). Hvis du ikke velger noe, eksporteres den synlige visningen.
4. **Velg detaljnivå (4):** zoom 15 til 18. Høyere nivå gir mer detaljer og større fil. For en gate passer 18; for en hel by er 16 bedre.
5. **Velg format:** hydrantkart som **PNG (5)** eller **PDF**, hydranter som **GPX (6)** eller **CSV**.
6. **Kontroller tittelen:** OpenFireMap foreslår en tittel med stedsnavnet. Endre ved behov og klikk **Opprett**.
:::

:::figure title frame=plain
Tittelen foreslås automatisk og kan endres før planen opprettes.
:::

Et fremdriftsvindu viser hva som skjer mens planen opprettes. **Avbryt prosess** stopper eksporten når som helst.

## Dette inneholder planen {#plan}

PNG og PDF inneholder det valgte området med gjeldende [bakgrunnskart](../layers/), alle brannobjekter, kommunegrenser, tittel, målestokklinjal, dato, detaljnivå og krediteringen «© OpenStreetMap contributors».

Filnavnet inneholder dato, klokkeslett, detaljnivå og tittel, for eksempel `2026-11-19_14-30_Z18_Nuremberg.png`.

:::tip Lesbare planer
Bytt til bakgrunnen **Utskrift (Light)** før eksport. Symbolene blir tydeligere og utskriften bruker mindre blekk. **Topografisk** går opp til detaljnivå 17.
:::

## GPX og CSV {#gpx-csv}

**GPX** inneholder hvert objekt som et veipunkt med navn og beskrivelse av viktige opplysninger. Filen kan brukes i navigasjonsenheter, operasjonsapper eller programmer som OsmAnd og Garmin BaseCamp.

**CSV** er en tabell med semikolon som skilletegn. Hver rad er ett objekt med type, undertype, navn, referanse, koordinater, diameter, trykk, vannføring, adresse, operatør, OSM-ID, lenke til OpenStreetMap, datakilde og lisens. Kolonneoverskriftene er på tysk. Excel, LibreOffice og Numbers åpner den direkte.

## Grenser {#grenzen}

- **Maksimalt 10 × 10 kilometer.** Større områder kan overbelaste nettleseren. Hvis du drar et større rektangel, begrenser OpenFireMap det og varsler deg.
- **Under zoomnivå 15** viser ikke kartet hydrantene ennå. Eksporten henter da dataene selv, og det tar litt lenger tid.
- **Bare datamaskin.** Eksportmenyen finnes ikke på smarttelefon.
- Hvis området ikke inneholder objekter, vises «Ingen objekter i valgt område!».

:::note Kreditering
Dataene er lisensiert under Open Database License. Hvis du deler eller viser en plan, må «© OpenStreetMap contributors» fortsatt være synlig. Ikke beskjær krediteringen.
:::

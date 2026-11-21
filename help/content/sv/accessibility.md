---
title: Tillgänglighet
description: Använd OpenFireMap med tangentbord, skärmläsare, förstoring och minskad rörelse – vad som fungerar och vad som inte testats än.
eyebrow: Tillgänglighet
lead: OpenFireMap ska fungera för alla, även utan mus, med skärmläsare eller kraftig förstoring. Här förklaras hur och vilka brister som återstår.
order: 9
---

## Vårt mål {#ziel}

Kartan följer riktlinjerna **WCAG 2.2 nivå AA**. Varje ändring i OpenFireMap kontrolleras automatiskt för tangentbordsanvändning, skärmläsaretiketter, färgkontrast, visning vid 400 % zoom och minsta storlek på kontroller. Den här hjälpen och sidan med kartsymboler kontrolleras på samma sätt.

:::note Ärlig status
Automatiska kontroller hittar inte allt. Ett test med en riktig skärmläsare på en enhet återstår. Hör av dig om du upptäcker något (kontaktuppgifter nedan). Alla tips hjälper.
:::

## Med tangentbord {#tastatur}

Allt du kan göra med mus går också att göra med tangentbord:

| Tangent | Effekt |
|---|---|
| <kbd>Tab</kbd> | till nästa kontroll; första stoppet är «Hoppa till karta» |
| Piltangenter | flytta kartan när den har fokus |
| <kbd>+</kbd> och <kbd>−</kbd> | zooma in och ut |
| <kbd>Tab</kbd> från nivå 17 | gå från symbol till symbol på kartan |
| <kbd>Enter</kbd> eller <kbd>Space</kbd> på en symbol | öppna detaljer; för brandposter ritas även cirkeln på 100 meter |
| <kbd>Escape</kbd> | stäng detaljer, cirkel, menyer och dialoger; avbryt områdesval i exporten |

Fokus är alltid tydligt synligt. När en meny eller dialog öppnas flyttas fokus in och stannar där tills du stänger den. Sedan återgår det till knappen som öppnade den.

**Export utan mus:** välj **Använd synligt område** i exportmenyn för att ta den aktuella kartvyn. Du behöver inte dra en rektangel. Se [Export](../export/).

**Stadsplan utan mus:** i steg 3 i assistenten väljer du titel, teckenförklaring och andra rutor med <kbd>Tab</kbd> och flyttar dem med piltangenterna; håll <kbd>Shift</kbd> för större steg. <kbd>Alt</kbd> + piltangenter ändrar kartans storlek. Se [Stadsplan](../town-plan/#schritt-3).

## Med skärmläsare {#screenreader}

- **Karta:** markerad som ett namngivet område och beskriver tangentbordsanvändning.
- **Symboler:** från nivå 17 har varje symbol ett namn, till exempel «Brandpost» med typ och nummer. Skärmläsaren läser upp detaljerna när du öppnar dem med <kbd>Enter</kbd>.
- **Meddelanden:** aviseringar som «Länk kopierad» och laddningsfel läses upp; fel prioriteras. Statusrutan med zoom och datadatum är avsiktligt tyst för att inte läsa upp något varje gång kartan flyttas.
- **Språk:** alla kartspråk har etiketter för skärmläsare. Den här hjälpen finns på tyska och engelska.

:::tip Många symboler
Under nivå 17 kan punkterna inte nås en och en, eftersom det skulle bli hundratals Tab-stopp. Zooma in med <kbd>+</kbd> tills symbolerna visas.
:::

## Se och förstora {#sehen}

- **Kontrast:** text i paneler har minst kontrastförhållandet 4,5:1, stor text och symboler 3:1. Eftersom panelerna är delvis genomskinliga över kartan mäts kontrasten mot både ljusa och mörka bakgrunder.
- **Förstoring:** zooma webbläsarsidan till 400 %. Då växlar den till en smal vy med meny, och alla menyer går att nå och rulla.
- **Inte bara färg:** brandposter skiljer sig inte bara åt med färg utan också med bokstaven i symbolen (U, O, Ø …).
- **Bakgrund:** vid svag kontrast eller bländning kan **Utskrift (Light)** eller **Natt (Dark)** hjälpa. Se [Lager och symboler](../layers/).

## Rörelse {#bewegung}

Om **Minska rörelse** är aktiverat i operativsystemet använder OpenFireMap inga animationer: kartan hoppar till sökresultatet eller positionen i stället för att flyga dit. Hjälpen visar då inte heller rörelse.

## På mobil {#smartphone}

Kontrollerna är minst 24 × 24 pixlar. Tryck på en symbol från zoomnivå 17 för att öppna detaljerna. Med VoiceOver eller TalkBack når du knapparna via menyn uppe till vänster. Mer under [Kartan på mobil](../phone/).

## Inte testat än {#offen}

- fullständigt test med skärmläsare på enheter (VoiceOver, TalkBack, NVDA)
- symbolernas kontrast mot alla bakgrundskartor, särskilt satellit
- att använda stadsplansassistenten med skärmläsare

## Hittat ett hinder? {#melden}

Berätta vad som inte fungerade och vilken enhet, webbläsare och eventuell skärmläsare du använde: **[info@openfiremap.org](mailto:info@openfiremap.org)**. Om du är tekniskt kunnig kan du också skapa ett [GitHub-ärende](https://github.com/FrnkMrz/OpenFireMapV2/issues).

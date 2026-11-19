---
title: Mapa na počítači
description: Vyhledávání, poloha, vrstvy mapy, podrobnosti o hydrantech, sdílení, stavové pole a ovládání OpenFireMapu klávesnicí.
eyebrow: Mapa
lead: Všechny nástroje jsou vlevo nahoře, datum dat vpravo dole. Zde se dozvíte, co dělají jednotlivá tlačítka a co vidíte na mapě.
order: 1
---

## Přehled {#ueberblick}

:::figure desktop frame=browser spots=search,locate,layers,export,share,marker,status,legal
OpenFireMap na počítači: staré město Norimberku na úrovni přiblížení 17.
:::

1. **Vyhledávání:** najděte místo nebo adresu.
2. **Moje poloha:** přejděte tam, kde se nacházíte.
3. **Vrstvy mapy:** změňte podkladovou mapu.
4. **Export:** plán hydrantů jako PNG nebo PDF, body jako GPX nebo CSV.
5. **Sdílet:** zkopírujte odkaz na toto zobrazení.
6. **Hydrant:** najeďte myší pro podrobnosti, klikněte pro kruh o poloměru 100 metrů.
7. **Stavové pole:** úroveň přiblížení a datum dat.
8. **Informace a právní údaje:** nápověda, symboly mapy, právní upozornění, soukromí, nastavení.

## Vyhledání místa {#suche}

Zadejte místo, ulici nebo adresu do vyhledávacího pole vlevo nahoře a stiskněte <kbd>Enter</kbd> nebo ikonu lupy. Mapa přejde na první výsledek a přiblíží se na úroveň 16, takže hydranty hned uvidíte.

Vyhledávání používá Nominatim, vyhledávací službu OpenStreetMap. Vyhledává místa a adresy, nikoli jednotlivé hydranty.

## Moje poloha {#standort}

Tlačítko polohy zobrazí, kde jste, a přiblíží mapu na úroveň 17. Při prvním použití se prohlížeč zeptá, zda smí OpenFireMap použít vaši polohu. Poloha se používá pouze ve vašem prohlížeči a neukládá se.

:::tip Nezobrazuje se poloha?
Zkontrolujte, zda váš prohlížeč povoluje webu openfiremap.org přístup k poloze. Na počítači bez GPS může být poloha přesná jen na několik set metrů.
:::

## Hydranty a další objekty {#objekte}

Zobrazení závisí na úrovni přiblížení:

| Úroveň přiblížení | Co se zobrazí |
|---|---|
| pod 12 | zatím žádné objekty |
| od 12 | hasičské stanice |
| od 14 | symboly stanic a hranice obcí |
| od 15 | hydranty, vodní zdroje a defibrilátory jako barevné body |
| od 17 | všechny objekty jako symboly s písmenem |
| od 18 | podrobnosti po najetí myší |

:::figure marker frame=plain
Kliknutím na hydrant se zobrazí kruh o poloměru 100 metrů.
:::

**Zobrazení podrobností:** od úrovně přiblížení 18 se po najetí myší na symbol otevřou podrobnosti. S klávesnicí to funguje už od úrovně 17: pomocí <kbd>Tab</kbd> vyberte symbol a stiskněte <kbd>Enter</kbd>.

**Poloměr a vzdálenost:** od úrovně 16 se po kliknutí na hydrant zobrazí přerušovaný kruh o poloměru 100 metrů. Pomáhá odhadnout, které hydranty jsou v dosahu hadic. Od úrovně 17 je kruh označen „100 m“. Pokud nejprve použijete **Moje poloha**, OpenFireMap od úrovně 17 vykreslí také modrou čáru od vás k hydrantu s uvedením vzdálenosti.

Podrobnosti zobrazují údaje zapsané v OpenStreetMap, například typ, průměr, číslo, tlak, polohu nebo provozovatele. Pokud něco chybí, zatím to nikdo nepřidal. Jak na to, vysvětluje [Přispět](../contribute/).

Stránka [Vrstvy a symboly](../layers/) vysvětluje symboly a barvy.

## Vrstvy mapy {#ebenen}

Tlačítko s ikonou mapy otevře nabídku podkladových map: standardní, tisková, noční, satelitní, topografická, dva styly OSM a v Bavorsku také BayernAtlas a letecké snímky. Objekty hasičských služeb jsou vždy navrchu. Stránka [Vrstvy a symboly](../layers/) popisuje vhodné podklady pro různé úkoly.

## Sdílení a odkazy {#teilen}

Tlačítko sdílení zkopíruje do schránky odkaz přesně na toto zobrazení. Každý, kdo odkaz otevře, uvidí stejné místo, úroveň přiblížení i podkladovou mapu.

Při posouvání mapy se mění adresa v řádku prohlížeče. Má tvar `#zoom/latitude/longitude/background`, například `openfiremap.org/#17/49.45280/11.07700/voyager`. Můžete si ji také uložit do záložek.

## Stavové pole a datum dat {#status}

Vpravo dole se zobrazuje aktuální úroveň přiblížení a datum dat, například „As of: 1d ago“. „+Sync“ znamená, že už byly načteny novější změny z OpenStreetMap. Kliknutím na „Data status details“ zobrazíte zdroj, datum základních dat a stav živé aktualizace. Více v části [Data a aktuálnost](../data/).

## Informace a právní údaje a nastavení {#info}

„Info & Legal“ vlevo dole otevře dialog s odkazy na tuto nápovědu, symboly mapy a překryvnou vrstvu i na právní upozornění, soukromí a licence. Zde nastavíte také **místní mezipaměť**: vypnuto, 1 hodina, 1 den, 3 dny, 7 dní (výchozí) nebo 30 dní. Dříve načtené oblasti se po tuto dobu zobrazují rychleji.

## Ovládání klávesnicí {#tastatur}

OpenFireMap funguje i bez myši:

- První stisk <kbd>Tab</kbd> přejde na „Skip to map“.
- Na mapě posouvají zobrazení šipky, <kbd>+</kbd> a <kbd>−</kbd> přibližují a oddalují.
- Od úrovně přiblížení 17 lze symboly procházet pomocí <kbd>Tab</kbd>. <kbd>Enter</kbd> nebo <kbd>Space</kbd> otevře podrobnosti, <kbd>Escape</kbd> je zavře.
- V nabídkách a dialozích zůstává fokus uvnitř okna; <kbd>Escape</kbd> je zavře.
- V exportu vybere „Use visible area“ aktuální zobrazení bez tažení obdélníku.

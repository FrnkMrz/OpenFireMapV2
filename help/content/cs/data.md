---
title: Data a aktuálnost
description: Odkud pocházejí data OpenFireMapu, jak jsou aktuální, co ukazuje okno stavu dat a k čemu slouží místní mezipaměť.
eyebrow: Data
lead: Všechny objekty hasičských služeb pocházejí z OpenStreetMap. OpenFireMap je připravuje pro rychlé načítání a nové záznamy načítá živě.
order: 4
---

## Odkud data pocházejí {#quelle}

Hydranty, vodní zdroje, hasičské stanice a defibrilátory přidává komunita [OpenStreetMap](https://www.openstreetmap.org/), často místní hasiči. OpenFireMap tato data zobrazuje, ale nemění je.

## Jak OpenFireMap načítá hydranty {#ladeweg}

Podle oblasti používá mapa jeden ze dvou způsobů:

- **Připravené dlaždice:** Pro Německo, Rakousko, Švýcarsko, Lichtenštejnsko a Lucembursko a dalších 40 evropských zemí vytváří OpenFireMap předem datové dlaždice z výřezů zemí OpenStreetMap (Geofabrik). Jsou hostovány u Cloudflare a doručovány přes jeho mezipaměť. Prohlížeč načte jen několik dlaždic potřebných pro zobrazení.
- **Overpass API:** Všude jinde se OpenFireMap dotazuje přímo veřejného serveru Overpass na viditelnou oblast a její okraj.

:::note Proč je to v Německu a Evropě rychlejší
Ne proto, že by Overpass odpovídal rychleji. V těchto zemích mapa nemusí kvůli hydrantům posílat dotaz na Overpass vůbec: čte připravené dlaždice. Overpass se dotazuje jen na změny od data základních dat, což je mnohem menší dotaz.
:::

### Co je Overpass API {#overpass}

[Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API) je veřejná služba, která vyhledává data OpenStreetMap podle objektu a oblasti, například „všechny hydranty v tomto obdélníku“. Servery provozují dobrovolníci a organizace a používá je mnoho aplikací.

Rychlost odpovědi závisí na:

- **zatížení** serveru, který OpenFireMap používá,
- **velikosti** oblasti, a tedy délce dotazu,
- **čekání a odmítnutí** při přetížení serveru nebo omezení počtu požadavků.

OpenFireMap zná čtyři servery Overpass a zkouší je v náhodném pořadí. Pokud některý neodpoví nebo hlásí přetížení, mapa ho na chvíli pozastaví a zkusí další. Načtené oblasti se ukládají do místní mezipaměti prohlížeče.

## Jak aktuální jsou data {#aktualitaet}

| Oblast | Základní data | Nové a změněné záznamy |
|---|---|---|
| Německo, Rakousko, Švýcarsko, Lichtenštejnsko, Lucembursko | připravené dlaždice, obvykle obnovované denně | načítají se z Overpassu |
| dalších 40 evropských zemí | připravené dlaždice, obvykle obnovované týdně | načítají se z Overpassu, pokud základní data nejsou starší než 10 dní |
| zbytek světa | stav serveru Overpass | při každém dotazu |

Po načtení připravených dlaždic požádá OpenFireMap na pozadí o vše, co se v zobrazené oblasti změnilo od data základních dat, a přidá to do mapy.

### Proč se nový záznam nezobrazí hned {#verzoegerung}

Změna v OpenStreetMap se nepromítne do OpenFireMapu ve stejnou chvíli:

- **Zpracování:** Server Overpass musí změnu přijmout. Pokud hlásí příliš stará data, OpenFireMap odpověď zahodí a zobrazí základní data.
- **Mezipaměť:** Výsledek dotazu se pro oblast uchovává několik minut a načtené oblasti také v místní mezipaměti.
- **Výpadky:** Pokud je Overpass přetížený nebo nedostupný, základní data zůstanou až do úspěšného dalšího dotazu. OpenFireMap to nemůže ovlivnit.

Pevný čas proto nelze slíbit. Pokud svůj záznam ještě nevidíte, za chvíli mapu znovu načtěte.

:::note Smazané objekty
Aktualizace zjišťuje pouze nové a změněné objekty. Hydrant smazaný v OpenStreetMap zmizí až při příští aktualizaci základních dat připravených dlaždic.
:::

## Okno „Data status & origin“ {#popover}

:::figure data frame=plain
Stav a zdroj dat: zde jsou základní data ze včerejška; živá aktualizace v danou chvíli nebyla dostupná.
:::

Na počítači ho otevřete přes „Data status details“ ve stavovém poli; na smartphonu klepněte na stavové pole.

- **Zdroj:** připravené dlaždice (DACHLiLu nebo Evropa), živý dotaz nebo místní mezipaměť.
- **Stav základních dat:** datum vytvoření výřezu země. Pokud zobrazení zahrnuje více zemí, platí nejstarší datum.
- **Živá aktualizace:** zda byly načteny novější změny. „Not available“ znamená, že se nepodařilo spojit s živou službou a zobrazují se základní data. Tlačítko se šipkou to zkusí znovu.

Stavové pole zobrazuje stejnou informaci stručně, například „As of: 1d ago +Sync“.

## Stavová stránka {#statusseite}

[Stavová stránka](/status/) pro každou zemi ukazuje stáří dat OpenStreetMap, datum poslední aktualizace mapy a počet hydrantů, hasičských stanic a defibrilátorů na obyvatele. Je dostupná v němčině a angličtině.

## Místní mezipaměť {#cache}

Aby se navštívené oblasti zobrazovaly rychleji, OpenFireMap ukládá načtená data v prohlížeči. Dobu nastavte v nabídce **Local Cache** v „Info & Legal“ (na telefonu v nabídce): vypnuto, 1 hodina, 1 den, 3 dny, 7 dní (výchozí) nebo 30 dní.

Data zůstávají ve vašem zařízení. Mezipaměť nenahrazuje aktualizace: při otevření se uložené oblasti kontrolují proti aktuálním datům.

## Bez internetu {#offline}

OpenFireMap není offline mapa. Oblasti z mezipaměti zůstávají chvíli viditelné, ale nové oblasti a vyhledávání vyžadují připojení. Pro práci bez sítě je lepší vytištěný [plán města](../town-plan/) nebo [export](../export/).

## Když načítání trvá dlouho {#laden}

Mimo země s připravenými dlaždicemi se vše načítá přes Overpass. Pokud je server zaneprázdněný, OpenFireMap automaticky zkusí další; zpráva dole ukazuje, co se děje. Pokud to nepomůže, trochu mapu přibližte, aby se dotaz zmenšil, a zkuste to za chvíli znovu. Pokud přetížení hlásí všechny servery, problém je na straně Overpassu. Pak nezbývá než načíst mapu později.

:::warn Nejde o provozní zdroj
Kvalita dat závisí na záznamech v OpenStreetMap. Mohou být neúplná, zastaralá nebo chybná a nenahrazují informace operačních středisek ani vodáren. V nouzi vždy volejte tísňovou linku (v Evropě 112).
:::

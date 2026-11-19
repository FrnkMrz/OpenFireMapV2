---
title: Časté dotazy
description: Odpovědi na běžné otázky o OpenFireMapu, mapě, datech, aktuálnosti, exportu, plánu města, přispívání, projektu a právních údajích.
eyebrow: Časté dotazy
lead: Odpovědi na nejčastější otázky. Nenašli jste svou otázku? Napište nám na info@openfiremap.org.
order: 10
---

## Mapa a ovládání {#karte}

### Proč nevidím žádné hydranty? {#keine-hydranten}

Hydranty se zobrazují od úrovně přiblížení 15. Přibližte mapu. Pokud je stále nevidíte, nikdo je zatím v této oblasti OpenStreetMapu nepřidal. Můžete to [sami změnit](../contribute/).

### Jak otevřu podrobnosti hydrantu? {#details}

Na počítači zobrazí symbol podrobnosti po najetí myší od úrovně přiblížení 18. Na chytrém telefonu klepněte na symbol od úrovně 17. S klávesnicí ho vyberte pomocí <kbd>Tab</kbd> od úrovně 17 a stiskněte <kbd>Enter</kbd>.

### Co znamená kruh kolem hydrantu? {#kreis}

Má poloměr 100 metrů a zobrazí se po kliknutí nebo klepnutí na hydrant od úrovně přiblížení 16. Ukazuje, které hydranty jsou v dosahu hadice. Pokud nejprve použijete „Moje poloha“, modrá čára navíc ukazuje vzdálenost od vás.

### Co znamenají písmena v symbolech? {#buchstaben}

Označují typ: **U** podzemní hydrant, **O** stojanový hydrant, **Ø** suchý hydrant. Všechny symboly vysvětluje stránka [Symboly mapy](/symbols/).

### Jak sdílím zobrazení mapy? {#teilen}

Tlačítkem sdílení (na smartphonu „Share Map View“ v nabídce). Zkopíruje odkaz přesně na toto zobrazení včetně úrovně přiblížení a podkladu. Adresu v řádku prohlížeče si můžete také uložit do záložek.

### Lze OpenFireMap nainstalovat jako aplikaci? {#app}

Ano. Na iPhonu v Safari přes **Share → Add to Home Screen**, na Androidu v Chrome přes **⋮ → Install app**. Není potřeba obchod s aplikacemi. Více v části [Mapa na chytrém telefonu](../phone/#app).

### Funguje mapa offline? {#offline}

Jen částečně. Načtené oblasti zůstávají uložené po určitou dobu podle nastavení mezipaměti. Nové oblasti a vyhledávání potřebují připojení. Na cestách bez sítě je spolehlivější vytištěný [plán města](../town-plan/).

## Data a aktuálnost {#daten}

### Odkud pocházejí data? {#herkunft}

Z [OpenStreetMap](https://www.openstreetmap.org/). Dobrovolníci, často místní hasiči, přidávají hydranty, vodní zdroje, stanice a defibrilátory. OpenFireMap tato data zobrazuje, ale nemění je.

### Proč se mapa načítá v Německu rychleji než jinde? {#schneller}

Pro Německo, Rakousko, Švýcarsko, Lichtenštejnsko, Lucembursko a dalších 40 evropských zemí připravuje OpenFireMap data předem jako dlaždice. Jinde se načítají přímo přes Overpass API, jehož rychlost závisí na vytížení veřejných serverů. Více v části [Data a aktuálnost](../data/#ladeweg).

### Kdy se zobrazí nový hydrant? {#neu}

Přesně to nelze předpovědět. Zobrazí se po zpracování změny serverem Overpass; mezipaměť může způsobit menší prodlevu. Pokud je Overpass přetížený nebo nedostupný, objeví se později. Smazané objekty zmizí až při další aktualizaci dat. Důvody vysvětluje [Data a aktuálnost](../data/#verzoegerung).

### Jak aktuální jsou data? {#aktuell}

Stavové pole ukazuje datum dat, okno „Data status & origin“ podrobnosti. [Stavová stránka](/status/) uvádí stáří dat v každé zemi.

### Mapa se nenačítá nebo hlásí přetížení. Co mám dělat? {#laedt-nicht}

Trochu přibližte mapu, aby se dotaz zmenšil, a zkuste to za chvíli znovu. Pokud přetížení hlásí všechny servery, problém je na straně veřejných serverů Overpass. Pak nezbývá než načíst mapu později.

### Jsou data závazná pro zásahy? {#verbindlich}

Ne. OpenFireMap není provozní zdroj. Data mohou být neúplná, zastaralá nebo chybná a nenahrazují informace operačních středisek, obcí ani vodáren. V nouzi vždy nejprve volejte tísňovou linku (v Evropě 112).

## Export a plán města {#export}

### Proč není export dostupný na smartphonu? {#export-handy}

Plány připravené k tisku potřebují hodně paměti a velkou obrazovku pro výběr oblasti. Export a plán města jsou proto dostupné pouze na počítači.

### Jak velký může být export? {#export-groesse}

Maximálně 10 × 10 kilometrů. Pokud vytáhnete větší obdélník, OpenFireMap ho omezí. Pro velké město s mřížkou a rejstříkem ulic je lepší [plán města](../town-plan/).

### Jaký je rozdíl mezi exportem a plánem města? {#unterschied}

[Export](../export/) rychle vytvoří obrázek nebo PDF oblasti, případně seznam bodů (GPX, CSV). [Plán města](../town-plan/) je navržený list od A4 do A1 s pevným měřítkem, mřížkou, legendou a rejstříkem ulic, aktuálně pro místa v Německu.

### Vytištěný plán nemá správné měřítko. {#massstab}

Vytiskněte PDF na **Actual size** nebo **100 %**, nikoli „Fit to page“, na velikost papíru vybranou v asistentovi. Pak měřítko ověřte pravítkem.

### Mohu plány pro svůj sbor tisknout a předávat dál? {#drucken}

Ano. Data jsou licencována pod Open Database License. Na každém plánu musí zůstat „© OpenStreetMap contributors“. Export i plán města toto uvedení vytisknou; neořezávejte ho.

## Přispívání {#mitmachen}

### Hydrant chybí nebo je špatně. Kdo ho opraví? {#korrigieren}

Můžete ho opravit v OpenStreetMap. Potřebujete pouze bezplatný účet. Průvodce nástroji Hydrantenjäger, StreetComplete, iD a JOSM najdete v části [Přidávání hydrantů](../contribute/).

### Jsme hasičský sbor a chceme zmapovat hydranty v našem rajónu. Jak na to? {#feuerwehr}

Nejlepší je uspořádat cvičební večer nebo obchůzku města v týmech. Průvodce [Pro hasičské sbory](../fire-brigades/) popisuje přípravu, průběh, bezpečnost i následné kroky.

### Mohu kopírovat plány hydrantů od obce nebo vodáren? {#plaene}

Pouze s výslovným svolením. Tyto plány jsou chráněny autorským právem. Nejlepší je přidávat jen to, co jste sami viděli na místě.

### Mohu ve vlastní mapě používat vrstvy hasičských služeb? {#overlay}

Ano, pomocí překryvné vrstvy. Více informací najdete na [stránce překryvné vrstvy](/overlay/).

## Projekt a právní údaje {#projekt}

### Je to oficiální mapa hasičů? {#offiziell}

Ne. OpenFireMap je soukromý neziskový projekt založený na OpenStreetMap. Oficiálně nespolupracuje s žádným úřadem ani hasičským sborem.

### Kolik OpenFireMap stojí? {#kosten}

Nic. Bez účtu, reklamy a předplatného. Zdrojový kód je pod licencí MIT na [GitHubu](https://github.com/FrnkMrz/OpenFireMapV2).

### Jaká data o mně OpenFireMap ukládá? {#datenschutz}

Mapa běží ve vašem prohlížeči. Ukládají se tam jen nastavení, například jazyk a mezipaměť, poslední zobrazení mapy, nastavení plánu města a načtená data mapy. Při vyhledávání a načítání mapových dlaždic a dat prohlížeč kontaktuje externí služby. Podrobnosti najdete v [zásadách ochrany soukromí](/?legal=1).

### Jak vás mohu kontaktovat? {#kontakt}

E-mailem na [info@openfiremap.org](mailto:info@openfiremap.org). Chyby a návrhy můžete také nahlásit jako [issue na GitHubu](https://github.com/FrnkMrz/OpenFireMapV2/issues).

---
title: Vytvoření plánu města
description: Postup vytvoření plánu města a hydrantů připraveného k tisku s mřížkou, legendou, měřítkem a rejstříkem ulic jako PDF nebo PNG.
eyebrow: Plán města
lead: Plán města převede OpenFireMap na list připravený k tisku od A4 do A1 s mřížkou, legendou, severkou, měřítkem a rejstříkem ulic.
order: 6
---

## K čemu plán města slouží {#wofuer}

Vytištěný plán funguje bez sítě, bez baterie a i v rukavicích. Typické použití:

- **Nástěnný plán** v hasičské stanici se všemi hydranty v zásahové oblasti
- **Složka ve vozidle** s plány jednotlivých částí města
- **Výcvik** a instruktáž nových členů
- **Předběžné plánování** míst s vysokou potřebou požární vody

Na rozdíl od [exportu](../export/) má plán města pevné měřítko, mřížku se čtverci (A1, B2 …) a rejstřík ulic s uvedením čtverců pro každou ulici.

## Co budete potřebovat {#voraussetzungen}

- **Počítač** s aktuálním prohlížečem. Plán města je na smartphonech blokován, protože rámeček i náhled potřebují velkou obrazovku.
- **Oblast v Německu.** Základní mapa plánu města aktuálně pokrývá Německo. Mimo něj asistent oznámí, že rámeček neleží v oblasti dat.

Začněte na **[openfiremap.org/ortsplan](/ortsplan/)**. Asistent zatím nemá vyhledávání míst: posuňte a přibližte mapu na své město a potom vytáhněte rámeček.

:::note Rozhraní je v němčině
Asistent je v současnosti dostupný pouze v němčině. Níže jsou německé popisky s překladem. Prohlížeč si nastavení zapamatuje na příště.
:::

## Krok 1: Oblast a formát {#schritt-1}

:::figure plan-1 frame=browser
Krok 1: rámeček na mapě; vpravo papír, orientace, rozvržení a měřítko.
:::

Světlý rámeček na mapě ukazuje, co bude na listu.

- **Posunutí rámečku:** přetáhněte úchyt uprostřed nahoře. Tažením okrajů a rohů změňte velikost. Mapu pod ním posouvejte a přibližujte jako obvykle.
- **Form des Rahmens (tvar rámečku):** **Frei** (volný) dovoluje libovolný tvar, **Wie das Blatt** (jako list) zachová poměr stran papíru.
- **Papier (papír):** A4, A3, A2 nebo A1 a orientace **Quer** (na šířku) nebo **Hoch** (na výšku).
- **Anordnung (rozvržení):** umístění legendy, měřítka a rejstříku: **Auf der Karte** (na mapě), nad, pod, vlevo nebo vpravo od mapy.
- **Maßstab (měřítko):** vypočítá se z rámečku a papíru a lze ho pevně nastavit v seznamu. **Maßstab auf Standardwert runden** zaokrouhlí například 1:3,870 na 1:4,000.
- **Rahmen einpassen** (přizpůsobit rámeček) nastaví rámeček podle zvoleného papíru.

Pod nastavením vidíte rozměry listu, okno mapy a pokrytou oblast v kilometrech. Řádek pod tím ukazuje, zda rámeček leží celý v oblasti dat.

:::tip Jaké měřítko zvolit?
Centrum města s mnoha hydranty je přehledné při 1:2,000 až 1:4,000. Pro celou vesnici s okolím obvykle stačí 1:7,500 až 1:10,000. Pokud je plán přeplněný, zvolte větší papír místo menšího měřítka.
:::

## Krok 2: Obsah {#schritt-2}

:::figure plan-2 frame=browser
Krok 2: texty na listu a obsah plánu.
:::

- **Ortsname (název místa):** vytiskne se velkým písmem v nadpisu. Asistent navrhne název místa uprostřed rámečku.
- **Überschrift (nadpis):** vytiskne se nad názvem místa, například „Orts- und Hydrantenplan“ (plán města a hydrantů).
- **Was steht darin? (co bude obsahovat?):** symboly (hasičské služby a hydranty), typy silnic a hranice obce, rejstřík ulic. Každou položku lze vypnout.
- **Mehr Optionen (další možnosti):** rozlišení (96 až 300 dpi), počet sloupců a velikost písma rejstříku.

:::tip Rozlišení
150 dpi stačí pro obrazovky a běžný tisk. Pro velké formáty nebo tiskárnu zvolte 300 dpi. Soubor bude výrazně větší.
:::

## Krok 3: Rozvržení {#schritt-3}

:::figure plan-3 frame=browser
Krok 3: náhled listu s nadpisem, mapou, legendou, měřítkem, severkou, zdroji a rejstříkem.
:::

Náhled ukazuje, kde budou jednotlivé prvky na listu. Ve výchozím nastavení je rozvrhne asistent sám. Pomocí **Blöcke selbst anordnen** (rozmístit bloky ručně) převezmete kontrolu:

- **Posun:** přetáhněte rámečky do volných míst nebo jeden vyberte pomocí <kbd>Tab</kbd> a přesuňte ho šipkami (<kbd>Shift</kbd> umožní větší kroky).
- Posouvat lze i **nadpis a mapu**. Mapa se přichytí k okraji a zůstane celá na listu.
- **Velikost mapy:** přetáhněte pravý dolní roh mapy (klávesnicí: <kbd>Alt</kbd> + šipky). Měřítko se nezmění, mapa pak zobrazí větší či menší oblast.
- **Blöcke dürfen auf der Karte liegen** (bloky mohou být na mapě): legenda a měřítko mohou překrývat volná místa mapy s bílým nebo průhledným pozadím.
- **Anordnung zurücksetzen** (obnovit rozvržení) vrátí návrh asistenta.

Nakonec klikněte na **Ortsplan erstellen** (vytvořit plán města).

## Hotový list {#blatt}

:::figure plan-sheet frame=browser
Hotový list s mřížkou, legendou, měřítkem, severkou a rejstříkem ulic.
:::

List se otevře v plné velikosti. V horní liště můžete změnit měřítko, papír, rozlišení a texty a potvrdit je tlačítkem **Neu laden** (znovu načíst). Pokud se rejstřík ulic nevejde, pokračuje na druhé straně a nad listem se zobrazí upozornění.

- **PDF speichern** (uložit PDF): list ve velikosti papíru připravený k tisku.
- **PNG speichern** (uložit PNG): list jako obrázek, například do prezentace.

## Správný tisk {#drucken}

:::steps
1. Otevřete PDF a zvolte **Print** (tisk).
2. Nastavte měřítko na **Actual size** nebo **100%**, ne „Fit to page“. Jen tak zůstane měřítko správné.
3. Zvolte velikost papíru nastavenou v asistentovi (A2 a A1 se obvykle tisknou v tiskárně).
4. Po vytištění ověřte měřítko pravítkem.
:::

## Užitečné informace {#wissen}

- Data jsou aktuální podle OpenStreetMap; datum se tiskne na list. Po větších změnách ve městě vytiskněte nový plán.
- Plán města automaticky přidá „© OpenStreetMap contributors“. Toto uvedení musí na plánu zůstat.
- Pokud na plánu chybí hydrant, chybí i v OpenStreetMap. [Přidejte ho](../contribute/) a objeví se v příštím plánu.

:::warn Nejde o oficiální dokument
Plán města nenahrazuje plány vodáren ani obce. Důležité údaje ověřte přímo na místě.
:::

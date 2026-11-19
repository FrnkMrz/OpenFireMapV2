---
title: Přidávání hydrantů
description: Jak přidávat hydranty, vodní zdroje a defibrilátory do OpenStreetMap pomocí Hydrantenjäger, StreetComplete, Every Door, editoru iD nebo JOSM.
eyebrow: Přispět
lead: Každý hydrant na mapě někdo přidal. Pokud některý chybí, můžete ho doplnit sami. Potřebujete jen bezplatný účet OpenStreetMap.
order: 7
---

## Než začnete {#vorher}

OpenFireMap zobrazuje data z [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Neupravujete tedy OpenFireMap, ale OpenStreetMap. Budete potřebovat účet:

:::steps
1. Na [openstreetmap.org](https://www.openstreetmap.org/user/new) zvolte **Sign Up**.
2. Vyberte uživatelské jméno, e-mailovou adresu a heslo a potvrďte e-mail.
3. Tímto účtem se přihlaste ke všem níže uvedeným nástrojům.
:::

:::warn Tři pravidla
- **Přidávejte pouze to, co jste viděli na místě.** Ověřte polohu a typ přímo u hydrantu.
- **Nekopírujte data z cizích plánů.** Plány hydrantů vodáren nebo obcí jsou chráněny autorským právem. Použijte je jen s výslovným svolením.
- **Při ukládání stručně popište, co jste změnili,** například „Added hydrants on Main Street“.
:::

## Který nástroj se hodí? {#werkzeug}

| Jste … | Použijte | Proč |
|---|---|---|
| na místě s telefonem a chcete rychle přidat hydrant | **Hydrantenjäger** | vytvořený pro hydranty, umisťuje bod kompasem, má několik polí |
| na cestách a chcete doplňovat objekty | **StreetComplete** nebo **Every Door** | odpovídáte na otázky o okolních objektech včetně hydrantů |
| u počítače a chcete upravovat konkrétní místa | **editor iD** | běží v prohlížeči na openstreetmap.org, bez instalace |
| jste zkušený mapér a chcete upravit mnoho hydrantů najednou | **JOSM** (počítač) nebo **Vespucci** (Android) | plná kontrola nad všemi štítky |

## Pomocí Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) je webová aplikace pro telefon vytvořená přesně pro tento úkol:

:::steps
1. Přihlaste se účtem OpenStreetMap.
2. Postavte se asi tři metry před hydrant a namiřte na něj telefon. Aplikace umístí bod pomocí GPS a kompasu.
3. Zvolte typ a polohu; průměr a číslo doplňte jen tehdy, pokud si jste jistí.
4. Nahrajte. Hotovo.
:::

Podrobný průvodce všemi typy hydrantů najdete na [stránce nápovědy Hydrantenjäger](https://hydrantenjaeger.de/help/).

## Pomocí StreetComplete nebo Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) zobrazuje otázky o objektech v okolí, například „Jaký typ hydrantu to je?“. Odpovíte klepnutím. Aplikace slouží hlavně k doplnění chybějících údajů o existujících objektech.
- **[Every Door](https://every-door.app/)** (Android, iOS) je určena k přidávání bodů. Tlačítkem plus umístěte nový bod, zvolte „Fire Hydrant“ a vyplňte pole.

## Pomocí editoru iD v prohlížeči {#id}

Editor iD je výchozím editorem na openstreetmap.org.

:::steps
1. Otevřete [openstreetmap.org](https://www.openstreetmap.org/), přihlaste se a přibližte mapu k hydrantu.
2. Nahoře klikněte na **Edit**. Při prvním použití se zobrazí krátký průvodce, který se vyplatí projít.
3. Nahoře klikněte na **Point** a umístěte bod přesně na místo hydrantu. Letecké snímky pomohou s orientací.
4. Do vyhledávacího pole vlevo napište „hydrant“ a zvolte přednastavení **Fire Hydrant**.
5. Vyplňte pole: **Type** (podzemní, stojanový, nástěnný, potrubní), **Position** (například chodník nebo jízdní pruh), **Diameter** a **Reference**, pokud je znáte.
6. Vpravo nahoře klikněte na **Save**, napište krátký komentář a klikněte na **Upload**.
:::

:::tip Oprava existujícího hydrantu
Klikněte na existující hydrant, upravte pole vlevo a stejným způsobem uložte. Pokud je na špatném místě, přetáhněte ho správně. Smažte ho jen tehdy, když jste na místě ověřili, že už neexistuje.
:::

## Pomocí JOSM nebo Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) je editor pro počítač (Java), [Vespucci](https://vespucci.io/) jeho protějšek pro Android. Oba zobrazují všechny štítky přímo a hodí se pro větší úkoly, například když sbor po obhlídce aktualizuje všechny hydranty ve své oblasti. Štítky jsou uvedeny níže.

## Nejdůležitější štítky {#tags}

OpenStreetMap popisuje každý objekt štítky ve tvaru `key=value`. Přednastavení v aplikacích je vyplní automaticky. Pokud je zadáváte přímo, použijte tyto:

| Objekt | Štítek | Význam |
|---|---|---|
| Hydrant | `emergency=fire_hydrant` | povinný pro každý hydrant |
| | `fire_hydrant:type=underground` | podzemní hydrant (také `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | jmenovitý průměr v mm podle značky |
| | `fire_hydrant:position=sidewalk` | poloha (také `lane`, `parking_lot`, `green`) |
| | `ref=123` | číslo hydrantu, pokud existuje |
| | `fire_hydrant:pressure=4` | tlak v barech, pouze pokud je znám |
| Odběrné místo | `emergency=suction_point` | místo pro čerpání vody z vodního zdroje |
| Vodní nádrž | `emergency=water_tank` | cisterna nebo nádrž požární vody |
| Požární nádrž | `emergency=fire_water_pond` | nádrž využívaná jako zdroj požární vody |
| Defibrilátor | `emergency=defibrillator` | plus `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Hasičská stanice | `amenity=fire_station` | budova nebo areál hasičů |

Stránka [Symboly mapy](/symbols/) ukazuje, jak se štítky zobrazují v OpenFireMapu. Podrobně je popisuje [wiki OpenStreetMap](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant).

## Kdy se změna zobrazí? {#anzeige}

Po nahrání se hydrant ihned uloží do OpenStreetMap. V OpenFireMapu se zobrazí, jakmile změnu zpracují služby, ze kterých mapa načítá data. Často je to rychlé, ale pevný čas nelze zaručit. Co může způsobit zpoždění, vysvětluje [Data a aktuálnost](../data/#verzoegerung).

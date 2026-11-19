---
title: Přístupnost
description: Používání OpenFireMapu s klávesnicí, čtečkou obrazovky, zvětšením a omezením pohybu – co funguje, jak a co ještě nebylo otestováno.
eyebrow: Přístupnost
lead: OpenFireMap by měl fungovat pro každého, i bez myši, se čtečkou obrazovky nebo při velkém zvětšení. Zde se dozvíte jak a kde zůstávají nedostatky.
order: 9
---

## Náš cíl {#ziel}

Mapa se řídí pokyny **WCAG 2.2, úroveň AA**. Každá změna OpenFireMapu prochází automatickými kontrolami: ovládání klávesnicí, popisky čtečky obrazovky, kontrast barev, zobrazení při 400% zvětšení a minimální velikost ovládacích prvků. Stejně se kontroluje tato nápověda a stránka symbolů mapy.

:::note Poctivý stav
Automatické kontroly nenajdou všechno. Test se skutečnou čtečkou obrazovky na zařízení je ještě třeba provést. Pokud si něčeho všimnete, napište nám (kontakt je níže). Každý podnět pomůže.
:::

## Klávesnice {#tastatur}

Vše, co lze dělat myší, funguje také s klávesnicí:

| Klávesa | Účinek |
|---|---|
| <kbd>Tab</kbd> | přejde na další ovládací prvek. První zastávka je „Skip to map“. |
| Šipky | posouvají mapu, když je aktivní |
| <kbd>+</kbd> a <kbd>−</kbd> | přiblíží a oddálí |
| <kbd>Tab</kbd> od úrovně přiblížení 17 | přechází mezi symboly na mapě |
| <kbd>Enter</kbd> nebo <kbd>Space</kbd> na symbolu | otevře podrobnosti; u hydrantu také vykreslí kruh o poloměru 100 metrů |
| <kbd>Escape</kbd> | zavře podrobnosti, kruh, nabídky a dialogy; zruší výběr oblasti v exportu |

Fokus je vždy jasně viditelný. Po otevření nabídky nebo dialogu se fokus přesune dovnitř a zůstane tam, dokud okno nezavřete. Pak se vrátí na tlačítko, kterým jste ho otevřeli.

**Export bez myši:** v nabídce exportu vybere **Use visible area** aktuální zobrazení mapy. Nemusíte přetahovat obdélník. Zbytek vysvětluje [Export](../export/).

**Plán města bez myši:** v kroku 3 asistenta vyberte nadpis, legendu a další rámečky pomocí <kbd>Tab</kbd> a posouvejte je šipkami; s <kbd>Shift</kbd> po větších krocích. <kbd>Alt</kbd> + šipky mění velikost mapy. Více v části [Plán města](../town-plan/#schritt-3).

## Čtečka obrazovky {#screenreader}

- **Mapa:** je označena jako pojmenovaná oblast a vysvětluje ovládání klávesnicí.
- **Symboly:** od úrovně přiblížení 17 má každý symbol název, například „Hydrant“ s typem a číslem. Po otevření podrobností klávesou <kbd>Enter</kbd> je čtečka přečte.
- **Zprávy:** oznamují se upozornění jako „Odkaz zkopírován“ a chyby načítání; chyby mají přednost. Stavové pole s přiblížením a datem dat zůstává záměrně tiché, aby se neozývalo při každém posunu.
- **Jazyky:** popisky čtečky obrazovky existují ve všech jazycích mapy. Tato nápověda je dostupná v češtině, němčině a angličtině.

:::tip Mnoho symbolů najednou
Pod úrovní přiblížení 17 nelze jednotlivě procházet body na mapě, jinak by vznikly stovky zastávek tabulátoru. Přibližte pomocí <kbd>+</kbd>, dokud se nezobrazí symboly.
:::

## Vidění a zvětšení {#sehen}

- **Kontrast:** text v panelech má kontrastní poměr alespoň 4,5:1, velký text a symboly 3:1. Protože jsou panely nad mapou poloprůhledné, OpenFireMap měří kontrast vůči světlému i tmavému podkladu.
- **Zvětšení:** stránku můžete v prohlížeči zvětšit až na 400 %. Pak přejde na úzké zobrazení s nabídkou a všechny nabídky zůstanou přístupné a posuvné.
- **Nejen barva:** hydranty se liší nejen barvou, ale také písmenem v symbolu (U, O, Ø …).
- **Podklad:** při slabém kontrastu nebo oslnění pomohou podklady **Print (Light)** nebo **Night (Dark)**. Viz [Vrstvy a symboly](../layers/).

## Pohyb {#bewegung}

Pokud je v operačním systému zapnuta volba **Reduce motion**, OpenFireMap vypne animace: při vyhledávání a určování polohy mapa přeskočí rovnou na místo. Stejně tak se pak nehýbe ani tato nápověda.

## Na chytrém telefonu {#smartphone}

Ovládací prvky mají nejméně 24 × 24 pixelů. Podrobnosti symbolu otevřete klepnutím od úrovně přiblížení 17. S VoiceOver nebo TalkBack se k tlačítkům dostanete přes nabídku vlevo nahoře. Více v části [Mapa na chytrém telefonu](../phone/).

## Zatím neotestováno {#offen}

- úplný test čteček obrazovky na zařízeních (VoiceOver, TalkBack, NVDA)
- kontrast symbolů na všech podkladových mapách, zejména na satelitních snímcích
- ovládání asistenta plánu města čtečkou obrazovky

## Narazili jste na překážku? {#melden}

Napište nám, co nefungovalo, na jakém zařízení a v jakém prohlížeči, případně s jakou čtečkou obrazovky: **[info@openfiremap.org](mailto:info@openfiremap.org)**. Pokud se vyznáte v technice, můžete otevřít také [issue na GitHubu](https://github.com/FrnkMrz/OpenFireMapV2/issues).

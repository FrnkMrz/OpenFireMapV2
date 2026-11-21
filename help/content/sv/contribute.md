---
title: Lägg till brandposter
description: Så lägger du till brandposter, vattenpunkter och hjärtstartare i OpenStreetMap med Hydrantenjäger, StreetComplete, Every Door, iD-redigeraren eller JOSM.
eyebrow: Bidra
lead: Varje brandpost på kartan har lagts till av någon. Om en saknas kan du lägga till den själv. Du behöver ett kostnadsfritt OpenStreetMap-konto.
order: 7
---

## Innan du börjar {#vorher}

OpenFireMap visar data från [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Du redigerar alltså i OpenStreetMap, inte i OpenFireMap. Du behöver ett konto:

:::steps
1. Välj **Sign Up** på [openstreetmap.org](https://www.openstreetmap.org/user/new).
2. Välj användarnamn, e-postadress och lösenord och bekräfta e-posten.
3. Logga in med kontot i verktygen nedan.
:::

:::warn Tre regler
- **Lägg bara till sådant du själv har sett på plats.** Kontrollera läge och typ vid brandposten.
- **Kopiera inte data från andras planer.** Brandpostplaner från vattenverk och kommuner skyddas av upphovsrätt. Använd dem bara med uttryckligt tillstånd.
- **Beskriv kort vad du ändrade när du sparar**, till exempel «La till brandposter på Main Street».
:::

Brandkårer i Tyskland hittar en tyskspråkig guide för att kontrollera brandposter på en övningskväll eller stadsvandring här: [Für Feuerwehren](/help/fire-brigades/).

## Vilket verktyg passar dig? {#werkzeug}

| Situation | Använd | Varför |
|---|---|---|
| på plats med mobilen och vill snabbt lägga till en brandpost | **Hydrantenjäger** | gjord för brandposter, placerar punkten med kompass, få fält |
| på språng och vill lägga till saker längs vägen | **StreetComplete** eller **Every Door** | svara på frågor om objekt i närheten |
| vid en dator och vill arbeta med specifika platser | **iD-redigeraren** | körs i webbläsaren på openstreetmap.org, ingen installation |
| erfaren och vill redigera många brandposter | **JOSM** (dator) eller **Vespucci** (Android) | full kontroll över alla taggar |

## Med Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) är en webbapp för mobilen, gjord för just detta:

:::steps
1. Logga in med ditt OpenStreetMap-konto.
2. Stå ungefär tre meter framför brandposten och rikta mobilen mot den. Appen placerar punkten med GPS och kompass.
3. Välj typ och placering; lägg bara till diameter och nummer om du är säker.
4. Ladda upp. Klart.
:::

Den detaljerade guiden med alla typer finns på [Hydrantenjägers hjälpsida](https://hydrantenjaeger.de/help/).

## Med StreetComplete eller Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) visar frågor om objekt i närheten, till exempel «Vilken typ av brandpost är det här?» Svara med en tryckning. Appen passar särskilt bra för att komplettera saknade uppgifter på befintliga objekt.
- **[Every Door](https://every-door.app/)** (Android, iOS) är gjord för att lägga till punkter. Tryck på plusknappen, placera en ny punkt, välj «Fire Hydrant» och fyll i fälten.

## Med iD-redigeraren i webbläsaren {#id}

iD-redigeraren är standardredigeraren på openstreetmap.org.

:::steps
1. Öppna [openstreetmap.org](https://www.openstreetmap.org/), logga in och zooma till brandposten.
2. Klicka på **Edit** längst upp. Första gången får du en kort introduktion.
3. Klicka på **Point** högst upp och placera punkten exakt vid brandposten. Flygbilden hjälper dig att orientera dig.
4. Skriv «hydrant» i sökfältet till vänster och välj förinställningen **Fire Hydrant**.
5. Fyll i fälten: **Type** (underjordisk, pelare, vägg, rör), **Position** (till exempel trottoar eller körfält), **Diameter** och **Reference** om du vet det.
6. Klicka på **Save** uppe till höger, skriv en kort kommentar och klicka på **Upload**.
:::

:::tip Rätta en befintlig brandpost
Klicka på en brandpost, ändra fälten till vänster och spara på samma sätt. Om den står fel drar du den till rätt plats. Ta bara bort den om du säkert vet på plats att den inte finns kvar.
:::

## Med JOSM eller Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) är en Java-redigerare för dator, [Vespucci](https://vespucci.io/) motsvarigheten för Android. Båda visar alla taggar och passar större arbeten, till exempel när en brandkår uppdaterar alla brandposter i sitt område efter en rundtur. Taggarna listas nedan.

## De viktigaste taggarna {#tags}

OpenStreetMap beskriver objekt med taggar i formen `key=value`. Förinställningarna i apparna fyller i dem åt dig. Om du anger dem direkt använder du dessa:

| Objekt | Tagg | Betydelse |
|---|---|---|
| Brandpost | `emergency=fire_hydrant` | krävs för varje brandpost |
| | `fire_hydrant:type=underground` | underjordisk brandpost (även `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | nominell storlek (DN), som på skylten |
| | `fire_hydrant:position=sidewalk` | plats (även `lane`, `parking_lot`, `green`) |
| | `ref=123` | brandpostnummer om det finns |
| | `fire_hydrant:pressure=4` | tryck i bar, bara om känt |
| Sugpunkt | `emergency=suction_point` | plats för vattenuttag från vattendrag |
| Vattentank | `emergency=water_tank` | cistern eller brandvattentank |
| Brandvattendamm | `emergency=fire_water_pond` | damm som används som brandvatten |
| Hjärtstartare | `emergency=defibrillator` | plus `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Brandstation | `amenity=fire_station` | byggnad eller område för brandkåren |

Sidan [Kartsymboler](/symbols/) visar hur taggarna ser ut i OpenFireMap. [OpenStreetMap-wikin](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant) beskriver dem närmare.

## När visas ändringen? {#anzeige}

Efter uppladdning sparas brandposten direkt i OpenStreetMap. Den visas i OpenFireMap när tjänsterna som kartan hämtar från har behandlat ändringen. Det går ofta snabbt, men ingen fast tid kan utlovas. [Data och aktualitet](../data/#verzoegerung) beskriver vad som kan fördröja den.

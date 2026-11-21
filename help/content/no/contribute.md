---
title: Legg til hydranter
description: Slik legger du til hydranter, vannpunkter og hjertestartere i OpenStreetMap med Hydrantenjäger, StreetComplete, Every Door, iD-redigereren eller JOSM.
eyebrow: Bidra
lead: Hver hydrant på kartet er lagt inn av noen. Hvis en mangler, kan du legge den inn selv. Du trenger bare en gratis OpenStreetMap-konto.
order: 7
---

## Før du begynner {#vorher}

OpenFireMap viser data fra [OpenStreetMap](https://www.openstreetmap.org/) (OSM). Du redigerer derfor i OpenStreetMap, ikke i OpenFireMap. Du trenger en konto:

:::steps
1. Velg **Sign Up** på [openstreetmap.org](https://www.openstreetmap.org/user/new).
2. Velg brukernavn, e-postadresse og passord, og bekreft e-posten.
3. Logg inn med denne kontoen i verktøyene nedenfor.
:::

:::warn Tre regler
- **Legg bare til det du selv har sett på stedet.** Kontroller plassering og type ved hydranten.
- **Ikke kopier data fra andres planer.** Hydrantplaner fra vannverk eller kommuner er opphavsrettslig beskyttet. Bruk dem bare med uttrykkelig tillatelse.
- **Beskriv kort hva du endret når du lagrer**, for eksempel «La til hydranter i Main Street».
:::

Brannvesen i Tyskland finner en tyskspråklig veiledning for å kontrollere hydranter i innsatsområdet på øvelse eller byvandring: [Für Feuerwehren](/help/fire-brigades/).

## Hvilket verktøy passer for deg? {#werkzeug}

| Situasjon | Bruk | Hvorfor |
|---|---|---|
| på stedet med telefonen og vil legge til en hydrant raskt | **Hydrantenjäger** | laget for hydranter, plasserer punkt med kompass, få felt |
| på farten og vil legge inn ting underveis | **StreetComplete** eller **Every Door** | svar på spørsmål om objekter i nærheten |
| på datamaskin og vil jobbe med bestemte steder | **iD-redigerer** | kjører i nettleseren på openstreetmap.org, ingen installasjon |
| erfaren og vil redigere mange hydranter | **JOSM** (datamaskin) eller **Vespucci** (Android) | full kontroll over alle tagger |

## Med Hydrantenjäger {#hydrantenjaeger}

[Hydrantenjäger](https://hydrantenjaeger.de/) er en nettapp for telefonen, laget for akkurat denne oppgaven:

:::steps
1. Logg inn med OpenStreetMap-kontoen din.
2. Stå omtrent tre meter foran hydranten og pek telefonen mot den. Appen plasserer punktet med GPS og kompass.
3. Velg type og plassering; legg bare til diameter og nummer hvis du er sikker.
4. Last opp. Ferdig.
:::

Den detaljerte veiledningen med alle hydranttypene finnes på [Hydrantenjägers hjelpeside](https://hydrantenjaeger.de/help/).

## Med StreetComplete eller Every Door {#apps}

- **[StreetComplete](https://streetcomplete.app/)** (Android, iOS) viser spørsmål om objekter i nærheten, for eksempel «Hvilken type hydrant er dette?». Svar med et trykk. Appen er særlig laget for å fylle inn manglende detaljer på eksisterende objekter.
- **[Every Door](https://every-door.app/)** (Android, iOS) er laget for å legge til punkter. Trykk plussknappen, plasser et nytt punkt, velg «Fire Hydrant» og fyll ut feltene.

## Med iD-redigereren i nettleseren {#id}

iD-redigereren er standardredigereren på openstreetmap.org.

:::steps
1. Åpne [openstreetmap.org](https://www.openstreetmap.org/), logg inn og zoom til hydranten.
2. Klikk **Edit** øverst. Første gang får du en kort introduksjon.
3. Klikk **Point** øverst og plasser punktet nøyaktig der hydranten står. Flyfoto hjelper med orienteringen.
4. Skriv «hydrant» i søkefeltet til venstre, og velg forhåndsvalget **Fire Hydrant**.
5. Fyll ut **Type** (underjordisk, søyle, vegg, rør), **Position** (for eksempel fortau eller kjørefelt), **Diameter** og **Reference** hvis kjent.
6. Klikk **Save** øverst til høyre, skriv en kort merknad og velg **Upload**.
:::

:::tip Rett en eksisterende hydrant
Klikk på hydranten, endre feltene til venstre og lagre på samme måte. Hvis den står feil, drar du den til riktig sted. Slett den bare hvis du er sikker på stedet at den ikke finnes lenger.
:::

## Med JOSM eller Vespucci {#josm}

[JOSM](https://josm.openstreetmap.de/) er en Java-redigerer for datamaskin, og [Vespucci](https://vespucci.io/) er tilsvarende for Android. Begge viser alle tagger direkte og passer til større oppgaver, for eksempel når et brannvesen oppdaterer alle hydranter i området etter en gjennomgang. Taggene står nedenfor.

## De viktigste taggene {#tags}

OpenStreetMap beskriver objekter med tagger på formen `key=value`. Forhåndsvalgene i appene setter dem for deg. Hvis du fyller dem inn direkte, bruker du disse:

| Objekt | Tagg | Betydning |
|---|---|---|
| Hydrant | `emergency=fire_hydrant` | obligatorisk for alle hydranter |
| | `fire_hydrant:type=underground` | underjordisk hydrant (også `pillar`, `wall`, `pipe`) |
| | `fire_hydrant:diameter=80` | nominell størrelse (DN), som på skiltet |
| | `fire_hydrant:position=sidewalk` | plassering (også `lane`, `parking_lot`, `green`) |
| | `ref=123` | hydrantnummer, hvis det finnes |
| | `fire_hydrant:pressure=4` | trykk i bar, bare hvis kjent |
| Sugepunkt | `emergency=suction_point` | sted der vann hentes fra vannområde |
| Vanntank | `emergency=water_tank` | sisterne eller brannvanntank |
| Brannvannsdam | `emergency=fire_water_pond` | dam brukt som brannvannskilde |
| Hjertestarter | `emergency=defibrillator` | pluss `indoor=yes/no`, `defibrillator:location=…`, `opening_hours=…` |
| Brannstasjon | `amenity=fire_station` | bygning eller område for brannvesenet |

Siden [Kartsymboler](/symbols/) viser hvordan taggene vises i OpenFireMap. [OpenStreetMap-wikien](https://wiki.openstreetmap.org/wiki/Tag:emergency%3Dfire_hydrant) beskriver dem nærmere.

## Når vises endringen? {#anzeige}

Etter opplasting lagres hydranten straks i OpenStreetMap. Den vises i OpenFireMap når tjenestene kartet henter fra, har behandlet endringen. Det går ofte raskt, men det finnes ingen fast tid. [Data og aktualitet](../data/#verzoegerung) forklarer hva som kan forsinke den.

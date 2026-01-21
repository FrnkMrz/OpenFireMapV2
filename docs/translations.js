<!-- 
    =============================================================================
    PROJEKT: OpenFireMap V2 - Lernversion (Mit Smart Caching)
    AUTOR: Gemini (im Auftrag von Frank März)
    DATUM: 2026-01-21
    =============================================================================
    
    PROJEKT-BESCHREIBUNG & LERNZIELE:
    
    Dies ist ein persönliches Lernprojekt, um die Entwicklung moderner Webanwendungen
    (Single Page Applications) zu verstehen und anzuwenden.
    
    WAS MACHT DIESE WEBSEITE?
    Dieses Tool dient der Visualisierung von rettungsdienstlich relevanter Infrastruktur
    aus der OpenStreetMap-Datenbank.
    
    Kernfunktionen:
    1. Interaktive Karte: Zeigt Feuerwachen, Hydranten, Wassertanks und Defibrillatoren (AED).
    2. Intelligenter Zoom: 
       - Wachen erscheinen ab Zoom 12.
       - Hydranten ab Zoom 15.
       - Defibrillatoren als Punkte ab Zoom 15, als detaillierte Icons ab Zoom 17.
    3. Einsatztaktik: Klick auf einen Hydranten zeigt einen 100m-Radius (Schlauchstrecke).
    4. Export-Tools:
       - PNG-Export: Erstellt hochauflösende, druckfertige Karten mit Rahmen, Titel,
         Datum, Maßstab und Lizenzhinweisen.
       - GPX-Export: Exportiert die sichtbaren Punkte für Navigationsgeräte.
    5. Internationalisierung: Die Oberfläche passt sich automatisch der Browsersprache an
       (unterstützt DE, EN, FR, ES, IT, PL, NL, CS, DA, FI, SV, NO, PT, FL, LB, JA, KO, MS, TH, ZH, YUE, TW).
    
    NEU: SMART CACHING STRATEGIE (PERFORMANCE)
    ------------------------------------------
    Um die Overpass-API zu schonen und Ladezeiten zu eliminieren:
    
    1. Grid-Snapping (Rasterung):
       Wir runden Koordinaten auf 4 Nachkommastellen (ca. 10m). Das verhindert, 
       dass minimales "Wackeln" am Bildschirm neue Daten lädt.
       
    2. SessionStorage (Browser-Speicher):
       Daten werden im RAM des Browsers gespeichert. Wenn du an einen Ort zurückkehrst,
       werden die Daten sofort aus dem Speicher geladen, statt aus dem Internet.

    RECHTLICHE HINWEISE:
    Impressum und Datenschutzerklärung sind fest integriert ("Info & Recht"-Button),
    um einen rechtssicheren Betrieb zu ermöglichen.
-->

<!DOCTYPE html>
<!-- 'lang="de"' sagt dem Browser: "Diese Seite spricht Deutsch." -->
<html lang="de">
<head>
    <!-- TECHNISCHE GRUNDEINSTELLUNGEN -->
    <meta charset="UTF-8">
    <!-- Wichtig für Handys: "Pass den Inhalt an die Bildschirmbreite an!" -->
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OpenFireMap.org</title>
    
    <!-- 
        PERFORMANCE (Preconnect):
        Wir "warnen" den Browser vor, dass wir gleich Daten von diesen Servern brauchen.
        So kann er schon mal den DNS-Eintrag suchen und die Verbindung öffnen.
    -->
    <link rel="preconnect" href="https://unpkg.com"> <!-- Für Leaflet -->
    <link rel="preconnect" href="https://cdn.tailwindcss.com"> <!-- Für CSS -->
    <link rel="preconnect" href="https://a.basemaps.cartocdn.com"> <!-- Für Kartenbilder -->
    <link rel="preconnect" href="https://overpass-api.de"> <!-- Für Daten -->

    <!-- 
        FAVICONS & APP ICONS
        Diese Icons sorgen dafür, dass die Seite als Lesezeichen oder App auf dem Homescreen gut aussieht.
    -->
    <link rel="apple-touch-icon" sizes="57x57" href="favicons/apple-icon-57x57.png">
    <link rel="apple-touch-icon" sizes="60x60" href="favicons/apple-icon-60x60.png">
    <link rel="apple-touch-icon" sizes="72x72" href="favicons/apple-icon-72x72.png">
    <link rel="apple-touch-icon" sizes="76x76" href="favicons/apple-icon-76x76.png">
    <link rel="apple-touch-icon" sizes="114x114" href="favicons/apple-icon-114x114.png">
    <link rel="apple-touch-icon" sizes="120x120" href="favicons/apple-icon-120x120.png">
    <link rel="apple-touch-icon" sizes="144x144" href="favicons/apple-icon-144x144.png">
    <link rel="apple-touch-icon" sizes="152x152" href="favicons/apple-icon-152x152.png">
    <link rel="apple-touch-icon" sizes="180x180" href="favicons/apple-icon-180x180.png">
    <link rel="icon" type="image/png" sizes="192x192"  href="favicons/android-icon-192x192.png">
    <link rel="icon" type="image/png" sizes="32x32" href="favicons/favicon-32x32.png">
    <link rel="icon" type="image/png" sizes="96x96" href="favicons/favicon-96x96.png">
    <link rel="icon" type="image/png" sizes="16x16" href="favicons/favicon-16x16.png">
    
    <link rel="manifest" href="favicons/sitemanifest">
    <meta name="msapplication-TileColor" content="#ffffff">
    <meta name="msapplication-TileImage" content="favicon/ms-icon-144x144.png">
    <meta name="theme-color" content="#ffffff">
    <link rel="icon" type="image/x-icon" href="favicons/favicon.ico">
    
    <!-- 
        EXTERNE WERKZEUGE (BIBLIOTHEKEN) 
        Wir laden fertige Code-Pakete aus dem Internet.
    -->
    
    <!-- Leaflet CSS: Das Design für die Karte -->
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    
    <!-- Leaflet JS: Die Logik für die Karte (jetzt mit defer, damit es nicht blockiert) -->
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" defer></script>
    
    <!-- Tailwind CSS: Ein Design-Werkzeugkasten für schnelle Styles -->
    <script src="https://cdn.tailwindcss.com" defer></script>

    <!-- 
        LOKALE RESSOURCEN
        Hier laden wir unsere ausgelagerte Sprachdatei (Wörterbuch). 
    -->
    <script src="translations.js"></script>

    <!-- HIER BEGINNT DAS DESIGN (CSS) -->
    <style>
        /* Grundeinstellungen: Keine Ränder, keine Scrollbalken am Hauptfenster */
        body { 
            margin: 0; padding: 0; 
            overflow: hidden; 
            font-family: sans-serif; 
            background: #0f172a; /* Dunkelblau (Slate-900) */
        }
        
        /* Der Container für die Karte füllt den ganzen Bildschirm */
        #map { position: absolute; top: 0; bottom: 0; width: 100%; background: #1e293b; }
        
        /* Glassmorphismus (Milchglas-Effekt) für Menüs und Buttons */
        .glass-panel { 
            background: rgba(15, 23, 42, 0.90); /* Fast undurchsichtiges Dunkelblau */
            backdrop-filter: blur(12px); /* Hintergrund verschwimmen lassen */
            border: 1px solid rgba(255, 255, 255, 0.1); /* Feiner weißer Rand */
        }
        
        #legal-modal { display: none; flex-direction: column; }

        /* Animation für Marker (Vergrößern beim Drüberfahren) */
        .icon-container { 
            display: flex; align-items: center; justify-content: center; 
            filter: drop-shadow(0 2px 3px rgba(0,0,0,0.4)); 
            transition: transform 0.1s ease; 
        }
        .icon-container:hover { transform: scale(1.15); z-index: 1000 !important; }

        /* Farbige Punkte für Zoomstufen < 17 (Performance-Optimierung) */
        .hydrant-dot { background-color: #ef4444; border: 1.5px solid white; border-radius: 50%; width: 10px; height: 10px; box-shadow: 0 0 5px rgba(0,0,0,0.3); }
        .tank-dot { background-color: #3b82f6; border: 1.5px solid white; border-radius: 50%; width: 10px; height: 10px; box-shadow: 0 0 5px rgba(0,0,0,0.3); }
        .defib-dot { background-color: #16a34a; border: 1.5px solid white; border-radius: 50%; width: 10px; height: 10px; box-shadow: 0 0 5px rgba(0,0,0,0.3); }
        .station-square { background-color: #ef4444; border: 1px solid white; width: 10px; height: 10px; box-shadow: 0 0 4px rgba(0,0,0,0.5); }

        /* Tooltips (Info-Schildchen an Markern) */
        .leaflet-tooltip { 
            background: #0f172a; color: white; border: 1px solid rgba(255,255,255,0.15); 
            border-radius: 8px; font-size: 12px; box-shadow: 0 10px 20px rgba(0, 0, 0, 0.6); padding: 0; 
        }

        /* Text "100m" am orangenen Kreis */
        .range-label {
            background: transparent !important; border: none !important; box-shadow: none !important;
            color: #333333 !important; font-weight: bold; font-size: 14px;
            text-shadow: -1px -1px 0 rgba(255,255,255,0.8), 1px -1px 0 rgba(255,255,255,0.8), -1px 1px 0 rgba(255,255,255,0.8), 1px 1px 0 rgba(255,255,255,0.8);
        }
        
        /* Aktiver Button im Menü hervorheben */
        .layer-btn.active { color: #3b82f6; background: rgba(59, 130, 246, 0.1); font-weight: bold; }
        
        /* Pulsierende Animation beim Export */
        @keyframes pulse-red { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
        .exporting-active { animation: pulse-red 2s infinite; }

        /* Rote Fehlermeldung oben rechts */
        #notification-box { 
            position: absolute; top: 20px; right: 20px; z-index: 2000; display: none;
            background: #ef4444; color: white; padding: 12px 24px; border-radius: 12px;
            box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.3); font-weight: 600;
        }

        /* Fadenkreuz-Cursor beim Auswählen eines Bereichs */
        .selection-mode { cursor: crosshair !important; }
        .zoom-btn:disabled { opacity: 0.3; cursor: not-allowed; border-color: transparent; }
        
        /* Standard Link-Styling */
        a { color: #3b82f6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        
        /* Schöne Scrollbalken für Webkit-Browser (Chrome/Safari) */
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 4px; }
    </style>
</head>
<body>

<!-- HTML STRUKTUR (Das Grundgerüst der Seite) -->

<h1 class="sr-only">OpenFireMap.org - Feuerwehrinfrastruktur Karte</h1>
<div id="map" aria-label="Interaktive Karte" role="application"></div>
<div id="notification-box" role="alert" aria-live="polite"></div>

<!-- STEUERLEISTE (Oben Links: Suche, GPS, Layer, Export) -->
<div class="absolute top-5 left-5 z-[1000] flex gap-3">
    <!-- Suche -->
    <div class="flex glass-panel rounded-2xl shadow-2xl p-1 border border-white/5 focus-within:ring-2 focus-within:ring-blue-500">
        <label for="search-input" class="sr-only" data-i18n="search_placeholder">Ort suchen</label>
        <input type="text" id="search-input" data-i18n-placeholder="search_placeholder" placeholder="Ort suchen..." class="bg-transparent px-4 py-2 text-sm text-white outline-none focus:ring-0 w-48 focus:w-72 transition-all duration-500 placeholder:text-slate-400">
        <button onclick="searchLocation()" aria-label="Suchen" class="p-2 text-slate-400 hover:text-white transition-colors focus:outline-none focus:text-white rounded-xl">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </button>
    </div>
    
    <!-- GPS Button -->
    <button onclick="locateUser()" id="locate-btn" data-i18n-title="locate_title" aria-label="Meinen Standort bestimmen" class="glass-panel p-3 rounded-2xl text-slate-400 hover:text-emerald-400 shadow-2xl transition-all border border-white/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-emerald-500" title="Mein Standort">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
    </button>
    
    <!-- Layer Button (Kartenhintergrund) -->
    <button onclick="toggleLayerMenu()" id="layer-btn-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="layer-menu" aria-label="Kartenhintergrund wechseln" data-i18n-title="layers_title" class="glass-panel p-3 rounded-2xl text-slate-400 hover:text-white shadow-2xl transition-all border border-white/10 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Karte wechseln">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
    </button>

    <!-- Export Button -->
    <button onclick="toggleExportMenu()" id="export-btn-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="export-menu" aria-label="Export Menü öffnen" data-i18n-title="export_title" class="glass-panel p-3 rounded-2xl text-blue-400 hover:text-blue-300 shadow-2xl transition-all border border-blue-500/20 active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500" title="Export">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
    </button>
</div>

<!-- INFO & RECHT KNOPF (Unten Links) -->
<div class="absolute bottom-8 left-5 z-[1000]">
    <button onclick="toggleLegalModal()" id="btn-legal-trigger" aria-haspopup="true" aria-expanded="false" aria-controls="legal-modal" class="glass-panel p-1.5 rounded-xl text-slate-400 hover:text-white shadow-xl transition-all border border-white/10 active:scale-95 flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-[10px] font-bold hidden md:inline" data-i18n="legal_btn">Info & Recht</span>
    </button>
</div>

<!-- INFO-BOX (Impressum) - Standardmäßig versteckt -->
<div id="legal-modal" role="dialog" aria-modal="true" aria-labelledby="legal-title" class="hidden absolute bottom-20 left-5 z-[2000] w-80 glass-panel rounded-3xl p-5 text-slate-300 shadow-2xl border border-white/10 max-h-[60vh] flex flex-col">
    <div class="flex justify-between items-center mb-4 border-b border-white/10 pb-3 shrink-0">
        <h2 id="legal-title" class="text-lg font-bold text-white flex items-center gap-2">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            Rechtliches
        </h2>
        <button onclick="toggleLegalModal()" aria-label="Schließen" class="text-slate-400 hover:text-white transition-colors focus:outline-none focus:text-white rounded-lg p-1">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
    </div>
    
    <div class="overflow-y-auto custom-scroll pr-2 text-xs space-y-6">
        <section>
            <h3 class="text-sm font-bold text-white mb-1">Impressum</h3>
            <p class="leading-relaxed text-slate-400">
                Angaben gemäß § 5 TMG:<br><br>
                <strong>Frank März</strong><br>
                Kersbacher Weg 3<br>
                91220 Schnaittach<br>
                Deutschland<br><br>
                Kontakt:<br>
                Telefon: +499153/9229501<br>
                E-Mail: info@openfiremap.org
            </p>
        </section>
        
        <section>
            <h3 class="text-sm font-bold text-white mb-1">Datenschutzerklärung (Kurzfassung)</h3>
            <p class="leading-relaxed text-slate-400 mb-2">
                Diese Anwendung läuft als "Client-Side Application" direkt in Ihrem Browser. Wir speichern keine personenbezogenen Daten auf eigenen Servern.
            </p>
            <ul class="list-disc list-inside mt-2 space-y-1 text-slate-500">
                <li><strong>Karten-Server:</strong> OSM, CartoDB, Esri, OpenTopoMap (Laden der Kacheln).</li>
                <li><strong>Overpass API:</strong> Abruf der Infrastrukturdaten.</li>
                <li><strong>Nominatim:</strong> Ortssuche.</li>
            </ul>
        </section>
        
        <section>
            <h3 class="text-sm font-bold text-white mb-1">Quellen & Lizenzen</h3>
            <ul class="list-disc list-inside space-y-1 text-slate-400">
                <li><strong>Kartendaten:</strong> &copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> (ODbL).</li>
                <li><strong>Stil:</strong> &copy; <a href="https://carto.com/attributions" target="_blank">CARTO</a>.</li>
                <li><strong>Satellit:</strong> &copy; Esri, DigitalGlobe, GeoEye, i-cubed, USDA, USGS, AEX, Getmapping, Aerogrid, IGN, IGP, swisstopo, and the GIS User Community.</li>
                <li><strong>Topographie:</strong> &copy; <a href="http://opentopomap.org" target="_blank">OpenTopoMap</a> (CC-BY-SA).</li>
            </ul>
        </section>

        <section class="border-t border-white/5 pt-2">
            <h3 class="text-sm font-bold text-white mb-1">Rechtlicher Hinweis</h3>
            <p class="leading-relaxed text-slate-400 mb-2">Dies ist ein rein privates, nicht-kommerzielles Projekt.</p>
            <p class="leading-relaxed text-amber-500/80 italic mb-2 font-semibold">"Keine Abmahnung ohne vorherigen Kontakt"</p>
        </section>
    </div>
</div>

<!-- LAYER MENU (Hintergrund-Auswahl) -->
<div id="layer-menu" role="menu" aria-labelledby="layer-btn-trigger" class="hidden absolute top-20 left-28 z-[1001] w-64 glass-panel rounded-2xl p-4 shadow-2xl text-white border border-white/10">
    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 text-center" data-i18n="bg_header">Hintergrund</h3>
    <div class="grid grid-cols-1 gap-1">
        <button onclick="setBaseLayer('voyager')" id="btn-voyager" class="layer-btn w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><div class="w-3 h-3 rounded-full bg-blue-500"></div> <span data-i18n="layer_std">Standard (Voyager)</span></button>
        <button onclick="setBaseLayer('positron')" id="btn-positron" class="layer-btn w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><div class="w-3 h-3 rounded-full bg-slate-300"></div> <span data-i18n="layer_print">Druck (Hell)</span></button>
        <button onclick="setBaseLayer('dark')" id="btn-dark" class="layer-btn w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><div class="w-3 h-3 rounded-full bg-slate-800"></div> <span data-i18n="layer_night">Nacht (Dunkel)</span></button>
        <button onclick="setBaseLayer('satellite')" id="btn-satellite" class="layer-btn w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><div class="w-3 h-3 rounded-full bg-green-600"></div> <span data-i18n="layer_sat">Satellit (Esri)</span></button>
        <button onclick="setBaseLayer('topo')" id="btn-topo" class="layer-btn w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><div class="w-3 h-3 rounded-full bg-amber-600"></div> <span data-i18n="layer_topo">Topographisch (OSM)</span></button>
        <button onclick="setBaseLayer('osm')" id="btn-osm" class="layer-btn w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5 flex items-center gap-2 border-t border-white/5 mt-1 pt-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><div class="w-3 h-3 rounded-full bg-emerald-500"></div> <span data-i18n="layer_osm">OSM (Intl)</span></button>
        <button onclick="setBaseLayer('osmde')" id="btn-osmde" class="layer-btn w-full text-left px-3 py-2 rounded-xl text-sm transition-all hover:bg-white/5 flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500"><div class="w-3 h-3 rounded-full bg-emerald-700"></div> <span data-i18n="layer_osmde">OSM (DE Style)</span></button>
    </div>
</div>

<!-- EXPORT MENU (Popup Fenster) -->
<div id="export-menu" role="dialog" aria-labelledby="export-title" aria-modal="true" class="hidden absolute top-20 left-5 z-[1001] w-80 glass-panel rounded-3xl p-6 shadow-2xl text-white border border-white/10">
    <div id="export-setup" class="space-y-5">
        <div class="flex justify-between items-center">
            <h3 id="export-title" class="font-bold text-lg" data-i18n="export_header">Export-Eigenschaften</h3>
            <button onclick="toggleExportMenu()" aria-label="Schließen" class="text-slate-400 hover:text-white focus:outline-none focus:text-white text-2xl leading-none">&times;</button>
        </div>
        
        <!-- Auswahl Format (A4, Frei) -->
        <div class="space-y-2">
            <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider" data-i18n="format_label">Format-Vorlage (Verhältnis)</label>
            <div class="grid grid-cols-3 gap-2" role="group">
                <button onclick="setExportFormat('free')" id="fmt-free" class="fmt-btn bg-white/10 p-2 rounded-xl text-[10px] font-bold border border-blue-400/50 text-blue-400 active focus:outline-none focus:ring-2 focus:ring-blue-500" data-i18n="fmt_free">FREI</button>
                <button onclick="setExportFormat('a4l')" id="fmt-a4l" class="fmt-btn bg-white/5 p-2 rounded-xl text-[10px] font-bold border border-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500" data-i18n="fmt_a4l">DIN QUER</button>
                <button onclick="setExportFormat('a4p')" id="fmt-a4p" class="fmt-btn bg-white/5 p-2 rounded-xl text-[10px] font-bold border border-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500" data-i18n="fmt_a4p">DIN HOCH</button>
            </div>
        </div>
        
        <!-- Auswahl Zoom-Level (Auflösung) -->
        <div class="space-y-2">
            <label class="text-[10px] uppercase font-bold text-slate-500 tracking-wider" data-i18n="zoom_label">Detail-Grad (Zoom)</label>
            <div class="grid grid-cols-4 gap-2" role="group">
                <button onclick="setExportZoom(15)" id="zoom-15" class="zoom-btn bg-white/5 p-2 rounded-xl text-[10px] font-bold border border-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500">Z15</button>
                <button onclick="setExportZoom(16)" id="zoom-16" class="zoom-btn bg-white/5 p-2 rounded-xl text-[10px] font-bold border border-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500">Z16</button>
                <button onclick="setExportZoom(17)" id="zoom-17" class="zoom-btn bg-white/5 p-2 rounded-xl text-[10px] font-bold border border-white/10 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500">Z17</button>
                <button onclick="setExportZoom(18)" id="zoom-18" class="zoom-btn bg-white/10 p-2 rounded-xl text-[10px] font-bold border border-blue-400/50 text-blue-400 active focus:outline-none focus:ring-2 focus:ring-blue-500">Z18</button>
            </div>
        </div>
        
        <button onclick="startSelection()" id="select-btn" class="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
            <span data-i18n="select_area_btn">Ausschnitt auf Karte wählen</span>
        </button>
        <div id="selection-info" class="hidden text-[11px] text-emerald-400 bg-emerald-400/10 p-2 rounded-lg text-center border border-emerald-400/20" data-i18n="area_fixed">Ausschnitt fixiert ✓</div>
        
        <button id="png-btn" onclick="exportAsPNG()" class="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:cursor-not-allowed py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-300"><span data-i18n="png_btn">Hydrantenplan (PNG)</span></button>
        <button id="gpx-btn" onclick="exportAsGPX()" class="w-full bg-emerald-600 hover:bg-emerald-500 py-3 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 shadow-lg border border-emerald-400/30 focus:outline-none focus:ring-2 focus:ring-emerald-300">
            <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            <span data-i18n="gpx_btn">Hydranten exportieren (GPX)</span>
        </button>
    </div>
    
    <!-- Ladebalken beim Export -->
    <div id="export-progress" class="hidden" role="status">
        <div class="flex justify-between items-center mb-4"><h3 class="font-bold text-lg exporting-active text-blue-400" data-i18n="exporting_title">Export wird erstellt...</h3></div>
        <div class="space-y-4">
            <div>
                <div class="flex justify-between text-[10px] mb-1 uppercase tracking-widest text-blue-400 font-bold"><span id="progress-label" data-i18n="loading_tiles">Lade Kacheln...</span><span id="progress-percent">0%</span></div>
                <div class="h-2 w-full bg-slate-800 rounded-full overflow-hidden"><div id="progress-bar" class="h-full bg-blue-500 w-0 transition-all duration-300"></div></div>
            </div>
            <button onclick="cancelExport()" class="w-full bg-red-500/10 hover:bg-red-500/20 text-red-400 py-2 rounded-xl text-sm font-semibold border border-red-500/20 focus:outline-none focus:ring-2 focus:ring-red-500" data-i18n="cancel_btn">Vorgang abbrechen</button>
        </div>
    </div>
</div>

<!-- Statusanzeige (Unten Rechts: Zoom & Datenstatus) -->
<div class="absolute bottom-10 right-10 z-[1000] glass-panel p-4 rounded-2xl text-[10px] text-slate-400 font-mono border border-white/5">
    <div class="flex justify-between gap-4"><span data-i18n="zoom_info">ZOOM</span><span id="zoom-val" class="text-white font-bold">14.0</span></div>
    <div class="flex justify-between gap-4"><span data-i18n="data_info">DATEN</span><span id="data-status" class="text-green-400">AKTUELL</span></div>
</div>

<!-- JAVASCRIPT LOGIK -->
<script>
    /* =========================================================================
       1. SPRACH-LOGIK & GLOBALE VARIABLEN
       Hier definieren wir die Grundzustände der App und laden die Sprache.
       ========================================================================= */
    
    // Wir fragen den Browser: "Welche Sprache sprichst du?" (z.B. "de-DE", "en-US")
    const userLangFull = navigator.language || navigator.userLanguage; 
    const userLangFullLower = userLangFull.toLowerCase();
    const userLangShort = userLangFull.split('-')[0]; // Nur "de", "en", etc.
    
    // Logik zur Bestimmung der richtigen Übersetzung
    let detectedLang = 'en'; // Fallback ist Englisch
    if (userLangFullLower === 'zh-tw') detectedLang = 'tw'; // Taiwan
    else if (userLangFullLower === 'zh-hk' || userLangFullLower === 'zh-mo') detectedLang = 'yue'; // Hongkong
    else if (userLangShort === 'zh') detectedLang = 'zh'; // Mandarin
    else if (typeof translations !== 'undefined' && translations[userLangShort]) detectedLang = userLangShort;
    
    const currentLang = detectedLang;
    
    // Hilfsfunktion: Gibt den übersetzten Text für einen Schlüssel zurück (oder den Schlüssel selbst)
    function t(key) {
        if (typeof translations === 'undefined') return key;
        return translations[currentLang][key] || translations['en'][key] || key;
    }

    // Geht durch das ganze HTML und tauscht Texte basierend auf 'data-i18n' Attributen aus
    function updatePageLanguage() {
        if (typeof translations === 'undefined') return;
        document.querySelectorAll('[data-i18n]').forEach(el => el.innerText = t(el.getAttribute('data-i18n')));
        document.querySelectorAll('[data-i18n-title]').forEach(el => el.title = t(el.getAttribute('data-i18n-title')));
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = t(el.getAttribute('data-i18n-placeholder')));
    }

    // Zentrale Variablen für den Zustand der Karte
    let map;                    // Das Leaflet-Kartenobjekt
    let markerLayer;            // Ebene für Icons (Hydranten etc.)
    let boundaryLayer;          // Ebene für Gemeindegrenzen
    let rangeLayerGroup;        // Ebene für den 100m Radius-Kreis
    let activeRangeCenter = null; // Speichert, welcher Hydrant gerade angeklickt ist
    
    // Controller zum Abbrechen von laufenden Anfragen (wichtig bei schnellem Zoomen)
    let currentRequestController; 
    let exportAbortController;    
    
    let cachedElements = [];        // Hier speichern wir die geladenen Daten im RAM
    let activeLayerConfig = 'voyager'; // Aktueller Kartenstil
    let exportFormat = 'free';      // Export-Format (A4 oder Frei)
    let exportZoomLevel = 18;       // Export-Qualität
    let isSelecting = false, selectionRect = null, startPoint = null, finalBounds = null; // Für das Auswahl-Tool
    let debounceTimer = null;       // Timer für verzögertes Laden

    // Adressen der verschiedenen Karten-Anbieter (Tile Server)
    const layerUrls = {
        voyager: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        positron: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
        dark: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
        osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        osmde: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png'
    };
    
    // Urheberrechtshinweise für die Karten
    const layerAttributions = {
        voyager: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        positron: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        dark: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        satellite: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP',
        topo: 'Kartendaten: &copy; <a href="https://openstreetmap.org/copyright">OSM</a>, <a href="http://opentopomap.org">OpenTopoMap</a>',
        osm: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        osmde: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    };

    // Text-Versionen der Urheberrechte für den PNG-Export
    const layerAttributionsText = {
        voyager: '© OpenStreetMap contributors, © CARTO',
        positron: '© OpenStreetMap contributors, © CARTO',
        dark: '© OpenStreetMap contributors, © CARTO',
        satellite: 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping',
        topo: 'Daten: © OpenStreetMap, Darstellung: © OpenTopoMap',
        osm: '© OpenStreetMap contributors',
        osmde: '© OpenStreetMap contributors'
    };

    // Overpass API Server (Wir nutzen zwei, falls einer ausfällt)
    const overpassEndpoints = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter'];

    /* =========================================================================
       2. INITIALISIERUNG
       Diese Funktionen starten die App, sobald die Seite geladen ist.
       ========================================================================= */
    
    // Zeigt eine kleine Nachricht oben rechts an (z.B. "Standort gefunden")
    function showNotification(msg, duration = 3000) {
        const box = document.getElementById('notification-box');
        if (!box) return;
        box.innerText = msg;
        box.style.display = 'block';
        // Falls schon ein Timer läuft, diesen stoppen
        if(box.hideTimeout) clearTimeout(box.hideTimeout);
        // Nach 'duration' Millisekunden wieder ausblenden
        box.hideTimeout = setTimeout(() => box.style.display = 'none', duration); 
    }

    function initMap() {
        updatePageLanguage();
        setupMenuAutoClose(); // Menüs automatisch schließen lassen
        
        // Layer-Gruppen initialisieren (wie Folien auf einem Overhead-Projektor)
        markerLayer = L.layerGroup();
        boundaryLayer = L.layerGroup(); 
        rangeLayerGroup = L.layerGroup(); 
        
        // Karte erstellen, Startpunkt: Schnaittach Zentrum
        map = L.map('map', { zoomControl: false, center: [49.555, 11.350], zoom: 14 });
        setBaseLayer('voyager'); // Standard-Hintergrund setzen
        
        // Layer zur Karte hinzufügen
        boundaryLayer.addTo(map); 
        rangeLayerGroup.addTo(map); 
        markerLayer.addTo(map);   
        
        // Event Listeners: Was passiert wann?
        
        // Wenn man die Karte bewegt (Ende der Bewegung + Zoom) -> Daten laden
        map.on('moveend zoomend', onMapMoveDebounced); 
        
        // Wenn gezoomt wird -> 100m Kreis anpassen
        map.on('zoomend', updateRangeCircle);    
        
        // Zoom-Anzeige unten rechts aktualisieren
        map.on('zoom', () => document.getElementById('zoom-val').innerText = map.getZoom().toFixed(1)); 
        
        // Auswahl-Werkzeug Logik (Maus ziehen)
        map.on('mousedown', onMouseDown);
        map.on('mousemove', onMouseMove);
        map.on('mouseup', onMouseUp);
        
        // Klick ins Leere -> Auswahl aufheben
        map.on('click', () => {
            if (activeRangeCenter && !isSelecting) {
                activeRangeCenter = null;
                updateRangeCircle();
            }
        });

        // Beim ersten Start sofort Daten laden
        fetchOSMData(); 
    }

    // Debounce-Funktion: Verhindert, dass bei jedem Pixel-Wackler sofort geladen wird.
    // Wir warten 500ms, nachdem der Nutzer aufgehört hat zu schieben.
    function onMapMoveDebounced() {
        if (debounceTimer) clearTimeout(debounceTimer);
        const statusEl = document.getElementById('data-status');
        statusEl.innerText = t('status_waiting'); // Zeige "WARTE..."
        statusEl.className = 'text-amber-400 font-bold'; 

        debounceTimer = setTimeout(() => {
            fetchOSMData(); // Erst jetzt wirklich laden
        }, 500); 
    }

    /* =========================================================================
       3. SMART CACHING & DATA FETCHING (NEUE LOGIK)
       Hier liegt der Schlüssel zur Performance-Optimierung.
       ========================================================================= */

    /**
     * FUNKTION: getSmartBBoxString
     * ZWECK: Grid-Snapping (Rasterung) der Koordinaten.
     * WARUM? Wenn du die Karte am Handy um 1 Pixel verschiebst, ändern sich die
     * Koordinaten von 49.123456 auf 49.123457. Für den Server ist das eine
     * komplett NEUE Anfrage. Wir runden die Koordinaten aber auf 4 Stellen.
     * So bleiben sie gleich, auch wenn man leicht wackelt -> Cache Hit!
     */
    function getSmartBBoxString(bounds) {
        // Faktor 10000 entspricht 4 Nachkommastellen (Genauigkeit ca. 11 Meter)
        const prec = 10000;
        
        // Süden/Westen: Wir runden AB (floor), um den Bereich eher etwas größer zu machen
        const s = Math.floor(bounds.getSouth() * prec) / prec;
        const w = Math.floor(bounds.getWest() * prec) / prec;
        
        // Norden/Osten: Wir runden AUF (ceil)
        const n = Math.ceil(bounds.getNorth() * prec) / prec;
        const e = Math.ceil(bounds.getEast() * prec) / prec;
        
        return `${s},${w},${n},${e}`;
    }

    /**
     * FUNKTION: fetchWithCache
     * ZWECK: Lädt Daten erst aus dem Speicher, dann aus dem Netz.
     * LOGIK:
     * 1. Prüfe 'sessionStorage': Haben wir diese URL schon mal geladen?
     * 2. JA -> Nimm Daten aus RAM (0ms Ladezeit).
     * 3. NEIN -> Frage Overpass API.
     * 4. Speichere Ergebnis für das nächste Mal.
     */
    async function fetchWithCache(url, signal) {
        // Eindeutiger Schlüssel für diese Anfrage
        const cacheKey = "ofm_cache_" + url;

        // 1. Cache prüfen
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
            console.log("⚡ Cache Hit: Daten aus Speicher geladen.");
            return JSON.parse(cachedData);
        }

        // 2. Netzwerk Anfrage (falls nicht im Cache)
        console.log("🌍 Cache Miss: Lade Daten aus dem Internet...");
        const response = await fetch(url, { signal });
        
        if (!response.ok) throw new Error(response.statusText);
        const text = await response.text();
        
        // Sicherheitscheck: Ist es wirklich JSON oder eine HTML-Fehlermeldung?
        if (text.trim().startsWith('<') || text.includes('Too Many Requests')) {
            throw new Error("API Limit oder Fehler");
        }

        const data = JSON.parse(text);

        // 3. Ergebnis speichern
        // Wir nutzen try-catch, weil der Speicher voll sein könnte (QuotaExceeded)
        try {
            sessionStorage.setItem(cacheKey, text);
        } catch (e) {
            console.warn("⚠️ Browser-Speicher voll! Lösche Cache und versuche es erneut...");
            sessionStorage.clear(); // Radikal aufräumen
            try {
                sessionStorage.setItem(cacheKey, text); // Neuer Versuch
            } catch (e2) {
                console.error("Cache immer noch voll, Daten werden nicht gespeichert.");
            }
        }

        return data;
    }

    // Hauptfunktion zum Laden der OSM-Daten
    async function fetchOSMData() {
        const zoom = map.getZoom();
        const status = document.getElementById('data-status');
        
        // Standby-Modus: Wenn zu weit rausgezoomt, nichts laden (schont API)
        if (zoom < 12) {
            status.innerText = t('status_standby');
            status.className = 'text-green-400'; 
            cachedElements = [];
            markerLayer.clearLayers();
            boundaryLayer.clearLayers();
            return; 
        }
        
        // HIER WIRD DIE NEUE LOGIK ANGEWENDET:
        // Wir holen die "smarte", gerundete Bounding Box
        const bbox = getSmartBBoxString(map.getBounds());
        
        status.innerText = t('status_loading'); 
        status.className = 'text-green-400';
        
        // Alte Anfrage abbrechen, falls noch eine läuft
        if (currentRequestController) currentRequestController.abort();
        currentRequestController = new AbortController();
        
        // Overpass QL Query zusammenbauen
        let queryParts = [];
        
        if (zoom >= 12) {
            // Wachen laden (Node, Way, Relation)
            queryParts.push(`nwr["amenity"="fire_station"](${bbox});`);
            queryParts.push(`nwr["building"="fire_station"](${bbox});`);
        }
        if (zoom >= 15) {
            // Hydranten & Wasserstellen laden
            queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"](${bbox});`);
        }
        if (zoom >= 15) {
            // Defibrillatoren laden
            queryParts.push(`node["emergency"="defibrillator"](${bbox});`);
        }

        let boundaryQuery = '';
        if (zoom >= 14) {
            // Gemeindegrenzen laden (Level 8)
            boundaryQuery = `(way["boundary"="administrative"]["admin_level"="8"](${bbox});)->.boundaries; .boundaries out geom;`;
        }

        if (queryParts.length === 0 && boundaryQuery === '') return;

        const q = `[out:json][timeout:90];
        (
          ${queryParts.join('\n')}
        )->.pois;
        .pois out center;
        ${boundaryQuery}`;
        
        // Abfrage mit Retry-Logik und Cache
        let success = false;
        
        for (let endpoint of overpassEndpoints) {
            if (success) break;
            try {
                const url = `${endpoint}?data=${encodeURIComponent(q)}`;
                // Hier rufen wir unsere neue Caching-Funktion auf
                const data = await fetchWithCache(url, currentRequestController.signal);
                
                cachedElements = data.elements; 
                renderMarkers(data.elements, zoom); 
                status.innerText = t('status_current'); 
                status.className = 'text-green-400';
                success = true;
                
            } catch (e) {
                if (e.name === 'AbortError') return; // User hat abgebrochen (Zoom/Move) -> egal
                console.warn(`Server ${endpoint} fehlgeschlagen:`, e);
            }
        }
        
        if (!success) {
            status.innerText = t('status_error');
            status.className = 'text-red-500 font-bold';
        }
    }

    /* =========================================================================
       4. RENDERING & UI LOGIK
       Hier wird aus den rohen Daten bunte Grafik.
       ========================================================================= */
    
    // Erstellt den SVG-Code für die Icons (Vektorgrafiken im Code statt Bilder)
    function getSVGContent(type) {
        // Spezial-Icon für Defis
        if (type === 'defibrillator') {
             return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" fill="#16a34a" stroke="white" stroke-width="5"/>
                <path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/>
                <path d="M55 45 L45 55 L55 55 L45 65" stroke="#16a34a" stroke-width="3" fill="none"/>
            </svg>`;
        }
        // Farben: Blau für Wasser, Rot für Hydranten
        const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
        const color = isWater ? '#3b82f6' : '#ef4444'; 
        
        // Buchstaben-Codes für Hydranten-Typen
        let char = '';
        switch(type) {
            case 'underground': char = 'U'; break; // Unterflur
            case 'pillar':      char = 'O'; break; // Überflur
            case 'pipe':        char = 'I'; break; // Steigleitung
            case 'dry_barrel':  char = 'Ø'; break; // Trocken
            default:            char = '';
        }
        
        // Wachen-Symbol (Haus)
        if (type === 'station') return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="#ef4444" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
        
        // Standard Hydranten-Symbol (Kreis mit Buchstabe)
        return `<svg width="100" height="100" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
    }

    // Zeichnet alle Marker auf die Karte
    function renderMarkers(elements, zoom) {
        markerLayer.clearLayers(); 
        boundaryLayer.clearLayers(); 
        const renderedLocations = []; // Zum Verhindern von Duplikaten
        
        elements.forEach(el => {
            const tags = el.tags || {};
            
            // Grenzen zeichnen
            if (tags.boundary === 'administrative' && el.geometry) {
                if (zoom < 14) return; 
                const latlngs = el.geometry.map(p => [p.lat, p.lon]);
                L.polyline(latlngs, { color: '#333333', weight: 1, dashArray: '10, 10', opacity: 0.7 }).addTo(boundaryLayer);
                return; 
            }
            
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            if (!lat || !lon) return;

            // Typ bestimmen
            const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
            const isDefib = tags.emergency === 'defibrillator';
            let type = '';

            if (isStation) type = 'station';
            else if (isDefib) type = 'defibrillator';
            else type = tags['fire_hydrant:type'] || tags.emergency;

            // Zoom-Filter: Was wird wann angezeigt?
            if (isStation && zoom < 12) return; 
            if (!isStation && !isDefib && zoom < 15) return; 
            if (isDefib && zoom < 15) return; 

            // Duplikate filtern (manchmal liefert API Node UND Way für das gleiche Objekt)
            const alreadyDrawn = renderedLocations.some(loc => Math.abs(loc.lat - lat) < 0.0001 && Math.abs(loc.lon - lon) < 0.0001);
            if (isStation && alreadyDrawn) return;
            if (isStation) renderedLocations.push({lat, lon});

            let marker = null;

            // Marker erstellen (Unterscheidung Punkt vs. SVG Icon je nach Zoom)
            if (isStation) {
                if (zoom < 14) {
                     L.marker([lat, lon], { icon: L.divIcon({ html: '<div class="station-square"></div>', iconSize: [10,10] }) }).addTo(markerLayer);
                } else {
                     const iconHtml = getSVGContent(type);
                     marker = L.marker([lat, lon], { icon: L.divIcon({ className: 'icon-container', html: iconHtml, iconSize: [32, 32] }), zIndexOffset: 1000 }).addTo(markerLayer);
                }
            } else if (isDefib) {
                if (zoom < 17) {
                    L.marker([lat, lon], { icon: L.divIcon({ className: 'defib-dot', iconSize: [10,10] }) }).addTo(markerLayer);
                } else {
                    const iconHtml = getSVGContent(type);
                    marker = L.marker([lat, lon], { icon: L.divIcon({ className: 'icon-container', html: iconHtml, iconSize: [28, 28] }), zIndexOffset: 2000 }).addTo(markerLayer);
                }
            } else {
                if (zoom < 17) {
                    const color = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type) ? 'tank-dot' : 'hydrant-dot';
                    L.marker([lat, lon], { icon: L.divIcon({ className: color, iconSize: [10,10] }) }).addTo(markerLayer);
                } else {
                    const iconHtml = getSVGContent(type);
                    marker = L.marker([lat, lon], { icon: L.divIcon({ className: 'icon-container', html: iconHtml, iconSize: [28, 28] }), zIndexOffset: 0 }).addTo(markerLayer);
                    // Radius-Kreis bei Klick aktivieren
                    marker.on('click', (e) => { L.DomEvent.stopPropagation(e); showRangeCircle(lat, lon); });
                }
            }

            // Tooltips (Info-Blasen) hinzufügen (nur bei hohem Zoom)
            if (marker && zoom === 18) {
                marker.bindTooltip(generateTooltip(tags), { 
                    interactive: true, permanent: false, sticky: false, direction: 'top', opacity: 0.95 
                });
                // Smart-Tooltip Logik: Bleibt kurz offen zum Lesen, schließt sich dann automatisch
                marker.off('mouseover'); marker.off('mouseout');
                marker._tooltipCloseTimer = null;
                marker.on('mouseover', function() {
                    if (this._tooltipCloseTimer) { clearTimeout(this._tooltipCloseTimer); this._tooltipCloseTimer = null; }
                    this.openTooltip();
                });
                marker.on('mouseout', function() {
                    this._tooltipCloseTimer = setTimeout(() => { this.closeTooltip(); }, 3000);
                });
                // Verhindern, dass Tooltip zugeht, wenn man mit der Maus drauf ist
                marker.on('tooltipopen', function(e) {
                    const tooltipNode = e.tooltip._container;
                    if (!tooltipNode) return;
                    L.DomEvent.on(tooltipNode, 'mouseenter', () => {
                        if (this._tooltipCloseTimer) { clearTimeout(this._tooltipCloseTimer); this._tooltipCloseTimer = null; }
                    });
                    L.DomEvent.on(tooltipNode, 'mouseleave', () => {
                        this._tooltipCloseTimer = setTimeout(() => { this.closeTooltip(); }, 3000);
                    });
                });
            }
        });
    }

    // Erzeugt das HTML für den Tooltip (Daten aus den Tags)
    function generateTooltip(tags) {
        let tooltipTitle = tags.name || t('details');
        if (tags.emergency === 'defibrillator') tooltipTitle = t('defib');

        let html = `<div class="p-2 min-w-[180px]">
            <div class="font-bold text-sm border-b border-white/20 pb-1 mb-1 text-blue-400">${tooltipTitle}</div>
            <div class="text-[10px] font-mono grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">`;
        for (const [key, val] of Object.entries(tags)) {
            html += `<div class="text-slate-400 text-right">${key}:</div><div class="text-slate-200 break-words">${val}</div>`;
        }
        html += `</div></div>`;
        return html;
    }

    // Setzt den Mittelpunkt für den 100m Kreis
    function showRangeCircle(lat, lon) {
        activeRangeCenter = {lat, lon};
        updateRangeCircle();
    }

    // Zeichnet den 100m Radius-Kreis
    function updateRangeCircle() {
        rangeLayerGroup.clearLayers();
        if (!activeRangeCenter) return;
        const zoom = map.getZoom();
        if (zoom < 16) return; // Macht bei wenig Zoom keinen Sinn

        L.circle([activeRangeCenter.lat, activeRangeCenter.lon], {
            color: '#f97316', fillColor: '#f97316', fillOpacity: 0.15, radius: 100, weight: 2, dashArray: '5, 8', interactive: false 
        }).addTo(rangeLayerGroup);

        // Beschriftung "100 m" hinzufügen
        if (zoom >= 17) {
            const latRad = activeRangeCenter.lat * Math.PI / 180;
            const kmPerDegLon = 111.32 * Math.cos(latRad);
            const offsetLon = 0.05 / kmPerDegLon; 
            const labelPos = [activeRangeCenter.lat, activeRangeCenter.lon + offsetLon];
            const labelMarker = L.marker(labelPos, {opacity: 0, interactive: false}).addTo(rangeLayerGroup);
            labelMarker.bindTooltip("100 m", { permanent: true, direction: 'center', className: 'range-label', offset: [0, 0] }).openTooltip();
        }
    }

    // GPS Funktion: Fragt den Browser nach Position
    function locateUser() {
        if (!navigator.geolocation) { showNotification(t('geo_error')); return; }
        const btn = document.getElementById('locate-btn');
        const icon = btn ? btn.querySelector('svg') : null;
        if(icon) icon.classList.add('animate-spin'); 

        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                map.flyTo([latitude, longitude], 18, { animate: true, duration: 1.5 });
                if(icon) icon.classList.remove('animate-spin');
                showNotification(t('geo_found'));
            },
            (err) => {
                console.warn("Geolocation Fehler:", err);
                if(icon) icon.classList.remove('animate-spin');
                showNotification(t('geo_fail'));
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    }

    /* =========================================================================
       5. MENU & EXPORT FUNKTIONEN
       Steuerung der UI-Elemente und der Export-Logik.
       ========================================================================= */

    // Schließt alle offenen Menüs (damit nicht 2 gleichzeitig offen sind)
    function closeAllMenus() {
        const layerMenu = document.getElementById('layer-menu');
        const layerBtn = document.getElementById('layer-btn-trigger');
        if (layerMenu && !layerMenu.classList.contains('hidden')) {
            layerMenu.classList.add('hidden');
            if(layerBtn) layerBtn.setAttribute('aria-expanded', 'false');
        }

        const exportMenu = document.getElementById('export-menu');
        const exportBtn = document.getElementById('export-btn-trigger');
        if (exportMenu && !exportMenu.classList.contains('hidden')) {
            exportMenu.classList.add('hidden');
            if(exportBtn) exportBtn.setAttribute('aria-expanded', 'false');
        }

        const legalModal = document.getElementById('legal-modal');
        const legalBtn = document.getElementById('btn-legal-trigger');
        if (legalModal && legalModal.style.display !== 'none' && legalModal.style.display !== '') {
            legalModal.style.display = 'none';
            if(legalBtn) legalBtn.setAttribute('aria-expanded', 'false');
        }
    }

    // Timer-Logik: Menüs schließen sich nach 10s von selbst
    function setupMenuAutoClose() {
        ['layer-menu', 'export-menu', 'legal-modal'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            let closeTimer = null;
            el.addEventListener('mouseleave', () => {
                const isHidden = id === 'legal-modal' ? (el.style.display === 'none' || el.style.display === '') : el.classList.contains('hidden');
                if (isHidden) return;
                closeTimer = setTimeout(() => {
                    if (id === 'legal-modal') {
                        el.style.display = 'none';
                        const btn = document.getElementById('btn-legal-trigger');
                        if(btn) btn.setAttribute('aria-expanded', 'false');
                    } else {
                        el.classList.add('hidden');
                        const btnId = id === 'layer-menu' ? 'layer-btn-trigger' : 'export-btn-trigger';
                        const btn = document.getElementById(btnId);
                        if(btn) btn.setAttribute('aria-expanded', 'false');
                    }
                }, 10000); 
            });
            el.addEventListener('mouseenter', () => {
                if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; }
            });
        });
    }

    // Export Einstellungen setzen
    function setExportFormat(fmt) {
        exportFormat = fmt;
        document.querySelectorAll('.fmt-btn').forEach(b => {
            b.classList.remove('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
            b.classList.add('bg-white/5');
        });
        document.getElementById(`fmt-${fmt}`).classList.add('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
        clearSelection(); 
    }

    function setExportZoom(z) {
        if (activeLayerConfig === 'topo' && z > 17) return; 
        exportZoomLevel = z;
        document.querySelectorAll('.zoom-btn').forEach(b => {
            b.classList.remove('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
            b.classList.add('bg-white/5');
        });
        document.getElementById(`zoom-${z}`).classList.add('active', 'text-blue-400', 'border-blue-400/50', 'bg-white/10');
    }

    // Startet den Modus "Ausschnitt wählen"
    function startSelection() {
        isSelecting = true;
        clearSelection();
        map.dragging.disable(); 
        map.getContainer().classList.add('selection-mode'); 
        showNotification(t('drag_area')); 
    }

    function clearSelection() {
        if (selectionRect) { map.removeLayer(selectionRect); selectionRect = null; }
        finalBounds = null;
        document.getElementById('selection-info').classList.add('hidden');
    }

    // Maus-Logik für Rechteck-Auswahl
    function onMouseDown(e) {
        if (!isSelecting) return;
        startPoint = e.latlng;
        selectionRect = L.rectangle([startPoint, startPoint], {
            color: '#3b82f6', weight: 2, fillOpacity: 0.2, interactive: false
        }).addTo(map);
    }

    function onMouseMove(e) {
        if (!isSelecting || !startPoint || !selectionRect) return;
        let current = e.latlng;
        // Seitenverhältnis erzwingen bei DIN Formaten
        if (exportFormat !== 'free') {
            const ratio = (exportFormat === 'a4l') ? 1.4142 : 0.7071; 
            const lngScale = Math.cos(startPoint.lat * Math.PI / 180);
            const dy = Math.abs(current.lat - startPoint.lat);
            const dx = (dy * ratio) / lngScale;
            const latDir = current.lat > startPoint.lat ? 1 : -1;
            const lngDir = current.lng > startPoint.lng ? 1 : -1;
            current = L.latLng(startPoint.lat + (latDir * dy), startPoint.lng + (lngDir * dx));
        }
        selectionRect.setBounds([startPoint, current]);
    }

    function onMouseUp(e) {
        if (!isSelecting || !startPoint) return;
        finalBounds = selectionRect.getBounds(); 
        isSelecting = false; startPoint = null;
        map.dragging.enable(); 
        map.getContainer().classList.remove('selection-mode');
        document.getElementById('selection-info').classList.remove('hidden');
    }

    // Hintergrundkarte wechseln
    function setBaseLayer(key) {
        activeLayerConfig = key;
        map.eachLayer(layer => { if (layer instanceof L.TileLayer) map.removeLayer(layer); });
        const attribution = layerAttributions[key] || '&copy; OSM';
        L.tileLayer(layerUrls[key], { attribution: attribution }).addTo(map);
        
        document.querySelectorAll('.layer-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`btn-${key}`).classList.add('active');
        const btn18 = document.getElementById('zoom-18');
        if (key === 'topo') {
            btn18.disabled = true;
            if (exportZoomLevel > 17) setExportZoom(17);
        } else {
            btn18.disabled = false;
        }
    }

    // Menüs öffnen/schließen
    function toggleExportMenu() { 
        const menu = document.getElementById('export-menu');
        const btn = document.getElementById('export-btn-trigger');
        const isCurrentlyHidden = menu.classList.contains('hidden');
        closeAllMenus();
        if (isCurrentlyHidden) {
            menu.classList.remove('hidden');
            btn.setAttribute('aria-expanded', 'true');
            resetExportUI();
        }
    }

    function toggleLayerMenu() { 
        const menu = document.getElementById('layer-menu');
        const btn = document.getElementById('layer-btn-trigger');
        const isCurrentlyHidden = menu.classList.contains('hidden');
        closeAllMenus();
        if (isCurrentlyHidden) {
            menu.classList.remove('hidden');
            btn.setAttribute('aria-expanded', 'true');
        }
    }

    function toggleLegalModal() { 
        const modal = document.getElementById('legal-modal');
        const btn = document.getElementById('btn-legal-trigger');
        const isCurrentlyVisible = (modal.style.display === 'flex');
        closeAllMenus();
        if (!isCurrentlyVisible) {
            modal.style.display = 'flex';
            btn.setAttribute('aria-expanded', 'true');
        }
    }

    function resetExportUI() {
        document.getElementById('export-setup').classList.remove('hidden');
        document.getElementById('export-progress').classList.add('hidden');
        document.getElementById('progress-bar').style.width = '0%';
    }
    function cancelExport() { if(exportAbortController) exportAbortController.abort(); }

    // Adresssuche (Nominatim)
    function searchLocation() {
        const q = document.getElementById('search-input').value;
        if (!q) return;
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}`)
            .then(r => r.json())
            .then(d => { if(d.length) map.flyTo([d[0].lat, d[0].lon], 18); });
    }

    // GPX Export Funktion
    function exportAsGPX() {
        const bounds = finalBounds || map.getBounds();
        const pointsToExport = cachedElements.filter(el => {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            if (!lat || !lon) return false;
            return bounds.contains(L.latLng(lat, lon));
        });

        if (pointsToExport.length === 0) {
            showNotification(t('no_objects'));
            return;
        }

        let gpx = '<?xml version="1.0" encoding="UTF-8"?>\n';
        gpx += '<gpx version="1.1" creator="OpenFireMap V2" xmlns="http://www.topografix.com/GPX/1/1">\n';
        gpx += `  <metadata><name>Hydranten Export</name><time>${new Date().toISOString()}</time></metadata>\n`;

        pointsToExport.forEach(el => {
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            const tags = el.tags || {};
            
            const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
            const isHydrant = tags.emergency && ['fire_hydrant', 'water_tank', 'suction_point', 'fire_water_pond', 'cistern'].some(t => tags.emergency.includes(t));
            const isDefib = tags.emergency === 'defibrillator';

            if (!isStation && !isHydrant && !isDefib) return;

            let name = tags.name || (isStation ? t('station') : (isDefib ? t('defib') : t('hydrant')));
            if (!tags.name && tags['fire_hydrant:type']) name = `H ${tags['fire_hydrant:type']}`;
            if (!tags.name && tags['ref']) name = `${isStation ? 'Wache' : 'H'} ${tags['ref']}`;

            let desc = [];
            for (const [k, v] of Object.entries(tags)) desc.push(`${k}: ${v}`);
            
            gpx += `  <wpt lat="${lat}" lon="${lon}">\n`;
            gpx += `    <name>${escapeXML(name)}</name>\n`;
            gpx += `    <desc>${escapeXML(desc.join('\n'))}</desc>\n`;
            gpx += `    <sym>${isStation ? 'Fire Station' : 'Hydrant'}</sym>\n`;
            gpx += `  </wpt>\n`;
        });
        gpx += '</gpx>';

        const blob = new Blob([gpx], {type: 'application/gpx+xml'});
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `OpenFireMap_Export_${new Date().toISOString().slice(0,10)}.gpx`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
        
        showNotification(`${pointsToExport.length} ${t('gpx_success')}`);
        toggleExportMenu();
    }

    // Hilfsfunktion: Sonderzeichen für GPX escapen
    function escapeXML(str) {
        return str.replace(/[<>&'"]/g, c => {
            switch (c) {
                case '<': return '&lt;'; case '>': return '&gt;'; case '&': return '&amp;'; case '\'': return '&apos;'; case '"': return '&quot;';
            }
        });
    }

    const ZOOM_LIMITS_KM = { 12: 30, 13: 25, 14: 20, 15: 15, 16: 10, 17: 8, 18: 5 };

    // PNG Export Funktion (Die komplexe Logik)
    async function exportAsPNG() {
        exportAbortController = new AbortController();
        const signal = exportAbortController.signal;
        
        document.getElementById('export-setup').classList.add('hidden');
        document.getElementById('export-progress').classList.remove('hidden');
        const progressBar = document.getElementById('progress-bar'), progressPercent = document.getElementById('progress-percent'), progressLabel = document.getElementById('progress-label');
        
        const targetZoom = exportZoomLevel;
        const fallbackZoom = targetZoom - 1; 
        const bounds = finalBounds || map.getBounds(); 
        const nw = bounds.getNorthWest(), se = bounds.getSouthEast();

        progressLabel.innerText = t('locating'); 
        
        let displayTitle = "OpenFireMap.org";
        const centerLat = bounds.getCenter().lat;
        const centerLon = bounds.getCenter().lng;

        // Versuchen, den Stadtnamen zu finden
        try {
            const fetchAddress = async (lat, lon) => {
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18`); 
                const d = await res.json();
                const addr = d.address || {};
                const city = addr.city || addr.town || addr.village || addr.municipality || "";
                const suburb = addr.suburb || addr.neighbourhood || addr.hamlet || "";
                return { city, suburb };
            };
            const centerLoc = await fetchAddress(centerLat, centerLon);
            if (centerLoc.city) displayTitle = centerLoc.suburb ? `${centerLoc.city} - ${centerLoc.suburb}` : centerLoc.city;
        } catch (e) { console.error("Titel Fehler:", e); }

        // Mathe-Magie zur Berechnung der Kacheln
        const worldSize = (z) => Math.pow(2, z);
        const lat2tile = (lat, z) => (1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * worldSize(z);
        const lon2tile = (lon, z) => (lon + 180) / 360 * worldSize(z);
        
        const x1 = Math.floor(lon2tile(nw.lng, targetZoom));
        const y1 = Math.floor(lat2tile(nw.lat, targetZoom));
        const x2 = Math.floor(lon2tile(se.lng, targetZoom));
        const y2 = Math.floor(lat2tile(se.lat, targetZoom));

        const margin = 40, footerH = 60; 
        const mapWidth = (x2 - x1 + 1) * 256;
        const mapHeight = (y2 - y1 + 1) * 256;

        // Sicherheitscheck: Bild zu groß?
        if (canvas.width > 14000 || canvas.height > 14000) { 
            showNotification(t('too_large'), 5000); toggleExportMenu(); return; 
        }

        const mPerPx = (Math.cos(bounds.getCenter().lat * Math.PI / 180) * 2 * Math.PI * 6378137) / (256 * Math.pow(2, targetZoom));
        const maxKm = ZOOM_LIMITS_KM[targetZoom] || 5; 
        const maxMeters = maxKm * 1000;
        const widthMeters = mapWidth * mPerPx, heightMeters = mapHeight * mPerPx;

        if (widthMeters > maxMeters || heightMeters > maxMeters) {
             const currentMax = Math.max(widthMeters, heightMeters) / 1000;
             showNotification(`Zoom ${targetZoom}: Max. ${maxKm}km! (Aktuell: ~${currentMax.toFixed(1)}km)`, 6000); 
             toggleExportMenu(); return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = mapWidth + (margin * 2); canvas.height = mapHeight + margin + footerH + margin; 
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Kacheln laden
        const totalTiles = (x2 - x1 + 1) * (y2 - y1 + 1);
        let loaded = 0;
        const baseUrlTpl = layerUrls[activeLayerConfig].replace('{s}', 'a').replace('{r}', '');

        progressLabel.innerText = `${t('loading_tiles')} (Z${targetZoom})...`;
        const tileQueue = [];
        for (let x = x1; x <= x2; x++) for (let y = y1; y <= y2; y++) tileQueue.push({x, y});

        const processQueue = async () => {
            while (tileQueue.length > 0 && !signal.aborted) {
                const {x, y} = tileQueue.shift();
                await new Promise(resolve => {
                    const img = new Image(); img.crossOrigin = "anonymous";
                    const zTargetUrl = baseUrlTpl.replace('{z}', targetZoom).replace('{x}', x).replace('{y}', y);
                    img.onload = () => { ctx.drawImage(img, (x - x1) * 256 + margin, (y - y1) * 256 + margin); loaded++; updateProgress(); resolve(); };
                    img.onerror = () => {
                        // Fallback: Wenn Z18 fehlt, lade Z17 und skaliere hoch
                        const zFallback_x = Math.floor(x/2); const zFallback_y = Math.floor(y/2);
                        const off_x = (x % 2) * 128; const off_y = (y % 2) * 128;
                        const zFallbackUrl = baseUrlTpl.replace('{z}', fallbackZoom).replace('{x}', zFallback_x).replace('{y}', zFallback_y);
                        const fImg = new Image(); fImg.crossOrigin = "anonymous"; fImg.src = zFallbackUrl;
                        fImg.onload = () => { ctx.drawImage(fImg, off_x, off_y, 128, 128, (x - x1) * 256 + margin, (y - y1) * 256 + margin, 256, 256); loaded++; updateProgress(); resolve(); };
                        fImg.onerror = () => { loaded++; resolve(); };
                    };
                    img.src = zTargetUrl;
                });
            }
        };

        const workers = [];
        for (let i = 0; i < 8; i++) workers.push(processQueue()); // 8 gleichzeitige Downloads
        await Promise.all(workers);

        function updateProgress() { const p = Math.round((loaded / totalTiles) * 80); progressBar.style.width = p + "%"; progressPercent.innerText = p + "%"; }
        if(signal.aborted) { toggleExportMenu(); return; }
        
        // Grenzen zeichnen
        progressLabel.innerText = t('render_bounds');
        ctx.save(); ctx.translate((-x1 * 256) + margin, (-y1 * 256) + margin); 
        ctx.strokeStyle = "#333333"; ctx.lineWidth = 2; ctx.setLineDash([20, 20]); ctx.lineCap = "round";

        for (let el of cachedElements) {
            if (el.tags && el.tags.boundary === 'administrative' && el.geometry) {
                if (targetZoom < 14) continue; 
                ctx.beginPath();
                let first = true;
                for (let p of el.geometry) {
                    const px = lon2tile(p.lon, targetZoom) * 256;
                    const py = lat2tile(p.lat, targetZoom) * 256;
                    if (first) { ctx.moveTo(px, py); first = false; } else { ctx.lineTo(px, py); }
                }
                ctx.stroke();
            }
        }
        ctx.restore();

        // Icons zeichnen
        progressLabel.innerText = t('render_infra');
        ctx.save(); ctx.translate((-x1 * 256) + margin, (-y1 * 256) + margin);
        const iconCache = {};
        const renderedExportLocations = []; 

        for (let el of cachedElements) {
            const tags = el.tags || {};
            if (tags.boundary === 'administrative') continue;
            const lat = el.lat || el.center?.lat;
            const lon = el.lon || el.center?.lon;
            const isStation = tags.amenity === 'fire_station' || tags.building === 'fire_station';
            
            if (isStation) {
                const alreadyDrawn = renderedExportLocations.some(loc => Math.abs(loc.lat - lat) < 0.0001 && Math.abs(loc.lon - lon) < 0.0001);
                if (alreadyDrawn) continue;
                renderedExportLocations.push({lat, lon});
            }

            const type = isStation ? 'station' : (tags.emergency === 'defibrillator' ? 'defibrillator' : (tags['fire_hydrant:type'] || tags.emergency));
            const tx = lon2tile(lon, targetZoom) * 256;
            const ty = lat2tile(lat, targetZoom) * 256;
            
            if (tx < x1*256 || tx > (x2+1)*256 || ty < y1*256 || ty > (y2+1)*256) continue;

            if (isStation && targetZoom < 12) continue;
            if (type === 'defibrillator') { if (targetZoom < 15) continue; } else if (!isStation && targetZoom < 15) continue;

            const drawAsStationSquare = isStation && targetZoom < 14;
            const drawAsHydrantDot = !isStation && type !== 'defibrillator' && targetZoom < 17;
            const drawAsDefibDot = type === 'defibrillator' && targetZoom >= 15 && targetZoom < 17;

            if (drawAsHydrantDot || drawAsStationSquare || drawAsDefibDot) {
                const isWater = ['water_tank', 'cistern', 'fire_water_pond', 'suction_point'].includes(type);
                const color = isStation ? '#ef4444' : (type === 'defibrillator' ? '#16a34a' : (isWater ? '#3b82f6' : '#ef4444'));
                ctx.beginPath();
                if (drawAsStationSquare) ctx.rect(tx - 5, ty - 5, 10, 10); else ctx.arc(tx, ty, 5, 0, 2 * Math.PI);
                ctx.fillStyle = color; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = "white"; ctx.stroke();
            } else {
                if (!iconCache[type]) {
                    const svgB = new Blob([getSVGContent(type)], {type: 'image/svg+xml;charset=utf-8'}), url = URL.createObjectURL(svgB), img = new Image();
                    img.src = url; await new Promise(res => img.onload = res); iconCache[type] = img;
                }
                ctx.shadowColor = "rgba(0,0,0,0.5)"; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;
                const iconScale = targetZoom < 17 ? 0.8 : 1.0; 
                const size = (type === 'station' ? 38 : 34) * iconScale;
                ctx.drawImage(iconCache[type], tx - size/2, ty - size/2, size, size);
                ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
            }
        }
        ctx.restore();

        // Footer & Header (Titel, Maßstab, Datum)
        progressLabel.innerText = t('layout_final');
        const bannerH = 170; 
        ctx.fillStyle = "rgba(255, 255, 255, 0.98)"; ctx.fillRect(margin, margin, mapWidth, bannerH);
        ctx.strokeStyle = "rgba(15, 23, 42, 0.2)"; ctx.lineWidth = 3; 
        ctx.strokeRect(margin, margin, mapWidth, bannerH);
        ctx.strokeRect(margin, margin + bannerH, mapWidth, mapHeight - bannerH);
        
        const centerX = margin + (mapWidth / 2);
        ctx.fillStyle = "#0f172a"; ctx.textAlign = "center";
        const finalTitle = displayTitle === "OpenFireMap.org" ? "OpenFireMap.org" : `${t('plan_title')} ${displayTitle}`;
        ctx.font = "bold 44px Arial, sans-serif"; ctx.fillText(finalTitle, centerX, margin + 55);
        
        const now = new Date();
        ctx.font = "22px Arial, sans-serif"; ctx.fillStyle = "#334155";
        
        const localeMap = { 'de': 'de-DE', 'en': 'en-US', 'fr': 'fr-FR', 'es': 'es-ES', 'it': 'it-IT', 'pl': 'pl-PL', 'nl': 'nl-NL', 'cs': 'cs-CZ', 'da': 'da-DK', 'fi': 'fi-FI', 'sv': 'sv-SE', 'no': 'nb-NO', 'pt': 'pt-PT', 'fl': 'nl-BE', 'lb': 'lb-LU', 'ja': 'ja-JP', 'ko': 'ko-KR', 'ms': 'ms-MY', 'th': 'th-TH', 'zh': 'zh-CN', 'yue': 'zh-HK', 'tw': 'zh-TW' };
        const dateLocale = localeMap[currentLang] || 'en-US';
        const dateStr = now.toLocaleDateString(dateLocale, { year: 'numeric', month: 'long' });
        
        ctx.fillText(`${t('legend_date')}: ${dateStr} | ${t('legend_res')}: Zoom ${targetZoom} (~${mPerPx.toFixed(2)} m/px)`, centerX, margin + 95);
        ctx.font = "italic 16px Arial, sans-serif"; ctx.fillStyle = "#64748b";
        ctx.fillText(layerAttributionsText[activeLayerConfig] || '© OpenStreetMap contributors', centerX, margin + 125);

        // Maßstabsbalken zeichnen
        const prettyD = [1000, 500, 250, 100, 50]; 
        let distM = 100, scaleW = 100 / mPerPx;
        for (let d of prettyD) { let w = d / mPerPx; if (w <= mapWidth * 0.3) { distM = d; scaleW = w; break; } }
        
        const sX = margin + mapWidth - scaleW - 40; const sY = margin + mapHeight - 40;
        ctx.fillStyle = "rgba(255, 255, 255, 0.8)"; ctx.fillRect(sX - 10, sY - 50, scaleW + 20, 60);
        ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 3; 
        ctx.beginPath(); ctx.moveTo(sX, sY - 10); ctx.lineTo(sX, sY); ctx.lineTo(sX + scaleW, sY); ctx.lineTo(sX + scaleW, sY - 10); ctx.stroke();
        ctx.fillStyle = "#0f172a"; ctx.font = "bold 18px Arial"; ctx.fillText(`${distM} m`, sX + scaleW / 2, sY - 15);

        const footerY = margin + mapHeight + (footerH / 2) + 10; 
        ctx.fillStyle = "#334155";
        ctx.textAlign = "left"; ctx.font = "16px Arial, sans-serif"; ctx.fillText("OpenFireMap.org", margin, footerY);
        ctx.textAlign = "right";
        const timeStr = now.toLocaleString(dateLocale, { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
        ctx.fillText(timeStr, margin + mapWidth, footerY);

        progressBar.style.width = "100%";
        // Download auslösen
        const link = document.createElement('a'); 
        link.download = `Hydrantenplan_${finalTitle.replace(/[\s\.]/g, '_')}_Z${targetZoom}_${activeLayerConfig}_${now.toISOString().slice(0,10)}.png`;
        link.href = canvas.toDataURL("image/png"); 
        link.click();
        Object.values(iconCache).forEach(img => URL.revokeObjectURL(img.src)); 
        setTimeout(toggleExportMenu, 800);
    }

    // App starten, sobald HTML geladen ist
    document.addEventListener('DOMContentLoaded', initMap);
</script>
</body>
</html>

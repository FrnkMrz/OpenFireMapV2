import { Config } from './config.js';

/** Ordnet Wasserstellen anhand dokumentierter OSM-Tags einem Symbol zu. */
export function getWaterMarkerKind(type, tags = {}) {
    if (type === 'pipe' && tags.water_source === 'groundwater') return 'groundwater_pipe';
    if (type === 'fire_water_pond' || type === 'pond') return 'open_water';
    if (type === 'suction_point') return 'suction_point';
    if (type === 'water_tank') {
        if (['storage_tank', 'reservoir_covered'].includes(tags.man_made)) return 'closed_water_tank';
        if (tags.natural === 'water' || tags.landuse === 'reservoir' || ['basin', 'pond', 'reservoir'].includes(tags.water)) {
            return 'open_water';
        }
        return 'water_tank';
    }
    // Kompatibilität für emergency=cistern, das die aktuelle Abfrage noch enthält.
    if (type === 'cistern') return 'water_tank';
    return null;
}

/** Liefert den Marker-Typ aus dokumentierten Untertypen des Säulen- und Unterflurhydranten. */
export function getHydrantMarkerType(type, tags = {}) {
    if (type === 'underground' && tags['fire_hydrant:style']?.toLowerCase() === 'wsh') return 'wsh';
    if (type === 'pillar' && tags['pillar:type'] === 'dry_barrel') return 'dry_barrel';
    return type;
}

/** Erzeugt das Karten-SVG für Marker und die Symbol-Legende aus derselben Quelle. */
export function getMarkerSvg(type, pixelSize = 28, clusterCount = 2, tags = {}) {
    const c = Config.colors;

    if (type === 'defibrillator') {
        return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${c.defib}" stroke="white" stroke-width="5"/>
            <path d="M50 80 C10 40 10 10 50 35 C90 10 90 40 50 80 Z" fill="white"/>
            <path d="M55 45 L45 55 L55 55 L45 65" stroke="${c.defib}" stroke-width="3" fill="none"/>
        </svg>`;
    }

    const waterKind = getWaterMarkerKind(type, tags);
    const color = waterKind ? c.water : c.hydrant;
    const waterGlyphs = {
        closed_water_tank: '<rect x="27" y="31" width="46" height="39" rx="4" fill="none" stroke="white" stroke-width="7"/><path d="M31 53 Q40 47 50 53 T69 53 M34 25 H66" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>',
        water_tank: '<rect x="27" y="34" width="46" height="38" rx="4" fill="none" stroke="white" stroke-width="7"/><path d="M31 54 Q40 48 50 54 T69 54" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>',
        open_water: '<path d="M25 43 Q37 33 50 43 T75 43 M25 57 Q37 47 50 57 T75 57 M25 71 Q37 61 50 71 T75 71" fill="none" stroke="white" stroke-width="7" stroke-linecap="round"/>',
        suction_point: '<path d="M72 24 L48 58" fill="none" stroke="white" stroke-width="8" stroke-linecap="round"/><circle cx="45" cy="62" r="7" fill="none" stroke="white" stroke-width="5"/><path d="M25 70 Q37 62 50 70 T75 70" fill="none" stroke="white" stroke-width="6" stroke-linecap="round"/>'
    };
    if (waterGlyphs[waterKind]) {
        return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${waterGlyphs[waterKind]}</svg>`;
    }

    if (type === 'wall') {
        return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <circle cx="42" cy="52" r="18" fill="none" stroke="white" stroke-width="6" />
            <line x1="64" y1="34" x2="64" y2="70" stroke="white" stroke-width="6" stroke-linecap="round" />
        </svg>`;
    }

    let char;
    switch (type) {
        case 'underground': char = 'U'; break;
        case 'wsh': char = 'W'; break;
        case 'pillar': char = 'O'; break;
        case 'pipe': char = 'I'; break;
        case 'dry_barrel': char = 'Ø'; break;
        default: char = '';
    }

    if (type === 'station') {
        return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><path d="M10 40 L50 5 L90 40 L90 90 L10 90 Z" fill="${c.station}" stroke="white" stroke-width="4"/><rect x="30" y="55" width="40" height="35" rx="2" fill="white" opacity="0.9"/></svg>`;
    }

    if (type === 'cluster_badge') {
        return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
            <circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>
            <text x="50" y="70" font-family="Arial" font-weight="bold" font-size="52" text-anchor="middle" fill="white">${clusterCount}</text>
        </svg>`;
    }

    const innerRing = type === 'wsh' ? '<circle cx="50" cy="50" r="36" fill="none" stroke="white" stroke-dasharray="6 4" stroke-width="4"/>' : '';
    return `<svg width="${pixelSize}px" height="${pixelSize}px" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="45" fill="${color}" stroke="white" stroke-width="5"/>${innerRing}${char ? `<text x="50" y="72" font-family="Arial" font-weight="bold" font-size="50" text-anchor="middle" fill="white">${char}</text>` : ''}</svg>`;
}

import { initI18n, updatePageLanguage, setLang, getLang } from './i18n.js';
import { getHydrantMarkerType, getMarkerSvg } from './marker-symbols.js';

const hydrantSymbols = [
    { type: 'underground', label: 'symbol_underground_hydrant', tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'underground' }, lines: ['emergency=fire_hydrant', 'fire_hydrant:type=underground'] },
    { type: 'underground', label: 'wsh_hint', tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'underground', 'fire_hydrant:style': 'wsh' }, lines: ['emergency=fire_hydrant', 'fire_hydrant:type=underground', 'fire_hydrant:style=wsh'] },
    { type: 'pillar', label: 'symbol_pillar_hydrant', tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar' }, lines: ['emergency=fire_hydrant', 'fire_hydrant:type=pillar'] },
    { type: 'pillar', label: 'symbol_dry_barrel_hydrant', tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pillar', 'pillar:type': 'dry_barrel' }, lines: ['emergency=fire_hydrant', 'fire_hydrant:type=pillar', 'pillar:type=dry_barrel'] },
    { type: 'wall', label: 'symbol_wall_hydrant', tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'wall' }, lines: ['emergency=fire_hydrant', 'fire_hydrant:type=wall'] },
    { type: 'pipe', label: 'symbol_pipe_hydrant', tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pipe' }, lines: ['emergency=fire_hydrant', 'fire_hydrant:type=pipe'] }
];

const waterSymbols = [
    { type: 'water_tank', label: 'marker_water', tags: { emergency: 'water_tank' }, lines: ['emergency=water_tank'], note: 'symbols_tank_unknown_note' },
    { type: 'water_tank', label: 'marker_water', tags: { emergency: 'water_tank', man_made: 'storage_tank' }, lines: ['emergency=water_tank', 'man_made=storage_tank'] },
    { type: 'water_tank', label: 'marker_water', tags: { emergency: 'water_tank', natural: 'water', water: 'basin' }, lines: ['emergency=water_tank', 'natural=water', 'water=basin'] },
    { type: 'fire_water_pond', label: 'marker_water', tags: { emergency: 'fire_water_pond', natural: 'water', water: 'pond' }, lines: ['emergency=fire_water_pond', 'natural=water', 'water=pond'] },
    { type: 'pipe', label: 'marker_water', tags: { emergency: 'fire_hydrant', 'fire_hydrant:type': 'pipe', 'fire_hydrant:pressure': 'suction', water_source: 'groundwater' }, lines: ['emergency=fire_hydrant', 'fire_hydrant:type=pipe', 'fire_hydrant:pressure=suction', 'water_source=groundwater'], note: 'symbols_groundwater_note' },
    { type: 'suction_point', label: 'marker_water', tags: { emergency: 'suction_point' }, lines: ['emergency=suction_point'], note: 'symbols_suction_note' }
];

const otherSymbols = [
    { type: 'station', label: 'station', tags: { amenity: 'fire_station' }, lines: ['amenity=fire_station'] },
    { type: 'defibrillator', label: 'defib', tags: { emergency: 'defibrillator' }, lines: ['emergency=defibrillator'] }
];

function renderCards(containerId, cards) {
    const container = document.getElementById(containerId);
    container.innerHTML = cards.map(({ type, label, tags, lines, note }) => {
        const markerType = getHydrantMarkerType(type, tags);
        const icon = getMarkerSvg(markerType, 64, 2, tags);
        const tagMarkup = lines.map((line) => `<code class="ofm-symbol-tag">${line}</code>`).join('');
        const noteMarkup = note ? `<p class="ofm-symbol-note" data-i18n="${note}"></p>` : '';
        return `<article class="ofm-symbol-card">
            <div class="ofm-symbol-icon" aria-hidden="true">${icon}</div>
            <h3 data-i18n="${label}"></h3>
            <div class="ofm-symbol-tags" aria-label="OSM-Tags">${tagMarkup}</div>
            ${noteMarkup}
        </article>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', async () => {
    await initI18n();
    updatePageLanguage();
    renderCards('hydrant-symbols', hydrantSymbols);
    renderCards('water-symbols', waterSymbols);
    renderCards('other-symbols', otherSymbols);
    updatePageLanguage();

    const languageSelect = document.getElementById('symbols-language');
    languageSelect.value = getLang();
    languageSelect.addEventListener('change', async (event) => {
        await setLang(event.target.value);
        document.title = `${document.querySelector('[data-i18n="symbols_title"]').textContent} · OpenFireMap.org`;
    });

    document.title = `${document.querySelector('[data-i18n="symbols_title"]').textContent} · OpenFireMap.org`;
});

import { Config } from './config.js';
import {
    getHydrantMarkerType,
    getMarkerSvg as renderMarkerSvg,
    getWaterMarkerKind
} from './marker-symbols-core.js';

export { getHydrantMarkerType, getWaterMarkerKind };

/** Erzeugt das Karten-SVG mit der zentralen Farbpalette der Webanwendung. */
export function getMarkerSvg(type, pixelSize = 28, clusterCount = 2, tags = {}) {
    return renderMarkerSvg(type, pixelSize, clusterCount, tags, Config.colors);
}

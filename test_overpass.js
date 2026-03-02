

async function testOverpass() {
    // Unterkrumbach BBox (approx)
    // S, W, N, E
    // Tight box around Unterkrumbach fire station (lat 49.5322, lon 11.4215)
    const s = 49.529;
    const w = 11.417;
    const n = 49.535;
    const e = 11.427;
    const bbox = `${s},${w},${n},${e}`;

    const queryParts = [];
    queryParts.push(`nwr["amenity"="fire_station"];`);
    queryParts.push(`nwr["building"="fire_station"];`);
    queryParts.push(`nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"];`);
    queryParts.push(`node["emergency"="defibrillator"];`);

    const boundaryQuery = `(way["boundary"="administrative"]["admin_level"="8"];)->.boundaries; .boundaries out geom;`;

    const q = `[out:json][timeout:25][bbox:${bbox}];(${queryParts.join('')})->.pois;.pois out center;${boundaryQuery}`;

    console.log("Query:", q);

    // We can use overland or DE endpoint
    const url = "https://overpass-api.de/api/interpreter";
    try {
        const res = await fetch(url, {
            method: 'POST',
            body: `data=${encodeURIComponent(q)}`,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        const data = await res.json();
        console.log(`Found ${data.elements?.length} elements.`);
        if (data.elements) {
            console.log(JSON.stringify(data.elements.map(e => ({ id: e.id, tags: e.tags })), null, 2));
        }
    } catch (err) {
        console.error("Error:", err);
    }
}
testOverpass();

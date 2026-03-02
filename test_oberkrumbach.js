async function getCoords() {
    const q = `[out:json][timeout:25][bbox:49.528,11.442,49.537,11.458];(nwr["amenity"="fire_station"];nwr["building"="fire_station"];nwr["emergency"~"fire_hydrant|water_tank|suction_point|fire_water_pond|cistern"];node["emergency"="defibrillator"];)->.pois;.pois out center;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: 'POST',
        body: `data=${encodeURIComponent(q)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const data = await res.json();
    const hydrants = data.elements.filter(e => e.tags && e.tags.emergency === 'fire_hydrant');
    console.log("Total elements:", data.elements.length);
    console.log("Hydrants:", hydrants.length);
}
getCoords();

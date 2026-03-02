async function getCoords() {
    const q = `[out:json][timeout:25];(nwr(46185341);node(4419485907);)->.pois;.pois out center;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: 'POST',
        body: `data=${encodeURIComponent(q)}`,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    });
    const text = await res.text();
    console.log(text);
}
getCoords();

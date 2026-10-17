// Die CSP in index.html erlaubt localhost für den Dev-Server (Vite-HMR per WebSocket, lokale Pipeline).
// Im Produktions-Build gehören diese Quellen nicht in die ausgelieferte Seite.
const DEV_ONLY_CSP_SOURCES = [' http://localhost:*', ' ws://localhost:*'];

export function stripDevOnlyCspSources(html) {
  return html.replace(/(<meta\s+http-equiv="Content-Security-Policy"\s+content=")([^"]*)(")/i, (_match, start, policy, end) => {
    let cleaned = policy;
    for (const source of DEV_ONLY_CSP_SOURCES) cleaned = cleaned.split(source).join('');
    return start + cleaned + end;
  });
}

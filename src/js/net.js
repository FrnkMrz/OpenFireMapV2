/**
 * net.js
 * Mini-Fetch-Wrapper: Timeout + Abort + saubere HTTP-Fehler
 */

export class HttpError extends Error {
  constructor(message, { status, url, body } = {}) {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.url = url;
    this.body = body;
  }
}

// Zeitüberschreitung eines einzelnen Requests. Bewusst kein AbortError: Aufrufer behandeln
// AbortError als Abbruch durch den Nutzer und versuchen dann keinen anderen Server.
export class TimeoutError extends Error {
  constructor(message, { url, timeoutMs } = {}) {
    super(message);
    this.name = "TimeoutError";
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

export async function fetchJson(url, {
  method = "GET",
  headers = {},
  body,
  timeoutMs = 8000,
  signal
} = {}) {
  const controller = new AbortController();

  // Externes Abort-Signal an unseren Controller koppeln
  const abort = () => controller.abort();
  if (signal) {
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  }

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      headers: { "Accept": "application/json", ...headers },
      body,
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpError(`HTTP ${res.status}`, {
        status: res.status,
        url,
        body: text.slice(0, 500)
      });
    }

    return await res.json();
  } catch (err) {
    if (timedOut && !signal?.aborted) {
      throw new TimeoutError(`Timeout nach ${timeoutMs} ms`, { url, timeoutMs });
    }
    throw err;
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener?.("abort", abort);
  }
}

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

  const timer = setTimeout(() => controller.abort(), timeoutMs);

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
  } finally {
    clearTimeout(timer);
    if (signal) signal.removeEventListener?.("abort", abort);
  }
}

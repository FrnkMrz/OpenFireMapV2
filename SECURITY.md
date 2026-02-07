# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

This is a personal, non-commercial project. If you find a security vulnerability, please open an issue in the GitHub repository or contact the maintainer directly. We aim to address critical security issues within 7 days.

## Data Privacy & Storage Policy

**Type:** Client-Side Application (PWA)

1.  **Server-Side:** We do not operate a backend server that stores user data. All logic runs in your browser.
2.  **Local Storage:** The application uses the browser's `localStorage` API for the following non-sensitive purposes:
    *   `ofm_last_view`: Stores the last map position (latitude, longitude, zoom) to restore the view on next visit.
    *   `OFM_DEBUG`: Optional flag to enable debug logging.
    *   **Policy:** No Personally Identifiable Information (PII) is stored in `localStorage`.
3.  **External Services:** The application connects directly to:
    *   **OpenStreetMap / Overpass API:** To fetch map data.
    *   **Nominatim:** For location search.
    *   **Tile Servers:** To load map tiles.
    *   *Note:* Your IP address is visible to these services as part of standard HTTP requests.

## Known Risks & Acceptable Use
*   **XSS / Injection:** The application sanitizes all user-generated content (e.g. from OpenStreetMap tags) using `escapeHtml` before rendering.
*   **CSP:** A strict Content Security Policy is enforced to prevent execution of unauthorized scripts.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Drehbuch des Erklärvideos (E6): Szenen lückenlos, Sprechtempo machbar, Ansprache wie im übrigen Feuerwehr-Material.
const DREHBUCH = readFileSync(new URL('../media/video/drehbuch.md', import.meta.url), 'utf8');

// Höchstens 150 Wörter je Minute (Zielwert 80 bis 110), sonst wird der Text gehetzt.
const MAX_WORDS_PER_SECOND = 150 / 60;

const toSeconds = (m, s) => Number(m) * 60 + Number(s);

function section(title) {
    const start = DREHBUCH.indexOf(`\n## ${title}`);
    expect(start, `Abschnitt „${title}“ fehlt`).toBeGreaterThan(-1);
    const next = DREHBUCH.indexOf('\n## ', start + 1);
    return DREHBUCH.slice(start, next === -1 ? undefined : next);
}

function scenes(text) {
    return text.split('\n### ').slice(1).map((chunk) => {
        const heading = chunk.split('\n')[0];
        const time = heading.match(/\((\d+):(\d\d)–(\d+):(\d\d)\)$/);
        const speaker = chunk.match(/^- \*\*Sprecher:\*\* „(.+)“$/m);
        return {
            heading,
            from: time && toSeconds(time[1], time[2]),
            to: time && toSeconds(time[3], time[4]),
            speaker: speaker ? speaker[1] : null,
            hasPicture: /^- \*\*Bild:\*\* \S/m.test(chunk),
        };
    });
}

const wordCount = (s) => s.split(/\s+/).filter(Boolean).length;

describe.each([
    ['Hauptfassung', 180, 240],
    ['Kurzfassung (60 Sekunden)', 55, 65],
])('Video-Drehbuch: %s', (title, minSeconds, maxSeconds) => {
    const list = scenes(section(title));

    it('hat Szenen mit Zeitangabe und Bild', () => {
        expect(list.length).toBeGreaterThan(2);
        for (const scene of list) {
            expect(scene.from, `Zeitangabe fehlt: ${scene.heading}`).not.toBeNull();
            expect(scene.to, scene.heading).toBeGreaterThan(scene.from);
            expect(scene.hasPicture, `Bild fehlt: ${scene.heading}`).toBe(true);
        }
    });

    it('Szenen schließen lückenlos aneinander an und passen in die Länge', () => {
        expect(list[0].from).toBe(0);
        for (let i = 1; i < list.length; i++) {
            expect(list[i].from, list[i].heading).toBe(list[i - 1].to);
        }
        const end = list[list.length - 1].to;
        expect(end).toBeGreaterThanOrEqual(minSeconds);
        expect(end).toBeLessThanOrEqual(maxSeconds);
    });

    it('Sprechertext passt in die Szenenlänge', () => {
        for (const scene of list.filter((s) => s.speaker)) {
            const seconds = scene.to - scene.from;
            expect(wordCount(scene.speaker), scene.heading).toBeLessThanOrEqual(Math.floor(seconds * MAX_WORDS_PER_SECOND));
        }
    });

    it('spricht die Feuerwehr mit „ihr“ an, ohne „wir“ und ohne feste Zeiten', () => {
        const spoken = list.map((s) => s.speaker || '').join(' ');
        expect(spoken).not.toMatch(/\b(wir|uns|unser\w*)\b/i);
        expect(spoken).not.toMatch(/\b(Minuten|Stunden|Tage)\b.*\b(erscheint|erscheinen|sichtbar)\b/i);
        expect(spoken).not.toContain('#OpenFireMap');
    });
});

describe('Video-Drehbuch: Pflichtangaben', () => {
    it('nennt Lizenz, OSM-Quellenangabe und den Hinweis auf amtliche Unterlagen', () => {
        expect(DREHBUCH).toContain('CC BY 4.0');
        expect(DREHBUCH).toContain('© OpenStreetMap-Mitwirkende');
        expect(DREHBUCH).toContain('Im Notfall: 112');
    });

    it('jede erkennbare Person in der Drehliste braucht ein Einverständnis', () => {
        const rows = DREHBUCH.split('\n').filter((l) => /^\| [AB]\d /.test(l));
        expect(rows.length).toBeGreaterThan(5);
        for (const row of rows) {
            const cells = row.split('|').map((c) => c.trim());
            const who = cells[4];
            if (/Person/.test(who)) expect(cells[5], row).toMatch(/^ja/);
        }
    });
});

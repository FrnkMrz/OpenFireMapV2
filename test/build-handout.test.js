import { readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseFrontMatter, renderHandoutHtml } from '../scripts/build-handout.mjs';

describe('Handout: Front Matter und Markdown-Erweiterungen', () => {
    it('liest Front Matter und entfernt ihn aus dem Text', () => {
        const { data, body } = parseFrontMatter('---\ntitle: Titel\nsubtitle: Untertitel: mit Doppelpunkt\n---\n\n## Text\n');
        expect(data.title).toBe('Titel');
        expect(data.subtitle).toBe('Untertitel: mit Doppelpunkt');
        expect(body.trim()).toBe('## Text');
    });

    it('ohne Front Matter bleibt der Text unverändert', () => {
        const { data, body } = parseFrontMatter('## Nur Text\n');
        expect(data).toEqual({});
        expect(body).toBe('## Nur Text\n');
    });

    it('Codeblock "url" wird zum Adressfeld, andere Codeblöcke bleiben Code', () => {
        const html = renderHandoutHtml('```url\nhttps://x.example/{z}/{x}/{y}.png\n```\n\n```js\nconst a = 1 < 2;\n```\n');
        expect(html).toContain('class="urlbox"');
        expect(html).toContain('https://x.example/{z}/{x}/{y}.png');
        expect(html).toContain('<pre><code class="language-js">');
        expect(html).toContain('1 &lt; 2');
    });

    it('Bildunterschrift stammt aus dem Alternativtext und HTML wird maskiert', () => {
        const html = renderHandoutHtml('![Bild <b>1</b>](img/a.png)\n');
        expect(html).toContain('<img src="img/a.png"');
        expect(html).toContain('<span class="cap">Bild &lt;b&gt;1&lt;/b&gt;</span>');
    });

    it('Karten und Spalten aus eingebettetem HTML bleiben erhalten, Markdown darin wird gewandelt', () => {
        const html = renderHandoutHtml('<div class="cols two">\n\n<div class="card ok">\n\n### Titel\n\n- Punkt\n\n</div>\n\n</div>\n');
        expect(html).toContain('<div class="cols two">');
        expect(html).toContain('<div class="card ok">');
        expect(html).toContain('<h3>Titel</h3>');
        expect(html).toContain('<li>Punkt</li>');
    });

    it('Fußzeile wird als Seitenrand-Inhalt gesetzt, Anführungszeichen im Text werden entfernt', () => {
        const html = renderHandoutHtml('---\ntitle: T\nfooter: Fuß "mit" Text\n---\n\nText\n');
        expect(html).toContain('@bottom-left');
        expect(html).toContain('content: "Fuß mit Text"');
        expect(html).toContain('counter(page)');
    });
});

describe('Handout: Overlay-Leitfaden', () => {
    const source = readFileSync(new URL('../handouts/overlay-leitfaden/OpenFireMap-Overlay-Leitfaden.md', import.meta.url), 'utf8');
    const html = renderHandoutHtml(source);

    it('nennt die Kachel-URL, TileJSON, HTTPS und die beiden Seiten zum Ansehen', () => {
        expect(html).toContain('https://tiles.openfiremap.org/hytiles/{z}/{x}/{y}.png');
        expect(html).toContain('https://tiles.openfiremap.org/hytiles.json');
        expect(html).toContain('https://openfiremap.org/overlay/');
        expect(html).toContain('https://openfiremap.org/symbols/');
        expect(html).toContain('HTTPS');
    });

    it('enthält Impressum mit Kontakt und die Aussage, dass es um openfiremap.org geht', () => {
        expect(html).toContain('Impressum');
        expect(html).toContain('info@openfiremap.org');
        expect(html).toContain('ausschließlich um <strong>openfiremap.org</strong>');
    });

    it('verweist auf PMTiles als Zielweg und nennt keine Länderliste für das Overlay', () => {
        expect(html).toContain('PMTiles');
        expect(html).toContain('Zielweg');
        expect(source).not.toMatch(/Italien|Schweiz/);
    });

    it('verwendet keine Wir-Form (Ich-Form als Privatperson), außer wenn Gesprächspartner gemeint sind', () => {
        const prose = source.replace(/```[\s\S]*?```/g, '').replace(/(sprechen|besprechen|telefonieren|schauen|melden) wir/gi, '');
        expect(prose).not.toMatch(/\b(wir|uns|unser\w*)\b/i);
    });

    it('alle Bilder der Quelle liegen im Ordner img', () => {
        const images = [...source.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
        expect(images.length).toBeGreaterThan(0);
        for (const path of images) {
            expect(() => readFileSync(new URL(`../handouts/overlay-leitfaden/${path}`, import.meta.url))).not.toThrow();
        }
    });
});

describe('Handouts: Feuerwehr-Material', () => {
    const read = (path) => readFileSync(new URL(`../handouts/${path}`, import.meta.url), 'utf8');
    const truppkarte = read('feuerwehr-truppkarte/OpenFireMap-Feuerwehr-Truppkarte.md');
    const boegen = read('feuerwehr-boegen/OpenFireMap-Feuerwehr-Erfassungsbogen.md');
    const prose = (source) => source.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '');

    it('jeder Handout-Ordner wird beim Website-Build gerendert', () => {
        const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
        const folders = readdirSync(new URL('../handouts/', import.meta.url), { withFileTypes: true })
            .filter((entry) => entry.isDirectory()).map((entry) => entry.name);
        expect(folders).toEqual(expect.arrayContaining(['feuerwehr-truppkarte', 'feuerwehr-boegen']));
        for (const folder of folders) expect(pkg.scripts.build, folder).toContain(`handouts/${folder}`);
    });

    it('die Hilfe-Seite verlinkt beide PDFs unter dem Namen, den der Build erzeugt', () => {
        for (const lang of ['de', 'en']) {
            const page = readFileSync(new URL(`../help/content/${lang}/fire-brigades.md`, import.meta.url), 'utf8');
            expect(page, lang).toContain('/downloads/OpenFireMap-Feuerwehr-Truppkarte.pdf');
            expect(page, lang).toContain('/downloads/OpenFireMap-Feuerwehr-Erfassungsbogen.pdf');
        }
    });

    it('Trupp-Karte: Sicherheitsregeln, Hashtag, Notruf, Mängel getrennt, Bild vorhanden', () => {
        const html = renderHandoutHtml(truppkarte);
        expect(html).toContain('Hydranten nicht öffnen');
        expect(html).toContain('Warnweste');
        expect(html).toContain('#OpenFireMap');
        expect(html).toContain('112');
        expect(html).toContain('<strong>nicht</strong> in OpenStreetMap');
        const images = [...truppkarte.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map((match) => match[1]);
        expect(images.length).toBeGreaterThan(0);
        for (const path of images) expect(() => read(`feuerwehr-truppkarte/${path}`)).not.toThrow();
    });

    it('Bögen: Erfassungsbogen und Mängelliste mit leeren Zeilen, Anschreiben-Vorlage', () => {
        const html = renderHandoutHtml(boegen);
        expect(html).toContain('<h2>Erfassungsbogen</h2>');
        expect(html).toContain('<h2>Mängelliste</h2>');
        expect(html).toContain('Anschreiben');
        const tables = html.match(/<table>[\s\S]*?<\/table>/g) || [];
        expect(tables.length).toBe(2);
        for (const table of tables) expect((table.match(/<tr>/g) || []).length).toBeGreaterThanOrEqual(11);
    });

    it('keine Wir-Form außer in der Anschreiben-Vorlage, keine festen Zeitzusagen', () => {
        const [beforeLetter] = boegen.split('## Vorlage: Anschreiben');
        for (const text of [truppkarte, beforeLetter]) {
            expect(prose(text)).not.toMatch(/\b(wir|uns|unser\w*)\b/i);
            expect(prose(text)).not.toMatch(/(sofort|innerhalb von \d+|nach \d+ (Minuten|Stunden)) (sichtbar|erscheint)/i);
        }
    });
});

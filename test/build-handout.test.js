import { readFileSync } from 'node:fs';
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

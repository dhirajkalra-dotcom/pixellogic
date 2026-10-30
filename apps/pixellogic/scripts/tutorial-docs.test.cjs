const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { test } = require('node:test');
const { jsPDF } = require('jspdf');

const root = path.join(__dirname, '..');
const generatorPath = path.join(__dirname, 'generate-tutorial-pdf.js');
const generator = fs.readFileSync(generatorPath, 'utf8');
const context = {
    require: createRequire(generatorPath), __dirname, Buffer,
    console: { log() {}, warn(message) { throw new Error(message); } }
};
vm.runInNewContext(generator.slice(0, generator.lastIndexOf("console.log('PixelLogic Tutorial PDF Generator');")) +
    '\nglobalThis.tutorial = { sections: TUTORIAL_SECTIONS, overview: renderSectionOverview, details: renderSectionDetails };', context);

const updatedTitles = ['Output Maps', 'PDF Export', 'Rendering & GPU', 'External Output', 'Help & Reference'];
for (const title of updatedTitles) {
    test(`${title}: tutorial text is complete and fits above the footer`, () => {
        const section = context.tutorial.sections.find(s => s.title === title);
        assert.ok(section);
        for (const [renderer, expected] of [
            ['overview', [section.purpose, ...section.description]],
            ['details', [...section.features, ...section.workflow]]
        ]) {
            const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const drawn = [];
            const text = doc.text.bind(doc);
            doc.text = (value, x, y, ...args) => {
                const lines = Array.isArray(value) ? value : [value];
                drawn.push({ text: lines.join(' '), bottom: y + (lines.length - 1) * doc.getLineHeight() / doc.internal.scaleFactor });
                return text(value, x, y, ...args);
            };
            context.tutorial[renderer](doc, section, 1, 3);
            for (const paragraph of expected) {
                const normalized = paragraph.replace(/\s+/g, ' ');
                const entry = drawn.find(item => item.text.replace(/\s+/g, ' ') === normalized);
                assert.ok(entry, `Missing ${renderer} text: ${paragraph}`);
                assert.ok(entry.bottom < 195, `Text overlaps footer (${entry.bottom.toFixed(1)}mm): ${paragraph}`);
            }
        }
    });
}

test('Help, PDF Export and tour document new rendering and naming behavior', () => {
    const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
    const guide = html.slice(html.indexOf('<details id="pdf-rendering-guide"'), html.indexOf('<div class="pdf-ui-mode-bar">'));
    for (const phrase of ['8.3MP', '1MP', '300 DPI', 'Rename', 'Check GPU', 'High performance', 'native source pixels']) {
        assert.ok(guide.includes(phrase), `PDF guidance missing ${phrase}`);
    }
    assert.ok(html.includes("label: 'Rename Output Map'"));
    assert.ok(html.includes("label: 'Windows GPU Selection'"));
    assert.ok(html.includes("label: 'Preview vs Export'"));
    assert.ok(html.includes("label: 'External Output'"));
    assert.ok(html.includes("label: 'External Edit Mode'"));
    assert.ok(html.includes("label: 'External Save PNG'"));
    assert.ok(html.includes("label: 'External Bottom Toolbar'"));
    assert.ok(guide.includes('External Output'));
    for (const phrase of ['New maps start at 100%', 'Fit never changes saved scale', 'Keep aspect uses native proportions', 'External Save PNG', 'exported X/Y coordinates']) {
        assert.ok(guide.includes(phrase), `External output guidance missing ${phrase}`);
    }
});

test('bundled tutorial PDF includes new chapters, text and valid contents links', async () => {
    const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const pdf = await getDocument({
        data: new Uint8Array(fs.readFileSync(path.join(root, 'external-files', 'Tutorial_pixel logic.pdf'))),
        useSystemFonts: true
    }).promise;
    try {
        assert.equal(pdf.numPages, 36);
        const pages = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            pages.push((await page.getTextContent()).items.map(item => item.str || '').join(' '));
            if (i >= 3) assert.ok(pages[i - 1].includes(`Page ${i}`), `Incorrect page footer on page ${i}`);
        }
        const text = pages.join(' ');
        assert.ok(text.includes('Hide controls / Show controls'), 'Tutorial must document the collapsible bottom toolbar');
        assert.ok(pages[1].includes(`${pdf.numPages} total pages`), 'Contents page count must match the actual document');
        const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
        assert.ok(pages[0].includes(`Version ${pkg.version}`), 'Tutorial cover version must match the packaged app');
        for (const phrase of ['Rendering & GPU', 'PIXELLOGIC_DISABLE_GPU=1', '8.3MP', 'High performance', 'Rename', '300 DPI', 'External Output', 'Win+P', 'Blackout', 'genlocked', 'Edit Mode', 'Keep aspect', 'Add map', 'Finish editing', 'Scale X/Y', 'Snap', 'whole-pixel', 'top-right', 'New maps start at 100%', 'native proportions', 'Save PNG', 'exported X/Y coordinates', 'top-left']) {
            assert.ok(text.includes(phrase), `Bundled PDF missing ${phrase}`);
        }
        const toc = await pdf.getPage(2);
        const links = (await toc.getAnnotations()).filter(annotation => annotation.subtype === 'Link');
        assert.equal(links.length, context.tutorial.sections.length);
        for (let i = 0; i < links.length; i++) {
            const pageIndex = await pdf.getPageIndex(links[i].dest[0]);
            assert.ok(pages[pageIndex].includes(context.tutorial.sections[i].title), `Contents link for ${context.tutorial.sections[i].title} is incorrect`);
        }
    } finally {
        await pdf.destroy();
    }
});

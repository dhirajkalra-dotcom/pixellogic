const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { jsPDF } = require('jspdf');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const templates = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, 'src', 'pdf-templates', 'index.js'), 'utf8'), templates);
const links = templates.window.PixelLogicPdfTemplates;
const dxv = 'https://resolume.com/download/file?file=Resolume_DXV_Codec_3_0_1_Installer.exe';
const hap = 'https://github.com/Vidvox/hap-qt-codec';
const notch = 'https://notch.net/academy/NotchLC_download';
const presets = [
    { mediaServer: 'Resolume', codecs: ['DXV3'], codecsLink: dxv, codecsLink2: '', labels: ['DXV3 CODEC'], urls: [dxv] },
    { mediaServer: 'Dataton Watchout 6', codecs: ['HAP'], codecsLink: hap, labels: ['HAP CODEC'], urls: [hap] },
    { mediaServer: 'Disguise d3', codecs: ['HAP', 'NOTCHLC'], codecsLink: hap, codecsLink2: notch, labels: ['HAP CODEC', 'NOTCH LC CODEC'], urls: [hap, notch] },
    { mediaServer: 'Custom', codecs: [], codecsLink: '', codecsLink2: '', labels: [], urls: [] }
];

for (const mode of ['simple', 'advanced']) for (const preset of presets) {
    test(`${mode}: ${preset.mediaServer} PDF has correctly labeled clickable codec links`, async () => {
        const spec = {
            format: 'QUICKTIME', quality: '100%', pixelAspectRatio: 'Square Pixels (1:1)', fps: '25',
            embeddedAudio: true, embeddedAudioDetails: 'Stereo, Uncompressed, 16 Bit',
            sampleRate: '48000 Hz', unembeddedAudioFormat: 'Wav', stillFrameFormat: 'PNG',
            namingStructure: '"Bank Number"_"delivery"_"screen Name"_"resolution"_"version".Mov',
            example: '001_intro-video_center-screen_1920x1080_v001.Mov',
            comments: 'Preserve the naming structure and version.',
            ...preset
        };
        const state = { projects: [], pdfExport: {
            deliverySpec: spec, pageOrientation: 'landscape', exportWithoutTemplate: true,
            templateArea: { x: 4, y: 15, width: 92, height: 80 },
            titleArea: { x: 4, y: 4, width: 92, height: 8 }
        } };
        const context = {
            state, window: { PixelLogicPdfTemplates: links }, effectiveFamily: 'helvetica', ts: {},
            totalPages: 2, drawTitleBlock() {},
            console: { warn(message) { throw new Error(message); }, error(message) { throw new Error(message); } }
        };
        vm.createContext(context);
        const doc = new jsPDF({ unit: 'px', format: 'a3', orientation: 'landscape' });
        if (mode === 'simple') {
            const start = html.indexOf('const renderSimpleVectorPdf = ');
            const end = html.indexOf('const renderGalleryPdf = ', start);
            vm.runInContext(html.slice(start, end) + ';globalThis.render = renderSimpleVectorPdf;', context);
            await context.render(doc, { name: 'Codec test', pixelMaps: [] }, 'save', { suppressPanel: true });
        } else {
            const start = html.indexOf('const addDeliverySpecPage = ');
            const end = html.indexOf('// Delivery page is the last page', start);
            vm.runInContext(html.slice(start, end) + ';globalThis.render = addDeliverySpecPage;', context);
            context.render(doc, 2);
        }
        const { getDocument } = await import('pdfjs-dist/legacy/build/pdf.mjs');
        const pdf = await getDocument({ data: new Uint8Array(doc.output('arraybuffer')), useSystemFonts: true }).promise;
        try {
            const page = await pdf.getPage(pdf.numPages);
            const text = (await page.getTextContent()).items.map(item => item.str || '').join(' ');
            for (const label of preset.labels) assert.ok(text.includes(label), `Missing ${label}`);
            if (preset.mediaServer === 'Resolume') assert.ok(!text.includes('HAP CODEC'));
            assert.ok(text.includes(spec.comments), 'Link rows must not push the final details off the page');
            const annotations = (await page.getAnnotations()).filter(item => item.subtype === 'Link');
            assert.deepEqual([...new Set(annotations.map(item => item.url))].sort(), [...preset.urls].sort());
            for (const link of annotations) {
                assert.ok(link.rect[0] >= 0 && link.rect[1] >= 0);
                assert.ok(link.rect[2] <= page.view[2] && link.rect[3] <= page.view[3], 'Link must stay on the page');
            }
        } finally {
            await pdf.destroy();
        }
    });
}

test('PDF and PowerPoint share codec labels instead of hardcoding HAP for Resolume', () => {
    assert.equal((html.match(/getCodecDownloadLinks\(spec\)\.map/g) || []).length, 2);
    assert.ok(html.includes('getCodecDownloadLinks(ds).map'));
    assert.ok(!html.includes("linesDLBase.push('HAP CODEC: '"));
});

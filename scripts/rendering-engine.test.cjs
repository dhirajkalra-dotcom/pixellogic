const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const engine = require('../src/rendering-engine');

test('Full preserves 4K previews, Lite caps them, and large maps obey the budget', () => {
    assert.equal(engine.previewScale(3840, 2160, 1, engine.FULL_PREVIEW_MP), 1);
    assert.ok(engine.previewScale(3840, 2160, 1, 1) < 0.35);
    const scale = engine.previewScale(100000, 100000, 1, 1);
    assert.ok(scale < 0.05);
    assert.ok(100000 * 100000 * scale * scale <= 1000000);
    assert.equal(engine.previewScale(512, 512, 0.25, 8.3), 0.25);
});

test('bitmap keys ignore placement/crop but track visual edits and logo loading', () => {
    const map = { id: 1, x: 10, y: 20, cropLeft: 0, name: 'Map', panels: [true], details: { logo: { imageObject: { src: 'logo.png', complete: false, naturalWidth: 0, naturalHeight: 0 } } } };
    const key = () => engine.bitmapKey(map, { quality: 1 });
    const original = key();
    Object.assign(map, { x: 200, y: 400, cropLeft: 128 });
    assert.equal(key(), original);
    map.panels[0] = false;
    assert.notEqual(key(), original);
    map.panels[0] = true;
    map.details.logo.imageObject.complete = true;
    map.details.logo.imageObject.naturalWidth = 100;
    assert.notEqual(key(), original);
    assert.notEqual(engine.bitmapKey(map, { quality: 0.5 }), key());
});

test('cache reuses bitmaps, evicts least-recently-used entries and releases pixels', () => {
    const cache = engine.createBitmapCache(800, 2);
    let renders = 0;
    const render = () => { renders++; return { width: 10, height: 10 }; };
    const a = cache.get('a', render);
    const b = cache.get('b', render);
    assert.equal(cache.get('a', render), a);
    cache.get('c', render);
    assert.equal(renders, 3);
    assert.equal(b.width, 0);
    assert.equal(cache.bytes, 800);
    assert.equal(cache.size, 2);
    cache.clear();
    assert.equal(a.width, 0);
    assert.equal(cache.bytes, 0);
    assert.equal(cache.size, 0);
});

test('oversized bitmaps remain usable but are not retained', () => {
    const cache = engine.createBitmapCache(400);
    let renders = 0;
    const render = () => { renders++; return { width: 20, height: 20 }; };
    assert.equal(cache.get('large', render).width, 20);
    cache.get('large', render);
    assert.equal(renders, 2);
    assert.equal(cache.bytes, 0);
});

test('many interaction requests render once per frame; flush cancels stale frames', () => {
    let paints = 0;
    let nextId = 0;
    const callbacks = new Map();
    const renderer = engine.createFrameRenderer(
        () => paints++,
        callback => { callbacks.set(++nextId, callback); return nextId; },
        id => callbacks.delete(id)
    );
    for (let i = 0; i < 100; i++) renderer.request();
    assert.equal(callbacks.size, 1);
    const callback = callbacks.values().next().value;
    callbacks.clear();
    callback();
    assert.equal(paints, 1);
    renderer.request();
    renderer.flush();
    assert.equal(paints, 2);
    assert.equal(callbacks.size, 0);
});

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const sharedRenderer = fs.readFileSync(path.join(__dirname, '..', 'src', 'map-renderer.js'), 'utf8');
const start = sharedRenderer.indexOf('const drawVisualizerCanvas = ');
const end = sharedRenderer.indexOf('const drawLineWithArrows = ', start);
const drawSource = sharedRenderer.slice(start, end);

function renderMap({ quality = 1, cap = 8.3, forceFullRes = false } = {}) {
    const fills = [];
    const borders = [];
    let overlayFullRes;
    const context = {
        clearRect() {},
        fillRect(...args) { fills.push(args); },
        strokeRect(...args) { borders.push([...args, this.lineWidth]); },
        fillText() {},
        setLineDash() {}
    };
    const canvas = { id: 'designer-preview-canvas', width: 0, height: 0, getContext: () => context };
    const map = {
        panelResWidth: 128, panelResHeight: 128, panels: Array(30).fill(true),
        visualStyle: 'checker', checkerColors: ['#fff', '#000'],
        numbering: { style: 'sequential', fontSize: 25, color: '#fff' },
        border: { thickness: 2, color: '#fff', style: 'solid' }
    };
    vm.runInNewContext(`${drawSource}; drawVisualizerCanvas(canvas, map, { forceFullRes });`, {
        PixelLogicRendering: engine, canvas, map, forceFullRes, environment: {},
        state: { visualizerState: { previewScale: quality } },
        localStorage: { getItem: () => String(cap) },
        calculateLayout: () => ({ totalResWidth: 1280, totalResHeight: 384, totalPanels: 30, panelsHorizontally: 10, panelsVertically: 3 }),
        drawDetailsOverlays(_ctx, _canvas, _style, _calcs, options) { overlayFullRes = options.forceFullRes; }
    });
    return { width: canvas.width, height: canvas.height, fills, borders, overlayFullRes };
}

test('fractional preview cells meet without gaps and borders scale proportionally', () => {
    const result = renderMap({ quality: 0.3 });
    const firstRow = result.fills.slice(0, 10);
    assert.equal(firstRow[0][0], 0);
    for (let i = 1; i < firstRow.length; i++) {
        assert.equal(firstRow[i - 1][0] + firstRow[i - 1][2], firstRow[i][0]);
    }
    assert.equal(firstRow[9][0] + firstRow[9][2], result.width);
    assert.equal(result.borders[0][4], 0.6);
});

test('full-resolution export geometry is independent of preview quality and caps', () => {
    const normal = renderMap({ forceFullRes: true });
    const lite = renderMap({ forceFullRes: true, quality: 0.05, cap: 1 });
    assert.deepEqual(lite, normal);
    assert.equal(normal.width, 1280);
    assert.equal(normal.height, 384);
    assert.deepEqual(normal.fills[0], [0, 0, 128, 128]);
    assert.equal(normal.borders[0][4], 2);
});

test('full-resolution rendering passes its quality policy to annotation overlays', () => {
    assert.equal(renderMap({ forceFullRes: true, cap: 1 }).overlayFullRes, true);
    assert.equal(renderMap({ cap: 1 }).overlayFullRes, false);
});

test('Output Maps reuse source pixels, refresh edits/fonts and bypass workspace-dependent overlays', () => {
    const start = html.indexOf('const outputBitmapCache = ');
    const source = html.slice(start, html.indexOf('const drawInactiveCanvasPreviews = ', start));
    let renders = 0;
    let redraws = 0;
    let fontLoaded;
    const api = {};
    vm.runInNewContext(`${source}; api.get = getOutputMapBitmap; api.cache = outputBitmapCache;`, {
        PixelLogicRendering: engine, api,
        document: {
            createElement: () => ({ width: 0, height: 0 }),
            fonts: { addEventListener(_event, callback) { fontLoaded = callback; } }
        },
        state: { visualizerState: { previewScale: 1 } },
        pixelLogicLogoImage: { complete: true, naturalWidth: 20 },
        localStorage: { getItem: () => null },
        drawVisualizerCanvas(canvas) { renders++; canvas.width = 10; canvas.height = 10; },
        redrawAffectedVisuals() { redraws++; }
    });
    const map = { id: 1, name: 'Map', x: 0, y: 0, details: { coords: { enabled: false } } };
    const options = { forceFullRes: true };
    api.get(map, options);
    map.x = 100;
    map.cropLeft = 20;
    api.get(map, options);
    assert.equal(renders, 1);
    map.name = 'Updated';
    api.get(map, options);
    assert.equal(renders, 2);
    fontLoaded();
    assert.equal(api.cache.size, 0);
    assert.equal(redraws, 1);
    api.get(map, options);
    assert.equal(renders, 3);
    map.details.coords.enabled = true;
    api.get(map, options);
    map.x = 200;
    api.get(map, options);
    assert.equal(renders, 5);
    map.details.coords.enabled = false;
    map.composite = { enabled: true };
    api.get(map, options);
    api.get(map, options);
    assert.equal(renders, 7);
});

test('desktop GPU override is applied at startup and reports real feature information', async () => {
    const main = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
    const startup = main.slice(main.indexOf('const gpuDisabledByEnvironment'), main.indexOf("const path = require"));
    const handlerStart = main.indexOf("ipcMain.handle('get-graphics-status'");
    const handler = main.slice(handlerStart, main.indexOf("\napp.on('window-all-closed'", handlerStart));
    for (const disabled of [false, true]) {
        let disableCalls = 0;
        let registered;
        const features = { '2d_canvas': disabled ? 'unavailable_software' : 'enabled' };
        const devices = [{ active: true, deviceString: 'Test GPU' }];
        vm.runInNewContext(startup + '\n' + handler, {
            app: {
                disableHardwareAcceleration() { disableCalls++; },
                async getGPUInfo(kind) {
                    assert.equal(kind, 'complete');
                    return { gpuDevice: devices, auxAttributes: { glRenderer: 'Test renderer' } };
                },
                getGPUFeatureStatus: () => features
            },
            ipcMain: { handle(name, callback) { assert.equal(name, 'get-graphics-status'); registered = callback; } },
            process: { env: { PIXELLOGIC_DISABLE_GPU: disabled ? '1' : '0' } }
        });
        assert.equal(disableCalls, disabled ? 1 : 0);
        const result = await registered();
        assert.equal(result.disabledByEnvironment, disabled);
        assert.equal(result.features, features);
        assert.equal(result.devices, devices);
        assert.equal(result.renderer, 'Test renderer');
    }
});

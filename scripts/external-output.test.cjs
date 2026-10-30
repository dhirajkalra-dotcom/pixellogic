const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { createCanvas, Path2D } = require('@napi-rs/canvas');
const { createExternalOutputManager, validateFrame } = require('../src/external-output-manager');
const { placement } = require('../src/external-output-renderer');
const engine = require('../src/rendering-engine');

function map(overrides = {}) {
    return {
        id: 'map', name: 'Test', screenWidthValue: 2, screenHeightValue: 1, screenDimensionsUnit: 'm',
        panelWidthMm: 500, panelHeightMm: 500, panelResWidth: 16, panelResHeight: 16,
        panels: Array(8).fill(true), visualStyle: 'checker', checkerColors: ['#ff0000', '#00ff00'],
        numbering: { style: 'sequential', color: 'transparent', fontSize: 25 },
        border: { thickness: 1, color: 'transparent', style: 'solid' }, ...overrides
    };
}
const frame = () => ({ source: { kind: 'pixelMap', map: map() }, masks: 'none', drawings: false, annotations: true });

function harness(t, services = {}) {
    const windows = [];
    class Window extends EventEmitter {
        constructor(options) {
            super();
            this.options = options;
            this.bounds = options.bounds || options;
            this.destroyed = false;
            this.webContents = new EventEmitter();
            this.webContents.mainFrame = {};
            this.messages = [];
            Object.assign(this.webContents, {
                send: (channel, value) => this.messages.push({ channel, value: structuredClone(value) }),
                setBackgroundThrottling: value => { this.throttled = value; },
                setWindowOpenHandler() {}, setZoomFactor() {}
            });
            windows.push(this);
        }
        getBounds() { return this.bounds; }
        setBounds(value) { this.bounds = value; }
        setMenu() {}
        setFullScreen(value) { this.fullscreen = value; }
        showInactive() { this.shown = true; }
        isDestroyed() { return this.destroyed; }
        destroy() { this.destroyed = true; this.emit('closed'); }
        async loadFile() {}
    }
    const editor = new Window({ x: 0, y: 0, width: 800, height: 600 });
    const screen = new EventEmitter();
    let displays = [
        { id: 1, label: 'Editor', scaleFactor: 1.25, bounds: { x: 0, y: 0, width: 1536, height: 864 } },
        { id: 2, label: 'Output', scaleFactor: 1.5, bounds: { x: -1280, y: -120, width: 1280, height: 720 } }
    ];
    screen.getAllDisplays = () => displays;
    screen.getDisplayMatching = () => displays[0];
    const ipcMain = new EventEmitter();
    const handlers = new Map();
    ipcMain.handle = (channel, callback) => handlers.set(channel, callback);
    const manager = createExternalOutputManager({ BrowserWindow: Window, screen, ipcMain, getEditor: () => editor, ...services });
    const event = owner => ({ sender: owner.webContents, senderFrame: owner.webContents.mainFrame });
    const viewer = () => windows.at(-1);
    const ready = () => ipcMain.emit('external-output:ready', event(viewer()));
    const frames = () => viewer().messages.filter(item => item.channel === 'external-output:frame').map(item => item.value);
    const ack = revision => ipcMain.emit('external-output:presented', event(viewer()), revision);
    const call = (owner, channel, ...args) => handlers.get(`external-output:${channel}`)(event(owner), ...args);
    t.after(() => manager.stop());
    return { manager, screen, editor, viewer, ready, frames, ack, event, ipcMain, call,
        disconnect() { displays = displays.slice(0, 1); screen.emit('display-removed', {}, { id: 2 }); } };
}

test('only a secondary monitor can start; DIP bounds and physical display dimensions stay distinct', async t => {
    const h = harness(t);
    assert.equal(h.manager.status().displays[1].width, 1920);
    await assert.rejects(h.manager.start({ displayId: 1, sizing: 'fit' }, frame()), /editor monitor/);
    await assert.rejects(h.manager.start({ displayId: 99, sizing: 'fit' }, frame()), /connected display/);
    await h.manager.start({ displayId: 2, sizing: 'actual' }, frame());
    assert.equal(h.viewer().options.x, -1280);
    assert.equal(h.viewer().options.y, -120);
    assert.equal(h.frames().length, 0);
    h.ready();
    assert.equal(h.viewer().fullscreen, true);
    assert.equal(h.viewer().shown, true);
    assert.equal(h.frames().length, 1);
    assert.equal(h.editor.throttled, false);
});

test('live updates coalesce with acknowledgements; Freeze retains the latest source and Blackout is independent', async t => {
    const h = harness(t);
    await h.manager.start({ displayId: 2, sizing: 'fit' }, frame());
    h.ready();
    const next = frame();
    next.source.map.name = 'Second';
    h.manager.update(next);
    next.source.map.name = 'Latest';
    h.manager.update(next);
    assert.equal(h.frames().length, 1);
    h.ack(1);
    assert.equal(h.frames().at(-1).source.map.name, 'Latest');
    h.ack(3);
    h.manager.control('freeze', true);
    h.manager.control('blackout', true);
    h.manager.update(frame());
    h.manager.control('blackout', false);
    assert.equal(h.manager.status().frozen, true);
    assert.equal(h.frames().length, 2);
    h.manager.control('freeze', false);
    assert.equal(h.frames().length, 3);
    assert.equal(h.frames().at(-1).revision, 4);
});

test('disconnect and display reconfiguration stop rather than relocate output; Stop is idempotent', async t => {
    const h = harness(t);
    await h.manager.start({ displayId: 2, sizing: 'fit' }, frame());
    h.ready();
    h.screen.emit('display-metrics-changed', {}, { id: 2 });
    assert.equal(h.viewer().destroyed, true);
    assert.match(h.manager.status().message, /restart output/);
    await h.manager.start({ displayId: 2, sizing: 'fit' }, frame());
    h.disconnect();
    assert.equal(h.manager.status().running, false);
    assert.match(h.manager.status().message, /not moved/);
    assert.equal(h.editor.throttled, true);
    h.manager.stop();
    h.manager.stop();
});

test('renderer errors, Escape and fullscreen exit close the viewer and report the reason', async t => {
    const h = harness(t);
    for (const scenario of ['error', 'close', 'fullscreen', 'crash']) {
        await h.manager.start({ displayId: 2, sizing: 'fit' }, frame());
        h.ready();
        if (scenario === 'fullscreen') h.viewer().emit('leave-full-screen');
        else if (scenario === 'crash') h.viewer().webContents.emit('render-process-gone', {}, { reason: 'crashed' });
        else h.ipcMain.emit(`external-output:${scenario}`, h.event(h.viewer()), 'Image decode failed');
        assert.equal(h.manager.status().running, false);
        assert.ok(h.manager.status().message);
    }
});

test('IPC rejects other windows and subframes; editor cannot impersonate the viewer', async t => {
    const h = harness(t);
    await h.call(h.editor, 'start', { displayId: 2, sizing: 'fit' }, frame());
    assert.throws(() => h.call(h.viewer(), 'control', 'stop'), /denied/);
    h.ipcMain.emit('external-output:ready', h.event(h.editor));
    h.ipcMain.emit('external-output:close', { sender: h.viewer().webContents, senderFrame: {} });
    assert.equal(h.manager.status().ready, false);
    assert.equal(h.manager.status().running, true);
    h.ready();
    h.ipcMain.emit('external-output:presented', h.event(h.editor), 1);
    h.manager.update(frame());
    assert.equal(h.frames().length, 1);
});

test('invalid sources, dimensions, options and image locations are rejected explicitly', () => {
    assert.throws(() => validateFrame({}), /Select/);
    assert.throws(() => validateFrame({ ...frame(), masks: 'unexpected' }), /options/);
    const data = frame();
    data.source.map.panelResWidth = 100000;
    assert.throws(() => validateFrame(data), /64 megapixels/);
    data.source.map = map({ details: { logo: { src: 'https://invalid.example/image.png' } } });
    assert.throws(() => validateFrame(data), /uploaded image/);
});

test('Fit letterboxes and actual size centers/clips in physical pixels including noninteger DPI', () => {
    assert.deepEqual(placement(3840, 2160, 1920, 1200, 'fit'), { x: 0, y: 60, width: 1920, height: 1080 });
    assert.deepEqual(placement(3840, 2160, 1920, 1080, 'actual'), { x: -960, y: -540, width: 3840, height: 2160 });
    assert.deepEqual(placement(512, 512, 1536 * 1.25, 864 * 1.25, 'actual'), { x: 704, y: 284, width: 512, height: 512 });
});

function rendering() {
    const context = {
        PixelLogicRendering: engine, Path2D,
        localStorage: { getItem: () => '1' },
        document: { createElement: () => createCanvas(1, 1) }
    };
    vm.createContext(context);
    for (const name of ['map-renderer.js', 'external-output-renderer.js']) {
        vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', name), 'utf8'), context);
    }
    const renderer = context.PixelLogicMapRenderer.createRenderer({
        state: { visualizerState: { previewScale: 0.05 } }, getActiveCanvas: () => null,
        validateSize: context.PixelLogicExternalRenderer.validateSize
    });
    const output = context.PixelLogicExternalRenderer.createOutputRenderer(renderer, () => createCanvas(1, 1));
    return { renderer, output };
}
const pixels = canvas => canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
const rgba = (canvas, x, y) => [...canvas.getContext('2d').getImageData(x, y, 1, 1).data];

test('external pixel-map output is byte-identical to native shared rendering, independent of Lite', () => {
    const { renderer, output } = rendering();
    const source = frame();
    source.source.map.panels[3] = false;
    const reference = createCanvas(1, 1);
    renderer.drawVisualizerCanvas(reference, source.source.map, { forceFullRes: true, transparent: true });
    const result = output.render(source);
    assert.equal(result.width, 64);
    assert.equal(result.height, 32);
    assert.deepEqual(pixels(result), pixels(reference));
    source.source.map.checkerColors[0] = '#0000ff';
    assert.notDeepEqual(pixels(output.render(source)), pixels(reference));
});

test('canvas output preserves crop placement, compositing order and excludes editor overlays', () => {
    const { output } = rendering();
    const data = frame();
    data.source = { kind: 'canvas', canvas: {
        width: 100, height: 60, maps: [map({ x: 10, y: 5, width: 64, height: 32, cropLeft: 16, cropTop: 16 })]
    } };
    const result = output.render(data);
    assert.deepEqual(rgba(result, 12, 8), [0, 0, 0, 0]);
    assert.deepEqual(rgba(result, 30, 25), [255, 0, 0, 255]);
    assert.deepEqual(rgba(result, 90, 50), [0, 0, 0, 0]);
});

test('PNG keeps full 4K size, shifts the group to zero, prints export coordinates and leaves live output unchanged', () => {
    const { renderer, output } = rendering();
    const labels = [];
    const drawCoordinates = renderer.drawCoordinatesOverlay;
    renderer.drawCoordinatesOverlay = (ctx, bounds, x, y, ...options) => {
        labels.push([x, y]);
        drawCoordinates(ctx, bounds, x, y, ...options);
    };
    const data = { ...frame(), annotations: false, source: { kind: 'canvas', canvas: {
        width: 3840, height: 2160, maps: [
            map({ id: 1, x: 100, y: 50, width: 64, height: 32 }),
            map({ id: 2, x: 220, y: 70, width: 64, height: 32 })
        ]
    } } };
    const original = structuredClone(data);
    const before = pixels(output.render(data));
    const exported = output.renderPNG(data);
    assert.deepEqual([exported.canvas.width, exported.canvas.height], [3840, 2160]);
    assert.deepEqual(labels, [[0, 0], [120, 20]]);
    assert.equal(exported.clipped, false);
    assert.deepEqual(rgba(exported.canvas, 0, 0), [255, 0, 0, 255]);
    assert.deepEqual(rgba(exported.canvas, 120, 50), [0, 255, 0, 255]);
    assert.deepEqual(rgba(exported.canvas, 3839, 2159), [0, 0, 0, 255]);
    assert.deepEqual(data, original);
    assert.deepEqual(pixels(output.render(data)), before);
    const labeledPixels = exported.canvas.getContext('2d').getImageData(0, 0, 64, 16).data;
    assert.ok(labeledPixels.some((value, index) => index % 4 === 2 && value > 0), 'White coordinate text must be rasterized even with annotations off');
});

test('PNG alignment accounts for scaled crop edges and translates drawings and masks with the maps', () => {
    const { renderer, output } = rendering();
    const labels = [];
    renderer.drawCoordinatesOverlay = (_ctx, _bounds, x, y) => labels.push([x, y]);
    const data = { ...frame(), drawings: true, source: { kind: 'canvas', canvas: {
        width: 200, height: 100,
        maps: [map({ x: -100, y: -40, width: 128, height: 64, cropLeft: 16, cropTop: 8 })],
        drawings: [{ x1: -68, y1: 36, x2: 20, y2: 36, color: '#0000ff', thickness: 2 }],
        masks: [{ type: 'rect', x: -68, y: -24, w: 8, h: 48, color: '#abcdef' }]
    } } };
    const original = structuredClone(data);
    data.masks = 'overlay';
    let result = output.renderPNG(data).canvas;
    assert.deepEqual(labels[0], [0, 0]);
    assert.deepEqual(rgba(result, 3, 3), [171, 205, 239, 255]);
    assert.deepEqual(rgba(result, 30, 60), [0, 0, 255, 255]);
    data.masks = 'inside';
    result = output.renderPNG(data).canvas;
    assert.notDeepEqual(rgba(result, 3, 3), [0, 0, 0, 255]);
    assert.deepEqual(rgba(result, 30, 3), [0, 0, 0, 255]);
    assert.deepEqual(data.source, original.source);
});

test('PNG rejects empty/fully cropped layouts and reports clipping without resizing the canvas', () => {
    const { output, renderer } = rendering();
    const labels = [];
    renderer.drawCoordinatesOverlay = (_ctx, bounds, x, y) => labels.push([bounds.width, bounds.height, x, y]);
    const data = { ...frame(), source: { kind: 'canvas', canvas: { width: 32, height: 16, maps: [] } } };
    assert.throws(() => output.renderPNG(data), /visible pixel map/);
    data.source.canvas.maps = [map({ x: 10, y: 10, width: 64, height: 32, cropLeft: 64 })];
    assert.throws(() => output.renderPNG(data), /visible pixel map/);
    data.source.canvas.maps[0].cropLeft = 0;
    const result = output.renderPNG(data);
    assert.equal(result.clipped, true);
    assert.deepEqual([result.canvas.width, result.canvas.height], [32, 16]);
    assert.deepEqual(labels, [[32, 16, 0, 0]], 'Coordinates must stay within the visible part of a clipped map');
});

test('PNG save validates the viewer and full-size image, handles cancellation and surfaces disk errors', async t => {
    const written = [];
    let canceled = false, diskError = false;
    const h = harness(t, {
        dialog: { showSaveDialog: async () => ({ canceled, filePath: 'D:\\exports\\layout.png' }) },
        writeFile: async (file, bytes) => {
            if (diskError) throw new Error('Disk is full');
            written.push({ file, bytes });
        }
    });
    const data = { ...frame(), source: { kind: 'canvas', canvas: { id: 1, width: 64, height: 32, maps: [map({ x: 0, y: 0, width: 64, height: 32 })] } } };
    await h.manager.start({ displayId: 2, sizing: 'actual', editing: true }, data);
    h.ready();
    const bytes = Uint8Array.from(createCanvas(64, 32).toBuffer('image/png')).buffer;
    await assert.rejects(h.call(h.editor, 'save-png', bytes), /Edit Mode/);
    await assert.rejects(h.call(h.viewer(), 'save-png', new ArrayBuffer(8)), /Invalid/);
    const wrongSize = Uint8Array.from(createCanvas(32, 16).toBuffer('image/png')).buffer;
    await assert.rejects(h.call(h.viewer(), 'save-png', wrongSize), /dimensions/);
    assert.deepEqual(await h.call(h.viewer(), 'save-png', bytes), { canceled: false, filePath: 'D:\\exports\\layout.png' });
    assert.equal(written.length, 1);
    assert.ok(written[0].bytes.equals(Buffer.from(bytes)));
    canceled = true;
    assert.deepEqual(await h.call(h.viewer(), 'save-png', bytes), { canceled: true });
    assert.equal(written.length, 1);
    canceled = false;
    diskError = true;
    await assert.rejects(h.call(h.viewer(), 'save-png', bytes), /Disk is full/);
    h.manager.control('editing', false);
    await assert.rejects(h.call(h.viewer(), 'save-png', bytes), /Edit Mode/);
});

test('PNG save prevents overlapping dialogs and aborts after the display is stopped', async t => {
    let resolveDialog;
    let writes = 0;
    const h = harness(t, {
        dialog: { showSaveDialog: () => new Promise(resolve => { resolveDialog = resolve; }) },
        writeFile: async () => { writes++; }
    });
    await h.manager.start({ displayId: 2, sizing: 'actual', editing: true }, {
        ...frame(), source: { kind: 'canvas', canvas: { width: 64, height: 32, maps: [map({ x: 10, y: 10, width: 64, height: 32 })] } }
    });
    h.ready();
    const bytes = Uint8Array.from(createCanvas(64, 32).toBuffer('image/png')).buffer;
    const saving = h.call(h.viewer(), 'save-png', bytes);
    await assert.rejects(h.call(h.viewer(), 'save-png', bytes), /current save/);
    h.manager.stop();
    resolveDialog({ canceled: false, filePath: 'D:\\exports\\layout.png' });
    await assert.rejects(saving, /stopped/);
    assert.equal(writes, 0);
});

test('composite output uses the actual composed pixel dimensions, including gaps', () => {
    const { output, renderer } = rendering();
    const data = frame();
    data.source.map = map({
        composite: { enabled: true, maps: [map(), map()], placement: 'right', gapPx: 8, composedWidthPx: 128, composedHeightPx: 32 }
    });

    const reference = createCanvas(1, 1);
    renderer.drawVisualizerCanvas(reference, data.source.map, { forceFullRes: true, transparent: true });
    const result = output.render(data);
    assert.equal(result.width, 136);
    assert.equal(result.height, 32);
    assert.deepEqual(pixels(result), pixels(reference));
    assert.deepEqual(rgba(result, 68, 10), [0, 0, 0, 0]);
    data.source.map.composite.gapPx = 1000000;
    assert.throws(() => output.render(data), /64 megapixels/);
});

test('PNG uses actual composite crop dimensions and replaces nested live coordinates', () => {
    const { output, renderer } = rendering();
    const labels = [];
    const drawCoordinates = renderer.drawCoordinatesOverlay;
    renderer.drawCoordinatesOverlay = (ctx, bounds, x, y, ...options) => {
        labels.push([x, y]);
        drawCoordinates(ctx, bounds, x, y, ...options);
    };
    const child = map({ details: {
        coords: { enabled: true }, circle: { enabled: false }, cross: { enabled: false },
        corners: { enabled: false }, info: { enabled: false }
    } });
    const data = { ...frame(), source: { kind: 'canvas', canvas: {
        width: 384, height: 200, maps: [
            map({ x: 100, y: 100, width: 272, height: 64, cropLeft: 68,
                composite: { enabled: true, maps: [child, child], placement: 'right', gapPx: 8, composedWidthPx: 128, composedHeightPx: 32 } }),
            map({ id: 'second', x: 300, y: 120, width: 64, height: 32 })
        ]
    } } };
    const original = structuredClone(data.source);
    const result = pixels(output.renderPNG(data).canvas);
    assert.deepEqual(labels, [[0, 0], [64, 20]]);
    data.annotations = false;
    assert.deepEqual(pixels(output.renderPNG(data).canvas), result);
    assert.deepEqual(data.source, original);
});

test('annotation options change the output, not the project, and invalidate canvas cache entries', () => {
    const { output } = rendering();
    const data = frame();
    const annotated = map({ details: {
        colorBars: { enabled: true, preset: 'rgbw', position: 'full' },
        circle: { enabled: false }, cross: { enabled: false }, corners: { enabled: false }, info: { enabled: false }
    } });
    data.source = { kind: 'canvas', canvas: { width: 64, height: 32, maps: [{ ...annotated, x: 0, y: 0, width: 64, height: 32 }] } };
    const original = structuredClone(data.source);
    const on = pixels(output.render(data));
    data.annotations = false;
    const off = pixels(output.render(data));
    assert.notDeepEqual(on, off);
    assert.deepEqual(data.source, original);
    data.annotations = true;
    assert.deepEqual(pixels(output.render(data)), on);
});

test('overlapping masks form a union; fills, inside/outside clipping and drawings are explicit', () => {
    const { output } = rendering();
    const data = frame();
    data.source = { kind: 'canvas', canvas: {
        width: 64, height: 32, maps: [map({ x: 0, y: 0, width: 64, height: 32 })],
        masks: [
            { type: 'rect', x: 0, y: 0, w: 20, h: 32, color: '#000000', opacity: 100 },
            { type: 'rect', x: 10, y: 0, w: 20, h: 32, color: '#000000', opacity: 100 }
        ],
        drawings: [{ x1: 1, y1: 8, x2: 60, y2: 8, width: 4, color: '#0000ff' }]
    } };
    data.masks = 'outside';
    data.drawings = true;
    assert.equal(rgba(output.render(data), 15, 8)[3], 0);
    assert.deepEqual(rgba(output.render(data), 40, 8), [0, 0, 255, 255]);
    data.masks = 'inside';
    assert.equal(rgba(output.render(data), 40, 8)[3], 0);
    assert.deepEqual(rgba(output.render(data), 15, 8), [0, 0, 255, 255]);
    data.masks = 'overlay';
    assert.deepEqual(rgba(output.render(data), 15, 8), [0, 0, 0, 255]);
    data.masks = 'none';
    data.drawings = false;
    assert.deepEqual(rgba(output.render(data), 5, 8), [255, 0, 0, 255]);
});

test('a frame completing image decoding after Freeze cannot replace the held frame', async () => {
    const handlers = {};
    let shown;
    let finishDecode;
    const canvas = { getContext: () => ({ fillRect() {}, drawImage(image) { shown = image.id; } }) };
    const context = {
        document: { getElementById: () => canvas, fonts: { ready: Promise.resolve() }, addEventListener() {} },
        window: { devicePixelRatio: 1.25, innerWidth: 800, innerHeight: 450, addEventListener() {} },
        Image: class {
            decode() {
                if (this.src === 'data:image/png;base64,pending') return new Promise(resolve => { finishDecode = resolve; });
                return Promise.resolve();
            }
        },
        PixelLogicMapRenderer: { createRenderer: () => ({}) },
        PixelLogicExternalEditor: { create: () => ({ setState() {}, setFrame: value => value, refresh() {} }) },
        PixelLogicExternalRenderer: {
            placement, createOutputRenderer: () => ({ render: value => ({ width: 64, height: 32, id: value.revision }) })
        },
        externalViewer: {
            onState: callback => { handlers.state = callback; },
            onFrame: callback => { handlers.frame = callback; },
            ready() {}, presented() {}, stop() {}, error(message) { throw new Error(message); }
        }
    };
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'external-output-viewer.js'), 'utf8'), context);
    const state = { blackout: false, frozen: false, sizing: 'actual' };
    handlers.state(state);
    await handlers.frame({ ...frame(), revision: 1 });
    assert.equal(shown, 1);
    const incoming = frame();
    incoming.revision = 2;
    incoming.source.map.details = { logo: { src: 'data:image/png;base64,pending' } };
    const completing = handlers.frame(incoming);
    handlers.state({ ...state, frozen: true });
    finishDecode();
    await completing;
    assert.equal(shown, 1);
    handlers.state({ ...state, frozen: true, blackout: true });
    assert.equal(canvas.hidden, true);
    handlers.state({ ...state, frozen: true });
    assert.equal(canvas.hidden, false);
    assert.equal(shown, 1);
    handlers.state(state);
    assert.equal(shown, 2);
});

test('viewer edits require Edit Mode, valid geometry and editor acknowledgement', async t => {
    const h = harness(t);
    const data = frame();
    data.source = { kind: 'canvas', canvas: { id: 'canvas', width: 512, height: 256, maps: [map({ x: 0, y: 0, width: 64, height: 32 })] } };
    data.catalog = [{ id: 'map', name: 'Test' }];
    await h.manager.start({ displayId: 2, sizing: 'actual' }, data);
    h.ready();
    const command = { type: 'transform', canvasId: 'canvas', mapId: 'map', rect: { x: 30, y: 20, width: 96, height: 48 } };
    assert.throws(() => h.call(h.viewer(), 'edit', command), /not enabled/);
    h.manager.control('editing', true);
    assert.throws(() => h.call(h.editor, 'edit', command), /not enabled/);
    assert.throws(() => h.call(h.viewer(), 'edit', { ...command, rect: { ...command.rect, width: -1 } }), /sizes/);
    const pending = h.call(h.viewer(), 'edit', command);
    const request = h.editor.messages.findLast(item => item.channel === 'external-output:edit-request').value;
    assert.deepEqual(request.command, command);
    h.ipcMain.emit('external-output:edit-result', h.event(h.editor), { requestId: request.requestId, value: { selectedId: 'map' } });
    assert.deepEqual(await pending, { selectedId: 'map' });
    h.manager.control('freeze', true);
    assert.equal(h.manager.status().editing, false);
    assert.throws(() => h.manager.control('editing', true), /Resume/);
    h.manager.control('freeze', false);
    h.manager.control('editing', true);
    const interrupted = h.call(h.viewer(), 'edit', command);
    h.manager.stop();
    await assert.rejects(interrupted, /stopped/);
});

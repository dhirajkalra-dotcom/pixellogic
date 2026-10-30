const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const editing = require('../src/external-output-editing');
const rendering = require('../src/external-output-renderer');
const engine = require('../src/rendering-engine');
const { calculateLayout } = require('../src/map-renderer').createRenderer({});
const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const start = html.indexOf('const syncCanvasMapSource = ');
const syncMap = vm.runInNewContext(html.slice(start, html.indexOf('const layoutCanvasWorkspace = ', start)) + ';syncCanvasMapSource', { calculateLayout });

function setup({ panelRes = 16, display = { width: 1920, height: 1080 } } = {}) {
    let saves = 0, nextId = 0;
    const project = {
        id: 'project', pixelMaps: [{
            id: 'source', name: 'LED', screenWidthValue: 2, screenHeightValue: 1,
            panelWidthMm: 500, panelHeightMm: 500, panelResWidth: panelRes, panelResHeight: panelRes,
            panels: Array(8).fill(true), numbering: {}, border: {}
        }], canvases: []
    };
    let active = project;
    const adapter = editing.createProjectAdapter({
        getProject: () => active, calculateLayout, syncMap, normalizeOutput: () => {},
        save: () => saves++, changed: () => {}, newId: () => String(++nextId),
        validateFrame: frame => rendering.validateFrame(frame, calculateLayout), placement: rendering.placement
    });
    const key = adapter.ensureEditable(JSON.stringify(['project', 'pixelMap', 'source']), display);
    return { adapter, project, key, canvas: project.canvases[0].regions[0], saved: () => saves, switchProject: () => { active = { id: 'other' }; } };
}

test('single-map editing creates a saved canvas at native 100% scale', () => {
    const { adapter, project, key, canvas } = setup();
    assert.equal(canvas.width, 1920);
    assert.equal(canvas.height, 1080);
    assert.deepEqual([canvas.maps[0].x, canvas.maps[0].y, canvas.maps[0].width, canvas.maps[0].height], [928, 524, 64, 32]);
    assert.equal(canvas.maps[0].outputScaleX, 1);
    assert.equal(canvas.maps[0].outputScaleY, 1);
    assert.equal(project.pixelMaps[0].panelResWidth, 16);
    assert.equal(adapter.ensureEditable(key, {}, 'fit'), key);
    assert.equal(project.canvases.length, 1);
});

test('multiple instances add, resize, sync and round-trip independently without changing source dimensions', () => {
    const { adapter, project, key, canvas } = setup();
    const result = adapter.applyEdit(key, { type: 'add', canvasId: canvas.id, sourceMapId: 'source' });
    assert.equal(canvas.maps.length, 2);
    assert.notEqual(canvas.maps[0].id, canvas.maps[1].id);
    adapter.applyEdit(key, { type: 'transform', canvasId: canvas.id, mapId: result.selectedId, rect: { x: 123, y: 45, width: 96, height: 24 } });
    assert.equal(canvas.maps[0].width, 64);
    assert.equal(adapter.getSnapshot(key).canvas.maps[1].width, 96);
    assert.equal(adapter.getSnapshot(key).canvas.maps[1].height, 24);
    const restored = JSON.parse(JSON.stringify(canvas.maps[1]));
    project.pixelMaps[0].panelResWidth = 32;
    syncMap(restored, project);
    assert.equal(restored.width, 192);
    assert.equal(restored.height, 24);
    assert.equal(restored.x, 123);
    assert.equal(project.pixelMaps[0].screenWidthValue, 2);
    adapter.applyEdit(key, { type: 'remove', canvasId: canvas.id, mapId: result.selectedId });
    assert.equal(canvas.maps.length, 1);
    assert.equal(project.pixelMaps.length, 1);
});

test('invalid edits or oversized sources never mutate or save the existing canvas', () => {
    const { adapter, project, key, canvas, saved, switchProject } = setup();
    const before = JSON.stringify(canvas), count = saved();
    assert.throws(() => adapter.applyEdit(key, { type: 'transform', canvasId: canvas.id, mapId: canvas.maps[0].id, rect: { x: NaN, y: 0, width: 1, height: 1 } }), /positions/);
    project.pixelMaps.push({ ...project.pixelMaps[0], id: 'large', panelResWidth: 100000 });
    assert.throws(() => adapter.applyEdit(key, { type: 'add', canvasId: canvas.id, sourceMapId: 'large' }), /64 megapixels/);
    assert.equal(JSON.stringify(canvas), before);
    assert.equal(saved(), count);
    switchProject();
    assert.equal(adapter.getSnapshot(key), null);
    assert.throws(() => adapter.applyEdit(key, {}), /no longer active/);
});

test('pointer coordinates account for Fit letterboxing, actual-size clipping and fractional display scaling', () => {
    const viewport = { left: 10, top: 20, width: 800, height: 600 }, dpr = 1.25;
    for (const mode of ['fit', 'actual']) {
        const rect = rendering.placement(1920, 1080, 1000, 750, mode);
        const expected = { x: 123, y: 456 };
        const result = editing.worldPoint(viewport.left + (rect.x + expected.x * rect.width / 1920) / dpr,
            viewport.top + (rect.y + expected.y * rect.height / 1080) / dpr,
            viewport, 1920, 1080, mode, dpr, rendering.placement);
        assert.ok(Math.abs(result.x - expected.x) < 1e-9);
        assert.ok(Math.abs(result.y - expected.y) < 1e-9);
    }
});

test('corner resizing holds the opposite corner and optionally preserves aspect ratio', () => {
    const rect = { x: 100, y: 200, width: 200, height: 100 };
    for (const corner of ['nw', 'ne', 'sw', 'se']) {
        const resized = editing.resizeRect(rect, corner, corner.includes('w') ? -100 : 100, corner.includes('n') ? -50 : 50, true);
        assert.equal(resized.width, 300);
        assert.equal(resized.height, 150);
        assert.equal(corner.includes('w') ? resized.x + resized.width : resized.x, corner.includes('w') ? 300 : 100);
        assert.equal(corner.includes('n') ? resized.y + resized.height : resized.y, corner.includes('n') ? 300 : 200);
    }
    assert.equal(editing.resizeRect(rect, 'se', 50, 80, false).height, 180);
    assert.equal(editing.resizeRect(rect, 'se', -1000, -1000, true).width, 2);
});

test('placement and instance-scale changes reuse native source pixels', () => {
    const map = { width: 100, height: 50, outputScaleX: 1, outputScaleY: 1, name: 'LED' };
    const before = engine.bitmapKey(map, {});
    Object.assign(map, { x: 30, width: 200, height: 80, outputScaleX: 2, outputScaleY: 1.6 });
    assert.equal(engine.bitmapKey(map, {}), before);
});

test('pixel and percentage controls use native resolution and commit whole pixel sizes', () => {
    const rect = { x: 10, y: 20, width: 96, height: 48 };
    const native = { totalResWidth: 64, totalResHeight: 32 };
    assert.deepEqual(editing.sizeFromInput(rect, 'scale-x', 200, native, true), { x: 10, y: 20, width: 128, height: 64 });
    assert.deepEqual(editing.sizeFromInput(rect, 'scale-y', 125, native, false), { x: 10, y: 20, width: 96, height: 40 });
    assert.equal(editing.sizeFromInput(rect, 'scale-x', 33.3, native, false).width, 21);
    assert.equal(editing.sizeFromInput(rect, 'width', 101, native, true).height, 51);
    assert.throws(() => editing.sizeFromInput(rect, 'width', 100.5, native, false), /whole pixels/);
    assert.throws(() => editing.sizeFromInput(rect, 'scale-x', 0, native, false), /positive/);
    assert.throws(() => editing.sizeFromInput(rect, 'scale-y', Infinity, native, false), /positive/);
    assert.throws(() => editing.sizeFromInput(rect, 'scale-x', 999999, native, false), /16384/);
    assert.deepEqual(editing.pixelRect({ x: 10, y: 20, width: 100.4, height: 50.2 }, 'nw'), { x: 10, y: 20, width: 100, height: 50 });
});

test('2560 x 1280 maps start at 100% on 4K and smaller outputs, including added instances', () => {
    for (const display of [{ width: 3840, height: 2160 }, { width: 800, height: 600 }]) {
        const { adapter, key, canvas } = setup({ panelRes: 640, display });
        adapter.applyEdit(key, { type: 'add', canvasId: canvas.id, sourceMapId: 'source' });
        for (const map of canvas.maps) {
            assert.deepEqual([map.width, map.height, map.outputScaleX, map.outputScaleY], [2560, 1280, 1, 1]);
            assert.equal(map.x, Math.floor((display.width - 2560) / 2));
            assert.equal(map.y, Math.floor((display.height - 1280) / 2));
        }
        const map = canvas.maps[0];
        adapter.applyEdit(key, { type: 'transform', canvasId: canvas.id, mapId: map.id, rect: { x: 0, y: 191, width: 3840, height: 1920 } });
        assert.equal(adapter.ensureEditable(key, display), key);
        const savedMap = adapter.getSnapshot(key).canvas.maps[0];
        assert.deepEqual([savedMap.width, savedMap.height], [3840, 1920]);
    }
});

test('locked sizing restores native proportions rather than compounding one-pixel rounding drift', () => {
    const native = { totalResWidth: 2560, totalResHeight: 1280 };
    const rect = { x: 0, y: 191, width: 2560, height: 1281 };
    for (const field of ['scale-x', 'scale-y']) {
        assert.deepEqual(editing.sizeFromInput(rect, field, 100, native, true), { ...rect, height: 1280 });
        assert.deepEqual(editing.sizeFromInput(rect, field, 150, native, true), { ...rect, width: 3840, height: 1920 });
    }
    assert.equal(editing.sizeFromInput(rect, 'width', 2560, native, true).height, 1280);
    assert.equal(editing.sizeFromInput(rect, 'height', 1280, native, true).width, 2560);
    assert.equal(editing.sizeFromInput(rect, 'scale-x', 100, native, false).height, 1281);
    let resized = editing.sizeFromInput(rect, 'width', 2561, native, true);
    assert.equal(resized.height, 1281);
    resized = editing.sizeFromInput(resized, 'width', 2560, native, true);
    assert.equal(resized.height, 1280);
    for (const corner of ['nw', 'ne', 'sw', 'se']) {
        const result = editing.pixelRect(editing.resizeRect(rect, corner, 0, 0, true, native), corner);
        assert.equal(result.width, 2560);
        assert.equal(result.height, 1280);
        assert.equal(corner.includes('n') ? result.y + result.height : result.y, corner.includes('n') ? rect.y + rect.height : rect.y);
    }
});

test('movement snaps to output and map edges/centers within the exact screen-derived threshold', () => {
    const map = { id: 1, x: 50, y: 60, width: 100, height: 50 };
    const canvas = { width: 1920, height: 1080, maps: [map, { id: 2, x: 400, y: 300, width: 200, height: 100 }] };
    let result = editing.snapMove({ ...map, x: 303, y: 348 }, map, canvas, 10, 10);
    assert.equal(result.rect.x, 300);
    assert.equal(result.rect.y, 350);
    assert.deepEqual(result.guides, [{ axis: 'x', value: 400 }, { axis: 'y', value: 350 }]);
    result = editing.snapMove({ ...map, x: 915, y: 515 }, map, canvas, 10, 10);
    assert.equal(result.rect.x, 910);
    assert.equal(result.rect.y, 515);
    result = editing.snapMove({ ...map, x: 10, y: 20 }, map, { ...canvas, maps: [map] }, 10, 10);
    assert.equal(result.rect.x, 10);
    assert.equal(result.guides.length, 0);
    result = editing.snapMove({ ...map, x: 11, y: 20 }, map, { ...canvas, maps: [map] }, 12.5, 12.5);
    assert.equal(result.rect.x, 0, '125% DPI gives a 12.5-source-pixel threshold in 1:1 mode');
    assert.ok(html.includes('PixelLogicExternalEditing.snapMove('), 'Main canvas must reuse the same snapping algorithm');
});

test('cropped visible edges participate in snapping at the scaled output size', () => {
    const map = { id: 1, x: 0, y: 0, width: 200, height: 100, cropLeft: 25, calcs: { totalResWidth: 100, totalResHeight: 50 } };
    const result = editing.snapMove({ ...map, x: -47, y: 100 }, map, { width: 1000, height: 800, maps: [map] }, 10, 10);
    assert.equal(result.rect.x, -50);
    assert.deepEqual(result.guides, [{ axis: 'x', value: 0 }]);
});

test('resize snapping preserves the opposite corner and the aspect-lock policy', () => {
    const map = { id: 1, x: 100, y: 100, width: 100, height: 50 };
    const canvas = { width: 1000, height: 800, maps: [map, { id: 2, x: 300, y: 300, width: 100, height: 100 }] };
    const result = editing.snapResize({ ...map, width: 196, height: 98 }, map, canvas, 10, 10, 'se', true);
    assert.deepEqual(result.rect, { x: 100, y: 100, width: 200, height: 100 });
    assert.deepEqual(result.guides, [{ axis: 'x', value: 300 }]);
    const free = editing.snapResize({ ...map, width: 196, height: 196 }, map, canvas, 10, 10, 'se', false);
    assert.deepEqual(free.rect, { x: 100, y: 100, width: 200, height: 200 });
    const nw = editing.snapResize({ ...map, x: 4, y: 2, width: 196, height: 98 }, map, { ...canvas, maps: [map] }, 10, 10, 'nw', true);
    assert.deepEqual(nw.rect, { x: 0, y: 0, width: 200, height: 100 });
});

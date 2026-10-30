// Run with Electron, not Node. Test windows are briefly shown; no physical monitor is taken fullscreen.
const { app, BrowserWindow, ipcMain, screen, nativeImage } = require('electron');
const { EventEmitter } = require('node:events');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createExternalOutputManager } = require('../src/external-output-manager');
const root = path.join(__dirname, '..');
const profile = process.env.PIXELLOGIC_TEST_USER_DATA;
if (!profile) throw new Error('Set PIXELLOGIC_TEST_USER_DATA to an isolated test-profile directory.');
app.setPath('userData', profile);
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(check, message) {
    for (let attempt = 0; attempt < 100; attempt++) {
        if (await check()) return;
        await pause(100);
    }
    throw new Error(`Timed out: ${message}`);
}
let editor, viewer, manager;
let cancelPNG = false;
app.whenReady().then(async () => {
    const actualDisplays = screen.getAllDisplays();
    const primary = screen.getPrimaryDisplay();
    const proxy = new EventEmitter();
    let simulated = true;
    proxy.getAllDisplays = () => simulated ? [
        primary, { id: -999, label: 'Automated test display', scaleFactor: 1.25, bounds: { x: -1280, y: -100, width: 1280, height: 720 } }
    ] : actualDisplays;
    proxy.getDisplayMatching = () => primary;
    class HiddenOutput extends BrowserWindow {
        constructor(options) {
            super({ ...options, x: primary.bounds.x, y: primary.bounds.y, width: 800, height: 450 });
            viewer = this;
            this.webContents.on('console-message', event => { if (event.level === 'error') console.error('Output renderer:', event.message); });
        }
        setBounds() {}
        setFullScreen() {}
        showInactive() {}
    }
    editor = new BrowserWindow({
        show: false, width: 1920, height: 1080,
        webPreferences: { preload: path.join(root, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    manager = createExternalOutputManager({
        BrowserWindow: HiddenOutput, screen: proxy, ipcMain, getEditor: () => editor,
        dialog: { showSaveDialog: async () => ({ canceled: cancelPNG, filePath: path.join(profile, 'external-output.png') }) }
    });
    ipcMain.handle('get-app-version', () => require('../package.json').version);
    ipcMain.handle('get-system-fonts', () => []);
    ipcMain.handle('get-installed-template', () => null);
    ipcMain.handle('check-first-run', () => false);
    ipcMain.handle('license-status', () => ({ licensed: true, enforced: false }));
    await editor.loadFile(path.join(root, 'index.html'));
    await pause(500);
    const js = source => editor.webContents.executeJavaScript(source);
    await js(`(() => {
        const map = {
            id: 'test-map', name: 'External Test Map', screenWidthValue: 2, screenHeightValue: 1, screenDimensionsUnit: 'm',
            panelWidthMm: 500, panelHeightMm: 500, panelResWidth: 16, panelResHeight: 16, panels: Array(8).fill(true),
            visualStyle: 'checker', checkerColors: ['#ff0000', '#00ff00'],
            numbering: { style: 'sequential', color: 'transparent', fontSize: 25 },
            border: { thickness: 1, color: 'transparent', style: 'solid' }
        };
        state.projects = [{
            id: 'test-project', name: 'External output test', pixelMaps: [map], activePixelMapId: map.id,
            canvases: [{ id: 'test-output', name: 'Test Output Map', activeRegionId: 'region',
                regions: [{ id: 'region', name: 'Test Canvas', width: 128, height: 64,
                    maps: [{ ...map, sourceMapId: map.id, x: 16, y: 8, width: 64, height: 32 }] }] }]
        }];
        state.activeProjectId = 'test-project';
        document.getElementById('external-output-btn').click();
    })()`);
    await until(() => js(`document.getElementById('external-display').options.length === 1`), 'display list');
    assert.equal(await js(`document.getElementById('external-sizing').value`), 'actual');
    await js(`document.getElementById('external-start').click();`);
    const sample = async () => viewer.webContents.executeJavaScript(`(() => {
        const c = document.getElementById('output');
        return { hidden: c.hidden, width: c.width, height: c.height, dpr: devicePixelRatio,
            viewportWidth: innerWidth, viewportHeight: innerHeight,
            pixel: [...c.getContext('2d').getImageData(Math.floor((c.width - 64) / 2) + 5, Math.floor((c.height - 32) / 2) + 5, 1, 1).data] };
    })()`);
    await until(async () => manager.status().ready && (await sample()).pixel[0] === 255, 'native red source');
    const initial = await sample();
    assert.equal(initial.width, Math.round(initial.viewportWidth * initial.dpr));
    assert.equal(initial.height, Math.round(initial.viewportHeight * initial.dpr));
    await js(`state.projects[0].activePixelMapId = 'another-map'; state.projects[0].pixelMaps[0].checkerColors[0] = '#0000ff';`);
    await until(async () => (await sample()).pixel[2] === 255, 'live source edit');
    await js(`document.getElementById('external-freeze').click();`);
    await until(() => manager.status().frozen, 'freeze');
    await js(`state.projects[0].pixelMaps[0].checkerColors[0] = '#ffffff';`);
    await pause(350);
    assert.deepEqual((await sample()).pixel, [0, 0, 255, 255]);
    await js(`document.getElementById('external-blackout').click();`);
    await until(async () => (await sample()).hidden, 'blackout');
    await js(`document.getElementById('external-blackout').click();`);
    await until(async () => !(await sample()).hidden, 'restore frozen output');
    assert.deepEqual((await sample()).pixel, [0, 0, 255, 255]);
    await js(`document.getElementById('external-freeze').click();`);
    await until(async () => (await sample()).pixel.every(value => value === 255), 'resume latest source');
    await js(`state.projects[0].pixelMaps = [];`);
    await until(() => !manager.status().running, 'source deletion stops output');
    await js(`document.getElementById('external-refresh').click();`);
    await until(() => js(`document.getElementById('external-source').options.length === 1`), 'canvas source');
    await js(`document.getElementById('external-start').click();`);
    await until(() => manager.status().ready, 'canvas output');
    await js(`state.activeProjectId = 'another-project';`);
    await until(() => !manager.status().running, 'project switch stops output');
    await js(`state.activeProjectId = 'test-project'; document.getElementById('external-refresh').click();`);
    await until(() => js(`!document.getElementById('external-start').disabled`), 'restore source selection');
    await js(`document.getElementById('external-start').click();`);
    await until(() => manager.status().ready, 'restart after project switch');
    proxy.emit('display-removed', {}, { id: -999 });
    assert.equal(manager.status().running, false);
    assert.match(manager.status().message, /not moved/);
    assert.equal(viewer.isDestroyed(), true);
    await js(`(() => {
        const source = state.projects[0].canvases[0].regions[0].maps[0];
        state.projects[0].pixelMaps = [{ ...source, id: 'add-source', name: 'Extra Map' }];
        document.getElementById('external-refresh').click();
    })()`);
    await until(() => js(`document.getElementById('external-source').options.length === 2`), 'editable source choices');
    await js(`(() => {
        const source = document.getElementById('external-source');
        source.value = source.options[0].value;
        source.dispatchEvent(new Event('change'));
        document.getElementById('external-sizing').value = 'fit';
        document.getElementById('external-editing').checked = true;
        document.getElementById('external-start').click();
    })()`);
    await until(() => manager.status().ready && manager.status().editing, 'editable pixel-map promotion');
    const outputJs = source => viewer.webContents.executeJavaScript(source);
    await until(() => outputJs(`!document.getElementById('output-editor').hidden && !!document.querySelector('.output-map-box')`), 'on-monitor editing controls');
    const layout = () => js(`JSON.parse(JSON.stringify(state.projects[0].canvases.at(-1).regions[0]))`);
    const originalLayout = await layout();
    assert.equal(originalLayout.maps.length, 1);
    assert.deepEqual([originalLayout.maps[0].width, originalLayout.maps[0].height], [64, 32]);
    assert.equal(await outputJs(`Number(document.getElementById('output-scale-x').value)`), 100);
    assert.equal(await outputJs(`Number(document.getElementById('output-scale-y').value)`), 100);
    assert.equal(manager.status().sizing, 'fit');
    await js(`document.getElementById('external-sizing').value = 'actual'; document.getElementById('external-sizing').dispatchEvent(new Event('change'));`);
    await until(() => manager.status().sizing === 'actual', 'native display sizing');
    assert.equal(await js(`state.projects[0].canvases.length`), 2);
    assert.equal(await outputJs(`document.getElementById('output-size').textContent`), `Output ${originalLayout.width} x ${originalLayout.height} px`);
    await outputJs(`document.getElementById('output-snap').checked = false;`);
    viewer.setSize(1280, 720);
    viewer.show();
    viewer.focus();
    await pause(300);
    const toolbarBounds = () => outputJs(`(() => {
        const r = document.getElementById('output-edit-toolbar').getBoundingClientRect();
        return { top:r.top, bottom:r.bottom, height:r.height, width:r.width, viewportHeight:innerHeight, viewportWidth:innerWidth };
    })()`);
    const expandedToolbar = await toolbarBounds();
    assert.ok(Math.abs(expandedToolbar.viewportHeight - expandedToolbar.bottom - 12) < 1, 'Controls must be bottom-docked');
    await outputJs(`document.getElementById('output-toggle-controls').click();`);
    assert.equal(await outputJs(`document.getElementById('output-toolbar-controls').hidden`), true);
    assert.equal(await outputJs(`document.getElementById('output-toggle-controls').getAttribute('aria-expanded')`), 'false');
    const collapsedToolbar = await toolbarBounds();
    assert.ok(collapsedToolbar.height < expandedToolbar.height && collapsedToolbar.width < expandedToolbar.width);
    assert.ok(Math.abs(collapsedToolbar.viewportHeight - collapsedToolbar.bottom - 12) < 1);
    assert.deepEqual(await layout(), originalLayout, 'Collapsing controls must not change the layout');
    const position = await outputJs(`(() => { const r = document.querySelector('.output-map-box').getBoundingClientRect(); return {x:Math.round(r.left + r.width / 2),y:Math.round(r.top + r.height / 2)}; })()`);
    await outputJs(`window.__pointerTrace = []; for (const name of ['pointerdown','pointermove','pointerup','pointercancel','gotpointercapture','lostpointercapture']) document.addEventListener(name, e => window.__pointerTrace.push({type:e.type,target:e.target.id||e.target.className,x:e.clientX,y:e.clientY,button:e.button,id:e.pointerId}), true);`);
    viewer.webContents.sendInputEvent({ type: 'mouseMove', ...position });
    await pause(100);
    viewer.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...position });
    await pause(50);
    viewer.webContents.sendInputEvent({ type: 'mouseMove', x: position.x + 40, y: position.y + 20, movementX: 40, movementY: 20 });
    await pause(50);
    viewer.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: position.x + 40, y: position.y + 20 });
    try {
        await until(async () => (await layout()).maps[0].x !== originalLayout.maps[0].x, 'physical pointer drag');
    } catch (error) {
        console.error(JSON.stringify(await outputJs(`({focus:document.hasFocus(),status:document.getElementById('output-edit-status').textContent,trace:window.__pointerTrace})`)));
        throw error;
    }
    const moved = (await layout()).maps[0];
    assert.ok(Math.abs(moved.x - originalLayout.maps[0].x - 40 * initial.dpr) < 0.1);
    assert.ok(Math.abs(moved.y - originalLayout.maps[0].y - 20 * initial.dpr) < 0.1);
    await until(() => outputJs(`!document.getElementById('output-finish').disabled`), 'drag acknowledgement');
    const corner = await outputJs(`(() => { const r = document.querySelector('[data-corner="se"]').getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}; })()`);
    viewer.webContents.sendInputEvent({ type: 'mouseMove', ...corner });
    await pause(100);
    viewer.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...corner });
    await pause(50);
    viewer.webContents.sendInputEvent({ type: 'mouseMove', x: corner.x + 32, y: corner.y + 16, movementX: 32, movementY: 16 });
    await pause(50);
    viewer.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x: corner.x + 32, y: corner.y + 16 });
    await until(async () => (await layout()).maps[0].width > moved.width, 'corner resize');
    const resizedMap = (await layout()).maps[0];
    assert.ok(Math.abs(resizedMap.width - moved.width - 32 * initial.dpr) < 0.1);
    assert.ok(Math.abs(resizedMap.width / resizedMap.height - 2) < 0.001);
    assert.equal(await outputJs(`document.getElementById('output-toolbar-controls').hidden`), true, 'Controls stay collapsed during map edits');
    await outputJs(`document.getElementById('output-toggle-controls').focus();`);
    await pause(100);
    assert.equal(await outputJs(`document.activeElement.id`), 'output-toggle-controls');
    viewer.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Space' });
    await pause(100);
    viewer.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Space' });
    await until(() => outputJs(`!document.getElementById('output-toolbar-controls').hidden`), 'keyboard expand controls');
    assert.equal(await outputJs(`document.getElementById('output-toggle-controls').getAttribute('aria-expanded')`), 'true');
    await until(() => outputJs(`!document.getElementById('output-add').disabled`), 'resize acknowledgement');
    await outputJs(`document.getElementById('output-add').click();`);
    await until(async () => (await layout()).maps.length === 2, 'add another map');
    await until(() => outputJs(`!document.getElementById('output-width').disabled && document.getElementById('output-selection').options.length === 2`), 'new map selection');
    assert.equal(await outputJs(`Number(document.getElementById('output-scale-x').value)`), 100);
    assert.equal(await outputJs(`Number(document.getElementById('output-scale-y').value)`), 100);
    await outputJs(`document.getElementById('output-aspect').checked = false; document.getElementById('output-height').value = '33'; document.getElementById('output-height').dispatchEvent(new Event('change'));`);
    await until(async () => (await layout()).maps[1].height === 33 && await outputJs(`!document.getElementById('output-scale-x').disabled`), 'one-pixel mismatch fixture');
    await outputJs(`document.getElementById('output-aspect').checked = true; document.getElementById('output-scale-x').value = '100'; document.getElementById('output-scale-x').dispatchEvent(new Event('change'));`);
    await until(async () => (await layout()).maps[1].height === 32 && await outputJs(`!document.getElementById('output-width').disabled`), '100 percent restores native height');
    assert.equal((await layout()).maps[1].width, 64);
    assert.equal(await outputJs(`Number(document.getElementById('output-scale-y').value)`), 100);
    await outputJs(`document.getElementById('output-width').value = '96'; document.getElementById('output-width').dispatchEvent(new Event('change'));`);
    await until(async () => (await layout()).maps[1].width === 96, 'precise map size');
    assert.equal((await layout()).maps[1].height, 48);
    await until(() => outputJs(`!document.getElementById('output-scale-x').disabled`), 'percentage controls ready');
    assert.equal(await outputJs(`Number(document.getElementById('output-scale-x').value)`), 150);
    assert.equal(await outputJs(`Number(document.getElementById('output-scale-y').value)`), 150);
    await outputJs(`document.getElementById('output-scale-x').value = '200'; document.getElementById('output-scale-x').dispatchEvent(new Event('change'));`);
    await until(async () => (await layout()).maps[1].width === 128 && await outputJs(`!document.getElementById('output-width').disabled`), 'linked percentage scaling');
    assert.equal((await layout()).maps[1].height, 64);
    await outputJs(`document.getElementById('output-aspect').checked = false; document.getElementById('output-scale-y').value = '125'; document.getElementById('output-scale-y').dispatchEvent(new Event('change'));`);
    await until(async () => (await layout()).maps[1].height === 40 && await outputJs(`!document.getElementById('output-height').disabled`), 'independent percentage scaling');
    assert.equal((await layout()).maps[1].width, 128);
    await outputJs(`document.getElementById('output-scale-x').value = '33.3'; document.getElementById('output-scale-x').dispatchEvent(new Event('change'));`);
    await until(async () => (await layout()).maps[1].width === 21 && await outputJs(`!document.getElementById('output-width').disabled`), 'percentage rounding to whole pixels');
    for (const [name, value] of [['width', 96], ['height', 48]]) {
        await outputJs(`document.getElementById('output-${name}').value = '${value}'; document.getElementById('output-${name}').dispatchEvent(new Event('change'));`);
        await until(async () => (await layout()).maps[1][name] === value && await outputJs(`!document.getElementById('output-${name}').disabled`), `restore ${name} in pixels`);
    }
    const badge = await outputJs(`(() => { const r=document.getElementById('output-size').getBoundingClientRect(); return {text:document.getElementById('output-size').textContent,right:r.right,top:r.top,viewport:innerWidth}; })()`);
    assert.equal(badge.text, `Output ${originalLayout.width} x ${originalLayout.height} px`);
    assert.ok(badge.right > badge.viewport - 40 && badge.top < 60, 'Output dimensions must be at the top right');
    async function dragSecondTo(targetX, targetY, snap, alt = false) {
        await outputJs(`document.getElementById('output-snap').checked = ${snap};`);
        const before = (await layout()).maps[1];
        const position = await outputJs(`(() => { const r=document.querySelector('.output-map-box.selected').getBoundingClientRect(); return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)}; })()`);
        const x = position.x + Math.round((targetX - before.x) / initial.dpr);
        const y = position.y + Math.round((targetY - before.y) / initial.dpr);
        viewer.webContents.sendInputEvent({ type: 'mouseMove', ...position });
        await pause(100);
        viewer.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...position });
        await pause(50);
        viewer.webContents.sendInputEvent({ type: 'mouseMove', x, y, modifiers: alt ? ['alt'] : [] });
        await pause(100);
        const guides = await outputJs(`document.querySelectorAll('.output-snap-guide').length`);
        viewer.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, x, y });
        await until(async () => (await layout()).maps[1].x !== before.x && await outputJs(`!document.getElementById('output-finish').disabled`), 'snap drag saved');
        return { after: (await layout()).maps[1], guides, expectedX: Math.round(before.x + (x - position.x) * initial.dpr) };
    }
    const edge = (await layout()).maps[0].x + (await layout()).maps[0].width;
    const snapped = await dragSecondTo(edge - 5, 300, true);
    assert.equal(snapped.after.x, edge);
    assert.ok(snapped.guides > 0, 'Snapping shows alignment guides while dragging');
    const free = await dragSecondTo(edge - 5, 300, false);
    assert.equal(free.after.x, free.expectedX);
    assert.notEqual(free.after.x, edge);
    assert.equal(free.guides, 0);
    const bypass = await dragSecondTo(edge - 8, 300, true, true);
    assert.equal(bypass.after.x, bypass.expectedX);
    assert.notEqual(bypass.after.x, edge);
    assert.equal(bypass.guides, 0);
    await outputJs(`document.getElementById('output-aspect').checked = true;`);
    await js(`state.projects[0].pixelMaps[0].checkerColors[0] = '#aabbcc';`);
    await pause(300);
    assert.equal(await outputJs(`Number(document.getElementById('output-width').value)`), 96);
    assert.equal(await js(`state.projects[0].pixelMaps[0].panelResWidth`), 16);
    const beforeExport = await layout();
    await outputJs(`document.getElementById('output-save-png').click();`);
    await until(() => outputJs(`document.getElementById('output-edit-status').textContent.startsWith('PNG saved:')`), 'full-size PNG save');
    const png = fs.readFileSync(path.join(profile, 'external-output.png'));
    assert.deepEqual(nativeImage.createFromBuffer(png).getSize(), { width: beforeExport.width, height: beforeExport.height });
    assert.deepEqual(await layout(), beforeExport);
    const editScreenshot = (await viewer.webContents.capturePage()).resize({ width: 1920, height: 1080 });
    fs.writeFileSync(path.join(root, 'scripts', 'screenshots', '17-External-Edit.png'), editScreenshot.toPNG());
    fs.writeFileSync(path.join(root, 'scripts', 'screenshots', 'optimized', '17-External-Edit.jpg'), editScreenshot.toJPEG(85));
    cancelPNG = true;
    await outputJs(`document.getElementById('output-save-png').click();`);
    await until(() => outputJs(`document.getElementById('output-edit-status').textContent === 'PNG export canceled.'`), 'PNG save cancellation');
    assert.ok(fs.readFileSync(path.join(profile, 'external-output.png')).equals(png));
    await outputJs(`document.getElementById('output-remove').click();`);
    await until(async () => (await layout()).maps.length === 1, 'remove map instance');
    await until(() => outputJs(`!document.getElementById('output-finish').disabled`), 'remove acknowledgement');
    await outputJs(`document.getElementById('output-finish').click();`);
    await until(async () => !manager.status().editing && await outputJs(`document.getElementById('output-editor').hidden`), 'clean output mode');
    assert.equal(await outputJs(`document.getElementById('output-toggle-controls').getClientRects().length`), 0, 'Clean mode hides the reopen button too');
    const saved = await js(`JSON.parse(localStorage.getItem('pixi-logic-projects')).projects[0].canvases.at(-1).regions[0].maps[0]`);
    assert.equal(saved.width, resizedMap.width);
    assert.equal(saved.x, resizedMap.x);
    simulated = false;
    manager.stop();
    await js(`document.getElementById('external-refresh').click();`);
    await pause(200);
    editor.showInactive();
    await pause(700);
    const screenshot = await editor.webContents.capturePage();
    const resized = screenshot.resize({ width: 1920, height: 1080 });
    fs.writeFileSync(path.join(root, 'scripts', 'screenshots', '16-External-Output.png'), resized.toPNG());
    fs.writeFileSync(path.join(root, 'scripts', 'screenshots', 'optimized', '16-External-Output.jpg'), resized.toJPEG(85));
    console.log(JSON.stringify({
        passed: true, actualDisplayCount: actualDisplays.length, simulatedTopology: true,
        backing: [initial.width, initial.height], dpr: initial.dpr,
        checks: ['IPC and preload', 'source selection', 'physical pixel backing', 'pinned-source live edits', 'freeze/resume', 'blackout/restore', 'source deletion', 'canvas selection', 'project switching', 'disconnect', 'editable layout promotion', 'pointer dragging', 'corner resizing', 'multiple maps', 'pixel and percentage sizes', 'persistent scaling', 'snap toggle and guides', 'Alt snap bypass', 'top-right output resolution', 'full-resolution PNG save', 'PNG cancel without changes', 'clean mode']
    }));
}).catch(error => {
    console.error(error.stack);
    process.exitCode = 1;
}).finally(() => {
    manager?.stop();
    if (editor && !editor.isDestroyed()) editor.destroy();
    app.exit(process.exitCode || 0);
});

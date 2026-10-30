// Run with Electron and an isolated PIXELLOGIC_TEST_USER_DATA directory.
const { app, BrowserWindow, ipcMain } = require('electron');
const assert = require('node:assert/strict');
const path = require('node:path');
const profile = process.env.PIXELLOGIC_TEST_USER_DATA;
if (!profile) throw new Error('Set PIXELLOGIC_TEST_USER_DATA to an isolated test profile.');
app.setPath('userData', profile);
const root = path.join(__dirname, '..');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

app.whenReady().then(async () => {
    const window = new BrowserWindow({
        show: false, width: 1600, height: 1000,
        webPreferences: { preload: path.join(root, 'preload.js'), contextIsolation: true, nodeIntegration: false }
    });
    for (const [channel, value] of [
        ['get-app-version', require('../package.json').version], ['get-system-fonts', []],
        ['get-installed-template', null], ['check-first-run', false],
        ['license-status', { licensed: true, enforced: false }]
    ]) ipcMain.handle(channel, () => value);
    const js = code => window.webContents.executeJavaScript(code);
    async function click(selector) {
        const position = await js(`(() => {
            const element = document.querySelector(${JSON.stringify(selector)});
            element.scrollIntoView({ block: 'center' });
            const bounds = element.getBoundingClientRect();
            return { x: Math.round(bounds.left + bounds.width / 2), y: Math.round(bounds.top + bounds.height / 2) };
        })()`);
        window.webContents.sendInputEvent({ type: 'mouseMove', ...position });
        await pause(50);
        window.webContents.sendInputEvent({ type: 'mouseDown', button: 'left', clickCount: 1, ...position });
        await pause(50);
        window.webContents.sendInputEvent({ type: 'mouseUp', button: 'left', clickCount: 1, ...position });
        await pause(200);
    }
    async function typeName(name) {
        await click('#map-name-input');
        await js(`document.getElementById('map-name-input').select()`);
        await window.webContents.insertText(name);
    }
    const maps = () => js(`state.projects[0].pixelMaps.map(map => ({ id: map.id, name: map.name }))`);
    try {
        await window.loadFile(path.join(root, 'index.html'));
        await pause(500);
        await js(`(() => {
            const map = createNewPixelMapObject(1);
            Object.assign(map, { screenWidthValue: 2, screenHeightValue: 1, panelResWidth: 16, panelResHeight: 16 });
            state.projects = [{ id: 987654, name: 'Rename regression', pixelMaps: [map], activePixelMapId: map.id, canvases: [] }];
            state.activeProjectId = 987654;
            switchTab('designer');
        })()`);
        window.show();
        window.focus();
        await pause(200);
        await click('#duplicate-pixel-map-btn');
        assert.equal((await maps()).length, 2);

        await typeName('Renamed copy');
        await click('#duplicate-pixel-map-btn');
        assert.equal((await maps()).length, 3, 'Renaming on blur must not swallow the Duplicate click');
        assert.equal((await maps())[1].name, 'Renamed copy');
        assert.equal((await maps())[2].name, 'Renamed copy Copy');

        for (const name of ['Third map', 'LED "Left" & <Right>', 'Final name']) {
            await typeName(name);
            await js(`window.__renameInput = document.getElementById('map-name-input')`);
            window.webContents.sendInputEvent({ type: 'keyDown', keyCode: 'Return' });
            window.webContents.sendInputEvent({ type: 'keyUp', keyCode: 'Return' });
            await pause(200);
            assert.equal(await js(`document.activeElement === window.__renameInput && window.__renameInput.isConnected`), true, 'Enter must preserve the editable input');
            assert.equal((await maps())[2].name, name);
            assert.equal(await js(`document.querySelector('.pixel-map-tab[data-active="true"]').textContent`), name);
            assert.equal(await js(`document.getElementById('live-demo-map-name').textContent`), name);
            await js(`renderPixelMapDesigner()`);
            assert.equal(await js(`document.getElementById('map-name-input').value`), name, 'Names must survive rerendering, including quotes');
        }

        await typeName('   ');
        await click('.pixel-map-tab');
        assert.equal(await js(`state.projects[0].activePixelMapId === state.projects[0].pixelMaps[0].id`), true, 'Blur must not swallow map selection');
        assert.equal((await maps())[2].name, 'Final name');
        assert.equal(await js(`document.getElementById('notification').textContent.includes('cannot be empty')`), true);
        await click('.pixel-map-tab:last-child');
        await typeName('Saved without restart');
        await click('.pixel-map-tab');
        assert.equal((await maps())[2].name, 'Saved without restart');
        assert.deepEqual(await js(`JSON.parse(localStorage.getItem('pixi-logic-projects')).projects[0].pixelMaps.map(map => ({id:map.id,name:map.name}))`), await maps());
        console.log('PASS: repeated duplication, blur/click, Enter focus, quoted names, map switching, empty-name validation and persistence.');
    } finally {
        window.destroy();
    }
    app.quit();
}).catch(error => {
    console.error(error);
    app.exit(1);
});

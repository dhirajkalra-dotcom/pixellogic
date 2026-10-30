const path = require('node:path');
const { writeFile: writeFileDefault } = require('node:fs/promises');
const { createRenderer } = require('./map-renderer');
const { validateFrame: validateOutputFrame } = require('./external-output-renderer');
const { validateEdit } = require('./external-output-editing');
const { calculateLayout } = createRenderer({});

function validateFrame(frame) {
    return validateOutputFrame(frame, calculateLayout);
}

function createExternalOutputManager({ BrowserWindow, screen, ipcMain, getEditor, dialog, writeFile = writeFileDefault, root = path.join(__dirname, '..') }) {
    let window = null;
    let ready = false;
    let pending = null;
    let inFlight = null;
    let revision = 0;
    let presented = 0;
    let startupTimer = null;
    let renderTimer = null;
    let editSequence = 0;
    let savingPNG = false;
    const editRequests = new Map();
    let state = { running: false, frozen: false, blackout: false, editing: false, sizing: 'actual', displayId: null, message: '' };
    const editor = () => {
        const value = getEditor();
        return value && !value.isDestroyed() ? value : null;
    };
    function status() {
        return { ...state, ready, displays: displays() };
    }
    function displays() {
        const host = editor();
        const editorId = host ? screen.getDisplayMatching(host.getBounds()).id : null;
        return screen.getAllDisplays().map(display => ({
            id: display.id, name: display.label || `Display ${display.id}`,
            width: Math.round(display.bounds.width * display.scaleFactor),
            height: Math.round(display.bounds.height * display.scaleFactor),
            scaleFactor: display.scaleFactor, editor: display.id === editorId
        }));
    }
    function notify() {
        editor()?.webContents.send('external-output:status', status());
    }
    function sendState() {
        if (window && ready) window.webContents.send('external-output:state', state);
        notify();
    }
    function stop(message = '') {
        const old = window;
        window = null;
        ready = false;
        pending = null;
        inFlight = null;
        clearTimeout(startupTimer);
        clearTimeout(renderTimer);
        for (const request of editRequests.values()) {
            clearTimeout(request.timer);
            request.reject(new Error('External output stopped before the edit was confirmed.'));
        }
        editRequests.clear();
        state = { ...state, running: false, frozen: false, blackout: false, editing: false, displayId: null, message };
        if (old && !old.isDestroyed()) old.destroy();
        editor()?.webContents.setBackgroundThrottling(true);
        notify();
        return status();
    }
    function deliver() {
        if (!window || !ready || state.frozen || inFlight !== null || !pending || pending.revision <= presented) return;
        inFlight = pending.revision;
        renderTimer = setTimeout(() => stop('External output stopped because rendering did not respond within 15 seconds.'), 15000);
        window.webContents.send('external-output:frame', pending);
    }
    function update(frame) {
        if (!window) throw new Error('External output is not running.');
        validateFrame(frame);
        pending = { ...frame, revision: ++revision };
        deliver();
        return status();
    }
    async function start(config, frame) {
        if (!config || !['fit', 'actual'].includes(config.sizing)) throw new Error('Choose Fit or 1:1 sizing.');
        validateFrame(frame);
        if (config.editing != null && typeof config.editing !== 'boolean') throw new Error('Invalid edit mode.');
        if (config.editing && frame.source.kind !== 'canvas') throw new Error('Edit Mode requires an output canvas.');
        const target = screen.getAllDisplays().find(display => display.id === config.displayId);
        if (!target || displays().find(display => display.id === target.id)?.editor) {
            throw new Error('Choose a connected display other than the editor monitor. In Windows, use Win+P > Extend.');
        }
        if (window) throw new Error('Stop the current output before starting another display.');
        presented = 0;
        revision = 0;
        ready = false;
        inFlight = null;
        const viewer = new BrowserWindow({
            ...target.bounds, show: false, frame: false, backgroundColor: '#000000',
            autoHideMenuBar: true, skipTaskbar: true, resizable: false, movable: false,
            webPreferences: {
                preload: path.join(root, 'external-output-preload.js'),
                contextIsolation: true, nodeIntegration: false, sandbox: true,
                backgroundThrottling: false, devTools: false, partition: 'external-output'
            }
        });
        window = viewer;
        state = { running: true, frozen: false, blackout: false, editing: !!config.editing, sizing: config.sizing, displayId: target.id, message: '' };
        viewer.webContents.setZoomFactor(1);
        viewer.setMenu(null);
        viewer.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        viewer.webContents.on('will-navigate', event => event.preventDefault());
        viewer.webContents.on('render-process-gone', (_event, details) => {
            if (window === viewer) stop(`External output stopped: renderer ${details.reason}.`);
        });
        viewer.webContents.on('did-fail-load', (_event, code, description) => {
            if (window === viewer && code !== -3) stop(`External output could not load: ${description}`);
        });
        viewer.on('closed', () => { if (window === viewer) stop('External output window closed.'); });
        viewer.on('leave-full-screen', () => { if (window === viewer) stop('External output stopped because fullscreen ended.'); });
        editor()?.webContents.setBackgroundThrottling(false);
        update(frame);
        startupTimer = setTimeout(() => {
            if (window === viewer && !ready) stop('External output did not become ready. Check fonts and image assets, then retry.');
        }, 15000);
        try {
            await viewer.loadFile(path.join(root, 'external-output.html'));
        } catch (error) {
            if (window === viewer) stop(`External output could not load: ${error.message}`);
            throw error;
        }
        return status();
    }
    function control(command, value) {
        if (command === 'stop') return stop();
        if (!window) throw new Error('External output is not running.');
        if (command === 'freeze' && typeof value === 'boolean') state.frozen = value;
        else if (command === 'blackout' && typeof value === 'boolean') state.blackout = value;
        else if (command === 'sizing' && ['fit', 'actual'].includes(value)) state.sizing = value;
        else if (command === 'editing' && typeof value === 'boolean') {
            if (value && (state.frozen || state.blackout)) throw new Error('Resume live output and disable Blackout before editing.');
            if (value && pending?.source.kind !== 'canvas') throw new Error('Enable Edit Mode in the main controls to create an editable layout.');
            state.editing = value;
            if (value && window && !window.isDestroyed()) {
                try { window.focus(); } catch (_) {}
            }
        }
        else throw new Error('Invalid external output command.');
        if (state.frozen || state.blackout) state.editing = false;
        sendState();
        deliver();
        return status();
    }
    function isSender(event, owner) {
        return owner && event.sender === owner.webContents && event.senderFrame === owner.webContents.mainFrame;
    }
    ipcMain.handle('external-output:save-png', async (event, bytes) => {
        if (!isSender(event, window) || !ready || !state.editing || state.frozen || state.blackout || pending?.source.kind !== 'canvas') {
            throw new Error('Enable live Edit Mode before saving the output PNG.');
        }
        if (savingPNG || editRequests.size) throw new Error('Wait for the current save or map edit to finish.');
        if (!(bytes instanceof ArrayBuffer) || bytes.byteLength < 33 || bytes.byteLength > 256 * 1024 * 1024) {
            throw new Error('Invalid or oversized PNG data.');
        }
        const buffer = Buffer.from(bytes);
        const source = pending.source.canvas;
        if (!buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
            buffer.toString('ascii', 12, 16) !== 'IHDR' || buffer.readUInt32BE(8) !== 13 ||
            buffer.readUInt32BE(16) !== source.width || buffer.readUInt32BE(20) !== source.height) {
            throw new Error('PNG dimensions must match the full output canvas.');
        }
        const owner = window;
        const name = String(source.name || 'External Output').replace(/[<>:"/\\|?*\x00-\x1f]/g, '_');
        savingPNG = true;
        try {
            const result = await dialog.showSaveDialog(editor() || owner, {
                title: 'Save top-left aligned output PNG',
                defaultPath: `${name}-top-left.png`,
                filters: [{ name: 'PNG Images', extensions: ['png'] }]
            });
            if (result.canceled) return { canceled: true };
            if (!result.filePath) throw new Error('No PNG destination was selected.');
            if (window !== owner || owner.isDestroyed()) throw new Error('External output stopped before the PNG could be saved.');
            await writeFile(result.filePath, buffer);
            return { canceled: false, filePath: result.filePath };
        } finally {
            savingPNG = false;
        }
    });
    for (const [channel, handler] of Object.entries({
        'external-output:get-status': status,
        'external-output:start': start,
        'external-output:update': update,
        'external-output:control': control
    })) {
        ipcMain.handle(channel, (event, ...args) => {
            if (!isSender(event, editor())) throw new Error('External output request denied.');
            return handler(...args);
        });
    }
    ipcMain.handle('external-output:edit', (event, command) => {
        if (!isSender(event, window) || !ready || !state.editing || state.frozen || state.blackout) throw new Error('Output editing is not enabled.');
        validateEdit(command, pending?.source.canvas, pending?.catalog);
        if (editRequests.size) throw new Error('Wait for the previous edit to finish.');
        return new Promise((resolve, reject) => {
            const requestId = ++editSequence;
            const timer = setTimeout(() => {
                editRequests.delete(requestId);
                reject(new Error('The editor did not confirm the edit. Check the main application.'));
            }, 10000);
            editRequests.set(requestId, { resolve, reject, timer });
            editor().webContents.send('external-output:edit-request', { requestId, command });
        });
    });
    ipcMain.on('external-output:edit-result', (event, result) => {
        if (!isSender(event, editor())) return;
        const request = editRequests.get(result?.requestId);
        if (!request) return;
        clearTimeout(request.timer);
        editRequests.delete(result.requestId);
        if (result.error) request.reject(new Error(String(result.error).slice(0, 500)));
        else request.resolve(result.value);
    });
    ipcMain.handle('external-output:edit-mode', (event, value) => {
        if (!isSender(event, window)) throw new Error('Output editing request denied.');
        return control('editing', value);
    });
    ipcMain.on('external-output:ready', event => {
        if (!isSender(event, window) || ready) return;
        const target = screen.getAllDisplays().find(display => display.id === state.displayId);
        if (!target) { stop('External output display disconnected.'); return; }
        ready = true;
        clearTimeout(startupTimer);
        window.setBounds(target.bounds);
        window.setFullScreen(true);
        if (state.editing) {
            window.show();
            try { window.focus(); } catch (_) {}
        } else {
            window.showInactive();
        }
        sendState();
        deliver();
    });
    ipcMain.on('external-output:presented', (event, value) => {
        if (!isSender(event, window) || value !== inFlight) return;
        presented = value;
        inFlight = null;
        clearTimeout(renderTimer);
        deliver();
    });
    ipcMain.on('external-output:error', (event, message) => {
        if (isSender(event, window)) stop(`External output render failed: ${String(message).slice(0, 500)}`);
    });
    ipcMain.on('external-output:close', event => {
        if (isSender(event, window)) stop('External output stopped with Escape.');
    });
    screen.on('display-removed', (_event, display) => {
        if (display.id === state.displayId) stop('External display disconnected. Output stopped; it was not moved to another monitor.');
        else notify();
    });
    screen.on('display-added', notify);
    screen.on('display-metrics-changed', (_event, display) => {
        if (display.id === state.displayId) {
            // Stop rather than risk OS fullscreen relocation or non-1:1 scaling during reconfiguration.
            stop('Display resolution, scaling or arrangement changed. Re-select the display and restart output.');
        } else notify();
    });
    return { start, update, control, stop, status };
}

module.exports = { createExternalOutputManager, validateFrame };

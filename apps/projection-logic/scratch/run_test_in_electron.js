const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'electron_test_out.txt');
fs.writeFileSync(logFile, 'Starting test...\n');
function log(msg) {
    fs.appendFileSync(logFile, (typeof msg === 'string' ? msg : JSON.stringify(msg)) + '\n');
}

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        log(`[CONSOLE ${level}] line ${line}: ${message}`);
    });

    win.webContents.on('did-fail-load', (e, code, desc) => {
        log(`Failed to load: ${code} ${desc}`);
    });

    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    log('index.html loaded in Electron!');

    setTimeout(async () => {
        try {
            log('Testing with Advanced Edition...');
            const res = await win.webContents.executeJavaScript(`
                (function() {
                    try {
                        applyAppEdition(APP_EDITIONS.advanced);
                        switchTab('canvas');
                        return {
                            success: true,
                            activeTab: state.activeTab,
                            mainContentActive: mainContent.canvas.classList.contains('active'),
                            canvasContentHtmlLength: mainContent.canvas.innerHTML.length
                        };
                    } catch(e) {
                        return { success: false, error: e.message, stack: e.stack };
                    }
                })()
            `);
            log('RESULT: ' + JSON.stringify(res, null, 2));
        } catch (err) {
            log('executeJavaScript error: ' + err.message);
        } finally {
            log('Done!');
            app.quit();
        }
    }, 1500);
});

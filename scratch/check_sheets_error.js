const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
    const win = new BrowserWindow({ width: 1400, height: 900, show: false, webPreferences: { nodeIntegration: true, contextIsolation: false } });
    
    win.webContents.on('console-message', (event, level, message, line, sourceId) => {
        console.log(`[CONSOLE] ${message} (${sourceId}:${line})`);
    });

    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await new Promise(r => setTimeout(r, 1200));

    const info = await win.webContents.executeJavaScript(`
        (() => {
            try {
                const sheetsNav = document.querySelector('[data-tab="sheets"]');
                sheetsNav.click();
                const sheetsContent = document.getElementById('sheets-content');
                return {
                    success: true,
                    innerLen: sheetsContent ? sheetsContent.innerHTML.length : 0
                };
            } catch (err) {
                return { success: false, error: err.stack || err.message };
            }
        })()
    `);
    console.log(JSON.stringify(info, null, 2));
    app.quit();
});

const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
    const win = new BrowserWindow({ width: 1400, height: 900, show: false, webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, nodeIntegration: false } });
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await new Promise(r => setTimeout(r, 1200));

    const info = await win.webContents.executeJavaScript(`
        (() => {
            // Click edition switch if in simple mode
            const editionSwitch = document.getElementById('app-edition-switch');
            if (editionSwitch && !editionSwitch.checked) {
                editionSwitch.click();
            }
            const sheetsNav = document.querySelector('[data-tab="sheets"]');
            if (sheetsNav) sheetsNav.click();

            const sheetsContent = document.getElementById('sheets-content');
            const btns = Array.from(sheetsContent.querySelectorAll('button')).map(b => ({
                id: b.id,
                text: b.textContent.trim(),
                action: b.dataset.action
            }));
            return {
                editionChecked: editionSwitch ? editionSwitch.checked : null,
                btnsCount: btns.length,
                btns: btns.slice(0, 10),
                innerHtmlStart: sheetsContent.innerHTML.substring(0, 400)
            };
        })()
    `);
    console.log(JSON.stringify(info, null, 2));
    app.quit();
});

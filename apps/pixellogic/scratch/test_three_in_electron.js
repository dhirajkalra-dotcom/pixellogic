const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));

  const result = await win.webContents.executeJavaScript(`
    (() => {
      return {
        hasThree: typeof window.THREE !== 'undefined',
        webglAvailable: typeof window.WebGLRenderingContext !== 'undefined',
        threeKeys: window.THREE ? Object.keys(window.THREE).slice(0, 10) : []
      };
    })()
  `);

  console.log('Test result:', JSON.stringify(result, null, 2));
  app.quit();
});

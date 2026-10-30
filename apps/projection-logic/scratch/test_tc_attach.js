const { app, BrowserWindow } = require('electron');
const path = require('path');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise((r) => setTimeout(r, 1200));

  const result = await win.webContents.executeJavaScript(`
    (() => {
      try {
        const THREE = window.THREE;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        const canvas = document.createElement('canvas');
        const renderer = new THREE.WebGLRenderer({ canvas });
        
        const tc = new THREE.TransformControls(camera, renderer.domElement);
        scene.add(tc.getHelper ? tc.getHelper() : tc);

        const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial());
        scene.add(mesh);

        tc.attach(mesh);
        tc.setMode('translate');

        return {
          attached: tc.object === mesh,
          mode: tc.getMode(),
          hasHelper: !!tc.getHelper
        };
      } catch (e) {
        return { error: e.message, stack: e.stack };
      }
    })()
  `);

  console.log('TC Attach Test:', JSON.stringify(result, null, 2));
  app.quit();
});

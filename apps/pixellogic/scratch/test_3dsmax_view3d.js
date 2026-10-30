const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, '3dsmax_test_result.json');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.webContents.on('console-message', (e, level, msg) => {
    console.log(`[BROWSER ${level}] ${msg}`);
  });

  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise((r) => setTimeout(r, 1500));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        if (typeof applyAppEdition === 'function' && typeof APP_EDITIONS !== 'undefined') {
          applyAppEdition(APP_EDITIONS.advanced);
        }

        // Switch to 3D View
        switchTab('view3d');
        await new Promise(r => setTimeout(r, 600));

        const canvas = document.getElementById('view3d-canvas');
        const s = state.view3dState;

        // Check tools
        const moveBtn = document.querySelector('.v3d-tool-btn[data-tool="translate"]');
        const rotateBtn = document.querySelector('.v3d-tool-btn[data-tool="rotate"]');
        const addScreenBtn = document.getElementById('v3d-add-screen-toggle-btn') || document.querySelector('.v3d-add-screen-item-btn');

        // Check curve math on active screen
        const curTf = s.mapTransforms[s.selectedMapId];
        curTf.wallShape = 'curved';
        curTf.curveDeg = -75; // User's test case

        // Re-render with -75 curve
        window.View3DPro.render(mainContent.view3d, getActivePixelMap(), state.projects.find(x => x.id === state.activeProjectId), {
          state,
          calculateLayout,
          drawVisualizerCanvas,
          persistProjects,
          showNotification,
          showInputModal,
          applyDemoWatermarkToCanvas,
          switchTab,
          escapeHtml
        });
        await new Promise(r => setTimeout(r, 300));

        // Switch tool to rotate (E)
        if (rotateBtn) rotateBtn.click();
        await new Promise(r => setTimeout(r, 200));
        const toolAfterE = state.view3dState.toolMode;

        return {
          success: true,
          activeTab: state.activeTab,
          toolMode: state.view3dState.toolMode,
          canvasFound: !!canvas,
          selectedMapId: s.selectedMapId,
          curveDeg: state.view3dState.mapTransforms[s.selectedMapId].curveDeg,
          toolAfterE
        };
      } catch (err) {
        return {
          success: false,
          error: err.message,
          stack: err.stack
        };
      }
    })()
  `);

  fs.writeFileSync(logFile, JSON.stringify(result, null, 2));
  console.log('Result:', JSON.stringify(result, null, 2));
  app.quit();
});

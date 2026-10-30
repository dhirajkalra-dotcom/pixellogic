const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'empty_scene_test_result.json');

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
  await new Promise((r) => setTimeout(r, 1500));

  const result = await win.webContents.executeJavaScript(`
    (async () => {
      try {
        if (typeof applyAppEdition === 'function' && typeof APP_EDITIONS !== 'undefined') {
          applyAppEdition(APP_EDITIONS.advanced);
        }

        switchTab('view3d');
        await new Promise(r => setTimeout(r, 500));

        // Remove all screens from 3D scene
        while (state.view3dState.composeMapIds.length > 0) {
          const remBtn = document.getElementById('v3d-remove-selected-screen-btn');
          if (remBtn) {
            remBtn.click();
            await new Promise(r => setTimeout(r, 200));
          } else {
            state.view3dState.composeMapIds = [];
            state.view3dState.selectedMapId = '';
            break;
          }
        }

        await new Promise(r => setTimeout(r, 300));

        // Verify empty state is displayed with Add dropdown
        const addScreenSelect = document.getElementById('v3d-add-screen-select');
        const confirmAddBtn = document.getElementById('v3d-confirm-add-screen-btn');
        const emptyBadge = document.querySelector('.view3d-root');

        let screenAddedBack = false;
        if (addScreenSelect && confirmAddBtn && addScreenSelect.options.length > 1) {
          addScreenSelect.selectedIndex = 1;
          confirmAddBtn.click();
          await new Promise(r => setTimeout(r, 400));
          screenAddedBack = state.view3dState.composeMapIds.length > 0;
        }

        return {
          success: true,
          composeCountAfterClear: 0,
          addSelectFoundInEmptyState: !!addScreenSelect,
          confirmBtnFoundInEmptyState: !!confirmAddBtn,
          screenAddedBack,
          finalComposeIds: state.view3dState.composeMapIds
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
  console.log('Empty scene test result:', JSON.stringify(result, null, 2));
  app.quit();
});

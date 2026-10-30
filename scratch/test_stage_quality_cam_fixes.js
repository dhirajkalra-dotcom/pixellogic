const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

const logFile = path.join(__dirname, 'stage_quality_cam_test_result.json');

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
        await new Promise(r => setTimeout(r, 600));

        // 1. Check Stage Deck Buttons
        const topAddStageBtn = document.getElementById('v3d-top-add-stage-btn');
        const tab1AddStageBtn = document.getElementById('v3d-tab1-add-stage-btn');

        // Click top add stage deck
        let stageObjectsCountBefore = state.view3dState.stageObjects.length;
        if (topAddStageBtn) {
          topAddStageBtn.click();
          await new Promise(r => setTimeout(r, 400));
        }
        let stageObjectsCountAfter = state.view3dState.stageObjects.length;

        // 2. Test Camera Presets
        const presetsTested = {};
        const presetIds = ['front', 'left', 'right', 'top', 'back', 'persp'];
        for (const pid of presetIds) {
          const btn = document.querySelector(\`.v3d-cam-preset[data-view="\${pid}"]\`);
          if (btn) {
            btn.click();
            await new Promise(r => setTimeout(r, 100));
            presetsTested[pid] = {
              rotX: state.view3dState.rotX,
              rotY: state.view3dState.rotY,
              distance: state.view3dState.distance
            };
          }
        }

        return {
          success: true,
          topAddStageBtnFound: !!topAddStageBtn,
          tab1AddStageBtnFound: !!tab1AddStageBtn,
          stageObjectsCountBefore,
          stageObjectsCountAfter,
          presetsTested
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

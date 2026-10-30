const { app, BrowserWindow } = require('electron');
const path = require('path');
const fs = require('fs');

app.commandLine.appendSwitch('ignore-certificate-errors');

app.whenReady().then(async () => {
    const win = new BrowserWindow({
        width: 1400,
        height: 900,
        show: false,
        webPreferences: {
            preload: path.join(__dirname, '..', 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false
        }
    });

    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    await new Promise(r => setTimeout(r, 1200));

    const testResults = await win.webContents.executeJavaScript(`
        (async () => {
            const results = {};
            try {
                // Switch to advanced edition if needed
                const editionSwitch = document.getElementById('app-edition-switch');
                if (editionSwitch && !editionSwitch.checked) {
                    editionSwitch.click();
                    await new Promise(r => setTimeout(r, 300));
                }

                // Switch to sheets tab
                const sheetsNav = document.querySelector('[data-tab="sheets"]');
                if (sheetsNav) sheetsNav.click();
                await new Promise(r => setTimeout(r, 600));

                const getStoredMaps = () => {
                    const raw = localStorage.getItem('pixi-logic-projects');
                    if (!raw) return [];
                    const parsed = JSON.parse(raw);
                    const activeP = (parsed.projects || []).find(p => p.id === parsed.activeProjectId) || (parsed.projects || [])[0];
                    return (activeP && activeP.pixelMaps) || [];
                };

                const initialMaps = getStoredMaps();
                results.initialMapCount = initialMaps.length;

                // Step 2: Add a screen row in Sheets
                const addBtn = document.querySelector('#sheets-add-screen-btn, [data-action="add-screen-top"]');
                if (!addBtn) throw new Error('add screen button not found');
                addBtn.click();
                await new Promise(r => setTimeout(r, 500));

                const mapsAfterAdd = getStoredMaps();
                results.afterAddCount = mapsAfterAdd.length;
                results.addScreenSuccess = mapsAfterAdd.length === initialMaps.length + 1;

                const newlyAddedMap = mapsAfterAdd[mapsAfterAdd.length - 1];
                results.newMapName = newlyAddedMap.name;
                results.newMapBrand = newlyAddedMap.ledBrand;
                results.newMapModel = newlyAddedMap.ledModel;
                results.newMapTilesWide = Number(newlyAddedMap.tilesWide);
                results.newMapTilesHigh = Number(newlyAddedMap.tilesHigh);
                results.newMapWidthVal = Number(newlyAddedMap.screenWidthValue);
                results.newMapHeightVal = Number(newlyAddedMap.screenHeightValue);

                // Step 3: Modify newly added screen's Width via data-sheet-unit
                const widthInput = document.querySelector(\`[data-map-id="\${newlyAddedMap.id}"][data-sheet-axis="w"]\`);
                if (!widthInput) throw new Error('Width input for newly added map not found');
                widthInput.value = '6';
                widthInput.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise(r => setTimeout(r, 500));

                const mapsAfterWidthEdit = getStoredMaps();
                const mapAfterWidthEdit = mapsAfterWidthEdit.find(m => String(m.id) === String(newlyAddedMap.id));
                results.widthModifiedTo6Meters = Number(mapAfterWidthEdit.screenWidthValue) === 6;
                results.updatedTilesWide = Number(mapAfterWidthEdit.tilesWide);

                // Step 4: Modify newly added screen's Tiles H via data-sheet-tiles
                const tilesHInput = document.querySelector(\`[data-map-id="\${newlyAddedMap.id}"][data-sheet-tiles="h"]\`);
                if (!tilesHInput) throw new Error('Tiles H input for newly added map not found');
                tilesHInput.value = '8';
                tilesHInput.dispatchEvent(new Event('change', { bubbles: true }));
                await new Promise(r => setTimeout(r, 500));

                const mapsAfterTileEdit = getStoredMaps();
                const mapAfterTileEdit = mapsAfterTileEdit.find(m => String(m.id) === String(newlyAddedMap.id));
                results.tilesHModifiedTo8 = Number(mapAfterTileEdit.tilesHigh) === 8;
                results.updatedHeightValue = Number(mapAfterTileEdit.screenHeightValue);

                // Step 5: Check Pixel Designer - verify NO delete map button in toolbar or tabs
                const designerNav = document.querySelector('[data-tab="designer"]');
                if (designerNav) designerNav.click();
                await new Promise(r => setTimeout(r, 500));

                const designerDelBtn = document.getElementById('delete-pixel-map-btn');
                const designerTabDelBtns = document.querySelectorAll('[data-action="delete-tab-map"]');
                results.designerHasDelToolbarBtn = !!designerDelBtn;
                results.designerTabDelBtnsCount = designerTabDelBtns.length;

                // Step 6: Test calling deletePixelMap in Designer - must be blocked
                if (typeof window.deletePixelMap === 'function') {
                    window.deletePixelMap(newlyAddedMap.id);
                }
                await new Promise(r => setTimeout(r, 200));
                const mapsAfterDesignerDeleteCall = getStoredMaps();
                results.mapStillExistsAfterDesignerDelete = mapsAfterDesignerDeleteCall.some(m => String(m.id) === String(newlyAddedMap.id));

                // Step 7: Delete row from Sheets tab
                if (sheetsNav) sheetsNav.click();
                await new Promise(r => setTimeout(r, 500));

                const deleteRowBtn = document.querySelector(\`[data-action="delete-row"][data-map-id="\${newlyAddedMap.id}"]\`);
                if (!deleteRowBtn) throw new Error('delete-row button in sheets not found');
                deleteRowBtn.click();
                await new Promise(r => setTimeout(r, 500));

                const mapsAfterSheetDelete = getStoredMaps();
                results.finalMapCount = mapsAfterSheetDelete.length;
                results.deleteInSheetsSuccess = mapsAfterSheetDelete.length === initialMaps.length && !mapsAfterSheetDelete.some(m => String(m.id) === String(newlyAddedMap.id));

                results.success = true;
            } catch (err) {
                results.error = err.message;
                results.success = false;
            }
            return results;
        })();
    `);

    console.log(JSON.stringify(testResults, null, 2));
    fs.writeFileSync(path.join(__dirname, 'sheets_test_result.json'), JSON.stringify(testResults, null, 2), 'utf8');
    app.quit();
});

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(indexPath, 'utf8');

// 1. Remove delete button from Pixel Designer toolbar
const oldDelBtn = `<button id="delete-pixel-map-btn" class="btn-glow flex items-center justify-center h-[34px] px-3.5 text-xs font-semibold rounded-none bg-red-700 hover:bg-red-600 border border-red-500/50">Delete Map</button>`;
if (content.includes(oldDelBtn)) {
    content = content.replace(oldDelBtn, `<!-- Pixel Maps can only be deleted from the Sheets tab -->`);
    console.log('1. Removed delete-pixel-map-btn from toolbar');
} else {
    console.warn('1. Warning: oldDelBtn not found');
}

// 2. Remove delete tab close button from Designer tabs
const oldTabCloseRegex = /const deleteBtnHtml = canDeleteMaps[\s\S]*?:\s*'';/;
if (oldTabCloseRegex.test(content)) {
    content = content.replace(oldTabCloseRegex, `const deleteBtnHtml = ''; // Pixel Maps can only be deleted from Sheets`);
    console.log('2. Removed deleteBtnHtml from Designer tabs');
} else {
    console.warn('2. Warning: oldTabCloseRegex not matched');
}

// 3. Update tab click handler for delete-tab-map
const oldTabCloseHandler = `const closeBtn = e.target.closest('[data-action="delete-tab-map"]');
                    if (closeBtn) {
                        e.stopPropagation();
                        e.preventDefault();
                        const mapId = closeBtn.dataset.mapId;
                        if (typeof window.deletePixelMap === 'function') {
                            window.deletePixelMap(mapId);
                        } else if (typeof deletePixelMap === 'function') {
                            deletePixelMap(mapId);
                        }
                        return;
                    }`;
const newTabCloseHandler = `const closeBtn = e.target.closest('[data-action="delete-tab-map"]');
                    if (closeBtn) {
                        e.stopPropagation();
                        e.preventDefault();
                        showNotification("Pixel Maps can only be deleted from the Sheets tab.", "warning");
                        return;
                    }`;
if (content.includes(oldTabCloseHandler)) {
    content = content.replace(oldTabCloseHandler, newTabCloseHandler);
    console.log('3. Updated tab click handler');
} else {
    console.warn('3. Warning: oldTabCloseHandler not found, trying regex');
    content = content.replace(/const closeBtn = e\.target\.closest\('\[data-action="delete-tab-map"\]'\);[\s\S]*?return;\s*\}/, newTabCloseHandler);
}

// 4. Update toolbar delBtn listener
const oldDelBtnListener = `const delBtn = document.getElementById('delete-pixel-map-btn'); if (delBtn) delBtn.addEventListener('click', deletePixelMap);`;
const newDelBtnListener = `const delBtn = document.getElementById('delete-pixel-map-btn'); if (delBtn) delBtn.addEventListener('click', () => showNotification("Pixel Maps can only be deleted from the Sheets tab.", "warning"));`;
if (content.includes(oldDelBtnListener)) {
    content = content.replace(oldDelBtnListener, newDelBtnListener);
    console.log('4. Updated delBtn listener');
} else {
    console.warn('4. Warning: oldDelBtnListener not found');
}

// 5. Replace deletePixelMap function implementation
const oldDeletePixelMapRegex = /const deletePixelMap = \(targetMapId\) => \{[\s\S]*?window\.deletePixelMap = deletePixelMap;/;
const newDeletePixelMap = `const deletePixelMap = (targetMapId) => {
            showNotification("Pixel Maps can only be deleted from the Sheets tab.", "warning");
        };
        window.deletePixelMap = deletePixelMap;`;
if (oldDeletePixelMapRegex.test(content)) {
    content = content.replace(oldDeletePixelMapRegex, newDeletePixelMap);
    console.log('5. Replaced deletePixelMap with Sheets-only guard');
} else {
    console.warn('5. Warning: oldDeletePixelMapRegex not matched');
}

// 6. Replace Date.now() + Math.random() with Date.now() + Math.floor(Math.random() * 10000)
content = content.replace(/Date\.now\(\)\s*\+\s*Math\.random\(\)/g, 'Date.now() + Math.floor(Math.random() * 10000)');
console.log('6. Sanitized random ID generation to clean integers');

// 7. Update applyLedModelToMap, updateMapDimensionInUnit, updateMapTilesCount
const oldUnitsAndSizesRegex = /const applyLedModelToMap = \(map, brandName, modelName\) => \{[\s\S]*?const updateMapTilesCount = \(map, axis, tilesCount\) => \{[\s\S]*?try \{ applyShapeMask\(map\); \} catch \(_\) \{\}\s*\};/;
const newUnitsAndSizes = `const applyLedModelToMap = (map, brandName, modelName) => {
                    if (!map) return false;
                    const catalog = getLedSheetsCatalog();
                    const spec = catalog.find(c => c.brand === brandName && c.model === modelName);
                    map.ledBrand = brandName || '';
                    map.ledModel = modelName || '';
                    if (!spec) return false;

                    const prevCalcs = calculateLayout(map) || {};
                    const prevTilesW = Math.max(1, Number(prevCalcs.panelsHorizontally) || Number(map.tilesWide) || 8);
                    const prevTilesH = Math.max(1, Number(prevCalcs.panelsVertically) || Number(map.tilesHigh) || 5);

                    map.ledPitchMm = spec.pitchMm;
                    map.panelWidthMm = spec.panelWidthMm;
                    map.panelHeightMm = spec.panelHeightMm;
                    map.panelDimensionsUnit = 'mm';
                    map.panelResWidth = spec.panelResWidth;
                    map.panelResHeight = spec.panelResHeight;

                    // Preserve tile grid count and update physical screen size in map's preferred unit
                    const newWidthMm = prevTilesW * spec.panelWidthMm;
                    const newHeightMm = prevTilesH * spec.panelHeightMm;
                    const unit = map.screenDimensionsUnit || 'm';
                    const factor = SHEETS_UNIT_TO_MM[unit] || 1000;
                    map.screenWidthValue = Number((newWidthMm / factor).toFixed(4));
                    map.screenHeightValue = Number((newHeightMm / factor).toFixed(4));
                    map.tilesWide = String(prevTilesW);
                    map.tilesHigh = String(prevTilesH);

                    const totalP = prevTilesW * prevTilesH;
                    if (!Array.isArray(map.panels) || map.panels.length !== totalP) {
                        map.panels = Array(totalP).fill(true);
                    }
                    try { applyShapeMask(map); } catch (_) {}
                    return true;
                };

                const updateMapDimensionInUnit = (map, axis, valueInUnit, unit) => {
                    if (!map) return;
                    const numeric = parseFloat(valueInUnit);
                    if (!Number.isFinite(numeric) || numeric <= 0) return;
                    const activeUnit = unit || map.screenDimensionsUnit || 'm';
                    const factor = SHEETS_UNIT_TO_MM[activeUnit] || 1000;
                    const targetMm = numeric * factor;
                    const panelW = Math.max(1, Number(map.panelWidthMm) || 500);
                    const panelH = Math.max(1, Number(map.panelHeightMm) || 500);
                    const curCalcs = calculateLayout(map) || {};
                    const curWidthMm = Number(curCalcs.screenWidthMm) || (panelW * Math.max(1, Number(map.tilesWide) || 8));
                    const curHeightMm = Number(curCalcs.screenHeightMm) || (panelH * Math.max(1, Number(map.tilesHigh) || 5));

                    const nextWidthMm = axis === 'w' ? targetMm : curWidthMm;
                    const nextHeightMm = axis === 'h' ? targetMm : curHeightMm;

                    const newTilesW = axis === 'w' ? Math.max(1, Math.round(nextWidthMm / panelW)) : Math.max(1, Number(map.tilesWide) || Math.round(nextWidthMm / panelW));
                    const newTilesH = axis === 'h' ? Math.max(1, Math.round(nextHeightMm / panelH)) : Math.max(1, Number(map.tilesHigh) || Math.round(nextHeightMm / panelH));

                    const mapUnit = map.screenDimensionsUnit || activeUnit || 'm';
                    const mapFactor = SHEETS_UNIT_TO_MM[mapUnit] || 1000;
                    map.screenWidthValue = Number((nextWidthMm / mapFactor).toFixed(4));
                    map.screenHeightValue = Number((nextHeightMm / mapFactor).toFixed(4));
                    map.screenDimensionsUnit = mapUnit;
                    map.tilesWide = String(newTilesW);
                    map.tilesHigh = String(newTilesH);

                    const totalP = newTilesW * newTilesH;
                    if (!Array.isArray(map.panels) || map.panels.length !== totalP) {
                        map.panels = Array(totalP).fill(true);
                    }
                    try { applyShapeMask(map); } catch (_) {}
                };

                const updateMapTilesCount = (map, axis, tilesCount) => {
                    if (!map) return;
                    const t = Math.max(1, Math.round(parseFloat(tilesCount) || 1));
                    const panelW = Math.max(1, Number(map.panelWidthMm) || 500);
                    const panelH = Math.max(1, Number(map.panelHeightMm) || 500);
                    const curCalcs = calculateLayout(map) || {};
                    const tilesW = axis === 'w' ? t : Math.max(1, Number(curCalcs.panelsHorizontally) || Number(map.tilesWide) || 1);
                    const tilesH = axis === 'h' ? t : Math.max(1, Number(curCalcs.panelsVertically) || Number(map.tilesHigh) || 1);
                    const nextWidthMm = tilesW * panelW;
                    const nextHeightMm = tilesH * panelH;
                    const mapUnit = map.screenDimensionsUnit || 'm';
                    const mapFactor = SHEETS_UNIT_TO_MM[mapUnit] || 1000;
                    map.screenWidthValue = Number((nextWidthMm / mapFactor).toFixed(4));
                    map.screenHeightValue = Number((nextHeightMm / mapFactor).toFixed(4));
                    map.screenDimensionsUnit = mapUnit;
                    map.tilesWide = String(tilesW);
                    map.tilesHigh = String(tilesH);

                    const totalP = tilesW * tilesH;
                    if (!Array.isArray(map.panels) || map.panels.length !== totalP) {
                        map.panels = Array(totalP).fill(true);
                    }
                    try { applyShapeMask(map); } catch (_) {}
                };`;

if (oldUnitsAndSizesRegex.test(content)) {
    content = content.replace(oldUnitsAndSizesRegex, newUnitsAndSizes);
    console.log('7. Updated applyLedModelToMap, updateMapDimensionInUnit, updateMapTilesCount');
} else {
    console.warn('7. Warning: oldUnitsAndSizesRegex not matched');
}

// 8. Update addScreenRow in Sheets
const oldAddScreenRowRegex = /const addScreenRow = \(brandOpt, modelOpt\) => \{[\s\S]*?showNotification\(`Added "\$\{newMap\.name\}" and synced with Pixel Designer\.`\);\s*\};/;
const newAddScreenRow = `const addScreenRow = (brandOpt, modelOpt) => {
                        const newMap = createNewPixelMapObject(activeProject.pixelMaps.length + 1);
                        newMap.id = Date.now() + Math.floor(Math.random() * 10000);
                        const catalog = getLedSheetsCatalog();
                        let targetBrand = brandOpt;
                        let targetModel = modelOpt;
                        if (!targetBrand || !targetModel) {
                            const curActive = getActivePixelMap();
                            if (curActive && curActive.ledBrand && curActive.ledModel) {
                                targetBrand = curActive.ledBrand;
                                targetModel = curActive.ledModel;
                            } else if (catalog && catalog.length > 0) {
                                targetBrand = catalog[0].brand;
                                targetModel = catalog[0].model;
                            }
                        }
                        if (targetBrand && targetModel) {
                            applyLedModelToMap(newMap, targetBrand, targetModel);
                            newMap.name = \`\${targetBrand} \${targetModel}\`;
                        } else {
                            newMap.name = \`Screen \${(activeProject.pixelMaps || []).length + 1}\`;
                            newMap.tilesWide = '4';
                            newMap.tilesHigh = '4';
                            newMap.panels = Array(16).fill(true);
                        }
                        activeProject.pixelMaps.push(newMap);
                        activeProject.activePixelMapId = newMap.id;
                        saveState();
                        redrawAffectedVisuals();
                        renderSheetsTab();
                        showNotification(\`Added "\${newMap.name}" and synced with Pixel Designer.\`);
                    };`;

if (oldAddScreenRowRegex.test(content)) {
    content = content.replace(oldAddScreenRowRegex, newAddScreenRow);
    console.log('8. Updated addScreenRow');
} else {
    console.warn('8. Warning: oldAddScreenRowRegex not matched');
}

// 9. Update input handlers in Sheets to handle Enter key & reliable commit
const oldSheetInputsRegex = /\/\/ Tile count edits[\s\S]*?c\.querySelectorAll\('\[data-sheet-unit\]'\)\.forEach\(el => \{[\s\S]*?renderSheetsTab\(\);\s*\}\);\s*\}\);/;
const newSheetInputs = `// Tile count edits (Tiles W / Tiles H)
                    c.querySelectorAll('[data-sheet-tiles]').forEach(el => {
                        const commit = () => {
                            const mapId = el.dataset.mapId;
                            const map = activeProject.pixelMaps.find(m => String(m.id) === String(mapId));
                            if (!map) return;
                            updateMapTilesCount(map, el.dataset.sheetTiles, el.value);
                            activeProject.activePixelMapId = map.id;
                            saveState();
                            redrawAffectedVisuals();
                            renderSheetsTab();
                        };
                        el.addEventListener('change', commit);
                        el.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commit();
                            }
                        });
                    });

                    // Header & per-row unit selector dropdowns (m, mm, cm, in, ft)
                    const headerUnitSel = document.getElementById('sheets-header-unit-select');
                    if (headerUnitSel) {
                        headerUnitSel.addEventListener('change', (e) => {
                            const nextU = e.target.value || 'm';
                            sheetsState.sizeUnit = nextU;
                            activeProject.pixelMaps.forEach(m => { m.sheetRowUnit = nextU; });
                            saveState();
                            renderSheetsTab();
                        });
                    }
                    const catCabUnitSel = document.getElementById('sheets-catalog-cab-unit-select');
                    if (catCabUnitSel) {
                        catCabUnitSel.addEventListener('change', (e) => {
                            sheetsState.catalogCabUnit = e.target.value || 'mm';
                            renderSheetsTab();
                        });
                    }
                    c.querySelectorAll('[data-sheet-row-unit]').forEach(el => {
                        el.addEventListener('change', () => {
                            const mapId = el.dataset.mapId;
                            const map = activeProject.pixelMaps.find(m => String(m.id) === String(mapId));
                            if (!map) return;
                            map.sheetRowUnit = el.value || 'm';
                            saveState();
                            renderSheetsTab();
                        });
                    });

                    // Multi-unit size edits (m, mm, cm, in, ft)
                    c.querySelectorAll('[data-sheet-unit]').forEach(el => {
                        const commit = () => {
                            const mapId = el.dataset.mapId;
                            const map = activeProject.pixelMaps.find(m => String(m.id) === String(mapId));
                            if (!map) return;
                            updateMapDimensionInUnit(map, el.dataset.sheetAxis, el.value, el.dataset.sheetUnit);
                            activeProject.activePixelMapId = map.id;
                            saveState();
                            redrawAffectedVisuals();
                            renderSheetsTab();
                        };
                        el.addEventListener('change', commit);
                        el.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                commit();
                            }
                        });
                    });

                    // Screen name Enter key commit
                    c.querySelectorAll('[data-sheet-field="name"]').forEach(el => {
                        el.addEventListener('keydown', (e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                el.blur();
                            }
                        });
                    });`;

if (oldSheetInputsRegex.test(content)) {
    content = content.replace(oldSheetInputsRegex, newSheetInputs);
    console.log('9. Updated sheet input event handlers with Enter commit');
} else {
    console.warn('9. Warning: oldSheetInputsRegex not matched');
}

// 10. Update delete-row in Sheets tab
const oldDeleteRowRegex = /\} else if \(action === 'delete-row' && map\) \{[\s\S]*?showNotification\(`Removed screen "\$\{map\.name\}"\.`\);\s*\}/;
const newDeleteRow = `} else if (action === 'delete-row' && map) {
                                if (activeProject.pixelMaps.length <= 1) {
                                    showNotification("Cannot delete the only screen in a project.", "warning");
                                    return;
                                }
                                const delName = map.name || 'Screen';
                                activeProject.pixelMaps = activeProject.pixelMaps.filter(m => String(m.id) !== String(map.id));
                                if (String(activeProject.activePixelMapId) === String(map.id)) {
                                    activeProject.activePixelMapId = activeProject.pixelMaps[0].id;
                                }
                                saveState();
                                redrawAffectedVisuals();
                                renderSheetsTab();
                                showNotification(\`Screen "\${delName}" deleted.\`);
                            }`;

if (oldDeleteRowRegex.test(content)) {
    content = content.replace(oldDeleteRowRegex, newDeleteRow);
    console.log('10. Updated delete-row in Sheets tab');
} else {
    console.warn('10. Warning: oldDeleteRowRegex not matched');
}

fs.writeFileSync(indexPath, content, 'utf8');
console.log('Successfully wrote index.html changes.');

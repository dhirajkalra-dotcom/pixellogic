const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '..', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// 1. In renderPowerCalcTab:
// Replace calcRow definition to include vScale:
const oldCalcRow = `                    const calcRow = (key) => {
                        if (!rowData || rowData[key] == null) return { perTile: null, total: null, perPhase: null, totalW: null, perPhaseW: null };
                        const perTile = rowData[key];
                        const total = perTile * totalTiles;
                        const perPhase = perTile * tilesPerPhase;
                        return {
                            perTile,
                            total,
                            perPhase,
                            totalW: total * pcState.voltage,
                            perPhaseW: perPhase * pcState.voltage,
                            breaker: nextBreaker(perPhase * 1.25)
                        };
                    };`;

const newCalcRow = `                    const vScale = 230 / (Number(pcState.voltage) || 230);
                    const calcRow = (key) => {
                        if (!rowData || rowData[key] == null) return { perTile: null, total: null, perPhase: null, totalW: null, perPhaseW: null };
                        const perTile = rowData[key] * vScale;
                        const total = perTile * totalTiles;
                        const perPhase = perTile * tilesPerPhase;
                        return {
                            perTile,
                            total,
                            perPhase,
                            totalW: total * pcState.voltage,
                            perPhaseW: perPhase * pcState.voltage,
                            breaker: nextBreaker(perPhase * 1.25)
                        };
                    };`;

html = html.replace(oldCalcRow, newCalcRow);

// 2. In worstCase and worstPerPhase:
html = html.replace(
  "const worstCase = rowData ? Math.max(...['r','g','b','w'].map(k => rowData[k] || 0)) * totalTiles : 0;",
  "const worstCase = rowData ? Math.max(...['r','g','b','w'].map(k => (rowData[k] || 0) * vScale)) * totalTiles : 0;"
);
html = html.replace(
  "const worstPerPhase = rowData ? Math.max(...['r','g','b','w'].map(k => rowData[k] || 0)) * tilesPerPhase : 0;",
  "const worstPerPhase = rowData ? Math.max(...['r','g','b','w'].map(k => (rowData[k] || 0) * vScale)) * tilesPerPhase : 0;"
);

// 3. In phaseTable:
html = html.replace(
  "const worstA = Math.max(...keys.slice(0,4).map(k => (rowData[k]||0) * tph));",
  "const worstA = Math.max(...keys.slice(0,4).map(k => (rowData[k]||0) * vScale * tph));"
);
html = html.replace(
  "const a = rowData[k] != null ? (rowData[k] * tph).toFixed(2) : '—';",
  "const a = rowData[k] != null ? (rowData[k] * vScale * tph).toFixed(2) : '—';"
);

// 4. In exportPowerCalcPdf:
const oldPdfCalc = `                    const worstA = Math.max(...['r','g','b','w'].map(k => rowData[k]||0)) * totalTiles;
                    const worstPerPhaseA = Math.max(...['r','g','b','w'].map(k => rowData[k]||0)) * tilesPerPhase;`;

const newPdfCalc = `                    const pdfVScale = 230 / (Number(pcState.voltage) || 230);
                    const worstA = Math.max(...['r','g','b','w'].map(k => (rowData[k]||0) * pdfVScale)) * totalTiles;
                    const worstPerPhaseA = Math.max(...['r','g','b','w'].map(k => (rowData[k]||0) * pdfVScale)) * tilesPerPhase;`;

html = html.replace(oldPdfCalc, newPdfCalc);

// 5. In switchTab: ensure window.__view3dProRuntime is also cleaned up
const oldSwitchTabClean = `                if (tabName !== 'view3d' && view3dRuntime && typeof view3dRuntime.dispose === 'function') {
                    try { view3dRuntime.dispose(); } catch (_) {}
                    view3dRuntime = null;
                }`;

const newSwitchTabClean = `                if (tabName !== 'view3d') {
                    if (view3dRuntime && typeof view3dRuntime.dispose === 'function') {
                        try { view3dRuntime.dispose(); } catch (_) {}
                        view3dRuntime = null;
                    }
                    if (window.__view3dProRuntime && typeof window.__view3dProRuntime.dispose === 'function') {
                        try { window.__view3dProRuntime.dispose(); } catch (_) {}
                        window.__view3dProRuntime = null;
                    }
                }`;

html = html.replace(oldSwitchTabClean, newSwitchTabClean);

fs.writeFileSync(htmlPath, html, 'utf8');
console.log('Successfully patched index.html power calc and view3d tab cleanup!');

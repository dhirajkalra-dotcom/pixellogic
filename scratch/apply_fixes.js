const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

// Check line endings
const isCRLF = content.includes('\r\n');
const eol = isCRLF ? '\r\n' : '\n';

console.log('File loaded, length:', content.length, 'isCRLF:', isCRLF);

// 1. Prepare Tile Grid functions and updated drawMaskOverlays
const newMaskSystemBlock = [
    '        // =============== MASK SYSTEM ===============',
    '        // Helper: get tile grid info for snapping masks to LED panels',
    '        function getCanvasTileGridAt(activeCanvas, worldX, worldY) {',
    '            const maps = activeCanvas?.maps || [];',
    '            let map = maps.find(m => worldX >= Number(m.x || 0) && worldX <= Number(m.x || 0) + Number(m.width || 0) &&',
    '                                     worldY >= Number(m.y || 0) && worldY <= Number(m.y || 0) + Number(m.height || 0));',
    '            if (!map && maps.length > 0) {',
    '                let minDist = Infinity;',
    '                maps.forEach(m => {',
    '                    const cx = Number(m.x || 0) + Number(m.width || 0) / 2;',
    '                    const cy = Number(m.y || 0) + Number(m.height || 0) / 2;',
    '                    const dist = Math.hypot(worldX - cx, worldY - cy);',
    '                    if (dist < minDist) {',
    '                        minDist = dist;',
    '                        map = m;',
    '                    }',
    '                });',
    '            }',
    '            const originX = Number(map?.x || 0);',
    '            const originY = Number(map?.y || 0);',
    '            const panelW = Math.max(1, Number(map?.panelResWidth) || 128);',
    '            const panelH = Math.max(1, Number(map?.panelResHeight) || 128);',
    '            return {',
    '                map,',
    '                originX,',
    '                originY,',
    '                panelW,',
    '                panelH,',
    '                snapX: (x) => originX + Math.round((x - originX) / panelW) * panelW,',
    '                snapY: (y) => originY + Math.round((y - originY) / panelH) * panelH',
    '            };',
    '        }',
    '',
    '        function getMaskTileGrid(activeCanvas, mask) {',
    '            const centerX = Number(mask?.x || 0) + Number(mask?.w || 0) / 2;',
    '            const centerY = Number(mask?.y || 0) + Number(mask?.h || 0) / 2;',
    '            const grid = getCanvasTileGridAt(activeCanvas, centerX, centerY);',
    '            return {',
    '                map: grid.map,',
    '                x: grid.panelW,',
    '                y: grid.panelH',
    '            };',
    '        }',
    '',
    '        function snapMaskToTile(value, origin, step) {',
    '            const safeStep = Math.max(1, Number(step) || 1);',
    '            const nearest = origin + Math.round((value - origin) / safeStep) * safeStep;',
    '            const snapDistance = Math.min(48, Math.max(16, safeStep * 0.3));',
    '            return Math.abs(value - nearest) <= snapDistance ? nearest : value;',
    '        }',
    '',
    '        // Draw mask overlays on a context (for preview on main canvas)',
    '        const drawMaskOverlays = (ctx, masks, canvasW, canvasH, options = {}) => {',
    '            if (!masks || masks.length === 0) return;',
    '            const selectedId = options.selectedId !== undefined ? options.selectedId : state.canvasState.selectedMaskId;',
    '            const currentCanvas = options.canvas || (typeof getActiveCanvas === \'function\' ? getActiveCanvas() : null);',
    '',
    '            masks.forEach(mask => {',
    '                try {',
    '                    if (mask.visible === false) return;',
    '                    if (options.isExport && mask.mode === \'guide\') return;',
    '                    const path = buildMaskPath(mask);',
    '                    const isSelected = selectedId != null && String(mask.id) === String(selectedId);',
    '',
    '                    ctx.save();',
    '                    if (mask.mode === \'guide\') {',
    '                        ctx.strokeStyle = isSelected ? "#facc15" : (mask.color && mask.color !== "#000000" ? mask.color : "#06b6d4");',
    '                        ctx.lineWidth = isSelected ? 3 : 1.5;',
    '                        ctx.setLineDash([8, 4]);',
    '                        ctx.stroke(path);',
    '                        ctx.fillStyle = "rgba(6, 182, 212, 0.08)";',
    '                        ctx.fill(path);',
    '                    } else if (mask.mode === \'cutout\') {',
    '                        const alpha = (mask.opacity != null ? mask.opacity : 100) / 100;',
    '                        if (mask.feather && mask.feather > 0) {',
    '                            ctx.shadowColor = mask.color || "#000000";',
    '                            ctx.shadowBlur = mask.feather;',
    '                        }',
    '                        ctx.fillStyle = `rgba(15, 23, 42, ${Math.min(0.85, alpha * 0.85)})`;',
    '                        ctx.fill(path);',
    '                        ctx.strokeStyle = isSelected ? "#facc15" : "#ec4899";',
    '                        ctx.lineWidth = isSelected ? 3 : 1.5;',
    '                        ctx.setLineDash(isSelected ? [] : [4, 4]);',
    '                        ctx.stroke(path);',
    '                    } else {',
    '                        const alpha = (mask.opacity != null ? mask.opacity : 100) / 100;',
    '                        const color = mask.color || "#000000";',
    '                        const r = parseInt(color.slice(1,3),16)||0, g = parseInt(color.slice(3,5),16)||0, b = parseInt(color.slice(5,7),16)||0;',
    '                        if (mask.feather && mask.feather > 0) {',
    '                            ctx.shadowColor = color;',
    '                            ctx.shadowBlur = mask.feather;',
    '                        }',
    '                        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;',
    '                        ctx.fill(path);',
    '                        ctx.strokeStyle = isSelected ? "#facc15" : "rgba(168,85,247,0.7)";',
    '                        ctx.lineWidth = isSelected ? 3 : 1.5;',
    '                        ctx.setLineDash(isSelected ? [] : [6, 4]);',
    '                        ctx.stroke(path);',
    '                    }',
    '                    ctx.restore();',
    '',
    '                    // Draw resize handles for selected rect, ellipse, circle',
    '                    if (isSelected && (mask.type === "rect" || mask.type === "ellipse" || mask.type === "circle") && !options.hideDimensions) {',
    '                        const zoom = state.canvasState.zoom || 1;',
    '                        if (mask.locked) {',
    '                            ctx.save();',
    '                            ctx.fillStyle = "#ef4444";',
    '                            ctx.fillRect(mask.x + mask.w - 18 / zoom, mask.y - 12 / zoom, 18 / zoom, 18 / zoom);',
    '                            ctx.fillStyle = "#ffffff";',
    '                            ctx.font = `bold ${Math.max(10, 12 / zoom)}px sans-serif`;',
    '                            ctx.textAlign = "center";',
    '                            ctx.textBaseline = "middle";',
    '                            ctx.fillText("🔒", mask.x + mask.w - 9 / zoom, mask.y - 3 / zoom);',
    '                            ctx.restore();',
    '                        } else {',
    '                            const hs = Math.max(4, 6 / zoom);',
    '                            const hx = [mask.x, mask.x + mask.w / 2, mask.x + mask.w];',
    '                            const hy = [mask.y, mask.y + mask.h / 2, mask.y + mask.h];',
    '                            ctx.save();',
    '                            ctx.fillStyle = "#facc15";',
    '                            ctx.strokeStyle = "#111827";',
    '                            ctx.lineWidth = Math.max(1, 2 / zoom);',
    '                            for (const x of hx) for (const y of hy) {',
    '                                if (x === hx[1] && y === hy[1]) continue;',
    '                                ctx.fillRect(x - hs, y - hs, hs * 2, hs * 2);',
    '                                ctx.strokeRect(x - hs, y - hs, hs * 2, hs * 2);',
    '                            }',
    '                            ctx.restore();',
    '                        }',
    '                    }',
    '',
    '                    // Draw vertex handles for selected polygon',
    '                    if (isSelected && mask.type === "polygon" && Array.isArray(mask.points) && !options.hideDimensions) {',
    '                        const zoom = state.canvasState.zoom || 1;',
    '                        const handleR = Math.max(5, 7 / zoom);',
    '                        ctx.save();',
    '                        mask.points.forEach((pt, idx) => {',
    '                            ctx.beginPath();',
    '                            ctx.arc(pt.x, pt.y, handleR, 0, Math.PI * 2);',
    '                            ctx.fillStyle = mask.locked ? "#ef4444" : "#facc15";',
    '                            ctx.fill();',
    '                            ctx.strokeStyle = "#111827";',
    '                            ctx.lineWidth = 2 / zoom;',
    '                            ctx.stroke();',
    '                            ctx.fillStyle = "#ffffff";',
    '                            ctx.font = `bold ${Math.max(8, 10/zoom)}px sans-serif`;',
    '                            ctx.textAlign = "center";',
    '                            ctx.textBaseline = "middle";',
    '                            ctx.fillText(idx + 1, pt.x, pt.y);',
    '                        });',
    '                        ctx.restore();',
    '                    }',
    '',
    '                    // Draw dimension labels for selected mask',
    '                    if (isSelected && !options.hideDimensions) {',
    '                        let mx = Number(mask.x) || 0;',
    '                        let my = Number(mask.y) || 0;',
    '                        let mw = Number(mask.w) || 0;',
    '                        let mh = Number(mask.h) || 0;',
    '                        if ((mw <= 0 || mh <= 0) && Array.isArray(mask.points) && mask.points.length > 0) {',
    '                            const xs = mask.points.map(p => Number(p.x) || 0);',
    '                            const ys = mask.points.map(p => Number(p.y) || 0);',
    '                            mx = Math.min(...xs);',
    '                            my = Math.min(...ys);',
    '                            mw = Math.max(...xs) - mx;',
    '                            mh = Math.max(...ys) - my;',
    '                        }',
    '',
    '                        const unit = state.canvasState.maskUnit || "px";',
    '                        const ppu = state.canvasState.maskPxPerUnit || 1;',
    '                        const toUnit = (px) => unit === "px" ? Math.round(px) : +(px / ppu).toFixed(1);',
    '                        const tag = mask.name ? mask.name + " · " : "";',
    '                        const modeTag = mask.mode === \'guide\' ? " [GUIDE]" : mask.mode === \'cutout\' ? " [CUTOUT]" : "";',
    '                        let panelCountTag = "";',
    '                        const isCirc = mask.type === \'circle\' || (mask.type === \'ellipse\' && Math.abs(mw - mh) < 2);',
    '',
    '                        if (typeof getCanvasTileGridAt === \'function\' && currentCanvas) {',
    '                            try {',
    '                                const grid = getCanvasTileGridAt(currentCanvas, mx + mw / 2, my + mh / 2);',
    '                                if (grid && grid.panelW && grid.panelH) {',
    '                                    if (isCirc) {',
    '                                        const panelsDiam = +(mw / grid.panelW).toFixed(1);',
    '                                        if (panelsDiam > 0) panelCountTag = " [Ø " + panelsDiam + " Panels]";',
    '                                    } else if (mask.type === \'rect\') {',
    '                                        const pw = +(mw / grid.panelW).toFixed(1);',
    '                                        const ph = +(mh / grid.panelH).toFixed(1);',
    '                                        if (pw > 0 && ph > 0) panelCountTag = " (" + pw + "×" + ph + " Panels)";',
    '                                    }',
    '                                }',
    '                            } catch (_) {}',
    '                        }',
    '',
    '                        let wLabel = "";',
    '                        let hLabel = "";',
    '                        if (isCirc) {',
    '                            wLabel = tag + "Ø " + toUnit(mw) + " " + unit + " (R " + toUnit(mw / 2) + " " + unit + ")" + panelCountTag + modeTag;',
    '                        } else if (mask.type === "polygon") {',
    '                            const ptCount = Array.isArray(mask.points) ? mask.points.length : 0;',
    '                            wLabel = tag + toUnit(mw) + " × " + toUnit(mh) + " " + unit + (ptCount > 0 ? " (" + ptCount + " pts)" : "") + modeTag;',
    '                        } else {',
    '                            wLabel = tag + toUnit(mw) + " " + unit + panelCountTag + modeTag;',
    '                            hLabel = toUnit(mh) + " " + unit;',
    '                        }',
    '',
    '                        const zoom = state.canvasState.zoom || 1;',
    '                        const fontSize = Math.max(10, 13 / zoom);',
    '                        ctx.save();',
    '                        ctx.font = `bold ${fontSize}px sans-serif`;',
    '                        ctx.textAlign = "center";',
    '                        ctx.textBaseline = "bottom";',
    '                        const wMetrics = ctx.measureText(wLabel);',
    '                        const wLx = mx + mw / 2, wLy = my - 4 / zoom;',
    '                        ctx.fillStyle = "rgba(0,0,0,0.8)";',
    '                        ctx.fillRect(wLx - wMetrics.width/2 - 4/zoom, wLy - fontSize - 2/zoom, wMetrics.width + 8/zoom, fontSize + 4/zoom);',
    '                        ctx.fillStyle = mask.mode === \'guide\' ? "#06b6d4" : mask.mode === \'cutout\' ? "#f472b6" : "#a855f7";',
    '                        ctx.fillText(wLabel, wLx, wLy);',
    '',
    '                        if (hLabel) {',
    '                            ctx.textAlign = "right";',
    '                            ctx.textBaseline = "middle";',
    '                            const hLx = mx - 4 / zoom, hLy = my + mh / 2;',
    '                            const hMetrics = ctx.measureText(hLabel);',
    '                            ctx.fillStyle = "rgba(0,0,0,0.8)";',
    '                            ctx.fillRect(hLx - hMetrics.width - 4/zoom, hLy - fontSize/2 - 2/zoom, hMetrics.width + 8/zoom, fontSize + 4/zoom);',
    '                            ctx.fillStyle = mask.mode === \'guide\' ? "#06b6d4" : mask.mode === \'cutout\' ? "#f472b6" : "#a855f7";',
    '                            ctx.fillText(hLabel, hLx, hLy);',
    '                        }',
    '                        ctx.restore();',
    '                    }',
    '                } catch (maskErr) {',
    '                    console.error("Error drawing mask item:", maskErr);',
    '                }',
    '            });',
    '        };'
].join(eol);

// Find the target block for drawMaskOverlays
const startMarker = '        // =============== MASK SYSTEM ===============';
const endMarker = '        const exportCanvasWithMask = () => {';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker, startIdx);

if (startIdx === -1 || endIdx === -1) {
    console.error('Could not locate mask system block!');
    process.exit(1);
}

console.log('Replacing mask system block from', startIdx, 'to', endIdx);
content = content.slice(0, startIdx) + newMaskSystemBlock + eol + eol + content.slice(endIdx);

// 2. Remove the old duplicate getCanvasTileGridAt block around line 32695
const oldDuplicateBlockStart = '        const getCanvasTileGridAt = (activeCanvas, worldX, worldY) => {';
const oldDuplicateBlockEnd = '        const handleCanvasMouseDown = (e) => {';

const dupStartIdx = content.indexOf(oldDuplicateBlockStart);
const dupEndIdx = content.indexOf(oldDuplicateBlockEnd, dupStartIdx);

if (dupStartIdx !== -1 && dupEndIdx !== -1) {
    console.log('Removing old duplicate getCanvasTileGridAt block from', dupStartIdx, 'to', dupEndIdx);
    content = content.slice(0, dupStartIdx) + content.slice(dupEndIdx);
} else {
    console.warn('Could not find duplicate getCanvasTileGridAt block (might already be clean)');
}

// 3. Update syncSelectedMaskProperties and syncMaskPropertiesToUI for safe polygon sizes & disabled inputs
content = content.replace(
    /if\s*\(\!mask\)\s*return;\s*\r?\n\s*if\s*\(fillColor\)\s*fillColor\.value/g,
    [
        'if (!mask) {',
        '                if (propDiameter) { propDiameter.disabled = true; propDiameter.classList.add("opacity-40", "cursor-not-allowed"); propDiameter.value = ""; }',
        '                if (propRad) { propRad.disabled = true; propRad.classList.add("opacity-40", "cursor-not-allowed"); propRad.value = ""; }',
        '                if (circleLock) { circleLock.disabled = true; circleLock.checked = false; }',
        '                return;',
        '            }',
        '',
        '            if (mask.type === "polygon" && Array.isArray(mask.points) && mask.points.length > 0) {',
        '                if (mask.x == null || mask.y == null || mask.w == null || mask.h == null || isNaN(mask.w) || isNaN(mask.h)) {',
        '                    const xs = mask.points.map(p => Number(p.x) || 0);',
        '                    const ys = mask.points.map(p => Number(p.y) || 0);',
        '                    mask.x = Math.min(...xs);',
        '                    mask.y = Math.min(...ys);',
        '                    mask.w = Math.max(...xs) - mask.x;',
        '                    mask.h = Math.max(...ys) - mask.y;',
        '                }',
        '            }',
        '',
        '            if (fillColor) fillColor.value'
    ].join(eol)
);

content = content.replace(
    /if\s*\(\!mask\)\s*\{\s*\r?\n\s*if\s*\(typeof updateMaskList === "function"\)\s*updateMaskList\(\);\s*\r?\n\s*return;\s*\r?\n\s*\}\s*\r?\n\s*if\s*\(maskFillColor\)\s*maskFillColor\.value/g,
    [
        'if (!mask) {',
        '                    if (propDiam) { propDiam.disabled = true; propDiam.classList.add("opacity-40", "cursor-not-allowed"); propDiam.value = ""; }',
        '                    if (propR) { propR.disabled = true; propR.classList.add("opacity-40", "cursor-not-allowed"); propR.value = ""; }',
        '                    if (cLock) { cLock.disabled = true; cLock.checked = false; }',
        '                    if (typeof updateMaskList === "function") updateMaskList();',
        '                    return;',
        '                }',
        '',
        '                if (mask.type === "polygon" && Array.isArray(mask.points) && mask.points.length > 0) {',
        '                    if (mask.x == null || mask.y == null || mask.w == null || mask.h == null || isNaN(mask.w) || isNaN(mask.h)) {',
        '                        const xs = mask.points.map(p => Number(p.x) || 0);',
        '                        const ys = mask.points.map(p => Number(p.y) || 0);',
        '                        mask.x = Math.min(...xs);',
        '                        mask.y = Math.min(...ys);',
        '                        mask.w = Math.max(...xs) - mask.x;',
        '                        mask.h = Math.max(...ys) - mask.y;',
        '                    }',
        '                }',
        '',
        '                if (maskFillColor) maskFillColor.value'
    ].join(eol)
);

// 4. Update toUnit in syncSelectedMaskProperties and syncMaskPropertiesToUI to handle null/undefined/NaN safely
content = content.replace(
    /const toUnit = \(px\) => unit === "px" \? Math\.round\(px\) : \+\(px \/ ppu\)\.toFixed\(2\);/g,
    'const toUnit = (px) => (px == null || isNaN(px)) ? "" : (unit === "px" ? Math.round(px) : +(px / ppu).toFixed(2));'
);

// 5. Update updateMaskList to handle polygon and circle dims cleanly
content = content.replace(
    /const dims = Math\.round\(m\.w\) \+ "×" \+ Math\.round\(m\.h\) \+ " px";/g,
    [
        'let mw = Number(m.w) || 0;',
        '                let mh = Number(m.h) || 0;',
        '                if ((mw <= 0 || mh <= 0) && Array.isArray(m.points) && m.points.length > 0) {',
        '                    const xs = m.points.map(p => Number(p.x) || 0);',
        '                    const ys = m.points.map(p => Number(p.y) || 0);',
        '                    mw = Math.max(...xs) - Math.min(...xs);',
        '                    mh = Math.max(...ys) - Math.min(...ys);',
        '                }',
        '                const isCirc = m.type === "circle" || (m.type === "ellipse" && Math.abs(mw - mh) < 2);',
        '                const dims = isCirc ? `Ø ${Math.round(mw)} px` : `${Math.round(mw)}×${Math.round(mh)} px`;'
    ].join(eol)
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully written index.html, new length:', content.length);

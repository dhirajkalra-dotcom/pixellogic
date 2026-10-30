const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

// Function to replace text regardless of CRLF vs LF
function safeReplace(source, searchStr, replaceStr) {
    const isCRLF = source.includes('\r\n');
    const normSource = isCRLF ? source.replace(/\r\n/g, '\n') : source;
    const normSearch = searchStr.replace(/\r\n/g, '\n');
    const normReplace = replaceStr.replace(/\r\n/g, '\n');

    if (!normSource.includes(normSearch)) {
        return { success: false, content: source };
    }

    const replaced = normSource.replace(normSearch, normReplace);
    return {
        success: true,
        content: isCRLF ? replaced.replace(/\n/g, '\r\n') : replaced
    };
}

// 1. Insert top-level updateMaskModeButtons and setMaskMode right before `const renderCanvas = () => {`
const renderCanvasTarget = '        const renderCanvas = () => {';
const topLevelMaskHelpers = `        // ====== Top-Level Output Maps Mask Helpers ======
        const updateMaskModeButtons = () => {
            const cs = state?.canvasState;
            const mode = cs?.maskMode;
            const modeMap = {
                rect: document.getElementById("mask-rect-btn"),
                ellipse: document.getElementById("mask-ellipse-btn"),
                polygon: document.getElementById("mask-polygon-btn")
            };
            Object.entries(modeMap).forEach(([m, btn]) => {
                if (!btn) return;
                if (mode === m) {
                    btn.classList.remove("bg-gray-700");
                    btn.classList.add("bg-purple-600", "ring-2", "ring-purple-400");
                } else {
                    btn.classList.remove("bg-purple-600", "ring-2", "ring-purple-400");
                    btn.classList.add("bg-gray-700");
                }
            });
        };
        window.updateMaskModeButtons = updateMaskModeButtons;

        const setMaskMode = (mode) => {
            const cs = state.canvasState;
            cs.maskMode = mode;
            cs.maskDrawing = false;
            cs.maskPreview = null;
            cs.maskPolygonPoints = [];
            if (cs.drawing) {
                cs.drawing.enabled = false;
                cs.drawing.selectEnabled = false;
            }
            cs.selectedMaskId = null;
            cs.maskDragging = false;
            cs.maskResizing = false;
            updateMaskModeButtons();
            if (typeof syncSelectedMaskProperties === 'function') syncSelectedMaskProperties();
            if (typeof updateMaskList === 'function') updateMaskList();
            if (typeof drawMainCanvas === 'function') drawMainCanvas();
        };
        window.setMaskMode = setMaskMode;

`;

let res = safeReplace(content, renderCanvasTarget, topLevelMaskHelpers + renderCanvasTarget);
if (!res.success) {
    console.error('Target renderCanvasTarget not found!');
    process.exit(1);
}
content = res.content;

// 2. In renderCanvas, replace local setMaskMode implementation so it delegates to top-level setMaskMode without calling renderCanvas()
const oldLocalSetMaskMode = `            // ====== Mask Tool Wiring ======
            const setMaskMode = (mode) => {
                const cs = state.canvasState;
                if (cs.maskMode === mode) { cs.maskMode = null; } else { cs.maskMode = mode; }
                cs.maskDrawing = false; cs.maskPreview = null; cs.maskPolygonPoints = [];
                if (cs.maskMode) { cs.drawing.enabled = false; cs.drawing.selectEnabled = false; }
                updateMaskModeButtons();
                renderCanvas();
            };`;

const newLocalSetMaskMode = `            // ====== Mask Tool Wiring ======
            const setMaskMode = (mode) => {
                if (typeof window.setMaskMode === 'function') window.setMaskMode(mode);
            };`;

res = safeReplace(content, oldLocalSetMaskMode, newLocalSetMaskMode);
if (!res.success) {
    console.error('oldLocalSetMaskMode not found!');
    process.exit(1);
}
content = res.content;

// 3. In renderCanvas, replace local updateMaskModeButtons so it delegates to window.updateMaskModeButtons
const oldLocalUpdateMaskButtons = `            const updateMaskModeButtons = () => {
                const modeMap = { rect: maskRectBtn, ellipse: maskEllipseBtn, polygon: maskPolygonBtn };
                Object.entries(modeMap).forEach(([mode, btn]) => {
                    if (!btn) return;
                    if (state.canvasState.maskMode === mode) {
                        btn.classList.remove("bg-gray-700");
                        btn.classList.add("bg-purple-600", "ring-2", "ring-purple-400");
                    } else {
                        btn.classList.remove("bg-purple-600", "ring-2", "ring-purple-400");
                        btn.classList.add("bg-gray-700");
                    }
                });
            };`;

const newLocalUpdateMaskButtons = `            const updateMaskModeButtons = () => {
                if (typeof window.updateMaskModeButtons === 'function') window.updateMaskModeButtons();
            };`;

res = safeReplace(content, oldLocalUpdateMaskButtons, newLocalUpdateMaskButtons);
if (!res.success) {
    console.error('oldLocalUpdateMaskButtons not found!');
    process.exit(1);
}
content = res.content;

// 4. Export syncSelectedMaskProperties to window after its definition
const syncSelectedPropsEnd = `            if (propH) propH.value = toUnit(mask.h);
        };`;

const syncSelectedPropsEndReplacement = `            if (propH) propH.value = toUnit(mask.h);
        };
        window.syncSelectedMaskProperties = syncSelectedMaskProperties;
        window.syncMaskPropertiesToUI = syncSelectedMaskProperties;`;

res = safeReplace(content, syncSelectedPropsEnd, syncSelectedPropsEndReplacement);
if (!res.success) {
    console.error('syncSelectedPropsEnd not found!');
    process.exit(1);
}
content = res.content;

// 5. Replace handleCanvasMouseMove mask hover cursor, mask dragging, and mask resizing
const oldMouseMoveBlock = `            if (!state.canvasState.maskDragging && !state.canvasState.maskResizing) {
                wrapper.classList.toggle('mask-hover', !!hitTestMask(activeCanvas.masks || [], worldX, worldY));
            }
            if (!state.canvasState.isPanning && !state.canvasState.draggingMapId && !state.canvasState.maskMode && !drawCfg.enabled && !drawCfg.selectEnabled) {
                const tol = Math.max(2, 6 / (zoom || 1));
                const hoveringMap = (activeCanvas.maps || []).some(m => {
                    const vr = getVisibleRectForMap(m);
                    return vr && vr.width > 0 && vr.height > 0 &&
                        worldX >= vr.left - tol && worldX <= vr.right + tol &&
                        worldY >= vr.top - tol && worldY <= vr.bottom + tol;
                });
                wrapper.style.cursor = hoveringMap ? 'move' : 'default';
            }

            // ====== MASK MOUSEMOVE ======
            if (state.canvasState.maskDrawing && state.canvasState.maskPreview && state.canvasState.maskStart) {
                // Dragging to create rect/ellipse
                const s = state.canvasState.maskStart;
                let x = Math.min(s.x, worldX), y = Math.min(s.y, worldY);
                let w = Math.abs(worldX - s.x), h = Math.abs(worldY - s.y);
                if (e.shiftKey) { const sz = Math.max(w, h); w = sz; h = sz; } // hold shift for square/circle
                state.canvasState.maskPreview.x = x;
                state.canvasState.maskPreview.y = y;
                state.canvasState.maskPreview.w = w;
                state.canvasState.maskPreview.h = h;
                drawMainCanvas();
                return;
            }
            if (state.canvasState.maskDragging && state.canvasState.selectedMaskId) {
                const ac = getActiveCanvas();
                const mask = ac?.masks?.find(m => String(m.id) === String(state.canvasState.selectedMaskId));
                if (mask) {
                    const off = state.canvasState.maskDragOffset;
                    if (mask.type === "polygon" && off?.origPoints) {
                        const grid = getMaskTileGrid(ac, mask);
                        const originalXs = off.origPoints.map(pt => pt.x), originalYs = off.origPoints.map(pt => pt.y);
                        const rawX = Math.min(...originalXs) + (worldX - off.x);
                        const rawY = Math.min(...originalYs) + (worldY - off.y);
                        const snappedX = Number(grid.map?.x || 0) + Math.round((rawX - Number(grid.map?.x || 0)) / grid.x) * grid.x;
                        const snappedY = Number(grid.map?.y || 0) + Math.round((rawY - Number(grid.map?.y || 0)) / grid.y) * grid.y;
                        const dx = snappedX - Math.min(...originalXs);
                        const dy = snappedY - Math.min(...originalYs);
                        off.origPoints.forEach((pt, i) => { mask.points[i].x = pt.x + dx; mask.points[i].y = pt.y + dy; });
                        // Also update bounding x/y (recompute)
                        const xs = mask.points.map(p => p.x), ys = mask.points.map(p => p.y);
                        mask.x = Math.min(...xs); mask.y = Math.min(...ys);
                        mask.w = Math.max(...xs) - mask.x; mask.h = Math.max(...ys) - mask.y;
                    } else {
                        const grid = getMaskTileGrid(ac, mask);
                        const rawX = worldX - off.x;
                        const rawY = worldY - off.y;
                        mask.x = Number(grid.map?.x || 0) + Math.round((rawX - Number(grid.map?.x || 0)) / grid.x) * grid.x;
                        mask.y = Number(grid.map?.y || 0) + Math.round((rawY - Number(grid.map?.y || 0)) / grid.y) * grid.y;
                    }
                    drawMainCanvas();
                }
                return;
            }
            if (state.canvasState.maskResizing && state.canvasState.selectedMaskId) {
                const ac = getActiveCanvas();
                const mask = ac?.masks?.find(m => String(m.id) === String(state.canvasState.selectedMaskId));
                if (mask && state.canvasState.maskStart) {
                    const s = state.canvasState.maskStart;
                    const handle = state.canvasState.maskResizeHandle;
                    // Polygon vertex drag (handle = "v0", "v1", etc.)
                    if (typeof handle === "string" && handle.startsWith("v") && mask.type === "polygon" && mask.points) {
                        const vi = parseInt(handle.slice(1), 10);
                        if (vi >= 0 && vi < mask.points.length) {
                            const grid = getMaskTileGrid(ac, mask);
                            const originX = Number(grid.map?.x || 0);
                            const originY = Number(grid.map?.y || 0);
                            mask.points[vi].x = e.shiftKey ? worldX : originX + Math.round((worldX - originX) / grid.x) * grid.x;
                            mask.points[vi].y = e.shiftKey ? worldY : originY + Math.round((worldY - originY) / grid.y) * grid.y;
                            // Recompute bounding box
                            const xs = mask.points.map(p => p.x), ys = mask.points.map(p => p.y);
                            mask.x = Math.min(...xs); mask.y = Math.min(...ys);
                            mask.w = Math.max(...xs) - mask.x; mask.h = Math.max(...ys) - mask.y;
                        }
                        drawMainCanvas();
                        return;
                    }
                    let nx = s.origX, ny = s.origY, nw = s.origW, nh = s.origH;
                    if (handle.includes("w")) { nx = worldX; nw = s.origX + s.origW - worldX; }
                    if (handle.includes("e")) { nw = worldX - s.origX; }
                    if (handle.includes("n")) { ny = worldY; nh = s.origY + s.origH - worldY; }
                    if (handle.includes("s")) { nh = worldY - s.origY; }
                    // Proportional resize: hold Shift to keep aspect ratio
                    if (e.shiftKey && s.origW > 0 && s.origH > 0) {
                        const aspect = s.origW / s.origH;
                        if (handle === "n" || handle === "s") { nw = nh * aspect; }
                        else if (handle === "w" || handle === "e") { nh = nw / aspect; }
                        else { // corner handles
                            const newAspect = nw / (nh || 1);
                            if (newAspect > aspect) { nw = nh * aspect; }
                            else { nh = nw / aspect; }
                        }
                        // Re-anchor for w/n handles
                        if (handle.includes("w")) { nx = s.origX + s.origW - nw; }
                        if (handle.includes("n")) { ny = s.origY + s.origH - nh; }
                    }
                    // Normalize negative sizes
                    if (nw < 0) { nx += nw; nw = -nw; }
                    if (nh < 0) { ny += nh; nh = -nh; }
                    const grid = getMaskTileGrid(ac, mask);
                    const originX = Number(grid.map?.x || 0);
                    const originY = Number(grid.map?.y || 0);
                    const right = nx + nw;
                    const bottom = ny + nh;
                    const snappedLeft = handle.includes("w") ? originX + Math.round((nx - originX) / grid.x) * grid.x : nx;
                    const snappedRight = handle.includes("e") ? originX + Math.round((right - originX) / grid.x) * grid.x : right;
                    const snappedTop = handle.includes("n") ? originY + Math.round((ny - originY) / grid.y) * grid.y : ny;
                    const snappedBottom = handle.includes("s") ? originY + Math.round((bottom - originY) / grid.y) * grid.y : bottom;
                    mask.x = snappedLeft;
                    mask.y = snappedTop;
                    mask.w = Math.max(grid.x, snappedRight - snappedLeft);
                    mask.h = Math.max(grid.y, snappedBottom - snappedTop);
                    drawMainCanvas();
                }
                return;
            }
            // ====== END MASK MOUSEMOVE ======`;

const newMouseMoveBlock = `            // Dynamic cursor feedback for masks and resize handles
            const getMaskHandleCursor = (handle) => {
                if (!handle) return 'default';
                if (handle === 'nw' || handle === 'se') return 'nwse-resize';
                if (handle === 'ne' || handle === 'sw') return 'nesw-resize';
                if (handle === 'n' || handle === 's') return 'ns-resize';
                if (handle === 'e' || handle === 'w') return 'ew-resize';
                if (typeof handle === 'string' && handle.startsWith('v')) return 'pointer';
                return 'move';
            };

            if (state.canvasState.maskMode) {
                wrapper.style.cursor = 'crosshair';
            } else if (state.canvasState.maskDragging) {
                wrapper.style.cursor = 'move';
            } else if (state.canvasState.maskResizing) {
                wrapper.style.cursor = getMaskHandleCursor(state.canvasState.maskResizeHandle);
            } else if (!state.canvasState.isPanning && !state.canvasState.draggingMapId && !drawCfg.enabled && !drawCfg.selectEnabled) {
                const selMask = state.canvasState.selectedMaskId ? (activeCanvas.masks || []).find(m => String(m.id) === String(state.canvasState.selectedMaskId)) : null;
                const handleHit = selMask && !selMask.locked ? hitTestMaskHandle(selMask, worldX, worldY, Math.max(14, 18 / (zoom || 1))) : null;
                if (handleHit) {
                    wrapper.style.cursor = getMaskHandleCursor(handleHit);
                } else if (hitTestMask(activeCanvas.masks || [], worldX, worldY)) {
                    wrapper.style.cursor = 'move';
                } else {
                    const tol = Math.max(2, 6 / (zoom || 1));
                    const hoveringMap = (activeCanvas.maps || []).some(m => {
                        const vr = getVisibleRectForMap(m);
                        return vr && vr.width > 0 && vr.height > 0 &&
                            worldX >= vr.left - tol && worldX <= vr.right + tol &&
                            worldY >= vr.top - tol && worldY <= vr.bottom + tol;
                    });
                    wrapper.style.cursor = hoveringMap ? 'move' : 'default';
                }
            }

            // ====== MASK MOUSEMOVE ======
            if (state.canvasState.maskDrawing && state.canvasState.maskPreview && state.canvasState.maskStart) {
                // Dragging to create rect/ellipse
                const s = state.canvasState.maskStart;
                let x = Math.min(s.x, worldX), y = Math.min(s.y, worldY);
                let w = Math.abs(worldX - s.x), h = Math.abs(worldY - s.y);
                if (e.shiftKey) { const sz = Math.max(w, h); w = sz; h = sz; } // hold shift for square/circle
                state.canvasState.maskPreview.x = Math.round(x);
                state.canvasState.maskPreview.y = Math.round(y);
                state.canvasState.maskPreview.w = Math.round(w);
                state.canvasState.maskPreview.h = Math.round(h);
                drawMainCanvas();
                return;
            }
            if (state.canvasState.maskDragging && state.canvasState.selectedMaskId) {
                const ac = getActiveCanvas();
                const mask = ac?.masks?.find(m => String(m.id) === String(state.canvasState.selectedMaskId));
                if (mask) {
                    const off = state.canvasState.maskDragOffset;
                    if (mask.type === "polygon" && off?.origPoints) {
                        const dx = Math.round(worldX - off.x);
                        const dy = Math.round(worldY - off.y);
                        off.origPoints.forEach((pt, i) => {
                            mask.points[i].x = Math.round(pt.x + dx);
                            mask.points[i].y = Math.round(pt.y + dy);
                        });
                        const xs = mask.points.map(p => p.x), ys = mask.points.map(p => p.y);
                        mask.x = Math.min(...xs); mask.y = Math.min(...ys);
                        mask.w = Math.max(...xs) - mask.x; mask.h = Math.max(...ys) - mask.y;
                    } else if (off) {
                        mask.x = Math.round(worldX - off.x);
                        mask.y = Math.round(worldY - off.y);
                    }
                    if (typeof syncSelectedMaskProperties === 'function') syncSelectedMaskProperties();
                    else if (typeof window.syncMaskPropertiesToUI === 'function') window.syncMaskPropertiesToUI();
                    drawMainCanvas();
                }
                return;
            }
            if (state.canvasState.maskResizing && state.canvasState.selectedMaskId) {
                const ac = getActiveCanvas();
                const mask = ac?.masks?.find(m => String(m.id) === String(state.canvasState.selectedMaskId));
                if (mask && state.canvasState.maskStart) {
                    const s = state.canvasState.maskStart;
                    const handle = state.canvasState.maskResizeHandle;
                    // Polygon vertex drag (handle = "v0", "v1", etc.)
                    if (typeof handle === "string" && handle.startsWith("v") && mask.type === "polygon" && mask.points) {
                        const vi = parseInt(handle.slice(1), 10);
                        if (vi >= 0 && vi < mask.points.length) {
                            mask.points[vi].x = Math.round(worldX);
                            mask.points[vi].y = Math.round(worldY);
                            // Recompute bounding box
                            const xs = mask.points.map(p => p.x), ys = mask.points.map(p => p.y);
                            mask.x = Math.min(...xs); mask.y = Math.min(...ys);
                            mask.w = Math.max(...xs) - mask.x; mask.h = Math.max(...ys) - mask.y;
                        }
                        if (typeof syncSelectedMaskProperties === 'function') syncSelectedMaskProperties();
                        else if (typeof window.syncMaskPropertiesToUI === 'function') window.syncMaskPropertiesToUI();
                        drawMainCanvas();
                        return;
                    }
                    let nx = s.origX, ny = s.origY, nw = s.origW, nh = s.origH;
                    if (handle.includes("w")) { nx = worldX; nw = s.origX + s.origW - worldX; }
                    if (handle.includes("e")) { nw = worldX - s.origX; }
                    if (handle.includes("n")) { ny = worldY; nh = s.origY + s.origH - worldY; }
                    if (handle.includes("s")) { nh = worldY - s.origY; }
                    // Proportional resize: hold Shift to keep aspect ratio
                    if (e.shiftKey && s.origW > 0 && s.origH > 0) {
                        const aspect = s.origW / s.origH;
                        if (handle === "n" || handle === "s") { nw = nh * aspect; }
                        else if (handle === "w" || handle === "e") { nh = nw / aspect; }
                        else { // corner handles
                            const newAspect = nw / (nh || 1);
                            if (newAspect > aspect) { nw = nh * aspect; }
                            else { nh = nw / aspect; }
                        }
                        // Re-anchor for w/n handles
                        if (handle.includes("w")) { nx = s.origX + s.origW - nw; }
                        if (handle.includes("n")) { ny = s.origY + s.origH - nh; }
                    }
                    // Normalize negative sizes
                    if (nw < 0) { nx += nw; nw = -nw; }
                    if (nh < 0) { ny += nh; nh = -nh; }
                    mask.x = Math.round(nx);
                    mask.y = Math.round(ny);
                    mask.w = Math.max(2, Math.round(nw));
                    mask.h = Math.max(2, Math.round(nh));
                    if (typeof syncSelectedMaskProperties === 'function') syncSelectedMaskProperties();
                    else if (typeof window.syncMaskPropertiesToUI === 'function') window.syncMaskPropertiesToUI();
                    drawMainCanvas();
                }
                return;
            }
            // ====== END MASK MOUSEMOVE ======`;

res = safeReplace(content, oldMouseMoveBlock, newMouseMoveBlock);
if (!res.success) {
    console.error('oldMouseMoveBlock not found!');
    process.exit(1);
}
content = res.content;

// 6. Fix handleCanvasMouseUp to safely call updateMaskModeButtons and sync
const oldMouseUpMaskFinish = `                state.canvasState.maskDrawing = false;
                state.canvasState.maskPreview = null;
                state.canvasState.maskStart = null;
                state.canvasState.maskMode = null;
                updateMaskModeButtons();
                syncSelectedMaskProperties(); if (typeof updateMaskList === 'function') updateMaskList();
                drawMainCanvas();
                return;`;

const newMouseUpMaskFinish = `                state.canvasState.maskDrawing = false;
                state.canvasState.maskPreview = null;
                state.canvasState.maskStart = null;
                state.canvasState.maskMode = null;
                if (typeof updateMaskModeButtons === 'function') updateMaskModeButtons();
                else if (typeof window.updateMaskModeButtons === 'function') window.updateMaskModeButtons();
                if (typeof syncSelectedMaskProperties === 'function') syncSelectedMaskProperties();
                else if (typeof window.syncMaskPropertiesToUI === 'function') window.syncMaskPropertiesToUI();
                if (typeof updateMaskList === 'function') updateMaskList();
                drawMainCanvas();
                return;`;

res = safeReplace(content, oldMouseUpMaskFinish, newMouseUpMaskFinish);
if (!res.success) {
    console.error('oldMouseUpMaskFinish not found!');
    process.exit(1);
}
content = res.content;

fs.writeFileSync('index.html', content, 'utf8');
console.log('Successfully applied mask fix v2 to index.html!');

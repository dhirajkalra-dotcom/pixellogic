const fs = require('fs');

let content = fs.readFileSync('index.html', 'utf8');

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

// 1. Add maskSnapToTiles: true in state.canvasState initialization
const oldCanvasStateProps = `                maskPxPerUnit: 1, // pixels per one unit (e.g. 3.78 px/mm at 96 DPI)
                maskSnapThreshold: 12, // px threshold for polygon vertex snapping`;

const newCanvasStateProps = `                maskPxPerUnit: 1, // pixels per one unit (e.g. 3.78 px/mm at 96 DPI)
                maskSnapThreshold: 12, // px threshold for polygon vertex snapping
                maskSnapToTiles: true, // whether masks snap to LED panel tiles when drawing, dragging, and resizing`;

let res = safeReplace(content, oldCanvasStateProps, newCanvasStateProps);
if (!res.success) {
    console.error('oldCanvasStateProps not found!');
    process.exit(1);
}
content = res.content;

// 2. Add Snap to Tiles checkbox in the toolbar HTML in renderCanvas
const oldAlignToolbar = `                                    <span class="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Align:</span>
                                    <button id="mask-snap-wall-btn" type="button" class="px-2.5 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-600 rounded-none transition-colors" title="Snap selected mask to match selected LED screen / wall position and size">⊞ Snap to Screen</button>`;

const newAlignToolbar = `                                    <span class="text-xs font-bold text-gray-400 uppercase tracking-wider shrink-0">Align:</span>
                                    <label class="flex items-center gap-1.5 text-xs text-purple-200 font-medium cursor-pointer select-none bg-purple-950/50 border border-purple-700/70 px-2.5 py-1" title="Snap masks directly to LED panel/cabinet grid lines when drawing, moving, and resizing (Hold Alt to bypass)">
                                        <input id="mask-snap-tile-toggle" type="checkbox" class="form-checkbox bg-gray-700 text-purple-500 rounded-none" \${state.canvasState.maskSnapToTiles !== false ? 'checked' : ''}>
                                        <span class="font-semibold">▦ Snap to Tiles</span>
                                    </label>
                                    <button id="mask-snap-wall-btn" type="button" class="px-2.5 py-1 text-xs font-medium bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-600 rounded-none transition-colors" title="Snap selected mask to match selected LED screen / wall position and size">⊞ Snap to Screen</button>`;

res = safeReplace(content, oldAlignToolbar, newAlignToolbar);
if (!res.success) {
    console.error('oldAlignToolbar not found!');
    process.exit(1);
}
content = res.content;

// 3. Wire up mask-snap-tile-toggle in renderCanvas
const oldSnapPanelWire = `            // Snap to Panels
            if (maskSnapPanelBtn) maskSnapPanelBtn.addEventListener("click", () => {`;

const newSnapPanelWire = `            const maskSnapTileToggle = document.getElementById("mask-snap-tile-toggle");
            if (maskSnapTileToggle) {
                maskSnapTileToggle.addEventListener("change", (e) => {
                    state.canvasState.maskSnapToTiles = !!e.target.checked;
                    saveState();
                    showNotification(state.canvasState.maskSnapToTiles ? "Tile snapping enabled: Masks snap to LED panel grid." : "Tile snapping disabled: Free-pixel masking enabled.");
                });
            }

            // Snap to Panels
            if (maskSnapPanelBtn) maskSnapPanelBtn.addEventListener("click", () => {`;

res = safeReplace(content, oldSnapPanelWire, newSnapPanelWire);
if (!res.success) {
    console.error('oldSnapPanelWire not found!');
    process.exit(1);
}
content = res.content;

// 4. Update getMaskTileGrid and define getCanvasTileGridAt helper
const oldGetMaskTileGrid = `        const getMaskTileGrid = (activeCanvas, mask) => {
            const centerX = Number(mask?.x || 0) + Number(mask?.w || 0) / 2;
            const centerY = Number(mask?.y || 0) + Number(mask?.h || 0) / 2;
            const map = (activeCanvas?.maps || []).find(m => centerX >= Number(m.x || 0) && centerX <= Number(m.x || 0) + Number(m.width || 0) && centerY >= Number(m.y || 0) && centerY <= Number(m.y || 0) + Number(m.height || 0));
            return {
                map,
                x: Math.max(1, Number(map?.panelResWidth) || 128),
                y: Math.max(1, Number(map?.panelResHeight) || 128)
            };
        };`;

const newGetMaskTileGrid = `        const getCanvasTileGridAt = (activeCanvas, worldX, worldY) => {
            const maps = activeCanvas?.maps || [];
            let map = maps.find(m => worldX >= Number(m.x || 0) && worldX <= Number(m.x || 0) + Number(m.width || 0) &&
                                     worldY >= Number(m.y || 0) && worldY <= Number(m.y || 0) + Number(m.height || 0));
            if (!map && maps.length > 0) {
                let minDist = Infinity;
                maps.forEach(m => {
                    const cx = Number(m.x || 0) + Number(m.width || 0) / 2;
                    const cy = Number(m.y || 0) + Number(m.height || 0) / 2;
                    const dist = Math.hypot(worldX - cx, worldY - cy);
                    if (dist < minDist) {
                        minDist = dist;
                        map = m;
                    }
                });
            }
            const originX = Number(map?.x || 0);
            const originY = Number(map?.y || 0);
            const panelW = Math.max(1, Number(map?.panelResWidth) || 128);
            const panelH = Math.max(1, Number(map?.panelResHeight) || 128);
            return {
                map,
                originX,
                originY,
                panelW,
                panelH,
                snapX: (x) => originX + Math.round((x - originX) / panelW) * panelW,
                snapY: (y) => originY + Math.round((y - originY) / panelH) * panelH
            };
        };

        const getMaskTileGrid = (activeCanvas, mask) => {
            const centerX = Number(mask?.x || 0) + Number(mask?.w || 0) / 2;
            const centerY = Number(mask?.y || 0) + Number(mask?.h || 0) / 2;
            const grid = getCanvasTileGridAt(activeCanvas, centerX, centerY);
            return {
                map: grid.map,
                x: grid.panelW,
                y: grid.panelH
            };
        };`;

res = safeReplace(content, oldGetMaskTileGrid, newGetMaskTileGrid);
if (!res.success) {
    console.error('oldGetMaskTileGrid not found!');
    process.exit(1);
}
content = res.content;

// 5. Update handleCanvasMouseDown mask creation for tile-accurate start point
const oldMouseDownMaskCreation = `            // ====== MASK CREATION MODES (rect, ellipse, polygon) ======
            if (state.canvasState.maskMode === "rect" || state.canvasState.maskMode === "ellipse") {
                state.canvasState.maskDrawing = true;
                state.canvasState.maskStart = { x: worldX, y: worldY };
                state.canvasState.maskPreview = { id: Date.now(), type: state.canvasState.maskMode, x: worldX, y: worldY, w: 0, h: 0,
                    color: document.getElementById("mask-fill-color")?.value || "#000000",
                    opacity: parseInt(document.getElementById("mask-fill-opacity")?.value || "100", 10) };
                return;
            } else if (state.canvasState.maskMode === "polygon") {
                const pts = state.canvasState.maskPolygonPoints;
                const snapThreshold = (state.canvasState.maskSnapThreshold || 12) / (state.canvasState.zoom || 1);
                // If we have 3+ points and click near the first point, close the polygon
                if (pts.length >= 3) {
                    const dx = worldX - pts[0].x, dy = worldY - pts[0].y;
                    if (Math.sqrt(dx*dx + dy*dy) <= snapThreshold) {
                        const ac = getActiveCanvas();
                        ac.masks = ac.masks || [];
                        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
                        const count = ac.masks.length + 1;
                        ac.masks.push({
                            id: Date.now(),
                            name: "Polygon " + count,
                            type: "polygon",
                            mode: document.getElementById("mask-prop-mode")?.value || "blackout",
                            points: JSON.parse(JSON.stringify(pts)),
                            x: Math.min(...xs), y: Math.min(...ys),
                            w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
                            feather: parseInt(document.getElementById("mask-prop-feather")?.value, 10) || 0,
                            visible: true,
                            locked: false,
                            color: document.getElementById("mask-fill-color")?.value || "#000000",
                            opacity: parseInt(document.getElementById("mask-fill-opacity")?.value || "100", 10)
                        });
                        state.canvasState.selectedMaskId = ac.masks[ac.masks.length - 1]?.id;
                        state.canvasState.maskPolygonPoints = [];
                        state.canvasState.maskMode = null;
                        updateMaskModeButtons();
                        if (typeof syncSelectedMaskProperties === 'function') syncSelectedMaskProperties();
                        saveState();
                        updateMaskList();
                        drawMainCanvas();
                        return;
                    }
                }
                // Otherwise, add point
                pts.push({ x: worldX, y: worldY });
                drawMainCanvas();
                return;
            }`;

const newMouseDownMaskCreation = `            // ====== MASK CREATION MODES (rect, ellipse, polygon) ======
            if (state.canvasState.maskMode === "rect" || state.canvasState.maskMode === "ellipse") {
                const wantTileSnap = state.canvasState.maskSnapToTiles !== false && !e.altKey;
                const grid = getCanvasTileGridAt(activeCanvas, worldX, worldY);
                const startX = wantTileSnap ? grid.snapX(worldX) : Math.round(worldX);
                const startY = wantTileSnap ? grid.snapY(worldY) : Math.round(worldY);
                state.canvasState.maskDrawing = true;
                state.canvasState.maskStart = { x: startX, y: startY, rawStartX: worldX, rawStartY: worldY };
                state.canvasState.maskPreview = { id: Date.now(), type: state.canvasState.maskMode, x: startX, y: startY, w: 0, h: 0,
                    color: document.getElementById("mask-fill-color")?.value || "#000000",
                    opacity: parseInt(document.getElementById("mask-fill-opacity")?.value || "100", 10) };
                return;
            } else if (state.canvasState.maskMode === "polygon") {
                const pts = state.canvasState.maskPolygonPoints;
                const snapThreshold = (state.canvasState.maskSnapThreshold || 12) / (state.canvasState.zoom || 1);
                const wantTileSnap = state.canvasState.maskSnapToTiles !== false && !e.altKey;
                const grid = getCanvasTileGridAt(activeCanvas, worldX, worldY);
                const ptX = wantTileSnap ? grid.snapX(worldX) : Math.round(worldX);
                const ptY = wantTileSnap ? grid.snapY(worldY) : Math.round(worldY);
                // If we have 3+ points and click near the first point, close the polygon
                if (pts.length >= 3) {
                    const dx = worldX - pts[0].x, dy = worldY - pts[0].y;
                    if (Math.sqrt(dx*dx + dy*dy) <= snapThreshold) {
                        const ac = getActiveCanvas();
                        ac.masks = ac.masks || [];
                        const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
                        const count = ac.masks.length + 1;
                        ac.masks.push({
                            id: Date.now(),
                            name: "Polygon " + count,
                            type: "polygon",
                            mode: document.getElementById("mask-prop-mode")?.value || "blackout",
                            points: JSON.parse(JSON.stringify(pts)),
                            x: Math.min(...xs), y: Math.min(...ys),
                            w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys),
                            feather: parseInt(document.getElementById("mask-prop-feather")?.value, 10) || 0,
                            visible: true,
                            locked: false,
                            color: document.getElementById("mask-fill-color")?.value || "#000000",
                            opacity: parseInt(document.getElementById("mask-fill-opacity")?.value || "100", 10)
                        });
                        state.canvasState.selectedMaskId = ac.masks[ac.masks.length - 1]?.id;
                        state.canvasState.maskPolygonPoints = [];
                        state.canvasState.maskMode = null;
                        updateMaskModeButtons();
                        if (typeof syncSelectedMaskProperties === 'function') syncSelectedMaskProperties();
                        saveState();
                        updateMaskList();
                        drawMainCanvas();
                        return;
                    }
                }
                // Otherwise, add point (snapped to panel tile corner if enabled)
                pts.push({ x: ptX, y: ptY });
                drawMainCanvas();
                return;
            }`;

res = safeReplace(content, oldMouseDownMaskCreation, newMouseDownMaskCreation);
if (!res.success) {
    console.error('oldMouseDownMaskCreation not found!');
    process.exit(1);
}
content = res.content;

// 6. Update handleCanvasMouseMove for tile-accurate drawing, dragging, and resizing
const oldMouseMoveMaskSection = `            // ====== MASK MOUSEMOVE ======
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
            }`;

const newMouseMoveMaskSection = `            // ====== MASK MOUSEMOVE ======
            if (state.canvasState.maskDrawing && state.canvasState.maskPreview && state.canvasState.maskStart) {
                // Dragging to create rect/ellipse
                const s = state.canvasState.maskStart;
                const wantTileSnap = state.canvasState.maskSnapToTiles !== false && !e.altKey;
                const grid = getCanvasTileGridAt(activeCanvas, worldX, worldY);

                let targetX = worldX, targetY = worldY;
                if (wantTileSnap) {
                    const dx = worldX - (s.rawStartX != null ? s.rawStartX : s.x);
                    if (Math.abs(dx) > 4) {
                        const colSnapped = grid.snapX(worldX);
                        if (colSnapped === s.x) {
                            targetX = dx > 0 ? s.x + grid.panelW : s.x - grid.panelW;
                        } else {
                            targetX = colSnapped;
                        }
                    } else {
                        targetX = s.x;
                    }

                    const dy = worldY - (s.rawStartY != null ? s.rawStartY : s.y);
                    if (Math.abs(dy) > 4) {
                        const rowSnapped = grid.snapY(worldY);
                        if (rowSnapped === s.y) {
                            targetY = dy > 0 ? s.y + grid.panelH : s.y - grid.panelH;
                        } else {
                            targetY = rowSnapped;
                        }
                    } else {
                        targetY = s.y;
                    }
                }

                let x = Math.min(s.x, targetX);
                let y = Math.min(s.y, targetY);
                let w = Math.abs(targetX - s.x);
                let h = Math.abs(targetY - s.y);

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
                    const wantTileSnap = state.canvasState.maskSnapToTiles !== false && !e.altKey;

                    if (mask.type === "polygon" && off?.origPoints) {
                        const grid = getCanvasTileGridAt(ac, worldX, worldY);
                        let dx = Math.round(worldX - off.x);
                        let dy = Math.round(worldY - off.y);
                        if (wantTileSnap) {
                            const originalMinX = Math.min(...off.origPoints.map(p => p.x));
                            const originalMinY = Math.min(...off.origPoints.map(p => p.y));
                            const rawTargetX = originalMinX + dx;
                            const rawTargetY = originalMinY + dy;
                            const snappedTargetX = grid.snapX(rawTargetX);
                            const snappedTargetY = grid.snapY(rawTargetY);
                            dx = snappedTargetX - originalMinX;
                            dy = snappedTargetY - originalMinY;
                        }
                        off.origPoints.forEach((pt, i) => {
                            mask.points[i].x = Math.round(pt.x + dx);
                            mask.points[i].y = Math.round(pt.y + dy);
                        });
                        const xs = mask.points.map(p => p.x), ys = mask.points.map(p => p.y);
                        mask.x = Math.min(...xs); mask.y = Math.min(...ys);
                        mask.w = Math.max(...xs) - mask.x; mask.h = Math.max(...ys) - mask.y;
                    } else if (off) {
                        const rawX = worldX - off.x;
                        const rawY = worldY - off.y;
                        if (wantTileSnap) {
                            const grid = getCanvasTileGridAt(ac, rawX, rawY);
                            mask.x = grid.snapX(rawX);
                            mask.y = grid.snapY(rawY);
                        } else {
                            mask.x = Math.round(rawX);
                            mask.y = Math.round(rawY);
                        }
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
                    const wantTileSnap = state.canvasState.maskSnapToTiles !== false && !e.altKey;
                    const grid = getCanvasTileGridAt(ac, worldX, worldY);

                    // Polygon vertex drag (handle = "v0", "v1", etc.)
                    if (typeof handle === "string" && handle.startsWith("v") && mask.type === "polygon" && mask.points) {
                        const vi = parseInt(handle.slice(1), 10);
                        if (vi >= 0 && vi < mask.points.length) {
                            mask.points[vi].x = wantTileSnap ? grid.snapX(worldX) : Math.round(worldX);
                            mask.points[vi].y = wantTileSnap ? grid.snapY(worldY) : Math.round(worldY);
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

                    let targetX = wantTileSnap ? grid.snapX(worldX) : worldX;
                    let targetY = wantTileSnap ? grid.snapY(worldY) : worldY;
                    let nx = s.origX, ny = s.origY, nw = s.origW, nh = s.origH;

                    if (handle.includes("w")) { nx = targetX; nw = s.origX + s.origW - targetX; }
                    if (handle.includes("e")) { nw = targetX - s.origX; }
                    if (handle.includes("n")) { ny = targetY; nh = s.origY + s.origH - targetY; }
                    if (handle.includes("s")) { nh = targetY - s.origY; }

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

                    const minSize = wantTileSnap ? Math.min(grid.panelW, grid.panelH) : 2;
                    mask.x = Math.round(nx);
                    mask.y = Math.round(ny);
                    mask.w = Math.max(minSize, Math.round(nw));
                    mask.h = Math.max(minSize, Math.round(nh));

                    if (typeof syncSelectedMaskProperties === 'function') syncSelectedMaskProperties();
                    else if (typeof window.syncMaskPropertiesToUI === 'function') window.syncMaskPropertiesToUI();
                    drawMainCanvas();
                }
                return;
            }`;

res = safeReplace(content, oldMouseMoveMaskSection, newMouseMoveMaskSection);
if (!res.success) {
    console.error('oldMouseMoveMaskSection not found!');
    process.exit(1);
}
content = res.content;

// 7. Update dimension labels to show panel counts (e.g. "4×3 Panels")
const oldDimensionLabelW = `                    const tag = mask.name ? mask.name + " · " : "";
                    const modeTag = mask.mode === 'guide' ? " [GUIDE]" : mask.mode === 'cutout' ? " [CUTOUT]" : "";
                    const wLabel = tag + toUnit(mask.w) + " " + unit + modeTag;`;

const newDimensionLabelW = `                    const tag = mask.name ? mask.name + " · " : "";
                    const modeTag = mask.mode === 'guide' ? " [GUIDE]" : mask.mode === 'cutout' ? " [CUTOUT]" : "";
                    let panelCountTag = "";
                    if (typeof getCanvasTileGridAt === 'function' && mask.type === 'rect') {
                        const grid = getCanvasTileGridAt(activeCanvas, mask.x + mask.w/2, mask.y + mask.h/2);
                        if (grid && grid.panelW && grid.panelH) {
                            const pw = +(mask.w / grid.panelW).toFixed(1);
                            const ph = +(mask.h / grid.panelH).toFixed(1);
                            if (pw > 0 && ph > 0) panelCountTag = " (" + pw + "×" + ph + " Panels)";
                        }
                    }
                    const wLabel = tag + toUnit(mask.w) + " " + unit + panelCountTag + modeTag;`;

res = safeReplace(content, oldDimensionLabelW, newDimensionLabelW);
if (!res.success) {
    console.error('oldDimensionLabelW not found!');
    process.exit(1);
}
content = res.content;

fs.writeFileSync('index.html', content, 'utf8');
console.log('Successfully applied tile snap upgrade to index.html!');

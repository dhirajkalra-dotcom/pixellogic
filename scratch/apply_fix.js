const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'index.html');
let content = fs.readFileSync(filePath, 'utf8');

const isCRLF = content.includes('\r\n');
let s = content.replace(/\r\n/g, '\n');

// Helper to replace text between startAnchor and endAnchor inclusive
function replaceBetween(str, startAnchor, endAnchor, newBlock) {
    const startIdx = str.indexOf(startAnchor);
    if (startIdx === -1) throw new Error('Start anchor not found: ' + startAnchor);
    const endIdx = str.indexOf(endAnchor, startIdx);
    if (endIdx === -1) throw new Error('End anchor not found: ' + endAnchor);
    const fullEndIdx = endIdx + endAnchor.length;
    return str.slice(0, startIdx) + newBlock + str.slice(fullEndIdx);
}

// Helper to replace exact unique string
function replaceExact(str, target, replacement, label) {
    const idx = str.indexOf(target);
    if (idx === -1) throw new Error('Target not found for ' + label);
    if (str.indexOf(target, idx + 1) !== -1) throw new Error('Target not unique for ' + label);
    return str.replace(target, replacement);
}

// 1. Polygon dblclick close
s = replaceExact(
    s,
    `                    state.canvasState.selectedMaskId = ac.masks[ac.masks.length - 1]?.id;\n                    saveState();\n                    updateMaskList();\n                }\n                state.canvasState.maskPolygonPoints = [];\n                drawMainCanvas();\n            });`,
    `                    state.canvasState.selectedMaskId = ac.masks[ac.masks.length - 1]?.id;\n                    saveState();\n                    updateMaskList();\n                }\n                state.canvasState.maskPolygonPoints = [];\n                state.canvasState.maskMode = null;\n                updateMaskModeButtons();\n                drawMainCanvas();\n            });`,
    'Polygon dblclick close'
);

// 2. maskDeleteBtn and maskClearAllBtn
s = replaceExact(
    s,
    `            if (maskDeleteBtn) maskDeleteBtn.addEventListener("click", () => {\n                const ac = getActiveCanvas();\n                if (!ac || !ac.masks) return;\n                const idx = ac.masks.findIndex(m => String(m.id) === String(state.canvasState.selectedMaskId));\n                if (idx >= 0) {\n                    ac.masks.splice(idx, 1);\n                    state.canvasState.selectedMaskId = null;\n                    syncMaskPropertiesToUI();\n                    updateMaskList();\n                    drawMainCanvas();\n                    saveState();\n                }\n            });\n\n            if (maskClearAllBtn) maskClearAllBtn.addEventListener("click", () => {\n                const ac = getActiveCanvas();\n                if (!ac || !ac.masks || ac.masks.length === 0) return;\n                if (!confirm("Are you sure you want to remove all masks from this canvas?")) return;\n                ac.masks = [];\n                state.canvasState.selectedMaskId = null;\n                syncMaskPropertiesToUI();\n                updateMaskList();\n                drawMainCanvas();\n                saveState();\n                showNotification("All masks cleared.");\n            });`,
    `            if (maskDeleteBtn) maskDeleteBtn.addEventListener("click", () => {\n                const ac = getActiveCanvas();\n                if (!ac || !ac.masks) return;\n                const idx = ac.masks.findIndex(m => String(m.id) === String(state.canvasState.selectedMaskId));\n                if (idx >= 0) {\n                    ac.masks.splice(idx, 1);\n                    state.canvasState.selectedMaskId = null;\n                    state.canvasState.maskMode = null;\n                    state.canvasState.maskDrawing = false;\n                    state.canvasState.maskPreview = null;\n                    state.canvasState.maskStart = null;\n                    state.canvasState.maskDragging = false;\n                    state.canvasState.maskResizing = false;\n                    updateMaskModeButtons();\n                    syncMaskPropertiesToUI();\n                    updateMaskList();\n                    drawMainCanvas();\n                    saveState();\n                }\n            });\n\n            if (maskClearAllBtn) maskClearAllBtn.addEventListener("click", () => {\n                const ac = getActiveCanvas();\n                if (!ac || !ac.masks || ac.masks.length === 0) return;\n                if (!confirm("Are you sure you want to remove all masks from this canvas?")) return;\n                ac.masks = [];\n                state.canvasState.selectedMaskId = null;\n                state.canvasState.maskMode = null;\n                state.canvasState.maskDrawing = false;\n                state.canvasState.maskPreview = null;\n                state.canvasState.maskStart = null;\n                state.canvasState.maskDragging = false;\n                state.canvasState.maskResizing = false;\n                updateMaskModeButtons();\n                syncMaskPropertiesToUI();\n                updateMaskList();\n                drawMainCanvas();\n                saveState();\n                showNotification("All masks cleared.");\n            });`,
    'maskDeleteBtn & maskClearAllBtn'
);

// 3. Layer item click
s = replaceExact(
    s,
    `                    const maskId = item.dataset.maskId;\n                    if (maskId) {\n                        state.canvasState.selectedMaskId = maskId;\n                        state.canvasState.maskMode = "select";\n                        syncSelectedMaskProperties();\n                        updateMaskList();\n                        drawMainCanvas();\n                    }`,
    `                    const maskId = item.dataset.maskId;\n                    if (maskId) {\n                        state.canvasState.selectedMaskId = maskId;\n                        state.canvasState.maskMode = null;\n                        updateMaskModeButtons();\n                        syncSelectedMaskProperties();\n                        updateMaskList();\n                        drawMainCanvas();\n                    }`,
    'Layer item click'
);

// 4. Layer item delete button
s = replaceExact(
    s,
    `                        masks.splice(idx, 1);\n                        if (String(state.canvasState.selectedMaskId) === String(delId)) {\n                            state.canvasState.selectedMaskId = null;\n                        }\n                        syncSelectedMaskProperties();`,
    `                        masks.splice(idx, 1);\n                        if (String(state.canvasState.selectedMaskId) === String(delId)) {\n                            state.canvasState.selectedMaskId = null;\n                            state.canvasState.maskMode = null;\n                            state.canvasState.maskDrawing = false;\n                            state.canvasState.maskPreview = null;\n                            state.canvasState.maskStart = null;\n                            state.canvasState.maskDragging = false;\n                            state.canvasState.maskResizing = false;\n                            updateMaskModeButtons();\n                        }\n                        syncSelectedMaskProperties();`,
    'Layer item delete button'
);

// 5. handleCanvasMouseDown
const newMouseDown = `// Existing masks are always directly selectable; creation modes apply on empty canvas.
            const directMaskHit = hitTestMask(activeCanvas.masks || [], worldX, worldY);
            if (directMaskHit) {
                wrapper.classList.remove('grabbing');
                state.canvasState.maskMode = null;
                state.canvasState.maskDrawing = false;
                state.canvasState.maskPreview = null;
                state.canvasState.maskPolygonPoints = [];
                state.canvasState.selectedMaskId = directMaskHit.id;
                state.canvasState.maskDragging = false;
                state.canvasState.maskResizing = false;
                if (!directMaskHit.locked) {
                    const directHandle = hitTestMaskHandle(directMaskHit, worldX, worldY, Math.max(14, 18 / (zoom || 1)));
                    if (directHandle) {
                        state.canvasState.maskResizing = true;
                        state.canvasState.maskResizeHandle = directHandle;
                        state.canvasState.maskStart = { x: worldX, y: worldY, origX: directMaskHit.x, origY: directMaskHit.y, origW: directMaskHit.w, origH: directMaskHit.h };
                    } else {
                        state.canvasState.maskDragging = true;
                        state.canvasState.maskDragOffset = { x: worldX - directMaskHit.x, y: worldY - directMaskHit.y };
                        if (directMaskHit.type === "polygon" && directMaskHit.points?.length > 0) {
                            state.canvasState.maskDragOffset = { x: worldX, y: worldY, origPoints: JSON.parse(JSON.stringify(directMaskHit.points)) };
                        }
                    }
                }
                syncSelectedMaskProperties();
                updateMaskList();
                drawMainCanvas();
                return;
            }

            // Clicked outside any mask: if a mask was selected, deselect it and fall through to map hit-test
            if (state.canvasState.selectedMaskId != null) {
                state.canvasState.selectedMaskId = null;
                state.canvasState.maskDragging = false;
                state.canvasState.maskResizing = false;
                syncSelectedMaskProperties();
                if (typeof updateMaskList === 'function') updateMaskList();
                drawMainCanvas();
            }

            // ====== MASK CREATION MODES (rect, ellipse, polygon) ======
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
            }
            // ====== END MASK MOUSEDOWN ======`;

s = replaceBetween(
    s,
    '// Existing masks are always directly selectable; creation modes apply on empty canvas.',
    '// ====== END MASK MOUSEDOWN ======',
    newMouseDown
);
console.log('handleCanvasMouseDown replaced successfully!');

// 6. handleCanvasMouseMove
const newMouseMove = `// ====== MASK MOUSEMOVE ======
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

s = replaceBetween(
    s,
    '// ====== MASK MODE MOUSEMOVE INTERCEPT ======',
    '// ====== END MASK MOUSEMOVE ======',
    newMouseMove
);
console.log('handleCanvasMouseMove replaced successfully!');

// 7. handleCanvasMouseUp
const newMouseUp = `// ====== MASK MOUSEUP INTERCEPT ======
            if (state.canvasState.maskDrawing && state.canvasState.maskPreview) {
                // Commit rect/ellipse mask
                const preview = state.canvasState.maskPreview;
                if (preview.w > 2 && preview.h > 2) {
                    const ac = getActiveCanvas();
                    ac.masks = ac.masks || [];
                    const count = ac.masks.length + 1;
                    const typName = preview.type === "rect" ? "Rectangle" : preview.type === "ellipse" ? "Ellipse" : "Mask";
                    const modeVal = document.getElementById("mask-prop-mode")?.value || preview.mode || "blackout";
                    const radiusVal = preview.type === "rect" ? (parseInt(document.getElementById("mask-prop-radius")?.value, 10) || preview.radius || 0) : 0;
                    const featherVal = parseInt(document.getElementById("mask-prop-feather")?.value, 10) || preview.feather || 0;
                    ac.masks.push({
                        ...preview,
                        id: Date.now(),
                        name: preview.name || (typName + " " + count),
                        mode: modeVal,
                        radius: radiusVal,
                        feather: featherVal,
                        visible: true,
                        locked: false
                    });
                    state.canvasState.selectedMaskId = ac.masks[ac.masks.length - 1]?.id;
                    saveState();
                    updateMaskList();
                }
                state.canvasState.maskDrawing = false;
                state.canvasState.maskPreview = null;
                state.canvasState.maskStart = null;
                state.canvasState.maskMode = null;
                updateMaskModeButtons();
                syncSelectedMaskProperties(); if (typeof updateMaskList === 'function') updateMaskList();
                drawMainCanvas();
                return;
            }
            if (state.canvasState.maskDragging) {
                state.canvasState.maskDragging = false;
                state.canvasState.maskDragOffset = null;
                saveState();
                syncSelectedMaskProperties(); if (typeof updateMaskList === 'function') updateMaskList();
                drawMainCanvas();
                return;
            }
            if (state.canvasState.maskResizing) {
                state.canvasState.maskResizing = false;
                state.canvasState.maskResizeHandle = null;
                state.canvasState.maskStart = null;
                saveState();
                if (typeof syncMaskPropertiesToUI === 'function') syncMaskPropertiesToUI(); if (typeof updateMaskList === 'function') updateMaskList();
                drawMainCanvas();
                return;
            }
            // ====== END MASK MOUSEUP ======`;

s = replaceBetween(
    s,
    '// ====== MASK MODE MOUSEUP INTERCEPT ======',
    '// ====== END MASK MOUSEUP ======',
    newMouseUp
);
console.log('handleCanvasMouseUp replaced successfully!');

// 8. Keydown listener Delete / Escape
s = replaceExact(
    s,
    `                if ((e.key === 'Delete' || e.key === 'Backspace') && state.canvasState.selectedMaskId) {\n                    e.preventDefault();\n                    const ac = getActiveCanvas();\n                    if (ac && Array.isArray(ac.masks)) {\n                        const idx = ac.masks.findIndex(m => String(m.id) === String(state.canvasState.selectedMaskId));\n                        if (idx >= 0) {\n                            ac.masks.splice(idx, 1);\n                            state.canvasState.selectedMaskId = null;\n                            syncSelectedMaskProperties();\n                            if (typeof updateMaskList === 'function') updateMaskList();\n                            if (typeof drawMainCanvas === 'function') drawMainCanvas();\n                            if (typeof saveState === 'function') saveState();\n                            const delBtn = document.getElementById('mask-delete-btn');\n                            if (delBtn) delBtn.disabled = true;\n                        }\n                    }\n                    return;\n                }`,
    `                if (e.key === 'Escape' && (state.canvasState.maskMode || state.canvasState.maskDrawing || state.canvasState.selectedMaskId)) {\n                    state.canvasState.maskMode = null;\n                    state.canvasState.maskDrawing = false;\n                    state.canvasState.maskPreview = null;\n                    state.canvasState.maskPolygonPoints = [];\n                    state.canvasState.maskDragging = false;\n                    state.canvasState.maskResizing = false;\n                    state.canvasState.selectedMaskId = null;\n                    if (typeof updateMaskModeButtons === 'function') updateMaskModeButtons();\n                    syncSelectedMaskProperties();\n                    if (typeof updateMaskList === 'function') updateMaskList();\n                    if (typeof drawMainCanvas === 'function') drawMainCanvas();\n                    return;\n                }\n                if ((e.key === 'Delete' || e.key === 'Backspace') && state.canvasState.selectedMaskId) {\n                    e.preventDefault();\n                    const ac = getActiveCanvas();\n                    if (ac && Array.isArray(ac.masks)) {\n                        const idx = ac.masks.findIndex(m => String(m.id) === String(state.canvasState.selectedMaskId));\n                        if (idx >= 0) {\n                            ac.masks.splice(idx, 1);\n                            state.canvasState.selectedMaskId = null;\n                            state.canvasState.maskMode = null;\n                            state.canvasState.maskDrawing = false;\n                            state.canvasState.maskPreview = null;\n                            state.canvasState.maskStart = null;\n                            state.canvasState.maskDragging = false;\n                            state.canvasState.maskResizing = false;\n                            if (typeof updateMaskModeButtons === 'function') updateMaskModeButtons();\n                            syncSelectedMaskProperties();\n                            if (typeof updateMaskList === 'function') updateMaskList();\n                            if (typeof drawMainCanvas === 'function') drawMainCanvas();\n                            if (typeof saveState === 'function') saveState();\n                            const delBtn = document.getElementById('mask-delete-btn');\n                            if (delBtn) delBtn.disabled = true;\n                        }\n                    }\n                    return;\n                }`,
    'Keydown Delete & Escape'
);

if (isCRLF) {
    s = s.replace(/\n/g, '\r\n');
}

fs.writeFileSync(filePath, s, 'utf8');
console.log('ALL REPLACEMENTS APPLIED SUCCESSFULLY TO index.html!');

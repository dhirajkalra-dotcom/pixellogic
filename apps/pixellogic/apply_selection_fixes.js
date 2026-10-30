const fs = require('fs');
const ts = require('typescript');

const filePath = 'D:/pixellogic/index.html';
let content = fs.readFileSync(filePath, 'utf8');

function replaceBlock(startMarker, endMarker, replacement) {
    const startIdx = content.indexOf(startMarker);
    if (startIdx === -1) throw new Error('Cannot find startMarker: ' + startMarker.substring(0, 40));
    const endIdx = content.indexOf(endMarker, startIdx);
    if (endIdx === -1) throw new Error('Cannot find endMarker: ' + endMarker.substring(0, 40));
    content = content.substring(0, startIdx) + replacement + content.substring(endIdx);
}

// 1. Selection outline & coordinates overlay in drawMainCanvas
const start1 = '// Selection outline reflects visible bounds';
const end1 = '// Draw crop selection rectangle overlay';
const rep1 = '                }\r\n' +
'            });\r\n\r\n' +
'            // Draw coordinates overlay labels on top of all map images\r\n' +
'            activeCanvas.maps.forEach(map => {\r\n' +
'                try {\r\n' +
'                    const vr = getVisibleRectForMap(map);\r\n' +
'                    if (!vr || vr.width <= 0 || vr.height <= 0) return;\r\n' +
'                    const destX = vr.left, destY = vr.top, destW = vr.width, destH = vr.height;\r\n' +
'                    const baseFs = state.canvasState.coordFontSize || 12;\r\n' +
'                    const fs = Math.max(8, Math.round(baseFs / zoom));\r\n' +
'                    ctx.font = fs + "px Inter, Arial";\r\n' +
'                    const gaps = computeNearestGapsForMap(activeCanvas, map);\r\n' +
'                    const parts = ["X: " + Math.round(map.x), "Y: " + Math.round(map.y)];\r\n' +
'                    if (gaps && gaps.hGap != null && gaps.hGap > 0) parts.push("H: " + Math.round(gaps.hGap) + " px");\r\n' +
'                    if (gaps && gaps.vGap != null && gaps.vGap > 0) parts.push("V: " + Math.round(gaps.vGap) + " px");\r\n' +
'                    const label = parts.join("  ");\r\n' +
'                    const pad = 4 / zoom;\r\n' +
'                    const tw = ctx.measureText(label).width + pad * 2;\r\n' +
'                    const th = fs + pad * 2;\r\n' +
'                    const visLeft = destX, visTop = destY, visRight = destX + destW, visBottom = destY + destH;\r\n' +
'                    let lx = visLeft;\r\n' +
'                    let ly = visTop - th - 2 / zoom; // above\r\n' +
'                    if (ly < 0) {\r\n' +
'                        ly = visBottom + 2 / zoom; // below\r\n' +
'                        if (ly + th > canvas.height) {\r\n' +
'                            lx = visLeft - tw - 2 / zoom;\r\n' +
'                            ly = Math.max(0, visTop);\r\n' +
'                            if (lx < 0) {\r\n' +
'                                lx = visRight + 2 / zoom;\r\n' +
'                                ly = Math.max(0, visTop);\r\n' +
'                                if (lx + tw > canvas.width) {\r\n' +
'                                    lx = Math.max(0, canvas.width - tw - 2 / zoom);\r\n' +
'                                }\r\n' +
'                            }\r\n' +
'                        }\r\n' +
'                    }\r\n' +
'                    lx = Math.max(0, Math.min(lx, canvas.width - tw));\r\n' +
'                    ly = Math.max(0, Math.min(ly, canvas.height - th));\r\n' +
'                    ctx.fillStyle = "rgba(0,0,0,0.6)";\r\n' +
'                    ctx.fillRect(lx, ly, tw, th);\r\n' +
'                    ctx.fillStyle = "#ffffff";\r\n' +
'                    ctx.fillText(label, lx + pad, ly + fs + (pad - 2 / zoom));\r\n' +
'                } catch (_) {}\r\n' +
'            });\r\n\r\n' +
'            // Draw selection outlines and corner handles on top of all maps so active selection is never obscured\r\n' +
'            const selIds = Array.isArray(state.canvasState.selectedMapIds) ? state.canvasState.selectedMapIds : [];\r\n' +
'            const primarySelId = state.canvasState.selectedMapId;\r\n\r\n' +
'            activeCanvas.maps.forEach(map => {\r\n' +
'                const isPrimary = primarySelId != null && String(map.id) === String(primarySelId);\r\n' +
'                const isMulti = !isPrimary && selIds.some(id => String(id) === String(map.id));\r\n' +
'                if (!isPrimary && !isMulti) return;\r\n\r\n' +
'                const vr = getVisibleRectForMap(map);\r\n' +
'                if (!vr || vr.width <= 0 || vr.height <= 0) return;\r\n' +
'                const destX = vr.left, destY = vr.top, destW = vr.width, destH = vr.height;\r\n\r\n' +
'                ctx.save();\r\n' +
'                if (isPrimary) {\r\n' +
'                    // Double outline (dark contrast border + gold highlight)\r\n' +
'                    ctx.strokeStyle = "#000000";\r\n' +
'                    ctx.lineWidth = 5 / zoom;\r\n' +
'                    ctx.strokeRect(destX, destY, destW, destH);\r\n' +
'                    ctx.strokeStyle = "#eab308";\r\n' +
'                    ctx.lineWidth = 3 / zoom;\r\n' +
'                    ctx.strokeRect(destX, destY, destW, destH);\r\n\r\n' +
'                    // Corner selection handles\r\n' +
'                    const handleSize = Math.max(6, Math.min(12, 8 / zoom));\r\n' +
'                    ctx.fillStyle = "#ffffff";\r\n' +
'                    ctx.strokeStyle = "#000000";\r\n' +
'                    ctx.lineWidth = 1.5 / zoom;\r\n' +
'                    const corners = [\r\n' +
'                        [destX, destY],\r\n' +
'                        [destX + destW, destY],\r\n' +
'                        [destX, destY + destH],\r\n' +
'                        [destX + destW, destY + destH]\r\n' +
'                    ];\r\n' +
'                    corners.forEach(([cx, cy]) => {\r\n' +
'                        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);\r\n' +
'                        ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);\r\n' +
'                    });\r\n' +
'                } else if (isMulti) {\r\n' +
'                    ctx.strokeStyle = "#000000";\r\n' +
'                    ctx.lineWidth = 4 / zoom;\r\n' +
'                    ctx.strokeRect(destX, destY, destW, destH);\r\n' +
'                    ctx.strokeStyle = "#38bdf8";\r\n' +
'                    ctx.lineWidth = 2 / zoom;\r\n' +
'                    ctx.strokeRect(destX, destY, destW, destH);\r\n' +
'                }\r\n' +
'                ctx.restore();\r\n' +
'            });\r\n\r\n            ';

replaceBlock(start1, end1, rep1);

// 2. Mousedown hit-test and selection in handleCanvasMouseDown
const start2 = 'let clickedMapId = null;';
const end2 = '// Update cropping controls to reflect the current selection';
const rep2 = 'let clickedMapId = null;\r\n' +
'            let clickedMap = null;\r\n' +
'            // Hit-test maps using their actual visible rectangle (accounting for crop/slice)\r\n' +
'            // Search top-to-bottom (activeCanvas.maps[length - 1] down to 0)\r\n' +
'            const tol = Math.max(2, 6 / (zoom || 1));\r\n' +
'            const hits = [];\r\n' +
'            for (let i = activeCanvas.maps.length - 1; i >= 0; i--) {\r\n' +
'                const map = activeCanvas.maps[i];\r\n' +
'                const vr = getVisibleRectForMap(map);\r\n' +
'                if (!vr || vr.width <= 0 || vr.height <= 0) continue;\r\n' +
'                if (worldX >= vr.left - tol && worldX <= vr.right + tol &&\r\n' +
'                    worldY >= vr.top - tol && worldY <= vr.bottom + tol) {\r\n' +
'                    hits.push(map);\r\n' +
'                }\r\n' +
'            }\r\n\r\n' +
'            if (hits.length > 0) {\r\n' +
'                const currentSelId = state.canvasState.selectedMapId;\r\n' +
'                if (hits.length > 1 && currentSelId != null && hits.some(m => String(m.id) === String(currentSelId))) {\r\n' +
'                    // If multiple maps hit (overlapping or touching boundary) and one is already selected,\r\n' +
'                    // pick the other map to cycle/toggle between them easily!\r\n' +
'                    const other = hits.find(m => String(m.id) !== String(currentSelId));\r\n' +
'                    clickedMap = other || hits[0];\r\n' +
'                } else {\r\n' +
'                    clickedMap = hits[0];\r\n' +
'                }\r\n' +
'                clickedMapId = clickedMap.id;\r\n' +
'            }\r\n\r\n' +
'            const multiSelect = !!(e.ctrlKey || e.metaKey || e.shiftKey);\r\n' +
'            if (!Array.isArray(state.canvasState.selectedMapIds)) state.canvasState.selectedMapIds = [];\r\n\r\n' +
'            state.canvasState._dragDistance = 0;\r\n' +
'            state.canvasState._dragStartScreen = { x: mouseXInWrapper, y: mouseYInWrapper };\r\n' +
'            state.canvasState._pendingSingleSelectMapId = null;\r\n\r\n' +
'            if (clickedMapId != null) {\r\n' +
'                const selIds = state.canvasState.selectedMapIds;\r\n' +
'                const isAlreadySelected = selIds.some(id => String(id) === String(clickedMapId));\r\n\r\n' +
'                if (multiSelect) {\r\n' +
'                    const idx = selIds.findIndex(id => String(id) === String(clickedMapId));\r\n' +
'                    if (idx >= 0) {\r\n' +
'                        selIds.splice(idx, 1);\r\n' +
'                        if (String(state.canvasState.selectedMapId) === String(clickedMapId)) {\r\n' +
'                            state.canvasState.selectedMapId = selIds.length ? selIds[selIds.length - 1] : null;\r\n' +
'                        }\r\n' +
'                    } else {\r\n' +
'                        selIds.push(clickedMapId);\r\n' +
'                        state.canvasState.selectedMapId = clickedMapId;\r\n' +
'                    }\r\n' +
'                } else {\r\n' +
'                    if (!isAlreadySelected) {\r\n' +
'                        state.canvasState.selectedMapIds = [clickedMapId];\r\n' +
'                        state.canvasState.selectedMapId = clickedMapId;\r\n' +
'                    } else {\r\n' +
'                        state.canvasState.selectedMapId = clickedMapId;\r\n' +
'                        state.canvasState._pendingSingleSelectMapId = clickedMapId;\r\n' +
'                    }\r\n' +
'                }\r\n\r\n' +
'                if (state.canvasState.selectedMapIds.some(id => String(id) === String(clickedMapId)) && clickedMap) {\r\n' +
'                    state.canvasState.draggingMapId = clickedMapId;\r\n' +
'                    state.canvasState.dragOffsetX = worldX - clickedMap.x;\r\n' +
'                    state.canvasState.dragOffsetY = worldY - clickedMap.y;\r\n' +
'                    state.canvasState.dragStartWorld = { x: worldX, y: worldY };\r\n' +
'                    const starts = {};\r\n' +
'                    state.canvasState.selectedMapIds.forEach(id => {\r\n' +
'                        const m = activeCanvas.maps.find(mm => String(mm.id) === String(id));\r\n' +
'                        if (m) starts[m.id] = { x: m.x, y: m.y };\r\n' +
'                    });\r\n' +
'                    state.canvasState.dragStartPositions = starts;\r\n' +
'                }\r\n' +
'            } else {\r\n' +
'                if (!multiSelect) {\r\n' +
'                    state.canvasState.selectedMapId = null;\r\n' +
'                    state.canvasState.selectedMapIds = [];\r\n' +
'                }\r\n' +
'                state.canvasState.draggingMapId = null;\r\n' +
'                state.canvasState.dragStartWorld = null;\r\n' +
'                state.canvasState.dragStartPositions = null;\r\n' +
'            }\r\n            ';

replaceBlock(start2, end2, rep2);

// 3. Hover cursor in handleCanvasMouseMove
const start3 = "wrapper.classList.toggle('mask-hover', !!hitTestMask(activeCanvas.masks || [], worldX, worldY));\r\n            }";
const rep3 = "wrapper.classList.toggle('mask-hover', !!hitTestMask(activeCanvas.masks || [], worldX, worldY));\r\n            }\r\n            if (!state.canvasState.isPanning && !state.canvasState.draggingMapId && !state.canvasState.maskMode && !drawCfg.enabled && !drawCfg.selectEnabled) {\r\n                const tol = Math.max(2, 6 / (zoom || 1));\r\n                const hoveringMap = (activeCanvas.maps || []).some(m => {\r\n                    const vr = getVisibleRectForMap(m);\r\n                    return vr && vr.width > 0 && vr.height > 0 &&\r\n                        worldX >= vr.left - tol && worldX <= vr.right + tol &&\r\n                        worldY >= vr.top - tol && worldY <= vr.bottom + tol;\r\n                });\r\n                wrapper.style.cursor = hoveringMap ? 'move' : 'default';\r\n            }";
replaceBlock(start3, start3, rep3);

// 4. Drag threshold in handleCanvasMouseMove
const start4 = '} else if (draggingMapId) {\r\n                // Use the same inverse transform';
const end4 = '// Calculate delta before updating map.x/map.y';
const rep4 = '} else if (draggingMapId) {\r\n' +
'                const startScreen = state.canvasState._dragStartScreen;\r\n' +
'                if (startScreen) {\r\n' +
'                    const dist = Math.hypot(mouseXInWrapper - startScreen.x, mouseYInWrapper - startScreen.y);\r\n' +
'                    state.canvasState._dragDistance = dist;\r\n' +
'                    if (dist < 4) {\r\n' +
'                        return; // Stationary click: do not snap or move map\r\n' +
'                    }\r\n' +
'                }\r\n' +
'                // Use the same inverse transform as for drawing so map drag follows the cursor under zoom/pan.\r\n' +
'                const regionOffsetX = state.canvasState.regionOffsetX || 0;\r\n' +
'                const regionOffsetY = state.canvasState.regionOffsetY || 0;\r\n' +
'                const worldX = (mouseXInWrapper - (panX + rulerSize + regionOffsetX)) / (zoom || 1);\r\n' +
'                const worldY = (mouseYInWrapper - (panY + rulerSize + regionOffsetY)) / (zoom || 1);\r\n' +
'                const selIds = Array.isArray(state.canvasState.selectedMapIds) ? state.canvasState.selectedMapIds : [];\r\n' +
'                const startWorld = state.canvasState.dragStartWorld;\r\n' +
'                const startPositions = state.canvasState.dragStartPositions || {};\r\n' +
'                if (selIds.length > 1 && startWorld) {\r\n' +
'                    const dx = worldX - startWorld.x;\r\n' +
'                    const dy = worldY - startWorld.y;\r\n' +
'                    selIds.forEach(id => {\r\n' +
'                        const m = activeCanvas.maps.find(mm => String(mm.id) === String(id));\r\n' +
'                        const s = startPositions[m ? m.id : id] || startPositions[id];\r\n' +
'                        if (m && s) {\r\n' +
'                            m.x = s.x + dx;\r\n' +
'                            m.y = s.y + dy;\r\n' +
'                        }\r\n' +
'                    });\r\n' +
'                    state.canvasState.snapLines = [];\r\n' +
'                    state.canvasState.gapGuides = null;\r\n' +
'                    drawMainCanvas();\r\n' +
'                    return;\r\n' +
'                }\r\n\r\n' +
'                const map = activeCanvas.maps.find(m => String(m.id) === String(draggingMapId));\r\n' +
'                if (!map) return;\r\n\r\n                ';
replaceBlock(start4, end4, rep4);

// 5. Cleanup and single-select resolution in handleCanvasMouseUp
const start5 = 'state.canvasState.isPanning = false;\r\n            state.canvasState.draggingMapId = null;';
const end5 = 'const container = document.getElementById(\'main-canvas-wrapper\');';
const rep5 = 'if (state.canvasState._pendingSingleSelectMapId != null) {\r\n' +
'                if ((state.canvasState._dragDistance || 0) < 4) {\r\n' +
'                    state.canvasState.selectedMapIds = [state.canvasState._pendingSingleSelectMapId];\r\n' +
'                    state.canvasState.selectedMapId = state.canvasState._pendingSingleSelectMapId;\r\n' +
'                }\r\n' +
'                state.canvasState._pendingSingleSelectMapId = null;\r\n' +
'            }\r\n' +
'            state.canvasState._dragDistance = 0;\r\n' +
'            state.canvasState._dragStartScreen = null;\r\n' +
'            state.canvasState.isPanning = false;\r\n' +
'            state.canvasState.draggingMapId = null;\r\n' +
'            state.canvasState.dragStartWorld = null;\r\n' +
'            state.canvasState.dragStartPositions = null;\r\n' +
'            state.canvasState.snapLines = [];\r\n            ';
replaceBlock(start5, end5, rep5);

// 6. Fix selectedMapId string conversions across index.html
content = content.replace(/m\.id === state\.canvasState\.selectedMapId/g, 'String(m.id) === String(state.canvasState.selectedMapId)');

// Validate syntax before writing
const scriptMatches = [...content.matchAll(/<script(?:\s+[^>]*)?>([\s\S]*?)<\/script>/gi)];
let totalErrors = 0;
scriptMatches.forEach((m, idx) => {
    const sf = ts.createSourceFile('script' + idx + '.js', m[1], ts.ScriptTarget.Latest, true);
    if (sf.parseDiagnostics.length > 0) {
        console.error('Script ' + idx + ' has ' + sf.parseDiagnostics.length + ' error(s):');
        sf.parseDiagnostics.forEach(d => {
            const pos = sf.getLineAndCharacterOfPosition(d.start);
            console.error('  Line ' + (pos.line + 1) + ': ' + d.messageText);
            const lines = m[1].split('\n');
            console.error('  Code: ' + lines[pos.line]);
        });
        totalErrors += sf.parseDiagnostics.length;
    }
});

if (totalErrors === 0) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('SUCCESS: Updated index.html with all fixes! Length:', content.length);
} else {
    console.error('FAILED: Validation found ' + totalErrors + ' errors. index.html was NOT written.');
    process.exit(1);
}

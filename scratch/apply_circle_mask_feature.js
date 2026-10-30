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

// 1. Update maskMode description in state.canvasState
res = safeReplace(content,
    'maskMode: null, // null | "rect" | "ellipse" | "polygon" | "select"',
    'maskMode: null, // null | "rect" | "circle" | "ellipse" | "polygon" | "select"'
);
if (!res.success) { console.error('Target 1 not found'); process.exit(1); }
content = res.content;

// 2. Update top-level updateMaskModeButtons to include circle
const oldTopLevelModeMap = `            const modeMap = {
                rect: document.getElementById("mask-rect-btn"),
                ellipse: document.getElementById("mask-ellipse-btn"),
                polygon: document.getElementById("mask-polygon-btn")
            };`;

const newTopLevelModeMap = `            const modeMap = {
                rect: document.getElementById("mask-rect-btn"),
                circle: document.getElementById("mask-circle-btn"),
                ellipse: document.getElementById("mask-ellipse-btn"),
                polygon: document.getElementById("mask-polygon-btn")
            };`;

res = safeReplace(content, oldTopLevelModeMap, newTopLevelModeMap);
if (!res.success) { console.error('Target 2 not found'); process.exit(1); }
content = res.content;

// 3. Add Circle button to Add Mask toolbar in renderCanvas
const oldAddMaskButtons = `                                        <button id="mask-rect-btn" type="button" class="px-2.5 py-1 text-xs font-semibold text-gray-200 hover:text-white bg-gray-700 hover:bg-purple-600 rounded-none transition-colors" title="Draw rectangle mask (with optional corner radius)">□ Rect</button>
                                        <button id="mask-ellipse-btn" type="button" class="px-2.5 py-1 text-xs font-semibold text-gray-200 hover:text-white bg-gray-700 hover:bg-purple-600 rounded-none border-l border-gray-600 transition-colors" title="Draw ellipse mask">⬭ Ellipse</button>`;

const newAddMaskButtons = `                                        <button id="mask-rect-btn" type="button" class="px-2.5 py-1 text-xs font-semibold text-gray-200 hover:text-white bg-gray-700 hover:bg-purple-600 rounded-none transition-colors" title="Draw rectangle mask (with optional corner radius)">□ Rect</button>
                                        <button id="mask-circle-btn" type="button" class="px-2.5 py-1 text-xs font-semibold text-gray-200 hover:text-white bg-gray-700 hover:bg-purple-600 rounded-none border-l border-gray-600 transition-colors" title="Draw circle mask (sized by Diameter & Radius, 1:1 circular ratio)">◯ Circle</button>
                                        <button id="mask-ellipse-btn" type="button" class="px-2.5 py-1 text-xs font-semibold text-gray-200 hover:text-white bg-gray-700 hover:bg-purple-600 rounded-none border-l border-gray-600 transition-colors" title="Draw freeform ellipse mask">⬭ Ellipse</button>`;

res = safeReplace(content, oldAddMaskButtons, newAddMaskButtons);
if (!res.success) { console.error('Target 3 not found'); process.exit(1); }
content = res.content;

// 4. Add Diameter, Radius, and Circle Lock in Properties Panel Row A
const oldPropsRowAEnd = `                                            <label class="flex items-center gap-1 text-xs text-gray-300 font-semibold" title="Height (supports expressions)">
                                                <span>H</span>
                                                <input id="mask-prop-h" type="text" inputmode="decimal" placeholder="100" class="w-20 bg-gray-900 text-white border border-gray-600 rounded-none px-2 py-1 text-xs font-mono">
                                            </label>
                                        </div>
                                    </div>`;

const newPropsRowAEnd = `                                            <label class="flex items-center gap-1 text-xs text-gray-300 font-semibold" title="Height (supports expressions)">
                                                <span>H</span>
                                                <input id="mask-prop-h" type="text" inputmode="decimal" placeholder="100" class="w-20 bg-gray-900 text-white border border-gray-600 rounded-none px-2 py-1 text-xs font-mono">
                                            </label>

                                            <span class="w-px h-5 bg-gray-700 mx-1"></span>

                                            <!-- Circular Dimensions (Diameter & Radius) -->
                                            <label class="flex items-center gap-1 text-xs text-purple-300 font-semibold" title="Circle Diameter (Ø = 2 × Radius, centers circle on resize)">
                                                <span>Ø Diam</span>
                                                <input id="mask-prop-diameter" type="text" inputmode="decimal" placeholder="100" class="w-20 bg-gray-900 text-white border border-gray-600 rounded-none px-2 py-1 text-xs font-mono">
                                            </label>
                                            <label class="flex items-center gap-1 text-xs text-purple-300 font-semibold" title="Circle Radius (R = Diameter / 2, centers circle on resize)">
                                                <span>Radius</span>
                                                <input id="mask-prop-rad" type="text" inputmode="decimal" placeholder="50" class="w-18 bg-gray-900 text-white border border-gray-600 rounded-none px-2 py-1 text-xs font-mono">
                                            </label>
                                            <label class="flex items-center gap-1.5 text-xs text-purple-200 font-medium cursor-pointer select-none" title="Lock 1:1 circular aspect ratio (Width = Height = Diameter)">
                                                <input id="mask-prop-circle-lock" type="checkbox" class="form-checkbox bg-gray-700 text-purple-600 rounded-none">
                                                <span>1:1 Circle</span>
                                            </label>
                                        </div>
                                    </div>`;

res = safeReplace(content, oldPropsRowAEnd, newPropsRowAEnd);
if (!res.success) { console.error('Target 4 not found'); process.exit(1); }
content = res.content;

// 5. In renderCanvas, declare and wire up maskCircleBtn, mask-prop-diameter, mask-prop-rad, mask-prop-circle-lock
const oldBtnDeclarations = `            const maskRectBtn = document.getElementById("mask-rect-btn");
            const maskEllipseBtn = document.getElementById("mask-ellipse-btn");
            const maskPolygonBtn = document.getElementById("mask-polygon-btn");`;

const newBtnDeclarations = `            const maskRectBtn = document.getElementById("mask-rect-btn");
            const maskCircleBtn = document.getElementById("mask-circle-btn");
            const maskEllipseBtn = document.getElementById("mask-ellipse-btn");
            const maskPolygonBtn = document.getElementById("mask-polygon-btn");`;

res = safeReplace(content, oldBtnDeclarations, newBtnDeclarations);
if (!res.success) { console.error('Target 5 not found'); process.exit(1); }
content = res.content;

const oldBtnListeners = `            if (maskRectBtn) maskRectBtn.addEventListener("click", () => setMaskMode("rect"));
            if (maskEllipseBtn) maskEllipseBtn.addEventListener("click", () => setMaskMode("ellipse"));
            if (maskPolygonBtn) maskPolygonBtn.addEventListener("click", () => setMaskMode("polygon"));`;

const newBtnListeners = `            if (maskRectBtn) maskRectBtn.addEventListener("click", () => setMaskMode("rect"));
            if (maskCircleBtn) maskCircleBtn.addEventListener("click", () => setMaskMode("circle"));
            if (maskEllipseBtn) maskEllipseBtn.addEventListener("click", () => setMaskMode("ellipse"));
            if (maskPolygonBtn) maskPolygonBtn.addEventListener("click", () => setMaskMode("polygon"));`;

res = safeReplace(content, oldBtnListeners, newBtnListeners);
if (!res.success) { console.error('Target 6 not found'); process.exit(1); }
content = res.content;

// 6. In renderCanvas, wire diameter and radius inputs and circle lock
const oldMaskPropInputWires = `            maskPropInputHandler("mask-prop-x", "x");
            maskPropInputHandler("mask-prop-y", "y");
            maskPropInputHandler("mask-prop-w", "w");
            maskPropInputHandler("mask-prop-h", "h");`;

const newMaskPropInputWires = `            maskPropInputHandler("mask-prop-x", "x");
            maskPropInputHandler("mask-prop-y", "y");
            maskPropInputHandler("mask-prop-w", "w");
            maskPropInputHandler("mask-prop-h", "h");

            // Circular dimensions: Diameter & Radius handling
            const maskPropDiameter = document.getElementById("mask-prop-diameter");
            const maskPropRad = document.getElementById("mask-prop-rad");
            const maskPropCircleLock = document.getElementById("mask-prop-circle-lock");

            const handleCircleDimensionChange = (inputEl, isRadius) => {
                if (!inputEl) return;
                inputEl.addEventListener("change", (e) => {
                    const ac = getActiveCanvas();
                    const mask = ac?.masks?.find(m => String(m.id) === String(state.canvasState.selectedMaskId));
                    if (!mask) return;
                    let expression = e.target.value.trim();
                    if (!expression) return;
                    if (!/^[0-9+\\-*\\/().\\s]+$/.test(expression)) {
                        e.target.classList.add('border-red-500');
                        return;
                    }
                    let val;
                    try { val = Function('"use strict"; return (' + expression + ');')(); } catch (_) { val = NaN; }
                    if (!Number.isFinite(val) || val <= 0) {
                        e.target.classList.add('border-red-500');
                        return;
                    }
                    e.target.classList.remove('border-red-500');
                    const unit = state.canvasState.maskUnit || "px";
                    const ppu = state.canvasState.maskPxPerUnit || 1;
                    const valPx = unit === "px" ? val : val * ppu;
                    const diameterPx = isRadius ? valPx * 2 : valPx;

                    // Keep center anchored when changing circle diameter/radius
                    const centerX = mask.x + mask.w / 2;
                    const centerY = mask.y + mask.h / 2;
                    mask.w = Math.max(2, Math.round(diameterPx));
                    mask.h = Math.max(2, Math.round(diameterPx));
                    mask.x = Math.round(centerX - mask.w / 2);
                    mask.y = Math.round(centerY - mask.h / 2);
                    mask.type = "circle";

                    drawMainCanvas();
                    saveState();
                    syncMaskPropertiesToUI();
                });
            };

            handleCircleDimensionChange(maskPropDiameter, false);
            handleCircleDimensionChange(maskPropRad, true);

            if (maskPropCircleLock) {
                maskPropCircleLock.addEventListener("change", (e) => {
                    const ac = getActiveCanvas();
                    const mask = ac?.masks?.find(m => String(m.id) === String(state.canvasState.selectedMaskId));
                    if (!mask) return;
                    if (e.target.checked) {
                        mask.type = "circle";
                        const sz = Math.max(mask.w, mask.h);
                        const centerX = mask.x + mask.w / 2;
                        const centerY = mask.y + mask.h / 2;
                        mask.w = sz;
                        mask.h = sz;
                        mask.x = Math.round(centerX - sz / 2);
                        mask.y = Math.round(centerY - sz / 2);
                    } else {
                        mask.type = "ellipse";
                    }
                    drawMainCanvas();
                    saveState();
                    syncMaskPropertiesToUI();
                    if (typeof updateMaskList === 'function') updateMaskList();
                });
            }`;

res = safeReplace(content, oldMaskPropInputWires, newMaskPropInputWires);
if (!res.success) { console.error('Target 7 not found'); process.exit(1); }
content = res.content;

// 7. Update maskPropInputHandler inside renderCanvas so typing W or H on a circle keeps 1:1 ratio
const oldMaskPropInputInner = `                    mask[field] = pxVal;
                    drawMainCanvas();
                    saveState();
                    syncMaskPropertiesToUI();`;

const newMaskPropInputInner = `                    if ((mask.type === "circle" || document.getElementById("mask-prop-circle-lock")?.checked) && (field === "w" || field === "h")) {
                        mask.w = pxVal;
                        mask.h = pxVal;
                        mask.type = "circle";
                    } else {
                        mask[field] = pxVal;
                    }
                    drawMainCanvas();
                    saveState();
                    syncMaskPropertiesToUI();`;

res = safeReplace(content, oldMaskPropInputInner, newMaskPropInputInner);
if (!res.success) { console.error('Target 8 not found'); process.exit(1); }
content = res.content;

// 8. Update syncSelectedMaskProperties and syncMaskPropertiesToUI for Diameter, Radius & Circle Lock
const oldSyncSelectedMaskProps = `            if (propX) propX.value = toUnit(mask.x);
            if (propY) propY.value = toUnit(mask.y);
            if (propW) propW.value = toUnit(mask.w);
            if (propH) propH.value = toUnit(mask.h);
        };`;

const newSyncSelectedMaskProps = `            if (propX) propX.value = toUnit(mask.x);
            if (propY) propY.value = toUnit(mask.y);
            if (propW) propW.value = toUnit(mask.w);
            if (propH) propH.value = toUnit(mask.h);

            const propDiameter = document.getElementById("mask-prop-diameter");
            const propRad = document.getElementById("mask-prop-rad");
            const circleLock = document.getElementById("mask-prop-circle-lock");
            const isCircleOrEllipse = mask && (mask.type === "circle" || mask.type === "ellipse");
            const isCircle = mask && (mask.type === "circle" || (mask.type === "ellipse" && Math.abs(mask.w - mask.h) < 1));

            if (propDiameter) {
                propDiameter.disabled = !isCircleOrEllipse;
                if (!isCircleOrEllipse) propDiameter.classList.add("opacity-40", "cursor-not-allowed");
                else propDiameter.classList.remove("opacity-40", "cursor-not-allowed");
                propDiameter.value = isCircleOrEllipse ? toUnit(mask.w) : "";
            }
            if (propRad) {
                propRad.disabled = !isCircleOrEllipse;
                if (!isCircleOrEllipse) propRad.classList.add("opacity-40", "cursor-not-allowed");
                else propRad.classList.remove("opacity-40", "cursor-not-allowed");
                propRad.value = isCircleOrEllipse ? toUnit(mask.w / 2) : "";
            }
            if (circleLock) {
                circleLock.disabled = !isCircleOrEllipse;
                circleLock.checked = !!isCircle;
            }
        };`;

res = safeReplace(content, oldSyncSelectedMaskProps, newSyncSelectedMaskProps);
if (!res.success) { console.error('Target 9 not found'); process.exit(1); }
content = res.content;

// Also update syncMaskPropertiesToUI inside renderCanvas
const oldSyncMaskPropertiesToUI = `                if (maskPropX) maskPropX.value = toUnit(mask.x);
                if (maskPropY) maskPropY.value = toUnit(mask.y);
                if (maskPropW) maskPropW.value = toUnit(mask.w);
                if (maskPropH) maskPropH.value = toUnit(mask.h);

                if (typeof updateMaskList === "function") updateMaskList();`;

const newSyncMaskPropertiesToUI = `                if (maskPropX) maskPropX.value = toUnit(mask.x);
                if (maskPropY) maskPropY.value = toUnit(mask.y);
                if (maskPropW) maskPropW.value = toUnit(mask.w);
                if (maskPropH) maskPropH.value = toUnit(mask.h);

                const propDiam = document.getElementById("mask-prop-diameter");
                const propR = document.getElementById("mask-prop-rad");
                const cLock = document.getElementById("mask-prop-circle-lock");
                const isCircOrEll = mask && (mask.type === "circle" || mask.type === "ellipse");
                const isCirc = mask && (mask.type === "circle" || (mask.type === "ellipse" && Math.abs(mask.w - mask.h) < 1));

                if (propDiam) {
                    propDiam.disabled = !isCircOrEll;
                    if (!isCircOrEll) propDiam.classList.add("opacity-40", "cursor-not-allowed");
                    else propDiam.classList.remove("opacity-40", "cursor-not-allowed");
                    propDiam.value = isCircOrEll ? toUnit(mask.w) : "";
                }
                if (propR) {
                    propR.disabled = !isCircOrEll;
                    if (!isCircOrEll) propR.classList.add("opacity-40", "cursor-not-allowed");
                    else propR.classList.remove("opacity-40", "cursor-not-allowed");
                    propR.value = isCircOrEll ? toUnit(mask.w / 2) : "";
                }
                if (cLock) {
                    cLock.disabled = !isCircOrEll;
                    cLock.checked = !!isCirc;
                }

                if (typeof updateMaskList === "function") updateMaskList();`;

res = safeReplace(content, oldSyncMaskPropertiesToUI, newSyncMaskPropertiesToUI);
if (!res.success) { console.error('Target 10 not found'); process.exit(1); }
content = res.content;

// 9. Update handleCanvasMouseDown to support "circle" mode
const oldMouseDownCheck = `if (state.canvasState.maskMode === "rect" || state.canvasState.maskMode === "ellipse") {`;
const newMouseDownCheck = `if (state.canvasState.maskMode === "rect" || state.canvasState.maskMode === "ellipse" || state.canvasState.maskMode === "circle") {`;

res = safeReplace(content, oldMouseDownCheck, newMouseDownCheck);
if (!res.success) { console.error('Target 11 not found'); process.exit(1); }
content = res.content;

// 10. Update handleCanvasMouseMove drawing logic for circle
const oldDrawingShiftCheck = `                if (e.shiftKey) { const sz = Math.max(w, h); w = sz; h = sz; } // hold shift for square/circle`;
const newDrawingShiftCheck = `                if (state.canvasState.maskPreview.type === "circle" || e.shiftKey) {
                    let sz = Math.max(w, h);
                    if (wantTileSnap) {
                        const pMax = Math.max(grid.panelW, grid.panelH);
                        const panels = Math.max(1, Math.round(sz / pMax));
                        sz = panels * pMax;
                    }
                    w = sz;
                    h = sz;
                    if (targetX < s.x) x = s.x - w;
                    if (targetY < s.y) y = s.y - h;
                }`;

res = safeReplace(content, oldDrawingShiftCheck, newDrawingShiftCheck);
if (!res.success) { console.error('Target 12 not found'); process.exit(1); }
content = res.content;

// 11. Update handleCanvasMouseMove resizing logic for circle
const oldResizeNegativeCheck = `                    // Normalize negative sizes
                    if (nw < 0) { nx += nw; nw = -nw; }
                    if (nh < 0) { ny += nh; nh = -nh; }

                    const minSize = wantTileSnap ? Math.min(grid.panelW, grid.panelH) : 2;`;

const newResizeNegativeCheck = `                    // Normalize negative sizes
                    if (nw < 0) { nx += nw; nw = -nw; }
                    if (nh < 0) { ny += nh; nh = -nh; }

                    if (mask.type === "circle" || (mask.type === "ellipse" && document.getElementById("mask-prop-circle-lock")?.checked)) {
                        let sz = Math.max(nw, nh);
                        if (wantTileSnap) {
                            const pMax = Math.max(grid.panelW, grid.panelH);
                            const panels = Math.max(1, Math.round(sz / pMax));
                            sz = panels * pMax;
                        }
                        nw = sz;
                        nh = sz;
                        if (handle.includes("w")) { nx = s.origX + s.origW - nw; }
                        if (handle.includes("n")) { ny = s.origY + s.origH - nh; }
                    }

                    const minSize = wantTileSnap ? Math.min(grid.panelW, grid.panelH) : 2;`;

res = safeReplace(content, oldResizeNegativeCheck, newResizeNegativeCheck);
if (!res.success) { console.error('Target 13 not found'); process.exit(1); }
content = res.content;

// 12. Update handleCanvasMouseUp naming to include Circle
const oldMouseUpTypeName = `const typName = preview.type === "rect" ? "Rectangle" : preview.type === "ellipse" ? "Ellipse" : "Mask";`;
const newMouseUpTypeName = `const typName = preview.type === "circle" ? "Circle" : preview.type === "ellipse" ? "Ellipse" : "Rectangle";`;

res = safeReplace(content, oldMouseUpTypeName, newMouseUpTypeName);
if (!res.success) { console.error('Target 14 not found'); process.exit(1); }
content = res.content;

// 13. Update updateMaskList to show "Circle" badge
const oldUpdateMaskListTyp = `const typ = m.type === "polygon" ? "Poly" : m.type === "rect" ? "Rect" : "Ellipse";`;
const newUpdateMaskListTyp = `const typ = m.type === "polygon" ? "Poly" : m.type === "circle" ? "Circle" : m.type === "rect" ? "Rect" : "Ellipse";`;

res = safeReplace(content, oldUpdateMaskListTyp, newUpdateMaskListTyp);
if (!res.success) { console.error('Target 15 not found'); process.exit(1); }
content = res.content;

// 14. Update hitTestMask to handle circle
const oldHitTestEllipse = `                if (mask.type === "ellipse") {
                    const rx = Math.abs(mask.w) / 2 + tolerance, ry = Math.abs(mask.h) / 2 + tolerance;
                    const dx = wx - (mask.x + mask.w / 2), dy = wy - (mask.y + mask.h / 2);
                    if (rx > 0 && ry > 0 && (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) return mask;
                }`;

const newHitTestEllipse = `                if (mask.type === "ellipse" || mask.type === "circle") {
                    const rx = Math.abs(mask.w) / 2 + tolerance, ry = Math.abs(mask.h) / 2 + tolerance;
                    const dx = wx - (mask.x + mask.w / 2), dy = wy - (mask.y + mask.h / 2);
                    if (rx > 0 && ry > 0 && (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1) return mask;
                }`;

res = safeReplace(content, oldHitTestEllipse, newHitTestEllipse);
if (!res.success) { console.error('Target 16 not found'); process.exit(1); }
content = res.content;

// 15. Update hitTestMaskHandle to handle circle
const oldHitTestHandleType = `if (mask.type !== "rect" && mask.type !== "ellipse") return null;`;
const newHitTestHandleType = `if (mask.type !== "rect" && mask.type !== "ellipse" && mask.type !== "circle") return null;`;

res = safeReplace(content, oldHitTestHandleType, newHitTestHandleType);
if (!res.success) { console.error('Target 17 not found'); process.exit(1); }
content = res.content;

// 16. Update drawMaskOverlays dimension display and resize handles for circle
const oldDrawMaskOverlaysHandles = `if (mask.id === selectedId && (mask.type === "rect" || mask.type === "ellipse") && !options.hideDimensions) {`;
const newDrawMaskOverlaysHandles = `if (mask.id === selectedId && (mask.type === "rect" || mask.type === "ellipse" || mask.type === "circle") && !options.hideDimensions) {`;

res = safeReplace(content, oldDrawMaskOverlaysHandles, newDrawMaskOverlaysHandles);
if (!res.success) { console.error('Target 18 not found'); process.exit(1); }
content = res.content;

// Update dimension label in drawMaskOverlays to show Diameter and Radius for circles
const oldDimensionLabelLogic = `                    let panelCountTag = "";
                    if (typeof getCanvasTileGridAt === 'function' && mask.type === 'rect') {
                        const grid = getCanvasTileGridAt(activeCanvas, mask.x + mask.w/2, mask.y + mask.h/2);
                        if (grid && grid.panelW && grid.panelH) {
                            const pw = +(mask.w / grid.panelW).toFixed(1);
                            const ph = +(mask.h / grid.panelH).toFixed(1);
                            if (pw > 0 && ph > 0) panelCountTag = " (" + pw + "×" + ph + " Panels)";
                        }
                    }
                    const wLabel = tag + toUnit(mask.w) + " " + unit + panelCountTag + modeTag;`;

const newDimensionLabelLogic = `                    let panelCountTag = "";
                    const isCirc = mask.type === 'circle' || (mask.type === 'ellipse' && Math.abs(mask.w - mask.h) < 2);
                    if (typeof getCanvasTileGridAt === 'function') {
                        const grid = getCanvasTileGridAt(activeCanvas, mask.x + mask.w/2, mask.y + mask.h/2);
                        if (grid && grid.panelW && grid.panelH) {
                            if (isCirc) {
                                const panelsDiam = +(mask.w / grid.panelW).toFixed(1);
                                if (panelsDiam > 0) panelCountTag = " [Ø " + panelsDiam + " Panels]";
                            } else if (mask.type === 'rect') {
                                const pw = +(mask.w / grid.panelW).toFixed(1);
                                const ph = +(mask.h / grid.panelH).toFixed(1);
                                if (pw > 0 && ph > 0) panelCountTag = " (" + pw + "×" + ph + " Panels)";
                            }
                        }
                    }
                    const diamStr = isCirc ? "Ø " + toUnit(mask.w) + " " + unit + " (R " + toUnit(mask.w / 2) + " " + unit + ")" : toUnit(mask.w) + " " + unit;
                    const wLabel = tag + diamStr + panelCountTag + modeTag;`;

res = safeReplace(content, oldDimensionLabelLogic, newDimensionLabelLogic);
if (!res.success) { console.error('Target 19 not found'); process.exit(1); }
content = res.content;

fs.writeFileSync('index.html', content, 'utf8');
console.log('Successfully applied Circle mask with Diameter and Radius controls to index.html!');

(function (root) {
    'use strict';
    const sameId = (a, b) => String(a) === String(b);
    function validateEdit(command, canvas, catalog = []) {
        if (!command || !canvas || !sameId(command.canvasId, canvas.id)) throw new Error('The output canvas changed. Select it again.');
        if (command.type === 'add') {
            if (!catalog.some(map => sameId(map.id, command.sourceMapId))) throw new Error('The source pixel map is no longer available.');
            return;
        }
        if (!['transform', 'remove'].includes(command.type)) throw new Error('Invalid map editing command.');
        if (!canvas.maps.some(map => sameId(map.id, command.mapId))) throw new Error('The selected map was removed.');
        if (command.type === 'transform') {
            const rect = command.rect;
            if (!rect || Object.keys(rect).some(key => !['x', 'y', 'width', 'height'].includes(key)) ||
                !['x', 'y', 'width', 'height'].every(key => Number.isFinite(rect[key])) ||
                Math.abs(rect.x) > 65536 || Math.abs(rect.y) > 65536 ||
                rect.width < 1 || rect.height < 1 || rect.width > 16384 || rect.height > 16384) {
                throw new Error('Use positions within +/-65536 and map sizes from 1 to 16384 pixels.');
            }
        }
    }
    function worldPoint(clientX, clientY, viewport, sourceWidth, sourceHeight, mode, dpr, placement) {
        const rect = placement(sourceWidth, sourceHeight, Math.round(viewport.width * dpr), Math.round(viewport.height * dpr), mode);
        return {
            x: ((clientX - viewport.left) * dpr - rect.x) * sourceWidth / rect.width,
            y: ((clientY - viewport.top) * dpr - rect.y) * sourceHeight / rect.height
        };
    }
    function resizeRect(rect, corner, dx, dy, lockAspect, native) {
        const west = corner.includes('w'), north = corner.includes('n');
        let width = Math.max(1, Math.min(16384, rect.width + (west ? -dx : dx)));
        let height = Math.max(1, Math.min(16384, rect.height + (north ? -dy : dy)));
        if (lockAspect) {
            const ratio = native ? native.totalResWidth / native.totalResHeight : rect.width / rect.height;
            if (Math.abs(dx / rect.width) < Math.abs(dy / rect.height)) width = height * ratio;
            width = Math.max(1, Math.min(16384, width));
            height = width / ratio;
            if (height > 16384 || height < 1) {
                height = Math.max(1, Math.min(16384, height));
                width = height * ratio;
            }
        }
        return {
            x: west ? rect.x + rect.width - width : rect.x,
            y: north ? rect.y + rect.height - height : rect.y,
            width, height
        };
    }
    function pixelRect(rect, corner = '') {
        const width = Math.max(1, Math.round(rect.width)), height = Math.max(1, Math.round(rect.height));
        return {
            x: Math.round(corner.includes('w') ? rect.x + rect.width - width : rect.x),
            y: Math.round(corner.includes('n') ? rect.y + rect.height - height : rect.y),
            width, height
        };
    }
    function sizeFromInput(rect, field, value, native, lockAspect) {
        if (!['width', 'height', 'scale-x', 'scale-y'].includes(field)) throw new Error('Unknown size control.');
        if (!Number.isFinite(value) || value <= 0) throw new Error('Enter a positive pixel size or scale percentage.');
        const percent = field === 'scale-x' || field === 'scale-y';
        const horizontal = field === 'width' || field === 'scale-x';
        if (!percent && !Number.isInteger(value)) throw new Error('Width and height must use whole pixels.');
        let width = rect.width, height = rect.height;
        const pixels = percent ? value / 100 * (horizontal ? native.totalResWidth : native.totalResHeight) : value;
        if (horizontal) {
            width = pixels;
            if (lockAspect) height = pixels * native.totalResHeight / native.totalResWidth;
        } else {
            height = pixels;
            if (lockAspect) width = pixels * native.totalResWidth / native.totalResHeight;
        }
        if (![width, height].every(n => Number.isFinite(n) && n >= 0.5 && n < 16384.5)) {
            throw new Error('The resulting map size must be between 1 and 16384 pixels on each side.');
        }
        return pixelRect({ ...rect, width, height });
    }
    function visibleRect(map, rect, calculateLayout) {
        const native = calculateLayout ? calculateLayout(map) : map.calcs;
        const width = Math.max(1, Math.floor(native?.totalResWidth || map.width || 1));
        const height = Math.max(1, Math.floor(native?.totalResHeight || map.height || 1));
        const left = Math.min(width, Math.max(0, Math.floor(map.cropLeft ?? map.sliceLeft ?? 0)));
        const top = Math.min(height, Math.max(0, Math.floor(map.cropTop ?? 0)));
        const right = Math.min(width, Math.max(left, width - Math.max(0, Math.floor(map.cropRight ?? map.sliceRight ?? 0))));
        const bottom = Math.min(height, Math.max(top, height - Math.max(0, Math.floor(map.cropBottom ?? 0))));
        return {
            left: rect.x + rect.width * left / width, right: rect.x + rect.width * right / width,
            top: rect.y + rect.height * top / height, bottom: rect.y + rect.height * bottom / height
        };
    }
    function resolveLayoutCalc(map, calculateLayout) {
        if (typeof calculateLayout === 'function') {
            try {
                const res = calculateLayout(map);
                if (res && res.totalResWidth) return res;
            } catch (_) {}
        }
        if (typeof root.PixelLogicMapRenderer?.calculateLayout === 'function') {
            try {
                const res = root.PixelLogicMapRenderer.calculateLayout(map);
                if (res && res.totalResWidth) return res;
            } catch (_) {}
        }
        if (typeof globalThis.calculateLayout === 'function') {
            try {
                const res = globalThis.calculateLayout(map);
                if (res && res.totalResWidth) return res;
            } catch (_) {}
        }
        return map?.calcs || {};
    }
    function getMapTileInfo(map, rect, calculateLayout) {
        const layout = resolveLayoutCalc(map, calculateLayout);
        const nativeW = Math.max(1, Math.floor(layout?.totalResWidth || map.width || 1));
        const nativeH = Math.max(1, Math.floor(layout?.totalResHeight || map.height || 1));
        const cols = Math.max(1, Math.floor(layout?.panelsHorizontally || 1));
        const rows = Math.max(1, Math.floor(layout?.panelsVertically || 1));

        const rWidth = rect?.width || map.width || nativeW;
        const rHeight = rect?.height || map.height || nativeH;
        const scaleX = rWidth / nativeW;
        const scaleY = rHeight / nativeH;

        const panelResW = layout?.panelResWidth || (nativeW / cols);
        const panelResH = layout?.panelResHeight || (nativeH / rows);

        const cropL = Math.max(0, Math.floor(map.cropLeft ?? map.sliceLeft ?? 0));
        const cropT = Math.max(0, Math.floor(map.cropTop ?? 0));
        const cropR = Math.max(0, Math.floor(map.cropRight ?? map.sliceRight ?? 0));
        const cropB = Math.max(0, Math.floor(map.cropBottom ?? 0));

        const baseLeft = (rect?.x ?? map.x ?? 0);
        const baseTop = (rect?.y ?? map.y ?? 0);

        const visLeft = baseLeft + scaleX * cropL;
        const visTop = baseTop + scaleY * cropT;
        const visRight = baseLeft + scaleX * Math.max(cropL, nativeW - cropR);
        const visBottom = baseTop + scaleY * Math.max(cropT, nativeH - cropB);

        // All visible vertical tile seams/edges
        const xLines = [];
        for (let c = 0; c <= cols; c++) {
            const pxNative = c * panelResW;
            if (pxNative >= cropL - 0.01 && pxNative <= (nativeW - cropR) + 0.01) {
                const lx = baseLeft + scaleX * pxNative;
                xLines.push(Math.round(lx * 1000) / 1000);
            }
        }
        if (!xLines.some(x => Math.abs(x - visLeft) < 0.5)) xLines.unshift(Math.round(visLeft * 1000) / 1000);
        if (!xLines.some(x => Math.abs(x - visRight) < 0.5)) xLines.push(Math.round(visRight * 1000) / 1000);

        // All visible horizontal tile seams/edges
        const yLines = [];
        for (let r = 0; r <= rows; r++) {
            const pyNative = r * panelResH;
            if (pyNative >= cropT - 0.01 && pyNative <= (nativeH - cropB) + 0.01) {
                const ly = baseTop + scaleY * pyNative;
                yLines.push(Math.round(ly * 1000) / 1000);
            }
        }
        if (!yLines.some(y => Math.abs(y - visTop) < 0.5)) yLines.unshift(Math.round(visTop * 1000) / 1000);
        if (!yLines.some(y => Math.abs(y - visBottom) < 0.5)) yLines.push(Math.round(visBottom * 1000) / 1000);

        return {
            cols, rows, scaleX, scaleY,
            panelResW, panelResH,
            visLeft, visTop, visRight, visBottom,
            xLines, yLines
        };
    }
    function snapTargets(map, canvas, calculateLayout) {
        const x = [], y = [];
        const canvasX = [0, canvas.width / 2, canvas.width];
        const canvasY = [0, canvas.height / 2, canvas.height];

        for (const other of (canvas?.maps || [])) {
            if (sameId(other.id, map.id)) continue;
            const otherInfo = getMapTileInfo(other, other, calculateLayout);
            otherInfo.xLines.forEach(val => x.push(val));
            otherInfo.yLines.forEach(val => y.push(val));
            x.push((otherInfo.visLeft + otherInfo.visRight) / 2);
            y.push((otherInfo.visTop + otherInfo.visBottom) / 2);
        }
        return { x, y, canvasX, canvasY };
    }
    function nearestSnap(points, targets, threshold) {
        let best = null;
        for (const point of points) {
            for (const target of targets) {
                const distance = Math.abs(point - target);
                if (distance < threshold && (!best || distance < best.distance)) {
                    best = { distance, delta: target - point, target };
                }
            }
        }
        return best;
    }
    function snapMove(rect, map, canvas, thresholdX, thresholdY, calculateLayout) {
        const targets = snapTargets(map, canvas, calculateLayout);
        const selfInfo = getMapTileInfo(map, rect, calculateLayout);

        const xPoints = [...selfInfo.xLines, (selfInfo.visLeft + selfInfo.visRight) / 2];
        const yPoints = [...selfInfo.yLines, (selfInfo.visTop + selfInfo.visBottom) / 2];

        const xMapSnap = nearestSnap(xPoints, targets.x, thresholdX);
        const x = xMapSnap || nearestSnap(xPoints, targets.canvasX, thresholdX);

        const yMapSnap = nearestSnap(yPoints, targets.y, thresholdY);
        const y = yMapSnap || nearestSnap(yPoints, targets.canvasY, thresholdY);

        return {
            rect: { ...rect, x: rect.x + (x?.delta || 0), y: rect.y + (y?.delta || 0) },
            guides: [...(x ? [{ axis: 'x', value: x.target }] : []), ...(y ? [{ axis: 'y', value: y.target }] : [])]
        };
    }
    function snapResize(rect, map, canvas, thresholdX, thresholdY, corner, lockAspect, calculateLayout) {
        const targets = snapTargets(map, canvas, calculateLayout), visible = visibleRect(map, rect, calculateLayout);
        const west = corner.includes('w'), north = corner.includes('n');
        const allTargetsX = [...targets.x, ...targets.canvasX];
        const allTargetsY = [...targets.y, ...targets.canvasY];
        const x = nearestSnap([west ? visible.left : visible.right], allTargetsX, thresholdX);
        const y = nearestSnap([north ? visible.top : visible.bottom], allTargetsY, thresholdY);
        const anchorX = west ? rect.x + rect.width : rect.x, anchorY = north ? rect.y + rect.height : rect.y;
        const fractionX = Math.abs((west ? visible.left : visible.right) - anchorX) / rect.width;
        const fractionY = Math.abs((north ? visible.top : visible.bottom) - anchorY) / rect.height;
        const candidates = [];
        if (x && fractionX > 0) {
            const width = (west ? anchorX - x.target : x.target - anchorX) / fractionX;
            candidates.push({ axis: 'x', value: x.target, distance: x.distance / thresholdX, width, height: lockAspect ? width * rect.height / rect.width : rect.height });
        }
        if (y && fractionY > 0) {
            const height = (north ? anchorY - y.target : y.target - anchorY) / fractionY;
            candidates.push({ axis: 'y', value: y.target, distance: y.distance / thresholdY, height, width: lockAspect ? height * rect.width / rect.height : rect.width });
        }
        const valid = candidates.filter(item => [item.width, item.height].every(n => n >= 1 && n <= 16384)).sort((a, b) => a.distance - b.distance);
        const chosen = lockAspect ? valid.slice(0, 1) : valid;
        let width = rect.width, height = rect.height;
        for (const item of chosen) {
            if (lockAspect || item.axis === 'x') width = item.width;
            if (lockAspect || item.axis === 'y') height = item.height;
        }
        return {
            rect: { x: west ? anchorX - width : anchorX, y: north ? anchorY - height : anchorY, width, height },
            guides: chosen.map(item => ({ axis: item.axis, value: item.value }))
        };
    }
    function createProjectAdapter({ getProject, calculateLayout, syncMap, normalizeOutput, save, changed, validateFrame, placement, newId }) {
        function resolve(key) {
            const [projectId, kind, sourceId, regionId] = JSON.parse(key);
            const project = getProject();
            if (!project || !sameId(project.id, projectId)) return null;
            if (kind === 'pixelMap') {
                const map = project.pixelMaps?.find(item => sameId(item.id, sourceId));
                return map ? { project, kind, map } : null;
            }
            const outputMap = project.canvases?.find(item => sameId(item.id, sourceId));
            const canvas = outputMap?.regions?.find(item => sameId(item.id, regionId));
            return canvas ? { project, kind, canvas } : null;
        }
        function getSources() {
            const project = getProject();
            if (!project) return [];
            const sources = (project.pixelMaps || []).map(map => ({
                key: JSON.stringify([project.id, 'pixelMap', map.id]), label: `Pixel Map: ${map.name}`
            }));
            for (const outputMap of project.canvases || []) {
                normalizeOutput(outputMap);
                for (const canvas of outputMap.regions) sources.push({
                    key: JSON.stringify([project.id, 'canvas', outputMap.id, canvas.id]),
                    label: `Output Map: ${outputMap.name} / ${canvas.name}`
                });
            }
            return sources;
        }
        function getSnapshot(key) {
            const item = resolve(key);
            if (!item) return null;
            if (item.kind === 'pixelMap') return { kind: item.kind, map: item.map };
            const canvas = { ...item.canvas, maps: (item.canvas.maps || []).map(map => {
                const copy = { ...map };
                syncMap(copy, item.project);
                return copy;
            }) };
            return { kind: 'canvas', canvas };
        }
        function getCatalog(key) {
            return (resolve(key)?.project.pixelMaps || []).map(map => ({ id: map.id, name: map.name }));
        }
        const validateCanvas = canvas => validateFrame({ source: { kind: 'canvas', canvas }, annotations: true, drawings: false, masks: 'none' });
        function instance(map, project, rect) {
            const copy = JSON.parse(JSON.stringify(map));
            const layout = calculateLayout(map);
            return {
                ...copy, id: newId(), sourceMapId: map.id, sourceProjectId: project.id,
                ...rect, outputScaleX: rect.width / layout.totalResWidth, outputScaleY: rect.height / layout.totalResHeight,
                cropLeft: 0, cropRight: 0, cropTop: 0, cropBottom: 0, sliceLeft: 0, sliceRight: 0
            };
        }
        function ensureEditable(key, display) {
            const item = resolve(key);
            if (!item) throw new Error('Select an available source first.');
            if (item.kind === 'canvas') return key;
            const layout = calculateLayout(item.map);
            const rect = placement(layout.totalResWidth, layout.totalResHeight, display.width, display.height, 'actual');
            const canvas = {
                id: newId(), name: 'External Layout', width: display.width, height: display.height,
                maps: [instance(item.map, item.project, rect)], drawings: [], masks: []
            };
            validateCanvas(canvas);
            const outputMap = { id: newId(), name: `External Output ${(item.project.canvases || []).length + 1}`, regions: [canvas], activeRegionId: canvas.id };
            (item.project.canvases ||= []).push(outputMap);
            save();
            changed();
            return JSON.stringify([item.project.id, 'canvas', outputMap.id, canvas.id]);
        }
        function applyEdit(key, command) {
            const item = resolve(key);
            if (!item || item.kind !== 'canvas') throw new Error('The editable output is no longer active.');
            const canvas = getSnapshot(key).canvas;
            validateEdit(command, canvas, getCatalog(key));
            let selectedId = command.mapId;
            if (command.type === 'add') {
                const source = item.project.pixelMaps.find(map => sameId(map.id, command.sourceMapId));
                const layout = calculateLayout(source);
                const rect = placement(layout.totalResWidth, layout.totalResHeight, canvas.width, canvas.height, 'actual');
                const map = instance(source, item.project, rect);
                canvas.maps.push(map);
                selectedId = map.id;
            } else if (command.type === 'remove') {
                canvas.maps = canvas.maps.filter(map => !sameId(map.id, command.mapId));
                selectedId = canvas.maps.at(-1)?.id ?? null;
            } else {
                const map = canvas.maps.find(map => sameId(map.id, command.mapId));
                const layout = calculateLayout(map);
                Object.assign(map, command.rect, {
                    outputScaleX: command.rect.width / layout.totalResWidth,
                    outputScaleY: command.rect.height / layout.totalResHeight
                });
            }
            validateCanvas(canvas);
            item.canvas.maps = canvas.maps;
            save();
            changed();
            return { selectedId };
        }
        return { getSources, getSnapshot, getCatalog, ensureEditable, applyEdit };
    }
    const api = { validateEdit, worldPoint, resizeRect, pixelRect, sizeFromInput, snapMove, snapResize, getMapTileInfo, createProjectAdapter };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PixelLogicExternalEditing = api;
})(globalThis);

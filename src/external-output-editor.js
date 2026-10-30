(function (root) {
    'use strict';
    function create({ canvas, paint, edit, setEditing, calculateLayout, savePNG }) {
        const overlay = document.getElementById('output-editor');
        const boxes = document.getElementById('output-map-boxes');
        const guideLayer = document.getElementById('output-snap-guides');
        const field = name => document.getElementById(`output-${name}`);
        let frame = null, state = {}, selectedId = null, drag = null, draft = null, busy = false, scheduled = false;
        let guides = [];
        const same = (a, b) => String(a) === String(b);
        const active = () => !!state.editing && !state.frozen && !state.blackout && frame?.source.kind === 'canvas';
        const selected = () => preview()?.source.canvas?.maps.find(map => same(map.id, selectedId));
        const rectOf = map => ({ x: map.x, y: map.y, width: map.width, height: map.height });
        function preview() {
            if (!draft || !frame) return frame;
            return { ...frame, source: { ...frame.source, canvas: { ...frame.source.canvas, maps: frame.source.canvas.maps.map(map =>
                same(map.id, draft.id) ? { ...map, ...draft.rect } : map
            ) } } };
        }
        function options(select, items, value) {
            const sig = items.map(item => `${item.id}:${item.name}`).join('|');
            if (select.dataset.optionsSig !== sig && document.activeElement !== select) {
                select.dataset.optionsSig = sig;
                select.replaceChildren(...items.map(item => {
                    const option = document.createElement('option');
                    option.value = String(item.id);
                    option.textContent = item.name;
                    return option;
                }));
            }
            if (document.activeElement !== select && items.some(item => same(item.id, value))) {
                select.value = String(value);
            }
        }
        function renderControls() {
            overlay.hidden = !active();
            if (!active()) return;
            const current = preview().source.canvas;
            field('size').textContent = `Output ${current.width} x ${current.height} px`;
            const dpr = window.devicePixelRatio || 1;
            const bounds = canvas.getBoundingClientRect();
            const placement = PixelLogicExternalRenderer.placement(current.width, current.height, Math.round(bounds.width * dpr), Math.round(bounds.height * dpr), state.sizing);
            guideLayer.replaceChildren(...guides.map(guide => {
                const line = document.createElement('div');
                line.className = `output-snap-guide ${guide.axis === 'x' ? 'vertical' : 'horizontal'}`;
                if (guide.axis === 'x') line.style.left = `${bounds.left + (placement.x + guide.value * placement.width / current.width) / dpr}px`;
                else line.style.top = `${bounds.top + (placement.y + guide.value * placement.height / current.height) / dpr}px`;
                return line;
            }));
            boxes.replaceChildren(...current.maps.map((map, index) => {
                const box = document.createElement('div');
                const isSelected = same(map.id, selectedId);
                box.className = `output-map-box${isSelected ? ' selected' : ''}`;
                box.dataset.mapId = String(map.id);
                box.style.left = `${bounds.left + (placement.x + map.x * placement.width / current.width) / dpr}px`;
                box.style.top = `${bounds.top + (placement.y + map.y * placement.height / current.height) / dpr}px`;
                box.style.width = `${map.width * placement.width / current.width / dpr}px`;
                box.style.height = `${map.height * placement.height / current.height / dpr}px`;
                const label = document.createElement('span');
                label.className = 'output-map-label';
                label.textContent = `${index + 1}. ${map.name}`;
                box.appendChild(label);
                if (isSelected) for (const corner of ['nw', 'ne', 'sw', 'se']) {
                    const handle = document.createElement('span');
                    handle.className = 'output-resize-handle';
                    handle.dataset.corner = corner;
                    handle.setAttribute('aria-label', `Resize ${corner}`);
                    box.appendChild(handle);
                }
                return box;
            }));
            options(field('selection'), current.maps.map((map, index) => ({ id: map.id, name: `${index + 1}. ${map.name}` })), selectedId);
            options(field('catalog'), frame.catalog || [], field('catalog').value);
            const map = current.maps.find(item => same(item.id, selectedId));
            for (const name of ['x', 'y', 'width', 'height']) {
                const input = field(name);
                if (document.activeElement !== input) input.value = map ? String(Math.round(map[name] * 1000) / 1000) : '';
                input.disabled = busy || !map;
            }
            const native = map ? calculateLayout(map) : null;
            for (const [name, size, nativeSize] of [['scale-x', map?.width, native?.totalResWidth], ['scale-y', map?.height, native?.totalResHeight]]) {
                const input = field(name);
                if (document.activeElement !== input) input.value = map && nativeSize > 0 ? String(Math.round(size / nativeSize * 10000) / 100) : '';
                input.disabled = busy || !map;
            }
            field('add').disabled = busy || !frame.catalog?.length;
            field('remove').disabled = busy || !map;
            field('selection').disabled = busy || !current.maps.length;
            field('catalog').disabled = busy || !frame.catalog?.length;
            field('finish').disabled = busy;
            field('save-png').disabled = busy || !!drag || !current.maps.length;

            // Live Bottom-Right Scale and Canvas Info Badge
            const infoEl = document.getElementById('output-scale-info');
            if (infoEl) {
                if (map) {
                    const actualW = native && native.totalResWidth > 0 ? native.totalResWidth : Math.round(map.width);
                    const actualH = native && native.totalResHeight > 0 ? native.totalResHeight : Math.round(map.height);
                    const scaledW = Math.round(map.width);
                    const scaledH = Math.round(map.height);
                    const diffW = actualW - scaledW;
                    const diffH = actualH - scaledH;
                    const pctW = actualW > 0 ? ((actualW - scaledW) / actualW) * 100 : 0;
                    const pctH = actualH > 0 ? ((actualH - scaledH) / actualH) * 100 : 0;
                    const isNative = diffW === 0 && diffH === 0;
                    const isReduced = diffW >= 0 && diffH >= 0 && !isNative;
                    const isEnlarged = diffW <= 0 && diffH <= 0 && !isNative;

                    let changeSummary = '';
                    if (isNative) {
                        changeSummary = '0.0% (Native 1:1, No Change)';
                    } else if (isReduced) {
                        const pctText = Math.abs(pctW - pctH) < 0.1 ? `${pctW.toFixed(1)}%` : `W -${pctW.toFixed(1)}%, H -${pctH.toFixed(1)}%`;
                        changeSummary = `${pctText} (-${diffW} × -${diffH} px)`;
                    } else if (isEnlarged) {
                        const pctText = Math.abs(pctW - pctH) < 0.1 ? `+${Math.abs(pctW).toFixed(1)}%` : `W +${Math.abs(pctW).toFixed(1)}%, H +${Math.abs(pctH).toFixed(1)}%`;
                        changeSummary = `${pctText} (+${-diffW} × +${-diffH} px)`;
                    } else {
                        const wText = diffW >= 0 ? `-${pctW.toFixed(1)}% (-${diffW}px)` : `+${Math.abs(pctW).toFixed(1)}% (+${-diffW}px)`;
                        const hText = diffH >= 0 ? `-${pctH.toFixed(1)}% (-${diffH}px)` : `+${Math.abs(pctH).toFixed(1)}% (+${-diffH}px)`;
                        changeSummary = `W ${wText}, H ${hText}`;
                    }
                    const safeMapName = String(map.name || 'Screen').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

                    infoEl.innerHTML = `
                        <div class="output-scale-title">CANVAS &amp; SCALE INFO</div>
                        <div class="output-scale-row"><span class="k">Canvas:</span> <span class="v">${current.width} × ${current.height} px</span></div>
                        <div class="output-scale-row"><span class="k">Active Map:</span> <span class="v">${safeMapName}</span></div>
                        <div class="output-scale-row"><span class="k">Actual Size:</span> <span class="v">${actualW} × ${actualH} px</span></div>
                        <div class="output-scale-row"><span class="k">Scaled Size:</span> <span class="v">${scaledW} × ${scaledH} px</span></div>
                        <div class="output-scale-row highlight"><span class="k">Reduction:</span> <span class="v ${isReduced ? 'red' : isNative ? 'native' : 'enlarged'}">${changeSummary}</span></div>
                    `;
                    infoEl.style.display = 'block';
                } else if (current.maps.length > 0) {
                    infoEl.innerHTML = `
                        <div class="output-scale-title">CANVAS &amp; SCALE INFO</div>
                        <div class="output-scale-row"><span class="k">Canvas:</span> <span class="v">${current.width} × ${current.height} px</span></div>
                        <div class="output-scale-row"><span class="k">Placed Maps:</span> <span class="v">${current.maps.length} (Select map to view reduction)</span></div>
                    `;
                    infoEl.style.display = 'block';
                } else {
                    infoEl.style.display = 'none';
                }
            }
        }
        function repaint() {
            if (frame) paint(preview());
            renderControls();
        }
        function schedule() {
            if (scheduled) return;
            scheduled = true;
            requestAnimationFrame(() => { scheduled = false; repaint(); });
        }
        function error(error) {
            console.error('External output edit:', error);
            field('edit-status').textContent = error.message;
        }
        async function commit(command) {
            if (busy || !active()) return;
            busy = true;
            field('edit-status').textContent = 'Saving layout...';
            renderControls();
            try {
                const result = await edit({ ...command, canvasId: frame.source.canvas.id });
                selectedId = result.selectedId;
                field('edit-status').textContent = 'Layout saved. Drag maps, resize corners, or add another map. Finish editing restores clean output.';
            } catch (failure) {
                draft = null;
                error(failure);
                repaint();
            } finally {
                busy = false;
                renderControls();
            }
        }
        function point(event) {
            const source = frame.source.canvas;
            return PixelLogicExternalEditing.worldPoint(event.clientX, event.clientY, canvas.getBoundingClientRect(),
                source.width, source.height, state.sizing, window.devicePixelRatio || 1, PixelLogicExternalRenderer.placement);
        }
        const toolbar = document.getElementById('output-edit-toolbar');
        if (toolbar) toolbar.addEventListener('pointerdown', event => event.stopPropagation());
        overlay.addEventListener('pointerdown', event => {
            if (event.target.closest('#output-edit-toolbar, #output-scale-info')) return;
            const box = event.target.closest('.output-map-box');
            if (!box || !active() || busy || event.button !== 0) return;
            event.preventDefault();
            selectedId = box.dataset.mapId;
            const map = selected();
            drag = { pointerId: event.pointerId, start: point(event), rect: rectOf(map), corner: event.target.dataset.corner };
            guides = [];
            overlay.setPointerCapture(event.pointerId);
            renderControls();
        });
        overlay.addEventListener('pointermove', event => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            const current = point(event), dx = current.x - drag.start.x, dy = current.y - drag.start.y;
            let rect = drag.corner
                ? PixelLogicExternalEditing.resizeRect(drag.rect, drag.corner, dx, dy, field('aspect').checked && !event.shiftKey, calculateLayout(selected()))
                : { ...drag.rect, x: Math.max(-65536, Math.min(65536, drag.rect.x + dx)), y: Math.max(-65536, Math.min(65536, drag.rect.y + dy)) };
            guides = [];
            if (field('snap').checked && !event.altKey) {
                const source = frame.source.canvas, bounds = canvas.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
                const placement = PixelLogicExternalRenderer.placement(source.width, source.height, Math.round(bounds.width * dpr), Math.round(bounds.height * dpr), state.sizing);
                const thresholdX = 10 * dpr * source.width / placement.width, thresholdY = 10 * dpr * source.height / placement.height;
                const map = selected();
                const snapped = drag.corner
                    ? PixelLogicExternalEditing.snapResize(rect, map, source, thresholdX, thresholdY, drag.corner, field('aspect').checked && !event.shiftKey, calculateLayout)
                    : PixelLogicExternalEditing.snapMove(rect, map, source, thresholdX, thresholdY, calculateLayout);
                rect = snapped.rect;
                guides = snapped.guides;
            }
            rect = drag.corner ? PixelLogicExternalEditing.pixelRect(rect, drag.corner)
                : { ...rect, x: Math.round(rect.x), y: Math.round(rect.y) };
            draft = { id: selectedId, rect };
            schedule();
        });
        overlay.addEventListener('pointerup', event => {
            if (!drag || event.pointerId !== drag.pointerId) return;
            drag = null;
            guides = [];
            overlay.releasePointerCapture(event.pointerId);
            if (draft) commit({ type: 'transform', mapId: draft.id, rect: draft.rect });
        });
        overlay.addEventListener('pointercancel', () => { drag = null; draft = null; guides = []; repaint(); });
        field('snap').addEventListener('change', () => { guides = []; renderControls(); });
        field('toggle-controls').addEventListener('click', () => {
            const controls = field('toolbar-controls');
            controls.hidden = !controls.hidden;
            field('toggle-controls').setAttribute('aria-expanded', String(!controls.hidden));
            field('toggle-controls').textContent = controls.hidden ? 'Show controls' : 'Hide controls';
        });
        field('selection').addEventListener('change', () => { selectedId = field('selection').value; renderControls(); });
        field('add').addEventListener('click', () => commit({ type: 'add', sourceMapId: field('catalog').value }));
        field('remove').addEventListener('click', () => commit({ type: 'remove', mapId: selectedId }));
        field('finish').addEventListener('click', () => setEditing(false).catch(error));
        field('save-png').addEventListener('click', async () => {
            if (busy || drag || !active()) return;
            busy = true;
            field('edit-status').textContent = 'Preparing full-resolution PNG...';
            renderControls();
            try {
                const result = await savePNG(preview());
                field('edit-status').textContent = result.canceled ? 'PNG export canceled.'
                    : `PNG saved: ${result.filePath.split(/[\\/]/).pop()}. Maps aligned to the top-left; live layout unchanged.${result.clipped ? ' Warning: maps extending beyond the output size were clipped.' : ''}`;
            } catch (failure) {
                error(failure);
            } finally {
                busy = false;
                renderControls();
            }
        });
        for (const name of ['x', 'y', 'width', 'height', 'scale-x', 'scale-y']) {
            field(name).addEventListener('change', () => {
                const map = selected();
                if (!map || busy) return;
                try {
                    const value = field(name).value === '' ? NaN : Number(field(name).value);
                    if ((name === 'x' || name === 'y') && !Number.isInteger(value)) throw new Error('Positions must use whole pixels.');
                    const rect = name === 'x' || name === 'y' ? { ...rectOf(map), [name]: value }
                        : PixelLogicExternalEditing.sizeFromInput(rectOf(map), name, value, calculateLayout(map), field('aspect').checked);
                    PixelLogicExternalEditing.validateEdit({ type: 'transform', canvasId: frame.source.canvas.id, mapId: map.id, rect }, frame.source.canvas);
                    draft = { id: map.id, rect };
                    repaint();
                    commit({ type: 'transform', mapId: map.id, rect });
                } catch (failure) { error(failure); renderControls(); }
            });
            field(name).addEventListener('keydown', event => { if (event.key === 'Enter') event.target.blur(); });
        }
        document.addEventListener('keydown', event => {
            if (event.target.closest('input, select') || busy) return;
            if (event.key.toLowerCase() === 'e' && frame?.source.kind === 'canvas' && !state.frozen && !state.blackout) {
                event.preventDefault();
                setEditing(!state.editing).catch(error);
            } else if (event.key === 'Delete' && active() && selectedId != null) {
                event.preventDefault();
                commit({ type: 'remove', mapId: selectedId });
            }
        });
        window.addEventListener('resize', renderControls);
        return {
            refresh: renderControls,
            setFrame(value) {
                frame = value;
                if (frame.source.kind === 'canvas') {
                    const map = frame.source.canvas.maps.find(item => same(item.id, selectedId));
                    if (!map && !busy) selectedId = frame.source.canvas.maps[0]?.id ?? null;
                    if (draft && !drag) {
                        const updated = frame.source.canvas.maps.find(item => same(item.id, draft.id));
                        if (!updated || ['x', 'y', 'width', 'height'].every(key => Math.abs(updated[key] - draft.rect[key]) < 0.001)) draft = null;
                    }
                }
                renderControls();
                return preview();
            },
            setState(value) {
                state = value;
                if (!active() && (drag || draft)) {
                    drag = null;
                    draft = null;
                    guides = [];
                    repaint();
                }
                renderControls();
            }
        };
    }
    root.PixelLogicExternalEditor = { create };
})(globalThis);

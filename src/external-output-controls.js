(function () {
    'use strict';
    window.createExternalOutputControls = function ({ getSources, getSnapshot, getCatalog, ensureEditable, applyEdit, notify }) {
        const api = window.externalOutput;
        const button = document.getElementById('external-output-btn');
        let status = { running: false, frozen: false, blackout: false, displays: [] };
        let selectedKey = '';
        let lastPayload = '';
        let busy = false;
        let timer = null;
        const dialog = document.createElement('dialog');
        dialog.id = 'external-output-dialog';
        dialog.setAttribute('aria-labelledby', 'external-output-title');
        dialog.style.cssText = 'width:min(560px,94vw);max-height:90vh;overflow:auto;padding:24px;border:1px solid #475569;border-radius:12px;background:#111827;color:#f3f4f6;';
        dialog.innerHTML = `
            <h2 id="external-output-title" style="font-size:22px;font-weight:700">External Display Output</h2>
            <p style="margin:12px 0">Connect another monitor, then select <strong>Win+P &gt; Extend</strong>. One clean fullscreen output is supported; the editor stays on this monitor.</p>
            <div style="display:grid;gap:12px">
                <label>Display <select id="external-display" style="display:block;width:100%;background:#1f2937;padding:8px"></select></label>
                <label>Source <select id="external-source" style="display:block;width:100%;background:#1f2937;padding:8px"></select></label>
                <label>Sizing <select id="external-sizing" style="display:block;width:100%;background:#1f2937;padding:8px">
                    <option value="actual">1:1 - one source pixel per display pixel (centered / clipped)</option>
                    <option value="fit">Fit - preserve aspect ratio with black letterboxing</option>
                </select></label>
                <label><input id="external-annotations" type="checkbox" checked> Include map annotations and logos</label>
                <label><input id="external-editing" type="checkbox"> Edit Mode on the external monitor</label>
                <p style="font-size:12px">New maps start at native 100% size. Fit changes only the display view, not saved map scale. On the monitor, drag or snap maps and resize in pixels or percentages. Keep aspect uses native proportions; enter 100% to restore native size. The top-right badge shows output resolution. Finish editing hides all controls.</p>
                <p style="font-size:12px">Use Save PNG in the monitor's Edit Mode toolbar to export the full canvas with the map group aligned to the top-left and exported X/Y coordinates on each map. Spacing and live placement stay unchanged.</p>
                <p style="font-size:12px">The monitor's controls are docked at the bottom. Hide controls collapses them to a small Show controls bar while you arrange maps. Finish editing hides all overlays.</p>
                <label><input id="external-drawings" type="checkbox"> Include canvas drawings</label>
                <label>Canvas masks <select id="external-masks" style="display:block;width:100%;background:#1f2937;padding:8px">
                    <option value="none">Ignore masks</option>
                    <option value="overlay">Show mask fills</option>
                    <option value="inside">Show only inside masks</option>
                    <option value="outside">Show only outside masks</option>
                </select></label>
            </div>
            <p style="margin:12px 0;font-size:13px">Clean mode hides all editing controls. Mask clipping applies only when masks exist. Stop output before changing its source or display. Live source edits refresh up to 10 times per second. This is not genlocked playback.</p>
            <p id="external-status" role="status" aria-live="polite" style="margin:12px 0"></p>
            <div style="display:flex;flex-wrap:wrap;gap:10px">
                <button id="external-start">Start output</button>
                <button id="external-freeze" aria-pressed="false">Freeze</button>
                <button id="external-blackout" aria-pressed="false">Blackout</button>
                <button id="external-stop">Stop output</button>
                <button id="external-refresh">Refresh displays</button>
                <button id="external-close">Close controls</button>
            </div>`;
        for (const element of dialog.querySelectorAll('button')) {
            element.style.cssText = 'padding:8px 12px;border:1px solid #64748b;border-radius:6px;background:#1e293b;';
        }
        document.body.appendChild(dialog);
        const field = name => dialog.querySelector(`#external-${name}`);
        function report(error) {
            console.error('External output:', error);
            const message = error.message || String(error);
            field('status').textContent = message;
            notify(message);
        }
        async function run(action) {
            try { await action(); } catch (error) { report(error); }
        }
        function replaceOptions(select, options, previous) {
            select.replaceChildren(...options.map(item => {
                const option = document.createElement('option');
                option.value = item.value;
                option.textContent = item.label;
                return option;
            }));
            if (options.some(item => item.value === previous)) select.value = previous;
        }
        function refreshSources() {
            replaceOptions(field('source'), getSources().map(source => ({ value: source.key, label: source.label })), status.running ? selectedKey : field('source').value);
            const canvasSource = field('source').value && getSnapshot(field('source').value)?.kind === 'canvas';
            field('drawings').disabled = !canvasSource;
            field('masks').disabled = !canvasSource;
        }
        function showStatus(next) {
            const wasRunning = status.running;
            status = next;
            if (wasRunning && !status.running) {
                clearInterval(timer);
                timer = null;
                selectedKey = '';
                lastPayload = '';
                refreshSources();
            }
            replaceOptions(field('display'), status.displays.filter(display => !display.editor).map(display => ({
                value: String(display.id), label: `${display.name} - ${display.width} x ${display.height} (${Math.round(display.scaleFactor * 100)}%)`
            })), status.running ? String(status.displayId) : field('display').value);
            field('display').disabled = status.running;
            field('source').disabled = status.running;
            field('editing').disabled = !api || !!status.frozen || !!status.blackout;
            if (status.running || wasRunning) field('editing').checked = !!status.editing;
            field('start').disabled = !api || status.running || !field('display').value || !field('source').value;
            for (const name of ['freeze', 'blackout', 'stop']) field(name).disabled = !status.running;
            for (const element of dialog.querySelectorAll('button')) {
                element.style.opacity = element.disabled ? '0.45' : '1';
                element.style.cursor = element.disabled ? 'not-allowed' : 'pointer';
            }
            field('freeze').textContent = status.frozen ? 'Resume live' : 'Freeze';
            field('freeze').setAttribute('aria-pressed', String(!!status.frozen));
            field('blackout').textContent = status.blackout ? 'Restore output' : 'Blackout';
            field('blackout').setAttribute('aria-pressed', String(!!status.blackout));
            button.textContent = status.running ? `External Output: ${status.blackout ? 'Blackout' : status.frozen ? 'Frozen' : status.editing ? 'Editing' : 'Live'}` : 'External Output';
            field('status').textContent = status.message || (status.running
                ? `${status.ready ? 'Running' : 'Starting'} - ${status.frozen ? 'Frozen' : 'Live'}${status.blackout ? ' / Blackout' : ''}. Escape in the output window also stops output.`
                : api ? 'Select a display and source, then start. If no display is listed, connect another monitor and enable Extend.'
                    : 'External Output requires the Pixelogic desktop application. Browser mode cannot manage external monitors.');
            if (wasRunning && !status.running) {
                if (status.message) notify(status.message);
            }
        }
        function payload() {
            const source = getSnapshot(selectedKey);
            if (!source) throw new Error('External output stopped: the selected source was removed or the active project changed.');
            return JSON.stringify({
                source, catalog: getCatalog(selectedKey), annotations: field('annotations').checked,
                drawings: field('drawings').checked, masks: field('masks').value
            }, (key, value) => key === 'imageObject' ? undefined : value);
        }
        async function refreshFrame() {
            if (!status.running || busy) return;
            busy = true;
            try {
                const next = payload();
                if (next !== lastPayload) {
                    await api.update(JSON.parse(next));
                    lastPayload = next;
                }
            } catch (error) {
                await api.control('stop');
                report(error);
            } finally {
                busy = false;
            }
        }
        button.addEventListener('click', () => run(async () => {
            refreshSources();
            dialog.showModal();
            showStatus(api ? await api.getStatus() : status);
        }));
        field('refresh').addEventListener('click', () => run(async () => {
            refreshSources();
            showStatus(api ? await api.getStatus() : status);
        }));
        field('source').addEventListener('change', () => { refreshSources(); showStatus(status); });
        field('display').addEventListener('change', () => showStatus(status));
        async function startOutput(key, displayId, sizing, editing) {
            field('start').disabled = true;
            selectedKey = key;
            try {
                if (editing) {
                    const display = status.displays.find(item => item.id === displayId);
                    if (!display) throw new Error('Select a connected display.');
                    selectedKey = ensureEditable(key, display);
                    refreshSources();
                    field('source').value = selectedKey;
                }
                const next = payload();
                showStatus(await api.start({ displayId, sizing, editing }, JSON.parse(next)));
                lastPayload = next;
                if (status.running) timer = setInterval(() => run(refreshFrame), 100);
            } finally {
                if (!status.running) selectedKey = '';
                showStatus(status);
            }
        }
        field('start').addEventListener('click', () => run(() => startOutput(field('source').value, Number(field('display').value), field('sizing').value, field('editing').checked)));
        field('editing').addEventListener('change', () => run(async () => {
            if (!status.running) return;
            const editing = field('editing').checked;
            if (editing && getSnapshot(selectedKey)?.kind === 'pixelMap') {
                const key = selectedKey, displayId = status.displayId, sizing = status.sizing;
                await api.control('stop');
                await startOutput(key, displayId, sizing, true);
                notify('Created a saved output canvas for this editable layout.');
            } else {
                showStatus(await api.control('editing', editing));
            }
        }));
        field('sizing').addEventListener('change', () => run(async () => {
            if (status.running) showStatus(await api.control('sizing', field('sizing').value));
        }));
        field('freeze').addEventListener('click', () => run(async () => {
            await refreshFrame();
            showStatus(await api.control('freeze', !status.frozen));
        }));
        field('blackout').addEventListener('click', () => run(async () => {
            showStatus(await api.control('blackout', !status.blackout));
        }));
        field('stop').addEventListener('click', () => run(async () => showStatus(await api.control('stop'))));
        field('close').addEventListener('click', () => dialog.close());
        if (api) {
            api.onStatus(showStatus);
            api.onEdit(async command => {
                if (!status.running || !status.editing || status.frozen || status.blackout) throw new Error('Output editing is no longer active.');
                const result = applyEdit(selectedKey, command);
                await refreshFrame();
                return result;
            });
        }
        showStatus(status);
        return { refresh: () => run(refreshFrame) };
    };
})();

const fs = require('fs');

const path = 'index.html';
let content = fs.readFileSync(path, 'utf8');
const isCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// 1. Add #canvas-bottom-right-scale-badge into #main-canvas-wrapper
const wrapperTarget = `<div id="main-canvas-wrapper" class="w-full bg-gray-900 rounded-none overflow-auto relative" style="height:62vh">`;
const wrapperReplacement = `<div id="main-canvas-wrapper" class="w-full bg-gray-900 rounded-none overflow-auto relative" style="height:62vh">
                        <div id="canvas-bottom-right-scale-badge" class="absolute bottom-3 right-3 z-30 pointer-events-none hidden bg-[#070d18]/95 border border-sky-400 text-slate-100 text-[11px] font-mono px-3 py-2 shadow-2xl backdrop-blur-sm"></div>`;

if (!content.includes(wrapperTarget)) {
    console.error('wrapperTarget not found!');
    process.exit(1);
}
content = content.replace(wrapperTarget, wrapperReplacement);

// 2. Update drawMainCanvasNow to update #canvas-bottom-right-scale-badge
const drawNowTarget = `            // After base render, draw manual overlay strokes and preview
            try { renderDrawOverlay(); } catch(_) {}
        };`;

const drawNowReplacement = `            // After base render, draw manual overlay strokes and preview
            try { renderDrawOverlay(); } catch(_) {}

            // Live bottom-right scale and canvas info badge on Output Maps workspace
            try {
                const badge = document.getElementById('canvas-bottom-right-scale-badge');
                if (badge) {
                    const selMap = activeCanvas.maps.find(m => String(m.id) === String(state.canvasState.selectedMapId)) || activeCanvas.maps[0];
                    if (selMap) {
                        const layout = calculateLayout(selMap);
                        const actualW = layout ? layout.totalResWidth : Math.round(selMap.width);
                        const actualH = layout ? layout.totalResHeight : Math.round(selMap.height);
                        const scaledW = Math.round(selMap.width);
                        const scaledH = Math.round(selMap.height);
                        const diffW = actualW - scaledW;
                        const diffH = actualH - scaledH;
                        const pctW = actualW > 0 ? (1 - scaledW / actualW) * 100 : 0;
                        const pctH = actualH > 0 ? (1 - scaledH / actualH) * 100 : 0;
                        const isReduced = diffW > 0 || diffH > 0;
                        const isNative = diffW === 0 && diffH === 0;
                        const pctText = Math.abs(pctW - pctH) < 0.1 ? \`\${pctW.toFixed(1)}%\` : \`W \${pctW.toFixed(1)}%, H \${pctH.toFixed(1)}%\`;

                        badge.innerHTML = \`
                            <div class="text-[10px] font-black text-sky-400 tracking-wider border-b border-slate-700/80 pb-1 mb-1">OUTPUT &amp; SCALE INFO</div>
                            <div class="flex justify-between gap-3 text-slate-300"><span>Canvas:</span><strong class="text-white">\${activeCanvas.width} × \${activeCanvas.height} px</strong></div>
                            <div class="flex justify-between gap-3 text-slate-300"><span>Map:</span><strong class="text-white">\${selMap.name}</strong></div>
                            <div class="flex justify-between gap-3 text-slate-300"><span>Actual Size:</span><strong class="text-white">\${actualW} × \${actualH} px</strong></div>
                            <div class="flex justify-between gap-3 text-slate-300"><span>Scaled Size:</span><strong class="text-white">\${scaledW} × \${scaledH} px</strong></div>
                            <div class="flex justify-between gap-3 pt-1 mt-1 border-t border-slate-700/60 font-bold">
                                <span>Reduction:</span>
                                <span class="\${isReduced ? 'text-amber-400' : isNative ? 'text-emerald-400' : 'text-pink-400'}">\${
                                    isReduced
                                        ? \`\${pctText} (-\${diffW} × -\${diffH} px)\`
                                        : isNative
                                        ? '100% (Native 1:1)'
                                        : \`+\${Math.abs(pctW).toFixed(1)}% (+\${-diffW} × +\${-diffH} px)\`
                                }</span>
                            </div>
                        \`;
                        badge.classList.remove('hidden');
                    } else {
                        badge.classList.add('hidden');
                    }
                }
            } catch (_) {}
        };`;

if (!content.includes(drawNowTarget)) {
    console.error('drawNowTarget not found!');
    process.exit(1);
}
content = content.replace(drawNowTarget, drawNowReplacement);

// 3. Update renderCanvasToElement in index.html to calculate actual native size and reduction in bottom-right stats badge
const statsTarget = `                const stats = [];
                if (options.outputMapName) {
                    stats.push({ title: 'Output Map', value: options.outputMapName });
                }
                stats.push({ title: 'Canvas', value: targetCanvas.name || 'Canvas' });
                stats.push({ title: 'Canvas Size', value: \`\${exportCanvas.width} x \${exportCanvas.height} px\` });
                stats.push({ title: 'Actual Pixels', value: usedBounds ? \`\${usedBounds.width} x \${usedBounds.height} px\` : '0 x 0 px' });`;

const statsReplacement = `                const stats = [];
                if (options.outputMapName) {
                    stats.push({ title: 'Output Map', value: options.outputMapName });
                }
                stats.push({ title: 'Canvas', value: targetCanvas.name || 'Canvas' });
                stats.push({ title: 'Canvas Size', value: \`\${exportCanvas.width} × \${exportCanvas.height} px\` });

                const targetMaps = targetCanvas.maps || [];
                if (targetMaps.length === 1) {
                    const m = targetMaps[0];
                    const layout = calculateLayout(m);
                    const actualW = layout ? layout.totalResWidth : Math.round(m.width);
                    const actualH = layout ? layout.totalResHeight : Math.round(m.height);
                    const scaledW = Math.round(m.width);
                    const scaledH = Math.round(m.height);
                    const diffW = actualW - scaledW;
                    const diffH = actualH - scaledH;
                    const pctW = actualW > 0 ? (1 - scaledW / actualW) * 100 : 0;
                    const pctH = actualH > 0 ? (1 - scaledH / actualH) * 100 : 0;
                    const isReduced = diffW > 0 || diffH > 0;
                    const isNative = diffW === 0 && diffH === 0;
                    const pctText = Math.abs(pctW - pctH) < 0.1 ? \`\${pctW.toFixed(1)}%\` : \`W \${pctW.toFixed(1)}%, H \${pctH.toFixed(1)}%\`;

                    stats.push({ title: 'Map', value: m.name || 'Screen 1' });
                    stats.push({ title: 'Actual Native Size', value: \`\${actualW} × \${actualH} px\` });
                    stats.push({ title: 'Scaled Output Size', value: \`\${scaledW} × \${scaledH} px\` });
                    stats.push({
                        title: isReduced ? 'Reduction' : (isNative ? 'Scale' : 'Enlarged'),
                        value: isReduced
                            ? \`\${pctText} (-\${diffW} × -\${diffH} px)\`
                            : (isNative ? '100% (Native 1:1, 0 px change)' : \`+\${Math.abs(pctW).toFixed(1)}% (+\${-diffW} × +\${-diffH} px)\`)
                    });
                } else if (targetMaps.length > 1) {
                    targetMaps.forEach((m, idx) => {
                        const layout = calculateLayout(m);
                        const actualW = layout ? layout.totalResWidth : Math.round(m.width);
                        const actualH = layout ? layout.totalResHeight : Math.round(m.height);
                        const scaledW = Math.round(m.width);
                        const scaledH = Math.round(m.height);
                        const diffW = actualW - scaledW;
                        const diffH = actualH - scaledH;
                        const pctW = actualW > 0 ? (1 - scaledW / actualW) * 100 : 0;
                        const isReduced = diffW > 0 || diffH > 0;
                        stats.push({
                            title: \`\${idx + 1}. \${m.name || 'Map'}\`,
                            value: \`Act: \${actualW}×\${actualH} | Scl: \${scaledW}×\${scaledH} | \${isReduced ? 'Red' : 'Scl'}: \${pctW.toFixed(1)}% (\${diffW >= 0 ? '-' : '+'}\${Math.abs(diffW)}×\${Math.abs(diffH)}px)\`
                        });
                    });
                } else {
                    stats.push({ title: 'Actual Pixels', value: usedBounds ? \`\${usedBounds.width} × \${usedBounds.height} px\` : '0 × 0 px' });
                }`;

if (!content.includes(statsTarget)) {
    console.error('statsTarget not found!');
    process.exit(1);
}
content = content.replace(statsTarget, statsReplacement);

if (isCRLF) content = content.replace(/\n/g, '\r\n');
fs.writeFileSync(path, content, 'utf8');
console.log('Successfully patched index.html with scale info and canvas HUD');

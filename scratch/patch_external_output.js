const fs = require('fs');
const path = require('path');

// 1. Patch src/external-output-editor.js
const editorPath = path.join(__dirname, '..', 'src', 'external-output-editor.js');
let editorCode = fs.readFileSync(editorPath, 'utf8');

const oldEditorBlock = `                if (map) {
                    const actualW = native ? native.totalResWidth : Math.round(map.width);
                    const actualH = native ? native.totalResHeight : Math.round(map.height);
                    const scaledW = Math.round(map.width);
                    const scaledH = Math.round(map.height);
                    const diffW = actualW - scaledW;
                    const diffH = actualH - scaledH;
                    const pctW = actualW > 0 ? (1 - scaledW / actualW) * 100 : 0;
                    const pctH = actualH > 0 ? (1 - scaledH / actualH) * 100 : 0;
                    const isReduced = diffW > 0 || diffH > 0;
                    const isNative = diffW === 0 && diffH === 0;

                    const pctText = Math.abs(pctW - pctH) < 0.1 ? \`\${pctW.toFixed(1)}%\` : \`W \${pctW.toFixed(1)}%, H \${pctH.toFixed(1)}%\`;
                    infoEl.innerHTML = \`
                        <div class="output-scale-title">CANVAS &amp; SCALE INFO</div>
                        <div class="output-scale-row"><span class="k">Canvas:</span> <span class="v">\${current.width} × \${current.height} px</span></div>
                        <div class="output-scale-row"><span class="k">Active Map:</span> <span class="v">\${map.name}</span></div>
                        <div class="output-scale-row"><span class="k">Actual Size:</span> <span class="v">\${actualW} × \${actualH} px</span></div>
                        <div class="output-scale-row"><span class="k">Scaled Size:</span> <span class="v">\${scaledW} × \${scaledH} px</span></div>
                        <div class="output-scale-row highlight"><span class="k">Reduction:</span> <span class="v \${isReduced ? 'red' : isNative ? 'native' : 'enlarged'}">\${
                            isReduced
                                ? \`\${pctText} (-\${diffW} × -\${diffH} px)\`
                                : isNative
                                ? '100% (Native 1:1, 0 px change)'
                                : \`+\${Math.abs(pctW).toFixed(1)}% (+\${-diffW} × +\${-diffH} px)\`
                        }</span></div>
                    \`;
                    infoEl.style.display = 'block';`;

const newEditorBlock = `                if (map) {
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
                        const pctText = Math.abs(pctW - pctH) < 0.1 ? \`\${pctW.toFixed(1)}%\` : \`W -\${pctW.toFixed(1)}%, H -\${pctH.toFixed(1)}%\`;
                        changeSummary = \`\${pctText} (-\${diffW} × -\${diffH} px)\`;
                    } else if (isEnlarged) {
                        const pctText = Math.abs(pctW - pctH) < 0.1 ? \`+\${Math.abs(pctW).toFixed(1)}%\` : \`W +\${Math.abs(pctW).toFixed(1)}%, H +\${Math.abs(pctH).toFixed(1)}%\`;
                        changeSummary = \`\${pctText} (+\${-diffW} × +\${-diffH} px)\`;
                    } else {
                        const wText = diffW >= 0 ? \`-\${pctW.toFixed(1)}% (-\${diffW}px)\` : \`+\${Math.abs(pctW).toFixed(1)}% (+\${-diffW}px)\`;
                        const hText = diffH >= 0 ? \`-\${pctH.toFixed(1)}% (-\${diffH}px)\` : \`+\${Math.abs(pctH).toFixed(1)}% (+\${-diffH}px)\`;
                        changeSummary = \`W \${wText}, H \${hText}\`;
                    }
                    const safeMapName = String(map.name || 'Screen').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

                    infoEl.innerHTML = \`
                        <div class="output-scale-title">CANVAS &amp; SCALE INFO</div>
                        <div class="output-scale-row"><span class="k">Canvas:</span> <span class="v">\${current.width} × \${current.height} px</span></div>
                        <div class="output-scale-row"><span class="k">Active Map:</span> <span class="v">\${safeMapName}</span></div>
                        <div class="output-scale-row"><span class="k">Actual Size:</span> <span class="v">\${actualW} × \${actualH} px</span></div>
                        <div class="output-scale-row"><span class="k">Scaled Size:</span> <span class="v">\${scaledW} × \${scaledH} px</span></div>
                        <div class="output-scale-row highlight"><span class="k">Reduction:</span> <span class="v \${isReduced ? 'red' : isNative ? 'native' : 'enlarged'}">\${changeSummary}</span></div>
                    \`;
                    infoEl.style.display = 'block';`;

editorCode = editorCode.replace(/\r\n/g, '\n');
editorCode = editorCode.replace(oldEditorBlock, newEditorBlock);
fs.writeFileSync(editorPath, editorCode, 'utf8');

// 2. Patch src/external-output-editor.css
const cssPath = path.join(__dirname, '..', 'src', 'external-output-editor.css');
let cssCode = fs.readFileSync(cssPath, 'utf8');
cssCode = cssCode.replace('pointer-events: auto;', 'pointer-events: none;');
fs.writeFileSync(cssPath, cssCode, 'utf8');

// 3. Patch src/external-output-renderer.js
const rendererPath = path.join(__dirname, '..', 'src', 'external-output-renderer.js');
let rendererCode = fs.readFileSync(rendererPath, 'utf8');
rendererCode = rendererCode.replace(/\r\n/g, '\n');

const oldRendererSingle = `                if (e.isReduced) {
                    const pctText = Math.abs(e.pctW - e.pctH) < 0.1 ? \`\${e.pctW.toFixed(1)}%\` : \`W \${e.pctW.toFixed(1)}%, H \${e.pctH.toFixed(1)}%\`;
                    lines.push({ text: \`Reduced: \${pctText} (-\${e.diffW} × -\${e.diffH} px)\`, color: '#fbbf24', bold: true });
                } else if (e.isNative) {
                    lines.push({ text: \`Scale: 100.0% (Native 1:1, 0 px change)\`, color: '#34d399', bold: true });
                } else {
                    lines.push({ text: \`Enlarged: +\${Math.abs(e.pctW).toFixed(1)}% (+\${-e.diffW} × +\${-e.diffH} px)\`, color: '#f472b6', bold: true });
                }`;

const newRendererSingle = `                if (e.isNative) {
                    lines.push({ text: 'Scale: 100.0% (Native 1:1, No Change)', color: '#34d399', bold: true });
                } else if (e.isReduced) {
                    const pctText = Math.abs(e.pctW - e.pctH) < 0.1 ? \`\${e.pctW.toFixed(1)}%\` : \`W -\${e.pctW.toFixed(1)}%, H -\${e.pctH.toFixed(1)}%\`;
                    lines.push({ text: \`Reduced: \${pctText} (-\${e.diffW} × -\${e.diffH} px)\`, color: '#fbbf24', bold: true });
                } else if (e.diffW <= 0 && e.diffH <= 0) {
                    const pctText = Math.abs(e.pctW - e.pctH) < 0.1 ? \`+\${Math.abs(e.pctW).toFixed(1)}%\` : \`W +\${Math.abs(e.pctW).toFixed(1)}%, H +\${Math.abs(e.pctH).toFixed(1)}%\`;
                    lines.push({ text: \`Enlarged: \${pctText} (+\${-e.diffW} × +\${-e.diffH} px)\`, color: '#f472b6', bold: true });
                } else {
                    const wText = e.diffW >= 0 ? \`-\${e.pctW.toFixed(1)}% (-\${e.diffW}px)\` : \`+\${Math.abs(e.pctW).toFixed(1)}% (+\${-e.diffW}px)\`;
                    const hText = e.diffH >= 0 ? \`-\${e.pctH.toFixed(1)}% (-\${e.diffH}px)\` : \`+\${Math.abs(e.pctH).toFixed(1)}% (+\${-e.diffH}px)\`;
                    lines.push({ text: \`Scale Change: W \${wText}, H \${hText}\`, color: '#fbbf24', bold: true });
                }`;

rendererCode = rendererCode.replace(oldRendererSingle, newRendererSingle);
fs.writeFileSync(rendererPath, rendererCode, 'utf8');

console.log('Successfully patched external-output files!');

const fs = require('fs');

// 1. Patch external-output.html
let html = fs.readFileSync('external-output.html', 'utf8');
const isCRLFHtml = html.includes('\r\n');
html = html.replace(/\r\n/g, '\n');

const htmlTarget = `<output id="output-size" aria-label="Working output size in pixels"></output>
        <section id="output-edit-toolbar" aria-label="External output editing controls">`;

const htmlReplacement = `<output id="output-size" aria-label="Working output size in pixels"></output>
        <div id="output-scale-info" class="output-scale-info-panel" aria-label="Output and scale info badge"></div>
        <section id="output-edit-toolbar" aria-label="External output editing controls">`;

if (!html.includes(htmlTarget)) {
    console.error('Target not found in external-output.html!');
    process.exit(1);
}

html = html.replace(htmlTarget, htmlReplacement);
if (isCRLFHtml) html = html.replace(/\n/g, '\r\n');
fs.writeFileSync('external-output.html', html, 'utf8');
console.log('Successfully patched external-output.html');

// 2. Patch src/external-output-editor.css
let css = fs.readFileSync('src/external-output-editor.css', 'utf8');
const isCRLFCss = css.includes('\r\n');
css = css.replace(/\r\n/g, '\n');

const cssAdditions = `
/* Scale and Canvas Info Badge (Bottom-Right) */
#output-scale-info {
    position: absolute;
    bottom: 96px;
    right: 12px;
    z-index: 15;
    padding: 10px 14px;
    background: rgba(7, 13, 24, 0.95);
    border: 1px solid #38bdf8;
    color: #f8fafc;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
    font-size: 11px;
    line-height: 1.5;
    box-shadow: 0 4px 18px rgba(0, 0, 0, 0.7);
    pointer-events: auto;
    user-select: text;
}
.output-scale-title {
    font-weight: 800;
    color: #38bdf8;
    border-bottom: 1px solid #1e293b;
    padding-bottom: 4px;
    margin-bottom: 5px;
    letter-spacing: 0.05em;
    font-size: 11px;
}
.output-scale-row {
    display: flex;
    justify-content: space-between;
    gap: 16px;
}
.output-scale-row .k { color: #94a3b8; }
.output-scale-row .v { color: #ffffff; font-weight: 700; text-align: right; }
.output-scale-row.highlight { margin-top: 4px; padding-top: 4px; border-top: 1px dashed #334155; }
.output-scale-row .v.red { color: #fbbf24; }
.output-scale-row .v.native { color: #34d399; }
.output-scale-row .v.enlarged { color: #f472b6; }
`;

if (!css.includes('#output-scale-info')) {
    css += cssAdditions;
    if (isCRLFCss) css = css.replace(/\n/g, '\r\n');
    fs.writeFileSync('src/external-output-editor.css', css, 'utf8');
    console.log('Successfully patched src/external-output-editor.css');
}

// 3. Patch src/external-output-editor.js
let js = fs.readFileSync('src/external-output-editor.js', 'utf8');
const isCRLFJs = js.includes('\r\n');
js = js.replace(/\r\n/g, '\n');

const jsTarget = `            field('add').disabled = busy || !frame.catalog?.length;
            field('remove').disabled = busy || !map;
            field('selection').disabled = busy || !current.maps.length;
            field('catalog').disabled = busy || !frame.catalog?.length;
            field('finish').disabled = busy;
            field('save-png').disabled = busy || !!drag || !current.maps.length;
        }`;

const jsReplacement = `            field('add').disabled = busy || !frame.catalog?.length;
            field('remove').disabled = busy || !map;
            field('selection').disabled = busy || !current.maps.length;
            field('catalog').disabled = busy || !frame.catalog?.length;
            field('finish').disabled = busy;
            field('save-png').disabled = busy || !!drag || !current.maps.length;

            // Live Bottom-Right Scale and Canvas Info Badge
            const infoEl = document.getElementById('output-scale-info');
            if (infoEl) {
                if (map) {
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
                    infoEl.style.display = 'block';
                } else if (current.maps.length > 0) {
                    infoEl.innerHTML = \`
                        <div class="output-scale-title">CANVAS &amp; SCALE INFO</div>
                        <div class="output-scale-row"><span class="k">Canvas:</span> <span class="v">\${current.width} × \${current.height} px</span></div>
                        <div class="output-scale-row"><span class="k">Placed Maps:</span> <span class="v">\${current.maps.length} (Select map to view reduction)</span></div>
                    \`;
                    infoEl.style.display = 'block';
                } else {
                    infoEl.style.display = 'none';
                }
            }
        }`;

if (!js.includes(jsTarget)) {
    console.error('Target not found in src/external-output-editor.js!');
    process.exit(1);
}

js = js.replace(jsTarget, jsReplacement);
if (isCRLFJs) js = js.replace(/\n/g, '\r\n');
fs.writeFileSync('src/external-output-editor.js', js, 'utf8');
console.log('Successfully patched src/external-output-editor.js');

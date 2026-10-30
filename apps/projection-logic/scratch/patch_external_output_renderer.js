const fs = require('fs');

const path = 'src/external-output-renderer.js';
let content = fs.readFileSync(path, 'utf8');

const target = `            if (png) {
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, output.width, output.height);
                ctx.globalCompositeOperation = 'source-over';
            }
            return output;
        }`;

const replacement = `            if (png) {
                ctx.globalCompositeOperation = 'destination-over';
                ctx.fillStyle = '#000000';
                ctx.fillRect(0, 0, output.width, output.height);
                ctx.globalCompositeOperation = 'source-over';

                // Bottom-right metadata badge: Canvas Size, Actual Native Size, Scaled Size, and Reduction % & px
                try {
                    drawBottomRightScaleBadge(ctx, output.width, output.height, maps, renderer);
                } catch (badgeErr) {
                    console.warn('Failed to draw scale metadata badge on output PNG', badgeErr);
                }
            }
            return output;
        }

        function drawBottomRightScaleBadge(ctx, canvasW, canvasH, maps, renderer) {
            if (!maps || !maps.length) return;
            const entries = [];
            for (let i = 0; i < maps.length; i++) {
                const map = maps[i];
                let actualW = Math.round(map.width);
                let actualH = Math.round(map.height);
                if (renderer && typeof renderer.calculateLayout === 'function') {
                    try {
                        const layout = renderer.calculateLayout(map);
                        if (layout && layout.totalResWidth > 0 && layout.totalResHeight > 0) {
                            actualW = layout.totalResWidth;
                            actualH = layout.totalResHeight;
                        }
                    } catch (_) {}
                }
                const scaledW = Math.round(map.width);
                const scaledH = Math.round(map.height);
                const diffW = actualW - scaledW;
                const diffH = actualH - scaledH;
                const pctW = actualW > 0 ? (1 - scaledW / actualW) * 100 : 0;
                const pctH = actualH > 0 ? (1 - scaledH / actualH) * 100 : 0;
                entries.push({
                    name: map.name || \`Map \${i + 1}\`,
                    actualW, actualH,
                    scaledW, scaledH,
                    diffW, diffH,
                    pctW, pctH,
                    isReduced: diffW > 0 || diffH > 0,
                    isNative: diffW === 0 && diffH === 0
                });
            }

            const lines = [];
            lines.push({ text: 'CANVAS & SCALE SPECIFICATION', color: '#38bdf8', bold: true });
            lines.push({ text: \`Canvas Size: \${canvasW} × \${canvasH} px\`, color: '#f8fafc', bold: true });

            if (entries.length === 1) {
                const e = entries[0];
                lines.push({ text: \`Pixel Map: \${e.name}\`, color: '#94a3b8' });
                lines.push({ text: \`Actual Native Size: \${e.actualW} × \${e.actualH} px\`, color: '#f8fafc', bold: true });
                lines.push({ text: \`Scaled Output Size: \${e.scaledW} × \${e.scaledH} px\`, color: '#f8fafc' });
                if (e.isReduced) {
                    const pctText = Math.abs(e.pctW - e.pctH) < 0.1 ? \`\${e.pctW.toFixed(1)}%\` : \`W \${e.pctW.toFixed(1)}%, H \${e.pctH.toFixed(1)}%\`;
                    lines.push({ text: \`Reduced: \${pctText} (-\${e.diffW} × -\${e.diffH} px)\`, color: '#fbbf24', bold: true });
                } else if (e.isNative) {
                    lines.push({ text: \`Scale: 100.0% (Native 1:1, 0 px change)\`, color: '#34d399', bold: true });
                } else {
                    lines.push({ text: \`Enlarged: +\${Math.abs(e.pctW).toFixed(1)}% (+\${-e.diffW} × +\${-e.diffH} px)\`, color: '#f472b6', bold: true });
                }
            } else {
                entries.forEach((e, idx) => {
                    lines.push({ text: \`\${idx + 1}. \${e.name} (Actual: \${e.actualW}×\${e.actualH} px → Scaled: \${e.scaledW}×\${e.scaledH} px)\`, color: '#cbd5e1' });
                    if (e.isReduced) {
                        lines.push({ text: \`   Reduced: \${e.pctW.toFixed(1)}% (-\${e.diffW} × -\${e.diffH} px)\`, color: '#fbbf24', bold: true });
                    } else if (e.isNative) {
                        lines.push({ text: \`   Scale: 100% (Native 1:1)\`, color: '#34d399', bold: true });
                    } else {
                        lines.push({ text: \`   Enlarged: +\${Math.abs(e.pctW).toFixed(1)}% (+\${-e.diffW} × +\${-e.diffH} px)\`, color: '#f472b6', bold: true });
                    }
                });
            }

            const fs = Math.max(12, Math.min(26, Math.round(Math.min(canvasW, canvasH) * 0.015)));
            const lineH = Math.round(fs * 1.5);
            const padX = Math.round(fs * 1.1);
            const padY = Math.round(fs * 0.9);
            const margin = Math.max(16, Math.round(Math.min(canvasW, canvasH) * 0.018));

            ctx.save();
            ctx.textBaseline = 'top';
            let maxLineW = 0;
            lines.forEach(l => {
                ctx.font = \`\${l.bold ? 'bold ' : ''}\${fs}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace\`;
                const w = ctx.measureText(l.text).width;
                if (w > maxLineW) maxLineW = w;
            });

            const badgeW = Math.ceil(maxLineW + padX * 2);
            const badgeH = Math.ceil(lines.length * lineH + padY * 2);
            const badgeX = Math.max(margin, canvasW - badgeW - margin);
            const badgeY = Math.max(margin, canvasH - badgeH - margin);

            ctx.fillStyle = 'rgba(7, 13, 24, 0.94)';
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);

            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = Math.max(1.5, Math.round(fs * 0.08));
            ctx.strokeRect(badgeX + 0.5, badgeY + 0.5, badgeW - 1, badgeH - 1);

            ctx.fillStyle = '#38bdf8';
            ctx.fillRect(badgeX, badgeY, badgeW, Math.max(3, Math.round(fs * 0.2)));

            lines.forEach((l, i) => {
                ctx.font = \`\${l.bold ? 'bold ' : ''}\${fs}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace\`;
                ctx.fillStyle = l.color || '#ffffff';
                ctx.fillText(l.text, badgeX + padX, badgeY + padY + i * lineH);
            });
            ctx.restore();
        }`;

// Normalize line endings for replacement
const normalizedTarget = target.replace(/\r\n/g, '\n');
const isCRLF = content.includes('\r\n');
const normalizedContent = content.replace(/\r\n/g, '\n');

if (!normalizedContent.includes(normalizedTarget)) {
    console.error('Target not found in content!');
    process.exit(1);
}

let updated = normalizedContent.replace(normalizedTarget, replacement.replace(/\r\n/g, '\n'));
if (isCRLF) {
    updated = updated.replace(/\n/g, '\r\n');
}

fs.writeFileSync(path, updated, 'utf8');
console.log('Successfully patched src/external-output-renderer.js');

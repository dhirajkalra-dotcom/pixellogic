(function (root) {
    'use strict';
    function validateSize(width, height) {
        if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 16384 || height > 16384 || width * height > 64000000) {
            throw new Error('External output requires dimensions of 1-16384 pixels, up to 64 megapixels per surface.');
        }
    }
    function placement(sourceWidth, sourceHeight, viewportWidth, viewportHeight, mode) {
        const scale = mode === 'actual' ? 1 : Math.min(viewportWidth / sourceWidth, viewportHeight / sourceHeight);
        const width = Math.max(1, Math.round(sourceWidth * scale));
        const height = Math.max(1, Math.round(sourceHeight * scale));
        return { x: Math.floor((viewportWidth - width) / 2), y: Math.floor((viewportHeight - height) / 2), width, height };
    }

    function validateFrame(frame, calculateLayout) {
        if (!frame || !['pixelMap', 'canvas'].includes(frame.source?.kind)) throw new Error('Select a pixel map or an output canvas.');
        if (!['none', 'overlay', 'inside', 'outside'].includes(frame.masks) || typeof frame.drawings !== 'boolean' || typeof frame.annotations !== 'boolean') {
            throw new Error('Invalid external output options.');
        }
        let pixels = 0, count = 0;
        function size(width, height) {
            validateSize(width, height);
            pixels += width * height;
            if (pixels > 128000000) throw new Error('This output exceeds the 128 megapixel source-rendering budget.');
        }
        function mapSize(map, depth = 0) {
            if (!map || ++count > 2000 || depth > 8) throw new Error('This output contains too many nested maps.');
            if (map.details?.logo?.src && !/^data:image\/(?:png|jpeg|jpg|gif|webp|svg\+xml);/i.test(map.details.logo.src)) {
                throw new Error('External output logos must be uploaded image files.');
            }
            if (map.composite?.enabled) {
                const comp = map.composite;
                const children = comp.maps?.length ? comp.maps : [comp.primary, comp.secondary, comp.tertiary].filter(Boolean);
                if (!children.length) throw new Error('The composite map has no sources.');
                children.forEach(child => mapSize(child, depth + 1));
            }
            const layout = calculateLayout(map);
            if (layout.totalPanels > 500000) throw new Error('External output supports up to 500,000 panels per map.');
            size(layout.totalResWidth, layout.totalResHeight);
        }
        if (frame.source.kind === 'pixelMap') mapSize(frame.source.map);
        else {
            const canvas = frame.source.canvas;
            if (!canvas || !Array.isArray(canvas.maps)) throw new Error('The output canvas is invalid.');
            size(canvas.width, canvas.height);
            canvas.maps.forEach(map => {
                if (![map.x, map.y, map.width, map.height].every(Number.isFinite) || map.width <= 0 || map.height <= 0) {
                    throw new Error('A map has invalid output placement or dimensions.');
                }
                for (const key of ['cropLeft', 'cropRight', 'cropTop', 'cropBottom', 'sliceLeft', 'sliceRight']) {
                    if (map[key] != null && (!Number.isFinite(map[key]) || map[key] < 0)) throw new Error('A map has an invalid crop.');
                }
                mapSize(map);
            });
        }
        return frame;
    }

    function createOutputRenderer(renderer, createCanvas) {
        const cache = PixelLogicRendering.createBitmapCache();
        function placedPixels(map, nativeWidth, nativeHeight) {
            const left = Math.min(nativeWidth, Math.max(0, Math.floor(map.cropLeft ?? map.sliceLeft ?? 0)));
            const top = Math.min(nativeHeight, Math.max(0, Math.floor(map.cropTop ?? 0)));
            const width = Math.max(0, nativeWidth - left - Math.max(0, Math.floor(map.cropRight ?? map.sliceRight ?? 0)));
            const height = Math.max(0, nativeHeight - top - Math.max(0, Math.floor(map.cropBottom ?? 0)));
            const sx = map.width / nativeWidth, sy = map.height / nativeHeight;
            return { left, top, width, height, x: map.x + left * sx, y: map.y + top * sy, outputWidth: width * sx, outputHeight: height * sy };
        }
        function withoutCoordinates(map) {
            const copy = { ...map };
            if (map.details) copy.details = { ...map.details, coords: { ...map.details.coords, enabled: false } };
            if (map.composite?.enabled) {
                copy.composite = { ...map.composite };
                if (map.composite.maps) copy.composite.maps = map.composite.maps.map(withoutCoordinates);
                for (const key of ['primary', 'secondary', 'tertiary']) {
                    if (map.composite[key]) copy.composite[key] = withoutCoordinates(map.composite[key]);
                }
            }
            return copy;
        }
        function mapBitmap(frame, map, png) {
            const renderedMap = png ? withoutCoordinates(map) : map;
            const draw = () => {
                const bitmap = createCanvas();
                renderer.drawVisualizerCanvas(bitmap, renderedMap, { forceFullRes: true, transparent: true, suppressDetails: !frame.annotations });
                return bitmap;
            };
            const bitmap = map.details?.coords?.enabled || map.composite?.enabled
                ? draw() : cache.get(PixelLogicRendering.bitmapKey(renderedMap, { annotations: frame.annotations }), draw);
            if (!(bitmap.width > 0 && bitmap.height > 0)) throw new Error('The selected map has no renderable pixels.');
            return bitmap;
        }
        function render(frame, png = null) {
            const source = frame.source;
            const output = createCanvas();
            const maps = source.kind === 'pixelMap' ? [source.map] : source.canvas.maps;
            if (source.kind === 'pixelMap') {
                renderer.drawVisualizerCanvas(output, source.map, { forceFullRes: true, transparent: true, suppressDetails: !frame.annotations });
                return output;
            }
            output.width = source.canvas.width;
            output.height = source.canvas.height;
            const ctx = output.getContext('2d');
            if (!ctx) throw new Error('Could not create an external output canvas.');
            ctx.save();
            if (png) ctx.translate(-png.x, -png.y);
            for (const [index, map] of maps.entries()) {
                const bitmap = png ? png.bitmaps[index] : mapBitmap(frame, map, false);
                const rect = placedPixels(map, bitmap.width, bitmap.height);
                if (!rect.width || !rect.height) continue;
                ctx.drawImage(bitmap, rect.left, rect.top, rect.width, rect.height, rect.x, rect.y, rect.outputWidth, rect.outputHeight);
                if (png && rect.x - png.x < output.width && rect.y - png.y < output.height) {
                    ctx.save();
                    ctx.translate(rect.x, rect.y);
                    renderer.drawCoordinatesOverlay(ctx, {
                        width: Math.min(rect.outputWidth, output.width - (rect.x - png.x)),
                        height: Math.min(rect.outputHeight, output.height - (rect.y - png.y))
                    },
                        Math.round((rect.x - png.x) * 1000) / 1000, Math.round((rect.y - png.y) * 1000) / 1000,
                        map.details?.coords?.fontSize, '#ffffff', true);
                    ctx.restore();
                }
            }
            if (source.kind === 'canvas' && frame.drawings) renderer.drawCanvasDrawingsToContext(ctx, source.canvas);
            ctx.restore();
            if (source.kind === 'canvas') {
                if (source.canvas.masks?.length && ['inside', 'outside'].includes(frame.masks)) {
                    const stencil = createCanvas();
                    stencil.width = output.width;
                    stencil.height = output.height;
                    const maskContext = stencil.getContext('2d');
                    if (png) maskContext.translate(-png.x, -png.y);
                    for (const mask of source.canvas.masks) maskContext.fill(renderer.buildMaskPath(mask));
                    ctx.globalCompositeOperation = frame.masks === 'inside' ? 'destination-in' : 'destination-out';
                    ctx.drawImage(stencil, 0, 0);
                    ctx.globalCompositeOperation = 'source-over';
                    stencil.width = stencil.height = 0;
                }
                if (frame.masks === 'overlay') {
                    ctx.save();
                    if (png) ctx.translate(-png.x, -png.y);
                    for (const mask of source.canvas.masks || []) {
                        ctx.save();
                        ctx.globalAlpha = Math.max(0, Math.min(1, (mask.opacity ?? 100) / 100));
                        ctx.fillStyle = mask.color || '#000000';
                        ctx.fill(renderer.buildMaskPath(mask));
                        ctx.restore();
                    }
                    ctx.restore();
                }
            }
            if (png) {
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
                    name: map.name || `Map ${i + 1}`,
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
            lines.push({ text: `Canvas Size: ${canvasW} × ${canvasH} px`, color: '#f8fafc', bold: true });

            if (entries.length === 1) {
                const e = entries[0];
                lines.push({ text: `Pixel Map: ${e.name}`, color: '#94a3b8' });
                lines.push({ text: `Actual Native Size: ${e.actualW} × ${e.actualH} px`, color: '#f8fafc', bold: true });
                lines.push({ text: `Scaled Output Size: ${e.scaledW} × ${e.scaledH} px`, color: '#f8fafc' });
                if (e.isNative) {
                    lines.push({ text: 'Scale: 100.0% (Native 1:1, No Change)', color: '#34d399', bold: true });
                } else if (e.isReduced) {
                    const pctText = Math.abs(e.pctW - e.pctH) < 0.1 ? `${e.pctW.toFixed(1)}%` : `W -${e.pctW.toFixed(1)}%, H -${e.pctH.toFixed(1)}%`;
                    lines.push({ text: `Reduced: ${pctText} (-${e.diffW} × -${e.diffH} px)`, color: '#fbbf24', bold: true });
                } else if (e.diffW <= 0 && e.diffH <= 0) {
                    const pctText = Math.abs(e.pctW - e.pctH) < 0.1 ? `+${Math.abs(e.pctW).toFixed(1)}%` : `W +${Math.abs(e.pctW).toFixed(1)}%, H +${Math.abs(e.pctH).toFixed(1)}%`;
                    lines.push({ text: `Enlarged: ${pctText} (+${-e.diffW} × +${-e.diffH} px)`, color: '#f472b6', bold: true });
                } else {
                    const wText = e.diffW >= 0 ? `-${e.pctW.toFixed(1)}% (-${e.diffW}px)` : `+${Math.abs(e.pctW).toFixed(1)}% (+${-e.diffW}px)`;
                    const hText = e.diffH >= 0 ? `-${e.pctH.toFixed(1)}% (-${e.diffH}px)` : `+${Math.abs(e.pctH).toFixed(1)}% (+${-e.diffH}px)`;
                    lines.push({ text: `Scale Change: W ${wText}, H ${hText}`, color: '#fbbf24', bold: true });
                }
            } else {
                entries.forEach((e, idx) => {
                    lines.push({ text: `${idx + 1}. ${e.name} (Actual: ${e.actualW}×${e.actualH} px → Scaled: ${e.scaledW}×${e.scaledH} px)`, color: '#cbd5e1' });
                    if (e.isReduced) {
                        lines.push({ text: `   Reduced: ${e.pctW.toFixed(1)}% (-${e.diffW} × -${e.diffH} px)`, color: '#fbbf24', bold: true });
                    } else if (e.isNative) {
                        lines.push({ text: `   Scale: 100% (Native 1:1)`, color: '#34d399', bold: true });
                    } else {
                        lines.push({ text: `   Enlarged: +${Math.abs(e.pctW).toFixed(1)}% (+${-e.diffW} × +${-e.diffH} px)`, color: '#f472b6', bold: true });
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
                ctx.font = `${l.bold ? 'bold ' : ''}${fs}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
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
                ctx.font = `${l.bold ? 'bold ' : ''}${fs}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace`;
                ctx.fillStyle = l.color || '#ffffff';
                ctx.fillText(l.text, badgeX + padX, badgeY + padY + i * lineH);
            });
            ctx.restore();
        }
        function renderPNG(frame) {
            if (frame.source.kind !== 'canvas') throw new Error('Enable Edit Mode to create an output canvas before saving a PNG.');
            validateFrame(frame, renderer.calculateLayout);
            let pixels = 0;
            const bitmaps = frame.source.canvas.maps.map(map => {
                const bitmap = mapBitmap(frame, map, true);
                pixels += bitmap.width * bitmap.height;
                if (pixels > 128000000) throw new Error('This PNG exceeds the 128 megapixel source-rendering budget.');
                return bitmap;
            });
            const rects = frame.source.canvas.maps.map((map, index) => placedPixels(map, bitmaps[index].width, bitmaps[index].height))
                .filter(rect => rect.width > 0 && rect.height > 0);
            if (!rects.length) throw new Error('Add a visible pixel map before saving a PNG.');
            const x = Math.min(...rects.map(rect => rect.x)), y = Math.min(...rects.map(rect => rect.y));
            const width = Math.max(...rects.map(rect => rect.x + rect.outputWidth)) - x;
            const height = Math.max(...rects.map(rect => rect.y + rect.outputHeight)) - y;
            return {
                canvas: render(frame, { x, y, bitmaps }),
                clipped: width > frame.source.canvas.width || height > frame.source.canvas.height
            };
        }
        return { render, renderPNG, clear: () => cache.clear() };
    }
    const api = { placement, createOutputRenderer, validateSize, validateFrame };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PixelLogicExternalRenderer = api;
})(globalThis);

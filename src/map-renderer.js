(function (root) {
    'use strict';
    function createRenderer(environment) {
        const state = environment.state;
        const getActiveCanvas = environment.getActiveCanvas;
const calculateLayout = (map) => {
        if(!map) return {};

        const calculateLayoutSimple = (inputMap) => {
            let widthInMeters = parseFloat(inputMap.screenWidthValue) || 0;
            let heightInMeters = parseFloat(inputMap.screenHeightValue) || 0;
            const unit = inputMap.screenDimensionsUnit || 'm';

            const toMeters = { m: 1, cm: 0.01, mm: 0.001, ft: 0.3048, in: 0.0254 };
            widthInMeters *= toMeters[unit];
            heightInMeters *= toMeters[unit];

            // Base area (uniform panels)
            const { panelWidthMm, panelHeightMm, panelResWidth, panelResHeight } = inputMap;
            if (!(widthInMeters > 0 && heightInMeters > 0 && panelWidthMm > 0 && panelHeightMm > 0)) return {};
            const screenWidthMm = widthInMeters * 1000;
            const screenHeightMm = heightInMeters * 1000;

            // Uniform-only calculation
            const panelsHorizontally = Math.ceil(screenWidthMm / panelWidthMm);
            const panelsVertically = Math.ceil(screenHeightMm / panelHeightMm);
            const totalPanels = panelsHorizontally * panelsVertically;
            const totalResWidth = panelsHorizontally * panelResWidth;
            const totalResHeight = panelsVertically * panelResHeight;
            const totalPixels = totalResWidth * totalResHeight;
            return { panelsHorizontally, panelsVertically, totalPanels, totalResWidth, totalResHeight, totalPixels, screenWidthMm, screenHeightMm, panelWidthMm, panelHeightMm, panelResWidth, panelResHeight };
        };

        if (map.composite && map.composite.enabled) {
            const comp = map.composite || {};
            const compMaps = Array.isArray(comp.maps) && comp.maps.length
                ? comp.maps
                : [comp.primary || null, comp.secondary || null, comp.tertiary || null].filter(Boolean);
            if (compMaps.length) {
                const compCalcs = Array.isArray(comp.mapCalcs) && comp.mapCalcs.length ? comp.mapCalcs : null;
                const normalizeCalc = (m, idx) => {
                    const c = calculateLayoutSimple(m) || {};
                    const totalPanels = (c.totalPanels > 0)
                        ? c.totalPanels
                        : (Array.isArray(m?.panels) ? m.panels.length : 0);
                    return {
                        id: m?.id,
                        name: m?.name || `Map ${idx + 1}`,
                        panelsHorizontally: Number.isFinite(c.panelsHorizontally) ? c.panelsHorizontally : null,
                        panelsVertically: Number.isFinite(c.panelsVertically) ? c.panelsVertically : null,
                        totalPanels,
                        totalResWidth: Number(c.totalResWidth) || 0,
                        totalResHeight: Number(c.totalResHeight) || 0,
                        screenWidthMm: Number(c.screenWidthMm) || 0,
                        screenHeightMm: Number(c.screenHeightMm) || 0,
                        panelWidthMm: Number(m?.panelWidthMm) || Number(c.panelWidthMm) || 0,
                        panelHeightMm: Number(m?.panelHeightMm) || Number(c.panelHeightMm) || 0,
                        panelResWidth: Number(m?.panelResWidth) || Number(c.panelResWidth) || 0,
                        panelResHeight: Number(m?.panelResHeight) || Number(c.panelResHeight) || 0
                    };
                };
                const calcsList = compCalcs
                    ? compCalcs.map((c, idx) => Object.assign({
                        id: c.id,
                        name: c.name || `Map ${idx + 1}`,
                        panelsHorizontally: Number.isFinite(c.panelsHorizontally) ? c.panelsHorizontally : null,
                        panelsVertically: Number.isFinite(c.panelsVertically) ? c.panelsVertically : null,
                        totalPanels: Number(c.totalPanels) || 0,
                        totalResWidth: Number(c.totalResWidth) || 0,
                        totalResHeight: Number(c.totalResHeight) || 0,
                        screenWidthMm: Number(c.screenWidthMm) || 0,
                        screenHeightMm: Number(c.screenHeightMm) || 0,
                        panelWidthMm: Number(c.panelWidthMm) || 0,
                        panelHeightMm: Number(c.panelHeightMm) || 0,
                        panelResWidth: Number(c.panelResWidth) || 0,
                        panelResHeight: Number(c.panelResHeight) || 0
                    }, c || {}))
                    : compMaps.map(normalizeCalc);
                const totalPanels = calcsList.reduce((sum, c) => sum + (Number(c.totalPanels) || 0), 0);
                const placement = comp.placement || 'right';
                const isHorizontal = (placement === 'left' || placement === 'right');

                let totalResWidth = Number(comp.composedWidthPx);
                let totalResHeight = Number(comp.composedHeightPx);
                if (!(totalResWidth > 0 && totalResHeight > 0)) {
                    if (isHorizontal) {
                        totalResWidth = calcsList.reduce((sum, c) => sum + (Number(c.totalResWidth) || 0), 0);
                        totalResHeight = calcsList.length ? Math.max(...calcsList.map(c => Number(c.totalResHeight) || 0)) : 0;
                    } else {
                        totalResWidth = calcsList.length ? Math.max(...calcsList.map(c => Number(c.totalResWidth) || 0)) : 0;
                        totalResHeight = calcsList.reduce((sum, c) => sum + (Number(c.totalResHeight) || 0), 0);
                    }
                }

                let screenWidthMm = Number(comp.screenWidthMm);
                let screenHeightMm = Number(comp.screenHeightMm);
                if (!(screenWidthMm > 0 && screenHeightMm > 0)) {
                    if (isHorizontal) {
                        screenWidthMm = calcsList.reduce((sum, c) => sum + (Number(c.screenWidthMm) || 0), 0);
                        screenHeightMm = calcsList.length ? Math.max(...calcsList.map(c => Number(c.screenHeightMm) || 0)) : 0;
                    } else {
                        screenWidthMm = calcsList.length ? Math.max(...calcsList.map(c => Number(c.screenWidthMm) || 0)) : 0;
                        screenHeightMm = calcsList.reduce((sum, c) => sum + (Number(c.screenHeightMm) || 0), 0);
                    }
                }

                const panelTypes = calcsList.map((c, idx) => ({
                    name: c.name || `Map ${idx + 1}`,
                    panelWidthMm: Number(c.panelWidthMm) || 0,
                    panelHeightMm: Number(c.panelHeightMm) || 0,
                    panelResWidth: Number(c.panelResWidth) || 0,
                    panelResHeight: Number(c.panelResHeight) || 0,
                    totalPanels: Number(c.totalPanels) || 0
                }));

                const totalPixels = (totalResWidth || 0) * (totalResHeight || 0);
                return {
                    panelsHorizontally: null,
                    panelsVertically: null,
                    totalPanels,
                    totalResWidth,
                    totalResHeight,
                    totalPixels,
                    screenWidthMm,
                    screenHeightMm,
                    isComposite: true,
                    panelTypes
                };
            }
        }

        return calculateLayoutSimple(map);
    };

const formatAspectRatio = (width, height) => {
        const normalizedWidth = Math.round(Number(width) || 0);
        const normalizedHeight = Math.round(Number(height) || 0);
        if (normalizedWidth <= 0 || normalizedHeight <= 0) return 'N/A';
        const gcd = (a, b) => b === 0 ? a : gcd(b, a % b);
        const divisor = gcd(normalizedWidth, normalizedHeight);
        const decimalRatio = Number((normalizedWidth / normalizedHeight).toFixed(2));
        const reducedRatio = `${normalizedWidth / divisor}:${normalizedHeight / divisor}`;
        const decimalLabel = `${decimalRatio}:1`;
        return reducedRatio === decimalLabel ? reducedRatio : `${reducedRatio} (${decimalLabel})`;
    };

const getPanelPitchMm = (map) => {
        if (!map) return null;
        if (Number.isFinite(map.panelPitchMm)) return Number(map.panelPitchMm);
        if (Number.isFinite(map.pitchMm)) return Number(map.pitchMm);
        const pw = Number(map.panelWidthMm);
        const ph = Number(map.panelHeightMm);
        const rw = Number(map.panelResWidth);
        const rh = Number(map.panelResHeight);
        const candidates = [];
        if (isFinite(pw) && isFinite(rw) && rw > 0) candidates.push(pw / rw);
        if (isFinite(ph) && isFinite(rh) && rh > 0) candidates.push(ph / rh);
        if (candidates.length) {
            const avg = candidates.reduce((a,b)=>a+b,0) / candidates.length;
            return Math.round(avg * 100) / 100;
        }
        return null;
    };

const getCompositePitchMm = (map) => {
        if (!map || !map.composite || !map.composite.enabled) return getPanelPitchMm(map);
        const comp = map.composite;
        const list = Array.isArray(comp.maps) && comp.maps.length
            ? comp.maps
            : [comp.primary || map, comp.secondary || null, comp.tertiary || null].filter(Boolean);
        const pitches = list.map(getPanelPitchMm).filter(p => Number.isFinite(p));
        if (pitches.length >= 2) {
            const min = Math.min(...pitches);
            const max = Math.max(...pitches);
            if ((max - min) <= 0.1) {
                const avg = pitches.reduce((a,b)=>a+b,0) / pitches.length;
                return Math.round(avg * 100) / 100;
            }
        }
        return Number.isFinite(pitches[0]) ? pitches[0] : getPanelPitchMm(map);
    };

const composeVisualizerCanvasMulti = (canvas, maps, placement, gapPx = 0, options = {}) => {
            if (!canvas || !Array.isArray(maps)) return;
            const list = maps.filter(Boolean);
            if (!list.length) return;
            if (list.length === 1) {
                drawVisualizerCanvas(canvas, list[0], options);
                return;
            }

            const forceFullRes = !!(options && options.forceFullRes);
            let fixedScale = options && Number.isFinite(options.fixedScale) ? options.fixedScale : null;
            const ignorePhysicalScale = !!(options && options.ignorePhysicalScale);
            if (!forceFullRes && !Number.isFinite(fixedScale)) {
                try {
                    const fullPixelsMax = list.reduce((acc, m) => {
                        const c = calculateLayout(m) || {};
                        const px = Math.max(1, (c.totalResWidth || 0) * (c.totalResHeight || 0));
                        return Math.max(acc, px);
                    }, 1);
                    const userScale = Math.max(0.05, Math.min(1, (state.visualizerState?.previewScale ?? 1)));
                    const savedCapMp = (() => { try { return parseFloat(localStorage.getItem('pixi-logic-preview-cap-mp')); } catch(_) { return NaN; } })();
                    const capMp = Number.isFinite(savedCapMp) && savedCapMp > 0.25 ? savedCapMp : PixelLogicRendering.FULL_PREVIEW_MP;
                    fixedScale = PixelLogicRendering.previewScale(fullPixelsMax, 1, userScale, capMp);
                } catch (_) {
                    fixedScale = null;
                }
            }

            const renderOpts = Object.assign({}, options, Number.isFinite(fixedScale) ? { fixedScale } : {});
            const ordered = (placement === 'left' || placement === 'top') ? [...list].reverse() : list;
            const temps = ordered.map((m) => {
                const c = document.createElement('canvas');
                drawVisualizerCanvas(c, m, renderOpts);
                return { map: m, canvas: c };
            });

            const getPxPerMm = (c) => {
                const vals = [];
                if ((c.totalResWidth || 0) > 0 && (c.screenWidthMm || 0) > 0) vals.push(c.totalResWidth / c.screenWidthMm);
                if ((c.totalResHeight || 0) > 0 && (c.screenHeightMm || 0) > 0) vals.push(c.totalResHeight / c.screenHeightMm);
                if (!vals.length) return null;
                return vals.reduce((a,b)=>a+b,0) / vals.length;
            };

            let basePxPerMm = null;
            if (!ignorePhysicalScale) {
                try {
                    const baseCalcs = calculateLayout(ordered[0]) || {};
                    basePxPerMm = getPxPerMm(baseCalcs);
                } catch (_) {}
            }

            const sizes = temps.map((t) => {
                let scale = 1;
                if (!ignorePhysicalScale) {
                    try {
                        const calcs = calculateLayout(t.map) || {};
                        const pxPerMm = getPxPerMm(calcs);
                        if (Number.isFinite(basePxPerMm) && basePxPerMm > 0 && Number.isFinite(pxPerMm) && pxPerMm > 0) {
                            scale = basePxPerMm / pxPerMm;
                        }
                    } catch (_) {}
                }
                const w = Math.max(1, Math.round((t.canvas.width || 0) * scale));
                const h = Math.max(1, Math.round((t.canvas.height || 0) * scale));
                return { w, h, scale, canvas: t.canvas };
            });

            const gap = Math.max(0, Number(gapPx) || 0);
            const isHorizontal = (placement === 'left' || placement === 'right');
            const outW = isHorizontal
                ? sizes.reduce((sum, s, i) => sum + s.w + (i ? gap : 0), 0)
                : Math.max(...sizes.map(s => s.w));
            const outH = isHorizontal
                ? Math.max(...sizes.map(s => s.h))
                : sizes.reduce((sum, s, i) => sum + s.h + (i ? gap : 0), 0);

            environment.validateSize?.(Math.max(1, Math.trunc(outW)), Math.max(1, Math.trunc(outH)));
            canvas.width = Math.max(1, outW);
            canvas.height = Math.max(1, outH);
            const ctx = canvas.getContext('2d');
            if (!ctx) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            if (isHorizontal) {
                let x = 0;
                sizes.forEach((s) => {
                    const y = Math.round((outH - s.h) / 2);
                    ctx.drawImage(s.canvas, x, y, s.w, s.h);
                    x += s.w + gap;
                });
            } else {
                let y = 0;
                sizes.forEach((s) => {
                    ctx.drawImage(s.canvas, 0, y, s.w, s.h);
                    y += s.h + gap;
                });
            }
        };

const drawDetailsOverlays = (ctx, canvas, styleSource, calcs, options = {}) => {
            const details = styleSource.details;
            if (!details || !calcs) return;

            const centerX = canvas.width / 2;
            const centerY = canvas.height / 2;

            const createAngleGradient = (angleDeg, c1, c2, bounds) => {
                const rad = ((Number(angleDeg) || 0) * Math.PI) / 180;
                const dx = Math.cos(rad);
                const dy = Math.sin(rad);
                const bx = Number(bounds?.x) || 0;
                const by = Number(bounds?.y) || 0;
                const bw = Math.max(1, Number(bounds?.w) || canvas.width);
                const bh = Math.max(1, Number(bounds?.h) || canvas.height);
                const cx = bx + bw / 2;
                const cy = by + bh / 2;
                const halfW = bw / 2;
                const halfH = bh / 2;
                const x1 = cx - dx * halfW;
                const y1 = cy - dy * halfH;
                const x2 = cx + dx * halfW;
                const y2 = cy + dy * halfH;
                const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
                gradient.addColorStop(0, c1 || '#ffffff');
                gradient.addColorStop(0.5, c1 || '#ffffff');
                gradient.addColorStop(1, c2 || '#60a5fa');
                return gradient;
            };

            // Color Bars overlay
            if (details.colorBars && details.colorBars.enabled) {
                const preset = details.colorBars.preset || 'smpte';
                const orientation = details.colorBars.orientation || 'horizontal';
                const position = details.colorBars.position || 'full';
                const alpha = (details.colorBars.opacity ?? 100) / 100;
                const pct = Math.max(5, Math.min(100, details.colorBars.heightPercent ?? 30));
                const lenPct = Math.max(10, Math.min(100, details.colorBars.lengthPercent ?? 60));
                let colors;
                if (preset === 'rgbw') {
                    colors = ['#ff0000', '#00ff00', '#0000ff', '#ffffff'];
                } else if (preset === 'rgb') {
                    colors = ['#ff0000', '#00ff00', '#0000ff'];
                } else {
                    colors = ['#c0c0c0', '#ffff00', '#00ffff', '#00ff00', '#ff00ff', '#ff0000', '#0000ff'];
                }
                ctx.save();
                ctx.globalAlpha = alpha;
                let x = 0, y = 0, w = canvas.width, h = canvas.height;
                if (position !== 'full') {
                    if (orientation === 'horizontal') {
                        h = Math.round(canvas.height * (pct / 100));
                        const desiredW = Math.round(canvas.width * (lenPct / 100));
                        if (position === 'top') { y = 0; w = canvas.width; }
                        else if (position === 'bottom') { y = canvas.height - h; w = canvas.width; }
                        else if (position === 'center' || position === 'near-info') {
                            y = Math.round((canvas.height - h) / 2);
                            w = desiredW; x = Math.round((canvas.width - w) / 2);
                        }
                    } else {
                        w = Math.round(canvas.width * (pct / 100));
                        const desiredH = Math.round(canvas.height * (lenPct / 100));
                        if (position === 'left') { x = 0; h = canvas.height; }
                        else if (position === 'right') { x = canvas.width - w; h = canvas.height; }
                        else if (position === 'center' || position === 'near-info') {
                            x = Math.round((canvas.width - w) / 2);
                            h = desiredH; y = Math.round((canvas.height - h) / 2);
                        }
                    }
                }
                if (position === 'near-info' && details.info && details.info.enabled) {
                    const infoPadding = canvas.height / 30;
                    switch (details.info.position) {
                        case 'top-left':
                        case 'top-right':
                            if (orientation === 'horizontal') { y = infoPadding + Math.round((canvas.height * 0.12)); }
                            else { y = infoPadding; x = (details.info.position === 'top-left') ? (infoPadding + Math.round(canvas.width * 0.12)) : (canvas.width - w - infoPadding - Math.round(canvas.width * 0.12)); }
                            break;
                        case 'bottom-left':
                        case 'bottom-right':
                            if (orientation === 'horizontal') { y = canvas.height - h - infoPadding - Math.round((canvas.height * 0.12)); }
                            else { y = canvas.height - h - infoPadding; x = (details.info.position === 'bottom-left') ? (infoPadding + Math.round(canvas.width * 0.12)) : (canvas.width - w - infoPadding - Math.round(canvas.width * 0.12)); }
                            break;
                        case 'center':
                            break;
                    }
                }
                const offX = Math.round((details.colorBars.offsetXPercent ?? 0) / 100 * canvas.width);
                const offY = Math.round((details.colorBars.offsetYPercent ?? 0) / 100 * canvas.height);
                x = Math.max(0, Math.min(canvas.width - w, x + offX));
                y = Math.max(0, Math.min(canvas.height - h, y + offY));

                const n = colors.length;
                if (orientation === 'horizontal') {
                    const barW = w / n;
                    colors.forEach((c, i) => {
                        ctx.fillStyle = c;
                        ctx.fillRect(x + i * barW, y, Math.ceil(barW), h);
                    });
                } else {
                    const barH = h / n;
                    colors.forEach((c, i) => {
                        ctx.fillStyle = c;
                        ctx.fillRect(x, y + i * barH, w, Math.ceil(barH));
                    });
                }
                ctx.restore();
            }

            // Coordinates Overlay — draws the map's (X, Y) position (from Output Canvas placement if any, else 0,0)
            // Rendered in the top-left, scaled by details.coords.fontSize (20..300 where 100 = baseline).
            if (details.coords && details.coords.enabled) {
                try {
                    let mx = 0, my = 0;
                    try {
                        const cvs = getActiveCanvas();
                        const placed = cvs?.maps?.find(cm => String(cm.pixelMapId || cm.id) === String(styleSource.id));
                        if (placed) { mx = Math.round(placed.x || 0); my = Math.round(placed.y || 0); }
                    } catch(_) {}
                    drawCoordinatesOverlay(ctx, canvas, mx, my, details.coords.fontSize, details.shared?.color);
                } catch(_) {}
            }

            if(details.circle.enabled) {
                ctx.save();
                const circleStroke = details.circle?.gradientEnabled
                    ? createAngleGradient(details.circle?.gradientAngle ?? 90, details.circle?.gradientColor1, details.circle?.gradientColor2, {
                        x: centerX - ((Math.min(canvas.width, canvas.height) / 2) * (details.circle.radius / 100)),
                        y: centerY - ((Math.min(canvas.width, canvas.height) / 2) * (details.circle.radius / 100)),
                        w: ((Math.min(canvas.width, canvas.height) / 2) * (details.circle.radius / 100)) * 2,
                        h: ((Math.min(canvas.width, canvas.height) / 2) * (details.circle.radius / 100)) * 2
                    })
                    : (details.shared.color || '#ffffff');
                ctx.strokeStyle = circleStroke;
                ctx.lineWidth = details.shared.thickness;
                if (details.circle?.shadowEnabled) {
                    ctx.shadowColor = 'rgba(0,0,0,0.55)';
                    ctx.shadowBlur = Math.max(0, Number(details.circle?.shadowBlur) || 0);
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = Number(details.circle?.shadowOffsetY) || 0;
                }
                const cStyle = details.circle?.style || 'solid';
                if (cStyle === 'dashed') {
                    ctx.setLineDash([ctx.lineWidth * 4, ctx.lineWidth * 3]);
                    ctx.lineCap = 'butt';
                } else if (cStyle === 'dotted') {
                    ctx.setLineDash([Math.max(1, Math.round(ctx.lineWidth)), ctx.lineWidth * 2.5]);
                    ctx.lineCap = 'round';
                } else {
                    ctx.setLineDash([]);
                }
                ctx.beginPath();
                const radius = (Math.min(canvas.width, canvas.height) / 2) * (details.circle.radius / 100);
                ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
                ctx.stroke();
                ctx.restore();
            }

            if(details.cross.enabled) {
                ctx.save();
                const crossStroke = details.cross?.gradientEnabled
                    ? createAngleGradient(details.cross?.gradientAngle ?? 90, details.cross?.gradientColor1, details.cross?.gradientColor2, {
                        x: canvas.width * 0.12,
                        y: canvas.height * 0.12,
                        w: canvas.width * 0.76,
                        h: canvas.height * 0.76
                    })
                    : (details.shared.color || '#ffffff');
                ctx.strokeStyle = crossStroke;
                ctx.lineWidth = details.shared.thickness;
                if (details.cross?.shadowEnabled) {
                    ctx.shadowColor = 'rgba(0,0,0,0.55)';
                    ctx.shadowBlur = Math.max(0, Number(details.cross?.shadowBlur) || 0);
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = Number(details.cross?.shadowOffsetY) || 0;
                }
                const xStyle = details.cross?.style || 'solid';
                if (xStyle === 'dashed') {
                    ctx.setLineDash([ctx.lineWidth * 4, ctx.lineWidth * 3]);
                    ctx.lineCap = 'butt';
                } else if (xStyle === 'dotted') {
                    ctx.setLineDash([Math.max(1, Math.round(ctx.lineWidth)), ctx.lineWidth * 2.5]);
                    ctx.lineCap = 'round';
                } else {
                    ctx.setLineDash([]);
                }
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(canvas.width, canvas.height);
                ctx.moveTo(canvas.width, 0);
                ctx.lineTo(0, canvas.height);
                ctx.stroke();
                ctx.restore();
            }

            if(details.corners.enabled) {
                ctx.strokeStyle = details.shared.color;
                ctx.lineWidth = details.shared.thickness;
                const cornerLength = Math.min(canvas.width, canvas.height) * 0.1;
                ctx.beginPath();
                ctx.moveTo(0, cornerLength); ctx.lineTo(0, 0); ctx.lineTo(cornerLength, 0);
                ctx.moveTo(canvas.width - cornerLength, 0); ctx.lineTo(canvas.width, 0); ctx.lineTo(canvas.width, cornerLength);
                ctx.moveTo(0, canvas.height - cornerLength); ctx.lineTo(0, canvas.height); ctx.lineTo(cornerLength, canvas.height);
                ctx.moveTo(canvas.width - cornerLength, canvas.height); ctx.lineTo(canvas.width, canvas.height); ctx.lineTo(canvas.width, canvas.height - cornerLength);
                ctx.stroke();
            }

            if (details.cornerCircles && details.cornerCircles.enabled) {
                const rPct = 8;
                const r = Math.max(1, Math.round(Math.min(canvas.width, canvas.height) * (rPct / 100)));
                ctx.save();
                const cornerCircleStroke = details.cornerCircles?.gradientEnabled
                    ? createAngleGradient(details.cornerCircles?.gradientAngle ?? 90, details.cornerCircles?.gradientColor1, details.cornerCircles?.gradientColor2, {
                        x: 0,
                        y: 0,
                        w: Math.max(1, r * 2),
                        h: Math.max(1, r * 2)
                    })
                    : (details.shared.color || '#ffffff');
                ctx.strokeStyle = cornerCircleStroke;
                ctx.lineWidth = details.shared.thickness;
                if (details.cornerCircles?.shadowEnabled) {
                    ctx.shadowColor = 'rgba(0,0,0,0.55)';
                    ctx.shadowBlur = Math.max(0, Number(details.cornerCircles?.shadowBlur) || 0);
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = Number(details.cornerCircles?.shadowOffsetY) || 0;
                }
                const style = details.cornerCircles?.style || 'solid';
                if (style === 'dashed') {
                    ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]);
                    ctx.lineCap = 'butt';
                } else if (style === 'dotted') {
                    ctx.setLineDash([Math.max(1, Math.round(ctx.lineWidth)), ctx.lineWidth * 2]);
                    ctx.lineCap = 'round';
                } else {
                    ctx.setLineDash([]);
                }
                const positions = [
                    { x: 0 + r, y: 0 + r },
                    { x: canvas.width - r, y: 0 + r },
                    { x: 0 + r, y: canvas.height - r },
                    { x: canvas.width - r, y: canvas.height - r }
                ];
                positions.forEach(p => {
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
                    ctx.stroke();
                });
                ctx.restore();
            }

            if (details.info.enabled && details.info.badgeEnabled !== true) {
                const info = details.info;
                const renderScale = calcs.totalResWidth > 0 ? canvas.width / calcs.totalResWidth : 1;
                const autoFontSize = Math.min(canvas.width, canvas.height) * 0.08 * Math.max(0.5, Math.min(2, (Number(info.fontScale) || 100) / 100));
                let detailsFontSize = info.fontSizeMode === 'custom'
                    ? (Number(info.fontSize) || 48) * renderScale
                    : autoFontSize;
                detailsFontSize = Math.max(6, Math.min(canvas.height * 0.25, detailsFontSize));
                const fontFamily = info.fontFamily || 'Inter';
                const centeredLabel = info.position === 'center';
                const lineHeight = centeredLabel ? 1.12 : 1.25;

                const derivedName = (styleSource && typeof styleSource.name === 'string') ? styleSource.name.trim() : '';
                const fallbackName = (info && typeof info.name === 'string') ? info.name.trim() : '';
                const overlayTitle = derivedName || fallbackName;
                const normalizedTitle = overlayTitle.replace(/\s+/g, ' ');
                const metrics = [];
                if (info.showResolution !== false) metrics.push(`${calcs.totalResWidth} x ${calcs.totalResHeight} px`);
                const pitchMm = getCompositePitchMm(styleSource);
                if (info.showLedPitch !== false && Number.isFinite(pitchMm)) metrics.push(`P${Number(pitchMm).toFixed(2)} mm`);
                if (info.showAspectRatio !== false) metrics.push(`AR ${formatAspectRatio(calcs.totalResWidth, calcs.totalResHeight)}`);

                const orientationDeg = info.orientation === 'normal' ? 0 : Number(info.orientation) || 0;
                const isQuarterTurn = Math.abs(orientationDeg % 180) === 90;
                const showTitle = info.showScreenName !== false && normalizedTitle;
                const compactLines = [];
                if (showTitle) compactLines.push(normalizedTitle);
                if (metrics.length) compactLines.push(metrics.join(' / '));
                const forceThreeLines = !!showTitle && metrics.length > 1;
                const lineCandidates = forceThreeLines ? [] : [compactLines];
                if (showTitle && metrics.length > 1) {
                    for (let split = 1; split < metrics.length; split++) {
                        lineCandidates.push([
                            normalizedTitle,
                            metrics.slice(0, split).join(' / '),
                            metrics.slice(split).join(' / ')
                        ]);
                    }
                }
                if (showTitle && metrics.length) {
                    const titleWords = normalizedTitle.split(' ');
                    for (let split = 1; split < titleWords.length; split++) {
                        lineCandidates.push([
                            titleWords.slice(0, split).join(' '),
                            titleWords.slice(split).join(' '),
                            metrics.join(' / ')
                        ]);
                    }
                }
                if (!showTitle && metrics.length > 1) {
                    for (let split = 1; split < metrics.length; split++) {
                        lineCandidates.push([
                            metrics.slice(0, split).join(' / '),
                            metrics.slice(split).join(' / ')
                        ]);
                    }
                }
                const measureCandidate = (candidateLines, fontSize) => {
                    ctx.font = `bold ${fontSize}px ${fontFamily}`;
                    const candidatePadding = fontSize * (centeredLabel ? 0.35 : 0.55);
                    let candidateTextWidth = 0;
                    candidateLines.forEach(line => {
                        candidateTextWidth = Math.max(candidateTextWidth, ctx.measureText(line).width);
                    });
                    const candidateTextHeight = (candidateLines.length - 1) * fontSize * lineHeight + fontSize;
                    const candidateBoxWidth = candidateTextWidth + candidatePadding * 2;
                    const candidateBoxHeight = candidateTextHeight + candidatePadding * 2;
                    const candidatePlacementWidth = isQuarterTurn ? candidateBoxHeight : candidateBoxWidth;
                    const candidatePlacementHeight = isQuarterTurn ? candidateBoxWidth : candidateBoxHeight;
                    let candidateFitScale = Math.min(
                        1,
                        canvas.width / Math.max(1, candidatePlacementWidth + candidatePadding * 2),
                        canvas.height / Math.max(1, candidatePlacementHeight + candidatePadding * 2)
                    );
                    return {
                        fitScale: candidateFitScale,
                        padding: candidatePadding,
                        boxWidth: candidateBoxWidth,
                        boxHeight: candidateBoxHeight,
                        placementWidth: candidatePlacementWidth,
                        placementHeight: candidatePlacementHeight
                    };
                };
                let lines = lineCandidates[0] || compactLines;
                let selectedMeasurement = measureCandidate(lines, detailsFontSize);
                lineCandidates.slice(1).forEach(candidateLines => {
                    const candidateMeasurement = measureCandidate(candidateLines, detailsFontSize);
                    if (candidateMeasurement.fitScale > selectedMeasurement.fitScale + 0.01) {
                        lines = candidateLines;
                        selectedMeasurement = candidateMeasurement;
                    }
                });
                let padding;
                let boxWidth;
                let boxHeight;
                let placementWidth;
                let placementHeight;
                const measureBox = () => {
                    const measurement = measureCandidate(lines, detailsFontSize);
                    padding = measurement.padding;
                    boxWidth = measurement.boxWidth;
                    boxHeight = measurement.boxHeight;
                    placementWidth = measurement.placementWidth;
                    placementHeight = measurement.placementHeight;
                };
                measureBox();
                const fitScale = selectedMeasurement.fitScale;
                if (fitScale < 1) {
                    detailsFontSize = Math.max(1, detailsFontSize * fitScale * 0.98);
                    measureBox();
                }
                let x, y;
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';

                switch (info.position) {
                    case 'top-right': x = canvas.width - placementWidth - padding; y = padding; ctx.textAlign = 'right'; break;
                    case 'bottom-left': x = padding; y = canvas.height - placementHeight - padding; break;
                    case 'bottom-right': x = canvas.width - placementWidth - padding; y = canvas.height - placementHeight - padding; ctx.textAlign = 'right'; break;
                    case 'center': x = (canvas.width - placementWidth) / 2; y = (canvas.height - placementHeight) / 2; ctx.textAlign = 'center'; break;
                    default: x = padding; y = padding; break;
                }

                ctx.save();
                ctx.translate(x + placementWidth / 2, y + placementHeight / 2);
                ctx.rotate((orientationDeg * Math.PI) / 180);
                const boxX = -boxWidth / 2;
                const boxY = -boxHeight / 2;
                const cornerRadius = Math.min(padding * 0.45, boxWidth * 0.08, boxHeight * 0.18);
                const drawInfoBox = () => {
                    ctx.beginPath();
                    ctx.roundRect(boxX, boxY, boxWidth, boxHeight, cornerRadius);
                };
                if (!info.bgTransparent) {
                    ctx.fillStyle = info.backgroundColor || '#000000';
                    drawInfoBox();
                    ctx.fill();
                }
                if (info.showBorder !== false) {
                    ctx.strokeStyle = details.shared.color || '#ffffff';
                    ctx.lineWidth = Math.max(1, Number(details.shared.thickness) || 1);
                    drawInfoBox();
                    ctx.stroke();
                }
                ctx.fillStyle = details.shared.color;
                const textX = (ctx.textAlign === 'left') ? boxX + padding : (ctx.textAlign === 'right') ? boxX + boxWidth - padding : 0;
                const outlineText = info.bgTransparent !== false;
                if (outlineText) {
                    ctx.strokeStyle = 'rgba(0, 0, 0, 0.82)';
                    ctx.lineWidth = Math.max(1, detailsFontSize * 0.06);
                    ctx.lineJoin = 'round';
                }
                lines.forEach((line, index) => {
                    const textY = boxY + padding + (index * detailsFontSize * lineHeight);
                    if (outlineText) ctx.strokeText(line, textX, textY);
                    ctx.fillText(line, textX, textY);
                });
                ctx.restore();
            }

            const infoBadge = !!(details.info && details.info.badgeEnabled === true);
            if (infoBadge) {
                const sizePct = Math.max(10, Math.min(60, (details.info?.badgeSize ?? details.centerBadge?.size ?? 30)));
                const r = (Math.min(canvas.width, canvas.height) * (sizePct / 100)) / 2;
                const points = [];
                for (let i = 0; i < 6; i++) {
                    const angle = (Math.PI / 3) * i - Math.PI / 6;
                    points.push({ x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) });
                }
                const fillAlpha = ((details.info?.badgeOpacity ?? details.centerBadge?.opacity ?? 80)) / 100;
                ctx.save();
                const performanceLite = !options.forceFullRes && (() => { try { const v = parseFloat(localStorage.getItem('pixi-logic-preview-cap-mp')); return Number.isFinite(v) && v <= 1.25; } catch(_) { return false; } })();
                if ((details.info?.badgeShadow ?? details.centerBadge?.shadow ?? true) && !performanceLite) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.ellipse(centerX, centerY + (r * 0.62), r * 0.72, Math.max(4, r * 0.22), 0, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(0,0,0,0.36)';
                    ctx.shadowColor = 'rgba(0,0,0,0.45)';
                    ctx.shadowBlur = Math.max(0, Number(details.info?.badgeShadowBlur ?? 20));
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = Math.max(0, Number(details.info?.badgeShadowOffsetY ?? 12));
                    ctx.fill();
                    ctx.restore();

                    ctx.shadowColor = 'rgba(0,0,0,0.6)';
                    ctx.shadowBlur = Math.max(0, Number(details.info?.badgeShadowBlur ?? (r * 0.08)) || 0);
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = Number(details.info?.badgeShadowOffsetY ?? 0) || 0;
                }
                ctx.beginPath();
                ctx.moveTo(points[0].x, points[0].y);
                for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                ctx.closePath();
                const hex = (details.info?.badgeFillColor ?? '#000000');
                const parseHex = (h) => {
                    let c = h.replace('#','');
                    if (c.length === 3) c = c.split('').map(x=>x+x).join('');
                    const r = parseInt(c.substr(0,2),16) || 0;
                    const g = parseInt(c.substr(2,2),16) || 0;
                    const b = parseInt(c.substr(4,2),16) || 0;
                    return {r,g,b};
                };
                const {r:fr,g:fg,b:fb} = parseHex(hex);
                const badgeBounds = { x: centerX - (r * 1.05), y: centerY - (r * 0.95), w: r * 2.1, h: r * 1.9 };
                const badge3dPreset = String(details.info?.badge3dPreset || 'medium').toLowerCase();
                const badge3d = badge3dPreset === 'strong'
                    ? { hi: 0.34, lo: 0.28, edge: 0.24, metal: false }
                    : badge3dPreset === 'soft'
                        ? { hi: 0.16, lo: 0.12, edge: 0.1, metal: false }
                        : badge3dPreset === 'metallic'
                            ? { hi: 0.42, lo: 0.3, edge: 0.3, metal: true }
                            : { hi: 0.24, lo: 0.2, edge: 0.16, metal: false };
                if (details.info?.badgeGradientEnabled) {
                    const grad = createAngleGradient(details.info?.badgeGradientAngle ?? 90, details.info?.badgeGradientColor1, details.info?.badgeGradientColor2, badgeBounds);
                    ctx.fillStyle = grad;
                    ctx.globalAlpha = Math.max(0, Math.min(1, fillAlpha));
                } else {
                    ctx.fillStyle = `rgba(${fr}, ${fg}, ${fb}, ${fillAlpha})`;
                }
                ctx.fill();

                if (details.info?.badgeGradientEnabled) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(points[0].x, points[0].y);
                    for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
                    ctx.closePath();
                    ctx.clip();

                    const hi = ctx.createLinearGradient(centerX, centerY - r, centerX, centerY + r);
                    hi.addColorStop(0, `rgba(255,255,255,${badge3d.hi})`);
                    hi.addColorStop(0.42, `rgba(255,255,255,${badge3d.hi * 0.35})`);
                    hi.addColorStop(0.65, 'rgba(255,255,255,0)');
                    ctx.fillStyle = hi;
                    ctx.fillRect(centerX - r * 1.2, centerY - r * 1.1, r * 2.4, r * 1.2);

                    const lo = ctx.createLinearGradient(centerX, centerY - r * 0.2, centerX, centerY + r * 1.1);
                    lo.addColorStop(0, 'rgba(0,0,0,0)');
                    lo.addColorStop(0.55, `rgba(0,0,0,${badge3d.lo * 0.55})`);
                    lo.addColorStop(1, `rgba(0,0,0,${badge3d.lo})`);
                    ctx.fillStyle = lo;
                    ctx.fillRect(centerX - r * 1.2, centerY - r * 0.2, r * 2.4, r * 1.4);

                    if (badge3d.metal) {
                        const strip = ctx.createLinearGradient(centerX, centerY - r, centerX, centerY + r);
                        strip.addColorStop(0, 'rgba(255,255,255,0.0)');
                        strip.addColorStop(0.2, 'rgba(255,255,255,0.36)');
                        strip.addColorStop(0.38, 'rgba(255,255,255,0.05)');
                        strip.addColorStop(0.55, 'rgba(255,255,255,0.22)');
                        strip.addColorStop(0.75, 'rgba(255,255,255,0.02)');
                        strip.addColorStop(1, 'rgba(255,255,255,0.0)');
                        ctx.fillStyle = strip;
                        ctx.fillRect(centerX - r * 1.2, centerY - r, r * 2.4, r * 2);
                    }

                    ctx.restore();
                }
                const badgeStrokeEnabled = details.info?.badgeStroke !== false;
                const rawBadgeStroke = details.info?.badgeStroke;
                const badgeStroke = badgeStrokeEnabled
                    ? Math.max(0, Number(details.info?.badgeStrokeWidth ?? (Number.isFinite(rawBadgeStroke) ? rawBadgeStroke : (details.shared?.thickness ?? 0))))
                    : 0;
                if (badgeStroke > 0) {
                    ctx.lineWidth = badgeStroke;
                    if (details.info?.badgeBorderGradientEnabled) {
                        ctx.strokeStyle = createAngleGradient(details.info?.badgeBorderGradientAngle ?? 90, details.info?.badgeBorderGradientColor1, details.info?.badgeBorderGradientColor2, badgeBounds);
                    } else {
                        ctx.strokeStyle = details.info?.badgeStrokeColor ?? details.shared?.color ?? '#ffffff';
                    }
                    ctx.stroke();
                }
                if (details.info?.badgeGradientEnabled) {
                    ctx.save();
                    ctx.lineWidth = Math.max(1, badgeStroke * 0.7);
                    const edge = ctx.createLinearGradient(centerX, centerY - r, centerX, centerY + r);
                    edge.addColorStop(0, `rgba(255,255,255,${badge3d.edge})`);
                    edge.addColorStop(0.45, 'rgba(255,255,255,0.06)');
                    edge.addColorStop(1, `rgba(0,0,0,${badge3d.edge})`);
                    ctx.strokeStyle = edge;
                    ctx.stroke();
                    ctx.restore();
                }
                ctx.globalAlpha = 1;

                const textColor = details.info?.badgeTextColor ?? details.shared?.color ?? '#ffffff';
                const badgeBaseName = (styleSource && typeof styleSource.name === 'string') ? styleSource.name.trim() : '';
                const legacyBadgeName = (typeof details.info?.name === 'string') ? details.info.name.trim() : '';
                const rawBadgeText = (typeof details.info?.badgeText === 'string') ? details.info.badgeText : '';
                const resolvedBadgeText = rawBadgeText.trim() !== ''
                    ? rawBadgeText
                    : (badgeBaseName || legacyBadgeName);
                const lines = (resolvedBadgeText || '')
                    .split(/\r?\n/)
                    .map(l => l.trim())
                    .filter(l => l.length > 0);
                try {
                    if ((details.info?.badgeIncludeMetrics ?? false) && calcs && calcs.totalResWidth && calcs.totalResHeight) {
                        const sizeLine = `${(calcs.screenWidthMm/1000).toFixed(2)} x ${(calcs.screenHeightMm/1000).toFixed(2)} m`;
                        const pixelsLine = `${calcs.totalResWidth} x ${calcs.totalResHeight} px`;
                        const aspectRatioLine = `AR ${formatAspectRatio(calcs.totalResWidth, calcs.totalResHeight)}`;
                        const lower = lines.map(l=>l.toLowerCase());
                        if (!lower.some(l=>l.includes('size:') || /\d+(?:\.\d+)?\s*[x×]\s*\d+(?:\.\d+)?\s*m\b/.test(l))) lines.push(sizeLine);
                        if (!lower.some(l=>l.includes('pixels:') || /\d+\s*[x×]\s*\d+\s*px\b/.test(l))) lines.push(pixelsLine);
                        if (!lower.some(l=>l.includes('aspect ratio:') || l.startsWith('ar '))) lines.push(aspectRatioLine);
                    }
                } catch(_) {}
                const textScalePct = Math.max(5, Math.min(100, details.info?.badgeTextScale ?? 50));
                const badgeFontFamily = '"Arial Black", "Segoe UI Black", Arial, sans-serif';
                const badgeFont = (size) => `900 ${size}px ${badgeFontFamily}`;
                ctx.fillStyle = textColor;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const lineSpacingPct = Math.max(0, Math.min(300, details.info?.badgeLineSpacing ?? 50));
                const lineSpacingFactor = lineSpacingPct / 50;
                const innerW = Math.max(1, Math.sqrt(3) * r * 0.88);
                const innerH = Math.max(1, 2 * r * 0.80);
                // Compute max font size that fits all lines inside the badge
                const numLines = Math.max(1, lines.length);
                let probeFontSize = Math.max(6, Math.round(r));
                ctx.font = badgeFont(probeFontSize);
                let probeMaxW = 0;
                lines.forEach(l => { const m = ctx.measureText(l); if (m.width > probeMaxW) probeMaxW = m.width; });
                let probeLineH = Math.max(1, Math.round(probeFontSize * lineSpacingFactor));
                let probeTotalH = numLines * probeLineH;
                const fitScaleW = probeMaxW > 0 ? innerW / probeMaxW : 1;
                const fitScaleH = probeTotalH > 0 ? innerH / probeTotalH : 1;
                const fitScale = Math.min(fitScaleW, fitScaleH, 1);
                const maxFittingSize = Math.max(4, Math.floor(probeFontSize * fitScale));
                // Apply user's text scale percentage to the max fitting size
                let badgeFontSize = Math.max(1, Math.round(maxFittingSize * (textScalePct / 100)));
                let lineHeight = Math.max(1, Math.round(badgeFontSize * lineSpacingFactor));
                ctx.font = badgeFont(badgeFontSize);
                let maxLineW = 0;
                lines.forEach(l => { const m = ctx.measureText(l); if (m.width > maxLineW) maxLineW = m.width; });
                let totalHeight = lines.length === 0 ? badgeFontSize : (lines.length * lineHeight);
                const textCenterX = Math.round(centerX);
                let startY = Math.round(centerY - totalHeight / 2 + lineHeight / 2);
                ctx.lineJoin = 'round';
                ctx.strokeStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.lineWidth = Math.max(1, badgeFontSize * 0.14);
                lines.forEach((line, i) => {
                    const lineY = startY + i * lineHeight;
                    ctx.strokeText(line, textCenterX, lineY);
                    ctx.fillText(line, textCenterX, lineY);
                });
                ctx.restore();
            }

            // Logo Overlay
            const usePixelLogicLogo = !!details.logo?.pixelLogicEnabled;
            const logoImage = usePixelLogicLogo ? environment.pixelLogicLogoImage : details.logo?.imageObject;
            if (details.logo && (usePixelLogicLogo || details.logo.enabled) && logoImage && logoImage.complete && logoImage.naturalWidth > 0) {
                try {
                    const img = logoImage;
                    const sizePct = usePixelLogicLogo ? 18 : Math.max(5, Math.min(100, details.logo.size ?? 50));
                    const alpha = Math.max(0, Math.min(1, (details.logo.opacity ?? 100) / 100));
                    // Scale logo so its longest side = sizePct% of the shorter canvas dimension
                    const baseDim = Math.min(canvas.width, canvas.height);
                    const maxLogoSide = baseDim * (sizePct / 100);
                    const aspect = img.naturalWidth / Math.max(1, img.naturalHeight);
                    let drawW, drawH;
                    if (aspect >= 1) { drawW = maxLogoSide; drawH = maxLogoSide / aspect; }
                    else { drawH = maxLogoSide; drawW = maxLogoSide * aspect; }
                    const pad = baseDim * 0.03;
                    let lx, ly;
                    switch (usePixelLogicLogo ? 'bottom-right' : details.logo.position) {
                        case 'top-left':     lx = pad;                          ly = pad; break;
                        case 'top-right':    lx = canvas.width - drawW - pad;   ly = pad; break;
                        case 'bottom-left':  lx = pad;                          ly = canvas.height - drawH - pad; break;
                        case 'bottom-right': lx = canvas.width - drawW - pad;   ly = canvas.height - drawH - pad; break;
                        default:             lx = (canvas.width - drawW) / 2;   ly = (canvas.height - drawH) / 2; break;
                    }
                    ctx.save();
                    ctx.globalAlpha = alpha;
                    ctx.drawImage(img, Math.round(lx), Math.round(ly), Math.round(drawW), Math.round(drawH));
                    ctx.restore();
                } catch (_) { /* non-fatal */ }
            }
        };

const drawVisualizerCanvas = (targetCanvas, styleSource, options) => {
            // The styleSource object is the single source of truth.
            // It contains all necessary data, even for maps on the main canvas (as a snapshot).
            // This avoids looking up a source project that may have been deleted.
            // Non-destructive active preset overlay for Effects preview only
            let sourceForRender = styleSource;
            const suppressDetails = !!(options && options.suppressDetails);
            try {
                const isEffectsPreview = !!(targetCanvas && typeof targetCanvas.id === 'string' && (targetCanvas.id === 'effects-preview-canvas' || targetCanvas.id.startsWith('effects-thumb-canvas-')));
                const activePresetId = state?.ui?.activeEffectsPresetId;
                if (isEffectsPreview && activePresetId && Array.isArray(state.effectsPresets)) {
                    const preset = state.effectsPresets.find(p => String(p.id) === String(activePresetId));
                    if (preset && preset.data) {
                        const clone = JSON.parse(JSON.stringify(styleSource));
                        if (typeof preset.data.details !== 'undefined') clone.details = JSON.parse(JSON.stringify(preset.data.details));
                        sourceForRender = clone;
                    }
                }
            } catch(_) {}

            if (sourceForRender && sourceForRender.composite && sourceForRender.composite.enabled) {
                const comp = sourceForRender.composite;
                const baseStyle = sourceForRender;
                // Preserve each source map's own colors/styles. The composite wrapper no longer
                // overrides per-map visualStyle/gradient/palette/numbering/border/details so each
                // combined map keeps the exact look it had before being combined.
                const applyStyle = (src) => JSON.parse(JSON.stringify(src || {}));
                const useRawPixels = comp.useRawPixels !== false;
                const composeOpts = useRawPixels
                    ? Object.assign({}, options, { ignorePhysicalScale: true, suppressDetails: true })
                    : Object.assign({}, options, { suppressDetails: true });
                if (Array.isArray(comp.maps) && comp.maps.length) {
                    const maps = comp.maps.map(m => applyStyle(m));
                    composeVisualizerCanvasMulti(targetCanvas, maps, comp.placement || 'right', comp.gapPx || 0, composeOpts);
                    if (!suppressDetails) {
                        try {
                            const ctx = targetCanvas.getContext('2d');
                            const calcs = calculateLayout(baseStyle) || {};
                            if (ctx && calcs && calcs.totalResWidth) drawDetailsOverlays(ctx, targetCanvas, baseStyle, calcs, options);
                        } catch (_) {}
                    }
                    return;
                }
                const primary = applyStyle(comp.primary || sourceForRender);
                const secondary = comp.secondary ? applyStyle(comp.secondary) : null;
                const tertiary = comp.tertiary ? applyStyle(comp.tertiary) : null;
                const maps = [primary, secondary, tertiary].filter(Boolean);
                composeVisualizerCanvasMulti(targetCanvas, maps, comp.placement || 'right', comp.gapPx || 0, composeOpts);
                if (!suppressDetails) {
                    try {
                        const ctx = targetCanvas.getContext('2d');
                        const calcs = calculateLayout(baseStyle) || {};
                        if (ctx && calcs && calcs.totalResWidth) drawDetailsOverlays(ctx, targetCanvas, baseStyle, calcs, options);
                    } catch (_) {}
                }
                return;
            }

            const calcs = calculateLayout(sourceForRender);
            const canvas = targetCanvas;
            if (!canvas) return;

            if (!calcs || !calcs.totalResWidth) {
                const ctx = canvas.getContext('2d');
                // Clear and show a message if there's nothing to draw
                const parentWidth = canvas.parentElement ? canvas.parentElement.clientWidth : 300;
                const parentHeight = canvas.parentElement ? canvas.parentElement.clientHeight : 150;
                canvas.width = parentWidth > 0 ? parentWidth : 300;
                canvas.height = parentHeight > 0 ? parentHeight : 150;
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                if (canvas.id === 'designer-preview-canvas') {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.font = '14px Inter';
                    ctx.fillText('Enter valid dimensions to see preview', canvas.width / 2, canvas.height / 2);
                }
                return;
            }
            
            const panelResWidth = sourceForRender.panelResWidth;
            const panelResHeight = sourceForRender.panelResHeight;
            // Scale the preview rendering to keep things fast for large maps
            const fullW = calcs.totalResWidth;
            const fullH = calcs.totalResHeight;
            const forceFullRes = !!(options && options.forceFullRes);
            const fixedScale = (!forceFullRes && options && Number.isFinite(options.fixedScale)) ? options.fixedScale : null;
            const userScale = forceFullRes ? 1 : (Number.isFinite(fixedScale) ? fixedScale : Math.max(0.05, Math.min(1, (state.visualizerState?.previewScale ?? 1))));
            const savedCapMp = (() => { try { return parseFloat(localStorage.getItem('pixi-logic-preview-cap-mp')); } catch(_) { return NaN; } })();
            const capMp = Number.isFinite(savedCapMp) && savedCapMp > 0.25 ? savedCapMp : PixelLogicRendering.FULL_PREVIEW_MP;
            const previewScale = forceFullRes ? 1 : PixelLogicRendering.previewScale(fullW, fullH, userScale, capMp);
            environment.validateSize?.(forceFullRes ? fullW : Math.max(1, Math.round(fullW * previewScale)), forceFullRes ? fullH : Math.max(1, Math.round(fullH * previewScale)));
            canvas.width = forceFullRes ? fullW : Math.max(1, Math.round(fullW * previewScale));
            canvas.height = forceFullRes ? fullH : Math.max(1, Math.round(fullH * previewScale));
            const ctx = canvas.getContext('2d');

            // Apply parent-fit sizing only for thumbnails and non-zoomed mini-previews; main previews manage CSS size elsewhere
            try {
                const id = String(canvas.id || '');
                const isThumb = id.startsWith('thumb-canvas-') || id.startsWith('effects-thumb-canvas-') || id.startsWith('pdf-thumb-canvas-');
                const managedByZoom = (id === 'visualizer-canvas') || (id === 'designer-preview-canvas') || (id === 'effects-preview-canvas');
                if (!managedByZoom && isThumb) {
                    const parent = canvas.parentElement;
                    if (parent) {
                        const parentW = parent.clientWidth || canvas.parentElement.offsetWidth || window.innerWidth;
                        const parentH = parent.clientHeight || canvas.parentElement.offsetHeight || window.innerHeight * 0.6;
                        if (parentW > 0 && parentH > 0 && canvas.width > 0 && canvas.height > 0) {
                            const scale = Math.min(parentW / canvas.width, parentH / canvas.height);
                            canvas.style.width = Math.round(canvas.width * scale) + 'px';
                            canvas.style.height = Math.round(canvas.height * scale) + 'px';
                        }
                    }
                }
            } catch (e) { /* non-fatal */ }
            
            // Base background (kept neutral); panels draw their own styles
            const canvasId = String(canvas.id || '');
            const forceTransparent = !!(options && options.transparent);
            const transparentPreview = forceTransparent || (canvasId === 'visualizer-canvas') || (canvasId === 'designer-preview-canvas') || (canvasId === 'effects-preview-canvas') || canvasId.startsWith('effects-thumb-canvas-');
            if (transparentPreview) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
            } else {
                ctx.fillStyle = '#111827';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // Ensure panels array matches current layout
            try {
                if (!Array.isArray(sourceForRender.panels) || sourceForRender.panels.length !== (calcs.totalPanels || 0)) {
                    sourceForRender.panels = Array(calcs.totalPanels || 0).fill(true);
                }
            } catch(_) {}

            const fontSize = (Math.min(panelResWidth, panelResHeight) * previewScale / 100) * (sourceForRender.numbering.fontSize || 25);
            ctx.font = `bold ${fontSize}px Inter`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            let mapGradient = null;
            if (styleSource.visualStyle === 'gradient') {
                const { type, colors, angle } = styleSource.gradient;
                const mapWidth = canvas.width;
                const mapHeight = canvas.height;
                const centerX = mapWidth / 2;
                const centerY = mapHeight / 2;
                if (type === 'linear') {
                    const angleRad = (angle - 90) * (Math.PI / 180);
                    const directionX = Math.cos(angleRad);
                    const directionY = Math.sin(angleRad);
                    const halfLength = Math.abs(directionX) * mapWidth / 2 + Math.abs(directionY) * mapHeight / 2;
                    mapGradient = ctx.createLinearGradient(
                        centerX - directionX * halfLength,
                        centerY - directionY * halfLength,
                        centerX + directionX * halfLength,
                        centerY + directionY * halfLength
                    );
                } else {
                    const radius = Math.hypot(mapWidth / 2, mapHeight / 2);
                    mapGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
                }
                mapGradient.addColorStop(0, colors[0]);
                mapGradient.addColorStop(1, colors[1]);
            }

            let panelCounter = 1;
            const drawCell = (gridX, gridY, cellResW, cellResH, sectionYOffsetPx, sectionPanelsHForIndex, indexOffset = 0) => {
                const x = gridX;
                const y = gridY;
                const index = indexOffset + (y * sectionPanelsHForIndex) + x;
                const posX = Math.round(x * cellResW * previewScale);
                const posY = Math.round((y * cellResH + sectionYOffsetPx) * previewScale);
                const cellWidth = Math.round((x + 1) * cellResW * previewScale) - posX;
                const cellHeight = Math.round(((y + 1) * cellResH + sectionYOffsetPx) * previewScale) - posY;
                let label;
                const style = styleSource.numbering.style;
                const currentPanelNumber = panelCounter;
                if (style === 'sequential') label = currentPanelNumber; else {
                    switch (style) {
                        case 'rowLetter': label = `${String.fromCharCode(65 + y)}${x + 1}`; break;
                        case 'colLetter': label = `${String.fromCharCode(65 + x)}${y + 1}`; break;
                        case 'rowColNum': label = `${y + 1}-${x + 1}`; break;
                        case 'colRowNum': label = `${x + 1}-${y + 1}`; break;
                        default: label = currentPanelNumber;
                    }
                }
                if (styleSource.panels && !styleSource.panels[index]) {
                    if (transparentPreview) {
                        ctx.clearRect(posX, posY, cellWidth, cellHeight);
                    } else {
                        ctx.fillStyle = '#000000';
                        ctx.fillRect(posX, posY, cellWidth, cellHeight);
                    }
                } else {
                    if (styleSource.visualStyle === 'checker') {
                        ctx.fillStyle = (x + y) % 2 === 0 ? styleSource.checkerColors[0] : styleSource.checkerColors[1];
                        ctx.fillRect(posX, posY, cellWidth, cellHeight);
                    } else if (styleSource.visualStyle === 'gradient') {
                        ctx.fillStyle = mapGradient;
                        ctx.fillRect(posX, posY, cellWidth, cellHeight);
                    }
                    ctx.lineWidth = styleSource.border.thickness * previewScale; ctx.strokeStyle = styleSource.border.color;
                    if (styleSource.border.style === 'dashed') ctx.setLineDash([ctx.lineWidth * 3, ctx.lineWidth * 2]);
                    else if (styleSource.border.style === 'dotted') ctx.setLineDash([ctx.lineWidth, ctx.lineWidth * 2]);
                    else ctx.setLineDash([]);
                    ctx.strokeRect(posX, posY, cellWidth, cellHeight);
                    ctx.setLineDash([]);
                    ctx.fillStyle = styleSource.numbering.color;
                    ctx.fillText(label, posX + cellWidth / 2, posY + cellHeight / 2);
                    if (style === 'sequential') panelCounter++;
                }
            };

            const basePanelsH = calcs.panelsHorizontally;
            const basePanelsV = calcs.panelsVertically;
            for (let y = 0; y < basePanelsV; y++) {
                for (let x = 0; x < basePanelsH; x++) {
                    drawCell(x, y, panelResWidth, panelResHeight, 0, basePanelsH, 0);
                }
            }

            if (!suppressDetails) drawDetailsOverlays(ctx, canvas, styleSource, calcs, options);
        }

const drawLineWithArrows = (ctx, x1, y1, x2, y2, options = {}) => {
            const color = options.color || '#ff0000';
            const width = Math.max(1, options.width || 2);
            const arrowStart = !!options.arrowStart;
            const arrowEnd = !!options.arrowEnd;
            const lineStyle = options.lineStyle || 'solid'; // solid|dashed|dotted|zigzag
            const zzAmp = Math.max(0, options.zzAmp != null ? +options.zzAmp : Math.max(2, width * 2));
            const zzStep = Math.max(1, options.zzStep != null ? +options.zzStep : Math.max(6, width * 4));
            const arrowSize = Math.max(0.3, Math.min(5, options.arrowSize || 1));
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            // Apply line style
            if (lineStyle === 'dashed') {
                ctx.setLineDash([width * 4, width * 2]);
            } else if (lineStyle === 'dotted') {
                ctx.setLineDash([0, width * 2.2]); // sequence of round-capped dots
            } else {
                ctx.setLineDash([]);
            }
            ctx.beginPath();
            ctx.moveTo(x1, y1);
            if (lineStyle === 'zigzag') {
                // Draw a triangular zigzag from (x1,y1) to (x2,y2)
                const dx = x2 - x1, dy = y2 - y1;
                const len = Math.hypot(dx, dy) || 1;
                const ux = dx / len, uy = dy / len;           // unit vector along line
                const nx = -uy, ny = ux;                       // normal vector
                let d = zzStep;
                let sign = 1;
                while (d < len) {
                    const px = x1 + ux * d + nx * zzAmp * sign;
                    const py = y1 + uy * d + ny * zzAmp * sign;
                    ctx.lineTo(px, py);
                    d += zzStep;
                    sign *= -1;
                }
                ctx.lineTo(x2, y2);
                ctx.stroke();
            } else {
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
            // Arrowheads
            const drawArrowHead = (toX, toY, angle) => {
                const len = Math.max(6, width * 3) * arrowSize;
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(toX, toY);
                ctx.lineTo(toX - len * Math.cos(angle - Math.PI / 6), toY - len * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(toX - len * Math.cos(angle + Math.PI / 6), toY - len * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();
            };
            const arrowAngle = typeof options.arrowAngle === 'number' ? options.arrowAngle : Math.atan2(y2 - y1, x2 - x1);
            if (arrowStart) drawArrowHead(x1, y1, arrowAngle + Math.PI); // start arrow
            if (arrowEnd) drawArrowHead(x2, y2, arrowAngle); // end arrow
            ctx.restore();
        };

const drawPencilPolyline = (ctx, points, arrowPoints, options = {}) => {
            if (!points || points.length < 2) return;
            const color = options.color || '#ff0000';
            const width = Math.max(1, options.width || 2);
            const arrowScale = options.arrowSize || 1;
            const nearPoint = (a, b) => a && b && Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5;
            const startPt = points[0];
            const endPt = points[points.length - 1];
            const hasLegacyStartArrow = Array.isArray(arrowPoints) && startPt && arrowPoints.some(ap => nearPoint(ap, startPt));
            const hasLegacyEndArrow = Array.isArray(arrowPoints) && endPt && arrowPoints.some(ap => nearPoint(ap, endPt));
            let arrowStart = (typeof options.arrowStart === 'boolean') ? options.arrowStart : hasLegacyStartArrow;
            let arrowEnd = (typeof options.arrowEnd === 'boolean') ? options.arrowEnd : hasLegacyEndArrow;
            arrowStart = !!arrowStart;
            arrowEnd = !!arrowEnd;

            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = width;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(startPt.x, startPt.y);
            for (let i = 1; i < points.length; i++) {
                ctx.lineTo(points[i].x, points[i].y);
            }
            ctx.stroke();

            const drawArrowHead = (x, y, angle) => {
                const len = Math.max(6, width * 3) * arrowScale;
                ctx.save();
                ctx.fillStyle = color;
                ctx.beginPath();
                ctx.moveTo(x, y);
                ctx.lineTo(x - len * Math.cos(angle - Math.PI / 6), y - len * Math.sin(angle - Math.PI / 6));
                ctx.lineTo(x - len * Math.cos(angle + Math.PI / 6), y - len * Math.sin(angle + Math.PI / 6));
                ctx.closePath();
                ctx.fill();
                ctx.restore();
            };

            const filteredArrowPoints = Array.isArray(arrowPoints)
                ? arrowPoints.filter(ap => {
                    if (startPt && nearPoint(ap, startPt)) return false;
                    if (endPt && nearPoint(ap, endPt)) return false;
                    return true;
                })
                : [];

            filteredArrowPoints.forEach(ap => drawArrowHead(ap.x, ap.y, ap.angle));

            if (arrowStart && points.length > 1) {
                const next = points[1];
                const angle = Math.atan2(startPt.y - next.y, startPt.x - next.x);
                drawArrowHead(startPt.x, startPt.y, angle);
            }
            if (arrowEnd && points.length > 1) {
                const prev = points[points.length - 2];
                const angle = Math.atan2(endPt.y - prev.y, endPt.x - prev.x);
                drawArrowHead(endPt.x, endPt.y, angle);
            }

            ctx.restore();
        };

const drawCoordinatesOverlay = (ctx, bounds, x, y, fontSize = 100, color = '#ffffff', fit = false) => {
            const pct = Math.max(20, Math.min(300, Number(fontSize) || 100));
            const baseFs = Math.max(10, Math.round(Math.min(bounds.width, bounds.height) * 0.025));
            const fs = Math.max(8, Math.round(baseFs * pct / 100));
            const pad = Math.max(4, Math.round(fs * 0.35));
            const text = `(X: ${x}, Y: ${y})`;
            ctx.save();
            ctx.font = `600 ${fs}px Inter, Arial, sans-serif`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            const tw = ctx.measureText(text).width;
            const margin = Math.round(pad / 2);
            const scale = fit ? Math.min(1, bounds.width / (tw + pad * 2 + margin * 2), bounds.height / (fs + pad * 1.2 + margin * 2)) : 1;
            ctx.scale(scale, scale);
            const bx = margin;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            ctx.fillRect(bx, margin, tw + pad * 2, fs + pad * 1.2);
            ctx.fillStyle = color || '#ffffff';
            ctx.fillText(text, bx + pad, margin + pad * 0.4);
            ctx.restore();
        };

const drawCanvasDrawingsToContext = (ctx, canvasObj) => {
            if (!canvasObj || !Array.isArray(canvasObj.drawings)) return;
            canvasObj.drawings.forEach(s => {
                if (s.lineStyle === 'pencil' && Array.isArray(s.points) && s.points.length > 1) {
                    drawPencilPolyline(ctx, s.points, s.arrowPoints, s);
                } else {
                    drawLineWithArrows(ctx, s.x1, s.y1, s.x2, s.y2, s);
                }
            });
        };

const buildMaskPath = (mask) => {
            const p = new Path2D();
            if (!mask) return p;
            if (mask.type === "rect") {
                const radius = Number(mask.radius) || 0;
                if (radius > 0) {
                    const r = Math.min(radius, Math.abs(mask.w) / 2, Math.abs(mask.h) / 2);
                    if (typeof p.roundRect === 'function') {
                        p.roundRect(mask.x, mask.y, mask.w, mask.h, r);
                    } else {
                        p.rect(mask.x, mask.y, mask.w, mask.h);
                    }
                } else {
                    p.rect(mask.x, mask.y, mask.w, mask.h);
                }
            } else if (mask.type === "ellipse" || mask.type === "circle") {
                p.ellipse(mask.x + mask.w / 2, mask.y + mask.h / 2, Math.abs(mask.w) / 2, Math.abs(mask.h) / 2, 0, 0, Math.PI * 2);
            } else if (mask.type === "polygon" && Array.isArray(mask.points) && mask.points.length >= 3) {
                p.moveTo(mask.points[0].x, mask.points[0].y);
                for (let i = 1; i < mask.points.length; i++) p.lineTo(mask.points[i].x, mask.points[i].y);
                p.closePath();
            }
            return p;
        };

const applyMaskClip = (ctx, masks, canvasW, canvasH, invert) => {
            const activeMasks = (masks || []).filter(m => m && m.visible !== false && m.mode !== 'guide');
            if (activeMasks.length === 0) return;
            if (invert) {
                // Invert: clip to everything OUTSIDE the masks
                const combined = new Path2D();
                combined.rect(0, 0, canvasW, canvasH);
                activeMasks.forEach(m => combined.addPath(buildMaskPath(m)));
                ctx.clip(combined, "evenodd");
            } else {
                // Normal: clip to inside masks only
                const combined = new Path2D();
                activeMasks.forEach(m => combined.addPath(buildMaskPath(m)));
                ctx.clip(combined);
            }
        };
        return { calculateLayout, formatAspectRatio, getPanelPitchMm, getCompositePitchMm, composeVisualizerCanvasMulti, drawDetailsOverlays, drawCoordinatesOverlay, drawVisualizerCanvas, drawLineWithArrows, drawPencilPolyline, drawCanvasDrawingsToContext, buildMaskPath, applyMaskClip };
    }
    const api = { createRenderer };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PixelLogicMapRenderer = api;
})(globalThis);

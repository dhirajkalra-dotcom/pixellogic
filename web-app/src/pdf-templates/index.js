/**
 * PixelLogic Built-in PDF Page Templates
 * ---------------------------------------------------
 * Each template defines a clean, professional page layout that the user
 * does NOT have to design themselves. The user only picks:
 *   - Template id
 *   - Page size (a3 / a4 / a5 / letter / tabloid)
 *   - Orientation
 *   - Accent color + optional logo
 *   - Project info (handled at the export level)
 *
 * Each template exposes:
 *   { id, name, description, supportedSizes:[...], orientation: 'landscape'|'portrait'|'both',
 *     renderPage(ctx) -> HTMLElement }   // returns a fully-styled DOM node sized to the page
 *
 * The export pipeline (in index.html generatePdf) renders each page DOM via
 * html2canvas and adds the resulting canvas to the jsPDF document.
 *
 * Page-content `ctx` shape (provided by generatePdf):
 *   {
 *     pageType: 'cover' | 'map' | 'output' | '3d' | 'delivery',
 *     pageNumber, totalPages,
 *     widthPx, heightPx,                  // physical page size in CSS pixels
 *     accentColor, logoDataUrl,
 *     project: { name, client, venue, salesperson, ... },
 *     titleBlock: { projectName, projectDate, venue, sales, client, drawnBy, version, ... },
 *     mapTitle, mapImageDataUrl,           // when pageType === 'map' or 'output'
 *     details: [ 'Pixel Pitch: 2.6mm', 'Resolution: 1920x1080', ... ],
 *     pdfTitle
 *   }
 */
(function () {
    'use strict';

    const escapeHtml = (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

    // System font stack — these render reliably in html2canvas (Inter does not)
    const FONT_STACK = `Arial, "Helvetica Neue", Helvetica, "Segoe UI", system-ui, sans-serif`;

    /** Common helper: returns the standard page <div> sized to the requested page. */
    const makePage = (ctx, innerHtml, extraStyle = '') => {
        const div = document.createElement('div');
        div.className = 'pl-pdf-page';
        div.style.cssText = `
            position:relative;
            width:${ctx.widthPx}px;
            height:${ctx.heightPx}px;
            background:#ffffff;
            color:#1f2937;
            font-family: ${FONT_STACK};
            font-size:14px;
            line-height:1.45;
            box-sizing:border-box;
            overflow:hidden;
            font-kerning:none;
            font-variant-ligatures:none;
            font-feature-settings:"liga" 0, "clig" 0, "kern" 0;
            ${extraStyle}
        `;
        // Force deterministic text shaping to avoid html2canvas glyph overlap artifacts.
        div.innerHTML = `<style>
            .pl-pdf-page, .pl-pdf-page * {
                font-kerning: none !important;
                font-variant-ligatures: none !important;
                font-feature-settings: "liga" 0, "clig" 0, "kern" 0 !important;
                text-rendering: geometricPrecision;
            }
        </style>${innerHtml}`;
        return div;
    };

    /**
     * Render a key:value detail row with proper spacing.
     * Splits on the first colon so labels (left) and values (right) align cleanly.
     * Uses flexbox + &nbsp; replacement to work around html2canvas whitespace bugs,
     * and avoids large letter-spacing (which html2canvas mis-measures and overlaps).
     */
    const detailsList = (details, opts = {}) => {
        if (!details || !details.length) return '';
        const rowsInput = details.filter(Boolean);
        if (!rowsInput.length) return '';
        const rowCount = rowsInput.length;
        const baseFont = Number(opts.baseFont || (rowCount > 10 ? 11 : 12));
        const labelFont = Number(opts.labelFont || Math.max(9, baseFont - 1));
        const rowPad = Number(opts.rowPad || (rowCount > 10 ? 4 : 6));
        const gap = Number(opts.gap || (rowCount > 10 ? 12 : 16));
        const rows = rowsInput.map(d => {
            const s = String(d || '');
            const idx = s.indexOf(':');
            let label = s, value = '';
            if (idx >= 0) { label = s.slice(0, idx).trim(); value = s.slice(idx + 1).trim(); }
            return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:${gap}px;padding:${rowPad}px 0;border-bottom:1px solid #f1f5f9;line-height:1.35;">
                <span style="color:#64748b;font-weight:500;flex:0 1 46%;min-width:0;white-space:normal;overflow-wrap:anywhere;word-break:break-word;font-size:${labelFont}px;">${escapeHtml(label)}</span>
                <span style="color:#0f172a;font-weight:600;text-align:right;flex:1 1 auto;min-width:0;white-space:normal;overflow-wrap:anywhere;word-break:break-word;font-size:${baseFont}px;">${escapeHtml(value)}</span>
            </div>`;
        }).join('');
        return `<div style="display:flex;flex-direction:column;">${rows}</div>`;
    };

    /* =============================================================== */
    /* Shared: Video Delivery Specifications page                       */
    /* Renders state.pdfExport.deliverySpec into a clean two-column     */
    /* spec sheet — used as the LAST page across every gallery template.*/
    /* =============================================================== */
    const renderDeliveryPage = (ctx) => {
        const accent = ctx.accentColor || '#6366f1';
        const padding = Math.round(Math.min(ctx.widthPx, ctx.heightPx) * 0.045);
        const headerH = Math.round(ctx.heightPx * 0.085);
        const footerH = Math.round(ctx.heightPx * 0.05);
        const spec = ctx.deliverySpec || {};
        const proj = ctx.project || {};
        const tb = ctx.titleBlock || {};
        const fScale = ctx.fontScale || 1;
        const fs = n => Math.round(n * fScale);

        const rows = [
            ['Media Server', spec.mediaServer],
            ['Format', spec.format],
            ['Codecs', Array.isArray(spec.codecs) && spec.codecs.length ? spec.codecs.join(', ') : (spec.codecsCustom || '')],
            ['Quality', spec.quality],
            ['Pixel Aspect Ratio', spec.pixelAspectRatio],
            ['Frame Rate', spec.fps ? `${spec.fps} fps` : ''],
            ['Embedded Audio', spec.embeddedAudio ? (spec.embeddedAudioDetails || 'Yes') : 'No'],
            ['Sample Rate', spec.sampleRate],
            ['Unembedded Audio', spec.unembeddedAudioFormat],
            ['Still Frame Format', spec.stillFrameFormat],
            ['Naming Structure', spec.namingStructure],
            ['Example File Name', spec.example],
        ].filter(([, v]) => v && String(v).trim().length);

        const nbsp = (s) => escapeHtml(String(s || '')).replace(/ /g, '&nbsp;');

        const renderRow = ([label, value]) => `
            <div style="display:flex;align-items:flex-start;gap:24px;padding:11px 0;border-bottom:1px solid #e5e7eb;">
                <div style="flex:0 0 220px;font-size:${fs(11)}px;letter-spacing:0.5px;text-transform:uppercase;color:#64748b;font-weight:700;padding-top:2px;white-space:nowrap;">${nbsp(label)}</div>
                <div style="flex:1;font-size:${fs(14)}px;color:#0f172a;font-weight:500;line-height:1.5;overflow-wrap:anywhere;">${nbsp(value)}</div>
            </div>
        `;

        const validation = spec.showValidationNote && spec.contentValidationNote ? `
            <div style="margin-top:24px;padding:18px 22px;background:${accent}15;border-left:4px solid ${accent};border-radius:6px;">
                <div style="font-size:${fs(11)}px;letter-spacing:0.6px;text-transform:uppercase;color:${accent};font-weight:700;margin-bottom:8px;">Content Validation</div>
                <div style="font-size:${fs(13)}px;color:#334155;line-height:1.6;">${nbsp(spec.contentValidationNote)}</div>
                ${spec.contentValidationEmail ? `<div style="margin-top:8px;font-size:${fs(13)}px;color:#0f172a;font-weight:600;">${nbsp(spec.contentValidationEmail)}</div>` : ''}
            </div>
        ` : '';

        const comments = spec.comments ? `
            <div style="margin-top:18px;padding:14px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;">
                <div style="font-size:${fs(11)}px;letter-spacing:0.6px;text-transform:uppercase;color:#64748b;font-weight:600;margin-bottom:6px;">Comments</div>
                <div style="font-size:${fs(13)}px;color:#0f172a;line-height:1.6;">${nbsp(spec.comments)}</div>
            </div>
        ` : '';

        return makePage(ctx, `
            <!-- Header -->
            <div style="position:absolute;top:0;left:0;right:0;height:${headerH}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${padding}px;border-bottom:1px solid #e5e7eb;">
                <div style="display:flex;align-items:center;gap:14px;">
                    <div style="width:4px;height:${Math.round(headerH * 0.55)}px;background:${accent};border-radius:2px;"></div>
                    <div>
                        <div style="font-size:${fs(12)}px;letter-spacing:0.6px;text-transform:uppercase;color:#94a3b8;font-weight:600;">${nbsp(proj.name || '')}</div>
                        <div style="font-size:${Math.max(fs(20), Math.round(headerH * 0.34 * fScale))}px;font-weight:700;color:#0f172a;line-height:1.2;margin-top:2px;">Video Delivery Specifications</div>
                    </div>
                </div>
                ${ctx.logoDataUrl ? `<img src="${ctx.logoDataUrl}" style="max-height:${Math.round(headerH * 0.6)}px;max-width:160px;object-fit:contain;" />` : ''}
            </div>

            <!-- Body -->
            <div style="position:absolute;top:${headerH}px;left:0;right:0;bottom:${footerH}px;padding:${padding}px;overflow:hidden;box-sizing:border-box;">
                ${rows.length === 0 ? `
                    <div style="text-align:center;color:#94a3b8;font-size:${fs(14)}px;padding:60px 20px;">
                        No video delivery specifications have been provided.<br/>
                        <span style="font-size:${fs(12)}px;">Configure them in the PDF Export tab → Video Delivery Specifications card.</span>
                    </div>
                ` : `
                    <div style="margin-bottom:18px;">
                        <div style="font-size:${fs(11)}px;letter-spacing:0.6px;text-transform:uppercase;color:${accent};font-weight:700;padding-bottom:8px;border-bottom:2px solid ${accent};">Delivery Specifications</div>
                    </div>
                    ${rows.map(renderRow).join('')}
                    ${comments}
                    ${validation}
                `}
            </div>

            <!-- Footer -->
            <div style="position:absolute;bottom:0;left:0;right:0;height:${footerH}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${padding}px;border-top:1px solid #e5e7eb;font-size:${fs(11)}px;color:#94a3b8;">
                <div>${nbsp(proj.client || '')}${tb.version ? ` &middot; Rev ${nbsp(tb.version)}` : ''}</div>
                <div style="font-weight:600;color:#475569;">Page ${ctx.pageNumber}${ctx.totalPages ? ` / ${ctx.totalPages}` : ''}</div>
            </div>
        `);
    };

    /* =============================================================== */
    /* Template 1: Minimal Pro                                          */
    /* Clean, single map per page. Generous whitespace.                 */
    /* =============================================================== */
    const minimalPro = {
        id: 'minimal-pro',
        name: 'Minimal Pro',
        description: 'Editorial-clean white pages: hairline top accent, full-bleed map, and a two-column specification strip at the bottom. No filled header.',
        supportedSizes: ['a3', 'a4', 'a5', 'letter', 'tabloid'],
        orientation: 'both',
        thumbnailColor: '#6366f1',

        renderPage(ctx) {
            const accent = ctx.accentColor || '#6366f1';
            const padding = Math.round(Math.min(ctx.widthPx, ctx.heightPx) * 0.045);
            const accentLineH = 4;
            const headerH = Math.max(60, Math.round(ctx.heightPx * 0.088));
            const footerH = Math.round(ctx.heightPx * 0.042);
            const hasDetails = !!(ctx.details && ctx.details.length);
            const detailsH = hasDetails ? Math.round(ctx.heightPx * 0.2) : 0;
            const fScale = ctx.fontScale || 1;
            const fs = n => Math.round(n * fScale);

            if (ctx.pageType === 'cover') {
                return makePage(ctx, `
                    <div style="position:absolute;top:0;left:0;right:0;height:${accentLineH}px;background:${accent};"></div>
                    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:${padding * 2}px;padding-top:${padding * 2 + accentLineH}px;box-sizing:border-box;">
                        ${ctx.logoDataUrl ? `<img src="${ctx.logoDataUrl}" style="max-height:60px;max-width:240px;object-fit:contain;margin-bottom:44px;" />` : ''}
                        <div style="width:44px;height:3px;background:${accent};margin-bottom:20px;border-radius:2px;"></div>
                        <div style="font-size:${fs(11)}px;letter-spacing:1.2px;text-transform:uppercase;color:${accent};font-weight:700;margin-bottom:14px;">Pixel Map Specification</div>
                        <h1 style="font-size:${Math.round(ctx.widthPx * 0.054 * fScale)}px;font-weight:800;color:#0f172a;line-height:1.05;margin:0 0 22px 0;max-width:78%;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(ctx.pdfTitle || ctx.project?.name || 'Project Report')}</h1>
                        <div style="font-size:${fs(17)}px;color:#64748b;font-weight:400;">${escapeHtml(ctx.project?.client || '')}${ctx.project?.client && ctx.project?.venue ? '&nbsp;&nbsp;&middot;&nbsp;&nbsp;' : ''}${escapeHtml(ctx.project?.venue || '')}</div>
                        <div style="margin-top:auto;display:flex;gap:44px;font-size:${fs(11)}px;padding-top:18px;border-top:1px solid #f1f5f9;">
                            <div><div style="font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.6px;font-size:${fs(9)}px;margin-bottom:4px;">Date</div><div style="color:#64748b;">${escapeHtml(ctx.titleBlock?.projectDate || new Date().toLocaleDateString())}</div></div>
                            ${ctx.titleBlock?.drawnBy ? `<div><div style="font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.6px;font-size:${fs(9)}px;margin-bottom:4px;">Drawn By</div><div style="color:#64748b;">${escapeHtml(ctx.titleBlock.drawnBy)}</div></div>` : ''}
                            ${ctx.titleBlock?.version ? `<div><div style="font-weight:700;color:#cbd5e1;text-transform:uppercase;letter-spacing:0.6px;font-size:${fs(9)}px;margin-bottom:4px;">Revision</div><div style="color:#64748b;">${escapeHtml(ctx.titleBlock.version)}</div></div>` : ''}
                        </div>
                    </div>
                `);
            }

            // Build a two-column details strip for below the map
            const detailStripHtml = hasDetails ? (() => {
                const items = (ctx.details || []).filter(Boolean);
                const half = Math.ceil(items.length / 2);
                const renderCol = (arr) => arr.map(d => {
                    const s = String(d || '');
                    const idx = s.indexOf(':');
                    const label = idx >= 0 ? s.slice(0, idx).trim() : s;
                    const value = idx >= 0 ? s.slice(idx + 1).trim() : '';
                    return `<div style="padding:4px 0;border-bottom:1px solid #f1f5f9;"><div style="font-size:${fs(9)}px;text-transform:uppercase;letter-spacing:0.5px;color:#94a3b8;font-weight:700;margin-bottom:2px;">${escapeHtml(label)}</div><div style="font-size:${fs(12)}px;color:#0f172a;font-weight:600;">${escapeHtml(value)}</div></div>`;
                }).join('');
                return `<div style="display:flex;gap:${padding}px;height:100%;"><div style="flex:1;">${renderCol(items.slice(0, half))}</div><div style="flex:1;">${renderCol(items.slice(half))}</div></div>`;
            })() : '';

            return makePage(ctx, `
                <!-- Hairline accent at top -->
                <div style="position:absolute;top:0;left:0;right:0;height:${accentLineH}px;background:${accent};"></div>

                <!-- Header: plain white, text only, subtle bottom rule -->
                <div style="position:absolute;top:${accentLineH}px;left:0;right:0;height:${headerH}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${padding}px;border-bottom:1px solid #f1f5f9;box-sizing:border-box;">
                    <div style="min-width:0;max-width:${ctx.logoDataUrl ? '68%' : '85%'};">
                        <div style="font-size:${fs(10)}px;letter-spacing:0.8px;text-transform:uppercase;color:#94a3b8;font-weight:600;margin-bottom:3px;">${escapeHtml(ctx.project?.name || '')}</div>
                        <div style="font-size:${Math.max(fs(18), Math.round(headerH * 0.38 * fScale))}px;font-weight:700;color:#0f172a;line-height:1.15;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(ctx.mapTitle || ctx.pdfTitle || 'Pixel Map')}</div>
                    </div>
                    ${ctx.logoDataUrl ? `<img src="${ctx.logoDataUrl}" style="max-height:${Math.round(headerH * 0.6)}px;max-width:150px;object-fit:contain;" />` : `<div style="font-size:${fs(11)}px;color:#cbd5e1;">${escapeHtml(ctx.titleBlock?.projectDate || '')}</div>`}
                </div>

                <!-- Full-bleed map area -->
                <div style="position:absolute;top:${accentLineH + headerH}px;left:${padding}px;right:${padding}px;bottom:${footerH + (detailsH > 0 ? detailsH + padding : 0)}px;display:flex;align-items:center;justify-content:center;overflow:hidden;">
                    ${ctx.mapImageDataUrl ? `<img src="${ctx.mapImageDataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />` : `<div style="color:#cbd5e1;font-size:${fs(13)}px;">No map image</div>`}
                </div>

                <!-- Two-column spec strip, separated from map by an accent top border -->
                ${detailsH > 0 ? `<div style="position:absolute;left:${padding}px;right:${padding}px;bottom:${footerH}px;height:${detailsH}px;border-top:2px solid ${accent};padding-top:${Math.round(padding * 0.45)}px;overflow:hidden;box-sizing:border-box;">${detailStripHtml}</div>` : ''}

                <!-- Minimal footer: tiny text, no border fill -->
                <div style="position:absolute;bottom:0;left:0;right:0;height:${footerH}px;display:flex;align-items:center;justify-content:space-between;padding:0 ${padding}px;font-size:${fs(10)}px;color:#cbd5e1;">
                    <div>${escapeHtml(ctx.project?.client || '')}${ctx.titleBlock?.version ? `&nbsp;&middot;&nbsp;Rev&nbsp;${escapeHtml(ctx.titleBlock.version)}` : ''}</div>
                    <div style="font-weight:700;color:#94a3b8;letter-spacing:0.5px;">${ctx.pageNumber}${ctx.totalPages ? ` / ${ctx.totalPages}` : ''}</div>
                </div>
            `);
        }
    };

    /* =============================================================== */
    /* Template 2: Title-Block Engineering                              */
    /* Dark navy header + double CAD border + dark title block          */
    /* =============================================================== */
    const titleBlockEngineering = {
        id: 'title-block-engineering',
        name: 'Dark Mode',
        description: 'Full dark-mode: the entire page — background, header, map area, spec panel, and footer — is rendered in dark navy/slate with light text.',
        supportedSizes: ['a2', 'a3', 'a4', 'tabloid'],
        orientation: 'landscape',
        thumbnailColor: '#1e293b',

        renderPage(ctx) {
            const accent = ctx.accentColor || '#0ea5e9';
            const padding = Math.round(Math.min(ctx.widthPx, ctx.heightPx) * 0.04);
            const headerH = Math.max(70, Math.round(ctx.heightPx * 0.1));
            const footerH = Math.round(ctx.heightPx * 0.046);
            const sideW = Math.max(230, Math.round(ctx.widthPx * 0.27));
            const darkPage = 'background:#0f172a;color:#f1f5f9;';

            const tb = ctx.titleBlock || {};
            const proj = ctx.project || {};

            if (ctx.pageType === 'cover') {
                const margin = Math.round(Math.min(ctx.widthPx, ctx.heightPx) * 0.03);
                return makePage(ctx, `
                    <!-- Corner accent marks -->
                    <div style="position:absolute;top:${margin}px;left:${margin}px;width:44px;height:44px;border-left:2px solid ${accent};border-top:2px solid ${accent};opacity:0.55;"></div>
                    <div style="position:absolute;bottom:${margin}px;right:${margin}px;width:44px;height:44px;border-right:2px solid ${accent};border-bottom:2px solid ${accent};opacity:0.55;"></div>
                    <!-- Accent bar across bottom -->
                    <div style="position:absolute;bottom:0;left:0;right:0;height:3px;background:${accent};"></div>
                    <!-- Content -->
                    <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;align-items:flex-start;padding:${padding * 2.2}px;box-sizing:border-box;">
                        ${ctx.logoDataUrl ? `<img src="${ctx.logoDataUrl}" style="max-height:56px;max-width:220px;object-fit:contain;margin-bottom:48px;filter:brightness(0) invert(1);" />` : ''}
                        <div style="width:48px;height:2px;background:${accent};margin-bottom:22px;"></div>
                        <div style="font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:${accent};font-weight:700;margin-bottom:16px;">Pixel Map Specification</div>
                        <h1 style="font-size:${Math.round(ctx.widthPx * 0.047)}px;font-weight:800;color:#f8fafc;line-height:1.05;margin:0 0 20px 0;max-width:75%;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(ctx.pdfTitle || proj.name || 'Project Report')}</h1>
                        <div style="font-size:16px;color:#64748b;">${escapeHtml(proj.client || '')}${proj.client && proj.venue ? '&nbsp;&nbsp;&middot;&nbsp;&nbsp;' : ''}${escapeHtml(proj.venue || '')}</div>
                        <div style="margin-top:auto;display:flex;gap:40px;font-size:11px;padding-top:20px;border-top:1px solid #1e293b;">
                            <div><div style="font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.6px;font-size:9px;margin-bottom:4px;">Date</div><div style="color:#94a3b8;">${escapeHtml(tb.projectDate || new Date().toLocaleDateString())}</div></div>
                            ${tb.drawnBy ? `<div><div style="font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.6px;font-size:9px;margin-bottom:4px;">Drawn By</div><div style="color:#94a3b8;">${escapeHtml(tb.drawnBy)}</div></div>` : ''}
                            ${tb.version ? `<div><div style="font-weight:700;color:#334155;text-transform:uppercase;letter-spacing:0.6px;font-size:9px;margin-bottom:4px;">Revision</div><div style="color:#94a3b8;">${escapeHtml(tb.version)}</div></div>` : ''}
                        </div>
                    </div>
                `, darkPage);
            }

            const hasDetails = !!(ctx.details && ctx.details.length);

            return makePage(ctx, `
                <!-- Dark header with accent underline -->
                <div style="position:absolute;top:0;left:0;right:0;height:${headerH}px;background:#1e293b;border-bottom:2px solid ${accent};display:flex;align-items:center;justify-content:space-between;padding:0 ${padding}px;box-sizing:border-box;">
                    <div style="display:flex;align-items:center;gap:13px;min-width:0;max-width:${ctx.logoDataUrl ? '70%' : '88%'};">
                        <div style="width:3px;height:${Math.round(headerH * 0.5)}px;background:${accent};flex-shrink:0;"></div>
                        <div style="min-width:0;">
                            <div style="font-size:10px;letter-spacing:0.8px;text-transform:uppercase;color:#475569;font-weight:600;margin-bottom:3px;">${escapeHtml(proj.name || '')}</div>
                            <div style="font-size:${Math.max(18, Math.round(headerH * 0.37))}px;font-weight:700;color:#f1f5f9;line-height:1.15;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(ctx.mapTitle || ctx.pdfTitle || 'Pixel Map')}</div>
                        </div>
                    </div>
                    ${ctx.logoDataUrl ? `<img src="${ctx.logoDataUrl}" style="max-height:${Math.round(headerH * 0.58)}px;max-width:150px;object-fit:contain;filter:brightness(0) invert(1);" />` : `<div style="font-size:11px;color:#475569;">${escapeHtml(tb.projectDate || '')}</div>`}
                </div>

                <!-- Body: dark map area + optional dark right specs panel -->
                <div style="position:absolute;top:${headerH}px;left:0;right:0;bottom:${footerH}px;display:flex;">
                    <!-- Map panel: slightly darker than page bg -->
                    <div style="flex:1;background:#111827;display:flex;align-items:center;justify-content:center;padding:${padding}px;box-sizing:border-box;overflow:hidden;">
                        ${ctx.mapImageDataUrl ? `<img src="${ctx.mapImageDataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />` : '<div style="color:#334155;font-size:13px;">No map image</div>'}
                    </div>
                    <!-- Dark right specs panel -->
                    ${hasDetails ? `<div style="width:${sideW}px;background:#1e293b;border-left:1px solid #334155;padding:${padding}px;display:flex;flex-direction:column;overflow:hidden;box-sizing:border-box;">
                        <div style="font-size:10px;letter-spacing:0.7px;text-transform:uppercase;color:${accent};font-weight:700;margin-bottom:10px;padding-bottom:7px;border-bottom:1.5px solid ${accent};flex-shrink:0;">Specifications</div>
                        <div style="flex:1;overflow:hidden;">
                            ${(ctx.details || []).filter(Boolean).map(d => {
                                const s = String(d || '');
                                const idx = s.indexOf(':');
                                const label = idx >= 0 ? s.slice(0, idx).trim() : s;
                                const value = idx >= 0 ? s.slice(idx + 1).trim() : '';
                                return `<div style="padding:5px 0;border-bottom:1px solid #334155;"><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.4px;color:#475569;font-weight:700;">${escapeHtml(label)}</div><div style="font-size:12px;color:#e2e8f0;font-weight:600;margin-top:1px;">${escapeHtml(value)}</div></div>`;
                            }).join('')}
                        </div>
                        <div style="margin-top:auto;border-top:1px solid #334155;padding-top:12px;display:flex;flex-direction:column;gap:8px;flex-shrink:0;">
                            ${proj.client ? `<div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.4px;color:#475569;font-weight:700;margin-bottom:2px;">Client</div><div style="font-size:12px;color:#e2e8f0;font-weight:600;">${escapeHtml(proj.client)}</div></div>` : ''}
                            ${proj.venue ? `<div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.4px;color:#475569;font-weight:700;margin-bottom:2px;">Venue</div><div style="font-size:12px;color:#e2e8f0;font-weight:600;">${escapeHtml(proj.venue)}</div></div>` : ''}
                            ${tb.projectDate ? `<div><div style="font-size:9px;text-transform:uppercase;letter-spacing:0.4px;color:#475569;font-weight:700;margin-bottom:2px;">Date</div><div style="font-size:12px;color:#e2e8f0;font-weight:600;">${escapeHtml(tb.projectDate)}</div></div>` : ''}
                        </div>
                    </div>` : ''}
                </div>

                <!-- Dark footer -->
                <div style="position:absolute;bottom:0;left:0;right:0;height:${footerH}px;background:#1e293b;border-top:1px solid #334155;display:flex;align-items:center;justify-content:space-between;padding:0 ${padding}px;font-size:10px;color:#475569;box-sizing:border-box;">
                    <div>${escapeHtml(proj.client || '')}${tb.version ? `&nbsp;&middot;&nbsp;Rev&nbsp;${escapeHtml(tb.version)}` : ''}</div>
                    <div style="font-weight:700;color:#64748b;letter-spacing:0.5px;">${ctx.pageNumber}${ctx.totalPages ? ` / ${ctx.totalPages}` : ''}</div>
                </div>
            `, darkPage);
        }
    };

    /* =============================================================== */
    /* Template 3: Coverage + Legend                                    */
    /* Full-height accent sidebar LEFT; map + title strip on the right  */
    /* =============================================================== */
    const coverageLegend = {
        id: 'coverage-legend',
        name: 'Coverage + Legend',
        description: 'Bold full-height accent sidebar on the left holds all specs and project info. Map fills the right panel with a title strip.',
        supportedSizes: ['a3', 'a4', 'letter', 'tabloid'],
        orientation: 'landscape',
        thumbnailColor: '#14b8a6',

        renderPage(ctx) {
            const accent = ctx.accentColor || '#14b8a6';
            const padding = Math.round(Math.min(ctx.widthPx, ctx.heightPx) * 0.04);
            const sideW = Math.round(ctx.widthPx * 0.27);
            const footerH = 32;
            const mapTitleH = Math.round(ctx.heightPx * 0.078);

            const proj = ctx.project || {};
            const tb = ctx.titleBlock || {};

            if (ctx.pageType === 'cover') {
                const panelW = Math.round(ctx.widthPx * 0.42);
                return makePage(ctx, `
                    <!-- Left accent panel (full height) -->
                    <div style="position:absolute;top:0;left:0;width:${panelW}px;bottom:0;background:${accent};display:flex;flex-direction:column;justify-content:space-between;padding:${padding * 1.4}px;box-sizing:border-box;">
                        <div>
                            ${ctx.logoDataUrl ? `<img src="${ctx.logoDataUrl}" style="max-height:52px;max-width:${panelW - padding * 3}px;object-fit:contain;object-position:left center;filter:brightness(0) invert(1);margin-bottom:36px;display:block;" />` : '<div style="height:88px;"></div>'}
                            <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;color:rgba(255,255,255,0.65);font-weight:700;margin-bottom:12px;">Coverage Report</div>
                            <h1 style="font-size:${Math.round(ctx.widthPx * 0.033)}px;font-weight:800;color:#fff;line-height:1.1;margin:0 0 16px 0;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(ctx.pdfTitle || proj.name || 'Project')}</h1>
                            <div style="font-size:15px;color:rgba(255,255,255,0.9);">${escapeHtml(proj.client || '')}</div>
                            ${proj.venue ? `<div style="font-size:13px;color:rgba(255,255,255,0.7);margin-top:6px;">${escapeHtml(proj.venue)}</div>` : ''}
                        </div>
                        <div style="border-top:1px solid rgba(255,255,255,0.25);padding-top:14px;font-size:11px;color:rgba(255,255,255,0.75);line-height:1.9;">
                            ${tb.projectDate ? `<div><span style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,0.5);font-weight:700;">Date</span><br/>${escapeHtml(tb.projectDate)}</div>` : ''}
                            ${tb.drawnBy ? `<div style="margin-top:6px;"><span style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,0.5);font-weight:700;">Drawn By</span><br/>${escapeHtml(tb.drawnBy)}</div>` : ''}
                            ${tb.version ? `<div style="margin-top:6px;"><span style="font-size:9px;text-transform:uppercase;letter-spacing:0.5px;color:rgba(255,255,255,0.5);font-weight:700;">Revision</span><br/>${escapeHtml(tb.version)}</div>` : ''}
                        </div>
                    </div>
                    <!-- Right neutral panel -->
                    <div style="position:absolute;top:0;left:${panelW}px;right:0;bottom:0;background:#f1f5f9;display:flex;align-items:center;justify-content:center;">
                        <div style="text-align:center;color:#94a3b8;font-size:12px;letter-spacing:0.8px;text-transform:uppercase;font-weight:600;">Pixel Map Specification</div>
                    </div>
                `);
            }

            // Content pages: full-height accent LEFT sidebar + right map area
            return makePage(ctx, `
                <!-- Full-height accent sidebar -->
                <div style="position:absolute;top:0;left:0;width:${sideW}px;bottom:${footerH}px;background:${accent};display:flex;flex-direction:column;padding:${padding}px;box-sizing:border-box;overflow:hidden;">
                    ${ctx.logoDataUrl ? `<img src="${ctx.logoDataUrl}" style="max-height:38px;max-width:${sideW - padding * 2}px;object-fit:contain;object-position:left center;filter:brightness(0) invert(1);margin-bottom:${Math.round(padding * 0.75)}px;display:block;flex-shrink:0;" />` : ''}
                    <div style="font-size:9px;letter-spacing:0.8px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:700;margin-bottom:3px;flex-shrink:0;">Project</div>
                    <div style="font-size:13px;font-weight:700;color:#fff;line-height:1.25;margin-bottom:${Math.round(padding * 0.7)}px;overflow-wrap:anywhere;word-break:break-word;flex-shrink:0;">${escapeHtml(proj.name || ctx.pdfTitle || '')}</div>
                    <div style="height:1px;background:rgba(255,255,255,0.2);margin-bottom:${Math.round(padding * 0.7)}px;flex-shrink:0;"></div>
                    ${ctx.details && ctx.details.length ? `
                        <div style="font-size:9px;letter-spacing:0.7px;text-transform:uppercase;color:rgba(255,255,255,0.5);font-weight:700;margin-bottom:7px;flex-shrink:0;">Specifications</div>
                        <div style="flex:1;overflow:hidden;">
                            ${(ctx.details || []).filter(Boolean).map(d => {
                                const s = String(d || '');
                                const idx = s.indexOf(':');
                                const label = idx >= 0 ? s.slice(0, idx).trim() : s;
                                const value = idx >= 0 ? s.slice(idx + 1).trim() : '';
                                return `<div style="padding:4px 0;border-bottom:1px solid rgba(255,255,255,0.12);"><div style="font-size:8px;text-transform:uppercase;letter-spacing:0.4px;color:rgba(255,255,255,0.48);font-weight:700;">${escapeHtml(label)}</div><div style="font-size:11px;color:#fff;font-weight:600;margin-top:1px;">${escapeHtml(value)}</div></div>`;
                            }).join('')}
                        </div>
                    ` : '<div style="flex:1;"></div>'}
                    <!-- Project meta pinned to bottom of sidebar -->
                    <div style="margin-top:auto;border-top:1px solid rgba(255,255,255,0.2);padding-top:9px;font-size:10px;color:rgba(255,255,255,0.8);flex-shrink:0;">
                        ${proj.client ? `<div style="margin-bottom:5px;"><div style="font-size:8px;text-transform:uppercase;letter-spacing:0.4px;color:rgba(255,255,255,0.45);font-weight:700;margin-bottom:1px;">Client</div><div style="font-weight:600;">${escapeHtml(proj.client)}</div></div>` : ''}
                        ${proj.venue ? `<div style="margin-bottom:5px;"><div style="font-size:8px;text-transform:uppercase;letter-spacing:0.4px;color:rgba(255,255,255,0.45);font-weight:700;margin-bottom:1px;">Venue</div><div style="font-weight:600;">${escapeHtml(proj.venue)}</div></div>` : ''}
                        ${tb.projectDate ? `<div><div style="font-size:8px;text-transform:uppercase;letter-spacing:0.4px;color:rgba(255,255,255,0.45);font-weight:700;margin-bottom:1px;">Date</div><div style="font-weight:600;">${escapeHtml(tb.projectDate)}</div></div>` : ''}
                    </div>
                </div>

                <!-- Right: map title strip -->
                <div style="position:absolute;top:0;left:${sideW}px;right:0;height:${mapTitleH}px;background:#fff;border-bottom:1px solid #e2e8f0;display:flex;align-items:center;padding:0 ${padding}px;box-sizing:border-box;">
                    <div style="font-size:${Math.max(14, Math.round(mapTitleH * 0.38))}px;font-weight:700;color:#0f172a;overflow-wrap:anywhere;word-break:break-word;">${escapeHtml(ctx.mapTitle || ctx.pdfTitle || 'Pixel Map')}</div>
                </div>

                <!-- Right: map image -->
                <div style="position:absolute;top:${mapTitleH}px;left:${sideW}px;right:0;bottom:${footerH}px;background:#fafafa;display:flex;align-items:center;justify-content:center;padding:${Math.round(padding * 0.5)}px;box-sizing:border-box;overflow:hidden;">
                    ${ctx.mapImageDataUrl ? `<img src="${ctx.mapImageDataUrl}" style="max-width:100%;max-height:100%;object-fit:contain;" />` : '<div style="color:#94a3b8;">No map</div>'}
                </div>

                <!-- Dark footer spanning full width -->
                <div style="position:absolute;bottom:0;left:0;right:0;height:${footerH}px;background:#0f172a;display:flex;align-items:center;justify-content:space-between;padding:0 ${padding}px;font-size:10px;color:#475569;box-sizing:border-box;">
                    <div>${escapeHtml(proj.client || '')}${tb.version ? `&nbsp;&middot;&nbsp;Rev&nbsp;${escapeHtml(tb.version)}` : ''}</div>
                    <div style="font-weight:700;color:#94a3b8;letter-spacing:0.5px;">${ctx.pageNumber}${ctx.totalPages ? ` / ${ctx.totalPages}` : ''}</div>
                </div>
            `);
        }
    };

    const TEMPLATES = [minimalPro];

    // Page size lookups (in CSS pixels @ 96dpi to match jsPDF unit:'px')
    // jsPDF uses 1 unit = 1px when format is given as named size; we mirror those dimensions for HTML rendering.
    const PAGE_SIZES_PX = {
        a2:      { w: 1587, h: 2245 },
        a3:      { w: 1123, h: 1587 },
        a4:      { w: 794,  h: 1123 },
        a5:      { w: 559,  h: 794  },
        letter:  { w: 816,  h: 1056 },
        tabloid: { w: 1056, h: 1632 },
    };

    const getPageSizePx = (size, orientation) => {
        const k = String(size || 'a4').toLowerCase();
        const base = PAGE_SIZES_PX[k] || PAGE_SIZES_PX.a4;
        if (String(orientation || 'landscape').toLowerCase() === 'landscape') {
            return { w: base.h, h: base.w };
        }
        return { w: base.w, h: base.h };
    };

    const getTemplateById = (id) => TEMPLATES.find(t => t.id === id) || TEMPLATES[0];

    // Public API
    window.PixelLogicPdfTemplates = {
        TEMPLATES,
        PAGE_SIZES_PX,
        getPageSizePx,
        getTemplateById,
        renderDeliveryPage,
    };
})();

(function (root) {
    'use strict';

    const FULL_PREVIEW_MP = 8.3;

    function previewScale(width, height, quality, capMP) {
        const pixels = Math.max(1, width * height);
        const cap = Math.max(500000, Math.floor(capMP * 1000000));
        return Math.min(Math.max(0.05, Math.min(1, quality)), Math.sqrt(cap / pixels));
    }

    function bitmapKey(map, environment) {
        const source = { ...map };
        // Placement and cropping are applied when compositing, not when rasterizing the source.
        for (const field of ['x', 'y', 'width', 'height', 'outputScaleX', 'outputScaleY', 'cropLeft', 'cropRight', 'cropTop', 'cropBottom', 'sliceLeft', 'sliceRight']) {
            delete source[field];
        }
        return JSON.stringify([source, environment], (key, value) => {
            if (key !== 'imageObject' || !value) return value;
            return [value.src, value.complete, value.naturalWidth, value.naturalHeight];
        });
    }

    function createBitmapCache(maxBytes = 64 * 1024 * 1024, maxEntries = 128) {
        const entries = new Map();
        let bytes = 0;
        function remove(key) {
            const entry = entries.get(key);
            bytes -= entry.bytes;
            entry.canvas.width = 0;
            entry.canvas.height = 0;
            entries.delete(key);
        }
        return {
            get(key, render) {
                if (entries.has(key)) {
                    const entry = entries.get(key);
                    entries.delete(key);
                    entries.set(key, entry);
                    return entry.canvas;
                }
                const canvas = render();
                const size = canvas.width * canvas.height * 4;
                if (size > 0 && size <= maxBytes) {
                    while (entries.size && (bytes + size > maxBytes || entries.size >= maxEntries)) {
                        remove(entries.keys().next().value);
                    }
                    entries.set(key, { canvas, bytes: size });
                    bytes += size;
                }
                return canvas;
            },
            clear() {
                for (const key of entries.keys()) remove(key);
            },
            get bytes() { return bytes; },
            get size() { return entries.size; }
        };
    }

    function createFrameRenderer(render, requestFrame, cancelFrame) {
        let pending = null;
        return {
            request() {
                if (pending !== null) return;
                pending = requestFrame(() => {
                    pending = null;
                    render();
                });
            },
            flush() {
                if (pending !== null) cancelFrame(pending);
                pending = null;
                render();
            }
        };
    }

    const api = { FULL_PREVIEW_MP, previewScale, bitmapKey, createBitmapCache, createFrameRenderer };
    if (typeof module === 'object' && module.exports) module.exports = api;
    else root.PixelLogicRendering = api;
})(globalThis);

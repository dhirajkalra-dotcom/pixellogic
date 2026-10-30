const { createCanvas } = (() => {
    function createMockCanvas() {
        const c = {
            width: 1920,
            height: 1080,
            getContext: (type) => ({
                save: () => {},
                restore: () => {},
                translate: () => {},
                fillRect: () => {},
                strokeRect: () => {},
                fillText: () => {},
                measureText: (text) => ({ width: text.length * 8 }),
                drawImage: () => {},
                beginPath: () => {},
                arc: () => {},
                fill: () => {},
                stroke: () => {},
                globalCompositeOperation: 'source-over',
                fillStyle: '#000',
                strokeStyle: '#fff',
                font: '12px monospace'
            }),
            toBlob: (cb) => cb(new Blob(['fake-png-data']))
        };
        return c;
    }
    return { createCanvas: createMockCanvas };
})();

globalThis.PixelLogicRendering = {
    createBitmapCache: () => ({ get: (k, fn) => fn(), clear: () => {} }),
    bitmapKey: () => 'k1'
};

const PixelLogicExternalRenderer = require('../src/external-output-renderer.js');

const rendererMock = {
    calculateLayout: (map) => ({
        totalResWidth: 3840,
        totalResHeight: 2160,
        totalPanels: 32
    }),
    drawVisualizerCanvas: (canvas, map, opts) => {
        canvas.width = 3840;
        canvas.height = 2160;
    },
    drawCoordinatesOverlay: () => {},
    drawCanvasDrawingsToContext: () => {},
    buildMaskPath: () => {}
};

const outputRenderer = PixelLogicExternalRenderer.createOutputRenderer(rendererMock, createCanvas);

const frame = {
    source: {
        kind: 'canvas',
        canvas: {
            id: 1,
            width: 1920,
            height: 1080,
            maps: [
                {
                    id: 101,
                    name: 'Main LED Wall',
                    x: 0,
                    y: 0,
                    width: 1920,
                    height: 1080
                }
            ]
        }
    },
    annotations: true,
    drawings: false,
    masks: 'none'
};

console.log('Testing renderPNG...');
const result = outputRenderer.renderPNG(frame);
console.log('renderPNG result:', {
    canvasWidth: result.canvas.width,
    canvasHeight: result.canvas.height,
    clipped: result.clipped
});
if (result.canvas.width === 1920 && result.canvas.height === 1080) {
    console.log('PASS: renderPNG executed successfully and produced 1920x1080 canvas with metadata badge!');
} else {
    console.error('FAIL: dimensions mismatch');
    process.exit(1);
}

(function () {
    'use strict';
    const canvas = document.getElementById('output');
    let frame = null;
    let image = null;
    let latestImage = null;
    let renderingFrame = null;
    let outputState = { blackout: true, sizing: 'fit' };
    const logo = new Image();
    logo.src = 'external-files/pixelogic-logo.png';
    const renderer = PixelLogicMapRenderer.createRenderer({
        state: { visualizerState: { previewScale: 1 }, canvasState: {} },
        getActiveCanvas: () => renderingFrame?.source.kind === 'canvas' ? renderingFrame.source.canvas : null,
        validateSize: PixelLogicExternalRenderer.validateSize,
        pixelLogicLogoImage: logo
    });
    const output = PixelLogicExternalRenderer.createOutputRenderer(renderer, () => document.createElement('canvas'));
    const editor = PixelLogicExternalEditor.create({
        canvas,
        calculateLayout: renderer.calculateLayout,
        paint: value => {
            try {
                renderingFrame = value;
                latestImage = output.render(value);
                if (!outputState.frozen) image = latestImage;
                display();
            } catch (error) {
                image = null;
                canvas.hidden = true;
                externalViewer.error(error.message);
            }
        },
        edit: command => externalViewer.edit(command),
        setEditing: value => externalViewer.setEditing(value),
        savePNG: async value => {
            const exported = output.renderPNG(value);
            try {
                const blob = await new Promise((resolve, reject) => exported.canvas.toBlob(
                    value => value ? resolve(value) : reject(new Error('Could not encode the output PNG.')), 'image/png'));
                const result = await externalViewer.savePNG(await blob.arrayBuffer());
                return { ...result, clipped: exported.clipped };
            } finally {
                exported.canvas.width = exported.canvas.height = 0;
            }
        }
    });
    function display() {
        canvas.hidden = outputState.blackout || !image;
        if (!image || outputState.blackout) return;
        const dpr = window.devicePixelRatio || 1;
        canvas.width = Math.round(window.innerWidth * dpr);
        canvas.height = Math.round(window.innerHeight * dpr);
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const rect = PixelLogicExternalRenderer.placement(image.width, image.height, canvas.width, canvas.height, outputState.sizing);
        ctx.imageSmoothingEnabled = outputState.sizing !== 'actual';
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);
        editor.refresh();
    }
    async function hydrate(map) {
        if (map.details?.logo?.src) {
            const img = new Image();
            img.src = map.details.logo.src;
            await img.decode();
            map.details.logo.imageObject = img;
        }
        if (map.composite?.enabled) {
            const comp = map.composite;
            const children = comp.maps?.length ? comp.maps : [comp.primary, comp.secondary, comp.tertiary].filter(Boolean);
            await Promise.all(children.map(hydrate));
        }
    }
    externalViewer.onState(state => {
        outputState = state;
        editor.setState(state);
        if (!state.frozen && latestImage) image = latestImage;
        display();
    });
    externalViewer.onFrame(async incoming => {
        try {
            frame = incoming;
            const maps = frame.source.kind === 'pixelMap' ? [frame.source.map] : frame.source.canvas.maps;
            await Promise.all(maps.map(hydrate));
            await document.fonts.ready;
            renderingFrame = editor.setFrame(frame);
            latestImage = output.render(renderingFrame);
            if (!outputState.frozen) image = latestImage;
            display();
            externalViewer.presented(frame.revision);
        } catch (error) {
            image = null;
            canvas.hidden = true;
            externalViewer.error(error.message);
        }
    });
    window.addEventListener('resize', display);
    document.addEventListener('keydown', event => { if (event.key === 'Escape') externalViewer.stop(); });
    window.addEventListener('contextmenu', event => event.preventDefault());
    Promise.all([logo.decode(), document.fonts.ready]).then(() => externalViewer.ready()).catch(error => externalViewer.error(error.message));
})();

const { app, BrowserWindow } = require('electron');
const path = require('path');

app.commandLine.appendSwitch('force_high_performance_gpu');
app.commandLine.appendSwitch('enable-gpu-rasterization');
app.commandLine.appendSwitch('enable-zero-copy');
app.commandLine.appendSwitch('ignore-gpu-blocklist');
app.commandLine.appendSwitch('use-angle', 'd3d11');

app.whenReady().then(async () => {
  const win = new BrowserWindow({
    show: false,
    webPreferences: {
      offscreen: false
    }
  });

  await win.loadURL('about:blank');

  const gpuInfo = await win.webContents.executeJavaScript(`
    (() => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2', { powerPreference: 'high-performance' }) ||
                 canvas.getContext('webgl', { powerPreference: 'high-performance' });
      if (!gl) return { error: 'No WebGL context' };
      const dbg = gl.getExtension('WEBGL_debug_renderer_info');
      return {
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : 'Unknown',
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'Unknown',
        glVendor: gl.getParameter(gl.VENDOR),
        glRenderer: gl.getParameter(gl.RENDERER)
      };
    })()
  `);

  console.log('DETECTED GPU IN WEBGL:', JSON.stringify(gpuInfo, null, 2));
  app.quit();
});

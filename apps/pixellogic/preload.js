const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('externalOutput', {
  getStatus: () => ipcRenderer.invoke('external-output:get-status'),
  start: (config, frame) => ipcRenderer.invoke('external-output:start', config, frame),
  update: frame => ipcRenderer.invoke('external-output:update', frame),
  control: (command, value) => ipcRenderer.invoke('external-output:control', command, value),
  onEdit: callback => {
    const listener = async (_event, request) => {
      try {
        const value = await callback(request.command);
        ipcRenderer.send('external-output:edit-result', { requestId: request.requestId, value });
      } catch (error) {
        ipcRenderer.send('external-output:edit-result', { requestId: request.requestId, error: error.message });
      }
    };
    ipcRenderer.on('external-output:edit-request', listener);
    return () => ipcRenderer.removeListener('external-output:edit-request', listener);
  },
  onStatus: callback => {
    const listener = (_event, status) => callback(status);
    ipcRenderer.on('external-output:status', listener);
    return () => ipcRenderer.removeListener('external-output:status', listener);
  }
});

contextBridge.exposeInMainWorld('appInfo', {
  getVersion: () => ipcRenderer.invoke('get-app-version'),
  getGraphicsStatus: () => ipcRenderer.invoke('get-graphics-status'),
});

contextBridge.exposeInMainWorld('systemFonts', {
  getFonts: () => ipcRenderer.invoke('get-system-fonts'),
});

contextBridge.exposeInMainWorld('tutorialVideo', {
  open: () => ipcRenderer.invoke('open-tutorial-video'),
});

contextBridge.exposeInMainWorld('tutorialPdf', {
  open: () => ipcRenderer.invoke('open-tutorial-pdf'),
});

contextBridge.exposeInMainWorld('firstRun', {
  check: () => ipcRenderer.invoke('check-first-run'),
});

contextBridge.exposeInMainWorld('licensing', {
  status: () => ipcRenderer.invoke('license-status'),
  machineId: () => ipcRenderer.invoke('license-machine-id'),
  activate: (key) => ipcRenderer.invoke('license-activate', key),
});

contextBridge.exposeInMainWorld('installedTemplate', {
  getDefault: () => ipcRenderer.invoke('get-installed-template'),
});

contextBridge.exposeInMainWorld('aiAutoMap', {
  extractPdfSpecs: (payload) => ipcRenderer.invoke('ai-auto-map-extract-pdf', payload),
  getKeyStatus: () => ipcRenderer.invoke('ai-auto-map-key-status'),
  saveKey: (payload) => ipcRenderer.invoke('ai-auto-map-key-save', payload),
  clearKey: () => ipcRenderer.invoke('ai-auto-map-key-clear'),
  testKey: () => ipcRenderer.invoke('ai-auto-map-key-test'),
});

contextBridge.exposeInMainWorld('videoConverter', {
  pickFiles:      ()              => ipcRenderer.invoke('converter-pick-files'),
  pickOutputDir:  ()              => ipcRenderer.invoke('converter-pick-output-dir'),
  pickFfmpeg:     ()              => ipcRenderer.invoke('converter-pick-ffmpeg'),
  probe:          (filePath)      => ipcRenderer.invoke('converter-probe', filePath),
  checkEncoder:   (opts)          => ipcRenderer.invoke('converter-check-encoder', opts),
  start:          (opts)          => ipcRenderer.invoke('converter-start', opts),
  cancel:         (jobId)         => ipcRenderer.invoke('converter-cancel', jobId),
  openFolder:     (folderPath)    => ipcRenderer.invoke('converter-open-folder', folderPath),
  onProgress:     (cb)            => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('converter-progress', handler);
    return () => ipcRenderer.removeListener('converter-progress', handler);
  },
  checkFullFfmpeg:    ()           => ipcRenderer.invoke('converter-check-full-ffmpeg'),
  downloadFullFfmpeg: ()           => ipcRenderer.invoke('converter-download-full-ffmpeg'),
  onFfmpegDownload:   (cb)         => {
    const handler = (_event, data) => cb(data);
    ipcRenderer.on('converter-ffmpeg-download', handler);
    return () => ipcRenderer.removeListener('converter-ffmpeg-download', handler);
  },
});

// Removed PPTX save API exposure

const protectMode = process.argv.includes('--pl-protect=1');

if (protectMode) {
  const blockKeydown = (event) => {
    const key = (event.key || '').toLowerCase();
    const ctrlOrMeta = event.ctrlKey || event.metaKey;
    const isDevtoolsCombo = ctrlOrMeta && event.shiftKey && (key === 'i' || key === 'c' || key === 'j');
    const isViewSourceCombo = ctrlOrMeta && (key === 'u' || key === 's');
    const isF12 = key === 'f12';

    if (isDevtoolsCombo || isViewSourceCombo || isF12) {
      event.preventDefault();
    }
  };

  window.addEventListener('contextmenu', (event) => event.preventDefault(), { capture: true });
  window.addEventListener('keydown', blockKeydown, { capture: true });
}

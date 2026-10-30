const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('externalViewer', {
    ready: () => ipcRenderer.send('external-output:ready'),
    presented: revision => ipcRenderer.send('external-output:presented', revision),
    error: message => ipcRenderer.send('external-output:error', message),
    stop: () => ipcRenderer.send('external-output:close'),
    edit: command => ipcRenderer.invoke('external-output:edit', command),
    setEditing: value => ipcRenderer.invoke('external-output:edit-mode', value),
    savePNG: bytes => ipcRenderer.invoke('external-output:save-png', bytes),
    onFrame: callback => ipcRenderer.on('external-output:frame', (_event, frame) => callback(frame)),
    onState: callback => ipcRenderer.on('external-output:state', (_event, state) => callback(state))
});

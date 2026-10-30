// Dump id shapes + map field coverage from a profile's localStorage (read-only analysis)
const { app, BrowserWindow } = require('electron');
const path = require('path');
const profArg = process.argv.find(a => a.startsWith('--profile='));
if (profArg) app.setPath('userData', profArg.slice(10));
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false });
  await win.loadURL('file:///' + path.join(__dirname, 'blank.html').replace(/\\/g, '/'));
  const r = await win.webContents.executeJavaScript(`(() => {
    const raw = localStorage.getItem('pixi-logic-projects');
    if (!raw) return 'no data';
    const d = JSON.parse(raw);
    const out = { activeProjectId: d.activeProjectId, projects: [] };
    for (const p of d.projects) {
      out.projects.push({ id: p.id, idType: typeof p.id, name: p.name, status: p.status, activePixelMapId: p.activePixelMapId,
        maps: (p.pixelMaps || []).map(m => ({ id: m.id, idType: typeof m.id, name: m.name, tiles: m.tilesWide + 'x' + m.tilesHigh, panels: Array.isArray(m.panels) ? m.panels.length : 'none',
          missingDetails: ['info','circle','cross','corners','cornerCircles','coords','colorBars','logo','shared'].filter(k => !m.details || !m.details[k]) })) });
    }
    return out;
  })()`);
  console.log(JSON.stringify(r, null, 1));
  app.quit();
});

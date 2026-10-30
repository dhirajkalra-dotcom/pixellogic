// Workflow test: realistic actions across tabs, recording errors per step.
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const profArg = process.argv.find(a => a.startsWith('--profile='));
if (profArg) app.setPath('userData', profArg.slice(10));
const stubs = { 'license-status': { valid: true, edition: 'advanced' }, 'get-app-version': '1.0.135-test', 'get-system-fonts': ['Arial'], 'check-first-run': false };
['get-installed-template', 'get-app-version', 'get-system-fonts', 'check-first-run', 'license-status', 'license-machine-id', 'get-graphics-status', 'external-output:get-status', 'ai-auto-map-key-status']
  .forEach(k => ipcMain.handle(k, () => (k in stubs ? stubs[k] : null)));

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1600, height: 950, webPreferences: { preload: path.join(__dirname, '..', 'preload.js'), contextIsolation: true, backgroundThrottling: false } });
  const consoleErrs = [];
  win.webContents.on('console-message', (e) => {
    const lvl = e.level ?? e.params?.level; const msg = e.message ?? e.params?.message;
    if (lvl === 'error' || lvl === 3) consoleErrs.push(String(msg).slice(0, 500));
  });
  await win.loadFile(path.join(__dirname, '..', 'index.html'));
  await new Promise(r => setTimeout(r, 2500));
  const result = await win.webContents.executeJavaScript(`(async () => {
    const steps = [];
    const errs = [];
    window.addEventListener('error', e => errs.push('ERR ' + e.message + ' @' + e.lineno));
    window.addEventListener('unhandledrejection', e => errs.push('REJ ' + (e.reason && (e.reason.stack || e.reason.message) || e.reason)));
    const oe = console.error; console.error = (...a) => { errs.push('CE ' + a.map(x => x && x.stack ? x.stack.split('\\n').slice(0,3).join(' / ') : String(x)).join(' | ')); oe.apply(console, a); };
    const wait = (ms) => new Promise(r => setTimeout(r, ms));
    const step = async (name, fn, ms = 500) => {
      const before = errs.length; const t0 = performance.now();
      let note = '';
      try { note = (await fn()) || ''; } catch (e) { errs.push('STEP-THROW ' + name + ': ' + e.message); }
      await wait(ms);
      steps.push({ name, ms: Math.round(performance.now() - t0 - ms), note: String(note), errors: errs.slice(before) });
    };
    const tab = (t) => document.querySelector('[data-tab="' + t + '"]').click();
    const setVal = (el, v, evt = 'change') => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event(evt, { bubbles: true })); };
    const TABS = ['sheets','designer','effects','visualizer','view3d','canvas','led-patching','pdf','power-calc'];

    await step('advanced edition', () => { const sw = document.getElementById('app-edition-switch'); if (sw && !sw.checked) sw.click(); });
    await step('designer', () => tab('designer'), 800);
    const mapIds = [...document.querySelectorAll('.pixel-map-tab')].map(b => b.dataset.mapId);
    steps.push({ name: 'map tabs found', note: mapIds.join(',') });
    for (const id of mapIds) {
      await step('designer select map ' + id, () => { const b = document.querySelector('.pixel-map-tab[data-map-id="' + id + '"]'); if (!b) return 'tab missing'; b.click(); const a = document.querySelector('.pixel-map-tab[data-active="true"]'); return 'active=' + (a && a.dataset.mapId); }, 600);
      for (const t of TABS) await step('  visit ' + t + ' (map ' + id + ')', () => tab(t), 700);
      await step('back to designer', () => tab('designer'), 500);
    }
    await step('designer edit width 5', () => { const el = document.querySelector('[data-field="screenWidthValue"]'); if (!el) return 'no input'; setVal(el, '5'); return 'tilesWide now ' + (document.querySelector('[data-field="tilesWide"]')||{}).value; }, 600);
    await step('designer edit tilesHigh 6', () => { const el = document.querySelector('[data-field="tilesHigh"]'); if (!el) return 'no input'; setVal(el, '6'); return 'height now ' + (document.querySelector('[data-field="screenHeightValue"]')||{}).value; }, 600);
    await step('designer edit width empty', () => { const el = document.querySelector('[data-field="screenWidthValue"]'); setVal(el, ''); return 'tilesWide now ' + (document.querySelector('[data-field="tilesWide"]')||{}).value; }, 600);
    await step('designer edit width expr 4*2', () => { const el = document.querySelector('[data-field="screenWidthValue"]'); setVal(el, '4*2'); return 'tilesWide now ' + (document.querySelector('[data-field="tilesWide"]')||{}).value; }, 600);
    await step('designer add map', () => { const b = document.getElementById('add-pixel-map-btn'); b.click(); return 'tabs=' + document.querySelectorAll('.pixel-map-tab').length; }, 900);
    await step('designer: new map tabs count', () => 'tabs=' + document.querySelectorAll('.pixel-map-tab').length + ' active=' + (document.querySelector('.pixel-map-tab[data-active="true"]')||{}).textContent?.trim().slice(0,40));
    for (const t of TABS) await step('  visit ' + t + ' (new map)', () => tab(t), 700);

    await step('sheets', () => tab('sheets'), 700);
    await step('sheets rows', () => 'delete-row buttons=' + document.querySelectorAll('[data-action="delete-row"]').length);
    await step('sheets duplicate first', () => { const b = document.querySelector('[data-action="duplicate-row"]'); if (!b) return 'none'; b.click(); return 'rows=' + document.querySelectorAll('[data-action="delete-row"]').length; }, 700);
    await step('sheets rename last', () => { const els = document.querySelectorAll('[data-sheet-field="name"]'); const el = els[els.length-1]; if (!el) return 'no name input'; setVal(el, 'RENAMED X'); return 'ok'; }, 600);
    await step('designer shows rename', () => { tab('designer'); return [...document.querySelectorAll('.pixel-map-tab')].map(b => b.textContent.trim().slice(0,20)).join(' | '); }, 700);
    await step('sheets delete last', () => { tab('sheets'); const bs = document.querySelectorAll('[data-action="delete-row"]'); bs[bs.length-1].click(); return 'rows=' + document.querySelectorAll('[data-action="delete-row"]').length; }, 800);
    await step('sheets delete last again', () => { const bs = document.querySelectorAll('[data-action="delete-row"]'); bs[bs.length-1].click(); return 'rows=' + document.querySelectorAll('[data-action="delete-row"]').length; }, 800);
    for (const t of TABS) await step('  visit ' + t + ' (after deletes)', () => tab(t), 700);

    await step('shows: create project', () => { tab('shows'); }, 600);
    await step('shows: new project', () => { const n = document.getElementById('shows-new-project-name'); if (n) n.value = 'Sweep Test Project'; const b = document.getElementById('shows-create-project'); if (!b) return 'no create btn'; b.click(); return 'ok'; }, 900);
    for (const t of TABS) await step('  visit ' + t + ' (new project)', () => tab(t), 700);
    return steps;
  })()`).catch(e => [{ name: 'EXEC FAIL', note: String(e) }]);
  fs.writeFileSync(path.join(__dirname, 'workflow_result.json'), JSON.stringify({ result, consoleErrs }, null, 2));
  for (const s of result) {
    const flag = (s.errors && s.errors.length) ? '  <<< ERRORS' : '';
    console.log(`${s.name} [${s.ms ?? ''}ms] ${s.note || ''}${flag}`);
    (s.errors || []).forEach(e => console.log('     ' + e.slice(0, 400)));
  }
  app.quit();
});

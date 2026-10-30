// 1. "Menu" is already here from your code, which is great.
const { app, BrowserWindow, ipcMain, dialog, Menu, shell, safeStorage, screen } = require('electron');
// Electron requires this override before app readiness; normal startup keeps GPU acceleration enabled.
const gpuDisabledByEnvironment = process.env.PIXELLOGIC_DISABLE_GPU === '1';
if (gpuDisabledByEnvironment) {
  app.disableHardwareAcceleration();
} else {
  // DEDICATED HIGH-PERFORMANCE GPU ALLOCATION (NVIDIA / Discrete GPU)
  // Forces Chromium, ANGLE, and Windows DirectX to route Pixelogic to the high-performance dedicated NVIDIA GPU
  app.commandLine.appendSwitch('force_high_performance_gpu');
  app.commandLine.appendSwitch('enable-gpu-rasterization');
  app.commandLine.appendSwitch('enable-zero-copy');
  app.commandLine.appendSwitch('ignore-gpu-blocklist');
  app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
  if (process.platform === 'win32') {
    app.commandLine.appendSwitch('use-angle', 'd3d11');
  } else if (process.platform === 'darwin') {
    app.commandLine.appendSwitch('use-angle', 'metal');
  }
  app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
  app.commandLine.appendSwitch('enable-accelerated-video-decode');
  app.commandLine.appendSwitch('gpu-rasterization-msaa-sample-count', '4');
}

// Ensure Windows OS DirectX layer assigns Pixelogic executable to High-Performance dedicated GPU (NVIDIA)
if (process.platform === 'win32' && !gpuDisabledByEnvironment) {
  try {
    const { exec } = require('child_process');
    const exePath = process.execPath;
    exec(`reg add "HKCU\\Software\\Microsoft\\DirectX\\UserGpuPreferences" /v "${exePath}" /t REG_SZ /d "GpuPreference=2;" /f`, () => {});
  } catch (_) {}
}
const path = require('path');
const fs = require('fs');
const os = require('os');
const fontList = require('font-list');
const licensing = require('./licensing');

// Register licence + 15-day trial IPC handlers (license-status / license-machine-id / license-activate).
licensing.registerLicensing(app, ipcMain);

// Video converter deps — loaded safely (may be excluded from build)
let ffmpegStatic, ffprobeStatic, ffmpeg;
try {
  ffmpegStatic = require('ffmpeg-static');
  ffprobeStatic = require('ffprobe-static');
  ffmpeg = require('fluent-ffmpeg');
} catch (_) {
  console.warn('FFmpeg modules not available — video converter disabled.');
}

// In production (packaged), the binary is unpacked from asar into app.asar.unpacked
const resolveFfmpegPath = () => {
  if (!ffmpegStatic) return null;
  if (app.isPackaged && ffmpegStatic) {
    return ffmpegStatic.replace('app.asar', 'app.asar.unpacked');
  }
  return ffmpegStatic;
};
const resolveFfprobePath = () => {
  const p = ffprobeStatic?.path;
  if (app.isPackaged && p) {
    return p.replace('app.asar', 'app.asar.unpacked');
  }
  return p;
};
if (ffmpeg) {
  const fp = resolveFfmpegPath();
  const pp = resolveFfprobePath();
  if (fp) ffmpeg.setFfmpegPath(fp);
  if (pp) ffmpeg.setFfprobePath(pp);
}

// Parse ffmpeg timemark (HH:MM:SS.ss) to seconds
function parseTimemark(tm) {
  if (!tm) return 0;
  const parts = tm.split(':');
  if (parts.length === 3) {
    return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return 0;
}

// ── Full FFmpeg (with HAP/Notch) auto-download support ──────────────────────
function getFullFfmpegDir() {
  return path.join(app.getPath('userData'), 'ffmpeg-full');
}
function getFullFfmpegPath() {
  const exe = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  return path.join(getFullFfmpegDir(), exe);
}
function getFullFfprobePath() {
  const exe = process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe';
  return path.join(getFullFfmpegDir(), exe);
}

// Track active ffmpeg jobs: jobId -> ffmpeg command instance
const activeConversions = new Map();

const isProduction = app.isPackaged;
const GEMINI_KEY_FILE = 'gemini-api-key.bin';

function getGeminiKeyPath() {
  return path.join(app.getPath('userData'), GEMINI_KEY_FILE);
}

function maskApiKey(value) {
  const key = String(value || '').trim();
  if (!key) return '';
  if (key.length <= 8) return `${key.slice(0, 2)}****${key.slice(-1)}`;
  return `${key.slice(0, 4)}****${key.slice(-4)}`;
}

function readStoredGeminiApiKey() {
  try {
    const filePath = getGeminiKeyPath();
    if (!fs.existsSync(filePath)) return '';
    const content = fs.readFileSync(filePath);
    if (!content || !content.length) return '';

    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      try {
        return String(safeStorage.decryptString(content) || '').trim();
      } catch (_) {
        return '';
      }
    }
    return String(content.toString('utf8') || '').trim();
  } catch (_) {
    return '';
  }
}

function storeGeminiApiKey(apiKey) {
  try {
    const key = String(apiKey || '').trim();
    if (!key) return { ok: false, error: 'API key is empty.' };
    const filePath = getGeminiKeyPath();

    if (safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(key);
      fs.writeFileSync(filePath, encrypted);
      return { ok: true, encrypted: true };
    }

    fs.writeFileSync(filePath, Buffer.from(key, 'utf8'));
    return { ok: true, encrypted: false };
  } catch (error) {
    return { ok: false, error: error?.message || 'Failed to store key.' };
  }
}

function clearStoredGeminiApiKey() {
  try {
    const filePath = getGeminiKeyPath();
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error?.message || 'Failed to clear key.' };
  }
}

function resolveGeminiApiKey() {
  const stored = readStoredGeminiApiKey();
  if (stored) return { key: stored, source: 'stored' };
  const env = String(process.env.GEMINI_API_KEY || '').trim();
  if (env) return { key: env, source: 'env' };
  return { key: '', source: 'none' };
}

/**
 * Helper function to read an installed image and convert it to Base64
 */
function loadInstalledImage(imageName) {
  // 1. Get the path to the installed 'installed-resources' folder
  const imagePath = path.join(process.resourcesPath, 'installed-resources', imageName);
  
  // 2. Read the file
  const imageBuffer = fs.readFileSync(imagePath);
  
  // 3. Convert to Base64
  const imageBase64 = imageBuffer.toString('base64');
  
  // 4. Return the full Data URI string
  const extension = path.extname(imageName).substring(1); // 'jpg' or 'png'
  return `data:image/${extension};base64,${imageBase64}`;
}

// 2. Make mainWindow a global variable
let mainWindow;
let splashWindow;
const { createExternalOutputManager } = require('./src/external-output-manager');
let externalOutputManager;
const productConfigPath = path.join(__dirname, 'product-mode.json');
let productMode = null;
try {
  productMode = JSON.parse(fs.readFileSync(productConfigPath, 'utf8')).mode;
} catch (_) {}
const productName = productMode === 'projection' ? 'Projection Logic' : 'Pixelogic';

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 460,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    center: true,
    backgroundColor: '#00000000',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
  splashWindow.webContents.once('did-finish-load', () => {
    // Send version and logo path to splash renderer
    const logoPath = path.join(
      app.isPackaged ? path.join(process.resourcesPath, 'installed-resources') : path.join(__dirname, 'external-files'),
      'pixelogic-logo.png'
    );
    splashWindow.webContents.executeJavaScript(`
      window.dispatchEvent(new MessageEvent('message', {
        data: { version: ${JSON.stringify(app.getVersion())}, logoPath: ${JSON.stringify('file://' + logoPath.replace(/\\/g, '/'))} }
      }));
    `).catch(() => {});
  });
}

function createWindow() {
  // 3. Assign to the global variable
  mainWindow = new BrowserWindow({
    title: productName,
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#0b1220',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      spellcheck: false,
      backgroundThrottling: true,
      devTools: !isProduction,
      additionalArguments: isProduction ? ['--pl-protect=1'] : [],
    },
  });
  mainWindow.loadFile('index.html', productMode ? { query: { product: productMode } } : undefined);
  mainWindow.on('closed', () => externalOutputManager?.stop());
  mainWindow.webContents.on('render-process-gone', () => externalOutputManager?.stop());
  mainWindow.webContents.on('did-start-navigation', (_event, _url, isInPlace, isMainFrame) => {
    if (isMainFrame && !isInPlace) externalOutputManager?.stop();
  });

  // Show main window after it's ready, close splash with a short fade delay
  mainWindow.webContents.once('did-finish-load', () => {
    setTimeout(() => {
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow.show();
      mainWindow.focus();
    }, 400);
  });

  if (isProduction) {
    // Basic deterrence for devtools/view-source shortcuts and context menu.
    mainWindow.webContents.on('before-input-event', (event, input) => {
      if (input.type !== 'keyDown') return;
      const key = (input.key || '').toLowerCase();
      const ctrlOrMeta = input.control || input.meta;
      const isDevtoolsCombo = ctrlOrMeta && input.shift && (key === 'i' || key === 'c' || key === 'j');
      const isViewSourceCombo = ctrlOrMeta && (key === 'u' || key === 's');
      const isF12 = key === 'f12';

      if (isDevtoolsCombo || isViewSourceCombo || isF12) {
        event.preventDefault();
      }
    });

    mainWindow.webContents.on('context-menu', (event) => {
      event.preventDefault();
    });
  }
}

// 4. THIS IS THE FULLY UPDATED MENU BLOCK
// --- Create Application Menu ---
const menuTemplate = [
  ...(process.platform === 'darwin' ? [{ role: 'appMenu' }] : []),
  // Add the default File and Edit menus; hide View menu in production.
  { role: 'fileMenu' },
  { role: 'editMenu' },
  ...(isProduction ? [] : [{ role: 'viewMenu' }]),
  {
    role: 'help',
    submenu: [
      {
        label: 'About Pixelogic',
        // This 'click' handler is updated to open the new window
        click: () => {
          const aboutWindow = new BrowserWindow({
            width: 450,
            height: 350,
            title: 'About Pixelogic',
            modal: true, // Makes it a modal window
            parent: mainWindow, // Sets the main window as the parent
            autoHideMenuBar: true, // Hides its own menu bar
            webPreferences: {
              nodeIntegration: false,
              contextIsolation: true,
            }
          });
          // Load the About page and pass the app version in the URL query
          let licenseQuery = {};
          try {
            const ent = licensing.buildEntitlement(app);
            licenseQuery = {
              licensed: ent.licensed ? '1' : '0',
              enforced: ent.enforced ? '1' : '0',
              machine: ent.machineId || '',
              lexp: String(ent.licenseExpiresAt || 0),
              texp: String((ent.trial && ent.trial.expiresAt) || 0),
              tdays: String((ent.trial && ent.trial.daysRemaining) || 0),
              texpired: ent.trial && ent.trial.expired ? '1' : '0',
            };
          } catch (_) { /* ignore — About still shows without licence info */ }
          aboutWindow.loadFile(path.join(__dirname, 'about.html'), {
            query: { v: app.getVersion(), ...licenseQuery }
          });
        }
      }
    ]
  }
];

const menu = Menu.buildFromTemplate(menuTemplate);
Menu.setApplicationMenu(menu);
// --- END OF UPDATED BLOCK ---


app.whenReady().then(() => {
  createSplash();
  createWindow();
  externalOutputManager = createExternalOutputManager({ BrowserWindow, screen, ipcMain, dialog, getEditor: () => mainWindow });
});

ipcMain.handle('get-graphics-status', async () => {
  const info = await app.getGPUInfo('complete');
  return {
    disabledByEnvironment: gpuDisabledByEnvironment,
    features: app.getGPUFeatureStatus(),
    devices: info.gpuDevice || [],
    renderer: info.auxAttributes?.glRenderer || ''
  };
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});


// --- PDF Export Logic ---
// (This section is unchanged and correct)
ipcMain.handle('export-pdf', async (event, data) => {
    const { canceled, filePath } = await dialog.showSaveDialog({
        title: 'Save PDF',
        defaultPath: path.join(app.getPath('documents'), `${data.projectName}.pdf`),
        filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
    });

    if (canceled) {
        return false;
    }

    try {
        // --- This is the new logic ---
        
        // 1. Load both your installed images
  const bgImageData = loadInstalledImage('default-template.png');
  const logoImageData = loadInstalledImage('logo.png');

        // 2. Read your HTML template
        const templateHtmlPath = path.join(__dirname, 'templates', 'report-template.html');
        let htmlContent = fs.readFileSync(templateHtmlPath, 'utf8');

        // 3. Inject all your data and images
        htmlContent = htmlContent.replace('{{projectName}}', data.projectName);
        htmlContent = htmlContent.replace('{{totalWidth}}', data.totalWidth);
        htmlContent = htmlContent.replace('{{totalHeight}}', data.totalHeight);
        htmlContent = htmlContent.replace('{{totalPixels}}', data.totalPixels.toLocaleString());
        
        // Inject the images into their placeholders
        htmlContent = htmlContent.replace('{{TEMPLATE_BACKGROUND_IMAGE}}', bgImageData);
        htmlContent = htmlContent.replace('{{LOGO_IMAGE}}', logoImageData);

        // --- End of new logic ---

        // 4. Create the PDF
        const pdfWindow = new BrowserWindow({ show: false });
        await pdfWindow.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(htmlContent));

        const pdfOptions = {
            pageSize: 'A4',
            printBackground: true,
            marginsType: 0,
        };

        const pdfData = await pdfWindow.webContents.printToPDF(pdfOptions);
        fs.writeFileSync(filePath, pdfData);
        
        pdfWindow.close();
        return true;

    } catch (error) {
        console.error('Failed to generate PDF:', error);
        return false;
    }
});

// Provide installed default template artwork to renderer (first-run auto-load)
ipcMain.handle('get-installed-template', async () => {
  try {
    const imagePath = path.join(process.resourcesPath, 'installed-resources', 'default-template.png');
    if (!fs.existsSync(imagePath)) return null;
    return loadInstalledImage('default-template.png');
  } catch (error) {
    console.warn('Failed to load installed default template', error);
    return null;
  }
});

// Provide app version to renderer
ipcMain.handle('get-app-version', () => app.getVersion());

// Provide installed system fonts to renderer (best effort)
ipcMain.handle('get-system-fonts', async () => {
  try {
    const fonts = await fontList.getFonts({ disableQuoting: true });
    const sanitized = Array.from(new Set((fonts || [])
      .map((font) => (font || '').replace(/["']/g, '').trim())
      .filter(Boolean)));
    return sanitized.slice(0, 1000);
  } catch (error) {
    console.warn('System font detection failed', error);
    return [];
  }
});

// Open the Tutorial PDF from external-files / installed-resources
ipcMain.handle('open-tutorial-pdf', async () => {
  try {
    // In production the file lives in installed-resources (extraResources target),
    // in development it lives next to the project in external-files/.
    const pdfName = 'Tutorial_pixel logic.pdf';
    const candidates = [
      path.join(process.resourcesPath, 'installed-resources', pdfName),
      path.join(__dirname, 'external-files', pdfName),
    ];
    const pdfPath = candidates.find(p => fs.existsSync(p)) || candidates[0];
    if (!fs.existsSync(pdfPath)) {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'Tutorial PDF not found',
        message: 'The tutorial PDF could not be found.',
        detail: `Expected at: ${pdfPath}`,
      });
      return { ok: false, error: 'Tutorial PDF not found', path: pdfPath };
    }
    const result = await shell.openPath(pdfPath);
    if (result) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Unable to open PDF',
        message: 'Pixelogic could not open the tutorial PDF with your default PDF viewer.',
        detail: `${result}\n\nFile: ${pdfPath}`,
      });
      return { ok: false, error: result, path: pdfPath };
    }
    return { ok: true, path: pdfPath };
  } catch (error) {
    console.error('open-tutorial-pdf failed', error);
    return { ok: false, error: (error && error.message) ? error.message : String(error) };
  }
});

// Open the bundled tutorial video (installed with the app)
ipcMain.handle('open-tutorial-video', async () => {
  try {
    const baseDir = path.join(process.resourcesPath, 'installed-resources');
    const candidates = [
      'video-tutorial.mp4',
      'Demo_PixelLogic.mp4',
      'tutorial.mp4',
      'PixelLogic Tutorial.mp4',
      'PixelLogic-Tutorial.mp4',
    ];

    let videoPath = null;
    for (const name of candidates) {
      const p = path.join(baseDir, name);
      if (fs.existsSync(p)) { videoPath = p; break; }
    }

    if (!videoPath) {
      await dialog.showMessageBox({
        type: 'warning',
        title: 'Tutorial video not found',
        message: 'The tutorial video could not be found in the installed resources folder.',
        detail: `Expected one of: ${candidates.join(', ')}\n\nFolder: ${baseDir}`,
      });
      return { ok: false, error: 'Tutorial video not found', baseDir, candidates };
    }

    const result = await shell.openPath(videoPath);
    if (result) {
      await dialog.showMessageBox({
        type: 'error',
        title: 'Unable to open video',
        message: 'Pixelogic could not open the tutorial video with your default video player.',
        detail: `${result}\n\nFile: ${videoPath}`,
      });
      return { ok: false, error: result, path: videoPath };
    }

    return { ok: true, path: videoPath };
  } catch (error) {
    console.error('open-tutorial-video failed', error);
    return { ok: false, error: (error && error.message) ? error.message : String(error) };
  }
});

ipcMain.handle('ai-auto-map-key-status', async () => {
  try {
    const stored = readStoredGeminiApiKey();
    const env = String(process.env.GEMINI_API_KEY || '').trim();
    const resolved = resolveGeminiApiKey();
    const encryptionAvailable = !!(safeStorage && typeof safeStorage.isEncryptionAvailable === 'function' && safeStorage.isEncryptionAvailable());
    return {
      ok: true,
      hasStoredKey: !!stored,
      hasEnvKey: !!env,
      activeSource: resolved.source,
      keyPreview: resolved.key ? maskApiKey(resolved.key) : '',
      encryptionAvailable,
    };
  } catch (error) {
    return { ok: false, error: error?.message || 'Failed to read key status.' };
  }
});

ipcMain.handle('ai-auto-map-key-save', async (_event, payload) => {
  const key = String(payload?.apiKey || '').trim();
  if (key.length < 12) return { ok: false, error: 'API key looks too short.' };
  return storeGeminiApiKey(key);
});

ipcMain.handle('ai-auto-map-key-clear', async () => {
  return clearStoredGeminiApiKey();
});

ipcMain.handle('ai-auto-map-key-test', async () => {
  try {
    const resolved = resolveGeminiApiKey();
    if (!resolved.key) return { ok: false, error: 'No Gemini API key configured.' };
    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey: resolved.key });

    let response = null;
    let usedModel = '';
    let lastError = null;
    for (const model of ['gemini-2.5-flash', 'gemini-1.5-pro']) {
      try {
        response = await ai.models.generateContent({
          model,
          contents: 'Reply with OK only.',
          config: { temperature: 0 }
        });
        usedModel = model;
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (!response) return { ok: false, error: lastError?.message || 'Key test failed.' };

    return {
      ok: true,
      model: usedModel,
      source: resolved.source,
      preview: maskApiKey(resolved.key),
      text: String(response?.text || '').trim().slice(0, 80)
    };
  } catch (error) {
    return { ok: false, error: error?.message || 'Key test failed.' };
  }
});

// Extract LED wall specs from uploaded PDF using Gemini
ipcMain.handle('ai-auto-map-extract-pdf', async (_event, payload) => {
  try {
    const payloadKey = String(payload?.apiKey || '').trim();
    const apiKey = payloadKey || resolveGeminiApiKey().key;
    if (!apiKey) {
      return { ok: false, error: 'Gemini API key not configured. Add it in AI Auto Map.' };
    }

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const fileName = String(payload?.fileName || 'tech-rider.pdf');
    const rawBytes = payload?.fileBytes;
    if (!rawBytes) return { ok: false, error: 'Missing PDF bytes.' };

    const bytes = rawBytes instanceof Uint8Array ? rawBytes : Uint8Array.from(rawBytes);
    if (!bytes.length) return { ok: false, error: 'Empty PDF file.' };

    const tempName = `pixellogic-ai-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`;
    const tempPath = path.join(os.tmpdir(), tempName);
    fs.writeFileSync(tempPath, Buffer.from(bytes));

    try {
      const uploadedFile = await ai.files.upload({
        file: tempPath,
        mimeType: 'application/pdf',
      });

      const ledMapSchema = {
        type: 'ARRAY',
        description: 'A list of LED screens and projection surfaces found in the document.',
        items: {
          type: 'OBJECT',
          properties: {
            screen_name: { type: 'STRING' },
            led_brand_model: { type: 'STRING' },
            pixel_pitch_mm: { type: 'NUMBER' },
            physical_width_meters: { type: 'NUMBER' },
            physical_height_meters: { type: 'NUMBER' },
            total_resolution_width: { type: 'INTEGER' },
            total_resolution_height: { type: 'INTEGER' },
          },
          required: [
            'screen_name',
            'physical_width_meters',
            'physical_height_meters',
            'total_resolution_width',
            'total_resolution_height',
          ],
        },
      };

      const systemInstruction = `
You are an expert live event video engineer. Review the attached tech rider/AV PDF.
Extract every LED wall, projection screen, or video surface.
If total pixel resolution is not explicit, infer from panel size/pitch/panel counts when possible.
Return ONLY valid JSON matching the response schema.
Do not include markdown, prose, or extra keys.
`;

      let response = null;
      let lastError = null;
      for (const model of ['gemini-2.5-flash', 'gemini-1.5-pro']) {
        try {
          response = await ai.models.generateContent({
            model,
            contents: [uploadedFile, systemInstruction],
            config: {
              responseMimeType: 'application/json',
              responseSchema: ledMapSchema,
              temperature: 0.1,
            },
          });
          if (response) break;
        } catch (e) {
          lastError = e;
        }
      }

      if (!response) {
        return { ok: false, error: `Gemini request failed: ${lastError?.message || 'Unknown error'}` };
      }

      const text = String(response.text || '').trim();
      const data = JSON.parse(text);
      if (!Array.isArray(data)) {
        return { ok: false, error: 'Gemini response was not an array.' };
      }

      return { ok: true, data, fileName };
    } finally {
      try { fs.unlinkSync(tempPath); } catch (_) {}
    }
  } catch (error) {
    return { ok: false, error: `AI extract failed: ${error?.message || String(error)}` };
  }
});

// ─── Video / Audio Converter ───────────────────────────────────────────────

// Pick source file(s)
ipcMain.handle('converter-pick-files', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Select media files to convert',
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Video & Audio', extensions: ['mp4','mov','avi','mkv','wmv','flv','webm','m4v','ts','mxf','mp3','wav','aac','flac','ogg','m4a','aiff','wma'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return canceled ? [] : filePaths;
});

// Pick output directory
ipcMain.handle('converter-pick-output-dir', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Select output folder',
    properties: ['openDirectory'],
  });
  return canceled ? null : filePaths[0];
});

// Browse for a custom FFmpeg binary
ipcMain.handle('converter-pick-ffmpeg', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Select FFmpeg executable (with HAP support)',
    properties: ['openFile'],
    filters: [
      { name: 'Executable', extensions: ['exe', '*'] },
    ],
  });
  return canceled ? null : filePaths[0];
});

// Check whether a given encoder exists in a given ffmpeg binary
ipcMain.handle('converter-check-encoder', async (_event, { encoder, ffmpegPath: customPath }) => {
  const binPath = customPath || resolveFfmpegPath();
  const { spawn } = require('child_process');
  return new Promise((resolve) => {
    const proc = spawn(binPath, [
      '-f', 'lavfi', '-i', 'testsrc=duration=0.1:size=64x64:rate=25',
      '-vcodec', encoder, '-t', '0.1', '-f', 'null', '-',
    ], { windowsHide: true });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) return resolve({ ok: true });
      if (/Unknown encoder|Encoder not found/i.test(stderr)) {
        return resolve({ ok: false, error: 'HAP encoder not found in this FFmpeg build. Download an FFmpeg build with HAP support (e.g. from notch.one or vidvox.net).' });
      }
      resolve({ ok: false, error: `Exit code ${code}` });
    });
    proc.on('error', (err) => resolve({ ok: false, error: err.message }));
  });
});

// Probe a file for streams / metadata
ipcMain.handle('converter-probe', async (_event, filePath) => {
  return new Promise((resolve) => {
    ffmpeg.ffprobe(filePath, (err, meta) => {
      if (err) return resolve({ ok: false, error: err.message });
      const streams = (meta.streams || []).map(s => ({
        index: s.index,
        codec_type: s.codec_type,
        codec_name: s.codec_name,
        width: s.width,
        height: s.height,
        r_frame_rate: s.r_frame_rate,
        bit_rate: s.bit_rate,
        sample_rate: s.sample_rate,
        channels: s.channels,
        channel_layout: s.channel_layout,
      }));
      resolve({ ok: true, duration: meta.format?.duration, format: meta.format?.format_name, streams });
    });
  });
});

// Start a conversion job
ipcMain.handle('converter-start', async (event, opts) => {
  const jobId = `job-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const {
    inputPath,
    outputDir,
    outputFilename,
    format,             // e.g. 'mp4', 'mov', 'wav'
    videoCodec,         // e.g. 'libx264', 'prores_ks', 'copy', null (audio-only)
    audioCodec,         // e.g. 'aac', 'pcm_s24le', 'copy'
    videoBitrate,       // e.g. '8000k'
    audioBitrate,       // e.g. '320k'
    audioSampleRate,    // e.g. '48000'
    audioChannels,      // e.g. 2
    resolution,         // e.g. '1920x1080' or null
    fps,                // e.g. 25 or null
    proResProfile,      // 0-5 for prores
    extraOutputOptions, // array of extra ffmpeg args
    ffmpegPath: customFfmpegPath, // optional custom binary path (required for HAP)
    totalDuration,      // total input duration in seconds (for progress calc)
  } = opts;

  // Harden against path traversal: strip any directory components from the filename
  const safeOutputFilename = path.basename(String(outputFilename || 'output'));
  const outputPath = path.join(outputDir, safeOutputFilename);

  return new Promise((resolve) => {
    // Use custom path, auto-detect full FFmpeg for HAP/DXV/Notch, or fall back to bundled
    const needsFullFfmpeg = (videoCodec === 'hap' || videoCodec === 'dxv' || videoCodec === 'notchlc');
    let activeFfmpegPath = customFfmpegPath;
    if (!activeFfmpegPath && needsFullFfmpeg) {
      const fullPath = getFullFfmpegPath();
      if (fs.existsSync(fullPath)) activeFfmpegPath = fullPath;
    }
    if (!activeFfmpegPath) activeFfmpegPath = resolveFfmpegPath();
    const fluentCmd = require('fluent-ffmpeg');
    fluentCmd.setFfmpegPath(activeFfmpegPath);
    let cmd = fluentCmd(inputPath).output(outputPath);

    if (videoCodec === null || videoCodec === 'none') {
      cmd.noVideo();
    } else {
      if (videoCodec) cmd.videoCodec(videoCodec);
      if (videoBitrate) cmd.videoBitrate(videoBitrate);
      if (resolution) cmd.size(resolution);
      if (fps) cmd.fps(fps);
      if (videoCodec === 'prores_ks' && proResProfile != null) {
        cmd.outputOptions([`-profile:v ${proResProfile}`]);
      }
    }

    if (audioCodec) cmd.audioCodec(audioCodec);
    if (audioBitrate) cmd.audioBitrate(audioBitrate);
    if (audioSampleRate) cmd.audioFrequency(Number(audioSampleRate));
    if (audioChannels) cmd.audioChannels(Number(audioChannels));

    // Always overwrite existing output files
    cmd.outputOptions('-y');

    if (Array.isArray(extraOutputOptions) && extraOutputOptions.length) {
      cmd.outputOptions(extraOutputOptions);
    }

    cmd
      .on('start', (cmdLine) => {
        event.sender.send('converter-progress', { jobId, type: 'start', cmdLine });
      })
      .on('progress', (progress) => {
        // Calculate percent from timemark if totalDuration is available (more reliable than ffprobe-based percent)
        let pct = progress.percent || 0;
        if (totalDuration > 0 && progress.timemark) {
          const elapsed = parseTimemark(progress.timemark);
          pct = Math.min((elapsed / totalDuration) * 100, 99.9);
        }
        event.sender.send('converter-progress', {
          jobId,
          type: 'progress',
          percent: pct,
          timemark: progress.timemark,
          currentFps: progress.currentFps,
          targetSize: progress.targetSize,
        });
      })
      .on('end', () => {
        activeConversions.delete(jobId);
        event.sender.send('converter-progress', { jobId, type: 'done', outputPath });
        resolve({ ok: true, jobId, outputPath });
      })
      .on('error', (err) => {
        activeConversions.delete(jobId);
        event.sender.send('converter-progress', { jobId, type: 'error', error: err.message });
        resolve({ ok: false, jobId, error: err.message });
      })
      .run();

    activeConversions.set(jobId, cmd);
    // Return jobId immediately so the renderer can track / cancel
    resolve({ ok: true, jobId, outputPath, pending: true });
  });
});

// Check if full FFmpeg with HAP support is installed
ipcMain.handle('converter-check-full-ffmpeg', async () => {
  const ffmpegExe = getFullFfmpegPath();
  if (!fs.existsSync(ffmpegExe)) return { installed: false, hasHap: false, hasDxv: false };
  return new Promise((resolve) => {
    const { execFile } = require('child_process');
    execFile(ffmpegExe, ['-encoders'], { timeout: 15000 }, (err, stdout) => {
      if (err) return resolve({ installed: true, hasHap: false, hasDxv: false, error: err.message });
      const hasHap = /V\..*hap/i.test(stdout);
      const hasDxv = /V\..*dxv/i.test(stdout);
      resolve({ installed: true, hasHap, hasDxv });
    });
  });
});

// Download full FFmpeg build with HAP/snappy support
ipcMain.handle('converter-download-full-ffmpeg', async (event) => {
  const destDir = getFullFfmpegDir();
  fs.mkdirSync(destDir, { recursive: true });
  const zipPath = path.join(destDir, 'ffmpeg-full.zip');
  const url = 'https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-win64-gpl.zip';

  return new Promise((resolve) => {
    const followDownload = (targetUrl) => {
      const mod = targetUrl.startsWith('https') ? require('https') : require('http');
      mod.get(targetUrl, { headers: { 'User-Agent': 'PixelLogic' } }, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307) {
          return followDownload(res.headers.location);
        }
        if (res.statusCode !== 200) {
          return resolve({ ok: false, error: `HTTP ${res.statusCode}` });
        }
        const total = parseInt(res.headers['content-length'], 10) || 0;
        let downloaded = 0;
        const file = fs.createWriteStream(zipPath);

        res.on('data', (chunk) => {
          downloaded += chunk.length;
          const pct = total > 0 ? Math.round((downloaded / total) * 100) : -1;
          try {
            event.sender.send('converter-ffmpeg-download', {
              type: 'progress', percent: pct,
              downloadedMB: (downloaded / 1048576).toFixed(1),
              totalMB: total > 0 ? (total / 1048576).toFixed(1) : '?',
            });
          } catch (_) {}
        });

        res.pipe(file);

        file.on('finish', () => {
          file.close(() => {
            try { event.sender.send('converter-ffmpeg-download', { type: 'extracting' }); } catch (_) {}
            const { exec } = require('child_process');
            const psCmd = `Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force`;
            exec(`powershell -NoProfile -Command "${psCmd}"`, { timeout: 600000 }, (err) => {
              if (err) {
                try { fs.unlinkSync(zipPath); } catch (_) {}
                return resolve({ ok: false, error: 'Extraction failed: ' + err.message });
              }
              try {
                const entries = fs.readdirSync(destDir).filter(e => {
                  return e.startsWith('ffmpeg') && fs.statSync(path.join(destDir, e)).isDirectory();
                });
                let found = false;
                for (const entry of entries) {
                  const binDir = path.join(destDir, entry, 'bin');
                  const srcFfmpeg = path.join(binDir, 'ffmpeg.exe');
                  if (fs.existsSync(srcFfmpeg)) {
                    fs.copyFileSync(srcFfmpeg, getFullFfmpegPath());
                    const srcProbe = path.join(binDir, 'ffprobe.exe');
                    if (fs.existsSync(srcProbe)) fs.copyFileSync(srcProbe, getFullFfprobePath());
                    const srcPlay = path.join(binDir, 'ffplay.exe');
                    if (fs.existsSync(srcPlay)) fs.copyFileSync(srcPlay, path.join(getFullFfmpegDir(), 'ffplay.exe'));
                    fs.rmSync(path.join(destDir, entry), { recursive: true, force: true });
                    found = true;
                    break;
                  }
                }
                try { fs.unlinkSync(zipPath); } catch (_) {}
                if (!found) return resolve({ ok: false, error: 'Could not find ffmpeg.exe in extracted archive' });
                resolve({ ok: true });
              } catch (e) {
                resolve({ ok: false, error: 'Setup failed: ' + e.message });
              }
            });
          });
        });

        file.on('error', (err) => {
          try { fs.unlinkSync(zipPath); } catch (_) {}
          resolve({ ok: false, error: 'Write failed: ' + err.message });
        });
      }).on('error', (err) => {
        resolve({ ok: false, error: 'Download failed: ' + err.message });
      });
    };
    followDownload(url);
  });
});

// Cancel a running job
ipcMain.handle('converter-cancel', async (_event, jobId) => {
  const cmd = activeConversions.get(jobId);
  if (cmd) {
    try { cmd.kill('SIGKILL'); } catch (_) {}
    activeConversions.delete(jobId);
    return { ok: true };
  }
  return { ok: false, error: 'Job not found' };
});

// Open output folder in Explorer
ipcMain.handle('converter-open-folder', async (_event, folderPath) => {
  shell.openPath(folderPath);
});

ipcMain.handle('check-first-run', async () => {
  const flagPath = path.join(app.getPath('userData'), '.first-run-done');
  if (fs.existsSync(flagPath)) return { firstRun: false };
  fs.writeFileSync(flagPath, new Date().toISOString(), 'utf8');
  return { firstRun: true };
});

#!/usr/bin/env node
/**
 * build-web.js
 *
 * Builds a browser-compatible copy of the PixelLogic application into
 * the top-level `web-app/` folder. The desktop (Electron) source is
 * untouched — this script ONLY reads from it and writes into web-app/.
 *
 * What it does:
 *   1. Cleans web-app/ (except node-ignored files like .git)
 *   2. Copies index.html, src/, vendor/, styles.css, styles-theme.css
 *   3. Injects <script src="web-shim.js"> at the very top of <head>
 *      so Electron-only globals get safe browser stubs before the rest
 *      of the app runs.
 *   4. Removes any <script src="preload.js"> reference (none today,
 *      kept as a safety net).
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'web-app');

const COPY_PATHS = [
    'src',
    'vendor',
    'external-files',
    'styles.css',
    'styles-theme.css',
    'pixelogic-logo.png',
    'app-icon.png',
    'favicon.png',
];

function rimraf(p) {
    if (!fs.existsSync(p)) return;
    const stat = fs.lstatSync(p);
    if (stat.isDirectory()) {
        for (const child of fs.readdirSync(p)) {
            // Preserve our hand-maintained shim + readme if they exist
            if (p === OUT && (child === 'web-shim.js' || child === 'android-ui.css' || child === 'README.md' || child === '.gitkeep')) continue;
            rimraf(path.join(p, child));
        }
        try { fs.rmdirSync(p); } catch (_) {}
    } else {
        fs.unlinkSync(p);
    }
}

function copyRecursive(src, dst) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dst, { recursive: true });
        for (const child of fs.readdirSync(src)) {
            copyRecursive(path.join(src, child), path.join(dst, child));
        }
    } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }
}

function ensureDir(p) {
    fs.mkdirSync(p, { recursive: true });
}

function patchIndexHtml(html) {
    // Inject web-shim.js as the FIRST script in <head> so stubs exist
    // before any deferred script executes.
    const shimTag = '    <script src="web-shim.js"></script>\n';
    if (html.includes('web-shim.js')) return html;
    // Insert immediately after <head ...>
    return html.replace(/<head(\s[^>]*)?>/i, (m) => `${m}\n${shimTag}`);
}

function main() {
    console.log('[build-web] Cleaning', OUT);
    ensureDir(OUT);
    // Wipe everything inside OUT except web-shim.js / README.md
    for (const child of fs.readdirSync(OUT)) {
        if (child === 'web-shim.js' || child === 'android-ui.css' || child === 'README.md' || child === '.gitkeep') continue;
        rimraf(path.join(OUT, child));
    }

    // Copy assets
    for (const rel of COPY_PATHS) {
        const src = path.join(ROOT, rel);
        if (!fs.existsSync(src)) {
            console.warn('[build-web] skip (missing):', rel);
            continue;
        }
        const dst = path.join(OUT, rel);
        console.log('[build-web] copy', rel);
        copyRecursive(src, dst);
    }

    // index.html (patched)
    const indexSrc = path.join(ROOT, 'index.html');
    const indexDst = path.join(OUT, 'index.html');
    let html = fs.readFileSync(indexSrc, 'utf8');
    html = patchIndexHtml(html);
    fs.writeFileSync(indexDst, html);
    console.log('[build-web] wrote index.html (with web-shim injected)');

    // Make sure web-shim.js exists in OUT — if missing, fail loudly so
    // the developer knows to keep it under source control.
    if (!fs.existsSync(path.join(OUT, 'web-shim.js'))) {
        console.error('[build-web] ERROR: web-app/web-shim.js is missing.');
        process.exit(1);
    }

    console.log('\n[build-web] Done. Serve with:');
    console.log('    npx http-server web-app -p 8080 -c-1');
    console.log('  or');
    console.log('    npx serve web-app');
}

main();

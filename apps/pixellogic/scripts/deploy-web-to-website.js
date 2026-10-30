#!/usr/bin/env node
/**
 * deploy-web-to-website.js
 *
 * Copies the freshly-built `web-app/` into `website/app/` so the
 * PHP-hosted site can serve it behind the auth gate.
 *
 * Important: index.html from the web build is written as `app.html`
 * inside `website/app/`. The PHP gate (`website/app/index.php`) is
 * the entry point and is NOT overwritten by this script.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SRC  = path.join(ROOT, 'web-app');
const DST  = path.join(ROOT, 'website', 'app');

// Files inside DST that this script must NEVER delete or overwrite,
// because they are hand-maintained / server-side gates.
const PROTECTED = new Set(['index.php', '.htaccess']);

if (!fs.existsSync(SRC)) {
    console.error('[deploy-web] ERROR: web-app/ does not exist. Run `npm run build:web` first.');
    process.exit(1);
}

function rimrafContents(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir)) {
        if (PROTECTED.has(entry)) continue;
        const full = path.join(dir, entry);
        const stat = fs.lstatSync(full);
        if (stat.isDirectory()) {
            rimrafContents(full);
            try { fs.rmdirSync(full); } catch (_) {}
        } else {
            try { fs.unlinkSync(full); } catch (_) {}
        }
    }
}

function copyRecursive(src, dst, renameMap = {}) {
    const stat = fs.statSync(src);
    if (stat.isDirectory()) {
        fs.mkdirSync(dst, { recursive: true });
        for (const child of fs.readdirSync(src)) {
            const targetName = renameMap[child] || child;
            copyRecursive(path.join(src, child), path.join(dst, targetName));
        }
    } else {
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
    }
}

console.log('[deploy-web] Cleaning', DST, '(preserving:', [...PROTECTED].join(', ') + ')');
fs.mkdirSync(DST, { recursive: true });
rimrafContents(DST);

console.log('[deploy-web] Copying web-app/ -> website/app/  (index.html -> app.html)');
// Top-level rename: index.html becomes app.html so the PHP gate owns the
// directory's index.
copyRecursive(SRC, DST, { 'index.html': 'app.html' });

// Make sure the gate exists
const gatePath = path.join(DST, 'index.php');
if (!fs.existsSync(gatePath)) {
    console.warn('[deploy-web] WARNING: website/app/index.php is missing.');
    console.warn('             The /app/ URL will not be auth-gated until you create it.');
}

console.log('\n[deploy-web] Done. Browse to /app/ on the site (you must be logged in).');

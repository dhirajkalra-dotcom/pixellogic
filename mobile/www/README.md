# PixelLogic Mobile (PWA)

A mobile-first Progressive Web App port of PixelLogic, designed to run in any
modern browser on iPhone and Android — and to be wrapped later as a real
Android APK (and iOS app) via [Capacitor](https://capacitorjs.com/).

> This folder is **independent** of the desktop Electron app in the repo root.
> Nothing here touches the desktop build. Safe to develop in parallel.

---

## Features (v0.7.0)

| Tab                 | Status |
| ------------------- | ------ |
| Home                | ✅ Tile grid, quick links |
| Power Calc          | ✅ 61 LED panels, W/R/G/B/standby, per-phase breaker, 1.25× safety |
| Aspect Ratio        | ✅ 6 units, DPI, 10 presets + custom, gcd simplification |
| Pixel Designer      | ✅ Wall + panel input, 6 pitch presets, fit modes, SVG preview, save |
| Shows / Projects    | ✅ List / rename / delete / export / import JSON |
| 2D Visualizer       | ✅ Load image, cover/contain/stretch, panel-grid overlay, export PNG |
| Projector Test      | ✅ Throw distance + curve geometry + fullscreen test patterns |
| LED Patching        | ✅ Processor picker, ports needed, panel-per-port grouping, bandwidth |
| PDF Export          | ✅ Multi-page report (jsPDF, lazy-loaded from CDN) |

All features work offline after the first load (except first-time PDF Export,
which fetches jsPDF from CDN once).

## Run locally

PWAs must be served over HTTP (not `file://`) for service workers to register.

```powershell
cd d:\pixellogic\mobile
npx --yes http-server . -p 5173 -c-1
```

Then open <http://localhost:5173> on your PC, or use your LAN IP from a phone
on the same Wi-Fi (e.g. `http://192.168.1.15:5173`).

Python alternative:

```powershell
cd d:\pixellogic\mobile
python -m http.server 5173
```

## Install on a phone (no app store needed)

### iPhone / iPad
1. Open the deployed URL in **Safari** (must be Safari, not Chrome).
2. Tap the Share button → **Add to Home Screen**.
3. Launches in its own window, offline-capable.

### Android
1. Open the URL in **Chrome**.
2. Menu (⋮) → **Install app** / **Add to Home screen**.
3. Installs as a real Android app (WebAPK), shows up in the launcher.

## Deploy to Netlify (recommended, free)

1. Push the `pixellogic` repo to GitHub.
2. Sign in at [netlify.com](https://app.netlify.com) → **Add new site → Import from Git**.
3. Pick the repo. In **Site settings → Build & deploy**:
   - **Base directory**: `mobile`
   - **Build command**: *(leave empty)*
   - **Publish directory**: `mobile` (or `.` if base is set)
4. Deploy. Netlify gives you a free HTTPS URL like `pixellogic-mobile.netlify.app`.

`netlify.toml` here already configures SPA routing, correct manifest MIME
type, and `no-cache` for the service worker.

### Alternatives
- **GitHub Pages**: serve the `mobile/` folder — all URLs are relative.
- **Cloudflare Pages**: set build output to `mobile/`, no build command.
- **Vercel**: set root directory to `mobile`, framework preset "Other".

## PWA checklist (done)

- [x] `manifest.webmanifest` with `start_url`, icons, theme color
- [x] Service worker (`sw.js`) — cache-first shell, network-first data
- [x] `viewport-fit=cover` + iOS safe-area insets
- [x] `apple-mobile-web-app-capable` meta
- [x] 16px+ inputs (prevents iOS zoom on focus)
- [x] Relative URLs (deploys anywhere)
- [x] All PWA icons generated (192, 512, maskable-512, apple-touch 180)

## Data storage

Projects are stored locally in **IndexedDB** (see `js/db.js`). No server,
no account, no tracking. Export JSON from the **Shows** tab to back up or
share. Import JSON on another device to restore.

## Phase 2 — Wrap as native APK + iOS app (Capacitor)

Zero code rewrite. When you want a real APK on the Play Store:

```powershell
cd d:\pixellogic\mobile
npm init -y
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios
npx cap init "PixelLogic" com.dhirajkalra.pixellogic --web-dir=.
npx cap add android
npx cap sync
npx cap open android   # requires Android Studio — builds the APK
```

For iOS you'll need a Mac with Xcode + a free Apple Developer account to
install on your own iPhone, or a paid one ($99/yr) to ship to the App Store.

## Architecture

```
mobile/
├─ index.html            App shell (header, bottom-nav, <main>)
├─ manifest.webmanifest  PWA manifest
├─ sw.js                 Service worker (offline cache, versioned)
├─ netlify.toml          Deploy config
├─ css/
│  └─ app.css            Mobile-first design system
├─ js/
│  ├─ app.js             Entry: registers routes + SW
│  ├─ router.js          Hash router (#/route?key=val)
│  ├─ db.js              IndexedDB wrapper (projects, kv)
│  └─ features/          One file per tab
│     ├─ home.js
│     ├─ power-calc.js
│     ├─ aspect-ratio.js
│     ├─ designer.js
│     ├─ shows.js
│     ├─ visualizer.js
│     ├─ projector.js
│     ├─ patching.js
│     ├─ pdf.js
│     └─ placeholder.js
├─ data/
│  └─ led-power.json     61 LED panels (extracted from desktop app)
└─ icons/                PWA icons (SVG source + PNGs)
```

Each feature module exports `{ render(root, params) }` — the router calls it
when that route is active.

## Versioning

Bump `VERSION` in `sw.js` whenever shell assets change. The SW activates the
new cache on next page load and deletes the old one.

## License

Part of the PixelLogic project — see repo root for license details.

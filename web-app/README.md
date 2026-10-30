# PixelLogic — Web Build

Browser-compatible build of the PixelLogic application.

> ⚠️ **Do not edit `index.html` in this folder by hand.** It is regenerated
> by `scripts/build-web.js` from the desktop `index.html`. The only
> hand-maintained files in `web-app/` are `web-shim.js` and this README.

## Build

From the repository root:

```powershell
npm run build:web
```

This copies `index.html`, `src/`, `vendor/`, `styles.css`, and
`styles-theme.css` into `web-app/` and injects `web-shim.js` as the very
first script in the page.

## Run locally

```powershell
npx http-server web-app -p 8080 -c-1
# then open http://localhost:8080
```

Any static file server works (Vite preview, `serve`, Netlify dev, IIS,
Apache, nginx). No build step is required at runtime — it's plain HTML +
JS + CSS.

## What `web-shim.js` does

The desktop app uses several `window.*` APIs exposed by Electron's
`preload.js` (e.g. `window.appInfo`, `window.systemFonts`,
`window.aiAutoMap`, `window.videoConverter`). The shim creates safe
browser stubs for each of these so the existing feature-detection in
`index.html` (`if (window.X && typeof X.fn === 'function')`) cleanly
falls back to web-friendly behaviour.

It also hides UI that genuinely cannot work in a browser (currently:
the **Video Converter** tab, which depends on `ffmpeg` running as a
child process).

## Limitations vs the desktop app

| Feature | Desktop | Web |
|---|---|---|
| Pixel design / visualizers / 3D / canvas / patching / PDF / power calc | ✅ | ✅ |
| Project storage | localStorage | localStorage (until cloud sync is added) |
| AI auto-map (OpenAI) | API key in OS keychain | API key in `localStorage` (per browser) |
| Video Converter | ✅ (via bundled ffmpeg) | ❌ hidden |
| System font enumeration | ✅ | ❌ falls back to bundled list |
| First-run tutorial dialog | ✅ | disabled |

## Deployment

Drop the contents of `web-app/` onto any static host. For login-gated
access, place an auth check in front (PHP include, Cloudflare Access,
Supabase auth guard, etc.) — the app itself is fully static.

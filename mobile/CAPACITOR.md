# Phase 2 — Wrapping PixelLogic Mobile as a native APK / iOS app

The PWA in this folder is shippable as-is via Netlify. This document covers
the optional step of wrapping the same code as a **real** Android APK (and
iOS app) using [Capacitor](https://capacitorjs.com/).

> **TL;DR**: no code rewrite — Capacitor bundles the existing HTML/CSS/JS
> inside a native WebView and gives you APK/IPA outputs.

---

## 1. Prerequisites

### Android (works on Windows / Mac / Linux)
- [Node.js 18+](https://nodejs.org/)
- [Android Studio](https://developer.android.com/studio) (installs JDK + Android SDK)
- Accept SDK licences (Android Studio prompts you once on first launch)

### iOS (Mac only)
- macOS with Xcode 15+
- [CocoaPods](https://cocoapods.org/) (`sudo gem install cocoapods`)
- Free Apple ID (ad-hoc install on your own iPhone) or paid Apple Developer
  Program ($99/yr) for App Store

---

## 2. One-time setup in `mobile/`

```powershell
cd d:\pixellogic\mobile

# 2.1 Initialise npm if not already
npm init -y

# 2.2 Install Capacitor
npm install @capacitor/core @capacitor/cli
npm install @capacitor/android
# npm install @capacitor/ios    # only on Mac

# 2.3 Initialise Capacitor — points to this folder as the web dir
npx cap init "PixelLogic" com.dhirajkalra.pixellogic --web-dir=.
```

This creates `capacitor.config.json` (commit it).

### Recommended config tweaks

Edit `capacitor.config.json`:

```json
{
  "appId": "com.dhirajkalra.pixellogic",
  "appName": "PixelLogic",
  "webDir": ".",
  "server": {
    "androidScheme": "https"
  },
  "android": {
    "allowMixedContent": false
  },
  "ios": {
    "contentInset": "always"
  }
}
```

---

## 3. Android APK

```powershell
# Add the Android project (creates ./android folder — commit it)
npx cap add android

# Copy the web assets into the native project
npx cap sync

# Open in Android Studio
npx cap open android
```

In Android Studio:
1. Wait for Gradle sync.
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
3. APK lands in `android/app/build/outputs/apk/debug/app-debug.apk`.
4. Drag-drop onto a connected Android phone with USB debugging enabled, or
   upload to Play Store (after signing — see below).

### Signed release APK / AAB (for Play Store)
1. **Build → Generate Signed Bundle / APK → Android App Bundle**.
2. Create a new keystore (keep `*.jks` + passwords SAFE — backing up outside
   this repo).
3. Select `release` build type.
4. Upload the resulting `.aab` to Play Console.

### Update flow after code changes
```powershell
# After editing anything in mobile/
npx cap sync android
# rebuild in Android Studio, or:
cd android
./gradlew assembleDebug
```

---

## 4. iOS app (Mac only)

```bash
cd mobile
npm install @capacitor/ios
npx cap add ios
npx cap sync ios
npx cap open ios
```

In Xcode:
1. Select your Apple ID in **Signing & Capabilities** (Team).
2. Change the Bundle ID if needed (must be unique for App Store).
3. Plug in iPhone, hit **▶ Run** — installs on device.
4. For App Store: **Product → Archive → Distribute App**.

---

## 5. Native plugins you may want later

| Need                     | Plugin |
| ------------------------ | ------ |
| File save / share        | `@capacitor/filesystem`, `@capacitor/share` |
| Splash screen            | `@capacitor/splash-screen` |
| Status bar styling       | `@capacitor/status-bar` |
| Prevent screen sleep     | `@capacitor/keep-awake` (useful for test patterns) |
| Haptics on button tap    | `@capacitor/haptics` |
| Camera (for QR scanning) | `@capacitor/camera` |

Install → `npx cap sync` → use via JS:

```js
import { KeepAwake } from '@capacitor/keep-awake';
await KeepAwake.keepAwake();   // won't sleep while test pattern is on
```

Since the PWA currently uses zero-build ES modules, to use native plugins you'd
either:
- Add a small build step (Vite/esbuild) for the `js/` folder, or
- Use `<script src="capacitor.js">` and access plugins from `window.Capacitor`.

Start without plugins; add them only when truly needed.

---

## 6. Versioning releases

- Web PWA version: bump `VERSION` in `sw.js` (e.g. `v0.7.0` → `v0.8.0`).
- Android: edit `android/app/build.gradle` → `versionCode` + `versionName`.
- iOS: Xcode → project → **General** → Version + Build.

Keep them in sync for sanity.

---

## 7. Cost summary

| Target        | Cost |
| ------------- | ---- |
| PWA (Netlify) | Free |
| Android APK (sideload) | Free |
| Google Play Store | $25 one-time developer fee |
| iOS (personal device) | Free (Apple ID) |
| iOS App Store | $99/year |

For most internal / event-team use cases, **PWA + sideloaded APK is enough**
— no store fees, no review delays.

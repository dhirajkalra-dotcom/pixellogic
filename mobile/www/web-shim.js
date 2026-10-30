/* =====================================================================
 * web-shim.js
 * ---------------------------------------------------------------------
 * Loaded as the FIRST script in the web build. It provides browser-safe
 * stubs for all `window.*` APIs that the desktop app expects from
 * Electron's preload.js. Every consumer in index.html already
 * feature-detects these (`if (window.X && typeof X.fn === 'function')`),
 * so most stubs simply return safe "not available" responses.
 *
 * It also sets a `window.IS_WEB_BUILD = true` flag and tags the <html>
 * element with `data-build="web"` so we can hide things via CSS.
 * ===================================================================== */
(function () {
    'use strict';

    window.IS_WEB_BUILD = true;
    try { document.documentElement.setAttribute('data-build', 'web'); } catch (_) {}

    const notAvailable = (name) => () =>
        Promise.reject(new Error(name + ' is not available in the web version.'));

    // --- appInfo: surface the matching desktop release version ----------
    if (!window.appInfo) {
        window.appInfo = {
            getVersion: () => Promise.resolve('20.0.2'),
        };
    }

    // --- systemFonts: web has no native font enumeration ----------------
    if (!window.systemFonts) {
        window.systemFonts = {
            // Returning an empty array makes the consumer fall back to
            // its built-in font list (it already handles empty results).
            getFonts: () => Promise.resolve([]),
        };
    }

    // --- tutorialVideo / tutorialPdf: open hosted URLs ------------------
    // If you later host the tutorial on the website, edit these URLs.
    const TUTORIAL_VIDEO_URL = '/VIDEO_TUTORIAL.mp4'; // optional
    const TUTORIAL_PDF_URL   = 'external-files/Tutorial_pixel logic.pdf';

    if (!window.tutorialVideo) {
        window.tutorialVideo = {
            open: () => {
                try { window.open(TUTORIAL_VIDEO_URL, '_blank', 'noopener'); } catch (_) {}
                return Promise.resolve({ ok: true });
            },
        };
    }
    if (!window.tutorialPdf) {
        window.tutorialPdf = {
            open: () => {
                try { window.open(TUTORIAL_PDF_URL, '_blank', 'noopener'); } catch (_) {}
                return Promise.resolve({ ok: true });
            },
        };
    }

    // --- firstRun: in browser there's no installer, so never first-run -
    if (!window.firstRun) {
        window.firstRun = {
            check: () => Promise.resolve({ firstRun: false }),
        };
    }

    // --- installedTemplate: no bundled installer template in web --------
    if (!window.installedTemplate) {
        window.installedTemplate = {
            getDefault: () => Promise.resolve(null),
        };
    }

    // --- aiAutoMap: no local secret store. Return "not configured". -----
    // Users can paste an API key for the session via localStorage, or you
    // can wire this to a server endpoint later.
    if (!window.aiAutoMap) {
        const KEY = 'pixi-logic-web-openai-key';
        window.aiAutoMap = {
            getKeyStatus: () => Promise.resolve({
                ok: true,
                hasKey: !!localStorage.getItem(KEY),
            }),
            saveKey: ({ apiKey } = {}) => {
                if (apiKey) localStorage.setItem(KEY, String(apiKey));
                return Promise.resolve({ ok: true });
            },
            clearKey: () => {
                localStorage.removeItem(KEY);
                return Promise.resolve({ ok: true });
            },
            testKey: () => Promise.resolve({
                ok: !!localStorage.getItem(KEY),
                error: localStorage.getItem(KEY) ? null : 'No API key saved.',
            }),
            // PDF extraction needs a server proxy in the browser; reject
            // for now so the UI shows a clean error.
            extractPdfSpecs: notAvailable('AI auto-map PDF extraction'),
        };
    }

    // --- videoConverter: requires ffmpeg child-process; not for web -----
    // Provide a stub so any unguarded call fails cleanly. The tab itself
    // is hidden by CSS below.
    if (!window.videoConverter) {
        const stub = notAvailable('Video converter');
        window.videoConverter = {
            pickFiles: stub,
            pickOutputDir: stub,
            pickFfmpeg: stub,
            probe: stub,
            checkEncoder: stub,
            start: stub,
            cancel: stub,
            openFolder: stub,
            checkFullFfmpeg: () => Promise.resolve({ ok: false, available: false }),
            downloadFullFfmpeg: stub,
            onProgress: () => () => {},
            onFfmpegDownload: () => () => {},
        };
    }

    // --- Hide / disable browser-incompatible UI -------------------------
    const css = `
        html[data-build="web"] [data-tab="video-converter"],
        html[data-build="web"] #video-converter-content { display: none !important; }
    `;
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-web-shim', '');
    styleEl.textContent = css;
    (document.head || document.documentElement).appendChild(styleEl);

    // --- Android phone shell --------------------------------------------
    // The desktop application uses a persistent 280px sidebar. In the
    // Capacitor WebView that leaves too little space for every workspace, so
    // turn it into a touch-friendly drawer and let content use the viewport.
    function isAndroidApp() {
        return !!(window.Capacitor && typeof window.Capacitor.getPlatform === 'function' &&
            window.Capacitor.getPlatform() === 'android');
    }

    function mountAndroidShell() {
        if (!isAndroidApp()) return;
        document.documentElement.setAttribute('data-build', 'android');

        const androidStyles = document.createElement('link');
        androidStyles.rel = 'stylesheet';
        androidStyles.href = 'android-ui.css';
        (document.head || document.documentElement).appendChild(androidStyles);

        const androidCss = `
            html[data-build="android"], html[data-build="android"] body {
                width: 100%; min-width: 0; overflow-x: hidden;
            }
            html[data-build="android"] body {
                padding: 0 !important; min-height: 100dvh;
            }
            html[data-build="android"] .sidebar-fixed {
                box-sizing: border-box; width: min(84vw, 340px); height: 100dvh;
                padding: 14px 12px max(18px, env(safe-area-inset-bottom));
                transform: translateX(-105%); transition: transform .22s ease;
                z-index: 10001; box-shadow: 18px 0 42px rgba(2,6,23,.6);
            }
            html[data-build="android"] body.android-menu-open .sidebar-fixed { transform: translateX(0); }
            html[data-build="android"] .content-offset { margin-left: 0; min-width: 0; }
            html[data-build="android"] .content-offset > header {
                position: sticky; top: 0; z-index: 1000; margin: 0 !important;
                padding: max(12px, env(safe-area-inset-top)) 14px 12px !important;
                border-radius: 0 !important;
            }
            html[data-build="android"] .content-offset > header img { height: 38px !important; }
            html[data-build="android"] #app-title { font-size: 1.15rem !important; white-space: nowrap; }
            html[data-build="android"] #app-subtitle { display: none; }
            html[data-build="android"] main { padding: 12px; min-width: 0; }
            html[data-build="android"] main > .tab-content { min-width: 0; overflow: visible; }
            html[data-build="android"] .panel, html[data-build="android"] .panel-soft,
            html[data-build="android"] .panel-contrast { padding: 12px; border-radius: 8px; }
            html[data-build="android"] .window-chrome { display: none; }
            html[data-build="android"] #android-menu-toggle {
                display: inline-flex; align-items: center; justify-content: center;
                width: 42px; height: 42px; margin-right: 10px; flex: 0 0 auto;
                border: 1px solid rgba(148,163,184,.35); border-radius: 8px;
                color: #e5e7eb; background: rgba(15,23,42,.8);
            }
            html[data-build="android"] #android-menu-scrim {
                position: fixed; inset: 0; z-index: 10000; display: none;
                background: rgba(2,6,23,.58); border: 0;
            }
            html[data-build="android"] body.android-menu-open #android-menu-scrim { display: block; }
            html[data-build="android"] input, html[data-build="android"] select,
            html[data-build="android"] textarea, html[data-build="android"] button { max-width: 100%; }
            html[data-build="android"] .pdf-export-columns,
            html[data-build="android"] .delivery-edit-grid,
            html[data-build="android"] .spec-grid { grid-template-columns: minmax(0, 1fr); }
            html[data-build="android"] .spec-span-2 { grid-column: auto; }
        `;
        const style = document.createElement('style');
        style.setAttribute('data-android-shell', '');
        style.textContent = androidCss;
        (document.head || document.documentElement).appendChild(style);

        const mount = () => {
            const sidebar = document.querySelector('.sidebar-fixed');
            const headerRow = document.querySelector('.content-offset > header > div');
            if (!sidebar || !headerRow || document.getElementById('android-menu-toggle')) return;

            const toggle = document.createElement('button');
            toggle.id = 'android-menu-toggle';
            toggle.type = 'button';
            toggle.setAttribute('aria-label', 'Open navigation menu');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
            const scrim = document.createElement('button');
            scrim.id = 'android-menu-scrim';
            scrim.type = 'button';
            scrim.setAttribute('aria-label', 'Close navigation menu');

            const setOpen = (open) => {
                document.body.classList.toggle('android-menu-open', open);
                toggle.setAttribute('aria-expanded', String(open));
                toggle.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
            };
            toggle.addEventListener('click', () => setOpen(!document.body.classList.contains('android-menu-open')));
            scrim.addEventListener('click', () => setOpen(false));
            sidebar.addEventListener('click', (event) => {
                if (event.target.closest('.nav-tab')) setOpen(false);
            });
            headerRow.insertBefore(toggle, headerRow.firstChild);
            document.body.appendChild(scrim);

            const bottomNav = document.createElement('nav');
            bottomNav.id = 'android-bottom-nav';
            bottomNav.setAttribute('aria-label', 'Primary navigation');
            const tabs = [
                ['shows', 'Projects', '<path d="M3 6a2 2 0 0 1 2-2h4l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6z"/>'],
                ['designer', 'Designer', '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'],
                ['output-maps', 'Output Maps', '<path d="M4 4h16v16H4z"/><path d="M4 9h16M9 4v16"/>'],
                ['power-calc', 'Power', '<path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z"/>'],
                ['menu', 'More', '<circle cx="5" cy="12" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="19" cy="12" r="1.5"/>'],
            ];
            bottomNav.innerHTML = tabs.map(([tab, label, icon]) =>
                '<button type="button" class="android-bottom-tab" data-android-tab="' + tab + '">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' + icon + '</svg>' +
                '<span>' + label + '</span></button>').join('');
            bottomNav.addEventListener('click', (event) => {
                const button = event.target.closest('[data-android-tab]');
                if (!button) return;
                const tab = button.dataset.androidTab;
                if (tab === 'menu') return setOpen(true);
                const target = sidebar.querySelector('.nav-tab[data-tab="' + tab + '"]');
                if (target) target.click();
            });
            document.body.appendChild(bottomNav);

            const updateBottomNav = () => {
                const active = sidebar.querySelector('.nav-tab.active');
                bottomNav.querySelectorAll('.android-bottom-tab').forEach((button) => {
                    button.classList.toggle('active', !!active && button.dataset.androidTab === active.dataset.tab);
                });
            };
            new MutationObserver(updateBottomNav).observe(sidebar, { subtree: true, attributes: true, attributeFilter: ['class'] });
            updateBottomNav();

            const decorateProjects = () => {
                const projects = document.getElementById('shows-content');
                const leftPanel = document.getElementById('shows-left-panel');
                const rightPanel = document.getElementById('shows-right-panel');
                if (!projects || !leftPanel || !rightPanel || projects.querySelector('.android-project-tabs')) return;

                projects.classList.add('android-projects');
                projects.dataset.projectView = 'active';
                const desktopSummary = projects.firstElementChild;
                if (desktopSummary) desktopSummary.classList.add('android-project-summary');
                const tabs = document.createElement('div');
                tabs.className = 'android-project-tabs';
                tabs.innerHTML = '<button type="button" class="android-project-tab" data-project-view="saved">Saved Projects</button>' +
                    '<button type="button" class="android-project-tab active" data-project-view="active">Active Project</button>';
                tabs.addEventListener('click', (event) => {
                    const tab = event.target.closest('[data-project-view]');
                    if (!tab) return;
                    projects.dataset.projectView = tab.dataset.projectView;
                    tabs.querySelectorAll('.android-project-tab').forEach((button) => button.classList.toggle('active', button === tab));
                });
                projects.insertBefore(tabs, projects.firstChild);

                const add = document.createElement('button');
                add.id = 'android-project-add';
                add.type = 'button';
                add.setAttribute('aria-label', 'Create project');
                add.textContent = '+';
                add.addEventListener('click', () => {
                    projects.dataset.projectView = 'active';
                    tabs.querySelector('[data-project-view="active"]').click();
                    document.getElementById('shows-new-project-name')?.focus();
                });
                document.body.appendChild(add);
            };
            new MutationObserver(decorateProjects).observe(document.body, { childList: true, subtree: true });
            decorateProjects();

            const moveFooterToAbout = () => {
                const footer = document.querySelector('main > footer');
                const aboutPanel = document.querySelector('#about-modal [role="dialog"] > div');
                if (!footer || !aboutPanel || footer.classList.contains('android-about-footer')) return;
                footer.classList.add('android-about-footer');
                aboutPanel.appendChild(footer);
            };
            moveFooterToAbout();

            const decorateDesigner = () => {
                const designer = document.getElementById('designer-content');
                const controls = designer?.querySelector('.lg\\:col-span-1');
                if (!designer || !controls || controls.dataset.androidAccordionReady) return;
                controls.dataset.androidAccordionReady = 'true';
                const detailsHeading = [...controls.querySelectorAll('.pixel-designer-section-heading--details')][0];
                const borderHeading = [...controls.querySelectorAll('.pixel-designer-section-heading--border')][0];
                if (detailsHeading && borderHeading && detailsHeading.parentElement === borderHeading.parentElement) {
                    const detailsSection = detailsHeading.parentElement;
                    const borderSection = document.createElement('div');
                    borderSection.className = detailsSection.className;
                    const nodes = [...detailsSection.children];
                    const borderStart = nodes.indexOf(borderHeading);
                    nodes.slice(borderStart).forEach((node) => borderSection.appendChild(node));
                    detailsSection.insertAdjacentElement('afterend', borderSection);
                }
                [...controls.children].forEach((section) => {
                    const heading = section.querySelector(':scope > .pixel-designer-section-heading');
                    if (!heading) return;
                    const expanded = heading.textContent.includes('Dimensions');
                    section.classList.add(expanded ? 'android-designer-section-open' : 'android-designer-section-collapsed');
                    heading.setAttribute('role', 'button');
                    heading.setAttribute('tabindex', '0');
                    heading.setAttribute('aria-expanded', String(expanded));
                    const toggle = () => {
                        const open = section.classList.toggle('android-designer-section-open');
                        section.classList.toggle('android-designer-section-collapsed', !open);
                        heading.setAttribute('aria-expanded', String(open));
                    };
                    heading.addEventListener('click', toggle);
                    heading.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
                    });
                });

                const activeMapTab = designer.querySelector('.pixel-map-tab[data-active="true"]');
                const deleteMapButton = document.getElementById('delete-pixel-map-btn');
                if (activeMapTab && deleteMapButton && !activeMapTab.querySelector('.android-map-delete')) {
                    const deleteCross = document.createElement('button');
                    deleteCross.type = 'button';
                    deleteCross.className = 'android-map-delete';
                    deleteCross.textContent = '\u00d7';
                    deleteCross.setAttribute('aria-label', 'Delete active pixel map');
                    deleteCross.addEventListener('click', (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteMapButton.click();
                    });
                    activeMapTab.appendChild(deleteCross);
                }
            };
            new MutationObserver(decorateDesigner).observe(document.body, { childList: true, subtree: true });
            decorateDesigner();

            const decorateEffects = () => {
                const effects = document.getElementById('effects-content');
                if (!effects) return;
                const accents = {
                    'Center Badge': 'android-effects-panel--badge',
                    'Overlays & Markers': 'android-effects-panel--overlays',
                    'Logo Overlay': 'android-effects-panel--logo',
                    'Color Bars': 'android-effects-panel--bars',
                    'Special Effects Presets': 'android-effects-panel--presets',
                };
                effects.querySelectorAll('h3').forEach((heading) => {
                    const accent = accents[heading.textContent.trim()];
                    const panel = heading.closest('.bg-gray-900\\/50');
                    if (!accent || !panel) return;
                    panel.classList.add('android-effects-panel', accent);
                    if (panel.dataset.androidAccordionReady) return;
                    panel.dataset.androidAccordionReady = 'true';
                    panel.classList.add('android-effects-panel-collapsed');
                    heading.setAttribute('role', 'button');
                    heading.setAttribute('tabindex', '0');
                    heading.setAttribute('aria-expanded', 'false');
                    const toggle = () => {
                        const open = panel.classList.toggle('android-effects-panel-open');
                        panel.classList.toggle('android-effects-panel-collapsed', !open);
                        heading.setAttribute('aria-expanded', String(open));
                    };
                    heading.addEventListener('click', toggle);
                    heading.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
                    });
                });
            };
            new MutationObserver(decorateEffects).observe(document.body, { childList: true, subtree: true });
            decorateEffects();

            const decorateUtilityTools = () => {
                const utilityTools = document.getElementById('utility-tools-content');
                if (!utilityTools) return;
                utilityTools.querySelectorAll(':scope section').forEach((panel) => {
                    const heading = panel.firstElementChild;
                    if (!heading || panel.dataset.androidAccordionReady) return;
                    panel.dataset.androidAccordionReady = 'true';
                    panel.classList.add('android-utility-panel', 'android-utility-panel-collapsed');
                    heading.classList.add('android-utility-panel-heading');
                    heading.setAttribute('role', 'button');
                    heading.setAttribute('tabindex', '0');
                    heading.setAttribute('aria-expanded', 'false');
                    const toggle = () => {
                        const open = panel.classList.toggle('android-utility-panel-open');
                        panel.classList.toggle('android-utility-panel-collapsed', !open);
                        heading.setAttribute('aria-expanded', String(open));
                    };
                    heading.addEventListener('click', toggle);
                    heading.addEventListener('keydown', (event) => {
                        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
                    });
                });
            };
            new MutationObserver(decorateUtilityTools).observe(document.body, { childList: true, subtree: true });
            decorateUtilityTools();

            const decoratePdfExport = () => {
                const pdf = document.getElementById('pdf-export-content');
                if (!pdf) return;
                pdf.querySelectorAll('[data-collapsible="true"]').forEach((card) => {
                    const header = card.querySelector('.pdf-collapsible-header');
                    if (!header || card.dataset.androidPdfReady) return;
                    card.dataset.androidPdfReady = 'true';
                    card.classList.add('android-pdf-panel', 'pdf-collapsible-collapsed');
                    header.setAttribute('aria-expanded', 'false');
                });
            };
            new MutationObserver(decoratePdfExport).observe(document.body, { childList: true, subtree: true });
            decoratePdfExport();
        };
        if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
        else mount();
    }
    mountAndroidShell();

    // --- Logged-in user badge (only when served behind PHP gate) ------
    // The PHP wrapper at /app/ injects window.PIXELOGIC_USER and
    // window.PIXELOGIC_LOGOUT_URL. When present, render a small badge
    // in the top-right with the user's name and a logout link.
    function mountUserBadge() {
        const user = window.PIXELOGIC_USER;
        if (!user || !user.email) return;
        const logoutUrl = window.PIXELOGIC_LOGOUT_URL || '/logout.php';
        const badge = document.createElement('div');
        badge.id = 'pl-user-badge';
        badge.innerHTML =
            '<span class="pl-user-name"></span>' +
            '<a class="pl-user-logout" href="' + logoutUrl + '">Sign out</a>';
        badge.querySelector('.pl-user-name').textContent =
            (user.name && user.name.trim()) ? user.name : user.email;
        const badgeCss = `
            #pl-user-badge {
                position: fixed; top: 10px; right: 14px; z-index: 99999;
                display: flex; align-items: center; gap: 10px;
                padding: 6px 10px 6px 12px; font: 500 12px/1.2 -apple-system,
                BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
                color: #e2e8f0; background: rgba(15,23,42,.78);
                border: 1px solid rgba(148,163,184,.22); border-radius: 999px;
                backdrop-filter: blur(6px);
                box-shadow: 0 6px 18px rgba(0,0,0,.35);
            }
            #pl-user-badge .pl-user-logout {
                color: #7dd3fc; text-decoration: none; padding: 4px 9px;
                border-radius: 999px; background: rgba(56,189,248,.12);
                border: 1px solid rgba(56,189,248,.25);
            }
            #pl-user-badge .pl-user-logout:hover { background: rgba(56,189,248,.22); }
        `;
        const style2 = document.createElement('style');
        style2.setAttribute('data-web-shim-badge', '');
        style2.textContent = badgeCss;
        (document.head || document.documentElement).appendChild(style2);
        const place = () => (document.body || document.documentElement).appendChild(badge);
        if (document.body) place();
        else document.addEventListener('DOMContentLoaded', place, { once: true });
    }
    mountUserBadge();

    // --- Advanced-mode trial enforcement (behind the PHP login gate) ---
    // Simple mode is permanently free. The first switch to Advanced starts a
    // continuous 20-minute server-clock trial that does not pause when the
    // user switches modes, refreshes, or closes the tab. Paid accounts bypass
    // the limit.
    //
    // Only runs when served behind the gate (window.PIXELOGIC_USER present),
    // so the standalone dev build (`npx http-server web-app`) stays open.
    (function quotaGuard() {
        if (!window.PIXELOGIC_USER || !window.PIXELOGIC_USER.email) return;

        const USAGE_URL = '/auth/usage.php';
        const BEAT_MS   = 10000;          // server resync cadence (10s)
        let   syncedAt  = Date.now();     // wall-clock of last server sync
        let   remaining = null;           // server remaining_seconds at last sync
        let   paid      = false;
        let   trialStarted = false;
        let   expired   = false;
        let   redirecting = false;
        let   checking  = false;
        let   advanced  = document.documentElement.dataset.edition === 'advanced';
        let   badgeEl   = null;
        let   requestSerial = 0;

        function fmt(sec) {
            sec = Math.max(0, Math.floor(sec));
            const m = Math.floor(sec / 60);
            const r = sec % 60;
            return m + ':' + (r < 10 ? '0' + r : r);
        }

        // Live "Free time left: mm:ss" pill (bottom-right). Only for free users.
        function ensureBadge() {
            if (badgeEl || paid) return;
            const style = document.createElement('style');
            style.textContent = `
                #pl-quota-timer {
                    position: fixed; bottom: 12px; right: 14px; z-index: 99998;
                    padding: 5px 12px; border-radius: 999px;
                    font: 600 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;
                    color: #7dd3fc; background: rgba(56,189,248,.12);
                    border: 1px solid rgba(56,189,248,.4);
                    backdrop-filter: blur(6px); -webkit-backdrop-filter: blur(6px);
                }
                #pl-quota-timer.low {
                    color: #fca5a5; background: rgba(239,68,68,.14);
                    border-color: rgba(239,68,68,.45);
                }
            `;
            (document.head || document.documentElement).appendChild(style);
            badgeEl = document.createElement('div');
            badgeEl.id = 'pl-quota-timer';
            badgeEl.title = 'Advanced trial time remaining';
            const place = () => (document.body || document.documentElement).appendChild(badgeEl);
            if (document.body) place();
            else document.addEventListener('DOMContentLoaded', place, { once: true });
        }

        // Recompute the displayed time from the last server value minus the
        // seconds elapsed since that sync — ticks smoothly every second and
        // survives the 10s heartbeats and page refreshes.
        function renderBadge() {
            if (!advanced) {
                if (badgeEl) badgeEl.style.display = 'none';
                return;
            }
            if (checking) return;
            if (paid || !trialStarted || remaining == null) {
                if (badgeEl) badgeEl.style.display = 'none';
                return;
            }
            ensureBadge();
            if (!badgeEl) return;
            const elapsed = Math.max(0, Math.floor((Date.now() - syncedAt) / 1000));
            const live = Math.max(0, remaining - elapsed);
            badgeEl.style.display = '';
            badgeEl.textContent = 'Advanced trial: ' + fmt(live);
            badgeEl.classList.toggle('low', live <= 120);
            if (live <= 0) {
                expired = true;
                if (advanced) showLockOverlay();
            }
        }

        function renderChecking() {
            if (!advanced || paid || redirecting) return;
            checking = true;
            ensureBadge();
            if (!badgeEl) return;
            badgeEl.style.display = '';
            badgeEl.textContent = 'Advanced trial: checking...';
            badgeEl.classList.remove('low');
        }

        function renderConnectionError() {
            if (!advanced || paid || redirecting) return;
            checking = false;
            ensureBadge();
            if (!badgeEl) return;
            badgeEl.style.display = '';
            badgeEl.textContent = 'Advanced trial: unable to verify';
            badgeEl.classList.add('low');
        }

        function showLockOverlay() {
            if (redirecting || !advanced) return;
            redirecting = true;
            window.location.assign(window.PIXELOGIC_SUBSCRIBE_URL || '/payment.php');
        }

        function apply(state, requestId, startedByRequest) {
            if (requestId !== requestSerial) return;
            if (!state || !state.ok) return;
            checking = false;
            paid = !!state.paid;
            if (Object.prototype.hasOwnProperty.call(state, 'trial_started')) {
                trialStarted = !!state.trial_started;
            } else if (startedByRequest) {
                trialStarted = true;
            }
            expired = !!state.locked;
            syncedAt = Date.now();
            if (typeof state.remaining_seconds === 'number') remaining = state.remaining_seconds;
            if (paid) {                        // unlimited
                if (badgeEl) badgeEl.style.display = 'none';
                return;
            }
            if (expired && advanced) { showLockOverlay(); return; }
            if (advanced && !trialStarted) {
                if (startedByRequest) renderConnectionError();
                else startTrial();
                return;
            }
            renderBadge();
        }

        function startTrial() {
            if (!advanced || paid || trialStarted || redirecting) return;
            const requestId = ++requestSerial;
            renderChecking();
            fetch(USAGE_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: 'start=1',
                credentials: 'same-origin',
                keepalive: true,
            }).then(function (r) {
                if (!r.ok) throw new Error('Trial start request failed');
                return r.json();
            }).then(function (state) {
                apply(state, requestId, true);
            }).catch(function () {
                if (requestId === requestSerial) renderConnectionError();
            });
        }

        function syncState() {
            const requestId = ++requestSerial;
            fetch(USAGE_URL, { credentials: 'same-origin' })
                .then(function (r) {
                    if (!r.ok) throw new Error('Trial status request failed');
                    return r.json();
                })
                .then(function (state) {
                    apply(state, requestId, false);
                })
                .catch(function () {
                    if (requestId === requestSerial) renderConnectionError();
                });
        }

        function syncEdition() {
            const nextAdvanced = document.documentElement.dataset.edition === 'advanced';
            if (nextAdvanced === advanced) return;
            advanced = nextAdvanced;
            if (advanced) {
                if (expired) showLockOverlay();
                else if (!trialStarted) startTrial();
                else syncState();
            } else renderBadge();
        }

        new MutationObserver(syncEdition).observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-edition'],
        });
        document.addEventListener('change', function (event) {
            if (event.target && event.target.id === 'app-edition-switch') {
                queueMicrotask(syncEdition);
            }
        });

        // Load paid/trial status without restricting unlimited Simple mode.
        syncState();

        // Resync every 10s. The server computes elapsed time from started_at,
        // so mode switches, browser throttling, and local clock changes cannot
        // pause or reset the trial.
        setInterval(function () {
            if (trialStarted && !paid && !redirecting) syncState();
        }, BEAT_MS);

        // Smooth 1-second display ticker for the countdown badge.
        setInterval(renderBadge, 1000);

        // Returning to the tab after the browser throttled our timers: bill
        // the elapsed time and resync with the server.
        document.addEventListener('visibilitychange', function () {
            if (document.visibilityState === 'visible' && trialStarted && !paid && !redirecting) {
                syncState();
            }
        });
    })();

    // --- Console banner so it's obvious which build is running ---------
    try {
        console.info('%cPixelLogic Web Build', 'color:#38bdf8;font-weight:bold;');
    } catch (_) {}
})();

(function () {
  function mountSignalPatchingPro(container) {
    if (!container) return;

    const ReactRef = window.React;
    const ReactDOMRef = window.ReactDOM;
    const htmRef = window.htm;

    if (!ReactRef || !ReactDOMRef || !htmRef || typeof ReactDOMRef.createRoot !== 'function') {
      container.innerHTML = '<div class="p-6 text-gray-300">React runtime not available for LED Patching.</div>';
      return;
    }

    const { useState, useMemo, useCallback, useEffect, useRef } = ReactRef;
    const html = htmRef.bind(ReactRef.createElement);

    // Official NovaStar / Brompton / Colorlight Per-Port Pixel Capacities at 60Hz
    // Scales inversely with refresh rate: floor(base60Hz * (60 / hz))
    const COEX_1G_PORT_60HZ = { 8: 659722, 10: 494791, 12: 329861 };
    const NOVALCT_1G_PORT_60HZ = { 8: 650000, 10: 325000, 12: 325000 };
    const MCTRL4K_1G_PORT_60HZ = { 8: 650000, 10: 320000, 12: 320000 };
    const COEX_5G_PORT_60HZ = { 8: 2951200, 10: 2213200, 12: 1475600 };
    const CX40_5G_PORT_60HZ = { 8: 2592000, 10: 2073600, 12: 1382400 };
    const BROMPTON_1G_PORT_60HZ = { 8: 525000, 10: 525000, 12: 525000 };

    const PROCESSOR_DATABASE = [
      {
        id: 'mx40-pro',
        name: 'NovaStar MX40 Pro',
        ports: 20,
        maxPixels: 9000000,
        type: 'COEX 1G',
        linkGbps: 1,
        basePerPort60HzByBit: COEX_1G_PORT_60HZ
      },
      {
        id: 'mx30',
        name: 'NovaStar MX30',
        ports: 10,
        maxPixels: 6500000,
        type: 'COEX 1G',
        linkGbps: 1,
        basePerPort60HzByBit: COEX_1G_PORT_60HZ
      },
      {
        id: 'mx20',
        name: 'NovaStar MX20',
        ports: 6,
        maxPixels: 3900000,
        type: 'COEX 1G',
        linkGbps: 1,
        basePerPort60HzByBit: COEX_1G_PORT_60HZ
      },
      {
        id: 'ku20',
        name: 'NovaStar KU20',
        ports: 6,
        maxPixels: 3900000,
        type: 'COEX 1G',
        linkGbps: 1,
        basePerPort60HzByBit: COEX_1G_PORT_60HZ
      },
      {
        id: 'cx40-pro',
        name: 'NovaStar CX40 Pro (5G)',
        ports: 4,
        maxPixels: 9000000,
        type: 'COEX 5G',
        linkGbps: 5,
        basePerPort60HzByBit: CX40_5G_PORT_60HZ
      },
      {
        id: 'cx80-pro',
        name: 'NovaStar CX80 Pro (5G)',
        ports: 16,
        maxPixels: 35389440,
        type: 'COEX 5G',
        linkGbps: 5,
        basePerPort60HzByBit: COEX_5G_PORT_60HZ
      },
      {
        id: 'mx2000-pro',
        name: 'NovaStar MX2000 Pro',
        ports: 40,
        maxPixels: 35389440,
        type: 'COEX Modular',
        linkGbps: 1,
        basePerPort60HzByBit: COEX_1G_PORT_60HZ,
        outputCards: [
          {
            id: 'mx-4x10g-fiber',
            name: '4×10G Fiber Card (40× 1G Ports)',
            outputsPerCard: 40,
            linkGbps: 1,
            maxCards: 2,
            defaultCards: 1,
            basePerPort60HzByBit: COEX_1G_PORT_60HZ,
            cardMaxPixelsByBit: { 8: 17694720, 10: 17694720, 12: 13194440 }
          },
          {
            id: 'mx-1x40g-fiber',
            name: '1×40G Fiber Card (8× 5G Ports)',
            outputsPerCard: 8,
            linkGbps: 5,
            maxCards: 2,
            defaultCards: 2,
            basePerPort60HzByBit: COEX_5G_PORT_60HZ,
            cardMaxPixelsByBit: { 8: 17694720, 10: 17694720, 12: 11804800 }
          },
          {
            id: 'mx-4x1g-rj45',
            name: '4×1G RJ45 Card (4× 1G Ports)',
            outputsPerCard: 4,
            linkGbps: 1,
            maxCards: 2,
            defaultCards: 2,
            basePerPort60HzByBit: COEX_1G_PORT_60HZ
          }
        ]
      },
      {
        id: 'mx6000-pro',
        name: 'NovaStar MX6000 Pro',
        ports: 40,
        maxPixels: 141557760,
        type: 'COEX Modular',
        linkGbps: 1,
        basePerPort60HzByBit: COEX_1G_PORT_60HZ,
        outputCards: [
          {
            id: 'mx-4x10g-fiber',
            name: '4×10G Fiber Card (40× 1G Ports)',
            outputsPerCard: 40,
            linkGbps: 1,
            maxCards: 8,
            defaultCards: 1,
            basePerPort60HzByBit: COEX_1G_PORT_60HZ,
            cardMaxPixelsByBit: { 8: 17694720, 10: 17694720, 12: 13194440 }
          },
          {
            id: 'mx-1x40g-fiber',
            name: '1×40G Fiber Card (8× 5G Ports)',
            outputsPerCard: 8,
            linkGbps: 5,
            maxCards: 8,
            defaultCards: 2,
            basePerPort60HzByBit: COEX_5G_PORT_60HZ,
            cardMaxPixelsByBit: { 8: 17694720, 10: 17694720, 12: 11804800 }
          },
          {
            id: 'mx-4x1g-rj45',
            name: '4×1G RJ45 Card (4× 1G Ports)',
            outputsPerCard: 4,
            linkGbps: 1,
            maxCards: 8,
            defaultCards: 4,
            basePerPort60HzByBit: COEX_1G_PORT_60HZ
          }
        ]
      },
      {
        id: 'vx2000-pro',
        name: 'NovaStar VX2000 Pro',
        ports: 20,
        maxPixels: 13000000,
        type: 'VX Series',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      },
      {
        id: 'vx16s',
        name: 'NovaStar VX16s',
        ports: 16,
        maxPixels: 10400000,
        type: 'VX Series',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      },
      {
        id: 'vx1000',
        name: 'NovaStar VX1000 / VX1000 Pro',
        ports: 10,
        maxPixels: 6500000,
        type: 'VX Series',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      },
      {
        id: 'vx600',
        name: 'NovaStar VX600 / VX600 Pro',
        ports: 6,
        maxPixels: 3900000,
        type: 'VX Series',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      },
      {
        id: 'vx400',
        name: 'NovaStar VX400',
        ports: 4,
        maxPixels: 2600000,
        type: 'VX Series',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      },
      {
        id: 'novapro-uhd-jr',
        name: 'NovaStar NovaPro UHD Jr',
        ports: 16,
        maxPixels: 10400000,
        type: 'UHD All-in-One',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      },
      {
        id: 'h9',
        name: 'NovaStar H9 / H5 Modular',
        ports: 16,
        maxPixels: 10400000,
        type: 'H-Series',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ,
        outputCards: [
          { id: 'h-16x1g', name: '16×RJ45 Sending Card (16 ports)', outputsPerCard: 16, linkGbps: 1, maxCards: 6, defaultCards: 1, basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ },
          { id: 'h-20x1g', name: '20×RJ45 Sending Card (20 ports)', outputsPerCard: 20, linkGbps: 1, maxCards: 6, defaultCards: 1, basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ }
        ]
      },
      {
        id: 'mctrl4k',
        name: 'NovaStar MCTRL4K',
        ports: 16,
        maxPixels: 8847360,
        type: 'MCTRL Series',
        linkGbps: 1,
        basePerPort60HzByBit: MCTRL4K_1G_PORT_60HZ
      },
      {
        id: 'mctrl-r5',
        name: 'NovaStar MCTRL R5',
        ports: 8,
        maxPixels: 4147200,
        type: 'MCTRL Series',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      },
      {
        id: 'mctrl660-pro',
        name: 'NovaStar MCTRL660 Pro',
        ports: 6,
        maxPixels: 2304000,
        type: 'MCTRL Series',
        linkGbps: 1,
        basePerPort60HzByBit: MCTRL4K_1G_PORT_60HZ
      },
      {
        id: 'mctrl660',
        name: 'NovaStar MCTRL660 / 600',
        ports: 4,
        maxPixels: 2304000,
        type: 'MCTRL Series',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      },
      {
        id: 'brompton-sx40',
        name: 'Brompton Tessera SX40 (4×XD)',
        ports: 40,
        maxPixels: 9000000,
        type: 'Brompton 4K',
        linkGbps: 1,
        basePerPort60HzByBit: BROMPTON_1G_PORT_60HZ
      },
      {
        id: 'brompton-s8',
        name: 'Brompton Tessera S8',
        ports: 8,
        maxPixels: 4200000,
        type: 'Brompton',
        linkGbps: 1,
        basePerPort60HzByBit: BROMPTON_1G_PORT_60HZ
      },
      {
        id: 'colorlight-z8t',
        name: 'Colorlight Z8t / Z6 Pro',
        ports: 16,
        maxPixels: 10400000,
        type: 'Colorlight',
        linkGbps: 1,
        basePerPort60HzByBit: NOVALCT_1G_PORT_60HZ
      }
    ];

    const PATTERNS = [
      { id: 'v-snake', name: 'U-Turn · Vertical' },
      { id: 'h-snake', name: 'U-Turn · Horizontal' },
      { id: 'v-zigzag', name: 'Zig-Zag · Vertical' },
      { id: 'h-zigzag', name: 'Zig-Zag · Horizontal' },
      { id: 'v-isolated', name: 'Isolated · Vertical' },
      { id: 'h-isolated', name: 'Isolated · Horizontal' }
    ];

    const WIRING_CORNER_LABELS = {
      tl: 'Top-left',
      tr: 'Top-right',
      bl: 'Bottom-left',
      br: 'Bottom-right'
    };

    const getWiringSummaryLabel = (patternId, cornerId) => {
      const p = String(patternId || 'v-snake');
      const family = p.includes('isolated') ? 'Isolated' : (p.includes('zigzag') ? 'Zig-Zag' : 'U-Turn');
      const dir = p.startsWith('h-') ? 'Horizontal' : 'Vertical';
      const corner = WIRING_CORNER_LABELS[cornerId || 'tl'] || 'Top-left';
      return `${family}  ·  ${corner}  ·  ${dir}`;
    };

    const renderWiringPathIcon = (patternId, cornerId, color = '#22c55e', size = 28) => {
      const p = String(patternId || 'h-snake');
      const c = String(cornerId || 'tl');
      const isLeft = c === 'tl' || c === 'bl';
      const isTop = c === 'tl' || c === 'tr';
      const x0 = isLeft ? 9.5 : 22.5;
      const x1 = isLeft ? 22.5 : 9.5;
      const y0 = isTop ? 9.5 : 22.5;
      const y1 = isTop ? 22.5 : 9.5;

      const makeArrow = (tx, ty, dx, dy) => {
        const bx1 = (tx - dx * 4.2 - dy * 2.6).toFixed(1);
        const by1 = (ty - dy * 4.2 + dx * 2.6).toFixed(1);
        const bx2 = (tx - dx * 4.2 + dy * 2.6).toFixed(1);
        const by2 = (ty - dy * 4.2 - dx * 2.6).toFixed(1);
        return `${tx.toFixed(1)},${ty.toFixed(1)} ${bx1},${by1} ${bx2},${by2}`;
      };

      const hxDir = x1 > x0 ? 1 : -1;
      const vyDir = y1 > y0 ? 1 : -1;

      let pathsEl = null;
      if (p === 'h-snake') {
        const midY = (y0 + y1) / 2 + vyDir * 1.8;
        pathsEl = html`
          <path d=${`M ${x0} ${y0} L ${x1} ${y0} L ${x1} ${y1} L ${x0 + hxDir * 1.5} ${y1}`} fill="none" stroke=${color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx=${x0} cy=${y0} r="2.7" fill=${color} />
          <polygon points=${makeArrow(x1, midY, 0, vyDir)} fill=${color} />
          <polygon points=${makeArrow(x0 - hxDir * 0.5, y1, -hxDir, 0)} fill=${color} />
        `;
      } else if (p === 'v-snake') {
        const midX = (x0 + x1) / 2 + hxDir * 1.8;
        pathsEl = html`
          <path d=${`M ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y1} L ${x1} ${y0 + vyDir * 1.5}`} fill="none" stroke=${color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx=${x0} cy=${y0} r="2.7" fill=${color} />
          <polygon points=${makeArrow(midX, y1, hxDir, 0)} fill=${color} />
          <polygon points=${makeArrow(x1, y0 - vyDir * 0.5, 0, -vyDir)} fill=${color} />
        `;
      } else if (p === 'h-zigzag') {
        pathsEl = html`
          <path d=${`M ${x0} ${y0} L ${x1} ${y0} L ${x0} ${y1} L ${x1 - hxDir * 1.5} ${y1}`} fill="none" stroke=${color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx=${x0} cy=${y0} r="2.7" fill=${color} />
          <polygon points=${makeArrow(x1 + hxDir * 0.5, y1, hxDir, 0)} fill=${color} />
        `;
      } else if (p === 'v-zigzag') {
        pathsEl = html`
          <path d=${`M ${x0} ${y0} L ${x0} ${y1} L ${x1} ${y0} L ${x1} ${y1 - vyDir * 1.5}`} fill="none" stroke=${color} strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx=${x0} cy=${y0} r="2.7" fill=${color} />
          <polygon points=${makeArrow(x1, y1 + vyDir * 0.5, 0, vyDir)} fill=${color} />
        `;
      } else if (p === 'h-isolated') {
        pathsEl = html`
          <g>
            <path d=${`M ${x0} ${y0} L ${x1 - hxDir * 1.5} ${y0}`} fill="none" stroke=${color} strokeWidth="2.1" strokeLinecap="round" />
            <circle cx=${x0} cy=${y0} r="2.7" fill=${color} />
            <polygon points=${makeArrow(x1 + hxDir * 0.5, y0, hxDir, 0)} fill=${color} />
          </g>
          <g opacity="0.82">
            <path d=${`M ${x0} ${y1} L ${x1 - hxDir * 1.5} ${y1}`} fill="none" stroke=${color} strokeWidth="2.0" strokeLinecap="round" />
            <circle cx=${x0} cy=${y1} r="2.3" fill=${color} />
            <polygon points=${makeArrow(x1 + hxDir * 0.5, y1, hxDir, 0)} fill=${color} />
          </g>
        `;
      } else {
        pathsEl = html`
          <g>
            <path d=${`M ${x0} ${y0} L ${x0} ${y1 - vyDir * 1.5}`} fill="none" stroke=${color} strokeWidth="2.1" strokeLinecap="round" />
            <circle cx=${x0} cy=${y0} r="2.7" fill=${color} />
            <polygon points=${makeArrow(x0, y1 + vyDir * 0.5, 0, vyDir)} fill=${color} />
          </g>
          <g opacity="0.82">
            <path d=${`M ${x1} ${y0} L ${x1} ${y1 - vyDir * 1.5}`} fill="none" stroke=${color} strokeWidth="2.0" strokeLinecap="round" />
            <circle cx=${x1} cy=${y0} r="2.3" fill=${color} />
            <polygon points=${makeArrow(x1, y1 + vyDir * 0.5, 0, vyDir)} fill=${color} />
          </g>
        `;
      }

      return html`
        <svg width=${size} height=${size} viewBox="0 0 32 32" className="shrink-0">
          <rect x="5" y="5" width="9" height="9" rx="1.6" fill="#252a34" />
          <rect x="18" y="5" width="9" height="9" rx="1.6" fill="#252a34" />
          <rect x="5" y="18" width="9" height="9" rx="1.6" fill="#252a34" />
          <rect x="18" y="18" width="9" height="9" rx="1.6" fill="#252a34" />
          ${pathsEl}
        </svg>
      `;
    };

    const START_CORNERS = [
      { id: 'tl', label: '↖ Top-Left' },
      { id: 'tr', label: '↗ Top-Right' },
      { id: 'bl', label: '↙ Bottom-Left' },
      { id: 'br', label: '↘ Bottom-Right' }
    ];

    const PACKING_MODES = [
      { id: 'max-fill', name: 'Max Port Capacity (Min Ports)' },
      { id: 'line-aligned', name: 'Keep Whole Columns / Rows' },
      { id: 'balanced', name: 'Evenly Balanced Ports' }
    ];

    const PORT_PALETTE = [
      '#3b82f6', '#f59e0b', '#10b981', '#ef4444', '#a855f7',
      '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1',
      '#14b8a6', '#eab308', '#38bdf8', '#fb7185', '#22c55e'
    ];

    const POWER_PALETTE = [
      '#f97316', '#ef4444', '#f59e0b', '#fb7185', '#eab308',
      '#ea580c', '#dc2626', '#d97706', '#f43f5e', '#ca8a04'
    ];

    const calcOfficialPortMaxPixels = (baseTable, linkGbps, hz, bit, conservative1G = false) => {
      const safeHz = Math.max(1, Number(hz) || 60);
      const safeBit = Number(bit) || 8;
      const table = baseTable || (linkGbps >= 5 ? COEX_5G_PORT_60HZ : NOVALCT_1G_PORT_60HZ);

      let base60 = Number(table[safeBit]) || Number(table[8]) || 650000;
      if (conservative1G && linkGbps === 1) {
        base60 = safeBit === 8 ? 650000 : 325000;
      }
      return Math.max(1, Math.floor(base60 * (60 / safeHz)));
    };

    const DEFAULT_SCREEN_CONFIG = {
      cols: 20,
      rows: 12,
      modW: 192,
      modH: 192,
      physW: 500,
      physH: 500,
      maxWatts: 160,
      tileAmps: 0.70,
      voltage: 230,
      use80PercentRule: false,
      weight: 7.5,
      hz: 60,
      bit: 8,
      conservative1G: false,
      dataPattern: 'v-snake',
      powerPattern: 'v-snake',
      dataStartCorner: 'tl',
      powerStartCorner: 'tl',
      dataPackingMode: 'max-fill',
      powerPackingMode: 'max-fill',
      redundancyMode: false,
      dataRoutingMode: 'auto',
      powerRoutingMode: 'auto',
      manualDataPaths: [],
      manualPowerPaths: [],
      manualDataUndo: [],
      manualDataRedo: [],
      manualPowerUndo: [],
      manualPowerRedo: [],
      maxDataMods: 60,
      isAutoDataLimit: true,
      maxPowerMods: 15,
      isAutoPowerLimit: true,
      tileType: 'half-half',
      circuitAmps: 16,
      selectedProcessor: PROCESSOR_DATABASE[0],
      selectedOutputCardId: null,
      outputCardCount: 1
    };

    const App = () => {
      const bridge = window.PixelLogicPatchingBridge || null;
      const ledCatalog = useMemo(() => (bridge && typeof bridge.getCatalog === 'function' ? bridge.getCatalog() : []), []);
      const ledBrands = useMemo(() => [...new Set(ledCatalog.map((c) => c.brand))].sort(), [ledCatalog]);

      const hydrateFromBridge = useCallback(() => {
        if (!bridge || typeof bridge.getScreensSnapshot !== 'function') {
          return { screens: [{ id: 1, name: 'Main Wall', ...DEFAULT_SCREEN_CONFIG }], activeIndex: 0 };
        }
        const snap = bridge.getScreensSnapshot();
        if (!snap || !Array.isArray(snap.screens) || !snap.screens.length) {
          return { screens: [{ id: 1, name: 'Main Wall', ...DEFAULT_SCREEN_CONFIG }], activeIndex: 0 };
        }
        const mapped = snap.screens.map((s) => {
          const proc = PROCESSOR_DATABASE.find((p) => p.id === s.selectedProcessorId) || PROCESSOR_DATABASE[0];
          return {
            ...DEFAULT_SCREEN_CONFIG,
            ...s,
            selectedProcessor: proc
          };
        });
        return { screens: mapped, activeIndex: Math.min(Math.max(0, snap.activeIndex || 0), mapped.length - 1) };
      }, []);

      const initialSnap = useMemo(() => hydrateFromBridge(), [hydrateFromBridge]);
      const [screens, setScreens] = useState(initialSnap.screens);
      const [activeIndex, setActiveIndex] = useState(initialSnap.activeIndex);
      const config = screens[activeIndex] || screens[0];

      // Focused Workspace Mode: 'data' (Signal Patching) or 'power' (Power Distribution)
      const [workspaceTab, setWorkspaceTab] = useState('data');
      const [showBothLayers, setShowBothLayers] = useState(false);
      const [showCustomCabSpecs, setShowCustomCabSpecs] = useState(false);
      const [showCapacityMatrix, setShowCapacityMatrix] = useState(false);
      const [showAllPorts, setShowAllPorts] = useState(false);

      const showData = workspaceTab === 'data' || showBothLayers;
      const showPower = workspaceTab === 'power' || showBothLayers;

      useEffect(() => {
        if (bridge && typeof bridge.syncFromPatching === 'function') {
          bridge.syncFromPatching(screens, activeIndex);
        }
      }, [screens, activeIndex]);

      const updateConfig = (updates) => {
        setScreens((prev) => {
          const next = [...prev];
          next[activeIndex] = { ...next[activeIndex], ...updates };
          return next;
        });
      };

      const addScreen = () => {
        setScreens((prev) => {
          const newId = Math.max(...prev.map((s) => Number(s.id) || 0), 0) + 1;
          const next = [...prev, { ...DEFAULT_SCREEN_CONFIG, id: newId, name: `Screen ${prev.length + 1}` }];
          setActiveIndex(next.length - 1);
          return next;
        });
      };

      const removeScreen = (idx) => {
        if (!Array.isArray(screens) || screens.length <= 1) return;
        const nextLen = screens.length - 1;
        setScreens((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)));
        // Keep the same screen selected: shift left if an earlier screen was removed.
        setActiveIndex((current) => (idx < current ? current - 1 : Math.min(current, nextLen - 1)));
      };

      const [zoom, setZoom] = useState(0.85);
      const [showSeqNumbers, setShowSeqNumbers] = useState(true);
      const [autoFitView, setAutoFitView] = useState(true);
      const [fitZoom, setFitZoom] = useState(1);
      const [panX, setPanX] = useState(0);
      const [panY, setPanY] = useState(0);
      const [isPanning, setIsPanning] = useState(false);
      const panRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
      const drawPointerRef = useRef({ active: false, type: null });
      const viewportRef = useRef(null);
      const [drawMode, setDrawMode] = useState(null);
      const [selectedDataPortIdx, setSelectedDataPortIdx] = useState(0);
      const [selectedPowerCircuitIdx, setSelectedPowerCircuitIdx] = useState(0);
      const [openWiringCard, setOpenWiringCard] = useState('data');
      const [controllerCount, setControllerCount] = useState(1);
      const [autoControllers, setAutoControllers] = useState(true);

      const effectiveOutputProfile = useMemo(() => {
        const selectedProcessor = config.selectedProcessor || PROCESSOR_DATABASE[0];
        const cardOptions = Array.isArray(selectedProcessor.outputCards) ? selectedProcessor.outputCards : [];

        if (!cardOptions.length) {
          return {
            selectedCard: null,
            cardsUsed: 0,
            effectivePorts: Math.max(1, Number(selectedProcessor.ports) || 1),
            linkGbps: Math.max(0.1, Number(selectedProcessor.linkGbps) || 1),
            basePerPort60HzByBit: selectedProcessor.basePerPort60HzByBit || NOVALCT_1G_PORT_60HZ,
            cardMaxPixelsByBit: null,
            profileLabel: `${selectedProcessor.ports}× ${selectedProcessor.linkGbps || 1}G ports`
          };
        }

        const selectedCard = cardOptions.find((card) => card.id === config.selectedOutputCardId) || cardOptions[0];
        const maxCards = Math.max(1, Number(selectedCard.maxCards) || 1);
        const defaultCards = Math.min(maxCards, Math.max(1, Number(selectedCard.defaultCards) || 1));
        const cardsUsed = Math.min(maxCards, Math.max(1, parseInt(config.outputCardCount, 10) || defaultCards));

        return {
          selectedCard,
          cardsUsed,
          effectivePorts: Math.max(1, Number(selectedCard.outputsPerCard) || 1) * cardsUsed,
          linkGbps: Math.max(0.1, Number(selectedCard.linkGbps) || Number(selectedProcessor.linkGbps) || 1),
          basePerPort60HzByBit: selectedCard.basePerPort60HzByBit || selectedProcessor.basePerPort60HzByBit || COEX_1G_PORT_60HZ,
          cardMaxPixelsByBit: selectedCard.cardMaxPixelsByBit || null,
          profileLabel: `${selectedCard.name} ×${cardsUsed}`
        };
      }, [config.selectedProcessor, config.selectedOutputCardId, config.outputCardCount]);

      const supplyVoltage = Math.max(100, Number(config.voltage) || 230);
      const powerTileAmps = useMemo(() => {
        if (Number(config.tileAmps) > 0) return Number(Number(config.tileAmps).toFixed(2));
        if (Number(config.maxWatts) > 0) return Number((Number(config.maxWatts) / supplyVoltage).toFixed(2));
        return config.tileType === 'half-one' ? 2.02 : 1.0;
      }, [config.tileAmps, config.maxWatts, supplyVoltage, config.tileType]);

      const powerTileWatts = useMemo(() => {
        if (Number(config.maxWatts) > 0 && Math.abs((Number(config.maxWatts) / supplyVoltage) - powerTileAmps) < 0.08) {
          return Math.round(Number(config.maxWatts));
        }
        return Math.round(powerTileAmps * supplyVoltage);
      }, [config.maxWatts, supplyVoltage, powerTileAmps]);

      const effectiveBreakerAmpsLimit = useMemo(() => {
        const rawAmps = Math.max(1, Number(config.circuitAmps) || 16);
        return config.use80PercentRule ? Number((rawAmps * 0.8).toFixed(2)) : rawAmps;
      }, [config.circuitAmps, config.use80PercentRule]);

      const effectivePowerLimit = useMemo(() => {
        const maxByAmps = Math.max(1, Math.floor(effectiveBreakerAmpsLimit / Math.max(0.05, powerTileAmps)));
        if (config.isAutoPowerLimit) return maxByAmps;
        return Math.min(Math.max(1, config.maxPowerMods), maxByAmps);
      }, [effectiveBreakerAmpsLimit, config.isAutoPowerLimit, config.maxPowerMods, powerTileAmps]);

      const totals = useMemo(() => {
        const { cols, rows, modW, modH, hz, bit, weight, physW, physH, conservative1G } = config;
        const totalCabs = cols * rows;
        const tilePixels = Math.max(1, Number(modW) || 1) * Math.max(1, Number(modH) || 1);
        const totalPxWidth = cols * modW;
        const totalPxHeight = rows * modH;
        const totalPx = totalCabs * tilePixels;
        const totalWidthM = (cols * (physW || 500)) / 1000;
        const totalHeightM = (rows * (physH || 500)) / 1000;
        const totalW = totalCabs * powerTileWatts;
        const totalAmps = totalCabs * powerTileAmps;
        const totalWeight = totalCabs * weight;

        const selectedProcessor = config.selectedProcessor || PROCESSOR_DATABASE[0];
        const linkGbps = effectiveOutputProfile.linkGbps;
        const portsOnProcessor = Math.max(1, Number(effectiveOutputProfile.effectivePorts) || 1);

        const maxPixelsPerPort = calcOfficialPortMaxPixels(
          effectiveOutputProfile.basePerPort60HzByBit,
          linkGbps,
          hz,
          bit,
          !!conservative1G
        );

        const rawDeviceCap60 = Number(selectedProcessor.maxPixels);
        const scaledDeviceCap = (Number.isFinite(rawDeviceCap60) && rawDeviceCap60 > 0)
          ? Math.floor(rawDeviceCap60 * (60 / Math.max(1, Number(hz) || 60)))
          : null;

        const cardCap60 = effectiveOutputProfile.cardMaxPixelsByBit
          ? Number(effectiveOutputProfile.cardMaxPixelsByBit[bit] || effectiveOutputProfile.cardMaxPixelsByBit[8])
          : null;
        const scaledCardsCap = (cardCap60 && effectiveOutputProfile.cardsUsed > 0)
          ? Math.floor(cardCap60 * effectiveOutputProfile.cardsUsed * (60 / Math.max(1, Number(hz) || 60)))
          : null;

        const perPortAggregatePixels = Math.floor(maxPixelsPerPort * portsOnProcessor);
        let maxPixelsPerController = perPortAggregatePixels;
        if (scaledDeviceCap) maxPixelsPerController = Math.min(maxPixelsPerController, scaledDeviceCap);
        if (scaledCardsCap) maxPixelsPerController = Math.min(maxPixelsPerController, scaledCardsCap);

        const cabsPerPortLimit = Math.max(1, Math.floor(maxPixelsPerPort / tilePixels));

        const refHzList = [50, 60, 120];
        const refBitList = [8, 10, 12];
        const capacityMatrix = refHzList.map((rHz) => ({
          hz: rHz,
          cells: refBitList.map((rBit) => {
            const pxLimit = calcOfficialPortMaxPixels(
              effectiveOutputProfile.basePerPort60HzByBit,
              linkGbps,
              rHz,
              rBit,
              !!conservative1G
            );
            const tilesLimit = Math.max(1, Math.floor(pxLimit / tilePixels));
            return {
              hz: rHz,
              bit: rBit,
              pxLimit,
              tilesLimit,
              isActive: Number(hz) === rHz && Number(bit) === rBit
            };
          })
        }));

        return {
          totalCabs,
          tilePixels,
          totalPx,
          totalPxWidth,
          totalPxHeight,
          totalW,
          totalAmps,
          totalWeight,
          maxPixelsPerController,
          cabsPerPortLimit,
          linkGbps,
          effectivePorts: portsOnProcessor,
          outputProfileLabel: effectiveOutputProfile.profileLabel,
          totalWidthM,
          totalHeightM,
          maxPixelsPerPort,
          capacityMatrix
        };
      }, [config, effectiveOutputProfile, powerTileWatts, powerTileAmps]);

      const effectiveDataLimit = useMemo(() => {
        if (config.isAutoDataLimit) return totals.cabsPerPortLimit;
        return Math.min(Math.max(1, Number(config.maxDataMods) || 1), totals.cabsPerPortLimit);
      }, [config.isAutoDataLimit, config.maxDataMods, totals.cabsPerPortLimit]);

      const generatePath = useCallback((type, limit, options = {}) => {
        const points = [];
        const lines = [];
        const startCorner = options.startCorner || 'tl';
        const packingMode = options.packingMode || 'max-fill';
        const { cols, rows } = config;
        if (!limit || limit < 1) return [];

        const flipCols = startCorner === 'tr' || startCorner === 'br';
        const flipRows = startCorner === 'bl' || startCorner === 'br';

        const colIndices = Array.from({ length: cols }, (_, i) => (flipCols ? cols - 1 - i : i));
        const baseRowIndices = Array.from({ length: rows }, (_, i) => (flipRows ? rows - 1 - i : i));

        const splitBalanced = (items, maxPerCircuit) => {
          const safeItems = Array.isArray(items) ? items : [];
          const total = safeItems.length;
          if (!total) return [];
          if (total <= maxPerCircuit) return [safeItems];

          const circuitCount = Math.ceil(total / maxPerCircuit);
          const baseSize = Math.floor(total / circuitCount);
          const remainder = total % circuitCount;
          const circuits = [];
          let cursor = 0;

          for (let i = 0; i < circuitCount; i++) {
            const chunkSize = baseSize + (i < remainder ? 1 : 0);
            circuits.push(safeItems.slice(cursor, cursor + chunkSize));
            cursor += chunkSize;
          }

          return circuits;
        };

        const splitMaxFill = (items, maxPerCircuit) => {
          const safeItems = Array.isArray(items) ? items : [];
          const circuits = [];
          for (let i = 0; i < safeItems.length; i += maxPerCircuit) {
            circuits.push(safeItems.slice(i, i + maxPerCircuit));
          }
          return circuits;
        };

        switch (type) {
          case 'v-snake':
            colIndices.forEach((c, cStep) => {
              const isReverse = cStep % 2 !== 0;
              const rOrder = isReverse ? [...baseRowIndices].reverse() : baseRowIndices;
              const line = rOrder.map((r) => ({ c, r }));
              lines.push(line);
              line.forEach((pt) => points.push(pt));
            });
            break;
          case 'h-snake':
            baseRowIndices.forEach((r, rStep) => {
              const isReverse = rStep % 2 !== 0;
              const cOrder = isReverse ? [...colIndices].reverse() : colIndices;
              const line = cOrder.map((c) => ({ c, r }));
              lines.push(line);
              line.forEach((pt) => points.push(pt));
            });
            break;
          case 'v-zigzag':
            colIndices.forEach((c) => {
              const line = baseRowIndices.map((r) => ({ c, r }));
              lines.push(line);
              line.forEach((pt) => points.push(pt));
            });
            break;
          case 'h-zigzag':
            baseRowIndices.forEach((r) => {
              const line = colIndices.map((c) => ({ c, r }));
              lines.push(line);
              line.forEach((pt) => points.push(pt));
            });
            break;
          case 'v-isolated':
            colIndices.forEach((c) => {
              const line = baseRowIndices.map((r) => ({ c, r }));
              lines.push(line);
            });
            break;
          case 'h-isolated':
            baseRowIndices.forEach((r) => {
              const line = colIndices.map((c) => ({ c, r }));
              lines.push(line);
            });
            break;
          default:
            break;
        }

        if (type === 'v-isolated' || type === 'h-isolated') {
          const isolatedCircuits = [];
          lines.forEach((line) => {
            if (!line || !line.length) return;
            if (line.length > limit) {
              splitMaxFill(line, limit).forEach((chunk) => isolatedCircuits.push(chunk));
            } else {
              isolatedCircuits.push([...line]);
            }
          });
          return isolatedCircuits;
        }

        if (packingMode === 'line-aligned' && lines.length) {
          const circuits = [];
          let current = [];

          lines.forEach((line) => {
            if (!line || !line.length) return;

            if (line.length > limit) {
              if (current.length) {
                circuits.push(current);
                current = [];
              }
              splitMaxFill(line, limit).forEach((chunk) => circuits.push(chunk));
              return;
            }

            if (!current.length) {
              current = [...line];
              return;
            }

            if ((current.length + line.length) <= limit) {
              current = current.concat(line);
              return;
            }

            circuits.push(current);
            current = [...line];
          });

          if (current.length) circuits.push(current);
          return circuits;
        }

        if (packingMode === 'balanced') {
          return splitBalanced(points, limit);
        }

        return splitMaxFill(points, limit);
      }, [config]);

      const automaticDataPaths = useMemo(
        () => generatePath(config.dataPattern, effectiveDataLimit, {
          startCorner: config.dataStartCorner || 'tl',
          packingMode: config.dataPackingMode || 'max-fill'
        }),
        [generatePath, config.dataPattern, effectiveDataLimit, config.dataStartCorner, config.dataPackingMode]
      );
      const automaticPowerPaths = useMemo(
        () => generatePath(config.powerPattern, effectivePowerLimit, {
          startCorner: config.powerStartCorner || 'tl',
          packingMode: config.powerPackingMode || 'max-fill'
        }),
        [generatePath, config.powerPattern, effectivePowerLimit, config.powerStartCorner, config.powerPackingMode]
      );
      const manualDataPaths = Array.isArray(config.manualDataPaths) ? config.manualDataPaths : [];
      const manualPowerPaths = Array.isArray(config.manualPowerPaths) ? config.manualPowerPaths : [];
      const dataPaths = config.dataRoutingMode === 'manual' ? manualDataPaths : automaticDataPaths;
      const powerPaths = config.powerRoutingMode === 'manual' ? manualPowerPaths : automaticPowerPaths;
      const activeDataPathsCount = useMemo(() => dataPaths.filter((p) => Array.isArray(p) && p.length > 0).length, [dataPaths]);
      const activePowerPathsCount = useMemo(() => powerPaths.filter((p) => Array.isArray(p) && p.length > 0).length, [powerPaths]);

      const getSelectedPathIdx = (type) => (type === 'data' ? Math.max(0, selectedDataPortIdx) : Math.max(0, selectedPowerCircuitIdx));
      const setSelectedPathIdx = (type, idx) => {
        const safeIdx = Math.max(0, Number(idx) || 0);
        if (type === 'data') setSelectedDataPortIdx(safeIdx);
        else setSelectedPowerCircuitIdx(safeIdx);
      };

      const updateManualPaths = (type, updater, extraConfigUpdates = {}) => {
        const property = type === 'data' ? 'manualDataPaths' : 'manualPowerPaths';
        const undoProperty = type === 'data' ? 'manualDataUndo' : 'manualPowerUndo';
        const redoProperty = type === 'data' ? 'manualDataRedo' : 'manualPowerRedo';
        setScreens((prev) => {
          const next = [...prev];
          const current = next[activeIndex];
          const paths = Array.isArray(current[property]) ? current[property].map((path) => [...(path || [])]) : [];
          const updatedPaths = updater(paths);
          const hasPathChange = JSON.stringify(updatedPaths) !== JSON.stringify(current[property] || []);
          const hasExtraUpdates = Object.keys(extraConfigUpdates).length > 0;
          if (!hasPathChange && !hasExtraUpdates) return prev;
          const undoStack = Array.isArray(current[undoProperty]) ? current[undoProperty] : [];
          next[activeIndex] = {
            ...current,
            ...extraConfigUpdates,
            [property]: updatedPaths,
            [undoProperty]: hasPathChange ? [...undoStack, current[property] || []].slice(-100) : undoStack,
            [redoProperty]: hasPathChange ? [] : (current[redoProperty] || [])
          };
          return next;
        });
      };

      const appendPointToPort = (type, targetIdx, c, r) => {
        updateManualPaths(type, (paths) => {
          const pointKey = `${c}:${r}`;
          if (paths.some((path) => Array.isArray(path) && path.some((point) => `${point.c}:${point.r}` === pointKey))) {
            return paths;
          }
          while (paths.length <= targetIdx) {
            paths.push([]);
          }
          const activePath = paths[targetIdx];
          if (!activePath.length) {
            activePath.push({ c, r });
            return paths;
          }
          const lastPt = activePath[activePath.length - 1];
          if (Math.abs(lastPt.c - c) + Math.abs(lastPt.r - r) === 1) {
            activePath.push({ c, r });
            return paths;
          }
          const firstPt = activePath[0];
          if (Math.abs(firstPt.c - c) + Math.abs(firstPt.r - r) === 1) {
            activePath.unshift({ c, r });
            return paths;
          }
          return paths;
        });
      };

      const handleTilePointerDown = (type, c, r) => {
        const targetIdx = getSelectedPathIdx(type);
        const paths = type === 'data' ? manualDataPaths : manualPowerPaths;
        const currentPortPath = Array.isArray(paths[targetIdx]) ? paths[targetIdx] : [];
        const idxInSelected = currentPortPath.findIndex((pt) => pt.c === c && pt.r === r);

        if (idxInSelected !== -1) {
          if (idxInSelected === currentPortPath.length - 1) {
            // Clicked on the last tile of the selected port: allow drag-extend OR click-to-remove on pointerUp
            drawPointerRef.current = { active: true, type, targetIdx, startedOnLastTile: true, didModifyDuringDrag: false };
          } else {
            // Clicked on an earlier tile inside the selected port: trim back to this tile and continue drawing from here
            updateManualPaths(type, (draft) => {
              if (Array.isArray(draft[targetIdx])) {
                draft[targetIdx] = draft[targetIdx].slice(0, idxInSelected + 1);
              }
              return draft;
            });
            drawPointerRef.current = { active: true, type, targetIdx, startedOnLastTile: false, didModifyDuringDrag: true };
          }
          return;
        }

        // Check if tile belongs to another port -> clicking it switches active port selection to that port!
        const otherPortIdx = paths.findIndex((p, pIdx) => pIdx !== targetIdx && Array.isArray(p) && p.some((pt) => pt.c === c && pt.r === r));
        if (otherPortIdx !== -1) {
          setSelectedPathIdx(type, otherPortIdx);
          drawPointerRef.current = { active: false, type: null };
          return;
        }

        // Free tile: append to currently selected port
        drawPointerRef.current = { active: true, type, targetIdx, startedOnLastTile: false, didModifyDuringDrag: true };
        appendPointToPort(type, targetIdx, c, r);
      };

      const handleTilePointerEnter = (type, c, r) => {
        if (!drawPointerRef.current.active || drawPointerRef.current.type !== type) return;
        const targetIdx = drawPointerRef.current.targetIdx !== undefined ? drawPointerRef.current.targetIdx : getSelectedPathIdx(type);
        const paths = type === 'data' ? manualDataPaths : manualPowerPaths;
        const currentPortPath = Array.isArray(paths[targetIdx]) ? paths[targetIdx] : [];

        // If dragging backwards onto the second-to-last tile of the selected port, pop the last tile smoothly
        if (currentPortPath.length >= 2) {
          const prevTile = currentPortPath[currentPortPath.length - 2];
          if (prevTile && prevTile.c === c && prevTile.r === r) {
            drawPointerRef.current.didModifyDuringDrag = true;
            updateManualPaths(type, (draft) => {
              if (Array.isArray(draft[targetIdx]) && draft[targetIdx].length >= 2) {
                draft[targetIdx] = draft[targetIdx].slice(0, -1);
              }
              return draft;
            });
            return;
          }
        }

        drawPointerRef.current.didModifyDuringDrag = true;
        appendPointToPort(type, targetIdx, c, r);
      };

      const handleTilePointerUp = () => {
        if (drawPointerRef.current.active && drawPointerRef.current.startedOnLastTile && !drawPointerRef.current.didModifyDuringDrag) {
          const { type, targetIdx } = drawPointerRef.current;
          updateManualPaths(type, (draft) => {
            if (Array.isArray(draft[targetIdx]) && draft[targetIdx].length > 0) {
              draft[targetIdx] = draft[targetIdx].slice(0, -1);
            }
            return draft;
          });
        }
        drawPointerRef.current = { active: false, type: null };
      };

      const beginManualDrawing = (type, requestedPortIdx = null) => {
        const modeKey = type === 'data' ? 'dataRoutingMode' : 'powerRoutingMode';
        const existingManual = type === 'data' ? manualDataPaths : manualPowerPaths;
        const targetIdx = requestedPortIdx !== null ? Math.max(0, requestedPortIdx) : getSelectedPathIdx(type);
        updateManualPaths(
          type,
          (paths) => {
            const next = paths.length ? paths : [[]];
            while (next.length <= targetIdx) next.push([]);
            return next;
          },
          { [modeKey]: 'manual' }
        );
        setSelectedPathIdx(type, targetIdx < Math.max(1, existingManual.length) ? targetIdx : 0);
        setDrawMode(type);
        setWorkspaceTab(type);
      };

      const selectAndModifyPort = (type, portIdx, shouldRedrawFromScratch = false) => {
        const modeKey = type === 'data' ? 'dataRoutingMode' : 'powerRoutingMode';
        const isCurrentlyManual = config[modeKey] === 'manual';
        const sourcePaths = isCurrentlyManual
          ? (type === 'data' ? manualDataPaths : manualPowerPaths)
          : (type === 'data' ? automaticDataPaths : automaticPowerPaths);

        const safeIdx = Math.max(0, Number(portIdx) || 0);
        updateManualPaths(
          type,
          () => {
            const cloned = sourcePaths.map((p) => (Array.isArray(p) ? [...p] : []));
            while (cloned.length <= safeIdx) cloned.push([]);
            if (shouldRedrawFromScratch) {
              cloned[safeIdx] = [];
            }
            return cloned;
          },
          { [modeKey]: 'manual' }
        );
        setSelectedPathIdx(type, safeIdx);
        setDrawMode(type);
        setWorkspaceTab(type);
      };

      const clearSelectedPortOnly = (type = drawMode || workspaceTab, specificIdx = null) => {
        const targetIdx = specificIdx !== null ? specificIdx : getSelectedPathIdx(type);
        selectAndModifyPort(type, targetIdx, true);
      };

      const stepBackSelectedPort = (type = drawMode || workspaceTab, specificIdx = null) => {
        const targetIdx = specificIdx !== null ? specificIdx : getSelectedPathIdx(type);
        updateManualPaths(type, (paths) => {
          if (Array.isArray(paths[targetIdx]) && paths[targetIdx].length > 0) {
            paths[targetIdx] = paths[targetIdx].slice(0, -1);
          }
          return paths;
        });
      };

      const reverseSelectedPort = (type = drawMode || workspaceTab, specificIdx = null) => {
        const modeKey = type === 'data' ? 'dataRoutingMode' : 'powerRoutingMode';
        const isCurrentlyManual = config[modeKey] === 'manual';
        const sourcePaths = isCurrentlyManual
          ? (type === 'data' ? manualDataPaths : manualPowerPaths)
          : (type === 'data' ? automaticDataPaths : automaticPowerPaths);
        const targetIdx = specificIdx !== null ? specificIdx : getSelectedPathIdx(type);

        updateManualPaths(
          type,
          () => {
            const cloned = sourcePaths.map((p) => (Array.isArray(p) ? [...p] : []));
            if (Array.isArray(cloned[targetIdx]) && cloned[targetIdx].length > 1) {
              cloned[targetIdx] = [...cloned[targetIdx]].reverse();
            }
            return cloned;
          },
          { [modeKey]: 'manual' }
        );
      };

      const startNewManualPath = () => {
        const activeType = drawMode || workspaceTab;
        const currentPaths = activeType === 'data' ? manualDataPaths : manualPowerPaths;
        const currentIdx = getSelectedPathIdx(activeType);
        const nextIdx = currentIdx + 1;
        updateManualPaths(activeType, (paths) => {
          const next = [...paths];
          while (next.length <= nextIdx) next.push([]);
          return next;
        });
        setSelectedPathIdx(activeType, nextIdx);
      };

      const undoManualChange = () => {
        const activeType = drawMode || workspaceTab;
        const property = activeType === 'data' ? 'manualDataPaths' : 'manualPowerPaths';
        const undoProperty = activeType === 'data' ? 'manualDataUndo' : 'manualPowerUndo';
        const redoProperty = activeType === 'data' ? 'manualDataRedo' : 'manualPowerRedo';
        setScreens((prev) => {
          const next = [...prev];
          const current = next[activeIndex];
          const undoStack = Array.isArray(current[undoProperty]) ? current[undoProperty] : [];
          if (!undoStack.length) return prev;
          const previousPaths = undoStack[undoStack.length - 1];
          const redoStack = Array.isArray(current[redoProperty]) ? current[redoProperty] : [];
          next[activeIndex] = {
            ...current,
            [property]: previousPaths,
            [undoProperty]: undoStack.slice(0, -1),
            [redoProperty]: [...redoStack, current[property] || []].slice(-100)
          };
          return next;
        });
      };

      const redoManualChange = () => {
        const activeType = drawMode || workspaceTab;
        const property = activeType === 'data' ? 'manualDataPaths' : 'manualPowerPaths';
        const undoProperty = activeType === 'data' ? 'manualDataUndo' : 'manualPowerUndo';
        const redoProperty = activeType === 'data' ? 'manualDataRedo' : 'manualPowerRedo';
        setScreens((prev) => {
          const next = [...prev];
          const current = next[activeIndex];
          const redoStack = Array.isArray(current[redoProperty]) ? current[redoProperty] : [];
          if (!redoStack.length) return prev;
          const restoredPaths = redoStack[redoStack.length - 1];
          const undoStack = Array.isArray(current[undoProperty]) ? current[undoProperty] : [];
          next[activeIndex] = {
            ...current,
            [property]: restoredPaths,
            [undoProperty]: [...undoStack, current[property] || []].slice(-100),
            [redoProperty]: redoStack.slice(0, -1)
          };
          return next;
        });
      };

      const clearManualPaths = () => {
        const activeType = drawMode || workspaceTab;
        updateManualPaths(activeType, () => [[]]);
        setSelectedPathIdx(activeType, 0);
      };

      const activeEditType = drawMode || workspaceTab;
      const drawHistory = activeEditType === 'data'
        ? { undo: config.manualDataUndo || [], redo: config.manualDataRedo || [] }
        : { undo: config.manualPowerUndo || [], redo: config.manualPowerRedo || [] };
      const activeDrawPaths = activeEditType === 'data' ? dataPaths : powerPaths;
      const activeDrawPathIndex = getSelectedPathIdx(activeEditType);
      const activeDrawPath = Array.isArray(activeDrawPaths[activeDrawPathIndex]) ? activeDrawPaths[activeDrawPathIndex] : [];
      const activeDrawTiles = activeDrawPath ? activeDrawPath.length : 0;
      const activeDrawLoad = activeEditType === 'data'
        ? {
            value: activeDrawTiles * totals.tilePixels,
            limit: Math.max(1, Number(totals.maxPixelsPerPort) || 1),
            unit: 'px'
          }
        : {
            value: Number((activeDrawTiles * powerTileAmps).toFixed(2)),
            limit: Math.max(1, Number(effectiveBreakerAmpsLimit) || 1),
            unit: 'A'
          };
      const activeDrawPercent = Math.round((activeDrawLoad.value / activeDrawLoad.limit) * 100);
      const activeDrawOverload = activeDrawPercent > 100;
      const drawPortsPerController = Math.max(1, Number(totals.effectivePorts) || 1);
      // Must match controllerAllocation: with redundancy each primary uses an odd port and its backup the next one.
      const drawUsablePorts = config.redundancyMode ? Math.max(1, Math.floor(drawPortsPerController / 2)) : drawPortsPerController;
      const formatPortCode = (idx) => {
        const ctrl = Math.floor(idx / drawUsablePorts) + 1;
        const local = idx % drawUsablePorts;
        if (config.redundancyMode) {
          const p = local * 2 + 1;
          return `C${ctrl}-P${p}/${p + 1}`;
        }
        return `C${ctrl}-P${local + 1}`;
      };
      const activeDrawAssignment = activeEditType === 'data'
        ? formatPortCode(activeDrawPathIndex)
        : `Circuit P${activeDrawPathIndex + 1}`;
      const nextDrawPathIndex = activeDrawPathIndex + 1;
      const nextDrawAssignment = activeEditType === 'data'
        ? formatPortCode(nextDrawPathIndex)
        : `Circuit P${nextDrawPathIndex + 1}`;

      const controllerAllocation = useMemo(() => {
        const portsPerController = Math.max(1, Number(totals.effectivePorts) || 1);
        const portsMultiplier = config.redundancyMode ? 2 : 1;
        const effectiveUsablePrimaryPorts = Math.max(1, Math.floor(portsPerController / portsMultiplier));
        const requiredByPorts = Math.max(1, Math.ceil(Math.max(1, dataPaths.length) / effectiveUsablePrimaryPorts));
        const controllerPixelCap = Math.max(1, Number(totals.maxPixelsPerController) || 1);
        const requiredByTotalPixels = Math.max(1, Math.ceil((Number(totals.totalPx) || 0) / controllerPixelCap));
        const requiredControllers = Math.max(requiredByPorts, requiredByTotalPixels);
        const plannedControllers = autoControllers ? requiredControllers : Math.max(1, parseInt(controllerCount, 10) || 1);
        const modulePixels = totals.tilePixels;
        const perPortPixelLimit = Math.max(1, Number(totals.maxPixelsPerPort) || 1);

        const assignments = dataPaths.map((_, pathIndex) => {
          const controllerIndex = Math.floor(pathIndex / effectiveUsablePrimaryPorts);
          const localIdx = pathIndex % effectiveUsablePrimaryPorts;
          const portIndex = config.redundancyMode ? (localIdx * 2) + 1 : localIdx + 1;
          const backupPortIndex = config.redundancyMode ? portIndex + 1 : null;
          const assigned = controllerIndex < plannedControllers;
          return {
            pathIndex,
            controllerIndex,
            portIndex,
            backupPortIndex,
            assigned
          };
        });

        const controllers = Array.from({ length: plannedControllers }, (_, i) => {
          const portLoads = Array.from({ length: portsPerController }, (_, portOffset) => {
            const pNum = portOffset + 1;
            let assignedPath = null;
            let globalPathIndex = -1;
            let isBackupPort = false;
            if (config.redundancyMode) {
              const pairIndex = Math.floor(portOffset / 2);
              globalPathIndex = (i * effectiveUsablePrimaryPorts) + pairIndex;
              if (pairIndex < effectiveUsablePrimaryPorts) {
                assignedPath = dataPaths[globalPathIndex] || null;
                isBackupPort = (portOffset % 2) === 1;
              }
            } else {
              globalPathIndex = (i * portsPerController) + portOffset;
              assignedPath = dataPaths[globalPathIndex] || null;
            }
            const modules = Array.isArray(assignedPath) ? assignedPath.length : 0;
            const portPixels = modules * modulePixels;
            const loadPercent = modules > 0 ? Math.min(999, (portPixels / perPortPixelLimit) * 100) : 0;
            return {
              portIndex: pNum,
              globalPathIndex,
              color: globalPathIndex >= 0 ? PORT_PALETTE[globalPathIndex % PORT_PALETTE.length] : '#475569',
              isUsed: modules > 0,
              hasSlot: globalPathIndex >= 0 && globalPathIndex < dataPaths.length,
              isBackupPort,
              modules,
              portPixels,
              loadPercent
            };
          });

          const usedPorts = portLoads.filter((p) => p.isUsed).length;
          const activeLoads = portLoads.filter((p) => p.isUsed && !p.isBackupPort).map((p) => p.loadPercent);
          const avgLoadPercent = activeLoads.length
            ? (activeLoads.reduce((sum, value) => sum + value, 0) / activeLoads.length)
            : 0;

          return {
            index: i,
            usedPorts,
            totalPorts: portsPerController,
            portLoads,
            avgLoadPercent
          };
        });

        const unassignedCircuits = assignments.filter((a, idx) => !a.assigned && Array.isArray(dataPaths[idx]) && dataPaths[idx].length > 0).length;
        return {
          portsPerController,
          requiredControllers,
          plannedControllers,
          usedControllers: Math.min(plannedControllers, requiredControllers),
          assignments,
          controllers,
          unassignedCircuits
        };
      }, [dataPaths, totals.tilePixels, totals.maxPixelsPerPort, totals.effectivePorts, totals.maxPixelsPerController, totals.totalPx, autoControllers, controllerCount, config.redundancyMode]);

      const phaseAllocation = useMemo(() => {
        const phases = [
          { name: 'L1', circuits: 0, tiles: 0, amps: 0, watts: 0 },
          { name: 'L2', circuits: 0, tiles: 0, amps: 0, watts: 0 },
          { name: 'L3', circuits: 0, tiles: 0, amps: 0, watts: 0 }
        ];
        powerPaths.forEach((circuit, idx) => {
          if (!Array.isArray(circuit) || !circuit.length) return;
          const p = phases[idx % 3];
          p.circuits += 1;
          p.tiles += circuit.length;
          p.amps += circuit.length * powerTileAmps;
          p.watts += circuit.length * powerTileWatts;
        });
        return phases;
      }, [powerPaths, powerTileAmps, powerTileWatts]);

      const perPortLimitLabel = useMemo(() => {
        const limit = Math.max(0, Number(totals.maxPixelsPerPort) || 0);
        if (limit >= 1000000) return `${(limit / 1000000).toFixed(2)}M`;
        if (limit >= 1000) return `${(limit / 1000).toFixed(1)}k`;
        return `${limit}`;
      }, [totals.maxPixelsPerPort]);

      const routingHealth = useMemo(() => {
        const usedPorts = controllerAllocation.controllers.flatMap((controller) => controller.portLoads).filter((port) => port.isUsed);
        const peakDataLoad = usedPorts.length ? Math.max(...usedPorts.map((port) => port.loadPercent)) : 0;
        const nonEmptyPower = powerPaths.filter((c) => Array.isArray(c) && c.length > 0);
        const peakPowerLoad = nonEmptyPower.length
          ? Math.max(...nonEmptyPower.map((circuit) => ((circuit.length * powerTileAmps) / effectiveBreakerAmpsLimit) * 100))
          : 0;
        const hasWarning = controllerAllocation.unassignedCircuits > 0 || peakDataLoad > 100 || peakPowerLoad > 100;
        return {
          peakDataLoad,
          peakPowerLoad,
          label: hasWarning ? 'Check Load' : 'Nominal',
          tone: hasWarning ? '#fb7185' : '#34d399'
        };
      }, [controllerAllocation, powerPaths, powerTileAmps, effectiveBreakerAmpsLimit]);

      const panelRouteInfo = useMemo(() => {
        const map = new Map();
        dataPaths.forEach((circuit, circuitIndex) => {
          if (!Array.isArray(circuit)) return;
          circuit.forEach((point, stepIdx) => {
            map.set(`${point.c}:${point.r}`, { circuitIndex, step: stepIdx + 1, total: circuit.length });
          });
        });
        return map;
      }, [dataPaths]);

      const powerRouteInfo = useMemo(() => {
        const map = new Map();
        powerPaths.forEach((circuit, circuitIndex) => {
          if (!Array.isArray(circuit)) return;
          circuit.forEach((point, stepIdx) => {
            map.set(`${point.c}:${point.r}`, { circuitIndex, step: stepIdx + 1, total: circuit.length });
          });
        });
        return map;
      }, [powerPaths]);

      const cabSize = 54;
      const padding = 56;
      const canvasW = config.cols * cabSize + (padding * 2);
      const canvasH = config.rows * cabSize + (padding * 2);

      useEffect(() => {
        setPanX(0);
        setPanY(0);
        const viewport = viewportRef.current;
        if (!viewport) return;

        const recalcFit = () => {
          const availableW = Math.max(1, viewport.clientWidth - 48);
          const availableH = Math.max(1, viewport.clientHeight - (drawMode ? 210 : 72));
          const nextFit = Math.max(0.05, Math.min(1.15, Math.min(availableW / canvasW, availableH / canvasH)));
          setFitZoom(nextFit);
        };

        recalcFit();
        const observer = new ResizeObserver(recalcFit);
        observer.observe(viewport);
        return () => observer.disconnect();
      }, [canvasW, canvasH, drawMode]);

      const effectiveZoom = autoFitView ? fitZoom : zoom;
      const drawToolbarTop = 24 + (canvasH * effectiveZoom) + (autoFitView ? 0 : panY) + 12;

      const renderPath = (circuits, isPower) => circuits.map((circuit, cIdx) => {
        if (!circuit || !circuit.length) return null;
        let d = '';
        const assignment = controllerAllocation.assignments[cIdx];
        const isUnassigned = !isPower && assignment && !assignment.assigned;
        const portColor = isPower
          ? POWER_PALETTE[cIdx % POWER_PALETTE.length]
          : (isUnassigned ? '#ef4444' : PORT_PALETTE[cIdx % PORT_PALETTE.length]);
        const offset = (showBothLayers) ? (isPower ? 4 : -4) : 0;
        const isSelectedCircuit = isPower
          ? (workspaceTab === 'power' && selectedPowerCircuitIdx === cIdx)
          : (workspaceTab === 'data' && selectedDataPortIdx === cIdx);
        const routeOpacity = drawMode
          ? (isSelectedCircuit ? 1 : 0.55)
          : (isSelectedCircuit ? 1 : 0.88);

        circuit.forEach((pt, pIdx) => {
          const x = padding + (pt.c * cabSize) + (cabSize / 2) + offset;
          const y = padding + (pt.r * cabSize) + (cabSize / 2) + offset;
          if (pIdx === 0) d += `M ${x} ${y}`;
          else d += ` L ${x} ${y}`;
        });

        const startX = padding + (circuit[0].c * cabSize) + (cabSize / 2) + offset;
        const startY = padding + (circuit[0].r * cabSize) + (cabSize / 2) + offset;
        const endPt = circuit[circuit.length - 1];
        const endX = padding + (endPt.c * cabSize) + (cabSize / 2) + offset;
        const endY = padding + (endPt.r * cabSize) + (cabSize / 2) + offset;

        const drawPortsPerController = Math.max(1, Number(totals.effectivePorts) || 16);
        const portNumber = assignment && assignment.assigned ? assignment.portIndex : (cIdx + 1);
        const ctrlNumber = assignment && assignment.assigned ? assignment.controllerIndex + 1 : (Math.floor(cIdx / drawPortsPerController) + 1);
        const backupPart = assignment && assignment.backupPortIndex ? `/B${assignment.backupPortIndex}` : '';
        const portCode = `C${ctrlNumber}-P${portNumber}${backupPart}`;

        const labelText = isPower
          ? `Circuit ${cIdx + 1} (L${(cIdx % 3) + 1})`
          : `Port ${cIdx + 1} (${portCode})`;

        const badgeW = Math.max(68, labelText.length * 6.5 + 26);
        const badgeH = 18;
        const rawStartY = padding + (circuit[0].r * cabSize);
        const badgeX = padding + (circuit[0].c * cabSize);
        const badgeY = circuit[0].r === 0 ? (padding - 22) : (rawStartY - 20);

        return html`
          <g key=${`${isPower ? 'p' : 'd'}-${cIdx}`} style=${{ pointerEvents: 'none', opacity: routeOpacity }}>
            <path d=${d} fill="none" stroke=${portColor} strokeWidth=${isSelectedCircuit ? '10' : '7'} strokeLinejoin="round" strokeLinecap="round" opacity=${isSelectedCircuit ? '0.26' : '0.14'} />
            <path className=${isPower ? 'pl-route pl-route-power' : 'pl-route pl-route-data'} d=${d} fill="none" stroke=${portColor} strokeWidth=${isSelectedCircuit ? '3.4' : '2.6'} strokeLinejoin="round" strokeLinecap="round" opacity="0.98" />
            <circle cx=${startX} cy=${startY} r=${isSelectedCircuit ? '7.5' : '6'} fill=${portColor} opacity="0.3" />
            <circle className="pl-route-origin" cx=${startX} cy=${startY} r=${isSelectedCircuit ? '4.5' : '3.8'} fill=${portColor} />
            ${circuit.length > 1 ? html`<rect x=${endX - 3.2} y=${endY - 3.2} width="6.4" height="6.4" rx="1.4" fill=${portColor} opacity="0.95" />` : null}
            <g transform=${`translate(${badgeX}, ${badgeY})`}>
              <rect x="0" y="0" width=${badgeW} height=${badgeH} rx="4" fill="#070e1a" fillOpacity="0.94" stroke=${portColor} strokeWidth=${isSelectedCircuit ? '1.8' : '1.2'} />
              <circle cx="8" cy="9" r="3" fill=${portColor} />
              <text x="16" y="12.5" fill=${portColor} fontSize="9.5" fontWeight="bold" fontFamily="monospace">${labelText}${isSelectedCircuit && drawMode ? ' ★' : ''}</text>
            </g>
          </g>
        `;
      });

      const formatNumber = (value) => Number(value || 0).toLocaleString();
      const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`;

      const getExportSnapshot = () => {
        const controllers = controllerAllocation.controllers.map((ctrl) => {
          const portRows = ctrl.portLoads.map((port) => ({
            controller: ctrl.index + 1,
            port: port.portIndex,
            panels: port.modules,
            loadPercent: port.loadPercent,
            pixels: port.portPixels,
            status: port.isUsed ? (port.loadPercent > 100 ? 'OVERLOAD' : (port.isBackupPort ? 'BACKUP' : 'OK')) : 'FREE'
          }));

          const usedPorts = portRows.filter((row) => row.status !== 'FREE').length;
          const activeLoads = portRows.filter((row) => row.status !== 'FREE').map((row) => row.loadPercent);
          const avgLoadPercent = activeLoads.length
            ? (activeLoads.reduce((sum, value) => sum + value, 0) / activeLoads.length)
            : 0;

          return {
            index: ctrl.index + 1,
            usedPorts,
            totalPorts: ctrl.totalPorts,
            avgLoadPercent,
            portRows
          };
        });

        const portRows = controllers.flatMap((ctrl) => ctrl.portRows);

        return {
          projectName: String(config.name || 'Screen'),
          processor: String((config.selectedProcessor && config.selectedProcessor.name) || 'Unknown Processor'),
          resolution: `${formatNumber(totals.totalPxWidth)} x ${formatNumber(totals.totalPxHeight)} px`,
          panelPixelSize: `${formatNumber(config.modW)} x ${formatNumber(config.modH)} px`,
          screenSize: `${totals.totalWidthM.toFixed(2)}m x ${totals.totalHeightM.toFixed(2)}m`,
          panelCount: totals.totalCabs,
          controllersUsed: `${controllerAllocation.usedControllers}/${controllerAllocation.plannedControllers}`,
          portsUsed: dataPaths.length * (config.redundancyMode ? 2 : 1),
          perPortLimit: `${perPortLimitLabel} px (${totals.cabsPerPortLimit} tiles)`,
          timestamp: new Date().toLocaleString(),
          controllers,
          portRows
        };
      };

      const buildReportCanvas = (report, exportScale = 3) => new Promise((resolve, reject) => {
        const svgElement = document.getElementById('diagram-svg');
        if (!svgElement) {
          reject(new Error('Diagram not found'));
          return;
        }
        const svgData = new XMLSerializer().serializeToString(svgElement);
        const svgUrl = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgData);
        const rowHeight = 24;
        const sectionHeaderHeight = 44;
        const sectionSpacing = 18;
        const groupedTableHeight = report.controllers.reduce(
          (sum, ctrl) => sum + sectionHeaderHeight + (ctrl.portRows.length * rowHeight) + sectionSpacing,
          0
        );
        const reportHeight = 230 + groupedTableHeight;
        const baseWidth = Math.max(canvasW + 80, 1400);
        const baseHeight = canvasH + reportHeight;

        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = Math.round(baseWidth * exportScale);
          canvas.height = Math.round(baseHeight * exportScale);
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas context unavailable'));
            return;
          }

          ctx.scale(exportScale, exportScale);
          ctx.fillStyle = '#0a0f19';
          ctx.fillRect(0, 0, baseWidth, baseHeight);

          const leftPad = 30;
          let y = 36;
          ctx.fillStyle = '#e5e7eb';
          ctx.font = 'bold 24px Segoe UI';
          ctx.fillText(`${report.projectName} • LED Patching Report`, leftPad, y);

          y += 22;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px Segoe UI';
          ctx.fillText(`Generated: ${report.timestamp} • ${config.hz}Hz ${config.bit}-bit`, leftPad, y);

          y += 28;
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '13px Segoe UI';
          const summary = [
            `Processor: ${report.processor}`,
            `Pixel Size: ${report.resolution}`,
            `Screen Size: ${report.screenSize}`,
            `Panel Pixel: ${report.panelPixelSize}`,
            `Panel Count: ${formatNumber(report.panelCount)}`,
            `Controllers: ${report.controllersUsed}`,
            `Ports Used: ${formatNumber(report.portsUsed)}`,
            `Port Limit: ${report.perPortLimit}`
          ];
          const summaryRows = Math.ceil(summary.length / 2);
          summary.forEach((line, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            ctx.fillText(line, leftPad + (col * 520), y + (row * 22));
          });

          const svgY = y + (summaryRows * 22) + 30;
          const svgX = Math.floor((baseWidth - canvasW) / 2);
          ctx.fillStyle = '#0b111b';
          ctx.fillRect(svgX - 3, svgY - 3, canvasW + 6, canvasH + 6);
          ctx.drawImage(img, svgX, svgY, canvasW, canvasH);

          let tableY = svgY + canvasH + 32;
          ctx.fillStyle = '#e5e7eb';
          ctx.font = 'bold 16px Segoe UI';
          ctx.fillText('Controller-wise Port Load Details', leftPad, tableY);
          tableY += 26;

          const headers = ['Port', 'Panels', 'Load', 'Pixels', 'Status'];
          const colX = [leftPad, leftPad + 90, leftPad + 180, leftPad + 290, leftPad + 400, leftPad + 610];

          report.controllers.forEach((controller) => {
            ctx.fillStyle = 'rgba(34,211,238,0.12)';
            ctx.fillRect(leftPad - 8, tableY - 16, 760, 24);
            ctx.fillStyle = '#67e8f9';
            ctx.font = 'bold 13px Segoe UI';
            ctx.fillText(
              `Controller ${controller.index} • Ports ${controller.usedPorts}/${controller.totalPorts} • Avg Load ${formatPercent(controller.avgLoadPercent)}`,
              leftPad,
              tableY
            );

            tableY += 24;

            ctx.fillStyle = '#22d3ee';
            ctx.font = 'bold 12px Segoe UI';
            headers.forEach((header, idx) => ctx.fillText(header, colX[idx + 1], tableY));
            tableY += 14;

            controller.portRows.forEach((row, rowIdx) => {
              const lineY = tableY + (rowIdx * rowHeight);
              const isOverload = row.status === 'OVERLOAD';
              ctx.fillStyle = rowIdx % 2 === 0 ? 'rgba(30,41,59,0.42)' : 'rgba(15,23,42,0.35)';
              ctx.fillRect(leftPad - 8, lineY - 14, 760, 20);

              ctx.fillStyle = '#e2e8f0';
              ctx.font = '12px Segoe UI';
              ctx.fillText(String(row.port), colX[1], lineY);
              ctx.fillText(formatNumber(row.panels), colX[2], lineY);
              ctx.fillText(formatPercent(row.loadPercent), colX[3], lineY);
              ctx.fillText(formatNumber(row.pixels), colX[4], lineY);
              ctx.fillStyle = isOverload ? '#f87171' : (row.status === 'FREE' ? '#94a3b8' : '#34d399');
              ctx.fillText(row.status, colX[5], lineY);
            });

            tableY += (controller.portRows.length * rowHeight) + 18;
          });

          resolve(canvas);
        };
        img.onerror = () => reject(new Error('Failed to render SVG for export'));
        img.src = svgUrl;
      });

      const exportPNG = async () => {
        const report = getExportSnapshot();
        try {
          const canvas = await buildReportCanvas(report, 3);
          const a = document.createElement('a');
          a.href = canvas.toDataURL('image/png');
          a.download = `Patching_Report_HiRes_${String(config.name || 'Screen').replace(/\s+/g, '_')}.png`;
          a.click();
        } catch (err) {
          console.warn('PNG export failed', err);
        }
      };

      const exportPDF = async () => {
        const jspdfUmd = window.jspdf;
        if (!jspdfUmd || !jspdfUmd.jsPDF) {
          console.warn('jsPDF is not available for PDF export');
          return;
        }

        const report = getExportSnapshot();

        const renderDiagramCanvas = (mode, scale = 2) => {
          const cap = document.createElement('canvas');
          cap.width = Math.round(canvasW * scale);
          cap.height = Math.round(canvasH * scale);
          const ctx = cap.getContext('2d');
          if (!ctx) return null;
          ctx.scale(scale, scale);

          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, canvasW, canvasH);

          for (let c2 = 0; c2 < config.cols; c2++) {
            for (let r2 = 0; r2 < config.rows; r2++) {
              const gx = padding + c2 * cabSize;
              const gy = padding + r2 * cabSize;
              ctx.fillStyle = '#121212';
              ctx.fillRect(gx, gy, cabSize - 2, cabSize - 2);
              ctx.strokeStyle = '#222222';
              ctx.lineWidth = 0.5;
              ctx.strokeRect(gx, gy, cabSize - 2, cabSize - 2);
              ctx.fillStyle = '#444444';
              ctx.font = '8px sans-serif';
              ctx.fillText(`${c2 + 1},${r2 + 1}`, gx + 4, gy + 12);
            }
          }

          const drawPaths2D = (paths, isPower) => {
            paths.forEach((circuit, cIdx) => {
              if (!circuit || !circuit.length) return;
              const assignment = controllerAllocation.assignments[cIdx];
              const isUnassigned = !isPower && assignment && !assignment.assigned;
              const portColor = isPower
                ? POWER_PALETTE[cIdx % POWER_PALETTE.length]
                : (isUnassigned ? '#ef4444' : PORT_PALETTE[cIdx % PORT_PALETTE.length]);
              const offset = isPower ? 4 : -4;

              ctx.strokeStyle = portColor;
              ctx.lineWidth = 2.5;
              ctx.lineJoin = 'round';
              ctx.lineCap = 'round';
              ctx.globalAlpha = 0.9;
              ctx.beginPath();
              circuit.forEach((pt, pIdx) => {
                const px2 = padding + pt.c * cabSize + cabSize / 2 + offset;
                const py2 = padding + pt.r * cabSize + cabSize / 2 + offset;
                if (pIdx === 0) ctx.moveTo(px2, py2); else ctx.lineTo(px2, py2);
              });
              ctx.stroke();

              ctx.globalAlpha = 1;
              ctx.fillStyle = portColor;
              ctx.beginPath();
              const sx = padding + circuit[0].c * cabSize + cabSize / 2 + offset;
              const sy = padding + circuit[0].r * cabSize + cabSize / 2 + offset;
              ctx.arc(sx, sy, 4, 0, Math.PI * 2);
              ctx.fill();

              ctx.fillStyle = portColor;
              ctx.font = 'bold 10px sans-serif';
              const lx = padding + circuit[0].c * cabSize;
              const ly = padding + circuit[0].r * cabSize - 8;
              const label = isPower
                ? `Circuit ${cIdx + 1} (L${(cIdx % 3) + 1})`
                : (assignment && assignment.assigned ? `Port ${cIdx + 1} (C${assignment.controllerIndex + 1}-P${assignment.portIndex})` : `Port ${cIdx + 1}`);
              ctx.fillText(label, lx, ly);

              ctx.globalAlpha = 1;
            });
          };

          if (mode === 'data' || mode === 'both') drawPaths2D(dataPaths, false);
          if (mode === 'power' || mode === 'both') drawPaths2D(powerPaths, true);

          return cap.toDataURL('image/png');
        };

        try {
          const dataDiagramPng = renderDiagramCanvas('data', 2);
          const powerDiagramPng = renderDiagramCanvas('power', 2);

          const { jsPDF } = jspdfUmd;
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
          const PW = doc.internal.pageSize.getWidth();
          const PH = doc.internal.pageSize.getHeight();
          const M = 28;
          const BG = [7, 10, 22];
          const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          const fillPageBg = () => {
            doc.setFillColor(...BG);
            doc.rect(0, 0, PW, PH, 'F');
          };

          const drawHeader = (title, sub) => {
            doc.setFillColor(4, 6, 16);
            doc.rect(0, 0, PW, 42, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(235, 240, 255);
            doc.text(title, M, 26);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5); doc.setTextColor(130, 160, 200);
            if (sub) {
              const maxSubW = PW - M * 2 - 90;
              const trimSub = doc.splitTextToSize(sub, maxSubW)[0] || sub;
              doc.text(trimSub, M, 38);
            }
            doc.setFontSize(7.5); doc.setTextColor(70, 95, 130);
            doc.text(dateStr, PW - M, 20, { align: 'right' });
            doc.text(String(config.name || 'Screen'), PW - M, 31, { align: 'right' });
          };

          const secLabel = (text, x, y, rgb) => {
            doc.setFillColor(...rgb);
            doc.rect(x, y, 3, 10, 'F');
            doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(210, 220, 235);
            doc.text(text, x + 6, y + 9);
          };

          const hRule = (y) => {
            doc.setDrawColor(25, 35, 55); doc.setLineWidth(0.4);
            doc.line(M, y, PW - M, y);
          };

          const drawKpiStrip = (items) => {
            const kW = (PW - M * 2) / items.length;
            items.forEach((k, i) => {
              const x = M + i * kW;
              doc.setFillColor(10, 15, 30);
              doc.roundedRect(x + 2, 44, kW - 4, 22, 2, 2, 'F');
              doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...k.c);
              doc.text(k.v, x + kW / 2, 53, { align: 'center' });
              doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(100, 128, 165);
              doc.text(k.l, x + kW / 2, 62, { align: 'center' });
            });
          };

          const hexRgb = (hex) => [parseInt(hex.slice(1, 3), 16) || 128, parseInt(hex.slice(3, 5), 16) || 128, parseInt(hex.slice(5, 7), 16) || 128];

          const placeDiagramWithTable = (diagramPng, tableRows, tableColConfig, startY, sectionLabel, sectionColor, tableLabel, tableLabelColor) => {
            const maxDW = Math.round((PW - M * 2) * 0.56);
            const maxDH = Math.round(PH * 0.52);
            const ar = canvasW / canvasH;
            let dw = maxDW, dh = Math.round(dw / ar);
            if (dh > maxDH) { dh = maxDH; dw = Math.round(dh * ar); }

            secLabel(sectionLabel, M, startY, sectionColor);
            if (diagramPng) doc.addImage(diagramPng, 'PNG', M, startY + 12, dw, dh);

            const tableX = M + dw + 10;
            const tableW = PW - M - tableX;
            if (tableW > 80 && tableRows.length) {
              secLabel(tableLabel, tableX, startY, tableLabelColor);
              let ty = startY + 14;
              const tCols = tableColConfig;
              doc.setFillColor(8, 14, 28);
              doc.rect(tableX, ty, tableW, 14, 'F');
              doc.setFont('helvetica', 'bold'); doc.setFontSize(6.5); doc.setTextColor(60, 180, 155);
              let hxT = tableX + 2;
              tCols.forEach(col => { doc.text(col.h, hxT, ty + 10); hxT += col.w; });
              ty += 21;
              doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2);
              tableRows.forEach((row, idx) => {
                if (ty > startY + dh + 12) return;
                doc.setFillColor(idx % 2 === 0 ? 9 : 13, idx % 2 === 0 ? 13 : 18, idx % 2 === 0 ? 26 : 34);
                doc.rect(tableX, ty - 7, tableW, 10, 'F');
                doc.setTextColor(...(row._color || [200, 210, 225]));
                if (row._dot) {
                  const [dr, dg, db] = hexRgb(row._dot);
                  doc.setFillColor(dr, dg, db); doc.circle(tableX + 3, ty - 2, 2.5, 'F');
                }
                let dxT = tableX + (row._dot ? 8 : 3);
                row.cells.forEach((v, vi) => { if (vi < tCols.length) { doc.text(String(v), dxT, ty + 1); dxT += tCols[vi].w; } });
                ty += 10;
              });
            }
            return dh;
          };

          fillPageBg();
          drawHeader(
            `LED Patching - Data Routing  |  ${config.name || 'Screen'}`,
            `${report.processor}  |  ${report.controllersUsed} controllers  |  ${report.portsUsed} ports  |  ${report.perPortLimit}/port  |  ${config.hz}Hz  ${config.bit}-bit  |  ${report.resolution}  |  ${report.screenSize}`
          );

          drawKpiStrip([
            { l: 'Processor', v: String(config.selectedProcessor.name || '-').split(' ').slice(-2).join(' '), c: [0, 215, 145] },
            { l: 'Controllers', v: report.controllersUsed, c: [80, 175, 255] },
            { l: 'Ports Used', v: String(report.portsUsed), c: [160, 100, 255] },
            { l: 'Total Panels', v: formatNumber(totals.totalCabs), c: [255, 175, 30] },
            { l: `Limit (${config.hz}Hz/${config.bit}b)`, v: `${totals.cabsPerPortLimit} tiles`, c: [80, 215, 175] },
            { l: 'Resolution', v: `${totals.totalPxWidth}x${totals.totalPxHeight}`, c: [220, 120, 80] }
          ]);

          let y1 = 72;
          const portTableCols = (tw) => [
            { h: 'C', w: tw * 0.09 }, { h: 'P', w: tw * 0.09 },
            { h: 'Panels', w: tw * 0.18 }, { h: 'Load%', w: tw * 0.18 },
            { h: 'Pixels', w: tw * 0.28 }, { h: 'St', w: tw * 0.18 }
          ];
          const portRows1 = report.portRows.map((row) => {
            const pathIdx = (row.controller - 1) * controllerAllocation.portsPerController + (row.port - 1);
            return {
              _dot: PORT_PALETTE[pathIdx % PORT_PALETTE.length] || '#888888',
              _color: row.status === 'OVERLOAD' ? [255, 60, 60] : row.status === 'FREE' ? [100, 115, 135] : [200, 215, 230],
              cells: [String(row.controller), String(row.port), String(row.panels), `${Math.round(row.loadPercent)}%`, formatNumber(row.pixels), row.status.slice(0, 3)]
            };
          });

          const maxDiaW = Math.round((PW - M * 2) * 0.56);
          const tableXEst = M + maxDiaW + 10;
          const tableWEst = PW - M - tableXEst;
          const dh1 = placeDiagramWithTable(
            dataDiagramPng, portRows1, portTableCols(tableWEst), y1,
            'Data Routing Diagram', [34, 197, 94],
            'Port Load Details', [59, 130, 246]
          );
          y1 += dh1 + 16;

          doc.setFontSize(6.5); doc.setTextColor(60, 78, 105);
          doc.text(`Panel: ${report.panelPixelSize}  |  Physical: ${report.screenSize}  |  Total: ${formatNumber(totals.totalCabs)} panels  |  Generated: ${report.timestamp}`, M, PH - 10);

          doc.addPage();
          fillPageBg();

          const totalWatts = totals.totalW;
          const totalKW = totalWatts / 1000;
          const totalAmps = totals.totalAmps;
          const numCircuits = powerPaths.length;
          const wattsPerCab = powerTileWatts;
          const circAmps = config.circuitAmps;

          drawHeader(
            `LED Patching - Power Distribution  |  ${config.name || 'Screen'}`,
            `${wattsPerCab}W (${powerTileAmps}A) / tile @ ${supplyVoltage}V  |  ${circAmps}A breaker (${effectiveBreakerAmpsLimit}A limit)  |  ${numCircuits} circuits  |  Pattern: ${config.powerPattern}`
          );

          drawKpiStrip([
            { l: 'Total Panels', v: String(totals.totalCabs), c: [0, 215, 140] },
            { l: 'Per Tile', v: `${wattsPerCab}W / ${powerTileAmps}A`, c: [255, 160, 40] },
            { l: 'Total Power', v: `${totalKW.toFixed(2)} kW`, c: [255, 80, 80] },
            { l: 'Total Current', v: `${totalAmps.toFixed(1)}A`, c: [180, 80, 255] },
            { l: 'Circuits', v: String(numCircuits || '-'), c: [60, 175, 255] },
            { l: 'Breaker', v: `${circAmps}A (${supplyVoltage}V)`, c: [100, 215, 100] }
          ]);

          let y2 = 72;

          const circTableCols2 = (tw) => [
            { h: 'Circuit', w: tw * 0.14 }, { h: 'Phase', w: tw * 0.10 },
            { h: 'Panels', w: tw * 0.12 }, { h: 'kW', w: tw * 0.14 },
            { h: 'Amps', w: tw * 0.14 }, { h: 'Load', w: tw * 0.12 },
            { h: 'Entry', w: tw * 0.14 }
          ];
          const circRows2 = powerPaths.map((circuit, ci) => {
            const nc = circuit.length;
            const circAmpsVal = nc * powerTileAmps;
            const overloaded = circAmpsVal > effectiveBreakerAmpsLimit;
            const first = circuit[0];
            return {
              _dot: POWER_PALETTE[ci % POWER_PALETTE.length],
              _color: overloaded ? [255, 80, 80] : [200, 215, 230],
              cells: [
                `P${ci + 1}`,
                `L${(ci % 3) + 1}`,
                String(nc),
                `${(nc * wattsPerCab / 1000).toFixed(2)}kW`,
                `${circAmpsVal.toFixed(1)}A`,
                `${Math.round(circAmpsVal / circAmps * 100)}%`,
                `(${first.c + 1},${first.r + 1})`
              ]
            };
          });

          const tableXEst2 = M + maxDiaW + 10;
          const tableWEst2 = PW - M - tableXEst2;
          const dh2 = placeDiagramWithTable(
            powerDiagramPng, circRows2, circTableCols2(tableWEst2), y2,
            'Power Routing Diagram', [255, 80, 80],
            'Circuit & 3-Phase Breakdown', [240, 140, 60]
          );
          y2 += dh2 + 12;

          hRule(y2); y2 += 10;

          if (y2 < PH - M - 50) {
            secLabel('Power & 3-Phase Specifications', M, y2, [100, 145, 255]);
            y2 += 13;
            const specs = [
              ['LED Model', config.ledBrand ? `${config.ledBrand} ${config.ledModel}` : config.tileType, 'Amps / Watts per Tile', `${powerTileAmps}A / ${wattsPerCab}W @ ${supplyVoltage}V`],
              ['Breaker Rating', `${circAmps}A (${config.use80PercentRule ? '80% Safe = ' + effectiveBreakerAmpsLimit + 'A' : '100% Rated'})`, 'Max Tiles / Circuit', `${effectivePowerLimit} tiles`],
              ['Total Panels', String(totals.totalCabs), 'Total Power / Current', `${totalKW.toFixed(2)} kW / ${totalAmps.toFixed(1)}A`],
              ['Phase L1 Load', `${phaseAllocation[0].amps.toFixed(1)}A (${(phaseAllocation[0].watts / 1000).toFixed(2)}kW)`, 'Phase L2 Load', `${phaseAllocation[1].amps.toFixed(1)}A (${(phaseAllocation[1].watts / 1000).toFixed(2)}kW)`],
              ['Phase L3 Load', `${phaseAllocation[2].amps.toFixed(1)}A (${(phaseAllocation[2].watts / 1000).toFixed(2)}kW)`, 'Wall Size (Physical)', `${totals.totalWidthM.toFixed(2)}m x ${totals.totalHeightM.toFixed(2)}m (${config.cols}x${config.rows})`]
            ];
            const scW = (PW - M * 2) / 4;
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7.5);
            specs.forEach((row, i) => {
              const ly = y2 + i * 12;
              if (ly > PH - M - 8) return;
              doc.setFillColor(i % 2 === 0 ? 9 : 13, i % 2 === 0 ? 13 : 18, i % 2 === 0 ? 26 : 34);
              doc.rect(M, ly - 7, PW - M * 2, 10, 'F');
              doc.setTextColor(90, 120, 165); doc.text(row[0], M + 3, ly);
              doc.setTextColor(205, 215, 230); doc.text(row[1], M + 3 + scW, ly);
              doc.setTextColor(90, 120, 165); doc.text(row[2], M + 3 + scW * 2, ly);
              doc.setTextColor(205, 215, 230); doc.text(row[3], M + 3 + scW * 3, ly);
            });
          }

          doc.setFontSize(6.5); doc.setTextColor(60, 78, 105);
          doc.text(
            `Generated by Pixelogic | ${dateStr} | Power values at rated wattage | Consult a qualified electrician`,
            M, PH - 10
          );

          doc.save(`Signal_Patching_${String(config.name || 'Screen').replace(/\s+/g, '_')}_${Date.now()}.pdf`);
        } catch (err) {
          console.warn('PDF export failed', err);
        }
      };

      return html`
        <div className="pl-patching-shell h-[calc(100vh-165px)] w-full text-slate-200 text-[13px] font-sans flex flex-col overflow-hidden select-none rounded-xl border border-slate-800/90 bg-[#070d17]">
          <style>${`
            .pl-patching-shell {
              box-shadow: 0 20px 60px rgba(0,0,0,.55);
              font-family: "Inter", "Segoe UI", system-ui, sans-serif;
            }
            .pl-patching-shell input:focus, .pl-patching-shell select:focus {
              border-color: #38bdf8 !important;
              box-shadow: 0 0 0 2px rgba(56,189,248,.15);
            }
            .pl-route { stroke-dasharray: 9 5; animation: pl-signal-flow 1.15s linear infinite; }
            .pl-route-power { animation-duration: 1.65s; }
            .pl-route-origin { transform-box: fill-box; transform-origin: center; animation: pl-origin-pulse 1.8s ease-out infinite; }
            .pl-draw-tile { cursor: crosshair; }
            .pl-draw-tile:hover > rect:first-child { stroke: #f8fafc; stroke-width: 1.6; }
            @keyframes pl-signal-flow { to { stroke-dashoffset: -28; } }
            @keyframes pl-origin-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.7); opacity: .45; } }
            @media (prefers-reduced-motion: reduce) { .pl-route, .pl-route-origin { animation: none; } }
          `}</style>

          <!-- TOP WORKSPACE BAR: Screen Tabs + Mode Switcher (Data vs Power) + Actions -->
          <div className="h-13 shrink-0 bg-[#0b1322] border-b border-slate-800/80 px-4 flex items-center justify-between gap-4">
            <!-- Left: Screen Tabs -->
            <div className="flex items-center gap-1.5 overflow-x-auto py-1.5 max-w-[42%]">
              ${screens.map((s, i) => html`
                <button
                  key=${s.id}
                  onClick=${() => setActiveIndex(i)}
                  className=${`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shrink-0 border ${
                    i === activeIndex
                      ? 'bg-sky-500/15 text-sky-300 border-sky-500/40 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  <span>${s.name}</span>
                  <span className="text-[10px] font-mono opacity-65">${s.cols}×${s.rows}</span>
                  ${screens.length > 1 ? html`
                    <span
                      onClick=${(e) => { e.stopPropagation(); removeScreen(i); }}
                      className="opacity-45 hover:opacity-100 hover:text-rose-400 ml-0.5 text-[11px] px-0.5"
                      title="Remove Screen"
                    >×</span>
                  ` : null}
                </button>
              `)}
              <button
                onClick=${addScreen}
                className="shrink-0 px-2.5 py-1.5 text-xs text-slate-400 hover:text-sky-300 bg-slate-900/40 border border-dashed border-slate-700 hover:border-sky-500/40 rounded-lg transition-all font-semibold"
              >+ Add Screen</button>
            </div>

            <!-- Center: Focused Mode Switcher (Signal Patching vs Power Distribution) -->
            <div className="flex items-center bg-[#060b14] p-1 rounded-xl border border-slate-800">
              <button
                onClick=${() => { setWorkspaceTab('data'); if (drawMode === 'power') setDrawMode(null); }}
                className=${`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  workspaceTab === 'data'
                    ? 'bg-sky-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>◈ Signal / Data Patching</span>
                <span className=${`px-1.5 py-0.2 rounded text-[10px] font-mono ${workspaceTab === 'data' ? 'bg-slate-950/25 text-slate-950' : 'bg-slate-800 text-sky-400'}`}>${activeDataPathsCount} ports</span>
              </button>
              <button
                onClick=${() => { setWorkspaceTab('power'); if (drawMode === 'data') setDrawMode(null); }}
                className=${`flex items-center gap-2 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  workspaceTab === 'power'
                    ? 'bg-amber-500 text-slate-950 shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <span>⚡ Power Distribution</span>
                <span className=${`px-1.5 py-0.2 rounded text-[10px] font-mono ${workspaceTab === 'power' ? 'bg-slate-950/25 text-slate-950' : 'bg-slate-800 text-amber-400'}`}>${activePowerPathsCount} circuits</span>
              </button>
            </div>

            <!-- Right: Export & Sheets Sync -->
            <div className="flex items-center gap-2 shrink-0">
              ${bridge ? html`
                <button
                  onClick=${() => bridge.openSheetsTab && bridge.openSheetsTab()}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 hover:bg-emerald-500/25 transition-all"
                  title="Synced with Sheets — Click to return to Sheets"
                >📊 Sheets</button>
              ` : null}
              <button onClick=${exportPNG} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-slate-200 transition-all">↓ PNG</button>
              <button onClick=${exportPDF} className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/35 text-sky-300 transition-all">↓ PDF Report</button>
            </div>
          </div>

          <!-- MAIN 3-COLUMN BODY -->
          <div className="flex-1 min-h-0 grid" style=${{ gridTemplateColumns: '300px minmax(0, 1fr) 310px' }}>

            <!-- LEFT PANEL: CLEAN SCREEN SETUP + ACTIVE MODE ROUTING -->
            <aside className="bg-[#0a1220] border-r border-slate-800/80 flex flex-col overflow-y-auto p-4 space-y-4">

              <!-- Card 1: Screen & LED Model -->
              <div className="bg-[#0f192c] border border-slate-800/90 rounded-xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white tracking-wide">1. Screen & LED Wall</span>
                  ${config.pitchMm ? html`<span className="px-2 py-0.5 rounded-md bg-sky-500/15 border border-sky-500/30 text-[11px] font-mono font-bold text-sky-300">P${config.pitchMm}mm</span>` : null}
                </div>

                <div>
                  <label className="text-[11px] text-slate-400 font-medium block mb-1">Screen Name</label>
                  <input
                    type="text"
                    className="w-full bg-[#070d18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-semibold text-white outline-none"
                    value=${config.name}
                    onChange=${(e) => updateConfig({ name: e.target.value })}
                  />
                </div>

                ${ledCatalog.length ? html`
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">LED Brand</label>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700/80 text-xs py-1.5 px-2.5 rounded-lg outline-none text-sky-300 font-semibold"
                        value=${config.ledBrand || ''}
                        onChange=${(e) => {
                          const bName = e.target.value;
                          const firstSpec = ledCatalog.find((c) => c.brand === bName);
                          if (firstSpec) {
                            const t = (firstSpec.panelWidthMm === 500 && firstSpec.panelHeightMm === 500) ? 'half-half' : ((firstSpec.panelWidthMm === 500 && firstSpec.panelHeightMm === 1000) ? 'half-one' : 'custom');
                            const amps230 = (firstSpec.full && Number(firstSpec.full.w) > 0) ? Number(firstSpec.full.w) : (t === 'half-one' ? 2.02 : 1.0);
                            const scaledAmps = Number((amps230 * (230 / supplyVoltage)).toFixed(2));
                            updateConfig({
                              ledBrand: firstSpec.brand,
                              ledModel: firstSpec.model,
                              pitchMm: firstSpec.pitchMm,
                              modW: firstSpec.panelResWidth,
                              modH: firstSpec.panelResHeight,
                              physW: firstSpec.panelWidthMm,
                              physH: firstSpec.panelHeightMm,
                              tileType: t,
                              tileAmps: scaledAmps,
                              maxWatts: Math.round(scaledAmps * supplyVoltage)
                            });
                          } else {
                            updateConfig({ ledBrand: '', ledModel: '' });
                          }
                        }}
                      >
                        <option value="">-- Select LED Brand --</option>
                        ${ledBrands.map((b) => html`<option key=${b} value=${b}>${b}</option>`)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">LED Model & Pitch</label>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700/80 text-xs py-1.5 px-2.5 rounded-lg outline-none text-emerald-300 font-semibold"
                        value=${config.ledBrand && config.ledModel ? `${config.ledBrand}|||${config.ledModel}` : ''}
                        onChange=${(e) => {
                          const raw = e.target.value || '';
                          if (raw.includes('|||')) {
                            const parts = raw.split('|||');
                            const spec = ledCatalog.find((c) => c.brand === parts[0] && c.model === parts[1]);
                            if (spec) {
                              const t = (spec.panelWidthMm === 500 && spec.panelHeightMm === 500) ? 'half-half' : ((spec.panelWidthMm === 500 && spec.panelHeightMm === 1000) ? 'half-one' : 'custom');
                              const amps230 = (spec.full && Number(spec.full.w) > 0) ? Number(spec.full.w) : (t === 'half-one' ? 2.02 : 1.0);
                              const scaledAmps = Number((amps230 * (230 / supplyVoltage)).toFixed(2));
                              updateConfig({
                                ledBrand: spec.brand,
                                ledModel: spec.model,
                                pitchMm: spec.pitchMm,
                                modW: spec.panelResWidth,
                                modH: spec.panelResHeight,
                                physW: spec.panelWidthMm,
                                physH: spec.panelHeightMm,
                                tileType: t,
                                tileAmps: scaledAmps,
                                maxWatts: Math.round(scaledAmps * supplyVoltage)
                              });
                            }
                          } else {
                            updateConfig({ ledModel: '' });
                          }
                        }}
                      >
                        <option value="">-- Select Model --</option>
                        ${(config.ledBrand ? ledCatalog.filter((c) => c.brand === config.ledBrand) : ledCatalog).map((m) => html`
                          <option key=${`${m.brand}|||${m.model}`} value=${`${m.brand}|||${m.model}`}>
                            ${config.ledBrand ? '' : `${m.brand} · `}${m.model} (P${m.pitchMm}mm)
                          </option>
                        `)}
                      </select>
                    </div>
                  </div>
                ` : null}

                <!-- Tile Grid (Columns x Rows) -->
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">Columns (W)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-[#070d18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none"
                      value=${config.cols}
                      onChange=${(e) => updateConfig({ cols: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">Rows (H)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full bg-[#070d18] border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs font-bold text-white outline-none"
                      value=${config.rows}
                      onChange=${(e) => updateConfig({ rows: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    />
                  </div>
                </div>

                <!-- Clean Summary Strip + Optional Custom Cabinet Specs Toggle -->
                <div className="bg-[#08101f] border border-slate-800 rounded-lg p-2.5 flex items-center justify-between text-xs">
                  <div>
                    <div className="text-[10px] text-slate-400">Cabinet: <span className="text-slate-200 font-mono">${config.physW || 500}×${config.physH || 500}mm (${config.modW}×${config.modH}px)</span></div>
                    <div className="text-[11px] font-bold text-sky-300 mt-0.5">Wall: ${totals.totalWidthM.toFixed(2)}m × ${totals.totalHeightM.toFixed(2)}m (${totals.totalCabs} tiles)</div>
                  </div>
                  <button
                    onClick=${() => setShowCustomCabSpecs(!showCustomCabSpecs)}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold shrink-0"
                  >${showCustomCabSpecs ? 'Hide' : 'Edit'}</button>
                </div>

                ${showCustomCabSpecs ? html`
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Cabinet px (W × H)</label>
                      <div className="grid grid-cols-2 gap-1">
                        <input type="number" min="1" className="w-full bg-[#070d18] border border-slate-700 rounded px-2 py-1 text-xs text-violet-300 font-mono outline-none" value=${config.modW} onChange=${(e) => updateConfig({ modW: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                        <input type="number" min="1" className="w-full bg-[#070d18] border border-slate-700 rounded px-2 py-1 text-xs text-violet-300 font-mono outline-none" value=${config.modH} onChange=${(e) => updateConfig({ modH: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block mb-1">Cabinet mm (W × H)</label>
                      <div className="grid grid-cols-2 gap-1">
                        <input type="number" min="50" className="w-full bg-[#070d18] border border-slate-700 rounded px-2 py-1 text-xs text-teal-300 font-mono outline-none" value=${config.physW || 500} onChange=${(e) => updateConfig({ physW: Math.max(50, parseInt(e.target.value, 10) || 500) })} />
                        <input type="number" min="50" className="w-full bg-[#070d18] border border-slate-700 rounded px-2 py-1 text-xs text-teal-300 font-mono outline-none" value=${config.physH || 500} onChange=${(e) => updateConfig({ physH: Math.max(50, parseInt(e.target.value, 10) || 500) })} />
                      </div>
                    </div>
                  </div>
                ` : null}
              </div>

                <!-- WIRING PATHS CARD (Matches LED.FYI Visual 24-Icon Selector for Data & Power) -->
              <div className="bg-[#0f192c] border border-slate-800/90 rounded-xl p-3.5 space-y-2.5">
                <div>
                  <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-300">Wiring Paths</div>
                  <div className="text-[11px] text-slate-400 mt-0.5 leading-snug">How the data and power cables snake across this screen's panels.</div>
                </div>

                ${[
                  {
                    type: 'data',
                    title: 'Data',
                    color: '#22c55e',
                    borderActive: 'border-emerald-500/70',
                    patternKey: 'dataPattern',
                    cornerKey: 'dataStartCorner',
                    modeKey: 'dataRoutingMode',
                    currentPattern: config.dataPattern || 'v-snake',
                    currentCorner: config.dataStartCorner || 'tl',
                    isManual: config.dataRoutingMode === 'manual'
                  },
                  {
                    type: 'power',
                    title: 'Power',
                    color: '#f97316',
                    borderActive: 'border-orange-500/70',
                    patternKey: 'powerPattern',
                    cornerKey: 'powerStartCorner',
                    modeKey: 'powerRoutingMode',
                    currentPattern: config.powerPattern || 'v-snake',
                    currentCorner: config.powerStartCorner || 'tl',
                    isManual: config.powerRoutingMode === 'manual'
                  }
                ].map((wp) => {
                  const isOpen = openWiringCard === wp.type;
                  const summaryLabel = wp.isManual
                    ? 'Custom Manual Draw'
                    : getWiringSummaryLabel(wp.currentPattern, wp.currentCorner);
                  const families = [
                    { label: 'U-TURN', hPat: 'h-snake', vPat: 'v-snake' },
                    { label: 'ZIG-ZAG', hPat: 'h-zigzag', vPat: 'v-zigzag' },
                    { label: 'ISOLATED', hPat: 'h-isolated', vPat: 'v-isolated' }
                  ];
                  const corners = ['tl', 'tr', 'bl', 'br'];

                  return html`
                    <div
                      key=${`wp-card-${wp.type}`}
                      className=${`rounded-xl border transition-all overflow-hidden bg-[#141b26] ${
                        isOpen ? `${wp.borderActive} shadow-lg` : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <!-- Header Row -->
                      <button
                        type="button"
                        onClick=${() => {
                          const nextOpen = isOpen ? null : wp.type;
                          setOpenWiringCard(nextOpen);
                          if (nextOpen) setWorkspaceTab(wp.type);
                        }}
                        className="w-full px-3 py-2.5 flex items-center justify-between text-left hover:bg-slate-800/35 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style=${{ background: wp.color }}></span>
                          <span className="text-xs font-bold text-white">${wp.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className="text-[11px] text-slate-300 truncate">${summaryLabel}</span>
                          <span className="text-slate-400 text-xs transition-transform" style=${{ transform: isOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
                        </div>
                      </button>

                      <!-- Expanded 24-Icon Selector Grid -->
                      ${isOpen ? html`
                        <div className="px-3 pb-3 pt-1.5 border-t border-slate-800/90 space-y-3 bg-[#111722]">
                          ${families.map((fam) => html`
                            <div key=${`${wp.type}-${fam.label}`} className="space-y-1.5">
                              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-300">${fam.label}</div>
                              <div className="grid grid-cols-2 gap-2.5">
                                <!-- Horizontal Runs (4 Corners) -->
                                <div>
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Horizontal Runs</div>
                                  <div className="grid grid-cols-4 gap-1">
                                    ${corners.map((cId) => {
                                      const isSelected = !wp.isManual && wp.currentPattern === fam.hPat && wp.currentCorner === cId;
                                      return html`
                                        <button
                                          key=${`${wp.type}-${fam.hPat}-${cId}`}
                                          type="button"
                                          onClick=${() => {
                                            setWorkspaceTab(wp.type);
                                            if (drawMode === wp.type) setDrawMode(null);
                                            updateConfig({
                                              [wp.modeKey]: 'auto',
                                              [wp.patternKey]: fam.hPat,
                                              [wp.cornerKey]: cId
                                            });
                                          }}
                                          title=${`${fam.label} · ${WIRING_CORNER_LABELS[cId]} · Horizontal`}
                                          className=${`h-9 rounded-lg flex items-center justify-center transition-all border ${
                                            isSelected
                                              ? 'bg-[#1c2636] border-2 shadow-sm'
                                              : 'bg-[#18202c] border-slate-800 hover:border-slate-600'
                                          }`}
                                          style=${isSelected ? { borderColor: wp.color, boxShadow: `0 0 0 1px ${wp.color}33` } : {}}
                                        >
                                          ${renderWiringPathIcon(fam.hPat, cId, wp.color, 26)}
                                        </button>
                                      `;
                                    })}
                                  </div>
                                </div>

                                <!-- Vertical Runs (4 Corners) -->
                                <div>
                                  <div className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-1">Vertical Runs</div>
                                  <div className="grid grid-cols-4 gap-1">
                                    ${corners.map((cId) => {
                                      const isSelected = !wp.isManual && wp.currentPattern === fam.vPat && wp.currentCorner === cId;
                                      return html`
                                        <button
                                          key=${`${wp.type}-${fam.vPat}-${cId}`}
                                          type="button"
                                          onClick=${() => {
                                            setWorkspaceTab(wp.type);
                                            if (drawMode === wp.type) setDrawMode(null);
                                            updateConfig({
                                              [wp.modeKey]: 'auto',
                                              [wp.patternKey]: fam.vPat,
                                              [wp.cornerKey]: cId
                                            });
                                          }}
                                          title=${`${fam.label} · ${WIRING_CORNER_LABELS[cId]} · Vertical`}
                                          className=${`h-9 rounded-lg flex items-center justify-center transition-all border ${
                                            isSelected
                                              ? 'bg-[#1c2636] border-2 shadow-sm'
                                              : 'bg-[#18202c] border-slate-800 hover:border-slate-600'
                                          }`}
                                          style=${isSelected ? { borderColor: wp.color, boxShadow: `0 0 0 1px ${wp.color}33` } : {}}
                                        >
                                          ${renderWiringPathIcon(fam.vPat, cId, wp.color, 26)}
                                        </button>
                                      `;
                                    })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          `)}

                          <!-- Footer Summary + Done Button -->
                          <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                            <span className="text-[11px] text-slate-300 font-medium">${summaryLabel}</span>
                            <button
                              type="button"
                              onClick=${() => setOpenWiringCard(null)}
                              className="px-3 py-1 rounded-lg bg-[#1e293b] hover:bg-slate-700 border border-slate-600 text-xs font-bold text-white transition-colors"
                            >Done</button>
                          </div>
                        </div>
                      ` : null}
                    </div>
                  `;
                })}
              </div>

              <!-- Card 2: Context-Sensitive Routing Controls (Shows ONLY Data OR Power based on active tab) -->
              ${workspaceTab === 'data' ? html`
                <div className="bg-[#0f192c] border border-sky-500/25 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-sky-300">2. Signal / Data Routing</span>
                    <span className="text-[11px] font-mono text-emerald-400 font-bold">${effectiveDataLimit} tiles/port</span>
                  </div>

                  <!-- Auto vs Manual Draw Toggle -->
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#070d18] border border-slate-800 rounded-lg">
                    <button
                      onClick=${() => { updateConfig({ dataRoutingMode: 'auto' }); if (drawMode === 'data') setDrawMode(null); }}
                      className=${`py-1.5 rounded-md text-xs font-bold transition-all ${config.dataRoutingMode !== 'manual' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35' : 'text-slate-400 hover:text-white'}`}
                    >⚡ Auto Patch</button>
                    <button
                      onClick=${() => beginManualDrawing('data')}
                      className=${`py-1.5 rounded-md text-xs font-bold transition-all ${config.dataRoutingMode === 'manual' ? 'bg-sky-500/20 text-sky-300 border border-sky-500/35' : 'text-slate-400 hover:text-white'}`}
                    >✏️ Draw Manually</button>
                  </div>

                  ${config.dataRoutingMode === 'manual' ? html`
                    <!-- Manual Port Selector & Modify Box -->
                    <div className="bg-[#08101f] border border-sky-500/30 rounded-lg p-2.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-sky-300 font-bold">Select Port to Modify</label>
                        <button
                          onClick=${() => { setDrawMode('data'); startNewManualPath(); }}
                          className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500/30 text-[10px] font-bold text-sky-300"
                        >+ New Port</button>
                      </div>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700 text-xs py-1.5 px-2.5 rounded-lg outline-none text-white font-semibold"
                        value=${selectedDataPortIdx}
                        onChange=${(e) => selectAndModifyPort('data', parseInt(e.target.value, 10) || 0, false)}
                      >
                        ${Array.from({ length: Math.max(1, dataPaths.length) }).map((_, idx) => {
                          const pTiles = Array.isArray(dataPaths[idx]) ? dataPaths[idx].length : 0;
                          return html`
                            <option key=${`sel-dp-${idx}`} value=${idx}>
                              Port ${idx + 1} (${formatPortCode(idx)}) — ${pTiles} tiles (${Math.round(((pTiles * totals.tilePixels) / Math.max(1, totals.maxPixelsPerPort)) * 100)}%)
                            </option>
                          `;
                        })}
                      </select>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick=${() => { setDrawMode('data'); stepBackSelectedPort('data', selectedDataPortIdx); }}
                          disabled=${!(Array.isArray(dataPaths[selectedDataPortIdx]) && dataPaths[selectedDataPortIdx].length > 0)}
                          className="py-1.5 px-2 rounded bg-[#0c1628] hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-200 disabled:opacity-35"
                          title="Remove the last tile from this port"
                        >−1 Tile</button>
                        <button
                          onClick=${() => { setDrawMode('data'); reverseSelectedPort('data', selectedDataPortIdx); }}
                          disabled=${!(Array.isArray(dataPaths[selectedDataPortIdx]) && dataPaths[selectedDataPortIdx].length > 1)}
                          className="py-1.5 px-2 rounded bg-[#0c1628] hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-sky-300 disabled:opacity-35"
                          title="Reverse start/end order (#1 ↔ #N) of this port"
                        >⇄ Flip</button>
                        <button
                          onClick=${() => clearSelectedPortOnly('data', selectedDataPortIdx)}
                          className="py-1.5 px-2 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-[11px] font-bold text-amber-300"
                          title="Clear ONLY this port so you can redraw it without losing other ports"
                        >↺ Redraw</button>
                      </div>

                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                        <button
                          onClick=${() => {
                            updateManualPaths('data', () => automaticDataPaths.map((p) => [...p]), { dataRoutingMode: 'manual' });
                            setSelectedDataPortIdx(0);
                            setDrawMode('data');
                          }}
                          className="text-[10px] text-emerald-300 hover:underline font-semibold"
                        >Copy Auto-Patch to Edit</button>
                        ${!drawMode ? html`
                          <button
                            onClick=${() => setDrawMode('data')}
                            className="px-2.5 py-1 rounded bg-sky-500 text-slate-950 text-[10px] font-bold"
                          >Resume Drawing</button>
                        ` : null}
                      </div>
                    </div>
                  ` : html`
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Port Grouping</label>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700/80 text-xs py-1.5 px-2 rounded-lg outline-none text-emerald-300 font-semibold"
                        value=${config.dataPackingMode || 'max-fill'}
                        onChange=${(e) => updateConfig({ dataPackingMode: e.target.value })}
                      >
                        ${PACKING_MODES.map((pm) => html`<option key=${pm.id} value=${pm.id}>${pm.name}</option>`)}
                      </select>
                    </div>
                  `}

                  <!-- Max Tiles / Port Override -->
                  <div className="pt-1 border-t border-slate-800/80">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[11px] text-slate-400">Tiles per Port Limit</span>
                      <button
                        onClick=${() => updateConfig({ isAutoDataLimit: !config.isAutoDataLimit })}
                        className=${`text-[10px] font-bold px-2 py-0.5 rounded border ${config.isAutoDataLimit ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' : 'bg-amber-500/15 border-amber-500/35 text-amber-300'}`}
                      >${config.isAutoDataLimit ? `Auto (${totals.cabsPerPortLimit} max)` : 'Custom Limit'}</button>
                    </div>
                    ${!config.isAutoDataLimit ? html`
                      <input
                        type="number"
                        min="1"
                        max=${totals.cabsPerPortLimit}
                        className="w-full bg-[#070d18] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono outline-none"
                        value=${effectiveDataLimit}
                        onChange=${(e) => updateConfig({ maxDataMods: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      />
                    ` : null}
                  </div>

                  <!-- Redundancy Toggle -->
                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">Backup Loop Ports</span>
                    <button
                      onClick=${() => updateConfig({ redundancyMode: !config.redundancyMode })}
                      className=${`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${config.redundancyMode ? 'bg-sky-500/20 border-sky-400/40 text-sky-300' : 'bg-[#070d18] border-slate-700 text-slate-400'}`}
                    >${config.redundancyMode ? 'Primary + Backup (2×)' : 'Primary Only'}</button>
                  </div>
                </div>
              ` : html`
                <div className="bg-[#0f192c] border border-amber-500/25 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300">2. Power Routing</span>
                    <span className="text-[11px] font-mono text-amber-400 font-bold">${effectivePowerLimit} tiles/circuit</span>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#070d18] border border-slate-800 rounded-lg">
                    <button
                      onClick=${() => { updateConfig({ powerRoutingMode: 'auto' }); if (drawMode === 'power') setDrawMode(null); }}
                      className=${`py-1.5 rounded-md text-xs font-bold transition-all ${config.powerRoutingMode !== 'manual' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35' : 'text-slate-400 hover:text-white'}`}
                    >⚡ Auto Patch</button>
                    <button
                      onClick=${() => beginManualDrawing('power')}
                      className=${`py-1.5 rounded-md text-xs font-bold transition-all ${config.powerRoutingMode === 'manual' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/35' : 'text-slate-400 hover:text-white'}`}
                    >✏️ Draw Manually</button>
                  </div>

                  ${config.powerRoutingMode === 'manual' ? html`
                    <div className="bg-[#08101f] border border-amber-500/30 rounded-lg p-2.5 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <label className="text-[11px] text-amber-300 font-bold">Select Circuit to Modify</label>
                        <button
                          onClick=${() => { setDrawMode('power'); startNewManualPath(); }}
                          className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-[10px] font-bold text-amber-300"
                        >+ New Circuit</button>
                      </div>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700 text-xs py-1.5 px-2.5 rounded-lg outline-none text-white font-semibold"
                        value=${selectedPowerCircuitIdx}
                        onChange=${(e) => selectAndModifyPort('power', parseInt(e.target.value, 10) || 0, false)}
                      >
                        ${Array.from({ length: Math.max(1, powerPaths.length) }).map((_, idx) => {
                          const pTiles = Array.isArray(powerPaths[idx]) ? powerPaths[idx].length : 0;
                          return html`
                            <option key=${`sel-pp-${idx}`} value=${idx}>
                              Circuit P${idx + 1} (L${(idx % 3) + 1}) — ${pTiles} tiles (${(pTiles * powerTileAmps).toFixed(1)}A)
                            </option>
                          `;
                        })}
                      </select>

                      <div className="grid grid-cols-3 gap-1.5">
                        <button
                          onClick=${() => { setDrawMode('power'); stepBackSelectedPort('power', selectedPowerCircuitIdx); }}
                          disabled=${!(Array.isArray(powerPaths[selectedPowerCircuitIdx]) && powerPaths[selectedPowerCircuitIdx].length > 0)}
                          className="py-1.5 px-2 rounded bg-[#0c1628] hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-slate-200 disabled:opacity-35"
                        >−1 Tile</button>
                        <button
                          onClick=${() => { setDrawMode('power'); reverseSelectedPort('power', selectedPowerCircuitIdx); }}
                          disabled=${!(Array.isArray(powerPaths[selectedPowerCircuitIdx]) && powerPaths[selectedPowerCircuitIdx].length > 1)}
                          className="py-1.5 px-2 rounded bg-[#0c1628] hover:bg-slate-800 border border-slate-700/80 text-[11px] font-semibold text-amber-300 disabled:opacity-35"
                        >⇄ Flip</button>
                        <button
                          onClick=${() => clearSelectedPortOnly('power', selectedPowerCircuitIdx)}
                          className="py-1.5 px-2 rounded bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-[11px] font-bold text-amber-300"
                        >↺ Redraw</button>
                      </div>
                    </div>
                  ` : null}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Circuit Breaker</label>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700/80 text-xs py-1.5 px-2.5 rounded-lg outline-none text-white font-semibold"
                        value=${config.circuitAmps}
                        onChange=${(e) => updateConfig({ circuitAmps: parseInt(e.target.value, 10) })}
                      >
                        <option value="10">10A Breaker</option>
                        <option value="13">13A Breaker</option>
                        <option value="15">15A Breaker</option>
                        <option value="16">16A Breaker</option>
                        <option value="20">20A Breaker</option>
                        <option value="32">32A Breaker</option>
                        <option value="63">63A Breaker</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Supply Voltage</label>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700/80 text-xs py-1.5 px-2.5 rounded-lg outline-none text-amber-300 font-mono font-semibold"
                        value=${supplyVoltage}
                        onChange=${(e) => {
                          const nextV = parseInt(e.target.value, 10) || 230;
                          const nextAmps = Number((powerTileWatts / nextV).toFixed(2));
                          updateConfig({ voltage: nextV, tileAmps: nextAmps });
                        }}
                      >
                        <option value="230">230V AC</option>
                        <option value="240">240V AC</option>
                        <option value="220">220V AC</option>
                        <option value="208">208V AC</option>
                        <option value="120">120V AC</option>
                        <option value="110">110V AC</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Watts / Tile</label>
                      <input
                        type="number"
                        min="10"
                        step="5"
                        className="w-full bg-[#070d18] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono outline-none"
                        value=${powerTileWatts}
                        onChange=${(e) => {
                          const w = Math.max(10, parseFloat(e.target.value) || 160);
                          updateConfig({ maxWatts: Math.round(w), tileAmps: Number((w / supplyVoltage).toFixed(2)) });
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Amps / Tile</label>
                      <input
                        type="number"
                        min="0.05"
                        step="0.05"
                        className="w-full bg-[#070d18] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 font-mono outline-none"
                        value=${powerTileAmps}
                        onChange=${(e) => {
                          const a = Math.max(0.05, parseFloat(e.target.value) || 0.7);
                          updateConfig({ tileAmps: Number(a.toFixed(2)), maxWatts: Math.round(a * supplyVoltage) });
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-800/80">
                    <span className="text-[11px] text-slate-400">Breaker Safety Limit</span>
                    <button
                      onClick=${() => updateConfig({ use80PercentRule: !config.use80PercentRule })}
                      className=${`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all ${config.use80PercentRule ? 'bg-amber-500/20 border-amber-500/40 text-amber-300' : 'bg-[#070d18] border-slate-700 text-slate-300'}`}
                    >${config.use80PercentRule ? `80% Safe (${effectiveBreakerAmpsLimit}A)` : `100% Rated (${config.circuitAmps}A)`}</button>
                  </div>
                </div>
              `}
            </aside>

            <!-- CENTER: CLEAN CANVAS VIEWPORT -->
            <main className="flex-1 min-w-0 flex flex-col relative bg-[#050a12]">
              <!-- Compact Sub-Toolbar -->
              <div className="h-11 shrink-0 border-b border-slate-800/80 bg-[#08101d] px-4 flex items-center justify-between z-10">
                <!-- Left: Zoom & View Options -->
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-[#0d1829] border border-slate-700/70 rounded-lg overflow-hidden">
                    <button onClick=${() => { setAutoFitView(false); setZoom(Math.max(0.1, zoom - 0.1)); }} className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold">−</button>
                    <span className="text-[11px] font-mono text-slate-300 px-2 border-x border-slate-800 min-w-[3.2rem] text-center">${Math.round(effectiveZoom * 100)}%</span>
                    <button onClick=${() => { setAutoFitView(false); setZoom(Math.min(3, zoom + 0.1)); }} className="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold">+</button>
                  </div>
                  <button
                    onClick=${() => { if (!autoFitView) { setPanX(0); setPanY(0); } setAutoFitView(!autoFitView); }}
                    className=${`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${autoFitView ? 'bg-emerald-500/15 border-emerald-500/35 text-emerald-300' : 'bg-[#0d1829] border-slate-700/70 text-slate-400'}`}
                  >Fit View</button>
                  <button
                    onClick=${() => setShowSeqNumbers(!showSeqNumbers)}
                    className=${`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${showSeqNumbers ? 'bg-sky-500/15 border-sky-500/35 text-sky-300' : 'bg-[#0d1829] border-slate-700/70 text-slate-400'}`}
                    title="Show tile sequence order (#1, #2, #3...) inside cabinets"
                  ># Order</button>
                  <button
                    onClick=${() => setShowBothLayers(!showBothLayers)}
                    className=${`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all ${showBothLayers ? 'bg-purple-500/15 border-purple-500/35 text-purple-300' : 'bg-[#0d1829] border-slate-700/70 text-slate-400'}`}
                    title="Overlay both Data and Power lines simultaneously"
                  >Overlay Both</button>
                </div>

                <!-- Right: Live Status Summary Pill -->
                <div className="flex items-center gap-4 text-xs">
                  <span className="text-slate-400">
                    Wall: <strong className="text-white">${totals.totalPxWidth}×${totals.totalPxHeight}px</strong>
                    <span className="text-slate-500 ml-1">(${totals.totalWidthM.toFixed(1)}×${totals.totalHeightM.toFixed(1)}m)</span>
                  </span>
                  <span className="text-slate-400">
                    Capacity: <strong className="text-sky-300">${totals.cabsPerPortLimit} tiles/port</strong>
                    <span className="text-slate-500 ml-1">(${config.hz}Hz · ${config.bit}-bit)</span>
                  </span>
                  <span className="flex items-center gap-1.5 font-semibold" style=${{ color: routingHealth.tone }}>
                    <span className="w-2 h-2 rounded-full" style=${{ background: routingHealth.tone }}></span>
                    ${routingHealth.label}
                  </span>
                </div>
              </div>

              <!-- Cable & Port Legend Bar (Shows each Cable Color, Port Name like Port 1, Port 2, and Tile Count) -->
              <div className="shrink-0 bg-[#070e1b] border-b border-slate-800/80 px-4 py-1.5 flex items-center gap-2 overflow-x-auto z-10">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 shrink-0">
                  ${workspaceTab === 'power' ? 'Power Circuits:' : 'Data Cables:'}
                </span>
                ${(workspaceTab === 'power' ? powerPaths : dataPaths).map((path, idx) => {
                  const isPower = workspaceTab === 'power';
                  const isSelected = isPower ? (selectedPowerCircuitIdx === idx) : (selectedDataPortIdx === idx);
                  const color = isPower ? POWER_PALETTE[idx % POWER_PALETTE.length] : PORT_PALETTE[idx % PORT_PALETTE.length];
                  const portName = isPower
                    ? `Circuit ${idx + 1} (L${(idx % 3) + 1})`
                    : `Port ${idx + 1} (${formatPortCode(idx)})`;
                  const count = Array.isArray(path) ? path.length : 0;
                  return html`
                    <button
                      key=${`cable-leg-${idx}`}
                      onClick=${() => setSelectedPathIdx(workspaceTab, idx)}
                      className=${`shrink-0 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border transition-all ${
                        isSelected
                          ? 'bg-slate-800 text-white shadow-sm'
                          : 'bg-[#0b1424] text-slate-300 border-slate-800 hover:border-slate-600'
                      }`}
                      style=${isSelected ? { borderColor: color, boxShadow: `0 0 0 1px ${color}44` } : {}}
                      title=${`Click to select ${portName} (${count} tiles)`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style=${{ background: color }}></span>
                      <span className="font-bold text-white">${isPower ? `Ckt ${idx + 1}` : `Port ${idx + 1}`}</span>
                      <span className="text-[10px] text-slate-400 font-mono">(${isPower ? `L${(idx % 3) + 1}` : formatPortCode(idx)})</span>
                      <span className="text-[10px] font-mono font-bold" style=${{ color }}>${count}t</span>
                    </button>
                  `;
                })}
              </div>

              <!-- Canvas Area -->
              <div
                ref=${viewportRef}
                className="flex-1 overflow-hidden relative"
                style=${{ cursor: drawMode ? 'crosshair' : (autoFitView ? 'default' : (isPanning ? 'grabbing' : 'grab')), backgroundColor: '#050a12', backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
                onPointerDown=${(e) => {
                  if (drawMode || autoFitView || e.button !== 0) return;
                  e.preventDefault();
                  panRef.current = { active: true, startX: e.clientX, startY: e.clientY, originX: panX, originY: panY };
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setIsPanning(true);
                }}
                onPointerMove=${(e) => {
                  if (!panRef.current.active) return;
                  setPanX(panRef.current.originX + (e.clientX - panRef.current.startX));
                  setPanY(panRef.current.originY + (e.clientY - panRef.current.startY));
                }}
                onPointerUp=${() => { panRef.current.active = false; handleTilePointerUp(); setIsPanning(false); }}
                onPointerLeave=${() => { panRef.current.active = false; handleTilePointerUp(); setIsPanning(false); }}
              >
                <div style=${{ position: 'absolute', top: '24px', left: '50%', transform: `translate(-50%, 0)${autoFitView ? '' : ` translate(${panX}px, ${panY}px)`} scale(${effectiveZoom})`, transformOrigin: 'top center', transition: isPanning ? 'none' : 'transform 0.15s ease-out' }}>
                  <div className="relative rounded-xl" style=${{ background: '#070e1a', border: '1px solid rgba(56,189,248,0.14)', boxShadow: '0 20px 60px rgba(0,0,0,0.65)' }}>
                    <svg id="diagram-svg" width=${canvasW} height=${canvasH} viewBox=${`0 0 ${canvasW} ${canvasH}`} className="overflow-visible block">
                      <rect x="0" y="0" width=${canvasW} height=${canvasH} fill="#070e1a" rx="10" />
                      <rect x=${padding - 1} y=${padding - 1} width=${config.cols * cabSize + 2} height=${config.rows * cabSize + 2} fill="none" stroke="rgba(56,189,248,0.12)" strokeWidth="1" rx="4" />
                      ${Array.from({ length: config.cols }).map((_, c) => Array.from({ length: config.rows }).map((__, r) => {
                        const dInfo = panelRouteInfo.get(`${c}:${r}`);
                        const pInfo = powerRouteInfo.get(`${c}:${r}`);
                        const routeIndex = dInfo ? dInfo.circuitIndex : 0;
                        const panelColor = PORT_PALETTE[routeIndex % PORT_PALETTE.length];
                        const powerColor = pInfo ? POWER_PALETTE[pInfo.circuitIndex % POWER_PALETTE.length] : '#f97316';
                        const activeColor = workspaceTab === 'power' ? powerColor : panelColor;
                        const activeInfo = workspaceTab === 'power' ? pInfo : dInfo;
                        const isTileInSelectedPort = activeInfo && activeInfo.circuitIndex === (workspaceTab === 'power' ? selectedPowerCircuitIdx : selectedDataPortIdx);
                        const tileTooltip = activeInfo
                          ? (workspaceTab === 'power'
                              ? `Circuit ${activeInfo.circuitIndex + 1} (L${(activeInfo.circuitIndex % 3) + 1}) · Step #${activeInfo.step} (Cabinet ${c + 1},${r + 1})`
                              : `Port ${activeInfo.circuitIndex + 1} (${formatPortCode(activeInfo.circuitIndex)}) · Step #${activeInfo.step} (Cabinet ${c + 1},${r + 1})`)
                          : `Cabinet (${c + 1},${r + 1})`;
                        return html`
                        <g
                          key=${`cab-${c}-${r}`}
                          className="pl-draw-tile"
                          style=${{ cursor: drawMode ? 'crosshair' : (activeInfo ? 'pointer' : 'default') }}
                          title=${tileTooltip}
                          onPointerDown=${(e) => {
                            if (e.button !== 0) return;
                            if (drawMode) {
                              e.preventDefault();
                              e.stopPropagation();
                              handleTilePointerDown(drawMode, c, r);
                            } else if (activeInfo) {
                              e.stopPropagation();
                              setSelectedPathIdx(workspaceTab, activeInfo.circuitIndex);
                            }
                          }}
                          onPointerEnter=${() => {
                            if (drawMode) handleTilePointerEnter(drawMode, c, r);
                          }}
                          onPointerUp=${() => { handleTilePointerUp(); }}
                        >
                          <rect
                            x=${padding + c * cabSize}
                            y=${padding + r * cabSize}
                            width=${cabSize - 2}
                            height=${cabSize - 2}
                            rx="3.5"
                            ry="3.5"
                            fill="#0c1729"
                            stroke=${activeInfo ? activeColor : '#1e293b'}
                            strokeOpacity=${activeInfo ? (isTileInSelectedPort ? 0.95 : 0.4) : 0.8}
                            strokeWidth=${isTileInSelectedPort ? '1.8' : '1'}
                          />
                          ${activeInfo ? html`<rect x=${padding + c * cabSize + 2} y=${padding + r * cabSize + 2} width=${cabSize - 6} height=${cabSize - 6} rx="2" fill=${activeColor} opacity=${isTileInSelectedPort ? '0.14' : '0.05'} />` : null}
                          <text x=${padding + c * cabSize + 4} y=${padding + r * cabSize + 12} fill="#64748b" fontSize="8" fontFamily="monospace">${c + 1},${r + 1}</text>
                          ${showSeqNumbers && activeInfo ? html`
                            <text x=${padding + c * cabSize + cabSize - 6} y=${padding + r * cabSize + 12} textAnchor="end" fill=${activeColor} opacity="0.95" fontSize="8" fontWeight="bold" fontFamily="monospace">#${activeInfo.step}</text>
                          ` : null}
                        </g>
                      `;}))}
                      ${showPower ? renderPath(powerPaths, true) : null}
                      ${showData ? renderPath(dataPaths, false) : null}
                    </svg>
                  </div>
                </div>

                <!-- Manual Draw & Port Modification Floating Bar -->
                ${drawMode ? html`
                  <div
                    className="pl-draw-toolbar absolute border border-slate-700 rounded-xl px-4 py-3 z-20 bg-[#0b1526]/95 backdrop-blur shadow-2xl space-y-2.5"
                    style=${{ top: `${drawToolbarTop}px`, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 32px)', maxWidth: '720px' }}
                  >
                    <!-- Row 1: Clickable Port / Circuit Selector Pills (Switch between any Port to modify!) -->
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-800/90">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0 mr-1">Select Port:</span>
                      ${Array.from({ length: Math.max(1, activeDrawPaths.length) }).map((_, pIdx) => {
                        const pPath = Array.isArray(activeDrawPaths[pIdx]) ? activeDrawPaths[pIdx] : [];
                        const isCurrent = pIdx === activeDrawPathIndex;
                        const pillColor = activeEditType === 'data'
                          ? PORT_PALETTE[pIdx % PORT_PALETTE.length]
                          : POWER_PALETTE[pIdx % POWER_PALETTE.length];
                        const pLabel = activeEditType === 'data' ? `Port ${pIdx + 1} (${formatPortCode(pIdx)})` : `Circuit ${pIdx + 1} (L${(pIdx % 3) + 1})`;
                        return html`
                          <button
                            key=${`draw-pill-${pIdx}`}
                            onClick=${() => setSelectedPathIdx(activeEditType, pIdx)}
                            className=${`shrink-0 flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold border transition-all ${
                              isCurrent
                                ? 'bg-slate-800 text-white border-sky-400 shadow-sm'
                                : 'bg-[#070d18] text-slate-300 border-slate-800 hover:border-slate-600'
                            }`}
                            title="Click to select and modify this port"
                          >
                            <span className="w-2.5 h-2.5 rounded-full" style=${{ background: pillColor }}></span>
                            <span>${pLabel}</span>
                            <span className="text-[10px] font-mono text-slate-400">(${pPath.length}t)</span>
                          </button>
                        `;
                      })}
                      <button
                        onClick=${startNewManualPath}
                        className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold bg-sky-500/15 border border-sky-500/35 text-sky-300 hover:bg-sky-500/25 transition-all"
                      >+ New (${nextDrawAssignment})</button>
                    </div>

                    <!-- Row 2: Active Port Load Status & Help Hint -->
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full animate-pulse" style=${{ background: activeEditType === 'data' ? PORT_PALETTE[activeDrawPathIndex % PORT_PALETTE.length] : POWER_PALETTE[activeDrawPathIndex % POWER_PALETTE.length] }}></span>
                        <span className="text-xs font-bold text-white">
                          Modifying ${activeDrawAssignment}: ${activeDrawTiles} tiles (${activeDrawLoad.value.toLocaleString()} / ${activeDrawLoad.limit.toLocaleString()} ${activeDrawLoad.unit})
                        </span>
                        <span className="text-[10px] text-slate-400 hidden sm:inline">· Click any tile in ${activeDrawAssignment} to trim/reroute</span>
                      </div>
                      <span className=${`text-xs font-bold ${activeDrawOverload ? 'text-rose-400' : 'text-emerald-400'}`}>${activeDrawPercent}% Load</span>
                    </div>

                    <!-- Row 3: Targeted Port Modification Actions + Global Undo/Done -->
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        onClick=${() => stepBackSelectedPort(activeEditType, activeDrawPathIndex)}
                        disabled=${!activeDrawTiles}
                        className="px-2.5 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-slate-200"
                        title="Remove the last tile from the selected port"
                      >−1 Tile</button>
                      <button
                        onClick=${() => reverseSelectedPort(activeEditType, activeDrawPathIndex)}
                        disabled=${activeDrawTiles < 2}
                        className="px-2.5 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs font-semibold text-sky-300"
                        title="Flip #1 ↔ #N wiring direction for this port"
                      >⇄ Reverse</button>
                      <button
                        onClick=${() => clearSelectedPortOnly(activeEditType, activeDrawPathIndex)}
                        disabled=${!activeDrawTiles}
                        className="px-3 h-8 rounded-lg bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 disabled:opacity-30 text-xs font-bold text-amber-300"
                        title="Clear ONLY this port so you can redraw it without losing other ports"
                      >↺ Redraw ${activeDrawAssignment}</button>
                      <button
                        onClick=${startNewManualPath}
                        className="h-8 flex-1 min-w-[110px] px-3 rounded-lg bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500/30 text-xs font-bold text-sky-300"
                      >Next (${nextDrawAssignment}) →</button>
                      <button onClick=${undoManualChange} disabled=${!drawHistory.undo.length} className="px-2.5 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs text-slate-200">Undo</button>
                      <button onClick=${redoManualChange} disabled=${!drawHistory.redo.length} className="px-2.5 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-xs text-slate-200">Redo</button>
                      <button onClick=${clearManualPaths} disabled=${!activeDrawPaths.some((path) => Array.isArray(path) && path.length)} className="px-2.5 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 text-xs font-bold text-rose-300 disabled:opacity-30" title="Clear all ports on the screen">Clear All</button>
                      <button onClick=${() => { drawPointerRef.current.active = false; setDrawMode(null); }} className="px-3.5 h-8 rounded-lg bg-emerald-500 text-slate-950 text-xs font-bold">Done</button>
                    </div>
                  </div>
                ` : null}
              </div>
            </main>

            <!-- RIGHT PANEL: CONTEXT-AWARE INSPECTOR (Processor & Ports OR Power & 3-Phase) -->
            <aside className="bg-[#0a1220] border-l border-slate-800/80 flex flex-col overflow-y-auto p-4 space-y-4">
              ${workspaceTab === 'data' ? html`
                <!-- Processor & Signal Format Card -->
                <div className="bg-[#0f192c] border border-slate-800/90 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">3. Processor & Signal</span>
                    <span className="text-[10px] font-mono text-sky-400 font-semibold">${totals.linkGbps}G Link</span>
                  </div>

                  <div>
                    <label className="text-[11px] text-slate-400 font-medium block mb-1">LED Processor</label>
                    <select
                      className="w-full bg-[#070d18] border border-slate-700/80 text-xs font-semibold text-white rounded-lg px-2.5 py-2 outline-none"
                      value=${config.selectedProcessor.id}
                      onChange=${(e) => {
                        const nextProcessor = PROCESSOR_DATABASE.find((p) => p.id === e.target.value) || PROCESSOR_DATABASE[0];
                        const nextCards = Array.isArray(nextProcessor.outputCards) ? nextProcessor.outputCards : [];
                        const firstCard = nextCards[0] || null;
                        updateConfig({
                          selectedProcessor: nextProcessor,
                          selectedOutputCardId: firstCard ? firstCard.id : null,
                          outputCardCount: firstCard ? (Math.max(1, Number(firstCard.defaultCards) || 1)) : 1
                        });
                      }}
                    >
                      ${PROCESSOR_DATABASE.map((p) => html`<option key=${p.id} value=${p.id}>${p.name}</option>`)}
                    </select>
                  </div>

                  ${Array.isArray(config.selectedProcessor.outputCards) && config.selectedProcessor.outputCards.length ? html`
                    <div className="space-y-2 pt-1 border-t border-slate-800/80">
                      <div>
                        <label className="text-[11px] text-slate-400 font-medium block mb-1">Output Card Type</label>
                        <select
                          className="w-full bg-[#070d18] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-sky-300 font-semibold outline-none"
                          value=${config.selectedOutputCardId || config.selectedProcessor.outputCards[0].id}
                          onChange=${(e) => {
                            const selectedCard = config.selectedProcessor.outputCards.find((card) => card.id === e.target.value) || config.selectedProcessor.outputCards[0];
                            const defaultCards = Math.max(1, Number(selectedCard.defaultCards) || 1);
                            updateConfig({ selectedOutputCardId: selectedCard.id, outputCardCount: defaultCards });
                          }}
                        >
                          ${config.selectedProcessor.outputCards.map((card) => html`<option key=${card.id} value=${card.id}>${card.name}</option>`)}
                        </select>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">Active Output Cards (${totals.effectivePorts} ports)</span>
                        <input
                          type="number"
                          min="1"
                          max=${Math.max(1, Number((config.selectedProcessor.outputCards.find((card) => card.id === (config.selectedOutputCardId || config.selectedProcessor.outputCards[0].id)) || config.selectedProcessor.outputCards[0]).maxCards) || 1)}
                          value=${Math.max(1, parseInt(config.outputCardCount, 10) || (config.selectedProcessor.outputCards[0].defaultCards || 1))}
                          onChange=${(e) => {
                            const selectedCard = config.selectedProcessor.outputCards.find((card) => card.id === (config.selectedOutputCardId || config.selectedProcessor.outputCards[0].id)) || config.selectedProcessor.outputCards[0];
                            const maxCards = Math.max(1, Number(selectedCard.maxCards) || 1);
                            const nextCount = Math.min(maxCards, Math.max(1, parseInt(e.target.value, 10) || 1));
                            updateConfig({ outputCardCount: nextCount });
                          }}
                          className="w-16 bg-[#070d18] border border-slate-700 rounded-lg px-2 py-1 text-xs text-white font-bold text-center outline-none"
                        />
                      </div>
                    </div>
                  ` : null}

                  <!-- Refresh Rate & Bit Depth -->
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Refresh Rate</label>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700/80 rounded-lg text-xs py-1.5 px-2.5 text-sky-300 font-semibold outline-none"
                        value=${config.hz}
                        onChange=${(e) => updateConfig({ hz: parseFloat(e.target.value) })}
                      >
                        <option value="24">24 Hz</option>
                        <option value="25">25 Hz</option>
                        <option value="30">30 Hz</option>
                        <option value="50">50 Hz (PAL)</option>
                        <option value="60">60 Hz (NTSC)</option>
                        <option value="120">120 Hz (HFR)</option>
                        <option value="144">144 Hz</option>
                        <option value="240">240 Hz</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] text-slate-400 font-medium block mb-1">Bit Depth</label>
                      <select
                        className="w-full bg-[#070d18] border border-slate-700/80 rounded-lg text-xs py-1.5 px-2.5 text-emerald-300 font-semibold outline-none"
                        value=${config.bit}
                        onChange=${(e) => updateConfig({ bit: parseInt(e.target.value, 10) })}
                      >
                        <option value="8">8-bit (SDR)</option>
                        <option value="10">10-bit (HDR)</option>
                        <option value="12">12-bit (Cinema)</option>
                      </select>
                    </div>
                  </div>

                  <!-- Clean Capacity Highlight Box + Collapsible 50/60/120Hz Comparison Table -->
                  <div className="bg-[#08101f] border border-slate-800 rounded-lg p-2.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400">Max Load per Port (${config.hz}Hz · ${config.bit}-bit)</div>
                        <div className="text-sm font-black text-emerald-400">${totals.cabsPerPortLimit} Tiles <span className="text-xs font-mono text-slate-400 font-normal">(${totals.maxPixelsPerPort.toLocaleString()} px)</span></div>
                      </div>
                      <button
                        onClick=${() => setShowCapacityMatrix(!showCapacityMatrix)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-sky-300 font-semibold"
                      >${showCapacityMatrix ? 'Hide Table' : '50/60Hz Table'}</button>
                    </div>

                    ${showCapacityMatrix ? html`
                      <div className="pt-2 border-t border-slate-800/80">
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] text-slate-400 font-semibold">Click any cell to switch Hz / Bit:</span>
                          ${totals.linkGbps === 1 ? html`
                            <button
                              onClick=${() => updateConfig({ conservative1G: !config.conservative1G })}
                              className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:text-white"
                            >${config.conservative1G ? 'Mode: 650k Base' : 'Mode: Official Spec'}</button>
                          ` : null}
                        </div>
                        <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
                          <div className="text-slate-500 py-1">Hz</div>
                          <div className="text-emerald-400 font-bold py-1">8-bit</div>
                          <div className="text-sky-400 font-bold py-1">10-bit</div>
                          <div className="text-purple-400 font-bold py-1">12-bit</div>
                          ${totals.capacityMatrix.map((row) => html`
                            <${ReactRef.Fragment} key=${`mat-hz-${row.hz}`}>
                              <div className="py-1 text-slate-300 font-bold flex items-center justify-center">${row.hz}Hz</div>
                              ${row.cells.map((cell) => html`
                                <button
                                  key=${`cell-${cell.hz}-${cell.bit}`}
                                  onClick=${() => updateConfig({ hz: cell.hz, bit: cell.bit })}
                                  className=${`py-1 rounded border transition-all flex flex-col items-center ${
                                    cell.isActive
                                      ? 'bg-sky-500/25 border-sky-400 text-white font-bold'
                                      : 'bg-[#070d18] border-slate-800 text-slate-300 hover:border-slate-600'
                                  }`}
                                >
                                  <span>${cell.tilesLimit}t</span>
                                  <span className="text-[8px] text-slate-500">${cell.pxLimit >= 1000000 ? `${(cell.pxLimit / 1000000).toFixed(1)}M` : `${Math.round(cell.pxLimit / 1000)}k`}</span>
                                </button>
                              `)}
                            </${ReactRef.Fragment}>
                          `)}
                        </div>
                      </div>
                    ` : null}
                  </div>
                </div>

                <!-- Port Allocation List (Interactive: Click any Port to Select & Modify!) -->
                <div className="bg-[#0f192c] border border-slate-800/90 rounded-xl p-3.5 space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">4. Port Allocation</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">Click any port below to select & modify it</div>
                    </div>
                    <button
                      onClick=${() => setShowAllPorts(!showAllPorts)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-semibold"
                    >${showAllPorts ? 'Used Only' : `All (${totals.effectivePorts})`}</button>
                  </div>

                  <div className="space-y-3">
                    ${controllerAllocation.controllers.map((ctrl) => {
                      const visiblePorts = showAllPorts
                        ? ctrl.portLoads
                        : ctrl.portLoads.filter((p) => p.isUsed || p.hasSlot || p.globalPathIndex === selectedDataPortIdx);
                      return html`
                        <div key=${`ctrl-${ctrl.index}`} className="bg-[#08101f] border border-slate-800 rounded-xl p-2.5 space-y-2">
                          <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-1.5">
                            <span className="font-bold text-sky-300">Controller #${ctrl.index + 1}</span>
                            <span className="text-[11px] font-mono text-slate-400">${ctrl.usedPorts}/${ctrl.totalPorts} ports · ${Math.round(ctrl.avgLoadPercent)}% avg</span>
                          </div>

                          <div className="space-y-1.5 max-h-80 overflow-y-auto pr-1">
                            ${visiblePorts.map((port) => {
                              const pct = Math.round(port.loadPercent);
                              const isOver = pct > 100;
                              const isSelectedPort = port.globalPathIndex === selectedDataPortIdx && !port.isBackupPort;
                              const isActivelyDrawingPort = isSelectedPort && drawMode === 'data';
                              return html`
                                <div
                                  key=${`p-${port.portIndex}`}
                                  onClick=${() => {
                                    if (port.isBackupPort || port.globalPathIndex < 0) return;
                                    selectAndModifyPort('data', port.globalPathIndex, false);
                                  }}
                                  className=${`group rounded-lg px-2.5 py-2 text-xs border transition-all cursor-pointer ${
                                    isSelectedPort
                                      ? 'bg-sky-500/15 border-sky-400/70 shadow-sm'
                                      : 'bg-[#0c1628] border-slate-800/70 hover:border-slate-600'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style=${{ background: (port.isUsed || isSelectedPort) ? port.color : '#334155' }}></span>
                                    <span className="font-mono font-bold text-white w-12">${port.isBackupPort ? `B${port.portIndex}` : `Port ${port.portIndex}`}</span>
                                    <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                      <div className="h-full rounded-full" style=${{ width: `${Math.min(100, pct)}%`, background: isOver ? '#ef4444' : port.color }}></div>
                                    </div>
                                    <span className="font-mono text-[11px] text-slate-300 w-14 text-right">${port.isUsed ? `${port.modules} tiles` : (isActivelyDrawingPort ? 'Drawing' : 'Free')}</span>
                                    <span className=${`font-mono font-bold text-[11px] w-9 text-right ${isOver ? 'text-rose-400' : 'text-sky-300'}`}>${port.isUsed ? `${pct}%` : '—'}</span>
                                  </div>

                                  ${!port.isBackupPort && port.globalPathIndex >= 0 ? html`
                                    <div className=${`flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-slate-800/80 ${isSelectedPort ? 'flex' : 'hidden group-hover:flex'}`}>
                                      <span className="text-[10px] text-slate-400 font-mono">
                                        ${isActivelyDrawingPort ? '● Modifying on canvas' : 'Click to modify port'}
                                      </span>
                                      <div className="flex items-center gap-1">
                                        <button
                                          onClick=${(e) => {
                                            e.stopPropagation();
                                            selectAndModifyPort('data', port.globalPathIndex, false);
                                          }}
                                          className="px-2 py-0.5 rounded bg-sky-500/20 border border-sky-500/40 hover:bg-sky-500/30 text-[10px] font-bold text-sky-300"
                                        >${isActivelyDrawingPort ? 'Modifying' : '✏️ Modify'}</button>
                                        <button
                                          onClick=${(e) => {
                                            e.stopPropagation();
                                            clearSelectedPortOnly('data', port.globalPathIndex);
                                          }}
                                          className="px-2 py-0.5 rounded bg-amber-500/15 border border-amber-500/35 hover:bg-amber-500/25 text-[10px] font-bold text-amber-300"
                                          title="Clear ONLY this port and redraw it"
                                        >↺ Redraw</button>
                                      </div>
                                    </div>
                                  ` : null}
                                </div>
                              `;
                            })}
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                </div>
              ` : html`
                <!-- Power & 3-Phase Summary Card (Shown when Power Distribution tab is active) -->
                <div className="bg-[#0f192c] border border-slate-800/90 rounded-xl p-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">3. 3-Phase Load Balance</span>
                    <span className="text-xs font-mono font-bold text-amber-400">${(totals.totalW / 1000).toFixed(2)} kW · ${totals.totalAmps.toFixed(1)}A</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    ${phaseAllocation.map((ph) => html`
                      <div key=${ph.name} className="bg-[#08101f] border border-slate-800 rounded-lg p-2.5 text-center">
                        <div className="text-[10px] font-bold text-amber-400">${ph.name} (${ph.circuits}c)</div>
                        <div className="text-sm font-black text-white mt-0.5">${ph.amps.toFixed(1)} A</div>
                        <div className="text-[10px] font-mono text-slate-400">${(ph.watts / 1000).toFixed(2)} kW</div>
                      </div>
                    `)}
                  </div>
                </div>

                <!-- Power Circuits List (Interactive: Click any Circuit to Select & Modify!) -->
                <div className="bg-[#0f192c] border border-slate-800/90 rounded-xl p-3.5 space-y-3 flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">4. Power Circuits (${activePowerPathsCount})</span>
                      <div className="text-[10px] text-slate-400 mt-0.5">Click any circuit to select & modify it</div>
                    </div>
                    <span className="text-[11px] font-mono text-slate-400">${config.circuitAmps}A Breaker</span>
                  </div>

                  <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                    ${powerPaths.map((circuit, idx) => {
                      const cTiles = Array.isArray(circuit) ? circuit.length : 0;
                      const circuitAmpsUsed = cTiles * powerTileAmps;
                      const loadPct = Math.round((circuitAmpsUsed / config.circuitAmps) * 100);
                      const isOver = circuitAmpsUsed > effectiveBreakerAmpsLimit;
                      const cColor = POWER_PALETTE[idx % POWER_PALETTE.length];
                      const isSelectedCircuit = idx === selectedPowerCircuitIdx;
                      const isActivelyDrawingCircuit = isSelectedCircuit && drawMode === 'power';
                      return html`
                        <div
                          key=${`pwr-circuit-${idx}`}
                          onClick=${() => selectAndModifyPort('power', idx, false)}
                          className=${`group rounded-lg px-2.5 py-2 text-xs border transition-all cursor-pointer ${
                            isSelectedCircuit
                              ? 'bg-amber-500/15 border-amber-400/70 shadow-sm'
                              : 'bg-[#08101f] border-slate-800/80 hover:border-slate-600'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style=${{ background: cColor }}></span>
                            <span className="font-mono font-bold text-white w-14">P${idx + 1} · L${(idx % 3) + 1}</span>
                            <div className="flex-1 bg-slate-900 rounded-full h-1.5 overflow-hidden">
                              <div className="h-full rounded-full" style=${{ width: `${Math.min(100, loadPct)}%`, background: isOver ? '#ef4444' : cColor }}></div>
                            </div>
                            <span className="font-mono text-[11px] text-slate-300 w-20 text-right">${cTiles}t · ${circuitAmpsUsed.toFixed(1)}A</span>
                            <span className=${`font-mono font-bold text-[11px] w-9 text-right ${isOver ? 'text-rose-400' : 'text-amber-300'}`}>${loadPct}%</span>
                          </div>
                          <div className=${`flex items-center justify-between gap-1.5 mt-1.5 pt-1.5 border-t border-slate-800/80 ${isSelectedCircuit ? 'flex' : 'hidden group-hover:flex'}`}>
                            <span className="text-[10px] text-slate-400 font-mono">
                              ${isActivelyDrawingCircuit ? '● Modifying on canvas' : 'Click to modify circuit'}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                onClick=${(e) => {
                                  e.stopPropagation();
                                  selectAndModifyPort('power', idx, false);
                                }}
                                className="px-2 py-0.5 rounded bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-[10px] font-bold text-amber-300"
                              >${isActivelyDrawingCircuit ? 'Modifying' : '✏️ Modify'}</button>
                              <button
                                onClick=${(e) => {
                                  e.stopPropagation();
                                  clearSelectedPortOnly('power', idx);
                                }}
                                className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/35 hover:bg-rose-500/25 text-[10px] font-bold text-rose-300"
                              >↺ Redraw</button>
                            </div>
                          </div>
                        </div>
                      `;
                    })}
                  </div>
                </div>
              `}
            </aside>
          </div>
        </div>
      `;
    };

    if (!container.__signalPatchingRoot) {
      container.__signalPatchingRoot = ReactDOMRef.createRoot(container);
    }
    container.__signalPatchingRoot.render(html`<${App} />`);
  }

  window.SignalPatchingPro = {
    mount: mountSignalPatchingPro
  };
})();

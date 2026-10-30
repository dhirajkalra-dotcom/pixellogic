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

    const PROCESSOR_DATABASE = [
      {
        id: 'mx6000-pro',
        name: 'NovaStar MX6000 Pro',
        ports: 40,
        maxPixels: 26000000,
        type: 'COEX 5G',
        linkGbps: 5,
        capacitySource: 'Output-card profile + model cap',
        outputCards: [
          { id: 'mx-4x10g-fiber', name: 'MX 4x10G Fiber Card', outputsPerCard: 4, linkGbps: 10, maxCards: 4, defaultCards: 4 },
          { id: 'mx-1x40g-fiber', name: 'MX 1x40G Fiber Card', outputsPerCard: 1, linkGbps: 40, maxCards: 4, defaultCards: 4, perPortMaxPixels: 2951200 }
        ]
      },
      {
        id: 'mx2000-pro',
        name: 'NovaStar MX2000 Pro',
        ports: 20,
        maxPixels: 10400000,
        type: 'COEX 5G',
        linkGbps: 5,
        capacitySource: 'Output-card profile + model cap',
        outputCards: [
          { id: 'mx-4x10g-fiber', name: 'MX 4x10G Fiber Card', outputsPerCard: 4, linkGbps: 10, maxCards: 2, defaultCards: 2 },
          { id: 'mx-1x40g-fiber', name: 'MX 1x40G Fiber Card', outputsPerCard: 1, linkGbps: 40, maxCards: 2, defaultCards: 2, perPortMaxPixels: 2951200 }
        ]
      },
      { id: 'mx40-pro', name: 'NovaStar MX40 Pro', ports: 20, maxPixels: 10400000, type: 'COEX 1G', linkGbps: 1, capacitySource: 'Model + link capped', specNote: 'Ports/max load aligned to provided spec (20 ports, 10.4M max).' },
      { id: 'mx40', name: 'NovaStar MX40', ports: 6, maxPixels: null, type: 'COEX 1G', linkGbps: 1, capacitySource: 'Bandwidth-based (port count user-confirmed)', specNote: 'Using 6 ports as confirmed by user; max load pending official spec.' },
      { id: 'mx30', name: 'NovaStar MX30', ports: 10, maxPixels: 6500000, type: 'COEX 1G', linkGbps: 1, capacitySource: 'Model + link capped', specNote: 'Ports/max load aligned to provided spec (10 ports, 6.5M max).' },
      { id: 'mx20', name: 'NovaStar MX20', ports: 6, maxPixels: 3900000, type: 'COEX 1G', linkGbps: 1, capacitySource: 'Model + link capped', specNote: 'Ports/max load aligned to provided spec (6 ports, 3.9M max).' },
      { id: 'ku20', name: 'NovaStar KU20', ports: 6, maxPixels: 3900000, type: 'COEX 1G', linkGbps: 1, capacitySource: 'Model + link capped', specNote: 'Ports/max load aligned to provided spec (6 ports, 3.9M max).' },
      { id: 'cx40-pro', name: 'NovaStar CX40 Pro', ports: 4, maxPixels: 9000000, perPortMaxPixels: 2951200, type: 'COEX 5G', linkGbps: 5, capacitySource: 'Per-port spec override + model cap', specNote: 'Aligned to provided spec: 9.0M total load, 8bit@60Hz per-port cap â‰ˆ 2,951,200 px.' },
      { id: 'mx30-pro', name: 'NovaStar MX30 Pro', ports: 8, maxPixels: 5200000, type: 'COEX 1G', linkGbps: 1, capacitySource: 'Model + link capped' },
      { id: 'mx20-pro', name: 'NovaStar MX20 Pro', ports: 4, maxPixels: 2600000, type: 'COEX 1G', linkGbps: 1, capacitySource: 'Model + link capped' },
      { id: 'coex-1g-generic', name: 'COEX 1G Controller (Generic)', ports: 8, maxPixels: null, type: 'COEX 1G', linkGbps: 1, capacitySource: 'Bandwidth-based (generic)' },
      { id: 'coex-5g-generic', name: 'COEX 5G Controller (Generic)', ports: 8, maxPixels: null, type: 'COEX 5G', linkGbps: 5, capacitySource: 'Bandwidth-based (generic)' },
      { id: 'h9', name: 'H9 (Modular Platform)', ports: 16, maxPixels: 13000000, type: 'Modular', linkGbps: 1 },
      { id: 'vx16s', name: 'NovaStar VX16s', ports: 16, maxPixels: 10400000, type: 'VX', linkGbps: 1 },
      { id: 'vx1000', name: 'NovaStar VX1000', ports: 10, maxPixels: 6500000, type: 'VX', linkGbps: 1 },
      { id: 'vx600', name: 'NovaStar VX600', ports: 6, maxPixels: 3900000, type: 'VX', linkGbps: 1 },
      {
        id: 'mctrl4k',
        name: 'NovaStar MCTRL4K',
        ports: 16,
        maxPixels: 8847360,
        type: 'Legacy',
        linkGbps: 1,
        perPortMaxPixelsByBit: {
          8: 650000,
          10: 320000,
          12: 320000
        },
        capacitySource: 'Bit-depth per-port spec + model total cap'
      },
      { id: 'mctrl-r5', name: 'NovaStar MCTRL R5', ports: 8, maxPixels: 4147200, type: 'Legacy', linkGbps: 1 },
      { id: 'mctrl700', name: 'NovaStar MCTRL700', ports: 6, maxPixels: 2304000, type: 'Legacy', linkGbps: 1 },
      { id: 'mctrl600', name: 'NovaStar MCTRL600', ports: 6, maxPixels: 2304000, type: 'Legacy', linkGbps: 1 },
      { id: 'mctrl660', name: 'NovaStar MCTRL660', ports: 6, maxPixels: 2304000, type: 'Legacy', linkGbps: 1 },
      { id: 'mctrl660-pro', name: 'NovaStar MCTRL660 Pro', ports: 6, maxPixels: 2304000, type: 'Legacy', linkGbps: 1 }
    ].map((processor) => {
      const ports = Math.max(1, Number(processor.ports) || 1);
      const maxPixelsRaw = Number(processor.maxPixels);
      const hasModelPixels = Number.isFinite(maxPixelsRaw) && maxPixelsRaw > 0;
      const explicitPerPortRaw = Number(processor.perPortMaxPixels);
      const hasExplicitPerPort = Number.isFinite(explicitPerPortRaw) && explicitPerPortRaw > 0;
      return {
        ...processor,
        perPortMaxPixels: hasExplicitPerPort ? Math.floor(explicitPerPortRaw) : (hasModelPixels ? Math.floor(maxPixelsRaw / ports) : null)
      };
    });

    const PATTERNS = [
      { id: 'v-snake', name: 'Vertical Snake' },
      { id: 'h-snake', name: 'Horizontal Snake' },
      { id: 'v-zigzag', name: 'Vertical ZigZag' },
      { id: 'h-zigzag', name: 'Horizontal ZigZag' }
    ];

    const PORT_PALETTE = [
      '#2e86de', '#ff9f43', '#1dd1a1', '#ee5253', '#feca57',
      '#5f27cd', '#48dbfb', '#ff6b6b', '#00d2d3', '#54a0ff',
      '#00d2d3', '#576574', '#222f3e', '#10ac84', '#0abde3'
    ];

    const DEFAULT_SCREEN_CONFIG = {
      cols: 20,
      rows: 12,
      modW: 128,
      modH: 128,
      physW: 500,
      physH: 500,
      maxWatts: 160,
      weight: 7.5,
      hz: 60,
      bit: 8,
      dataPattern: 'v-snake',
      powerPattern: 'v-snake',
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
      const [screens, setScreens] = useState([{ id: 1, name: 'Main Wall', ...DEFAULT_SCREEN_CONFIG }]);
      const [activeIndex, setActiveIndex] = useState(0);
      const config = screens[activeIndex] || screens[0];

      const updateConfig = (updates) => {
        setScreens((prev) => {
          const next = [...prev];
          next[activeIndex] = { ...next[activeIndex], ...updates };
          return next;
        });
      };

      const addScreen = () => {
        setScreens((prev) => {
          const newId = Math.max(...prev.map((s) => s.id), 0) + 1;
          const next = [...prev, { ...DEFAULT_SCREEN_CONFIG, id: newId, name: `Screen ${newId}` }];
          setActiveIndex(next.length - 1);
          return next;
        });
      };

      const removeScreen = (idx) => {
        setScreens((prev) => {
          if (prev.length <= 1) return prev;
          const next = prev.filter((_, i) => i !== idx);
          setActiveIndex((current) => Math.min(current, next.length - 1));
          return next;
        });
      };

      const [zoom, setZoom] = useState(0.8);
      const [showPower, setShowPower] = useState(false);
      const [showData, setShowData] = useState(true);
      const [autoFitView, setAutoFitView] = useState(true);
      const [fitZoom, setFitZoom] = useState(1);
      const [panX, setPanX] = useState(0);
      const [panY, setPanY] = useState(0);
      const [isPanning, setIsPanning] = useState(false);
      const panRef = useRef({ active: false, startX: 0, startY: 0, originX: 0, originY: 0 });
      const drawPointerRef = useRef({ active: false, type: null });
      const viewportRef = useRef(null);
      const [drawMode, setDrawMode] = useState(null);
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
            modelPerPortOverride: Number.isFinite(Number(selectedProcessor.perPortMaxPixels)) ? Number(selectedProcessor.perPortMaxPixels) : null,
            modelPerPortByBitOverride: selectedProcessor.perPortMaxPixelsByBit || null,
            profileLabel: 'Standard outputs'
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
          modelPerPortOverride: Number.isFinite(Number(selectedCard.perPortMaxPixels)) ? Number(selectedCard.perPortMaxPixels) : (Number.isFinite(Number(selectedProcessor.perPortMaxPixels)) ? Number(selectedProcessor.perPortMaxPixels) : null),
          modelPerPortByBitOverride: selectedCard.perPortMaxPixelsByBit || selectedProcessor.perPortMaxPixelsByBit || null,
          profileLabel: `${selectedCard.name} x${cardsUsed}`
        };
      }, [config.selectedProcessor, config.selectedOutputCardId, config.outputCardCount]);

      const totals = useMemo(() => {
        const { cols, rows, modW, modH, hz, bit, maxWatts, weight, physW, physH } = config;
        const totalCabs = cols * rows;
        const totalPxWidth = cols * modW;
        const totalPxHeight = rows * modH;
        const totalPx = totalCabs * modW * modH;
        const totalWidthM = (cols * (physW || 500)) / 1000;
        const totalHeightM = (rows * (physH || 500)) / 1000;
        const totalW = totalCabs * maxWatts;
        const totalWeight = totalCabs * weight;

        const selectedProcessor = config.selectedProcessor || PROCESSOR_DATABASE[0];
        const linkGbps = effectiveOutputProfile.linkGbps;
        const portsOnProcessor = Math.max(1, Number(effectiveOutputProfile.effectivePorts) || 1);

        const baseBandwidth = (1000000000 * linkGbps) * 0.94;
        const bitsPerPixel = bit * 3;
        const bandwidthMaxPixelsPerPort = Math.floor(baseBandwidth / (hz * bitsPerPixel));
        const perBitTable = effectiveOutputProfile.modelPerPortByBitOverride || null;
        const perBitOverrideRaw = perBitTable ? Number(perBitTable[bit]) : NaN;
        const explicitPerPort = Number.isFinite(perBitOverrideRaw) && perBitOverrideRaw > 0
          ? perBitOverrideRaw
          : Number(effectiveOutputProfile.modelPerPortOverride);
        const derivedPerPort = Number(selectedProcessor.maxPixels) / portsOnProcessor;
        const modelPerPortMaxPixels = Number.isFinite(explicitPerPort) && explicitPerPort > 0
          ? Math.floor(explicitPerPort)
          : ((Number.isFinite(derivedPerPort) && derivedPerPort > 0) ? Math.floor(derivedPerPort) : null);
        const maxPixelsPerPort = modelPerPortMaxPixels
          ? Math.min(bandwidthMaxPixelsPerPort, modelPerPortMaxPixels)
          : bandwidthMaxPixelsPerPort;
        const modelControllerMaxPixelsRaw = Number(selectedProcessor.maxPixels);
        const modelControllerMaxPixels = Number.isFinite(modelControllerMaxPixelsRaw) && modelControllerMaxPixelsRaw > 0
          ? Math.floor(modelControllerMaxPixelsRaw)
          : null;
        const perPortAggregatePixels = Math.floor(maxPixelsPerPort * portsOnProcessor);
        const maxPixelsPerController = modelControllerMaxPixels
          ? Math.min(modelControllerMaxPixels, perPortAggregatePixels)
          : perPortAggregatePixels;
        const bandwidthCabsPerPortLimit = Math.floor(maxPixelsPerPort / (modW * modH));
        const isHighResNineCap =
          (Number(modW) === 256 && Number(modH) === 256) ||
          (Number(modW) === 320 && Number(modH) === 320);
        const hardCapCabsPerPort = isHighResNineCap ? 9 : Number.POSITIVE_INFINITY;
        const cabsPerPortLimit = Math.max(1, Math.min(bandwidthCabsPerPortLimit, hardCapCabsPerPort));

        return {
          totalCabs,
          totalPx,
          totalPxWidth,
          totalPxHeight,
          totalW,
          totalWeight,
          maxPixelsPerController,
          cabsPerPortLimit,
          hardCapCabsPerPort: Number.isFinite(hardCapCabsPerPort) ? hardCapCabsPerPort : null,
          linkGbps,
          modelPerPortMaxPixels,
          effectivePorts: portsOnProcessor,
          outputProfileLabel: effectiveOutputProfile.profileLabel,
          totalWidthM,
          totalHeightM,
          maxPixelsPerPort
        };
      }, [config, effectiveOutputProfile]);

      const effectiveDataLimit = useMemo(() => {
        if (config.isAutoDataLimit) return totals.cabsPerPortLimit;
        return Math.min(config.maxDataMods, totals.cabsPerPortLimit);
      }, [config.isAutoDataLimit, config.maxDataMods, totals.cabsPerPortLimit]);

      const powerTileAmps = config.tileType === 'half-one' ? 2.02 : 1;
      const effectivePowerLimit = useMemo(() => {
        const maxByAmps = Math.max(1, Math.floor(config.circuitAmps / powerTileAmps));
        if (config.isAutoPowerLimit) return maxByAmps;
        return Math.min(Math.max(1, config.maxPowerMods), maxByAmps);
      }, [config.tileType, config.circuitAmps, config.isAutoPowerLimit, config.maxPowerMods, powerTileAmps]);

      const generatePath = useCallback((type, limit, options = {}) => {
        const points = [];
        const lines = [];
        const lineAwarePacking = !!options.lineAwarePacking;
        const { cols, rows } = config;
        if (!limit || limit < 1) return [];

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

        switch (type) {
          case 'v-snake':
            for (let c = 0; c < cols; c++) {
              const isReverse = c % 2 !== 0;
              const rOrder = isReverse ? Array.from({ length: rows }, (_, i) => rows - 1 - i) : Array.from({ length: rows }, (_, i) => i);
              const line = rOrder.map((r) => ({ c, r }));
              lines.push(line);
              line.forEach((pt) => points.push(pt));
            }
            break;
          case 'h-snake':
            for (let r = 0; r < rows; r++) {
              const isReverse = r % 2 !== 0;
              const cOrder = isReverse ? Array.from({ length: cols }, (_, i) => cols - 1 - i) : Array.from({ length: cols }, (_, i) => i);
              const line = cOrder.map((c) => ({ c, r }));
              lines.push(line);
              line.forEach((pt) => points.push(pt));
            }
            break;
          case 'v-zigzag':
            for (let c = 0; c < cols; c++) {
              const line = [];
              for (let r = 0; r < rows; r++) line.push({ c, r });
              lines.push(line);
              line.forEach((pt) => points.push(pt));
            }
            break;
          case 'h-zigzag':
            for (let r = 0; r < rows; r++) {
              const line = [];
              for (let c = 0; c < cols; c++) line.push({ c, r });
              lines.push(line);
              line.forEach((pt) => points.push(pt));
            }
            break;
          default:
            break;
        }

        if (lineAwarePacking && lines.length) {
          const circuits = [];
          let current = [];

          lines.forEach((line) => {
            if (!line || !line.length) return;

            if (line.length > limit) {
              if (current.length) {
                circuits.push(current);
                current = [];
              }
              splitBalanced(line, limit).forEach((chunk) => circuits.push(chunk));
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

        return splitBalanced(points, limit);
      }, [config]);

      const automaticDataPaths = useMemo(
        () => generatePath(config.dataPattern, effectiveDataLimit, {
          lineAwarePacking: !totals.hardCapCabsPerPort
        }),
        [generatePath, config.dataPattern, effectiveDataLimit, totals.hardCapCabsPerPort]
      );
      const automaticPowerPaths = useMemo(() => generatePath(config.powerPattern, effectivePowerLimit), [generatePath, config.powerPattern, effectivePowerLimit]);
      const manualDataPaths = Array.isArray(config.manualDataPaths) ? config.manualDataPaths : [];
      const manualPowerPaths = Array.isArray(config.manualPowerPaths) ? config.manualPowerPaths : [];
      const dataPaths = config.dataRoutingMode === 'manual' ? manualDataPaths.filter((path) => path.length) : automaticDataPaths;
      const powerPaths = config.powerRoutingMode === 'manual' ? manualPowerPaths.filter((path) => path.length) : automaticPowerPaths;

      const updateManualPaths = (type, updater) => {
        const property = type === 'data' ? 'manualDataPaths' : 'manualPowerPaths';
        const undoProperty = type === 'data' ? 'manualDataUndo' : 'manualPowerUndo';
        const redoProperty = type === 'data' ? 'manualDataRedo' : 'manualPowerRedo';
        setScreens((prev) => {
          const next = [...prev];
          const current = next[activeIndex];
          const paths = Array.isArray(current[property]) ? current[property].map((path) => [...path]) : [];
          const updatedPaths = updater(paths);
          if (JSON.stringify(updatedPaths) === JSON.stringify(current[property] || [])) return prev;
          const undoStack = Array.isArray(current[undoProperty]) ? current[undoProperty] : [];
          next[activeIndex] = {
            ...current,
            [property]: updatedPaths,
            [undoProperty]: [...undoStack, current[property] || []].slice(-100),
            [redoProperty]: []
          };
          return next;
        });
      };

      const appendManualPoint = (type, c, r) => {
        updateManualPaths(type, (paths) => {
          const pointKey = `${c}:${r}`;
          if (paths.some((path) => path.some((point) => `${point.c}:${point.r}` === pointKey))) return paths;
          if (!paths.length || paths[paths.length - 1].length === 0) {
            if (!paths.length) paths.push([]);
          }
          const activePath = paths[paths.length - 1];
          const previous = activePath[activePath.length - 1];
          if (previous && (Math.abs(previous.c - c) + Math.abs(previous.r - r) !== 1)) return paths;
          activePath.push({ c, r });
          return paths;
        });
      };

      const beginManualDrawing = (type) => {
        updateConfig({ [type === 'data' ? 'dataRoutingMode' : 'powerRoutingMode']: 'manual' });
        setDrawMode(type);
        if (type === 'data') setShowData(true);
        if (type === 'power') setShowPower(true);
      };

      const startNewManualPath = () => {
        if (!drawMode) return;
        updateManualPaths(drawMode, (paths) => {
          const next = paths.filter((path) => path.length);
          next.push([]);
          return next;
        });
      };

      const undoManualChange = () => {
        if (!drawMode) return;
        const property = drawMode === 'data' ? 'manualDataPaths' : 'manualPowerPaths';
        const undoProperty = drawMode === 'data' ? 'manualDataUndo' : 'manualPowerUndo';
        const redoProperty = drawMode === 'data' ? 'manualDataRedo' : 'manualPowerRedo';
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
        if (!drawMode) return;
        const property = drawMode === 'data' ? 'manualDataPaths' : 'manualPowerPaths';
        const undoProperty = drawMode === 'data' ? 'manualDataUndo' : 'manualPowerUndo';
        const redoProperty = drawMode === 'data' ? 'manualDataRedo' : 'manualPowerRedo';
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
        if (drawMode) updateManualPaths(drawMode, () => []);
      };

      const drawHistory = drawMode === 'data'
        ? { undo: config.manualDataUndo || [], redo: config.manualDataRedo || [] }
        : { undo: config.manualPowerUndo || [], redo: config.manualPowerRedo || [] };
      const activeDrawPaths = drawMode === 'data' ? manualDataPaths : manualPowerPaths;
      const activeDrawPath = activeDrawPaths.length ? activeDrawPaths[activeDrawPaths.length - 1] : [];
      const activeDrawTiles = activeDrawPath ? activeDrawPath.length : 0;
      const activeDrawLoad = drawMode === 'data'
        ? {
            value: activeDrawTiles * Math.max(1, Number(config.modW) || 1) * Math.max(1, Number(config.modH) || 1),
            limit: Math.max(1, Number(totals.maxPixelsPerPort) || 1),
            unit: 'px'
          }
        : {
            value: activeDrawTiles * powerTileAmps,
            limit: Math.max(1, Number(config.circuitAmps) || 1),
            unit: 'A'
          };
      const activeDrawPercent = Math.round((activeDrawLoad.value / activeDrawLoad.limit) * 100);
      const activeDrawOverload = activeDrawPercent > 100;
      const activeDrawPathIndex = Math.max(0, activeDrawPaths.length - 1);
      const drawPortsPerController = Math.max(1, Number(totals.effectivePorts) || 1);
      const activeDrawAssignment = drawMode === 'data'
        ? `C${Math.floor(activeDrawPathIndex / drawPortsPerController) + 1}-P${(activeDrawPathIndex % drawPortsPerController) + 1}`
        : `Circuit ${activeDrawPathIndex + 1}`;
      const nextDrawPathIndex = activeDrawPathIndex + 1;
      const nextDrawAssignment = drawMode === 'data'
        ? `C${Math.floor(nextDrawPathIndex / drawPortsPerController) + 1}-P${(nextDrawPathIndex % drawPortsPerController) + 1}`
        : `Circuit ${nextDrawPathIndex + 1}`;

      const controllerAllocation = useMemo(() => {
        const portsPerController = Math.max(1, Number(totals.effectivePorts) || 1);
        const requiredByPorts = Math.max(1, Math.ceil(dataPaths.length / portsPerController));
        const controllerPixelCap = Math.max(1, Number(totals.maxPixelsPerController) || 1);
        const requiredByTotalPixels = Math.max(1, Math.ceil((Number(totals.totalPx) || 0) / controllerPixelCap));
        const requiredControllers = Math.max(requiredByPorts, requiredByTotalPixels);
        const plannedControllers = autoControllers ? requiredControllers : Math.max(1, parseInt(controllerCount, 10) || 1);
        const modulePixels = Math.max(1, Number(config.modW) || 1) * Math.max(1, Number(config.modH) || 1);
        const perPortPixelLimit = Math.max(1, Number(totals.maxPixelsPerPort) || 1);
        const assignments = dataPaths.map((_, pathIndex) => {
          const controllerIndex = Math.floor(pathIndex / portsPerController);
          const portIndex = (pathIndex % portsPerController) + 1;
          const assigned = controllerIndex < plannedControllers;
          return {
            pathIndex,
            controllerIndex,
            portIndex,
            assigned
          };
        });

        const controllers = Array.from({ length: plannedControllers }, (_, i) => {
          const portLoads = Array.from({ length: portsPerController }, (_, portOffset) => {
            const globalPathIndex = (i * portsPerController) + portOffset;
            const assignedPath = dataPaths[globalPathIndex] || null;
            const modules = assignedPath ? assignedPath.length : 0;
            const portPixels = modules * modulePixels;
            const loadPercent = assignedPath ? Math.min(999, (portPixels / perPortPixelLimit) * 100) : 0;
            return {
              portIndex: portOffset + 1,
              isUsed: !!assignedPath,
              modules,
              portPixels,
              loadPercent
            };
          });

          const usedPorts = portLoads.filter((p) => p.isUsed).length;
          const activeLoads = portLoads.filter((p) => p.isUsed).map((p) => p.loadPercent);
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

        const unassignedCircuits = assignments.filter((a) => !a.assigned).length;
        return {
          portsPerController,
          requiredControllers,
          plannedControllers,
          usedControllers: Math.min(plannedControllers, requiredControllers),
          assignments,
          controllers,
          unassignedCircuits
        };
      }, [dataPaths, config.modW, config.modH, totals.maxPixelsPerPort, totals.effectivePorts, totals.maxPixelsPerController, totals.totalPx, autoControllers, controllerCount]);

      const perPortLimitLabel = useMemo(() => {
        const limit = Math.max(0, Number(totals.maxPixelsPerPort) || 0);
        if (limit >= 1000000) return `${(limit / 1000000).toFixed(2)}M`;
        if (limit >= 1000) return `${(limit / 1000).toFixed(1)}k`;
        return `${limit}`;
      }, [totals.maxPixelsPerPort]);

      const capacityFormulaLabel = useMemo(() => {
        const linkText = `${Number(totals.linkGbps) || 1}G`;
        const modelCap = Number(totals.modelPerPortMaxPixels) || 0;
        const modelCapText = modelCap > 0 ? `${modelCap.toLocaleString()} px` : 'N/A';
        const highResCapText = totals.hardCapCabsPerPort ? `, High-res cap: ${totals.hardCapCabsPerPort} cabs` : '';
        const outputProfileText = totals.outputProfileLabel ? `, Output profile: ${totals.outputProfileLabel}` : '';
        return `Per-port capacity = min(Bandwidth(${linkText}), Model cap(${modelCapText}))${highResCapText}${outputProfileText}`;
      }, [totals.linkGbps, totals.modelPerPortMaxPixels, totals.hardCapCabsPerPort, totals.outputProfileLabel]);

      const routingHealth = useMemo(() => {
        const usedPorts = controllerAllocation.controllers.flatMap((controller) => controller.portLoads).filter((port) => port.isUsed);
        const peakDataLoad = usedPorts.length ? Math.max(...usedPorts.map((port) => port.loadPercent)) : 0;
        const peakPowerLoad = powerPaths.length
          ? Math.max(...powerPaths.map((circuit) => ((circuit.length * powerTileAmps) / config.circuitAmps) * 100))
          : 0;
        const hasWarning = controllerAllocation.unassignedCircuits > 0 || peakDataLoad > 95 || peakPowerLoad > 100;
        return {
          peakDataLoad,
          peakPowerLoad,
          label: hasWarning ? 'Review required' : 'System nominal',
          tone: hasWarning ? '#fb7185' : '#4ade80'
        };
      }, [controllerAllocation, powerPaths, powerTileAmps, config.circuitAmps]);

      const panelRouteIndex = useMemo(() => {
        const routeByPanel = new Map();
        dataPaths.forEach((circuit, circuitIndex) => {
          circuit.forEach((point) => routeByPanel.set(`${point.c}:${point.r}`, circuitIndex));
        });
        return routeByPanel;
      }, [dataPaths]);

      const powerPanelSet = useMemo(() => {
        const panels = new Set();
        powerPaths.forEach((circuit) => circuit.forEach((point) => panels.add(`${point.c}:${point.r}`)));
        return panels;
      }, [powerPaths]);

      const cabSize = 50;
      const padding = 60;
      const canvasW = config.cols * cabSize + (padding * 2);
      const canvasH = config.rows * cabSize + (padding * 2);

      useEffect(() => {
        setPanX(0);
        setPanY(0);
        const viewport = viewportRef.current;
        if (!viewport) return;

        const recalcFit = () => {
          const availableW = Math.max(1, viewport.clientWidth - 60);
          const availableH = Math.max(1, viewport.clientHeight - (drawMode ? 235 : 152));
          const nextFit = Math.max(0.05, Math.min(1, Math.min(availableW / canvasW, availableH / canvasH)));
          setFitZoom(nextFit);
        };

        recalcFit();
        const observer = new ResizeObserver(recalcFit);
        observer.observe(viewport);
        return () => observer.disconnect();
      }, [canvasW, canvasH, drawMode]);

      const effectiveZoom = autoFitView ? fitZoom : zoom;
      const drawToolbarTop = 132 + (canvasH * effectiveZoom) + (autoFitView ? 0 : panY) + 12;

      const renderPath = (circuits, isPower) => circuits.map((circuit, cIdx) => {
        let d = '';
        const assignment = controllerAllocation.assignments[cIdx];
        const isUnassigned = !isPower && assignment && !assignment.assigned;
        const portColor = isPower ? '#ff4757' : (isUnassigned ? '#ef4444' : PORT_PALETTE[cIdx % PORT_PALETTE.length]);
        const offset = isPower ? 3 : -3;

        circuit.forEach((pt, pIdx) => {
          const x = padding + (pt.c * cabSize) + (cabSize / 2) + offset;
          const y = padding + (pt.r * cabSize) + (cabSize / 2) + offset;
          if (pIdx === 0) d += `M ${x} ${y}`;
          else d += ` L ${x} ${y}`;
        });

        const startX = padding + (circuit[0].c * cabSize) + (cabSize / 2) + offset;
        const startY = padding + (circuit[0].r * cabSize) + (cabSize / 2) + offset;

        return html`
          <g key=${`${isPower ? 'p' : 'd'}-${cIdx}`} style=${{ pointerEvents: 'none' }}>
            <path d=${d} fill="none" stroke=${portColor} strokeWidth="6" strokeLinejoin="round" strokeLinecap="round" opacity="0.15" />
            <path className=${isPower ? 'pl-route pl-route-power' : 'pl-route pl-route-data'} d=${d} fill="none" stroke=${portColor} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
            <circle cx=${startX} cy=${startY} r="5" fill=${portColor} opacity="0.25" />
            <circle className="pl-route-origin" cx=${startX} cy=${startY} r="3.5" fill=${portColor} />
            ${!isPower ? html`<text x=${padding + (circuit[0].c * cabSize)} y=${padding + (circuit[0].r * cabSize) - 8} fill=${portColor} fontSize="10" fontWeight="bold" style=${{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>${assignment && assignment.assigned ? `C${assignment.controllerIndex + 1}-P${assignment.portIndex}` : `UNASSIGNED-${cIdx + 1}`}</text>` : null}
          </g>
        `;
      });

      const formatNumber = (value) => Number(value || 0).toLocaleString();
      const formatPercent = (value) => `${Math.round(Number(value) || 0)}%`;
      const escapeHtml = (value) => String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');

      const getExportSnapshot = () => {
        const controllers = controllerAllocation.controllers.map((ctrl) => {
          const portRows = ctrl.portLoads.map((port) => ({
            controller: ctrl.index + 1,
            port: port.portIndex,
            panels: port.modules,
            loadPercent: port.loadPercent,
            pixels: port.portPixels,
            status: port.isUsed ? (port.loadPercent > 95 ? 'OVERLOAD' : 'OK') : 'FREE'
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
          portsUsed: dataPaths.length,
          perPortLimit: `${perPortLimitLabel} px`,
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
          ctx.fillText(`${report.projectName} â€¢ LED Patching Report`, leftPad, y);

          y += 22;
          ctx.fillStyle = '#94a3b8';
          ctx.font = '14px Segoe UI';
          ctx.fillText(`Generated: ${report.timestamp}`, leftPad, y);

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
              `Controller ${controller.index} â€¢ Ports ${controller.usedPorts}/${controller.totalPorts} â€¢ Avg Load ${formatPercent(controller.avgLoadPercent)}`,
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

        // â”€â”€ Off-screen canvas renderer (no React state manipulation) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        // Draws the same data/power serpentine paths as the on-screen SVG
        const renderDiagramCanvas = (mode, scale = 2) => {
          const cap = document.createElement('canvas');
          cap.width = Math.round(canvasW * scale);
          cap.height = Math.round(canvasH * scale);
          const ctx = cap.getContext('2d');
          if (!ctx) return null;
          ctx.scale(scale, scale);

          // Dark canvas background
          ctx.fillStyle = '#050505';
          ctx.fillRect(0, 0, canvasW, canvasH);

          // Cabinet grid
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

          // Draw circuit paths
          const drawPaths2D = (paths, isPower) => {
            paths.forEach((circuit, cIdx) => {
              if (!circuit || !circuit.length) return;
              const assignment = controllerAllocation.assignments[cIdx];
              const isUnassigned = !isPower && assignment && !assignment.assigned;
              const portColor = isPower
                ? '#ff4757'
                : (isUnassigned ? '#ef4444' : PORT_PALETTE[cIdx % PORT_PALETTE.length]);
              const offset = isPower ? 3 : -3;

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

              // Start dot
              ctx.globalAlpha = 1;
              ctx.fillStyle = portColor;
              ctx.beginPath();
              const sx = padding + circuit[0].c * cabSize + cabSize / 2 + offset;
              const sy = padding + circuit[0].r * cabSize + cabSize / 2 + offset;
              ctx.arc(sx, sy, 4, 0, Math.PI * 2);
              ctx.fill();

              // Label
              ctx.fillStyle = portColor;
              ctx.font = 'bold 10px sans-serif';
              const lx = padding + circuit[0].c * cabSize;
              const ly = padding + circuit[0].r * cabSize - 8;
              const label = isPower
                ? `C${cIdx + 1}`
                : (assignment && assignment.assigned ? `C${assignment.controllerIndex + 1}-P${assignment.portIndex}` : `UNASSIGNED-${cIdx + 1}`);
              ctx.fillText(label, lx, ly);

              ctx.globalAlpha = 1;
            });
          };

          if (mode === 'data' || mode === 'both') drawPaths2D(dataPaths, false);
          if (mode === 'power' || mode === 'both') drawPaths2D(powerPaths, true);

          return cap.toDataURL('image/png');
        };

        try {
          // Pre-render both diagrams synchronously (Canvas 2D, no async needed)
          const dataDiagramPng = renderDiagramCanvas('data', 2);
          const powerDiagramPng = renderDiagramCanvas('power', 2);

          const { jsPDF } = jspdfUmd;
          const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
          const PW = doc.internal.pageSize.getWidth();   // ~841.89
          const PH = doc.internal.pageSize.getHeight();  // ~595.28
          const M = 28;
          const BG = [7, 10, 22]; // dark navy page background
          const dateStr = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

          // â”€â”€ shared helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          const CIRC_COLORS = ['#ef4444','#f59e0b','#eab308','#22c55e','#14b8a6','#06b6d4','#3b82f6','#6366f1','#8b5cf6','#ec4899'];

          // Shared: place a diagram PNG + table side-by-side
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

          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          // PAGE 1 - DATA / SIGNAL PATCHING
          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          fillPageBg();
          drawHeader(
            `LED Patching - Data Routing  |  ${config.name || 'Screen'}`,
            `${report.processor}  |  ${report.controllersUsed} controllers  |  ${report.portsUsed} data paths  |  ${report.perPortLimit}/port  |  ${config.hz}Hz  ${config.bit}-bit  |  ${report.resolution}  |  ${report.screenSize}`
          );

          drawKpiStrip([
            { l: 'Processor', v: String(config.selectedProcessor.name || '-').split(' ').slice(-2).join(' '), c: [0, 215, 145] },
            { l: 'Controllers', v: report.controllersUsed, c: [80, 175, 255] },
            { l: 'Ports Used', v: String(report.portsUsed), c: [160, 100, 255] },
            { l: 'Total Panels', v: formatNumber(totals.totalCabs), c: [255, 175, 30] },
            { l: 'Port Limit', v: report.perPortLimit, c: [80, 215, 175] },
            { l: 'Resolution', v: `${totals.totalPxWidth}x${totals.totalPxHeight}`, c: [220, 120, 80] },
          ]);

          let y1 = 72;
          const tColW1 = (tableW) => [tableW*0.09, tableW*0.09, tableW*0.18, tableW*0.18, tableW*0.28, tableW*0.18];
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

          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          // PAGE 2 - POWER PATCHING  (completely separate page)
          // â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
          doc.addPage();
          fillPageBg();

          const totalWatts = totals.totalW;
          const totalKW = totalWatts / 1000;
          const totalAmps = totals.totalCabs * powerTileAmps;
          const numCircuits = powerPaths.length;
          const wattsPerCab = config.maxWatts;
          const circAmps = config.circuitAmps;

          drawHeader(
            `LED Patching - Power Distribution  |  ${config.name || 'Screen'}`,
            `${wattsPerCab}W / cabinet  |  ${circAmps}A breaker  |  ${numCircuits} circuit${numCircuits !== 1 ? 's' : ''}  |  ${powerTileAmps}A / tile  |  Tile type: ${config.tileType}  |  Pattern: ${config.powerPattern}`
          );

          drawKpiStrip([
            { l: 'Total Panels', v: String(totals.totalCabs), c: [0, 215, 140] },
            { l: 'W / Panel', v: `${wattsPerCab}W`, c: [255, 160, 40] },
            { l: 'Total Power', v: `${totalKW.toFixed(2)} kW`, c: [255, 80, 80] },
            { l: 'Total Current', v: `${totalAmps.toFixed(1)}A`, c: [180, 80, 255] },
            { l: 'Circuits', v: String(numCircuits || '-'), c: [60, 175, 255] },
            { l: 'Breaker', v: `${circAmps}A`, c: [100, 215, 100] },
          ]);

          let y2 = 72;

          // â”€â”€ Power diagram (left) + per-circuit table (right) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          const circTableCols2 = (tw) => [
            { h: 'Circuit', w: tw * 0.12 }, { h: 'Panels', w: tw * 0.11 },
            { h: 'kW', w: tw * 0.14 }, { h: 'Amps', w: tw * 0.14 },
            { h: 'Load', w: tw * 0.12 }, { h: 'Col', w: tw * 0.12 },
            { h: 'Row', w: tw * 0.12 }, { h: 'Entry', w: tw * 0.13 }
          ];
          const circRows2 = powerPaths.map((circuit, ci) => {
            const nc = circuit.length;
            const circAmpsVal = nc * powerTileAmps;
            const overloaded = circAmpsVal > circAmps;
            const minC = Math.min(...circuit.map(p => p.c));
            const maxC2 = Math.max(...circuit.map(p => p.c));
            const minR = Math.min(...circuit.map(p => p.r));
            const maxR2 = Math.max(...circuit.map(p => p.r));
            const first = circuit[0];
            return {
              _dot: '#ff4757',
              _color: overloaded ? [255, 80, 80] : [200, 215, 230],
              cells: [
                `C${ci + 1}`, String(nc),
                `${(nc * wattsPerCab / 1000).toFixed(2)}kW`,
                `${circAmpsVal.toFixed(1)}A`,
                `${Math.round(circAmpsVal / circAmps * 100)}%`,
                `${minC + 1}-${maxC2 + 1}`,
                `${minR + 1}-${maxR2 + 1}`,
                `(${first.c + 1},${first.r + 1})`
              ]
            };
          });

          const tableXEst2 = M + maxDiaW + 10;
          const tableWEst2 = PW - M - tableXEst2;
          const dh2 = placeDiagramWithTable(
            powerDiagramPng, circRows2, circTableCols2(tableWEst2), y2,
            'Power Routing Diagram', [255, 80, 80],
            'Circuit Breakdown', [240, 140, 60]
          );
          y2 += dh2 + 12;

          hRule(y2); y2 += 10;

          // â”€â”€ Power specs table â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
          if (y2 < PH - M - 50) {
            secLabel('Power Specifications', M, y2, [100, 145, 255]);
            y2 += 13;
            const specs = [
              ['Tile Type', config.tileType, 'Amps per Tile', `${powerTileAmps}A`],
              ['Watts per Cabinet', `${wattsPerCab}W`, 'Breaker Rating', `${circAmps}A`],
              ['Total Panels', String(totals.totalCabs), 'Total Power', `${totalKW.toFixed(2)} kW (${totalWatts}W)`],
              ['Total Current', `${totalAmps.toFixed(1)}A`, 'Number of Circuits', `${numCircuits}`],
              ['Avg Panels/Circuit', numCircuits > 0 ? String(Math.round(totals.totalCabs / numCircuits)) : '-', 'Power Pattern', config.powerPattern],
              ['Wall Size (Physical)', `${totals.totalWidthM.toFixed(2)}m x ${totals.totalHeightM.toFixed(2)}m`, 'Panel Grid', `${config.cols} x ${config.rows}`],
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

          // footer
          doc.setFontSize(6.5); doc.setTextColor(60, 78, 105);
          doc.text(
            `Generated by Pixelogic | ${dateStr} | Power values at maximum rated wattage | Actual consumption may vary | Consult a qualified electrician`,
            M, PH - 10
          );

          doc.save(`Signal_Patching_${String(config.name || 'Screen').replace(/\s+/g, '_')}_${Date.now()}.pdf`);
        } catch (err) {
          console.warn('PDF export failed', err);
        }
      };

      return html`
        <div
          className="pl-patching-shell h-[calc(100vh-190px)] w-full text-gray-300 text-[13px] font-sans overflow-hidden select-none rounded-lg border border-white/[0.09]"
          style=${{ display: 'grid', gridTemplateColumns: 'clamp(292px, 25vw, 340px) minmax(0, 1fr) clamp(286px, 23vw, 320px)' }}
        >
          <style>${`
            .pl-patching-shell {
              background: #071018;
              box-shadow: 0 24px 80px rgba(0,0,0,.58), inset 0 1px rgba(255,255,255,.025);
              font-family: "Bahnschrift", "Segoe UI", sans-serif;
            }
            .pl-patching-shell input:focus, .pl-patching-shell select:focus {
              border-color: rgba(45,212,191,.5) !important;
              box-shadow: 0 0 0 2px rgba(45,212,191,.09), 0 8px 22px rgba(0,0,0,.16);
            }
            .pl-patching-shell input, .pl-patching-shell select { transition: border-color .16s ease, box-shadow .16s ease, background .16s ease; }
            .pl-route { stroke-dasharray: 9 5; animation: pl-signal-flow 1.15s linear infinite; }
            .pl-route-power { animation-duration: 1.65s; }
            .pl-route-origin { transform-box: fill-box; transform-origin: center; animation: pl-origin-pulse 1.8s ease-out infinite; }
            .pl-kpi { background: rgba(8,18,28,.86); box-shadow: 0 12px 32px rgba(0,0,0,.28), inset 0 1px rgba(255,255,255,.035); }
            .pl-kpi-strip { grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .pl-draw-toolbar { background: #07121b; box-shadow: 0 14px 34px rgba(0,0,0,.42), inset 0 1px rgba(255,255,255,.04); }
            .pl-draw-toolbar button { min-width: 42px; }
            .pl-live-meter { min-width: 148px; }
            .pl-draw-tile { cursor: crosshair; }
            .pl-draw-tile:hover > rect:first-child { stroke: #f8fafc; stroke-width: 1.5; }
            .pl-canvas-vignette { background: radial-gradient(circle at 50% 34%, rgba(20,184,166,.075), transparent 38%), linear-gradient(180deg, rgba(3,8,13,.12), rgba(3,8,13,.55)); }
            @keyframes pl-signal-flow { to { stroke-dashoffset: -28; } }
            @keyframes pl-origin-pulse { 0%, 100% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.8); opacity: .45; } }
            @media (prefers-reduced-motion: reduce) { .pl-route, .pl-route-origin { animation: none; } }
          `}</style>
          <aside className="bg-[#09141d] border-r border-white/[0.07] flex flex-col overflow-hidden z-20">
            <div className="shrink-0 px-4 py-3 border-b border-white/[0.07] bg-[#060d1a] flex items-center gap-3">
              <div className="w-8 h-8 rounded-md border border-[#2dd4bf]/25 bg-[#2dd4bf]/10 flex items-center justify-center shrink-0">
                <div className="w-3.5 h-3.5 border-l-2 border-b-2 border-[#2dd4bf]" style=${{ transform: 'rotate(-45deg)' }}></div>
              </div>
              <div>
                <div className="text-[12px] font-black uppercase tracking-[0.16em] text-white leading-none">Patch Workspace</div>
                <div className="text-[9px] font-mono uppercase tracking-[0.1em] mt-1" style=${{ color: 'rgba(45,212,191,0.58)' }}>Layout & routing inputs</div>
              </div>
            </div>
            <div className="shrink-0 px-3 py-2 bg-[#070e1d] border-b border-white/[0.06] flex gap-1.5 overflow-x-auto">
              ${screens.map((s, i) => html`
                <div key=${s.id} onClick=${() => setActiveIndex(i)} className=${`flex items-center gap-1.5 px-3 py-1.5 rounded-lg cursor-pointer transition-all shrink-0 text-[11px] font-semibold border ${i === activeIndex ? 'bg-[#22d3ee]/10 text-[#22d3ee] border-[#22d3ee]/25' : 'text-gray-500 border-transparent hover:text-gray-300 hover:border-white/[0.08]'}`} style=${i === activeIndex ? { boxShadow: '0 0 10px rgba(34,211,238,0.1)' } : {}}>
                  <span>${s.name}</span>
                  ${screens.length > 1 ? html`<button onClick=${(e) => { e.stopPropagation(); removeScreen(i); }} className="opacity-40 hover:opacity-100 hover:text-red-400 transition-all ml-0.5 text-[10px]">✕</button>` : null}
                </div>
              `)}
              <button onClick=${addScreen} className="shrink-0 px-2.5 py-1.5 text-[10px] text-gray-600 hover:text-[#22d3ee] border border-dashed border-white/[0.1] hover:border-[#22d3ee]/30 rounded-lg transition-all font-bold">+ Screen</button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-0.5 h-4 rounded-full bg-[#22d3ee]" style=${{ boxShadow: '0 0 6px rgba(34,211,238,0.5)' }}></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]" style=${{ color: 'rgba(34,211,238,0.7)' }}>Panel Configuration</span>
                </div>
                <div className="mb-3">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Screen Name</label>
                  <input type="text" className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none transition-colors" value=${config.name} onChange=${(e) => updateConfig({ name: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Columns</label>
                    <input type="number" className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none" value=${config.cols} onChange=${(e) => updateConfig({ cols: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Rows</label>
                    <input type="number" className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg px-3 py-2 text-sm text-white outline-none" value=${config.rows} onChange=${(e) => updateConfig({ rows: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                  </div>
                </div>
              </div>
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-0.5 h-4 rounded-full bg-[#818cf8]" style=${{ boxShadow: '0 0 6px rgba(129,140,248,0.5)' }}></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.18em]" style=${{ color: 'rgba(129,140,248,0.7)' }}>Panel Details</span>
                </div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Pixel Resolution</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="relative">
                    <input type="number" className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg px-3 pr-8 py-2 text-sm text-white outline-none" value=${config.modW} onChange=${(e) => updateConfig({ modW: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 pointer-events-none">W</span>
                  </div>
                  <div className="relative">
                    <input type="number" className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg px-3 pr-8 py-2 text-sm text-white outline-none" value=${config.modH} onChange=${(e) => updateConfig({ modH: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 pointer-events-none">H</span>
                  </div>
                </div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Physical Size</label>
                <select className="w-full bg-[#0a1528] border border-white/[0.1] text-sm py-2 px-3 rounded-lg outline-none text-white mb-2.5" value=${config.tileType} onChange=${(e) => {
                  const t = e.target.value;
                  updateConfig({ tileType: t, physW: 500, physH: t === 'half-one' ? 1000 : 500 });
                }}>
                  <option value="half-half">500 × 500mm — 1.0A/tile</option>
                  <option value="half-one">500 × 1000mm — 2.02A/tile</option>
                  <option value="custom">Custom dimensions</option>
                </select>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="relative">
                    <input type="number" className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg px-3 pr-10 py-2 text-sm text-white outline-none" value=${config.physW || 500} onChange=${(e) => { const v = Math.max(1, parseInt(e.target.value, 10) || 500); const h = config.physH || 500; const t = v === 500 && h === 500 ? 'half-half' : (v === 500 && h === 1000 ? 'half-one' : 'custom'); updateConfig({ physW: v, tileType: t }); }} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 pointer-events-none">W mm</span>
                  </div>
                  <div className="relative">
                    <input type="number" className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg px-3 pr-10 py-2 text-sm text-white outline-none" value=${config.physH || 500} onChange=${(e) => { const v = Math.max(1, parseInt(e.target.value, 10) || 500); const w = config.physW || 500; const t = w === 500 && v === 500 ? 'half-half' : (w === 500 && v === 1000 ? 'half-one' : 'custom'); updateConfig({ physH: v, tileType: t }); }} />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-gray-600 pointer-events-none">H mm</span>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">Wall Width</div>
                    <div className="text-sm font-black text-[#22d3ee]">${((config.cols * (config.physW || 500)) / 1000).toFixed(2)}m</div>
                  </div>
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">Wall Height</div>
                    <div className="text-sm font-black text-[#22d3ee]">${((config.rows * (config.physH || 500)) / 1000).toFixed(2)}m</div>
                  </div>
                </div>
              </div>
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-4 rounded-full bg-[#4ade80]" style=${{ boxShadow: '0 0 6px rgba(74,222,128,0.5)' }}></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em]" style=${{ color: 'rgba(74,222,128,0.7)' }}>Data Routing</span>
                  </div>
                  <button onClick=${() => updateConfig({ isAutoDataLimit: !config.isAutoDataLimit })} className=${`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${config.isAutoDataLimit ? 'bg-[#4ade80]/10 border-[#4ade80]/25 text-[#4ade80]' : 'bg-white/[0.04] border-white/[0.1] text-gray-400 hover:border-white/20'}`}>${config.isAutoDataLimit ? '⚡ AUTO' : 'MANUAL'}</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-3 p-1 bg-black/20 border border-white/[0.06] rounded-lg">
                  <button onClick=${() => { updateConfig({ dataRoutingMode: 'auto' }); if (drawMode === 'data') setDrawMode(null); }} className=${`py-1.5 rounded-md text-[10px] font-black transition-all ${config.dataRoutingMode !== 'manual' ? 'bg-[#4ade80]/15 text-[#4ade80]' : 'text-gray-600 hover:text-gray-300'}`}>AUTO PATCH</button>
                  <button onClick=${() => beginManualDrawing('data')} className=${`py-1.5 rounded-md text-[10px] font-black transition-all ${config.dataRoutingMode === 'manual' ? 'bg-[#60a5fa]/15 text-[#60a5fa]' : 'text-gray-600 hover:text-gray-300'}`}>DRAW LINES</button>
                </div>
                <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Signal Pattern</label>
                <select disabled=${config.dataRoutingMode === 'manual'} className="w-full bg-[#0a1528] border border-white/[0.1] text-sm py-2 px-3 rounded-lg outline-none text-white mb-3 disabled:opacity-35" value=${config.dataPattern} onChange=${(e) => updateConfig({ dataPattern: e.target.value })}>
                  ${PATTERNS.map((p) => html`<option key=${p.id} value=${p.id}>${p.name}</option>`)}
                </select>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider">Modules / Port</label>
                  <span className="text-[10px] font-black text-[#4ade80]">${effectiveDataLimit}</span>
                </div>
                <input type="number" disabled=${config.isAutoDataLimit} className="w-full bg-[#0a1528] border border-white/[0.1] text-sm p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-white outline-none" value=${effectiveDataLimit} onChange=${(e) => updateConfig({ maxDataMods: parseInt(e.target.value, 10) || 1 })} />
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-4 rounded-full bg-[#fb923c]" style=${{ boxShadow: '0 0 6px rgba(251,146,60,0.5)' }}></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em]" style=${{ color: 'rgba(251,146,60,0.8)' }}>Power Routing</span>
                  </div>
                  <button onClick=${() => updateConfig({ isAutoPowerLimit: !config.isAutoPowerLimit })} className=${`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${config.isAutoPowerLimit ? 'bg-[#fb923c]/10 border-[#fb923c]/25 text-[#fb923c]' : 'bg-white/[0.04] border-white/[0.1] text-gray-400 hover:border-white/20'}`}>${config.isAutoPowerLimit ? '⚡ AUTO' : 'MANUAL'}</button>
                </div>
                <div className="grid grid-cols-2 gap-1.5 mb-3 p-1 bg-black/20 border border-white/[0.06] rounded-lg">
                  <button onClick=${() => { updateConfig({ powerRoutingMode: 'auto' }); if (drawMode === 'power') setDrawMode(null); }} className=${`py-1.5 rounded-md text-[10px] font-black transition-all ${config.powerRoutingMode !== 'manual' ? 'bg-[#fb923c]/15 text-[#fb923c]' : 'text-gray-600 hover:text-gray-300'}`}>AUTO PATCH</button>
                  <button onClick=${() => beginManualDrawing('power')} className=${`py-1.5 rounded-md text-[10px] font-black transition-all ${config.powerRoutingMode === 'manual' ? 'bg-[#fb923c]/15 text-[#fb923c]' : 'text-gray-600 hover:text-gray-300'}`}>DRAW LINES</button>
                </div>
                <div className="flex items-center justify-between bg-[#fb923c]/[0.06] border border-[#fb923c]/20 rounded-lg px-3 py-2 mb-3">
                  <span className="text-[10px] text-gray-500 uppercase tracking-wider">Tile Type</span>
                  <span className="text-[11px] font-bold text-[#fb923c]">${config.tileType === 'half-one' ? '0.5×1.0m · 2.02A' : config.tileType === 'half-half' ? '0.5×0.5m · 1.0A' : `${(config.physW||500)}×${(config.physH||500)}mm`}</span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 mb-3">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Circuit Breaker</label>
                    <select className="w-full bg-[#0a1528] border border-white/[0.1] text-sm py-2 px-3 rounded-lg outline-none text-white" value=${config.circuitAmps} onChange=${(e) => updateConfig({ circuitAmps: parseInt(e.target.value, 10) })}>
                      <option value="10">10A</option>
                      <option value="13">13A</option>
                      <option value="15">15A</option>
                      <option value="16">16A</option>
                      <option value="20">20A</option>
                      <option value="32">32A</option>
                      <option value="63">63A</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Power Pattern</label>
                    <select disabled=${config.powerRoutingMode === 'manual'} className="w-full bg-[#0a1528] border border-white/[0.1] text-sm py-2 px-3 rounded-lg outline-none text-white disabled:opacity-35" value=${config.powerPattern} onChange=${(e) => updateConfig({ powerPattern: e.target.value })}>
                      ${PATTERNS.map((p) => html`<option key=${p.id} value=${p.id}>${p.name}</option>`)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">A / Tile</div>
                    <div className="text-sm font-black text-[#fb923c]">${powerTileAmps}A</div>
                  </div>
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">Max / Circuit</div>
                    <div className="text-sm font-black text-[#fb923c]">${effectivePowerLimit} tiles</div>
                  </div>
                </div>
                <input type="number" disabled=${config.isAutoPowerLimit} className="w-full bg-[#0a1528] border border-white/[0.1] text-sm p-2 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed text-white outline-none" value=${effectivePowerLimit} min="1" onChange=${(e) => updateConfig({ maxPowerMods: Math.max(1, parseInt(e.target.value, 10) || 1) })} />
              </div>
            </div>
          </aside>

          <main className="flex-1 min-w-0 flex flex-col relative bg-[#070d13]">
            <header className="h-14 shrink-0 border-b border-white/[0.07] bg-[#09131c] flex items-center justify-between px-4 z-10">
              <div className="flex items-center gap-1.5">
                <div className="flex items-center bg-[#0c1a2e] border border-white/[0.08] rounded-lg overflow-hidden">
                  <button onClick=${() => { setAutoFitView(false); setZoom(Math.max(0.1, zoom - 0.1)); }} className="px-2.5 py-1.5 text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all text-sm font-black">−</button>
                  <span className="text-[11px] font-mono text-gray-500 px-2.5 border-x border-white/[0.06] min-w-[3rem] text-center">${Math.round(effectiveZoom * 100)}%</span>
                  <button onClick=${() => { setAutoFitView(false); setZoom(Math.min(3, zoom + 0.1)); }} className="px-2.5 py-1.5 text-gray-400 hover:text-white hover:bg-white/[0.05] transition-all text-sm font-black">+</button>
                </div>
                <button onClick=${() => { if (!autoFitView) { setPanX(0); setPanY(0); } setAutoFitView(!autoFitView); }} className=${`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${autoFitView ? 'bg-[#4ade80]/10 border-[#4ade80]/25 text-[#4ade80]' : 'bg-[#0c1a2e] border-white/[0.08] text-gray-500 hover:border-white/20'}`} style=${autoFitView ? { boxShadow: '0 0 10px rgba(74,222,128,0.12)' } : {}}>FIT</button>
                <div className="w-px h-5 bg-white/[0.06] mx-0.5"></div>
                <button onClick=${exportPNG} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-[#0c1a2e] border-[#60a5fa]/20 text-[#60a5fa] hover:bg-[#60a5fa]/10 hover:border-[#60a5fa]/40 transition-all">↓ PNG</button>
                <button onClick=${exportPDF} className="px-3 py-1.5 text-[11px] font-bold rounded-lg border bg-[#0c1a2e] border-[#22d3ee]/20 text-[#22d3ee] hover:bg-[#22d3ee]/10 hover:border-[#22d3ee]/40 transition-all">↓ PDF</button>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-gray-600 uppercase tracking-widest mr-1 font-bold">View</span>
                <button onClick=${() => setShowData(!showData)} className=${`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${showData ? 'bg-[#3b82f6]/15 border-[#3b82f6]/30 text-[#60a5fa]' : 'bg-[#0c1a2e] border-white/[0.06] text-gray-600 hover:border-white/[0.12] hover:text-gray-400'}`} style=${showData ? { boxShadow: '0 0 10px rgba(59,130,246,0.12)' } : {}}>◈ DATA</button>
                <button onClick=${() => setShowPower(!showPower)} className=${`px-3 py-1.5 text-[11px] font-bold rounded-lg border transition-all ${showPower ? 'bg-[#fb923c]/15 border-[#fb923c]/30 text-[#fb923c]' : 'bg-[#0c1a2e] border-white/[0.06] text-gray-600 hover:border-white/[0.12] hover:text-gray-400'}`} style=${showPower ? { boxShadow: '0 0 10px rgba(251,146,60,0.12)' } : {}}>⚡ POWER</button>
              </div>
            </header>

            <div
              ref=${viewportRef}
              className="flex-1 overflow-hidden relative pl-canvas-vignette"
              style=${{ cursor: drawMode ? 'crosshair' : (autoFitView ? 'default' : (isPanning ? 'grabbing' : 'grab')), backgroundColor: '#050b10', backgroundImage: 'radial-gradient(circle, rgba(148,163,184,0.085) 1px, transparent 1px)', backgroundSize: '24px 24px' }}
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
              onPointerUp=${() => { panRef.current.active = false; drawPointerRef.current.active = false; setIsPanning(false); }}
              onPointerLeave=${() => { panRef.current.active = false; drawPointerRef.current.active = false; setIsPanning(false); }}
            >
              <div className="pl-kpi-strip absolute top-3 left-3 right-3 z-10 grid gap-2 pointer-events-none">
                <div className="pl-kpi rounded-md border border-white/[0.08] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[0.16em] text-gray-600 font-bold">Wall canvas</div>
                  <div className="text-[13px] text-white font-black mt-0.5">${config.cols} × ${config.rows} <span className="text-[9px] text-gray-500 font-semibold">${totals.totalCabs} panels</span></div>
                </div>
                <div className="pl-kpi rounded-md border border-white/[0.08] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[0.16em] text-gray-600 font-bold">Data load</div>
                  <div className=${`text-[13px] font-black mt-0.5 ${routingHealth.peakDataLoad > 95 ? 'text-red-400' : 'text-[#60a5fa]'}`}>${Math.round(routingHealth.peakDataLoad)}% <span className="text-[9px] text-gray-500 font-semibold">peak port</span></div>
                </div>
                <div className="pl-kpi rounded-md border border-white/[0.08] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[0.16em] text-gray-600 font-bold">Power load</div>
                  <div className=${`text-[13px] font-black mt-0.5 ${routingHealth.peakPowerLoad > 100 ? 'text-red-400' : 'text-[#fb923c]'}`}>${Math.round(routingHealth.peakPowerLoad)}% <span className="text-[9px] text-gray-500 font-semibold">peak circuit</span></div>
                </div>
                <div className="pl-kpi rounded-md border border-white/[0.08] px-3 py-2">
                  <div className="text-[8px] uppercase tracking-[0.16em] text-gray-600 font-bold">Network health</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full" style=${{ background: routingHealth.tone, boxShadow: `0 0 8px ${routingHealth.tone}` }}></span>
                    <span className="text-[11px] font-black" style=${{ color: routingHealth.tone }}>${routingHealth.label}</span>
                  </div>
                </div>
              </div>
              <div style=${{ position: 'absolute', top: '132px', left: '50%', transform: `translate(-50%, 0)${autoFitView ? '' : ` translate(${panX}px, ${panY}px)`} scale(${effectiveZoom})`, transformOrigin: 'top center', transition: isPanning ? 'none' : 'transform 0.15s ease-out' }}>
                <div className="relative rounded-xl" style=${{ background: '#050a10', border: '1px solid rgba(34,211,238,0.1)', boxShadow: '0 0 60px rgba(34,211,238,0.04), 0 0 0 1px rgba(255,255,255,0.03), 0 20px 60px rgba(0,0,0,0.6)' }}>
                  <svg id="diagram-svg" width=${canvasW} height=${canvasH} viewBox=${`0 0 ${canvasW} ${canvasH}`} className="overflow-visible block">
                    <defs>
                      <pattern id="svg-grid-dots" width=${cabSize} height=${cabSize} patternUnits="userSpaceOnUse">
                        <circle cx=${cabSize / 2} cy=${cabSize / 2} r="0.6" fill="rgba(34,211,238,0.1)" />
                      </pattern>
                    </defs>
                    <rect x="0" y="0" width=${canvasW} height=${canvasH} fill="#050a10" />
                    <rect x=${padding} y=${padding} width=${config.cols * cabSize} height=${config.rows * cabSize} fill="url(#svg-grid-dots)" opacity="0.8" />
                    <rect x=${padding - 1} y=${padding - 1} width=${config.cols * cabSize + 2} height=${config.rows * cabSize + 2} fill="none" stroke="rgba(34,211,238,0.06)" strokeWidth="1" rx="4" />
                    ${Array.from({ length: config.cols }).map((_, c) => Array.from({ length: config.rows }).map((__, r) => {
                      const routeIndex = panelRouteIndex.get(`${c}:${r}`) || 0;
                      const panelColor = PORT_PALETTE[routeIndex % PORT_PALETTE.length];
                      const isPowerPanel = powerPanelSet.has(`${c}:${r}`);
                      return html`
                      <g
                        key=${`cab-${c}-${r}`}
                        className=${drawMode ? 'pl-draw-tile' : ''}
                        onPointerDown=${(e) => {
                          if (!drawMode || e.button !== 0) return;
                          e.preventDefault();
                          e.stopPropagation();
                          drawPointerRef.current = { active: true, type: drawMode };
                          appendManualPoint(drawMode, c, r);
                        }}
                        onPointerEnter=${() => {
                          if (drawMode && drawPointerRef.current.active && drawPointerRef.current.type === drawMode) appendManualPoint(drawMode, c, r);
                        }}
                        onPointerUp=${() => { drawPointerRef.current.active = false; }}
                      >
                        <rect x=${padding + c * cabSize} y=${padding + r * cabSize} width=${cabSize - 2} height=${cabSize - 2} rx="3" ry="3" fill="#0b1827" stroke=${drawMode === 'power' && isPowerPanel ? '#fb923c' : (showData ? panelColor : '#152238')} strokeOpacity=${drawMode ? 0.72 : (showData ? 0.34 : 1)} strokeWidth=${drawMode && ((drawMode === 'data' && panelRouteIndex.has(`${c}:${r}`)) || (drawMode === 'power' && isPowerPanel)) ? 1.5 : 0.7} />
                        ${showData ? html`<rect x=${padding + c * cabSize + 2} y=${padding + r * cabSize + 2} width=${cabSize - 6} height=${cabSize - 6} rx="2" fill=${panelColor} opacity="0.035" />` : null}
                        <text x=${padding + c * cabSize + 4} y=${padding + r * cabSize + 11} fill="#253d5c" fontSize="7.5" fontFamily="monospace">${c + 1},${r + 1}</text>
                      </g>
                    `;}))}
                    ${showPower ? renderPath(powerPaths, true) : null}
                    ${showData ? renderPath(dataPaths, false) : null}
                  </svg>
                </div>
              </div>

            ${drawMode ? html`
              <div
                className="pl-draw-toolbar absolute border border-white/[0.1] rounded-lg px-4 py-3 z-20"
                style=${{ top: `${drawToolbarTop}px`, left: '50%', transform: 'translateX(-50%)', width: 'calc(100% - 24px)', maxWidth: '720px' }}
              >
                <div className="grid grid-cols-2 gap-3 items-center border-b border-white/[0.07] pb-3 mb-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-3 h-3 rounded-full animate-pulse shrink-0" style=${{ background: drawMode === 'data' ? '#60a5fa' : '#fb923c', boxShadow: `0 0 12px ${drawMode === 'data' ? '#60a5fa' : '#fb923c'}` }}></span>
                    <div className="min-w-0">
                      <div className="text-[14px] font-black uppercase" style=${{ color: drawMode === 'data' ? '#60a5fa' : '#fb923c' }}>Active ${activeDrawAssignment}</div>
                      <div className="text-[11px] text-gray-500 mt-1 truncate">${activeDrawTiles} tiles · ${activeDrawLoad.value.toLocaleString()}${activeDrawLoad.unit} / ${activeDrawLoad.limit.toLocaleString()}${activeDrawLoad.unit}</div>
                    </div>
                  </div>
                  <div className="pl-live-meter pl-3 border-l border-white/[0.08]">
                    <div className="flex justify-between text-[11px] font-bold mb-2">
                      <span className="text-gray-500">LIVE LOAD</span>
                      <span className=${activeDrawOverload ? 'text-red-400' : 'text-[#4ade80]'}>${activeDrawPercent}%</span>
                    </div>
                    <div className="h-3 bg-white/[0.06] rounded-full overflow-hidden">
                      <div className=${`h-full rounded-full transition-all duration-150 ${activeDrawOverload ? 'bg-red-500' : (drawMode === 'data' ? 'bg-[#60a5fa]' : 'bg-[#fb923c]')}`} style=${{ width: `${Math.min(100, activeDrawPercent)}%` }}></div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 w-full">
                  <button onClick=${startNewManualPath} disabled=${!activeDrawTiles} title=${activeDrawTiles ? `Finish ${activeDrawAssignment} and select ${nextDrawAssignment}` : 'Draw at least one tile first'} className="h-11 flex-1 px-4 rounded-md bg-[#60a5fa]/10 border border-[#60a5fa]/20 hover:bg-[#60a5fa]/15 disabled:opacity-30 text-[12px] font-black text-[#93c5fd]">${drawMode === 'data' ? `NEXT PORT · ${nextDrawAssignment}` : `NEXT · ${nextDrawAssignment}`}</button>
                  <button onClick=${undoManualChange} disabled=${!drawHistory.undo.length} title="Undo" className="w-11 h-11 rounded-md bg-white/[0.07] hover:bg-white/[0.12] disabled:opacity-25 text-xl text-gray-200">↶</button>
                  <button onClick=${redoManualChange} disabled=${!drawHistory.redo.length} title="Redo" className="w-11 h-11 rounded-md bg-white/[0.07] hover:bg-white/[0.12] disabled:opacity-25 text-xl text-gray-200">↷</button>
                  <button onClick=${clearManualPaths} disabled=${!activeDrawPaths.some((path) => path.length)} title="Clear all manually drawn lines" className="h-11 px-3 rounded-md bg-red-500/[0.1] border border-red-500/20 hover:bg-red-500/[0.18] disabled:opacity-25 text-[11px] font-black text-red-400">CLEAR ALL</button>
                  <button onClick=${() => { drawPointerRef.current.active = false; setDrawMode(null); }} className="h-11 px-5 rounded-md bg-[#4ade80]/15 border border-[#4ade80]/20 text-[#4ade80] text-[12px] font-black">DONE</button>
                </div>
              </div>
            ` : null}
            </div>

            <footer className="h-10 shrink-0 bg-[#0a1220] border-t border-white/[0.06] flex items-center px-4 justify-between z-10">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Ports</span>
                  <span className="text-[11px] font-mono font-black text-[#60a5fa]">${dataPaths.length}</span>
                </div>
                <div className="w-px h-3.5 bg-white/[0.06]"></div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Controllers</span>
                  <span className="text-[11px] font-mono font-black text-[#4ade80]">${controllerAllocation.usedControllers}/${controllerAllocation.plannedControllers}</span>
                </div>
                ${showPower ? html`
                  <div className="w-px h-3.5 bg-white/[0.06]"></div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">⚡ Circuits</span>
                    <span className="text-[11px] font-mono font-black text-[#fb923c]">${powerPaths.length}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] text-gray-600 uppercase tracking-wider font-bold">Total</span>
                    <span className="text-[11px] font-mono font-black text-[#fb923c]">${totals.totalCabs * powerTileAmps}A</span>
                  </div>
                ` : null}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[11px] font-mono text-gray-600">${totals.totalPxWidth}×${totals.totalPxHeight} px</span>
                <span className="text-[11px] font-mono" style=${{ color: 'rgba(34,211,238,0.5)' }} title=${capacityFormulaLabel}>${totals.cabsPerPortLimit} cabs/port</span>
              </div>
            </footer>
          </main>

          <aside className="bg-[#09131c] border-l border-white/[0.07] flex flex-col z-20 overflow-hidden">
            <div className="shrink-0 px-4 py-3 border-b border-white/[0.07] bg-[#060d1a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-0.5 h-4 rounded-full bg-[#22d3ee]" style=${{ boxShadow: '0 0 6px rgba(34,211,238,0.5)' }}></div>
                  <span className="text-[10px] font-black uppercase tracking-[0.2em]" style=${{ color: 'rgba(34,211,238,0.7)' }}>Hardware Rack</span>
                </div>
                <span className="text-[9px] font-mono text-[#4ade80]">● LIVE</span>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-white/[0.06] space-y-3">
                <div>
                  <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">LED Processor</label>
                  <select className="w-full bg-[#0a1528] border border-white/[0.1] text-sm font-semibold text-white rounded-lg px-3 py-2.5 outline-none" value=${config.selectedProcessor.id} onChange=${(e) => {
                    const nextProcessor = PROCESSOR_DATABASE.find((p) => p.id === e.target.value) || PROCESSOR_DATABASE[0];
                    const nextCards = Array.isArray(nextProcessor.outputCards) ? nextProcessor.outputCards : [];
                    const firstCard = nextCards[0] || null;
                    updateConfig({
                      selectedProcessor: nextProcessor,
                      selectedOutputCardId: firstCard ? firstCard.id : null,
                      outputCardCount: firstCard ? (Math.max(1, Number(firstCard.defaultCards) || 1)) : 1
                    });
                  }}>
                    ${PROCESSOR_DATABASE.map((p) => html`<option key=${p.id} value=${p.id}>${p.name}</option>`)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">Class</div>
                    <div className="text-xs font-black text-[#22d3ee]">${config.selectedProcessor.type}</div>
                  </div>
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-3 py-1.5">
                    <div className="text-[9px] text-gray-500 uppercase tracking-wider">Link Speed</div>
                    <div className="text-xs font-black text-[#4ade80]">${Number(config.selectedProcessor.linkGbps) || 1}G</div>
                  </div>
                </div>
                ${Array.isArray(config.selectedProcessor.outputCards) && config.selectedProcessor.outputCards.length ? html`
                  <div className="space-y-2.5">
                    <div>
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Output Card</label>
                      <select className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white outline-none" value=${config.selectedOutputCardId || config.selectedProcessor.outputCards[0].id} onChange=${(e) => {
                        const selectedCard = config.selectedProcessor.outputCards.find((card) => card.id === e.target.value) || config.selectedProcessor.outputCards[0];
                        const defaultCards = Math.max(1, Number(selectedCard.defaultCards) || 1);
                        updateConfig({ selectedOutputCardId: selectedCard.id, outputCardCount: defaultCards });
                      }}>
                        ${config.selectedProcessor.outputCards.map((card) => html`<option key=${card.id} value=${card.id}>${card.name}</option>`)}
                      </select>
                    </div>
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] text-gray-500 uppercase tracking-wider">Card Count</label>
                      <input type="number" min="1" max=${Math.max(1, Number((config.selectedProcessor.outputCards.find((card) => card.id === (config.selectedOutputCardId || config.selectedProcessor.outputCards[0].id)) || config.selectedProcessor.outputCards[0]).maxCards) || 1)} value=${Math.max(1, parseInt(config.outputCardCount, 10) || (config.selectedProcessor.outputCards[0].defaultCards || 1))} onChange=${(e) => {
                        const selectedCard = config.selectedProcessor.outputCards.find((card) => card.id === (config.selectedOutputCardId || config.selectedProcessor.outputCards[0].id)) || config.selectedProcessor.outputCards[0];
                        const maxCards = Math.max(1, Number(selectedCard.maxCards) || 1);
                        const nextCount = Math.min(maxCards, Math.max(1, parseInt(e.target.value, 10) || 1));
                        updateConfig({ outputCardCount: nextCount });
                      }} className="w-16 bg-[#0a1528] border border-white/[0.1] rounded-lg px-2 py-1.5 text-xs text-white text-right outline-none" />
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] bg-[#22d3ee]/[0.05] border border-[#22d3ee]/15 rounded-lg px-3 py-1.5">
                      <span className="font-black text-[#22d3ee]">${totals.effectivePorts}</span>
                      <span className="text-gray-500">outputs ·</span>
                      <span style=${{ color: 'rgba(34,211,238,0.6)' }}>${totals.outputProfileLabel}</span>
                    </div>
                  </div>
                ` : null}
                <div className="text-[10px] text-gray-600 leading-relaxed" title=${capacityFormulaLabel}>
                  ${config.selectedProcessor.capacitySource || 'Model + link capped'}
                </div>
                ${config.selectedProcessor.specNote ? html`
                  <div className="text-[10px] text-amber-400/80 bg-amber-500/[0.06] border border-amber-500/20 rounded-lg px-3 py-2 leading-relaxed">${config.selectedProcessor.specNote}</div>
                ` : null}
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Refresh Rate</label>
                    <select className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg text-sm p-2 text-white font-mono outline-none" value=${config.hz} onChange=${(e) => updateConfig({ hz: parseFloat(e.target.value) })}>
                      <option value="60">60 Hz</option>
                      <option value="50">50 Hz</option>
                      <option value="120">120 Hz</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider block mb-1.5">Bit Depth</label>
                    <select className="w-full bg-[#0a1528] border border-white/[0.1] rounded-lg text-sm p-2 text-white font-mono outline-none" value=${config.bit} onChange=${(e) => updateConfig({ bit: parseInt(e.target.value, 10) })}>
                      <option value="8">8-bit</option>
                      <option value="10">10-bit</option>
                      <option value="12">12-bit</option>
                    </select>
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[10px] text-gray-500 uppercase tracking-wider">Controllers</label>
                    <button onClick=${() => { if (autoControllers) { setControllerCount(Math.max(1, controllerAllocation.plannedControllers)); } setAutoControllers(!autoControllers); }} className=${`text-[10px] font-bold px-2.5 py-1 rounded-full border transition-all ${autoControllers ? 'bg-[#4ade80]/10 border-[#4ade80]/25 text-[#4ade80]' : 'bg-white/[0.04] border-white/[0.1] text-gray-400'}`}>${autoControllers ? '⚡ AUTO' : 'MANUAL'}</button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button onClick=${() => setControllerCount((n) => Math.max(1, (parseInt(n, 10) || 1) - 1))} disabled=${autoControllers} className="px-2.5 py-1.5 rounded-lg text-sm bg-[#0a1528] border border-white/[0.1] disabled:opacity-30 text-white font-black hover:bg-white/[0.05] transition-all">−</button>
                    <input type="number" min="1" value=${autoControllers ? controllerAllocation.plannedControllers : controllerCount} disabled=${autoControllers} onChange=${(e) => setControllerCount(Math.max(1, parseInt(e.target.value, 10) || 1))} className="flex-1 bg-[#0a1528] border border-white/[0.1] rounded-lg px-2 py-1.5 text-sm text-white text-center disabled:opacity-30 outline-none" />
                    <button onClick=${() => setControllerCount((n) => Math.max(1, (parseInt(n, 10) || 1) + 1))} disabled=${autoControllers} className="px-2.5 py-1.5 rounded-lg text-sm bg-[#0a1528] border border-white/[0.1] disabled:opacity-30 text-white font-black hover:bg-white/[0.05] transition-all">+</button>
                  </div>
                  ${controllerAllocation.unassignedCircuits > 0 ? html`
                    <div className="mt-1.5 text-[10px] text-red-400 bg-red-500/[0.07] border border-red-500/20 rounded-lg px-2.5 py-1.5">⚠ ${controllerAllocation.unassignedCircuits} paths unassigned</div>
                  ` : html`
                    <div className="mt-1.5 text-[10px]" style=${{ color: 'rgba(74,222,128,0.6)' }}>${autoControllers ? `Auto: ${controllerAllocation.requiredControllers} required` : 'All paths assigned'}</div>
                  `}
                </div>
              </div>
              <div className="p-4 border-b border-white/[0.06]">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-4 rounded-full bg-[#60a5fa]" style=${{ boxShadow: '0 0 6px rgba(96,165,250,0.5)' }}></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em]" style=${{ color: 'rgba(96,165,250,0.7)' }}>Port Allocation</span>
                  </div>
                  <span className=${`text-[10px] font-black px-2 py-0.5 rounded-full ${controllerAllocation.unassignedCircuits > 0 ? 'text-red-400 bg-red-500/10' : 'text-[#4ade80] bg-[#4ade80]/10'}`}>${dataPaths.length} paths</span>
                </div>
                <div className="space-y-2.5">
                  ${controllerAllocation.controllers.map((ctrl) => html`
                    <div key=${`ctrl-${ctrl.index}`} className="rounded-xl border border-white/[0.08] overflow-hidden">
                      <div className="flex items-center justify-between px-3 py-2 bg-[#0f1e35] border-b border-white/[0.06]">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded-md bg-[#22d3ee]/15 border border-[#22d3ee]/20 flex items-center justify-center shrink-0">
                            <span className="text-[9px] font-black text-[#22d3ee] leading-none">${ctrl.index + 1}</span>
                          </div>
                          <span className="text-[10px] font-bold text-gray-300">${config.selectedProcessor.name}</span>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="text-[8px] text-gray-600 uppercase">Avg Load</div>
                          <div className=${`text-[11px] font-black ${ctrl.avgLoadPercent > 90 ? 'text-red-400' : 'text-amber-300'}`}>${Math.round(ctrl.avgLoadPercent)}%</div>
                        </div>
                      </div>
                      <div className="p-2.5 bg-[#0b1525] grid grid-cols-5 gap-1">
                        ${ctrl.portLoads.map((port) => {
                          const roundedLoad = Math.round(port.loadPercent);
                          const isOver = port.loadPercent > 95;
                          return html`
                            <div
                              key=${`ctrl-${ctrl.index}-p-${port.portIndex}`}
                              className=${`h-9 rounded-lg flex flex-col items-center justify-center transition-all duration-200 ${!port.isUsed ? 'bg-white/[0.02] border border-white/[0.05] text-gray-700' : isOver ? 'bg-red-500/20 border border-red-400/35 text-red-300' : 'bg-[#22d3ee]/10 border border-[#22d3ee]/20 text-[#22d3ee]'}`}
                              style=${port.isUsed && !isOver ? { boxShadow: '0 0 8px rgba(34,211,238,0.08)' } : (isOver ? { boxShadow: '0 0 8px rgba(239,68,68,0.15)' } : {})}
                              title=${port.isUsed ? `Port ${port.portIndex}: ${roundedLoad}% · ${port.modules} modules` : `Port ${port.portIndex}: free`}
                            >
                              <span className="text-[11px] font-black leading-none">${port.portIndex}</span>
                              <span className="text-[8px] font-bold leading-none mt-0.5 opacity-80">${port.isUsed ? `${roundedLoad}%` : '—'}</span>
                            </div>
                          `;
                        })}
                      </div>
                      <div className="flex items-center justify-between px-3 py-2 bg-[#0b1525] border-t border-white/[0.04] text-[10px]">
                        <span className="text-gray-600">Ports: <span className="text-white font-bold">${ctrl.usedPorts}/${ctrl.totalPorts}</span></span>
                        <span className="text-gray-600">Limit: <span className="text-[#22d3ee] font-bold">${perPortLimitLabel} px</span></span>
                      </div>
                    </div>
                  `)}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-0.5 h-4 rounded-full bg-[#fb923c]" style=${{ boxShadow: '0 0 6px rgba(251,146,60,0.5)' }}></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.18em]" style=${{ color: 'rgba(251,146,60,0.8)' }}>Power Distribution</span>
                  </div>
                  <span className="text-[10px] text-gray-500">${config.tileType === 'half-one' ? '0.5×1.0m' : '0.5×0.5m'}</span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-center">
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider">A/Tile</div>
                    <div className="text-sm font-black text-[#fb923c]">${powerTileAmps}</div>
                  </div>
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-center">
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider">Breaker</div>
                    <div className="text-sm font-black text-[#fb923c]">${config.circuitAmps}A</div>
                  </div>
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-center">
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider">Circuits</div>
                    <div className="text-sm font-black text-amber-300">${powerPaths.length}</div>
                  </div>
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-center">
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider">Max/Circ</div>
                    <div className="text-sm font-black text-amber-300">${effectivePowerLimit}</div>
                  </div>
                  <div className="bg-[#0a1528] border border-white/[0.07] rounded-lg px-2.5 py-1.5 text-center">
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider">Tiles</div>
                    <div className="text-sm font-black text-white">${totals.totalCabs}</div>
                  </div>
                  <div className="bg-[#0a1528] border border-[#fb923c]/15 rounded-lg px-2.5 py-1.5 text-center">
                    <div className="text-[8px] text-gray-600 uppercase tracking-wider">Total A</div>
                    <div className="text-sm font-black text-[#fb923c]">${totals.totalCabs * powerTileAmps}</div>
                  </div>
                </div>
                <div className="space-y-1.5">
                  ${powerPaths.map((circuit, idx) => {
                    const circuitAmpsUsed = circuit.length * powerTileAmps;
                    const loadPct = Math.round((circuitAmpsUsed / config.circuitAmps) * 100);
                    const isOver = loadPct > 100;
                    return html`
                      <div key=${`pwr-circuit-${idx}`} className="flex items-center gap-2">
                        <div className=${`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black shrink-0 ${isOver ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-[#fb923c]/10 text-[#fb923c] border border-[#fb923c]/15'}`}>${idx + 1}</div>
                        <div className="flex-1 bg-white/[0.04] rounded-full h-1.5 overflow-hidden">
                          <div className=${`h-full rounded-full transition-all ${isOver ? 'bg-red-500' : 'bg-gradient-to-r from-[#fb923c] to-[#fbbf24]'}`} style=${{ width: `${Math.min(100, loadPct)}%` }}></div>
                        </div>
                        <span className=${`text-[10px] font-mono font-bold w-9 text-right ${isOver ? 'text-red-400' : 'text-gray-500'}`}>${loadPct}%</span>
                      </div>
                    `;
                  })}
                </div>
                <div className="mt-3 pt-3 border-t border-white/[0.05] text-[10px] text-gray-600">
                  Single-phase · ${config.powerPattern === 'v-snake' ? 'Vertical Snake' : config.powerPattern === 'h-snake' ? 'Horizontal Snake' : config.powerPattern === 'v-zigzag' ? 'Vertical ZigZag' : 'Horizontal ZigZag'}
                </div>
              </div>
            </div>
          </aside>
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

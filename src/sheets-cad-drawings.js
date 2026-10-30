(function () {
  'use strict';

  const DRAWING_SHEETS = [
    { id: 1, title: 'Dimensions', upperTitle: 'DIMENSIONS' },
    { id: 2, title: 'Raster Map', upperTitle: 'RASTER MAP' },
    { id: 3, title: 'Data Wiring', upperTitle: 'DATA WIRING' },
    { id: 4, title: 'Power Wiring', upperTitle: 'POWER WIRING' },
    { id: 5, title: 'System Diagram', upperTitle: 'SYSTEM DIAGRAM' },
    { id: 6, title: 'Weight Estimate', upperTitle: 'WEIGHT ESTIMATE' },
    { id: 7, title: 'Heat Load (BTU)', upperTitle: 'HEAT LOAD (BTU)' },
    { id: 8, title: 'Bill of Materials', upperTitle: 'BILL OF MATERIALS' }
  ];

  // Default sheets included in final PDF (System Diagram #5 and Bill of Materials #8 unchecked by default, user-selectable)
  const DEFAULT_PDF_SHEET_IDS = [1, 2, 3, 4, 6, 7];

  function getSelectedCadSheetIds(sheetsState) {
    if (sheetsState && Array.isArray(sheetsState.selectedCadSheetIds) && sheetsState.selectedCadSheetIds.length > 0) {
      return sheetsState.selectedCadSheetIds;
    }
    try {
      const raw = localStorage.getItem('pixellogic_cad_selected_sheets');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const valid = parsed.map(Number).filter((id) => DRAWING_SHEETS.some((s) => s.id === id));
          if (valid.length > 0) {
            if (sheetsState) sheetsState.selectedCadSheetIds = valid;
            return valid;
          }
        }
      }
    } catch (e) {}
    const def = [...DEFAULT_PDF_SHEET_IDS];
    if (sheetsState) sheetsState.selectedCadSheetIds = def;
    return def;
  }

  function saveSelectedCadSheetIds(sheetsState, ids) {
    const valid = DRAWING_SHEETS.map((s) => s.id).filter((id) => ids.includes(id));
    const finalIds = valid.length > 0 ? valid : [1];
    if (sheetsState) sheetsState.selectedCadSheetIds = finalIds;
    try {
      localStorage.setItem('pixellogic_cad_selected_sheets', JSON.stringify(finalIds));
    } catch (e) {}
    return finalIds;
  }

  const PORT_COLORS = [
    '#16a34a', '#0284c7', '#7c3aed', '#db2777', '#ea580c',
    '#0d9488', '#4f46e5', '#c026d3', '#65a30d', '#dc2626',
    '#2563eb', '#d97706', '#059669', '#9333ea', '#e11d48', '#0891b2'
  ];

  const POWER_COLORS = [
    '#ea580c', '#d97706', '#dc2626', '#ca8a04', '#e11d48',
    '#c2410c', '#b45309', '#b91c1c', '#a16207', '#be123c'
  ];

  const PAPER_SIZES = {
    'A3': { name: 'A3', label: 'A3 (420 × 297 mm)', widthMm: 420, heightMm: 297, cssSize: 'A3 landscape', margin: '8mm' },
    'A4': { name: 'A4', label: 'A4 (297 × 210 mm)', widthMm: 297, heightMm: 210, cssSize: 'A4 landscape', margin: '6mm' },
    'A2': { name: 'A2', label: 'A2 (594 × 420 mm)', widthMm: 594, heightMm: 420, cssSize: 'A2 landscape', margin: '10mm' },
    'A1': { name: 'A1', label: 'A1 (841 × 594 mm)', widthMm: 841, heightMm: 594, cssSize: 'A1 landscape', margin: '12mm' },
    'A5': { name: 'A5', label: 'A5 (210 × 148 mm)', widthMm: 210, heightMm: 148, cssSize: 'A5 landscape', margin: '5mm' },
    'Letter': { name: 'Letter', label: 'Letter (11 × 8.5 in)', widthMm: 279.4, heightMm: 215.9, cssSize: 'letter landscape', margin: '0.25in' },
    'Tabloid': { name: 'Tabloid', label: 'Tabloid (17 × 11 in)', widthMm: 431.8, heightMm: 279.4, cssSize: 'tabloid landscape', margin: '0.35in' }
  };

  const esc = (str) => String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  const getWiringSummary = (patternId, cornerId) => {
    const p = String(patternId || 'v-snake');
    const family = p.includes('isolated') ? 'Isolated' : (p.includes('zigzag') ? 'Zig-Zag' : 'U-Turn');
    const dir = p.startsWith('h-') ? 'Horizontal' : 'Vertical';
    const corners = { tl: 'Top-left', tr: 'Top-right', bl: 'Bottom-left', br: 'Bottom-right' };
    return `${family} · ${corners[cornerId || 'tl'] || 'Top-left'} · ${dir}`;
  };

  function generateAutoPaths(cols, rows, pattern, maxMods, startCorner = 'tl', packingMode = 'max-fill') {
    const safeLimit = Math.max(1, Number(maxMods) || 1);
    const flipCols = startCorner === 'tr' || startCorner === 'br';
    const flipRows = startCorner === 'bl' || startCorner === 'br';
    const colIndices = Array.from({ length: cols }, (_, i) => (flipCols ? cols - 1 - i : i));
    const rowIndices = Array.from({ length: rows }, (_, i) => (flipRows ? rows - 1 - i : i));

    if (pattern === 'h-isolated') {
      const circuits = [];
      rowIndices.forEach((r) => {
        const line = colIndices.map((c) => ({ c, r }));
        for (let i = 0; i < line.length; i += safeLimit) circuits.push(line.slice(i, i + safeLimit));
      });
      return circuits;
    }
    if (pattern === 'v-isolated') {
      const circuits = [];
      colIndices.forEach((c) => {
        const line = rowIndices.map((r) => ({ c, r }));
        for (let i = 0; i < line.length; i += safeLimit) circuits.push(line.slice(i, i + safeLimit));
      });
      return circuits;
    }

    const lines = [];
    if (String(pattern).startsWith('h-')) {
      rowIndices.forEach((r, rStep) => {
        const reverse = pattern === 'h-snake' && (rStep % 2 !== 0);
        const cOrder = reverse ? [...colIndices].reverse() : colIndices;
        lines.push(cOrder.map((c) => ({ c, r })));
      });
    } else {
      colIndices.forEach((c, cStep) => {
        const reverse = pattern === 'v-snake' && (cStep % 2 !== 0);
        const rOrder = reverse ? [...rowIndices].reverse() : rowIndices;
        lines.push(rOrder.map((r) => ({ c, r })));
      });
    }

    if (packingMode === 'line-aligned') {
      const circuits = [];
      let cur = [];
      lines.forEach((line) => {
        if (line.length > safeLimit) {
          if (cur.length) { circuits.push(cur); cur = []; }
          for (let i = 0; i < line.length; i += safeLimit) circuits.push(line.slice(i, i + safeLimit));
        } else if (cur.length + line.length > safeLimit) {
          if (cur.length) circuits.push(cur);
          cur = [...line];
        } else {
          cur.push(...line);
        }
      });
      if (cur.length) circuits.push(cur);
      return circuits;
    }

    const allPoints = lines.flat();
    const circuits = [];
    for (let i = 0; i < allPoints.length; i += safeLimit) {
      circuits.push(allPoints.slice(i, i + safeLimit));
    }
    return circuits;
  }

  function computeScreenEngineeringData(row, sheetsState) {
    const map = row.map || {};
    const pc = map.patchingConfig || {};
    const cols = Math.max(1, Number(row.tilesW) || 8);
    const rows = Math.max(1, Number(row.tilesH) || 5);
    const totalTiles = cols * rows;
    const panelW = Math.max(50, Number(row.panelW) || 500);
    const panelH = Math.max(50, Number(row.panelH) || 500);
    const panelDepthMm = Number(pc.cabinetDepthMm) || (panelH >= 900 ? 85 : 80);
    const resW = Math.max(8, Number(row.resW) || 192);
    const resH = Math.max(8, Number(row.resH) || 192);
    const totalResW = cols * resW;
    const totalResH = rows * resH;
    const totalPixels = totalResW * totalResH;
    const widthM = (cols * panelW) / 1000;
    const heightM = (rows * panelH) / 1000;
    const depthM = panelDepthMm / 1000;
    const widthFt = widthM * 3.28084;
    const heightFt = heightM * 3.28084;
    const diagM = Math.sqrt(widthM * widthM + heightM * heightM);
    const diagIn = diagM * 39.3701;

    const hz = Number(pc.hz) || 60;
    const bit = Number(pc.bit) || 8;
    const base60 = (bit === 10 || bit === 12) ? 325000 : 650000;
    const maxPixelsPerPort = Math.floor(base60 * (60 / Math.max(1, hz)));
    const tilePixels = resW * resH;
    const autoDataLimit = Math.max(1, Math.floor(maxPixelsPerPort / Math.max(1, tilePixels)));
    const effectiveDataLimit = pc.isAutoDataLimit === false
      ? Math.max(1, Number(pc.maxDataMods) || autoDataLimit)
      : autoDataLimit;

    const dataPattern = pc.dataPattern || 'v-snake';
    const dataStartCorner = pc.dataStartCorner || 'tl';
    const dataPackingMode = pc.dataPackingMode || 'max-fill';
    const dataPaths = (pc.dataRoutingMode === 'manual' && Array.isArray(pc.manualDataPaths) && pc.manualDataPaths.length)
      ? pc.manualDataPaths
      : generateAutoPaths(cols, rows, dataPattern, effectiveDataLimit, dataStartCorner, dataPackingMode);

    const voltage = Number(pc.voltage) || Number(sheetsState.voltage) || 230;
    const circuitAmps = Number(pc.circuitAmps) || 16;
    const use80Percent = pc.use80PercentRule !== false;
    const effectiveBreakerAmps = Number((circuitAmps * (use80Percent ? 0.8 : 1)).toFixed(2));
    const perTileAmps = Number(row.perTileAmps) || Number(pc.tileAmps) || 0.72;
    const perTileWatts = Math.round(perTileAmps * voltage);
    const effectivePowerLimit = Math.max(1, Math.floor(effectiveBreakerAmps / Math.max(0.05, perTileAmps)));

    const powerPattern = pc.powerPattern || 'v-snake';
    const powerStartCorner = pc.powerStartCorner || 'tl';
    const powerPaths = (pc.powerRoutingMode === 'manual' && Array.isArray(pc.manualPowerPaths) && pc.manualPowerPaths.length)
      ? pc.manualPowerPaths
      : generateAutoPaths(cols, rows, powerPattern, effectivePowerLimit, powerStartCorner, 'max-fill');

    const processorName = (pc.selectedProcessor && pc.selectedProcessor.name)
      ? pc.selectedProcessor.name
      : 'NovaStar MCTRL4K (16 Ports)';
    const processorPorts = (pc.selectedProcessor && Number(pc.selectedProcessor.ports))
      ? Number(pc.selectedProcessor.ports)
      : 16;
    const redundancyMode = Boolean(pc.redundancyMode);
    const primaryPortsUsed = dataPaths.length;
    const totalPortsUsed = redundancyMode ? primaryPortsUsed * 2 : primaryPortsUsed;
    const processorsNeeded = Math.max(1, Math.ceil(totalPortsUsed / Math.max(1, processorPorts)));

    // Weight estimation (kg)
    const cabAreaSqM = (panelW * panelH) / 1e6;
    const singleCabWeightKg = Number(pc.cabinetWeightKg) || Number((cabAreaSqM * 29.5).toFixed(1)); // ~7.4kg for 500x500, ~14.8kg for 500x1000
    const panelsWeightKg = singleCabWeightKg * totalTiles;
    const riggingBarWeightKg = cols * 4.2;
    const cablingAllowanceKg = (panelsWeightKg + riggingBarWeightKg) * 0.10;
    const totalNetWeightKg = panelsWeightKg + riggingBarWeightKg + cablingAllowanceKg;
    const designWllKg = totalNetWeightKg * 1.25;
    const hoistCount = Math.max(2, Math.ceil(cols / 3));

    // Heat / Thermal (BTU/hr)
    const peakWatts = totalTiles * perTileWatts;
    const avgWatts = peakWatts * 0.55;
    const halfWatts = peakWatts * 0.50;
    const standbyWatts = peakWatts * 0.15;
    const peakBtuHr = peakWatts * 3.41214;
    const avgBtuHr = avgWatts * 3.41214;
    const halfBtuHr = halfWatts * 3.41214;
    const standbyBtuHr = standbyWatts * 3.41214;
    const coolingTonsPeak = peakBtuHr / 12000;
    const coolingTonsAvg = avgBtuHr / 12000;
    const airflowCfmAvg = avgBtuHr / (1.08 * 18); // Delta-T = 18°F (10°C)

    return {
      map,
      screenName: map.name || `Screen ${row.idx + 1}`,
      ledBrand: row.ledBrand || 'GENERIC',
      ledModel: row.ledModel || 'Standard Cabinet',
      pitchMm: row.pitchMm || 2.6,
      cols,
      rows,
      totalTiles,
      panelW,
      panelH,
      panelDepthMm,
      resW,
      resH,
      totalResW,
      totalResH,
      totalPixels,
      widthM,
      heightM,
      depthM,
      widthFt,
      heightFt,
      diagM,
      diagIn,
      hz,
      bit,
      maxPixelsPerPort,
      effectiveDataLimit,
      dataPattern,
      dataStartCorner,
      dataPaths,
      voltage,
      circuitAmps,
      use80Percent,
      effectiveBreakerAmps,
      perTileAmps,
      perTileWatts,
      effectivePowerLimit,
      powerPattern,
      powerStartCorner,
      powerPaths,
      processorName,
      processorPorts,
      redundancyMode,
      primaryPortsUsed,
      totalPortsUsed,
      processorsNeeded,
      singleCabWeightKg,
      panelsWeightKg,
      riggingBarWeightKg,
      cablingAllowanceKg,
      totalNetWeightKg,
      designWllKg,
      hoistCount,
      peakWatts,
      avgWatts,
      halfWatts,
      standbyWatts,
      peakBtuHr,
      avgBtuHr,
      halfBtuHr,
      standbyBtuHr,
      coolingTonsPeak,
      coolingTonsAvg,
      airflowCfmAvg
    };
  }

  function renderTitleBlockSvg(W, H, projectTitle, d, sheetObj, sheetsState = {}) {
    const tbY = H - 64;
    const tbH = 52;
    const x0 = 14;
    const tbW = W - 28;
    const dateStr = new Date().toISOString().slice(0, 10);
    const paperSize = sheetsState.cadPaperSize || 'A3';
    const logoUrl = sheetsState.cadLogoUrl || '';

    // Column x offsets inside title block (Total width 1092)
    const c0 = x0;          // Logo: 125px (14 -> 139)
    const c1 = x0 + 125;    // Project: 185px (139 -> 324)
    const c2 = x0 + 310;    // Screen: 230px (324 -> 554)
    const c3 = x0 + 540;    // Drawing: 190px (554 -> 744)
    const c4 = x0 + 730;    // Dimensions: 175px (744 -> 919)
    const c5 = x0 + 905;    // Date & Size: 95px (919 -> 1014)
    const c6 = x0 + 1000;   // Sheet: 106px (1014 -> 1106)

    return `
      <g class="cad-title-block">
        <rect x="${x0}" y="${tbY}" width="${tbW}" height="${tbH}" fill="#f8fafc" stroke="#334155" stroke-width="1.3" />
        <line x1="${c1}" y1="${tbY}" x2="${c1}" y2="${tbY + tbH}" stroke="#94a3b8" stroke-width="0.9" />
        <line x1="${c2}" y1="${tbY}" x2="${c2}" y2="${tbY + tbH}" stroke="#94a3b8" stroke-width="0.9" />
        <line x1="${c3}" y1="${tbY}" x2="${c3}" y2="${tbY + tbH}" stroke="#94a3b8" stroke-width="0.9" />
        <line x1="${c4}" y1="${tbY}" x2="${c4}" y2="${tbY + tbH}" stroke="#94a3b8" stroke-width="0.9" />
        <line x1="${c5}" y1="${tbY}" x2="${c5}" y2="${tbY + tbH}" stroke="#94a3b8" stroke-width="0.9" />
        <line x1="${c6}" y1="${tbY}" x2="${c6}" y2="${tbY + tbH}" stroke="#94a3b8" stroke-width="0.9" />

        <!-- COMPANY LOGO -->
        <text x="${c0 + 8}" y="${tbY + 13}" font-size="7" font-weight="700" fill="#64748b" font-family="Inter, sans-serif">COMPANY LOGO</text>
        ${logoUrl ? `
          <image href="${esc(logoUrl)}" x="${c0 + 6}" y="${tbY + 16}" width="112" height="31" preserveAspectRatio="xMidYMid meet" />
        ` : `
          <g class="cad-logo-box-trigger" style="cursor:pointer;">
            <rect x="${c0 + 6}" y="${tbY + 16}" width="112" height="30" rx="3" fill="#ffffff" stroke="#cbd5e1" stroke-dasharray="3 2" />
            <text x="${c0 + 62}" y="${tbY + 31}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#0284c7" font-family="Inter, sans-serif">+ Upload Logo</text>
            <text x="${c0 + 62}" y="${tbY + 41}" text-anchor="middle" font-size="6.5" fill="#94a3b8" font-family="Inter, sans-serif">PNG / SVG / JPG</text>
          </g>
        `}

        <!-- PROJECT -->
        <text x="${c1 + 10}" y="${tbY + 13}" font-size="7" font-weight="700" fill="#64748b" font-family="Inter, sans-serif">PROJECT</text>
        <text x="${c1 + 10}" y="${tbY + 29}" font-size="10.5" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${esc(projectTitle).slice(0, 22)}</text>
        <text x="${c1 + 10}" y="${tbY + 42}" font-size="8" fill="#475569" font-family="Inter, sans-serif">PixelLogic Engineering</text>

        <!-- SCREEN -->
        <text x="${c2 + 10}" y="${tbY + 13}" font-size="7" font-weight="700" fill="#64748b" font-family="Inter, sans-serif">SCREEN</text>
        <text x="${c2 + 10}" y="${tbY + 29}" font-size="10.5" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${esc(d.screenName).slice(0, 24)}</text>
        <text x="${c2 + 10}" y="${tbY + 42}" font-size="8" fill="#475569" font-family="Inter, sans-serif">${esc(`${d.ledBrand} ${d.ledModel} (${d.pitchMm}mm)`).slice(0, 32)}</text>

        <!-- DRAWING -->
        <text x="${c3 + 10}" y="${tbY + 13}" font-size="7" font-weight="700" fill="#64748b" font-family="Inter, sans-serif">DRAWING</text>
        <text x="${c3 + 10}" y="${tbY + 32}" font-size="11.5" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">${esc(sheetObj.upperTitle)}</text>

        <!-- DIMENSIONS -->
        <text x="${c4 + 10}" y="${tbY + 13}" font-size="7" font-weight="700" fill="#64748b" font-family="Inter, sans-serif">DIMENSIONS</text>
        <text x="${c4 + 10}" y="${tbY + 29}" font-size="10" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${d.widthM.toFixed(2)} m × ${d.heightM.toFixed(2)} m</text>
        <text x="${c4 + 10}" y="${tbY + 42}" font-size="8" fill="#475569" font-family="Inter, sans-serif">${d.cols}×${d.rows} panels · ${d.totalResW}×${d.totalResH} px</text>

        <!-- DATE & SIZE -->
        <text x="${c5 + 8}" y="${tbY + 13}" font-size="7" font-weight="700" fill="#64748b" font-family="Inter, sans-serif">DATE / FORMAT</text>
        <text x="${c5 + 8}" y="${tbY + 29}" font-size="9.5" font-weight="600" fill="#0f172a" font-family="monospace">${dateStr}</text>
        <text x="${c5 + 8}" y="${tbY + 42}" font-size="8" font-weight="800" fill="#0284c7" font-family="Inter, sans-serif">${esc(paperSize)} LANDSCAPE</text>

        <!-- SHEET X OF N -->
        <text class="cad-sheet-num-text" x="${c6 + (tbW - (c6 - x0)) / 2}" y="${tbY + 25}" text-anchor="middle" font-size="11" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">${esc(sheetsState._overrideSheetLabel || `SHEET ${sheetObj.id} OF 8`)}</text>
        <text x="${c6 + (tbW - (c6 - x0)) / 2}" y="${tbY + 40}" text-anchor="middle" font-size="6.5" font-weight="700" fill="#94a3b8" letter-spacing="0.4" font-family="Inter, sans-serif">PIXELLOGIC CAD</text>
      </g>
    `;
  }

  function renderDimLineH(x1, x2, y, label, tickYFrom, tickYTo) {
    const mid = (x1 + x2) / 2;
    const textW = Math.max(54, label.length * 6.5 + 12);
    return `
      <g class="cad-dim-h">
        ${tickYFrom != null ? `<line x1="${x1}" y1="${tickYFrom}" x2="${x1}" y2="${tickYTo}" stroke="#64748b" stroke-width="0.7" />` : ''}
        ${tickYFrom != null ? `<line x1="${x2}" y1="${tickYFrom}" x2="${x2}" y2="${tickYTo}" stroke="#64748b" stroke-width="0.7" />` : ''}
        <line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="#334155" stroke-width="1" />
        <polygon points="${x1},${y} ${x1 + 6},${y - 2.6} ${x1 + 6},${y + 2.6}" fill="#334155" />
        <polygon points="${x2},${y} ${x2 - 6},${y - 2.6} ${x2 - 6},${y + 2.6}" fill="#334155" />
        <rect x="${mid - textW / 2}" y="${y - 8}" width="${textW}" height="15" fill="#ffffff" />
        <text x="${mid}" y="${y + 3.5}" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${esc(label)}</text>
      </g>
    `;
  }

  function renderDimLineV(x, y1, y2, label, tickXFrom, tickXTo) {
    const mid = (y1 + y2) / 2;
    const textW = Math.max(52, label.length * 6.5 + 12);
    return `
      <g class="cad-dim-v">
        ${tickXFrom != null ? `<line x1="${tickXFrom}" y1="${y1}" x2="${tickXTo}" y2="${y1}" stroke="#64748b" stroke-width="0.7" />` : ''}
        ${tickXFrom != null ? `<line x1="${tickXFrom}" y1="${y2}" x2="${tickXTo}" y2="${y2}" stroke="#64748b" stroke-width="0.7" />` : ''}
        <line x1="${x}" y1="${y1}" x2="${x}" y2="${y2}" stroke="#334155" stroke-width="1" />
        <polygon points="${x},${y1} ${x - 2.6},${y1 + 6} ${x + 2.6},${y1 + 6}" fill="#334155" />
        <polygon points="${x},${y2} ${x - 2.6},${y2 - 6} ${x + 2.6},${y2 - 6}" fill="#334155" />
        <g transform="translate(${x}, ${mid}) rotate(-90)">
          <rect x="${-textW / 2}" y="-8" width="${textW}" height="15" fill="#ffffff" />
          <text x="0" y="3.5" text-anchor="middle" font-size="10" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${esc(label)}</text>
        </g>
      </g>
    `;
  }

  // =========================================================================
  // SHEET 1: DIMENSIONS (Front View, Side View, Bottom View, 3D Isometric)
  // =========================================================================
  function renderSheet1Dimensions(d, unitMode) {
    const maxFrontW = 430;
    const maxFrontH = 300;
    const aspect = (d.cols * d.panelW) / Math.max(1, d.rows * d.panelH);
    let fw = maxFrontW;
    let fh = fw / aspect;
    if (fh > maxFrontH) {
      fh = maxFrontH;
      fw = fh * aspect;
    }
    const cw = fw / d.cols;
    const ch = fh / d.rows;
    const fx = 110;
    const fy = 150;

    const fmtLen = (mVal) => unitMode === 'imperial'
      ? `${(mVal * 3.28084).toFixed(2)} ft`
      : `${mVal.toFixed(2)} m`;

    const cabWM = d.panelW / 1000;
    const cabHM = d.panelH / 1000;

    // Front View grid
    let frontPanels = '';
    for (let r = 0; r < d.rows; r++) {
      for (let c = 0; c < d.cols; c++) {
        const px = fx + c * cw;
        const py = fy + r * ch;
        frontPanels += `
          <rect x="${px.toFixed(1)}" y="${py.toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="#e8eef7" stroke="#5b7db1" stroke-width="1" />
          <circle cx="${(px + cw / 2).toFixed(1)}" cy="${(py + ch / 2).toFixed(1)}" r="1.3" fill="#94a3b8" />
        `;
      }
    }

    // Per-column bottom ticks
    let colTicks = '';
    for (let c = 0; c <= d.cols; c++) {
      const tx = fx + c * cw;
      colTicks += `<line x1="${tx.toFixed(1)}" y1="${fy + fh + 4}" x2="${tx.toFixed(1)}" y2="${fy + fh + 18}" stroke="#64748b" stroke-width="0.8" />`;
      if (c < d.cols && cw >= 28) {
        colTicks += `
          <line x1="${tx.toFixed(1)}" y1="${fy + fh + 12}" x2="${(tx + cw).toFixed(1)}" y2="${fy + fh + 12}" stroke="#64748b" stroke-width="0.7" />
          <text x="${(tx + cw / 2).toFixed(1)}" y="${fy + fh + 24}" text-anchor="middle" font-size="7.5" fill="#475569" font-family="Inter, sans-serif">${cabWM.toFixed(2)}m</text>
        `;
      }
    }

    // Per-row right ticks
    let rowTicks = '';
    for (let r = 0; r <= d.rows; r++) {
      const ty = fy + r * ch;
      rowTicks += `<line x1="${fx + fw + 4}" y1="${ty.toFixed(1)}" x2="${fx + fw + 18}" y2="${ty.toFixed(1)}" stroke="#64748b" stroke-width="0.8" />`;
      if (r < d.rows && ch >= 22) {
        rowTicks += `
          <line x1="${fx + fw + 12}" y1="${ty.toFixed(1)}" x2="${fx + fw + 12}" y2="${(ty + ch).toFixed(1)}" stroke="#64748b" stroke-width="0.7" />
          <text x="${fx + fw + 22}" y="${(ty + ch / 2 + 3).toFixed(1)}" font-size="7.5" fill="#475569" font-family="Inter, sans-serif">${cabHM.toFixed(2)}m</text>
        `;
      }
    }

    // Side View
    const sx = fx + fw + 95;
    const sy = fy;
    const sw = 18;
    let sideRows = '';
    for (let r = 0; r < d.rows; r++) {
      sideRows += `<rect x="${sx}" y="${(sy + r * ch).toFixed(1)}" width="${sw}" height="${ch.toFixed(1)}" fill="#cbd5e1" stroke="#475569" stroke-width="1" />`;
    }

    // Bottom View
    const bx = fx;
    const by = fy + fh + 74;
    const bh = 16;
    let botCols = '';
    for (let c = 0; c < d.cols; c++) {
      botCols += `<rect x="${(bx + c * cw).toFixed(1)}" y="${by}" width="${cw.toFixed(1)}" height="${bh}" fill="#cbd5e1" stroke="#475569" stroke-width="1" />`;
    }

    // 3D Isometric View (Right side)
    const isoOriginX = 760;
    const isoOriginY = 175;
    const isoScale = Math.min(220 / (d.cols * cw), 180 / (d.rows * ch));
    const icw = cw * isoScale;
    const ich = ch * isoScale;
    const cos30 = 0.866;
    const sin30 = 0.5;
    const depthPx = 14;

    const isoPt = (gx, gy, gz = 0) => ({
      x: isoOriginX + gx * cos30 + gz * cos30,
      y: isoOriginY - gx * sin30 + gy - gz * sin30
    });

    const totalIsoW = d.cols * icw;
    const totalIsoH = d.rows * ich;

    // Top depth strip & Right depth strip of 3D isometric box
    const pTL = isoPt(0, 0, 0);
    const pTR = isoPt(totalIsoW, 0, 0);
    const pBR = isoPt(totalIsoW, totalIsoH, 0);
    const pTLBack = isoPt(0, 0, depthPx);
    const pTRBack = isoPt(totalIsoW, 0, depthPx);
    const pBRBack = isoPt(totalIsoW, totalIsoH, depthPx);

    let isoPanels = `
      <polygon points="${pTL.x.toFixed(1)},${pTL.y.toFixed(1)} ${pTR.x.toFixed(1)},${pTR.y.toFixed(1)} ${pTRBack.x.toFixed(1)},${pTRBack.y.toFixed(1)} ${pTLBack.x.toFixed(1)},${pTLBack.y.toFixed(1)}" fill="#cbd5e1" stroke="#475569" stroke-width="0.9" />
      <polygon points="${pTR.x.toFixed(1)},${pTR.y.toFixed(1)} ${pBR.x.toFixed(1)},${pBR.y.toFixed(1)} ${pBRBack.x.toFixed(1)},${pBRBack.y.toFixed(1)} ${pTRBack.x.toFixed(1)},${pTRBack.y.toFixed(1)}" fill="#94a3b8" stroke="#475569" stroke-width="0.9" />
    `;

    for (let r = 0; r < d.rows; r++) {
      for (let c = 0; c < d.cols; c++) {
        const p1 = isoPt(c * icw, r * ich, 0);
        const p2 = isoPt((c + 1) * icw, r * ich, 0);
        const p3 = isoPt((c + 1) * icw, (r + 1) * ich, 0);
        const p4 = isoPt(c * icw, (r + 1) * ich, 0);
        isoPanels += `<polygon points="${p1.x.toFixed(1)},${p1.y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)} ${p3.x.toFixed(1)},${p3.y.toFixed(1)} ${p4.x.toFixed(1)},${p4.y.toFixed(1)}" fill="#dbe7f6" stroke="#5b7db1" stroke-width="0.85" />`;
      }
    }

    const pBL = isoPt(0, totalIsoH, 0);

    return `
      <!-- FRONT VIEW -->
      <g>
        ${renderDimLineH(fx, fx + fw, fy - 24, fmtLen(d.widthM), fy - 6, fy - 30)}
        ${renderDimLineV(fx - 26, fy, fy + fh, fmtLen(d.heightM), fx - 6, fx - 32)}
        <rect x="${fx}" y="${fy}" width="${fw}" height="${fh}" fill="none" stroke="#1e3a5f" stroke-width="1.8" />
        ${frontPanels}
        ${colTicks}
        ${rowTicks}
        <text x="${fx + fw / 2}" y="${fy + fh + 42}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#1e293b" letter-spacing="0.8" font-family="Inter, sans-serif">FRONT VIEW</text>
        <text x="${fx + fw / 2}" y="${fy + fh + 55}" text-anchor="middle" font-size="9" fill="#64748b" font-family="Inter, sans-serif">${d.cols} × ${d.rows} panels (${d.totalTiles} total)</text>
      </g>

      <!-- SIDE VIEW -->
      <g>
        <text x="${sx + sw / 2}" y="${sy - 14}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#334155" font-family="Inter, sans-serif">${d.depthM.toFixed(2)}m</text>
        ${sideRows}
        ${renderDimLineV(sx + sw + 26, sy, sy + fh, fmtLen(d.heightM), sx + sw + 4, sx + sw + 32)}
        <text x="${sx + sw / 2}" y="${sy + fh + 42}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#1e293b" letter-spacing="0.8" font-family="Inter, sans-serif">SIDE VIEW</text>
      </g>

      <!-- BOTTOM VIEW -->
      <g>
        <text x="${bx - 8}" y="${by + bh / 2 + 3}" text-anchor="end" font-size="8.5" font-weight="700" fill="#334155" font-family="Inter, sans-serif">${d.depthM.toFixed(2)}m</text>
        ${botCols}
        ${renderDimLineH(bx, bx + fw, by + bh + 22, fmtLen(d.widthM), by + bh + 3, by + bh + 28)}
        <text x="${bx + fw / 2}" y="${by + bh + 46}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#1e293b" letter-spacing="0.8" font-family="Inter, sans-serif">BOTTOM VIEW</text>
      </g>

      <!-- 3D ISOMETRIC VIEW -->
      <g>
        ${isoPanels}
        <text x="${((pTL.x + pTR.x) / 2 - 14).toFixed(1)}" y="${((pTL.y + pTR.y) / 2 - 12).toFixed(1)}" text-anchor="middle" font-size="9.5" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${fmtLen(d.widthM)}</text>
        <text x="${(pBRBack.x + 24).toFixed(1)}" y="${((pTRBack.y + pBRBack.y) / 2).toFixed(1)}" font-size="9.5" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${fmtLen(d.heightM)}</text>
        <text x="${(pTRBack.x + 12).toFixed(1)}" y="${(pTRBack.y - 6).toFixed(1)}" font-size="8.5" fill="#475569" font-family="Inter, sans-serif">${d.depthM.toFixed(2)}m</text>
        <text x="${((pBL.x + pBR.x) / 2).toFixed(1)}" y="${Math.max(pBL.y, pBR.y) + 32}" text-anchor="middle" font-size="10.5" font-weight="800" fill="#1e293b" letter-spacing="0.8" font-family="Inter, sans-serif">3D VIEW (ISOMETRIC)</text>
      </g>

      <!-- SUMMARY CALLOUT TABLE (Bottom-Right above Title Block) -->
      <g transform="translate(720, 430)">
        <rect x="0" y="0" width="360" height="235" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <rect x="0" y="0" width="360" height="26" rx="4" fill="#1e293b" />
        <text x="12" y="17" font-size="9.5" font-weight="800" fill="#ffffff" letter-spacing="0.6" font-family="Inter, sans-serif">DIMENSIONAL &amp; CABINET SPECIFICATIONS</text>
        ${[
          ['LED Brand / Model', `${d.ledBrand} · ${d.ledModel}`],
          ['Pixel Pitch', `P${d.pitchMm} mm`],
          ['Single Cabinet Size', `${d.panelW} × ${d.panelH} × ${d.panelDepthMm} mm`],
          ['Single Cabinet Resolution', `${d.resW} × ${d.resH} px`],
          ['Array Configuration', `${d.cols} Cols × ${d.rows} Rows (${d.totalTiles} Cabinets)`],
          ['Active Screen Width', `${d.widthM.toFixed(2)} m  (${d.widthFt.toFixed(2)} ft / ${(d.widthM * 1000).toFixed(0)} mm)`],
          ['Active Screen Height', `${d.heightM.toFixed(2)} m  (${d.heightFt.toFixed(2)} ft / ${(d.heightM * 1000).toFixed(0)} mm)`],
          ['Screen Diagonal', `${d.diagM.toFixed(2)} m  (${d.diagIn.toFixed(1)} in)`],
          ['Total Surface Area', `${(d.widthM * d.heightM).toFixed(2)} m²  (${(d.widthFt * d.heightFt).toFixed(1)} sq.ft)`]
        ].map(([k, v], i) => `
          <line x1="8" y1="${46 + i * 21}" x2="352" y2="${46 + i * 21}" stroke="#e2e8f0" stroke-width="0.7" />
          <text x="12" y="${41 + i * 21}" font-size="8.5" font-weight="600" fill="#64748b" font-family="Inter, sans-serif">${esc(k)}</text>
          <text x="348" y="${41 + i * 21}" text-anchor="end" font-size="8.5" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${esc(v)}</text>
        `).join('')}
      </g>
    `;
  }

  // =========================================================================
  // SHEET 2: RASTER MAP (Pixel Coordinates, Checkerboard, Diagonal, Aspect)
  // =========================================================================
  function renderSheet2RasterMap(d) {
    const maxW = 610;
    const maxH = 480;
    const aspect = d.totalResW / Math.max(1, d.totalResH);
    let rw = maxW;
    let rh = rw / aspect;
    if (rh > maxH) {
      rh = maxH;
      rw = rh * aspect;
    }
    const cw = rw / d.cols;
    const ch = rh / d.rows;
    const rx = 80;
    const ry = 115;

    let cells = '';
    for (let r = 0; r < d.rows; r++) {
      for (let c = 0; c < d.cols; c++) {
        const x = rx + c * cw;
        const y = ry + r * ch;
        const isEven = (c + r) % 2 === 0;
        const fill = isEven ? '#dbeafe' : '#eff6ff';
        const pxX = c * d.resW;
        const pxY = r * d.resH;
        cells += `
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="${fill}" stroke="#3b82f6" stroke-width="0.9" />
          ${cw >= 32 && ch >= 24 ? `
            <text x="${(x + 4).toFixed(1)}" y="${(y + 10).toFixed(1)}" font-size="6.8" fill="#1e40af" font-family="monospace">${pxX},${pxY}</text>
            <text x="${(x + cw / 2).toFixed(1)}" y="${(y + ch / 2 + 3).toFixed(1)}" text-anchor="middle" font-size="8.5" font-weight="700" fill="#1e3a8a" font-family="Inter, sans-serif">C${c + 1}·R${r + 1}</text>
          ` : ''}
        `;
      }
    }

    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const rad = Math.min(rw, rh) * 0.28;
    const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b));
    const g = gcd(d.totalResW, d.totalResH);
    const aspectStr = `${Math.round(d.totalResW / g)}:${Math.round(d.totalResH / g)} (${(d.totalResW / d.totalResH).toFixed(2)}:1)`;

    return `
      <g>
        <text x="${rx}" y="52" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">PIXEL &amp; CABINET RASTER MAP</text>
        <text x="${rx}" y="68" font-size="9.5" fill="#475569" font-family="Inter, sans-serif">Origin (0,0) Top-Left · Total Canvas: ${d.totalResW} × ${d.totalResH} px (${(d.totalPixels / 1e6).toFixed(2)} MP) · Aspect ${aspectStr}</text>

        ${renderDimLineH(rx, rx + rw, ry - 20, `${d.totalResW} px (${d.cols} cols × ${d.resW} px)`, ry - 4, ry - 26)}
        ${renderDimLineV(rx - 24, ry, ry + rh, `${d.totalResH} px (${d.rows} rows × ${d.resH} px)`, rx - 4, rx - 30)}

        ${cells}

        <!-- Diagonal & Test Target Circle -->
        <line x1="${rx}" y1="${ry}" x2="${rx + rw}" y2="${ry + rh}" stroke="#0f172a" stroke-width="1.1" stroke-dasharray="5,4" opacity="0.55" />
        <line x1="${rx + rw}" y1="${ry}" x2="${rx}" y2="${ry + rh}" stroke="#0f172a" stroke-width="1.1" stroke-dasharray="5,4" opacity="0.55" />
        <circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="${rad.toFixed(1)}" fill="none" stroke="#dc2626" stroke-width="1.6" stroke-dasharray="6,3" />
        <line x1="${cx - rad - 12}" y1="${cy}" x2="${cx + rad + 12}" y2="${cy}" stroke="#dc2626" stroke-width="1" />
        <line x1="${cx}" y1="${cy - rad - 12}" x2="${cx}" y2="${cy + rad + 12}" stroke="#dc2626" stroke-width="1" />
        <rect x="${cx - 78}" y="${cy - 12}" width="156" height="24" rx="4" fill="#0f172a" opacity="0.9" />
        <text x="${cx}" y="${cy + 4}" text-anchor="middle" font-size="10" font-weight="800" fill="#ffffff" font-family="monospace">${d.totalResW} × ${d.totalResH} px</text>

        <rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" fill="none" stroke="#0f172a" stroke-width="2" />
      </g>

      <!-- Right Side Raster Specification Card -->
      <g transform="translate(730, 100)">
        <rect x="0" y="0" width="350" height="310" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <rect x="0" y="0" width="350" height="28" rx="4" fill="#1e3a8a" />
        <text x="12" y="18" font-size="10" font-weight="800" fill="#ffffff" letter-spacing="0.6" font-family="Inter, sans-serif">RASTER &amp; CONTENT DELIVERY SPECS</text>
        ${[
          ['Screen Name', d.screenName],
          ['Active Raster Resolution', `${d.totalResW} × ${d.totalResH} px`],
          ['Total Pixel Count', `${d.totalPixels.toLocaleString()} px (${(d.totalPixels / 1e6).toFixed(3)} MP)`],
          ['Aspect Ratio', aspectStr],
          ['Cabinet Pixel Matrix', `${d.resW} × ${d.resH} px per tile`],
          ['Cabinet Grid Count', `${d.cols} W × ${d.rows} H = ${d.totalTiles} tiles`],
          ['Pixel Pitch', `${d.pitchMm} mm`],
          ['Pixel Density', `${Math.round(1e6 / (d.pitchMm * d.pitchMm)).toLocaleString()} px / m²`],
          ['Refresh / Bit Depth', `${d.hz} Hz · ${d.bit}-bit`],
          ['Container Standard', d.totalResW <= 1920 && d.totalResH <= 1080 ? 'FHD 1920×1080 Canvas' : (d.totalResW <= 3840 && d.totalResH <= 2160 ? 'UHD 4K 3840×2160 Canvas' : '8K / Multi-4K Sync Canvas')],
          ['Top-Left Origin', '(0, 0) px'],
          ['Bottom-Right Bound', `(${d.totalResW}, ${d.totalResH}) px`]
        ].map(([k, v], i) => `
          <line x1="10" y1="${50 + i * 22}" x2="340" y2="${50 + i * 22}" stroke="#e2e8f0" stroke-width="0.7" />
          <text x="12" y="${45 + i * 22}" font-size="8.5" font-weight="600" fill="#64748b" font-family="Inter, sans-serif">${esc(k)}</text>
          <text x="338" y="${45 + i * 22}" text-anchor="end" font-size="8.5" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${esc(v)}</text>
        `).join('')}
      </g>
    `;
  }

  // =========================================================================
  // SHEET 3: DATA WIRING (Signal Routing Diagram + Port Schedule)
  // =========================================================================
  function renderSheet3DataWiring(d) {
    const maxW = 580;
    const maxH = 470;
    const aspect = (d.cols * d.panelW) / Math.max(1, d.rows * d.panelH);
    let gw = maxW;
    let gh = gw / aspect;
    if (gh > maxH) {
      gh = maxH;
      gw = gh * aspect;
    }
    const cw = gw / d.cols;
    const ch = gh / d.rows;
    const gx = 65;
    const gy = 115;

    const tileInfo = new Map();
    d.dataPaths.forEach((path, pIdx) => {
      if (!Array.isArray(path)) return;
      path.forEach((pt, sIdx) => {
        tileInfo.set(`${pt.c}:${pt.r}`, { pIdx, step: sIdx + 1, total: path.length });
      });
    });

    let gridSvg = '';
    for (let r = 0; r < d.rows; r++) {
      for (let c = 0; c < d.cols; c++) {
        const x = gx + c * cw;
        const y = gy + r * ch;
        const info = tileInfo.get(`${c}:${r}`);
        const color = info ? PORT_COLORS[info.pIdx % PORT_COLORS.length] : '#94a3b8';
        gridSvg += `
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(cw - 1.5).toFixed(1)}" height="${(ch - 1.5).toFixed(1)}" rx="2.5" fill="${color}15" stroke="${color}" stroke-width="1.2" />
          ${cw >= 28 && ch >= 20 ? `
            <text x="${(x + 4).toFixed(1)}" y="${(y + 10).toFixed(1)}" font-size="7" fill="#475569" font-family="monospace">${c + 1},${r + 1}</text>
            ${info ? `<text x="${(x + cw - 5).toFixed(1)}" y="${(y + 10).toFixed(1)}" text-anchor="end" font-size="7.5" font-weight="700" fill="${color}" font-family="monospace">#${info.step}</text>` : ''}
          ` : ''}
        `;
      }
    }

    // Draw signal lines & arrows
    let linesSvg = '';
    d.dataPaths.forEach((path, pIdx) => {
      if (!Array.isArray(path) || !path.length) return;
      const color = PORT_COLORS[pIdx % PORT_COLORS.length];
      let dAttr = '';
      path.forEach((pt, i) => {
        const cx = gx + pt.c * cw + cw / 2;
        const cy = gy + pt.r * ch + ch / 2;
        dAttr += (i === 0 ? `M ${cx.toFixed(1)} ${cy.toFixed(1)}` : ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`);
      });
      const first = path[0];
      const fcx = gx + first.c * cw + cw / 2;
      const fcy = gy + first.r * ch + ch / 2;
      linesSvg += `
        <path d="${dAttr}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="${(fcx - 22).toFixed(1)}" y="${(fcy - 9).toFixed(1)}" width="44" height="18" rx="4" fill="${color}" stroke="#070e1a" stroke-width="1.2" />
        <text x="${fcx.toFixed(1)}" y="${(fcy + 3.8).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="800" fill="#ffffff" font-family="monospace">Port ${pIdx + 1}</text>
      `;
    });

    const wiringLabel = getWiringSummary(d.dataPattern, d.dataStartCorner);

    return `
      <g>
        <text x="${gx}" y="50" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">DATA SIGNAL ROUTING DIAGRAM</text>
        <text x="${gx}" y="66" font-size="9.5" fill="#475569" font-family="Inter, sans-serif">Style: ${esc(wiringLabel)} · ${d.primaryPortsUsed} Primary Ports (${d.effectiveDataLimit} tiles/port max @ ${d.hz}Hz ${d.bit}-bit)</text>
        ${gridSvg}
        ${linesSvg}
      </g>

      <!-- Right Side Data Port Schedule -->
      <g transform="translate(690, 60)">
        <rect x="0" y="0" width="395" height="610" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <rect x="0" y="0" width="395" height="28" rx="4" fill="#065f46" />
        <text x="12" y="18" font-size="10" font-weight="800" fill="#ffffff" letter-spacing="0.6" font-family="Inter, sans-serif">DATA PORT SCHEDULE (${d.processorName})</text>

        <text x="12" y="46" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">PORT</text>
        <text x="72" y="46" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">START → END</text>
        <text x="185" y="46" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">TILES</text>
        <text x="245" y="46" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">PIXELS</text>
        <text x="382" y="46" text-anchor="end" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">CAPACITY</text>
        <line x1="8" y1="52" x2="387" y2="52" stroke="#94a3b8" stroke-width="1" />

        ${d.dataPaths.slice(0, 22).map((path, idx) => {
          const y = 70 + idx * 22;
          const color = PORT_COLORS[idx % PORT_COLORS.length];
          const first = path[0];
          const last = path[path.length - 1];
          const pxLoad = path.length * d.resW * d.resH;
          const pct = Math.min(100, Math.round((pxLoad / Math.max(1, d.maxPixelsPerPort)) * 100));
          return `
            <line x1="8" y1="${y + 6}" x2="387" y2="${y + 6}" stroke="#e2e8f0" stroke-width="0.7" />
            <circle cx="16" cy="${y - 3}" r="4.5" fill="${color}" />
            <text x="26" y="${y}" font-size="8.5" font-weight="800" fill="#0f172a" font-family="monospace">Port ${idx + 1}</text>
            <text x="72" y="${y}" font-size="8.5" fill="#334155" font-family="monospace">(${first ? `${first.c + 1},${first.r + 1}` : '-'}) → (${last ? `${last.c + 1},${last.r + 1}` : '-'})</text>
            <text x="185" y="${y}" font-size="8.5" font-weight="700" fill="#0f172a" font-family="monospace">${path.length} tiles</text>
            <text x="245" y="${y}" font-size="8.5" fill="#334155" font-family="monospace">${pxLoad.toLocaleString()} px</text>
            <text x="382" y="${y}" text-anchor="end" font-size="8.5" font-weight="700" fill="${pct > 95 ? '#dc2626' : '#059669'}" font-family="monospace">${pct}%</text>
          `;
        }).join('')}
      </g>
    `;
  }

  // =========================================================================
  // SHEET 4: POWER WIRING (AC Circuits + 3-Phase Load Schedule)
  // =========================================================================
  function renderSheet4PowerWiring(d) {
    const maxW = 580;
    const maxH = 470;
    const aspect = (d.cols * d.panelW) / Math.max(1, d.rows * d.panelH);
    let gw = maxW;
    let gh = gw / aspect;
    if (gh > maxH) {
      gh = maxH;
      gw = gh * aspect;
    }
    const cw = gw / d.cols;
    const ch = gh / d.rows;
    const gx = 65;
    const gy = 115;

    const tileInfo = new Map();
    d.powerPaths.forEach((path, pIdx) => {
      if (!Array.isArray(path)) return;
      path.forEach((pt, sIdx) => {
        tileInfo.set(`${pt.c}:${pt.r}`, { pIdx, step: sIdx + 1 });
      });
    });

    let gridSvg = '';
    for (let r = 0; r < d.rows; r++) {
      for (let c = 0; c < d.cols; c++) {
        const x = gx + c * cw;
        const y = gy + r * ch;
        const info = tileInfo.get(`${c}:${r}`);
        const color = info ? POWER_COLORS[info.pIdx % POWER_COLORS.length] : '#94a3b8';
        gridSvg += `
          <rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${(cw - 1.5).toFixed(1)}" height="${(ch - 1.5).toFixed(1)}" rx="2.5" fill="${color}15" stroke="${color}" stroke-width="1.2" />
          ${cw >= 28 && ch >= 20 ? `
            <text x="${(x + 4).toFixed(1)}" y="${(y + 10).toFixed(1)}" font-size="7" fill="#475569" font-family="monospace">${c + 1},${r + 1}</text>
            ${info ? `<text x="${(x + cw - 5).toFixed(1)}" y="${(y + 10).toFixed(1)}" text-anchor="end" font-size="7.5" font-weight="700" fill="${color}" font-family="monospace">#${info.step}</text>` : ''}
          ` : ''}
        `;
      }
    }

    let linesSvg = '';
    d.powerPaths.forEach((path, pIdx) => {
      if (!Array.isArray(path) || !path.length) return;
      const color = POWER_COLORS[pIdx % POWER_COLORS.length];
      let dAttr = '';
      path.forEach((pt, i) => {
        const cx = gx + pt.c * cw + cw / 2;
        const cy = gy + pt.r * ch + ch / 2;
        dAttr += (i === 0 ? `M ${cx.toFixed(1)} ${cy.toFixed(1)}` : ` L ${cx.toFixed(1)} ${cy.toFixed(1)}`);
      });
      const first = path[0];
      const fcx = gx + first.c * cw + cw / 2;
      const fcy = gy + first.r * ch + ch / 2;
      linesSvg += `
        <path d="${dAttr}" fill="none" stroke="${color}" stroke-width="2.5" stroke-dasharray="6,3" stroke-linecap="round" stroke-linejoin="round" />
        <rect x="${(fcx - 16).toFixed(1)}" y="${(fcy - 8).toFixed(1)}" width="32" height="16" rx="4" fill="${color}" />
        <text x="${fcx.toFixed(1)}" y="${(fcy + 3.5).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="800" fill="#ffffff" font-family="monospace">C${pIdx + 1}·L${(pIdx % 3) + 1}</text>
      `;
    });

    const phaseLoads = [0, 0, 0];
    d.powerPaths.forEach((path, idx) => {
      phaseLoads[idx % 3] += (Array.isArray(path) ? path.length : 0) * d.perTileAmps;
    });

    const wiringLabel = getWiringSummary(d.powerPattern, d.powerStartCorner);

    return `
      <g>
        <text x="${gx}" y="50" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">AC POWER CIRCUIT ROUTING</text>
        <text x="${gx}" y="66" font-size="9.5" fill="#475569" font-family="Inter, sans-serif">Style: ${esc(wiringLabel)} · ${d.powerPaths.length} Circuits @ ${d.voltage}V (${d.circuitAmps}A Breaker · ${d.effectivePowerLimit} tiles/ckt max)</text>
        ${gridSvg}
        ${linesSvg}
      </g>

      <!-- Right Side Power Schedule & 3-Phase Balance -->
      <g transform="translate(690, 60)">
        <rect x="0" y="0" width="395" height="610" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <rect x="0" y="0" width="395" height="28" rx="4" fill="#9a3412" />
        <text x="12" y="18" font-size="10" font-weight="800" fill="#ffffff" letter-spacing="0.6" font-family="Inter, sans-serif">3-PHASE &amp; POWER CIRCUIT SCHEDULE</text>

        <!-- 3-Phase Summary Boxes -->
        <g transform="translate(10, 38)">
          ${[0, 1, 2].map((p) => `
            <rect x="${p * 126}" y="0" width="120" height="44" rx="4" fill="#fff7ed" stroke="#fdba74" stroke-width="1" />
            <text x="${p * 126 + 10}" y="16" font-size="8" font-weight="800" fill="#9a3412" font-family="Inter, sans-serif">PHASE L${p + 1}</text>
            <text x="${p * 126 + 10}" y="33" font-size="11" font-weight="800" fill="#0f172a" font-family="monospace">${phaseLoads[p].toFixed(2)} A</text>
            <text x="${p * 126 + 112}" y="33" text-anchor="end" font-size="8" fill="#64748b" font-family="monospace">${((phaseLoads[p] * d.voltage) / 1000).toFixed(2)}kW</text>
          `).join('')}
        </g>

        <text x="12" y="102" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">CIRCUIT</text>
        <text x="85" y="102" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">PHASE</text>
        <text x="145" y="102" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">TILES</text>
        <text x="215" y="102" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">WATTS</text>
        <text x="295" y="102" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">CURRENT</text>
        <text x="382" y="102" text-anchor="end" font-size="8" font-weight="800" fill="#475569" font-family="Inter, sans-serif">LOAD %</text>
        <line x1="8" y1="108" x2="387" y2="108" stroke="#94a3b8" stroke-width="1" />

        ${d.powerPaths.slice(0, 20).map((path, idx) => {
          const y = 126 + idx * 22;
          const color = POWER_COLORS[idx % POWER_COLORS.length];
          const tiles = Array.isArray(path) ? path.length : 0;
          const amps = tiles * d.perTileAmps;
          const watts = Math.round(amps * d.voltage);
          const pct = Math.round((amps / Math.max(1, d.circuitAmps)) * 100);
          return `
            <line x1="8" y1="${y + 6}" x2="387" y2="${y + 6}" stroke="#e2e8f0" stroke-width="0.7" />
            <circle cx="16" cy="${y - 3}" r="4.5" fill="${color}" />
            <text x="26" y="${y}" font-size="8.5" font-weight="800" fill="#0f172a" font-family="monospace">Ckt P${idx + 1}</text>
            <text x="85" y="${y}" font-size="8.5" font-weight="700" fill="#9a3412" font-family="monospace">L${(idx % 3) + 1}</text>
            <text x="145" y="${y}" font-size="8.5" fill="#0f172a" font-family="monospace">${tiles} tiles</text>
            <text x="215" y="${y}" font-size="8.5" fill="#334155" font-family="monospace">${watts.toLocaleString()} W</text>
            <text x="295" y="${y}" font-size="8.5" font-weight="700" fill="#0f172a" font-family="monospace">${amps.toFixed(2)} A</text>
            <text x="382" y="${y}" text-anchor="end" font-size="8.5" font-weight="700" fill="${pct > 80 ? '#dc2626' : '#ea580c'}" font-family="monospace">${pct}%</text>
          `;
        }).join('')}
      </g>
    `;
  }

  // =========================================================================
  // SHEET 5: SYSTEM DIAGRAM (Single-Line Signal & Power Block Schematic)
  // =========================================================================
  function renderSheet5SystemDiagram(d) {
    return `
      <g>
        <text x="50" y="52" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">SINGLE-LINE AV &amp; POWER SYSTEM SCHEMATIC</text>
        <text x="50" y="68" font-size="9.5" fill="#475569" font-family="Inter, sans-serif">End-to-End Signal Flow (Media Server → LED Processors → Ethernet Homeruns) &amp; 3-Phase AC Power Distribution</text>

        <!-- BLOCK 1: MEDIA SERVER / VIDEO SOURCE -->
        <g transform="translate(50, 120)">
          <rect x="0" y="0" width="230" height="175" rx="6" fill="#f8fafc" stroke="#1e293b" stroke-width="1.8" />
          <rect x="0" y="0" width="230" height="30" rx="6" fill="#1e293b" />
          <text x="14" y="19" font-size="10" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">1. VIDEO SOURCE / MEDIA SERVER</text>
          <text x="14" y="54" font-size="10" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">Primary Playback Engine</text>
          <text x="14" y="74" font-size="9" fill="#475569" font-family="monospace">Raster: ${d.totalResW} × ${d.totalResH} px</text>
          <text x="14" y="92" font-size="9" fill="#475569" font-family="monospace">Frame Rate: ${d.hz} Hz (${d.bit}-bit)</text>
          <text x="14" y="110" font-size="9" fill="#475569" font-family="monospace">Signal: HDMI 2.0 / DP 1.4 / 12G-SDI</text>
          <text x="14" y="128" font-size="9" fill="#475569" font-family="monospace">Genlock: Tri-Level Sync / PTP</text>
          <rect x="14" y="140" width="202" height="22" rx="4" fill="#dbeafe" />
          <text x="115" y="155" text-anchor="middle" font-size="8.5" font-weight="700" fill="#1e40af" font-family="Inter, sans-serif">${d.processorsNeeded}× Video Feed${d.processorsNeeded > 1 ? 's' : ''} to Processor Rack</text>
        </g>

        <!-- Arrow Video Source -> Processor -->
        <line x1="280" y1="205" x2="390" y2="205" stroke="#0284c7" stroke-width="2.5" />
        <polygon points="390,205 380,200 380,210" fill="#0284c7" />
        <rect x="295" y="182" width="80" height="18" rx="3" fill="#e0f2fe" stroke="#0284c7" stroke-width="0.8" />
        <text x="335" y="194" text-anchor="middle" font-size="8" font-weight="700" fill="#0369a1" font-family="monospace">HDMI / 12G-SDI</text>

        <!-- BLOCK 2: LED PROCESSOR RACK -->
        <g transform="translate(395, 105)">
          <rect x="0" y="0" width="280" height="210" rx="6" fill="#f8fafc" stroke="#0284c7" stroke-width="1.8" />
          <rect x="0" y="0" width="280" height="30" rx="6" fill="#0284c7" />
          <text x="14" y="19" font-size="10" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">2. LED PROCESSOR RACK (${d.processorsNeeded}× UNIT)</text>
          <text x="14" y="54" font-size="10.5" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">${esc(d.processorName)}</text>
          <text x="14" y="74" font-size="9" fill="#334155" font-family="monospace">Primary RJ45 Ports: ${d.primaryPortsUsed} Ports</text>
          <text x="14" y="92" font-size="9" fill="#334155" font-family="monospace">Redundancy Backup: ${d.redundancyMode ? `${d.primaryPortsUsed} Backup Ports (Active)` : 'None (Primary Only)'}</text>
          <text x="14" y="110" font-size="9" fill="#334155" font-family="monospace">Total Network Runs: ${d.totalPortsUsed}× CAT6A EtherCON</text>
          <text x="14" y="128" font-size="9" fill="#334155" font-family="monospace">Max Load / Port: ${d.effectiveDataLimit} tiles (${d.maxPixelsPerPort.toLocaleString()} px)</text>
          <g transform="translate(14, 144)">
            ${Array.from({ length: Math.min(12, d.primaryPortsUsed) }).map((_, i) => `
              <rect x="${(i % 6) * 42}" y="${Math.floor(i / 6) * 24}" width="38" height="18" rx="3" fill="${PORT_COLORS[i % PORT_COLORS.length]}" />
              <text x="${(i % 6) * 42 + 19}" y="${Math.floor(i / 6) * 24 + 12}" text-anchor="middle" font-size="7.5" font-weight="800" fill="#ffffff" font-family="monospace">P${i + 1}</text>
            `).join('')}
          </g>
        </g>

        <!-- BLOCK 3: POWER DISTRO RACK -->
        <g transform="translate(395, 365)">
          <rect x="0" y="0" width="280" height="205" rx="6" fill="#f8fafc" stroke="#ea580c" stroke-width="1.8" />
          <rect x="0" y="0" width="280" height="30" rx="6" fill="#ea580c" />
          <text x="14" y="19" font-size="10" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">3. AC POWER DISTRIBUTION RACK</text>
          <text x="14" y="54" font-size="10.5" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">${d.voltage}V AC 3-Phase (L1 / L2 / L3 + N + PE)</text>
          <text x="14" y="74" font-size="9" fill="#334155" font-family="monospace">Branch Circuits: ${d.powerPaths.length}× ${d.circuitAmps}A Breakers</text>
          <text x="14" y="92" font-size="9" fill="#334155" font-family="monospace">Continuous Limit: ${d.effectiveBreakerAmps}A (${d.use80Percent ? '80% Safe' : '100%'})</text>
          <text x="14" y="110" font-size="9" fill="#334155" font-family="monospace">Max Cabinets / Ckt: ${d.effectivePowerLimit} tiles/circuit</text>
          <text x="14" y="128" font-size="9" fill="#334155" font-family="monospace">Total Peak Power: ${(d.peakWatts / 1000).toFixed(2)} kW (${(d.totalTiles * d.perTileAmps).toFixed(1)} A)</text>
          <g transform="translate(14, 144)">
            ${Array.from({ length: Math.min(12, d.powerPaths.length) }).map((_, i) => `
              <rect x="${(i % 6) * 42}" y="${Math.floor(i / 6) * 24}" width="38" height="18" rx="3" fill="${POWER_COLORS[i % POWER_COLORS.length]}" />
              <text x="${(i % 6) * 42 + 19}" y="${Math.floor(i / 6) * 24 + 12}" text-anchor="middle" font-size="7.5" font-weight="800" fill="#ffffff" font-family="monospace">C${i + 1}</text>
            `).join('')}
          </g>
        </g>

        <!-- Arrows to LED Wall -->
        <line x1="675" y1="205" x2="785" y2="255" stroke="#16a34a" stroke-width="2.5" />
        <text x="730" y="212" text-anchor="middle" font-size="8" font-weight="800" fill="#15803d" font-family="monospace">${d.totalPortsUsed}× CAT6A</text>

        <line x1="675" y1="465" x2="785" y2="395" stroke="#ea580c" stroke-width="2.5" stroke-dasharray="6,3" />
        <text x="730" y="452" text-anchor="middle" font-size="8" font-weight="800" fill="#c2410c" font-family="monospace">${d.powerPaths.length}× True1 AC</text>

        <!-- BLOCK 4: LED WALL ARRAY -->
        <g transform="translate(785, 145)">
          <rect x="0" y="0" width="295" height="365" rx="6" fill="#f8fafc" stroke="#0f172a" stroke-width="2" />
          <rect x="0" y="0" width="295" height="32" rx="6" fill="#0f172a" />
          <text x="14" y="20" font-size="10.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">4. LED WALL: ${esc(d.screenName.toUpperCase())}</text>
          <text x="14" y="56" font-size="10.5" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">${esc(`${d.ledBrand} ${d.ledModel}`)}</text>
          <text x="14" y="74" font-size="9" fill="#475569" font-family="Inter, sans-serif">Pixel Pitch: P${d.pitchMm} mm · ${d.cols}×${d.rows} (${d.totalTiles} Panels)</text>
          <text x="14" y="92" font-size="9" fill="#475569" font-family="Inter, sans-serif">Dimensions: ${d.widthM.toFixed(2)}m W × ${d.heightM.toFixed(2)}m H</text>
          <text x="14" y="110" font-size="9" fill="#475569" font-family="Inter, sans-serif">Data Path: ${esc(getWiringSummary(d.dataPattern, d.dataStartCorner))}</text>
          <text x="14" y="128" font-size="9" fill="#475569" font-family="Inter, sans-serif">Power Path: ${esc(getWiringSummary(d.powerPattern, d.powerStartCorner))}</text>

          <!-- Mini Visual Wall Preview -->
          <g transform="translate(22, 148)">
            <rect x="0" y="0" width="250" height="190" fill="#e2e8f0" stroke="#475569" stroke-width="1.2" />
            ${Array.from({ length: d.rows }).map((_, r) =>
              Array.from({ length: d.cols }).map((__, c) => {
                const mw = 250 / d.cols;
                const mh = 190 / d.rows;
                return `<rect x="${(c * mw).toFixed(1)}" y="${(r * mh).toFixed(1)}" width="${mw.toFixed(1)}" height="${mh.toFixed(1)}" fill="#dbeafe" stroke="#64748b" stroke-width="0.6" />`;
              }).join('')
            ).join('')}
          </g>
        </g>
      </g>
    `;
  }

  // =========================================================================
  // SHEET 6: WEIGHT ESTIMATE (Rigging Diagram + Structural Load Breakdown)
  // =========================================================================
  function renderSheet6WeightEstimate(d) {
    const gx = 80;
    const gy = 165;
    const gw = 520;
    const gh = 310;
    const cw = gw / d.cols;
    const ch = gh / d.rows;
    const loadPerHoistKg = d.designWllKg / d.hoistCount;
    const loadPerHoistLbs = loadPerHoistKg * 2.20462;

    let hoistIcons = '';
    for (let i = 0; i < d.hoistCount; i++) {
      const hx = gx + ((i + 0.5) / d.hoistCount) * gw;
      hoistIcons += `
        <line x1="${hx.toFixed(1)}" y1="${gy - 55}" x2="${hx.toFixed(1)}" y2="${gy - 14}" stroke="#0f172a" stroke-width="2" />
        <polygon points="${hx.toFixed(1)},${gy - 14} ${(hx - 5).toFixed(1)},${gy - 24} ${(hx + 5).toFixed(1)},${gy - 24}" fill="#dc2626" />
        <rect x="${(hx - 48).toFixed(1)}" y="${gy - 82}" width="96" height="26" rx="4" fill="#fef2f2" stroke="#dc2626" stroke-width="1.1" />
        <text x="${hx.toFixed(1)}" y="${gy - 66}" text-anchor="middle" font-size="8.5" font-weight="800" fill="#991b1b" font-family="monospace">H${i + 1}: ${loadPerHoistKg.toFixed(1)} kg</text>
      `;
    }

    let grid = '';
    for (let r = 0; r < d.rows; r++) {
      for (let c = 0; c < d.cols; c++) {
        grid += `<rect x="${(gx + c * cw).toFixed(1)}" y="${(gy + r * ch).toFixed(1)}" width="${cw.toFixed(1)}" height="${ch.toFixed(1)}" fill="#e2e8f0" stroke="#64748b" stroke-width="0.9" />`;
      }
    }

    return `
      <g>
        <text x="80" y="50" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">STRUCTURAL WEIGHT &amp; RIGGING ESTIMATE</text>
        <text x="80" y="66" font-size="9.5" fill="#475569" font-family="Inter, sans-serif">${d.hoistCount} Rigging Pick Points · Column Weight: ${(d.rows * d.singleCabWeightKg).toFixed(1)} kg/col · Safety Factor: 1.25× Dynamic WLL</text>

        <!-- Rigging Header Truss Bar -->
        <rect x="${gx - 8}" y="${gy - 14}" width="${gw + 16}" height="12" rx="2" fill="#334155" />
        ${hoistIcons}
        ${grid}

        <!-- Center of Gravity Marker -->
        <circle cx="${gx + gw / 2}" cy="${gy + gh / 2}" r="14" fill="#ffffff" stroke="#dc2626" stroke-width="2" />
        <line x1="${gx + gw / 2 - 18}" y1="${gy + gh / 2}" x2="${gx + gw / 2 + 18}" y2="${gy + gh / 2}" stroke="#dc2626" stroke-width="1.5" />
        <line x1="${gx + gw / 2}" y1="${gy + gh / 2 - 18}" x2="${gx + gw / 2}" y2="${gy + gh / 2 + 18}" stroke="#dc2626" stroke-width="1.5" />
        <text x="${gx + gw / 2}" y="${gy + gh / 2 + 30}" text-anchor="middle" font-size="9" font-weight="800" fill="#dc2626" font-family="Inter, sans-serif">CENTER OF GRAVITY (CG)</text>
      </g>

      <!-- Right Weight Table -->
      <g transform="translate(665, 85)">
        <rect x="0" y="0" width="415" height="450" rx="4" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1" />
        <rect x="0" y="0" width="415" height="28" rx="4" fill="#1e293b" />
        <text x="12" y="18" font-size="10" font-weight="800" fill="#ffffff" letter-spacing="0.6" font-family="Inter, sans-serif">STRUCTURAL WEIGHT BREAKDOWN (KG / LBS)</text>
        ${[
          ['Single Cabinet Mass', `${d.singleCabWeightKg.toFixed(1)} kg  (${(d.singleCabWeightKg * 2.20462).toFixed(1)} lbs)`],
          ['Total LED Panels (' + d.totalTiles + ' pcs)', `${d.panelsWeightKg.toFixed(1)} kg  (${(d.panelsWeightKg * 2.20462).toFixed(1)} lbs)`],
          ['Rigging Header Bars (' + d.cols + ' pcs)', `${d.riggingBarWeightKg.toFixed(1)} kg  (${(d.riggingBarWeightKg * 2.20462).toFixed(1)} lbs)`],
          ['Power & Data Cabling (10%)', `${d.cablingAllowanceKg.toFixed(1)} kg  (${(d.cablingAllowanceKg * 2.20462).toFixed(1)} lbs)`],
          ['TOTAL NET WEIGHT', `${d.totalNetWeightKg.toFixed(1)} kg  (${(d.totalNetWeightKg * 2.20462).toFixed(1)} lbs)`],
          ['Dynamic Rigging Allowance (25%)', `${(d.totalNetWeightKg * 0.25).toFixed(1)} kg  (${(d.totalNetWeightKg * 0.25 * 2.20462).toFixed(1)} lbs)`],
          ['DESIGN WORKING LOAD (WLL)', `${d.designWllKg.toFixed(1)} kg  (${(d.designWllKg * 2.20462).toFixed(1)} lbs)`],
          ['Recommended Hoist Points', `${d.hoistCount} Points`],
          ['Load per Hoist Point (WLL)', `${loadPerHoistKg.toFixed(1)} kg  (${loadPerHoistLbs.toFixed(1)} lbs)`],
          ['Linear Truss Load', `${(d.designWllKg / Math.max(0.1, d.widthM)).toFixed(1)} kg/m  (${((d.designWllKg * 2.20462) / Math.max(0.1, d.widthFt)).toFixed(1)} lbs/ft)`],
          ['Surface Area Density', `${(d.totalNetWeightKg / Math.max(0.1, d.widthM * d.heightM)).toFixed(1)} kg/m²`],
          ['Column Suspended Load', `${(d.rows * d.singleCabWeightKg).toFixed(1)} kg per vertical column`]
        ].map(([k, v], i) => `
          <line x1="10" y1="${52 + i * 33}" x2="405" y2="${52 + i * 33}" stroke="#e2e8f0" stroke-width="0.8" />
          <text x="14" y="${46 + i * 33}" font-size="9" font-weight="${k.includes('TOTAL') || k.includes('DESIGN') ? '800' : '600'}" fill="#334155" font-family="Inter, sans-serif">${esc(k)}</text>
          <text x="400" y="${46 + i * 33}" text-anchor="end" font-size="9" font-weight="800" fill="${k.includes('DESIGN') ? '#dc2626' : '#0f172a'}" font-family="monospace">${esc(v)}</text>
        `).join('')}
      </g>
    `;
  }

  // =========================================================================
  // SHEET 7: HEAT LOAD (BTU/hr, kCal/hr, Cooling Tons & HVAC Airflow)
  // =========================================================================
  function renderSheet7HeatLoad(d) {
    const scenarios = [
      { label: 'Peak Full White (100%)', watts: d.peakWatts, btu: d.peakBtuHr, color: '#dc2626' },
      { label: 'Typical Broadcast Video (55%)', watts: d.avgWatts, btu: d.avgBtuHr, color: '#ea580c' },
      { label: 'Half Brightness Mode (50%)', watts: d.halfWatts, btu: d.halfBtuHr, color: '#d97706' },
      { label: 'Blackout / Standby (15%)', watts: d.standbyWatts, btu: d.standbyBtuHr, color: '#0284c7' }
    ];
    const maxBtu = Math.max(1, d.peakBtuHr);

    return `
      <g>
        <text x="70" y="52" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">THERMAL DISSIPATION &amp; HVAC HEAT LOAD (BTU/HR)</text>
        <text x="70" y="68" font-size="9.5" fill="#475569" font-family="Inter, sans-serif">1 Watt = 3.41214 BTU/hr · 1 Ton of Cooling (TR) = 12,000 BTU/hr · Calculated for ${d.totalTiles} Panels (${d.ledBrand} ${d.ledModel})</text>

        <!-- Left Side Bar Comparison Chart -->
        <g transform="translate(70, 110)">
          <rect x="0" y="0" width="540" height="420" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
          <text x="20" y="30" font-size="11" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">THERMAL OUTPUT BY OPERATING MODE</text>

          ${scenarios.map((s, idx) => {
            const y = 65 + idx * 85;
            const barW = Math.max(20, (s.btu / maxBtu) * 460);
            const tons = s.btu / 12000;
            return `
              <text x="20" y="${y}" font-size="10" font-weight="700" fill="#1e293b" font-family="Inter, sans-serif">${esc(s.label)}</text>
              <text x="515" y="${y}" text-anchor="end" font-size="10" font-weight="800" fill="${s.color}" font-family="monospace">${Math.round(s.btu).toLocaleString()} BTU/hr (${tons.toFixed(2)} TR)</text>
              <rect x="20" y="${y + 10}" width="495" height="24" rx="4" fill="#e2e8f0" />
              <rect x="20" y="${y + 10}" width="${barW.toFixed(1)}" height="24" rx="4" fill="${s.color}" />
              <text x="28" y="${y + 26}" font-size="8.5" font-weight="700" fill="#ffffff" font-family="monospace">${(s.watts / 1000).toFixed(2)} kW Thermal · ${Math.round(s.btu * 0.252).toLocaleString()} kCal/hr</text>
            `;
          }).join('')}
        </g>

        <!-- Right Side HVAC Engineering Table -->
        <g transform="translate(650, 110)">
          <rect x="0" y="0" width="430" height="420" rx="6" fill="#f8fafc" stroke="#cbd5e1" stroke-width="1.2" />
          <rect x="0" y="0" width="430" height="30" rx="6" fill="#9a3412" />
          <text x="14" y="19" font-size="10" font-weight="800" fill="#ffffff" letter-spacing="0.6" font-family="Inter, sans-serif">HVAC &amp; VENUE COOLING SPECIFICATION</text>
          ${[
            ['Single Cabinet Heat (Peak)', `${Math.round(d.perTileWatts * 3.41214)} BTU/hr (${d.perTileWatts} W)`],
            ['Peak Thermal Load (100% White)', `${Math.round(d.peakBtuHr).toLocaleString()} BTU/hr`],
            ['Typical Video Heat Load (55%)', `${Math.round(d.avgBtuHr).toLocaleString()} BTU/hr`],
            ['50% Brightness Heat Load', `${Math.round(d.halfBtuHr).toLocaleString()} BTU/hr`],
            ['Standby Heat Load (Blackout)', `${Math.round(d.standbyBtuHr).toLocaleString()} BTU/hr`],
            ['Peak Metric Heat (kCal/hr)', `${Math.round(d.peakBtuHr * 0.251996).toLocaleString()} kCal/hr`],
            ['Peak Cooling Tonnage (TR)', `${d.coolingTonsPeak.toFixed(2)} Tons of Refrigeration`],
            ['Recommended Continuous HVAC', `${d.coolingTonsAvg.toFixed(2)} Tons of Refrigeration`],
            ['Required Exhaust Airflow (CFM)', `${Math.round(d.airflowCfmAvg).toLocaleString()} CFM (at ΔT = 10°C / 18°F)`],
            ['Required Airflow (Metric)', `${Math.round(d.airflowCfmAvg * 1.699).toLocaleString()} m³/hr`],
            ['Heat Flux per Screen Area', `${Math.round(d.peakBtuHr / Math.max(0.1, d.widthM * d.heightM)).toLocaleString()} BTU/hr/m²`]
          ].map(([k, v], i) => `
            <line x1="12" y1="${58 + i * 33}" x2="418" y2="${58 + i * 33}" stroke="#e2e8f0" stroke-width="0.8" />
            <text x="14" y="${52 + i * 33}" font-size="9" font-weight="600" fill="#334155" font-family="Inter, sans-serif">${esc(k)}</text>
            <text x="414" y="${52 + i * 33}" text-anchor="end" font-size="9" font-weight="800" fill="#0f172a" font-family="monospace">${esc(v)}</text>
          `).join('')}
        </g>
      </g>
    `;
  }

  // =========================================================================
  // SHEET 8: BILL OF MATERIALS (Complete Hardware & Cabling BOM)
  // =========================================================================
  function renderSheet8Bom(d) {
    const sparePanels = Math.max(2, Math.ceil(d.totalTiles * 0.05));
    const spareModules = Math.max(8, Math.ceil(d.totalTiles * 4 * 0.05));
    const dataJumpers = Math.max(0, d.totalTiles - d.primaryPortsUsed);
    const powerJumpers = Math.max(0, d.totalTiles - d.powerPaths.length);
    const flightCases = Math.ceil((d.totalTiles + sparePanels) / 8);

    const bomRows = [
      ['01', 'LED Display', `${d.ledBrand} ${d.ledModel} LED Cabinet`, `P${d.pitchMm}mm · ${d.panelW}×${d.panelH}mm (${d.resW}×${d.resH}px)`, d.totalTiles, sparePanels, d.totalTiles + sparePanels, 'pcs'],
      ['02', 'Service Spares', `${d.ledBrand} Spare LED Modules & Hub Cards`, `Matched batch P${d.pitchMm}mm magnetic modules`, spareModules, 0, spareModules, 'pcs'],
      ['03', 'Processing', d.processorName, `${d.hz}Hz ${d.bit}-bit LED Controller (${d.processorPorts} ports/unit)`, d.processorsNeeded, 1, d.processorsNeeded + 1, 'units'],
      ['04', 'Data Homeruns', 'CAT6A Shielded EtherCON Snake / Homerun', `Processor Rack to Wall Start Tiles (50m)`, d.totalPortsUsed, Math.max(1, Math.ceil(d.totalPortsUsed * 0.1)), d.totalPortsUsed + Math.max(1, Math.ceil(d.totalPortsUsed * 0.1)), 'runs'],
      ['05', 'Data Jumpers', 'CAT6A EtherCON Panel-to-Panel Link Cable', `1.0m / 1.5m Tour-Grade Patch Jumpers`, dataJumpers, Math.max(4, Math.ceil(dataJumpers * 0.1)), dataJumpers + Math.max(4, Math.ceil(dataJumpers * 0.1)), 'pcs'],
      ['06', 'Power Feeds', `${d.circuitAmps}A AC Power Feed Cable (${d.voltage}V)`, `Distro to Wall Power-In (Neutrik True1 / PowerCON)`, d.powerPaths.length, Math.max(1, Math.ceil(d.powerPaths.length * 0.1)), d.powerPaths.length + Math.max(1, Math.ceil(d.powerPaths.length * 0.1)), 'ckts'],
      ['07', 'Power Jumpers', 'AC Panel-to-Panel Power Link Jumper', `1.2m 3×2.5mm² True1 / PowerCON Daisy-Chain`, powerJumpers, Math.max(4, Math.ceil(powerJumpers * 0.1)), powerJumpers + Math.max(4, Math.ceil(powerJumpers * 0.1)), 'pcs'],
      ['08', 'Rigging', `${d.panelW}mm Universal Rigging / Ground Header Bar`, `Rated WLL ${Math.ceil(d.designWllKg / d.cols)} kg per column`, d.cols, 1, d.cols + 1, 'pcs'],
      ['09', 'Hoists', `Chain Hoist Pick Points (${d.hoistCount} Points)`, `Min ${Math.ceil((d.designWllKg / d.hoistCount) * 1.5)} kg capacity per point`, d.hoistCount, 0, d.hoistCount, 'pts'],
      ['10', 'Packaging', '8-in-1 Road Flight Cases', `Touring foam-lined road cases for ${d.panelW}×${d.panelH}mm`, flightCases, 0, flightCases, 'cases']
    ];

    return `
      <g>
        <text x="45" y="50" font-size="14" font-weight="800" fill="#0f172a" font-family="Inter, sans-serif">PROJECT BILL OF MATERIALS (BOM) &amp; SPARES SCHEDULE</text>
        <text x="45" y="66" font-size="9.5" fill="#475569" font-family="Inter, sans-serif">Screen: ${esc(d.screenName)} (${d.cols}×${d.rows} = ${d.totalTiles} Panels) · Includes 5–10% Recommended Touring Field Spares</text>

        <g transform="translate(45, 85)">
          <rect x="0" y="0" width="1030" height="545" rx="4" fill="#ffffff" stroke="#94a3b8" stroke-width="1.2" />
          <rect x="0" y="0" width="1030" height="32" rx="4" fill="#0f172a" />

          <text x="16" y="20" font-size="8.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">ITEM</text>
          <text x="65" y="20" font-size="8.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">CATEGORY</text>
          <text x="180" y="20" font-size="8.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">PART / HARDWARE DESCRIPTION</text>
          <text x="485" y="20" font-size="8.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">TECHNICAL SPECIFICATION</text>
          <text x="775" y="20" text-anchor="end" font-size="8.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">ACTIVE QTY</text>
          <text x="865" y="20" text-anchor="end" font-size="8.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">SPARES</text>
          <text x="955" y="20" text-anchor="end" font-size="8.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">TOTAL QTY</text>
          <text x="1015" y="20" text-anchor="end" font-size="8.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">UNIT</text>

          ${bomRows.map((r, i) => {
            const y = 62 + i * 48;
            return `
              <rect x="1" y="${y - 24}" width="1028" height="46" fill="${i % 2 === 0 ? '#f8fafc' : '#ffffff'}" />
              <line x1="0" y1="${y + 22}" x2="1030" y2="${y + 22}" stroke="#e2e8f0" stroke-width="0.9" />
              <text x="16" y="${y}" font-size="9.5" font-weight="800" fill="#64748b" font-family="monospace">${r[0]}</text>
              <text x="65" y="${y}" font-size="9.5" font-weight="700" fill="#0284c7" font-family="Inter, sans-serif">${esc(r[1])}</text>
              <text x="180" y="${y}" font-size="9.5" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${esc(r[2])}</text>
              <text x="485" y="${y}" font-size="9" fill="#475569" font-family="Inter, sans-serif">${esc(r[3])}</text>
              <text x="775" y="${y}" text-anchor="end" font-size="10" font-weight="700" fill="#0f172a" font-family="monospace">${r[4]}</text>
              <text x="865" y="${y}" text-anchor="end" font-size="10" font-weight="600" fill="#059669" font-family="monospace">+${r[5]}</text>
              <text x="955" y="${y}" text-anchor="end" font-size="10.5" font-weight="800" fill="#0f172a" font-family="monospace">${r[6]}</text>
              <text x="1015" y="${y}" text-anchor="end" font-size="8.5" font-weight="700" fill="#64748b" font-family="Inter, sans-serif">${r[7]}</text>
            `;
          }).join('')}
        </g>
      </g>
    `;
  }

  function renderUserAnnotationsSvg(annotations) {
    if (!Array.isArray(annotations) || !annotations.length) return '';
    return annotations.map((ann, idx) => {
      if (ann.type === 'leader') {
        return `
          <g class="cad-user-ann" data-ann-idx="${idx}">
            <line x1="${ann.x}" y1="${ann.y}" x2="${ann.x - 45}" y2="${ann.y + 32}" stroke="#dc2626" stroke-width="1.5" />
            <circle cx="${ann.x - 45}" cy="${ann.y + 32}" r="3" fill="#dc2626" />
            <rect x="${ann.x}" y="${ann.y - 16}" width="${Math.max(90, ann.text.length * 6.5 + 16)}" height="22" rx="3" fill="#fef2f2" stroke="#dc2626" stroke-width="1.2" />
            <text x="${ann.x + 8}" y="${ann.y - 2}" font-size="9.5" font-weight="700" fill="#991b1b" font-family="Inter, sans-serif">${esc(ann.text)}</text>
          </g>
        `;
      }
      if (ann.type === 'block') {
        return `
          <g class="cad-user-ann" transform="translate(${ann.x}, ${ann.y})">
            <rect x="0" y="0" width="190" height="58" rx="4" fill="#f8fafc" stroke="#0f172a" stroke-width="1.3" />
            <rect x="0" y="0" width="190" height="16" rx="4" fill="#0f172a" />
            <text x="8" y="11" font-size="7.5" font-weight="800" fill="#ffffff" font-family="Inter, sans-serif">${esc(ann.title || 'ENGINEERING BLOCK')}</text>
            <text x="8" y="32" font-size="8.5" font-weight="700" fill="#0f172a" font-family="Inter, sans-serif">${esc(ann.line1 || '')}</text>
            <text x="8" y="46" font-size="8" fill="#475569" font-family="monospace">${esc(ann.line2 || '')}</text>
          </g>
        `;
      }
      return `
        <g class="cad-user-ann" data-ann-idx="${idx}">
          <rect x="${ann.x}" y="${ann.y}" width="${Math.max(110, ann.text.length * 6.5 + 18)}" height="24" rx="3" fill="#fefce8" stroke="#ca8a04" stroke-width="1.2" />
          <text x="${ann.x + 8}" y="${ann.y + 15}" font-size="9.5" font-weight="700" fill="#854d0e" font-family="Inter, sans-serif">${esc(ann.text)}</text>
        </g>
      `;
    }).join('');
  }

  function renderSingleSheetSvg(sheetId, projectTitle, d, sheetsState) {
    const W = 1120;
    const H = 790;
    const sheetObj = DRAWING_SHEETS.find((s) => s.id === Number(sheetId)) || DRAWING_SHEETS[0];
    const unitMode = sheetsState.cadUnitMode || 'metric';
    const annKey = `${d.map.id || 'default'}_sheet_${sheetObj.id}`;
    const annotations = (sheetsState.cadAnnotations && sheetsState.cadAnnotations[annKey]) || [];

    let bodySvg = '';
    if (sheetObj.id === 1) bodySvg = renderSheet1Dimensions(d, unitMode);
    else if (sheetObj.id === 2) bodySvg = renderSheet2RasterMap(d);
    else if (sheetObj.id === 3) bodySvg = renderSheet3DataWiring(d);
    else if (sheetObj.id === 4) bodySvg = renderSheet4PowerWiring(d);
    else if (sheetObj.id === 5) bodySvg = renderSheet5SystemDiagram(d);
    else if (sheetObj.id === 6) bodySvg = renderSheet6WeightEstimate(d);
    else if (sheetObj.id === 7) bodySvg = renderSheet7HeatLoad(d);
    else bodySvg = renderSheet8Bom(d);

    return `
      <svg id="pl-cad-sheet-svg" xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="display:block;background:#ffffff;user-select:none;">
        <!-- Outer Architectural Sheet Border -->
        <rect x="0" y="0" width="${W}" height="${H}" fill="#ffffff" />
        <rect x="14" y="14" width="${W - 28}" height="${H - 28}" fill="none" stroke="#334155" stroke-width="1.4" />
        ${bodySvg}
        ${renderUserAnnotationsSvg(annotations)}
        ${renderTitleBlockSvg(W, H, projectTitle, d, sheetObj, sheetsState)}
      </svg>
    `;
  }

  function openCadPrintWindow(title, subtitle, pagesHtml, paperKey, initialSelectedIds) {
    const paperCfg = PAPER_SIZES[paperKey] || PAPER_SIZES['A3'];
    const selIds = Array.isArray(initialSelectedIds) && initialSelectedIds.length > 0
      ? initialSelectedIds
      : DEFAULT_PDF_SHEET_IDS;
    const win = window.open('', '_blank', 'width=1280,height=920');
    if (!win) {
      alert('Popup window was blocked by your browser. Please allow popups for PixelLogic to open the PDF drawing package.');
      return;
    }
    const filterCheckboxesHtml = DRAWING_SHEETS.map((s) => {
      const checked = selIds.includes(s.id) ? 'checked' : '';
      return `<label class="sheet-toggle-chip"><input type="checkbox" class="pdf-sheet-cb" value="${s.id}" ${checked} /><span>${s.id}. ${esc(s.title)}</span></label>`;
    }).join('');

    win.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${esc(title)}</title>
  <style>
    @page {
      size: ${paperCfg.cssSize};
      margin: ${paperCfg.margin};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: #0f172a;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif;
      color: #334155;
    }
    .print-toolbar {
      position: sticky;
      top: 0;
      z-index: 9999;
      background: #090d16;
      border-bottom: 1px solid #1e293b;
      padding: 10px 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    }
    .print-toolbar-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
    }
    .print-toolbar-sheets {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 6px;
      padding-top: 6px;
      border-top: 1px solid #1e293b;
    }
    .print-toolbar-sheets .filter-label {
      font-size: 10px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #38bdf8;
      margin-right: 4px;
    }
    .sheet-toggle-chip {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 9px;
      background: #131c2e;
      border: 1px solid #334155;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      color: #e2e8f0;
      cursor: pointer;
      user-select: none;
    }
    .sheet-toggle-chip:hover {
      border-color: #38bdf8;
      background: #1e293b;
    }
    .sheet-toggle-chip input {
      accent-color: #0284c7;
      cursor: pointer;
      margin: 0;
    }
    .quick-filter-btn {
      background: #1e293b;
      color: #94a3b8;
      border: 1px solid #334155;
      border-radius: 4px;
      padding: 3px 8px;
      font-size: 10px;
      font-weight: 700;
      cursor: pointer;
    }
    .quick-filter-btn:hover {
      color: #ffffff;
      border-color: #475569;
    }
    .print-toolbar .title-area h1 {
      margin: 0;
      font-size: 15px;
      font-weight: 800;
      color: #f8fafc;
      letter-spacing: -0.01em;
    }
    .print-toolbar .title-area p {
      margin: 3px 0 0;
      font-size: 12px;
      color: #94a3b8;
    }
    .print-toolbar .actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      padding: 5px 12px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 700;
      background: rgba(2, 132, 199, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(2, 132, 199, 0.35);
    }
    .btn-print {
      background: linear-gradient(135deg, #0284c7, #2563eb);
      color: #ffffff;
      border: none;
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 800;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(2, 132, 199, 0.4);
      display: inline-flex;
      align-items: center;
      gap: 8px;
    }
    .btn-print:hover {
      background: linear-gradient(135deg, #0369a1, #1d4ed8);
    }
    .sheet-wrapper {
      width: 1120px;
      margin: 24px auto;
      background: #ffffff;
      box-shadow: 0 16px 40px rgba(0,0,0,0.45);
      border-radius: 2px;
      page-break-after: always;
      break-after: page;
    }
    .sheet-wrapper.excluded-from-pdf {
      display: none !important;
    }
    .sheet-wrapper svg {
      display: block;
      width: 100%;
      height: auto;
    }
    .screen-divider {
      width: 1120px;
      margin: 36px auto 12px;
      padding: 12px 18px;
      background: #1e293b;
      border-left: 4px solid #38bdf8;
      border-radius: 6px;
      color: #f1f5f9;
      font-size: 13px;
      font-weight: 800;
      letter-spacing: 0.04em;
      text-transform: uppercase;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    }
    @media print {
      body {
        background: #ffffff !important;
      }
      .print-toolbar, .screen-divider {
        display: none !important;
      }
      .sheet-wrapper {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        page-break-after: always !important;
        break-after: page !important;
      }
      .sheet-wrapper.excluded-from-pdf {
        display: none !important;
      }
      .sheet-wrapper svg {
        width: 100% !important;
        height: auto !important;
      }
    }
  </style>
</head>
<body>
  <div class="print-toolbar">
    <div class="print-toolbar-top">
      <div class="title-area">
        <h1>${esc(title)}</h1>
        <p id="pdf-subtitle-text">${esc(subtitle)}</p>
      </div>
      <div class="actions">
        <span class="badge" id="pdf-active-count-badge">${selIds.length} Sheets Selected</span>
        <span class="badge">Paper: ${paperCfg.name} (${paperCfg.widthMm} × ${paperCfg.heightMm} mm)</span>
        <button class="btn-print" onclick="window.print()">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
          <span>Print / Save as PDF</span>
        </button>
      </div>
    </div>
    <div class="print-toolbar-sheets">
      <span class="filter-label">Include in Final PDF:</span>
      ${filterCheckboxesHtml}
      <button type="button" class="quick-filter-btn" id="pdf-select-all-btn">Select All (8)</button>
      <button type="button" class="quick-filter-btn" id="pdf-select-core-btn">Core Only (No Sys Diag / BOM)</button>
    </div>
  </div>
  ${pagesHtml}
  <script>
    (function() {
      function syncSheetVisibility() {
        var cbs = Array.prototype.slice.call(document.querySelectorAll('.pdf-sheet-cb'));
        var activeIds = cbs.filter(function(c) { return c.checked; }).map(function(c) { return Number(c.value); });
        if (activeIds.length === 0 && cbs[0]) {
          cbs[0].checked = true;
          activeIds = [Number(cbs[0].value)];
        }
        var wrappers = Array.prototype.slice.call(document.querySelectorAll('.sheet-wrapper[data-sheet-id]'));
        // Group wrappers by screen group to renumber SHEET X OF N per screen
        var byScreen = {};
        wrappers.forEach(function(w) {
          var sid = Number(w.getAttribute('data-sheet-id'));
          var scr = w.getAttribute('data-screen-idx') || '0';
          var inc = activeIds.indexOf(sid) !== -1;
          w.classList.toggle('excluded-from-pdf', !inc);
          if (inc) {
            byScreen[scr] = byScreen[scr] || [];
            byScreen[scr].push(w);
          }
        });
        Object.keys(byScreen).forEach(function(scr) {
          var list = byScreen[scr];
          list.forEach(function(w, idx) {
            var txt = w.querySelector('.cad-sheet-num-text');
            if (txt) txt.textContent = 'SHEET ' + (idx + 1) + ' OF ' + list.length;
          });
        });
        var badge = document.getElementById('pdf-active-count-badge');
        if (badge) badge.textContent = activeIds.length + ' of 8 Sheets per Screen';
      }
      document.querySelectorAll('.pdf-sheet-cb').forEach(function(cb) {
        cb.addEventListener('change', syncSheetVisibility);
      });
      var allBtn = document.getElementById('pdf-select-all-btn');
      if (allBtn) allBtn.addEventListener('click', function() {
        document.querySelectorAll('.pdf-sheet-cb').forEach(function(cb) { cb.checked = true; });
        syncSheetVisibility();
      });
      var coreBtn = document.getElementById('pdf-select-core-btn');
      if (coreBtn) coreBtn.addEventListener('click', function() {
        var core = [1, 2, 3, 4, 6, 7];
        document.querySelectorAll('.pdf-sheet-cb').forEach(function(cb) {
          cb.checked = core.indexOf(Number(cb.value)) !== -1;
        });
        syncSheetVisibility();
      });
      syncSheetVisibility();
    })();
  </script>
</body>
</html>`);
    win.document.close();
  }

  function renderDrawingsViewHtml(projectTitle, rowsComputed, sheetsState) {
    if (!sheetsState.cadLogoUrl) {
      try {
        const savedLogo = localStorage.getItem('pixellogic_cad_logo');
        if (savedLogo) sheetsState.cadLogoUrl = savedLogo;
      } catch (e) {}
    }
    if (!sheetsState.cadPaperSize) {
      try {
        const savedSize = localStorage.getItem('pixellogic_cad_paper_size');
        if (savedSize) sheetsState.cadPaperSize = savedSize;
      } catch (e) {}
    }
    const paperSize = sheetsState.cadPaperSize || 'A3';
    const logoUrl = sheetsState.cadLogoUrl || '';
    const selectedSheetIds = getSelectedCadSheetIds(sheetsState);

    const activeDrawId = Number(sheetsState.activeDrawingId) || 1;
    const currentSheet = DRAWING_SHEETS.find((s) => s.id === activeDrawId) || DRAWING_SHEETS[0];
    const isCurrentInPdf = selectedSheetIds.includes(currentSheet.id);
    const selectedMapId = sheetsState.drawingMapId || (rowsComputed.find((r) => r.isActive)?.map.id) || (rowsComputed[0]?.map.id);
    const activeRow = rowsComputed.find((r) => String(r.map.id) === String(selectedMapId)) || rowsComputed[0];
    const d = computeScreenEngineeringData(activeRow, sheetsState);
    const zoom = Number(sheetsState.cadZoom) || 0.88;
    const panX = Number(sheetsState.cadPanX) || 0;
    const panY = Number(sheetsState.cadPanY) || 0;
    const unitMode = sheetsState.cadUnitMode || 'metric';

    return `
      <div class="flex h-[calc(100vh-185px)] min-h-[640px] bg-[#0c1017] border border-slate-800 rounded-none overflow-hidden select-none">
        <!-- Hidden File Input for Custom Company Logo -->
        <input type="file" id="cad-logo-file-input" accept="image/png,image/jpeg,image/svg+xml,image/webp" style="display:none;" />

        <!-- LEFT SIDEBAR: DRAWINGS 1 TO 8 WITH PDF SELECTION CHECKBOXES -->
        <aside class="w-64 shrink-0 bg-[#121721] border-r border-slate-800/90 flex flex-col justify-between">
          <div>
            <!-- Screen Picker if Multiple Screens -->
            <div class="p-3 border-b border-slate-800/80">
              <label class="block text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-1.5">Screen</label>
              <select id="cad-screen-select" class="w-full bg-[#090d14] border border-slate-700/80 rounded-none px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-sky-500">
                ${rowsComputed.map((r) => `
                  <option value="${esc(r.map.id)}" ${String(r.map.id) === String(activeRow.map.id) ? 'selected' : ''}>
                    ${esc(r.map.name || `Screen ${r.idx + 1}`)} (${r.tilesW}×${r.tilesH})
                  </option>
                `).join('')}
              </select>
            </div>

            <div class="px-3 pt-2.5 pb-1.5 flex items-center justify-between gap-1">
              <span class="text-[10px] font-extrabold uppercase tracking-wider text-slate-400" title="Check the sheets you want included in the exported PDF">Drawings (PDF Select)</span>
              <div class="flex items-center gap-1">
                <button type="button" id="cad-pdf-select-all-btn" class="px-1.5 py-0.5 text-[9px] font-bold bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 rounded-none" title="Include all 8 sheets in final PDF">All 8</button>
                <button type="button" id="cad-pdf-select-core-btn" class="px-1.5 py-0.5 text-[9px] font-bold bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 rounded-none" title="Select core 6 sheets (exclude System Diagram & BOM)">Core 6</button>
              </div>
            </div>
            <div class="space-y-0.5 px-1.5">
              ${DRAWING_SHEETS.map((s) => {
                const isSel = s.id === activeDrawId;
                const isChecked = selectedSheetIds.includes(s.id);
                return `
                  <div class="flex items-center gap-1 px-2 py-1.5 rounded-none transition-all ${
                    isSel
                      ? 'bg-[#1c2536] text-white font-bold border-l-2 border-sky-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-medium'
                  }">
                    <input
                      type="checkbox"
                      data-cad-pdf-check="${s.id}"
                      ${isChecked ? 'checked' : ''}
                      class="w-3.5 h-3.5 accent-sky-500 cursor-pointer shrink-0"
                      title="Include '${esc(s.title)}' in final PDF"
                    />
                    <button
                      type="button"
                      data-cad-sheet-id="${s.id}"
                      class="flex-1 flex items-center justify-between gap-1.5 text-left text-xs min-w-0"
                    >
                      <span class="flex items-center gap-2 min-w-0">
                        <span class="w-3.5 text-[11px] font-mono ${isSel ? 'text-sky-400 font-bold' : 'text-slate-500'}">${s.id}</span>
                        <span class="truncate ${!isChecked ? 'line-through opacity-60' : ''}">${esc(s.title)}</span>
                      </span>
                      <span class="text-[9px] px-1 py-0.2 font-bold uppercase ${isChecked ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-slate-800 text-slate-500'}">${isChecked ? 'PDF' : 'Skip'}</span>
                    </button>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Bottom Quick Info & Full Project Export -->
          <div class="p-3 border-t border-slate-800/80 space-y-2 bg-[#0e131b]">
            <div class="text-[11px] text-slate-400 leading-snug">
              <div class="font-bold text-slate-200 truncate">${esc(d.ledBrand)} ${esc(d.ledModel)}</div>
              <div>${d.widthM.toFixed(2)}m × ${d.heightM.toFixed(2)}m · ${d.totalTiles} panels</div>
              <div class="text-[10px] text-sky-400 font-semibold mt-0.5">${selectedSheetIds.length} of 8 sheets selected for PDF</div>
            </div>

            <!-- Master Project PDF: All screens -->
            <button type="button" id="cad-publish-all-screens-btn" class="w-full py-2 px-2.5 rounded-none bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-extrabold shadow-md flex items-center justify-center gap-1.5 transition-all text-center">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
              <span>Publish All Screens PDF (${rowsComputed.length})</span>
            </button>

            <!-- Current Screen Selected Sheets -->
            <button type="button" id="cad-print-single-screen-btn" class="w-full py-1.5 px-2.5 rounded-none bg-slate-800/90 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] font-semibold border border-slate-700/70 transition-colors">
              Export Current Screen (${selectedSheetIds.length} PDF Sheets)
            </button>
          </div>
        </aside>

        <!-- MAIN CAD WORKSPACE -->
        <div class="flex-1 flex flex-col min-w-0 relative bg-[#0b0e14]">
          <!-- Top CAD Action Toolbar -->
          <div class="h-11 shrink-0 bg-[#121721] border-b border-slate-800/90 px-3 flex items-center justify-between gap-2 z-10">
            <div class="flex items-center gap-2 flex-wrap">
              <span class="text-xs font-bold text-sky-400 uppercase tracking-wider flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                CAD Engineering Blueprints
              </span>
              <span class="text-slate-600">|</span>
              <span class="text-xs text-slate-300 font-medium">Sheet ${activeDrawId} of 8: <b class="text-white">${esc(currentSheet.title)}</b></span>
              <label class="inline-flex items-center gap-1.5 ml-2 px-2 py-0.5 text-[11px] font-bold cursor-pointer border ${isCurrentInPdf ? 'bg-sky-950/60 border-sky-500/50 text-sky-300' : 'bg-slate-900 border-slate-700 text-slate-400'}" title="Toggle whether this sheet is included in the final PDF">
                <input type="checkbox" id="cad-current-sheet-pdf-toggle" class="w-3.5 h-3.5 accent-sky-500 cursor-pointer" ${isCurrentInPdf ? 'checked' : ''} />
                <span>${isCurrentInPdf ? 'Included in Final PDF' : 'Excluded from Final PDF'}</span>
              </label>
            </div>

            <!-- Right Toolbar Controls: Logo, Page Size, Units, PNG Export, Publish Master PDF -->
            <div class="flex items-center gap-2 flex-wrap">
              <!-- Custom Company Logo Control -->
              ${logoUrl ? `
                <div class="flex items-center gap-1.5 bg-[#090d14] border border-slate-700/80 rounded-none px-2 py-0.5 text-xs">
                  <img src="${esc(logoUrl)}" alt="Logo" class="h-4 max-w-[50px] object-contain bg-white/10 px-0.5" />
                  <button type="button" id="cad-change-logo-btn" class="text-sky-400 hover:text-sky-300 font-semibold text-[11px]">Change Logo</button>
                  <button type="button" id="cad-remove-logo-btn" class="text-red-400 hover:text-red-300 font-bold text-xs ml-0.5" title="Remove Logo">✕</button>
                </div>
              ` : `
                <button type="button" id="cad-upload-logo-btn" class="px-2.5 py-1 rounded-none bg-[#18202c] hover:bg-slate-800 border border-slate-700/80 text-xs text-slate-200 font-medium flex items-center gap-1.5">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                  <span>Upload Logo</span>
                </button>
              `}

              <!-- Paper Page Size Selector (A3, A4, A1, A2, A5, Letter, Tabloid) -->
              <div class="flex items-center gap-1.5 bg-[#090d14] border border-slate-700/80 rounded-none px-2 py-1 text-xs">
                <span class="text-slate-400 font-medium">Page:</span>
                <select id="cad-paper-size-select" class="bg-transparent text-sky-300 font-bold focus:outline-none cursor-pointer">
                  ${Object.keys(PAPER_SIZES).map((pk) => `
                    <option value="${pk}" class="bg-[#121721] text-slate-200" ${pk === paperSize ? 'selected' : ''}>${pk}</option>
                  `).join('')}
                </select>
              </div>

              <!-- Units: Metric (m) vs Imperial (ft) -->
              <div class="flex items-center bg-[#090d14] border border-slate-800 rounded-none p-0.5 text-[11px]">
                <button type="button" data-cad-unit="metric" class="px-2 py-0.5 ${unitMode !== 'imperial' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400'}">Meters (m)</button>
                <button type="button" data-cad-unit="imperial" class="px-2 py-0.5 ${unitMode === 'imperial' ? 'bg-sky-500/20 text-sky-300 font-bold' : 'text-slate-400'}">Feet (ft)</button>
              </div>

              <button type="button" id="cad-export-png-btn" class="px-2.5 py-1 rounded-none bg-emerald-600/90 hover:bg-emerald-500 text-white text-xs font-bold">
                Export PNG
              </button>

              <button type="button" id="cad-publish-all-top-btn" class="px-3 py-1 rounded-none bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 shadow">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                <span>Publish Master PDF (${selectedSheetIds.length} Sheets)</span>
              </button>
            </div>
          </div>

          <!-- Center Interactive CAD Sheet Viewport -->
          <div id="cad-viewport" class="flex-1 overflow-hidden relative flex items-center justify-center cursor-grab" style="background: radial-gradient(circle, rgba(148,163,184,0.08) 1px, transparent 1px); background-size: 20px 20px;">
            <div id="cad-sheet-transform" style="transform: translate(${panX}px, ${panY}px) scale(${zoom}); transform-origin: center center; transition: transform 0.08s ease-out; box-shadow: 0 24px 70px rgba(0,0,0,0.75);">
              ${renderSingleSheetSvg(activeDrawId, projectTitle, d, sheetsState)}
            </div>

            <!-- Bottom-Right Floating Zoom Bar -->
            <div class="absolute bottom-3 right-3 flex items-center bg-[#151b26]/95 border border-slate-700/80 rounded-none overflow-hidden shadow-xl z-20">
              <button type="button" id="cad-zoom-out" class="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold">−</button>
              <span id="cad-zoom-label" class="px-2.5 py-1 text-[11px] font-mono text-slate-200 border-x border-slate-800">${Math.round(zoom * 100)}%</span>
              <button type="button" id="cad-zoom-in" class="px-2.5 py-1 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold">+</button>
              <button type="button" id="cad-zoom-fit" class="px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:text-white hover:bg-slate-800 border-l border-slate-800">Fit</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  function bindDrawingsEvents(container, projectTitle, rowsComputed, sheetsState, rerenderCallback) {
    const activeDrawId = Number(sheetsState.activeDrawingId) || 1;
    const selectedMapId = sheetsState.drawingMapId || (rowsComputed.find((r) => r.isActive)?.map.id) || (rowsComputed[0]?.map.id);
    const activeRow = rowsComputed.find((r) => String(r.map.id) === String(selectedMapId)) || rowsComputed[0];
    const d = computeScreenEngineeringData(activeRow, sheetsState);
    const annKey = `${d.map.id || 'default'}_sheet_${activeDrawId}`;
    if (!sheetsState.cadAnnotations) sheetsState.cadAnnotations = {};

    // Paper size change
    const paperSel = container.querySelector('#cad-paper-size-select');
    if (paperSel) {
      paperSel.addEventListener('change', (e) => {
        sheetsState.cadPaperSize = e.target.value;
        try { localStorage.setItem('pixellogic_cad_paper_size', sheetsState.cadPaperSize); } catch (err) {}
        rerenderCallback();
      });
    }

    // Logo upload / change / remove
    const fileInput = container.querySelector('#cad-logo-file-input');
    const uploadBtn = container.querySelector('#cad-upload-logo-btn');
    const changeBtn = container.querySelector('#cad-change-logo-btn');
    const removeBtn = container.querySelector('#cad-remove-logo-btn');
    const logoBoxTrigger = container.querySelector('.cad-logo-box-trigger');

    const triggerUpload = () => fileInput && fileInput.click();
    if (uploadBtn) uploadBtn.addEventListener('click', triggerUpload);
    if (changeBtn) changeBtn.addEventListener('click', triggerUpload);
    if (logoBoxTrigger) logoBoxTrigger.addEventListener('click', triggerUpload);

    if (removeBtn) {
      removeBtn.addEventListener('click', () => {
        sheetsState.cadLogoUrl = '';
        try { localStorage.removeItem('pixellogic_cad_logo'); } catch (err) {}
        rerenderCallback();
      });
    }

    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (loadEvt) => {
          sheetsState.cadLogoUrl = loadEvt.target.result;
          try { localStorage.setItem('pixellogic_cad_logo', sheetsState.cadLogoUrl); } catch (err) {}
          rerenderCallback();
        };
        reader.readAsDataURL(file);
      });
    }

    // Sidebar sheet buttons (1..8)
    container.querySelectorAll('[data-cad-sheet-id]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sheetsState.activeDrawingId = parseInt(btn.dataset.cadSheetId, 10) || 1;
        rerenderCallback();
      });
    });

    // Sidebar per-sheet PDF inclusion checkboxes
    container.querySelectorAll('[data-cad-pdf-check]').forEach((cb) => {
      cb.addEventListener('change', (e) => {
        e.stopPropagation();
        const sheetId = parseInt(cb.dataset.cadPdfCheck, 10);
        const current = getSelectedCadSheetIds(sheetsState);
        const next = cb.checked
          ? Array.from(new Set([...current, sheetId]))
          : current.filter((id) => id !== sheetId);
        saveSelectedCadSheetIds(sheetsState, next);
        rerenderCallback();
      });
    });

    // Current sheet top-bar PDF toggle
    const curSheetToggle = container.querySelector('#cad-current-sheet-pdf-toggle');
    if (curSheetToggle) {
      curSheetToggle.addEventListener('change', () => {
        const current = getSelectedCadSheetIds(sheetsState);
        const next = curSheetToggle.checked
          ? Array.from(new Set([...current, activeDrawId]))
          : current.filter((id) => id !== activeDrawId);
        saveSelectedCadSheetIds(sheetsState, next);
        rerenderCallback();
      });
    }

    // Quick Select All 8 / Core 6 buttons
    const selectAllBtn = container.querySelector('#cad-pdf-select-all-btn');
    if (selectAllBtn) {
      selectAllBtn.addEventListener('click', () => {
        saveSelectedCadSheetIds(sheetsState, DRAWING_SHEETS.map((s) => s.id));
        rerenderCallback();
      });
    }
    const selectCoreBtn = container.querySelector('#cad-pdf-select-core-btn');
    if (selectCoreBtn) {
      selectCoreBtn.addEventListener('click', () => {
        saveSelectedCadSheetIds(sheetsState, [...DEFAULT_PDF_SHEET_IDS]);
        rerenderCallback();
      });
    }

    // Screen selector
    const screenSel = container.querySelector('#cad-screen-select');
    if (screenSel) {
      screenSel.addEventListener('change', (e) => {
        sheetsState.drawingMapId = e.target.value;
        rerenderCallback();
      });
    }

    // Unit toggle
    container.querySelectorAll('[data-cad-unit]').forEach((btn) => {
      btn.addEventListener('click', () => {
        sheetsState.cadUnitMode = btn.dataset.cadUnit || 'metric';
        rerenderCallback();
      });
    });

    // Insert block
    const blockSel = container.querySelector('#cad-insert-block-select');
    if (blockSel) {
      blockSel.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;
        const list = sheetsState.cadAnnotations[annKey] = sheetsState.cadAnnotations[annKey] || [];
        const offset = (list.length % 5) * 24;
        if (val === 'panel') {
          list.push({ type: 'block', x: 480 + offset, y: 40 + offset, title: 'CABINET DETAIL BLOCK', line1: `${d.ledBrand} ${d.ledModel} (P${d.pitchMm}mm)`, line2: `${d.panelW}×${d.panelH}mm · ${d.resW}×${d.resH}px` });
        } else if (val === 'power') {
          list.push({ type: 'block', x: 480 + offset, y: 40 + offset, title: 'POWER SUMMARY BLOCK', line1: `${d.powerPaths.length} Circuits @ ${d.voltage}V (${d.circuitAmps}A)`, line2: `Peak: ${(d.peakWatts / 1000).toFixed(2)}kW · ${(d.totalTiles * d.perTileAmps).toFixed(1)}A` });
        } else if (val === 'signal') {
          list.push({ type: 'block', x: 480 + offset, y: 40 + offset, title: 'PROCESSOR SIGNAL BLOCK', line1: `${d.processorsNeeded}× ${d.processorName}`, line2: `${d.primaryPortsUsed} Ports @ ${d.hz}Hz ${d.bit}-bit` });
        } else if (val === 'rigging') {
          list.push({ type: 'block', x: 480 + offset, y: 40 + offset, title: 'RIGGING LOAD BLOCK', line1: `Net: ${d.totalNetWeightKg.toFixed(1)}kg · WLL: ${d.designWllKg.toFixed(1)}kg`, line2: `${d.hoistCount} Pick Points (${(d.designWllKg / d.hoistCount).toFixed(1)}kg/pt)` });
        }
        rerenderCallback();
      });
    }

    // Add Note
    const noteBtn = container.querySelector('#cad-add-note-btn');
    if (noteBtn) {
      noteBtn.addEventListener('click', () => {
        const list = sheetsState.cadAnnotations[annKey] = sheetsState.cadAnnotations[annKey] || [];
        const offset = (list.length % 6) * 26;
        list.push({
          type: 'note',
          x: 420 + offset,
          y: 80 + offset,
          text: `ENG NOTE: Verify truss trim height & ${d.voltage}V AC feed prior to rigging.`
        });
        rerenderCallback();
      });
    }

    // Add Leader
    const leaderBtn = container.querySelector('#cad-add-leader-btn');
    if (leaderBtn) {
      leaderBtn.addEventListener('click', () => {
        const list = sheetsState.cadAnnotations[annKey] = sheetsState.cadAnnotations[annKey] || [];
        const offset = (list.length % 6) * 28;
        list.push({
          type: 'leader',
          x: 340 + offset,
          y: 150 + offset,
          text: `${d.ledBrand} ${d.ledModel} (${d.panelW}×${d.panelH}mm)`
        });
        rerenderCallback();
      });
    }

    // Reset layout
    const resetBtn = container.querySelector('#cad-reset-layout-btn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        sheetsState.cadZoom = 0.88;
        sheetsState.cadPanX = 0;
        sheetsState.cadPanY = 0;
        if (sheetsState.cadAnnotations) delete sheetsState.cadAnnotations[annKey];
        rerenderCallback();
      });
    }

    // Zoom controls
    const setZoom = (nextZoom, resetPan = false) => {
      sheetsState.cadZoom = Math.max(0.35, Math.min(2.5, Number(nextZoom.toFixed(2))));
      if (resetPan) {
        sheetsState.cadPanX = 0;
        sheetsState.cadPanY = 0;
      }
      const tf = container.querySelector('#cad-sheet-transform');
      const lbl = container.querySelector('#cad-zoom-label');
      if (tf) tf.style.transform = `translate(${sheetsState.cadPanX || 0}px, ${sheetsState.cadPanY || 0}px) scale(${sheetsState.cadZoom})`;
      if (lbl) lbl.textContent = `${Math.round(sheetsState.cadZoom * 100)}%`;
    };

    const zOut = container.querySelector('#cad-zoom-out');
    const zIn = container.querySelector('#cad-zoom-in');
    const zFit = container.querySelector('#cad-zoom-fit');
    if (zOut) zOut.addEventListener('click', () => setZoom((sheetsState.cadZoom || 0.88) - 0.1));
    if (zIn) zIn.addEventListener('click', () => setZoom((sheetsState.cadZoom || 0.88) + 0.1));
    if (zFit) zFit.addEventListener('click', () => setZoom(0.88, true));

    // Drag pan & wheel zoom on viewport
    const viewport = container.querySelector('#cad-viewport');
    const tf = container.querySelector('#cad-sheet-transform');
    if (viewport && tf) {
      let dragging = false;
      let sx = 0, sy = 0, ox = 0, oy = 0;
      viewport.addEventListener('pointerdown', (e) => {
        if (e.button !== 0 || e.target.closest('button')) return;
        dragging = true;
        sx = e.clientX;
        sy = e.clientY;
        ox = Number(sheetsState.cadPanX) || 0;
        oy = Number(sheetsState.cadPanY) || 0;
        viewport.style.cursor = 'grabbing';
        tf.style.transition = 'none';
      });
      window.addEventListener('pointermove', (e) => {
        if (!dragging) return;
        sheetsState.cadPanX = ox + (e.clientX - sx);
        sheetsState.cadPanY = oy + (e.clientY - sy);
        tf.style.transform = `translate(${sheetsState.cadPanX}px, ${sheetsState.cadPanY}px) scale(${sheetsState.cadZoom || 0.88})`;
      });
      window.addEventListener('pointerup', () => {
        if (!dragging) return;
        dragging = false;
        viewport.style.cursor = 'grab';
        tf.style.transition = 'transform 0.08s ease-out';
      });
      viewport.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.08 : -0.08;
        setZoom((sheetsState.cadZoom || 0.88) + delta);
      }, { passive: false });
    }

    // Export current sheet PNG
    const exportPngBtn = container.querySelector('#cad-export-png-btn');
    if (exportPngBtn) {
      exportPngBtn.addEventListener('click', () => {
        const svgEl = container.querySelector('#pl-cad-sheet-svg');
        if (!svgEl) return;
        const svgData = new XMLSerializer().serializeToString(svgEl);
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 2240;
          canvas.height = 1580;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(url);
          const a = document.createElement('a');
          const sheetObj = DRAWING_SHEETS.find((s) => s.id === activeDrawId) || DRAWING_SHEETS[0];
          a.download = `${(d.screenName || 'Screen').replace(/[^a-z0-9-_]/gi, '_')}_Sheet_${sheetObj.id}_${sheetObj.title.replace(/[^a-z0-9]/gi, '_')}.png`;
          a.href = canvas.toDataURL('image/png');
          a.click();
        };
        img.src = url;
      });
    }

    // Action: Publish All Screens Full PDF Package (with interactive sheet filter)
    const publishAllScreens = () => {
      const paperKey = sheetsState.cadPaperSize || 'A3';
      const selIds = getSelectedCadSheetIds(sheetsState);
      const allScreensPagesHtml = rowsComputed.map((r, scrIdx) => {
        const scrData = computeScreenEngineeringData(r, sheetsState);
        const dividerHtml = rowsComputed.length > 1
          ? `<div class="screen-divider">SCREEN ${scrIdx + 1} OF ${rowsComputed.length}: ${esc(scrData.screenName)} · ${esc(scrData.ledBrand)} ${esc(scrData.ledModel)} (${scrData.widthM.toFixed(2)}m × ${scrData.heightM.toFixed(2)}m · ${scrData.totalTiles} panels)</div>`
          : '';
        const sheetsHtml = DRAWING_SHEETS.map((s) => {
          const inc = selIds.includes(s.id);
          const idxInSel = selIds.indexOf(s.id);
          const prevOverride = sheetsState._overrideSheetLabel;
          sheetsState._overrideSheetLabel = inc ? `SHEET ${idxInSel + 1} OF ${selIds.length}` : `SHEET ${s.id} OF 8`;
          const svgHtml = renderSingleSheetSvg(s.id, projectTitle, scrData, sheetsState);
          sheetsState._overrideSheetLabel = prevOverride;
          return `
            <div class="sheet-wrapper ${inc ? '' : 'excluded-from-pdf'}" data-sheet-id="${s.id}" data-screen-idx="${scrIdx}">
              ${svgHtml}
            </div>
          `;
        }).join('');
        return dividerHtml + sheetsHtml;
      }).join('');

      openCadPrintWindow(
        `${projectTitle} — Engineering Drawing Package (${rowsComputed.length} Screens)`,
        `Master Project Set · ${rowsComputed.length} Screens · ${selIds.length} Selected CAD Sheets per Screen · Paper Format: ${paperKey} Landscape`,
        allScreensPagesHtml,
        paperKey,
        selIds
      );
    };

    const pubAllBtn = container.querySelector('#cad-publish-all-screens-btn');
    const pubAllTopBtn = container.querySelector('#cad-publish-all-top-btn');
    if (pubAllBtn) pubAllBtn.addEventListener('click', publishAllScreens);
    if (pubAllTopBtn) pubAllTopBtn.addEventListener('click', publishAllScreens);

    // Action: Print / Export Active Screen Only (Selected Sheets)
    const printSingleScreen = () => {
      const paperKey = sheetsState.cadPaperSize || 'A3';
      const selIds = getSelectedCadSheetIds(sheetsState);
      const singleScreenPagesHtml = DRAWING_SHEETS.map((s) => {
        const inc = selIds.includes(s.id);
        const idxInSel = selIds.indexOf(s.id);
        const prevOverride = sheetsState._overrideSheetLabel;
        sheetsState._overrideSheetLabel = inc ? `SHEET ${idxInSel + 1} OF ${selIds.length}` : `SHEET ${s.id} OF 8`;
        const svgHtml = renderSingleSheetSvg(s.id, projectTitle, d, sheetsState);
        sheetsState._overrideSheetLabel = prevOverride;
        return `
          <div class="sheet-wrapper ${inc ? '' : 'excluded-from-pdf'}" data-sheet-id="${s.id}" data-screen-idx="0">
            ${svgHtml}
          </div>
        `;
      }).join('');

      openCadPrintWindow(
        `${projectTitle} · ${d.screenName} — Engineering Drawings (${selIds.length} Sheets)`,
        `${d.ledBrand} ${d.ledModel} · ${d.widthM.toFixed(2)}m × ${d.heightM.toFixed(2)}m (${d.cols}×${d.rows} panels) · Paper Format: ${paperKey} Landscape`,
        singleScreenPagesHtml,
        paperKey,
        selIds
      );
    };

    const printSingleBtn = container.querySelector('#cad-print-single-screen-btn') || container.querySelector('#cad-print-all-btn');
    if (printSingleBtn) printSingleBtn.addEventListener('click', printSingleScreen);
  }

  window.SheetsCadDrawings = {
    DRAWING_SHEETS,
    renderDrawingsViewHtml,
    bindDrawingsEvents
  };
})();

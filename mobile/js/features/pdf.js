// PDF Export — lazy-loads jsPDF via CDN and renders a multi-page project report.

import { listPixelMapViews, getPixelMapView } from '../state.js';

const JSPDF_URL = 'https://cdn.jsdelivr.net/npm/jspdf@3.0.1/dist/jspdf.umd.min.js';
const fmtInt = (n) => (isFinite(n) ? Math.round(n).toLocaleString() : '—');
const fmt = (n, d = 2) => (isFinite(n) ? Number(n).toFixed(d) : '—');

let jspdfPromise = null;
function loadJsPDF() {
  if (window.jspdf?.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if (jspdfPromise) return jspdfPromise;
  jspdfPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = JSPDF_URL;
    s.async = true;
    s.onload  = () => resolve(window.jspdf.jsPDF);
    s.onerror = () => reject(new Error('Failed to load jsPDF'));
    document.head.appendChild(s);
  });
  return jspdfPromise;
}

export async function render(root) {
  document.getElementById('app-title').textContent = 'PDF Export';

  const saved = await listPixelMapViews();

  root.innerHTML = `
    <h2>PDF Export</h2>
    <p>Generate a printable report for a saved pixel map project.</p>

    ${saved.length === 0 ? `
      <div class="card" style="text-align:center;">
        <h3>No projects yet</h3>
        <p>Create one in Designer first, then come back.</p>
        <a class="btn btn-primary" href="#/designer">Open Designer</a>
      </div>
    ` : `
      <div class="card">
        <h3>Project</h3>
        <div class="field">
          <label for="pdf-project">Select project</label>
          <select id="pdf-project">
            ${saved.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('')}
          </select>
        </div>
        <div class="field">
          <label for="pdf-client">Client / venue (optional)</label>
          <input id="pdf-client" type="text" placeholder="e.g. Acme Corp — Main Stage" />
        </div>
        <button class="btn btn-primary" id="pdf-go">Generate PDF</button>
        <p class="hint" id="pdf-status" style="margin-top:8px;"></p>
      </div>

      <div class="card">
        <h3>Report includes</h3>
        <ul style="margin:0; padding-left:20px; color:var(--muted); line-height:1.8;">
          <li>Project summary &amp; metadata</li>
          <li>Wall dimensions, panel layout, total pixel count</li>
          <li>Computed aspect ratio &amp; diagonal</li>
          <li>Panel grid diagram</li>
        </ul>
      </div>
    `}
  `;

  if (saved.length === 0) return;

  const sel    = root.querySelector('#pdf-project');
  const client = root.querySelector('#pdf-client');
  const go     = root.querySelector('#pdf-go');
  const status = root.querySelector('#pdf-status');

  go.addEventListener('click', async () => {
    try {
      go.disabled = true;
      status.textContent = 'Loading PDF engine…';
      const jsPDF = await loadJsPDF();
      status.textContent = 'Fetching project…';
      const project = await getPixelMapView(sel.value);
      if (!project) throw new Error('Project not found');
      status.textContent = 'Rendering…';
      const blob = generateReport(jsPDF, project, client.value.trim());
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${safeFilename(project.name)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      status.textContent = 'Done ✓';
    } catch (err) {
      console.error(err);
      status.textContent = 'Error: ' + (err.message || err);
    } finally {
      go.disabled = false;
    }
  });
}

function generateReport(jsPDF, project, client) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 48;
  const now = new Date();

  const d = project.data || {};
  const wall = d.wall || {};
  const panel = d.panel || {};
  const c = d.computed || {};

  // --- Header band ---
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, W, 90, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(22);
  doc.text('PixelLogic · LED Wall Report', M, 50);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(165, 180, 252);
  doc.text(now.toLocaleString(), M, 72);

  // --- Title ---
  let y = 130;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(project.name || 'Untitled project', M, y);
  y += 22;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(100, 116, 139);
  if (client) { doc.text(client, M, y); y += 16; }
  doc.text(`Project ID: ${project.id || '—'}`, M, y);
  y += 28;

  // --- Summary ---
  const summary = [
    ['Wall size',      `${fmt(wall.w, 2)} × ${fmt(wall.h, 2)} ${wall.unit || 'm'}`],
    ['Panel size',     `${fmtInt(panel.w)} × ${fmtInt(panel.h)} mm`],
    ['Panel resolution', `${fmtInt(panel.resW)} × ${fmtInt(panel.resH)} px`],
    ['Panels',         `${fmtInt(c.panelsX)} × ${fmtInt(c.panelsY)} = ${fmtInt(c.totalPanels)}`],
    ['Actual wall',    `${fmt((c.actualWmm || 0) / 1000, 3)} × ${fmt((c.actualHmm || 0) / 1000, 3)} m`],
    ['Total pixels',   `${fmtInt(c.pxW)} × ${fmtInt(c.pxH)} = ${fmtInt(c.totalPx)} px`],
    ['Pitch',          `${fmt(c.pitchW, 2)} × ${fmt(c.pitchH, 2)} mm`],
    ['Area',           `${fmt(c.areaM2, 2)} m²`],
    ['Diagonal',       `${fmt((c.diagMm || 0) / 1000, 2)} m`],
    ['Aspect ratio',   c.ratioText || '—'],
    ['Fit mode',       d.fitMode || '—'],
  ];

  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Summary', M, y);
  y += 14;
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, W - M, y);
  y += 10;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  const col1 = M;
  const col2 = M + 180;
  for (const [k, v] of summary) {
    if (y > H - 120) { doc.addPage(); y = 60; }
    doc.setTextColor(100, 116, 139);
    doc.text(k, col1, y);
    doc.setTextColor(15, 23, 42);
    doc.text(String(v), col2, y);
    y += 18;
  }

  // --- Panel grid diagram ---
  y += 14;
  if (y > H - 260) { doc.addPage(); y = 60; }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Panel layout', M, y);
  y += 14;
  doc.setDrawColor(226, 232, 240);
  doc.line(M, y, W - M, y);
  y += 16;

  const diagMaxW = W - M * 2;
  const diagMaxH = 240;
  const pX = Math.max(1, c.panelsX || 1);
  const pY = Math.max(1, c.panelsY || 1);
  const ratio = (wall.w && wall.h) ? (wall.w / wall.h) : (pX / pY);
  let dw = diagMaxW, dh = dw / ratio;
  if (dh > diagMaxH) { dh = diagMaxH; dw = dh * ratio; }
  const dx = M + (diagMaxW - dw) / 2;
  const dy = y;
  const cw = dw / pX;
  const ch = dh / pY;

  doc.setFillColor(241, 245, 249);
  doc.rect(dx, dy, dw, dh, 'F');
  doc.setDrawColor(99, 102, 241);
  doc.setLineWidth(0.4);
  for (let x = 0; x <= pX; x++) {
    const xx = dx + x * cw;
    doc.line(xx, dy, xx, dy + dh);
  }
  for (let yy = 0; yy <= pY; yy++) {
    const yv = dy + yy * ch;
    doc.line(dx, yv, dx + dw, yv);
  }
  doc.setDrawColor(15, 23, 42);
  doc.setLineWidth(1);
  doc.rect(dx, dy, dw, dh);

  y = dy + dh + 18;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(10);
  doc.setTextColor(100, 116, 139);
  doc.text(`${pX} columns × ${pY} rows — ${fmtInt(pX * pY)} panels`, dx, y);

  // --- Footer ---
  const totalPages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text('Generated by PixelLogic Mobile', M, H - 24);
    doc.text(`Page ${i} / ${totalPages}`, W - M, H - 24, { align: 'right' });
  }

  return doc.output('blob');
}

function safeFilename(name) {
  return String(name || 'project').replace(/[^\w\-]+/g, '_').slice(0, 80);
}
function escapeHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// Shows / Projects — list, open, duplicate, rename, delete, export, import.
// Storage: IndexedDB via ../db.js.
import { listProjects, getProject, saveProject, deleteProject } from '../db.js';
import { go } from '../router.js';

const fmt = (n, d = 2) => (isFinite(n) ? Number(n).toFixed(d) : '—');
const fmtInt = (n) => (isFinite(n) ? Math.round(n).toLocaleString() : '—');

function summarize(project) {
  const d = project.data || {};
  if (d.kind === 'pixel-map' && d.computed) {
    const c = d.computed;
    return `${c.panelsX}×${c.panelsY} panels · ${fmtInt(c.pxW)}×${fmtInt(c.pxH)} px · ${fmt((c.actualWmm || 0) / 1000, 2)} × ${fmt((c.actualHmm || 0) / 1000, 2)} m`;
  }
  return '—';
}

function formatDate(ts) {
  try { return new Date(ts).toLocaleString(); } catch { return ''; }
}

export async function render(root, params) {
  document.getElementById('app-title').textContent = 'Projects';

  root.innerHTML = `
    <h2>Projects</h2>
    <p>Saved locally on this device (IndexedDB). Export as JSON to back up or move between phones.</p>

    <div class="card">
      <div style="display:flex; gap:10px; flex-wrap:wrap;">
        <button class="btn btn-primary" id="pr-new" style="flex:1; min-width:140px;">+ New design</button>
        <button class="btn btn-ghost" id="pr-import" style="flex:1; min-width:140px;">Import JSON</button>
      </div>
      <input id="pr-file" type="file" accept="application/json,.json" style="display:none;" />
      <p class="hint" id="pr-msg" style="min-height:16px;"></p>
    </div>

    <div id="pr-list"></div>
  `;

  const msgEl  = root.querySelector('#pr-msg');
  const listEl = root.querySelector('#pr-list');
  const fileEl = root.querySelector('#pr-file');

  root.querySelector('#pr-new').addEventListener('click', () => go('designer'));
  root.querySelector('#pr-import').addEventListener('click', () => fileEl.click());
  fileEl.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const raw = JSON.parse(text);
      const items = Array.isArray(raw) ? raw : [raw];
      let imported = 0;
      for (const p of items) {
        if (!p || !p.data) continue;
        await saveProject({ name: p.name || 'Imported', data: p.data });
        imported++;
      }
      msgEl.textContent = `Imported ${imported} project${imported === 1 ? '' : 's'}.`;
      refresh();
    } catch (err) {
      msgEl.textContent = `Import failed: ${err.message || err}`;
    } finally {
      fileEl.value = '';
    }
  });

  async function refresh() {
    const items = await listProjects();
    if (!items.length) {
      listEl.innerHTML = `
        <div class="card" style="text-align:center; padding:28px 14px;">
          <div style="font-size:42px; opacity:0.5;">☰</div>
          <h3 style="margin-top:8px;">No projects yet</h3>
          <p>Create a pixel map design and save it to see it here.</p>
          <button class="btn btn-primary" id="pr-empty-new">Open Pixel Designer</button>
        </div>
      `;
      listEl.querySelector('#pr-empty-new').addEventListener('click', () => go('designer'));
      return;
    }

    listEl.innerHTML = items.map((p) => `
      <div class="card" data-id="${p.id}">
        <div style="display:flex; align-items:flex-start; justify-content:space-between; gap:10px;">
          <div style="min-width:0; flex:1;">
            <div style="font-weight:700; font-size:16px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${escapeHtml(p.name)}</div>
            <div class="hint mono" style="margin-top:2px;">${summarize(p)}</div>
            <div class="hint" style="margin-top:4px;">Updated ${formatDate(p.updated)}</div>
          </div>
        </div>
        <div class="sep"></div>
        <div style="display:grid; grid-template-columns:repeat(4, 1fr); gap:8px;">
          <button class="btn btn-ghost" data-act="open">Open</button>
          <button class="btn btn-ghost" data-act="rename">Rename</button>
          <button class="btn btn-ghost" data-act="export">Export</button>
          <button class="btn btn-danger" data-act="delete">Delete</button>
        </div>
      </div>
    `).join('');

    listEl.querySelectorAll('.card[data-id]').forEach((card) => {
      const id = card.dataset.id;
      card.querySelectorAll('button[data-act]').forEach((btn) => {
        btn.addEventListener('click', () => handleAction(btn.dataset.act, id));
      });
    });
  }

  async function handleAction(act, id) {
    const project = await getProject(id);
    if (!project) return;
    if (act === 'open') {
      const d = project.data || {};
      if (d.kind === 'pixel-map') {
        go('designer', { id: project.id });
      } else {
        msgEl.textContent = 'Unknown project type.';
      }
    } else if (act === 'rename') {
      const name = prompt('Rename project', project.name);
      if (name && name.trim() && name !== project.name) {
        await saveProject({ ...project, name: name.trim() });
        refresh();
      }
    } else if (act === 'export') {
      const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.name.replace(/[^\w.-]+/g, '_') || 'project'}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } else if (act === 'delete') {
      if (confirm(`Delete "${project.name}"? This cannot be undone.`)) {
        await deleteProject(id);
        refresh();
      }
    }
  }

  await refresh();
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

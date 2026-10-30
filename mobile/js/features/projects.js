// Projects landing — the true entry point of the app.
// Shows Drafts + Saved sections, "New project" button, per-project actions.

import {
  listAllProjects, setActiveProjectId, updateProject, createProject,
} from '../state.js';
import { deleteProject, saveProject } from '../db.js';
import { go } from '../router.js';

export async function render(root) {
  document.getElementById('app-title').textContent = 'Projects';

  const projects = await listAllProjects();
  const drafts = projects.filter(p => p.status !== 'saved');
  const saved  = projects.filter(p => p.status === 'saved');

  root.innerHTML = `
    <div class="hero">
      <h2>Projects</h2>
      <p>Every design starts with a project. Create one, fill in the event details, then open it in Designer.</p>
      <button class="btn btn-primary" id="btn-new">＋ New project</button>
    </div>

    <section class="card">
      <h3>Drafts <span class="count">${drafts.length}</span></h3>
      ${drafts.length === 0 ? `<p class="empty">No draft projects. Tap "New project" to start.</p>` : ''}
      <div class="project-list">
        ${drafts.map(p => projectCard(p, true)).join('')}
      </div>
    </section>

    <section class="card">
      <h3>Saved <span class="count">${saved.length}</span></h3>
      ${saved.length === 0 ? `<p class="empty">No saved projects yet. Save a draft to move it here.</p>` : ''}
      <div class="project-list">
        ${saved.map(p => projectCard(p, false)).join('')}
      </div>
    </section>

    <section class="card" style="margin-top:20px;">
      <h3>Backup</h3>
      <div class="row">
        <button class="btn btn-ghost" id="btn-export-all">Export all</button>
        <label class="btn btn-ghost" for="file-import-all" style="text-align:center;">Import JSON</label>
        <input id="file-import-all" type="file" accept="application/json" hidden />
      </div>
    </section>
  `;

  // Wire "new project"
  root.querySelector('#btn-new').addEventListener('click', onNew);

  // Wire per-card actions (delegated)
  root.querySelectorAll('.project-card').forEach(card => {
    const id = card.dataset.id;
    card.querySelector('.p-open')  ?.addEventListener('click', () => openProject(id));
    card.querySelector('.p-edit')  ?.addEventListener('click', () => editMeta(id));
    card.querySelector('.p-save')  ?.addEventListener('click', () => saveAsFinal(id));
    card.querySelector('.p-dupe')  ?.addEventListener('click', () => duplicate(id));
    card.querySelector('.p-export')?.addEventListener('click', () => exportOne(id));
    card.querySelector('.p-delete')?.addEventListener('click', () => del(id));
  });

  // Backup actions
  root.querySelector('#btn-export-all').addEventListener('click', exportAll);
  root.querySelector('#file-import-all').addEventListener('change', (e) => importJson(e.target.files?.[0]));
}

function projectCard(p, isDraft) {
  const meta = p.data?.meta || {};
  const maps = p.data?.pixelMaps?.length || 0;
  const metaBits = [
    meta.client && `${esc(meta.client)}`,
    meta.venue  && `@ ${esc(meta.venue)}`,
    meta.eventDate && `📅 ${esc(meta.eventDate)}${meta.eventTime ? ' ' + esc(meta.eventTime) : ''}`,
  ].filter(Boolean).join(' · ');
  return `
    <article class="project-card" data-id="${p.id}">
      <div class="p-head">
        <div>
          <div class="p-name">${esc(p.name || 'Untitled')}</div>
          ${metaBits ? `<div class="p-meta">${metaBits}</div>` : ''}
        </div>
        <div class="p-stats">${maps} map${maps === 1 ? '' : 's'}</div>
      </div>
      <div class="p-actions">
        <button class="btn btn-primary p-open">Open</button>
        <button class="btn btn-ghost p-edit">Details</button>
        ${isDraft ? '<button class="btn btn-ghost p-save">Save</button>' : ''}
        <button class="btn btn-ghost p-dupe">Duplicate</button>
        <button class="btn btn-ghost p-export">Export</button>
        <button class="btn btn-danger p-delete">Delete</button>
      </div>
    </article>
  `;
}

function esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ---------- Actions ----------

async function onNew() {
  const dlg = await projectDialog();
  if (!dlg) return;
  const created = await createProject(dlg.name, dlg.meta);
  await setActiveProjectId(created.id);
  go('designer');
}

async function openProject(id) {
  await setActiveProjectId(id);
  go('designer');
}

async function editMeta(id) {
  const all = await listAllProjects();
  const p = all.find(x => x.id === id);
  if (!p) return;
  const dlg = await projectDialog({ name: p.name, meta: p.data?.meta || {} });
  if (!dlg) return;
  await updateProject(id, (cur) => ({
    ...cur,
    name: dlg.name,
    data: { ...cur.data, meta: { ...cur.data.meta, ...dlg.meta } },
  }));
  location.reload();
}

async function saveAsFinal(id) {
  await updateProject(id, (cur) => ({ ...cur, status: 'saved' }));
  location.reload();
}

async function duplicate(id) {
  const all = await listAllProjects();
  const p = all.find(x => x.id === id);
  if (!p) return;
  const copy = { ...p, id: undefined, name: (p.name || 'Untitled') + ' (copy)', status: 'draft', created: undefined, updated: undefined };
  await saveProject(copy);
  location.reload();
}

async function exportOne(id) {
  const all = await listAllProjects();
  const p = all.find(x => x.id === id);
  if (!p) return;
  const blob = new Blob([JSON.stringify(p, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `${safeName(p.name)}.pixellogic.json`);
}

async function exportAll() {
  const all = await listAllProjects();
  const payload = { version: 1, exportedAt: new Date().toISOString(), projects: all };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  downloadBlob(blob, `pixellogic-projects-${new Date().toISOString().slice(0,10)}.json`);
}

async function importJson(file) {
  if (!file) return;
  try {
    const text = await file.text();
    const data = JSON.parse(text);
    const list = Array.isArray(data?.projects) ? data.projects : [data];
    for (const p of list) {
      await saveProject({ ...p, id: undefined });
    }
    alert(`Imported ${list.length} project(s).`);
    location.reload();
  } catch (e) {
    alert('Import failed: ' + e.message);
  }
}

async function del(id) {
  if (!confirm('Delete this project? This cannot be undone.')) return;
  await deleteProject(id);
  location.reload();
}

function downloadBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function safeName(n) { return String(n || 'project').replace(/[^\w\-]+/g, '_').slice(0, 80); }

// ---------- Modal dialog for project details ----------

function projectDialog(initial = {}) {
  return new Promise((resolve) => {
    const m = initial.meta || {};
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal">
        <header><h3>${initial.name ? 'Edit project' : 'New project'}</h3></header>
        <div class="modal-body">
          <div class="field">
            <label>Project name</label>
            <input id="m-name" type="text" value="${esc(initial.name || '')}" placeholder="e.g. Acme Keynote 2026" />
          </div>
          <div class="row">
            <div class="field">
              <label>Event date</label>
              <input id="m-date" type="date" value="${esc(m.eventDate || '')}" />
            </div>
            <div class="field">
              <label>Time</label>
              <input id="m-time" type="time" value="${esc(m.eventTime || '')}" />
            </div>
          </div>
          <div class="field">
            <label>Client</label>
            <input id="m-client" type="text" value="${esc(m.client || '')}" />
          </div>
          <div class="field">
            <label>Venue</label>
            <input id="m-venue" type="text" value="${esc(m.venue || '')}" />
          </div>
          <div class="field">
            <label>Location</label>
            <input id="m-loc" type="text" value="${esc(m.location || '')}" />
          </div>
          <div class="field">
            <label>Salesperson</label>
            <input id="m-sales" type="text" value="${esc(m.salesperson || '')}" />
          </div>
        </div>
        <footer>
          <button class="btn btn-ghost" id="m-cancel">Cancel</button>
          <button class="btn btn-primary" id="m-ok">${initial.name ? 'Save' : 'Create'}</button>
        </footer>
      </div>
    `;
    document.body.appendChild(overlay);
    const close = (val) => { overlay.remove(); resolve(val); };
    overlay.querySelector('#m-cancel').addEventListener('click', () => close(null));
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(null); });
    overlay.querySelector('#m-ok').addEventListener('click', () => {
      const name = overlay.querySelector('#m-name').value.trim() || 'Untitled Project';
      close({
        name,
        meta: {
          eventDate: overlay.querySelector('#m-date').value,
          eventTime: overlay.querySelector('#m-time').value,
          client: overlay.querySelector('#m-client').value.trim(),
          venue:  overlay.querySelector('#m-venue').value.trim(),
          location: overlay.querySelector('#m-loc').value.trim(),
          salesperson: overlay.querySelector('#m-sales').value.trim(),
        },
      });
    });
    setTimeout(() => overlay.querySelector('#m-name').focus(), 50);
  });
}

// Minimal IndexedDB wrapper — no external deps.
// Stores: projects (id, name, created, updated, data).
const DB_NAME = 'pixellogic-mobile';
const DB_VERSION = 1;

let _dbPromise = null;

function open() {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('projects')) {
        const store = db.createObjectStore('projects', { keyPath: 'id' });
        store.createIndex('updated', 'updated');
      }
      if (!db.objectStoreNames.contains('kv')) {
        db.createObjectStore('kv', { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
}

function tx(store, mode = 'readonly') {
  return open().then((db) => db.transaction(store, mode).objectStore(store));
}

function promisify(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function listProjects() {
  const store = await tx('projects');
  return promisify(store.getAll()).then(rows =>
    rows.sort((a, b) => (b.updated || 0) - (a.updated || 0))
  );
}
export async function getProject(id) {
  const store = await tx('projects');
  return promisify(store.get(id));
}
export async function saveProject(project) {
  const store = await tx('projects', 'readwrite');
  const now = Date.now();
  const record = {
    id: project.id || crypto.randomUUID(),
    name: project.name || 'Untitled',
    status: project.status || 'draft',
    created: project.created || now,
    updated: now,
    data: project.data || {},
  };
  await promisify(store.put(record));
  return record;
}
export async function deleteProject(id) {
  const store = await tx('projects', 'readwrite');
  return promisify(store.delete(id));
}

export async function kvGet(key) {
  const store = await tx('kv');
  const row = await promisify(store.get(key));
  return row ? row.value : undefined;
}
export async function kvSet(key, value) {
  const store = await tx('kv', 'readwrite');
  return promisify(store.put({ key, value }));
}

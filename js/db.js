/**
 * FirmAbal IndexedDB Wrapper & Seed Data
 */
const DB_NAME = 'firmabal_db';
const DB_VERSION = 1;

let dbInstance = null;

function openDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('registros')) {
        const store = db.createObjectStore('registros', { keyPath: 'id' });
        store.createIndex('cedula', 'cedula', { unique: false });
        store.createIndex('estado', 'estado', { unique: false });
        store.createIndex('tipo', 'tipo', { unique: false });
        store.createIndex('recolector_id', 'recolector_id', { unique: false });
      }

      if (!db.objectStoreNames.contains('firmas')) {
        db.createObjectStore('firmas', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('imagenes')) {
        db.createObjectStore('imagenes', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('auditoria')) {
        const auditStore = db.createObjectStore('auditoria', { keyPath: 'id', autoIncrement: true });
        auditStore.createIndex('fecha', 'fecha', { unique: false });
      }

      if (!db.objectStoreNames.contains('recolectores')) {
        db.createObjectStore('recolectores', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('configuracion')) {
        db.createObjectStore('configuracion', { keyPath: 'key' });
      }

      if (!db.objectStoreNames.contains('territorios')) {
        db.createObjectStore('territorios', { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

// Generic DB Transaction Helpers
async function dbGetAll(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function dbGet(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => reject(req.error);
  });
}

async function dbPut(storeName, value) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(value);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function dbDelete(storeName, key) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

async function dbClear(storeName) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve(true);
    req.onerror = () => reject(req.error);
  });
}

// Store Offline Queue Engine (IndexedDB FIFO Queue + Memory Fallback)

const DB_NAME = 'MES_Store_Offline_v1';
const DB_VERSION = 1;
const STORE_NAME = 'offline_queue';

let dbPromise = null;
let memoryFallbackQueue = [];
let sharedAudioCtx = null;

function isIndexedDbSupported() {
  return typeof window !== 'undefined' && 'indexedDB' in window;
}

function openDatabase() {
  if (!isIndexedDbSupported()) {
    return Promise.resolve(null);
  }
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('module', 'module', { unique: false });
          store.createIndex('created_at', 'created_at', { unique: false });
          store.createIndex('status', 'status', { unique: false });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        dbPromise = null;
        resolve(null);
      };
    } catch {
      dbPromise = null;
      resolve(null);
    }
  });

  return dbPromise;
}

export function playOfflineCue(kind = 'queued') {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!sharedAudioCtx) {
      sharedAudioCtx = new AudioContextClass();
    }
    if (sharedAudioCtx.state === 'suspended') {
      sharedAudioCtx.resume();
    }

    const osc = sharedAudioCtx.createOscillator();
    const gain = sharedAudioCtx.createGain();
    osc.connect(gain);
    gain.connect(sharedAudioCtx.destination);

    osc.type = 'sine';
    const now = sharedAudioCtx.currentTime;
    if (kind === 'synced') {
      osc.frequency.setValueAtTime(660, now);
      osc.frequency.setValueAtTime(990, now + 0.08);
    } else {
      osc.frequency.setValueAtTime(587.33, now);
      osc.frequency.setValueAtTime(880, now + 0.08);
    }
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc.start(now);
    osc.stop(now + 0.22);
  } catch {
    // Ignore browser audio autoplay restrictions
  }
}

export function triggerHapticFeedback(pattern = [60, 40, 60]) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore unsupported device vibration
    }
  }
}

export const storeOfflineEngine = {
  isOnline() {
    return typeof navigator === 'undefined' ? true : navigator.onLine;
  },

  async enqueue({ module, action, payload, summary = '' }) {
    const item = {
      module,
      action,
      payload,
      summary,
      created_at: Date.now(),
      status: 'pending',
      retry_count: 0,
      error_message: ''
    };

    const db = await openDatabase();
    if (db) {
      const assignedId = await new Promise((resolve, reject) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const req = tx.objectStore(STORE_NAME).add(item);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      item.id = assignedId;
    } else {
      item.id = Date.now() + Math.floor(Math.random() * 1000);
      memoryFallbackQueue = [...memoryFallbackQueue, item];
    }

    playOfflineCue('queued');
    triggerHapticFeedback();
    window.dispatchEvent(new CustomEvent('mes-store-offline-updated'));
    return item;
  },

  async listAll(moduleFilter = null) {
    const db = await openDatabase();
    let allItems = [];
    if (db) {
      allItems = await new Promise((resolve) => {
        const tx = db.transaction([STORE_NAME], 'readonly');
        const req = tx.objectStore(STORE_NAME).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => resolve([]);
      });
    } else {
      allItems = [...memoryFallbackQueue];
    }

    const filtered = moduleFilter
      ? allItems.filter((item) => item.module === moduleFilter)
      : allItems;
    return filtered.sort((a, b) => a.created_at - b.created_at);
  },

  async updateItem(id, patch) {
    const db = await openDatabase();
    if (db) {
      await new Promise((resolve) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const getReq = store.get(id);
        getReq.onsuccess = () => {
          const existing = getReq.result;
          if (!existing) {
            resolve();
            return;
          }
          const putReq = store.put({ ...existing, ...patch });
          putReq.onsuccess = () => resolve();
          putReq.onerror = () => resolve();
        };
        getReq.onerror = () => resolve();
      });
    } else {
      memoryFallbackQueue = memoryFallbackQueue.map((item) =>
        item.id === id ? { ...item, ...patch } : item
      );
    }
    window.dispatchEvent(new CustomEvent('mes-store-offline-updated'));
  },

  async remove(id) {
    const db = await openDatabase();
    if (db) {
      await new Promise((resolve) => {
        const tx = db.transaction([STORE_NAME], 'readwrite');
        const req = tx.objectStore(STORE_NAME).delete(id);
        req.onsuccess = () => resolve();
        req.onerror = () => resolve();
      });
    } else {
      memoryFallbackQueue = memoryFallbackQueue.filter((item) => item.id !== id);
    }
    window.dispatchEvent(new CustomEvent('mes-store-offline-updated'));
  },

  async clearFailed() {
    const items = await this.listAll();
    const failed = items.filter((item) => item.status === 'failed');
    for (const item of failed) {
      await this.remove(item.id);
    }
  }
};

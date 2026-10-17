// MES/page/storeManagement/script/storeOffline.js
"use strict";

/**
 * MES Store Unified Offline Engine (IndexedDB + Auto-Sync)
 * Provides dead-zone resilience for warehouse mobile operations (docks, high-racks, aisles).
 */
const StoreOffline = {
    dbName: 'MES_Store_Offline_v1',
    dbVersion: 1,
    storeName: 'offline_queue',
    db: null,
    isInitialized: false,
    syncInProgress: false,
    currentModule: null,
    audioCtx: null,

    /**
     * Initialize IndexedDB database with fallback to localStorage
     */
    async init(moduleName) {
        if (moduleName) this.currentModule = moduleName;
        if (this.isInitialized && this.db) return;

        if (!('indexedDB' in window)) {
            console.warn('[Offline Engine] IndexedDB not available, using localStorage fallback');
            this.isInitialized = true;
            this.bindEvents();
            this.updateUI();
            return;
        }

        try {
            this.db = await new Promise((resolve, reject) => {
                const req = window.indexedDB.open(this.dbName, this.dbVersion);
                req.onupgradeneeded = (e) => {
                    const db = e.target.result;
                    if (!db.objectStoreNames.contains(this.storeName)) {
                        const store = db.createObjectStore(this.storeName, { keyPath: 'id', autoIncrement: true });
                        store.createIndex('module', 'module', { unique: false });
                        store.createIndex('created_at', 'created_at', { unique: false });
                        store.createIndex('status', 'status', { unique: false });
                    }
                };
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
            this.isInitialized = true;
        } catch (err) {
            console.warn('[Offline Engine] IndexedDB init error, fallback to localStorage:', err);
            this.db = null;
            this.isInitialized = true;
        }

        this.bindEvents();
        await this.updateUI();
    },

    bindEvents() {
        if (this._eventsBound) return;
        this._eventsBound = true;

        window.addEventListener('online', async () => {
            console.log('[Offline Engine] Network connection restored (online)');
            await this.updateUI();
            this.triggerAutoSync();
        });

        window.addEventListener('offline', async () => {
            console.warn('[Offline Engine] Connection lost (offline)');
            await this.updateUI();
        });
    },

    isOnline() {
        return navigator.onLine;
    },

    /**
     * Add a mutation action to the offline queue
     */
    async enqueue(module, action, payload, summary = '') {
        await this.init(module);

        const item = {
            module: module,
            action: action,
            payload: payload,
            summary: summary,
            created_at: Date.now(),
            status: 'pending',
            retry_count: 0
        };

        if (this.db) {
            await new Promise((resolve, reject) => {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                const req = store.add(item);
                req.onsuccess = () => resolve(req.result);
                req.onerror = () => reject(req.error);
            });
        } else {
            const key = `MES_OFFLINE_QUEUE_${module}`;
            let list = [];
            try {
                list = JSON.parse(localStorage.getItem(key) || '[]');
            } catch (e) { list = []; }
            item.id = Date.now() + Math.random();
            list.push(item);
            localStorage.setItem(key, JSON.stringify(list));
        }

        this.playFeedbackSound();
        this.vibrate();
        await this.updateUI(module);

        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'warning',
            title: 'บันทึกในเครื่องชั่วคราว (ออฟไลน์)',
            text: summary ? `${summary} - จะซิงค์เมื่อมีสัญญาณ` : 'ระบบจะส่งข้อมูลขึ้นเซิร์ฟเวอร์อัตโนมัติเมื่อต่อเน็ต',
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true
        });

        return item;
    },

    /**
     * Get pending items for a module
     */
    async getPendingItems(module = this.currentModule) {
        await this.init(module);

        if (this.db) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([this.storeName], 'readonly');
                const store = tx.objectStore(this.storeName);
                const req = store.getAll();
                req.onsuccess = () => {
                    const all = req.result || [];
                    const filtered = module ? all.filter(x => x.module === module && x.status === 'pending') : all;
                    filtered.sort((a, b) => a.created_at - b.created_at);
                    resolve(filtered);
                };
                req.onerror = () => reject(req.error);
            });
        } else {
            const key = `MES_OFFLINE_QUEUE_${module}`;
            try {
                const list = JSON.parse(localStorage.getItem(key) || '[]');
                return list.filter(x => x.status === 'pending').sort((a, b) => a.created_at - b.created_at);
            } catch (e) {
                return [];
            }
        }
    },

    /**
     * Get count of pending items
     */
    async getPendingCount(module = this.currentModule) {
        const items = await this.getPendingItems(module);
        return items.length;
    },

    /**
     * Remove an item from the queue
     */
    async remove(id, module = this.currentModule) {
        await this.init(module);

        if (this.db) {
            return new Promise((resolve, reject) => {
                const tx = this.db.transaction([this.storeName], 'readwrite');
                const store = tx.objectStore(this.storeName);
                const req = store.delete(id);
                req.onsuccess = () => resolve();
                req.onerror = () => reject(req.error);
            });
        } else {
            const key = `MES_OFFLINE_QUEUE_${module}`;
            try {
                let list = JSON.parse(localStorage.getItem(key) || '[]');
                list = list.filter(x => x.id !== id);
                localStorage.setItem(key, JSON.stringify(list));
            } catch (e) {}
        }
    },

    /**
     * Update banner and sync badge UI elements
     */
    async updateUI(module = this.currentModule) {
        const pendingCount = await this.getPendingCount(module);
        const online = this.isOnline();

        // 1. Status Banner
        const banner = document.getElementById('offlineStatusBanner');
        const countText = document.getElementById('offlinePendingCountText');
        if (banner) {
            if (!online || pendingCount > 0) {
                banner.classList.remove('d-none');
                banner.classList.add('d-flex');
                if (countText) countText.textContent = pendingCount;
            } else {
                banner.classList.add('d-none');
                banner.classList.remove('d-flex');
            }
        }

        // 2. Sync Badge
        const syncBadge = document.getElementById('offlineSyncBadge');
        const syncCount = document.getElementById('offlineSyncCount');
        if (syncBadge) {
            if (pendingCount > 0) {
                syncBadge.classList.remove('d-none');
                if (syncCount) syncCount.textContent = pendingCount;
            } else {
                syncBadge.classList.add('d-none');
            }
        }
    },

    /**
     * Auto sync triggered when coming back online
     */
    async triggerAutoSync() {
        if (!this.isOnline() || this.syncInProgress) return;
        if (window._customOfflineSyncHandler) {
            await this.syncAll(this.currentModule, window._customOfflineSyncHandler);
        }
    },

    /**
     * Manual sync triggered by clicking the badge or button
     */
    async triggerManualSync(module = this.currentModule) {
        if (!this.isOnline()) {
            Swal.fire({
                icon: 'warning',
                title: 'ยังอยู่ในโหมดออฟไลน์',
                text: 'ยังไม่สามารถติดต่อเซิร์ฟเวอร์ได้ กรุณาเดินไปยังจุดที่มีสัญญาณ Wi-Fi หรือ Cellular',
                confirmButtonText: 'ตกลง'
            });
            return;
        }

        if (this.syncInProgress) {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: 'กำลังซิงค์ข้อมูล...',
                timer: 2000,
                showConfirmButton: false
            });
            return;
        }

        if (window._customOfflineSyncHandler) {
            await this.syncAll(module, window._customOfflineSyncHandler);
        } else {
            console.warn('[Offline Engine] No custom sync handler registered');
        }
    },

    /**
     * Synchronize all pending items in FIFO order
     */
    async syncAll(module, customHandler) {
        if (this.syncInProgress) return;
        this.syncInProgress = true;

        const items = await this.getPendingItems(module);
        if (items.length === 0) {
            this.syncInProgress = false;
            await this.updateUI(module);
            return;
        }

        const syncBadge = document.getElementById('offlineSyncBadge');
        if (syncBadge) {
            syncBadge.innerHTML = `<i class="fas fa-spinner fa-spin me-1"></i>กำลังซิงค์ (${items.length})`;
        }

        let successCount = 0;
        let failCount = 0;

        for (const item of items) {
            try {
                const ok = await customHandler(item);
                if (ok) {
                    await this.remove(item.id, module);
                    successCount++;
                } else {
                    failCount++;
                }
            } catch (err) {
                console.error('[Offline Engine] Sync item failed:', err, item);
                failCount++;
                break; // Stop sequential sync if connection lost again
            }
        }

        this.syncInProgress = false;
        await this.updateUI(module);

        if (successCount > 0) {
            Swal.fire({
                icon: 'success',
                title: 'ซิงค์ข้อมูลสำเร็จ',
                text: `ส่งข้อมูลขึ้นเซิร์ฟเวอร์เรียบร้อยแล้ว ${successCount} รายการ`,
                timer: 2500,
                showConfirmButton: false
            });

            // Refresh current page data
            if (module === 'rm_receiving' && typeof window.loadHistory === 'function') {
                window.loadHistory();
            } else if (module === 'store_request' && typeof window.loadRequests === 'function') {
                window.loadRequests();
            }
        }

        if (failCount > 0) {
            Swal.fire({
                icon: 'warning',
                title: 'การซิงค์ยังไม่เสร็จสิ้น',
                text: `มี ${failCount} รายการที่ยังไม่สามารถส่งได้ ระบบจะลองใหม่อีกครั้งเมื่อสัญญาณเสถียร`,
                confirmButtonText: 'ตกลง'
            });
        }
    },

    /**
     * Subtle audio feedback using Web Audio API
     */
    playFeedbackSound() {
        try {
            if (!this.audioCtx) {
                const AudioContextClass = window.AudioContext || window.webkitAudioContext;
                if (AudioContextClass) this.audioCtx = new AudioContextClass();
            }
            if (this.audioCtx && this.audioCtx.state === 'suspended') {
                this.audioCtx.resume();
            }
            if (!this.audioCtx) return;

            const osc = this.audioCtx.createOscillator();
            const gain = this.audioCtx.createGain();
            osc.connect(gain);
            gain.connect(this.audioCtx.destination);

            osc.type = 'sine';
            osc.frequency.setValueAtTime(587.33, this.audioCtx.currentTime); // D5
            osc.frequency.setValueAtTime(880, this.audioCtx.currentTime + 0.08); // A5

            gain.gain.setValueAtTime(0.12, this.audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

            osc.start();
            osc.stop(this.audioCtx.currentTime + 0.25);
        } catch (e) {
            // Audio context restricted or unavailable
        }
    },

    /**
     * Mobile haptic vibration feedback
     */
    vibrate() {
        if ('vibrate' in navigator) {
            try {
                navigator.vibrate([70, 40, 70]);
            } catch (e) {}
        }
    }
};

window.StoreOffline = StoreOffline;

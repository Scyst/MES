import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  WifiOff, Wifi, RefreshCw, ListFilter, Trash2, CheckCircle2, AlertTriangle, X, RotateCcw
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';
import { storeOfflineEngine, playOfflineCue } from '../utils/storeOfflineEngine';

const MODULE_LABELS = {
  cycle_count: 'ตรวจนับ Cycle Count',
  rm_receiving: 'รับวัตถุดิบ & แท็ก',
  store_request: 'เบิกพัสดุ / ทดแทนของเสีย'
};

/** Executes a single queued Store mutation in FIFO order against storeApi. */
async function replayStoreQueueItem(item) {
  switch (item.action) {
    case 'cc_scan_tag':
      return await storeApi.scanTag(item.payload);
    case 'bulk_receive_tags':
      return await storeApi.bulkReceiveTags(item.payload);
    case 'create_scrap_request':
      return await storeApi.createScrapRequest(item.payload);
    case 'submit_requisition':
      return await storeApi.submitRequisition(item.payload);
    default:
      return { success: false, message: `ไม่รองรับคำสั่ง ${item.action}` };
  }
}

export default function StoreOfflineBanner() {
  const [isOnline, setIsOnline] = useState(() => storeOfflineEngine.isOnline());
  const [queueItems, setQueueItems] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const syncingRef = useRef(false);

  const refreshQueue = useCallback(async () => {
    const list = await storeOfflineEngine.listAll();
    setQueueItems(list);
  }, []);

  const runSync = useCallback(async (includeFailed = false) => {
    if (syncingRef.current || !storeOfflineEngine.isOnline()) return;

    syncingRef.current = true;
    setSyncing(true);
    let syncedCount = 0;
    let failedCount = 0;
    const syncedModules = new Set();

    try {
      const allItems = await storeOfflineEngine.listAll();
      const candidates = allItems.filter((item) =>
        includeFailed ? item.status === 'pending' || item.status === 'failed' : item.status === 'pending'
      );
      if (candidates.length === 0) {
        await refreshQueue();
        return;
      }

      for (const item of candidates) {
        if (!storeOfflineEngine.isOnline()) break;

        try {
          const res = await replayStoreQueueItem(item);
          if (res && res.success) {
            await storeOfflineEngine.remove(item.id);
            syncedCount += 1;
            syncedModules.add(item.module);
          } else {
            failedCount += 1;
            await storeOfflineEngine.updateItem(item.id, {
              status: 'failed',
              retry_count: (item.retry_count || 0) + 1,
              error_message: res?.message || 'เซิร์ฟเวอร์ปฏิเสธคำขอ'
            });
          }
        } catch (err) {
          if (err?.isNetworkError) {
            break;
          }
          failedCount += 1;
          await storeOfflineEngine.updateItem(item.id, {
            status: 'failed',
            retry_count: (item.retry_count || 0) + 1,
            error_message: err?.message || 'เกิดข้อผิดพลาดในการซิงค์'
          });
        }
      }
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }

    await refreshQueue();

    if (syncedCount > 0) {
      playOfflineCue('synced');
      window.dispatchEvent(
        new CustomEvent('mes-store-offline-synced', {
          detail: { count: syncedCount, modules: [...syncedModules] }
        })
      );
      setToast({
        type: 'success',
        text: `ซิงค์ข้อมูลค้างส่งสำเร็จ ${syncedCount} รายการ`
      });
    } else if (failedCount > 0) {
      setToast({
        type: 'warning',
        text: `มีรายการที่ไม่สามารถซิงค์ได้ ${failedCount} รายการ กรุณาตรวจสอบคิว`
      });
    }
  }, [refreshQueue]);

  useEffect(() => {
    refreshQueue();
    if (storeOfflineEngine.isOnline()) {
      runSync(false);
    }

    const handleOnline = () => {
      setIsOnline(true);
      refreshQueue();
      runSync(false);
    };
    const handleOffline = () => {
      setIsOnline(false);
      refreshQueue();
    };
    const handleQueueUpdated = () => {
      refreshQueue();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('mes-store-offline-updated', handleQueueUpdated);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('mes-store-offline-updated', handleQueueUpdated);
    };
  }, [refreshQueue, runSync]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const pendingCount = queueItems.filter((item) => item.status === 'pending').length;
  const failedCount = queueItems.filter((item) => item.status === 'failed').length;
  const totalCount = queueItems.length;

  const shouldRenderBanner = !isOnline || totalCount > 0 || Boolean(toast);
  if (!shouldRenderBanner) return null;

  return (
    <>
      <div
        data-testid="store-offline-banner"
        className={`rounded-xl px-3 py-2 border flex flex-wrap items-center justify-between gap-2 text-xs flex-shrink-0 transition-colors ${
          !isOnline
            ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200'
            : failedCount > 0
            ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            : pendingCount > 0
            ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 text-blue-900 dark:text-blue-200'
            : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {!isOnline ? (
            <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />
          ) : toast?.type === 'success' && totalCount === 0 ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : failedCount > 0 ? (
            <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />
          ) : (
            <Wifi className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          )}

          <div className="min-w-0">
            {!isOnline ? (
              <span className="font-bold">
                โหมดออฟไลน์ (Offline Queue Active) — ข้อมูลสแกน/รับเข้า/เบิกจะถูกคิวไว้ในเครื่อง ({totalCount} รายการรอซิงค์)
              </span>
            ) : toast && totalCount === 0 ? (
              <span className="font-bold">{toast.text}</span>
            ) : (
              <span className="font-bold">
                คิวงานรอส่งเซิร์ฟเวอร์: {pendingCount} รายการ
                {failedCount > 0 && ` • ซิงค์ไม่ผ่าน ${failedCount} รายการ`}
              </span>
            )}
          </div>
        </div>

        {totalCount > 0 && (
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button
              type="button"
              onClick={() => setIsDrawerOpen(true)}
              className="px-2.5 py-1 rounded-lg bg-white/80 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-700 font-bold hover:bg-white transition-colors flex items-center gap-1 cursor-pointer min-h-[30px]"
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>ดูคิว ({totalCount})</span>
            </button>

            <button
              type="button"
              disabled={!isOnline || syncing}
              onClick={() => runSync(failedCount > 0)}
              className="px-3 py-1 rounded-lg bg-slate-900 dark:bg-blue-600 text-white font-bold hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-45 transition-colors flex items-center gap-1 cursor-pointer min-h-[30px]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              <span>{syncing ? 'กำลังซิงค์...' : failedCount > 0 ? 'ซิงค์ทั้งหมดใหม่' : 'ซิงค์ทันที'}</span>
            </button>
          </div>
        )}
      </div>

      {/* Queue Inspection Modal */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-[1000] bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[82vh] flex flex-col overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  คิวข้อมูลออฟไลน์คลังสินค้า (Offline FIFO Queue)
                </h3>
                <p className="text-[11px] text-slate-500">
                  รายการที่บันทึกขณะสัญญาณหลุด จะถูกส่งขึ้นเซิร์ฟเวอร์เรียงตามลำดับเวลาเมื่อเชื่อมต่อสำเร็จ
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              {queueItems.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  ไม่มีรายการค้างส่งในคิวออฟไลน์
                </div>
              ) : (
                queueItems.map((item, index) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                      item.status === 'failed'
                        ? 'bg-rose-50/70 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800'
                        : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200">
                          #{index + 1}
                        </span>
                        <span className="font-bold text-slate-800 dark:text-slate-100">
                          {MODULE_LABELS[item.module] || item.module}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            item.status === 'failed'
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300'
                              : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                          }`}
                        >
                          {item.status === 'failed' ? 'ซิงค์ไม่สำเร็จ' : 'รอซิงค์'}
                        </span>
                      </div>
                      <div className="font-semibold text-slate-700 dark:text-slate-200">
                        {item.summary || item.action}
                      </div>
                      <div className="text-[11px] font-mono text-slate-400">
                        บันทึกเมื่อ: {new Date(item.created_at).toLocaleString('th-TH')}
                        {item.retry_count > 0 && ` • ลองซ้ำ ${item.retry_count} ครั้ง`}
                      </div>
                      {item.error_message && (
                        <div className="text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                          สาเหตุ: {item.error_message}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => storeOfflineEngine.remove(item.id)}
                      title="ลบรายการนี้ออกจากคิว"
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 flex-shrink-0"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-900/80">
              <button
                type="button"
                disabled={failedCount === 0}
                onClick={() => storeOfflineEngine.clearFailed()}
                className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
              >
                ล้างรายการที่ไม่สำเร็จ ({failedCount})
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={!isOnline || syncing || totalCount === 0}
                  onClick={() => runSync(true)}
                  className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold disabled:opacity-45 flex items-center gap-1.5 cursor-pointer"
                >
                  <RotateCcw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
                  <span>{syncing ? 'กำลังซิงค์...' : 'ส่งข้อมูลเข้าเซิร์ฟเวอร์ทันที'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  BarChart3,
  ClipboardList,
  Factory,
  ListOrdered,
  Printer,
  RefreshCw,
  WifiOff,
} from 'lucide-react';
import { productionApi } from '../../../shared/services/productionApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import ProductionHistoryTab from '../components/ProductionTabs/ProductionHistoryTab';
import WipAndStockTab from '../components/ProductionTabs/WipAndStockTab';
import JobQueueTab from '../components/JobQueueTab';
import TagPrinterTab from '../components/TagPrinterTab';

const TABS = [
  {
    id: 'history',
    label: 'บันทึก & ประวัติการผลิต',
    shortLabel: 'บันทึกผลิต',
    icon: ClipboardList,
    desc: 'บันทึกยอดผลิต รับเข้า โอนย้าย และติดตามรายชั่วโมง',
  },
  {
    id: 'queue',
    label: 'คิวงานหน้าไลน์ (KDS)',
    shortLabel: 'คิวงาน KDS',
    icon: ListOrdered,
    desc: 'เปิด/หยุดงาน จัดลำดับคิวงาน และตรวจสอบสถานะ SAP BOM',
  },
  {
    id: 'printer',
    label: 'พิมพ์แท็ก (WIP/FG) & โอนย้าย QR',
    shortLabel: 'พิมพ์แท็ก & QR',
    icon: Printer,
    desc: 'พิมพ์สติกเกอร์ Thermal 4"×2" ZPL/HTML และสแกนยืนยันรับ-จ่าย',
  },
  {
    id: 'reports',
    label: 'รายงานสต็อก & แผนเทียบจริง',
    shortLabel: 'รายงาน/สต็อก',
    icon: BarChart3,
    desc: 'WIP คงเหลือ ราย Lot Plan vs Actual และผลงานรายบุคคล',
  },
];

/**
 * Self-contained Production Execution Hub (#/production).
 * Supports URL query sync (?tab=history|queue|printer|reports, ?mode=transfer, ?transfer_id=...).
 */
export default function ProductionPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const rawTab = searchParams.get('tab') || 'history';
  const activeTab = useMemo(
    () => (TABS.some((t) => t.id === rawTab) ? rawTab : 'history'),
    [rawTab],
  );
  const transferModeParam = searchParams.get('mode') || '';
  const transferIdParam = searchParams.get('transfer_id') || '';

  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && navigator.onLine === false,
  );
  const [metadata, setMetadata] = useState(null);
  const [loadingMeta, setLoadingMeta] = useState(true);
  const [metaError, setMetaError] = useState('');

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadMetadata = useCallback(async () => {
    setLoadingMeta(true);
    setMetaError('');
    try {
      const res = await productionApi.getInitialData();
      setMetadata(res?.data || {});
    } catch (err) {
      const msg = err?.message || 'ไม่สามารถโหลดข้อมูลพื้นฐานระบบผลิตได้';
      setMetaError(msg);
      toast.error(msg);
    } finally {
      setLoadingMeta(false);
    }
  }, [toast]);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const handleSelectTab = (tabId) => {
    if (tabId === 'printer' && (transferIdParam || transferModeParam)) {
      setSearchParams(
        {
          tab: 'printer',
          ...(transferModeParam ? { mode: transferModeParam } : {}),
          ...(transferIdParam ? { transfer_id: transferIdParam } : {}),
        },
        { replace: true },
      );
      return;
    }
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const currentTabMeta = TABS.find((t) => t.id === activeTab) || TABS[0];

  return (
    <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 pb-10">
      {/* Offline Guard Banner */}
      {isOffline && (
        <div
          role="alert"
          className="bg-rose-600 text-white px-4 py-2.5 flex flex-wrap items-center justify-center gap-2 text-xs sm:text-sm font-semibold shadow-sm"
        >
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>
            ขาดการเชื่อมต่อเครือข่าย (Offline) — ระบบปิดปุ่มบันทึกข้อมูลชั่วคราวเพื่อป้องกันข้อมูลสูญหาย
          </span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-3 sm:px-6 py-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm">
              <Factory className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight">
                  ระบบควบคุมการผลิตและคลังสินค้า (Production Execution)
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                  Toolbox SPA
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {currentTabMeta.desc}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {metadata?.current_user && (
              <div className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                ผู้ใช้งาน:{' '}
                <span className="font-semibold text-slate-900 dark:text-white">
                  {metadata.current_user.fullname || metadata.current_user.username}
                </span>
                {metadata.current_user.role ? ` (${metadata.current_user.role})` : ''}
              </div>
            )}
            <button
              type="button"
              onClick={loadMetadata}
              disabled={loadingMeta || isOffline}
              className="min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 text-xs sm:text-sm font-semibold disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingMeta ? 'animate-spin' : ''}`} />
              <span>รีเฟรชข้อมูลหลัก</span>
            </button>
          </div>
        </div>

        {/* Sticky / Responsive Module Tabs */}
        <div className="mt-4 -mb-4 flex items-center gap-1.5 overflow-x-auto pb-0 no-scrollbar">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`min-h-[44px] px-3.5 sm:px-4 py-2.5 rounded-t-xl border-b-2 text-xs sm:text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap transition-colors ${
                  active
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/30'
                    : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.shortLabel}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="px-3 sm:px-6 pt-5 space-y-4">
        {metaError && !metadata ? (
          <div className="rounded-2xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
              <div>
                <h2 className="font-bold text-rose-900 dark:text-rose-200">
                  เกิดข้อผิดพลาดในการโหลดข้อมูลระบบผลิต
                </h2>
                <p className="text-sm text-rose-700 dark:text-rose-300 mt-1">{metaError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={loadMetadata}
              className="min-h-[44px] px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold shrink-0"
            >
              ลองใหม่อีกครั้ง
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'history' && (
              <ProductionHistoryTab metadata={metadata} isOffline={isOffline} />
            )}
            {activeTab === 'queue' && (
              <JobQueueTab metadata={metadata} isOffline={isOffline} />
            )}
            {activeTab === 'printer' && (
              <TagPrinterTab
                key={`${transferModeParam || 'printer'}-${transferIdParam || ''}`}
                metadata={metadata}
                isOffline={isOffline}
                initialTransferId={transferIdParam}
                initialSubMode={transferModeParam === 'transfer' || transferIdParam ? 'transfer' : 'printer'}
              />
            )}
            {activeTab === 'reports' && (
              <WipAndStockTab metadata={metadata} isOffline={isOffline} />
            )}
          </>
        )}
      </div>
    </div>
  );
}

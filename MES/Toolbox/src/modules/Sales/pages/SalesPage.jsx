import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ClipboardList, FileText, ShieldCheck, Truck, WifiOff } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import SalesOrdersTab from '../components/SalesOrdersTab';
import ShippingScheduleTab from '../components/ShippingScheduleTab';

/**
 * Self-contained Sales Orders Tracking & Container Shipping Schedule workspace.
 */
export default function SalesPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'shipping' ? 'shipping' : 'orders';

  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));

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

  const isReadOnly = String(user?.role || '').toLowerCase() === 'customer';

  return (
    <div className="w-full space-y-5 p-3 sm:p-5">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>ออฟไลน์อยู่ — ไม่สามารถบันทึกหรือแก้ไขข้อมูลได้จนกว่าจะเชื่อมต่อเครือข่าย</span>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <ClipboardList className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Sales Orders & Shipping Schedule
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ติดตามสถานะ PO การผลิต การโหลดตู้คอนเทนเนอร์ และพยากรณ์วัตถุดิบขาดแคลน
              {isReadOnly && ' (โหมดอ่านอย่างเดียว)'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/loading-report"
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-orange-300 bg-orange-50 px-3.5 py-2 text-xs font-semibold text-orange-700 hover:bg-orange-100 dark:border-orange-800 dark:bg-orange-950/30 dark:text-orange-300"
          >
            <ShieldCheck className="h-4 w-4" />
            <span>Loading Report (C-TPAT)</span>
          </Link>
          <Link
            to="/auto-invoice"
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300"
          >
            <FileText className="h-4 w-4" />
            <span>Auto Invoice</span>
          </Link>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'orders' })}
          className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white shadow-sm dark:bg-blue-600'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <ClipboardList className="h-4 w-4" />
          <span>Sales Orders Tracking</span>
        </button>

        <button
          type="button"
          onClick={() => setSearchParams({ tab: 'shipping' })}
          className={`flex min-h-[44px] items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === 'shipping'
              ? 'bg-slate-900 text-white shadow-sm dark:bg-blue-600'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
          }`}
        >
          <Truck className="h-4 w-4" />
          <span>Shipping Loading Schedule</span>
        </button>
      </div>

      {activeTab === 'shipping' ? (
        <ShippingScheduleTab isReadOnly={isReadOnly} isOffline={isOffline} />
      ) : (
        <SalesOrdersTab isReadOnly={isReadOnly} isOffline={isOffline} />
      )}
    </div>
  );
}

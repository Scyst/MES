import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BarChart3, CalendarRange, TrendingUp, WifiOff } from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import ExecutiveOverviewTab from '../components/ExecutiveOverviewTab';
import ProductionPlanningTab from '../components/ProductionPlanningTab';

/**
 * Self-contained Management Hub combining Executive Financial Overview
 * and Production Planning / APS Schedule (#/management).
 */
export default function ManagementPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));

  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const role = String(user?.role || '').toLowerCase();
  const permissions = Array.isArray(user?.permissions) ? user.permissions : [];
  const canViewExecutive = role === 'creator' || role === 'admin' || role === 'manager' || permissions.includes('view_executive');

  const urlTab = searchParams.get('tab');
  const activeTab = urlTab === 'planning' || !canViewExecutive ? 'planning' : 'executive';

  return (
    <div className="w-full space-y-4">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>ออฟไลน์อยู่ — ปิดการบันทึก ซิงค์ค่าแรง หรือแก้ไขแผนชั่วคราวจนกว่าเครือข่ายจะกลับมา</span>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">
            <BarChart3 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 sm:text-lg dark:text-slate-100">
              Management Dashboard &amp; Production Planning
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ภาพรวมรายได้-ต้นทุนผู้บริหาร รายไลน์ผลิต และศูนย์วางแผนการผลิต / APS Auto-Plan
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {canViewExecutive && (
            <button
              type="button"
              onClick={() => setSearchParams({ tab: 'executive' })}
              className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-bold transition ${
                activeTab === 'executive'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Executive Overview</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => setSearchParams({ tab: 'planning' })}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-xs font-bold transition ${
              activeTab === 'planning'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
            }`}
          >
            <CalendarRange className="h-4 w-4" />
            <span>Production Planning</span>
          </button>
        </div>
      </div>

      {activeTab === 'executive' && canViewExecutive ? (
        <ExecutiveOverviewTab isOffline={isOffline} />
      ) : (
        <ProductionPlanningTab isOffline={isOffline} />
      )}
    </div>
  );
}

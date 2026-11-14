import React, { Suspense, lazy, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShieldAlert, FileSignature, CalendarCheck, CalendarRange, WifiOff, RefreshCw } from 'lucide-react';

const CasesNcrCarClaimTab = lazy(() => import('../components/CasesNcrCarClaimTab'));
const ConcessionTab = lazy(() => import('../components/ConcessionTab'));
const QaPlannerCalendarTab = lazy(() => import('../components/QaPlannerCalendarTab'));
const QaScheduleTab = lazy(() => import('../components/QaScheduleTab'));

const TABS = [
  { id: 'cases', label: 'NCR / CAR 8D & Claim', icon: ShieldAlert },
  { id: 'concession', label: 'Concession Request', icon: FileSignature },
  { id: 'planner', label: 'QA/QC Planner', icon: CalendarCheck },
  { id: 'schedule', label: 'QA/QC Schedule', icon: CalendarRange },
];

export default function QmsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = TABS.some((t) => t.id === searchParams.get('tab')) ? searchParams.get('tab') : 'cases';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [refreshTick, setRefreshTick] = useState(0);

  useEffect(() => {
    const paramTab = searchParams.get('tab');
    if (paramTab && TABS.some((t) => t.id === paramTab)) {
      setActiveTab(paramTab);
    }
  }, [searchParams]);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId }, { replace: true });
  };

  return (
    <div className="w-full space-y-4">
      {/* Offline Warning */}
      {!isOnline && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs font-bold">
          <WifiOff className="w-5 h-5 shrink-0 text-amber-600" />
          ขณะนี้ขาดการเชื่อมต่อเครือข่าย (Offline) ระบบระงับการบันทึกข้อมูลชั่วคราวเพื่อป้องกันข้อมูลสูญหาย
        </div>
      )}

      {/* Module Header */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
                  iQMS Quality Management Center
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-bold">SPA Ported</span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                ศูนย์บริหารคุณภาพ NCR, CAR 8D, Concession, Claim Verification และตารางตรวจสอบคุณภาพ QA/QC
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setRefreshTick((t) => t + 1)}
            className="min-h-[42px] px-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-xs font-bold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5 self-start sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" /> รีเฟรชข้อมูล
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleSelectTab(tab.id)}
                className={`min-h-[44px] px-4 py-2 rounded-xl text-xs sm:text-sm font-bold inline-flex items-center gap-2 transition-all ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Sub-module View */}
      <Suspense fallback={<div className="p-10 text-center text-sm text-slate-500 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800">กำลังโหลดโมดูลย่อย QMS...</div>}>
        {activeTab === 'cases' && <CasesNcrCarClaimTab key={`cases-${refreshTick}`} isOnline={isOnline} />}
        {activeTab === 'concession' && <ConcessionTab key={`concession-${refreshTick}`} isOnline={isOnline} />}
        {activeTab === 'planner' && <QaPlannerCalendarTab key={`planner-${refreshTick}`} isOnline={isOnline} />}
        {activeTab === 'schedule' && <QaScheduleTab key={`schedule-${refreshTick}`} isOnline={isOnline} />}
      </Suspense>
    </div>
  );
}

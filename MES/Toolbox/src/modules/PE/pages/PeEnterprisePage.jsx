import React, { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Wrench, Cpu, Package, Bell, Ban, ShieldAlert, Activity, Smartphone,
  ClipboardPlus, WifiOff, CheckCheck
} from 'lucide-react';
import { peApi } from '../../../shared/services/peApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import WorkOrdersTab from '../components/WorkOrdersTab';
import MachinesTab from '../components/MachinesTab';
import SparePartsTab from '../components/SparePartsTab';
import { formatPeDateTime } from '../utils/peFormatters';

const DowntimeAndAnalyticsTab = React.lazy(() => import('../components/DowntimeAndAnalyticsTab'));
const SafetyAndLotoTab = React.lazy(() => import('../components/SafetyAndLotoTab'));
const IiotAndMapTab = React.lazy(() => import('../components/IiotAndMapTab'));

const MAIN_TABS = [
  { id: 'work-orders', label: 'ใบแจ้งซ่อม (Work Orders)', icon: Wrench },
  { id: 'machines', label: 'ทะเบียนเครื่องจักร (Machines)', icon: Cpu },
  { id: 'spare-parts', label: 'คลังอะไหล่ (Spare Parts)', icon: Package },
  { id: 'downtime', label: 'วิเคราะห์ Downtime & MTBF', icon: Ban },
  { id: 'safety', label: 'ความปลอดภัย & LOTO', icon: ShieldAlert },
  { id: 'iiot', label: 'IIoT & ผังโรงงาน 2D', icon: Activity },
];

export default function PeEnterprisePage() {
  const showToast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'work-orders';

  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [openWoCount, setOpenWoCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [notifOpen, setNotifOpen] = useState(false);

  const loadNotifications = useCallback(async () => {
    try {
      const res = await peApi.getNotifications();
      setNotifications(res?.data || []);
    } catch {
      // Silent optional bell
    }
  }, []);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    loadNotifications();
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [loadNotifications]);

  const handleTabChange = (tabId) => {
    setSearchParams({ tab: tabId }, { replace: true });
  };

  const handleClearNotifications = async () => {
    if (isOffline) return;
    const res = await peApi.clearNotifications();
    showToast(res?.message || 'ล้างการแจ้งเตือนเรียบร้อยแล้ว', 'success');
    setNotifications([]);
    setNotifOpen(false);
  };

  return (
    <div className="w-full space-y-4">
      {isOffline && (
        <div className="p-3 rounded-xl bg-red-600 text-white text-sm font-semibold flex items-center gap-2 shadow-sm">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>ขณะนี้ขาดการเชื่อมต่อเครือข่าย (Offline) ระบบระงับการบันทึกข้อมูลชั่วคราวเพื่อป้องกันข้อมูลสูญหาย</span>
        </div>
      )}

      {/* Enterprise Header */}
      <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white flex items-center justify-center shadow-md shrink-0">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                PE Enterprise & Maintenance Hub
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-700">SPA Self-Contained</span>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              ศูนย์กลางบริหารงานวิศวกรรมซ่อมบำรุง ใบแจ้งซ่อม ทะเบียนเครื่องจักร และคลังอะไหล่อุตสาหกรรม
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/pe/request"
            className="min-h-[44px] px-3.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <ClipboardPlus className="w-4 h-4" />
            แจ้งซ่อม / Stop Cause
          </Link>
          <Link
            to="/pe/tech"
            className="min-h-[44px] px-3.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
          >
            <Smartphone className="w-4 h-4" />
            PE Tech Mobile
          </Link>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotifOpen((p) => !p)}
              className="min-h-[44px] min-w-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 relative inline-flex items-center justify-center"
              aria-label="การแจ้งเตือนซ่อมบำรุง"
            >
              <Bell className="w-4 h-4 text-slate-700 dark:text-slate-200" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 max-w-[90vw] rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xl z-40 overflow-hidden">
                <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-700 dark:text-slate-200">
                    การแจ้งเตือน ({notifications.length})
                  </span>
                  {notifications.length > 0 && (
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={handleClearNotifications}
                      className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      <CheckCheck className="w-3.5 h-3.5" /> ล้างทั้งหมด
                    </button>
                  )}
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-400">ไม่มีรายการแจ้งเตือนค้าง</div>
                  ) : (
                    notifications.map((n) => (
                      <div key={n.id} className="p-3 text-xs space-y-1">
                        <div className="font-semibold text-slate-900 dark:text-white">{n.title}</div>
                        <div className="text-slate-600 dark:text-slate-400">{n.message}</div>
                        <div className="text-[11px] text-slate-400">{formatPeDateTime(n.created_at)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Module Navigation Tabs */}
      <div className="flex flex-wrap gap-2">
        {MAIN_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 border transition-all ${
                isActive
                  ? 'bg-slate-900 dark:bg-blue-600 text-white border-slate-900 dark:border-blue-600 shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800 hover:bg-slate-50'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{tab.label}</span>
              {tab.id === 'work-orders' && openWoCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold">
                  {openWoCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      {activeTab === 'work-orders' && (
        <WorkOrdersTab isOffline={isOffline} onOpenCountChange={setOpenWoCount} />
      )}
      {activeTab === 'machines' && (
        <MachinesTab isOffline={isOffline} />
      )}
      {activeTab === 'spare-parts' && (
        <SparePartsTab isOffline={isOffline} />
      )}
      {(activeTab === 'downtime' || activeTab === 'safety' || activeTab === 'iiot') && (
        <React.Suspense
          fallback={
            <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">
              กำลังโหลดโมดูลวิศวกรรม...
            </div>
          }
        >
          {activeTab === 'downtime' && <DowntimeAndAnalyticsTab isOffline={isOffline} />}
          {activeTab === 'safety' && <SafetyAndLotoTab isOffline={isOffline} />}
          {activeTab === 'iiot' && <IiotAndMapTab isOffline={isOffline} />}
        </React.Suspense>
      )}
    </div>
  );
}

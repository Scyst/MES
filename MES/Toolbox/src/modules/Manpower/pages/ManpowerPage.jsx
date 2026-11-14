import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Users, ClipboardList, Star, TrendingUp, Award, CalendarDays, Settings,
  RefreshCw, WifiOff, CloudDownload, X
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { manpowerMasterApi, manpowerSyncApi } from '../../../shared/services/manpowerApi';
import { getTodayIso, offsetIsoDate } from '../utils/manpowerHelpers';

const ManpowerOverviewTab = lazy(() => import('../components/ManpowerOverviewTab'));
const DailyAttendanceTab = lazy(() => import('../components/DailyAttendanceTab'));
const EmployeeGradingTab = lazy(() => import('../components/EmployeeGradingTab'));
const GradingTrendTab = lazy(() => import('../components/GradingTrendTab'));
const SkillMatrixTab = lazy(() => import('../components/SkillMatrixTab'));
const HolidayCalendarTab = lazy(() => import('../components/HolidayCalendarTab'));
const MasterDataTab = lazy(() => import('../components/MasterDataTab'));

const TABS = [
  { id: 'overview', label: 'ภาพรวม & ต้นทุน', icon: Users, restricted: false },
  { id: 'attendance', label: 'ลงเวลาประจำวัน', icon: ClipboardList, restricted: false },
  { id: 'grading', label: 'ประเมินเกรด 4D', icon: Star, restricted: true },
  { id: 'trends', label: 'แนวโน้มเกรด', icon: TrendingUp, restricted: true },
  { id: 'skills', label: 'Skill Matrix', icon: Award, restricted: false },
  { id: 'holidays', label: 'ปฏิทินวันหยุด', icon: CalendarDays, restricted: false },
  { id: 'master', label: 'ข้อมูลหลักพนักงาน', icon: Settings, restricted: false },
];

export default function ManpowerPage() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = String(user?.role || '').toLowerCase();
  const canAccessGrading = ['creator', 'admin', 'manager'].includes(role);
  const canEdit = ['creator', 'admin', 'manager', 'supervisor'].includes(role);

  const requestedTab = searchParams.get('tab') || 'overview';
  const activeTab = TABS.some((t) => t.id === requestedTab && (!t.restricted || canAccessGrading))
    ? requestedTab
    : 'overview';

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [selectedDate, setSelectedDate] = useState(getTodayIso);
  const [hcGroup, setHcGroup] = useState('MAIN');
  const [structure, setStructure] = useState({ lines: [], teams: [], shifts: [], hc_groups: ['MAIN', 'TEAM 1', 'EXCLUDE'] });
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [attendanceDrillLine, setAttendanceDrillLine] = useState('ALL');

  // Sync scans modal
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [syncStart, setSyncStart] = useState(() => offsetIsoDate(getTodayIso(), -1));
  const [syncEnd, setSyncEnd] = useState(getTodayIso);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const loadStructure = useCallback(async () => {
    try {
      const res = await manpowerMasterApi.readStructure();
      if (res?.data) {
        setStructure(res.data);
      }
    } catch {
      // Initial fallback preserved
    }
  }, []);

  useEffect(() => {
    loadStructure();
  }, [loadStructure]);

  const switchTab = (tabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next, { replace: true });
  };

  const handleDrillLine = (lineName) => {
    setAttendanceDrillLine(lineName || 'ALL');
    switchTab('attendance');
  };

  const handleRunSync = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline) return;
    setSyncing(true);
    try {
      const res = await manpowerSyncApi.syncScans(syncStart, syncEnd);
      showToast(res?.message || 'ซิงค์ข้อมูลสแกนนิ้วเข้า-ออกงานเรียบร้อยแล้ว', 'success');
      setSyncModalOpen(false);
      setRefreshSignal((s) => s + 1);
    } catch (err) {
      showToast(err.message || 'ซิงค์ข้อมูลสแกนล้มเหลว', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const hcOptions = ['ALL', ...(Array.isArray(structure?.hc_groups) && structure.hc_groups.length ? structure.hc_groups : ['MAIN', 'TEAM 1', 'EXCLUDE'])];
  const uniqueHcOptions = Array.from(new Set(hcOptions));

  return (
    <div className="w-full space-y-5 p-3 sm:p-5">
      {/* Offline Warning Banner */}
      {!isOnline && (
        <div className="flex items-center gap-2.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          <WifiOff className="h-5 w-5 shrink-0" />
          ไม่สามารถเชื่อมต่อเครือข่าย (Offline Mode) — ระบบปิดการบันทึกและแก้ไขข้อมูลชั่วคราวเพื่อป้องกันข้อมูลสูญหาย
        </div>
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-sm">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-xl">
                Manpower &amp; Workforce Analytics Center
              </h1>
              <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                SPA Ported
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              จัดการกำลังคนประจำวัน ต้นทุนค่าแรง (V1/V2) สลับกะ 4D Grading และ Skill Matrix ครบวงจร
            </p>
          </div>
        </div>

        {/* Global Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />

          <select
            value={hcGroup}
            onChange={(e) => setHcGroup(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            {uniqueHcOptions.map((grp) => (
              <option key={grp} value={grp}>กลุ่มกำลังคน: {grp}</option>
            ))}
          </select>

          {canEdit && (
            <button
              type="button"
              disabled={!isOnline}
              onClick={() => setSyncModalOpen(true)}
              className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-teal-600 px-3.5 text-xs font-semibold text-white shadow-2xs hover:bg-teal-700 disabled:opacity-50"
            >
              <CloudDownload className="h-4 w-4" />
              ซิงค์เครื่องสแกน
            </button>
          )}

          <button
            type="button"
            onClick={() => setRefreshSignal((s) => s + 1)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            title="รีเฟรชข้อมูลล่าสุด"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex gap-1.5 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        {TABS.filter((t) => !t.restricted || canAccessGrading).map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => switchTab(t.id)}
              className={`min-h-[44px] shrink-0 inline-flex items-center gap-2 rounded-lg px-4 text-xs font-bold transition ${
                active
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700'
              }`}
            >
              <Icon className="h-4 w-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">กำลังโหลดหน้าจอ...</div>}>
        {activeTab === 'overview' && (
          <ManpowerOverviewTab
            date={selectedDate}
            hcGroup={hcGroup}
            refreshSignal={refreshSignal}
            onDrillLine={handleDrillLine}
          />
        )}
        {activeTab === 'attendance' && (
          <DailyAttendanceTab
            date={selectedDate}
            hcGroup={hcGroup}
            structure={structure}
            initialLineFilter={attendanceDrillLine}
            canEdit={canEdit}
            isOnline={isOnline}
            refreshSignal={refreshSignal}
            onMutated={() => setRefreshSignal((s) => s + 1)}
          />
        )}
        {activeTab === 'grading' && canAccessGrading && (
          <EmployeeGradingTab
            hcGroup={hcGroup}
            structure={structure}
            isOnline={isOnline}
          />
        )}
        {activeTab === 'trends' && canAccessGrading && (
          <GradingTrendTab
            hcGroup={hcGroup}
            structure={structure}
          />
        )}
        {activeTab === 'skills' && (
          <SkillMatrixTab
            hcGroup={hcGroup}
            structure={structure}
            canEdit={canEdit}
            isOnline={isOnline}
          />
        )}
        {activeTab === 'holidays' && (
          <HolidayCalendarTab
            canEdit={canEdit}
            isOnline={isOnline}
            onMutated={() => setRefreshSignal((s) => s + 1)}
          />
        )}
        {activeTab === 'master' && (
          <MasterDataTab
            structure={structure}
            canEdit={canEdit}
            isOnline={isOnline}
            onStructureUpdated={() => {
              loadStructure();
              setRefreshSignal((s) => s + 1);
            }}
          />
        )}
      </Suspense>

      {/* Cloud Punch Sync Modal */}
      {syncModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleRunSync}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
                <CloudDownload className="h-5 w-5 text-teal-600" />
                ซิงค์เวลาเข้า-ออกจากเครื่องสแกนกลาง
              </h4>
              <button type="button" onClick={() => setSyncModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">
              ระบบจะดึงเวลาสแกนดิบ จับคู่เวลาเข้า-ออกตามกะงาน (ข้ามรายการที่ผู้ดูแลยืนยันแล้ว) และคำนวณต้นทุนค่าแรงใหม่อัตโนมัติ
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">วันเริ่มต้น</label>
                <input
                  type="date"
                  required
                  value={syncStart}
                  onChange={(e) => setSyncStart(e.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">วันสิ้นสุด</label>
                <input
                  type="date"
                  required
                  value={syncEnd}
                  onChange={(e) => setSyncEnd(e.target.value)}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSyncModalOpen(false)} className="min-h-[44px] rounded-lg border px-4 text-sm font-semibold dark:border-slate-600">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={syncing || !isOnline}
                className="min-h-[44px] rounded-lg bg-teal-600 px-5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {syncing ? 'กำลังซิงค์ข้อมูล...' : 'เริ่มซิงค์ทันที'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

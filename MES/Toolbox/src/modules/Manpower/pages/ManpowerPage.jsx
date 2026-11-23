import React, { useState, useEffect, useCallback, lazy, Suspense } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
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

const LEGACY_TAB_REDIRECTS = {
  grading: '/manpower/grading',
  trends: '/manpower/grading?view=trends',
  audit5s: '/audit-5s',
  holidays: '/manpower/holidays',
  skills: '/manpower/skills',
  master: '/manpower/master',
};

const OPS_TABS = [
  { id: 'overview', label: 'ภาพรวม & ต้นทุน', icon: Users },
  { id: 'attendance', label: 'ลงเวลาประจำวัน', icon: ClipboardList },
];

export default function ManpowerPage({ section = 'operations' }) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  const role = String(user?.role || '').toLowerCase();
  const canAccessGrading = ['creator', 'admin', 'manager'].includes(role);
  const canEdit = ['creator', 'admin', 'manager', 'supervisor'].includes(role);

  const requestedTab = searchParams.get('tab');
  const gradingView = searchParams.get('view') === 'trends' ? 'trends' : 'grading';
  const opsTab = requestedTab === 'attendance' ? 'attendance' : 'overview';

  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  const [selectedDate, setSelectedDate] = useState(getTodayIso);
  const [hcGroup, setHcGroup] = useState('TEAM 1');
  const [structure, setStructure] = useState({ lines: [], teams: [], shifts: [], hc_groups: ['TEAM 1', 'EXCLUDE'] });
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [attendanceDrillLine, setAttendanceDrillLine] = useState('ALL');

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

  if (section === 'operations' && requestedTab && LEGACY_TAB_REDIRECTS[requestedTab]) {
    return <Navigate to={LEGACY_TAB_REDIRECTS[requestedTab]} replace />;
  }

  if (section === 'grading' && !canAccessGrading) {
    return <Navigate to="/manpower" replace />;
  }

  const switchOpsTab = (tabId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tabId);
    setSearchParams(next, { replace: true });
  };

  const switchGradingView = (nextView) => {
    const next = new URLSearchParams(searchParams);
    next.set('view', nextView);
    setSearchParams(next, { replace: true });
  };

  const handleDrillLine = (lineName) => {
    setAttendanceDrillLine(lineName || 'ALL');
    switchOpsTab('attendance');
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

  const uniqueHcOptions = Array.from(new Set([
    'TEAM 1',
    'ALL',
    ...(Array.isArray(structure?.hc_groups) && structure.hc_groups.length ? structure.hc_groups : ['EXCLUDE']),
  ]));

  const sectionMeta = {
    holidays: { title: 'ปฏิทินวันหยุด & ตัวคูณค่าแรง', icon: CalendarDays },
    skills: { title: 'Skill Matrix (ตารางทักษะพนักงาน)', icon: Award },
    master: { title: 'ข้อมูลหลักพนักงาน & กะสายผลิต', icon: Settings },
  }[section];

  return (
    <div className="w-full space-y-3">
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800 dark:border-rose-800 dark:bg-rose-950/60 dark:text-rose-200">
          <WifiOff className="h-4 w-4 shrink-0" />
          ไม่สามารถเชื่อมต่อเครือข่าย (Offline Mode) — ระบบปิดการบันทึกและแก้ไขข้อมูลชั่วคราวเพื่อป้องกันข้อมูลสูญหาย
        </div>
      )}

      {/* Slim Single-Row Header for Operations, Holidays, Skills, Master (Grading has its own all-in-one slim bar) */}
      {section === 'operations' && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-700">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <Users className="h-4 w-4" />
              </div>
              <span className="text-sm font-extrabold text-slate-800 dark:text-white">กำลังคนประจำวัน</span>
            </div>

            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
              {OPS_TABS.map((t) => {
                const Icon = t.icon;
                const active = opsTab === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => switchOpsTab(t.id)}
                    className={`min-h-[36px] inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-bold transition ${
                      active
                        ? 'bg-white text-emerald-700 shadow-2xs dark:bg-slate-800 dark:text-emerald-300'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {t.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="min-h-[38px] rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
            <select
              value={hcGroup}
              onChange={(e) => setHcGroup(e.target.value)}
              className="min-h-[38px] rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {uniqueHcOptions.map((grp) => (
                <option key={grp} value={grp}>กลุ่ม: {grp}</option>
              ))}
            </select>
            {canEdit && (
              <button
                type="button"
                disabled={!isOnline}
                onClick={() => setSyncModalOpen(true)}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-3 text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                <CloudDownload className="h-3.5 w-3.5" />
                ซิงค์เครื่องสแกน
              </button>
            )}
            <button
              type="button"
              onClick={() => setRefreshSignal((s) => s + 1)}
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {(section === 'holidays' || section === 'skills' || section === 'master') && sectionMeta && (
        <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <sectionMeta.icon className="h-4 w-4" />
            </div>
            <h1 className="text-sm font-extrabold text-slate-800 dark:text-white">{sectionMeta.title}</h1>
          </div>

          <div className="flex items-center gap-2">
            {section === 'skills' && (
              <select
                value={hcGroup}
                onChange={(e) => setHcGroup(e.target.value)}
                className="min-h-[38px] rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                {uniqueHcOptions.map((grp) => (
                  <option key={grp} value={grp}>กลุ่ม: {grp}</option>
                ))}
              </select>
            )}
            <button
              type="button"
              onClick={() => setRefreshSignal((s) => s + 1)}
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              title="รีเฟรชข้อมูลล่าสุด"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <Suspense fallback={<div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-400 dark:border-slate-700 dark:bg-slate-800">กำลังโหลดหน้าจอ...</div>}>
        {section === 'operations' && opsTab === 'overview' && (
          <ManpowerOverviewTab
            date={selectedDate}
            hcGroup={hcGroup}
            refreshSignal={refreshSignal}
            onDrillLine={handleDrillLine}
          />
        )}
        {section === 'operations' && opsTab === 'attendance' && (
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

        {section === 'grading' && gradingView === 'grading' && (
          <EmployeeGradingTab
            hcGroup={hcGroup}
            onChangeHcGroup={setHcGroup}
            hcOptions={uniqueHcOptions}
            structure={structure}
            isOnline={isOnline}
            gradingView={gradingView}
            onChangeGradingView={switchGradingView}
            refreshSignal={refreshSignal}
            onRefresh={() => setRefreshSignal((s) => s + 1)}
          />
        )}
        {section === 'grading' && gradingView === 'trends' && (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <span className="text-sm font-extrabold text-slate-800 dark:text-white">ประเมินเกรด 4 มิติ</span>
                <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
                  <button
                    type="button"
                    onClick={() => switchGradingView('grading')}
                    className="min-h-[34px] inline-flex items-center gap-1.5 rounded-md px-3 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300"
                  >
                    <Star className="h-3.5 w-3.5" /> ตารางเกรด 4D
                  </button>
                  <button
                    type="button"
                    className="min-h-[34px] inline-flex items-center gap-1.5 rounded-md bg-white px-3 text-xs font-bold text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300"
                  >
                    <TrendingUp className="h-3.5 w-3.5" /> แนวโน้มเกรด
                  </button>
                </div>
              </div>
              <select
                value={hcGroup}
                onChange={(e) => setHcGroup(e.target.value)}
                className="min-h-[38px] rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                {uniqueHcOptions.map((grp) => (
                  <option key={grp} value={grp}>กลุ่ม: {grp}</option>
                ))}
              </select>
            </div>
            <GradingTrendTab hcGroup={hcGroup} structure={structure} />
          </div>
        )}

        {section === 'holidays' && (
          <HolidayCalendarTab
            canEdit={canEdit}
            isOnline={isOnline}
            onMutated={() => setRefreshSignal((s) => s + 1)}
            key={`hol-${refreshSignal}`}
          />
        )}
        {section === 'skills' && (
          <SkillMatrixTab
            hcGroup={hcGroup}
            structure={structure}
            canEdit={canEdit}
            isOnline={isOnline}
            key={`skl-${refreshSignal}`}
          />
        )}
        {section === 'master' && (
          <MasterDataTab
            structure={structure}
            canEdit={canEdit}
            isOnline={isOnline}
            onStructureUpdated={() => {
              loadStructure();
              setRefreshSignal((s) => s + 1);
            }}
            key={`mst-${refreshSignal}`}
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

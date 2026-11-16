import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Calendar,
  Coins,
  Crown,
  DollarSign,
  Download,
  Edit,
  FileText,
  Lock,
  Network,
  Save,
  Table2,
  Target,
  TrendingDown,
  TrendingUp,
  Unlock,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { dailyPlApi } from '../../../shared/services/dailyPlApi';
import {
  ExchangeRateModal,
  HolidayCalendarModal,
  MonthlyBudgetModal,
} from '../components/PlModals';
import PlStatementViews from '../components/PlStatementViews';
import PlStructureTab from '../components/PlStructureTab';
import {
  computePlSummary,
  exportPlRowsToExcel,
  formatPlNumber,
  resolveEntryFormulas,
} from '../utils/plFormulaEngine';

/**
 * Self-contained Daily P&L Hub combining Daily Entry, Period Report,
 * Financial Statement (Yearly/Daily), Executive P&L Summary, and Structure Setup (#/daily-pl).
 */
export default function DailyPlPage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
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
  const canManagePl = role === 'creator' || role === 'admin' || permissions.includes('manage_pl');

  const rawTab = searchParams.get('tab') || 'daily';
  const activeTab = ['daily', 'report', 'statement', 'executive', 'settings'].includes(rawTab)
    ? rawTab
    : 'daily';

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const monthStartStr = useMemo(() => `${todayStr.slice(0, 7)}-01`, [todayStr]);

  const [team, setTeam] = useState('TEAM 1');
  const [section, setSection] = useState('ALL');
  const [sectionsList, setSectionsList] = useState(['ALL']);
  const [targetDate, setTargetDate] = useState(todayStr);
  const [startDate, setStartDate] = useState(monthStartStr);
  const [endDate, setEndDate] = useState(todayStr);

  const [entryRows, setEntryRows] = useState([]);
  const [isLocked, setIsLocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [stmtPeriodMode, setStmtPeriodMode] = useState('yearly');
  const [stmtYear, setStmtYear] = useState(() => new Date().getFullYear());
  const [stmtMonth, setStmtMonth] = useState(() => todayStr.slice(0, 7));
  const [stmtRows, setStmtRows] = useState([]);
  const [stmtLockedDays, setStmtLockedDays] = useState([]);
  const [stmtLoading, setStmtLoading] = useState(false);

  const [budgetOpen, setBudgetOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const loadLines = useCallback(async () => {
    const res = await dailyPlApi.getActiveLines(team);
    if (res?.success && Array.isArray(res.data)) {
      setSectionsList(res.data);
      if (!res.data.includes(section)) {
        setSection(res.data[0] || 'ALL');
      }
    }
  }, [team, section]);

  useEffect(() => {
    loadLines();
  }, [loadLines]);

  const loadEntryOrReport = useCallback(async () => {
    if (activeTab !== 'daily' && activeTab !== 'report') return;
    setLoading(true);
    try {
      if (activeTab === 'daily') {
        const res = await dailyPlApi.readEntry(targetDate, section, team);
        if (res?.success && res.data) {
          setIsLocked(Number(res.data.is_locked || 0) === 1);
          setEntryRows(resolveEntryFormulas(res.data.items || []));
        }
      } else {
        const res = await dailyPlApi.reportRange(startDate, endDate, section);
        if (res?.success && Array.isArray(res.data)) {
          setIsLocked(true);
          setEntryRows(resolveEntryFormulas(res.data));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab, targetDate, startDate, endDate, section, team]);

  useEffect(() => {
    loadEntryOrReport();
  }, [loadEntryOrReport]);

  const loadStatementOrExec = useCallback(async () => {
    if (activeTab !== 'statement' && activeTab !== 'executive') return;
    setStmtLoading(true);
    try {
      if (stmtPeriodMode === 'yearly') {
        const res = await dailyPlApi.statementYearly(stmtYear, section);
        if (res?.success) {
          setStmtRows(res.data || []);
          setStmtLockedDays([]);
        }
      } else {
        const [y, m] = String(stmtMonth).split('-').map(Number);
        const res = await dailyPlApi.statementDaily(y, m, section);
        if (res?.success && res.data) {
          setStmtRows(res.data.items || []);
          setStmtLockedDays(res.data.locked_days || []);
        }
      }
    } finally {
      setStmtLoading(false);
    }
  }, [activeTab, stmtPeriodMode, stmtYear, stmtMonth, section]);

  useEffect(() => {
    loadStatementOrExec();
  }, [loadStatementOrExec]);

  const summary = useMemo(() => computePlSummary(entryRows), [entryRows]);

  const handleFieldChange = (itemId, field, value) => {
    const updated = entryRows.map((row) => {
      if (row.item_id !== itemId) return row;
      return {
        ...row,
        [field]: field === 'actual_amount' ? Number(value || 0) : value,
      };
    });
    setEntryRows(resolveEntryFormulas(updated));
  };

  const handleSaveSnapshot = async () => {
    if (!canManagePl || isLocked || isOffline || saving) return;
    setSaving(true);
    try {
      const payloadItems = entryRows
        .filter((r) => !String(r.data_source || '').startsWith('AUTO'))
        .map((r) => ({
          item_id: r.item_id,
          actual_amount: Number(r.actual_amount || 0),
          remark: r.remark || '',
        }));
      const res = await dailyPlApi.saveBatch(targetDate, section, payloadItems);
      if (res?.success) {
        toast.success(res.message);
        loadEntryOrReport();
      }
    } finally {
      setSaving(false);
    }
  };

  const handleToggleLock = async () => {
    if (!canManagePl || isOffline) return;
    const ok = await confirm({
      title: isLocked ? 'ปลดล็อกข้อมูลประจำวัน' : 'ล็อกข้อมูลประจำวัน',
      message: isLocked
        ? `ยืนยันการปลดล็อกวันที่ ${targetDate} (${section}) เพื่อให้แก้ไขได้?`
        : `ยืนยันการล็อกข้อมูลวันที่ ${targetDate} (${section})?`,
      confirmText: isLocked ? 'ปลดล็อก' : 'ล็อกข้อมูล',
      danger: !isLocked,
    });
    if (!ok) return;
    const res = await dailyPlApi.toggleLock(targetDate, section);
    if (res?.success) {
      setIsLocked(Number(res.data?.is_locked || 0) === 1);
      toast.success(res.message);
      loadEntryOrReport();
    }
  };

  return (
    <div className="w-full space-y-4">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>ออฟไลน์อยู่ — ปิดการบันทึกงบกำไรขาดทุนชั่วคราว</span>
        </div>
      )}

      {/* Header & Navigation */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm xl:flex-row xl:items-center xl:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            <Coins className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-base font-black text-slate-900 sm:text-lg dark:text-slate-100">
              Daily P&amp;L Entry &amp; Financial Statements
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              บันทึกงบกำไรขาดทุนรายวัน รายงานสรุปช่วงเวลา และตั้งค่าผังบัญชี P&amp;L
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'daily', label: 'Daily Entry', icon: Edit },
            { id: 'report', label: 'Period Report', icon: FileText },
            { id: 'statement', label: 'Statement', icon: Table2 },
            { id: 'executive', label: 'Executive Summary', icon: Crown },
            ...(canManagePl ? [{ id: 'settings', label: 'Structure Setup', icon: Network }] : []),
          ].map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setSearchParams({ tab: t.id })}
                className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl px-3 text-xs font-bold transition ${
                  active
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Filters & Action Toolbar (when not in Structure Setup) */}
      {activeTab !== 'settings' && (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
          <div className="flex flex-wrap items-center gap-2">
            <select value={team} onChange={(e) => setTeam(e.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
              <option value="ALL">-- All Teams --</option>
              <option value="TEAM 1">TEAM 1</option>
              <option value="TEAM 2">TEAM 2</option>
            </select>
            <select value={section} onChange={(e) => setSection(e.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
              {sectionsList.map((sec) => (
                <option key={sec} value={sec}>{sec === 'ALL' ? '-- All Lines --' : sec}</option>
              ))}
            </select>

            {activeTab === 'daily' && (
              <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className="min-h-[40px] rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800" />
            )}
            {activeTab === 'report' && (
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-transparent font-bold focus:outline-none" />
                <span>-</span>
                <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-transparent font-bold focus:outline-none" />
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'daily' && canManagePl && (
              <>
                <button
                  type="button"
                  disabled={saving || isLocked || isOffline}
                  onClick={handleSaveSnapshot}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4" />
                  <span>{saving ? 'กำลังบันทึก...' : 'Save Day'}</span>
                </button>
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={handleToggleLock}
                  className={`inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
                    isLocked
                      ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                      : 'border-rose-300 bg-rose-50 text-rose-700'
                  }`}
                >
                  {isLocked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  <span>{isLocked ? 'Unlock Day' : 'Lock Day'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBudgetOpen(true)}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-cyan-300 bg-cyan-50 px-3 text-xs font-bold text-cyan-800"
                >
                  <Target className="h-4 w-4" />
                  <span>Budget</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRateOpen(true)}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800"
                >
                  <DollarSign className="h-4 w-4" />
                  <span>Ex.Rate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setCalendarOpen(true)}
                  className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Calendar className="h-4 w-4" />
                  <span>Calendar</span>
                </button>
              </>
            )}

            {(activeTab === 'daily' || activeTab === 'report') && (
              <button
                type="button"
                onClick={() => exportPlRowsToExcel(entryRows, section, activeTab === 'daily' ? targetDate : `${startDate}_${endDate}`)}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>Export</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Entry / Report Views */}
      {(activeTab === 'daily' || activeTab === 'report') && (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 border-l-4 border-l-blue-600 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Revenue</div>
              <div className="mt-1 font-mono text-xl font-black text-blue-600">{formatPlNumber(summary.revenue)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 border-l-4 border-l-rose-600 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-bold uppercase text-slate-400">Total Expense</div>
              <div className="mt-1 font-mono text-xl font-black text-rose-600">{formatPlNumber(summary.expense)}</div>
            </div>
            <div className="rounded-2xl border border-slate-200 border-l-4 border-l-emerald-600 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-bold uppercase text-slate-400">Net Profit</div>
              <div className={`mt-1 font-mono text-xl font-black ${summary.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatPlNumber(summary.netProfit)}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 border-l-4 border-l-cyan-600 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
              <div className="text-[11px] font-bold uppercase text-slate-400">Net Margin</div>
              <div className={`mt-1 font-mono text-xl font-black ${summary.margin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {summary.margin.toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                  <tr>
                    <th className="p-3">Account Item</th>
                    <th className="p-3 text-center">Code</th>
                    <th className="p-3 text-center">Src</th>
                    <th className="p-3 text-right">{activeTab === 'daily' ? 'Daily Target' : 'Period Target'}</th>
                    <th className="p-3 text-right">Actual</th>
                    <th className="p-3 text-center">Diff</th>
                    <th className="p-3">Remark</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loading ? (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400">กำลังโหลดรายการ P&amp;L...</td></tr>
                  ) : entryRows.length === 0 ? (
                    <tr><td colSpan={7} className="py-10 text-center text-slate-400">ไม่พบรายการโครงสร้างบัญชี</td></tr>
                  ) : entryRows.map((row) => {
                    const lvl = Number(row.item_level || 0);
                    const isAuto = String(row.data_source || '').includes('AUTO');
                    const isCalc = row.data_source === 'CALCULATED';
                    const canEditRow = activeTab === 'daily' && canManagePl && !isLocked && !isAuto && !isCalc;
                    const actual = Number(row.actual_amount || 0);
                    const target = Number(row.daily_target || 0);
                    const diff = actual - target;
                    const pct = target > 0 ? Math.abs((diff / target) * 100).toFixed(0) : null;
                    const isFavorable = row.item_type === 'REVENUE' ? diff >= 0 : diff <= 0;

                    return (
                      <tr key={row.item_id} className={lvl === 0 ? 'bg-slate-50/80 font-bold dark:bg-slate-800/40' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/30'}>
                        <td className="p-2.5" style={{ paddingLeft: `${12 + lvl * 16}px` }}>{row.item_name}</td>
                        <td className="p-2.5 text-center font-mono text-[11px] text-slate-500">{row.account_code}</td>
                        <td className="p-2.5 text-center">
                          <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[10px] font-bold text-white ${
                            isAuto ? 'bg-cyan-600' : isCalc ? 'bg-purple-600' : 'bg-slate-500'
                          }`}>
                            {isAuto ? 'A' : isCalc ? 'F' : 'M'}
                          </span>
                        </td>
                        <td className="p-2.5 text-right font-mono text-slate-500">{formatPlNumber(target)}</td>
                        <td className="p-2 text-right">
                          {canEditRow ? (
                            <input
                              type="number"
                              step="0.01"
                              value={actual}
                              onChange={(e) => handleFieldChange(row.item_id, 'actual_amount', e.target.value)}
                              className="w-32 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
                            />
                          ) : (
                            <span className={`font-mono font-bold ${isCalc ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                              {formatPlNumber(actual)}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 text-center font-mono text-[11px] font-bold">
                          {pct === null || Math.abs(diff) < 0.01 ? (
                            <span className="text-slate-300">-</span>
                          ) : (
                            <span className={`inline-flex items-center gap-0.5 ${isFavorable ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {diff > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {pct}%
                            </span>
                          )}
                        </td>
                        <td className="p-2">
                          {canEditRow ? (
                            <input
                              type="text"
                              value={row.remark || ''}
                              onChange={(e) => handleFieldChange(row.item_id, 'remark', e.target.value)}
                              placeholder="..."
                              className="w-40 rounded-lg border border-slate-200 px-2 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-800"
                            />
                          ) : (
                            <span className="text-slate-400">{row.remark || '-'}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {(activeTab === 'statement' || activeTab === 'executive') && (
        <PlStatementViews
          variant={activeTab}
          periodMode={stmtPeriodMode}
          onPeriodModeChange={setStmtPeriodMode}
          year={stmtYear}
          onYearChange={setStmtYear}
          monthStr={stmtMonth}
          onMonthChange={setStmtMonth}
          rawRows={stmtRows}
          lockedDays={stmtLockedDays}
          loading={stmtLoading}
        />
      )}

      {activeTab === 'settings' && canManagePl && (
        <PlStructureTab isOffline={isOffline} />
      )}

      <MonthlyBudgetModal
        open={budgetOpen}
        section={section}
        entryItems={entryRows}
        isOffline={isOffline}
        onClose={() => setBudgetOpen(false)}
        onSaved={(msg) => {
          toast.success(msg);
          setBudgetOpen(false);
          loadEntryOrReport();
        }}
        onOpenRate={() => setRateOpen(true)}
        onOpenCalendar={() => setCalendarOpen(true)}
      />

      <ExchangeRateModal
        open={rateOpen}
        isOffline={isOffline}
        onClose={() => setRateOpen(false)}
        onSaved={(msg) => {
          toast.success(msg);
          setRateOpen(false);
        }}
      />

      <HolidayCalendarModal
        open={calendarOpen}
        isOffline={isOffline}
        onClose={() => setCalendarOpen(false)}
        onChanged={(msg) => toast.success(msg)}
      />
    </div>
  );
}

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, RefreshCw, Download, Lock, Unlock, MessageSquareCheck, AlertTriangle, PackageCheck
} from 'lucide-react';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import ShiftGroupLedgerList from './ShiftGroupLedgerList';
import {
  getProductionDate, getMonthStartStr, getMoodMeta, groupLogsByUserDay, exportLogsToExcel
} from '../utils/dailyLogHelpers';

export default function TeamShiftLedgerTab({
  lines = [],
  isPrivacyMode,
  onTogglePrivacyRequest,
  onOpenReply,
  onOpenHistory,
  reloadSignal = 0
}) {
  const todayStr = getProductionDate();
  const [startDate, setStartDate] = useState(todayStr);
  const [endDate, setEndDate] = useState(todayStr);
  const [line, setLine] = useState('All');
  const [periodId, setPeriodId] = useState(0);
  const [replyStatus, setReplyStatus] = useState('ALL');
  const [onlyNegative, setOnlyNegative] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const [kpi, setKpi] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Debounce search input (300ms rule)
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const applyPreset = (preset) => {
    const now = new Date(`${todayStr}T12:00:00`);
    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === '7d') {
      const p = new Date(now);
      p.setDate(p.getDate() - 6);
      setStartDate(p.toISOString().slice(0, 10));
      setEndDate(todayStr);
    } else if (preset === 'month') {
      setStartDate(getMonthStartStr(todayStr));
      setEndDate(todayStr);
    }
    setPage(1);
  };

  const fetchTeamLedger = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, tableRes] = await Promise.all([
        dailyLogApi.getOverviewStats({ startDate, endDate, line }),
        dailyLogApi.getIssuesTable({
          startDate,
          endDate,
          line,
          periodId,
          onlyNegative,
          replyStatus,
          search: debouncedSearch,
          page,
          limit
        })
      ]);

      if (statsRes?.success && statsRes.data) {
        setKpi(statsRes.data.kpi);
      }
      if (tableRes?.success && tableRes.data) {
        setRows(tableRes.data.rows || []);
        setPagination(tableRes.data.pagination || { page: 1, limit, total: 0, totalPages: 1 });
      }
    } catch (err) {
      console.error('Failed to load team shift ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, line, periodId, onlyNegative, replyStatus, debouncedSearch, page, limit]);

  useEffect(() => {
    fetchTeamLedger();
  }, [fetchTeamLedger, reloadSignal]);

  const groupedRows = useMemo(() => groupLogsByUserDay(rows), [rows]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await dailyLogApi.getExportData({
        startDate,
        endDate,
        line,
        onlyNegative,
        exportType: 'logs'
      });
      if (res?.success) {
        exportLogsToExcel(res.data || [], `Team_Shift_Ledger_${startDate}_to_${endDate}.xlsx`, isPrivacyMode);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const avgMood = Number(kpi?.avg_mood || 0);
  const avgMeta = getMoodMeta(avgMood);

  return (
    <div className="space-y-5">
      {/* Factory Shift Summary Banner */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-700 text-white shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] uppercase tracking-wider opacity-80 font-bold">Factory Mood</div>
            <div className="text-2xl font-black mt-0.5">
              {avgMood > 0 ? avgMood.toFixed(2) : '-'} <span className="text-sm font-normal opacity-75">/ 5.0</span>
            </div>
            <div className="text-xs opacity-80 mt-0.5">รวม {Number(kpi?.total_responses || 0).toLocaleString()} รายการ</div>
          </div>
          <span className="text-4xl">{avgMood > 0 ? avgMeta.emoji : '😐'}</span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>ตอบกลับแล้ว (Replied)</span>
            <MessageSquareCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">
            {Number(kpi?.replied_count || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">
            จาก {Number(kpi?.total_responses || 0).toLocaleString()} บันทึก
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>เฝ้าระวัง (Score 1-2)</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
            {Number(kpi?.negative_count || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">รายการความรู้สึกเชิงลบ</div>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold">
            <span>ยอดผลิตที่บันทึกรวม</span>
            <PackageCheck className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1 font-mono">
            {Number(kpi?.total_production_qty || 0).toLocaleString()}
          </div>
          <div className="text-xs text-slate-400 mt-0.5">ยังไม่ลงทะเบียนวันนี้: {Number(kpi?.missing_count || 0)} คน</div>
        </div>
      </div>

      {/* Filters & Controls */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'วันนี้ (Today)' },
              { id: '7d', label: '7 วันล่าสุด' },
              { id: 'month', label: 'เดือนนี้' }
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyPreset(p.id)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 text-xs font-semibold text-slate-700 dark:text-slate-200"
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onTogglePrivacyRequest}
              className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-colors ${
                isPrivacyMode
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {isPrivacyMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
              {isPrivacyMode ? 'PDPA Privacy: ล็อกอยู่ (กดเพื่อปลดล็อก)' : 'PDPA Privacy: แสดงชื่อจริง'}
            </button>

            <button
              type="button"
              onClick={handleExport}
              disabled={exporting}
              className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" />
              Export Excel
            </button>

            <button
              type="button"
              onClick={fetchTeamLedger}
              className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
              aria-label="รีเฟรชข้อมูล"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          />
          <select
            value={line}
            onChange={(e) => { setLine(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="All">ทุกสายผลิต (All Lines)</option>
            {lines.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
          <select
            value={periodId}
            onChange={(e) => { setPeriodId(Number(e.target.value)); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value={0}>ทุกช่วงเวลากะ</option>
            <option value={1}>1. เริ่มกะ (Start)</option>
            <option value={2}>2. พักเบรค (Break)</option>
            <option value={3}>3. เลิกกะ (End)</option>
          </select>
          <select
            value={replyStatus}
            onChange={(e) => { setReplyStatus(e.target.value); setPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="ALL">สถานะตอบกลับ: ทั้งหมด</option>
            <option value="PENDING">รอหัวหน้าตอบกลับ</option>
            <option value="REPLIED">ตอบกลับแล้ว</option>
          </select>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหารหัส / ชื่อ / Note..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs"
            />
          </div>
        </div>

        <label className="inline-flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyNegative}
            onChange={(e) => { setOnlyNegative(e.target.checked); setPage(1); }}
            className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
          />
          แสดงเฉพาะรายการคะแนนเชิงลบ (Score 1 - 2) เพื่อส่งต่อกะ / ติดตามเร่งด่วน
        </label>
      </div>

      {/* Grouped Shift Handover Cards */}
      <ShiftGroupLedgerList
        groups={groupedRows}
        loading={loading}
        isPrivacyMode={isPrivacyMode}
        pagination={pagination}
        onPageChange={(nextPage) => setPage(nextPage)}
        onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
        onReplyClick={onOpenReply}
        onHistoryClick={onOpenHistory}
      />
    </div>
  );
}

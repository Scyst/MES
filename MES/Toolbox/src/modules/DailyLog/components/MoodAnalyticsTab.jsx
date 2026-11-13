import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell
} from 'recharts';
import {
  HeartPulse, AlertTriangle, UserX, Download, Lock, Unlock, RefreshCw, Search, ChevronLeft, ChevronRight
} from 'lucide-react';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import ShiftGroupLedgerList from './ShiftGroupLedgerList';
import {
  getProductionDate, getMonthStartStr, formatDateTH, getMoodMeta, maskIdentity,
  groupLogsByUserDay, exportLogsToExcel, exportMissingToExcel, MOOD_META
} from '../utils/dailyLogHelpers';

export default function MoodAnalyticsTab({
  lines = [],
  isPrivacyMode,
  onTogglePrivacyRequest,
  onOpenReply,
  onOpenHistory,
  onOpenNegativeModal,
  onOpenMissingModal,
  reloadSignal = 0
}) {
  const todayStr = getProductionDate();
  const [startDate, setStartDate] = useState(getMonthStartStr(todayStr));
  const [endDate, setEndDate] = useState(todayStr);
  const [line, setLine] = useState('All');

  const [subTab, setSubTab] = useState('issues'); // 'issues' | 'missing'
  const [onlyNegative, setOnlyNegative] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [missingPage, setMissingPage] = useState(1);

  const [overview, setOverview] = useState({ kpi: {}, trend: [], byLine: [], dist: [] });
  const [issueRows, setIssueRows] = useState([]);
  const [issuePag, setIssuePag] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [missingRows, setMissingRows] = useState([]);
  const [missingPag, setMissingPag] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });

  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingTable, setLoadingTable] = useState(true);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
      setMissingPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const loadAnalytics = useCallback(async () => {
    setLoadingStats(true);
    try {
      const res = await dailyLogApi.getOverviewStats({ startDate, endDate, line });
      if (res?.success && res.data) {
        setOverview(res.data);
      }
    } catch (err) {
      console.error('Failed to load mood overview stats:', err);
    } finally {
      setLoadingStats(false);
    }
  }, [startDate, endDate, line]);

  const loadSubTable = useCallback(async () => {
    setLoadingTable(true);
    try {
      if (subTab === 'issues') {
        const res = await dailyLogApi.getIssuesTable({
          startDate,
          endDate,
          line,
          onlyNegative,
          search: debouncedSearch,
          page,
          limit
        });
        if (res?.success && res.data) {
          setIssueRows(res.data.rows || []);
          setIssuePag(res.data.pagination || { page: 1, limit, total: 0, totalPages: 1 });
        }
      } else {
        const res = await dailyLogApi.getMissingTable({
          startDate,
          endDate,
          line,
          search: debouncedSearch,
          page: missingPage,
          limit
        });
        if (res?.success && res.data) {
          setMissingRows(res.data.rows || []);
          setMissingPag(res.data.pagination || { page: 1, limit, total: 0, totalPages: 1 });
        }
      }
    } catch (err) {
      console.error('Failed to load subtable:', err);
    } finally {
      setLoadingTable(false);
    }
  }, [subTab, startDate, endDate, line, onlyNegative, debouncedSearch, page, missingPage, limit]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics, reloadSignal]);

  useEffect(() => {
    loadSubTable();
  }, [loadSubTable, reloadSignal]);

  const groupedIssues = useMemo(() => groupLogsByUserDay(issueRows), [issueRows]);

  const trendChartData = useMemo(() => (overview.trend || []).map((t) => ({
    date: formatDateTH(t.log_date).slice(0, 5),
    avg: Number(t.daily_avg || 0),
    vol: Number(t.daily_vol || 0)
  })), [overview.trend]);

  const lineChartData = useMemo(() => (overview.byLine || []).map((b) => ({
    line: b.line || 'N/A',
    avg: Number(b.line_avg || 0),
    vol: Number(b.line_vol || 0)
  })), [overview.byLine]);

  const distChartData = useMemo(() => [1, 2, 3, 4, 5].map((score) => {
    const found = (overview.dist || []).find((d) => Number(d.mood_score) === score);
    const meta = MOOD_META[score];
    return {
      score,
      name: `${meta.emoji} ${score} (${meta.short})`,
      value: Number(found?.count_val || 0),
      color: meta.color
    };
  }).filter((d) => d.value > 0), [overview.dist]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const exportType = subTab === 'missing' ? 'missing' : 'logs';
      const res = await dailyLogApi.getExportData({
        startDate,
        endDate,
        line,
        onlyNegative,
        exportType
      });
      if (res?.success) {
        if (exportType === 'missing') {
          exportMissingToExcel(res.data || [], `Mood_Missing_Staff_${startDate}_to_${endDate}.xlsx`, isPrivacyMode);
        } else {
          exportLogsToExcel(res.data || [], `Mood_Insight_Report_${startDate}_to_${endDate}.xlsx`, isPrivacyMode);
        }
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const kpi = overview.kpi || {};
  const avgMood = Number(kpi.avg_mood || 0);
  const avgMeta = getMoodMeta(avgMood);
  const totalOp = Number(kpi.total_operators || 0);
  const missingCnt = Number(kpi.missing_count || 0);
  const submitRate = totalOp > 0 ? Math.round(((totalOp - missingCnt) / totalOp) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Filter Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="date"
            value={startDate}
            onChange={(e) => { setStartDate(e.target.value); setPage(1); setMissingPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          />
          <span className="text-xs text-slate-400">ถึง</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => { setEndDate(e.target.value); setPage(1); setMissingPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          />
          <select
            value={line}
            onChange={(e) => { setLine(e.target.value); setPage(1); setMissingPage(1); }}
            className="px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
          >
            <option value="All">ทุกสายผลิต (All Lines)</option>
            {lines.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onTogglePrivacyRequest}
            className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 ${
              isPrivacyMode
                ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                : 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300'
            }`}
          >
            {isPrivacyMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
            {isPrivacyMode ? 'Privacy: Locked' : 'Privacy: Unlocked'}
          </button>

          <button
            type="button"
            onClick={handleExport}
            disabled={exporting}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-60"
          >
            <Download className="w-3.5 h-3.5" />
            Export {subTab === 'missing' ? 'Missing' : 'Report'} (.xlsx)
          </button>

          <button
            type="button"
            onClick={() => { loadAnalytics(); loadSubTable(); }}
            className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            aria-label="รีเฟรชรายงาน"
          >
            <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* 3 Interactive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs flex items-center justify-between">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase">
              <HeartPulse className="w-4 h-4 text-emerald-500" />
              Average Mood Score
            </div>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {avgMood > 0 ? avgMood.toFixed(2) : '-'} <span className="text-sm font-medium text-slate-400">/ 5.0</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">
              จากทั้งหมด {Number(kpi.total_responses || 0).toLocaleString()} คำตอบในช่วงเวลาที่เลือก
            </div>
          </div>
          <span className="text-5xl">{avgMood > 0 ? avgMeta.emoji : '😐'}</span>
        </div>

        <button
          type="button"
          onClick={() => onOpenMissingModal && onOpenMissingModal({ startDate, endDate, line })}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-400 shadow-xs text-left flex items-center justify-between transition-all"
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase">
              <UserX className="w-4 h-4" />
              ยังไม่ส่งข้อมูล (คลิกดูรายชื่อ)
            </div>
            <div className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">
              {missingCnt.toLocaleString()} <span className="text-sm font-medium text-slate-400">/ {totalOp.toLocaleString()} คน</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">อัตราการส่งข้อมูล: {submitRate}%</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center font-black text-sm">
            {submitRate}%
          </div>
        </button>

        <button
          type="button"
          onClick={() => onOpenNegativeModal && onOpenNegativeModal({ startDate, endDate, line })}
          className="p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-rose-400 shadow-xs text-left flex items-center justify-between transition-all"
        >
          <div>
            <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400 uppercase">
              <AlertTriangle className="w-4 h-4" />
              Negative Alert (คะแนน 1-2 · คลิกดู)
            </div>
            <div className="text-3xl font-black text-rose-600 dark:text-rose-400 mt-1">
              {Number(kpi.negative_count || 0).toLocaleString()} <span className="text-sm font-medium text-slate-400">ครั้ง</span>
            </div>
            <div className="text-xs text-slate-500 mt-1">คลิกเพื่อดูและตอบกลับด่วนทันที</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </button>
      </div>

      {/* 3 Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">
            แนวโน้มความรู้สึกและจำนวนผู้บันทึก (Mood Trend)
          </h3>
          <div className="h-64">
            {trendChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">ไม่มีข้อมูลกราฟ</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={trendChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="left" domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar yAxisId="right" dataKey="vol" name="จำนวนผู้บันทึก" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                  <Line yAxisId="left" type="monotone" dataKey="avg" name="คะแนนเฉลี่ย" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">
            คะแนนความรู้สึกเฉลี่ยตามสายผลิต (By Line)
          </h3>
          <div className="h-64">
            {lineChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">ไม่มีข้อมูลกราฟ</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={lineChartData}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="line" tick={{ fontSize: 10 }} />
                  <YAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="avg" name="คะแนนเฉลี่ย" radius={[6, 6, 0, 0]}>
                    {lineChartData.map((entry, idx) => (
                      <Cell
                        key={idx}
                        fill={entry.avg >= 3.8 ? '#10b981' : entry.avg >= 3.0 ? '#f59e0b' : '#ef4444'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-3">
            สัดส่วนระดับความรู้สึก (Distribution)
          </h3>
          <div className="h-64">
            {distChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">ไม่มีข้อมูลกราฟ</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={distChartData} dataKey="value" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={3}>
                    {distChartData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Data Tabs */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { setSubTab('issues'); setPage(1); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                subTab === 'issues'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              Issues & Shift Notes ({Number(issuePag.total || 0).toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => { setSubTab('missing'); setMissingPage(1); }}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                subTab === 'missing'
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
              }`}
            >
              ยังไม่ลงบันทึก ({missingCnt.toLocaleString()})
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {subTab === 'issues' && (
              <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 mr-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyNegative}
                  onChange={(e) => { setOnlyNegative(e.target.checked); setPage(1); }}
                  className="rounded border-slate-300 text-rose-600"
                />
                เฉพาะ Score 1-2
              </label>
            )}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="ค้นหารหัส / ชื่อ / หมายเหตุ..."
                className="pl-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs w-56"
              />
            </div>
          </div>
        </div>

        {subTab === 'issues' ? (
          <ShiftGroupLedgerList
            groups={groupedIssues}
            loading={loadingTable}
            isPrivacyMode={isPrivacyMode}
            pagination={issuePag}
            onPageChange={(nextPage) => setPage(nextPage)}
            onLimitChange={(nextLimit) => { setLimit(nextLimit); setPage(1); }}
            onReplyClick={onOpenReply}
            onHistoryClick={onOpenHistory}
          />
        ) : (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500">
                    <th className="py-2.5 px-3">สายผลิต</th>
                    <th className="py-2.5 px-3">รหัสพนักงาน</th>
                    <th className="py-2.5 px-3">ชื่อ-สกุล</th>
                    <th className="py-2.5 px-3 text-right">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {loadingTable ? (
                    <tr><td colSpan={4} className="py-10 text-center text-slate-400 text-xs">กำลังโหลด...</td></tr>
                  ) : missingRows.length === 0 ? (
                    <tr><td colSpan={4} className="py-10 text-center text-emerald-600 text-xs font-semibold">ไม่พบผู้ค้างบันทึกในช่วงเวลาที่เลือก</td></tr>
                  ) : (
                    missingRows.map((u) => {
                      const idInfo = maskIdentity(u.fullname, u.emp_id, u.username, isPrivacyMode);
                      return (
                        <tr key={u.user_id || u.username} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                          <td className="py-2.5 px-3 font-semibold text-xs">{u.line || 'N/A'}</td>
                          <td className="py-2.5 px-3 font-mono text-xs text-slate-500">{idInfo.displayId}</td>
                          <td className="py-2.5 px-3 font-medium">{idInfo.displayName}</td>
                          <td className="py-2.5 px-3 text-right">
                            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 text-xs font-bold">
                              ยังไม่พบข้อมูล
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
              <span>ทั้งหมด {Number(missingPag.total || 0).toLocaleString()} คน</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={missingPag.page <= 1}
                  onClick={() => setMissingPage(missingPag.page - 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 flex items-center gap-1"
                >
                  <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
                </button>
                <span className="font-mono font-bold">
                  {missingPag.page} / {missingPag.totalPages || 1}
                </span>
                <button
                  type="button"
                  disabled={missingPag.page >= (missingPag.totalPages || 1)}
                  onClick={() => setMissingPage(missingPag.page + 1)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 flex items-center gap-1"
                >
                  ถัดไป <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

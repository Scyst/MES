import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, UserCheck, Clock, UserX, CalendarOff, Coins,
  BarChart3, Download, Sparkles, CalendarDays, ArrowRightLeft, RefreshCw, X
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { manpowerOpsApi } from '../../../shared/services/manpowerApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { formatMoney, formatNumber, offsetIsoDate, exportRowsToExcel } from '../utils/manpowerHelpers';

const VIEW_MODES = [
  { id: 'LINE', label: 'รายสายผลิต (By Line)' },
  { id: 'SHIFT', label: 'แยกกะ (Line × Shift)' },
  { id: 'TYPE', label: 'แยกกลุ่มจ้าง (Wage Type)' },
  { id: 'PAYMENT_LINE', label: 'การจ่ายเงิน × สายผลิต' },
  { id: 'PAYMENT', label: 'แยกตามประเภทการจ่าย (Rate Type)' },
];

const PIE_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

function groupSummaryRows(rows, viewMode) {
  const map = new Map();
  for (const r of rows) {
    let key = '';
    let label = '';
    let subLabel = '';
    if (viewMode === 'LINE') {
      key = r.display_section || 'OTHER';
      label = key;
      subLabel = r.hc_group || 'MAIN';
    } else if (viewMode === 'SHIFT') {
      key = `${r.display_section || 'OTHER'}__${r.shift_name || 'Day'}`;
      label = r.display_section || 'OTHER';
      subLabel = `${r.shift_name || 'Day'} (${r.hc_group || 'MAIN'})`;
    } else if (viewMode === 'TYPE') {
      key = r.category_name || 'Other';
      label = key;
      subLabel = r.rate_type || 'DAILY';
    } else if (viewMode === 'PAYMENT_LINE') {
      key = `${r.rate_type || 'DAILY'}__${r.display_section || 'OTHER'}`;
      label = r.display_section || 'OTHER';
      subLabel = r.rate_type || 'DAILY';
    } else {
      key = r.rate_type || 'DAILY';
      label = key === 'MONTHLY' ? 'พนักงานรายเดือน (MONTHLY)' : 'พนักงานรายวัน / เหมา (DAILY)';
      subLabel = r.rate_type || 'DAILY';
    }

    if (!map.has(key)) {
      map.set(key, {
        key,
        label,
        subLabel,
        line: r.display_section || '',
        registered: 0,
        actual: 0,
        present: 0,
        late: 0,
        absent: 0,
        leave: 0,
        otHours: 0,
        otCount: 0,
        dlCost: 0,
        otCost: 0,
        totalCost: 0,
      });
    }
    const g = map.get(key);
    g.registered += Number(r.Total_Registered || 0);
    g.actual += Number(r.Count_Actual || 0);
    g.present += Number(r.Count_Present || 0);
    g.late += Number(r.Count_Late || 0);
    g.absent += Number(r.Count_Absent || 0);
    g.leave += Number(r.Count_Leave || 0);
    g.otHours += Number(r.Total_OT_Hours || 0);
    g.otCount += Number(r.Count_OT || 0);
    g.dlCost += Number(r.Normal_Cost || 0);
    g.otCost += Number(r.OT_Cost || 0);
    g.totalCost += Number(r.Total_Cost ?? (Number(r.Normal_Cost || 0) + Number(r.OT_Cost || 0)));
  }
  return Array.from(map.values());
}

export default function ManpowerOverviewTab({ date, hcGroup, refreshSignal, onDrillLine }) {
  const { showToast } = useToast();
  const [viewMode, setViewMode] = useState('LINE');
  const [useNewFormula, setUseNewFormula] = useState(true);
  const [loading, setLoading] = useState(false);
  const [summaryRows, setSummaryRows] = useState([]);
  const [kpis, setKpis] = useState({
    total_registered: 0,
    actual_present: 0,
    count_present: 0,
    count_late: 0,
    count_absent: 0,
    count_leave: 0,
    total_ot_hours: 0,
    count_ot: 0,
    dl_cost: 0,
    ot_cost: 0,
    total_cost: 0,
  });
  const [dayInfo, setDayInfo] = useState(null);
  const [trendRows, setTrendRows] = useState([]);

  // Integrated Analysis Modal state
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSubTab, setAnalysisSubTab] = useState('operations');
  const [analysisRange, setAnalysisRange] = useState(() => ({
    startDate: offsetIsoDate(date, -13),
    endDate: date,
  }));
  const [analysisData, setAnalysisData] = useState(null);
  const [costCompareRows, setCostCompareRows] = useState([]);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const start7 = offsetIsoDate(date, -6);
      const [sumRes, trRes] = await Promise.all([
        manpowerOpsApi.readSummary({
          date,
          hcGroup,
          use_new_formula: useNewFormula ? '1' : '0',
        }),
        manpowerOpsApi.readTrend({
          startDate: start7,
          endDate: date,
          hcGroup,
        }),
      ]);
      const d = sumRes?.data || {};
      setSummaryRows(Array.isArray(d.rows) ? d.rows : []);
      if (d.kpis) setKpis(d.kpis);
      setDayInfo(d.day_info || null);
      setTrendRows(Array.isArray(trRes?.data) ? trRes.data : []);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดข้อมูลสรุปกำลังคนได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [date, hcGroup, useNewFormula, showToast]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview, refreshSignal]);

  const groupedRows = useMemo(() => groupSummaryRows(summaryRows, viewMode), [summaryRows, viewMode]);

  const pieData = useMemo(() => {
    const p = Number(kpis.count_present || 0);
    const l = Number(kpis.count_late || 0);
    const a = Number(kpis.count_absent || 0);
    const lv = Number(kpis.count_leave || 0);
    return [
      { name: 'มาตรงเวลา', value: p },
      { name: 'มาสาย', value: l },
      { name: 'ขาดงาน', value: a },
      { name: 'ลางาน', value: lv },
    ].filter((x) => x.value > 0);
  }, [kpis]);

  const handleLoadAnalysis = async (customRange) => {
    const r = customRange || analysisRange;
    setAnalysisLoading(true);
    try {
      const [intRes, cmpRes] = await Promise.all([
        manpowerOpsApi.integratedAnalysis({
          startDate: r.startDate,
          endDate: r.endDate,
          line: 'ALL',
          hcGroup,
        }),
        manpowerOpsApi.compareCost({
          startDate: r.startDate,
          endDate: r.endDate,
        }),
      ]);
      setAnalysisData(intRes?.data || null);
      setCostCompareRows(Array.isArray(cmpRes?.data) ? cmpRes.data : []);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดการวิเคราะห์แบบบูรณาการได้', 'error');
    } finally {
      setAnalysisLoading(false);
    }
  };

  const openAnalysisModal = () => {
    const r = { startDate: offsetIsoDate(date, -13), endDate: date };
    setAnalysisRange(r);
    setAnalysisOpen(true);
    handleLoadAnalysis(r);
  };

  const handleExportExcel = () => {
    if (!groupedRows.length) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก Excel', 'warning');
      return;
    }
    const exportData = groupedRows.map((g) => ({
      'Section / Group': g.label,
      'Sub-Category': g.subLabel,
      'Plan (HC)': g.registered,
      'Actual (Present+Late)': g.actual,
      Present: g.present,
      Late: g.late,
      Absent: g.absent,
      Leave: g.leave,
      'OT Hours': Number(g.otHours.toFixed(1)),
      'DL Cost (THB)': Number(g.dlCost.toFixed(2)),
      'OT Cost (THB)': Number(g.otCost.toFixed(2)),
      'Total Est Cost (THB)': Number(g.totalCost.toFixed(2)),
    }));
    exportRowsToExcel(exportData, `Manpower_${viewMode}`, `Manpower_Summary_${date}_${viewMode}.xlsx`);
    showToast('ส่งออกไฟล์ Excel สำเร็จ', 'success');
  };

  const attendancePct = kpis.total_registered > 0
    ? ((kpis.actual_present / kpis.total_registered) * 100).toFixed(1)
    : '0.0';

  const compareTotals = useMemo(() => {
    return costCompareRows.reduce((acc, row) => {
      acc.old += Number(row.old_total || 0);
      acc.newTotal += Number(row.new_total || 0);
      acc.diff += Number(row.diff_amount || 0);
      return acc;
    }, { old: 0, newTotal: 0, diff: 0 });
  }, [costCompareRows]);

  return (
    <div className="space-y-5">
      {/* Calendar Special Day Alert Banner */}
      {dayInfo && dayInfo.day_type && dayInfo.day_type !== 'NORMAL' && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold">[{dayInfo.day_type}] {dayInfo.description || 'วันหยุดพิเศษ / วันอาทิตย์'}</span>
              <span className="ml-2 text-xs opacity-85">
                ตัวคูณค่าแรงปกติ ×{Number(dayInfo.work_rate_holiday || 1).toFixed(1)} | ตัวคูณ OT ×{Number(dayInfo.ot_rate_holiday || 1.5).toFixed(1)}
              </span>
            </div>
          </div>
          <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold dark:bg-amber-900/60">
            Active Multiplier
          </span>
        </div>
      )}

      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            มุมมองตาราง:
          </label>
          <select
            value={viewMode}
            onChange={(e) => setViewMode(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-800 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
          >
            {VIEW_MODES.map((m) => (
              <option key={m.id} value={m.id}>{m.label}</option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setUseNewFormula((v) => !v)}
            className={`min-h-[44px] inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
              useNewFormula
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
            }`}
            title="สลับสูตรคำนวณต้นทุนค่าแรง V1 (มาตรฐาน) และ V2 (ปรับปรุงใหม่ + แรงจูงใจ)"
          >
            <ArrowRightLeft className="h-4 w-4" />
            สูตรต้นทุน: {useNewFormula ? 'V2 (Improved)' : 'V1 (Legacy)'}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAnalysisModal}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95"
          >
            <Sparkles className="h-4 w-4" />
            วิเคราะห์ขั้นสูง & เปรียบเทียบ V1/V2
          </button>
          <button
            type="button"
            onClick={handleExportExcel}
            className="min-h-[44px] inline-flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <Download className="h-4 w-4" />
            Export Excel
          </button>
        </div>
      </div>

      {/* 6 KPI Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>กำลังพลรวม (PLAN)</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-800 dark:text-white">{formatNumber(kpis.total_registered)}</div>
          <div className="mt-1 text-[11px] text-slate-500">กลุ่ม: {hcGroup}</div>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs dark:border-emerald-800/60 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>มาทำงาน (ACTUAL)</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(kpis.actual_present)}</div>
          <div className="mt-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Attendance: {attendancePct}%</div>
        </div>

        <div className="rounded-xl border border-amber-200 bg-white p-4 shadow-2xs dark:border-amber-800/60 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span>มาสาย (LATE)</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-600 dark:text-amber-400">{formatNumber(kpis.count_late)}</div>
          <div className="mt-1 text-[11px] text-slate-500">ตรงเวลา: {formatNumber(kpis.count_present)} คน</div>
        </div>

        <div className="rounded-xl border border-rose-200 bg-white p-4 shadow-2xs dark:border-rose-800/60 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
            <span>ขาดงาน (ABSENT)</span>
            <UserX className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatNumber(kpis.count_absent)}</div>
          <div className="mt-1 text-[11px] text-slate-500">ต้องติดตามตรวจสอบ</div>
        </div>

        <div className="rounded-xl border border-sky-200 bg-white p-4 shadow-2xs dark:border-sky-800/60 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-sky-600 dark:text-sky-400">
            <span>ลางาน (LEAVE)</span>
            <CalendarOff className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-2 text-2xl font-bold text-sky-600 dark:text-sky-400">{formatNumber(kpis.count_leave)}</div>
          <div className="mt-1 text-[11px] text-slate-500">ป่วย / กิจ / พักร้อน</div>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-2xs dark:border-indigo-800/60 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>ประมาณการค่าแรง</span>
            <Coins className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-xl font-bold text-indigo-700 dark:text-indigo-300">฿{formatMoney(kpis.total_cost)}</div>
          <div className="mt-1 text-[11px] text-slate-500">
            OT {formatNumber(kpis.total_ot_hours, 1)} ชม. ({kpis.count_ot} คน)
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
              <BarChart3 className="h-4 w-4 text-indigo-500" />
              แนวโน้มกำลังคน 7 วันย้อนหลัง (Daily Attendance Trend)
            </h3>
            <span className="text-xs text-slate-500">{offsetIsoDate(date, -6)} ถึง {date}</span>
          </div>
          <div className="h-64 w-full min-w-0">
            {trendRows.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูลแนวโน้มในช่วงวันที่เลือก</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <ComposedChart data={trendRows} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="log_date" tickFormatter={(v) => String(v).slice(5)} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                  <Bar dataKey="actual_present" name="มาทำงาน" stackId="a" fill="#10b981" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="count_absent" name="ขาดงาน" stackId="a" fill="#ef4444" />
                  <Bar dataKey="count_leave" name="ลางาน" stackId="a" fill="#06b6d4" />
                  <Line type="monotone" dataKey="plan_hc" name="กำลังพลแผน (Plan)" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <h3 className="mb-3 text-sm font-bold text-slate-800 dark:text-white">สัดส่วนสถานะการมาทำงานวันนี้</h3>
          <div className="h-64 w-full min-w-0">
            {pieData.length === 0 ? (
              <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูลสถานะ</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={78} paddingAngle={3}>
                    {pieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Summary Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              ตารางสรุปกำลังคนและต้นทุนค่าแรง ({VIEW_MODES.find((m) => m.id === viewMode)?.label})
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              คลิกที่ชื่อสายผลิตเพื่อดูรายชื่อพนักงานลงเวลาในวันดังกล่าว (DL ฿{formatMoney(kpis.dl_cost)} + OT ฿{formatMoney(kpis.ot_cost)})
            </p>
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">หมวด / สายการผลิต</th>
                <th className="px-3 py-3">กลุ่ม / รายละเอียด</th>
                <th className="px-3 py-3 text-right">Plan</th>
                <th className="px-3 py-3 text-right">Actual</th>
                <th className="px-3 py-3 text-right">สาย</th>
                <th className="px-3 py-3 text-right">ขาด</th>
                <th className="px-3 py-3 text-right">ลา</th>
                <th className="px-3 py-3 text-right">OT (ชม.)</th>
                <th className="px-3 py-3 text-right">ค่าแรงปกติ (฿)</th>
                <th className="px-3 py-3 text-right">ค่า OT (฿)</th>
                <th className="px-4 py-3 text-right">รวมสุทธิ (฿)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
              {groupedRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                    ไม่พบข้อมูลสรุปกำลังคนสำหรับวันที่ {date}
                  </td>
                </tr>
              ) : (
                groupedRows.map((g) => (
                  <tr key={g.key} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                    <td className="px-4 py-2.5 font-semibold text-slate-800 dark:text-slate-100">
                      {g.line && onDrillLine ? (
                        <button
                          type="button"
                          onClick={() => onDrillLine(g.line)}
                          className="text-left text-indigo-600 hover:underline dark:text-indigo-400"
                        >
                          {g.label}
                        </button>
                      ) : (
                        g.label
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-500 dark:text-slate-400">{g.subLabel}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatNumber(g.registered)}</td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(g.actual)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-amber-600">{formatNumber(g.late)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-rose-600">{formatNumber(g.absent)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-sky-600">{formatNumber(g.leave)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatNumber(g.otHours, 1)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatMoney(g.dlCost)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{formatMoney(g.otCost)}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800 dark:text-white">{formatMoney(g.totalCost)}</td>
                  </tr>
                ))
              )}
            </tbody>
            {groupedRows.length > 0 && (
              <tfoot className="bg-slate-100 font-bold text-slate-800 dark:bg-slate-900 dark:text-white">
                <tr>
                  <td colSpan={2} className="px-4 py-3">รวมทั้งหมด ({groupedRows.length} กลุ่ม)</td>
                  <td className="px-3 py-3 text-right font-mono">{formatNumber(kpis.total_registered)}</td>
                  <td className="px-3 py-3 text-right font-mono text-emerald-600 dark:text-emerald-400">{formatNumber(kpis.actual_present)}</td>
                  <td className="px-3 py-3 text-right font-mono text-amber-600">{formatNumber(kpis.count_late)}</td>
                  <td className="px-3 py-3 text-right font-mono text-rose-600">{formatNumber(kpis.count_absent)}</td>
                  <td className="px-3 py-3 text-right font-mono text-sky-600">{formatNumber(kpis.count_leave)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatNumber(kpis.total_ot_hours, 1)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatMoney(kpis.dl_cost)}</td>
                  <td className="px-3 py-3 text-right font-mono">{formatMoney(kpis.ot_cost)}</td>
                  <td className="px-4 py-3 text-right font-mono text-indigo-700 dark:text-indigo-300">฿{formatMoney(kpis.total_cost)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Integrated Analysis Modal */}
      {analysisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Integrated Manpower Analytics & Cost Formula Impact (V1 vs V2)
                </h3>
                <p className="text-xs text-slate-500">วิเคราะห์แนวโน้มเชิงลึก อัตราการคงอยู่ การใช้แรงงาน และผลต่างสูตรคำนวณค่าแรง</p>
              </div>
              <button
                type="button"
                onClick={() => setAnalysisOpen(false)}
                className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/60">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={analysisRange.startDate}
                  onChange={(e) => setAnalysisRange((r) => ({ ...r, startDate: e.target.value }))}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500">ถึง</span>
                <input
                  type="date"
                  value={analysisRange.endDate}
                  onChange={(e) => setAnalysisRange((r) => ({ ...r, endDate: e.target.value }))}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleLoadAnalysis()}
                  disabled={analysisLoading}
                  className="min-h-[40px] rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {analysisLoading ? 'กำลังวิเคราะห์...' : 'ประมวลผล'}
                </button>
              </div>

              <div className="flex gap-1 rounded-lg bg-slate-200/70 p-1 dark:bg-slate-900">
                {[
                  { id: 'operations', label: 'Operations & Trend' },
                  { id: 'financials', label: 'V1 vs V2 Cost Impact' },
                  { id: 'distribution', label: 'Workforce Distribution' },
                ].map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAnalysisSubTab(t.id)}
                    className={`rounded-md px-3 py-1.5 text-xs font-semibold transition ${
                      analysisSubTab === t.id
                        ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-700 dark:text-white'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {analysisData?.summary && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-6">
                  <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                    <div className="text-[11px] text-slate-500">Unique Staff</div>
                    <div className="text-lg font-bold text-slate-800 dark:text-white">{formatNumber(analysisData.summary.Total_Unique_HC)}</div>
                  </div>
                  <div className="rounded-xl border border-emerald-200 p-3 dark:border-emerald-800">
                    <div className="text-[11px] text-emerald-600">Present Man-Days</div>
                    <div className="text-lg font-bold text-emerald-600">{formatNumber(analysisData.summary.Total_Present_ManDays)}</div>
                  </div>
                  <div className="rounded-xl border border-rose-200 p-3 dark:border-rose-800">
                    <div className="text-[11px] text-rose-600">Absent Man-Days</div>
                    <div className="text-lg font-bold text-rose-600">{formatNumber(analysisData.summary.Total_Absent_ManDays)}</div>
                  </div>
                  <div className="rounded-xl border border-sky-200 p-3 dark:border-sky-800">
                    <div className="text-[11px] text-sky-600">Leave Man-Days</div>
                    <div className="text-lg font-bold text-sky-600">{formatNumber(analysisData.summary.Total_Leave_ManDays)}</div>
                  </div>
                  <div className="rounded-xl border border-indigo-200 p-3 dark:border-indigo-800">
                    <div className="text-[11px] text-indigo-600">New Joiners</div>
                    <div className="text-lg font-bold text-indigo-600">+{formatNumber(analysisData.summary.New_Joiners)}</div>
                  </div>
                  <div className="rounded-xl border border-amber-200 p-3 dark:border-amber-800">
                    <div className="text-[11px] text-amber-600">Resigned</div>
                    <div className="text-lg font-bold text-amber-600">{formatNumber(analysisData.summary.Resigned)}</div>
                  </div>
                </div>
              )}

              {analysisSubTab === 'operations' && (
                <div className="h-72 w-full min-w-0 rounded-xl border border-slate-200 p-4 dark:border-slate-700">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                    <ComposedChart data={analysisData?.trend || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="log_date" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="Act_Present" name="Present" fill="#10b981" />
                      <Bar dataKey="Act_Absent" name="Absent" fill="#ef4444" />
                      <Bar dataKey="Act_Leave" name="Leave" fill="#06b6d4" />
                      <Line type="monotone" dataKey="Daily_HC" name="Total HC" stroke="#6366f1" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}

              {analysisSubTab === 'financials' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                    <div className="rounded-xl bg-slate-100 p-3.5 dark:bg-slate-800">
                      <div className="text-xs text-slate-500">ต้นทุนรวมสูตรเดิม (V1)</div>
                      <div className="text-xl font-bold text-slate-800 dark:text-white">฿{formatMoney(compareTotals.old)}</div>
                    </div>
                    <div className="rounded-xl bg-indigo-50 p-3.5 dark:bg-indigo-950/40">
                      <div className="text-xs text-indigo-600 dark:text-indigo-300">ต้นทุนรวมสูตรใหม่ (V2)</div>
                      <div className="text-xl font-bold text-indigo-700 dark:text-indigo-200">฿{formatMoney(compareTotals.newTotal)}</div>
                    </div>
                    <div className="rounded-xl bg-amber-50 p-3.5 dark:bg-amber-950/40">
                      <div className="text-xs text-amber-700 dark:text-amber-300">ผลต่างรวม (New - Old)</div>
                      <div className="text-xl font-bold text-amber-700 dark:text-amber-200">
                        {compareTotals.diff >= 0 ? '+' : ''}฿{formatMoney(compareTotals.diff)}
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                        <tr>
                          <th className="px-3 py-2.5">สายการผลิต</th>
                          <th className="px-3 py-2.5 text-right">V1 Total (฿)</th>
                          <th className="px-3 py-2.5 text-right">V2 Total (฿)</th>
                          <th className="px-3 py-2.5 text-right">ส่วนต่าง (฿)</th>
                          <th className="px-3 py-2.5 text-right">วันคำนวณ</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {costCompareRows.map((c, idx) => (
                          <tr key={idx}>
                            <td className="px-3 py-2 font-semibold">{c.line_name}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatMoney(c.old_total)}</td>
                            <td className="px-3 py-2 text-right font-mono">{formatMoney(c.new_total)}</td>
                            <td className={`px-3 py-2 text-right font-mono font-bold ${Number(c.diff_amount) >= 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                              {Number(c.diff_amount) >= 0 ? '+' : ''}{formatMoney(c.diff_amount)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono">{c.days_calculated}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {analysisSubTab === 'distribution' && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2.5">กลุ่มประเภทพนักงาน</th>
                        <th className="px-4 py-2.5 text-right">จำนวนคน (Headcount)</th>
                        <th className="px-4 py-2.5 text-right">วันทำงานรวม (Work Days)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {(analysisData?.distribution || []).map((d, idx) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 font-semibold">{d.category}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatNumber(d.head_count)}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatNumber(d.work_days)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

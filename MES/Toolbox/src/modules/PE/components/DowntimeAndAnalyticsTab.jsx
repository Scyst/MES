import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Ban, Activity, Plus, Search, FileSpreadsheet, RefreshCw,
  Edit3, Trash2, CheckCircle2, Clock, Wrench, Printer,
  AlertTriangle, Users, X, Coins, Gauge, TrendingUp
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';
import { peApi } from '../../../shared/services/peApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import {
  DOWNTIME_CATEGORIES, getLocalIsoDate, formatPeDate,
  formatPeDateTime, formatBaht, formatNumber
} from '../utils/peFormatters';

const CAUSE_COLORS = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#8b5cf6', '#10b981', '#64748b'];
const WO_PIE_COLORS = {
  Open: '#ef4444',
  Pending: '#f59e0b',
  Assigned: '#0ea5e9',
  'In Progress': '#6366f1',
  Completed: '#10b981',
  Cancelled: '#94a3b8',
};

const EMPTY_DT_FORM = {
  downtime_id: '',
  machine_id: '',
  machine_name: '',
  line: '',
  log_date: getLocalIsoDate(),
  start_time: '08:00',
  end_date: '',
  end_time: '',
  cause_category: 'Mechanical',
  cause_detail: '',
  recovered_by: '',
  notes: '',
  create_wo: false,
};

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export default function DowntimeAndAnalyticsTab({ isOffline = false }) {
  const showToast = useToast();
  const confirm = useConfirm();

  const [subTab, setSubTab] = useState('tracker');

  // --- Shared machines list ---
  const [machines, setMachines] = useState([]);

  // --- Tracker state ---
  const [dtRows, setDtRows] = useState([]);
  const [dtKpi, setDtKpi] = useState({ total_downtime: 0, total_events: 0, avg_duration: 0 });
  const [topCause, setTopCause] = useState('-');
  const [lineSummary, setLineSummary] = useState([]);
  const [lines, setLines] = useState([]);
  const [dtTotal, setDtTotal] = useState(0);
  const [dtLoading, setDtLoading] = useState(false);

  const [dtFilter, setDtFilter] = useState({
    startDate: getLocalIsoDate(-30),
    endDate: getLocalIsoDate(),
    line: '',
    cause_category: '',
    search: '',
  });
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [savingDt, setSavingDt] = useState(false);
  const [dtForm, setDtForm] = useState(EMPTY_DT_FORM);

  // --- Analytics state ---
  const [anFilter, setAnFilter] = useState({
    startDate: `${getLocalIsoDate().slice(0, 7)}-01`,
    endDate: getLocalIsoDate(),
    line: '',
    causeCategory: '',
  });
  const [analytics, setAnalytics] = useState(null);
  const [anLoading, setAnLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(dtFilter.search), 300);
    return () => clearTimeout(timer);
  }, [dtFilter.search]);

  useEffect(() => {
    let mounted = true;
    peApi.getMachines({ limit: 300 })
      .then((res) => {
        if (mounted && res?.success && Array.isArray(res.data)) {
          setMachines(res.data);
        }
      })
      .catch(() => {});
    return () => { mounted = false; };
  }, []);

  const loadDowntime = useCallback(async () => {
    setDtLoading(true);
    try {
      const res = await peApi.getDowntimeLogs({
        startDate: dtFilter.startDate,
        endDate: dtFilter.endDate,
        line: dtFilter.line,
        cause_category: dtFilter.cause_category,
        search: debouncedSearch,
        limit: 150,
      });
      if (res?.success) {
        setDtRows(Array.isArray(res.data) ? res.data : []);
        setDtTotal(Number(res.total || 0));
        setDtKpi(res.kpi || { total_downtime: 0, total_events: 0, avg_duration: 0 });
        setTopCause(res.top_cause || '-');
        setLineSummary(Array.isArray(res.line_summary) ? res.line_summary : []);
        if (Array.isArray(res.lines)) setLines(res.lines);
      }
    } catch {
      // handled by apiClient toast
    } finally {
      setDtLoading(false);
    }
  }, [dtFilter.startDate, dtFilter.endDate, dtFilter.line, dtFilter.cause_category, debouncedSearch]);

  const loadAnalytics = useCallback(async () => {
    setAnLoading(true);
    try {
      const res = await peApi.getAnalyticsBundle(anFilter);
      if (res?.success && res.data) {
        setAnalytics(res.data);
        if (Array.isArray(res.data.lines) && lines.length === 0) {
          setLines(res.data.lines);
        }
      }
    } catch {
      // handled by apiClient toast
    } finally {
      setAnLoading(false);
    }
  }, [anFilter, lines.length]);

  useEffect(() => {
    if (subTab === 'tracker') {
      loadDowntime();
    } else {
      loadAnalytics();
    }
  }, [subTab, loadDowntime, loadAnalytics]);

  const openAddModal = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    setDtForm({
      ...EMPTY_DT_FORM,
      log_date: getLocalIsoDate(),
      start_time: `${hh}:${mm}`,
    });
    setModalOpen(true);
  };

  const openEditModal = (row) => {
    const startStr = String(row.start_time || '');
    const endStr = String(row.end_time || '');
    const startHm = startStr.length >= 16 ? startStr.slice(11, 16) : '08:00';
    const endHm = endStr.length >= 16 ? endStr.slice(11, 16) : '';
    const endDt = endStr.length >= 10 ? endStr.slice(0, 10) : '';
    setDtForm({
      downtime_id: row.downtime_id,
      machine_id: row.machine_id ? String(row.machine_id) : '',
      machine_name: row.machine_name || '',
      line: row.line || '',
      log_date: String(row.log_date || '').slice(0, 10) || getLocalIsoDate(),
      start_time: startHm,
      end_date: endDt,
      end_time: endHm,
      cause_category: row.cause_category || 'Mechanical',
      cause_detail: row.cause_detail || '',
      recovered_by: row.recovered_by || '',
      notes: row.notes || '',
      create_wo: false,
    });
    setModalOpen(true);
  };

  const handleMachineSelect = (machineId) => {
    const found = machines.find((m) => String(m.machine_id) === String(machineId));
    setDtForm((prev) => ({
      ...prev,
      machine_id: machineId,
      machine_name: found ? found.machine_name : prev.machine_name,
      line: found ? (found.line || prev.line) : prev.line,
    }));
  };

  const handleSaveDowntime = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    if (!dtForm.cause_category || !dtForm.cause_detail.trim()) {
      showToast('กรุณาระบุหมวดหมู่สาเหตุและรายละเอียดการหยุดเครื่อง', 'warning');
      return;
    }
    setSavingDt(true);
    try {
      const payload = { ...dtForm };
      const res = dtForm.downtime_id
        ? await peApi.updateDowntimeLog(payload)
        : await peApi.addDowntimeLog(payload);
      if (res?.success) {
        showToast(res.message || 'บันทึกข้อมูลสำเร็จ', 'success');
        setModalOpen(false);
        loadDowntime();
      }
    } catch {
      // handled
    } finally {
      setSavingDt(false);
    }
  };

  const handleEndDowntime = async (row) => {
    if (isOffline) return;
    const ok = await confirm({
      title: 'ยืนยันการเดินเครื่องกลับสู่ภาวะปกติ',
      message: `บันทึกเวลาสิ้นสุดการหยุดเครื่อง "${row.machine_name || row.line || `#${row.downtime_id}`}" ณ เวลานี้ใช่หรือไม่?`,
      confirmText: 'ยืนยันปิดเวลาหยุด',
      cancelText: 'ยกเลิก',
    });
    if (!ok) return;
    try {
      const res = await peApi.endDowntimeLog({ downtime_id: row.downtime_id });
      if (res?.success) {
        showToast(res.message || 'บันทึกสิ้นสุด Downtime สำเร็จ', 'success');
        loadDowntime();
      }
    } catch {
      // handled
    }
  };

  const handleDeleteDowntime = async (row) => {
    if (isOffline) return;
    const ok = await confirm({
      title: 'ยืนยันการลบประวัติ Downtime',
      message: `ต้องการลบรายการหยุดเครื่อง #${row.downtime_id} (${row.machine_name || row.line || '-'}) ออกจากระบบหรือไม่?`,
      confirmText: 'ลบรายการ',
      cancelText: 'ยกเลิก',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await peApi.deleteDowntimeLog(row.downtime_id);
      if (res?.success) {
        showToast(res.message || 'ลบรายการสำเร็จ', 'success');
        loadDowntime();
      }
    } catch {
      // handled
    }
  };

  const handleExportDowntimeExcel = () => {
    const sheetData = dtRows.map((r) => ({
      ID: r.downtime_id,
      Date: formatPeDate(r.log_date),
      Line: r.line || '',
      'Machine Code': r.machine_code || '',
      Machine: r.machine_name || '',
      'Start Time': formatPeDateTime(r.start_time),
      'End Time': r.end_time ? formatPeDateTime(r.end_time) : 'กำลังหยุด',
      'Duration (min)': Number(r.duration_min || 0),
      Category: r.cause_category || '',
      Detail: r.cause_detail || '',
      'Work Order': r.wo_number || '',
      'Recovered By': r.recovered_by || '',
      Notes: r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(sheetData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'PE_Downtime_Log');
    XLSX.writeFile(wb, `PE_Downtime_${getLocalIsoDate()}.xlsx`);
  };

  const handlePrintReliabilityReport = () => {
    if (!analytics?.kpi) return;
    const kpi = analytics.kpi;
    const win = window.open('', '_blank', 'width=960,height=740');
    if (!win) return;
    const topRows = (analytics.top_machines || [])
      .map((m, i) => `
        <tr>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:center;">${i + 1}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;">${escapeHtml(m.machine_name)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;">${escapeHtml(m.line || '-')}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">${escapeHtml(m.event_count)}</td>
          <td style="border:1px solid #cbd5e1;padding:6px;text-align:right;">${escapeHtml(formatNumber(m.total_min, 0))} น.</td>
        </tr>`)
      .join('');
    win.document.write(`
      <!doctype html>
      <html lang="th">
      <head>
        <meta charset="utf-8" />
        <title>PE Reliability Report (${escapeHtml(anFilter.startDate)} - ${escapeHtml(anFilter.endDate)})</title>
        <style>
          body { font-family: 'Sarabun', 'Segoe UI', sans-serif; margin: 24px; color: #0f172a; }
          .grid { display:grid; grid-template-columns:repeat(4,1fr); gap:10px; margin:16px 0; }
          .card { border:1px solid #cbd5e1; border-radius:8px; padding:10px; }
          .label { font-size:11px; color:#64748b; font-weight:bold; }
          .val { font-size:20px; font-weight:bold; margin-top:4px; }
          table { width:100%; border-collapse:collapse; font-size:13px; margin-top:10px; }
          th { background:#f1f5f9; border:1px solid #cbd5e1; padding:6px; text-align:left; }
          @media print { .no-print { display:none; } }
        </style>
      </head>
      <body>
        <h2>รายงานประสิทธิภาพและความเชื่อถือได้ของเครื่องจักร (PE Reliability Report)</h2>
        <div>ช่วงเวลา: ${escapeHtml(anFilter.startDate)} ถึง ${escapeHtml(anFilter.endDate)} | สายผลิต: ${escapeHtml(anFilter.line || 'ทั้งหมด')}</div>
        <div class="grid">
          <div class="card"><div class="label">MTBF</div><div class="val">${escapeHtml(kpi.mtbf)} ชม.</div></div>
          <div class="card"><div class="label">MTTR</div><div class="val">${escapeHtml(kpi.mttr)} นาที</div></div>
          <div class="card"><div class="label">Availability</div><div class="val">${escapeHtml(kpi.availability)}%</div></div>
          <div class="card"><div class="label">ค่าใช้จ่ายรวม</div><div class="val">${escapeHtml(formatBaht(kpi.total_cost))}</div></div>
        </div>
        <h3>เครื่องจักรที่หยุดบ่อย/นานสูงสุด (Top Problematic Machines)</h3>
        <table>
          <thead><tr><th style="width:40px;">#</th><th>เครื่องจักร</th><th>สายผลิต</th><th style="text-align:right;">จำนวนครั้ง</th><th style="text-align:right;">เวลารวม</th></tr></thead>
          <tbody>${topRows || '<tr><td colspan="5" style="text-align:center;padding:12px;">ไม่มีข้อมูลในช่วงเวลาที่เลือก</td></tr>'}</tbody>
        </table>
        <div class="no-print" style="margin-top:20px;text-align:right;">
          <button onclick="window.print()" style="padding:8px 16px;font-weight:bold;">พิมพ์รายงาน</button>
        </div>
      </body></html>
    `);
    win.document.close();
  };

  const trendData = useMemo(
    () => (analytics?.trend || []).map((t) => ({
      date: String(t.log_date || '').slice(5, 10),
      total_min: Number(t.total_min || 0),
      event_count: Number(t.event_count || 0),
    })),
    [analytics]
  );

  const paretoData = useMemo(
    () => (analytics?.pareto || []).map((p) => ({
      name: p.cause_category || 'Other',
      total_min: Number(p.total_min || 0),
      event_count: Number(p.event_count || 0),
    })),
    [analytics]
  );

  const costData = useMemo(
    () => (analytics?.cost_drivers || []).map((c) => ({
      name: String(c.machine_name || '').slice(0, 18),
      parts_cost: Number(c.parts_cost || 0),
      labor_cost: Number(c.labor_cost || 0),
    })),
    [analytics]
  );

  const woPieData = useMemo(
    () => (analytics?.wo_dist || []).map((w) => ({
      name: w.status || 'Unknown',
      value: Number(w.count || 0),
    })),
    [analytics]
  );

  const totalDtMinutes = Number(dtKpi?.total_downtime || 0);

  return (
    <div className="space-y-4">
      {/* Sub-tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubTab('tracker')}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
              subTab === 'tracker'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <Ban className="w-4 h-4" /> ประวัติหยุดเครื่อง (Downtime Tracker)
          </button>
          <button
            type="button"
            onClick={() => setSubTab('analytics')}
            className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 transition-colors ${
              subTab === 'analytics'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4" /> วิเคราะห์ MTBF / MTTR & ต้นทุน
          </button>
        </div>

        {subTab === 'tracker' ? (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExportDowntimeExcel}
              disabled={dtRows.length === 0}
              className="min-h-[44px] px-3.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <FileSpreadsheet className="w-4 h-4" /> Export Excel
            </button>
            <button
              type="button"
              onClick={openAddModal}
              disabled={isOffline}
              className="min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> บันทึกหยุดเครื่อง
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={handlePrintReliabilityReport}
            disabled={!analytics?.kpi}
            className="min-h-[44px] px-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 text-slate-800 dark:text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Printer className="w-4 h-4" /> พิมพ์รายงาน Reliability
          </button>
        )}
      </div>

      {/* ==================== SUB-TAB 1: DOWNTIME TRACKER ==================== */}
      {subTab === 'tracker' && (
        <div className="space-y-4">
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">รวมเวลาหยุดเครื่อง (Total Downtime)</div>
              <div className="mt-1 text-2xl font-extrabold text-rose-600">
                {formatNumber(totalDtMinutes, 0)} <span className="text-sm font-semibold">นาที</span>
              </div>
              <div className="text-[11px] text-slate-400">≈ {(totalDtMinutes / 60).toFixed(1)} ชั่วโมง</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">จำนวนเหตุการณ์ (Events)</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                {formatNumber(dtKpi?.total_events || 0, 0)} <span className="text-sm font-semibold">ครั้ง</span>
              </div>
              <div className="text-[11px] text-slate-400">ทั้งหมดที่ตรงเงื่อนไข {dtTotal} รายการ</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">เวลาหยุดเฉลี่ย / ครั้ง</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-600">
                {formatNumber(dtKpi?.avg_duration || 0, 1)} <span className="text-sm font-semibold">นาที</span>
              </div>
              <div className="text-[11px] text-slate-400">Average Stop Duration</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">สาเหตุอันดับ 1 (Top Cause)</div>
              <div className="mt-1 text-xl font-extrabold text-indigo-600 truncate">{topCause || '-'}</div>
              <div className="text-[11px] text-slate-400">เกิดบ่อยที่สุดในช่วงเวลา</div>
            </div>
          </div>

          {/* Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            <input
              type="date"
              value={dtFilter.startDate}
              onChange={(e) => setDtFilter((p) => ({ ...p, startDate: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <input
              type="date"
              value={dtFilter.endDate}
              onChange={(e) => setDtFilter((p) => ({ ...p, endDate: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <select
              value={dtFilter.line}
              onChange={(e) => setDtFilter((p) => ({ ...p, line: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            >
              <option value="">ทุกสายการผลิต (All Lines)</option>
              {lines.map((ln) => (
                <option key={ln} value={ln}>{ln}</option>
              ))}
            </select>
            <select
              value={dtFilter.cause_category}
              onChange={(e) => setDtFilter((p) => ({ ...p, cause_category: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            >
              <option value="">ทุกหมวดสาเหตุ</option>
              {DOWNTIME_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={dtFilter.search}
                onChange={(e) => setDtFilter((p) => ({ ...p, search: e.target.value }))}
                placeholder="ค้นหาเครื่อง / อาการ / ช่าง..."
                className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={loadDowntime}
              disabled={dtLoading}
              className="min-h-[44px] px-3 rounded-xl bg-slate-900 dark:bg-blue-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${dtLoading ? 'animate-spin' : ''}`} /> รีเฟรช
            </button>
          </div>

          {/* Line Summary Chips */}
          {lineSummary.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setDtFilter((p) => ({ ...p, line: '' }))}
                className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold border ${
                  dtFilter.line === ''
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                }`}
              >
                ทุกสาย ({dtKpi?.total_events || 0})
              </button>
              {lineSummary.map((ls) => (
                <button
                  key={ls.line || 'none'}
                  type="button"
                  onClick={() => setDtFilter((p) => ({ ...p, line: ls.line || '' }))}
                  className={`min-h-[38px] px-3 rounded-xl text-xs font-semibold border ${
                    dtFilter.line === ls.line
                      ? 'bg-rose-600 text-white border-rose-600'
                      : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {ls.line || 'ไม่ระบุสาย'}: {ls.event_count} ครั้ง ({formatNumber(ls.total_minutes, 0)} น.)
                </button>
              ))}
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden md:block bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 text-xs uppercase">
                <tr>
                  <th className="px-4 py-3 text-left">วันที่ / ช่วงเวลา</th>
                  <th className="px-4 py-3 text-left">เครื่องจักร / สายผลิต</th>
                  <th className="px-4 py-3 text-left">หมวดสาเหตุ & รายละเอียด</th>
                  <th className="px-4 py-3 text-right">ระยะเวลา</th>
                  <th className="px-4 py-3 text-left">ผู้แก้ไข / ใบแจ้งซ่อม</th>
                  <th className="px-4 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {dtRows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                      {dtLoading ? 'กำลังโหลดข้อมูล Downtime...' : 'ไม่พบประวัติการหยุดเครื่องจักรในช่วงเวลาที่เลือก'}
                    </td>
                  </tr>
                ) : (
                  dtRows.map((row) => {
                    const isOpen = !row.end_time;
                    return (
                      <tr key={row.downtime_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="font-semibold text-slate-900 dark:text-white">{formatPeDate(row.log_date)}</div>
                          <div className="text-xs text-slate-500">
                            {formatPeDateTime(row.start_time)}
                            {isOpen ? (
                              <span className="ml-1.5 px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold text-[10px]">
                                กำลังหยุด
                              </span>
                            ) : (
                              <> → {formatPeDateTime(row.end_time)}</>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-slate-900 dark:text-white">
                            {row.machine_code ? `${row.machine_code} — ` : ''}
                            {row.machine_name || 'ไม่ระบุชื่อเครื่อง'}
                          </div>
                          <div className="text-xs text-slate-500">{row.line || '-'}</div>
                        </td>
                        <td className="px-4 py-3 max-w-sm">
                          <span className="inline-flex px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold mb-1">
                            {row.cause_category || '-'}
                          </span>
                          <div className="text-slate-700 dark:text-slate-300 line-clamp-2">{row.cause_detail || '-'}</div>
                          {row.notes && <div className="text-xs text-slate-400 mt-0.5">หมายเหตุ: {row.notes}</div>}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="font-bold text-rose-600">{formatNumber(row.duration_min, 0)} นาที</div>
                          <div className="text-[11px] text-slate-400">{(Number(row.duration_min || 0) / 60).toFixed(1)} ชม.</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700 dark:text-slate-300">{row.recovered_by || '-'}</div>
                          {row.wo_number && (
                            <span className="inline-flex items-center gap-1 text-xs font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded mt-0.5">
                              <Wrench className="w-3 h-3" /> {row.wo_number}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            {isOpen && (
                              <button
                                type="button"
                                disabled={isOffline}
                                onClick={() => handleEndDowntime(row)}
                                title="บันทึกเวลาเดินเครื่องกลับ"
                                className="min-h-[38px] px-2.5 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> ปิดหยุด
                              </button>
                            )}
                            <button
                              type="button"
                              disabled={isOffline}
                              onClick={() => openEditModal(row)}
                              title="แก้ไข"
                              className="min-w-[38px] min-h-[38px] rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100 inline-flex items-center justify-center disabled:opacity-50"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              disabled={isOffline}
                              onClick={() => handleDeleteDowntime(row)}
                              title="ลบ"
                              className="min-w-[38px] min-h-[38px] rounded-lg border border-red-200 text-red-600 hover:bg-red-50 inline-flex items-center justify-center disabled:opacity-50"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {dtRows.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200">
                {dtLoading ? 'กำลังโหลด...' : 'ไม่พบรายการ Downtime'}
              </div>
            ) : (
              dtRows.map((row) => {
                const isOpen = !row.end_time;
                return (
                  <div key={row.downtime_id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">
                          {row.machine_code ? `${row.machine_code} — ` : ''}
                          {row.machine_name || row.line || 'เครื่องจักร'}
                        </div>
                        <div className="text-xs text-slate-500">
                          {formatPeDate(row.log_date)} • {row.line || '-'}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${isOpen ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'}`}>
                        {formatNumber(row.duration_min, 0)} น.
                      </span>
                    </div>
                    <div className="text-xs font-semibold text-amber-700">{row.cause_category}</div>
                    <div className="text-sm text-slate-700 dark:text-slate-300">{row.cause_detail}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5" />
                      <span>{formatPeDateTime(row.start_time)} {isOpen ? '(กำลังหยุด)' : `→ ${formatPeDateTime(row.end_time)}`}</span>
                    </div>
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
                      {isOpen && (
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => handleEndDowntime(row)}
                          className="min-h-[44px] px-3 rounded-xl bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-4 h-4" /> ปิดหยุด
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={() => openEditModal(row)}
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-200 flex items-center justify-center"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={() => handleDeleteDowntime(row)}
                        className="min-h-[44px] min-w-[44px] rounded-xl border border-red-200 text-red-600 flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* ==================== SUB-TAB 2: RELIABILITY ANALYTICS ==================== */}
      {subTab === 'analytics' && (
        <div className="space-y-4">
          {/* Analytics Filters */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
            <input
              type="date"
              value={anFilter.startDate}
              onChange={(e) => setAnFilter((p) => ({ ...p, startDate: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <input
              type="date"
              value={anFilter.endDate}
              onChange={(e) => setAnFilter((p) => ({ ...p, endDate: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            />
            <select
              value={anFilter.line}
              onChange={(e) => setAnFilter((p) => ({ ...p, line: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            >
              <option value="">ทุกสายการผลิต</option>
              {lines.map((ln) => (
                <option key={ln} value={ln}>{ln}</option>
              ))}
            </select>
            <select
              value={anFilter.causeCategory}
              onChange={(e) => setAnFilter((p) => ({ ...p, causeCategory: e.target.value }))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            >
              <option value="">ทุกหมวดสาเหตุ</option>
              {DOWNTIME_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadAnalytics}
              disabled={anLoading}
              className="min-h-[44px] px-4 rounded-xl bg-indigo-600 text-white text-sm font-semibold inline-flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${anLoading ? 'animate-spin' : ''}`} /> วิเคราะห์ใหม่
            </button>
          </div>

          {/* 5 KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-emerald-600" /> MTBF (ระยะห่างการเสีย)</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">{analytics?.kpi?.mtbf ?? 0} <span className="text-xs">ชม.</span></div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-600" /> MTTR (เวลาซ่อมเฉลี่ย)</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-600">{analytics?.kpi?.mttr ?? 0} <span className="text-xs">นาที</span></div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Activity className="w-3.5 h-3.5 text-blue-600" /> Machine Availability</div>
              <div className="mt-1 text-2xl font-extrabold text-blue-600">{analytics?.kpi?.availability ?? 100}%</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-rose-600" /> ต้นทุนซ่อม (อะไหล่+แรงงาน)</div>
              <div className="mt-1 text-xl font-extrabold text-rose-600">{formatBaht(analytics?.kpi?.total_cost ?? 0)}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 col-span-2 md:col-span-1">
              <div className="text-xs font-semibold text-slate-500 flex items-center gap-1"><Wrench className="w-3.5 h-3.5 text-indigo-600" /> Work Orders ปิดงาน</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                {analytics?.kpi?.completed_wo ?? 0} / {analytics?.kpi?.total_wo ?? 0}
              </div>
            </div>
          </div>

          {/* Charts Grid Row 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">แนวโน้มเวลาหยุดเครื่องจักรรายวัน (นาที / จำนวนครั้ง)</h4>
              <div className="h-64 w-full">
                {trendData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล Trend ในช่วงเวลาที่เลือก</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={trendData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar yAxisId="left" dataKey="total_min" name="เวลาหยุด (นาที)" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                      <Line yAxisId="right" type="monotone" dataKey="event_count" name="จำนวนครั้ง" stroke="#4f46e5" strokeWidth={2} />
                    </ComposedChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">Pareto สาเหตุการหยุดเครื่องจักร (นาที)</h4>
              <div className="h-64 w-full">
                {paretoData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">ไม่มีข้อมูล Pareto</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paretoData} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="total_min" name="เวลารวม (นาที)" radius={[0, 4, 4, 0]}>
                        {paretoData.map((entry, idx) => (
                          <Cell key={entry.name} fill={CAUSE_COLORS[idx % CAUSE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Charts Grid Row 2: Cost Drivers + WO Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">10 อันดับเครื่องจักรที่เกิดค่าใช้จ่ายซ่อมบำรุงสูงสุด (บาท)</h4>
              <div className="h-64 w-full">
                {costData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">ไม่มีข้อมูลค่าใช้จ่ายใบแจ้งซ่อมในช่วงเวลานี้</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={costData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="parts_cost" stackId="cost" name="ค่าอะไหล่ (บาท)" fill="#f59e0b" />
                      <Bar dataKey="labor_cost" stackId="cost" name="ค่าแรงช่าง (บาท)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm mb-3">สัดส่วนสถานะใบแจ้งซ่อม (Work Orders)</h4>
              <div className="h-64 w-full">
                {woPieData.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-sm text-slate-400">ไม่มีใบแจ้งซ่อม</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={woPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={42} outerRadius={78} paddingAngle={2}>
                        {woPieData.map((entry) => (
                          <Cell key={entry.name} fill={WO_PIE_COLORS[entry.name] || '#64748b'} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Tables Row: Predictive Risk + Tech Performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> เครื่องจักรกลุ่มเสี่ยงเสียซ้ำ (Predictive Risk ≥ 2 ครั้ง)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">เครื่องจักร</th>
                      <th className="px-3 py-2 text-right">ความถี่</th>
                      <th className="px-3 py-2 text-right">เวลาหยุดรวม</th>
                      <th className="px-3 py-2 text-center">ระดับความเสี่ยง</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(analytics?.predictive_risk || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">ไม่พบเครื่องจักรที่หยุดซ้ำในช่วงเวลานี้</td></tr>
                    ) : (
                      analytics.predictive_risk.map((r, i) => (
                        <tr key={`${r.machine_name}-${i}`}>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-900 dark:text-white">{r.machine_name}</div>
                            <div className="text-[11px] text-slate-400">{r.line || '-'}</div>
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">{r.event_count} ครั้ง</td>
                          <td className="px-3 py-2 text-right">{formatNumber(r.total_min, 0)} น.</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                              r.risk_level === 'Critical'
                                ? 'bg-red-100 text-red-700'
                                : r.risk_level === 'High'
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}>
                              {r.risk_level} ({r.risk_score})
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" /> ประสิทธิภาพทีมช่างซ่อมบำรุง (Technician KPI)
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                    <tr>
                      <th className="px-3 py-2 text-left">ผู้รับผิดชอบ</th>
                      <th className="px-3 py-2 text-right">งานทั้งหมด</th>
                      <th className="px-3 py-2 text-right">ปิดงาน</th>
                      <th className="px-3 py-2 text-right">MTTR เฉลี่ย</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {(analytics?.tech_performance || []).length === 0 ? (
                      <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-400">ไม่มีข้อมูลการมอบหมายช่างในช่วงเวลานี้</td></tr>
                    ) : (
                      analytics.tech_performance.map((tp) => (
                        <tr key={tp.tech_name}>
                          <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{tp.tech_name}</td>
                          <td className="px-3 py-2 text-right">{tp.total_wo}</td>
                          <td className="px-3 py-2 text-right text-emerald-600 font-bold">{tp.completed_wo}</td>
                          <td className="px-3 py-2 text-right">{formatNumber(tp.avg_repair, 1)} น.</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== ADD / EDIT DOWNTIME MODAL ==================== */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden max-h-[92vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {dtForm.downtime_id ? `แก้ไขข้อมูล Downtime #${dtForm.downtime_id}` : 'บันทึกการหยุดเครื่องจักร (Downtime)'}
              </h3>
              <button type="button" onClick={() => setModalOpen(false)} className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-slate-100 flex items-center justify-center">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveDowntime} className="p-5 space-y-3 overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">เลือกเครื่องจักร</label>
                <select
                  value={dtForm.machine_id}
                  onChange={(e) => handleMachineSelect(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
                >
                  <option value="">-- ระบุสายผลิต/ชื่อเครื่องจักรเอง --</option>
                  {machines.map((m) => (
                    <option key={m.machine_id} value={m.machine_id}>
                      {m.machine_code} — {m.machine_name} ({m.line || '-'})
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเครื่องจักร</label>
                  <input
                    type="text"
                    value={dtForm.machine_name}
                    onChange={(e) => setDtForm((p) => ({ ...p, machine_name: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">สายการผลิต (Line)</label>
                  <input
                    type="text"
                    value={dtForm.line}
                    onChange={(e) => setDtForm((p) => ({ ...p, line: e.target.value }))}
                    placeholder="เช่น STAMPING, PAINT"
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่ *</label>
                  <input
                    type="date"
                    required
                    value={dtForm.log_date}
                    onChange={(e) => setDtForm((p) => ({ ...p, log_date: e.target.value }))}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เวลาเริ่ม *</label>
                  <input
                    type="time"
                    required
                    value={dtForm.start_time}
                    onChange={(e) => setDtForm((p) => ({ ...p, start_time: e.target.value }))}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่จบ</label>
                  <input
                    type="date"
                    value={dtForm.end_date}
                    onChange={(e) => setDtForm((p) => ({ ...p, end_date: e.target.value }))}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">เวลาจบ</label>
                  <input
                    type="time"
                    value={dtForm.end_time}
                    onChange={(e) => setDtForm((p) => ({ ...p, end_time: e.target.value }))}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-200 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">หมวดสาเหตุ *</label>
                <select
                  required
                  value={dtForm.cause_category}
                  onChange={(e) => setDtForm((p) => ({ ...p, cause_category: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                >
                  {DOWNTIME_CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">รายละเอียดอาการ / สาเหตุ *</label>
                <textarea
                  rows={2}
                  required
                  value={dtForm.cause_detail}
                  onChange={(e) => setDtForm((p) => ({ ...p, cause_detail: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้แก้ไข (Recovered By)</label>
                  <input
                    type="text"
                    value={dtForm.recovered_by}
                    onChange={(e) => setDtForm((p) => ({ ...p, recovered_by: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุ</label>
                  <input
                    type="text"
                    value={dtForm.notes}
                    onChange={(e) => setDtForm((p) => ({ ...p, notes: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm"
                  />
                </div>
              </div>
              {!dtForm.downtime_id && (
                <label className="flex items-center gap-2 pt-1 cursor-pointer text-sm text-slate-700 dark:text-slate-300">
                  <input
                    type="checkbox"
                    checked={Boolean(dtForm.create_wo)}
                    onChange={(e) => setDtForm((p) => ({ ...p, create_wo: e.target.checked }))}
                    className="w-4 h-4 rounded"
                  />
                  เปิดใบแจ้งซ่อม (PE Work Order) อัตโนมัติจากรายการนี้
                </label>
              )}
              <div className="pt-3 flex justify-end gap-2">
                <button type="button" onClick={() => setModalOpen(false)} className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold">
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingDt || isOffline}
                  className="min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold disabled:opacity-50"
                >
                  {savingDt ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

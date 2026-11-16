import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bot,
  Calendar,
  Download,
  FileSpreadsheet,
  Layers,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { managementPlanApi } from '../../../shared/services/managementApi';
import {
  exportPlansToExcel,
  formatMoney,
  parsePlanWorkbookFile,
} from '../utils/managementHelpers';
import {
  ApsAutoPlanModal,
  DeleteRangeModal,
  FinancialAssessmentModal,
  PlanEditModal,
} from './ManagementModals';

export default function ProductionPlanningTab({ isOffline }) {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef(null);

  const today = useMemo(() => new Date(), []);
  const [startDate, setStartDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  );
  const [endDate, setEndDate] = useState(
    () => new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
  );
  const [lineFilter, setLineFilter] = useState('');
  const [shiftFilter, setShiftFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [dailyCombine, setDailyCombine] = useState(false);
  const [chartMode, setChartMode] = useState('date'); // date | money | item
  const [page, setPage] = useState(1);

  const [lines, setLines] = useState([]);
  const [plans, setPlans] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({ current_page: 1, total_pages: 1, total_records: 0 });
  const [loading, setLoading] = useState(true);

  const [planModalOpen, setPlanModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [apsModalOpen, setApsModalOpen] = useState(false);
  const [deleteRangeOpen, setDeleteRangeOpen] = useState(false);
  const [assessmentRow, setAssessmentRow] = useState(null);

  const isAdminOrCreator = ['admin', 'creator'].includes(String(user?.role || '').toLowerCase());

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchQuery.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const loadFilters = useCallback(async () => {
    const res = await managementPlanApi.getFilters();
    if (res?.success && res.data?.lines) {
      setLines(res.data.lines);
    }
  }, []);

  const loadPlans = useCallback(async () => {
    setLoading(true);
    try {
      const res = await managementPlanApi.getPlans({
        startDate,
        endDate,
        line: lineFilter,
        shift: shiftFilter,
        search: debouncedSearch,
        page,
        limit: 100,
      });
      if (res?.success && res.data) {
        setPlans(res.data.items || []);
        setSummary(res.data.summary || {});
        setPagination(res.data.pagination || { current_page: 1, total_pages: 1, total_records: 0 });
      }
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, lineFilter, shiftFilter, debouncedSearch, page]);

  useEffect(() => {
    loadFilters();
  }, [loadFilters]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const exchangeRate = 32.0;

  const displayedRows = useMemo(() => {
    if (!dailyCombine) return plans;
    const grouped = {};
    plans.forEach((r) => {
      const key = `${r.plan_date}|${r.line}|${r.item_id}`;
      if (!grouped[key]) {
        grouped[key] = { ...r, shift: 'ALL', isCombined: true };
      } else {
        grouped[key].original_planned_quantity = Number(grouped[key].original_planned_quantity || 0) + Number(r.original_planned_quantity || 0);
        grouped[key].carry_over_quantity = Number(grouped[key].carry_over_quantity || 0) + Number(r.carry_over_quantity || 0);
        grouped[key].adjusted_planned_quantity = Number(grouped[key].adjusted_planned_quantity || 0) + Number(r.adjusted_planned_quantity || 0);
        grouped[key].actual_quantity = Number(grouped[key].actual_quantity || 0) + Number(r.actual_quantity || 0);
        grouped[key].ot_hours = Number(grouped[key].ot_hours || 0) + Number(r.ot_hours || 0);
      }
    });
    return Object.values(grouped);
  }, [plans, dailyCombine]);

  const chartData = useMemo(() => {
    const map = {};
    plans.forEach((r) => {
      const unitPrice = Number(r.price_usd || 0) > 0 ? Number(r.price_usd) * exchangeRate : Number(r.standard_price || 0);
      const tgt = Number(r.adjusted_planned_quantity || 0);
      const act = Number(r.actual_quantity || 0);
      const key = chartMode === 'item' ? (r.part_no || r.sap_no || 'Item') : r.plan_date;
      if (!map[key]) map[key] = { label: key, plan: 0, actual: 0 };
      if (chartMode === 'money') {
        map[key].plan += tgt * unitPrice;
        map[key].actual += act * unitPrice;
      } else {
        map[key].plan += tgt;
        map[key].actual += act;
      }
    });
    return Object.values(map).sort((a, b) => a.label.localeCompare(b.label)).slice(0, 35);
  }, [plans, chartMode]);

  const calendarDays = useMemo(() => {
    const byDate = {};
    plans.forEach((r) => {
      const d = r.plan_date;
      if (!byDate[d]) byDate[d] = { date: d, planQty: 0, actualQty: 0, count: 0 };
      byDate[d].planQty += Number(r.adjusted_planned_quantity || 0);
      byDate[d].actualQty += Number(r.actual_quantity || 0);
      byDate[d].count += 1;
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [plans]);

  const handleInlineUpdate = async (row, field, rawVal) => {
    if (isOffline || row.isCombined) return;
    const val = field === 'note' ? rawVal : Number(rawVal || 0);
    if (field === 'carry_over_quantity') {
      if (!row.plan_id) return;
      const res = await managementPlanApi.updateCarryOver(row.plan_id, val);
      if (res?.success) {
        toast.success('อัปเดต Carry Over แล้ว');
        loadPlans();
      }
      return;
    }

    const res = await managementPlanApi.savePlan({
      plan_id: row.plan_id || 0,
      plan_date: row.plan_date,
      line: row.line,
      shift: row.shift,
      item_id: row.item_id,
      original_planned_quantity: field === 'original_planned_quantity' ? val : Number(row.original_planned_quantity || 0),
      carry_over_quantity: Number(row.carry_over_quantity || 0),
      note: field === 'note' ? val : (row.note || ''),
    });
    if (res?.success) {
      toast.success('บันทึกการเปลี่ยนแปลงแล้ว');
      loadPlans();
    }
  };

  const handleCalcCarryOver = async () => {
    if (isOffline) return;
    const ok = await confirm({
      title: 'คำนวณยอดยกมา (Carry Over)',
      message: 'ต้องการรัน Stored Procedure คำนวณยอดยกมาตลอดช่วงแผนปัจจุบันใช่หรือไม่?',
      confirmText: 'คำนวณ C/O',
    });
    if (!ok) return;
    const res = await managementPlanApi.calculateCarryOver();
    if (res?.success) {
      toast.success(res.message);
      loadPlans();
    }
  };

  const handleImportWorkbook = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || isOffline) return;
    try {
      const parsed = await parsePlanWorkbookFile(file, lineFilter);
      if (parsed.plans.length === 0) {
        toast.warning('ไม่พบแถวแผนการผลิตที่มีรูปแบบวันที่ถูกต้องในไฟล์นี้');
        return;
      }
      const ok = await confirm({
        title: `นำเข้าแผน ${parsed.plans.length} รายการ`,
        message: `Lines ที่พบ: ${parsed.lines.join(', ')} ยืนยันการนำเข้าและอัปเดต Carry Over?`,
        confirmText: 'นำเข้าข้อมูล',
      });
      if (!ok) return;
      const res = await managementPlanApi.importPlansBulk(parsed.plans);
      if (res?.success) {
        toast.success(res.message);
        await managementPlanApi.calculateCarryOver();
        loadPlans();
      }
    } catch (err) {
      toast.error(`อ่านไฟล์ไม่สำเร็จ: ${err.message}`);
    }
  };

  const handleClearAll = async () => {
    if (isOffline || !isAdminOrCreator) return;
    const ok = await confirm({
      title: 'ล้างแผนการผลิตทั้งหมด (Clear All)',
      message: 'การดำเนินการนี้จะลบแผนการผลิตทั้งหมดในระบบอย่างถาวร ยืนยันหรือไม่?',
      confirmText: 'ยืนยันล้างทั้งหมด',
      danger: true,
    });
    if (!ok) return;
    const res = await managementPlanApi.clearAllPlans();
    if (res?.success) {
      toast.success(res.message);
      loadPlans();
    }
  };

  const handleDeleteSinglePlan = async (planId) => {
    const ok = await confirm({
      title: 'ลบรายการแผนการผลิต',
      message: 'ยืนยันลบแผนรายการนี้หรือไม่?',
      confirmText: 'ลบรายการ',
      danger: true,
    });
    if (!ok) return;
    const res = await managementPlanApi.deletePlan(planId);
    if (res?.success) {
      toast.success('ลบแผนสำเร็จ');
      setPlanModalOpen(false);
      loadPlans();
    }
  };

  const totalPlanQty = Number(summary.total_plan_qty || 0);
  const totalActualQty = Number(summary.total_actual_qty || 0);
  const totalBacklog = Math.max(0, totalPlanQty - totalActualQty);
  const totalEstSales = Number(summary.total_plan_sale_usd || 0) > 0
    ? Number(summary.total_plan_sale_usd) * exchangeRate
    : Number(summary.total_plan_sale_thb || 0);
  const totalActSales = Number(summary.total_actual_sale_usd || 0) > 0
    ? Number(summary.total_actual_sale_usd) * exchangeRate
    : Number(summary.total_actual_sale_thb || 0);
  const totalSalesDiff = totalActSales - totalEstSales;

  return (
    <div className="space-y-4">
      {/* Chart + Mini Schedule Calendar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-8 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <FileSpreadsheet className="h-4 w-4 text-blue-600" />
              <span>Plan vs Actual</span>
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                <input type="date" value={startDate} onChange={(e) => { setStartDate(e.target.value); setPage(1); }} className="bg-transparent font-semibold focus:outline-none" />
                <span>-</span>
                <input type="date" value={endDate} onChange={(e) => { setEndDate(e.target.value); setPage(1); }} className="bg-transparent font-semibold focus:outline-none" />
              </div>
              <select
                value={lineFilter}
                onChange={(e) => { setLineFilter(e.target.value); setPage(1); }}
                className="min-h-[38px] rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">All Lines</option>
                {lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
              </select>
              <select
                value={shiftFilter}
                onChange={(e) => { setShiftFilter(e.target.value); setPage(1); }}
                className="min-h-[38px] rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
              >
                <option value="">All Shifts</option>
                <option value="DAY">DAY</option>
                <option value="NIGHT">NIGHT</option>
              </select>
              <div className="inline-flex rounded-xl border border-slate-200 p-0.5 text-xs dark:border-slate-700">
                {[
                  { id: 'date', label: 'Qty/วัน' },
                  { id: 'money', label: '฿ รายได้' },
                  { id: 'item', label: 'ราย Part' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setChartMode(m.id)}
                    className={`rounded-lg px-2.5 py-1 font-bold ${
                      chartMode === m.id ? 'bg-blue-600 text-white' : 'text-slate-500'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-64 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip formatter={(v) => (chartMode === 'money' ? formatMoney(v) : Number(v).toLocaleString())} />
                <Legend />
                <Bar dataKey="plan" name="Target" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="actual" name="Actual" fill="#2563eb" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Daily Plan Summary Calendar Grid */}
        <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:col-span-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-slate-100">
              <Calendar className="h-4 w-4 text-emerald-600" />
              <span>ปฏิทินสรุปยอดแผน ({calendarDays.length} วัน)</span>
            </h3>
          </div>
          <div className="grid max-h-64 flex-1 grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-3 lg:grid-cols-2">
            {calendarDays.length === 0 ? (
              <div className="col-span-full py-10 text-center text-xs text-slate-400">ไม่พบแผนในช่วงวันที่ที่เลือก</div>
            ) : calendarDays.map((d) => {
              const pct = d.planQty > 0 ? Math.min(100, Math.round((d.actualQty / d.planQty) * 100)) : 0;
              return (
                <button
                  key={d.date}
                  type="button"
                  onClick={() => {
                    setStartDate(d.date);
                    setEndDate(d.date);
                    setPage(1);
                  }}
                  className="rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-left text-xs transition hover:border-blue-400 dark:border-slate-800 dark:bg-slate-800/60"
                >
                  <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-100">
                    <span>{d.date.slice(5)}</span>
                    <span className={`text-[10px] ${pct >= 100 ? 'text-emerald-600' : 'text-blue-600'}`}>{pct}%</span>
                  </div>
                  <div className="mt-1 font-mono text-[10px] text-slate-500">
                    {d.actualQty.toLocaleString()} / {d.planQty.toLocaleString()}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Plans Table Card */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Production Plans ({pagination.total_records})</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-3 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ค้นหา Part, SAP, Note..."
                className="min-h-[38px] w-52 rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 text-xs focus:outline-none dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <button
              type="button"
              onClick={() => setDailyCombine((v) => !v)}
              className={`inline-flex min-h-[38px] items-center gap-1.5 rounded-xl border px-3 text-xs font-bold ${
                dailyCombine ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 text-slate-600 dark:border-slate-700'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Daily View (รวมกะ)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={handleImportWorkbook} />
            <button
              type="button"
              onClick={() => exportPlansToExcel(displayedRows, exchangeRate)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              <Download className="h-3.5 w-3.5 text-emerald-600" />
              <span>Export</span>
            </button>
            <button
              type="button"
              disabled={isOffline}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
            >
              <Upload className="h-3.5 w-3.5 text-blue-600" />
              <span>Import</span>
            </button>
            <button
              type="button"
              disabled={isOffline}
              onClick={handleCalcCarryOver}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span>Calc C/O</span>
            </button>
            <button
              type="button"
              disabled={isOffline}
              onClick={() => setDeleteRangeOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Delete Range</span>
            </button>
            {isAdminOrCreator && (
              <button
                type="button"
                disabled={isOffline}
                onClick={handleClearAll}
                className="inline-flex min-h-[44px] items-center gap-1 rounded-xl border border-rose-300 bg-rose-600 px-3 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                <span>Clear All</span>
              </button>
            )}
            <button
              type="button"
              disabled={isOffline}
              onClick={() => setApsModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-blue-300 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Auto Create</span>
            </button>
            <button
              type="button"
              disabled={isOffline}
              onClick={() => { setEditingPlan(null); setPlanModalOpen(true); }}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              <span>New Plan</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800/70 dark:text-slate-300">
              <tr>
                <th className="p-2.5">Date</th>
                <th className="p-2.5 text-center">Line</th>
                <th className="p-2.5 text-center">Shift</th>
                <th className="p-2.5">Item / Description</th>
                <th className="p-2.5 text-right">Plan</th>
                <th className="p-2.5 text-right">C/O</th>
                <th className="p-2.5 text-right">Target</th>
                <th className="p-2.5 text-right">Actual</th>
                <th className="p-2.5 text-right">Est. Sales</th>
                <th className="p-2.5 text-right">Act. Sales</th>
                <th className="p-2.5 text-right">Sales Diff</th>
                <th className="p-2.5">Note</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={12} className="py-10 text-center text-slate-400">กำลังโหลดข้อมูลแผนการผลิต...</td></tr>
              ) : displayedRows.length === 0 ? (
                <tr><td colSpan={12} className="py-10 text-center text-slate-400">ไม่พบรายการแผนการผลิต</td></tr>
              ) : displayedRows.map((row, idx) => {
                const unitPrice = Number(row.price_usd || 0) > 0
                  ? Number(row.price_usd) * exchangeRate
                  : Number(row.standard_price || 0);
                const targetQty = Number(row.adjusted_planned_quantity || 0);
                const actQty = Number(row.actual_quantity || 0);
                const estSales = targetQty * unitPrice;
                const actSales = actQty * unitPrice;
                const diffSales = actSales - estSales;
                return (
                  <tr key={`${row.plan_id}-${row.plan_date}-${row.line}-${row.shift}-${row.item_id}-${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="whitespace-nowrap p-2.5 font-mono">{row.plan_date}</td>
                    <td className="p-2.5 text-center font-bold">{row.line}</td>
                    <td className="p-2.5 text-center">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        row.shift === 'NIGHT' ? 'bg-indigo-100 text-indigo-700' : 'bg-amber-100 text-amber-800'
                      }`}>
                        {row.shift}
                      </span>
                    </td>
                    <td className="p-2.5">
                      <button
                        type="button"
                        onClick={() => !row.isCombined && setAssessmentRow(row)}
                        className="text-left hover:underline"
                      >
                        <div className="font-bold text-blue-700 dark:text-blue-400">{row.part_no}</div>
                        <div className="max-w-xs truncate text-[11px] text-slate-500">{row.sap_no} • {row.part_description}</div>
                      </button>
                    </td>
                    <td className="p-2.5 text-right">
                      {row.isCombined ? (
                        <span className="font-mono font-bold">{Number(row.original_planned_quantity || 0).toLocaleString()}</span>
                      ) : (
                        <input
                          type="number"
                          defaultValue={Number(row.original_planned_quantity || 0)}
                          onBlur={(e) => {
                            if (Number(e.target.value) !== Number(row.original_planned_quantity || 0)) {
                              handleInlineUpdate(row, 'original_planned_quantity', e.target.value);
                            }
                          }}
                          className="w-20 rounded border border-slate-200 px-1.5 py-1 text-right font-mono font-bold dark:border-slate-700 dark:bg-slate-800"
                        />
                      )}
                    </td>
                    <td className="p-2.5 text-right">
                      {row.isCombined || !row.plan_id ? (
                        <span className="font-mono text-slate-500">{Number(row.carry_over_quantity || 0).toLocaleString()}</span>
                      ) : (
                        <input
                          type="number"
                          defaultValue={Number(row.carry_over_quantity || 0)}
                          onBlur={(e) => {
                            if (Number(e.target.value) !== Number(row.carry_over_quantity || 0)) {
                              handleInlineUpdate(row, 'carry_over_quantity', e.target.value);
                            }
                          }}
                          className="w-16 rounded border border-slate-200 px-1.5 py-1 text-right font-mono dark:border-slate-700 dark:bg-slate-800"
                        />
                      )}
                    </td>
                    <td className="p-2.5 text-right font-mono font-bold">{targetQty.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-blue-600">{actQty.toLocaleString()}</td>
                    <td className="p-2.5 text-right font-mono text-slate-500">{formatMoney(estSales)}</td>
                    <td className="p-2.5 text-right font-mono font-bold text-emerald-600">{formatMoney(actSales)}</td>
                    <td className={`p-2.5 text-right font-mono font-bold ${diffSales >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {formatMoney(diffSales)}
                    </td>
                    <td className="p-2.5">
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          disabled={row.isCombined}
                          defaultValue={row.note || ''}
                          onBlur={(e) => {
                            if ((e.target.value || '') !== (row.note || '')) {
                              handleInlineUpdate(row, 'note', e.target.value);
                            }
                          }}
                          className="w-28 rounded border border-slate-200 px-1.5 py-1 text-[11px] dark:border-slate-700 dark:bg-slate-800"
                        />
                        {!row.isCombined && row.plan_id > 0 && (
                          <button
                            type="button"
                            onClick={() => { setEditingPlan(row); setPlanModalOpen(true); }}
                            className="rounded border border-slate-200 px-2 py-1 text-[10px] font-bold hover:bg-slate-100 dark:border-slate-700"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Summary & Pagination Footer */}
        <div className="flex flex-col gap-3 border-t border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900/80">
          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 font-bold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
            >
              ก่อนหน้า
            </button>
            <span className="font-mono font-bold">หน้า {pagination.current_page} / {pagination.total_pages}</span>
            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => p + 1)}
              className="min-h-[38px] rounded-lg border border-slate-200 bg-white px-3 font-bold disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
            >
              ถัดไป
            </button>
          </div>

          <div className="flex flex-wrap gap-4 text-xs">
            <div><span className="text-slate-400">Plan:</span> <strong className="font-mono text-blue-600">{totalPlanQty.toLocaleString()}</strong></div>
            <div><span className="text-slate-400">Actual:</span> <strong className="font-mono">{totalActualQty.toLocaleString()}</strong></div>
            <div><span className="text-slate-400">Backlog:</span> <strong className="font-mono text-amber-600">{totalBacklog.toLocaleString()}</strong></div>
            <div><span className="text-slate-400">Est.Sales:</span> <strong className="font-mono text-slate-600">{formatMoney(totalEstSales)}</strong></div>
            <div><span className="text-slate-400">Act.Sales:</span> <strong className="font-mono text-emerald-600">{formatMoney(totalActSales)}</strong></div>
            <div><span className="text-slate-400">Diff:</span> <strong className={`font-mono ${totalSalesDiff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>{formatMoney(totalSalesDiff)}</strong></div>
          </div>
        </div>
      </div>

      <PlanEditModal
        open={planModalOpen}
        initialPlan={editingPlan}
        lines={lines}
        isOffline={isOffline}
        onClose={() => setPlanModalOpen(false)}
        onSaved={(msg) => {
          toast.success(msg);
          setPlanModalOpen(false);
          loadPlans();
        }}
        onDelete={handleDeleteSinglePlan}
      />

      <ApsAutoPlanModal
        open={apsModalOpen}
        isOffline={isOffline}
        onClose={() => setApsModalOpen(false)}
        onCompleted={(msg) => {
          toast.success(msg);
          setApsModalOpen(false);
          loadPlans();
        }}
      />

      <DeleteRangeModal
        open={deleteRangeOpen}
        lines={lines}
        isOffline={isOffline}
        onClose={() => setDeleteRangeOpen(false)}
        onDeleted={(msg) => {
          toast.success(msg);
          setDeleteRangeOpen(false);
          loadPlans();
        }}
      />

      <FinancialAssessmentModal
        row={assessmentRow}
        exchangeRate={exchangeRate}
        onClose={() => setAssessmentRow(null)}
      />
    </div>
  );
}

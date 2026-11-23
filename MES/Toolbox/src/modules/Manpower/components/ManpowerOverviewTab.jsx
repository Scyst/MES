import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  Users, UserCheck, Clock, UserX, CalendarOff, Coins,
  BarChart3, Download, Sparkles, CalendarDays, ArrowRightLeft, RefreshCw, X,
  ChevronDown, ChevronRight, Layers, ChevronsUpDown
} from 'lucide-react';
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { manpowerOpsApi } from '../../../shared/services/manpowerApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import {
  formatMoney, formatNumber, offsetIsoDate, exportRowsToExcel, exportMultiSheetTrendExcel
} from '../utils/manpowerHelpers';
import ManpowerDetailModal from './ManpowerDetailModal';

const VIEW_MODES = [
  { id: 'LINE', label: 'รายสายผลิต (By Line)', shortLabel: 'รายสายผลิต' },
  { id: 'SHIFT', label: 'แยกกะ (By Shift)', shortLabel: 'แยกกะ' },
  { id: 'TYPE', label: 'กลุ่มจ้าง (Wage Type)', shortLabel: 'กลุ่มจ้าง' },
  { id: 'PAYMENT_LINE', label: 'การจ่ายเงิน × สายผลิต', shortLabel: 'จ่ายเงิน × ไลน์' },
  { id: 'PAYMENT', label: 'ประเภทการจ่าย (Rate Type)', shortLabel: 'รายเดือน / วัน' },
];

const PIE_SPECS = [
  { key: 'present', status: 'PRESENT', name: 'มาตรงเวลา', color: '#10b981' },
  { key: 'late', status: 'LATE', name: 'มาสาย', color: '#f59e0b' },
  { key: 'absent', status: 'ABSENT', name: 'ขาดงาน', color: '#ef4444' },
  { key: 'leave', status: 'LEAVE', name: 'ลางาน', color: '#06b6d4' },
  { key: 'waiting', status: 'HOLIDAY_WAITING', name: 'วันหยุด / รอสแกน', color: '#64748b' },
];

function createEmptyStats() {
  return {
    hc: 0,
    plan: 0,
    present: 0,
    late: 0,
    absent: 0,
    leave: 0,
    actual: 0,
    diff: 0,
    dl: 0,
    ot: 0,
    dlot: 0,
    cost: 0,
    dl_count: 0,
    ot_count: 0,
    ot_hours: 0,
  };
}

function accumulateStats(target, src) {
  target.hc += Number(src.hc || 0);
  target.plan += Number(src.plan || 0);
  target.present += Number(src.present || 0);
  target.late += Number(src.late || 0);
  target.absent += Number(src.absent || 0);
  target.leave += Number(src.leave || 0);
  target.actual += Number(src.actual || 0);
  target.dl += Number(src.dl || 0);
  target.ot += Number(src.ot || 0);
  target.dlot += Number(src.dlot || 0);
  target.cost += Number(src.cost || 0);
  target.dl_count += Number(src.dl_count || 0);
  target.ot_count += Number(src.ot_count || 0);
  target.ot_hours += Number(src.ot_hours || 0);
}

/**
 * Rebuilds the 3-level legacy hierarchy (Parent -> Sub -> Leaf Items + GrandTotal)
 * preserving exact drilldown filter metadata on every level.
 */
function buildHierarchicalMatrix(rawRows, viewMode) {
  const groups = new Map();
  const grandTotal = createEmptyStats();

  for (const row of rawRows) {
    const lineName = row.display_section || row.line_name || 'Unassigned';
    const shiftName = row.shift_name || 'Day';
    const empType = row.category_name || row.emp_type || 'General';
    const rType = String(row.rate_type || 'DAILY').toUpperCase();
    const rateTag = rType.includes('MONTHLY') ? 'Monthly' : 'Daily';
    const shiftId = shiftName.toLowerCase().includes('night') || shiftName.includes('2') ? '2' : '1';
    const teamSuffix = row.team_group ? ` (${row.team_group})` : '';

    let mainKey = '';
    let subKey = '';
    let itemKey = '';
    let parentMeta = { line: '', shift: '', empType: 'ALL' };
    let subMeta = { line: '', shift: '', empType: 'ALL' };
    let itemMeta = { line: lineName, shift: shiftId, empType };

    if (viewMode === 'PAYMENT') {
      mainKey = rType.includes('MONTHLY') ? 'Monthly Staff (รายเดือน)' : 'Daily Staff (รายวัน)';
      subKey = empType;
      itemKey = `${lineName} (${shiftName})`;
      parentMeta = { line: '', shift: '', empType: rType.includes('MONTHLY') ? 'RATE:MONTHLY' : 'RATE:DAILY' };
      subMeta = { line: '', shift: '', empType };
      itemMeta = { line: lineName, shift: shiftId, empType: rType.includes('MONTHLY') ? 'RATE:MONTHLY' : 'RATE:DAILY' };
    } else if (viewMode === 'PAYMENT_LINE') {
      mainKey = lineName;
      subKey = `${shiftName}${teamSuffix}`;
      itemKey = `${rateTag} - ${empType}`;
      parentMeta = { line: lineName, shift: '', empType: 'ALL' };
      subMeta = { line: lineName, shift: shiftId, empType: 'ALL' };
      itemMeta = { line: lineName, shift: shiftId, empType: rType.includes('MONTHLY') ? 'RATE:MONTHLY' : 'RATE:DAILY' };
    } else if (viewMode === 'TYPE') {
      mainKey = empType;
      subKey = lineName;
      itemKey = `${shiftName}${teamSuffix}`;
      parentMeta = { line: '', shift: '', empType };
      subMeta = { line: lineName, shift: '', empType };
      itemMeta = { line: lineName, shift: shiftId, empType };
    } else if (viewMode === 'SHIFT') {
      mainKey = shiftName;
      subKey = lineName;
      itemKey = empType;
      parentMeta = { line: '', shift: shiftId, empType: 'ALL' };
      subMeta = { line: lineName, shift: shiftId, empType: 'ALL' };
      itemMeta = { line: lineName, shift: shiftId, empType };
    } else {
      // Default: LINE (By Line)
      mainKey = lineName;
      subKey = `${shiftName}${teamSuffix}`;
      itemKey = empType;
      parentMeta = { line: lineName, shift: '', empType: 'ALL' };
      subMeta = { line: lineName, shift: shiftId, empType: 'ALL' };
      itemMeta = { line: lineName, shift: shiftId, empType };
    }

    const stats = {
      hc: Number(row.Total_Registered || 0),
      plan: Number(row.Total_Registered || 0),
      present: Number(row.Count_Present || 0),
      late: Number(row.Count_Late || 0),
      absent: Number(row.Count_Absent || 0),
      leave: Number(row.Count_Leave || 0),
      actual: Number(row.Count_Actual ?? (Number(row.Count_Present || 0) + Number(row.Count_Late || 0))),
      diff: 0,
      dl: Number(row.Normal_Cost || 0),
      ot: Number(row.OT_Cost || 0),
      dlot: Number(row.Normal_Cost || 0) + Number(row.OT_Cost || 0),
      cost: Number(row.Total_Cost ?? (Number(row.Normal_Cost || 0) + Number(row.OT_Cost || 0))),
      dl_count: Number(row.dl_count || 0),
      ot_count: Number(row.Count_OT || 0),
      ot_hours: Number(row.Total_OT_Hours || 0),
    };
    if (!stats.dl_count && stats.dl > 0) {
      stats.dl_count = stats.present + stats.late + stats.leave;
    }

    if (!groups.has(mainKey)) {
      groups.set(mainKey, {
        id: `p:${mainKey}`,
        name: mainKey,
        meta: parentMeta,
        total: createEmptyStats(),
        subs: new Map(),
      });
    }
    const g = groups.get(mainKey);
    accumulateStats(g.total, stats);

    if (!g.subs.has(subKey)) {
      g.subs.set(subKey, {
        id: `s:${mainKey}__${subKey}`,
        name: subKey,
        meta: subMeta,
        total: createEmptyStats(),
        items: new Map(),
      });
    }
    const sub = g.subs.get(subKey);
    accumulateStats(sub.total, stats);

    if (!sub.items.has(itemKey)) {
      sub.items.set(itemKey, {
        id: `i:${mainKey}__${subKey}__${itemKey}`,
        name: itemKey,
        meta: itemMeta,
        ...createEmptyStats(),
      });
    }
    accumulateStats(sub.items.get(itemKey), stats);
    accumulateStats(grandTotal, stats);
  }

  const finalize = (s) => {
    s.diff = s.actual - s.plan;
  };
  finalize(grandTotal);

  const sortedGroups = Array.from(groups.values())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((g) => {
      finalize(g.total);
      const subs = Array.from(g.subs.values())
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((sub) => {
          finalize(sub.total);
          const items = Array.from(sub.items.values())
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((it) => {
              finalize(it);
              return it;
            });
          return { ...sub, items };
        });
      return { ...g, subs };
    });

  return { groups: sortedGroups, grandTotal };
}

function abbreviateLine(name) {
  let line = String(name || 'Other').toUpperCase()
    .replace('ASSEMBLY ', 'ASSY.')
    .replace('INJECTION ', 'INJ.')
    .replace('ROBOT', 'RBT.')
    .replace('PAINTING', 'PNT.')
    .replace('MAINTENANCE', 'MAINT.')
    .replace('WAREHOUSE', 'W/H')
    .trim();
  if (line === 'OTHER') line = 'Other';
  return line;
}

export default function ManpowerOverviewTab({
  date,
  hcGroup,
  structure,
  canEdit,
  isAdmin = false,
  isOnline = true,
  refreshSignal,
  onDrillLine,
  onOpenMaster,
  onMutated,
}) {
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
  const [chartView, setChartView] = useState('daily'); // 'daily' | 'trend'
  const [trendDays, setTrendDays] = useState(7);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const exportMenuRef = useRef(null);

  // Accordion expand state for 3-level matrix
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());

  // Rich Filterable Detail Modal (parity with legacy openDetailModal)
  const [detailModal, setDetailModal] = useState({
    open: false,
    line: '',
    shift: '',
    empType: 'ALL',
    status: 'ALL',
    title: 'รายละเอียดกำลังคน',
  });

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

  useEffect(() => {
    const onDocClick = (e) => {
      if (exportMenuRef.current && !exportMenuRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const startRange = offsetIsoDate(date, -(trendDays - 1));
      const [sumRes, trRes] = await Promise.all([
        manpowerOpsApi.readSummary({
          date,
          hcGroup,
          use_new_formula: useNewFormula ? '1' : '0',
        }),
        manpowerOpsApi.readTrend({
          startDate: startRange,
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
  }, [date, hcGroup, useNewFormula, trendDays, showToast]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview, refreshSignal]);

  // Reset expanded accordions when switching grouping mode
  useEffect(() => {
    setExpandedKeys(new Set());
  }, [viewMode]);

  const { groups: matrixGroups, grandTotal } = useMemo(
    () => buildHierarchicalMatrix(summaryRows, viewMode),
    [summaryRows, viewMode]
  );

  // Daily Bar Chart grouped by Line (with green/amber/red fill based on attendance rate)
  const dailyBarData = useMemo(() => {
    const map = new Map();
    for (const r of summaryRows) {
      const originalLine = r.display_section || 'Other';
      const shortLine = abbreviateLine(originalLine);
      if (!map.has(shortLine)) {
        map.set(shortLine, { line: shortLine, originalLine, plan: 0, actual: 0 });
      }
      const entry = map.get(shortLine);
      entry.plan += Number(r.Total_Registered || 0);
      entry.actual += Number(r.Count_Actual ?? (Number(r.Count_Present || 0) + Number(r.Count_Late || 0)));
    }
    return Array.from(map.values()).map((it) => {
      const rate = it.plan > 0 ? (it.actual / it.plan) * 100 : 0;
      let fill = '#f59e0b';
      if (rate >= 95) fill = '#10b981';
      else if (rate < 90) fill = '#ef4444';
      return { ...it, rate: Number(rate.toFixed(1)), actualFill: fill };
    });
  }, [summaryRows]);

  const pieData = useMemo(() => {
    const counts = {
      present: Number(kpis.count_present || 0),
      late: Number(kpis.count_late || 0),
      absent: Number(kpis.count_absent || 0),
      leave: Number(kpis.count_leave || 0),
      waiting: Math.max(0, Number(kpis.total_registered || 0) - (
        Number(kpis.count_present || 0) + Number(kpis.count_late || 0)
        + Number(kpis.count_absent || 0) + Number(kpis.count_leave || 0)
      )),
    };
    return PIE_SPECS
      .map((s) => ({ ...s, value: counts[s.key] || 0 }))
      .filter((x) => x.value > 0);
  }, [kpis]);

  const openDetailModal = ({ line = '', shift = '', empType = 'ALL', status = 'ALL', label = '' }) => {
    let title = label || (line || 'รายละเอียดทั้งหมด');
    if (shift && !title.includes('กะ')) {
      title += ` (${shift === '1' ? 'กะเช้า' : shift === '2' ? 'กะดึก' : shift})`;
    }
    if (empType && empType !== 'ALL' && !title.includes(empType)) {
      title += ` [${empType}]`;
    }
    if (status && status !== 'ALL') {
      title += ` — ${status}`;
    }
    setDetailModal({ open: true, line, shift, empType, status, title });
  };

  const toggleExpand = (id) => {
    setExpandedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpandAll = () => {
    if (expandedKeys.size > 0) {
      setExpandedKeys(new Set());
      return;
    }
    const allIds = new Set();
    for (const g of matrixGroups) {
      allIds.add(g.id);
      for (const s of g.subs) {
        allIds.add(s.id);
      }
    }
    setExpandedKeys(allIds);
  };

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

  const handleExportSummaryExcel = () => {
    setExportMenuOpen(false);
    if (!matrixGroups.length) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก Excel', 'warning');
      return;
    }
    const exportData = [];
    for (const g of matrixGroups) {
      exportData.push({
        Level: '1-Group',
        'Group / Line': g.name,
        HC: g.total.hc,
        Present: g.total.present,
        Late: g.total.late,
        Absent: g.total.absent,
        Leave: g.total.leave,
        Actual: g.total.actual,
        Diff: g.total.diff,
        'OT Hours': Number(g.total.ot_hours.toFixed(1)),
        'DL Cost (THB)': Number(g.total.dl.toFixed(2)),
        'OT Cost (THB)': Number(g.total.ot.toFixed(2)),
        'Total Cost (THB)': Number(g.total.dlot.toFixed(2)),
      });
      for (const s of g.subs) {
        exportData.push({
          Level: '2-Sub',
          'Group / Line': `  ↳ ${s.name}`,
          HC: s.total.hc,
          Present: s.total.present,
          Late: s.total.late,
          Absent: s.total.absent,
          Leave: s.total.leave,
          Actual: s.total.actual,
          Diff: s.total.diff,
          'OT Hours': Number(s.total.ot_hours.toFixed(1)),
          'DL Cost (THB)': Number(s.total.dl.toFixed(2)),
          'OT Cost (THB)': Number(s.total.ot.toFixed(2)),
          'Total Cost (THB)': Number(s.total.dlot.toFixed(2)),
        });
      }
    }
    exportRowsToExcel(exportData, `Manpower_${viewMode}`, `Manpower_Summary_${date}_${viewMode}.xlsx`);
    showToast('ส่งออกไฟล์ Excel สำเร็จ', 'success');
  };

  const handleExportDailyRaw = async () => {
    setExportMenuOpen(false);
    try {
      const res = await manpowerOpsApi.readDaily({ date, hcGroup });
      const raw = Array.isArray(res?.data) ? res.data : [];
      if (!raw.length) {
        showToast('ไม่มีข้อมูลลงเวลารายบุคคลในวันที่เลือก', 'warning');
        return;
      }
      const rows = raw.map((r) => ({
        Date: r.log_date || date,
        'Emp ID': r.emp_id,
        Name: r.name_th,
        Position: r.position,
        Line: r.line,
        Team: r.team_group || '-',
        'HC Group': r.hc_group,
        Shift: r.shift_name,
        Status: r.status,
        'Scan In': r.scan_in_time || '-',
        'Scan Out': r.scan_out_time || '-',
        'OT Hours': Number(r.ot_hours || 0),
        'DL Cost (THB)': Number(r.normal_cost || 0),
        'OT Cost (THB)': Number(r.ot_cost || 0),
        Verified: Number(r.is_verified) === 1 ? 'Yes' : 'No',
        Remark: r.remark || '',
      }));
      exportRowsToExcel(rows, 'Daily_Raw', `Manpower_Daily_Raw_${date}.xlsx`);
      showToast(`ส่งออกข้อมูลลงเวลาดิบ ${rows.length} รายการสำเร็จ`, 'success');
    } catch (err) {
      showToast(err.message || 'ส่งออกข้อมูลลงเวลาดิบไม่สำเร็จ', 'error');
    }
  };

  const handleExportTrendMultiSheet = async () => {
    setExportMenuOpen(false);
    try {
      const startDate = offsetIsoDate(date, -(trendDays - 1));
      const res = await manpowerOpsApi.exportHistory({ startDate, endDate: date });
      const raw = Array.isArray(res?.data) ? res.data : [];
      if (raw.length > 0) {
        exportMultiSheetTrendExcel(raw, `Manpower_Trend_Report_${trendDays}d_${date}.xlsx`);
        showToast(`ส่งออกรายงานแนวโน้ม ${trendDays} วัน (Multi-Sheet) สำเร็จ`, 'success');
        return;
      }
      if (trendRows.length) {
        exportRowsToExcel(trendRows, `Trend_${trendDays}d`, `Manpower_Trend_${trendDays}d_${date}.xlsx`);
        showToast('ส่งออกกราฟแนวโน้มสำเร็จ', 'success');
      } else {
        showToast('ไม่มีข้อมูลแนวโน้มในช่วงเวลาที่เลือก', 'warning');
      }
    } catch (err) {
      showToast(err.message || 'ส่งออกข้อมูลแนวโน้มไม่สำเร็จ', 'error');
    }
  };

  const attendancePct = kpis.total_registered > 0
    ? ((kpis.actual_present / kpis.total_registered) * 100).toFixed(1)
    : '0.0';

  const isPaymentMode = viewMode === 'PAYMENT' || viewMode === 'PAYMENT_LINE';

  const compareTotals = useMemo(() => {
    return costCompareRows.reduce((acc, row) => {
      acc.old += Number(row.old_total || 0);
      acc.newTotal += Number(row.new_total || 0);
      acc.diff += Number(row.diff_amount || 0);
      return acc;
    }, { old: 0, newTotal: 0, diff: 0 });
  }, [costCompareRows]);

  const renderMetricCells = (stats, meta, rowLabel) => {
    const clickCell = (status) => (e) => {
      e.stopPropagation();
      openDetailModal({
        line: meta?.line || '',
        shift: meta?.shift || '',
        empType: meta?.empType || 'ALL',
        status,
        label: rowLabel,
      });
    };

    const payableCount = Number(stats.present || 0) + Number(stats.late || 0) + Number(stats.leave || 0);

    if (isPaymentMode) {
      return (
        <>
          <td onClick={clickCell('ALL')} className="cursor-pointer px-2.5 py-2 text-center font-mono text-indigo-600 hover:underline dark:text-indigo-400">
            {stats.hc || '-'}
          </td>
          <td onClick={clickCell('PRESENT')} className="cursor-pointer px-2.5 py-2 text-center font-mono text-emerald-600 hover:underline dark:text-emerald-400">
            {stats.present || '-'}
          </td>
          <td onClick={clickCell('LATE')} className="cursor-pointer px-2.5 py-2 text-center font-mono text-amber-600 hover:underline dark:text-amber-400">
            {stats.late || '-'}
          </td>
          <td onClick={clickCell('ABSENT')} className="cursor-pointer px-2.5 py-2 text-center font-mono text-rose-600 hover:underline dark:text-rose-400">
            {stats.absent || '-'}
          </td>
          <td onClick={clickCell('LEAVE')} className="cursor-pointer px-2.5 py-2 text-center font-mono text-sky-600 hover:underline dark:text-sky-400">
            {stats.leave || '-'}
          </td>
          <td onClick={clickCell('PRESENT_AND_LATE')} className="cursor-pointer px-2.5 py-2 text-center font-mono font-bold bg-slate-50/70 dark:bg-slate-900/40 hover:underline">
            {formatNumber(stats.actual)}
          </td>
          <td onClick={clickCell('ALL')} className="cursor-pointer px-2.5 py-2 text-center font-mono font-bold text-indigo-700 dark:text-indigo-300 hover:underline" title="ยอดที่ต้องจ่ายเงิน (มา + ลา)">
            {payableCount > 0 ? payableCount : '-'}
          </td>
          <td onClick={clickCell('ALL')} className="cursor-pointer px-3 py-2 text-right font-mono hover:bg-indigo-50/50 dark:hover:bg-indigo-950/30">
            <div className="font-bold text-indigo-700 dark:text-indigo-300">฿{formatMoney(stats.dl)}</div>
            <div className="text-[10px] text-slate-400">{stats.dl_count || '-'} คน</div>
          </td>
          <td onClick={clickCell('ALL')} className="cursor-pointer px-3 py-2 text-right font-mono hover:bg-rose-50/50 dark:hover:bg-rose-950/30">
            <div className="font-bold text-rose-600 dark:text-rose-400">฿{formatMoney(stats.ot)}</div>
            <div className="text-[10px] text-slate-400">{stats.ot_count || 0} คน · {formatNumber(stats.ot_hours, 1)} ชม.</div>
          </td>
          <td onClick={clickCell('ALL')} className="cursor-pointer px-3 py-2 text-right font-mono font-extrabold text-slate-900 bg-slate-50/70 dark:bg-slate-900/40 dark:text-white">
            ฿{formatMoney(stats.dlot)}
          </td>
        </>
      );
    }

    const diffCls = stats.diff < 0
      ? 'text-rose-600 font-bold'
      : stats.diff > 0
        ? 'text-amber-600 font-bold'
        : 'text-emerald-600 font-bold';

    return (
      <>
        <td onClick={clickCell('ALL')} className="cursor-pointer px-3 py-2 text-center font-mono text-indigo-600 hover:underline dark:text-indigo-400">
          {stats.hc || '-'}
        </td>
        <td onClick={clickCell('PRESENT')} className="cursor-pointer px-3 py-2 text-center font-mono text-emerald-600 hover:underline dark:text-emerald-400">
          {stats.present || '-'}
        </td>
        <td onClick={clickCell('LATE')} className="cursor-pointer px-3 py-2 text-center font-mono text-amber-600 hover:underline dark:text-amber-400">
          {stats.late || '-'}
        </td>
        <td onClick={clickCell('ABSENT')} className="cursor-pointer px-3 py-2 text-center font-mono text-rose-600 hover:underline dark:text-rose-400">
          {stats.absent || '-'}
        </td>
        <td onClick={clickCell('LEAVE')} className="cursor-pointer px-3 py-2 text-center font-mono text-sky-600 hover:underline dark:text-sky-400">
          {stats.leave || '-'}
        </td>
        <td onClick={clickCell('PRESENT_AND_LATE')} className="cursor-pointer px-3 py-2 text-center font-mono font-bold bg-slate-50/70 dark:bg-slate-900/40 hover:underline">
          {formatNumber(stats.actual)}
        </td>
        <td onClick={clickCell('ALL')} className={`cursor-pointer px-3 py-2 text-center font-mono ${diffCls} hover:underline`}>
          {stats.diff > 0 ? `+${stats.diff}` : stats.diff}
        </td>
        <td onClick={clickCell('ALL')} className="cursor-pointer px-4 py-2 text-right font-mono font-bold text-slate-800 dark:text-white hover:underline">
          ฿{formatMoney(stats.cost)}
        </td>
      </>
    );
  };

  return (
    <div className="space-y-4">
      {/* Calendar Special Day Alert Banner */}
      {dayInfo && dayInfo.day_type && dayInfo.day_type !== 'NORMAL' && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <div>
              <span className="font-bold">[{dayInfo.day_type}] {dayInfo.description || 'วันหยุดพิเศษ / วันอาทิตย์'}</span>
              <span className="ml-2 opacity-85">
                ตัวคูณค่าแรงปกติ ×{Number(dayInfo.work_rate_holiday || 1).toFixed(1)} · ตัวคูณ OT ×{Number(dayInfo.ot_rate_holiday || 1.5).toFixed(1)}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-[11px] font-semibold dark:bg-amber-900/60">
              Active Multiplier
            </span>
            {isAdmin && (
              <Link
                to="/system-settings?tab=holidays"
                className="rounded-lg border border-amber-400 bg-white/80 px-2.5 py-1 text-[11px] font-bold text-amber-900 hover:bg-white dark:bg-slate-900 dark:text-amber-200"
              >
                ตั้งค่าปฏิทิน →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Compact Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setUseNewFormula((v) => !v)}
            className={`min-h-[38px] inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
              useNewFormula
                ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300'
                : 'border-slate-300 bg-slate-50 text-slate-600 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300'
            }`}
            title="สลับสูตรคำนวณต้นทุนค่าแรง V1 (มาตรฐาน) และ V2 (ปรับปรุงใหม่ + แรงจูงใจ)"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            สูตรต้นทุน: {useNewFormula ? 'V2 (Improved)' : 'V1 (Legacy)'}
          </button>
          <span className="hidden sm:inline text-[11px] text-slate-400">
            คลิก KPI, แท่งกราฟ, Pie หรือตัวเลขในตารางเพื่อเจาะดูรายชื่อพนักงานได้ทันที
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={openAnalysisModal}
            className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-violet-600 px-3 text-xs font-semibold text-white shadow-xs hover:opacity-95"
          >
            <Sparkles className="h-3.5 w-3.5" />
            วิเคราะห์ขั้นสูง V1/V2
          </button>

          <div className="relative" ref={exportMenuRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Download className="h-3.5 w-3.5" />
              ส่งออก Excel
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-30 dark:border-slate-700 dark:bg-slate-800">
                <button
                  type="button"
                  onClick={handleExportSummaryExcel}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  สรุปตามสายผลิต / ต้นทุน (Summary)
                </button>
                <button
                  type="button"
                  onClick={handleExportDailyRaw}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  รายชื่อลงเวลาดิบประจำวัน (Daily Raw)
                </button>
                <button
                  type="button"
                  onClick={handleExportTrendMultiSheet}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  รายงานแนวโน้ม {trendDays} วัน (Multi-Sheet)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 6 Clickable KPI Cards (open DetailModal directly!) */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <button
          type="button"
          onClick={() => openDetailModal({ status: 'ALL', label: `กำลังพลทั้งหมดประจำวันที่ ${date}` })}
          className="text-left rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition hover:border-indigo-300 hover:shadow-md dark:border-slate-700 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span>กำลังพลรวม (PLAN)</span>
            <Users className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-1 text-2xl font-bold text-slate-800 dark:text-white">{formatNumber(kpis.total_registered)}</div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400">คลิกดูรายละเอียด →</div>
        </button>

        <button
          type="button"
          onClick={() => openDetailModal({ status: 'PRESENT_AND_LATE', label: `มาทำงาน (ตรงเวลา + สาย)` })}
          className="text-left rounded-xl border border-emerald-200 bg-white p-3 shadow-2xs transition hover:border-emerald-400 hover:shadow-md dark:border-emerald-800/60 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            <span>มาทำงาน (ACTUAL)</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">{formatNumber(kpis.actual_present)}</div>
          <div className="text-[11px] font-medium text-emerald-700 dark:text-emerald-300">Attendance: {attendancePct}%</div>
        </button>

        <button
          type="button"
          onClick={() => openDetailModal({ status: 'LATE', label: `มาสาย (LATE)` })}
          className="text-left rounded-xl border border-amber-200 bg-white p-3 shadow-2xs transition hover:border-amber-400 hover:shadow-md dark:border-amber-800/60 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-amber-600 dark:text-amber-400">
            <span>มาสาย (LATE)</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">{formatNumber(kpis.count_late)}</div>
          <div className="text-[11px] text-slate-500">ตรงเวลา: {formatNumber(kpis.count_present)} คน</div>
        </button>

        <button
          type="button"
          onClick={() => openDetailModal({ status: 'ABSENT', label: `ขาดงาน (ABSENT)` })}
          className="text-left rounded-xl border border-rose-200 bg-white p-3 shadow-2xs transition hover:border-rose-400 hover:shadow-md dark:border-rose-800/60 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-rose-600 dark:text-rose-400">
            <span>ขาดงาน (ABSENT)</span>
            <UserX className="h-4 w-4 text-rose-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-rose-600 dark:text-rose-400">{formatNumber(kpis.count_absent)}</div>
          <div className="text-[11px] text-rose-600">คลิกดูรายชื่อติดตาม →</div>
        </button>

        <button
          type="button"
          onClick={() => openDetailModal({ status: 'LEAVE', label: `ลางาน (LEAVE)` })}
          className="text-left rounded-xl border border-sky-200 bg-white p-3 shadow-2xs transition hover:border-sky-400 hover:shadow-md dark:border-sky-800/60 dark:bg-slate-800"
        >
          <div className="flex items-center justify-between text-xs font-semibold text-sky-600 dark:text-sky-400">
            <span>ลางาน (LEAVE)</span>
            <CalendarOff className="h-4 w-4 text-sky-500" />
          </div>
          <div className="mt-1 text-2xl font-bold text-sky-600 dark:text-sky-400">{formatNumber(kpis.count_leave)}</div>
          <div className="text-[11px] text-slate-500">ป่วย / กิจ / พักร้อน</div>
        </button>

        <div className="rounded-xl border border-indigo-200 bg-white p-3 shadow-2xs dark:border-indigo-800/60 dark:bg-slate-800">
          <div className="flex items-center justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <span>ประมาณการค่าแรง</span>
            <Coins className="h-4 w-4 text-indigo-500" />
          </div>
          <div className="mt-1 text-xl font-bold text-indigo-700 dark:text-indigo-300">฿{formatMoney(kpis.total_cost)}</div>
          <div className="text-[11px] text-slate-500">
            OT {formatNumber(kpis.total_ot_hours, 1)} ชม. ({kpis.count_ot} คน)
          </div>
        </div>
      </div>

      {/* Charts Grid: Daily By-Line Bar (Clickable) / Trend Toggle + Status Pie (Clickable) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
                {chartView === 'daily'
                  ? `เปรียบเทียบกำลังคนรายสายผลิต (Plan vs Actual · ${date})`
                  : `แนวโน้มกำลังคน ${trendDays} วันย้อนหลัง (Attendance Trend)`}
              </h3>
              <p className="text-[11px] text-slate-500">
                {chartView === 'daily'
                  ? 'คลิกที่แท่งกราฟสายผลิตเพื่อเปิดดูรายชื่อพนักงานในสายนั้นทันที (เขียว ≥95%, เหลือง 90–94%, แดง <90%)'
                  : 'ติดตามแนวโน้ม Plan / Actual / Absent / Leave รายวัน'}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {chartView === 'trend' && (
                <>
                  {[7, 14, 30].map((dVal) => (
                    <button
                      key={dVal}
                      type="button"
                      onClick={() => setTrendDays(dVal)}
                      className={`rounded-md px-2 py-1 text-[11px] font-bold transition ${
                        trendDays === dVal
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300'
                      }`}
                    >
                      {dVal} วัน
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleExportTrendMultiSheet}
                    className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                    title="ส่งออก Multi-Sheet Excel"
                  >
                    Excel
                  </button>
                </>
              )}
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
                <button
                  type="button"
                  onClick={() => setChartView('daily')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    chartView === 'daily'
                      ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  รายวัน By Line
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('trend')}
                  className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                    chartView === 'trend'
                      ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'
                  }`}
                >
                  แนวโน้ม Trend
                </button>
              </div>
            </div>
          </div>

          <div className="h-64 w-full min-w-0">
            {chartView === 'daily' ? (
              dailyBarData.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">ไม่มีข้อมูลกราฟรายสายผลิต</div>
              ) : (
                <div className="h-full overflow-x-auto overflow-y-hidden">
                  <div style={{ minWidth: `${Math.max(520, dailyBarData.length * 56)}px`, height: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart
                        data={dailyBarData}
                        margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
                        onClick={(state) => {
                          const clicked = state?.activePayload?.[0]?.payload;
                          if (clicked?.originalLine) {
                            openDetailModal({ line: clicked.originalLine, status: 'ALL', label: clicked.originalLine });
                          }
                        }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="line" tick={{ fontSize: 11, fontWeight: 600 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip formatter={(v, name) => [`${v} คน`, name]} />
                        <Legend wrapperStyle={{ fontSize: '12px' }} />
                        <Bar
                          dataKey="plan"
                          name="Plan (แผน)"
                          fill="#4f46e5"
                          radius={[4, 4, 0, 0]}
                          className="cursor-pointer"
                          onClick={(barData) => {
                            if (barData?.originalLine) {
                              openDetailModal({ line: barData.originalLine, status: 'ALL', label: barData.originalLine });
                            }
                          }}
                        />
                        <Bar
                          dataKey="actual"
                          name="Actual (มาจริง)"
                          radius={[4, 4, 0, 0]}
                          className="cursor-pointer"
                          onClick={(barData) => {
                            if (barData?.originalLine) {
                              openDetailModal({ line: barData.originalLine, status: 'PRESENT_AND_LATE', label: barData.originalLine });
                            }
                          }}
                        >
                          {dailyBarData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.actualFill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )
            ) : (
              trendRows.length === 0 ? (
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
              )
            )}
          </div>
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800 flex flex-col">
          <div className="mb-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">สัดส่วนสถานะพนักงานวันนี้</h3>
            <p className="text-[11px] text-slate-500">คลิกที่ชิ้นกราฟหรือสถานะเพื่อเปิด Modal กรองรายชื่อเฉพาะสถานะ</p>
          </div>
          {pieData.length === 0 ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">ไม่มีข้อมูลสถานะ</div>
          ) : (
            <div className="flex flex-1 flex-col sm:flex-row items-center gap-2 min-h-[16rem]">
              <div className="w-full sm:flex-1 h-56 sm:h-64 min-w-0">
                <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="54%"
                      outerRadius="88%"
                      paddingAngle={3}
                      className="cursor-pointer"
                      onClick={(slice) => {
                        if (slice?.status) {
                          openDetailModal({ status: slice.status, label: `${slice.name} (${date})` });
                        }
                      }}
                    >
                      {pieData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.color} className="cursor-pointer" />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, name) => [`${v} คน`, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-1 gap-1.5 w-full sm:w-44 shrink-0">
                {pieData.map((entry) => {
                  const pct = kpis.total_registered > 0 ? ((entry.value / kpis.total_registered) * 100).toFixed(0) : 0;
                  return (
                    <button
                      key={entry.status}
                      type="button"
                      onClick={() => openDetailModal({ status: entry.status, label: `${entry.name} (${date})` })}
                      className="flex items-center justify-between gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50/70 px-2.5 py-1.5 text-left text-[11px] font-semibold text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/40 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                    >
                      <span className="flex items-center gap-1.5 min-w-0">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                        <span className="truncate">{entry.name}</span>
                      </span>
                      <span className="font-mono font-bold shrink-0">
                        {entry.value} <span className="text-[10px] font-normal text-slate-400">({pct}%)</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Legacy 3-Level Hierarchical Expandable Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-500" />
              ตารางสรุปกำลังคนและต้นทุนค่าแรง — {VIEW_MODES.find((m) => m.id === viewMode)?.label}
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              คลิกหัวแถว (▸) เพื่อเจาะดูชั้นย่อย 3 ระดับ (กลุ่ม/ไลน์ → กะ/ทีม → ตำแหน่ง) · คลิกตัวเลขในตารางเพื่อเปิด Modal เฉพาะส่วนนั้น
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex flex-wrap rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
              {VIEW_MODES.map((m) => {
                const active = viewMode === m.id;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setViewMode(m.id)}
                    className={`min-h-[32px] rounded-md px-2.5 text-[11px] font-bold transition ${
                      active
                        ? 'bg-white text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300'
                        : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                    }`}
                  >
                    {m.shortLabel}
                  </button>
                );
              })}
            </div>
            {matrixGroups.length > 0 && (
              <button
                type="button"
                onClick={toggleExpandAll}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              >
                <ChevronsUpDown className="h-3.5 w-3.5" />
                {expandedKeys.size > 0 ? 'ยุบทุกชั้น' : 'ขยายทุกชั้น'}
              </button>
            )}
            {loading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />}
          </div>
        </div>

        <div className="overflow-x-auto max-h-[600px]">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 text-[11px] font-bold uppercase text-slate-700 dark:bg-slate-900 dark:text-slate-300">
              {isPaymentMode ? (
                <tr>
                  <th className="px-4 py-3">{viewMode === 'PAYMENT' ? 'Payment / Category / Line' : 'Group / Line / Shift / Rate'}</th>
                  <th className="px-2.5 py-3 text-center">HC</th>
                  <th className="px-2.5 py-3 text-center text-emerald-600">Present</th>
                  <th className="px-2.5 py-3 text-center text-amber-600">Late</th>
                  <th className="px-2.5 py-3 text-center text-rose-600">Absent</th>
                  <th className="px-2.5 py-3 text-center text-sky-600">Leave</th>
                  <th className="px-2.5 py-3 text-center bg-slate-200/70 dark:bg-slate-800">Actual</th>
                  <th className="px-2.5 py-3 text-center text-indigo-600">Payable (จ่าย)</th>
                  <th className="px-3 py-3 text-right text-indigo-600">DL (ปกติ)</th>
                  <th className="px-3 py-3 text-right text-rose-600">OT (ล่วงเวลา)</th>
                  <th className="px-3 py-3 text-right">Total (รวม)</th>
                </tr>
              ) : (
                <tr>
                  <th className="px-4 py-3">Group / Line / Shift / Category</th>
                  <th className="px-3 py-3 text-center">HC</th>
                  <th className="px-3 py-3 text-center text-emerald-600">Present</th>
                  <th className="px-3 py-3 text-center text-amber-600">Late</th>
                  <th className="px-3 py-3 text-center text-rose-600">Absent</th>
                  <th className="px-3 py-3 text-center text-sky-600">Leave</th>
                  <th className="px-3 py-3 text-center bg-slate-200/70 dark:bg-slate-800">Actual</th>
                  <th className="px-3 py-3 text-center">Diff</th>
                  <th className="px-4 py-3 text-right">Cost (฿)</th>
                </tr>
              )}
            </thead>

            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
              {loading && matrixGroups.length === 0 ? (
                <tr>
                  <td colSpan={isPaymentMode ? 11 : 9} className="px-4 py-12 text-center text-slate-400">
                    กำลังโหลดและคำนวณตารางกำลังคน...
                  </td>
                </tr>
              ) : matrixGroups.length === 0 ? (
                <tr>
                  <td colSpan={isPaymentMode ? 11 : 9} className="px-4 py-12 text-center text-slate-400">
                    ไม่พบข้อมูลสรุปกำลังคนสำหรับวันที่ {date}
                  </td>
                </tr>
              ) : (
                <>
                  {/* Pinned GRAND TOTAL Top Row */}
                  <tr className="bg-slate-800 text-white font-bold dark:bg-slate-950">
                    <td
                      onClick={() => openDetailModal({ status: 'ALL', label: `ภาพรวมทั้งหมด (GRAND TOTAL · ${date})` })}
                      className="cursor-pointer px-4 py-2.5 hover:underline"
                    >
                      GRAND TOTAL ({matrixGroups.length} กลุ่มหลัก)
                    </td>
                    {renderMetricCells(grandTotal, { line: '', shift: '', empType: 'ALL' }, 'GRAND TOTAL')}
                  </tr>

                  {/* Level 1 Parent Groups */}
                  {matrixGroups.map((g) => {
                    const pOpen = expandedKeys.has(g.id);
                    return (
                      <React.Fragment key={g.id}>
                        <tr
                          onClick={() => toggleExpand(g.id)}
                          className="cursor-pointer bg-slate-100/80 font-bold text-slate-900 hover:bg-slate-200/70 dark:bg-slate-800/90 dark:text-white dark:hover:bg-slate-700/70"
                        >
                          <td className="px-4 py-2.5">
                            <div className="flex items-center gap-2">
                              {pOpen ? <ChevronDown className="h-4 w-4 text-indigo-500 shrink-0" /> : <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />}
                              <span className="truncate">{g.name}</span>
                              <span className="text-[10px] font-normal text-slate-400">({g.subs.length})</span>
                            </div>
                          </td>
                          {renderMetricCells(g.total, g.meta, g.name)}
                        </tr>

                        {/* Level 2 Sub-Groups */}
                        {pOpen && g.subs.map((sub) => {
                          const sOpen = expandedKeys.has(sub.id);
                          return (
                            <React.Fragment key={sub.id}>
                              <tr
                                onClick={() => toggleExpand(sub.id)}
                                className="cursor-pointer bg-slate-50/70 font-semibold text-slate-700 hover:bg-indigo-50/40 dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-800/70"
                              >
                                <td className="px-4 py-2 pl-9 border-l-4 border-indigo-200 dark:border-indigo-900">
                                  <div className="flex items-center gap-1.5">
                                    {sOpen ? <ChevronDown className="h-3.5 w-3.5 text-indigo-500 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                                    <span className="truncate">{sub.name}</span>
                                    <span className="text-[10px] font-normal text-slate-400">({sub.items.length})</span>
                                  </div>
                                </td>
                                {renderMetricCells(sub.total, sub.meta, `${g.name} · ${sub.name}`)}
                              </tr>

                              {/* Level 3 Grandchild Leaves */}
                              {sOpen && sub.items.map((item) => (
                                <tr
                                  key={item.id}
                                  className="bg-white text-slate-600 hover:bg-indigo-50/30 dark:bg-slate-900/20 dark:text-slate-300 dark:hover:bg-slate-800/50"
                                >
                                  <td className="px-4 py-1.5 pl-16">
                                    <button
                                      type="button"
                                      onClick={() => openDetailModal({
                                        line: item.meta.line,
                                        shift: item.meta.shift,
                                        empType: item.meta.empType,
                                        status: 'ALL',
                                        label: `${g.name} · ${sub.name} · ${item.name}`,
                                      })}
                                      className="text-left text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                                    >
                                      • {item.name}
                                    </button>
                                  </td>
                                  {renderMetricCells(item, item.meta, `${g.name} · ${sub.name} · ${item.name}`)}
                                </tr>
                              ))}
                            </React.Fragment>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Legacy-Parity Interactive Detail Modal */}
      <ManpowerDetailModal
        open={detailModal.open}
        onClose={() => setDetailModal((m) => ({ ...m, open: false }))}
        date={date}
        hcGroup={hcGroup}
        structure={structure}
        canEdit={canEdit}
        isOnline={isOnline}
        filter={{
          line: detailModal.line,
          shift: detailModal.shift,
          empType: detailModal.empType,
          status: detailModal.status,
          title: detailModal.title,
        }}
        onMutated={() => {
          fetchOverview();
          onMutated?.();
        }}
        onOpenMaster={onOpenMaster}
        onOpenAttendanceTab={onDrillLine}
      />

      {/* Integrated Analysis Modal */}
      {analysisOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-700">
              <div>
                <h3 className="text-base font-bold text-slate-800 dark:text-white">
                  Integrated Manpower Analytics &amp; Cost Formula Impact (V1 vs V2)
                </h3>
                <p className="text-xs text-slate-500">วิเคราะห์แนวโน้มเชิงลึก อัตราการคงอยู่ การใช้แรงงาน และผลต่างสูตรคำนวณค่าแรง</p>
              </div>
              <button
                type="button"
                onClick={() => setAnalysisOpen(false)}
                className="min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                  className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500">ถึง</span>
                <input
                  type="date"
                  value={analysisRange.endDate}
                  onChange={(e) => setAnalysisRange((r) => ({ ...r, endDate: e.target.value }))}
                  className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleLoadAnalysis()}
                  disabled={analysisLoading}
                  className="min-h-[38px] rounded-lg bg-indigo-600 px-3.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
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

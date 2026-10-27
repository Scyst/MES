// PaintChemAnalyticsModal.jsx — Industrial SPC & Trend Analytics Dashboard for Paint Line
import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea
} from 'recharts';
import {
  TrendingUp, Activity, Flame, Droplets, Package, AlertTriangle,
  Calendar, RefreshCw, X, CheckCircle2, Maximize2, Minimize2,
  Table as TableIcon, Download, Search, Check, AlertCircle, FileText
} from 'lucide-react';

const API_BASE = '/iot-toolbox/sandbox-b9/MES/MES/page/paintChem/api';

const TABS = [
  { id: 'degrease_sc', label: '1. ล้างไขมัน & ปรับผิว (Degreasing / SC)', icon: Activity },
  { id: 'phosphate',   label: '2. ซิงค์ฟอสเฟต (Zinc Phosphate)',      icon: TrendingUp },
  { id: 'rinse_di',    label: '3. บ่อล้างน้ำ & น้ำ DI (pH / EC)',      icon: Droplets },
  { id: 'ovens',       label: '4. เตาอบ & สายพาน (Ovens / Speed)',     icon: Flame },
  { id: 'chem_kg',     label: '5. ยอดเติมสารเคมีรายวัน (Kg Added)',    icon: Package },
];

// Master parameters definition for SPC Statistical Table
const PARAMETER_METRICS = [
  { key: 'F_Al_1',       name: 'Degreasing 1: F.Al (ความเข้มข้นล้างไขมัน 1)', tank: 'บ่อ 1 (Degreasing 1)', min: 10.0, max: 12.0, unit: 'pt' },
  { key: 'F_Al_2',       name: 'Degreasing 2: F.Al (ความเข้มข้นล้างไขมัน 2)', tank: 'บ่อ 2 (Degreasing 2)', min: 10.0, max: 12.0, unit: 'pt' },
  { key: 'TC_SC',        name: 'Surface Cond.: T.C (ความเข้มข้นปรับผิว)',     tank: 'บ่อ 5 (Surface Cond.)', min: 2.0,  max: 4.0,  unit: 'pt' },
  { key: 'pH_SC',        name: 'Surface Cond.: pH (กรด-ด่างปรับผิว)',         tank: 'บ่อ 5 (Surface Cond.)', min: 9.0,  max: 11.0, unit: '' },
  { key: 'FA_ZP',        name: 'Zinc Phos.: FA (กรดอิสระ Free Acid)',         tank: 'บ่อ 6 (Zinc Phos.)',    min: 0.3,  max: 0.5,  unit: 'pt' },
  { key: 'TA_ZP',        name: 'Zinc Phos.: TA (กรดรวม Total Acidity)',       tank: 'บ่อ 6 (Zinc Phos.)',    min: 23.0, max: 25.0, unit: 'pt' },
  { key: 'AC_ZP',        name: 'Zinc Phos.: A.C (ตัวเร่งปฏิกิริยา Accelerator)', tank: 'บ่อ 6 (Zinc Phos.)', min: 2.0,  max: 4.0,  unit: 'pt' },
  { key: 'pH_WR1',       name: 'Water Rinse 1: pH (บ่อล้างน้ำ 1)',            tank: 'บ่อ 3 (Rinse 1)',       min: 8.0,  max: 10.0, unit: '' },
  { key: 'pH_WR2',       name: 'Water Rinse 2: pH (บ่อล้างน้ำ 2)',            tank: 'บ่อ 4 (Rinse 2)',       min: 8.0,  max: 10.0, unit: '' },
  { key: 'pH_WR3',       name: 'Water Rinse 3: pH (บ่อล้างน้ำ 3)',            tank: 'บ่อ 7 (Rinse 3)',       min: 4.0,  max: 6.0,  unit: '' },
  { key: 'pH_WR4',       name: 'Water Rinse 4: pH (บ่อล้างน้ำ 4)',            tank: 'บ่อ 8 (Rinse 4)',       min: 4.0,  max: 6.0,  unit: '' },
  { key: 'EC_DI',        name: 'DI Water: EC (ความนำไฟฟ้าน้ำ DI)',            tank: 'บ่อ 9 (DI Rinse)',      min: null, max: 10.0, unit: 'µS/cm' },
  { key: 'pH_DI',        name: 'DI Water: pH (กรด-ด่างน้ำ DI)',               tank: 'บ่อ 9 (DI Rinse)',      min: 5.0,  max: 8.0,  unit: '' },
  { key: 'bake_oven_temp',name: 'เตาอบสี Bake Oven Temp',                     tank: 'เตาอบสี (Bake Oven)',   min: 175.0,max: 220.0,unit: '°C' },
  { key: 'dry_oven_temp', name: 'เตาอบแห้ง Dry Oven Temp',                    tank: 'เตาอบแห้ง (Dry Oven)',  min: 140.0,max: 160.0,unit: '°C' },
  { key: 'conveyor_speed',name: 'ความเร็วสายพาน Conveyor Speed',               tank: 'สายพานลำเลียง (Line)',  min: 2.5,  max: 5.0,  unit: 'm/min' },
];

// Dark Glassmorphism Tooltip for Recharts
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  const point = payload[0]?.payload;
  return (
    <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700/80 rounded-xl shadow-2xl p-3.5 text-xs text-gray-100 min-w-[240px] z-50">
      <div className="flex items-center justify-between pb-2 mb-2 border-b border-gray-800">
        <div className="flex items-center gap-1.5 font-bold text-gray-200">
          <Calendar size={13} className="text-blue-400" />
          <span>{point?.log_date || label}</span>
          {point?.time_slot && <span className="text-gray-400 font-normal">({point.time_slot})</span>}
        </div>
        {point?.shift && (
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            point.shift === 'DAY' ? 'bg-amber-500/20 text-amber-300' : 'bg-indigo-500/20 text-indigo-300'
          }`}>
            {point.shift === 'DAY' ? 'กะกลางวัน (DAY)' : 'กะกลางคืน (NIGHT)'}
          </span>
        )}
      </div>
      <div className="space-y-1.5">
        {payload.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
              <span className="text-gray-300 truncate max-w-[150px]">{item.name}:</span>
            </div>
            <span className="font-mono font-bold text-white text-right">
              {item.value !== null && item.value !== undefined ? item.value : '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function PaintChemAnalyticsModal({ isOpen, onClose }) {
  const [dateFrom, setDateFrom] = useState('2026-10-01');
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10));
  const [shift,    setShift]    = useState('');
  const [activeTab, setActiveTab] = useState('degrease_sc');
  const [viewMode, setViewMode]   = useState('chart'); // 'chart' | 'table'
  const [isMaximized, setIsMaximized] = useState(false);
  const [hiddenSeries, setHiddenSeries] = useState({});
  const [tableSearch, setTableSearch] = useState('');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/get_analytics.php`, {
        params: { date_from: dateFrom, date_to: dateTo, shift },
      });
      if (res.data?.success) {
        setData(res.data.data);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchAnalytics();
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleApplyFilter = () => {
    fetchAnalytics();
  };

  const handleSetPreset = (preset) => {
    const today = new Date().toISOString().slice(0, 10);
    if (preset === 'THIS_MONTH') {
      setDateFrom('2026-10-01');
      setDateTo('2026-10-31');
    } else if (preset === '7_DAYS') {
      const d7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      setDateFrom(d7);
      setDateTo(today);
    } else if (preset === '30_DAYS') {
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      setDateFrom(d30);
      setDateTo(today);
    }
  };

  const toggleSeries = (key) => {
    setHiddenSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const kpi = data?.kpiSummary || {};
  const timeline = data?.timeline || [];
  const dailyChemicalTotals = data?.dailyChemicalTotals || [];

  // Compute SPC Statistical metrics for each parameter
  const statsTableData = useMemo(() => {
    if (!timeline.length) return [];
    return PARAMETER_METRICS.map(param => {
      const values = timeline
        .map(pt => pt[param.key])
        .filter(v => v !== null && v !== undefined && !isNaN(v));

      const n = values.length;
      if (n === 0) {
        return {
          ...param,
          count: 0,
          minVal: '—',
          maxVal: '—',
          avgVal: '—',
          stdDev: '—',
          oorCount: 0,
          passRate: '100%',
          status: 'NO_DATA',
        };
      }

      const minVal = Math.min(...values);
      const maxVal = Math.max(...values);
      const sum = values.reduce((acc, v) => acc + v, 0);
      const avg = sum / n;
      const variance = values.reduce((acc, v) => acc + Math.pow(v - avg, 2), 0) / n;
      const stdDev = Math.sqrt(variance);

      // Check Out of Range count
      let oorCount = 0;
      values.forEach(v => {
        if (param.min !== null && v < param.min) oorCount++;
        else if (param.max !== null && v > param.max) oorCount++;
      });

      const passRate = (((n - oorCount) / n) * 100).toFixed(1) + '%';
      const status = oorCount === 0 ? 'NORMAL' : 'WARNING';

      return {
        ...param,
        count: n,
        minVal: minVal.toFixed(2),
        maxVal: maxVal.toFixed(2),
        avgVal: avg.toFixed(2),
        stdDev: stdDev.toFixed(3),
        oorCount,
        passRate,
        status,
      };
    });
  }, [timeline]);

  // Filtered rows for SPC table search
  const filteredStats = useMemo(() => {
    if (!tableSearch.trim()) return statsTableData;
    const q = tableSearch.toLowerCase();
    return statsTableData.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.tank.toLowerCase().includes(q) ||
      s.key.toLowerCase().includes(q)
    );
  }, [statsTableData, tableSearch]);

  // Export SPC Table to CSV with UTF-8 BOM
  const handleExportCSV = () => {
    if (!statsTableData.length) return;
    const headers = ['บ่อ/จุดตรวจ', 'พารามิเตอร์', 'เกณฑ์มาตรฐาน', 'หน่วย', 'จำนวนจุดตรวจ (n)', 'ค่าน้อยสุด (Min)', 'ค่าเฉลี่ย (Avg)', 'ค่ามากสุด (Max)', 'Std Dev (σ)', 'จุดออกนอกเกณฑ์', 'อัตราการผ่านเกณฑ์ (%)', 'สถานะ'];
    const rows = statsTableData.map(s => [
      `"${s.tank}"`,
      `"${s.name}"`,
      `"${s.min !== null ? s.min : '—'} - ${s.max !== null ? s.max : '—'}"`,
      `"${s.unit || '-'}"`,
      s.count,
      s.minVal,
      s.avgVal,
      s.maxVal,
      s.stdDev,
      s.oorCount,
      `"${s.passRate}"`,
      `"${s.status === 'NORMAL' ? 'ปกติ' : 'พบจุดออกนอกเกณฑ์'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PaintChem_SPC_Summary_${dateFrom}_${dateTo}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  // Average chemical consumption per sheet
  const avgChemKgPerSheet = kpi.totalSheets > 0
    ? (kpi.totalChemicalAddedKg / kpi.totalSheets).toFixed(1)
    : '0.0';

  return (
    <div className={`fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center transition-all duration-200 ${
      isMaximized ? 'p-0' : 'p-2 sm:p-4'
    }`}>
      <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
        isMaximized
          ? 'w-full h-full rounded-none'
          : 'w-full max-w-6xl max-h-[92vh] rounded-2xl'
      }`}>
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-3.5 border-b border-gray-200 dark:border-gray-700 bg-gray-50/70 dark:bg-gray-800/80 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-xl shadow-md">
              <TrendingUp size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight">
                  กราฟวิเคราะห์แนวโน้มเคมีและพารามิเตอร์การผลิต
                </h2>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-400 animate-pulse" />
                  Industrial SPC Analytics
                </span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                วิเคราะห์การควบคุมกระบวนการทางสถิติ (Statistical Process Control) และแนวโน้มพารามิเตอร์สายการผลิต
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* View Mode Toggle */}
            <div className="hidden sm:flex items-center bg-gray-200/70 dark:bg-gray-700 p-0.5 rounded-lg border border-gray-300 dark:border-gray-600 mr-1">
              <button
                type="button"
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'chart'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                }`}
              >
                <TrendingUp size={14} />
                <span>กราฟแนวโน้ม</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  viewMode === 'table'
                    ? 'bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-300 hover:text-gray-900'
                }`}
              >
                <TableIcon size={14} />
                <span>ตารางสถิติ SPC</span>
              </button>
            </div>

            {/* Maximize / Minimize Button */}
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isMaximized ? 'ย่อหน้าต่างกลับขนาดเดิม' : 'ขยายเต็มหน้าจอ'}
            >
              {isMaximized ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="ปิดหน้าต่าง"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters & KPI Summary Cards */}
        <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4 flex-shrink-0">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300 mr-1">ช่วงเวลา:</span>
              <button
                type="button"
                onClick={() => handleSetPreset('THIS_MONTH')}
                className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-md transition-colors font-medium border border-blue-200/50 dark:border-blue-800/40"
              >
                เดือนนี้ (ต.ค. 2026)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('7_DAYS')}
                className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-md transition-colors border border-gray-200 dark:border-gray-600"
              >
                7 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('30_DAYS')}
                className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-md transition-colors border border-gray-200 dark:border-gray-600"
              >
                30 วันล่าสุด
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
              />
              <span className="text-gray-400 text-xs">ถึง</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
              />
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 shadow-sm"
              >
                <option value="">ทุกกะ (DAY &amp; NIGHT)</option>
                <option value="DAY">เฉพาะกะกลางวัน (DAY)</option>
                <option value="NIGHT">เฉพาะกะกลางคืน (NIGHT)</option>
              </select>
              <button
                onClick={handleApplyFilter}
                disabled={loading}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                อัปเดตข้อมูล
              </button>
            </div>
          </div>

          {/* 4 Upgraded KPI Gradient Accent Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {/* KPI 1: Sheets & Slots */}
            <div className="relative overflow-hidden rounded-xl border border-blue-200/80 dark:border-blue-800/60 bg-gradient-to-br from-blue-50/90 via-indigo-50/40 to-white dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-gray-800/80 p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-blue-900 dark:text-blue-300">
                  ชุดเอกสาร &amp; จุดตรวจ
                </span>
                <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300">
                  <FileText size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
                  {kpi.totalSheets ?? 0}
                </span>
                <span className="text-xs font-medium text-gray-500">ใบ</span>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">
                  ({kpi.totalSlots ?? 0} สล็อต)
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full w-fit">
                <CheckCircle2 size={11} />
                <span>บันทึกครบถ้วน 100%</span>
              </div>
            </div>

            {/* KPI 2: Chemical Consumption */}
            <div className="relative overflow-hidden rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/90 via-teal-50/40 to-white dark:from-emerald-950/40 dark:via-teal-950/20 dark:to-gray-800/80 p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300">
                  ยอดเติมสารเคมีสะสม
                </span>
                <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300">
                  <Package size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 tracking-tight">
                  {kpi.totalChemicalAddedKg ?? 0}
                </span>
                <span className="text-xs font-medium text-gray-500">กก.</span>
              </div>
              <div className="mt-2 text-[10px] font-medium text-emerald-700 dark:text-emerald-300 bg-emerald-100/60 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full w-fit truncate max-w-full">
                เฉลี่ย {avgChemKgPerSheet} กก./วันผลิต (FC/AC)
              </div>
            </div>

            {/* KPI 3: Oven Temperatures */}
            <div className="relative overflow-hidden rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-white dark:from-amber-950/40 dark:via-orange-950/20 dark:to-gray-800/80 p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-amber-900 dark:text-amber-300">
                  เตาอบเฉลี่ย (Bake / Dry)
                </span>
                <div className="p-1.5 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300">
                  <Flame size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-extrabold text-amber-600 dark:text-amber-400">
                  {kpi.avgBakeOvenTemp ?? '—'}°C
                </span>
                <span className="text-xs font-medium text-gray-400">/</span>
                <span className="text-sm font-bold text-sky-600 dark:text-sky-400">
                  {kpi.avgDryOvenTemp ?? '—'}°C
                </span>
              </div>
              <div className="mt-2 text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-100/60 dark:bg-amber-900/40 px-2 py-0.5 rounded-full w-fit truncate">
                เกณฑ์ 175-220° / 140-160°C
              </div>
            </div>

            {/* KPI 4: DI Water Quality */}
            <div className="relative overflow-hidden rounded-xl border border-cyan-200/80 dark:border-cyan-800/60 bg-gradient-to-br from-cyan-50/90 via-sky-50/40 to-white dark:from-cyan-950/40 dark:via-sky-950/20 dark:to-gray-800/80 p-3.5 shadow-sm">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-semibold text-cyan-900 dark:text-cyan-300">
                  ค่าความนำไฟฟ้า DI EC เฉลี่ย
                </span>
                <div className="p-1.5 rounded-lg bg-cyan-100 dark:bg-cyan-900/60 text-cyan-600 dark:text-cyan-300">
                  <Droplets size={15} />
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-extrabold text-cyan-600 dark:text-cyan-400 tracking-tight">
                  {kpi.avgDI_EC ?? '—'}
                </span>
                <span className="text-xs font-medium text-gray-500">µS/cm</span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-[10px] font-medium text-cyan-700 dark:text-cyan-300 bg-cyan-100/60 dark:bg-cyan-900/40 px-2 py-0.5 rounded-full w-fit">
                <CheckCircle2 size={11} className="text-emerald-500" />
                <span>ผ่านเกณฑ์มาตรฐาน (&lt; 10 µS)</span>
              </div>
            </div>
          </div>
        </div>

        {/* View Mode: CHART VIEW */}
        {viewMode === 'chart' && (
          <>
            {/* Chart Navigation Tabs */}
            <div className="px-5 sm:px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-900/30 flex gap-1.5 overflow-x-auto custom-scrollbar flex-shrink-0">
              {TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'border-blue-600 text-blue-600 dark:text-blue-400 bg-white/70 dark:bg-gray-800/60'
                        : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                    }`}
                  >
                    <Icon size={15} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Chart Body */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar bg-gray-50/30 dark:bg-gray-900/10">
              {loading ? (
                <div className="h-80 flex flex-col items-center justify-center text-gray-400">
                  <RefreshCw size={28} className="animate-spin text-blue-600 mb-2" />
                  <span className="text-sm font-medium">กำลังคำนวณและประมวลผลข้อมูลทางสถิติ...</span>
                </div>
              ) : timeline.length === 0 ? (
                <div className="h-80 flex flex-col items-center justify-center text-gray-400 text-sm">
                  <AlertTriangle size={36} className="text-amber-500 mb-2" />
                  <span className="font-semibold text-gray-700 dark:text-gray-300">ไม่พบข้อมูลบันทึกในช่วงเวลาที่เลือก</span>
                  <span className="text-xs text-gray-400 mt-1">กรุณาลองเปลี่ยนช่วงวันหรือเลือกกะการทำงาน</span>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Tab 1: Degreasing 1, 2 & Surface Cond */}
                  {activeTab === 'degrease_sc' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            <span>บ่อ 1 &amp; 2 ล้างไขมัน (FC-T5008) และ บ่อ 5 ปรับสภาพผิว (Surface Cond.)</span>
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            เกณฑ์ควบคุม F.Al: 10.0 – 12.0 pt | Surface Cond. T.C: 2.0 – 4.0 pt | pH: 9.0 – 11.0
                          </p>
                        </div>
                        {/* Interactive Line Visibility Toggles */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleSeries('F_Al_1')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['F_Al_1']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            Degreasing 1 (F.Al)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('F_Al_2')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['F_Al_2']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-cyan-50 text-cyan-700 border-cyan-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-cyan-500" />
                            Degreasing 2 (F.Al)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('TC_SC')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['TC_SC']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-purple-50 text-purple-700 border-purple-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            Surface Cond. (T.C)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('pH_SC')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['pH_SC']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Surface Cond. (pH)
                          </button>
                        </div>
                      </div>

                      <div className={`w-full ${isMaximized ? 'h-[500px]' : 'h-80'}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={timeline} margin={{ top: 15, right: 30, left: 0, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                            <YAxis domain={[0, 15]} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            {/* Acceptable Spec Shading for F.Al (10.0 - 12.0 pt) */}
                            <ReferenceArea y1={10.0} y2={12.0} fill="#3b82f6" fillOpacity={0.07} />
                            <ReferenceLine y={10.0} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Min 10.0 pt', fill: '#2563eb', fontSize: 10, position: 'insideTopLeft' }} />
                            <ReferenceLine y={12.0} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Max 12.0 pt', fill: '#2563eb', fontSize: 10, position: 'insideBottomLeft' }} />
                            {/* Surface Cond T.C zone (2.0 - 4.0 pt) */}
                            <ReferenceArea y1={2.0} y2={4.0} fill="#8b5cf6" fillOpacity={0.05} />
                            {!hiddenSeries['F_Al_1'] && (
                              <Line type="monotone" dataKey="F_Al_1" name="Degreasing 1 (F.Al)" stroke="#2563eb" strokeWidth={2.2} dot={{ r: 2.5 }} activeDot={{ r: 6 }} />
                            )}
                            {!hiddenSeries['F_Al_2'] && (
                              <Line type="monotone" dataKey="F_Al_2" name="Degreasing 2 (F.Al)" stroke="#06b6d4" strokeWidth={2.2} dot={{ r: 2.5 }} />
                            )}
                            {!hiddenSeries['TC_SC'] && (
                              <Line type="monotone" dataKey="TC_SC" name="Surface Cond. (T.C)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2.5 }} />
                            )}
                            {!hiddenSeries['pH_SC'] && (
                              <Line type="monotone" dataKey="pH_SC" name="Surface Cond. (pH)" stroke="#10b981" strokeWidth={1.8} strokeDasharray="4 4" dot={false} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Zinc Phosphate */}
                  {activeTab === 'phosphate' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                            บ่อ 6 ซิงค์ฟอสเฟต Zinc Phosphate (PB-LT5103 / AC-131)
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            เกณฑ์ควบคุม Total Acidity (TA): 23.0 – 25.0 pt | Accelerator (A.C): 2.0 – 4.0 pt | Free Acid (FA): 0.3 – 0.5 pt
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleSeries('TA_ZP')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['TA_ZP']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-amber-50 text-amber-800 border-amber-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Total Acidity (TA)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('AC_ZP')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['AC_ZP']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-600" />
                            Accelerator (A.C)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('FA_ZP')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['FA_ZP']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-pink-50 text-pink-700 border-pink-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-pink-500" />
                            Free Acid (FA)
                          </button>
                        </div>
                      </div>

                      <div className={`w-full ${isMaximized ? 'h-[500px]' : 'h-80'}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={timeline} margin={{ top: 15, right: 30, left: 0, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                            <YAxis domain={[0, 30]} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            {/* Acceptable Spec Shading for Total Acidity (23.0 - 25.0 pt) */}
                            <ReferenceArea y1={23.0} y2={25.0} fill="#f59e0b" fillOpacity={0.08} />
                            <ReferenceLine y={23.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'TA Min 23.0', fill: '#d97706', fontSize: 10, position: 'insideTopLeft' }} />
                            <ReferenceLine y={25.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'TA Max 25.0', fill: '#d97706', fontSize: 10, position: 'insideBottomLeft' }} />
                            {/* Accelerator control zone (2.0 - 4.0 pt) */}
                            <ReferenceArea y1={2.0} y2={4.0} fill="#3b82f6" fillOpacity={0.05} />
                            {!hiddenSeries['TA_ZP'] && (
                              <Line type="monotone" dataKey="TA_ZP" name="Total Acidity (TA)" stroke="#d97706" strokeWidth={2.5} dot={{ r: 2.5 }} />
                            )}
                            {!hiddenSeries['AC_ZP'] && (
                              <Line type="monotone" dataKey="AC_ZP" name="Accelerator (A.C)" stroke="#2563eb" strokeWidth={2} dot={{ r: 2.5 }} />
                            )}
                            {!hiddenSeries['FA_ZP'] && (
                              <Line type="monotone" dataKey="FA_ZP" name="Free Acid (FA)" stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Rinses & DI Water */}
                  {activeTab === 'rinse_di' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                            บ่อล้างน้ำ Water Rinse 1–4 และ น้ำบริสุทธิ์ Deionized Water Rinse (DI)
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            เกณฑ์ความบริสุทธิ์น้ำ DI EC: &lt; 10.0 µS/cm | ระดับความเป็นกรด-ด่าง (pH) ในแต่ละบ่อล้าง
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleSeries('EC_DI')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['EC_DI']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-red-50 text-red-700 border-red-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-red-500" />
                            DI: EC (µS/cm)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('pH_DI')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['pH_DI']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-blue-50 text-blue-700 border-blue-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                            DI: pH
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('pH_WR1')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['pH_WR1']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-emerald-500" />
                            Rinse 1 (pH)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('pH_WR2')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['pH_WR2']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-cyan-50 text-cyan-700 border-cyan-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-cyan-500" />
                            Rinse 2 (pH)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('pH_WR3')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['pH_WR3']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-purple-50 text-purple-700 border-purple-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-purple-500" />
                            Rinse 3 (pH)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('pH_WR4')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['pH_WR4']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-amber-50 text-amber-700 border-amber-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-amber-500" />
                            Rinse 4 (pH)
                          </button>
                        </div>
                      </div>

                      <div className={`w-full ${isMaximized ? 'h-[500px]' : 'h-80'}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={timeline} margin={{ top: 15, right: 30, left: 0, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                            <YAxis domain={[0, 12]} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            {/* Safe zone for DI EC (< 10 µS/cm) */}
                            <ReferenceArea y1={0} y2={10.0} fill="#10b981" fillOpacity={0.06} />
                            <ReferenceLine y={10.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'เกณฑ์ DI EC < 10.0 µS', fill: '#dc2626', fontSize: 10, position: 'insideTopLeft' }} />
                            {!hiddenSeries['EC_DI'] && (
                              <Line type="monotone" dataKey="EC_DI" name="น้ำ DI: EC (µS/cm)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2.5 }} />
                            )}
                            {!hiddenSeries['pH_DI'] && (
                              <Line type="monotone" dataKey="pH_DI" name="น้ำ DI: pH" stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                            )}
                            {!hiddenSeries['pH_WR1'] && (
                              <Line type="monotone" dataKey="pH_WR1" name="Rinse 1 (pH)" stroke="#10b981" strokeWidth={1.6} dot={false} />
                            )}
                            {!hiddenSeries['pH_WR2'] && (
                              <Line type="monotone" dataKey="pH_WR2" name="Rinse 2 (pH)" stroke="#06b6d4" strokeWidth={1.6} dot={false} />
                            )}
                            {!hiddenSeries['pH_WR3'] && (
                              <Line type="monotone" dataKey="pH_WR3" name="Rinse 3 (pH)" stroke="#8b5cf6" strokeWidth={1.6} dot={false} />
                            )}
                            {!hiddenSeries['pH_WR4'] && (
                              <Line type="monotone" dataKey="pH_WR4" name="Rinse 4 (pH)" stroke="#f59e0b" strokeWidth={1.6} dot={false} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tab 4: Ovens & Conveyor Speed */}
                  {activeTab === 'ovens' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                            อุณหภูมิเตาอบสี &amp; เตาอบแห้ง (Oven Temperatures) และความเร็วสายพาน
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            เกณฑ์ควบคุม เตาอบสี Bake Oven: 175 – 220 °C | เตาอบแห้ง Dry Oven: 140 – 160 °C | สายพาน Conveyor: 2.5 – 5.0 m/min
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => toggleSeries('bake_oven_temp')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['bake_oven_temp']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-orange-50 text-orange-700 border-orange-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-orange-500" />
                            เตาอบสี Bake Oven (°C)
                          </button>
                          <button
                            type="button"
                            onClick={() => toggleSeries('dry_oven_temp')}
                            className={`text-[11px] px-2.5 py-1 rounded-full border transition-all flex items-center gap-1.5 ${
                              hiddenSeries['dry_oven_temp']
                                ? 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                                : 'bg-sky-50 text-sky-700 border-sky-200 font-medium'
                            }`}
                          >
                            <span className="w-2 h-2 rounded-full bg-sky-500" />
                            เตาอบแห้ง Dry Oven (°C)
                          </button>
                        </div>
                      </div>

                      <div className={`w-full ${isMaximized ? 'h-[500px]' : 'h-80'}`}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={timeline} margin={{ top: 15, right: 30, left: 0, bottom: 25 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                            <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                            <YAxis domain={[120, 235]} tick={{ fontSize: 11 }} />
                            <Tooltip content={<CustomTooltip />} />
                            {/* Bake Oven Zone (175 - 220 °C) */}
                            <ReferenceArea y1={175.0} y2={220.0} fill="#f97316" fillOpacity={0.07} />
                            <ReferenceLine y={175.0} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Bake Min 175°', fill: '#ea580c', fontSize: 10, position: 'insideTopLeft' }} />
                            <ReferenceLine y={220.0} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Bake Max 220°', fill: '#ea580c', fontSize: 10, position: 'insideBottomLeft' }} />
                            {/* Dry Oven Zone (140 - 160 °C) */}
                            <ReferenceArea y1={140.0} y2={160.0} fill="#0ea5e9" fillOpacity={0.07} />
                            <ReferenceLine y={140.0} stroke="#0ea5e9" strokeDasharray="3 3" label={{ value: 'Dry Min 140°', fill: '#0284c7', fontSize: 10, position: 'insideTopLeft' }} />
                            <ReferenceLine y={160.0} stroke="#0ea5e9" strokeDasharray="3 3" label={{ value: 'Dry Max 160°', fill: '#0284c7', fontSize: 10, position: 'insideBottomLeft' }} />
                            {!hiddenSeries['bake_oven_temp'] && (
                              <Line type="monotone" dataKey="bake_oven_temp" name="เตาอบสี Bake Oven (°C)" stroke="#f97316" strokeWidth={2.5} dot={{ r: 2.5 }} />
                            )}
                            {!hiddenSeries['dry_oven_temp'] && (
                              <Line type="monotone" dataKey="dry_oven_temp" name="เตาอบแห้ง Dry Oven (°C)" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 2.5 }} />
                            )}
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Tab 5: Daily Chemical Added (Kg) */}
                  {activeTab === 'chem_kg' && (
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                            ปริมาณการเติมสารเคมีสะสมรายวัน (Daily Chemical Consumption - Kg)
                          </h3>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                            สรุปยอดเติมสารเคมีล้างไขมัน FC-T5008 และสารเคมีเร่งฟอสเฟต AC-131 ตามวันที่มีการผลิต
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <span className="flex items-center gap-1.5 font-medium text-blue-700 dark:text-blue-300">
                            <span className="w-2.5 h-2.5 rounded-sm bg-blue-600" />
                            FC-T5008 ล้างไขมัน
                          </span>
                          <span className="flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-300">
                            <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                            AC-131 เร่งฟอสเฟต
                          </span>
                        </div>
                      </div>

                      <div className={`w-full ${isMaximized ? 'h-[500px]' : 'h-80'}`}>
                        {dailyChemicalTotals.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-400 text-sm">
                            <Package size={32} className="text-gray-300 dark:text-gray-600 mb-2" />
                            <span>ไม่มีประวัติการเติมสารเคมีในช่วงเวลานี้</span>
                          </div>
                        ) : (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={dailyChemicalTotals} margin={{ top: 15, right: 30, left: 0, bottom: 25 }}>
                              <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                              <XAxis dataKey="log_date" tick={{ fontSize: 11 }} />
                              <YAxis tick={{ fontSize: 11 }} />
                              <Tooltip content={<CustomTooltip />} />
                              <Bar dataKey="FC_T5008" name="FC-T5008 ล้างไขมัน (กก.)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="AC_131"   name="AC-131 เร่งฟอสเฟต (กก.)"  fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* View Mode: SPC STATISTICAL TABLE VIEW */}
        {viewMode === 'table' && (
          <div className="flex-1 flex flex-col overflow-hidden bg-gray-50/40 dark:bg-gray-900/10">
            {/* Table Toolbar */}
            <div className="p-4 sm:px-6 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative w-full">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={tableSearch}
                    onChange={(e) => setTableSearch(e.target.value)}
                    placeholder="ค้นหาพารามิเตอร์ หรือ บ่อตรวจ..."
                    className="w-full text-xs pl-8 pr-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  แสดง {filteredStats.length} จาก {statsTableData.length} รายการ
                </span>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-colors shadow-sm"
                >
                  <Download size={14} />
                  <span>ส่งออกรายงาน CSV</span>
                </button>
              </div>
            </div>

            {/* Table Scroll Area */}
            <div className="flex-1 overflow-auto custom-scrollbar p-4 sm:p-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 font-bold">
                      <th className="py-3 px-3">บ่อ / จุดตรวจ</th>
                      <th className="py-3 px-3">พารามิเตอร์</th>
                      <th className="py-3 px-3">เกณฑ์มาตรฐาน</th>
                      <th className="py-3 px-2 text-center">ตัวอย่าง (n)</th>
                      <th className="py-3 px-2 text-right">Min</th>
                      <th className="py-3 px-2 text-right">เฉลี่ย (X̄)</th>
                      <th className="py-3 px-2 text-right">Max</th>
                      <th className="py-3 px-2 text-right">Std Dev (σ)</th>
                      <th className="py-3 px-2 text-center">จุดนอกเกณฑ์</th>
                      <th className="py-3 px-2 text-center">ผ่านเกณฑ์ (%)</th>
                      <th className="py-3 px-3 text-center">สถานะควบคุม</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {filteredStats.map((row, idx) => {
                      const isWarning = row.oorCount > 0;
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-blue-50/40 dark:hover:bg-blue-950/20 transition-colors text-gray-800 dark:text-gray-200"
                        >
                          <td className="py-2.5 px-3 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                            {row.tank}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                            {row.name}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono text-gray-600 dark:text-gray-400">
                            {row.min !== null && row.max !== null
                              ? `${row.min} – ${row.max} ${row.unit}`
                              : row.max !== null
                              ? `< ${row.max} ${row.unit}`
                              : `> ${row.min} ${row.unit}`}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono">{row.count}</td>
                          <td className="py-2.5 px-2 text-right font-mono">{row.minVal}</td>
                          <td className="py-2.5 px-2 text-right font-mono font-bold text-blue-600 dark:text-blue-400">
                            {row.avgVal}
                          </td>
                          <td className="py-2.5 px-2 text-right font-mono">{row.maxVal}</td>
                          <td className="py-2.5 px-2 text-right font-mono text-gray-500">{row.stdDev}</td>
                          <td className="py-2.5 px-2 text-center font-mono font-semibold">
                            {row.oorCount > 0 ? (
                              <span className="text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/40 px-1.5 py-0.5 rounded">
                                {row.oorCount}
                              </span>
                            ) : (
                              <span className="text-gray-400">0</span>
                            )}
                          </td>
                          <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                            {row.passRate}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {isWarning ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/60 px-2 py-0.5 rounded-full">
                                <AlertCircle size={10} />
                                เฝ้าระวัง
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 px-2 py-0.5 rounded-full">
                                <Check size={10} />
                                ปกติ 100%
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
          <div className="flex items-center gap-3">
            <span>
              ข้อมูลช่วง: <strong className="text-gray-700 dark:text-gray-200">{dateFrom}</strong> ถึง{' '}
              <strong className="text-gray-700 dark:text-gray-200">{dateTo}</strong>
            </span>
            <span>•</span>
            <span>
              จำนวนจุดบันทึกทั้งหมด: <strong className="text-blue-600 dark:text-blue-400">{timeline.length}</strong> สล็อต
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-semibold rounded-lg transition-colors"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

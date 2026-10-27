// PaintChemAnalyticsModal.jsx — Interactive Trend Analytics & SPC Dashboard for Paint Chem Check Sheet
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts';
import {
  TrendingUp, Activity, Flame, Droplets, Package, AlertTriangle,
  Calendar, RefreshCw, X, CheckCircle2, ChevronRight
} from 'lucide-react';

const API_BASE = '/iot-toolbox/sandbox-b9/MES/MES/page/paintChem/api';

const TABS = [
  { id: 'degrease_sc', label: '1. ล้างไขมัน & ปรับผิว (Degreasing / SC)', icon: Activity },
  { id: 'phosphate',   label: '2. ซิงค์ฟอสเฟต (Zinc Phosphate)',      icon: TrendingUp },
  { id: 'rinse_di',    label: '3. บ่อล้างน้ำ & น้ำ DI (pH / EC)',      icon: Droplets },
  { id: 'ovens',       label: '4. เตาอบ & สายพาน (Ovens / Speed)',     icon: Flame },
  { id: 'chem_kg',     label: '5. ยอดเติมสารเคมีรายวัน (Kg Added)',    icon: Package },
];

export default function PaintChemAnalyticsModal({ isOpen, onClose }) {
  const [dateFrom, setDateFrom] = useState('2026-10-01');
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10));
  const [shift,    setShift]    = useState('');
  const [activeTab, setActiveTab] = useState('degrease_sc');
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/get_analytics.php`, {
        params: { date_from: dateFrom, date_to: dateTo, shift },
      });
      if (res.data.success) {
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

  if (!isOpen) return null;

  const kpi = data?.kpiSummary || {};
  const timeline = data?.timeline || [];
  const dailyChemicalTotals = data?.dailyChemicalTotals || [];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-md">
              <TrendingUp size={22} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                กราฟวิเคราะห์แนวโน้มเคมีและพารามิเตอร์การผลิต
                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                  SPC &amp; Trend Analytics
                </span>
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                วิเคราะห์แนวโน้มค่าสารเคมี อุณหภูมิเตาอบ และปริมาณการเติมสารเคมีสะสม
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Filters & KPI Cards */}
        <div className="p-4 sm:p-6 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-4">
          {/* Filter Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">ช่วงเวลา:</span>
              <button
                type="button"
                onClick={() => handleSetPreset('THIS_MONTH')}
                className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-md transition-colors font-medium"
              >
                เดือนนี้ (ต.ค. 2026)
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('7_DAYS')}
                className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-md transition-colors"
              >
                7 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => handleSetPreset('30_DAYS')}
                className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-md transition-colors"
              >
                30 วันล่าสุด
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
              <span className="text-gray-400 text-xs">ถึง</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              />
              <select
                value={shift}
                onChange={(e) => setShift(e.target.value)}
                className="text-xs border border-gray-300 dark:border-gray-600 rounded-lg px-2.5 py-1.5 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
              >
                <option value="">ทุกกะ</option>
                <option value="DAY">กลางวัน (DAY)</option>
                <option value="NIGHT">กลางคืน (NIGHT)</option>
              </select>
              <button
                onClick={handleApplyFilter}
                disabled={loading}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                อัปเดต
              </button>
            </div>
          </div>

          {/* 4 KPI Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">ชุดเอกสาร / สล็อตบันทึก</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-lg font-bold text-gray-900 dark:text-gray-100">{kpi.totalSheets ?? 0}</span>
                <span className="text-xs text-gray-500">ใบ</span>
                <span className="text-xs text-gray-400">({kpi.totalSlots ?? 0} สล็อต)</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">ยอดเติมสารเคมีสะสม</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">{kpi.totalChemicalAddedKg ?? 0}</span>
                <span className="text-xs text-gray-500">กก.</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">เตาอบเฉลี่ย (Bake / Dry)</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-base font-bold text-amber-600 dark:text-amber-400">{kpi.avgBakeOvenTemp ?? '—'}°C</span>
                <span className="text-xs text-gray-400">/ {kpi.avgDryOvenTemp ?? '—'}°C</span>
              </div>
            </div>

            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-xl border border-gray-100 dark:border-gray-700">
              <span className="text-[11px] text-gray-500 dark:text-gray-400 block mb-0.5">ค่าความนำไฟฟ้า DI EC เฉลี่ย</span>
              <div className="flex items-baseline gap-1">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{kpi.avgDI_EC ?? '—'}</span>
                <span className="text-xs text-gray-500">µS/cm (&lt; 10)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 flex gap-2 overflow-x-auto custom-scrollbar flex-shrink-0">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-3.5 border-b-2 text-xs font-semibold whitespace-nowrap transition-colors ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Chart View Content */}
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="h-72 flex items-center justify-center text-gray-400">
              <RefreshCw size={24} className="animate-spin text-blue-600 mb-2" />
              <span className="ml-2 text-sm">กำลังประมวลผลกราฟสถิติ...</span>
            </div>
          ) : timeline.length === 0 ? (
            <div className="h-72 flex flex-col items-center justify-center text-gray-400 text-sm">
              <AlertTriangle size={32} className="text-amber-500 mb-2" />
              <span>ไม่พบข้อมูลในช่วงเวลาที่เลือก</span>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Tab 1: Degreasing & Surface Cond */}
              {activeTab === 'degrease_sc' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        แนวโน้มสารเคมีล้างไขมัน Degreasing 1 &amp; 2 (FC-T5008) และ Surface Cond.
                      </h3>
                      <p className="text-xs text-gray-500">มาตรฐาน F.Al: 10.0 – 12.0 pt | Surface Cond. T.C: 2.0 – 4.0 pt</p>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                        <YAxis domain={[8, 14]} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <ReferenceLine y={10.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Min 10.0 pt', fill: '#ef4444', fontSize: 10 }} />
                        <ReferenceLine y={12.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Max 12.0 pt', fill: '#ef4444', fontSize: 10 }} />
                        <Line type="monotone" dataKey="F_Al_1" name="Degreasing 1 (F.Al)" stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="F_Al_2" name="Degreasing 2 (F.Al)" stroke="#06b6d4" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="TC_SC"   name="Surface Cond. (T.C)" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="pH_SC"   name="Surface Cond. (pH)"  stroke="#10b981" strokeWidth={1.5} strokeDasharray="4 4" dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tab 2: Zinc Phosphate */}
              {activeTab === 'phosphate' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        แนวโน้มสารเคมีเคลือบฟอสเฟต Zinc Phosphate (PB-LT5103 / AC-131)
                      </h3>
                      <p className="text-xs text-gray-500">มาตรฐาน Total Acidity (TA): 23.0 – 25.0 pt | A.C: 2.0 – 4.0 pt | Free Acid (FA): 0.3 – 0.5 pt</p>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                        <YAxis domain={[0, 30]} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <ReferenceLine y={23.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'TA Min 23.0', fill: '#f59e0b', fontSize: 10 }} />
                        <ReferenceLine y={25.0} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'TA Max 25.0', fill: '#f59e0b', fontSize: 10 }} />
                        <Line type="monotone" dataKey="TA_ZP" name="Total Acidity (TA)" stroke="#d97706" strokeWidth={2.5} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="AC_ZP" name="Accelerator (A.C)"  stroke="#2563eb" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="FA_ZP" name="Free Acid (FA)"     stroke="#ec4899" strokeWidth={2} dot={{ r: 2 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tab 3: Rinses & DI Water */}
              {activeTab === 'rinse_di' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        แนวโน้มคุณภาพน้ำล้าง Water Rinse 1–4 และ Deionized Water Rinse
                      </h3>
                      <p className="text-xs text-gray-500">มาตรฐานน้ำ DI EC: &lt; 10.0 µS/cm | ระดับความเป็นกรด-ด่าง (pH)</p>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                        <YAxis domain={[3, 12]} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <ReferenceLine y={10.0} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'DI EC Limit < 10 µS', fill: '#ef4444', fontSize: 10 }} />
                        <Line type="monotone" dataKey="EC_DI"   name="น้ำ DI: EC (µS/cm)" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="pH_DI"   name="น้ำ DI: pH"         stroke="#3b82f6" strokeWidth={2} dot={{ r: 2 }} />
                        <Line type="monotone" dataKey="pH_WR1"  name="Rinse 1 (pH)"       stroke="#10b981" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="pH_WR2"  name="Rinse 2 (pH)"       stroke="#06b6d4" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="pH_WR3"  name="Rinse 3 (pH)"       stroke="#8b5cf6" strokeWidth={1.5} dot={false} />
                        <Line type="monotone" dataKey="pH_WR4"  name="Rinse 4 (pH)"       stroke="#f59e0b" strokeWidth={1.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tab 4: Ovens & Conveyor Speed */}
              {activeTab === 'ovens' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        แนวโน้มอุณหภูมิเตาอบ (Oven Temperatures) และความเร็วสายพาน
                      </h3>
                      <p className="text-xs text-gray-500">มาตรฐาน Bake Oven: 175 – 220 °C | Dry Oven: 140 – 160 °C | Conveyor: 2.5 – 5.0 m/min</p>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={timeline} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="label" tick={{ fontSize: 10 }} angle={-25} textAnchor="end" height={45} />
                        <YAxis domain={[120, 230]} tick={{ fontSize: 11 }} />
                        <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                        <ReferenceLine y={175.0} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Bake Min 175°', fill: '#f97316', fontSize: 10 }} />
                        <ReferenceLine y={220.0} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'Bake Max 220°', fill: '#f97316', fontSize: 10 }} />
                        <ReferenceLine y={140.0} stroke="#0ea5e9" strokeDasharray="3 3" label={{ value: 'Dry Min 140°', fill: '#0ea5e9', fontSize: 10 }} />
                        <ReferenceLine y={160.0} stroke="#0ea5e9" strokeDasharray="3 3" label={{ value: 'Dry Max 160°', fill: '#0ea5e9', fontSize: 10 }} />
                        <Line type="monotone" dataKey="bake_oven_temp" name="เตาอบสี Bake Oven (°C)" stroke="#f97316" strokeWidth={2.5} dot={{ r: 2.5 }} />
                        <Line type="monotone" dataKey="dry_oven_temp"  name="เตาอบแห้ง Dry Oven (°C)" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 2.5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Tab 5: Daily Chemical Added (Kg) */}
              {activeTab === 'chem_kg' && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">
                        ปริมาณการเติมสารเคมีสะสมรายวัน (Daily Chemical Consumption - Kg)
                      </h3>
                      <p className="text-xs text-gray-500">สรุปยอดการเติมสารเคมี FC-T5008 และ AC-131 ตามวันที่มีการผลิต</p>
                    </div>
                  </div>
                  <div className="h-80 w-full">
                    {dailyChemicalTotals.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                        ไม่มีประวัติการเติมสารเคมีในช่วงเวลานี้
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={dailyChemicalTotals} margin={{ top: 10, right: 30, left: 0, bottom: 25 }}>
                          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                          <XAxis dataKey="log_date" tick={{ fontSize: 11 }} />
                          <YAxis tick={{ fontSize: 11 }} />
                          <Tooltip contentStyle={{ backgroundColor: '#1e293b', color: '#fff', borderRadius: '8px', fontSize: '12px' }} />
                          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
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
      </div>
    </div>
  );
}

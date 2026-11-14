import React, { useState, useEffect, useCallback } from 'react';
import {
  Zap, Calendar, RefreshCw, Download, Settings,
  Clock, CheckCircle2, AlertTriangle, RotateCcw,
  ShieldCheck
} from 'lucide-react';
import { utilityApi } from '../../../shared/services/utilityApi';
import UtilityKpiCards from '../components/UtilityKpiCards';
import HourlyCostChart from '../components/HourlyCostChart';
import MetersTable from '../components/MetersTable';
import TouSettingsModal from '../components/TouSettingsModal';

export default function UtilityDashboardPage() {
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [recalcLoading, setRecalcLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(''), 3500);
  };

  // Fetch Dashboard Data
  const loadDashboardData = useCallback(async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    setError(null);

    try {
      const res = await utilityApi.getDashboard({ startDate, endDate });
      if (res?.success) {
        setData(res.data);
        setLastUpdated(new Date());
      } else {
        setError(res?.message || 'ไม่สามารถโหลดข้อมูล Utility ได้');
      }
    } catch (err) {
      console.error('Failed to load utility dashboard:', err);
      setError(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // 30s Auto Refresh Interval
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      loadDashboardData(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadDashboardData]);

  // Quick Preset Handlers
  const handlePreset = (type) => {
    const now = new Date();
    if (type === 'today') {
      const t = getTodayStr();
      setStartDate(t);
      setEndDate(t);
    } else if (type === 'yesterday') {
      const y = new Date(now);
      y.setDate(y.getDate() - 1);
      const yStr = y.toISOString().split('T')[0];
      setStartDate(yStr);
      setEndDate(yStr);
    } else if (type === 'last7') {
      const past = new Date(now);
      past.setDate(past.getDate() - 6);
      setStartDate(past.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    } else if (type === 'thisMonth') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      setStartDate(firstDay.toISOString().split('T')[0]);
      setEndDate(now.toISOString().split('T')[0]);
    }
  };

  // Trigger Backend Recalculate
  const handleRecalculate = async () => {
    setRecalcLoading(true);
    try {
      const res = await utilityApi.recalculate(startDate);
      if (res?.success) {
        showToast(res.message || 'คำนวณยอดและอัปเดตข้อมูลเรียบร้อยแล้ว');
        loadDashboardData(true);
      } else {
        showToast('เกิดข้อผิดพลาด: ' + res?.message);
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการสั่งคำนวณใหม่: ' + (err.response?.data?.message || err.message));
    } finally {
      setRecalcLoading(false);
    }
  };

  // Export CSV
  const handleExportCsv = () => {
    if (!data?.meters || data.meters.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก CSV');
      return;
    }

    const headers = [
      'Meter Name',
      'Utility Type',
      'Production Line',
      'Realtime kW',
      'Power Factor (PF)',
      'Status',
      `Period Usage (${startDate === endDate ? startDate : `${startDate}_to_${endDate}`})`,
      'Period Cost (THB)',
      'Included in Factory Total'
    ];

    const rows = data.meters.map(m => [
      `"${m.meter_name}"`,
      `"${m.utility_type}"`,
      `"${m.production_line || '-'}"`,
      m.realtime_kw != null ? m.realtime_kw : '',
      m.power_factor != null ? m.power_factor : '',
      `"${m.status}"`,
      m.period_usage != null ? m.period_usage : 0,
      m.period_cost != null ? m.period_cost : 0,
      `"${String(m.meter_name || '').toUpperCase() === 'MDB' ? 'NO (Main Feeder Reference Only)' : 'YES'}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Utility_Report_${startDate}_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('ดาวน์โหลดรายงาน CSV เรียบร้อยแล้ว');
  };

  const isSingleDay = startDate === endDate;

  return (
    <div className="w-full space-y-5 animate-fade-in pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-slate-800 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-medium border border-slate-700 animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Title & Description */}
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-md shadow-amber-500/20 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">
                Utility & Energy Monitoring
              </h1>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Live IIoT Meters
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60">
                ⚡ SPA Ported
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              ศูนย์รวมข้อมูลการใช้ไฟฟ้า TOU (Peak/Off-Peak) และก๊าซ LPG ตลอด 24 ชม. พร้อมสรุปต้นทุนพลังงานโรงงาน
            </p>
          </div>
        </div>

        {/* Global Controls & Date Presets */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Preset Buttons */}
          <div className="hidden sm:inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/60 text-xs font-medium text-slate-600">
            <button
              onClick={() => handlePreset('today')}
              className={`px-2.5 py-1 rounded-lg transition-colors ${isSingleDay && startDate === getTodayStr() ? 'bg-white text-slate-800 shadow-xs font-semibold' : 'hover:text-slate-900'
                }`}
            >
              วันนี้
            </button>
            <button
              onClick={() => handlePreset('yesterday')}
              className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors"
            >
              เมื่อวาน
            </button>
            <button
              onClick={() => handlePreset('last7')}
              className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors"
            >
              7 วันล่าสุด
            </button>
            <button
              onClick={() => handlePreset('thisMonth')}
              className="px-2.5 py-1 rounded-lg hover:text-slate-900 transition-colors"
            >
              เดือนนี้
            </button>
          </div>

          {/* Date Picker Range */}
          <div className="flex items-center gap-1.5 bg-slate-50 px-2.5 py-1.5 rounded-xl border border-slate-200 text-xs">
            <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none text-xs cursor-pointer"
            />
            <span className="text-slate-400">-</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent text-slate-700 font-medium outline-none text-xs cursor-pointer"
            />
          </div>

          {/* Actions: Auto Refresh Toggle */}
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            title={autoRefresh ? 'เปิด Auto Refresh (30 วิ)' : 'ปิด Auto Refresh'}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${autoRefresh
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
              }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-emerald-600' : ''}`} />
            <span className="hidden sm:inline">{autoRefresh ? 'Auto 30s' : 'Manual'}</span>
          </button>

          {/* Recalculate Target Date */}
          <button
            onClick={handleRecalculate}
            disabled={recalcLoading}
            title="สั่งคำนวณยอดสรุปชั่วโมงใหม่สำหรับวันนี้"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`w-3.5 h-3.5 ${recalcLoading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">คำนวณใหม่</span>
          </button>

          {/* Tariff Settings Modal Trigger */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="ตั้งค่าอัตราค่าไฟฟ้า TOU และ LPG"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">อัตราค่าพลังงาน</span>
          </button>

          {/* Export CSV */}
          <button
            onClick={handleExportCsv}
            title="ส่งออกรายงานมิเตอร์และสรุปต้นทุน CSV"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">ส่งออก CSV</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-between text-rose-700 text-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={() => loadDashboardData()}
            className="px-3 py-1 bg-rose-600 text-white rounded-lg hover:bg-rose-700 font-medium"
          >
            ลองอีกครั้ง
          </button>
        </div>
      )}

      {/* Loading Skeleton or Main Content */}
      {loading && !data ? (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
          <div className="h-96 bg-slate-100 animate-pulse rounded-2xl" />
          <div className="h-96 bg-slate-100 animate-pulse rounded-2xl" />
        </div>
      ) : (
        <>
          {/* KPI Summary Cards */}
          <UtilityKpiCards summary={data?.summary} isRange={data?.is_range} />

          {/* Hourly / Daily Trend Chart */}
          <HourlyCostChart data={data?.trends} isRange={data?.is_range} />

          {/* Real-time Meters Table & List */}
          <MetersTable
            meters={data?.meters}
            onRefresh={() => loadDashboardData(true)}
          />
        </>
      )}

      {/* Footer Info */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 px-2 gap-2">
        <div className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>
            ข้อมูลอัปเดตล่าสุด: {lastUpdated ? lastUpdated.toLocaleTimeString('th-TH') : '-'}
          </span>
          {refreshing && <span className="text-amber-500 font-medium">(กำลังซิงค์...)</span>}
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>SNC IIoT Energy Gateway · Single Source of Truth</span>
        </div>
      </div>

      {/* TOU Tariff Settings Modal */}
      <TouSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSaved={() => {
          showToast('บันทึกอัตราใหม่และรีเฟรชข้อมูลเรียบร้อยแล้ว');
          loadDashboardData(true);
        }}
      />
    </div>
  );
}
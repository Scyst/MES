import React, { useCallback, useEffect, useState } from 'react';
import {
  Truck, Plus, RefreshCw, FileSpreadsheet, Search, Link2,
  ArrowDownCircle, ArrowUpCircle, ArrowLeftRight, Handshake, Building2,
  Banknote, Pencil, Trash2, Lock, WifiOff, BarChart3, ChevronLeft, ChevronRight, Loader2
} from 'lucide-react';
import fleetLogApi from '../../../shared/services/fleetLogApi';
import FleetKpiCards from '../components/FleetKpiCards';
import FleetAnalyticsChart from '../components/FleetAnalyticsChart';
import {
  CostPreviewBadge,
  DeleteFleetModal,
  FleetEntryModal,
  PendingCtpatModal,
  QuickCostModal
} from '../components/FleetModals';
import {
  exportFleetLogsToExcel,
  formatTimestampDisplay,
  getDefaultMonthRange
} from '../utils/fleetLogHelpers';

const INITIAL_KPI = {
  total: 0,
  vendor: 0,
  snc: 0,
  total_cost: 0,
  breakdown: { total: {}, vendor: {}, snc: {} },
  cost_breakdown: { INBOUND: 0, OUTBOUND: 0, OTHER: 0 }
};

function TransTypeBadge({ type }) {
  if (type === 'OUTBOUND') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 px-2 py-0.5 text-xs font-bold">
        <ArrowUpCircle className="w-3.5 h-3.5" /> OUT
      </span>
    );
  }
  if (type === 'INBOUND') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 text-xs font-bold">
        <ArrowDownCircle className="w-3.5 h-3.5" /> IN
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-2 py-0.5 text-xs font-bold">
      <ArrowLeftRight className="w-3.5 h-3.5" /> OTHER
    </span>
  );
}

export default function FleetLogPage() {
  const defaultRange = getDefaultMonthRange();

  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [transType, setTransType] = useState('ALL');
  const [providerType, setProviderType] = useState('ALL');
  const [vehicleType, setVehicleType] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  const [logs, setLogs] = useState([]);
  const [kpi, setKpi] = useState(INITIAL_KPI);
  const [dailyTrend, setDailyTrend] = useState([]);
  const [vehicleOptions, setVehicleOptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total_rows: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [showChart, setShowChart] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  const [toast, setToast] = useState(null);

  const [entryModal, setEntryModal] = useState({ open: false, mode: 'create', data: null });
  const [quickCostRow, setQuickCostRow] = useState(null);
  const [deleteRow, setDeleteRow] = useState(null);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const [pendingList, setPendingList] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const showToast = useCallback((type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }, []);

  const loadLogs = useCallback(async () => {
    if (!startDate || !endDate) return;
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await fleetLogApi.getLogs({
        startDate,
        endDate,
        transType,
        providerType,
        vehicleType,
        search: debouncedSearch,
        page,
        limit
      });
      if (res?.success && res.data) {
        setLogs(res.data.logs || []);
        setKpi(res.data.kpi || INITIAL_KPI);
        setDailyTrend(res.data.daily_trend || []);
        setVehicleOptions(res.data.vehicle_options || []);
        setPagination(res.data.pagination || { page: 1, limit, total_rows: 0, total_pages: 1 });
      } else {
        setErrorMsg(res?.message || 'ไม่สามารถดึงข้อมูลบัญชีเที่ยวรถได้');
      }
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, transType, providerType, vehicleType, debouncedSearch, page, limit]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const loadPendingCtpat = async () => {
    setPendingModalOpen(true);
    setPendingLoading(true);
    try {
      const res = await fleetLogApi.getPendingLoading();
      if (res?.success) {
        setPendingList(res.data || []);
      } else {
        showToast('error', res?.message || 'ไม่สามารถดึงข้อมูลใบโหลด C-TPAT ได้');
      }
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'ไม่สามารถดึงข้อมูลใบโหลด C-TPAT ได้');
    } finally {
      setPendingLoading(false);
    }
  };

  const handleSaveEntry = async (payload) => {
    const res = entryModal.mode === 'edit'
      ? await fleetLogApi.updateManualLog(payload)
      : await fleetLogApi.saveManualLog(payload);
    if (!res?.success) {
      throw new Error(res?.message || 'ไม่สามารถบันทึกข้อมูลได้');
    }
    setEntryModal({ open: false, mode: 'create', data: null });
    showToast('success', res.message || 'บันทึกข้อมูลสำเร็จ');
    loadLogs();
  };

  const handleQuickCostSave = async (payload) => {
    const res = await fleetLogApi.updateQuickCost(payload);
    if (!res?.success) {
      throw new Error(res?.message || 'ไม่สามารถอัปเดตค่าขนส่งได้');
    }
    setQuickCostRow(null);
    showToast('success', res.message || 'อัปเดตค่าขนส่งสำเร็จ');
    loadLogs();
  };

  const handleConfirmDelete = async (logId) => {
    try {
      const res = await fleetLogApi.deleteLog(logId);
      if (res?.success) {
        setDeleteRow(null);
        showToast('success', res.message || 'ลบรายการสำเร็จ');
        loadLogs();
      } else {
        showToast('error', res?.message || 'ไม่สามารถลบรายการได้');
      }
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'ปฏิเสธการลบรายการ');
    }
  };

  const handleSyncCtpat = async (payload) => {
    try {
      const res = await fleetLogApi.syncOutbound(payload);
      if (res?.success) {
        showToast('success', res.message || 'ซิงค์ใบโหลด C-TPAT สำเร็จ');
        setPendingList((prev) => prev.filter((item) => item.id !== payload.loading_report_id));
        loadLogs();
      } else {
        showToast('error', res?.message || 'ซิงค์ข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'ซิงค์ข้อมูลไม่สำเร็จ');
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    try {
      const res = await fleetLogApi.exportLogs({
        startDate,
        endDate,
        transType,
        providerType,
        vehicleType,
        search: debouncedSearch
      });
      const exportRows = res?.success ? (res.data || []) : [];
      if (exportRows.length === 0) {
        showToast('error', 'ไม่พบข้อมูลสำหรับส่งออก Excel');
        return;
      }
      await exportFleetLogsToExcel(exportRows, startDate, endDate);
      showToast('success', `ส่งออกข้อมูลจำนวน ${exportRows.length} รายการเรียบร้อยแล้ว`);
    } catch (err) {
      showToast('error', err?.response?.data?.message || 'เกิดข้อผิดพลาดระหว่างส่งออก Excel');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 pb-24 md:pb-8 space-y-4">
      {isOffline && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 px-4 py-2.5 flex items-center gap-2 text-xs sm:text-sm font-bold text-amber-800 dark:text-amber-200">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>ขณะนี้อยู่ในโหมดออฟไลน์ — ปิดการบันทึกและแก้ไขข้อมูลชั่วคราวจนกว่าสัญญาณอินเทอร์เน็ตจะกลับมา</span>
        </div>
      )}

      {toast && (
        <div
          className={`fixed top-16 right-4 z-50 rounded-xl px-4 py-3 shadow-xl border text-xs sm:text-sm font-bold transition ${
            toast.type === 'success'
              ? 'bg-emerald-600 text-white border-emerald-500'
              : 'bg-rose-600 text-white border-rose-500'
          }`}
        >
          {toast.message}
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white">
              Freight FleetLog — บัญชีเที่ยวรถและค่าขนส่ง
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
              บันทึกเที่ยวรถเข้า-ออก ค่าจ้างขนส่ง และซิงค์ข้อมูลตู้สินค้าจากระบบ C-TPAT อัตโนมัติ
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowChart((prev) => !prev)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-1.5"
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>{showChart ? 'ซ่อนกราฟ' : 'แสดงกราฟ'}</span>
          </button>

          <button
            type="button"
            onClick={loadPendingCtpat}
            className="min-h-[44px] px-3 rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-950/50 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 flex items-center gap-1.5"
          >
            <Link2 className="w-4 h-4" />
            <span>ซิงค์ C-TPAT</span>
          </button>

          <button
            type="button"
            disabled={exporting || loading}
            onClick={handleExport}
            className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
          >
            {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSpreadsheet className="w-4 h-4" />}
            <span>Export Excel</span>
          </button>

          <button
            type="button"
            disabled={isOffline}
            onClick={() => setEntryModal({ open: true, mode: 'create', data: null })}
            className="hidden md:flex min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold items-center gap-1.5 shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>บันทึกข้อมูลรถ (Manual)</span>
          </button>
        </div>
      </div>

      <FleetKpiCards kpi={kpi} />

      {showChart && <FleetAnalyticsChart dailyTrend={dailyTrend} />}

      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
            <div className="lg:col-span-2 flex items-center gap-1.5">
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                aria-label="วันที่เริ่มต้น"
              />
              <span className="text-slate-400 text-xs font-bold">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
                aria-label="วันที่สิ้นสุด"
              />
            </div>

            <select
              value={transType}
              onChange={(e) => { setTransType(e.target.value); setPage(1); }}
              className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
              aria-label="กรองประเภทรายการ"
            >
              <option value="ALL">ประเภท: ทั้งหมด</option>
              <option value="INBOUND">เข้า (INBOUND)</option>
              <option value="OUTBOUND">ออก (OUTBOUND)</option>
              <option value="OTHER">อื่นๆ (OTHER)</option>
            </select>

            <select
              value={providerType}
              onChange={(e) => { setProviderType(e.target.value); setPage(1); }}
              className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
              aria-label="กรองผู้ให้บริการ"
            >
              <option value="ALL">สังกัด: ทั้งหมด</option>
              <option value="VENDOR">VENDOR (จ้างนอก)</option>
              <option value="SNC">SNC (ภายใน)</option>
            </select>

            <select
              value={vehicleType}
              onChange={(e) => { setVehicleType(e.target.value); setPage(1); }}
              className="min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 text-xs font-semibold text-slate-800 dark:text-slate-100"
              aria-label="กรองประเภทรถ"
            >
              <option value="ALL">รถ/ตู้: ทั้งหมด</option>
              {vehicleOptions.map((vType) => (
                <option key={vType} value={vType}>{vType}</option>
              ))}
            </select>

            <div className="flex items-center gap-1.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="ค้นหาทะเบียน / ตู้ / PO..."
                  className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 pl-9 pr-3 text-xs text-slate-900 dark:text-slate-100"
                />
              </div>
              <button
                type="button"
                onClick={loadLogs}
                disabled={loading}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50"
                title="รีเฟรชข้อมูล"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {errorMsg && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-sm font-semibold text-center">
            {errorMsg}
          </div>
        )}

        {loading ? (
          <div className="py-14 text-center text-slate-500 flex flex-col items-center gap-2">
            <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
            <span className="text-sm font-medium">กำลังโหลดข้อมูลบัญชีเที่ยวรถ...</span>
          </div>
        ) : logs.length === 0 ? (
          <div className="py-14 text-center text-slate-400 dark:text-slate-500 text-sm">
            ไม่มีข้อมูลเที่ยวรถในช่วงวันที่หรือเงื่อนไขที่เลือก
          </div>
        ) : (
          <>
            {/* Mobile Card Layout (375px-friendly) */}
            <div className="md:hidden divide-y divide-slate-200 dark:divide-slate-800">
              {logs.map((row) => {
                const isAuto = row.loading_report_id !== null;
                return (
                  <div key={row.log_id} className="p-3.5 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          {formatTimestampDisplay(row.log_timestamp)}
                        </p>
                        <p className="text-sm font-extrabold text-blue-600 dark:text-blue-400 mt-0.5">
                          {row.car_license || row.ref_document || '-'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <TransTypeBadge type={row.trans_type} />
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300">
                          {row.vehicle_type}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-2.5">
                      <div>
                        <span className="text-slate-400 block">สังกัด / อ้างอิง</span>
                        <span className="font-bold">{row.provider_type}</span>
                        {row.ref_document && <span className="block text-[11px] text-slate-500">{row.ref_document}</span>}
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 block">ค่าขนส่ง</span>
                        <CostPreviewBadge amount={row.transport_cost} />
                      </div>
                      {(row.container_no || row.seal_no) && (
                        <div className="col-span-2">
                          <span className="text-slate-400">ตู้/ซีล: </span>
                          <span className="font-semibold">{row.container_no || '-'}</span>
                          {row.seal_no && <span className="ml-2 text-emerald-600 dark:text-emerald-400">({row.seal_no})</span>}
                        </div>
                      )}
                      {row.remark && (
                        <div className="col-span-2 text-slate-500 dark:text-slate-400">
                          หมายเหตุ: {row.remark}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <span className="text-[11px] text-slate-400">ผู้บันทึก: {row.admin_name}</span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setQuickCostRow(row)}
                          className="min-h-[44px] px-3 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 text-xs font-bold flex items-center gap-1"
                        >
                          <Banknote className="w-4 h-4" /> ค่าขนส่ง
                        </button>
                        {!isAuto ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEntryModal({ open: true, mode: 'edit', data: row })}
                              className="min-w-[44px] min-h-[44px] rounded-lg bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400 flex items-center justify-center"
                              aria-label="แก้ไข"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteRow(row)}
                              className="min-w-[44px] min-h-[44px] rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center"
                              aria-label="ลบ"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className="px-2.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> Auto
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Fluid Table */}
            <div className="hidden md:block overflow-x-auto max-h-[600px]">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead className="sticky top-0 z-10 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs uppercase font-bold border-b border-slate-200 dark:border-slate-700">
                  <tr>
                    <th className="px-3 py-3 whitespace-nowrap">วัน/เวลา</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">ประเภท</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">สังกัด</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">รถ/ตู้</th>
                    <th className="px-3 py-3 whitespace-nowrap">ทะเบียนรถ / เอกสาร</th>
                    <th className="px-3 py-3 whitespace-nowrap">เลขตู้ &amp; ซีล</th>
                    <th className="px-3 py-3 text-right whitespace-nowrap">ค่าขนส่ง (฿)</th>
                    <th className="px-3 py-3">หมายเหตุ</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">ผู้บันทึก</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">จัดการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {logs.map((row) => {
                    const isAuto = row.loading_report_id !== null;
                    return (
                      <tr key={row.log_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="px-3 py-2.5 font-semibold text-slate-800 dark:text-slate-200 whitespace-nowrap tabular-nums">
                          {formatTimestampDisplay(row.log_timestamp)}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <TransTypeBadge type={row.trans_type} />
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap font-bold">
                          <span className="inline-flex items-center gap-1 text-xs">
                            {row.provider_type === 'VENDOR' ? (
                              <Handshake className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                            )}
                            <span>{row.provider_type}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span className="inline-block rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-2 py-0.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                            {row.vehicle_type}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="font-bold text-blue-600 dark:text-blue-400">{row.car_license || '-'}</div>
                          {row.ref_document && <div className="text-xs text-slate-400">{row.ref_document}</div>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {row.container_no ? (
                            <div className="font-bold text-slate-800 dark:text-slate-200">{row.container_no}</div>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                          {row.seal_no && (
                            <div className="text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                              <Lock className="w-3 h-3" /> {row.seal_no}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right whitespace-nowrap">
                          <CostPreviewBadge amount={row.transport_cost} />
                        </td>
                        <td className="px-3 py-2.5 max-w-[200px] text-xs text-slate-500 dark:text-slate-400 break-words">
                          {row.remark || '-'}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          {row.admin_name}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setQuickCostRow(row)}
                              title="อัปเดตค่าขนส่ง"
                              className="min-w-[36px] min-h-[36px] rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center"
                            >
                              <Banknote className="w-4 h-4" />
                            </button>

                            {!isAuto ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setEntryModal({ open: true, mode: 'edit', data: row })}
                                  title="แก้ไขข้อมูล"
                                  className="min-w-[36px] min-h-[36px] rounded-lg text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/50 flex items-center justify-center"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setDeleteRow(row)}
                                  title="ลบรายการ"
                                  className="min-w-[36px] min-h-[36px] rounded-lg text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 flex items-center justify-center"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 text-[11px] font-bold text-slate-500"
                                title="ซิงค์อัตโนมัติจากระบบ C-TPAT"
                              >
                                <Link2 className="w-3 h-3" /> Auto
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Pagination Footer */}
        <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-2">
            <span>
              แสดงหน้า <strong>{pagination.page}</strong> / {pagination.total_pages} (ทั้งหมด{' '}
              <strong>{(pagination.total_rows || 0).toLocaleString()}</strong> รายการ)
            </span>
            <select
              value={limit}
              onChange={(e) => { setLimit(Number(e.target.value)); setPage(1); }}
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs font-semibold"
              aria-label="จำนวนรายการต่อหน้า"
            >
              <option value={25}>25 / หน้า</option>
              <option value={50}>50 / หน้า</option>
              <option value={100}>100 / หน้า</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={pagination.page <= 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-bold flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={pagination.page >= pagination.total_pages || loading}
              onClick={() => setPage((prev) => prev + 1)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-40 font-bold flex items-center gap-1"
            >
              ถัดไป <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Floating Action Button */}
      <button
        type="button"
        disabled={isOffline}
        onClick={() => setEntryModal({ open: true, mode: 'create', data: null })}
        aria-label="บันทึกข้อมูลรถ"
        className="md:hidden fixed bottom-6 right-5 z-40 w-14 h-14 rounded-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white shadow-xl flex items-center justify-center active:scale-95 transition"
      >
        <Plus className="w-6 h-6" />
      </button>

      <FleetEntryModal
        isOpen={entryModal.open}
        mode={entryModal.mode}
        initialData={entryModal.data}
        onClose={() => setEntryModal({ open: false, mode: 'create', data: null })}
        onSubmit={handleSaveEntry}
        isOffline={isOffline}
      />

      <QuickCostModal
        isOpen={Boolean(quickCostRow)}
        rowData={quickCostRow}
        onClose={() => setQuickCostRow(null)}
        onSubmit={handleQuickCostSave}
        isOffline={isOffline}
      />

      <PendingCtpatModal
        isOpen={pendingModalOpen}
        pendingList={pendingList}
        loading={pendingLoading}
        onClose={() => setPendingModalOpen(false)}
        onSync={handleSyncCtpat}
        isOffline={isOffline}
      />

      <DeleteFleetModal
        isOpen={Boolean(deleteRow)}
        rowData={deleteRow}
        onClose={() => setDeleteRow(null)}
        onConfirm={handleConfirmDelete}
        isOffline={isOffline}
      />
    </div>
  );
}

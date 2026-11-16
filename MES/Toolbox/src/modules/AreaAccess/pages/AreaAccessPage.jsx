import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Clock,
  Edit3,
  FileSpreadsheet,
  LogOut,
  MapPin,
  QrCode,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { areaAccessApi } from '../../../shared/services/areaAccessApi';
import { EditAccessModal, ScanAccessModal } from '../components/AreaAccessModals';
import { playAreaBeep } from '../utils/areaAccessHelpers';

function getTodayStr() {
  return new Date().toLocaleDateString('en-CA');
}

function formatDuration(mins) {
  const num = Number(mins) || 0;
  if (num >= 60) {
    return `${Math.floor(num / 60)} ชม. ${num % 60} น.`;
  }
  return `${num} นาที`;
}

/**
 * Self-contained Area Access Log SPA page (Warehouse / Restricted Area Gate Control).
 */
export default function AreaAccessPage() {
  const { user } = useAuth();
  const canAdminClear = ['creator', 'admin', 'supervisor'].includes((user?.role || '').toLowerCase());

  const [isOnline, setIsOnline] = useState(() => (typeof navigator !== 'undefined' ? navigator.onLine : true));
  const [locations, setLocations] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [defaultLocationId, setDefaultLocationId] = useState('');

  const [startDate, setStartDate] = useState(getTodayStr);
  const [endDate, setEndDate] = useState(getTodayStr);
  const [filterLoc, setFilterLoc] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);

  const [logs, setLogs] = useState([]);
  const [kpi, setKpi] = useState({ total_trans: 0, total_inside: 0, total_overdue: 0 });
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total_rows: 0, total_pages: 1 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  const [scanOpen, setScanOpen] = useState(false);
  const [editRow, setEditRow] = useState(null);
  const [confirmCheckoutRow, setConfirmCheckoutRow] = useState(null);
  const [checkoutBusy, setCheckoutBusy] = useState(false);

  useEffect(() => {
    const onUp = () => setIsOnline(true);
    const onDown = () => setIsOnline(false);
    window.addEventListener('online', onUp);
    window.addEventListener('offline', onDown);
    return () => {
      window.removeEventListener('online', onUp);
      window.removeEventListener('offline', onDown);
    };
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    if (!toast) return undefined;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const showNotice = (type, message) => setToast({ type, message });

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const [locRes, empRes] = await Promise.all([
          areaAccessApi.getLocations(),
          areaAccessApi.getAutocomplete(),
        ]);
        if (!active) return;
        const locs = Array.isArray(locRes.data) ? locRes.data : [];
        setLocations(locs);
        setEmployees(Array.isArray(empRes.data) ? empRes.data : []);
        const storeMatch = locs.find((l) => {
          const upper = (l.location_name || '').toUpperCase();
          return upper.includes('STORE') || upper.includes('สโตร์') || upper.includes('คลัง');
        });
        if (storeMatch) {
          const idStr = String(storeMatch.location_id);
          setDefaultLocationId(idStr);
          setFilterLoc(idStr);
        }
      } catch {
        /* handled smoothly when loading history */
      }
    })();
    return () => { active = false; };
  }, []);

  const loadHistory = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await areaAccessApi.getHistory({
        start_date: startDate,
        end_date: endDate,
        filter_loc: filterLoc || 0,
        status: statusFilter,
        search: debouncedSearch,
        page,
        limit: 50,
      });
      const payload = res.data || {};
      setLogs(Array.isArray(payload.logs) ? payload.logs : []);
      setKpi(payload.kpi || { total_trans: 0, total_inside: 0, total_overdue: 0 });
      setPagination(payload.pagination || { page: 1, limit: 50, total_rows: 0, total_pages: 1 });
    } catch (err) {
      if (!silent) showNotice('error', err?.message || 'ไม่สามารถโหลดข้อมูลการเข้า-ออกพื้นที่ได้');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [startDate, endDate, filterLoc, statusFilter, debouncedSearch, page]);

  useEffect(() => {
    loadHistory(false);
  }, [loadHistory]);

  useEffect(() => {
    const id = setInterval(() => {
      if (!scanOpen && !editRow && !confirmCheckoutRow && isOnline) {
        loadHistory(true);
      }
    }, 60000);
    return () => clearInterval(id);
  }, [loadHistory, scanOpen, editRow, confirmCheckoutRow, isOnline]);

  const handleExportExcel = async () => {
    try {
      const res = await areaAccessApi.exportRows({
        start_date: startDate,
        end_date: endDate,
        filter_loc: filterLoc || 0,
        status: statusFilter,
        search: debouncedSearch,
      });
      const rows = Array.isArray(res.data) ? res.data : [];
      if (rows.length === 0) {
        showNotice('warning', 'ไม่มีข้อมูลสำหรับส่งออกตามเงื่อนไขที่เลือก');
        return;
      }
      const XLSX = await import('xlsx');
      const sheetData = [
        ['สถานะ', 'รหัสพนักงาน', 'ชื่อ-นามสกุล', 'สังกัด (Line)', 'แผนก', 'เวลาเข้า (IN)', 'เวลาออก (OUT)', 'ระยะเวลา (นาที)', 'สถานที่', 'หมายเหตุ'],
        ...rows.map((r) => [
          r.status,
          r.emp_id,
          r.emp_name,
          r.line_name,
          r.department_api,
          r.scan_in || '-',
          r.scan_out || '-',
          r.duration_mins ?? 0,
          r.location_name,
          r.purpose || '-',
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(sheetData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Area_Access_Log');
      const suffix = startDate === endDate ? startDate : `${startDate}_to_${endDate}`;
      XLSX.writeFile(wb, `Area_Access_Log_${suffix}.xlsx`);
      showNotice('success', `ส่งออกข้อมูลจำนวน ${rows.length} รายการเรียบร้อยแล้ว`);
    } catch (err) {
      showNotice('error', err?.message || 'ไม่สามารถส่งออกไฟล์ Excel ได้');
    }
  };

  const handleForceCheckout = async () => {
    if (!confirmCheckoutRow || !isOnline) return;
    setCheckoutBusy(true);
    try {
      const res = await areaAccessApi.forceCheckout(confirmCheckoutRow.log_id);
      playAreaBeep('success');
      showNotice('success', res.message || 'เช็คเอาท์สำเร็จ');
      setConfirmCheckoutRow(null);
      loadHistory(false);
    } catch (err) {
      playAreaBeep('error');
      showNotice('error', err?.message || 'ไม่สามารถเช็คเอาท์ได้');
    } finally {
      setCheckoutBusy(false);
    }
  };

  const handleClearGhost = async () => {
    if (!isOnline) return;
    try {
      const res = await areaAccessApi.autoClearGhost();
      showNotice('success', res.message || 'ปิดรายการค้างเกิน 12 ชม. เรียบร้อยแล้ว');
      loadHistory(false);
    } catch (err) {
      showNotice('error', err?.message || 'ไม่สามารถปิดรายการค้างได้');
    }
  };

  return (
    <div className="w-full p-3 sm:p-5 space-y-4 pb-24 md:pb-6">
      {!isOnline && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 dark:bg-amber-950/40 dark:border-amber-700 px-4 py-2.5 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300 font-medium">
          <WifiOff size={18} />
          <span>เครือข่ายออฟไลน์ — ปิดการสแกนเข้า-ออกและแก้ไขข้อมูลชั่วคราวจนกว่าจะเชื่อมต่อได้</span>
        </div>
      )}

      {toast && (
        <div
          className={`rounded-xl px-4 py-2.5 text-sm font-semibold border shadow-sm ${
            toast.type === 'error'
              ? 'bg-red-50 text-red-700 border-red-200'
              : toast.type === 'warning'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400 flex items-center justify-center shrink-0">
            <ShieldCheck size={24} />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
              Area Access Log (ควบคุมการเข้า-ออกพื้นที่หวงห้าม)
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              บันทึกและติดตามผู้เข้า-ออกพื้นที่ Store / คลังสินค้า / พื้นที่จำกัดสิทธิ์แบบเรียลไทม์
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canAdminClear && (
            <button
              type="button"
              disabled={!isOnline}
              onClick={handleClearGhost}
              className="min-h-[44px] px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-xs sm:text-sm font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50"
            >
              ปิดรายการค้าง &gt;12 ชม.
            </button>
          )}
          <button
            type="button"
            disabled={!isOnline}
            onClick={handleExportExcel}
            className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-1.5 disabled:opacity-50"
          >
            <FileSpreadsheet size={16} />
            <span>Export Excel</span>
          </button>
          <button
            type="button"
            disabled={!isOnline}
            onClick={() => setScanOpen(true)}
            className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 shadow-sm disabled:opacity-50"
          >
            <QrCode size={18} />
            <span>สแกนเข้า-ออก</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => { setStatusFilter('ALL'); setPage(1); }}
          className={`text-left rounded-2xl p-4 bg-white dark:bg-gray-800 border-l-4 border-slate-500 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between transition ${
            statusFilter === 'ALL' ? 'ring-2 ring-blue-400/50' : ''
          }`}
        >
          <div>
            <div className="text-xs font-bold uppercase text-gray-500 dark:text-gray-400">
              รายการเคลื่อนไหว (วันนี้)
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-gray-800 dark:text-white mt-1">
              {kpi.total_trans}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 flex items-center justify-center">
            <ArrowLeftRight size={22} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'IN' ? 'ALL' : 'IN'); setPage(1); }}
          className={`text-left rounded-2xl p-4 bg-white dark:bg-gray-800 border-l-4 border-emerald-500 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between transition ${
            statusFilter === 'IN' ? 'ring-2 ring-emerald-400/70' : ''
          }`}
        >
          <div>
            <div className="text-xs font-bold uppercase text-emerald-600 dark:text-emerald-400">
              บุคคลที่อยู่ในพื้นที่ (IN)
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
              {kpi.total_inside}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Users size={22} />
          </div>
        </button>

        <button
          type="button"
          onClick={() => { setStatusFilter(statusFilter === 'OVERDUE' ? 'ALL' : 'OVERDUE'); setPage(1); }}
          className={`text-left rounded-2xl p-4 bg-white dark:bg-gray-800 border-l-4 border-red-500 border border-gray-200 dark:border-gray-700 shadow-sm flex items-center justify-between transition ${
            statusFilter === 'OVERDUE' ? 'ring-2 ring-red-400/70' : ''
          }`}
        >
          <div>
            <div className="text-xs font-bold uppercase text-red-600 dark:text-red-400">
              ค้างในพื้นที่ &gt; 2 ชม. (ALERT)
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold text-red-600 dark:text-red-400 mt-1">
              {kpi.total_overdue}
            </div>
          </div>
          <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 flex items-center justify-center">
            <AlertTriangle size={22} />
          </div>
        </button>
      </div>

      {/* Filter Bar & Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700 grid grid-cols-1 md:grid-cols-12 gap-2.5 items-center">
          <div className="md:col-span-3 relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหารหัส, ชื่อ, หมายเหตุ..."
              className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            />
          </div>

          <div className="md:col-span-3 relative">
            <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
            <select
              value={filterLoc}
              onChange={(e) => { setFilterLoc(e.target.value); setPage(1); }}
              className="w-full min-h-[44px] pl-8 pr-3 py-2 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            >
              <option value="">-- ทุกสถานที่ --</option>
              {locations.map((loc) => (
                <option key={loc.location_id} value={String(loc.location_id)}>
                  {loc.location_name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            >
              <option value="ALL">ทุกสถานะ</option>
              <option value="IN">อยู่ในพื้นที่ (IN)</option>
              <option value="OUT">ออกแล้ว (OUT)</option>
              <option value="OVERDUE">ค้างเกิน 2 ชม.</option>
            </select>
          </div>

          <div className="md:col-span-4 flex flex-wrap sm:flex-nowrap items-center gap-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="flex-1 min-w-0 min-h-[44px] px-2.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            />
            <span className="text-gray-400 text-xs">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="flex-1 min-w-0 min-h-[44px] px-2.5 py-2 text-xs sm:text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-900"
            />
            <button
              type="button"
              onClick={() => loadHistory(false)}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 shrink-0"
              title="รีเฟรชข้อมูล"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/70 text-xs font-bold uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th className="px-4 py-3">สถานะ</th>
                <th className="px-4 py-3">รหัส / ชื่อพนักงาน</th>
                <th className="px-4 py-3">สังกัด / แผนก</th>
                <th className="px-4 py-3">เวลาเข้า (IN)</th>
                <th className="px-4 py-3">เวลาออก (OUT)</th>
                <th className="px-4 py-3">ระยะเวลา</th>
                <th className="px-4 py-3">สถานที่ / หมายเหตุ</th>
                <th className="px-4 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {loading && logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    กำลังโหลดข้อมูลการเข้า-ออกพื้นที่...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                    ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                logs.map((r) => {
                  const isIn = r.status === 'IN';
                  const overdue = isIn && Number(r.duration_mins) > 120;
                  return (
                    <tr
                      key={r.log_id}
                      className={isIn ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'}
                    >
                      <td className="px-4 py-3">
                        {isIn ? (
                          <button
                            type="button"
                            disabled={!isOnline}
                            onClick={() => setConfirmCheckoutRow(r)}
                            className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white inline-flex items-center gap-1 disabled:opacity-50"
                            title="คลิกเพื่อเช็คเอาท์ทันที"
                          >
                            <LogOut size={12} />
                            <span>IN</span>
                          </button>
                        ) : (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                            OUT
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-blue-700 dark:text-blue-400">{r.emp_id}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-300">{r.emp_name}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{r.line_name}</div>
                        <div className="text-xs text-gray-500">{r.department_api}</div>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">{r.scan_in ? r.scan_in.slice(11, 16) : '-'}</td>
                      <td className="px-4 py-3 font-mono text-xs">{r.scan_out ? r.scan_out.slice(11, 16) : '-'}</td>
                      <td className={`px-4 py-3 text-xs font-semibold ${overdue ? 'text-red-600 font-bold' : 'text-gray-600 dark:text-gray-300'}`}>
                        {formatDuration(r.duration_mins)}
                      </td>
                      <td className="px-4 py-3 max-w-[240px]">
                        <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">{r.location_name}</div>
                        <div className="text-xs text-gray-500 truncate">{r.purpose || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => setEditRow(r)}
                          className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
                          title="แก้ไขเวลาเข้า-ออก"
                        >
                          <Edit3 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Cards (375px-friendly) */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {loading && logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">กำลังโหลดข้อมูล...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-sm text-gray-400">ไม่พบข้อมูลตามเงื่อนไขที่เลือก</div>
          ) : (
            logs.map((r) => {
              const isIn = r.status === 'IN';
              const overdue = isIn && Number(r.duration_mins) > 120;
              return (
                <div key={r.log_id} className={`p-3.5 space-y-2 ${isIn ? 'bg-emerald-50/40 dark:bg-emerald-950/10' : ''}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-bold text-blue-700 dark:text-blue-400 text-sm truncate">
                        {r.emp_id} • {r.emp_name}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {r.location_name} • {r.line_name}
                      </div>
                    </div>
                    {isIn ? (
                      <button
                        type="button"
                        disabled={!isOnline}
                        onClick={() => setConfirmCheckoutRow(r)}
                        className="min-h-[44px] px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center gap-1 shrink-0"
                      >
                        <LogOut size={14} /> <span>เช็คเอาท์</span>
                      </button>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 shrink-0">
                        OUT
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                    <div className="flex items-center gap-1.5 font-mono">
                      <Clock size={13} />
                      <span>เข้า {r.scan_in ? r.scan_in.slice(11, 16) : '-'}</span>
                      <span>•</span>
                      <span>ออก {r.scan_out ? r.scan_out.slice(11, 16) : '-'}</span>
                    </div>
                    <span className={overdue ? 'text-red-600 font-bold' : ''}>{formatDuration(r.duration_mins)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1">
                    <span className="text-xs text-gray-500 truncate">{r.purpose || 'ไม่มีหมายเหตุ'}</span>
                    <button
                      type="button"
                      onClick={() => setEditRow(r)}
                      className="min-h-[44px] px-3 rounded-xl border border-gray-300 dark:border-gray-600 text-xs font-semibold flex items-center gap-1 shrink-0"
                    >
                      <Edit3 size={14} /> <span>แก้ไข</span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
          <div>
            ทั้งหมด {pagination.total_rows} รายการ (หน้า {pagination.page} / {pagination.total_pages})
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] px-3.5 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold disabled:opacity-40"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= pagination.total_pages}
              onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
              className="min-h-[44px] px-3.5 rounded-xl border border-gray-300 dark:border-gray-600 font-semibold disabled:opacity-40"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Scan Button */}
      <div className="fixed bottom-4 right-4 md:hidden z-40">
        <button
          type="button"
          disabled={!isOnline}
          onClick={() => setScanOpen(true)}
          className="min-h-[52px] min-w-[52px] px-4 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-xl flex items-center justify-center gap-2 font-bold disabled:opacity-50"
          aria-label="สแกนเข้า-ออกพื้นที่"
        >
          <QrCode size={22} />
          <span className="text-xs">สแกน</span>
        </button>
      </div>

      <ScanAccessModal
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        locations={locations}
        defaultLocationId={defaultLocationId}
        employees={employees}
        isOnline={isOnline}
        onSuccess={(msg) => {
          showNotice('success', msg);
          loadHistory(false);
        }}
      />

      <EditAccessModal
        row={editRow}
        onClose={() => setEditRow(null)}
        isOnline={isOnline}
        onSaved={(msg) => {
          showNotice('success', msg);
          setEditRow(null);
          loadHistory(false);
        }}
      />

      {confirmCheckoutRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 p-5 shadow-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <h3 className="text-base font-bold text-gray-900 dark:text-white">ยืนยันการเช็คเอาท์ออกจากพื้นที่</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              ต้องการบันทึกเช็คเอาท์ให้ <strong>{confirmCheckoutRow.emp_id} - {confirmCheckoutRow.emp_name}</strong> ออกจากพื้นที่{' '}
              <strong>{confirmCheckoutRow.location_name}</strong> ในเวลานี้ใช่หรือไม่?
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmCheckoutRow(null)}
                className="min-h-[44px] px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={checkoutBusy}
                onClick={handleForceCheckout}
                className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold disabled:opacity-50"
              >
                {checkoutBusy ? 'กำลังบันทึก...' : 'ยืนยันเช็คเอาท์'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

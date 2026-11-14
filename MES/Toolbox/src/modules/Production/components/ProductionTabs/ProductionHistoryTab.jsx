import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2, Clock, Edit3, FileSpreadsheet, PackagePlus, PauseCircle,
  Plus, RefreshCw, Search, Trash2, X, XCircle, ArrowRightLeft
} from 'lucide-react';
import * as XLSX from 'xlsx';
import Pagination from '../../../../shared/components/Pagination';
import { productionApi } from '../../../../shared/services/productionApi';
import { useConfirm, useToast } from '../../../../shared/contexts/FeedbackContext';
import ItemSearchSelect from '../ItemSearchSelect';
import OperatorMultiSelect from '../OperatorMultiSelect';

const todayIso = () => new Date().toISOString().slice(0, 10);

const HOUR_SLOTS = Array.from({ length: 24 }, (_, hr) => {
  const start = String(hr).padStart(2, '0');
  const end = String((hr + 1) % 24).padStart(2, '0');
  return {
    value: `${start}:00:00|${start}:59:59`,
    label: `${start}:00 - ${end}:00`,
  };
});

const getDefaultHourSlot = () => {
  const hr = String(new Date().getHours()).padStart(2, '0');
  return `${hr}:00:00|${hr}:59:59`;
};

const TYPE_BADGE = {
  PRODUCTION_FG: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
  PRODUCTION_HOLD: 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300',
  PRODUCTION_SCRAP: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300',
  RECEIPT: 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300',
  TRANSFER: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
  INTERNAL_TRANSFER: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-300',
  ADJUSTMENT: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200',
};

/**
 * Production Execution History, Receipt/Transfer Log, Record Production & Receipt Modals.
 */
export default function ProductionHistoryTab({ metadata, isOffline }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [mode, setMode] = useState('production'); // 'production' | 'receipt' | 'all'
  const [startDate, setStartDate] = useState(todayIso);
  const [endDate, setEndDate] = useState(todayIso);
  const [locationId, setLocationId] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [rows, setRows] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [summary, setSummary] = useState({});
  const [hourlyCounts, setHourlyCounts] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modals
  const [prodModalOpen, setProdModalOpen] = useState(false);
  const [receiptModalOpen, setReceiptModalOpen] = useState(false);
  const [editModalTxn, setEditModalTxn] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Record Production Form State
  const [prodForm, setProdForm] = useState({
    item_id: '',
    location_id: '',
    machine_id: '',
    log_date: todayIso(),
    time_slot: getDefaultHourSlot(),
    fg_qty: '',
    hold_qty: '',
    scrap_qty: '',
    scrap_reason: '',
    lot_no: '',
    notes: '',
    team_user_ids: [],
  });

  // Record Receipt / Transfer Form State
  const [receiptForm, setReceiptForm] = useState({
    transaction_type: 'RECEIPT',
    item_id: '',
    from_location_id: '',
    to_location_id: '',
    quantity: '',
    log_date: todayIso(),
    log_time: new Date().toTimeString().slice(0, 8),
    lot_no: '',
    notes: '',
  });

  // Edit Transaction Form State
  const [editForm, setEditForm] = useState({
    quantity: '',
    log_date: todayIso(),
    log_time: '12:00:00',
    location_id: '',
    from_location_id: '',
    to_location_id: '',
    lot_no: '',
    notes: '',
  });

  const locations = metadata?.locations || [];
  const items = metadata?.items || [];
  const machines = metadata?.machines || [];
  const canManage = Boolean(metadata?.current_user?.can_manage);

  const lineLocations = useMemo(
    () => locations.filter((l) => ['WIP', 'FG'].includes(String(l.location_type || '').toUpperCase())),
    [locations]
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {
        start_date: startDate,
        end_date: endDate,
        location_id: locationId,
        search: searchText.trim(),
        page,
        limit: pageSize,
      };
      const histFn =
        mode === 'production'
          ? productionApi.getProductionHistory
          : mode === 'receipt'
            ? productionApi.getReceiptHistory
            : productionApi.getAllTransactions;

      const sumFn =
        mode === 'receipt' ? productionApi.getReceiptSummary : productionApi.getProductionSummary;

      const requests = [histFn(params), sumFn(params)];
      if (mode === 'production') {
        requests.push(productionApi.getHourlyCounts(params));
      }

      const [histRes, sumRes, hrRes] = await Promise.all(requests);
      setRows(histRes?.data?.rows || []);
      setTotalItems(histRes?.data?.pagination?.total || 0);
      setSummary(sumRes?.data || {});
      setHourlyCounts(hrRes?.data || []);
    } catch {
      // Handled globally by apiClient
    } finally {
      setLoading(false);
    }
  }, [mode, startDate, endDate, locationId, searchText, page, pageSize]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 200);
    return () => clearTimeout(timer);
  }, [loadData]);

  const handleQuickPreset = (daysBack) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    setStartDate(start.toISOString().slice(0, 10));
    setEndDate(end.toISOString().slice(0, 10));
    setPage(1);
  };

  const handleSubmitProduction = async (e) => {
    e.preventDefault();
    if (isOffline) return toast.warning('ขณะนี้อยู่ในโหมด Offline ไม่สามารถบันทึกข้อมูลได้');
    if (!prodForm.item_id || !prodForm.location_id) {
      return toast.warning('กรุณาเลือกสินค้าและไลน์ผลิต');
    }
    const fg = Number(prodForm.fg_qty || 0);
    const hold = Number(prodForm.hold_qty || 0);
    const scrap = Number(prodForm.scrap_qty || 0);
    if (fg <= 0 && hold <= 0 && scrap <= 0) {
      return toast.warning('กรุณาระบุจำนวนผลิต (FG / Hold / Scrap) อย่างน้อย 1 ช่องมากกว่า 0');
    }

    const [startTime, endTime] = (prodForm.time_slot || getDefaultHourSlot()).split('|');
    setSubmitting(true);
    try {
      const res = await productionApi.executeProduction({
        item_id: Number(prodForm.item_id),
        location_id: Number(prodForm.location_id),
        machine_id: prodForm.machine_id ? Number(prodForm.machine_id) : null,
        log_date: prodForm.log_date,
        start_time: startTime,
        end_time: endTime,
        fg_qty: fg,
        hold_qty: hold,
        scrap_qty: scrap,
        scrap_reason: prodForm.scrap_reason.trim(),
        lot_no: prodForm.lot_no.trim(),
        notes: prodForm.notes.trim(),
        team_user_ids: prodForm.team_user_ids,
      });
      const reqs = res?.data?.req_uuids || [];
      toast.success(
        reqs.length > 0
          ? `${res.message} (สร้างใบขอเบิกของทดแทนคลัง ${reqs.length} รายการ)`
          : res.message || 'บันทึกผลผลิตเรียบร้อยแล้ว'
      );
      setProdModalOpen(false);
      setProdForm((prev) => ({
        ...prev,
        fg_qty: '',
        hold_qty: '',
        scrap_qty: '',
        scrap_reason: '',
        notes: '',
      }));
      loadData();
    } catch {
      // Toast handled by apiClient
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitReceipt = async (e) => {
    e.preventDefault();
    if (isOffline) return toast.warning('ขณะนี้อยู่ในโหมด Offline ไม่สามารถบันทึกข้อมูลได้');
    if (!receiptForm.item_id || !receiptForm.to_location_id) {
      return toast.warning('กรุณาเลือกสินค้าและคลังปลายทาง');
    }
    if (receiptForm.transaction_type === 'TRANSFER' && !receiptForm.from_location_id) {
      return toast.warning('กรุณาเลือกคลังต้นทางสำหรับการโอนย้าย');
    }

    setSubmitting(true);
    try {
      const res = await productionApi.executeReceipt({
        ...receiptForm,
        item_id: Number(receiptForm.item_id),
        to_location_id: Number(receiptForm.to_location_id),
        from_location_id: receiptForm.from_location_id ? Number(receiptForm.from_location_id) : null,
        quantity: Number(receiptForm.quantity),
      });
      toast.success(res?.message || 'บันทึกรายการสำเร็จ');
      setReceiptModalOpen(false);
      setReceiptForm((prev) => ({ ...prev, quantity: '', notes: '', lot_no: '' }));
      loadData();
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const openEditModal = async (row) => {
    try {
      const res = await productionApi.getTransactionDetails(row.transaction_id);
      const detail = res?.data || row;
      const tsStr = String(detail.transaction_timestamp || '');
      const datePart = tsStr.slice(0, 10) || todayIso();
      const timePart = tsStr.slice(11, 19) || '12:00:00';
      setEditForm({
        quantity: String(Number(detail.quantity || 0)),
        log_date: datePart,
        log_time: timePart,
        location_id: String(detail.to_location_id || ''),
        from_location_id: String(detail.from_location_id || ''),
        to_location_id: String(detail.to_location_id || ''),
        lot_no: detail.reference_id || '',
        notes: detail.notes || '',
      });
      setEditModalTxn(detail);
    } catch {
      // Handled globally
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModalTxn || isOffline) return;
    setSubmitting(true);
    try {
      const res = await productionApi.updateTransaction({
        transaction_id: editModalTxn.transaction_id,
        quantity: Number(editForm.quantity),
        log_date: editForm.log_date,
        log_time: editForm.log_time,
        location_id: Number(editForm.location_id || editForm.to_location_id),
        to_location_id: Number(editForm.to_location_id),
        from_location_id: editForm.from_location_id ? Number(editForm.from_location_id) : null,
        lot_no: editForm.lot_no.trim(),
        notes: editForm.notes.trim(),
      });
      toast.success(res?.message || 'แก้ไขรายการสำเร็จ');
      setEditModalTxn(null);
      loadData();
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRow = async (row) => {
    if (isOffline) return toast.warning('ขณะนี้อยู่ในโหมด Offline');
    const ok = await confirm({
      title: 'ยืนยันการลบรายการผลิต / สต็อก?',
      message: `ต้องการลบรายการ #${row.transaction_id} (${row.sap_no} • จำนวน ${Number(row.quantity).toLocaleString()}) ใช่หรือไม่?\nระบบจะคำนวณและคืนยอดสต็อก On-Hand อัตโนมัติ`,
      confirmText: 'ยืนยันการลบ',
      danger: true,
    });
    if (!ok) return;

    try {
      const res = await productionApi.deleteTransaction(row.transaction_id);
      toast.success(res?.message || 'ลบรายการเรียบร้อยแล้ว');
      loadData();
    } catch {
      // Handled globally
    }
  };

  const handleExportExcel = () => {
    if (rows.length === 0) return toast.warning('ไม่มีข้อมูลสำหรับส่งออก');
    const exportRows = rows.map((r) => ({
      'Txn ID': r.transaction_id,
      'วัน-เวลา': String(r.transaction_timestamp || '').replace('T', ' ').slice(0, 19),
      'ประเภท': r.transaction_type,
      'SAP No': r.sap_no,
      'Part No': r.part_no,
      'รายละเอียด': r.part_description,
      'จำนวน': Number(r.quantity),
      'ต้นทาง': r.from_location_name || '-',
      'ปลายทาง / ไลน์': r.to_location_name || '-',
      'Lot / Ref': r.reference_id || '-',
      'ผู้ปฏิบัติงาน': r.team_member_names || r.created_by_name || '-',
      'หมายเหตุ': r.notes || '',
    }));
    const ws = XLSX.utils.json_to_sheet(exportRows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Production_Logs');
    XLSX.writeFile(wb, `Production_Logs_${startDate}_${endDate}.xlsx`);
  };

  return (
    <div className="space-y-4">
      {/* KPI Summary Cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/30">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-700 dark:text-emerald-300">
            <span>ยอดงานดี (FG)</span>
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-emerald-900 dark:text-emerald-100">
            {Number(summary.total_fg || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 dark:border-amber-900/50 dark:bg-amber-950/30">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-700 dark:text-amber-300">
            <span>ยอดรอตรวจสอบ (Hold)</span>
            <PauseCircle className="h-4 w-4" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-amber-900 dark:text-amber-100">
            {Number(summary.total_hold || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-700 dark:text-rose-300">
            <span>ยอดของเสีย (Scrap)</span>
            <XCircle className="h-4 w-4" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-rose-900 dark:text-rose-100">
            {Number(summary.total_scrap || 0).toLocaleString()}
          </div>
        </div>
        <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
          <div className="flex items-center justify-between text-xs font-semibold text-blue-700 dark:text-blue-300">
            <span>{mode === 'receipt' ? 'รับเข้า / โอนย้าย (รวม)' : 'จำนวนรายการทั้งหมด'}</span>
            <Clock className="h-4 w-4" />
          </div>
          <div className="mt-1.5 text-2xl font-black text-blue-900 dark:text-blue-100">
            {mode === 'receipt'
              ? (Number(summary.total_receipt || 0) + Number(summary.total_transfer || 0)).toLocaleString()
              : Number(summary.total_transactions || 0).toLocaleString()}
          </div>
        </div>
      </div>

      {/* Hourly Chips Bar for Production Mode */}
      {mode === 'production' && hourlyCounts.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            สรุปยอดผลิตรายชั่วโมง (Hourly Output Breakdown)
          </div>
          <div className="flex flex-wrap gap-2">
            {hourlyCounts.map((slot) => (
              <div
                key={slot.prod_hour}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs dark:border-slate-700 dark:bg-slate-800"
              >
                <span className="font-mono font-bold text-slate-700 dark:text-slate-200">
                  {String(slot.prod_hour).padStart(2, '0')}:00
                </span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  FG {Number(slot.fg_qty || 0).toLocaleString()}
                </span>
                {Number(slot.hold_qty) > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">H:{Number(slot.hold_qty)}</span>
                )}
                {Number(slot.scrap_qty) > 0 && (
                  <span className="text-rose-600 dark:text-rose-400">S:{Number(slot.scrap_qty)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action & Filter Toolbar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'production', label: 'ประวัติบันทึกผลผลิต' },
              { id: 'receipt', label: 'รับเข้า / โอนย้าย' },
              { id: 'all', label: 'ประวัติทั้งหมด' },
            ].map((sub) => (
              <button
                key={sub.id}
                type="button"
                onClick={() => {
                  setMode(sub.id);
                  setPage(1);
                }}
                className={`min-h-[44px] rounded-xl px-4 text-xs font-bold transition-colors ${
                  mode === sub.id
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                {sub.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={isOffline}
              onClick={() => setProdModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              บันทึกผลผลิต (OUT)
            </button>
            <button
              type="button"
              disabled={isOffline}
              onClick={() => setReceiptModalOpen(true)}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              <PackagePlus className="h-4 w-4" />
              รับเข้า / โอนย้าย (IN)
            </button>
            <button
              type="button"
              onClick={handleExportExcel}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
              Excel
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <div className="flex items-center gap-1.5 lg:col-span-2">
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setPage(1);
              }}
              aria-label="วันที่เริ่มต้น"
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
            <span className="text-xs text-slate-400">ถึง</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setPage(1);
              }}
              aria-label="วันที่สิ้นสุด"
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <select
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              setPage(1);
            }}
            aria-label="กรองตามสถานที่"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
          >
            <option value="ALL">ทุกสถานที่ / ทุกไลน์ผลิต</option>
            {locations.map((loc) => (
              <option key={loc.location_id} value={loc.location_id}>
                {loc.location_name} ({loc.location_type || '-'})
              </option>
            ))}
          </select>

          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              placeholder="ค้นหา SAP, Part No, Lot No, หมายเหตุ..."
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => handleQuickPreset(0)}
              className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              วันนี้
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(6)}
              className="min-h-[44px] flex-1 rounded-xl border border-slate-300 bg-slate-50 px-2 text-xs font-semibold hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              7 วัน
            </button>
            <button
              type="button"
              onClick={loadData}
              aria-label="รีเฟรชข้อมูล"
              className="flex min-h-[44px] w-11 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                <th className="px-3 py-3">วัน-เวลา</th>
                <th className="px-3 py-3">ประเภท</th>
                <th className="px-3 py-3">SAP / Part No</th>
                <th className="px-3 py-3 text-right">จำนวน</th>
                <th className="px-3 py-3">ไลน์ / คลัง</th>
                <th className="px-3 py-3">Lot / Job</th>
                <th className="px-3 py-3">ผู้บันทึก / ทีม</th>
                <th className="px-3 py-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    กำลังโหลดประวัติการทำงาน...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    ไม่พบรายการในช่วงเวลาที่เลือก
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  const canModify =
                    canManage || Number(row.created_by_user_id) === Number(metadata?.current_user?.id);
                  return (
                    <tr
                      key={row.transaction_id}
                      className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40"
                    >
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        <div>{String(row.transaction_timestamp || '').replace('T', ' ').slice(0, 16)}</div>
                        <div className="text-[10px] text-slate-400">#{row.transaction_id}</div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            TYPE_BADGE[row.transaction_type] || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {row.transaction_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-bold text-slate-900 dark:text-white">{row.part_no}</div>
                        <div className="text-[11px] text-slate-500">
                          {row.sap_no} • {row.part_description || '-'}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono text-sm font-extrabold text-slate-900 dark:text-white">
                        {Number(row.quantity || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-slate-700 dark:text-slate-300">
                        {row.from_location_name ? (
                          <span className="inline-flex items-center gap-1">
                            {row.from_location_name}
                            <ArrowRightLeft className="h-3 w-3 text-slate-400" />
                            {row.to_location_name || '-'}
                          </span>
                        ) : (
                          row.to_location_name || '-'
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">
                          {row.reference_id || '-'}
                        </div>
                        {row.notes && (
                          <div className="max-w-[180px] truncate text-[11px] text-slate-500" title={row.notes}>
                            {row.notes}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-[11px] text-slate-600 dark:text-slate-300">
                        {row.team_member_names || row.created_by_name || '-'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-center">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            disabled={!canModify || isOffline}
                            onClick={() => openEditModal(row)}
                            aria-label="แก้ไขรายการ"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={!canModify || isOffline}
                            onClick={() => handleDeleteRow(row)}
                            aria-label="ลบรายการ"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 disabled:opacity-30 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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

        <div className="mt-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
          />
        </div>
      </div>

      {/* Record Production Modal */}
      {prodModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">บันทึกผลผลิตประจำวัน</h3>
              <button
                type="button"
                onClick={() => setProdModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitProduction} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  สินค้า (Item) <span className="text-rose-500">*</span>
                </label>
                <ItemSearchSelect
                  items={items}
                  value={prodForm.item_id}
                  onSelect={(item) => setProdForm((p) => ({ ...p, item_id: item ? String(item.item_id) : '' }))}
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    ไลน์ผลิต / สถานที่ <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={prodForm.location_id}
                    onChange={(e) => setProdForm((p) => ({ ...p, location_id: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">-- เลือกไลน์ผลิต --</option>
                    {lineLocations.map((l) => (
                      <option key={l.location_id} value={l.location_id}>
                        {l.location_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    เครื่องจักร (ถ้ามี)
                  </label>
                  <select
                    value={prodForm.machine_id}
                    onChange={(e) => setProdForm((p) => ({ ...p, machine_id: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">-- ไม่ระบุเครื่องจักร --</option>
                    {machines.map((m) => (
                      <option key={m.machine_id} value={m.machine_id}>
                        {m.machine_code} - {m.machine_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">วันที่ผลิต</label>
                  <input
                    type="date"
                    required
                    value={prodForm.log_date}
                    onChange={(e) => setProdForm((p) => ({ ...p, log_date: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">ช่วงเวลา</label>
                  <select
                    value={prodForm.time_slot}
                    onChange={(e) => setProdForm((p) => ({ ...p, time_slot: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    {HOUR_SLOTS.map((slot) => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <label className="block text-[11px] font-bold text-emerald-700 dark:text-emerald-300">งานดี (FG)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={prodForm.fg_qty}
                    onChange={(e) => setProdForm((p) => ({ ...p, fg_qty: e.target.value }))}
                    placeholder="0"
                    className="mt-1 h-10 w-full rounded-lg border border-emerald-300 bg-white px-2 text-center text-base font-black text-emerald-700 dark:bg-slate-900"
                  />
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-900 dark:bg-amber-950/30">
                  <label className="block text-[11px] font-bold text-amber-700 dark:text-amber-300">Hold</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={prodForm.hold_qty}
                    onChange={(e) => setProdForm((p) => ({ ...p, hold_qty: e.target.value }))}
                    placeholder="0"
                    className="mt-1 h-10 w-full rounded-lg border border-amber-300 bg-white px-2 text-center text-base font-black text-amber-700 dark:bg-slate-900"
                  />
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 dark:border-rose-900 dark:bg-rose-950/30">
                  <label className="block text-[11px] font-bold text-rose-700 dark:text-rose-300">Scrap</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={prodForm.scrap_qty}
                    onChange={(e) => setProdForm((p) => ({ ...p, scrap_qty: e.target.value }))}
                    placeholder="0"
                    className="mt-1 h-10 w-full rounded-lg border border-rose-300 bg-white px-2 text-center text-base font-black text-rose-700 dark:bg-slate-900"
                  />
                </div>
              </div>

              {Number(prodForm.scrap_qty || 0) > 0 && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-rose-600">
                    สาเหตุของเสีย (จะสร้างใบขอเบิกทดแทนคลังให้อัตโนมัติ)
                  </label>
                  <input
                    type="text"
                    value={prodForm.scrap_reason}
                    onChange={(e) => setProdForm((p) => ({ ...p, scrap_reason: e.target.value }))}
                    placeholder="ระบุอาการเสีย เช่น รอยขีดข่วน, พ่นสีไม่ติด..."
                    className="min-h-[44px] w-full rounded-xl border border-rose-300 bg-white px-3 text-sm dark:bg-slate-800"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">เลขที่ Lot / Ref</label>
                  <input
                    type="text"
                    value={prodForm.lot_no}
                    onChange={(e) => setProdForm((p) => ({ ...p, lot_no: e.target.value }))}
                    placeholder="ระบุ Lot No."
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">หมายเหตุ</label>
                  <input
                    type="text"
                    value={prodForm.notes}
                    onChange={(e) => setProdForm((p) => ({ ...p, notes: e.target.value }))}
                    placeholder="บันทึกเพิ่มเติม..."
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <OperatorMultiSelect
                locationId={prodForm.location_id}
                date={prodForm.log_date}
                selectedIds={prodForm.team_user_ids}
                onChange={(ids) => setProdForm((p) => ({ ...p, team_user_ids: ids }))}
              />

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setProdModalOpen(false)}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] rounded-xl bg-emerald-600 px-6 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'ยืนยันบันทึกผลผลิต'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Receipt / Transfer Modal */}
      {receiptModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">รับวัตถุดิบเข้า / โอนย้ายระหว่างคลัง</h3>
              <button
                type="button"
                onClick={() => setReceiptModalOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitReceipt} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'RECEIPT', label: 'รับสินค้าเข้า (RECEIPT)' },
                  { id: 'TRANSFER', label: 'โอนย้ายสต็อก (TRANSFER)' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setReceiptForm((p) => ({ ...p, transaction_type: opt.id }))}
                    className={`min-h-[44px] rounded-xl border text-xs font-bold ${
                      receiptForm.transaction_type === opt.id
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-200'
                        : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  สินค้า <span className="text-rose-500">*</span>
                </label>
                <ItemSearchSelect
                  items={items}
                  value={receiptForm.item_id}
                  onSelect={(item) => setReceiptForm((p) => ({ ...p, item_id: item ? String(item.item_id) : '' }))}
                />
              </div>

              {receiptForm.transaction_type === 'TRANSFER' && (
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                    คลังต้นทาง <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={receiptForm.from_location_id}
                    onChange={(e) => setReceiptForm((p) => ({ ...p, from_location_id: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    <option value="">-- เลือกคลังต้นทาง --</option>
                    {locations.map((l) => (
                      <option key={l.location_id} value={l.location_id}>
                        {l.location_name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  คลังปลายทาง <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={receiptForm.to_location_id}
                  onChange={(e) => setReceiptForm((p) => ({ ...p, to_location_id: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">-- เลือกคลังปลายทาง --</option>
                  {locations.map((l) => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.location_name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">จำนวน *</label>
                  <input
                    type="number"
                    min="0.001"
                    step="any"
                    required
                    value={receiptForm.quantity}
                    onChange={(e) => setReceiptForm((p) => ({ ...p, quantity: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">เลข Lot / เอกสาร</label>
                  <input
                    type="text"
                    value={receiptForm.lot_no}
                    onChange={(e) => setReceiptForm((p) => ({ ...p, lot_no: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">วันที่</label>
                  <input
                    type="date"
                    required
                    value={receiptForm.log_date}
                    onChange={(e) => setReceiptForm((p) => ({ ...p, log_date: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">หมายเหตุ</label>
                  <input
                    type="text"
                    value={receiptForm.notes}
                    onChange={(e) => setReceiptForm((p) => ({ ...p, notes: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setReceiptModalOpen(false)}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] rounded-xl bg-blue-600 px-6 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {editModalTxn && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                แก้ไขรายการ #{editModalTxn.transaction_id}
              </h3>
              <button
                type="button"
                onClick={() => setEditModalTxn(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mb-3 rounded-xl bg-slate-50 p-3 text-xs dark:bg-slate-800">
              <div className="font-bold text-slate-800 dark:text-white">{editModalTxn.part_no}</div>
              <div className="text-slate-500">{editModalTxn.sap_no} • {editModalTxn.transaction_type}</div>
            </div>
            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">จำนวน *</label>
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  required
                  value={editForm.quantity}
                  onChange={(e) => setEditForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">วันที่</label>
                  <input
                    type="date"
                    required
                    value={editForm.log_date}
                    onChange={(e) => setEditForm((p) => ({ ...p, log_date: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">Lot / Ref</label>
                  <input
                    type="text"
                    value={editForm.lot_no}
                    onChange={(e) => setEditForm((p) => ({ ...p, lot_no: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-700 dark:text-slate-300">หมายเหตุ</label>
                <input
                  type="text"
                  value={editForm.notes}
                  onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setEditModalTxn(null)}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] rounded-xl bg-blue-600 px-5 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

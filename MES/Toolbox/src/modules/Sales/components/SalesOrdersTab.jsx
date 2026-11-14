import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown, ArrowUp, ArrowUpDown, Download, PackageSearch,
  Plus, RefreshCw, Search, Trash2, Upload, X,
} from 'lucide-react';
import { salesOrdersApi } from '../../../shared/services/salesApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import {
  downloadXlsxSheet,
  evaluateQaBadge,
  formatCurrencyThb,
  formatDisplayDate,
  formatInt,
  parseSalesImportFile,
} from '../utils/salesHelpers';
import SalesImportPreviewModal from './SalesImportPreviewModal';
import RmForecastModal from './RmForecastModal';

const INITIAL_NEW_ORDER = {
  po_number: '',
  sku: '',
  team: 'Team1',
  order_date: '',
  description: '',
  color: '',
  quantity: '',
  dc_location: '',
  loading_week: '',
  shipping_week: '',
  remark: '',
};

/**
 * Full Sales Orders Tracking tab with KPI filters, inline editing, FAIL-first QA guard,
 * custom order sequence controls, Excel import preview, and RM shortage forecast.
 */
export default function SalesOrdersTab({ isReadOnly, isOffline }) {
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total_all: 0, total_active: 0, wait_prod: 0, wait_load: 0, prod_done: 0 });
  const [totals, setTotals] = useState({ filtered_count: 0, filtered_qty: 0, filtered_usd: 0 });
  const [exchangeRate, setExchangeRate] = useState(32);

  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [dateType, setDateType] = useState('loading_date');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  const [reorderMode, setReorderMode] = useState(false);
  const [savingReorder, setSavingReorder] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [newOrder, setNewOrder] = useState(INITIAL_NEW_ORDER);
  const [creating, setCreating] = useState(false);

  const [importPreview, setImportPreview] = useState(null);
  const [forecastOpen, setForecastOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    salesOrdersApi
      .getExchangeRate()
      .then((res) => {
        const rate = Number(res?.data?.exchange_rate || 32);
        if (rate > 0) setExchangeRate(rate);
      })
      .catch(() => {});
  }, []);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesOrdersApi.read({
        status: statusFilter,
        date_type: dateType,
        start_date: startDate,
        end_date: endDate,
        search: debouncedSearch,
        page,
        page_size: pageSize,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
      if (res.summary) setSummary(res.summary);
      if (res.totals) setTotals(res.totals);
      setTotalRows(Number(res.pagination?.total_rows || 0));
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดข้อมูล Sales Orders ได้');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateType, startDate, endDate, debouncedSearch, page, pageSize, toast]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const handleInlineCellSave = async (row, field, rawNewVal) => {
    if (isReadOnly || isOffline) return;
    const prev = row[field] ?? '';
    const nextVal = String(rawNewVal ?? '');
    if (String(prev).slice(0, 10) === nextVal && field.includes('date')) return;
    if (String(prev) === nextVal) return;

    const qa = evaluateQaBadge(row);
    if ((field === 'inspection_date' || field === 'ticket_number') && (qa.isFail || qa.isPass)) {
      toast.warning('PO นี้ตรวจ QA เสร็จสิ้นแล้ว กรุณาแก้ไขในโมดูล iQMS เพื่อไม่ให้ประวัติการตรวจสูญหาย');
      return;
    }

    try {
      await salesOrdersApi.updateCell(row.id, field, nextVal);
      setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, [field]: nextVal } : r)));
      toast.success('บันทึกข้อมูลเรียบร้อย');
    } catch (err) {
      toast.error(err.message || 'อัปเดตข้อมูลไม่สำเร็จ');
    }
  };

  const handleToggleCheck = async (row, field, checked) => {
    if (isReadOnly || isOffline) return;
    if (field === 'insp') {
      const qa = evaluateQaBadge(row);
      if (qa.isFail) {
        toast.error('ไม่สามารถสลับสถานะ PO ที่ผลตรวจ QA เป็น FAIL ได้ กรุณาเปิดตรวจรอบใหม่ในระบบ iQMS');
        return;
      }
    }

    try {
      await salesOrdersApi.updateCheck(row.id, field, checked ? 1 : 0);
      await loadOrders();
      toast.success('อัปเดตสถานะเรียบร้อย');
    } catch (err) {
      toast.error(err.message || 'อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const handleMoveRow = (index, delta) => {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setRows((cur) => {
      const copy = [...cur];
      const [item] = copy.splice(index, 1);
      copy.splice(target, 0, item);
      return copy;
    });
  };

  const handleSaveReorder = async () => {
    if (isReadOnly || isOffline || rows.length === 0) return;
    setSavingReorder(true);
    try {
      await salesOrdersApi.reorderItems(rows.map((r) => r.id));
      toast.success('บันทึกลำดับการผลิตเรียบร้อย');
      setReorderMode(false);
      await loadOrders();
    } catch (err) {
      toast.error(err.message || 'บันทึกลำดับไม่สำเร็จ');
    } finally {
      setSavingReorder(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (isReadOnly || isOffline || creating) return;
    if (!newOrder.sku.trim()) {
      toast.error('กรุณาระบุรหัส SKU หรือรหัสสินค้า');
      return;
    }
    setCreating(true);
    try {
      await salesOrdersApi.createSingle(newOrder);
      toast.success('สร้างคำสั่งซื้อสำเร็จ');
      setCreateOpen(false);
      setNewOrder(INITIAL_NEW_ORDER);
      await loadOrders();
    } catch (err) {
      toast.error(err.message || 'สร้างคำสั่งซื้อไม่สำเร็จ');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteRow = async (row) => {
    if (isReadOnly || isOffline) return;
    const ok = await confirm({
      title: 'ยืนยันการลบคำสั่งซื้อ',
      message: `ต้องการลบ PO ${row.po_number || row.id} (SKU: ${row.sku}) ใช่หรือไม่? การลบไม่สามารถย้อนกลับได้`,
      confirmText: 'ยืนยันลบ',
      danger: true,
    });
    if (!ok) return;
    try {
      await salesOrdersApi.deleteSingle(row.id);
      toast.success('ลบคำสั่งซื้อเรียบร้อย');
      await loadOrders();
    } catch (err) {
      toast.error(err.message || 'ลบคำสั่งซื้อไม่สำเร็จ');
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await parseSalesImportFile(file);
      setImportPreview(parsed);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถอ่านไฟล์นำเข้าได้');
    }
  };

  const handleExportExcel = async () => {
    if (rows.length === 0) {
      toast.info('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }
    try {
      await downloadXlsxSheet(
        rows.map((r, i) => ({
          Seq: i + 1,
          'PO Number': r.po_number,
          SKU: r.sku,
          Description: r.description,
          Color: r.color,
          Team: r.team,
          Quantity: r.quantity,
          'Amount (USD)': Number(r.price || 0).toFixed(2),
          DC: r.dc_location,
          'Loading Week': r.loading_week,
          'Shipping Week': r.shipping_week,
          'Prod Start': formatDisplayDate(r.production_date),
          'Prod End': formatDisplayDate(r.production_end_date),
          'Loading Date': formatDisplayDate(r.loading_date),
          'QA Status': evaluateQaBadge(r).label,
          Ticket: r.ticket_number || '',
          Remark: r.remark || '',
        })),
        'SalesOrders',
        `Sales_Orders_${statusFilter}_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success('ส่งออก Excel สำเร็จ');
    } catch (err) {
      toast.error(err.message || 'ส่งออกไฟล์ไม่สำเร็จ');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const filteredThb = Number(totals.filtered_usd || 0) * exchangeRate;

  const kpis = [
    { key: 'ALL', label: 'ทั้งหมด (All)', value: summary.total_all, color: 'border-slate-300 bg-white dark:bg-slate-900 dark:border-slate-700' },
    { key: 'ACTIVE', label: 'กำลังดำเนินการ (Active)', value: summary.total_active, color: 'border-blue-300 bg-blue-50/70 dark:bg-blue-950/30 dark:border-blue-800' },
    { key: 'WAIT_PROD', label: 'รอผลิต (Wait Prod)', value: summary.wait_prod, color: 'border-amber-300 bg-amber-50/70 dark:bg-amber-950/30 dark:border-amber-800' },
    { key: 'WAIT_LOAD', label: 'รอโหลดตู้ (Wait Load)', value: summary.wait_load, color: 'border-indigo-300 bg-indigo-50/70 dark:bg-indigo-950/30 dark:border-indigo-800' },
    { key: 'PROD_DONE', label: 'โหลดตู้แล้ว (Loaded)', value: summary.prod_done, color: 'border-emerald-300 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {kpis.map((k) => {
          const active = statusFilter === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => {
                setStatusFilter(k.key);
                setPage(1);
              }}
              className={`min-h-[72px] rounded-xl border p-3.5 text-left transition ${k.color} ${
                active ? 'ring-2 ring-blue-600 shadow-sm' : 'opacity-85 hover:opacity-100'
              }`}
            >
              <div className="text-xs font-medium text-slate-600 dark:text-slate-300">{k.label}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatInt(k.value)}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <span>
              รายการตามตัวกรอง: <strong className="text-slate-900 dark:text-white">{formatInt(totals.filtered_count)}</strong> PO
            </span>
            <span>
              จำนวนรวม: <strong className="text-slate-900 dark:text-white">{formatInt(totals.filtered_qty)}</strong> pcs
            </span>
            <span>
              มูลค่ารวม: <strong className="text-emerald-600 dark:text-emerald-400">${formatCurrencyThb(totals.filtered_usd)} USD</strong>
              <span className="ml-1.5 text-slate-400">
                (≈ ฿{formatCurrencyThb(filteredThb)} @ {exchangeRate.toFixed(2)})
              </span>
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setForecastOpen(true)}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700"
            >
              <PackageSearch className="h-4 w-4" />
              <span>RM Shortage Forecast</span>
            </button>

            <button
              type="button"
              onClick={handleExportExcel}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            {!isReadOnly && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-600 px-3.5 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import Excel</span>
                </button>

                <button
                  type="button"
                  disabled={isOffline}
                  onClick={() => setCreateOpen(true)}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Plus className="h-4 w-4" />
                  <span>เพิ่ม PO ใหม่</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหา PO, SKU, รายละเอียด, Team, Booking, Ticket..."
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <select
            value={dateType}
            onChange={(e) => setDateType(e.target.value)}
            aria-label="ประเภทวันที่กรอง"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="loading_date">วันที่โหลดตู้ (Loading Date)</option>
            <option value="production_date">วันเริ่มผลิต (Prod Date)</option>
            <option value="inspection_date">วันตรวจ QA (Insp Date)</option>
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            aria-label="ตั้งแต่วันที่"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            aria-label="ถึงวันที่"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <div className="flex items-center gap-2">
            {!isReadOnly && (
              <button
                type="button"
                disabled={isOffline}
                onClick={() => (reorderMode ? handleSaveReorder() : setReorderMode(true))}
                className={`flex min-h-[44px] flex-1 items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold ${
                  reorderMode
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <ArrowUpDown className="h-4 w-4" />
                <span>{savingReorder ? 'กำลังบันทึก...' : reorderMode ? 'บันทึกลำดับ' : 'จัดลำดับ'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={loadOrders}
              disabled={loading}
              aria-label="รีเฟรชข้อมูล"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800/80 dark:text-slate-300">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">#</th>
                <th className="px-3 py-3 text-left font-semibold">PO Number / Team</th>
                <th className="px-3 py-3 text-left font-semibold">SKU / Description</th>
                <th className="px-3 py-3 text-right font-semibold">Qty / Value</th>
                <th className="px-3 py-3 text-left font-semibold">DC / Weeks</th>
                <th className="px-3 py-3 text-left font-semibold">Production</th>
                <th className="px-3 py-3 text-left font-semibold">Loading</th>
                <th className="px-3 py-3 text-left font-semibold">QA Inspection</th>
                <th className="px-3 py-3 text-center font-semibold">Confirm</th>
                <th className="px-3 py-3 text-left font-semibold">Remark</th>
                {!isReadOnly && <th className="px-3 py-3 text-center font-semibold">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    กำลังโหลดข้อมูล Sales Orders...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-slate-500">
                    ไม่พบรายการคำสั่งซื้อในเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => {
                  const qa = evaluateQaBadge(row);
                  const usdVal = Number(row.price || 0);
                  const thbVal = usdVal * exchangeRate;
                  const qaLocked = qa.isFail || qa.isPass;

                  return (
                    <tr
                      key={row.id}
                      className={
                        qa.isFail
                          ? 'bg-red-50/40 hover:bg-red-50/70 dark:bg-red-950/10'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="px-3 py-2.5 align-top text-slate-400">
                        {reorderMode ? (
                          <div className="flex flex-col gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveRow(idx, -1)}
                              disabled={idx === 0}
                              className="rounded border p-1 hover:bg-slate-100 disabled:opacity-30"
                              aria-label="เลื่อนขึ้น"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveRow(idx, 1)}
                              disabled={idx === rows.length - 1}
                              className="rounded border p-1 hover:bg-slate-100 disabled:opacity-30"
                              aria-label="เลื่อนลง"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ) : (
                          (page - 1) * pageSize + idx + 1
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[140px]">
                        <div className="font-bold text-slate-900 dark:text-white">{row.po_number || '-'}</div>
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.team || ''}
                          onBlur={(e) => handleInlineCellSave(row, 'team', e.target.value)}
                          placeholder="Team"
                          aria-label={`Team สำหรับ ${row.po_number}`}
                          className="mt-1 w-24 rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700"
                        />
                        <div className="mt-0.5 text-[11px] text-slate-400">Order: {formatDisplayDate(row.order_date)}</div>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[190px]">
                        <div className="font-mono font-semibold text-blue-700 dark:text-blue-400">{row.sku}</div>
                        <div className="text-slate-700 dark:text-slate-200 line-clamp-2">{row.description || '-'}</div>
                        {row.color && <div className="text-[11px] text-slate-400">Color: {row.color}</div>}
                      </td>

                      <td className="px-3 py-2.5 align-top text-right min-w-[125px]">
                        <input
                          type="number"
                          min={0}
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.quantity ?? 0}
                          onBlur={(e) => handleInlineCellSave(row, 'quantity', e.target.value)}
                          aria-label={`จำนวนสำหรับ ${row.po_number}`}
                          className="w-20 rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-right font-mono font-bold focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700"
                        />
                        <div className="mt-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                          ${formatCurrencyThb(usdVal)}
                        </div>
                        <div className="text-[10px] text-slate-400">฿{formatCurrencyThb(thbVal)}</div>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[130px] space-y-1">
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.dc_location || ''}
                          onBlur={(e) => handleInlineCellSave(row, 'dc_location', e.target.value)}
                          placeholder="DC"
                          aria-label={`DC สำหรับ ${row.po_number}`}
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] focus:border-blue-500 focus:outline-none dark:border-slate-700"
                        />
                        <div className="flex gap-1">
                          <input
                            type="text"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.loading_week || ''}
                            onBlur={(e) => handleInlineCellSave(row, 'loading_week', e.target.value)}
                            placeholder="LW"
                            className="w-1/2 rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                          />
                          <input
                            type="text"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.shipping_week || ''}
                            onBlur={(e) => handleInlineCellSave(row, 'shipping_week', e.target.value)}
                            placeholder="SW"
                            className="w-1/2 rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[140px] space-y-1">
                        <input
                          type="date"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.production_date ? String(row.production_date).slice(0, 10) : ''}
                          onBlur={(e) => handleInlineCellSave(row, 'production_date', e.target.value)}
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isReadOnly || isOffline}
                            checked={Number(row.is_production_done) === 1}
                            onChange={(e) => handleToggleCheck(row, 'prod', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600"
                          />
                          <span>ผลิตเสร็จ</span>
                        </label>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[140px] space-y-1">
                        <input
                          type="date"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.loading_date ? String(row.loading_date).slice(0, 10) : ''}
                          onBlur={(e) => handleInlineCellSave(row, 'loading_date', e.target.value)}
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isReadOnly || isOffline}
                            checked={Number(row.is_loading_done) === 1}
                            onChange={(e) => handleToggleCheck(row, 'load', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-emerald-600"
                          />
                          <span>โหลดแล้ว</span>
                        </label>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[155px] space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${qa.badgeClass}`}>
                            {qa.label}
                          </span>
                          <label className="flex items-center gap-1 text-[11px] cursor-pointer">
                            <input
                              type="checkbox"
                              disabled={isReadOnly || isOffline || qa.isFail}
                              checked={qa.isPass}
                              onChange={(e) => handleToggleCheck(row, 'insp', e.target.checked)}
                              className="h-4 w-4 rounded border-slate-300 text-emerald-600 disabled:opacity-50"
                            />
                            <span>ผ่าน</span>
                          </label>
                        </div>
                        <input
                          type="date"
                          disabled={isReadOnly || isOffline || qaLocked}
                          defaultValue={row.inspection_date ? String(row.inspection_date).slice(0, 10) : ''}
                          onBlur={(e) => handleInlineCellSave(row, 'inspection_date', e.target.value)}
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] disabled:opacity-60 dark:border-slate-700"
                        />
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline || qaLocked}
                          defaultValue={row.ticket_number || ''}
                          onBlur={(e) => handleInlineCellSave(row, 'ticket_number', e.target.value)}
                          placeholder="QA Ticket"
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] font-mono disabled:opacity-60 dark:border-slate-700"
                        />
                      </td>

                      <td className="px-3 py-2.5 align-top text-center">
                        <input
                          type="checkbox"
                          disabled={isReadOnly || isOffline}
                          checked={Number(row.is_confirmed) === 1}
                          onChange={(e) => handleToggleCheck(row, 'confirm', e.target.checked)}
                          aria-label={`ปิดงาน PO ${row.po_number}`}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-800"
                        />
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[140px]">
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.remark || ''}
                          onBlur={(e) => handleInlineCellSave(row, 'remark', e.target.value)}
                          placeholder="หมายเหตุ..."
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-1 text-[11px] dark:border-slate-700"
                        />
                      </td>

                      {!isReadOnly && (
                        <td className="px-3 py-2.5 align-top text-center">
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => handleDeleteRow(row)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 dark:hover:bg-red-950/30"
                            aria-label={`ลบ PO ${row.po_number}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <span>
            หน้า {page} / {totalPages} (ทั้งหมด {formatInt(totalRows)} รายการ)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 font-medium disabled:opacity-40 dark:border-slate-700"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 font-medium disabled:opacity-40 dark:border-slate-700"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
          <form
            onSubmit={handleCreateSubmit}
            className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">เพิ่มคำสั่งซื้อใหม่ (New Sales Order)</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
                aria-label="ปิดหน้าต่าง"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
              <div>
                <label className="mb-1 block font-semibold">PO Number</label>
                <input
                  type="text"
                  value={newOrder.po_number}
                  onChange={(e) => setNewOrder({ ...newOrder, po_number: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">SKU *</label>
                <input
                  type="text"
                  required
                  value={newOrder.sku}
                  onChange={(e) => setNewOrder({ ...newOrder, sku: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Quantity</label>
                <input
                  type="number"
                  min={0}
                  value={newOrder.quantity}
                  onChange={(e) => setNewOrder({ ...newOrder, quantity: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Team</label>
                <input
                  type="text"
                  value={newOrder.team}
                  onChange={(e) => setNewOrder({ ...newOrder, team: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">Order Date</label>
                <input
                  type="date"
                  value={newOrder.order_date}
                  onChange={(e) => setNewOrder({ ...newOrder, order_date: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">DC Location</label>
                <input
                  type="text"
                  value={newOrder.dc_location}
                  onChange={(e) => setNewOrder({ ...newOrder, dc_location: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block font-semibold">Description</label>
                <input
                  type="text"
                  value={newOrder.description}
                  onChange={(e) => setNewOrder({ ...newOrder, description: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block font-semibold">Remark</label>
                <input
                  type="text"
                  value={newOrder.remark}
                  onChange={(e) => setNewOrder({ ...newOrder, remark: e.target.value })}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>

            <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-xs font-semibold dark:border-slate-700"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={creating || isOffline}
                className="min-h-[44px] rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'กำลังบันทึก...' : 'บันทึกคำสั่งซื้อ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {importPreview && (
        <SalesImportPreviewModal
          mode="sales"
          salesPreview={importPreview}
          isOffline={isOffline}
          onClose={() => setImportPreview(null)}
          onImported={loadOrders}
        />
      )}

      {forecastOpen && (
        <RmForecastModal
          startDate={startDate}
          endDate={endDate}
          dateType={dateType}
          onClose={() => setForecastOpen(false)}
        />
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Package, Search, Plus, ArrowLeftRight, SlidersHorizontal, FileSpreadsheet,
  Upload, LayoutGrid, Table2, History, AlertTriangle, Edit3, Power, X, Camera, RotateCcw, RefreshCw
} from 'lucide-react';
import { peApi, compressPeImageToBase64 } from '../../../shared/services/peApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import PeImage from './PeImage';
import { formatBaht, formatNumber, formatPeDateTime, exportOnhandExcel } from '../utils/peFormatters';

const TX_BADGE_MAP = {
  RECEIVE: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  ISSUE: 'bg-amber-50 text-amber-700 border-amber-200',
  TRANSFER_IN: 'bg-sky-50 text-sky-700 border-sky-200',
  TRANSFER_OUT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  ADJUST: 'bg-purple-50 text-purple-700 border-purple-200',
};

const EMPTY_ITEM_FORM = {
  item_id: '',
  item_code: '',
  item_name: '',
  description: '',
  supplier: '',
  uom: 'PCS',
  unit_price: '0',
  min_stock: '0',
  max_stock: '0',
  image_base64: '',
  image_path: '',
};

export default function SparePartsTab({ isOffline = false }) {
  const showToast = useToast();
  const confirm = useConfirm();

  const [subTab, setSubTab] = useState('onhand');
  const [onhandData, setOnhandData] = useState([]);
  const [kpi, setKpi] = useState({ total_sku: 0, low_stock: 0, total_value: 0, month_issues: 0 });
  const [locations, setLocations] = useState([]);
  const [masterItems, setMasterItems] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [locFilter, setLocFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [supplierFilter, setSupplierFilter] = useState('');
  const [priceFilter, setPriceFilter] = useState('');
  const [viewMode, setViewMode] = useState(() => (typeof window !== 'undefined' && window.innerWidth < 768 ? 'cards' : 'table'));

  // Modals
  const [txModalMode, setTxModalMode] = useState(null); // 'RECEIVE' | 'ISSUE' | null
  const [txCart, setTxCart] = useState([]);
  const [txDraft, setTxDraft] = useState({ item_id: '', location_id: '', quantity: '1' });
  const [txNotes, setTxNotes] = useState('');
  const [txWoId, setTxWoId] = useState('');
  const [openWorkOrders, setOpenWorkOrders] = useState([]);

  const [transferModalOpen, setTransferModalOpen] = useState(false);
  const [transferForm, setTransferForm] = useState({ item_id: '', from_location_id: '', to_location_id: '', quantity: '1', notes: '' });

  const [adjustModalItem, setAdjustModalItem] = useState(null);
  const [adjustForm, setAdjustForm] = useState({ location_id: '', adjust_mode: 'SET_EXACT', quantity: '0', reason: '' });

  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [itemForm, setItemForm] = useState(EMPTY_ITEM_FORM);

  const [cancelTx, setCancelTx] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadOnhand = useCallback(async () => {
    setLoading(true);
    try {
      const res = await peApi.getOnhand();
      setOnhandData(res?.data || []);
      setKpi(res?.kpi || { total_sku: 0, low_stock: 0, total_value: 0, month_issues: 0 });
      setLocations(res?.locations || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMasterItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await peApi.getMtItems();
      setMasterItems(res?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await peApi.getTransactions(250);
      setTransactions(res?.data || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'onhand') loadOnhand();
    else if (subTab === 'master') loadMasterItems();
    else if (subTab === 'history') loadTransactions();
  }, [subTab, loadOnhand, loadMasterItems, loadTransactions]);

  const suppliers = useMemo(
    () => [...new Set(onhandData.map((d) => (d.supplier || '').trim()).filter(Boolean))].sort(),
    [onhandData]
  );

  const filteredOnhand = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return onhandData.filter((r) => {
      if (locFilter && String(r.location_id) !== String(locFilter)) return false;
      if (supplierFilter && (r.supplier || '').trim() !== supplierFilter) return false;
      if (priceFilter) {
        const p = Number(r.unit_price || 0);
        if (priceFilter === 'LOW' && p >= 1000) return false;
        if (priceFilter === 'MID' && (p < 1000 || p > 10000)) return false;
        if (priceFilter === 'HIGH' && p <= 10000) return false;
      }
      if (statusFilter) {
        const qty = Number(r.onhand_qty || 0);
        const min = Number(r.min_stock || 0);
        const max = Number(r.max_stock || 0);
        if (statusFilter === 'OUT' && qty > 0) return false;
        if (statusFilter === 'LOW' && !(min > 0 && qty <= min && qty > 0)) return false;
        if (statusFilter === 'OVER' && !(max > 0 && qty > max)) return false;
        if (statusFilter === 'NORMAL' && ((qty <= 0) || (min > 0 && qty <= min) || (max > 0 && qty > max))) return false;
      }
      if (q) {
        const hit =
          (r.item_code || '').toLowerCase().includes(q) ||
          (r.item_name || '').toLowerCase().includes(q) ||
          (r.supplier || '').toLowerCase().includes(q) ||
          (r.location_name || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [onhandData, locFilter, supplierFilter, priceFilter, statusFilter, searchQuery]);

  const filteredMaster = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return masterItems;
    return masterItems.filter(
      (i) =>
        (i.item_code || '').toLowerCase().includes(q) ||
        (i.item_name || '').toLowerCase().includes(q) ||
        (i.supplier || '').toLowerCase().includes(q)
    );
  }, [masterItems, searchQuery]);

  const filteredTransactions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transactions;
    return transactions.filter(
      (t) =>
        (t.item_code || '').toLowerCase().includes(q) ||
        (t.item_name || '').toLowerCase().includes(q) ||
        (t.wo_number || '').toLowerCase().includes(q) ||
        (t.notes || '').toLowerCase().includes(q) ||
        (t.created_by_name || '').toLowerCase().includes(q)
    );
  }, [transactions, searchQuery]);

  const openTxModal = async (mode, prefillItem = null) => {
    setTxModalMode(mode);
    setTxCart([]);
    setTxNotes('');
    setTxWoId('');
    setTxDraft({
      item_id: prefillItem ? String(prefillItem.item_id) : '',
      location_id: prefillItem?.location_id ? String(prefillItem.location_id) : (locations[0] ? String(locations[0].location_id) : ''),
      quantity: '1',
    });
    if (masterItems.length === 0) {
      const mRes = await peApi.getMtItems();
      setMasterItems(mRes?.data || []);
    }
    if (mode === 'ISSUE') {
      const woRes = await peApi.getWorkOrders({ status: 'Active', limit: 200 });
      setOpenWorkOrders(woRes?.data || []);
    }
  };

  const addDraftToCart = () => {
    const item = masterItems.find((i) => String(i.item_id) === String(txDraft.item_id));
    const loc = locations.find((l) => String(l.location_id) === String(txDraft.location_id));
    const qty = Number(txDraft.quantity);
    if (!item || !loc || !Number.isFinite(qty) || qty <= 0) {
      showToast('กรุณาเลือกอะไหล่ คลังจัดเก็บ และจำนวนมากกว่า 0', 'error');
      return;
    }
    setTxCart((prev) => [
      ...prev,
      {
        item_id: item.item_id,
        item_code: item.item_code,
        item_name: item.item_name,
        uom: item.uom,
        location_id: loc.location_id,
        location_name: loc.location_name,
        quantity: qty,
      },
    ]);
    setTxDraft((p) => ({ ...p, item_id: '', quantity: '1' }));
  };

  const submitBatchTx = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    let payloadItems = txCart;
    if (payloadItems.length === 0 && txDraft.item_id && txDraft.location_id && Number(txDraft.quantity) > 0) {
      payloadItems = [{ item_id: txDraft.item_id, location_id: txDraft.location_id, quantity: Number(txDraft.quantity) }];
    }
    if (payloadItems.length === 0) {
      showToast('กรุณาเพิ่มรายการอะไหล่อย่างน้อย 1 รายการ', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await peApi.processTransaction({
        transaction_type: txModalMode,
        ref_job_id: txModalMode === 'ISSUE' && txWoId ? Number(txWoId) : null,
        notes: txNotes.trim(),
        items: payloadItems.map((c) => ({ item_id: c.item_id, location_id: c.location_id, quantity: c.quantity })),
      });
      showToast(res?.message || 'ทำรายการสต๊อกเรียบร้อยแล้ว', 'success');
      setTxModalMode(null);
      await loadOnhand();
    } finally {
      setSubmitting(false);
    }
  };

  const submitTransfer = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    setSubmitting(true);
    try {
      const res = await peApi.transferStock({
        notes: transferForm.notes.trim(),
        items: [
          {
            item_id: Number(transferForm.item_id),
            from_location_id: Number(transferForm.from_location_id),
            to_location_id: Number(transferForm.to_location_id),
            quantity: Number(transferForm.quantity),
          },
        ],
      });
      showToast(res?.message || 'ย้ายคลังสำเร็จ', 'success');
      setTransferModalOpen(false);
      await loadOnhand();
    } finally {
      setSubmitting(false);
    }
  };

  const submitAdjust = async (e) => {
    e.preventDefault();
    if (isOffline || !adjustModalItem) return;
    setSubmitting(true);
    try {
      const res = await peApi.adjustStock({
        item_id: adjustModalItem.item_id,
        location_id: Number(adjustForm.location_id),
        adjust_mode: adjustForm.adjust_mode,
        quantity: Number(adjustForm.quantity),
        reason: adjustForm.reason.trim(),
      });
      showToast(res?.message || 'ปรับปรุงยอดสต๊อกสำเร็จ', 'success');
      setAdjustModalItem(null);
      await loadOnhand();
    } finally {
      setSubmitting(false);
    }
  };

  const submitMasterItem = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    setSubmitting(true);
    try {
      const res = await peApi.saveMtItem({
        ...itemForm,
        item_id: itemForm.item_id || undefined,
        unit_price: Number(itemForm.unit_price || 0),
        min_stock: Number(itemForm.min_stock || 0),
        max_stock: Number(itemForm.max_stock || 0),
        image_base64: itemForm.image_base64 || undefined,
      });
      showToast(res?.message || 'บันทึกรายการอะไหล่สำเร็จ', 'success');
      setItemModalOpen(false);
      await loadMasterItems();
    } finally {
      setSubmitting(false);
    }
  };

  const handleImportExcel = async (file) => {
    if (!file || isOffline) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(firstSheet);
      if (!rows.length) {
        showToast('ไม่พบข้อมูลในไฟล์ Excel', 'error');
        return;
      }
      const res = await peApi.importMtItems(rows);
      showToast(res?.message || 'นำเข้าข้อมูลสำเร็จ', 'success');
      await loadMasterItems();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถอ่านไฟล์ Excel ได้', 'error');
    }
  };

  const submitCancelReceive = async (e) => {
    e.preventDefault();
    if (isOffline || !cancelTx) return;
    setSubmitting(true);
    try {
      const res = await peApi.cancelReceive({
        transaction_id: cancelTx.transaction_id,
        reason: cancelReason.trim(),
      });
      showToast(res?.message || 'ยกเลิกรายการรับเข้าเรียบร้อยแล้ว', 'success');
      setCancelTx(null);
      setCancelReason('');
      await loadTransactions();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">จำนวนรายการในคลัง (SKU)</div>
          <div className="text-2xl font-bold text-slate-900 dark:text-white mt-1">{kpi.total_sku || 0}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">อะไหล่ต่ำกว่าเกณฑ์ (Low Stock)</div>
          <div className="text-2xl font-bold text-red-600 mt-1 flex items-center gap-1.5">
            {kpi.low_stock || 0}
            {Number(kpi.low_stock) > 0 && <AlertTriangle className="w-5 h-5" />}
          </div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">มูลค่าคลังอะไหล่รวม</div>
          <div className="text-xl font-bold text-emerald-600 mt-1">{formatBaht(kpi.total_value || 0)}</div>
        </div>
        <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="text-xs text-slate-500 font-medium">ยอดเบิกจ่ายเดือนนี้</div>
          <div className="text-2xl font-bold text-indigo-600 mt-1">{formatNumber(kpi.month_issues || 0, 1)}</div>
        </div>
      </div>

      {/* Internal Sub-Tabs & Actions */}
      <div className="p-3.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'onhand', label: 'คลังอะไหล่คงเหลือ (Stock)', icon: Package },
              { id: 'master', label: 'ทะเบียนอะไหล่หลัก (Master)', icon: Edit3 },
              { id: 'history', label: 'ประวัติรับ-เบิก (Transactions)', icon: History },
            ].map((t) => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSearchQuery('');
                    setSubTab(t.id);
                  }}
                  className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 border transition-colors ${
                    subTab === t.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {subTab === 'onhand' && (
              <>
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={() => openTxModal('RECEIVE')}
                  className="min-h-[44px] px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> รับเข้า (Receive)
                </button>
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={() => openTxModal('ISSUE')}
                  className="min-h-[44px] px-3.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Package className="w-4 h-4" /> เบิกใช้ (Issue)
                </button>
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={async () => {
                    if (masterItems.length === 0) {
                      const mRes = await peApi.getMtItems();
                      setMasterItems(mRes?.data || []);
                    }
                    setTransferForm({
                      item_id: '',
                      from_location_id: locations[0] ? String(locations[0].location_id) : '',
                      to_location_id: locations[1] ? String(locations[1].location_id) : '',
                      quantity: '1',
                      notes: '',
                    });
                    setTransferModalOpen(true);
                  }}
                  className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <ArrowLeftRight className="w-4 h-4 text-sky-600" /> ย้ายคลัง
                </button>
                <button
                  type="button"
                  onClick={() => exportOnhandExcel(filteredOnhand)}
                  className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-medium inline-flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600" /> Excel
                </button>
              </>
            )}
            {subTab === 'master' && (
              <>
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={() => {
                    setItemForm(EMPTY_ITEM_FORM);
                    setItemModalOpen(true);
                  }}
                  className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Plus className="w-4 h-4" /> เพิ่มอะไหล่ใหม่
                </button>
                <label className="min-h-[44px] px-3.5 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer hover:bg-slate-50">
                  <Upload className="w-4 h-4 text-emerald-600" /> นำเข้า Excel
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = '';
                      handleImportExcel(f);
                    }}
                  />
                </label>
              </>
            )}
            <button
              type="button"
              onClick={() => (subTab === 'onhand' ? loadOnhand() : subTab === 'master' ? loadMasterItems() : loadTransactions())}
              className="min-h-[44px] min-w-[44px] rounded-xl border border-slate-300 dark:border-slate-700 inline-flex items-center justify-center"
              title="รีเฟรช"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Sub-tab Specific Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          <div className="relative lg:col-span-2">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหารหัสอะไหล่, ชื่อ, Supplier, WO..."
              className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          {subTab === 'onhand' && (
            <>
              <select
                value={locFilter}
                onChange={(e) => setLocFilter(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">คลัง: ทั้งหมด</option>
                {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
              </select>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">สถานะสต๊อก: ทั้งหมด</option>
                <option value="OUT">สินค้าหมด (0)</option>
                <option value="LOW">ต่ำกว่าเกณฑ์ (Low Stock)</option>
                <option value="NORMAL">ปกติ (Normal)</option>
                <option value="OVER">เกินคลังสูงสุด (Over Max)</option>
              </select>
              <select
                value={supplierFilter}
                onChange={(e) => setSupplierFilter(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="">ผู้ขาย (Supplier): ทั้งหมด</option>
                {suppliers.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <div className="flex items-center justify-between gap-2">
                <select
                  value={priceFilter}
                  onChange={(e) => setPriceFilter(e.target.value)}
                  className="flex-1 min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                >
                  <option value="">ราคา: ทั้งหมด</option>
                  <option value="LOW">&lt; 1,000 บ.</option>
                  <option value="MID">1,000 - 10,000</option>
                  <option value="HIGH">&gt; 10,000 บ.</option>
                </select>
                <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-slate-100">
                  <button type="button" onClick={() => setViewMode('table')} className={`p-2 rounded-lg ${viewMode === 'table' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}>
                    <Table2 className="w-4 h-4" />
                  </button>
                  <button type="button" onClick={() => setViewMode('cards')} className={`p-2 rounded-lg ${viewMode === 'cards' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-500'}`}>
                    <LayoutGrid className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Sub-Tab 1: Stock On-Hand */}
      {subTab === 'onhand' && (
        loading ? (
          <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">กำลังโหลดยอดคงคลัง...</div>
        ) : filteredOnhand.length === 0 ? (
          <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-400">ไม่พบรายการอะไหล่</div>
        ) : viewMode === 'table' ? (
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-3">รูป</th>
                  <th className="px-3 py-3">รหัส / ชื่ออะไหล่</th>
                  <th className="px-3 py-3">คลังจัดเก็บ</th>
                  <th className="px-3 py-3 text-right">คงเหลือ</th>
                  <th className="px-3 py-3 text-right">Min / Max</th>
                  <th className="px-3 py-3 text-right">ราคา/หน่วย</th>
                  <th className="px-3 py-3 text-right">มูลค่ารวม</th>
                  <th className="px-3 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredOnhand.map((row, idx) => {
                  const qty = Number(row.onhand_qty || 0);
                  const min = Number(row.min_stock || 0);
                  const isLow = qty <= 0 || (min > 0 && qty <= min);
                  return (
                    <tr key={`${row.item_id}:${row.location_id || 0}:${idx}`} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5"><PeImage path={row.image_path} alt={row.item_code} className="w-10 h-10 rounded-lg object-cover" /></td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">{row.item_code}</div>
                        <div className="text-xs text-slate-700 dark:text-slate-300">{row.item_name}</div>
                        {row.supplier && <div className="text-[11px] text-slate-400">{row.supplier}</div>}
                      </td>
                      <td className="px-3 py-2.5 text-xs">{row.location_name || 'ไม่ระบุคลัง'}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <span className={`font-bold ${isLow ? 'text-red-600' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {formatNumber(qty, 2)} {row.uom}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs text-slate-500">{min} / {row.max_stock || 0}</td>
                      <td className="px-3 py-2.5 text-right text-xs">{formatBaht(row.unit_price)}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-xs">{formatBaht(qty * Number(row.unit_price || 0))}</td>
                      <td className="px-3 py-2.5 text-right whitespace-nowrap">
                        <div className="inline-flex gap-1">
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => openTxModal('RECEIVE', row)}
                            className="min-h-[34px] px-2 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-semibold"
                            title="รับเข้า"
                          >
                            +รับ
                          </button>
                          <button
                            type="button"
                            disabled={isOffline || !row.location_id}
                            onClick={() => {
                              setAdjustModalItem(row);
                              setAdjustForm({
                                location_id: String(row.location_id || locations[0]?.location_id || ''),
                                adjust_mode: 'SET_EXACT',
                                quantity: String(qty),
                                reason: '',
                              });
                            }}
                            className="min-h-[34px] px-2 rounded-lg bg-purple-50 text-purple-700 text-xs font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                            title="ปรับสต๊อก"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" /> ปรับ
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredOnhand.map((row, idx) => {
              const qty = Number(row.onhand_qty || 0);
              const min = Number(row.min_stock || 0);
              const isLow = qty <= 0 || (min > 0 && qty <= min);
              return (
                <div key={`${row.item_id}:${row.location_id || 0}:${idx}`} className="p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
                  <div className="flex items-start gap-3">
                    <PeImage path={row.image_path} alt={row.item_code} className="w-12 h-12 rounded-xl object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-bold text-sm text-slate-900 dark:text-white">{row.item_code}</div>
                      <div className="text-xs font-medium text-slate-700 dark:text-slate-300 line-clamp-2">{row.item_name}</div>
                      <div className="text-[11px] text-slate-500">{row.location_name || 'ไม่ระบุคลัง'}</div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <span>คงเหลือ: <strong className={isLow ? 'text-red-600' : 'text-emerald-600'}>{qty} {row.uom}</strong> (Min {min})</span>
                    <span className="font-semibold">{formatBaht(qty * Number(row.unit_price || 0))}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )
      )}

      {/* Sub-Tab 2: MT Items Master */}
      {subTab === 'master' && (
        loading ? (
          <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">กำลังโหลดทะเบียนอะไหล่...</div>
        ) : (
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-3">รูป</th>
                  <th className="px-3 py-3">รหัส / ชื่ออะไหล่</th>
                  <th className="px-3 py-3">ผู้ขาย (Supplier)</th>
                  <th className="px-3 py-3 text-right">ราคา/หน่วย</th>
                  <th className="px-3 py-3 text-right">Min / Max</th>
                  <th className="px-3 py-3">สถานะ</th>
                  <th className="px-3 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredMaster.map((item) => (
                  <tr key={item.item_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-3 py-2.5"><PeImage path={item.image_path} alt={item.item_code} className="w-10 h-10 rounded-lg object-cover" /></td>
                    <td className="px-3 py-2.5">
                      <div className="font-mono font-bold text-slate-900 dark:text-white">{item.item_code}</div>
                      <div className="text-xs text-slate-700 dark:text-slate-300">{item.item_name}</div>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-slate-500">{item.supplier || '-'}</td>
                    <td className="px-3 py-2.5 text-right text-xs">{formatBaht(item.unit_price)} / {item.uom}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-500">{item.min_stock} / {item.max_stock}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${Number(item.is_active) === 1 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {Number(item.is_active) === 1 ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setItemForm({
                            item_id: String(item.item_id),
                            item_code: item.item_code || '',
                            item_name: item.item_name || '',
                            description: item.description || '',
                            supplier: item.supplier || '',
                            uom: item.uom || 'PCS',
                            unit_price: String(item.unit_price ?? 0),
                            min_stock: String(item.min_stock ?? 0),
                            max_stock: String(item.max_stock ?? 0),
                            image_base64: '',
                            image_path: item.image_path || '',
                          });
                          setItemModalOpen(true);
                        }}
                        className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-blue-600 hover:bg-blue-50"
                        title="แก้ไข"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={async () => {
                          const ok = await confirm({
                            title: 'เปลี่ยนสถานะรายการอะไหล่',
                            message: `ต้องการ${Number(item.is_active) === 1 ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}รหัส ${item.item_code} หรือไม่?`,
                            confirmText: 'ยืนยัน',
                          });
                          if (!ok) return;
                          await peApi.toggleMtItem(item.item_id);
                          showToast('เปลี่ยนสถานะสำเร็จ', 'success');
                          await loadMasterItems();
                        }}
                        className="min-w-[36px] min-h-[36px] p-1.5 rounded-lg text-slate-600 hover:bg-slate-100"
                        title="เปิด/ปิดใช้งาน"
                      >
                        <Power className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Sub-Tab 3: Transaction Log */}
      {subTab === 'history' && (
        loading ? (
          <div className="p-12 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center text-sm text-slate-500">กำลังโหลดประวัติธุรกรรม...</div>
        ) : (
          <div className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs uppercase text-slate-500 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-3 py-3">วันเวลา</th>
                  <th className="px-3 py-3">ประเภท</th>
                  <th className="px-3 py-3">อะไหล่</th>
                  <th className="px-3 py-3">คลัง</th>
                  <th className="px-3 py-3 text-right">จำนวน</th>
                  <th className="px-3 py-3">อ้างอิง / หมายเหตุ</th>
                  <th className="px-3 py-3">ผู้ทำรายการ</th>
                  <th className="px-3 py-3 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTransactions.map((tx) => {
                  const canCancel = tx.transaction_type === 'RECEIVE' && !String(tx.notes || '').includes('[ยกเลิกแล้ว');
                  return (
                    <tr key={tx.transaction_id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                      <td className="px-3 py-2.5 text-xs whitespace-nowrap">{formatPeDateTime(tx.created_at)}</td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${TX_BADGE_MAP[tx.transaction_type] || 'bg-slate-100 text-slate-700'}`}>
                          {tx.transaction_type}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-mono text-xs font-bold">{tx.item_code}</div>
                        <div className="text-xs text-slate-600">{tx.item_name}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{tx.location_name || '-'}</td>
                      <td className="px-3 py-2.5 text-right font-bold text-xs whitespace-nowrap">
                        {tx.quantity > 0 ? `+${tx.quantity}` : tx.quantity} {tx.uom}
                      </td>
                      <td className="px-3 py-2.5 text-xs max-w-[260px]">
                        {tx.wo_number && <div className="font-mono font-bold text-blue-600">{tx.wo_number} ({tx.machine_code || '-'})</div>}
                        <div className="text-slate-600 dark:text-slate-400">{tx.notes || '-'}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{tx.created_by_name || '-'}</td>
                      <td className="px-3 py-2.5 text-right">
                        {canCancel && (
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => {
                              setCancelTx(tx);
                              setCancelReason('');
                            }}
                            className="min-h-[34px] px-2.5 rounded-lg text-xs font-semibold text-red-600 hover:bg-red-50 inline-flex items-center gap-1"
                          >
                            <RotateCcw className="w-3.5 h-3.5" /> ยกเลิกรับเข้า
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}

      {/* Receive / Issue Batch Modal */}
      {txModalMode && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setTxModalMode(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">
                {txModalMode === 'RECEIVE' ? 'รับอะไหล่เข้าคลัง (Receive Stock)' : 'เบิกจ่ายอะไหล่ (Issue Stock)'}
              </h3>
              <button type="button" onClick={() => setTxModalMode(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitBatchTx} className="p-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700">
                <div className="sm:col-span-5">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">รายการอะไหล่</label>
                  <select
                    value={txDraft.item_id}
                    onChange={(e) => setTxDraft((p) => ({ ...p, item_id: e.target.value }))}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  >
                    <option value="">-- เลือกอะไหล่ --</option>
                    {masterItems.filter((i) => Number(i.is_active) === 1).map((i) => (
                      <option key={i.item_id} value={i.item_id}>[{i.item_code}] {i.item_name} ({i.uom})</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-4">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">คลังจัดเก็บ</label>
                  <select
                    value={txDraft.location_id}
                    onChange={(e) => setTxDraft((p) => ({ ...p, location_id: e.target.value }))}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
                  >
                    <option value="">-- เลือกคลัง --</option>
                    {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวน</label>
                  <input
                    type="number"
                    step="any"
                    min="0.001"
                    value={txDraft.quantity}
                    onChange={(e) => setTxDraft((p) => ({ ...p, quantity: e.target.value }))}
                    className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs text-right"
                  />
                </div>
                <div className="sm:col-span-1 flex items-end">
                  <button
                    type="button"
                    onClick={addDraftToCart}
                    className="w-full min-h-[44px] rounded-xl bg-blue-600 text-white flex items-center justify-center"
                    title="เพิ่มลงตะกร้ารายการ"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {txCart.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-bold text-slate-600">รายการที่รอทำรายการ ({txCart.length})</div>
                  {txCart.map((c, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                      <span><strong>[{c.item_code}]</strong> {c.item_name} — {c.location_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{c.quantity} {c.uom}</span>
                        <button type="button" onClick={() => setTxCart((prev) => prev.filter((_, i) => i !== idx))} className="text-red-500"><X className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {txModalMode === 'ISSUE' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ผูกกับใบแจ้งซ่อม (Work Order - ถ้ามี)</label>
                  <select
                    value={txWoId}
                    onChange={(e) => setTxWoId(e.target.value)}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="">-- ไม่ผูกกับใบแจ้งซ่อม --</option>
                    {openWorkOrders.map((w) => (
                      <option key={w.wo_id} value={w.wo_id}>{w.wo_number} — {w.machine_name} ({w.issue_title})</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  placeholder="เลขที่ PR / PO หรือหมายเหตุ..."
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setTxModalMode(null)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm">ยกเลิก</button>
                <button type="submit" disabled={submitting || isOffline} className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold disabled:opacity-50">
                  {submitting ? 'กำลังบันทึก...' : 'ยืนยันทำรายการ'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer Stock Modal */}
      {transferModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setTransferModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">ย้ายคลังอะไหล่ (Stock Transfer)</h3>
              <button type="button" onClick={() => setTransferModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitTransfer} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">อะไหล่ *</label>
                <select
                  required
                  value={transferForm.item_id}
                  onChange={(e) => setTransferForm((p) => ({ ...p, item_id: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  <option value="">-- เลือกอะไหล่ --</option>
                  {masterItems.filter((i) => Number(i.is_active) === 1).map((i) => (
                    <option key={i.item_id} value={i.item_id}>[{i.item_code}] {i.item_name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">จากคลัง *</label>
                  <select
                    required
                    value={transferForm.from_location_id}
                    onChange={(e) => setTransferForm((p) => ({ ...p, from_location_id: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="">-- เลือกคลัง --</option>
                    {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ไปยังคลัง *</label>
                  <select
                    required
                    value={transferForm.to_location_id}
                    onChange={(e) => setTransferForm((p) => ({ ...p, to_location_id: e.target.value }))}
                    className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                  >
                    <option value="">-- เลือกคลัง --</option>
                    {locations.map((l) => <option key={l.location_id} value={l.location_id}>{l.location_name}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวนที่ย้าย *</label>
                <input
                  type="number"
                  required
                  min="0.001"
                  step="any"
                  value={transferForm.quantity}
                  onChange={(e) => setTransferForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">หมายเหตุ</label>
                <input
                  type="text"
                  value={transferForm.notes}
                  onChange={(e) => setTransferForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setTransferModalOpen(false)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm">ยกเลิก</button>
                <button type="submit" disabled={submitting || isOffline} className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold">ยืนยันย้ายคลัง</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Modal */}
      {adjustModalItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setAdjustModalItem(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">ปรับปรุงสต๊อก — {adjustModalItem.item_code}</h3>
              <button type="button" onClick={() => setAdjustModalItem(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitAdjust} className="p-5 space-y-3">
              <div className="text-xs text-slate-500">
                {adjustModalItem.item_name} — คลัง: <strong>{adjustModalItem.location_name}</strong> (ยอดระบบ: {adjustModalItem.onhand_qty} {adjustModalItem.uom})
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">รูปแบบการปรับปรุง</label>
                <select
                  value={adjustForm.adjust_mode}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, adjust_mode: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                >
                  <option value="SET_EXACT">ตั้งยอดตามตรวจนับจริง (SET_EXACT)</option>
                  <option value="ADD">ปรับเพิ่มสต๊อก (ADD)</option>
                  <option value="DEDUCT">ปรับลดสต๊อก (DEDUCT)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">จำนวน *</label>
                <input
                  type="number"
                  required
                  min={adjustForm.adjust_mode === 'SET_EXACT' ? '0' : '0.001'}
                  step="any"
                  value={adjustForm.quantity}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, quantity: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">สาเหตุการปรับปรุงสต๊อก *</label>
                <textarea
                  rows={2}
                  required
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="ระบุเหตุผลเพื่อบันทึก Audit Trail..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setAdjustModalItem(null)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm">ยกเลิก</button>
                <button type="submit" disabled={submitting || isOffline} className="min-h-[44px] px-5 rounded-xl bg-purple-600 text-white text-sm font-semibold">ยืนยันปรับยอด</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Save MT Item Master Modal */}
      {itemModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setItemModalOpen(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">{itemForm.item_id ? 'แก้ไขรายการอะไหล่' : 'เพิ่มรายการอะไหล่ใหม่'}</h3>
              <button type="button" onClick={() => setItemModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitMasterItem} className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">รหัสอะไหล่ (Code) *</label>
                  <input type="text" required value={itemForm.item_code} onChange={(e) => setItemForm((p) => ({ ...p, item_code: e.target.value }))} className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm font-mono" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">หน่วยนับ (UoM)</label>
                  <input type="text" value={itemForm.uom} onChange={(e) => setItemForm((p) => ({ ...p, uom: e.target.value }))} className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่ออะไหล่ *</label>
                <input type="text" required value={itemForm.item_name} onChange={(e) => setItemForm((p) => ({ ...p, item_name: e.target.value }))} className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้ขาย (Supplier)</label>
                <input type="text" value={itemForm.supplier} onChange={(e) => setItemForm((p) => ({ ...p, supplier: e.target.value }))} className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">ราคา/หน่วย</label>
                  <input type="number" step="any" min="0" value={itemForm.unit_price} onChange={(e) => setItemForm((p) => ({ ...p, unit_price: e.target.value }))} className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Min Stock</label>
                  <input type="number" step="any" min="0" value={itemForm.min_stock} onChange={(e) => setItemForm((p) => ({ ...p, min_stock: e.target.value }))} className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Max Stock</label>
                  <input type="number" step="any" min="0" value={itemForm.max_stock} onChange={(e) => setItemForm((p) => ({ ...p, max_stock: e.target.value }))} className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">รูปภาพอะไหล่</label>
                <label className="min-h-[44px] px-3 rounded-xl border border-dashed border-slate-300 flex items-center justify-center gap-1.5 text-xs text-slate-600 cursor-pointer hover:bg-slate-50">
                  <Camera className="w-4 h-4" />
                  <span>{itemForm.image_base64 ? 'เลือกรูปใหม่แล้ว' : 'อัปโหลดรูปภาพ'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const b64 = await compressPeImageToBase64(f);
                      setItemForm((p) => ({ ...p, image_base64: b64 }));
                    }}
                  />
                </label>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setItemModalOpen(false)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm">ยกเลิก</button>
                <button type="submit" disabled={submitting || isOffline} className="min-h-[44px] px-5 rounded-xl bg-blue-600 text-white text-sm font-semibold">บันทึกข้อมูลอะไหล่</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cancel Receive Modal */}
      {cancelTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setCancelTx(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-red-600">ยกเลิกรายการรับเข้า #{cancelTx.transaction_id}</h3>
              <button type="button" onClick={() => setCancelTx(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={submitCancelReceive} className="p-5 space-y-3">
              <div className="text-xs text-slate-600 dark:text-slate-300">
                [{cancelTx.item_code}] {cancelTx.item_name} — จำนวน {cancelTx.quantity} {cancelTx.uom} ณ {cancelTx.location_name}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">สาเหตุการยกเลิก *</label>
                <textarea
                  rows={2}
                  required
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="ระบุเหตุผลการยกเลิกรับเข้า..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCancelTx(null)} className="min-h-[44px] px-4 rounded-xl border border-slate-300 text-sm">ปิด</button>
                <button type="submit" disabled={submitting || isOffline} className="min-h-[44px] px-5 rounded-xl bg-red-600 text-white text-sm font-semibold">ยืนยันยกเลิกและหักคืนสต๊อก</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus,
  RefreshCw,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  Search,
  Package,
  FileSpreadsheet,
  Download,
  Link2,
  History,
  RotateCcw,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Barcode,
  ChevronLeft,
  ChevronRight,
  Database,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import ItemEditModal from './ItemEditModal';
import ItemWhereUsedModal from './ItemWhereUsedModal';
import ItemAuditModal from './ItemAuditModal';
import ItemImportModal from './ItemImportModal';
import SapSyncModal from './SapSyncModal';

const TYPE_BADGE_CLASSES = {
  FG: 'bg-blue-600 text-white',
  RM: 'bg-emerald-600 text-white',
  PKG: 'bg-purple-600 text-white',
  SEMI: 'bg-amber-500 text-slate-900',
  WIP: 'bg-amber-500 text-slate-900',
  CON: 'bg-rose-600 text-white',
  SP: 'bg-slate-800 text-white',
  TOOL: 'bg-stone-500 text-white',
  OTHER: 'bg-slate-500 text-white',
  UNCLASSIFIED: 'bg-rose-500 text-white',
};

export default function ItemMasterTab({ lines = [], models = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [selectedSubType, setSelectedSubType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('active');

  // Sorting & Pagination
  const [sortKey, setSortKey] = useState('sap_no');
  const [sortDirection, setSortDirection] = useState('asc');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [whereUsedModalOpen, setWhereUsedModalOpen] = useState(false);
  const [whereUsedItem, setWhereUsedItem] = useState(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditItem, setAuditItem] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [sapSyncModalOpen, setSapSyncModalOpen] = useState(false);

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemSettingsApi.getItems({
        status: statusFilter,
        type: selectedType !== 'ALL' ? selectedType : '',
        search: searchTerm,
        limit: 2000,
      });
      if (res && res.success) {
        setItems(res.data || []);
      } else {
        showToast(res?.message || 'ไม่สามารถโหลดข้อมูล Item Master ได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการโหลด Item Master: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, selectedType, searchTerm, showToast]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchItems();
    }, 250);
    return () => clearTimeout(timer);
  }, [fetchItems]);

  // Extract unique sub-types from items for dropdown filter
  const availableSubTypes = useMemo(() => {
    const set = new Set();
    items.forEach((it) => {
      if (it.material_sub_type && it.material_sub_type.trim()) {
        set.add(it.material_sub_type.trim());
      }
    });
    return Array.from(set).sort();
  }, [items]);

  // Filtered & Sorted Rows
  const filteredItems = useMemo(() => {
    let result = items;
    if (selectedSubType !== 'ALL') {
      result = result.filter((it) => it.material_sub_type === selectedSubType);
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (it) =>
          (it.sap_no && it.sap_no.toLowerCase().includes(term)) ||
          (it.part_no && it.part_no.toLowerCase().includes(term)) ||
          (it.part_description && it.part_description.toLowerCase().includes(term)) ||
          (it.barcode && it.barcode.toLowerCase().includes(term)) ||
          (it.sku && it.sku.toLowerCase().includes(term))
      );
    }
    return result;
  }, [items, selectedSubType, searchTerm]);

  const sortedItems = useMemo(() => {
    const result = [...filteredItems];
    if (!sortKey) return result;

    const dirFactor = sortDirection === 'asc' ? 1 : -1;
    return result.sort((a, b) => {
      const valA = a[sortKey];
      const valB = b[sortKey];
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      const numA = Number(valA);
      const numB = Number(valB);
      if (!isNaN(numA) && !isNaN(numB)) {
        return dirFactor * (numA - numB);
      }
      return dirFactor * String(valA).localeCompare(String(valB), 'th', { numeric: true, sensitivity: 'base' });
    });
  }, [filteredItems, sortKey, sortDirection]);

  // Paginated Rows
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pagedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
    setPage(1);
  };

  const handleOpenAdd = () => {
    setEditingItem(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = async (item) => {
    try {
      const res = await systemSettingsApi.getItemBySap(item.sap_no);
      if (res && res.success && res.data) {
        setEditingItem(res.data);
      } else {
        setEditingItem(item);
      }
    } catch {
      setEditingItem(item);
    }
    setEditModalOpen(true);
  };

  const handleSaveItem = async (formData) => {
    try {
      const res = await systemSettingsApi.saveItem(formData);
      if (res && res.success) {
        showToast(res.message || 'บันทึกข้อมูลสินค้าเรียบร้อย', 'success');
        fetchItems();
      } else {
        showToast(res?.message || 'บันทึกไม่สำเร็จ', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
    }
  };

  const handleToggleStatus = async (item) => {
    const isActivating = item.is_active == 0;
    const confirmed = await confirm({
      title: isActivating ? 'ยืนยันเปิดใช้งาน' : 'ยืนยันปิดใช้งาน',
      message: `คุณต้องการ${isActivating ? 'เปิดใช้งาน' : 'ปิดใช้งาน'}รหัสสินค้า "${item.sap_no} - ${item.part_description || ''}" ใช่หรือไม่?`,
      type: isActivating ? 'info' : 'warning',
      confirmText: isActivating ? 'เปิดใช้งาน' : 'ปิดใช้งาน',
    });

    if (confirmed) {
      try {
        const res = isActivating
          ? await systemSettingsApi.restoreItem(item.item_id)
          : await systemSettingsApi.deleteItem(item.item_id);

        if (res && res.success) {
          showToast(res.message || 'ปรับปรุงสถานะเรียบร้อย', 'success');
          fetchItems();
        } else {
          showToast(res?.message || 'ปรับปรุงสถานะไม่สำเร็จ', 'error');
        }
      } catch (err) {
        showToast('เกิดข้อผิดพลาด: ' + err.message, 'error');
      }
    }
  };

  const handleExportExcel = () => {
    if (sortedItems.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
      return;
    }

    try {
      const exportData = sortedItems.map((it) => ({
        'SAP No.': it.sap_no,
        'Part No.': it.part_no,
        Description: it.part_description,
        Barcode: it.barcode,
        SKU: it.sku,
        Type: it.material_type,
        'Sub-Type': it.material_sub_type,
        UPH: it.planned_output,
        'Min Stock': it.min_stock,
        'Max Stock': it.max_stock,
        CTN: it.CTN,
        'Net Weight': it.net_weight,
        'Gross Weight': it.gross_weight,
        CBM: it.cbm,
        'Price THB': it.StandardPrice,
        'Price USD': it.Price_USD,
        'Cost RM': it.Cost_RM,
        'Cost PKG': it.Cost_PKG,
        'Cost SUB': it.Cost_SUB,
        'Cost DL': it.Cost_DL,
        'Cost OH Mach': it.Cost_OH_Machine,
        'Cost OH Util': it.Cost_OH_Utilities,
        'Cost OH Ind': it.Cost_OH_Indirect,
        'Cost OH Staff': it.Cost_OH_Staff,
        'Cost OH Acc': it.Cost_OH_Accessory,
        'Cost OH Other': it.Cost_OH_Others,
        Status: it.is_active == 1 ? 'Active' : 'Inactive',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ItemMaster');
      XLSX.writeFile(wb, `ItemMaster_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast(`ส่งออกข้อมูล ${sortedItems.length.toLocaleString()} รายการสำเร็จ`, 'success');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการส่งออก Excel: ' + err.message, 'error');
    }
  };

  const formatNum = (val) => {
    if (val == null || val === '') return '0.00';
    const num = Number(val);
    return isNaN(num) ? '0.00' : num.toFixed(2);
  };

  const formatQty = (val) => {
    if (val == null || val === '') return '0';
    const num = Number(val);
    return isNaN(num) ? '0' : num.toLocaleString();
  };

  return (
    <div className="space-y-4">
      {/* Top Filter & Action Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative min-w-[240px] flex-1 sm:flex-none">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา SAP No., Part No., รายละเอียด..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => {
              setSelectedType(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">-- All Types --</option>
            {Object.keys(TYPE_BADGE_CLASSES).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={selectedSubType}
            onChange={(e) => {
              setSelectedSubType(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">-- ทุกกลุ่มย่อย (All Sub) --</option>
            {availableSubTypes.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/60 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="active">เฉพาะ Active</option>
            <option value="all">ทั้งหมด (All Items)</option>
            <option value="inactive">เฉพาะ Inactive</option>
          </select>

          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-1.5 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSapSyncModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-lg border border-blue-200 dark:border-blue-800 transition-colors"
            title="ซิงค์และนำเข้ารหัสวัสดุใหม่จาก SAP Staging สู่ Item Master"
          >
            <Database className="w-3.5 h-3.5" />
            Sync from SAP
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 rounded-lg border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-lg border border-emerald-200 dark:border-emerald-800 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import Excel
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Item
          </button>
        </div>
      </div>

      {/* Industrial Multi-Tier Grouped Table (Legacy System UI/UX Parity) */}
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
        <table className="w-full min-w-[1450px] border-collapse text-xs text-left">
          {/* Header Tier 1 & 2 */}
          <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-850 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-700 select-none">
            <tr className="border-b border-slate-200 dark:border-slate-700">
              <th
                rowSpan={2}
                onClick={() => handleSort('sap_no')}
                className="sticky left-0 z-30 bg-slate-50 dark:bg-slate-850 px-3 py-2.5 font-bold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-w-[190px]"
              >
                <div className="flex items-center justify-between">
                  <span>Item Identity</span>
                  {sortKey === 'sap_no' ? (
                    sortDirection === 'asc' ? <ArrowUp className="w-3 h-3 text-blue-600" /> : <ArrowDown className="w-3 h-3 text-blue-600" />
                  ) : (
                    <ArrowUpDown className="w-3 h-3 opacity-30" />
                  )}
                </div>
              </th>

              <th
                rowSpan={2}
                onClick={() => handleSort('barcode')}
                className="px-3 py-2.5 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-w-[110px]"
              >
                Barcode / SKU
              </th>

              <th
                rowSpan={2}
                onClick={() => handleSort('part_description')}
                className="px-3 py-2.5 font-semibold cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-w-[210px]"
              >
                Description
              </th>

              <th
                rowSpan={2}
                onClick={() => handleSort('planned_output')}
                className="px-2 py-2.5 text-center font-bold bg-slate-100/70 dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 min-w-[65px] cursor-pointer"
                title="Planned Output per Hour"
              >
                Plan<br />(UPH)
              </th>

              {/* Group 1: Stock Policy (Amber/Yellow) */}
              <th
                colSpan={2}
                className="py-1 text-center font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700"
              >
                Stock Policy
              </th>

              {/* Group 2: Logistics (Cyan/Blue) */}
              <th
                colSpan={4}
                className="py-1 text-center font-bold bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-r border-slate-200 dark:border-slate-700"
              >
                Logistics
              </th>

              {/* Group 3: Pricing (Green) */}
              <th
                colSpan={2}
                className="py-1 text-center font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700"
              >
                Pricing
              </th>

              {/* Group 4: Direct Costs (Rose/Red) */}
              <th
                colSpan={4}
                className="py-1 text-center font-bold bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-r border-slate-200 dark:border-slate-700"
              >
                Direct Costs
              </th>

              {/* Group 5: Overheads (Indigo/Purple) */}
              <th
                colSpan={6}
                className="py-1 text-center font-bold bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700"
              >
                Overheads (OH)
              </th>

              <th rowSpan={2} className="px-3 py-2.5 text-center font-semibold min-w-[80px]">
                Status
              </th>

              <th rowSpan={2} className="px-3 py-2.5 text-center font-semibold min-w-[90px]">
                Actions
              </th>
            </tr>

            {/* Sub-headers row */}
            <tr className="text-[11px] font-bold border-b border-slate-200 dark:border-slate-700">
              {/* Stock Policy */}
              <th className="px-2 py-1 text-right bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">Min</th>
              <th className="px-2 py-1 text-right bg-amber-50/80 dark:bg-amber-950/30 text-amber-900 dark:text-amber-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">Max</th>

              {/* Logistics */}
              <th className="px-2 py-1 text-center bg-cyan-50/80 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">CTN</th>
              <th className="px-2 py-1 text-right bg-cyan-50/80 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">NW</th>
              <th className="px-2 py-1 text-right bg-cyan-50/80 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">GW</th>
              <th className="px-2 py-1 text-right bg-cyan-50/80 dark:bg-cyan-950/30 text-cyan-900 dark:text-cyan-300 border-r border-slate-200 dark:border-slate-700 min-w-[48px]">CBM</th>

              {/* Pricing */}
              <th className="px-2 py-1 text-right bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700 min-w-[55px]">THB</th>
              <th className="px-2 py-1 text-right bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-300 border-r border-slate-200 dark:border-slate-700 min-w-[55px]">USD</th>

              {/* Direct Costs */}
              <th className="px-2 py-1 text-right bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">RM</th>
              <th className="px-2 py-1 text-right bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">PKG</th>
              <th className="px-2 py-1 text-right bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">SUB</th>
              <th className="px-2 py-1 text-right bg-rose-50/80 dark:bg-rose-950/30 text-rose-900 dark:text-rose-300 border-r border-slate-200 dark:border-slate-700 min-w-[50px]">DL</th>

              {/* Overheads */}
              <th className="px-2 py-1 text-right bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">Mach</th>
              <th className="px-2 py-1 text-right bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">Util</th>
              <th className="px-2 py-1 text-right bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">Ind.</th>
              <th className="px-2 py-1 text-right bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">Staff</th>
              <th className="px-2 py-1 text-right bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">Acc</th>
              <th className="px-2 py-1 text-right bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-900 dark:text-indigo-300 border-r border-slate-200 dark:border-slate-700 min-w-[45px]">Other</th>
            </tr>
          </thead>

          {/* Table Body */}
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td colSpan={23} className="px-4 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                    <span>กำลังโหลดข้อมูล Item Master...</span>
                  </div>
                </td>
              </tr>
            ) : pagedItems.length === 0 ? (
              <tr>
                <td colSpan={23} className="px-4 py-12 text-center text-slate-500">
                  <div className="flex flex-col items-center justify-center gap-1.5">
                    <Package className="w-8 h-8 text-slate-300" />
                    <span className="font-semibold text-slate-600 dark:text-slate-300">
                      ไม่พบข้อมูลสินค้าตรงตามเงื่อนไขที่เลือก
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              pagedItems.map((it) => {
                // Auto-resolve prefix classification: 10xxxxxx is strictly RM (Raw Material)
                let resolvedType = it.material_type;
                if (!resolvedType || resolvedType === 'UNCLASSIFIED') {
                  if (it.sap_no?.startsWith('10')) resolvedType = 'RM';
                  else if (it.sap_no?.startsWith('20')) resolvedType = 'PKG';
                  else if (it.sap_no?.startsWith('30')) resolvedType = 'SEMI';
                  else if (it.sap_no?.startsWith('40')) resolvedType = 'FG';
                  else if (it.sap_no?.startsWith('70')) resolvedType = 'CON';
                  else resolvedType = it.material_type || 'FG';
                }
                const typeClass = TYPE_BADGE_CLASSES[resolvedType] || 'bg-slate-600 text-white';
                const isActive = it.is_active == 1;

                return (
                  <tr
                    key={it.item_id || it.sap_no}
                    className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${!isActive ? 'opacity-60 bg-slate-50/40 dark:bg-slate-900/40' : ''
                      }`}
                  >
                    {/* Item Identity (Sticky Left) */}
                    <td className="sticky left-0 z-10 bg-white dark:bg-slate-900 px-3 py-1.5 border-r border-slate-200 dark:border-slate-700 shadow-2xs">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => handleOpenEdit(it)}
                          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline text-xs"
                        >
                          {it.sap_no}
                        </button>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${typeClass}`}>
                          {resolvedType}
                        </span>
                        {it.material_sub_type && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-semibold border border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800">
                            {it.material_sub_type}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate max-w-[170px] mt-0.5">
                        {it.part_no || '-'}
                      </div>
                    </td>

                    {/* Barcode / SKU */}
                    <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700">
                      <div className="flex items-center gap-1 text-slate-700 dark:text-slate-300 font-mono text-[11px]">
                        <Barcode className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{it.barcode || '-'}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">SKU: {it.sku || '-'}</div>
                    </td>

                    {/* Description */}
                    <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-700">
                      <div
                        className="text-slate-800 dark:text-slate-200 font-medium truncate max-w-[210px]"
                        title={it.part_description}
                      >
                        {it.part_description || '-'}
                      </div>
                    </td>

                    {/* Plan (UPH) */}
                    <td className="px-2 py-1.5 text-center font-bold bg-slate-50/60 dark:bg-slate-850/60 border-r border-slate-200 dark:border-slate-700">
                      {formatQty(it.planned_output)}
                    </td>

                    {/* Stock Policy: Min / Max */}
                    <td className="px-2 py-1.5 text-right font-mono bg-amber-50/40 dark:bg-amber-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatQty(it.min_stock)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-amber-50/40 dark:bg-amber-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatQty(it.max_stock)}
                    </td>

                    {/* Logistics: CTN, NW, GW, CBM */}
                    <td className="px-2 py-1.5 text-center font-mono bg-cyan-50/40 dark:bg-cyan-950/20 border-r border-slate-200 dark:border-slate-700">
                      {it.CTN || 0}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-cyan-50/40 dark:bg-cyan-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.net_weight)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-cyan-50/40 dark:bg-cyan-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.gross_weight)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-cyan-50/40 dark:bg-cyan-950/20 border-r border-slate-200 dark:border-slate-700">
                      {it.cbm ? Number(it.cbm).toFixed(4) : '0.0000'}
                    </td>

                    {/* Pricing: THB, USD */}
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.StandardPrice)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-emerald-50/40 dark:bg-emerald-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Price_USD)}
                    </td>

                    {/* Direct Costs: RM, PKG, SUB, DL */}
                    <td className="px-2 py-1.5 text-right font-mono bg-rose-50/40 dark:bg-rose-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_RM)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-rose-50/40 dark:bg-rose-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_PKG)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-rose-50/40 dark:bg-rose-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_SUB)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-bold text-slate-800 dark:text-slate-200 bg-rose-50/40 dark:bg-rose-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_DL)}
                    </td>

                    {/* Overheads: Mach, Util, Ind, Staff, Acc, Other */}
                    <td className="px-2 py-1.5 text-right font-mono bg-indigo-50/40 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_OH_Machine)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-indigo-50/40 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_OH_Utilities)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-indigo-50/40 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_OH_Indirect)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-indigo-50/40 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_OH_Staff)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-indigo-50/40 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_OH_Accessory)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono bg-indigo-50/40 dark:bg-indigo-950/20 border-r border-slate-200 dark:border-slate-700">
                      {formatNum(it.Cost_OH_Others)}
                    </td>

                    {/* Status */}
                    <td className="px-2 py-1.5 text-center">
                      {isActive ? (
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">Active</span>
                      ) : (
                        <span className="font-bold text-slate-400 dark:text-slate-500">Inactive</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleOpenEdit(it)}
                          className="p-1 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded transition-colors"
                          title="แก้ไข"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setWhereUsedItem(it);
                            setWhereUsedModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Where-Used"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setAuditItem(it);
                            setAuditModalOpen(true);
                          }}
                          className="p-1 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded transition-colors"
                          title="Activity Log"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleToggleStatus(it)}
                          className={`p-1 rounded transition-colors ${isActive
                              ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50'
                              : 'text-slate-400 hover:text-emerald-600 hover:bg-emerald-50'
                            }`}
                          title={isActive ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
                        >
                          {isActive ? <Trash2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
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

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400 px-1">
        <div className="flex items-center gap-3">
          <span>
            แสดง {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
            {Math.min(currentPage * pageSize, totalItems)} จาก {totalItems.toLocaleString()} รายการ
          </span>
          <div className="flex items-center gap-1.5">
            <span>แสดง</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
            >
              <option value={25}>25 / หน้า</option>
              <option value={50}>50 / หน้า</option>
              <option value={100}>100 / หน้า</option>
              <option value={250}>250 / หน้า</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="px-2 font-medium">
            หน้า {currentPage} / {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Modals */}
      <ItemEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        onSave={handleSaveItem}
        item={editingItem}
        lines={lines}
        models={models}
        onOpenWhereUsed={(it) => {
          setWhereUsedItem(it);
          setWhereUsedModalOpen(true);
        }}
        onOpenAudit={(it) => {
          setAuditItem(it);
          setAuditModalOpen(true);
        }}
      />

      <ItemWhereUsedModal
        isOpen={whereUsedModalOpen}
        onClose={() => setWhereUsedModalOpen(false)}
        item={whereUsedItem}
      />

      <ItemAuditModal
        isOpen={auditModalOpen}
        onClose={() => setAuditModalOpen(false)}
        item={auditItem}
      />

      <ItemImportModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={fetchItems}
      />

      <SapSyncModal
        isOpen={sapSyncModalOpen}
        onClose={() => setSapSyncModalOpen(false)}
        onSuccess={fetchItems}
      />
    </div>
  );
}

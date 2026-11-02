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
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import DataTable from '../../../shared/components/DataTable';
import ItemEditModal from './ItemEditModal';
import ItemWhereUsedModal from './ItemWhereUsedModal';
import ItemAuditModal from './ItemAuditModal';
import ItemImportModal from './ItemImportModal';

const TYPE_COLORS = {
  FG: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800',
  SEMI: 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800',
  WIP: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
  RM: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
  PKG: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
  CON: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  SP: 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800',
  TOOL: 'bg-stone-100 text-stone-700 border-stone-300 dark:bg-stone-800 dark:text-stone-300 dark:border-stone-700',
  OTHER: 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700',
  UNCLASSIFIED: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800',
};

export default function ItemMasterTab({ lines = [], models = [] }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('active');

  // Modals state
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [whereUsedModalOpen, setWhereUsedModalOpen] = useState(false);
  const [whereUsedItem, setWhereUsedItem] = useState(null);
  const [auditModalOpen, setAuditModalOpen] = useState(false);
  const [auditItem, setAuditItem] = useState(null);
  const [importModalOpen, setImportModalOpen] = useState(false);

  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await systemSettingsApi.getItems({
        status: statusFilter,
        type: selectedType !== 'ALL' ? selectedType : '',
        search: searchTerm,
        limit: 1000,
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

  const handleOpenAdd = () => {
    setEditingItem(null);
    setEditModalOpen(true);
  };

  const handleOpenEdit = async (item) => {
    try {
      // Fetch item full details including routes
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
    if (items.length === 0) {
      showToast('ไม่มีข้อมูลสำหรับส่งออก', 'warning');
      return;
    }

    try {
      const exportData = items.map((it) => ({
        'SAP No.': it.sap_no,
        'Part No.': it.part_no,
        Description: it.part_description,
        Type: it.material_type,
        'Sub-Type': it.material_sub_type,
        UPH: it.planned_output,
        'Standard Price': it.StandardPrice,
        'Price USD': it.Price_USD,
        'Cost RM': it.Cost_RM,
        'Cost PKG': it.Cost_PKG,
        'Cost DL': it.Cost_DL,
        'Cost Total': it.Cost_Total,
        Status: it.is_active == 1 ? 'Active' : 'Inactive',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'ItemMaster');
      XLSX.writeFile(wb, `ItemMaster_Export_${new Date().toISOString().slice(0, 10)}.xlsx`);
      showToast('ส่งออกไฟล์ Excel สำเร็จ', 'success');
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการส่งออก Excel: ' + err.message, 'error');
    }
  };

  const columns = [
    {
      key: 'sap_no',
      label: 'SAP No.',
      sortable: true,
      render: (it) => (
        <button
          onClick={() => handleOpenEdit(it)}
          className="font-mono font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1.5"
        >
          <Package className="w-4 h-4 text-slate-400 shrink-0" />
          <span>{it.sap_no}</span>
        </button>
      ),
    },
    {
      key: 'part_no',
      label: 'Part No.',
      sortable: true,
      render: (it) => <span className="font-medium text-slate-800 dark:text-slate-200">{it.part_no || '-'}</span>,
    },
    {
      key: 'part_description',
      label: 'Description',
      render: (it) => (
        <span className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-xs block">
          {it.part_description || '-'}
        </span>
      ),
    },
    {
      key: 'material_type',
      label: 'Type',
      sortable: true,
      render: (it) => {
        const colorClass = TYPE_COLORS[it.material_type] || 'bg-slate-100 text-slate-700 border-slate-200';
        return (
          <div className="flex flex-col gap-0.5">
            <span className={`px-2 py-0.5 text-[11px] font-semibold rounded-full border w-fit ${colorClass}`}>
              {it.material_type || 'N/A'}
            </span>
            {it.material_sub_type && (
              <span className="text-[10px] text-slate-400 font-mono truncate max-w-[90px]">
                {it.material_sub_type}
              </span>
            )}
          </div>
        );
      },
    },
    {
      key: 'StandardPrice',
      label: 'Std Price (THB)',
      sortable: true,
      render: (it) => (
        <span className="font-mono font-semibold text-emerald-700 dark:text-emerald-400 text-xs">
          {it.StandardPrice ? Number(it.StandardPrice).toLocaleString(undefined, { minimumFractionDigits: 2 }) : '-'}
        </span>
      ),
    },
    {
      key: 'planned_output',
      label: 'Std UPH',
      sortable: true,
      render: (it) => (
        <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300">
          {it.planned_output ? Number(it.planned_output).toLocaleString() : '-'}
        </span>
      ),
    },
    {
      key: 'is_active',
      label: 'Status',
      sortable: true,
      render: (it) =>
        it.is_active == 1 ? (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-full border border-emerald-200 dark:border-emerald-800">
            <CheckCircle2 className="w-3 h-3" /> Active
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 rounded-full border border-slate-200 dark:border-slate-700">
            <XCircle className="w-3 h-3" /> Inactive
          </span>
        ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (it) => (
        <div className="flex items-center gap-1">
          <button
            onClick={() => handleOpenEdit(it)}
            className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="แก้ไข"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setWhereUsedItem(it);
              setWhereUsedModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Where-Used"
          >
            <Link2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => {
              setAuditItem(it);
              setAuditModalOpen(true);
            }}
            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            title="Activity Log"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleToggleStatus(it)}
            className={`p-1.5 rounded-lg transition-colors ${
              it.is_active == 1
                ? 'text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-slate-800'
                : 'text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-slate-800'
            }`}
            title={it.is_active == 1 ? 'ปิดใช้งาน' : 'เปิดใช้งาน'}
          >
            {it.is_active == 1 ? <Trash2 className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="ค้นหา SAP No., Part No., รายละเอียด..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="ALL">ทุกหมวดหมู่ (All Types)</option>
            {Object.keys(TYPE_COLORS).map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-sm rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="active">เฉพาะ Active</option>
            <option value="all">ทั้งหมด (All Items)</option>
            <option value="inactive">เฉพาะ Inactive</option>
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchItems}
            disabled={loading}
            className="p-2 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl border border-slate-200 dark:border-slate-700 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Export Excel
          </button>

          <button
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 rounded-xl border border-emerald-200 dark:border-emerald-800 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            Import Excel
          </button>

          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            เพิ่มสินค้าใหม่
          </button>
        </div>
      </div>

      {/* Items DataTable */}
      <DataTable
        columns={columns}
        rows={items}
        data={items}
        rowKey={(it) => it.item_id || it.sap_no}
        loading={loading}
        defaultSortKey="sap_no"
        emptyMessage="ไม่พบข้อมูลสินค้าตรงตามเงื่อนไขที่เลือก"
      />

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
    </div>
  );
}


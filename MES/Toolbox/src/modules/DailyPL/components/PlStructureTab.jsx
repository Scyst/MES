import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  Edit3,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { dailyPlMasterApi } from '../../../shared/services/dailyPlApi';
import { exportPlStructureTemplate } from '../utils/plFormulaEngine';
import { PlStructureItemModal } from './PlModals';

export default function PlStructureTab({ isOffline }) {
  const toast = useToast();
  const confirm = useConfirm();
  const importRef = useRef(null);

  const [items, setItems] = useState([]);
  const [showInactive, setShowInactive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [orderDirty, setOrderDirty] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  const loadStructure = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dailyPlMasterApi.readStructure(showInactive);
      if (res?.success) {
        setItems(res.data || []);
        setOrderDirty(false);
      }
    } finally {
      setLoading(false);
    }
  }, [showInactive]);

  useEffect(() => {
    loadStructure();
  }, [loadStructure]);

  const moveItem = (idx, dir) => {
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const copy = [...items];
    const [moved] = copy.splice(idx, 1);
    copy.splice(targetIdx, 0, moved);
    setItems(copy);
    setOrderDirty(true);
  };

  const handleSaveOrder = async () => {
    if (isOffline || !orderDirty) return;
    const res = await dailyPlMasterApi.reorderItems(items.map((i) => i.id));
    if (res?.success) {
      toast.success(res.message);
      loadStructure();
    }
  };

  const handleSoftDelete = async (item) => {
    if (isOffline) return;
    const ok = await confirm({
      title: 'ปิดใช้งานรายการบัญชี P&L',
      message: `ต้องการปิดใช้งาน [${item.account_code}] ${item.item_name} หรือไม่?`,
      confirmText: 'ปิดใช้งาน',
      danger: true,
    });
    if (!ok) return;
    const res = await dailyPlMasterApi.deleteItem(item.id);
    if (res?.success) {
      toast.success(res.message);
      loadStructure();
    }
  };

  const handleRestore = async (item) => {
    if (isOffline) return;
    const res = await dailyPlMasterApi.restoreItem(item.id);
    if (res?.success) {
      toast.success(res.message);
      loadStructure();
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || isOffline) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(new Uint8Array(buf), { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
      if (!rows || rows.length === 0) {
        toast.warning('ไม่พบข้อมูลในไฟล์ Excel');
        return;
      }
      const ok = await confirm({
        title: `นำเข้าโครงสร้างบัญชี ${rows.length} รายการ`,
        message: 'รายการที่มี Account Code ตรงกันจะถูกอัปเดต ยืนยันหรือไม่?',
        confirmText: 'Import Master',
      });
      if (!ok) return;
      const res = await dailyPlMasterApi.importBatch(rows);
      if (res?.success) {
        toast.success(res.message);
        loadStructure();
      }
    } catch (err) {
      toast.error(`อ่านไฟล์ไม่สำเร็จ: ${err.message}`);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            P&amp;L Chart of Accounts ({items.length})
          </h3>
          <label className="flex min-h-[38px] cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold dark:border-slate-700 dark:bg-slate-800">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
              className="h-4 w-4 rounded"
            />
            <span>แสดงรายการที่ลบแล้ว (Show Deleted)</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input ref={importRef} type="file" accept=".xlsx,.xls" hidden onChange={handleImportFile} />
          {orderDirty && (
            <button
              type="button"
              disabled={isOffline}
              onClick={handleSaveOrder}
              className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-amber-500 px-3.5 text-xs font-bold text-slate-900 hover:bg-amber-600"
            >
              <Save className="h-4 w-4" />
              <span>บันทึกลำดับ</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => exportPlStructureTemplate(items)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            <Download className="h-4 w-4 text-emerald-600" />
            <span>Export Template</span>
          </button>
          <button
            type="button"
            disabled={isOffline}
            onClick={() => importRef.current?.click()}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"
          >
            <Upload className="h-4 w-4 text-blue-600" />
            <span>Import</span>
          </button>
          <button
            type="button"
            disabled={isOffline}
            onClick={() => { setEditingItem(null); setModalOpen(true); }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            <span>Add Account</span>
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <tr>
              <th className="p-3">Order</th>
              <th className="p-3">Account Item</th>
              <th className="p-3">Code</th>
              <th className="p-3">Type</th>
              <th className="p-3">Source / Formula</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr><td colSpan={6} className="py-10 text-center text-slate-400">กำลังโหลดโครงสร้างบัญชี...</td></tr>
            ) : items.map((it, idx) => {
              const isActive = Number(it.is_active) === 1;
              return (
                <tr key={it.id} className={!isActive ? 'bg-slate-50 opacity-60 dark:bg-slate-900' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'}>
                  <td className="whitespace-nowrap p-2.5">
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => moveItem(idx, -1)} disabled={idx === 0} className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"><ArrowUp className="h-3.5 w-3.5" /></button>
                      <button type="button" onClick={() => moveItem(idx, 1)} disabled={idx === items.length - 1} className="rounded p-1 hover:bg-slate-200 disabled:opacity-30"><ArrowDown className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                  <td className="p-2.5 font-semibold" style={{ paddingLeft: `${12 + Number(it.item_level || 0) * 18}px` }}>
                    <span>{it.item_name}</span>
                    {!isActive && <span className="ml-2 rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">DELETED</span>}
                  </td>
                  <td className="p-2.5 font-mono font-bold text-slate-600 dark:text-slate-300">{it.account_code}</td>
                  <td className="p-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                      it.item_type === 'REVENUE'
                        ? 'bg-emerald-100 text-emerald-700'
                        : it.item_type === 'COGS'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-amber-100 text-amber-800'
                    }`}>
                      {it.item_type}
                    </span>
                  </td>
                  <td className="p-2.5 font-mono text-[11px] text-slate-500">
                    <span className="rounded bg-slate-100 px-1.5 py-0.5 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">{it.data_source}</span>
                    {it.calculation_formula ? <span className="ml-2 text-blue-600">{it.calculation_formula}</span> : null}
                  </td>
                  <td className="p-2.5 text-right">
                    {isActive ? (
                      <div className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={() => { setEditingItem(it); setModalOpen(true); }}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-blue-600 hover:bg-blue-50 dark:border-slate-700"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => handleSoftDelete(it)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-rose-600 hover:bg-rose-50 dark:border-slate-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={() => handleRestore(it)}
                        className="inline-flex min-h-[36px] items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 font-bold text-emerald-700 hover:bg-emerald-100"
                      >
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span>Restore</span>
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <PlStructureItemModal
        open={modalOpen}
        item={editingItem}
        allItems={items}
        isOffline={isOffline}
        onClose={() => setModalOpen(false)}
        onSaved={(msg) => {
          toast.success(msg);
          setModalOpen(false);
          loadStructure();
        }}
      />
    </div>
  );
}

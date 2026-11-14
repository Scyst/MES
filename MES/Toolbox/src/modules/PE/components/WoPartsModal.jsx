import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Package, Plus, Trash2, X, Search } from 'lucide-react';
import { peApi } from '../../../shared/services/peApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import PeImage from './PeImage';
import { formatBaht, formatPeDateTime } from '../utils/peFormatters';

/**
 * Shared modal to inspect parts issued to a Work Order, issue additional spare parts
 * from Maintenance stock, or refund an erroneously issued item back to stock.
 */
export default function WoPartsModal({ wo, onClose, onCostUpdated, isOffline = false }) {
  const showToast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [issuedParts, setIssuedParts] = useState([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [availableParts, setAvailableParts] = useState([]);
  const [partSearch, setPartSearch] = useState('');
  const [selectedKey, setSelectedKey] = useState('');
  const [issueQty, setIssueQty] = useState('1');
  const [issueNote, setIssueNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    if (!wo?.wo_id) return;
    setLoading(true);
    try {
      const [woRes, availRes] = await Promise.all([
        peApi.getWoParts(wo.wo_id),
        peApi.getAvailableParts(),
      ]);
      const payload = woRes?.data || {};
      setIssuedParts(payload.parts_used || []);
      setGrandTotal(Number(payload.grand_total || 0));
      setAvailableParts(availRes?.data || []);
    } finally {
      setLoading(false);
    }
  }, [wo?.wo_id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredStock = useMemo(() => {
    const q = partSearch.trim().toLowerCase();
    if (!q) return availableParts;
    return availableParts.filter(
      (p) =>
        (p.item_code || '').toLowerCase().includes(q) ||
        (p.item_name || '').toLowerCase().includes(q) ||
        (p.location_name || '').toLowerCase().includes(q)
    );
  }, [availableParts, partSearch]);

  const selectedStock = useMemo(() => {
    if (!selectedKey) return null;
    const [itemId, locId] = selectedKey.split(':').map(Number);
    return availableParts.find((p) => Number(p.item_id) === itemId && Number(p.location_id) === locId) || null;
  }, [availableParts, selectedKey]);

  const handleIssue = async (e) => {
    e.preventDefault();
    if (isOffline) {
      showToast('ไม่สามารถทำรายการได้ในขณะออฟไลน์', 'error');
      return;
    }
    if (!selectedStock) {
      showToast('กรุณาเลือกอะไหล่และคลังที่ต้องการเบิก', 'error');
      return;
    }
    const qty = Number(issueQty);
    if (!Number.isFinite(qty) || qty <= 0) {
      showToast('กรุณาระบุจำนวนเบิกที่มากกว่า 0', 'error');
      return;
    }
    if (qty > Number(selectedStock.onhand_qty || 0)) {
      showToast(`สต๊อกคงเหลือไม่เพียงพอ (คงเหลือ ${selectedStock.onhand_qty})`, 'error');
      return;
    }

    setSubmitting(true);
    try {
      const res = await peApi.issueParts({
        wo_id: wo.wo_id,
        notes: issueNote.trim() || `เบิกใช้ในใบงาน ${wo.wo_number}`,
        parts: [
          {
            item_id: selectedStock.item_id,
            location_id: selectedStock.location_id,
            quantity: qty,
          },
        ],
      });
      showToast(res?.message || 'เบิกอะไหล่สำเร็จ', 'success');
      setSelectedKey('');
      setIssueQty('1');
      setIssueNote('');
      await loadData();
      if (onCostUpdated) onCostUpdated(res?.new_total_cost ?? res?.data?.new_total_cost);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRefund = async (part) => {
    if (isOffline) return;
    const ok = await confirm({
      title: 'ยืนยันการยกเลิกและคืนอะไหล่',
      message: `ต้องการยกเลิกรายการเบิก "${part.item_name}" จำนวน ${part.quantity} ${part.uom} และคืนยอดกลับเข้าสต๊อกหรือไม่?`,
      confirmText: 'ยืนยันคืนสต๊อก',
      danger: true,
    });
    if (!ok) return;

    const res = await peApi.deleteWoPart(part.transaction_id, wo.wo_id);
    showToast(res?.message || 'คืนสต๊อกเรียบร้อยแล้ว', 'success');
    await loadData();
    if (onCostUpdated) onCostUpdated(res?.new_total_cost ?? res?.data?.new_total_cost);
  };

  if (!wo) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-3xl max-h-[92vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-slate-900 dark:text-white truncate">รายการเบิกใช้อะไหล่ — {wo.wo_number}</h3>
              <p className="text-xs text-slate-500 truncate">{wo.machine_display_name || wo.machine_name || '-'} ({wo.line || '-'})</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] rounded-xl flex items-center justify-center text-slate-500 hover:bg-slate-200/70 dark:hover:bg-slate-700"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
          {/* Issue New Part Form */}
          <form onSubmit={handleIssue} className="p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">เบิกอะไหล่เพิ่มจากคลังซ่อมบำรุง</span>
              <span className="text-xs text-slate-500">พร้อมเบิก {filteredStock.length} รายการ</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
              <div className="sm:col-span-5 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={partSearch}
                  onChange={(e) => setPartSearch(e.target.value)}
                  placeholder="กรองรหัส / ชื่ออะไหล่ / คลัง..."
                  className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                />
              </div>
              <div className="sm:col-span-5">
                <select
                  value={selectedKey}
                  onChange={(e) => setSelectedKey(e.target.value)}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                  required
                >
                  <option value="">-- เลือกอะไหล่ในคลัง --</option>
                  {filteredStock.map((p) => (
                    <option key={`${p.item_id}:${p.location_id}`} value={`${p.item_id}:${p.location_id}`}>
                      [{p.item_code}] {p.item_name} — {p.location_name} (คงเหลือ {p.onhand_qty} {p.uom})
                    </option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <input
                  type="number"
                  min="0.001"
                  step="any"
                  value={issueQty}
                  onChange={(e) => setIssueQty(e.target.value)}
                  placeholder="จำนวน"
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-right"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={issueNote}
                onChange={(e) => setIssueNote(e.target.value)}
                placeholder="หมายเหตุการเบิก (ไม่บังคับ)"
                className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
              />
              <button
                type="submit"
                disabled={submitting || isOffline}
                className="min-h-[44px] px-5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-semibold text-sm inline-flex items-center justify-center gap-2 shrink-0"
              >
                <Plus className="w-4 h-4" />
                {submitting ? 'กำลังบันทึก...' : 'ยืนยันเบิกอะไหล่'}
              </button>
            </div>
          </form>

          {/* Issued Parts List */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200">รายการที่เบิกแล้ว ({issuedParts.length})</h4>
              <div className="text-sm font-bold text-emerald-700 dark:text-emerald-400">มูลค่ารวม: {formatBaht(grandTotal)}</div>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-slate-500">กำลังโหลดข้อมูล...</div>
            ) : issuedParts.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-400 border border-dashed border-slate-200 dark:border-slate-700 rounded-xl">
                ยังไม่มีประวัติการเบิกอะไหล่สำหรับใบแจ้งซ่อมนี้
              </div>
            ) : (
              <div className="space-y-2">
                {issuedParts.map((part) => (
                  <div
                    key={part.transaction_id}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <PeImage path={part.image_path} alt={part.item_name} className="w-11 h-11 rounded-lg object-cover" />
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-slate-900 dark:text-white truncate">
                          <span className="font-mono text-xs text-slate-500 mr-1.5">{part.item_code}</span>
                          {part.item_name}
                        </div>
                        <div className="text-xs text-slate-500">
                          จำนวน: <span className="font-semibold text-slate-700 dark:text-slate-300">{part.quantity} {part.uom}</span> · มูลค่า {formatBaht(part.total_cost)} · โดย {part.issued_by || '-'} ({formatPeDateTime(part.created_at)})
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => handleRefund(part)}
                      className="min-w-[44px] min-h-[44px] rounded-xl text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-40 flex items-center justify-center shrink-0"
                      title="ยกเลิกและคืนอะไหล่เข้าสต๊อก"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Printer, Plus, FileSignature, X, Upload, CheckCircle2, XCircle, Clock, Edit3
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { qmsConcessionApi, resolveQmsMediaUrl } from '../../../shared/services/qmsApi';
import {
  CONCESSION_STATUS_META, CONCESSION_APPROVER_STAGES,
  formatQmsDate, formatQmsDateInput, formatQmsQty,
  openQmsPrintWindow, buildConcessionPrintHtml
} from '../utils/qmsFormatters';

const DEFAULT_CONCESSION_FORM = {
  id: null,
  issued_by_dept: 'QA/QC Section',
  request_to: 'OTI',
  request_date: new Date().toISOString().slice(0, 10),
  person_name: '',
  subject: '',
  part_name: '',
  part_no: '',
  order_no: '',
  qty: '',
  lot_no: '',
  model_name: '',
  serial_no: '',
  mfg_date: '',
  difference_detail: '',
  reason_for_adopt: '',
  root_cause: '',
  measure_tentative: '',
  measure_permanent: '',
  is_report_needed: '1',
};

export default function ConcessionTab({ isOnline }) {
  const { user } = useAuth();
  const toast = useToast();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);

  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState(DEFAULT_CONCESSION_FORM);
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [approvingLevel, setApprovingLevel] = useState(0);
  const [previewImg, setPreviewImg] = useState('');

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qmsConcessionApi.list();
      setRows(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดรายการ Concession ได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => (
      `${r.request_no || ''} ${r.subject || ''} ${r.part_name || ''} ${r.part_no || ''} ${r.order_no || ''} ${r.person_name || ''}`
        .toLowerCase()
        .includes(q)
    ));
  }, [rows, searchTerm]);

  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filtered.length && filtered.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filtered.map((r) => r.id));
    }
  };

  const openNewModal = () => {
    setForm({
      ...DEFAULT_CONCESSION_FORM,
      person_name: user?.fullname || user?.username || '',
    });
    setFiles([]);
    setFormOpen(true);
  };

  const openEditModal = (record) => {
    setDetailOpen(false);
    setForm({
      id: record.id,
      issued_by_dept: record.issued_by_dept || 'QA/QC Section',
      request_to: record.request_to || 'OTI',
      request_date: formatQmsDateInput(record.request_date) || new Date().toISOString().slice(0, 10),
      person_name: record.person_name || '',
      subject: record.subject || '',
      part_name: record.part_name || '',
      part_no: record.part_no || '',
      order_no: record.order_no || '',
      qty: String(record.qty ?? ''),
      lot_no: record.lot_no || '',
      model_name: record.model_name || '',
      serial_no: record.serial_no || '',
      mfg_date: formatQmsDateInput(record.mfg_date),
      difference_detail: record.difference_detail || '',
      reason_for_adopt: record.reason_for_adopt || '',
      root_cause: record.root_cause || '',
      measure_tentative: record.measure_tentative || '',
      measure_permanent: record.measure_permanent || '',
      is_report_needed: record.is_report_needed ? '1' : '0',
    });
    setFiles([]);
    setFormOpen(true);
  };

  const handleSaveConcession = async (e) => {
    e.preventDefault();
    if (!isOnline) return;
    setSaving(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined) fd.append(k, String(v));
      });
      files.forEach((f) => fd.append('images[]', f));
      const res = form.id ? await qmsConcessionApi.update(fd) : await qmsConcessionApi.create(fd);
      toast.success(res.message || 'บันทึกคำขอ Concession เรียบร้อยแล้ว');
      setFormOpen(false);
      await fetchList();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถบันทึกคำขอ Concession ได้');
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (id) => {
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      const res = await qmsConcessionApi.get(id);
      setDetail(res.data || null);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดข้อมูล Concession ได้');
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApproveStage = async (level, status) => {
    if (!detail || !isOnline) return;
    setApprovingLevel(level);
    try {
      const res = await qmsConcessionApi.approve({ id: detail.id, level, status });
      toast.success(res.message || 'บันทึกการอนุมัติเรียบร้อยแล้ว');
      await fetchList();
      await openDetail(detail.id);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถบันทึกผลการอนุมัติได้');
    } finally {
      setApprovingLevel(0);
    }
  };

  const handlePrintBlank = () => {
    openQmsPrintWindow({ title: 'Blank Concession Form', bodyHtml: buildConcessionPrintHtml([]) });
  };

  const handleBulkPrint = async () => {
    if (selectedIds.length === 0) {
      toast.warning('กรุณาเลือกรายการที่ต้องการพิมพ์อย่างน้อย 1 รายการ');
      return;
    }
    try {
      const res = await qmsConcessionApi.getBulk(selectedIds);
      const list = Array.isArray(res.data) ? res.data : [];
      openQmsPrintWindow({ title: `Concession Print (${list.length})`, bodyHtml: buildConcessionPrintHtml(list) });
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถเตรียมข้อมูลพิมพ์ได้');
    }
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหา Request No, เรื่อง, Part No, ชื่อสินค้า..."
            className="w-full min-h-[44px] pl-9 pr-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={selectedIds.length === 0}
            onClick={handleBulkPrint}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 disabled:opacity-40 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4" /> พิมพ์รายการที่เลือก ({selectedIds.length})
          </button>
          <button
            type="button"
            onClick={handlePrintBlank}
            className="min-h-[44px] px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-semibold text-slate-700 dark:text-slate-200 inline-flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-500" /> Blank Form
          </button>
          <button
            type="button"
            disabled={!isOnline}
            onClick={openNewModal}
            className="min-h-[44px] px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> สร้างคำขอ Concession
          </button>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={filtered.length > 0 && selectedIds.length === filtered.length}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-3 py-3 font-bold">Request No.</th>
                <th className="px-3 py-3 font-bold">วันที่</th>
                <th className="px-3 py-3 font-bold">หัวข้อเรื่อง / ชิ้นงาน</th>
                <th className="px-3 py-3 font-bold">Order / Lot</th>
                <th className="px-3 py-3 font-bold">ผู้ขอ / หน่วยงาน</th>
                <th className="px-3 py-3 font-bold text-right">Qty</th>
                <th className="px-3 py-3 font-bold text-center">สถานะอนุมัติ (4 ขั้น)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">กำลังโหลดข้อมูล Concession...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-10 text-center text-slate-500">ไม่พบรายการขออนุมัติ Concession</td></tr>
              ) : (
                filtered.map((r) => {
                  const stMeta = CONCESSION_STATUS_META[r.status] || CONCESSION_STATUS_META.PENDING_APPROVAL;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => openDetail(r.id)}
                      className="hover:bg-blue-50/40 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                    >
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(r.id)}
                          onChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="px-3 py-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">{r.request_no}</td>
                      <td className="px-3 py-3 text-slate-600 dark:text-slate-300 whitespace-nowrap">{formatQmsDate(r.request_date)}</td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900 dark:text-white line-clamp-1">{r.subject}</div>
                        <div className="text-xs text-slate-500">{r.part_name} ({r.part_no})</div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div>Order: <b>{r.order_no || '-'}</b></div>
                        <div className="text-slate-500">Lot: {r.lot_no || '-'}</div>
                      </td>
                      <td className="px-3 py-3 text-xs">
                        <div className="font-semibold">{r.person_name || '-'}</div>
                        <div className="text-slate-500">{r.issued_by_dept} → {r.request_to}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{formatQmsQty(r.qty)}</td>
                      <td className="px-3 py-3 text-center">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold border ${stMeta.badgeClass}`}>
                          {stMeta.label}
                        </span>
                        <div className="flex justify-center gap-1 mt-1">
                          {[1, 2, 3, 4].map((lvl) => {
                            const s = r[`approver_${lvl}_status`];
                            const cls = s === 'Approve' ? 'bg-emerald-500' : s === 'Not Approve' ? 'bg-rose-500' : 'bg-slate-300 dark:bg-slate-700';
                            return <span key={lvl} className={`w-2 h-2 rounded-full ${cls}`} title={`Stage ${lvl}: ${s || 'Pending'}`} />;
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">กำลังโหลด...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">ไม่พบรายการ Concession</div>
        ) : (
          filtered.map((r) => {
            const stMeta = CONCESSION_STATUS_META[r.status] || CONCESSION_STATUS_META.PENDING_APPROVAL;
            return (
              <button
                key={r.id}
                type="button"
                onClick={() => openDetail(r.id)}
                className="w-full text-left p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-blue-600">{r.request_no}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${stMeta.badgeClass}`}>{stMeta.label}</span>
                </div>
                <div className="font-bold text-sm text-slate-900 dark:text-white line-clamp-2">{r.subject}</div>
                <div className="text-xs text-slate-500">{r.part_name} ({r.part_no}) • Qty: {formatQmsQty(r.qty)}</div>
              </button>
            );
          })
        )}
      </div>

      {/* Create / Edit Concession Modal */}
      {formOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <h3 className="font-bold text-base flex items-center gap-2">
                <FileSignature className="w-5 h-5 text-blue-600" />
                {form.id ? 'แก้ไขคำขอ Concession Request' : 'สร้างคำขอ Concession Request ใหม่'}
              </h3>
              <button type="button" onClick={() => setFormOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200/70">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveConcession} className="p-5 space-y-4 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Issued By (Department)</label>
                  <input type="text" required value={form.issued_by_dept} onChange={(e) => setForm((p) => ({ ...p, issued_by_dept: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Request To</label>
                  <input type="text" required value={form.request_to} onChange={(e) => setForm((p) => ({ ...p, request_to: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Request Date</label>
                  <input type="date" required value={form.request_date} onChange={(e) => setForm((p) => ({ ...p, request_date: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Requester Name *</label>
                  <input type="text" required value={form.person_name} onChange={(e) => setForm((p) => ({ ...p, person_name: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">หัวข้อเรื่อง (Subject) *</label>
                  <input type="text" required value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-600 mb-1">ชื่อชิ้นงาน (Part Name) *</label>
                  <input type="text" required value={form.part_name} onChange={(e) => setForm((p) => ({ ...p, part_name: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Part No. *</label>
                  <input type="text" required value={form.part_no} onChange={(e) => setForm((p) => ({ ...p, part_no: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">จำนวน (Qty) *</label>
                  <input type="number" min="0.0001" step="any" required value={form.qty} onChange={(e) => setForm((p) => ({ ...p, qty: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Order No.</label>
                  <input type="text" value={form.order_no} onChange={(e) => setForm((p) => ({ ...p, order_no: e.target.value }))} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Lot No.</label>
                  <input type="text" value={form.lot_no} onChange={(e) => setForm((p) => ({ ...p, lot_no: e.target.value }))} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Model Name</label>
                  <input type="text" value={form.model_name} onChange={(e) => setForm((p) => ({ ...p, model_name: e.target.value }))} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">Mfg Date</label>
                  <input type="date" value={form.mfg_date} onChange={(e) => setForm((p) => ({ ...p, mfg_date: e.target.value }))} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">ข้อแตกต่างระหว่าง Part ปกติกับ Part ที่ขอใช้ (Difference Detail) *</label>
                  <textarea rows={2} required value={form.difference_detail} onChange={(e) => setForm((p) => ({ ...p, difference_detail: e.target.value }))} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เหตุผลในการขอใช้งานกรณีพิเศษ (Reason for Special Adopt) *</label>
                  <textarea rows={2} required value={form.reason_for_adopt} onChange={(e) => setForm((p) => ({ ...p, reason_for_adopt: e.target.value }))} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">สาเหตุของปัญหา (Root Cause) *</label>
                  <textarea rows={2} required value={form.root_cause} onChange={(e) => setForm((p) => ({ ...p, root_cause: e.target.value }))} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-amber-700 mb-1">มาตรการชั่วคราว (Tentative Measure) *</label>
                    <textarea rows={2} required value={form.measure_tentative} onChange={(e) => setForm((p) => ({ ...p, measure_tentative: e.target.value }))} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-amber-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-emerald-700 mb-1">มาตรการถาวร (Permanent Measure) *</label>
                    <textarea rows={2} required value={form.measure_permanent} onChange={(e) => setForm((p) => ({ ...p, measure_permanent: e.target.value }))} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-emerald-300 rounded-lg" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">เอกสารสนับสนุนเพิ่มเติม (Submit Report)</label>
                  <select value={form.is_report_needed} onChange={(e) => setForm((p) => ({ ...p, is_report_needed: e.target.value }))} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg">
                    <option value="1">Need (ต้องการเอกสารประกอบ)</option>
                    <option value="0">Not Need (ไม่ต้องการ)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">แนบรูปภาพ (สูงสุด 3 รูป)</label>
                  <label className="min-h-[42px] flex items-center justify-center gap-2 px-3 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer text-xs font-semibold text-slate-600">
                    <Upload className="w-4 h-4" />
                    {files.length > 0 ? `เลือกแล้ว ${files.length} รูป` : 'เลือกรูป JPG / PNG'}
                    <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="hidden" onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))} />
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setFormOpen(false)} className="min-h-[44px] px-4 rounded-lg border border-slate-300 text-sm font-semibold">ยกเลิก</button>
                <button type="submit" disabled={saving || !isOnline} className="min-h-[44px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold">
                  {saving ? 'กำลังบันทึก...' : 'บันทึกคำขอ Concession'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail & Internal 4-Stage Approval Modal */}
      {detailOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4">
          <div className="w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 flex flex-col max-h-[92vh] overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <span className="font-mono font-extrabold text-lg text-blue-600">{detail?.request_no || 'Loading...'}</span>
                {detail && (
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${(CONCESSION_STATUS_META[detail.status] || CONCESSION_STATUS_META.PENDING_APPROVAL).badgeClass}`}>
                    {(CONCESSION_STATUS_META[detail.status] || CONCESSION_STATUS_META.PENDING_APPROVAL).label}
                  </span>
                )}
              </div>
              <button type="button" onClick={() => setDetailOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200/70">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {detailLoading || !detail ? (
                <div className="py-12 text-center text-slate-500">กำลังโหลดข้อมูล...</div>
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm">
                    <div><span className="text-xs text-slate-500 block">หัวข้อเรื่อง</span><b>{detail.subject}</b></div>
                    <div><span className="text-xs text-slate-500 block">วันที่ / ผู้ขอ</span><b>{formatQmsDate(detail.request_date)} / {detail.person_name}</b></div>
                    <div><span className="text-xs text-slate-500 block">ชิ้นงาน</span><b>{detail.part_name} ({detail.part_no})</b></div>
                    <div><span className="text-xs text-slate-500 block">จำนวน / Order / Lot</span><b>{formatQmsQty(detail.qty)} | {detail.order_no || '-'} | {detail.lot_no || '-'}</b></div>
                    <div className="sm:col-span-2"><span className="text-xs text-slate-500 block">ความแตกต่างจากมาตรฐาน</span><div className="whitespace-pre-wrap text-xs mt-1">{detail.difference_detail || '-'}</div></div>
                    <div className="sm:col-span-2"><span className="text-xs text-slate-500 block">เหตุผลความจำเป็น</span><div className="whitespace-pre-wrap text-xs mt-1">{detail.reason_for_adopt || '-'}</div></div>
                    <div className="sm:col-span-2"><span className="text-xs text-slate-500 block">Root Cause</span><div className="whitespace-pre-wrap text-xs mt-1">{detail.root_cause || '-'}</div></div>
                    <div><span className="text-xs text-amber-600 block">มาตรการชั่วคราว</span><div className="whitespace-pre-wrap text-xs mt-1">{detail.measure_tentative || '-'}</div></div>
                    <div><span className="text-xs text-emerald-600 block">มาตรการถาวร</span><div className="whitespace-pre-wrap text-xs mt-1">{detail.measure_permanent || '-'}</div></div>
                  </div>

                  {/* Images */}
                  {[detail.attached_image_1, detail.attached_image_2, detail.attached_image_3].filter(Boolean).length > 0 && (
                    <div className="flex flex-wrap gap-3">
                      {[detail.attached_image_1, detail.attached_image_2, detail.attached_image_3].filter(Boolean).map((p) => {
                        const url = resolveQmsMediaUrl(p);
                        return (
                          <button key={p} type="button" onClick={() => setPreviewImg(url)} className="w-28 h-28 rounded-xl overflow-hidden border border-slate-200">
                            <img src={url} alt="Attachment" className="w-full h-full object-cover" />
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Internal 4-Stage Approval Panel (No External Customer Token Exposure) */}
                  <div className="space-y-2">
                    <div className="text-xs font-bold uppercase text-slate-500">สายอนุมัติภายใน (Internal 4-Stage Approval)</div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {CONCESSION_APPROVER_STAGES.map((stage) => {
                        const st = detail[`approver_${stage.level}_status`] || '';
                        const name = detail[`approver_${stage.level}_name`] || '';
                        const dt = detail[`approver_${stage.level}_date`];
                        return (
                          <div key={stage.level} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 flex flex-col justify-between gap-2">
                            <div>
                              <div className="text-[11px] font-bold text-slate-500">{stage.title}</div>
                              <div className="mt-1 flex items-center gap-1.5 text-xs font-bold">
                                {st === 'Approve' ? <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                  : st === 'Not Approve' ? <XCircle className="w-4 h-4 text-rose-500" />
                                    : <Clock className="w-4 h-4 text-amber-500" />}
                                <span>{st || 'Pending'}</span>
                              </div>
                              {name && <div className="text-xs text-slate-600 dark:text-slate-300 mt-1 truncate">{name}</div>}
                              {dt && <div className="text-[11px] text-slate-400">{formatQmsDate(dt)}</div>}
                            </div>
                            <div className="flex gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <button
                                type="button"
                                disabled={!isOnline || approvingLevel === stage.level}
                                onClick={() => handleApproveStage(stage.level, 'Approve')}
                                className="flex-1 min-h-[36px] px-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[11px] font-bold"
                              >
                                Approve
                              </button>
                              <button
                                type="button"
                                disabled={!isOnline || approvingLevel === stage.level}
                                onClick={() => handleApproveStage(stage.level, 'Not Approve')}
                                className="flex-1 min-h-[36px] px-2 rounded-lg border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-50 text-[11px] font-bold"
                              >
                                Reject
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>

            {detail && (
              <div className="px-5 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  onClick={() => openQmsPrintWindow({ title: `${detail.request_no} - Concession`, bodyHtml: buildConcessionPrintHtml([detail]) })}
                  className="min-h-[42px] px-4 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold inline-flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4 text-blue-600" /> พิมพ์ A4 / PDF
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={() => openEditModal(detail)}
                    className="min-h-[42px] px-4 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
                  >
                    <Edit3 className="w-4 h-4" /> แก้ไขข้อมูล
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {previewImg && (
        <div onClick={() => setPreviewImg('')} className="fixed inset-0 z-[60] bg-slate-950/85 flex items-center justify-center p-4">
          <img src={previewImg} alt="Concession" className="max-w-full max-h-[88vh] rounded-xl shadow-2xl object-contain" />
        </div>
      )}
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { X, Edit3, Trash2, CheckCircle2, Layers } from 'lucide-react';
import { qmsScheduleApi } from '../../../shared/services/qmsApi';
import { formatQmsDateInput } from '../utils/qmsFormatters';

/**
 * Shared Inspection Result, PO Detail Editor, and Bulk Ticket Modals
 * reused by both QA/QC Schedule and QA/QC Planner Calendar tabs.
 */
export function QaInspectionModal({ po, qcUsers, isOnline, toast, onClose, onSaved }) {
  const [status, setStatus] = useState('WAITING');
  const [result, setResult] = useState('PENDING');
  const [actualDate, setActualDate] = useState('');
  const [ticketNo, setTicketNo] = useState('');
  const [inspector, setInspector] = useState('');
  const [inspectType, setInspectType] = useState('');
  const [remark, setRemark] = useState('');
  const [saving, setSaving] = useState(false);
  const [requireForceRemove, setRequireForceRemove] = useState(false);

  useEffect(() => {
    if (!po) return;
    const rawSt = String(po.inspection_status || 'WAITING').trim().toUpperCase();
    const rawRes = String(po.inspection_result || 'PENDING').trim().toUpperCase();
    setStatus(['IN_PROGRESS', 'DONE'].includes(rawSt) ? rawSt : 'WAITING');
    setResult(['PASS', 'FAIL'].includes(rawRes) ? rawRes : 'PENDING');
    setActualDate(formatQmsDateInput(po.actual_inspection_date));
    setTicketNo(po.ticket_number || '');
    setInspector(po.qa_inspector || '');
    setInspectType(po.inspect_type || '');
    setRemark(po.inspection_remark || '');
    setRequireForceRemove(false);
  }, [po]);

  if (!po) return null;

  const handleStatusChange = (nextSt) => {
    setStatus(nextSt);
    if (nextSt === 'WAITING') {
      setResult('PENDING');
    } else if (nextSt === 'DONE' && result === 'PENDING') {
      setResult('PASS');
      if (!actualDate) setActualDate(new Date().toISOString().slice(0, 10));
    }
  };

  const handleResultChange = (nextRes) => {
    setResult(nextRes);
    if (nextRes === 'PASS' || nextRes === 'FAIL') {
      setStatus('DONE');
      if (!actualDate) setActualDate(new Date().toISOString().slice(0, 10));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) return;
    setSaving(true);
    try {
      const res = await qmsScheduleApi.updateResult({
        id: po.id,
        inspection_status: status,
        inspection_result: result,
        actual_inspection_date: actualDate,
        ticket_number: ticketNo,
        qa_inspector: inspector,
        inspect_type: inspectType,
        remark,
      });
      toast.success(res.message || 'อัปเดตผลการตรวจเรียบร้อยแล้ว');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถอัปเดตผลการตรวจได้');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (forceFlag = '0') => {
    if (!isOnline) return;
    setSaving(true);
    try {
      const res = await qmsScheduleApi.removeSchedule(po.id, forceFlag);
      if (res.require_force || res.data?.require_force) {
        setRequireForceRemove(true);
        setSaving(false);
        return;
      }
      toast.success(res.message || 'นำออกจากตารางตรวจเรียบร้อยแล้ว');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถนำรายการออกได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div>
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">อัปเดตผลการตรวจ QA/QC</h3>
            <div className="text-xs font-mono font-bold text-blue-600">{po.po_number} • {po.sku}</div>
          </div>
          <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-slate-200/70">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Ticket No.</label>
              <input type="text" value={ticketNo} onChange={(e) => setTicketNo(e.target.value)} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Inspector</label>
              <input type="text" list="qa-qc-users-datalist" value={inspector} onChange={(e) => setInspector(e.target.value)} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
              <datalist id="qa-qc-users-datalist">
                {qcUsers.map((u) => <option key={u.id} value={u.fullname}>{u.aka ? `${u.fullname} (${u.aka})` : u.fullname}</option>)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">รูปแบบการตรวจ (Inspect Type)</label>
              <div className="grid grid-cols-2 gap-2">
                {['Remote', 'On-site'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInspectType(inspectType === t ? '' : t)}
                    className={`min-h-[40px] rounded-lg border text-xs font-bold ${
                      inspectType === t ? 'bg-blue-600 text-white border-blue-600' : 'bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Actual Inspection Date</label>
              <input type="date" value={actualDate} onChange={(e) => setActualDate(e.target.value)} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">สถานะการตรวจ (Inspection Status)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'WAITING', label: 'WAITING', cls: 'bg-slate-700 text-white' },
                { val: 'IN_PROGRESS', label: 'IN PROGRESS', cls: 'bg-amber-600 text-white' },
                { val: 'DONE', label: 'DONE', cls: 'bg-emerald-600 text-white' },
              ].map((s) => (
                <button
                  key={s.val}
                  type="button"
                  onClick={() => handleStatusChange(s.val)}
                  className={`min-h-[42px] rounded-lg border text-xs font-bold ${status === s.val ? s.cls : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">ผลการตรวจ (Inspection Result)</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { val: 'PENDING', label: 'PENDING', cls: 'bg-slate-700 text-white' },
                { val: 'PASS', label: 'PASS', cls: 'bg-emerald-600 text-white' },
                { val: 'FAIL', label: 'FAIL', cls: 'bg-rose-600 text-white' },
              ].map((r) => (
                <button
                  key={r.val}
                  type="button"
                  onClick={() => handleResultChange(r.val)}
                  className={`min-h-[42px] rounded-lg border text-xs font-bold ${result === r.val ? r.cls : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'}`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">หมายเหตุ (Remark)</label>
            <textarea rows={2} value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
          </div>

          {requireForceRemove && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2">
              <div className="font-bold text-amber-900">รายการนี้อยู่ระหว่างตรวจหรือปิดงานแล้ว ต้องการล้างตารางตรวจและผลตรวจทั้งหมดใช่หรือไม่?</div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRequireForceRemove(false)} className="min-h-[36px] px-3 rounded bg-white border border-slate-300 font-bold">ไม่</button>
                <button type="button" disabled={!isOnline} onClick={() => handleRemove('1')} className="min-h-[36px] px-3 rounded bg-rose-600 text-white font-bold">ยืนยันนำออกจากตาราง</button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap justify-between gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              disabled={!isOnline || saving}
              onClick={() => handleRemove('0')}
              className="min-h-[42px] px-3 rounded-lg border border-rose-200 text-rose-600 text-xs font-bold inline-flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" /> นำออกจากตาราง
            </button>
            <button
              type="submit"
              disabled={!isOnline || saving}
              className="min-h-[42px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold inline-flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" /> บันทึกผลการตรวจ
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function QaEditPoModal({ po, isOnline, toast, onClose, onSaved }) {
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!po) return;
    setForm({
      po_id: po.id,
      po_number: po.po_number || '',
      sku: po.sku || '',
      description: po.description || '',
      color: po.color || '',
      quantity: String(po.quantity ?? ''),
      dc_location: po.dc_location || '',
      loading_date: formatQmsDateInput(po.loading_date),
      loading_week: po.loading_week || '',
    });
  }, [po]);

  if (!po) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) return;
    setSaving(true);
    try {
      const res = await qmsScheduleApi.updatePoDetails(form);
      toast.success(res.message || 'แก้ไขข้อมูล PO เรียบร้อยแล้ว');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถแก้ไขข้อมูล PO ได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-amber-50 dark:bg-amber-950/30">
          <h3 className="font-bold text-sm flex items-center gap-2"><Edit3 className="w-4 h-4 text-amber-600" /> แก้ไขข้อมูล PO (Edit PO Details)</h3>
          <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">PO Number *</label>
              <input type="text" required value={form.po_number || ''} onChange={(e) => setForm((p) => ({ ...p, po_number: e.target.value }))} className="w-full min-h-[40px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">SKU</label>
              <input type="text" value={form.sku || ''} onChange={(e) => setForm((p) => ({ ...p, sku: e.target.value }))} className="w-full min-h-[40px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Description</label>
            <input type="text" value={form.description || ''} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full min-h-[40px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-bold mb-1">Color</label>
              <input type="text" value={form.color || ''} onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Quantity</label>
              <input type="number" min="0" step="any" value={form.quantity || ''} onChange={(e) => setForm((p) => ({ ...p, quantity: e.target.value }))} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">DC Location</label>
              <input type="text" value={form.dc_location || ''} onChange={(e) => setForm((p) => ({ ...p, dc_location: e.target.value }))} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Loading Date</label>
              <input type="date" value={form.loading_date || ''} onChange={(e) => setForm((p) => ({ ...p, loading_date: e.target.value }))} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Loading Week</label>
              <input type="text" value={form.loading_week || ''} onChange={(e) => setForm((p) => ({ ...p, loading_week: e.target.value }))} placeholder="e.g. WK32" className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="min-h-[42px] px-4 rounded-lg border border-slate-300 text-xs font-bold">ยกเลิก</button>
            <button type="submit" disabled={!isOnline || saving} className="min-h-[42px] px-5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold">บันทึกการแก้ไข PO</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function QaBulkTicketModal({ poIds, qcUsers, isOnline, toast, onClose, onSaved }) {
  const [ticketNo, setTicketNo] = useState('');
  const [inspector, setInspector] = useState('');
  const [inspectType, setInspectType] = useState('');
  const [inspectionDate, setInspectionDate] = useState('');
  const [saving, setSaving] = useState(false);

  if (!poIds || poIds.length === 0) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) return;
    setSaving(true);
    try {
      const res = await qmsScheduleApi.bulkUpdateTicket({
        po_ids: poIds,
        ticket_number: ticketNo,
        qa_inspector: inspector,
        inspect_type: inspectType,
        inspection_date: inspectionDate,
      });
      toast.success(res.message || 'อัปเดต Ticket หลายรายการสำเร็จ');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถอัปเดต Ticket ได้');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-blue-50 dark:bg-blue-950/30">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600" /> Bulk Update ({poIds.length} POs)
          </h3>
          <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          <div>
            <label className="block text-xs font-bold mb-1">Ticket Number</label>
            <input type="text" value={ticketNo} onChange={(e) => setTicketNo(e.target.value)} placeholder="INSP-XXXX" className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Inspector</label>
            <input type="text" list="qa-bulk-qc-list" value={inspector} onChange={(e) => setInspector(e.target.value)} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            <datalist id="qa-bulk-qc-list">
              {qcUsers.map((u) => <option key={u.id} value={u.fullname} />)}
            </datalist>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold mb-1">Inspect Type</label>
              <div className="grid grid-cols-2 gap-1.5">
                {['Remote', 'On-site'].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setInspectType(inspectType === t ? '' : t)}
                    className={`min-h-[40px] rounded-lg border text-xs font-bold ${inspectType === t ? 'bg-blue-600 text-white border-blue-600' : 'border-slate-200 dark:border-slate-700'}`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">Plan Date (ถ้าต้องการเปลี่ยน)</label>
              <input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="w-full min-h-[40px] px-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3 border-t border-slate-200 dark:border-slate-800">
            <button type="button" onClick={onClose} className="min-h-[42px] px-4 rounded-lg border border-slate-300 text-xs font-bold">ยกเลิก</button>
            <button type="submit" disabled={!isOnline || saving} className="min-h-[42px] px-5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">อัปเดตทั้ง {poIds.length} รายการ</button>
          </div>
        </form>
      </div>
    </div>
  );
}

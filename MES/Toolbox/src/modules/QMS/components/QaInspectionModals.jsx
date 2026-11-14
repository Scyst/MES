import React, { useEffect, useState } from 'react';
import { X, Edit3, Trash2, CheckCircle2, Layers, History, RotateCcw, Lock } from 'lucide-react';
import { qmsScheduleApi } from '../../../shared/services/qmsApi';
import { formatLocalYmd, formatQmsDate, formatQmsDateInput, normalizeQaStatus } from '../utils/qmsFormatters';

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

  const [historyRows, setHistoryRows] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [reopenForm, setReopenForm] = useState({
    schedule_date: formatLocalYmd(),
    ticket_number: '',
    qa_inspector: '',
    inspect_type: '',
    remark: '',
  });

  useEffect(() => {
    if (!po) return;
    const norm = normalizeQaStatus(po);
    const rawSt = String(po.inspection_status || 'WAITING').trim().toUpperCase();
    setStatus(norm.isDone ? 'DONE' : rawSt === 'IN_PROGRESS' ? 'IN_PROGRESS' : 'WAITING');
    setResult(norm.isFailed ? 'FAIL' : norm.isPassed ? 'PASS' : 'PENDING');
    setActualDate(formatQmsDateInput(po.actual_inspection_date));
    setTicketNo(po.ticket_number || '');
    setInspector(po.qa_inspector || '');
    setInspectType(po.inspect_type || '');
    setRemark(po.inspection_remark || '');
    setRequireForceRemove(false);
    setReopenOpen(false);
    setReopenForm({
      schedule_date: formatLocalYmd(),
      ticket_number: '',
      qa_inspector: po.qa_inspector || '',
      inspect_type: po.inspect_type || '',
      remark: '',
    });

    let active = true;
    setLoadingHistory(true);
    qmsScheduleApi.getPoHistory(po.id)
      .then((res) => {
        if (active) setHistoryRows(Array.isArray(res.data) ? res.data : []);
      })
      .catch(() => {
        if (active) setHistoryRows([]);
      })
      .finally(() => {
        if (active) setLoadingHistory(false);
      });

    return () => { active = false; };
  }, [po]);

  if (!po) return null;

  const isArchived = Number(po.is_latest ?? 1) === 0 || po.is_latest === false;
  const roundNo = Number(po.round_no || 1);
  const totalRounds = Math.max(Number(po.total_rounds || roundNo || 1), historyRows.length || 1);
  const poNorm = normalizeQaStatus(po);

  const handleStatusChange = (nextSt) => {
    if (isArchived) return;
    setStatus(nextSt);
    if (nextSt === 'WAITING') {
      setResult('PENDING');
    } else if (nextSt === 'DONE' && result === 'PENDING') {
      setResult('PASS');
      if (!actualDate) setActualDate(formatLocalYmd());
    }
  };

  const handleResultChange = (nextRes) => {
    if (isArchived) return;
    setResult(nextRes);
    if (nextRes === 'PASS' || nextRes === 'FAIL') {
      setStatus('DONE');
      if (!actualDate) setActualDate(formatLocalYmd());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline || isArchived) return;
    setSaving(true);
    try {
      const res = await qmsScheduleApi.updateResult({
        id: po.id,
        history_id: po.history_id || null,
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
    if (!isOnline || isArchived) return;
    setSaving(true);
    try {
      const res = await qmsScheduleApi.removeSchedule(po.id, forceFlag, po.history_id || null);
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

  const handleReopenSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline || !reopenForm.schedule_date) return;
    setReopening(true);
    try {
      const res = await qmsScheduleApi.reopenInspection({
        id: po.id,
        ...reopenForm,
      });
      toast.success(res.message || 'เปิดตรวจรอบใหม่เรียบร้อยแล้ว');
      onSaved?.();
      onClose();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถเปิดตรวจรอบใหม่ได้');
    } finally {
      setReopening(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 overflow-y-auto">
      <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden my-auto max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 gap-2">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-sm text-slate-900 dark:text-white">อัปเดตผลการตรวจ QA/QC</h3>
              <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${isArchived ? 'bg-slate-200 text-slate-700' : 'bg-sky-100 text-sky-800'}`}>
                รอบที่ {roundNo}{totalRounds > 1 ? `/${totalRounds}` : ''}
              </span>
              {isArchived && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1">
                  <Lock className="w-3 h-3" /> History (Read-Only)
                </span>
              )}
            </div>
            <div className="text-xs font-mono font-bold text-blue-600 mt-0.5">{po.po_number} • {po.sku}</div>
          </div>
          <div className="flex items-center gap-1.5">
            {(isArchived || poNorm.isDone) && (
              <button
                type="button"
                disabled={!isOnline}
                onClick={() => setReopenOpen((v) => !v)}
                className="min-h-[36px] px-2.5 rounded-lg border border-blue-300 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-bold inline-flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> เปิดตรวจรอบใหม่
              </button>
            )}
            <button type="button" onClick={onClose} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg hover:bg-slate-200/70">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {isArchived && (
            <div className="mx-5 mt-4 p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs text-amber-900 flex items-start gap-2">
              <Lock className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
              <div>
                <b>ประวัติการตรวจรอบเก่า (Read-Only):</b> ข้อมูลรอบนี้ถูกเก็บถาวรเพื่อป้องกันการทับซ้อน หากต้องการตรวจ PO นี้ซ้ำ กรุณากดปุ่ม <b>"เปิดตรวจรอบใหม่"</b>
              </div>
            </div>
          )}

          {reopenOpen && (
            <form onSubmit={handleReopenSubmit} className="mx-5 mt-4 p-4 rounded-xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-300 dark:border-sky-800 space-y-3">
              <div className="font-bold text-xs text-sky-900 dark:text-sky-200 flex items-center gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> เปิดรอบตรวจใหม่ (ระบบจะเก็บประวัติรอบเดิมไว้ครบถ้วน)
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-bold mb-1">Plan Date รอบใหม่ *</label>
                  <input type="date" required value={reopenForm.schedule_date} onChange={(e) => setReopenForm((p) => ({ ...p, schedule_date: e.target.value }))} className="w-full min-h-[38px] px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Ticket No. รอบใหม่</label>
                  <input type="text" value={reopenForm.ticket_number} onChange={(e) => setReopenForm((p) => ({ ...p, ticket_number: e.target.value }))} placeholder="ระบุหรือเว้นว่าง" className="w-full min-h-[38px] px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">Inspector รอบใหม่</label>
                  <input type="text" list="qa-qc-users-datalist" value={reopenForm.qa_inspector} onChange={(e) => setReopenForm((p) => ({ ...p, qa_inspector: e.target.value }))} className="w-full min-h-[38px] px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-[11px] font-bold mb-1">รูปแบบการตรวจ</label>
                  <select value={reopenForm.inspect_type} onChange={(e) => setReopenForm((p) => ({ ...p, inspect_type: e.target.value }))} className="w-full min-h-[38px] px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg">
                    <option value="">-- ตามเดิม / เลือกใหม่ --</option>
                    <option value="Remote">Remote</option>
                    <option value="On-site">On-site</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold mb-1">หมายเหตุการเปิดตรวจซ้ำ</label>
                <input type="text" value={reopenForm.remark} onChange={(e) => setReopenForm((p) => ({ ...p, remark: e.target.value }))} placeholder="เช่น นัดตรวจซ้ำหลังแก้ไขงาน" className="w-full min-h-[38px] px-2.5 text-xs bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg" />
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setReopenOpen(false)} className="min-h-[36px] px-3 rounded-lg border border-slate-300 bg-white text-xs font-bold">ยกเลิก</button>
                <button type="submit" disabled={!isOnline || reopening} className="min-h-[36px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold">ยืนยันเปิดรอบใหม่</button>
              </div>
            </form>
          )}

          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ticket No.</label>
                <input type="text" disabled={isArchived} value={ticketNo} onChange={(e) => setTicketNo(e.target.value)} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Inspector</label>
                <input type="text" disabled={isArchived} list="qa-qc-users-datalist" value={inspector} onChange={(e) => setInspector(e.target.value)} className="w-full min-h-[42px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60" />
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
                      disabled={isArchived}
                      onClick={() => setInspectType(inspectType === t ? '' : t)}
                      className={`min-h-[40px] rounded-lg border text-xs font-bold disabled:opacity-60 ${
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
                <input type="date" disabled={isArchived} value={actualDate} onChange={(e) => setActualDate(e.target.value)} className="w-full min-h-[40px] px-2.5 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60" />
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
                    disabled={isArchived}
                    onClick={() => handleStatusChange(s.val)}
                    className={`min-h-[42px] rounded-lg border text-xs font-bold disabled:opacity-60 ${status === s.val ? s.cls : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'}`}
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
                    disabled={isArchived}
                    onClick={() => handleResultChange(r.val)}
                    className={`min-h-[42px] rounded-lg border text-xs font-bold disabled:opacity-60 ${result === r.val ? r.cls : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950'}`}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">หมายเหตุ (Remark)</label>
              <textarea rows={2} disabled={isArchived} value={remark} onChange={(e) => setRemark(e.target.value)} className="w-full px-3 py-2 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-60" />
            </div>

            {requireForceRemove && !isArchived && (
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-xs space-y-2">
                <div className="font-bold text-amber-900">รายการนี้อยู่ระหว่างตรวจหรือปิดงานแล้ว ต้องการล้างตารางตรวจและผลตรวจรอบนี้ใช่หรือไม่?</div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setRequireForceRemove(false)} className="min-h-[36px] px-3 rounded bg-white border border-slate-300 font-bold">ไม่</button>
                  <button type="button" disabled={!isOnline} onClick={() => handleRemove('1')} className="min-h-[36px] px-3 rounded bg-rose-600 text-white font-bold">ยืนยันนำออกจากตาราง</button>
                </div>
              </div>
            )}

            {!isArchived && (
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
            )}
          </form>

          {/* Inspection History Timeline */}
          <div className="px-5 pb-5 pt-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-950/60 space-y-2">
            <div className="flex items-center justify-between pt-2">
              <div className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <History className="w-3.5 h-3.5 text-blue-600" /> ประวัติการตรวจของ PO นี้ ({historyRows.length} รอบ)
              </div>
            </div>
            {loadingHistory ? (
              <div className="text-xs text-slate-400 py-2">กำลังโหลดประวัติการตรวจ...</div>
            ) : historyRows.length === 0 ? (
              <div className="text-xs text-slate-400 py-2">ยังไม่มีประวัติการตรวจในระบบ</div>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {historyRows.map((h) => {
                  const hNorm = normalizeQaStatus(h);
                  const hBadge = hNorm.isFailed ? 'bg-rose-100 text-rose-700' : hNorm.isPassed ? 'bg-emerald-100 text-emerald-700' : hNorm.isInProgress ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-700';
                  const isCurr = Number(h.is_latest) === 1;
                  return (
                    <div key={h.history_id} className={`p-2.5 rounded-lg border text-xs ${isCurr ? 'bg-white dark:bg-slate-900 border-blue-200 dark:border-blue-800' : 'bg-slate-100/70 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>รอบที่ {h.round_no}</span>
                          {isCurr && <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-700 text-[10px]">ล่าสุด</span>}
                          {h.ticket_number && <span className="font-mono text-[11px] text-slate-500">({h.ticket_number})</span>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${hBadge}`}>
                          {hNorm.isFailed ? 'FAIL' : hNorm.isPassed ? 'PASS' : hNorm.isDone ? 'DONE' : hNorm.isInProgress ? 'IN PROGRESS' : 'WAITING'}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                        <span>Plan: {formatQmsDate(h.scheduled_date)}</span>
                        {h.actual_inspection_date && <span>Actual: {formatQmsDate(h.actual_inspection_date)}</span>}
                        {h.qa_inspector && <span>QC: {h.qa_inspector}</span>}
                        {h.inspect_type && <span>Type: {h.inspect_type}</span>}
                      </div>
                      {h.inspection_remark && <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">{h.inspection_remark}</div>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
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

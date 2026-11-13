import React, { useEffect, useState } from 'react';
import {
  X, Save, ArrowDownCircle, ArrowUpCircle, ArrowLeftRight,
  Handshake, Building2, Banknote, Link2, Trash2, AlertTriangle, Loader2
} from 'lucide-react';
import {
  ALL_VEHICLE_PRESETS,
  CONTAINER_VEHICLE_PRESETS,
  DEFAULT_FLEET_COST,
  PROVIDER_OPTIONS,
  TRANS_TYPE_OPTIONS,
  TRUCK_VEHICLE_PRESETS,
  VEHICLE_LABELS,
  formatCurrency,
  getCurrentLocalDatetime,
  toDatetimeLocal,
  validateCostInput
} from '../utils/fleetLogHelpers';

const INITIAL_FORM = {
  log_id: '',
  trans_type: 'INBOUND',
  provider_type: 'VENDOR',
  vehicle_select: '',
  vehicle_other: '',
  car_license: '',
  container_no: '',
  seal_no: '',
  ref_document: '',
  transport_cost: String(DEFAULT_FLEET_COST),
  log_timestamp: '',
  remark: ''
};

export function FleetEntryModal({
  isOpen,
  mode = 'create',
  initialData = null,
  onClose,
  onSubmit,
  isOffline = false
}) {
  const [form, setForm] = useState(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    if (mode === 'edit' && initialData) {
      const existingVehicle = String(initialData.vehicle_type || '').trim();
      const isPreset = ALL_VEHICLE_PRESETS.includes(existingVehicle);
      const parsedCost = Number.parseFloat(initialData.transport_cost || 0);
      setForm({
        log_id: initialData.log_id,
        trans_type: initialData.trans_type || 'INBOUND',
        provider_type: initialData.provider_type || 'VENDOR',
        vehicle_select: isPreset ? existingVehicle : (existingVehicle ? 'OTHER' : ''),
        vehicle_other: isPreset ? '' : existingVehicle,
        car_license: initialData.car_license || '',
        container_no: initialData.container_no || '',
        seal_no: initialData.seal_no || '',
        ref_document: initialData.ref_document || '',
        transport_cost: Number.isFinite(parsedCost) ? String(parsedCost) : String(DEFAULT_FLEET_COST),
        log_timestamp: toDatetimeLocal(initialData.log_timestamp),
        remark: initialData.remark || ''
      });
    } else {
      setForm({
        ...INITIAL_FORM,
        log_timestamp: getCurrentLocalDatetime()
      });
    }
  }, [isOpen, mode, initialData]);

  if (!isOpen) return null;

  const isEdit = mode === 'edit';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOffline) {
      setErrorMsg('ไม่สามารถบันทึกได้ขณะออฟไลน์ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
      return;
    }
    const finalVehicle = form.vehicle_select === 'OTHER' ? form.vehicle_other.trim() : form.vehicle_select.trim();
    if (!finalVehicle) {
      setErrorMsg('กรุณาระบุประเภทรถ หรือขนาดตู้คอนเทนเนอร์');
      return;
    }
    const costCheck = validateCostInput(form.transport_cost);
    if (!costCheck.valid) {
      setErrorMsg(costCheck.error);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await onSubmit({
        ...(isEdit ? { log_id: form.log_id } : {}),
        log_timestamp: form.log_timestamp,
        trans_type: form.trans_type,
        provider_type: form.provider_type,
        vehicle_type: finalVehicle,
        car_license: form.car_license.trim(),
        container_no: form.container_no.trim(),
        seal_no: form.seal_no.trim(),
        ref_document: form.ref_document.trim(),
        remark: form.remark.trim(),
        transport_cost: costCheck.value
      });
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[92vh] flex flex-col">
        <div className={`px-4 py-3 flex items-center justify-between text-white ${isEdit ? 'bg-cyan-700' : 'bg-blue-600'}`}>
          <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
            <Save className="w-4 h-4" />
            {isEdit ? 'แก้ไขข้อมูลเที่ยวรถ (Manual Edit)' : 'บันทึกข้อมูลเที่ยวรถ (Manual Entry)'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/20 transition"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
              1. ประเภทรายการ (Transaction Type) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {TRANS_TYPE_OPTIONS.map((opt) => {
                const active = form.trans_type === opt.value;
                const Icon = opt.value === 'INBOUND' ? ArrowDownCircle : opt.value === 'OUTBOUND' ? ArrowUpCircle : ArrowLeftRight;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, trans_type: opt.value }))}
                    className={`min-h-[44px] rounded-xl border-2 px-2 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-2">
              2. ผู้ให้บริการ (Provider) <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PROVIDER_OPTIONS.map((opt) => {
                const active = form.provider_type === opt.value;
                const Icon = opt.value === 'VENDOR' ? Handshake : Building2;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, provider_type: opt.value }))}
                    className={`min-h-[44px] rounded-xl border-2 px-3 py-2 text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      active
                        ? 'border-blue-600 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 shadow-sm'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              3. ประเภทรถ/ตู้ (Container / Vehicle Size) <span className="text-rose-500">*</span>
            </label>
            <select
              value={form.vehicle_select}
              onChange={(e) => setForm((prev) => ({ ...prev, vehicle_select: e.target.value }))}
              required
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-800 dark:text-slate-100"
            >
              <option value="">เลือกประเภท...</option>
              <optgroup label="ตู้คอนเทนเนอร์ (Container)">
                {CONTAINER_VEHICLE_PRESETS.map((code) => (
                  <option key={code} value={code}>{VEHICLE_LABELS[code] || code}</option>
                ))}
              </optgroup>
              <optgroup label="รถบรรทุก (Trucks)">
                {TRUCK_VEHICLE_PRESETS.map((code) => (
                  <option key={code} value={code}>{VEHICLE_LABELS[code] || code}</option>
                ))}
              </optgroup>
              <option value="OTHER">-- อื่นๆ (ระบุเอง) --</option>
            </select>
            {form.vehicle_select === 'OTHER' && (
              <input
                type="text"
                maxLength={50}
                required
                value={form.vehicle_other}
                onChange={(e) => setForm((prev) => ({ ...prev, vehicle_other: e.target.value }))}
                placeholder="ระบุประเภทตู้หรือประเภทรถ..."
                className="mt-2 w-full min-h-[44px] rounded-xl border border-blue-400 dark:border-blue-600 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">ทะเบียนรถ (License Plate)</label>
              <input
                type="text"
                maxLength={50}
                value={form.car_license}
                onChange={(e) => setForm((prev) => ({ ...prev, car_license: e.target.value }))}
                placeholder="(ไม่บังคับ)"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-semibold text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">ค่าขนส่ง (THB)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="9999999.999"
                value={form.transport_cost}
                onChange={(e) => setForm((prev) => ({ ...prev, transport_cost: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-right text-rose-600 dark:text-rose-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">วันที่และเวลา <span className="text-rose-500">*</span></label>
              <input
                type="datetime-local"
                required
                value={form.log_timestamp}
                onChange={(e) => setForm((prev) => ({ ...prev, log_timestamp: e.target.value }))}
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">เอกสารอ้างอิง (DO / PO)</label>
              <input
                type="text"
                maxLength={100}
                value={form.ref_document}
                onChange={(e) => setForm((prev) => ({ ...prev, ref_document: e.target.value }))}
                placeholder="(ไม่บังคับ)"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">หมายเลขตู้ (Container No.)</label>
              <input
                type="text"
                maxLength={50}
                value={form.container_no}
                onChange={(e) => setForm((prev) => ({ ...prev, container_no: e.target.value }))}
                placeholder="(ไม่บังคับ)"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">หมายเลขซีล (Seal No.)</label>
              <input
                type="text"
                maxLength={50}
                value={form.seal_no}
                onChange={(e) => setForm((prev) => ({ ...prev, seal_no: e.target.value }))}
                placeholder="(ไม่บังคับ)"
                className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">หมายเหตุเพิ่มเติม</label>
            <input
              type="text"
              maxLength={255}
              value={form.remark}
              onChange={(e) => setForm((prev) => ({ ...prev, remark: e.target.value }))}
              placeholder="(ไม่บังคับ)"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || isOffline}
              className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2 shadow-sm"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>{isEdit ? 'บันทึกการแก้ไข' : 'บันทึกข้อมูล'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function QuickCostModal({ isOpen, rowData, onClose, onSubmit, isOffline = false }) {
  const [cost, setCost] = useState(String(DEFAULT_FLEET_COST));
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen || !rowData) return;
    setErrorMsg('');
    const currentCost = Number.parseFloat(rowData.transport_cost || 0);
    setCost(currentCost > 0 ? String(currentCost) : String(DEFAULT_FLEET_COST));
    setRemark(rowData.remark || '');
  }, [isOpen, rowData]);

  if (!isOpen || !rowData) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isOffline) {
      setErrorMsg('ไม่สามารถบันทึกได้ขณะออฟไลน์');
      return;
    }
    const costCheck = validateCostInput(cost);
    if (!costCheck.valid) {
      setErrorMsg(costCheck.error);
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await onSubmit({
        log_id: rowData.log_id,
        transport_cost: costCheck.value,
        remark: remark.trim()
      });
    } catch (err) {
      setErrorMsg(err?.response?.data?.message || err?.message || 'เกิดข้อผิดพลาดในการอัปเดตค่าขนส่ง');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="px-4 py-3 bg-rose-600 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Banknote className="w-4 h-4" /> บันทึกค่าขนส่ง (Quick Cost)
          </h3>
          <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div className="rounded-xl bg-slate-50 dark:bg-slate-800/70 p-3 text-xs space-y-1 text-slate-600 dark:text-slate-300">
            <p className="font-bold text-slate-900 dark:text-white">
              {rowData.car_license || rowData.ref_document || `Log #${rowData.log_id}`}
            </p>
            <p>ประเภท: {rowData.trans_type} • รถ/ตู้: {rowData.vehicle_type}</p>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/50 border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 dark:text-rose-300">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">
              ค่าขนส่ง (THB) <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="9999999.999"
              required
              autoFocus
              value={cost}
              onChange={(e) => setCost(e.target.value)}
              className="w-full min-h-[48px] rounded-xl border border-rose-300 dark:border-rose-700 bg-white dark:bg-slate-800 px-3 text-lg font-extrabold text-right text-rose-600 dark:text-rose-400"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1">หมายเหตุเพิ่มเติม</label>
            <input
              type="text"
              maxLength={255}
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              placeholder="(ไม่บังคับ)"
              className="w-full min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm text-slate-900 dark:text-slate-100"
            />
          </div>

          <div className="pt-2 border-t border-slate-200 dark:border-slate-800 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300">
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting || isOffline}
              className="min-h-[44px] px-5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-2"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              <span>บันทึก</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PendingCtpatModal({ isOpen, pendingList = [], loading = false, onClose, onSync, isOffline = false }) {
  const [costMap, setCostMap] = useState({});
  const [syncingId, setSyncingId] = useState(null);

  if (!isOpen) return null;

  const handleSyncRow = async (reportId) => {
    const rawCost = costMap[reportId] ?? String(DEFAULT_FLEET_COST);
    const check = validateCostInput(rawCost);
    if (!check.valid) return;
    setSyncingId(reportId);
    try {
      await onSync({ loading_report_id: reportId, transport_cost: check.value });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-3 sm:p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[88vh] flex flex-col">
        <div className="px-4 py-3 bg-indigo-600 text-white flex items-center justify-between">
          <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" /> ซิงค์ข้อมูลจากใบโหลด C-TPAT (Pending Sync)
          </h3>
          <button type="button" onClick={onClose} className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-white/20">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="py-10 text-center text-slate-500 flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
              <span className="text-sm">กำลังตรวจสอบใบโหลด C-TPAT ที่รอดำเนินการ...</span>
            </div>
          ) : pendingList.length === 0 ? (
            <div className="py-10 text-center text-slate-500 text-sm">
              ไม่พบรายการใบโหลด C-TPAT ที่รอซิงค์เข้าบัญชีเที่ยวรถ
            </div>
          ) : (
            pendingList.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-slate-200 dark:border-slate-800 p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40"
              >
                <div className="text-xs space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-white text-sm">
                      {item.po_number || `C-TPAT #${item.id}`}
                    </span>
                    {item.container_type && (
                      <span className="px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-700 font-semibold text-slate-700 dark:text-slate-200">
                        {item.container_type}
                      </span>
                    )}
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">
                    ทะเบียน: <strong>{item.car_license || '-'}</strong> • ตู้: <strong>{item.container_no || '-'}</strong> • ซีล: <strong>{item.seal_no || '-'}</strong>
                  </p>
                  <p className="text-slate-400">โหลดเสร็จสิ้น: {item.loading_end_time || '-'}</p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={costMap[item.id] ?? String(DEFAULT_FLEET_COST)}
                    onChange={(e) => setCostMap((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    className="w-28 min-h-[44px] rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 text-sm font-bold text-right text-rose-600"
                    aria-label="ค่าขนส่ง"
                  />
                  <button
                    type="button"
                    disabled={syncingId === item.id || isOffline}
                    onClick={() => handleSyncRow(item.id)}
                    className="min-h-[44px] px-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold whitespace-nowrap"
                  >
                    {syncingId === item.id ? 'กำลังซิงค์...' : 'ซิงค์เข้าบัญชี'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export function DeleteFleetModal({ isOpen, rowData, onClose, onConfirm, isOffline = false }) {
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !rowData) return null;

  const handleDelete = async () => {
    setSubmitting(true);
    try {
      await onConfirm(rowData.log_id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-full bg-rose-100 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">กรุณายืนยันการลบข้อมูล</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              ต้องการลบรายการเที่ยวรถทะเบียน <strong>{rowData.car_license || `#${rowData.log_id}`}</strong> ({rowData.vehicle_type}) ใช่หรือไม่? การดำเนินการนี้ไม่สามารถกู้คืนได้
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-slate-300 dark:border-slate-700 text-sm font-bold text-slate-600 dark:text-slate-300"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={submitting || isOffline}
            onClick={handleDelete}
            className="min-h-[44px] px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-bold flex items-center gap-1.5"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
            <span>ยืนยันการลบ</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export function CostPreviewBadge({ amount }) {
  const num = Number.parseFloat(amount || 0);
  if (!Number.isFinite(num) || num <= 0) {
    return <span className="text-slate-400 dark:text-slate-600">-</span>;
  }
  return <span className="font-bold text-rose-600 dark:text-rose-400 tabular-nums">฿{formatCurrency(num)}</span>;
}

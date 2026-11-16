import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Edit3,
  LogIn,
  LogOut,
  MapPin,
  QrCode,
  Search,
  UserCheck,
  X,
} from 'lucide-react';
import { areaAccessApi } from '../../../shared/services/areaAccessApi';
import { playAreaBeep } from '../utils/areaAccessHelpers';

/**
 * Scan IN/OUT Modal with quick barcode verification and Visitor detail support.
 */
export function ScanAccessModal({
  open,
  onClose,
  locations,
  defaultLocationId,
  employees,
  isOnline,
  onSuccess,
}) {
  const [locationId, setLocationId] = useState(defaultLocationId || '');
  const [empId, setEmpId] = useState('');
  const [purpose, setPurpose] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [visitorCompany, setVisitorCompany] = useState('');
  const [verifiedEmp, setVerifiedEmp] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const empInputRef = useRef(null);
  const visitorInputRef = useRef(null);
  const submitBtnRef = useRef(null);

  useEffect(() => {
    if (open) {
      setLocationId((prev) => prev || defaultLocationId || '');
      setEmpId('');
      setPurpose('');
      setVisitorName('');
      setVisitorCompany('');
      setVerifiedEmp(null);
      setErrorMsg('');
      setTimeout(() => empInputRef.current?.focus(), 80);
    }
  }, [open, defaultLocationId]);

  if (!open) return null;

  const handleEmpChange = (val) => {
    setEmpId(val);
    setVerifiedEmp(null);
    setErrorMsg('');
  };

  const handleVerify = async (e) => {
    e?.preventDefault();
    const trimmed = empId.trim();
    if (!trimmed) {
      setErrorMsg('กรุณาสแกนหรือกรอกรหัสพนักงาน / Visitor');
      return;
    }
    if (!isOnline) {
      setErrorMsg('ไม่สามารถตรวจสอบรหัสพนักงานขณะออฟไลน์');
      return;
    }

    setVerifying(true);
    setErrorMsg('');
    try {
      const res = await areaAccessApi.verifyEmployee(trimmed);
      const info = res.data;
      setVerifiedEmp(info);
      playAreaBeep('success');
      if (info?.is_visitor) {
        setTimeout(() => visitorInputRef.current?.focus(), 80);
      } else {
        setTimeout(() => submitBtnRef.current?.focus(), 80);
      }
    } catch (err) {
      playAreaBeep('error');
      setVerifiedEmp(null);
      setErrorMsg(err?.message || 'ไม่พบข้อมูลรหัสพนักงาน');
      setEmpId('');
      setTimeout(() => empInputRef.current?.focus(), 60);
    } finally {
      setVerifying(false);
    }
  };

  const handleSubmit = async () => {
    if (!verifiedEmp || !locationId || !isOnline) return;
    let finalPurpose = purpose.trim();

    if (verifiedEmp.is_visitor) {
      if (!visitorName.trim()) {
        setErrorMsg('กรุณาระบุชื่อ-นามสกุล ของบุคคลภายนอก (Visitor)');
        visitorInputRef.current?.focus();
        return;
      }
      const companyPart = visitorCompany.trim() ? ` / ${visitorCompany.trim()}` : '';
      const vPrefix = `[Visitor: ${visitorName.trim()}${companyPart}]`;
      finalPurpose = finalPurpose ? `${vPrefix} ${finalPurpose}` : vPrefix;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const res = await areaAccessApi.recordAccess({
        empId: verifiedEmp.emp_id,
        locationId: Number(locationId),
        purpose: finalPurpose,
      });
      playAreaBeep('success');
      onSuccess(res.message || 'บันทึกเข้า-ออกพื้นที่สำเร็จ');
      setEmpId('');
      setPurpose('');
      setVisitorName('');
      setVisitorCompany('');
      setVerifiedEmp(null);
      setTimeout(() => empInputRef.current?.focus(), 80);
    } catch (err) {
      playAreaBeep('error');
      setErrorMsg(err?.message || 'บันทึกไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
          <div className="flex items-center gap-2 font-bold">
            <QrCode size={18} />
            <span>บันทึกเข้า-ออกพื้นที่หวงห้าม</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-blue-700/80"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 bg-gray-50 dark:bg-gray-900/60">
          <form onSubmit={handleVerify} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
            <div className="sm:col-span-5">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                สถานที่ (Location) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <MapPin size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-600" />
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  className="w-full min-h-[44px] pl-8 pr-3 py-2 text-sm font-semibold rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-blue-700 dark:text-blue-300"
                  required
                >
                  <option value="">-- เลือกสถานที่ --</option>
                  {locations.map((loc) => (
                    <option key={loc.location_id} value={String(loc.location_id)}>
                      {loc.location_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="sm:col-span-7">
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                รหัสพนักงาน / Visitor <span className="text-red-500">*</span>
              </label>
              <div className="flex gap-1.5">
                <input
                  ref={empInputRef}
                  type="text"
                  list="areaAccessEmpList"
                  value={empId}
                  onChange={(e) => handleEmpChange(e.target.value)}
                  placeholder="สแกนบาร์โค้ด หรือพิมพ์รหัส..."
                  className="flex-1 min-w-0 min-h-[44px] px-3 py-2 text-sm font-bold text-center rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                  autoComplete="off"
                />
                <datalist id="areaAccessEmpList">
                  {employees.map((emp) => (
                    <option key={emp.emp_id} value={emp.emp_id}>
                      {emp.name_th}
                    </option>
                  ))}
                </datalist>
                <button
                  type="submit"
                  disabled={verifying || !isOnline}
                  className="min-h-[44px] min-w-[44px] px-3 rounded-xl bg-gray-700 hover:bg-gray-800 text-white font-semibold flex items-center justify-center disabled:opacity-50"
                  title="ตรวจสอบรหัสพนักงาน"
                >
                  <Search size={16} />
                </button>
              </div>
            </div>
          </form>

          {errorMsg && (
            <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-red-950/40 dark:border-red-800 px-3 py-2.5 text-sm text-red-700 dark:text-red-300 font-medium">
              {errorMsg}
            </div>
          )}

          {verifiedEmp && (
            <div className="space-y-3">
              <div
                className={`rounded-xl p-3 border flex items-center gap-3 ${
                  verifiedEmp.next_action === 'IN'
                    ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800'
                    : 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-full flex items-center justify-center shrink-0 ${
                    verifiedEmp.next_action === 'IN'
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'bg-amber-100 text-amber-700'
                  }`}
                >
                  {verifiedEmp.next_action === 'IN' ? <LogIn size={20} /> : <LogOut size={20} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-gray-900 dark:text-white truncate">
                    {verifiedEmp.emp_name}
                  </div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 truncate">
                    {verifiedEmp.emp_id} • {verifiedEmp.position || 'พนักงาน'}
                    {verifiedEmp.line ? ` • ${verifiedEmp.line}` : ''}
                  </div>
                  <span
                    className={`mt-1 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                      verifiedEmp.next_action === 'IN'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    {verifiedEmp.next_action === 'IN' ? 'สแกนเข้าพื้นที่ (IN)' : 'สแกนออกพื้นที่ (OUT)'}
                  </span>
                </div>
              </div>

              {verifiedEmp.is_visitor && (
                <div className="rounded-xl p-3 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 space-y-2">
                  <div className="text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                    <UserCheck size={14} /> ข้อมูลบุคคลภายนอก (Visitor)
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      ref={visitorInputRef}
                      type="text"
                      value={visitorName}
                      onChange={(e) => setVisitorName(e.target.value)}
                      placeholder="ชื่อ-นามสกุล (บังคับ) *"
                      className="min-h-[44px] px-3 py-2 text-sm rounded-lg border border-amber-300 bg-white dark:bg-gray-800 dark:border-amber-700"
                    />
                    <input
                      type="text"
                      value={visitorCompany}
                      onChange={(e) => setVisitorCompany(e.target.value)}
                      placeholder="บริษัท / หน่วยงาน (ไม่บังคับ)"
                      className="min-h-[44px] px-3 py-2 text-sm rounded-lg border border-amber-300 bg-white dark:bg-gray-800 dark:border-amber-700"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
                  หมายเหตุ / วัตถุประสงค์ (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  placeholder="ระบุเหตุผลการเข้าพื้นที่..."
                  className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            ปิดหน้าต่าง
          </button>
          <button
            ref={submitBtnRef}
            type="button"
            disabled={!verifiedEmp || !locationId || submitting || !isOnline}
            onClick={handleSubmit}
            className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle2 size={16} />
            <span>{submitting ? 'กำลังบันทึก...' : 'ยืนยันการบันทึก'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Manual Edit Modal for retroactive adjustment of IN/OUT timestamps and purpose.
 */
export function EditAccessModal({ row, onClose, isOnline, onSaved }) {
  const [scanIn, setScanIn] = useState('');
  const [scanOut, setScanOut] = useState('');
  const [purpose, setPurpose] = useState('');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (row) {
      setScanIn(row.scan_in ? row.scan_in.replace(' ', 'T') : '');
      setScanOut(row.scan_out ? row.scan_out.replace(' ', 'T') : '');
      setPurpose(row.purpose || '');
      setErrorMsg('');
    }
  }, [row]);

  if (!row) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!scanIn) {
      setErrorMsg('กรุณาระบุเวลาเข้า (IN)');
      return;
    }
    if (scanOut && scanOut < scanIn) {
      setErrorMsg('เวลาออก (OUT) ต้องไม่น้อยกว่าเวลาเข้า (IN)');
      return;
    }
    setSaving(true);
    setErrorMsg('');
    try {
      const res = await areaAccessApi.manualEdit({
        logId: row.log_id,
        scanIn,
        scanOut,
        purpose,
      });
      onSaved(res.message || 'แก้ไขประวัติสำเร็จ');
    } catch (err) {
      setErrorMsg(err?.message || 'เกิดข้อผิดพลาดในการแก้ไข');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-amber-400 text-gray-900">
          <div className="flex items-center gap-2 font-bold">
            <Edit3 size={18} />
            <span>แก้ไขประวัติการเข้า-ออก</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-amber-500/40"
            aria-label="ปิด"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 bg-gray-50 dark:bg-gray-900/60">
          <div className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 text-sm">
            <div className="font-bold text-gray-900 dark:text-white">
              {row.emp_id} • {row.emp_name}
            </div>
            <div className="text-xs text-gray-500">{row.location_name}</div>
          </div>

          {errorMsg && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-medium">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              เวลาเข้า (IN) <span className="text-red-500">*</span>
            </label>
            <input
              type="datetime-local"
              value={scanIn}
              onChange={(e) => setScanIn(e.target.value)}
              required
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              เวลาออก (OUT) <span className="text-gray-400 font-normal">(ปล่อยว่างหากยังไม่ออก)</span>
            </label>
            <input
              type="datetime-local"
              value={scanOut}
              onChange={(e) => setScanOut(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-300 mb-1">
              หมายเหตุ / วัตถุประสงค์
            </label>
            <input
              type="text"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-gray-300 dark:border-gray-700 text-sm font-semibold text-gray-700 dark:text-gray-300"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={saving || !isOnline}
              className="min-h-[44px] px-5 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-900 font-bold text-sm disabled:opacity-50"
            >
              {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

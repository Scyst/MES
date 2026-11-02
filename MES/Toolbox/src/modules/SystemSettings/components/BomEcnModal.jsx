import React, { useState } from 'react';
import { X, GitBranch, Save, AlertCircle } from 'lucide-react';

export default function BomEcnModal({ isOpen, onClose, onSave, fgItem }) {
  const [ecnNumber, setEcnNumber] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().slice(0, 10));
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ecnNumber.trim()) {
      setErrorMsg('กรุณาระบุเลขที่เอกสาร ECN');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await onSave({
        fg_item_id: fgItem?.item_id,
        ecn_number: ecnNumber.trim(),
        effective_date: effectiveDate,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'สร้าง Revision ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-amber-600 text-white">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-amber-200" />
            <div>
              <h3 className="text-base font-bold">สร้าง Revision ใหม่ (ECN Draft)</h3>
              <p className="text-xs text-amber-100">FG: {fgItem?.sap_no}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-amber-200 hover:text-white hover:bg-amber-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 text-xs rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800 space-y-1">
            <p className="font-semibold">ระบบจะคัดลอกสูตรปัจจุบันไปเป็น Version ใหม่ (สถานะ DRAFT)</p>
            <p className="text-slate-600 dark:text-slate-300">
              คุณสามารถแก้ไข เพิ่ม หรือลบชิ้นส่วนในสูตรใหม่ได้อย่างอิสระโดยไม่กระทบสูตรที่ผลิตจริงอยู่ในปัจจุบัน
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              ECN Number (เลขที่เอกสารแจ้งเปลี่ยน) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ECN-2026-001"
              value={ecnNumber}
              onChange={(e) => setEcnNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Effective Date (วันที่มีผลบังคับใช้)
            </label>
            <input
              type="date"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'กำลังสร้าง Draft...' : 'สร้าง Revision ใหม่'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


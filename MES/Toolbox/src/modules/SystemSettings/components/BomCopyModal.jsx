import React, { useState } from 'react';
import { X, Copy, Save, Search, AlertCircle } from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';

export default function BomCopyModal({ isOpen, onClose, onSave, sourceFg, lines = [], models = [] }) {
  const [targetSap, setTargetSap] = useState('');
  const [targetLine, setTargetLine] = useState('');
  const [targetModel, setTargetModel] = useState('');
  const [targetItem, setTargetItem] = useState(null);
  const [searching, setSearching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSearchTarget = async () => {
    if (!targetSap.trim()) return;
    setSearching(true);
    setErrorMsg('');
    try {
      const res = await systemSettingsApi.getItemBySap(targetSap.trim());
      if (res && res.success && res.data) {
        setTargetItem(res.data);
      } else {
        setTargetItem(null);
        setErrorMsg(`ไม่พบรหัสสินค้า "${targetSap}" ในระบบ`);
      }
    } catch (err) {
      setErrorMsg('ค้นหาผิดพลาด: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!targetSap.trim()) {
      setErrorMsg('กรุณาระบุรหัสสินค้าปลายทาง');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      await onSave({
        source_sap: sourceFg?.sap_no,
        target_sap: targetSap.trim(),
        target_line: targetLine,
        target_model: targetModel,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'คัดลอก BOM ไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-purple-900 text-white">
          <div className="flex items-center gap-2">
            <Copy className="w-5 h-5 text-purple-300" />
            <div>
              <h3 className="text-base font-bold">คัดลอกสูตรการผลิต (Copy BOM)</h3>
              <p className="text-xs text-purple-200">
                จากต้นทาง: {sourceFg?.sap_no} ({sourceFg?.part_description || '-'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-purple-300 hover:text-white hover:bg-purple-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 text-xs rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Target SAP No. (รหัสสินค้าปลายทาง) <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                placeholder="ระบุ SAP No. ปลายทาง"
                value={targetSap}
                onChange={(e) => setTargetSap(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchTarget())}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="button"
                onClick={handleSearchTarget}
                disabled={searching}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
              >
                <Search className="w-3.5 h-3.5" />
                {searching ? 'ค้นหา...' : 'ค้นหา'}
              </button>
            </div>
          </div>

          {targetItem && (
            <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-purple-900 dark:text-purple-200">
                <span>{targetItem.sap_no}</span>
                <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 text-[10px]">
                  {targetItem.material_type || 'FG'}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300">{targetItem.part_description || '-'}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Line (สำหรับปลายทาง)
              </label>
              <input
                type="text"
                placeholder="เว้นว่าง = ใช้ตามต้นทาง"
                value={targetLine}
                onChange={(e) => setTargetLine(e.target.value)}
                list="copy-line-options"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <datalist id="copy-line-options">
                {lines.map((ln) => (
                  <option key={ln} value={ln} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Model (สำหรับปลายทาง)
              </label>
              <input
                type="text"
                placeholder="เว้นว่าง = ใช้ตามต้นทาง"
                value={targetModel}
                onChange={(e) => setTargetModel(e.target.value)}
                list="copy-model-options"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <datalist id="copy-model-options">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>
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
              disabled={submitting || !targetSap.trim()}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              {submitting ? 'กำลังคัดลอก...' : 'คัดลอกสูตรการผลิต'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Layers, Search } from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';

export default function BomComponentModal({
  isOpen,
  onClose,
  onSave,
  component,
  fgItem,
  bomVersion,
  lines = [],
  models = [],
}) {
  const [formData, setFormData] = useState({
    bom_id: 0,
    fg_item_id: 0,
    component_item_id: 0,
    component_sap_no: '',
    quantity_required: 1,
    line: '',
    model: '',
    memo: '',
  });

  const [searchSap, setSearchSap] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchResult, setSearchResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (component) {
      setFormData({
        bom_id: component.bom_id || 0,
        fg_item_id: fgItem?.item_id || 0,
        component_item_id: component.component_item_id || 0,
        component_sap_no: component.component_sap_no || component.sap_no || '',
        quantity_required: component.quantity_required !== undefined ? component.quantity_required : 1,
        line: component.line || '',
        model: component.model || '',
        memo: component.memo || '',
      });
      setSearchResult({
        item_id: component.component_item_id,
        sap_no: component.component_sap_no || component.sap_no,
        part_description: component.component_description || component.part_description,
        material_type: component.material_type,
        StandardPrice: component.StandardPrice,
      });
      setSearchSap(component.component_sap_no || component.sap_no || '');
    } else {
      setFormData({
        bom_id: 0,
        fg_item_id: fgItem?.item_id || 0,
        component_item_id: 0,
        component_sap_no: '',
        quantity_required: 1,
        line: '',
        model: '',
        memo: '',
      });
      setSearchResult(null);
      setSearchSap('');
    }
    setErrorMsg('');
  }, [component, fgItem, isOpen]);

  if (!isOpen) return null;

  const handleSearchSap = async () => {
    if (!searchSap.trim()) return;
    setSearching(true);
    setErrorMsg('');
    try {
      const res = await systemSettingsApi.getItemBySap(searchSap.trim());
      if (res && res.success && res.data) {
        setSearchResult(res.data);
        setFormData((prev) => ({
          ...prev,
          component_item_id: res.data.item_id,
          component_sap_no: res.data.sap_no,
        }));
      } else {
        setSearchResult(null);
        setErrorMsg(`ไม่พบรหัสสินค้า "${searchSap}" ในฐานข้อมูล`);
      }
    } catch (err) {
      setErrorMsg('ค้นหาผิดพลาด: ' + err.message);
    } finally {
      setSearching(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.component_item_id) {
      setErrorMsg('กรุณาระบุและค้นหารหัสชิ้นส่วน (Component SAP No.)');
      return;
    }
    if (Number(formData.quantity_required) <= 0) {
      setErrorMsg('ปริมาณการใช้ (Usage Qty) ต้องมากกว่า 0');
      return;
    }

    setSubmitting(true);
    try {
      await onSave({
        ...formData,
        fg_item_id: fgItem?.item_id,
        bom_version: bomVersion,
      });
      onClose();
    } catch (err) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึก');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold">
                {formData.bom_id ? 'แก้ไขรายการชิ้นส่วนในสูตร' : 'เพิ่มชิ้นส่วนในสูตร BOM'}
              </h3>
              <p className="text-xs text-slate-400">
                FG: {fgItem?.sap_no} ({bomVersion})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
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

          {/* Component Search (Disabled on edit to prevent accidental swap) */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Component SAP No. <span className="text-rose-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                disabled={!!formData.bom_id}
                placeholder="ระบุ SAP No. ชิ้นส่วน เช่น 1002341"
                value={searchSap}
                onChange={(e) => setSearchSap(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchSap())}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-500"
              />
              {!formData.bom_id && (
                <button
                  type="button"
                  onClick={handleSearchSap}
                  disabled={searching}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <Search className="w-3.5 h-3.5" />
                  {searching ? 'ค้นหา...' : 'ค้นหา'}
                </button>
              )}
            </div>
          </div>

          {/* Found Component Card */}
          {searchResult && (
            <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-xs space-y-1">
              <div className="flex items-center justify-between font-bold text-blue-900 dark:text-blue-200">
                <span>{searchResult.sap_no}</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 text-[10px]">
                  {searchResult.material_type || 'RM'}
                </span>
              </div>
              <p className="text-slate-700 dark:text-slate-300">{searchResult.part_description || '-'}</p>
              {searchResult.StandardPrice !== undefined && (
                <p className="text-emerald-700 dark:text-emerald-400 font-semibold font-mono">
                  Std Cost: {Number(searchResult.StandardPrice).toFixed(4)} THB
                </p>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Usage Qty (ปริมาณที่ใช้) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0.000001"
                step="any"
                value={formData.quantity_required}
                onChange={(e) => setFormData({ ...formData, quantity_required: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Line (เฉพาะไลน์ที่ใช้)
              </label>
              <input
                type="text"
                placeholder="เช่น ASSY-01 (ว่าง=ทุกไลน์)"
                value={formData.line}
                onChange={(e) => setFormData({ ...formData, line: e.target.value })}
                list="bom-line-options"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="bom-line-options">
                {lines.map((ln) => (
                  <option key={ln} value={ln} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Model (เฉพาะโมเดล)
              </label>
              <input
                type="text"
                placeholder="เช่น STD, LUX (ว่าง=ทุกโมเดล)"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                list="bom-model-options"
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <datalist id="bom-model-options">
                {models.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Memo (หมายเหตุ)
              </label>
              <input
                type="text"
                placeholder="หมายเหตุเพิ่มเติม"
                value={formData.memo}
                onChange={(e) => setFormData({ ...formData, memo: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
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
              disabled={submitting || !formData.component_item_id}
              className="flex items-center gap-2 px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'กำลังบันทึก...' : 'บันทึกชิ้นส่วน'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


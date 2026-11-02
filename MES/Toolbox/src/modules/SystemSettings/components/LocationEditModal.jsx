import React, { useState, useEffect } from 'react';
import { X, Save, MapPin } from 'lucide-react';

const LOCATION_TYPES = [
  { value: 'RM', label: 'RM (Raw Material)' },
  { value: 'SEMI', label: 'SEMI (Semi-Finished)' },
  { value: 'FG', label: 'FG (Finished Goods)' },
  { value: 'STORE', label: 'STORE (คลังทั่วไป)' },
  { value: 'MAINTENANCE', label: 'MAINTENANCE (คลังอะไหล่ซ่อมบำรุง)' },
  { value: 'TOOL', label: 'TOOL (ห้องเก็บเครื่องมือ)' },
];

export default function LocationEditModal({ isOpen, onClose, onSave, location, lines = [] }) {
  const [formData, setFormData] = useState({
    location_id: 0,
    location_name: '',
    location_type: 'RM',
    production_line: '',
    zone_name: '',
    location_description: '',
    is_active: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (location) {
      setFormData({
        location_id: location.location_id || 0,
        location_name: location.location_name || '',
        location_type: location.location_type || 'RM',
        production_line: location.production_line || '',
        zone_name: location.zone_name || '',
        location_description: location.location_description || '',
        is_active: location.is_active !== undefined ? (location.is_active ? 1 : 0) : 1
      });
    } else {
      setFormData({
        location_id: 0,
        location_name: '',
        location_type: 'RM',
        production_line: '',
        zone_name: '',
        location_description: '',
        is_active: 1
      });
    }
  }, [location, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.location_name.trim()) return;
    setSubmitting(true);
    try {
      await onSave(formData);
      onClose();
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
            <MapPin className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold">
              {formData.location_id ? 'แก้ไขตำแหน่งจัดเก็บ (Edit Location)' : 'เพิ่มตำแหน่งจัดเก็บ (Add Location)'}
            </h3>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Location Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="เช่น WAREHOUSE-A, A-01"
                value={formData.location_name}
                onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Location Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.location_type}
                onChange={(e) => setFormData({ ...formData, location_type: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {LOCATION_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Zone Name (โซน)
              </label>
              <input
                type="text"
                placeholder="เช่น ZONE-A, RACK-01"
                value={formData.zone_name}
                onChange={(e) => setFormData({ ...formData, zone_name: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Production Line (Optional)
              </label>
              <select
                value={formData.production_line}
                onChange={(e) => setFormData({ ...formData, production_line: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- ไม่ระบุ (คลังกลาง) --</option>
                {lines.map((ln) => (
                  <option key={ln} value={ln}>
                    {ln}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Description (รายละเอียดเพิ่มเติม)
            </label>
            <textarea
              rows="2"
              placeholder="รายละเอียดจุดจัดเก็บ..."
              value={formData.location_description}
              onChange={(e) => setFormData({ ...formData, location_description: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="loc_is_active"
              checked={formData.is_active === 1}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
            />
            <label htmlFor="loc_is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              เปิดใช้งาน (Active Status)
            </label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


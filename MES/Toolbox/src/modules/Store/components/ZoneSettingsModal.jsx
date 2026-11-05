import React, { useState } from 'react';
import { X, Layers, CheckSquare, Square, Save, Search, Check } from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';

export default function ZoneSettingsModal({ isOpen, onClose, locations, zones, onSaved }) {
  if (!isOpen) return null;

  const [selectedLocationIds, setSelectedLocationIds] = useState([]);
  const [targetZoneName, setTargetZoneName] = useState('');
  const [newZoneInput, setNewZoneInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterZone, setFilterZone] = useState('ALL');
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const filteredLocations = locations.filter((loc) => {
    const matchSearch = (loc.location_name || '').toLowerCase().includes(search.toLowerCase());
    const matchZone = filterZone === 'ALL' || (loc.zone_name || '') === filterZone;
    return matchSearch && matchZone;
  });

  const toggleSelectAll = () => {
    if (selectedLocationIds.length === filteredLocations.length) {
      setSelectedLocationIds([]);
    } else {
      setSelectedLocationIds(filteredLocations.map((l) => l.location_id));
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedLocationIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    const finalZone = (targetZoneName === '__NEW__' ? newZoneInput : targetZoneName).trim();
    if (!finalZone) {
      setErrorMsg('กรุณาเลือกหรือระบุชื่อโซน');
      return;
    }
    if (selectedLocationIds.length === 0) {
      setErrorMsg('กรุณาเลือกคลังสินค้าอย่างน้อย 1 รายการ');
      return;
    }

    setSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await storeApi.updateLocationZones(selectedLocationIds, finalZone);
      if (res.success) {
        setSuccessMsg(`อัปเดตโซน "${finalZone}" สำเร็จ (${selectedLocationIds.length} คลัง)`);
        setSelectedLocationIds([]);
        setTimeout(() => {
          onSaved();
          onClose();
        }, 800);
      } else {
        setErrorMsg(res.message || 'บันทึกข้อมูลไม่สำเร็จ');
      }
    } catch (err) {
      setErrorMsg(err.message || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                จัดการโซนคลังสินค้า (Zone Settings)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                กำหนดกลุ่มโซนสำหรับแสดงผลบนแผนผัง Visual Warehouse Map (Batch Assignment)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          {/* Notifications */}
          {errorMsg && (
            <div className="p-3 text-xs bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 rounded-lg border border-red-200 dark:border-red-800">
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div className="p-3 text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-lg border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4" />
              {successMsg}
            </div>
          )}

          {/* Action Batch Assignment Bar */}
          <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/40 dark:bg-blue-950/20 flex flex-wrap items-center gap-3">
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                กำหนดโซนปลายทาง ({selectedLocationIds.length} คลังที่เลือก)
              </label>
              <div className="flex gap-2">
                <select
                  value={targetZoneName}
                  onChange={(e) => setTargetZoneName(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                >
                  <option value="">-- เลือกโซน --</option>
                  {zones.map((z, idx) => (
                    <option key={idx} value={z}>
                      {z}
                    </option>
                  ))}
                  <option value="__NEW__">+ สร้างชื่อโซนใหม่...</option>
                </select>

                {targetZoneName === '__NEW__' && (
                  <input
                    type="text"
                    value={newZoneInput}
                    onChange={(e) => setNewZoneInput(e.target.value)}
                    placeholder="พิมพ์ชื่อโซนใหม่..."
                    className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                  />
                )}
              </div>
            </div>

            <div className="self-end">
              <button
                onClick={handleSave}
                disabled={saving || selectedLocationIds.length === 0}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-sm flex items-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'กำลังบันทึก...' : 'บันทึกโซน'}
              </button>
            </div>
          </div>

          {/* Filter and Search */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อคลังสินค้า..."
                className="w-full text-xs pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">กรองโซน:</span>
              <select
                value={filterZone}
                onChange={(e) => setFilterZone(e.target.value)}
                className="text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300"
              >
                <option value="ALL">ทุกโซน ({locations.length})</option>
                {zones.map((z, idx) => (
                  <option key={idx} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Location List Table */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="py-2.5 px-4 w-12 text-center">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        className="text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                      >
                        {selectedLocationIds.length > 0 &&
                        selectedLocationIds.length === filteredLocations.length ? (
                          <CheckSquare className="w-4 h-4 text-blue-600" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th className="py-2.5 px-3">ชื่อคลังสินค้า (Location Name)</th>
                    <th className="py-2.5 px-3">โซนปัจจุบัน</th>
                    <th className="py-2.5 px-3">สายการผลิต</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredLocations.map((loc) => {
                    const isSelected = selectedLocationIds.includes(loc.location_id);
                    return (
                      <tr
                        key={loc.location_id}
                        onClick={() => toggleSelectOne(loc.location_id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 dark:bg-blue-950/30'
                            : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <td className="py-2 px-4 text-center">
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-blue-600" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-400" />
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                          {loc.location_name}
                        </td>
                        <td className="py-2 px-3">
                          <span className="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                            {loc.zone_name || 'อื่น ๆ (Others)'}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-500 dark:text-slate-400">
                          {loc.production_line || '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 text-xs">
          <span className="text-slate-500">
            เลือกไว้ {selectedLocationIds.length} จาก {filteredLocations.length} รายการ
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

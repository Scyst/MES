import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Settings, Plus, Edit2, Trash2, Save, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { forkliftApi } from '../../../shared/services/forkliftApi';

export default function ManageFleetModal({ isOpen, onClose, forklifts = [], onUpdated }) {
  if (!isOpen) return null;

  const [editingForklift, setEditingForklift] = useState(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [location, setLocation] = useState('จุดชาร์จ');
  const [status, setStatus] = useState('AVAILABLE');
  const [battery, setBattery] = useState(100);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const startAddNew = () => {
    setEditingForklift({ id: 0 });
    setCode('');
    setName('');
    setLocation('จุดชาร์จ');
    setStatus('AVAILABLE');
    setBattery(100);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const startEdit = (fl) => {
    setEditingForklift(fl);
    setCode(fl.code || '');
    setName(fl.name || '');
    setLocation(fl.last_location || 'จุดชาร์จ');
    setStatus(fl.status || 'AVAILABLE');
    setBattery(fl.current_battery != null ? fl.current_battery : 100);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      setErrorMsg('กรุณากรอกรหัสรถโฟล์คลิฟท์ (Code)');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        id: editingForklift.id,
        code: code.trim(),
        name: name.trim(),
        last_location: location.trim(),
        status,
        current_battery: parseInt(battery, 10)
      };

      const res = await forkliftApi.saveForklift(payload);
      if (res?.success) {
        setSuccessMsg(res.message || 'บันทึกข้อมูลเรียบร้อยแล้ว');
        setEditingForklift(null);
        onUpdated?.();
      } else {
        setErrorMsg(res?.message || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || err.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, flCode) => {
    if (!window.confirm(`คุณแน่ใจหรือไม่ว่าต้องการระงับการใช้งานรถ "${flCode}"?`)) return;

    setLoading(true);
    try {
      const res = await forkliftApi.deleteForklift(id);
      if (res?.success) {
        onUpdated?.();
      } else {
        alert(res?.message || 'ไม่สามารถระงับการใช้งานได้');
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาด: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800 text-base">จัดการรถในระบบ (Fleet Management)</h3>
              <p className="text-xs text-slate-500">เพิ่ม ลบ หรือแก้ไขข้อมูลรถโฟล์คลิฟท์ในโรงงาน</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {editingForklift ? (
            /* Edit / Add Form */
            <form onSubmit={handleSave} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3.5">
              <div className="flex justify-between items-center mb-1">
                <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                  {editingForklift.id === 0 ? 'เพิ่มรถโฟล์คลิฟท์ใหม่' : `แก้ไขข้อมูล: ${editingForklift.code}`}
                </h4>
                <button
                  type="button"
                  onClick={() => setEditingForklift(null)}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  ยกเลิกการแก้ไข
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    รหัสรถ (Code) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="เช่น BYD 2.5 (PRD), ขาวมณี"
                    required
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    ประเภท / ผู้ให้บริการ (Name)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="เช่น รถเช่า PPN, EV"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    ตำแหน่งจอดปัจจุบัน
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="เช่น จุดชาร์จ, B10 ท้ายโรง"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-700 block mb-1">
                    สถานะการใช้งาน
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="AVAILABLE">พร้อมใช้งาน (AVAILABLE)</option>
                    <option value="IN_USE">กำลังใช้งาน (IN_USE)</option>
                    <option value="CHARGING">กำลังชาร์จไฟ (CHARGING)</option>
                    <option value="MAINTENANCE">ซ่อมบำรุง (MAINTENANCE)</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingForklift(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-xs"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>บันทึกข้อมูล</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={startAddNew}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-xs font-medium hover:bg-blue-700 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่มรถโฟล์คลิฟท์ใหม่</span>
              </button>
            </div>
          )}

          {/* List of existing forklifts */}
          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {forklifts.map((fl) => (
              <div key={fl.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800">{fl.code}</span>
                    <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                      {fl.name || '-'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-600">
                      {fl.status} ({fl.current_battery != null ? `${fl.current_battery}%` : '-'})
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    ตำแหน่ง: {fl.last_location || 'จุดชาร์จ'}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => startEdit(fl)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="แก้ไข"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(fl.id, fl.code)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="ระงับการใช้งาน"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-200/60 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

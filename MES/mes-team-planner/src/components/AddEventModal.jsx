import React, { useState } from 'react';
import { FiX } from 'react-icons/fi';

export default function AddEventModal({ isOpen, onClose, onSave, preSelectedDate }) {
  const [formData, setFormData] = useState({
    title: '',
    date: preSelectedDate || '',
    type: 'meeting'
  });

  // Update date if preSelectedDate changes while modal is open (or just before)
  React.useEffect(() => {
    if (isOpen && preSelectedDate) {
      setFormData(prev => ({ ...prev, date: preSelectedDate }));
    }
  }, [isOpen, preSelectedDate]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(formData);
    setFormData({ title: '', date: '', type: 'meeting' });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
        <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">สร้างนัดหมายใหม่</h3>
          <button onClick={onClose} className="text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white p-1 rounded-lg hover:bg-slate-300 dark:hover:bg-slate-700 transition">
            <FiX />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">หัวข้อนัดหมาย</label>
            <input required name="title" value={formData.title} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" placeholder="Event title..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">วันที่</label>
              <input required type="date" name="date" value={formData.date} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-lg px-4 py-2 outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ประเภท</label>
              <select name="type" value={formData.type} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 outline-none">
                <option value="meeting">Meeting</option>
                <option value="maintenance">Maintenance</option>
                <option value="holiday">Holiday</option>
                <option value="leave">วันลา (Leave)</option>
              </select>
            </div>
          </div>
          {formData.type === 'leave' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">ชื่อพนักงานที่ลา</label>
              <input required name="assignee" value={formData.assignee || ''} onChange={handleChange} className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-fuchsia-500 outline-none transition" placeholder="Employee Name..." />
            </div>
          )}
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition">ยกเลิก</button>
            <button type="submit" className="px-6 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-slate-900 dark:text-white rounded-lg font-semibold shadow-lg shadow-fuchsia-900/20 transition">บันทึก</button>
          </div>
        </form>
      </div>
    </div>
  );
}

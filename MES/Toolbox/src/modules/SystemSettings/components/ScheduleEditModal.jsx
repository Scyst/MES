import React, { useState, useEffect } from 'react';
import { X, Save, Clock } from 'lucide-react';

export default function ScheduleEditModal({ isOpen, onClose, onSave, schedule, lines = [] }) {
  const [formData, setFormData] = useState({
    id: 0,
    line: '',
    shift_name: '',
    start_time: '08:00',
    end_time: '17:00',
    planned_break_minutes: 60,
    is_active: 1
  });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (schedule) {
      setFormData({
        id: schedule.id || 0,
        line: schedule.line || '',
        shift_name: schedule.shift_name || '',
        start_time: schedule.start_time ? schedule.start_time.substring(0, 5) : '08:00',
        end_time: schedule.end_time ? schedule.end_time.substring(0, 5) : '17:00',
        planned_break_minutes: schedule.planned_break_minutes !== undefined ? Number(schedule.planned_break_minutes) : 60,
        is_active: schedule.is_active !== undefined ? (schedule.is_active ? 1 : 0) : 1
      });
    } else {
      setFormData({
        id: 0,
        line: lines.length > 0 ? lines[0] : '',
        shift_name: 'Day Shift',
        start_time: '08:00',
        end_time: '17:00',
        planned_break_minutes: 60,
        is_active: 1
      });
    }
  }, [schedule, isOpen, lines]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.line.trim() || !formData.shift_name.trim()) return;
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
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-md overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold">
              {formData.id ? 'แก้ไขตารางกะการผลิต (Edit Schedule)' : 'เพิ่มตารางกะการผลิต (Add Schedule)'}
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
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Production Line <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น ASSY-01, PAINT-01"
              value={formData.line}
              onChange={(e) => setFormData({ ...formData, line: e.target.value })}
              list="schedule-line-options"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="schedule-line-options">
              {lines.map((ln) => (
                <option key={ln} value={ln} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Shift Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="เช่น Day Shift, Night Shift, กะกลางวัน"
              value={formData.shift_name}
              onChange={(e) => setFormData({ ...formData, shift_name: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                Start Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
                End Time <span className="text-rose-500">*</span>
              </label>
              <input
                type="time"
                required
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">
              Planned Break (นาที)
            </label>
            <input
              type="number"
              min="0"
              step="1"
              value={formData.planned_break_minutes}
              onChange={(e) => setFormData({ ...formData, planned_break_minutes: Number(e.target.value) })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              เวลาพักเบรกที่จะถูกนำไปหักออกจากเวลาทำงานจริงในการคิด OEE และ Target
            </p>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="sched_is_active"
              checked={formData.is_active === 1}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked ? 1 : 0 })}
              className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
            />
            <label htmlFor="sched_is_active" className="text-sm font-medium text-slate-700 dark:text-slate-300 cursor-pointer">
              เปิดใช้งานกะนี้ (Active Status)
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
              className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'กำลังบันทึก...' : 'บันทึกกะผลิต'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar as CalIcon, RotateCcw, Edit3, X } from 'lucide-react';
import { manpowerHolidayApi } from '../../../shared/services/manpowerApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';

const DAY_TYPES = [
  { value: 'HOLIDAY', label: 'HOLIDAY (วันหยุดนักขัตฤกษ์)', cls: 'bg-rose-100 border-rose-300 text-rose-800 dark:bg-rose-950/60 dark:border-rose-700 dark:text-rose-200' },
  { value: 'OFFDAY', label: 'OFFDAY (วันหยุดประจำสัปดาห์/เสาร์เว้นเสาร์)', cls: 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-950/60 dark:border-amber-700 dark:text-amber-200' },
  { value: 'SUNDAY', label: 'SUNDAY (วันอาทิตย์)', cls: 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-950/60 dark:border-orange-700 dark:text-orange-200' },
  { value: 'NORMAL', label: 'NORMAL (วันทำงานปกติ)', cls: 'bg-slate-50 border-slate-200 text-slate-700 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200' },
];

const WEEKDAYS = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export default function HolidayCalendarTab({ canEdit, isOnline, onMutated }) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [monthIso, setMonthIso] = useState(() => new Date().toISOString().slice(0, 7));
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editDay, setEditDay] = useState(null);
  const [form, setForm] = useState({
    day_type: 'HOLIDAY',
    description: '',
    work_rate_holiday: 2.0,
    ot_rate_holiday: 3.0,
  });
  const [saving, setSaving] = useState(false);

  const fetchCalendar = useCallback(async () => {
    setLoading(true);
    try {
      const [y, m] = monthIso.split('-').map(Number);
      const lastDay = new Date(y, m, 0).getDate();
      const start = `${monthIso}-01`;
      const end = `${monthIso}-${String(lastDay).padStart(2, '0')}`;
      const res = await manpowerHolidayApi.read(start, end);
      setEvents(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดปฏิทินวันหยุดได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [monthIso, showToast]);

  useEffect(() => {
    fetchCalendar();
  }, [fetchCalendar]);

  const eventMap = useMemo(() => {
    const map = {};
    for (const ev of events) {
      map[ev.calendar_date] = ev;
    }
    return map;
  }, [events]);

  const calendarCells = useMemo(() => {
    const [y, m] = monthIso.split('-').map(Number);
    const firstWeekday = new Date(y, m - 1, 1).getDay();
    const totalDays = new Date(y, m, 0).getDate();
    const cells = [];
    for (let i = 0; i < firstWeekday; i += 1) {
      cells.push(null);
    }
    for (let d = 1; d <= totalDays; d += 1) {
      const iso = `${monthIso}-${String(d).padStart(2, '0')}`;
      const ev = eventMap[iso] || null;
      const isSun = new Date(y, m - 1, d).getDay() === 0;
      cells.push({
        day: d,
        iso,
        day_type: ev?.day_type || (isSun ? 'SUNDAY' : 'NORMAL'),
        description: ev?.description || (isSun ? 'Sunday' : ''),
        work_rate_holiday: ev ? Number(ev.work_rate_holiday) : 1.0,
        ot_rate_holiday: ev ? Number(ev.ot_rate_holiday) : (isSun ? 3.0 : 1.5),
      });
    }
    return cells;
  }, [monthIso, eventMap]);

  const shiftMonth = (delta) => {
    const [y, m] = monthIso.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setMonthIso(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const openEditor = (cell) => {
    if (!canEdit) return;
    setEditDay(cell.iso);
    setForm({
      day_type: cell.day_type === 'NORMAL' ? 'HOLIDAY' : cell.day_type,
      description: cell.description || '',
      work_rate_holiday: cell.work_rate_holiday ?? 2.0,
      ot_rate_holiday: cell.ot_rate_holiday ?? 3.0,
    });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline || !editDay) return;
    setSaving(true);
    try {
      await manpowerHolidayApi.save({
        date: editDay,
        ...form,
      });
      showToast(`บันทึกวันหยุด ${editDay} เรียบร้อยแล้ว`, 'success');
      setEditDay(null);
      fetchCalendar();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'บันทึกปฏิทินไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!canEdit || !isOnline || !editDay) return;
    const ok = await confirm({
      title: 'คืนค่าปฏิทินเป็นวันปกติ',
      message: `ต้องการคืนค่าวันที่ ${editDay} กลับเป็นวันทำงานปกติ/อาทิตย์ตามระบบหรือไม่?`,
      confirmText: 'คืนค่าเริ่มต้น',
      variant: 'warning',
    });
    if (!ok) return;
    setSaving(true);
    try {
      await manpowerHolidayApi.resetDay(editDay);
      showToast(`รีเซ็ตวันที่ ${editDay} เรียบร้อยแล้ว`, 'success');
      setEditDay(null);
      fetchCalendar();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'รีเซ็ตปฏิทินไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const specialEvents = events.filter((e) => e.day_type && e.day_type !== 'NORMAL');

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input
            type="month"
            value={monthIso}
            onChange={(e) => setMonthIso(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded-full bg-rose-100 px-2.5 py-1 font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-200">HOLIDAY (นักขัตฤกษ์)</span>
          <span className="rounded-full bg-amber-100 px-2.5 py-1 font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-200">OFFDAY (เสาร์หยุด)</span>
          <span className="rounded-full bg-orange-100 px-2.5 py-1 font-semibold text-orange-800 dark:bg-orange-950/60 dark:text-orange-200">SUNDAY</span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Calendar Grid */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs lg:col-span-2 dark:border-slate-700 dark:bg-slate-800">
          <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-bold text-slate-500 pb-2">
            {WEEKDAYS.map((wd) => <div key={wd}>{wd}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1.5">
            {calendarCells.map((cell, idx) => {
              if (!cell) {
                return <div key={`blank-${idx}`} className="h-20 rounded-lg bg-slate-50/40 dark:bg-slate-900/30" />;
              }
              const meta = DAY_TYPES.find((t) => t.value === cell.day_type) || DAY_TYPES[3];
              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => openEditor(cell)}
                  disabled={!canEdit}
                  className={`flex min-h-[78px] flex-col justify-between rounded-lg border p-2 text-left transition hover:ring-2 hover:ring-indigo-400 disabled:cursor-default ${meta.cls}`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold">{cell.day}</span>
                    {cell.day_type !== 'NORMAL' && (
                      <span className="text-[10px] font-mono opacity-80">×{cell.work_rate_holiday}</span>
                    )}
                  </div>
                  <div className="truncate text-[10px] font-medium opacity-90" title={cell.description}>
                    {cell.description || cell.day_type}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Side Event Summary List */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <h4 className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-800 dark:text-white">
            <CalIcon className="h-4 w-4 text-rose-500" />
            วันหยุดและวันพิเศษประจำเดือน ({specialEvents.length})
          </h4>
          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">กำลังโหลด...</div>
          ) : specialEvents.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">ยังไม่มีกำหนดวันหยุดพิเศษในเดือนนี้</div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {specialEvents.map((ev) => (
                <div
                  key={ev.calendar_date}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-xs dark:border-slate-700"
                >
                  <div>
                    <div className="font-bold text-slate-800 dark:text-white">
                      {ev.calendar_date} <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] dark:bg-slate-700">{ev.day_type}</span>
                    </div>
                    <div className="text-slate-500">{ev.description || '-'}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-indigo-600 dark:text-indigo-400">
                      Work ×{Number(ev.work_rate_holiday).toFixed(1)} | OT ×{Number(ev.ot_rate_holiday).toFixed(1)}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => openEditor({
                        iso: ev.calendar_date,
                        day_type: ev.day_type,
                        description: ev.description,
                        work_rate_holiday: Number(ev.work_rate_holiday),
                        ot_rate_holiday: Number(ev.ot_rate_holiday),
                      })}
                      className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200 hover:bg-slate-100 dark:border-slate-600"
                    >
                      <Edit3 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Holiday Editor Modal */}
      {editDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleSave}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">ตั้งค่าวันหยุด & ตัวคูณค่าแรง ({editDay})</h4>
              <button type="button" onClick={() => setEditDay(null)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">ประเภทวัน</label>
              <select
                value={form.day_type}
                onChange={(e) => setForm((f) => ({ ...f, day_type: e.target.value }))}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                {DAY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">คำอธิบาย / ชื่อวันหยุด</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="เช่น วันขึ้นปีใหม่ / เสาร์หยุดบริษัท"
                className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">ตัวคูณค่าแรงปกติ (Work Rate)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={form.work_rate_holiday}
                  onChange={(e) => setForm((f) => ({ ...f, work_rate_holiday: Number(e.target.value) }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">ตัวคูณโอที (OT Rate)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="10"
                  value={form.ot_rate_holiday}
                  onChange={(e) => setForm((f) => ({ ...f, ot_rate_holiday: Number(e.target.value) }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                disabled={saving || !isOnline}
                onClick={handleReset}
                className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300"
              >
                <RotateCcw className="h-4 w-4" />
                คืนค่าปกติ
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditDay(null)}
                  className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold dark:border-slate-600"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={saving || !isOnline}
                  className="min-h-[44px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  {saving ? 'กำลังบันทึก...' : 'บันทึก'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

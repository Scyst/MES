import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Calendar as CalIcon, ListChecks, Layers, X, UserCheck } from 'lucide-react';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { qmsScheduleApi } from '../../../shared/services/qmsApi';
import { formatLocalYmd, formatQmsDate, formatQmsQty, normalizeQaStatus } from '../utils/qmsFormatters';
import { QaBulkTicketModal, QaInspectionModal } from './QaInspectionModals';

const THAI_MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DAY_HEADERS = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];

export default function QaPlannerCalendarTab({ isOnline }) {
  const toast = useToast();

  const [cursorDate, setCursorDate] = useState(() => new Date());
  const [events, setEvents] = useState([]);
  const [pendingJobs, setPendingJobs] = useState([]);
  const [pendingSearch, setPendingSearch] = useState('');
  const [qcUsers, setQcUsers] = useState([]);
  const [loadingCal, setLoadingCal] = useState(true);

  const [dragOverYmd, setDragOverYmd] = useState('');
  const [selectedDayYmd, setSelectedDayYmd] = useState('');
  const [daySelectedIds, setDaySelectedIds] = useState([]);
  const [quickAssignJob, setQuickAssignJob] = useState(null);
  const [quickAssignDate, setQuickAssignDate] = useState(() => formatLocalYmd());

  const [editingPo, setEditingPo] = useState(null);
  const [bulkPoIds, setBulkPoIds] = useState([]);

  const fetchCalendarData = useCallback(async () => {
    setLoadingCal(true);
    try {
      const y = cursorDate.getFullYear();
      const m = cursorDate.getMonth();
      const startStr = `${y}-${String(m + 1).padStart(2, '0')}-01`;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const endStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const res = await qmsScheduleApi.getSchedule({ start_date: startStr, end_date: endStr, range: 'custom_range' });
      setEvents(res.data?.rows || []);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดปฏิทิน QA/QC ได้');
    } finally {
      setLoadingCal(false);
    }
  }, [cursorDate, toast]);

  const fetchPending = async (q = '') => {
    try {
      const res = await qmsScheduleApi.getPendingJobs(q);
      setPendingJobs(Array.isArray(res.data) ? res.data : []);
    } catch {
      setPendingJobs([]);
    }
  };

  useEffect(() => {
    qmsScheduleApi.getQcUsers().then((r) => setQcUsers(r.data || [])).catch(() => {});
  }, []);

  useEffect(() => {
    fetchCalendarData();
  }, [fetchCalendarData]);

  useEffect(() => {
    const timer = setTimeout(() => fetchPending(pendingSearch), 250);
    return () => clearTimeout(timer);
  }, [pendingSearch]);

  const calendarCells = useMemo(() => {
    const year = cursorDate.getFullYear();
    const month = cursorDate.getMonth();
    const firstDow = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthLast = new Date(year, month, 0).getDate();
    const todayStr = formatLocalYmd();

    const cells = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      cells.push({ day: prevMonthLast - i, inMonth: false, ymd: '' });
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const ymd = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ day: d, inMonth: true, ymd, isToday: ymd === todayStr });
    }
    while (cells.length % 7 !== 0) {
      cells.push({ day: cells.length % 7, inMonth: false, ymd: '' });
    }
    return cells;
  }, [cursorDate]);

  const eventsByDay = useMemo(() => {
    const map = {};
    events.forEach((po) => {
      const d = po.inspection_date ? String(po.inspection_date).slice(0, 10) : '';
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(po);
    });
    return map;
  }, [events]);

  const schedulePoToDate = async (poId, ymd) => {
    if (!poId || !ymd || !isOnline) return;
    try {
      const res = await qmsScheduleApi.schedulePo(poId, ymd);
      toast.success(res.message || `จัดตารางตรวจลงวันที่ ${formatQmsDate(ymd)} เรียบร้อยแล้ว`);
      setQuickAssignJob(null);
      await Promise.all([fetchCalendarData(), fetchPending(pendingSearch)]);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถย้ายวันที่ตรวจได้');
    }
  };

  const dayJobs = selectedDayYmd ? (eventsByDay[selectedDayYmd] || []) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
      {/* Calendar Grid */}
      <div className="lg:col-span-9 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col">
        <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
              className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setCursorDate(new Date())}
              className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xs font-bold"
            >
              วันนี้ (Today)
            </button>
          </div>
          <div className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white flex items-center gap-2">
            <CalIcon className="w-4 h-4 text-blue-600" />
            {THAI_MONTHS[cursorDate.getMonth()]} {cursorDate.getFullYear()}
          </div>
          <button
            type="button"
            onClick={() => setCursorDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
            className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 text-center py-2 text-xs font-bold text-slate-500">
          {DAY_HEADERS.map((h) => <div key={h}>{h}</div>)}
        </div>

        <div className="grid grid-cols-7 auto-rows-[minmax(88px,auto)] sm:auto-rows-[minmax(112px,auto)] divide-x divide-y divide-slate-200/80 dark:divide-slate-800">
          {calendarCells.map((cell, idx) => {
            if (!cell.inMonth) {
              return <div key={`empty-${idx}`} className="bg-slate-50/70 dark:bg-slate-950/40 p-1.5" />;
            }
            const list = eventsByDay[cell.ymd] || [];
            const isOver = dragOverYmd === cell.ymd;
            return (
              <div
                key={cell.ymd}
                onDragOver={(e) => { e.preventDefault(); setDragOverYmd(cell.ymd); }}
                onDragLeave={() => setDragOverYmd('')}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverYmd('');
                  const poId = e.dataTransfer.getData('text/plain');
                  if (poId) schedulePoToDate(poId, cell.ymd);
                }}
                onClick={() => { setSelectedDayYmd(cell.ymd); setDaySelectedIds([]); }}
                className={`p-1.5 cursor-pointer transition-colors flex flex-col gap-1 ${
                  isOver ? 'bg-sky-50 ring-2 ring-inset ring-sky-400'
                    : cell.isToday ? 'bg-blue-50/50 dark:bg-blue-950/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center ${
                    cell.isToday ? 'bg-blue-600 text-white' : 'text-slate-700 dark:text-slate-300'
                  }`}>
                    {cell.day}
                  </span>
                  {list.length > 0 && <span className="text-[10px] font-bold text-slate-400">{list.length}</span>}
                </div>

                {/* Desktop Pills */}
                <div className="hidden sm:flex flex-col gap-1 overflow-y-auto max-h-20">
                  {list.map((po) => {
                    const { isFailed, isDone, isInProgress } = normalizeQaStatus(po);
                    const roundNo = Number(po.round_no || 1);
                    const totalRounds = Number(po.total_rounds || roundNo || 1);
                    const isArchived = Number(po.is_latest ?? 1) === 0 || po.is_latest === false;
                    const rowKey = po.history_id ? `hist-${po.history_id}` : `po-${po.id}`;
                    const cls = isFailed
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : isDone
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : isInProgress
                          ? 'bg-amber-100 text-amber-800 border-amber-200'
                          : 'bg-slate-100 text-slate-700 border-slate-200';
                    return (
                      <div
                        key={rowKey}
                        draggable={isOnline && !isArchived}
                        onDragStart={(e) => e.dataTransfer.setData('text/plain', String(po.id))}
                        onClick={(e) => { e.stopPropagation(); setEditingPo(po); }}
                        title={`${po.po_number} (${po.sku})${totalRounds > 1 ? ` • รอบที่ ${roundNo}/${totalRounds}` : ''}`}
                        className={`px-1.5 py-0.5 rounded border text-[10px] leading-tight truncate font-semibold ${cls} ${isArchived ? 'opacity-65 border-dashed' : ''}`}
                      >
                        {totalRounds > 1 ? `[R${roundNo}] ` : ''}{po.po_number}
                      </div>
                    );
                  })}
                </div>

                {/* Mobile Dots */}
                {list.length > 0 && (
                  <div className="flex sm:hidden flex-wrap gap-1 pt-1">
                    {list.slice(0, 6).map((po) => {
                      const { isFailed, isDone, isInProgress } = normalizeQaStatus(po);
                      const rowKey = po.history_id ? `hist-${po.history_id}` : `po-${po.id}`;
                      const dot = isFailed ? 'bg-rose-500' : isDone ? 'bg-emerald-500' : isInProgress ? 'bg-amber-500' : 'bg-slate-400';
                      return <span key={rowKey} className={`w-2 h-2 rounded-full ${dot}`} />;
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {loadingCal && <div className="px-4 py-2 text-xs text-slate-400 text-center border-t border-slate-100">กำลังอัปเดตปฏิทิน...</div>}
      </div>

      {/* Pending Jobs Sidebar */}
      <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col max-h-[680px]">
        <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="font-bold text-sm text-blue-600 flex items-center gap-1.5">
            <ListChecks className="w-4 h-4" /> Pending Jobs
          </div>
          <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-xs font-bold">{pendingJobs.length}</span>
        </div>
        <div className="p-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={pendingSearch}
              onChange={(e) => setPendingSearch(e.target.value)}
              placeholder="ค้นหา PO / SKU..."
              className="w-full min-h-[38px] pl-8 pr-2.5 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
          {pendingJobs.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-400">ไม่มีงานรอจัดตาราง</div>
          ) : (
            pendingJobs.map((job) => (
              <div
                key={job.id}
                draggable={isOnline}
                onDragStart={(e) => e.dataTransfer.setData('text/plain', String(job.id))}
                className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-1 cursor-grab active:cursor-grabbing"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-xs font-bold text-blue-700 dark:text-blue-400">{job.po_number}</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 font-bold">{job.sku}</span>
                </div>
                <div className="text-[11px] text-slate-500 line-clamp-1">{job.description || '-'}</div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-500">Qty: <b>{formatQmsQty(job.quantity)}</b> • Load: {formatQmsDate(job.loading_date)}</span>
                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={() => { setQuickAssignJob(job); setQuickAssignDate(formatLocalYmd()); }}
                    className="px-2 py-1 rounded bg-blue-100 text-blue-700 font-bold hover:bg-blue-200"
                  >
                    ลงคิว
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Quick Date Assignment Modal (Mobile & Accessibility friendly alternative to drag-drop) */}
      {quickAssignJob && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-700 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm">กำหนดวันตรวจ QA/QC</h4>
              <button type="button" onClick={() => setQuickAssignJob(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-lg">
              <b>{quickAssignJob.po_number}</b> ({quickAssignJob.sku})
            </div>
            <div>
              <label className="block text-xs font-bold mb-1">วันที่ตรวจ (Plan Inspection Date)</label>
              <input type="date" value={quickAssignDate} onChange={(e) => setQuickAssignDate(e.target.value)} className="w-full min-h-[42px] px-3 text-sm border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-950" />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setQuickAssignJob(null)} className="min-h-[40px] px-4 rounded-lg border text-xs font-bold">ยกเลิก</button>
              <button type="button" disabled={!isOnline} onClick={() => schedulePoToDate(quickAssignJob.id, quickAssignDate)} className="min-h-[40px] px-4 rounded-lg bg-blue-600 text-white text-xs font-bold">ยืนยัน</button>
            </div>
          </div>
        </div>
      )}

      {/* Day Jobs Modal */}
      {selectedDayYmd && (
        <div className="fixed inset-0 z-40 bg-slate-900/60 flex items-center justify-center p-3">
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
              <div className="font-bold text-sm">คิวตรวจประจำวันที่ {formatQmsDate(selectedDayYmd)} ({dayJobs.length} รายการ)</div>
              <div className="flex items-center gap-2">
                {daySelectedIds.length > 0 && (
                  <button
                    type="button"
                    disabled={!isOnline}
                    onClick={() => setBulkPoIds(daySelectedIds)}
                    className="min-h-[36px] px-3 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1"
                  >
                    <Layers className="w-3.5 h-3.5" /> Bulk Update ({daySelectedIds.length})
                  </button>
                )}
                <button type="button" onClick={() => setSelectedDayYmd('')} className="min-w-[40px] min-h-[40px] flex items-center justify-center rounded-lg"><X className="w-5 h-5" /></button>
              </div>
            </div>
            <div className="p-4 overflow-y-auto space-y-2">
              {dayJobs.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">ไม่มี PO ที่กำหนดตรวจในวันนี้</div>
              ) : (
                dayJobs.map((po) => {
                  const { isFailed, isPassed, isDone, isInProgress } = normalizeQaStatus(po);
                  const roundNo = Number(po.round_no || 1);
                  const totalRounds = Number(po.total_rounds || roundNo || 1);
                  const isArchived = Number(po.is_latest ?? 1) === 0 || po.is_latest === false;
                  const rowKey = po.history_id ? `hist-${po.history_id}` : `po-${po.id}`;
                  const badge = isFailed ? 'bg-rose-100 text-rose-700' : isDone ? 'bg-emerald-100 text-emerald-700' : isInProgress ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700';
                  return (
                    <div key={rowKey} className={`p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between gap-3 ${isArchived ? 'opacity-75 bg-slate-50/60 dark:bg-slate-900/50' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}>
                      <div className="flex items-center gap-3 min-w-0">
                        {!isArchived && (
                          <input
                            type="checkbox"
                            checked={daySelectedIds.includes(po.id)}
                            onChange={() => setDaySelectedIds((prev) => prev.includes(po.id) ? prev.filter((x) => x !== po.id) : [...prev, po.id])}
                          />
                        )}
                        <div className="min-w-0 cursor-pointer" onClick={() => setEditingPo(po)}>
                          <div className="font-mono text-xs font-bold text-blue-600 flex flex-wrap items-center gap-1.5">
                            <span>{po.po_number}</span>
                            <span className="text-slate-400">• {po.sku}</span>
                            {totalRounds > 1 && (
                              <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px]">R{roundNo}/{totalRounds}</span>
                            )}
                            {isArchived && (
                              <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 text-[10px]">History</span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 truncate">{po.description} ({formatQmsQty(po.quantity)} pcs)</div>
                          {po.qa_inspector && <div className="text-[11px] text-sky-600 flex items-center gap-1 mt-0.5"><UserCheck className="w-3 h-3" /> {po.qa_inspector}</div>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${badge}`}>
                          {isFailed ? 'FAIL' : isPassed ? 'PASS' : isDone ? 'DONE' : isInProgress ? 'IN PROGRESS' : 'WAITING'}
                        </span>
                        <button type="button" onClick={() => setEditingPo(po)} className="min-h-[36px] px-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs font-bold">
                          {isArchived ? 'ดูประวัติ' : 'ตรวจ/แก้ไข'}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      <QaInspectionModal
        po={editingPo}
        qcUsers={qcUsers}
        isOnline={isOnline}
        toast={toast}
        onClose={() => setEditingPo(null)}
        onSaved={() => { fetchCalendarData(); fetchPending(pendingSearch); }}
      />

      <QaBulkTicketModal
        poIds={bulkPoIds}
        qcUsers={qcUsers}
        isOnline={isOnline}
        toast={toast}
        onClose={() => { setBulkPoIds([]); setDaySelectedIds([]); }}
        onSaved={fetchCalendarData}
      />
    </div>
  );
}

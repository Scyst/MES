import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, MessageSquareText,
  CheckCheck, PlusCircle, BellRing, Filter, Loader2
} from 'lucide-react';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import LogModal from '../../Home/components/LogModal';
import {
  getProductionDate, getCurrentMonthKey, formatDateTH, formatMonthTH, getMoodMeta, PERIOD_META
} from '../utils/dailyLogHelpers';

export default function MyShiftLogTab({ onReplyBadgeChange }) {
  const todayProdDate = getProductionDate();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [monthlyData, setMonthlyData] = useState({});
  const [todayLogs, setTodayLogs] = useState({});
  const [unreadDates, setUnreadDates] = useState([]);
  const [replyCount, setReplyCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ledgerFilter, setLedgerFilter] = useState('ALL'); // 'ALL' | 'UNREAD' | 'WITH_REPLY' | 'WITH_NOTE'

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTarget, setModalTarget] = useState({ date: todayProdDate, periodId: 1, existingData: null });
  const [dayPickerDate, setDayPickerDate] = useState(null);

  const loadMyLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dailyLogApi.getInitialData(monthKey);
      if (res?.success && res.data) {
        setMonthlyData(res.data.monthlyData || {});
        if (monthKey === getCurrentMonthKey()) {
          setTodayLogs(res.data.todayLogs || {});
        }
        setUnreadDates(Array.isArray(res.data.unreadDates) ? res.data.unreadDates : []);
        const count = Number(res.data.replyCount || 0);
        setReplyCount(count);
        if (onReplyBadgeChange) onReplyBadgeChange(count);
      }
    } catch (err) {
      console.error('Failed to load my daily logs:', err);
    } finally {
      setLoading(false);
    }
  }, [monthKey, onReplyBadgeChange]);

  useEffect(() => {
    loadMyLogs();
  }, [loadMyLogs]);

  const shiftMonth = (delta) => {
    const [y, m] = monthKey.split('-').map(Number);
    const next = new Date(y, m - 1 + delta, 1);
    const nextKey = `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, '0')}`;
    setMonthKey(nextKey);
  };

  const openPeriodEntry = async (dateStr, periodId) => {
    const existing = monthlyData?.[dateStr]?.[periodId] || null;
    setModalTarget({ date: dateStr, periodId, existingData: existing });
    setDayPickerDate(null);
    setModalOpen(true);

    if (existing?.reply_message && Number(existing.is_read) === 0) {
      try {
        await dailyLogApi.markAsRead(dateStr, periodId);
        loadMyLogs();
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleMarkAllVisibleRead = async (items) => {
    for (const item of items) {
      if (item.reply_message && Number(item.is_read) === 0) {
        try {
          await dailyLogApi.markAsRead(item.log_date, item.period_id);
        } catch (e) {
          console.error(e);
        }
      }
    }
    loadMyLogs();
  };

  // Calendar calculation
  const calendarDays = useMemo(() => {
    const [y, m] = monthKey.split('-').map(Number);
    const totalDays = new Date(y, m, 0).getDate();
    const firstDow = new Date(y, m - 1, 1).getDay();
    const blanks = Array.from({ length: firstDow }, (_, i) => ({ empty: true, key: `b-${i}` }));
    const days = Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const dateStr = `${monthKey}-${String(day).padStart(2, '0')}`;
      return {
        empty: false,
        day,
        dateStr,
        logs: monthlyData[dateStr] || {},
        isToday: dateStr === todayProdDate,
        hasUnread: unreadDates.includes(dateStr)
      };
    });
    return [...blanks, ...days];
  }, [monthKey, monthlyData, todayProdDate, unreadDates]);

  // Flat chronological ledger list for the month
  const ledgerItems = useMemo(() => {
    const list = [];
    Object.keys(monthlyData)
      .sort((a, b) => (a < b ? 1 : -1))
      .forEach((dStr) => {
        [1, 2, 3].forEach((pid) => {
          const entry = monthlyData[dStr]?.[pid];
          if (entry) {
            list.push({
              ...entry,
              log_date: dStr,
              period_id: pid
            });
          }
        });
      });

    return list.filter((item) => {
      if (ledgerFilter === 'UNREAD') return Boolean(item.reply_message) && Number(item.is_read) === 0;
      if (ledgerFilter === 'WITH_REPLY') return Boolean(item.reply_message);
      if (ledgerFilter === 'WITH_NOTE') return Boolean(item.note && item.note.trim());
      return true;
    });
  }, [monthlyData, ledgerFilter]);

  const unreadItems = useMemo(
    () => ledgerItems.filter((i) => i.reply_message && Number(i.is_read) === 0),
    [ledgerItems]
  );

  return (
    <div className="space-y-6">
      {/* Unread Supervisor Replies Alert Banner */}
      {replyCount > 0 && (
        <div className="rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-900 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
              <BellRing className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-indigo-900 dark:text-indigo-200 text-sm">
                คุณมีข้อความตอบกลับจากหัวหน้างาน {replyCount} รายการที่ยังไม่ได้อ่าน
              </div>
              <div className="text-xs text-indigo-600 dark:text-indigo-400">
                กดที่รายการที่มีจุดสีแดงเพื่ออ่านคำแนะนำและรับทราบข้อความ
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLedgerFilter('UNREAD')}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold"
            >
              ดูรายการยังไม่อ่าน
            </button>
            {unreadItems.length > 0 && (
              <button
                onClick={() => handleMarkAllVisibleRead(unreadItems)}
                className="px-3.5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5"
              >
                <CheckCheck className="w-4 h-4" /> อ่านทั้งหมด
              </button>
            )}
          </div>
        </div>
      )}

      {/* Today's 3-Period Quick Pulse Entry */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              บันทึกกะวันนี้ ({formatDateTH(todayProdDate)})
            </h2>
            <p className="text-xs text-slate-500">ตัดรอบวันผลิตใหม่เวลา 08:00 น. · แตะช่วงเวลาเพื่อบันทึกหรือแก้ไข</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[1, 2, 3].map((pid) => {
            const pInfo = PERIOD_META[pid];
            const entry = todayLogs?.[pid];
            const isDone = Boolean(entry);
            const mm = getMoodMeta(entry?.mood);

            return (
              <button
                key={pid}
                onClick={() => openPeriodEntry(todayProdDate, pid)}
                className={`p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between gap-3 ${
                  isDone
                    ? 'border-emerald-200 dark:border-emerald-900/70 bg-emerald-50/40 dark:bg-emerald-950/20 hover:border-emerald-400'
                    : 'border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 hover:border-blue-400'
                }`}
              >
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">{pInfo.label}</div>
                  {isDone ? (
                    <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                      บันทึกแล้ว {entry.qty ? `· ${Number(entry.qty).toLocaleString()} ชิ้น` : ''}
                    </div>
                  ) : (
                    <div className="text-xs font-semibold text-blue-600 dark:text-blue-400">กดเพื่อบันทึกข้อมูล</div>
                  )}
                </div>
                {isDone ? (
                  <span className="text-3xl leading-none">{mm.emoji}</span>
                ) : (
                  <PlusCircle className="w-7 h-7 text-slate-300 dark:text-slate-600" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Split: Calendar + Personal Shift Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Calendar Card */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <CalendarIcon className="w-5 h-5 text-blue-600" />
              <span>ปฏิทินบันทึกประจำเดือน</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => shiftMonth(-1)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="เดือนก่อนหน้า"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 min-w-[110px] text-center">
                {formatMonthTH(monthKey)}
              </span>
              <button
                onClick={() => shiftMonth(1)}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label="เดือนถัดไป"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1.5 text-center text-[11px] font-bold text-slate-400 mb-2">
            <div>อา</div><div>จ</div><div>อ</div><div>พ</div><div>พฤ</div><div>ศ</div><div>ส</div>
          </div>

          <div className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((cell) => {
              if (cell.empty) return <div key={cell.key} className="h-12 sm:h-14" />;
              const count = [1, 2, 3].filter((p) => Boolean(cell.logs?.[p])).length;
              return (
                <button
                  key={cell.dateStr}
                  onClick={() => setDayPickerDate(cell.dateStr)}
                  className={`relative h-12 sm:h-14 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${
                    cell.isToday
                      ? 'border-blue-500 bg-blue-50/70 dark:bg-blue-950/30 font-bold text-blue-700 dark:text-blue-300'
                      : count > 0
                        ? 'border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/10 text-slate-700 dark:text-slate-200'
                        : 'border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                  }`}
                >
                  {cell.hasUnread && (
                    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                  )}
                  <span className="text-xs">{cell.day}</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3].map((p) => (
                      <span
                        key={p}
                        className={`w-1.5 h-1.5 rounded-full ${
                          cell.logs?.[p] ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'
                        }`}
                      />
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Personal Shift Ledger & Supervisor Replies */}
        <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 sm:p-5 shadow-xs flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-100">
              <MessageSquareText className="w-5 h-5 text-indigo-600" />
              <span>สมุดบันทึกกะและคำตอบกลับ ({ledgerItems.length})</span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {[
                { key: 'ALL', label: 'ทั้งหมด' },
                { key: 'UNREAD', label: `ยังไม่อ่าน (${unreadItems.length})` },
                { key: 'WITH_REPLY', label: 'มีคำตอบหัวหน้า' },
                { key: 'WITH_NOTE', label: 'มีบันทึกปัญหา' }
              ].map((f) => (
                <button
                  key={f.key}
                  onClick={() => setLedgerFilter(f.key)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                    ledgerFilter === f.key
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[540px] pr-1">
            {loading ? (
              <div className="py-12 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="w-5 h-5 animate-spin" /> กำลังโหลดข้อมูลสมุดบันทึก...
              </div>
            ) : ledgerItems.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                ไม่พบบันทึกกะในเดือน {formatMonthTH(monthKey)} ตามตัวกรองที่เลือก
              </div>
            ) : (
              ledgerItems.map((item) => {
                const mm = getMoodMeta(item.mood);
                const isUnread = Boolean(item.reply_message) && Number(item.is_read) === 0;
                return (
                  <div
                    key={`${item.log_date}-${item.period_id}`}
                    onClick={() => openPeriodEntry(item.log_date, item.period_id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all hover:shadow-sm ${
                      isUnread
                        ? 'border-rose-300 bg-rose-50/40 dark:bg-rose-950/20 dark:border-rose-800'
                        : 'border-slate-200 dark:border-slate-800 hover:border-blue-300'
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-slate-800 dark:text-slate-100">
                          {formatDateTH(item.log_date)}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-semibold">
                          {PERIOD_META[item.period_id]?.label}
                        </span>
                        {isUnread && (
                          <span className="px-2 py-0.5 rounded-full bg-rose-600 text-white text-[10px] font-bold">
                            ข้อความใหม่
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs">
                        {Number(item.qty) > 0 && (
                          <span className="font-mono text-slate-500">{Number(item.qty).toLocaleString()} ชิ้น</span>
                        )}
                        <span className={`px-2 py-0.5 rounded-full border font-semibold ${mm.badgeClass}`}>
                          {mm.emoji} {mm.short}
                        </span>
                      </div>
                    </div>

                    {item.note && (
                      <p className="text-sm text-slate-700 dark:text-slate-200 mb-2">{item.note}</p>
                    )}

                    {item.reply_message && (
                      <div className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-xs text-emerald-800 dark:text-emerald-200">
                        <span className="font-bold">คำตอบจาก {item.reply_by || 'หัวหน้างาน'}:</span> {item.reply_message}
                        {item.replied_at_fmt && <span className="ml-2 text-[10px] opacity-70">({item.replied_at_fmt})</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Day Period Chooser Drawer/Modal */}
      {dayPickerDate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-800 dark:text-slate-100">
                เลือกช่วงเวลา · {formatDateTH(dayPickerDate)}
              </h4>
              <button onClick={() => setDayPickerDate(null)} className="text-slate-400 hover:text-slate-600 font-bold text-xl">
                &times;
              </button>
            </div>
            {[1, 2, 3].map((pid) => {
              const entry = monthlyData?.[dayPickerDate]?.[pid];
              const mm = getMoodMeta(entry?.mood);
              return (
                <button
                  key={pid}
                  onClick={() => openPeriodEntry(dayPickerDate, pid)}
                  className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-blue-400 flex items-center justify-between text-left"
                >
                  <div>
                    <div className="text-sm font-bold text-slate-800 dark:text-slate-100">{PERIOD_META[pid].label}</div>
                    {entry?.reply_message && (
                      <span className="text-[11px] font-semibold text-emerald-600">มีข้อความตอบกลับ</span>
                    )}
                  </div>
                  <span className="text-xl">{entry ? mm.emoji : '➕'}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Existing Reusable LogModal */}
      <LogModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        periodId={modalTarget.periodId}
        periodInfo={PERIOD_META[modalTarget.periodId] || PERIOD_META[1]}
        logDate={modalTarget.date}
        existingData={modalTarget.existingData}
        onSaved={loadMyLogs}
      />
    </div>
  );
}

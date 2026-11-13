import React from 'react';
import {
  MessageSquareReply, ChevronLeft, ChevronRight, Lock, History, PackageCheck, CheckCircle2, Clock
} from 'lucide-react';
import { formatDateTH, getMoodMeta, maskIdentity, PERIOD_META } from '../utils/dailyLogHelpers';

export default function ShiftGroupLedgerList({
  groups = [],
  loading = false,
  isPrivacyMode = true,
  pagination = { page: 1, limit: 20, total: 0, totalPages: 1 },
  onPageChange,
  onLimitChange,
  onReplyClick,
  onHistoryClick,
  emptyMessage = 'ไม่พบข้อมูลบันทึกกะในช่วงเวลาที่เลือก'
}) {
  if (loading) {
    return (
      <div className="py-14 text-center text-slate-400 text-sm">
        กำลังโหลดรายการบันทึกกะ...
      </div>
    );
  }

  if (!groups || groups.length === 0) {
    return (
      <div className="py-14 text-center text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-sm">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {groups.map((group) => {
          const idInfo = maskIdentity(group.fullname, group.emp_id, group.username, isPrivacyMode);
          const avgMeta = getMoodMeta(group.avg_mood);

          return (
            <div
              key={group.key}
              className={`rounded-2xl border p-4 transition-all bg-white dark:bg-slate-900 ${
                group.has_negative
                  ? 'border-rose-200 dark:border-rose-900/60 shadow-xs'
                  : 'border-slate-200 dark:border-slate-800'
              }`}
            >
              {/* User-Day Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 font-bold text-sm flex items-center justify-center shrink-0">
                    {idInfo.avatarText}
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onHistoryClick && onHistoryClick(group)}
                        className="font-bold text-sm text-slate-800 dark:text-slate-100 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1.5 text-left truncate"
                        title="ดูประวัติย้อนหลัง"
                      >
                        <span className="truncate">{idInfo.displayName}</span>
                        <History className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      </button>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[11px] font-bold">
                        {group.line}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      {idInfo.displayId} · วันที่ {formatDateTH(group.log_date)}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {group.total_qty > 0 && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 font-mono font-semibold">
                      <PackageCheck className="w-3.5 h-3.5" />
                      {Number(group.total_qty).toLocaleString()} ชิ้น
                    </span>
                  )}
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border font-bold ${avgMeta.badgeClass}`}>
                    <span>{avgMeta.emoji}</span>
                    <span>เฉลี่ย {group.avg_mood || '-'} / 5</span>
                  </span>
                </div>
              </div>

              {/* 3 Period Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[1, 2, 3].map((pid) => {
                  const pLog = group.periods?.[pid];
                  const pMeta = PERIOD_META[pid];

                  if (!pLog) {
                    return (
                      <div
                        key={pid}
                        className="p-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 flex flex-col justify-between min-h-[112px]"
                      >
                        <div className="text-[11px] font-bold text-slate-400">{pMeta.label}</div>
                        <div className="text-xs text-slate-400 text-center py-3">ยังไม่มีการบันทึกในช่วงเวลานี้</div>
                        <div />
                      </div>
                    );
                  }

                  const mm = getMoodMeta(pLog.mood_score);
                  const hasReply = Boolean(pLog.reply_message && String(pLog.reply_message).trim());

                  return (
                    <div
                      key={pid}
                      className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 min-h-[112px] ${
                        Number(pLog.mood_score) <= 2
                          ? 'border-rose-200 dark:border-rose-900/70 bg-rose-50/40 dark:bg-rose-950/10'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/30'
                      }`}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-1 text-xs">
                          <span className="font-bold text-slate-600 dark:text-slate-300">
                            {pMeta.short}
                            {pLog.created_time && (
                              <span className="ml-1.5 font-mono text-[10px] text-slate-400">({pLog.created_time})</span>
                            )}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${mm.badgeClass}`}>
                            {mm.emoji} {pLog.mood_score}/5
                          </span>
                        </div>

                        {Number(pLog.production_qty) > 0 && (
                          <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                            ยอดผลิต: <span className="font-bold text-slate-700 dark:text-slate-200">{Number(pLog.production_qty).toLocaleString()}</span>
                          </div>
                        )}

                        <div className="text-xs text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 rounded-lg p-2 border border-slate-200/70 dark:border-slate-700/70 break-words">
                          {pLog.note ? pLog.note : <span className="text-slate-400 italic">ไม่มีหมายเหตุ</span>}
                        </div>

                        {hasReply && (
                          <div className="text-[11px] bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 rounded-lg p-2 text-emerald-800 dark:text-emerald-200 break-words">
                            <div className="font-bold flex items-center gap-1 mb-0.5">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              <span>{pLog.reply_by || 'หัวหน้างาน'}:</span>
                              {pLog.replied_at_fmt && <span className="font-normal opacity-70 ml-auto">{pLog.replied_at_fmt}</span>}
                            </div>
                            <div>{pLog.reply_message}</div>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        {!hasReply ? (
                          <span className="inline-flex items-center gap-1 text-[10px] text-slate-400">
                            <Clock className="w-3 h-3" /> รอการตอบกลับ
                          </span>
                        ) : (
                          <span />
                        )}
                        <button
                          type="button"
                          onClick={() => onReplyClick && onReplyClick(pLog)}
                          className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors ${
                            hasReply
                              ? 'bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                          }`}
                        >
                          {isPrivacyMode ? <Lock className="w-3 h-3" /> : <MessageSquareReply className="w-3 h-3" />}
                          {hasReply ? 'แก้ไขตอบกลับ' : 'ตอบกลับ'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination Footer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
        <div className="flex items-center gap-2">
          <span>ทั้งหมด {Number(pagination.total || 0).toLocaleString()} รายการบุคคล-วัน</span>
          {onLimitChange && (
            <select
              value={pagination.limit}
              onChange={(e) => onLimitChange(Number(e.target.value))}
              className="px-2 py-1 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-xs font-semibold"
            >
              {[20, 50, 100, 200].map((size) => (
                <option key={size} value={size}>{size} รายการ/หน้า</option>
              ))}
            </select>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> ก่อนหน้า
          </button>
          <span className="font-mono font-bold px-2">
            หน้า {pagination.page} / {pagination.totalPages || 1}
          </span>
          <button
            type="button"
            disabled={pagination.page >= (pagination.totalPages || 1)}
            onClick={() => onPageChange(pagination.page + 1)}
            className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1"
          >
            ถัดไป <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

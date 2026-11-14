import React, { useState } from 'react';
import { CheckCheck, CheckCircle2 } from 'lucide-react';
import { loadingReportApi } from '../../../shared/services/loadingApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { CTPAT_CHECKLIST_SECTIONS, TOTAL_CTPAT_ITEMS } from '../utils/ctpatConfig';

/**
 * Interactive 10-section C-TPAT Container Security & Condition Checklist (54 items).
 */
export default function CtpatChecklistPanel({
  reportId,
  checklist,
  isCompleted,
  isOffline,
  isReadOnly,
  onChecklistChanged,
}) {
  const toast = useToast();
  const confirm = useConfirm();
  const [markingAll, setMarkingAll] = useState(false);

  const locked = isCompleted || isOffline || isReadOnly;

  let checkedCount = 0;
  CTPAT_CHECKLIST_SECTIONS.forEach((sec) => {
    sec.items.forEach((_, idx) => {
      const val = checklist?.[sec.id]?.[idx + 1]?.result;
      if (val === 'PASS' || val === 'FAIL' || val === 'N/A') checkedCount += 1;
    });
  });

  const handleSetResult = async (section, itemIdxZeroBased, itemText, resultVal, currentRemark) => {
    if (locked) return;
    if (!reportId) {
      toast.warning('กรุณากด "บันทึกข้อมูลส่วนหัว" ก่อนทำแบบตรวจ C-TPAT');
      return;
    }
    try {
      await loadingReportApi.saveChecklistItem({
        report_id: reportId,
        topic_id: section.id,
        topic_name: section.title,
        item_index: itemIdxZeroBased + 1,
        item_name: itemText,
        result: resultVal,
        remark: currentRemark || '',
      });
      await onChecklistChanged?.(section.id, itemIdxZeroBased + 1, {
        result: resultVal,
        remark: currentRemark || '',
      });
    } catch (err) {
      toast.error(err.message || 'บันทึกผลตรวจไม่สำเร็จ');
    }
  };

  const handleSaveRemark = async (section, itemIdxZeroBased, itemText, currentResult, newRemark) => {
    if (locked || !reportId) return;
    const prevRemark = checklist?.[section.id]?.[itemIdxZeroBased + 1]?.remark || '';
    if (prevRemark === newRemark) return;
    try {
      await loadingReportApi.saveChecklistItem({
        report_id: reportId,
        topic_id: section.id,
        topic_name: section.title,
        item_index: itemIdxZeroBased + 1,
        item_name: itemText,
        result: currentResult || '',
        remark: newRemark,
      });
      await onChecklistChanged?.(section.id, itemIdxZeroBased + 1, {
        result: currentResult || '',
        remark: newRemark,
      });
      toast.success('บันทึกหมายเหตุเรียบร้อย');
    } catch (err) {
      toast.error(err.message || 'บันทึกหมายเหตุไม่สำเร็จ');
    }
  };

  const handleAllPass = async () => {
    if (locked || markingAll) return;
    if (!reportId) {
      toast.warning('กรุณากด "บันทึกข้อมูลส่วนหัว" ก่อนทำแบบตรวจ C-TPAT');
      return;
    }
    const ok = await confirm({
      title: 'ตั้งค่า PASS ทั้งหมด',
      message: `ยืนยันตั้งค่าผลตรวจทั้ง ${TOTAL_CTPAT_ITEMS} รายการเป็น PASS ทั้งหมดใช่หรือไม่?`,
      confirmText: 'ยืนยัน PASS ทั้งหมด',
    });
    if (!ok) return;

    setMarkingAll(true);
    try {
      await loadingReportApi.saveAllPass(reportId);
      toast.success('บันทึกผลตรวจ PASS ทั้งหมดเรียบร้อย');
      await onChecklistChanged?.('RELOAD_ALL');
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถบันทึกทั้งหมดได้');
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-700 dark:bg-slate-800/60">
        <div className="flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              แบบตรวจตู้สินค้า C-TPAT 10 หมวด ({checkedCount} / {TOTAL_CTPAT_ITEMS} ข้อ)
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              คลิกเลือก PASS / FAIL / N/A ระบบบันทึกทันทีทุกหัวข้อ
            </p>
          </div>
        </div>

        {!locked && (
          <button
            type="button"
            disabled={markingAll || !reportId}
            onClick={handleAllPass}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-40"
          >
            <CheckCheck className="h-4 w-4" />
            <span>{markingAll ? 'กำลังบันทึก...' : 'PASS ทั้งหมด'}</span>
          </button>
        )}
      </div>

      <div className="space-y-4">
        {CTPAT_CHECKLIST_SECTIONS.map((sec) => (
          <div
            key={sec.id}
            className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="border-b border-slate-200 bg-slate-100/70 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                หมวดที่ {sec.id}: {sec.title}
              </div>
              {(sec.officialNote || sec.note) && (
                <p className="mt-0.5 whitespace-pre-line text-[11px] text-amber-700 dark:text-amber-300">
                  {sec.officialNote || sec.note}
                </p>
              )}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sec.items.map((itemText, idx) => {
                const entry = checklist?.[sec.id]?.[idx + 1] || {};
                const curResult = entry.result || '';
                const curRemark = entry.remark || '';

                return (
                  <div
                    key={idx}
                    className="flex flex-col gap-2.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex-1 text-xs text-slate-800 dark:text-slate-200">
                      <span className="mr-1.5 font-mono font-bold text-slate-400">
                        {sec.id}.{idx + 1}
                      </span>
                      <span>{itemText}</span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {['PASS', 'FAIL', 'N/A'].map((opt) => {
                        const selected = curResult === opt;
                        const activeCls =
                          opt === 'PASS'
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : opt === 'FAIL'
                              ? 'bg-red-600 text-white border-red-600'
                              : 'bg-slate-700 text-white border-slate-700';

                        return (
                          <button
                            key={opt}
                            type="button"
                            disabled={locked}
                            onClick={() => handleSetResult(sec, idx, itemText, opt, curRemark)}
                            className={`min-h-[44px] min-w-[60px] rounded-xl border px-3 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                              selected
                                ? activeCls
                                : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}

                      <input
                        type="text"
                        disabled={locked}
                        defaultValue={curRemark}
                        onBlur={(e) => handleSaveRemark(sec, idx, itemText, curResult, e.target.value)}
                        placeholder="หมายเหตุ (ถ้ามี)"
                        className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none sm:w-44 dark:border-slate-700 dark:bg-slate-800"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

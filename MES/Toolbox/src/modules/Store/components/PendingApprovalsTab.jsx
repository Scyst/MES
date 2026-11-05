import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, CheckCircle2, XCircle, RefreshCw, AlertTriangle,
  FileCheck, HelpCircle, User, Calendar
} from 'lucide-react';
import { storeApi } from '../../../shared/services/storeApi';
import SecurityWatermark from '../../../shared/components/SecurityWatermark';

export default function PendingApprovalsTab() {
  const [pendingCounts, setPendingCounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [actionType, setActionType] = useState('APPROVE'); // 'APPROVE' | 'REJECT'
  const [decisionReason, setDecisionReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const fetchPendingCounts = async () => {
    setLoading(true);
    try {
      const res = await storeApi.getPendingCounts();
      if (res && res.success) {
        setPendingCounts(res.pending_counts || res.data || []);
      }
    } catch (err) {
      console.error('Failed to load pending cycle counts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingCounts();
  }, []);

  const openDecisionModal = (record, type) => {
    setSelectedRecord(record);
    setActionType(type);
    setDecisionReason('');
  };

  const handleExecuteDecision = async () => {
    if (!selectedRecord) return;
    if (actionType === 'REJECT' && !decisionReason.trim()) {
      alert('กรุณาระบุเหตุผลในการปฏิเสธการปรับยอด');
      return;
    }

    setSubmitting(true);
    try {
      const res = await storeApi.processCycleCountApproval({
        countId: selectedRecord.count_id,
        approvalAction: actionType,
        decisionReason: decisionReason.trim()
      });

      if (res && res.success) {
        setFeedback({
          type: 'success',
          msg: `${actionType === 'APPROVE' ? 'อนุมัติการปรับยอดสต็อก' : 'ปฏิเสธรายการ'} #${selectedRecord.count_id} เรียบร้อยแล้ว`
        });
        setSelectedRecord(null);
        fetchPendingCounts();
      } else {
        alert(res?.message || 'ไม่สามารถดำเนินการได้');
      }
    } catch (err) {
      alert(err.message || 'เกิดข้อผิดพลาดในการประมวลผล');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full space-y-3 animate-fadeIn relative">
      <SecurityWatermark classification="INVENTORY ADJUSTMENT • STRICT APPROVAL" />

      {/* Policy Notice Header */}
      <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/60 shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 flex-shrink-0">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
              นโยบายการอนุมัติตัดยอดสต็อกโดยผู้จัดการ (Strict Human Manual Approval)
            </h3>
            <p className="text-[11px] text-amber-700/80 dark:text-amber-300/70 mt-0.5 line-clamp-1">
              ห้ามมีระบบอนุมัติอัตโนมัติ (Zero Auto-Approve) • ทุกการปรับยอดต้องกดยืนยันด้วยมือเท่านั้น
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchPendingCounts}
          className="self-start sm:self-auto px-3 py-1.5 text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center gap-1.5 text-xs font-semibold cursor-pointer border border-amber-200/60 dark:border-amber-800/40 bg-white/60 dark:bg-slate-900/40"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      {feedback && (
        <div className="p-3 text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between flex-shrink-0">
          <span>{feedback.msg}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-emerald-500 hover:text-emerald-700">✕</button>
        </div>
      )}

      {/* Pending Table / Cards */}
      <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl sm:rounded-2xl shadow-sm flex flex-col overflow-hidden min-h-0">
        <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              รายการผลต่างสต็อกที่รอการพิจารณา
            </span>
            <span className="px-2 py-0.5 rounded-full text-[10px] sm:text-[11px] font-mono font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-400">
              {pendingCounts.length} รายการ
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="py-20 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              กำลังโหลดรายการรออนุมัติ...
            </div>
          ) : pendingCounts.length === 0 ? (
            <div className="py-20 text-center text-slate-400">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-emerald-500/60" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                ไม่มีรายการรอการอนุมัติในขณะนี้
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ยอดตรวจนับทั้งหมดได้รับการตรวจสอบและอนุมัติเรียบร้อย 100%
              </p>
            </div>
          ) : (
            <>
              {/* DESKTOP TABLE VIEW */}
              <div className="hidden md:block">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100/70 dark:bg-slate-800/50 text-slate-600 dark:text-slate-300 font-semibold sticky top-0 z-10 border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="py-2.5 px-4"># Count ID</th>
                      <th className="py-2.5 px-3">วันที่ / เวลา</th>
                      <th className="py-2.5 px-3">คลังสินค้า</th>
                      <th className="py-2.5 px-3">รหัสและชื่อชิ้นงาน</th>
                      <th className="py-2.5 px-3 text-right">ยอดในระบบ</th>
                      <th className="py-2.5 px-3 text-right">ยอดนับจริง</th>
                      <th className="py-2.5 px-3 text-right">ผลต่าง (Diff)</th>
                      <th className="py-2.5 px-3 text-right">มูลค่ากระทบ (฿)</th>
                      <th className="py-2.5 px-3">ผู้นับ</th>
                      <th className="py-2.5 px-4 text-center">การพิจารณา</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {pendingCounts.map((row) => {
                      const diff = parseFloat(row.diff_qty || 0);
                      const isLoss = diff < 0;
                      const isSurplus = diff > 0;
                      const dateStr = row.counted_at || row.count_date || row.created_at;
                      const partCode = row.item_no || row.part_no || row.sap_no;
                      const diffVal = parseFloat(row.diff_value || row.variance_val || 0);
                      const counter = row.counter_name || row.counted_by || 'Operator';

                      return (
                        <tr
                          key={row.count_id}
                          className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="py-2.5 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                            #{row.count_id}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                            {dateStr ? new Date(dateStr).toLocaleString('th-TH') : '-'}
                          </td>
                          <td className="py-2.5 px-3 font-mono font-semibold text-slate-800 dark:text-slate-200">
                            {row.location_name}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 dark:text-slate-300">
                            <div className="font-bold">{partCode}</div>
                            <div className="text-[11px] text-slate-400 truncate max-w-xs">
                              {row.part_description}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-slate-600 dark:text-slate-400">
                            {Number(row.system_qty || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 dark:text-slate-100">
                            {Number(row.actual_qty || 0).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-black text-sm">
                            <span
                              className={`px-2 py-0.5 rounded ${
                                isLoss
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                                  : isSurplus
                                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                                  : 'text-slate-400'
                              }`}
                            >
                              {diff > 0 ? `+${diff}` : diff}
                            </span>
                          </td>
                          <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                            isLoss ? 'text-red-600' : isSurplus ? 'text-blue-600' : 'text-slate-500'
                          }`}>
                            ฿{Number(diffVal).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {counter}
                          </td>
                          <td className="py-2.5 px-4 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => openDecisionModal(row, 'APPROVE')}
                                className="px-2.5 py-1 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition-colors cursor-pointer"
                              >
                                อนุมัติ
                              </button>
                              <button
                                type="button"
                                onClick={() => openDecisionModal(row, 'REJECT')}
                                className="px-2.5 py-1 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                              >
                                ปฏิเสธ
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* MOBILE CARDS VIEW */}
              <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                {pendingCounts.map((row) => {
                  const diff = parseFloat(row.diff_qty || 0);
                  const isLoss = diff < 0;
                  const isSurplus = diff > 0;
                  const dateStr = row.counted_at || row.count_date || row.created_at;
                  const partCode = row.item_no || row.part_no || row.sap_no;
                  const diffVal = parseFloat(row.diff_value || row.variance_val || 0);
                  const counter = row.counter_name || row.counted_by || 'Operator';

                  return (
                    <div key={row.count_id} className="p-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-slate-400">
                            #{row.count_id}
                          </span>
                          <span className="font-mono font-black text-sm text-slate-900 dark:text-slate-100">
                            {partCode}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded font-mono font-bold text-xs ${
                            isLoss
                              ? 'bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400'
                              : isSurplus
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                              : 'text-slate-400'
                          }`}
                        >
                          Diff: {diff > 0 ? `+${diff}` : diff}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 dark:text-slate-400 line-clamp-1">
                        {row.part_description || '-'}
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
                        <span>คลัง: {row.location_name}</span>
                        <span>ผู้นับ: {counter}</span>
                      </div>

                      <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-center text-xs">
                        <div>
                          <div className="text-[10px] text-slate-400">ในระบบ</div>
                          <div className="font-mono font-bold text-slate-700 dark:text-slate-300">
                            {Number(row.system_qty || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">นับจริง</div>
                          <div className="font-mono font-black text-slate-900 dark:text-slate-100">
                            {Number(row.actual_qty || 0).toLocaleString()}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] text-slate-400">ผลกระทบ</div>
                          <div className={`font-mono font-bold ${isLoss ? 'text-red-600' : 'text-blue-600'}`}>
                            ฿{Number(diffVal).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      </div>

                      {/* Mobile Actions */}
                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => openDecisionModal(row, 'APPROVE')}
                          className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm transition-colors text-center cursor-pointer min-h-[36px]"
                        >
                          อนุมัติการปรับยอด
                        </button>
                        <button
                          type="button"
                          onClick={() => openDecisionModal(row, 'REJECT')}
                          className="px-4 py-2 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-xl transition-colors cursor-pointer min-h-[36px]"
                        >
                          ปฏิเสธ
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Decision Confirmation Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-lg p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                actionType === 'APPROVE'
                  ? 'bg-emerald-500/10 text-emerald-600'
                  : 'bg-red-500/10 text-red-600'
              }`}>
                {actionType === 'APPROVE' ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 truncate">
                  {actionType === 'APPROVE' ? 'ยืนยันการอนุมัติตัดยอดสต็อก' : 'ยืนยันการปฏิเสธยอดตรวจนับ'}
                </h3>
                <p className="text-xs text-slate-500 truncate">
                  รายการ #{selectedRecord.count_id} • คลัง {selectedRecord.location_name}
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500">รหัสชิ้นงาน:</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {selectedRecord.item_no || selectedRecord.part_no || selectedRecord.sap_no}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ผลต่างจำนวน (Diff):</span>
                <span className="font-mono font-black text-sm text-blue-600 dark:text-blue-400">
                  {selectedRecord.diff_qty > 0 ? `+${selectedRecord.diff_qty}` : selectedRecord.diff_qty} ชิ้น
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">ผลกระทบมูลค่า (฿):</span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  ฿{Number(selectedRecord.diff_value || selectedRecord.variance_val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {actionType === 'APPROVE' ? 'หมายเหตุการอนุมัติ (ถ้ามี):' : 'ระบุเหตุผลในการปฏิเสธ (จำเป็น):'}
              </label>
              <textarea
                value={decisionReason}
                onChange={(e) => setDecisionReason(e.target.value)}
                placeholder={actionType === 'APPROVE' ? 'เช่น ตรวจนับซ้ำถูกต้องตรงกัน...' : 'เช่น ตรวจสอบพบสินค้ายังไม่ถูกตัดจ่ายออกจากไลน์...'}
                className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:border-blue-500 h-20"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleExecuteDecision}
                disabled={submitting}
                className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-colors cursor-pointer ${
                  actionType === 'APPROVE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-red-600 hover:bg-red-700'
                } disabled:opacity-50`}
              >
                {submitting ? 'กำลังบันทึก...' : actionType === 'APPROVE' ? 'ยืนยันอนุมัติสต็อก' : 'ยืนยันปฏิเสธ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

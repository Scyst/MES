import React from 'react';
import { X, Award, ShieldCheck, AlertTriangle, TrendingUp, BarChart3, CheckCircle2 } from 'lucide-react';

export default function ZoneHealthModal({ isOpen, onClose, healthData, loading }) {
  if (!isOpen) return null;

  const summary = healthData?.overall || {};
  const zones = healthData?.zones || [];
  const cycleLabel = healthData?.cycle_label || 'รอบการตรวจนับปัจจุบัน';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                ดัชนีความแม่นยำสต็อก (Inventory Record Accuracy - IRA)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                การประเมินสุขภาพคลังสินค้าประจำ {cycleLabel}
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
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400">
              <div className="w-8 h-8 border-3 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mx-auto mb-3" />
              กำลังประมวลผลดัชนีสุขภาพคลังสินค้า...
            </div>
          ) : (
            <>
              {/* Summary Scorecards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">
                      Item-Level IRA
                    </span>
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-emerald-700 dark:text-emerald-300">
                    {summary.item_ira !== undefined ? `${Number(summary.item_ira).toFixed(2)}%` : '-'}
                  </div>
                  <p className="text-[11px] text-emerald-600/80 dark:text-emerald-400/70 mt-1">
                    ความแม่นยำรายชิ้น ({summary.accurate_items || 0} / {summary.total_counted_items || 0} รายการตรงเป๊ะ)
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-blue-200 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wider">
                      Value-Weighted IRA
                    </span>
                    <TrendingUp className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="text-2xl font-black text-blue-700 dark:text-blue-300">
                    {summary.value_ira !== undefined ? `${Number(summary.value_ira).toFixed(2)}%` : '-'}
                  </div>
                  <p className="text-[11px] text-blue-600/80 dark:text-blue-400/70 mt-1">
                    ความแม่นยำถ่วงน้ำหนักมูลค่าสต็อก
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-purple-200 dark:border-purple-900/40 bg-purple-50/50 dark:bg-purple-950/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">
                      ความคืบหน้ารอบนับ
                    </span>
                    <BarChart3 className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="text-2xl font-black text-purple-700 dark:text-purple-300">
                    {summary.coverage_pct !== undefined ? `${Number(summary.coverage_pct).toFixed(1)}%` : '-'}
                  </div>
                  <p className="text-[11px] text-purple-600/80 dark:text-purple-400/70 mt-1">
                    ตรวจแล้ว {summary.counted_locations || 0} จาก {summary.total_locations || 0} คลัง
                  </p>
                </div>
              </div>

              {/* Zone Breakdown */}
              <div>
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <span>สถานะสุขภาพสต็อกแยกตามโซน</span>
                  <span className="text-xs font-normal text-slate-500">({zones.length} โซน)</span>
                </h3>

                <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-700">
                        <tr>
                          <th className="py-2.5 px-4">ชื่อโซน</th>
                          <th className="py-2.5 px-3 text-center">เกรด</th>
                          <th className="py-2.5 px-3 text-right">Item IRA</th>
                          <th className="py-2.5 px-3 text-right">Value IRA</th>
                          <th className="py-2.5 px-3 text-right">คลังที่ตรวจแล้ว</th>
                          <th className="py-2.5 px-3 text-right">ผลต่างสุทธิ (฿)</th>
                          <th className="py-2.5 px-4">คำแนะนำการปฏิบัติงาน</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {zones.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="py-8 text-center text-slate-400">
                              ยังไม่มีข้อมูลการตรวจนับในรอบเดือนนี้
                            </td>
                          </tr>
                        ) : (
                          zones.map((z, idx) => {
                            const grade = z.grade || 'N/A';
                            let gradeBadge = 'bg-slate-100 text-slate-600';
                            if (grade === 'A') gradeBadge = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 font-bold';
                            else if (grade === 'B') gradeBadge = 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 font-bold';
                            else if (grade === 'C') gradeBadge = 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 font-bold';
                            else if (grade === 'D') gradeBadge = 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold';

                            return (
                              <tr key={idx} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                <td className="py-2.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                                  {z.zone_name}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <span className={`px-2 py-0.5 rounded text-[11px] ${gradeBadge}`}>
                                    เกรด {grade}
                                  </span>
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {z.item_ira !== undefined ? `${Number(z.item_ira).toFixed(1)}%` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-700 dark:text-slate-300">
                                  {z.value_ira !== undefined ? `${Number(z.value_ira).toFixed(1)}%` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-right text-slate-600 dark:text-slate-400">
                                  {z.counted_locations || 0} / {z.total_locations || 0}
                                </td>
                                <td className={`py-2.5 px-3 text-right font-mono ${
                                  (z.net_variance_val || 0) < 0 ? 'text-red-600 font-bold' : (z.net_variance_val || 0) > 0 ? 'text-blue-600 font-bold' : 'text-slate-500'
                                }`}>
                                  ฿{Number(z.net_variance_val || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td className="py-2.5 px-4 text-xs text-slate-500 dark:text-slate-400">
                                  {z.guidance || 'คงมาตรฐานการจัดเก็บต่อเนื่อง'}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors shadow-sm"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}

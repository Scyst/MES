import React, { useState, useEffect } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, X, CloudDownload, Database, ArrowRight } from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';

export default function SapSyncModal({ isOpen, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      loadPreview();
    } else {
      setPreviewData(null);
    }
  }, [isOpen]);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const res = await systemSettingsApi.previewSapSync();
      if (res && res.success) {
        setPreviewData(res.data || res);
      } else {
        showToast(res?.message || 'ไม่สามารถโหลดข้อมูลพรีวิวได้', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการโหลดพรีวิว SAP: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteSync = async () => {
    setSyncing(true);
    try {
      const res = await systemSettingsApi.executeSapSync();
      if (res && res.success) {
        showToast(res.message || 'ซิงค์ข้อมูลจาก SAP เรียบร้อยแล้ว', 'success');
        onSuccess?.();
        onClose();
      } else {
        showToast(res?.message || 'การซิงค์ข้อมูลล้มเหลว', 'error');
      }
    } catch (err) {
      showToast('เกิดข้อผิดพลาดในการซิงค์ข้อมูล: ' + err.message, 'error');
    } finally {
      setSyncing(false);
    }
  };

  if (!isOpen) return null;

  const affected = previewData?.affected_items || [];
  const inserted = previewData?.inserted ?? 0;
  const updated = previewData?.updated ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                ซิงค์รายการสินค้าจาก SAP Staging (Sync SAP Items)
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                ตรวจสอบและนำเข้ารหัสวัสดุใหม่จาก SAP Staging สู่ฐานข้อมูล Item Master
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-400">
              <RefreshCw className="w-7 h-7 animate-spin text-blue-600 mb-2" />
              <p className="text-xs">กำลังตรวจสอบความแตกต่างกับฐานข้อมูล SAP...</p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60">
                  <span className="text-[11px] font-semibold text-emerald-800 dark:text-emerald-300">
                    รายการใหม่ที่จะนำเข้า (New Items)
                  </span>
                  <p className="text-xl font-bold font-mono text-emerald-700 dark:text-emerald-200 mt-0.5">
                    {inserted.toLocaleString()}{' '}
                    <span className="text-xs font-sans font-normal">รายการ</span>
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60">
                  <span className="text-[11px] font-semibold text-blue-800 dark:text-blue-300">
                    รายการที่จะอัปเดตชื่อ (Updates)
                  </span>
                  <p className="text-xl font-bold font-mono text-blue-700 dark:text-blue-200 mt-0.5">
                    {updated.toLocaleString()}{' '}
                    <span className="text-xs font-sans font-normal">รายการ</span>
                  </p>
                </div>
              </div>

              {/* Status Notice */}
              {affected.length === 0 ? (
                <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-center py-8">
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-200">
                    ฐานข้อมูล Item Master อัปเดตตรงกับ SAP Staging เรียบร้อยแล้ว
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    ไม่พบรายการสินค้าใหม่หรือการเปลี่ยนแปลงรายละเอียดที่ต้องนำเข้า
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                    <span>รายการที่ตรวจพบ ({affected.length} รายการ):</span>
                    <span className="text-[11px] text-slate-400">หมวดเริ่มต้น: UNCLASSIFIED</span>
                  </div>

                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden max-h-[300px] overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 dark:bg-slate-800 sticky top-0 border-b border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="py-2 px-3 font-semibold w-24">การดำเนินการ</th>
                          <th className="py-2 px-3 font-semibold w-28">SAP No.</th>
                          <th className="py-2 px-3 font-semibold">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {affected.slice(0, 100).map((it, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40">
                            <td className="py-2 px-3">
                              <span
                                className={`px-1.5 py-0.5 text-[10px] font-bold rounded ${
                                  it.action === 'NEW'
                                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                                    : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                                }`}
                              >
                                {it.action}
                              </span>
                            </td>
                            <td className="py-2 px-3 font-mono font-bold text-slate-900 dark:text-slate-100">
                              {it.sap_no}
                            </td>
                            <td className="py-2 px-3 text-slate-600 dark:text-slate-300 truncate max-w-xs">
                              {it.part_description}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {affected.length > 100 && (
                    <p className="text-[10px] text-slate-400 text-right">
                      * แสดงตัวอย่าง 100 รายการแรกจากทั้งหมด {affected.length} รายการ
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850">
          <button
            onClick={onClose}
            disabled={syncing}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 dark:text-slate-300 dark:hover:text-white rounded-lg hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            ยกเลิก (Cancel)
          </button>
          <button
            onClick={handleExecuteSync}
            disabled={loading || syncing || affected.length === 0}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
          >
            <CloudDownload className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'กำลังนำเข้าข้อมูล...' : `Confirm & Sync (${affected.length})`}
          </button>
        </div>
      </div>
    </div>
  );
}

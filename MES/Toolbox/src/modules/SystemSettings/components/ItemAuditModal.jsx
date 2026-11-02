import React, { useState, useEffect } from 'react';
import { X, History, AlertCircle, Clock } from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';

export default function ItemAuditModal({ isOpen, onClose, item }) {
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item?.item_id) {
      setLoading(true);
      setError(null);
      systemSettingsApi
        .getItemAuditTrail(item.item_id)
        .then((res) => {
          if (res && res.success) {
            setLogs(res.data || []);
          } else {
            setError(res?.message || 'ไม่สามารถโหลดประวัติได้');
          }
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLogs([]);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-3xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-800 text-white">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-amber-400" />
            <div>
              <h3 className="text-base font-bold">Audit Trail (ประวัติการแก้ไขข้อมูล)</h3>
              <p className="text-xs text-slate-300">
                ประวัติการสร้าง แก้ไข และปรับปรุงข้อมูลสินค้า
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Item Summary Bar */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex flex-wrap items-center gap-4 text-xs">
          <div>
            <span className="text-slate-400">SAP No:</span>{' '}
            <span className="font-bold text-slate-800 dark:text-slate-100">{item?.sap_no}</span>
          </div>
          <div>
            <span className="text-slate-400">Part No:</span>{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">{item?.part_no || '-'}</span>
          </div>
          <div>
            <span className="text-slate-400">Description:</span>{' '}
            <span className="text-slate-600 dark:text-slate-300">{item?.part_description || '-'}</span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400">กำลังโหลดประวัติ...</div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : logs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              ยังไม่มีประวัติการแก้ไขที่บันทึกไว้สำหรับสินค้ารายการนี้
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold w-40">วัน-เวลา</th>
                    <th className="py-2.5 px-3 font-semibold w-32">ผู้ใช้งาน</th>
                    <th className="py-2.5 px-3 font-semibold w-32">Action</th>
                    <th className="py-2.5 px-3 font-semibold">รายละเอียด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {logs.map((log, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="py-2.5 px-3 font-mono text-slate-500 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {log.created_at || log.timestamp || '-'}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700 dark:text-slate-300">
                        {log.username || log.user_id || 'System'}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {log.action_type || log.action || '-'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 dark:text-slate-300">
                        {log.details || log.log_text || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-100 dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 rounded-xl border border-slate-200 dark:border-slate-600 transition-colors"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
}


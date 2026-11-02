import React, { useState, useEffect } from 'react';
import { X, Search, Link2, AlertCircle } from 'lucide-react';
import { systemSettingsApi } from '../../../shared/services/systemSettingsApi';

export default function ItemWhereUsedModal({ isOpen, onClose, item }) {
  const [loading, setLoading] = useState(false);
  const [whereUsedList, setWhereUsedList] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && item?.item_id) {
      setLoading(true);
      setError(null);
      systemSettingsApi
        .getWhereUsed(item.item_id)
        .then((res) => {
          if (res && res.success) {
            setWhereUsedList(res.data || []);
          } else {
            setError(res?.message || 'ไม่สามารถโหลดข้อมูล Where-Used ได้');
          }
        })
        .catch((err) => {
          setError(err.message);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setWhereUsedList([]);
    }
  }, [isOpen, item]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-sky-900 text-white">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-sky-400" />
            <div>
              <h3 className="text-base font-bold">Where-Used Analysis</h3>
              <p className="text-xs text-sky-200">
                วัตถุดิบ/ชิ้นส่วนนี้ถูกนำไปใช้ในสูตรการผลิต (BOM) ของสินค้าใดบ้าง
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-sky-300 hover:text-white hover:bg-sky-800 transition-colors"
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
            <div className="py-12 text-center text-slate-400">กำลังค้นหาสูตรที่เกี่ยวข้อง...</div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 flex items-center gap-2 text-sm">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span>{error}</span>
            </div>
          ) : whereUsedList.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              ไม่พบการนำชิ้นส่วนนี้ไปใช้ใน BOM ของสินค้าสำเร็จรูปใด
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">Parent SAP No.</th>
                    <th className="py-2.5 px-3 font-semibold">Description</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Type</th>
                    <th className="py-2.5 px-3 font-semibold text-center">Version</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Usage Qty</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {whereUsedList.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                      <td className="py-2.5 px-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                        {row.parent_sap_no || row.fg_sap_no}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 dark:text-slate-200">
                        {row.parent_description || row.fg_description || '-'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                          {row.parent_type || row.material_type || 'FG'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono">
                        {row.bom_version || 'V1'}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800 dark:text-slate-100">
                        {Number(row.quantity_required || row.usage_qty || 0).toLocaleString()}
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


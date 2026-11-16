import React, { useEffect, useState } from 'react';
import { Check, Link2, RefreshCw, Search, Truck, X } from 'lucide-react';
import { cctvApi } from '../../../shared/services/cctvApi';

function toDateTimeLocal(str) {
  if (!str || str.length < 16) return '';
  return str.slice(0, 16).replace(' ', 'T');
}

/**
 * Modal for importing completed C-TPAT Loading Report time ranges into CCTV download rows.
 */
export default function LinkLoadingModal({ open, onClose, onImportRows }) {
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [rows, setRows] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const fetchReports = async (targetDate) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await cctvApi.linkLoading(targetDate);
      const list = Array.isArray(res.data?.rows) ? res.data.rows : [];
      setRows(list);
      setSelectedIds([]);
    } catch (err) {
      setErrorMsg(err?.message || 'ไม่สามารถดึงรายการ Loading Report ได้');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchReports(date);
    }
  }, [open, date]);

  if (!open) return null;

  const allChecked = rows.length > 0 && selectedIds.length === rows.length;

  const toggleAll = () => {
    setSelectedIds(allChecked ? [] : rows.map((r) => r.report_id));
  };

  const toggleRow = (reportId) => {
    setSelectedIds((prev) =>
      prev.includes(reportId) ? prev.filter((id) => id !== reportId) : [...prev, reportId]
    );
  };

  const handleConfirmImport = () => {
    const chosen = rows
      .filter((r) => selectedIds.includes(r.report_id))
      .map((r) => ({
        start_time: toDateTimeLocal(r.loading_start_time),
        end_time: toDateTimeLocal(r.loading_end_time),
        filename: r.sanitized_filename || `LOADING_${r.report_id}`,
      }));
    if (chosen.length > 0) {
      onImportRows(chosen);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white dark:bg-gray-900 shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 bg-blue-600 text-white">
          <div className="flex items-center gap-2 font-bold">
            <Link2 size={18} />
            <span>เชื่อมต่อรายการ Loading Report (COMPLETED)</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-blue-700"
            aria-label="ปิดหน้าต่าง"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          <div className="flex flex-wrap items-end gap-2">
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-bold text-gray-600 dark:text-gray-300 mb-1">
                วันที่โหลดสินค้า (Loading Date)
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 text-sm rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800"
              />
            </div>
            <button
              type="button"
              onClick={() => fetchReports(date)}
              disabled={loading}
              className="min-h-[44px] px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-1.5"
            >
              {loading ? <RefreshCw size={16} className="animate-spin" /> : <Search size={16} />}
              <span>ค้นหา</span>
            </button>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-700">
              {errorMsg}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-sm text-gray-400">กำลังโหลดข้อมูลจาก SQL Server...</div>
          ) : rows.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-400 space-y-1">
              <Truck size={32} className="mx-auto opacity-40" />
              <div>ไม่พบรายการ Loading Report ที่ COMPLETED ในวันที่เลือก</div>
            </div>
          ) : (
            <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-xl">
              <table className="w-full text-xs sm:text-sm text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-xs font-bold uppercase text-gray-500 border-b border-gray-200 dark:border-gray-700">
                  <tr>
                    <th className="px-3 py-2.5 w-10">
                      <input type="checkbox" checked={allChecked} onChange={toggleAll} />
                    </th>
                    <th className="px-3 py-2.5">Report ID</th>
                    <th className="px-3 py-2.5">PO Number</th>
                    <th className="px-3 py-2.5">ตู้คอนเทนเนอร์</th>
                    <th className="px-3 py-2.5">เวลาเริ่ม</th>
                    <th className="px-3 py-2.5">เวลาสิ้นสุด</th>
                    <th className="px-3 py-2.5">สถานะไฟล์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {rows.map((r) => {
                    const checked = selectedIds.includes(r.report_id);
                    return (
                      <tr
                        key={r.report_id}
                        onClick={() => toggleRow(r.report_id)}
                        className={`cursor-pointer hover:bg-blue-50/40 dark:hover:bg-gray-800/70 ${
                          r.already_exists ? 'bg-amber-50/40 dark:bg-amber-950/10' : ''
                        }`}
                      >
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleRow(r.report_id)}
                          />
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-gray-600">#{r.report_id}</td>
                        <td className="px-3 py-2.5 font-bold text-blue-700 dark:text-blue-400">{r.po_number || '-'}</td>
                        <td className="px-3 py-2.5">{r.container_no || '-'}</td>
                        <td className="px-3 py-2.5 font-mono">{r.loading_start_time ? r.loading_start_time.slice(11) : '-'}</td>
                        <td className="px-3 py-2.5 font-mono">{r.loading_end_time ? r.loading_end_time.slice(11) : '-'}</td>
                        <td className="px-3 py-2.5">
                          {r.exists_status === 'downloaded' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700">มีไฟล์แล้ว</span>
                          ) : r.exists_status === 'downloading' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">กำลังโหลด</span>
                          ) : r.exists_status === 'queued' ? (
                            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700">รอคิว</span>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="text-xs text-gray-500">เลือกแล้ว {selectedIds.length} รายการ</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] px-4 rounded-xl border border-gray-300 dark:border-gray-600 text-sm font-semibold"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={selectedIds.length === 0}
              onClick={handleConfirmImport}
              className="min-h-[44px] px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40"
            >
              <Check size={16} />
              <span>นำเข้าคิวดาวน์โหลด ({selectedIds.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

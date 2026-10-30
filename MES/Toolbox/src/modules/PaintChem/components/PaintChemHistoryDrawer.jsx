// PaintChemHistoryDrawer.jsx — History table with date filter, OOR summary, and Batch Print for Audits
import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Search, ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2,
  Clock, FileText, Printer, CheckSquare, Square, Calendar, Eye, X
} from 'lucide-react';

const API_BASE = `${import.meta.env.BASE_URL}api/paintChem`.replace(/\/$/, '');

function StatusBadge({ status }) {
  const map = {
    DRAFT:     { cls: 'bg-gray-100 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300', label: 'ร่าง' },
    SUBMITTED: { cls: 'bg-green-100 text-green-700 dark:text-green-400', label: 'สมบูรณ์' },
    APPROVED:  { cls: 'bg-green-100 text-green-700 dark:text-green-400', label: 'อนุมัติแล้ว' },
  };
  const s = map[status] ?? { cls: 'bg-gray-100 dark:bg-gray-700/50 text-gray-500 dark:text-gray-400', label: status };
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${s.cls}`}>{s.label}</span>;
}

export default function PaintChemHistoryDrawer({ isOpen, onClose, onSelectRecord }) {
  const [dateFrom, setDateFrom] = useState('2026-10-01');
  const [dateTo,   setDateTo]   = useState(new Date().toISOString().slice(0, 10));
  const [shift,    setShift]    = useState('');
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [data,     setData]     = useState({ items: [], total: 0, total_pages: 1 });
  const [loading,  setLoading]  = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/get_history.php`, {
        params: { date_from: dateFrom, date_to: dateTo, shift, page, page_size: pageSize },
      });
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch {
      // silently fail — user can retry
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setSelectedIds([]);
      fetchHistory();
    }
  }, [isOpen, page, pageSize]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = () => {
    setPage(1);
    setSelectedIds([]);
    fetchHistory();
  };

  const handleSetPreset = (preset) => {
    const today = new Date().toISOString().slice(0, 10);
    if (preset === 'THIS_MONTH') {
      setDateFrom('2026-10-01');
      setDateTo('2026-10-31');
    } else if (preset === '7_DAYS') {
      const d7 = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
      setDateFrom(d7);
      setDateTo(today);
    } else if (preset === '30_DAYS') {
      const d30 = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      setDateFrom(d30);
      setDateTo(today);
    }
  };

  const isAllSelected = data.items.length > 0 && selectedIds.length === data.items.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(data.items.map((i) => i.header_id));
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBatchPrintSelected = () => {
    if (selectedIds.length === 0) return;
    const url = `${API_BASE}/export_pdf.php?batch=1&header_ids=${selectedIds.join(',')}&t=${Date.now()}`;
    window.open(url, '_blank');
  };

  const handleBatchPrintAll = () => {
    const url = `${API_BASE}/export_pdf.php?batch=1&start_date=${dateFrom}&end_date=${dateTo}&shift=${shift}&t=${Date.now()}`;
    window.open(url, '_blank');
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed top-16 bottom-0 left-0 right-0 bg-black/40 z-40 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>
      )}
      <div
        className={`fixed top-16 md:top-0 bottom-0 right-0 z-[60] w-full max-w-5xl bg-gray-50 dark:bg-gray-700/30 shadow-2xl transform transition-transform duration-300 ease-in-out flex flex-col ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
              <Calendar size={20} className="text-blue-600" />
              ประวัติและพิมพ์ชุดเอกสารเคมีสี — PAINT Line
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400">ค้นหาย้อนหลังและพิมพ์เอกสารตรวจสอบสำหรับออดิท (Audit)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar w-full max-w-full">
          <div className="w-full">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-4 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">ช่วงเวลาด่วน:</span>
                <div className="flex gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => handleSetPreset('THIS_MONTH')}
                    className="text-xs px-2.5 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-md transition-colors font-medium"
                  >
                    เดือนนี้ (ต.ค. 2026)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('7_DAYS')}
                    className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    7 วันล่าสุด
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSetPreset('30_DAYS')}
                    className="text-xs px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 rounded-md transition-colors"
                  >
                    30 วันล่าสุด
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">จากวันที่</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">ถึงวันที่</label>
                  <input
                    type="date"
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">กะ</label>
                  <select
                    className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1.5 text-sm bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100"
                    value={shift}
                    onChange={(e) => setShift(e.target.value)}
                  >
                    <option value="">ทั้งหมด</option>
                    <option value="DAY">กลางวัน</option>
                    <option value="NIGHT">กลางคืน</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleSearch}
                    className="w-full flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-1.5 rounded transition-colors"
                  >
                    <Search size={14} /> ค้นหา
                  </button>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={handleBatchPrintAll}
                    disabled={data.total === 0}
                    className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-medium py-1.5 rounded transition-colors shadow-sm"
                    title="พิมพ์ทุกใบที่อยู่ในช่วงวันที่ค้นหา"
                  >
                    <Printer size={15} /> พิมพ์ทั้งช่วงวันที่ ({data.total})
                  </button>
                </div>
              </div>
            </div>

            {/* Batch Action Bar (เมื่อมีการเลือกรายการ) */}
            {selectedIds.length > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/40 border border-blue-200 dark:border-blue-700 rounded-xl p-3 mb-4 flex items-center justify-between flex-wrap gap-3 animate-fade-in shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                    {selectedIds.length}
                  </span>
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    เลือกไว้ {selectedIds.length} จากทั้งหมด {data.items.length} รายการ
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedIds([])}
                    className="text-xs px-3 py-1.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200/60 dark:hover:bg-gray-700 rounded-lg transition-colors font-medium"
                  >
                    ยกเลิกการเลือก
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchPrintSelected}
                    className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-1.5 rounded-lg transition-colors shadow"
                  >
                    <Printer size={16} /> พิมพ์ชุดเอกสารที่เลือก ({selectedIds.length} ใบ)
                  </button>
                </div>
              </div>
            )}

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500">
                  กำลังโหลดข้อมูล...
                </div>
              ) : data.items.length === 0 ? (
                <div className="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500 text-sm">
                  ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead className="bg-gray-50 dark:bg-gray-700/30 border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="px-3 py-3 w-10 text-center">
                          <button
                            type="button"
                            onClick={handleToggleSelectAll}
                            className="text-gray-500 hover:text-blue-600"
                            title={isAllSelected ? 'ยกเลิกการเลือกทั้งหมด' : 'เลือกทั้งหมด'}
                          >
                            {isAllSelected ? (
                              <CheckSquare size={18} className="text-blue-600" />
                            ) : (
                              <Square size={18} />
                            )}
                          </button>
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          วันที่
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          กะ
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          สถานะ
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          OOR
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          รายการทั้งหมด
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          ผู้เตรียม
                        </th>
                        <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          อัปเดต
                        </th>
                        <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">
                          จัดการ
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {data.items.map((row) => {
                        const isSelected = selectedIds.includes(row.header_id);
                        return (
                          <tr
                            key={row.header_id}
                            className={`transition-colors cursor-pointer ${
                              isSelected
                                ? 'bg-blue-50/70 dark:bg-blue-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => handleToggleRow(row.header_id)}
                          >
                            <td
                              className="px-3 py-3 text-center"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleRow(row.header_id);
                              }}
                            >
                              <button type="button" className="text-gray-400 hover:text-blue-600">
                                {isSelected ? (
                                  <CheckSquare size={18} className="text-blue-600" />
                                ) : (
                                  <Square size={18} />
                                )}
                              </button>
                            </td>
                            <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-100">
                              {row.log_date}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  row.shift === 'DAY'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-indigo-100 text-indigo-700'
                                }`}
                              >
                                {row.shift === 'DAY' ? '☀ กลางวัน' : '🌙 กลางคืน'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="px-4 py-3 text-right">
                              {row.oor_count > 0 ? (
                                <span className="flex items-center justify-end gap-1 text-red-600 dark:text-red-400 font-semibold">
                                  <AlertTriangle size={12} /> {row.oor_count}
                                </span>
                              ) : (
                                <span className="flex items-center justify-end gap-1 text-green-600">
                                  <CheckCircle2 size={12} /> 0
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-right text-gray-600 dark:text-gray-300">
                              {row.total_entries}
                            </td>
                            <td className="px-4 py-3 text-gray-600 dark:text-gray-300 text-xs">
                              {row.prepared_by_name ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-gray-400 dark:text-gray-500 text-xs">
                              <span className="flex items-center gap-1">
                                <Clock size={11} />
                                {row.updated_at?.slice(0, 16)}
                              </span>
                            </td>
                            <td
                              className="px-4 py-3 text-right"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <button
                                onClick={() =>
                                  onSelectRecord && onSelectRecord(row.log_date, row.shift)
                                }
                                className="inline-flex items-center justify-center p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded transition-colors mr-2"
                                title="ดู/แก้ไขข้อมูลในหน้าจอ"
                              >
                                <Eye size={16} />
                              </button>
                              <a
                                href={`${API_BASE}/export_pdf.php?date=${row.log_date}&shift=${row.shift}&t=${Date.now()}`}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center justify-center p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                                title="พิมพ์ใบนี้ (PDF)"
                              >
                                <FileText size={16} />
                              </a>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {data.total_pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {data.total} รายการ — หน้า {data.page} / {data.total_pages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:border-blue-400 transition-colors"
                    >
                      <ChevronLeft size={14} />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(data.total_pages, p + 1))}
                      disabled={page === data.total_pages}
                      className="p-1.5 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-40 hover:border-blue-400 transition-colors"
                    >
                      <ChevronRight size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

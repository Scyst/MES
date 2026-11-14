import React, { useState } from 'react';
import { FileCheck2, Printer, Search } from 'lucide-react';
import { loadingReportApi } from '../../../shared/services/loadingApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import CtpatPrintPreviewModal from './CtpatPrintPreviewModal';

/**
 * Completed C-TPAT Document Search & Official Print Viewer (replaces internal Customer Portal lookup).
 */
export default function CompletedTrackingTab({ onSelectJob }) {
  const toast = useToast();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [printReportId, setPrintReportId] = useState(null);

  const handleSearch = async (e) => {
    e.preventDefault();
    const q = keyword.trim();
    if (!q) {
      toast.warning('กรุณากรอกเลข PO, Invoice, Booking หรือเบอร์ตู้คอนเทนเนอร์');
      return;
    }
    setSearching(true);
    setHasSearched(true);
    try {
      const res = await loadingReportApi.searchCompleted(q);
      setResults(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error(err.message || 'ค้นหาเอกสารไม่สำเร็จ');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleSearch}
        className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3"
      >
        <div className="flex items-center gap-2.5">
          <FileCheck2 className="h-5 w-5 text-orange-600" />
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white">
              ค้นหาเอกสาร C-TPAT ที่ตรวจสอบเสร็จสมบูรณ์แล้ว (Completed Document Tracking)
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ค้นหาด้วย PO Number, SNC CI No., Booking No. หรือเบอร์ตู้คอนเทนเนอร์ (สูงสุด 25 รายการล่าสุด)
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="ระบุ PO, SNC CI, Booking, Container No..."
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm focus:border-orange-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>
          <button
            type="submit"
            disabled={searching}
            className="min-h-[44px] rounded-xl bg-orange-600 px-6 text-xs font-semibold text-white hover:bg-orange-700 disabled:opacity-50"
          >
            {searching ? 'กำลังค้นหา...' : 'ค้นหาเอกสาร'}
          </button>
        </div>
      </form>

      {hasSearched && (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {results.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              ไม่พบเอกสาร C-TPAT สถานะ COMPLETED ที่ตรงกับ "{keyword}"
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-3 text-left font-semibold">PO Number</th>
                    <th className="px-4 py-3 text-left font-semibold">SNC CI / Booking</th>
                    <th className="px-4 py-3 text-left font-semibold">Container / Seal</th>
                    <th className="px-4 py-3 text-left font-semibold">Loading Time</th>
                    <th className="px-4 py-3 text-right font-semibold">ดำเนินการ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {results.map((item) => (
                    <tr key={item.report_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">{item.po_number || '-'}</td>
                      <td className="px-4 py-3">
                        <div>CI: {item.snc_ci_no || '-'}</div>
                        <div className="text-[11px] text-slate-500">BKG: {item.booking_no || '-'}</div>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        <div>{item.container_no || '-'}</div>
                        <div className="text-[11px] text-slate-500">Seal: {item.seal_no || '-'}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {item.loading_start_time ? String(item.loading_start_time).slice(0, 16) : String(item.created_at || '').slice(0, 16)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => onSelectJob?.(item.so_id)}
                            className="min-h-[44px] rounded-xl border border-slate-300 px-3 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700"
                          >
                            เปิดรายละเอียด
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintReportId(item.report_id)}
                            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-600"
                          >
                            <Printer className="h-4 w-4" />
                            <span>พิมพ์ C-TPAT</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {printReportId && (
        <CtpatPrintPreviewModal
          reportId={printReportId}
          onClose={() => setPrintReportId(null)}
        />
      )}
    </div>
  );
}

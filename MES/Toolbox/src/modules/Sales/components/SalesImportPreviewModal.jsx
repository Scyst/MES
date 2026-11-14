import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import { salesOrdersApi, shippingApi } from '../../../shared/services/salesApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { formatDisplayDate } from '../utils/salesHelpers';

/**
 * Preview modal before batch-merging Excel/CSV Sales Orders or Shipping Schedule rows.
 */
export default function SalesImportPreviewModal({
  mode = 'sales',
  salesPreview,
  shippingRows,
  isOffline,
  onClose,
  onImported,
}) {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);

  const isSales = mode === 'sales';
  const rows = isSales ? salesPreview?.rows || [] : shippingRows || [];
  const warningCount = isSales
    ? rows.filter((r) => r.warnings && Object.keys(r.warnings).length > 0).length
    : 0;

  const handleConfirm = async () => {
    if (isOffline || submitting || rows.length === 0) return;
    setSubmitting(true);
    try {
      const res = isSales
        ? await salesOrdersApi.importJson(rows)
        : await shippingApi.importJson(rows);
      toast.success(res.message || `นำเข้าข้อมูลสำเร็จ ${rows.length} รายการ`);
      onImported?.(res);
      onClose();
    } catch (err) {
      toast.error(err.message || 'นำเข้าข้อมูลไม่สำเร็จ');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="ตรวจสอบข้อมูลก่อนนำเข้า"
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {isSales ? 'ตรวจสอบข้อมูลก่อนนำเข้า Sales Orders' : 'ตรวจสอบข้อมูลก่อนนำเข้า Shipping Schedule'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                พบ {rows.length} รายการพร้อมนำเข้า
                {isSales && salesPreview?.skippedCount > 0 && ` · ข้าม ${salesPreview.skippedCount} แถวที่ไม่สมบูรณ์`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-5 space-y-3">
          {warningCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                ตรวจพบวันที่ต่ำกว่าปี 2023 จำนวน {warningCount} รายการ (ไฮไลต์สีเหลือง) ระบบจะยังคงนำเข้าตามข้อมูลจริงในไฟล์ หากไม่ถูกต้องกรุณาแก้ไขใน Excel ก่อนยืนยัน
              </span>
            </div>
          )}

          {isSales && salesPreview?.errors?.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
              <p className="font-semibold mb-1">รายการที่ถูกข้าม:</p>
              <ul className="list-disc pl-4 space-y-0.5">
                {salesPreview.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
            <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
              <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                {isSales ? (
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold">PO Number</th>
                    <th className="px-3 py-2.5 text-left font-semibold">SKU</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Team</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Qty</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Order Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Prod Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Loading Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold">QA Input</th>
                  </tr>
                ) : (
                  <tr>
                    <th className="px-3 py-2.5 text-left font-semibold">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold">PO / Keys</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Booking / Container</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Loading Date</th>
                    <th className="px-3 py-2.5 text-left font-semibold">ETD / Team</th>
                  </tr>
                )}
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {rows.slice(0, 150).map((row, idx) => {
                  if (isSales) {
                    return (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2 text-slate-400">{row.row_index || idx + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{row.po_number}</td>
                        <td className="px-3 py-2 font-mono">{row.sku}</td>
                        <td className="px-3 py-2">{row.team || '-'}</td>
                        <td className="px-3 py-2 text-right font-mono">{row.quantity}</td>
                        <td className={`px-3 py-2 ${row.warnings?.order_date ? 'bg-amber-100 text-amber-900 font-semibold' : ''}`}>
                          {formatDisplayDate(row.order_date)}
                        </td>
                        <td className={`px-3 py-2 ${row.warnings?.production_date ? 'bg-amber-100 text-amber-900 font-semibold' : ''}`}>
                          {formatDisplayDate(row.production_date)}
                        </td>
                        <td className={`px-3 py-2 ${row.warnings?.loading_date ? 'bg-amber-100 text-amber-900 font-semibold' : ''}`}>
                          {formatDisplayDate(row.loading_date)}
                        </td>
                        <td className="px-3 py-2">{row.inspection_status || '-'}</td>
                      </tr>
                    );
                  }
                  const po = row['PO'] ?? row['po_number'] ?? row['PO Number'] ?? '-';
                  const booking = row['Booking No'] ?? row['booking_no'] ?? '-';
                  const container = row['Container No'] ?? row['container_no'] ?? '-';
                  const loadDt = row['Load Date'] ?? row['Loading Date'] ?? row['SNC Load Day'] ?? row['loading_date'] ?? '-';
                  const team = row['Team'] ?? row['team'] ?? '-';
                  return (
                    <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                      <td className="px-3 py-2 text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-semibold text-slate-900 dark:text-white">{String(po)}</td>
                      <td className="px-3 py-2">{String(booking)} / {String(container)}</td>
                      <td className="px-3 py-2">{String(loadDt)}</td>
                      <td className="px-3 py-2">{String(team)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > 150 && (
              <div className="bg-slate-50 px-4 py-2 text-center text-xs text-slate-500 dark:bg-slate-800">
                แสดงตัวอย่าง 150 แถวแรก จากทั้งหมด {rows.length} รายการ
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            ยกเลิก
          </button>
          <button
            type="button"
            disabled={submitting || isOffline || rows.length === 0}
            onClick={handleConfirm}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? <Upload className="h-4 w-4 animate-bounce" /> : <CheckCircle2 className="h-4 w-4" />}
            <span>{submitting ? 'กำลังนำเข้าข้อมูล...' : `ยืนยันนำเข้า ${rows.length} รายการ`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useRef, useState } from 'react';
import { CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { autoInvoiceApi } from '../../../shared/services/autoInvoiceApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { downloadInvoiceTemplateXlsx, formatDecimal, parseInvoiceExcelFile } from '../utils/invoiceHelpers';

/**
 * Multi-invoice batch Excel/CSV importer modal with template download and preview.
 */
export default function InvoiceImportModal({ isOffline, onClose, onImported }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [parsedList, setParsedList] = useState([]);
  const [remark, setRemark] = useState('Excel Batch Import');
  const [importing, setImporting] = useState(false);

  const handleSelectFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const list = await parseInvoiceExcelFile(file);
      setParsedList(list);
      toast.success(`อ่านข้อมูล Invoice สำเร็จ ${list.length} ฉบับ`);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถอ่านไฟล์ Excel ได้');
    }
  };

  const handleImportAll = async () => {
    if (isOffline || importing || parsedList.length === 0) return;
    setImporting(true);
    let okCount = 0;
    try {
      for (const inv of parsedList) {
        await autoInvoiceApi.importInvoice({
          invoice_no: inv.invoice_no,
          remark: remark.trim() || 'Excel Batch Import',
          customer: inv.customer,
          shipping: inv.shipping,
          details: inv.details,
        });
        okCount += 1;
      }
      toast.success(`นำเข้า Invoice สำเร็จทั้งหมด ${okCount} ฉบับ`);
      onImported?.();
      onClose();
    } catch (err) {
      toast.error(err.message || `นำเข้าได้ ${okCount} ฉบับก่อนเกิดข้อผิดพลาด`);
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="นำเข้า Invoice จาก Excel"
        className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                นำเข้าข้อมูล Auto Invoice จาก Excel / CSV
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                รองรับเทมเพลต 30 คอลัมน์ สามารถนำเข้าหลาย Invoice พร้อมกันในไฟล์เดียว
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100"
            aria-label="ปิดหน้าต่าง"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-5 space-y-4 text-xs">
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/40">
            <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleSelectFile} className="hidden" />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex min-h-[44px] items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <Upload className="h-4 w-4" />
              <span>เลือกไฟล์ Excel / CSV</span>
            </button>

            <button
              type="button"
              onClick={downloadInvoiceTemplateXlsx}
              className="flex min-h-[44px] items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              <Download className="h-4 w-4" />
              <span>ดาวน์โหลด Template 30 คอลัมน์</span>
            </button>

            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                placeholder="Remark สำหรับการนำเข้า"
                className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white px-3 dark:border-slate-700 dark:bg-slate-900"
              />
            </div>
          </div>

          {parsedList.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-4 py-2.5 text-left">Invoice No</th>
                    <th className="px-4 py-2.5 text-left">Customer</th>
                    <th className="px-4 py-2.5 text-left">ETD / Container</th>
                    <th className="px-4 py-2.5 text-right">Items</th>
                    <th className="px-4 py-2.5 text-right">Est. Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {parsedList.map((inv) => {
                    const est = (inv.details || []).reduce((s, d) => s + Number(d.qty || 0) * Number(d.price || 0), 0);
                    return (
                      <tr key={inv.invoice_no}>
                        <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">{inv.invoice_no}</td>
                        <td className="px-4 py-2.5">{inv.customer?.name || '-'}</td>
                        <td className="px-4 py-2.5">{inv.shipping?.etd_date || '-'} · {inv.shipping?.container_no || '-'}</td>
                        <td className="px-4 py-2.5 text-right">{inv.details?.length || 0}</td>
                        <td className="px-4 py-2.5 text-right font-mono">${formatDecimal(est, 2)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 px-5 py-4 sm:flex-row sm:justify-end dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-semibold dark:border-slate-700"
          >
            ปิด
          </button>
          <button
            type="button"
            disabled={importing || isOffline || parsedList.length === 0}
            onClick={handleImportAll}
            className="flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            <span>{importing ? 'กำลังนำเข้า...' : `ยืนยันนำเข้า ${parsedList.length} ฉบับ`}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

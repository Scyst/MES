import React, { useEffect, useState } from 'react';
import { History, Printer, X } from 'lucide-react';
import { autoInvoiceApi } from '../../../shared/services/autoInvoiceApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';

/**
 * Displays all historical versions (V1..Vn) of an invoice with quick CI/PL print launch.
 */
export default function InvoiceVersionModal({ invoiceNo, onPrintVersion, onClose }) {
  const toast = useToast();
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceNo) return;
    let active = true;
    setLoading(true);
    autoInvoiceApi
      .getVersions(invoiceNo)
      .then((res) => {
        if (active) setVersions(Array.isArray(res.data) ? res.data : []);
      })
      .catch((err) => {
        if (active) toast.error(err.message || 'ไม่สามารถโหลดประวัติเวอร์ชันได้');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invoiceNo, toast]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`ประวัติเวอร์ชัน ${invoiceNo}`}
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <History className="h-5 w-5 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                ประวัติเวอร์ชัน: {invoiceNo}
              </h3>
              <p className="text-xs text-slate-500">เลือกดูหรือพิมพ์เอกสารย้อนหลังได้ทุกเวอร์ชัน</p>
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

        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {loading ? (
            <div className="py-12 text-center text-sm text-slate-500">กำลังโหลดประวัติ...</div>
          ) : versions.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">ไม่พบประวัติเวอร์ชัน</div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
              <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
                <thead className="bg-slate-50 dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2.5 text-left">Ver.</th>
                    <th className="px-3 py-2.5 text-left">สถานะ</th>
                    <th className="px-3 py-2.5 text-right">Amount (USD)</th>
                    <th className="px-3 py-2.5 text-left">Remark</th>
                    <th className="px-3 py-2.5 text-left">วันที่บันทึก</th>
                    <th className="px-3 py-2.5 text-right">พิมพ์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {versions.map((v) => (
                    <tr key={v.id} className={v.is_active === 1 ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''}>
                      <td className="px-3 py-2.5 font-bold">
                        V{v.version} {v.is_active === 1 && <span className="ml-1 rounded bg-blue-600 px-1.5 py-0.5 text-[10px] text-white">Active</span>}
                      </td>
                      <td className="px-3 py-2.5">{v.doc_status}</td>
                      <td className="px-3 py-2.5 text-right font-mono">${v.total_amount}</td>
                      <td className="px-3 py-2.5">{v.remark}</td>
                      <td className="px-3 py-2.5 text-slate-500">{v.created_at}</td>
                      <td className="px-3 py-2.5 text-right">
                        <div className="inline-flex gap-1.5">
                          <button
                            type="button"
                            onClick={() => onPrintVersion?.(v.id, 'CI')}
                            className="flex min-h-[38px] items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-blue-600"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>CI</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => onPrintVersion?.(v.id, 'PL')}
                            className="flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[11px] font-semibold hover:bg-slate-50 dark:border-slate-600"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>PL</span>
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
      </div>
    </div>
  );
}

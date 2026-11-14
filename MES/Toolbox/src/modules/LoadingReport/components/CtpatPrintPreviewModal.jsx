import React, { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { getLoadingPhotoUrl, loadingReportApi } from '../../../shared/services/loadingApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import {
  CTPAT_CHECKLIST_SECTIONS,
  CTPAT_PHOTO_POINTS,
  mapContainerTypeForPrint,
} from '../utils/ctpatConfig';

/**
 * Official 2-Page A4 Printable C-TPAT Container Loading Report Preview.
 * Can load directly from a `reportId`/`soId` or use an already-loaded `bundle`.
 */
export default function CtpatPrintPreviewModal({ reportId, soId, initialBundle = null, onClose }) {
  const toast = useToast();
  const [bundle, setBundle] = useState(initialBundle);
  const [loading, setLoading] = useState(!initialBundle);

  useEffect(() => {
    if (initialBundle) return;
    let active = true;
    setLoading(true);
    loadingReportApi
      .getReportDetail({ report_id: reportId || 0, so_id: soId || 0 })
      .then((res) => {
        if (active) setBundle(res.data || null);
      })
      .catch((err) => {
        if (active) toast.error(err.message || 'ไม่สามารถโหลดข้อมูลรายงานพิมพ์ได้');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [reportId, soId, initialBundle, toast]);

  const header = bundle?.header || {};
  const photos = bundle?.photos || {};
  const checklist = bundle?.checklist || {};

  const displayContainer = header.report_container || header.master_container || '-';
  const displaySeal = header.report_seal || header.master_seal || '-';
  const ctnType = mapContainerTypeForPrint(header.container_type || header.ctn_size);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/75 backdrop-blur-sm">
      <div className="print:hidden flex items-center justify-between border-b border-slate-700 bg-slate-900 px-5 py-3 text-white">
        <div>
          <h3 className="text-sm font-bold">รายงานตรวจสอบตู้คอนเทนเนอร์ (Official C-TPAT Report)</h3>
          <p className="text-xs text-slate-400">
            PO: {header.po_number || '-'} · Container: {displayContainer}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || !bundle}
            onClick={() => window.print()}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Printer className="h-4 w-4" />
            <span>พิมพ์ / Save PDF (A4)</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700"
            aria-label="ปิดหน้าต่างพิมพ์"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6">
        {loading ? (
          <div className="mx-auto max-w-4xl rounded-xl bg-white p-12 text-center text-sm text-slate-600">
            กำลังจัดเตรียมแบบฟอร์ม C-TPAT...
          </div>
        ) : !bundle ? (
          <div className="mx-auto max-w-4xl rounded-xl bg-white p-12 text-center text-sm text-red-600">
            ไม่พบข้อมูลรายงาน
          </div>
        ) : (
          <div className="mx-auto max-w-[900px] space-y-6 text-slate-900">
            {/* Page 1: Official 10-Point Checklist */}
            <div className="rounded-xl bg-white p-6 shadow-xl print:rounded-none print:shadow-none print:break-after-page">
              <div className="border-b-2 border-slate-900 pb-3 mb-4 flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-base font-extrabold tracking-tight">SNC FORMER PUBLIC COMPANY LIMITED</div>
                  <div className="text-xs font-bold text-slate-700">
                    CONTAINER SECURITY &amp; C-TPAT 10-POINT INSPECTION REPORT
                  </div>
                </div>
                <div className="text-right text-[11px]">
                  <div>Status: <strong>{header.status || 'DRAFT'}</strong></div>
                  <div>PO: <strong>{header.po_number || '-'}</strong></div>
                  <div>SNC CI: <strong>{header.snc_ci_no || '-'}</strong></div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 border border-slate-300 rounded-lg p-3 text-[11px] mb-4 sm:grid-cols-3">
                <div><strong>Booking No:</strong> {header.booking_no || '-'}</div>
                <div><strong>Container No:</strong> {displayContainer}</div>
                <div><strong>Size / Type:</strong> {ctnType || '-'}</div>
                <div><strong>Seal No:</strong> {displaySeal}</div>
                <div><strong>Cable Seal:</strong> {header.cable_seal || '-'}</div>
                <div><strong>Car License:</strong> {header.car_license || '-'}</div>
                <div><strong>Driver:</strong> {header.driver_name || '-'}</div>
                <div><strong>Inspector:</strong> {header.inspector_name || '-'}</div>
                <div><strong>Supervisor:</strong> {header.supervisor_name || '-'}</div>
                <div><strong>Location:</strong> {header.loading_location || '-'}</div>
                <div><strong>Start:</strong> {header.loading_start_time || '-'}</div>
                <div><strong>End:</strong> {header.loading_end_time || '-'}</div>
              </div>

              <div className="space-y-2.5 text-[10px]">
                {CTPAT_CHECKLIST_SECTIONS.map((sec) => (
                  <div key={sec.id} className="border border-slate-300 rounded">
                    <div className="bg-slate-100 px-2.5 py-1 font-bold text-slate-800 border-b border-slate-300">
                      {sec.id}. {sec.officialTitle || sec.title}
                    </div>
                    <table className="w-full border-collapse">
                      <tbody>
                        {sec.items.map((itemText, idx) => {
                          const entry = checklist?.[sec.id]?.[idx + 1] || {};
                          const res = entry.result || '-';
                          return (
                            <tr key={idx} className="border-t border-slate-200 first:border-t-0">
                              <td className="px-2.5 py-1">{sec.id}.{idx + 1} {itemText}</td>
                              <td className="w-16 px-2 py-1 text-center font-bold border-l border-slate-200">
                                {res}
                              </td>
                              <td className="w-36 px-2 py-1 text-slate-500 border-l border-slate-200">
                                {entry.remark || ''}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))}
              </div>
            </div>

            {/* Page 2: 16-Point Photo Evidence */}
            <div className="rounded-xl bg-white p-6 shadow-xl print:rounded-none print:shadow-none">
              <div className="border-b-2 border-slate-900 pb-2 mb-4 flex items-center justify-between">
                <div className="text-sm font-extrabold">C-TPAT LOADING PHOTOGRAPHIC EVIDENCE (16 POINTS)</div>
                <div className="text-xs">PO: {header.po_number || '-'} · Container: {displayContainer}</div>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {CTPAT_PHOTO_POINTS.map((pt) => {
                  const fn = photos?.[pt.key];
                  return (
                    <div key={pt.key} className="border border-slate-300 rounded overflow-hidden">
                      <div className="bg-slate-100 px-2 py-1 text-[10px] font-bold truncate border-b border-slate-300">
                        {pt.label}
                      </div>
                      <div className="aspect-[4/3] bg-slate-50 flex items-center justify-center">
                        {fn ? (
                          <img src={getLoadingPhotoUrl(fn)} alt={pt.label} className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-[10px] text-slate-400">No Photo</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

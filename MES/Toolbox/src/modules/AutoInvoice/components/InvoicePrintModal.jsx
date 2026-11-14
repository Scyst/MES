import React, { useEffect, useState } from 'react';
import { Printer, X } from 'lucide-react';
import { autoInvoiceApi, getCompanyStampUrl } from '../../../shared/services/autoInvoiceApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import {
  ceilCbm,
  formatDecimal,
  formatEnglishDocDate,
  numberToWordsUsd,
  parseStarBoldSegments,
} from '../utils/invoiceHelpers';

function RichBoldText({ text }) {
  const lines = parseStarBoldSegments(text);
  return (
    <>
      {lines.map((segments, li) => (
        <div key={li}>
          {segments.map((seg, si) =>
            seg.bold ? <strong key={si}>{seg.text}</strong> : <span key={si}>{seg.text}</span>,
          )}
        </div>
      ))}
    </>
  );
}

/**
 * Official A4 Commercial Invoice (CI) & Packing List (PL) Printable Preview Modal.
 */
export default function InvoicePrintModal({ invoiceId, initialDocType = 'CI', onClose }) {
  const toast = useToast();
  const [docType, setDocType] = useState(initialDocType === 'PL' ? 'PL' : 'CI');
  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    let active = true;
    setLoading(true);
    autoInvoiceApi
      .getDetail(invoiceId)
      .then((res) => {
        if (active) setBundle(res.data || null);
      })
      .catch((err) => {
        if (active) toast.error(err.message || 'ไม่สามารถโหลดเอกสารพิมพ์ได้');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [invoiceId, toast]);

  const header = bundle?.header || {};
  const customer = bundle?.customer || {};
  const shipping = bundle?.shipping || {};
  const details = Array.isArray(bundle?.details) ? bundle.details : [];

  const qDec = bundle?.qty_decimals ?? 0;
  const pDec = bundle?.price_decimals ?? 4;
  const aDec = bundle?.amount_decimals ?? 2;
  const wDec = bundle?.weight_decimals ?? 2;
  const cDec = bundle?.cbm_decimals ?? 2;

  const isCi = docType === 'CI';
  const totals = details.reduce(
    (acc, d) => {
      const qty = Number(d.qty_carton ?? d.qty ?? 0);
      const price = Number(d.unit_price ?? d.price ?? 0);
      const lineAmt = Number(d.line_total ?? qty * price);
      const nw = Number(d.net_weight ?? d.nw ?? 0);
      const gw = Number(d.gross_weight ?? d.gw ?? 0);
      const cbm = Number(d.cbm ?? 0);
      return {
        qty: acc.qty + qty,
        amount: acc.amount + lineAmt,
        nw: acc.nw + nw,
        gw: acc.gw + gw,
        cbm: acc.cbm + cbm,
      };
    },
    { qty: 0, amount: 0, nw: 0, gw: 0, cbm: 0 },
  );

  const distinctProductTypes = Array.from(new Set(details.map((d) => d.product_type).filter(Boolean))).join(', ');

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/80 backdrop-blur-sm">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-2 border-b border-slate-700 bg-slate-900 px-5 py-3 text-white">
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold">
            {header.invoice_no || 'Invoice'} (V{header.version || 1})
          </span>
          <div className="inline-flex rounded-xl bg-slate-800 p-1">
            <button
              type="button"
              onClick={() => setDocType('CI')}
              className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold ${
                isCi ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Commercial Invoice (CI)
            </button>
            <button
              type="button"
              onClick={() => setDocType('PL')}
              className={`min-h-[38px] rounded-lg px-3 text-xs font-semibold ${
                !isCi ? 'bg-blue-600 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              Packing List (PL)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={loading || !bundle}
            onClick={() => window.print()}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
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
            กำลังจัดเตรียมเอกสาร {docType}...
          </div>
        ) : !bundle ? (
          <div className="mx-auto max-w-4xl rounded-xl bg-white p-12 text-center text-sm text-red-600">
            ไม่พบข้อมูลเอกสาร
          </div>
        ) : (
          <div className="mx-auto max-w-[820px] rounded-xl bg-white p-8 text-[11px] leading-snug text-slate-900 shadow-2xl print:rounded-none print:p-2 print:shadow-none">
            <div className="border-b-2 border-slate-900 pb-3 text-center">
              <div className="text-base font-extrabold tracking-wide">
                SNC FORMER PUBLIC COMPANY LIMITED
              </div>
              <div className="text-[10px] text-slate-700">
                333/3 MOO 6, BANGPRIENG, BANGBO, SAMUTPRAKARN 10560 THAILAND
              </div>
              <div className="mt-2 text-lg font-extrabold tracking-wider underline">
                {isCi ? 'COMMERCIAL INVOICE' : 'PACKING LIST'}
              </div>
            </div>

            <div className="mt-4 grid grid-cols-12 gap-4 border border-slate-400 p-3">
              <div className="col-span-7 space-y-2 border-r border-slate-300 pr-3">
                <div>
                  <div className="font-bold text-slate-700">MESSRS / CUSTOMER:</div>
                  <div className="font-bold">{customer.name || '-'}</div>
                  <RichBoldText text={customer.address || '-'} />
                </div>
                <div>
                  <div className="font-bold text-slate-700">CONSIGNEE:</div>
                  <RichBoldText text={customer.consignee || 'SAME AS CONSIGNEE'} />
                </div>
                <div>
                  <div className="font-bold text-slate-700">NOTIFY PARTY:</div>
                  <RichBoldText text={customer.notify_party || 'SAME AS CONSIGNEE'} />
                </div>
              </div>

              <div className="col-span-5 space-y-1">
                <div><strong>INVOICE NO.:</strong> {header.invoice_no || '-'}</div>
                <div><strong>DATE:</strong> {formatEnglishDocDate(shipping.invoice_date)}</div>
                <div><strong>PAYMENT TERMS:</strong> {customer.payment_terms || '-'}</div>
                <div><strong>INCOTERMS:</strong> {customer.incoterms || '-'}</div>
                <div><strong>PORT OF LOADING:</strong> {shipping.port_loading || '-'}</div>
                <div><strong>PORT OF DISCHARGE:</strong> {shipping.port_discharge || '-'}</div>
                <div><strong>FEEDER VESSEL:</strong> {shipping.feeder_vessel || '-'}</div>
                <div><strong>MOTHER VESSEL:</strong> {shipping.mother_vessel || '-'}</div>
                <div><strong>ETD / ETA:</strong> {formatEnglishDocDate(shipping.etd_date)} / {formatEnglishDocDate(shipping.eta_date)}</div>
                <div><strong>CONTAINER QTY:</strong> {shipping.container_qty || '-'}</div>
                <div><strong>CONTAINER / SEAL:</strong> {shipping.container_no || '-'} / {shipping.seal_no || '-'}</div>
              </div>
            </div>

            {distinctProductTypes && (
              <div className="mt-3 text-[10px]">
                <strong>DESCRIPTION OF GOODS:</strong> {distinctProductTypes}
              </div>
            )}

            <table className="mt-3 w-full border-collapse border border-slate-500 text-[10px]">
              <thead>
                <tr className="bg-slate-100">
                  <th className="border border-slate-400 px-1.5 py-1.5 text-center">MARKS &amp; NOS.</th>
                  <th className="border border-slate-400 px-1.5 py-1.5 text-left">PO NO.</th>
                  <th className="border border-slate-400 px-1.5 py-1.5 text-left">SKU / DESCRIPTION</th>
                  {!isCi && <th className="border border-slate-400 px-1.5 py-1.5 text-center">CARTON</th>}
                  <th className="border border-slate-400 px-1.5 py-1.5 text-right">QTY (PCS/CTN)</th>
                  {isCi ? (
                    <>
                      <th className="border border-slate-400 px-1.5 py-1.5 text-right">UNIT PRICE (USD)</th>
                      <th className="border border-slate-400 px-1.5 py-1.5 text-right">AMOUNT (USD)</th>
                    </>
                  ) : (
                    <>
                      <th className="border border-slate-400 px-1.5 py-1.5 text-right">N.W. (KGS)</th>
                      <th className="border border-slate-400 px-1.5 py-1.5 text-right">G.W. (KGS)</th>
                      <th className="border border-slate-400 px-1.5 py-1.5 text-right">CBM</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {details.map((d, idx) => {
                  const qty = Number(d.qty_carton ?? d.qty ?? 0);
                  const price = Number(d.unit_price ?? d.price ?? 0);
                  const lineAmt = Number(d.line_total ?? qty * price);
                  const nw = Number(d.net_weight ?? d.nw ?? 0);
                  const gw = Number(d.gross_weight ?? d.gw ?? 0);
                  const cbm = Number(d.cbm ?? 0);

                  return (
                    <tr key={idx}>
                      <td className="border border-slate-300 px-1.5 py-1 align-top">
                        <RichBoldText text={d.shipping_marks ?? d.marks ?? 'N/M'} />
                      </td>
                      <td className="border border-slate-300 px-1.5 py-1 align-top">{d.po_number ?? d.po ?? '-'}</td>
                      <td className="border border-slate-300 px-1.5 py-1 align-top">
                        <div className="font-semibold">{d.sku || '-'}</div>
                        <div>{d.description || '-'}</div>
                      </td>
                      {!isCi && (
                        <td className="border border-slate-300 px-1.5 py-1 text-center align-top">
                          {d.carton_no ?? d.carton ?? '-'}
                        </td>
                      )}
                      <td className="border border-slate-300 px-1.5 py-1 text-right font-mono align-top">
                        {formatDecimal(qty, qDec)}
                      </td>
                      {isCi ? (
                        <>
                          <td className="border border-slate-300 px-1.5 py-1 text-right font-mono align-top">
                            {formatDecimal(price, pDec)}
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-right font-mono align-top">
                            {formatDecimal(lineAmt, aDec)}
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="border border-slate-300 px-1.5 py-1 text-right font-mono align-top">
                            {formatDecimal(nw, wDec)}
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-right font-mono align-top">
                            {formatDecimal(gw, wDec)}
                          </td>
                          <td className="border border-slate-300 px-1.5 py-1 text-right font-mono align-top">
                            {formatDecimal(cbm, cDec)}
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan={isCi ? 3 : 4} className="border border-slate-400 px-2 py-1.5 text-right">
                    TOTAL
                  </td>
                  <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono">
                    {formatDecimal(totals.qty, qDec)}
                  </td>
                  {isCi ? (
                    <>
                      <td className="border border-slate-400 px-1.5 py-1.5" />
                      <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono">
                        {formatDecimal(totals.amount, aDec)}
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono">
                        {formatDecimal(totals.nw, wDec)}
                      </td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono">
                        {formatDecimal(totals.gw, wDec)}
                      </td>
                      <td className="border border-slate-400 px-1.5 py-1.5 text-right font-mono">
                        {formatDecimal(ceilCbm(totals.cbm, cDec), cDec)}
                      </td>
                    </>
                  )}
                </tr>
              </tfoot>
            </table>

            {isCi && (
              <div className="mt-3 font-bold">
                TOTAL SAY USD: {numberToWordsUsd(totals.amount)} ONLY
              </div>
            )}

            <div className="mt-8 flex items-end justify-between">
              <div className="text-[10px] text-slate-600">
                <div>COUNTRY OF ORIGIN: THAILAND</div>
                <div>BOOKING NO.: {shipping.booking_no || '-'}</div>
              </div>
              <div className="text-center">
                <div className="font-bold">SNC FORMER PUBLIC COMPANY LIMITED</div>
                <img
                  src={getCompanyStampUrl()}
                  alt="Company Stamp"
                  className="mx-auto my-2 h-20 w-auto object-contain opacity-90"
                />
                <div className="border-t border-slate-800 pt-1 text-[10px] font-semibold">
                  AUTHORIZED SIGNATURE
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

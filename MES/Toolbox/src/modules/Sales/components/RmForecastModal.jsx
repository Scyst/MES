import React, { useCallback, useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Download, HelpCircle, PackageSearch, RefreshCw, X } from 'lucide-react';
import { salesOrdersApi } from '../../../shared/services/salesApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { downloadXlsxSheet, formatInt } from '../utils/salesHelpers';

/**
 * Sequential RM allocation simulator using live PRODUCT_BOM & INVENTORY_ONHAND (STORE locations).
 */
export default function RmForecastModal({ startDate, endDate, dateType, onClose }) {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('summary');
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState([]);

  const fetchForecast = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesOrdersApi.forecastRm({
        start_date: startDate || '',
        end_date: endDate || '',
        date_type: dateType || 'loading_date',
      });
      setOrders(Array.isArray(res.data) ? res.data : []);
      setSummary(Array.isArray(res.summary) ? res.summary : []);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถคำนวณพยากรณ์วัตถุดิบได้');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, dateType, toast]);

  useEffect(() => {
    fetchForecast();
  }, [fetchForecast]);

  const shortageOrders = orders.filter((o) => o.status === 'SHORTAGE');
  const readyOrders = orders.filter((o) => o.status === 'READY');
  const missingBomOrders = orders.filter((o) => o.status === 'MISSING_BOM');

  const handleExportSummary = async () => {
    if (summary.length === 0) {
      toast.info('ไม่มีรายการวัตถุดิบขาดแคลนสำหรับส่งออก');
      return;
    }
    try {
      await downloadXlsxSheet(
        summary.map((item) => ({
          'SAP Code': item.sap_no,
          'Material Description': item.part_description,
          'Store On-Hand': item.available_in_store,
          'Total Shortage Qty': item.total_shortage,
        })),
        'RM_Shortage_Summary',
        `RM_Shortage_Forecast_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success('ส่งออกรายงาน RM Shortage เรียบร้อย');
    } catch (err) {
      toast.error(err.message || 'ส่งออก Excel ไม่สำเร็จ');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-3 sm:p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="พยากรณ์วัตถุดิบขาดแคลน (RM Shortage Forecast)"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
              <PackageSearch className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                วิเคราะห์และพยากรณ์วัตถุดิบขาดแคลน (RM Shortage Forecast)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                จำลองการตัดจองสต็อกคลัง STORE ตามลำดับคิว PO จากสูตร PRODUCT_BOM (รหัสวัตถุดิบ 10% / 20%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportSummary}
              disabled={loading || summary.length === 0}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
            <button
              type="button"
              onClick={fetchForecast}
              disabled={loading}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="คำนวณใหม่"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              aria-label="ปิดหน้าต่าง"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-800/40">
          {[
            { key: 'summary', label: `สรุปวัตถุดิบขาด (${summary.length})`, badge: 'bg-red-100 text-red-700' },
            { key: 'shortage', label: `PO วัตถุดิบไม่พอ (${shortageOrders.length})`, badge: 'bg-amber-100 text-amber-700' },
            { key: 'ready', label: `PO พร้อมผลิต (${readyOrders.length})`, badge: 'bg-emerald-100 text-emerald-700' },
            { key: 'missing_bom', label: `ไม่พบสูตร BOM (${missingBomOrders.length})`, badge: 'bg-slate-200 text-slate-700' },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={`min-h-[44px] rounded-xl px-4 py-2 text-xs font-semibold transition ${
                tab === item.key
                  ? 'bg-slate-900 text-white dark:bg-blue-600'
                  : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4 sm:p-5">
          {loading ? (
            <div className="flex h-56 items-center justify-center text-sm text-slate-500">
              กำลังจำลองการจองวัตถุดิบจากคลัง STORE...
            </div>
          ) : (
            <>
              {tab === 'summary' && (
                summary.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-2 text-emerald-600">
                    <CheckCircle2 className="h-10 w-10" />
                    <p className="text-sm font-semibold">วัตถุดิบในคลัง STORE เพียงพอสำหรับแผนที่เลือกทั้งหมด</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                    <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
                      <thead className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        <tr>
                          <th className="px-4 py-3 text-left font-semibold">SAP Material</th>
                          <th className="px-4 py-3 text-left font-semibold">รายละเอียดวัตถุดิบ</th>
                          <th className="px-4 py-3 text-right font-semibold">สต็อกในคลัง STORE</th>
                          <th className="px-4 py-3 text-right font-semibold text-red-600">ยอดขาดสะสมรวม (Shortage)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {summary.map((row) => (
                          <tr key={row.sap_no} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                            <td className="px-4 py-2.5 font-mono font-bold text-slate-900 dark:text-white">{row.sap_no}</td>
                            <td className="px-4 py-2.5">{row.part_description}</td>
                            <td className="px-4 py-2.5 text-right font-mono">{Number(row.available_in_store || 0).toLocaleString('en-US', { maximumFractionDigits: 3 })}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold text-red-600 dark:text-red-400">
                              {Number(row.total_shortage || 0).toLocaleString('en-US', { maximumFractionDigits: 3 })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}

              {tab === 'shortage' && (
                shortageOrders.length === 0 ? (
                  <p className="py-12 text-center text-sm text-slate-500">ไม่มี PO ที่วัตถุดิบขาดแคลน</p>
                ) : (
                  <div className="space-y-3">
                    {shortageOrders.map((po) => (
                      <div key={po.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 dark:border-amber-800/60 dark:bg-amber-950/20">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-amber-600" />
                            <span className="font-bold text-slate-900 dark:text-white">PO: {po.po_number}</span>
                            <span className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs dark:bg-slate-700">{po.sku}</span>
                          </div>
                          <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Qty: {formatInt(po.quantity)}</span>
                        </div>
                        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
                          <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
                            <thead className="bg-slate-50 dark:bg-slate-800">
                              <tr>
                                <th className="px-3 py-2 text-left">SAP</th>
                                <th className="px-3 py-2 text-left">รายการ</th>
                                <th className="px-3 py-2 text-right">ต้องใช้</th>
                                <th className="px-3 py-2 text-right">คงเหลือ</th>
                                <th className="px-3 py-2 text-right text-red-600">ขาด</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {(po.shortages || []).map((s, idx) => (
                                <tr key={idx}>
                                  <td className="px-3 py-1.5 font-mono font-semibold">{s.sap_no}</td>
                                  <td className="px-3 py-1.5">{s.part_description}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{s.required}</td>
                                  <td className="px-3 py-1.5 text-right font-mono">{s.available}</td>
                                  <td className="px-3 py-1.5 text-right font-mono font-bold text-red-600">{s.shortage}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}

              {tab === 'ready' && (
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
                  <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-700">
                    <thead className="bg-slate-50 dark:bg-slate-800">
                      <tr>
                        <th className="px-4 py-2.5 text-left">PO Number</th>
                        <th className="px-4 py-2.5 text-left">SKU</th>
                        <th className="px-4 py-2.5 text-right">Quantity</th>
                        <th className="px-4 py-2.5 text-center">สถานะ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {readyOrders.map((po) => (
                        <tr key={po.id}>
                          <td className="px-4 py-2 font-semibold">{po.po_number}</td>
                          <td className="px-4 py-2 font-mono">{po.sku}</td>
                          <td className="px-4 py-2 text-right font-mono">{formatInt(po.quantity)}</td>
                          <td className="px-4 py-2 text-center">
                            <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              READY
                            </span>
                          </td>
                        </tr>
                      ))}
                      {readyOrders.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-500">ไม่มี PO ที่พร้อมผลิต</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              {tab === 'missing_bom' && (
                <div className="space-y-2">
                  {missingBomOrders.length === 0 ? (
                    <p className="py-12 text-center text-sm text-slate-500">ทุก SKU มีสูตร PRODUCT_BOM ครบถ้วน</p>
                  ) : (
                    missingBomOrders.map((po) => (
                      <div key={po.id} className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-xs dark:border-slate-700">
                        <div className="flex items-center gap-2">
                          <HelpCircle className="h-4 w-4 text-slate-400" />
                          <span className="font-bold">{po.po_number}</span>
                          <span className="font-mono text-slate-600 dark:text-slate-300">{po.sku}</span>
                        </div>
                        <span className="text-slate-500">{po.shortages?.[0]?.part_description || 'ไม่พบสูตร BOM'}</span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

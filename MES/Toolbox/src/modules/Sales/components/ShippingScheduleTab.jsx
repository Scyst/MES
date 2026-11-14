import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ExternalLink, RefreshCw, Search, ShieldAlert, Upload } from 'lucide-react';
import { shippingApi } from '../../../shared/services/salesApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import {
  downloadXlsxSheet,
  evaluateQaBadge,
  formatCurrencyThb,
  formatDisplayDate,
  formatInt,
  parseShippingImportFile,
} from '../utils/salesHelpers';
import SalesImportPreviewModal from './SalesImportPreviewModal';

/**
 * Full Container Shipping & Loading Schedule tab with 7-day priority KPI,
 * team filters, inline vessel/container/cut-off editing, and C-TPAT direct handoff.
 */
export default function ShippingScheduleTab({ isReadOnly, isOffline }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ total_all: 0, total_active: 0, wait_load: 0, next_7_days: 0 });
  const [totals, setTotals] = useState({ filtered_count: 0, filtered_qty: 0, filtered_cbm: 0, filtered_usd: 0 });

  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  const [shippingPreviewRows, setShippingPreviewRows] = useState(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const loadShipping = useCallback(async () => {
    setLoading(true);
    try {
      const res = await shippingApi.read({
        start_date: startDate,
        end_date: endDate,
        status: statusFilter,
        team: teamFilter,
        search: debouncedSearch,
        page,
        page_size: pageSize,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
      if (res.summary) setSummary(res.summary);
      if (res.totals) setTotals(res.totals);
      setTotalRows(Number(res.pagination?.total_rows || 0));
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดตารางโหลดตู้สินค้าได้');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, statusFilter, teamFilter, debouncedSearch, page, pageSize, toast]);

  useEffect(() => {
    loadShipping();
  }, [loadShipping]);

  const handleSaveCell = async (row, field, rawVal) => {
    if (isReadOnly || isOffline) return;
    const prev = row[field] ?? '';
    const nextVal = String(rawVal ?? '');
    if (field.includes('date') || field === 'etd' || field === 'si_vgm_cut_off') {
      if (String(prev).slice(0, 10) === nextVal) return;
    } else if (String(prev) === nextVal) {
      return;
    }

    if (field === 'inspection_result' && evaluateQaBadge(row).isFail) {
      toast.error('ไม่สามารถแก้ไขผลตรวจ QA ที่เป็น FAIL จากหน้านี้ได้ กรุณาเปิดตรวจรอบใหม่ใน iQMS');
      return;
    }

    try {
      await shippingApi.updateCell(row.id, field, nextVal);
      setRows((cur) => cur.map((r) => (r.id === row.id ? { ...r, [field]: nextVal } : r)));
      toast.success('บันทึกข้อมูลสำเร็จ');
    } catch (err) {
      toast.error(err.message || 'อัปเดตไม่สำเร็จ');
    }
  };

  const handleToggleCheck = async (row, field, checked) => {
    if (isReadOnly || isOffline) return;
    if (field === 'inspection_status' && evaluateQaBadge(row).isFail) {
      toast.error('ไม่สามารถแก้ผลตรวจ QA ที่เป็น FAIL จากหน้านี้ได้ กรุณาเปิดตรวจรอบใหม่ใน iQMS');
      return;
    }
    try {
      await shippingApi.updateCheck(row.id, field, checked ? 1 : 0);
      await loadShipping();
      toast.success('อัปเดตสถานะเรียบร้อย');
    } catch (err) {
      toast.error(err.message || 'อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const jsonRows = await parseShippingImportFile(file);
      setShippingPreviewRows(jsonRows);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถอ่านไฟล์ Shipping ได้');
    }
  };

  const handleExport = async () => {
    if (rows.length === 0) {
      toast.info('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }
    try {
      await downloadXlsxSheet(
        rows.map((r) => ({
          PO: r.po_number,
          SKU: r.sku,
          Description: r.description,
          Team: r.team,
          Qty: r.quantity,
          'Shipping Week': r.shipping_week,
          'QA Status': evaluateQaBadge(r).label,
          'Loading Date': formatDisplayDate(r.loading_date),
          'Load Time': r.load_time || '',
          ETD: formatDisplayDate(r.etd),
          DC: r.dc_location,
          'Booking No': r.booking_no,
          'SNC CI No': r.snc_ci_no,
          'Container Size': r.ctn_size,
          'Container No': r.container_no,
          'Seal No': r.seal_no,
          'N.W': r.net_weight,
          'G.W': r.gross_weight,
          CBM: r.cbm,
          'Feeder Vessel': r.feeder_vessel,
          'Mother Vessel': r.mother_vessel,
        })),
        'ShippingSchedule',
        `Shipping_Schedule_${new Date().toISOString().slice(0, 10)}.xlsx`,
      );
      toast.success('ส่งออก Shipping Schedule เรียบร้อย');
    } catch (err) {
      toast.error(err.message || 'ส่งออกไฟล์ไม่สำเร็จ');
    }
  };

  const kpis = [
    { key: 'ALL', label: 'ทั้งหมด (All)', value: summary.total_all },
    { key: 'ACTIVE', label: 'คิวรอโหลด (Active)', value: summary.total_active },
    { key: 'WAIT_LOAD', label: 'ผลิตเสร็จรอโหลด', value: summary.wait_load },
    { key: 'NEXT_7_DAYS', label: 'โหลดตู้ 7 วันข้างหน้า', value: summary.next_7_days },
  ];

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpis.map((k) => {
          const active = statusFilter === k.key;
          return (
            <button
              key={k.key}
              type="button"
              onClick={() => {
                setStatusFilter(k.key);
                setPage(1);
              }}
              className={`min-h-[72px] rounded-xl border bg-white p-3.5 text-left transition dark:bg-slate-900 ${
                active ? 'border-blue-600 ring-2 ring-blue-600' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{k.label}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{formatInt(k.value)}</div>
            </button>
          );
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600 dark:text-slate-300">
          <div className="flex flex-wrap items-center gap-4">
            <span>รายการ: <strong>{formatInt(totals.filtered_count)}</strong></span>
            <span>Qty: <strong>{formatInt(totals.filtered_qty)}</strong></span>
            <span>CBM: <strong>{Number(totals.filtered_cbm || 0).toFixed(2)}</strong></span>
            <span>มูลค่า: <strong className="text-emerald-600">${formatCurrencyThb(totals.filtered_usd)}</strong></span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleExport}
              className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
            >
              <Download className="h-4 w-4" />
              <span>Export Excel</span>
            </button>
            {!isReadOnly && (
              <>
                <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleImportFile} className="hidden" />
                <button
                  type="button"
                  disabled={isOffline}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import Shipping</span>
                </button>
              </>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-6">
          <div className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="ค้นหา PO, Booking, Container, CI, Invoice, DC..."
              className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs focus:border-blue-500 focus:bg-white focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-white"
            />
          </div>

          <select
            value={teamFilter}
            onChange={(e) => {
              setTeamFilter(e.target.value);
              setPage(1);
            }}
            aria-label="กรองทีม"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          >
            <option value="ALL">ทุกทีม (All Teams)</option>
            {['Team1', 'Team2', 'Team3', 'Team4', 'Team5', 'Team6'].map((tm) => (
              <option key={tm} value={tm}>{tm}</option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => {
              setStartDate(e.target.value);
              setPage(1);
            }}
            aria-label="วันโหลดตั้งแต่"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => {
              setEndDate(e.target.value);
              setPage(1);
            }}
            aria-label="วันโหลดถึง"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800 dark:text-white"
          />

          <button
            type="button"
            onClick={loadShipping}
            disabled={loading}
            className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">PO / SKU / Qty</th>
                <th className="px-3 py-3 text-left font-semibold">QA Inspection</th>
                <th className="px-3 py-3 text-left font-semibold">Load Date / Time / ETD</th>
                <th className="px-3 py-3 text-left font-semibold">Booking / CI / Invoice</th>
                <th className="px-3 py-3 text-left font-semibold">Container / Size / Seal</th>
                <th className="px-3 py-3 text-left font-semibold">N.W / G.W / CBM</th>
                <th className="px-3 py-3 text-left font-semibold">Vessel & Cut-Off</th>
                <th className="px-3 py-3 text-left font-semibold">Status & C-TPAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">กำลังโหลดข้อมูลตารางจัดส่ง...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-500">ไม่พบรายการโหลดสินค้า</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const qa = evaluateQaBadge(row);
                  return (
                    <tr
                      key={row.id}
                      className={qa.isFail ? 'bg-red-50/40 dark:bg-red-950/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                    >
                      <td className="px-3 py-2.5 align-top min-w-[165px] space-y-1">
                        <div className="font-bold text-slate-900 dark:text-white">{row.po_number || '-'}</div>
                        <div className="font-mono text-[11px] text-blue-700 dark:text-blue-400">
                          {row.sku} · Qty {formatInt(row.quantity)}
                        </div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{row.description}</div>
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium dark:bg-slate-800">{row.team || '-'}</span>
                          <span className="text-slate-400">{row.dc_location || ''}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[140px] space-y-1">
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold ${qa.badgeClass}`}>
                          {qa.isFail && <ShieldAlert className="h-3 w-3" />}
                          {qa.label}
                        </span>
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.inspect_type || ''}
                          onBlur={(e) => handleSaveCell(row, 'inspect_type', e.target.value)}
                          placeholder="Inspect Type"
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isReadOnly || isOffline || qa.isFail}
                            checked={qa.isPass}
                            onChange={(e) => handleToggleCheck(row, 'inspection_status', e.target.checked)}
                            className="h-4 w-4 rounded"
                          />
                          <span>ตรวจผ่าน</span>
                        </label>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[145px] space-y-1">
                        <input
                          type="date"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.loading_date ? String(row.loading_date).slice(0, 10) : ''}
                          onBlur={(e) => handleSaveCell(row, 'loading_date', e.target.value)}
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                        <div className="flex gap-1">
                          <input
                            type="text"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.load_time || ''}
                            onBlur={(e) => handleSaveCell(row, 'load_time', e.target.value)}
                            placeholder="Time"
                            className="w-1/2 rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                          />
                          <input
                            type="date"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.etd ? String(row.etd).slice(0, 10) : ''}
                            onBlur={(e) => handleSaveCell(row, 'etd', e.target.value)}
                            className="w-1/2 rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[160px] space-y-1">
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.booking_no || ''}
                          onBlur={(e) => handleSaveCell(row, 'booking_no', e.target.value)}
                          placeholder="Booking No."
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] font-semibold dark:border-slate-700"
                        />
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.snc_ci_no || ''}
                          onBlur={(e) => handleSaveCell(row, 'snc_ci_no', e.target.value)}
                          placeholder="SNC CI No."
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.invoice_no || ''}
                          onBlur={(e) => handleSaveCell(row, 'invoice_no', e.target.value)}
                          placeholder="Customer Inv."
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[160px] space-y-1">
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.container_no || ''}
                          onBlur={(e) => handleSaveCell(row, 'container_no', e.target.value)}
                          placeholder="Container No."
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] font-mono dark:border-slate-700"
                        />
                        <div className="flex gap-1">
                          <input
                            type="text"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.ctn_size || ''}
                            onBlur={(e) => handleSaveCell(row, 'ctn_size', e.target.value)}
                            placeholder="Size"
                            className="w-1/2 rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                          />
                          <input
                            type="text"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.seal_no || ''}
                            onBlur={(e) => handleSaveCell(row, 'seal_no', e.target.value)}
                            placeholder="Seal No."
                            className="w-1/2 rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                          />
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[125px] space-y-1">
                        <div className="grid grid-cols-3 gap-1">
                          <input
                            type="number"
                            step="0.01"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.net_weight ?? ''}
                            onBlur={(e) => handleSaveCell(row, 'net_weight', e.target.value)}
                            placeholder="N.W"
                            className="rounded border border-slate-200 bg-transparent px-1 py-0.5 text-[11px] dark:border-slate-700"
                          />
                          <input
                            type="number"
                            step="0.01"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.gross_weight ?? ''}
                            onBlur={(e) => handleSaveCell(row, 'gross_weight', e.target.value)}
                            placeholder="G.W"
                            className="rounded border border-slate-200 bg-transparent px-1 py-0.5 text-[11px] dark:border-slate-700"
                          />
                          <input
                            type="number"
                            step="0.01"
                            disabled={isReadOnly || isOffline}
                            defaultValue={row.cbm ?? ''}
                            onBlur={(e) => handleSaveCell(row, 'cbm', e.target.value)}
                            placeholder="CBM"
                            className="rounded border border-slate-200 bg-transparent px-1 py-0.5 text-[11px] dark:border-slate-700"
                          />
                        </div>
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.remark || ''}
                          onBlur={(e) => handleSaveCell(row, 'remark', e.target.value)}
                          placeholder="Remark"
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[155px] space-y-1">
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.feeder_vessel || ''}
                          onBlur={(e) => handleSaveCell(row, 'feeder_vessel', e.target.value)}
                          placeholder="Feeder Vessel"
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                        <input
                          type="text"
                          disabled={isReadOnly || isOffline}
                          defaultValue={row.mother_vessel || ''}
                          onBlur={(e) => handleSaveCell(row, 'mother_vessel', e.target.value)}
                          placeholder="Mother Vessel"
                          className="w-full rounded border border-slate-200 bg-transparent px-1.5 py-0.5 text-[11px] dark:border-slate-700"
                        />
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[140px] space-y-1.5">
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isReadOnly || isOffline}
                            checked={Number(row.is_production_done) === 1}
                            onChange={(e) => handleToggleCheck(row, 'is_production_done', e.target.checked)}
                            className="h-4 w-4 rounded"
                          />
                          <span>ผลิตเสร็จ</span>
                        </label>
                        <label className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                          <input
                            type="checkbox"
                            disabled={isReadOnly || isOffline}
                            checked={Number(row.is_loading_done) === 1}
                            onChange={(e) => handleToggleCheck(row, 'is_loading_done', e.target.checked)}
                            className="h-4 w-4 rounded"
                          />
                          <span>โหลดเสร็จ</span>
                        </label>
                        <Link
                          to={`/loading-report?so_id=${row.id}`}
                          className="inline-flex min-h-[36px] items-center gap-1 rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-700 hover:bg-orange-100 dark:bg-orange-950/40 dark:text-orange-300"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          <span>ตรวจ C-TPAT</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <span>หน้า {page} / {totalPages} (ทั้งหมด {formatInt(totalRows)} รายการ)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 font-medium disabled:opacity-40 dark:border-slate-700"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3.5 py-2 font-medium disabled:opacity-40 dark:border-slate-700"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {shippingPreviewRows && (
        <SalesImportPreviewModal
          mode="shipping"
          shippingRows={shippingPreviewRows}
          isOffline={isOffline}
          onClose={() => setShippingPreviewRows(null)}
          onImported={loadShipping}
        />
      )}
    </div>
  );
}

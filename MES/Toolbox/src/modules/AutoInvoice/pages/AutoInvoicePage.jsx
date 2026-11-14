import React, { useCallback, useEffect, useState } from 'react';
import {
  Download, Edit3, FileSpreadsheet, FileText, History, MessageSquare,
  Plus, Printer, RefreshCw, RotateCcw, Search, WifiOff, X,
} from 'lucide-react';
import { autoInvoiceApi } from '../../../shared/services/autoInvoiceApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import { downloadInvoiceTemplateXlsx, formatDecimal } from '../utils/invoiceHelpers';
import InvoiceEditModal from '../components/InvoiceEditModal';
import InvoiceImportModal from '../components/InvoiceImportModal';
import InvoiceVersionModal from '../components/InvoiceVersionModal';
import InvoicePrintModal from '../components/InvoicePrintModal';

const STATUS_BADGE = {
  Pending: 'bg-amber-100 text-amber-800 border-amber-200',
  Exported: 'bg-sky-100 text-sky-800 border-sky-200',
  Invoiced: 'bg-indigo-100 text-indigo-800 border-indigo-200',
  Paid: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Voided: 'bg-red-100 text-red-700 border-red-200',
};

/**
 * Self-contained Auto Invoice & Packing List Management Console (`#/auto-invoice`).
 */
export default function AutoInvoicePage() {
  const { user } = useAuth();
  const toast = useToast();
  const confirm = useConfirm();

  const [isOffline, setIsOffline] = useState(() => (typeof navigator !== 'undefined' ? !navigator.onLine : false));
  useEffect(() => {
    const onOnline = () => setIsOffline(false);
    const onOffline = () => setIsOffline(true);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const canManage =
    ['admin', 'creator', 'manager', 'planner'].includes(String(user?.role || '').toLowerCase()) ||
    (Array.isArray(user?.permissions) && user.permissions.includes('manage_invoice'));

  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState({ all: 0, pending: 0, exported: 0, invoiced: 0, paid: 0, voided: 0 });
  const [exchangeRate, setExchangeRate] = useState(32);

  const [dateType, setDateType] = useState('created_at');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(100);
  const [totalRows, setTotalRows] = useState(0);
  const [loading, setLoading] = useState(true);

  const [editTargetId, setEditTargetId] = useState(null);
  const [editOpen, setEditOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [versionInvNo, setVersionInvNo] = useState(null);
  const [printSpec, setPrintSpec] = useState(null);

  const [memoDialog, setMemoDialog] = useState(null);
  const [voidDialog, setVoidDialog] = useState(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    autoInvoiceApi
      .getExchangeRate()
      .then((res) => {
        const rate = Number(res?.data?.exchangeRate || 32);
        if (rate > 0) setExchangeRate(rate);
      })
      .catch(() => {});
  }, []);

  const loadHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await autoInvoiceApi.getHistory({
        date_type: dateType,
        start: startDate,
        end: endDate,
        status: statusFilter,
        search: debouncedSearch,
        page,
        page_size: pageSize,
      });
      setRows(Array.isArray(res.data) ? res.data : []);
      if (res.summary) setSummary(res.summary);
      setTotalRows(Number(res.pagination?.total_rows || 0));
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดประวัติ Invoice ได้');
    } finally {
      setLoading(false);
    }
  }, [dateType, startDate, endDate, statusFilter, debouncedSearch, page, pageSize, toast]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const handleStatusChange = async (row, nextStatus) => {
    if (isOffline || !canManage) return;
    if (nextStatus === 'Voided') {
      setVoidDialog({ invoice_no: row.invoice_no, reason: '' });
      return;
    }
    try {
      await autoInvoiceApi.updateStatus(row.invoice_no, nextStatus, '');
      toast.success(`อัปเดตสถานะเป็น ${nextStatus} เรียบร้อย`);
      await loadHistory();
    } catch (err) {
      toast.error(err.message || 'อัปเดตสถานะไม่สำเร็จ');
    }
  };

  const handleConfirmVoid = async (e) => {
    e.preventDefault();
    if (!voidDialog?.reason?.trim() || isOffline) return;
    try {
      await autoInvoiceApi.updateStatus(voidDialog.invoice_no, 'Voided', voidDialog.reason.trim());
      toast.success(`ยกเลิกบิล ${voidDialog.invoice_no} เรียบร้อย`);
      setVoidDialog(null);
      await loadHistory();
    } catch (err) {
      toast.error(err.message || 'ยกเลิกบิลไม่สำเร็จ');
    }
  };

  const handleRestore = async (invoiceNo) => {
    if (isOffline || !canManage) return;
    const ok = await confirm({
      title: 'กู้คืน Invoice ที่ถูกยกเลิก',
      message: `ต้องการกู้คืนสถานะบิล ${invoiceNo} กลับเป็น Pending ใช่หรือไม่?`,
      confirmText: 'ยืนยันกู้คืน',
    });
    if (!ok) return;

    try {
      await autoInvoiceApi.restoreInvoice(invoiceNo);
      toast.success(`กู้คืนบิล ${invoiceNo} เรียบร้อย`);
      await loadHistory();
    } catch (err) {
      toast.error(err.message || 'กู้คืนบิลไม่สำเร็จ');
    }
  };

  const handleSaveMemo = async (e) => {
    e.preventDefault();
    if (!memoDialog || isOffline) return;
    try {
      await autoInvoiceApi.updateMemo(memoDialog.invoice_no, memoDialog.memo || '');
      toast.success('บันทึก Memo เรียบร้อย');
      setMemoDialog(null);
      await loadHistory();
    } catch (err) {
      toast.error(err.message || 'บันทึก Memo ไม่สำเร็จ');
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));

  const kpis = [
    { key: '', label: 'ทั้งหมด (All)', value: summary.all },
    { key: 'Pending', label: 'รอดำเนินการ (Pending)', value: summary.pending },
    { key: 'Exported', label: 'ส่งออกแล้ว (Exported)', value: summary.exported },
    { key: 'Invoiced', label: 'ออกบิลแล้ว (Invoiced)', value: summary.invoiced },
    { key: 'Paid', label: 'ชำระแล้ว (Paid)', value: summary.paid },
    { key: 'Voided', label: 'ยกเลิก (Voided)', value: summary.voided },
  ];

  return (
    <div className="w-full space-y-5 p-3 sm:p-5">
      {isOffline && (
        <div className="flex items-center gap-2 rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-xs font-semibold text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
          <WifiOff className="h-4 w-4 shrink-0" />
          <span>ออฟไลน์อยู่ — ไม่สามารถสร้าง แก้ไข หรือเปลี่ยนสถานะเอกสารได้</span>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Auto Invoice &amp; Packing List Center
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              ออก Commercial Invoice / Packing List จัดการเวอร์ชัน และบันทึกสถานะการเงิน (อัตราแลกเปลี่ยนอ้างอิง ฿{exchangeRate.toFixed(2)}/USD)
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={downloadInvoiceTemplateXlsx}
            className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 px-3.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200"
          >
            <Download className="h-4 w-4" />
            <span>Template</span>
          </button>

          {canManage && (
            <>
              <button
                type="button"
                disabled={isOffline}
                onClick={() => setImportOpen(true)}
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-emerald-600 px-3.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:text-emerald-400"
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Import Excel</span>
              </button>

              <button
                type="button"
                disabled={isOffline}
                onClick={() => {
                  setEditTargetId(null);
                  setEditOpen(true);
                }}
                className="flex min-h-[44px] items-center gap-1.5 rounded-xl bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                <Plus className="h-4 w-4" />
                <span>สร้าง Invoice ใหม่</span>
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {kpis.map((k) => {
          const active = statusFilter === k.key;
          return (
            <button
              key={k.key || 'ALL'}
              type="button"
              onClick={() => {
                setStatusFilter(k.key);
                setPage(1);
              }}
              className={`min-h-[72px] rounded-xl border bg-white p-3.5 text-left transition dark:bg-slate-900 ${
                active ? 'border-emerald-600 ring-2 ring-emerald-600' : 'border-slate-200 dark:border-slate-700'
              }`}
            >
              <div className="text-xs text-slate-500 dark:text-slate-400">{k.label}</div>
              <div className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{k.value || 0}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-2.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="ค้นหา Invoice No., ลูกค้า, ตู้คอนเทนเนอร์, Booking..."
            className="min-h-[44px] w-full rounded-xl border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs dark:border-slate-700 dark:bg-slate-800"
          />
        </div>

        <select
          value={dateType}
          onChange={(e) => setDateType(e.target.value)}
          aria-label="กรองตามวันที่"
          className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
        >
          <option value="created_at">วันที่ออกในระบบ (Created)</option>
          <option value="invoice_date">วันที่หน้าบิล (Invoice Date)</option>
          <option value="etd_date">วันเรือออก (ETD Date)</option>
        </select>

        <input
          type="date"
          value={startDate}
          onChange={(e) => {
            setStartDate(e.target.value);
            setPage(1);
          }}
          aria-label="ตั้งแต่วันที่"
          className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
        />

        <input
          type="date"
          value={endDate}
          onChange={(e) => {
            setEndDate(e.target.value);
            setPage(1);
          }}
          aria-label="ถึงวันที่"
          className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
        />

        <button
          type="button"
          onClick={loadHistory}
          disabled={loading}
          className="flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-slate-300 text-xs font-semibold hover:bg-slate-50 dark:border-slate-700"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          <span>รีเฟรช</span>
        </button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-xs dark:divide-slate-800">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-3 py-3 text-left font-semibold">Invoice No. / Ver</th>
                <th className="px-3 py-3 text-left font-semibold">Customer &amp; Booking</th>
                <th className="px-3 py-3 text-left font-semibold">Inv Date / ETD / Vessel</th>
                <th className="px-3 py-3 text-right font-semibold">Amount (USD / THB)</th>
                <th className="px-3 py-3 text-left font-semibold">สถานะ &amp; Memo</th>
                <th className="px-3 py-3 text-right font-semibold">เอกสาร &amp; จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">กำลังโหลดข้อมูล Invoice...</td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">ไม่พบเอกสาร Invoice ในช่วงที่เลือก</td>
                </tr>
              ) : (
                rows.map((row) => {
                  const isVoided = row.doc_status === 'Voided';
                  const thbVal = Number(row.total_amount_raw || 0) * exchangeRate;
                  return (
                    <tr key={row.id} className={isVoided ? 'bg-red-50/40 dark:bg-red-950/15' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}>
                      <td className="px-3 py-2.5 align-top">
                        <div className="font-mono font-bold text-slate-900 dark:text-white">{row.invoice_no}</div>
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                            V{row.version}
                          </span>
                          <span className="text-[10px] text-slate-400">{row.created_at}</span>
                        </div>
                      </td>

                      <td className="px-3 py-2.5 align-top max-w-[260px]">
                        <div className="font-semibold text-slate-800 dark:text-slate-100 line-clamp-1">{row.customer_name}</div>
                        <div className="mt-0.5 text-[11px] text-slate-500">
                          BKG: {row.booking_no} {row.team_name ? `· ${row.team_name}` : ''}
                        </div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">Ctn: {row.container_no}</div>
                      </td>

                      <td className="px-3 py-2.5 align-top">
                        <div>Inv: {row.invoice_date}</div>
                        <div className="text-[11px] text-slate-500">ETD: {row.etd_date}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1">{row.vessel}</div>
                      </td>

                      <td className="px-3 py-2.5 align-top text-right font-mono">
                        <div className="font-bold text-emerald-700 dark:text-emerald-400">${row.total_amount}</div>
                        <div className="text-[11px] text-slate-400">฿{formatDecimal(thbVal, 2)}</div>
                      </td>

                      <td className="px-3 py-2.5 align-top min-w-[160px] space-y-1">
                        {canManage && !isVoided ? (
                          <select
                            disabled={isOffline}
                            value={row.doc_status}
                            onChange={(e) => handleStatusChange(row, e.target.value)}
                            className={`min-h-[36px] rounded-lg border px-2 text-[11px] font-bold ${STATUS_BADGE[row.doc_status] || ''}`}
                          >
                            {['Pending', 'Exported', 'Invoiced', 'Paid', 'Voided'].map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`inline-flex rounded-lg border px-2 py-0.5 text-[11px] font-bold ${STATUS_BADGE[row.doc_status] || ''}`}>
                              {row.doc_status}
                            </span>
                            {isVoided && canManage && (
                              <button
                                type="button"
                                disabled={isOffline}
                                onClick={() => handleRestore(row.invoice_no)}
                                className="inline-flex items-center gap-1 rounded bg-slate-800 px-2 py-1 text-[10px] font-semibold text-white"
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>Restore</span>
                              </button>
                            )}
                          </div>
                        )}
                        {isVoided && row.void_reason && (
                          <div className="text-[10px] text-red-600">Void: {row.void_reason}</div>
                        )}
                        {row.admin_memo && (
                          <div className="text-[10px] text-blue-600 dark:text-blue-400 line-clamp-1">Memo: {row.admin_memo}</div>
                        )}
                      </td>

                      <td className="px-3 py-2.5 align-top text-right">
                        <div className="inline-flex flex-wrap justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setPrintSpec({ id: row.id, docType: 'CI' })}
                            className="flex min-h-[38px] items-center gap-1 rounded-lg bg-slate-900 px-2.5 text-[11px] font-semibold text-white hover:bg-slate-800 dark:bg-blue-600"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>CI</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setPrintSpec({ id: row.id, docType: 'PL' })}
                            className="flex min-h-[38px] items-center gap-1 rounded-lg border border-slate-300 px-2.5 text-[11px] font-semibold hover:bg-slate-50 dark:border-slate-700"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            <span>PL</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setVersionInvNo(row.invoice_no)}
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700"
                            aria-label="ประวัติเวอร์ชัน"
                          >
                            <History className="h-4 w-4" />
                          </button>
                          {canManage && (
                            <>
                              <button
                                type="button"
                                disabled={isOffline}
                                onClick={() => setMemoDialog({ invoice_no: row.invoice_no, memo: row.admin_memo || '' })}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700"
                                aria-label="บันทึก Memo"
                              >
                                <MessageSquare className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                disabled={isOffline}
                                onClick={() => {
                                  setEditTargetId(row.id);
                                  setEditOpen(true);
                                }}
                                className="flex h-9 w-9 items-center justify-center rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
                                aria-label="แก้ไข / ออกเวอร์ชันใหม่"
                              >
                                <Edit3 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-3 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300">
          <span>หน้า {page} / {totalPages} (ทั้งหมด {totalRows} ฉบับ)</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3.5 font-semibold disabled:opacity-40 dark:border-slate-700"
            >
              ก่อนหน้า
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="min-h-[44px] rounded-xl border border-slate-300 px-3.5 font-semibold disabled:opacity-40 dark:border-slate-700"
            >
              ถัดไป
            </button>
          </div>
        </div>
      </div>

      {editOpen && (
        <InvoiceEditModal
          invoiceId={editTargetId}
          isOffline={isOffline}
          onClose={() => setEditOpen(false)}
          onSaved={loadHistory}
        />
      )}

      {importOpen && (
        <InvoiceImportModal
          isOffline={isOffline}
          onClose={() => setImportOpen(false)}
          onImported={loadHistory}
        />
      )}

      {versionInvNo && (
        <InvoiceVersionModal
          invoiceNo={versionInvNo}
          onPrintVersion={(id, docType) => {
            setVersionInvNo(null);
            setPrintSpec({ id, docType });
          }}
          onClose={() => setVersionInvNo(null)}
        />
      )}

      {printSpec && (
        <InvoicePrintModal
          invoiceId={printSpec.id}
          initialDocType={printSpec.docType}
          onClose={() => setPrintSpec(null)}
        />
      )}

      {memoDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form onSubmit={handleSaveMemo} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Admin Memo: {memoDialog.invoice_no}</h3>
              <button type="button" onClick={() => setMemoDialog(null)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              rows={4}
              value={memoDialog.memo}
              onChange={(e) => setMemoDialog({ ...memoDialog, memo: e.target.value })}
              placeholder="บันทึกโน้ตภายในสำหรับทีมบัญชี / โลจิสติกส์..."
              className="w-full rounded-xl border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-800"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setMemoDialog(null)} className="min-h-[44px] rounded-xl border px-4">ยกเลิก</button>
              <button type="submit" className="min-h-[44px] rounded-xl bg-blue-600 px-5 font-semibold text-white">บันทึก Memo</button>
            </div>
          </form>
        </div>
      )}

      {voidDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <form onSubmit={handleConfirmVoid} className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900 space-y-4 text-xs">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-red-600">ยกเลิกบิล (Void): {voidDialog.invoice_no}</h3>
              <button type="button" onClick={() => setVoidDialog(null)} className="h-10 w-10 flex items-center justify-center rounded-lg hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div>
              <label className="mb-1 block font-semibold">ระบุเหตุผลการยกเลิกบิล *</label>
              <textarea
                rows={3}
                required
                value={voidDialog.reason}
                onChange={(e) => setVoidDialog({ ...voidDialog, reason: e.target.value })}
                placeholder="เช่น ออกเลขบิลซ้ำ / ลูกค้ายกเลิกเที่ยวเรือ..."
                className="w-full rounded-xl border border-slate-300 p-3 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setVoidDialog(null)} className="min-h-[44px] rounded-xl border px-4">ปิด</button>
              <button type="submit" className="min-h-[44px] rounded-xl bg-red-600 px-5 font-semibold text-white">ยืนยันยกเลิกบิล</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

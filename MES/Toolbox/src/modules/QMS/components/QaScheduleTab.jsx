import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, ChevronLeft, ChevronRight, Layers, Ticket, Plus, Printer,
  UserCheck, Edit3, X, Trash2
} from 'lucide-react';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { qmsScheduleApi } from '../../../shared/services/qmsApi';
import {
  formatLocalYmd, formatQmsDate, formatQmsQty, normalizeQaStatus, getLoadingUrgency,
  openQmsPrintWindow, escapeHtml
} from '../utils/qmsFormatters';
import { QaBulkTicketModal, QaEditPoModal, QaInspectionModal } from './QaInspectionModals';

export default function QaScheduleTab({ isOnline }) {
  const { user } = useAuth();
  const toast = useToast();

  const [rangePreset, setRangePreset] = useState('today');
  const [startDate, setStartDate] = useState(() => formatLocalYmd());
  const [endDate, setEndDate] = useState(() => formatLocalYmd());
  const [rows, setRows] = useState([]);
  const [stats, setStats] = useState({ total: 0, waiting: 0, in_progress: 0, passed: 0, failed: 0 });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [qcUsers, setQcUsers] = useState([]);

  // Inline PO Add search
  const [inlineSearch, setInlineSearch] = useState('');
  const [inlineResults, setInlineResults] = useState([]);

  // Create Ticket Multi-PO modal
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [ticketPoSearch, setTicketPoSearch] = useState('');
  const [ticketPoSuggestions, setTicketPoSuggestions] = useState([]);
  const [ticketPoList, setTicketPoList] = useState([]);
  const [ticketForm, setTicketForm] = useState({ ticket_number: '', qa_inspector: '', inspect_type: 'On-site', inspection_date: formatLocalYmd() });

  // Active modals
  const [inspectPo, setInspectPo] = useState(null);
  const [editPo, setEditPo] = useState(null);
  const [bulkPoIds, setBulkPoIds] = useState([]);

  const fetchScheduleByParams = useCallback(async (preset, sDate, eDate) => {
    setLoading(true);
    try {
      const res = await qmsScheduleApi.getSchedule({ range: preset, start_date: sDate, end_date: eDate });
      setRows(res.data?.rows || []);
      setStats(res.data?.stats || { total: 0, waiting: 0, in_progress: 0, passed: 0, failed: 0 });
      if (res.data?.start_date) setStartDate(res.data.start_date);
      if (res.data?.end_date) setEndDate(res.data.end_date);
      setSelectedIds([]);
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถโหลดตารางตรวจ QA/QC ได้');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadSchedule = (preset = rangePreset, sDate = startDate, eDate = endDate) => (
    fetchScheduleByParams(preset, sDate, eDate)
  );

  useEffect(() => {
    const today = formatLocalYmd();
    fetchScheduleByParams('today', today, today);
    qmsScheduleApi.getQcUsers().then((r) => setQcUsers(r.data || [])).catch(() => {});
  }, [fetchScheduleByParams]);

  useEffect(() => {
    if (inlineSearch.trim().length < 3) {
      setInlineResults([]);
      return;
    }
    const timer = setTimeout(() => {
      qmsScheduleApi.searchPo(inlineSearch.trim())
        .then((res) => setInlineResults(res.data || []))
        .catch(() => setInlineResults([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [inlineSearch]);

  useEffect(() => {
    if (ticketPoSearch.trim().length < 3) {
      setTicketPoSuggestions([]);
      return;
    }
    const timer = setTimeout(() => {
      qmsScheduleApi.searchPo(ticketPoSearch.trim())
        .then((res) => setTicketPoSuggestions(res.data || []))
        .catch(() => setTicketPoSuggestions([]));
    }, 300);
    return () => clearTimeout(timer);
  }, [ticketPoSearch]);

  const handlePresetClick = (preset) => {
    setRangePreset(preset);
    loadSchedule(preset);
  };

  const handleStepDay = (delta) => {
    const dt = new Date(startDate || formatLocalYmd());
    dt.setDate(dt.getDate() + delta);
    const nextYmd = formatLocalYmd(dt);
    setRangePreset('custom_range');
    setStartDate(nextYmd);
    setEndDate(nextYmd);
    loadSchedule('custom_range', nextYmd, nextYmd);
  };

  const handleAssignToMe = async (po) => {
    if (!isOnline) return;
    const myName = user?.fullname || user?.username || '';
    try {
      await qmsScheduleApi.assignInspector(po.id, myName);
      toast.success(`มอบหมาย ${po.po_number} ให้ ${myName} เรียบร้อยแล้ว`);
      loadSchedule();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถมอบหมายผู้ตรวจได้');
    }
  };

  const handleInlineAddPo = async (po) => {
    if (!isOnline) return;
    try {
      const res = await qmsScheduleApi.schedulePo(po.id, startDate || formatLocalYmd());
      toast.success(res.message || `เพิ่ม PO ${po.po_number} เข้าตารางตรวจแล้ว`);
      setInlineSearch('');
      setInlineResults([]);
      loadSchedule();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถเพิ่ม PO ได้');
    }
  };

  const handleSaveCreateTicket = async (e) => {
    e.preventDefault();
    if (!isOnline || ticketPoList.length === 0) return;
    try {
      const res = await qmsScheduleApi.bulkUpdateTicket({
        po_ids: ticketPoList.map((p) => p.id),
        ...ticketForm,
      });
      toast.success(res.message || 'สร้างและมอบหมาย Ticket เรียบร้อยแล้ว');
      setTicketModalOpen(false);
      loadSchedule();
    } catch (err) {
      toast.error(err.message || 'ไม่สามารถสร้าง Ticket ได้');
    }
  };

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return rows.filter((po) => {
      const st = normalizeQaStatus(po);
      if (statusFilter === 'PASS' && !st.isPassed) return false;
      if (statusFilter === 'FAIL' && !st.isFailed) return false;
      if (statusFilter === 'IN_PROGRESS' && !st.isInProgress) return false;
      if (statusFilter === 'WAITING' && !st.isWaiting) return false;
      if (!q) return true;
      const hay = `${po.ticket_number || ''} ${po.po_number || ''} ${po.sku || ''} ${po.description || ''} ${po.loading_week || ''} ${po.qa_inspector || ''} ${po.dc_location || ''}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rows, statusFilter, searchTerm]);

  const handlePrintSchedule = () => {
    const bodyRows = filteredRows.map((po) => {
      const { isPassed, isFailed, isInProgress, isDone } = normalizeQaStatus(po);
      const stText = isFailed ? 'FAIL' : isPassed ? 'PASS' : isDone ? 'DONE' : isInProgress ? 'IN PROGRESS' : 'WAITING';
      const roundNo = Number(po.round_no || 1);
      const totalRounds = Number(po.total_rounds || roundNo || 1);
      const roundLabel = totalRounds > 1 ? ` (R${roundNo}/${totalRounds})` : '';
      return `<tr>
        <td>${escapeHtml(po.ticket_number || '-')}</td>
        <td><b>${escapeHtml(po.po_number)}</b>${escapeHtml(roundLabel)}</td>
        <td>${escapeHtml(po.sku)} - ${escapeHtml(po.description || '')}</td>
        <td style="text-align:right">${escapeHtml(formatQmsQty(po.quantity))}</td>
        <td>${escapeHtml(po.dc_location || '-')}</td>
        <td>${escapeHtml(formatQmsDate(po.inspection_date))}</td>
        <td>${escapeHtml(formatQmsDate(po.loading_date))}</td>
        <td>${escapeHtml(po.qa_inspector || '-')}</td>
        <td><b>${stText}</b></td>
      </tr>`;
    }).join('');
    openQmsPrintWindow({
      title: `QA/QC Inspection Schedule (${startDate} - ${endDate})`,
      orientation: 'landscape',
      bodyHtml: `<div class="sheet">
        <div class="header">
          <div><div class="doc-title">QA/QC INSPECTION SCHEDULE</div><div class="doc-sub">Range: ${escapeHtml(formatQmsDate(startDate))} to ${escapeHtml(formatQmsDate(endDate))} (${filteredRows.length} POs)</div></div>
        </div>
        <table>
          <thead><tr><th>Ticket</th><th>PO Number</th><th>Item Details</th><th>Qty</th><th>DC</th><th>Plan Date</th><th>Loading</th><th>Inspector</th><th>Status</th></tr></thead>
          <tbody>${bodyRows || '<tr><td colspan="9" style="text-align:center">No records</td></tr>'}</tbody>
        </table>
      </div>`,
    });
  };

  const kpiCards = [
    { key: 'ALL', label: 'Total Scheduled', val: stats.total, border: 'border-slate-300' },
    { key: 'WAITING', label: 'Waiting', val: stats.waiting, border: 'border-slate-400' },
    { key: 'IN_PROGRESS', label: 'In Progress', val: stats.in_progress, border: 'border-amber-400' },
    { key: 'PASS', label: 'Passed', val: stats.passed, border: 'border-emerald-400' },
    { key: 'FAIL', label: 'Failed', val: stats.failed, border: 'border-rose-400' },
  ];

  return (
    <div className="space-y-4">
      {/* KPI Filter Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {kpiCards.map((c) => {
          const active = statusFilter === c.key;
          return (
            <button
              key={c.key}
              type="button"
              onClick={() => setStatusFilter(c.key)}
              className={`min-h-[72px] p-3.5 rounded-xl border-l-4 text-left shadow-xs ${c.border} ${
                active ? 'bg-blue-50/80 dark:bg-blue-950/30 ring-2 ring-blue-500 border border-blue-200' : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <div className="text-xs font-bold uppercase text-slate-500">{c.label}</div>
              <div className="text-2xl font-extrabold mt-1 text-slate-900 dark:text-white">{Number(c.val || 0).toLocaleString()}</div>
            </button>
          );
        })}
      </div>

      {/* Filters & Action Bar */}
      <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'today', label: 'Today' },
              { id: 'this_week', label: 'This Wk' },
              { id: 'this_month', label: 'This Mo' },
              { id: 'last_month', label: 'Last Mo' },
            ].map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => handlePresetClick(p.id)}
                className={`min-h-[38px] px-3 rounded-full text-xs font-bold border ${
                  rangePreset === p.id ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                }`}
              >
                {p.label}
              </button>
            ))}

            <div className="flex items-center gap-1">
              <button type="button" onClick={() => handleStepDay(-1)} className="min-w-[36px] min-h-[38px] flex items-center justify-center rounded-l-lg border border-slate-200 dark:border-slate-700">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <input
                type="date"
                value={startDate}
                onChange={(e) => { setRangePreset('custom_range'); setStartDate(e.target.value); loadSchedule('custom_range', e.target.value, endDate); }}
                className="min-h-[38px] px-2 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded"
              />
              <span className="text-xs text-slate-400">ถึง</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setRangePreset('custom_range'); setEndDate(e.target.value); loadSchedule('custom_range', startDate, e.target.value); }}
                className="min-h-[38px] px-2 text-xs font-bold border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 rounded"
              />
              <button type="button" onClick={() => handleStepDay(1)} className="min-w-[36px] min-h-[38px] flex items-center justify-center rounded-r-lg border border-slate-200 dark:border-slate-700">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ค้นหา Ticket, PO, SKU, DC..."
                className="w-full min-h-[40px] pl-8 pr-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
              />
            </div>
            {selectedIds.length > 0 && (
              <button
                type="button"
                disabled={!isOnline}
                onClick={() => setBulkPoIds(selectedIds)}
                className="min-h-[40px] px-3 rounded-lg bg-blue-600 text-white text-xs font-bold inline-flex items-center gap-1.5"
              >
                <Layers className="w-3.5 h-3.5" /> Bulk ({selectedIds.length})
              </button>
            )}
            <button
              type="button"
              disabled={!isOnline}
              onClick={() => {
                setTicketPoList([]);
                setTicketForm({ ticket_number: '', qa_inspector: '', inspect_type: 'On-site', inspection_date: startDate || formatLocalYmd() });
                setTicketModalOpen(true);
              }}
              className="min-h-[40px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Ticket className="w-3.5 h-3.5" /> Create Ticket
            </button>
            <button
              type="button"
              onClick={handlePrintSchedule}
              className="min-h-[40px] px-3 rounded-lg border border-slate-200 dark:border-slate-700 text-xs font-bold inline-flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" /> พิมพ์ตาราง
            </button>
          </div>
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden md:block bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-blue-600 text-white text-xs uppercase">
              <tr>
                <th className="px-3 py-3 text-center w-10">
                  <input
                    type="checkbox"
                    checked={
                      filteredRows.some((r) => Number(r.is_latest ?? 1) === 1 && r.is_latest !== false)
                      && selectedIds.length === filteredRows.filter((r) => Number(r.is_latest ?? 1) === 1 && r.is_latest !== false).length
                    }
                    onChange={() => {
                      const activeIds = [...new Set(
                        filteredRows
                          .filter((r) => Number(r.is_latest ?? 1) === 1 && r.is_latest !== false)
                          .map((r) => r.id)
                      )];
                      setSelectedIds(selectedIds.length === activeIds.length ? [] : activeIds);
                    }}
                  />
                </th>
                <th className="px-3 py-3 font-bold">Ticket No.</th>
                <th className="px-3 py-3 font-bold">PO Number</th>
                <th className="px-3 py-3 font-bold">Item Details</th>
                <th className="px-3 py-3 font-bold text-right">Qty</th>
                <th className="px-3 py-3 font-bold text-center">DC</th>
                <th className="px-3 py-3 font-bold text-center">Plan / Actual</th>
                <th className="px-3 py-3 font-bold text-center">Loading / Wk</th>
                <th className="px-3 py-3 font-bold">Inspector</th>
                <th className="px-3 py-3 font-bold text-center">Status</th>
                <th className="px-3 py-3 font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-500">กำลังโหลดตารางตรวจ QA/QC...</td></tr>
              ) : filteredRows.length === 0 ? (
                <tr><td colSpan={11} className="px-4 py-10 text-center text-slate-500">ไม่พบรายการ PO ที่กำหนดตรวจในช่วงเวลานี้</td></tr>
              ) : (
                filteredRows.map((po) => {
                  const st = normalizeQaStatus(po);
                  const roundNo = Number(po.round_no || 1);
                  const totalRounds = Number(po.total_rounds || roundNo || 1);
                  const isArchived = Number(po.is_latest ?? 1) === 0 || po.is_latest === false;
                  const rowKey = po.history_id ? `hist-${po.history_id}` : `po-${po.id}`;
                  const urgency = getLoadingUrgency(po);
                  const rowBg = isArchived ? 'bg-slate-50/70 dark:bg-slate-900/40 opacity-80'
                    : urgency === 'overdue' ? 'bg-rose-50/70 dark:bg-rose-950/20'
                      : urgency === 'approaching' ? 'bg-amber-50/70 dark:bg-amber-950/20' : '';
                  const stBadge = st.isFailed ? 'bg-rose-100 text-rose-700'
                    : st.isDone ? 'bg-emerald-100 text-emerald-700'
                      : st.isInProgress ? 'bg-amber-100 text-amber-800'
                        : 'bg-slate-100 text-slate-700';

                  return (
                    <tr
                      key={rowKey}
                      onClick={() => setInspectPo(po)}
                      className={`hover:bg-blue-50/50 dark:hover:bg-slate-800/50 cursor-pointer ${rowBg}`}
                    >
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        {!isArchived && (
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(po.id)}
                            onChange={() => setSelectedIds((p) => p.includes(po.id) ? p.filter((x) => x !== po.id) : [...p, po.id])}
                          />
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-slate-600 dark:text-slate-300 whitespace-nowrap">{po.ticket_number || '-'}</td>
                      <td className="px-3 py-3 font-mono font-bold text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span>{po.po_number}</span>
                          {totalRounds > 1 && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${isArchived ? 'bg-slate-200 text-slate-700' : 'bg-sky-100 text-sky-800'}`}>
                              R{roundNo}/{totalRounds}
                            </span>
                          )}
                          {isArchived && (
                            <span className="px-1.5 py-0.5 rounded bg-slate-100 border border-slate-300 text-slate-600 text-[10px]">History</span>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-3">
                        <div className="font-bold text-slate-900 dark:text-white">{po.sku}</div>
                        <div className="text-xs text-slate-500 line-clamp-1">{po.description} {po.color ? `(${po.color})` : ''}</div>
                      </td>
                      <td className="px-3 py-3 text-right font-bold">{formatQmsQty(po.quantity)}</td>
                      <td className="px-3 py-3 text-center text-xs">{po.dc_location || '-'}</td>
                      <td className="px-3 py-3 text-center text-xs whitespace-nowrap">
                        <div className="font-bold">{formatQmsDate(po.inspection_date)}</div>
                        {po.actual_inspection_date && <div className="text-emerald-600">{formatQmsDate(po.actual_inspection_date)}</div>}
                      </td>
                      <td className="px-3 py-3 text-center text-xs whitespace-nowrap">
                        <div>{formatQmsDate(po.loading_date)}</div>
                        <div className="text-slate-400">{po.loading_week || '-'}</div>
                      </td>
                      <td className="px-3 py-3 text-xs" onClick={(e) => e.stopPropagation()}>
                        {po.qa_inspector ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-100 text-sky-800 font-semibold">
                            <UserCheck className="w-3 h-3" /> {po.qa_inspector}
                          </span>
                        ) : !isArchived ? (
                          <button type="button" disabled={!isOnline} onClick={() => handleAssignToMe(po)} className="px-2 py-1 rounded border border-blue-300 text-blue-600 font-bold hover:bg-blue-50">
                            Assign to Me
                          </button>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-center whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${stBadge}`}>
                          {st.isFailed ? 'FAIL' : st.isPassed ? 'PASS' : st.isDone ? 'DONE' : st.isInProgress ? 'IN PROGRESS' : 'WAITING'}
                        </span>
                        {po.inspect_type && <div className="text-[10px] font-bold text-slate-500 mt-0.5">{po.inspect_type}</div>}
                      </td>
                      <td className="px-3 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        {!isArchived && (
                          <button type="button" onClick={() => setEditPo(po)} className="min-w-[34px] min-h-[34px] inline-flex items-center justify-center rounded-lg hover:bg-amber-100 text-amber-600" title="Edit PO Details">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Inline Add PO to Schedule Footer */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 relative">
          <div className="max-w-md mx-auto flex items-center gap-2">
            <Plus className="w-4 h-4 text-blue-600 shrink-0" />
            <input
              type="text"
              disabled={!isOnline}
              value={inlineSearch}
              onChange={(e) => setInlineSearch(e.target.value)}
              placeholder="พิมพ์เลข PO / SKU เพื่อเพิ่มเข้าตารางตรวจวันที่เลือก..."
              className="w-full min-h-[38px] px-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg"
            />
          </div>
          {inlineResults.length > 0 && (
            <div className="max-w-md mx-auto mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-slate-100">
              {inlineResults.map((po) => (
                <button
                  key={po.id}
                  type="button"
                  onClick={() => handleInlineAddPo(po)}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex items-center justify-between gap-2"
                >
                  <span><b>{po.po_number}</b> • {po.sku} (Qty: {formatQmsQty(po.quantity)})</span>
                  <span className="text-blue-600 font-bold">+ เพิ่ม</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden space-y-3">
        {loading ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">กำลังโหลด...</div>
        ) : filteredRows.length === 0 ? (
          <div className="p-8 text-center text-slate-500 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800">ไม่พบข้อมูลตารางตรวจ</div>
        ) : (
          filteredRows.map((po) => {
            const st = normalizeQaStatus(po);
            const roundNo = Number(po.round_no || 1);
            const totalRounds = Number(po.total_rounds || roundNo || 1);
            const isArchived = Number(po.is_latest ?? 1) === 0 || po.is_latest === false;
            const rowKey = po.history_id ? `mob-hist-${po.history_id}` : `mob-po-${po.id}`;
            const stBadge = st.isFailed ? 'bg-rose-100 text-rose-700' : st.isDone ? 'bg-emerald-100 text-emerald-700' : st.isInProgress ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700';
            return (
              <div key={rowKey} onClick={() => setInspectPo(po)} className={`p-4 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xs space-y-2 ${isArchived ? 'opacity-75' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono font-bold text-blue-600">{po.po_number}</span>
                    {totalRounds > 1 && <span className="px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 text-[10px] font-bold">R{roundNo}/{totalRounds}</span>}
                    {isArchived && <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[10px]">History</span>}
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${stBadge}`}>{st.isFailed ? 'FAIL' : st.isPassed ? 'PASS' : st.isDone ? 'DONE' : st.isInProgress ? 'IN PROGRESS' : 'WAITING'}</span>
                </div>
                <div className="text-xs font-bold">{po.sku} • {po.description}</div>
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>Qty: {formatQmsQty(po.quantity)} | {po.qa_inspector || 'Unassigned'}</span>
                  <span>Plan: {formatQmsDate(po.inspection_date)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Create Ticket Multi-PO Modal */}
      {ticketModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3">
          <div className="w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-between">
              <h3 className="font-bold text-sm flex items-center gap-2"><Ticket className="w-4 h-4 text-emerald-600" /> สร้าง Inspection Ticket (รวมหลาย PO)</h3>
              <button type="button" onClick={() => setTicketModalOpen(false)} className="min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveCreateTicket} className="p-5 space-y-3 max-h-[82vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold mb-1">Ticket Number *</label>
                  <input type="text" required value={ticketForm.ticket_number} onChange={(e) => setTicketForm((p) => ({ ...p, ticket_number: e.target.value }))} placeholder="INSP-..." className="w-full min-h-[40px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Plan Inspection Date *</label>
                  <input type="date" required value={ticketForm.inspection_date} onChange={(e) => setTicketForm((p) => ({ ...p, inspection_date: e.target.value }))} className="w-full min-h-[40px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">QC Inspector</label>
                  <input type="text" list="ticket-qc-users" value={ticketForm.qa_inspector} onChange={(e) => setTicketForm((p) => ({ ...p, qa_inspector: e.target.value }))} className="w-full min-h-[40px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg" />
                  <datalist id="ticket-qc-users">
                    {qcUsers.map((u) => <option key={u.id} value={u.fullname} />)}
                  </datalist>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1">Inspect Type</label>
                  <div className="grid grid-cols-2 gap-2">
                    {['Remote', 'On-site'].map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTicketForm((p) => ({ ...p, inspect_type: t }))}
                        className={`min-h-[40px] rounded-lg border text-xs font-bold ${ticketForm.inspect_type === t ? 'bg-emerald-600 text-white border-emerald-600' : 'border-slate-200 dark:border-slate-700'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold mb-1">ค้นหาและเพิ่ม PO เข้า Ticket</label>
                <input
                  type="text"
                  value={ticketPoSearch}
                  onChange={(e) => setTicketPoSearch(e.target.value)}
                  placeholder="พิมพ์ PO Number อย่างน้อย 3 ตัวอักษร..."
                  className="w-full min-h-[40px] px-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-lg"
                />
                {ticketPoSuggestions.length > 0 && (
                  <div className="mt-1 border border-slate-200 dark:border-slate-700 rounded-lg max-h-36 overflow-y-auto divide-y">
                    {ticketPoSuggestions.map((po) => (
                      <button
                        key={po.id}
                        type="button"
                        onClick={() => {
                          if (!ticketPoList.some((x) => x.id === po.id)) setTicketPoList((p) => [...p, po]);
                          setTicketPoSearch('');
                          setTicketPoSuggestions([]);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-blue-50 text-xs flex justify-between"
                      >
                        <span><b>{po.po_number}</b> ({po.sku})</span>
                        <span>Qty: {formatQmsQty(po.quantity)}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                <div className="px-3 py-2 bg-slate-50 dark:bg-slate-950 text-xs font-bold">รายการ PO ใน Ticket ({ticketPoList.length})</div>
                <div className="divide-y max-h-36 overflow-y-auto">
                  {ticketPoList.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">ยังไม่ได้เลือก PO</div>
                  ) : (
                    ticketPoList.map((po) => (
                      <div key={po.id} className="px-3 py-2 flex items-center justify-between text-xs">
                        <span><b>{po.po_number}</b> • {po.sku} (Qty: {formatQmsQty(po.quantity)})</span>
                        <button type="button" onClick={() => setTicketPoList((p) => p.filter((x) => x.id !== po.id))} className="text-rose-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <button type="button" onClick={() => setTicketModalOpen(false)} className="min-h-[42px] px-4 rounded-lg border text-xs font-bold">ยกเลิก</button>
                <button type="submit" disabled={!isOnline || ticketPoList.length === 0} className="min-h-[42px] px-5 rounded-lg bg-emerald-600 disabled:opacity-50 text-white text-xs font-bold">บันทึก Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <QaInspectionModal
        po={inspectPo}
        qcUsers={qcUsers}
        isOnline={isOnline}
        toast={toast}
        onClose={() => setInspectPo(null)}
        onSaved={() => loadSchedule()}
      />

      <QaEditPoModal
        po={editPo}
        isOnline={isOnline}
        toast={toast}
        onClose={() => setEditPo(null)}
        onSaved={() => loadSchedule()}
      />

      <QaBulkTicketModal
        poIds={bulkPoIds}
        qcUsers={qcUsers}
        isOnline={isOnline}
        toast={toast}
        onClose={() => setBulkPoIds([])}
        onSaved={() => loadSchedule()}
      />
    </div>
  );
}

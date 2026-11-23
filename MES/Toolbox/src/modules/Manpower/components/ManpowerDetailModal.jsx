import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X, Search, Download, Edit3, History, Trash2, ArrowLeft, CheckSquare,
  ChevronDown, Sun, Moon, AlertTriangle, Settings, User, RefreshCw, ExternalLink
} from 'lucide-react';
import { manpowerOpsApi, manpowerMasterApi } from '../../../shared/services/manpowerApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import { STATUS_BADGES, formatMoney, offsetIsoDate, exportRowsToExcel } from '../utils/manpowerHelpers';

function checkStillWorkingShift(row) {
  if (!row.in_time || row.out_time) return false;
  try {
    const inDate = new Date(`${row.log_date}T${String(row.in_time).slice(0, 5)}:00`);
    const isNight = Number(row.shift_id || row.default_shift_id) === 2;
    if (isNight && String(row.in_time) < '12:00') {
      inDate.setDate(inDate.getDate() + 1);
    }
    const diffHours = (Date.now() - inDate.getTime()) / (1000 * 60 * 60);
    return diffHours < 16 && diffHours > -24;
  } catch {
    return false;
  }
}

export default function ManpowerDetailModal({
  open,
  onClose,
  date,
  hcGroup,
  structure,
  canEdit,
  isOnline,
  filter = { line: '', shift: '', empType: 'ALL', status: 'ALL', title: 'รายละเอียดกำลังคน' },
  onMutated,
  onOpenMaster,
  onOpenAttendanceTab,
}) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [teamFilter, setTeamFilter] = useState('ALL');
  const [statusOverride, setStatusOverride] = useState('');

  // History mode inside same modal (30-day drilldown per employee)
  const [historyTarget, setHistoryTarget] = useState(null);

  // Batch checkboxes + dropdown
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [batchOpen, setBatchOpen] = useState(false);
  const batchRef = useRef(null);

  // Swap shift dialog
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [swapShiftId, setSwapShiftId] = useState('1');
  const [swapFuture, setSwapFuture] = useState(false);
  const [batchBusy, setBatchBusy] = useState(false);

  // Inline Edit Log Modal
  const [editRow, setEditRow] = useState(null);
  const [editForm, setEditForm] = useState({
    status: 'PRESENT',
    shift_id: 1,
    scan_in_time: '',
    scan_out_time: '',
    actual_line: '',
    actual_team: '',
    remark: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Employee Quick Profile Modal
  const [profileModal, setProfileModal] = useState({ open: false, loading: false, data: null });

  useEffect(() => {
    const onDocClick = (e) => {
      if (batchRef.current && !batchRef.current.contains(e.target)) {
        setBatchOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => {
    if (open) {
      setSearch('');
      setTeamFilter('ALL');
      setStatusOverride('');
      setHistoryTarget(null);
      setSelectedEmpIds([]);
      setEditRow(null);
      setBatchOpen(false);
    }
  }, [open, filter.line, filter.shift, filter.empType, filter.status]);

  const effectiveStatus = statusOverride || filter.status || 'ALL';

  const fetchList = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    try {
      let data = [];
      if (historyTarget) {
        const res = await manpowerOpsApi.readDaily({
          startDate: offsetIsoDate(date, -30),
          endDate: date,
          emp_id: historyTarget.emp_id,
          hcGroup: 'ALL',
        });
        data = Array.isArray(res?.data) ? res.data : [];
      } else {
        const res = await manpowerOpsApi.readDaily({
          date,
          line: filter.line || 'ALL',
          shift: filter.shift || 'ALL',
          type: filter.empType || 'ALL',
          status: effectiveStatus,
          hcGroup,
        });
        data = Array.isArray(res?.data) ? res.data : [];
        data.sort((a, b) => {
          const rank = (r) => {
            if (Number(r.is_forgot_out) === 1) return 0;
            if (r.status === 'ABSENT') return 1;
            if (r.status === 'LATE') return 2;
            return 3;
          };
          return rank(a) - rank(b);
        });
      }
      setRows(data);
      setSelectedEmpIds([]);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดรายชื่อพนักงานได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [open, historyTarget, date, filter.line, filter.shift, filter.empType, effectiveStatus, hcGroup, showToast]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const displayedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (teamFilter !== 'ALL' && String(r.team_group || '').toLowerCase() !== teamFilter.toLowerCase()) {
        return false;
      }
      if (!q) return true;
      return (
        String(r.emp_id || '').toLowerCase().includes(q)
        || String(r.name_th || '').toLowerCase().includes(q)
        || String(r.line || '').toLowerCase().includes(q)
        || String(r.status || '').toLowerCase().includes(q)
        || String(r.remark || '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, teamFilter]);

  const uniqueTeams = useMemo(() => {
    const base = new Set(Array.isArray(structure?.teams) ? structure.teams : []);
    rows.forEach((r) => {
      if (r.team_group) base.add(r.team_group);
    });
    return Array.from(base).filter(Boolean).sort();
  }, [structure, rows]);

  if (!open) return null;

  const allChecked = displayedRows.length > 0 && displayedRows.every((r) => selectedEmpIds.includes(r.emp_id));
  const toggleAll = () => {
    if (allChecked) {
      setSelectedEmpIds([]);
    } else {
      setSelectedEmpIds(displayedRows.map((r) => r.emp_id));
    }
  };
  const toggleOne = (empId) => {
    setSelectedEmpIds((prev) => (prev.includes(empId) ? prev.filter((x) => x !== empId) : [...prev, empId]));
  };

  const selectedRows = displayedRows.filter((r) => selectedEmpIds.includes(r.emp_id));

  const openProfile = async (empId) => {
    if (!empId) return;
    setProfileModal({ open: true, loading: true, data: null });
    try {
      const res = await manpowerMasterApi.readSingleEmployee(empId);
      setProfileModal({ open: true, loading: false, data: res?.data || null });
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดข้อมูลโปรไฟล์พนักงานได้', 'error');
      setProfileModal((p) => ({ ...p, loading: false }));
    }
  };

  const openEditModal = (row) => {
    setEditRow(row);
    setEditForm({
      status: row.status || 'PRESENT',
      shift_id: Number(row.shift_id || row.default_shift_id || 1),
      scan_in_time: (row.in_time || row.scan_in_time) ? String(row.in_time || row.scan_in_time).slice(0, 5) : '',
      scan_out_time: (row.out_time || row.scan_out_time) ? String(row.out_time || row.scan_out_time).slice(0, 5) : '',
      actual_line: row.actual_line || row.line || '',
      actual_team: row.actual_team || row.team_group || '',
      remark: row.remark || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline || !editRow) return;
    setSavingEdit(true);
    try {
      await manpowerOpsApi.updateLog({
        log_id: editRow.log_id,
        emp_id: editRow.emp_id,
        log_date: editRow.log_date || date,
        ...editForm,
      });
      showToast('บันทึกการแก้ไขเรียบร้อยแล้ว', 'success');
      setEditRow(null);
      await fetchList();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'บันทึกการแก้ไขไม่สำเร็จ', 'error');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteLog = async (row) => {
    if (!canEdit || !isOnline) return;
    if (!row.log_id || Number(row.log_id) <= 0) {
      showToast('รายการนี้ยังไม่มีประวัติ Log วันนี้ (เป็น Plan ลอย) — หากต้องการนำออกให้แก้ไขในข้อมูลพนักงาน', 'warning');
      return;
    }
    const ok = await confirm({
      title: 'ยืนยันการลบรายการวันนี้',
      message: `ต้องการลบ Log วันที่ ${row.log_date || date} ของ ${row.name_th} (${row.emp_id}) หรือไม่?`,
      confirmText: 'ลบรายการ',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await manpowerOpsApi.deleteLog(row.log_id);
      showToast('ลบรายการเรียบร้อยแล้ว', 'success');
      await fetchList();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'ลบรายการไม่สำเร็จ', 'error');
    }
  };

  const handleBatchStatus = async (nextStatus) => {
    setBatchOpen(false);
    if (!selectedRows.length || !canEdit || !isOnline) return;
    const ok = await confirm({
      title: `ยืนยันปรับสถานะเป็น ${nextStatus}`,
      message: `ต้องการอัปเดตสถานะของพนักงานที่เลือก ${selectedRows.length} คน เป็น ${nextStatus} หรือไม่?`,
      confirmText: 'ยืนยันทั้งหมด',
    });
    if (!ok) return;

    setBatchBusy(true);
    let successCount = 0;
    for (const r of selectedRows) {
      try {
        await manpowerOpsApi.updateLog({
          log_id: Number(r.log_id) > 0 ? r.log_id : 0,
          emp_id: r.emp_id,
          log_date: r.log_date || date,
          status: nextStatus,
          remark: r.remark || 'Batch Update',
        });
        successCount += 1;
      } catch {
        // Count continues for remaining rows
      }
    }
    setBatchBusy(false);
    showToast(`อัปเดตสำเร็จ ${successCount}/${selectedRows.length} รายการ`, successCount > 0 ? 'success' : 'error');
    await fetchList();
    onMutated?.();
  };

  const handleBatchReset = async () => {
    setBatchOpen(false);
    const validLogs = selectedRows.filter((r) => Number(r.log_id) > 0);
    if (!validLogs.length || !canEdit || !isOnline) {
      showToast('กรุณาเลือกรายการที่มี Log ในระบบแล้วอย่างน้อย 1 รายการ', 'warning');
      return;
    }
    const ok = await confirm({
      title: 'รีเซ็ตรายการที่เลือก',
      message: `ต้องการลบ Log ของพนักงาน ${validLogs.length} คน เพื่อให้ระบบซิงค์เวลาล่าสุดใหม่ใช่หรือไม่?`,
      confirmText: 'ยืนยันรีเซ็ต',
      variant: 'danger',
    });
    if (!ok) return;

    setBatchBusy(true);
    let done = 0;
    for (const r of validLogs) {
      try {
        await manpowerOpsApi.deleteLog(r.log_id);
        done += 1;
      } catch {
        // continue
      }
    }
    setBatchBusy(false);
    showToast(`รีเซ็ตข้อมูลแล้ว ${done} รายการ`, 'success');
    await fetchList();
    onMutated?.();
  };

  const handleBatchClearTimes = async () => {
    setBatchOpen(false);
    const logIds = selectedRows.map((r) => Number(r.log_id)).filter((id) => id > 0);
    if (!logIds.length || !canEdit || !isOnline) {
      showToast('กรุณาเลือกรายการที่มี Log ในระบบแล้วอย่างน้อย 1 รายการ', 'warning');
      return;
    }
    const ok = await confirm({
      title: 'ล้างเวลาสแกน / ตั้งเป็นวันหยุด',
      message: `ต้องการลบเวลาสแกนออกและตั้งเป็น HOLIDAY สำหรับ ${logIds.length} รายการ (ล็อกไม่ให้ Auto Sync ทับ) หรือไม่?`,
      confirmText: 'ยืนยันล้างเวลา',
      variant: 'warning',
    });
    if (!ok) return;

    setBatchBusy(true);
    try {
      await manpowerOpsApi.batchClearTimes(logIds);
      showToast(`ล้างเวลาสแกนแล้ว ${logIds.length} รายการ`, 'success');
      await fetchList();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'ล้างเวลาไม่สำเร็จ', 'error');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleConfirmBatchSwapShift = async (e) => {
    e.preventDefault();
    const payload = selectedRows
      .filter((r) => Number(r.log_id) > 0)
      .map((r) => ({ log_id: Number(r.log_id), new_shift_id: Number(swapShiftId) }));
    if (!payload.length) {
      showToast('ไม่พบ Log ID ที่สามารถสลับกะได้', 'warning');
      return;
    }
    setBatchBusy(true);
    try {
      const res = await manpowerOpsApi.batchQuickSwapShift(payload, swapFuture);
      showToast(res?.message || 'สลับกะเรียบร้อยแล้ว', 'success');
      setSwapModalOpen(false);
      await fetchList();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'สลับกะไม่สำเร็จ', 'error');
    } finally {
      setBatchBusy(false);
    }
  };

  const handleExport = () => {
    if (!displayedRows.length) return;
    const out = displayedRows.map((r) => ({
      Date: r.log_date || date,
      'Emp ID': r.emp_id,
      Name: r.name_th,
      Line: r.line || '-',
      Team: r.team_group || '-',
      Shift: r.shift_name || '-',
      In: r.in_time || r.scan_in_time || '-',
      Out: r.out_time || r.scan_out_time || '-',
      Status: r.status || '-',
      Remark: r.remark || '',
      'Cost (THB)': Number(r.normal_cost || 0) + Number(r.ot_cost || 0),
    }));
    exportRowsToExcel(out, 'Manpower_Detail', `Manpower_Detail_${filter.line || 'ALL'}_${date}.xlsx`);
    showToast('ส่งออกข้อมูลรายละเอียดเป็น Excel สำเร็จ', 'success');
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-2 sm:p-4 backdrop-blur-xs">
      <div className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Modal Header */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2.5 min-w-0">
            {historyTarget && (
              <button
                type="button"
                onClick={() => setHistoryTarget(null)}
                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                title="กลับรายชื่อประจำวัน"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div className="min-w-0">
              <h4 className="text-sm sm:text-base font-extrabold text-slate-800 dark:text-white truncate">
                {historyTarget
                  ? `ประวัติย้อนหลัง 30 วัน: ${historyTarget.name_th} (${historyTarget.emp_id})`
                  : (filter.title || 'รายละเอียดกำลังคนรายสายผลิต')}
              </h4>
              <p className="text-[11px] text-slate-500 flex flex-wrap items-center gap-x-2">
                <span>วันที่: {date}</span>
                <span>• กลุ่ม: {hcGroup}</span>
                {!historyTarget && filter.line && <span>• สาย: {filter.line}</span>}
                {!historyTarget && filter.shift && <span>• กะ: {filter.shift === '1' ? 'DAY' : filter.shift === '2' ? 'NIGHT' : filter.shift}</span>}
                {!historyTarget && filter.empType && filter.empType !== 'ALL' && <span>• ประเภท: {filter.empType}</span>}
                <span>• พบ {displayedRows.length} รายการ</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {!historyTarget && effectiveStatus !== 'ALL' && (
              <button
                type="button"
                onClick={() => setStatusOverride('ALL')}
                className="min-h-[34px] rounded-lg border border-amber-300 bg-amber-50 px-2.5 text-[11px] font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
              >
                ดูทุกสถานะ
              </button>
            )}
            {onOpenMaster && canEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onOpenMaster('');
                }}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <Settings className="h-3.5 w-3.5 text-indigo-500" />
                ตั้งค่าพนักงาน
              </button>
            )}
            {onOpenAttendanceTab && (
              <button
                type="button"
                onClick={() => {
                  onClose?.();
                  onOpenAttendanceTab(filter.line || 'ALL');
                }}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 text-[11px] font-bold text-white hover:bg-indigo-700"
              >
                หน้าลงเวลาเต็ม <ExternalLink className="h-3 w-3" />
              </button>
            )}
            <button
              type="button"
              onClick={handleExport}
              disabled={!displayedRows.length}
              className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Download className="h-3.5 w-3.5" /> Excel
            </button>
            <button type="button" onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Filter & Batch Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-800/60">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[180px] max-w-xs">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาชื่อ, รหัส, สถานะ, หมายเหตุ..."
                className="min-h-[38px] w-full rounded-lg border border-slate-300 bg-white pl-8 pr-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>

            {!historyTarget && (
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="min-h-[38px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              >
                <option value="ALL">ทุกทีม (All Teams)</option>
                {uniqueTeams.map((tm) => (
                  <option key={tm} value={tm}>ทีม {tm}</option>
                ))}
              </select>
            )}

            <button
              type="button"
              onClick={fetchList}
              className="min-h-[38px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              title="โหลดซ้ำ"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {canEdit && !historyTarget && (
            <div className="relative" ref={batchRef}>
              <button
                type="button"
                disabled={batchBusy || !isOnline}
                onClick={() => setBatchOpen((v) => !v)}
                className="min-h-[38px] inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
              >
                <CheckSquare className="h-3.5 w-3.5" />
                จัดการหลายรายการ ({selectedIdsCount(selectedEmpIds)})
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {batchOpen && (
                <div className="absolute right-0 mt-1.5 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-40 dark:border-slate-700 dark:bg-slate-800 text-xs">
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400">ตั้งสถานะ (Set Status)</div>
                  {[
                    { code: 'PRESENT', label: 'มาทำงาน (PRESENT)' },
                    { code: 'ABSENT', label: 'ขาดงาน (ABSENT)' },
                    { code: 'SICK', label: 'ลาป่วย (SICK)' },
                    { code: 'BUSINESS', label: 'ลากิจ (BUSINESS)' },
                    { code: 'VACATION', label: 'พักร้อน (VACATION)' },
                  ].map((opt) => (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() => handleBatchStatus(opt.code)}
                      className="block w-full rounded-lg px-2.5 py-1.5 text-left font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                    >
                      {opt.label}
                    </button>
                  ))}
                  <div className="my-1 border-t border-slate-100 dark:border-slate-700" />
                  <div className="px-2.5 py-1 text-[10px] font-bold uppercase text-slate-400">เครื่องมือจัดการ</div>
                  <button
                    type="button"
                    onClick={() => {
                      setBatchOpen(false);
                      if (!selectedRows.length) return showToast('กรุณาเลือกพนักงานอย่างน้อย 1 คน', 'warning');
                      setSwapModalOpen(true);
                    }}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-300 dark:hover:bg-slate-700"
                  >
                    สลับกะ (Swap Shift / Master)
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchClearTimes}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left font-semibold text-amber-600 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-slate-700"
                  >
                    ล้างเวลาสแกน (ตั้งวันหยุด)
                  </button>
                  <button
                    type="button"
                    onClick={handleBatchReset}
                    className="block w-full rounded-lg px-2.5 py-1.5 text-left font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-slate-700"
                  >
                    รีเซ็ตข้อมูลที่เลือก (ลบ Log)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Table Body */}
        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <tr>
                <th className="px-3 py-2.5 w-10 text-center">
                  {historyTarget ? (
                    'วันที่'
                  ) : (
                    <input type="checkbox" checked={allChecked} onChange={toggleAll} className="h-4 w-4 rounded" />
                  )}
                </th>
                <th className="px-3 py-2.5">พนักงาน</th>
                <th className="px-2.5 py-2.5">ไลน์ / ทีม</th>
                <th className="px-2.5 py-2.5 text-center">กะ</th>
                <th className="px-2.5 py-2.5 text-center">เวลาเข้า</th>
                <th className="px-2.5 py-2.5 text-center">เวลาออก</th>
                <th className="px-2.5 py-2.5 text-center">สถานะ / ตรวจสอบ</th>
                <th className="px-2.5 py-2.5">หมายเหตุ</th>
                <th className="px-2.5 py-2.5 text-right">ต้นทุน (฿)</th>
                <th className="px-3 py-2.5 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading && displayedRows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">กำลังโหลดรายละเอียดพนักงาน...</td></tr>
              ) : displayedRows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-400">ไม่พบรายการพนักงานตามเงื่อนไขนี้</td></tr>
              ) : (
                displayedRows.map((row) => {
                  const isNight = Number(row.shift_id || row.default_shift_id) === 2;
                  const forgotOut = Number(row.is_forgot_out) === 1;
                  const orphanScan = ((!row.in_time && row.out_time) || (row.in_time && !row.out_time)) && !checkStillWorkingShift(row);
                  const rowCost = Number(row.normal_cost || 0) + Number(row.ot_cost || 0);
                  const badge = STATUS_BADGES[row.status] || STATUS_BADGES.WAITING;
                  const checked = selectedEmpIds.includes(row.emp_id);

                  return (
                    <tr
                      key={`${row.emp_id}-${row.log_id || 0}-${row.log_date}`}
                      className={
                        forgotOut
                          ? 'bg-rose-50/70 dark:bg-rose-950/20'
                          : orphanScan
                            ? 'bg-amber-50/70 dark:bg-amber-950/20'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }
                    >
                      <td className="px-3 py-2 text-center font-mono">
                        {historyTarget ? (
                          <span className="font-bold text-indigo-600 dark:text-indigo-300">{String(row.log_date || '').slice(5)}</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleOne(row.emp_id)}
                            className="h-4 w-4 rounded"
                          />
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => openProfile(row.emp_id)}
                          className="text-left font-bold text-slate-800 hover:text-indigo-600 hover:underline dark:text-white dark:hover:text-indigo-300"
                          title="คลิกเพื่อดูโปรไฟล์"
                        >
                          {row.name_th}
                        </button>
                        <div className="font-mono text-[10px] text-slate-400">
                          {row.emp_id} · {row.position || '-'}
                        </div>
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{row.actual_line || row.line || '-'}</div>
                        <div className="text-[10px] text-slate-400">{row.actual_team || row.team_group || '-'}</div>
                      </td>
                      <td className="px-2.5 py-2 text-center">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${isNight ? 'bg-slate-800 text-amber-300' : 'bg-sky-100 text-sky-700 dark:bg-sky-950/60 dark:text-sky-300'}`}>
                          {isNight ? <Moon className="h-3 w-3" /> : <Sun className="h-3 w-3" />}
                          {isNight ? 'NIGHT' : 'DAY'}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {row.in_time || (orphanScan ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">ลืมรูด</span> : '-')}
                      </td>
                      <td className="px-2.5 py-2 text-center font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {forgotOut
                          ? <span className="rounded bg-rose-600 px-1.5 py-0.5 text-[10px] text-white">ลืมรูดออก</span>
                          : (row.out_time || (orphanScan ? <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">ลืมรูด</span> : '-'))}
                      </td>
                      <td className="px-2.5 py-2 text-center">
                        <span className={`inline-block rounded border px-2 py-0.5 text-[10px] font-bold ${badge.cls}`}>{badge.label}</span>
                        {orphanScan && (
                          <div className="mt-1 inline-flex items-center gap-0.5 rounded bg-rose-100 px-1.5 py-0.5 text-[9px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                            <AlertTriangle className="h-2.5 w-2.5" /> ตรวจทานเวลา
                          </div>
                        )}
                      </td>
                      <td className="px-2.5 py-2 max-w-[160px] truncate text-slate-500" title={row.remark || ''}>
                        {row.remark || '-'}
                      </td>
                      <td className="px-2.5 py-2 text-right font-mono font-bold text-slate-700 dark:text-slate-200">
                        {rowCost > 0 ? `฿${formatMoney(rowCost)}` : '-'}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <div className="inline-flex items-center gap-1">
                          {canEdit && (
                            <button
                              type="button"
                              onClick={() => openEditModal(row)}
                              className="rounded border border-slate-200 p-1.5 text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:text-indigo-400"
                              title="แก้ไขรายการลงเวลา"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!historyTarget && (
                            <button
                              type="button"
                              onClick={() => setHistoryTarget({ emp_id: row.emp_id, name_th: row.name_th })}
                              className="rounded border border-slate-200 p-1.5 text-sky-600 hover:bg-sky-50 dark:border-slate-700 dark:text-sky-400"
                              title="ดูประวัติ 30 วัน"
                            >
                              <History className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {onOpenMaster && canEdit && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose?.();
                                onOpenMaster(row.emp_id);
                              }}
                              className="rounded border border-slate-200 p-1.5 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300"
                              title="เปิดจัดการพนักงานใน Master"
                            >
                              <User className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canEdit && Number(row.log_id) > 0 && (
                            <button
                              type="button"
                              onClick={() => handleDeleteLog(row)}
                              className="rounded border border-slate-200 p-1.5 text-rose-500 hover:bg-rose-50 dark:border-slate-700"
                              title="ลบรายการวันนี้"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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

        {/* Footer legend */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-700 dark:bg-slate-800/70">
          <div>สีแดง/เหลือง = พบสแกนไม่ครบคู่หรือลืมรูดบัตร (คลิกดินสอเพื่อปรับแก้เวลา) · คลิกชื่อพนักงานเพื่อดูโปรไฟล์</div>
          <button type="button" onClick={onClose} className="rounded-lg border border-slate-300 bg-white px-3 py-1 font-bold text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200">
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* Inline Edit Log Modal */}
      {editRow && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3">
          <form onSubmit={handleSaveEdit} className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <div>
                <h5 className="text-sm font-bold text-slate-800 dark:text-white">แก้ไขรายการลงเวลา: {editRow.name_th}</h5>
                <div className="text-[11px] text-slate-500 font-mono">{editRow.emp_id} · วันที่ {editRow.log_date || date}</div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openProfile(editRow.emp_id)}
                  className="rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-100"
                >
                  ดูโปรไฟล์
                </button>
                <button type="button" onClick={() => setEditRow(null)} className="p-1 text-slate-400">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="mb-1 block font-semibold">สายผลิตวันนั้น (Recorded Line)</label>
                <select
                  value={editForm.actual_line}
                  onChange={(e) => setEditForm((f) => ({ ...f, actual_line: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2.5 dark:border-slate-600 dark:bg-slate-800"
                >
                  <option value="">-- ตามข้อมูลหลัก --</option>
                  {(structure?.lines || []).map((ln) => <option key={ln} value={ln}>{ln}</option>)}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">ทีม (Team)</label>
                <input
                  type="text"
                  value={editForm.actual_team}
                  onChange={(e) => setEditForm((f) => ({ ...f, actual_team: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2.5 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">สถานะ (Status)</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2.5 dark:border-slate-600 dark:bg-slate-800"
                >
                  {Object.entries(STATUS_BADGES).map(([code, m]) => (
                    <option key={code} value={code}>{code} ({m.label})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">กะทำงาน (Shift)</label>
                <select
                  value={editForm.shift_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, shift_id: Number(e.target.value) }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2.5 dark:border-slate-600 dark:bg-slate-800"
                >
                  {(structure?.shifts || []).map((s) => (
                    <option key={s.shift_id} value={s.shift_id}>{s.shift_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block font-semibold">สแกนเข้า (Scan In)</label>
                <input
                  type="time"
                  value={editForm.scan_in_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, scan_in_time: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2.5 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block font-semibold">สแกนออก (Scan Out)</label>
                <input
                  type="time"
                  value={editForm.scan_out_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, scan_out_time: e.target.value }))}
                  className="min-h-[40px] w-full rounded-lg border border-slate-300 px-2.5 dark:border-slate-600 dark:bg-slate-800"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold">หมายเหตุ</label>
              <input
                type="text"
                value={editForm.remark}
                onChange={(e) => setEditForm((f) => ({ ...f, remark: e.target.value }))}
                className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600 dark:bg-slate-800"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setEditRow(null)} className="min-h-[40px] rounded-lg border px-4 text-xs font-semibold dark:border-slate-600">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingEdit || !isOnline}
                className="min-h-[40px] rounded-lg bg-indigo-600 px-5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingEdit ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Batch Swap Shift Modal */}
      {swapModalOpen && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/60 p-3">
          <form onSubmit={handleConfirmBatchSwapShift} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4">
            <h5 className="text-sm font-bold text-slate-800 dark:text-white">สลับกะพนักงานที่เลือก ({selectedRows.length} คน)</h5>
            <div>
              <label className="mb-1 block text-xs font-semibold">เลือกกะใหม่</label>
              <select
                value={swapShiftId}
                onChange={(e) => setSwapShiftId(e.target.value)}
                className="min-h-[42px] w-full rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600 dark:bg-slate-800"
              >
                {(structure?.shifts || [{ shift_id: 1, shift_name: 'DAY (กะเช้า)' }, { shift_id: 2, shift_name: 'NIGHT (กะดึก)' }]).map((s) => (
                  <option key={s.shift_id} value={String(s.shift_id)}>{s.shift_name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              <input type="checkbox" checked={swapFuture} onChange={(e) => setSwapFuture(e.target.checked)} className="h-4 w-4 rounded" />
              อัปเดตกะหลักถาวรในวันถัดๆ ไปด้วย (Apply Future)
            </label>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setSwapModalOpen(false)} className="min-h-[40px] rounded-lg border px-4 text-xs font-semibold dark:border-slate-600">ยกเลิก</button>
              <button type="submit" disabled={batchBusy} className="min-h-[40px] rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700">
                {batchBusy ? 'กำลังบันทึก...' : 'ยืนยันสลับกะ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Employee Quick Profile Overlay */}
      {profileModal.open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-2.5 dark:border-slate-700">
              <h5 className="font-bold text-sm text-slate-800 dark:text-white flex items-center gap-2">
                <User className="h-4 w-4 text-indigo-500" /> โปรไฟล์พนักงาน
              </h5>
              <button type="button" onClick={() => setProfileModal({ open: false, loading: false, data: null })} className="p-1 text-slate-400">
                <X className="h-4 w-4" />
              </button>
            </div>
            {profileModal.loading ? (
              <div className="py-8 text-center text-slate-400">กำลังโหลด...</div>
            ) : !profileModal.data ? (
              <div className="py-8 text-center text-slate-400">ไม่พบข้อมูล</div>
            ) : (
              <div className="space-y-2.5">
                <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <div className="text-sm font-bold text-slate-900 dark:text-white">{profileModal.data.name_th}</div>
                  <div className="font-mono text-[11px] text-slate-500">{profileModal.data.emp_id} · {profileModal.data.position || '-'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg border p-2 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">สาย / ทีม</div>
                    <div className="font-bold">{profileModal.data.line || '-'} ({profileModal.data.team_group || '-'})</div>
                  </div>
                  <div className="rounded-lg border p-2 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">กลุ่ม HC / เบอร์โทร</div>
                    <div className="font-bold">{profileModal.data.hc_group || '-'} · {profileModal.data.phone || '-'}</div>
                  </div>
                </div>
                {onOpenMaster && canEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      const eid = profileModal.data.emp_id;
                      setProfileModal({ open: false, loading: false, data: null });
                      onClose?.();
                      onOpenMaster(eid);
                    }}
                    className="w-full min-h-[38px] rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700"
                  >
                    แก้ไขข้อมูลพนักงานใน Master Data →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>,
    document.body
  );
}

function selectedIdsCount(arr) {
  return Array.isArray(arr) ? arr.length : 0;
}

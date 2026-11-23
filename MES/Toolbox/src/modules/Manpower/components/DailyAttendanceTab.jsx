import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Edit3, Trash2, AlertTriangle, CheckCircle2, ArrowLeftRight,
  Fingerprint, Award, RefreshCw, X, CheckSquare, CalendarX, Eraser, User, Settings
} from 'lucide-react';
import { manpowerOpsApi, manpowerMasterApi } from '../../../shared/services/manpowerApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
import { STATUS_BADGES, formatNumber, offsetIsoDate, exportRowsToExcel } from '../utils/manpowerHelpers';

const ANOMALY_LABELS = {
  DAY_BUT_NIGHT_SCAN: 'กะเช้าแต่สแกนเข้ากลางคืน',
  DAY_ABNORMAL_SCAN: 'กะเช้าสแกนเวลาผิดปกติ',
  NIGHT_ABNORMAL_SCAN: 'กะดึกสแกนเวลาผิดปกติ',
  LATE_SUSPECT: 'มาสาย (ตรวจสอบเวลา)',
  ORPHAN_OUT: 'มีสแกนออกแต่ไม่มีสแกนเข้า',
  MISSING_IN_SCAN: 'ไม่พบสแกนเข้างาน',
  SCAN_MISMATCH: 'เวลาสแกนไม่ตรงกะ',
};

export default function DailyAttendanceTab({
  date,
  hcGroup,
  structure,
  initialLineFilter = 'ALL',
  canEdit,
  isOnline,
  refreshSignal,
  onMutated,
  onOpenMaster,
}) {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  const [lineFilter, setLineFilter] = useState(initialLineFilter || 'ALL');
  const [shiftFilter, setShiftFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);

  // Anomaly Drawer / Section
  const [showAnomalies, setShowAnomalies] = useState(false);
  const [anomalies, setAnomalies] = useState([]);
  const [selectedAnomalyIds, setSelectedAnomalyIds] = useState([]);
  const [anomalyLoading, setAnomalyLoading] = useState(false);

  // Edit Log Modal
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
  const [saving, setSaving] = useState(false);

  // Raw Central Scans Modal
  const [rawModalOpen, setRawModalOpen] = useState(false);
  const [rawScans, setRawScans] = useState([]);
  const [rawLoading, setRawLoading] = useState(false);
  const [rawSearch, setRawSearch] = useState('');
  const [rawRange, setRawRange] = useState(() => ({
    startDate: date,
    endDate: offsetIsoDate(date, 1),
  }));

  // Reset Day Choice Modal (Soft vs Hard Reset)
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Employee Profile Quick-View Modal
  const [profileModal, setProfileModal] = useState({ open: false, loading: false, data: null });

  // YTD KPI Modal
  const [kpiModalOpen, setKpiModalOpen] = useState(false);
  const [kpiRange, setKpiRange] = useState(() => ({
    startDate: `${date.slice(0, 4)}-01-01`,
    endDate: date,
  }));
  const [kpiRows, setKpiRows] = useState([]);
  const [kpiLoading, setKpiLoading] = useState(false);
  const [kpiSearch, setKpiSearch] = useState('');

  useEffect(() => {
    if (initialLineFilter) {
      setLineFilter(initialLineFilter);
    }
  }, [initialLineFilter]);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await manpowerOpsApi.readDaily({
        date,
        line: lineFilter,
        hcGroup,
        shift: shiftFilter,
        status: statusFilter,
      });
      setLogs(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดตารางลงเวลาได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [date, lineFilter, hcGroup, shiftFilter, statusFilter, showToast]);

  const fetchAnomalies = useCallback(async () => {
    setAnomalyLoading(true);
    try {
      const res = await manpowerOpsApi.detectShiftSwaps({
        startDate: offsetIsoDate(date, -3),
        endDate: date,
        hcGroup,
      });
      setAnomalies(Array.isArray(res?.data) ? res.data : []);
      setSelectedAnomalyIds([]);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถตรวจสอบความผิดปกติการสแกนได้', 'error');
    } finally {
      setAnomalyLoading(false);
    }
  }, [date, hcGroup, showToast]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs, refreshSignal]);

  useEffect(() => {
    if (showAnomalies) {
      fetchAnomalies();
    }
  }, [showAnomalies, fetchAnomalies, refreshSignal]);

  const filteredLogs = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return logs;
    return logs.filter((r) =>
      String(r.emp_id || '').toLowerCase().includes(q)
      || String(r.name_th || '').toLowerCase().includes(q)
      || String(r.line || '').toLowerCase().includes(q)
      || String(r.position || '').toLowerCase().includes(q)
    );
  }, [logs, search]);

  const openEdit = (row) => {
    setEditRow(row);
    setEditForm({
      status: row.status || 'PRESENT',
      shift_id: Number(row.shift_id || 1),
      scan_in_time: row.scan_in_time ? String(row.scan_in_time).slice(0, 5) : '',
      scan_out_time: row.scan_out_time ? String(row.scan_out_time).slice(0, 5) : '',
      actual_line: row.line || '',
      actual_team: row.team_group || '',
      remark: row.remark || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!canEdit || !isOnline || !editRow) return;
    setSaving(true);
    try {
      await manpowerOpsApi.updateLog({
        log_id: editRow.log_id,
        emp_id: editRow.emp_id,
        log_date: editRow.log_date || date,
        ...editForm,
      });
      showToast('อัปเดตบันทึกเวลาเรียบร้อยแล้ว', 'success');
      setEditRow(null);
      fetchLogs();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'บันทึกการแก้ไขไม่สำเร็จ', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleQuickStatus = async (row, newStatus) => {
    if (!canEdit || !isOnline) return;
    try {
      await manpowerOpsApi.updateLogStatus(row.log_id, newStatus, {
        emp_id: row.emp_id,
        log_date: row.log_date || date,
      });
      showToast('อัปเดตสถานะเรียบร้อยแล้ว', 'success');
      fetchLogs();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถเปลี่ยนสถานะได้', 'error');
    }
  };

  const handleDeleteLog = async (row) => {
    if (!canEdit || !isOnline) return;
    const ok = await confirm({
      title: 'ยืนยันการลบรายการลงเวลา',
      message: `ต้องการลบรายการลงเวลาของ ${row.emp_id} (${row.name_th}) ประจำวันที่ ${row.log_date} ใช่หรือไม่?`,
      confirmText: 'ลบรายการ',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      await manpowerOpsApi.deleteLog(row.log_id);
      showToast('ลบรายการลงเวลาเรียบร้อยแล้ว', 'success');
      fetchLogs();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'ลบรายการไม่สำเร็จ', 'error');
    }
  };

  const handleClearDay = () => {
    if (!canEdit || !isOnline) return;
    setResetModalOpen(true);
  };

  const executeClearDay = async (hardReset) => {
    if (!canEdit || !isOnline) return;
    setResetting(true);
    try {
      const res = await manpowerOpsApi.clearDay(date, hardReset);
      showToast(res?.message || 'ล้างข้อมูลเรียบร้อยแล้ว', 'success');
      setResetModalOpen(false);
      fetchLogs();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถล้างข้อมูลประจำวันได้', 'error');
    } finally {
      setResetting(false);
    }
  };

  const openEmployeeProfile = async (empId) => {
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

  const toggleAnomalyId = (id) => {
    setSelectedAnomalyIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBatchConfirmAnomalies = async () => {
    if (!canEdit || !isOnline || !selectedAnomalyIds.length) return;
    try {
      await manpowerOpsApi.batchConfirmAnomaly(selectedAnomalyIds);
      showToast(`ยืนยันความถูกต้อง ${selectedAnomalyIds.length} รายการเรียบร้อย`, 'success');
      fetchAnomalies();
      fetchLogs();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถยืนยันรายการได้', 'error');
    }
  };

  const handleBatchSwapAnomalies = async (applyFuture = false) => {
    if (!canEdit || !isOnline || !selectedAnomalyIds.length) return;
    const payload = selectedAnomalyIds.map((id) => {
      const row = anomalies.find((a) => Number(a.log_id) === Number(id));
      const nextShift = Number(row?.shift_id) === 1 ? 2 : 1;
      return { log_id: id, new_shift_id: nextShift };
    });
    try {
      await manpowerOpsApi.batchQuickSwapShift(payload, applyFuture);
      showToast(`สลับกะและคำนวณเวลาใหม่ ${payload.length} รายการเรียบร้อย`, 'success');
      fetchAnomalies();
      fetchLogs();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'สลับกะไม่สำเร็จ', 'error');
    }
  };

  const handleBatchClearTimes = async () => {
    if (!canEdit || !isOnline || !selectedAnomalyIds.length) return;
    const ok = await confirm({
      title: 'ตั้งเป็นวันหยุด (Clear Times)',
      message: `ต้องการล้างเวลาสแกนและปรับสถานะเป็น HOLIDAY สำหรับ ${selectedAnomalyIds.length} รายการที่เลือกหรือไม่?`,
      confirmText: 'ยืนยันปรับเป็นวันหยุด',
      variant: 'warning',
    });
    if (!ok) return;
    try {
      await manpowerOpsApi.batchClearTimes(selectedAnomalyIds);
      showToast('ล้างเวลาและตั้งสถานะ HOLIDAY เรียบร้อย', 'success');
      fetchAnomalies();
      fetchLogs();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถล้างเวลาได้', 'error');
    }
  };

  const handleSingleSwapShift = async (row) => {
    if (!canEdit || !isOnline) return;
    const nextShiftId = Number(row.shift_id) === 1 ? 2 : 1;
    try {
      await manpowerOpsApi.quickSwapShift(row.log_id, nextShiftId, false);
      showToast(`สลับกะ ${row.emp_id} เป็น ${nextShiftId === 2 ? 'Night' : 'Day'} เรียบร้อย`, 'success');
      fetchAnomalies();
      fetchLogs();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'สลับกะไม่สำเร็จ', 'error');
    }
  };

  const fetchRawCentralData = async (customRange) => {
    const r = customRange || rawRange;
    setRawLoading(true);
    try {
      const res = await manpowerOpsApi.fetchRawCentralScans({
        start_date: r.startDate,
        end_date: r.endDate,
      });
      setRawScans(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถเชื่อมต่อระบบสแกนนิ้วกลางได้', 'error');
    } finally {
      setRawLoading(false);
    }
  };

  const handleOpenRawScans = async () => {
    const nextRange = { startDate: date, endDate: offsetIsoDate(date, 1) };
    setRawRange(nextRange);
    setRawSearch('');
    setRawModalOpen(true);
    await fetchRawCentralData(nextRange);
  };

  const handleLoadKpi = async (customRange) => {
    const r = customRange || kpiRange;
    setKpiLoading(true);
    try {
      const res = await manpowerOpsApi.readKpiSummary({
        startDate: r.startDate,
        endDate: r.endDate,
        hcGroup,
      });
      setKpiRows(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดข้อมูล KPI รายบุคคลได้', 'error');
    } finally {
      setKpiLoading(false);
    }
  };

  const openKpiModal = () => {
    const r = { startDate: `${date.slice(0, 4)}-01-01`, endDate: date };
    setKpiRange(r);
    setKpiModalOpen(true);
    handleLoadKpi(r);
  };

  const filteredKpiRows = useMemo(() => {
    const q = kpiSearch.trim().toLowerCase();
    if (!q) return kpiRows;
    return kpiRows.filter((k) =>
      String(k.emp_id || '').toLowerCase().includes(q)
      || String(k.name_th || '').toLowerCase().includes(q)
      || String(k.line || '').toLowerCase().includes(q)
    );
  }, [kpiRows, kpiSearch]);

  const filteredRawScans = useMemo(() => {
    const q = rawSearch.trim().toLowerCase();
    if (!q) return rawScans.slice(0, 300);
    return rawScans.filter((r) =>
      String(r.EMPID || '').toLowerCase().includes(q)
      || String(r.NAME || r.EMPNAME || '').toLowerCase().includes(q)
      || String(r.POSITION || '').toLowerCase().includes(q)
      || String(r.DEPARTMENT || '').toLowerCase().includes(q)
      || String(r.TIMEINOUT || '').toLowerCase().includes(q)
    ).slice(0, 300);
  }, [rawScans, rawSearch]);

  return (
    <div className="space-y-4">
      {/* Action & Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหารหัส / ชื่อ / สายผลิต..."
              className="min-h-[44px] w-56 rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          </div>

          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">ทุกสายผลิต (All Lines)</option>
            {(structure?.lines || []).map((ln) => (
              <option key={ln} value={ln}>{ln}</option>
            ))}
          </select>

          <select
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">ทุกกะ (All Shifts)</option>
            {(structure?.shifts || []).map((s) => (
              <option key={s.shift_id} value={s.shift_name}>{s.shift_name}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">ทุกสถานะ</option>
            {Object.entries(STATUS_BADGES).map(([code, meta]) => (
              <option key={code} value={code}>{code} ({meta.label})</option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowAnomalies((v) => !v)}
            className={`min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition ${
              showAnomalies
                ? 'border-amber-400 bg-amber-100 text-amber-800 dark:border-amber-600 dark:bg-amber-950/60 dark:text-amber-300'
                : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/30 dark:text-amber-300'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            ตรวจความผิดปกติ / สลับกะ
          </button>

          <button
            type="button"
            onClick={handleOpenRawScans}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <Fingerprint className="h-4 w-4 text-cyan-600" />
            ประวัติสแกนนิ้วกลาง
          </button>

          <button
            type="button"
            onClick={openKpiModal}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-indigo-300 bg-indigo-50 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300"
          >
            <Award className="h-4 w-4" />
            สถิติรายคน (YTD)
          </button>

          {canEdit && onOpenMaster && (
            <button
              type="button"
              onClick={() => onOpenMaster('')}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              title="ทางลัดไปจัดการรายชื่อ/กะ/ค่าจ้างพนักงาน"
            >
              <Settings className="h-4 w-4 text-indigo-500" />
              ข้อมูลพนักงาน
            </button>
          )}

          {canEdit && (
            <button
              type="button"
              disabled={!isOnline}
              onClick={handleClearDay}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
            >
              <CalendarX className="h-4 w-4" />
              รีเซ็ตวัน
            </button>
          )}
        </div>
      </div>

      {/* Anomaly Audit Collapsible Panel */}
      {showAnomalies && (
        <div className="rounded-xl border border-amber-300 bg-amber-50/70 p-4 dark:border-amber-800 dark:bg-amber-950/20 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="flex items-center gap-2 text-sm font-bold text-amber-900 dark:text-amber-200">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                รายการสแกนผิดปกติ / สลับกะ (ย้อนหลัง 3 วันถึง {date}) — พบ {anomalies.length} รายการ
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300/80">
                เลือกรายการเพื่อยืนยันความถูกต้อง สลับกะพร้อมดึงเวลาสแกนใหม่ หรือตั้งเป็นวันหยุด
              </p>
            </div>
            {canEdit && selectedAnomalyIds.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={handleBatchConfirmAnomalies}
                  className="min-h-[40px] inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  ยืนยันปกติ ({selectedAnomalyIds.length})
                </button>
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => handleBatchSwapAnomalies(false)}
                  className="min-h-[40px] inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  สลับกะเฉพาะวันนี้
                </button>
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={() => handleBatchSwapAnomalies(true)}
                  className="min-h-[40px] inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  สลับกะถาวร (Apply Future)
                </button>
                <button
                  type="button"
                  disabled={!isOnline}
                  onClick={handleBatchClearTimes}
                  className="min-h-[40px] inline-flex items-center gap-1 rounded-lg bg-slate-600 px-3 text-xs font-semibold text-white hover:bg-slate-700 disabled:opacity-50"
                >
                  <Eraser className="h-3.5 w-3.5" />
                  ตั้งเป็นวันหยุด
                </button>
              </div>
            )}
          </div>

          <div className="overflow-x-auto rounded-lg border border-amber-200 bg-white dark:border-amber-800/50 dark:bg-slate-900">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="bg-amber-100/70 font-bold text-amber-900 dark:bg-slate-800 dark:text-amber-200">
                <tr>
                  <th className="px-3 py-2 w-10">
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedAnomalyIds(
                          selectedAnomalyIds.length === anomalies.length
                            ? []
                            : anomalies.map((a) => Number(a.log_id))
                        )
                      }
                      className="p-1"
                    >
                      <CheckSquare className="h-4 w-4" />
                    </button>
                  </th>
                  <th className="px-3 py-2">วันที่</th>
                  <th className="px-3 py-2">พนักงาน</th>
                  <th className="px-3 py-2">กะเดิม</th>
                  <th className="px-3 py-2">เข้า - ออก</th>
                  <th className="px-3 py-2">สาเหตุที่ตรวจพบ</th>
                  <th className="px-3 py-2 text-right">ดำเนินการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {anomalyLoading ? (
                  <tr><td colSpan={7} className="p-4 text-center text-slate-400">กำลังตรวจสอบ...</td></tr>
                ) : anomalies.length === 0 ? (
                  <tr><td colSpan={7} className="p-4 text-center text-emerald-600">ไม่พบรายการผิดปกติที่รอตรวจสอบ</td></tr>
                ) : (
                  anomalies.map((a) => {
                    const idNum = Number(a.log_id);
                    const checked = selectedAnomalyIds.includes(idNum);
                    return (
                      <tr key={idNum} className="hover:bg-amber-50/40 dark:hover:bg-slate-800/50">
                        <td className="px-3 py-2">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => toggleAnomalyId(idNum)}
                            className="h-4 w-4 rounded"
                          />
                        </td>
                        <td className="px-3 py-2 font-mono">{a.log_date}</td>
                        <td className="px-3 py-2">
                          <div className="font-semibold text-slate-800 dark:text-white">{a.name_th}</div>
                          <div className="text-[11px] text-slate-500">{a.emp_id}</div>
                        </td>
                        <td className="px-3 py-2">{a.shift_name || `Shift #${a.shift_id}`}</td>
                        <td className="px-3 py-2 font-mono">
                          {a.scan_in || '--:--'} - {a.scan_out || '--:--'}
                        </td>
                        <td className="px-3 py-2">
                          <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:bg-amber-900/50 dark:text-amber-200">
                            {ANOMALY_LABELS[a.detect_type] || a.detect_type}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right space-x-1">
                          {canEdit && (
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => handleSingleSwapShift(a)}
                              className="inline-flex items-center gap-1 rounded bg-indigo-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
                            >
                              <ArrowLeftRight className="h-3 w-3" />
                              สลับกะ
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
        </div>
      )}

      {/* Main Daily Attendance Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            รายชื่อพนักงานลงเวลาประจำวันที่ {date} ({formatNumber(filteredLogs.length)} รายการ)
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />}
        </div>

        {/* Mobile Responsive Cards View */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-700/70">
          {filteredLogs.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-slate-400">
              ไม่พบรายการลงเวลาตามเงื่อนไขที่เลือก
            </div>
          ) : (
            filteredLogs.map((row) => {
              const badge = STATUS_BADGES[row.status] || STATUS_BADGES.WAITING;
              return (
                <div key={`${row.emp_id}-${row.log_id || 0}`} className="p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 font-bold text-sm text-slate-800 dark:text-white truncate">
                        <span className="truncate">{row.name_th}</span>
                        {Number(row.is_verified) === 1 && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {row.emp_id} • {row.line || '-'} ({row.team_group || '-'}) • กะ {row.shift_name || 'Day'}
                      </div>
                    </div>
                    {canEdit && isOnline ? (
                      <select
                        value={row.status || 'WAITING'}
                        onChange={(e) => handleQuickStatus(row, e.target.value)}
                        className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold ${badge.cls}`}
                      >
                        {Object.entries(STATUS_BADGES).map(([code, meta]) => (
                          <option key={code} value={code}>{meta.label}</option>
                        ))}
                      </select>
                    ) : (
                      <span className={`shrink-0 inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                        {badge.label}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2 text-xs dark:bg-slate-900/60">
                    <div className="flex items-center gap-3 font-mono">
                      <span>เข้า: <strong>{row.scan_in_time ? String(row.scan_in_time).slice(0, 5) : '--:--'}</strong></span>
                      <span>ออก: <strong>{row.scan_out_time ? String(row.scan_out_time).slice(0, 5) : '--:--'}</strong></span>
                      {Number(row.ot_hours || 0) > 0 && (
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          OT {Number(row.ot_hours).toFixed(1)}h
                        </span>
                      )}
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={!isOnline}
                          onClick={() => openEdit(row)}
                          className="min-h-[34px] px-2.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          แก้ไข
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[900px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">รหัส / ชื่อพนักงาน</th>
                <th className="px-3 py-3">สายผลิต / ทีม</th>
                <th className="px-3 py-3">กลุ่มจ้าง</th>
                <th className="px-3 py-3">กะ (Shift)</th>
                <th className="px-3 py-3">เวลาเข้า</th>
                <th className="px-3 py-3">เวลาออก</th>
                <th className="px-3 py-3 text-right">OT (ชม.)</th>
                <th className="px-3 py-3">สถานะ</th>
                <th className="px-3 py-3">หมายเหตุ</th>
                {canEdit && <th className="px-4 py-3 text-right">จัดการ</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/70">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={canEdit ? 10 : 9} className="px-4 py-8 text-center text-slate-400">
                    ไม่พบรายการลงเวลาตามเงื่อนไขที่เลือก
                  </td>
                </tr>
              ) : (
                filteredLogs.map((row) => {
                  const badge = STATUS_BADGES[row.status] || STATUS_BADGES.WAITING;
                  return (
                    <tr key={`${row.emp_id}-${row.log_id || 0}`} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-white">
                          <span>{row.name_th}</span>
                          {Number(row.is_verified) === 1 && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" title={`ยืนยันโดย ${row.verified_by || 'System'}`} />
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {row.emp_id} • {row.position || '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="font-semibold text-slate-700 dark:text-slate-200">{row.line || '-'}</div>
                        <div className="text-[11px] text-slate-400">{row.team_group || '-'} ({row.hc_group || 'TEAM 1'})</div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div>{row.emp_type || '-'}</div>
                        <div className="text-[10px] text-slate-400">{row.rate_type}</div>
                      </td>
                      <td className="px-3 py-2.5 font-medium">{row.shift_name || 'Day'}</td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {row.scan_in_time ? String(row.scan_in_time).slice(0, 5) : '--:--'}
                      </td>
                      <td className="px-3 py-2.5 font-mono font-semibold text-slate-700 dark:text-slate-200">
                        {row.scan_out_time ? String(row.scan_out_time).slice(0, 5) : (
                          Number(row.is_forgot_out) === 1 ? <span className="text-rose-500">ลืมสแกนออก</span> : '--:--'
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold text-indigo-600 dark:text-indigo-400">
                        {Number(row.ot_hours || 0) > 0 ? Number(row.ot_hours).toFixed(1) : '-'}
                      </td>
                      <td className="px-3 py-2.5">
                        {canEdit && isOnline ? (
                          <select
                            value={row.status || 'WAITING'}
                            onChange={(e) => handleQuickStatus(row, e.target.value)}
                            className={`rounded-md border px-2 py-1 text-[11px] font-bold ${badge.cls}`}
                          >
                            {Object.entries(STATUS_BADGES).map(([code, meta]) => (
                              <option key={code} value={code}>{code} ({meta.label})</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-block rounded-md border px-2 py-0.5 text-[11px] font-bold ${badge.cls}`}>
                            {badge.label}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 max-w-[160px] truncate text-slate-500" title={row.remark || ''}>
                        {row.remark || '-'}
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2.5 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openEmployeeProfile(row.emp_id)}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-indigo-600 hover:bg-indigo-50 dark:border-slate-600 dark:text-indigo-400 dark:hover:bg-slate-700 cursor-pointer"
                              title="ดูโปรไฟล์พนักงาน"
                            >
                              <User className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => openEdit(row)}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700 cursor-pointer"
                              title="แก้ไขรายละเอียด"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            {Number(row.log_id) > 0 && (
                              <button
                                type="button"
                                disabled={!isOnline}
                                onClick={() => handleDeleteLog(row)}
                                className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40 cursor-pointer"
                                title="ลบรายการ"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Log Modal */}
      {editRow && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleSaveEdit}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">แก้ไขเวลาเข้า-ออกงาน</h4>
                <p className="text-xs text-slate-500">{editRow.emp_id} — {editRow.name_th} ({editRow.log_date})</p>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => openEmployeeProfile(editRow.emp_id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100 dark:border-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300"
                >
                  <User className="h-3.5 w-3.5" /> ดูโปรไฟล์
                </button>
                <button type="button" onClick={() => setEditRow(null)} className="p-1 text-slate-400 hover:text-slate-600">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">สถานะ</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {Object.entries(STATUS_BADGES).map(([code, meta]) => (
                    <option key={code} value={code}>{code} — {meta.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">กะ (Shift)</label>
                <select
                  value={editForm.shift_id}
                  onChange={(e) => setEditForm((f) => ({ ...f, shift_id: Number(e.target.value) }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  {(structure?.shifts || []).map((s) => (
                    <option key={s.shift_id} value={s.shift_id}>{s.shift_name} ({s.start_time}-{s.end_time})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">เวลาเข้า (HH:mm)</label>
                <input
                  type="time"
                  value={editForm.scan_in_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, scan_in_time: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">เวลาออก (HH:mm)</label>
                <input
                  type="time"
                  value={editForm.scan_out_time}
                  onChange={(e) => setEditForm((f) => ({ ...f, scan_out_time: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">สายผลิตประจำวัน (Override Line)</label>
                <input
                  type="text"
                  value={editForm.actual_line}
                  onChange={(e) => setEditForm((f) => ({ ...f, actual_line: e.target.value }))}
                  list="mp-lines-datalist"
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
                <datalist id="mp-lines-datalist">
                  {(structure?.lines || []).map((ln) => <option key={ln} value={ln} />)}
                </datalist>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">ทีม (Team Group)</label>
                <input
                  type="text"
                  value={editForm.actual_team}
                  onChange={(e) => setEditForm((f) => ({ ...f, actual_team: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-600 dark:text-slate-300">หมายเหตุ (Remark)</label>
              <textarea
                rows={2}
                value={editForm.remark}
                onChange={(e) => setEditForm((f) => ({ ...f, remark: e.target.value }))}
                className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditRow(null)}
                className="min-h-[44px] rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={saving || !isOnline}
                className="min-h-[44px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {saving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Raw Central Scans Modal */}
      {rawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">ข้อมูลดิบจากเครื่องสแกนกลาง (Central Raw Scans)</h4>
                <p className="text-xs text-slate-500">ตรวจสอบประวัติสแกนหน้าตรงจากระบบส่วนกลาง · แสดง {filteredRawScans.length} รายการ</p>
              </div>
              <button type="button" onClick={() => setRawModalOpen(false)} className="p-1.5 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/60">
              <input
                type="text"
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                placeholder="ค้นหารหัส, ชื่อ-สกุล, ตำแหน่ง หรือแผนก..."
                className="min-h-[40px] flex-1 min-w-[180px] rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <span className="text-xs font-semibold text-slate-500">จาก</span>
              <input
                type="date"
                value={rawRange.startDate}
                onChange={(e) => setRawRange((r) => ({ ...r, startDate: e.target.value }))}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <span className="text-xs font-semibold text-slate-500">ถึง</span>
              <input
                type="date"
                value={rawRange.endDate}
                onChange={(e) => setRawRange((r) => ({ ...r, endDate: e.target.value }))}
                className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <button
                type="button"
                disabled={rawLoading}
                onClick={() => fetchRawCentralData()}
                className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${rawLoading ? 'animate-spin' : ''}`} />
                ดึงข้อมูล (Fetch)
              </button>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {rawLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">กำลังเชื่อมต่อเครื่องสแกนกลาง...</div>
              ) : filteredRawScans.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">ไม่พบข้อมูลการสแกนในช่วงเวลานี้</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 font-bold dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2">เวลาที่สแกน (TIMEINOUT)</th>
                      <th className="px-3 py-2">รหัสพนักงาน</th>
                      <th className="px-3 py-2">ชื่อ-สกุล</th>
                      <th className="px-3 py-2">ตำแหน่ง</th>
                      <th className="px-3 py-2">แผนก / หน่วยงาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRawScans.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/40">
                        <td className="px-3 py-2 font-mono font-semibold text-indigo-600 dark:text-indigo-400">{s.TIMEINOUT}</td>
                        <td className="px-3 py-2 font-mono font-bold">{s.EMPID}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 dark:text-white">{s.NAME || s.EMPNAME || '-'}</td>
                        <td className="px-3 py-2 text-slate-600 dark:text-slate-300">{s.POSITION || '-'}</td>
                        <td className="px-3 py-2">
                          <span className="inline-block rounded bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            {s.DEPARTMENT || s.CHECKTYPE || s.SENSORID || s.MACHINE || '-'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Soft vs Hard Reset Modal */}
      {resetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
                <CalendarX className="h-5 w-5 text-rose-500" />
                เลือกรูปแบบการรีเซ็ตข้อมูลวันที่ {date}
              </h4>
              <button type="button" onClick={() => setResetModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-2.5 text-xs">
              <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 dark:border-sky-800 dark:bg-sky-950/30">
                <div className="font-bold text-sky-900 dark:text-sky-200">1. Soft Reset (แนะนำ)</div>
                <p className="mt-0.5 text-sky-700 dark:text-sky-300">ล้างเฉพาะเวลาสแกนอัตโนมัติ รายการที่ผู้ดูแล Verify หรือแก้ไข Manual แล้วจะไม่สูญหาย</p>
              </div>
              <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-800 dark:bg-rose-950/30">
                <div className="font-bold text-rose-900 dark:text-rose-200">2. Hard Reset (ล้างทั้งหมด)</div>
                <p className="mt-0.5 text-rose-700 dark:text-rose-300">ลบข้อมูลลงเวลาทั้งหมดของวันที่ {date} ออกเพื่อดึงจากเครื่องสแกนใหม่ทั้งหมด (รายการแก้ไข Manual จะหายด้วย)</p>
              </div>
            </div>
            <div className="flex flex-wrap justify-end gap-2 pt-1">
              <button
                type="button"
                disabled={resetting}
                onClick={() => setResetModalOpen(false)}
                className="min-h-[40px] rounded-lg border border-slate-300 px-3.5 text-xs font-semibold dark:border-slate-600"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => executeClearDay(false)}
                className="min-h-[40px] rounded-lg bg-indigo-600 px-4 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                Soft Reset
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => executeClearDay(true)}
                className="min-h-[40px] rounded-lg bg-rose-600 px-4 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                Hard Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Employee Quick Profile Modal */}
      {profileModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 dark:border-slate-700">
              <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
                <User className="h-5 w-5 text-indigo-500" />
                ข้อมูลพนักงาน (Employee Profile)
              </h4>
              <button type="button" onClick={() => setProfileModal({ open: false, loading: false, data: null })} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            {profileModal.loading ? (
              <div className="py-10 text-center text-xs text-slate-400">กำลังโหลดข้อมูลพนักงาน...</div>
            ) : !profileModal.data ? (
              <div className="py-10 text-center text-xs text-slate-400">ไม่พบข้อมูลพนักงาน</div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-lg font-extrabold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {String(profileModal.data.name_th || '?').charAt(0)}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-slate-900 dark:text-white truncate">{profileModal.data.name_th}</div>
                    <div className="font-mono text-[11px] text-slate-500">รหัส: {profileModal.data.emp_id} · {profileModal.data.position || '-'}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">สายผลิต / ทีม</div>
                    <div className="font-bold">{profileModal.data.line || '-'} ({profileModal.data.team_group || '-'})</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">กลุ่ม HC / แผนก API</div>
                    <div className="font-bold">{profileModal.data.hc_group || '-'} · {profileModal.data.department_api || '-'}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">วันที่เริ่มงาน</div>
                    <div className="font-mono font-bold">{profileModal.data.start_date || '-'}</div>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                    <div className="text-[10px] text-slate-400">เบอร์โทรศัพท์</div>
                    <div className="font-mono font-bold">{profileModal.data.phone || '-'}</div>
                  </div>
                </div>
                {profileModal.data.emergency_contact_name && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5 dark:border-amber-800 dark:bg-amber-950/30">
                    <div className="text-[10px] text-amber-700 dark:text-amber-300">ผู้ติดต่อฉุกเฉิน</div>
                    <div className="font-semibold">
                      {profileModal.data.emergency_contact_name} ({profileModal.data.emergency_contact_relation || '-'}) · {profileModal.data.emergency_contact_phone || '-'}
                    </div>
                  </div>
                )}
                {canEdit && onOpenMaster && (
                  <button
                    type="button"
                    onClick={() => {
                      const eid = profileModal.data.emp_id;
                      setProfileModal({ open: false, loading: false, data: null });
                      onOpenMaster(eid);
                    }}
                    className="w-full min-h-[40px] rounded-lg bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700"
                  >
                    แก้ไขข้อมูลพนักงานใน Master Data →
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* YTD Individual KPI Modal */}
      {kpiModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">สรุปสถิติการมาทำงานรายบุคคล (YTD Attendance KPI)</h4>
                <p className="text-xs text-slate-500">สะสมวันทำงาน มาตรงเวลา มาสาย ขาดงาน และวันลาแยกประเภท</p>
              </div>
              <button type="button" onClick={() => setKpiModalOpen(false)} className="p-1.5 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="date"
                  value={kpiRange.startDate}
                  onChange={(e) => setKpiRange((r) => ({ ...r, startDate: e.target.value }))}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <span className="text-xs text-slate-500">ถึง</span>
                <input
                  type="date"
                  value={kpiRange.endDate}
                  onChange={(e) => setKpiRange((r) => ({ ...r, endDate: e.target.value }))}
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleLoadKpi()}
                  className="min-h-[40px] rounded-lg bg-indigo-600 px-3 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  ดึงข้อมูล
                </button>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={kpiSearch}
                  onChange={(e) => setKpiSearch(e.target.value)}
                  placeholder="กรองชื่อ / รหัส / สาย..."
                  className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-3 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => exportRowsToExcel(filteredKpiRows, 'YTD_KPI', `Manpower_YTD_KPI_${kpiRange.endDate}.xlsx`)}
                  className="min-h-[40px] rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  Export
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto p-3">
              {kpiLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">กำลังโหลดข้อมูล YTD KPI...</div>
              ) : (
                <table className="w-full min-w-[760px] text-left text-xs">
                  <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2">รหัส</th>
                      <th className="px-3 py-2">ชื่อ-สกุล</th>
                      <th className="px-3 py-2">สาย / ทีม</th>
                      <th className="px-3 py-2 text-right">วันทำงาน</th>
                      <th className="px-3 py-2 text-right">ปกติ</th>
                      <th className="px-3 py-2 text-right">สาย</th>
                      <th className="px-3 py-2 text-right">ขาด</th>
                      <th className="px-3 py-2 text-right">ป่วย</th>
                      <th className="px-3 py-2 text-right">กิจ</th>
                      <th className="px-3 py-2 text-right">พักร้อน</th>
                      <th className="px-3 py-2 text-right">% มาทำงาน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredKpiRows.map((k) => {
                      const workDays = Number(k.total_working_days || 0);
                      const attCount = Number(k.count_present || 0) + Number(k.count_late || 0);
                      const rate = workDays > 0 ? ((attCount / workDays) * 100).toFixed(1) : '0.0';
                      return (
                        <tr key={k.emp_id}>
                          <td className="px-3 py-2 font-mono">{k.emp_id}</td>
                          <td className="px-3 py-2 font-semibold">{k.name_th}</td>
                          <td className="px-3 py-2">{k.line} ({k.team_group || '-'})</td>
                          <td className="px-3 py-2 text-right font-mono">{workDays}</td>
                          <td className="px-3 py-2 text-right font-mono text-emerald-600">{k.count_present}</td>
                          <td className="px-3 py-2 text-right font-mono text-amber-600">{k.count_late}</td>
                          <td className="px-3 py-2 text-right font-mono text-rose-600">{k.count_absent}</td>
                          <td className="px-3 py-2 text-right font-mono">{k.count_sick}</td>
                          <td className="px-3 py-2 text-right font-mono">{k.count_business}</td>
                          <td className="px-3 py-2 text-right font-mono">{k.count_vacation}</td>
                          <td className="px-3 py-2 text-right font-mono font-bold">{rate}%</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

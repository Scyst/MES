import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Edit3, Trash2, AlertTriangle, CheckCircle2, ArrowLeftRight,
  Fingerprint, Award, RefreshCw, X, CheckSquare, CalendarX, Eraser
} from 'lucide-react';
import { manpowerOpsApi } from '../../../shared/services/manpowerApi';
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

  const handleQuickStatus = async (logId, newStatus) => {
    if (!canEdit || !isOnline) return;
    try {
      await manpowerOpsApi.updateLogStatus(logId, newStatus);
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

  const handleClearDay = async () => {
    if (!canEdit || !isOnline) return;
    const ok = await confirm({
      title: 'ล้างเวลาสแกนประจำวัน (Reset Day)',
      message: `ระบบจะล้างเวลาสแกนเข้า-ออกของรายการที่ยังไม่ถูก Verify ในวันที่ ${date} เพื่อเตรียมรับสแกนใหม่ ดำเนินการต่อหรือไม่?`,
      confirmText: 'ยืนยันล้างข้อมูล',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await manpowerOpsApi.clearDay(date, false);
      showToast(res?.message || 'ล้างข้อมูลเรียบร้อยแล้ว', 'success');
      fetchLogs();
      onMutated?.();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถล้างข้อมูลประจำวันได้', 'error');
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

  const handleOpenRawScans = async () => {
    setRawModalOpen(true);
    setRawLoading(true);
    try {
      const res = await manpowerOpsApi.fetchRawCentralScans({
        start_date: date,
        end_date: offsetIsoDate(date, 1),
      });
      setRawScans(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถเชื่อมต่อระบบสแกนนิ้วกลางได้', 'error');
    } finally {
      setRawLoading(false);
    }
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
      || String(r.EMPNAME || '').toLowerCase().includes(q)
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

        <div className="overflow-x-auto">
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
                    <tr key={row.log_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
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
                        <div className="text-[11px] text-slate-400">{row.team_group || '-'} ({row.hc_group || 'MAIN'})</div>
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
                            onChange={(e) => handleQuickStatus(row.log_id, e.target.value)}
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
                              disabled={!isOnline}
                              onClick={() => openEdit(row)}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-700"
                              title="แก้ไขรายละเอียด"
                            >
                              <Edit3 className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              disabled={!isOnline}
                              onClick={() => handleDeleteLog(row)}
                              className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-950/40"
                              title="ลบรายการ"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
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
              <button type="button" onClick={() => setEditRow(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
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
          <div className="flex max-h-[85vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3.5 dark:border-slate-700">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">ข้อมูลดิบจากเครื่องสแกนกลาง (Central Scanner)</h4>
                <p className="text-xs text-slate-500">ช่วงวันที่ {date} ถึง {offsetIsoDate(date, 1)}</p>
              </div>
              <button type="button" onClick={() => setRawModalOpen(false)} className="p-1.5 text-slate-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="border-b border-slate-200 p-3 dark:border-slate-700">
              <input
                type="text"
                value={rawSearch}
                onChange={(e) => setRawSearch(e.target.value)}
                placeholder="ค้นหารหัสพนักงาน หรือเวลา..."
                className="min-h-[40px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div className="flex-1 overflow-auto p-3">
              {rawLoading ? (
                <div className="py-12 text-center text-sm text-slate-400">กำลังเชื่อมต่อเครื่องสแกนกลาง...</div>
              ) : filteredRawScans.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">ไม่พบข้อมูลการสแกนในช่วงเวลานี้</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                    <tr>
                      <th className="px-3 py-2">EMPID</th>
                      <th className="px-3 py-2">ชื่อ-สกุล</th>
                      <th className="px-3 py-2">เวลาที่สแกน (TIMEINOUT)</th>
                      <th className="px-3 py-2">รหัสเครื่อง / จุดสแกน</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRawScans.map((s, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 font-mono font-semibold">{s.EMPID}</td>
                        <td className="px-3 py-2">{s.EMPNAME || '-'}</td>
                        <td className="px-3 py-2 font-mono text-indigo-600 dark:text-indigo-400">{s.TIMEINOUT}</td>
                        <td className="px-3 py-2">{s.CHECKTYPE || s.SENSORID || s.MACHINE || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
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

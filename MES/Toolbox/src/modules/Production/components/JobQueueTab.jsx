import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle, ArrowDown, ArrowUp, CheckCircle2, Edit3, History, Pause,
  Play, Plus, RefreshCw, RotateCcw, Square, Trash2, X
} from 'lucide-react';
import { productionApi } from '../../../shared/services/productionApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import ItemSearchSelect from './ItemSearchSelect';
import OperatorMultiSelect from './OperatorMultiSelect';

const todayIso = () => new Date().toISOString().slice(0, 10);

const HOUR_SLOTS = Array.from({ length: 24 }, (_, hr) => {
  const s = String(hr).padStart(2, '0');
  const e = String((hr + 1) % 24).padStart(2, '0');
  return { value: `${s}:00:00|${s}:59:59`, label: `${s}:00 - ${e}:00` };
});

const getCurrentSlot = () => {
  const hr = String(new Date().getHours()).padStart(2, '0');
  return `${hr}:00:00|${hr}:59:59`;
};

const STATUS_STYLES = {
  RUNNING: {
    badge: 'bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300',
    border: 'border-l-4 border-l-emerald-500',
    label: 'กำลังผลิต (RUNNING)',
  },
  PAUSED: {
    badge: 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300',
    border: 'border-l-4 border-l-amber-500',
    label: 'หยุดชั่วคราว (PAUSED)',
  },
  PENDING: {
    badge: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300',
    border: 'border-l-4 border-l-slate-400',
    label: 'รอคิว (PENDING)',
  },
  COMPLETED: {
    badge: 'bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300',
    border: 'border-l-4 border-l-blue-500',
    label: 'ปิดงานแล้ว (COMPLETED)',
  },
  CANCELLED: {
    badge: 'bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300',
    border: 'border-l-4 border-l-rose-500',
    label: 'ยกเลิก (CANCELLED)',
  },
};

/**
 * Live Production Job Queue KDS (#/production?tab=queue).
 */
export default function JobQueueTab({ metadata, isOffline }) {
  const toast = useToast();
  const confirm = useConfirm();

  const [locations, setLocations] = useState([]);
  const [selectedLoc, setSelectedLoc] = useState('ALL');
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ location_id: '', item_id: '', target_qty: '', lot_no: '' });

  const [sapWarningModal, setSapWarningModal] = useState(null); // { job, shortages }
  const [recordModalJob, setRecordModalJob] = useState(null);
  const [recordForm, setRecordForm] = useState({
    log_date: todayIso(),
    time_slot: getCurrentSlot(),
    actual_qty: '',
    hold_qty: '',
    scrap_qty: '',
    scrap_reason: '',
    machine_id: '',
    team_user_ids: [],
  });

  const [editJobModal, setEditJobModal] = useState(null);
  const [editJobForm, setEditJobForm] = useState({ target_qty: '', lot_no: '' });

  const [logsModalJob, setLogsModalJob] = useState(null);
  const [jobLogs, setJobLogs] = useState([]);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyJobs, setHistoryJobs] = useState([]);
  const [historySearch, setHistorySearch] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const items = metadata?.items || [];
  const machines = metadata?.machines || [];
  const canManage = Boolean(metadata?.current_user?.can_manage);

  const loadLocations = useCallback(async () => {
    try {
      const res = await productionApi.getJobLocations();
      setLocations(res?.data || []);
    } catch {
      // Handled globally
    }
  }, []);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await productionApi.getActiveJobs(selectedLoc);
      setJobs(res?.data || []);
    } catch {
      // Handled globally
    } finally {
      setLoading(false);
    }
  }, [selectedLoc]);

  useEffect(() => {
    loadLocations();
  }, [loadLocations]);

  useEffect(() => {
    loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    if (!autoRefresh) return undefined;
    const id = setInterval(() => {
      loadJobs();
    }, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, loadJobs]);

  const groupedByLocation = useMemo(() => {
    const map = new Map();
    jobs.forEach((job) => {
      const key = `${job.location_id}::${job.location_name}`;
      if (!map.has(key)) {
        map.set(key, { locationId: job.location_id, locationName: job.location_name, jobs: [] });
      }
      map.get(key).jobs.push(job);
    });
    return Array.from(map.values());
  }, [jobs]);

  const counts = useMemo(() => {
    let running = 0;
    let paused = 0;
    let pending = 0;
    jobs.forEach((j) => {
      if (j.status === 'RUNNING') running += 1;
      else if (j.status === 'PAUSED') paused += 1;
      else pending += 1;
    });
    return { running, paused, pending };
  }, [jobs]);

  const handleCreateJob = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    if (!createForm.location_id || !createForm.item_id || Number(createForm.target_qty) <= 0) {
      return toast.warning('กรุณาเลือกสถานี สินค้า และเป้าหมายผลิตให้ครบถ้วน');
    }
    setSubmitting(true);
    try {
      const res = await productionApi.createJob({
        location_id: Number(createForm.location_id),
        item_id: Number(createForm.item_id),
        target_qty: Number(createForm.target_qty),
        lot_no: createForm.lot_no.trim(),
      });
      toast.success(res?.message || 'สร้างคิวงานสำเร็จ');
      setCreateOpen(false);
      setCreateForm({ location_id: '', item_id: '', target_qty: '', lot_no: '' });
      loadJobs();
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartJob = async (job, ignoreSapWarning = false) => {
    if (isOffline) return;
    try {
      const res = await productionApi.startJob(job.job_id, ignoreSapWarning);
      if (res?.data?.sap_warning) {
        setSapWarningModal({ job, shortages: res.data.shortages || [] });
        return;
      }
      toast.success(res?.message || 'เริ่มเดินงานแล้ว');
      setSapWarningModal(null);
      loadJobs();
    } catch {
      // Handled globally
    }
  };

  const handlePauseJob = async (job) => {
    if (isOffline) return;
    try {
      const res = await productionApi.pauseJob(job.job_id);
      toast.info(res?.message || 'หยุดพักคิวงานแล้ว');
      loadJobs();
    } catch {
      // Handled globally
    }
  };

  const handleCloseJob = async (job) => {
    if (isOffline) return;
    const ok = await confirm({
      title: `ยืนยันการปิดใบงาน ${job.job_no}?`,
      message: `สินค้า: ${job.part_no}\nยอดผลิตสะสม FG: ${Number(job.actual_qty || 0).toLocaleString()} / เป้าหมาย ${Number(job.target_qty || 0).toLocaleString()}`,
      confirmText: 'ยืนยันปิดงาน (Close Job)',
    });
    if (!ok) return;
    try {
      const res = await productionApi.closeJob(job.job_id);
      toast.success(res?.message || 'ปิดงานเรียบร้อย');
      loadJobs();
    } catch {
      // Handled globally
    }
  };

  const handleDeleteJob = async (job) => {
    if (isOffline) return;
    const ok = await confirm({
      title: `ยืนยันยกเลิกคิวงาน ${job.job_no}?`,
      message: 'รายการนี้จะถูกยกเลิกออกจากคิวผลิตหน้าไลน์',
      confirmText: 'ยืนยันยกเลิก',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await productionApi.deleteJob(job.job_id);
      toast.success(res?.message || 'ยกเลิกคิวงานแล้ว');
      loadJobs();
    } catch {
      // Handled globally
    }
  };

  const handleMoveOrder = async (locGroup, index, direction) => {
    if (isOffline) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= locGroup.jobs.length) return;
    const list = [...locGroup.jobs];
    const [moved] = list.splice(index, 1);
    list.splice(nextIndex, 0, moved);
    const orderedIds = list.map((j) => j.job_id);
    try {
      await productionApi.reorderQueue(orderedIds);
      loadJobs();
    } catch {
      // Handled globally
    }
  };

  const handleRecordOutput = async (e) => {
    e.preventDefault();
    if (!recordModalJob || isOffline) return;
    const fg = Number(recordForm.actual_qty || 0);
    const hold = Number(recordForm.hold_qty || 0);
    const scrap = Number(recordForm.scrap_qty || 0);
    if (fg <= 0 && hold <= 0 && scrap <= 0) {
      return toast.warning('กรุณาระบุยอดผลิตอย่างน้อย 1 ช่อง');
    }
    const [startTime, endTime] = (recordForm.time_slot || getCurrentSlot()).split('|');
    setSubmitting(true);
    try {
      const res = await productionApi.recordJobOutput({
        job_id: recordModalJob.job_id,
        log_date: recordForm.log_date,
        start_time: startTime,
        end_time: endTime,
        actual_qty: fg,
        hold_qty: hold,
        scrap_qty: scrap,
        scrap_reason: recordForm.scrap_reason.trim(),
        machine_id: recordForm.machine_id ? Number(recordForm.machine_id) : null,
        team_user_ids: recordForm.team_user_ids,
      });
      toast.success(res?.message || 'บันทึกผลผลิตเรียบร้อย');
      setRecordModalJob(null);
      setRecordForm((p) => ({ ...p, actual_qty: '', hold_qty: '', scrap_qty: '', scrap_reason: '' }));
      loadJobs();
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveEditJob = async (e) => {
    e.preventDefault();
    if (!editJobModal || isOffline) return;
    setSubmitting(true);
    try {
      const res = await productionApi.editJob({
        job_id: editJobModal.job_id,
        target_qty: Number(editJobForm.target_qty),
        lot_no: editJobForm.lot_no.trim(),
      });
      toast.success(res?.message || 'แก้ไขใบงานสำเร็จ');
      setEditJobModal(null);
      loadJobs();
    } catch {
      // Handled globally
    } finally {
      setSubmitting(false);
    }
  };

  const openJobLogs = async (job) => {
    setLogsModalJob(job);
    try {
      const res = await productionApi.getJobLogs(job.job_no);
      setJobLogs(res?.data || []);
    } catch {
      setJobLogs([]);
    }
  };

  const handleDeleteJobTxn = async (txn) => {
    if (!logsModalJob || isOffline) return;
    const ok = await confirm({
      title: `ยืนยันการลบรายการ #${txn.transaction_id}?`,
      message: `จำนวน ${Number(txn.quantity).toLocaleString()} (${txn.transaction_type})\nระบบจะหักออกจากใบงานและคืนสต็อก On-Hand`,
      confirmText: 'ลบและคืนยอด',
      danger: true,
    });
    if (!ok) return;
    try {
      const res = await productionApi.deleteJobTxn(txn.transaction_id, logsModalJob.job_id);
      toast.success(res?.message || 'ลบยอดผลิตแล้ว');
      const logsRes = await productionApi.getJobLogs(logsModalJob.job_no);
      setJobLogs(logsRes?.data || []);
      loadJobs();
    } catch {
      // Handled globally
    }
  };

  const loadJobHistory = async (q = historySearch) => {
    try {
      const res = await productionApi.getAllJobs({
        location_id: selectedLoc,
        search: q.trim(),
        limit: 50,
      });
      setHistoryJobs(res?.data?.rows || []);
    } catch {
      // Handled globally
    }
  };

  const handleReopenJob = async (job) => {
    if (isOffline) return;
    const ok = await confirm({
      title: `เปิดใบงาน ${job.job_no} ใหม่อีกครั้ง?`,
      message: 'สถานะจะเปลี่ยนกลับเป็น PAUSED เพื่อให้สายการผลิตดำเนินงานต่อ',
      confirmText: 'เปิดงานใหม่ (Reopen)',
    });
    if (!ok) return;
    try {
      const res = await productionApi.reopenJob(job.job_id);
      toast.success(res?.message || 'เปิดใบงานใหม่แล้ว');
      loadJobHistory();
      loadJobs();
    } catch {
      // Handled globally
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Header */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2">
          <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
            กำลังเดินเครื่อง: {counts.running}
          </div>
          <div className="rounded-xl bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
            พักคิว: {counts.paused}
          </div>
          <div className="rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            รอผลิต: {counts.pending}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={selectedLoc}
            onChange={(e) => setSelectedLoc(e.target.value)}
            aria-label="กรองตามไลน์ผลิต"
            className="min-h-[44px] rounded-xl border border-slate-300 bg-white px-3 text-xs font-semibold dark:border-slate-700 dark:bg-slate-800"
          >
            <option value="ALL">ทุกสถานี / ทุกไลน์ผลิต</option>
            {locations.map((l) => (
              <option key={l.location_id} value={l.location_id}>
                {l.location_name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => setAutoRefresh((p) => !p)}
            className={`min-h-[44px] rounded-xl border px-3 text-xs font-bold ${
              autoRefresh
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'border-slate-300 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-800'
            }`}
          >
            Auto 30s: {autoRefresh ? 'ON' : 'OFF'}
          </button>

          <button
            type="button"
            onClick={() => {
              setHistoryOpen(true);
              loadJobHistory('');
            }}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <History className="h-4 w-4" /> ประวัติใบงานทั้งหมด
          </button>

          <button
            type="button"
            disabled={isOffline}
            onClick={() => setCreateOpen(true)}
            className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" /> สร้างคิวงานใหม่
          </button>

          <button
            type="button"
            onClick={loadJobs}
            aria-label="รีเฟรชคิวงาน"
            className="flex min-h-[44px] w-11 items-center justify-center rounded-xl border border-slate-300 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* KDS Station Lanes */}
      {groupedByLocation.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900">
          {loading ? 'กำลังโหลดคิวงานผลิต...' : 'ไม่มีใบงานผลิตที่กำลังดำเนินการในขณะนี้'}
        </div>
      ) : (
        <div className={`grid grid-cols-1 gap-4 ${selectedLoc === 'ALL' ? 'xl:grid-cols-2' : ''}`}>
          {groupedByLocation.map((group) => (
            <div
              key={group.locationId}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5 dark:border-slate-800">
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  {group.locationName}
                </h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {group.jobs.length} คิว
                </span>
              </div>

              <div className="space-y-3">
                {group.jobs.map((job, idx) => {
                  const st = STATUS_STYLES[job.status] || STATUS_STYLES.PENDING;
                  const target = Math.max(1, Number(job.target_qty || 0));
                  const actual = Number(job.actual_qty || 0);
                  const hold = Number(job.hold_qty || 0);
                  const scrap = Number(job.scrap_qty || 0);
                  const pct = Math.min(100, Math.round((actual / target) * 100));

                  return (
                    <div
                      key={job.job_id}
                      className={`rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 ${st.border} dark:border-slate-700 dark:bg-slate-800/50`}
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-mono text-sm font-black text-blue-700 dark:text-blue-400">
                              {job.job_no}
                            </span>
                            <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${st.badge}`}>
                              {st.label}
                            </span>
                            {job.lot_no && (
                              <span className="rounded bg-indigo-50 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                                Lot: {job.lot_no}
                              </span>
                            )}
                          </div>
                          <div className="mt-1 text-sm font-bold text-slate-900 dark:text-white">
                            {job.part_no} <span className="font-mono text-xs text-slate-500">({job.sap_no})</span>
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">{job.part_description}</div>
                        </div>

                        {/* Reorder controls */}
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            disabled={idx === 0 || isOffline}
                            onClick={() => handleMoveOrder(group, idx, -1)}
                            aria-label="เลื่อนคิวขึ้น"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <ArrowUp className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === group.jobs.length - 1 || isOffline}
                            onClick={() => handleMoveOrder(group, idx, 1)}
                            aria-label="เลื่อนคิวลง"
                            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                          >
                            <ArrowDown className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <div className="flex flex-wrap items-center gap-3 font-mono font-bold">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              FG: {actual.toLocaleString()} / {target.toLocaleString()}
                            </span>
                            {hold > 0 && <span className="text-amber-600">Hold: {hold.toLocaleString()}</span>}
                            {scrap > 0 && <span className="text-rose-600">Scrap: {scrap.toLocaleString()}</span>}
                          </div>
                          <span className="font-mono font-black text-slate-700 dark:text-slate-200">{pct}%</span>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                          <div
                            className="h-full rounded-full bg-emerald-500 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>

                      {/* Job Actions */}
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {job.status !== 'RUNNING' && (
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => handleStartJob(job, false)}
                            className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-emerald-600 px-3 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                          >
                            <Play className="h-3.5 w-3.5" /> {job.status === 'PAUSED' ? 'ผลิตต่อ (Resume)' : 'เริ่มงาน (Start)'}
                          </button>
                        )}
                        {job.status === 'RUNNING' && (
                          <>
                            <button
                              type="button"
                              disabled={isOffline}
                              onClick={() => setRecordModalJob(job)}
                              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" /> ลงยอดผลิต
                            </button>
                            <button
                              type="button"
                              disabled={isOffline}
                              onClick={() => handlePauseJob(job)}
                              className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-amber-500 px-3 text-xs font-bold text-white hover:bg-amber-600 disabled:opacity-50"
                            >
                              <Pause className="h-3.5 w-3.5" /> พักงาน
                            </button>
                          </>
                        )}
                        {(job.status === 'RUNNING' || job.status === 'PAUSED') && (
                          <button
                            type="button"
                            disabled={isOffline}
                            onClick={() => handleCloseJob(job)}
                            className="inline-flex min-h-[40px] items-center gap-1 rounded-xl bg-slate-800 px-3 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50 dark:bg-slate-700"
                          >
                            <Square className="h-3.5 w-3.5" /> ปิดงาน
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openJobLogs(job)}
                          className="inline-flex min-h-[40px] items-center gap-1 rounded-xl border border-slate-300 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <History className="h-3.5 w-3.5" /> Log
                        </button>
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => {
                            setEditJobForm({ target_qty: String(job.target_qty), lot_no: job.lot_no || '' });
                            setEditJobModal(job);
                          }}
                          aria-label="แก้ไขเป้าหมาย"
                          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-slate-300 bg-white px-2.5 text-slate-600 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={isOffline}
                          onClick={() => handleDeleteJob(job)}
                          aria-label="ยกเลิกคิวงาน"
                          className="inline-flex min-h-[40px] items-center justify-center rounded-xl border border-rose-200 bg-white px-2.5 text-rose-600 hover:bg-rose-50 dark:border-rose-900/50 dark:bg-slate-800"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Job Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold">สร้างคิวงานผลิตใหม่</h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateJob} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-semibold">ไลน์ผลิต / สถานี *</label>
                <select
                  required
                  value={createForm.location_id}
                  onChange={(e) => setCreateForm((p) => ({ ...p, location_id: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">-- เลือกสถานีผลิต --</option>
                  {locations.map((l) => (
                    <option key={l.location_id} value={l.location_id}>
                      {l.location_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">สินค้า (Item) *</label>
                <ItemSearchSelect
                  items={items}
                  value={createForm.item_id}
                  onSelect={(item) => setCreateForm((p) => ({ ...p, item_id: item ? String(item.item_id) : '' }))}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">เป้าหมายผลิต (Target Qty) *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={createForm.target_qty}
                    onChange={(e) => setCreateForm((p) => ({ ...p, target_qty: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">Lot No. (ถ้ามี)</label>
                  <input
                    type="text"
                    value={createForm.lot_no}
                    onChange={(e) => setCreateForm((p) => ({ ...p, lot_no: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] rounded-xl bg-blue-600 px-5 text-xs font-bold text-white"
                >
                  {submitting ? 'กำลังบันทึก...' : 'สร้างคิวงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SAP BOM Shortage Warning Modal */}
      {sapWarningModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center gap-2.5 text-amber-600">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <h3 className="text-base font-bold">แจ้งเตือนวัตถุดิบตาม BOM ไม่เพียงพอ</h3>
            </div>
            <p className="mb-3 text-xs text-slate-600 dark:text-slate-300">
              ใบงาน <strong>{sapWarningModal.job.job_no}</strong> ({sapWarningModal.job.part_no}) พบวัตถุดิบในคลัง SAP ต่ำกว่าปริมาณที่ต้องใช้:
            </p>
            <div className="max-h-52 overflow-y-auto rounded-xl border border-amber-200 dark:border-amber-900/60">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50 font-bold dark:bg-amber-950/50">
                  <tr>
                    <th className="px-2.5 py-2">รหัสวัตถุดิบ</th>
                    <th className="px-2.5 py-2 text-right">ต้องใช้</th>
                    <th className="px-2.5 py-2 text-right">คงเหลือ SAP</th>
                    <th className="px-2.5 py-2 text-right text-rose-600">ขาด</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 dark:divide-amber-900/30">
                  {sapWarningModal.shortages.map((s) => (
                    <tr key={s.sap_no}>
                      <td className="px-2.5 py-1.5">
                        <div className="font-bold">{s.part_no}</div>
                        <div className="text-[10px] text-slate-500">{s.sap_no}</div>
                      </td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{Number(s.required_qty).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono">{Number(s.available_qty).toLocaleString()}</td>
                      <td className="px-2.5 py-1.5 text-right font-mono font-bold text-rose-600">
                        -{Number(s.shortage_qty).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSapWarningModal(null)}
                className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold"
              >
                ปิด / ตรวจสอบคลัง
              </button>
              <button
                type="button"
                onClick={() => handleStartJob(sapWarningModal.job, true)}
                className="min-h-[44px] rounded-xl bg-amber-600 px-5 text-xs font-bold text-white hover:bg-amber-700"
              >
                ยืนยันเริ่มงานต่อ (Force Start)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Record Job Output Modal */}
      {recordModalJob && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold">บันทึกผลผลิต • {recordModalJob.job_no}</h3>
                <p className="text-xs text-slate-500">{recordModalJob.part_no} ({recordModalJob.sap_no})</p>
              </div>
              <button
                type="button"
                onClick={() => setRecordModalJob(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleRecordOutput} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">วันที่ผลิต</label>
                  <input
                    type="date"
                    required
                    value={recordForm.log_date}
                    onChange={(e) => setRecordForm((p) => ({ ...p, log_date: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">ช่วงเวลาผลิต</label>
                  <select
                    value={recordForm.time_slot}
                    onChange={(e) => setRecordForm((p) => ({ ...p, time_slot: e.target.value }))}
                    className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                  >
                    {HOUR_SLOTS.map((s) => (
                      <option key={s.value} value={s.value}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 dark:border-emerald-900 dark:bg-emerald-950/30">
                  <label className="block text-[11px] font-bold text-emerald-700">งานดี (FG)</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={recordForm.actual_qty}
                    onChange={(e) => setRecordForm((p) => ({ ...p, actual_qty: e.target.value }))}
                    placeholder="0"
                    className="mt-1 h-10 w-full rounded-lg border border-emerald-300 bg-white px-2 text-center text-base font-black text-emerald-700 dark:bg-slate-900"
                  />
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-2.5 dark:border-amber-900 dark:bg-amber-950/30">
                  <label className="block text-[11px] font-bold text-amber-700">Hold</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={recordForm.hold_qty}
                    onChange={(e) => setRecordForm((p) => ({ ...p, hold_qty: e.target.value }))}
                    placeholder="0"
                    className="mt-1 h-10 w-full rounded-lg border border-amber-300 bg-white px-2 text-center text-base font-black text-amber-700 dark:bg-slate-900"
                  />
                </div>
                <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-2.5 dark:border-rose-900 dark:bg-rose-950/30">
                  <label className="block text-[11px] font-bold text-rose-700">Scrap</label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={recordForm.scrap_qty}
                    onChange={(e) => setRecordForm((p) => ({ ...p, scrap_qty: e.target.value }))}
                    placeholder="0"
                    className="mt-1 h-10 w-full rounded-lg border border-rose-300 bg-white px-2 text-center text-base font-black text-rose-700 dark:bg-slate-900"
                  />
                </div>
              </div>

              {Number(recordForm.scrap_qty || 0) > 0 && (
                <input
                  type="text"
                  value={recordForm.scrap_reason}
                  onChange={(e) => setRecordForm((p) => ({ ...p, scrap_reason: e.target.value }))}
                  placeholder="ระบุสาเหตุของเสีย (จะส่งคำขอเบิกทดแทน Store อัตโนมัติ)..."
                  className="min-h-[44px] w-full rounded-xl border border-rose-300 px-3 text-sm dark:bg-slate-800"
                />
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold">เครื่องจักรที่ใช้ผลิต (ถ้ามี)</label>
                <select
                  value={recordForm.machine_id}
                  onChange={(e) => setRecordForm((p) => ({ ...p, machine_id: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="">-- ไม่ระบุเครื่องจักร --</option>
                  {machines.map((m) => (
                    <option key={m.machine_id} value={m.machine_id}>
                      {m.machine_code} - {m.machine_name}
                    </option>
                  ))}
                </select>
              </div>

              <OperatorMultiSelect
                locationId={recordModalJob.location_id}
                date={recordForm.log_date}
                selectedIds={recordForm.team_user_ids}
                onChange={(ids) => setRecordForm((p) => ({ ...p, team_user_ids: ids }))}
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRecordModalJob(null)}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="min-h-[44px] rounded-xl bg-blue-600 px-6 text-xs font-bold text-white"
                >
                  {submitting ? 'กำลังบันทึก...' : 'บันทึกยอดผลิต'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Job Target / Lot Modal */}
      {editJobModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <h3 className="mb-3 text-base font-bold">แก้ไขใบงาน {editJobModal.job_no}</h3>
            <form onSubmit={handleSaveEditJob} className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold">เป้าหมายผลิต *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  value={editJobForm.target_qty}
                  onChange={(e) => setEditJobForm((p) => ({ ...p, target_qty: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm font-bold dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold">Lot No.</label>
                <input
                  type="text"
                  value={editJobForm.lot_no}
                  onChange={(e) => setEditJobForm((p) => ({ ...p, lot_no: e.target.value }))}
                  className="min-h-[44px] w-full rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditJobModal(null)}
                  className="min-h-[44px] rounded-xl border border-slate-300 px-4 text-xs font-bold"
                >
                  ยกเลิก
                </button>
                <button type="submit" disabled={submitting} className="min-h-[44px] rounded-xl bg-blue-600 px-5 text-xs font-bold text-white">
                  บันทึก
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Job Logs Audit Modal */}
      {logsModalJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div>
                <h3 className="text-base font-bold">ประวัติการลงยอด • {logsModalJob.job_no}</h3>
                <p className="text-xs text-slate-500">{logsModalJob.part_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setLogsModalJob(null)}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                <tr>
                  <th className="px-3 py-2">เวลา</th>
                  <th className="px-3 py-2">ประเภท</th>
                  <th className="px-3 py-2 text-right">จำนวน</th>
                  <th className="px-3 py-2">ทีมผู้ผลิต</th>
                  <th className="px-3 py-2 text-center">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {jobLogs.map((log) => (
                  <tr key={log.transaction_id}>
                    <td className="px-3 py-2 font-mono">{String(log.transaction_timestamp || '').replace('T', ' ').slice(0, 16)}</td>
                    <td className="px-3 py-2 font-semibold">{log.transaction_type}</td>
                    <td className="px-3 py-2 text-right font-mono font-bold">{Number(log.quantity).toLocaleString()}</td>
                    <td className="px-3 py-2">{log.team_member_names || log.created_by_name}</td>
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={() => handleDeleteJobTxn(log)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {jobLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">ยังไม่มีรายการบันทึกผลผลิตสำหรับใบงานนี้</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Job History Drawer/Modal */}
      {historyOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3">
          <div className="max-h-[88vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl dark:bg-slate-900">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="text-base font-bold">ประวัติใบงานทั้งหมด (Job Archive)</h3>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') loadJobHistory(historySearch);
                  }}
                  placeholder="ค้นหา Job No, SAP, Part No..."
                  className="h-10 rounded-xl border border-slate-300 px-3 text-xs dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="button"
                  onClick={() => loadJobHistory(historySearch)}
                  className="h-10 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white"
                >
                  ค้นหา
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">Job No</th>
                    <th className="px-3 py-2">ไลน์</th>
                    <th className="px-3 py-2">SAP / Part No</th>
                    <th className="px-3 py-2 text-right">เป้า / ได้จริง</th>
                    <th className="px-3 py-2">สถานะ</th>
                    {canManage && <th className="px-3 py-2 text-center">Reopen</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {historyJobs.map((j) => (
                    <tr key={j.job_id}>
                      <td className="px-3 py-2 font-mono font-bold">{j.job_no}</td>
                      <td className="px-3 py-2">{j.location_name}</td>
                      <td className="px-3 py-2">
                        <div className="font-bold">{j.part_no}</div>
                        <div className="text-[11px] text-slate-500">{j.sap_no}</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {Number(j.actual_qty || 0).toLocaleString()} / {Number(j.target_qty || 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2 font-bold">{j.status}</td>
                      {canManage && (
                        <td className="px-3 py-2 text-center">
                          {(j.status === 'COMPLETED' || j.status === 'CANCELLED') && (
                            <button
                              type="button"
                              disabled={isOffline}
                              onClick={() => handleReopenJob(j)}
                              className="inline-flex h-8 items-center gap-1 rounded-lg border border-blue-200 px-2.5 text-[11px] font-bold text-blue-600 hover:bg-blue-50"
                            >
                              <RotateCcw className="h-3 w-3" /> Reopen
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

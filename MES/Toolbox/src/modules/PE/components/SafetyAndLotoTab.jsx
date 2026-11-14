import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ShieldAlert, Lock, Unlock, AlertTriangle, ClipboardCheck, Printer,
  Search, RefreshCw, Plus, Trash2, ArrowUp, ArrowDown, Save,
  CheckCircle2, XCircle, Eye, X, QrCode, UserCheck
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { peApi, resolvePeMediaUrl } from '../../../shared/services/peApi';
import { useConfirm, useToast } from '../../../shared/contexts/FeedbackContext';
import PeImage from './PeImage';
import { formatPeDate, formatPeDateTime, formatNumber } from '../utils/peFormatters';

export default function SafetyAndLotoTab({ isOffline = false }) {
  const showToast = useToast();
  const confirm = useConfirm();

  const [subTab, setSubTab] = useState('loto');

  // --- LOTO State ---
  const [lotoData, setLotoData] = useState({ machines: [], logs: [], open_wos: [] });
  const [lotoSearch, setLotoSearch] = useState('');
  const [lotoLine, setLotoLine] = useState('');
  const [lotoOnlyLocked, setLotoOnlyLocked] = useState(false);
  const [lotoLoading, setLotoLoading] = useState(false);

  // Lock Modal
  const [lockTarget, setLockTarget] = useState(null);
  const [lockForm, setLockForm] = useState({ locked_by: '', wo_id: '', reason: '' });
  const [lockSaving, setLockSaving] = useState(false);

  // Unlock Modal (Supervisor credentials verification)
  const [unlockTarget, setUnlockTarget] = useState(null);
  const [unlockForm, setUnlockForm] = useState({ unlocked_by: '', unlocked_pin: '' });
  const [unlockSaving, setUnlockSaving] = useState(false);

  // --- Hazards State ---
  const [hazards, setHazards] = useState([]);
  const [hazardKpi, setHazardKpi] = useState({ total: 0, pending: 0, in_progress: 0, completed: 0, avg_response_min: 0 });
  const [hazardFilter, setHazardFilter] = useState({ status: 'all', days: 90 });
  const [hazardLoading, setHazardLoading] = useState(false);
  const [editHazard, setEditHazard] = useState(null);
  const [hazardForm, setHazardForm] = useState({ status: 'In Progress', assigned_to: '', notes: '' });
  const [hazardSaving, setHazardSaving] = useState(false);

  // --- Pre-Op State ---
  const [preopData, setPreopData] = useState({
    logs: [],
    today: { total: 0, passed: 0, failed: 0 },
    summary: { total: 0, passed: 0, failed: 0, compliance: 100 },
    configured_machines: [],
  });
  const [preopLoading, setPreopLoading] = useState(false);
  const [selectedConfigCode, setSelectedConfigCode] = useState('');
  const [configItems, setConfigItems] = useState([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configSaving, setConfigSaving] = useState(false);
  const [previewAudit, setPreviewAudit] = useState(null);

  // --- Print Safety Cards State ---
  const [printData, setPrintData] = useState({ machines: [], employees: [], lines: [] });
  const [printMode, setPrintMode] = useState('machine');
  const [printLine, setPrintLine] = useState('');
  const [printSearch, setPrintSearch] = useState('');
  const [selectedMachineIds, setSelectedMachineIds] = useState([]);
  const [selectedEmpIds, setSelectedEmpIds] = useState([]);
  const [printLoading, setPrintLoading] = useState(false);

  const loadLoto = useCallback(async () => {
    setLotoLoading(true);
    try {
      const res = await peApi.getLotoOverview();
      if (res?.success && res.data) {
        setLotoData({
          machines: Array.isArray(res.data.machines) ? res.data.machines : [],
          logs: Array.isArray(res.data.logs) ? res.data.logs : [],
          open_wos: Array.isArray(res.data.open_wos) ? res.data.open_wos : [],
        });
      }
    } catch {
      // handled
    } finally {
      setLotoLoading(false);
    }
  }, []);

  const loadHazards = useCallback(async () => {
    setHazardLoading(true);
    try {
      const res = await peApi.getHazardReports(hazardFilter);
      if (res?.success) {
        setHazards(Array.isArray(res.data) ? res.data : []);
        if (res.kpi) setHazardKpi(res.kpi);
      }
    } catch {
      // handled
    } finally {
      setHazardLoading(false);
    }
  }, [hazardFilter]);

  const loadPreop = useCallback(async () => {
    setPreopLoading(true);
    try {
      const res = await peApi.getPreopOverview(200);
      if (res?.success && res.data) {
        setPreopData(res.data);
      }
    } catch {
      // handled
    } finally {
      setPreopLoading(false);
    }
  }, []);

  const loadPrintData = useCallback(async () => {
    setPrintLoading(true);
    try {
      const res = await peApi.getSafetyPrintData();
      if (res?.success && res.data) {
        const ms = Array.isArray(res.data.machines) ? res.data.machines : [];
        const emps = Array.isArray(res.data.employees) ? res.data.employees : [];
        setPrintData({
          machines: ms,
          employees: emps,
          lines: Array.isArray(res.data.lines) ? res.data.lines : [],
        });
        setSelectedMachineIds((prev) => (prev.length > 0 ? prev : ms.slice(0, 6).map((m) => m.machine_id)));
        setSelectedEmpIds((prev) => (prev.length > 0 ? prev : emps.slice(0, 8).map((e) => e.emp_id)));
      }
    } catch {
      // handled
    } finally {
      setPrintLoading(false);
    }
  }, []);

  useEffect(() => {
    if (subTab === 'loto') loadLoto();
    if (subTab === 'hazards') loadHazards();
    if (subTab === 'preop') {
      loadPreop();
      if (lotoData.machines.length === 0) loadLoto();
    }
    if (subTab === 'print') loadPrintData();
  }, [subTab, loadLoto, loadHazards, loadPreop, loadPrintData, lotoData.machines.length]);

  const lotoLines = useMemo(() => {
    const set = new Set();
    lotoData.machines.forEach((m) => { if (m.line) set.add(m.line); });
    return Array.from(set).sort();
  }, [lotoData.machines]);

  const filteredLotoMachines = useMemo(() => {
    const q = lotoSearch.trim().toLowerCase();
    return lotoData.machines.filter((m) => {
      if (lotoLine && m.line !== lotoLine) return false;
      if (lotoOnlyLocked && !m.is_loto) return false;
      if (!q) return true;
      return (
        String(m.machine_code || '').toLowerCase().includes(q) ||
        String(m.machine_name || '').toLowerCase().includes(q) ||
        String(m.line || '').toLowerCase().includes(q)
      );
    });
  }, [lotoData.machines, lotoLine, lotoOnlyLocked, lotoSearch]);

  const lockedCount = useMemo(() => lotoData.machines.filter((m) => Number(m.is_loto) === 1).length, [lotoData.machines]);

  // --- LOTO Handlers ---
  const handleLockSubmit = async (e) => {
    e.preventDefault();
    if (isOffline || !lockTarget) return;
    if (!lockForm.reason.trim()) {
      showToast('กรุณาระบุเหตุผลการตัดแยกระบบพลังงาน (LOTO)', 'warning');
      return;
    }
    setLockSaving(true);
    try {
      const res = await peApi.lockMachineLoto({
        machine_id: lockTarget.machine_id,
        wo_id: lockForm.wo_id || null,
        locked_by: lockForm.locked_by.trim(),
        reason: lockForm.reason.trim(),
      });
      if (res?.success) {
        showToast(res.message || 'ติดป้าย LOTO เรียบร้อยแล้ว', 'success');
        setLockTarget(null);
        setLockForm({ locked_by: '', wo_id: '', reason: '' });
        loadLoto();
      }
    } catch {
      // handled
    } finally {
      setLockSaving(false);
    }
  };

  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    if (isOffline || !unlockTarget) return;
    if (!unlockForm.unlocked_by.trim() || !unlockForm.unlocked_pin) {
      showToast('กรุณากรอก Username และรหัสผ่านยืนยันการปลด LOTO', 'warning');
      return;
    }
    setUnlockSaving(true);
    try {
      const res = await peApi.unlockMachineLoto({
        machine_id: unlockTarget.machine_id,
        unlocked_by: unlockForm.unlocked_by.trim(),
        unlocked_pin: unlockForm.unlocked_pin,
      });
      if (res?.success) {
        showToast(res.message || 'ปลดล็อก LOTO สำเร็จ', 'success');
        setUnlockTarget(null);
        setUnlockForm({ unlocked_by: '', unlocked_pin: '' });
        loadLoto();
      }
    } catch {
      // handled
    } finally {
      setUnlockSaving(false);
    }
  };

  // --- Hazard Handlers ---
  const openEditHazard = (h) => {
    setEditHazard(h);
    setHazardForm({
      status: h.status === 'Open' ? 'In Progress' : (h.status || 'In Progress'),
      assigned_to: h.assigned_to || '',
      notes: h.notes || '',
    });
  };

  const handleSaveHazard = async (e) => {
    e.preventDefault();
    if (isOffline || !editHazard) return;
    setHazardSaving(true);
    try {
      const res = await peApi.updateHazardStatus({
        wo_id: editHazard.wo_id,
        ...hazardForm,
      });
      if (res?.success) {
        showToast(res.message || 'อัปเดตจุดเสี่ยงสำเร็จ', 'success');
        setEditHazard(null);
        loadHazards();
      }
    } catch {
      // handled
    } finally {
      setHazardSaving(false);
    }
  };

  // --- Pre-Op Checklist Config Handlers ---
  const handleSelectConfigMachine = async (machineCode) => {
    setSelectedConfigCode(machineCode);
    if (!machineCode) {
      setConfigItems([]);
      return;
    }
    setConfigLoading(true);
    try {
      const res = await peApi.getPreopChecklistConfig(machineCode);
      if (res?.success) {
        setConfigItems(Array.isArray(res.data) ? res.data : []);
      }
    } catch {
      // handled
    } finally {
      setConfigLoading(false);
    }
  };

  const addChecklistRow = () => {
    setConfigItems((prev) => [
      ...prev,
      { item_order: prev.length + 1, item_text: '', is_critical: false },
    ]);
  };

  const moveChecklistRow = (idx, dir) => {
    const target = idx + dir;
    if (target < 0 || target >= configItems.length) return;
    setConfigItems((prev) => {
      const copy = [...prev];
      const temp = copy[idx];
      copy[idx] = copy[target];
      copy[target] = temp;
      return copy.map((it, i) => ({ ...it, item_order: i + 1 }));
    });
  };

  const handleSaveChecklistConfig = async () => {
    if (isOffline || !selectedConfigCode) return;
    const valid = configItems.filter((i) => String(i.item_text || '').trim() !== '');
    const ok = await confirm({
      title: 'ยืนยันการบันทึกแบบฟอร์ม Pre-Op',
      message: `บันทึกหัวข้อตรวจสอบจำนวน ${valid.length} รายการสำหรับเครื่อง ${selectedConfigCode} ใช่หรือไม่?`,
      confirmText: 'บันทึกหัวข้อตรวจ',
      cancelText: 'ยกเลิก',
    });
    if (!ok) return;
    setConfigSaving(true);
    try {
      const res = await peApi.savePreopChecklistConfig(selectedConfigCode, valid);
      if (res?.success) {
        showToast(res.message || 'บันทึก Checklist สำเร็จ', 'success');
        loadPreop();
        handleSelectConfigMachine(selectedConfigCode);
      }
    } catch {
      // handled
    } finally {
      setConfigSaving(false);
    }
  };

  // --- Print Filter Lists ---
  const filteredPrintMachines = useMemo(() => {
    const q = printSearch.trim().toLowerCase();
    return printData.machines.filter((m) => {
      if (printLine && m.line !== printLine) return false;
      if (!q) return true;
      return (
        String(m.machine_code || '').toLowerCase().includes(q) ||
        String(m.machine_name || '').toLowerCase().includes(q)
      );
    });
  }, [printData.machines, printLine, printSearch]);

  const filteredPrintEmployees = useMemo(() => {
    const q = printSearch.trim().toLowerCase();
    return printData.employees.filter((e) => {
      if (printLine && e.line !== printLine) return false;
      if (!q) return true;
      return (
        String(e.emp_id || '').toLowerCase().includes(q) ||
        String(e.name_th || '').toLowerCase().includes(q)
      );
    });
  }, [printData.employees, printLine, printSearch]);

  const printableMachines = useMemo(
    () => printData.machines.filter((m) => selectedMachineIds.includes(m.machine_id)),
    [printData.machines, selectedMachineIds]
  );

  const printableEmployees = useMemo(
    () => printData.employees.filter((e) => selectedEmpIds.includes(e.emp_id)),
    [printData.employees, selectedEmpIds]
  );

  const buildRequestPortalQrUrl = (machineCode) => {
    const base = window.location.href.split('#')[0];
    return `${base}#/pe/request?machine=${encodeURIComponent(machineCode)}`;
  };

  const toggleMachinePrint = (id) => {
    setSelectedMachineIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const toggleEmpPrint = (id) => {
    setSelectedEmpIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #pe-safety-print-sheet, #pe-safety-print-sheet * { visibility: visible !important; }
          #pe-safety-print-sheet { position: absolute !important; left: 0 !important; top: 0 !important; width: 100% !important; background: #fff !important; }
          .pe-print-card { break-inside: avoid; page-break-inside: avoid; }
        }
      `}</style>

      {/* Sub-Tabs Navigation */}
      <div className="print:hidden flex flex-wrap gap-2 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <button
          type="button"
          onClick={() => setSubTab('loto')}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${
            subTab === 'loto' ? 'bg-red-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Lock className="w-4 h-4" /> ระบบ LOTO นิรภัย
          {lockedCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-white text-red-700 text-[11px] font-extrabold">{lockedCount}</span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setSubTab('hazards')}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${
            subTab === 'hazards' ? 'bg-amber-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <AlertTriangle className="w-4 h-4" /> รายงานจุดเสี่ยง (Hazards)
        </button>
        <button
          type="button"
          onClick={() => setSubTab('preop')}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${
            subTab === 'preop' ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <ClipboardCheck className="w-4 h-4" /> ตรวจเช็ค Pre-Op & Checklist
        </button>
        <button
          type="button"
          onClick={() => setSubTab('print')}
          className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-2 ${
            subTab === 'print' ? 'bg-slate-900 dark:bg-blue-600 text-white shadow-sm' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
          }`}
        >
          <Printer className="w-4 h-4" /> พิมพ์ป้ายเครื่องจักร & บัตร LOTO
        </button>
      </div>

      {/* ==================== 1. LOTO CONTROL ==================== */}
      {subTab === 'loto' && (
        <div className="space-y-4">
          {lockedCount > 0 && (
            <div className="p-4 rounded-2xl bg-red-600 text-white flex flex-wrap items-center justify-between gap-3 shadow-md">
              <div className="flex items-center gap-3">
                <ShieldAlert className="w-7 h-7 shrink-0 animate-pulse" />
                <div>
                  <div className="font-extrabold text-sm sm:text-base">
                    แจ้งเตือนความปลอดภัย: มีเครื่องจักรติดป้าย LOTO อยู่ {lockedCount} เครื่อง
                  </div>
                  <div className="text-xs text-red-100">ห้ามเปิดจ่ายพลังงานหรือเดินเครื่องจนกว่าผู้ควบคุมงานจะตรวจสอบและยืนยันปลดล็อกด้วยรหัสผ่าน</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLotoOnlyLocked((v) => !v)}
                className="min-h-[44px] px-4 rounded-xl bg-white text-red-700 font-bold text-xs sm:text-sm"
              >
                {lotoOnlyLocked ? 'แสดงทั้งหมด' : 'กรองเฉพาะเครื่องที่ Lock'}
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-2.5">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              <input
                type="text"
                value={lotoSearch}
                onChange={(e) => setLotoSearch(e.target.value)}
                placeholder="ค้นหารหัส / ชื่อเครื่องจักร..."
                className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              />
            </div>
            <select
              value={lotoLine}
              onChange={(e) => setLotoLine(e.target.value)}
              className="min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
            >
              <option value="">ทุกสายการผลิต</option>
              {lotoLines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
            </select>
            <button
              type="button"
              onClick={loadLoto}
              disabled={lotoLoading}
              className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className={`w-4 h-4 ${lotoLoading ? 'animate-spin' : ''}`} /> รีเฟรช
            </button>
          </div>

          {/* Machine LOTO Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredLotoMachines.map((m) => {
              const isLocked = Number(m.is_loto) === 1;
              return (
                <div
                  key={m.machine_id}
                  className={`p-4 rounded-2xl border flex flex-col justify-between gap-3 ${
                    isLocked
                      ? 'bg-red-50/90 dark:bg-red-950/30 border-red-400 ring-1 ring-red-300'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-slate-500">{m.machine_code}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white leading-snug">{m.machine_name}</h4>
                        <div className="text-xs text-slate-500">{m.line || '-'} {m.area ? `• ${m.area}` : ''}</div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold inline-flex items-center gap-1 shrink-0 ${
                        isLocked ? 'bg-red-600 text-white' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}>
                        {isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                        {isLocked ? 'LOCKED' : 'SAFE'}
                      </span>
                    </div>

                    {isLocked && (
                      <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-900/80 border border-red-200 text-xs space-y-1">
                        <div className="font-bold text-red-700">เหตุผล: {m.loto_reason || '-'}</div>
                        <div className="text-slate-600">ผู้ล็อก: {m.locked_by || '-'} ({formatPeDateTime(m.locked_at)})</div>
                      </div>
                    )}
                  </div>

                  {isLocked ? (
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => {
                        setUnlockTarget(m);
                        setUnlockForm({ unlocked_by: '', unlocked_pin: '' });
                      }}
                      className="w-full min-h-[44px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Unlock className="w-4 h-4" /> ยืนยันปลดล็อก LOTO (Supervisor PIN)
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => {
                        setLockTarget(m);
                        setLockForm({ locked_by: '', wo_id: '', reason: '' });
                      }}
                      className="w-full min-h-[44px] rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
                    >
                      <Lock className="w-4 h-4" /> ติดป้ายตัดพลังงาน (Lock Out)
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* LOTO Audit History */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 font-bold text-sm text-slate-900 dark:text-white">
              ประวัติการบันทึก Lockout / Tagout ล่าสุด (Audit Trail)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 text-left">เครื่องจักร</th>
                    <th className="px-4 py-2.5 text-left">เหตุผล</th>
                    <th className="px-4 py-2.5 text-left">ผู้ล็อก / เวลา</th>
                    <th className="px-4 py-2.5 text-left">ผู้ปลด / เวลา</th>
                    <th className="px-4 py-2.5 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {lotoData.logs.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">ยังไม่มีประวัติ LOTO</td></tr>
                  ) : (
                    lotoData.logs.map((l) => (
                      <tr key={l.log_id}>
                        <td className="px-4 py-2.5">
                          <div className="font-semibold text-slate-900 dark:text-white">{l.machine_code} — {l.machine_name}</div>
                          {l.wo_number && <div className="text-[11px] font-mono text-blue-600">{l.wo_number}</div>}
                        </td>
                        <td className="px-4 py-2.5 max-w-xs">{l.reason || '-'}</td>
                        <td className="px-4 py-2.5">
                          <div>{l.locked_by || '-'}</div>
                          <div className="text-[11px] text-slate-400">{formatPeDateTime(l.locked_at)}</div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div>{l.unlocked_by || '-'}</div>
                          <div className="text-[11px] text-slate-400">{formatPeDateTime(l.unlocked_at)}</div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            String(l.status).toUpperCase() === 'LOCKED' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {l.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 2. HAZARD REPORTS ==================== */}
      {subTab === 'hazards' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">รายงานจุดเสี่ยงทั้งหมด</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">{hazardKpi.total || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">รอดำเนินการ (Pending)</div>
              <div className="mt-1 text-2xl font-extrabold text-red-600">{hazardKpi.pending || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">กำลังแก้ไข (In Progress)</div>
              <div className="mt-1 text-2xl font-extrabold text-amber-600">{hazardKpi.in_progress || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">แก้ไขเสร็จ (เฉลี่ย {formatNumber(hazardKpi.avg_response_min, 0)} น.)</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">{hazardKpi.completed || 0}</div>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-wrap gap-2.5 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {['all', 'Pending', 'In Progress', 'Completed'].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setHazardFilter((p) => ({ ...p, status: st }))}
                  className={`min-h-[44px] px-4 rounded-xl text-xs sm:text-sm font-semibold border ${
                    hazardFilter.status === st ? 'bg-amber-600 text-white border-amber-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  {st === 'all' ? 'ทั้งหมด' : st}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <select
                value={hazardFilter.days}
                onChange={(e) => setHazardFilter((p) => ({ ...p, days: Number(e.target.value) }))}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              >
                <option value={30}>30 วันล่าสุด</option>
                <option value={90}>90 วันล่าสุด</option>
                <option value={180}>180 วันล่าสุด</option>
                <option value={365}>1 ปีล่าสุด</option>
              </select>
              <button
                type="button"
                onClick={loadHazards}
                disabled={hazardLoading}
                className="min-h-[44px] px-4 rounded-xl bg-slate-900 text-white text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <RefreshCw className={`w-4 h-4 ${hazardLoading ? 'animate-spin' : ''}`} /> รีเฟรช
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {hazards.length === 0 ? (
              <div className="md:col-span-2 p-10 text-center bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 text-slate-400">
                {hazardLoading ? 'กำลังโหลดรายงานจุดเสี่ยง...' : 'ไม่พบรายการแจ้งจุดเสี่ยงในช่วงเวลาที่เลือก'}
              </div>
            ) : (
              hazards.map((h) => (
                <div key={h.wo_id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-2.5 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-mono text-xs font-bold text-amber-700">{h.wo_number}</span>
                        <h4 className="font-bold text-slate-900 dark:text-white">{h.issue_title}</h4>
                        <div className="text-xs text-slate-500">
                          {h.machine_name || 'พื้นที่โรงงาน'} • {h.line || '-'} • ผู้แจ้ง: {h.requested_by || '-'}
                        </div>
                      </div>
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                        h.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-700'
                          : h.status === 'In Progress'
                            ? 'bg-indigo-100 text-indigo-700'
                            : 'bg-red-100 text-red-700'
                      }`}>
                        {h.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 dark:text-slate-300">{h.issue_detail || '-'}</p>
                    {h.notes && (
                      <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                        <span className="font-bold">การแก้ไข:</span> {h.notes}
                      </div>
                    )}
                    {(h.image_path || h.photo_before) && (
                      <div className="flex items-center gap-2 pt-1">
                        {h.image_path && <PeImage path={h.image_path} alt={h.issue_title} className="w-16 h-16 rounded-xl object-cover" />}
                        {h.photo_before && <PeImage path={h.photo_before} alt="Before" className="w-16 h-16 rounded-xl object-cover" />}
                      </div>
                    )}
                  </div>
                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2 text-xs text-slate-500">
                    <span>แจ้งเมื่อ {formatPeDateTime(h.requested_at)}</span>
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => openEditHazard(h)}
                      className="min-h-[40px] px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold disabled:opacity-50"
                    >
                      จัดการ / อัปเดตสถานะ
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ==================== 3. PRE-OP AUDITS & CHECKLIST CONFIG ==================== */}
      {subTab === 'preop' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">อัตราผ่านเกณฑ์ (30 วัน)</div>
              <div className="mt-1 text-2xl font-extrabold text-emerald-600">{preopData.summary?.compliance ?? 100}%</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">ตรวจเช็ควันนี้ (วันนี้)</div>
              <div className="mt-1 text-2xl font-extrabold text-slate-900 dark:text-white">
                {preopData.today?.total || 0}{' '}
                <span className="text-xs font-semibold text-emerald-600">(ผ่าน {preopData.today?.passed || 0})</span>
              </div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">ไม่ผ่านเกณฑ์ (30 วัน)</div>
              <div className="mt-1 text-2xl font-extrabold text-rose-600">{preopData.summary?.failed || 0}</div>
            </div>
            <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="text-xs font-semibold text-slate-500">เครื่องจักรที่มี Checklist เฉพาะ</div>
              <div className="mt-1 text-2xl font-extrabold text-indigo-600">{(preopData.configured_machines || []).length} เครื่อง</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Checklist Configurator */}
            <div className="lg:col-span-5 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">ตั้งค่าแบบฟอร์มตรวจ Pre-Op รายเครื่องจักร</h4>
              <select
                value={selectedConfigCode}
                onChange={(e) => handleSelectConfigMachine(e.target.value)}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-sm"
              >
                <option value="">-- เลือกเครื่องจักรที่ต้องการตั้งค่า --</option>
                {lotoData.machines.map((m) => (
                  <option key={m.machine_code} value={m.machine_code}>
                    {m.machine_code} — {m.machine_name} ({m.line || '-'})
                  </option>
                ))}
              </select>

              {(preopData.configured_machines || []).length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {preopData.configured_machines.map((cm) => (
                    <button
                      key={cm.machine_code}
                      type="button"
                      onClick={() => handleSelectConfigMachine(cm.machine_code)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                        selectedConfigCode === cm.machine_code ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}
                    >
                      {cm.machine_code}
                    </button>
                  ))}
                </div>
              )}

              {selectedConfigCode && (
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {configLoading ? (
                    <div className="py-6 text-center text-xs text-slate-400">กำลังโหลดหัวข้อตรวจสอบ...</div>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                        {configItems.length === 0 && (
                          <div className="text-xs text-slate-400 py-3">ยังไม่มีหัวข้อเฉพาะสำหรับเครื่องนี้ กด "+ เพิ่มหัวข้อ" เพื่อสร้าง</div>
                        )}
                        {configItems.map((it, idx) => (
                          <div key={idx} className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/50 space-y-1.5">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-500 w-5">#{idx + 1}</span>
                              <input
                                type="text"
                                value={it.item_text}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setConfigItems((prev) => prev.map((row, i) => (i === idx ? { ...row, item_text: val } : row)));
                                }}
                                placeholder="ระบุหัวข้อตรวจสอบ..."
                                className="flex-1 min-h-[38px] px-2.5 rounded-lg border border-slate-200 bg-white dark:bg-slate-900 text-xs sm:text-sm"
                              />
                              <button type="button" onClick={() => moveChecklistRow(idx, -1)} disabled={idx === 0} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"><ArrowUp className="w-3.5 h-3.5" /></button>
                              <button type="button" onClick={() => moveChecklistRow(idx, 1)} disabled={idx === configItems.length - 1} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-30"><ArrowDown className="w-3.5 h-3.5" /></button>
                              <button
                                type="button"
                                onClick={() => setConfigItems((prev) => prev.filter((_, i) => i !== idx))}
                                className="p-1.5 rounded text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <label className="flex items-center gap-1.5 pl-6 text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(it.is_critical)}
                                onChange={(e) => {
                                  const chk = e.target.checked;
                                  setConfigItems((prev) => prev.map((row, i) => (i === idx ? { ...row, is_critical: chk } : row)));
                                }}
                              />
                              จุดวิกฤต (Critical Safety — ห้ามเดินเครื่องหากไม่ผ่าน)
                            </label>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-2">
                        <button
                          type="button"
                          onClick={addChecklistRow}
                          className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" /> เพิ่มหัวข้อ
                        </button>
                        <button
                          type="button"
                          disabled={configSaving || isOffline}
                          onClick={handleSaveChecklistConfig}
                          className="min-h-[44px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <Save className="w-4 h-4" /> {configSaving ? 'กำลังบันทึก...' : 'บันทึกแบบฟอร์ม'}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Pre-Op Audit History Table */}
            <div className="lg:col-span-7 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900 dark:text-white">ประวัติผลการตรวจเช็คก่อนเดินเครื่อง (Pre-Op Logs)</span>
                <button type="button" onClick={loadPreop} className="min-h-[38px] px-3 rounded-lg bg-slate-100 text-xs font-semibold inline-flex items-center gap-1">
                  <RefreshCw className={`w-3.5 h-3.5 ${preopLoading ? 'animate-spin' : ''}`} /> รีเฟรช
                </button>
              </div>
              <div className="overflow-x-auto max-h-[520px]">
                <table className="w-full text-xs sm:text-sm">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-slate-500 sticky top-0">
                    <tr>
                      <th className="px-3 py-2.5 text-left">เวลา / กะ</th>
                      <th className="px-3 py-2.5 text-left">เครื่องจักร</th>
                      <th className="px-3 py-2.5 text-left">ผู้ตรวจ</th>
                      <th className="px-3 py-2.5 text-center">ผลตรวจ</th>
                      <th className="px-3 py-2.5 text-right">ดูรายละเอียด</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {preopData.logs.length === 0 ? (
                      <tr><td colSpan={5} className="px-4 py-10 text-center text-slate-400">ยังไม่มีข้อมูล Pre-Op Audits</td></tr>
                    ) : (
                      preopData.logs.map((log) => (
                        <tr key={log.audit_id}>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="font-semibold">{formatPeDate(log.shift_date)} ({log.shift_name})</div>
                            <div className="text-[11px] text-slate-400">{formatPeDateTime(log.audited_at)}</div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-semibold text-slate-900 dark:text-white">{log.machine_code} — {log.machine_name}</div>
                            <div className="text-[11px] text-slate-400">{log.line || '-'}</div>
                          </td>
                          <td className="px-3 py-2.5">{log.audited_by}</td>
                          <td className="px-3 py-2.5 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold inline-flex items-center gap-1 ${
                              log.status === 'Passed' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                            }`}>
                              {log.status === 'Passed' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <XCircle className="w-3.5 h-3.5" />}
                              {log.status}
                            </span>
                            {log.wo_number && <div className="text-[10px] font-mono text-blue-600 mt-0.5">{log.wo_number}</div>}
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setPreviewAudit(log)}
                              className="min-h-[38px] px-2.5 rounded-lg border border-slate-200 hover:bg-slate-100 inline-flex items-center gap-1 text-xs font-semibold"
                            >
                              <Eye className="w-3.5 h-3.5" /> ดูผล
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 4. PRINT VISUAL BOARDS & LOTO CARDS ==================== */}
      {subTab === 'print' && (
        <div className="space-y-4">
          <div className="print:hidden p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPrintMode('machine')}
                  className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 ${
                    printMode === 'machine' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <QrCode className="w-4 h-4" /> ป้าย QR ประจำเครื่องจักร
                </button>
                <button
                  type="button"
                  onClick={() => setPrintMode('loto_card')}
                  className={`min-h-[44px] px-4 rounded-xl text-sm font-semibold inline-flex items-center gap-1.5 ${
                    printMode === 'loto_card' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <UserCheck className="w-4 h-4" /> บัตรติดป้าย LOTO รายบุคคล
                </button>
              </div>
              <button
                type="button"
                onClick={() => window.print()}
                disabled={printMode === 'machine' ? printableMachines.length === 0 : printableEmployees.length === 0}
                className="min-h-[44px] px-5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold inline-flex items-center gap-2 disabled:opacity-40"
              >
                <Printer className="w-4 h-4" /> สั่งพิมพ์เอกสาร ({printMode === 'machine' ? printableMachines.length : printableEmployees.length})
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <input
                type="text"
                value={printSearch}
                onChange={(e) => setPrintSearch(e.target.value)}
                placeholder={printMode === 'machine' ? 'ค้นหารหัส / ชื่อเครื่องจักร...' : 'ค้นหารหัส / ชื่อพนักงาน...'}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              />
              <select
                value={printLine}
                onChange={(e) => setPrintLine(e.target.value)}
                className="min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
              >
                <option value="">ทุกสายการผลิต</option>
                {printData.lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (printMode === 'machine') setSelectedMachineIds(filteredPrintMachines.map((m) => m.machine_id));
                    else setSelectedEmpIds(filteredPrintEmployees.map((e) => e.emp_id));
                  }}
                  className="flex-1 min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                >
                  เลือกตามตัวกรอง
                </button>
                <button
                  type="button"
                  onClick={() => (printMode === 'machine' ? setSelectedMachineIds([]) : setSelectedEmpIds([]))}
                  className="min-h-[44px] px-3 rounded-xl border border-slate-200 text-xs font-semibold hover:bg-slate-50"
                >
                  ล้างการเลือก
                </button>
              </div>
            </div>

            {/* Selection Chips */}
            <div className="max-h-40 overflow-y-auto flex flex-wrap gap-1.5 pt-1">
              {printLoading && <span className="text-xs text-slate-400">กำลังโหลดข้อมูล...</span>}
              {printMode === 'machine'
                ? filteredPrintMachines.map((m) => {
                    const active = selectedMachineIds.includes(m.machine_id);
                    return (
                      <button
                        key={m.machine_id}
                        type="button"
                        onClick={() => toggleMachinePrint(m.machine_id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          active ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.machine_code}
                      </button>
                    );
                  })
                : filteredPrintEmployees.map((e) => {
                    const active = selectedEmpIds.includes(e.emp_id);
                    return (
                      <button
                        key={e.emp_id}
                        type="button"
                        onClick={() => toggleEmpPrint(e.emp_id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                          active ? 'bg-red-600 text-white border-red-600' : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}
                      >
                        {e.name_th} ({e.emp_id})
                      </button>
                    );
                  })}
            </div>
          </div>

          {/* Printable Preview Sheet */}
          <div id="pe-safety-print-sheet" className="grid grid-cols-1 md:grid-cols-2 gap-4 print:grid-cols-2">
            {printMode === 'machine'
              ? printableMachines.map((m) => (
                  <div
                    key={m.machine_id}
                    className="pe-print-card p-5 rounded-2xl bg-white text-slate-900 border-2 border-slate-900 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700">
                        SNC MES • PE MAINTENANCE PORTAL
                      </div>
                      <div className="text-2xl font-black font-mono tracking-tight">{m.machine_code}</div>
                      <div className="text-base font-bold leading-snug">{m.machine_name}</div>
                      <div className="text-xs text-slate-600">สายผลิต: {m.line || '-'} {m.area ? `• ${m.area}` : ''}</div>
                      <div className="pt-2 text-xs font-semibold text-rose-700">
                        สแกน QR Code เพื่อแจ้งซ่อม / บันทึกหยุดเครื่อง / ตรวจ Pre-Op
                      </div>
                    </div>
                    <div className="shrink-0 p-2 rounded-xl border border-slate-300 bg-white">
                      <QRCodeSVG value={buildRequestPortalQrUrl(m.machine_code)} size={112} level="M" />
                    </div>
                  </div>
                ))
              : printableEmployees.map((e) => {
                  const avatarSrc = resolvePeMediaUrl(e.profile_picture);
                  return (
                    <div
                      key={e.emp_id}
                      className="pe-print-card rounded-2xl bg-white text-slate-900 border-2 border-red-700 overflow-hidden"
                    >
                      <div className="bg-red-600 text-white px-4 py-2 text-center font-black tracking-wider text-sm">
                        DANGER • DO NOT OPERATE (LOTO AUTHORIZED)
                      </div>
                      <div className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          {avatarSrc ? (
                            <img src={avatarSrc} alt={e.name_th} className="w-16 h-16 rounded-xl object-cover border border-slate-300 shrink-0" />
                          ) : (
                            <div className="w-16 h-16 rounded-xl bg-slate-200 flex items-center justify-center font-bold text-slate-600 shrink-0">
                              {String(e.name_th || 'U').slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="font-extrabold text-base truncate">{e.name_th}</div>
                            <div className="text-xs font-mono text-slate-600">ID: {e.emp_id}</div>
                            <div className="text-xs text-slate-600 truncate">{e.position || '-'}</div>
                            <div className="text-xs font-semibold text-red-700">สายงาน: {e.line || '-'}</div>
                          </div>
                        </div>
                        <div className="shrink-0 p-1.5 border border-slate-200 rounded-lg">
                          <QRCodeSVG value={String(e.emp_id || '')} size={72} level="M" />
                        </div>
                      </div>
                    </div>
                  );
                })}
          </div>
        </div>
      )}

      {/* ==================== MODAL: LOCK MACHINE ==================== */}
      {lockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-red-600 text-white flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Lock className="w-4 h-4" /> ติดป้าย LOTO: {lockTarget.machine_code}</h3>
              <button type="button" onClick={() => setLockTarget(null)} className="min-w-[40px] min-h-[40px] rounded-lg hover:bg-red-700 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleLockSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อผู้ติดป้ายล็อก (เว้นว่างใช้ชื่อผู้ล็อกอิน)</label>
                <input
                  type="text"
                  value={lockForm.locked_by}
                  onChange={(e) => setLockForm((p) => ({ ...p, locked_by: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">อ้างอิงใบแจ้งซ่อม (Optional)</label>
                <select
                  value={lockForm.wo_id}
                  onChange={(e) => setLockForm((p) => ({ ...p, wo_id: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                >
                  <option value="">-- ไม่ผูกใบแจ้งซ่อม --</option>
                  {lotoData.open_wos.map((w) => (
                    <option key={w.wo_id} value={w.wo_id}>{w.wo_number} — {w.issue_title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">เหตุผลการตัดแยกระบบพลังงาน *</label>
                <textarea
                  rows={3}
                  required
                  value={lockForm.reason}
                  onChange={(e) => setLockForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="ระบุจุดตัดไฟ / ลม / ระบบความปลอดภัย..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setLockTarget(null)} className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold">ยกเลิก</button>
                <button type="submit" disabled={lockSaving || isOffline} className="min-h-[44px] px-5 rounded-xl bg-red-600 text-white text-sm font-bold disabled:opacity-50">
                  {lockSaving ? 'กำลังดำเนินการ...' : 'ยืนยัน Lock Out'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: UNLOCK MACHINE ==================== */}
      {unlockTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 bg-emerald-600 text-white flex items-center justify-between">
              <h3 className="font-bold flex items-center gap-2"><Unlock className="w-4 h-4" /> ปลดล็อก LOTO: {unlockTarget.machine_code}</h3>
              <button type="button" onClick={() => setUnlockTarget(null)} className="min-w-[40px] min-h-[40px] rounded-lg hover:bg-emerald-700 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleUnlockSubmit} className="p-5 space-y-3">
              <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800">
                กรุณายืนยันตัวตนด้วยบัญชีผู้รับผิดชอบ (Supervisor / PE) เพื่อปลดป้าย LOTO และบันทึกประวัติความปลอดภัย
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Username ผู้ยืนยันปลดล็อก *</label>
                <input
                  type="text"
                  required
                  value={unlockForm.unlocked_by}
                  onChange={(e) => setUnlockForm((p) => ({ ...p, unlocked_by: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">รหัสผ่านยืนยัน (Password / PIN) *</label>
                <input
                  type="password"
                  required
                  value={unlockForm.unlocked_pin}
                  onChange={(e) => setUnlockForm((p) => ({ ...p, unlocked_pin: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setUnlockTarget(null)} className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold">ยกเลิก</button>
                <button type="submit" disabled={unlockSaving || isOffline} className="min-h-[44px] px-5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
                  {unlockSaving ? 'กำลังตรวจสอบ...' : 'ยืนยันปลดล็อก'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: UPDATE HAZARD ==================== */}
      {editHazard && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold">อัปเดตจุดเสี่ยง {editHazard.wo_number}</h3>
              <button type="button" onClick={() => setEditHazard(null)} className="min-w-[40px] min-h-[40px] rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSaveHazard} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">สถานะดำเนินการ</label>
                <select
                  value={hazardForm.status}
                  onChange={(e) => setHazardForm((p) => ({ ...p, status: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                >
                  <option value="Pending">Pending (รอดำเนินการ)</option>
                  <option value="In Progress">In Progress (กำลังแก้ไข)</option>
                  <option value="Completed">Completed (แก้ไขเสร็จสิ้น)</option>
                  <option value="Cancelled">Cancelled (ยกเลิก)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้รับผิดชอบแก้ไข</label>
                <input
                  type="text"
                  value={hazardForm.assigned_to}
                  onChange={(e) => setHazardForm((p) => ({ ...p, assigned_to: e.target.value }))}
                  className="w-full min-h-[44px] px-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">รายละเอียดการแก้ไข</label>
                <textarea
                  rows={3}
                  value={hazardForm.notes}
                  onChange={(e) => setHazardForm((p) => ({ ...p, notes: e.target.value }))}
                  className="w-full p-3 rounded-xl border border-slate-200 text-sm"
                />
              </div>
              <div className="pt-2 flex justify-end gap-2">
                <button type="button" onClick={() => setEditHazard(null)} className="min-h-[44px] px-4 rounded-xl border border-slate-200 text-sm font-semibold">ยกเลิก</button>
                <button type="submit" disabled={hazardSaving || isOffline} className="min-h-[44px] px-5 rounded-xl bg-amber-600 text-white text-sm font-bold disabled:opacity-50">
                  {hazardSaving ? 'กำลังบันทึก...' : 'บันทึกการอัปเดต'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== MODAL: PREVIEW PRE-OP AUDIT ==================== */}
      {previewAudit && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="font-bold">ผลการตรวจ Pre-Op: {previewAudit.machine_code}</h3>
              <button type="button" onClick={() => setPreviewAudit(null)} className="min-w-[40px] min-h-[40px] rounded-lg hover:bg-slate-100 flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3 overflow-y-auto text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-slate-500">ผู้ตรวจ:</span> <strong>{previewAudit.audited_by}</strong></div>
                <div><span className="text-slate-500">เวลา:</span> <strong>{formatPeDateTime(previewAudit.audited_at)}</strong></div>
              </div>
              {previewAudit.failed_reason && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  สาเหตุที่ไม่ผ่าน: {previewAudit.failed_reason}
                </div>
              )}
              {previewAudit.image_path && (
                <PeImage path={previewAudit.image_path} alt="Pre-Op Photo" className="w-32 h-32 rounded-xl object-cover" />
              )}
              <div className="space-y-1.5">
                {(() => {
                  let parsed = [];
                  try {
                    parsed = typeof previewAudit.checklist_data === 'string'
                      ? JSON.parse(previewAudit.checklist_data)
                      : (Array.isArray(previewAudit.checklist_data) ? previewAudit.checklist_data : []);
                  } catch {
                    parsed = [];
                  }
                  if (parsed.length === 0) return <div className="text-slate-400 text-xs">ไม่มีข้อมูลรายการย่อย</div>;
                  return parsed.map((row, idx) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 flex items-center justify-between gap-2 text-xs">
                      <span>{idx + 1}. {row.text || row.item_text || '-'}</span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                        String(row.answer).toLowerCase() === 'yes' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {row.answer || '-'}
                      </span>
                    </div>
                  ));
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Ban, AlertTriangle, ClipboardCheck, History, Camera, RotateCcw,
  RotateCw, CheckCircle2, ArrowLeft, WifiOff, Send
} from 'lucide-react';
import { peApi, compressPeImageToBase64 } from '../../../shared/services/peApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import PeImage from '../components/PeImage';
import {
  WO_TYPES, DOWNTIME_CATEGORIES, WO_STATUS_META,
  getLocalIsoDate, formatPeDateTime
} from '../utils/peFormatters';

const HAZARD_PRESETS = [
  'ปุ่ม Emergency Stop ชำรุด / ไม่ทำงาน',
  'Safety Sensor ถูกปิด / ไม่ทำงาน',
  'สายไฟชำรุด / มีไฟรั่ว / ประกายไฟ',
  'ฝาครอบ / อุปกรณ์ป้องกันหลุดหาย',
  'พบความเสี่ยงด้านความปลอดภัยอื่นๆ',
];

export default function PeRequestPage() {
  const { user } = useAuth();
  const showToast = useToast();
  const actorName = user?.fullname || user?.username || '';

  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [activeTab, setActiveTab] = useState('repair'); // 'repair' | 'downtime' | 'hazard' | 'preop' | 'history'

  const [machines, setMachines] = useState([]);
  const [lines, setLines] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // 1. Repair Form State
  const [repairForm, setRepairForm] = useState({
    requested_by: actorName,
    wo_type: 'Corrective',
    machine_id: '',
    machine_name: '',
    line: '',
    issue_title: '',
    issue_detail: '',
    priority: 'Normal',
    image_base64: '',
  });
  const [repairFile, setRepairFile] = useState(null);
  const [repairRotation, setRepairRotation] = useState(0);

  // 2. Downtime Form State
  const [dtForm, setDtForm] = useState(() => {
    const now = new Date();
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    return {
      machine_id: '',
      machine_name: '',
      line: '',
      log_date: getLocalIsoDate(0),
      start_time: hhmm,
      end_date: '',
      end_time: '',
      cause_category: '',
      cause_detail: '',
      recovered_by: '',
      create_wo: false,
    };
  });

  // 3. Safety Hazard State
  const [hazardForm, setHazardForm] = useState({
    machine_code: '',
    issue_title: '',
    issue_detail: '',
    image_base64: '',
  });

  // 4. Pre-Op Audit State
  const [preopForm, setPreopForm] = useState({
    machine_code: '',
    shift: new Date().getHours() >= 20 || new Date().getHours() < 8 ? 'Night' : 'Day',
    audited_by: actorName,
    remarks: '',
  });
  const [checklist, setChecklist] = useState([]);
  const [alreadyAudited, setAlreadyAudited] = useState(false);
  const [loadingChecklist, setLoadingChecklist] = useState(false);

  // 5. History State
  const [histMode, setHistMode] = useState('wo'); // 'wo' | 'dt'
  const [histStart, setHistStart] = useState(() => getLocalIsoDate(-3));
  const [histEnd, setHistEnd] = useState(() => getLocalIsoDate(0));
  const [histRows, setHistRows] = useState([]);
  const [histLoading, setHistLoading] = useState(false);

  useEffect(() => {
    setRepairForm((p) => (p.requested_by ? p : { ...p, requested_by: actorName }));
    setPreopForm((p) => (p.audited_by ? p : { ...p, audited_by: actorName }));
  }, [actorName]);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    peApi.getMachinesAndTechnicians().then((res) => {
      setMachines(res?.data || []);
      setLines(res?.lines || []);
    }).catch(() => {});
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, []);

  const loadHistory = useCallback(async () => {
    setHistLoading(true);
    try {
      if (histMode === 'wo') {
        const res = await peApi.getWorkOrders({ startDate: histStart, endDate: histEnd, limit: 100 });
        setHistRows(res?.data || []);
      } else {
        const res = await peApi.getDowntime({ startDate: histStart, endDate: histEnd, limit: 100 });
        setHistRows(res?.data || []);
      }
    } finally {
      setHistLoading(false);
    }
  }, [histMode, histStart, histEnd]);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab, loadHistory]);

  const processRepairImage = async (file, deg) => {
    if (!file) return;
    const b64 = await compressPeImageToBase64(file, { maxSide: 1200, quality: 0.82, rotateDeg: deg });
    setRepairForm((p) => ({ ...p, image_base64: b64 }));
  };

  const handleSubmitRepair = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    setSubmitting(true);
    try {
      const res = await peApi.createWorkOrder({
        ...repairForm,
        machine_id: repairForm.machine_id || null,
        image_base64: repairForm.image_base64 || undefined,
      });
      showToast(res?.message || 'ส่งเรื่องแจ้งซ่อมสำเร็จ', 'success');
      setRepairForm((p) => ({
        ...p,
        issue_title: '',
        issue_detail: '',
        image_base64: '',
      }));
      setRepairFile(null);
      setRepairRotation(0);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitDowntime = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    setSubmitting(true);
    try {
      const res = await peApi.addDowntime({
        ...dtForm,
        machine_id: dtForm.machine_id || null,
      });
      showToast(res?.message || 'บันทึกเครื่องจักรหยุดสำเร็จ', 'success');
      setDtForm((p) => ({ ...p, cause_detail: '', end_date: '', end_time: '', create_wo: false }));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitHazard = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    setSubmitting(true);
    try {
      const res = await peApi.submitHazardReport(hazardForm);
      showToast(res?.message || 'ส่งรายงานจุดเสี่ยงฉุกเฉินแล้ว', 'success');
      setHazardForm({ machine_code: '', issue_title: '', issue_detail: '', image_base64: '' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupChecklist = async () => {
    const code = preopForm.machine_code.trim().toUpperCase();
    if (!code) {
      showToast('กรุณาระบุรหัสเครื่องจักรก่อนค้นหารายการตรวจ', 'error');
      return;
    }
    setLoadingChecklist(true);
    try {
      const res = await peApi.getPreopChecklist(code);
      const items = (res?.data || []).map((it) => ({ ...it, answer: 'yes' }));
      setChecklist(items);
      setAlreadyAudited(Boolean(res?.already_audited));
    } finally {
      setLoadingChecklist(false);
    }
  };

  const hasPreopFail = useMemo(() => checklist.some((item) => item.answer === 'no'), [checklist]);

  const handleSubmitPreop = async (e) => {
    e.preventDefault();
    if (isOffline) return;
    if (hasPreopFail && !preopForm.remarks.trim()) {
      showToast('กรุณาระบุรายละเอียดปัญหาที่พบในรายการที่ไม่ผ่าน', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const res = await peApi.submitPreop({
        ...preopForm,
        checklist_data: checklist.map((c) => ({
          item_id: c.item_id,
          item_text: c.item_text,
          is_critical: c.is_critical,
          answer: c.answer,
        })),
      });
      showToast(res?.message || 'บันทึกผล Pre-Op เรียบร้อยแล้ว', 'success');
      setPreopForm((p) => ({ ...p, remarks: '' }));
      setAlreadyAudited(true);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEndDowntime = async (row) => {
    if (isOffline) return;
    const res = await peApi.endDowntime(row.downtime_id);
    showToast(res?.message || 'บันทึกเครื่องจักรกลับมาทำงานแล้ว', 'success');
    await loadHistory();
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      {isOffline && (
        <div className="p-3 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-semibold flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>ขณะนี้ออฟไลน์ — ปิดรับการส่งคำขอชั่วคราวจนกว่าเครือข่ายจะกลับมา</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-blue-900 text-white shadow-md flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold">PE Stop Causes & Mobile Request</h1>
          <p className="text-xs text-slate-300">แจ้งซ่อม • แจ้งเครื่องหยุด • ความปลอดภัย • Pre-Op</p>
        </div>
        <Link
          to="/pe"
          className="min-h-[44px] px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
        >
          <ArrowLeft className="w-4 h-4" /> ศูนย์ซ่อมบำรุง
        </Link>
      </div>

      {/* 5 Mobile-Friendly Tabs */}
      <div className="grid grid-cols-5 gap-1.5 p-1.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
        {[
          { id: 'repair', label: 'แจ้งซ่อม', icon: Wrench },
          { id: 'downtime', label: 'เครื่องหยุด', icon: Ban },
          { id: 'hazard', label: 'จุดเสี่ยง', icon: AlertTriangle },
          { id: 'preop', label: 'Pre-Op', icon: ClipboardCheck },
          { id: 'history', label: 'ประวัติ', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          const active = activeTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveTab(t.id)}
              className={`min-h-[48px] px-1 py-1.5 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors ${
                active ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="truncate max-w-full">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Repair WO */}
      {activeTab === 'repair' && (
        <form onSubmit={handleSubmitRepair} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อผู้แจ้ง *</label>
            <input
              type="text"
              required
              value={repairForm.requested_by}
              onChange={(e) => setRepairForm((p) => ({ ...p, requested_by: e.target.value }))}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ประเภทงาน *</label>
              <select
                value={repairForm.wo_type}
                onChange={(e) => setRepairForm((p) => ({ ...p, wo_type: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                {WO_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ระดับความสำคัญ *</label>
              <select
                value={repairForm.priority}
                onChange={(e) => setRepairForm((p) => ({ ...p, priority: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Normal">Normal (รอได้)</option>
                <option value="High">High (ด่วน)</option>
                <option value="Critical">Critical (ฉุกเฉิน)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">เลือกเครื่องจักรจากระบบ</label>
            <select
              value={repairForm.machine_id}
              onChange={(e) => {
                const id = e.target.value;
                const found = machines.find((m) => String(m.machine_id) === id);
                setRepairForm((p) => ({
                  ...p,
                  machine_id: id,
                  machine_name: found ? found.machine_name : p.machine_name,
                  line: found ? found.line : p.line,
                }));
              }}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">-- ไม่ระบุ / อุปกรณ์ทั่วไป --</option>
              {machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>{m.line} - {m.machine_code} ({m.machine_name})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่ออุปกรณ์/เครื่องจักร *</label>
              <input
                type="text"
                required
                value={repairForm.machine_name}
                onChange={(e) => setRepairForm((p) => ({ ...p, machine_name: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ไลน์ผลิต/แผนก *</label>
              <input
                type="text"
                required
                list="reqLinesList"
                value={repairForm.line}
                onChange={(e) => setRepairForm((p) => ({ ...p, line: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
              <datalist id="reqLinesList">
                {lines.map((ln) => <option key={ln} value={ln} />)}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">อาการเสีย / หัวข้อปัญหา *</label>
            <input
              type="text"
              required
              value={repairForm.issue_title}
              onChange={(e) => setRepairForm((p) => ({ ...p, issue_title: e.target.value }))}
              placeholder="เช่น มอเตอร์ไม่หมุน, ลมรั่ว, เซ็นเซอร์ไม่จับ..."
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">รายละเอียดเพิ่มเติม</label>
            <textarea
              rows={2}
              value={repairForm.issue_detail}
              onChange={(e) => setRepairForm((p) => ({ ...p, issue_detail: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">รูปถ่ายปัญหา (บีบอัด + หมุนภาพได้)</label>
            <label className="min-h-[44px] px-4 rounded-xl border border-dashed border-blue-400 bg-blue-50/40 text-blue-700 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer">
              <Camera className="w-4 h-4" />
              <span>{repairForm.image_base64 ? 'เปลี่ยนรูปถ่ายปัญหา' : 'ถ่ายภาพ / เลือกรูปถ่าย'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  setRepairFile(file);
                  setRepairRotation(0);
                  await processRepairImage(file, 0);
                }}
              />
            </label>
            {repairForm.image_base64 && (
              <div className="mt-2 space-y-2 text-center">
                <img src={repairForm.image_base64} alt="Preview" className="max-h-48 mx-auto rounded-xl border object-contain" />
                {repairFile && (
                  <div className="inline-flex gap-2">
                    <button
                      type="button"
                      onClick={async () => {
                        const next = (repairRotation - 90 + 360) % 360;
                        setRepairRotation(next);
                        await processRepairImage(repairFile, next);
                      }}
                      className="min-h-[38px] px-3 rounded-lg border text-xs inline-flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> หมุนซ้าย
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        const next = (repairRotation + 90) % 360;
                        setRepairRotation(next);
                        await processRepairImage(repairFile, next);
                      }}
                      className="min-h-[38px] px-3 rounded-lg border text-xs inline-flex items-center gap-1"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> หมุนขวา
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting || isOffline}
            className="w-full min-h-[48px] rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {submitting ? 'กำลังส่งข้อมูล...' : 'ส่งเรื่องแจ้งซ่อม'}
          </button>
        </form>
      )}

      {/* Tab 2: Stop / Downtime Log */}
      {activeTab === 'downtime' && (
        <form onSubmit={handleSubmitDowntime} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-center">
            <div className="font-bold text-sm text-red-700">บันทึกเครื่องจักรหยุดทำงาน (Downtime)</div>
            <div className="text-xs text-red-600/80">บันทึกเวลาหยุดเครื่องเพื่อวิเคราะห์ Loss และสามารถเปิดใบงานซ่อมอัตโนมัติได้</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">เลือกเครื่องจักร</label>
            <select
              value={dtForm.machine_id}
              onChange={(e) => {
                const id = e.target.value;
                const found = machines.find((m) => String(m.machine_id) === id);
                setDtForm((p) => ({
                  ...p,
                  machine_id: id,
                  machine_name: found ? found.machine_name : p.machine_name,
                  line: found ? found.line : p.line,
                }));
              }}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">-- ไม่ระบุ --</option>
              {machines.map((m) => (
                <option key={m.machine_id} value={m.machine_id}>{m.line} - {m.machine_code} ({m.machine_name})</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ชื่อเครื่องจักร *</label>
              <input
                type="text"
                required
                value={dtForm.machine_name}
                onChange={(e) => setDtForm((p) => ({ ...p, machine_name: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ไลน์ผลิต *</label>
              <input
                type="text"
                required
                list="reqLinesList2"
                value={dtForm.line}
                onChange={(e) => setDtForm((p) => ({ ...p, line: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
              <datalist id="reqLinesList2">
                {lines.map((ln) => <option key={ln} value={ln} />)}
              </datalist>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่เริ่มหยุด *</label>
              <input
                type="date"
                required
                value={dtForm.log_date}
                onChange={(e) => setDtForm((p) => ({ ...p, log_date: e.target.value }))}
                className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">เวลาเริ่ม *</label>
              <input
                type="time"
                required
                value={dtForm.start_time}
                onChange={(e) => setDtForm((p) => ({ ...p, start_time: e.target.value }))}
                className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">วันที่สิ้นสุด (ถ้าแก้ไขแล้ว)</label>
              <input
                type="date"
                value={dtForm.end_date}
                onChange={(e) => setDtForm((p) => ({ ...p, end_date: e.target.value }))}
                className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">เวลาสิ้นสุด (เว้นว่างได้)</label>
              <input
                type="time"
                value={dtForm.end_time}
                onChange={(e) => setDtForm((p) => ({ ...p, end_time: e.target.value }))}
                className="w-full min-h-[44px] px-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">สาเหตุการหยุด (Category) *</label>
            <select
              required
              value={dtForm.cause_category}
              onChange={(e) => setDtForm((p) => ({ ...p, cause_category: e.target.value }))}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">-- เลือกหมวดหมู่สาเหตุ --</option>
              {DOWNTIME_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">รายละเอียดอาการ *</label>
              <input
                type="text"
                required
                value={dtForm.cause_detail}
                onChange={(e) => setDtForm((p) => ({ ...p, cause_detail: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้แก้ไข (ถ้ามี)</label>
              <input
                type="text"
                value={dtForm.recovered_by}
                onChange={(e) => setDtForm((p) => ({ ...p, recovered_by: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          <label className="flex items-start gap-2.5 p-3 rounded-xl border border-red-200 bg-red-50/40 cursor-pointer">
            <input
              type="checkbox"
              checked={dtForm.create_wo}
              onChange={(e) => setDtForm((p) => ({ ...p, create_wo: e.target.checked }))}
              className="mt-0.5 w-4 h-4 accent-red-600"
            />
            <span className="text-xs font-semibold text-red-700">สร้างใบแจ้งซ่อม (Work Order) ให้ทีม PE เข้าแก้ไขทันที</span>
          </label>

          <button
            type="submit"
            disabled={submitting || isOffline}
            className="w-full min-h-[48px] rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึกเวลาหยุดเครื่อง'}
          </button>
        </form>
      )}

      {/* Tab 3: Safety Hazard Report */}
      {activeTab === 'hazard' && (
        <form onSubmit={handleSubmitHazard} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <div className="font-bold text-sm text-amber-800">รายงานจุดเสี่ยงด้านความปลอดภัย (Safety Hazard)</div>
            <div className="text-xs text-amber-700">ระบบจะเปิดใบงานฉุกเฉินระดับ Critical เพื่อให้ทีมวิศวกรรมตรวจสอบทันที</div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">รหัสเครื่องจักร (Machine Code) *</label>
            <input
              type="text"
              required
              list="hazardMachineList"
              value={hazardForm.machine_code}
              onChange={(e) => setHazardForm((p) => ({ ...p, machine_code: e.target.value.toUpperCase() }))}
              placeholder="เช่น ROB-PRS-003"
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm uppercase font-mono"
            />
            <datalist id="hazardMachineList">
              {machines.map((m) => <option key={m.machine_id} value={m.machine_code}>{m.machine_name}</option>)}
            </datalist>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">หัวข้อความเสี่ยง *</label>
            <select
              required
              value={hazardForm.issue_title}
              onChange={(e) => setHazardForm((p) => ({ ...p, issue_title: e.target.value }))}
              className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            >
              <option value="">-- เลือกหัวข้อปัญหา --</option>
              {HAZARD_PRESETS.map((txt) => <option key={txt} value={txt}>{txt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">รายละเอียดเพิ่มเติม</label>
            <textarea
              rows={2}
              value={hazardForm.issue_detail}
              onChange={(e) => setHazardForm((p) => ({ ...p, issue_detail: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">รูปภาพหลักฐาน</label>
            <label className="min-h-[44px] px-4 rounded-xl border border-dashed border-red-300 bg-red-50/40 text-red-700 flex items-center justify-center gap-2 text-sm font-medium cursor-pointer">
              <Camera className="w-4 h-4" />
              <span>{hazardForm.image_base64 ? 'แนบภาพหลักฐานแล้ว' : 'แนบภาพหลักฐานความปลอดภัย'}</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  const b64 = await compressPeImageToBase64(f);
                  setHazardForm((p) => ({ ...p, image_base64: b64 }));
                }}
              />
            </label>
            {hazardForm.image_base64 && <img src={hazardForm.image_base64} alt="Hazard" className="mt-2 max-h-40 mx-auto rounded-xl border" />}
          </div>

          <button
            type="submit"
            disabled={submitting || isOffline}
            className="w-full min-h-[48px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? 'กำลังส่งรายงาน...' : 'ส่งรายงานจุดเสี่ยงทันที'}
          </button>
        </form>
      )}

      {/* Tab 4: Pre-Op Checklist */}
      {activeTab === 'preop' && (
        <form onSubmit={handleSubmitPreop} className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3.5">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="block text-xs font-semibold text-slate-600 mb-1">รหัสเครื่องจักร *</label>
              <input
                type="text"
                required
                list="preopMachineList"
                value={preopForm.machine_code}
                onChange={(e) => setPreopForm((p) => ({ ...p, machine_code: e.target.value.toUpperCase() }))}
                placeholder="เช่น ROB-PRS-003"
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm uppercase font-mono"
              />
              <datalist id="preopMachineList">
                {machines.map((m) => <option key={m.machine_id} value={m.machine_code}>{m.machine_name}</option>)}
              </datalist>
            </div>
            <button
              type="button"
              onClick={handleLookupChecklist}
              disabled={loadingChecklist}
              className="min-h-[44px] px-4 rounded-xl bg-slate-800 text-white text-xs font-semibold shrink-0"
            >
              {loadingChecklist ? 'กำลังโหลด...' : 'โหลดรายการตรวจ'}
            </button>
          </div>

          {alreadyAudited && (
            <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 font-semibold">
              เครื่องจักรนี้ได้รับการบันทึกผลตรวจ Pre-Op ประจำวันนี้แล้ว
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">กะทำงาน *</label>
              <select
                value={preopForm.shift}
                onChange={(e) => setPreopForm((p) => ({ ...p, shift: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              >
                <option value="Day">กะกลางวัน (Day)</option>
                <option value="Night">กะกลางคืน (Night)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">ผู้ตรวจสอบ *</label>
              <input
                type="text"
                required
                value={preopForm.audited_by}
                onChange={(e) => setPreopForm((p) => ({ ...p, audited_by: e.target.value }))}
                className="w-full min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
              />
            </div>
          </div>

          {checklist.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-400 border border-dashed rounded-xl">
              {loadingChecklist ? 'กำลังโหลด Checklist...' : 'กดปุ่ม "โหลดรายการตรวจ" เพื่อดึงรายการตรวจสอบของเครื่องจักร'}
            </div>
          ) : (
            <div className="space-y-2">
              {checklist.map((item, idx) => (
                <div key={item.item_id || idx} className="p-3 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
                  <div className="text-xs font-medium text-slate-800 dark:text-slate-200">
                    {idx + 1}. {item.item_text}
                    {Number(item.is_critical) === 1 && <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold">Critical</span>}
                  </div>
                  <div className="inline-flex rounded-lg border overflow-hidden shrink-0">
                    <button
                      type="button"
                      onClick={() => setChecklist((prev) => prev.map((it, i) => (i === idx ? { ...it, answer: 'yes' } : it)))}
                      className={`min-h-[38px] px-3 text-xs font-bold ${item.answer === 'yes' ? 'bg-emerald-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                      ผ่าน
                    </button>
                    <button
                      type="button"
                      onClick={() => setChecklist((prev) => prev.map((it, i) => (i === idx ? { ...it, answer: 'no' } : it)))}
                      className={`min-h-[38px] px-3 text-xs font-bold ${item.answer === 'no' ? 'bg-red-600 text-white' : 'bg-white text-slate-600'}`}
                    >
                      ไม่ผ่าน
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {hasPreopFail && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 space-y-2">
              <div className="text-xs font-bold text-red-700">พบหัวข้อที่ไม่ผ่าน — ระบบจะดำเนินการล็อกเครื่อง (LOTO) และเปิดใบงานซ่อมฉุกเฉินอัตโนมัติ</div>
              <textarea
                rows={2}
                required
                value={preopForm.remarks}
                onChange={(e) => setPreopForm((p) => ({ ...p, remarks: e.target.value }))}
                placeholder="ระบุอาการหรือความผิดปกติที่พบ..."
                className="w-full p-2.5 rounded-xl border border-red-300 bg-white text-sm"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting || isOffline || !preopForm.machine_code.trim()}
            className="w-full min-h-[48px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm disabled:opacity-50"
          >
            {submitting ? 'กำลังบันทึก...' : 'บันทึกผลการตรวจสอบ Pre-Op'}
          </button>
        </form>
      )}

      {/* Tab 5: Recent History */}
      {activeTab === 'history' && (
        <div className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setHistMode('wo')}
              className={`min-h-[44px] rounded-xl text-xs font-bold ${histMode === 'wo' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              ประวัติงานซ่อม (WO)
            </button>
            <button
              type="button"
              onClick={() => setHistMode('dt')}
              className={`min-h-[44px] rounded-xl text-xs font-bold ${histMode === 'dt' ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              ประวัติเครื่องหยุด (DT)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <input type="date" value={histStart} onChange={(e) => setHistStart(e.target.value)} className="min-h-[44px] px-2.5 rounded-xl border text-xs" />
            <input type="date" value={histEnd} onChange={(e) => setHistEnd(e.target.value)} className="min-h-[44px] px-2.5 rounded-xl border text-xs" />
          </div>

          {histLoading ? (
            <div className="py-10 text-center text-xs text-slate-500">กำลังโหลดประวัติ...</div>
          ) : histRows.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-400">ไม่พบประวัติในช่วงวันที่ที่เลือก</div>
          ) : histMode === 'wo' ? (
            <div className="space-y-2">
              {histRows.map((w) => {
                const sMeta = WO_STATUS_META[w.status] || WO_STATUS_META.Open;
                return (
                  <div key={w.wo_id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-3">
                    <PeImage path={w.image_path} alt={w.wo_number} className="w-12 h-12 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs">{w.wo_number}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${sMeta.cls}`}>{w.status}</span>
                      </div>
                      <div className="text-xs font-semibold truncate">{w.machine_display_name || w.machine_name} ({w.line})</div>
                      <div className="text-xs text-slate-600 line-clamp-2">{w.issue_title}</div>
                      <div className="text-[11px] text-slate-400 mt-1">{formatPeDateTime(w.requested_at)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="space-y-2">
              {histRows.map((d) => (
                <div key={d.downtime_id} className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-xs text-red-700">{d.cause_category}</span>
                    {d.end_time ? (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold">
                        เดินเครื่องแล้ว ({d.duration_min ?? '-'} น.)
                      </span>
                    ) : (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">กำลังหยุดเครื่อง</span>
                    )}
                  </div>
                  <div className="text-xs font-semibold">{d.machine_name} ({d.line})</div>
                  <div className="text-xs text-slate-600">{d.cause_detail || '-'}</div>
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>เริ่ม: {formatPeDateTime(d.start_time)}</span>
                    {!d.end_time && (
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={() => handleEndDowntime(d)}
                        className="min-h-[36px] px-3 rounded-lg bg-emerald-600 text-white text-xs font-semibold inline-flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" /> จบเวลาหยุดเครื่อง
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

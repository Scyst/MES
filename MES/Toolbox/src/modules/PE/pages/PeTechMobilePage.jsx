import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wrench, Search, UserCheck, Play, Undo2, CheckCircle2, Package,
  ShieldAlert, ArrowLeft, WifiOff, RefreshCw, Camera, X, ChevronDown, ChevronUp
} from 'lucide-react';
import { peApi, compressPeImageToBase64 } from '../../../shared/services/peApi';
import { useAuth } from '../../../shared/contexts/AuthContext';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import PeImage from '../components/PeImage';
import WoPartsModal from '../components/WoPartsModal';
import { PRIORITY_META, WO_STATUS_META, calcElapsedText, formatPeDateTime } from '../utils/peFormatters';

export default function PeTechMobilePage() {
  const { user } = useAuth();
  const showToast = useToast();
  const myName = user?.fullname || user?.username || '';

  const [isOffline, setIsOffline] = useState(typeof navigator !== 'undefined' ? !navigator.onLine : false);
  const [feedMode, setFeedMode] = useState('all'); // 'my' | 'all'
  const [statusFilter, setStatusFilter] = useState('active');
  const [lineFilter, setLineFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const [workOrders, setWorkOrders] = useState([]);
  const [lines, setLines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedWoId, setExpandedWoId] = useState(null);

  const [partsModalWo, setPartsModalWo] = useState(null);
  const [closeModalWo, setCloseModalWo] = useState(null);
  const [closeForm, setCloseForm] = useState({ root_cause: '', action_taken: '', photo_after_base64: '' });
  const [submitting, setSubmitting] = useState(false);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const [woRes, metaRes] = await Promise.all([
        peApi.getWorkOrders({ limit: 250 }),
        peApi.getMachinesAndTechnicians(),
      ]);
      setWorkOrders(woRes?.data || []);
      setLines(metaRes?.lines || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const goOffline = () => setIsOffline(true);
    const goOnline = () => setIsOffline(false);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online', goOnline);
    loadJobs();
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online', goOnline);
    };
  }, [loadJobs]);

  const filteredJobs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return workOrders.filter((w) => {
      if (w.status === 'Cancelled') return false;
      if (feedMode === 'my' && myName && w.assigned_to !== myName) return false;
      if (statusFilter === 'active' && w.status === 'Completed') return false;
      if (statusFilter !== 'active' && statusFilter !== 'all' && w.status !== statusFilter) return false;
      if (lineFilter && w.line !== lineFilter) return false;
      if (q) {
        const hay = `${w.wo_number} ${w.issue_title} ${w.issue_detail} ${w.machine_name} ${w.machine_display_name} ${w.machine_code} ${w.requested_by}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [workOrders, feedMode, myName, statusFilter, lineFilter, searchQuery]);

  const handleAction = async (wo, type) => {
    if (isOffline) return;
    if (type === 'accept') {
      const res = await peApi.quickAcceptWorkOrder(wo.wo_id);
      showToast(res?.message || 'รับงานซ่อมสำเร็จ', 'success');
    } else if (type === 'start') {
      const res = await peApi.quickStartWorkOrder(wo.wo_id);
      showToast(res?.message || 'เริ่มดำเนินการซ่อมแล้ว', 'success');
    } else if (type === 'revert') {
      const res = await peApi.revertWorkOrderStart(wo.wo_id);
      showToast(res?.message || 'ย้อนสถานะงานเรียบร้อยแล้ว', 'success');
    }
    await loadJobs();
  };

  const handleCloseJobSubmit = async (e) => {
    e.preventDefault();
    if (isOffline || !closeModalWo) return;
    setSubmitting(true);
    try {
      const res = await peApi.quickCloseWorkOrder({
        wo_id: closeModalWo.wo_id,
        root_cause: closeForm.root_cause.trim(),
        action_taken: closeForm.action_taken.trim(),
        photo_after_base64: closeForm.photo_after_base64 || undefined,
      });
      showToast(res?.message || 'ปิดงานซ่อมเรียบร้อยแล้ว', 'success');
      setCloseModalWo(null);
      setCloseForm({ root_cause: '', action_taken: '', photo_after_base64: '' });
      await loadJobs();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-4 pb-8">
      {isOffline && (
        <div className="p-3 rounded-xl bg-red-600 text-white text-xs sm:text-sm font-semibold flex items-center gap-2">
          <WifiOff className="w-4 h-4 shrink-0" />
          <span>ขณะนี้ออฟไลน์ — ปิดการรับงาน/ปิดงานชั่วคราว</span>
        </div>
      )}

      {/* Header */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-sky-700 to-indigo-800 text-white shadow-md flex items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold flex items-center gap-2">
            <Wrench className="w-5 h-5" /> PE Tech Mobile
          </h1>
          <p className="text-xs text-sky-100">ช่างผู้ปฏิบัติงาน: {myName || '-'}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadJobs}
            className="min-h-[44px] min-w-[44px] rounded-xl bg-white/15 hover:bg-white/25 flex items-center justify-center"
            title="รีเฟรชงาน"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <Link
            to="/pe"
            className="min-h-[44px] px-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-semibold inline-flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" /> Dashboard
          </Link>
        </div>
      </div>

      {/* Feed Switch + Filters */}
      <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-2.5">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setFeedMode('my')}
            className={`min-h-[44px] rounded-xl text-xs font-bold ${feedMode === 'my' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            งานของฉัน (My Jobs)
          </button>
          <button
            type="button"
            onClick={() => setFeedMode('all')}
            className={`min-h-[44px] rounded-xl text-xs font-bold ${feedMode === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            งานทั้งหมด (All Jobs)
          </button>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหา WO, เครื่องจักร, อาการ..."
            className="w-full min-h-[44px] pl-9 pr-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="active">งานค้างทั้งหมด (Active)</option>
            <option value="Open">แจ้งใหม่ (Open)</option>
            <option value="Pending">รอดำเนินการ (Pending)</option>
            <option value="Assigned">มอบหมายแล้ว (Assigned)</option>
            <option value="In Progress">กำลังซ่อม (In Progress)</option>
            <option value="Completed">เสร็จสิ้น (Completed)</option>
            <option value="all">ทุกสถานะ</option>
          </select>
          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="min-h-[44px] px-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-xs"
          >
            <option value="">ทุกไลน์ผลิต</option>
            {lines.map((ln) => <option key={ln} value={ln}>{ln}</option>)}
          </select>
        </div>
      </div>

      {/* Job Feed */}
      {loading ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border text-center text-sm text-slate-500">กำลังโหลดรายการงานซ่อม...</div>
      ) : filteredJobs.length === 0 ? (
        <div className="p-10 rounded-2xl bg-white dark:bg-slate-900 border text-center text-sm text-slate-400">ไม่มีใบงานที่ตรงกับเงื่อนไข</div>
      ) : (
        <div className="space-y-3">
          {filteredJobs.map((wo) => {
            const pMeta = PRIORITY_META[wo.priority] || PRIORITY_META.Normal;
            const sMeta = WO_STATUS_META[wo.status] || WO_STATUS_META.Open;
            const expanded = expandedWoId === wo.wo_id;
            return (
              <div key={wo.wo_id} className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-mono font-bold text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      {wo.wo_number}
                      {Number(wo.is_loto) === 1 && (
                        <span className="px-1.5 py-0.5 rounded bg-red-600 text-white text-[10px] inline-flex items-center gap-0.5">
                          <ShieldAlert className="w-3 h-3" /> LOTO
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500">{calcElapsedText(wo.requested_at)} ({formatPeDateTime(wo.requested_at)})</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${pMeta.cls}`}>{wo.priority}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${sMeta.cls}`}>{wo.status}</span>
                  </div>
                </div>

                <div>
                  <div className="font-bold text-sm text-blue-700 dark:text-blue-400">
                    {wo.machine_display_name || wo.machine_name || '-'} ({wo.line || '-'})
                  </div>
                  <div className="text-sm font-medium text-slate-800 dark:text-slate-200 mt-0.5">{wo.issue_title}</div>
                  <div className="text-xs text-slate-500 mt-1">ช่างผู้รับผิดชอบ: <strong>{wo.assigned_to || 'รอมอบหมาย'}</strong></div>
                </div>

                <button
                  type="button"
                  onClick={() => setExpandedWoId(expanded ? null : wo.wo_id)}
                  className="text-xs text-slate-500 hover:text-slate-800 inline-flex items-center gap-1"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {expanded ? 'ซ่อนรายละเอียดและรูปภาพ' : 'ดูรูปภาพและรายละเอียด'}
                </button>

                {expanded && (
                  <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 space-y-2 text-xs">
                    {wo.image_path && (
                      <PeImage path={wo.image_path} alt={wo.wo_number} className="w-full h-44 rounded-xl object-cover" />
                    )}
                    <div><strong>รายละเอียดอาการ:</strong> {wo.issue_detail || '-'}</div>
                    <div><strong>ผู้แจ้ง:</strong> {wo.requested_by || '-'}</div>
                  </div>
                )}

                {/* Tech Action Buttons */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  {(wo.status === 'Open' || wo.status === 'Pending') && (
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => handleAction(wo, 'accept')}
                      className="flex-1 min-h-[44px] px-3 rounded-xl bg-sky-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                    >
                      <UserCheck className="w-4 h-4" /> รับงาน (Accept)
                    </button>
                  )}
                  {wo.status === 'Assigned' && (
                    <button
                      type="button"
                      disabled={isOffline}
                      onClick={() => handleAction(wo, 'start')}
                      className="flex-1 min-h-[44px] px-3 rounded-xl bg-indigo-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                    >
                      <Play className="w-4 h-4" /> เริ่มซ่อม (Start)
                    </button>
                  )}
                  {wo.status === 'In Progress' && (
                    <>
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={() => handleAction(wo, 'revert')}
                        className="min-h-[44px] px-3 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold inline-flex items-center justify-center gap-1"
                      >
                        <Undo2 className="w-4 h-4" /> พัก/ย้อนกลับ
                      </button>
                      <button
                        type="button"
                        disabled={isOffline}
                        onClick={() => {
                          setCloseModalWo(wo);
                          setCloseForm({ root_cause: wo.root_cause || '', action_taken: wo.action_taken || '', photo_after_base64: '' });
                        }}
                        className="flex-1 min-h-[44px] px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold inline-flex items-center justify-center gap-1"
                      >
                        <CheckCircle2 className="w-4 h-4" /> ปิดงานซ่อม
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setPartsModalWo(wo)}
                    className="min-h-[44px] px-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold inline-flex items-center justify-center gap-1"
                  >
                    <Package className="w-4 h-4" /> เบิกอะไหล่
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Quick Close Job Modal */}
      {closeModalWo && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-3" onClick={() => setCloseModalWo(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md max-h-[92vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 dark:border-slate-800">
              <h3 className="font-bold text-slate-900 dark:text-white">ปิดงานซ่อม — {closeModalWo.wo_number}</h3>
              <button type="button" onClick={() => setCloseModalWo(null)} className="min-w-[44px] min-h-[44px] flex items-center justify-center"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleCloseJobSubmit} className="p-5 space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">สาเหตุรากเหง้า (Root Cause)</label>
                <textarea
                  rows={2}
                  value={closeForm.root_cause}
                  onChange={(e) => setCloseForm((p) => ({ ...p, root_cause: e.target.value }))}
                  placeholder="ระบุสาเหตุของปัญหา..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">การดำเนินการแก้ไข (Action Taken) *</label>
                <textarea
                  rows={3}
                  required
                  value={closeForm.action_taken}
                  onChange={(e) => setCloseForm((p) => ({ ...p, action_taken: e.target.value }))}
                  placeholder="อธิบายวิธีซ่อมแซมและทดสอบหลังซ่อม..."
                  className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">ภาพหลังซ่อมเสร็จ (After Photo)</label>
                <label className="min-h-[44px] px-4 rounded-xl border border-dashed border-emerald-300 text-emerald-700 flex items-center justify-center gap-2 text-xs font-semibold cursor-pointer">
                  <Camera className="w-4 h-4" />
                  <span>{closeForm.photo_after_base64 ? 'แนบภาพหลังซ่อมแล้ว' : 'ถ่ายภาพหลังซ่อม'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const b64 = await compressPeImageToBase64(f);
                      setCloseForm((p) => ({ ...p, photo_after_base64: b64 }));
                    }}
                  />
                </label>
                {closeForm.photo_after_base64 && <img src={closeForm.photo_after_base64} alt="After" className="mt-2 max-h-36 mx-auto rounded-xl border" />}
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setCloseModalWo(null)} className="min-h-[44px] px-4 rounded-xl border text-sm">ยกเลิก</button>
                <button type="submit" disabled={submitting || isOffline} className="min-h-[44px] px-5 rounded-xl bg-emerald-600 text-white text-sm font-bold disabled:opacity-50">
                  {submitting ? 'กำลังบันทึก...' : 'ยืนยันปิดงาน'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {partsModalWo && (
        <WoPartsModal
          wo={partsModalWo}
          isOffline={isOffline}
          onClose={() => setPartsModalWo(null)}
          onCostUpdated={() => loadJobs()}
        />
      )}
    </div>
  );
}

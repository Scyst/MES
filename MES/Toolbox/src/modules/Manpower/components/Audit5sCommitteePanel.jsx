import React, { useState, useEffect, useCallback } from 'react';
import {
  Camera, CheckCircle2, Clock, Lock, Unlock, Plus, Users, X,
  Search, Shield, Image as ImageIcon, Eye, AlertTriangle, RefreshCw
} from 'lucide-react';
import { audit5sApi } from '../../../shared/services/manpowerApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import { GRADE_BADGE_MAP, getMonthIso, getTodayIso } from '../utils/manpowerHelpers';

const CAT_OPTIONS = [
  { value: 'GENERAL', label: 'ภาพรวมหน้างาน (General)' },
  { value: 'SEIRI', label: 'ส.1 สะสาง (Seiri)' },
  { value: 'SEITON', label: 'ส.2 สะดวก (Seiton)' },
  { value: 'SEISO', label: 'ส.3 สะอาด (Seiso)' },
  { value: 'SEIKETSU', label: 'ส.4 สุขลักษณะ (Seiketsu)' },
  { value: 'SHITSUKE', label: 'ส.5 สร้างนิสัย (Shitsuke)' },
];

const SCORE_FIELDS = [
  { key: 'score_seiri', label: 'ส.1 สะสาง', max: 20 },
  { key: 'score_seiton', label: 'ส.2 สะดวก', max: 20 },
  { key: 'score_seiso', label: 'ส.3 สะอาด', max: 20 },
  { key: 'score_seiketsu', label: 'ส.4 สุขลักษณะ', max: 20 },
  { key: 'score_shitsuke', label: 'ส.5 สร้างนิสัย', max: 20 },
];

function scoreToGrade(total) {
  if (total >= 85) return 'A';
  if (total >= 70) return 'B';
  if (total >= 55) return 'C';
  return 'D';
}

export default function Audit5sCommitteePanel({ structure, isOnline, onRoundUpdated }) {
  const { showToast } = useToast();
  const [evalPeriod, setEvalPeriod] = useState(getMonthIso);
  const [loading, setLoading] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [isManager, setIsManager] = useState(false);
  const [selfEmpId, setSelfEmpId] = useState('');

  const [selectedRoundId, setSelectedRoundId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Submission state for current committee member
  const [scores, setScores] = useState({
    score_seiri: 16,
    score_seiton: 16,
    score_seiso: 16,
    score_seiketsu: 16,
    score_shitsuke: 16,
    remarks: '',
  });
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [photoCategory, setPhotoCategory] = useState('GENERAL');
  const [submitting, setSubmitting] = useState(false);

  // Lightbox image preview
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Admin Round Builder Modal
  const [roundModalOpen, setRoundModalOpen] = useState(false);
  const [roundForm, setRoundForm] = useState({
    round_id: 0,
    eval_period: getMonthIso(),
    line: '',
    round_name: '',
    audit_date: getTodayIso(),
    notes: '',
    committee: [],
  });
  const [candSearch, setCandSearch] = useState('');
  const [candidates, setCandidates] = useState([]);
  const [savingRound, setSavingRound] = useState(false);

  const loadRounds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await audit5sApi.getMyAssignments(evalPeriod);
      const list = res?.data?.rounds || [];
      setRounds(list);
      setIsManager(Boolean(res?.data?.is_manager));
      setSelfEmpId(res?.data?.self_emp_id || '');
      if (list.length > 0 && (!selectedRoundId || !list.some((r) => r.round_id === selectedRoundId))) {
        setSelectedRoundId(list[0].round_id);
      } else if (list.length === 0) {
        setSelectedRoundId(null);
        setDetail(null);
      }
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดรายการตรวจ 5ส ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [evalPeriod, selectedRoundId, showToast]);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  const loadRoundDetail = useCallback(async (rid) => {
    if (!rid) return;
    setDetailLoading(true);
    try {
      const res = await audit5sApi.getRoundDetail(rid);
      const payload = res?.data || null;
      setDetail(payload);
      const own = (payload?.committee || []).find((m) => m.is_self);
      if (own && own.audit_id) {
        setScores({
          score_seiri: Number(own.score_seiri ?? 16),
          score_seiton: Number(own.score_seiton ?? 16),
          score_seiso: Number(own.score_seiso ?? 16),
          score_seiketsu: Number(own.score_seiketsu ?? 16),
          score_shitsuke: Number(own.score_shitsuke ?? 16),
          remarks: own.remarks || '',
        });
      } else {
        setScores({
          score_seiri: 16,
          score_seiton: 16,
          score_seiso: 16,
          score_seiketsu: 16,
          score_shitsuke: 16,
          remarks: '',
        });
      }
      setPendingPhotos([]);
    } catch (err) {
      showToast(err.message || 'โหลดรายละเอียดรอบตรวจไม่สำเร็จ', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    if (selectedRoundId) {
      loadRoundDetail(selectedRoundId);
    }
  }, [selectedRoundId, loadRoundDetail]);

  const loadCandidates = useCallback(async (q) => {
    try {
      const res = await audit5sApi.getAuditorCandidates(q);
      setCandidates(Array.isArray(res?.data) ? res.data : []);
    } catch {
      // Ignore search failure
    }
  }, []);

  useEffect(() => {
    if (roundModalOpen) {
      const timer = setTimeout(() => loadCandidates(candSearch), 250);
      return () => clearTimeout(timer);
    }
  }, [roundModalOpen, candSearch, loadCandidates]);

  const openNewRoundModal = () => {
    const defaultLine = structure?.lines?.[0] || 'ASSEMBLY';
    setRoundForm({
      round_id: 0,
      eval_period: evalPeriod || getMonthIso(),
      line: defaultLine,
      round_name: `ตรวจ 5ส ประจำเดือน ${evalPeriod} (${defaultLine})`,
      audit_date: getTodayIso(),
      notes: '',
      committee: [],
    });
    setCandSearch('');
    setRoundModalOpen(true);
  };

  const openEditRoundModal = () => {
    if (!detail?.round) return;
    setRoundForm({
      round_id: detail.round.round_id,
      eval_period: detail.round.eval_period,
      line: detail.round.line,
      round_name: detail.round.round_name,
      audit_date: detail.round.audit_date,
      notes: detail.round.notes || '',
      committee: (detail.committee || []).map((m) => ({
        auditor_emp_id: m.auditor_emp_id,
        auditor_name: m.auditor_name,
        assigned_role: m.assigned_role || 'AUDITOR',
      })),
    });
    setCandSearch('');
    setRoundModalOpen(true);
  };

  const toggleCandidate = (cand) => {
    setRoundForm((prev) => {
      const exists = prev.committee.some((m) => m.auditor_emp_id === cand.emp_id);
      if (exists) {
        return { ...prev, committee: prev.committee.filter((m) => m.auditor_emp_id !== cand.emp_id) };
      }
      if (prev.committee.length >= 5) {
        showToast('คณะกรรมการ 5ส กำหนดได้สูงสุด 5 คนต่อรอบ', 'warning');
        return prev;
      }
      return {
        ...prev,
        committee: [
          ...prev.committee,
          {
            auditor_emp_id: cand.emp_id,
            auditor_name: cand.name_th,
            assigned_role: prev.committee.length === 0 ? 'CHAIR' : 'AUDITOR',
          },
        ],
      };
    });
  };

  const handleSaveRound = async (e) => {
    e.preventDefault();
    if (roundForm.committee.length < 3 || roundForm.committee.length > 5) {
      showToast('กรุณาแต่งตั้งกรรมการตรวจ 5ส จำนวน 3 ถึง 5 คนเพื่อป้องกันอคติ', 'warning');
      return;
    }
    setSavingRound(true);
    try {
      const res = await audit5sApi.saveRound(roundForm);
      showToast(res?.message || 'บันทึกรอบตรวจ 5ส เรียบร้อยแล้ว', 'success');
      setRoundModalOpen(false);
      await loadRounds();
      if (res?.data?.round_id) {
        setSelectedRoundId(res.data.round_id);
        loadRoundDetail(res.data.round_id);
      }
      onRoundUpdated?.();
    } catch (err) {
      showToast(err.message || 'บันทึกรอบตรวจไม่สำเร็จ', 'error');
    } finally {
      setSavingRound(false);
    }
  };

  const handlePhotoFiles = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const mapped = files.slice(0, 10 - pendingPhotos.length).map((file) => ({
      file,
      category: photoCategory,
      caption: '',
      previewUrl: URL.createObjectURL(file),
    }));
    setPendingPhotos((prev) => [...prev, ...mapped]);
    e.target.value = '';
  };

  const handleSubmitAudit = async (e) => {
    e.preventDefault();
    if (!isOnline || !detail?.round) return;
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('round_id', String(detail.round.round_id));
      fd.append('score_seiri', String(scores.score_seiri));
      fd.append('score_seiton', String(scores.score_seiton));
      fd.append('score_seiso', String(scores.score_seiso));
      fd.append('score_seiketsu', String(scores.score_seiketsu));
      fd.append('score_shitsuke', String(scores.score_shitsuke));
      fd.append('remarks', scores.remarks || '');

      pendingPhotos.forEach((p) => {
        fd.append('photos[]', p.file);
        fd.append('categories[]', p.category || 'GENERAL');
        fd.append('captions[]', p.caption || '');
      });

      const res = await audit5sApi.submitAudit(fd);
      showToast(res?.message || 'ส่งผลตรวจ 5ส เรียบร้อยแล้ว', 'success');
      setPendingPhotos([]);
      await loadRounds();
      await loadRoundDetail(detail.round.round_id);
      onRoundUpdated?.();
    } catch (err) {
      showToast(err.message || 'ส่งผลตรวจ 5ส ไม่สำเร็จ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!detail?.round || !isManager) return;
    const nextLock = detail.round.status !== 'LOCKED';
    try {
      const res = await audit5sApi.toggleRoundLock(detail.round.round_id, nextLock);
      showToast(res?.message || 'อัปเดตสถานะรอบตรวจแล้ว', 'success');
      await loadRounds();
      await loadRoundDetail(detail.round.round_id);
    } catch (err) {
      showToast(err.message || 'ไม่สามารถเปลี่ยนสถานะล็อกได้', 'error');
    }
  };

  const totalPreview = SCORE_FIELDS.reduce((acc, f) => acc + Number(scores[f.key] || 0), 0);
  const previewGrade = scoreToGrade(totalPreview);
  const selfCommitteeRow = (detail?.committee || []).find((m) => m.is_self);
  const canSubmitHere = Boolean(selfCommitteeRow) && detail?.round?.status !== 'LOCKED';

  return (
    <div className="space-y-4">
      {/* Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                คณะกรรมการตรวจ 5ส (3–5 คน · น้ำหนักหารเท่า 1/N)
              </h3>
              <p className="text-[11px] text-slate-500">
                รองรับการแนบรูปถ่ายจากมือถือและ Blind Peer Audit ป้องกันคะแนนเอียง
              </p>
            </div>
          </div>
          <input
            type="month"
            value={evalPeriod}
            onChange={(e) => setEvalPeriod(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
          <button
            type="button"
            onClick={loadRounds}
            className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            title="รีเฟรช"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {isManager && (
          <button
            type="button"
            onClick={openNewRoundModal}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 text-xs font-bold text-white shadow-2xs hover:bg-emerald-700"
          >
            <Plus className="h-4 w-4" />
            สร้างรอบตรวจ 5ส (3–5 คน)
          </button>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Left: Rounds List */}
        <div className="lg:col-span-4 space-y-2.5">
          {loading ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              กำลังโหลดรอบการตรวจ 5ส...
            </div>
          ) : rounds.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 space-y-2">
              <Users className="h-8 w-8 mx-auto text-slate-300" />
              <p>ยังไม่มีรอบตรวจ 5ส ในงวดเดือน {evalPeriod}</p>
            </div>
          ) : (
            rounds.map((r) => {
              const active = Number(r.round_id) === Number(selectedRoundId);
              const gBadge = GRADE_BADGE_MAP[r.final_grade] || 'bg-slate-100 text-slate-500 border-slate-200';
              return (
                <button
                  key={r.round_id}
                  type="button"
                  onClick={() => setSelectedRoundId(r.round_id)}
                  className={`w-full text-left rounded-xl border p-3.5 transition ${
                    active
                      ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/40 dark:bg-emerald-950/30 dark:border-emerald-700'
                      : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="inline-block rounded bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                        {r.line}
                      </span>
                      <h4 className="mt-1 text-xs font-bold text-slate-800 dark:text-white truncate">
                        {r.round_name}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        วันที่ตรวจ {r.audit_date} · ส่งแล้ว {r.submitted_count}/{r.required_auditors} คน
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block rounded-md border px-2 py-0.5 font-mono text-xs font-extrabold ${gBadge}`}>
                        {r.final_grade || '-'}
                      </span>
                      <div className="mt-1 font-mono text-[11px] font-bold text-slate-600 dark:text-slate-300">
                        {r.weighted_score !== null ? `${Number(r.weighted_score).toFixed(1)}` : 'รอผล'}
                      </div>
                    </div>
                  </div>
                  {r.committee_id && (
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className={`font-bold ${Number(r.my_is_completed) ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {Number(r.my_is_completed) ? '✓ คุณส่งคะแนนแล้ว' : '● รอคุณตรวจ & แนบรูป'}
                      </span>
                      <span className="text-slate-400 uppercase">{r.status}</span>
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>

        {/* Right: Selected Round Detail & Blind Mobile Audit Form */}
        <div className="lg:col-span-8">
          {detailLoading || !detail?.round ? (
            <div className="rounded-xl border border-slate-200 bg-white p-12 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              {detailLoading ? 'กำลังโหลดข้อมูลรอบตรวจ...' : 'เลือกรอบตรวจ 5ส จากด้านซ้ายเพื่อดูรายละเอียดหรือส่งผลตรวจ'}
            </div>
          ) : (
            <div className="space-y-4">
              {/* Consensus Header Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800 space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {detail.round.line}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        สถานะ: {detail.round.status}
                      </span>
                      <span className="text-xs text-slate-500 font-mono">{detail.round.audit_date}</span>
                    </div>
                    <h4 className="mt-1.5 text-base font-bold text-slate-800 dark:text-white">
                      {detail.round.round_name}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isManager && detail.round.status !== 'LOCKED' && (
                      <button
                        type="button"
                        onClick={openEditRoundModal}
                        className="min-h-[40px] rounded-lg border border-slate-300 px-3 text-xs font-semibold hover:bg-slate-50 dark:border-slate-600"
                      >
                        แก้ไขกรรมการ ({detail.round.required_auditors} คน)
                      </button>
                    )}
                    {isManager && (
                      <button
                        type="button"
                        onClick={handleToggleLock}
                        className={`min-h-[40px] inline-flex items-center gap-1.5 rounded-lg px-3 text-xs font-bold ${
                          detail.round.status === 'LOCKED'
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200'
                        }`}
                      >
                        {detail.round.status === 'LOCKED' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                        {detail.round.status === 'LOCKED' ? 'ปลดล็อกรอบ' : 'ล็อกปิดผล'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Consensus Summary */}
                <div className="grid grid-cols-3 gap-2.5 rounded-xl bg-slate-50 p-3 dark:bg-slate-900/60">
                  <div>
                    <div className="text-[11px] text-slate-500">องค์ประชุมกรรมการ</div>
                    <div className="text-sm font-extrabold text-slate-800 dark:text-white">
                      {detail.round.submitted_count} / {detail.round.required_auditors} คน
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">คะแนนเฉลี่ย (หารเท่า 1/N)</div>
                    <div className="text-sm font-extrabold font-mono text-emerald-600">
                      {detail.round.weighted_score !== null ? `${Number(detail.round.weighted_score).toFixed(2)} / 100` : 'รอครบผล'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-500">เกรดสรุป 5ส</div>
                    <div className="text-sm font-extrabold font-mono text-indigo-600">
                      {detail.round.final_grade || '-'}
                    </div>
                  </div>
                </div>

                {detail.blind_mode && (
                  <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <Shield className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>
                      <strong>Blind Peer Audit:</strong> เพื่อความเป็นธรรม ระบบจะซ่อนผลคะแนนและรูปถ่ายของกรรมการท่านอื่นจนกว่ารอบตรวจนี้จะส่งผลครบองค์ประชุม
                    </span>
                  </div>
                )}

                {/* Committee Member Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 font-bold text-slate-600 dark:bg-slate-900/80 dark:text-slate-300">
                      <tr>
                        <th className="px-3 py-2">กรรมการ ({detail.committee.length} คน)</th>
                        <th className="px-2 py-2 text-center">สัดส่วน</th>
                        <th className="px-2 py-2 text-center">สถานะ</th>
                        <th className="px-2 py-2 text-right">คะแนน</th>
                        <th className="px-2 py-2 text-center">เกรด</th>
                        <th className="px-3 py-2">หลักฐานภาพถ่าย</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                      {detail.committee.map((m) => (
                        <tr key={m.id}>
                          <td className="px-3 py-2">
                            <div className="font-semibold text-slate-800 dark:text-white">
                              {m.auditor_name || m.auditor_emp_id}
                              {m.is_self && <span className="ml-1.5 text-[10px] font-bold text-emerald-600">(คุณ)</span>}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {m.auditor_emp_id} · {m.assigned_role === 'CHAIR' ? 'ประธาน' : 'กรรมการ'}
                            </div>
                          </td>
                          <td className="px-2 py-2 text-center font-mono text-[11px]">
                            {Number(m.weight_pct || 0).toFixed(1)}%
                          </td>
                          <td className="px-2 py-2 text-center">
                            {Number(m.is_completed) ? (
                              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> ส่งแล้ว
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-amber-600 font-semibold">
                                <Clock className="h-3.5 w-3.5" /> รอตรวจ
                              </span>
                            )}
                          </td>
                          <td className="px-2 py-2 text-right font-mono font-bold">
                            {m.blind_masked ? (
                              <span className="text-slate-400">ซ่อน</span>
                            ) : (
                              m.total_score !== null ? `${m.total_score}/100` : '-'
                            )}
                          </td>
                          <td className="px-2 py-2 text-center font-mono font-bold">
                            {m.blind_masked ? '•' : (m.grade || '-')}
                          </td>
                          <td className="px-3 py-2">
                            {m.blind_masked ? (
                              <span className="text-slate-400 text-[11px]">รอครบองค์ประชุม</span>
                            ) : (m.photos || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {m.photos.map((ph) => (
                                  <button
                                    key={ph.photo_id}
                                    type="button"
                                    onClick={() => setLightboxUrl(audit5sApi.getPhotoUrl(ph.file_name))}
                                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300"
                                  >
                                    <Eye className="h-3 w-3" /> {ph.category_5s}
                                  </button>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Committee Member Scoring & Camera Photo Upload Form */}
              {canSubmitHere && (
                <form
                  onSubmit={handleSubmitAudit}
                  className="rounded-xl border border-emerald-200 bg-white p-4 shadow-2xs dark:border-emerald-800 dark:bg-slate-800 space-y-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-700">
                    <div>
                      <h5 className="text-sm font-bold text-slate-800 dark:text-white">
                        แบบฟอร์มบันทึกคะแนน & แนบรูปภาพ ({selfEmpId})
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        ให้คะแนนแต่ละหมวด 0–20 คะแนน พร้อมถ่ายรูปหลักฐานแนบได้ทันทีจากมือถือ
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-3 py-1.5 text-center dark:bg-emerald-950/50">
                      <span className="text-[10px] text-slate-500 block">คะแนนรวมของคุณ</span>
                      <span className="font-mono text-base font-extrabold text-emerald-600">
                        {totalPreview}/100 ({previewGrade})
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
                    {SCORE_FIELDS.map((sf) => (
                      <div key={sf.key} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                        <label className="mb-1 block text-xs font-bold text-slate-700 dark:text-slate-200">
                          {sf.label}
                        </label>
                        <input
                          type="number"
                          min="0"
                          max={sf.max}
                          required
                          value={scores[sf.key]}
                          onChange={(e) => setScores((prev) => ({ ...prev, [sf.key]: Math.max(0, Math.min(20, Number(e.target.value))) }))}
                          className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-slate-50 px-2 text-center font-mono text-base font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </div>
                    ))}
                  </div>

                  {/* Camera / Photo Evidence Picker */}
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3.5 dark:border-slate-600 dark:bg-slate-900/40 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <ImageIcon className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                          แนบรูปภาพหน้างาน 5ส (สูงสุด 5MB/รูป · เก็บที่ /uploads/5s_audits/)
                        </span>
                      </div>
                      <select
                        value={photoCategory}
                        onChange={(e) => setPhotoCategory(e.target.value)}
                        className="min-h-[40px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800"
                      >
                        {CAT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <label className="min-h-[44px] inline-flex cursor-pointer items-center gap-2 rounded-lg bg-slate-800 px-4 text-xs font-bold text-white hover:bg-slate-900 dark:bg-slate-700">
                      <Camera className="h-4 w-4" />
                      ถ่ายรูป / เลือกรูปภาพ ({pendingPhotos.length} รูป)
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        onChange={handlePhotoFiles}
                        className="hidden"
                      />
                    </label>

                    {pendingPhotos.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {pendingPhotos.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                            <img src={p.previewUrl} alt="preview" className="h-12 w-12 rounded object-cover shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="text-[10px] font-bold text-emerald-600">{p.category} · {p.file.name}</div>
                              <input
                                type="text"
                                value={p.caption}
                                onChange={(e) => setPendingPhotos((prev) => prev.map((x, i) => i === idx ? { ...x, caption: e.target.value } : x))}
                                placeholder="หมายเหตุรูปภาพ..."
                                className="w-full rounded border border-slate-200 px-2 py-1 text-[11px] dark:border-slate-600 dark:bg-slate-900"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => setPendingPhotos((prev) => prev.filter((_, i) => i !== idx))}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3">
                    <input
                      type="text"
                      value={scores.remarks}
                      onChange={(e) => setScores((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder="ข้อเสนอแนะเพิ่มเติมสำหรับสายการผลิต..."
                      className="min-h-[44px] flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={!isOnline || submitting}
                      className="min-h-[44px] inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {submitting ? 'กำลังบันทึก...' : (selfCommitteeRow?.is_completed ? 'อัปเดตผลตรวจ 5ส ของฉัน' : 'ยืนยันส่งผลตรวจ 5ส')}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Round Builder Modal (3-5 Auditors) */}
      {roundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleSaveRound}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-slate-700">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                {roundForm.round_id ? 'แก้ไขรอบ & คณะกรรมการตรวจ 5ส' : 'ตั้งรอบ & แต่งตั้งกรรมการตรวจ 5ส (3–5 คน)'}
              </h4>
              <button type="button" onClick={() => setRoundModalOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold">งวดเดือนประเมิน</label>
                  <input
                    type="month"
                    required
                    value={roundForm.eval_period}
                    onChange={(e) => setRoundForm((f) => ({ ...f, eval_period: e.target.value }))}
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">สายการผลิต / พื้นที่</label>
                  <select
                    required
                    value={roundForm.line}
                    onChange={(e) => setRoundForm((f) => ({
                      ...f,
                      line: e.target.value,
                      round_name: f.round_id ? f.round_name : `ตรวจ 5ส ประจำเดือน ${f.eval_period} (${e.target.value})`,
                    }))}
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600 dark:bg-slate-800"
                  >
                    {(structure?.lines || ['ASSEMBLY', 'BEND', 'PAINT', 'PRESS']).map((ln) => (
                      <option key={ln} value={ln}>{ln}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold">วันที่กำหนดตรวจ</label>
                  <input
                    type="date"
                    required
                    value={roundForm.audit_date}
                    onChange={(e) => setRoundForm((f) => ({ ...f, audit_date: e.target.value }))}
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold">ชื่อรอบการตรวจ</label>
                <input
                  type="text"
                  required
                  value={roundForm.round_name}
                  onChange={(e) => setRoundForm((f) => ({ ...f, round_name: e.target.value }))}
                  className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-xs dark:border-slate-600 dark:bg-slate-800"
                />
              </div>

              {/* Selected Committee Readout */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-white">
                    รายชื่อกรรมการที่เลือก ({roundForm.committee.length} / 3–5 คน)
                  </span>
                  <span className="font-mono font-bold text-emerald-600">
                    น้ำหนักหารเท่า: {roundForm.committee.length > 0 ? `${(100 / roundForm.committee.length).toFixed(1)}% / คน` : '-'}
                  </span>
                </div>
                {roundForm.committee.length < 3 && (
                  <p className="flex items-center gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                    <AlertTriangle className="h-3.5 w-3.5" /> กรุณาเลือกกรรมการอย่างน้อย 3 คน (สูงสุด 5 คน)
                  </p>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {roundForm.committee.map((m) => (
                    <span
                      key={m.auditor_emp_id}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700"
                    >
                      {m.auditor_name} ({m.auditor_emp_id})
                      <button
                        type="button"
                        onClick={() => setRoundForm((f) => ({ ...f, committee: f.committee.filter((x) => x.auditor_emp_id !== m.auditor_emp_id) }))}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Search Candidates */}
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={candSearch}
                    onChange={(e) => setCandSearch(e.target.value)}
                    placeholder="ค้นหารหัสพนักงาน ชื่อ หรือสายผลิต เพื่อแต่งตั้งเป็นกรรมการ..."
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs dark:border-slate-600 dark:bg-slate-800"
                  />
                </div>
                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-slate-700 dark:divide-slate-800">
                  {candidates.map((c) => {
                    const checked = roundForm.committee.some((m) => m.auditor_emp_id === c.emp_id);
                    return (
                      <button
                        key={c.emp_id}
                        type="button"
                        onClick={() => toggleCandidate(c)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                          checked ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-white">{c.name_th}</span>
                          <span className="ml-2 text-[11px] text-slate-400">{c.emp_id} · {c.line} ({c.position})</span>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${checked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                          {checked ? '✓ เลือกแล้ว' : '+ เพิ่ม'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-3 dark:border-slate-700">
              <button type="button" onClick={() => setRoundModalOpen(false)} className="min-h-[44px] rounded-lg border px-4 text-xs font-semibold dark:border-slate-600">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingRound || roundForm.committee.length < 3 || roundForm.committee.length > 5}
                className="min-h-[44px] rounded-lg bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingRound ? 'กำลังบันทึก...' : 'บันทึกรอบตรวจ 5ส'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lightbox Image Modal */}
      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs"
          onClick={() => setLightboxUrl(null)}
        >
          <div className="relative max-h-[90vh] max-w-4xl">
            <button
              type="button"
              onClick={() => setLightboxUrl(null)}
              className="absolute -right-2 -top-2 rounded-full bg-white p-1.5 text-slate-900 shadow-lg"
            >
              <X className="h-5 w-5" />
            </button>
            <img src={lightboxUrl} alt="หลักฐานตรวจ 5ส" className="max-h-[85vh] rounded-xl object-contain shadow-2xl" />
          </div>
        </div>
      )}
    </div>
  );
}

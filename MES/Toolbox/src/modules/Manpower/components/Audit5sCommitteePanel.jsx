import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Camera, CheckCircle2, Clock, Lock, Unlock, Plus, Users, X,
  Search, Shield, Image as ImageIcon, Eye, RefreshCw, Settings, Sparkles,
  Edit3, Trash2, Minus, ClipboardCheck
} from 'lucide-react';
import { audit5sApi } from '../../../shared/services/manpowerApi';
import { useToast, useConfirm } from '../../../shared/contexts/FeedbackContext';
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
  {
    key: 'score_seiri',
    label: 'ส.1 สะสาง (Seiri)',
    hint: 'แยกของจำเป็น/ไม่จำเป็น ไม่มีของค้างหรือไร้ป้ายชี้บ่ง',
    max: 20,
  },
  {
    key: 'score_seiton',
    label: 'ส.2 สะดวก (Seiton)',
    hint: 'จัดวางเป็นระเบียบ มีเส้นตีกรอบและป้ายระบุตำแหน่งชัดเจน',
    max: 20,
  },
  {
    key: 'score_seiso',
    label: 'ส.3 สะอาด (Seiso)',
    hint: 'พื้น เครื่องจักร และโต๊ะงานสะอาด ไม่มีคราบน้ำมันหรือเศษชิ้นงาน',
    max: 20,
  },
  {
    key: 'score_seiketsu',
    label: 'ส.4 สุขลักษณะ (Seiketsu)',
    hint: 'มาตรฐาน 3ส แรกสม่ำเสมอ แสงสว่าง ป้าย 5ส และสภาพแวดล้อมปลอดภัย',
    max: 20,
  },
  {
    key: 'score_shitsuke',
    label: 'ส.5 สร้างนิสัย (Shitsuke)',
    hint: 'แต่งกายและสวม PPE ครบถ้วน ปฏิบัติตามระเบียบหน้างานต่อเนื่อง',
    max: 20,
  },
];

const SCORE_PRESETS = [
  { label: 'ปรับปรุง (10)', val: 10, min: 0, max: 10, activeCls: 'bg-rose-600 text-white border-rose-600' },
  { label: 'พอใช้ (13)', val: 13, min: 11, max: 13, activeCls: 'bg-amber-500 text-white border-amber-500' },
  { label: 'ดี (16)', val: 16, min: 14, max: 17, activeCls: 'bg-sky-600 text-white border-sky-600' },
  { label: 'ดีเยี่ยม (19)', val: 19, min: 18, max: 20, activeCls: 'bg-emerald-600 text-white border-emerald-600' },
];

function scoreToGrade(total) {
  if (total >= 85) return 'A';
  if (total >= 70) return 'B';
  if (total >= 55) return 'C';
  return 'D';
}

export default function Audit5sCommitteePanel({ structure: propStructure, isOnline = true, standaloneHeader = false, onRoundUpdated }) {
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [auditDate, setAuditDate] = useState(getTodayIso);
  const evalPeriod = useMemo(() => (auditDate ? auditDate.slice(0, 7) : getMonthIso()), [auditDate]);
  const [loading, setLoading] = useState(false);
  const [rounds, setRounds] = useState([]);
  const [auditDatesInPeriod, setAuditDatesInPeriod] = useState([]);
  const [monthlyLineSummary, setMonthlyLineSummary] = useState({});
  const [isManager, setIsManager] = useState(false);
  const [selfEmpId, setSelfEmpId] = useState('');
  const [defaultCount, setDefaultCount] = useState(0);
  const [localLines, setLocalLines] = useState([]);

  const [lineSearch, setLineSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL'); // ALL | PENDING | DONE
  const [mobileSection, setMobileSection] = useState('form'); // 'form' | 'committee'

  const [selectedKey, setSelectedKey] = useState(null); // `r:${round_id}` or `v:${line}`
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
  const [lightboxUrl, setLightboxUrl] = useState(null);

  // Single Round Override Modal
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

  // Persistent Default Roster Modal (Unlimited auditors)
  const [defaultModalOpen, setDefaultModalOpen] = useState(false);
  const [defaultRoster, setDefaultRoster] = useState([]);
  const [defaultActiveLines, setDefaultActiveLines] = useState([]);
  const [defCandSearch, setDefCandSearch] = useState('');
  const [defCandidates, setDefCandidates] = useState([]);
  const [savingDefault, setSavingDefault] = useState(false);
  const [syncingRounds, setSyncingRounds] = useState(false);
  const [editingLineScopeEmpId, setEditingLineScopeEmpId] = useState(null);

  const linesPool = useMemo(() => {
    if (localLines.length) return localLines;
    if (defaultActiveLines.length) return defaultActiveLines;
    if (propStructure?.lines?.length) return propStructure.lines;
    return ['ASSEMBLY', 'BEND', 'MT/PE', 'OFFICE', 'PAINT', 'PRESS', 'QA/QC', 'SPOT', 'ST/WH'];
  }, [localLines, defaultActiveLines, propStructure]);

  const itemKey = (r) => (Number(r.round_id) > 0 ? `r:${r.round_id}` : `v:${r.line}`);

  const loadRounds = useCallback(async () => {
    setLoading(true);
    try {
      const res = await audit5sApi.getMyAssignments({ audit_date: auditDate, eval_period: evalPeriod });
      const list = Array.isArray(res?.data?.rounds) ? res.data.rounds : [];
      setRounds(list);
      setAuditDatesInPeriod(Array.isArray(res?.data?.audit_dates_in_period) ? res.data.audit_dates_in_period : []);
      setMonthlyLineSummary(res?.data?.monthly_line_summary && typeof res.data.monthly_line_summary === 'object' ? res.data.monthly_line_summary : {});
      setIsManager(Boolean(res?.data?.is_manager));
      setSelfEmpId(res?.data?.self_emp_id || '');
      setDefaultCount(Number(res?.data?.default_committee_count || 0));
      if (Array.isArray(res?.data?.active_lines) && res.data.active_lines.length > 0) {
        setLocalLines(res.data.active_lines);
      }

      if (list.length > 0) {
        const hasSel = selectedKey && list.some((r) => itemKey(r) === selectedKey);
        if (!hasSel) {
          setSelectedKey(itemKey(list[0]));
        }
      } else {
        setSelectedKey(null);
        setDetail(null);
      }
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดรายการตรวจ 5ส ได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [auditDate, evalPeriod, selectedKey, showToast]);

  useEffect(() => {
    loadRounds();
  }, [loadRounds]);

  const loadSelectedDetail = useCallback(async (key) => {
    if (!key) return;
    setDetailLoading(true);
    try {
      const isExisting = key.startsWith('r:');
      const res = isExisting
        ? await audit5sApi.getRoundDetail(Number(key.slice(2)))
        : await audit5sApi.getRoundDetail(0, { line: key.slice(2), audit_date: auditDate, eval_period: evalPeriod });
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
      if (!own || payload?.round?.status === 'LOCKED') {
        setMobileSection('committee');
      } else {
        setMobileSection('form');
      }
      setPendingPhotos([]);
    } catch (err) {
      showToast(err.message || 'โหลดรายละเอียดรอบตรวจไม่สำเร็จ', 'error');
    } finally {
      setDetailLoading(false);
    }
  }, [auditDate, evalPeriod, showToast]);

  useEffect(() => {
    if (selectedKey) {
      loadSelectedDetail(selectedKey);
    }
  }, [selectedKey, loadSelectedDetail]);

  const loadCandidates = useCallback(async (q, targetSetter) => {
    try {
      const res = await audit5sApi.getAuditorCandidates(q);
      targetSetter(Array.isArray(res?.data) ? res.data : []);
    } catch {
      // Ignore search failure
    }
  }, []);

  useEffect(() => {
    if (roundModalOpen) {
      const timer = setTimeout(() => loadCandidates(candSearch, setCandidates), 250);
      return () => clearTimeout(timer);
    }
  }, [roundModalOpen, candSearch, loadCandidates]);

  useEffect(() => {
    if (defaultModalOpen) {
      const timer = setTimeout(() => loadCandidates(defCandSearch, setDefCandidates), 250);
      return () => clearTimeout(timer);
    }
  }, [defaultModalOpen, defCandSearch, loadCandidates]);

  const openDefaultModal = async () => {
    setDefaultModalOpen(true);
    setDefCandSearch('');
    setEditingLineScopeEmpId(null);
    try {
      const res = await audit5sApi.getDefaultCommittee();
      const members = Array.isArray(res?.data?.members) ? res.data.members : [];
      setDefaultRoster(members.map((m) => ({
        auditor_emp_id: m.auditor_emp_id,
        auditor_name: m.auditor_name,
        assigned_role: m.assigned_role || 'AUDITOR',
        assigned_lines: Array.isArray(m.assigned_lines_list) ? m.assigned_lines_list : ['ALL'],
      })));
      if (Array.isArray(res?.data?.active_lines) && res.data.active_lines.length > 0) {
        setDefaultActiveLines(res.data.active_lines);
      }
    } catch (err) {
      showToast(err.message || 'โหลดรายชื่อคณะกรรมการประจำไม่สำเร็จ', 'error');
    }
  };

  const toggleDefaultCandidate = (cand) => {
    setDefaultRoster((prev) => {
      const exists = prev.some((m) => m.auditor_emp_id === cand.emp_id);
      if (exists) {
        return prev.filter((m) => m.auditor_emp_id !== cand.emp_id);
      }
      return [
        ...prev,
        {
          auditor_emp_id: cand.emp_id,
          auditor_name: cand.name_th,
          assigned_role: prev.length === 0 ? 'CHAIR' : 'AUDITOR',
          assigned_lines: ['ALL'],
        },
      ];
    });
  };

  const addAllVisibleDefaultCandidates = () => {
    setDefaultRoster((prev) => {
      const existing = new Set(prev.map((m) => m.auditor_emp_id));
      const added = defCandidates
        .filter((c) => !existing.has(c.emp_id))
        .map((c, idx) => ({
          auditor_emp_id: c.emp_id,
          auditor_name: c.name_th,
          assigned_role: prev.length === 0 && idx === 0 ? 'CHAIR' : 'AUDITOR',
          assigned_lines: ['ALL'],
        }));
      return [...prev, ...added];
    });
  };

  const toggleMemberScopeLine = (empId, lineName) => {
    setDefaultRoster((prev) => prev.map((m) => {
      if (m.auditor_emp_id !== empId) return m;
      if (lineName === 'ALL') {
        return { ...m, assigned_lines: ['ALL'] };
      }
      const cur = (m.assigned_lines || []).filter((x) => x !== 'ALL');
      const next = cur.includes(lineName) ? cur.filter((x) => x !== lineName) : [...cur, lineName];
      return { ...m, assigned_lines: next.length ? next : ['ALL'] };
    }));
  };

  const handleSaveDefaultRoster = async (e) => {
    e.preventDefault();
    if (defaultRoster.length < 1) {
      showToast('กรุณาเลือกคณะกรรมการ 5ส ประจำอย่างน้อย 1 คน', 'warning');
      return;
    }
    setSavingDefault(true);
    try {
      const res = await audit5sApi.saveDefaultCommittee(defaultRoster);
      showToast(res?.message || 'บันทึกคณะกรรมการประจำเรียบร้อยแล้ว', 'success');
      setDefaultModalOpen(false);
      await loadRounds();
      onRoundUpdated?.();
    } catch (err) {
      showToast(err.message || 'บันทึกคณะกรรมการประจำไม่สำเร็จ', 'error');
    } finally {
      setSavingDefault(false);
    }
  };

  const handleSyncAllLines = async () => {
    if (!isOnline || !isManager) return;
    setSyncingRounds(true);
    try {
      const res = await audit5sApi.syncPeriodRounds(evalPeriod, auditDate || getTodayIso());
      showToast(res?.message || 'เปิดรอบตรวจทุกสายจากชุด Default เรียบร้อยแล้ว', 'success');
      await loadRounds();
      onRoundUpdated?.();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถซิงค์รอบตรวจได้', 'error');
    } finally {
      setSyncingRounds(false);
    }
  };

  const openNewRoundModal = async (preselectLine = '') => {
    const defaultLine = preselectLine || linesPool[0] || 'ASSEMBLY';
    const targetDt = auditDate || getTodayIso();
    let seedCommittee = [];
    try {
      const res = await audit5sApi.getDefaultCommittee();
      const members = Array.isArray(res?.data?.members) ? res.data.members : [];
      seedCommittee = members
        .filter((m) => {
          const scope = m.assigned_lines_list || ['ALL'];
          return scope.includes('ALL') || scope.includes(defaultLine);
        })
        .map((m) => ({
          auditor_emp_id: m.auditor_emp_id,
          auditor_name: m.auditor_name,
          assigned_role: m.assigned_role || 'AUDITOR',
        }));
    } catch {
      // Optional default seed
    }
    setRoundForm({
      round_id: 0,
      eval_period: targetDt.slice(0, 7),
      line: defaultLine,
      round_name: `ตรวจ 5ส ประจำวันที่ ${targetDt} (${defaultLine})`,
      audit_date: targetDt,
      notes: '',
      committee: seedCommittee,
    });
    setCandSearch('');
    setRoundModalOpen(true);
  };

  const openEditRoundModal = (targetRound = null, targetCommittee = null) => {
    const rObj = targetRound || detail?.round;
    const cList = targetCommittee || detail?.committee || [];
    if (!rObj) return;
    const targetDt = rObj.audit_date || auditDate || getTodayIso();
    setRoundForm({
      round_id: Number(rObj.round_id || 0),
      eval_period: rObj.eval_period || targetDt.slice(0, 7),
      line: rObj.line || linesPool[0] || 'ASSEMBLY',
      round_name: rObj.round_name || `ตรวจ 5ส ประจำวันที่ ${targetDt} (${rObj.line})`,
      audit_date: targetDt,
      notes: rObj.notes || '',
      committee: cList.map((m) => ({
        auditor_emp_id: m.auditor_emp_id,
        auditor_name: m.auditor_name,
        assigned_role: m.assigned_role || 'AUDITOR',
      })),
    });
    setCandSearch('');
    setRoundModalOpen(true);
  };

  const handleDeleteRound = async (roundObj = null) => {
    const r = roundObj || detail?.round;
    const rId = Number(r?.round_id || 0);
    if (!isManager || rId <= 0) return;
    if (r.status === 'LOCKED') {
      showToast('กรุณาปลดล็อกรอบตรวจก่อนทำการลบ', 'warning');
      return;
    }
    const ok = await confirm({
      title: 'ยืนยันการลบรอบตรวจ 5ส',
      message: `ต้องการลบรอบตรวจ "${r.round_name || r.line}" (${r.eval_period}) หรือไม่? คะแนนและรูปถ่ายที่ส่งในรอบนี้จะถูกลบทั้งหมด`,
      confirmText: 'ยืนยันลบรอบ',
      cancelText: 'ยกเลิก',
      variant: 'danger',
    });
    if (!ok) return;

    try {
      const res = await audit5sApi.deleteRound(rId);
      showToast(res?.message || 'ลบรอบตรวจ 5ส เรียบร้อยแล้ว', 'success');
      setSelectedKey(null);
      await loadRounds();
      onRoundUpdated?.();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถลบรอบตรวจได้', 'error');
    }
  };

  const handleDeleteSavedPhoto = async (photoId) => {
    if (!photoId) return;
    const ok = await confirm({
      title: 'ยืนยันการลบรูปภาพ',
      message: 'ต้องการลบรูปภาพหลักฐาน 5ส รูปนี้หรือไม่?',
      confirmText: 'ลบรูปภาพ',
      cancelText: 'ยกเลิก',
      variant: 'danger',
    });
    if (!ok) return;
    try {
      const res = await audit5sApi.deletePhoto(photoId);
      showToast(res?.message || 'ลบรูปภาพเรียบร้อยแล้ว', 'success');
      if (selectedKey) {
        await loadSelectedDetail(selectedKey);
      }
    } catch (err) {
      showToast(err.message || 'ไม่สามารถลบรูปภาพได้', 'error');
    }
  };

  const toggleCandidate = (cand) => {
    setRoundForm((prev) => {
      const exists = prev.committee.some((m) => m.auditor_emp_id === cand.emp_id);
      if (exists) {
        return { ...prev, committee: prev.committee.filter((m) => m.auditor_emp_id !== cand.emp_id) };
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
    if (roundForm.committee.length < 1) {
      showToast('กรุณาเลือกกรรมการตรวจ 5ส อย่างน้อย 1 คน', 'warning');
      return;
    }
    setSavingRound(true);
    try {
      const res = await audit5sApi.saveRound(roundForm);
      showToast(res?.message || 'บันทึกรอบตรวจ 5ส เรียบร้อยแล้ว', 'success');
      setRoundModalOpen(false);
      const nextKey = res?.data?.round_id ? `r:${res.data.round_id}` : selectedKey;
      setSelectedKey(nextKey);
      await loadRounds();
      if (nextKey) {
        await loadSelectedDetail(nextKey);
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
      fd.append('round_id', String(detail.round.round_id || 0));
      fd.append('eval_period', String(detail.round.eval_period || evalPeriod));
      fd.append('line', String(detail.round.line || ''));
      fd.append('audit_date', String(detail.round.audit_date || getTodayIso()));
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
      const materializedId = Number(res?.data?.round_id || detail.round.round_id || 0);
      const nextKey = materializedId > 0 ? `r:${materializedId}` : selectedKey;
      setSelectedKey(nextKey);
      await loadRounds();
      if (nextKey) {
        await loadSelectedDetail(nextKey);
      }
      onRoundUpdated?.();
    } catch (err) {
      showToast(err.message || 'ส่งผลตรวจ 5ส ไม่สำเร็จ', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleLock = async () => {
    if (!detail?.round?.round_id || !isManager) return;
    const nextLock = detail.round.status !== 'LOCKED';
    try {
      const res = await audit5sApi.toggleRoundLock(detail.round.round_id, nextLock);
      showToast(res?.message || 'อัปเดตสถานะรอบตรวจแล้ว', 'success');
      await loadRounds();
      await loadSelectedDetail(`r:${detail.round.round_id}`);
      onRoundUpdated?.();
    } catch (err) {
      showToast(err.message || 'ไม่สามารถเปลี่ยนสถานะล็อกได้', 'error');
    }
  };

  const adjustScoreField = (key, delta) => {
    setScores((prev) => ({
      ...prev,
      [key]: Math.max(0, Math.min(20, Number(prev[key] || 0) + delta)),
    }));
  };

  const filteredRounds = useMemo(() => {
    const q = lineSearch.trim().toLowerCase();
    return rounds.filter((r) => {
      if (statusFilter === 'PENDING' && Number(r.my_is_completed) === 1) return false;
      if (statusFilter === 'DONE' && Number(r.my_is_completed) !== 1) return false;
      if (!q) return true;
      return String(r.line || '').toLowerCase().includes(q)
        || String(r.round_name || '').toLowerCase().includes(q);
    });
  }, [rounds, lineSearch, statusFilter]);

  const totalPreview = SCORE_FIELDS.reduce((acc, f) => acc + Number(scores[f.key] || 0), 0);
  const previewGrade = scoreToGrade(totalPreview);
  const selfCommitteeRow = (detail?.committee || []).find((m) => m.is_self);
  const canSubmitHere = Boolean(selfCommitteeRow) && detail?.round?.status !== 'LOCKED';
  const savedRoundId = Number(detail?.round?.round_id || 0);

  return (
    <div className="space-y-2.5 sm:space-y-3">
      {/* Slim Responsive Header Toolbar */}
      <div className="rounded-xl border border-slate-200 bg-white p-2.5 sm:px-3.5 sm:py-2.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-8 w-8 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white leading-tight truncate">
                {standaloneHeader ? 'ระบบตรวจประเมินกิจกรรม 5ส หน้างาน (รายวัน)' : 'คณะกรรมการตรวจ 5ส รายวัน (หารเท่า 1/N)'}
              </h2>
              <p className="text-[11px] text-slate-500 truncate">
                กรรมการประจำ {defaultCount} คน · ตรวจรายวัน (จ./พ./ศ. หรือวันตรวจพิเศษ) แล้วคำนวณค่าเฉลี่ยสะสมรายเดือนเข้าเกรด 4D
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <input
              type="date"
              value={auditDate}
              onChange={(e) => setAuditDate(e.target.value || getTodayIso())}
              className="min-h-[36px] sm:min-h-[38px] rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              title="เลือกวันที่ตรวจ 5ส"
            />
            {auditDate !== getTodayIso() && (
              <button
                type="button"
                onClick={() => setAuditDate(getTodayIso())}
                className="min-h-[36px] sm:min-h-[38px] rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
              >
                วันนี้
              </button>
            )}
            <button
              type="button"
              onClick={loadRounds}
              className="min-h-[36px] min-w-[36px] sm:min-h-[38px] sm:min-w-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
              title="รีเฟรชรายการ"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {auditDatesInPeriod.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pt-1 border-t border-slate-100 dark:border-slate-700/70 custom-scrollbar">
            <span className="shrink-0 text-[11px] font-bold text-slate-500">
              วันที่ตรวจในเดือน {evalPeriod}:
            </span>
            {auditDatesInPeriod.map((d) => {
              const isCur = d.audit_date === auditDate;
              return (
                <button
                  key={d.audit_date}
                  type="button"
                  onClick={() => setAuditDate(d.audit_date)}
                  className={`shrink-0 rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                    isCur
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {d.audit_date} ({d.audited_lines || 0} สาย{d.avg_score ? ` · เฉลี่ย ${d.avg_score}` : ''})
                </button>
              );
            })}
          </div>
        )}

        {isManager && (
          <div className="grid grid-cols-3 sm:flex sm:flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100 dark:border-slate-700/70">
            <button
              type="button"
              onClick={openDefaultModal}
              className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Settings className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">กรรมการประจำ ({defaultCount})</span>
            </button>
            <button
              type="button"
              disabled={!isOnline || syncingRounds || defaultCount === 0}
              onClick={handleSyncAllLines}
              title="สร้าง/อัปเดตรอบตรวจทุกสายผลิตในเดือนนี้จากรายชื่อกรรมการประจำ"
              className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-lg bg-teal-600 px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-white hover:bg-teal-700 disabled:opacity-50"
            >
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{syncingRounds ? 'กำลังซิงค์...' : 'เปิดรอบทุกสาย'}</span>
            </button>
            <button
              type="button"
              onClick={() => openNewRoundModal()}
              className="min-h-[36px] inline-flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2 sm:px-3 text-[11px] sm:text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <Plus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">เปิดรอบเฉพาะสาย</span>
            </button>
          </div>
        )}
      </div>

      {/* MOBILE (< lg): Compact Search + Horizontal Scrollable Line Pill Bar */}
      <div className="lg:hidden space-y-2 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1 min-w-0">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={lineSearch}
              onChange={(e) => setLineSearch(e.target.value)}
              placeholder="ค้นหาสายผลิต..."
              className="min-h-[34px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            />
          </div>
          <div className="flex gap-1 shrink-0">
            {[
              { id: 'ALL', label: 'ทั้งหมด' },
              { id: 'PENDING', label: 'รอตรวจ' },
              { id: 'DONE', label: 'ส่งแล้ว' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`min-h-[34px] rounded-lg px-2 text-[11px] font-bold transition ${
                  statusFilter === st.id
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="py-3 text-center text-xs text-slate-400">กำลังโหลดสายการผลิต...</div>
        ) : filteredRounds.length === 0 ? (
          <div className="py-3 text-center text-xs text-slate-400">ไม่พบสายการผลิตในตัวกรองนี้</div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
            {filteredRounds.map((r) => {
              const k = itemKey(r);
              const active = k === selectedKey;
              const isDone = Number(r.my_is_completed) === 1;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedKey(k)}
                  className={`shrink-0 rounded-xl border px-3 py-2 text-left transition ${
                    active
                      ? 'border-emerald-600 bg-emerald-600 text-white shadow-xs'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${isDone ? (active ? 'bg-white' : 'bg-emerald-500') : 'bg-amber-400'}`} />
                    <span className="text-xs font-extrabold whitespace-nowrap">{r.line}</span>
                    {r.final_grade && (
                      <span className={`rounded px-1.5 py-0.2 text-[10px] font-mono font-extrabold ${
                        active ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                      }`}>
                        {r.final_grade}
                      </span>
                    )}
                  </div>
                  <div className={`mt-0.5 text-[10px] whitespace-nowrap ${active ? 'text-emerald-100' : 'text-slate-500'}`}>
                    {isDone ? '✓ ส่งแล้ว' : 'รอตรวจ'} · {r.submitted_count}/{r.required_auditors} คน
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 gap-3.5 lg:grid-cols-12">
        {/* Desktop Left Sidebar: Line / Round Selector */}
        <div className="hidden lg:block lg:col-span-4 space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
            <div className="relative flex-1 min-w-[130px]">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                value={lineSearch}
                onChange={(e) => setLineSearch(e.target.value)}
                placeholder="ค้นหาสายผลิต..."
                className="min-h-[34px] w-full rounded-lg border border-slate-200 bg-slate-50 pl-8 pr-2.5 text-xs dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </div>
            <div className="flex gap-1">
              {[
                { id: 'ALL', label: 'ทั้งหมด' },
                { id: 'PENDING', label: 'รอตรวจ' },
                { id: 'DONE', label: 'ตรวจแล้ว' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`min-h-[34px] rounded-lg px-2.5 text-[11px] font-bold transition ${
                    statusFilter === st.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-900 dark:text-slate-300'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-[calc(100vh-240px)] overflow-y-auto space-y-2 pr-0.5 custom-scrollbar">
            {loading ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
                กำลังโหลดรายชื่อสายผลิตและรอบตรวจ 5ส...
              </div>
            ) : filteredRounds.length === 0 ? (
              <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800 space-y-2">
                <Users className="h-8 w-8 mx-auto text-slate-300" />
                <p>ไม่พบรายการตรวจ 5ส ในงวดเดือน {evalPeriod}</p>
                {isManager && defaultCount === 0 && (
                  <p className="text-[11px] text-amber-600 font-semibold">
                    กรุณากด "กรรมการประจำ" เพื่อกำหนดรายชื่อกรรมการถาวร
                  </p>
                )}
              </div>
            ) : (
              filteredRounds.map((r) => {
                const k = itemKey(r);
                const active = k === selectedKey;
                const gBadge = GRADE_BADGE_MAP[r.final_grade] || 'bg-slate-100 text-slate-500 border-slate-200';
                const hasSavedRound = Number(r.round_id) > 0;
                return (
                  <div
                    key={k}
                    onClick={() => setSelectedKey(k)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedKey(k); }}
                    className={`w-full cursor-pointer text-left rounded-xl border p-3 transition ${
                      active
                        ? 'border-emerald-500 bg-emerald-50/50 ring-1 ring-emerald-500/40 dark:bg-emerald-950/30 dark:border-emerald-700'
                        : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-750'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-block rounded bg-slate-100 dark:bg-slate-700 px-2 py-0.5 text-[10px] font-bold text-slate-700 dark:text-slate-200">
                            {r.line}
                          </span>
                          {r.is_virtual_default ? (
                            <span className="rounded bg-teal-100 px-1.5 py-0.5 text-[9px] font-bold text-teal-700 dark:bg-teal-950/60 dark:text-teal-300">
                              ชุดประจำ
                            </span>
                          ) : (
                            <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[9px] font-bold text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                              เปิดรอบแล้ว
                            </span>
                          )}
                        </div>
                        <h4 className="mt-1 text-xs font-bold text-slate-800 dark:text-white truncate">
                          {r.round_name}
                        </h4>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          ส่งแล้ว {r.submitted_count}/{r.required_auditors} คน · {r.audit_date}
                        </p>
                        {monthlyLineSummary[r.line] && (
                          <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-0.5">
                            สะสมเดือน {evalPeriod}: {Number(monthlyLineSummary[r.line].score_5s).toFixed(1)} (เกรด {monthlyLineSummary[r.line].grade_5s} · ตรวจ {monthlyLineSummary[r.line].audited_days_count || 1} วัน)
                          </p>
                        )}
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
                    <div className="mt-2 flex items-center justify-between text-[10px]">
                      <span className={`font-bold ${Number(r.my_is_completed) ? 'text-emerald-600' : 'text-amber-600'}`}>
                        {Number(r.my_is_completed) ? '✓ คุณส่งคะแนนแล้ว' : '● รอคุณตรวจ & แนบรูป'}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 uppercase">{r.status}</span>
                        {isManager && hasSavedRound && r.status !== 'LOCKED' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRound(r);
                            }}
                            title="ลบรอบตรวจนี้"
                            className="rounded p-1 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Selected Round Detail & Mobile Audit Form */}
        <div className="lg:col-span-8">
          {detailLoading || !detail?.round ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 sm:p-12 text-center text-xs text-slate-400 dark:border-slate-700 dark:bg-slate-800">
              {detailLoading ? 'กำลังโหลดข้อมูลรอบตรวจ...' : 'เลือกสายผลิตเพื่อตรวจประเมินและแนบภาพถ่าย'}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Compact Line Summary & Manager CRUD Bar */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 sm:p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800 space-y-2.5">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-xs font-extrabold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {detail.round.line}
                      </span>
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-700 dark:text-slate-200">
                        {detail.round.status}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">{detail.round.audit_date}</span>
                    </div>
                    <h4 className="mt-1 text-sm sm:text-base font-bold text-slate-800 dark:text-white leading-snug">
                      {detail.round.round_name}
                    </h4>
                  </div>

                  {isManager && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      {detail.round.status !== 'LOCKED' && (
                        <button
                          type="button"
                          onClick={() => openEditRoundModal()}
                          className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
                        >
                          <Edit3 className="h-3.5 w-3.5 text-indigo-600" />
                          <span>{savedRoundId > 0 ? 'แก้ไขรอบ/กรรมการ' : 'ปรับกรรมการสายนี้'}</span>
                        </button>
                      )}
                      {savedRoundId > 0 && (
                        <button
                          type="button"
                          onClick={handleToggleLock}
                          className={`min-h-[34px] inline-flex items-center gap-1 rounded-lg px-2.5 text-[11px] font-bold ${
                            detail.round.status === 'LOCKED'
                              ? 'bg-amber-600 text-white hover:bg-amber-700'
                              : 'border border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                          }`}
                        >
                          {detail.round.status === 'LOCKED' ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                          <span>{detail.round.status === 'LOCKED' ? 'ปลดล็อก' : 'ล็อกปิดผล'}</span>
                        </button>
                      )}
                      {savedRoundId > 0 && detail.round.status !== 'LOCKED' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteRound(detail.round)}
                          className="min-h-[34px] inline-flex items-center gap-1 rounded-lg border border-rose-300 bg-rose-50 px-2.5 text-[11px] font-bold text-rose-700 hover:bg-rose-100 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-300"
                          title="ลบรอบตรวจ 5ส นี้"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>ลบรอบ</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 4 Compact Consensus KPI Boxes (Daily + Monthly Rollup) */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-900/60">
                  <div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500">ผู้ส่งผลวันนี้</div>
                    <div className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white">
                      {detail.round.submitted_count} / {detail.round.required_auditors} คน
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500">คะแนนเฉลี่ยวันนี้ (1/N)</div>
                    <div className="text-xs sm:text-sm font-extrabold font-mono text-emerald-600">
                      {detail.round.weighted_score !== null ? `${Number(detail.round.weighted_score).toFixed(1)} / 100` : 'ยังไม่มีผู้ส่ง'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500">เกรดประจำวัน</div>
                    <div className="text-xs sm:text-sm font-extrabold font-mono text-indigo-600">
                      {detail.round.final_grade || '-'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] sm:text-[11px] text-slate-500">สะสมเฉลี่ยเดือน {evalPeriod}</div>
                    <div className="text-xs sm:text-sm font-extrabold font-mono text-violet-600 dark:text-violet-400">
                      {monthlyLineSummary[detail.round.line]
                        ? `${Number(monthlyLineSummary[detail.round.line].score_5s).toFixed(1)} (เกรด ${monthlyLineSummary[detail.round.line].grade_5s} · ${monthlyLineSummary[detail.round.line].audited_days_count || 1} วัน)`
                        : 'ยังไม่มีผลในเดือนนี้'}
                    </div>
                  </div>
                </div>

                {/* Mobile 2-Tab View Switcher (Form First vs Committee Status) */}
                {canSubmitHere && (
                  <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-slate-100 p-1 lg:hidden dark:bg-slate-900">
                    <button
                      type="button"
                      onClick={() => setMobileSection('form')}
                      className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-extrabold transition ${
                        mobileSection === 'form'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <ClipboardCheck className="h-4 w-4 shrink-0" />
                      <span className="truncate">ให้คะแนน ({totalPreview}/100)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileSection('committee')}
                      className={`min-h-[38px] inline-flex items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-extrabold transition ${
                        mobileSection === 'committee'
                          ? 'bg-emerald-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900 dark:text-slate-300'
                      }`}
                    >
                      <Users className="h-4 w-4 shrink-0" />
                      <span className="truncate">สถานะกรรมการ ({detail.round.submitted_count}/{detail.round.required_auditors})</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION A: Committee Member Scoring & Camera Photo Upload Form (Shown FIRST on Mobile!) */}
              {canSubmitHere && (
                <form
                  onSubmit={handleSubmitAudit}
                  className={`${mobileSection === 'committee' ? 'hidden lg:block' : 'block'} rounded-xl border border-emerald-200 bg-white p-3.5 sm:p-4 shadow-2xs dark:border-emerald-800 dark:bg-slate-800 space-y-3.5`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-700">
                    <div>
                      <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white">
                        แบบฟอร์มบันทึกคะแนน 5ส & แนบรูปภาพ ({selfEmpId})
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        แตะเลือกเกณฑ์มาตรฐาน หรือกดปุ่ม - / + เพื่อปรับคะแนนแต่ละหมวด (0–20 คะแนน)
                      </p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 px-3 py-1 text-right dark:bg-emerald-950/50">
                      <span className="text-[10px] text-slate-500 block">คะแนนรวมของคุณ</span>
                      <span className="font-mono text-sm sm:text-base font-extrabold text-emerald-600">
                        {totalPreview}/100 (เกรด {previewGrade})
                      </span>
                    </div>
                  </div>

                  {/* Standardized 5S Rubric Cards with Quick-Tap Chips & +/- Steppers */}
                  <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2">
                    {SCORE_FIELDS.map((sf) => {
                      const curVal = Number(scores[sf.key] ?? 16);
                      return (
                        <div
                          key={sf.key}
                          className="rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 sm:p-3 dark:border-slate-700 dark:bg-slate-900/40 space-y-2"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-extrabold text-slate-800 dark:text-white">
                                {sf.label}
                              </div>
                              <p className="text-[10px] text-slate-500 leading-snug mt-0.5">
                                {sf.hint}
                              </p>
                            </div>
                            <span className="shrink-0 rounded-lg bg-white border border-slate-200 px-2 py-0.5 font-mono text-xs font-extrabold text-emerald-700 dark:bg-slate-800 dark:border-slate-700 dark:text-emerald-300">
                              {curVal} / {sf.max}
                            </span>
                          </div>

                          {/* 4 Quick Rubric Level Chips */}
                          <div className="grid grid-cols-4 gap-1">
                            {SCORE_PRESETS.map((pr) => {
                              const isSelected = curVal >= pr.min && curVal <= pr.max;
                              return (
                                <button
                                  key={pr.label}
                                  type="button"
                                  onClick={() => setScores((prev) => ({ ...prev, [sf.key]: pr.val }))}
                                  className={`min-h-[32px] rounded-lg border px-1.5 text-[10px] font-bold transition ${
                                    isSelected
                                      ? pr.activeCls
                                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300'
                                  }`}
                                >
                                  {pr.label}
                                </button>
                              );
                            })}
                          </div>

                          {/* Fine Stepper (-1 / Number Input / +1) */}
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => adjustScoreField(sf.key, -1)}
                              className="min-h-[36px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              aria-label="ลด 1 คะแนน"
                            >
                              <Minus className="h-3.5 w-3.5" />
                            </button>
                            <input
                              type="number"
                              min="0"
                              max={sf.max}
                              required
                              value={scores[sf.key]}
                              onChange={(e) => setScores((prev) => ({ ...prev, [sf.key]: Math.max(0, Math.min(20, Number(e.target.value))) }))}
                              className="min-h-[36px] flex-1 rounded-lg border border-slate-300 bg-white px-2 text-center font-mono text-sm font-extrabold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                            />
                            <button
                              type="button"
                              onClick={() => adjustScoreField(sf.key, 1)}
                              className="min-h-[36px] min-w-[38px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
                              aria-label="เพิ่ม 1 คะแนน"
                            >
                              <Plus className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* High-Contrast Camera & Gallery Photo Upload Box (Fixes theme-light invisible bg-slate-800 bug) */}
                  <div className="rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 p-3 dark:border-emerald-800 dark:bg-slate-900/40 space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <ImageIcon className="h-4 w-4 text-emerald-600" />
                        <span className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                          แนบรูปถ่ายหน้างาน 5ส (สูงสุด 10 รูป · 5MB/รูป)
                        </span>
                      </div>
                      <select
                        value={photoCategory}
                        onChange={(e) => setPhotoCategory(e.target.value)}
                        className="min-h-[36px] rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-semibold dark:border-slate-600 dark:bg-slate-800"
                      >
                        {CAT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <label className="min-h-[42px] flex-1 sm:flex-initial inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-extrabold text-white shadow-xs hover:bg-emerald-700">
                        <Camera className="h-4 w-4 shrink-0" />
                        <span>ถ่ายรูปจากกล้อง ({pendingPhotos.length})</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          onChange={handlePhotoFiles}
                          className="hidden"
                        />
                      </label>

                      <label className="min-h-[42px] flex-1 sm:flex-initial inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-emerald-600 bg-white px-4 text-xs font-extrabold text-emerald-700 hover:bg-emerald-50 dark:bg-slate-800 dark:text-emerald-300">
                        <ImageIcon className="h-4 w-4 shrink-0" />
                        <span>เลือกรูปจากอัลบั้ม</span>
                        <input
                          type="file"
                          accept="image/*"
                          multiple
                          onChange={handlePhotoFiles}
                          className="hidden"
                        />
                      </label>
                    </div>

                    {pendingPhotos.length > 0 && (
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {pendingPhotos.map((p, idx) => (
                          <div key={idx} className="flex items-center gap-2.5 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800">
                            <img src={p.previewUrl} alt="preview" className="h-12 w-12 rounded object-cover shrink-0" />
                            <div className="flex-1 min-w-0 space-y-1">
                              <div className="text-[10px] font-bold text-emerald-600 truncate">{p.category} · {p.file.name}</div>
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
                              title="นำรูปนี้ออก"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                    <input
                      type="text"
                      value={scores.remarks}
                      onChange={(e) => setScores((prev) => ({ ...prev, remarks: e.target.value }))}
                      placeholder="ข้อเสนอแนะเพิ่มเติมสำหรับสายการผลิต..."
                      className="min-h-[42px] flex-1 rounded-xl border border-slate-300 bg-slate-50 px-3 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                    />
                    <button
                      type="submit"
                      disabled={!isOnline || submitting}
                      className="min-h-[44px] inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-xs font-extrabold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      {submitting ? 'กำลังบันทึก...' : (selfCommitteeRow?.is_completed ? 'อัปเดตผลตรวจ 5ส ของฉัน' : 'ยืนยันส่งผลตรวจ 5ส')}
                    </button>
                  </div>
                </form>
              )}

              {/* SECTION B: Committee Member Status & Evidence List (Responsive Mobile Cards + Desktop Table) */}
              <div className={`${canSubmitHere && mobileSection === 'form' ? 'hidden lg:block' : 'block'} rounded-xl border border-slate-200 bg-white p-3.5 sm:p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800 space-y-3`}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h5 className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-white">
                    สถานะคณะกรรมการตรวจประเมิน ({detail.committee.length} คน)
                  </h5>
                  {detail.blind_mode && (
                    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                      <Shield className="h-3.5 w-3.5 shrink-0" />
                      ซ่อนคะแนนผู้อื่นจนกว่าจะปิดรอบ
                    </span>
                  )}
                </div>

                {/* Mobile View (< sm): Clean Stacked Member Cards (No Horizontal Text Crushing) */}
                <div className="sm:hidden divide-y divide-slate-100 dark:divide-slate-700">
                  {detail.committee.map((m) => (
                    <div key={m.auditor_emp_id || m.id} className="py-2.5 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-800 dark:text-white">
                            {m.auditor_name || m.auditor_emp_id}
                            {m.is_self && <span className="ml-1 text-[10px] font-extrabold text-emerald-600">(คุณ)</span>}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {m.auditor_emp_id} · {m.assigned_role === 'CHAIR' ? 'ประธาน' : 'กรรมการ'} · สัดส่วน {Number(m.weight_pct || 0).toFixed(1)}%
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          {Number(m.is_completed) ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle2 className="h-3 w-3" /> ส่งแล้ว
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              <Clock className="h-3 w-3" /> รอตรวจ
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="font-mono font-bold text-slate-700 dark:text-slate-200">
                          คะแนน: {m.blind_masked ? <span className="text-slate-400">ซ่อน (Blind)</span> : (m.total_score !== null ? `${m.total_score}/100 (เกรด ${m.grade || '-'})` : '-')}
                        </div>
                        {!m.blind_masked && (m.photos || []).length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {m.photos.map((ph) => (
                              <span
                                key={ph.photo_id}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-600 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300"
                              >
                                <button
                                  type="button"
                                  onClick={() => setLightboxUrl(audit5sApi.getPhotoUrl(ph.file_name))}
                                  className="inline-flex items-center gap-1"
                                >
                                  <Eye className="h-3 w-3" /> {ph.category_5s}
                                </button>
                                {(m.is_self || isManager) && detail.round.status !== 'LOCKED' && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteSavedPhoto(ph.photo_id)}
                                    className="ml-0.5 text-rose-500 hover:text-rose-700"
                                    title="ลบรูปภาพนี้"
                                  >
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Tablet / Desktop View (sm+): Clean Whitespace-Safe Table */}
                <div className="hidden sm:block max-h-72 overflow-auto custom-scrollbar">
                  <table className="w-full text-left text-xs whitespace-nowrap">
                    <thead className="sticky top-0 bg-slate-50 font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
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
                        <tr key={m.auditor_emp_id || m.id}>
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
                              <span className="text-slate-400 text-[11px]">รอปิดรอบ</span>
                            ) : (m.photos || []).length > 0 ? (
                              <div className="flex flex-wrap gap-1.5">
                                {m.photos.map((ph) => (
                                  <span
                                    key={ph.photo_id}
                                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:text-indigo-300"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setLightboxUrl(audit5sApi.getPhotoUrl(ph.file_name))}
                                      className="inline-flex items-center gap-1"
                                    >
                                      <Eye className="h-3 w-3" /> {ph.category_5s}
                                    </button>
                                    {(m.is_self || isManager) && detail.round.status !== 'LOCKED' && (
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteSavedPhoto(ph.photo_id)}
                                        className="ml-0.5 text-rose-500 hover:text-rose-700"
                                        title="ลบรูปภาพนี้"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    )}
                                  </span>
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
            </div>
          )}
        </div>
      </div>

      {/* Persistent Default Committee Roster Modal (Unlimited Auditors) */}
      {defaultModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleSaveDefaultRoster}
            className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-slate-700">
              <div>
                <h4 className="text-base font-bold text-slate-800 dark:text-white">
                  ตั้งค่าคณะกรรมการตรวจ 5ส ประจำถาวร (Default Roster)
                </h4>
                <p className="text-[11px] text-slate-500">
                  ตั้งครั้งเดียวใช้ต่อเนื่องทุกรอบ (ไม่จำกัดจำนวนคน · ค่าเริ่มต้นตรวจได้ทุกสายผลิต หรือคลิกเพื่อแบ่งสายรับผิดชอบ)
                </p>
              </div>
              <button type="button" onClick={() => setDefaultModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {/* Current Roster */}
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3.5 dark:border-emerald-800 dark:bg-emerald-950/20 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-bold text-slate-800 dark:text-white">
                    รายชื่อคณะกรรมการประจำ ({defaultRoster.length} คน)
                  </span>
                  <span className="font-mono font-bold text-emerald-600">
                    น้ำหนักหารเท่า: {defaultRoster.length > 0 ? `${(100 / defaultRoster.length).toFixed(1)}% / คน (1/${defaultRoster.length})` : '-'}
                  </span>
                </div>

                {defaultRoster.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">ยังไม่มีรายชื่อ กรุณาค้นหาและเลือกพนักงานจากรายการด้านล่าง</p>
                ) : (
                  <div className="max-h-56 overflow-y-auto divide-y divide-emerald-100 dark:divide-emerald-900/50 rounded-lg border border-emerald-200/80 bg-white dark:border-emerald-900 dark:bg-slate-900">
                    {defaultRoster.map((m) => {
                      const isAll = !m.assigned_lines?.length || m.assigned_lines.includes('ALL');
                      const scopeExpanded = editingLineScopeEmpId === m.auditor_emp_id;
                      return (
                        <div key={m.auditor_emp_id} className="p-2.5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div>
                              <span className="font-bold text-slate-800 dark:text-white">{m.auditor_name}</span>
                              <span className="ml-2 font-mono text-[11px] text-slate-400">{m.auditor_emp_id}</span>
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <select
                                value={m.assigned_role || 'AUDITOR'}
                                onChange={(e) => setDefaultRoster((prev) => prev.map((x) => x.auditor_emp_id === m.auditor_emp_id ? { ...x, assigned_role: e.target.value } : x))}
                                className="rounded border border-slate-300 bg-slate-50 px-2 py-1 text-[11px] font-semibold dark:border-slate-700 dark:bg-slate-800"
                              >
                                <option value="AUDITOR">กรรมการ</option>
                                <option value="CHAIR">ประธาน 5ส</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => setEditingLineScopeEmpId(scopeExpanded ? null : m.auditor_emp_id)}
                                className={`rounded border px-2 py-1 text-[11px] font-semibold ${
                                  isAll
                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                    : 'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                }`}
                              >
                                {isAll ? 'ทุกสายผลิต (Default)' : `เฉพาะ ${m.assigned_lines.length} สาย`}
                              </button>
                              <button
                                type="button"
                                onClick={() => setDefaultRoster((prev) => prev.filter((x) => x.auditor_emp_id !== m.auditor_emp_id))}
                                className="p-1 text-rose-500 hover:bg-rose-50 rounded"
                                title="นำออกจากรายชื่อ"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          </div>

                          {scopeExpanded && (
                            <div className="rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800/80 space-y-2">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-semibold text-slate-600 dark:text-slate-300">
                                  เลือกสายการผลิตที่รับผิดชอบ (ค่าเริ่มต้นคือตรวจได้ทุกสาย):
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleMemberScopeLine(m.auditor_emp_id, 'ALL')}
                                  className={`rounded px-2 py-0.5 font-bold ${isAll ? 'bg-emerald-600 text-white' : 'bg-white border border-slate-300 text-slate-600 dark:bg-slate-900 dark:border-slate-700'}`}
                                >
                                  ตรวจทุกสาย (ALL)
                                </button>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {linesPool.map((ln) => {
                                  const selectedLine = !isAll && m.assigned_lines.includes(ln);
                                  return (
                                    <button
                                      key={ln}
                                      type="button"
                                      onClick={() => toggleMemberScopeLine(m.auditor_emp_id, ln)}
                                      className={`rounded px-2 py-1 text-[10px] font-semibold border ${
                                        selectedLine
                                          ? 'border-indigo-500 bg-indigo-600 text-white'
                                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300'
                                      }`}
                                    >
                                      {ln}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Search & Multi-select Candidates */}
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      value={defCandSearch}
                      onChange={(e) => setDefCandSearch(e.target.value)}
                      placeholder="ค้นหารหัส, ชื่อ หรือแผนก (เช่น OFFICE, QA/QC, MT/PE)..."
                      className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-slate-50 pl-9 pr-3 text-xs dark:border-slate-600 dark:bg-slate-800"
                    />
                  </div>
                  {defCandidates.length > 0 && (
                    <button
                      type="button"
                      onClick={addAllVisibleDefaultCandidates}
                      className="min-h-[42px] rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
                    >
                      + เพิ่มทั้งหมดที่ค้นพบ ({defCandidates.length})
                    </button>
                  )}
                </div>

                <div className="max-h-52 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100 dark:border-slate-700 dark:divide-slate-800">
                  {defCandidates.map((c) => {
                    const checked = defaultRoster.some((m) => m.auditor_emp_id === c.emp_id);
                    return (
                      <button
                        key={c.emp_id}
                        type="button"
                        onClick={() => toggleDefaultCandidate(c)}
                        className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                          checked ? 'bg-emerald-50/70 dark:bg-emerald-950/30' : 'hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <div>
                          <span className="font-bold text-slate-800 dark:text-white">{c.name_th}</span>
                          <span className="ml-2 text-[11px] text-slate-400">{c.emp_id} · {c.line} ({c.position})</span>
                        </div>
                        <span className={`rounded px-2 py-0.5 text-[11px] font-bold ${checked ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-300'}`}>
                          {checked ? '✓ อยู่ในชุดประจำ' : '+ เพิ่ม'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t px-5 py-3 dark:border-slate-700">
              <button type="button" onClick={() => setDefaultModalOpen(false)} className="min-h-[44px] rounded-lg border px-4 text-xs font-semibold dark:border-slate-600">
                ยกเลิก
              </button>
              <button
                type="submit"
                disabled={savingDefault || defaultRoster.length < 1}
                className="min-h-[44px] rounded-lg bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {savingDefault ? 'กำลังบันทึก...' : `บันทึกคณะกรรมการประจำ (${defaultRoster.length} คน)`}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Single Round Builder / Override Modal (Unlimited Auditors) */}
      {roundModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form
            onSubmit={handleSaveRound}
            className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-slate-700">
              <h4 className="text-base font-bold text-slate-800 dark:text-white">
                {roundForm.round_id ? 'แก้ไขรอบตรวจ / ปรับรายชื่อกรรมการเฉพาะรอบ' : 'เปิดรอบตรวจ 5ส เฉพาะสาย (ดึงจาก Default)'}
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
                    {linesPool.map((ln) => (
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

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-800 dark:bg-emerald-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-white">
                    รายชื่อกรรมการ ({roundForm.committee.length} คน · ไม่จำกัดจำนวน)
                  </span>
                  <span className="font-mono font-bold text-emerald-600">
                    น้ำหนักหารเท่า: {roundForm.committee.length > 0 ? `${(100 / roundForm.committee.length).toFixed(1)}% / คน` : '-'}
                  </span>
                </div>
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

              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={candSearch}
                    onChange={(e) => setCandSearch(e.target.value)}
                    placeholder="ค้นหารหัสพนักงาน ชื่อ หรือสายผลิต..."
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

            <div className="flex items-center justify-between gap-2 border-t px-5 py-3 dark:border-slate-700">
              <div>
                {Number(roundForm.round_id) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setRoundModalOpen(false);
                      handleDeleteRound(roundForm);
                    }}
                    className="min-h-[40px] inline-flex items-center gap-1.5 rounded-lg border border-rose-300 bg-rose-50 px-3 text-xs font-bold text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                    ลบรอบนี้
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                <button type="button" onClick={() => setRoundModalOpen(false)} className="min-h-[44px] rounded-lg border px-4 text-xs font-semibold dark:border-slate-600">
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={savingRound || roundForm.committee.length < 1}
                  className="min-h-[44px] rounded-lg bg-emerald-600 px-5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  {savingRound ? 'กำลังบันทึก...' : 'บันทึกรอบตรวจ 5ส'}
                </button>
              </div>
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

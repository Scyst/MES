import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Lock, Unlock, Sparkles, Save, Download, Sliders, Award, BookOpen,
  CheckCircle2, BarChart2, X, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell
} from 'recharts';
import { manpowerGradingApi } from '../../../shared/services/manpowerApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import {
  calculateOverallGrade, formatMoney, GRADE_BADGE_MAP, getMonthIso, getTodayIso, exportRowsToExcel
} from '../utils/manpowerHelpers';

const GRADE_OPTIONS = ['', 'A', 'B', 'C', 'D'];
const GRADE_COLORS = { A: '#10b981', B: '#3b82f6', C: '#f59e0b', D: '#ef4444' };

export default function EmployeeGradingTab({ hcGroup, structure, isOnline }) {
  const { showToast } = useToast();

  const [periodMode, setPeriodMode] = useState('MONTH');
  const [monthVal, setMonthVal] = useState(getMonthIso);
  const [dayVal, setDayVal] = useState(getTodayIso);
  const [rangeStart, setRangeStart] = useState(() => `${getMonthIso()}-01`);
  const [rangeEnd, setRangeEnd] = useState(getTodayIso);

  const [lineFilter, setLineFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [dirtyMap, setDirtyMap] = useState({});
  const [savingGrades, setSavingGrades] = useState(false);

  // Confidential financial unlock gate (session-only React state)
  const [unlocked, setUnlocked] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [verifyingPwd, setVerifyingPwd] = useState(false);

  // Modals: Weightage, Criteria, 5S Audit, Formula Guide
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({
    hc_group: hcGroup === 'ALL' ? 'MAIN' : hcGroup,
    weight_iph: 25,
    weight_5s: 25,
    weight_attendance: 25,
    weight_learning: 25,
  });

  const [criteriaModalOpen, setCriteriaModalOpen] = useState(false);
  const [criteriaList, setCriteriaList] = useState([]);

  const [audit5sOpen, setAudit5sOpen] = useState(false);
  const [audit5sHistory, setAudit5sHistory] = useState([]);
  const [auditForm, setAuditForm] = useState({
    line: '',
    audit_date: getTodayIso(),
    score_seiri: 16,
    score_seiton: 16,
    score_seiso: 16,
    score_seiketsu: 16,
    score_shitsuke: 16,
    remarks: '',
  });

  const [guideModalOpen, setGuideModalOpen] = useState(false);

  const activePeriod = useMemo(() => {
    if (periodMode === 'DAY') return dayVal;
    if (periodMode === 'RANGE') return `${rangeStart}_${rangeEnd}`;
    return monthVal;
  }, [periodMode, monthVal, dayVal, rangeStart, rangeEnd]);

  const fetchGrading = useCallback(async () => {
    setLoading(true);
    try {
      const res = await manpowerGradingApi.getGradingData({
        period: activePeriod,
        line: lineFilter,
        hcGroup,
      });
      setRows(Array.isArray(res?.data) ? res.data : []);
      setDirtyMap({});
    } catch (err) {
      showToast(err.message || 'ไม่สามารถโหลดข้อมูลการประเมินเกรดได้', 'error');
    } finally {
      setLoading(false);
    }
  }, [activePeriod, lineFilter, hcGroup, showToast]);

  useEffect(() => {
    fetchGrading();
  }, [fetchGrading]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      String(r.emp_id || '').toLowerCase().includes(q)
      || String(r.name_th || '').toLowerCase().includes(q)
      || String(r.line || '').toLowerCase().includes(q)
    );
  }, [rows, search]);

  const gradeStats = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, UNGRADED: 0 };
    for (const r of filteredRows) {
      const g = (r.grade_overall || calculateOverallGrade(r).grade || '').toUpperCase();
      if (counts[g] !== undefined) counts[g] += 1;
      else counts.UNGRADED += 1;
    }
    return counts;
  }, [filteredRows]);

  const chartDist = useMemo(
    () => ['A', 'B', 'C', 'D'].map((g) => ({ grade: `Grade ${g}`, count: gradeStats[g], fill: GRADE_COLORS[g] })),
    [gradeStats]
  );

  const updateRowDimension = (empId, field, value) => {
    setRows((prev) => prev.map((r) => {
      if (r.emp_id !== empId) return r;
      const updated = { ...r, [field]: value };
      if (field !== 'notes') {
        const calc = calculateOverallGrade(updated);
        updated.grade_overall = calc.grade || updated.grade_overall;
        updated.grade = updated.grade_overall;
      }
      setDirtyMap((dm) => ({ ...dm, [empId]: updated }));
      return updated;
    }));
  };

  const handleAutoGradeAll = () => {
    const nextDirty = {};
    setRows((prev) => prev.map((r) => {
      const next = {
        ...r,
        grade_iph: r.system_grade_iph || r.grade_iph || 'C',
        grade_5s: r.system_grade_5s || r.grade_5s || 'B',
        grade_attendance: r.system_grade_attendance && r.system_grade_attendance !== 'N/A'
          ? r.system_grade_attendance
          : (r.grade_attendance || 'B'),
        grade_learning: r.system_grade_learning || r.grade_learning || 'C',
      };
      const calc = calculateOverallGrade(next);
      next.grade_overall = calc.grade || 'C';
      next.grade = next.grade_overall;
      nextDirty[r.emp_id] = next;
      return next;
    }));
    setDirtyMap((dm) => ({ ...dm, ...nextDirty }));
    showToast(`คำนวณเกรดอัตโนมัติตามเกณฑ์ 4 มิติครบ ${Object.keys(nextDirty).length} คนแล้ว (กดบันทึกเพื่อยืนยัน)`, 'info');
  };

  const handleSaveGrades = async () => {
    if (!isOnline) return;
    const toSave = Object.values(dirtyMap);
    if (!toSave.length) {
      showToast('ยังไม่มีรายการที่เปลี่ยนแปลง', 'info');
      return;
    }
    setSavingGrades(true);
    try {
      const res = await manpowerGradingApi.saveGrades(activePeriod, toSave.map((r) => ({
        emp_id: r.emp_id,
        grade: r.grade_overall || r.grade || 'C',
        grade_iph: r.grade_iph || '',
        grade_5s: r.grade_5s || '',
        grade_attendance: r.grade_attendance || '',
        grade_learning: r.grade_learning || '',
        grade_overall: r.grade_overall || r.grade || 'C',
        notes: r.notes || '',
      })));
      showToast(res?.message || 'บันทึกเกรดพนักงานเรียบร้อยแล้ว', 'success');
      setDirtyMap({});
    } catch (err) {
      showToast(err.message || 'บันทึกเกรดไม่สำเร็จ', 'error');
    } finally {
      setSavingGrades(false);
    }
  };

  const handleVerifyUnlock = async (e) => {
    e.preventDefault();
    if (!passwordInput) return;
    setVerifyingPwd(true);
    try {
      await manpowerGradingApi.verifyPassword(passwordInput);
      setUnlocked(true);
      setUnlockModalOpen(false);
      setPasswordInput('');
      showToast('ปลดล็อกข้อมูลค่าแรงและรายได้ต่อหัวเรียบร้อย', 'success');
    } catch (err) {
      showToast(err.message || 'รหัสผ่านไม่ถูกต้อง', 'error');
    } finally {
      setVerifyingPwd(false);
    }
  };

  const handleSaveWeightage = async (e) => {
    e.preventDefault();
    const sum = Number(weightForm.weight_iph) + Number(weightForm.weight_5s)
      + Number(weightForm.weight_attendance) + Number(weightForm.weight_learning);
    if (sum !== 100) {
      showToast('ผลรวมน้ำหนักทั้ง 4 มิติต้องเท่ากับ 100%', 'warning');
      return;
    }
    try {
      await manpowerGradingApi.saveWeightage(weightForm);
      showToast('บันทึกสัดส่วนน้ำหนักเรียบร้อยแล้ว', 'success');
      setWeightModalOpen(false);
      fetchGrading();
    } catch (err) {
      showToast(err.message || 'บันทึกสัดส่วนน้ำหนักไม่สำเร็จ', 'error');
    }
  };

  const openCriteriaModal = async () => {
    setCriteriaModalOpen(true);
    try {
      const res = await manpowerGradingApi.getCriteria();
      const existing = Array.isArray(res?.data?.criteria) ? res.data.criteria : [];
      const activeLines = Array.isArray(res?.data?.active_lines) ? res.data.active_lines : [];
      const map = new Map(existing.map((c) => [c.line, c]));
      for (const ln of activeLines) {
        if (!map.has(ln)) {
          map.set(ln, {
            line: ln,
            threshold_a: 2.0,
            threshold_b: 1.5,
            threshold_c: 1.0,
            att_max_late_a: 0,
            att_max_late_b: 1,
            att_max_late_c: 2,
          });
        }
      }
      setCriteriaList(Array.from(map.values()));
    } catch (err) {
      showToast(err.message || 'โหลดเกณฑ์การประเมินไม่สำเร็จ', 'error');
    }
  };

  const handleSaveCriteria = async () => {
    try {
      await manpowerGradingApi.saveCriteria(criteriaList);
      showToast('บันทึกเกณฑ์การตัดเกรดรายสายเรียบร้อยแล้ว', 'success');
      setCriteriaModalOpen(false);
      fetchGrading();
    } catch (err) {
      showToast(err.message || 'บันทึกเกณฑ์ไม่สำเร็จ', 'error');
    }
  };

  const open5sModal = async () => {
    setAudit5sOpen(true);
    setAuditForm((f) => ({ ...f, line: structure?.lines?.[0] || '' }));
    try {
      const res = await manpowerGradingApi.get5SAudits('ALL');
      setAudit5sHistory(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      showToast(err.message || 'โหลดประวัติผลตรวจ 5ส ไม่สำเร็จ', 'error');
    }
  };

  const handleSave5s = async (e) => {
    e.preventDefault();
    try {
      await manpowerGradingApi.save5SAudit(auditForm);
      showToast('บันทึกผลตรวจ 5ส เรียบร้อยแล้ว', 'success');
      const res = await manpowerGradingApi.get5SAudits('ALL');
      setAudit5sHistory(Array.isArray(res?.data) ? res.data : []);
      fetchGrading();
    } catch (err) {
      showToast(err.message || 'บันทึกผลตรวจ 5ส ไม่สำเร็จ', 'error');
    }
  };

  const handleExport = () => {
    if (!filteredRows.length) return;
    const data = filteredRows.map((r) => ({
      'Emp ID': r.emp_id,
      Name: r.name_th,
      Line: r.line,
      Position: r.position,
      ...(unlocked ? {
        'Income/Head': r.income_per_head,
        'Total Wage': r.total_wage,
        Ratio: r.ratio,
      } : {}),
      'IPH Grade': r.grade_iph || r.system_grade_iph || '',
      '5S Grade': r.grade_5s || r.system_grade_5s || '',
      'Att Grade': r.grade_attendance || r.system_grade_attendance || '',
      'Learn Grade': r.grade_learning || r.system_grade_learning || '',
      'Overall Grade': r.grade_overall || calculateOverallGrade(r).grade,
      Notes: r.notes || '',
    }));
    exportRowsToExcel(data, 'Grading_4D', `Employee_Grading_4D_${activePeriod}.xlsx`);
    showToast('ส่งออกไฟล์ Excel เกรดพนักงานสำเร็จ', 'success');
  };

  const dirtyCount = Object.keys(dirtyMap).length;

  return (
    <div className="space-y-4">
      {/* Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={periodMode}
            onChange={(e) => setPeriodMode(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="MONTH">รายเดือน (Month)</option>
            <option value="DAY">รายวัน (Day)</option>
            <option value="RANGE">ช่วงเวลา (Range)</option>
          </select>

          {periodMode === 'MONTH' && (
            <input
              type="month"
              value={monthVal}
              onChange={(e) => setMonthVal(e.target.value)}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          )}
          {periodMode === 'DAY' && (
            <input
              type="date"
              value={dayVal}
              onChange={(e) => setDayVal(e.target.value)}
              className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          )}
          {periodMode === 'RANGE' && (
            <>
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <span className="text-xs text-slate-500">ถึง</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </>
          )}

          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">ทุกสายผลิต</option>
            {(structure?.lines || []).map((ln) => <option key={ln} value={ln}>{ln}</option>)}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหาพนักงาน..."
            className="min-h-[44px] w-44 rounded-lg border border-slate-300 bg-slate-50 px-3 text-sm dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!unlocked ? (
            <button
              type="button"
              onClick={() => setUnlockModalOpen(true)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-50 px-3 text-xs font-bold text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300"
            >
              <Lock className="h-4 w-4" />
              ปลดล็อกข้อมูลค่าแรง
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setUnlocked(false)}
              className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-emerald-400 bg-emerald-50 px-3 text-xs font-bold text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Unlock className="h-4 w-4" />
              แสดงข้อมูลค่าแรง (ปลดล็อกแล้ว)
            </button>
          )}

          <button
            type="button"
            onClick={open5sModal}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            บันทึกผลตรวจ 5ส
          </button>

          <button
            type="button"
            onClick={() => setWeightModalOpen(true)}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <Sliders className="h-4 w-4 text-indigo-500" />
            น้ำหนัก 4 มิติ
          </button>

          <button
            type="button"
            onClick={openCriteriaModal}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <BarChart2 className="h-4 w-4 text-violet-500" />
            เกณฑ์ Ratio
          </button>

          <button
            type="button"
            onClick={() => setGuideModalOpen(true)}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
          >
            <BookOpen className="h-4 w-4 text-sky-500" />
            สูตรคำนวณ
          </button>

          <button
            type="button"
            onClick={handleAutoGradeAll}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 text-xs font-semibold text-white hover:bg-violet-700"
          >
            <Sparkles className="h-4 w-4" />
            คำนวณเกรด Auto
          </button>

          <button
            type="button"
            disabled={!isOnline || savingGrades || dirtyCount === 0}
            onClick={handleSaveGrades}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            {savingGrades ? 'กำลังบันทึก...' : `บันทึก (${dirtyCount})`}
          </button>

          <button
            type="button"
            onClick={handleExport}
            className="min-h-[44px] inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
          >
            <Download className="h-4 w-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Summary + Distribution Bar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-2">
          {['A', 'B', 'C', 'D'].map((g) => (
            <div key={g} className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
              <div className="text-xs font-semibold text-slate-500">GRADE {g}</div>
              <div className="mt-1.5 text-2xl font-bold" style={{ color: GRADE_COLORS[g] }}>{gradeStats[g]} คน</div>
              <div className="text-[11px] text-slate-400">
                {filteredRows.length > 0 ? `${((gradeStats[g] / filteredRows.length) * 100).toFixed(1)}%` : '0%'}
              </div>
            </div>
          ))}
        </div>

        <div className="min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="h-28 w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <BarChart data={chartDist} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="count" name="พนักงาน">
                  {chartDist.map((entry, idx) => <Cell key={idx} fill={entry.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Main 4D Grading Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Award className="h-4 w-4 text-indigo-500" />
            การประเมินเกรดพนักงาน 4 มิติ (งวด: {activePeriod}) — {filteredRows.length} คน
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1060px] text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-bold uppercase text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">พนักงาน / สายผลิต</th>
                <th className="px-3 py-3 text-right">รายได้/หัว (฿)</th>
                <th className="px-3 py-3 text-right">ค่าแรงรวม (฿)</th>
                <th className="px-3 py-3 text-right">Ratio</th>
                <th className="px-2 py-3 text-center">1. IPH Ratio</th>
                <th className="px-2 py-3 text-center">2. 5S Activity</th>
                <th className="px-2 py-3 text-center">3. Attendance</th>
                <th className="px-2 py-3 text-center">4. Learning</th>
                <th className="px-3 py-3 text-center">GPA / เกรดรวม</th>
                <th className="px-3 py-3">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {filteredRows.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-400">ไม่พบข้อมูลพนักงานในช่วงเวลานี้</td></tr>
              ) : (
                filteredRows.map((r) => {
                  const calc = calculateOverallGrade(r);
                  const ov = (r.grade_overall || calc.grade || '').toUpperCase();
                  const ovBadge = GRADE_BADGE_MAP[ov] || 'bg-slate-100 text-slate-500 border-slate-200';
                  return (
                    <tr key={r.emp_id} className={dirtyMap[r.emp_id] ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'}>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-800 dark:text-white">{r.name_th}</div>
                        <div className="text-[11px] text-slate-500">{r.emp_id} • {r.line} ({r.position})</div>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {unlocked ? formatMoney(r.income_per_head, 2) : <span className="text-slate-400">•••••</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono">
                        {unlocked ? formatMoney(r.total_wage, 2) : <span className="text-slate-400">•••••</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {unlocked ? Number(r.ratio || 0).toFixed(2) : <span className="text-slate-400">•••</span>}
                      </td>
                      {[
                        { field: 'grade_iph', sys: r.system_grade_iph, hint: `Sys: ${r.system_grade_iph || '-'}` },
                        { field: 'grade_5s', sys: r.system_grade_5s, hint: `5S: ${r.system_grade_5s || '-'}` },
                        { field: 'grade_attendance', sys: r.system_grade_attendance, hint: `Late ${r.late_days}/Abs ${r.absent_days}` },
                        { field: 'grade_learning', sys: r.system_grade_learning, hint: `${r.skill_count}/${r.learning_target_a} (${r.system_grade_learning})` },
                      ].map((dim) => (
                        <td key={dim.field} className="px-2 py-2 text-center">
                          <select
                            value={r[dim.field] || ''}
                            onChange={(e) => updateRowDimension(r.emp_id, dim.field, e.target.value)}
                            className="min-h-[36px] rounded border border-slate-300 bg-white px-2 text-xs font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          >
                            {GRADE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt || '-'}</option>
                            ))}
                          </select>
                          <div className="mt-0.5 text-[10px] text-slate-400">{dim.hint}</div>
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center">
                        <span className={`inline-flex min-w-[44px] items-center justify-center rounded-md border px-2 py-1 font-mono text-xs font-extrabold ${ovBadge}`}>
                          {ov || '-'}
                        </span>
                        <div className="mt-0.5 text-[10px] font-mono text-slate-400">
                          {calc.gpa > 0 ? `${calc.gpa.toFixed(2)}` : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="text"
                          value={r.notes || ''}
                          onChange={(e) => updateRowDimension(r.emp_id, 'notes', e.target.value)}
                          placeholder="บันทึกเพิ่มเติม..."
                          className="min-h-[36px] w-36 rounded border border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Password Unlock Modal */}
      {unlockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form onSubmit={handleVerifyUnlock} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-white">
                <Lock className="h-5 w-5 text-amber-500" />
                ยืนยันตัวตนเพื่อดูข้อมูลค่าแรง
              </h4>
              <button type="button" onClick={() => setUnlockModalOpen(false)} className="p-1 text-slate-400">
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500">ข้อมูลรายได้ต่อหัวและอัตราค่าแรงเป็นความลับ กรุณากรอกรหัสผ่านบัญชีของคุณ</p>
            <input
              type="password"
              required
              autoFocus
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="กรอกรหัสผ่านผู้ใช้งาน..."
              className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setUnlockModalOpen(false)} className="min-h-[44px] rounded-lg border px-4 text-sm font-semibold dark:border-slate-600">
                ยกเลิก
              </button>
              <button type="submit" disabled={verifyingPwd} className="min-h-[44px] rounded-lg bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700">
                {verifyingPwd ? 'กำลังตรวจสอบ...' : 'ปลดล็อก'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Weightage Settings Modal */}
      {weightModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <form onSubmit={handleSaveWeightage} className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h4 className="text-base font-bold">กำหนดน้ำหนัก 4 มิติ (รวมต้องเท่ากับ 100%)</h4>
              <button type="button" onClick={() => setWeightModalOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold">กลุ่มทีม (HC Group)</label>
              <select
                value={weightForm.hc_group}
                onChange={(e) => setWeightForm((w) => ({ ...w, hc_group: e.target.value }))}
                className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              >
                <option value="MAIN">MAIN</option>
                <option value="TEAM 1">TEAM 1</option>
                <option value="EXCLUDE">EXCLUDE</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'weight_iph', label: '1. IPH Ratio (%)' },
                { key: 'weight_5s', label: '2. 5S Audit (%)' },
                { key: 'weight_attendance', label: '3. Attendance (%)' },
                { key: 'weight_learning', label: '4. Learning (%)' },
              ].map((item) => (
                <div key={item.key}>
                  <label className="mb-1 block text-xs font-semibold">{item.label}</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={weightForm[item.key]}
                    onChange={(e) => setWeightForm((w) => ({ ...w, [item.key]: Number(e.target.value) }))}
                    className="min-h-[44px] w-full rounded-lg border border-slate-300 px-3 text-sm font-mono dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                  />
                </div>
              ))}
            </div>
            <div className="text-right text-xs font-bold">
              ผลรวมปัจจุบัน:{' '}
              <span className={weightForm.weight_iph + weightForm.weight_5s + weightForm.weight_attendance + weightForm.weight_learning === 100 ? 'text-emerald-600' : 'text-rose-600'}>
                {weightForm.weight_iph + weightForm.weight_5s + weightForm.weight_attendance + weightForm.weight_learning}%
              </span>
            </div>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setWeightModalOpen(false)} className="min-h-[44px] rounded-lg border px-4 text-sm font-semibold dark:border-slate-600">ยกเลิก</button>
              <button type="submit" disabled={!isOnline} className="min-h-[44px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">บันทึกน้ำหนัก</button>
            </div>
          </form>
        </div>
      )}

      {/* Criteria Modal */}
      {criteriaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-slate-700">
              <h4 className="text-base font-bold">ตั้งค่าเกณฑ์ตัดเกรด Ratio และ Attendance รายสายผลิต</h4>
              <button type="button" onClick={() => setCriteriaModalOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">สายผลิต</th>
                    <th className="px-2 py-2">Ratio ≥ A</th>
                    <th className="px-2 py-2">Ratio ≥ B</th>
                    <th className="px-2 py-2">Ratio ≥ C</th>
                    <th className="px-2 py-2">Late/Abs ≤ A</th>
                    <th className="px-2 py-2">Late/Abs ≤ B</th>
                    <th className="px-2 py-2">Late/Abs ≤ C</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {criteriaList.map((c, idx) => (
                    <tr key={c.line}>
                      <td className="px-3 py-2 font-bold">{c.line}</td>
                      {['threshold_a', 'threshold_b', 'threshold_c', 'att_max_late_a', 'att_max_late_b', 'att_max_late_c'].map((k) => (
                        <td key={k} className="px-2 py-1.5">
                          <input
                            type="number"
                            step={k.startsWith('threshold') ? '0.1' : '1'}
                            value={c[k] ?? 0}
                            onChange={(e) => setCriteriaList((prev) => prev.map((x, i) => i === idx ? { ...x, [k]: Number(e.target.value) } : x))}
                            className="min-h-[36px] w-20 rounded border border-slate-300 px-2 font-mono text-xs dark:border-slate-600 dark:bg-slate-800"
                          />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex justify-end gap-2 border-t px-5 py-3 dark:border-slate-700">
              <button type="button" onClick={() => setCriteriaModalOpen(false)} className="min-h-[44px] rounded-lg border px-4 text-sm font-semibold dark:border-slate-600">ปิด</button>
              <button type="button" disabled={!isOnline} onClick={handleSaveCriteria} className="min-h-[44px] rounded-lg bg-indigo-600 px-5 text-sm font-semibold text-white hover:bg-indigo-700">บันทึกเกณฑ์</button>
            </div>
          </div>
        </div>
      )}

      {/* 5S Audit Modal */}
      {audit5sOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-slate-700">
              <h4 className="text-base font-bold">บันทึกผลตรวจประเมินกิจกรรม 5ส (5S Audit & History)</h4>
              <button type="button" onClick={() => setAudit5sOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <form onSubmit={handleSave5s} className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold">สายการผลิต</label>
                    <select
                      required
                      value={auditForm.line}
                      onChange={(e) => setAuditForm((f) => ({ ...f, line: e.target.value }))}
                      className="min-h-[40px] w-full rounded border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                    >
                      {(structure?.lines || []).map((ln) => <option key={ln} value={ln}>{ln}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold">วันที่ตรวจ</label>
                    <input
                      type="date"
                      value={auditForm.audit_date}
                      onChange={(e) => setAuditForm((f) => ({ ...f, audit_date: e.target.value }))}
                      className="min-h-[40px] w-full rounded border border-slate-300 bg-white px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { key: 'score_seiri', label: 'สะสาง (20)' },
                    { key: 'score_seiton', label: 'สะดวก (20)' },
                    { key: 'score_seiso', label: 'สะอาด (20)' },
                    { key: 'score_seiketsu', label: 'สุขลักษณะ (20)' },
                    { key: 'score_shitsuke', label: 'สร้างนิสัย (20)' },
                  ].map((s) => (
                    <div key={s.key}>
                      <label className="mb-1 block text-[11px] font-semibold">{s.label}</label>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        value={auditForm[s.key]}
                        onChange={(e) => setAuditForm((f) => ({ ...f, [s.key]: Number(e.target.value) }))}
                        className="min-h-[40px] w-full rounded border border-slate-300 bg-white px-2 text-center font-mono text-sm dark:border-slate-600 dark:bg-slate-900"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <input
                    type="text"
                    value={auditForm.remarks}
                    onChange={(e) => setAuditForm((f) => ({ ...f, remarks: e.target.value }))}
                    placeholder="ข้อเสนอแนะ / จุดที่ต้องปรับปรุง..."
                    className="min-h-[40px] flex-1 rounded border border-slate-300 bg-white px-3 text-xs dark:border-slate-600 dark:bg-slate-900"
                  />
                  <button type="submit" disabled={!isOnline} className="min-h-[40px] rounded-lg bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700">
                    บันทึกผล 5ส ({auditForm.score_seiri + auditForm.score_seiton + auditForm.score_seiso + auditForm.score_seiketsu + auditForm.score_shitsuke}/100)
                  </button>
                </div>
              </form>

              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 font-bold dark:bg-slate-800">
                  <tr>
                    <th className="px-3 py-2">วันที่</th>
                    <th className="px-3 py-2">สายผลิต</th>
                    <th className="px-3 py-2 text-right">คะแนนรวม</th>
                    <th className="px-3 py-2 text-center">เกรด 5ส</th>
                    <th className="px-3 py-2">ผู้ตรวจ</th>
                    <th className="px-3 py-2">หมายเหตุ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {audit5sHistory.map((a) => (
                    <tr key={a.audit_id}>
                      <td className="px-3 py-2 font-mono">{a.audit_date}</td>
                      <td className="px-3 py-2 font-bold">{a.line}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold">{a.total_score}/100</td>
                      <td className="px-3 py-2 text-center font-bold">{a.grade}</td>
                      <td className="px-3 py-2">{a.auditor_emp_id}</td>
                      <td className="px-3 py-2 text-slate-500">{a.remarks || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Formula Guide Modal */}
      {guideModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-700 dark:bg-slate-900 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b pb-3 dark:border-slate-700">
              <h4 className="text-base font-bold">โครงสร้างสูตรคำนวณเกรด 4 มิติ (4D Grading Formula)</h4>
              <button type="button" onClick={() => setGuideModalOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-2 text-slate-600 dark:text-slate-300 leading-relaxed">
              <p><strong>1. IPH Ratio (Productivity):</strong> คำนวณจาก (ผลผลิตรวม × ต้นทุน DL+OH มาตรฐาน ÷ จำนวนผู้ปฏิบัติงานต่อ Transaction) ÷ ค่าแรงจริง (ปกติ+OT) เทียบกับ Threshold ประจำสาย</p>
              <p><strong>2. 5S Activity Audit:</strong> ดึงคะแนนล่าสุดจากผลตรวจ 5ส ประจำสายการผลิตในรอบเดือนนั้น (คะแนนเต็ม 100)</p>
              <p><strong>3. Discipline / Attendance:</strong> นับจำนวนวันมาสาย + ขาดงาน เทียบกับ Max Allowed Late/Absent ของสายผลิต</p>
              <p><strong>4. Learning & Skill Matrix:</strong> ใช้ค่าสูงสุดระหว่างทักษะ Level ≥ 2 หรือหลักสูตร E-Learning ที่สอบผ่าน เทียบตามระดับตำแหน่ง (Tier 1/2/3)</p>
              <p><strong>5. Overall GPA Score:</strong> A = 4.0, B = 3.0, C = 2.0, D = 1.0 ถ่วงน้ำหนักตาม Weight (%) ของกลุ่มทีม → A (≥3.5), B (≥2.5), C (≥1.5), D (&lt;1.5)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

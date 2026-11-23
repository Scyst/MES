import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lock, Unlock, Sparkles, Save, Download, Sliders, Award, BookOpen,
  CheckCircle2, BarChart2, X, RefreshCw, Users, GraduationCap, Printer,
  AlertTriangle, Settings, ChevronDown, Eye, EyeOff, ArrowUpDown, ArrowUp, ArrowDown,
  TrendingUp, Star, Coins, Wallet
} from 'lucide-react';
import { manpowerGradingApi } from '../../../shared/services/manpowerApi';
import { useToast } from '../../../shared/contexts/FeedbackContext';
import {
  calculateOverallGrade, formatMoney, GRADE_BADGE_MAP, getMonthIso, getTodayIso, exportRowsToExcel
} from '../utils/manpowerHelpers';
import CurriculumRulesModal from './CurriculumRulesModal';
import GradingAnalyticsModal from './GradingAnalyticsModal';

const GRADE_OPTIONS = ['', 'A', 'B', 'C', 'D'];
const GRADE_ORDER = { A: 4, B: 3, C: 2, D: 1, '': 0 };

export default function EmployeeGradingTab({
  hcGroup,
  onChangeHcGroup,
  hcOptions = ['TEAM 1', 'ALL', 'EXCLUDE'],
  structure,
  isOnline,
  onChangeGradingView,
  refreshSignal = 0,
  onRefresh,
}) {
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [periodMode, setPeriodMode] = useState('MONTH');
  const [monthVal, setMonthVal] = useState(getMonthIso);
  const [dayVal, setDayVal] = useState(getTodayIso);
  const [rangeStart, setRangeStart] = useState(() => `${getMonthIso()}-01`);
  const [rangeEnd, setRangeEnd] = useState(getTodayIso);

  const [lineFilter, setLineFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [dirtyMap, setDirtyMap] = useState({});
  const [savingGrades, setSavingGrades] = useState(false);

  // Sorting state
  const [sortCfg, setSortCfg] = useState({ col: 'line', dir: 'asc' });

  // Dropdown menus
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const settingsRef = useRef(null);
  const exportRef = useRef(null);

  // Confidential financial unlock gate (session-only React state)
  const [unlocked, setUnlocked] = useState(false);
  const [unlockModalOpen, setUnlockModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [verifyingPwd, setVerifyingPwd] = useState(false);

  // Modals: Analytics, Weightage, Criteria, Legacy 5S Quick History, Curriculum Rules, Formula Guide
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [weightModalOpen, setWeightModalOpen] = useState(false);
  const [curriculumModalOpen, setCurriculumModalOpen] = useState(false);
  const [weightForm, setWeightForm] = useState({
    hc_group: hcGroup === 'ALL' ? 'TEAM 1' : hcGroup,
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

  useEffect(() => {
    const onDocClick = (e) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target)) {
        setSettingsMenuOpen(false);
      }
      if (exportRef.current && !exportRef.current.contains(e.target)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

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
  }, [fetchGrading, refreshSignal]);

  const filteredAndSortedRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? rows.filter((r) =>
          String(r.emp_id || '').toLowerCase().includes(q)
          || String(r.name_th || '').toLowerCase().includes(q)
          || String(r.line || '').toLowerCase().includes(q)
          || String(r.position || '').toLowerCase().includes(q)
        )
      : [...rows];

    const { col, dir } = sortCfg;
    const factor = dir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      if (col === 'income_per_head' || col === 'total_wage' || col === 'ratio') {
        return (Number(a[col] || 0) - Number(b[col] || 0)) * factor;
      }
      if (col === 'grade_iph' || col === 'grade_5s' || col === 'grade_attendance' || col === 'grade_learning' || col === 'grade_overall') {
        const ga = col === 'grade_overall' ? (a.grade_overall || calculateOverallGrade(a).grade || '') : (a[col] || '');
        const gb = col === 'grade_overall' ? (b.grade_overall || calculateOverallGrade(b).grade || '') : (b[col] || '');
        return ((GRADE_ORDER[String(ga).toUpperCase()] || 0) - (GRADE_ORDER[String(gb).toUpperCase()] || 0)) * factor;
      }
      return String(a[col] || '').localeCompare(String(b[col] || ''), 'th') * factor;
    });
    return list;
  }, [rows, search, sortCfg]);

  const toggleSort = (col) => {
    setSortCfg((prev) => ({
      col,
      dir: prev.col === col && prev.dir === 'asc' ? 'desc' : 'asc',
    }));
  };

  const renderSortIcon = (col) => {
    if (sortCfg.col !== col) return <ArrowUpDown className="ml-1 inline h-3 w-3 opacity-35" />;
    return sortCfg.dir === 'asc'
      ? <ArrowUp className="ml-1 inline h-3 w-3 text-indigo-600" />
      : <ArrowDown className="ml-1 inline h-3 w-3 text-indigo-600" />;
  };

  const kpiSummary = useMemo(() => {
    const counts = { A: 0, B: 0, C: 0, D: 0, UNGRADED: 0 };
    let totalIncome = 0;
    let totalWage = 0;
    for (const r of filteredAndSortedRows) {
      const g = (r.grade_overall || calculateOverallGrade(r).grade || '').toUpperCase();
      if (counts[g] !== undefined) counts[g] += 1;
      else counts.UNGRADED += 1;
      totalIncome += Number(r.income_per_head || 0);
      totalWage += Number(r.total_wage || 0);
    }
    const cnt = filteredAndSortedRows.length;
    return {
      counts,
      totalEmployees: cnt,
      totalIncome,
      totalWage,
      avgIncome: cnt > 0 ? totalIncome / cnt : 0,
      avgRatio: totalWage > 0 ? totalIncome / totalWage : 0,
    };
  }, [filteredAndSortedRows]);

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
    let missingCount = 0;
    setRows((prev) => prev.map((r) => {
      const auto5s = r.system_grade_5s && r.system_grade_5s !== 'N/A'
        ? r.system_grade_5s
        : (r.grade_5s || '');
      const autoAtt = r.system_grade_attendance && r.system_grade_attendance !== 'N/A'
        ? r.system_grade_attendance
        : (r.grade_attendance || '');
      if (auto5s === '' || autoAtt === '') {
        missingCount++;
      }
      const next = {
        ...r,
        grade_iph: r.system_grade_iph || r.grade_iph || '',
        grade_5s: auto5s,
        grade_attendance: autoAtt,
        grade_learning: r.system_grade_learning || r.grade_learning || '',
      };
      const calc = calculateOverallGrade(next);
      next.grade_overall = calc.grade || r.grade_overall || '';
      next.grade = next.grade_overall;
      nextDirty[r.emp_id] = next;
      return next;
    }));
    setDirtyMap((dm) => ({ ...dm, ...nextDirty }));
    const note = missingCount > 0 ? ` (พบ ${missingCount} คนที่ยังไม่มีผลตรวจ 5ส/เกณฑ์มาสาย จึงเว้นว่างไว้แทนการเดา)` : '';
    showToast(`คำนวณเกรดอัตโนมัติครบ ${Object.keys(nextDirty).length} คนแล้ว${note}`, 'info');
  };

  const handleSaveGrades = async () => {
    if (!isOnline) return;
    if (periodMode === 'RANGE') {
      showToast('ไม่สามารถบันทึกเกรดในโหมดช่วงเวลา (RANGE) ได้ กรุณาเลือกโหมดรายเดือน', 'warning');
      return;
    }
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

  const toggleFinancialVisibility = () => {
    if (unlocked) {
      setUnlocked(false);
    } else {
      setUnlockModalOpen(true);
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

  const buildExportRows = () => filteredAndSortedRows.map((r) => ({
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
    '5S Score': r.score_5s ?? '',
    'Att Grade': r.grade_attendance || r.system_grade_attendance || '',
    'Learn Grade': r.grade_learning || r.system_grade_learning || '',
    Credits: r.skill_count ?? 0,
    Mandatory: r.learning_mandatory_total > 0 ? `${r.learning_mandatory_passed}/${r.learning_mandatory_total}` : '-',
    'Overall Grade': r.grade_overall || calculateOverallGrade(r).grade,
    Notes: r.notes || '',
  }));

  const handleExportExcel = () => {
    setExportMenuOpen(false);
    if (!filteredAndSortedRows.length) return;
    exportRowsToExcel(buildExportRows(), 'Grading_4D', `Employee_Grading_4D_${activePeriod}.xlsx`);
    showToast('ส่งออกไฟล์ Excel เกรดพนักงานสำเร็จ', 'success');
  };

  const handleExportCsv = () => {
    setExportMenuOpen(false);
    const data = buildExportRows();
    if (!data.length) return;
    const headers = Object.keys(data[0]);
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csvLines = [
      headers.map(esc).join(','),
      ...data.map((row) => headers.map((h) => esc(row[h])).join(',')),
    ];
    const blob = new Blob([`\uFEFF${csvLines.join('\r\n')}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Employee_Grading_4D_${activePeriod}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    showToast('ส่งออกไฟล์ CSV เกรดพนักงานสำเร็จ', 'success');
  };

  const handlePrintPdfSummary = () => {
    setExportMenuOpen(false);
    if (!filteredAndSortedRows.length) {
      showToast('ไม่มีข้อมูลสำหรับพิมพ์รายงาน', 'warning');
      return;
    }
    const win = window.open('', '_blank', 'width=1100,height=800');
    if (!win) {
      showToast('เบราว์เซอร์บล็อกหน้าต่างป๊อปอัป กรุณาอนุญาต Popup เพื่อพิมพ์ PDF', 'warning');
      return;
    }
    const safe = (v) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const bodyRows = filteredAndSortedRows.map((r, i) => {
      const ov = r.grade_overall || calculateOverallGrade(r).grade || '-';
      return `<tr>
        <td>${i + 1}</td>
        <td>${safe(r.emp_id)}</td>
        <td>${safe(r.name_th)}</td>
        <td>${safe(r.line)}</td>
        <td>${unlocked ? Number(r.ratio || 0).toFixed(2) + 'x' : '•••'}</td>
        <td style="text-align:center">${safe(r.grade_iph || r.system_grade_iph || '-')}</td>
        <td style="text-align:center">${safe(r.grade_5s || r.system_grade_5s || '-')}</td>
        <td style="text-align:center">${safe(r.grade_attendance || r.system_grade_attendance || '-')}</td>
        <td style="text-align:center">${safe(r.grade_learning || r.system_grade_learning || '-')}</td>
        <td style="text-align:center;font-weight:bold">${safe(ov)}</td>
      </tr>`;
    }).join('');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>4D Grading Summary (${safe(activePeriod)})</title>
      <style>body{font-family:sans-serif;padding:24px;color:#0f172a}h2{margin:0 0 6px}p{margin:0 0 14px;color:#475569;font-size:12px}
      table{width:100%;border-collapse:collapse;font-size:12px}th,td{border:1px solid #cbd5e1;padding:6px 8px}th{background:#f1f5f9}</style>
      </head><body>
      <h2>รายงานสรุปผลการประเมินพนักงาน 4 มิติ (4D Employee Grading)</h2>
      <p>งวดประเมิน: ${safe(activePeriod)} · สายการผลิต: ${safe(lineFilter)} · กลุ่ม: ${safe(hcGroup)} · จำนวน ${filteredAndSortedRows.length} คน</p>
      <table><thead><tr><th>#</th><th>รหัส</th><th>ชื่อ-สกุล</th><th>สายผลิต</th><th>Ratio</th><th>IPH</th><th>5S</th><th>Attd</th><th>Learn</th><th>รวม</th></tr></thead>
      <tbody>${bodyRows}</tbody></table>
      <script>window.onload=function(){window.print();}</script></body></html>`);
    win.document.close();
  };

  const dirtyCount = Object.keys(dirtyMap).length;

  return (
    <div className="space-y-3 pb-20">
      {/* Single-Row Slim Workspace Header + Filters + Grouped Actions */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 pr-2 border-r border-slate-200 dark:border-slate-700">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Star className="h-4 w-4" />
            </div>
            <span className="text-sm font-extrabold text-slate-800 dark:text-white">ประเมินเกรด 4D</span>
          </div>

          {onChangeGradingView && (
            <div className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-slate-900">
              <button
                type="button"
                className="min-h-[34px] inline-flex items-center gap-1 rounded-md bg-white px-2.5 text-xs font-bold text-indigo-700 shadow-2xs dark:bg-slate-800 dark:text-indigo-300"
              >
                <Star className="h-3.5 w-3.5" /> ตารางเกรด
              </button>
              <button
                type="button"
                onClick={() => onChangeGradingView('trends')}
                className="min-h-[34px] inline-flex items-center gap-1 rounded-md px-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 dark:text-slate-300"
              >
                <TrendingUp className="h-3.5 w-3.5" /> แนวโน้ม
              </button>
            </div>
          )}

          <select
            value={periodMode}
            onChange={(e) => setPeriodMode(e.target.value)}
            className="min-h-[36px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="MONTH">รายเดือน</option>
            <option value="DAY">รายวัน</option>
            <option value="RANGE">ช่วงเวลา</option>
          </select>

          {periodMode === 'MONTH' && (
            <input
              type="month"
              value={monthVal}
              onChange={(e) => setMonthVal(e.target.value)}
              className="min-h-[36px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          )}
          {periodMode === 'DAY' && (
            <input
              type="date"
              value={dayVal}
              onChange={(e) => setDayVal(e.target.value)}
              className="min-h-[36px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            />
          )}
          {periodMode === 'RANGE' && (
            <div className="flex items-center gap-1">
              <input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="min-h-[36px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
              <span className="text-[11px] text-slate-400">-</span>
              <input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="min-h-[36px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
              />
            </div>
          )}

          {onChangeHcGroup && (
            <select
              value={hcGroup}
              onChange={(e) => onChangeHcGroup(e.target.value)}
              className="min-h-[36px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs font-semibold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
            >
              {hcOptions.map((grp) => (
                <option key={grp} value={grp}>กลุ่ม: {grp}</option>
              ))}
            </select>
          )}

          <select
            value={lineFilter}
            onChange={(e) => setLineFilter(e.target.value)}
            className="min-h-[36px] rounded-lg border border-slate-300 bg-slate-50 px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          >
            <option value="ALL">ทุกสายผลิต</option>
            {(structure?.lines || []).map((ln) => <option key={ln} value={ln}>{ln}</option>)}
          </select>

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ค้นหารหัส / ชื่อ..."
            className="min-h-[36px] w-36 rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
          />
        </div>

        {/* Right Consolidated Action Controls */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={toggleFinancialVisibility}
            className={`min-h-[36px] inline-flex items-center gap-1 rounded-lg border px-2.5 text-xs font-bold transition ${
              unlocked
                ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                : 'border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
            }`}
            title={unlocked ? 'คลิกเพื่อซ่อนค่าแรง' : 'คลิกเพื่อปลดล็อกข้อมูลค่าแรง'}
          >
            {unlocked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
            {unlocked ? 'ปลดล็อกแล้ว' : 'ปลดล็อกค่าแรง'}
          </button>

          <button
            type="button"
            onClick={() => setAnalyticsOpen(true)}
            className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            title="เปิดหน้าต่างกราฟวิเคราะห์ (Analytics)"
          >
            <BarChart2 className="h-3.5 w-3.5 text-indigo-500" />
            Analytics
          </button>

          {/* Grouped Settings Dropdown */}
          <div className="relative" ref={settingsRef}>
            <button
              type="button"
              onClick={() => setSettingsMenuOpen((v) => !v)}
              className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200"
            >
              <Settings className="h-3.5 w-3.5 text-slate-500" />
              ตั้งค่า
              <ChevronDown className="h-3 w-3" />
            </button>
            {settingsMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-30 dark:border-slate-700 dark:bg-slate-800 space-y-0.5">
                <button
                  type="button"
                  onClick={() => { setSettingsMenuOpen(false); navigate('/audit-5s'); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-slate-700"
                >
                  <Users className="h-4 w-4" /> ตั้งค่ากรรมการ 5ส &amp; เปิดรอบตรวจ
                </button>
                <button
                  type="button"
                  onClick={() => { setSettingsMenuOpen(false); open5sModal(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> ดูประวัติ / บันทึก 5ส ด่วน
                </button>
                <button
                  type="button"
                  onClick={() => { setSettingsMenuOpen(false); setCurriculumModalOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <GraduationCap className="h-4 w-4 text-fuchsia-500" /> หลักสูตรบังคับ (1ด. / 3ด.)
                </button>
                <button
                  type="button"
                  onClick={() => { setSettingsMenuOpen(false); setWeightModalOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Sliders className="h-4 w-4 text-indigo-500" /> น้ำหนัก 4 มิติ (%)
                </button>
                <button
                  type="button"
                  onClick={() => { setSettingsMenuOpen(false); openCriteriaModal(); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <BarChart2 className="h-4 w-4 text-violet-500" /> เกณฑ์ Ratio &amp; Attendance
                </button>
                <button
                  type="button"
                  onClick={() => { setSettingsMenuOpen(false); setGuideModalOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <BookOpen className="h-4 w-4 text-sky-500" /> คู่มือสูตรคำนวณ 4 มิติ
                </button>
              </div>
            )}
          </div>

          {/* Grouped Export Dropdown (Excel / CSV / Print PDF) */}
          <div className="relative" ref={exportRef}>
            <button
              type="button"
              onClick={() => setExportMenuOpen((v) => !v)}
              className="min-h-[36px] inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
            >
              <Download className="h-3.5 w-3.5" />
              ส่งออก
              <ChevronDown className="h-3 w-3" />
            </button>
            {exportMenuOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-30 dark:border-slate-700 dark:bg-slate-800 space-y-0.5">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5 text-emerald-600" /> Export Excel (.xlsx)
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5 text-sky-600" /> Export CSV (.csv)
                </button>
                <button
                  type="button"
                  onClick={handlePrintPdfSummary}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Printer className="h-3.5 w-3.5 text-rose-600" /> พิมพ์ / Save PDF
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={handleAutoGradeAll}
            disabled={loading || !rows.length}
            className="min-h-[36px] inline-flex items-center gap-1 rounded-lg bg-violet-600 px-3 text-xs font-bold text-white hover:bg-violet-700 disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Auto Grade
          </button>

          <button
            type="button"
            onClick={() => (onRefresh ? onRefresh() : fetchGrading())}
            className="min-h-[36px] min-w-[36px] inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
            title="รีเฟรชข้อมูล"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {periodMode === 'RANGE' && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 dark:border-amber-700 dark:bg-amber-950/50 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          โหมดช่วงเวลา (RANGE) ใช้สำหรับเปรียบเทียบย้อนหลังเท่านั้น ระบบปิดปุ่มบันทึกเพื่อป้องกันข้อมูลทับงวดรายเดือน
        </div>
      )}

      {/* 5 Executive Financial KPI Cards (Compact Legacy Parity) */}
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-xl border border-slate-200 border-l-4 border-l-indigo-500 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-indigo-600 dark:text-indigo-400">
            <span>พนักงานทั้งหมด</span>
            <Users className="h-3.5 w-3.5" />
          </div>
          <div className="mt-0.5 text-xl font-extrabold text-slate-900 dark:text-white">
            {loading ? '...' : `${kpiSummary.totalEmployees} คน`}
          </div>
          <div className="mt-0.5 flex flex-wrap gap-1.5 text-[10px] font-bold">
            <span className="text-emerald-600">A:{kpiSummary.counts.A}</span>
            <span className="text-blue-600">B:{kpiSummary.counts.B}</span>
            <span className="text-amber-600">C:{kpiSummary.counts.C}</span>
            <span className="text-rose-600">D:{kpiSummary.counts.D}</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-emerald-500 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-emerald-600 dark:text-emerald-400">
            <span>รายได้เฉลี่ย/หัว</span>
            <Coins className="h-3.5 w-3.5" />
          </div>
          <div className="mt-0.5 font-mono text-xl font-extrabold text-emerald-700 dark:text-emerald-300">
            {loading ? '...' : (unlocked ? `฿${formatMoney(kpiSummary.avgIncome, 0)}` : '•••••')}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">THB / Person</div>
        </div>

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-sky-500 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-sky-600 dark:text-sky-400">
            <span>Avg Ratio</span>
            <Sliders className="h-3.5 w-3.5" />
          </div>
          <div className="mt-0.5 font-mono text-xl font-extrabold text-sky-700 dark:text-sky-300">
            {loading ? '...' : (unlocked ? `${kpiSummary.avgRatio.toFixed(2)}x` : '•••')}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">Income ÷ Wage</div>
        </div>

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-amber-500 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-amber-600 dark:text-amber-400">
            <span>Total Income</span>
            <Award className="h-3.5 w-3.5" />
          </div>
          <div className="mt-0.5 font-mono text-xl font-extrabold text-slate-800 dark:text-white">
            {loading ? '...' : (unlocked ? `฿${formatMoney(kpiSummary.totalIncome, 0)}` : '•••••')}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">THB Generated</div>
        </div>

        <div className="rounded-xl border border-slate-200 border-l-4 border-l-rose-500 bg-white px-3.5 py-2.5 shadow-2xs dark:border-slate-700 dark:bg-slate-800">
          <div className="flex items-center justify-between text-[11px] font-bold uppercase text-rose-600 dark:text-rose-400">
            <span className="flex items-center gap-1.5">
              Total Wage
              <button
                type="button"
                onClick={toggleFinancialVisibility}
                className="rounded p-0.5 hover:bg-rose-50 dark:hover:bg-rose-950/50"
                title={unlocked ? 'ซ่อนตัวเลขค่าแรง' : 'ปลดล็อกเพื่อดูค่าแรง'}
              >
                {unlocked ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </span>
            <Wallet className="h-3.5 w-3.5" />
          </div>
          <div className="mt-0.5 font-mono text-xl font-extrabold text-rose-600 dark:text-rose-400">
            {loading ? '...' : (unlocked ? `฿${formatMoney(kpiSummary.totalWage, 0)}` : '••••••')}
          </div>
          <div className="mt-0.5 text-[10px] text-slate-400">
            {unlocked ? 'Base + OT Wage' : 'คลิกไอคอนรูปตาเพื่อดูค่าแรง'}
          </div>
        </div>
      </div>

      {/* Full-Height Sortable 4D Grading Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs dark:border-slate-700 dark:bg-slate-800">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2.5 dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
            <Award className="h-4 w-4 text-indigo-500" />
            {loading
              ? `กำลังประมวลผลเกรด 4 มิติ (งวด: ${activePeriod})...`
              : `การประเมินเกรดพนักงาน 4 มิติ (งวด: ${activePeriod}) — ${filteredAndSortedRows.length} คน`}
          </div>
          {loading && <RefreshCw className="h-4 w-4 animate-spin text-indigo-500" />}
        </div>

        <div className="max-h-[calc(100vh-285px)] overflow-auto">
          <table className="w-full min-w-[1060px] text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] font-bold uppercase text-slate-600 shadow-2xs dark:bg-slate-900 dark:text-slate-300">
              <tr>
                <th className="px-4 py-2.5 cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('name_th')}>
                  พนักงาน / สายผลิต {renderSortIcon('name_th')}
                </th>
                <th className="px-3 py-2.5 text-right cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('income_per_head')}>
                  รายได้/หัว (฿) {renderSortIcon('income_per_head')}
                </th>
                <th className="px-3 py-2.5 text-right cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('total_wage')}>
                  ค่าแรงรวม (฿) {renderSortIcon('total_wage')}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); toggleFinancialVisibility(); }}
                    className="ml-1 inline-flex align-middle text-slate-400 hover:text-indigo-600"
                    title={unlocked ? 'ซ่อนค่าแรง' : 'ปลดล็อกค่าแรง'}
                  >
                    {unlocked ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  </button>
                </th>
                <th className="px-3 py-2.5 text-right cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('ratio')}>
                  Ratio {renderSortIcon('ratio')}
                </th>
                <th className="px-2 py-2.5 text-center cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('grade_iph')}>
                  1. IPH {renderSortIcon('grade_iph')}
                </th>
                <th className="px-2 py-2.5 text-center cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('grade_5s')}>
                  2. 5S {renderSortIcon('grade_5s')}
                </th>
                <th className="px-2 py-2.5 text-center cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('grade_attendance')}>
                  3. Attd {renderSortIcon('grade_attendance')}
                </th>
                <th className="px-2 py-2.5 text-center cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('grade_learning')}>
                  4. Learn {renderSortIcon('grade_learning')}
                </th>
                <th className="px-3 py-2.5 text-center cursor-pointer select-none hover:text-indigo-600" onClick={() => toggleSort('grade_overall')}>
                  GPA / รวม {renderSortIcon('grade_overall')}
                </th>
                <th className="px-3 py-2.5">หมายเหตุ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-14 text-center text-slate-500">
                    <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-indigo-500" />
                    <div className="font-semibold">กำลังโหลดและคำนวณคะแนน 4 มิติจากข้อมูลการผลิตและเวลาทำงาน...</div>
                  </td>
                </tr>
              ) : filteredAndSortedRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-slate-400">
                    ไม่พบข้อมูลพนักงานในช่วงเวลานี้
                  </td>
                </tr>
              ) : (
                filteredAndSortedRows.map((r) => {
                  const calc = calculateOverallGrade(r);
                  const ov = (r.grade_overall || calc.grade || '').toUpperCase();
                  const ovBadge = GRADE_BADGE_MAP[ov] || 'bg-slate-100 text-slate-500 border-slate-200';
                  return (
                    <tr key={r.emp_id} className={dirtyMap[r.emp_id] ? 'bg-indigo-50/40 dark:bg-indigo-950/20' : 'hover:bg-slate-50/70 dark:hover:bg-slate-700/30'}>
                      <td className="px-4 py-2">
                        <div className="font-semibold text-slate-800 dark:text-white">{r.name_th}</div>
                        <div className="text-[11px] text-slate-500">{r.emp_id} • {r.line} ({r.position})</div>
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {unlocked ? formatMoney(r.income_per_head, 2) : <span className="text-slate-400">•••••</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono">
                        {unlocked ? formatMoney(r.total_wage, 2) : <span className="text-slate-400">•••••</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600 dark:text-indigo-400">
                        {unlocked ? Number(r.ratio || 0).toFixed(2) : <span className="text-slate-400">•••</span>}
                      </td>
                      {[
                        { field: 'grade_iph', sys: r.system_grade_iph, hint: `Sys: ${r.system_grade_iph || '-'}` },
                        {
                          field: 'grade_5s',
                          sys: r.system_grade_5s,
                          hint: r.score_5s !== null && r.score_5s !== undefined
                            ? `${Number(r.score_5s).toFixed(1)} (${r.audit_5s_submitted || 1}/${r.audit_5s_required || 1})`
                            : 'รอตรวจ 5ส',
                        },
                        { field: 'grade_attendance', sys: r.system_grade_attendance, hint: `สาย ${r.late_days}/ขาด ${r.absent_days} (${r.system_grade_attendance})` },
                        {
                          field: 'grade_learning',
                          sys: r.system_grade_learning,
                          hint: r.learning_mandatory_total > 0
                            ? `${r.skill_count}/${r.learning_target_a} · บังคับ ${r.learning_mandatory_passed}/${r.learning_mandatory_total}${r.learning_is_capped ? ' Cap C' : ''}`
                            : `${r.skill_count}/${r.learning_target_a} (${r.system_grade_learning})`,
                        },
                      ].map((dim) => (
                        <td key={dim.field} className="px-2 py-1.5 text-center">
                          <select
                            value={r[dim.field] || ''}
                            onChange={(e) => updateRowDimension(r.emp_id, dim.field, e.target.value)}
                            className="min-h-[34px] rounded border border-slate-300 bg-white px-2 text-xs font-bold dark:border-slate-600 dark:bg-slate-900 dark:text-white"
                          >
                            {GRADE_OPTIONS.map((opt) => (
                              <option key={opt} value={opt}>{opt || '-'}</option>
                            ))}
                          </select>
                          <div className="mt-0.5 text-[10px] text-slate-400">{dim.hint}</div>
                        </td>
                      ))}
                      <td className="px-3 py-1.5 text-center">
                        <span className={`inline-flex min-w-[40px] items-center justify-center rounded-md border px-2 py-0.5 font-mono text-xs font-extrabold ${ovBadge}`}>
                          {ov || '-'}
                        </span>
                        <div className="mt-0.5 text-[10px] font-mono text-slate-400">
                          {calc.gpa > 0 ? calc.gpa.toFixed(2) : '-'}
                        </div>
                      </td>
                      <td className="px-3 py-1.5">
                        <input
                          type="text"
                          value={r.notes || ''}
                          onChange={(e) => updateRowDimension(r.emp_id, 'notes', e.target.value)}
                          placeholder="บันทึกเพิ่มเติม..."
                          className="min-h-[34px] w-32 rounded border border-slate-300 px-2 text-xs dark:border-slate-600 dark:bg-slate-900 dark:text-white"
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

      {/* Floating Save FAB (Positioned left of AI Copilot pill so they never collide) */}
      {periodMode !== 'RANGE' && (
        <button
          type="button"
          disabled={!isOnline || savingGrades || dirtyCount === 0}
          onClick={handleSaveGrades}
          title={dirtyCount > 0 ? `บันทึกการแก้ไขเกรด ${dirtyCount} รายการ` : 'ยังไม่มีรายการที่เปลี่ยนแปลง'}
          className={`fixed bottom-20 sm:bottom-6 right-24 z-40 inline-flex items-center gap-2 rounded-full px-4 py-3 text-xs font-bold shadow-xl transition ${
            dirtyCount > 0
              ? 'bg-indigo-600 text-white hover:bg-indigo-700 ring-4 ring-indigo-500/25'
              : 'bg-slate-200 text-slate-500 dark:bg-slate-800 dark:text-slate-400 opacity-75 cursor-not-allowed'
          }`}
        >
          <Save className="h-4 w-4" />
          <span>{savingGrades ? 'กำลังบันทึก...' : `บันทึกเกรด (${dirtyCount})`}</span>
        </button>
      )}

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
                <option value="TEAM 1">TEAM 1</option>
                <option value="MAIN">MAIN</option>
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

      {/* 5S Audit Quick History Modal */}
      {audit5sOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-xs">
          <div className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b px-5 py-3.5 dark:border-slate-700">
              <h4 className="text-base font-bold">ผลตรวจประเมินกิจกรรม 5ส (5S Audit &amp; History)</h4>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => { setAudit5sOpen(false); navigate('/audit-5s'); }}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                >
                  ไปหน้าตรวจ 5ส เต็มรูปแบบ →
                </button>
                <button type="button" onClick={() => setAudit5sOpen(false)} className="p-1 text-slate-400"><X className="h-5 w-5" /></button>
              </div>
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
              <p><strong>2. 5S Activity Audit:</strong> คำนวณคะแนนเฉลี่ยแบบหารเท่า (1/N) จากผลตรวจของคณะกรรมการประจำ (Default Roster) ที่ส่งผลในรอบเดือนนั้น</p>
              <p><strong>3. Discipline / Attendance:</strong> นับจำนวนวันมาสาย + ขาดงาน เทียบกับ Max Allowed Late/Absent ของสายผลิต</p>
              <p><strong>4. Learning &amp; Skill Matrix:</strong> ระบบหน่วยกิตมหาวิทยาลัย รวมวิชาบังคับประจำรอบ (1ด./3ด.) + วิชาเลือก + ทักษะปฏิบัติ (จำกัดสูงสุด C หากยังไม่ผ่านวิชาบังคับรอบปัจจุบัน)</p>
              <p><strong>5. Overall GPA Score:</strong> A = 4.0, B = 3.0, C = 2.0, D = 1.0 ถ่วงน้ำหนักตาม Weight (%) ของกลุ่มทีม → A (≥3.5), B (≥2.5), C (≥1.5), D (&lt;1.5)</p>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Modal */}
      <GradingAnalyticsModal
        isOpen={analyticsOpen}
        onClose={() => setAnalyticsOpen(false)}
        rows={filteredAndSortedRows}
        period={activePeriod}
        unlocked={unlocked}
        onRequestUnlock={() => setUnlockModalOpen(true)}
      />

      {/* Curriculum Rules Modal */}
      <CurriculumRulesModal
        isOpen={curriculumModalOpen}
        onClose={() => setCurriculumModalOpen(false)}
        isOnline={isOnline}
        onRulesUpdated={fetchGrading}
      />
    </div>
  );
}

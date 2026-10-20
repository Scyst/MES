import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmployeeCompetencyPassport } from '../data/trainingAuditStore';
import { getCurrentUser, fetchRealUserSession, fetchEmployeesList, switchActiveEmployee, getUserGrading } from '../data/communityStore';
import { DEFAULT_AVATAR, DEFAULT_COURSE_IMAGE } from '../data/offlineAssets';
import { useTheme } from '../context/ThemeContext';
import { 
  FiArrowLeft, 
  FiAward, 
  FiShield, 
  FiCheckCircle, 
  FiXCircle, 
  FiClock, 
  FiBookOpen, 
  FiHeart, 
  FiPrinter, 
  FiUser, 
  FiUsers,
  FiSearch,
  FiFilter,
  FiActivity,
  FiDatabase,
  FiRefreshCw,
  FiLayers, 
  FiAlertTriangle, 
  FiTrendingUp, 
  FiCheck, 
  FiX, 
  FiChevronRight,
  FiShare2,
  FiFileText,
  FiExternalLink
} from 'react-icons/fi';

export default function UserProfile() {
  const { empId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [activeFilter, setActiveFilter] = useState('all'); // 'all' | 'passed' | 'mandatory' | 'in_progress' | 'posts'
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Employee Directory & Identity Switcher State (405 Real Factory Employees)
  const [isEmpSelectorOpen, setIsEmpSelectorOpen] = useState(false);
  const [empSearchQuery, setEmpSearchQuery] = useState('');
  const [empLineFilter, setEmpLineFilter] = useState('ALL');
  const [employeeDirectory, setEmployeeDirectory] = useState({ employees: [], lines: [] });
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false);
  const [viewedPassportData, setViewedPassportData] = useState(null);

  useEffect(() => {
    fetchRealUserSession().then(u => {
      if (u) setCurrentUser(u);
    });

    const handleUserUpdated = (e) => {
      if (e.detail) setCurrentUser(e.detail);
    };
    window.addEventListener('mes-user-updated', handleUserUpdated);
    return () => window.removeEventListener('mes-user-updated', handleUserUpdated);
  }, []);

  // Fetch directory list whenever modal is opened or search/filter changes
  useEffect(() => {
    if (isEmpSelectorOpen) {
      setIsLoadingEmployees(true);
      fetchEmployeesList(empSearchQuery, empLineFilter)
        .then(data => {
          if (data && data.employees) {
            setEmployeeDirectory(data);
          }
        })
        .finally(() => setIsLoadingEmployees(false));
    }
  }, [isEmpSelectorOpen, empSearchQuery, empLineFilter]);

  // Fetch live passport/grading from SQL Server for the currently viewed profile
  useEffect(() => {
    const targetId = empId || currentUser.emp_id || currentUser.id;
    if (!targetId) return;

    setViewedPassportData(null);
    fetch(`../MES/MES/page/manpower/api/api_learning.php?action=get_employee_passport&emp_id=${encodeURIComponent(targetId)}`, { credentials: 'include' })
      .then(res => (res.ok ? res.json() : null))
      .then(json => {
        if (json && json.success && json.data) {
          setViewedPassportData(json.data);
        }
      })
      .catch(() => {});
  }, [empId, currentUser.emp_id, currentUser.id]);

  // Compute passport data based on URL parameter or current logged in user
  const passport = useMemo(() => {
    return getEmployeeCompetencyPassport(empId || currentUser.emp_id || currentUser.id, viewedPassportData);
  }, [empId, currentUser, viewedPassportData]);

  const { employee, currentUserIsMe, rank, exp, userPosts, totalLikesReceived } = passport;

  // Active 4-Dimension Grading state (Strictly visible to Admin / Manager / Creator only)
  const canViewGrading = Boolean(currentUser?.can_view_grading);
  const activeGrading = canViewGrading
    ? (viewedPassportData?.grading || passport.grading || currentUser.grading || getUserGrading() || {
        evaluation_period: '2026-10',
        grade_overall: 'B',
        grade_iph: 'B',
        grade_5s: 'A',
        grade_attendance: 'A',
        grade_learning: 'C',
        skill_count: 1,
        passed_courses: passport.totalPassedCount || 1,
        learning_tier_name: 'ระดับบริหารและวิศวกร (Tier 3)',
        learning_target_a: 8,
        learning_criteria_label: 'A (≥ 8 ทักษะ) · B (5-7 ทักษะ) · C (2-4 ทักษะ) · D (0-1 ทักษะ)'
      })
    : null;

  // Inspect another employee's Competency Passport without overwriting own logged-in session
  const handleSelectEmployee = (targetEmp) => {
    setIsEmpSelectorOpen(false);
    navigate(`/profile/${targetEmp.emp_id}`);
  };

  // Return to own logged-in profile
  const handleResetToMyProfile = async () => {
    await switchActiveEmployee(null);
    const u = await fetchRealUserSession();
    if (u) setCurrentUser(u);
    setIsEmpSelectorOpen(false);
    navigate('/profile');
  };

  // Filtered courses based on active filter
  const displayedCourses = useMemo(() => {
    if (activeFilter === 'passed') {
      return passport.courseStatusList.filter(c => c.passed);
    }
    if (activeFilter === 'mandatory') {
      return passport.courseStatusList.filter(c => c.isMandatory);
    }
    if (activeFilter === 'in_progress') {
      return passport.courseStatusList.filter(c => c.status === 'in_progress' || (!c.passed && c.status === 'failed'));
    }
    return passport.courseStatusList;
  }, [passport, activeFilter]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="learning-container py-6 space-y-6">
      {/* Unified Page Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="min-w-0">
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight flex items-center gap-2.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <FiUser className="text-fuchsia-500 flex-shrink-0" />
            <span>สมุดพกสมรรถนะบุคลากร (Competency Passport)</span>
          </h1>
          <p className={`text-xs sm:text-sm mt-2.5 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ข้อมูลการรับรองทักษะ ประวัติการทำแบบทดสอบ และความสอดคล้องตามมาตรฐานตำแหน่งงานรายบุคคล
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {!currentUserIsMe && (
            <button
              onClick={handleResetToMyProfile}
              className={`h-10 px-3.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap ${
                isDark
                  ? 'bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-300 hover:text-white border-emerald-700/60'
                  : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200'
              }`}
              title="กลับไปดูพาสปอร์ตสมรรถนะและเกรดของบัญชีคุณ"
            >
              <FiArrowLeft className="w-3.5 h-3.5 text-emerald-500" />
              <span>โปรไฟล์ฉัน ({currentUser.name})</span>
            </button>
          )}

          {/* Employee Directory / Switcher Modal Button */}
          <button
            onClick={() => setIsEmpSelectorOpen(true)}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap ${
              isDark
                ? 'bg-indigo-900/40 hover:bg-indigo-800/60 text-indigo-300 hover:text-white border-indigo-700/60'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
            }`}
            title="ค้นหาและตรวจสอบพาสปอร์ตสมรรถนะของพนักงานโรงงานจากฐานข้อมูลจริง"
          >
            <FiUsers className="w-3.5 h-3.5 text-indigo-500" />
            <span>ค้นหาพนักงาน ({employeeDirectory.employees?.length ? `${employeeDirectory.employees.length} คน` : '405 คน'})</span>
          </button>

          <button
            onClick={() => setIsPrintModalOpen(true)}
            className={`h-10 px-3.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors shadow-sm whitespace-nowrap ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300'
            }`}
          >
            <FiPrinter className="w-3.5 h-3.5 text-cyan-500" />
            <span>พิมพ์พาสปอร์ต</span>
          </button>
        </div>
      </div>

      {/* Industrial Plant ID Card / Employee Hero Badge */}
      <div className={`relative rounded-2xl p-5 sm:p-6 shadow-md overflow-hidden border transition-all ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-slate-700/80'
          : 'bg-white border-slate-200'
      }`}>
        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5">
          {/* Avatar and Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="relative flex-shrink-0">
              <img
                src={employee.avatar || DEFAULT_AVATAR}
                alt={employee.name}
                className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl object-cover border-2 border-fuchsia-500/60 shadow-lg"
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              <span className="absolute -bottom-1.5 -right-1.5 text-xl sm:text-2xl filter drop-shadow-md" title={rank.name}>
                {rank.badge}
              </span>
            </div>

            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className={`text-lg sm:text-xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {employee.name}
                </h2>
                <span className={`px-2 py-0.5 rounded-lg font-mono text-xs font-bold ${
                  isDark ? 'bg-slate-800 border border-slate-700 text-fuchsia-400' : 'bg-slate-100 border border-slate-200 text-fuchsia-700'
                }`}>
                  {employee.empId}
                </span>
                {currentUserIsMe && (
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold border ${
                    isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' : 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200'
                  }`}>
                    บัญชีของคุณ
                  </span>
                )}
              </div>

              <div className={`text-xs sm:text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {employee.role}
              </div>

              <div className={`text-xs flex flex-wrap items-center gap-x-4 gap-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                <span>🏢 {employee.department}</span>
                <span>⏱️ {employee.shift}</span>
                {employee.joinedDate && <span>📅 เริ่มงาน: {new Date(employee.joinedDate).toLocaleDateString('th-TH')}</span>}
              </div>

              {/* Gamification Rank & EXP Progress Bar */}
              <div className="pt-1.5 flex flex-wrap items-center gap-2.5">
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold text-white bg-gradient-to-r ${rank.color} border border-white/20 shadow-sm`}>
                  Lv.{rank.level} {rank.name}
                </span>

                <div className="flex items-center gap-2">
                  <div className={`w-36 sm:w-44 rounded-full h-2 overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'}`}>
                    <div
                      className="bg-gradient-to-r from-fuchsia-500 to-amber-400 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${rank.progressPercent}%` }}
                    ></div>
                  </div>
                  <span className={`text-xs font-mono font-bold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>
                    {exp} EXP
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Status Summary */}
          <div className={`flex flex-col items-start lg:items-end gap-1.5 w-full lg:w-auto pt-3 lg:pt-0 border-t lg:border-t-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className={`text-[11px] font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              สถานะความสอดคล้องตามเกณฑ์ตำแหน่ง (ISO 9001 Clause 7.2)
            </div>
            {passport.isAuditReady ? (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm border ${
                isDark ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' : 'bg-emerald-50 border-emerald-300 text-emerald-800'
              }`}>
                <FiCheck className="w-4 h-4 text-emerald-500" />
                <span>สมรรถนะพร้อมรับออดิท 100%</span>
              </div>
            ) : (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black shadow-sm border ${
                isDark ? 'bg-amber-500/15 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-800'
              }`}>
                <FiAlertTriangle className="w-4 h-4 text-amber-500" />
                <span>ต้องอบรมเพิ่ม ({passport.skillGaps.length} วิชาบังคับ)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 4-Dimension Manpower Employee Grading Matrix Card (Strictly Admin / Manager / Creator Only) */}
      {canViewGrading && activeGrading && (
      <div className={`relative rounded-2xl p-5 sm:p-6 shadow-md overflow-hidden border transition-all ${
        isDark 
          ? 'bg-gradient-to-br from-slate-900 via-slate-850 to-indigo-950/30 border-indigo-500/30' 
          : 'bg-white border-indigo-100'
      }`}>
        {/* Top Header of Grading Card */}
        <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-4 ${
          isDark ? 'border-slate-700/60' : 'border-slate-200'
        }`}>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <FiActivity className="w-4 h-4 text-indigo-500" />
              <h2 className={`text-base sm:text-lg font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ผลการประเมินเกรดสมรรถนะ 4 มิติ (ผู้บริหาร)
              </h2>
            </div>
            <span className={`px-3 py-0.5 rounded-xl font-black text-sm border ${
              (activeGrading.grade_overall === 'A') 
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
                : (activeGrading.grade_overall === 'B')
                  ? 'bg-blue-500/20 text-blue-400 border-blue-500/40'
                  : (activeGrading.grade_overall === 'C')
                    ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                    : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
            }`}>
              เกรดรวม: {activeGrading.grade_overall || 'B'}
            </span>
            <span className={`text-xs font-mono font-semibold px-2.5 py-0.5 rounded-lg ${
              isDark ? 'bg-slate-800 text-slate-300 border border-slate-700' : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              งวด {activeGrading.evaluation_period || '2026-10'}
            </span>
          </div>

          <a
            href="../MES/MES/page/manpower/employeeGrading.php"
            target="_blank"
            rel="noopener noreferrer"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all shadow-sm self-start sm:self-auto ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-750 text-indigo-300 hover:text-white border-indigo-700/50'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border-indigo-200'
            }`}
          >
            <span>เปิดหน้าต่างประเมินเกรดหลัก</span>
            <FiExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* 4 Dimension Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 pt-4">
          {/* Dimension 1: IPH */}
          <div className={`rounded-xl p-3.5 border transition-all ${
            isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                1. รายได้ต่อหัว (IPH)
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                activeGrading.grade_iph === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                activeGrading.grade_iph === 'B' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                activeGrading.grade_iph === 'C' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}>
                Grade {activeGrading.grade_iph || 'B'}
              </span>
            </div>
            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ประสิทธิภาพการผลิตเทียบต้นทุนแรงงาน
            </div>
            <div className={`mt-2 text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              เกณฑ์: Ratio ≥ 2.0 (A) · ≥ 1.5 (B) · ≥ 1.0 (C)
            </div>
          </div>

          {/* Dimension 2: 5S Audit */}
          <div className={`rounded-xl p-3.5 border transition-all ${
            isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                2. การตรวจ 5 ส (5S Audit)
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                activeGrading.grade_5s === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                activeGrading.grade_5s === 'B' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                activeGrading.grade_5s === 'C' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}>
                Grade {activeGrading.grade_5s || 'A'}
              </span>
            </div>
            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ความเป็นระเบียบและความปลอดภัยพื้นที่งาน
            </div>
            <div className={`mt-2 text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              เกณฑ์: คะแนน ≥ 85 (A) · ≥ 70 (B) · ≥ 55 (C)
            </div>
          </div>

          {/* Dimension 3: Attendance */}
          <div className={`rounded-xl p-3.5 border transition-all ${
            isDark ? 'bg-slate-800/70 border-slate-700/70' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                3. การมาทำงาน (Attendance)
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                activeGrading.grade_attendance === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' :
                activeGrading.grade_attendance === 'B' ? 'bg-blue-500/20 text-blue-400 border-blue-500/40' :
                activeGrading.grade_attendance === 'C' ? 'bg-amber-500/20 text-amber-400 border-amber-500/40' :
                'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}>
                Grade {activeGrading.grade_attendance || 'A'}
              </span>
            </div>
            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              ความตรงต่อเวลาและวินัยการทำงานรายเดือน
            </div>
            <div className={`mt-2 text-[11px] font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              เกณฑ์: สาย/ขาด 0 วัน (A) · ≤ 1 วัน (B) · ≤ 3 วัน (C)
            </div>
          </div>

          {/* Dimension 4: Learning & Skills */}
          <div className={`rounded-xl p-3.5 border relative overflow-hidden transition-all ${
            isDark 
              ? 'bg-gradient-to-br from-indigo-900/40 to-fuchsia-900/30 border-indigo-400/50' 
              : 'bg-gradient-to-br from-indigo-50 to-fuchsia-50/50 border-indigo-300'
          }`}>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-black flex items-center gap-1.5 ${isDark ? 'text-indigo-300' : 'text-indigo-900'}`}>
                <span>4. ทักษะ &amp; การเรียนรู้</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title="ซิงค์อัตโนมัติ"></span>
              </span>
              <span className={`px-2 py-0.5 rounded-lg text-xs font-black border ${
                activeGrading.grade_learning === 'A' ? 'bg-emerald-500/25 text-emerald-300 border-emerald-400' :
                activeGrading.grade_learning === 'B' ? 'bg-blue-500/25 text-blue-300 border-blue-400' :
                activeGrading.grade_learning === 'C' ? 'bg-amber-500/25 text-amber-300 border-amber-400' :
                'bg-rose-500/25 text-rose-300 border-rose-400'
              }`}>
                Grade {activeGrading.grade_learning || 'D'}
              </span>
            </div>

            <div className={`text-[11px] flex items-center justify-between ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <span>ทักษะสะสม / เป้าเกรด A:</span>
              <strong className="font-mono text-cyan-400">{activeGrading.skill_count || 0} / {activeGrading.learning_target_a || 3} ทักษะ</strong>
            </div>

            <div className={`mt-2 text-[11px] font-semibold truncate ${isDark ? 'text-amber-300' : 'text-indigo-900'}`} title={activeGrading.learning_tier_name}>
              {activeGrading.learning_tier_name || 'เกณฑ์ตามระดับตำแหน่ง (3-Tier)'}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className={`rounded-2xl p-4 shadow-sm border transition-all ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold mb-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            <span>หลักสูตรที่สำเร็จแล้ว</span>
            <FiBookOpen className="text-fuchsia-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {passport.totalPassedCount} <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>/ {passport.totalCoursesCount} วิชา</span>
          </div>
          <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ผ่านเกณฑ์แบบทดสอบ ≥80%
          </div>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm border transition-all ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold mb-2 ${isDark ? 'text-cyan-400' : 'text-cyan-700 font-bold'}`}>
            <span>เกณฑ์บังคับตามตำแหน่ง</span>
            <FiShield className="text-cyan-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-cyan-400' : 'text-cyan-700'}`}>
            {passport.complianceRate}%
          </div>
          <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ผ่าน {passport.mandatoryPassedCount} จาก {passport.mandatoryCoursesCount} หลักสูตรบังคับ
          </div>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm border transition-all ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold mb-2 ${isDark ? 'text-amber-400' : 'text-amber-700 font-bold'}`}>
            <span>คะแนนสอบเฉลี่ย</span>
            <FiAward className="text-amber-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
            {passport.avgScorePercent}%
          </div>
          <div className={`text-[11px] mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            คะแนนเฉลี่ยจากการทำข้อสอบ
          </div>
        </div>

        <div className={`rounded-2xl p-4 shadow-sm border transition-all ${
          isDark ? 'bg-slate-800/80 border-slate-700/80' : 'bg-white border-slate-200'
        }`}>
          <div className={`flex items-center justify-between text-xs font-semibold mb-2 ${isDark ? 'text-rose-400' : 'text-rose-700 font-bold'}`}>
            <span>องค์ความรู้ที่แบ่งปัน</span>
            <FiHeart className="text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {userPosts.length} <span className={`text-xs font-normal ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>บทเรียน</span>
          </div>
          <div className={`text-[11px] mt-1 flex items-center gap-1 ${isDark ? 'text-rose-300/80' : 'text-rose-700 font-medium'}`}>
            <span>ได้รับ {totalLikesReceived} กำลังใจจากเพื่อนร่วมงาน</span>
          </div>
        </div>
      </div>

      {/* Skill Gap Alert Card (if missing mandatory courses) */}
      {passport.skillGaps.length > 0 && (
        <div className={`rounded-2xl p-5 shadow-sm space-y-3 border ${
          isDark ? 'bg-rose-500/10 border-rose-500/30' : 'bg-rose-50 border-rose-300'
        }`}>
          <div className={`flex items-center gap-2 font-bold text-sm ${isDark ? 'text-rose-300' : 'text-rose-900'}`}>
            <FiAlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
            <span>หลักสูตรบังคับประจำตำแหน่งที่ยังไม่ผ่านเกณฑ์ (Mandatory Courses Required)</span>
          </div>
          <p className={`text-xs ${isDark ? 'text-rose-200/80' : 'text-rose-800 font-medium'}`}>
            เพื่อให้มีความพร้อมในการปฏิบัติงานและสอดคล้องตามข้อกำหนด ISO 9001 ของฝ่าย {employee.department} กรุณาศึกษาและทำแบบทดสอบหลักสูตรเหล่านี้:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {passport.skillGaps.map(gap => (
              <div key={gap.courseId} className={`rounded-xl p-3 flex items-center justify-between gap-3 border ${
                isDark ? 'bg-slate-900/90 border-rose-500/20' : 'bg-white border-rose-200 shadow-sm'
              }`}>
                <div className="min-w-0">
                  <div className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>{gap.title}</div>
                  <div className={`text-[10px] ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>{gap.category} · {gap.duration}</div>
                </div>
                <button
                  onClick={() => navigate(`/course/${gap.courseId}`)}
                  className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
                >
                  เริ่มเรียนทันที
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Navigation Filter Tabs for Courses */}
      <div className="space-y-4">
        <div className={`flex items-center justify-between border-b pb-2 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setActiveFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'all'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-md'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
              }`}
            >
              หลักสูตรทั้งหมด ({passport.courseStatusList.length})
            </button>

            <button
              onClick={() => setActiveFilter('passed')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'passed'
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
              }`}
            >
              ผ่านการอบรมแล้ว ({passport.totalPassedCount})
            </button>

            <button
              onClick={() => setActiveFilter('mandatory')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'mandatory'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
              }`}
            >
              หลักสูตรบังคับตำแหน่ง ({passport.mandatoryCoursesCount})
            </button>

            <button
              onClick={() => setActiveFilter('in_progress')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'in_progress'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
              }`}
            >
              กำลังเรียน / ต้องสอบใหม่ ({passport.courseStatusList.filter(c => c.status === 'in_progress' || (!c.passed && c.status === 'failed')).length})
            </button>

            <button
              onClick={() => setActiveFilter('posts')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeFilter === 'posts'
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white shadow-md'
                  : isDark 
                    ? 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700/80 hover:bg-slate-700'
                    : 'bg-white text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 hover:bg-slate-50 shadow-sm'
              }`}
            >
              บทเรียนที่เขียนแชร์ ({userPosts.length})
            </button>
          </div>
        </div>

        {/* LIST 1: COURSES VIEW */}
        {activeFilter !== 'posts' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {displayedCourses.map(courseItem => {
              const isPassed = courseItem.passed;
              const hasScore = courseItem.quizPercentage !== null;

              return (
                <div
                  key={courseItem.courseId}
                  className={`rounded-2xl p-4 sm:p-5 flex flex-col justify-between transition-all group border ${
                    isDark
                      ? 'bg-slate-800/90 border-slate-700/80 hover:border-slate-600 shadow-md'
                      : 'bg-white border-slate-200 hover:border-fuchsia-400 hover:shadow-lg shadow-sm'
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={`w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border ${
                          isDark ? 'bg-slate-900 border-slate-700' : 'bg-slate-100 border-slate-200'
                        }`}>
                          <img
                            src={courseItem.image || DEFAULT_COURSE_IMAGE}
                            alt={courseItem.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => { e.currentTarget.src = DEFAULT_COURSE_IMAGE; }}
                          />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${
                              isDark ? 'text-fuchsia-400' : 'text-fuchsia-700 font-extrabold'
                            }`}>
                              {courseItem.category}
                            </span>
                            {courseItem.isMandatory && (
                              <span className={`px-2 py-0.2 rounded text-[9px] font-bold border ${
                                isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' : 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200'
                              }`}>
                                บังคับตามตำแหน่ง
                              </span>
                            )}
                          </div>
                          <h3 className={`text-sm font-bold truncate transition-colors ${
                            isDark ? 'text-white group-hover:text-fuchsia-300' : 'text-slate-900 group-hover:text-fuchsia-700'
                          }`}>
                            {courseItem.title}
                          </h3>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="flex-shrink-0">
                        {isPassed ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isDark ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-300'
                          }`}>
                            <FiCheck className="w-3 h-3 text-emerald-500" /> ผ่านเกณฑ์
                          </span>
                        ) : courseItem.status === 'in_progress' ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-300'
                          }`}>
                            <FiClock className="w-3 h-3 text-amber-500" /> กำลังเรียน
                          </span>
                        ) : courseItem.status === 'failed' ? (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${
                            isDark ? 'bg-rose-500/10 text-rose-400 border-rose-500/30' : 'bg-rose-50 text-rose-800 border-rose-300'
                          }`}>
                            <FiX className="w-3 h-3 text-rose-500" /> ต้องสอบใหม่
                          </span>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium border ${
                            isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                          }`}>
                            ยังไม่เข้าเรียน
                          </span>
                        )}
                      </div>
                    </div>

                    <p className={`text-xs line-clamp-2 leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {courseItem.description}
                    </p>

                    {/* Score and Certificate Details Box */}
                    {hasScore && (
                      <div className={`rounded-xl p-3 border flex flex-wrap items-center justify-between gap-2 text-xs ${
                        isDark ? 'bg-slate-900/90 border-slate-750' : 'bg-slate-50 border-slate-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>ผลการทดสอบ:</span>
                          <span className={`font-bold font-mono px-2 py-0.5 rounded border ${
                            isPassed 
                              ? isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300' 
                              : isDark ? 'bg-rose-500/20 text-rose-300 border-rose-500/30' : 'bg-rose-100 text-rose-800 border-rose-300'
                          }`}>
                            {courseItem.scoreDisplay} ({courseItem.quizPercentage}%)
                          </span>
                        </div>

                        {courseItem.certificateId !== '-' && (
                          <div className={`flex items-center gap-1 text-[11px] font-mono ${isDark ? 'text-cyan-400' : 'text-cyan-800'}`}>
                            <span>Cert:</span>
                            <span className={`px-2 py-0.5 rounded border font-bold ${
                              isDark ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-cyan-50 text-cyan-800 border-cyan-300'
                            }`}>
                              {courseItem.certificateId}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Card Footer */}
                  <div className={`pt-3 mt-3 border-t flex items-center justify-between text-xs ${
                    isDark ? 'border-slate-700/80 text-slate-400' : 'border-slate-100 text-slate-600'
                  }`}>
                    <div>
                      {courseItem.completedDate !== '-' ? (
                        <span>จบเมื่อ: {courseItem.completedDate}</span>
                      ) : (
                        <span>ระยะเวลา: {courseItem.duration}</span>
                      )}
                    </div>

                    <button
                      onClick={() => navigate(`/course/${courseItem.courseId}`)}
                      className={`px-3 py-1.5 rounded-xl font-semibold transition-all inline-flex items-center gap-1.5 ${
                        isDark 
                          ? 'bg-slate-700 hover:bg-fuchsia-600 hover:text-white text-slate-200' 
                          : 'bg-slate-100 hover:bg-fuchsia-600 hover:text-white text-slate-800 border border-slate-300 hover:border-fuchsia-600 shadow-sm'
                      }`}
                    >
                      <span>{isPassed ? 'ทบทวนบทเรียน' : 'เริ่มเรียนหลักสูตร'}</span>
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* LIST 2: USER CONTRIBUTED ARTICLES / POSTS */}
        {activeFilter === 'posts' && (
          <div className="space-y-4">
            {userPosts.length > 0 ? (
              userPosts.map(post => (
                <div
                  key={post.id}
                  onClick={() => navigate(`/community/${post.id}`)}
                  className={`border rounded-2xl p-5 cursor-pointer transition-all hover:shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                    isDark
                      ? 'bg-slate-800/90 border-slate-700/80 hover:border-fuchsia-500/50'
                      : 'bg-white border-slate-200 hover:border-fuchsia-400 shadow-sm'
                  }`}
                >
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${isDark ? 'text-fuchsia-400' : 'text-fuchsia-700'}`}>
                        {post.category}
                      </span>
                      {post.isOfficial && (
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                          isDark ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          ยกระดับเป็นหลักสูตรมาตรฐานแล้ว
                        </span>
                      )}
                    </div>
                    <h3 className={`text-base font-bold transition-colors ${
                      isDark ? 'text-white hover:text-fuchsia-300' : 'text-slate-900 hover:text-fuchsia-700'
                    }`}>
                      {post.title}
                    </h3>
                    <p className={`text-xs line-clamp-2 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {post.summary}
                    </p>
                  </div>

                  <div className={`flex items-center gap-4 text-xs flex-shrink-0 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    <span className="flex items-center gap-1 text-rose-500 font-semibold">
                      <FiHeart /> {post.likesCount || 0} เป็นประโยชน์
                    </span>
                    <span>
                      {post.steps?.length || 0} ขั้นตอน
                    </span>
                    <span className={`font-bold inline-flex items-center gap-1 ${isDark ? 'text-fuchsia-400' : 'text-fuchsia-700'}`}>
                      <span>อ่านคู่มือ</span>
                      <FiChevronRight />
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className={`p-12 text-center rounded-2xl border ${
                isDark ? 'bg-slate-800/40 border-slate-700' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <FiBookOpen className={`w-12 h-12 mx-auto mb-3 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
                <h4 className={`text-sm font-bold mb-1 ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>ยังไม่มีบทเรียนที่เขียนแชร์</h4>
                <p className={`text-xs max-w-sm mx-auto mb-4 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  {currentUserIsMe 
                    ? 'คุณสามารถเขียนแชร์เทคนิคหน้างาน หรือขั้นตอนการแก้ปัญหาเครื่องจักรเพื่อรับ +50 EXP ได้ทันที!' 
                    : 'พนักงานท่านนี้ยังไม่ได้เขียนบทเรียนในคลังความรู้ชุมชน'}
                </p>
                {currentUserIsMe && (
                  <button
                    onClick={() => navigate('/community/new')}
                    className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white rounded-xl text-xs font-bold shadow-md hover:from-fuchsia-500 hover:to-violet-500 transition-all"
                  >
                    เริ่มเขียนบทเรียนแรก
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* PRINTABLE OFFICIAL COMPETENCY PASSPORT MODAL */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FiPrinter className="text-cyan-400" />
                <span>ตัวอย่างเอกสารพาสปอร์ตสมรรถนะบุคลากร (Employee Competency Passport)</span>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6 bg-white text-slate-900 font-sans text-xs">
              {/* Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <div className="text-base font-black text-slate-900 tracking-tight">
                    บริษัท เอสเอ็นซี ฟอร์เมอร์ จำกัด (มหาชน) — SNC Former Public Co., Ltd.
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    สมุดบันทึกประวัติและสมรรถนะการฝึกอบรมรายบุคคล (Individual Training & Competency Passport)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    ISO 9001:2015 Clause 7.2 Competence / IATF 16949 / Customer Audit Records
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-600 font-mono">
                  <div>รหัสเอกสาร: FM-HR-PASSPORT-02</div>
                  <div>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</div>
                </div>
              </div>

              {/* Bio Grid */}
              <div className="grid grid-cols-2 gap-4 bg-slate-100 p-3 rounded-lg border border-slate-300">
                <div>
                  <div><strong>ชื่อ-นามสกุล:</strong> {employee.name}</div>
                  <div><strong>รหัสพนักงาน:</strong> {employee.empId}</div>
                  <div><strong>ตำแหน่งงาน:</strong> {employee.role}</div>
                </div>
                <div>
                  <div><strong>แผนกต้นสังกัด:</strong> {employee.department}</div>
                  <div><strong>กะการปฏิบัติงาน:</strong> {employee.shift}</div>
                  <div><strong>อัตราความสอดคล้องตามตำแหน่ง:</strong> {passport.complianceRate}% ({passport.mandatoryPassedCount}/{passport.mandatoryCoursesCount} หลักสูตร)</div>
                </div>
              </div>

              {/* Transcript Table */}
              <div>
                <div className="font-bold text-slate-800 mb-2">ประวัติการฝึกอบรมและผลการประเมิน:</div>
                <table className="w-full border-collapse border border-slate-400 text-[11px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 text-center font-bold">
                      <th className="border border-slate-400 p-1.5 w-10">ลำดับ</th>
                      <th className="border border-slate-400 p-1.5 text-left">หลักสูตร</th>
                      <th className="border border-slate-400 p-1.5 w-24">ประเภท</th>
                      <th className="border border-slate-400 p-1.5 w-24">คะแนนสอบ</th>
                      <th className="border border-slate-400 p-1.5 w-24">ผลการประเมิน</th>
                      <th className="border border-slate-400 p-1.5 w-28">วันที่อบรม</th>
                      <th className="border border-slate-400 p-1.5 w-32">เลขที่ใบรับรอง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {passport.courseStatusList.map((c, idx) => (
                      <tr key={c.courseId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-400 p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-400 p-1.5 font-semibold">{c.title}</td>
                        <td className="border border-slate-400 p-1.5 text-center">
                          {c.isMandatory ? 'บังคับตำแหน่ง' : 'ทั่วไป'}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center font-mono">
                          {c.scoreDisplay} {c.quizPercentage !== null && `(${c.quizPercentage}%)`}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">
                          {c.passed ? 'ผ่านเกณฑ์ (Pass)' : c.status === 'in_progress' ? 'กำลังศึกษา' : 'ไม่ผ่าน (Fail)'}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center">{c.completedDate}</td>
                        <td className="border border-slate-400 p-1.5 text-center font-mono text-[10px]">
                          {c.certificateId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Sign off */}
              <div className="pt-6 grid grid-cols-2 gap-8 text-center border-t border-slate-300">
                <div className="space-y-8">
                  <div className="text-[10px] text-slate-500">ลงชื่อพนักงานเจ้าของประวัติ</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                  <div className="text-[11px] font-bold text-slate-800">
                    ({employee.name})
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">{employee.role}</div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="text-[10px] text-slate-500">ลงชื่อผู้จัดการฝ่ายทรัพยากรบุคคล / คุณภาพ</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                  <div className="text-[11px] font-bold text-slate-800">
                    (......................................................)
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">HR & Training Director</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={handlePrint}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30"
              >
                <FiPrinter className="w-4 h-4" />
                <span>สั่งพิมพ์เอกสาร (Print Passport)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 405 Factory Employees Directory & Switcher Modal */}
      {isEmpSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className={`w-full max-w-3xl rounded-3xl shadow-2xl border overflow-hidden flex flex-col max-h-[88vh] ${
            isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}>
            {/* Modal Header */}
            <div className={`p-5 border-b flex items-center justify-between gap-4 ${
              isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-indigo-50/70 border-slate-200'
            }`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
                  <FiUsers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    ทำเนียบพนักงานโรงงาน (Factory Employee Roster)
                  </h3>
                  <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                    เลือกพนักงานเพื่อตรวจสอบสมุดพกสมรรถนะและประวัติการฝึกอบรมรายบุคคล
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsEmpSelectorOpen(false)}
                className={`p-2 rounded-xl transition-colors ${
                  isDark ? 'hover:bg-slate-700 text-slate-400 hover:text-white' : 'hover:bg-slate-200 text-slate-600'
                }`}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Filter and Search Bar */}
            <div className={`p-4 border-b flex flex-col sm:flex-row items-center gap-3 ${
              isDark ? 'bg-slate-850 border-slate-700' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="relative flex-1 w-full">
                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={empSearchQuery}
                  onChange={(e) => setEmpSearchQuery(e.target.value)}
                  placeholder="ค้นหาด้วยรหัสพนักงาน, ชื่อ หรือตำแหน่ง..."
                  className={`w-full pl-10 pr-4 py-2 rounded-xl text-xs sm:text-sm border transition-all ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500' 
                      : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
                  }`}
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <FiFilter className="text-slate-400 flex-shrink-0" />
                <select
                  value={empLineFilter}
                  onChange={(e) => setEmpLineFilter(e.target.value)}
                  className={`px-3 py-2 rounded-xl text-xs sm:text-sm border font-semibold ${
                    isDark ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-800'
                  }`}
                >
                  <option value="ALL">ทุกสายการผลิต (All Lines)</option>
                  {(employeeDirectory.lines || []).map(line => (
                    <option key={line} value={line}>{line}</option>
                  ))}
                </select>

                <button
                  onClick={handleResetToMyProfile}
                  className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors whitespace-nowrap ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-amber-700 border-slate-300'
                  }`}
                  title="กลับสู่โปรไฟล์พนักงานตนเอง"
                >
                  <FiRefreshCw className="inline mr-1" /> โปรไฟล์ฉัน
                </button>
              </div>
            </div>

            {/* Employee List Scrollable Area */}
            <div className="flex-1 overflow-y-auto p-4 divide-y divide-slate-700/30">
              {isLoadingEmployees ? (
                <div className="py-12 text-center text-sm text-slate-400 space-y-2">
                  <FiRefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-400" />
                  <div>กำลังดึงรายชื่อพนักงานจากฐานข้อมูล MES...</div>
                </div>
              ) : employeeDirectory.employees?.length === 0 ? (
                <div className="py-12 text-center text-sm text-slate-400">
                  ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {employeeDirectory.employees.map(emp => {
                    const isSelected = (emp.emp_id === employee.empId);
                    return (
                      <div
                        key={emp.emp_id}
                        onClick={() => handleSelectEmployee(emp)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? (isDark ? 'bg-indigo-900/30 border-indigo-500 shadow-md' : 'bg-indigo-50 border-indigo-400 shadow-sm')
                            : (isDark ? 'bg-slate-800/70 hover:bg-slate-800 border-slate-700/80 hover:border-indigo-500/50' : 'bg-white hover:bg-indigo-50/50 border-slate-200 hover:border-indigo-300 shadow-sm')
                        }`}
                      >
                        <div className="min-w-0 flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-xs uppercase border ${
                            isDark ? 'bg-slate-700 border-slate-600 text-cyan-300' : 'bg-slate-100 border-slate-300 text-indigo-700'
                          }`}>
                            {emp.name_th ? emp.name_th.charAt(0) : 'E'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className={`font-bold text-xs truncate ${isDark ? 'text-white' : 'text-slate-900'}`}>
                                {emp.name_th || emp.emp_id}
                              </span>
                              <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-slate-700/50 text-slate-300">
                                {emp.emp_id}
                              </span>
                            </div>
                            <div className={`text-[11px] truncate ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              {emp.position || 'พนักงานฝ่ายผลิต'} · {emp.line}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                                สอบผ่าน {emp.passed_courses || 0} คอร์ส
                              </span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">
                                ทักษะ {emp.skill_count || 0}
                              </span>
                            </div>
                          </div>
                        </div>

                        {canViewGrading ? (
                          <div className="text-right flex-shrink-0">
                            <div className={`px-2.5 py-1 rounded-xl text-xs font-black border ${
                              emp.grade_learning === 'A' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                              emp.grade_learning === 'B' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                              emp.grade_learning === 'C' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                              'bg-rose-500/20 text-rose-400 border-rose-500/30'
                            }`}>
                              Lrn: {emp.grade_learning || 'D'}
                            </div>
                            <div className="text-[10px] text-slate-400 mt-1">
                              รวม: <span className="font-bold text-white">{emp.grade_overall || 'B'}</span>
                            </div>
                          </div>
                        ) : (
                          <div className="text-right flex-shrink-0">
                            <span className="px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                              ดูพาสปอร์ต
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`p-4 border-t flex items-center justify-between text-xs ${
              isDark ? 'bg-slate-800/80 border-slate-700 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
            }`}>
              <span>แสดงผล {employeeDirectory.employees?.length || 0} พนักงาน</span>
              <button
                onClick={() => setIsEmpSelectorOpen(false)}
                className="px-4 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  getAllEmployees, 
  getCourseAuditSummary, 
  getEmployeeCompetencyPassport, 
  getOverallAuditAnalytics,
  DEPARTMENTS
} from '../data/trainingAuditStore';
import { getAllMergedCourses } from '../data/communityStore';
import { DEFAULT_COURSE_IMAGE } from '../data/offlineAssets';
import {
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiUser,
  FiSearch,
  FiFilter,
  FiPrinter,
  FiShield,
  FiAward,
  FiAlertTriangle,
  FiBookOpen,
  FiBarChart2,
  FiFileText,
  FiCalendar,
  FiLayers,
  FiTrendingUp,
  FiAlertCircle,
  FiChevronRight,
  FiX,
  FiCheck,
  FiExternalLink
} from 'react-icons/fi';

export default function AuditDashboard() {
  const navigate = useNavigate();
  const allCourses = useMemo(() => getAllMergedCourses(), []);
  const allEmployees = useMemo(() => getAllEmployees(), []);

  // Perspective state: 'course' | 'employee' | 'overview'
  const [activeTab, setActiveTab] = useState('course');

  // Course-Centric View state
  const [selectedCourseId, setSelectedCourseId] = useState(() => allCourses[0]?.id || 'c-ppap');
  const [courseDeptFilter, setCourseDeptFilter] = useState('ทั้งหมด');
  const [courseStatusFilter, setCourseStatusFilter] = useState('ทั้งหมด');
  const [courseSearchQuery, setCourseSearchQuery] = useState('');

  // Employee-Centric View state
  const [selectedEmpId, setSelectedEmpId] = useState(() => allEmployees[0]?.empId || 'EMP-3810');
  const [empSearchQuery, setEmpSearchQuery] = useState('');

  // Print Modal State
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Computed Course Summary
  const courseSummary = useMemo(() => {
    return getCourseAuditSummary(selectedCourseId);
  }, [selectedCourseId]);

  // Filtered Course Roster
  const filteredRoster = useMemo(() => {
    return courseSummary.participantRoster.filter(p => {
      const matchDept = courseDeptFilter === 'ทั้งหมด' || p.department === courseDeptFilter;
      const matchStatus = courseStatusFilter === 'ทั้งหมด' || 
        (courseStatusFilter === 'passed' && p.passed) ||
        (courseStatusFilter === 'in_progress' && p.status === 'in_progress') ||
        (courseStatusFilter === 'failed' && p.status === 'failed') ||
        (courseStatusFilter === 'not_started' && p.status === 'not_started');
      const q = courseSearchQuery.toLowerCase().trim();
      const matchSearch = !q || 
        p.name.toLowerCase().includes(q) ||
        p.empId.toLowerCase().includes(q) ||
        p.role.toLowerCase().includes(q);

      return matchDept && matchStatus && matchSearch;
    });
  }, [courseSummary, courseDeptFilter, courseStatusFilter, courseSearchQuery]);

  // Computed Employee Passport
  const employeePassport = useMemo(() => {
    return getEmployeeCompetencyPassport(selectedEmpId);
  }, [selectedEmpId]);

  // Computed Factory Overview Analytics
  const overallAnalytics = useMemo(() => {
    return getOverallAuditAnalytics();
  }, []);

  // Filtered Employee List for Selector Dropdown
  const filteredEmployeeList = useMemo(() => {
    const q = empSearchQuery.toLowerCase().trim();
    if (!q) return allEmployees;
    return allEmployees.filter(e => 
      e.name.toLowerCase().includes(q) || 
      e.empId.toLowerCase().includes(q) ||
      e.department.toLowerCase().includes(q)
    );
  }, [allEmployees, empSearchQuery]);

  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="learning-container max-w-7xl py-6 space-y-8">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md bg-fuchsia-500/10 text-fuchsia-400 border border-fuchsia-500/20 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FiShield className="w-3.5 h-3.5" /> ISO 9001 Clause 7.2 & IATF 16949
            </span>
            <span className="text-xs text-slate-400 font-medium">ระบบบริหารสมรรถนะบุคลากรโรงงาน</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2.5">
            <span>ระบบติดตามผลการฝึกอบรมและตรวจรับรอง (Training Audit Matrix)</span>
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
            ศูนย์รวมข้อมูลประวัติการอบรม ผลการทดสอบ (Quiz Evaluation) อัตราความสอดคล้องตามข้อกำหนด 
            และการวิเคราะห์ทักษะสองมิติ (มุมมองหลักสูตร vs มุมมองพนักงาน) เพื่อรองรับการตรวจรับรองคุณภาพ
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 shadow-sm flex items-center gap-2 hover:-translate-y-0.5"
            title="พิมพ์รายงานรับรองการฝึกอบรมสำหรับ Auditor"
          >
            <FiPrinter className="w-4 h-4 text-cyan-400" />
            <span>พิมพ์รายงานออดิท (Print Audit Evidence)</span>
          </button>
        </div>
      </div>

      {/* Perspective Tabs Switcher */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('course')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'course'
              ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-lg shadow-fuchsia-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
          }`}
        >
          <FiLayers className="w-4 h-4" />
          <span>มุมมองตามหลักสูตร (Course-Centric View)</span>
        </button>

        <button
          onClick={() => setActiveTab('employee')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'employee'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
          }`}
        >
          <FiUser className="w-4 h-4" />
          <span>มุมมองตามพนักงาน (Competency Passport)</span>
        </button>

        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'overview'
              ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-600/20'
              : 'bg-slate-800/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700/60'
          }`}
        >
          <FiBarChart2 className="w-4 h-4" />
          <span>ภาพรวมโรงงาน & เตือนต่ออายุ (Analytics & Alerts)</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: COURSE-CENTRIC AUDIT VIEW */}
      {/* ========================================================================= */}
      {activeTab === 'course' && (
        <div className="space-y-6">
          {/* Course Selector Bar */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-slate-900 border border-slate-700 flex-shrink-0">
                <img 
                  src={courseSummary.course?.image || DEFAULT_COURSE_IMAGE} 
                  alt="Course" 
                  className="w-full h-full object-cover" 
                  onError={(e) => { e.currentTarget.src = DEFAULT_COURSE_IMAGE; }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[11px] text-fuchsia-400 font-bold uppercase tracking-wider">
                  {courseSummary.course?.category}
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white truncate">
                  {courseSummary.course?.title}
                </h2>
              </div>
            </div>

            <div className="w-full md:w-80 flex-shrink-0">
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                เลือกหลักสูตรที่ต้องการตรวจสอบ:
              </label>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-fuchsia-500 font-medium"
              >
                {allCourses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.title} ({c.category})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 4 Core KPI Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>ผู้เข้าเรียนทั้งหมด</span>
                <FiUser className="text-slate-400" />
              </div>
              <div className="text-2xl font-black text-white">
                {courseSummary.enrolledCount} <span className="text-xs text-slate-400 font-normal">/ {courseSummary.totalEmployees} คน</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                คิดเป็น {Math.round((courseSummary.enrolledCount / Math.max(1, courseSummary.totalEmployees)) * 100)}% ของพนักงานทั้งโรงงาน
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold mb-2">
                <span>ผ่านเกณฑ์ (≥80%)</span>
                <FiCheckCircle className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {courseSummary.passedCount} <span className="text-xs text-slate-400 font-normal">คน</span>
              </div>
              <div className="text-[11px] text-emerald-400/80 mt-1">
                ได้รับใบรับรองสมรรถนะอย่างเป็นทางการ
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold mb-2">
                <span>อัตราการสอบผ่าน</span>
                <FiTrendingUp className="text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-400">
                {courseSummary.passRatePercent}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                เกณฑ์เป้าหมายมาตรฐานออดิท: ≥ 85%
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold mb-2">
                <span>คะแนนสอบเฉลี่ย</span>
                <FiAward className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">
                {courseSummary.avgScorePercent}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                คะแนนเฉลี่ยจากการทำแบบทดสอบ
              </div>
            </div>
          </div>

          {/* Department Breakdown Mini-Bar */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <FiBarChart2 className="text-fuchsia-400" /> อัตราการผ่านเกณฑ์แยกตามแผนก (Department Compliance Rate)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {Object.entries(courseSummary.deptBreakdown).map(([dept, data]) => {
                const shortDept = dept.replace('แผนก', '');
                return (
                  <div key={dept} className="bg-slate-900/90 rounded-xl p-3 border border-slate-800">
                    <div className="text-xs font-medium text-slate-300 truncate" title={dept}>
                      {shortDept}
                    </div>
                    <div className="flex items-baseline justify-between mt-1 mb-1.5">
                      <span className="text-lg font-black text-white">{data.complianceRate}%</span>
                      <span className="text-[11px] text-slate-400">{data.passed}/{data.total} คน</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all ${
                          data.complianceRate >= 80 ? 'bg-emerald-500' : data.complianceRate > 0 ? 'bg-amber-500' : 'bg-slate-700'
                        }`}
                        style={{ width: `${data.complianceRate}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Filter & Search Bar for Table */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative w-full">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  placeholder="ค้นหาชื่อพนักงาน หรือ รหัสพนักงาน..."
                  className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 text-xs rounded-xl pl-9 pr-3 py-2.5 focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
              {/* Dept filter */}
              <select
                value={courseDeptFilter}
                onChange={(e) => setCourseDeptFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-fuchsia-500 font-medium"
              >
                <option value="ทั้งหมด">ทุกแผนก</option>
                {DEPARTMENTS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              {/* Status filter */}
              <select
                value={courseStatusFilter}
                onChange={(e) => setCourseStatusFilter(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-fuchsia-500 font-medium"
              >
                <option value="ทั้งหมด">สถานะทั้งหมด</option>
                <option value="passed">ผ่านเกณฑ์ (Passed)</option>
                <option value="in_progress">กำลังเรียน (In Progress)</option>
                <option value="failed">ไม่ผ่านเกณฑ์ (Failed)</option>
                <option value="not_started">ยังไม่เข้าเรียน (Not Started)</option>
              </select>
            </div>
          </div>

          {/* Participant Roster Table */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-700/80">
                  <tr>
                    <th className="py-3 px-4">พนักงาน (Trainee)</th>
                    <th className="py-3 px-4">แผนก / ตำแหน่ง</th>
                    <th className="py-3 px-4">กะงาน</th>
                    <th className="py-3 px-4 text-center">ผลการทดสอบ</th>
                    <th className="py-3 px-4">วันที่ทำแบบทดสอบ</th>
                    <th className="py-3 px-4">เลขที่ใบรับรอง (Cert ID)</th>
                    <th className="py-3 px-4 text-center">สถานะรับรอง</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 font-medium">
                  {filteredRoster.length > 0 ? (
                    filteredRoster.map(trainee => {
                      return (
                        <tr 
                          key={trainee.empId} 
                          onClick={() => navigate(`/profile/${trainee.empId}`)}
                          className="hover:bg-slate-750/70 transition-colors cursor-pointer group"
                          title={`คลิกเพื่อดูหน้าประวัติและสมรรถนะ: ${trainee.name} (${trainee.empId})`}
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <img 
                                src={trainee.avatar} 
                                alt={trainee.name} 
                                className="w-8 h-8 rounded-full object-cover border border-slate-700 flex-shrink-0 group-hover:scale-105 transition-transform" 
                              />
                              <div>
                                <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors flex items-center gap-1.5">
                                  <span>{trainee.name}</span>
                                  <FiExternalLink className="w-3 h-3 text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                <div className="text-[10px] text-fuchsia-400 font-mono">{trainee.empId}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <div className="text-slate-200">{trainee.department.replace('แผนก', '')}</div>
                            <div className="text-[10px] text-slate-400 truncate max-w-[200px]">{trainee.role}</div>
                          </td>
                          <td className="py-3 px-4 text-slate-400 text-[11px]">
                            {trainee.shift.split(' ')[0]}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {trainee.quizPercentage !== null ? (
                              <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold inline-flex items-center gap-1 ${
                                trainee.passed 
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {trainee.scoreDisplay}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-300 text-[11px]">
                            {trainee.completedDate}
                          </td>
                          <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                            {trainee.certificateId !== '-' ? (
                              <span className="text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                                {trainee.certificateId}
                              </span>
                            ) : '-'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            {trainee.passed ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                                <FiCheck className="w-3 h-3" /> ผ่านเกณฑ์
                              </span>
                            ) : trainee.status === 'in_progress' ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                                <FiClock className="w-3 h-3" /> กำลังเรียน
                              </span>
                            ) : trainee.status === 'failed' || (trainee.quizPercentage !== null && !trainee.passed) ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                                <FiX className="w-3 h-3" /> ต้องสอบใหม่
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
                                ยังไม่เข้าเรียน
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไขการค้นหา
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Question Difficulty & Mistake Analysis Box */}
          {courseSummary.quizAnalytics && courseSummary.quizAnalytics.length > 0 && (
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <FiAlertCircle className="text-amber-400" />
                    <span>การวิเคราะห์ข้อสอบและจุดที่พนักงานตอบผิดบ่อย (Quiz Difficulty Analysis)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    ข้อมูลเชิงลึกสำหรับหัวหน้างานและวิศวกร เพื่อนำไปปรับปรุงเนื้อหาคู่มือและเน้นย้ำในการบรรยายหน้างานจริง
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                {courseSummary.quizAnalytics.map((q, idx) => (
                  <div key={q.id || idx} className="bg-slate-900/90 rounded-xl p-4 border border-slate-700/80 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                          ข้อที่ {idx + 1}
                        </span>
                        <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                          q.passRatePercent >= 85 
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        }`}>
                          ตอบถูก {q.passRatePercent}%
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white leading-relaxed mb-2">
                        {q.question}
                      </h4>
                      <div className="text-[11px] text-slate-300 bg-slate-800/60 p-2 rounded-lg border border-slate-700/40 mb-2">
                        <strong className="text-emerald-400">คำตอบที่ถูกต้อง:</strong> {q.correctOption}
                      </div>
                    </div>
                    <div className="text-[10px] text-amber-300/90 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20 mt-2">
                      💡 {q.insight}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: EMPLOYEE-CENTRIC VIEW (COMPETENCY PASSPORT) */}
      {/* ========================================================================= */}
      {activeTab === 'employee' && (
        <div className="space-y-6">
          {/* Employee Selector Bar */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 sm:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
            <div className="flex items-center gap-3 w-full md:w-auto">
              <img 
                src={employeePassport.employee.avatar} 
                alt={employeePassport.employee.name} 
                className="w-14 h-14 rounded-2xl object-cover border-2 border-cyan-500/60 shadow-md flex-shrink-0" 
              />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white truncate">
                    {employeePassport.employee.name}
                  </h2>
                  <span className="font-mono text-xs text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                    {employeePassport.employee.empId}
                  </span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  {employeePassport.employee.role}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {employeePassport.employee.department} · {employeePassport.employee.shift}
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${employeePassport.employee.empId}`)}
                  className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold transition-colors"
                >
                  <FiExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดดูหน้าประวัติเต็มและพิมพ์ Passport</span>
                </button>
              </div>
            </div>

            <div className="w-full md:w-80 flex-shrink-0">
              <label className="text-[11px] font-bold text-slate-400 mb-1 block">
                เลือกพนักงานเพื่อดูสมรรถนะ:
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:border-cyan-500 font-medium"
              >
                {allEmployees.map(emp => (
                  <option key={emp.empId} value={emp.empId}>
                    {emp.name} ({emp.empId} - {emp.department.replace('แผนก', '')})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Competency Overview Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>ความสอดคล้องตามเกณฑ์ตำแหน่ง</span>
                <FiShield className="text-cyan-400" />
              </div>
              <div className="text-2xl font-black text-cyan-400">
                {employeePassport.complianceRate}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                ผ่าน {employeePassport.mandatoryPassedCount} จาก {employeePassport.mandatoryCoursesCount} หลักสูตรบังคับ
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-emerald-400 text-xs font-semibold mb-2">
                <span>หลักสูตรที่ผ่านการอบรม</span>
                <FiAward className="text-emerald-400" />
              </div>
              <div className="text-2xl font-black text-emerald-400">
                {employeePassport.totalPassedCount} <span className="text-xs text-slate-400 font-normal">/ {employeePassport.totalCoursesCount} หลักสูตร</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                รวมหลักสูตรบังคับและเลือกเสรี
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold mb-2">
                <span>คะแนนสอบเฉลี่ยสะสม</span>
                <FiAward className="text-amber-400" />
              </div>
              <div className="text-2xl font-black text-amber-400">
                {employeePassport.avgScorePercent}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                เกณฑ์ผ่านแต่ละวิชา: ≥ 80%
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold mb-2">
                <span className="text-slate-400">สถานะการตรวจรับรอง</span>
                <FiCheckCircle className="text-emerald-400" />
              </div>
              <div>
                {employeePassport.isAuditReady ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-black">
                    <FiCheck className="w-3.5 h-3.5" /> พร้อมรับออดิท 100%
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-black">
                    <FiAlertTriangle className="w-3.5 h-3.5" /> ต้องอบรมเพิ่ม ({employeePassport.skillGaps.length} วิชา)
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400 mt-1.5">
                ISO 9001 / IATF 16949 Clause 7.2
              </div>
            </div>
          </div>

          {/* Skill Gap Alert Box (if missing mandatory courses) */}
          {employeePassport.skillGaps.length > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-rose-300 font-bold text-sm">
                <FiAlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
                <span>ตรวจพบช่องว่างสมรรถนะ (Competency Gap Detected): หลักสูตรบังคับที่ยังไม่ผ่านเกณฑ์</span>
              </div>
              <p className="text-xs text-rose-200/80 leading-relaxed">
                ตามข้อกำหนดมาตรฐานคุณภาพ แผนก {employeePassport.employee.department} จำเป็นต้องผ่านหลักสูตรเหล่านี้ก่อนปฏิบัติงาน:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                {employeePassport.skillGaps.map(gap => (
                  <div key={gap.courseId} className="bg-slate-900/90 border border-rose-500/20 rounded-xl p-3 flex items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white text-xs">{gap.title}</div>
                      <div className="text-[10px] text-slate-400">{gap.category} · {gap.duration}</div>
                    </div>
                    <button
                      onClick={() => navigate(`/course/${gap.courseId}`)}
                      className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold transition-colors whitespace-nowrap flex-shrink-0 shadow-sm"
                    >
                      เริ่มเรียนทันที
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Retraining Expiration Alert (if expiring within 60 days) */}
          {employeePassport.expiringAlerts.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                <FiClock className="w-5 h-5 text-amber-400 flex-shrink-0" />
                <span>แจ้งเตือนหลักสูตรใกล้หมดอายุรอบปี (Annual Retraining Due)</span>
              </div>
              <p className="text-xs text-amber-200/80">
                ใบรับรองต่อไปนี้มีอายุเหลือไม่ถึง 60 วัน กรุณาทำการสอบทบทวน (Refresher Exam) เพื่อรักษาสมรรถนะ:
              </p>
              <div className="space-y-2">
                {employeePassport.expiringAlerts.map(alert => (
                  <div key={alert.courseId} className="bg-slate-900/90 border border-amber-500/20 rounded-xl p-3 flex items-center justify-between">
                    <div>
                      <span className="text-xs font-bold text-white">{alert.title}</span>
                      <span className="text-[10px] text-slate-400 ml-2">ใบรับรอง: {alert.certificateId}</span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold">
                      เหลืออีก {alert.daysRemaining} วัน
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Employee Course Record Table */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FiFileText className="text-cyan-400" />
                <span>ประวัติการฝึกอบรมและสถานะสมรรถนะรายวิชา (Full Training Transcript)</span>
              </h3>
              <span className="text-xs text-slate-400">
                ทั้งหมด {employeePassport.courseStatusList.length} รายการ
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-700/80">
                  <tr>
                    <th className="py-3 px-4">ชื่อหลักสูตร (Course Title)</th>
                    <th className="py-3 px-4">หมวดหมู่</th>
                    <th className="py-3 px-4 text-center">ประเภท</th>
                    <th className="py-3 px-4 text-center">คะแนนสอบ</th>
                    <th className="py-3 px-4">วันที่อบรมเสร็จ</th>
                    <th className="py-3 px-4">อายุใบรับรอง (Valid Until)</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                    <th className="py-3 px-4 text-center">การปฏิบัติ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 font-medium">
                  {employeePassport.courseStatusList.map(item => (
                    <tr key={item.courseId} className="hover:bg-slate-750/50 transition-colors">
                      <td className="py-3 px-4 font-bold text-white">
                        {item.title}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {item.category}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.isMandatory ? (
                          <span className="px-2 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30 text-[10px] font-bold">
                            บังคับ (Mandatory)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-slate-700 text-slate-300 text-[10px]">
                            ทั่วไป
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.quizPercentage !== null ? (
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            item.passed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                          }`}>
                            {item.quizPercentage}%
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-300 text-[11px]">
                        {item.completedDate}
                      </td>
                      <td className="py-3 px-4 text-[11px]">
                        {item.expiresAt ? (
                          <span className={`${item.daysRemaining !== null && item.daysRemaining <= 60 ? 'text-amber-400 font-bold' : 'text-slate-400'}`}>
                            {new Date(item.expiresAt).toLocaleDateString('th-TH')}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {item.passed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                            <FiCheck className="w-3 h-3" /> ผ่านเกณฑ์
                          </span>
                        ) : item.status === 'in_progress' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 text-[11px] font-bold">
                            <FiClock className="w-3 h-3" /> กำลังเรียน
                          </span>
                        ) : item.status === 'failed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                            <FiX className="w-3 h-3" /> ต้องสอบใหม่
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[11px]">
                            ยังไม่เข้าเรียน
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => navigate(`/course/${item.courseId}`)}
                          className="px-2.5 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-[11px] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <span>ดูเนื้อหา</span>
                          <FiChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: EXECUTIVE FACTORY OVERVIEW & RETRAINING ALERTS */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Top High-level Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-slate-400 text-xs font-semibold mb-2">
                <span>บุคลากรในระบบทั้งหมด</span>
                <FiUser className="text-fuchsia-400" />
              </div>
              <div className="text-3xl font-black text-white">
                {overallAnalytics.totalEmployees} <span className="text-sm font-normal text-slate-400">คน</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">ครอบคลุม 5 แผนกหลักในสายการผลิต</div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-cyan-400 text-xs font-semibold mb-2">
                <span>ใบรับรองสมรรถนะที่ออกแล้ว</span>
                <FiAward className="text-cyan-400" />
              </div>
              <div className="text-3xl font-black text-cyan-400">
                {overallAnalytics.totalCertificatesIssued} <span className="text-sm font-normal text-slate-400">ฉบับ</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">มีผลรับรองตามข้อกำหนดระบบคุณภาพ</div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-amber-400 text-xs font-semibold mb-2">
                <span>แจ้งเตือนต้องอบรมทบทวน</span>
                <FiClock className="text-amber-400" />
              </div>
              <div className="text-3xl font-black text-amber-400">
                {overallAnalytics.expiringList.length} <span className="text-sm font-normal text-slate-400">รายการ</span>
              </div>
              <div className="text-xs text-slate-400 mt-1">ใบรับรองหมดอายุหรือเหลือ &lt; 60 วัน</div>
            </div>
          </div>

          {/* Department Compliance Rates */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-6 shadow-md space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FiBarChart2 className="text-fuchsia-400" />
              <span>อัตราความพร้อมรับการตรวจประเมินแยกตามฝ่าย (Department Compliance Matrix)</span>
            </h3>
            <p className="text-xs text-slate-400">
              คำนวณจากสัดส่วนพนักงานที่ผ่านหลักสูตรบังคับประจำตำแหน่งครบถ้วนตามเกณฑ์ ISO 9001 Clause 7.2
            </p>

            <div className="space-y-4 pt-2">
              {overallAnalytics.deptSummaries.map(dept => (
                <div key={dept.department} className="bg-slate-900/90 rounded-xl p-4 border border-slate-800">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                    <div>
                      <span className="font-bold text-white text-sm">{dept.department}</span>
                      <span className="text-xs text-slate-400 ml-2">({dept.totalEmployees} คน)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-black text-white">{dept.complianceRate}%</span>
                      {dept.isTargetAchieved ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          ผ่านเป้าหมาย (≥85%)
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          กำลังเร่งรัด
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-500 ${
                        dept.complianceRate >= 85 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                      }`}
                      style={{ width: `${dept.complianceRate}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Retraining Expiration Alert Master List */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl overflow-hidden shadow-xl">
            <div className="px-5 py-4 border-b border-slate-700/80 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FiAlertTriangle className="text-amber-400" />
                <span>ตารางติดตามการอบรมทบทวนประจำปี (Annual Retraining & Recertification Schedule)</span>
              </h3>
              <span className="text-xs text-amber-400 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full border border-amber-500/20">
                เตือนล่วงหน้า 60 วัน
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-900/90 text-slate-400 font-semibold uppercase tracking-wider text-[11px] border-b border-slate-700/80">
                  <tr>
                    <th className="py-3 px-4">รหัสพนักงาน</th>
                    <th className="py-3 px-4">ชื่อ-สกุล</th>
                    <th className="py-3 px-4">แผนก</th>
                    <th className="py-3 px-4">หลักสูตรที่ต้องทบทวน</th>
                    <th className="py-3 px-4">หมายเลขใบรับรองเดิม</th>
                    <th className="py-3 px-4 text-center">ระยะเวลาคงเหลือ</th>
                    <th className="py-3 px-4 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/60 font-medium">
                  {overallAnalytics.expiringList.length > 0 ? (
                    overallAnalytics.expiringList.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-750/50">
                        <td className="py-3 px-4 font-mono text-fuchsia-400 font-bold">
                          {item.empId}
                        </td>
                        <td className="py-3 px-4 font-bold text-white">
                          {item.empName}
                        </td>
                        <td className="py-3 px-4 text-slate-400">
                          {item.department.replace('แผนก', '')}
                        </td>
                        <td className="py-3 px-4 text-slate-200">
                          {item.courseTitle}
                        </td>
                        <td className="py-3 px-4 font-mono text-cyan-400">
                          {item.certificateId}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-amber-300">
                          {item.daysRemaining > 0 ? `เหลือ ${item.daysRemaining} วัน` : 'หมดอายุแล้ว'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {item.isExpired ? (
                            <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold border border-rose-500/30">
                              เกินกำหนด (Overdue)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                              ต้องจัดอบรมซ้ำ
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="7" className="py-8 text-center text-slate-400">
                        ไม่มีหลักสูตรที่หมดอายุหรือใกล้หมดอายุในระยะ 60 วันนี้
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PRINT AUDIT REPORT MODAL (OFFICIAL ISO 9001:2015 CLAUSE 7.2 SHEET) */}
      {/* ========================================================================= */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <FiPrinter className="text-cyan-400" />
                <span>ตัวอย่างเอกสารบันทึกการฝึกอบรม (Official Audit Evidence Print Sheet)</span>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Printable Content Area */}
            <div className="p-6 overflow-y-auto space-y-6 bg-white text-slate-900 font-sans text-xs">
              {/* Document Header */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <div className="text-base font-black text-slate-900 tracking-tight">
                    บริษัท เอสเอ็นซี ฟอร์เมอร์ จำกัด (มหาชน) — SNC Former Public Co., Ltd.
                  </div>
                  <div className="text-xs font-bold text-slate-700 mt-0.5">
                    แบบบันทึกประวัติการฝึกอบรมและประเมินผลสมรรถนะบุคลากร (Training Record & Competence Evaluation)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    อ้างอิงข้อกำหนด: ISO 9001:2015 Clause 7.2 (Competence) / IATF 16949 / ลูกค้า Lowes, Walmart, Daikin
                  </div>
                </div>
                <div className="text-right text-[10px] text-slate-600 font-mono">
                  <div>รหัสเอกสาร: FM-HR-072-01</div>
                  <div>แก้ไขครั้งที่: 04</div>
                  <div>วันที่พิมพ์: {new Date().toLocaleDateString('th-TH')}</div>
                </div>
              </div>

              {/* Course Info Summary in Print Sheet */}
              <div className="grid grid-cols-2 gap-4 bg-slate-100 p-3 rounded-lg border border-slate-300">
                <div>
                  <div><strong>ชื่อหลักสูตร:</strong> {courseSummary.course?.title}</div>
                  <div><strong>หมวดหมู่:</strong> {courseSummary.course?.category}</div>
                  <div><strong>ระยะเวลาการอบรม:</strong> {courseSummary.course?.duration}</div>
                </div>
                <div>
                  <div><strong>ผู้สอน/ผู้อนุมัติเนื้อหา:</strong> {courseSummary.course?.instructor}</div>
                  <div><strong>จำนวนผู้เข้ารับการอบรม:</strong> {courseSummary.enrolledCount} คน (ผ่านเกณฑ์ {courseSummary.passedCount} คน)</div>
                  <div><strong>อัตราการสอบผ่านเฉลี่ย:</strong> {courseSummary.passRatePercent}% (คะแนนเฉลี่ย {courseSummary.avgScorePercent}%)</div>
                </div>
              </div>

              {/* Trainee Table */}
              <div>
                <div className="font-bold text-slate-800 mb-2">รายชื่อพนักงานและผลการประเมินสมรรถนะ:</div>
                <table className="w-full border-collapse border border-slate-400 text-[11px]">
                  <thead>
                    <tr className="bg-slate-200 text-slate-800 text-center font-bold">
                      <th className="border border-slate-400 p-1.5 w-10">ลำดับ</th>
                      <th className="border border-slate-400 p-1.5 w-24">รหัสพนักงาน</th>
                      <th className="border border-slate-400 p-1.5 text-left">ชื่อ-นามสกุล</th>
                      <th className="border border-slate-400 p-1.5 text-left">แผนก / ตำแหน่ง</th>
                      <th className="border border-slate-400 p-1.5 w-24">คะแนนทดสอบ</th>
                      <th className="border border-slate-400 p-1.5 w-24">ผลการประเมิน</th>
                      <th className="border border-slate-400 p-1.5 w-32">เลขที่ใบรับรอง</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courseSummary.participantRoster.slice(0, 15).map((t, idx) => (
                      <tr key={t.empId} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="border border-slate-400 p-1.5 text-center">{idx + 1}</td>
                        <td className="border border-slate-400 p-1.5 text-center font-mono">{t.empId}</td>
                        <td className="border border-slate-400 p-1.5 font-semibold">{t.name}</td>
                        <td className="border border-slate-400 p-1.5">{t.department.replace('แผนก', '')}</td>
                        <td className="border border-slate-400 p-1.5 text-center">{t.scoreDisplay}</td>
                        <td className="border border-slate-400 p-1.5 text-center font-bold">
                          {t.passed ? 'ผ่านเกณฑ์ (Pass)' : t.status === 'in_progress' ? 'กำลังเรียน' : 'ไม่ผ่าน (Fail)'}
                        </td>
                        <td className="border border-slate-400 p-1.5 text-center font-mono text-[10px]">
                          {t.certificateId}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Formal Sign-off Section */}
              <div className="pt-6 grid grid-cols-3 gap-6 text-center border-t border-slate-300">
                <div className="space-y-8">
                  <div className="text-[10px] text-slate-500">ลงชื่อผู้ฝึกสอน / วิทยากร</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                  <div className="text-[11px] font-bold text-slate-800">
                    (......................................................)
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">วิทยากรประจำหลักสูตร</div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="text-[10px] text-slate-500">ลงชื่อหัวหน้างานต้นสังกัด</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                  <div className="text-[11px] font-bold text-slate-800">
                    (......................................................)
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">Supervisor / Line Leader</div>
                  </div>
                </div>

                <div className="space-y-8">
                  <div className="text-[10px] text-slate-500">ผู้จัดการฝ่ายควบคุมคุณภาพ / ตัวแทนออดิท</div>
                  <div className="border-b border-dotted border-slate-400 w-3/4 mx-auto"></div>
                  <div className="text-[11px] font-bold text-slate-800">
                    (......................................................)
                    <div className="text-[10px] text-slate-500 font-normal mt-0.5">QA Manager / ISO Lead Auditor</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-800 border-t border-slate-700 flex items-center justify-end gap-3">
              <button
                onClick={() => setIsPrintModalOpen(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-xs font-semibold"
              >
                ปิดหน้าต่าง
              </button>
              <button
                onClick={handleTriggerPrint}
                className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-cyan-600/30"
              >
                <FiPrinter className="w-4 h-4" />
                <span>สั่งพิมพ์เอกสาร (Print Window)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

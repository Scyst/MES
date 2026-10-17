import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getEmployeeCompetencyPassport } from '../data/trainingAuditStore';
import { getCurrentUser, fetchRealUserSession } from '../data/communityStore';
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

  useEffect(() => {
    fetchRealUserSession().then(u => {
      if (u) setCurrentUser(u);
    });
  }, []);

  // Compute passport data based on URL parameter or current logged in user
  const passport = useMemo(() => {
    return getEmployeeCompetencyPassport(empId || currentUser.emp_id || currentUser.id);
  }, [empId, currentUser]);

  const { employee, currentUserIsMe, rank, exp, userPosts, totalLikesReceived } = passport;

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
    <div className="learning-container max-w-6xl py-6 space-y-8">
      {/* Top Breadcrumb & Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(-1)}
          className={`inline-flex items-center gap-2 text-xs sm:text-sm transition-colors ${
            isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900 font-medium'
          }`}
        >
          <FiArrowLeft /> ย้อนกลับ
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPrintModalOpen(true)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-colors shadow-sm ${
              isDark
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700'
                : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300'
            }`}
          >
            <FiPrinter className="w-3.5 h-3.5 text-cyan-500" />
            <span>พิมพ์พาสปอร์ตสมรรถนะ (Print Passport)</span>
          </button>
        </div>
      </div>

      {/* Industrial Plant ID Card / Employee Hero Badge */}
      <div className={`relative rounded-3xl p-6 sm:p-8 shadow-xl overflow-hidden border transition-all ${
        isDark
          ? 'bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-slate-700/80 shadow-2xl'
          : 'bg-white border-slate-200 shadow-md'
      }`}>
        {/* Ambient Corner Glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-fuchsia-600/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          {/* Avatar and Identity */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            <div className="relative flex-shrink-0">
              <img
                src={employee.avatar || DEFAULT_AVATAR}
                alt={employee.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-fuchsia-500/60 shadow-xl"
                onError={(e) => { e.currentTarget.src = DEFAULT_AVATAR; }}
              />
              <span className="absolute -bottom-2 -right-2 text-2xl sm:text-3xl filter drop-shadow-md" title={rank.name}>
                {rank.badge}
              </span>
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {employee.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-lg font-mono text-xs font-bold ${
                  isDark ? 'bg-slate-800 border border-slate-700 text-fuchsia-400 shadow-inner' : 'bg-slate-100 border border-slate-200 text-fuchsia-700'
                }`}>
                  {employee.empId}
                </span>
                {currentUserIsMe && (
                  <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                    isDark ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30' : 'bg-fuchsia-50 text-fuchsia-800 border-fuchsia-200'
                  }`}>
                    บัญชีของคุณ
                  </span>
                )}
                {currentUser.isLoggedInReal && currentUserIsMe && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                    isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  }`}>
                    MES Live
                  </span>
                )}
              </div>

              <div className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {employee.role}
              </div>

              <div className={`text-xs flex flex-wrap items-center gap-x-4 gap-y-1 ${isDark ? 'text-slate-400' : 'text-slate-600 font-medium'}`}>
                <span>🏢 {employee.department}</span>
                <span>⏱️ {employee.shift}</span>
                {employee.joinedDate && <span>📅 เริ่มงาน: {new Date(employee.joinedDate).toLocaleDateString('th-TH')}</span>}
              </div>

              {/* Gamification Rank & EXP Progress Bar */}
              <div className="pt-2 flex flex-col sm:flex-row sm:items-center gap-3">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold text-white bg-gradient-to-r ${rank.color} border border-white/20 shadow-sm self-start sm:self-auto`}>
                  Lv.{rank.level} {rank.name}
                </span>

                <div className="flex items-center gap-2.5">
                  <div className={`w-40 sm:w-48 rounded-full h-2 overflow-hidden border ${isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-200 border-slate-300'}`}>
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

          {/* Right Status Badge */}
          <div className={`flex flex-col sm:flex-row lg:flex-col items-start lg:items-end gap-3 w-full lg:w-auto pt-4 lg:pt-0 border-t lg:border-t-0 ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
            <div className="text-left lg:text-right">
              <div className={`text-[11px] font-medium uppercase tracking-wider mb-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                สถานะความสอดคล้อง ISO 9001 Clause 7.2
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
                  <span>ต้องอบรมเพิ่ม ({passport.skillGaps.length} วิชา)</span>
                </div>
              )}
            </div>

            <Link
              to="/audit"
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 transition-colors ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white border-slate-700' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-800 border-slate-300 hover:border-slate-400 shadow-sm'
              }`}
            >
              <FiShield className="w-3.5 h-3.5 text-cyan-500" />
              <span>เปิดตรวจสอบใน Audit Matrix</span>
            </Link>
          </div>
        </div>
      </div>

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
    </div>
  );
}

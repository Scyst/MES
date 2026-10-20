import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getAllMergedCourses, getCurrentUser } from '../data/communityStore';
import { getUserCourseStatus } from '../data/trainingAuditStore';
import { DEFAULT_COURSE_IMAGE } from '../data/offlineAssets';
import { 
  FiClock, 
  FiUser, 
  FiPlayCircle, 
  FiSearch, 
  FiLayers, 
  FiX,
  FiPlus,
  FiAward,
  FiStar,
  FiEdit2,
  FiCheck,
  FiTool
} from 'react-icons/fi';

const CATEGORIES = [
  'ทั้งหมด',
  'เครื่องจักรและวิศวกรรมการผลิต',
  'โปรแกรมและระบบดิจิทัล',
  'ขั้นตอนการทำงานและระบบมาตรฐาน',
  'การตรวจโรงงานและเอกสารลูกค้า',
  'กรณีศึกษาหน้างานจริง',
  'การบริหารและการเพิ่มผลผลิต'
];

export default function Catalog() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  React.useEffect(() => {
    const handleUserUpdated = (e) => {
      if (e.detail) {
        setCurrentUser(e.detail);
      }
    };
    window.addEventListener('mes-user-updated', handleUserUpdated);
    return () => window.removeEventListener('mes-user-updated', handleUserUpdated);
  }, []);

  // Combine static official courses with custom-built and promoted courses
  const allCourses = useMemo(() => {
    return getAllMergedCourses();
  }, []);

  // Calculate total modules across all courses
  const totalModulesCount = useMemo(() => {
    return allCourses.reduce((acc, c) => acc + (c.modules?.length || 0), 0);
  }, [allCourses]);

  // Filtered courses based on category and search query
  const filteredCourses = useMemo(() => {
    return allCourses.filter(course => {
      const matchesCategory = selectedCategory === 'ทั้งหมด' || course.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        (course.instructor && course.instructor.toLowerCase().includes(q)) ||
        course.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [allCourses, selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { 'ทั้งหมด': allCourses.length };
    CATEGORIES.forEach(cat => {
      if (cat !== 'ทั้งหมด') {
        counts[cat] = allCourses.filter(c => c.category === cat).length;
      }
    });
    return counts;
  }, [allCourses]);

  return (
    <div className="learning-container py-6 space-y-6">
      {/* Unified Page Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h1 className={`text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-2.5 ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <FiLayers className="text-fuchsia-500 flex-shrink-0" />
            <span>หลักสูตรมาตรฐานโรงงาน (Standard Curriculum)</span>
          </h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            คลังคู่มือปฏิบัติงาน ระบบเครื่องจักร มาตรฐานคุณภาพ และสื่อการเรียนรู้เพื่อรับรองสมรรถนะพนักงาน
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Compact Stats Pill */}
          <div className={`flex items-center gap-3 px-4 py-2 rounded-xl border text-xs font-semibold ${
            isDark ? 'bg-slate-800/80 border-slate-700/80 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
          }`}>
            <span>หลักสูตร <strong className="text-fuchsia-500 font-black">{allCourses.length}</strong> วิชา</span>
            <span className={isDark ? 'text-slate-600' : 'text-slate-300'}>|</span>
            <span>เนื้อหา <strong className="text-cyan-500 font-black">{totalModulesCount}</strong> บทเรียน</span>
          </div>

          {currentUser?.isLoggedInReal && (
            <button
              type="button"
              onClick={() => navigate('/admin/course-builder')}
              className="px-4 py-2.5 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-fuchsia-600/20 inline-flex items-center gap-2 hover:-translate-y-0.5"
              title="สร้างหรือจัดการหลักสูตรมาตรฐานโรงงาน"
            >
              <FiPlus className="w-4 h-4" />
              <span>สร้างหลักสูตรใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* Unified Search & Category Filter Bar */}
      <div className="space-y-3">
        <div className="relative max-w-xl">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="ค้นหาคู่มือเครื่องจักร, โปรแกรมระบบ, SOP, มาตรฐาน ISO, ผู้สอน..."
            className={`w-full border rounded-xl pl-11 pr-10 py-2.5 text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors shadow-sm ${
              isDark 
                ? 'bg-slate-800/90 border-slate-700 text-slate-200 placeholder-slate-400' 
                : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
            }`}
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
              title="ล้างข้อความค้นหา"
            >
              <FiX className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {CATEGORIES.map(category => {
            const count = categoryCounts[category] || 0;
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none border ${
                  isActive
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-md shadow-fuchsia-500/20 border-transparent'
                    : (isDark 
                        ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700/80' 
                        : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200 shadow-sm')
                }`}
              >
                <span>{category}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                  isActive 
                    ? 'bg-black/30 text-white' 
                    : (isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-100 text-slate-700 font-semibold')
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="course-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map(course => {
            const userStatus = getUserCourseStatus(course.id);
            const isDone = userStatus.passed || userStatus.status === 'completed';
            const inProgress = !isDone && userStatus.progressPercent > 0;

            return (
              <div 
                key={course.id} 
                className="course-card group cursor-pointer relative bg-slate-800/90 rounded-2xl overflow-hidden border border-slate-700/80 hover:border-fuchsia-500/50 transition-all hover:shadow-xl hover:shadow-fuchsia-500/10 hover:-translate-y-1 flex flex-col justify-between"
                onClick={() => navigate(`/course/${course.id}`)}
              >
                <div className="card-image-wrap relative h-48 w-full overflow-hidden bg-slate-950 flex-shrink-0 border-b border-slate-700/60">
                  <img 
                    src={course.image || DEFAULT_COURSE_IMAGE} 
                    alt={course.title} 
                    className="card-image w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    onError={(e) => { e.currentTarget.src = DEFAULT_COURSE_IMAGE; }}
                  />
                  <div className="card-badge absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-fuchsia-300 text-[11px] font-bold px-3 py-1 rounded-full border border-fuchsia-500/30 shadow-md z-10">{course.category}</div>
                  
                  {/* Top Right Badges */}
                  <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 z-10">
                    {isDone ? (
                      <div className="bg-emerald-500/95 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 backdrop-blur-sm">
                        <FiCheck className="w-3.5 h-3.5" /> ผ่านแล้ว 100%
                      </div>
                    ) : inProgress ? (
                      <div className="bg-fuchsia-600/95 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 backdrop-blur-sm font-mono">
                        กำลังเรียน {userStatus.progressPercent}%
                      </div>
                    ) : course.isPromotedFromCommunity ? (
                      <div className="bg-amber-500/95 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 backdrop-blur-sm">
                        <FiStar className="w-3 h-3" /> ยกระดับจากหน้างาน
                      </div>
                    ) : course.isCustomBuilt ? (
                      <div className="bg-fuchsia-600/95 text-white px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 backdrop-blur-sm">
                        <FiAward className="w-3 h-3" /> หลักสูตรใหม่
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="card-content p-5 flex flex-col justify-between flex-1">
                  <div>
                    <h3 className="card-title text-base font-bold text-white mb-2 line-clamp-2 leading-snug group-hover:text-fuchsia-400 transition-colors">
                      {course.title}
                    </h3>
                    <p className="card-desc text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">{course.description}</p>
                  </div>
                  <div>
                    <div className="card-meta flex items-center justify-between text-xs text-slate-400 font-medium mb-3">
                      <span className="flex items-center gap-1 truncate max-w-[55%]">
                        <FiUser className="text-slate-500 flex-shrink-0" />
                        <span className="truncate">{course.instructor}</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <FiClock className="text-slate-500" />
                        <span>{course.duration}</span>
                      </span>
                    </div>

                    {/* Progress Bar if in-progress */}
                    {inProgress && (
                      <div className="mb-3">
                        <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-gradient-to-r from-fuchsia-500 to-violet-500 h-full rounded-full transition-all"
                            style={{ width: `${userStatus.progressPercent}%` }}
                          ></div>
                        </div>
                      </div>
                    )}

                    <div className="card-footer mt-auto pt-3 border-t border-slate-700/80 flex items-center justify-between text-xs">
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <FiLayers className={isDone ? "text-emerald-400" : "text-fuchsia-400"} />
                        <span>{course.modules?.length || 0} บทเรียน</span>
                      </span>
                      <div className="flex items-center gap-2">
                        {currentUser?.isLoggedInReal && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/admin/course-builder?courseId=${course.id}`);
                            }}
                            className="px-2 py-1 bg-slate-700/60 hover:bg-amber-500/20 hover:text-amber-300 text-slate-400 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1"
                            title="แก้ไขข้อมูลหลักสูตรนี้"
                          >
                            <FiEdit2 className="w-3 h-3" />
                            <span>แก้ไข</span>
                          </button>
                        )}
                        <span className={`text-xs font-bold flex items-center gap-1 ${
                          isDone 
                            ? 'text-emerald-400 group-hover:text-emerald-300' 
                            : inProgress
                              ? 'text-cyan-400 group-hover:text-cyan-300'
                              : 'text-fuchsia-400 group-hover:text-fuchsia-300'
                        }`}>
                          <span>{isDone ? 'ทบทวนบทเรียน' : inProgress ? 'เรียนต่อ' : 'เริ่มเรียน'}</span>
                          <FiPlayCircle className="text-base" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-800/50 rounded-2xl border border-slate-700 my-8">
          <FiLayers className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200 mb-1">ไม่พบหลักสูตรที่ตรงกับคำค้นหา</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
            ลองปรับเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นเพื่อดูหลักสูตรทั้งหมด
          </p>
          <button 
            onClick={() => { setSelectedCategory('ทั้งหมด'); setSearchQuery(''); }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            ล้างตัวกรองทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}

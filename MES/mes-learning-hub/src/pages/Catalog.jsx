import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { getAllMergedCourses, getCurrentUser } from '../data/communityStore';
import { getUserCourseStatus } from '../data/trainingAuditStore';
import { DEFAULT_COURSE_IMAGE } from '../data/offlineAssets';
import { CURATED_TRACKS } from '../data/courses';
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
  FiTool,
  FiCpu,
  FiShield,
  FiFilter,
  FiTrendingUp,
  FiCheckCircle,
  FiChevronRight,
  FiTag,
  FiArrowRight,
  FiBookmark
} from 'react-icons/fi';

const MAIN_CATEGORIES = [
  'ทั้งหมด',
  'เครื่องจักรและวิศวกรรมการผลิต',
  'โปรแกรมและระบบดิจิทัล',
  'ขั้นตอนการทำงานและระบบมาตรฐาน',
  'การตรวจโรงงานและเอกสารลูกค้า',
  'เปิดรับรองบุคคลภายนอก'
];

const SUB_CATEGORY_PILLS = [
  { id: 'all', label: 'ทั้งหมด (All)', tag: null },
  { id: 'advanced-skills', label: '✨ ทักษะวิชาชีพขั้นสูง (Advanced Skills)', tag: 'ทักษะวิชาชีพขั้นสูง' },
  { id: 'robotics', label: '🤖 หุ่นยนต์ & AI Vision', tag: 'ระบบอัตโนมัติและหุ่นยนต์' },
  { id: 'tooling', label: '⚙️ วิศวกรรมแม่พิมพ์ & CNC', tag: 'วิศวกรรมเครื่องจักรและแม่พิมพ์' },
  { id: 'iso', label: '📜 มาตรฐาน ISO & การตรวจประเมิน', tag: 'มาตรฐานสากลและการตรวจประเมิน' },
  { id: 'public', label: '🌐 เปิดบุคคลภายนอก (Public)', tag: 'เปิดรับรองบุคคลภายนอก' },
  { id: 'in-progress', label: '⏳ กำลังเรียนอยู่ (In Progress)', isStatus: 'in-progress' },
  { id: 'completed', label: '✓ ผ่านแล้ว (Completed)', isStatus: 'completed' }
];

const SORT_OPTIONS = [
  { id: 'featured', label: '⭐ แนะนำพิเศษ (Featured)' },
  { id: 'in-progress-first', label: '⏳ กำลังเรียนอยู่ขึ้นก่อน' },
  { id: 'name-asc', label: '🔤 ชื่อหลักสูตร (A-Z / ก-ฮ)' },
  { id: 'duration-desc', label: '⏱️ ระยะเวลาเรียน (มากไปน้อย)' },
  { id: 'category', label: '📂 แยกตามหมวดหมู่ (Category)' }
];

export default function Catalog() {
  const { isDark } = useTheme();
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [selectedSubCategory, setSelectedSubCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('featured');
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());

  useEffect(() => {
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

  // Featured flagship courses for Hero Spotlight
  const flagshipCourses = useMemo(() => {
    return allCourses.filter(c => c.id === 'c-robot-automation' || c.id === 'c-machine-vision');
  }, [allCourses]);

  // Helper to parse duration hours
  const parseHours = (durationStr = '') => {
    const match = durationStr.match(/(\d+(\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  };

  // Filtered and sorted courses
  const processedCourses = useMemo(() => {
    let result = allCourses.filter(course => {
      // 1. Main Category filter
      let matchesMainCat = true;
      if (selectedCategory !== 'ทั้งหมด') {
        if (selectedCategory === 'เปิดรับรองบุคคลภายนอก') {
          matchesMainCat = Boolean(course.isPublicEligible || course.subCategories?.includes('เปิดรับรองบุคคลภายนอก'));
        } else {
          matchesMainCat = course.category === selectedCategory;
        }
      }

      // 2. Sub-Category / Status pill filter
      let matchesSub = true;
      if (selectedSubCategory !== 'all') {
        const pill = SUB_CATEGORY_PILLS.find(p => p.id === selectedSubCategory);
        if (pill?.isStatus === 'in-progress') {
          const userStatus = getUserCourseStatus(course.id);
          const isDone = userStatus.passed || userStatus.status === 'completed';
          matchesSub = !isDone && userStatus.progressPercent > 0;
        } else if (pill?.isStatus === 'completed') {
          const userStatus = getUserCourseStatus(course.id);
          matchesSub = Boolean(userStatus.passed || userStatus.status === 'completed');
        } else if (pill?.tag) {
          matchesSub = Boolean(
            (course.subCategories && course.subCategories.includes(pill.tag)) ||
            (course.tags && course.tags.some(t => t.toLowerCase() === pill.tag.toLowerCase())) ||
            (course.category && course.category.includes(pill.tag))
          );
        }
      }

      // 3. Search query filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        (course.instructor && course.instructor.toLowerCase().includes(q)) ||
        (course.category && course.category.toLowerCase().includes(q)) ||
        (course.tags && course.tags.some(t => t.toLowerCase().includes(q))) ||
        (course.subCategories && course.subCategories.some(sc => sc.toLowerCase().includes(q)));

      return matchesMainCat && matchesSub && matchesSearch;
    });

    // Sort order
    result = [...result].sort((a, b) => {
      if (sortBy === 'in-progress-first') {
        const statusA = getUserCourseStatus(a.id);
        const statusB = getUserCourseStatus(b.id);
        const inProgA = !statusA.passed && statusA.progressPercent > 0 ? 1 : 0;
        const inProgB = !statusB.passed && statusB.progressPercent > 0 ? 1 : 0;
        if (inProgA !== inProgB) return inProgB - inProgA;
      } else if (sortBy === 'name-asc') {
        return a.title.localeCompare(b.title, 'th');
      } else if (sortBy === 'duration-desc') {
        return parseHours(b.duration) - parseHours(a.duration);
      } else if (sortBy === 'category') {
        return (a.category || '').localeCompare(b.category || '', 'th');
      }

      // Default: 'featured' order (flagships & featured first)
      const featScoreA = a.id === 'c-robot-automation' ? 100 : a.id === 'c-machine-vision' ? 90 : a.isFeatured ? 50 : 10;
      const featScoreB = b.id === 'c-robot-automation' ? 100 : b.id === 'c-machine-vision' ? 90 : b.isFeatured ? 50 : 10;
      return featScoreB - featScoreA;
    });

    return result;
  }, [allCourses, selectedCategory, selectedSubCategory, searchQuery, sortBy]);

  // Check if we are in default Curated Tracks Mode
  const isCuratedTracksMode = useMemo(() => {
    return selectedCategory === 'ทั้งหมด' && 
           selectedSubCategory === 'all' && 
           searchQuery.trim() === '' && 
           sortBy === 'featured';
  }, [selectedCategory, selectedSubCategory, searchQuery, sortBy]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { 'ทั้งหมด': allCourses.length };
    MAIN_CATEGORIES.forEach(cat => {
      if (cat !== 'ทั้งหมด') {
        if (cat === 'เปิดรับรองบุคคลภายนอก') {
          counts[cat] = allCourses.filter(c => c.isPublicEligible || c.subCategories?.includes('เปิดรับรองบุคคลภายนอก')).length;
        } else {
          counts[cat] = allCourses.filter(c => c.category === cat).length;
        }
      }
    });
    return counts;
  }, [allCourses]);

  const handleClearAllFilters = () => {
    setSelectedCategory('ทั้งหมด');
    setSelectedSubCategory('all');
    setSearchQuery('');
    setSortBy('featured');
  };

  // Reusable Single Course Card
  const renderCourseCard = (course) => {
    const userStatus = getUserCourseStatus(course.id);
    const isDone = userStatus.passed || userStatus.status === 'completed';
    const inProgress = !isDone && userStatus.progressPercent > 0;

    return (
      <div 
        key={course.id} 
        className={`course-card group cursor-pointer relative rounded-2xl overflow-hidden border transition-all duration-300 hover:shadow-xl hover:-translate-y-1 flex flex-col justify-between ${
          isDark 
            ? 'bg-slate-800/90 border-slate-700/80 hover:border-fuchsia-500/50 hover:shadow-fuchsia-500/10' 
            : 'bg-white border-slate-200 hover:border-fuchsia-400 hover:shadow-fuchsia-500/10 shadow-sm'
        }`}
        onClick={() => navigate(`/course/${course.id}`)}
      >
        <div className="card-image-wrap relative h-48 w-full overflow-hidden bg-slate-950 flex-shrink-0 border-b border-slate-700/60">
          <img 
            src={course.image || DEFAULT_COURSE_IMAGE} 
            alt={course.title} 
            className="card-image w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
            onError={(e) => { e.currentTarget.src = DEFAULT_COURSE_IMAGE; }}
          />
          
          {/* Top Left Main Category Badge */}
          <div className="card-badge absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-fuchsia-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-fuchsia-500/30 shadow-md z-10 flex items-center gap-1">
            <span>{course.category}</span>
          </div>
          
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
            ) : course.featuredBadge ? (
              <div className="bg-amber-500/95 text-slate-950 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 backdrop-blur-sm">
                {course.featuredBadge}
              </div>
            ) : course.isPromotedFromCommunity ? (
              <div className="bg-amber-500/95 text-slate-950 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-lg flex items-center gap-1 backdrop-blur-sm">
                <FiStar className="w-3.5 h-3.5" /> ยกระดับจากหน้างาน
              </div>
            ) : null}
          </div>

          {/* Bottom Left Competency Level Pill */}
          {course.level && (
            <div className="absolute bottom-2 left-3 bg-slate-950/80 backdrop-blur-sm text-cyan-300 text-[9px] font-mono font-bold px-2 py-0.5 rounded border border-cyan-500/30">
              {course.level.split('(')[0].trim()}
            </div>
          )}
        </div>

        <div className="card-content p-4 sm:p-5 flex flex-col justify-between flex-1">
          <div>
            <h3 className={`card-title text-base font-bold mb-2 line-clamp-2 min-h-[2.75rem] leading-snug transition-colors ${
              isDark ? 'text-white group-hover:text-fuchsia-400' : 'text-slate-900 group-hover:text-fuchsia-600'
            }`}>
              {course.title}
            </h3>
            <p className={`card-desc text-xs line-clamp-2 mb-3 leading-relaxed ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              {course.description}
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Sub-Category Tags (moved to bottom above metadata) */}
            {course.subCategories && course.subCategories.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {course.subCategories.slice(0, 2).map((sc, i) => (
                  <span 
                    key={i} 
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                      sc === 'ทักษะวิชาชีพขั้นสูง'
                        ? (isDark ? 'bg-amber-500/10 text-amber-300 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200')
                        : (isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200')
                    }`}
                  >
                    {sc === 'ทักษะวิชาชีพขั้นสูง' && <FiStar className="w-2.5 h-2.5 text-amber-500" />}
                    <span>{sc}</span>
                  </span>
                ))}
                {course.isPublicEligible && (
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                    isDark ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' : 'bg-cyan-50 text-cyan-800 border-cyan-200'
                  }`}>
                    Public
                  </span>
                )}
              </div>
            )}

            <div className={`card-meta flex items-center justify-between text-xs font-medium ${
              isDark ? 'text-slate-400' : 'text-slate-500'
            }`}>
              <span className="flex items-center gap-1 truncate max-w-[55%]">
                <FiUser className="text-slate-400 flex-shrink-0" />
                <span className="truncate">{course.instructor}</span>
              </span>
              <span className="flex items-center gap-1">
                <FiClock className="text-slate-400" />
                <span>{course.duration}</span>
              </span>
            </div>

            {/* Progress Bar if in-progress */}
            {inProgress && (
              <div className="mb-3">
                <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-slate-900' : 'bg-slate-100'}`}>
                  <div 
                    className="bg-gradient-to-r from-fuchsia-500 to-violet-500 h-full rounded-full transition-all"
                    style={{ width: `${userStatus.progressPercent}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className={`card-footer mt-auto pt-3 border-t flex items-center justify-between text-xs ${
              isDark ? 'border-slate-700/80' : 'border-slate-100'
            }`}>
              <span className={`text-xs flex items-center gap-1 ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                <FiLayers className={isDone ? "text-emerald-500" : "text-fuchsia-500"} />
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
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 ${
                      isDark ? 'bg-slate-700/60 hover:bg-amber-500/20 hover:text-amber-300 text-slate-400' : 'bg-slate-100 hover:bg-amber-100 text-slate-600'
                    }`}
                    title="แก้ไขข้อมูลหลักสูตรนี้"
                  >
                    <FiEdit2 className="w-3 h-3" />
                    <span>แก้ไข</span>
                  </button>
                )}
                <span className={`text-xs font-bold flex items-center gap-1 ${
                  isDone 
                    ? 'text-emerald-500 group-hover:text-emerald-400' 
                    : inProgress
                      ? 'text-cyan-500 group-hover:text-cyan-400'
                      : 'text-fuchsia-500 group-hover:text-fuchsia-400'
                }`}>
                  <span>{isDone ? 'ทบทวน' : inProgress ? 'เรียนต่อ' : 'เริ่มเรียน'}</span>
                  <FiPlayCircle className="text-base" />
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="learning-container py-6 space-y-6">
      {/* Unified Page Header */}
      <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-fuchsia-500/15 text-fuchsia-400 border border-fuchsia-500/30">
              MES LEARNING HUB
            </span>
            <span className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              คลังบทเรียนและประเมินสมรรถนะ
            </span>
          </div>
          <h1 className={`text-xl sm:text-2xl font-black tracking-tight ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}>
            <span>หลักสูตรมาตรฐานโรงงาน & ทักษะวิชาชีพขั้นสูง</span>
          </h1>
          <p className={`text-xs sm:text-sm mt-1.5 leading-relaxed max-w-3xl ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            คลังสื่อการเรียนรู้เชิงลึก ระบบอัตโนมัติ หุ่นยนต์ 6 แกน แมชชีนวิชัน มาตรฐานคุณภาพสากล และห้องทดลองจำลองหน้างานจริงสำหรับพนักงานและผู้สอบรับรองสมรรถนะ
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Compact Stats Pill */}
          <div className={`h-10 px-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 select-none ${
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
              className="h-10 px-4 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-fuchsia-600/20 inline-flex items-center gap-2 hover:-translate-y-0.5 whitespace-nowrap"
              title="สร้างหรือจัดการหลักสูตรมาตรฐานโรงงาน"
            >
              <FiPlus className="w-4 h-4" />
              <span>สร้างหลักสูตรใหม่</span>
            </button>
          )}
        </div>
      </div>

      {/* 🌟 HERO SPOTLIGHT BANNER (Flagship Courses Showcase) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
            <h2 className={`text-xs font-bold uppercase tracking-wider ${
              isDark ? 'text-amber-400' : 'text-amber-600'
            }`}>
              หลักสูตรแนะนำ (Recommended Courses)
            </h2>
          </div>
          <span className="text-[11px] text-slate-400 font-medium">ระดับช่างเทคนิค & วิศวกร (Level 4 Expert Ready)</span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {flagshipCourses.map(course => {
            const isRobot = course.id === 'c-robot-automation';
            const userStatus = getUserCourseStatus(course.id);
            const isDone = userStatus.passed || userStatus.status === 'completed';
            const inProgress = !isDone && userStatus.progressPercent > 0;

            return (
              <div 
                key={course.id}
                onClick={() => navigate(`/course/${course.id}`)}
                className={`group cursor-pointer relative rounded-2xl p-5 border transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 flex flex-col justify-between overflow-hidden ${
                  isDark
                    ? isRobot 
                      ? 'bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-900 border-indigo-500/40 hover:border-indigo-400' 
                      : 'bg-gradient-to-br from-fuchsia-950/80 via-slate-900 to-slate-900 border-fuchsia-500/40 hover:border-fuchsia-400'
                    : isRobot
                      ? 'bg-gradient-to-br from-indigo-50 via-white to-slate-50 border-indigo-200 hover:border-indigo-400 shadow-sm'
                      : 'bg-gradient-to-br from-fuchsia-50 via-white to-slate-50 border-fuchsia-200 hover:border-fuchsia-400 shadow-sm'
                }`}
              >
                {/* Background decorative glow */}
                <div className={`absolute -right-16 -top-16 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-30 ${
                  isRobot ? 'bg-indigo-500' : 'bg-fuchsia-500'
                }`} />

                <div className="relative z-10">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                        isRobot 
                          ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                          : 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                      }`}>
                        <FiStar className="w-3 h-3 text-amber-400" />
                        <span>{course.featuredBadge || '⭐ แนะนำพิเศษ'}</span>
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-white text-slate-700 border-slate-200'
                      }`}>
                        ทักษะวิชาชีพขั้นสูง
                      </span>
                    </div>

                    {isDone ? (
                      <span className="bg-emerald-500/90 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-md flex items-center gap-1">
                        <FiCheck className="w-3 h-3" /> ผ่านแล้ว 100%
                      </span>
                    ) : inProgress ? (
                      <span className="bg-fuchsia-600 text-white font-mono font-bold text-[10px] px-2 py-0.5 rounded-md">
                        กำลังเรียน {userStatus.progressPercent}%
                      </span>
                    ) : (
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                        isDark ? 'text-cyan-300 border-cyan-500/30 bg-cyan-950/40' : 'text-cyan-800 border-cyan-200 bg-cyan-50'
                      }`}>
                        Level 4 Certified
                      </span>
                    )}
                  </div>

                  <h3 className={`text-base sm:text-lg font-black leading-snug mb-2 group-hover:text-fuchsia-400 transition-colors ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    {course.title}
                  </h3>

                  <p className={`text-xs line-clamp-2 leading-relaxed mb-4 ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}>
                    {course.description}
                  </p>
                </div>

                <div className="relative z-10 pt-3 border-t border-slate-700/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 text-slate-400 font-medium text-[11px]">
                    <span className="flex items-center gap-1">
                      <FiClock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.duration}</span>
                    </span>
                    <span>&bull;</span>
                    <span className="flex items-center gap-1">
                      <FiLayers className="w-3.5 h-3.5 text-slate-400" />
                      <span>{course.modules?.length} บทเรียน</span>
                    </span>
                    <span>&bull;</span>
                    <span className="text-emerald-400 font-semibold">ข้อสอบ 2 โหมด</span>
                  </div>

                  <div className={`inline-flex items-center gap-1.5 font-bold text-xs px-3 py-1.5 rounded-xl transition-all shadow-md ${
                    isRobot 
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white' 
                      : 'bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white'
                  }`}>
                    <span>{isDone ? 'ทบทวนวิชา' : inProgress ? 'เรียนต่อ' : 'เข้าสู่บทเรียน'}</span>
                    <FiArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 🧭 FILTER & CONTROL BAR (Search + Sort By + Main Tabs + Sub-Category Quick Pills) */}
      <div className={`p-4 rounded-2xl border space-y-3.5 shadow-sm ${
        isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* Row 1: Search Input & Sort Dropdown */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-xl">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อหลักสูตร, หุ่นยนต์, Vision, AI, PLC, ISO, SOP, แม่พิมพ์, ผู้สอน..."
              className={`w-full border rounded-xl pl-10 pr-9 py-2 text-xs sm:text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors shadow-sm ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-200 placeholder-slate-400' 
                  : 'bg-white border-slate-300 text-slate-900 placeholder-slate-400'
              }`}
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                title="ล้างข้อความค้นหา"
              >
                <FiX className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort By Dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            <span className={`text-xs font-semibold flex items-center gap-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              <FiFilter className="w-3 h-3" /> จัดเรียง:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className={`text-xs font-bold rounded-xl border px-3 py-2 focus:outline-none focus:border-fuchsia-500 cursor-pointer transition-colors shadow-sm ${
                isDark 
                  ? 'bg-slate-800 border-slate-700 text-slate-200' 
                  : 'bg-white border-slate-300 text-slate-800'
              }`}
            >
              {SORT_OPTIONS.map(opt => (
                <option key={opt.id} value={opt.id} className={isDark ? 'bg-slate-800 text-white' : 'bg-white text-slate-900'}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 2: Main Categories Slide Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {MAIN_CATEGORIES.map(category => {
            const count = categoryCounts[category] || 0;
            const isActive = selectedCategory === category;
            return (
              <button
                key={category}
                onClick={() => {
                  setSelectedCategory(category);
                }}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none border ${
                  isActive
                    ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-md shadow-fuchsia-500/20 border-transparent'
                    : (isDark 
                        ? 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border-slate-700/80' 
                        : 'bg-white text-slate-700 hover:text-slate-900 hover:bg-slate-100 border-slate-200 shadow-sm')
                }`}
              >
                <span>{category}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
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

        {/* Row 3: Sub-Category / Multi-tag Quick Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 text-xs">
          <span className={`text-[11px] font-semibold flex items-center gap-1 mr-1 flex-shrink-0 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}>
            <FiTag className="w-3 h-3" /> แท็กย่อย:
          </span>
          {SUB_CATEGORY_PILLS.map(pill => {
            const isActive = selectedSubCategory === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setSelectedSubCategory(pill.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all select-none border ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-400 font-bold shadow-sm'
                    : isDark 
                      ? 'bg-slate-800/60 text-slate-400 hover:text-slate-200 border-slate-700/60 hover:bg-slate-800' 
                      : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100 shadow-sm'
                }`}
              >
                {pill.label}
              </button>
            );
          })}

          {(selectedCategory !== 'ทั้งหมด' || selectedSubCategory !== 'all' || searchQuery || sortBy !== 'featured') && (
            <button
              onClick={handleClearAllFilters}
              className="ml-auto text-[11px] text-fuchsia-400 hover:text-fuchsia-300 underline font-semibold flex-shrink-0 whitespace-nowrap pl-2"
            >
              ล้างทั้งหมด
            </button>
          )}
        </div>
      </div>

      {/* 📚 COURSES VIEW: Dynamic View Switching (Curated Tracks vs Focused Grid) */}
      {isCuratedTracksMode ? (
        /* MODE A: Curated Categorized Tracks View (Default Home Experience) */
        <div className="space-y-10 pt-2">
          {CURATED_TRACKS.map(track => {
            const trackCourses = allCourses.filter(c => {
              return (c.subCategories && c.subCategories.includes(track.filterTag)) ||
                     (c.category && c.category.includes(track.filterTag)) ||
                     (c.tags && c.tags.some(t => t.toLowerCase() === track.filterTag.toLowerCase()));
            });

            if (trackCourses.length === 0) return null;

            return (
              <section key={track.id} className="space-y-4">
                {/* Track Section Header */}
                <div className={`p-4 rounded-2xl border bg-gradient-to-r flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${track.color} ${track.borderColor}`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg flex-shrink-0 ${
                      isDark ? 'bg-slate-900/80 text-white' : 'bg-white text-slate-900 shadow-sm'
                    }`}>
                      {track.id === 'advanced-skills' && <FiStar className="text-amber-400" />}
                      {track.id === 'robotics-automation' && <FiCpu className="text-fuchsia-400" />}
                      {track.id === 'manufacturing-tooling' && <FiTool className="text-cyan-400" />}
                      {track.id === 'quality-iso-audits' && <FiShield className="text-emerald-400" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className={`text-base sm:text-lg font-black ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {track.title}
                        </h2>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border hidden sm:inline-block ${track.tagColor}`}>
                          {track.badge}
                        </span>
                      </div>
                      <p className={`text-xs mt-0.5 line-clamp-1 ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {track.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-shrink-0">
                    <button
                      onClick={() => {
                        const pill = SUB_CATEGORY_PILLS.find(p => p.tag === track.filterTag);
                        if (pill) setSelectedSubCategory(pill.id);
                      }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1 ${
                        isDark 
                          ? 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border-slate-700' 
                          : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200 shadow-sm'
                      }`}
                    >
                      <span>ดูทั้งหมด ({trackCourses.length})</span>
                      <FiChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Track Courses Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {trackCourses.map(course => renderCourseCard(course))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        /* MODE B: Focused Filtered Grid View (When Search, Category, Sub-cat, or Sort is Active) */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                ผลการค้นหาและตัวกรอง:
              </span>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-mono font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30">
                พบ {processedCourses.length} หลักสูตร
              </span>
            </div>

            <button
              onClick={handleClearAllFilters}
              className="text-xs text-fuchsia-400 hover:text-fuchsia-300 underline font-semibold flex items-center gap-1"
            >
              <FiX className="w-3.5 h-3.5" />
              <span>กลับสู่หน้าแรก (จัดหมวดหมู่มาตรฐาน)</span>
            </button>
          </div>

          {processedCourses.length > 0 ? (
            <div className="course-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {processedCourses.map(course => renderCourseCard(course))}
            </div>
          ) : (
            <div className="p-12 text-center bg-slate-800/50 rounded-2xl border border-slate-700 my-8">
              <FiLayers className="w-12 h-12 text-slate-500 mx-auto mb-3" />
              <h3 className="text-lg font-bold text-slate-200 mb-1">ไม่พบหลักสูตรที่ตรงกับเงื่อนไขที่เลือก</h3>
              <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
                ลองปรับเปลี่ยนคำค้นหา หรือเลือกแท็กหมวดหมู่อื่นเพื่อดูหลักสูตรทั้งหมด
              </p>
              <button 
                onClick={handleClearAllFilters}
                className="px-4 py-2 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl text-xs font-semibold transition-all shadow-md"
              >
                ล้างตัวกรองทั้งหมดและกลับสู่หน้าหลัก
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

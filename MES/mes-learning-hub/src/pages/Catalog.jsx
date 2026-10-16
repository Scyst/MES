import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { courses } from '../data/courses';
import { 
  FiClock, 
  FiUser, 
  FiPlayCircle, 
  FiSearch, 
  FiLayers, 
  FiCheckCircle, 
  FiBookOpen,
  FiX,
  FiCompass
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
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState('ทั้งหมด');
  const [searchQuery, setSearchQuery] = useState('');

  // Calculate total modules across all courses
  const totalModulesCount = useMemo(() => {
    return courses.reduce((acc, c) => acc + (c.modules?.length || 0), 0);
  }, []);

  // Filtered courses based on category and search query
  const filteredCourses = useMemo(() => {
    return courses.filter(course => {
      const matchesCategory = selectedCategory === 'ทั้งหมด' || course.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = !q || 
        course.title.toLowerCase().includes(q) ||
        course.description.toLowerCase().includes(q) ||
        course.instructor.toLowerCase().includes(q) ||
        course.category.toLowerCase().includes(q);

      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { 'ทั้งหมด': courses.length };
    CATEGORIES.forEach(cat => {
      if (cat !== 'ทั้งหมด') {
        counts[cat] = courses.filter(c => c.category === cat).length;
      }
    });
    return counts;
  }, []);

  return (
    <div className="learning-container">
      {/* Hero Header */}
      <div className="header-section">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/10 border border-fuchsia-500/30 text-fuchsia-300 text-xs font-semibold uppercase tracking-wider mb-3">
              <FiCompass className="w-3.5 h-3.5" /> MES Enterprise Learning Platform
            </div>
            <h1>MES Learning Hub</h1>
            <p className="subtitle max-w-3xl leading-relaxed text-slate-300">
              ศูนย์รวมองค์ความรู้และคู่มือการปฏิบัติงานสำหรับพนักงานทุกคน: ครอบคลุมการทำงานกับเครื่องจักร, การใช้งานโปรแกรมและระบบดิจิทัล (MES, SAP, Web App), ขั้นตอนและวิธีปฏิบัติงาน (SOP / WI), ระบบเอกสาร, ตลอดจนมาตรฐานวิศวกรรมการผลิตและคุณภาพสากล
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 bg-slate-800/80 p-3 rounded-2xl border border-slate-700/80 shadow-inner flex-shrink-0">
            <div className="px-3 py-1.5 text-center border-r border-slate-700">
              <div className="text-xl font-black text-fuchsia-400">{courses.length}</div>
              <div className="text-[11px] font-medium text-slate-400">หลักสูตร</div>
            </div>
            <div className="px-3 py-1.5 text-center border-r border-slate-700">
              <div className="text-xl font-black text-cyan-400">{totalModulesCount}</div>
              <div className="text-[11px] font-medium text-slate-400">บทเรียน</div>
            </div>
            <div className="px-3 py-1.5 text-center">
              <div className="text-xl font-black text-emerald-400">All Roles</div>
              <div className="text-[11px] font-medium text-slate-400">ทุกแผนก</div>
            </div>
          </div>
        </div>

        {/* Search & Filter Controls */}
        <div className="space-y-4">
          {/* Search Box */}
          <div className="relative max-w-xl">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 pointer-events-none" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาคู่มือเครื่องจักร, โปรแกรมระบบ, SOP, ขั้นตอนการทำงาน, มาตรฐาน ISO, ผู้สอน..."
              className="w-full bg-slate-800/90 border border-slate-700 text-slate-200 placeholder-slate-400 rounded-xl pl-12 pr-10 py-3 text-sm focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-colors"
                title="ล้างคำค้นหา"
              >
                <FiX className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-700">
            {CATEGORIES.map(category => {
              const count = categoryCounts[category] || 0;
              const isActive = selectedCategory === category;
              return (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-fuchsia-600 to-violet-600 text-white shadow-md shadow-fuchsia-500/20'
                      : 'bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 border border-slate-700/80'
                  }`}
                >
                  <span>{category}</span>
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                    isActive ? 'bg-black/30 text-white' : 'bg-slate-700 text-slate-300'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Courses Grid */}
      {filteredCourses.length > 0 ? (
        <div className="courses-grid">
          {filteredCourses.map(course => (
            <div 
              key={course.id} 
              className="course-card group" 
              onClick={() => navigate(`/course/${course.id}`)}
            >
              <div 
                className="course-image" 
                style={{ backgroundImage: `url(${course.image})` }}
              >
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/30 to-transparent"></div>
                <div className="course-category">
                  {course.category}
                </div>
                <div className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-slate-200 text-xs font-semibold border border-slate-700">
                  <FiBookOpen className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{course.modules?.length || 0} บทเรียน</span>
                </div>
              </div>

              <div className="course-content">
                <h2 className="group-hover:text-fuchsia-300 transition-colors">{course.title}</h2>
                <p className="course-desc">{course.description}</p>
                
                <div className="course-meta">
                  <div className="meta-item">
                    <FiUser className="icon text-fuchsia-400" />
                    <span>{course.instructor}</span>
                  </div>
                  <div className="meta-item">
                    <FiClock className="icon text-cyan-400" />
                    <span>{course.duration}</span>
                  </div>
                </div>
                
                <div className="course-action">
                  <button className="start-btn group-hover:bg-fuchsia-600 transition-colors">
                    <FiPlayCircle className="icon w-4 h-4" />
                    Start Learning
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="p-12 text-center bg-slate-800/50 rounded-2xl border border-slate-700 my-8">
          <FiLayers className="w-12 h-12 text-slate-500 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-200 mb-1">ไม่พบหลักสูตรหรือคู่มือที่ตรงกับเงื่อนไข</h3>
          <p className="text-sm text-slate-400 max-w-md mx-auto mb-4">
            ลองปรับเปลี่ยนคำค้นหา หรือเลือกหมวดหมู่อื่นเพื่อดูหลักสูตรและคู่มือทั้งหมด
          </p>
          <button 
            onClick={() => { setSelectedCategory('ทั้งหมด'); setSearchQuery(''); }}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold transition-colors"
          >
            แสดงหลักสูตรทั้งหมด
          </button>
        </div>
      )}
    </div>
  );
}

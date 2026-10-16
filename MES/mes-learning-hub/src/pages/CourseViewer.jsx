import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById } from '../data/communityStore';
import { FiArrowLeft, FiCheckCircle, FiCircle, FiEdit2 } from 'react-icons/fi';
import CourseContent from '../components/CourseContent';
import DynamicCourseRenderer from '../components/DynamicCourseRenderer';
import ErrorBoundary from '../components/ErrorBoundary';

export default function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const course = getCourseById(courseId);
  
  const [activeModuleId, setActiveModuleId] = useState(() => course?.modules?.[0]?.id || '');

  // Synchronize activeModuleId when course changes
  useEffect(() => {
    if (course && course.modules?.length > 0) {
      const exists = course.modules.some(m => m.id === activeModuleId);
      if (!exists) {
        setActiveModuleId(course.modules[0].id);
      }
    }
  }, [courseId, course, activeModuleId]);

  if (!course) {
    return (
      <div className="viewer-not-found p-12 text-center bg-slate-900 min-h-[50vh] flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-white mb-4">ไม่พบหลักสูตรที่ระบุ (Course not found)</h2>
        <button 
          onClick={() => navigate('/')}
          className="px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl font-bold transition-colors shadow-lg shadow-fuchsia-600/20"
        >
          กลับสู่หน้าแคตตาล็อก
        </button>
      </div>
    );
  }

  // Resolve active module safely, fallback to first module if not found
  const activeModule = course.modules?.find(m => m.id === activeModuleId) || course.modules?.[0];
  const currentIndex = course.modules?.findIndex(m => m.id === activeModule?.id) ?? 0;

  return (
    <div className="course-viewer">
      {/* Sidebar / Syllabus */}
      <div className="viewer-sidebar">
        <div className="sidebar-header">
          <div className="flex items-center justify-between mb-3">
            <button className="back-btn m-0" onClick={() => navigate('/')}>
              <FiArrowLeft /> Back
            </button>
            <button
              onClick={() => navigate(`/admin/course-builder?courseId=${course.id}`)}
              className="px-2.5 py-1 bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 rounded-lg text-xs font-semibold border border-slate-700/80 transition-colors flex items-center gap-1.5 shadow-sm"
              title="แก้ไขหลักสูตรนี้"
            >
              <FiEdit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>แก้ไขหลักสูตร</span>
            </button>
          </div>
          <h3>{course.title}</h3>
          <div className="text-xs text-slate-400 mt-1">
            {course.modules?.length || 0} บทเรียน · {course.duration}
          </div>
        </div>
        <div className="module-list">
          {course.modules?.map((module, index) => {
            const isSelected = activeModule?.id === module.id;
            return (
              <div 
                key={module.id} 
                className={`module-item ${isSelected ? 'active' : ''}`}
                onClick={() => setActiveModuleId(module.id)}
              >
                <div className="module-icon">
                  {isSelected ? <FiCheckCircle className="icon-active" /> : <FiCircle />}
                </div>
                <div className="module-info">
                  <span className="module-number">Lesson {index + 1}</span>
                  <span className="module-title">{module.title}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="viewer-content">
        <div className="content-body">
          {activeModule && (
            <ErrorBoundary key={activeModule.id} moduleName={activeModule.title}>
              {activeModule.isDynamic || activeModule.steps ? (
                <DynamicCourseRenderer module={activeModule} course={course} />
              ) : (
                <CourseContent courseId={course.id} moduleContent={activeModule.content} />
              )}
            </ErrorBoundary>
          )}
          
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-800">
            {currentIndex > 0 ? (
              <button 
                onClick={() => setActiveModuleId(course.modules[currentIndex - 1].id)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors border border-slate-700"
              >
                ← Previous Lesson
              </button>
            ) : <div></div>}
            
            {currentIndex < (course.modules?.length || 0) - 1 ? (
              <button 
                onClick={() => setActiveModuleId(course.modules[currentIndex + 1].id)}
                className="px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-fuchsia-500/20"
              >
                Next Lesson →
              </button>
            ) : (
              <button 
                onClick={() => navigate('/')}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-emerald-500/20 flex items-center gap-2"
              >
                <FiCheckCircle /> Complete Course
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

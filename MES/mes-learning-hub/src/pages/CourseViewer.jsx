import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById } from '../data/communityStore';
import { 
  getUserModuleProgress, 
  markModuleCompleted, 
  recordCourseCompletion, 
  getUserCourseStatus 
} from '../data/trainingAuditStore';
import { 
  FiArrowLeft, 
  FiCheckCircle, 
  FiCircle, 
  FiEdit2, 
  FiAward, 
  FiShield, 
  FiCheck, 
  FiX, 
  FiUser 
} from 'react-icons/fi';
import CourseContent from '../components/CourseContent';
import DynamicCourseRenderer from '../components/DynamicCourseRenderer';
import ErrorBoundary from '../components/ErrorBoundary';

export default function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  const course = useMemo(() => getCourseById(courseId), [courseId]);
  
  const [activeModuleId, setActiveModuleId] = useState(() => course?.modules?.[0]?.id || '');
  
  // Progress and Completion States
  const [completedModuleIds, setCompletedModuleIds] = useState(() => {
    return course ? getUserModuleProgress(course.id) : [];
  });
  
  const [courseStatus, setCourseStatus] = useState(() => {
    return course ? getUserCourseStatus(course.id) : null;
  });

  const [isCompleted, setIsCompleted] = useState(() => {
    return courseStatus?.passed || courseStatus?.status === 'completed';
  });

  const [earnedCertId, setEarnedCertId] = useState(() => courseStatus?.certificateId || '');
  const [showCelebrationModal, setShowCelebrationModal] = useState(false);

  // Synchronize activeModuleId when course changes
  useEffect(() => {
    if (course && course.modules?.length > 0) {
      const exists = course.modules.some(m => m.id === activeModuleId);
      if (!exists) {
        setActiveModuleId(course.modules[0].id);
      }
    }
  }, [courseId, course, activeModuleId]);

  // Mark current module as completed upon viewing
  useEffect(() => {
    if (course && activeModuleId && course.modules?.length > 0) {
      const res = markModuleCompleted({
        courseId: course.id,
        moduleId: activeModuleId,
        totalModules: course.modules.length
      });
      setCompletedModuleIds(res.completedModules);
      if (res.isAllDone) {
        setIsCompleted(true);
      }
      setCourseStatus(getUserCourseStatus(course.id));
    }
  }, [course, activeModuleId]);

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
  const totalModules = course.modules?.length || 1;
  const progressPercent = isCompleted ? 100 : Math.round((completedModuleIds.length / totalModules) * 100);

  const handleCompleteCourse = () => {
    const allModuleIds = course.modules?.map(m => m.id) || [];
    const rec = recordCourseCompletion({
      courseId: course.id,
      totalModules: totalModules,
      moduleIds: allModuleIds
    });
    setCompletedModuleIds(allModuleIds);
    setIsCompleted(true);
    setEarnedCertId(rec.certificateId);
    setCourseStatus(getUserCourseStatus(course.id));
    setShowCelebrationModal(true);
  };

  return (
    <div className="course-viewer">
      {/* Celebration Modal when course completed */}
      {showCelebrationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-emerald-500/50 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <button
              onClick={() => setShowCelebrationModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400 flex items-center justify-center mx-auto text-4xl shadow-lg shadow-emerald-500/20">
              <FiAward />
            </div>

            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/30">
                ยินดีด้วย! ผ่านการอบรมสำเร็จ 100%
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-3 leading-snug">
                {course.title}
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                บันทึกประวัติการฝึกอบรมลงในระบบตรวจรับรองสมรรถนะ (ISO 9001:2015 Clause 7.2) เรียบร้อยแล้ว
              </p>
            </div>

            {/* Certificate ID Card */}
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-1.5">
              <div className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                เลขที่ใบรับรองสมรรถนะ (Certificate ID)
              </div>
              <div className="text-base font-mono font-black text-cyan-300">
                {earnedCertId || 'SNC-CERT-2026-LIVE'}
              </div>
              <div className="text-[10px] text-amber-300 font-bold pt-1">
                🎉 ได้รับโบนัสเกียรติยศ +50 EXP
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                onClick={() => navigate('/profile')}
                className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
              >
                <FiUser className="w-4 h-4" />
                <span>ดูพาสปอร์ตสมรรถนะ</span>
              </button>
              <button
                onClick={() => navigate('/')}
                className="py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-colors"
              >
                หน้าหลักสูตร
              </button>
            </div>
          </div>
        </div>
      )}

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
              <span>แก้ไข</span>
            </button>
          </div>
          <h3>{course.title}</h3>
          <div className="text-xs text-slate-400 mt-1">
            {totalModules} บทเรียน · {course.duration}
          </div>

          {/* Real-time Progress Bar */}
          <div className="mt-4 bg-slate-900/90 p-3 rounded-xl border border-slate-700/60">
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className="text-slate-300">ความคืบหน้า</span>
              <span className={isCompleted ? 'text-emerald-400 font-mono font-bold' : 'text-fuchsia-400 font-mono'}>
                {isCompleted ? '✓ ผ่านแล้ว 100%' : `${progressPercent}%`}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-fuchsia-500 to-violet-500'}`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className="text-[10px] text-slate-400 mt-1.5 flex items-center justify-between">
              <span>ผ่านแล้ว {completedModuleIds.length}/{totalModules} บท</span>
              {isCompleted && (
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <FiCheck className="w-3 h-3" /> ออกใบรับรองแล้ว
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="module-list">
          {course.modules?.map((module, index) => {
            const isSelected = activeModule?.id === module.id;
            const isDone = completedModuleIds.includes(module.id) || isCompleted;

            return (
              <div 
                key={module.id} 
                className={`module-item ${isSelected ? 'active' : ''}`}
                onClick={() => setActiveModuleId(module.id)}
              >
                <div className="module-icon">
                  {isDone ? (
                    <FiCheckCircle className="text-emerald-400 w-4 h-4" />
                  ) : isSelected ? (
                    <FiCircle className="text-fuchsia-400 w-4 h-4" />
                  ) : (
                    <FiCircle className="text-slate-600 w-4 h-4" />
                  )}
                </div>
                <div className="module-info">
                  <span className="module-number flex items-center justify-between">
                    <span>Lesson {index + 1}</span>
                    {isDone && (
                      <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.2 rounded">
                        ผ่าน
                      </span>
                    )}
                  </span>
                  <span className={`module-title ${isDone ? 'text-slate-200' : ''}`}>
                    {module.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="viewer-content">
        <div className="content-body">
          {/* Completed Golden Banner */}
          {isCompleted && (
            <div className="p-4 mb-6 rounded-2xl bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border border-emerald-500/30 text-emerald-200 flex items-center justify-between gap-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xl flex-shrink-0">
                  <FiAward />
                </div>
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <span>คุณผ่านการอบรมหลักสูตรนี้สำเร็จ 100%</span>
                    <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-mono">
                      {earnedCertId || courseStatus?.certificateId || 'SNC-CERT'}
                    </span>
                  </div>
                  <div className="text-xs text-slate-300 mt-0.5">
                    สมรรถนะได้รับการบันทึกลงใน Competency Passport พร้อมรับการตรวจประเมิน ISO 9001 Clause 7.2
                  </div>
                </div>
              </div>
              <button
                onClick={() => navigate('/profile')}
                className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 flex-shrink-0"
              >
                <FiShield className="w-3.5 h-3.5" />
                <span>ดูพาสปอร์ต</span>
              </button>
            </div>
          )}

          {activeModule && (
            <ErrorBoundary key={activeModule.id} moduleName={activeModule.title}>
              {activeModule.isDynamic || activeModule.steps ? (
                <DynamicCourseRenderer module={activeModule} course={course} />
              ) : (
                <CourseContent courseId={course.id} moduleContent={activeModule.content} />
              )}
            </ErrorBoundary>
          )}
          
          {/* Bottom Lesson Navigation & Complete Course Button */}
          <div className="flex justify-between items-center mt-12 pt-6 border-t border-slate-800">
            {currentIndex > 0 ? (
              <button 
                onClick={() => setActiveModuleId(course.modules[currentIndex - 1].id)}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors border border-slate-700"
              >
                ← Previous Lesson
              </button>
            ) : <div></div>}
            
            {currentIndex < totalModules - 1 ? (
              <button 
                onClick={() => setActiveModuleId(course.modules[currentIndex + 1].id)}
                className="px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-bold transition-colors shadow-lg shadow-fuchsia-500/20"
              >
                Next Lesson →
              </button>
            ) : (
              <button 
                onClick={handleCompleteCourse}
                className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 hover:-translate-y-0.5"
              >
                <FiCheckCircle className="w-5 h-5" />
                <span>จบหลักสูตรและบันทึกประวัติ (Complete Course)</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

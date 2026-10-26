import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById, addExp, getUserGrading, getCurrentUser } from '../data/communityStore';
import { 
  getUserModuleProgress, 
  markModuleCompleted, 
  recordCourseCompletion, 
  recordFailedAssessment,
  getUserCourseStatus 
} from '../data/trainingAuditStore';
import { getCourseAssessment, getModuleCheckpoint } from '../data/assessmentBank';
import { 
  FiArrowLeft, 
  FiCheckCircle, 
  FiCircle, 
  FiEdit2, 
  FiAward, 
  FiShield, 
  FiCheck, 
  FiX, 
  FiUser,
  FiHelpCircle,
  FiAlertTriangle,
  FiChevronDown,
  FiChevronLeft,
  FiChevronRight,
  FiList,
  FiRefreshCw,
  FiLock,
  FiBookOpen
} from 'react-icons/fi';
import CourseContent from '../components/CourseContent';
import DynamicCourseRenderer from '../components/DynamicCourseRenderer';
import ErrorBoundary from '../components/ErrorBoundary';
import { useTheme } from '../context/ThemeContext';
import CertificateModal from '../components/CertificateModal';
import TrainerGuideModal from '../components/TrainerGuideModal';

export default function CourseViewer() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const { isDark } = useTheme();

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
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false);
  const [isTrainerGuideOpen, setIsTrainerGuideOpen] = useState(false);
  const [latestExamScore, setLatestExamScore] = useState(null);
  const [userGrading, setUserGrading] = useState(() => getUserGrading());
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const [isMobileSyllabusOpen, setIsMobileSyllabusOpen] = useState(false);
  const contentTopRef = useRef(null);
  const isInitialMount = useRef(true);

  // Scroll to top on course change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [courseId]);

  // Scroll smoothly to lesson content header when active module changes
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (contentTopRef.current) {
      const yOffset = -115;
      const y = contentTopRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: 'smooth' });
    }
  }, [activeModuleId]);

  useEffect(() => {
    const handleUserUpdated = (e) => {
      if (e?.detail?.grading) {
        setUserGrading(e.detail.grading);
      } else {
        setUserGrading(getUserGrading());
      }
      const u = e?.detail?.user || e?.detail || getCurrentUser();
      setCurrentUser(u);
    };
    window.addEventListener('mes-user-updated', handleUserUpdated);
    return () => window.removeEventListener('mes-user-updated', handleUserUpdated);
  }, []);

  // Assessment Modal States
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [assessmentReview, setAssessmentReview] = useState(null); // null or { failed: bool, score, total, percentage, answers, questions }
  const [assessmentError, setAssessmentError] = useState('');

  // Assessment questions for this course
  const assessmentQuestions = useMemo(() => {
    return course ? getCourseAssessment(course) : [];
  }, [course]);

  // Synchronize all course states when courseId / course changes OR when user session updates
  useEffect(() => {
    if (!course) return;
    const status = getUserCourseStatus(course.id);
    const modProgress = getUserModuleProgress(course.id);
    const passed = status?.passed || status?.status === 'completed';

    setCourseStatus(status);
    setCompletedModuleIds(modProgress);
    setIsCompleted(passed);
    setEarnedCertId(status?.certificateId || '');

    if (course.modules?.length > 0) {
      const exists = course.modules.some(m => m.id === activeModuleId);
      if (!exists) {
        setActiveModuleId(course.modules[0].id);
      }
    }
  }, [courseId, course, currentUser]);

  // Resolve active module safely, fallback to first module if not found
  const activeModule = course?.modules?.find(m => m.id === activeModuleId) || course?.modules?.[0];
  const currentIndex = course?.modules?.findIndex(m => m.id === activeModule?.id) ?? 0;
  const totalModules = course?.modules?.length || 1;
  const progressPercent = isCompleted ? 100 : Math.round((completedModuleIds.length / totalModules) * 100);

  // Active Recall Checkpoints for current active module (supports single object or array of questions)
  const checkpointList = useMemo(() => {
    if (!course || !activeModule) return [];
    const raw = getModuleCheckpoint(course, activeModule, currentIndex);
    if (!raw) return [];
    return Array.isArray(raw) ? raw : [raw];
  }, [course, activeModule, currentIndex]);

  const [activeCheckpointIdx, setActiveCheckpointIdx] = useState(0);
  const [passedCheckpointMap, setPassedCheckpointMap] = useState({});
  const [checkpointSelected, setCheckpointSelected] = useState(null);
  const [checkpointStatus, setCheckpointStatus] = useState(null); // 'correct' | 'incorrect' | null
  const [checkpointShowHint, setCheckpointShowHint] = useState(false);

  const currentCheckpoint = checkpointList[activeCheckpointIdx] || checkpointList[0] || null;
  const totalCheckpointsInModule = checkpointList.length;
  const passedCountInModule = checkpointList.filter((_, idx) => Boolean(passedCheckpointMap[idx])).length;
  const allCheckpointsPassed = totalCheckpointsInModule > 0 && passedCountInModule >= totalCheckpointsInModule;

  // Synchronize Checkpoint state whenever activeModuleId or completedModuleIds change
  useEffect(() => {
    if (!course || !activeModuleId) return;

    const alreadyDone = completedModuleIds.includes(activeModuleId) || isCompleted;
    setActiveCheckpointIdx(0);
    if (alreadyDone) {
      const allPassed = {};
      checkpointList.forEach((_, idx) => {
        allPassed[idx] = true;
      });
      setPassedCheckpointMap(allPassed);
      setCheckpointSelected(checkpointList[0]?.correctAnswer ?? 0);
      setCheckpointStatus('correct');
      setCheckpointShowHint(false);
    } else {
      setPassedCheckpointMap({});
      setCheckpointSelected(null);
      setCheckpointStatus(null);
      setCheckpointShowHint(false);
    }
  }, [courseId, activeModuleId, completedModuleIds, isCompleted, checkpointList]);

  // Switch between checkpoint questions within the same module
  const handleSwitchCheckpointQuestion = (nextIdx) => {
    if (nextIdx < 0 || nextIdx >= checkpointList.length) return;
    setActiveCheckpointIdx(nextIdx);
    if (passedCheckpointMap[nextIdx]) {
      setCheckpointSelected(checkpointList[nextIdx]?.correctAnswer ?? 0);
      setCheckpointStatus('correct');
      setCheckpointShowHint(false);
    } else {
      setCheckpointSelected(null);
      setCheckpointStatus(null);
      setCheckpointShowHint(false);
    }
  };

  // Select Checkpoint option and evaluate immediately (Active Recall)
  const handleSelectCheckpointOption = (optIdx) => {
    if (!currentCheckpoint) return;
    setCheckpointSelected(optIdx);

    const isCorrect = optIdx === currentCheckpoint.correctAnswer;
    if (isCorrect) {
      setCheckpointStatus('correct');
      setCheckpointShowHint(false);

      const updatedMap = { ...passedCheckpointMap, [activeCheckpointIdx]: true };
      setPassedCheckpointMap(updatedMap);

      const allPassedNow = checkpointList.every((_, idx) => Boolean(updatedMap[idx]));

      // Officially mark module completed in training audit store once all questions in the lesson are passed
      if (allPassedNow && !completedModuleIds.includes(activeModuleId) && !isCompleted) {
        const res = markModuleCompleted({
          courseId: course.id,
          moduleId: activeModuleId,
          totalModules: totalModules
        });
        setCompletedModuleIds(res.completedModules);
        setCourseStatus(getUserCourseStatus(course.id));
        try {
          addExp(5, `ผ่าน Checkpoint: ${activeModule?.title || ''}`);
        } catch (e) {
          console.warn('Failed to add EXP:', e);
        }
      }
    } else {
      setCheckpointStatus('incorrect');
      setCheckpointShowHint(true);
    }
  };

  const isCurrentModuleUnlocked = completedModuleIds.includes(activeModuleId) || isCompleted || allCheckpointsPassed;

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

  // Switch to next lesson smoothly
  const handleNextLesson = () => {
    if (currentIndex < totalModules - 1) {
      const nextModuleId = course.modules[currentIndex + 1].id;
      setActiveModuleId(nextModuleId);
    }
  };

  // Switch to previous lesson smoothly
  const handlePrevLesson = () => {
    if (currentIndex > 0) {
      const prevModuleId = course.modules[currentIndex - 1].id;
      setActiveModuleId(prevModuleId);
    }
  };

  // Assessment Selection Handler
  const handleSelectOption = (qIdx, optIdx) => {
    setUserAnswers(prev => ({
      ...prev,
      [qIdx]: optIdx
    }));
    setAssessmentError('');
  };

  // Submit Assessment & Evaluation
  const handleSubmitAssessment = () => {
    const questions = assessmentQuestions;
    if (questions.length === 0) return;

    // Check that all questions have been answered
    const unanswered = questions.some((_, idx) => userAnswers[idx] === undefined);
    if (unanswered) {
      const answeredCount = Object.keys(userAnswers).length;
      setAssessmentError(`กรุณาตอบคำถามให้ครบทุกข้อก่อนส่งแบบประเมิน (ตอบแล้ว ${answeredCount} จาก ${questions.length} ข้อ)`);
      return;
    }

    // Grade assessment
    let correctCount = 0;
    questions.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        correctCount++;
      }
    });

    const percentage = Math.round((correctCount / questions.length) * 100);
    const passed = percentage >= 80;

    setLatestExamScore({
      score: correctCount,
      total: questions.length,
      percentage: percentage
    });

    if (passed) {
      // Record course completion & certification
      const allModuleIds = course.modules?.map(m => m.id) || [];
      const rec = recordCourseCompletion({
        courseId: course.id,
        totalModules: totalModules,
        moduleIds: allModuleIds,
        score: correctCount,
        totalQuestions: questions.length
      });

      setCompletedModuleIds(allModuleIds);
      setIsCompleted(true);
      setEarnedCertId(rec.certificateId);
      setCourseStatus(getUserCourseStatus(course.id));
      setUserGrading(getUserGrading());
      setCurrentUser(getCurrentUser());
      setShowAssessmentModal(false);
      setAssessmentReview(null);
      setShowCelebrationModal(true);
    } else {
      // Record failed attempt for audit matrix tracking
      recordFailedAssessment({
        courseId: course.id,
        score: correctCount,
        totalQuestions: questions.length
      });
      setCourseStatus(getUserCourseStatus(course.id));
      // Show failure review with explanations
      setAssessmentReview({
        failed: true,
        score: correctCount,
        total: questions.length,
        percentage: percentage,
        answers: userAnswers,
        questions: questions
      });
    }
  };

  // Reset exam to try again
  const handleRetakeExam = () => {
    setUserAnswers({});
    setAssessmentReview(null);
    setAssessmentError('');
  };

  return (
    <div className="course-viewer">
      {/* 1. Celebratory Modal when course completed successfully */}
      {showCelebrationModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className={`rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-6 relative overflow-hidden animate-in fade-in zoom-in-95 duration-200 border ${
            isDark ? 'bg-slate-900 border-emerald-500/50' : 'bg-white border-emerald-300 shadow-xl'
          }`}>
            {/* Ambient Glow */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-fuchsia-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <button
              onClick={() => setShowCelebrationModal(false)}
              className={`absolute top-4 right-4 p-2 rounded-full transition-colors ${
                isDark ? 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
              }`}
            >
              <FiX className="w-5 h-5" />
            </button>

            <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center mx-auto text-4xl shadow-lg ${
              isDark ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-emerald-500/20' : 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-emerald-500/10'
            }`}>
              <FiAward />
            </div>

            <div>
              <span className={`text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full border ${
                isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : 'text-emerald-800 bg-emerald-50 border-emerald-300'
              }`}>
                ยินดีด้วย! ผ่านการประเมิน 100%
              </span>
              <h2 className={`text-xl sm:text-2xl font-black mt-3 leading-snug ${
                isDark ? 'text-white' : 'text-slate-900'
              }`}>
                {course.title}
              </h2>
              <p className={`text-xs mt-2 leading-relaxed ${
                isDark ? 'text-slate-300' : 'text-slate-600'
              }`}>
                สมรรถนะได้รับการประเมินและบันทึกลงในระบบรับรอง (ISO 9001:2015 Clause 7.2) เรียบร้อยแล้ว
              </p>
            </div>

            {/* Score & Certificate ID Card */}
            <div className={`p-4 rounded-2xl border space-y-2 ${
              isDark ? 'bg-slate-850 border-slate-750' : 'bg-slate-50 border-slate-200'
            }`}>
              {latestExamScore && (
                <div className={`flex items-center justify-between pb-2 border-b text-xs font-bold ${
                  isDark ? 'border-slate-750' : 'border-slate-200'
                }`}>
                  <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>ผลการทดสอบวัดผล:</span>
                  <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                    {latestExamScore.score}/{latestExamScore.total} ข้อ ({latestExamScore.percentage}%) ✓ ผ่านเกณฑ์
                  </span>
                </div>
              )}
              <div className={`text-[11px] font-semibold uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                เลขที่ใบรับรองสมรรถนะ (Certificate ID)
              </div>
              <div className={`text-base font-mono font-black ${
                isDark ? 'text-cyan-300' : 'text-cyan-800'
              }`}>
                {earnedCertId || 'SNC-CERT-2026-LIVE'}
              </div>
              <div className={`text-[10px] font-bold pt-1 ${
                isDark ? 'text-amber-300' : 'text-amber-700'
              }`}>
                🎉 ได้รับโบนัสเกียรติยศ +50 EXP
              </div>
              {currentUser?.can_view_grading && userGrading && userGrading.grade_learning && (
                <div className={`mt-2 pt-2 border-t flex items-center justify-between text-[11px] font-bold ${
                  isDark ? 'border-slate-750 text-slate-300' : 'border-slate-200 text-slate-700'
                }`}>
                  <span>เกรดการเรียนรู้ (MES 4D Grading):</span>
                  <span className={`px-2 py-0.5 rounded-md font-black ${
                    isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    Learning {userGrading.grade_learning || 'C'} · Overall {userGrading.grade_overall || 'B'} ({userGrading.skill_count || 1}/{userGrading.learning_target_a || 3} ทักษะ)
                  </span>
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                onClick={() => {
                  setShowCelebrationModal(false);
                  setIsCertificateModalOpen(true);
                }}
                className="py-3 px-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 hover:scale-105 active:scale-95"
              >
                <FiAward className="w-4 h-4" />
                <span>พิมพ์ใบประกาศนียบัตร</span>
              </button>
              <button
                onClick={() => navigate('/profile')}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-all flex items-center justify-center gap-2 border border-slate-700"
              >
                <FiUser className="w-4 h-4 text-emerald-400" />
                <span>พาสปอร์ต</span>
              </button>
              <button
                onClick={() => setShowCelebrationModal(false)}
                className="py-3 px-3 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition-colors"
              >
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Mandatory Post-Test Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className={`border rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200 ${
            isDark ? 'bg-slate-900 border-purple-500/40' : 'bg-white border-purple-200'
          }`}>
            {/* Header */}
            <div className={`flex items-start justify-between pb-5 border-b ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded border ${
                    isDark ? 'text-fuchsia-400 bg-fuchsia-500/10 border-fuchsia-500/30' : 'text-fuchsia-800 bg-fuchsia-50 border-fuchsia-200 font-bold'
                  }`}>
                    ISO 9001:2015 Clause 7.2 Evaluation
                  </span>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded border ${
                    isDark ? 'text-amber-300 bg-amber-500/10 border-amber-500/30' : 'text-amber-800 bg-amber-50 border-amber-300 font-bold'
                  }`}>
                    เกณฑ์ผ่าน ≥ 80%
                  </span>
                </div>
                <h2 className={`text-lg sm:text-xl font-black ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  แบบทดสอบวัดผลประสิทธิผลการฝึกอบรม (Post-Test Assessment)
                </h2>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  หลักสูตร: <span className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{course.title}</span>
                </p>
              </div>

              <button
                onClick={() => setShowAssessmentModal(false)}
                className={`p-2 rounded-full transition-colors flex-shrink-0 ${
                  isDark ? 'text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700' : 'text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200'
                }`}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Assessment Content Body */}
            <div className="py-6 space-y-6 max-h-[60vh] overflow-y-auto pr-1">
              {/* Failure Review Screen if failed */}
              {assessmentReview?.failed ? (
                <div className="space-y-6">
                  {/* Failure Alert Banner */}
                  <div className={`p-4 rounded-2xl border space-y-2 ${
                    isDark ? 'bg-rose-500/15 border-rose-500/40 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-900'
                  }`}>
                    <div className={`flex items-center gap-2 text-sm font-bold ${
                      isDark ? 'text-rose-300' : 'text-rose-800'
                    }`}>
                      <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>ยังไม่ผ่านเกณฑ์การประเมิน (คะแนนที่ได้ {assessmentReview.score} / {assessmentReview.total} ข้อ หรือ {assessmentReview.percentage}%)</span>
                    </div>
                    <p className={`text-xs leading-relaxed pl-7 ${
                      isDark ? 'text-slate-300' : 'text-slate-700'
                    }`}>
                      ตามมาตรฐาน ISO 9001:2015 และข้อกำหนดฝ่ายผลิต กำหนดให้ผู้เข้ารับการฝึกอบรมต้องได้คะแนนไม่ต่ำกว่า <strong>80% (ตอบถูกอย่างน้อย 3 ใน 4 ข้อ)</strong> เพื่อยืนยันประสิทธิผลของการเรียนรู้ กรุณาตรวจสอบคำอธิบายข้อที่ตอบผิดด้านล่างและทำแบบทดสอบใหม่อีกครั้ง
                    </p>
                  </div>

                  {/* Review of Questions */}
                  <div className="space-y-5">
                    {assessmentReview.questions.map((q, idx) => {
                      const userChoice = assessmentReview.answers[idx];
                      const isCorrect = userChoice === q.correctAnswer;

                      return (
                        <div 
                          key={q.id || idx}
                          className={`p-5 rounded-2xl border space-y-3 ${
                            isDark
                              ? isCorrect 
                                ? 'bg-emerald-950/20 border-emerald-500/30' 
                                : 'bg-rose-950/20 border-rose-500/40'
                              : isCorrect
                                ? 'bg-emerald-50/50 border-emerald-300'
                                : 'bg-rose-50/50 border-rose-300'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className={`text-sm font-bold leading-snug ${
                              isDark ? 'text-white' : 'text-slate-900'
                            }`}>
                              {idx + 1}. {q.question}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold flex-shrink-0 flex items-center gap-1 ${
                              isCorrect 
                                ? isDark ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold'
                                : isDark ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-rose-100 text-rose-800 border border-rose-300 font-bold'
                            }`}>
                              {isCorrect ? <><FiCheck /> ถูกต้อง</> : <><FiX /> ตอบผิด</>}
                            </span>
                          </div>

                          <div className="space-y-2 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const isUserChoice = userChoice === optIdx;
                              const isRealCorrect = q.correctAnswer === optIdx;

                              let optClass = isDark ? 'bg-slate-800/50 border-slate-700/60 text-slate-400' : 'bg-white border-slate-200 text-slate-700 shadow-sm';
                              if (isRealCorrect) {
                                optClass = isDark 
                                  ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-semibold' 
                                  : 'bg-emerald-100 border-emerald-400 text-emerald-900 font-bold';
                              } else if (isUserChoice && !isCorrect) {
                                optClass = isDark 
                                  ? 'bg-rose-500/15 border-rose-500/50 text-rose-300 line-through' 
                                  : 'bg-rose-100 border-rose-400 text-rose-900 line-through';
                              }

                              return (
                                <div key={optIdx} className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optClass}`}>
                                  <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                  {isRealCorrect && (
                                    <span className={`text-[10px] font-bold ml-2 flex-shrink-0 ${isDark ? 'text-emerald-400' : 'text-emerald-800'}`}>
                                      ✓ คำตอบที่ถูกต้อง
                                    </span>
                                  )}
                                  {isUserChoice && !isCorrect && (
                                    <span className={`text-[10px] font-bold ml-2 flex-shrink-0 ${isDark ? 'text-rose-400' : 'text-rose-800'}`}>
                                      ✗ คำตอบที่คุณเลือก
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2 ${
                              isDark ? 'bg-cyan-500/10 border-cyan-500/20 text-cyan-200' : 'bg-cyan-50 border-cyan-300 text-cyan-900'
                            }`}>
                              <span className="font-bold flex-shrink-0">💡 คำอธิบายทางวิศวกรรม:</span>
                              <span>{q.explanation}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* Standard Exam Form */
                <div className="space-y-6">
                  <div className={`p-3.5 rounded-xl border text-xs flex items-center justify-between ${
                    isDark ? 'bg-slate-800/80 border-slate-750 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}>
                    <span>กรุณาอ่านคำถามและเลือกคำตอบที่ถูกต้องที่สุดในแต่ละข้อ</span>
                    <span className={`font-bold ${isDark ? 'text-fuchsia-400' : 'text-fuchsia-700'}`}>
                      ตอบแล้ว {Object.keys(userAnswers).length} / {assessmentQuestions.length} ข้อ
                    </span>
                  </div>

                  {assessmentQuestions.map((q, qIdx) => {
                    const selectedOpt = userAnswers[qIdx];

                    return (
                      <div key={q.id || qIdx} className={`border rounded-2xl p-5 space-y-3.5 ${
                        isDark ? 'bg-slate-850 border-slate-750' : 'bg-slate-50/80 border-slate-200 shadow-sm'
                      }`}>
                        <h3 className={`text-sm font-bold leading-snug ${
                          isDark ? 'text-white' : 'text-slate-900'
                        }`}>
                          {qIdx + 1}. {q.question}
                        </h3>

                        <div className="space-y-2">
                          {q.options.map((opt, optIdx) => {
                            const isSelected = selectedOpt === optIdx;

                            return (
                              <button
                                key={optIdx}
                                type="button"
                                onClick={() => handleSelectOption(qIdx, optIdx)}
                                className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all flex items-start gap-3 ${
                                  isSelected
                                    ? isDark
                                      ? 'bg-fuchsia-600/20 border-fuchsia-500 text-white font-medium shadow-sm ring-1 ring-fuchsia-500/40'
                                      : 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-950 font-bold shadow-sm ring-1 ring-fuchsia-500/40'
                                    : isDark
                                      ? 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-300 hover:text-white'
                                      : 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800 hover:text-slate-950 shadow-sm font-medium'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 border ${
                                  isSelected 
                                    ? 'bg-fuchsia-500 border-fuchsia-400 text-white' 
                                    : isDark
                                      ? 'border-slate-600 text-slate-400'
                                      : 'border-slate-300 text-slate-700 bg-slate-100'
                                }`}>
                                  {String.fromCharCode(65 + optIdx)}
                                </span>
                                <span className="flex-1 leading-relaxed">
                                  {opt}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Error Message if not all answered */}
            {assessmentError && (
              <div className={`p-3 mt-2 rounded-xl border text-xs flex items-center gap-2 ${
                isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-300' : 'bg-rose-50 border-rose-300 text-rose-900 font-bold'
              }`}>
                <FiAlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-500" />
                <span>{assessmentError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className={`pt-5 border-t flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              {assessmentReview?.failed ? (
                <>
                  <button
                    onClick={() => {
                      setShowAssessmentModal(false);
                      setActiveModuleId(course.modules[0].id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold border transition-colors flex items-center justify-center gap-2 ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 shadow-sm'
                    }`}
                  >
                    <FiBookOpen className="w-4 h-4" />
                    <span>กลับไปทบทวนบทเรียน</span>
                  </button>
                  <button
                    onClick={handleRetakeExam}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    <span>สอบใหม่อีกครั้ง (Retake Exam)</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setShowAssessmentModal(false)}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-medium border transition-colors ${
                      isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm'
                    }`}
                  >
                    ยกเลิกและกลับสู่บทเรียน
                  </button>
                  <button
                    onClick={handleSubmitAssessment}
                    className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                  >
                    <FiCheckCircle className="w-4 h-4" />
                    <span>ส่งคำตอบและประเมินผล (Submit Assessment)</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Desktop Sidebar / Syllabus */}
      <div className="viewer-sidebar hidden md:flex md:flex-col shrink-0 md:w-80">
        <div className="sidebar-header shrink-0 w-full">
          <div className="flex items-center justify-between mb-3">
            <button 
              onClick={() => navigate('/')}
              className={`h-8 px-2.5 rounded-lg border text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-sm ${
                isDark 
                  ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700/80 hover:text-white' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 hover:text-slate-900'
              }`}
              title="ย้อนกลับสู่หน้ารวมหลักสูตร"
            >
              <FiArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setIsTrainerGuideOpen(true)}
                className={`w-8 h-8 rounded-lg border transition-all flex items-center justify-center shadow-sm ${
                  isDark
                    ? 'bg-purple-950/70 hover:bg-purple-900/90 text-purple-200 border-purple-500/40 hover:border-purple-400'
                    : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-300'
                }`}
                title="คู่มือวิทยากรและแผนการสอน 3 วัน"
              >
                <FiBookOpen className="w-4 h-4 text-purple-400 dark:text-purple-300" />
              </button>
              <button
                onClick={() => navigate(`/admin/course-builder?courseId=${course.id}`)}
                className={`w-8 h-8 rounded-lg border transition-colors flex items-center justify-center shadow-sm ${
                  isDark
                    ? 'bg-slate-800 hover:bg-amber-500/20 text-slate-300 hover:text-amber-300 border-slate-700/80'
                    : 'bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 border-slate-200'
                }`}
                title="แก้ไขหลักสูตรนี้"
              >
                <FiEdit2 className="w-3.5 h-3.5 text-amber-500" />
              </button>
            </div>
          </div>
          <h3>{course.title}</h3>
          <div className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            {totalModules} บทเรียน · {course.duration}
          </div>

          {/* Real-time Progress Bar */}
          <div className={`mt-4 p-3 rounded-xl border ${
            isDark ? 'bg-slate-900/90 border-slate-700/60' : 'bg-slate-50 border-slate-200 shadow-sm'
          }`}>
            <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
              <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>ความคืบหน้า</span>
              <span className={
                isCompleted 
                  ? isDark ? 'text-emerald-400 font-mono font-bold' : 'text-emerald-700 font-mono font-bold'
                  : isDark ? 'text-fuchsia-400 font-mono' : 'text-fuchsia-700 font-mono font-bold'
              }>
                {isCompleted ? '✓ ผ่านแล้ว 100%' : `${progressPercent}%`}
              </span>
            </div>
            <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
              <div 
                className={`h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-fuchsia-500 to-violet-500'}`}
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <div className={`text-[10px] mt-1.5 flex items-center justify-between ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <span>ผ่านแล้ว {completedModuleIds.length}/{totalModules} บท</span>
              {isCompleted && (
                <span className={`font-bold flex items-center gap-1 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
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
                onClick={() => {
                  setActiveModuleId(module.id);
                }}
              >
                <div className="module-icon">
                  {isDone ? (
                    <FiCheckCircle className="text-emerald-500 w-4 h-4" />
                  ) : isSelected ? (
                    <FiCircle className={isDark ? 'text-fuchsia-400 w-4 h-4' : 'text-fuchsia-600 w-4 h-4'} />
                  ) : (
                    <FiCircle className={isDark ? 'text-slate-600 w-4 h-4' : 'text-slate-400 w-4 h-4'} />
                  )}
                </div>
                <div className="module-info">
                  <span className="module-number flex items-center justify-between">
                    <span>Lesson {index + 1}</span>
                    {isDone && (
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        isDark ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-800 bg-emerald-50 border border-emerald-200'
                      }`}>
                        ผ่าน
                      </span>
                    )}
                  </span>
                  <span className={`module-title ${isDone ? (isDark ? 'text-slate-200' : 'text-slate-900 font-semibold') : ''}`}>
                    {module.title}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Sticky Lesson Bar (Visible only on screens < md) */}
      <div className={`md:hidden sticky top-16 z-30 px-3 py-2 border-b flex items-center justify-between gap-2 shadow-md transition-colors ${
        isDark ? 'bg-slate-900/95 backdrop-blur-md border-slate-800' : 'bg-white/95 backdrop-blur-md border-slate-200'
      }`}>
        <button
          onClick={() => navigate('/')}
          className={`p-2 rounded-xl border flex-shrink-0 transition-colors ${
            isDark ? 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
          }`}
          title="กลับหน้าหลัก (Back to Catalog)"
        >
          <FiArrowLeft className="w-4 h-4" />
        </button>

        {/* Interactive Dropdown Button that reveals Syllabus Bottom Sheet */}
        <button
          onClick={() => setIsMobileSyllabusOpen(prev => !prev)}
          className={`flex-1 min-w-0 border rounded-xl px-2.5 py-1.5 flex items-center justify-between gap-2 transition-all active:scale-[0.99] ${
            isDark ? 'bg-slate-800/80 hover:bg-slate-800 border-slate-700' : 'bg-slate-100 hover:bg-slate-200 border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 text-left">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
              completedModuleIds.includes(activeModuleId) || isCompleted
                ? 'bg-emerald-500 text-white'
                : 'bg-fuchsia-600 text-white'
            }`}>
              {currentIndex + 1}
            </div>
            <div className="min-w-0">
              <div className={`text-[10px] font-bold leading-none ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                บทที่ {currentIndex + 1}/{totalModules}
              </div>
              <div className={`text-xs font-bold truncate leading-tight mt-0.5 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {activeModule?.title || 'เลือกบทเรียน'}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
              isCompleted 
                ? isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-800'
                : isDark ? 'bg-fuchsia-500/20 text-fuchsia-300' : 'bg-fuchsia-100 text-fuchsia-800'
            }`}>
              {progressPercent}%
            </span>
            <FiChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isMobileSyllabusOpen ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Quick Nav Prev / Next Arrow Buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={handlePrevLesson}
            disabled={currentIndex === 0}
            className={`p-2 rounded-xl border transition-colors ${
              currentIndex === 0
                ? 'opacity-35 cursor-not-allowed border-transparent text-slate-600'
                : isDark
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
            }`}
            title="บทก่อนหน้า"
          >
            <FiChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={handleNextLesson}
            disabled={currentIndex >= totalModules - 1 || !isCurrentModuleUnlocked}
            className={`p-2 rounded-xl border transition-colors ${
              currentIndex >= totalModules - 1 || !isCurrentModuleUnlocked
                ? 'opacity-35 cursor-not-allowed border-transparent text-slate-600'
                : 'bg-fuchsia-600 hover:bg-fuchsia-500 text-white border-fuchsia-500 shadow-sm'
            }`}
            title="บทถัดไป"
          >
            <FiChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile Syllabus Dropdown Menu / Floating Modal */}
      {isMobileSyllabusOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-black/65 backdrop-blur-sm flex flex-col pt-24 px-3 pb-6 animate-in fade-in duration-150">
          {/* Backdrop Tap to Close */}
          <div className="fixed inset-0" onClick={() => setIsMobileSyllabusOpen(false)} />

          <div className={`relative max-w-md w-full mx-auto rounded-2xl border shadow-2xl flex flex-col max-h-[75vh] overflow-hidden animate-in zoom-in-95 slide-in-from-top-4 duration-200 z-10 ${
            isDark ? 'bg-slate-900 border-slate-750' : 'bg-white border-slate-200 shadow-xl'
          }`}>
            {/* Drawer Header */}
            <div className={`p-4 border-b flex items-center justify-between ${
              isDark ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  isDark ? 'text-fuchsia-400' : 'text-fuchsia-700'
                }`}>
                  สารบัญหลักสูตร (Syllabus)
                </span>
                <h3 className={`text-sm font-black mt-0.5 truncate max-w-[250px] ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}>
                  {course.title}
                </h3>
              </div>
              <button
                onClick={() => setIsMobileSyllabusOpen(false)}
                className={`p-2 rounded-full transition-colors ${
                  isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                }`}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            {/* Progress Bar inside drawer */}
            <div className={`px-4 py-3 border-b ${
              isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1.5 font-bold">
                <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>ความคืบหน้ารวม</span>
                <span className={
                  isCompleted 
                    ? isDark ? 'text-emerald-400 font-mono' : 'text-emerald-700 font-mono font-bold'
                    : isDark ? 'text-fuchsia-400 font-mono' : 'text-fuchsia-700 font-mono font-bold'
                }>
                  {isCompleted ? '✓ ผ่านแล้ว 100%' : `${progressPercent}%`}
                </span>
              </div>
              <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`}>
                <div 
                  className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-fuchsia-500 to-violet-500'}`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
              <div className="flex items-center justify-between mt-2 text-xs">
                <span className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ผ่านแล้ว {completedModuleIds.length}/{totalModules} บท ({course.duration})
                </span>
                <button
                  onClick={() => {
                    setIsMobileSyllabusOpen(false);
                    setIsTrainerGuideOpen(true);
                  }}
                  className={`font-bold underline flex items-center gap-1 ${
                    isDark ? 'text-purple-300 hover:text-purple-200' : 'text-purple-700 hover:text-purple-900'
                  }`}
                >
                  <span>📘 แผนการสอน 3 วัน</span>
                </button>
              </div>
            </div>

            {/* Syllabus Lessons List in Drawer */}
            <div className="overflow-y-auto p-3 space-y-2 flex-1">
              {course.modules?.map((module, index) => {
                const isSelected = activeModule?.id === module.id;
                const isDone = completedModuleIds.includes(module.id) || isCompleted;

                return (
                  <div
                    key={module.id}
                    onClick={() => {
                      setActiveModuleId(module.id);
                      setIsMobileSyllabusOpen(false);
                    }}
                    className={`p-3 rounded-2xl border flex items-center gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? isDark
                          ? 'bg-fuchsia-600/20 border-fuchsia-500 text-white ring-1 ring-fuchsia-500/50 shadow-sm'
                          : 'bg-fuchsia-50 border-fuchsia-500 text-fuchsia-950 ring-1 ring-fuchsia-500/50 shadow-sm'
                        : isDone
                          ? isDark
                            ? 'bg-slate-850/80 border-emerald-500/30 text-slate-200 hover:border-emerald-500/50'
                            : 'bg-white border-emerald-200 text-slate-800 hover:border-emerald-400'
                          : isDark
                            ? 'bg-slate-850 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex-shrink-0">
                      {isDone ? (
                        <FiCheckCircle className="text-emerald-500 w-5 h-5" />
                      ) : isSelected ? (
                        <div className="w-5 h-5 rounded-full border-2 border-fuchsia-500 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-fuchsia-500" />
                        </div>
                      ) : (
                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                          isDark ? 'border-slate-700 text-slate-500' : 'border-slate-300 text-slate-600'
                        }`}>
                          {index + 1}
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-[11px] mb-0.5">
                        <span className={`font-bold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                          บทเรียนที่ {index + 1}
                        </span>
                        {isDone && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                            isDark ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-emerald-800 bg-emerald-50 border-emerald-200'
                          }`}>
                            ผ่านแล้ว
                          </span>
                        )}
                        {isSelected && !isDone && (
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            isDark ? 'text-fuchsia-300 bg-fuchsia-500/20' : 'text-fuchsia-800 bg-fuchsia-100'
                          }`}>
                            กำลังเรียน
                          </span>
                        )}
                      </div>
                      <div className={`text-xs font-bold leading-snug line-clamp-2 ${
                        isSelected 
                          ? isDark ? 'text-white' : 'text-fuchsia-950'
                          : isDark ? 'text-slate-300' : 'text-slate-800'
                      }`}>
                        {module.title}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="viewer-content" ref={contentTopRef}>
        <div className="content-body">
          {/* Completed Golden Banner */}
          {isCompleted && (
            <div className={`p-4 mb-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm ${
              isDark
                ? 'bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 border-emerald-500/30 text-emerald-200'
                : 'bg-emerald-50 border-emerald-300 text-emerald-950'
            }`}>
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${
                  isDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-emerald-100 text-emerald-700'
                }`}>
                  <FiAward />
                </div>
                <div>
                  <div className={`text-sm font-bold flex flex-wrap items-center gap-2 ${
                    isDark ? 'text-white' : 'text-slate-900'
                  }`}>
                    <span>คุณผ่านการอบรมหลักสูตรนี้สำเร็จ 100%</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono border ${
                      isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-emerald-100 text-emerald-800 border-emerald-300 font-bold'
                    }`}>
                      {earnedCertId || courseStatus?.certificateId || 'SNC-CERT'}
                    </span>
                  </div>
                  <div className={`text-xs mt-0.5 ${
                    isDark ? 'text-slate-300' : 'text-slate-600 font-medium'
                  }`}>
                    สมรรถนะได้รับการประเมินตาม ISO 9001 Clause 7.2 พร้อมรับการตรวจออดิท
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap pt-1 sm:pt-0">
                <button
                  onClick={() => setIsCertificateModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl text-xs font-black transition-all shadow-md flex items-center gap-1.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 hover:scale-105 active:scale-95"
                  title="เปิดดูและพิมพ์ใบประกาศนียบัตรรับรองสมรรถนะ"
                >
                  <FiAward className="w-3.5 h-3.5" />
                  <span>พิมพ์ใบประกาศฯ</span>
                </button>
                <button
                  onClick={() => navigate('/profile')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 ${
                    isDark ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700' : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-300'
                  }`}
                >
                  <FiShield className="w-3.5 h-3.5 text-cyan-500" />
                  <span>พาสปอร์ต</span>
                </button>
              </div>
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

          {/* W3Schools-Style Active Recall Checkpoint Card */}
          {currentCheckpoint && (
            <div className={`mt-8 p-5 md:p-6 rounded-2xl border transition-all duration-300 ${
              isDark
                ? checkpointStatus === 'correct'
                  ? 'bg-gradient-to-br from-emerald-950/40 via-slate-900 to-teal-950/40 border-emerald-500/40 shadow-xl shadow-emerald-500/10 ring-1 ring-emerald-500/30'
                  : checkpointStatus === 'incorrect'
                    ? 'bg-gradient-to-br from-rose-950/30 via-slate-900 to-slate-900 border-rose-500/40 shadow-xl shadow-rose-500/10'
                    : 'bg-gradient-to-br from-purple-950/30 via-slate-900 to-indigo-950/30 border-purple-500/30 shadow-xl shadow-purple-500/10'
                : checkpointStatus === 'correct'
                  ? 'bg-emerald-50/60 border-emerald-300 shadow-md ring-1 ring-emerald-400/40'
                  : checkpointStatus === 'incorrect'
                    ? 'bg-rose-50/60 border-rose-300 shadow-md ring-1 ring-rose-400/40'
                    : 'bg-white border-purple-200 shadow-sm ring-1 ring-purple-100'
            }`}>
              {/* Checkpoint Header */}
              <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 pb-3 border-b ${
                isDark ? 'border-slate-800/80' : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2.5">
                  <span className={`w-8 h-8 rounded-xl flex items-center justify-center text-base shadow-sm border ${
                    isDark ? 'bg-purple-500/20 border-purple-500/30 text-purple-300' : 'bg-purple-50 border-purple-200 text-purple-700'
                  }`}>
                    🎯
                  </span>
                  <div>
                    <h4 className={`text-sm font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Checkpoint ท้ายบทเรียน (Active Recall)
                    </h4>
                    <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {totalCheckpointsInModule > 1
                        ? `ตอบคำถามทบทวนท้ายบทเรียนให้ครบทั้ง ${totalCheckpointsInModule} ข้อ (ผ่านแล้ว ${passedCountInModule}/${totalCheckpointsInModule} ข้อ) เพื่อปลดล็อกบทเรียนถัดไป`
                        : 'ตอบคำถามวัดความเข้าใจสั้นๆ 1 ข้อด้านล่างให้ถูกต้องเพื่อปลดล็อกบทเรียนถัดไป'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  {isCurrentModuleUnlocked ? (
                    <span className={`px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 shadow-sm ${
                      isDark ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}>
                      <FiCheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                      <span>ผ่านครบแล้ว (+5 EXP)</span>
                    </span>
                  ) : (
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold border flex items-center gap-1.5 ${
                      isDark ? 'bg-slate-800 text-slate-400 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-300'
                    }`}>
                      <FiLock className="w-3.5 h-3.5 text-amber-500" />
                      <span>
                        {totalCheckpointsInModule > 1
                          ? `ผ่านแล้ว ${passedCountInModule}/${totalCheckpointsInModule} ข้อ (+5 EXP)`
                          : 'ปลดล็อกเมื่อตอบถูก (+5 EXP)'}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Multi-question Selector Pills (shown when module has > 1 checkpoint question) */}
              {totalCheckpointsInModule > 1 && (
                <div className="flex flex-wrap items-center gap-2 mb-4">
                  {checkpointList.map((cpItem, qIdx) => {
                    const isQPassed = Boolean(passedCheckpointMap[qIdx]) || isCurrentModuleUnlocked;
                    const isQActive = qIdx === activeCheckpointIdx;
                    return (
                      <button
                        key={cpItem.id || qIdx}
                        type="button"
                        onClick={() => handleSwitchCheckpointQuestion(qIdx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 cursor-pointer ${
                          isQActive
                            ? isDark
                              ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-500/20'
                              : 'bg-purple-600 text-white border-purple-600 shadow-sm'
                            : isQPassed
                              ? isDark
                                ? 'bg-emerald-950/50 text-emerald-300 border-emerald-500/40 hover:bg-emerald-900/50'
                                : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                              : isDark
                                ? 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200'
                                : 'bg-slate-100 text-slate-600 border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {isQPassed ? (
                          <FiCheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <span className="w-4 h-4 rounded-full bg-black/20 flex items-center justify-center text-[10px]">
                            {qIdx + 1}
                          </span>
                        )}
                        <span>ข้อที่ {qIdx + 1}/{totalCheckpointsInModule}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Question */}
              <div className="mb-4">
                <p className={`text-sm font-semibold leading-relaxed ${isDark ? 'text-slate-100' : 'text-slate-900 font-bold'}`}>
                  {currentCheckpoint.question}
                </p>
              </div>

              {/* 4 Choices (A, B, C, D) */}
              <div className="grid grid-cols-1 gap-2.5 mb-4">
                {currentCheckpoint.options.map((opt, optIdx) => {
                  const isSelected = checkpointSelected === optIdx;
                  const isCorrectChoice = optIdx === currentCheckpoint.correctAnswer;
                  const isAnswered = checkpointStatus !== null;

                  let btnClass = isDark
                    ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80 hover:border-slate-600'
                    : 'bg-white hover:bg-purple-50/60 text-slate-800 border-slate-200 hover:border-purple-300 shadow-sm font-medium';
                  let badgeClass = isDark
                    ? 'bg-slate-700/80 text-slate-300 border-slate-600'
                    : 'bg-slate-100 text-slate-700 border-slate-300';

                  if (isAnswered) {
                    if (isCorrectChoice) {
                      btnClass = isDark
                        ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500 ring-1 ring-emerald-500/40 shadow-sm font-medium'
                        : 'bg-emerald-50 text-emerald-950 border-emerald-500 ring-2 ring-emerald-500/30 shadow-sm font-bold';
                      badgeClass = isDark
                        ? 'bg-emerald-500 text-white border-emerald-400 font-bold'
                        : 'bg-emerald-600 text-white border-emerald-500 font-bold';
                    } else if (isSelected && !isCorrectChoice) {
                      btnClass = isDark
                        ? 'bg-rose-500/20 text-rose-200 border-rose-500 ring-1 ring-rose-500/40 font-medium'
                        : 'bg-rose-50 text-rose-950 border-rose-500 ring-2 ring-rose-500/30 font-bold';
                      badgeClass = isDark
                        ? 'bg-rose-500 text-white border-rose-400 font-bold'
                        : 'bg-rose-600 text-white border-rose-500 font-bold';
                    } else {
                      btnClass = isDark
                        ? 'bg-slate-900/60 text-slate-500 border-slate-800/80 opacity-60'
                        : 'bg-slate-50 text-slate-400 border-slate-200 opacity-60';
                      badgeClass = isDark
                        ? 'bg-slate-800 text-slate-500 border-slate-700'
                        : 'bg-slate-100 text-slate-400 border-slate-200';
                    }
                  } else if (isSelected) {
                    btnClass = isDark
                      ? 'bg-purple-600/30 text-white border-purple-500 ring-1 ring-purple-500/50'
                      : 'bg-purple-50 text-purple-950 border-purple-500 ring-2 ring-purple-500/30 font-semibold shadow-sm';
                    badgeClass = isDark
                      ? 'bg-purple-500 text-white border-purple-400'
                      : 'bg-purple-600 text-white border-purple-500 font-bold';
                  }

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectCheckpointOption(optIdx)}
                      className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm transition-all duration-200 flex items-start gap-3 min-h-[44px] cursor-pointer ${btnClass}`}
                    >
                      <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 border shadow-sm ${badgeClass}`}>
                        {isAnswered && isCorrectChoice ? (
                          <FiCheck className="w-3.5 h-3.5" />
                        ) : isAnswered && isSelected && !isCorrectChoice ? (
                          <FiX className="w-3.5 h-3.5" />
                        ) : (
                          String.fromCharCode(65 + optIdx)
                        )}
                      </span>
                      <span className="flex-1 leading-relaxed">
                        {opt.replace(/^[A-D]:\s*/, '')}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Result Feedback & Hint */}
              {checkpointStatus === 'incorrect' && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                  isDark ? 'bg-rose-500/10 border-rose-500/30 text-rose-200' : 'bg-rose-50 border-rose-300 text-rose-900'
                }`}>
                  <div className={`flex items-center gap-2 font-bold ${isDark ? 'text-rose-300' : 'text-rose-800'}`}>
                    <FiAlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>ยังไม่ถูกต้อง! ลองทบทวนเนื้อหาและเลือกคำตอบใหม่อีกครั้ง</span>
                  </div>
                  {checkpointShowHint && currentCheckpoint.hint && (
                    <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                      isDark ? 'bg-slate-900/80 border-amber-500/30 text-amber-300' : 'bg-amber-50 border-amber-300 text-amber-900'
                    }`}>
                      <span className="text-base flex-shrink-0">💡</span>
                      <div className="leading-relaxed">
                        <strong className={isDark ? 'text-amber-200' : 'text-amber-800'}>คำใบ้: </strong>
                        <span>{currentCheckpoint.hint}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {checkpointStatus === 'correct' && (
                <div className={`p-4 rounded-xl border text-xs space-y-2 animate-fadeIn ${
                  isDark ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                }`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className={`flex items-center gap-2 font-bold text-sm ${isDark ? 'text-emerald-300' : 'text-emerald-800'}`}>
                      <FiCheckCircle className="w-5 h-5 text-emerald-500 flex-shrink-0" />
                      <span>ยอดเยี่ยมมาก! ตอบถูกต้องตามหลักวิศวกรรม/มาตรฐานอุตสาหกรรม</span>
                    </div>
                    {isCurrentModuleUnlocked ? (
                      <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                        isDark ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-900 bg-emerald-100 border border-emerald-300'
                      }`}>
                        ✓ ปลดล็อกบทเรียนแล้ว
                      </span>
                    ) : (
                      <span className={`text-[11px] font-mono px-2.5 py-0.5 rounded-full font-bold ${
                        isDark ? 'text-amber-300 bg-amber-500/20' : 'text-amber-900 bg-amber-100 border border-amber-300'
                      }`}>
                        ผ่านข้อนี้แล้ว ({passedCountInModule}/{totalCheckpointsInModule})
                      </span>
                    )}
                  </div>
                  {currentCheckpoint.explanation && (
                    <div className={`p-3 rounded-lg border text-xs leading-relaxed ${
                      isDark ? 'bg-slate-900/80 border-emerald-500/20 text-slate-300' : 'bg-white border-emerald-200 text-slate-800 shadow-sm'
                    }`}>
                      <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>คำอธิบายเฉลย: </strong>
                      <span>{currentCheckpoint.explanation}</span>
                    </div>
                  )}
                  {totalCheckpointsInModule > 1 && activeCheckpointIdx < totalCheckpointsInModule - 1 && (
                    <div className="pt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleSwitchCheckpointQuestion(activeCheckpointIdx + 1)}
                        className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <span>ทำข้อถัดไป (ข้อที่ {activeCheckpointIdx + 2}/{totalCheckpointsInModule}) →</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Bottom Lesson Navigation & Complete/Assessment Buttons */}
          <div className={`flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            {currentIndex > 0 ? (
              <button 
                onClick={handlePrevLesson}
                className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-medium transition-colors border flex items-center justify-center gap-2 ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-slate-300 shadow-sm'
                }`}
              >
                ← Previous Lesson
              </button>
            ) : <div className="hidden sm:block"></div>}
            
            {currentIndex < totalModules - 1 ? (
              !isCurrentModuleUnlocked ? (
                <button 
                  disabled
                  className={`w-full sm:w-auto px-6 py-2.5 rounded-lg font-bold border cursor-not-allowed flex items-center justify-center gap-2 opacity-60 ${
                    isDark ? 'bg-slate-800/80 text-slate-500 border-slate-700/60' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                  title="ตอบ Checkpoint ท้ายบทเรียนให้ถูกต้องเพื่อปลดล็อก"
                >
                  <FiLock className="w-4 h-4 text-amber-500" />
                  <span>Next Lesson → (ตอบ Checkpoint เพื่อปลดล็อก)</span>
                </button>
              ) : (
                <button 
                  onClick={handleNextLesson}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-purple-600 hover:from-fuchsia-500 hover:to-purple-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-fuchsia-500/25 flex items-center justify-center gap-2 hover:-translate-y-0.5"
                >
                  <span>Next Lesson →</span>
                </button>
              )
            ) : (
              /* Final Lesson: Must pass assessment to complete */
              !isCurrentModuleUnlocked ? (
                <button 
                  disabled
                  className={`w-full sm:w-auto px-6 py-3 rounded-xl font-bold border cursor-not-allowed flex items-center justify-center gap-2 opacity-60 ${
                    isDark ? 'bg-slate-800/80 text-slate-500 border-slate-700/60' : 'bg-slate-100 text-slate-400 border-slate-200'
                  }`}
                  title="ตอบ Checkpoint ท้ายบทเรียนให้ถูกต้องเพื่อปลดล็อก"
                >
                  <FiLock className="w-4 h-4 text-amber-500" />
                  <span>เข้าสู่แบบทดสอบ (ตอบ Checkpoint เพื่อปลดล็อก)</span>
                </button>
              ) : isCompleted ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setAssessmentReview(null);
                      setUserAnswers({});
                      setShowAssessmentModal(true);
                    }}
                    className={`w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold transition-all border flex items-center justify-center gap-2 shadow-sm ${
                      isDark 
                        ? 'bg-slate-800 hover:bg-slate-700 text-emerald-300 border-emerald-500/30' 
                        : 'bg-white hover:bg-emerald-50 text-emerald-800 border-emerald-300 shadow-sm'
                    }`}
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    <span>ทำแบบทดสอบทบทวน (Retake Exam)</span>
                  </button>
                  <button 
                    onClick={() => navigate('/profile')}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl font-bold transition-all shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2"
                  >
                    <FiAward className="w-5 h-5" />
                    <span>ดูพาสปอร์ตสมรรถนะ</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => {
                    setAssessmentReview(null);
                    setUserAnswers({});
                    setShowAssessmentModal(true);
                  }}
                  className="w-full sm:w-auto px-7 py-3 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-emerald-600 hover:from-fuchsia-500 hover:to-emerald-500 text-white rounded-xl font-black text-sm transition-all shadow-xl shadow-purple-600/30 flex items-center justify-center gap-2.5 hover:-translate-y-0.5 animate-pulse"
                >
                  <FiHelpCircle className="w-5 h-5 text-amber-300" />
                  <span>เข้าสู่แบบทดสอบวัดผลท้ายหลักสูตร (Take Final Assessment)</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>

      {/* Official Certificate Modal */}
      <CertificateModal
        isOpen={isCertificateModalOpen}
        onClose={() => setIsCertificateModalOpen(false)}
        data={{
          recipientName: currentUser?.name || 'ณภัทร นุ่มทอง',
          empId: currentUser?.emp_id || '1096902163',
          department: currentUser?.department || 'แผนกผลิตปั๊มขึ้นรูป (MT/PE)',
          courseTitle: course?.title,
          courseId: course?.id,
          certificateId: earnedCertId || courseStatus?.certificateId || 'SNC-CERT-2026-9901',
          completedDate: courseStatus?.completedAt 
            ? new Date(courseStatus.completedAt).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
            : new Date().toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }),
          scorePercentage: courseStatus?.quizPercentage || latestExamScore?.percentage || 100,
          hours: course?.duration || '24 ชั่วโมงฝึกอบรม (3 วันปฏิบัติการ)',
          instructorName: 'ณภัทร นุ่มทอง',
          instructorTitle: 'วิทยากรผู้เชี่ยวชาญด้านสถาปัตยกรรมดิจิทัลองค์กร (Lead Enterprise Architect)'
        }}
      />

      {/* 3-Day Trainer Delivery Guide Modal */}
      <TrainerGuideModal
        isOpen={isTrainerGuideOpen}
        onClose={() => setIsTrainerGuideOpen(false)}
        courseId={course?.id}
      />
    </div>
  );
}

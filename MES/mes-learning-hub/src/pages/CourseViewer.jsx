import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getCourseById } from '../data/communityStore';
import { 
  getUserModuleProgress, 
  markModuleCompleted, 
  recordCourseCompletion, 
  recordFailedAssessment,
  getUserCourseStatus 
} from '../data/trainingAuditStore';
import { getCourseAssessment } from '../data/assessmentBank';
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
  FiRefreshCw,
  FiLock,
  FiBookOpen
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
  const [latestExamScore, setLatestExamScore] = useState(null);

  // Reading Time Lock & Scroll Gate States
  const [readingSecondsLeft, setReadingSecondsLeft] = useState(0);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(false);
  const bottomSentinelRef = useRef(null);

  // Assessment Modal States
  const [showAssessmentModal, setShowAssessmentModal] = useState(false);
  const [userAnswers, setUserAnswers] = useState({});
  const [assessmentReview, setAssessmentReview] = useState(null); // null or { failed: bool, score, total, percentage, answers, questions }
  const [assessmentError, setAssessmentError] = useState('');

  // Assessment questions for this course
  const assessmentQuestions = useMemo(() => {
    return course ? getCourseAssessment(course) : [];
  }, [course]);

  // Synchronize activeModuleId when course changes
  useEffect(() => {
    if (course && course.modules?.length > 0) {
      const exists = course.modules.some(m => m.id === activeModuleId);
      if (!exists) {
        setActiveModuleId(course.modules[0].id);
      }
    }
  }, [courseId, course, activeModuleId]);

  // Reset reading timer & scroll state whenever activeModuleId changes
  useEffect(() => {
    if (!course || !activeModuleId) return;

    const alreadyDone = completedModuleIds.includes(activeModuleId) || isCompleted;
    if (alreadyDone) {
      setReadingSecondsLeft(0);
      setIsScrolledToBottom(true);
    } else {
      // Require 10 seconds minimum reading/comprehension time for new uncompleted lessons
      setReadingSecondsLeft(10);
      setIsScrolledToBottom(false);
    }
  }, [courseId, activeModuleId, isCompleted]);

  // Active 1-second countdown timer for uncompleted modules
  useEffect(() => {
    if (readingSecondsLeft <= 0) return;

    const timer = setInterval(() => {
      setReadingSecondsLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [readingSecondsLeft, activeModuleId]);

  // Scroll Gate: triggers when learner scrolls down to bottom sentinel
  useEffect(() => {
    if (!course || !activeModuleId) return;

    const alreadyDone = completedModuleIds.includes(activeModuleId) || isCompleted;
    if (alreadyDone) {
      setIsScrolledToBottom(true);
      return;
    }

    const sentinel = bottomSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsScrolledToBottom(true);
        }
      },
      { threshold: 0.1, rootMargin: '0px 0px 80px 0px' }
    );

    observer.observe(sentinel);

    const handleWindowScroll = () => {
      const scrollPos = window.innerHeight + window.scrollY;
      const docHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
      if (scrollPos >= docHeight - 120) {
        setIsScrolledToBottom(true);
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [course, activeModuleId, completedModuleIds, isCompleted]);

  // Mark module as completed when BOTH timer expires (readingSecondsLeft === 0) AND user reaches bottom
  useEffect(() => {
    if (!course || !activeModuleId) return;
    const alreadyDone = completedModuleIds.includes(activeModuleId) || isCompleted;
    if (alreadyDone) return;

    if (readingSecondsLeft === 0 && isScrolledToBottom) {
      const res = markModuleCompleted({
        courseId: course.id,
        moduleId: activeModuleId,
        totalModules: course.modules?.length || 1
      });
      setCompletedModuleIds(res.completedModules);
      setCourseStatus(getUserCourseStatus(course.id));
    }
  }, [course, activeModuleId, readingSecondsLeft, isScrolledToBottom, completedModuleIds, isCompleted]);

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

  // Switch to next lesson smoothly
  const handleNextLesson = () => {
    if (currentIndex < totalModules - 1) {
      const nextModuleId = course.modules[currentIndex + 1].id;
      setActiveModuleId(nextModuleId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Switch to previous lesson smoothly
  const handlePrevLesson = () => {
    if (currentIndex > 0) {
      const prevModuleId = course.modules[currentIndex - 1].id;
      setActiveModuleId(prevModuleId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
                ยินดีด้วย! ผ่านการประเมิน 100%
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white mt-3 leading-snug">
                {course.title}
              </h2>
              <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                สมรรถนะได้รับการประเมินและบันทึกลงในระบบรับรอง (ISO 9001:2015 Clause 7.2) เรียบร้อยแล้ว
              </p>
            </div>

            {/* Score & Certificate ID Card */}
            <div className="bg-slate-850 p-4 rounded-2xl border border-slate-750 space-y-2">
              {latestExamScore && (
                <div className="flex items-center justify-between pb-2 border-b border-slate-750 text-xs font-bold">
                  <span className="text-slate-400">ผลการทดสอบวัดผล:</span>
                  <span className="text-emerald-400 font-mono">
                    {latestExamScore.score}/{latestExamScore.total} ข้อ ({latestExamScore.percentage}%) ✓ ผ่านเกณฑ์
                  </span>
                </div>
              )}
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

      {/* 2. Mandatory Post-Test Assessment Modal */}
      {showAssessmentModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative my-auto animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-start justify-between pb-5 border-b border-slate-800">
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-fuchsia-400 uppercase tracking-widest bg-fuchsia-500/10 px-2.5 py-0.5 rounded border border-fuchsia-500/30">
                    ISO 9001:2015 Clause 7.2 Evaluation
                  </span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/30">
                    เกณฑ์ผ่าน ≥ 80%
                  </span>
                </div>
                <h2 className="text-lg sm:text-xl font-black text-white">
                  แบบทดสอบวัดผลประสิทธิผลการฝึกอบรม (Post-Test Assessment)
                </h2>
                <p className="text-xs text-slate-400">
                  หลักสูตร: <span className="text-slate-200 font-semibold">{course.title}</span>
                </p>
              </div>

              <button
                onClick={() => setShowAssessmentModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-full bg-slate-800/80 transition-colors flex-shrink-0"
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
                  <div className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-200 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-bold text-rose-300">
                      <FiAlertTriangle className="w-5 h-5 flex-shrink-0" />
                      <span>ยังไม่ผ่านเกณฑ์การประเมิน (คะแนนที่ได้ {assessmentReview.score} / {assessmentReview.total} ข้อ หรือ {assessmentReview.percentage}%)</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed pl-7">
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
                          className={`p-5 rounded-2xl border ${
                            isCorrect 
                              ? 'bg-emerald-950/20 border-emerald-500/30' 
                              : 'bg-rose-950/20 border-rose-500/40'
                          } space-y-3`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-sm font-bold text-white leading-snug">
                              {idx + 1}. {q.question}
                            </h3>
                            <span className={`px-2.5 py-0.5 rounded text-[11px] font-bold flex-shrink-0 flex items-center gap-1 ${
                              isCorrect 
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}>
                              {isCorrect ? <><FiCheck /> ถูกต้อง</> : <><FiX /> ตอบผิด</>}
                            </span>
                          </div>

                          <div className="space-y-2 pt-1">
                            {q.options.map((opt, optIdx) => {
                              const isUserChoice = userChoice === optIdx;
                              const isRealCorrect = q.correctAnswer === optIdx;

                              let optClass = 'bg-slate-800/50 border-slate-700/60 text-slate-400';
                              if (isRealCorrect) {
                                optClass = 'bg-emerald-500/15 border-emerald-500/50 text-emerald-200 font-semibold';
                              } else if (isUserChoice && !isCorrect) {
                                optClass = 'bg-rose-500/15 border-rose-500/50 text-rose-300 line-through';
                              }

                              return (
                                <div key={optIdx} className={`p-3 rounded-xl border text-xs flex items-center justify-between ${optClass}`}>
                                  <span>{String.fromCharCode(65 + optIdx)}. {opt}</span>
                                  {isRealCorrect && (
                                    <span className="text-[10px] text-emerald-400 font-bold ml-2 flex-shrink-0">
                                      ✓ คำตอบที่ถูกต้อง
                                    </span>
                                  )}
                                  {isUserChoice && !isCorrect && (
                                    <span className="text-[10px] text-rose-400 font-bold ml-2 flex-shrink-0">
                                      ✗ คำตอบที่คุณเลือก
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>

                          {q.explanation && (
                            <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-200 text-xs leading-relaxed flex items-start gap-2">
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
                  <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-750 text-xs text-slate-300 flex items-center justify-between">
                    <span>กรุณาอ่านคำถามและเลือกคำตอบที่ถูกต้องที่สุดในแต่ละข้อ</span>
                    <span className="text-fuchsia-400 font-bold">
                      ตอบแล้ว {Object.keys(userAnswers).length} / {assessmentQuestions.length} ข้อ
                    </span>
                  </div>

                  {assessmentQuestions.map((q, qIdx) => {
                    const selectedOpt = userAnswers[qIdx];

                    return (
                      <div key={q.id || qIdx} className="bg-slate-850 border border-slate-750 rounded-2xl p-5 space-y-3.5">
                        <h3 className="text-sm font-bold text-white leading-snug">
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
                                    ? 'bg-fuchsia-600/20 border-fuchsia-500 text-white font-medium shadow-sm ring-1 ring-fuchsia-500/40'
                                    : 'bg-slate-800/60 hover:bg-slate-800 border-slate-700/70 text-slate-300 hover:text-white'
                                }`}
                              >
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5 border ${
                                  isSelected 
                                    ? 'bg-fuchsia-500 border-fuchsia-400 text-white' 
                                    : 'border-slate-600 text-slate-400'
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
              <div className="p-3 mt-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <FiAlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                <span>{assessmentError}</span>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="pt-5 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
              {assessmentReview?.failed ? (
                <>
                  <button
                    onClick={() => {
                      setShowAssessmentModal(false);
                      setActiveModuleId(course.modules[0].id);
                      window.scrollTo({ top: 0, behavior: 'smooth' });
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2"
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
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
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
                onClick={() => {
                  setActiveModuleId(module.id);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
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
                    สมรรถนะได้รับการประเมินตาม ISO 9001 Clause 7.2 พร้อมรับการตรวจออดิท
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

          {/* Bottom Sentinel for Scroll Gate Detection */}
          <div ref={bottomSentinelRef} className="h-6 w-full pointer-events-none" />

          {/* Reading Timer & Scroll Gate Guidance Indicator */}
          <div className="mt-8">
            {readingSecondsLeft > 0 ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs shadow-sm">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-400 font-mono font-black flex items-center justify-center text-xs animate-pulse flex-shrink-0">
                    {readingSecondsLeft}
                  </span>
                  <span>
                    <strong>มาตรฐานเวลาการเรียนรู้:</strong> กรุณาใช้เวลาศึกษาเนื้อหาอย่างน้อย 10 วินาที (เหลืออีก {readingSecondsLeft} วินาที)
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-500/20 px-2.5 py-1 rounded-lg flex-shrink-0">
                  ⏳ {readingSecondsLeft}s Left
                </span>
              </div>
            ) : !isScrolledToBottom ? (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs shadow-sm">
                <div className="flex items-center gap-2.5">
                  <FiChevronDown className="w-4 h-4 text-amber-400 animate-bounce flex-shrink-0" />
                  <span>
                    <strong>เลื่อนอ่านให้จบ:</strong> ครบเกณฑ์เวลาศึกษาแล้ว กรุณาเลื่อนอ่านเนื้อหาจนถึงด้านล่างสุดเพื่อปลดล็อก
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-400 font-bold bg-amber-500/20 px-2.5 py-1 rounded-lg flex-shrink-0">
                  Scroll Down ↓
                </span>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs shadow-sm">
                <div className="flex items-center gap-2">
                  <FiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                  <span>
                    <strong>ศึกษาครบถ้วนแล้ว:</strong> ผ่านเกณฑ์เวลาและศึกษาเนื้อหาครบถ้วนตามขั้นตอนมาตรฐาน
                  </span>
                </div>
                <span className="text-[11px] font-bold text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded flex-shrink-0">
                  ✓ Unlocked
                </span>
              </div>
            )}
          </div>
          
          {/* Bottom Lesson Navigation & Complete/Assessment Buttons */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6 pt-6 border-t border-slate-800">
            {currentIndex > 0 ? (
              <button 
                onClick={handlePrevLesson}
                className="w-full sm:w-auto px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-medium transition-colors border border-slate-700 flex items-center justify-center gap-2"
              >
                ← Previous Lesson
              </button>
            ) : <div className="hidden sm:block"></div>}
            
            {currentIndex < totalModules - 1 ? (
              (readingSecondsLeft > 0 || !isScrolledToBottom) ? (
                <button 
                  disabled
                  className="w-full sm:w-auto px-6 py-2.5 bg-slate-800/80 text-slate-500 rounded-lg font-bold border border-slate-700/60 cursor-not-allowed flex items-center justify-center gap-2 opacity-60"
                  title={readingSecondsLeft > 0 ? `กรุณาใช้เวลาศึกษาอีก ${readingSecondsLeft} วินาที` : 'กรุณาเลื่อนอ่านเนื้อหาจนจบบทเรียน'}
                >
                  <FiLock className="w-4 h-4" />
                  <span>Next Lesson → {readingSecondsLeft > 0 ? `(รออีก ${readingSecondsLeft}s)` : '(เลื่อนอ่านจนจบ)'}</span>
                </button>
              ) : (
                <button 
                  onClick={handleNextLesson}
                  className="w-full sm:w-auto px-6 py-2.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-lg font-bold transition-all shadow-lg shadow-fuchsia-500/20 flex items-center justify-center gap-2"
                >
                  <span>Next Lesson →</span>
                </button>
              )
            ) : (
              /* Final Lesson: Must pass assessment to complete */
              (readingSecondsLeft > 0 || !isScrolledToBottom) ? (
                <button 
                  disabled
                  className="w-full sm:w-auto px-6 py-3 bg-slate-800/80 text-slate-500 rounded-xl font-bold border border-slate-700/60 cursor-not-allowed flex items-center justify-center gap-2 opacity-60"
                  title={readingSecondsLeft > 0 ? `กรุณาใช้เวลาศึกษาอีก ${readingSecondsLeft} วินาที` : 'กรุณาเลื่อนอ่านเนื้อหาจนจบ'}
                >
                  <FiLock className="w-4 h-4" />
                  <span>เข้าสู่แบบทดสอบ {readingSecondsLeft > 0 ? `(รออีก ${readingSecondsLeft}s)` : '(เลื่อนอ่านจนจบ)'}</span>
                </button>
              ) : isCompleted ? (
                <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => {
                      setAssessmentReview(null);
                      setUserAnswers({});
                      setShowAssessmentModal(true);
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 rounded-xl font-bold transition-all border border-emerald-500/30 flex items-center justify-center gap-2 shadow-sm"
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
    </div>
  );
}

import React, { useState } from 'react';
import { 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiInfo, 
  FiBookOpen, 
  FiAward, 
  FiHelpCircle, 
  FiZoomIn, 
  FiX, 
  FiCheck 
} from 'react-icons/fi';
import { addExp } from '../data/communityStore';
import { DEFAULT_COURSE_IMAGE } from '../data/offlineAssets';

export default function DynamicCourseRenderer({ module, course }) {
  const [zoomedImage, setZoomedImage] = useState(null);
  
  // Interactive Quiz state if module or course has quiz
  const quizzes = module.quiz || course.quiz || [];
  const [userAnswers, setUserAnswers] = useState({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);
  const [quizScore, setQuizScore] = useState(null);

  const handleSelectAnswer = (qIdx, optIdx) => {
    if (submittedQuiz) return;
    setUserAnswers({
      ...userAnswers,
      [qIdx]: optIdx
    });
  };

  const handleSubmitQuiz = () => {
    if (quizzes.length === 0) return;
    let score = 0;
    quizzes.forEach((q, idx) => {
      if (userAnswers[idx] === q.correctAnswer) {
        score++;
      }
    });
    setQuizScore(score);
    setSubmittedQuiz(true);

    if (score === quizzes.length) {
      addExp(30, 'สอบผ่านแบบทดสอบหลักสูตรคะแนนเต็ม');
    } else {
      addExp(10, 'ทำแบบทดสอบหลักสูตร');
    }
  };

  return (
    <div className="dynamic-course-content space-y-8">
      {/* Lightbox Modal */}
      {zoomedImage && (
        <div 
          onClick={() => setZoomedImage(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh]">
            <img 
              src={zoomedImage} 
              alt="Zoomed" 
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-700" 
            />
            <button 
              onClick={() => setZoomedImage(null)}
              className="absolute -top-12 right-0 p-2 text-white/80 hover:text-white bg-slate-800 rounded-full"
            >
              <FiX className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Lesson Header */}
      <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-md">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2.5 py-1 rounded-md border border-fuchsia-500/20">
            {course.category}
          </span>
          <span className="text-xs text-slate-400">
            {course.duration}
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          {module.title}
        </h1>
        {module.summary && (
          <p className="text-sm text-slate-300 leading-relaxed m-0 border-l-4 border-fuchsia-500 pl-4 py-1">
            {module.summary}
          </p>
        )}
      </div>

      {/* Step by Step Operations */}
      {module.steps && module.steps.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FiBookOpen className="text-fuchsia-400" /> ขั้นตอนการปฏิบัติงานมาตรฐาน (Standard Operating Steps)
          </h2>

          <div className="space-y-5">
            {module.steps.map((step, idx) => (
              <div 
                key={idx}
                className="bg-slate-800/90 border border-slate-700/80 rounded-2xl p-5 md:p-6 shadow-sm"
              >
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-fuchsia-600 to-violet-600 text-white font-black text-sm flex items-center justify-center flex-shrink-0 shadow-md">
                    {step.number || idx + 1}
                  </div>
                  <div className="flex-1 space-y-3">
                    <h3 className="text-base font-bold text-white m-0">
                      {step.title}
                    </h3>
                    <p className="text-sm text-slate-300 leading-relaxed m-0">
                      {step.desc}
                    </p>

                    {/* Step Image */}
                    {step.image && (
                      <div 
                        onClick={() => setZoomedImage(step.image)}
                        className="relative rounded-xl overflow-hidden border border-slate-700 max-w-lg mt-3 cursor-zoom-in group"
                      >
                        <img 
                          src={step.image} 
                          alt={step.title} 
                          onError={(e) => { e.currentTarget.src = DEFAULT_COURSE_IMAGE; }}
                          className="w-full h-48 md:h-60 object-cover group-hover:scale-105 transition-transform" 
                        />
                        <div className="absolute bottom-2 right-2 px-2.5 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] text-white flex items-center gap-1">
                          <FiZoomIn className="w-3 h-3" /> แตะเพื่อดูรูปขยาย
                        </div>
                      </div>
                    )}

                    {/* Alert Box */}
                    {step.alertType && step.alertType !== 'none' && step.alertText && (
                      <div className={`p-3.5 rounded-xl text-xs leading-relaxed flex items-start gap-2.5 mt-2 ${
                        step.alertType === 'danger' 
                          ? 'bg-rose-500/10 border border-rose-500/30 text-rose-300' 
                          : step.alertType === 'warning'
                          ? 'bg-amber-500/10 border border-amber-500/30 text-amber-300'
                          : step.alertType === 'success'
                          ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                          : 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-300'
                      }`}>
                        {step.alertType === 'danger' && <FiAlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />}
                        {step.alertType === 'warning' && <FiAlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />}
                        {step.alertType === 'success' && <FiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />}
                        {step.alertType === 'info' && <FiInfo className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />}
                        <span><strong>{
                          step.alertType === 'danger' ? 'ข้อควรระวังความปลอดภัย: ' :
                          step.alertType === 'warning' ? 'จุดควรระวัง: ' :
                          step.alertType === 'success' ? 'เกณฑ์ยอมรับ: ' : 'ข้อแนะนำ: '
                        }</strong>{step.alertText}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quiz Section if available */}
      {quizzes.length > 0 && (
        <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-700">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FiHelpCircle className="text-amber-400" /> แบบทดสอบประเมินความเข้าใจ ({quizzes.length} ข้อ)
              </h2>
              <p className="text-xs text-slate-400 mt-1">ทดสอบความเข้าใจเพื่อรับคะแนน EXP และบันทึกประวัติการอบรม</p>
            </div>
            {submittedQuiz && (
              <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-sm">
                คะแนน: {quizScore} / {quizzes.length}
              </div>
            )}
          </div>

          <div className="space-y-6">
            {quizzes.map((q, qIdx) => {
              const selectedOpt = userAnswers[qIdx];
              return (
                <div key={q.id || qIdx} className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-5 space-y-3">
                  <h3 className="text-sm font-bold text-white">
                    {qIdx + 1}. {q.question}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedOpt === optIdx;
                      const isCorrect = q.correctAnswer === optIdx;
                      let btnStyle = 'bg-slate-800 border-slate-700 hover:bg-slate-750 text-slate-300';

                      if (submittedQuiz) {
                        if (isCorrect) {
                          btnStyle = 'bg-emerald-600/20 border-emerald-500 text-emerald-300 font-bold';
                        } else if (isSelected && !isCorrect) {
                          btnStyle = 'bg-rose-600/20 border-rose-500 text-rose-300';
                        }
                      } else if (isSelected) {
                        btnStyle = 'bg-fuchsia-600/20 border-fuchsia-500 text-fuchsia-300 font-semibold';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectAnswer(qIdx, optIdx)}
                          className={`text-left p-3 rounded-xl border text-xs transition-colors flex items-center justify-between gap-2 ${btnStyle}`}
                        >
                          <span>{opt}</span>
                          {submittedQuiz && isCorrect && <FiCheck className="text-emerald-400 w-4 h-4 flex-shrink-0" />}
                        </button>
                      );
                    })}
                  </div>

                  {submittedQuiz && q.explanation && (
                    <div className="p-3 bg-slate-800 rounded-lg text-xs text-slate-300 border-l-2 border-amber-400">
                      <strong>คำอธิบาย:</strong> {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {!submittedQuiz ? (
            <button
              onClick={handleSubmitQuiz}
              disabled={Object.keys(userAnswers).length < quizzes.length}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all disabled:opacity-40"
            >
              ส่งคำตอบและตรวจผลคะแนน
            </button>
          ) : (
            <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
              <FiCheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
              <span>บันทึกผลการทดสอบเรียบร้อยแล้ว ได้รับคะแนนสะสม EXP เพิ่มเติม!</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

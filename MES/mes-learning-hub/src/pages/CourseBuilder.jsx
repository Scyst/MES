import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { saveCustomCourse, getCurrentUser, calculateRank, addExp, fetchRealUserSession, getCourseById, isUserInstructorOrAdmin } from '../data/communityStore';
import { FiLock } from 'react-icons/fi';
import { compressImage } from '../data/imageCompressor';
import { CATEGORY_OFFLINE_IMAGES, DEFAULT_COURSE_IMAGE } from '../data/offlineAssets';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiTrash2, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiBookOpen, 
  FiCamera, 
  FiImage, 
  FiHelpCircle, 
  FiSave,
  FiLayers,
  FiClock,
  FiUser,
  FiEdit2
} from 'react-icons/fi';

const OFFICIAL_CATEGORIES = [
  'เครื่องจักรและวิศวกรรมการผลิต',
  'โปรแกรมและระบบดิจิทัล',
  'ขั้นตอนการทำงานและระบบมาตรฐาน',
  'การตรวจโรงงานและเอกสารลูกค้า',
  'กรณีศึกษาหน้างานจริง',
  'การบริหารและการเพิ่มผลผลิต'
];

export default function CourseBuilder() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const editCourseId = searchParams.get('courseId') || searchParams.get('edit');
  const isEditMode = Boolean(editCourseId);

  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const userRank = calculateRank(currentUser.exp);

  // Form State
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(OFFICIAL_CATEGORIES[0]);
  const [duration, setDuration] = useState('45 นาที');
  const [targetAudience, setTargetAudience] = useState('พนักงานปฏิบัติการและหัวหน้างาน');
  const [instructor, setInstructor] = useState(`${currentUser.name} (${currentUser.role})`);

  useEffect(() => {
    fetchRealUserSession().then(u => {
      if (u) {
        setCurrentUser(u);
        if (!isEditMode) {
          setInstructor(`${u.name} (${u.role})`);
        }
      }
    });
  }, [isEditMode]);

  // Load existing course data if editing
  useEffect(() => {
    if (editCourseId) {
      const existing = getCourseById(editCourseId);
      if (existing) {
        setTitle(existing.title || '');
        setCategory(existing.category || OFFICIAL_CATEGORIES[0]);
        setDuration(existing.duration || '45 นาที');
        setTargetAudience(existing.targetAudience || 'พนักงานปฏิบัติการและหัวหน้างาน');
        setInstructor(existing.instructor || '');
        setDescription(existing.description || '');
        setCoverImage(existing.image || '');

        if (existing.modules && existing.modules.length > 0) {
          const loadedModules = existing.modules.map((m, idx) => {
            const steps = (m.steps && m.steps.length > 0) 
              ? m.steps.map((s, sIdx) => ({
                  number: s.number || sIdx + 1,
                  title: s.title || '',
                  desc: s.desc || '',
                  image: s.image || '',
                  alertType: s.alertType || 'none',
                  alertText: s.alertText || ''
                }))
              : [
                  {
                    number: 1,
                    title: m.title || `หัวข้อที่ ${idx + 1}`,
                    desc: m.summary || (typeof m.content === 'string' ? `รายละเอียดคู่มือปฏิบัติงาน: ${m.title}` : ''),
                    image: '',
                    alertType: 'none',
                    alertText: ''
                  }
                ];
            return {
              id: m.id || `m${idx + 1}`,
              title: m.title || `บทที่ ${idx + 1}`,
              summary: m.summary || '',
              steps: steps
            };
          });
          setModules(loadedModules);
        }

        if (existing.quiz && existing.quiz.length > 0) {
          setQuizzes(existing.quiz);
          setEnableQuiz(true);
        }
      }
    }
  }, [editCourseId]);
  const [description, setDescription] = useState('');
  const [coverImage, setCoverImage] = useState('');
  
  // Modules / Lessons State
  const [modules, setModules] = useState([
    {
      id: 'm1',
      title: 'บทที่ 1: หลักการและขั้นตอนการปฏิบัติงาน',
      summary: '',
      steps: [
        {
          number: 1,
          title: '',
          desc: '',
          image: '',
          alertType: 'none',
          alertText: ''
        }
      ]
    }
  ]);

  // Quiz Builder State
  const [enableQuiz, setEnableQuiz] = useState(true);
  const [quizzes, setQuizzes] = useState([
    {
      id: 'q1',
      question: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: ''
    }
  ]);

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Cover Image Upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
      setCoverImage(compressed);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดรูปหน้าปก: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  // Module handlers
  const handleAddModule = () => {
    const nextIdx = modules.length + 1;
    setModules([
      ...modules,
      {
        id: `m${nextIdx}`,
        title: `บทที่ ${nextIdx}: หัวข้อใหม่`,
        summary: '',
        steps: [
          {
            number: 1,
            title: '',
            desc: '',
            image: '',
            alertType: 'none',
            alertText: ''
          }
        ]
      }
    ]);
  };

  const handleRemoveModule = (mIdx) => {
    if (modules.length <= 1) return;
    setModules(modules.filter((_, idx) => idx !== mIdx));
  };

  const handleModuleTitleChange = (mIdx, val) => {
    const updated = [...modules];
    updated[mIdx].title = val;
    setModules(updated);
  };

  const handleModuleSummaryChange = (mIdx, val) => {
    const updated = [...modules];
    updated[mIdx].summary = val;
    setModules(updated);
  };

  // Module Checkpoint handlers (W3Schools Style)
  const handleModuleCheckpointChange = (mIdx, field, value) => {
    setModules(prev => {
      const copy = [...prev];
      const target = copy[mIdx];
      const cp = target.checkpoint || {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        hint: '',
        explanation: ''
      };
      copy[mIdx] = {
        ...target,
        checkpoint: {
          ...cp,
          [field]: value
        }
      };
      return copy;
    });
  };

  const handleModuleCheckpointOptionChange = (mIdx, optIdx, value) => {
    setModules(prev => {
      const copy = [...prev];
      const target = copy[mIdx];
      const cp = target.checkpoint || {
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        hint: '',
        explanation: ''
      };
      const opts = Array.isArray(cp.options) ? [...cp.options] : ['', '', '', ''];
      opts[optIdx] = value;
      copy[mIdx] = {
        ...target,
        checkpoint: {
          ...cp,
          options: opts
        }
      };
      return copy;
    });
  };

  // Step handlers within module
  const handleAddStepToModule = (mIdx) => {
    const updated = [...modules];
    const steps = updated[mIdx].steps;
    steps.push({
      number: steps.length + 1,
      title: '',
      desc: '',
      image: '',
      alertType: 'none',
      alertText: ''
    });
    setModules(updated);
  };

  const handleRemoveStepFromModule = (mIdx, sIdx) => {
    const updated = [...modules];
    if (updated[mIdx].steps.length <= 1) return;
    updated[mIdx].steps = updated[mIdx].steps
      .filter((_, idx) => idx !== sIdx)
      .map((s, idx) => ({ ...s, number: idx + 1 }));
    setModules(updated);
  };

  const handleStepFieldChange = (mIdx, sIdx, field, val) => {
    const updated = [...modules];
    updated[mIdx].steps[sIdx][field] = val;
    setModules(updated);
  };

  const handleStepImageUpload = async (mIdx, sIdx, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressed = await compressImage(file, { maxWidth: 1000, quality: 0.75 });
      const updated = [...modules];
      updated[mIdx].steps[sIdx].image = compressed;
      setModules(updated);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการโหลดรูปขั้นตอน: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  // Quiz handlers
  const handleAddQuiz = () => {
    setQuizzes([
      ...quizzes,
      {
        id: `q${quizzes.length + 1}`,
        question: '',
        options: ['', '', '', ''],
        correctAnswer: 0,
        explanation: ''
      }
    ]);
  };

  const handleRemoveQuiz = (qIdx) => {
    if (quizzes.length <= 1) return;
    setQuizzes(quizzes.filter((_, idx) => idx !== qIdx));
  };

  const handleQuizQuestionChange = (qIdx, val) => {
    const updated = [...quizzes];
    updated[qIdx].question = val;
    setQuizzes(updated);
  };

  const handleQuizOptionChange = (qIdx, optIdx, val) => {
    const updated = [...quizzes];
    updated[qIdx].options[optIdx] = val;
    setQuizzes(updated);
  };

  const handleQuizCorrectChange = (qIdx, correctIdx) => {
    const updated = [...quizzes];
    updated[qIdx].correctAnswer = correctIdx;
    setQuizzes(updated);
  };

  const handleQuizExplanationChange = (qIdx, val) => {
    const updated = [...quizzes];
    updated[qIdx].explanation = val;
    setQuizzes(updated);
  };

  // Submit Handler
  const handlePublish = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('กรุณากรอกชื่อหลักสูตร');
      return;
    }
    if (!description.trim()) {
      setErrorMsg('กรุณากรอกคำอธิบายและวัตถุประสงค์ของหลักสูตร');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const courseId = isEditMode ? editCourseId : `c-custom-${Date.now()}`;
      const existingCourse = isEditMode ? getCourseById(editCourseId) : null;

      const newCourse = {
        id: courseId,
        title: title.trim(),
        description: description.trim(),
        instructor: instructor.trim(),
        duration: duration.trim(),
        category: category,
        targetAudience: targetAudience.trim(),
        image: coverImage || existingCourse?.image || CATEGORY_OFFLINE_IMAGES[category] || DEFAULT_COURSE_IMAGE,
        isOfficial: true,
        isCustomBuilt: true,
        isEdited: true,
        updatedAt: new Date().toISOString(),
        author: existingCourse?.author || {
          id: currentUser.id,
          name: currentUser.name,
          role: currentUser.role
        },
        createdAt: existingCourse?.createdAt || new Date().toISOString(),
        modules: modules.map((m, idx) => ({
          id: `m${idx + 1}`,
          title: m.title,
          isDynamic: true,
          summary: m.summary,
          steps: m.steps.filter(s => s.title.trim() || s.desc.trim())
        })),
        quiz: enableQuiz ? quizzes.filter(q => q.question.trim()) : []
      };

      saveCustomCourse(newCourse);

      if (isEditMode) {
        addExp(25, 'บันทึกการปรับปรุงเนื้อหาหลักสูตร');
      } else {
        addExp(100, 'สร้างหลักสูตรมาตรฐานใหม่ของโรงงาน');
      }

      // Navigate to the course!
      navigate(`/course/${courseId}`);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึกหลักสูตร: ' + err.message);
      setIsSubmitting(false);
    }
  };

  const isAuthorized = isUserInstructorOrAdmin(currentUser);

  if (!isAuthorized) {
    return (
      <div className="learning-container max-w-2xl py-12">
        <div className="bg-slate-800/95 border border-amber-500/40 rounded-2xl p-6 sm:p-8 shadow-2xl text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto">
            <FiLock className="w-7 h-7 text-amber-400" />
          </div>
          <h2 className="text-xl font-black text-white">สงวนสิทธิ์เฉพาะวิทยากรและผู้ดูแลระบบ</h2>
          <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
            ระบบสร้างและแก้ไขหลักสูตรมาตรฐานโรงงาน (Course Studio) สงวนไว้สำหรับคณะอาจารย์ วิทยากร หรือ Admin เท่านั้น บัญชีของท่าน ({currentUser?.name || 'ผู้เรียน'}) ไม่มีสิทธิ์ในการแก้ไขหรือเปลี่ยนแปลงเนื้อหาหลักสูตร
          </p>
          <div className="pt-2">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-fuchsia-600/20"
            >
              กลับสู่หน้ารายการหลักสูตร
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="learning-container max-w-5xl">
      {/* Top Header Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <FiArrowLeft /> กลับสู่แคตตาล็อกหลักสูตร
        </button>

        <span className="text-xs font-semibold text-fuchsia-400 bg-fuchsia-500/10 px-3 py-1.5 rounded-full border border-fuchsia-500/20 flex items-center gap-1.5">
          {isEditMode ? (
            <>
              <FiEdit2 className="w-3.5 h-3.5 text-amber-400" />
              <span>โหมดแก้ไขข้อมูลหลักสูตร (Edit Mode)</span>
            </>
          ) : (
            <>
              <FiLayers className="w-3.5 h-3.5" />
              <span>ระบบสร้างหลักสูตรมาตรฐาน (Admin Studio)</span>
            </>
          )}
        </span>
      </div>

      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-2xl mb-12">
        <div className="border-b border-slate-700 pb-5 mb-8">
          <h1 className="text-2xl md:text-3xl font-black text-white mb-2 flex items-center gap-2.5">
            {isEditMode ? (
              <>
                <FiEdit2 className="text-amber-400" />
                <span>แก้ไขหลักสูตร: {title || 'กำลังโหลด...'}</span>
              </>
            ) : (
              <>
                <FiLayers className="text-fuchsia-400" />
                <span>สร้างหลักสูตรมาตรฐานของโรงงาน (Course Builder)</span>
              </>
            )}
          </h1>
          <p className="text-sm text-slate-400">
            {isEditMode 
              ? 'ปรับปรุงเนื้อหาขั้นตอนการทำงาน วิดีโอ/รูปภาพประกอบ และข้อสอบประเมินผลของหลักสูตรนี้'
              : 'ระบบสำหรับหัวหน้างานและวิศวกร ในการกำหนดโครงสร้างหลักสูตร บทเรียน ขั้นตอนการปฏิบัติงาน พร้อมชุดแบบทดสอบประเมินผลพนักงาน'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handlePublish} className="space-y-8">
          {/* SECTION 1: GENERAL INFO */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white border-b border-slate-700/80 pb-2 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-fuchsia-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              <span>ข้อมูลทั่วไปของหลักสูตร (General Information)</span>
            </h2>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                ชื่อหลักสูตร <span className="text-rose-400">*</span>
              </label>
              <input 
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="เช่น คู่มือการใช้งานระบบควบคุมการผลิตอัตโนมัติ และการแก้ปัญหาเบื้องต้น"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  หมวดหมู่งานหลักสูตร
                </label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                >
                  {OFFICIAL_CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ระยะเวลาเรียนโดยประมาณ
                </label>
                <input 
                  type="text"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="เช่น 45 นาที, 2 ชั่วโมง"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  ผู้สอน / แผนกเจ้าของหลักสูตร
                </label>
                <input 
                  type="text"
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                กลุ่มเป้าหมายผู้เข้ารับการอบรม
              </label>
              <input 
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="เช่น ช่างซ่อมบำรุง, พนักงานประจำกะ, เจ้าหน้าที่ควบคุมคุณภาพ"
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                คำอธิบายและวัตถุประสงค์ของหลักสูตร <span className="text-rose-400">*</span>
              </label>
              <textarea 
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="อธิบายสรุปว่าหลักสูตรนี้จัดทำขึ้นเพื่ออะไร พนักงานจะได้เรียนรู้อะไร และนำไปประยุกต์ใช้อย่างไร..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
              />
            </div>

            {/* Cover Image Upload */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                รูปภาพหน้าปกหลักสูตร
              </label>
              {coverImage ? (
                <div className="relative rounded-2xl overflow-hidden border border-slate-700 max-h-56">
                  <img src={coverImage} alt="Cover" className="w-full h-48 object-cover" />
                  <button
                    type="button"
                    onClick={() => setCoverImage('')}
                    className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-rose-600 text-white rounded-xl text-xs transition-colors flex items-center gap-1.5 backdrop-blur-sm"
                  >
                    <FiTrash2 className="w-4 h-4" /> ลบรูปภาพ
                  </button>
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-700 hover:border-fuchsia-500/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/40">
                  <FiCamera className="w-8 h-8 text-slate-400 mb-2" />
                  <span className="text-sm font-medium text-slate-300">คลิกเพื่ออัปโหลดรูปภาพหน้าปกหลักสูตร</span>
                  <span className="text-xs text-slate-500 mt-1">รองรับ JPG, PNG</span>
                  <input type="file" accept="image/*" onChange={handleCoverUpload} className="hidden" />
                </label>
              )}
            </div>
          </div>

          {/* SECTION 2: MODULES & LESSONS BUILDER */}
          <div className="space-y-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-fuchsia-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                <span>บทเรียนและขั้นตอนการปฏิบัติงาน (Modules &amp; Lessons)</span>
              </h2>

              <button
                type="button"
                onClick={handleAddModule}
                className="px-3.5 py-1.5 bg-fuchsia-600 hover:bg-fuchsia-500 text-white rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-sm"
              >
                <FiPlus className="w-4 h-4" /> เพิ่มบทเรียนใหม่
              </button>
            </div>

            <div className="space-y-6">
              {modules.map((m, mIdx) => (
                <div key={m.id} className="bg-slate-900/90 border border-slate-700 rounded-2xl p-5 md:p-6 shadow-md">
                  <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
                    <span className="text-xs font-bold text-fuchsia-400 bg-fuchsia-500/10 px-3 py-1 rounded-full border border-fuchsia-500/20">
                      บทเรียนที่ {mIdx + 1}
                    </span>

                    {modules.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveModule(mIdx)}
                        className="text-slate-400 hover:text-rose-400 p-1 text-xs flex items-center gap-1 transition-colors"
                      >
                        <FiTrash2 className="w-4 h-4" /> ลบบทเรียนนี้
                      </button>
                    )}
                  </div>

                  <div className="space-y-4 mb-4">
                    <input 
                      type="text"
                      value={m.title}
                      onChange={(e) => handleModuleTitleChange(mIdx, e.target.value)}
                      placeholder="ชื่อบทเรียน เช่น 1. การตรวจสอบระบบนิรภัยและสวิตช์ LOTO"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white font-semibold focus:outline-none focus:border-fuchsia-500"
                    />

                    <textarea 
                      rows={2}
                      value={m.summary}
                      onChange={(e) => handleModuleSummaryChange(mIdx, e.target.value)}
                      placeholder="คำอธิบายภาพรวมของบทเรียนนี้..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-300 focus:outline-none focus:border-fuchsia-500"
                    />
                  </div>

                  {/* Steps within Module */}
                  <div className="space-y-3 pt-3 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300">ขั้นตอนการปฏิบัติงานในบทเรียนนี้:</span>
                      <button
                        type="button"
                        onClick={() => handleAddStepToModule(mIdx)}
                        className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                      >
                        <FiPlus /> เพิ่มขั้นตอน
                      </button>
                    </div>

                    <div className="space-y-3">
                      {m.steps.map((step, sIdx) => (
                        <div key={sIdx} className="p-3.5 bg-slate-800/80 rounded-xl border border-slate-700/80 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-400">
                              ขั้นตอน {sIdx + 1}
                            </span>
                            {m.steps.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveStepFromModule(mIdx, sIdx)}
                                className="text-slate-500 hover:text-rose-400"
                              >
                                <FiTrash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>

                          <input 
                            type="text"
                            value={step.title}
                            onChange={(e) => handleStepFieldChange(mIdx, sIdx, 'title', e.target.value)}
                            placeholder="ชื่อขั้นตอนการปฏิบัติ"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                          />

                          <textarea 
                            rows={2}
                            value={step.desc}
                            onChange={(e) => handleStepFieldChange(mIdx, sIdx, 'desc', e.target.value)}
                            placeholder="รายละเอียดการปฏิบัติงาน..."
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-fuchsia-500"
                          />

                          {/* Step Image Upload */}
                          <div className="flex items-center gap-3">
                            {step.image ? (
                              <div className="relative rounded-lg overflow-hidden border border-slate-700 w-24 h-16">
                                <img src={step.image} alt="Step" className="w-full h-full object-cover" />
                                <button
                                  type="button"
                                  onClick={() => handleStepFieldChange(mIdx, sIdx, 'image', '')}
                                  className="absolute top-1 right-1 p-0.5 bg-black/80 hover:bg-rose-600 text-white rounded text-[10px]"
                                >
                                  <FiTrash2 />
                                </button>
                              </div>
                            ) : (
                              <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-750 border border-slate-700 text-[11px] text-slate-300 cursor-pointer">
                                <FiCamera className="text-cyan-400" />
                                <span>แนบรูปประกอบ</span>
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  onChange={(e) => handleStepImageUpload(mIdx, sIdx, e)} 
                                  className="hidden" 
                                />
                              </label>
                            )}

                            {/* Alert selection */}
                            <select
                              value={step.alertType}
                              onChange={(e) => handleStepFieldChange(mIdx, sIdx, 'alertType', e.target.value)}
                              className="bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-[11px] text-slate-300 focus:outline-none"
                            >
                              <option value="none">ไม่มีกล่องเตือน</option>
                              <option value="danger">🚨 Safety Danger</option>
                              <option value="warning">⚠️ Quality Warning</option>
                              <option value="info">💡 Pro Tip</option>
                              <option value="success">✅ Acceptance Criteria</option>
                            </select>

                            {step.alertType !== 'none' && (
                              <input 
                                type="text"
                                value={step.alertText}
                                onChange={(e) => handleStepFieldChange(mIdx, sIdx, 'alertText', e.target.value)}
                                placeholder="ข้อความเตือน..."
                                className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-[11px] text-white focus:outline-none"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Optional W3Schools Checkpoint for this Module */}
                  <div className="mt-4 pt-3.5 border-t border-slate-800/80 bg-purple-950/20 p-4 rounded-xl border border-purple-500/20 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                        <span>🎯 Checkpoint ท้ายบทเรียน (Active Recall / W3Schools Style)</span>
                      </span>
                      <span className="text-[10px] text-slate-400">
                        *หากเว้นว่างไว้ ระบบจะสร้างคำถามวัดความเข้าใจให้อัตโนมัติ
                      </span>
                    </div>

                    <input 
                      type="text"
                      value={m.checkpoint?.question || ''}
                      onChange={(e) => handleModuleCheckpointChange(mIdx, 'question', e.target.value)}
                      placeholder="คำถามวัดความเข้าใจประจำบทเรียน เช่น ข้อใดคือ Die Clearance ที่ถูกต้องสำหรับเหล็ก 1.2 mm?"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {[0, 1, 2, 3].map((optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input 
                            type="radio"
                            name={`correct-cp-${mIdx}`}
                            checked={(m.checkpoint?.correctAnswer ?? 0) === optIdx}
                            onChange={() => handleModuleCheckpointChange(mIdx, 'correctAnswer', optIdx)}
                            className="text-purple-600 focus:ring-purple-500 bg-slate-900 border-slate-700 cursor-pointer"
                            title="เลือกเป็นคำตอบที่ถูกต้อง"
                          />
                          <input 
                            type="text"
                            value={m.checkpoint?.options?.[optIdx] || ''}
                            onChange={(e) => handleModuleCheckpointOptionChange(mIdx, optIdx, e.target.value)}
                            placeholder={`ตัวเลือก ${String.fromCharCode(65 + optIdx)}`}
                            className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input 
                        type="text"
                        value={m.checkpoint?.hint || ''}
                        onChange={(e) => handleModuleCheckpointChange(mIdx, 'hint', e.target.value)}
                        placeholder="💡 คำใบ้ (แสดงเมื่อตอบผิด เช่น ศึกษาดูตารางอัตราส่วนในขั้นตอนที่ 2)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-amber-300 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                      <input 
                        type="text"
                        value={m.checkpoint?.explanation || ''}
                        onChange={(e) => handleModuleCheckpointChange(mIdx, 'explanation', e.target.value)}
                        placeholder="✓ คำอธิบายเฉลย (แสดงเมื่อตอบถูก เช่น ตามมาตรฐานวิศวกรรมสากล...)"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 placeholder-slate-500 focus:outline-none focus:border-purple-500"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: QUIZ BUILDER */}
          <div className="space-y-6 pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 text-xs flex items-center justify-center font-bold">3</span>
                <span>ชุดแบบทดสอบประเมินผลความเข้าใจ (Quiz Assessment)</span>
              </h2>

              <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-300">
                <input 
                  type="checkbox" 
                  checked={enableQuiz} 
                  onChange={(e) => setEnableQuiz(e.target.checked)} 
                  className="rounded bg-slate-900 border-slate-700 text-fuchsia-600 focus:ring-fuchsia-500 w-4 h-4"
                />
                <span>เปิดใช้งานแบบทดสอบท้ายบท</span>
              </label>
            </div>

            {enableQuiz && (
              <div className="space-y-4">
                {quizzes.map((q, qIdx) => (
                  <div key={q.id} className="p-4 bg-slate-900/80 border border-slate-700 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">
                        คำถามข้อที่ {qIdx + 1}
                      </span>
                      {quizzes.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveQuiz(qIdx)}
                          className="text-slate-500 hover:text-rose-400"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <input 
                      type="text"
                      value={q.question}
                      onChange={(e) => handleQuizQuestionChange(qIdx, e.target.value)}
                      placeholder={`คำถามข้อที่ ${qIdx + 1} เช่น ข้อใดคือระยะ Clearance ที่เหมาะสมสำหรับแผ่นเหล็กหนา 1.2 mm`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                    />

                    {/* 4 Choices */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswer === optIdx;
                        return (
                          <div key={optIdx} className="flex items-center gap-2 bg-slate-800/60 p-2 rounded-xl border border-slate-700/60">
                            <input 
                              type="radio" 
                              name={`quiz_correct_${qIdx}`}
                              checked={isCorrect}
                              onChange={() => handleQuizCorrectChange(qIdx, optIdx)}
                              className="text-amber-500 focus:ring-amber-500"
                              title="เลือกเป็นข้อที่ถูกต้อง"
                            />
                            <input 
                              type="text"
                              value={opt}
                              onChange={(e) => handleQuizOptionChange(qIdx, optIdx, e.target.value)}
                              placeholder={`ตัวเลือก ${String.fromCharCode(65 + optIdx)}`}
                              className={`flex-1 bg-slate-900 border rounded-lg px-2.5 py-1 text-xs text-white focus:outline-none ${
                                isCorrect ? 'border-amber-500 ring-1 ring-amber-500/50' : 'border-slate-700'
                              }`}
                            />
                          </div>
                        );
                      })}
                    </div>

                    <input 
                      type="text"
                      value={q.explanation}
                      onChange={(e) => handleQuizExplanationChange(qIdx, e.target.value)}
                      placeholder="คำอธิบายเฉลยเพิ่มเติม (แสดงเมื่อพนักงานตอบถูกหรือผิด)..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-amber-400"
                    />
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddQuiz}
                  className="w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
                >
                  <FiPlus className="w-4 h-4" /> เพิ่มข้อสอบข้อถัดไป
                </button>
              </div>
            )}
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-fuchsia-600/30 inline-flex items-center gap-2 disabled:opacity-50"
            >
              <FiSave className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังบันทึกข้อมูล...' : isEditMode ? 'บันทึกการแก้ไขหลักสูตร' : 'บันทึกและเผยแพร่หลักสูตร (+100 EXP)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

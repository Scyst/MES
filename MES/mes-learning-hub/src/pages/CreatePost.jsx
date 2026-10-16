import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCommunityPost, getCurrentUser, calculateRank, fetchRealUserSession } from '../data/communityStore';
import { compressImage } from '../data/imageCompressor';
import { 
  FiArrowLeft, 
  FiPlus, 
  FiTrash2, 
  FiAlertTriangle, 
  FiCheckCircle, 
  FiInfo, 
  FiSend, 
  FiBookOpen, 
  FiAward, 
  FiImage, 
  FiCamera, 
  FiX 
} from 'react-icons/fi';

const CATEGORIES = [
  'เครื่องจักรและวิศวกรรมการผลิต',
  'โปรแกรมและระบบดิจิทัล',
  'ขั้นตอนการทำงานและระบบมาตรฐาน',
  'การตรวจโรงงานและเอกสารลูกค้า',
  'เทคนิคและการแก้ปัญหาหน้างาน'
];

export default function CreatePost() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(() => getCurrentUser());
  const userRank = calculateRank(currentUser.exp);

  useEffect(() => {
    fetchRealUserSession().then(u => {
      if (u) setCurrentUser(u);
    });
  }, []);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [summary, setSummary] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [steps, setSteps] = useState([
    {
      number: 1,
      title: '',
      desc: '',
      image: '',
      alertType: 'none',
      alertText: ''
    }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Cover Image Upload
  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressImage(file, { maxWidth: 1200, quality: 0.8 });
      setCoverImage(compressedDataUrl);
    } catch (err) {
      setErrorMsg('ไม่สามารถประมวลผลรูปหน้าปกได้: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  // Handle Step Image Upload
  const handleStepImageUpload = async (stepIndex, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressing(true);
      const compressedDataUrl = await compressImage(file, { maxWidth: 1000, quality: 0.75 });
      const updated = [...steps];
      updated[stepIndex].image = compressedDataUrl;
      setSteps(updated);
    } catch (err) {
      setErrorMsg('ไม่สามารถประมวลผลรูปประกอบขั้นตอนได้: ' + err.message);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleRemoveStepImage = (stepIndex) => {
    const updated = [...steps];
    updated[stepIndex].image = '';
    setSteps(updated);
  };

  const handleAddStep = () => {
    setSteps([
      ...steps,
      {
        number: steps.length + 1,
        title: '',
        desc: '',
        image: '',
        alertType: 'none',
        alertText: ''
      }
    ]);
  };

  const handleRemoveStep = (indexToRemove) => {
    if (steps.length <= 1) return;
    const updated = steps
      .filter((_, idx) => idx !== indexToRemove)
      .map((s, idx) => ({ ...s, number: idx + 1 }));
    setSteps(updated);
  };

  const handleStepChange = (index, field, value) => {
    const updated = [...steps];
    updated[index][field] = value;
    setSteps(updated);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('กรุณากรอกชื่อบทเรียน / ทริคหน้างาน');
      return;
    }
    if (!summary.trim()) {
      setErrorMsg('กรุณากรอกคำอธิบายโดยสรุป');
      return;
    }
    const hasValidStep = steps.some(s => s.title.trim() || s.desc.trim());
    if (!hasValidStep) {
      setErrorMsg('กรุณากรอกขั้นตอนการปฏิบัติงานอย่างน้อย 1 ขั้นตอน');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const newPost = createCommunityPost({
        title: title.trim(),
        category,
        summary: summary.trim(),
        coverImage,
        steps: steps.filter(s => s.title.trim() || s.desc.trim())
      });

      navigate(`/community/${newPost.id}`);
    } catch (err) {
      setErrorMsg('เกิดข้อผิดพลาดในการบันทึก: ' + err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="learning-container max-w-4xl">
      {/* Top Bar */}
      <div className="mb-6 flex items-center justify-between">
        <button 
          onClick={() => navigate('/community')}
          className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          <FiArrowLeft /> กลับสู่คลังความรู้ชุมชน
        </button>

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs text-slate-300">
          <FiAward className="text-amber-400" />
          <span>เขียนสำเร็จรับทันที <strong className="text-amber-400 font-mono">+50 EXP</strong></span>
        </div>
      </div>

      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-6 md:p-8 shadow-xl">
        <div className="border-b border-slate-700 pb-5 mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">
            แบ่งปันความรู้ / เขียนคู่มือทริคหน้างาน
          </h1>
          <p className="text-sm text-slate-400">
            เขียนขั้นตอนแบบง่ายๆ แนบรูปภาพจริงหน้างาน เพื่อช่วยให้เพื่อนร่วมงานและพนักงานใหม่ทำงานได้ถูกต้อง ปลอดภัย
          </p>
        </div>

        {errorMsg && (
          <div className="p-4 mb-6 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
            <FiAlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isCompressing && (
          <div className="p-3 mb-6 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
            <FiCamera className="w-4 h-4 animate-spin" />
            <span>กำลังปรับแต่งและย่อขนาดรูปภาพให้อัตโนมัติ เพื่อการโหลดที่รวดเร็ว...</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              ชื่อบทเรียน / หัวข้อทริคหน้างาน <span className="text-rose-400">*</span>
            </label>
            <input 
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="เช่น วิธีแก้ปัญหาแม่พิมพ์ Stamping เกิดรอยเสี้ยน (Burr), วิธีใช้งานระบบสแกน..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
            />
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              รูปภาพหน้าปกบทความ (Cover Photo)
            </label>
            {coverImage ? (
              <div className="relative rounded-2xl overflow-hidden border border-slate-700 max-h-60 group">
                <img 
                  src={coverImage} 
                  alt="Cover Preview" 
                  className="w-full h-48 md:h-60 object-cover"
                />
                <button
                  type="button"
                  onClick={() => setCoverImage('')}
                  className="absolute top-3 right-3 p-2 bg-slate-900/80 hover:bg-rose-600 text-white rounded-xl text-xs transition-colors shadow-lg flex items-center gap-1.5 backdrop-blur-sm"
                >
                  <FiTrash2 className="w-4 h-4" /> ลบรูปภาพ
                </button>
              </div>
            ) : (
              <label className="border-2 border-dashed border-slate-700 hover:border-fuchsia-500/60 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-900/40 hover:bg-slate-900/80">
                <FiCamera className="w-8 h-8 text-slate-400 mb-2" />
                <span className="text-sm font-medium text-slate-300">คลิกเพื่ออัปโหลดรูปภาพหน้าปก หรือภาพรวมหน้างาน</span>
                <span className="text-xs text-slate-500 mt-1">รองรับ JPG, PNG (ระบบจะย่อขนาดให้ประหยัดเนื้อที่อัตโนมัติ)</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleCoverUpload} 
                  className="hidden" 
                />
              </label>
            )}
          </div>

          {/* Category & Author */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                หมวดหมู่งาน <span className="text-rose-400">*</span>
              </label>
              <select 
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            {/* Author Preview */}
            <div>
              <label className="block text-sm font-semibold text-slate-200 mb-2">
                ผู้เขียน (Author)
              </label>
              <div className="flex items-center gap-3 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5">
                <img 
                  src={currentUser.avatar} 
                  alt={currentUser.name} 
                  className="w-7 h-7 rounded-full object-cover border border-slate-600"
                />
                <span className="text-xs text-slate-200 font-medium truncate">{currentUser.name}</span>
                <span className="text-xs text-amber-300 font-bold ml-auto">{userRank.badge} Lv.{userRank.level}</span>
              </div>
            </div>
          </div>

          {/* Summary */}
          <div>
            <label className="block text-sm font-semibold text-slate-200 mb-2">
              คำอธิบายโดยสรุป (Overview) <span className="text-rose-400">*</span>
            </label>
            <textarea 
              rows={2}
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="สรุปสั้นๆ 1-2 ประโยค ว่าบทความนี้แก้ปัญหาอะไร หรือใช้สำหรับขั้นตอนไหน..."
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
            />
          </div>

          {/* Steps Section */}
          <div className="pt-4 border-t border-slate-700">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <FiBookOpen className="text-fuchsia-400" /> ขั้นตอนการปฏิบัติงาน (Step-by-Step พร้อมรูปภาพ)
                </h3>
                <p className="text-xs text-slate-400">อธิบายทีละขั้นตอนและแนบรูปภาพจุดตรวจสอบหรือตำแหน่งที่ต้องระวัง</p>
              </div>

              <button
                type="button"
                onClick={handleAddStep}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 transition-colors"
              >
                <FiPlus className="w-4 h-4" /> เพิ่มขั้นตอน
              </button>
            </div>

            <div className="space-y-5">
              {steps.map((step, idx) => (
                <div key={idx} className="bg-slate-900/80 border border-slate-700/80 rounded-xl p-4 md:p-5 relative">
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-fuchsia-600 text-white font-bold text-xs">
                      ขั้นตอนที่ {idx + 1}
                    </span>

                    {steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveStep(idx)}
                        className="text-slate-400 hover:text-rose-400 p-1 rounded transition-colors"
                        title="ลบขั้นตอนนี้"
                      >
                        <FiTrash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <input 
                      type="text"
                      value={step.title}
                      onChange={(e) => handleStepChange(idx, 'title', e.target.value)}
                      placeholder={`ชื่อขั้นตอนที่ ${idx + 1} (เช่น ตรวจวัดระยะด้วย Feeler Gauge)`}
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
                    />

                    <textarea 
                      rows={2}
                      value={step.desc}
                      onChange={(e) => handleStepChange(idx, 'desc', e.target.value)}
                      placeholder="อธิบายรายละเอียดการปฏิบัติ..."
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-fuchsia-500"
                    />

                    {/* Step Image Upload & Preview */}
                    <div className="pt-2">
                      {step.image ? (
                        <div className="relative rounded-xl overflow-hidden border border-slate-700 max-w-md">
                          <img 
                            src={step.image} 
                            alt={`Step ${idx + 1}`} 
                            className="w-full h-40 object-cover" 
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveStepImage(idx)}
                            className="absolute top-2 right-2 p-1.5 bg-black/70 hover:bg-rose-600 text-white rounded-lg text-xs transition-colors"
                            title="ลบรูปภาพประกอบนี้"
                          >
                            <FiX className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs text-slate-300 cursor-pointer transition-colors">
                          <FiCamera className="text-cyan-400" />
                          <span>แนบรูปภาพหน้างานสำหรับขั้นตอนนี้</span>
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => handleStepImageUpload(idx, e)} 
                            className="hidden" 
                          />
                        </label>
                      )}
                    </div>

                    {/* Safety alert / Tip selection */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                      <div>
                        <select
                          value={step.alertType}
                          onChange={(e) => handleStepChange(idx, 'alertType', e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-300 focus:outline-none"
                        >
                          <option value="none">ไม่มีกล่องแจ้งเตือนพิเศษ</option>
                          <option value="danger">🚨 ข้อควรระวังความปลอดภัยวิกฤต (Safety Alert)</option>
                          <option value="warning">⚠️ จุดควรระวังงานเสีย (Quality Caution)</option>
                          <option value="info">💡 ข้อแนะนำเพิ่มเติม (Pro Tip)</option>
                          <option value="success">✅ เกณฑ์การผ่านงาน (Acceptance Criteria)</option>
                        </select>
                      </div>

                      {step.alertType !== 'none' && (
                        <div className="md:col-span-2">
                          <input 
                            type="text"
                            value={step.alertText}
                            onChange={(e) => handleStepChange(idx, 'alertText', e.target.value)}
                            placeholder="พิมพ์ข้อความแจ้งเตือนหรือทริคที่ต้องระวัง..."
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={handleAddStep}
              className="mt-4 w-full py-2.5 border-2 border-dashed border-slate-700 hover:border-slate-500 rounded-xl text-slate-400 hover:text-white text-xs font-bold transition-colors flex items-center justify-center gap-2"
            >
              <FiPlus className="w-4 h-4" /> เพิ่มขั้นตอนถัดไป
            </button>
          </div>

          {/* Form Actions */}
          <div className="pt-6 border-t border-slate-700 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/community')}
              className="px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-300 rounded-xl text-sm font-semibold transition-colors"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-6 py-2.5 bg-gradient-to-r from-fuchsia-600 to-violet-600 hover:from-fuchsia-500 hover:to-violet-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-fuchsia-600/30 inline-flex items-center gap-2 disabled:opacity-50"
            >
              <FiSend className="w-4 h-4" />
              <span>{isSubmitting ? 'กำลังเผยแพร่...' : 'เผยแพร่บทเรียน (+50 EXP)'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

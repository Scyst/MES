import React, { useState, useEffect } from 'react';
import { dailyLogApi } from '../../../shared/services/dailyLogApi';
import { Users, Coins, SmilePlus, Factory, Sun, Sparkles, Copy, Check, RefreshCw, AlertCircle, Bot, Send, Calendar, FileText, Zap } from 'lucide-react';

const getMoodEmoji = (score) => {
  if (score >= 4.5) return '😄';
  if (score >= 3.5) return '🙂';
  if (score >= 2.5) return '😐';
  if (score >= 1.5) return '☹️';
  if (score > 0) return '😫';
  return '😐';
};

const SUGGESTED_PROMPTS = [
  'สรุปข้อมูลประจำวัน',
  'สรุปข้อมูลของเมื่อวาน',
  'สรุปข้อมูลสัปดาห์ก่อน',
  'สรุปข้อมูลเดือนก่อน',
  'แจกแจงกำลังพลกะเช้าและกะดึกวันนี้',
  'เปรียบเทียบสัปดาห์นี้กับสัปดาห์ที่แล้ว'
];

export default function MorningBriefModal({ isOpen, onClose, initialData }) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState('ALL');
  const [selectedDate, setSelectedDate] = useState(initialData?.raw_date || '');
  const [dontShowToday, setDontShowToday] = useState(false);

  // AI Executive Briefing State
  const [aiBriefing, setAiBriefing] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null);
  const [copied, setCopied] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');
  const [summaryStyle, setSummaryStyle] = useState('concise'); // 'concise' | 'formal'

  const [isRendered, setIsRendered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setData(initialData);
    if (initialData?.raw_date) {
      setSelectedDate(initialData.raw_date);
    }
  }, [initialData]);

  useEffect(() => {
    if (isOpen) {
      setIsRendered(true);
      if (!data) {
        fetchBrief(selectedTeam, selectedDate);
      }
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => {
        setIsRendered(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const fetchBrief = async (team, date) => {
    setLoading(true);
    setAiBriefing(null);
    setAiError(null);
    try {
      const res = await dailyLogApi.getMorningBrief(team, date);
      if (res.success && res.data) {
        setData(res.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAi = async (promptOverride, styleOverride) => {
    if (!data) return;
    const promptToSend = typeof promptOverride === 'string' ? promptOverride : customPrompt;
    const styleToSend = styleOverride || summaryStyle;
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await dailyLogApi.getMorningBriefAi(data, selectedTeam, promptToSend, styleToSend);
      if (res.success && res.data?.briefing) {
        setAiBriefing(res.data);
      } else {
        setAiError(res.message || 'ไม่สามารถวิเคราะห์ข้อมูลด้วย AI ได้');
      }
    } catch (err) {
      console.error(err);
      setAiError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อบริการ AI');
    } finally {
      setAiLoading(false);
    }
  };

  const handleTagClick = (tag) => {
    setCustomPrompt(tag);
    handleGenerateAi(tag, summaryStyle);
  };

  const handleStyleToggle = (newStyle) => {
    setSummaryStyle(newStyle);
    if (aiBriefing || customPrompt) {
      handleGenerateAi(customPrompt, newStyle);
    }
  };

  const handleCopy = () => {
    if (!aiBriefing?.briefing) return;
    navigator.clipboard.writeText(aiBriefing.briefing);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTeamChange = (e) => {
    const team = e.target.value;
    setSelectedTeam(team);
    fetchBrief(team, selectedDate);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchBrief(selectedTeam, date);
  };

  const handleClose = () => {
    if (dontShowToday) {
      const getProductionDate = () => {
        const now = new Date();
        if (now.getHours() < 8) now.setDate(now.getDate() - 1);
        
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };
      localStorage.setItem('morningBriefSeen', getProductionDate());
    }
    onClose();
  };

  if (!isRendered) return null;

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      className={`fixed inset-0 z-50 overflow-y-auto bg-black/60 pt-[76px] sm:pt-[84px] transition-all duration-300 ease-in-out ${isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 backdrop-blur-none pointer-events-none'}`}
    >
      <div 
        onClick={(e) => {
          if (e.target === e.currentTarget) handleClose();
        }}
        className="min-h-full flex items-start sm:items-center justify-center p-2 sm:p-4 pb-8 sm:pb-12"
      >
        <div 
          onClick={(e) => e.stopPropagation()}
          className={`bg-white rounded-2xl sm:rounded-[20px] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ease-out ${isVisible ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 translate-y-4'}`}
        >
          
          {/* Header */}
          <div className="bg-gradient-to-br from-[#0f2027] via-[#203a43] to-[#2c5364] p-3.5 sm:p-5 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              {/* Brand & Title + Mobile Close */}
              <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-400 rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center shadow-lg shrink-0">
                    <Sun className="text-gray-900" size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h4 className="text-lg sm:text-xl font-bold mb-0">Morning Brief</h4>
                      <span className="inline-flex items-center gap-1 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 shadow-xs">
                        <Sparkles size={10} /> AI Ready
                      </span>
                    </div>
                    <div className="text-white/70 text-xs sm:text-sm">สรุปผลงานวันที่ {data?.date_text || selectedDate}</div>
                  </div>
                </div>

                {/* Close Button for mobile */}
                <button
                  onClick={handleClose}
                  className="sm:hidden text-white/70 hover:text-white transition-colors p-1 text-2xl leading-none"
                  title="ปิด"
                >
                  &times;
                </button>
              </div>

              {/* Filters & Desktop Close */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 w-full sm:w-auto pt-2 border-t border-white/10 sm:border-0 sm:pt-0">
                <input 
                  type="date" 
                  value={selectedDate}
                  onChange={handleDateChange}
                  className="bg-white/20 border-0 rounded px-2.5 py-1.5 text-xs sm:text-sm font-bold text-white focus:ring-2 focus:ring-white/50 outline-none cursor-pointer w-full"
                  title="เลือกวันที่ (หรือพิมพ์วันที่ในช่อง AI ด้านล่างได้โดยตรง)"
                />
                <select 
                  value={selectedTeam}
                  onChange={handleTeamChange}
                  className="bg-white/20 border-0 rounded px-2.5 py-1.5 text-xs sm:text-sm font-bold text-white focus:ring-2 focus:ring-white/50 outline-none cursor-pointer w-full"
                >
                  <option value="ALL" className="text-gray-900">All Teams</option>
                  <option value="TEAM 1" className="text-gray-900">TEAM 1</option>
                  <option value="TEAM 2" className="text-gray-900">TEAM 2</option>
                </select>
                <button
                  onClick={handleClose}
                  className="hidden sm:block text-white/70 hover:text-white transition-colors p-1 text-2xl leading-none ml-1 cursor-pointer"
                  title="ปิด"
                >
                  &times;
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-3 sm:p-6 bg-gray-50 flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-current"></div>
              <p className="mt-4 font-semibold animate-pulse">กำลังโหลดข้อมูล...</p>
            </div>
          ) : !data ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <p className="mt-4 font-semibold">ไม่มีข้อมูลสำหรับวันนี้</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">

              {/* 🌟 AI Executive Shift Briefing Card */}
              <div className="bg-gradient-to-br from-indigo-50/90 via-purple-50/70 to-blue-50/80 border border-indigo-200/90 rounded-xl sm:rounded-2xl p-3 sm:p-5 shadow-xs transition-all">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2.5 pb-2.5 sm:pb-3 border-b border-indigo-100">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Bot size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-800 text-xs sm:text-base">AI Executive Briefing</span>
                        <span className="text-[9px] sm:text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 border border-indigo-200">
                          Auto-Query
                        </span>
                      </div>
                      <p className="text-[10px] sm:text-xs text-slate-500">พิมพ์ถามข้อมูลโรงงาน B9 หรือระบุวันที่ได้ทันที</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-1.5 w-full sm:w-auto">
                    {/* Style Selector Toggle */}
                    <div className="flex items-center bg-white/90 p-0.5 rounded-lg border border-indigo-200/90 text-[11px] sm:text-xs shadow-2xs">
                      <button
                        type="button"
                        onClick={() => handleStyleToggle('concise')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          summaryStyle === 'concise' 
                            ? 'bg-indigo-600 text-white shadow-2xs' 
                            : 'text-slate-600 hover:text-indigo-600'
                        }`}
                        title="สรุปสั้น 4-6 บรรทัด ตัวเลขเน้นๆ สำหรับผู้บริหาร"
                      >
                        <Zap size={11} />
                        <span>สรุปสั้น</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleStyleToggle('formal')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-md font-semibold transition-all cursor-pointer ${
                          summaryStyle === 'formal' 
                            ? 'bg-indigo-600 text-white shadow-2xs' 
                            : 'text-slate-600 hover:text-indigo-600'
                        }`}
                        title="รายงานทางการ วิเคราะห์ครบ 3 มิติเชิงวิศวกรรม"
                      >
                        <FileText size={11} />
                        <span>ทางการ</span>
                      </button>
                    </div>

                    {aiBriefing && (
                      <button
                        onClick={handleCopy}
                        className="inline-flex items-center justify-center gap-1 px-2.5 py-1 rounded-lg text-[11px] sm:text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                        title="คัดลอกข้อความสรุป"
                      >
                        {copied ? (
                          <>
                            <Check size={12} className="text-green-600" />
                            <span className="text-green-600">คัดลอกแล้ว</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} className="text-slate-500" />
                            <span>คัดลอก</span>
                          </>
                        )}
                      </button>
                    )}

                    <button
                      onClick={() => handleGenerateAi()}
                      disabled={aiLoading}
                      className="inline-flex items-center justify-center gap-1 px-3 py-1 rounded-lg text-[11px] sm:text-xs font-bold text-white bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-60 shadow-xs transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                      {aiLoading ? (
                        <>
                          <RefreshCw size={12} className="animate-spin" />
                          <span>กำลังดึง...</span>
                        </>
                      ) : aiBriefing ? (
                        <>
                          <RefreshCw size={12} />
                          <span>ถามใหม่</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={12} className="text-amber-300" />
                          <span>วิเคราะห์</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Custom Instruction Box & Quick Tags */}
                <div className="mt-2.5">
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleGenerateAi(); }}
                      placeholder="💡 พิมพ์ถาม เช่น 'ยอดผลิต 1-5 พ.ย.', 'ขอข้อมูลเดือน 11'..."
                      className="w-full bg-white border border-indigo-200 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 rounded-xl pl-3 pr-16 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 outline-none shadow-2xs transition-all"
                    />
                    <div className="absolute right-1 flex items-center gap-1">
                      {customPrompt && (
                        <button
                          onClick={() => setCustomPrompt('')}
                          className="text-slate-400 hover:text-slate-600 text-xs px-1.5 py-0.5 rounded cursor-pointer"
                          title="ล้างข้อความ"
                        >
                          ✕
                        </button>
                      )}
                      <button
                        onClick={() => handleGenerateAi()}
                        disabled={aiLoading}
                        className="p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 cursor-pointer shadow-2xs"
                        title="ส่งคำถาม"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  </div>

                  {/* Suggestion Chips - Horizontal Scrollable on Mobile */}
                  <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1 scrollbar-none select-none -mx-1 px-1">
                    <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 shrink-0">ยอดนิยม:</span>
                    {SUGGESTED_PROMPTS.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleTagClick(tag)}
                        className="text-[10px] sm:text-[11px] px-2.5 py-0.5 sm:py-1 rounded-full bg-white hover:bg-indigo-100 text-indigo-700 border border-indigo-200 shadow-2xs transition-all shrink-0 whitespace-nowrap active:scale-95 cursor-pointer"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AI Body */}
                {aiLoading && (
                  <div className="pt-4 pb-2 text-center">
                    <div className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-700 animate-pulse">
                      <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                      กำลังเชื่อมต่อ SQL Server และประมวลผลข้อมูลกะตามคำสั่ง...
                    </div>
                    <p className="text-xs text-slate-400 mt-1">กำลังคำนวณยอดผลิต ต้นทุน DLOT และค่าพลังงาน</p>
                  </div>
                )}

                {aiError && (
                  <div className="mt-3 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                    <AlertCircle size={16} className="shrink-0" />
                    <span>{aiError}</span>
                  </div>
                )}

                {aiBriefing && !aiLoading && (
                  <div className="mt-3 pt-2">
                    {/* Data Scope Indicator */}
                    {aiBriefing.data_scope?.length > 0 && (
                      <div className="mb-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold shadow-2xs">
                        <Calendar size={13} className="text-emerald-600" />
                        <span>ดึงข้อมูลจาก SQL Server: {aiBriefing.data_scope.join(' | ')}</span>
                      </div>
                    )}
                    {aiBriefing.cached && (
                      <span className="ml-2 mb-2 inline-flex items-center px-2 py-1 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-semibold">
                        ผลลัพธ์ล่าสุดภายใน 1 นาที
                      </span>
                    )}

                    <div className="bg-white/95 border border-indigo-100 rounded-xl p-4 text-xs sm:text-sm text-slate-700 whitespace-pre-wrap leading-relaxed shadow-2xs font-sans">
                      {aiBriefing.briefing}
                    </div>
                    <div className="flex justify-between items-center mt-2 px-1 text-[11px] text-slate-400">
                      <span>ประมวลผลเมื่อ: {aiBriefing.generated_at}</span>
                      <span className="font-mono text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded">
                        Style: {summaryStyle} | Model: {aiBriefing.model}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Grid 12 columns for statistics */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 sm:gap-4">
                
                {/* Manpower */}
                <div className="col-span-1 md:col-span-12">
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs border-l-4 border-l-blue-600">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-2 sm:mb-3 flex items-center gap-2">
                      <Users size={16} /> Manpower Statistics
                    </div>
                    <div className="flex justify-around text-center mt-1 sm:mt-2">
                      <div>
                        <h4 className="text-xl sm:text-2xl font-bold mb-0 text-gray-900">{data.mp_total}</h4>
                        <small className="text-gray-500 font-medium text-xs">ทั้งหมด</small>
                      </div>
                      <div className="text-green-600">
                        <h4 className="text-xl sm:text-2xl font-bold mb-0">{data.mp_present}</h4>
                        <small className="font-medium text-xs">เข้างาน</small>
                      </div>
                      <div className="text-red-500">
                        <h4 className="text-xl sm:text-2xl font-bold mb-0">{data.mp_leave}</h4>
                        <small className="font-medium text-xs">ขาด/ลา</small>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Labor & Utility */}
                <div className="col-span-1 md:col-span-7">
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs h-full flex flex-col">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-2 sm:mb-3 flex items-center gap-2">
                      <Coins size={16} /> Labor & Utility Costs (THB)
                    </div>
                    <div className="flex-1 flex flex-col justify-center">
                      <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 text-xs sm:text-sm">
                        <span className="text-gray-500 font-medium">DLOT (รวมทั้งหมด)</span>
                        <span className="font-bold text-gray-900">{data.dlot_total}</span>
                      </div>
                      <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 text-xs sm:text-sm">
                        <span className="text-gray-500 font-medium">DL (เฉพาะรายวัน)</span>
                        <span className="font-bold text-gray-900">{data.dl_daily}</span>
                      </div>
                      <div className="flex justify-between py-1.5 sm:py-2 border-b border-gray-100 text-xs sm:text-sm">
                        <span className="text-gray-500 font-medium">OT (รวมทั้งหมด)</span>
                        <span className="font-bold text-blue-600">{data.ot_total}</span>
                      </div>
                      <div className="flex justify-between py-1.5 sm:py-2 mt-1 text-xs sm:text-sm">
                        <span className="text-gray-500 font-medium">ค่าไฟ / ค่าแก๊ส</span>
                        <span className="font-bold text-red-500">
                          {data.elec_cost} / {data.gas_cost}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Team Mood */}
                <div className="col-span-1 md:col-span-5">
                  <div className="bg-white p-3.5 sm:p-4 rounded-xl sm:rounded-2xl shadow-xs h-full flex flex-col text-center">
                    <div className="text-gray-500 text-xs font-bold uppercase mb-2 sm:mb-3 w-full text-left flex items-center gap-2">
                      <SmilePlus size={16} /> Team Mood
                    </div>
                    <div className="flex-1 flex flex-col items-center justify-center py-1">
                      <div className="text-5xl sm:text-6xl mb-1 select-none">
                        {getMoodEmoji(parseFloat(data.mood_avg))}
                      </div>
                      <div className="font-bold text-lg sm:text-xl text-gray-900">
                        {parseFloat(data.mood_avg).toFixed(1)} <span className="text-xs sm:text-sm text-gray-400 font-normal">/ 5.0</span>
                      </div>
                      <small className="text-gray-500 mt-0.5 font-medium text-xs">ความสุขเฉลี่ยพนักงาน</small>
                    </div>
                  </div>
                </div>

                {/* Production */}
                <div className="col-span-1 md:col-span-12">
                  <div className="bg-slate-800 text-white p-3.5 sm:p-5 rounded-xl sm:rounded-2xl shadow-xs">
                    <div className="flex justify-between items-center mb-3 pb-2.5 border-b border-slate-700/60 gap-2">
                      <span className="text-xs font-bold uppercase text-white/75 flex items-center gap-1.5">
                        <Factory size={15} /> Production & Revenue
                      </span>
                      <span className="bg-emerald-600 text-white py-1 px-3 rounded-lg font-bold text-sm sm:text-base shadow-xs">
                        ฿ {data.revenue}
                      </span>
                    </div>
                    
                    <div className="space-y-1.5 sm:space-y-2">
                      {data.models && data.models.length > 0 ? data.models.map((m, idx) => {
                        const fg = parseInt(m.fg) || 0;
                        const hold = parseInt(m.hold) || 0;
                        const scrap = parseInt(m.scrap) || 0;
                        const total = fg + hold + scrap;

                        return (
                          <div key={idx} className="flex justify-between items-center py-1.5 border-b border-slate-700/40 last:border-0 gap-1 text-xs sm:text-sm">
                            <span className="font-semibold text-white truncate mr-2">{m.model_name}</span>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <b className="text-emerald-400 text-sm sm:text-base">{fg.toLocaleString()}</b> <span className="text-slate-400 text-xs">ตัว</span>
                              <span className="text-slate-400 text-[11px] ml-1 hidden sm:inline">(Hold {hold}, Scrap {scrap}, Total {total.toLocaleString()})</span>
                            </div>
                          </div>
                        );
                      }) : (
                        <div className="text-slate-400 text-xs sm:text-sm text-center py-3">ไม่มีข้อมูลการผลิต</div>
                      )}
                    </div>
                  </div>
                </div>

              </div>

            </div>
          )}
          
          {/* Dont Show Again */}
          <div className="flex justify-center items-center mt-4 sm:mt-6">
            <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-medium text-gray-500 hover:text-gray-700 user-select-none">
              <input 
                type="checkbox" 
                checked={dontShowToday}
                onChange={(e) => setDontShowToday(e.target.checked)}
                className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-800 rounded focus:ring-slate-800 border-gray-300"
              />
              ไม่ต้องแสดงอีกในวันนี้
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 p-3 pt-0 flex justify-center pb-4 sm:pb-6">
          <button onClick={handleClose} className="px-8 py-2 sm:px-10 sm:py-2.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-full transition-colors shadow-xs text-xs sm:text-sm cursor-pointer">
            ปิดหน้าต่างสรุป
          </button>
        </div>

      </div>
    </div>
    </div>
  );
}

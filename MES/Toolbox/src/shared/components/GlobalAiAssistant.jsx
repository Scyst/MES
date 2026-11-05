import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { aiCopilotApi } from '../services/aiCopilotApi';
import {
  Bot, Sparkles, Send, X, Trash2, Copy, Check, Calendar,
  Zap, FileText, RefreshCw, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, MessageSquare,
  ChevronUp, ArrowRight, AlertTriangle
} from 'lucide-react';

function getQuickActionsForPath(pathname) {
  if (!pathname) pathname = '';
  if (pathname.startsWith('/learning')) {
    return [
      'แนะนำหลักสูตร AI & Machine Vision',
      'สรุปเนื้อหา PLC & Automation',
      'แนวทางการต่อยอดสู่ Industry 4.0',
      'สรุปข้อมูลประจำวัน',
      'สถานะแจ้งซ่อมเครื่องจักร (PE) วันนี้'
    ];
  }
  if (pathname.startsWith('/documents')) {
    return [
      'ค้นหา WI การประกอบ W20',
      'ขอรายการ SOP แผนกขึ้นรูป',
      'สรุปข้อมูลประจำวัน',
      'สรุปข้อมูลของเมื่อวาน',
      'สถานะแจ้งซ่อมเครื่องจักร (PE) วันนี้'
    ];
  }
  if (pathname.startsWith('/planner')) {
    return [
      'สรุปงานที่ค้างในสปรินต์นี้',
      'งานที่มีความเสี่ยงส่งมอบล่าช้า',
      'ติดตามงานค้าง WSM (Overdue)',
      'สรุปข้อมูลประจำวัน',
      'สรุปข้อมูลของเมื่อวาน',
      'แจกแจงกำลังพลกะเช้า-ดึกวันนี้'
    ];
  }
  if (pathname.startsWith('/transport')) {
    return [
      'สรุปรถรับส่งพนักงานสายบ้านฉาง',
      'สรุปข้อมูลประจำวัน',
      'สรุปข้อมูลของเมื่อวาน',
      'แจกแจงกำลังพลกะเช้า-ดึกวันนี้'
    ];
  }
  return [
    'สรุปข้อมูลประจำวัน',
    'สรุปข้อมูลของเมื่อวาน',
    'สรุปกำไรและ EBITDA เดือนนี้',
    'ประเมินเกณฑ์ 135-100-35% และ Run Rate',
    'มูลค่าเงินจมในสต็อกคงคลัง',
    'ติดตามงานค้าง WSM (Overdue)',
    'สรุปข้อร้องเรียนลูกค้า (QMS)',
    'ตรวจสอบการใช้งานระบบและความผิดปกติ',
    'ต้นทุนวัตถุดิบและค่าโสหุ้ยเดือน 10',
    'สถานะแจ้งซ่อมเครื่องจักร (PE) วันนี้',
    'สรุปข้อมูลเดือนก่อน',
    'แจกแจงกำลังพลกะเช้า-ดึกวันนี้',
    'เปรียบเทียบสัปดาห์นี้กับสัปดาห์ที่แล้ว'
  ];
}

function getModuleName(pathname) {
  if (!pathname || pathname === '/') return 'หน้าหลัก (Home Dashboard)';
  if (pathname.startsWith('/documents')) return 'ศูนย์เอกสาร (Document Center)';
  if (pathname.startsWith('/transport')) return 'ระบบจองรถรับส่ง (Transport Hub)';
  if (pathname.startsWith('/planner')) return 'ทีมแพลนเนอร์ (Team Planner)';
  if (pathname.startsWith('/admin')) return 'การจัดการระบบและ Audit Logs';
  if (pathname.startsWith('/settings') || pathname.startsWith('/system-settings')) return 'ตั้งค่าระบบ (System Settings)';
  if (pathname.startsWith('/paint-chem')) return 'ห้องเคมีและสี (PaintChem)';
  if (pathname.startsWith('/profile')) return 'โปรไฟล์ผู้ใช้ (User Profile)';
  if (pathname.startsWith('/store')) return 'คลังสินค้าและตรวจนับสต็อก (Store & Warehouse)';
  if (pathname.startsWith('/learning')) return 'ศูนย์เรียนรู้องค์กร (MES Learning Hub)';
  return 'ระบบ MES Toolbox';
}

export default function GlobalAiAssistant() {
  const { user } = useAuth();
  const location = useLocation();

  // Role restriction: Admin and Creator roles in initial phase
  const userRoleLower = (user?.role || '').toLowerCase();
  const hasAccess = ['admin', 'creator'].includes(userRoleLower);

  // Suppress on auth pages or external partner portal
  if (!hasAccess || location.pathname === '/login' || location.pathname.startsWith('/partner-portal')) {
    return null;
  }

  const [isOpen, setIsOpen] = useState(false);
  const [redFlags, setRedFlags] = useState({ total_red_flags: 0, flags: [] });
  const [isRedFlagsOpen, setIsRedFlagsOpen] = useState(false);
  const [loadingRedFlags, setLoadingRedFlags] = useState(false);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: 'สวัสดีครับ ผมคือ **MES AI Copilot** ผู้ช่วยฝ่ายบริหารและปฏิบัติการอัจฉริยะ (SNC Executive Suite 2027)\n\nเชื่อมต่อกับฐานข้อมูล SQL Server โรงงาน B9 แบบ Real-time ครอบคลุม:\n• ยอดผลิต FG, รายได้ เทียบเป้าหมาย Master Budget 2 ล้าน/วัน\n• กำไรขั้นต้น (GP), EBITDA และวินัยการเงิน 135-100-35%\n• ผลิตภาพแรงงานต่อหัว IpH (Ratio 1:1) และประสิทธิภาพส่งมอบ (Plan Attainment)\n• เจาะลึกเงินจมในสต็อกคงคลัง 845.48M (FG ปลายไลน์ B9 vs WIP)\n• แผนงานและงานค้าง WSM (Team Planner) & ข้อร้องเรียนคุณภาพ (QMS)\n• แจ้งซ่อมเครื่องจักร (PE) และ Audit Logs ตรวจจับความผิดปกติ\n\nสามารถพิมพ์ถามหรือเลือกหัวข้อด่วนด้านล่างได้เลยครับ',
      generated_at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryStyle, setSummaryStyle] = useState('concise'); // 'concise' | 'formal'
  const [copiedId, setCopiedId] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const chipsRef = useRef(null);
  const currentModuleName = getModuleName(location.pathname);
  const quickActions = getQuickActionsForPath(location.pathname);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  // Proactive Red-Flags fetch on mount & whenever drawer opens
  useEffect(() => {
    let isMounted = true;
    if (hasAccess) {
      setLoadingRedFlags(true);
      aiCopilotApi.getRedFlags()
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setRedFlags(res.data);
            if (res.data.total_red_flags > 0) {
              setIsRedFlagsOpen(true);
            }
          }
        })
        .catch((err) => {
          console.warn('[RED_FLAGS_FETCH_FAILED]', err);
        })
        .finally(() => {
          if (isMounted) setLoadingRedFlags(false);
        });
    }
    return () => { isMounted = false; };
  }, [hasAccess, isOpen]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  // Convert mouse wheel vertically to horizontal scroll on chips
  useEffect(() => {
    const el = chipsRef.current;
    if (!el || !isOpen) return;
    const onWheel = (e) => {
      if (e.deltaY !== 0) {
        e.preventDefault();
        el.scrollLeft += e.deltaY * 0.9;
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [isOpen]);

  const scrollChips = (offset) => {
    if (chipsRef.current) {
      chipsRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  const handleMouseDown = (e) => {
    if (!chipsRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - chipsRef.current.offsetLeft);
    setScrollLeftState(chipsRef.current.scrollLeft);
  };

  const handleMouseLeaveOrUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e) => {
    if (!isDragging || !chipsRef.current) return;
    e.preventDefault();
    const x = e.pageX - chipsRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    chipsRef.current.scrollLeft = scrollLeftState - walk;
  };

  if (!hasAccess) return null;

  const handleSend = async (overridePrompt) => {
    const textToSend = typeof overridePrompt === 'string' ? overridePrompt : input;
    if (!textToSend.trim() || loading) return;

    const userMsgId = 'u_' + Date.now();
    const newUserMsg = {
      id: userMsgId,
      role: 'user',
      text: textToSend.trim(),
      generated_at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    };

    // Format past history for multi-turn Gemini API
    const historyPayload = messages
      .filter((m) => m.id !== 'welcome')
      .map((m) => ({
        role: m.role === 'user' ? 'user' : 'model',
        text: m.text
      }));

    setMessages((prev) => [...prev, newUserMsg]);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await aiCopilotApi.ask({
        prompt: textToSend.trim(),
        history: historyPayload,
        pageContext: currentModuleName,
        summaryStyle,
        team: user?.team_group || 'ALL'
      });

      if (res.success && res.data?.briefing) {
        const aiMsgId = 'ai_' + Date.now();
        const newAiMsg = {
          id: aiMsgId,
          role: 'model',
          text: res.data.briefing,
          generated_at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
          data_scope: res.data.data_scope || [],
          cached: res.data.cached || false,
          model: res.data.model || 'Gemini Flash'
        };
        setMessages((prev) => [...prev, newAiMsg]);
      } else {
        setError(res.message || 'ไม่สามารถประมวลผลคำตอบได้ กรุณาลองใหม่อีกครั้ง');
      }
    } catch (err) {
      console.error('[AI_COPILOT_ERROR]', err);
      setError(err.response?.data?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อบริการ AI');
    } finally {
      setLoading(false);
    }
  };

  const handleClearChat = () => {
    setMessages([
      {
        id: 'welcome_' + Date.now(),
        role: 'model',
        text: 'เริ่มต้นบทสนทนาใหม่เรียบร้อยครับ ข้อมูลบริบทเดิมถูกล้างเพื่อประหยัด Token คุณสามารถถามคำถามใหม่ได้ทันทีครับ',
        generated_at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      }
    ]);
    setError(null);
  };

  const handleCopy = (msgId, text) => {
    navigator.clipboard.writeText(text);
    setCopiedId(msgId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* 🌟 Floating Action Button (FAB) - Anchored at Bottom Right universally */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-[90] group flex items-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95 transition-all duration-200 cursor-pointer border border-white/20"
          title="เปิด MES AI Copilot (ผู้ช่วยอัจฉริยะประจำโรงงาน)"
        >
          <div className="relative">
            <Bot size={22} className="animate-pulse" />
            {redFlags.total_red_flags > 0 ? (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
            ) : (
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-700" />
            )}
          </div>
          <span className="text-sm font-bold tracking-wide hidden sm:inline">AI Copilot</span>
          {redFlags.total_red_flags > 0 ? (
            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-rose-500 text-white animate-pulse">
              {redFlags.total_red_flags} Risks
            </span>
          ) : (
            <span className="text-[10px] uppercase font-semibold px-1.5 py-0.5 rounded-md bg-white/20 text-white/90">
              SQL Live
            </span>
          )}
        </button>
      )}

      {/* 🌟 Backdrop with Supreme Z-Index */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-[9998] bg-black/40 backdrop-blur-xs transition-opacity duration-300"
        />
      )}

      {/* 🌟 Slide-Over Drawer Panel with Supreme Z-Index above all Navbars */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[480px] z-[9999] bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-800 transition-transform duration-300 ease-out ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#0f2027] via-[#203a43] to-[#2c5364] text-white flex flex-col gap-2 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-400 to-yellow-500 text-slate-900 flex items-center justify-center shadow-md">
                <Bot size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-base leading-tight">MES AI Copilot</h3>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                    <Sparkles size={10} /> Active
                  </span>
                </div>
                <p className="text-xs text-white/70">ผู้ช่วยวิเคราะห์ข้อมูลโรงงาน B9 Real-time</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleClearChat}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="ล้างบทสนทนา / เริ่มหัวข้อใหม่"
              >
                <Trash2 size={16} />
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="ปิดหน้าต่างแชท"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Module Context & Style Switcher Bar */}
          <div className="flex items-center justify-between pt-1 border-t border-white/10 text-xs">
            <div className="flex items-center gap-1 text-white/80 truncate max-w-[240px]">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              <span className="truncate" title={currentModuleName}>
                {currentModuleName}
              </span>
            </div>

            <div className="flex items-center bg-white/15 p-0.5 rounded-md">
              <button
                type="button"
                onClick={() => setSummaryStyle('concise')}
                className={`px-2 py-0.5 rounded font-semibold text-[11px] transition-all cursor-pointer ${summaryStyle === 'concise'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-white/80 hover:text-white'
                  }`}
              >
                <Zap size={11} className="inline mr-1" />
                สรุปสั้น
              </button>
              <button
                type="button"
                onClick={() => setSummaryStyle('formal')}
                className={`px-2 py-0.5 rounded font-semibold text-[11px] transition-all cursor-pointer ${summaryStyle === 'formal'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-white/80 hover:text-white'
                  }`}
              >
                <FileText size={11} className="inline mr-1" />
                ทางการ
              </button>
            </div>
          </div>
        </div>

        {/* 🚨 Proactive Red-Flags Banner (Executive Risk Alert) */}
        {redFlags.total_red_flags > 0 && (
          <div className="shrink-0 bg-gradient-to-r from-rose-50 via-amber-50 to-rose-50 dark:from-rose-950/40 dark:via-amber-950/30 dark:to-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 transition-all duration-200">
            <div
              onClick={() => setIsRedFlagsOpen(!isRedFlagsOpen)}
              className="px-3.5 py-2.5 flex items-center justify-between cursor-pointer hover:bg-rose-100/50 dark:hover:bg-rose-900/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
                </span>
                <span className="text-xs font-bold text-rose-800 dark:text-rose-200">
                  แจ้งเตือนจุดเฝ้าระวังเช้านี้ (SNC Red-Flags)
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                  {redFlags.total_red_flags}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                <span>{isRedFlagsOpen ? 'ย่อ' : 'ดูรายละเอียด'}</span>
                {isRedFlagsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </div>
            </div>

            {/* Collapsible details */}
            {isRedFlagsOpen && (
              <div className="px-3.5 pb-3 pt-1 space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
                {redFlags.flags.map((flag, idx) => {
                  let badgeColor = 'bg-rose-100 text-rose-700 border-rose-300 dark:bg-rose-900/50 dark:text-rose-300 dark:border-rose-800';
                  if (flag.level === 'WARNING') {
                    badgeColor = 'bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800';
                  } else if (flag.level === 'FINANCIAL') {
                    badgeColor = 'bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-900/50 dark:text-purple-300 dark:border-purple-800';
                  } else if (flag.level === 'NOTICE') {
                    badgeColor = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
                  }

                  return (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-rose-200/60 dark:border-rose-900/40 shadow-2xs flex flex-col gap-1 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${badgeColor}`}>
                            {flag.level}
                          </span>
                          <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {flag.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSend(`ช่วยวิเคราะห์และให้รายละเอียดเกี่ยวกับ: ${flag.title}`)}
                          className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 shrink-0 inline-flex items-center gap-0.5 cursor-pointer underline"
                        >
                          ถาม AI <ArrowRight size={10} />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        {flag.detail}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Chat Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50 dark:bg-slate-950/50">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} animate-in fade-in duration-200`}
              >
                <div
                  className={`max-w-[90%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-xs ${isUser
                      ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-800 rounded-bl-xs'
                    }`}
                >
                  {msg.text}

                  {/* Scope badges & tools indicator */}
                  {!isUser && msg.data_scope?.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                        <Calendar size={11} /> {msg.data_scope.join(' | ')}
                      </span>
                      {msg.cached && (
                        <span className="text-[10px] text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                          แคชล่าสุด 1 นาที
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Message Meta Info & Copy */}
                <div className="flex items-center gap-2 mt-1 px-1 text-[10px] text-slate-400">
                  <span>{msg.generated_at}</span>
                  {!isUser && (
                    <button
                      type="button"
                      onClick={() => handleCopy(msg.id, msg.text)}
                      className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors inline-flex items-center gap-1 cursor-pointer"
                    >
                      {copiedId === msg.id ? (
                        <>
                          <Check size={11} className="text-green-600" />
                          <span className="text-green-600">คัดลอกแล้ว</span>
                        </>
                      ) : (
                        <>
                          <Copy size={11} />
                          <span>คัดลอก</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-2 animate-in fade-in duration-200">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Bot size={15} />
              </div>
              <div className="bg-white dark:bg-slate-900 border border-indigo-100 dark:border-indigo-950 p-3 rounded-2xl rounded-bl-xs shadow-xs text-xs text-indigo-700 dark:text-indigo-300 flex items-center gap-2">
                <RefreshCw size={14} className="animate-spin text-indigo-600" />
                <span>กำลังเรียกเครื่องมือคิวรีฐานข้อมูล SQL Server...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 text-xs flex items-center gap-2">
              <AlertCircle size={15} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Action Chips */}
        <div className="px-2 py-2 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 shrink-0 text-[10px] pl-1">แนะนำ:</span>

            {/* Scroll Left Button */}
            <button
              type="button"
              onClick={() => scrollChips(-180)}
              className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs shrink-0 cursor-pointer transition-transform active:scale-90"
              title="เลื่อนซ้าย"
            >
              <ChevronLeft size={13} />
            </button>

            {/* Scrollable Chips Track */}
            <div
              ref={chipsRef}
              onMouseDown={handleMouseDown}
              onMouseLeave={handleMouseLeaveOrUp}
              onMouseUp={handleMouseLeaveOrUp}
              onMouseMove={handleMouseMove}
              className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 text-[11px] select-none scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 cursor-grab active:cursor-grabbing scroll-smooth"
            >
              {quickActions.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => handleSend(tag)}
                  disabled={loading}
                  className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 border border-slate-200 dark:border-slate-700 transition-all cursor-pointer whitespace-nowrap active:scale-95"
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Scroll Right Button */}
            <button
              type="button"
              onClick={() => scrollChips(180)}
              className="p-1 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 shadow-2xs shrink-0 cursor-pointer transition-transform active:scale-90"
              title="เลื่อนขวา"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
          <div className="relative flex items-center">
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="ถามอะไรก็ได้ เช่น 'ขอข้อมูลเดือน 11', 'เทียบสัปดาห์นี้กับที่แล้ว'..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 rounded-xl pl-3 pr-12 py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none outline-none transition-all max-h-24"
            />
            <button
              type="button"
              onClick={() => handleSend()}
              disabled={loading || !input.trim()}
              className="absolute right-1.5 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
              title="ส่งคำถาม (Enter)"
            >
              <Send size={14} />
            </button>
          </div>
          <div className="flex justify-between items-center mt-1 px-1 text-[10px] text-slate-400">
            <span>กด Enter เพื่อส่งคำถาม (Shift+Enter ขึ้นบรรทัดใหม่)</span>
            <span>Gemini Function Calling + SQL Live</span>
          </div>
        </div>
      </div>
    </>
  );
}


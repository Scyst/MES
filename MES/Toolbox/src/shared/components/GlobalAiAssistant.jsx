import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { aiCopilotApi } from '../services/aiCopilotApi';
import {
  Bot, Sparkles, Send, X, Trash2, Copy, Check, Calendar,
  Zap, FileText, RefreshCw, AlertCircle, ChevronDown, ChevronLeft, ChevronRight, MessageSquare,
  ChevronUp, ArrowRight, AlertTriangle, Camera, Globe, Image as ImageIcon, ArrowDown
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
    'เช็คราคากลางเหล็ก HRC โลก (ท่องเน็ต)',
    'ค้นหาวิธีแก้ Alarm เครื่องจักร (คู่มือ)',
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

  const [isOpen, setIsOpen] = useState(false);
  const [isDocked, setIsDocked] = useState(() => {
    try {
      const saved = localStorage.getItem('mes_ai_docked');
      if (saved !== null) return saved === '1';
    } catch (e) {}
    return typeof window !== 'undefined' && window.innerWidth < 640;
  });

  const toggleDocked = (val, e) => {
    if (e) e.stopPropagation();
    setIsDocked(val);
    try {
      localStorage.setItem('mes_ai_docked', val ? '1' : '0');
    } catch (err) {}
  };

  const [redFlags, setRedFlags] = useState({ total_red_flags: 0, flags: [] });
  const [isRedFlagsOpen, setIsRedFlagsOpen] = useState(false);
  const [loadingRedFlags, setLoadingRedFlags] = useState(false);
  const [attachedImage, setAttachedImage] = useState(null); // { mime, base64, previewUrl, name }

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'model',
      text: 'สวัสดีครับ ผมคือ **MES AI Copilot** ผู้ช่วยฝ่ายบริหารและปฏิบัติการโรงงาน B9 Real-time\n\nเชื่อมต่อข้อมูลยอดผลิต, EBITDA, วินัยการเงิน 135-100-35%, สต็อก, WSM, ท่องเน็ต (🌐) หรือแนบภาพตรวจ Defect (📷) พิมพ์ถามหรือเลือกหัวขอด้านล่างได้เลยครับ',
      generated_at: new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [summaryStyle, setSummaryStyle] = useState('concise'); // 'concise' | 'formal'
  const [copiedId, setCopiedId] = useState(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  const messagesEndRef = useRef(null);
  const chatFeedRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const chipsRef = useRef(null);
  const currentModuleName = getModuleName(location.pathname);
  const quickActions = getQuickActionsForPath(location.pathname);

  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeftState, setScrollLeftState] = useState(0);

  const handleChatScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const isUp = scrollHeight - scrollTop - clientHeight > 120;
    setShowScrollBottom(isUp);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBottom(false);
  };

  const handleImageFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('ขนาดรูปภาพต้องไม่เกิน 8MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target.result;
      const base64Data = (dataUrl || '').split(',')[1] || '';
      setAttachedImage({
        mime: file.type,
        base64: base64Data,
        previewUrl: dataUrl,
        name: file.name
      });
      setError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageFile(file);
  };

  const handlePaste = (e) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.startsWith('image/')) {
        const file = items[i].getAsFile();
        if (file) {
          handleImageFile(file);
          break;
        }
      }
    }
  };

  // Proactive Red-Flags fetch on mount & whenever drawer opens
  useEffect(() => {
    let isMounted = true;
    if (hasAccess) {
      setLoadingRedFlags(true);
      aiCopilotApi.getRedFlags()
        .then((res) => {
          if (isMounted && res.success && res.data) {
            setRedFlags(res.data);
            // Keep collapsed by default so it stays clean and uncluttered on mobile
            setIsRedFlagsOpen(false);
          }
        })
        .catch((err) => {
          const status = err?.response?.status || err?.status;
          if (status !== 401) {
            console.warn('[RED_FLAGS_FETCH_FAILED]', err);
          }
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

  // Suppress on auth pages or external partner portal
  if (!hasAccess || location.pathname === '/login' || location.pathname.startsWith('/partner-portal')) {
    return null;
  }

  const handleSend = async (overridePrompt) => {
    const textToSend = typeof overridePrompt === 'string' ? overridePrompt : input;
    const currentImg = attachedImage;
    if ((!textToSend.trim() && !currentImg) || loading) return;

    const promptText = textToSend.trim() || (currentImg ? 'ช่วยวิเคราะห์และตรวจสอบภาพถ่ายนี้อย่างละเอียด' : '');
    const userMsgId = 'u_' + Date.now();
    const newUserMsg = {
      id: userMsgId,
      role: 'user',
      text: promptText,
      imagePreview: currentImg?.previewUrl || null,
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
    setAttachedImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setLoading(true);
    setError(null);

    try {
      const res = await aiCopilotApi.ask({
        prompt: promptText,
        history: historyPayload,
        pageContext: currentModuleName,
        summaryStyle,
        team: user?.team_group || 'ALL',
        image: currentImg ? { mime_type: currentImg.mime, data: currentImg.base64 } : null
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
      {/* 🌟 Floating Action Button (FAB) - Supports Full Pill & Edge-Docked Mode */}
      {!isOpen && (
        isDocked ? (
          <div className="fixed bottom-24 right-0 z-[85] flex items-center bg-gradient-to-r from-indigo-600 to-purple-700 text-white rounded-l-2xl shadow-lg border-y border-l border-white/25 overflow-hidden transition-all duration-200 hover:shadow-xl">
            <button
              type="button"
              onClick={(e) => toggleDocked(false, e)}
              className="pl-1.5 pr-1 py-3 text-white/75 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              title="กางปุ่ม AI Copilot"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="pl-1 pr-2.5 py-2.5 flex items-center gap-1.5 cursor-pointer hover:bg-white/10 transition-colors"
              title="เปิด MES AI Copilot"
            >
              <div className="relative">
                <Bot size={19} />
                {redFlags.total_red_flags > 0 ? (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
                ) : (
                  <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-1 ring-indigo-700" />
                )}
              </div>
            </button>
          </div>
        ) : (
          <div className="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-[85] flex items-center bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white rounded-full shadow-xl border border-white/20 overflow-hidden transition-all duration-200">
            <button
              type="button"
              onClick={() => setIsOpen(true)}
              className="flex items-center gap-2 pl-4 pr-2.5 py-2.5 sm:py-3 hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
              title="เปิด MES AI Copilot (ผู้ช่วยอัจฉริยะประจำโรงงาน)"
            >
              <div className="relative">
                <Bot size={20} className="animate-pulse" />
                {redFlags.total_red_flags > 0 ? (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-white animate-ping" />
                ) : (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-700" />
                )}
              </div>
              <span className="text-xs sm:text-sm font-bold tracking-wide hidden sm:inline">AI Copilot</span>
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
            <button
              type="button"
              onClick={(e) => toggleDocked(true, e)}
              className="pr-2.5 pl-1.5 py-2.5 sm:py-3 border-l border-white/15 text-white/75 hover:text-white hover:bg-white/15 transition-colors cursor-pointer"
              title="ยุบปุ่ม AI ชิดขอบจอ"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        )
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
              className="px-3 py-1.5 sm:py-2 flex items-center justify-between cursor-pointer hover:bg-rose-100/50 dark:hover:bg-rose-900/30 transition-colors"
            >
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="relative flex h-2 w-2 sm:h-2.5 sm:w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 sm:h-2.5 sm:w-2.5 bg-rose-600"></span>
                </span>
                <span className="text-[11px] sm:text-xs font-bold text-rose-800 dark:text-rose-200">
                  จุดเฝ้าระวังความเสี่ยงเช้านี้
                </span>
                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-600 text-white">
                  {redFlags.total_red_flags}
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-rose-700 dark:text-rose-300">
                <span>{isRedFlagsOpen ? 'ย่อ' : 'ดูรายละเอียด'}</span>
                {isRedFlagsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              </div>
            </div>

            {/* Collapsible details */}
            {isRedFlagsOpen && (
              <div className="px-3 pb-2.5 pt-0.5 space-y-1.5 max-h-36 sm:max-h-48 overflow-y-auto hidden-scrollbar sm:custom-scrollbar overscroll-contain">
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
                      className="p-2 rounded-lg bg-white/95 dark:bg-slate-900/95 border border-rose-200/60 dark:border-rose-900/40 shadow-2xs flex flex-col gap-0.5"
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span className={`text-[8.5px] font-bold px-1 py-0.2 rounded border uppercase shrink-0 ${badgeColor}`}>
                            {flag.level}
                          </span>
                          <span className="text-[11px] sm:text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                            {flag.title}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (flag.category === 'EQUIPMENT') {
                              handleSend(`ช่วยแจกแจงรายละเอียดใบแจ้งซ่อมเครื่องจักรขัดข้องระดับ Critical/High ที่ยังค้างอยู่ทั้งหมด (Active Backlog) พร้อมชื่อเครื่องจักร ไลน์ผลิต และอาการเสีย`);
                            } else if (flag.category === 'WSM_PLANNER') {
                              handleSend(`ช่วยแจกแจงรายการงาน WSM ระดับ Urgent/High ที่เลยกำหนดส่ง (Overdue) ทั้งหมด พร้อมชื่อผู้รับผิดชอบและกำหนดส่ง`);
                            } else if (flag.category === 'WORKING_CAPITAL') {
                              handleSend(`ช่วยวิเคราะห์มูลค่าสินค้าสำเร็จรูป (FG) ค้างสะสมปลายไลน์ประกอบ พร้อมแนวทางบริหาร Working Capital`);
                            } else {
                              handleSend(`ช่วยวิเคราะห์และให้รายละเอียดเกี่ยวกับ: ${flag.title}`);
                            }
                          }}
                          className="text-[9.5px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 shrink-0 inline-flex items-center gap-0.5 cursor-pointer underline"
                        >
                          ถาม AI <ArrowRight size={9} />
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight line-clamp-2">
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
        <div
          ref={chatFeedRef}
          onScroll={handleChatScroll}
          className="flex-1 overflow-y-auto p-3.5 sm:p-4 space-y-3.5 bg-slate-50 dark:bg-slate-950/50 hidden-scrollbar sm:custom-scrollbar overscroll-contain relative"
        >
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
                  {/* Attached user image in chat bubble */}
                  {msg.imagePreview && (
                    <div className="mb-2 overflow-hidden rounded-xl border border-white/20 shadow-xs max-w-xs">
                      <img
                        src={msg.imagePreview}
                        alt="Attached defect/part"
                        className="max-h-48 w-full object-cover rounded-xl hover:scale-102 transition-transform cursor-pointer"
                        onClick={() => window.open(msg.imagePreview, '_blank')}
                        title="คลิกเพื่อเปิดดูภาพขนาดเต็ม"
                      />
                    </div>
                  )}

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

          {/* Floating Scroll-to-Bottom Button */}
          {showScrollBottom && (
            <button
              type="button"
              onClick={scrollToBottom}
              className="sticky bottom-2 float-right mr-1 p-2 rounded-full bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 border border-slate-200 dark:border-slate-700 shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all duration-150 cursor-pointer flex items-center gap-1 text-[11px] font-semibold animate-in fade-in zoom-in-90 z-20"
              title="เลื่อนลงข้อความล่าสุด"
            >
              <ArrowDown size={14} />
              <span className="hidden sm:inline">ล่าสุด</span>
            </button>
          )}
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
              className="flex items-center gap-1.5 overflow-x-auto py-0.5 px-0.5 text-[11px] select-none hidden-scrollbar sm:custom-scrollbar cursor-grab active:cursor-grabbing scroll-smooth"
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
          {/* Attached image preview bar */}
          {attachedImage && (
            <div className="mb-2 flex items-center justify-between p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={attachedImage.previewUrl}
                  alt="Preview"
                  className="w-10 h-10 object-cover rounded-lg border border-indigo-300 dark:border-indigo-700 shrink-0 shadow-2xs"
                />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 truncate">
                    {attachedImage.name || 'ภาพถ่ายแนบ'}
                  </p>
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400">
                    พร้อมส่งให้ AI วิเคราะห์
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setAttachedImage(null);
                  if (fileInputRef.current) fileInputRef.current.value = '';
                }}
                className="p-1 rounded-full text-indigo-500 hover:text-red-500 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="ยกเลิกแนบรูป"
              >
                <X size={15} />
              </button>
            </div>
          )}

          <div className="relative flex items-center gap-1.5">
            {/* Hidden file input for camera/image selection */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleImageSelect}
            />

            {/* Photo / Camera button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={`p-2 rounded-xl border transition-all cursor-pointer shrink-0 ${
                attachedImage
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
              title="แนบรูปภาพหรือภาพถ่ายของเสีย (หรือกด Ctrl+V ในช่องพิมพ์)"
            >
              <Camera size={16} />
            </button>

            <div className="relative flex-1 flex items-center">
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onPaste={handlePaste}
                placeholder={attachedImage ? "พิมพ์คำสั่งภาพนี้..." : "พิมพ์ถาม หรือกด 📷 แนบภาพ..."}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 rounded-xl pl-3 pr-10 py-2 sm:py-2.5 text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 resize-none outline-none transition-all max-h-24"
              />
              <button
                type="button"
                onClick={() => handleSend()}
                disabled={loading || (!input.trim() && !attachedImage)}
                className="absolute right-1.5 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-xs cursor-pointer"
                title="ส่งคำถาม (Enter)"
              >
                <Send size={14} />
              </button>
            </div>
          </div>
          <div className="hidden sm:flex justify-between items-center mt-1 px-1 text-[10px] text-slate-400">
            <span>กด Enter ส่ง (Shift+Enter ขึ้นบรรทัดใหม่ | Ctrl+V วางภาพ)</span>
            <span className="flex items-center gap-1"><Globe size={10} /> Web Search + AI Vision + SQL Live</span>
          </div>
          <div className="flex sm:hidden justify-between items-center mt-1 px-1 text-[9px] text-slate-400">
            <span>แตะส่ง หรือกด 📷 แนบภาพ</span>
            <span className="flex items-center gap-0.5 text-indigo-500 font-semibold"><Globe size={9} /> SQL Live</span>
          </div>
        </div>
      </div>
    </>
  );
}


import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  FiLayers, 
  FiCpu, 
  FiLayout, 
  FiCode, 
  FiActivity, 
  FiCheckSquare, 
  FiShield, 
  FiServer, 
  FiBell, 
  FiArrowRight, 
  FiCheck, 
  FiCopy, 
  FiSmartphone, 
  FiMonitor, 
  FiTerminal,
  FiZap,
  FiAlertTriangle,
  FiFileText,
  FiDatabase,
  FiRefreshCw,
  FiPlay,
  FiSquare,
  FiSend,
  FiEye,
  FiSliders,
  FiClock,
  FiHelpCircle,
  FiClipboard,
  FiList,
  FiAward,
  FiChevronDown,
  FiChevronUp,
  FiUserCheck,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiChevronLeft,
  FiChevronRight,
  FiBookOpen,
  FiEyeOff
} from 'react-icons/fi';
import { ENTERPRISE_APP_SPEAKER_NOTES } from '../enterpriseAppSpeakerNotes';
import {
  ENTERPRISE_SLIDES_102,
  ENTERPRISE_CODE_EXAMPLES_16,
  ENTERPRISE_WORKSHOPS_DATA,
  ENTERPRISE_TEMPLATES_DATA,
  ENTERPRISE_THEORY_EXAM,
  ENTERPRISE_PRACTICAL_EXAM,
  ENTERPRISE_INSTRUCTOR_REVIEW_14
} from '../enterpriseAppFullData';
import EnterpriseTeachingKitHub, { TeachingKitVisualLabs } from '../../components/EnterpriseTeachingKitHub';

// Helper component for Code Block with copy functionality
function CodeBlock({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden my-4 border border-slate-700 bg-slate-950/90 font-mono text-xs md:text-sm shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
        <span className="flex items-center gap-1.5 uppercase font-bold text-[11px] text-fuchsia-400">
          <FiTerminal className="w-3.5 h-3.5" /> {language}
        </span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded"
        >
          {copied ? <><FiCheck className="text-emerald-400 w-3 h-3" /> คัดลอกแล้ว</> : <><FiCopy className="w-3 h-3" /> คัดลอกโค้ด</>}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-slate-200 leading-relaxed m-0">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// =========================================================================
// TRAINER GUIDE & SPEAKER SCRIPT DRAWER (Integrated Turnkey Teacher Mode)
// =========================================================================
function TrainerNotesDrawer({ dayFilter = 'all', defaultOpen = false }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [search, setSearch] = useState('');
  const [selectedSlide, setSelectedSlide] = useState(null);

  const filteredNotes = ENTERPRISE_APP_SPEAKER_NOTES.filter(item => {
    const slideDay = item.n <= 35 ? 1 : item.n <= 71 ? 2 : item.n <= 97 ? 3 : 4;
    const matchDay = dayFilter === 'all' || slideDay === Number(dayFilter);
    const q = search.trim().toLowerCase();
    const matchText = !q || 
      String(item.n) === q || 
      item.title.toLowerCase().includes(q) || 
      (item.say && item.say.toLowerCase().includes(q)) ||
      (item.tip && item.tip.toLowerCase().includes(q));
    return matchDay && matchText;
  });

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-950/20 overflow-hidden shadow-lg transition-all">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-indigo-950/40 hover:bg-indigo-900/40 transition-colors text-left"
      >
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold">
            🎙️
          </span>
          <div>
            <div className="font-bold text-sm text-indigo-200 flex items-center gap-2">
              คู่มือผู้สอน &amp; บทพูดรายสไลด์ (Trainer Guide &amp; Speaker Script)
              <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-mono">
                {dayFilter === 'all' ? '102 สไลด์' : `วันที่ ${dayFilter} (${filteredNotes.length} สไลด์)`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 m-0">
              บทพูดแบบคำต่อคำ (Say), คำถามชวนคิด (Ask), และเทคนิคหน้าห้อง (Tip) สำหรับผู้สอน
            </p>
          </div>
        </div>
        <div className="text-indigo-400 text-sm font-bold flex items-center gap-1">
          {isOpen ? <><FiChevronUp className="w-5 h-5" /> ย่อเก็บ</> : <><FiChevronDown className="w-5 h-5" /> เปิดดูบทพูด</>}
        </div>
      </button>

      {isOpen && (
        <div className="p-4 space-y-4 border-t border-indigo-500/20 bg-slate-950/60">
          <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
            <div className="relative w-full sm:w-72">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหาเลขสไลด์ หรือคำสำคัญ..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
            <span className="text-[11px] text-slate-400">
              พบ {filteredNotes.length} สไลด์
            </span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-3 pr-1 divide-y divide-slate-800/80">
            {filteredNotes.map((note) => (
              <div key={note.n} className="pt-3 first:pt-0 space-y-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-indigo-300 flex items-center gap-1.5 font-mono">
                    <span className="px-1.5 py-0.5 rounded bg-indigo-900/60 text-indigo-200 text-[10px]">
                      สไลด์ {note.n}
                    </span>
                    {note.title}
                  </span>
                  {note.time && (
                    <span className="text-[10px] text-slate-400 font-mono bg-slate-800 px-2 py-0.5 rounded">
                      ⏱️ {note.time}
                    </span>
                  )}
                </div>

                <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="text-slate-200 leading-relaxed">
                    <strong className="text-indigo-400 block text-[11px] mb-0.5">💬 สิ่งที่ผู้สอนต้องพูด (Say):</strong>
                    {note.say}
                  </div>

                  {note.ask && (
                    <div className="p-2 rounded bg-amber-950/30 border border-amber-500/30 text-amber-200/90">
                      <strong className="text-amber-400 block text-[10px] uppercase font-bold">❓ คำถามชวนผู้เรียนคิด (Ask):</strong>
                      {note.ask}
                    </div>
                  )}

                  {note.tip && (
                    <div className="p-2 rounded bg-rose-950/20 border border-rose-500/30 text-rose-200/90">
                      <strong className="text-rose-400 block text-[10px] uppercase font-bold">💡 ข้อควรระวัง / เทคนิคการสอน (Tip):</strong>
                      {note.tip}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// SIMULATOR 1: Industrial HMI Color & Gloved Touch Validator (Module 1 & 2)
// =========================================================================
export function IndustrialHmiValidatorSimulator() {
  const { isDark } = useTheme();
  const [uiMode, setUiMode] = useState('STANDARD'); // 'STANDARD' | 'BAD_RAINBOW'
  const [gloveMode, setGloveMode] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({ success: 0, misclick: 0 });

  const handleButtonClick = (actionName, targetSize) => {
    if (gloveMode && targetSize < 44) {
      // 70% probability of misclick due to fat glove and tiny hitbox
      const isMisclick = Math.random() < 0.75;
      if (isMisclick) {
        setFeedback({
          type: 'error',
          text: `❌ MISCLICK DETECTED! พนักงานสวมถุงมือกดปุ่ม "${actionName}" พลาดไปโดนพื้นที่ข้างเคียง เนื่องจากปุ่มมีขนาดเพียง ${targetSize}px (ต่ำกว่าเกณฑ์มาตรฐาน 44px)`
        });
        setStats(prev => ({ ...prev, misclick: prev.misclick + 1 }));
        return;
      }
    }
    setFeedback({
      type: 'success',
      text: `✅ TOUCH SUCCESS! ตรวจจับการกด "${actionName}" แม่นยำ 100% (Hitbox ${targetSize}px รองรับนิ้วมือสวมถุงมือตาม IEC/ISO)`
    });
    setStats(prev => ({ ...prev, success: prev.success + 1 }));
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiSmartphone className="w-5 h-5 text-pink-500" />
            ห้องแล็บทดสอบ Industrial UX/UI (มาตรฐานสี IEC 60204-1 &amp; ISA-101.01)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            เปรียบเทียบหน้าจอควบคุมอุตสาหกรรมที่ถูกและผิดหลักวิศวกรรม พร้อมจำลองการกดด้วยถุงมือหนาหน้างาน
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setUiMode('STANDARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              uiMode === 'STANDARD'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ✅ มาตรฐาน IEC 60204-1 (Good UI)
          </button>
          <button
            onClick={() => setUiMode('BAD_RAINBOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              uiMode === 'BAD_RAINBOW'
                ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/20'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ❌ สีรุ้งแสบตา / ปุ่มเล็ก (Bad UI)
          </button>
          <button
            onClick={() => setGloveMode(!gloveMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
              gloveMode
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            🧤 สวมถุงมือหนา: {gloveMode ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Simulator Display Screen */}
      <div className={`p-5 rounded-2xl border transition-all ${
        uiMode === 'STANDARD' 
          ? 'bg-slate-950 border-slate-700 text-slate-100' 
          : 'bg-gradient-to-r from-purple-800 via-pink-700 to-yellow-600 border-yellow-400 text-yellow-100 animate-pulse'
      }`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
          <div className="flex items-center gap-2">
            <span className={`w-3 h-3 rounded-full ${uiMode === 'STANDARD' ? 'bg-emerald-500' : 'bg-cyan-400'}`}></span>
            <span className="font-mono text-xs font-bold">
              {uiMode === 'STANDARD' ? 'MACHINE-01 : LINE A (NORMAL)' : '★ ★ SUPER MACHINE DASHBOARD ★ ★'}
            </span>
          </div>
          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-black/40">
            {uiMode === 'STANDARD' ? 'ISO 9241-11 / ISA-101' : 'NON-COMPLIANT'}
          </span>
        </div>

        {/* Content & KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
          <div className={`p-3 rounded-xl border ${
            uiMode === 'STANDARD' 
              ? 'bg-slate-900 border-slate-800 text-slate-200' 
              : 'bg-green-600 border-white text-white font-serif'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Motor Voltage</span>
            <div className="text-2xl font-black font-mono">231.4 V</div>
            <span className="text-[10px] text-emerald-400 font-bold">● Nominal Range</span>
          </div>

          <div className={`p-3 rounded-xl border ${
            uiMode === 'STANDARD' 
              ? 'bg-slate-900 border-slate-800 text-slate-200' 
              : 'bg-blue-600 border-yellow-300 text-yellow-200 font-serif'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Motor Current</span>
            <div className="text-2xl font-black font-mono">15.6 A</div>
            <span className="text-[10px] text-emerald-400 font-bold">● Normal Load</span>
          </div>

          <div className={`p-3 rounded-xl border ${
            uiMode === 'STANDARD' 
              ? 'bg-slate-900 border-slate-800 text-slate-200' 
              : 'bg-red-600 border-white text-white font-serif'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Machine State</span>
            <div className="text-2xl font-black font-mono">RUNNING</div>
            <span className="text-[10px] text-emerald-400 font-bold">● Active 4.2h</span>
          </div>
        </div>

        {/* Interactive Buttons Bar */}
        <div className="space-y-2">
          <div className="text-[11px] font-bold text-slate-400 flex items-center justify-between">
            <span>กดทดสอบควบคุมเครื่องจักร (Touch Hitbox Test):</span>
            <span className="text-amber-400">
              {uiMode === 'STANDARD' ? 'Hitbox: 52×52px (Safe Target)' : 'Hitbox: 24×24px (Dangerous Cluster)'}
            </span>
          </div>

          <div className={`flex flex-wrap items-center gap-3 ${uiMode === 'STANDARD' ? '' : 'justify-center gap-1'}`}>
            {uiMode === 'STANDARD' ? (
              <>
                <button
                  onClick={() => handleButtonClick('START CYCLE', 52)}
                  className="min-h-[52px] min-w-[120px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <FiPlay className="w-5 h-5" /> START
                </button>
                <button
                  onClick={() => handleButtonClick('NORMAL STOP', 52)}
                  className="min-h-[52px] min-w-[120px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <FiSquare className="w-5 h-5" /> STOP
                </button>
                <button
                  onClick={() => handleButtonClick('ACKNOWLEDGE ALARM', 52)}
                  className="min-h-[52px] min-w-[140px] px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  <FiBell className="w-5 h-5" /> ACK ALARM
                </button>
                <button
                  onClick={() => handleButtonClick('EMERGENCY STOP (E-STOP)', 56)}
                  className="min-h-[56px] min-w-[150px] px-6 py-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-sm border-2 border-yellow-400 shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                  🚨 E-STOP
                </button>
              </>
            ) : (
              // Bad UI: Tiny buttons clustered closely
              <>
                <button
                  onClick={() => handleButtonClick('START', 24)}
                  className="h-6 px-2 text-[10px] bg-green-500 text-black border border-black rounded"
                >
                  Start
                </button>
                <button
                  onClick={() => handleButtonClick('STOP', 24)}
                  className="h-6 px-2 text-[10px] bg-red-500 text-white border border-black rounded"
                >
                  Stop
                </button>
                <button
                  onClick={() => handleButtonClick('RESET', 24)}
                  className="h-6 px-2 text-[10px] bg-yellow-500 text-black border border-black rounded"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleButtonClick('PURGE', 24)}
                  className="h-6 px-2 text-[10px] bg-blue-500 text-white border border-black rounded"
                >
                  Purge
                </button>
                <button
                  onClick={() => handleButtonClick('E-STOP', 24)}
                  className="h-6 px-2 text-[10px] bg-fuchsia-600 text-white border border-black rounded font-bold"
                >
                  E-Stop
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div className={`p-3.5 rounded-xl border text-xs leading-relaxed flex items-center gap-2.5 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          {feedback.type === 'success' ? <FiCheckCircle className="w-5 h-5 shrink-0 text-emerald-400" /> : <FiAlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Engineering Rule Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <strong className="text-emerald-400 font-bold block">1. มาตรฐานสีสากล (IEC 60204-1 &amp; IEC 60073):</strong>
          <p className="text-slate-400 m-0">
            • <strong>แดง:</strong> วิกฤต / ฉุกเฉิน / อันตราย (Emergency Stop, Trip)<br />
            • <strong>เหลือง:</strong> สภาพผิดปกติ / เตรียมพร้อม / เฝ้าระวัง (Warning &gt; 240V)<br />
            • <strong>เขียว:</strong> ปลอดภัย / ทำงานปกติ (Running, Normal Operation)<br />
            • <strong>เทา:</strong> ออฟไลน์ / ไม่ได้เปิดใช้งาน (Disconnected)
          </p>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
          <strong className="text-pink-400 font-bold block">2. กฎขนาดปุ่มสัมผัส (Minimum Touch Target):</strong>
          <p className="text-slate-400 m-0">
            ตามมาตรฐาน <strong>WCAG 2.2</strong> และข้อกำหนดการใช้หน้าจอในโรงงานอุตสาหกรรม 
            พื้นที่ปุ่มต้องไม่ต่ำกว่า <strong>44 × 44 พิกเซล</strong> เสมอ เพื่อลดความผิดพลาดในการแตะ (Touch Inaccuracy) 
            เมื่อพนักงานสวมถุงมือผ้าหรือถุงมือยางหน้าสายการผลิต
          </p>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SIMULATOR 2: Industrial Flexbox Layout Playground (Workshop 1 Engine)
// =========================================================================
export function IndustrialFlexboxSimulator() {
  const { isDark } = useTheme();
  const [viewport, setViewport] = useState('DESKTOP'); // 'MOBILE' (375px) | 'TABLET' (768px) | 'DESKTOP' (100%)
  const [flexWrap, setFlexWrap] = useState('wrap'); // 'wrap' | 'nowrap'
  const [flexDirection, setFlexDirection] = useState('row'); // 'row' | 'column'
  const [gap, setGap] = useState(16); // px
  const [cardMinWidth, setCardMinWidth] = useState(240); // px

  const viewportWidthClass = {
    MOBILE: 'max-w-[375px]',
    TABLET: 'max-w-[768px]',
    DESKTOP: 'w-full'
  }[viewport];

  const generatedCss = `.meter-container {
  display: flex;
  flex-direction: ${flexDirection};
  flex-wrap: ${flexWrap};
  gap: ${gap}px;
}

.meter-card {
  flex: 1 1 ${cardMinWidth}px;
}`;

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiLayout className="w-5 h-5 text-indigo-500" />
            ห้องแล็บจำลองการจัด Flexbox หน้าระบบวัดไฟฟ้า (Workshop 1 Sandbox)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ทดลองปรับคุณสมบัติ Flexbox, ระยะห่าง, และสลับขนาดหน้าจอ (Mobile, Tablet, Terminal) เพื่อดูการตัดบรรทัดของการ์ดจริง
          </p>
        </div>

        {/* Viewport Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewport('MOBILE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              viewport === 'MOBILE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FiSmartphone className="w-3.5 h-3.5" /> มือถือ (375px)
          </button>
          <button
            onClick={() => setViewport('TABLET')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              viewport === 'TABLET' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FiMonitor className="w-3.5 h-3.5" /> แท็บเล็ต (768px)
          </button>
          <button
            onClick={() => setViewport('DESKTOP')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 ${
              viewport === 'DESKTOP' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🖥️ จอโรงงาน (เต็มจอ)
          </button>
        </div>
      </div>

      {/* Control Sliders & Toggles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold text-slate-300">
            <span>ระยะห่าง (gap):</span>
            <span className="font-mono text-indigo-400">{gap}px</span>
          </div>
          <input
            type="range"
            min="8"
            max="32"
            step="4"
            value={gap}
            onChange={e => setGap(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-between font-bold text-slate-300">
            <span>ขนาดการ์ดต่ำสุด:</span>
            <span className="font-mono text-indigo-400">{cardMinWidth}px</span>
          </div>
          <input
            type="range"
            min="160"
            max="320"
            step="10"
            value={cardMinWidth}
            onChange={e => setCardMinWidth(Number(e.target.value))}
            className="w-full accent-indigo-500 cursor-pointer"
          />
        </div>

        <div className="space-y-1.5">
          <span className="font-bold text-slate-300 block">การตัดบรรทัด (flex-wrap):</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFlexWrap('wrap')}
              className={`flex-1 py-1 rounded font-mono font-bold text-xs ${
                flexWrap === 'wrap' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              wrap
            </button>
            <button
              onClick={() => setFlexWrap('nowrap')}
              className={`flex-1 py-1 rounded font-mono font-bold text-xs ${
                flexWrap === 'nowrap' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              nowrap
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="font-bold text-slate-300 block">ทิศทาง (flex-direction):</span>
          <div className="flex gap-2">
            <button
              onClick={() => setFlexDirection('row')}
              className={`flex-1 py-1 rounded font-mono font-bold text-xs ${
                flexDirection === 'row' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              row
            </button>
            <button
              onClick={() => setFlexDirection('column')}
              className={`flex-1 py-1 rounded font-mono font-bold text-xs ${
                flexDirection === 'column' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              column
            </button>
          </div>
        </div>
      </div>

      {/* Live Viewport Area */}
      <div className="border border-slate-700 bg-slate-950/80 rounded-2xl p-4 overflow-x-auto flex justify-center">
        <div className={`transition-all duration-300 mx-auto ${viewportWidthClass}`}>
          <div className="text-[11px] font-mono text-slate-400 mb-2 flex justify-between items-center px-1">
            <span>Viewport: {viewport}</span>
            {flexWrap === 'nowrap' && viewport === 'MOBILE' && (
              <span className="text-rose-400 font-bold flex items-center gap-1">
                <FiAlertTriangle className="w-3.5 h-3.5" /> การ์ดล้นจอ (Overflow) เพราะ nowrap!
              </span>
            )}
          </div>

          {/* Meter Container Under Test */}
          <div 
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 transition-all"
            style={{
              display: 'flex',
              flexDirection: flexDirection,
              flexWrap: flexWrap,
              gap: `${gap}px`
            }}
          >
            {/* Card 1: Voltage */}
            <div 
              className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/30 text-slate-200 transition-all"
              style={{ flex: `1 1 ${cardMinWidth}px` }}
            >
              <div className="flex justify-between items-center text-xs text-indigo-300 font-bold mb-1">
                <span>⚡ แรงดันไฟฟ้า (Voltage)</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">ปกติ</span>
              </div>
              <div className="text-3xl font-black font-mono text-white">231.4 <span className="text-sm font-normal text-slate-400">V</span></div>
              <p className="text-[11px] text-slate-400 mt-2 m-0">แรงดันไฟฟ้ากระแสสลับ 1 เฟส 220V ±10%</p>
            </div>

            {/* Card 2: Current */}
            <div 
              className="p-4 rounded-xl border border-teal-500/40 bg-teal-950/30 text-slate-200 transition-all"
              style={{ flex: `1 1 ${cardMinWidth}px` }}
            >
              <div className="flex justify-between items-center text-xs text-teal-300 font-bold mb-1">
                <span>🔌 กระแสไฟฟ้า (Current)</span>
                <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px]">ปกติ</span>
              </div>
              <div className="text-3xl font-black font-mono text-white">15.6 <span className="text-sm font-normal text-slate-400">A</span></div>
              <p className="text-[11px] text-slate-400 mt-2 m-0">กระแสโหลดขณะมอเตอร์กำลังหมุนชิ้นงาน</p>
            </div>
          </div>
        </div>
      </div>

      {/* Generated CSS Code Display */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-slate-400">CSS ที่ได้สำหรับ Workshop 1 (คัดลอกไปใช้ใน `style.css`):</span>
        <CodeBlock code={generatedCss} language="css" />
      </div>
    </div>
  );
}

// =========================================================================
// SIMULATOR 3: Control Cabinet DOM & State Machine (Workshop 2 Engine)
// =========================================================================
export function ControlCabinetDomSimulator() {
  const { isDark } = useTheme();
  const [machineState, setMachineState] = useState('STOPPED'); // 'RUNNING' | 'STOPPED'
  const [voltage, setVoltage] = useState(230);
  const [executedCommand, setExecutedCommand] = useState('');

  const isOverVoltage = voltage > 240;

  const handleStart = () => {
    setMachineState('RUNNING');
    setExecutedCommand(`// ผู้ใช้คลิกปุ่ม #btn-start
const statusEl = document.querySelector('#status');
statusEl.textContent = 'RUNNING';
statusEl.className = 'status-running';`);
  };

  const handleStop = () => {
    setMachineState('STOPPED');
    setExecutedCommand(`// ผู้ใช้คลิกปุ่ม #btn-stop
const statusEl = document.querySelector('#status');
statusEl.textContent = 'STOPPED';
statusEl.className = 'status-stopped';`);
  };

  const handleVoltageChange = (newVal) => {
    setVoltage(newVal);
    if (newVal > 240) {
      setExecutedCommand(`// ตรวจสอบค่าใน Event Listener: ค่าแรงดัน ${newVal}V > 240V
const warnEl = document.querySelector('#warning-box');
warnEl.textContent = '⚠️ ALARM: แรงดันเกินพิกัด (> 240V)';
warnEl.classList.remove('hidden');`);
    } else {
      setExecutedCommand(`// แรงดันอยู่ในเกณฑ์ปกติ ${newVal}V
document.querySelector('#warning-box').classList.add('hidden');`);
    }
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiActivity className="w-5 h-5 text-emerald-500" />
            ตู้คอนโทรลจำลอง &amp; การควบคุม DOM (Workshop 2 Sandbox)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ทดสอบปุ่ม Start / Stop และสไลเดอร์ปรับแรงดัน เพื่อดูการเปลี่ยนสถานะ DOM และคำสั่ง JavaScript ที่ทำงานเบื้องหลัง
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400">สถานะปัจจุบัน:</span>
          <span className={`px-2.5 py-1 rounded-full text-xs font-black font-mono tracking-wide ${
            machineState === 'RUNNING' 
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse' 
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}>
            {machineState}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Interactive Control Panel */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-5">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FiSliders className="w-4 h-4 text-emerald-400" /> แผงควบคุมหน้าตู้ (Operator Station)
          </h4>

          {/* Start / Stop Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleStart}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                machineState === 'RUNNING'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FiPlay className="w-4 h-4" /> กดปุ่ม START
            </button>
            <button
              onClick={handleStop}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                machineState === 'STOPPED'
                  ? 'bg-rose-600 text-white shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FiSquare className="w-4 h-4" /> กดปุ่ม STOP
            </button>
          </div>

          {/* Voltage Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-300">ปรับค่าแรงดันไฟฟ้าหน้างาน:</span>
              <span className={`font-mono font-black text-sm ${isOverVoltage ? 'text-amber-400 animate-bounce' : 'text-emerald-400'}`}>
                {voltage} V {isOverVoltage && '(เกิน 240V!)'}
              </span>
            </div>
            <input
              type="range"
              min="190"
              max="260"
              step="1"
              value={voltage}
              onChange={e => handleVoltageChange(Number(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono">
              <span>190V (Undervoltage)</span>
              <span>220V (Nominal)</span>
              <span>240V (Threshold)</span>
              <span>260V (Critical)</span>
            </div>
          </div>

          {/* Overvoltage Alert Banner */}
          {isOverVoltage && (
            <div className="p-3.5 rounded-xl border border-amber-500/50 bg-amber-950/40 text-amber-200 text-xs flex items-center gap-3 animate-pulse">
              <FiAlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <strong>⚠️ OVERVOLTAGE WARNING DETECTED!</strong>
                <p className="text-[11px] text-amber-300/80 m-0">แรงดันไฟฟ้า {voltage}V เกินพิกัดปลอดภัย 240V กรุณาตรวจสอบหม้อแปลงไฟฟ้า</p>
              </div>
            </div>
          )}
        </div>

        {/* Right: Live DOM & Code Inspector */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FiCode className="w-4 h-4 text-sky-400" /> คำสั่ง DOM &amp; JavaScript ที่ทำงานเบื้องหลัง
          </h4>

          <div className="space-y-2 text-xs">
            <span className="text-slate-400">คำสั่งล่าสุดที่เบราว์เซอร์ประมวลผล:</span>
            <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-sky-300 whitespace-pre-wrap leading-relaxed">
              {executedCommand || '// รอการกดปุ่มหรือปรับค่าสไลเดอร์...'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2 text-xs">
            <strong className="text-emerald-400 block font-bold">เทคนิคสำคัญสำหรับ Workshop 2:</strong>
            <ul className="text-slate-400 text-[11px] space-y-1 list-disc list-inside m-0">
              <li>ใช้ <code>textContent</code> แทน <code>innerHTML</code> เมื่อแค่เปลี่ยนข้อความ เพื่อป้องกันช่องโหว่ XSS</li>
              <li>การรับค่าจาก <code>&lt;input&gt;</code> จะได้ชนิดข้อมูลเป็น <code>String</code> เสมอ ต้องแปลงด้วย <code>Number()</code> ก่อนนำไปเปรียบเทียบ <code>&gt; 240</code></li>
              <li>ใช้ <code>addEventListener('click', ...)</code> แยกตรรกะออกจาก HTML</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SIMULATOR 4: Live REST API & JSON Tree Explorer (Workshop 3 Engine)
// =========================================================================
export function RestApiJsonTreeSimulator() {
  const { isDark } = useTheme();
  const [isPolling, setIsPolling] = useState(false);
  const [networkCondition, setNetworkCondition] = useState('200_OK'); // '200_OK' | '404_NOT_FOUND' | '500_SERVER_ERROR'
  const [apiData, setApiData] = useState({
    line: "A",
    electric: { voltage: 231.4, current: 15.6 },
    water: { flow: 3.2 },
    updatedAt: new Date().toLocaleTimeString('th-TH')
  });
  const [selectedKey, setSelectedKey] = useState(null);
  const [errorLog, setErrorLog] = useState(null);

  const fetchMeterData = () => {
    if (networkCondition === '404_NOT_FOUND') {
      setErrorLog('HTTP Error 404: Endpoint /api/meter not found on server.');
      return;
    }
    if (networkCondition === '500_SERVER_ERROR') {
      setErrorLog('HTTP Error 500: Internal Server Error (Database Connection Timeout)');
      return;
    }

    setErrorLog(null);
    // Simulate real sensor fluctuations
    const randomVolt = (228 + Math.random() * 8).toFixed(1);
    const randomCurr = (14 + Math.random() * 3).toFixed(1);
    const randomFlow = (3.0 + Math.random() * 0.5).toFixed(1);
    setApiData({
      line: "A",
      electric: { voltage: Number(randomVolt), current: Number(randomCurr) },
      water: { flow: Number(randomFlow) },
      updatedAt: new Date().toLocaleTimeString('th-TH')
    });
  };

  useEffect(() => {
    let interval = null;
    if (isPolling) {
      interval = setInterval(fetchMeterData, 5000);
    }
    return () => clearInterval(interval);
  }, [isPolling, networkCondition]);

  const jsonString = JSON.stringify(apiData, null, 2);

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiServer className="w-5 h-5 text-blue-500" />
            ห้องแล็บดึงข้อมูลผ่าน REST API &amp; แกะโครงสร้าง JSON (Workshop 3 Sandbox)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            จำลอง Mock API ค่าน้ำ-ไฟโรงงาน ดึงข้อมูลแบบ Asynchronous (fetch/await) พร้อมคลิกสำรวจ Path ของ JSON
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchMeterData}
            className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95"
          >
            <FiRefreshCw className="w-3.5 h-3.5" /> ดึงข้อมูลทันที (Fetch)
          </button>
          <button
            onClick={() => setIsPolling(!isPolling)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
              isPolling 
                ? 'bg-emerald-600 border-emerald-500 text-white animate-pulse' 
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}
          >
            <FiClock className="w-3.5 h-3.5" /> Polling 5s: {isPolling ? 'ACTIVE' : 'OFF'}
          </button>
        </div>
      </div>

      {/* Network Condition Selector */}
      <div className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
        <span className="font-bold text-slate-400">จำลองสถานะเน็ตเวิร์ก:</span>
        <button
          onClick={() => setNetworkCondition('200_OK')}
          className={`px-2.5 py-1 rounded font-mono text-[11px] font-bold ${
            networkCondition === '200_OK' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          200 OK (ปกติ)
        </button>
        <button
          onClick={() => setNetworkCondition('404_NOT_FOUND')}
          className={`px-2.5 py-1 rounded font-mono text-[11px] font-bold ${
            networkCondition === '404_NOT_FOUND' ? 'bg-amber-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          404 Not Found (URL ผิด)
        </button>
        <button
          onClick={() => setNetworkCondition('500_SERVER_ERROR')}
          className={`px-2.5 py-1 rounded font-mono text-[11px] font-bold ${
            networkCondition === '500_SERVER_ERROR' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-slate-400'
          }`}
        >
          500 Server Down (ระบบล่ม)
        </button>
      </div>

      {/* Live Error Notification */}
      {errorLog && (
        <div className="p-3.5 rounded-xl border border-rose-500/50 bg-rose-950/40 text-rose-200 text-xs flex items-center gap-2.5">
          <FiAlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span><strong>ตรวจพบข้อผิดพลาด:</strong> {errorLog} (หน้าเว็บดักจับด้วย <code>try...catch</code> ทำให้จอไม่ขาวค้าง)</span>
        </div>
      )}

      {/* Dashboard & JSON Side-by-Side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Rendered Electrical Dashboard */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Line A Live Dashboard</span>
            <span className="font-mono text-[11px] text-slate-500">อัปเดตล่าสุด: {apiData.updatedAt}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl border border-indigo-500/40 bg-indigo-950/30">
              <span className="text-[10px] text-indigo-300 font-bold block mb-1">VOLTAGE (V)</span>
              <div className="text-3xl font-black font-mono text-white">{apiData.electric.voltage} <span className="text-xs font-normal text-slate-400">V</span></div>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 block">data.electric.voltage</span>
            </div>

            <div className="p-4 rounded-xl border border-teal-500/40 bg-teal-950/30">
              <span className="text-[10px] text-teal-300 font-bold block mb-1">CURRENT (A)</span>
              <div className="text-3xl font-black font-mono text-white">{apiData.electric.current} <span className="text-xs font-normal text-slate-400">A</span></div>
              <span className="text-[10px] text-emerald-400 font-mono mt-1 block">data.electric.current</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-sky-500/30 bg-sky-950/20 flex items-center justify-between text-xs">
            <div>
              <span className="text-[10px] text-sky-400 font-bold uppercase block">Water Flow Sensor</span>
              <span className="font-mono font-bold text-white text-base">{apiData.water.flow} m³/h</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-1 rounded">data.water.flow</span>
          </div>
        </div>

        {/* Right: Interactive JSON Tree Inspector */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider">Raw JSON Response</span>
            <span className="text-[10px] text-slate-500 font-mono">Content-Type: application/json</span>
          </div>

          <pre className="p-4 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-emerald-300 leading-relaxed overflow-x-auto m-0">
            <code>{jsonString}</code>
          </pre>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400">
            💡 <strong>วิธีแกะ JSON ของระบบ:</strong> สังเกตว่า <code>voltage</code> อยู่ซ้อนใน <code>electric</code> ดังนั้นโค้ด JavaScript ที่ถูกต้องคือ <code>data.electric.voltage</code> (ห้ามเขียน <code>data.voltage</code> ตรงๆ เพราะจะได้ค่า <code>undefined</code>)
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SIMULATOR 5: Webhook Alert & Anti-Double-Submit Simulator (Workshop 4 Engine)
// =========================================================================
export function WebhookNotificationSimulator() {
  const { isDark } = useTheme();
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Machine Initialized', message: 'Machine M-01 Online', time: '10:00:00' }
  ]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [debounceEnabled, setDebounceEnabled] = useState(true);
  const [rapidClickCount, setRapidClickCount] = useState(0);

  const handleSendWebhook = () => {
    if (debounceEnabled && isSubmitting) return;

    if (debounceEnabled) {
      setIsSubmitting(true);
      setTimeout(() => setIsSubmitting(false), 3000); // 3-second lockout
    }

    const newAlert = {
      id: Date.now(),
      title: '🚨 Start Triggered',
      message: `Operator pushed START on Line A (Attempt #${notifications.length + 1})`,
      time: new Date().toLocaleTimeString('th-TH')
    };

    setNotifications(prev => [newAlert, ...prev.slice(0, 4)]);
  };

  const handleSpamClick = () => {
    setRapidClickCount(prev => prev + 1);
    handleSendWebhook();
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiBell className="w-5 h-5 text-amber-500" />
            ตัวจำลองยิง Webhook แจ้งเตือน &amp; ป้องกันการส่งซ้ำ (Workshop 4 Sandbox)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            จำลองการส่งข้อมูลแบบ HTTP POST ไปยัง Webhook ของ Telegram / Teams พร้อมระบบล็อกปุ่มป้องกันกดเบิ้ล (Debounce Lock)
          </p>
        </div>

        <button
          onClick={() => setDebounceEnabled(!debounceEnabled)}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border flex items-center gap-1.5 ${
            debounceEnabled 
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
              : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
          }`}
        >
          🛡️ ระบบล็อกปุ่มกันกดซ้ำ: {debounceEnabled ? 'เปิดใช้งาน (Safe)' : 'ปิด (เสี่ยงแจ้งเตือนเบิ้ล)'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Transmitter Controls */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-4">
          <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <FiSend className="w-4 h-4 text-amber-400" /> ฝั่งหน้าเว็บผู้ส่ง (Client-Side POST)
          </h4>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs font-mono">
            <span className="text-slate-500 block text-[10px]">WEBHOOK ENDPOINT:</span>
            <div className="text-amber-300 truncate">POST https://oem.sncformer.com/api/notify</div>
            <div className="text-slate-400 text-[11px] pt-1">
              Body: <code>{JSON.stringify({ title: "Start Machine", message: "Line A RUNNING" })}</code>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={handleSpamClick}
              disabled={debounceEnabled && isSubmitting}
              className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${
                debounceEnabled && isSubmitting
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-600/20'
              }`}
            >
              {isSubmitting ? (
                <>
                  <FiRefreshCw className="w-4 h-4 animate-spin" /> กำลังส่ง... (ล็อกปุ่ม 3 วินาที)
                </>
              ) : (
                <>
                  <FiBell className="w-4 h-4" /> กดปุ่ม START แล้วยิง Webhook
                </>
              )}
            </button>
            <p className="text-[11px] text-slate-400 m-0 text-center">
              ลองคลิกปุ่มรัวๆ: {!debounceEnabled ? '⚠️ ระวัง! ข้อความแจ้งเตือนจะเด้งซ้ำรัวๆ ในกลุ่มแชต' : '✅ ระบบจะกันไม่ให้ส่งซ้ำอย่างชาญฉลาด'}
            </p>
          </div>
        </div>

        {/* Right: Simulated Notification Tray */}
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-950 space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-400 uppercase tracking-wider">กล่องข้อความแจ้งเตือนหน้าห้อง / แชต</span>
            <span className="text-[10px] text-emerald-400 font-mono">Webhook Receiver Live</span>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {notifications.map((msg) => (
              <div 
                key={msg.id} 
                className="p-3 rounded-xl border border-amber-500/30 bg-amber-950/20 text-xs space-y-1 animate-fadeIn"
              >
                <div className="flex justify-between items-center font-bold text-amber-300">
                  <span>{msg.title}</span>
                  <span className="text-[10px] text-slate-500 font-mono">{msg.time}</span>
                </div>
                <p className="text-slate-300 m-0 text-[11px]">{msg.message}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SIMULATOR 6: Automated Test Case & Boundary Evaluator (Module 5 Engine)
// =========================================================================
export function AutomatedTestCaseEvaluator() {
  const { isDark } = useTheme();
  const [actual, setActual] = useState(1104);
  const [target, setTarget] = useState(1200);

  const officialCases = [
    { id: 'TC-01', desc: 'ยอดผลิตปกติ (Normal Case)', target: 1200, actual: 1104, expectedStatus: 'ปกติ', expClass: 'ok' },
    { id: 'TC-02', desc: 'ค่าขอบบนพอดี 85.0% (Boundary Case)', target: 1200, actual: 1020, expectedStatus: 'ปกติ', expClass: 'ok' },
    { id: 'TC-03', desc: 'ค่าขอบล่างพอดี 60.0% (Boundary Case)', target: 1200, actual: 720, expectedStatus: 'เฝ้าระวัง', expClass: 'warn' },
    { id: 'TC-04', desc: 'ยอดต่ำกว่าเป้าหมาย (Sub-target Alarm)', target: 1200, actual: 599, expectedStatus: 'ต่ำกว่าเป้า', expClass: 'bad' },
    { id: 'TC-05', desc: 'เป้าหมายเป็น 0 (Invalid Target Error)', target: 0, actual: 50, expectedStatus: 'ไม่มีข้อมูล', expClass: 'off' },
  ];

  const calculatePerf = (act, tgt) => {
    if (tgt <= 0) return { perf: null, status: 'ไม่มีข้อมูล', cls: 'off' };
    const p = Number(((act / tgt) * 100).toFixed(1));
    if (p >= 85.0) return { perf: p, status: 'ปกติ', cls: 'ok' };
    if (p >= 60.0) return { perf: p, status: 'เฝ้าระวัง', cls: 'warn' };
    return { perf: p, status: 'ต่ำกว่าเป้า', cls: 'bad' };
  };

  const currentResult = calculatePerf(actual, target);

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-6 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b ${
        isDark ? 'border-slate-800' : 'border-slate-200'
      }`}>
        <div>
          <h3 className={`text-lg font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            <FiCheckSquare className="w-5 h-5 text-orange-500" />
            เครื่องมือทดสอบเงื่อนไข Performance &amp; วิเคราะห์ค่าขอบ (Boundary Value Lab)
          </h3>
          <p className={`text-xs mt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            ฝึกวิเคราะห์ Test Cases สำหรับการคำนวณประสิทธิภาพไลน์ผลิต (เตรียมความพร้อมสำหรับสอบปฏิบัติ)
          </p>
        </div>
      </div>

      {/* Interactive Custom Test Runner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
        <div className="space-y-1.5">
          <label className="font-bold text-slate-300">ยอดผลิตเป้าหมาย (Target):</label>
          <input
            type="number"
            value={target}
            onChange={e => setTarget(Number(e.target.value))}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
          />
        </div>

        <div className="space-y-1.5">
          <label className="font-bold text-slate-300">ยอดผลิตจริง (Actual):</label>
          <input
            type="number"
            value={actual}
            onChange={e => setActual(Number(e.target.value))}
            className="w-full px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 font-mono text-white"
          />
        </div>

        <div className="space-y-1.5 flex flex-col justify-end">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex justify-between items-center font-mono">
            <span>ผลคำนวณ:</span>
            <span className={`font-black text-sm ${
              currentResult.cls === 'ok' ? 'text-emerald-400' :
              currentResult.cls === 'warn' ? 'text-amber-400' :
              currentResult.cls === 'bad' ? 'text-rose-400' : 'text-slate-400'
            }`}>
              {currentResult.perf !== null ? `${currentResult.perf}%` : 'N/A'} ({currentResult.status})
            </span>
          </div>
        </div>
      </div>

      {/* Suite of 5 Standard Test Cases */}
      <div className="space-y-3">
        <span className="text-xs font-bold text-slate-400">ชุดการทดสอบมาตรฐาน 5 กรณี (Automated Test Suite):</span>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden font-mono">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-2.5">Case ID</th>
                <th className="p-2.5">คำอธิบายกรณีทดสอบ</th>
                <th className="p-2.5">Target</th>
                <th className="p-2.5">Actual</th>
                <th className="p-2.5">ผลลัพธ์ที่คำนวณได้</th>
                <th className="p-2.5">สถานะที่คาดหวัง</th>
                <th className="p-2.5">ผลการตรวจ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 bg-slate-900/60 text-slate-300">
              {officialCases.map((tc) => {
                const res = calculatePerf(tc.actual, tc.target);
                const isPass = res.status === tc.expectedStatus;
                return (
                  <tr key={tc.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5 font-bold text-indigo-400">{tc.id}</td>
                    <td className="p-2.5 font-sans">{tc.desc}</td>
                    <td className="p-2.5">{tc.target}</td>
                    <td className="p-2.5">{tc.actual}</td>
                    <td className="p-2.5 font-bold">{res.perf !== null ? `${res.perf}%` : 'null'}</td>
                    <td className="p-2.5 font-sans font-bold">{tc.expectedStatus}</td>
                    <td className="p-2.5">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        isPass ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {isPass ? 'PASS ✓' : 'FAIL ✗'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// SHARED FULL-CURRICULUM COMPONENTS (102 Slides + 98 Images + 16 Examples + 4 Workshops + Day 4 Exam)
// =========================================================================

function TeachingKitQuickDrawer({ defaultTab = 'script', dayLabel = 'ครบทั้ง 4 วัน' }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-2xl border-2 border-fuchsia-500/40 bg-gradient-to-r from-fuchsia-950/40 via-indigo-950/40 to-slate-900 overflow-hidden shadow-xl">
      <div className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-indigo-600 flex items-center justify-center text-white text-xl font-black shrink-0 shadow-lg shadow-fuchsia-500/20">
            🎓
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base sm:text-lg font-black text-white m-0">
                ชุดคู่มือผู้สอน &amp; สื่อการสอนฉบับสมบูรณ์ (Complete Teaching Kit Hub)
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
                102 สไลด์ · 14 บททบทวน · 16 ตัวอย่างโค้ด · 4 Workshop · ข้อสอบจริง
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 m-0 leading-relaxed">
              รวบรวมทุกไฟล์จากชุดสื่อการสอนต้นฉบับ: เช็กลิสต์เตรียมสอน, บทพูดรายสไลด์ 102 หน้าพร้อมโหมดสอนทีละหน้า, สรุปทบทวนผู้สอน 14 หัวข้อ + ตารางแก้บั๊ก F12, สื่อจำลอง 4 ชิ้น, Pre/Post-test 40 ข้อ และเฉลย Workshop/ข้อสอบ ({dayLabel})
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="px-4 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-fuchsia-600 to-indigo-600 hover:from-fuchsia-500 hover:to-indigo-500 text-white shadow-lg shadow-fuchsia-600/20 flex items-center gap-2 shrink-0 cursor-pointer transition-all"
        >
          {open ? (
            <>
              <FiChevronUp className="w-4 h-4" /> ซ่อนชุดคู่มือผู้สอน
            </>
          ) : (
            <>
              <FiBookOpen className="w-4 h-4" /> เปิดชุดคู่มือผู้สอน 6 แท็บเต็มรูปแบบ
            </>
          )}
        </button>
      </div>

      {open && (
        <div className="p-4 sm:p-6 border-t border-fuchsia-500/30 bg-slate-950/90">
          <EnterpriseTeachingKitHub initialTab={defaultTab} />
        </div>
      )}
    </div>
  );
}

function ModuleSlidesDeckViewer({ moduleId, moduleLabel }) {
  const slides = ENTERPRISE_SLIDES_102.filter((s) => s.moduleId === moduleId);
  const [viewMode, setViewMode] = useState('deck'); // 'deck' | 'all'
  const [currentIdx, setCurrentIdx] = useState(0);
  const [search, setSearch] = useState('');
  const [showSpeakerNotes, setShowSpeakerNotes] = useState(true);

  if (!slides.length) return null;

  const activeSlide = slides[currentIdx] || slides[0];
  const filteredSlides = slides.filter((s) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(s.n) === q ||
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.say && s.say.toLowerCase().includes(q)) ||
      (s.tip && s.tip.toLowerCase().includes(q)) ||
      (s.textBlocks && s.textBlocks.some((t) => t.toLowerCase().includes(q)))
    );
  });

  return (
    <section className="rounded-2xl border border-indigo-500/40 bg-slate-900/95 overflow-hidden shadow-2xl">
      {/* Header Bar */}
      <div className="p-4 sm:p-5 bg-gradient-to-r from-indigo-950/90 via-slate-900 to-slate-900 border-b border-indigo-500/30 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
              📊 สไลด์ต้นฉบับครบทุกหน้า ({slides[0].n}–{slides[slides.length - 1].n})
            </span>
            <span className="text-xs font-bold text-amber-300">
              รวม {slides.length} สไลด์ · พร้อมภาพประกอบจากสไลด์จริง &amp; บทพูดผู้สอน
            </span>
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white mt-1 m-0">
            สไลด์การสอนและบทพูดวิทยากรประจำ{moduleLabel}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowSpeakerNotes(!showSpeakerNotes)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 cursor-pointer transition-all ${
              showSpeakerNotes
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {showSpeakerNotes ? <FiEye className="w-3.5 h-3.5" /> : <FiEyeOff className="w-3.5 h-3.5" />}
            {showSpeakerNotes ? 'แสดงบทพูดผู้สอน (ON)' : 'ซ่อนบทพูดผู้สอน (OFF)'}
          </button>

          <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setViewMode('deck')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'deck' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              🖥️ ดูทีละสไลด์ (Slide Deck)
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all ${
                viewMode === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              📜 เรียงทุกสไลด์ ({slides.length} หน้า)
            </button>
          </div>
        </div>
      </div>

      {viewMode === 'deck' ? (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Slide Number Selector Strip */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
            {slides.map((s, idx) => (
              <button
                key={s.n}
                type="button"
                onClick={() => setCurrentIdx(idx)}
                className={`px-2.5 py-1 rounded-lg font-mono text-xs font-bold shrink-0 cursor-pointer transition-all ${
                  idx === currentIdx
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/30 scale-105'
                    : 'bg-slate-800/90 text-slate-400 hover:bg-slate-700 hover:text-white'
                }`}
                title={`สไลด์ ${s.n}: ${s.title}`}
              >
                #{s.n}
              </button>
            ))}
          </div>

          {/* Active Slide Card */}
          <div className="rounded-2xl bg-slate-950 border border-slate-800 p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-xl bg-indigo-600 text-white font-mono text-sm font-black">
                  Slide {activeSlide.n} / 102
                </span>
                <div>
                  <h3 className="text-lg sm:text-xl font-black text-white m-0">{activeSlide.title}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Day {activeSlide.day} · หน้าที่ {currentIdx + 1} จาก {slides.length} ในโมดูลนี้
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {activeSlide.time && (
                  <span className="px-3 py-1 rounded-lg bg-slate-900 border border-slate-700 text-amber-300 font-mono text-xs font-bold">
                    ⏱️ เวลาแนะนำ: {activeSlide.time}
                  </span>
                )}
                <button
                  type="button"
                  disabled={currentIdx === 0}
                  onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  <FiChevronLeft /> ก่อนหน้า
                </button>
                <button
                  type="button"
                  disabled={currentIdx === slides.length - 1}
                  onClick={() => setCurrentIdx((i) => Math.min(slides.length - 1, i + 1))}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1 cursor-pointer"
                >
                  ถัดไป <FiChevronRight />
                </button>
              </div>
            </div>

            {/* Slide Content & Visuals Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left: Slide Text, Bullets, Tables, and Slide Images */}
              <div className={`${showSpeakerNotes ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-4`}>
                {activeSlide.textBlocks && activeSlide.textBlocks.length > 0 && (
                  <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-indigo-400 font-bold">
                      📌 เนื้อหาบนสไลด์ (Slide Content)
                    </div>
                    <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200 list-disc list-inside leading-relaxed">
                      {activeSlide.textBlocks.map((tb, idx) => (
                        <li key={idx}>{Array.isArray(tb) ? tb.join(' ') : tb}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {activeSlide.tables &&
                  activeSlide.tables.map((tbl, tIdx) => (
                    <div key={tIdx} className="overflow-x-auto rounded-xl border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 text-indigo-300">
                          <tr>
                            {tbl[0]?.map((cell, cIdx) => (
                              <th key={cIdx} className="p-2.5 border-b border-slate-800 font-bold">
                                {cell}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-slate-950 text-slate-300">
                          {tbl.slice(1).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-900/40">
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="p-2.5">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}

                {activeSlide.images && activeSlide.images.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                      🖼️ ภาพประกอบและไดอะแกรมจากสไลด์จริง ({activeSlide.images.length} ภาพ)
                    </div>
                    <div
                      className={`grid gap-3 ${
                        activeSlide.images.length === 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'
                      }`}
                    >
                      {activeSlide.images.map((img, iIdx) => (
                        <div
                          key={iIdx}
                          className="rounded-xl overflow-hidden border border-slate-700 bg-slate-900 p-2 flex items-center justify-center"
                        >
                          <img
                            src={`./images/enterprise_slides/${img}`}
                            alt={`Slide ${activeSlide.n} visual ${iIdx + 1}`}
                            className="max-h-80 w-auto object-contain rounded-lg"
                            loading="lazy"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right: Speaker Notes (Say / Ask / Tip) */}
              {showSpeakerNotes && (
                <div className="lg:col-span-5 space-y-3">
                  <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2">
                    <div className="text-xs font-black text-indigo-300 uppercase tracking-wider">
                      🎙️ บทพูดผู้สอน (Say)
                    </div>
                    <p className="text-xs sm:text-sm text-slate-200 leading-relaxed m-0 whitespace-pre-line">
                      {activeSlide.say || 'อธิบายเนื้อหาตามหัวข้อบนสไลด์และเชื่อมโยงกับบริบทโรงงานจริง'}
                    </p>
                  </div>

                  {activeSlide.ask && (
                    <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 space-y-1.5">
                      <div className="text-xs font-black text-amber-300 uppercase tracking-wider">
                        ❓ คำถามชวนผู้เรียนคิด (Ask)
                      </div>
                      <p className="text-xs sm:text-sm text-amber-100 leading-relaxed m-0">
                        {activeSlide.ask}
                      </p>
                    </div>
                  )}

                  {activeSlide.tip && (
                    <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-1.5">
                      <div className="text-xs font-black text-emerald-300 uppercase tracking-wider">
                        💡 เทคนิคการสอน / จุดเน้นหน้าห้อง (Tip)
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed m-0">
                        {activeSlide.tip}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* All Slides List View */
        <div className="p-4 sm:p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <FiSearch className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="ค้นหาเลขสไลด์, หัวข้อ, หรือคำในบทพูด..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-xs text-white"
              />
            </div>
            <span className="text-xs text-slate-400 font-mono">
              แสดง {filteredSlides.length} จาก {slides.length} สไลด์
            </span>
          </div>

          <div className="space-y-4 max-h-[850px] overflow-y-auto pr-1">
            {filteredSlides.map((s) => (
              <div
                key={s.n}
                className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-mono text-xs font-black">
                      สไลด์ {s.n}
                    </span>
                    <h4 className="text-base font-black text-white m-0">{s.title}</h4>
                  </div>
                  {s.time && (
                    <span className="text-xs font-mono text-amber-300 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                      ⏱️ {s.time}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className={`${showSpeakerNotes ? 'lg:col-span-7' : 'lg:col-span-12'} space-y-3`}>
                    {s.textBlocks && s.textBlocks.length > 0 && (
                      <ul className="text-xs text-slate-200 space-y-1 list-disc list-inside bg-slate-900/70 p-3.5 rounded-xl border border-slate-800">
                        {s.textBlocks.map((tb, idx) => (
                          <li key={idx}>{Array.isArray(tb) ? tb.join(' ') : tb}</li>
                        ))}
                      </ul>
                    )}

                    {s.tables &&
                      s.tables.map((tbl, tIdx) => (
                        <div key={tIdx} className="overflow-x-auto rounded-xl border border-slate-800">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-900 text-indigo-300">
                              <tr>
                                {tbl[0]?.map((c, cIdx) => (
                                  <th key={cIdx} className="p-2 border-b border-slate-800">
                                    {c}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800 bg-slate-950 text-slate-300">
                              {tbl.slice(1).map((r, rIdx) => (
                                <tr key={rIdx}>
                                  {r.map((c, cIdx) => (
                                    <td key={cIdx} className="p-2">
                                      {c}
                                    </td>
                                  ))}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ))}

                    {s.images && s.images.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {s.images.map((img, iIdx) => (
                          <div
                            key={iIdx}
                            className="rounded-xl overflow-hidden border border-slate-800 bg-slate-900 p-2 flex items-center justify-center"
                          >
                            <img
                              src={`./images/enterprise_slides/${img}`}
                              alt={`Slide ${s.n}`}
                              className="max-h-56 w-auto object-contain rounded"
                              loading="lazy"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {showSpeakerNotes && (
                    <div className="lg:col-span-5 space-y-2 text-xs">
                      <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/30 text-slate-200">
                        <strong className="text-indigo-300 block mb-1">💬 บทพูด (Say):</strong>
                        {s.say}
                      </div>
                      {s.ask && (
                        <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-amber-100">
                          <strong className="text-amber-300 block mb-1">❓ คำถามชวนคิด (Ask):</strong>
                          {s.ask}
                        </div>
                      )}
                      {s.tip && (
                        <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-100">
                          <strong className="text-emerald-300 block mb-1">💡 เทคนิคผู้สอน (Tip):</strong>
                          {s.tip}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function ModuleDeepTheorySection({ reviewIds = [], sectionTitle }) {
  const articles = ENTERPRISE_INSTRUCTOR_REVIEW_14.filter((item) => reviewIds.includes(item.id));
  if (!articles.length) return null;

  return (
    <section className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h2 className="text-xl font-black text-white flex items-center gap-2.5 m-0">
          <span className="px-2.5 py-1 rounded-lg bg-fuchsia-600/30 text-fuchsia-300 text-xs font-mono border border-fuchsia-500/40">
            DEEP-DIVE KNOWLEDGE
          </span>
          {sectionTitle}
        </h2>
        <span className="text-xs text-slate-400 font-mono">
          สรุปเนื้อหาเจาะลึก + โค้ดต้นแบบ + จุดที่ผู้เรียนมักพลาดบ่อยในห้องแล็บ
        </span>
      </div>

      <div className="space-y-5">
        {articles.map((art) => (
          <div
            key={art.id}
            className="p-5 sm:p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4 shadow-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/20 text-fuchsia-300 font-mono text-xs font-bold border border-fuchsia-500/30">
                  {art.tag}
                </span>
                <h3 className="text-lg font-black text-white m-0">{art.title}</h3>
              </div>
              <span className="text-xs font-mono text-amber-300 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800">
                📌 {art.useIn}
              </span>
            </div>

            {art.lead && (
              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed bg-slate-950/70 p-3.5 rounded-xl border-l-4 border-fuchsia-500 m-0">
                {art.lead}
              </p>
            )}

            {art.flowline && (
              <div className="flex flex-wrap items-center gap-2 p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono text-cyan-300">
                {art.flowline.map((node, idx) => (
                  <React.Fragment key={idx}>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700">
                      {node}
                    </span>
                    {idx < art.flowline.length - 1 && <span className="text-slate-500">→</span>}
                  </React.Fragment>
                ))}
              </div>
            )}

            {art.cards && art.cards.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {art.cards.map((c, idx) => (
                  <div
                    key={idx}
                    className={`p-4 rounded-xl border space-y-2 ${
                      c.variant === 'trap'
                        ? 'bg-amber-950/20 border-amber-500/40'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <h4
                      className={`text-sm font-black m-0 ${
                        c.variant === 'trap' ? 'text-amber-300' : 'text-indigo-300'
                      }`}
                    >
                      {c.title}
                    </h4>
                    {c.text && <p className="text-xs text-slate-300 leading-relaxed m-0">{c.text}</p>}
                    {c.bullets && (
                      <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside leading-relaxed">
                        {c.bullets.map((b, bIdx) => (
                          <li key={bIdx}>{b}</li>
                        ))}
                      </ul>
                    )}
                    {c.code && <CodeBlock code={c.code} language="javascript / html" />}
                  </div>
                ))}
              </div>
            )}

            {art.table && (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-indigo-300 font-bold">
                    <tr>
                      {art.table.headers.map((h, hIdx) => (
                        <th key={hIdx} className="p-3 border-b border-slate-800">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-300">
                    {art.table.rows.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-slate-800/40">
                        {row.map((cell, cIdx) => (
                          <td
                            key={cIdx}
                            className={`p-3 ${cIdx === 0 ? 'font-mono font-bold text-amber-300' : ''}`}
                          >
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {art.faqs && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {art.faqs.map((f, fIdx) => (
                  <div
                    key={fIdx}
                    className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs"
                  >
                    <div className="font-bold text-amber-300">❓ {f.q}</div>
                    <div className="text-slate-300 leading-relaxed">💡 {f.a}</div>
                  </div>
                ))}
              </div>
            )}

            {art.selfCheck && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-emerald-300">
                  ✅ คำถามทบทวนความเข้าใจ 10 ข้อพร้อมคำตอบ:
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {art.selfCheck.map((sc, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1 text-xs"
                    >
                      <div className="font-bold text-white">
                        {sIdx + 1}. {sc.q}
                      </div>
                      <div className="text-emerald-300 leading-relaxed">↳ {sc.a}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function ModuleCodeExamplesViewer({ moduleId, title }) {
  const examples = ENTERPRISE_CODE_EXAMPLES_16.filter((ex) => ex.moduleId === moduleId);
  const [selectedFile, setSelectedFile] = useState(examples[0]?.file || '');

  if (!examples.length) return null;
  const activeEx = examples.find((e) => e.file === selectedFile) || examples[0];

  return (
    <section className="rounded-2xl border border-cyan-500/40 bg-slate-900/90 p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[11px] font-mono font-bold mb-1">
            💻 CODE EXAMPLES ({examples.length} ไฟล์จากโฟลเดอร์ examples/)
          </div>
          <h2 className="text-lg sm:text-xl font-black text-white m-0">{title}</h2>
        </div>
        <span className="text-xs text-slate-400">
          คลิกเลือกไฟล์ตัวอย่างเพื่อดูโค้ดฉบับเต็มและคัดลอกไปรันทดสอบ
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {examples.map((ex) => (
          <button
            key={ex.file}
            type="button"
            onClick={() => setSelectedFile(ex.file)}
            className={`px-3 py-2 rounded-xl text-xs font-mono font-bold border cursor-pointer transition-all ${
              activeEx.file === ex.file
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-600'
            }`}
          >
            📄 {ex.file}
          </button>
        ))}
      </div>

      {activeEx && (
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-sm font-black text-cyan-300">{activeEx.title}</span>
              <span className="ml-2 text-xs font-mono text-slate-400">({activeEx.slides})</span>
            </div>
            <span className="text-xs text-slate-300">{activeEx.desc}</span>
          </div>
          <CodeBlock code={activeEx.code} language={activeEx.file} />
        </div>
      )}
    </section>
  );
}

function WorkshopFullLabSheet({ workshopId }) {
  const workshops = ENTERPRISE_WORKSHOPS_DATA?.workshops || [];
  const w = workshops.find((item) => 
    item.id === workshopId || 
    item.id.toLowerCase() === workshopId.toLowerCase() ||
    item.id.replace(/\s+/g, '').toLowerCase() === workshopId.toLowerCase() ||
    (workshopId === 'w1' && item.id === 'Workshop 1') ||
    (workshopId === 'w2' && item.id === 'Workshop 2') ||
    (workshopId === 'w3' && item.id === 'Workshop 3') ||
    (workshopId === 'w4' && item.id === 'Workshop 4')
  );
  const [codeTab, setCodeTab] = useState('starter'); // 'starter' | 'solution' | 'mockapi'

  if (!w) return null;

  const starterEntries = Object.entries(w.starterFiles || {});
  const solutionEntries = Object.entries(w.solutionFiles || {});
  const hasMockApi = w.id === 'Workshop 3' || w.id === 'Workshop 4' || workshopId === 'w3' || workshopId === 'w4';

  return (
    <section className="rounded-2xl border-2 border-emerald-500/40 bg-slate-900/95 overflow-hidden shadow-2xl">
      <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-950/90 via-teal-950/70 to-slate-900 border-b border-emerald-500/30 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-xs font-black border border-emerald-500/40">
            🛠️ HANDS-ON WORKSHOP LAB SHEET · {w.day}
          </span>
          <span className="text-xs font-mono text-amber-300 bg-slate-950/80 px-3 py-1 rounded-lg border border-slate-800">
            ⏱️ เวลาทำแล็บ: {w.duration} · โฟลเดอร์: {w.folder}
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-black text-white m-0">{w.title}</h2>
        <p className="text-xs sm:text-sm text-emerald-100 leading-relaxed m-0">
          <strong>เป้าหมาย (Goal):</strong> {w.goal}
        </p>
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* Steps & Spec Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-6 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h3 className="text-sm font-black text-emerald-400 m-0">
              📋 ขั้นตอนการลงมือทำทีละขั้น (Step-by-Step Instructions)
            </h3>
            <ol className="text-xs sm:text-sm text-slate-200 space-y-2 list-decimal list-inside leading-relaxed">
              {(w.steps || []).map((st, idx) => (
                <li key={idx} className="pl-1">
                  {st}
                </li>
              ))}
            </ol>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h3 className="text-sm font-black text-cyan-400 m-0">
                📐 ข้อกำหนดทางเทคนิค (Technical Specification)
              </h3>
              <div className="divide-y divide-slate-800 text-xs">
                {(w.spec || []).map(([k, v], idx) => (
                  <div key={idx} className="py-2 flex flex-col sm:flex-row sm:justify-between gap-1">
                    <span className="font-bold text-slate-300">{k}</span>
                    <span className="font-mono text-cyan-300 sm:text-right">{v}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 space-y-2">
              <h3 className="text-sm font-black text-emerald-300 m-0">
                ✅ เกณฑ์ตรวจงาน "ทำเสร็จเมื่อ" (Definition of Done)
              </h3>
              <ul className="text-xs text-slate-200 space-y-1.5 list-disc list-inside">
                {(w.doneWhen || []).map((dw, idx) => (
                  <li key={idx}>{dw}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Hints & Stretch Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {w.hints && w.hints.length > 0 && (
            <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-1.5">
              <div className="font-black text-amber-300">💡 คำใบ้และจุดสังเกต (Hints):</div>
              <ul className="space-y-1 text-amber-100 list-disc list-inside">
                {w.hints.map((h, idx) => (
                  <li key={idx}>{h}</li>
                ))}
              </ul>
            </div>
          )}
          {w.stretch && w.stretch.length > 0 && (
            <div className="p-4 rounded-xl bg-indigo-950/20 border border-indigo-500/30 space-y-1.5">
              <div className="font-black text-indigo-300">🚀 โจทย์ท้าทายเพิ่มเติมสำหรับคนที่เสร็จเร็ว (Stretch Goals):</div>
              <ul className="space-y-1 text-indigo-100 list-disc list-inside">
                {w.stretch.map((st, idx) => (
                  <li key={idx}>{st}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Starter & Solution Code Switcher */}
        <div className="space-y-4 pt-2 border-t border-slate-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCodeTab('starter')}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  codeTab === 'starter'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                📂 โค้ดตั้งต้นสำหรับผู้เรียน (starter/ · {starterEntries.length} ไฟล์)
              </button>
              <button
                type="button"
                onClick={() => setCodeTab('solution')}
                className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                  codeTab === 'solution'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                🔑 เฉลยฉบับสมบูรณ์สำหรับผู้สอน (solution/ · {solutionEntries.length} ไฟล์)
              </button>
              {hasMockApi && (
                <button
                  type="button"
                  onClick={() => setCodeTab('mockapi')}
                  className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    codeTab === 'mockapi'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  🐍 เซิร์ฟเวอร์จำลอง Python (mock_api.py)
                </button>
              )}
            </div>
          </div>

          {codeTab === 'starter' && (
            <div className="space-y-4">
              {starterEntries.map(([fname, content]) => (
                <div key={fname}>
                  <div className="text-xs font-mono font-bold text-cyan-300 mb-1">
                    📄 {w.folder}/starter/{fname}
                  </div>
                  <CodeBlock code={content} language={`starter/${fname}`} />
                </div>
              ))}
            </div>
          )}

          {codeTab === 'solution' && (
            <div className="space-y-4">
              {solutionEntries.map(([fname, content]) => (
                <div key={fname}>
                  <div className="text-xs font-mono font-bold text-emerald-300 mb-1">
                    ✅ {w.folder}/solution/{fname}
                  </div>
                  <CodeBlock code={content} language={`solution/${fname}`} />
                </div>
              ))}
            </div>
          )}

          {codeTab === 'mockapi' && hasMockApi && (
            <div>
              <div className="text-xs font-mono font-bold text-purple-300 mb-1">
                🐍 workshops/mock-api/mock_api.py (รันด้วยคำสั่ง python mock_api.py เปิดพอร์ต http://localhost:8000)
              </div>
              <CodeBlock code={ENTERPRISE_WORKSHOPS_DATA.mockApiPy} language="mock_api.py" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// =========================================================================
// MODULE 1: Enterprise System & Digital Industry Landscape (Day 1 - Morning)
// =========================================================================
export function EnterpriseAppMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-violet-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-violet-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-3 border border-violet-500/30">
          <FiLayers className="w-4 h-4" /> โมดูลที่ 1 (Module 1) · วันที่ 1 ภาคเช้า · สไลด์ 1–24
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Enterprise System &amp; Digital Industry Landscape (สถาปัตยกรรมระบบองค์กร IT/OT, ISA-95 &amp; JSON)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ทำความเข้าใจสถาปัตยกรรมระบบองค์กรดิจิทัล การหลอมรวมระหว่างเทคโนโลยีสารสนเทศ (IT) และเทคโนโลยีปฏิบัติการหน้างาน (OT) ตามโครงสร้างมาตรฐาน IEC 62264 (ISA-95), สถาปัตยกรรม Client-Server, และโครงสร้างข้อมูล JSON (RFC 8259)
        </p>
      </div>

      {/* Quick Open Full 6-Tab Teaching Kit */}
      <TeachingKitQuickDrawer defaultTab="prep" dayLabel="วันที่ 1 ภาคเช้า · สไลด์ 1–24" />

      {/* Complete Slide Deck Viewer for Module 1 (Slides 1-24 + Images + Speaker Script) */}
      <ModuleSlidesDeckViewer moduleId="m1" moduleLabel="โมดูลที่ 1 (วันที่ 1 ภาคเช้า: สไลด์ 1–24)" />

      {/* Deep-Dive Theory from Teaching Kit Review (#rv-arch, #rv-json) */}
      <ModuleDeepTheorySection
        reviewIds={['rv-arch', 'rv-json']}
        sectionTitle="เจาะลึกสถาปัตยกรรม IT/OT · ISA-95 · Client-Server และโครงสร้าง JSON (RFC 8259)"
      />

      {/* Interactive Simulator 1: Industrial HMI Color & Gloved Touch Validator */}
      <IndustrialHmiValidatorSimulator />
    </div>
  );
}

// =========================================================================
// MODULE 2: Industrial UX/UI & Web Development (Day 1 - Afternoon)
// =========================================================================
export function EnterpriseAppMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-pink-950/70 via-rose-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-pink-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-pink-500/20 text-pink-300 text-xs font-bold mb-3 border border-pink-500/30">
          <FiLayout className="w-4 h-4" /> โมดูลที่ 2 (Module 2) · วันที่ 1 ภาคบ่าย · สไลด์ 25–35 · Workshop 1
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Industrial UX/UI &amp; Modern Layout Design (Semantic HTML5, CSS Box Model &amp; Flexbox)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การออกแบบหน้าจอควบคุมและแดชบอร์ดอุตสาหกรรมตามหลักการมองเห็น 5 วินาที, มาตรฐานสี IEC 60204-1, โครงสร้าง Semantic HTML5, CSS Flexbox และลงมือทำแล็บจริง Workshop 1: จัดหน้าระบบวัดไฟฟ้า (Electrical Meter UI)
        </p>
      </div>

      {/* Quick Open Full 6-Tab Teaching Kit */}
      <TeachingKitQuickDrawer defaultTab="script" dayLabel="วันที่ 1 ภาคบ่าย · สไลด์ 25–35 + Workshop 1" />

      {/* Complete Slide Deck Viewer for Module 2 (Slides 25-35 + Images + Speaker Script) */}
      <ModuleSlidesDeckViewer moduleId="m2" moduleLabel="โมดูลที่ 2 (วันที่ 1 ภาคบ่าย: สไลด์ 25–35)" />

      {/* Deep-Dive Theory (#rv-html, #rv-css, #rv-f12) */}
      <ModuleDeepTheorySection
        reviewIds={['rv-html', 'rv-css', 'rv-f12']}
        sectionTitle="เจาะลึก Semantic HTML5 · CSS Box Model &amp; Flexbox · และตารางแก้ปัญหาด้วย F12 DevTools"
      />

      {/* Code Examples 01 to 07 */}
      <ModuleCodeExamplesViewer
        moduleId="m2"
        title="ไฟล์ตัวอย่างโค้ด HTML5, CSS Flexbox &amp; พื้นฐานการผูก элемент (ไฟล์ 01–07)"
      />

      {/* Simulator 2: Industrial Flexbox Playground */}
      <IndustrialFlexboxSimulator />

      {/* Full Workshop 1 Lab Sheet + Starter & Solution Code */}
      <WorkshopFullLabSheet workshopId="w1" />
    </div>
  );
}

// =========================================================================
// MODULE 3: JavaScript Programming Logic & DOM (Day 2)
// =========================================================================
export function EnterpriseAppMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-blue-950/70 via-cyan-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">
          <FiCode className="w-4 h-4" /> โมดูลที่ 3 (Module 3) · วันที่ 2 เต็มวัน · สไลด์ 36–71 · Workshop 2
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          JavaScript Programming Logic, DOM Manipulation, Events &amp; Fetch API
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ควบคุมตรรกะของแอปพลิเคชันด้วย JavaScript ES6+: ตัวแปร เงื่อนไข ฟังก์ชัน อาร์เรย์ อ็อบเจกต์, การเข้าถึงและเปลี่ยนค่า DOM (`getElementById`, `textContent`, `classList`), การดักฟังเหตุการณ์ (`addEventListener`), พื้นฐาน HTTP/REST API และลงมือทำ Workshop 2: ตู้ควบคุมไฟอัจฉริยะ (Control Cabinet)
        </p>
      </div>

      {/* Quick Open Full 6-Tab Teaching Kit */}
      <TeachingKitQuickDrawer defaultTab="lab" dayLabel="วันที่ 2 · สไลด์ 36–71 + Workshop 2" />

      {/* Complete Slide Deck Viewer for Module 3 (Slides 36-71 + Images + Speaker Script) */}
      <ModuleSlidesDeckViewer moduleId="m3" moduleLabel="โมดูลที่ 3 (วันที่ 2: สไลด์ 36–71)" />

      {/* Deep-Dive Theory (#rv-dom, #rv-http, #rv-fetch) */}
      <ModuleDeepTheorySection
        reviewIds={['rv-dom', 'rv-http', 'rv-fetch']}
        sectionTitle="เจาะลึก DOM &amp; Events · มาตรฐาน HTTP Methods (RFC 9110) · และ Fetch async/await"
      />

      {/* Code Examples 08 to 12 */}
      <ModuleCodeExamplesViewer
        moduleId="m3"
        title="ไฟล์ตัวอย่างโค้ด JSON, Async/Await, Fetch GET/POST และ Polling (ไฟล์ 08–12)"
      />

      {/* Simulator 3: Control Cabinet DOM Simulator */}
      <ControlCabinetDomSimulator />

      {/* Interactive 4 Visual Teaching Labs from Teaching Kit */}
      <section className="space-y-3">
        <h2 className="text-xl font-black text-white flex items-center gap-2 m-0">
          <span>🧪</span> สื่อจำลองเข้าใจง่าย 4 ชิ้น (API บริกรร้านอาหาร · JSON Path · DOM টিละบรรทัด · Polling vs Webhook)
        </h2>
        <TeachingKitVisualLabs />
      </section>

      {/* Full Workshop 2 Lab Sheet + Starter & Solution Code */}
      <WorkshopFullLabSheet workshopId="w2" />
    </div>
  );
}

// =========================================================================
// MODULE 4: Application Integration & IoT Connectivity (Day 3)
// =========================================================================
export function EnterpriseAppMod4() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiActivity className="w-4 h-4" /> โมดูลที่ 4 (Module 4) · วันที่ 3 เต็มวัน · สไลด์ 72–90 · Workshop 3 &amp; 4
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Application Integration, Real-Time Polling, Webhook &amp; Python Backend (Flask)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การบูรณาการระบบแบบครบวงจร (End-to-End): ดึงค่ามิเตอร์น้ำ-ไฟจาก REST API แบบ Real-Time Polling (`setInterval`), การส่งแจ้งเตือนฉุกเฉินผ่าน Webhook (`POST JSON`), การป้องกันการยิงแจ้งเตือนซ้ำ (Debounce/Cooldown), และการสร้างเซิร์ฟเวอร์ API ด้วย Python Flask (Workshop 3 &amp; Workshop 4)
        </p>
      </div>

      {/* Quick Open Full 6-Tab Teaching Kit */}
      <TeachingKitQuickDrawer defaultTab="review" dayLabel="วันที่ 3 · สไลด์ 72–90 + Workshop 3 & 4" />

      {/* Complete Slide Deck Viewer for Module 4 (Slides 72-90 + Images + Speaker Script) */}
      <ModuleSlidesDeckViewer moduleId="m4" moduleLabel="โมดูลที่ 4 (วันที่ 3: สไลด์ 72–90)" />

      {/* Deep-Dive Theory (#rv-poll, #rv-flask, #rv-e2e) */}
      <ModuleDeepTheorySection
        reviewIds={['rv-poll', 'rv-flask', 'rv-e2e']}
        sectionTitle="เจาะลึก Polling vs Webhook · การสร้าง Backend ด้วย Python Flask · และการเชื่อมระบบ End-to-End"
      />

      {/* Code Examples 13 to 14 */}
      <ModuleCodeExamplesViewer
        moduleId="m4"
        title="ไฟล์ตัวอย่างโค้ด Webhook Notification &amp; Python Flask API (ไฟล์ 13–14)"
      />

      {/* Simulator 4: Live REST API & JSON Tree */}
      <RestApiJsonTreeSimulator />

      {/* Simulator 5: Webhook Notification Sandbox */}
      <WebhookNotificationSimulator />

      {/* Full Workshop 3 Lab Sheet */}
      <WorkshopFullLabSheet workshopId="w3" />

      {/* Full Workshop 4 Lab Sheet */}
      <WorkshopFullLabSheet workshopId="w4" />
    </div>
  );
}

// =========================================================================
// MODULE 5: Software QA & Day 4 Formal Examination Center (Day 4)
// =========================================================================
export function EnterpriseAppMod5() {
  const [examTab, setExamTab] = useState('theory'); // 'theory' | 'practical' | 'templates'
  const [showTheoryAnswers, setShowTheoryAnswers] = useState(true);
  const [showPracticalSolution, setShowPracticalSolution] = useState(false);

  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiAward className="w-4 h-4" /> โมดูลที่ 5 (Module 5) · วันที่ 4 · สไลด์ 91–102 · สอบวัดผล &amp; UAT
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Software Testing (Unit / Integration / UAT) &amp; Day 4 Official Examination Center
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การรับประกันคุณภาพซอฟต์แวร์ (Software QA), การออกแบบ Test Cases และวิเคราะห์ค่าขอบเขต (Boundary Value Analysis), การตรวจรับงานโดยผู้ใช้จริง (UAT Showcase), พร้อมชุดข้อสอบจริงประจำวันที่ 4 ครบชุด (ข้อสอบทฤษฎี 32 ข้อ + ข้อสอบปฏิบัติ &ldquo;The Performance Update&rdquo; + เฉลยและเกณฑ์การให้คะแนน Rubric)
        </p>
      </div>

      {/* Quick Open Full 6-Tab Teaching Kit */}
      <TeachingKitQuickDrawer defaultTab="code" dayLabel="วันที่ 4 · สไลด์ 91–102 + ข้อสอบทฤษฎี/ปฏิบัติ & UAT" />

      {/* Complete Slide Deck Viewer for Module 5 (Slides 91-102 + Images + Speaker Script) */}
      <ModuleSlidesDeckViewer moduleId="m5" moduleLabel="โมดูลที่ 5 (วันที่ 4: สไลด์ 91–102)" />

      {/* Deep-Dive Theory (#rv-test, #rv-faq, #rv-quiz) */}
      <ModuleDeepTheorySection
        reviewIds={['rv-test', 'rv-faq', 'rv-quiz']}
        sectionTitle="เจาะลึก Software Testing &amp; UAT · คำถามที่ผู้เรียนมักถามบ่อย · และคำถามทบทวนผู้สอน 10 ข้อ"
      />

      {/* Code Examples 15 to 16 */}
      <ModuleCodeExamplesViewer
        moduleId="m5"
        title="ไฟล์ตัวอย่างโค้ด Error Handling (try/catch) &amp; Automated Testing (ไฟล์ 15–16)"
      />

      {/* Boundary Value Simulator */}
      <AutomatedTestCaseEvaluator />

      {/* COMPLETE DAY 4 OFFICIAL EXAM & UAT CENTER */}
      <section className="rounded-2xl border-2 border-amber-500/50 bg-slate-900/95 overflow-hidden shadow-2xl">
        <div className="p-5 sm:p-6 bg-gradient-to-r from-amber-950/90 via-orange-950/80 to-slate-900 border-b border-amber-500/40 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <span className="px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-mono text-xs font-black border border-amber-500/40">
              🏆 DAY 4 OFFICIAL EXAM &amp; UAT ARCHIVE (ครบทุกไฟล์ 100%)
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white mt-2 m-0">
              คลังข้อสอบวัดผลจริงประจำวันที่ 4 · เกณฑ์การตรวจให้คะแนน &amp; เอกสาร UAT
            </h2>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setExamTab('theory')}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                examTab === 'theory'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📝 1. ข้อสอบทฤษฎี (30 ปรนัย + 2 อัตนัย = 40 คะแนน)
            </button>
            <button
              type="button"
              onClick={() => setExamTab('practical')}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                examTab === 'practical'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              💻 2. ข้อสอบปฏิบัติ The Performance Update (60 คะแนน)
            </button>
            <button
              type="button"
              onClick={() => setExamTab('templates')}
              className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                examTab === 'templates'
                  ? 'bg-amber-500 text-slate-950 shadow-lg'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              📋 3. ใบตรวจรับงาน UAT Checklist &amp; Test Report
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-6">
          {examTab === 'theory' && (
            <div className="space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <h3 className="text-base font-black text-white m-0">
                    {ENTERPRISE_THEORY_EXAM.title} ({ENTERPRISE_THEORY_EXAM.duration} · {ENTERPRISE_THEORY_EXAM.totalMarks})
                  </h3>
                  <p className="text-xs text-slate-400 m-0 mt-1">
                    ตอนที่ 1: ปรนัย 4 ตัวเลือก จำนวน 30 ข้อ (30 คะแนน) · ตอนที่ 2: อัตนัยเขียนตอบ 2 ข้อ (10 คะแนน)
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTheoryAnswers(!showTheoryAnswers)}
                  className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                    showTheoryAnswers
                      ? 'bg-emerald-600 text-white'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  {showTheoryAnswers ? '🔑 ซ่อนเฉลยคำตอบ' : '🔑 แสดงเฉลยคำตอบทั้งหมด'}
                </button>
              </div>

              {/* 30 Multiple Choice Questions */}
              <div className="space-y-3 max-h-[800px] overflow-y-auto pr-1">
                {(ENTERPRISE_THEORY_EXAM.mcQuestions || []).map((q) => (
                  <div
                    key={q.n}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-white text-sm">
                        ข้อที่ {q.n}. {q.q}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
                        {q.clo} · {q.topic}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(q.choices || []).map((ch, cIdx) => {
                        const letter = ['A', 'B', 'C', 'D'][cIdx];
                        const isAns = showTheoryAnswers && letter === q.ans;
                        return (
                          <div
                            key={cIdx}
                            className={`p-2.5 rounded-lg border ${
                              isAns
                                ? 'bg-emerald-950/50 border-emerald-500/60 text-emerald-300 font-bold'
                                : 'bg-slate-900/70 border-slate-800 text-slate-300'
                            }`}
                          >
                            {letter}. {ch} {isAns && '✓ (คำตอบที่ถูก)'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {/* 2 Subjective Questions */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h4 className="text-base font-black text-amber-300 m-0">
                  ✍️ ตอนที่ 2: ข้อสอบอัตนัย (2 ข้อ · 10 คะแนน) พร้อมแนวคำตอบและเกณฑ์ให้คะแนน
                </h4>
                {(ENTERPRISE_THEORY_EXAM.subjectiveQuestions || []).map((sq) => (
                  <div
                    key={sq.n}
                    className="p-5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3 text-xs"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-black text-white">
                        ข้อเขียนที่ {sq.n}: {sq.title}
                      </span>
                      <span className="px-2.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold">
                        {sq.marks} · {sq.clo}
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed m-0">
                      <strong>โจทย์สถานการณ์:</strong> {sq.scenario}
                    </p>
                    <ul className="space-y-1 text-slate-200 list-disc list-inside">
                      {(sq.subQuestions || []).map((sub, idx) => (
                        <li key={idx}>{sub}</li>
                      ))}
                    </ul>
                    {showTheoryAnswers && (
                      <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/40 space-y-2">
                        <div className="font-black text-emerald-300">
                          🔑 แนวคำตอบและเกณฑ์การให้คะแนน (Grading Rubric):
                        </div>
                        <ul className="space-y-1 text-emerald-100 list-disc list-inside">
                          {(sq.answerGuide || []).map((ag, idx) => (
                            <li key={idx}>{ag}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {examTab === 'practical' && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <h3 className="text-lg font-black text-amber-300 m-0">
                  {ENTERPRISE_PRACTICAL_EXAM.title} ({ENTERPRISE_PRACTICAL_EXAM.duration} · {ENTERPRISE_PRACTICAL_EXAM.totalScore})
                </h3>
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
                  {ENTERPRISE_PRACTICAL_EXAM.scenario}
                </p>
              </div>

              {/* 6 Tasks & 7 Rubrics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-sm font-black text-cyan-300 m-0">
                    📌 ภารกิจสอบปฏิบัติ 6 ขั้นตอน (Tasks T1–T6)
                  </h4>
                  <div className="space-y-2 text-xs">
                    {(ENTERPRISE_PRACTICAL_EXAM.tasks || []).map((t) => (
                      <div key={t.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex justify-between font-bold text-white">
                          <span>
                            {t.id}: {t.title} ({t.file})
                          </span>
                          <span className="text-amber-300 font-mono">{t.time}</span>
                        </div>
                        <p className="text-slate-300 mt-1 m-0">{t.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <h4 className="text-sm font-black text-emerald-300 m-0">
                    📊 เกณฑ์การตรวจให้คะแนน 7 หมวด (Rubric R1–R7 รวม 60 คะแนน)
                  </h4>
                  <div className="space-y-2 text-xs">
                    {(ENTERPRISE_PRACTICAL_EXAM.rubric || []).map((r) => (
                      <div key={r.id} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="flex justify-between font-bold text-white">
                          <span>
                            {r.id}: {r.topic} ({r.clo})
                          </span>
                          <span className="text-emerald-300 font-mono">{r.full} คะแนน</span>
                        </div>
                        <p className="text-slate-400 mt-1 m-0">{r.passCriteria}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Expected Output Table for 5 Sample JSONs */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                <h4 className="text-sm font-black text-indigo-300 m-0">
                  🧪 ตารางผลลัพธ์ที่ถูกต้องเมื่อสลับไฟล์ JSON ทั้ง 5 กรณี (สำหรับผู้สอนใช้ตรวจงาน)
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="bg-slate-900 text-slate-300">
                      <tr>
                        <th className="p-2.5">ไฟล์ข้อมูลตัวอย่าง</th>
                        <th className="p-2.5">Target</th>
                        <th className="p-2.5">Actual</th>
                        <th className="p-2.5">Performance</th>
                        <th className="p-2.5">สถานะที่ต้องแสดง</th>
                        <th className="p-2.5">ปุ่มส่งแจ้งเตือน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 text-slate-200">
                      {(ENTERPRISE_PRACTICAL_EXAM.expectedSamples || []).map((row, idx) => (
                        <tr key={idx}>
                          {row.map((c, cIdx) => (
                            <td key={cIdx} className="p-2.5">
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Practical Starter vs Solution Files */}
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-sm font-black text-white m-0">
                    📂 โค้ดตั้งต้นสำหรับผู้เข้าสอบ (exam/practical/starter/) &amp; เฉลยผู้สอน (solution/)
                  </h4>
                  <button
                    type="button"
                    onClick={() => setShowPracticalSolution(!showPracticalSolution)}
                    className={`px-4 py-2 rounded-xl text-xs font-black cursor-pointer transition-all ${
                      showPracticalSolution
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-800 text-amber-300 border border-amber-500/40'
                    }`}
                  >
                    {showPracticalSolution
                      ? '🔑 กำลังแสดง: เฉลยข้อสอบปฏิบัติ (solution/)'
                      : '🔑 คลิกเพื่อเปิดดูเฉลยข้อสอบปฏิบัติ (solution/)'}
                  </button>
                </div>

                {!showPracticalSolution ? (
                  <div className="space-y-4">
                    {Object.entries(ENTERPRISE_PRACTICAL_EXAM.starterFiles || {}).map(
                      ([fname, content]) => (
                        <div key={fname}>
                          <div className="text-xs font-mono font-bold text-cyan-300 mb-1">
                            📄 exam/practical/starter/{fname}
                          </div>
                          <CodeBlock code={content} language={`starter/${fname}`} />
                        </div>
                      )
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(ENTERPRISE_PRACTICAL_EXAM.solutionFiles || {}).map(
                      ([fname, content]) => (
                        <div key={fname}>
                          <div className="text-xs font-mono font-bold text-emerald-300 mb-1">
                            ✅ exam/practical/solution/{fname}
                          </div>
                          <CodeBlock code={content} language={`solution/${fname}`} />
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {examTab === 'templates' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-sm font-black text-emerald-300 mb-2">
                  📋 1. แบบฟอร์มตรวจรับงานโดยผู้ใช้ (templates/uat-checklist.md)
                </h4>
                <CodeBlock
                  code={ENTERPRISE_TEMPLATES_DATA.uatChecklistMd}
                  language="templates/uat-checklist.md"
                />
              </div>

              <div>
                <h4 className="text-sm font-black text-cyan-300 mb-2">
                  📋 2. แบบฟอร์มบันทึกผลการทดสอบ Test Cases (templates/test-report.md)
                </h4>
                <CodeBlock
                  code={ENTERPRISE_TEMPLATES_DATA.testReportMd}
                  language="templates/test-report.md"
                />
              </div>

              <div>
                <h4 className="text-sm font-black text-purple-300 mb-2">
                  🧪 3. สคริปต์ทดสอบระบบอัตโนมัติ (templates/system-test-example.js)
                </h4>
                <CodeBlock
                  code={ENTERPRISE_TEMPLATES_DATA.systemTestExampleJs}
                  language="templates/system-test-example.js"
                />
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

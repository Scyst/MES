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
  FiSearch
} from 'react-icons/fi';
import { ENTERPRISE_APP_SPEAKER_NOTES } from '../enterpriseAppSpeakerNotes';

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
// MODULE 1: Enterprise System & Digital Industry Landscape (Day 1 - Morning)
// =========================================================================
export function EnterpriseAppMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-violet-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-violet-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-3 border border-violet-500/30">
          <FiLayers className="w-4 h-4" /> โมดูลที่ 1 (Module 1) · วันที่ 1 ภาคเช้า
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Enterprise System &amp; Digital Industry Landscape
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ทำความเข้าใจสถาปัตยกรรมระบบองค์กรดิจิทัล การหลอมรวมระหว่างเทคโนโลยีสารสนเทศ (IT) 
          และเทคโนโลยีปฏิบัติการหน้างาน (OT) เพื่อเชื่อมโยงข้อมูลจากเครื่องจักรสู่ผู้บริหารแบบ Real-time
        </p>
      </div>

      {/* Speaker Notes Drawer for Instructor */}
      <TrainerNotesDrawer dayFilter={1} defaultOpen={false} />

      {/* 1.1 Digital Transformation Overview */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-sm font-black border border-violet-500/40">1</span>
          1.1 การเปลี่ยนผ่านสู่องค์กรดิจิทัล (Digital Transformation in Industry 4.0)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ในยุคอุตสาหกรรม 4.0 องค์กรการผลิตไม่สามารถพึ่งพาวิธีการทำงานแบบเดิมที่ใช้กระดาษ (Paper-based) หรือไฟล์สเปรดชีต (Spreadsheet) 
          ที่ต้องรอคนป้อนข้อมูลท้ายกะได้อีกต่อไป เพราะทำให้ข้อมูลล่าช้า เกิดความผิดพลาดจากการป้อนข้อมูลซ้ำซ้อน (Data Redundancy) 
          และการตัดสินใจของผู้บริหารคลาดเคลื่อน
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="bg-rose-950/30 border border-rose-500/30 p-4 rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-rose-300 flex items-center gap-1.5">
              <FiAlertTriangle className="w-4 h-4" /> ระบบเดิม (Legacy Shop Floor)
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>จดบันทึกยอดผลิตและของเสียลงกระดาษหน้าเครื่อง</li>
              <li>ผู้จัดการทราบยอดการผลิตจริงในวันถัดไป (ล่าช้า 12-24 ชม.)</li>
              <li>ข้อมูลเครื่องจักรเสีย (Breakdown) ถูกบันทึกด้วยความจำ</li>
              <li>ขาดระบบตรวจสอบย้อนกลับ (Traceability) เมื่อลูกค้าเคลมของเสีย</li>
            </ul>
          </div>

          <div className="bg-emerald-950/30 border border-emerald-500/30 p-4 rounded-xl space-y-2">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center gap-1.5">
              <FiCheck className="w-4 h-4" /> ระบบดิจิทัล (Connected Smart Factory)
            </h3>
            <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
              <li>เซนเซอร์และแอปพลิเคชันบันทึกข้อมูลแบบ Real-time</li>
              <li>แสดงแดชบอร์ด OEE และสถานะเครื่องจักรขึ้นจอมือถือทันที</li>
              <li>ส่งสัญญาณแจ้งเตือน (Andon Alert) เข้ากลุ่มแชตเมื่อเครื่องหยุด</li>
              <li>มีประวัติการผลิตแบบครบวงจร (Audit Trail &amp; Traceability)</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 1.2 IT vs OT Convergence */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">2</span>
          1.2 การบรรจบกันของระบบ IT และ OT (IT &amp; OT Convergence)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          หัวใจสำคัญของการสร้าง Enterprise Application ในโรงงานคือการเข้าใจความแตกต่างระหว่างสองโลก:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-700 rounded-xl overflow-hidden">
            <thead className="bg-slate-800 text-slate-300 font-bold uppercase">
              <tr>
                <th className="p-3 border-b border-slate-700">เกณฑ์เปรียบเทียบ</th>
                <th className="p-3 border-b border-slate-700">Information Technology (IT)</th>
                <th className="p-3 border-b border-slate-700">Operational Technology (OT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-indigo-400">เป้าหมายหลัก</td>
                <td className="p-3">การจัดการข้อมูลธุรกิจ, บัญชี, วางแผนการผลิต (ERP)</td>
                <td className="p-3">ควบคุมเครื่องจักรทางกายภาพ, ความปลอดภัยหน้างาน</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-indigo-400">ลำดับความสำคัญ (Priority)</td>
                <td className="p-3">1. ความลับข้อมูล (Confidentiality) → 2. ความถูกต้อง</td>
                <td className="p-3">1. ความพร้อมใช้งาน (Availability 99.99%) → 2. ความปลอดภัย</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-indigo-400">เวลาตอบสนอง (Response Time)</td>
                <td className="p-3">วินาที หรือ นาที (Seconds to Minutes)</td>
                <td className="p-3">มิลลิวินาที (Sub-second / Milliseconds)</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-indigo-400">วงรอบการอัปเดตระบบ</td>
                <td className="p-3">อัปเดตได้บ่อย (Patching ทุกสัปดาห์/เดือน)</td>
                <td className="p-3">เครื่องจักรห้ามหยุด! อายุใช้งาน 10–20 ปี</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Simulator 1 Inserted Here */}
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
          <FiLayout className="w-4 h-4" /> โมดูลที่ 2 (Module 2) · วันที่ 1 ภาคบ่าย
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Industrial UX/UI &amp; Modern Layout Design (HTML5 &amp; Flexbox)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การออกแบบส่วนติดต่อผู้ใช้งาน (UI) และโครงสร้างเว็บมาตรฐาน (Semantic HTML5 &amp; Flexbox): 
          จัดหน้าระบบวัดไฟฟ้า (Electrical Meter) ให้แสดงผลได้อย่างสมบูรณ์แบบทั้งบนมือถือ แท็บเล็ต และจอโรงงาน
        </p>
      </div>

      {/* Speaker Notes Drawer for Instructor */}
      <TrainerNotesDrawer dayFilter={1} defaultOpen={false} />

      {/* 2.1 Semantic HTML Structure */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-pink-600/30 text-pink-400 flex items-center justify-center text-sm font-black border border-pink-500/40">1</span>
          2.1 โครงสร้าง Semantic HTML5 สำหรับระบบ Dashboard
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          หลีกเลี่ยงการใช้ <code>&lt;div&gt;</code> ครอบทุกอย่าง แต่ใช้แท็กที่มีความหมายเชิงโครงสร้างตามมาตรฐานสากล:
        </p>
        <ul className="text-xs text-slate-300 space-y-1.5 list-disc list-inside">
          <li><code>&lt;header&gt;</code> สำหรับส่วนหัวของหน้าจอ ระบุชื่อโรงงานและไลน์การผลิต</li>
          <li><code>&lt;main&gt;</code> ครอบพื้นที่แสดงข้อมูลหลักของการตรวจวัด</li>
          <li><code>&lt;section&gt;</code> หรือ <code>&lt;article&gt;</code> สำหรับการ์ดแสดงค่าแต่ละตัว (เช่น การ์ด Voltage, การ์ด Current)</li>
        </ul>
      </section>

      {/* Simulator 2: Industrial Flexbox Playground */}
      <IndustrialFlexboxSimulator />
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
          <FiCode className="w-4 h-4" /> โมดูลที่ 3 (Module 3) · วันที่ 2
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          JavaScript Programming Logic, DOM &amp; State Control
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ควบคุมตรรกะของแอปพลิเคชันด้วย JavaScript ES6+: ตัวแปร เงื่อนไข อาร์เรย์ อ็อบเจกต์ 
          การดักฟังเหตุการณ์ (Events) และการอัปเดตหน้าจอผ่าน DOM (Workshop 2)
        </p>
      </div>

      {/* Speaker Notes Drawer for Instructor */}
      <TrainerNotesDrawer dayFilter={2} defaultOpen={false} />

      {/* 3.1 JavaScript Core Logic */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">1</span>
          3.1 ตัวแปร เงื่อนไข และการประมวลผลข้อมูล
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-400">let vs const</h3>
            <p className="text-slate-300">
              ใช้ <code>const</code> เป็นค่าเริ่มต้นสำหรับค่าคงที่ เช่น พิกัดลิมิต <code>const MAX_VOLT = 240;</code> และใช้ <code>let</code> เมื่อค่านั้นต้องเปลี่ยนแปลงตามเซนเซอร์ เช่น <code>let currentVolt = 220;</code> ห้ามใช้ <code>var</code>
            </p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-400">Strict Equality (===)</h3>
            <p className="text-slate-300">
              ใช้ <code>===</code> เสมอเพื่อตรวจสอบทั้งค่าและชนิดข้อมูล เช่น <code>status === 'RUNNING'</code> เพื่อป้องกันข้อผิดพลาดทางตรรกะแบบ Silent Error
            </p>
          </div>
        </div>
      </section>

      {/* Simulator 3: Control Cabinet DOM Simulator */}
      <ControlCabinetDomSimulator />
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
          <FiActivity className="w-4 h-4" /> โมดูลที่ 4 (Module 4) · วันที่ 3
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Application Integration, REST APIs &amp; Webhook Automation
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การเชื่อมต่อระบบผ่าน RESTful APIs, การดึงข้อมูล Asynchronous (Fetch &amp; Async/Await), 
          การประมวลผล JSON, และการส่งแจ้งเตือนฉุกเฉินผ่าน Webhook (Workshop 3 &amp; 4)
        </p>
      </div>

      {/* Speaker Notes Drawer for Instructor */}
      <TrainerNotesDrawer dayFilter={3} defaultOpen={false} />

      {/* 4.1 RFC 9110 HTTP Methods */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          4.1 ภาษาที่ API ใช้คุยกัน: HTTP Methods ตามมาตรฐาน RFC 9110
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-700 rounded-xl overflow-hidden font-mono">
            <thead className="bg-slate-800 text-slate-300 font-bold uppercase">
              <tr>
                <th className="p-3 border-b border-slate-700">Method</th>
                <th className="p-3 border-b border-slate-700">ความหมาย / การใช้งาน</th>
                <th className="p-3 border-b border-slate-700">Safe?</th>
                <th className="p-3 border-b border-slate-700">Idempotent?</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-emerald-400">GET</td>
                <td className="p-3 font-sans">อ่านข้อมูลอย่างเดียว เช่น ดึงค่าน้ำ-ไฟ (/api/meter)</td>
                <td className="p-3 text-emerald-400">Yes (ไม่เปลี่ยนข้อมูล)</td>
                <td className="p-3 text-emerald-400">Yes</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-amber-400">POST</td>
                <td className="p-3 font-sans">ส่งข้อมูลใหม่ หรือยิงแจ้งเตือน Webhook (/api/notify)</td>
                <td className="p-3 text-rose-400">No (สร้างข้อมูลใหม่)</td>
                <td className="p-3 text-rose-400">No (กดซ้ำ ส่งเบิ้ล!)</td>
              </tr>
              <tr className="hover:bg-slate-800/40">
                <td className="p-3 font-bold text-sky-400">PUT / PATCH</td>
                <td className="p-3 font-sans">แก้ไขข้อมูล หรืออัปเดตสถานะเครื่องจักร</td>
                <td className="p-3 text-rose-400">No</td>
                <td className="p-3 text-emerald-400">Yes</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Simulator 4: Live REST API & JSON Tree */}
      <RestApiJsonTreeSimulator />

      {/* Simulator 5: Webhook Notification Sandbox */}
      <WebhookNotificationSimulator />
    </div>
  );
}

// =========================================================================
// MODULE 5: Software QA & Day 4 Formal Examination Center (Day 4)
// =========================================================================
export function EnterpriseAppMod5() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiAward className="w-4 h-4" /> โมดูลที่ 5 (Module 5) · วันที่ 4 ศูนย์สอบวัดผล &amp; UAT
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          Software QA Standards &amp; Formal Examination Center
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การออกแบบกรณีทดสอบ (Test Cases), การตรวจรับงานจริง (UAT Showcase), 
          และคู่มือระเบียบการสอบวัดผลประจำหลักสูตร (สอบทฤษฎี &amp; สอบปฏิบัติ The Performance Update)
        </p>
      </div>

      {/* Speaker Notes Drawer for Instructor */}
      <TrainerNotesDrawer dayFilter={4} defaultOpen={false} />

      {/* 5.1 QA & Boundary Value Analysis Simulator */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-orange-600/30 text-orange-400 flex items-center justify-center text-sm font-black border border-orange-500/40">1</span>
          5.1 การออกแบบกรณีทดสอบ (Test Case Design &amp; Boundary Value Analysis)
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed">
          ในซอฟต์แวร์ระดับองค์กร การทดสอบต้องครอบคลุมค่าขอบเขต (Boundary Cases) เช่น จุดตัด 85.0% และ 60.0% เสมอ:
        </p>

        <AutomatedTestCaseEvaluator />
      </section>

      {/* 5.2 Formal Day 4 Examination Protocol */}
      <section className="bg-slate-900/90 p-6 rounded-2xl border-2 border-amber-500/40 space-y-6 shadow-2xl">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <h2 className="text-xl font-black text-white flex items-center gap-2.5">
            <FiAward className="w-6 h-6 text-amber-400" />
            5.2 ระเบียบการสอบวัดผลจริงประจำวันที่ 4 (Day 4 Official Examination)
          </h2>
          <span className="text-xs bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full font-bold border border-amber-500/30">
            เกณฑ์ผ่าน: ทฤษฎี + ปฏิบัติ + UAT
          </span>
        </div>

        {/* Exam Schedule */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-bold text-amber-300 flex items-center justify-between">
              <span>📝 ช่วงเช้า (09:00 - 10:00 น.): สอบทฤษฎี</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[10px]">50 คะแนน</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              • เวลา 60 นาที (ปิดหนังสือ ปิดคอมพิวเตอร์)<br />
              • ข้อสอบปรนัย 30 ข้อ (30 คะแนน) + อัตนัย 2 ข้อ (20 คะแนน)<br />
              • ครอบคลุม: สถาปัตยกรรม IT/OT, HTML/CSS, JavaScript, JSON, API Methods, และ Software Testing
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="font-bold text-orange-300 flex items-center justify-between">
              <span>💻 ช่วงเช้า (10:00 - 12:00 น.): สอบปฏิบัติเดี่ยว</span>
              <span className="font-mono bg-slate-800 px-2 py-0.5 rounded text-[10px]">100 คะแนน</span>
            </div>
            <p className="text-slate-300 leading-relaxed">
              • โจทย์: <strong>"The Performance Update"</strong> (เวลา 120 นาที)<br />
              • พัฒนาหน้า Line Performance ต่อจากโฟลเดอร์ <code>starter</code><br />
              • ห้ามใช้ AI ช่วยเขียนโค้ด และห้ามปรึกษากัน (เปิดสไลด์และงานเก่าตัวเองได้)
            </p>
          </div>
        </div>

        {/* Practical Exam Tasks Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <FiList className="w-4 h-4 text-amber-400" /> รายละเอียดข้อสอบปฏิบัติ: The Performance Update (6 ภารกิจ)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
              <thead className="bg-slate-950 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3">รหัส</th>
                  <th className="p-3">ภารกิจที่ต้องทำ</th>
                  <th className="p-3">เวลาที่แนะนำ</th>
                  <th className="p-3">ไฟล์ที่เกี่ยวข้อง</th>
                  <th className="p-3">สาระสำคัญในการตรวจ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80 bg-slate-950/40 text-slate-300">
                <tr>
                  <td className="p-3 font-mono font-bold text-amber-400">T1</td>
                  <td className="p-3 font-bold text-white">จัดหน้าจอ Dashboard</td>
                  <td className="p-3 font-mono">20 นาที</td>
                  <td className="p-3 font-mono text-slate-400">style.css</td>
                  <td className="p-3">การ์ด 4 ใบเรียง Flexbox ตัดบรรทัดเมื่อจอแคบ ตัวเลขเด่นอ่านได้ใน 5 วินาที</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-amber-400">T2</td>
                  <td className="p-3 font-bold text-white">ดึงข้อมูลด้วย fetch</td>
                  <td className="p-3 font-mono">20 นาที</td>
                  <td className="p-3 font-mono text-slate-400">loadPerformance()</td>
                  <td className="p-3">ใช้ async/await อ่าน DATA_URL ตรวจ res.ok แสดงชื่อไลน์ กะ และตัวเลขลงการ์ด</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-amber-400">T3</td>
                  <td className="p-3 font-bold text-white">คำนวณ Performance และสถานะ</td>
                  <td className="p-3 font-mono">20 นาที</td>
                  <td className="p-3 font-mono text-slate-400">calcPerformance()</td>
                  <td className="p-3">actual ÷ target × 100 ปัดทศนิยม 1 ตำแหน่ง ตัดสินสถานะ ปกติ/เฝ้าระวัง/ต่ำกว่าเป้า</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-amber-400">T4</td>
                  <td className="p-3 font-bold text-white">อัปเดตอัตโนมัติ (Polling)</td>
                  <td className="p-3 font-mono">10 นาที</td>
                  <td className="p-3 font-mono text-slate-400">setInterval()</td>
                  <td className="p-3">โหลดใหม่ทุก 10 วินาที แสดงเวลาอัปเดตล่าสุด ไม่มี timer ซ้อนกัน</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-amber-400">T5</td>
                  <td className="p-3 font-bold text-white">แจ้งเตือนผ่าน Webhook</td>
                  <td className="p-3 font-mono">25 นาที</td>
                  <td className="p-3 font-mono text-slate-400">sendAlert()</td>
                  <td className="p-3">กดได้เฉพาะเมื่อต่ำกว่าเป้า ส่ง POST พร้อม message ที่มีตัวเลขจริง ป้องกันการกดซ้ำ</td>
                </tr>
                <tr>
                  <td className="p-3 font-mono font-bold text-amber-400">T6</td>
                  <td className="p-3 font-bold text-white">เขียนและทดสอบ Test Case</td>
                  <td className="p-3 font-mono">20 นาที</td>
                  <td className="p-3 font-mono text-slate-400">ใบ Test Case</td>
                  <td className="p-3">เขียน Test Case 5 กรณี ทดสอบจริงกับไฟล์ samples และบันทึกผล Pass/Fail</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* 5.3 Peer UAT Showcase Protocol */}
        <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
          <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
            <FiUserCheck className="w-4 h-4" /> กิจกรรมช่วงบ่าย (13:00 - 15:00 น.): UAT Showcase &amp; Peer Sign-Off
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed m-0">
            นักเรียนจะจับคู่สลับเครื่องกันทำหน้าที่เป็น <strong>"ผู้ตรวจรับงานจริง (UAT Inspector)"</strong> โดยเปิดดูหน้าจอของเพื่อนและทดสอบตามแบบฟอร์ม <code>uat-checklist.md</code>:
          </p>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>ทดสอบเปิดหน้าจอผ่าน Live Server (ย่อหน้าต่างดูว่า Responsive หรือไม่)</li>
            <li>ทดลองเปลี่ยนไฟล์ <code>data/samples</code> (ทดสอบกรณีปกติ, เฝ้าระวัง, และต่ำกว่าเป้า)</li>
            <li>กดปุ่มส่งแจ้งเตือน Webhook และตรวจดูข้อความในห้องเรียน</li>
            <li>ลงชื่อยอมรับ (Accept) หรือแจ้งแก้ไข (Decline) ในใบตรวจรับงาน</li>
          </ul>
        </div>
      </section>
    </div>
  );
}

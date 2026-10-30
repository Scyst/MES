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
  FiUserCheck,
  FiCheckCircle,
  FiXCircle,
  FiSearch,
  FiExternalLink,
  FiMaximize2,
  FiBox,
  FiGrid
} from 'react-icons/fi';
import {
  ENTERPRISE_WORKSHOPS_DATA,
  ENTERPRISE_TEMPLATES_DATA,
  ENTERPRISE_THEORY_EXAM,
  ENTERPRISE_PRACTICAL_EXAM
} from '../enterpriseAppFullData';

// Reusable Code Block with copy button
function CodeBlock({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-xl overflow-hidden my-3 border border-slate-700 bg-slate-950/90 font-mono text-xs md:text-sm shadow-xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900 border-b border-slate-800 text-slate-400">
        <span className="flex items-center gap-1.5 uppercase font-bold text-[11px] text-fuchsia-400">
          <FiTerminal className="w-3.5 h-3.5" /> {language}
        </span>
        <button 
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] hover:text-white transition-colors bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-0.5 rounded cursor-pointer"
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

// Industrial Diagram & Architecture Card (for embedded slide diagrams)
function IndustrialDiagramCard({ imgSrc, title, subtitle, caption, badge = 'ARCHITECTURE DIAGRAM' }) {
  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <>
      <div className="rounded-2xl border border-slate-700/80 bg-slate-950 overflow-hidden shadow-lg hover:border-indigo-500/50 transition-all group">
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              {badge}
            </span>
            <span className="text-xs font-bold text-white truncate">{title}</span>
          </div>
          <button
            onClick={() => setIsZoomed(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white cursor-pointer transition-colors"
            title="คลิกเพื่อขยายภาพขนาดใหญ่"
          >
            <FiMaximize2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div 
          onClick={() => setIsZoomed(true)}
          className="p-3 flex items-center justify-center bg-slate-900/40 cursor-pointer min-h-[160px] max-h-[300px] overflow-hidden"
        >
          <img 
            src={imgSrc} 
            alt={title}
            className="max-h-[260px] w-auto object-contain rounded-lg group-hover:scale-[1.02] transition-transform duration-300"
            loading="lazy"
          />
        </div>

        {(caption || subtitle) && (
          <div className="p-3 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-300 leading-relaxed">
            {subtitle && <strong className="text-indigo-300 block mb-0.5">{subtitle}</strong>}
            {caption}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {isZoomed && (
        <div 
          onClick={() => setIsZoomed(false)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md cursor-zoom-out"
        >
          <div className="relative max-w-5xl max-h-[90vh] bg-slate-950 p-4 rounded-3xl border border-indigo-500/40 shadow-2xl flex flex-col items-center">
            <div className="w-full flex items-center justify-between pb-3 border-b border-slate-800 text-xs">
              <span className="font-bold text-white text-sm">{title}</span>
              <span className="text-slate-400">คลิกที่ใดก็ได้เพื่อปิด</span>
            </div>
            <img 
              src={imgSrc} 
              alt={title} 
              className="max-h-[75vh] w-auto object-contain my-3 rounded-xl"
            />
            {caption && <p className="text-xs text-slate-300 text-center m-0 max-w-2xl">{caption}</p>}
          </div>
        </div>
      )}
    </>
  );
}

// =========================================================================
// INTERACTIVE COMPANION 1: ISA-95 5-Level Architecture & Live Data Uplink
// =========================================================================
export function Isa95PyramidExplorer() {
  const { isDark } = useTheme();
  const [selectedLevel, setSelectedLevel] = useState(2);
  const [uplinkActive, setUplinkActive] = useState(false);
  const [uplinkStep, setUplinkStep] = useState(null);

  const levels = [
    {
      level: 4,
      name: 'Level 4: Business Planning & Logistics (ERP)',
      tech: 'SAP S/4HANA, Oracle ERP, REST API, SQL Server',
      speed: 'ชั่วโมง / วัน / เดือน',
      role: 'วางแผนทรัพยากรองค์กร, คำนวณต้นทุนผลิต, บัญชีการเงิน, การสั่งซื้อวัตถุดิบ และยอดส่งมอบสินค้าลูกค้า',
      color: 'from-purple-600 to-indigo-600',
      badge: 'IT WORLD (ERP)'
    },
    {
      level: 3,
      name: 'Level 3: Manufacturing Operations Management (MES / MOM)',
      tech: 'MES Web Application, React/Vite, Node-RED, MQTT Gateway, SQL Server',
      speed: 'วินาที / นาที / กะการผลิต (Shift)',
      role: 'ติดตามแผนผลิตตามใบสั่งงาน (Job Order), ตรวจสอบย้อนกลับ (Traceability), คำนวณ OEE และควบคุมสูตรการผลิต',
      color: 'from-blue-600 to-cyan-600',
      badge: 'MES / IT-OT BRIDGE'
    },
    {
      level: 2,
      name: 'Level 2: Supervisory Control (SCADA & Industrial HMI)',
      tech: 'SCADA (Ignition, WinCC), HMI Touch Panels (Pro-face, Siemens), Modbus TCP, OPC-UA',
      speed: 'วินาที (Seconds)',
      role: 'แสดงสถานะเครื่องจักรหน้าไลน์, หน้าจอ HMI ให้ช่างและพนักงานกดสั่งงาน, เฝ้าระวังเตือนภัย (Alarming)',
      color: 'from-teal-600 to-emerald-600',
      badge: 'OT SUPERVISORY'
    },
    {
      level: 1,
      name: 'Level 1: Direct Control (PLC, PAC & Robot Controllers)',
      tech: 'PLC (Siemens S7-1500, Mitsubishi iQ-R, Omron NX), Motion Controllers',
      speed: 'มิลลิวินาที (10–100 ms Hard Real-Time)',
      role: 'ลอจิกควบคุมการทำงานอัตโนมัติของเครื่องจักรโดยตรง ตัดสินใจและตัดตอนเพื่อความปลอดภัย ห้ามหยุดชะงักเด็ดขาด',
      color: 'from-amber-600 to-orange-600',
      badge: 'OT CONTROL'
    },
    {
      level: 0,
      name: 'Level 0: Production Process (Sensors, Motors & Actuators)',
      tech: 'Photoelectric Sensors, Thermocouples, Inverters, Pneumatic Valves, 4-20mA, IO-Link',
      speed: 'ไมโครวินาที (Continuous Physical Process)',
      role: 'ตรวจวัดสถานะทางกายภาพจริง (อุณหภูมิ, แรงดัน, โหลดเซลล์) และขับเคลื่อนกลไกการผลิตทางกลไก',
      color: 'from-rose-600 to-red-600',
      badge: 'PHYSICAL PROCESS'
    }
  ];

  const handleSimulateUplink = () => {
    if (uplinkActive) return;
    setUplinkActive(true);
    setUplinkStep(0);
    const timers = [
      setTimeout(() => setUplinkStep(1), 600),
      setTimeout(() => setUplinkStep(2), 1200),
      setTimeout(() => setUplinkStep(3), 1800),
      setTimeout(() => setUplinkStep(4), 2400),
      setTimeout(() => {
        setUplinkActive(false);
        setUplinkStep(null);
      }, 3400)
    ];
  };

  const current = levels.find(l => l.level === selectedLevel) || levels[2];

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            INTERACTIVE AID #1 · ISA-95 (IEC 62264)
          </span>
          <h3 className={`text-base sm:text-lg font-black mt-1 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            พีระมิดสถาปัตยกรรมระบบอุตสาหกรรม 5 ระดับ (ISA-95 Interactive Pyramid)
          </h3>
        </div>

        <button
          onClick={handleSimulateUplink}
          disabled={uplinkActive}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md flex items-center gap-1.5 cursor-pointer transition-all ${
            uplinkActive
              ? 'bg-amber-600 text-white animate-pulse'
              : 'bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white'
          }`}
        >
          <FiZap /> {uplinkActive ? `กำลังส่งข้อมูลสู่ Level ${uplinkStep}...` : 'จำลองข้อมูลเซนเซอร์วิ่งสู่ ERP'}
        </button>
      </div>

      {/* Interactive Pyramid Layers */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Visual Pyramid Stack */}
        <div className="lg:col-span-7 space-y-2">
          {levels.map((lvl) => {
            const isSelected = selectedLevel === lvl.level;
            const isUplinkCurrent = uplinkStep === lvl.level;
            return (
              <button
                key={lvl.level}
                onClick={() => setSelectedLevel(lvl.level)}
                className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isSelected
                    ? 'ring-2 ring-indigo-400 border-transparent bg-slate-950 shadow-lg scale-[1.01]'
                    : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                } ${isUplinkCurrent ? 'ring-4 ring-amber-400 bg-amber-950/40' : ''}`}
              >
                <div className="flex items-center gap-2.5">
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center font-mono font-black text-xs text-white bg-gradient-to-br ${lvl.color}`}>
                    L{lvl.level}
                  </span>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <span>{lvl.name.split(':')[1] || lvl.name}</span>
                      {isUplinkCurrent && (
                        <span className="px-1.5 py-0.2 rounded bg-amber-500 text-slate-950 text-[10px] font-black animate-bounce">
                          DATA UPLINK!
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ความเร็ว: {lvl.speed}
                    </span>
                  </div>
                </div>

                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold border ${
                  isSelected
                    ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    : 'bg-slate-900 text-slate-400 border-slate-800'
                }`}>
                  {lvl.badge}
                </span>
              </button>
            );
          })}
        </div>

        {/* Level Detail Card */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-300 uppercase tracking-wider font-mono">
              ข้อมูลเจาะลึก Level {current.level}
            </span>
            <span className="font-mono text-[11px] text-slate-400">
              เวลาตอบสนอง: {current.speed}
            </span>
          </div>

          <div className="space-y-1">
            <strong className="text-white block font-bold text-sm">{current.name}</strong>
            <p className="text-slate-300 leading-relaxed m-0">{current.role}</p>
          </div>

          <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
            <span className="text-[11px] text-cyan-400 font-bold block">ฮาร์ดแวร์ &amp; โปรโตคอลหลัก:</span>
            <span className="font-mono text-slate-300 text-[11px]">{current.tech}</span>
          </div>

          <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-[11px] leading-relaxed">
            💡 <strong>บทบาทในหลักสูตรนี้:</strong> เรากำลังสร้างเว็บแอปพลิเคชันในระดับ <strong>Level 3 (MES)</strong> เพื่อดึงข้อมูลเซนเซอร์จาก Level 1/2 มาแสดงผลแดชบอร์ดให้พนักงาน และส่งข้อมูลสรุปผลยอดผลิตขึ้นสู่ Level 4 (ERP)
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// INTERACTIVE COMPANION 2: Industrial HMI Color & Gloved Touch Validator
// =========================================================================
export function IndustrialHmiValidatorSimulator() {
  const { isDark } = useTheme();
  const [uiMode, setUiMode] = useState('STANDARD'); // 'STANDARD' | 'BAD_RAINBOW'
  const [gloveMode, setGloveMode] = useState(true);
  const [feedback, setFeedback] = useState(null);
  const [stats, setStats] = useState({ success: 0, misclick: 0 });

  const handleButtonClick = (actionName, targetSize) => {
    if (gloveMode && targetSize < 44) {
      const isMisclick = Math.random() < 0.75;
      if (isMisclick) {
        setFeedback({
          type: 'error',
          text: `❌ MISCLICK DETECTED! พนักงานสวมถุงมือกดปุ่ม "${actionName}" พลาดไปโดนพื้นที่ข้างเคียง เนื่องจากปุ่มมีขนาดเพียง ${targetSize}px (ต่ำกว่าเกณฑ์มาตรฐาน 44px ตาม WCAG 2.2)`
        });
        setStats(prev => ({ ...prev, misclick: prev.misclick + 1 }));
        return;
      }
    }
    setFeedback({
      type: 'success',
      text: `✅ TOUCH SUCCESS! ตรวจจับการกด "${actionName}" แม่นยำ 100% (Hitbox ${targetSize}px รองรับนิ้วมือสวมถุงมือตาม IEC 60204-1 / ISO 9241)`
    });
    setStats(prev => ({ ...prev, success: prev.success + 1 }));
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-pink-500/20 text-pink-300 border border-pink-500/30">
            INTERACTIVE AID #2 · IEC 60204-1 &amp; ISA-101
          </span>
          <h3 className={`text-base sm:text-lg font-black mt-1 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ห้องแล็บทดสอบ Industrial UX/UI (มาตรฐานสีโรงงาน &amp; ปุ่มสวมถุงมือ)
          </h3>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setUiMode('STANDARD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              uiMode === 'STANDARD'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ✅ มาตรฐาน IEC (Good UI)
          </button>
          <button
            onClick={() => setUiMode('BAD_RAINBOW')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition-all ${
              uiMode === 'BAD_RAINBOW'
                ? 'bg-rose-600 text-white shadow-md'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            ❌ สีรุ้งแสบตา/ปุ่มเล็ก (Bad UI)
          </button>
          <button
            onClick={() => setGloveMode(!gloveMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border cursor-pointer transition-all ${
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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className={`p-3 rounded-xl border ${
            uiMode === 'STANDARD' 
              ? 'bg-slate-900 border-slate-800 text-slate-200' 
              : 'bg-green-600 border-white text-white'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Motor Voltage</span>
            <div className="text-2xl font-black font-mono">231.4 V</div>
            <span className="text-[10px] text-emerald-400 font-bold">● ปกติ (Nominal Range)</span>
          </div>

          <div className={`p-3 rounded-xl border ${
            uiMode === 'STANDARD' 
              ? 'bg-slate-900 border-slate-800 text-slate-200' 
              : 'bg-blue-600 border-yellow-300 text-yellow-200'
          }`}>
            <span className="text-[10px] uppercase font-bold tracking-wider opacity-75">Motor Current</span>
            <div className="text-2xl font-black font-mono">15.6 A</div>
            <span className="text-[10px] text-emerald-400 font-bold">● โหลดปกติ</span>
          </div>

          <div className={`p-3 rounded-xl border ${
            uiMode === 'STANDARD' 
              ? 'bg-slate-900 border-slate-800 text-slate-200' 
              : 'bg-red-600 border-white text-white'
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
            <span className="text-amber-400 font-mono">
              {uiMode === 'STANDARD' ? 'Hitbox: 52×52px (Safe Target)' : 'Hitbox: 24×24px (Dangerous Cluster)'}
            </span>
          </div>

          <div className={`flex flex-wrap items-center gap-3 ${uiMode === 'STANDARD' ? '' : 'justify-center gap-1'}`}>
            {uiMode === 'STANDARD' ? (
              <>
                <button
                  onClick={() => handleButtonClick('START CYCLE', 52)}
                  className="min-h-[52px] min-w-[120px] px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <FiPlay className="w-5 h-5" /> START
                </button>
                <button
                  onClick={() => handleButtonClick('NORMAL STOP', 52)}
                  className="min-h-[52px] min-w-[120px] px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <FiSquare className="w-5 h-5" /> STOP
                </button>
                <button
                  onClick={() => handleButtonClick('ACKNOWLEDGE ALARM', 52)}
                  className="min-h-[52px] min-w-[140px] px-5 py-3 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  <FiBell className="w-5 h-5" /> ACK ALARM
                </button>
                <button
                  onClick={() => handleButtonClick('EMERGENCY STOP (E-STOP)', 56)}
                  className="min-h-[56px] min-w-[150px] px-6 py-3 rounded-xl bg-rose-700 hover:bg-rose-600 text-white font-black text-sm border-2 border-yellow-400 shadow-xl flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  🚨 E-STOP
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => handleButtonClick('START', 24)}
                  className="h-6 px-2 text-[10px] bg-green-500 text-black border border-black rounded cursor-pointer"
                >
                  Start
                </button>
                <button
                  onClick={() => handleButtonClick('STOP', 24)}
                  className="h-6 px-2 text-[10px] bg-red-500 text-white border border-black rounded cursor-pointer"
                >
                  Stop
                </button>
                <button
                  onClick={() => handleButtonClick('RESET', 24)}
                  className="h-6 px-2 text-[10px] bg-yellow-500 text-black border border-black rounded cursor-pointer"
                >
                  Reset
                </button>
                <button
                  onClick={() => handleButtonClick('E-STOP', 24)}
                  className="h-6 px-2 text-[10px] bg-fuchsia-600 text-white border border-black rounded font-bold cursor-pointer"
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
        <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-center gap-2.5 ${
          feedback.type === 'success' 
            ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200' 
            : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
        }`}>
          {feedback.type === 'success' ? <FiCheckCircle className="w-5 h-5 shrink-0 text-emerald-400" /> : <FiAlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />}
          <span>{feedback.text}</span>
        </div>
      )}
    </div>
  );
}

// =========================================================================
// INTERACTIVE COMPANION 3: JSON Interactive Syntax & Path Explorer
// =========================================================================
export function JsonPathInteractiveExplorer() {
  const { isDark } = useTheme();
  const [selectedKey, setSelectedKey] = useState('metrics.voltage');

  const keyMap = {
    'machineId': { js: 'data.machineId', val: '"MC-01"', desc: 'รหัสเครื่องจักร (String)' },
    'line': { js: 'data.line', val: '"Line A"', desc: 'ไลน์การผลิต (String)' },
    'status': { js: 'data.status', val: '"RUNNING"', desc: 'สถานะเครื่องจักร (String)' },
    'metrics.voltage': { js: 'data.metrics.voltage', val: '231.4', desc: 'แรงดันไฟฟ้า (Number)' },
    'metrics.current': { js: 'data.metrics.current', val: '15.6', desc: 'กระแสไฟฟ้า (Number)' },
    'metrics.powerKw': { js: 'data.metrics.powerKw', val: '3.61', desc: 'กำลังไฟฟ้ากิโลวัตต์ (Number)' },
    'alarms[0].code': { js: 'data.alarms[0].code', val: '"TEMP_WARN"', desc: 'รหัสแจ้งเตือนตัวแรกในอาร์เรย์ (Array Index [0])' }
  };

  const currentInfo = keyMap[selectedKey] || keyMap['metrics.voltage'];

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            INTERACTIVE AID #3 · RFC 8259
          </span>
          <h3 className={`text-base sm:text-lg font-black mt-1 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            เครื่องมือฝึกอ่านและดึงค่า JSON (JSON Path &amp; Dot Notation Explorer)
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          คลิกที่คีย์ต่างๆ เพื่อดูคำสั่ง JavaScript ที่ใช้ดึงค่าไปแสดงผล
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Clickable JSON Tree */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs leading-relaxed overflow-x-auto text-slate-300">
          <div>&#123;</div>
          <div className="pl-4">
            <button onClick={() => setSelectedKey('machineId')} className={`cursor-pointer hover:underline ${selectedKey === 'machineId' ? 'text-cyan-400 font-bold bg-cyan-950/40 px-1 rounded' : 'text-fuchsia-400'}`}>"machineId"</button>: <span className="text-emerald-300">"MC-01"</span>,
          </div>
          <div className="pl-4">
            <button onClick={() => setSelectedKey('line')} className={`cursor-pointer hover:underline ${selectedKey === 'line' ? 'text-cyan-400 font-bold bg-cyan-950/40 px-1 rounded' : 'text-fuchsia-400'}`}>"line"</button>: <span className="text-emerald-300">"Line A"</span>,
          </div>
          <div className="pl-4">
            <button onClick={() => setSelectedKey('status')} className={`cursor-pointer hover:underline ${selectedKey === 'status' ? 'text-cyan-400 font-bold bg-cyan-950/40 px-1 rounded' : 'text-fuchsia-400'}`}>"status"</button>: <span className="text-emerald-300">"RUNNING"</span>,
          </div>
          <div className="pl-4 text-amber-300">"metrics": &#123;</div>
          <div className="pl-8">
            <button onClick={() => setSelectedKey('metrics.voltage')} className={`cursor-pointer hover:underline ${selectedKey === 'metrics.voltage' ? 'text-cyan-400 font-bold bg-cyan-950/40 px-1 rounded' : 'text-fuchsia-400'}`}>"voltage"</button>: <span className="text-amber-300 font-bold">231.4</span>,
          </div>
          <div className="pl-8">
            <button onClick={() => setSelectedKey('metrics.current')} className={`cursor-pointer hover:underline ${selectedKey === 'metrics.current' ? 'text-cyan-400 font-bold bg-cyan-950/40 px-1 rounded' : 'text-fuchsia-400'}`}>"current"</button>: <span className="text-amber-300 font-bold">15.6</span>,
          </div>
          <div className="pl-8">
            <button onClick={() => setSelectedKey('metrics.powerKw')} className={`cursor-pointer hover:underline ${selectedKey === 'metrics.powerKw' ? 'text-cyan-400 font-bold bg-cyan-950/40 px-1 rounded' : 'text-fuchsia-400'}`}>"powerKw"</button>: <span className="text-amber-300 font-bold">3.61</span>
          </div>
          <div className="pl-4 text-amber-300">&#125;,</div>
          <div className="pl-4 text-indigo-300">"alarms": [</div>
          <div className="pl-8">&#123;</div>
          <div className="pl-12">
            <button onClick={() => setSelectedKey('alarms[0].code')} className={`cursor-pointer hover:underline ${selectedKey === 'alarms[0].code' ? 'text-cyan-400 font-bold bg-cyan-950/40 px-1 rounded' : 'text-fuchsia-400'}`}>"code"</button>: <span className="text-emerald-300">"TEMP_WARN"</span>
          </div>
          <div className="pl-8">&#125;</div>
          <div className="pl-4 text-indigo-300">]</div>
          <div>&#125;</div>
        </div>

        {/* Live Evaluator Output */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4 text-xs">
          <div className="space-y-1">
            <span className="text-[11px] text-slate-400 font-mono">คำสั่ง JavaScript ที่ใช้เข้าถึงค่า:</span>
            <div className="p-3 rounded-lg bg-slate-900 border border-cyan-500/40 font-mono text-cyan-300 font-bold text-sm">
              const value = {currentInfo.js};
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-900/60 border border-slate-800 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-400">ค่าที่ได้ (Value):</span>
              <span className="font-mono text-emerald-400 font-bold">{currentInfo.val}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">ชนิดข้อมูล:</span>
              <span className="text-slate-300">{currentInfo.desc}</span>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-amber-200 text-[11px] leading-relaxed">
            ⚠️ <strong>กฎเหล็ก RFC 8259:</strong> ในไฟล์ JSON ชื่อคีย์ (Key) และข้อความต้องอยู่ในเครื่องหมายคำพูดคู่ (<code>"..."</code>) เท่านั้น ห้ามใช้ single quote (<code>'...'</code>) หรือละเว้นเครื่องหมายคำพูดเด็ดขาด
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// INTERACTIVE COMPANION 4: Industrial Flexbox Layout Playground (Workshop 1)
// =========================================================================
export function IndustrialFlexboxSimulator() {
  const { isDark } = useTheme();
  const [viewport, setViewport] = useState('DESKTOP');
  const [flexWrap, setFlexWrap] = useState('wrap');
  const [flexDirection, setFlexDirection] = useState('row');
  const [gap, setGap] = useState(16);
  const [cardMinWidth, setCardMinWidth] = useState(240);

  const viewportWidthClass = {
    MOBILE: 'max-w-[375px]',
    TABLET: 'max-w-[768px]',
    DESKTOP: 'w-full'
  }[viewport];

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
            INTERACTIVE AID #4 · WORKSHOP 1 ENGINE
          </span>
          <h3 className={`text-base sm:text-lg font-black mt-1 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ห้องแล็บจำลอง Flexbox Dashboard (ทดสอบตัดบรรทัดบนมือถือ vs จอโรงงาน)
          </h3>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setViewport('MOBILE')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
              viewport === 'MOBILE' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FiSmartphone className="w-3.5 h-3.5" /> มือถือ (375px)
          </button>
          <button
            onClick={() => setViewport('TABLET')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
              viewport === 'TABLET' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            <FiMonitor className="w-3.5 h-3.5" /> แท็บเล็ต (768px)
          </button>
          <button
            onClick={() => setViewport('DESKTOP')}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-all flex items-center gap-1 ${
              viewport === 'DESKTOP' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            🖥️ จอโรงงาน
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
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
              className={`flex-1 py-1 rounded font-mono font-bold text-xs cursor-pointer ${
                flexWrap === 'wrap' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              wrap
            </button>
            <button
              onClick={() => setFlexWrap('nowrap')}
              className={`flex-1 py-1 rounded font-mono font-bold text-xs cursor-pointer ${
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
              className={`flex-1 py-1 rounded font-mono font-bold text-xs cursor-pointer ${
                flexDirection === 'row' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              row
            </button>
            <button
              onClick={() => setFlexDirection('column')}
              className={`flex-1 py-1 rounded font-mono font-bold text-xs cursor-pointer ${
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

          <div 
            className="p-4 rounded-xl border border-slate-800 bg-slate-900/90 transition-all"
            style={{
              display: 'flex',
              flexDirection: flexDirection,
              flexWrap: flexWrap,
              gap: `${gap}px`
            }}
          >
            {['Voltage (231.4 V)', 'Current (15.6 A)', 'Power (3.61 kW)', 'Frequency (50.0 Hz)'].map((title, idx) => (
              <div 
                key={idx}
                className="p-4 rounded-xl bg-slate-950 border border-slate-800 shadow-md transition-all flex flex-col justify-between"
                style={{ flex: `1 1 ${cardMinWidth}px` }}
              >
                <span className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">{title.split(' ')[0]}</span>
                <div className="text-2xl font-black font-mono text-cyan-400 my-2">{title.split('(')[1]?.replace(')', '')}</div>
                <div className="text-[10px] text-emerald-400 font-mono">● Active Sensor</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// INTERACTIVE COMPANION 5: Smart Control Cabinet DOM State Machine (Workshop 2)
// =========================================================================
export function ControlCabinetDomSimulator() {
  const { isDark } = useTheme();
  const [isRunning, setIsRunning] = useState(false);
  const [voltage, setVoltage] = useState(220);
  const [lastDomCode, setLastDomCode] = useState('// เริ่มต้นระบบ: รอรับคำสั่งจากผู้ใช้');

  const isOvervoltage = voltage > 240;

  const handleStart = () => {
    setIsRunning(true);
    setLastDomCode(
      `// สั่งเปิดเครื่อง:\\nconst statusBadge = document.getElementById("status-badge");\\nstatusBadge.textContent = "RUNNING";\\nstatusBadge.classList.replace("bg-slate-800", "bg-emerald-600");`
    );
  };

  const handleStop = () => {
    setIsRunning(false);
    setLastDomCode(
      `// สั่งหยุดเครื่อง:\\nconst statusBadge = document.getElementById("status-badge");\\nstatusBadge.textContent = "STOPPED";\\nstatusBadge.classList.replace("bg-emerald-600", "bg-slate-800");`
    );
  };

  const handleVoltChange = (newV) => {
    setVoltage(newV);
    if (newV > 240) {
      setLastDomCode(
        `// ตรวจพบแรงดันเกิน (>240V!):\\nif (voltage > 240) {\\n  alarmLight.classList.add("bg-rose-600", "animate-ping");\\n  alertBox.textContent = "ALARM: Overvoltage detected!";\\n}`
      );
    } else {
      setLastDomCode(
        `// ปรับแรงดันปกติ:\\nvoltDisplay.textContent = "${newV} V";`
      );
    }
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-blue-500/20 text-blue-300 border border-blue-500/30">
            INTERACTIVE AID #5 · WORKSHOP 2 ENGINE
          </span>
          <h3 className={`text-base sm:text-lg font-black mt-1 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ตู้ควบคุมไฟฟ้าจำลอง &amp; การควบคุม DOM (Control Cabinet &amp; DOM State)
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          ทดลองกด Start/Stop และเลื่อนแรงดันเพื่อดูคำสั่ง DOM ที่เบื้องหลังทำงาน
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Physical Cabinet UI */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span className="font-mono text-xs font-bold text-slate-300">ตู้ควบคุมไฟ MAIN-CB-01</span>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded text-xs font-mono font-black ${
                isRunning ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {isRunning ? 'RUNNING' : 'STOPPED'}
              </span>
              <span className={`w-3.5 h-3.5 rounded-full ${
                isOvervoltage ? 'bg-rose-500 animate-ping' : 'bg-slate-700'
              }`} title={isOvervoltage ? 'Overvoltage Alarm!' : 'Normal'}></span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">แรงดันไฟฟ้า (Voltage)</span>
              <div className={`text-3xl font-black font-mono ${isOvervoltage ? 'text-rose-400 animate-pulse' : 'text-cyan-400'}`}>
                {voltage} V
              </div>
              <span className="text-[10px] text-slate-400 font-mono">
                {isOvervoltage ? '⚠️ OVER LIMIT (>240V)' : '● ปลอดภัย (220-240V)'}
              </span>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] text-slate-400 font-bold block mb-1 uppercase">สถานะเครื่องจักร</span>
              <div className={`text-2xl font-black font-mono mt-1 ${isRunning ? 'text-emerald-400' : 'text-slate-400'}`}>
                {isRunning ? 'ACTIVE' : 'STANDBY'}
              </div>
              <span className="text-[10px] text-slate-500 font-mono">
                {isRunning ? 'โหลด 14.8 A' : 'กระแส 0 A'}
              </span>
            </div>
          </div>

          {/* Slider */}
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex justify-between font-bold text-slate-300">
              <span>ปรับแรงดันไฟฟ้าจำลอง (Voltage Slider):</span>
              <span className="font-mono text-cyan-400">{voltage} V</span>
            </div>
            <input
              type="range"
              min="180"
              max="270"
              step="2"
              value={voltage}
              onChange={e => handleVoltChange(Number(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3">
            <button
              onClick={handleStart}
              disabled={isRunning}
              className="flex-1 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-black text-sm shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <FiPlay /> START
            </button>
            <button
              onClick={handleStop}
              disabled={!isRunning}
              className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-black text-sm border border-slate-700 shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
            >
              <FiSquare /> STOP
            </button>
          </div>
        </div>

        {/* Real-Time DOM Inspection Code */}
        <div className="lg:col-span-5 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold border-b border-slate-800 pb-2">
            <FiTerminal /> คำสั่ง DOM Manipulation ที่ทำงานจริง:
          </div>
          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-200 font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-800">
            <code>{lastDomCode}</code>
          </pre>
          <p className="text-[11px] text-slate-400 leading-relaxed m-0">
            ใน Workshop 2 นักเรียนจะได้เขียน JavaScript เชื่อมต่อ <code>document.getElementById()</code>, ดักฟังเหตุการณ์ด้วย <code>addEventListener("click")</code>, และเปลี่ยนคลาสสีด้วย <code>classList.add/remove</code> แบบนี้เป๊ะๆ
          </p>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// INTERACTIVE COMPANION 6: REST API Waiter & HTTP Methods Simulator
// =========================================================================
export function RestApiWaiterSimulator() {
  const { isDark } = useTheme();
  const [method, setMethod] = useState('GET');
  const [response, setResponse] = useState({
    status: 200,
    statusText: 'OK',
    data: { meterId: "MTR-01", voltage: 231.4, current: 15.6, status: "NORMAL" }
  });

  const handleSendRequest = (m) => {
    setMethod(m);
    if (m === 'GET') {
      setResponse({
        status: 200,
        statusText: 'OK',
        data: { meterId: "MTR-01", voltage: 231.4, current: 15.6, timestamp: new Date().toLocaleTimeString() }
      });
    } else if (m === 'POST') {
      setResponse({
        status: 201,
        statusText: 'Created',
        data: { success: true, message: "สร้างบันทึกการแจ้งเตือนสำเร็จ", alertId: "ALM-99" }
      });
    } else if (m === 'PUT') {
      setResponse({
        status: 200,
        statusText: 'OK',
        data: { success: true, message: "อัปเดตสถานะเครื่องจักรเป็น MAINTENANCE สำเร็จ" }
      });
    } else if (m === 'DELETE') {
      setResponse({
        status: 204,
        statusText: 'No Content',
        data: null
      });
    }
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            INTERACTIVE AID #6 · RFC 9110 HTTP METHODS
          </span>
          <h3 className={`text-base sm:text-lg font-black mt-1 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            ตัวจำลอง REST API &amp; บริกรร้านอาหาร (GET, POST, PUT, DELETE)
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          อุปมาอุปไมย: ลูกค้า (Client) ⇄ บริกร (API Request) ⇄ ครัว (Server/DB)
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Request Controls */}
        <div className="lg:col-span-5 space-y-3">
          <span className="text-xs font-bold text-slate-300 block">เลือกคำสั่ง HTTP Method ที่ต้องการส่ง:</span>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono font-bold">
            <button
              onClick={() => handleSendRequest('GET')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                method === 'GET' ? 'bg-emerald-600 text-white border-emerald-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-sm">GET</div>
              <div className="text-[10px] font-sans font-normal opacity-90 mt-0.5">ขอดูเมนู/อ่านข้อมูล (ค่าน้ำ-ไฟ)</div>
            </button>
            <button
              onClick={() => handleSendRequest('POST')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                method === 'POST' ? 'bg-amber-600 text-white border-amber-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-sm">POST</div>
              <div className="text-[10px] font-sans font-normal opacity-90 mt-0.5">สั่งอาหารใหม่/ยิง Webhook แจ้งเตือน</div>
            </button>
            <button
              onClick={() => handleSendRequest('PUT')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                method === 'PUT' ? 'bg-sky-600 text-white border-sky-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-sm">PUT / PATCH</div>
              <div className="text-[10px] font-sans font-normal opacity-90 mt-0.5">ขอเปลี่ยนออร์เดอร์/อัปเดตสถานะ</div>
            </button>
            <button
              onClick={() => handleSendRequest('DELETE')}
              className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                method === 'DELETE' ? 'bg-rose-600 text-white border-rose-400 shadow-md' : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div className="text-sm">DELETE</div>
              <div className="text-[10px] font-sans font-normal opacity-90 mt-0.5">ขอยกเลิก/ลบข้อมูลรายการ</div>
            </button>
          </div>
        </div>

        {/* Live HTTP Response Viewer */}
        <div className="lg:col-span-7 p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-slate-400">Response จากเซิร์ฟเวอร์:</span>
            <span className={`px-2.5 py-0.5 rounded font-black ${
              response.status >= 200 && response.status < 300 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300'
            }`}>
              HTTP {response.status} {response.statusText}
            </span>
          </div>

          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-200 overflow-x-auto m-0 leading-relaxed">
            <code>{JSON.stringify(response.data, null, 2)}</code>
          </pre>

          <div className="text-[11px] font-sans text-slate-400">
            {method === 'GET' && '💡 GET มีคุณสมบัติ Safe & Idempotent: ส่งซ้ำกี่ครั้งก็ไม่มีการเปลี่ยนแปลงข้อมูลในระบบ'}
            {method === 'POST' && '⚠️ POST ไม่ Idempotent: หากพนักงานกดปุ่มเบิ้ล อาจส่งข้อความแจ้งเตือนซ้ำ ต้องป้องกันด้วย Cooldown Lock'}
          </div>
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// INTERACTIVE COMPANION 7: Polling vs Webhook Live Comparison
// =========================================================================
export function PollingVsWebhookSimulator() {
  const { isDark } = useTheme();
  const [pollCount, setPollCount] = useState(0);
  const [webhookCount, setWebhookCount] = useState(0);
  const [isPolling, setIsPolling] = useState(false);
  const [lastEvent, setLastEvent] = useState(null);

  useEffect(() => {
    let timer;
    if (isPolling) {
      timer = setInterval(() => {
        setPollCount(c => c + 1);
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPolling]);

  const triggerAlarmEvent = () => {
    setWebhookCount(w => w + 1);
    setLastEvent({
      time: new Date().toLocaleTimeString(),
      text: '🚨 OVERHEAT DETECTED! มอเตอร์อุณหภูมิเกิน 80°C'
    });
  };

  return (
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
            INTERACTIVE AID #7 · REAL-TIME STRATEGY
          </span>
          <h3 className={`text-base sm:text-lg font-black mt-1 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            เปรียบเทียบกลไก Polling (ถามเรื่อยๆ) vs Webhook (มีเหตุก็ค่อยส่ง)
          </h3>
        </div>

        <button
          onClick={() => setIsPolling(!isPolling)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md cursor-pointer transition-all ${
            isPolling ? 'bg-rose-600 text-white' : 'bg-indigo-600 text-white'
          }`}
        >
          {isPolling ? '⏸️ หยุด Polling' : '▶️ เริ่มจำลอง Polling ทุก 1.5s'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Polling Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-indigo-300">1. Polling (Client ขอข้อมูลเรื่อยๆ)</span>
            <span className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono font-bold">
              ยิงไปแล้ว: {pollCount} ครั้ง
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed m-0">
            Client ใช้ <code>setInterval(loadData, 5000)</code> ยิงถาม Server ตลอดเวลา แม้ค่าเซนเซอร์จะไม่เปลี่ยนเลยก็ตาม (กินแบนด์วิดท์แต่เข้าใจและเขียนง่ายสุด)
          </p>
          <div className="p-2.5 rounded-lg bg-slate-900 font-mono text-[11px] text-slate-400">
            HTTP GET /api/meter → 200 OK (ถามซ้ำทุกรอบ)
          </div>
        </div>

        {/* Webhook Card */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="font-bold text-emerald-300">2. Webhook (Event-Driven แจ้งเตือน)</span>
            <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
              แจ้งเตือนแล้ว: {webhookCount} ครั้ง
            </span>
          </div>
          <p className="text-slate-300 leading-relaxed m-0">
            ระบบจะไม่ส่งอะไรเลยจนกว่าจะเกิดเหตุการณ์วิกฤต (Event) เช่น อุณหภูมิเกินลิมิต จึงจะส่ง <code>POST JSON</code> ออกไปทันที
          </p>
          <button
            onClick={triggerAlarmEvent}
            className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold cursor-pointer transition-all active:scale-95"
          >
            ⚡ กดจำลองเซนเซอร์ร้อง Alarm (ยิง Webhook 1 ครั้ง)
          </button>
          {lastEvent && (
            <div className="p-2 rounded bg-emerald-950/40 border border-emerald-500/40 text-emerald-200 text-[11px]">
              [{lastEvent.time}] {lastEvent.text}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =========================================================================
// INTERACTIVE COMPANION 8: Boundary Value Analysis & Automated Testing (Mod 5)
// =========================================================================
export function AutomatedTestCaseEvaluator() {
  const { isDark } = useTheme();
  const [actual, setActual] = useState(1104);
  const [target, setTarget] = useState(1200);

  const officialCases = [
    { id: 'TC-01', desc: 'ยอดผลิตปกติ (Normal Case 92.0%)', target: 1200, actual: 1104, expectedStatus: 'ปกติ' },
    { id: 'TC-02', desc: 'ค่าขอบบนพอดี 85.0% (Boundary Case)', target: 1200, actual: 1020, expectedStatus: 'ปกติ' },
    { id: 'TC-03', desc: 'ค่าขอบล่างพอดี 60.0% (Boundary Case)', target: 1200, actual: 720, expectedStatus: 'เฝ้าระวัง' },
    { id: 'TC-04', desc: 'ยอดต่ำกว่าเป้าหมาย (Sub-target Alarm 49.9%)', target: 1200, actual: 599, expectedStatus: 'ต่ำกว่าเป้า' },
    { id: 'TC-05', desc: 'เป้าหมายเป็น 0 (Invalid Target Error)', target: 0, actual: 50, expectedStatus: 'ไม่มีข้อมูล' }
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
    <div className={`border rounded-2xl p-4 sm:p-6 space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-md'
    }`}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
        <div>
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-orange-500/20 text-orange-300 border border-orange-500/30">
            INTERACTIVE AID #8 · BOUNDARY VALUE ANALYSIS (BVA)
          </span>
          <h3 className={`text-base sm:text-lg font-black mt-1 m-0 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            เครื่องมือทดสอบเงื่อนไข Performance &amp; วิเคราะห์ค่าขอบเขต (BVA Suite)
          </h3>
        </div>
        <span className="text-xs text-slate-400">
          จุดตัดเกณฑ์สำคัญ: 85.0% (ปกติ) และ 60.0% (เฝ้าระวัง)
        </span>
      </div>

      {/* Live Custom Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs">
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
            <span>ผลคำนวณสด:</span>
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

      {/* 5 Standard Test Cases */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden font-mono">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px]">
            <tr>
              <th className="p-2.5">Case ID</th>
              <th className="p-2.5">คำอธิบายกรณีทดสอบ</th>
              <th className="p-2.5">Target</th>
              <th className="p-2.5">Actual</th>
              <th className="p-2.5">ผลลัพธ์ที่คำนวณ</th>
              <th className="p-2.5">สถานะที่คาดหวัง</th>
              <th className="p-2.5">ผลตรวจ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-300">
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
  );
}

// =========================================================================
// REUSABLE WORKSHOP SUMMARY CARD
// =========================================================================
function WorkshopGuideCard({ workshopId, title, duration, goal, folder }) {
  const [showSolution, setShowSolution] = useState(false);
  const w = ENTERPRISE_WORKSHOPS_DATA?.workshops?.find(item => 
    item.id === workshopId || item.id === `Workshop ${workshopId.replace('w', '')}`
  );

  if (!w) return null;

  return (
    <div className="rounded-2xl border-2 border-emerald-500/40 bg-slate-900/90 p-5 sm:p-6 space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-xl bg-emerald-600/30 text-emerald-400 flex items-center justify-center font-black text-sm border border-emerald-500/40">
            🛠️
          </span>
          <div>
            <h3 className="text-base sm:text-lg font-black text-white m-0">{w.title}</h3>
            <span className="text-xs text-slate-400 font-mono">
              โฟลเดอร์: {w.folder} · เวลาปฏิบัติการ: {w.duration}
            </span>
          </div>
        </div>

        <button
          onClick={() => setShowSolution(!showSolution)}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-black cursor-pointer transition-all border ${
            showSolution
              ? 'bg-emerald-600 text-white border-emerald-400'
              : 'bg-slate-800 text-emerald-300 border-slate-700 hover:border-slate-600'
          }`}
        >
          {showSolution ? '🔑 ซ่อนเฉลย' : '🔑 ดูโค้ดเฉลย (Solution)'}
        </button>
      </div>

      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed m-0">
        <strong>เป้าหมาย (Goal):</strong> {w.goal}
      </p>

      {/* Steps & Criteria */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <span className="font-bold text-emerald-400 block">📋 ขั้นตอนการปฏิบัติ:</span>
          <ol className="space-y-1.5 text-slate-300 list-decimal list-inside leading-relaxed">
            {(w.steps || []).map((st, idx) => (
              <li key={idx}>{st}</li>
            ))}
          </ol>
        </div>

        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <span className="font-bold text-cyan-400 block">✅ ทำเสร็จเมื่อ (Definition of Done):</span>
          <ul className="space-y-1.5 text-slate-300 list-disc list-inside leading-relaxed">
            {(w.doneWhen || []).map((dw, idx) => (
              <li key={idx}>{dw}</li>
            ))}
          </ul>
        </div>
      </div>

      {showSolution && (
        <div className="pt-3 border-t border-slate-800 space-y-3">
          <div className="text-xs font-bold text-emerald-300">
            เฉลยสมบูรณ์ (Solution Code):
          </div>
          {Object.entries(w.solutionFiles || {}).map(([fname, code]) => (
            <div key={fname}>
              <div className="text-xs font-mono font-bold text-emerald-400 mb-1">
                ✅ {w.folder}/solution/{fname}
              </div>
              <CodeBlock code={code} language={`solution/${fname}`} />
            </div>
          ))}
        </div>
      )}
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
          <FiLayers className="w-4 h-4" /> โมดูลที่ 1 (Module 1) · วันที่ 1 ภาคเช้า · ระดับพื้นฐานสู่วิศวกรระบบ
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
          Enterprise System &amp; Digital Industry Landscape
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          สถาปัตยกรรมระบบองค์กรดิจิทัล, การหลอมรวมระหว่างเทคโนโลยีสารสนเทศ (IT) และเทคโนโลยีปฏิบัติการหน้างาน (OT) ตามมาตรฐาน ISA-95 (IEC 62264), สถาปัตยกรรม Client-Server และโครงสร้างข้อมูล JSON สำหรับอุตสาหกรรม
        </p>
      </div>

      {/* 1.1 Digital Transformation in Industrial Enterprise */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-sm font-black border border-violet-500/40">1</span>
          1.1 การเปลี่ยนผ่านสู่องค์กรการผลิตดิจิทัล (Digital Transformation in Industry 4.0)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          ในอดีต โรงงานผลิตบันทึกยอดผลิตและปัญหาเครื่องจักรด้วย <strong>กระดาษ (Paper-based) หรือไฟล์สเปรดชีต</strong> ที่ต้องรอรวบรวมท้ายกะ ทำให้ผู้บริหารและทีมซ่อมบำรุงทราบปัญหาล่าช้ากว่า 12–24 ชั่วโมง เกิดภาวะ Blind Spot ในกระบวนการผลิต การเปลี่ยนผ่านสู่ Digital Enterprise จึงมุ่งเน้นการเชื่อมต่อข้อมูลแบบ Real-Time จากสายการผลิตตรงสู่หน้าจอผู้ปฏิบัติงาน
        </p>

        {/* Embedded Architecture Diagram from Slide 11/12 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image1.webp"
            title="Digital Enterprise Transformation Map"
            subtitle="เส้นทางการเปลี่ยนผ่านจาก Analog สู่ Connected Smart Factory"
            caption="เปรียบเทียบกระบวนการเดิมที่ต้องพึ่งพามือคน กับระบบเชื่อมต่อดิจิทัลที่อ่านค่าเซนเซอร์และสถานะเครื่องจักรขึ้นระบบกลางทันที"
            badge="INDUSTRY 4.0 ROADMAP"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image4.webp"
            title="Client-Server & Cloud-Native Architecture"
            subtitle="สถาปัตยกรรมระบบแอปพลิเคชันองค์กร"
            caption="การแบ่งหน้าที่อย่างชัดเจนระหว่าง Client (เบราว์เซอร์แสดงผลและรับอินพุต) และ Server (ประมวลผล Business Logic และบันทึกฐานข้อมูล)"
            badge="SYSTEM ARCHITECTURE"
          />
        </div>
      </section>

      {/* 1.2 ISA-95 & IT/OT Convergence */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">2</span>
          1.2 สถาปัตยกรรมระบบอุตสาหกรรม (ISA-95) &amp; ความต่างระหว่าง IT กับ OT
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          มาตรฐาน <strong>ANSI/ISA-95 (IEC 62264)</strong> กำหนดพีระมิด 5 ระดับเพื่อแยกบทบาทของระบบอย่างชัดเจน:
          ความปลอดภัยของระบบ OT อยู่ที่การไม่หยุดชะงัก (Availability 99.99%) และการตอบสนองเร็วระดับมิลลิวินาที 
          ในขณะที่ระบบ IT ให้ความสำคัญกับความลับและความถูกต้องของข้อมูลธุรกิจ (Confidentiality &amp; Data Integrity)
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden font-mono">
            <thead className="bg-slate-950 text-slate-300 font-bold uppercase">
              <tr>
                <th className="p-3 border-b border-slate-800 font-sans">มิติเปรียบเทียบ</th>
                <th className="p-3 border-b border-slate-800 text-sky-400 font-sans">Information Technology (IT)</th>
                <th className="p-3 border-b border-slate-800 text-amber-400 font-sans">Operational Technology (OT)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 bg-slate-900/60 text-slate-300 font-sans">
              <tr>
                <td className="p-3 font-bold text-indigo-300">เป้าหมายหลัก</td>
                <td className="p-3">จัดการข้อมูลธุรกิจ, บัญชี, คลังสินค้า, ERP</td>
                <td className="p-3">ควบคุมเครื่องจักรทางกายภาพ, ความปลอดภัยหน้างาน</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-indigo-300">ลำดับความสำคัญ (CIA vs AIC)</td>
                <td className="p-3">1. ความลับ (C) → 2. ความถูกต้อง (I) → 3. ความพร้อมใช้ (A)</td>
                <td className="p-3">1. ความพร้อมใช้งาน 99.99% (A) → 2. ความถูกต้อง (I) → 3. ความลับ (C)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-indigo-300">เวลาตอบสนอง (Latency)</td>
                <td className="p-3 font-mono">วินาที ถึง นาที (Seconds - Minutes)</td>
                <td className="p-3 font-mono text-emerald-400 font-bold">10 - 100 มิลลิวินาที (Sub-second Hard Real-Time)</td>
              </tr>
              <tr>
                <td className="p-3 font-bold text-indigo-300">วงรอบการอัปเดตระบบ</td>
                <td className="p-3">อัปเดต Patch ประจำสัปดาห์/เดือน รีสตาร์ตได้</td>
                <td className="p-3 text-rose-300">ห้ามรีสตาร์ตระหว่างเดินเครื่อง! วงรอบ 10–20 ปี</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Embedded Diagram from Slide 13/14 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image10.webp"
            title="IT & OT Integration Bridge"
            subtitle="การหลอมรวมระบบปฏิบัติการเข้ากับระบบสารสนเทศ"
            caption="บทบาทของระบบ MES และ IoT Gateway ในการเป็นตัวกลางแปลงสัญญาณอุตสาหกรรม (Modbus/OPC) เข้าสู่โปรโตคอลเว็บ (HTTP/JSON)"
            badge="IT/OT BRIDGE"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image13.webp"
            title="IT vs OT Boundary Matrix"
            subtitle="ความแตกต่างของข้อกำหนดความปลอดภัยและเวลาตอบสนอง"
            caption="NIST SP 800-82 ชี้ชัดว่าระบบควบคุมเครื่องจักรต้องไม่หยุดทำงาน แม้ระบบเครือข่ายอินเทอร์เน็ตภายนอกจะขัดข้อง"
            badge="SECURITY MATRIX"
          />
        </div>

        {/* Companion Interactive Aid #1: ISA-95 Pyramid */}
        <Isa95PyramidExplorer />
      </section>

      {/* 1.3 Industrial UX/UI Principles */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-pink-600/30 text-pink-400 flex items-center justify-center text-sm font-black border border-pink-500/40">3</span>
          1.3 หลักการออกแบบหน้าจอโรงงาน (Industrial UX/UI &amp; IEC 60204-1)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          หน้าจอควบคุมในโรงงานไม่ใช่แค่เรื่องความสวยงาม แต่เป็นเรื่องของ <strong>ความปลอดภัยและการตัดสินใจภายใน 5 วินาที</strong>:
          การใช้สีต้องยึดตามมาตรฐานสากล <strong>IEC 60204-1</strong>: สีแดงใช้เฉพาะเหตุฉุกเฉิน (E-Stop/Fault), 
          สีเหลืองสำหรับสภาวะเตือนก่อนเกินพิกัด, สีเขียวสำหรับการทำงานปกติ, 
          และขนาดปุ่มสัมผัสต้องไม่ต่ำกว่า <strong>44 × 44 พิกเซล</strong> เพื่อรองรับนิ้วมือสวมถุงมือหน้างาน
        </p>

        {/* Embedded UI Standard Diagrams */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image20.webp"
            title="User-Centered Design (UCD) in Manufacturing"
            subtitle="กระบวนการออกแบบโดยยึดผู้ปฏิบัติงานเป็นศูนย์กลาง"
            caption="การเก็บ Requirement หน้างานจากช่างเทคนิคและ Operator เพื่อลดความผิดพลาดในการกดสั่งงาน (Zero Human Error)"
            badge="UX PRINCIPLE"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image29.webp"
            title="Standards for Industrial UI Design"
            subtitle="มาตรฐานสีและระยะสัมผัส IEC 60204-1 / ISA-101"
            caption="หลีกเลี่ยงหน้าจอสีรุ้ง (Rainbow UI) ที่รบกวนสายตา และเน้น High-Contrast Data Display ที่มองเห็นได้ชัดจากระยะ 2 เมตร"
            badge="IEC 60204-1"
          />
        </div>

        {/* Companion Interactive Aid #2: HMI Validator */}
        <IndustrialHmiValidatorSimulator />
      </section>

      {/* 1.4 JSON Data Format */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">4</span>
          1.4 โครงสร้างข้อมูล JSON สำหรับระบบอุตสาหกรรม (RFC 8259)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          JSON (JavaScript Object Notation) คือรูปแบบข้อมูลแบบ Text ที่เบา อ่านง่าย และเป็นมาตรฐานสากลที่ทุกภาษาเข้าใจตรงกัน 
          ในระบบโรงงาน เซนเซอร์และ Edge Gateway จะแพ็กค่าแรงดัน กระแสไฟฟ้า และสถานะเครื่องจักรเป็น JSON ส่งเข้าสู่ API ของ MES
        </p>

        <IndustrialDiagramCard 
          imgSrc="./images/enterprise_slides/image78.webp"
          title="JSON Data Structure Specification (RFC 8259)"
          subtitle="โครงสร้างคีย์และชนิดข้อมูลในระบบ IoT อุตสาหกรรม"
          caption="คีย์ต้องเป็น String ในเครื่องหมายคำพูดคู่เสมอ และรองรับ Value ทั้ง String, Number, Boolean, Array, และ Nested Object"
          badge="DATA STANDARD"
        />

        {/* Companion Interactive Aid #3: JSON Explorer */}
        <JsonPathInteractiveExplorer />
      </section>
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
          <FiLayout className="w-4 h-4" /> โมดูลที่ 2 (Module 2) · วันที่ 1 ภาคบ่าย · ทักษะโครงสร้างและการจัดหน้าจอ
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
          Industrial UX/UI &amp; Modern Layout Design (HTML5 &amp; Flexbox)
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การวางโครงสร้างหน้าจอ Dashboard ด้วย Semantic HTML5, CSS Box Model, ระบบจัด Layout แบบยืดหยุ่น (Flexbox) และลงมือทำ Workshop 1: Electrical Meter UI
        </p>
      </div>

      {/* 2.1 Semantic HTML5 */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-pink-600/30 text-pink-400 flex items-center justify-center text-sm font-black border border-pink-500/40">1</span>
          2.1 โครงสร้าง Semantic HTML5 สำหรับระบบแสดงผล Dashboard
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          หลีกเลี่ยงการใช้ <code>&lt;div&gt;</code> ครอบทุกอย่าง (Div Soup) ซึ่งทำให้โค้ดอ่านยากและเบราว์เซอร์ประมวลผลช้า 
          ในระบบโรงงานเราใช้แท็กเชิงความหมาย: <code>&lt;header&gt;</code> ระบุชื่อสายการผลิต, 
          <code>&lt;main&gt;</code> ครอบส่วนเนื้อหาแสดงผลค่าวัด, 
          และ <code>&lt;article class="meter-card"&gt;</code> สำหรับการ์ดแสดงค่าแต่ละตัว
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image30.webp"
            title="HTML5 Document Architecture"
            subtitle="โครงสร้างพื้นฐานของเอกสารเว็บตามมาตรฐาน W3C"
            caption="การประกาศ DOCTYPE, กำหนด charset UTF-8 เพื่อรองรับภาษาไทย, และ viewport meta tag เพื่อให้แสดงผลถูกต้องบนมือถือ"
            badge="HTML5 SPEC"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image32.webp"
            title="Semantic HTML Tags Hierarchy"
            subtitle="โครงสร้างแท็กที่มีความหมายเชิงวิศวกรรม"
            caption="การใช้ header, main, section, article ช่วยให้โค้ดมีระเบียบและง่ายต่อการเขียนสคริปต์ DOM ค้นหา Element"
            badge="SEMANTIC WEB"
          />
        </div>

        <CodeBlock
          code={`<!-- โครงสร้าง Semantic HTML5 สำหรับหน้าจอ Electrical Meter -->
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Electrical Meter Dashboard</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <header>
    <h1>Electrical Meter — Line A</h1>
    <span class="status-badge">ONLINE</span>
  </header>

  <main class="meter-grid">
    <article class="meter-card">
      <h2>Voltage</h2>
      <p class="value">231.4 <span class="unit">V</span></p>
    </article>
    <article class="meter-card">
      <h2>Current</h2>
      <p class="value">15.6 <span class="unit">A</span></p>
    </article>
  </main>
</body>
</html>`}
          language="html"
        />
      </section>

      {/* 2.2 CSS Box Model & Flexbox */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">2</span>
          2.2 CSS Box Model &amp; Flexbox สำหรับหน้าจอแสดงผลอุตสาหกรรม
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          หน้าจอแดชบอร์ดโรงงานต้องเปิดดูได้ทั้งบนแท็บเล็ตตรวจงานของช่าง, หน้าจอมือถือพนักงาน, และจอแอลอีดีขนาดใหญ่แขวนเพดาน 
          เราใช้ <strong>CSS Flexbox</strong> กำหนด <code>flex-wrap: wrap</code> ร่วมกับ <code>flex: 1 1 240px</code> เพื่อให้การ์ดขยายเต็มพื้นที่เมื่อจอกว้าง และตัดลงมาเป็นแถวใหม่โดยอัตโนมัติเมื่อจอแคบ
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image38.webp"
            title="CSS Box Model Architecture"
            subtitle="ความสัมพันธ์ Content, Padding, Border และ Margin"
            caption="กฎสำคัญ: ใช้ box-sizing: border-box เสมอ เพื่อให้ความกว้างของการ์ดรวม padding แล้ว ไม่ล้นจอเกินขนาดที่คำนวณ"
            badge="BOX MODEL"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image40.webp"
            title="Flexbox Main Axis vs Cross Axis"
            subtitle="ทิศทางการจัดเรียงและการตัดบรรทัดของการ์ด"
            caption="การควบคุม flex-direction, justify-content, align-items และ gap ช่วยให้จัด Layout แดชบอร์ดได้โดยไม่ต้องใช้ Float หรือ Table"
            badge="FLEXBOX MODEL"
          />
        </div>

        {/* Companion Interactive Aid #4: Flexbox Playground */}
        <IndustrialFlexboxSimulator />
      </section>

      {/* 2.3 Workshop 1 Lab Guide */}
      <WorkshopGuideCard
        workshopId="w1"
        title="Workshop 1: สร้างหน้าจอวัดค่าไฟฟ้า (Electrical Meter UI)"
        duration="14:00 - 15:45 (1 ชั่วโมง 45 นาที)"
        goal="สร้างหน้าเว็บแดชบอร์ดมิเตอร์ไฟฟ้าที่มีโครงสร้าง Semantic HTML5 และจัด Layout ด้วย Flexbox ให้สวยงามทั้งบนมือถือและจอโรงงาน"
        folder="workshops/w1-meter-ui"
      />
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
          <FiCode className="w-4 h-4" /> โมดูลที่ 3 (Module 3) · วันที่ 2 เต็มวัน · ทักษะโปรแกรมมิ่งและการควบคุมหน้าจอ
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
          JavaScript Programming Logic, DOM &amp; State Control
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ควบคุมตรรกะของแอปพลิเคชันด้วย JavaScript ES6+: ตัวแปร เงื่อนไข ฟังก์ชัน อาร์เรย์, การดักฟังเหตุการณ์ (`addEventListener`), การอัปเดตหน้าจอผ่าน DOM และลงมือทำ Workshop 2: ตู้ควบคุมไฟอัจฉริยะ (Smart Control Cabinet)
        </p>
      </div>

      {/* 3.1 JavaScript Logic & Clean Code */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">1</span>
          3.1 กฎเหล็ก JavaScript สำหรับซอฟต์แวร์โรงงาน
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <strong className="text-sky-400 block font-bold">1. const นำหน้าเสมอ</strong>
            <p className="text-slate-300 m-0 leading-relaxed">
              ใช้ <code>const</code> เป็นค่าเริ่มต้นสำหรับค่าคงที่ เช่น <code>const MAX_VOLT = 240;</code> และใช้ <code>let</code> เมื่อค่านั้นต้องเปลี่ยนตามเซนเซอร์ ห้ามใช้ <code>var</code> เด็ดขาด
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <strong className="text-amber-400 block font-bold">2. Strict Equality (===)</strong>
            <p className="text-slate-300 m-0 leading-relaxed">
              ใช้ <code>===</code> เสมอเพื่อตรวจสอบทั้งค่าและชนิดข้อมูล เช่น <code>status === "RUNNING"</code> ป้องกันข้อผิดพลาดแบบ Silent Bug
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
            <strong className="text-emerald-400 block font-bold">3. DOM Caching</strong>
            <p className="text-slate-300 m-0 leading-relaxed">
              ค้นหา Element ด้วย <code>getElementById()</code> เก็บใส่ตัวแปรไว้ล่วงหน้าด้านบน ห้ามเรียกซ้ำๆ ใน Loop หรือในฟังก์ชัน Timer
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image45.gif"
            title="JavaScript Execution & Event Loop"
            subtitle="กลไกการทำงานแบบ Single-Thread Asynchronous"
            caption="JavaScript ประมวลผลคำสั่งทีละบรรทัด และใช้ Event Loop จัดการเหตุการณ์การคลิกและข้อมูลตอบกลับจากเครือข่ายโดยไม่ทำให้หน้าเว็บค้าง"
            badge="JS RUNTIME"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image59.webp"
            title="JavaScript Objects & Arrays Hierarchy"
            subtitle="การจัดเก็บข้อมูลสถานะเครื่องจักรในรูปแบบอ็อบเจกต์"
            caption="การเข้าถึงค่าผ่าน Property เช่น machine.metrics.temperature เพื่อนำไปเปรียบเทียบกับเกณฑ์ความปลอดภัย"
            badge="DATA STRUCTURE"
          />
        </div>
      </section>

      {/* 3.2 DOM Architecture & Manipulation */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">2</span>
          3.2 การสั่งงานหน้าจอผ่าน DOM (Document Object Model)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          DOM คือโครงสร้างต้นไม้ (Tree Structure) ที่เบราว์เซอร์สร้างขึ้นแทนเอกสาร HTML เมื่อมีข้อมูลส่งมาจากเซนเซอร์ 
          JavaScript จะเข้าถึง Element ผ่าน <code>document.getElementById()</code> แล้วเปลี่ยนเนื้อหาด้วย <code>textContent</code> 
          และเปลี่ยนสีการ์ดหรือสั่งไฟเตือนกระพริบด้วย <code>classList.add/remove/toggle</code>
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image66.webp"
            title="The DOM Tree Structure"
            subtitle="โครงสร้างลำดับชั้นของ Element บนหน้าเว็บ"
            caption="document → html → body → main → article แต่ละส่วนคือ Node ที่ JavaScript สามารถเข้าถึงและสั่งแก้ไขได้แบบ Real-Time"
            badge="DOM ARCHITECTURE"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image73.webp"
            title="Event Listener & Callback Flow"
            subtitle="วงจรการตรวจจับการกดปุ่ม (Event Handling)"
            caption="การผูก addEventListener('click', handler) เข้ากับปุ่มควบคุม เพื่อสั่งงานมอเตอร์หรือยอมรับข้อความแจ้งเตือน (Alarm Acknowledge)"
            badge="EVENT FLOW"
          />
        </div>

        {/* Companion Interactive Aid #5: Control Cabinet */}
        <ControlCabinetDomSimulator />
      </section>

      {/* 3.3 Workshop 2 Lab Guide */}
      <WorkshopGuideCard
        workshopId="w2"
        title="Workshop 2: ตู้ควบคุมไฟฟ้าอัจฉริยะ (Smart Control Cabinet)"
        duration="14:00 - 15:45 (1 ชั่วโมง 45 นาที)"
        goal="เขียน JavaScript ควบคุมตู้สวิตช์ไฟจำลอง: ดักฟังปุ่ม Start/Stop, แสดงแรงดันไฟฟ้า, และแจ้งเตือนไฟกระพริบเมื่อแรงดันเกิน 240V"
        folder="workshops/w2-cabinet"
      />
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
          <FiActivity className="w-4 h-4" /> โมดูลที่ 4 (Module 4) · วันที่ 3 เต็มวัน · ทักษะการบูรณาการระบบและ IoT
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
          Application Integration, REST APIs &amp; Webhook Automation
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การเชื่อมต่อระบบผ่าน RESTful APIs, การดึงข้อมูลแบบ Asynchronous (Fetch &amp; Async/Await), กลยุทธ์ Real-Time Polling, การส่งแจ้งเตือน Webhook และลงมือทำ Workshop 3 &amp; 4
        </p>
      </div>

      {/* 4.1 REST API & Waiter Analogy */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">1</span>
          4.1 สถาปัตยกรรม REST API &amp; HTTP Methods ตามมาตรฐาน RFC 9110
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          API (Application Programming Interface) ทำหน้าที่เป็นช่องทางการสื่อสารมาตรฐานระหว่างหน้าเว็บ Dashboard กับเครื่องแม่ข่าย 
          เปรียบเสมือนบริกรในร้านอาหารที่นำคำสั่งของลูกค้า (Client) ไปบอกแม่ครัว (Server) และนำอาหาร (Data JSON) กลับมาเสิร์ฟ 
          โดยมี <strong>HTTP Methods</strong> กำหนดเจตนาอย่างเคร่งครัด
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image80.webp"
            title="REST API Architecture Concept"
            subtitle="การแลกเปลี่ยนข้อมูลผ่าน HTTP Protocol"
            caption="Client ส่ง Request พร้อม Method และ Header → Server ประมวลผลและส่ง Response กลับมาพร้อม Status Code และ JSON Payload"
            badge="API SPECIFICATION"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image82.webp"
            title="HTTP Methods Taxonomy (RFC 9110)"
            subtitle="GET (อ่าน), POST (สร้าง), PUT (แทนที่), DELETE (ลบ)"
            caption="เข้าใจความหมายของ Safe และ Idempotent: คำสั่ง GET ต้องไม่เปลี่ยนแปลงข้อมูลในฐานข้อมูลเด็ดขาด"
            badge="HTTP METHODS"
          />
        </div>

        {/* Companion Interactive Aid #6: REST API Waiter */}
        <RestApiWaiterSimulator />
      </section>

      {/* 4.2 Data Fetching & Real-Time Polling vs Webhook */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-teal-600/30 text-teal-400 flex items-center justify-center text-sm font-black border border-teal-500/40">2</span>
          4.2 การดึงข้อมูล Asynchronous (Fetch API) &amp; Polling vs Webhook
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          เราใช้ <code>fetch()</code> ร่วมกับ <code>async/await</code> เพื่อดึงข้อมูลเซนเซอร์โดยไม่ทำให้หน้าเว็บค้าง 
          ในการมอนิเตอร์สถานะการผลิต เราใช้ <strong>Polling (setInterval)</strong> สำหรับค่าน้ำ-ไฟที่ต้องอัปเดตต่อเนื่องทุก 5 วินาที 
          และใช้ <strong>Webhook (POST Notification)</strong> เมื่อเกิดเหตุฉุกเฉิน (Event-Driven) เช่น มอเตอร์ร้อนจัด เพื่อยิงแจ้งเตือนเข้ากลุ่มแชตทันที
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image86.webp"
            title="Asynchronous Fetch Data Flow"
            subtitle="วงจรชีวิตของการยิง Fetch และจัดการ Error"
            caption="try { const res = await fetch(url); if (!res.ok) throw ... } catch (err) { แสดงสถานะ Offline } ป้องกันหน้าจอค้าง"
            badge="FETCH ASYNC/AWAIT"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image88.webp"
            title="Event-Driven Webhook Architecture"
            subtitle="การส่งแจ้งเตือนทันทีเมื่อเกิดเหตุการณ์วิกฤต"
            caption="เมื่อเซนเซอร์ตรวจจับ Overvoltage > 240V ระบบจะส่ง HTTP POST พร้อม JSON Payload เข้า Webhook Gateway เพื่อกระจายแจ้งเตือนทันที"
            badge="WEBHOOK ARCHITECTURE"
          />
        </div>

        {/* Companion Interactive Aid #7: Polling vs Webhook */}
        <PollingVsWebhookSimulator />
      </section>

      {/* 4.3 Workshop 3 & 4 Lab Guides */}
      <div className="space-y-4">
        <WorkshopGuideCard
          workshopId="w3"
          title="Workshop 3: ดึงข้อมูลมิเตอร์ไฟฟ้าผ่าน REST API (Live Polling)"
          duration="10:45 - 12:00 (1 ชั่วโมง 15 นาที)"
          goal="ใช้ fetch() และ async/await ดึงข้อมูลค่าน้ำ-ไฟจาก Mock API มาแสดงบนหน้าเว็บ และตั้งเวลาอัปเดตอัตโนมัติทุก 5 วินาที"
          folder="workshops/w3-fetch-data"
        />

        <WorkshopGuideCard
          workshopId="w4"
          title="Workshop 4: ระบบส่งการแจ้งเตือนฉุกเฉินผ่าน Webhook"
          duration="14:00 - 15:45 (1 ชั่วโมง 45 นาที)"
          goal="สร้างปุ่มแจ้งเตือนฉุกเฉิน ยิง HTTP POST เข้า Webhook พร้อมระบบ Debounce Lock ป้องกันพนักงานกดปุ่มเบิ้ล"
          folder="workshops/w4-alert-webhook"
        />
      </div>
    </div>
  );
}

// =========================================================================
// MODULE 5: Software QA & Day 4 Formal Examination Center (Day 4)
// =========================================================================
export function EnterpriseAppMod5() {
  const [examTab, setExamTab] = useState('rules'); // 'rules' | 'theory' | 'practical' | 'templates'
  const [showTheoryAnswers, setShowTheoryAnswers] = useState(false);

  return (
    <div className="space-y-8 text-slate-200">
      {/* Hero Header */}
      <div className="bg-gradient-to-r from-amber-950/70 via-orange-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-amber-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-3 border border-amber-500/30">
          <FiAward className="w-4 h-4" /> โมดูลที่ 5 (Module 5) · วันที่ 4 เต็มวัน · การประกันคุณภาพและศูนย์สอบวัดผลจริง
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-2">
          Software QA Standards &amp; Formal Examination Center
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การออกแบบกรณีทดสอบ (Test Cases), การวิเคราะห์ค่าขอบเขต (Boundary Value Analysis), การตรวจรับงานจริง (UAT Showcase) และศูนย์ข้อมูลการสอบวัดผลจริงประจำวันที่ 4
        </p>
      </div>

      {/* 5.1 QA & Boundary Value Analysis */}
      <section className="bg-slate-900/80 p-5 sm:p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5 m-0">
          <span className="w-7 h-7 rounded-lg bg-orange-600/30 text-orange-400 flex items-center justify-center text-sm font-black border border-orange-500/40">1</span>
          5.1 การรับประกันคุณภาพซอฟต์แวร์และการวิเคราะห์ค่าขอบเขต (Boundary Value Analysis)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          ในระบบซอฟต์แวร์โรงงาน บั๊กไม่ได้เกิดที่ข้อมูลปกติ แต่เกิดที่ <strong>"ค่าขอบเขต (Boundary Values)"</strong> 
          เช่น อัตราผลผลิต 85.0% พอดี (เกณฑ์ผ่าน) หรือ 60.0% (เกณฑ์เฝ้าระวัง) หรือยอดผลิตเป้าหมายเป็น 0 (หารด้วยศูนย์) 
          การทดสอบระบบจึงต้องสร้างตาราง Test Cases ครอบคลุมทั้งกรณีปกติ, ค่าขอบเขต, และกรณีผิดพลาด (Negative Testing)
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image95.webp"
            title="Software Testing Pyramid & Hierarchy"
            subtitle="ลำดับขั้นของการทดสอบซอฟต์แวร์อุตสาหกรรม"
            caption="Unit Testing (ทดสอบฟังก์ชันคำนวณ) → Integration Testing (ทดสอบ API) → System Testing → UAT (ตรวจรับงานโดยผู้ใช้จริง)"
            badge="QA PYRAMID"
          />
          <IndustrialDiagramCard 
            imgSrc="./images/enterprise_slides/image96.webp"
            title="Test Case Matrix & Specification"
            subtitle="โครงสร้างตารางกรณีทดสอบมาตรฐาน ISO/IEC/IEEE 29119"
            caption="ประกอบด้วย Test Case ID, คำอธิบายกรณีทดสอบ, ข้อมูลนำเข้า (Input Data), ผลลัพธ์ที่คาดหวัง, และสถานะการตรวจ Pass/Fail"
            badge="TEST CASE MATRIX"
          />
        </div>

        {/* Companion Interactive Aid #8: BVA Simulator */}
        <AutomatedTestCaseEvaluator />
      </section>

      {/* 5.2 Official Day 4 Exam Protocol & Resources */}
      <section className="bg-slate-900/90 p-5 sm:p-6 rounded-2xl border-2 border-amber-500/40 space-y-5 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              DAY 4 OFFICIAL EXAM &amp; UAT
            </span>
            <h2 className="text-lg sm:text-xl font-black text-white mt-1 m-0">
              5.2 ศูนย์ข้อมูลและระเบียบการสอบวัดผลจริงประจำวันที่ 4
            </h2>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => setExamTab('rules')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                examTab === 'rules' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              📅 ตารางและระเบียบการสอบ
            </button>
            <button
              onClick={() => setExamTab('theory')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                examTab === 'theory' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              📝 แนวข้อสอบทฤษฎี (32 ข้อ)
            </button>
            <button
              onClick={() => setExamTab('practical')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                examTab === 'practical' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              💻 ภารกิจสอบปฏิบัติ The Performance Update
            </button>
            <button
              onClick={() => setExamTab('templates')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all ${
                examTab === 'templates' ? 'bg-amber-500 text-slate-950 font-black' : 'bg-slate-800 text-slate-300'
              }`}
            >
              📋 แบบฟอร์มตรวจรับงาน (UAT)
            </button>
          </div>
        </div>

        {/* Tab 1: Rules & Schedule */}
        {examTab === 'rules' && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-amber-300 block">1. สอบทฤษฎี (09:00 - 10:00)</span>
                <p className="text-slate-300 m-0 leading-relaxed">
                  • เวลา 60 นาที (ปิดหนังสือ ปิดคอมพิวเตอร์)<br />
                  • ปรนัย 30 ข้อ (30 คะแนน) + อัตนัย 2 ข้อ (10 คะแนน)<br />
                  • ครอบคลุม: ISA-95, HTML/CSS, JavaScript, JSON, REST APIs, และ Software Testing
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-orange-300 block">2. สอบปฏิบัติเดี่ยว (10:00 - 12:00)</span>
                <p className="text-slate-300 m-0 leading-relaxed">
                  • เวลา 120 นาที (60 คะแนน)<br />
                  • พัฒนาหน้าจอ "The Performance Update" ต่อจากโฟลเดอร์ starter<br />
                  • ห้ามปรึกษากัน ห้ามใช้ AI ช่วยเขียน (เปิดดูสไลด์และงานเก่าตัวเองได้)
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                <span className="font-bold text-emerald-300 block">3. UAT Showcase (13:00 - 15:00)</span>
                <p className="text-slate-300 m-0 leading-relaxed">
                  • กิจกรรมตรวจรับงานจริงระหว่างเพื่อนร่วมชั้น<br />
                  • สลับเครื่องกันทดสอบตามแบบฟอร์ม UAT Checklist<br />
                  • ลงชื่อยอมรับ (Accept) หรือแจ้งแก้ไข (Decline)
                </p>
              </div>
            </div>

            <IndustrialDiagramCard 
              imgSrc="./images/enterprise_slides/image97.webp"
              title="User Acceptance Testing (UAT) Sign-off Protocol"
              subtitle="ขั้นตอนการตรวจรับงานจริงระหว่างผู้พัฒนาและผู้ใช้งาน"
              caption="การส่งมอบซอฟต์แวร์ระดับองค์กรต้องผ่านเกณฑ์ UAT 100% โดยผู้ใช้จริงในสภาพแวดล้อมเสมือนจริงก่อนนำขึ้น Production"
              badge="UAT SIGN-OFF"
            />
          </div>
        )}

        {/* Tab 2: Theory Questions Overview */}
        {examTab === 'theory' && (
          <div className="space-y-4 text-xs">
            <div className="flex justify-between items-center p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="font-bold text-white">
                โครงสร้างข้อสอบทฤษฎี: ปรนัย 30 ข้อ (30 คะแนน) + อัตนัย 2 ข้อ (10 คะแนน)
              </span>
              <button
                onClick={() => setShowTheoryAnswers(!showTheoryAnswers)}
                className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold border border-slate-700 cursor-pointer"
              >
                {showTheoryAnswers ? '🔑 ซ่อนเฉลย' : '🔑 แสดงเฉลยแนวคำตอบ'}
              </button>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {(ENTERPRISE_THEORY_EXAM.mcQuestions || []).slice(0, 10).map((q) => (
                <div key={q.n} className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
                  <div className="flex justify-between font-bold text-white">
                    <span>ข้อที่ {q.n}. {q.q}</span>
                    <span className="font-mono text-indigo-400 text-[10px]">{q.clo}</span>
                  </div>
                  {showTheoryAnswers && (
                    <div className="text-emerald-400 font-bold text-[11px] bg-emerald-950/30 p-2 rounded border border-emerald-500/30">
                      คำตอบที่ถูกต้อง: ตัวเลือก {q.ans}
                    </div>
                  )}
                </div>
              ))}
              <div className="text-center text-slate-400 text-[11px] py-2">
                (แสดงตัวอย่าง 10 ข้อแรก · สามารถเปิดดูข้อสอบเต็ม 32 ข้อได้ในแท็บที่ 6 ของหน้าต่างคู่มือวิทยากร)
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Practical Exam Tasks */}
        {examTab === 'practical' && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <h4 className="font-black text-amber-300 m-0 mb-1">
                โจทย์สอบปฏิบัติ: The Performance Update (ภารกิจ 6 ข้อ รวม 60 คะแนน)
              </h4>
              <p className="text-slate-300 m-0 leading-relaxed">
                ให้นักเรียนพัฒนาหน้าจอ Line Performance ต่อจากไฟล์ที่กำหนด โดยต้องจัดหน้าจอ Flexbox (T1), ดึงข้อมูลด้วย fetch async/await (T2), คำนวณ Performance และตัดเกณฑ์สถานะ (T3), ตั้งเวลา Polling ทุก 10 วินาที (T4), ยิงแจ้งเตือน Webhook เมื่อต่ำกว่าเป้า (T5), และเขียนผลการทดสอบ Test Cases 5 กรณี (T6)
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(ENTERPRISE_PRACTICAL_EXAM.tasks || []).map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                  <div className="flex justify-between font-bold text-white">
                    <span>{t.id}: {t.title}</span>
                    <span className="text-amber-400 font-mono">{t.time}</span>
                  </div>
                  <p className="text-slate-300 m-0">{t.detail}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: UAT Templates */}
        {examTab === 'templates' && (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
              <h4 className="font-black text-emerald-400 m-0">
                แบบฟอร์มตรวจรับงานจริง (templates/uat-checklist.md)
              </h4>
              <p className="text-slate-300 m-0 leading-relaxed">
                นักเรียนใช้เอกสารนี้ตรวจเช็คผลงานของเพื่อนในกิจกรรมบ่ายวันที่ 4:
              </p>
              <CodeBlock
                code={ENTERPRISE_TEMPLATES_DATA.uatChecklistMd}
                language="uat-checklist.md"
              />
            </div>
          </div>
        )}
      </section>
    </div>
  );
}

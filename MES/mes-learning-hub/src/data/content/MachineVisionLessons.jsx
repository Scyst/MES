import React, { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { 
  FiEye, 
  FiCamera, 
  FiSun, 
  FiCpu, 
  FiActivity, 
  FiCheckCircle, 
  FiAlertTriangle, 
  FiSettings, 
  FiSliders,
  FiMaximize2,
  FiLayers,
  FiZap,
  FiGrid,
  FiBarChart2,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiArrowRight,
  FiShield,
  FiCrosshair,
  FiTarget,
  FiCode,
  FiBox,
  FiCompass,
  FiDatabase,
  FiSearch,
  FiInfo,
  FiTrendingUp,
  FiMinimize2
} from 'react-icons/fi';

/* ========================================================================= */
/* 1. INTERACTIVE OPTICAL LIGHTING & POLARIZER SIMULATOR                     */
/* ========================================================================= */
function OpticalLightingSimulator() {
  const [lightMode, setLightMode] = useState('front_glare'); // 'front_glare' | 'front_polarizer' | 'coaxial' | 'diffuse_dome' | 'backlight'
  const [filterAngle, setFilterAngle] = useState(90); // Polarizer rotation angle in deg (0 = passes glare, 90 = crosses/cuts glare)

  // Simulation parameters according to lighting mode
  const getLightingInfo = () => {
    switch (lightMode) {
      case 'front_glare':
        return {
          title: '1. Directional Front Light (ไฟส่องตรง 45° ไร้ฟิลเตอร์)',
          description: 'แสงตกกระทบตรงบนชิ้นงานโลหะปั๊มขึ้นรูปที่มีน้ำมันชโลม เกิดแสงสะท้อนจ้า (Specular Glare) เข้าสู่เลนส์กล้องจนขาวโพลน บดบังรอยแตกร้าวและขอบชิ้นงาน',
          glareLevel: 95,
          contrast: '1.4 : 1 (ต่ำมาก)',
          defectVisibility: 12,
          isPassed: false,
          recommendation: 'ไม่เหมาะกับงานโลหะมันวาว หรือชิ้นงานชุบซิงค์/เคลือบน้ำมัน',
          suitableFor: 'กล่องกระดาษ, บรรจุภัณฑ์ผิวด้าน, ชิ้นงานพลาสติกเนื้อหยาบ'
        };
      case 'front_polarizer': {
        const isCut = Math.abs(filterAngle - 90) <= 15;
        return {
          title: '2. Front Light + Polarizing Filter (ไฟหน้าติดแผ่นกรองแสงโพลาไรซ์ CPL)',
          description: isCut 
            ? 'ฟิลเตอร์ตัดแสงโพลาไรซ์แบบไขว้ (Cross-Polarization) สกัดกั้นคลื่นแสงสะท้อนระนาบตรง แสงวาบขาวหายไป 90% เผยรอยแตกร้าวและขอบโลหะคมกริบ'
            : 'มุมโพลาไรเซอร์ยังไม่ตัดแกนสะท้อน (ขนานกับทิศทางแสง) ยังคงมีแสงสะท้อนหลงเหลืออยู่ กรุณาปรับมุมเป็น 90°',
          glareLevel: isCut ? 8 : 75,
          contrast: isCut ? '16.8 : 1 (ดีเยี่ยม)' : '3.2 : 1 (ปานกลาง)',
          defectVisibility: isCut ? 96 : 35,
          isPassed: isCut,
          recommendation: 'วิธีแก้ปัญหาแสงสะท้อนน้ำมันที่คุ้มค่าที่สุด โดยไม่ต้องเปลี่ยนโครงสร้างแท่นกล้อง',
          suitableFor: 'ชิ้นงานปั๊มขึ้นรูปเคลือบน้ำมันหล่อเย็น, รอยเชื่อมทองแดง, แผ่นอลูมิเนียมขัดเงา'
        };
      }
      case 'coaxial':
        return {
          title: '3. Coaxial Light (ไฟร่วมแกน 90° ขนานลำแสงเลนส์ผ่าน Beam Splitter)',
          description: 'ลำแสงเดินทางขนานกับแกนเลนส์ผ่านกระจกกึ่งสะท้อน แสงตกกระทบพื้นผิวเรียบจะสะท้อนกลับเข้ากล้องสว่างเต็มที่ ส่วนรอยขูดขีด/รอยบุบจะกระเจิงแสงออก ทำให้รอยตำหนิปรากฏเป็นเส้นสีดำคมชัด',
          glareLevel: 5,
          contrast: '22.0 : 1 (คมกริบ)',
          defectVisibility: 98,
          isPassed: true,
          recommendation: 'มาตรฐานทองคำสำหรับการตรวจจับรอยขูดขีดบนชิ้นงานเรียบเงา',
          suitableFor: 'แผ่นเวเฟอร์ซิลิคอน, กระจกหน้าจอ, ชิ้นงานขัดเงากระจก, ฝาครอบเครื่องขัดเงา'
        };
      case 'diffuse_dome':
        return {
          title: '4. Diffuse Dome Light (ไฟทรงโดมกระจายแสงรอบทิศ 360° ไร้เงา)',
          description: 'แสงสะท้อนจากผนังโดมโค้งส่องลงทุกทิศทาง ขจัดเงาทอดตัวและแสงสะท้อนจ้าบนพื้นผิวโค้งมน ทำให้ได้แสงนวลสม่ำเสมอทั่วทั้งชิ้นงาน',
          glareLevel: 10,
          contrast: '14.5 : 1 (นุ่มนวลสม่ำเสมอ)',
          defectVisibility: 92,
          isPassed: true,
          recommendation: 'เหมาะกับชิ้นงานรูปทรง 3 มิติ โค้งนูน ที่จัดแสงทิศทางเดียวไม่ได้',
          suitableFor: 'กระป๋องอลูมิเนียม, ท่อทองแดงแอร์, ฝาครอบทรงกลม, แผงวงจร PCB ที่มีอุปกรณ์ความสูงต่างกัน'
        };
      case 'backlight':
        return {
          title: '5. Backlight (ไฟส่องหลังชิ้นงานแบบเงาทึบ Silhouette)',
          description: 'วางแหล่งกำเนิดแสงไว้ด้านหลังชิ้นงาน ชิ้นงานทึบแสงจะปรากฏเป็นเงาดำมืดสนิทตัดกับพื้นหลังสีขาวโพลน 100% Contrast สูงสุดในบรรดาการจัดแสงทั้งหมด',
          glareLevel: 0,
          contrast: '99.0 : 1 (สูงสุดสมบูรณ์แบบ)',
          defectVisibility: 99,
          isPassed: true,
          recommendation: 'ดีที่สุดสำหรับงานวัดขนาด Dimension, ระยะพิตช์เกลียวน็อต, และเช็คขอบครีบ (Burr Check)',
          suitableFor: 'การวัดขนาดภายนอก, รูเจาะ, เกลียวน็อต, ขอบยางโอริง, ชิ้นงานฉลุโปร่ง'
        };
      default:
        return {};
    }
  };

  const current = getLightingInfo();

  return (
    <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-1 border border-cyan-500/30">
            <FiSun className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Optical Simulator &middot; เครื่องมือจำลองการจัดแสง</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            ห้องทดลองเทคนิคแสงอุตสาหกรรมและการตัดแสงสะท้อน (Optical Glare Elimination)
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            คลิกเลือกชนิดของแสงด้านล่างเพื่อเปรียบเทียบภาพที่เซนเซอร์กล้องอุตสาหกรรมมองเห็นจริง
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-3 py-1 rounded-xl text-xs font-black border flex items-center gap-1.5 ${
            current.isPassed 
              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' 
              : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
          }`}>
            {current.isPassed ? <FiCheck className="w-4 h-4" /> : <FiX className="w-4 h-4" />}
            <span>{current.isPassed ? 'ภาพพร้อมตรวจสอบ (PASS)' : 'ภาพใช้การไม่ได้ (FAIL)'}</span>
          </span>
        </div>
      </div>

      {/* Lighting Mode Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        {[
          { id: 'front_glare', label: '1. ไฟส่องตรง (มีแสงจ้า)', icon: '☀️' },
          { id: 'front_polarizer', label: '2. ไฟหน้า + โพลาไรเซอร์', icon: '🕶️' },
          { id: 'coaxial', label: '3. ไฟร่วมแกน (Coaxial)', icon: '🎯' },
          { id: 'diffuse_dome', label: '4. ไฟโดม (Dome Light)', icon: '🎪' },
          { id: 'backlight', label: '5. ไฟส่องหลัง (Backlight)', icon: '💡' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setLightMode(tab.id)}
            className={`p-2.5 rounded-xl text-xs font-bold transition-all text-left flex flex-col justify-between border ${
              lightMode === tab.id
                ? 'bg-cyan-600 text-white border-cyan-400 shadow-lg shadow-cyan-600/30 scale-[1.02]'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
          >
            <span className="text-base mb-1">{tab.icon}</span>
            <span className="leading-snug">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Polarizer Angle Slider (Only for front_polarizer mode) */}
      {lightMode === 'front_polarizer' && (
        <div className="p-3.5 bg-slate-950/80 rounded-xl border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fadeIn">
          <div className="flex items-center gap-2 text-cyan-300 font-bold">
            <FiSliders className="w-4 h-4" />
            <span>ปรับมุมหมุนของฟิลเตอร์ตัดแสงโพลาไรซ์ (CPL Filter Rotation):</span>
            <span className="font-mono text-amber-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {filterAngle}°
            </span>
          </div>
          <div className="flex items-center gap-3 flex-1 max-w-xs">
            <span className="text-[10px] text-slate-400">0° (ไม่ตัดแสง)</span>
            <input 
              type="range" 
              min="0" 
              max="180" 
              step="5" 
              value={filterAngle} 
              onChange={(e) => setFilterAngle(Number(e.target.value))}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            <span className="text-[10px] text-emerald-400 font-bold">90° (ตัดสมบูรณ์)</span>
          </div>
        </div>
      )}

      {/* Dual Canvas: Optical Setup & Camera Viewfinder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        
        {/* Left: Optical Light Path Setup Diagram (SVG) */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <FiSun className="text-amber-400" /> แผนผังทิศทางลำแสง (Optical Ray Path Diagram)
            </span>
            <span className="text-[10px] font-mono text-cyan-400">Physical Setup</span>
          </div>

          <div className="relative aspect-[4/3] w-full rounded-lg bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center p-2">
            <svg viewBox="0 0 400 300" className="w-full h-full">
              <defs>
                <pattern id="opticalGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="400" height="300" fill="url(#opticalGrid)" />

              {/* Workpiece at bottom */}
              <g transform="translate(140, 230)">
                <rect x="0" y="0" width="120" height="30" rx="4" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
                <text x="60" y="20" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">ชิ้นงานโลหะปั๊มขึ้นรูป</text>
                <path d="M 50 0 L 55 12 L 52 18 L 58 30" stroke="#ef4444" strokeWidth="2" fill="none" />
                <circle cx="55" cy="15" r="8" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
                <text x="75" y="38" textAnchor="start" fill="#f87171" fontSize="8" fontWeight="bold">รอยแตกร้าว (Crack)</text>
              </g>

              {/* Industrial Camera at Top Center */}
              <g transform="translate(160, 20)">
                <rect x="0" y="0" width="80" height="50" rx="6" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                <path d="M 20 50 L 60 50 L 50 75 L 30 75 Z" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="40" cy="75" r="8" fill="#0284c7" opacity="0.8" />
                <text x="40" y="25" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">กล้องอุตสาหกรรม</text>
                <text x="40" y="38" textAnchor="middle" fill="#94a3b8" fontSize="8">Global Shutter</text>
              </g>

              {/* Visual Setup Specific to Mode */}
              {lightMode === 'front_glare' && (
                <g>
                  <circle cx="60" cy="120" r="18" fill="#f59e0b" opacity="0.9" />
                  <text x="60" y="124" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="bold">ไฟหน้า 45°</text>
                  <line x1="75" y1="130" x2="190" y2="230" stroke="#fbbf24" strokeWidth="3" strokeDasharray="4,2" />
                  <line x1="70" y1="138" x2="175" y2="230" stroke="#fbbf24" strokeWidth="2" />
                  <line x1="190" y1="230" x2="200" y2="75" stroke="#f87171" strokeWidth="3.5" />
                  <circle cx="190" cy="230" r="14" fill="#ffffff" opacity="0.85" />
                  <text x="215" y="150" fill="#f87171" fontSize="9" fontWeight="bold">แสงสะท้อนจ้า (Glare Bounce!)</text>
                </g>
              )}

              {lightMode === 'front_polarizer' && (
                <g>
                  <circle cx="60" cy="120" r="18" fill="#f59e0b" opacity="0.9" />
                  <text x="60" y="124" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="bold">ไฟหน้า 45°</text>
                  <rect x="75" y="120" width="8" height="30" rx="2" fill="#0284c7" stroke="#38bdf8" transform="rotate(-30 75 120)" />
                  <line x1="85" y1="135" x2="190" y2="230" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3,1" />

                  <rect x="180" y="80" width="40" height="8" rx="2" fill="#0284c7" stroke="#38bdf8" />
                  <text x="230" y="86" fill="#38bdf8" fontSize="8" fontWeight="bold">CPL Filter ({filterAngle}°)</text>

                  {Math.abs(filterAngle - 90) <= 15 ? (
                    <>
                      <line x1="195" y1="230" x2="200" y2="90" stroke="#10b981" strokeWidth="2" />
                      <text x="210" y="140" fill="#10b981" fontSize="9" fontWeight="bold">✓ แสงสะท้อนถูกสกัดกั้น</text>
                      <text x="210" y="155" fill="#34d399" fontSize="8">ผ่านเฉพาะแสง Contrast ชิ้นงาน</text>
                    </>
                  ) : (
                    <>
                      <line x1="195" y1="230" x2="200" y2="88" stroke="#ef4444" strokeWidth="2.5" />
                      <text x="210" y="140" fill="#f87171" fontSize="8" fontWeight="bold">⚠️ ยังมีแสงสะท้อนรั่วไหล</text>
                    </>
                  )}
                </g>
              )}

              {lightMode === 'coaxial' && (
                <g>
                  <rect x="145" y="90" width="110" height="60" rx="4" fill="#0f172a" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3,2" />
                  <rect x="255" y="105" width="20" height="30" rx="3" fill="#f59e0b" />
                  <text x="265" y="98" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">LED Coaxial</text>
                  <line x1="165" y1="145" x2="235" y2="95" stroke="#38bdf8" strokeWidth="3" />
                  <text x="140" y="125" textAnchor="end" fill="#38bdf8" fontSize="8">Beam Splitter (45°)</text>
                  <line x1="255" y1="120" x2="200" y2="120" stroke="#fbbf24" strokeWidth="2.5" />
                  <line x1="200" y1="120" x2="200" y2="230" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="3,2" />
                  <line x1="200" y1="230" x2="200" y2="75" stroke="#818cf8" strokeWidth="2.5" />
                  <text x="210" y="180" fill="#a5b4fc" fontSize="8" fontWeight="bold">แสงตกกระทบ 90° ตรงดิ่ง</text>
                </g>
              )}

              {lightMode === 'diffuse_dome' && (
                <g>
                  <path d="M 120 230 A 80 80 0 0 1 280 230" fill="none" stroke="#e0e7ff" strokeWidth="10" opacity="0.7" />
                  <circle cx="200" cy="150" r="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
                  <text x="200" y="145" textAnchor="middle" fill="#94a3b8" fontSize="7">รูกล้องมอง</text>
                  <line x1="140" y1="180" x2="190" y2="230" stroke="#fef08a" strokeWidth="1.5" />
                  <line x1="260" y1="180" x2="210" y2="230" stroke="#fef08a" strokeWidth="1.5" />
                  <line x1="200" y1="155" x2="200" y2="230" stroke="#fef08a" strokeWidth="1.5" />
                  <text x="200" y="195" textAnchor="middle" fill="#e0e7ff" fontSize="9" fontWeight="bold">แสงกระจาย 360° ไร้เงามืด</text>
                </g>
              )}

              {lightMode === 'backlight' && (
                <g>
                  <rect x="130" y="265" width="140" height="25" rx="4" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
                  <text x="200" y="282" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">💡 Backlight Panel (ไฟส่องหลัง)</text>
                  <line x1="135" y1="265" x2="135" y2="75" stroke="#f8fafc" strokeWidth="3" opacity="0.8" />
                  <line x1="265" y1="265" x2="265" y2="75" stroke="#f8fafc" strokeWidth="3" opacity="0.8" />
                  <text x="60" y="200" fill="#38bdf8" fontSize="9" fontWeight="bold">ขอบชิ้นงานคมกริบ 100%</text>
                  <text x="60" y="215" fill="#94a3b8" fontSize="8">วัดขนาด ±0.005mm</text>
                </g>
              )}
            </svg>
          </div>
          <div className="text-[10px] text-slate-400 mt-2 text-center">
            สเกลจำลองระยะโฟกัส (Working Distance: 150mm &middot; Field of View: 60x45mm)
          </div>
        </div>

        {/* Right: Camera Sensor Output Viewfinder */}
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <FiEye className="text-cyan-400" /> ภาพที่เซนเซอร์กล้องประมวลผล (Camera Sensor Viewfinder)
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
              Live Sensor Frame
            </span>
          </div>

          <div className="relative aspect-[4/3] w-full rounded-lg bg-black border border-slate-800 overflow-hidden flex items-center justify-center p-3">
            {/* Viewfinder Reticle */}
            <div className="absolute inset-2 border border-cyan-500/20 rounded pointer-events-none">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400"></div>
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400"></div>
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400"></div>
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400"></div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border border-cyan-400/30 rounded-full"></div>
            </div>

            {/* Simulated Live Captured Image */}
            <div className="w-full h-full relative flex items-center justify-center">
              {lightMode === 'front_glare' && (
                <div className="w-48 h-32 bg-slate-500 rounded relative overflow-hidden flex items-center justify-center shadow-inner">
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-white opacity-95 blur-[2px]"></div>
                  <div className="absolute w-28 h-28 bg-white rounded-full blur-xl opacity-90 -top-6 -right-6"></div>
                  <span className="absolute bottom-3 left-4 text-[10px] font-mono font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded">
                    ⚠️ แสงสะท้อนกลบรอยร้าว (Miss Defect!)
                  </span>
                </div>
              )}

              {lightMode === 'front_polarizer' && (
                <div className="w-48 h-32 bg-slate-700 rounded relative overflow-hidden flex items-center justify-center border border-slate-600">
                  <div className="w-full h-full bg-gradient-to-r from-slate-600 via-slate-700 to-slate-600"></div>
                  {Math.abs(filterAngle - 90) > 15 && (
                    <div className="absolute inset-0 bg-white/60 blur-md pointer-events-none"></div>
                  )}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <path d="M 80 40 L 95 65 L 88 80 L 102 110" stroke="#ef4444" strokeWidth="2.5" fill="none" />
                    <rect x="70" y="35" width="45" height="85" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeDasharray="3,2" />
                    <text x="120" y="80" fill="#22c55e" fontSize="9" fontWeight="black">ROI: Crack (Length: 4.8mm)</text>
                  </svg>
                  <span className="absolute bottom-2 left-2 text-[9px] font-mono font-bold text-emerald-300 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-500/40">
                    Confidence: {Math.abs(filterAngle - 90) <= 15 ? '98.5%' : '42.0%'}
                  </span>
                </div>
              )}

              {lightMode === 'coaxial' && (
                <div className="w-48 h-32 bg-slate-200 rounded relative overflow-hidden flex items-center justify-center border border-slate-400">
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    <svg className="w-full h-full">
                      <line x1="60" y1="30" x2="140" y2="45" stroke="#0f172a" strokeWidth="3" />
                      <line x1="85" y1="70" x2="110" y2="105" stroke="#0f172a" strokeWidth="2" />
                      <circle cx="100" cy="38" r="16" fill="none" stroke="#ef4444" strokeWidth="1.5" />
                      <text x="120" y="40" fill="#ef4444" fontSize="9" fontWeight="bold">Scratch NG</text>
                    </svg>
                  </div>
                  <span className="absolute bottom-2 left-2 text-[9px] font-mono font-bold text-slate-900 bg-white/90 px-1.5 py-0.5 rounded border border-slate-300">
                    Dark-field Scratch Detection: OK
                  </span>
                </div>
              )}

              {lightMode === 'diffuse_dome' && (
                <div className="w-48 h-32 bg-slate-600 rounded-full relative overflow-hidden flex items-center justify-center border border-slate-500 shadow-inner">
                  <div className="w-full h-full bg-gradient-to-b from-slate-400 via-slate-500 to-slate-700 flex items-center justify-center">
                    <svg className="w-full h-full">
                      <circle cx="96" cy="64" r="30" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,2" />
                      <text x="96" y="68" textAnchor="middle" fill="#ffffff" fontSize="8" fontWeight="bold">Weld Crown</text>
                    </svg>
                  </div>
                  <span className="absolute bottom-2 left-3 text-[9px] font-mono font-bold text-cyan-300 bg-slate-950/80 px-1.5 py-0.5 rounded">
                    Omnidirectional: No Harsh Shadow
                  </span>
                </div>
              )}

              {lightMode === 'backlight' && (
                <div className="w-full h-full bg-white relative flex items-center justify-center">
                  <div className="w-36 h-24 bg-black rounded-lg relative flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-black"></span>
                    </div>
                  </div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    <line x1="80" y1="20" x2="220" y2="20" stroke="#0284c7" strokeWidth="1.5" />
                    <line x1="80" y1="15" x2="80" y2="25" stroke="#0284c7" strokeWidth="1.5" />
                    <line x1="220" y1="15" x2="220" y2="25" stroke="#0284c7" strokeWidth="1.5" />
                    <text x="150" y="15" textAnchor="middle" fill="#0284c7" fontSize="9" fontWeight="black">35.02 mm (&plusmn;0.01)</text>
                  </svg>
                  <span className="absolute bottom-2 right-2 text-[9px] font-mono font-bold text-slate-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                    100% Silhouette Contrast
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs pt-2">
            <span className="text-slate-400">Contrast: <strong className="text-white">{current.contrast}</strong></span>
            <span className="text-slate-400">Defect Visibility: <strong className={current.isPassed ? 'text-emerald-400' : 'text-rose-400'}>{current.defectVisibility}%</strong></span>
          </div>
        </div>
      </div>

      {/* Insight Box */}
      <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2 text-xs">
        <div className="font-bold text-cyan-300 flex items-center gap-2">
          <span>💡 คำอธิบายและคำแนะนำวิศวกรรมหน้างาน (Industrial Engineering Insight):</span>
        </div>
        <p className="text-slate-200 leading-relaxed m-0 font-medium">
          {current.description}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-700/60 mt-2 text-[11px]">
          <div><strong className="text-amber-400">ข้อควรระวัง:</strong> {current.recommendation}</div>
          <div><strong className="text-emerald-400">เหมาะสำหรับ:</strong> {current.suitableFor}</div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 2. INTERACTIVE GLOBAL VS ROLLING SHUTTER COMPARISON                       */
/* ========================================================================= */
function ShutterComparisonSimulator() {
  const { isDark } = useTheme();
  const [conveyorSpeed, setConveyorSpeed] = useState(45); // m/min (0, 30, 60, 90)
  const [activeTab, setActiveTab] = useState('conveyor'); // 'conveyor' | 'real_photo'
  const [photoCase, setPhotoCase] = useState('fan'); // 'fan' | 'barcode'

  const skewAngle = (conveyorSpeed / 90) * 24; // deg
  const measurementError = ((conveyorSpeed / 90) * 16.5).toFixed(1);

  return (
    <div className={`border rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-indigo-500/30' : 'bg-white border-indigo-200 shadow-indigo-500/5'
    }`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold mb-1 border border-indigo-500/30">
            <span>Industrial Sensor Comparison · การเลือกชัตเตอร์เซนเซอร์</span>
          </div>
          <h3 className={`text-base sm:text-lg font-black leading-snug tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Global Shutter vs Rolling Shutter สำหรับชิ้นงานบนสายพานลำเลียง (Conveyor Motion)
          </h3>
          <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            เหตุผลสำคัญที่ห้ามใช้กล้องเว็บแคมหรือมือถือตรวจงานในโรงงาน: ผลกระทบของความเร็วสายพานต่อความแม่นยำเชิงมิติและอัลกอริทึม AI
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 self-start md:self-auto">
          <button
            onClick={() => setActiveTab('conveyor')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'conveyor'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiBox className="w-3.5 h-3.5" />
            <span>จำลองชิ้นงานสายพาน</span>
          </button>
          <button
            onClick={() => setActiveTab('real_photo')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'real_photo'
                ? 'bg-indigo-600 text-white shadow-sm'
                : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FiCamera className="w-3.5 h-3.5" />
            <span>ภาพเปรียบเทียบหน้างานจริง</span>
          </button>
        </div>
      </div>

      {activeTab === 'conveyor' ? (
        <>
          {/* Speed Slider Control */}
          <div className={`p-3 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
          }`}>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>ความเร็วสายพานลำเลียง (Conveyor Speed):</span>
              <input 
                type="range" 
                min="0" 
                max="90" 
                step="15" 
                value={conveyorSpeed} 
                onChange={(e) => setConveyorSpeed(Number(e.target.value))}
                className="w-28 sm:w-40 accent-indigo-500 cursor-pointer"
              />
              <span className="font-mono font-bold text-amber-500 dark:text-amber-300 text-xs bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700 min-w-[75px] text-center shadow-sm">
                {conveyorSpeed} m/min
              </span>
            </div>
            <div className={`text-[11px] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {conveyorSpeed === 0 ? 'ชิ้นงานหยุดนิ่ง (Static Inspection)' : `ชิ้นงานเคลื่อนที่ด้วยความเร็ว ${(conveyorSpeed / 60).toFixed(2)} เมตร/วินาที`}
            </div>
          </div>

          {/* Side-by-Side Conveyor Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Rolling Shutter */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950 border-rose-500/40' : 'bg-rose-50/50 border-rose-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
                <h4 className="font-bold text-rose-700 dark:text-rose-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <FiAlertTriangle className="w-4 h-4 text-rose-500" />
                  Rolling Shutter (กล้องมือถือ / เว็บแคม)
                </h4>
                <span className="self-start sm:self-auto text-[10px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 rounded-full border border-rose-300 dark:border-rose-500/30 whitespace-nowrap">
                  อ่านทีละแถวจากบนลงล่าง (Row Scan)
                </span>
              </div>

              <div className="aspect-[16/9] w-full bg-slate-900 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden shadow-inner">
                <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                  Row Readout Delay: 15 ms
                </div>

                <div 
                  className="w-28 h-28 bg-slate-700/90 border-2 border-rose-400 rounded-md relative flex items-center justify-center shadow-lg transition-all duration-300"
                  style={{
                    transform: `skewX(${skewAngle}deg)`
                  }}
                >
                  <div 
                    className="w-10 h-10 rounded-full border-2 border-rose-300 flex items-center justify-center text-[10px] font-mono font-bold text-rose-200 bg-rose-950/40"
                    style={{
                      transform: `scaleX(${1 + conveyorSpeed / 120})`
                    }}
                  >
                    รีเบี้ยว
                  </div>
                  <span className="absolute -bottom-5 text-[10px] font-mono text-rose-300 font-bold whitespace-nowrap bg-slate-950/90 px-1.5 rounded">
                    อ่านได้: {(50 + (Number(measurementError) * 0.5)).toFixed(2)} mm (เพี้ยน +{measurementError}%)
                  </span>
                </div>
              </div>

              <div className={`text-xs space-y-1.5 pt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>อาการภาพบิดเบี้ยว (Jello Skew):</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-mono">+{measurementError}% (สี่เหลี่ยมกลายเป็นด้านขนาน)</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>ความเสี่ยงหน้างานโรงงาน:</span>
                  <strong className="text-rose-600 dark:text-rose-400 font-mono">ชิ้นงานดีถูกเตะทิ้ง (False Reject) สูงมาก</strong>
                </div>
                <p className={`text-[11px] leading-relaxed pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  เซนเซอร์อ่านข้อมูลทีละแถวจากบนลงล่าง เมื่อชิ้นงานเคลื่อนที่ แถวล่างจะถูกบันทึกช้ากว่าแถวบน ส่งผลให้ชิ้นงานสี่เหลี่ยมกลายเป็นสี่เหลี่ยมด้านขนาน รูเจาะวงกลมกลายเป็นวงรี ระบบ AI วัดขนาดผิดพลาดทันที
                </p>
              </div>
            </div>

            {/* Global Shutter */}
            <div className={`p-4 rounded-xl border space-y-3 ${
              isDark ? 'bg-slate-950 border-emerald-500/40' : 'bg-emerald-50/50 border-emerald-300'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
                <h4 className="font-bold text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm flex items-center gap-1.5">
                  <FiCheckCircle className="w-4 h-4 text-emerald-500" />
                  Global Shutter (มาตรฐานโรงงานอุตสาหกรรม)
                </h4>
                <span className="self-start sm:self-auto text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded-full border border-emerald-300 dark:border-emerald-500/30 whitespace-nowrap">
                  ทุกพิกเซลเปิดพร้อมกัน (Snapshot)
                </span>
              </div>

              <div className="aspect-[16/9] w-full bg-slate-900 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden shadow-inner">
                <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                  Sensor Exposure: 50 μs
                </div>

                <div className="w-28 h-28 bg-slate-700 border-2 border-emerald-400 rounded-md relative flex items-center justify-center shadow-lg transition-transform">
                  <div className="w-10 h-10 rounded-full border-2 border-emerald-300 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-200 bg-emerald-950/40">
                    Ø 20mm
                  </div>
                  <span className="absolute -bottom-5 text-[10px] font-mono text-emerald-300 font-bold whitespace-nowrap bg-slate-950/90 px-1.5 rounded">
                    ขนาด 50.00 mm (Error 0.00%)
                  </span>
                </div>
              </div>

              <div className={`text-xs space-y-1.5 pt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>อาการภาพบิดเบี้ยว (Distortion):</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">0.00% (ไม่มีอาการเอียงแม้แต่น้อย)</strong>
                </div>
                <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-200 dark:border-slate-800">
                  <span className={isDark ? 'text-slate-400' : 'text-slate-500'}>ความแม่นยำในการวัดมิติ:</span>
                  <strong className="text-emerald-600 dark:text-emerald-400 font-mono">±0.01 mm (มาตรฐานชิ้นส่วนยานยนต์)</strong>
                </div>
                <p className={`text-[11px] leading-relaxed pt-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  ทุกพิกเซลในเซนเซอร์เปิดรับแสงพร้อมกันในเสี้ยววินาที ชัตเตอร์อิเล็กทรอนิกส์หยุดการเคลื่อนไหวของชิ้นงานได้ 100% แม้วัตถุจะวิ่งเร็วแค่ไหน มิติของภาพจะไม่บิดเบี้ยว ชิ้นงานดีผ่านการตรวจสอบ 100%
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* Real Industrial Photo Comparison Mode */
        <div className="space-y-4 animate-fadeIn">
          {/* Case selector */}
          <div className="flex items-center gap-2">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>เลือกกรณีศึกษาจากภาพจริง:</span>
            <button
              onClick={() => setPhotoCase('fan')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                photoCase === 'fan'
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}
            >
              🌀 กรณีที่ 1: มอเตอร์ใบพัดหมุนเร็ว (3,000 RPM)
            </button>
            <button
              onClick={() => setPhotoCase('barcode')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                photoCase === 'barcode'
                  ? 'bg-indigo-600 text-white'
                  : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
              }`}
            >
              📦 กรณีที่ 2: บาร์โค้ด & แผงวงจรบนสายพาน 60 m/min
            </button>
          </div>

          {photoCase === 'fan' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Rolling Fan */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-rose-500/40' : 'bg-rose-50/50 border-rose-300'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">ภาพถ่ายจริงด้วย Rolling Shutter</span>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-500/40">
                    ❌ ใบพัดบิดเบี้ยวคล้ายหนวดกุ้ง
                  </span>
                </div>
                {/* Visual Simulation of Fan with Jello Distortion */}
                <div className="aspect-[16/9] w-full bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 200 120" className="w-48 h-32">
                    {/* Center hub */}
                    <circle cx="100" cy="60" r="14" fill="#475569" stroke="#ef4444" strokeWidth="2" />
                    {/* Curved distorted blades (Jello effect) */}
                    <path d="M 100 46 Q 130 30 160 38 Q 145 52 112 56 Z" fill="#ef4444" opacity="0.85" />
                    <path d="M 112 64 Q 140 85 145 115 Q 125 105 102 74 Z" fill="#ef4444" opacity="0.85" />
                    <path d="M 88 62 Q 60 85 35 75 Q 50 60 86 54 Z" fill="#ef4444" opacity="0.85" />
                    <circle cx="100" cy="60" r="5" fill="#f87171" />
                    <text x="100" y="112" textAnchor="middle" fill="#ef4444" fontSize="9" fontWeight="bold">Jello Distortion: Curved Blades</text>
                  </svg>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <strong>ผลกระทบหน้างาน:</strong> แม้จะตั้งความเร็วชัตเตอร์สั้นถึง 1/2000s แต่เนื่องจากเซนเซอร์อ่านค่าทีละบรรทัด (ใช้เวลาอ่านทั้งภาพ 15ms) ขณะที่เซนเซอร์อ่านบรรทัดล่าง ใบพัดได้หมุนเปลี่ยนตำแหน่งไปแล้ว ส่งผลให้ใบพัดที่ตรงกลายเป็นโค้งงอ ผิดเพี้ยนรูปทรงทางเรขาคณิต 100%
                </p>
              </div>

              {/* Global Fan */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-emerald-500/40' : 'bg-emerald-50/50 border-emerald-300'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">ภาพถ่ายจริงด้วย Global Shutter (Industrial)</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/40">
                    ✅ หยุดนิ่ง คมกริบ 100%
                  </span>
                </div>
                {/* Visual Simulation of Fan with Frozen Motion */}
                <div className="aspect-[16/9] w-full bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
                  <svg viewBox="0 0 200 120" className="w-48 h-32">
                    {/* Center hub */}
                    <circle cx="100" cy="60" r="14" fill="#334155" stroke="#10b981" strokeWidth="2" />
                    {/* Perfectly straight frozen blades */}
                    <path d="M 100 46 L 155 18 L 150 35 L 110 52 Z" fill="#10b981" opacity="0.9" />
                    <path d="M 112 64 L 140 115 L 122 118 L 96 73 Z" fill="#10b981" opacity="0.9" />
                    <path d="M 88 58 L 35 55 L 40 38 L 92 48 Z" fill="#10b981" opacity="0.9" />
                    <circle cx="100" cy="60" r="5" fill="#34d399" />
                    <text x="100" y="112" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">Frozen Motion: Straight Blades</text>
                  </svg>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  <strong>ผลลัพธ์ในโรงงาน:</strong> พิกเซลทั้งเซนเซอร์เปิดรับแสงพร้อมกันในเสี้ยวเวลา 50 μs ใบพัดมอเตอร์ 3,000 RPM ถูกหยุดนิ่งสนิท รูปร่างใบพัดตรงสมบูรณ์แบบ สามารถตรวจเช็กรอยแตกร้าวและวัดมุมองศาของใบพัดได้อย่างแม่นยำระดับ 0.01 mm
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Rolling Barcode */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-rose-500/40' : 'bg-rose-50/50 border-rose-300'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300">บาร์โค้ดบนสายพาน 60 m/min (Rolling)</span>
                  <span className="text-[10px] font-bold text-rose-800 bg-rose-100 dark:bg-rose-950 px-2 py-0.5 rounded border border-rose-300 dark:border-rose-500/40">
                    ❌ Decode Failed (บาร์โค้ดเฉียง)
                  </span>
                </div>
                <div className="aspect-[16/9] w-full bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
                  <div className="p-3 bg-white rounded border border-slate-400 transform skew-x-12 shadow">
                    <div className="font-mono text-xs text-rose-600 font-bold mb-1">SCAN FAIL: SKEW &gt; 7°</div>
                    <div className="flex gap-1 h-10 items-center">
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                      <div className="w-0.5 h-full bg-black"></div>
                      <div className="w-3 h-full bg-black"></div>
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                      <div className="w-1.5 h-full bg-black"></div>
                    </div>
                  </div>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  เส้นบาร์โค้ดสี่เหลี่ยมผืนผ้าบิดเอียงเป็นสี่เหลี่ยมด้านขนาน รูสแกนเนอร์ไม่สามารถอ่านความกว้างของแท่งบาร์โค้ดได้ ส่งผลให้ระบบคัดแยกเตะสินค้าทิ้งเป็นของเสีย
                </p>
              </div>

              {/* Global Barcode */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                isDark ? 'bg-slate-950 border-emerald-500/40' : 'bg-emerald-50/50 border-emerald-300'
              }`}>
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300">บาร์โค้ดบนสายพาน 60 m/min (Global)</span>
                  <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 dark:bg-emerald-950 px-2 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/40">
                    ✅ 100% Read Rate (ฉาก 90°)
                  </span>
                </div>
                <div className="aspect-[16/9] w-full bg-slate-950 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
                  <div className="p-3 bg-white rounded border border-emerald-500 shadow">
                    <div className="font-mono text-xs text-emerald-700 font-bold mb-1">PASS: SNC-2026-X9</div>
                    <div className="flex gap-1 h-10 items-center">
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                      <div className="w-0.5 h-full bg-black"></div>
                      <div className="w-3 h-full bg-black"></div>
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-2 h-full bg-black"></div>
                      <div className="w-1.5 h-full bg-black"></div>
                    </div>
                  </div>
                </div>
                <p className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  เส้นบาร์โค้ดตรงขนานตั้งฉาก 90° สมบูรณ์แบบ สแกนเนอร์และโมเดล Vision อ่านค่าสำเร็จใน 1 มิลลิวินาที ไม่เกิดการติดขัดในกระบวนการผลิต
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Engineering Formula Callout */}
      <div className={`p-4 rounded-xl border text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark ? 'bg-slate-950 border-slate-800 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
      }`}>
        <div>
          <span className="text-indigo-600 dark:text-indigo-400 font-bold block mb-0.5">สูตรคำนวณการเบลอจากการเคลื่อนที่ (Motion Blur Formula):</span>
          <span>Blur (pixels) = [ความเร็วสายพาน (mm/s) × เวลาเปิดชัตเตอร์ (s)] / ความละเอียดออปติก (mm/pixel)</span>
        </div>
        <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-slate-900 p-2 rounded-lg border border-emerald-300 dark:border-slate-800 whitespace-nowrap font-bold">
          💡 กฎเหล็กอุตสาหกรรม: ควบคุม Blur ให้น้อยกว่า 1.0 Pixel เสมอ
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. INTERACTIVE OPTICAL FORMULAS & 3-PIXEL RULE CALCULATOR                 */
/* ========================================================================= */
function OpticalFormulasCalculator() {
  const { isDark } = useTheme();
  const [fovWidth, setFovWidth] = useState(100); // mm
  const [minDefect, setMinDefect] = useState(0.1); // mm
  const [workingDist, setWorkingDist] = useState(300); // mm
  const [sensorFormat, setSensorFormat] = useState('2_3'); // '1_3', '1_2', '1_18', '2_3', '1_inch'

  const sensorFormats = {
    '1_3': { name: '1/3" Sensor', width: 4.8, height: 3.6, diag: 6.0, desc: 'กล้องขนาดกะทัดรัด บาร์โค้ดทั่วไป' },
    '1_2': { name: '1/2" Sensor', width: 6.4, height: 4.8, diag: 8.0, desc: 'กล้องมาตรฐานงานประกอบ' },
    '1_18': { name: '1/1.8" Sensor', width: 7.2, height: 5.4, diag: 9.0, desc: 'เซนเซอร์ Sony Pregius ยอดนิยม' },
    '2_3': { name: '2/3" Sensor', width: 8.8, height: 6.6, diag: 11.0, desc: 'ขนาดมาตรฐานอุตสาหกรรม (C-Mount)' },
    '1_inch': { name: '1" Sensor', width: 12.8, height: 9.6, diag: 16.0, desc: 'เซนเซอร์ความละเอียดสูงพิเศษ 12-25 MP' }
  };

  const currSensor = sensorFormats[sensorFormat];

  // 3-Pixel Rule Calculations (Slide 7):
  // Optical Resolution (Horizontal Pixels) = (FOV Width / Defect Size) * 3 pixels
  const requiredPixelsH = Math.round((fovWidth / Math.max(0.01, minDefect)) * 3);
  const requiredPixelsV = Math.round((requiredPixelsH * 3) / 4); // Standard 4:3 industrial aspect ratio
  const rawMegaPixels = (requiredPixelsH * requiredPixelsV) / 1000000;
  const totalMegaPixels = rawMegaPixels.toFixed(2);

  // Recommended Camera Resolution tier
  const getCameraTier = (mp) => {
    if (mp <= 0.4) return 'VGA (0.4 MP) · 640x480';
    if (mp <= 1.3) return '1.3 MP · 1280x1024';
    if (mp <= 2.3) return '2.3 MP · 1920x1200 (Full HD)';
    if (mp <= 5.0) return '5.0 MP · 2448x2048';
    if (mp <= 9.0) return '9.0 MP · 4096x2160';
    if (mp <= 12.0) return '12.0 MP · 4096x3000';
    if (mp <= 20.0) return '20.0 MP · 5472x3648';
    return 'Line Scan Camera หรือ 25+ MP Multi-camera array';
  };

  // Focal Length Formula:
  // f = (Sensor Width * Working Distance) / FOV Width
  const calcFocalLength = ((currSensor.width * workingDist) / fovWidth).toFixed(1);

  // Optical Magnification: M = Sensor Width / FOV Width
  const magnification = (currSensor.width / fovWidth).toFixed(3);

  // Standard C-Mount Lens Options in industrial automation
  const standardLenses = [6, 8, 12, 16, 25, 35, 50, 75];
  const closestLens = standardLenses.reduce((prev, curr) => 
    Math.abs(curr - Number(calcFocalLength)) < Math.abs(prev - Number(calcFocalLength)) ? curr : prev
  );

  return (
    <div className={`border rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-5 transition-all ${
      isDark ? 'bg-slate-900 border-sky-500/30' : 'bg-white border-sky-200 shadow-sky-500/5'
    }`}>
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold mb-1 border border-sky-500/30">
          <FiTarget className="w-3.5 h-3.5 text-sky-500" />
          <span>Industrial Optical Engineering · กฎ 3 พิกเซล & การคำนวณเลนส์</span>
        </div>
        <h3 className={`text-base sm:text-lg font-black leading-snug tracking-tight mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
          ห้องคำนวณความละเอียดกล้อง (3-Pixel Rule) & ทางยาวโฟกัสเลนส์ (Focal Length Calculator)
        </h3>
        <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
          สูตรคำนวณมาตรฐานวิศวกรรมสากลสำหรับจับคู่กล้อง (Camera Resolution) และทางยาวโฟกัสเลนส์ (Focal Length) ให้ตรงกับมิติของชิ้นงานในโรงงาน
        </p>
      </div>

      {/* Educational Optical Geometry Diagram & Glossary */}
      <div className={`p-4 sm:p-5 rounded-xl border space-y-4 ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-sky-50/50 border-sky-200'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 dark:border-slate-800/80 pb-3">
          <div className="flex items-center gap-2">
            <FiInfo className="w-4 h-4 text-sky-500" />
            <h4 className={`font-bold text-xs sm:text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
              📐 แผนภาพเรขาคณิตระบบออปติก (Optical Geometry & 5 Core Parameters)
            </h4>
          </div>
          <span className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
            มาตรฐานวิศวกรรมการจัดวางกล้องและเลนส์อุตสาหกรรม
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
          {/* Optical Diagram Image */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center p-3 rounded-xl bg-white border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
            <img 
              src="./images/optical_geometry.jpg" 
              alt="Industrial Camera Optical Geometry Setup"
              className="max-h-64 object-contain rounded"
              onError={(e) => {
                // Fallback to direct absolute URL if base path differs
                e.target.src = '/images/optical_geometry.jpg';
              }}
            />
            <span className="text-[10px] text-slate-500 font-mono mt-2 text-center">
              รูปที่ 1: ความสัมพันธ์เชิงเรขาคณิตระหว่าง Camera, Sensor, WD, FOV, DOF และ Resolution
            </span>
          </div>

          {/* Core Terms Breakdown (Answers Booker's exact questions) */}
          <div className="lg:col-span-7 space-y-2.5 text-xs">
            {/* Term 1: Sensor Size */}
            <div className={`p-2.5 rounded-lg border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between font-bold mb-0.5">
                <span className="text-purple-600 dark:text-purple-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  1. Sensor Size (ขนาดชิปเซนเซอร์):
                </span>
                <span className="text-[10px] text-slate-500">หน่วย: mm (มิลลิเมตร)</span>
              </div>
              <p className={`text-[11px] leading-relaxed m-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <strong>ที่มา:</strong> คือขนาดกว้าง × ยาวของแผ่นซิลิคอนชิปรับภาพภายในกล้อง (ไม่ใช่ขนาดตัวถังกล้องภายนอก) <strong>เปิดดูได้จาก Datasheet กล้อง</strong> เช่น เซนเซอร์ 2/3" กว้าง 8.8 mm, 1/1.8" กว้าง 7.2 mm
              </p>
            </div>

            {/* Term 2: Working Distance (WD) */}
            <div className={`p-2.5 rounded-lg border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between font-bold mb-0.5">
                <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  2. Working Distance (WD):
                </span>
                <span className="text-[10px] text-slate-500">หน่วย: mm (มิลลิเมตร)</span>
              </div>
              <p className={`text-[11px] leading-relaxed m-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <strong>ที่มา:</strong> ย่อมาจาก <em>Working Distance</em> คือระยะห่างทางกายภาพ วัดจาก <strong>ขอบหน้าสุดของเลนส์ (Front of Lens) ถึงระนาบผิวชิ้นงาน</strong> วัดได้จริงด้วยตลับเมตร หรือดูจากแบบ CAD โครงสร้างเครื่องจักร
              </p>
            </div>

            {/* Term 3: Field of View (FOV) */}
            <div className={`p-2.5 rounded-lg border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between font-bold mb-0.5">
                <span className="text-cyan-600 dark:text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                  3. Field of View (FOV):
                </span>
                <span className="text-[10px] text-slate-500">หน่วย: mm (มิลลิเมตร)</span>
              </div>
              <p className={`text-[11px] leading-relaxed m-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <strong>ที่มา:</strong> ขอบเขตพื้นที่ที่กล้องมองเห็นครอบคลุมชิ้นงาน คำนวณจาก (ขนาดชิ้นงานจริง + เผื่อระยะ Margin ขอบข้าง 10-20%)
              </p>
            </div>

            {/* Term 4: Depth of Field (DOF) & Resolution */}
            <div className={`p-2.5 rounded-lg border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
            }`}>
              <div className="flex items-center justify-between font-bold mb-0.5">
                <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  4. Depth of Field (DOF) & Resolution (ความละเอียด):
                </span>
                <span className="text-[10px] text-slate-500">หน่วย: mm / Pixels</span>
              </div>
              <p className={`text-[11px] leading-relaxed m-0 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                <strong>DOF:</strong> ระยะความลึกหน้า-หลังที่ภาพยังคงโฟกัสชัด · <strong>Resolution:</strong> ขนาดตำหนิเล็กสุดที่ต้องตรวจจับ โดยต้องมีพิกเซลคลุมอย่างน้อย 3 พิกเซลเสมอ (3-Pixel Rule)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Sliders Grid */}
      <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 p-4 rounded-xl border text-xs ${
        isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'
      }`}>
        {/* FOV Width Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold">
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>ขอบเขตภาพ (FOV Width):</span>
            <span className="text-cyan-600 dark:text-cyan-400 font-mono font-bold">{fovWidth} mm</span>
          </div>
          <input 
            type="range" 
            min="20" 
            max="400" 
            step="10" 
            value={fovWidth} 
            onChange={(e) => setFovWidth(Number(e.target.value))}
            className="w-full accent-cyan-500 cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">ความกว้างพื้นที่ตรวจจับชิ้นงาน</div>
        </div>

        {/* Defect Size Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold">
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>รอยตำหนิเล็กสุด (Defect):</span>
            <span className="text-amber-600 dark:text-amber-400 font-mono font-bold">{minDefect} mm</span>
          </div>
          <input 
            type="range" 
            min="0.05" 
            max="1.5" 
            step="0.05" 
            value={minDefect} 
            onChange={(e) => setMinDefect(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">ขนาด Defect ที่ต้องมองเห็น</div>
        </div>

        {/* Working Distance Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold">
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>ระยะห่างกล้อง (WD):</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{workingDist} mm</span>
          </div>
          <input 
            type="range" 
            min="100" 
            max="800" 
            step="20" 
            value={workingDist} 
            onChange={(e) => setWorkingDist(Number(e.target.value))}
            className="w-full accent-emerald-500 cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">ระยะจากหน้าเลนส์ถึงชิ้นงาน (วัดหน้างาน)</div>
        </div>

        {/* Sensor Format Select */}
        <div className="space-y-1.5">
          <div className="flex justify-between font-bold">
            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>ขนาดเซนเซอร์กล้อง (Sensor):</span>
            <span className="text-purple-600 dark:text-purple-400 font-mono font-bold">{currSensor.width} mm</span>
          </div>
          <select 
            value={sensorFormat} 
            onChange={(e) => setSensorFormat(e.target.value)}
            className={`w-full border rounded-lg p-1.5 text-xs focus:outline-none focus:border-purple-500 ${
              isDark ? 'bg-slate-900 border-slate-700 text-white' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <option value="1_3">1/3" (4.8 x 3.6 mm) — ชิปขนาดเล็ก</option>
            <option value="1_2">1/2" (6.4 x 4.8 mm)</option>
            <option value="1_18">1/1.8" (7.2 x 5.4 mm) — Sony Pregius</option>
            <option value="2_3">2/3" (8.8 x 6.6 mm) — มาตรฐานโรงงาน</option>
            <option value="1_inch">1" (12.8 x 9.6 mm) — ความละเอียดสูง</option>
          </select>
          <div className="text-[10px] text-slate-500">ดูจาก Datasheet ชิปเซนเซอร์กล้อง</div>
        </div>
      </div>

      {/* Calculated Results Cards with Step-by-Step Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 3-Pixel Rule Resolution & MP Breakdown */}
        <div className={`p-4 rounded-xl border space-y-2 flex flex-col justify-between ${
          isDark ? 'bg-slate-950 border-sky-500/40' : 'bg-sky-50/70 border-sky-300 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>1. กฎ 3 พิกเซล (3-Pixel Rule)</span>
              <span className="text-[10px] font-mono bg-sky-500/20 text-sky-700 dark:text-sky-300 px-2 py-0.5 rounded-full border border-sky-500/30">
                Noise Immunity
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black font-mono text-sky-600 dark:text-sky-400">{requiredPixelsH}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">พิกเซลแนวนอน (H)</span>
            </div>

            <div className={`text-[11px] border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1.5 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">ความละเอียดรวม:</span>
                <strong className="text-sky-600 dark:text-white font-mono text-sm">{totalMegaPixels} MP</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">รุ่นกล้องที่แนะนำในตลาด:</span>
                <strong className="text-emerald-600 dark:text-emerald-400 font-bold" dangerouslySetInnerHTML={{ __html: getCameraTier(Number(totalMegaPixels)) }}></strong>
              </div>
            </div>
          </div>

          {/* Explicit MP explanation box answering Booker */}
          <div className={`p-2.5 rounded-lg border text-[10px] space-y-1 mt-2 ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
          }`}>
            <div className="font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
              <span>💡 ค่า MP หาจากไหน?</span>
            </div>
            <div>
              <strong>สูตร:</strong> (Pixels_H × Pixels_V) / 1,000,000<br/>
              = ({requiredPixelsH} × {requiredPixelsV}) / 1,000,000 = <strong>{totalMegaPixels} Megapixels (MP)</strong>
            </div>
            <div className="text-[9px] text-slate-500 italic">
              *แนะนำรุ่นกล้องในตลาดที่ ≥ {totalMegaPixels} MP เพราะผู้ผลิตกล้องผลิตตามมาตรฐานชิป (1.3, 2.3, 5, 12 MP)
            </div>
          </div>
        </div>

        {/* Card 2: Focal Length Calculation & WD / Sensor Source Breakdown */}
        <div className={`p-4 rounded-xl border space-y-2 flex flex-col justify-between ${
          isDark ? 'bg-slate-950 border-amber-500/40' : 'bg-amber-50/70 border-amber-300 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>2. ทางยาวโฟกัส (Focal Length)</span>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-700 dark:text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                f = (Sensor × WD) / FOV
              </span>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-2xl font-black font-mono text-amber-600 dark:text-amber-400">{calcFocalLength}</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">มิลลิเมตร (mm)</span>
            </div>

            <div className={`text-[11px] border-t border-slate-200 dark:border-slate-800 pt-2 space-y-1.5 ${
              isDark ? 'text-slate-300' : 'text-slate-700'
            }`}>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">เลนส์มาตรฐาน C-Mount:</span>
                <strong className="text-amber-600 dark:text-amber-300 font-mono text-sm font-black">{closestLens} mm</strong>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500 dark:text-slate-400">อัตราขยาย (Magnification):</span>
                <strong className="font-mono">{magnification}x</strong>
              </div>
            </div>
          </div>

          {/* Explicit Sensor & WD explanation box answering Booker */}
          <div className={`p-2.5 rounded-lg border text-[10px] space-y-1 mt-2 ${
            isDark ? 'bg-slate-900/90 border-slate-800 text-slate-400' : 'bg-white border-slate-200 text-slate-600'
          }`}>
            <div className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
              <span>💡 Sensor และ WD มาจากไหน?</span>
            </div>
            <div>
              <strong>Sensor:</strong> {currSensor.width} mm (กว้างชิปเซนเซอร์ใน Datasheet กล้อง)<br/>
              <strong>WD:</strong> {workingDist} mm (วัดจากหน้าเลนส์ถึงชิ้นงานด้วยตลับเมตร)<br/>
              <strong>แทนค่า:</strong> ({currSensor.width} × {workingDist}) / {fovWidth} = <strong>{calcFocalLength} mm</strong>
            </div>
            <div className="text-[9px] text-slate-500 italic">
              *เลือกเลนส์ขนาดใกล้เคียง ({closestLens} mm) แล้วปรับระยะติดตั้ง WD ชดเชยหน้างานเล็กน้อย
            </div>
          </div>
        </div>

        {/* Card 3: Sensor Coverage & Vignetting Warning */}
        <div className={`p-4 rounded-xl border space-y-2 flex flex-col justify-between ${
          isDark ? 'bg-slate-950 border-purple-500/40' : 'bg-purple-50/70 border-purple-300 shadow-sm'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className={`text-xs font-bold ${isDark ? 'text-slate-300' : 'text-slate-800'}`}>3. ขนาดเลนส์ vs เซนเซอร์</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30">
                Vignetting Check
              </span>
            </div>

            <div className={`text-xs space-y-1.5 pt-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              <div className={`p-2 rounded-lg border ${
                isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'
              }`}>
                <span className="text-slate-500 dark:text-slate-400 block text-[10px]">กฎการจับคู่ Image Circle (Slide 9):</span>
                <strong className="text-emerald-600 dark:text-emerald-400">วงภาพเลนส์ ≥ ขนาดเซนเซอร์กล้อง เสมอ</strong>
              </div>
              <ul className="text-[11px] space-y-1 pt-1 list-disc list-inside">
                <li>เลนส์ 2/3" บนเซนเซอร์ 1/2" = <span className="text-emerald-600 dark:text-emerald-400 font-bold">OK (ภาพสว่างเต็มเฟรม)</span></li>
                <li>เลนส์ 1/2" บนเซนเซอร์ 2/3" = <span className="text-rose-600 dark:text-rose-400 font-bold">FAIL (เกิดขอบมืด Vignetting)</span></li>
              </ul>
            </div>
          </div>

          <div className={`text-[10px] p-2 rounded-lg border ${
            isDark ? 'text-slate-400 bg-purple-950/30 border-purple-500/20' : 'text-slate-700 bg-white border-purple-200'
          }`}>
            💡 <strong>Telecentric Lens:</strong> ทางเลือกพิเศษสำหรับงานวัดขนาดชิ้นงานโลหะ/พลาสติก ลดความเพี้ยนเปอร์สเปกทีฟเป็น 0 แม้ระยะวัตถุเลื่อน
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 4. PYTHON & OPENCV INDUSTRIAL WORKSHOP (13 CORE TECHNIQUES)               */
/* ========================================================================= */
function OpenCVPythonWorkshop() {
  const [selectedOp, setSelectedOp] = useState(0);

  const operations = [
    {
      id: 'roi',
      title: '1. Cropping & Slicing (ROI)',
      func: 'image[y:y+h, x:x+w]',
      category: 'Basic Geometry',
      code: `# กำหนดขอบเขต ROI ชิ้นงานเพื่อลดเวลาประมวลผล\nimport cv2\n\nimage = cv2.imread('conveyor_part.jpg')\n# Numpy Slicing: [Y_start:Y_end, X_start:X_end]\nroi = image[120:280, 200:450]\n\n# ประมวลผลเฉพาะบริเวณนี้ (เร็วขึ้น 400%)\ncv2.imshow('Inspection ROI', roi)`,
      factoryUse: 'ตัดเฉพาะบริเวณที่ต้องการตรวจ เช่น จุดเชื่อม, ปากขวด, ตัวหนังสือ เพื่อลดภาระการคำนวณของ IPC ให้ Cycle Time ทันรอบผลิต'
    },
    {
      id: 'copy_paste',
      title: '2. Sub-region Paste / Clone',
      func: 'image[y2:y2+h, x2:x2+w] = roi',
      category: 'Data Augmentation',
      code: `# ก๊อบปี้จุดบกพร่องไปจำลองบนตำแหน่งอื่นของชิ้นงาน\nroi = image[50:100, 50:100]\n# วางทับลงบนตำแหน่งใหม่\nimage[150:200, 250:300] = roi\n\n# ใช้สร้าง Synthetic NG Data สำหรับเทรนโมเดล AI`,
      factoryUse: 'สร้างข้อมูลภาพของเสียจำลอง (Synthetic NG Data) เพื่อเทรนโมเดล AI ในกรณีที่ของเสียจริงหน้างานเกิดขึ้นน้อยมาก'
    },
    {
      id: 'resize',
      title: '3. Resizing & Interpolation',
      func: 'cv2.resize(img, (w, h), cv2.INTER_...)',
      category: 'Preprocessing',
      code: `# ย่อขนาดภาพให้ตรงกับ Input Dimension ของโมเดล AI\n# INTER_AREA: ดีที่สุดสำหรับการย่อขนาดภาพ\nresized_area = cv2.resize(image, (640, 640), interpolation=cv2.INTER_AREA)\n\n# INTER_CUBIC: เหมาะกับการขยายภาพความละเอียดสูง\nzoomed = cv2.resize(roi, (400, 400), interpolation=cv2.INTER_CUBIC)`,
      factoryUse: 'ปรับขนาดภาพกล้อง 5MP หรือ 12MP ลงมาเป็น 640x640 เพื่อป้อนเข้า YOLO AI Engine ให้ทำความเร็วได้เกิน 60 FPS'
    },
    {
      id: 'flip',
      title: '4. Image Flipping (Augmentation)',
      func: 'cv2.flip(image, flipCode)',
      category: 'Data Augmentation',
      code: `# พลิกภาพเพื่อเพิ่มความหลากหลายของชุดข้อมูลเทรน\nflipped_h = cv2.flip(image, 1)   # แนวนอน (Horizontal)\nflipped_v = cv2.flip(image, 0)   # แนวตั้ง (Vertical)\nflipped_hv = cv2.flip(image, -1) # พลิกทั้งสองแกน`,
      factoryUse: 'แก้ปัญหาโมเดล AI จำทิศทาง เช่น ชิ้นงานที่หมุนมาบนสายพานคนละมุม ให้โมเดลฉลาดขึ้นโดยไม่ต้องเก็บรูปเพิ่ม 2 เท่า'
    },
    {
      id: 'padding',
      title: '5. Padding / Make Border',
      func: 'cv2.copyMakeBorder(...)',
      category: 'Preprocessing',
      code: `# เพิ่มขอบดำรอบภาพเพื่อรักษา Aspect Ratio ก่อนเข้า AI\n# BORDER_CONSTANT: เติมขอบสีเดียว (เช่น สีดำ 0,0,0)\npadded = cv2.copyMakeBorder(\n    image, top=20, bottom=20, left=50, right=50,\n    borderType=cv2.BORDER_CONSTANT, value=[0, 0, 0]\n)`,
      factoryUse: 'จัดสัดส่วนภาพให้เป็นสี่เหลี่ยมจัตุรัสตามข้อกำหนดของ Neural Network โดยไม่ทำให้ชิ้นงานยืดหดจนมิติเพี้ยน (Letterboxing)'
    },
    {
      id: 'annotation',
      title: '6. Annotation & Drawing',
      func: 'cv2.rectangle / putText / circle',
      category: 'Visualization',
      code: `# วาดตีกรอบสีเขียวเมื่อผลเป็น PASS หรือสีแดงเมื่อ FAIL\ncolor = (0, 255, 0) if is_ok else (0, 0, 255)\ncv2.rectangle(image, (x, y), (x+w, y+h), color, 2)\ncv2.putText(image, f"RESULT: {'OK' if is_ok else 'NG'}", \n            (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)`,
      factoryUse: 'แสดงผลบนหน้าจอ Operator หน้าเครื่องจักร ตีกรอบตำแหน่งที่พบ Defect แบบ Real-time เพื่อให้พนักงานสังเกตเห็นทันที'
    },
    {
      id: 'color_spaces',
      title: '7. Color Spaces: BGR vs HSV',
      func: 'cv2.cvtColor(img, cv2.COLOR_BGR2HSV)',
      category: 'Color Analysis',
      code: `# แปลงภาพจาก BGR เป็น HSV เพื่อแยกสีชิ้นงานทนต่อแสงผันผวน\nhsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)\n\n# กำหนดช่วงสีทองแดง (Copper Wire Mask)\nlower_copper = (10, 100, 100)\nupper_copper = (25, 255, 255)\nmask = cv2.inRange(hsv, lower_copper, upper_copper)`,
      factoryUse: 'คัดแยกสายไฟ ขั้วแบตเตอรี่ หรือชิ้นส่วนทองแดง โดยค่าความสว่างแสงในโรงงาน (V) ที่เปลี่ยนระหว่างวันจะไม่รบกวนเฉดสี (H)'
    },
    {
      id: 'histogram',
      title: '8. Histogram & CLAHE',
      func: 'cv2.createCLAHE(...)',
      category: 'Contrast Enhancement',
      code: `# เร่งคอนทราสต์บริเวณรอยร้าวในเงามืดด้วย CLAHE\ngray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)\nclahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))\nenhanced = clahe.apply(gray)\n\n# ช่วยดึงรายละเอียดรอยขูดขีดบนชิ้นงานสีดำ`,
      factoryUse: 'แก้ปัญหาชิ้นงานสีดำหรืออยู่ในเงามืด เพิ่ม Contrast เฉพาะจุดโดยไม่ทำให้บริเวณที่สว่างอยู่แล้วขาวโพลนจนสูญเสียข้อมูล'
    },
    {
      id: 'morphology',
      title: '9. Morphological Operations',
      func: 'cv2.morphologyEx(..., MORPH_OPEN/CLOSE)',
      category: 'Filtering',
      code: `kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))\n\n# MORPH_OPEN: ลบ Noise จุดขาวเล็กๆ (Erode แล้ว Dilate)\nclean_mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, kernel)\n\n# MORPH_CLOSE: อุดรูรั่วสีดำในชิ้นงาน (Dilate แล้ว Erode)\nsolid_part = cv2.morphologyEx(clean_mask, cv2.MORPH_CLOSE, kernel)`,
      factoryUse: 'ลบคราบละอองฝุ่นและน้ำมันหล่อเย็นขนาดเล็กไม่ให้ถูกตัดสินเป็นของเสีย และอุดรูพรุนของชิ้นงานฉีดขึ้นรูป'
    },
    {
      id: 'video_stream',
      title: '10. Camera Video Stream Loop',
      func: 'cap = cv2.VideoCapture(0)',
      category: 'Acquisition',
      code: `cap = cv2.VideoCapture(0, cv2.CAP_DSHOW) # DirectShow เร็วสุดบน Windows\nwhile cap.isOpened():\n    ret, frame = cap.read()\n    if not ret: break\n    # รันโค้ดตรวจสอบภาพที่นี่...\n    key = cv2.waitKey(1)\n    if key == 27: break # กด ESC เพื่อหยุด\ncap.release()`,
      factoryUse: 'ลูปประมวลผลภาพแบบต่อเนื่องจากกล้องอุตสาหกรรม GigE / USB3 เชื่อมต่อกับ SDK ของแบรนด์ เช่น Basler pylon หรือ Hikrobot'
    },
    {
      id: 'canny',
      title: '11. Canny Edge Detection',
      func: 'cv2.Canny(gray, threshold1, threshold2)',
      category: 'Edge Detection',
      code: `# ตรวจจับขอบตัดชิ้นงานด้วยอัลกอริทึม Canny ขจัด Noise สองชั้น\ngray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)\nblurred = cv2.GaussianBlur(gray, (5, 5), 0)\nedges = cv2.Canny(blurred, 50, 150)\n\n# ได้เส้นขอบความหนา 1 พิกเซลคมกริบ`,
      factoryUse: 'หาขอบชิ้นงานโลหะเพื่อนำไปวัดระยะพิตช์เกลียวน็อต รัศมีความโค้ง และรอยบิ่นของใบมีดกลึง'
    },
    {
      id: 'contours',
      title: '12. Contours & Shape Analysis',
      func: 'cv2.findContours(...)',
      category: 'Feature Extraction',
      code: `contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)\nfor cnt in contours:\n    area = cv2.contourArea(cnt)\n    perimeter = cv2.arcLength(cnt, True)\n    if area > 500: # กรองเฉพาะชิ้นงานจริง\n        cv2.drawContours(image, [cnt], -1, (0, 255, 0), 2)`,
      factoryUse: 'คำนวณพื้นที่ (Area), เส้นรอบรูป (Perimeter), และจุดศูนย์กลางมวล (Centroid) เพื่อตรวจเช็คความสมบูรณ์ของชิ้นงาน'
    },
    {
      id: 'template_matching',
      title: '13. Template Matching & Tracking',
      func: 'cv2.matchTemplate(img, templ, TM_CCOEFF_NORMED)',
      category: 'Pattern Matching',
      code: `# ค้นหาชิ้นส่วนแม่แบบ (Golden Part) บนภาพงานจริง\nres = cv2.matchTemplate(gray, template, cv2.TM_CCOEFF_NORMED)\nmin_val, max_val, min_loc, max_loc = cv2.minMaxLoc(res)\n\nif max_val >= 0.85: # ความเหมือนมากกว่า 85%\n    # พบชิ้นงานที่ตำแหน่ง max_loc\n    cv2.rectangle(image, max_loc, (max_loc[0]+w, max_loc[1]+h), (0,255,0), 2)`,
      factoryUse: 'ตรวจสอบความมีอยู่ (Presence/Absence) ของสติกเกอร์ โลโก้ และชิ้นส่วนประกอบย่อยในระบบ Poka-Yoke'
    }
  ];

  const curr = operations[selectedOp];

  return (
    <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-1 border border-emerald-500/30">
            <FiCode className="w-3.5 h-3.5 text-emerald-400" />
            <span>Python &amp; OpenCV Workshop &middot; 13 ทักษะวิศวกรรมภาพโรงงาน</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            คลังฟังก์ชัน OpenCV และการนำไปเขียน Logic ตรวจสอบในโรงงานอุตสาหกรรม
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            ถอดบทเรียนจากหลักสูตรกลาง Machine Vision: สรุปโค้ด Python และโจทย์การใช้งานจริงในสายการผลิต
          </p>
        </div>
      </div>

      {/* Operation Tabs Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-1.5">
        {operations.map((op, idx) => (
          <button
            key={op.id}
            onClick={() => setSelectedOp(idx)}
            className={`p-2 rounded-xl text-[11px] font-bold text-left transition-all border truncate ${
              selectedOp === idx
                ? 'bg-emerald-600 text-white border-emerald-400 shadow-md shadow-emerald-600/30'
                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            <span className="block opacity-70 text-[9px] font-mono">{op.category}</span>
            <span className="truncate block">{op.title.split('. ')[1]}</span>
          </button>
        ))}
      </div>

      {/* Code & Explanation Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
        {/* Left: Code Block (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-emerald-400 flex items-center gap-2">
                <FiCode /> {curr.title}
              </span>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                {curr.func}
              </span>
            </div>
            <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
              <code>{curr.code}</code>
            </pre>
          </div>
          <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
            <span>หมวดหมู่: <strong className="text-emerald-300">{curr.category}</strong></span>
            <span className="text-slate-500 font-mono">Python 3.10+ &middot; OpenCV 4.8+</span>
          </div>
        </div>

        {/* Right: Industrial Factory Application Insight (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold block mb-1">
              🏭 การใช้งานจริงในโรงงานอุตสาหกรรม (Industrial Use Case)
            </span>
            <h4 className="text-sm font-black text-white mb-2">{curr.title}</h4>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
              {curr.factoryUse}
            </p>
          </div>

          <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5 text-[11px]">
            <div className="text-cyan-400 font-bold flex items-center gap-1.5">
              <FiCheckCircle className="w-3.5 h-3.5" /> ข้อดีของฟังก์ชันนี้:
            </div>
            <div className="text-slate-400">
              ทำงานบน CPU มาตรฐานได้ทันที ไม่ต้องพึ่งพาการ์ดจอ GPU ประหยัดต้นทุนฮาร์ดแวร์สำหรับสายการผลิต
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 5. AI VISION & YOLO 4-STAGE MECHANISM EXPLORER                            */
/* ========================================================================= */
function AIVisionArchitectureLab() {
  const [activeStage, setActiveStage] = useState(1);

  const yoloStages = [
    {
      num: 1,
      title: '1. Grid Division (แบ่งตาราง S x S)',
      desc: 'YOLO จะแบ่งภาพอินพุตออกเป็นตารางกริดย่อย เช่น 7x7 หรือ 19x19 เซลล์ หากจุดศูนย์กลางของชิ้นงานตกอยู่ในกริดเซลล์ใด กริดเซลล์นั้นจะเป็นผู้รับผิดชอบในการตรวจจับชิ้นงานนั้น',
      tech: 'S x S Grid Cells',
      highlight: 'ตรวจจับทุกจุดพร้อมกันใน Pass เดียว'
    },
    {
      num: 2,
      title: '2. Bounding Box & Confidence Prediction',
      desc: 'แต่ละกริดเซลล์จะทำนายกล่อง Bounding Box พร้อมค่าความเชื่อมั่น (Confidence Score) และคลาสของชิ้นงาน (x, y, w, h, class_prob) โดยคำนวณผ่านชั้น Convolutional แบบรวดเร็ว',
      tech: 'Direct Regression (x, y, w, h, conf)',
      highlight: 'ไม่เสียเวลาสร้าง Region Proposals เหมือน R-CNN'
    },
    {
      num: 3,
      title: '3. Intersection over Union (IoU)',
      desc: 'สูตรวัดความทับซ้อนระหว่างกล่องที่โมเดลทำนายกับกล่องจริง: IoU = Area of Overlap / Area of Union โดยในโรงงาน ค่า IoU > 0.5 ถึง 0.7 จะถือว่าเป็นกล่องที่ถูกต้องแม่นยำ',
      tech: 'IoU = (Area of Overlap) / (Area of Union)',
      highlight: 'เกณฑ์มาตรฐานสากลในการวัดความแม่นยำ'
    },
    {
      num: 4,
      title: '4. Non-Maximum Suppression (NMS)',
      desc: 'เมื่อโมเดลทำนายกล่องซ้ำซ้อนรอบชิ้นงานเดียวกัน NMS จะคัดเลือกเฉพาะกล่องที่มีค่า Confidence สูงที่สุด และตัดกล่องที่มีค่าทับซ้อน (IoU สูง) ทิ้งไป เหลือเฉพาะ 1 กล่องที่แม่นยำที่สุด',
      tech: 'Eliminate Redundant Overlapping Boxes',
      highlight: 'ป้องกันการนับชิ้นงานซ้ำสองครั้งบนสายพาน'
    }
  ];

  const curr = yoloStages[activeStage - 1];

  return (
    <div className="bg-slate-900 border border-purple-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold mb-1 border border-purple-500/30">
            <FiCpu className="w-3.5 h-3.5 text-purple-400" />
            <span>AI Deep Learning Architecture &middot; สถาปัตยกรรม YOLO</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            ทำความเข้าใจกลไก 4 ขั้นตอนของอัลกอริทึม YOLO ในสายการผลิตจริง
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            เหตุใด YOLO (You Only Look Once) จึงครองความเป็นที่หนึ่งในโรงงานอัจฉริยะ: ตรวจจับชิ้นงานแบบ One-Stage ความเร็วสูง
          </p>
        </div>
      </div>

      {/* 4 CV Tasks Comparison Tabs */}
      <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
        <span className="text-[11px] font-bold text-slate-400 block">ลำดับขั้น 4 งานของ Computer Vision (Slides 36-39):</span>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-blue-400 font-bold block mb-1">1. Classification</span>
            <span className="text-slate-300 text-[11px]">ชิ้นงานอะไร? ตัดสินภาพรวม OK / NG</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-sky-400 font-bold block mb-1">2. Localization</span>
            <span className="text-slate-300 text-[11px]">ชิ้นงานอะไร อยู่ตรงไหน (1 กล่อง)</span>
          </div>
          <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/40">
            <span className="text-purple-300 font-bold block mb-1">3. Object Detection (YOLO)</span>
            <span className="text-slate-200 text-[11px]">ตรวจจับหลายชิ้น หลายตำแหน่งพร้อมกัน</span>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800">
            <span className="text-emerald-400 font-bold block mb-1">4. Segmentation</span>
            <span className="text-slate-300 text-[11px]">ระบายสีแยกพิกเซลตามขอบรอยแตกร้าว</span>
          </div>
        </div>
      </div>

      {/* YOLO 4-Stage Stepper Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
        {yoloStages.map(st => (
          <button
            key={st.num}
            onClick={() => setActiveStage(st.num)}
            className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${
              activeStage === st.num
                ? 'bg-purple-600 text-white border-purple-400 shadow-md shadow-purple-600/30'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="w-5 h-5 rounded-full bg-purple-950 text-purple-300 text-[10px] flex items-center justify-center font-black">
                {st.num}
              </span>
              <span className="text-[10px] opacity-75 font-mono">Stage {st.num}</span>
            </div>
            <div className="truncate font-bold">{st.title.split('. ')[1]}</div>
          </button>
        ))}
      </div>

      {/* Stage Detail Card with SVG Simulation */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-stretch">
        {/* SVG Graphic (6 cols) */}
        <div className="md:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center relative aspect-[4/3] overflow-hidden">
          <svg className="w-full h-full" viewBox="0 0 320 240">
            {/* Background Workpiece */}
            <rect x="20" y="20" width="280" height="200" rx="8" fill="#1e293b" stroke="#475569" strokeWidth="2" />
            <circle cx="160" cy="120" r="45" fill="#334155" stroke="#64748b" strokeWidth="2" />
            <text x="160" y="125" textAnchor="middle" fill="#94a3b8" fontSize="11" fontWeight="bold">ชิ้นงานปั๊มโลหะ</text>

            {/* Stage 1: Grid Lines */}
            {activeStage === 1 && (
              <g>
                {[60, 110, 160, 210, 260].map((x, i) => (
                  <line key={`x-${i}`} x1={x} y1="20" x2={x} y2="220" stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3,3" />
                ))}
                {[60, 100, 140, 180].map((y, i) => (
                  <line key={`y-${i}`} x1="20" y1={y} x2="300" y2={y} stroke="#a855f7" strokeWidth="1.5" strokeDasharray="3,3" />
                ))}
                <rect x="110" y="100" width="50" height="40" fill="#a855f7" opacity="0.3" />
                <circle cx="135" cy="120" r="4" fill="#facc15" />
                <text x="135" y="90" textAnchor="middle" fill="#facc15" fontSize="10" fontWeight="bold">Responsible Cell</text>
              </g>
            )}

            {/* Stage 2: Multiple Bounding Boxes */}
            {activeStage === 2 && (
              <g>
                <rect x="100" y="65" width="120" height="110" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="4,2" />
                <text x="105" y="60" fill="#f43f5e" fontSize="9">Box A: 0.92</text>
                <rect x="115" y="70" width="105" height="100" fill="none" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3,2" />
                <text x="120" y="85" fill="#fbbf24" fontSize="9">Box B: 0.78</text>
                <rect x="95" y="75" width="130" height="105" fill="none" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="3,2" />
                <text x="95" y="195" fill="#38bdf8" fontSize="9">Box C: 0.65</text>
              </g>
            )}

            {/* Stage 3: IoU Formula Graphic */}
            {activeStage === 3 && (
              <g>
                <rect x="105" y="70" width="100" height="95" fill="#0284c7" opacity="0.4" stroke="#38bdf8" strokeWidth="2" />
                <rect x="125" y="80" width="95" height="95" fill="#10b981" opacity="0.4" stroke="#22c55e" strokeWidth="2" />
                <text x="160" y="130" textAnchor="middle" fill="#ffffff" fontSize="11" fontWeight="black">Overlap Area</text>
                <text x="160" y="200" textAnchor="middle" fill="#38bdf8" fontSize="10" fontWeight="bold">IoU = 0.74 &ge; 0.50 (Match!)</text>
              </g>
            )}

            {/* Stage 4: NMS Result */}
            {activeStage === 4 && (
              <g>
                {/* Suppressed boxes in faint gray */}
                <rect x="115" y="70" width="105" height="100" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
                <rect x="95" y="75" width="130" height="105" fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="2,2" opacity="0.4" />
                {/* Winner Box */}
                <rect x="100" y="65" width="120" height="110" fill="none" stroke="#22c55e" strokeWidth="2.5" />
                <rect x="100" y="45" width="120" height="20" fill="#22c55e" rx="2" />
                <text x="160" y="59" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">Part_OK: 94.8%</text>
              </g>
            )}
          </svg>
        </div>

        {/* Text Explanation (6 cols) */}
        <div className="md:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-purple-400 font-bold block mb-1">
              {curr.title}
            </span>
            <h4 className="text-base font-black text-white mb-2">{curr.tech}</h4>
            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
              {curr.desc}
            </p>
          </div>

          <div className="p-3 bg-purple-950/30 rounded-xl border border-purple-500/20 text-xs">
            <span className="text-purple-300 font-bold block mb-1">⚡ ข้อได้เปรียบทางวิศวกรรม:</span>
            <span className="text-slate-300">{curr.highlight}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 6. THREE FACTORY WORKSHOPS & CASE STUDIES (SLIDES 49-55)                  */
/* ========================================================================= */
function IndustrialWorkshopsLab() {
  const [selectedCase, setSelectedCase] = useState('count');

  const workshops = {
    count: {
      title: 'Workshop 1: Conveyor Part Counting (ระบบตรวจนับจำนวนชิ้นงาน)',
      badge: 'Blob Analysis + Tracking',
      problem: 'ชิ้นงานโลหะวิ่งผ่านสายพานลำเลียงด้วยความเร็ว 60 ชิ้น/นาที มีปัญหาชิ้นงานวางชิดกันหรือแสงไฟสะท้อนขอบ ทำให้ตัวนับเซนเซอร์ลำแสงธรรมดานับผิดพลาด',
      pipeline: [
        '1. ปรับเกณฑ์แสงด้วยไฟ Backlight เพื่อตัดเงาสะท้อน',
        '2. แปลงภาพเป็น Grayscale แล้วทำ Gaussian Blur (5x5)',
        '3. ใช้ Otsu Automatic Thresholding ตัดพื้นผิว',
        '4. ทำ Morphological Opening ขจัดละอองฝุ่น',
        '5. หา Contours และคำนวณ Centroid ติดตามข้ามเฟรม'
      ],
      code: `# ตัวอย่างโค้ดตรวจนับชิ้นงานบนสายพาน (Slide 49)\nimport cv2\n\ngray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)\nblurred = cv2.GaussianBlur(gray, (5, 5), 0)\n_, thresh = cv2.threshold(blurred, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)\n\n# หาขอบชิ้นงานและนับจำนวน\ncontours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)\npart_count = sum(1 for cnt in contours if cv2.contourArea(cnt) > 800)\n\nprint(f"Current Conveyor Parts: {part_count}")`
    },
    missing: {
      title: 'Workshop 2: Missing & Excess Part Check (ระบบ Poka-Yoke ชิ้นส่วนขาด/เกิน)',
      badge: 'Multi-ROI + Template Match',
      problem: 'ชุดประกอบคอมเพรสเซอร์แอร์ต้องติดตั้งโอริงยาง 2 ตัว สกรูยึด 4 ตัว และสลักสปริง หากคนประกอบลืมใส่ ชิ้นงานจะเกิดการรั่วซึม (Leak NG) ที่ปลายทาง',
      pipeline: [
        '1. ใช้ Coaxial Light ส่องตรงเพื่อให้ยางโอริงมืดตัดกับเนื้อโลหะ',
        '2. กำหนดจุดตรวจ Multi-ROI 6 จุดย่อยตามตำแหน่งประกอบ',
        '3. ตรวจสอบความมีอยู่ (Presence/Absence) ด้วย Blob Area',
        '4. ผูกตรรกะ Boolean AND: ผลลัพธ์ต้อง PASS ครบทั้ง 6 ตำแหน่ง',
        '5. หากขาดตำแหน่งใด สั่งสัญญาณ Trigger เตะลงราง Reject ทันที'
      ],
      code: `# ระบบ Poka-Yoke ตรวจเช็คน็อตครบ 6 ตัว (Slide 51)\nbolt_status = []\nfor roi in bolt_rois:\n    crop = gray[roi['y']:roi['y']+roi['h'], roi['x']:roi['x']+roi['w']]\n    _, mask = cv2.threshold(crop, 80, 255, cv2.THRESH_BINARY_INV)\n    area = cv2.countNonZero(mask)\n    is_present = area > min_bolt_area\n    bolt_status.append(is_present)\n\nis_assembly_ok = all(bolt_status) # ต้องครบทุกตัว 100%`
    },
    robot_guidance: {
      title: 'Workshop 3: Robot Pick & Place Guidance (ระบบวิชันนำทางแขนกล)',
      badge: 'Guidance (X, Y, Theta)',
      problem: 'ชิ้นงานปั๊มขึ้นรูปไหลมาบนสายพานแบบไม่กำหนดตำแหน่งแน่นอน ชิ้นงานเอียงทำมุมสุ่ม แขนกล Robot ไม่สามารถหยิบเข้าแม่พิมพ์ปั๊มได้หากไม่รู้พิกัดและมุมเอียง',
      pipeline: [
        '1. ใช้เลนส์ Telecentric หรือปรับ Calibrate กล้องลด Distortion',
        '2. คำนวณหา Minimum Bounding Rectangle ด้วย cv2.minAreaRect',
        '3. ดึงพิกัดจุดกึ่งกลาง (X, Y) เป็นพิกเซล แล้วแปลงเป็นมิลลิเมตร (mm)',
        '4. คำนวณมุมหมุน Orientation Angle (theta) ของชิ้นงาน',
        '5. ส่งแพ็กเก็ตพิกัด (X, Y, Angle) ผ่าน TCP/IP หรือ Modbus ไปยัง Robot'
      ],
      code: `# คำนวณพิกัดและมุมส่งให้ Robot (Slide 53)\nrect = cv2.minAreaRect(contour) # ((cx, cy), (w, h), angle)\n(cx, cy), (w, h), angle = rect\n\n# แปลงพิกัดพิกเซลเป็นพิกัดจริงมิลลิเมตร (Camera Matrix Scaling)\nreal_x_mm = cx * mm_per_pixel\nreal_y_mm = cy * mm_per_pixel\n\n# ส่งข้อมูลเข้า Robot Controller ผ่าน Socket\nsocket.send(f"{real_x_mm:.2f},{real_y_mm:.2f},{angle:.1f}\\n".encode())`
    }
  };

  const curr = workshops[selectedCase];

  return (
    <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold mb-1 border border-amber-500/30">
            <FiLayers className="w-3.5 h-3.5 text-amber-400" />
            <span>Industrial Case Studies &middot; กรณีศึกษาและเวิร์กช็อปจริง</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            3 เวิร์กช็อปมาตรฐานโรงงานอุตสาหกรรม (Part Counting, Poka-Yoke &amp; Robot Guidance)
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            โจทย์จริงจากหน้างาน SNC Former และโรงงานประกอบอัจฉริยะ พร้อมอัลกอริทึมและโค้ดตัวอย่าง
          </p>
        </div>
      </div>

      {/* Workshop Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {Object.entries(workshops).map(([key, item]) => (
          <button
            key={key}
            onClick={() => setSelectedCase(key)}
            className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${
              selectedCase === key
                ? 'bg-amber-600 text-white border-amber-400 shadow-md shadow-amber-600/30'
                : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
            }`}
          >
            <span className="block text-[10px] text-amber-300 font-mono mb-0.5">{item.badge}</span>
            <span className="font-bold truncate block">{item.title.split(': ')[0]}</span>
          </button>
        ))}
      </div>

      {/* Detailed Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left: Problem & Pipeline (6 cols) */}
        <div className="lg:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
          <div>
            <h4 className="text-sm font-black text-white mb-1">{curr.title}</h4>
            <div className="p-3 bg-rose-950/30 border border-rose-500/20 rounded-lg text-xs text-slate-300 leading-relaxed mb-3">
              <strong className="text-rose-400 block mb-1">โจทย์ความท้าทายหน้างาน (Problem Statement):</strong>
              {curr.problem}
            </div>
          </div>

          <div className="space-y-1.5">
            <span className="text-[11px] font-bold text-amber-300 block">ลำดับขั้นตอนการแก้ปัญหา (Algorithm Pipeline):</span>
            <div className="space-y-1 text-xs text-slate-300 bg-slate-900 p-3 rounded-lg border border-slate-800">
              {curr.pipeline.map((step, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="text-amber-400 font-mono text-[11px]">•</span>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Code Sample (6 cols) */}
        <div className="lg:col-span-6 bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5">
                <FiCode /> ตัวอย่างการเขียน Logic (OpenCV Python)
              </span>
              <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                Production-Ready
              </span>
            </div>
            <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
              <code>{curr.code}</code>
            </pre>
          </div>
          <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 mt-2">
            💡 <strong>Industrial Tip:</strong> ในการใช้งานจริง ควรเขียนเป็น Multithreading แยกเธรดการดึงภาพออกจากเธรดประมวลผลเพื่อป้องกัน Frame Drop
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 7. INTERACTIVE RULE-BASED VS AI VISION TOOL INSPECTOR                     */
/* ========================================================================= */
function VisionLogicInspector() {
  const [activeCase, setActiveCase] = useState('caliper');

  const cases = {
    caliper: {
      title: 'Case 1: การวัดขนาดมิติ & รูน็อต (Dimension Caliper Tool)',
      type: 'Classical Rule-Based Vision',
      tool: 'Sub-pixel Edge Caliper & Peak Finding',
      speed: '3.5 ms',
      accuracy: '&plusmn;0.005 mm',
      badgeClass: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
      description: 'ใช้สูตรคณิตศาสตร์ตรวจจับขอบตัดขาว-ดำ (Sobel Edge Derivative) ค้นหาจุดพิกัดรอยต่อชิ้นงาน เหมาะสำหรับงานวัดขนาดรูเจาะ, ความกว้างปีกโลหะ, และระยะห่างพิน',
      strength: 'ประมวลผลเร็วระดับเสี้ยววินาที ไม่ต้องเทรนภาพตัวอย่าง แม่นยำระดับไมครอน'
    },
    barcode: {
      title: 'Case 2: การอ่านโค้ด 2D DataMatrix บนผิวโลหะยิงเลเซอร์ (DPM Reader)',
      type: 'Classical Rule-Based Vision',
      tool: 'ISO/IEC 15415 2D Grading Algorithm',
      speed: '8.2 ms',
      accuracy: 'Grade A/B Verification',
      badgeClass: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
      description: 'วิเคราะห์ Dot Matrix ขนาด 10x10 หรือ 12x12 มม. ที่ยิงด้วยไฟเบอร์เลเซอร์บนแผ่นเหล็ก แม้ผิวจะมีคราบน้ำมันหรือรอยขูดขีดก็สามารถถอดรหัสและประเมินเกรดคุณภาพการพิมพ์ได้',
      strength: 'มีระบบ Reed-Solomon Error Correction กู้คืนข้อมูลได้แม้โค้ดจะเสียหายถึง 30%'
    },
    ai_crack: {
      title: 'Case 3: การตรวจรอยแตกร้าว & รอยไหม้จุดเชื่อมสปอต (AI Deep Learning)',
      type: 'AI Deep Learning Vision',
      tool: 'Semantic Segmentation (U-Net / YOLOv8-Seg)',
      speed: '24.0 ms',
      accuracy: 'IoU 0.94 / F1-Score 98.2%',
      badgeClass: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
      description: 'เมื่อรอยตำหนิมีรูปทรงไม่แน่นอน รอยไหม้สปอตมีขอบเบลอ และผิวเหล็กมีความหยาบไม่เท่ากัน Rule-Based จะตั้งเงื่อนไขยากมาก แต่ AI Deep Learning สามารถแยกแยะรอยแตกร้าวได้แม่นยำสูง',
      strength: 'ทนต่อความผันแปรของสภาพแสงหน้างานและคราบสกปรก เรียนรู้จากตัวอย่างภาพ NG ที่คนกำหนด'
    },
    blob: {
      title: 'Case 4: การตรวจนับจำนวนชิ้นงานและเศษขยะตกค้าง (Blob Analysis)',
      type: 'Classical Rule-Based Vision',
      tool: 'Connected Component Labeling & Area Filter',
      speed: '4.8 ms',
      accuracy: '100% Count Precision',
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
      description: 'แปลงภาพเป็น Binary (ขาว-ดำ) แล้วนับกลุ่มพิกเซลที่เชื่อมต่อกัน (Blobs) เพื่อตรวจสอบว่าน็อตครบ 8 ตัวหรือไม่ หรือมีเศษโลหะหลุดร่วงตกค้างอยู่ในเบ้าแม่พิมพ์หรือไม่',
      strength: 'ง่าย ทรงพลัง ตรวจจับสิ่งแปลกปลอมในจิ๊กป้องกันแม่พิมพ์พัง (Poka-Yoke)'
    }
  };

  const curr = cases[activeCase];

  return (
    <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-1 border border-violet-500/30">
            <FiSliders className="w-3.5 h-3.5 text-violet-400" />
            <span>Inspection Algorithm Lab &middot; เปรียบเทียบตรรกะการตรวจจับ</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            Rule-Based Vision vs AI Deep Learning: เลือกใช้เครื่องมือให้ถูกกับโจทย์โรงงาน
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            คลิกเลือกโจทย์หน้างานเพื่อดูตัวอย่าง ROI, Algorithm, และความเร็วในการประมวลผล
          </p>
        </div>

        <span className={`px-3 py-1 rounded-xl text-xs font-black border ${curr.badgeClass}`}>
          {curr.type}
        </span>
      </div>

      {/* Case Selector Tabs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        {Object.entries(cases).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setActiveCase(key)}
            className={`p-3 rounded-xl text-xs font-bold transition-all text-left border ${
              activeCase === key
                ? 'bg-violet-600 text-white border-violet-400 shadow-lg shadow-violet-600/30'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
          >
            <div className="font-mono text-[10px] text-violet-300 mb-0.5">{val.type}</div>
            <div className="font-bold truncate">{val.title.split(':')[0]}</div>
          </button>
        ))}
      </div>

      {/* Live Algorithm Inspection Box */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-stretch">
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 relative flex flex-col justify-between overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
              <FiCrosshair className="text-cyan-400" /> {curr.title}
            </span>
            <span className="text-[10px] font-mono text-emerald-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
              Cycle Time: {curr.speed}
            </span>
          </div>

          <div className="relative aspect-[16/10] w-full bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-center overflow-hidden">
            {activeCase === 'caliper' && (
              <svg className="w-full h-full" viewBox="0 0 320 200">
                <rect x="40" y="30" width="240" height="140" rx="8" fill="#334155" stroke="#64748b" strokeWidth="2" />
                <circle cx="160" cy="100" r="40" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
                <circle cx="160" cy="100" r="40" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,2" />
                {[0, 45, 90, 135, 180, 225, 270, 315].map((ang, i) => {
                  const rad = (ang * Math.PI) / 180;
                  const x = 160 + 40 * Math.cos(rad);
                  const y = 100 + 40 * Math.sin(rad);
                  return (
                    <g key={i}>
                      <circle cx={x} cy={y} r="3" fill="#38bdf8" />
                      <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke="#ef4444" strokeWidth="1" />
                    </g>
                  );
                })}
                <rect x="85" y="45" width="150" height="25" rx="4" fill="#0f172a" opacity="0.9" stroke="#38bdf8" />
                <text x="160" y="62" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                  DIA: 20.008 mm (OK)
                </text>
              </svg>
            )}

            {activeCase === 'barcode' && (
              <svg className="w-full h-full" viewBox="0 0 320 200">
                <rect x="50" y="25" width="220" height="150" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                <g transform="translate(110, 50)">
                  <rect x="0" y="0" width="100" height="100" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
                  <rect x="0" y="0" width="10" height="100" fill="#0f172a" />
                  <rect x="0" y="90" width="100" height="10" fill="#0f172a" />
                  <rect x="90" y="0" width="10" height="20" fill="#0f172a" />
                  <rect x="90" y="40" width="10" height="20" fill="#0f172a" />
                  <rect x="90" y="80" width="10" height="20" fill="#0f172a" />
                  <rect x="25" y="25" width="20" height="20" fill="#0f172a" />
                  <rect x="55" y="25" width="15" height="15" fill="#0f172a" />
                  <rect x="30" y="55" width="30" height="20" fill="#0f172a" />
                </g>
                <text x="160" y="175" textAnchor="middle" fill="#22c55e" fontSize="10" fontWeight="bold">
                  ✓ DECODED: "SNC-PART-2026-X01" &middot; ISO Grade A
                </text>
              </svg>
            )}

            {activeCase === 'ai_crack' && (
              <svg className="w-full h-full" viewBox="0 0 320 200">
                <rect x="40" y="25" width="240" height="150" rx="6" fill="#475569" />
                <circle cx="160" cy="100" r="50" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                <path d="M 140 85 Q 160 95 155 125 T 175 140" stroke="#f43f5e" strokeWidth="4" fill="none" />
                <rect x="130" y="75" width="55" height="75" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3,2" />
                <rect x="130" y="55" width="90" height="18" fill="#f43f5e" rx="2" />
                <text x="135" y="68" fill="#ffffff" fontSize="9" fontWeight="bold">
                  Defect: Crack 98.6%
                </text>
              </svg>
            )}

            {activeCase === 'blob' && (
              <svg className="w-full h-full" viewBox="0 0 320 200">
                <rect x="40" y="25" width="240" height="150" rx="8" fill="#1e293b" stroke="#38bdf8" />
                {[
                  { x: 90, y: 65, ok: true },
                  { x: 160, y: 65, ok: true },
                  { x: 230, y: 65, ok: true },
                  { x: 90, y: 135, ok: true },
                  { x: 160, y: 135, ok: true },
                  { x: 230, y: 135, ok: false }
                ].map((item, idx) => (
                  <g key={idx}>
                    <circle cx={item.x} cy={item.y} r="22" fill={item.ok ? '#0284c7' : '#ef4444'} opacity={item.ok ? 0.9 : 0.2} stroke={item.ok ? '#38bdf8' : '#f87171'} strokeWidth="2" />
                    {item.ok ? (
                      <text x={item.x} y={item.y + 4} textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">#{idx + 1}</text>
                    ) : (
                      <text x={item.x} y={item.y + 4} textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">MISSING!</text>
                    )}
                  </g>
                ))}
                <text x="160" y="192" textAnchor="middle" fill="#ef4444" fontSize="10" fontWeight="bold">
                  ⚠️ POKA-YOKE ALARM: ตรวจพบน็อต 5/6 ตัว (ขาดตำแหน่งขวาล่าง)
                </text>
              </svg>
            )}
          </div>
        </div>

        <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 flex flex-col justify-between space-y-4 text-xs">
          <div>
            <div className="text-[11px] font-mono text-violet-400 font-bold mb-1">อัลกอริทึมที่ใช้งาน:</div>
            <div className="text-base font-bold text-white mb-2">{curr.tool}</div>
            <p className="text-slate-300 leading-relaxed mb-4">
              {curr.description}
            </p>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">ความเร็วในการคำนวณ (Execution Time):</span>
                <strong className="text-emerald-400 font-mono font-bold">{curr.speed}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">ระดับความแม่นยำ (Accuracy / Tolerance):</span>
                <strong className="text-cyan-400 font-mono font-bold" dangerouslySetInnerHTML={{ __html: curr.accuracy }}></strong>
              </div>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-[11px] text-slate-300">
            <strong className="text-amber-400 block mb-1">จุดเด่นหน้างาน (Why use this?):</strong>
            {curr.strength}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 8. CONFUSION MATRIX & THRESHOLD TUNING LAB                                */
/* ========================================================================= */

// สถิติจำลอง: คะแนนความมั่นใจของชิ้นงานเสีย (เฉลี่ย 25) และชิ้นงานดี (เฉลี่ย 88)
const DEFECTIVE_SCORE_DIST = { mean: 25, sd: 8 };
const GOOD_SCORE_DIST = { mean: 88, sd: 7 };
const CURVE_X_MIN = 40;
const CURVE_X_RANGE = 440;
const CURVE_BASELINE_Y = 150;
const CURVE_PEAK_HEIGHT = 120;

// Complementary error function (Numerical Recipes erfcc, relative error < 1.2e-7)
function complementaryErrorFunction(value) {
  const absValue = Math.abs(value);
  const t = 1 / (1 + 0.5 * absValue);
  const polynomial = -absValue * absValue - 1.26551223 + t * (1.00002368 + t * (0.37409196 + t * (0.09678418
    + t * (-0.18628806 + t * (0.27886807 + t * (-1.13520398 + t * (1.48851587 + t * (-0.82215223 + t * 0.17087277))))))));
  const result = t * Math.exp(polynomial);
  return value >= 0 ? result : 2 - result;
}

// P(score >= threshold) สำหรับกลุ่มที่มีค่าเฉลี่ยและ SD ที่กำหนด
function probabilityAtOrAbove(threshold, { mean, sd }) {
  return 0.5 * complementaryErrorFunction((threshold - mean) / (sd * Math.SQRT2));
}

function scoreToCurveX(score) {
  return CURVE_X_MIN + (score / 100) * CURVE_X_RANGE;
}

// ความสูงของเส้นโค้งแบบขยายหาง (รากที่สองของความหนาแน่น) เพื่อให้มองเห็นพื้นที่ซ้อนทับชัดเจน
function scoreToCurveY(score, { mean, sd }) {
  const z = (score - mean) / sd;
  return CURVE_BASELINE_Y - CURVE_PEAK_HEIGHT * Math.exp(-0.25 * z * z);
}

function buildCurveAreaPath(distribution, fromScore, toScore) {
  const points = [];
  for (let score = fromScore; score <= toScore; score += 1) {
    points.push(`${scoreToCurveX(score).toFixed(1)},${scoreToCurveY(score, distribution).toFixed(1)}`);
  }
  points.push(`${scoreToCurveX(toScore).toFixed(1)},${scoreToCurveY(toScore, distribution).toFixed(1)}`);
  return `M ${scoreToCurveX(fromScore)},${CURVE_BASELINE_Y} L ${points.join(' L ')} L ${scoreToCurveX(toScore)},${CURVE_BASELINE_Y} Z`;
}

function ThresholdTuningLab() {
  const [threshold, setThreshold] = useState(50);

  const escapeRate = probabilityAtOrAbove(threshold, DEFECTIVE_SCORE_DIST);
  const overkillRate = 1 - probabilityAtOrAbove(threshold, GOOD_SCORE_DIST);
  const escapePPM = Math.round(escapeRate * 1000000);
  const overkillPercent = (overkillRate * 100).toFixed(2);
  const thresholdX = scoreToCurveX(threshold);

  return (
    <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-1 border border-rose-500/30">
            <FiTarget className="w-3.5 h-3.5 text-rose-400" />
            <span>Quality Engineering Lab &middot; การปรับจูนค่าเกณฑ์ตัดสิน</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            การปรับจูน Threshold: ป้องกัน Escape Defect (0 PPM) และควบคุม Overkill (&lt; 0.5%)
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            ทำความเข้าใจสมดุลระหว่างความปลอดภัยของลูกค้าและ Yield การผลิตในโรงงานจริง
          </p>
        </div>

        {/* Threshold Slider Control */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300">Threshold:</span>
          <input 
            type="range" 
            min="20" 
            max="95" 
            value={threshold} 
            onChange={(e) => setThreshold(Number(e.target.value))}
            className="w-28 accent-rose-500 cursor-pointer"
          />
          <span className="font-mono font-black text-rose-300 text-sm bg-slate-800 px-2.5 py-0.5 rounded border border-slate-700 min-w-[55px] text-center">
            {threshold}%
          </span>
        </div>
      </div>

      {/* KPI Cards Comparison */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Escape Defect */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
          escapePPM === 0 
            ? 'bg-emerald-950/30 border-emerald-500/40' 
            : 'bg-rose-950/40 border-rose-500 shadow-lg shadow-rose-950/50'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-300">ของเสียหลุดรอดสู่ลูกค้า (Escape Rate / Underkill)</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                escapePPM === 0 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500 text-white animate-pulse'
              }`}>
                {escapePPM === 0 ? 'ปลอดภัยระดับสากล' : 'วิกฤตร้ายแรง!'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-2">
              <span className={`text-3xl font-black font-mono ${escapePPM === 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {escapePPM}
              </span>
              <span className="text-xs text-slate-400">PPM (ของเสียหลุดรอดต่อชิ้นงานเสีย 1 ล้านชิ้น)</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2 m-0">
            {escapePPM === 0 
              ? '✓ ไม่พบของเสียหลุดรอดไปยังลูกค้า ระบบคัดแยกตัดชิ้นงานชำรุดออกได้ 100%' 
              : '⚠️ ค่าเกณฑ์หลวมเกินไป! มีชิ้นงานแตกร้าวหลุดรอดสู่ลูกค้า เสี่ยงถูกเคลมคุณภาพหลักล้าน'}
          </p>
        </div>

        {/* False Reject */}
        <div className={`p-4 rounded-xl border flex flex-col justify-between transition-all ${
          Number(overkillPercent) <= 0.5 
            ? 'bg-emerald-950/30 border-emerald-500/40' 
            : 'bg-amber-950/30 border-amber-500/40'
        }`}>
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-300">งานดีถูกเตะทิ้ง (False Reject / Overkill)</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                Number(overkillPercent) <= 0.5 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
              }`}>
                {Number(overkillPercent) <= 0.5 ? 'Yield สูงตามเป้า' : 'Yield ตก ต้องคัดกรองซ้ำ'}
              </span>
            </div>
            <div className="flex items-baseline gap-2 my-2">
              <span className={`text-3xl font-black font-mono ${Number(overkillPercent) <= 0.5 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {overkillPercent}%
              </span>
              <span className="text-xs text-slate-400">ของชิ้นงานดีทั้งหมดในไลน์</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2 m-0">
            {Number(overkillPercent) <= 0.5 
              ? '✓ ควบคุมอัตราการทิ้งชิ้นงานดีต่ำกว่า 0.5% โรงงานไม่สูญเสียต้นทุนวัตถุดิบเกินจำเป็น' 
              : '⚠️ ค่าเกณฑ์ตึงเกินไป! คราบฝุ่นหรือรอยสะท้อนแสงถูกตัดสินเป็นของเสีย ทำให้ต้องใช้พนักงานยืนตรวจซ้ำ'}
          </p>
        </div>
      </div>

      {/* Beginner-friendly guide: how to read the distribution chart */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="text-xs font-bold text-slate-300">
          วิธีอ่านกราฟด้านล่าง (สำหรับผู้เริ่มต้น)
        </div>
        <ol className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[11px] text-slate-300 leading-relaxed list-none p-0 m-0">
          <li className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <strong className="text-cyan-400 block mb-0.5">1. กล้องให้คะแนนทุกชิ้นงาน</strong>
            ระบบวิชันให้ &quot;คะแนนความมั่นใจ&quot; 0-100 แก่ชิ้นงานทุกชิ้น โดย 0 คือเสียชัดเจน และ 100 คือดีสมบูรณ์แบบ
          </li>
          <li className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <strong className="text-amber-400 block mb-0.5">2. ภูเขาคือจำนวนชิ้นงาน</strong>
            ภูเขาสีแดงคือกลุ่มชิ้นงานเสีย (คะแนนต่ำ) ภูเขาสีเขียวคือกลุ่มชิ้นงานดี (คะแนนสูง) ยิ่งภูเขาสูงยิ่งมีชิ้นงานคะแนนนั้นมาก
          </li>
          <li className="p-3 rounded-lg bg-slate-900 border border-slate-800">
            <strong className="text-sky-400 block mb-0.5">3. เส้นฟ้าคือเกณฑ์ตัดสิน</strong>
            ชิ้นงานที่คะแนนอยู่ทางขวาของเส้นจะผ่าน (OK) ส่วนทางซ้ายของเส้นจะถูกเตะทิ้ง (NG) ลองเลื่อน Threshold เพื่อดูผล
          </li>
        </ol>
      </div>

      {/* Bell Curve Gaussian SVG */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="text-xs font-bold text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
          <span>เส้นโค้งการแจกแจงค่าการตรวจ (Distribution Curves &amp; Decision Boundary)</span>
          <span className="text-[10px] text-cyan-400 font-mono">Sweet Spot: 65% - 70%</span>
        </div>
        <div className="relative aspect-[16/7] w-full bg-slate-900 rounded-lg p-2">
          <svg className="w-full h-full" viewBox="0 0 500 180">
            <line x1="40" y1="150" x2="480" y2="150" stroke="#475569" strokeWidth="1.5" />
            <text x="40" y="168" fill="#94a3b8" fontSize="10">0 (เสียชัดเจน)</text>
            <text x="480" y="168" textAnchor="end" fill="#94a3b8" fontSize="10">100 (ดีสมบูรณ์)</text>

            {/* Full distribution curves */}
            <path d={buildCurveAreaPath(DEFECTIVE_SCORE_DIST, 0, 100)} fill="rgba(244, 63, 94, 0.18)" stroke="#f43f5e" strokeWidth="2" />
            <path d={buildCurveAreaPath(GOOD_SCORE_DIST, 0, 100)} fill="rgba(34, 197, 94, 0.18)" stroke="#22c55e" strokeWidth="2" />
            <text x={scoreToCurveX(DEFECTIVE_SCORE_DIST.mean)} y="38" textAnchor="middle" fill="#fb7185" fontSize="11" fontWeight="bold">กลุ่มชิ้นงานเสีย</text>
            <text x={scoreToCurveX(GOOD_SCORE_DIST.mean)} y="38" textAnchor="middle" fill="#4ade80" fontSize="11" fontWeight="bold">กลุ่มชิ้นงานดี</text>

            {/* Risk areas: defective parts passing (right of line) and good parts rejected (left of line) */}
            {threshold < 100 && (
              <path d={buildCurveAreaPath(DEFECTIVE_SCORE_DIST, threshold, 100)} fill="rgba(244, 63, 94, 0.85)" />
            )}
            {threshold > 0 && (
              <path d={buildCurveAreaPath(GOOD_SCORE_DIST, 0, threshold)} fill="rgba(245, 158, 11, 0.85)" />
            )}

            {/* Threshold line */}
            <line x1={thresholdX} y1="10" x2={thresholdX} y2="150" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4,3" />
            <rect x={thresholdX - 45} y="10" width="90" height="18" rx="9" fill="#0284c7" />
            <text x={thresholdX} y="22.5" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
              Threshold: {threshold}%
            </text>
            <text x={thresholdX - 6} y="143" textAnchor="end" fill="#fbbf24" fontSize="9" fontWeight="bold">NG ◀</text>
            <text x={thresholdX + 6} y="143" textAnchor="start" fill="#4ade80" fontSize="9" fontWeight="bold">▶ OK</text>
          </svg>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] leading-relaxed">
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900 border border-rose-500/30 text-slate-300">
            <span className="w-3 h-3 rounded-sm bg-rose-500 flex-shrink-0 mt-1"></span>
            <span><strong className="text-rose-300">พื้นที่แดงทางขวาของเส้น</strong> = ชิ้นงานเสียที่คะแนนสูงพอจะผ่านเกณฑ์ (Escape) อันตรายต่อลูกค้า</span>
          </div>
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-slate-900 border border-amber-500/30 text-slate-300">
            <span className="w-3 h-3 rounded-sm bg-amber-500 flex-shrink-0 mt-1"></span>
            <span><strong className="text-amber-300">พื้นที่ส้มทางซ้ายของเส้น</strong> = ชิ้นงานดีที่คะแนนต่ำจนถูกเตะทิ้ง (Overkill) เสียต้นทุนและ Yield</span>
          </div>
        </div>
        <p className="text-[10px] text-slate-500 m-0">
          หมายเหตุ: กราฟแสดงแบบขยายส่วนปลายโค้งเพื่อให้มองเห็นพื้นที่เสี่ยงชัดเจน ค่า PPM และ Overkill ด้านบนคำนวณจากสถิติจริงของทั้งสองกลุ่ม
        </p>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 9. INDUSTRIAL VISION HARDWARE & MES INTEGRATION ARCHITECTURE               */
/* ========================================================================= */
function VisionHardwareArchitecture() {
  const [activeStage, setActiveStage] = useState(1);

  const stages = [
    {
      num: 1,
      title: 'Conveyor & Part Trigger',
      name: '1. เซนเซอร์ตรวจจับตำแหน่ง',
      component: 'Photoelectric Through-Beam / Rotary Encoder',
      spec: 'Response Time < 0.2 ms',
      detail: 'เมื่อชิ้นงานโลหะวิ่งมาถึงจุดตรวจจับ เซนเซอร์จะส่งสัญญาณ 24VDC Trigger Pulse เข้าสู่กล้องหรือบอร์ด I/O เพื่อเริ่มวัฏจักรการถ่ายภาพ'
    },
    {
      num: 2,
      title: 'Strobe Lighting & Camera',
      name: '2. แฟลชสโตรบ & กล้องอุตสาหกรรม',
      component: 'GigE / USB3 Vision Camera + LED Controller',
      spec: 'Shutter 50 &mu;s &middot; Strobe 400%',
      detail: 'Strobe Controller จะเร่งความสว่างของหลอด LED ให้สูงกว่าปกติ 400% ในช่วงเวลาสั้นมาก (50 ไมโครวินาที) เพื่อหยุดการเคลื่อนไหวของชิ้นงานและประหยัดอายุการใช้งานหลอด'
    },
    {
      num: 3,
      title: 'Edge IPC Inference Engine',
      name: '3. หน่วยประมวลผลภาพอัจฉริยะ',
      component: 'Industrial PC (Fanless) + NVIDIA GPU/NPU',
      spec: 'Cycle Time < 35 ms &middot; IP65 Protection',
      detail: 'รับส่งภาพผ่านสายแลนความเร็วสูง (Gigabit Ethernet) รันอัลกอริทึม Rule-Based และ AI Vision ตัดสินผลว่า OK หรือ NG พร้อมคำนวณพิกัดข้อบกพร่อง'
    },
    {
      num: 4,
      title: 'PLC & Pneumatic Ejector',
      name: '4. ระบบคัดแยกชิ้นงานเสีย',
      component: 'Siemens / Mitsubishi PLC + Solenoid Air Jet',
      spec: 'Ejection Delay Shift Register (Tracking)',
      detail: 'หากผลเป็น NG สัญญาณ Digital Out จะสั่งให้กระบอกลมหรือหัวเป่าลมเตะชิ้นงานตกราง Reject ทันที โดยมี Shift Register ติดตามตำแหน่งชิ้นงานจนถึงจุดคัดแยก'
    },
    {
      num: 5,
      title: 'MES & SQL Server Traceability',
      name: '5. ระบบบริหารการผลิตและสืบย้อนกลับ',
      component: 'REST API &middot; SQL Server Database &middot; Web Dashboard',
      spec: '100% Digital Quality Birth History',
      detail: 'บันทึกรูปภาพชิ้นงาน NG, ค่ามิติที่วัดได้, รหัสเครื่องจักร, และเวลาลงในฐานข้อมูล SQL Server เชื่อมโยงกับ Serial Number และรหัสพนักงานผู้ควบคุม'
    }
  ];

  const curr = stages[activeStage - 1];

  return (
    <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-1 border border-blue-500/30">
            <FiZap className="w-3.5 h-3.5 text-blue-400" />
            <span>End-to-End System Integration &middot; สถาปัตยกรรมระบบรวม</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            สถาปัตยกรรมฮาร์ดแวร์และการเชื่อมต่อระบบ MES ในสายการผลิตจริง
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            คลิกที่แต่ละขั้นตอนเพื่อดูการเชื่อมต่อสัญญาณ I/O และการไหลของข้อมูลคุณภาพ
          </p>
        </div>
      </div>

      {/* Stepper Stage Tabs */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
        {stages.map(st => (
          <button
            key={st.num}
            onClick={() => setActiveStage(st.num)}
            className={`p-3 rounded-xl text-xs font-bold text-left transition-all border ${
              activeStage === st.num
                ? 'bg-blue-600 text-white border-blue-400 shadow-lg shadow-blue-600/30 scale-[1.02]'
                : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700/80'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="w-5 h-5 rounded-full bg-blue-950 text-blue-300 text-[10px] flex items-center justify-center font-black">
                {st.num}
              </span>
              <span className="text-[10px] opacity-75 font-mono">Stage {st.num}</span>
            </div>
            <div className="truncate font-bold">{st.title}</div>
          </button>
        ))}
      </div>

      {/* Stage Detail Card */}
      <div className="p-5 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold">
              {curr.title}
            </span>
            <h4 className="text-base font-black text-white mt-0.5">{curr.name}</h4>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-bold">
              {curr.spec}
            </span>
          </div>
        </div>

        <div className="text-xs text-slate-300 space-y-2 leading-relaxed">
          <p className="m-0 font-medium text-slate-200">{curr.detail}</p>
          <div className="p-3 bg-slate-900 rounded-lg border border-slate-800 flex items-center gap-2 text-slate-400 text-[11px]">
            <strong className="text-cyan-400">อุปกรณ์หลัก:</strong> {curr.component}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* MAIN EXPORTED LESSON MODULES (1 - 8)                                     */
/* ========================================================================= */

/* ------------------------------------------------------------------------- */
/* MODULE 1: MACHINE VISION FUNDAMENTALS, AI/CV/MV HIERARCHY & 4-STAGE FLOW  */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod1() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-2 sm:mb-3 border border-blue-500/30">
          <FiEye className="w-4 h-4" /> บทเรียนที่ 1 (Lesson 1 of 8)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          พื้นฐานระบบ Machine Vision, แผนภาพ AI/CV/MV และวงจรการทำงาน 4 ขั้นตอน
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          เข้าใจรากฐานของแมชชีนวิชันในโรงงานอัจฉริยะ (Industry 4.0): ความแตกต่างเชิงวิศวกรรมระหว่างสายตามนุษย์กับระบบ Machine Vision, 
          ความสัมพันธ์ระหว่าง AI / Computer Vision / Deep Learning / Machine Vision และวงจรการทำงานมาตรฐาน 4 ขั้นตอน (Acquisition &rarr; Processing &rarr; Analysis &rarr; Decision)
        </p>
      </div>

      {/* Section 1: Why Machine Vision in Industry 4.0? Human vs Machine */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-blue-400 font-black mr-2">1.</span>
          ทำไมโรงงาน Industry 4.0 ต้องเปลี่ยนสู่ระบบ Machine Vision? (Human vs Machine Vision)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          ในกระบวนการผลิตความเร็วสูง เช่น สายการผลิตยานยนต์และอิเล็กทรอนิกส์ สายตามนุษย์มีข้อจำกัดด้านความล้า (Fatigue) 
          ความเร็วการตอบสนอง และการตัดสินที่มีอคติส่วนบุคคล (Subjective Judgment) แมชชีนวิชันจึงเข้ามาแก้ปัญหาด้วยคุณสมบัติหลัก:
        </p>

        <div className="space-y-1.5">
          <div className="sm:hidden text-[11px] text-slate-400 flex items-center justify-end gap-1.5 font-mono">
            <span>เลื่อนแนวนอนเพื่อดูตารางเปรียบเทียบเต็ม</span>
            <span className="text-cyan-400">↔</span>
          </div>
          <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-800">
            <table className="w-full min-w-[640px] text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="w-[28%] align-top py-3 px-4">ปัจจัยเปรียบเทียบ (Criteria)</th>
                  <th className="w-[36%] align-top py-3 px-4 text-rose-300">สายตามนุษย์ (Human Inspection)</th>
                  <th className="w-[36%] align-top py-3 px-4 text-emerald-300">ระบบแมชชีนวิชัน (Industrial Machine Vision)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-white">ความเร็วในการตรวจ (Inspection Speed)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">จำกัดที่ 1 - 2 ชิ้นต่อวินาที หากเร็วกว่านี้จะเริ่มหลุดรอด</td>
                  <td className="align-top py-3 px-4 font-bold text-emerald-400 leading-relaxed">มากกว่า 30 - 120 ชิ้นต่อวินาที (ตามรอบชัตเตอร์และ IPC)</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-white">ความสม่ำเสมอและความเที่ยงตรง (Repeatability)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">ผันแปรตามความเหนื่อยล้า กะกลางคืน อารมณ์ และแสงสว่าง</td>
                  <td className="align-top py-3 px-4 font-bold text-emerald-400 leading-relaxed">100% สม่ำเสมอตลอด 24 ชม. ไม่มีความเมื่อยล้า ไร้อคติ</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-white">การวัดขนาดมิติ (Dimension Gauging)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">กะประมาณด้วยสายตาได้แค่ระดับมิลลิเมตร ต้องใช้เวอร์เนียร์วัดทีละชิ้น</td>
                  <td className="align-top py-3 px-4 font-bold text-emerald-400 leading-relaxed">วัดขนาดได้ระดับไมครอน (&plusmn;0.005 mm) วัดครบทุกชิ้น 100% Inline</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-white">การบันทึกข้อมูลเพื่อการสืบย้อนกลับ (Traceability)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">ต้องจดบันทึกลงกระดาษ เสี่ยงต่อการสูญหายและบันทึกย้อนหลังเท็จ</td>
                  <td className="align-top py-3 px-4 font-bold text-emerald-400 leading-relaxed">บันทึกรูปภาพและค่ามิติลงฐานข้อมูล MES / SQL Server ทันทีทุกชิ้นงาน</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Section 2: Hierarchy & Venn Diagram: AI vs CV vs DL vs Machine Vision */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-indigo-400 font-black mr-2">2.</span>
          ลำดับชั้นและแผนภาพเวนน์: AI vs Computer Vision vs Machine Vision
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-stretch">
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between space-y-3 text-xs">
            <p className="text-slate-300 leading-relaxed m-0">
              หลายคนมักสับสนระหว่าง <strong>Computer Vision (คอมพิวเตอร์วิชัน)</strong> กับ <strong>Machine Vision (แมชชีนวิชัน)</strong>:
            </p>
            <ul className="space-y-2 text-slate-300 list-disc list-inside">
              <li>
                <strong className="text-purple-300">Artificial Intelligence (AI):</strong> ขอบเขตใหญ่สุดของระบบอัจฉริยะที่เลียนแบบสมองมนุษย์
              </li>
              <li>
                <strong className="text-sky-300">Computer Vision (CV):</strong> สาขาวิทยาการคอมพิวเตอร์ที่เน้นการทำความเข้าใจภาพด้วยซอฟต์แวร์และคณิตศาสตร์ (เช่น แปลงภาพ ปรับสี ตีกรอบ)
              </li>
              <li>
                <strong className="text-emerald-300">Machine Vision (MV):</strong> การผสานคอมพิวเตอร์วิชันเข้ากับ <em>ฮาร์ดแวร์อุตสาหกรรมในโลกความจริง</em> (กล้องอุตสาหกรรม เลนส์ แสงสว่าง เซนเซอร์ Trigger PLC แขนกลหุ่นยนต์ และมาตรฐานความทนทาน IP67)
              </li>
            </ul>
            <div className="p-3 bg-indigo-950/40 rounded-lg border border-indigo-500/30 text-[11px] text-indigo-200">
              💡 <strong>สรุป:</strong> Computer Vision เป็นเพียงซอฟต์แวร์/อัลกอริทึม แต่ Machine Vision คือ <em>ระบบวิศวกรรมแบบบูรณาการ (System Engineering)</em> ที่แก้ปัญหาการผลิตจริง
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-center">
            {/* SVG Venn Diagram with High-Contrast Solid Badge Pills */}
            <svg viewBox="0 0 320 220" className="w-full h-full max-h-56">
              {/* Outer AI circle */}
              <circle cx="160" cy="110" r="100" fill="rgba(168, 85, 247, 0.12)" stroke="#a855f7" strokeWidth="2" />
              {/* AI Badge Pill */}
              <rect x="75" y="16" width="170" height="20" rx="10" fill="#7e22ce" />
              <text x="160" y="30" textAnchor="middle" fill="#ffffff" fontSize="10.5" fontWeight="bold">Artificial Intelligence (AI)</text>

              {/* CV Circle */}
              <circle cx="160" cy="120" r="75" fill="rgba(56, 189, 248, 0.15)" stroke="#0284c7" strokeWidth="2" />
              {/* CV Badge Pill */}
              <rect x="95" y="52" width="130" height="19" rx="9.5" fill="#0284c7" />
              <text x="160" y="65.5" textAnchor="middle" fill="#ffffff" fontSize="9.5" fontWeight="bold">Computer Vision (CV)</text>

              {/* Left Circle: Deep Learning */}
              <circle cx="125" cy="135" r="45" fill="rgba(244, 63, 94, 0.22)" stroke="#e11d48" strokeWidth="1.8" />
              {/* DL Badge Pill (Positioned upper-left to prevent overlap with Edge AI) */}
              <rect x="62" y="105" width="86" height="28" rx="8" fill="#e11d48" />
              <text x="105" y="117" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Deep Learning</text>
              <text x="105" y="128" textAnchor="middle" fill="#ffe4e6" fontSize="8" fontWeight="medium">(AI Vision)</text>

              {/* Right Circle: Machine Vision */}
              <circle cx="195" cy="135" r="45" fill="rgba(34, 197, 94, 0.22)" stroke="#16a34a" strokeWidth="1.8" />
              {/* MV Badge Pill (Positioned upper-right to prevent overlap with Edge AI) */}
              <rect x="172" y="105" width="96" height="28" rx="8" fill="#16a34a" />
              <text x="220" y="117" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="bold">Machine Vision</text>
              <text x="220" y="128" textAnchor="middle" fill="#dcfce7" fontSize="7.5" fontWeight="medium">(Industrial HW)</text>

              {/* Overlap Center: Edge AI Pill (Positioned lower center of intersection, zero text clipping) */}
              <rect x="135" y="145" width="50" height="20" rx="10" fill="#0f172a" stroke="#ffffff" strokeWidth="1.2" />
              <text x="160" y="159" textAnchor="middle" fill="#38bdf8" fontSize="8.5" fontWeight="black">Edge AI</text>
            </svg>
          </div>
        </div>
      </section>

      {/* Section 3: The 4-Stage Core Working Principle Pipeline */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-sky-400 font-black mr-2">3.</span>
          วงจรการทำงาน 4 ขั้นตอนของระบบ Machine Vision (Core Working Pipeline)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs">1</span>
              <span className="font-mono text-[10px] text-blue-400">Step 1</span>
            </div>
            <h3 className="font-bold text-white text-sm">Image Acquisition</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ชิ้นงานวิ่งผ่านจุดตรวจ เซนเซอร์ส่ง Trigger ยิงแฟลชสโตรบ กล้อง Global Shutter เปิดรับแสงบันทึกภาพดิจิทัลส่งเข้า IPC
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">2</span>
              <span className="font-mono text-[10px] text-indigo-400">Step 2</span>
            </div>
            <h3 className="font-bold text-white text-sm">Image Processing</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              เตรียมภาพก่อนวิเคราะห์: แปลง Grayscale, ลบ Noise ด้วย Gaussian Blur, ปรับคอนทราสต์ CLAHE, และตัดขอบเฉพาะพื้นที่ ROI
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold text-xs">3</span>
              <span className="font-mono text-[10px] text-purple-400">Step 3</span>
            </div>
            <h3 className="font-bold text-white text-sm">Image Analysis</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ดึงคุณลักษณะเด่น: วัดขนาดรูน็อต (Caliper), นับจำนวนวัตถุ (Blob), ถอดรหัสบาร์โค้ด (DPM), หรือรันโมเดล YOLO ตรวจรอยแตก
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">4</span>
              <span className="font-mono text-[10px] text-emerald-400">Step 4</span>
            </div>
            <h3 className="font-bold text-white text-sm">Decision &amp; Action</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              เปรียบเทียบกับค่าเกณฑ์ตัดสิน (Threshold) ส่งสัญญาณ 24V I/O สั่งกระบอกลมเตะงาน NG ทันที และบันทึก Log ลงฐานข้อมูล MES
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* MODULE 2: 1D/2D/3D SYSTEMS, 6 HARDWARE COMPONENTS & SHUTTER TECHNOLOGY    */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod2() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-indigo-950/70 via-blue-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-indigo-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-2 sm:mb-3 border border-indigo-500/30">
          <FiCpu className="w-4 h-4" /> บทเรียนที่ 2 (Lesson 2 of 8)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          ประเภทระบบภาพ 1D/2D/3D, องค์ประกอบฮาร์ดแวร์ 6 ส่วน และชัตเตอร์กล้อง Global vs Rolling
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          เจาะลึกการจำแนกระบบแมชชีนวิชันตามมิติภาพ (1D Line Scan, 2D Area Scan, 3D Point Cloud), 
          4 เสาหลักการใช้งานในสายการผลิต, 6 องค์ประกอบฮาร์ดแวร์หลัก และการทดลองเปรียบเทียบเซนเซอร์ Global Shutter กับ Rolling Shutter บนสายพานความเร็วสูง
        </p>
      </div>

      {/* Section 1: Types of Machine Vision (1D vs 2D vs 3D) */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-violet-400 font-black mr-2">1.</span>
          ประเภทของระบบแมชชีนวิชันตามมิติภาพ (1D Line Scan vs 2D Area Scan vs 3D Vision)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
              1D Vision (Line Scan)
            </span>
            <h3 className="font-bold text-white text-sm">กล้องสแกนแนวเส้น (Line Scan)</h3>
            <p className="text-slate-300 leading-relaxed">
              เซนเซอร์มีพิกเซลแถวเดียว (เช่น 2048 x 1 หรือ 8192 x 1 พิกเซล) บันทึกภาพต่อเนื่องตามความเร็วสายพาน
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] text-slate-400">
              <strong className="text-white block mb-0.5">เหมาะสำหรับ:</strong>
              วัสดุเลื่อนต่อเนื่องไม่สิ้นสุด เช่น แผ่นเหล็กม้วน, ม้วนกระดาษ, แผ่นฟอยล์, สิ่งทอ, สายพานความเร็วสูงระดับ 500 m/min
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              2D Vision (Area Scan)
            </span>
            <h3 className="font-bold text-white text-sm">กล้องสแกนพื้นที่เฟรมมาตรฐาน</h3>
            <p className="text-slate-300 leading-relaxed">
              เซนเซอร์เมทริกซ์สี่เหลี่ยม (X, Y) เช่น 1920x1080 หรือ 2448x2048 พิกเซล ถ่ายภาพชิ้นงานแบบเป็นเฟรมเดี่ยว
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] text-slate-400">
              <strong className="text-white block mb-0.5">เหมาะสำหรับ:</strong>
              ชิ้นงานแยกชิ้น (Discrete Parts), ตรวจแผงวงจร PCB, อ่านบาร์โค้ด QR/DataMatrix, ตรวจจับรอยแตกร้าวบนชิ้นงานปั๊มโลหะ
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <span className="text-[10px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded border border-purple-500/20">
              3D Vision (Point Cloud / Depth)
            </span>
            <h3 className="font-bold text-white text-sm">กล้องมิติความลึก (Z-Axis Depth)</h3>
            <p className="text-slate-300 leading-relaxed">
              เก็บพิกัดความลึก 3 มิติ (X, Y, Z) ด้วยเทคนิค Laser Profiling, Stereo Vision, หรือ Structured Light
            </p>
            <div className="p-2.5 bg-slate-900 rounded-lg text-[11px] text-slate-400">
              <strong className="text-white block mb-0.5">เหมาะสำหรับ:</strong>
              หุ่นยนต์หยิบชิ้นงานในลังแบบสุ่ม (Random Bin Picking), วัดความสูงแนวเชื่อมสปอต, ตรวจสอบความเรียบระนาบ (Coplanarity)
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: 4 Industrial Application Pillars */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-emerald-400 font-black mr-2">2.</span>
          4 เสาหลักการประยุกต์ใช้ในโรงงานอุตสาหกรรม (4 Core Industrial Application Pillars)
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center text-base font-bold">
              🔍
            </div>
            <h3 className="font-bold text-white text-sm">1. Inspection (การตรวจสอบ)</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              ตรวจหาข้อบกพร่องพื้นผิว (Surface Defect), รอยแตกร้าว (Crack), รอยบุบ, รอยขูดขีด, คราบไหม้, และตรวจเช็คความครบถ้วนของชิ้นส่วนประกอบ
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center text-base font-bold">
              📐
            </div>
            <h3 className="font-bold text-white text-sm">2. Gauging (การวัดขนาดมิติ)</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              วัดขนาดเชิงเรขาคณิต (GD&amp;T) ความกว้าง ยาว รัศมี รูเจาะ ระยะพิตช์เกลียวน็อต ความแม่นยำระดับไมครอน (&plusmn;0.005 mm) โดยไม่ต้องสัมผัสชิ้นงาน
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center text-base font-bold">
              🤖
            </div>
            <h3 className="font-bold text-white text-sm">3. Guidance (การนำทางหุ่นยนต์)</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              คำนวณหาพิกัดกึ่งกลาง (X, Y) และมุมหมุนเอียง (&theta;) ส่งสัญญาณสื่อสารไปยังแขนกล 6-Axis หรือ Cobot เพื่อหยิบชิ้นงานเข้าแม่พิมพ์ปั๊มหรือประกอบ
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-base font-bold">
              🏷️
            </div>
            <h3 className="font-bold text-white text-sm">4. Identification (การระบุเอกลักษณ์)</h3>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              อ่านบาร์โค้ด 1D, คิวอาร์โค้ด 2D DataMatrix ที่ยิงด้วยไฟเบอร์เลเซอร์ลงบนผิวโลหะ (DPM) และการอ่านตัวหนังสือ OCR ป้องกันการติดฉลากสลับรุ่น
            </p>
          </div>
        </div>
      </section>

      {/* Section 3: 6 Core Components of Industrial Machine Vision */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-blue-400 font-black mr-2">3.</span>
          6 องค์ประกอบหลักของระบบ Industrial Machine Vision Hardware
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 text-xs pt-1">
          <div className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 sm:space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">1. Industrial Camera</h3>
            <p className="text-slate-300">กล้องอุตสาหกรรมความทนทานสูง (IP67) เลือกระหว่างเซนเซอร์ Monochrome (ขาวดำ เน้นความคมชัดของขอบ) หรือ Color (ตรวจเช็คสีของสายไฟ/ชิ้นงาน)</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 sm:space-y-2">
            <h3 className="font-bold text-sky-300 text-sm">2. Optical Lens</h3>
            <p className="text-slate-300">เลนส์ออปติกควบคุมระยะการมองเห็น (Field of View: FOV) และความลึกของภาพ (Depth of Field: DOF) เช่น เลนส์ทางยาวโฟกัสคงที่ หรือ Telecentric Lens ที่ไร้ความเพี้ยนเชิงมิติ</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 sm:space-y-2">
            <h3 className="font-bold text-amber-300 text-sm">3. Lighting Source</h3>
            <p className="text-slate-300">แสงสว่างเฉพาะทาง: Ring Light, Bar Light, Coaxial Light, Dome Light หรือ Backlight เพื่อสร้าง Contrast ระหว่างพื้นผิวชิ้นงานและรอยตำหนิ</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 sm:space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm">4. Trigger &amp; Encoder</h3>
            <p className="text-slate-300">เซนเซอร์ตรวจจับตำแหน่งชิ้นงาน หรือ Rotary Encoder บนสายพานลำเลียง เพื่อสั่งกล้องจับภาพในจังหวะที่ชิ้นงานมาถึงจุดศูนย์กลางอย่างแม่นยำ</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 sm:space-y-2">
            <h3 className="font-bold text-purple-300 text-sm">5. Controller &amp; Edge AI</h3>
            <p className="text-slate-300">คอมพิวเตอร์อุตสาหกรรม (IPC) หรือ Smart Camera ที่มีหน่วยประมวลผล GPU/NPU สำหรับรันอัลกอริทึมประมวลผลภาพแบบทันที (Cycle Time &lt; 50ms)</p>
          </div>
          <div className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 sm:space-y-2">
            <h3 className="font-bold text-fuchsia-300 text-sm">6. Industrial I/O Interface</h3>
            <p className="text-slate-300">ช่องทางส่งสัญญาณ Pass/Fail (OK/NG) และพิกัด X/Y/Angle ไปยัง PLC, กระบอกลมเตะงานเสีย (Pneumatic Ejector), หรือแขนกลหุ่นยนต์หยิบชิ้นงาน</p>
          </div>
        </div>
      </section>

      {/* Global vs Rolling Shutter Simulator */}
      <ShutterComparisonSimulator />
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* MODULE 3: INDUSTRIAL LIGHTING ENGINEERING & POLARIZER GLARE REDUCTION     */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod3() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-2 sm:mb-3 border border-cyan-500/30">
          <FiCamera className="w-4 h-4" /> บทเรียนที่ 3 (Lesson 3 of 8)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          วิศวกรรมการจัดแสงอุตสาหกรรมและการตัดแสงสะท้อนด้วยโพลาไรเซอร์ (Optical Lighting Setup)
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          "Lighting is 80% of Success" &mdash; แสงสว่างคือหัวใจของการสร้างคอนทราสต์ในระบบแมชชีนวิชัน 
          ฝึกจำลองการจัดแสง 5 รูปแบบ (Front Light, Polarizer CPL, Coaxial, Diffuse Dome, Backlight) และตารางเลือกชนิดไฟตามลักษณะพื้นผิวชิ้นงานจริง
        </p>
      </div>

      {/* Interactive Optical Lighting Simulator */}
      <OpticalLightingSimulator />

      {/* Detailed Lighting Cheat Sheet Table */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-cyan-400 font-black mr-2">2.</span>
          ตารางสรุปการเลือกชนิดของแสงตามโจทย์ชิ้นงานโรงงาน (Lighting Cheat Sheet)
        </h2>
        
        <div className="space-y-1.5">
          <div className="sm:hidden text-[11px] text-slate-400 flex items-center justify-end gap-1.5 font-mono">
            <span>เลื่อนแนวนอนเพื่อดูตารางเปรียบเทียบเต็ม</span>
            <span className="text-cyan-400">↔</span>
          </div>
          <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-800">
            <table className="w-full min-w-[700px] text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="w-[24%] align-top py-3 px-4">ชนิดแสง (Lighting Type)</th>
                  <th className="w-[26%] align-top py-3 px-4">ลักษณะการให้แสง</th>
                  <th className="w-[28%] align-top py-3 px-4">โจทย์ชิ้นงานที่เหมาะสม</th>
                  <th className="w-[22%] align-top py-3 px-4">ข้อควรระวังหน้างาน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-amber-300">💡 Backlight (ไฟส่องหลัง)</td>
                  <td className="align-top py-3 px-4 leading-relaxed">ส่องจากหลังชิ้นงาน เกิดเงาดำ Silhouette 100% Contrast</td>
                  <td className="align-top py-3 px-4 font-semibold text-white leading-relaxed">วัดขนาดมิติ (Dimension), รูเจาะ, เกลียวน็อต, ขอบครีบ (Burr)</td>
                  <td className="align-top py-3 px-4 text-slate-400 leading-relaxed">ต้องมีพื้นที่ติดตั้งไฟใต้สายพาน ตรวจพื้นผิวไม่ได้</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-cyan-300">🎯 Coaxial Light (ไฟร่วมแกน)</td>
                  <td className="align-top py-3 px-4 leading-relaxed">แสงสะท้อนผ่านกระจก 45° ขนานแกนเลนส์ตกกระทบ 90°</td>
                  <td className="align-top py-3 px-4 font-semibold text-white leading-relaxed">ตรวจรอยขูดขีดบนแผ่นโลหะเงา, กระจก, ซิลิคอนเวเฟอร์</td>
                  <td className="align-top py-3 px-4 text-slate-400 leading-relaxed">ระยะห่าง Working Distance ต้องคงที่ ห้ามวางเอียง</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-purple-300">🎪 Diffuse Dome Light (ไฟโดม)</td>
                  <td className="align-top py-3 px-4 leading-relaxed">แสงกระจายสะท้อนจากโดมโค้งรอบทิศ 360° ไร้เงามืด</td>
                  <td className="align-top py-3 px-4 font-semibold text-white leading-relaxed">ชิ้นงานผิวโค้งมน, ท่อทองแดง, ฝากระป๋อง, แผง PCB นูนต่ำ</td>
                  <td className="align-top py-3 px-4 text-slate-400 leading-relaxed">ตัวโดมมีขนาดใหญ่ ต้องเว้นช่องรูกล้องมองกลางโดม</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-emerald-300">🕶️ Polarizing Filter (CPL)</td>
                  <td className="align-top py-3 px-4 leading-relaxed">กรองคลื่นแสงสะท้อนระนาบตรง ขจัดแสงวาบขาวน้ำมัน</td>
                  <td className="align-top py-3 px-4 font-semibold text-white leading-relaxed">ชิ้นงานปั๊มขึ้นรูปเคลือบน้ำมันหล่อเย็น, ขั้วแบตเตอรี่เงา</td>
                  <td className="align-top py-3 px-4 text-slate-400 leading-relaxed">แสงโดยรวมจะดรอปลงประมาณ 1-2 Stop ต้องชดเชยเวลาชัตเตอร์</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-sky-300">⭕ Ring Light (ไฟวงแหวน)</td>
                  <td className="align-top py-3 px-4 leading-relaxed">ติดตั้งล้อมรอบหน้าเลนส์ ส่องแสงกระจายตรงเข้าหาชิ้นงาน</td>
                  <td className="align-top py-3 px-4 font-semibold text-white leading-relaxed">ตรวจเช็คตัวอักษร OCR, โลโก้, บาร์โค้ดบนพื้นผิวด้านทั่วไป</td>
                  <td className="align-top py-3 px-4 text-slate-400 leading-relaxed">ห้ามใช้กับชิ้นงานโลหะเงาวับ เพราะจะเกิดวงสะท้อนรูปโดนัทเข้ากล้อง</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* MODULE 4: OPTICAL CALCULATIONS, 3-PIXEL RULE & CAMERA INTERFACES          */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod4() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-sky-950/70 via-cyan-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-sky-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold mb-2 sm:mb-3 border border-sky-500/30">
          <FiLayers className="w-4 h-4" /> บทเรียนที่ 4 (Lesson 4 of 8)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          การคำนวณทางเลนส์ กฎ 3 พิกเซล (3-Pixel Rule) และมาตรฐานพอร์ตเชื่อมต่อกล้อง
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          ฝึกคำนวณสเปกกล้องและเลนส์อย่างแม่นยำด้วย <strong>กฎ 3 พิกเซล (The 3-Pixel Rule)</strong>, 
          สูตรคำนวณทางยาวโฟกัสเลนส์ $f = (h \times WD) / FOV$, การจับคู่ขนาดวงภาพเลนส์กับเซนเซอร์เพื่อป้องกันขอบภาพมืด (Vignetting), เลนส์ Telecentric และตารางเปรียบเทียบพอร์ตเชื่อมต่อกล้องอุตสาหกรรม
        </p>
      </div>

      {/* Optical Formulas & 3-Pixel Rule Calculator */}
      <OpticalFormulasCalculator />

      {/* Industrial Camera Interface Comparison Matrix */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-sky-400 font-black mr-2">2.</span>
          ตารางเปรียบเทียบพอร์ตเชื่อมต่อกล้องอุตสาหกรรม (Industrial Camera Interfaces Comparison)
        </h2>
        <div className="space-y-1.5">
          <div className="sm:hidden text-[11px] text-slate-400 flex items-center justify-end gap-1.5 font-mono">
            <span>เลื่อนแนวนอนเพื่อดูตารางเปรียบเทียบเต็ม</span>
            <span className="text-cyan-400">↔</span>
          </div>
          <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-800">
            <table className="w-full min-w-[760px] text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="w-[22%] align-top py-3 px-4">มาตรฐานพอร์ต (Interface)</th>
                  <th className="w-[18%] align-top py-3 px-4">แบนด์วิดท์ (Bandwidth)</th>
                  <th className="w-[18%] align-top py-3 px-4">ระยะสายสูงสุด (Max Cable Length)</th>
                  <th className="w-[17%] align-top py-3 px-4">การ์ด Frame Grabber?</th>
                  <th className="w-[25%] align-top py-3 px-4">ข้อดีในโรงงานอุตสาหกรรม</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-cyan-400">GigE Vision (1G / 10G)</td>
                  <td className="align-top py-3 px-4 font-mono">1 Gbps &ndash; 10 Gbps</td>
                  <td className="align-top py-3 px-4 font-bold text-emerald-400">สูงสุด 100 เมตร (Cat6)</td>
                  <td className="align-top py-3 px-4 text-emerald-400">ไม่ต้องใช้ (เสียบพอร์ต LAN)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">สายยาว ลากข้ามตู้ควบคุมได้ไกล รองรับ PoE (จ่ายไฟผ่านสายแลนเส้นเดียว) นิยมที่สุดในโลก</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-blue-400">USB 3.0 Vision</td>
                  <td className="align-top py-3 px-4 font-mono">~5 Gbps (USB 3.1 Gen1)</td>
                  <td className="align-top py-3 px-4 font-mono text-amber-400">3 &ndash; 5 เมตร</td>
                  <td className="align-top py-3 px-4 text-emerald-400">ไม่ต้องใช้ (Plug &amp; Play)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">ติดตั้งง่าย ต้นทุนต่ำ เหมาะกับแท่นตรวจสอบขนาดกะทัดรัด (Standalone Testing Jig)</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-purple-400">CoaXPress (CXP-6 / CXP-12)</td>
                  <td className="align-top py-3 px-4 font-mono text-emerald-400">6 Gbps &ndash; 50 Gbps</td>
                  <td className="align-top py-3 px-4 font-mono">40 &ndash; 100 เมตร (Coaxial)</td>
                  <td className="align-top py-3 px-4 text-rose-400 font-bold">ต้องใช้การ์ดเฉพาะทาง (PCIe)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">ความเร็วสูงสุดระดับอัลตราสปีด เหมาะกับกล้อง Line Scan และงานตรวจจับแผ่นเวเฟอร์เซมิคอนดักเตอร์</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-slate-400">Camera Link</td>
                  <td className="align-top py-3 px-4 font-mono">2 Gbps &ndash; 6.8 Gbps</td>
                  <td className="align-top py-3 px-4 font-mono text-amber-400">10 เมตร</td>
                  <td className="align-top py-3 px-4 text-rose-400 font-bold">ต้องใช้การ์ดเฉพาะทาง (PCIe)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">Latency คงที่ในระดับไมโครวินาที (Deterministic Real-time) มีความเสถียรสูงสุด</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* MODULE 5: DIGITAL IMAGE MATRIX, COLOR SPACES & PYTHON OPENCV WORKSHOP     */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod5() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-violet-950/70 via-purple-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-violet-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-2 sm:mb-3 border border-violet-500/30">
          <FiCode className="w-4 h-4" /> บทเรียนที่ 5 (Lesson 5 of 8)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          โครงสร้างภาพดิจิทัล ระบบสี BGR/HSV และการประมวลผลภาพด้วย Python &amp; OpenCV
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          เข้าใจโครงสร้างภาพดิจิทัลในเชิงเมทริกซ์ตัวเลข (0-255), ความแตกต่างระหว่างลำดับช่องสี BGR กับ RGB, 
          การคัดแยกสีชิ้นงานด้วยปริภูมิสี HSV ที่ทนต่อความผันผวนของแสงโรงงาน และปฏิบัติการ 13 ฟังก์ชันสำคัญของ OpenCV
        </p>
      </div>

      {/* Section 1: Digital Image as Numerical Matrix & Color Spaces */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-violet-400 font-black mr-2">1.</span>
          โครงสร้างภาพดิจิทัลในเชิงคณิตศาสตร์และระบบสี (Matrix &amp; Color Spaces)
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <h3 className="font-bold text-white text-sm">ภาพดิจิทัลคือเมทริกซ์ตัวเลข 2D / 3D (Slide 17)</h3>
            <p className="text-slate-300 leading-relaxed">
              ในทางคอมพิวเตอร์ ภาพคือตารางตัวเลขที่มีพิกัด (X, Y) โดยแต่ละช่องแทนค่าความสว่างของแสง (Pixel Intensity):
            </p>
            <ul className="space-y-1.5 text-slate-300 list-disc list-inside">
              <li><strong>Binary (1-bit):</strong> มีเพียง 0 (ดำ) กับ 1 (ขาว) นิยมใช้คัดกรองขอบและนับจำนวน</li>
              <li><strong>Grayscale (8-bit):</strong> ค่าความสว่าง 0 (ดำสนิท) ถึง 255 (ขาวโพลน) เป็นมาตรฐานหลักของ Rule-Based</li>
              <li><strong>RGB / BGR (24-bit):</strong> เมทริกซ์ 3 ชั้น (3 Channels) &times; 8-bit รวม 16.7 ล้านเฉดสี</li>
            </ul>
            <div className="p-2.5 bg-rose-950/30 rounded-lg border border-rose-500/20 text-rose-300 text-[11px]">
              ⚠️ <strong>กับดักสำคัญ:</strong> OpenCV อ่านภาพเป็นลำดับช่อง <strong>BGR (Blue-Green-Red)</strong> ไม่ใช่ RGB! หากส่งภาพตรงเข้า Matplotlib หรือเว็บ ภาพจะติดโทนสีฟ้า ต้องแปลงด้วย <code className="bg-slate-900 px-1 rounded">cv2.cvtColor(img, cv2.COLOR_BGR2RGB)</code>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <h3 className="font-bold text-amber-300 text-sm">ระบบสี HSV: หัวใจการคัดแยกสีในโรงงาน (Slide 20)</h3>
            <p className="text-slate-300 leading-relaxed">
              ในโรงงาน สภาพแสงจากหลอดไฟหรือแสงแดดริมหน้าต่างมีความผันผวน หากใช้ระบบ RGB ค่าสีของชิ้นงานจะเปลี่ยนตลอดเวลา 
              แต่วิศวกรวิชันจะแปลงภาพเป็นระบบ <strong>HSV</strong>:
            </p>
            <div className="space-y-1.5 pt-1">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <strong className="text-cyan-400">H (Hue - โทนสี 0°-179° ใน OpenCV):</strong> กำหนดเฉดสีบริสุทธิ์ (แดง เขียว น้ำเงิน ทองแดง)
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <strong className="text-emerald-400">S (Saturation - ความสด 0-255):</strong> ความเข้มข้นของเนื้อสีตัดกับสีเทา
              </div>
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <strong className="text-amber-400">V (Value - ความสว่าง 0-255):</strong> ความสว่างของแสง
              </div>
            </div>
            <p className="text-[11px] text-slate-400 italic pt-1">
              💡 แสงไฟเปลี่ยนจะกระทบเฉพาะแกน V ส่วนแกน H และ S จะยังคงเสถียร ทำให้แยกสีชิ้นงานได้แม่นยำ 100%
            </p>
          </div>
        </div>
      </section>

      {/* 13 Essential OpenCV Operations Workshop */}
      <OpenCVPythonWorkshop />
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* MODULE 6: AI DEEP LEARNING, CNN, YOLO & RULE-BASED VS AI DECISION MATRIX  */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod6() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-fuchsia-950/70 via-purple-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-fuchsia-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-fuchsia-500/20 text-fuchsia-300 text-xs font-bold mb-2 sm:mb-3 border border-fuchsia-500/30">
          <FiSliders className="w-4 h-4" /> บทเรียนที่ 6 (Lesson 6 of 8)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          เทคโนโลยี AI Deep Learning, โครงข่าย CNN, อัลกอริทึม YOLO และการเลือกใช้ Rule-Based vs AI
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          เข้าใจลำดับขั้นของงาน AI Vision (Classification &rarr; Object Detection &rarr; Segmentation), 
          กลไกการทำงาน 4 ขั้นตอนของอัลกอริทึม YOLO (Grid, BBox Regression, Confidence, NMS), แล็บทดลองเปรียบเทียบอัลกอริทึม และตารางตัดสินใจเลือกใช้ Classical Rule-Based คู่กับ AI Deep Learning
        </p>
      </div>

      {/* AI Vision Architecture & YOLO Explorer */}
      <AIVisionArchitectureLab />

      {/* Interactive Algorithm Inspector */}
      <VisionLogicInspector />

      {/* Comparison Guide */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-violet-400 font-black mr-2">3.</span>
          เกณฑ์การตัดสินใจเลือกเทคโนโลยี (Decision Matrix: Classical vs AI)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 text-xs">
          <div className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 sm:space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">เมื่อไหร่ควรใช้ Classical Rule-Based?</h3>
            <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
              <li>โจทย์คือการวัดขนาดมิติ (Dimension &plusmn;0.01 mm) เช่น รูเจาะ, ความกว้าง, ความหนา</li>
              <li>การอ่านบาร์โค้ด 1D / 2D DataMatrix ตามมาตรฐาน ISO</li>
              <li>การหาพิกัด X/Y และมุมหมุน (Orientation Angle) ให้แขนกล Robot หยิบชิ้นงาน</li>
              <li>ต้องการ Cycle Time ที่เร็วมากระดับต่ำกว่า 10 ms</li>
              <li>ไม่มีงบประมาณสำหรับซื้อการ์ดจอ GPU เกรดอุตสาหกรรมราคาแพง</li>
            </ul>
          </div>

          <div className="p-3 sm:p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-1.5 sm:space-y-2">
            <h3 className="font-bold text-purple-300 text-sm">เมื่อไหร่ต้องใช้ AI Deep Learning?</h3>
            <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
              <li>รอยตำหนิมีรูปทรงไม่แน่นอน เช่น รอยแตกร้าว (Crack), รอยบุบ, รอยขูดขีด</li>
              <li>พื้นผิวชิ้นงานมีความแปรปรวนตามธรรมชาติ เช่น รอยเชื่อมสปอต, ผิวโฟม, ผิวผ้า</li>
              <li>สภาพแสงหน้างานหรือคราบน้ำมันมีความผันผวนจนเขียนสูตรคณิตศาสตร์ครอบคลุมไม่ได้</li>
              <li>การจำแนกประเภทสิ่งแปลกปลอม (Foreign Object Classification)</li>
              <li>มีภาพตัวอย่างของเสีย (NG Data) มากเพียงพอสำหรับการเทรนโมเดล</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* MODULE 7: THRESHOLD TUNING, DISTRIBUTION CURVES & CONFUSION MATRIX        */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod7() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 sm:mb-3 border border-emerald-500/30">
          <FiActivity className="w-4 h-4" /> บทเรียนที่ 7 (Lesson 7 of 8)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          การปรับจูนค่าเกณฑ์ตัดสิน (Threshold Tuning), เส้นโค้งการแจกแจง และตาราง Confusion Matrix
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          เรียนรู้วิธีอ่านกราฟเส้นโค้งการแจกแจงคะแนนการตรวจ (Distribution Curves), การบริหารจัดการค่า Margin ความปลอดภัย, 
          การปรับจูนเส้น Decision Boundary เพื่อป้องกันของเสียหลุดรอดถึงลูกค้า (Escape = 0%) ควบคู่กับการคุมอัตราคัดทิ้งผิดพลาด (Overkill &lt; 0.5%) และตารางวิเคราะห์ Confusion Matrix
        </p>
      </div>

      {/* Threshold Tuning Lab */}
      <ThresholdTuningLab />

      {/* Confusion Matrix in Manufacturing Engineering Table */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-rose-400 font-black mr-2">2.</span>
          ตารางวิเคราะห์ Confusion Matrix ในระบบควบคุมคุณภาพโรงงาน (Manufacturing Quality Matrix)
        </h2>
        <div className="space-y-1.5">
          <div className="sm:hidden text-[11px] text-slate-400 flex items-center justify-end gap-1.5 font-mono">
            <span>เลื่อนแนวนอนเพื่อดูตารางเปรียบเทียบเต็ม</span>
            <span className="text-cyan-400">↔</span>
          </div>
          <div className="overflow-x-auto pb-2 scrollbar-thin rounded-xl border border-slate-800">
            <table className="w-full min-w-[720px] text-left text-xs text-slate-300 border-collapse">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
                <tr>
                  <th className="w-[22%] align-top py-3 px-4">สภาวะทางสถิติ</th>
                  <th className="w-[22%] align-top py-3 px-4">การตัดสินของ Machine Vision</th>
                  <th className="w-[22%] align-top py-3 px-4">สถานะชิ้นงานจริง</th>
                  <th className="w-[34%] align-top py-3 px-4">ผลกระทบต่อสายการผลิตและต้นทุน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-emerald-400">True Positive (TP)</td>
                  <td className="align-top py-3 px-4 text-emerald-300">ตัดสินว่า "NG" (มีรอยตำหนิ)</td>
                  <td className="align-top py-3 px-4 font-bold text-rose-400">ชิ้นงานเสียจริง (Defective)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">ระบบคัดแยกเตะงานเสียลงราง Reject ได้ถูกต้อง ป้องกันของเสียหลุด 100%</td>
                </tr>
                <tr className="hover:bg-slate-850/50">
                  <td className="align-top py-3 px-4 font-bold text-emerald-400">True Negative (TN)</td>
                  <td className="align-top py-3 px-4 text-emerald-300">ตัดสินว่า "PASS / OK"</td>
                  <td className="align-top py-3 px-4 font-bold text-emerald-400">ชิ้นงานดีจริง (Good Part)</td>
                  <td className="align-top py-3 px-4 text-slate-300 leading-relaxed">ชิ้นงานไหลไปยังกระบวนการถัดไปได้อย่างราบรื่น ไม่สูญเสียเวลาการผลิต</td>
                </tr>
                <tr className="hover:bg-slate-850/50 bg-amber-950/20">
                  <td className="align-top py-3 px-4 font-bold text-amber-400">False Positive (FP) / Overkill</td>
                  <td className="align-top py-3 px-4 text-rose-300">ตัดสินว่า "NG" (ผิดพลาด)</td>
                  <td className="align-top py-3 px-4 font-bold text-emerald-400">ชิ้นงานดี (Good Part)</td>
                  <td className="align-top py-3 px-4 text-amber-300 leading-relaxed">Yield การผลิตตก ต้องจ้างคนมาคัดกรองซ้ำ (Re-inspection Cost) คุมให้ &lt; 0.5%</td>
                </tr>
                <tr className="hover:bg-slate-850/50 bg-rose-950/30">
                  <td className="align-top py-3 px-4 font-bold text-rose-400">False Negative (FN) / Escape</td>
                  <td className="align-top py-3 px-4 text-emerald-300">ตัดสินว่า "PASS" (ผิดพลาด!)</td>
                  <td className="align-top py-3 px-4 font-bold text-rose-400">ชิ้นงานเสีย (Defective!)</td>
                  <td className="align-top py-3 px-4 text-rose-300 font-bold leading-relaxed">ของเสียหลุดรอดสู่ลูกค้า! เสี่ยงถูก Reject ทั้งล็อต เคลมค่าเสียหายหลักล้าน (ต้อง 0 PPM)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* MODULE 8: INDUSTRIAL WORKSHOPS, YOLO+PLC PROJECT & MES TRACEABILITY       */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod8() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-teal-950/70 via-emerald-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-teal-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 text-xs font-bold mb-2 sm:mb-3 border border-teal-500/30">
          <FiCheckCircle className="w-4 h-4" /> บทเรียนที่ 8 (Lesson 8 of 8)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          เวิร์กช็อปปฏิบัติการหน้างาน, โปรเจกต์ YOLO + PLC และการเชื่อมต่อฐานข้อมูล MES Traceability
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          ประยุกต์ใช้ความรู้ทั้งหมดผ่าน 3 เวิร์กช็อปจริงจากหน้างานโรงงาน (Part Counting, Poka-Yoke Verification, Robot Pick &amp; Place Guidance), 
          มินิโปรเจกต์ Python รันโมเดล YOLOv8 สั่งงาน PLC Ejector และการส่งข้อมูลเข้าสู่ฐานข้อมูล MES เพื่อการสืบย้อนกลับตามมาตรฐาน IATF 16949
        </p>
      </div>

      {/* 3 Industrial Workshops from Slides 49-55 */}
      <IndustrialWorkshopsLab />

      {/* Capstone Mini-Project: Real-Time YOLO Defect Detection Loop (Slide 55) */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white leading-normal">
          <span className="text-purple-400 font-black mr-2">2.</span>
          มินิโปรเจกต์ส่งท้าย: Real-Time YOLO Defect Inspection &amp; PLC Trigger Integration (Slide 55)
        </h2>
        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
          <p className="text-slate-300 leading-relaxed m-0">
            โครงสร้างโค้ด Python มาตรฐานสำหรับนำโมเดล AI (เช่น YOLOv8) ไปรันคู่กับกล้องอุตสาหกรรมในไลน์ผลิตจริง พร้อมการนับสถิติ OK/NG และส่งสัญญาณออก PLC:
          </p>
          <pre className="p-3 bg-slate-900 rounded-lg border border-slate-800 text-slate-200 font-mono text-[11px] overflow-x-auto leading-relaxed">
            <code>{`# Industrial Real-Time YOLO Inspection Script
import cv2
from ultralytics import YOLO
import snap7 # ไลบรารีสื่อสาร PLC Siemens S7-1200/1500

# 1. โหลดโมเดลที่เทรนตรวจจับชิ้นงานและรอยตำหนิ
model = YOLO('best_part_detector.pt')

# 2. เชื่อมต่อกล้องอุตสาหกรรม
cap = cv2.VideoCapture(0, cv2.CAP_DSHOW)
ok_count, ng_count = 0, 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break

    # รัน AI Inference
    results = model.predict(frame, conf=0.65, verbose=False)
    has_defect = False

    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        cls_name = model.names[cls_id]
        if 'defect' in cls_name or 'crack' in cls_name:
            has_defect = True
            break

    # ส่งสัญญาณควบคุม Ejector
    if has_defect:
        ng_count += 1
        trigger_plc_ejector() # ส่ง Digital Out 24V เข้า PLC
    else:
        ok_count += 1

    # แสดงผลบนหน้าจอ Operator
    annotated_frame = results[0].plot()
    cv2.putText(annotated_frame, f"OK: {ok_count} | NG: {ng_count}", (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 255, 0), 2)
    cv2.imshow('Live Quality Inspection', annotated_frame)
    if cv2.waitKey(1) == 27: break

cap.release()
cv2.destroyAllWindows()`}</code>
          </pre>
          <div className="text-[11px] text-purple-300 bg-purple-950/30 p-2.5 rounded-lg border border-purple-500/20">
            🚀 <strong>จุดเด่น:</strong> โค้ดนี้ผสานทั้ง AI Vision (YOLO), Image Processing (OpenCV), และการควบคุมฮาร์ดแวร์จริง (PLC Communication) เป็นสถาปัตยกรรมระดับสากล
          </div>
        </div>
      </section>

      {/* End-to-End Hardware & MES Architecture */}
      <VisionHardwareArchitecture />
    </div>
  );
}

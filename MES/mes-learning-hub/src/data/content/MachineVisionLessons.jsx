import React, { useState } from 'react';
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
  const [conveyorSpeed, setConveyorSpeed] = useState(45); // m/min (0, 30, 60, 90)

  const skewAngle = (conveyorSpeed / 90) * 24; // deg
  const measurementError = ((conveyorSpeed / 90) * 16.5).toFixed(1);

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-1 border border-indigo-500/30">
            <span>Industrial Sensor Comparison &middot; การเลือกชัตเตอร์เซนเซอร์</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            Global Shutter vs Rolling Shutter สำหรับชิ้นงานบนสายพานลำเลียง (Conveyor Motion)
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            เหตุผลสำคัญที่ห้ามใช้กล้องเว็บแคมหรือมือถือตรวจงานในโรงงาน: ผลกระทบของความเร็วสายพานต่อความแม่นยำเชิงมิติ
          </p>
        </div>

        {/* Speed Slider */}
        <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center gap-3">
          <span className="text-xs font-bold text-slate-300 whitespace-nowrap">ความเร็วสายพาน:</span>
          <input 
            type="range" 
            min="0" 
            max="90" 
            step="15" 
            value={conveyorSpeed} 
            onChange={(e) => setConveyorSpeed(Number(e.target.value))}
            className="w-24 sm:w-32 accent-indigo-400 cursor-pointer"
          />
          <span className="font-mono font-bold text-amber-300 text-xs bg-slate-800 px-2 py-0.5 rounded border border-slate-700 min-w-[70px] text-center">
            {conveyorSpeed} m/min
          </span>
        </div>
      </div>

      {/* Side-by-Side Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Rolling Shutter */}
        <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
            <h4 className="font-bold text-rose-700 dark:text-rose-300 text-xs sm:text-sm">
              Rolling Shutter (กล้องมือถือ / เว็บแคม)
            </h4>
            <span className="self-start sm:self-auto text-[10px] font-bold text-rose-800 dark:text-rose-300 bg-rose-100 dark:bg-rose-950 px-2.5 py-0.5 rounded border border-rose-300 dark:border-rose-500/30 whitespace-nowrap">
              อ่านทีละแถวจากบนลงล่าง
            </span>
          </div>

          <div className="aspect-[16/9] w-full bg-slate-900 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
            <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400">
              Row Readout Delay: 15 ms
            </div>

            <div 
              className="w-28 h-28 bg-slate-700/80 border-2 border-rose-400 rounded-md relative flex items-center justify-center shadow-lg transition-all duration-300"
              style={{
                transform: `skewX(${skewAngle}deg)`
              }}
            >
              <div 
                className="w-10 h-10 rounded-full border border-rose-300 flex items-center justify-center text-[10px] font-mono font-bold text-rose-200"
                style={{
                  transform: `scaleX(${1 + conveyorSpeed / 120})`
                }}
              >
                รีเบี้ยว
              </div>
              <span className="absolute -bottom-5 text-[10px] font-mono text-rose-400 font-bold whitespace-nowrap">
                อ่านได้: {(50 + (Number(measurementError) * 0.5)).toFixed(2)} mm (เพี้ยน +{measurementError}%)
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
              <span className="text-slate-400">อาการภาพบิดเบี้ยว (Jello Skew):</span>
              <strong className="text-rose-400 font-mono">+{measurementError}% (สี่เหลี่ยมด้านขนาน)</strong>
            </div>
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
              <span className="text-slate-400">ความเสี่ยงหน้างาน:</span>
              <strong className="text-rose-400 font-mono">ชิ้นงานดีถูกเตะทิ้ง (False Reject) สูงมาก</strong>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              เซนเซอร์อ่านข้อมูลทีละแถวจากบนลงล่าง เมื่อชิ้นงานเคลื่อนที่ แถวล่างจะถูกบันทึกช้ากว่าแถวบน ส่งผลให้ชิ้นงานสี่เหลี่ยมกลายเป็นสี่เหลี่ยมด้านขนานทันที
            </p>
          </div>
        </div>

        {/* Global Shutter */}
        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-1">
            <h4 className="font-bold text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm">
              Global Shutter (มาตรฐานโรงงานอุตสาหกรรม)
            </h4>
            <span className="self-start sm:self-auto text-[10px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-100 dark:bg-emerald-950 px-2.5 py-0.5 rounded border border-emerald-300 dark:border-emerald-500/30 whitespace-nowrap">
              ทุกพิกเซลเปิดพร้อมกัน
            </span>
          </div>

          <div className="aspect-[16/9] w-full bg-slate-900 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
            <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400">
              Sensor Exposure: 50 &mu;s
            </div>

            <div className="w-28 h-28 bg-slate-700 border-2 border-emerald-400 rounded-md relative flex items-center justify-center shadow-lg transition-transform">
              <div className="w-10 h-10 rounded-full border border-emerald-300 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-200">
                &Oslash; 20mm
              </div>
              <span className="absolute -bottom-5 text-[10px] font-mono text-emerald-300 font-bold whitespace-nowrap">
                ขนาด 50.00 mm (Error 0.00%)
              </span>
            </div>
          </div>

          <div className="text-xs text-slate-300 space-y-1.5 pt-1">
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
              <span className="text-slate-400">อาการภาพบิดเบี้ยว (Distortion):</span>
              <strong className="text-emerald-400 font-mono">0.00% (ไม่มีอาการเอียง)</strong>
            </div>
            <div className="flex items-center justify-between text-[11px] pb-1 border-b border-slate-800">
              <span className="text-slate-400">ความแม่นยำในการวัดมิติ:</span>
              <strong className="text-emerald-400 font-mono">&plusmn;0.01 mm (มาตรฐานยานยนต์)</strong>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              ทุกพิกเซลในเซนเซอร์เปิดรับแสงพร้อมกันในเสี้ยววินาที ชัตเตอร์อิเล็กทรอนิกส์หยุดการเคลื่อนไหวของชิ้นงานได้ 100% แม้วัตถุจะวิ่งเร็วแค่ไหนก็ไม่เบี้ยว
            </p>
          </div>
        </div>
      </div>

      {/* Engineering Formula Callout */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
        <div>
          <span className="text-indigo-400 font-bold block mb-0.5">สูตรคำนวณการเบลอจากการเคลื่อนที่ (Motion Blur Formula):</span>
          <span>Blur (pixels) = [ความเร็วสายพาน (mm/s) &times; เวลาเปิดชัตเตอร์ (s)] / ความละเอียดออปติก (mm/pixel)</span>
        </div>
        <div className="text-[11px] text-emerald-400 bg-slate-900 p-2 rounded border border-slate-800 whitespace-nowrap">
          💡 กฎเหล็ก: คุม Blur ให้น้อยกว่า 1.0 Pixel เสมอ
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. INTERACTIVE OPTICAL FORMULAS & 3-PIXEL RULE CALCULATOR                 */
/* ========================================================================= */
function OpticalFormulasCalculator() {
  const [fovWidth, setFovWidth] = useState(100); // mm
  const [minDefect, setMinDefect] = useState(0.1); // mm
  const [workingDist, setWorkingDist] = useState(300); // mm
  const [sensorFormat, setSensorFormat] = useState('2_3'); // '1_3', '1_2', '1_18', '2_3', '1_inch'

  const sensorFormats = {
    '1_3': { name: '1/3" Sensor', width: 4.8, height: 3.6, diag: 6.0 },
    '1_2': { name: '1/2" Sensor', width: 6.4, height: 4.8, diag: 8.0 },
    '1_18': { name: '1/1.8" Sensor', width: 7.2, height: 5.4, diag: 9.0 },
    '2_3': { name: '2/3" Sensor', width: 8.8, height: 6.6, diag: 11.0 },
    '1_inch': { name: '1" Sensor', width: 12.8, height: 9.6, diag: 16.0 }
  };

  const currSensor = sensorFormats[sensorFormat];

  // 3-Pixel Rule Calculations (Slide 7):
  // Optical Resolution (Horizontal Pixels) = (FOV Width / Defect Size) * 3 pixels
  const requiredPixelsH = Math.round((fovWidth / Math.max(0.01, minDefect)) * 3);
  const requiredPixelsV = Math.round((requiredPixelsH * 3) / 4);
  const totalMegaPixels = ((requiredPixelsH * requiredPixelsV) / 1000000).toFixed(1);

  // Recommended Camera Resolution tier
  const getCameraTier = (mp) => {
    if (mp <= 0.4) return 'VGA (0.4 MP) &middot; 640x480';
    if (mp <= 1.3) return '1.3 MP &middot; 1280x1024';
    if (mp <= 2.3) return '2.3 MP &middot; 1920x1200 (Full HD)';
    if (mp <= 5.0) return '5.0 MP &middot; 2448x2048';
    if (mp <= 9.0) return '9.0 MP &middot; 4096x2160';
    if (mp <= 12.0) return '12.0 MP &middot; 4096x3000';
    if (mp <= 20.0) return '20.0 MP &middot; 5472x3648';
    return 'Line Scan Camera หรือ 25+ MP Multi-camera array';
  };

  // Focal Length Formula (Slide 8):
  // f = (Sensor Width * Working Distance) / FOV Width
  const calcFocalLength = ((currSensor.width * workingDist) / fovWidth).toFixed(1);

  // Optical Magnification: M = Sensor Width / FOV Width
  const magnification = (currSensor.width / fovWidth).toFixed(3);

  // Standard C-Mount Lens Options
  const standardLenses = [6, 8, 12, 16, 25, 35, 50, 75];
  const closestLens = standardLenses.reduce((prev, curr) => 
    Math.abs(curr - calcFocalLength) < Math.abs(prev - calcFocalLength) ? curr : prev
  );

  return (
    <div className="bg-slate-900 border border-sky-500/30 rounded-2xl p-3.5 sm:p-5 md:p-6 shadow-2xl space-y-4 sm:space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-bold mb-1 border border-sky-500/30">
            <FiTarget className="w-3.5 h-3.5 text-sky-400" />
            <span>Industrial Optical Engineering &middot; กฎ 3 พิกเซล &amp; การคำนวณเลนส์</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
            ห้องคำนวณความละเอียดกล้อง (The 3-Pixel Rule) และทางยาวโฟกัสเลนส์ (Focal Length Calculator)
          </h3>
          <p className="text-xs text-slate-400 mt-2 leading-relaxed">
            สูตรมาตรฐานจากหลักสูตรกลางวิศวกรรม Machine Vision เพื่อคัดเลือกกล้องและเลนส์ให้ตรงกับสเปกโรงงาน
          </p>
        </div>
      </div>

      {/* Interactive Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
        {/* FOV Width Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300 font-bold">
            <span>ขอบเขตภาพ (FOV Width):</span>
            <span className="text-cyan-400 font-mono">{fovWidth} mm</span>
          </div>
          <input 
            type="range" 
            min="20" 
            max="400" 
            step="10" 
            value={fovWidth} 
            onChange={(e) => setFovWidth(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">ความกว้างพื้นที่ตรวจจับชิ้นงาน</div>
        </div>

        {/* Defect Size Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300 font-bold">
            <span>รอยตำหนิเล็กสุด (Defect):</span>
            <span className="text-amber-400 font-mono">{minDefect} mm</span>
          </div>
          <input 
            type="range" 
            min="0.05" 
            max="1.5" 
            step="0.05" 
            value={minDefect} 
            onChange={(e) => setMinDefect(Number(e.target.value))}
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">ขนาด Defect ที่ต้องมองเห็น</div>
        </div>

        {/* Working Distance Slider */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300 font-bold">
            <span>ระยะห่างกล้อง (WD):</span>
            <span className="text-emerald-400 font-mono">{workingDist} mm</span>
          </div>
          <input 
            type="range" 
            min="100" 
            max="800" 
            step="20" 
            value={workingDist} 
            onChange={(e) => setWorkingDist(Number(e.target.value))}
            className="w-full accent-emerald-400 cursor-pointer"
          />
          <div className="text-[10px] text-slate-500">ระยะจากหน้าเลนส์ถึงชิ้นงาน</div>
        </div>

        {/* Sensor Format Select */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-slate-300 font-bold">
            <span>ขนาดเซนเซอร์กล้อง:</span>
            <span className="text-purple-400 font-mono">{currSensor.width} mm</span>
          </div>
          <select 
            value={sensorFormat} 
            onChange={(e) => setSensorFormat(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-xs text-white focus:outline-none focus:border-purple-400"
          >
            <option value="1_3">1/3" (4.8 x 3.6 mm)</option>
            <option value="1_2">1/2" (6.4 x 4.8 mm)</option>
            <option value="1_18">1/1.8" (7.2 x 5.4 mm)</option>
            <option value="2_3">2/3" (8.8 x 6.6 mm) &mdash; มาตรฐาน</option>
            <option value="1_inch">1" (12.8 x 9.6 mm) &mdash; ความละเอียดสูง</option>
          </select>
          <div className="text-[10px] text-slate-500">Image Sensor Optical Format</div>
        </div>
      </div>

      {/* Calculated Results Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: 3-Pixel Rule Resolution */}
        <div className="bg-slate-950 p-4 rounded-xl border border-sky-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">1. กฎ 3 พิกเซล (3-Pixel Rule)</span>
            <span className="text-[10px] font-mono bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded border border-sky-500/30">
              Noise Immunity
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-sky-400">{requiredPixelsH}</span>
            <span className="text-xs text-slate-400">พิกเซลแนวนอน (H)</span>
          </div>
          <div className="text-[11px] text-slate-300 border-t border-slate-800 pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">ความละเอียดรวม:</span>
              <strong className="text-white font-mono">{totalMegaPixels} MP</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">รุ่นกล้องที่แนะนำ:</span>
              <strong className="text-emerald-400" dangerouslySetInnerHTML={{ __html: getCameraTier(Number(totalMegaPixels)) }}></strong>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic pt-1">
            สูตร: (FOV / Defect) &times; 3 px เพื่อป้องกันการเกิด False Trigger จาก Sensor Noise
          </p>
        </div>

        {/* Card 2: Focal Length Calculation */}
        <div className="bg-slate-950 p-4 rounded-xl border border-amber-500/40 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-300">2. ทางยาวโฟกัส (Focal Length)</span>
            <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded border border-amber-500/30">
              f = (Sensor &times; WD) / FOV
            </span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black font-mono text-amber-400">{calcFocalLength}</span>
            <span className="text-xs text-slate-400">มิลลิเมตร (mm)</span>
          </div>
          <div className="text-[11px] text-slate-300 border-t border-slate-800 pt-2 space-y-1">
            <div className="flex justify-between">
              <span className="text-slate-400">เลนส์มาตรฐาน C-Mount:</span>
              <strong className="text-amber-300 font-mono text-sm">{closestLens} mm</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">อัตราขยาย (Magnification):</span>
              <strong className="text-white font-mono">{magnification}x</strong>
            </div>
          </div>
          <p className="text-[10px] text-slate-500 italic pt-1">
            หากค่าคำนวณอยู่กึ่งกลาง ให้เลือกเลนส์ขนาดใกล้เคียงแล้วปรับชดเชยที่ระยะ Working Distance
          </p>
        </div>

        {/* Card 3: Sensor Coverage & Vignetting Warning */}
        <div className="bg-slate-950 p-4 rounded-xl border border-purple-500/40 space-y-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold text-slate-300">3. ขนาดเลนส์ vs เซนเซอร์</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                Vignetting Check
              </span>
            </div>
            <div className="text-xs text-slate-300 space-y-1 pt-1">
              <div className="p-2 bg-slate-900 rounded-lg border border-slate-800">
                <span className="text-slate-400 block text-[10px]">กฎการจับคู่ Image Circle (Slide 9):</span>
                <strong className="text-emerald-400">วงภาพเลนส์ &ge; ขนาดเซนเซอร์กล้อง เสมอ</strong>
              </div>
              <ul className="text-[11px] text-slate-300 space-y-1 pt-1 list-disc list-inside">
                <li>เลนส์ 2/3" ใส่บนเซนเซอร์ 1/2" = <span className="text-emerald-400 font-bold">OK (ภาพสว่างเต็มเฟรม)</span></li>
                <li>เลนส์ 1/2" ใส่บนเซนเซอร์ 2/3" = <span className="text-rose-400 font-bold">FAIL (เกิดขอบมืด Vignetting)</span></li>
              </ul>
            </div>
          </div>
          <div className="text-[10px] text-slate-400 bg-purple-950/30 p-2 rounded border border-purple-500/20">
            💡 <strong>Telecentric Lens:</strong> ทางเลือกพิเศษสำหรับงานวัดขนาด ลดความเพี้ยนเปอร์สเปกทีฟเป็น 0
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
function ThresholdTuningLab() {
  const [threshold, setThreshold] = useState(65);

  const escapePPM = threshold > 75 ? Math.round(Math.pow((threshold - 75) * 1.8, 2)) : 0;
  const overkillPercent = threshold < 50 ? (12.5 - threshold * 0.2).toFixed(1) : (Math.max(0.2, (75 - threshold) * 0.08)).toFixed(2);

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
              <span className="text-xs text-slate-400">PPM (ชิ้นในหนึ่งล้านชิ้น)</span>
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
              <span className="text-xs text-slate-400">ของงานทั้งหมดในไลน์</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-800 pt-2 m-0">
            {Number(overkillPercent) <= 0.5 
              ? '✓ ควบคุมอัตราการทิ้งชิ้นงานดีต่ำกว่า 0.5% โรงงานไม่สูญเสียต้นทุนวัตถุดิบเกินจำเป็น' 
              : '⚠️ ค่าเกณฑ์ตึงเกินไป! คราบฝุ่นหรือรอยสะท้อนแสงถูกตัดสินเป็นของเสีย ทำให้ต้องใช้พนักงานยืนตรวจซ้ำ'}
          </p>
        </div>
      </div>

      {/* Bell Curve Gaussian SVG */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800">
        <div className="text-xs font-bold text-slate-400 mb-2 flex items-center justify-between">
          <span>เส้นโค้งการแจกแจงค่าการตรวจ (Distribution Curves &amp; Decision Boundary)</span>
          <span className="text-[10px] text-cyan-400 font-mono">Sweet Spot: 65% - 72%</span>
        </div>
        <div className="relative aspect-[16/7] w-full bg-slate-900 rounded-lg p-2">
          <svg className="w-full h-full" viewBox="0 0 500 180">
            <line x1="40" y1="150" x2="480" y2="150" stroke="#475569" strokeWidth="1.5" />
            <text x="40" y="168" fill="#94a3b8" fontSize="10">0 (เสียชัดเจน)</text>
            <text x="480" y="168" textAnchor="end" fill="#94a3b8" fontSize="10">100 (สมบูรณ์แบบ)</text>

            <path d="M 50 150 Q 130 20 210 150" fill="rgba(244, 63, 94, 0.2)" stroke="#f43f5e" strokeWidth="2" />
            <text x="130" y="80" textAnchor="middle" fill="#f43f5e" fontSize="11" fontWeight="bold">ชิ้นงานเสีย (Defective Parts)</text>

            <path d="M 230 150 Q 350 10 470 150" fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="2" />
            <text x="350" y="70" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">ชิ้นงานดี (Good Parts)</text>

            {(() => {
              const xPos = 40 + (threshold / 100) * 440;
              return (
                <g>
                  <line x1={xPos} y1="10" x2={xPos} y2="150" stroke="#38bdf8" strokeWidth="3" strokeDasharray="4,3" />
                  <polygon points={`${xPos-6},10 ${xPos+6},10 ${xPos},18`} fill="#38bdf8" />
                  <rect x={xPos - 45} y="15" width="90" height="20" rx="3" fill="#0284c7" />
                  <text x={xPos} y="29" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="bold">
                    Threshold: {threshold}%
                  </text>
                </g>
              );
            })()}
          </svg>
        </div>
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
/* MAIN EXPORTED LESSON MODULES (1 - 4)                                     */
/* ========================================================================= */

/* ------------------------------------------------------------------------- */
/* MODULE 1: MACHINE VISION BASICS & SYSTEM ARCHITECTURE                     */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod1() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-2 sm:mb-3 border border-blue-500/30">
          <FiEye className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          พื้นฐานระบบ Machine Vision และโครงสร้างระบบตรวจสอบในโรงงานอัจฉริยะ (Industry 4.0)
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          เข้าใจรากฐานของแมชชีนวิชัน: ความแตกต่างระหว่าง Human Vision กับ Machine Vision, 
          ลำดับชั้น AI / Computer Vision / Machine Vision, วงจรการทำงาน 4 ขั้นตอน (Acquisition &rarr; Processing &rarr; Analysis &rarr; Decision), 
          ประเภทระบบ 1D / 2D / 3D, 4 เสาหลักการใช้งานในโรงงาน และการเลือกเซนเซอร์ Global Shutter
        </p>
      </div>

      {/* Section 1: Why Machine Vision in Industry 4.0? Human vs Machine */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">1</span>
          ทำไมโรงงาน Industry 4.0 ต้องเปลี่ยนสู่ระบบ Machine Vision? (Human vs Machine Vision)
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed m-0">
          ในกระบวนการผลิตความเร็วสูง เช่น สายการผลิตยานยนต์และอิเล็กทรอนิกส์ สายตามนุษย์มีข้อจำกัดด้านความล้า (Fatigue) 
          ความเร็วการตอบสนอง และการตัดสินที่มีอคติส่วนบุคคล (Subjective Judgment) แมชชีนวิชันจึงเข้ามาแก้ปัญหาด้วยคุณสมบัติหลัก:
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ปัจจัยเปรียบเทียบ (Criteria)</th>
                <th className="py-3 px-4 text-rose-300">สายตามนุษย์ (Human Inspection)</th>
                <th className="py-3 px-4 text-emerald-300">ระบบแมชชีนวิชัน (Industrial Machine Vision)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-white">ความเร็วในการตรวจ (Inspection Speed)</td>
                <td className="py-3 px-4 text-slate-300">จำกัดที่ 1 - 2 ชิ้นต่อวินาที หากเร็วกว่านี้จะเริ่มหลุดรอด</td>
                <td className="py-3 px-4 font-bold text-emerald-400">มากกว่า 30 - 120 ชิ้นต่อวินาที (ตามรอบชัตเตอร์และ IPC)</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-white">ความสม่ำเสมอและความเที่ยงตรง (Repeatability)</td>
                <td className="py-3 px-4 text-slate-300">ผันแปรตามความเหนื่อยล้า กะกลางคืน อารมณ์ และแสงสว่าง</td>
                <td className="py-3 px-4 font-bold text-emerald-400">100% สม่ำเสมอตลอด 24 ชม. ไม่มีความเมื่อยล้า ไร้อคติ</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-white">การวัดขนาดมิติ (Dimension Gauging)</td>
                <td className="py-3 px-4 text-slate-300">กะประมาณด้วยสายตาได้แค่ระดับมิลลิเมตร ต้องใช้เวอร์เนียร์วัดทีละชิ้น</td>
                <td className="py-3 px-4 font-bold text-emerald-400">วัดขนาดได้ระดับไมครอน (&plusmn;0.005 mm) วัดครบทุกชิ้น 100% Inline</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-white">การบันทึกข้อมูลเพื่อการสืบย้อนกลับ (Traceability)</td>
                <td className="py-3 px-4 text-slate-300">ต้องจดบันทึกลงกระดาษ เสี่ยงต่อการสูญหายและบันทึกย้อนหลังเท็จ</td>
                <td className="py-3 px-4 font-bold text-emerald-400">บันทึกรูปภาพและค่ามิติลงฐานข้อมูล MES / SQL Server ทันทีทุกชิ้นงาน</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Section 2: Hierarchy & Venn Diagram: AI vs CV vs DL vs Machine Vision */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-indigo-600/30 text-indigo-400 flex items-center justify-center text-sm font-black border border-indigo-500/40">2</span>
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
            {/* SVG Venn Diagram */}
            <svg viewBox="0 0 320 220" className="w-full h-full max-h-56">
              {/* Outer AI circle */}
              <circle cx="160" cy="110" r="100" fill="rgba(168, 85, 247, 0.1)" stroke="#a855f7" strokeWidth="1.5" />
              <text x="160" y="30" textAnchor="middle" fill="#d8b4fe" fontSize="11" fontWeight="bold">Artificial Intelligence (AI)</text>

              {/* CV Circle */}
              <circle cx="160" cy="120" r="75" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8" strokeWidth="1.5" />
              <text x="160" y="65" textAnchor="middle" fill="#7dd3fc" fontSize="10" fontWeight="bold">Computer Vision (CV)</text>

              {/* Overlapping DL & Machine Vision */}
              <circle cx="125" cy="135" r="45" fill="rgba(244, 63, 94, 0.25)" stroke="#f43f5e" strokeWidth="1.5" />
              <text x="110" y="130" textAnchor="middle" fill="#fda4af" fontSize="9" fontWeight="bold">Deep Learning</text>
              <text x="110" y="142" textAnchor="middle" fill="#fda4af" fontSize="8">(AI Vision)</text>

              <circle cx="195" cy="135" r="45" fill="rgba(34, 197, 94, 0.25)" stroke="#22c55e" strokeWidth="1.5" />
              <text x="210" y="130" textAnchor="middle" fill="#86efac" fontSize="9" fontWeight="bold">Machine Vision</text>
              <text x="210" y="142" textAnchor="middle" fill="#86efac" fontSize="8">(Industrial HW &amp; Optics)</text>

              <text x="160" y="140" textAnchor="middle" fill="#ffffff" fontSize="9" fontWeight="black">Edge AI</text>
            </svg>
          </div>
        </div>
      </section>

      {/* Section 3: The 4-Stage Core Working Principle Pipeline */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-sky-600/30 text-sky-400 flex items-center justify-center text-sm font-black border border-sky-500/40">3</span>
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

      {/* Section 4: Types of Machine Vision (1D vs 2D vs 3D) */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-sm font-black border border-violet-500/40">4</span>
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

      {/* Section 5: 4 Industrial Application Pillars */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-sm font-black border border-emerald-500/40">5</span>
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

      {/* Section 6: 6 Core Components of Industrial Machine Vision */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">6</span>
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
/* MODULE 2: OPTICAL HARDWARE, LIGHTING & 3-PIXEL RULE                      */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod2() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-2 sm:mb-3 border border-cyan-500/30">
          <FiCamera className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          การเตรียมชิ้นงาน อุปกรณ์ภาพ การคำนวณทางเลนส์ และเทคนิคการจัดแสง
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          "Lighting is 80% of Success" &mdash; แสงสว่างและการเลือกเลนส์คือหัวใจของความแม่นยำในระบบแมชชีนวิชัน 
          เรียนรู้เทคนิคการตัดแสงสะท้อนจ้า (Glare), การคำนวณความละเอียดด้วย <strong>กฎ 3 พิกเซล (The 3-Pixel Rule)</strong>, 
          สูตรคำนวณทางยาวโฟกัส (Focal Length), การป้องกันขอบภาพมืด (Vignetting), และตารางเปรียบเทียบพอร์ตเชื่อมต่อกล้องอุตสาหกรรม
        </p>
      </div>

      {/* Interactive Optical Lighting Simulator */}
      <OpticalLightingSimulator />

      {/* Detailed Lighting Cheat Sheet Table */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-cyan-600/30 text-cyan-400 flex items-center justify-center text-sm font-black border border-cyan-500/40">2</span>
          ตารางสรุปการเลือกชนิดของแสงตามโจทย์ชิ้นงานโรงงาน (Lighting Cheat Sheet)
        </h2>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">ชนิดแสง (Lighting Type)</th>
                <th className="py-3 px-4">ลักษณะการให้แสง</th>
                <th className="py-3 px-4">โจทย์ชิ้นงานที่เหมาะสม</th>
                <th className="py-3 px-4">ข้อควรระวังหน้างาน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-amber-300">💡 Backlight (ไฟส่องหลัง)</td>
                <td className="py-3 px-4">ส่องจากหลังชิ้นงาน เกิดเงาดำ Silhouette 100% Contrast</td>
                <td className="py-3 px-4 font-semibold text-white">วัดขนาดมิติ (Dimension), รูเจาะ, เกลียวน็อต, ขอบครีบ (Burr)</td>
                <td className="py-3 px-4 text-slate-400">ต้องมีพื้นที่ติดตั้งไฟใต้สายพาน ตรวจพื้นผิวไม่ได้</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-cyan-300">🎯 Coaxial Light (ไฟร่วมแกน)</td>
                <td className="py-3 px-4">แสงสะท้อนผ่านกระจก 45° ขนานแกนเลนส์ตกกระทบ 90°</td>
                <td className="py-3 px-4 font-semibold text-white">ตรวจรอยขูดขีดบนแผ่นโลหะเงา, กระจก, ซิลิคอนเวเฟอร์</td>
                <td className="py-3 px-4 text-slate-400">ระยะห่าง Working Distance ต้องคงที่ ห้ามวางเอียง</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-purple-300">🎪 Diffuse Dome Light (ไฟโดม)</td>
                <td className="py-3 px-4">แสงกระจายสะท้อนจากโดมโค้งรอบทิศ 360° ไร้เงามืด</td>
                <td className="py-3 px-4 font-semibold text-white">ชิ้นงานผิวโค้งมน, ท่อทองแดง, ฝากระป๋อง, แผง PCB นูนต่ำ</td>
                <td className="py-3 px-4 text-slate-400">ตัวโดมมีขนาดใหญ่ ต้องเว้นช่องรูกล้องมองกลางโดม</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-emerald-300">🕶️ Polarizing Filter (CPL)</td>
                <td className="py-3 px-4">กรองคลื่นแสงสะท้อนระนาบตรง ขจัดแสงวาบขาวน้ำมัน</td>
                <td className="py-3 px-4 font-semibold text-white">ชิ้นงานปั๊มขึ้นรูปเคลือบน้ำมันหล่อเย็น, ขั้วแบตเตอรี่เงา</td>
                <td className="py-3 px-4 text-slate-400">แสงโดยรวมจะดรอปลงประมาณ 1-2 Stop ต้องชดเชยเวลาชัตเตอร์</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-sky-300">⭕ Ring Light (ไฟวงแหวน)</td>
                <td className="py-3 px-4">ติดตั้งล้อมรอบหน้าเลนส์ ส่องแสงกระจายตรงเข้าหาชิ้นงาน</td>
                <td className="py-3 px-4 font-semibold text-white">ตรวจเช็คตัวอักษร OCR, โลโก้, บาร์โค้ดบนพื้นผิวด้านทั่วไป</td>
                <td className="py-3 px-4 text-slate-400">ห้ามใช้กับชิ้นงานโลหะเงาวับ เพราะจะเกิดวงสะท้อนรูปโดนัทเข้ากล้อง</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Optical Formulas & 3-Pixel Rule Calculator */}
      <OpticalFormulasCalculator />

      {/* Industrial Camera Interface Comparison Matrix */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-sky-600/30 text-sky-400 flex items-center justify-center text-sm font-black border border-sky-500/40">4</span>
          ตารางเปรียบเทียบพอร์ตเชื่อมต่อกล้องอุตสาหกรรม (Industrial Camera Interfaces Comparison)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">มาตรฐานพอร์ต (Interface)</th>
                <th className="py-3 px-4">แบนด์วิดท์ (Bandwidth)</th>
                <th className="py-3 px-4">ระยะสายสูงสุด (Max Cable Length)</th>
                <th className="py-3 px-4">การ์ด Frame Grabber?</th>
                <th className="py-3 px-4">ข้อดีในโรงงานอุตสาหกรรม</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-cyan-400">GigE Vision (1G / 10G)</td>
                <td className="py-3 px-4 font-mono">1 Gbps &ndash; 10 Gbps</td>
                <td className="py-3 px-4 font-bold text-emerald-400">สูงสุด 100 เมตร (Cat6)</td>
                <td className="py-3 px-4 text-emerald-400">ไม่ต้องใช้ (เสียบพอร์ต LAN)</td>
                <td className="py-3 px-4 text-slate-300">สายยาว ลากข้ามตู้ควบคุมได้ไกล รองรับ PoE (จ่ายไฟผ่านสายแลนเส้นเดียว) นิยมที่สุดในโลก</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-blue-400">USB 3.0 Vision</td>
                <td className="py-3 px-4 font-mono">~5 Gbps (USB 3.1 Gen1)</td>
                <td className="py-3 px-4 font-mono text-amber-400">3 &ndash; 5 เมตร</td>
                <td className="py-3 px-4 text-emerald-400">ไม่ต้องใช้ (Plug &amp; Play)</td>
                <td className="py-3 px-4 text-slate-300">ติดตั้งง่าย ต้นทุนต่ำ เหมาะกับแท่นตรวจสอบขนาดกะทัดรัด (Standalone Testing Jig)</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-purple-400">CoaXPress (CXP-6 / CXP-12)</td>
                <td className="py-3 px-4 font-mono text-emerald-400">6 Gbps &ndash; 50 Gbps</td>
                <td className="py-3 px-4 font-mono">40 &ndash; 100 เมตร (Coaxial)</td>
                <td className="py-3 px-4 text-rose-400 font-bold">ต้องใช้การ์ดเฉพาะทาง (PCIe)</td>
                <td className="py-3 px-4 text-slate-300">ความเร็วสูงสุดระดับอัลตราสปีด เหมาะกับกล้อง Line Scan และงานตรวจจับแผ่นเวเฟอร์เซมิคอนดักเตอร์</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-slate-400">Camera Link</td>
                <td className="py-3 px-4 font-mono">2 Gbps &ndash; 6.8 Gbps</td>
                <td className="py-3 px-4 font-mono text-amber-400">10 เมตร</td>
                <td className="py-3 px-4 text-rose-400 font-bold">ต้องใช้การ์ดเฉพาะทาง (PCIe)</td>
                <td className="py-3 px-4 text-slate-300">Latency คงที่ในระดับไมโครวินาที (Deterministic Real-time) มีความเสถียรสูงสุด</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------------- */
/* MODULE 3: PYTHON OPENCV & AI DEEP LEARNING LOGIC                          */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod3() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-violet-950/70 via-purple-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-violet-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-2 sm:mb-3 border border-violet-500/30">
          <FiSliders className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          การประมวลผลภาพด้วย Python &amp; OpenCV และ AI Deep Learning ในโรงงานอัจฉริยะ
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          ครอบคลุมทฤษฎีภาพดิจิทัลในเชิงเมทริกซ์ตัวเลข (0-255), ระบบสี BGR vs RGB และ HSV, 
          13 ฟังก์ชันสำคัญของ OpenCV สำหรับงานโรงงาน, ลำดับขั้นของ AI ใน Computer Vision (Classification &rarr; Segmentation), 
          และกลไก 4 ขั้นตอนของอัลกอริทึม YOLO สำหรับสายพานความเร็วสูง
        </p>
      </div>

      {/* Section 1: Digital Image as Numerical Matrix & Color Spaces */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-sm font-black border border-violet-500/40">1</span>
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
                <strong className="text-cyan-400">H (Hue - โทนสี 0°-180° ใน OpenCV):</strong> กำหนดเฉดสีบริสุทธิ์ (แดง เขียว น้ำเงิน ทองแดง)
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

      {/* AI Vision Architecture & YOLO Explorer */}
      <AIVisionArchitectureLab />

      {/* Interactive Algorithm Inspector */}
      <VisionLogicInspector />

      {/* Comparison Guide */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-sm font-black border border-violet-500/40">5</span>
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
/* MODULE 4: INDUSTRIAL WORKSHOPS, THRESHOLD TUNING & MES INTEGRATION        */
/* ------------------------------------------------------------------------- */
export function MachineVisionMod4() {
  return (
    <div className="space-y-4 sm:space-y-6 md:space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 p-4 sm:p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-2 sm:mb-3 border border-emerald-500/30">
          <FiCheckCircle className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white mb-2 sm:mb-3">
          การกำหนดค่ากระบวนการทดสอบหน้างานจริง การปรับจูน Threshold และ Case Studies
        </h1>
        <p className="text-slate-300 text-xs sm:text-sm md:text-base leading-relaxed m-0">
          การบริหารจัดการค่า Margin ความปลอดภัย, การปรับจูน Threshold ป้องกันชิ้นงานเสียหลุดรอดสู่ลูกค้า (Escape Rate = 0 PPM), 
          การควบคุม Yield งานดีถูกเตะทิ้ง (Overkill &lt; 0.5%), 3 เวิร์กช็อปจริงจากหน้างานโรงงาน (Part Counting, Poka-Yoke, Robot Guidance), 
          มินิโปรเจกต์ YOLO Defect Detection และการส่งข้อมูลเข้าสู่ฐานข้อมูล MES เพื่อการสืบย้อนกลับ 100%
        </p>
      </div>

      {/* Threshold Tuning Lab */}
      <ThresholdTuningLab />

      {/* Confusion Matrix in Manufacturing Engineering Table */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-rose-600/30 text-rose-400 flex items-center justify-center text-sm font-black border border-rose-500/40">2</span>
          ตารางวิเคราะห์ Confusion Matrix ในระบบควบคุมคุณภาพโรงงาน (Manufacturing Quality Matrix)
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">สภาวะทางสถิติ</th>
                <th className="py-3 px-4">การตัดสินของ Machine Vision</th>
                <th className="py-3 px-4">สถานะชิ้นงานจริง</th>
                <th className="py-3 px-4">ผลกระทบต่อสายการผลิตและต้นทุน</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-emerald-400">True Positive (TP)</td>
                <td className="py-3 px-4 text-emerald-300">ตัดสินว่า "NG" (มีรอยตำหนิ)</td>
                <td className="py-3 px-4 font-bold text-rose-400">ชิ้นงานเสียจริง (Defective)</td>
                <td className="py-3 px-4 text-slate-300">ระบบคัดแยกเตะงานเสียลงราง Reject ได้ถูกต้อง ป้องกันของเสียหลุด 100%</td>
              </tr>
              <tr className="hover:bg-slate-850/50">
                <td className="py-3 px-4 font-bold text-emerald-400">True Negative (TN)</td>
                <td className="py-3 px-4 text-emerald-300">ตัดสินว่า "PASS / OK"</td>
                <td className="py-3 px-4 font-bold text-emerald-400">ชิ้นงานดีจริง (Good Part)</td>
                <td className="py-3 px-4 text-slate-300">ชิ้นงานไหลไปยังกระบวนการถัดไปได้อย่างราบรื่น ไม่สูญเสียเวลาการผลิต</td>
              </tr>
              <tr className="hover:bg-slate-850/50 bg-amber-950/20">
                <td className="py-3 px-4 font-bold text-amber-400">False Positive (FP) / Overkill</td>
                <td className="py-3 px-4 text-rose-300">ตัดสินว่า "NG" (ผิดพลาด)</td>
                <td className="py-3 px-4 font-bold text-emerald-400">ชิ้นงานดี (Good Part)</td>
                <td className="py-3 px-4 text-amber-300">Yield การผลิตตก ต้องจ้างคนมาคัดกรองซ้ำ (Re-inspection Cost) คุมให้ &lt; 0.5%</td>
              </tr>
              <tr className="hover:bg-slate-850/50 bg-rose-950/30">
                <td className="py-3 px-4 font-bold text-rose-400">False Negative (FN) / Escape</td>
                <td className="py-3 px-4 text-emerald-300">ตัดสินว่า "PASS" (ผิดพลาด!)</td>
                <td className="py-3 px-4 font-bold text-rose-400">ชิ้นงานเสีย (Defective!)</td>
                <td className="py-3 px-4 text-rose-300 font-bold">ของเสียหลุดรอดสู่ลูกค้า! เสี่ยงถูก Reject ทั้งล็อต เคลมค่าเสียหายหลักล้าน (ต้อง 0 PPM)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 3 Industrial Workshops from Slides 49-55 */}
      <IndustrialWorkshopsLab />

      {/* Capstone Mini-Project: Real-Time YOLO Defect Detection Loop (Slide 55) */}
      <section className="bg-slate-900/80 p-4 sm:p-6 rounded-2xl border border-slate-800 space-y-3 sm:space-y-4">
        <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-sm font-black border border-purple-500/40">4</span>
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

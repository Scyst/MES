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
  FiTarget
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
      case 'front_polarizer':
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
    <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-1 border border-cyan-500/30">
            <FiSun className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Optical Simulator &middot; เครื่องมือจำลองการจัดแสง</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            ห้องทดลองเทคนิคแสงอุตสาหกรรมและการตัดแสงสะท้อน (Optical Glare Elimination)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
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
              {/* Grid Lines */}
              <defs>
                <pattern id="opticalGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5" />
                </pattern>
                {/* Ray gradients */}
                <linearGradient id="rayYellow" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#ef4444" stopOpacity="0.2" />
                </linearGradient>
                <linearGradient id="rayBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.3" />
                </linearGradient>
              </defs>
              <rect width="400" height="300" fill="url(#opticalGrid)" />

              {/* Workpiece at bottom */}
              <g transform="translate(140, 230)">
                <rect x="0" y="0" width="120" height="30" rx="4" fill="#64748b" stroke="#94a3b8" strokeWidth="2" />
                <text x="60" y="20" textAnchor="middle" fill="#cbd5e1" fontSize="10" fontWeight="bold">ชิ้นงานโลหะปั๊มขึ้นรูป</text>
                {/* Crack defect */}
                <path d="M 50 0 L 55 12 L 52 18 L 58 30" stroke="#ef4444" strokeWidth="2" fill="none" />
                <circle cx="55" cy="15" r="8" fill="none" stroke="#ef4444" strokeWidth="1" strokeDasharray="2,2" />
                <text x="75" y="38" textAnchor="start" fill="#f87171" fontSize="8" fontWeight="bold">รอยแตกร้าว (Crack)</text>
              </g>

              {/* Industrial Camera at Top Center */}
              <g transform="translate(160, 20)">
                <rect x="0" y="0" width="80" height="50" rx="6" fill="#1e293b" stroke="#06b6d4" strokeWidth="2" />
                {/* Lens */}
                <path d="M 20 50 L 60 50 L 50 75 L 30 75 Z" fill="#334155" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="40" cy="75" r="8" fill="#0284c7" opacity="0.8" />
                <text x="40" y="25" textAnchor="middle" fill="#38bdf8" fontSize="9" fontWeight="bold">กล้องอุตสาหกรรม</text>
                <text x="40" y="38" textAnchor="middle" fill="#94a3b8" fontSize="8">Global Shutter</text>
              </g>

              {/* Visual Setup Specific to Mode */}
              {lightMode === 'front_glare' && (
                <g>
                  {/* Front Light Source Angle 45 deg */}
                  <circle cx="60" cy="120" r="18" fill="#f59e0b" opacity="0.9" />
                  <text x="60" y="124" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="bold">ไฟหน้า 45°</text>
                  {/* Harsh Incident Rays */}
                  <line x1="75" y1="130" x2="190" y2="230" stroke="#fbbf24" strokeWidth="3" strokeDasharray="4,2" />
                  <line x1="70" y1="138" x2="175" y2="230" stroke="#fbbf24" strokeWidth="2" />
                  {/* Specular bounce straight into lens! */}
                  <line x1="190" y1="230" x2="200" y2="75" stroke="#f87171" strokeWidth="3.5" />
                  <circle cx="190" cy="230" r="14" fill="#ffffff" opacity="0.85" filter="blur(2px)" />
                  <text x="215" y="150" fill="#f87171" fontSize="9" fontWeight="bold">แสงสะท้อนจ้า (Glare Bounce!)</text>
                </g>
              )}

              {lightMode === 'front_polarizer' && (
                <g>
                  {/* Light Source */}
                  <circle cx="60" cy="120" r="18" fill="#f59e0b" opacity="0.9" />
                  <text x="60" y="124" textAnchor="middle" fill="#78350f" fontSize="8" fontWeight="bold">ไฟหน้า 45°</text>
                  {/* Polarizer Plate 1 at Light */}
                  <rect x="75" y="120" width="8" height="30" rx="2" fill="#0284c7" stroke="#38bdf8" transform="rotate(-30 75 120)" />
                  <line x1="85" y1="135" x2="190" y2="230" stroke="#38bdf8" strokeWidth="2.5" strokeDasharray="3,1" />

                  {/* Polarizer Plate 2 at Camera Lens */}
                  <rect x="180" y="80" width="40" height="8" rx="2" fill="#0284c7" stroke="#38bdf8" />
                  <text x="230" y="86" fill="#38bdf8" fontSize="8" fontWeight="bold">CPL Filter ({filterAngle}°)</text>

                  {/* Reflected rays: if angle == 90, absorbed! */}
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
                  {/* Coaxial Light Box with Beam Splitter Mirror */}
                  <rect x="145" y="90" width="110" height="60" rx="4" fill="#0f172a" stroke="#818cf8" strokeWidth="1.5" strokeDasharray="3,2" />
                  {/* Light Source mounted horizontally */}
                  <rect x="255" y="105" width="20" height="30" rx="3" fill="#f59e0b" />
                  <text x="265" y="98" textAnchor="middle" fill="#fbbf24" fontSize="8" fontWeight="bold">LED Coaxial</text>
                  {/* 45 degree Beam Splitter Glass */}
                  <line x1="165" y1="145" x2="235" y2="95" stroke="#38bdf8" strokeWidth="3" />
                  <text x="140" y="125" textAnchor="end" fill="#38bdf8" fontSize="8">Beam Splitter (45°)</text>

                  {/* Horizontal Ray reflects DOWN 90 deg */}
                  <line x1="255" y1="120" x2="200" y2="120" stroke="#fbbf24" strokeWidth="2.5" />
                  <line x1="200" y1="120" x2="200" y2="230" stroke="#fbbf24" strokeWidth="2.5" strokeDasharray="3,2" />
                  {/* Direct 90 reflection goes straight UP through glass into lens */}
                  <line x1="200" y1="230" x2="200" y2="75" stroke="#818cf8" strokeWidth="2.5" />
                  <text x="210" y="180" fill="#a5b4fc" fontSize="8" fontWeight="bold">แสงตกกระทบ 90° ตรงดิ่ง</text>
                </g>
              )}

              {lightMode === 'diffuse_dome' && (
                <g>
                  {/* Half Circle Dome covering workpiece */}
                  <path d="M 120 230 A 80 80 0 0 1 280 230" fill="none" stroke="#e0e7ff" strokeWidth="10" opacity="0.7" />
                  <circle cx="200" cy="150" r="14" fill="#0f172a" stroke="#06b6d4" strokeWidth="1" />
                  <text x="200" y="145" textAnchor="middle" fill="#94a3b8" fontSize="7">รูกล้องมอง</text>
                  {/* Multiple diffuse omnidirectional rays */}
                  <line x1="140" y1="180" x2="190" y2="230" stroke="#fef08a" strokeWidth="1.5" />
                  <line x1="260" y1="180" x2="210" y2="230" stroke="#fef08a" strokeWidth="1.5" />
                  <line x1="200" y1="155" x2="200" y2="230" stroke="#fef08a" strokeWidth="1.5" />
                  <text x="200" y="195" textAnchor="middle" fill="#e0e7ff" fontSize="9" fontWeight="bold">แสงกระจาย 360° ไร้เงามืด</text>
                </g>
              )}

              {lightMode === 'backlight' && (
                <g>
                  {/* Backlight panel located BELOW workpiece */}
                  <rect x="130" y="265" width="140" height="25" rx="4" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
                  <text x="200" y="282" textAnchor="middle" fill="#0f172a" fontSize="9" fontWeight="bold">💡 Backlight Panel (ไฟส่องหลัง)</text>
                  {/* Bright rays pointing straight up around the workpiece silhouette */}
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
            {/* Viewfinder Reticle / Crosshair */}
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
                  {/* Harsh blinding Glare over the metal */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white to-white opacity-95 blur-[2px]"></div>
                  <div className="absolute w-28 h-28 bg-white rounded-full blur-xl opacity-90 -top-6 -right-6"></div>
                  {/* Hidden crack obscured by glare */}
                  <span className="absolute bottom-3 left-4 text-[10px] font-mono font-bold text-rose-800 bg-rose-200/80 px-2 py-0.5 rounded">
                    ⚠️ แสงสะท้อนกลบรอยร้าว (Miss Defect!)
                  </span>
                </div>
              )}

              {lightMode === 'front_polarizer' && (
                <div className="w-48 h-32 bg-slate-700 rounded relative overflow-hidden flex items-center justify-center border border-slate-600">
                  {/* Subtle metal grain */}
                  <div className="w-full h-full bg-gradient-to-r from-slate-600 via-slate-700 to-slate-600"></div>
                  {/* Glare based on angle */}
                  {Math.abs(filterAngle - 90) > 15 && (
                    <div className="absolute inset-0 bg-white/60 blur-md pointer-events-none"></div>
                  )}
                  {/* Crisp Sharp Crack visible! */}
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
                  {/* Flat Mirror-like bright surface */}
                  <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                    {/* Deep scratches show as jet black lines */}
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
                  {/* Smooth curved illumination */}
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
                  {/* Sharp Black Silhouette of stamped hole & gear tooth */}
                  <div className="w-36 h-24 bg-black rounded-lg relative flex items-center justify-center">
                    {/* Measurement Holes */}
                    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center">
                      <span className="w-2 h-2 rounded-full bg-black"></span>
                    </div>
                  </div>
                  <svg className="absolute inset-0 w-full h-full pointer-events-none">
                    {/* Caliper Measurement dimension line */}
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

  // Skew calculation for rolling shutter based on speed
  const skewAngle = (conveyorSpeed / 90) * 24; // deg
  const measurementError = ((conveyorSpeed / 90) * 16.5).toFixed(1);

  return (
    <div className="bg-slate-900 border border-indigo-500/30 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-bold mb-1 border border-indigo-500/30">
            <FiCamera className="w-3.5 h-3.5 text-indigo-400" />
            <span>Industrial Sensor Comparison &middot; การเลือกชัตเตอร์เซนเซอร์</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            Global Shutter vs Rolling Shutter สำหรับชิ้นงานบนสายพานลำเลียง (Conveyor Motion)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
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
        
        {/* Global Shutter (Industrial Standard) */}
        <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs flex items-center justify-center">✓</span>
              <h4 className="font-black text-emerald-300 text-sm">Global Shutter (มาตรฐานโรงงานอุตสาหกรรม)</h4>
            </div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
              ทุกพิกเซลเปิดพร้อมกัน
            </span>
          </div>

          <div className="aspect-[16/9] w-full bg-slate-900 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
            {/* Speed indicator */}
            <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400">
              Sensor Exposure: 50 &mu;s
            </div>

            {/* Perfect Square Stamp part */}
            <div className="w-28 h-28 bg-slate-700 border-2 border-emerald-400 rounded-md relative flex items-center justify-center shadow-lg transition-transform">
              <div className="w-10 h-10 rounded-full border border-emerald-300 flex items-center justify-center text-[10px] font-mono font-bold text-emerald-200">
                &Oslash; 20mm
              </div>
              <span className="absolute -bottom-5 text-[10px] font-mono text-emerald-300 font-bold">
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

        {/* Rolling Shutter (Consumer Grade) */}
        <div className="bg-slate-950 p-4 rounded-xl border border-rose-500/40 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 font-black text-xs flex items-center justify-center">✗</span>
              <h4 className="font-black text-rose-300 text-sm">Rolling Shutter (กล้องมือถือ / เว็บแคม)</h4>
            </div>
            <span className="text-[10px] font-bold text-rose-400 bg-rose-950 px-2 py-0.5 rounded border border-rose-500/30">
              อ่านทีละแถวจากบนลงล่าง
            </span>
          </div>

          <div className="aspect-[16/9] w-full bg-slate-900 rounded-lg border border-slate-800 relative flex items-center justify-center overflow-hidden">
            {/* Speed indicator */}
            <div className="absolute top-2 left-2 text-[10px] font-mono text-slate-400">
              Row Readout Delay: 15 ms
            </div>

            {/* Skewed Parallelogram part based on conveyor speed */}
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
              <span className="absolute -bottom-5 text-[10px] font-mono text-rose-400 font-bold">
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
      </div>

      {/* Engineering Formula Callout */}
      <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-slate-300">
        <div>
          <span className="text-indigo-400 font-bold block mb-0.5">สูตรคำนวณการเบลอจากการเคลื่อนที่ (Motion Blur Formula):</span>
          <span>Blur (pixels) = [ความเร็วสายพาน (mm/s) &times; เวลาเปิดชัตเตอร์ (s)] / ความละเอียดออปติก (mm/pixel)</span>
        </div>
        <div className="text-[11px] text-emerald-400 bg-slate-900 p-2 rounded border border-slate-800">
          💡 กฎเหล็ก: คุม Blur ให้น้อยกว่า 1.0 Pixel เสมอ
        </div>
      </div>
    </div>
  );
}

/* ========================================================================= */
/* 3. INTERACTIVE RULE-BASED VS AI VISION TOOL INSPECTOR                     */
/* ========================================================================= */
function VisionLogicInspector() {
  const [activeCase, setActiveCase] = useState('caliper'); // 'caliper' | 'barcode' | 'ai_crack' | 'blob'

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
    <div className="bg-slate-900 border border-violet-500/30 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-1 border border-violet-500/30">
            <FiSliders className="w-3.5 h-3.5 text-violet-400" />
            <span>Inspection Algorithm Lab &middot; เปรียบเทียบตรรกะการตรวจจับ</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            Rule-Based Vision vs AI Deep Learning: เลือกใช้เครื่องมือให้ถูกกับโจทย์โรงงาน
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
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
        
        {/* Left: Viewfinder with ROI Graphics */}
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
                {/* Workpiece with hole */}
                <rect x="40" y="30" width="240" height="140" rx="8" fill="#334155" stroke="#64748b" strokeWidth="2" />
                <circle cx="160" cy="100" r="40" fill="#0f172a" stroke="#94a3b8" strokeWidth="2" />
                {/* Caliper Measurement Rakes */}
                <circle cx="160" cy="100" r="40" fill="none" stroke="#22c55e" strokeWidth="2" strokeDasharray="4,2" />
                {/* 16 Caliper edge points */}
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
                {/* Dimension HUD */}
                <rect x="85" y="45" width="150" height="25" rx="4" fill="#0f172a" opacity="0.9" stroke="#38bdf8" />
                <text x="160" y="62" textAnchor="middle" fill="#38bdf8" fontSize="11" fontWeight="bold">
                  DIA: 20.008 mm (OK)
                </text>
              </svg>
            )}

            {activeCase === 'barcode' && (
              <svg className="w-full h-full" viewBox="0 0 320 200">
                {/* Laser marked metal plate */}
                <rect x="50" y="25" width="220" height="150" rx="6" fill="#1e293b" stroke="#475569" strokeWidth="2" />
                {/* 2D DataMatrix Pattern */}
                <g transform="translate(110, 50)">
                  <rect x="0" y="0" width="100" height="100" fill="#f8fafc" stroke="#38bdf8" strokeWidth="2" />
                  {/* L-finder pattern */}
                  <rect x="0" y="0" width="10" height="100" fill="#0f172a" />
                  <rect x="0" y="90" width="100" height="10" fill="#0f172a" />
                  {/* Alternating clock track */}
                  <rect x="90" y="0" width="10" height="20" fill="#0f172a" />
                  <rect x="90" y="40" width="10" height="20" fill="#0f172a" />
                  <rect x="90" y="80" width="10" height="20" fill="#0f172a" />
                  {/* Data dots */}
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
                {/* Welded plate */}
                <rect x="40" y="25" width="240" height="150" rx="6" fill="#475569" />
                {/* Spot Weld indentation */}
                <circle cx="160" cy="100" r="50" fill="#334155" stroke="#94a3b8" strokeWidth="2" />
                {/* AI Heatmap overlay on crack */}
                <path d="M 140 85 Q 160 95 155 125 T 175 140" stroke="#f43f5e" strokeWidth="4" fill="none" />
                {/* Bounding Box */}
                <rect x="130" y="75" width="55" height="75" fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3,2" />
                <rect x="130" y="55" width="90" height="18" fill="#f43f5e" rx="2" />
                <text x="135" y="68" fill="#ffffff" fontSize="9" fontWeight="bold">
                  Defect: Crack 98.6%
                </text>
              </svg>
            )}

            {activeCase === 'blob' && (
              <svg className="w-full h-full" viewBox="0 0 320 200">
                {/* Tray with 6 bolts */}
                <rect x="40" y="25" width="240" height="150" rx="8" fill="#1e293b" stroke="#38bdf8" />
                {/* 6 positions */}
                {[
                  { x: 90, y: 65, ok: true },
                  { x: 160, y: 65, ok: true },
                  { x: 230, y: 65, ok: true },
                  { x: 90, y: 135, ok: true },
                  { x: 160, y: 135, ok: true },
                  { x: 230, y: 135, ok: false } // Missing!
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

        {/* Right: Technical Explanation & Specifications */}
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
/* 4. CONFUSION MATRIX & THRESHOLD TUNING LAB                                */
/* ========================================================================= */
function ThresholdTuningLab() {
  const [threshold, setThreshold] = useState(65); // 0 - 100

  // Calculate Overkill and Escape based on threshold
  // Ideal sweet spot is around 60 - 70 where Escape is 0 PPM and Overkill is minimal
  const escapePPM = threshold > 75 ? Math.round(Math.pow((threshold - 75) * 1.8, 2)) : 0;
  const overkillPercent = threshold < 50 ? (12.5 - threshold * 0.2).toFixed(1) : (Math.max(0.2, (75 - threshold) * 0.08)).toFixed(2);

  return (
    <div className="bg-slate-900 border border-rose-500/30 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-bold mb-1 border border-rose-500/30">
            <FiTarget className="w-3.5 h-3.5 text-rose-400" />
            <span>Quality Engineering Lab &middot; การปรับจูนค่าเกณฑ์ตัดสิน</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            การปรับจูน Threshold: ป้องกัน Escape Defect (0 PPM) และควบคุม Overkill (&lt; 0.5%)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
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
        
        {/* Escape Defect (Underkill) Card */}
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

        {/* False Reject (Overkill) Card */}
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
          <span>เส้นโค้งการแจกแจงค่าการตรวจ (Distribution Curves & Decision Boundary)</span>
          <span className="text-[10px] text-cyan-400 font-mono">Sweet Spot: 65% - 72%</span>
        </div>
        <div className="relative aspect-[16/7] w-full bg-slate-900 rounded-lg p-2">
          <svg className="w-full h-full" viewBox="0 0 500 180">
            {/* Axis */}
            <line x1="40" y1="150" x2="480" y2="150" stroke="#475569" strokeWidth="1.5" />
            <text x="40" y="168" fill="#94a3b8" fontSize="10">0 (เสียชัดเจน)</text>
            <text x="480" y="168" textAnchor="end" fill="#94a3b8" fontSize="10">100 (สมบูรณ์แบบ)</text>

            {/* Bad Parts Curve (Left Red Curve) */}
            <path d="M 50 150 Q 130 20 210 150" fill="rgba(244, 63, 94, 0.2)" stroke="#f43f5e" strokeWidth="2" />
            <text x="130" y="80" textAnchor="middle" fill="#f43f5e" fontSize="11" fontWeight="bold">ชิ้นงานเสีย (Defective Parts)</text>

            {/* Good Parts Curve (Right Green Curve) */}
            <path d="M 230 150 Q 350 10 470 150" fill="rgba(34, 197, 94, 0.2)" stroke="#22c55e" strokeWidth="2" />
            <text x="350" y="70" textAnchor="middle" fill="#22c55e" fontSize="11" fontWeight="bold">ชิ้นงานดี (Good Parts)</text>

            {/* Dynamic Threshold Line */}
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
/* 5. INDUSTRIAL VISION HARDWARE & MES INTEGRATION ARCHITECTURE               */
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
    <div className="bg-slate-900 border border-blue-500/30 rounded-2xl p-5 md:p-6 shadow-2xl space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-1 border border-blue-500/30">
            <FiZap className="w-3.5 h-3.5 text-blue-400" />
            <span>End-to-End System Integration &middot; สถาปัตยกรรมระบบรวม</span>
          </div>
          <h3 className="text-base sm:text-lg font-black text-white">
            สถาปัตยกรรมฮาร์ดแวร์และการเชื่อมต่อระบบ MES ในสายการผลิตจริง
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
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

export function MachineVisionMod1() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-blue-950/70 via-indigo-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-blue-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-bold mb-3 border border-blue-500/30">
          <FiEye className="w-4 h-4" /> โมดูลที่ 1 (Module 1)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          พื้นฐานระบบ Machine Vision และโครงสร้างระบบตรวจสอบในโรงงานอัจฉริยะ
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          ทำความเข้าใจ 6 องค์ประกอบหลักของระบบแมชชีนวิชัน: กล้องอุตสาหกรรม, เลนส์, แสงสว่าง, เซนเซอร์ Trigger, 
          Edge Controller และการส่งสัญญาณ I/O ร่วมกับ PLC / Robot ในสายการผลิตอัจฉริยะ (Industry 4.0)
        </p>
      </div>

      {/* 6 Core Components Grid */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-blue-600/30 text-blue-400 flex items-center justify-center text-sm font-black border border-blue-500/40">1</span>
          6 องค์ประกอบหลักของระบบ Industrial Machine Vision
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs pt-1">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-blue-300 text-sm flex items-center gap-1.5"><FiCamera /> 1. Industrial Camera</h3>
            <p className="text-slate-300">กล้องอุตสาหกรรมความทนทานสูง (IP67) เลือกระหว่างเซนเซอร์ Monochrome (ขาวดำ เน้นความคมชัดของขอบ) หรือ Color (ตรวจเช็คสีของสายไฟ/ชิ้นงาน)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-sky-300 text-sm flex items-center gap-1.5"><FiMaximize2 /> 2. Optical Lens</h3>
            <p className="text-slate-300">เลนส์ออปติกควบคุมระยะการมองเห็น (Field of View: FOV) และความลึกของภาพ (Depth of Field: DOF) เช่น เลนส์ทางยาวโฟกัสคงที่ หรือ Telecentric Lens ที่ไร้ความเพี้ยนเชิงมิติ</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-amber-300 text-sm flex items-center gap-1.5"><FiSun /> 3. Lighting Source</h3>
            <p className="text-slate-300">แสงสว่างเฉพาะทาง: Ring Light, Bar Light, Coaxial Light, Dome Light หรือ Backlight เพื่อสร้าง Contrast ระหว่างพื้นผิวชิ้นงานและรอยตำหนิ</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-emerald-300 text-sm flex items-center gap-1.5"><FiActivity /> 4. Trigger &amp; Encoder</h3>
            <p className="text-slate-300">เซนเซอร์ตรวจจับตำแหน่งชิ้นงาน หรือ Rotary Encoder บนสายพานลำเลียง เพื่อสั่งกล้องจับภาพในจังหวะที่ชิ้นงานมาถึงจุดศูนย์กลางอย่างแม่นยำ</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-purple-300 text-sm flex items-center gap-1.5"><FiCpu /> 5. Controller &amp; Edge AI</h3>
            <p className="text-slate-300">คอมพิวเตอร์อุตสาหกรรม (IPC) หรือ Smart Camera ที่มีหน่วยประมวลผล GPU/NPU สำหรับรันอัลกอริทึมประมวลผลภาพแบบทันที (Cycle Time &lt; 50ms)</p>
          </div>
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-fuchsia-300 text-sm flex items-center gap-1.5"><FiSettings /> 6. Industrial I/O Interface</h3>
            <p className="text-slate-300">ช่องทางส่งสัญญาณ Pass/Fail (OK/NG) และพิกัด X/Y/Angle ไปยัง PLC, กระบอกลมเตะงานเสีย (Pneumatic Ejector), หรือแขนกลหุ่นยนต์หยิบชิ้นงาน</p>
          </div>
        </div>
      </section>

      {/* Global vs Rolling Shutter Simulator */}
      <ShutterComparisonSimulator />
    </div>
  );
}

export function MachineVisionMod2() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-blue-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-cyan-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 text-xs font-bold mb-3 border border-cyan-500/30">
          <FiCamera className="w-4 h-4" /> โมดูลที่ 2 (Module 2)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การเตรียมชิ้นงาน อุปกรณ์ภาพ และเทคนิคการจัดแสงอุตสาหกรรม
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          "Lighting is 80% of Success" &mdash; แสงสว่างคือหัวใจของความแม่นยำในระบบแมชชีนวิชัน 
          เรียนรู้เทคนิคการตัดแสงสะท้อนจ้า (Glare) บนโลหะชุบน้ำมัน, การเลือกใช้เลนส์ Telecentric, 
          และการใช้ฟิลเตอร์โพลาไรซ์เพื่อเพิ่มความคมชัดของภาพ
        </p>
      </div>

      {/* Interactive Optical Lighting Simulator */}
      <OpticalLightingSimulator />

      {/* Detailed Lighting Cheat Sheet Table */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
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
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export function MachineVisionMod3() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-violet-950/70 via-purple-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-violet-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/20 text-violet-300 text-xs font-bold mb-3 border border-violet-500/30">
          <FiSliders className="w-4 h-4" /> โมดูลที่ 3 (Module 3)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การเขียน Logic ตรวจสอบภาพด้วย Classical Vision และ AI Deep Learning
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          เปรียบเทียบจุดแข็ง-จุดอ่อนระหว่าง Rule-Based Vision (แม่นยำสูง วัดขนาดระดับไมครอน &middot; ไร้ AI Hallucination) 
          กับ AI Deep Learning (ตรวจจับรอยแตกร้าว รอยไหม้ และสิ่งผิดปกติบนพื้นผิวที่ซับซ้อน)
        </p>
      </div>

      {/* Interactive Algorithm Inspector */}
      <VisionLogicInspector />

      {/* Comparison Guide */}
      <section className="bg-slate-900/80 p-6 rounded-2xl border border-slate-800 space-y-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-violet-600/30 text-violet-400 flex items-center justify-center text-sm font-black border border-violet-500/40">2</span>
          เกณฑ์การตัดสินใจเลือกเทคโนโลยี (Decision Matrix: Classical vs AI)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
            <h3 className="font-bold text-blue-300 text-sm">เมื่อไหร่ควรใช้ Classical Rule-Based?</h3>
            <ul className="text-slate-300 space-y-1.5 list-disc list-inside">
              <li>โจทย์คือการวัดขนาดมิติ (Dimension ±0.01 mm) เช่น รูเจาะ, ความกว้าง, ความหนา</li>
              <li>การอ่านบาร์โค้ด 1D / 2D DataMatrix ตามมาตรฐาน ISO</li>
              <li>การหาพิกัด X/Y และมุมหมุน (Orientation Angle) ให้แขนกล Robot หยิบชิ้นงาน</li>
              <li>ต้องการ Cycle Time ที่เร็วมากระดับต่ำกว่า 10 ms</li>
              <li>ไม่มีงบประมาณสำหรับซื้อการ์ดจอ GPU เกรดอุตสาหกรรมราคาแพง</li>
            </ul>
          </div>

          <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
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

export function MachineVisionMod4() {
  return (
    <div className="space-y-8 text-slate-200">
      {/* Module Header */}
      <div className="bg-gradient-to-r from-emerald-950/70 via-teal-950/50 to-slate-900 p-6 md:p-8 rounded-2xl border border-emerald-500/30 shadow-xl">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold mb-3 border border-emerald-500/30">
          <FiCheckCircle className="w-4 h-4" /> โมดูลที่ 4 (Module 4)
        </div>
        <h1 className="text-2xl md:text-3xl font-black text-white mb-3">
          การกำหนดค่ากระบวนการทดสอบหน้างานจริง และการเชื่อมต่อระบบ MES
        </h1>
        <p className="text-slate-300 text-sm md:text-base leading-relaxed m-0">
          การบริหารจัดการค่า Margin ความปลอดภัย, การปรับจูน Threshold ป้องกันชิ้นงานเสียหลุดรอดสู่ลูกค้า (Escape Rate = 0 PPM), 
          การควบคุม Yield งานดีถูกเตะทิ้ง (Overkill &lt; 0.5%), และการส่งข้อมูลเข้าสู่ฐานข้อมูล MES เพื่อการสืบย้อนกลับ 100%
        </p>
      </div>

      {/* Threshold Tuning Lab */}
      <ThresholdTuningLab />

      {/* End-to-End Hardware & MES Architecture */}
      <VisionHardwareArchitecture />
    </div>
  );
}
